import json
import uuid
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
import redis.asyncio as redis
import httpx
import asyncio
from typing import Dict, List
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# FastAPI app
app = FastAPI(title="GlowRace Backend")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://127.0.0.1:5173", "http://localhost:5173", "http://192.168.31.230:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Redis client
redis_client = redis.Redis(host='localhost', port=6379, db=0, decode_responses=True)

# WebSocket connections: Dict[room_id, List[WebSocket]]
connections: Dict[str, List[WebSocket]] = {}

# Room expiry time (1 hour)
ROOM_EXPIRY = 3600

# Pydantic models for request validation
class JoinRoomRequest(BaseModel):
    room_id: str
    player_id: str

class PlayerActionRequest(BaseModel):
    room_id: str
    action: str
    playerId: str
    name: str | None = None
    direction: str | None = None

# Create a new room
@app.post("/create_room")
async def create_room(type: str):
    if type not in ["public", "private"]:
        raise HTTPException(status_code=400, detail="Invalid room type")
    
    room_id = str(uuid.uuid4())
    room_data = {
        "type": type,
        "players": json.dumps([]),
        "game_state": json.dumps({"players": [], "glowPoints": [], "gameOver": False})
    }
    
    await redis_client.hset(f"room:{room_id}", mapping=room_data)
    await redis_client.expire(f"room:{room_id}", ROOM_EXPIRY)
    
    connections[room_id] = []
    
    logger.info(f"Created room {room_id} of type {type}")
    return JSONResponse({"room_id": room_id})

# Join an existing room
@app.post("/join_room")
async def join_room(request: JoinRoomRequest):
    room_key = f"room:{request.room_id}"
    if not await redis_client.exists(room_key):
        raise HTTPException(status_code=404, detail="Room not found")
    
    players_json = await redis_client.hget(room_key, "players")
    players = json.loads(players_json) if players_json else []
    
    if request.player_id in players:
        raise HTTPException(status_code=400, detail="Player already in room")
    
    if len(players) >= 10:
        raise HTTPException(status_code=400, detail="Room is full")
    
    # Reset room if gameOver is true
    game_state_json = await redis_client.hget(room_key, "game_state")
    game_state = json.loads(game_state_json) if game_state_json else {"gameOver": False, "players": []}
    if game_state.get("gameOver", False):
        await redis_client.hset(room_key, "players", json.dumps([]))
        await redis_client.hset(room_key, "game_state", json.dumps({"players": [], "glowPoints": [], "gameOver": False}))
        logger.info(f"Reset room {request.room_id} due to gameOver for new join")
    
    players.append(request.player_id)
    await redis_client.hset(room_key, "players", json.dumps(players))
    await redis_client.expire(room_key, ROOM_EXPIRY)
    
    logger.info(f"Player {request.player_id} joined room {request.room_id}")
    return JSONResponse({"status": "success"})

# List public rooms
@app.get("/list_public_rooms")
async def list_public_rooms():
    rooms = []
    cursor = 0
    while True:
        cursor, keys = await redis_client.scan(cursor, match="room:*")
        for key in keys:
            room_id = key.split(":")[1]
            room_type = await redis_client.hget(key, "type")
            if room_type == "public":
                game_state_json = await redis_client.hget(key, "game_state")
                game_state = json.loads(game_state_json) if game_state_json else {"gameOver": False, "players": []}
                players_json = await redis_client.hget(key, "players")
                player_count = len(json.loads(players_json)) if players_json else 0
                if game_state.get("gameOver", False):
                    active_players = [p for p in game_state.get("players", []) if p.get("alive", False)]
                    if not active_players and player_count == 0:
                        await redis_client.delete(key)
                        logger.info(f"Deleted room {room_id} due to gameOver and no active players")
                        continue
                rooms.append({"room_id": room_id, "player_count": player_count})
        if cursor == 0:
            break
    
    return JSONResponse({"rooms": rooms})

# Update game state (called by C++ server)
# Update /state endpoint
@app.post("/state")
async def update_state(state: dict):
    room_id = state.get("room_id", "default")
    try:
        state_json = json.dumps(state)
        room_key = f"room:{room_id}"
        if not await redis_client.exists(room_key):
            logger.info(f"Initializing default room {room_id}")
            room_data = {
                "type": "public",
                "players": json.dumps([]),
                "game_state": json.dumps({"players": [], "glowPoints": [], "gameOver": False})
            }
            await redis_client.hset(room_key, mapping=room_data)
            await redis_client.expire(room_key, ROOM_EXPIRY)
            connections[room_id] = []
        
        state_data = json.loads(state_json)
        players_in_state = state_data.get("players", [])
        active_players = [p["id"] for p in players_in_state if p.get("alive", False)]
        await redis_client.hset(room_key, "players", json.dumps(active_players))

        players_json = await redis_client.hget(room_key, "players")
        stored_players = json.loads(players_json) if players_json else []
        if state_data.get("gameOver", False) and not stored_players:
            await redis_client.delete(room_key)
            if room_id in connections:
                connections.pop(room_id, None)
            logger.info(f"Deleted room {room_id} due to gameOver and no stored players")
            return {"status": "success", "deleted": True}

        await redis_client.hset(room_key, "game_state", state_json)
        await redis_client.expire(room_key, ROOM_EXPIRY)
        await broadcast_state(room_id, state_data)
        logger.info(f"Updated game state for room {room_id}")
        return {"status": "success", "deleted": False}
    except redis.RedisError as e:
        logger.error(f"Redis error for room {room_id}: {e}")
        return {"status": "error", "message": "Failed to save state to Redis"}, 500
    except json.JSONEncodeError as e:
        logger.error(f"JSON serialization error for room {room_id}: {e}")
        return {"status": "error", "message": "Invalid state data"}, 500
    except Exception as e:
        logger.error(f"Error in update_state for room {room_id}: {e}")
        return {"status": "error", "message": "Internal server error"}, 500
    
