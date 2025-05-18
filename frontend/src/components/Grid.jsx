// import { useState, useEffect } from 'react';

// function Grid({ cellSize }) {
//   const [gameState, setGameState] = useState({
//     grid: Array(50).fill().map(() => Array(50).fill('')),
//     players: [{ id: 'P1', row: 0, col: 0, direction: 'right' }],
//     glowPoints: [{ row: 10, col: 10 }],
//   });
//   // useEffect(() => {
//   //   const interval = setInterval(() => {
//   //     setGameState(prevState => {
//   //       const newPlayers = prevState.players.map(player => {
//   //         let { row, col, direction } = player;
//   //         if (direction === 'up') row = Math.max(0, row - 1);
//   //         if (direction === 'down') row = Math.min(49, row + 1);
//   //         if (direction === 'left') col = Math.max(0, col - 1);
//   //         if (direction === 'right') col = Math.min(49, col + 1);
//   //         return { ...player, row, col };
//   //       });
//   //       return { ...prevState, players: newPlayers };
//   //     });
//   //   }, 500);
//   //   return () => clearInterval(interval);
//   // }, []);
//   useEffect(() => {
//     const mockWebSocket2 = () => {
//       setGameState(prevState => {
//         const newGlowPoints = prevState.glowPoints.map(glowPoint => {
//           let { row, col } = glowPoint;
//           col = (col + 1) % 50;
//           return { ...glowPoint, row, col };
//         });
//         return { ...prevState, glowPoints: newGlowPoints };
//       });
//     };
//     const interval = setInterval(mockWebSocket2, 100); // Call the correct function
//     return () => clearInterval(interval);
//   }, []);
//   useEffect(() => {
//     const mockWebSocket = () => {
//       setGameState(prevState => {
//         const newPlayers = prevState.players.map(player => {
//           let { row, col } = player;
//           if (player.id === 'P1') {
//             row = (row + 1) % 50; // Move P1 right, wrap around at 50
//           }
//           if (player.id === 'P2') {
//             col = (col - 1 + 50) % 50; // Move P2 left, wrap around at 0
//           }
//           return { ...player, row, col };
//         });
//         return { ...prevState, players: newPlayers };
//       });
//     };

//     const interval = setInterval(mockWebSocket, 100); // "Receive" updates every 100ms
//     return () => clearInterval(interval);
//   }, []);

//   // Handle key events for P1 and P2
//   useEffect(() => {
//     const handleKey = (event) => {
//       const key = event.key;
//       setGameState(prevState => {
//         const newPlayers = prevState.players.map(player => {
//           if (player.id === 'P1' && ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(key)) {
//             const newDir = {
//               ArrowUp: 'up',
//               ArrowDown: 'down',
//               ArrowLeft: 'left',
//               ArrowRight: 'right',
//             }[key];
//             return { ...player, direction: newDir };
//           }
//           if (player.id === 'P2' && ['w', 'W', 'a', 'A', 's', 'S', 'd', 'D'].includes(key)) {
//             const newDir = {
//               w: 'up', W: 'up',
//               s: 'down', S: 'down',
//               a: 'left', A: 'left',
//               d: 'right', D: 'right',
//             }[key];
//             return { ...player, direction: newDir };
//           }
//           return player;
//         });
//         return { ...prevState, players: newPlayers };
//       });
//     };

//     window.addEventListener('keydown', handleKey);
//     return () => window.removeEventListener('keydown', handleKey);
//   }, []); // Empty dependency array to prevent re-running
  
//   // Move P1 to x, y
//   const movePlayer = (x, y) => {
//     setGameState(prevState => ({
//       ...prevState,
//       players: prevState.players.map(player =>
//         player.id === 'P1' ? { ...player, row: x, col: y } : player
//       ),
//     }));
//   };

//   // Add P2 to the game
//   const addPlayer2 = () => {
//     setGameState(prevState => {
//       const alreadyHasP2 = prevState.players.some(p => p.id === 'P2');
//       if (alreadyHasP2) return prevState;
//       return {
//         ...prevState,
//         players: [...prevState.players, { id: 'P2', row: 0, col: 0, direction: 'right' }],
//       };
//     });
//   };

//   // Create display grid
//   const displayGrid = gameState.grid.map((row, rowIndex) =>
//     row.map((cell, colIndex) => {
//       const player = gameState.players.find(p => p.row === rowIndex && p.col === colIndex);
//       if (player) return player.id;
//       if (gameState.glowPoints.some(g => g.row === rowIndex && g.col === colIndex)) return 'glow';
//       return cell;
//     })
//   );

//   const p1 = gameState.players.find(p => p.id === 'P1');
//   const p2 = gameState.players.find(p => p.id === 'P2');

//   return (
//     <div>
//       <div className="mb-4">
//         <p className="mb-2">
//           Direction: P1: {p1?.direction || 'N/A'}, P2: {p2?.direction || 'N/A'}
//         </p>
//         <div className="space-x-2">
//           <button onClick={() => movePlayer(5, 5)} className="bg-purple-500 text-white px-4 py-2 rounded">
//             Move P1 to (5,5)
//           </button>
//           <button onClick={() => movePlayer(0, 0)} className="bg-purple-500 text-white px-4 py-2 rounded">
//             Move P1 to (0,0)
//           </button>
//           <button onClick={addPlayer2} className="bg-green-500 text-white px-4 py-2 rounded">
//             Add Player P2
//           </button>
//         </div>
//       </div>
//       {displayGrid.map((row, rowIndex) => (
//         <div key={rowIndex} style={{ display: 'flex' }}>
//           {row.map((cell, colIndex) => (
//             <div
//               key={`${rowIndex}-${colIndex}`}
//               className={`w-${cellSize} h-${cellSize} border border-gray-300 ${
//                 cell === 'P1' ? 'bg-blue-500' :
//                 cell === 'P2' ? 'bg-red-500' :
//                 cell === 'glow' ? 'bg-yellow-400' :
//                 'bg-gray-200'
//               }`}
//             />
//           ))}
//         </div>
//       ))}
//     </div>
//   );
// }

// export default Grid;






function Grid({ cellSize, players, glowPoints }) {
  const grid = Array(50).fill().map(() => Array(50).fill(''));
  const displayGrid = grid.map((row, rowIndex) =>
    row.map((cell, colIndex) => {
      const player = players.find(p => p.row === rowIndex && p.col === colIndex);
      if (player) return player.id;
      if (glowPoints.some(g => g.row === rowIndex && g.col === colIndex)) return 'glow';
      return cell;
    })
  );
  return (
    <div>
      {displayGrid.map((row, rowIndex) => (
        <div key={rowIndex} style={{ display: 'flex' }}>
          {row.map((cell, colIndex) => (
            <div
              key={`${rowIndex}-${colIndex}`}
              className={`w-${cellSize} h-${cellSize} border border-gray-300 ${
                cell === 'P1' ? 'bg-blue-500' :
                cell === 'P2' ? 'bg-red-500' :
                cell === 'glow' ? 'bg-yellow-400' :
                'bg-gray-200'
              }`}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
export default Grid;