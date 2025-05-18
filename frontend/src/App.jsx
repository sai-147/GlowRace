// import reactLogo from './assets/react.svg'
// import viteLogo from '/vite.svg'
// import './App.css'
// import { useState } from 'react';
// import Grid from './components/Grid';
// import { useEffect } from 'react';
// import { BrowserRouter, Routes, Route } from 'react-router-dom';
// import Home from './Pages/Home';
// function App() {
//   const [tickCount, setTickCount] = useState(0);
//   useEffect(() => {
//     const interval = setInterval(() => {
//       setTickCount(prev => prev + 1);
//     }, 100);
//     return () => clearInterval(interval);
//   }, []);
//   useEffect(() => {
//     const handleKey = (event) => {
//       console.log(event.key); // Logs the key pressed (e.g., "ArrowUp")
//     };
//     window.addEventListener('keydown', handleKey);
//     return () => window.removeEventListener('keydown', handleKey);
//   }, []);
//   const [count, setCount] = useState(0);
//   return (
//     <div className="p-4">
//       <p>Tick Count: {tickCount}</p>
//       <h1 className="text-3xl font-bold mb-4">Welcome to GlowRace</h1>
//       <p className="text-lg mb-4">Multiplayer game for 2-10 players</p>
//       <button className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 mb-4">
//         Start Game
//       </button>
//       <p>Count: {count}</p>
//       <button onClick={() => setCount(count + 1)} className="bg-green-500 text-white px-4 py-2 rounded">
//         Increment
//       </button>
//       <button onClick={() => setCount(count -1)} className="bg-green-500 text-white px-4 py-2 rounded">
//         Decrement
//       </button>
//       <Grid cellSize="3" />


//       <BrowserRouter>
//       <Routes>
//         <Route path = "/hi" element = {<Home />} />
//       </Routes>
//       </BrowserRouter>
//     </div>
//   );
// }
// export default App;




import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import Game from './pages/Game';
import Results from './pages/Results';
function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/game/:gameId" element={<Game />} />
        <Route path="/results/:gameId" element={<Results />} />
      </Routes>
    </BrowserRouter>
  );
}
export default App;