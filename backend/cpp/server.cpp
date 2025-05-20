#include "httplib.h"
#include <iostream>
#include <string>
#include <vector>

// Import the std namespace (from your previous request)
using namespace std;

// Import the httplib namespace to simplify httplib:: prefixes
using namespace httplib;

// Simple game state (mock for now)
struct Player {
    string id;
    int row;
    int col;
    string direction;
    int score;
};

struct GameState {
    vector<Player> players;
    vector<pair<int, int>> glowPoints;
};

GameState gameState = {
    {{"P1", 0, 0, "right", 0}},  // Initial player
    {{10, 10}}                   // Initial glow point
};

int main() {
    Server svr;

    // Endpoint to handle actions from FastAPI
    svr.Post("/update", [](const Request& req, Response& res) {
        // Parse the action from FastAPI
        auto action = req.body;  // e.g., {"action":"changeDirection","playerId":"P1","direction":"down"}
        cout << "Received action: " << action << endl;

        // Mock processing: Update P1's direction (simplified for now)
        for (auto& player : gameState.players) {
            if (player.id == "P1") {
                player.direction = "down";  // Hardcoded for testing
            }
        }

        // Mock updated state
        string updatedState = R"({"players":[{"id":"P1","row":0,"col":0,"direction":"down","score":0}],"glowPoints":[{"row":10,"col":10}]})";

        // Send the updated state back to FastAPI
        res.set_content(updatedState, "application/json");
    });

    cout << "C++ server running on port 9000..." << endl;
    svr.listen("0.0.0.0", 9000);

    return 0;
}