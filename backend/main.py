from fastapi import FastAPI, WebSocket
from fastapi.responses import HTMLResponse
import httpx
import json

app = FastAPI()

@app.websocket("/ws/{game_id}")
async def websocket_endpoint(websocket: WebSocket, game_id: str):
    await websocket.accept()
    try:
        while True:
            # Receive message from client
            data = await websocket.receive_text()
            print(data)
            # Forward the action to the C++ server
            async with httpx.AsyncClient() as client:
                response = await client.post("http://localhost:9000/update", content=data)
                updated_state = response.text
            # Send the updated state back to the client
            await websocket.send_text(updated_state)
    except Exception as e:
        print(f"WebSocket error: {e}")
    finally:
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