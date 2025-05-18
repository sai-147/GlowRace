import { useParams } from 'react-router-dom';
function Results() {
  const { gameId } = useParams();
  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
        <h1 className="text-2xl font-bold text-gray-800 mb-4">Results for Game ID: {gameId}</h1>
        <p className="text-gray-600">Results page coming soon!</p>
      </div>
    </div>
  );
}
export default Results;