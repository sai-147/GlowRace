from fastapi import FastAPI, WebSocket
from fastapi.responses import HTMLResponse
import httpx
import json
from typing import Dict, List

app = FastAPI()

# Dictionary to store WebSocket connections for each game session
# Key: game_id (str), Value: List of WebSocket connections
games: Dict[str, List[WebSocket]] = {}

@app.websocket("/ws/{game_id}")
async def websocket_endpoint(websocket: WebSocket, game_id: str):
    # Accept the WebSocket connection
    await websocket.accept()

    # Add the WebSocket connection to the game's list
    if game_id not in games:
        games[game_id] = []
    games[game_id].append(websocket)

    try:
        while True:
            # Receive message from client
            data = await websocket.receive_text()
            # Forward the action to the C++ server
            async with httpx.AsyncClient() as client:
                response = await client.post("http://localhost:9000/update", content=data)
                updated_state = response.text
            # Broadcast the updated state to all players in the game session
            for client in games[game_id]:
                await client.send_text(updated_state)
    except Exception as e:
        print(f"WebSocket error: {e}")
    finally:
        # Remove the WebSocket connection when the client disconnects
        games[game_id].remove(websocket)
        await websocket.close()

@app.get("/")
async def get():
    return HTMLResponse("""
    <html>
        <body>
            <h1>FastAPI WebSocket Server</h1>
            <p>Connect to ws://localhost:8000/ws/123 to test WebSocket.</p>
        </body>
    </html>
    """)