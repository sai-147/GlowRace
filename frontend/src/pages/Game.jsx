import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import Grid from '../components/Grid';

function Game() {
  const { gameId } = useParams();
  const [gameState, setGameState] = useState({
    players: [{ id: 'P1', row: 0, col: 0, direction: 'right' }],
    glowPoints: [{ row: 10, col: 10 }],
  });

  const [mockWebSocket, setMockWebSocket] = useState(null);
  const gameStateRef = useRef(gameState); // Ref to store the latest game state

  useEffect(() => {
    gameStateRef.current = gameState; // Sync ref on each render
  }, [gameState]);

  useEffect(() => {
    const ws = {
      messages: [],
      send: (message) => {
        ws.messages.push(JSON.parse(message));
      },
      onmessage: null,
    };

    setMockWebSocket(ws);

    const interval = setInterval(() => {
      const prevState = gameStateRef.current;
      const newGameState = { ...prevState };

      // Process incoming messages
      ws.messages.forEach((message) => {
        if (message.action === 'changeDirection') {
          newGameState.players = newGameState.players.map(player =>
            player.id === message.playerId
              ? { ...player, direction: message.direction }
              : player
          );
        }
        if (message.action === 'movePlayer') {
          newGameState.players = newGameState.players.map(player =>
            player.id === message.playerId
              ? { ...player, row: message.row, col: message.col }
              : player
          );
        }
        if (message.action === 'moveGlow(20,20)') {
          newGameState.glowPoints = newGameState.glowPoints.map(glowPoint => {
            return { ...glowPoint, row: message.row, col: message.col };
          });
        }
      });
      ws.messages = [];

      // Apply direction-based movement
      newGameState.players = newGameState.players.map(player => {
        let { row, col, direction } = player;
        if (direction === 'up') row = (row - 1 + 50) % 50;
      if (direction === 'down') row = (row + 1) % 50;
      if (direction === 'left') col = (col - 1 + 50) % 50;
      if (direction === 'right') col = (col + 1) % 50;
        return { ...player, row, col };
      });

      setGameState(newGameState);
    }, 100);

    return () => clearInterval(interval);
  }, []); // Run once

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
        action = { action: 'moveGlow(20,20)', row: 19, col: 19};
      }
      if (action && mockWebSocket) {
        mockWebSocket.send(JSON.stringify(action));
      }
    };

    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [mockWebSocket]);

  const movePlayer = (x, y) => {
    if (mockWebSocket) {
      mockWebSocket.send(JSON.stringify({
        action: 'movePlayer',
        playerId: 'P1',
        row: x,
        col: y,
      }));
    }
  };

  const addPlayer2 = () => {
    setGameState(prevState => {
      const alreadyHasP2 = prevState.players.some(p => p.id === 'P2');
      if (alreadyHasP2) return prevState;
      return {
        ...prevState,
        players: [...prevState.players, { id: 'P2', row: 1, col: 1, direction: 'right' }],
      };
    });
  };

  const p1 = gameState.players.find(p => p.id === 'P1');
  const p2 = gameState.players.find(p => p.id === 'P2');

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center p-6">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-5xl transition-all duration-300">
        <h1 className="text-3xl font-extrabold text-gray-800 mb-6 text-center">
          Game ID: <span className="text-indigo-600">{gameId}</span>
        </h1>

        <div className="mb-6 text-center">
          <p className="text-lg text-gray-700 mb-4">
            <span className="font-semibold">Direction:</span> P1: <span className="text-blue-600">{p1?.direction || 'N/A'}</span>, 
            P2: <span className="text-pink-600">{p2?.direction || 'N/A'}</span>
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <button
              onClick={() => movePlayer(5, 5)}
              className="bg-purple-600 text-white px-5 py-2 rounded-lg hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-300 transition"
            >
              Move P1 to (5,5)
            </button>
            <button
              onClick={() => movePlayer(0, 0)}
              className="bg-purple-600 text-white px-5 py-2 rounded-lg hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-300 transition"
            >
              Move P1 to (0,0)
            </button>
            <button
              onClick={addPlayer2}
              className="bg-green-500 text-white px-5 py-2 rounded-lg hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-300 transition"
            >
              Add Player P2
            </button>
          </div>
        </div>

        <div className="border border-gray-300 rounded-xl overflow-hidden p-4 bg-gray-50">
          <Grid cellSize="5" players={gameState.players} glowPoints={gameState.glowPoints} />
        </div>
      </div>
    </div>
  );

}

export default Game;
