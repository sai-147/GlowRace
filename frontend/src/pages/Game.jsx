import React, { useState, useEffect, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Grid from "../components/Grid";
import Leaderboard from "../components/leaderBoard";

const Game = () => {
  const navigate = useNavigate();
  const { roomId } = useParams(); // Get room_id from URL (e.g., /game/:roomId)
  const [playerId, setPlayerId] = useState(localStorage.getItem("playerId") || null);
  const [playerName, setPlayerName] = useState("");
  const [gameState, setGameState] = useState(null);
  const [error, setError] = useState(null);
  const [ws, setWs] = useState(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const maxRetries = 3;
  const retryDelay = 2000;

  const fetchGameState = async () => {
    try {
      const response = await fetch(`http://localhost:8000/load_state?room_id=${roomId}`);
      const data = await response.json();
      setGameState(data);
      return data;
    } catch (error) {
      console.error("Error fetching game state:", error);
      setError("Failed to load game state");
    }
  };

  const joinGame = async () => {
    const existingPlayerId = localStorage.getItem("playerId");
    let newPlayerId = existingPlayerId || `P${Date.now()}`;

    setPlayerId(newPlayerId);
    localStorage.setItem("playerId", newPlayerId);
    try {
      const response = await fetch("http://localhost:8000/player_action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          room_id: roomId,
          action: "addPlayer",
          playerId: newPlayerId,
          name: playerName || "Player",
        }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Failed to join game");
      }
      // Wait briefly for WebSocket to update state
      await new Promise(resolve => setTimeout(resolve, 1000));
      await fetchGameState();
    } catch (error) {
      console.error("Error joining game:", error);
      setError("Failed to join game");
    }
  };

  const changeDirection = async (direction) => {
    if (!playerId) return;
    try {
      const response = await fetch("http://localhost:8000/player_action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          room_id: roomId,
          action: "changeDirection",
          playerId: playerId,
          direction: direction,
        }),
      });
      if (!response.ok) {
        throw new Error("Failed to change direction");
      }
    } catch (error) {
      console.error("Error changing direction:", error);
    }
  };

  const endGame = async () => {
    if (!playerId) return;
    try {
      const response = await fetch("http://localhost:8000/player_action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          room_id: roomId,
          action: "endGame",
          playerId: playerId,
        }),
      });
      if (!response.ok) {
        throw new Error("Failed to end game");
      }
      // Navigate to results after successfully ending the game
      navigate('/results', { state: { gameState } });
    } catch (error) {
      console.error("Error ending game:", error);
      setError("Failed to end game");
    }
  };

  const connectWebSocket = useCallback(() => {
    if (!roomId) return null;
    setIsConnecting(true);
    const websocket = new WebSocket(`ws://localhost:8000/ws/${roomId}`);
    let retryCount = 0;

    websocket.onopen = () => {
      console.log("WebSocket connected");
      setWs(websocket);
      setError(null);
      setIsConnecting(false);
      retryCount = 0;
    };

    websocket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      console.log("Received game state:", data);
      setGameState(data);
    };

    websocket.onerror = (error) => {
      console.error("WebSocket error:", error);
      if (retryCount < maxRetries) {
        console.log(`Retrying WebSocket connection (${retryCount + 1}/${maxRetries})...`);
        setTimeout(() => {
          retryCount++;
          connectWebSocket();
        }, retryDelay);
      } else {
        setError("WebSocket connection error");
        setIsConnecting(false);
      }
    };

    websocket.onclose = () => {
      console.log("WebSocket disconnected");
      if (retryCount < maxRetries) {
        console.log(`Retrying WebSocket connection (${retryCount + 1}/${maxRetries})...`);
        setTimeout(() => {
          retryCount++;
          connectWebSocket();
        }, retryDelay);
      } else if (!error) {
        setError("WebSocket connection error");
        setIsConnecting(false);
      }
    };

    return websocket;
  }, [roomId]);

  useEffect(() => {
    const initializeGame = async () => {
      if (!roomId) {
        setError("No room ID provided");
        return;
      }
      const state = await fetchGameState();
      const storedPlayerId = localStorage.getItem("playerId");
      if (storedPlayerId && state) {
        const playerExists = state.players.some(player => player.id === storedPlayerId);
        if (!playerExists) {
          console.log("Player not found in game state, clearing playerId");
          localStorage.removeItem("playerId");
          setPlayerId(null);
        }
      }
      const websocket = connectWebSocket();

      return () => {
        if (websocket) websocket.close();
      };
    };

    initializeGame();
  }, [roomId, connectWebSocket]);

  useEffect(() => {
    const handleKeyPress = (event) => {
      if (!playerId) return;
      switch (event.key) {
        case "ArrowUp":
          changeDirection("up");
          break;
        case "ArrowDown":
          changeDirection("down");
          break;
        case "ArrowLeft":
          changeDirection("left");
          break;
        case "ArrowRight":
          changeDirection("right");
          break;
        default:
          break;
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => {
      window.removeEventListener("keydown", handleKeyPress);
    };
  }, [playerId]);

  useEffect(() => {
    if (gameState && playerId) {
      const player = gameState.players.find(player => player.id === playerId);
      if (player && !player.alive) {
        console.log("Player died, navigating to results");
        navigate('/results', { state: { gameState, playerScore: player.score } });
      } else if (gameState.gameOver) {
        console.log("Game over, navigating to results");
        navigate('/results', { state: { gameState, playerScore: player ? player.score : 0 } });
      }
    }
  }, [gameState, playerId, navigate]);

  useEffect(() => {
    console.log("Rendering with gameState:", gameState);
  }, [gameState]);

  if (error) {
    return <div className="text-red-500 text-center mt-10">Error: {error}</div>;
  }

  if (!playerId) {
    return (
      <div className="min-h-screen bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
          <h1 className="text-2xl font-bold mb-4">Join Room {roomId}</h1>
          {error && <div className="text-red-500 mb-4">{error}</div>}
          <input
            type="text"
            placeholder="Enter your name"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            className="border p-2 rounded w-full mb-2"
          />
          <button
            onClick={joinGame}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition w-full"
          >
            Join Room
          </button>
        </div>
      </div>
    );
  }

  if (!gameState || isConnecting) {
    return <div className="text-white text-center mt-10">Connecting to game server...</div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-r from-blue-500 to-purple-600 flex flex-col items-center p-4">
      <h1 className="text-3xl font-bold text-white mb-4">GlowRace - Room {roomId}</h1>
      <div className="flex">
        <Grid gameState={gameState} playerId={playerId} />
        <Leaderboard players={gameState.players} /> {/* Add the Leaderboard component */}
      </div>
      <button
        onClick={endGame}
        className="bg-red-600 text-white px-4 py-2 rounded mt-4 hover:bg-red-700 transition"
      >
        End Game
      </button>
    </div>
  );
};

export default Game;
