// src/components/Leaderboard.js
import React from 'react';

const Leaderboard = ({ players }) => {
  return (
    <div className="bg-white rounded-lg shadow-lg p-4 max-w-xs w-full">
      <h2 className="text-xl font-bold mb-4">Leaderboard</h2>
      <ul>
        {players.map((player) => (
          <li key={player.id} className="flex justify-between mb-2">
            <span>{player.name}</span>
            <span>{player.score}</span>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default Leaderboard;
