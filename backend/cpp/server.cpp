#include "httplib.h"
#include <iostream>
#include <string>
#include <vector>
#include <thread>
#include <chrono>
#include <random>
#include "json.hpp"

using namespace std;
using namespace httplib;
using json = nlohmann::json;

struct Position {
    int row;
    int col;
};

struct Player {
    string id;
    Position head;
    vector<Position> tail;
    string direction;
    int score;
    bool alive;
};

struct GameState {
    vector<Player> players;
    vector<Position> glowPoints;
};

// Default state if no state is loaded
GameState defaultGameState = {
    {{"P1", {0, 0}, {}, "right", 0, true}},
    {{10, 10}}
};

GameState gameState = defaultGameState;

mutex gameStateMutex;

random_device rd;
mt19937 gen(rd());
uniform_int_distribution<> dis(0, 49);

Position generateRandomPosition() {
    return {dis(gen), dis(gen)};
}

// Function to load game state from FastAPI
bool loadGameStateFromFastAPI(GameState& state) {
    Client cli("localhost", 8000);
    auto res = cli.Get("/load_state?game_id=123");  // We'll add this endpoint in FastAPI
    if (res && res->status == 200) {
        try {
            json stateJson = json::parse(res->body);
            state.players.clear();
            state.glowPoints.clear();

            // Parse players
            for (const auto& playerJson : stateJson["players"]) {
                Player player;
                player.id = playerJson["id"];
                player.head.row = playerJson["row"];
                player.head.col = playerJson["col"];
                player.direction = playerJson["direction"];
                player.score = playerJson["score"];
                player.alive = playerJson["alive"];
                for (const auto& segment : playerJson["tail"]) {
                    Position pos;
                    pos.row = segment["row"];
                    pos.col = segment["col"];
                    player.tail.push_back(pos);
                }
                state.players.push_back(player);
            }

            // Parse glow points
            for (const auto& gpJson : stateJson["glowPoints"]) {
                Position gp;
                gp.row = gpJson["row"];
                gp.col = gpJson["col"];
                state.glowPoints.push_back(gp);
            }

            cout << "Loaded game state from FastAPI: " << stateJson.dump() << endl;
            return true;
        } catch (const exception& e) {
            cout << "Error parsing game state from FastAPI: " << e.what() << endl;
            return false;
        }
    } else {
        cout << "Failed to load game state from FastAPI, status: " << (res ? res->status : -1) << endl;
        return false;
    }
}

void movePlayer(Player& player, int gridSize = 50) {
    if (!player.alive) return;
    player.tail.insert(player.tail.begin(), player.head);
    cout << "Moving player " << player.id << " in direction " << player.direction << endl;
    if (player.direction == "up") {
        player.head.row = (player.head.row - 1 + gridSize) % gridSize;
    } else if (player.direction == "down") {
        player.head.row = (player.head.row + 1) % gridSize;
    } else if (player.direction == "left") {
        player.head.col = (player.head.col - 1 + gridSize) % gridSize;
    } else if (player.direction == "right") {
        player.head.col = (player.head.col + 1) % gridSize;
    }
    if (player.tail.size() > player.score) {
        player.tail.pop_back();
    }
}

void checkGlowPointCollection(GameState& state) {
    for (auto& player : state.players) {
        if (!player.alive) continue;
        auto it = state.glowPoints.begin();
        while (it != state.glowPoints.end()) {
            if (player.head.row == it->row && player.head.col == it->col) {
                player.score += 1;
                it = state.glowPoints.erase(it);
                Position newGlowPoint = generateRandomPosition();
                state.glowPoints.push_back(newGlowPoint);
            } else {
                ++it;
            }
        }
    }
}

void checkCollisions(GameState& state) {
    for (auto& player : state.players) {
        if (!player.alive) continue;
        for (const auto& other : state.players) {
            if (&player == &other) continue;
            for (const auto& segment : other.tail) {
                if (player.head.row == segment.row && player.head.col == segment.col) {
                    player.alive = false;
                    for (const auto& tailSegment : player.tail) {
                        state.glowPoints.push_back(tailSegment);
                    }
                    player.head = {0, 0};
                    player.tail.clear();
                    player.score = 0;
                    player.direction = "right";
                    player.alive = true;
                    break;
                }
            }
        }
    }
}

