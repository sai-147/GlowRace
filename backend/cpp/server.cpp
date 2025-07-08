#include "httplib.h"
#include "json.hpp"
#include <iostream>
#include <vector>
#include <string>
#include <random>
#include <mutex>
#include <thread>
#include <chrono>
#include <unordered_map>
#include <atomic>

using namespace httplib;
using namespace nlohmann;
using namespace std;

struct Position {
    int row, col;
};

struct Player {
    string id;
    string name;
    Position head;
    vector<Position> tail;
    string direction;
    int score;
    bool alive;
};

struct GameState {
    vector<Player> players;
    vector<Position> glowPoints;
    bool gameOver;
    int initialPlayerCount;
};

// Use a mutex and map to handle multiple game states per room_id
timed_mutex gameStateMutex;
unordered_map<string, GameState> gameStates;
unordered_map<string, thread> gameThreads; // Track game loops per room
atomic<bool> isRoomInitialized(false); // Flag to ensure room is set up

// Random number generator
random_device rd;
mt19937 gen(static_cast<unsigned int>(time(nullptr)));

// Check if a position is occupied by any snake
bool isPositionOccupied(const GameState& state, const Position& pos) {
    cout << "Checking if position (" << pos.row << "," << pos.col << ") is occupied" << endl;
    for (const auto& player : state.players) {
        cout << "Checking player " << player.id << " head (" << player.head.row << "," << player.head.col << ")" << endl;
        if (player.head.row == pos.row && player.head.col == pos.col) {
            cout << "Position occupied by player head" << endl;
            return true;
        }
        for (const auto& segment : player.tail) {
            cout << "Checking tail segment (" << segment.row << "," << segment.col << ")" << endl;
            if (segment.row == pos.row && segment.col == pos.col) {
                cout << "Position occupied by player tail" << endl;
                return true;
            }
        }
    }
    cout << "Position not occupied" << endl;
    return false;
}

// Generate a random position that is not occupied
Position getRandomPosition(int gridSize, const GameState& state) {
    cout << "Generating random position for grid size " << gridSize << endl;
    uniform_int_distribution<> dis(0, gridSize - 1);
    Position pos;
    int maxAttempts = gridSize * gridSize;
    int attempts = 0;
    do {
        try {
            pos = {dis(gen), dis(gen)};
            cout << "Attempt " << attempts + 1 << ": Generated position (" << pos.row << "," << pos.col << ")" << endl;
        } catch (const std::exception& e) {
            cout << "Error generating random position: " << e.what() << endl;
            pos = {0, 0};
            break;
        }
        attempts++;
        if (attempts >= maxAttempts) {
            cout << "Warning: Could not find an unoccupied position after " << maxAttempts << " attempts, using (" << pos.row << "," << pos.col << ")" << endl;
            break;
        }
    } while (isPositionOccupied(state, pos));
    cout << "Final position: (" << pos.row << "," << pos.col << ")" << endl;
    return pos;
}

// Generate a random direction
string getRandomDirection() {
    cout << "Generating random direction" << endl;
    uniform_int_distribution<> dis(0, 3);
    string direction;
    try {
        switch (dis(gen)) {
            case 0: direction = "up"; break;
            case 1: direction = "down"; break;
            case 2: direction = "left"; break;
            case 3: direction = "right"; break;
            default: direction = "right";
        }
    } catch (const std::exception& e) {
        cout << "Error generating random direction: " << e.what() << endl;
        direction = "right";
    }
    cout << "Generated direction: " << direction << endl;
    return direction;
}

