
import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

const Results = () => {
    const { state } = useLocation();
    const navigate = useNavigate();
    const { gameState, playerScore } = state || {};

    if (!gameState) {
        return <div>No game data available.</div>;
    }

    return (
        <div>
            <h1>Game Over</h1>
            <h2>Your Score: {playerScore !== undefined ? playerScore : 'N/A'}</h2>
            <h3>All Players:</h3>
            <ul>
                {gameState.players.map((player) => (
                    <li key={player.id}>
                        {player.name}: {player.score} {player.alive ? '(Alive)' : '(Dead)'}
                    </li>
                ))}
            </ul>
            <button onClick={() => navigate('/')}>Back to Home</button>
        </div>
    );
};

export default Results;