# Load game state
@app.get("/load_state")
async def load_state(room_id: str):
    state = await redis_client.hget(f"room:{room_id}", "game_state")
    if state:
        return json.loads(state)
    return {"gameOver": False, "glowPoints": [], "players": []}

# Player action (forward to C++ server)
@app.post("/player_action")
async def player_action(action: PlayerActionRequest):
    async with httpx.AsyncClient(timeout=5.0) as client:
        try:
            response = await client.post("http://localhost:9000/update", json=action.dict(exclude_none=True))
            response.raise_for_status()
            logger.info(f"Action sent to C++ server for room {action.room_id}: {action}")
            return response.json()
        except httpx.RequestError as e:
            logger.error(f"Error sending action to C++ server: {e}")
            return {"status": "error", "message": "Failed to communicate with game server"}, 500

# Check reset
@app.get("/check_reset")
async def check_reset(room_id: str):
    room_key = f"room:{room_id}"
    state = await redis_client.hget(room_key, "game_state")
    if not state:
        return {"reset": True}
    state = json.loads(state)
    players = state.get("players", [])
    if not players:
        return {"reset": True}
    all_dead = all(not player.get("alive", True) for player in players)
    return {"reset": all_dead}

# WebSocket endpoint
@app.websocket("/ws/{room_id}")
async def websocket_endpoint(websocket: WebSocket, room_id: str):
    room_key = f"room:{room_id}"
    if not await redis_client.exists(room_key):
        await websocket.close(code=4000, reason="Room not found")
        return
    
    await websocket.accept()
    
    if room_id not in connections:
        connections[room_id] = []
    connections[room_id].append(websocket)
    
    try:
        game_state_json = await redis_client.hget(room_key, "game_state")
        game_state = json.loads(game_state_json) if game_state_json else {}
        await websocket.send_json(game_state)
        
        while True:
            data = await websocket.receive_json()
            async with httpx.AsyncClient(timeout=5.0) as client:
                try:
                    response = await client.post("http://localhost:9000/update", json=data)
                    response.raise_for_status()
                    updated_state = response.json()
                    await redis_client.hset(room_key, "game_state", json.dumps(updated_state))
                    await redis_client.expire(room_key, ROOM_EXPIRY)
                    await broadcast_state(room_id, updated_state)
                except httpx.RequestError as e:
                    logger.error(f"Error forwarding action to C++ server: {e}")
                    continue
    
    except WebSocketDisconnect:
        if room_id in connections:
            connections[room_id].remove(websocket)
            if not connections[room_id]:
                connections.pop(room_id, None)
                game_state_json = await redis_client.hget(room_key, "game_state")
                game_state = json.loads(game_state_json) if game_state_json else {}
                players_json = await redis_client.hget(room_key, "players")
                players = json.loads(players_json) if players_json else []
                if game_state.get("gameOver", False) and not any(p.get("alive", False) for p in game_state.get("players", [])) and not players:
                    await redis_client.delete(room_key)
                    logger.info(f"Room {room_id} deleted due to gameOver and no active or listed players")
    
    except Exception as e:
        logger.error(f"Error in WebSocket for room {room_id}: {e}")
        await websocket.close(code=4000, reason="Internal server error")
    
    finally:
        if room_id in connections and websocket in connections[room_id]:
            connections[room_id].remove(websocket)
            if not connections[room_id]:
                connections.pop(room_id, None)
                game_state_json = await redis_client.hget(room_key, "game_state")
                game_state = json.loads(game_state_json) if game_state_json else {}
                players_json = await redis_client.hget(room_key, "players")
                players = json.loads(players_json) if players_json else []
                if game_state.get("gameOver", False) and not any(p.get("alive", False) for p in game_state.get("players", [])) and not players:
                    await redis_client.delete(room_key)
                    logger.info(f"Room {room_id} deleted in cleanup due to gameOver and no active or listed players")

async def broadcast_state(room_id: str, state: dict):
    if room_id in connections:
        for client in connections[room_id]:
            try:
                await client.send_json(state)
                logger.info(f"Sent state to WebSocket client for room {room_id}")
            except WebSocketDisconnect:
                connections[room_id].remove(client)
                logger.info(f"WebSocket client disconnected for room {room_id}")
            except Exception as e:
                logger.error(f"Error sending WebSocket message for room {room_id}: {e}")

@app.on_event("startup")
async def startup_event():
    try:
        await redis_client.ping()
        logger.info("Connected to Redis successfully")
    except redis.RedisError as e:
        logger.error(f"Failed to connect to Redis: {e}")

@app.on_event("shutdown")
async def shutdown_event():
    await redis_client.close()
    logger.info("Redis connection closed")
