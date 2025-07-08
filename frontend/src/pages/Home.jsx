import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";

function Home() {
  const navigate = useNavigate();
  const [publicRooms, setPublicRooms] = useState([]);
  const [roomType, setRoomType] = useState("public"); // Default to public room
  const [joinRoomId, setJoinRoomId] = useState(""); // For private room ID input
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const intervalRef = useRef(null);

  // Fetch public rooms function
  const fetchPublicRooms = async () => {
    try {
      const response = await fetch("http://localhost:8000/list_public_rooms");
      if (!response.ok) {
        throw new Error("Failed to fetch public rooms");
      }
      const data = await response.json();
      setPublicRooms(data.rooms || []);
      setError(null); // Clear any previous errors
    } catch (error) {
      console.error("Error fetching public rooms:", error);
      setError("Failed to load public rooms. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Set up polling for public rooms
  useEffect(() => {
    // Initial fetch
    fetchPublicRooms();

    // Set up interval for periodic updates (every 5 seconds)
    intervalRef.current = setInterval(() => {
      fetchPublicRooms();
    }, 5000);

    // Cleanup interval on component unmount
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  // Create a new room
  const createRoom = async () => {
    try {
      const response = await fetch(`http://localhost:8000/create_room?type=${roomType}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (!response.ok) {
        throw new Error("Failed to create room");
      }
      const data = await response.json();
      
      // If creating a public room, refresh the list immediately
      if (roomType === "public") {
        fetchPublicRooms();
      }
      
      navigate(`/game/${data.room_id}`);
    } catch (error) {
      console.error("Error creating room:", error);
      setError("Failed to create room. Please try again.");
    }
  };

  // Join a room
  const joinRoom = async (roomId) => {
    try {
      const existingPlayerId = localStorage.getItem("playerId") || `P${Date.now()}`;
      const response = await fetch("http://localhost:8000/join_room", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          room_id: roomId,
          player_id: existingPlayerId,
        }),
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.detail || "Failed to join room");
      }
      localStorage.setItem("playerId", existingPlayerId);
      
      // Refresh public rooms after joining
      fetchPublicRooms();
      
      navigate(`/game/${roomId}`);
    } catch (error) {
      console.error("Error joining room:", error);
      setError(error.message || "Failed to join room. Please try again.");
    }
  };

  // Manual refresh function
  const refreshRooms = () => {
    setIsLoading(true);
    fetchPublicRooms();
  };

  return (
    <div className="min-h-screen bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
        <h1 className="text-4xl font-bold text-gray-800 mb-4">Welcome to GlowRace</h1>
        <p className="text-lg text-gray-600 mb-6">Multiplayer game for 2-10 players</p>
        {error && <div className="text-red-500 mb-4">{error}</div>}
        <div className="mb-6">
          <h2 className="text-xl font-semibold mb-2">Create a Room</h2>
          <select
            value={roomType}
            onChange={(e) => setRoomType(e.target.value)}
            className="border p-2 rounded mb-2 w-full"
          >
            <option value="public">Public Room</option>
            <option value="private">Private Room</option>
          </select>
          <button
            onClick={createRoom}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition w-full"
          >
            Create Room
          </button>
        </div>
        <div className="mb-6">
          <h2 className="text-xl font-semibold mb-2">Join Private Room</h2>
          <input
            type="text"
            placeholder="Enter Room ID"
            value={joinRoomId}
            onChange={(e) => setJoinRoomId(e.target.value)}
            className="border p-2 rounded mb-2 w-full"
          />
          <button
            onClick={() => joinRoom(joinRoomId)}
            disabled={!joinRoomId}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition w-full disabled:bg-gray-400"
          >
            Join Private Room
          </button>
        </div>
        <div>
          <div className="flex justify-between items-center mb-2">
            <h2 className="text-xl font-semibold">Public Rooms</h2>
            <button
              onClick={refreshRooms}
              disabled={isLoading}
              className="bg-gray-600 text-white px-3 py-1 rounded text-sm hover:bg-gray-700 transition disabled:bg-gray-400"
            >
              {isLoading ? "Loading..." : "Refresh"}
            </button>
          </div>
          {isLoading && publicRooms.length === 0 ? (
            <p className="text-gray-600">Loading public rooms...</p>
          ) : publicRooms.length === 0 ? (
            <p className="text-gray-600">No public rooms available</p>
          ) : (
            <ul className="space-y-2">
              {publicRooms.map((room) => (
                <li key={room.room_id} className="flex justify-between items-center bg-gray-100 p-2 rounded">
                  <span>
                    Room {room.room_id.slice(0, 8)}... ({room.player_count}/10 players)
                  </span>
                  <button
                    onClick={() => joinRoom(room.room_id)}
                    className="bg-green-600 text-white px-4 py-1 rounded hover:bg-green-700 transition"
                  >
                    Join
                  </button>
                </li>
              ))}
            </ul>
          )}
          <p className="text-xs text-gray-500 mt-2">
            Updates automatically every 5 seconds
          </p>
        </div>
      </div>
    </div>
  );
}

export default Home;