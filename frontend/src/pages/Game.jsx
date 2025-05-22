import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Grid from '../components/Grid';

const Game = () => {
    const { gameId } = useParams();
    const navigate = useNavigate();
    const [gameState, setGameState] = useState({
        players: [],
        glowPoints: [],
    });
    const ws = useRef(null);

    useEffect(() => {
        ws.current = new WebSocket(`ws://localhost:8000/ws/${gameId}`);
        ws.current.onopen = () => console.log('WebSocket connected');
        ws.current.onmessage = (event) => {
            console.log('Message from server:', event.data);
            try {
                const newState = JSON.parse(event.data);
                if (newState.players && Array.isArray(newState.players) && newState.glowPoints && Array.isArray(newState.glowPoints)) {
                    setGameState(newState);
                } else {
                    console.error('Invalid game state received:', newState);
                }
            } catch (error) {
                console.error('Error parsing WebSocket message:', error, 'Data:', event.data);
            }
        };
        ws.current.onerror = (error) => console.error('WebSocket error:', error);
        ws.current.onclose = () => console.log('WebSocket disconnected');

        return () => ws.current.close();
    }, [gameId]);

    const sendAction = async (action) => {
        try {
            const response = await fetch('http://localhost:8000/update', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(action),
            });
            if (response.ok) {
                console.log('Action sent successfully:', action);
                const updatedState = await response.json();
                setGameState(updatedState);  // Update state with the server's response
            } else {
                console.error('Failed to send action:', response.status, await response.text());
            }
        } catch (error) {
            console.error('Error sending action via HTTP:', error);
        }
    };

    useEffect(() => {
        const handleKeyPress = (event) => {
            let newDirection;
            if (event.key === 'ArrowUp') newDirection = 'up';
            if (event.key === 'ArrowDown') newDirection = 'down';
            if (event.key === 'ArrowLeft') newDirection = 'left';
            if (event.key === 'ArrowRight') newDirection = 'right';

            if (newDirection) {
                sendAction({
                    action: 'changeDirection',
                    playerId: 'P1',
                    direction: newDirection,
                });
            }
        };

        window.addEventListener('keydown', handleKeyPress);
        return () => window.removeEventListener('keydown', handleKeyPress);
    }, []);

    const addPlayer = () => {
        const newPlayerId = `P${gameState.players.length + 1}`;
        sendAction({
            action: 'addPlayer',
            playerId: newPlayerId,
        });
    };

    const movePlayer = (playerId, row, col) => {
        sendAction({
            action: 'movePlayer',
            playerId: playerId,
            row: row,
            col: col,
        });
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 text-white">
            <h1 className="text-4xl mb-4">GlowRace - Game {gameId}</h1>
            <button onClick={addPlayer} className="mb-4 p-2 bg-blue-500 rounded">
                Add Player P{gameState.players.length + 1}
            </button>
            <button onClick={() => movePlayer('P1', 5, 5)} className="mb-4 p-2 bg-green-500 rounded">
                Move P1 to (5,5)
            </button>
            <button onClick={() => navigate('/results')} className="mb-4 p-2 bg-red-500 rounded">
                End Game
            </button>
            <Grid gameState={gameState} />
        </div>
    );
};

export default Game;