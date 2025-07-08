import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

const Results = () => {
    const { state } = useLocation();
    const navigate = useNavigate();
    const { gameState, playerScore } = state || {};

    if (!gameState) {
        return (
            <div className="min-h-screen bg-gray-100 flex items-center justify-center">
                <div className="bg-white rounded-lg shadow-lg p-8 text-center">
                    <h1 className="text-2xl font-bold text-gray-800 mb-4">No Game Data Available</h1>
                    <button 
                        onClick={() => navigate('/')}
                        className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition"
                    >
                        Back to Home
                    </button>
                </div>
            </div>
        );
    }

    // Sort players by score (highest first)
    const sortedPlayers = [...gameState.players].sort((a, b) => b.score - a.score);

    return (
        <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full">
                <div className="text-center mb-6">
                    <h1 className="text-3xl font-bold text-gray-800 mb-2">Game Over</h1>
                    <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
                        <h2 className="text-xl font-semibold text-blue-800">
                            Your Score: {playerScore !== undefined ? playerScore : 'N/A'}
                        </h2>
                    </div>
                </div>

                <div className="mb-6">
                    <h3 className="text-lg font-semibold text-gray-800 mb-3">Final Rankings:</h3>
                    <ul className="space-y-2">
                        {sortedPlayers.map((player, index) => (
                            <li 
                                key={player.id} 
                                className={`flex justify-between items-center p-3 rounded-lg border ${
                                    index === 0 ? 'bg-yellow-50 border-yellow-300' : 
                                    index === 1 ? 'bg-gray-50 border-gray-300' : 
                                    index === 2 ? 'bg-orange-50 border-orange-300' : 
                                    'bg-white border-gray-200'
                                }`}
                            >
                                <div className="flex items-center space-x-3">
                                    <span className={`font-bold text-lg ${
                                        index === 0 ? 'text-yellow-600' : 
                                        index === 1 ? 'text-gray-600' : 
                                        index === 2 ? 'text-orange-600' : 
                                        'text-gray-500'
                                    }`}>
                                        #{index + 1}
                                    </span>
                                    <span className="font-medium text-gray-800">{player.name}</span>
                                </div>
                                <div className="text-right">
                                    <span className="font-bold text-lg text-gray-800">{player.score}</span>
                                    <span className={`ml-2 px-2 py-1 rounded-full text-xs font-medium ${
                                        player.alive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                    }`}>
                                        {player.alive ? 'Alive' : 'Dead'}
                                    </span>
                                </div>
                            </li>
                        ))}
                    </ul>
                </div>

                <div className="text-center">
                    <button 
                        onClick={() => navigate('/')}
                        className="bg-blue-600 text-white px-8 py-3 rounded-lg hover:bg-blue-700 transition font-medium w-full"
                    >
                        Back to Home
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Results;