import React, { useEffect, useRef } from 'react';

const Grid = ({ gameState }) => {
    const canvasRef = useRef(null);
    const GRID_SIZE = 50;
    const CELL_SIZE = 10;

    useEffect(() => {
        if (!gameState || !canvasRef.current) return;

        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Draw grid lines
        ctx.strokeStyle = '#ddd';
        for (let i = 0; i <= GRID_SIZE; i++) {
            ctx.beginPath();
            ctx.moveTo(i * CELL_SIZE, 0);
            ctx.lineTo(i * CELL_SIZE, GRID_SIZE * CELL_SIZE);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(0, i * CELL_SIZE);
            ctx.lineTo(GRID_SIZE * CELL_SIZE, i * CELL_SIZE);
            ctx.stroke();
        }

        // Draw glow points
        gameState.glowPoints.forEach(point => {
            ctx.fillStyle = 'yellow';
            ctx.beginPath();
            ctx.arc(
                point.col * CELL_SIZE + CELL_SIZE / 2,
                point.row * CELL_SIZE + CELL_SIZE / 2,
                CELL_SIZE / 3,
                0,
                2 * Math.PI
            );
            ctx.fill();
        });

        // Draw players
        gameState.players.forEach((player, index) => {
            if (!player.alive) return;

            ctx.fillStyle = `hsl(${(index * 60) % 360}, 70%, 50%)`;
            ctx.fillRect(
                player.col * CELL_SIZE,
                player.row * CELL_SIZE,
                CELL_SIZE,
                CELL_SIZE
            );

            ctx.fillStyle = `hsl(${(index * 60) % 360}, 70%, 70%)`;
            player.tail.forEach(segment => {
                ctx.fillRect(
                    segment.col * CELL_SIZE,
                    segment.row * CELL_SIZE,
                    CELL_SIZE,
                    CELL_SIZE
                );
            });

            ctx.fillStyle = 'black';
            ctx.font = '10px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(
                player.name,
                player.col * CELL_SIZE + CELL_SIZE / 2,
                player.row * CELL_SIZE - 5
            );
        });
    }, [gameState]);

    return (
        <canvas
            ref={canvasRef}
            width={GRID_SIZE * CELL_SIZE}
            height={GRID_SIZE * CELL_SIZE}
            style={{ border: '1px solid black', backgroundColor: '#f0f0f0' }}
        />
    );
};

export default Grid;