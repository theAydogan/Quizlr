import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const Home = ({ socket, username, room, setUsername, setRoom, setPlayers, players, setIsHost }) => {
    const navigate = useNavigate();
    
    useEffect(() => {
        if (!socket) return;
        
        // Set up the playerList listener
        const handlePlayerList = (data) => {
            console.log("Received playerList:", data);
            // Check if data has players property, otherwise treat data as the players array
            const playersList = data.players || data;
            setPlayers(playersList);
            
            // Check if this user is the host
            const currentPlayer = playersList.find(p => p.username === username);
            console.log("Current player:", currentPlayer);
            if (currentPlayer && currentPlayer.isHost) {
                console.log("Setting isHost to true!");
                setIsHost(true);
            } else {
                setIsHost(false);
            }
        };
        
        socket.on("playerList", handlePlayerList);
        
        // Cleanup
        return () => {
            socket.off("playerList", handlePlayerList);
        };
    }, [socket, username, setPlayers, setIsHost]);
    
    function joinRoom() {
        if (!username || !room) {
            alert("Please enter both username and room!");
            return;
        }
        
        if (!socket) {
            alert("Socket not connected yet. Please wait a moment and try again.");
            return;
        }
        
        console.log("Joining room", username, room);
        socket.emit("joinGame", { username, room });
        navigate("/lobby");
    }
    
    return (
        <div>
            <h1>Home</h1>
            <label>Username</label>
            <input type="text" value={username} onChange={(e) => setUsername(e.target.value)}   />
            <label>Room</label>
            <input type="text" value={room} onChange={(e) => setRoom(e.target.value)}   />
            <button onClick={joinRoom}>Join</button>
            {players && players.length > 0 && (
                <ul>
                    {players.map((player) => (
                        <li key={player.id}>{player.username}</li>
                    ))}
                </ul>
            )}
        </div>
    );
};

export default Home;