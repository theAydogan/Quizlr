import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './Lobby.css';

const Lobby = ({ players, setPlayers, socket, room, isHost }) => {
    const navigate = useNavigate();
    
    useEffect(() => {
        // Listen for game start event (for all players)
        socket.on("gameStarted", () => {
            console.log("Game started! Navigating to question...");
            navigate("/question");
        });
        
        // Listen for updated player list
        socket.on("playerList", (data) => {
            // Check if data has players property, otherwise treat data as the players array
            const playersList = data.players || data;
            setPlayers(playersList);
        });
        
        // Cleanup listeners on unmount
        return () => {
            socket.off("gameStarted");
            socket.off("playerList");
        };
    }, [socket, navigate, setPlayers]);
    
    function startGame() {
        console.log("Host starting game");
        socket.emit("startGame", room);
    }
    
    return (
        <div className="lobby-container">
            <div className="lobby-content">
                <div className="lobby-header">
                    <h1>Lobby</h1>
                    <p className="room-info">Room: <strong>{room}</strong></p>
                </div>
                
                {isHost && (
                    <div style={{ textAlign: 'center' }}>
                        <div className="host-badge">👑 You are the HOST</div>
                    </div>
                )}
                
                <div className="players-section">
                    <h3>Players ({players?.length || 0}):</h3>
                    <ul className="players-list">   
                        {players && players.map((player) => (
                            <li key={player.id} className="player-item">
                                <span className="player-name">
                                    {player.username}
                                    {player.isHost && <span className="host-crown"> 👑</span>}
                                </span>
                            </li>
                        ))}
                    </ul>
                </div>
                
                {isHost ? (
                    <button onClick={startGame} className="start-button">
                        🚀 Start Game
                    </button>
                ) : (
                    <p className="waiting-message">
                        Waiting for host to start the game...
                    </p>
                )}
            </div>
        </div>
    );
};

export default Lobby;