string gameStateToJson(const GameState& state) {
    json j;
    j["players"] = json::array();
    for (const auto& player : state.players) {
        json p;
        p["id"] = player.id;
        p["name"] = player.name;
        p["row"] = player.head.row;
        p["col"] = player.head.col;
        p["tail"] = json::array();
        for (const auto& segment : player.tail) {
            p["tail"].push_back({{"row", segment.row}, {"col", segment.col}});
        }
        p["direction"] = player.direction;
        p["score"] = player.score;
        p["alive"] = player.alive;
        j["players"].push_back(p);
    }
    j["glowPoints"] = json::array();
    for (const auto& glow : state.glowPoints) {
        j["glowPoints"].push_back({{"row", glow.row}, {"col", glow.col}});
    }
    j["gameOver"] = state.gameOver;
    j["room_id"] = ""; // Will be set by the caller
    return j.dump();
}

GameState loadGameState(const string& roomId) {
    Client cli("backend", 8000);
    cli.set_connection_timeout(2);
    cli.set_read_timeout(2);
    cli.set_write_timeout(2);
    auto res = cli.Get("/load_state?room_id=" + roomId);
    if (res && res->status == 200) {
        try {
            auto state = json::parse(res->body);
            GameState loadedState;

            for (const auto& p : state.value("players", json::array())) {
                Player player;
                player.id = p.value("id", "UnknownPlayer");
                player.name = p.value("name", "Unknown");
                player.head.row = p.value("row", 0);
                player.head.col = p.value("col", 0);
                player.tail.clear();
                for (const auto& segment : p.value("tail", json::array())) {
                    player.tail.push_back({segment.value("row", 0), segment.value("col", 0)});
                }
                player.direction = p.value("direction", "right");
                player.score = p.value("score", 0);
                player.alive = p.value("alive", true);
                loadedState.players.push_back(player);
            }

            loadedState.glowPoints.clear();
            for (const auto& glow : state.value("glowPoints", json::array())) {
                loadedState.glowPoints.push_back({glow.value("row", 0), glow.value("col", 0)});
            }

            loadedState.initialPlayerCount = loadedState.players.size();
            int aliveCount = 0;
            for (const auto& player : loadedState.players) {
                if (player.alive) aliveCount++;
            }
            loadedState.gameOver = (aliveCount == 0);
            cout << "Loaded game state for room " << roomId << ": aliveCount=" << aliveCount << ", initialPlayerCount=" << loadedState.initialPlayerCount << ", gameOver=" << loadedState.gameOver << endl;
            return loadedState;
        } catch (const json::exception& e) {
            cout << "JSON parsing error for room " << roomId << ": " << e.what() << endl;
            GameState emptyState;
            emptyState.players.clear();
            emptyState.glowPoints.clear();
            emptyState.gameOver = false;
            emptyState.initialPlayerCount = 0;
            return emptyState;
        }
    }
    cout << "Failed to load game state from FastAPI for room " << roomId << ", status: " << (res ? res->status : -1) << endl;
    GameState emptyState;
    emptyState.players.clear();
    emptyState.glowPoints.clear();
    emptyState.gameOver = false;
    emptyState.initialPlayerCount = 0;
    return emptyState;
}

bool checkResetFlag(const string& roomId) {
    Client cli("backend", 8000);
    cli.set_connection_timeout(2);
    cli.set_read_timeout(2);
    cli.set_write_timeout(2);
    auto res = cli.Get("/check_reset?room_id=" + roomId);
    if (res && res->status == 200) {
        auto response = json::parse(res->body);
        return response.value("reset", false);
    }
    return false;
}

