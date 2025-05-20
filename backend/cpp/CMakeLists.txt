cmake_minimum_required(VERSION 3.10)
project(GlowRaceServer)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED True)

add_executable(server server.cpp)

# Link pthread (required for cpp-httplib on some systems)
find_package(Threads REQUIRED)
target_link_libraries(server Threads::Threads)