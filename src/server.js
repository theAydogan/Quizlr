// server.js
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

const app = express();
app.use(cors()); // allow frontend to connect

const server = http.createServer(app);

// Create Socket.IO server
const io = new Server(server, {
  cors: {
    origin: "*", // Allow all origins (for local network access)
    methods: ["GET", "POST"]
  }
});

// Sample questions
const questions = [
  {
    id: 0,
    question: "What does RTW stand for?",
    options: [
      { id: 0, text: "Return to Warehouse" },
      { id: 1, text: "Return to Work" },
      { id: 2, text: "Right to Win" },
      { id: 3, text: "Race the World" }
    ],
    correctAnswer: 0
  },
  {
    id: 1,
    question: "What is the capital of France?",
    options: [
      { id: 0, text: "London" },
      { id: 1, text: "Berlin" },
      { id: 2, text: "Paris" },
      { id: 3, text: "Madrid" }
    ],
    correctAnswer: 2
  },
  {
    id: 2,
    question: "Which programming language is this app built with?",
    options: [
      { id: 0, text: "Python" },
      { id: 1, text: "JavaScript" },
      { id: 2, text: "Java" },
      { id: 3, text: "C++" }
    ],
    correctAnswer: 1
  },
  {
    id: 3,
    question: "What year was the first iPhone released?",
    options: [
      { id: 0, text: "2005" },
      { id: 1, text: "2007" },
      { id: 2, text: "2009" },
      { id: 3, text: "2010" }
    ],
    correctAnswer: 1
  },
  {
    id: 4,
    question: "Which planet is known as the Red Planet?",
    options: [
      { id: 0, text: "Venus" },
      { id: 1, text: "Jupiter" },
      { id: 2, text: "Mars" },
      { id: 3, text: "Saturn" }
    ],
    correctAnswer: 2
  }
];

// In-memory storage for demo
const gameRooms = {}; // { roomId: { players: [], host: null, currentQuestionIndex: 0, timer: null } }

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  // Player joins a game room
  socket.on("joinGame", ({ username, room }) => {
    console.log(`${username} joining room ${room}`);

    // Create room if it doesn't exist
    if (!gameRooms[room]) {
      gameRooms[room] = { 
        players: [], 
        host: null, 
        currentQuestionIndex: 0,
        timer: null,
        playerAnswers: {}
      };
      console.log(`Created new room: ${room}`);
    }

    // First player becomes the host
    const isHost = gameRooms[room].players.length === 0;
    if (isHost) {
      gameRooms[room].host = socket.id;
      console.log(`${username} (${socket.id}) is now the HOST of room ${room}`);
    }

    // Add player to room
    gameRooms[room].players.push({ 
      id: socket.id, 
      username, 
      score: 0,
      isHost: isHost 
    });

    socket.join(room);

    console.log(`Room ${room} now has ${gameRooms[room].players.length} players`);
    console.log("Players:", gameRooms[room].players.map(p => `${p.username}(host:${p.isHost})`));

    // Notify everyone in room (including host ID)
    io.to(room).emit("playerList", {
      players: gameRooms[room].players,
      hostId: gameRooms[room].host
    });
  });

  // Host starts game
  socket.on("startGame", (room) => {
    console.log(`Game started in room ${room}`);
    if (!gameRooms[room]) return;
    
    // Reset game state
    gameRooms[room].currentQuestionIndex = 0;
    gameRooms[room].playerAnswers = {};
    
    // Reset all player scores
    gameRooms[room].players.forEach(player => {
      player.score = 0;
      player.hasAnswered = false;
    });
    
    io.to(room).emit("gameStarted");
    
    // Start first question after a short delay
    setTimeout(() => {
      sendQuestion(room);
    }, 1000);
  });

  // Function to reveal answer and move to next question
  function revealAnswerAndContinue(room) {
    const roomData = gameRooms[room];
    if (!roomData) return;
    
    const questionIndex = roomData.currentQuestionIndex;
    const question = questions[questionIndex];
    
    // Clear the timer
    if (roomData.timer) {
      clearInterval(roomData.timer);
      roomData.timer = null;
    }
    
    console.log(`Revealing answer for question ${questionIndex + 1} in room ${room}`);
    
    io.to(room).emit("revealAnswer", {
      correctAnswer: question.correctAnswer,
      correctText: question.options[question.correctAnswer].text,
      playerAnswers: roomData.playerAnswers
    });
    
    // Move to next question after 5 seconds
    setTimeout(() => {
      roomData.currentQuestionIndex++;
      sendQuestion(room);
    }, 5000);
  }

  // Function to send a question to the room
  function sendQuestion(room) {
    const roomData = gameRooms[room];
    if (!roomData) return;
    
    const questionIndex = roomData.currentQuestionIndex;
    
    // Check if there are more questions
    if (questionIndex >= questions.length) {
      // Game over - send to results
      console.log(`Game over in room ${room}`);
      io.to(room).emit("gameOver", {
        players: roomData.players
      });
      return;
    }
    
    const question = questions[questionIndex];
    console.log(`Sending question ${questionIndex + 1} to room ${room}`);
    
    // Reset player answers for this question
    roomData.playerAnswers = {};
    roomData.players.forEach(player => {
      player.hasAnswered = false;
    });
    
    // Send question WITHOUT the correct answer
    io.to(room).emit("newQuestion", {
      questionNumber: questionIndex + 1,
      totalQuestions: questions.length,
      question: question.question,
      options: question.options,
      timeLimit: 60 // 60 seconds
    });
    
    // Start 60 second timer
    let timeRemaining = 60;
    
    // Clear any existing timer
    if (roomData.timer) {
      clearInterval(roomData.timer);
    }
    
    roomData.timer = setInterval(() => {
      timeRemaining--;
      
      // Send time update every second
      io.to(room).emit("timeUpdate", timeRemaining);
      
      if (timeRemaining <= 0) {
        revealAnswerAndContinue(room);
      }
    }, 1000);
  }

  // Player submits answer
  socket.on("submitAnswer", ({ room, answer, username }) => {
    console.log(`Answer from ${username} in ${room}: ${answer}`);
    
    const roomData = gameRooms[room];
    if (!roomData) return;
    
    const questionIndex = roomData.currentQuestionIndex;
    const question = questions[questionIndex];
    
    // Find the player
    const player = roomData.players.find(p => p.id === socket.id);
    if (!player || player.hasAnswered) return;
    
    // Mark as answered
    player.hasAnswered = true;
    roomData.playerAnswers[username] = answer;
    
    // Check if correct
    const isCorrect = answer === question.correctAnswer;
    if (isCorrect) {
      player.score += 1;
      console.log(`${username} answered correctly! Score: ${player.score}`);
    }
    
    // Notify the player
    socket.emit("answerSubmitted", { isCorrect });
    
    // Update all players with who has answered
    io.to(room).emit("playerList", {
      players: roomData.players,
      hostId: roomData.host
    });
    
    // Check if all non-host players have answered
    const nonHostPlayers = roomData.players.filter(p => !p.isHost);
    const allAnswered = nonHostPlayers.every(p => p.hasAnswered);
    
    if (allAnswered && nonHostPlayers.length > 0) {
      console.log(`All players have answered in room ${room}! Revealing answer...`);
      revealAnswerAndContinue(room);
    }
  });

  // Disconnect
  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
    // Optionally remove player from gameRooms
  });
});

server.listen(3001, '0.0.0.0', () => {
  console.log("Socket.IO server running on port 3001");
  console.log("Access from network at: http://<your-ip>:3001");
});
