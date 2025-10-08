import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import QRCode from 'react-qr-code';

const Home = ({ socket, username, setUsername, setPlayers, players, setIsHost }) => {
    const navigate = useNavigate();
    const [currentUrl, setCurrentUrl] = useState('');
    const [isJoining, setIsJoining] = useState(false);
    
    useEffect(() => {
        // Get the device's IP address and construct the proper URL
        const getDeviceIP = async () => {
            try {
                // Try to get the IP from the current location first
                const hostname = window.location.hostname;
                
                // If it's localhost, try to get the actual IP
                if (hostname === 'localhost' || hostname === '127.0.0.1') {
                    // Method 1: Try to get IP from server API
                    try {
                        const response = await fetch('http://localhost:3001/api/ip');
                        const data = await response.json();
                        if (data.ip && data.ip !== '127.0.0.1') {
                            setCurrentUrl(`http://${data.ip}:3000`);
                            return;
                        }
                    } catch (error) {
                        console.log('API method failed, trying WebRTC...');
                    }
                    
                    // Method 2: Use WebRTC to get local IP
                    const pc = new RTCPeerConnection({
                        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
                    });
                    
                    pc.createDataChannel('');
                    pc.createOffer().then(offer => pc.setLocalDescription(offer));
                    
                    let foundIP = false;
                    pc.onicecandidate = (ice) => {
                        if (foundIP) return;
                        
                        if (ice && ice.candidate && ice.candidate.candidate) {
                            const candidate = ice.candidate.candidate;
                            const ipMatch = candidate.match(/([0-9]{1,3}(\.[0-9]{1,3}){3})/);
                            if (ipMatch) {
                                const ip = ipMatch[1];
                                // Check if it's a local network IP (not public or loopback)
                                if ((ip.startsWith('192.168.') || ip.startsWith('10.') || ip.startsWith('172.')) && ip !== '127.0.0.1') {
                                    setCurrentUrl(`http://${ip}:3000`);
                                    foundIP = true;
                                    pc.close();
                                    return;
                                }
                            }
                        }
                    };
                    
                    // Fallback after 3 seconds
                    setTimeout(() => {
                        if (!foundIP) {
                            setCurrentUrl(window.location.href);
                        }
                        pc.close();
                    }, 3000);
                } else {
                    // Already have a proper IP/hostname
                    setCurrentUrl(`http://${hostname}:3000`);
                }
            } catch (error) {
                console.error('Error getting IP:', error);
                setCurrentUrl(window.location.href);
            }
        };
        
        getDeviceIP();
    }, []);
    
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
        if (!username.trim()) {
            alert("Please enter a username!");
            return;
        }
        
        if (!socket) {
            alert("Socket not connected yet. Please wait a moment and try again.");
            return;
        }
        
        setIsJoining(true);
        console.log("Joining room", username, "1");
        socket.emit("joinGame", { username, room: "1" });
        navigate("/lobby");
    }
    
    return (
        <div style={{ padding: '20px', textAlign: 'center' }}>
            <h1>Quizlr - Multiplayer Quiz Game</h1>
            
            {/* QR Code Section */}
            <div style={{ marginBottom: '30px' }}>
                <h3>Scan to join this quiz session:</h3>
                <div style={{ 
                    display: 'inline-block', 
                    padding: '20px', 
                    backgroundColor: 'white', 
                    borderRadius: '10px',
                    boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
                }}>
                    <QRCode 
                        value={currentUrl} 
                        size={200}
                        style={{ height: "auto", maxWidth: "100%", width: "100%" }}
                    />
                </div>
                <p style={{ marginTop: '10px', fontSize: '14px', color: '#666' }}>
                    Share this QR code with friends to join the quiz!
                </p>
            </div>
            
            {/* Join Form */}
            <div style={{ maxWidth: '400px', margin: '0 auto' }}>
                <div style={{ marginBottom: '20px' }}>
                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Enter Your Name</label>
                    <input 
                        type="text" 
                        value={username} 
                        onChange={(e) => setUsername(e.target.value)}
                        style={{ 
                            width: '100%', 
                            padding: '12px', 
                            border: '2px solid #ddd', 
                            borderRadius: '5px',
                            fontSize: '16px'
                        }}
                        placeholder="What should we call you?"
                        onKeyPress={(e) => e.key === 'Enter' && joinRoom()}
                    />
                </div>
                
                <button 
                    onClick={joinRoom}
                    disabled={isJoining || !username.trim()}
                    style={{
                        width: '100%',
                        padding: '12px',
                        backgroundColor: isJoining || !username.trim() ? '#ccc' : '#4CAF50',
                        color: 'white',
                        border: 'none',
                        borderRadius: '5px',
                        fontSize: '16px',
                        fontWeight: 'bold',
                        cursor: isJoining || !username.trim() ? 'not-allowed' : 'pointer'
                    }}
                >
                    {isJoining ? 'Joining...' : 'Join Quiz Game'}
                </button>
            </div>
            
            {/* Players List */}
            {players && players.length > 0 && (
                <div style={{ marginTop: '30px' }}>
                    <h3>Players in Room:</h3>
                    <ul style={{ listStyle: 'none', padding: 0 }}>
                        {players.map((player) => (
                            <li key={player.id} style={{ 
                                padding: '8px', 
                                margin: '5px 0', 
                                backgroundColor: '#f0f0f0', 
                                borderRadius: '5px',
                                display: 'inline-block',
                                marginRight: '10px'
                            }}>
                                {player.username} {player.isHost && '(Host)'}
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
};

export default Home;