void sendGameState(const string& roomId) {
    cout << "Attempting to send game state for room " << roomId << " to FastAPI" << endl;
    Client cli("backend", 8000);
    cli.set_connection_timeout(2);
    cli.set_read_timeout(2);
    cli.set_write_timeout(2);
    string stateJson;
    {
        cout << "Acquiring mutex in sendGameState for room " << roomId << endl;
        if (gameStateMutex.try_lock_for(chrono::seconds(10))) {
            lock_guard<timed_mutex> lock(gameStateMutex, adopt_lock);
            cout << "Mutex acquired in sendGameState for room " << roomId << endl;
            auto it = gameStates.find(roomId);
            if (it != gameStates.end()) {
                json j = json::parse(gameStateToJson(it->second));
                j["room_id"] = roomId;
                stateJson = j.dump();
            } else {
                cout << "No game state found for room " << roomId << endl;
                return;
            }
            cout << "Mutex released in sendGameState for room " << roomId << endl;
        } else {
            cout << "Failed to acquire mutex in sendGameState for room " << roomId << " after 10 seconds" << endl;
            return;
        }
    }
    try {
        auto res = cli.Post("/state", stateJson, "application/json");
        if (res && res->status == 200) {
            cout << "Successfully sent game state to FastAPI for room " << roomId << ": " << stateJson << endl;
        } else {
            cout << "Failed to send game state to FastAPI for room " << roomId << ", status: " << (res ? res->status : -1) << endl;
            if (res) {
                cout << "FastAPI response: " << res->body << endl;
            } else {
                cout << "No response received from FastAPI for room " << roomId << endl;
            }
        }
    } catch (const std::exception& e) {
        cout << "Exception while sending game state to FastAPI for room " << roomId << ": " << e.what() << endl;
    }
}

Position getNextPosition(const Player& player, int gridSize) {
    Position next = player.head;
    cout << "Calculating next position for player " << player.id << " with direction " << player.direction << endl;
    if (player.direction == "up") next.row--;
    else if (player.direction == "down") next.row++;
    else if (player.direction == "left") next.col--;
    else if (player.direction == "right") next.col++;
    if (next.row < 0) next.row = gridSize - 1;
    if (next.row >= gridSize) next.row = 0;
    if (next.col < 0) next.col = gridSize - 1;
    if (next.col >= gridSize) next.col = 0;
    cout << "Next position: (" << next.row << "," << next.col << ")" << endl;
    return next;
}

void checkCollisions(GameState& state, int gridSize) {
    for (size_t i = 0; i < state.players.size(); ++i) {
        if (!state.players[i].alive) continue;
        Position currentPos = state.players[i].head;
        cout << "Checking collisions for player " << state.players[i].id << " at position (" << currentPos.row << "," << currentPos.col << ")" << endl;

        for (size_t j = 0; j < state.players.size(); ++j) {
            if (i != j && state.players[j].alive) {
                if (currentPos.row == state.players[j].head.row && currentPos.col == state.players[j].head.col) {
                    cout << "Head-to-head collision between player " << state.players[i].id << " and player " << state.players[j].id << endl;
                    if (state.players[i].score > state.players[j].score) {
                        state.players[j].alive = false;
                        for(auto ele: state.players[j].tail) {
                            state.glowPoints.push_back(ele);
                        }
                        cout << "Player " << state.players[j].id << " killed by player " << state.players[i].id << " (score comparison)" << endl;
                        state.players.erase(state.players.begin() + j);
                    } else if (state.players[i].score < state.players[j].score) {
                        state.players[i].alive = false;
                        for(auto ele: state.players[i].tail) {
                            state.glowPoints.push_back(ele);
                        }
                        cout << "Player " << state.players[i].id << " killed by player " << state.players[j].id << " (score comparison)" << endl;
                        state.players.erase(state.players.begin() + i);
                    } else {
                        state.players[i].alive = false;
                        state.players[j].alive = false;
                        for(auto ele: state.players[i].tail) {
                            state.glowPoints.push_back(ele);
                        }
                        for(auto ele: state.players[j].tail) {
                            state.glowPoints.push_back(ele);
                        }
                        cout << "Both players " << state.players[i].id << " and " << state.players[j].id << " killed (equal scores)" << endl;
                        state.players.erase(state.players.begin() + i);
                        state.players.erase(state.players.begin() + j);
                    }
                }
                for (const auto& segment : state.players[j].tail) {
                    if (currentPos.row == segment.row && currentPos.col == segment.col) {
                        state.players[i].alive = false;
                        for(auto ele: state.players[i].tail) {
                            state.glowPoints.push_back(ele);
                        }
                        cout << "Player " << state.players[i].id << " collided with tail of player " << state.players[j].id << " at (" << segment.row << "," << segment.col << ")" << endl;
                        state.players.erase(state.players.begin() + i);
                    }
                }
            }
        }
        cout << "Self-collision check skipped for player " << state.players[i].id << endl;
    }
}

