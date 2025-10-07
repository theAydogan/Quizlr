import React from 'react';
import { useNavigate } from 'react-router-dom';
import './Results.css';

const Results = ({ players, setPlayers, username }) => {
    const navigate = useNavigate();
    
    // Sort players by score (highest to lowest), excluding the host
    const sortedPlayers = [...(players || [])]
        .filter(p => !p.isHost)
        .sort((a, b) => (b.score || 0) - (a.score || 0));
    
    // Get the winner
    const winner = sortedPlayers[0];
    
    // Get current player's rank
    const currentPlayerRank = sortedPlayers.findIndex(p => p.username === username) + 1;
    
    const getMedalEmoji = (rank) => {
        if (rank === 0) return '🥇';
        if (rank === 1) return '🥈';
        if (rank === 2) return '🥉';
        return `#${rank + 1}`;
    };
    
    const handlePlayAgain = () => {
        navigate('/');
    };
    
    return (
        <div className="results-container">
            <div className="results-content">
                <h1 className="results-title">🏆 Game Over! 🏆</h1>
                
                {winner && (
                    <div className="winner-announcement">
                        <h2>🎉 {winner.username} wins! 🎉</h2>
                        <p className="winner-score">Score: {winner.score}</p>
                    </div>
                )}
                
                {currentPlayerRank > 0 && (
                    <div className="your-rank">
                        <p>You finished in {getMedalEmoji(currentPlayerRank - 1)} place!</p>
                    </div>
                )}
                
                <div className="leaderboard">
                    <h3>Final Leaderboard</h3>
                    <div className="leaderboard-list">
                        {sortedPlayers.map((player, index) => (
                            <div 
                                key={player.id} 
                                className={`leaderboard-item ${index === 0 ? 'first-place' : ''} ${player.username === username ? 'current-player' : ''}`}
                            >
                                <div className="rank">
                                    <span className="rank-badge">{getMedalEmoji(index)}</span>
                                </div>
                                <div className="player-info">
                                    <span className="player-name">
                                        {player.username}
                                        {player.username === username && <span className="you-badge"> (You)</span>}
                                    </span>
                                </div>
                                <div className="player-final-score">
                                    {player.score || 0} points
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
                
                <button className="play-again-button" onClick={handlePlayAgain}>
                    🎮 Play Again
                </button>
            </div>
        </div>
    );
};

export default Results;