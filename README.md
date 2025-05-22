## GlowRace
A Slither.io-inspired multiplayer game with real-time gameplay for 2-10 players.

## Progress
- **Day 1**: Set up Vite with React, created Home page with JSX and Tailwind CSS.
- **Day 2**: Learned Props, built a reusable Grid component to render a 50x50 game grid.
- **Day 3**: Learned State with useState, added mock game state to Grid to display a player and glow point, fixed state update issue.
- **Day 4**: Learned Events, added keyboard input to change player direction in Grid, fixed useEffect dependency issue.
- **Day 5**: Learned useEffect for game ticks, implemented mock movement for players based on direction.
- **Day 6**: Mocked WebSocket updates to simulate receiving game state from the backend every 100ms.
- **Day 7**: Learned React Router, set up routes for Home, Game, and Results pages.
- **Day 8**: Simulated sending player actions to the mock WebSocket, fixed stale state issues using useRef.
- **Day 9**: Installed Tailwind CSS via npm, styled Home, Game, and Results pages with consistent design.
- **Day 10**: Added game logic for glow point collection, implemented score tracking and random glow point spawning.
- **Day 11**: Set up FastAPI backend with WebSocket support, connected React frontend to FastAPI.
- **Day 12**: Built a basic C++ HTTP server to handle game actions, integrated with FastAPI to process WebSocket messages.
- **Day 13**: Updated FastAPI to broadcast game state to all players in a game session, tested multiplayer with multiple browser tabs.