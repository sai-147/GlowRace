const Grid = ({ gameState }) => {
    const gridSize = 50;
    const cellSize = 10; // px

    return (
        <div
            style={{
                width: gridSize * cellSize,
                height: gridSize * cellSize,
                display: 'grid',
                gridTemplateColumns: `repeat(${gridSize}, ${cellSize}px)`,
                gap: '1px',
                backgroundColor: '#333',
            }}
        >
            {Array.from({ length: gridSize * gridSize }).map((_, index) => {
                const row = Math.floor(index / gridSize);
                const col = index % gridSize;

                const player = gameState.players.find(p => p.row === row && p.col === col);
                const glowPoint = gameState.glowPoints.find(gp => gp.row === row && gp.col === col);

                let backgroundColor = '#000';
                let content = '';

                if (glowPoint) {
                    backgroundColor = 'yellow';
                    content = 'G';
                }

                if (player) {
                    backgroundColor = player.id === 'P1' ? 'blue' : 'red';
                    content = player.id;
                }

                return (
                    <div
                        key={index}
                        style={{
                            width: `${cellSize}px`,
                            height: `${cellSize}px`,
                            backgroundColor,
                            border: '1px solid #333',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '6px',
                            color: 'white',
                            overflow: 'hidden',
                            textAlign: 'center',
                        }}
                    >
                        {content}
                    </div>
                );
            })}
        </div>
    );
};

export default Grid;
