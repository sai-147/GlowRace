import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import Grid from '../components/Grid';

function Game() {
  const { gameId } = useParams();
  const [gameState, setGameState] = useState({
    players: [{ id: 'P1', row: 0, col: 0, direction: 'right', score: 0 }],
    glowPoints: [{ row: 10, col: 10 }],
  });

  const [webSocket, setWebSocket] = useState(null); // Real WebSocket
  const gameStateRef = useRef(gameState);

  useEffect(() => {
    gameStateRef.current = gameState;
  }, [gameState]);

  useEffect(() => {
    // Connect to FastAPI WebSocket
    const ws = new WebSocket(`ws://localhost:8000/ws/${gameId}`);
    setWebSocket(ws);
    
    ws.onopen = () => {
      console.log('WebSocket connected');
    };
    ws.onmessage = (event) => {
      console.log('Message from server:', event.data);
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    ws.onclose = () => {
      console.log('WebSocket disconnected');
    };

    // Game loop (still in frontend for now)
    const interval = setInterval(() => {
      const prevState = gameStateRef.current;
      const newGameState = { ...prevState };

      // Apply direction-based movement
      newGameState.players = newGameState.players.map(player => {
        let { row, col, direction } = player;
        if (direction === 'up') row = (row - 1 + 50) % 50;
        if (direction === 'down') row = (row + 1) % 50;
        if (direction === 'left') col = (col - 1 + 50) % 50;
        if (direction === 'right') col = (col + 1) % 50;
        return { ...player, row, col };
      });

      // Check for glow point collection
      newGameState.players = newGameState.players.map(player => {
        const collectedGlowPoint = newGameState.glowPoints.find(
          g => g.row === player.row && g.col === player.col
        );
        if (collectedGlowPoint) {
          return { ...player, score: player.score + 1 };
        }
        return player;
      });

      newGameState.glowPoints = newGameState.glowPoints.filter(g => {
        return !newGameState.players.some(p => p.row === g.row && p.col === g.col);
      });

      if (newGameState.glowPoints.length === 0) {
        const newRow = Math.floor(Math.random() * 50);
        const newCol = Math.floor(Math.random() * 50);
        newGameState.glowPoints.push({ row: newRow, col: newCol });
      }

      setGameState(newGameState);
    }, 100);

    return () => {
      clearInterval(interval);
      ws.close();
    };
  }, [gameId]);

  useEffect(() => {
    const handleKey = (event) => {
      const key = event.key;
      let action = null;
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(key)) {
        const newDir = {
          ArrowUp: 'up',
          ArrowDown: 'down',
          ArrowLeft: 'left',
          ArrowRight: 'right',
        }[key];
        action = { action: 'changeDirection', playerId: 'P1', direction: newDir };
      }
      if (['w', 'W', 'a', 'A', 's', 'S', 'd', 'D'].includes(key)) {
        const newDir = {
          w: 'up', W: 'up',
          s: 'down', S: 'down',
          a: 'left', A: 'left',
          d: 'right', D: 'right',
        }[key];
        action = { action: 'changeDirection', playerId: 'P2', direction: newDir };
      }
      if (['g', 'G'].includes(key)) {
        action = { action: 'moveGlow', row: 19, col: 19 };
      }
      if (action && webSocket && webSocket.readyState === WebSocket.OPEN) {
        webSocket.send(JSON.stringify(action));
        // Temporarily update direction in frontend (will move to backend later)
        setGameState(prevState => {
          const newState = { ...prevState };
          if (action.action === 'changeDirection') {
            newState.players = newState.players.map(player =>
              player.id === action.playerId
                ? { ...player, direction: action.direction }
                : player
            );
          }
          if (action.action === 'moveGlow') {
            newState.glowPoints = newState.glowPoints.map(glowPoint => {
              return { ...glowPoint, row: action.row, col: action.col };
            });
          }
          return newState;
        });
      }
    };

    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [webSocket]);

  const movePlayer = (x, y) => {
    if (webSocket && webSocket.readyState === WebSocket.OPEN) {
      const action = { action: 'movePlayer', playerId: 'P1', row: x, col: y };
      webSocket.send(JSON.stringify(action));
      // Temporarily update position in frontend (will move to backend later)
      setGameState(prevState => {
        const newState = { ...prevState };
        newState.players = newState.players.map(player =>
          player.id === action.playerId
            ? { ...player, row: action.row, col: action.col }
            : player
        );
        return newState;
      });
    }
  };

  const addPlayer2 = () => {
    setGameState(prevState => {
      const alreadyHasP2 = prevState.players.some(p => p.id === 'P2');
      if (alreadyHasP2) return prevState;
      return {
        ...prevState,
        players: [...prevState.players, { id: 'P2', row: 1, col: 1, direction: 'right', score: 0 }],
      };
    });
  };

  const p1 = gameState.players.find(p => p.id === 'P1');
  const p2 = gameState.players.find(p => p.id === 'P2');

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-4xl">
        <h1 className="text-2xl font-bold text-gray-800 mb-4">Game ID: {gameId}</h1>
        <div className="mb-4">
          <p className="mb-2 text-gray-700">
            Direction: P1: {p1?.direction || 'N/A'}, P2: {p2?.direction || 'N/A'}
          </p>
          <p className="mb-2 text-gray-700">
            Score: P1: {p1?.score || 0}, P2: {p2?.score || 0}
          </p>
          <div className="flex space-x-3">
            <button onClick={() => movePlayer(5, 5)} className="bg-purple-500 text-white px-4 py-2 rounded-lg hover:bg-purple-600 transition">
              Move P1 to (5,5)
            </button>
            <button onClick={() => movePlayer(0, 0)} className="bg-purple-500 text-white px-4 py-2 rounded-lg hover:bg-purple-600 transition">
              Move P1 to (0,0)
            </button>
            <button onClick={addPlayer2} className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition">
              Add Player P2
            </button>
          </div>
        </div>
        <div className="border border-gray-300 p-2 rounded-lg">
          <Grid cellSize="3" players={gameState.players} glowPoints={gameState.glowPoints} />
        </div>
      </div>
    </div>
  );
}

export default Game;