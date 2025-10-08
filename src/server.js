// server.js
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

const app = express();
app.use(cors()); // allow frontend to connect
app.use(express.json());

// API endpoint to get the server's IP address
app.get('/api/ip', (req, res) => {
    const ip = req.connection.remoteAddress || req.socket.remoteAddress;
    const localIP = req.connection.localAddress || req.socket.localAddress;
    
    // Get the actual local IP (not 127.0.0.1)
    const os = require('os');
    const networkInterfaces = os.networkInterfaces();
    let deviceIP = null;
    
    for (const interfaceName in networkInterfaces) {
        const interfaces = networkInterfaces[interfaceName];
        for (const iface of interfaces) {
            if (iface.family === 'IPv4' && !iface.internal) {
                deviceIP = iface.address;
                break;
            }
        }
        if (deviceIP) break;
    }
    
    res.json({ 
        ip: deviceIP || localIP,
        hostname: os.hostname()
    });
});

// API endpoint to get the server session ID
app.get('/api/session', (req, res) => {
    res.json({ 
        sessionId: serverSessionId,
        timestamp: Date.now()
    });
});

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
    question: "Which of these four is a current Priority Operations Team Metric?",
    options: [
      { id: 0, text: "Run Volume" },
      { id: 1, text: "Run On Time %" },
      { id: 2, text: "Demo Assembly TAT - Apple Vision Pro" },
      { id: 3, text: "Order Confirmation Volume" }
    ],
    correctAnswer: 1
  },
  {
    id: 2,
    question: "Which of these four is a current priority Operations team metric?",
    options: [
      { id: 0, text: "Order Confirmation Time (mins)" },
      { id: 1, text: "Store Initiated Count Accuracy" },
      { id: 2, text: "Presto Runner Delivered Updated %" },
      { id: 3, text: "Fullfillment On Time %" }
    ],
    correctAnswer: 3
  },
  {
    id: 3,
    question: "Which of these is NOT a method of online ordering?",
    options: [
      { id: 0, text: "Apple Store Pickup" },
      { id: 1, text: "Ship From Store" },
      { id: 2, text: "Mobile Carrier Pickup" },
      { id: 3, text: "Immediate Delivery" }
    ],
    correctAnswer: 2
  },
  {
    id: 4,
    question: "Which company provides Immediate Delivery (IDL) services for our customers?",
    options: [
      { id: 0, text: "Uber" },
      { id: 1, text: "DoorDash" },
      { id: 2, text: "Skip the Dishes" },
      { id: 3, text: "Lyft" }
    ],
    correctAnswer: 0
  }
];

// In-memory storage for demo
const gameRooms = {}; // { roomId: { players: [], host: null, currentQuestionIndex: 0, timer: null } }

// Store the server device's socket ID as the designated host
let serverHostSocketId = null;
let serverHostUsername = null;

// Generate a unique server session ID when server starts
const serverSessionId = Date.now().toString();

// Function to check if a socket is the server host
function isServerHost(socketId) {
  return serverHostSocketId === socketId;
}

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);
  
  // Check if this connection is from the server device (localhost/127.0.0.1)
  const isServerDevice = socket.handshake.address === '127.0.0.1' || 
                        socket.handshake.address === '::1' ||
                        socket.handshake.address === '::ffff:127.0.0.1';
  
  console.log(`Connection from: ${socket.handshake.address}, isServerDevice: ${isServerDevice}`);

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

    // Designate server device as the permanent host
    if (isServerDevice && serverHostSocketId === null) {
      serverHostSocketId = socket.id;
      serverHostUsername = username;
      console.log(`🎯 SERVER DEVICE ${username} (${socket.id}) from ${socket.handshake.address} designated as PERMANENT HOST`);
    }

    // Check if this player is the server host
    const isThisPlayerHost = isServerDevice || isServerHost(socket.id);
    
    // If this is the server device connecting, update the socket ID
    if (isServerDevice && serverHostSocketId !== socket.id) {
      console.log(`🔄 SERVER DEVICE ${username} connected with socket ${socket.id}`);
      serverHostSocketId = socket.id;
      serverHostUsername = username;
    }
    
    // Remove any existing host if this is the server device
    if (isThisPlayerHost) {
      // Remove host status from all other players in this room
      gameRooms[room].players.forEach(player => {
        player.isHost = false;
      });
      
      // Set this player as the host
      gameRooms[room].host = socket.id;
      console.log(`👑 ${username} (${socket.id}) is now the HOST of room ${room}`);
    }

    // Check if player already exists in room and remove them
    const existingPlayerIndex = gameRooms[room].players.findIndex(p => p.id === socket.id);
    if (existingPlayerIndex !== -1) {
      gameRooms[room].players.splice(existingPlayerIndex, 1);
    }

    // Add player to room
    gameRooms[room].players.push({ 
      id: socket.id, 
      username, 
      score: 0,
      isHost: isThisPlayerHost 
    });

    socket.join(room);

    console.log(`Room ${room} now has ${gameRooms[room].players.length} players`);
    console.log("Players:", gameRooms[room].players.map(p => `${p.username}${p.isHost ? '(HOST)' : ''}`));

    // Notify everyone in room (including host ID)
    io.to(room).emit("playerList", {
      players: gameRooms[room].players,
      hostId: gameRooms[room].host
    });
  });

  // Host starts game
  socket.on("startGame", (room) => {
    // Only allow the server host to start games
    if (!isServerHost(socket.id)) {
      console.log(`❌ ${socket.id} tried to start game but is not the server host`);
      socket.emit("error", { message: "Only the server device can start games" });
      return;
    }
    
    console.log(`🎮 Game started in room ${room} by server host`);
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
    
    // If the server device disconnects, keep the host designation but remove from rooms
    if (socket.id === serverHostSocketId) {
      console.log("🔄 Server device disconnected - keeping host designation for reconnection");
      
      // Remove host from all rooms but keep the designation
      for (const roomId in gameRooms) {
        if (gameRooms[roomId].host === socket.id) {
          gameRooms[roomId].host = null;
          // Remove the disconnected player from the room
          gameRooms[roomId].players = gameRooms[roomId].players.filter(p => p.id !== socket.id);
          
          // Notify remaining players
          io.to(roomId).emit("playerList", {
            players: gameRooms[roomId].players,
            hostId: null
          });
        }
      }
    } else {
      // Remove regular player from all rooms
      for (const roomId in gameRooms) {
        const playerIndex = gameRooms[roomId].players.findIndex(p => p.id === socket.id);
        if (playerIndex !== -1) {
          gameRooms[roomId].players.splice(playerIndex, 1);
          
          // Notify remaining players
          io.to(roomId).emit("playerList", {
            players: gameRooms[roomId].players,
            hostId: gameRooms[roomId].host
          });
        }
      }
    }
  });
});

server.listen(3001, '0.0.0.0', () => {
  console.log("Socket.IO server running on port 3001");
  console.log("Access from network at: http://<your-ip>:3001");
});