string gameStateToJson(const GameState& state) {
    json j;
    j["players"] = json::array();
    for (const auto& player : state.players) {
        json p;
        p["id"] = player.id;
        p["row"] = player.head.row;
        p["col"] = player.head.col;
        p["tail"] = json::array();
        for (const auto& segment : player.tail) {
            json s;
            s["row"] = segment.row;
            s["col"] = segment.col;
            p["tail"].push_back(s);
        }
        p["direction"] = player.direction;
        p["score"] = player.score;
        p["alive"] = player.alive;
        j["players"].push_back(p);
    }
    j["glowPoints"] = json::array();
    for (const auto& gp : state.glowPoints) {
        json g;
        g["row"] = gp.row;
        g["col"] = gp.col;
        j["glowPoints"].push_back(g);
    }
    cout << "Generated game state JSON: " << j.dump() << endl;
    return j.dump();
}

void sendGameStateToFastAPI() {
    Client cli("localhost", 8000);
    while (true) {
        string stateJson;
        {
            lock_guard<mutex> lock(gameStateMutex);
            stateJson = gameStateToJson(gameState);
        }
        auto res = cli.Post("/state", stateJson, "application/json");
        if (res) {
            cout << "Sent state to FastAPI, response: " << res->status << endl;
        } else {
            cout << "Failed to send state to FastAPI" << endl;
        }
        this_thread::sleep_for(chrono::milliseconds(100));
    }
}

void gameTick() {
    while (true) {
        {
            lock_guard<mutex> lock(gameStateMutex);
            for (auto& player : gameState.players) {
                movePlayer(player);
            }
            checkGlowPointCollection(gameState);
            checkCollisions(gameState);
        }
        this_thread::sleep_for(chrono::milliseconds(100));
    }
}

int main() {
    // Load the game state from FastAPI on startup
    {
        lock_guard<mutex> lock(gameStateMutex);
        if (!loadGameStateFromFastAPI(gameState)) {
            cout << "Using default game state" << endl;
            gameState = defaultGameState;
        }
    }

    Server svr;

    thread tickThread(gameTick);
    tickThread.detach();

    thread sendStateThread(sendGameStateToFastAPI);
    sendStateThread.detach();

    svr.Post("/update", [](const Request& req, Response& res) {
        auto action = req.body;
        cout << "Received action: " << action << endl;
        json actionJson = json::parse(action);

        {
            lock_guard<mutex> lock(gameStateMutex);
            string actionType = actionJson["action"];
            string playerId = actionJson["playerId"];

            if (actionType == "addPlayer") {
                bool playerExists = false;
                for (const auto& player : gameState.players) {
                    if (player.id == playerId) {
                        playerExists = true;
                        break;
                    }
                }
                if (!playerExists) {
                    gameState.players.push_back({playerId, {0, 0}, {}, "right", 0, true});
                    cout << "Added player: " << playerId << endl;
                }
            } else if (actionType == "changeDirection") {
                for (auto& player : gameState.players) {
                    if (player.id == playerId) {
                        player.direction = actionJson["direction"].get<string>();
                        cout << "Changed direction for " << playerId << " to " << player.direction << endl;
                        break;
                    }
                }
            } else if (actionType == "movePlayer") {
                for (auto& player : gameState.players) {
                    if (player.id == playerId) {
                        player.head.row = actionJson["row"].get<int>();
                        player.head.col = actionJson["col"].get<int>();
                        player.tail.clear();
                        break;
                    }
                }
            }
        }

        string updatedState;
        {
            lock_guard<mutex> lock(gameStateMutex);
            updatedState = gameStateToJson(gameState);
        }
        res.set_content(updatedState, "application/json");
    });

    cout << "C++ server running on port 9000..." << endl;
    svr.listen("0.0.0.0", 9000);

    return 0;
}