void checkGameOver(GameState& state) {
    int aliveCount = 0;
    for (const auto& player : state.players) {
        if (player.alive) aliveCount++;
    }
    state.gameOver = (aliveCount == 0);
    cout << "Checked game over: aliveCount=" << aliveCount << ", initialPlayerCount=" << state.initialPlayerCount << ", gameOver=" << state.gameOver << endl;
}

void gameTick(const string& roomId, int gridSize) {
    cout << "Running gameTick for room " << roomId << endl;
    if (gameStateMutex.try_lock_for(chrono::seconds(10))) {
        lock_guard<timed_mutex> lock(gameStateMutex, adopt_lock);
        cout << "Mutex acquired in gameTick for room " << roomId << endl;

        auto it = gameStates.find(roomId);
        if (it != gameStates.end()) {
            GameState& state = it->second;
            for (auto& player : state.players) {
                if (!player.alive) continue;
                auto nextPos = getNextPosition(player, gridSize);
                cout << "Moving player " << player.id << " from (" << player.head.row << "," << player.head.col << ") to (" << nextPos.row << "," << nextPos.col << ")" << endl;
                player.tail.insert(player.tail.begin(), player.head);
                if (player.tail.size() > static_cast<size_t>(player.score)) {
                    player.tail.pop_back();
                }
                player.head = nextPos;
                
                for (auto it = state.glowPoints.begin(); it != state.glowPoints.end();) {
                    if (player.head.row == it->row && player.head.col == it->col) {
                        player.score++;
                        cout << "Player " << player.id << " collected glow point at (" << it->row << "," << it->col << "), score: " << player.score << endl;
                        it = state.glowPoints.erase(it);
                        auto newGlowPos = getRandomPosition(gridSize, state);
                        state.glowPoints.push_back(newGlowPos);
                        cout << "Generated new glow point at (" << newGlowPos.row << "," << newGlowPos.col << ")" << endl;
                    } else {
                        ++it;
                    }
                }
                if(state.glowPoints.size() == 0) {
                    auto newGlowPos = getRandomPosition(gridSize, state);
                    state.glowPoints.push_back(newGlowPos);
                }
            }
            checkCollisions(state, gridSize);
            checkGameOver(state);
        } else {
            cout << "No game state found for room " << roomId << " in gameTick" << endl;
        }
        cout << "Mutex released in gameTick for room " << roomId << endl;
    } else {
        cout << "Failed to acquire mutex in gameTick for room " << roomId << " after 10 seconds" << endl;
    }
}

bool shouldResetGameState(const GameState& state) {
    if (state.players.empty()) return true;
    bool allDead = true;
    for (const auto& player : state.players) {
        if (player.alive) {
            allDead = false;
            break;
        }
    }
    return allDead;
}

void resetPlayerState(Player& player, int gridSize) {
    player.head = getRandomPosition(gridSize, GameState());
    player.tail.clear();
    player.direction = getRandomDirection();
    player.score = 0;
    player.alive = true;
}

void gameLoop(const string& roomId, int gridSize) {
    while (true) {
        bool gameOver = false;
        int aliveCount = 0;
        {
            cout << "Acquiring mutex in gameLoop to read state for room " << roomId << endl;
            if (gameStateMutex.try_lock_for(chrono::seconds(10))) {
                lock_guard<timed_mutex> lock(gameStateMutex, adopt_lock);
                cout << "Mutex acquired in gameLoop to read state for room " << roomId << endl;
                auto it = gameStates.find(roomId);
                if (it != gameStates.end()) {
                    gameOver = it->second.gameOver;
                    for (const auto& player : it->second.players) {
                        if (player.alive) aliveCount++;
                    }
                }
                cout << "Mutex released in gameLoop after read for room " << roomId << endl;
            } else {
                cout << "Failed to acquire mutex in gameLoop to read state for room " << roomId << " after 10 seconds" << endl;
                this_thread::sleep_for(chrono::milliseconds(200));
                continue;
            }
        }
        if (aliveCount > 0) {
            gameTick(roomId, gridSize);
            sendGameState(roomId);
        }
        this_thread::sleep_for(chrono::milliseconds(200));
    }
}

