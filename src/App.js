// App.js
import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import io from "socket.io-client";

// Import your pages/components
import Home from "./Pages/Home";
import Lobby from "./Pages/Lobby";
import Question from "./Pages/Question";
import Results from "./Pages/Results";

function App() {
  // Global state
  const [socket, setSocket] = useState(null);
  const [username, setUsername] = useState("");
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [score, setScore] = useState(0);
  const [players, setPlayers] = useState([]);
  const [isHost, setIsHost] = useState(false);

  // Load saved session on mount and validate against server session
  useEffect(() => {
    const checkServerSession = async () => {
      try {
        const socketUrl = window.location.hostname === 'localhost' 
          ? "http://localhost:3001" 
          : `http://${window.location.hostname}:3001`;
        
        const response = await fetch(`${socketUrl}/api/session`);
        const data = await response.json();
        const serverSessionId = data.sessionId;
        
        const savedSessionId = localStorage.getItem('quizlr_server_session');
        
        if (savedSessionId !== serverSessionId) {
          // Server has restarted, clear all old data
          console.log("Server restarted - clearing old session data");
          localStorage.removeItem('quizlr_username');
          localStorage.removeItem('quizlr_game_state');
          localStorage.setItem('quizlr_server_session', serverSessionId);
          return;
        }
        
        // Server session matches, restore saved data
        const savedUsername = localStorage.getItem('quizlr_username');
        const savedGameState = localStorage.getItem('quizlr_game_state');
        
        if (savedUsername) {
          setUsername(savedUsername);
          console.log("Restored username from localStorage:", savedUsername);
        }
        
        if (savedGameState) {
          const gameState = JSON.parse(savedGameState);
          setScore(gameState.score || 0);
          console.log("Restored game state from localStorage");
        }
      } catch (error) {
        console.error("Error checking server session:", error);
        // If we can't reach the server, don't restore session
        localStorage.removeItem('quizlr_username');
        localStorage.removeItem('quizlr_game_state');
      }
    };
    
    checkServerSession();
  }, []);

  // Save username to localStorage only when joining (not on every keystroke)
  // This is now handled in the joinRoom function instead

  // Save game state only when score changes (not username)
  useEffect(() => {
    if (username && score > 0) {
      const gameState = {
        username,
        score,
        timestamp: Date.now()
      };
      localStorage.setItem('quizlr_game_state', JSON.stringify(gameState));
    }
  }, [score]); // Only run when score changes, not username

  // Initialize socket once
  useEffect(() => {
    // Use the current hostname to work on both localhost and local network
    const socketUrl = window.location.hostname === 'localhost' 
      ? "http://localhost:3001" 
      : `http://${window.location.hostname}:3001`;
    
    console.log("Connecting to socket at:", socketUrl);
    const newSocket = io(socketUrl);
    setSocket(newSocket);

    // Cleanup on unmount
    return () => newSocket.disconnect();
  }, []);

  return (
    <Router>
      <Routes>
        <Route
          path="/"
          element={
            <Home
              socket={socket}
              username={username}
              setUsername={setUsername}
              players={players}
              setPlayers={setPlayers}
              setIsHost={setIsHost}
            />
          }
        />
        <Route
          path="/lobby"
          element={
            <Lobby
              socket={socket}
              username={username}
              room="1"
              players={players}
              setPlayers={setPlayers}
              isHost={isHost}
            />
          }
        />
        <Route
          path="/question"
          element={
            <Question
              socket={socket}
              username={username}
              room="1"
              players={players}
              setPlayers={setPlayers}
              currentQuestion={currentQuestion}
              setCurrentQuestion={setCurrentQuestion}
              score={score}
              setScore={setScore}
            />
          }
        />
        <Route
          path="/results"
          element={
            <Results
              socket={socket}
              username={username}
              score={score}
              players={players}
              setPlayers={setPlayers}
            />
          }
        />
      </Routes>
    </Router>
  );
}

export default App;
