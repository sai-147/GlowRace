from fastapi import FastAPI, WebSocket
from fastapi.responses import HTMLResponse

app = FastAPI()

# WebSocket endpoint
@app.websocket("/ws/{game_id}")
async def websocket_endpoint(websocket: WebSocket, game_id: str):
    await websocket.accept()
    try:
        while True:
            # Receive message from client
            data = await websocket.receive_text()
            print(data)
            # Echo the message back (for testing)
            await websocket.send_text(f"Server received: {data}")
    except Exception as e:
        print(f"WebSocket error: {e}")
    finally:
        await websocket.close()

# Optional: Serve a simple HTML page to confirm the server is running
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