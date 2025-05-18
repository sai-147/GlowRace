import { Link } from 'react-router-dom';
function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
        <h1 className="text-4xl font-bold text-gray-800 mb-4">Welcome to GlowRace</h1>
        <p className="text-lg text-gray-600 mb-6">Multiplayer game for 2-10 players</p>
        <Link to="/game/123" className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition">
          Start Game
        </Link>
      </div>
    </div>
  );
}
export default Home;