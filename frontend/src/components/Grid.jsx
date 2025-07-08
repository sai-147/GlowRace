import React, { useEffect, useRef } from 'react';

const Grid = ({ gameState }) => {
    const canvasRef = useRef(null);
    const GRID_SIZE = 50;
    const CELL_SIZE = 10;

    useEffect(() => {
        if (!gameState || !canvasRef.current) return;

        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');

        // Clear canvas with dark background
        ctx.fillStyle = '#1a1a2e';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Draw grid lines with subtle glow effect
        ctx.strokeStyle = '#16213e';
        ctx.lineWidth = 1;
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

        // Draw glow points with pulsing effect
        gameState.glowPoints.forEach(point => {
            const x = point.col * CELL_SIZE + CELL_SIZE / 2;
            const y = point.row * CELL_SIZE + CELL_SIZE / 2;
            
            // Outer glow
            const gradient = ctx.createRadialGradient(x, y, 0, x, y, CELL_SIZE);
            gradient.addColorStop(0, 'rgba(255, 255, 0, 0.8)');
            gradient.addColorStop(0.3, 'rgba(255, 255, 0, 0.4)');
            gradient.addColorStop(1, 'rgba(255, 255, 0, 0)');
            
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(x, y, CELL_SIZE, 0, 2 * Math.PI);
            ctx.fill();
            
            // Inner core
            ctx.fillStyle = '#ffff00';
            ctx.beginPath();
            ctx.arc(x, y, CELL_SIZE / 3, 0, 2 * Math.PI);
            ctx.fill();
        });

        // Draw players with enhanced styling
        gameState.players.forEach((player, index) => {
            if (!player.alive) return;

            const hue = (index * 60) % 360;
            
            // Player head with glow effect
            const headX = player.col * CELL_SIZE + CELL_SIZE / 2;
            const headY = player.row * CELL_SIZE + CELL_SIZE / 2;
            
            // Head glow
            const headGradient = ctx.createRadialGradient(headX, headY, 0, headX, headY, CELL_SIZE);
            headGradient.addColorStop(0, `hsla(${hue}, 70%, 60%, 0.8)`);
            headGradient.addColorStop(0.7, `hsla(${hue}, 70%, 50%, 0.4)`);
            headGradient.addColorStop(1, `hsla(${hue}, 70%, 50%, 0)`);
            
            ctx.fillStyle = headGradient;
            ctx.beginPath();
            ctx.arc(headX, headY, CELL_SIZE * 0.8, 0, 2 * Math.PI);
            ctx.fill();
            
            // Head solid
            ctx.fillStyle = `hsl(${hue}, 70%, 50%)`;
            ctx.fillRect(
                player.col * CELL_SIZE + 1,
                player.row * CELL_SIZE + 1,
                CELL_SIZE - 2,
                CELL_SIZE - 2
            );
            
            // Head border
            ctx.strokeStyle = `hsl(${hue}, 70%, 70%)`;
            ctx.lineWidth = 2;
            ctx.strokeRect(
                player.col * CELL_SIZE + 1,
                player.row * CELL_SIZE + 1,
                CELL_SIZE - 2,
                CELL_SIZE - 2
            );

            // Player tail with gradient effect
            player.tail.forEach((segment, tailIndex) => {
                const alpha = Math.max(0.3, 1 - (tailIndex / player.tail.length) * 0.7);
                ctx.fillStyle = `hsla(${hue}, 70%, 60%, ${alpha})`;
                ctx.fillRect(
                    segment.col * CELL_SIZE + 1,
                    segment.row * CELL_SIZE + 1,
                    CELL_SIZE - 2,
                    CELL_SIZE - 2
                );
                
                // Tail segment border
                ctx.strokeStyle = `hsla(${hue}, 70%, 70%, ${alpha * 0.8})`;
                ctx.lineWidth = 1;
                ctx.strokeRect(
                    segment.col * CELL_SIZE + 1,
                    segment.row * CELL_SIZE + 1,
                    CELL_SIZE - 2,
                    CELL_SIZE - 2
                );
            });

            // Player name with glow text
            ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
            ctx.fillRect(
                player.col * CELL_SIZE - 10,
                player.row * CELL_SIZE - 20,
                player.name.length * 6 + 4,
                12
            );
            
            ctx.fillStyle = `hsl(${hue}, 70%, 80%)`;
            ctx.font = 'bold 10px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(
                player.name,
                player.col * CELL_SIZE + CELL_SIZE / 2,
                player.row * CELL_SIZE - 10
            );
        });
    }, [gameState]);

    return (
        <div className="relative">
            <canvas
                ref={canvasRef}
                width={GRID_SIZE * CELL_SIZE}
                height={GRID_SIZE * CELL_SIZE}
                className="rounded-lg shadow-2xl border-2 border-purple-500/30"
                style={{ 
                    backgroundColor: '#1a1a2e',
                    boxShadow: '0 0 50px rgba(147, 51, 234, 0.3), inset 0 0 20px rgba(0, 0, 0, 0.5)'
                }}
            />
            <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-purple-500/10 to-blue-500/10 pointer-events-none"></div>
        </div>
    );
};

export default Grid;