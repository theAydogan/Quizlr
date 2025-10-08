import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './Question.css';

const Question = ({ 
    socket, 
    username, 
    room, 
    players, 
    setPlayers, 
    currentQuestion, 
    setCurrentQuestion, 
    score, 
    setScore 
}) => {
    const navigate = useNavigate();
    const [selectedAnswer, setSelectedAnswer] = useState(null);
    const [hasAnswered, setHasAnswered] = useState(false);
    const [questionData, setQuestionData] = useState(null);
    const [timeRemaining, setTimeRemaining] = useState(60);
    const [correctAnswer, setCorrectAnswer] = useState(null);
    const [showingAnswer, setShowingAnswer] = useState(false);
    const [questionNumber, setQuestionNumber] = useState(1);
    const [totalQuestions, setTotalQuestions] = useState(5);

    useEffect(() => {
        if (!socket) return;

        // Listen for new question
        socket.on("newQuestion", (data) => {
            console.log("New question received:", data);
            setQuestionData({
                question: data.question,
                options: data.options
            });
            setQuestionNumber(data.questionNumber);
            setTotalQuestions(data.totalQuestions);
            setTimeRemaining(data.timeLimit);
            setSelectedAnswer(null);
            setHasAnswered(false);
            setCorrectAnswer(null);
            setShowingAnswer(false);
        });

        // Listen for time updates
        socket.on("timeUpdate", (time) => {
            setTimeRemaining(time);
        });

        // Listen for answer reveal
        socket.on("revealAnswer", (data) => {
            console.log("Answer revealed:", data);
            setCorrectAnswer(data.correctAnswer);
            setShowingAnswer(true);
        });

        // Listen for answer submission confirmation
        socket.on("answerSubmitted", (data) => {
            console.log("Answer submitted:", data);
            if (data.isCorrect) {
                setScore(score + 1 + timeRemaining);
            }
        });

        // Listen for game over
        socket.on("gameOver", (data) => {
            console.log("Game over!", data);
            navigate('/results');
        });

        // Listen for player list updates
        socket.on("playerList", (data) => {
            const playersList = data.players || data;
            setPlayers(playersList);
        });

        // Cleanup
        return () => {
            socket.off("newQuestion");
            socket.off("timeUpdate");
            socket.off("revealAnswer");
            socket.off("answerSubmitted");
            socket.off("gameOver");
            socket.off("playerList");
        };
    }, [socket, navigate, setPlayers, setScore, score]);

    // Handle answer selection
    const handleSelectAnswer = (optionId) => {
        if (!hasAnswered && !showingAnswer) {
            setSelectedAnswer(optionId);
        }
    };

    // Handle answer submission
    const handleSubmitAnswer = () => {
        if (selectedAnswer === null) {
            alert("Please select an answer!");
            return;
        }

        if (hasAnswered) return;

        setHasAnswered(true);

        // Emit answer to server
        if (socket) {
            socket.emit("submitAnswer", {
                room,
                username,
                answer: selectedAnswer
            });
        }
    };

    // If no question data yet, show loading
    if (!questionData) {
        return (
            <div className="question-container">
                <div className="question-content">
                    <h2>Waiting for question...</h2>
                </div>
            </div>
        );
    }

    // Calculate how many non-host players have answered
    const nonHostPlayers = players?.filter(p => !p.isHost) || [];
    const answeredCount = nonHostPlayers.filter(p => p.hasAnswered).length;
    const totalPlayers = nonHostPlayers.length;
    
    // Check if current user is the host
    const currentPlayer = players?.find(p => p.username === username);
    const isHost = currentPlayer?.isHost || false;

    return (
        <div className="question-container">
            <div className="question-header">
                <h1>Question {questionNumber} of {totalQuestions}</h1>
                <div className={`timer ${timeRemaining <= 10 ? 'timer-warning' : ''}`}>
                    <span className="timer-icon">⏱️</span>
                    <span className="timer-text">{timeRemaining}s</span>
                </div>
                <p className="score">Score: {score}</p>
            </div>

            <div className="question-content">
                <h2 className="question-text">{questionData.question}</h2>

                {/* Show progress of players answering */}
                {totalPlayers > 0 && !showingAnswer && (
                    <div className="answer-progress">
                        <span>{answeredCount} / {totalPlayers} players answered</span>
                        {answeredCount === totalPlayers && (
                            <span className="all-answered"> - Revealing answer...</span>
                        )}
                    </div>
                )}

                {showingAnswer && (
                    <div className="answer-reveal-banner">
                        <h3>✅ Correct Answer: {questionData.options[correctAnswer]?.text}</h3>
                        <p>Next question coming soon...</p>
                    </div>
                )}

                {isHost ? (
                    // Host view - just show the options without interaction
                    <div>
                        <div className="host-message">
                            <h3>🎯 You are the Host</h3>
                            <p>You don't need to answer. Waiting for players to respond...</p>
                        </div>
                        <div className="options-grid">
                            {questionData.options.map((option) => (
                                <button
                                    key={option.id}
                                    className={`option-button ${
                                        showingAnswer && option.id === correctAnswer
                                            ? 'correct'
                                            : ''
                                    }`}
                                    disabled={true}
                                >
                                    <span className="option-letter">
                                        {String.fromCharCode(65 + option.id)}
                                    </span>
                                    <span className="option-text">{option.text}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                ) : (
                    // Player view - normal interaction
                    <>
                        <div className="options-grid">
                            {questionData.options.map((option) => (
                                <button
                                    key={option.id}
                                    className={`option-button ${
                                        selectedAnswer === option.id ? 'selected' : ''
                                    } ${
                                        showingAnswer && option.id === correctAnswer
                                            ? 'correct'
                                            : ''
                                    } ${
                                        showingAnswer && 
                                        selectedAnswer === option.id && 
                                        option.id !== correctAnswer
                                            ? 'incorrect'
                                            : ''
                                    }`}
                                    onClick={() => handleSelectAnswer(option.id)}
                                    disabled={hasAnswered || showingAnswer}
                                >
                                    <span className="option-letter">
                                        {String.fromCharCode(65 + option.id)}
                                    </span>
                                    <span className="option-text">{option.text}</span>
                                </button>
                            ))}
                        </div>

                        <div className="button-group">
                            {!hasAnswered && !showingAnswer ? (
                                <button 
                                    className="submit-button" 
                                    onClick={handleSubmitAnswer}
                                    disabled={selectedAnswer === null}
                                >
                                    Submit Answer
                                </button>
                            ) : hasAnswered && !showingAnswer ? (
                                <div className="waiting-message">
                                    ✓ Answer submitted! Waiting for other players...
                                </div>
                            ) : null}
                        </div>
                    </>
                )}
            </div>

            <div className="players-sidebar">
                <h3>Players in Room</h3>
                <ul>
                    {players && players.map((player, index) => (
                        <li key={player.id || index} className={player.hasAnswered ? 'answered' : ''}>
                            {player.username} {player.hasAnswered && '✓'}
                            <span className="player-score">Score: {player.score || 0}</span>
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
};

export default Question;