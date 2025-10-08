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
