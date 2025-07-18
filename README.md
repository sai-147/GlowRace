# 🌟 GlowRace

**GlowRace** is a real-time multiplayer snake-like game where players compete to collect glow points in public or private rooms. Featuring a modern tech stack, it delivers fast, responsive gameplay through seamless frontend, backend, and C++ game server integration.

---
# Demo


https://github.com/user-attachments/assets/7b816f5c-4aba-4612-8db5-ca4860c3751a


## 🚀 Features

- 🎮 **Multiplayer Gameplay**: Join public or private rooms with up to 10 players.
- ⚡ **Real-Time Updates**: WebSocket support ensures low-latency game synchronization.
- 🖥️ **Dynamic UI**: Built with React and styled using Tailwind CSS.
- 🧠 **Scalable Backend**: FastAPI with Redis for room tracking and persistent game state.
- 🔄 **Robust Game Logic**: C++ server handles real-time movement, collision detection, and scoring.

---

## 🛠️ Tech Stack

- **Frontend**: React, React Router, Tailwind CSS  
- **Backend**: FastAPI, Python, Redis, WebSocket  
- **Game Logic**: C++ with `httplib`  
- **Data Format**: JSON (for state communication)

---

## 📦 Installation

### 1. Clone the Repository

```bash
git clone https://github.com/your-username/glowrace.git
cd glowrace
---

3. Build Docker Images
Run the following commands to build the necessary Docker images using your custom Dockerfiles:

docker build -t my-vite-app -f dockerfile1 .
docker build -t fastapi -f dockerfile2 .
docker build -t redis -f dockerfile3 .
docker build -t cpp -f dockerfile4 .


4. Start the Application
After building the images, start all services using Docker Compose:

docker-compose up


This will start:

🐍 C++ Game Server on localhost:9000

🧠 Redis on localhost:6379

⚙️ FastAPI Backend on localhost:8000

🌐 Frontend (Vite) on localhost (port 80)