int main() {
    Server svr;

    svr.Get("/", [](const Request& req, Response& res) {
        res.set_content("C++ Server Running", "text/plain");
    });

    svr.Post("/update", [](const Request& req, Response& res) {
        cout << "Received action: " << req.body << endl;
        string updatedState;
        try {
            json actionJson = json::parse(req.body);
            string actionType = actionJson["action"];
            string playerId = actionJson["playerId"];
            string roomId = actionJson.value("room_id", "");
            if (roomId.empty()) {
                cout << "Error: room_id is required" << endl;
                res.status = 400;
                res.set_content("{\"error\":\"room_id is required\"}", "application/json");
                return;
            }
            cout << "Processing action type: " << actionType << " for player: " << playerId << " in room: " << roomId << endl;

            cout << "Acquiring mutex in /update for room " << roomId << endl;
            if (gameStateMutex.try_lock_for(chrono::seconds(10))) {
                lock_guard<timed_mutex> lock(gameStateMutex, adopt_lock);
                cout << "Mutex acquired in /update for room " << roomId << endl;
                auto it = gameStates.find(roomId);
                if (it == gameStates.end()) {
                    gameStates[roomId] = loadGameState(roomId);
                    cout << "Initialized new game state for room " << roomId << endl;
                    // Start game loop for new room
                    if (gameThreads.find(roomId) == gameThreads.end()) {
                        gameThreads[roomId] = thread(gameLoop, roomId, 50);
                        cout << "Started game loop for room " << roomId << endl;
                    }
                }
                GameState& state = gameStates[roomId];
                if (actionType == "addPlayer") {
                    bool playerExists = false;
                    cout << "Checking if player exists in room " << roomId << endl;
                    for (const auto& player : state.players) {
                        if (player.id == playerId) {
                            playerExists = true;
                            cout << "Player " << playerId << " already exists in room " << roomId << endl;
                            break;
                        }
                    }
                    if (!playerExists) {
                        cout << "Adding new player to room " << roomId << endl;
                        string playerName = actionJson.value("name", "Player " + playerId);
                        Position startPos = getRandomPosition(50, state);
                        string startDirection = getRandomDirection();
                        state.players.push_back({playerId, playerName, startPos, {}, startDirection, 0, true});
                        state.initialPlayerCount = state.players.size();
                        cout << "Added player: " << playerId << " with name: " << playerName 
                             << " at (" << startPos.row << "," << startPos.col << ")" 
                             << " direction: " << startDirection << " in room " << roomId << endl;
                    } else if (state.gameOver) {
                        for (auto& player : state.players) {
                            if (player.id == playerId) {
                                resetPlayerState(player, 50);
                                cout << "Player " << playerId << " reset at (" << player.head.row << "," << player.head.col << ")" 
                                     << " direction: " << player.direction << " in room " << roomId << endl;
                                break;
                            }
                        }
                        state.gameOver = false;
                        checkGameOver(state);
                    }
                } else if (actionType == "changeDirection") {
                    string direction = actionJson["direction"];
                    for (auto& player : state.players) {
                        if (player.id == playerId) {
                            player.direction = direction;
                            cout << "Changed direction for player " << playerId << " to " << direction << " in room " << roomId << endl;
                            break;
                        }
                    }
                } else if (actionType == "endGame") {
                    for (auto& player : state.players) {
                        if (player.id == playerId) {
                            player.alive = false;
                            cout << "Player " << playerId << " ended their game in room " << roomId << endl;
                            break;
                        }
                    }
                    checkGameOver(state);
                }
                updatedState = gameStateToJson(state);
                cout << "Mutex released in /update for room " << roomId << endl;
            } else {
                cout << "Failed to acquire mutex in /update for room " << roomId << " after 10 seconds" << endl;
                res.status = 503;
                res.set_content("{\"error\":\"Server busy, mutex timeout\"}", "application/json");
                return;
            }
            sendGameState(roomId);
            cout << "Sending updated state for room " << roomId << ": " << updatedState << endl;
            res.set_content(updatedState, "application/json");
        } catch (const json::exception& e) {
            cout << "Error parsing action JSON for room: " << e.what() << endl;
            res.status = 400;
            res.set_content("{\"error\":\"Invalid JSON\"}", "application/json");
        } catch (const std::exception& e) {
            cout << "Error processing action for room: " << e.what() << endl;
            res.status = 500;
            res.set_content("{\"error\":\"Server error\"}", "application/json");
        } catch (...) {
            cout << "Unknown error processing action for room" << endl;
            res.status = 500;
            res.set_content("{\"error\":\"Unknown server error\"}", "application/json");
        }
    });

    svr.Post("/reset", [](const Request& req, Response& res) {
        cout << "Received reset request" << endl;
        string updatedState;
        string roomId = req.has_param("room_id") ? req.get_param_value("room_id") : "";
        if (roomId.empty()) {
            cout << "Error: room_id is required" << endl;
            res.status = 400;
            res.set_content("{\"error\":\"room_id is required\"}", "application/json");
            return;
        }
        cout << "Acquiring mutex in /reset for room " << roomId << endl;
        if (gameStateMutex.try_lock_for(chrono::seconds(10))) {
            lock_guard<timed_mutex> lock(gameStateMutex, adopt_lock);
            cout << "Mutex acquired in /reset for room " << roomId << endl;
            auto it = gameStates.find(roomId);
            if (it != gameStates.end()) {
                it->second = loadGameState(roomId); // Reset to loaded state
            } else {
                gameStates[roomId] = loadGameState(roomId);
            }
            cout << "Game state reset for room " << roomId << ": " << gameStateToJson(gameStates[roomId]) << endl;
            updatedState = gameStateToJson(gameStates[roomId]);
            cout << "Mutex released in /reset for room " << roomId << endl;
        } else {
            cout << "Failed to acquire mutex in /reset for room " << roomId << " after 10 seconds" << endl;
            res.status = 503;
            res.set_content("{\"error\":\"Server busy, mutex timeout\"}", "application/json");
            return;
        }
        res.set_content(updatedState, "application/json");
    });

    cout << "C++ server running on port 9000..." << endl;
    thread serverThread([&svr]() {
        svr.listen("0.0.0.0", 9000);
    });

    // Main loop to monitor and clean up
    while (true) {
        vector<string> roomsToReset;
        {
            cout << "Acquiring mutex for shouldReset check" << endl;
            if (gameStateMutex.try_lock_for(chrono::seconds(10))) {
                lock_guard<timed_mutex> lock(gameStateMutex, adopt_lock);
                cout << "Mutex acquired for shouldReset check" << endl;
                for (auto& pair : gameStates) {
                    if (shouldResetGameState(pair.second)) {
                        roomsToReset.push_back(pair.first);
                        pair.second = loadGameState(pair.first);
                        cout << "Game state reset to loaded state for room " << pair.first << ": " << gameStateToJson(pair.second) << endl;
                    }
                }
                cout << "Mutex released for shouldReset check" << endl;
            } else {
                cout << "Failed to acquire mutex for shouldReset check after 10 seconds" << endl;
            }
        }
        for (const auto& roomId : roomsToReset) {
            sendGameState(roomId);
        }

        this_thread::sleep_for(chrono::milliseconds(500));
    }

    // Cleanup threads on shutdown (not fully implemented here, handle with signal handlers in production)
    for (auto& [roomId, thread] : gameThreads) {
        if (thread.joinable()) thread.join();
    }
    serverThread.join();
    return 0;
}