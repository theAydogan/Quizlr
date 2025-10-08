import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import QRCode from 'react-qr-code';

const Home = ({ socket, username, setUsername, setPlayers, players, setIsHost }) => {
    const navigate = useNavigate();
    const [currentUrl, setCurrentUrl] = useState('');
    const [isJoining, setIsJoining] = useState(false);
    const [autoRejoining, setAutoRejoining] = useState(false);
    const [hasAttemptedAutoRejoin, setHasAttemptedAutoRejoin] = useState(false);
    const [localUsername, setLocalUsername] = useState(username);
    
    
    // Sync local username with prop username
    useEffect(() => {
        setLocalUsername(username);
    }, [username]);
    
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
    
    // Auto-rejoin if username exists and socket is ready (only run once)
    useEffect(() => {
        if (!socket || !username || autoRejoining || isJoining || hasAttemptedAutoRejoin) return;
        
        const savedGameState = localStorage.getItem('quizlr_game_state');
        const savedUsername = localStorage.getItem('quizlr_username');
        const currentPath = window.location.pathname;
        
        // Only auto-rejoin if:
        // 1. We're on the home page
        // 2. Have a saved session
        // 3. Current username matches saved username (not typing a new one)
        if (savedGameState && currentPath === '/' && username === savedUsername) {
            const gameState = JSON.parse(savedGameState);
            const timeSinceLastSave = Date.now() - gameState.timestamp;
            
            // Auto-rejoin if session is less than 1 hour old
            if (timeSinceLastSave < 3600000) {
                setAutoRejoining(true);
                setHasAttemptedAutoRejoin(true);
                
                // Wait a bit for socket to be fully ready
                setTimeout(() => {
                    socket.emit("joinGame", { username, room: "1" });
                    navigate("/lobby");
                }, 500);
            } else {
                setHasAttemptedAutoRejoin(true);
            }
        } else {
            setHasAttemptedAutoRejoin(true);
        }
    }, [socket, username, navigate, autoRejoining, isJoining, hasAttemptedAutoRejoin]);
    
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
            return;
        }
        
        if (!socket) {
            return;
        }
        
        setIsJoining(true);
        
        // Save username and game state to localStorage when joining
        localStorage.setItem('quizlr_username', username);
        const gameState = {
            username,
            score: 0,
            timestamp: Date.now()
        };
        localStorage.setItem('quizlr_game_state', JSON.stringify(gameState));
        
        // Also fetch and save the current server session ID
        const socketUrl = window.location.hostname === 'localhost' 
            ? "http://localhost:3001" 
            : `http://${window.location.hostname}:3001`;
        
        fetch(`${socketUrl}/api/session`)
            .then(res => res.json())
            .then(data => {
                localStorage.setItem('quizlr_server_session', data.sessionId);
            })
            .catch(err => console.error("Error fetching server session:", err));
        
        socket.emit("joinGame", { username, room: "1" });
        navigate("/lobby");
    }
    
    function clearSession() {
        localStorage.removeItem('quizlr_username');
        localStorage.removeItem('quizlr_game_state');
        localStorage.removeItem('quizlr_server_session');
        setUsername('');
        setAutoRejoining(false);
        setHasAttemptedAutoRejoin(false);
        console.log("Session cleared");
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
                {autoRejoining ? (
                    <div style={{ 
                        padding: '20px', 
                        background: '#f0f4ff', 
                        borderRadius: '10px',
                        border: '2px solid #667eea'
                    }}>
                        <h3 style={{ color: '#667eea', marginTop: 0 }}>🔄 Reconnecting...</h3>
                        <p style={{ margin: '10px 0' }}>Welcome back, <strong>{username}</strong>!</p>
                        <p style={{ fontSize: '14px', color: '#666' }}>Automatically rejoining the game...</p>
                    </div>
                ) : username ? (
                    <div>
                        <div style={{ 
                            padding: '15px', 
                            background: '#e8f5e9', 
                            borderRadius: '10px',
                            marginBottom: '15px',
                            border: '2px solid #4CAF50'
                        }}>
                            <p style={{ margin: 0, color: '#2e7d32' }}>
                                Welcome back, <strong>{username}</strong>! 👋
                            </p>
                        </div>
                        
                        <button 
                            onClick={joinRoom}
                            disabled={isJoining}
                            style={{
                                width: '100%',
                                padding: '12px',
                                backgroundColor: isJoining ? '#ccc' : '#4CAF50',
                                color: 'white',
                                border: 'none',
                                borderRadius: '5px',
                                fontSize: '16px',
                                fontWeight: 'bold',
                                cursor: isJoining ? 'not-allowed' : 'pointer',
                                marginBottom: '10px'
                            }}
                        >
                            {isJoining ? 'Joining...' : 'Join Quiz Game'}
                        </button>
                        
                        <button 
                            onClick={clearSession}
                            style={{
                                width: '100%',
                                padding: '10px',
                                backgroundColor: 'transparent',
                                color: '#666',
                                border: '2px solid #ddd',
                                borderRadius: '5px',
                                fontSize: '14px',
                                cursor: 'pointer'
                            }}
                        >
                            Change Name
                        </button>
                    </div>
                ) : (
                    <div>
                        <div style={{ marginBottom: '20px' }}>
                            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Enter Your Name</label>
                            <input 
                                type="text" 
                                value={localUsername} 
                                onChange={(e) => setLocalUsername(e.target.value)}
                                style={{ 
                                    width: '100%', 
                                    padding: '12px', 
                                    border: '2px solid #ddd', 
                                    borderRadius: '5px',
                                    fontSize: '16px'
                                }}
                                placeholder="What should we call you?"
                                onKeyPress={(e) => {
                                    if (e.key === 'Enter') {
                                        setUsername(localUsername);
                                        joinRoom();
                                    }
                                }}
                            />
                        </div>
                        
                        <button 
                            onClick={() => {
                                setUsername(localUsername);
                                setTimeout(() => joinRoom(), 0);
                            }}
                            disabled={isJoining || !localUsername.trim()}
                            style={{
                                width: '100%',
                                padding: '12px',
                                backgroundColor: isJoining || !localUsername.trim() ? '#ccc' : '#4CAF50',
                                color: 'white',
                                border: 'none',
                                borderRadius: '5px',
                                fontSize: '16px',
                                fontWeight: 'bold',
                                cursor: isJoining || !localUsername.trim() ? 'not-allowed' : 'pointer'
                            }}
                        >
                            {isJoining ? 'Joining...' : 'Join Quiz Game'}
                        </button>
                    </div>
                )}
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