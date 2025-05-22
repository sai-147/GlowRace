from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.responses import HTMLResponse
from fastapi.middleware.cors import CORSMiddleware
import httpx
import redis
import json
import uvicorn
from typing import Dict, List

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

redis_client = redis.Redis(host='localhost', port=6379, db=0)

connections: Dict[str, List[WebSocket]] = {}

def save_game_state(game_id: str, state: dict):
    redis_client.set(f"game:{game_id}", json.dumps(state))

def load_game_state(game_id: str) -> dict:
    state = redis_client.get(f"game:{game_id}")
    return json.loads(state) if state else None

async def broadcast_game_state(game_id: str, state: dict):
    if game_id in connections:
        active_connections = []
        for connection in connections[game_id]:
            try:
                await connection.send_text(json.dumps(state))
                active_connections.append(connection)
            except Exception as e:
                print(f"Error sending game state to WebSocket client: {str(e)}")
        connections[game_id] = active_connections
        if not connections[game_id]:
            del connections[game_id]

@app.get("/load_state")
async def get_game_state(game_id: str):
    state = load_game_state(game_id)
    if state:
        return state
    return {"error": "No game state found"}

@app.post("/state")
async def receive_game_state(state: dict):
    game_id = "123"
    save_game_state(game_id, state)
    await broadcast_game_state(game_id, state)
    return {"status": "received"}

@app.post("/update")
async def update_game_state(action: dict):
    async with httpx.AsyncClient() as client:
        response = await client.post("http://localhost:9000/update", json=action)
        if response.status_code == 200:
            state = response.json()
            game_id = "123"
            save_game_state(game_id, state)
            await broadcast_game_state(game_id, state)
            return state
        else:
            return {"error": "Failed to update game state"}

@app.websocket("/ws/{game_id}")
async def websocket_endpoint(websocket: WebSocket, game_id: str):
    await websocket.accept()
    print(f"WebSocket connection established for game_id: {game_id}")
    if game_id not in connections:
        connections[game_id] = []
    connections[game_id].append(websocket)

    state = load_game_state(game_id)
    if state:
        try:
            await websocket.send_text(json.dumps(state))
        except Exception as e:
            print(f"Error sending initial game state: {str(e)}")
            connections[game_id].remove(websocket)
            if not connections[game_id]:
                del connections[game_id]
            return

    try:
        while True:
            message = await websocket.receive_text()
            action = json.loads(message)
            print(f"Received action from client: {action}")
            async with httpx.AsyncClient() as client:
                try:
                    response = await client.post("http://localhost:9000/update", json=action)
                    print(f"C++ server response status: {response.status_code}")
                    if response.status_code == 200:
                        state = response.json()
                        save_game_state(game_id, state)
                        await broadcast_game_state(game_id, state)
                    else:
                        print(f"Failed to update game state: {response.status_code}, Response: {response.text}")
                except Exception as e:
                    print(f"Error forwarding action to C++ server: {str(e)}")
    except WebSocketDisconnect:
        print(f"WebSocket disconnected for game_id: {game_id}")
        if websocket in connections[game_id]:
            connections[game_id].remove(websocket)
        if not connections[game_id]:
            del connections[game_id]
    except Exception as e:
        print(f"Unexpected WebSocket error: {str(e)}")
        if websocket in connections[game_id]:
            connections[game_id].remove(websocket)
        if not connections[game_id]:
            del connections[game_id]

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)