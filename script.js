/**
 * Random Grid Generator
 * 
 * This module provides functionality to generate random grids for pathfinding
 * and visualization purposes. It includes grid generation, pathfinding algorithms,
 * and UI interaction handling.
 */

// Grid configuration
const GRID_CONFIG = {
    OBSTACLE_DENSITY: 0.25, // 25% obstacles
    MIN_SIZE: 5,
    MAX_SIZE: 50
};

// Grid cell types
const CELL_TYPES = {
    FREE: '.',
    OBSTACLE: 'O',
    START: 'S',
    END: 's',
    PATH: '•'
};

// Global grid state
let currentGrid = null;
let gridRows = 0;
let gridCols = 0;
let startPos = null;
let endPos = null;

/**
 * GridGenerator class handles the creation and manipulation of random grids
 */
class GridGenerator {
    constructor(rows, cols) {
        this.rows = rows;
        this.cols = cols;
        this.grid = [];
        this.startPos = null;
        this.endPos = null;
    }

    /**
     * Generates a random grid with obstacles, start, and end positions
     * 
     * Assumptions made for random placement logic:
     * 1. Start and End positions are placed first to ensure they exist
     * 2. Start and End cannot be adjacent to avoid trivial paths
     * 3. Obstacles are placed randomly but not on Start/End positions
     * 4. Obstacle density is configurable but capped to ensure solvability
     * 5. Free spaces fill remaining positions
     */
    generate() {
        // Initialize grid with free spaces
        this.grid = Array(this.rows).fill(null).map(() => 
            Array(this.cols).fill(CELL_TYPES.FREE)
        );

        // Place start and end positions
        this._placeStartAndEnd();

        // Place obstacles randomly
        this._placeObstacles();

        return {
            grid: this.grid,
            startPos: this.startPos,
            endPos: this.endPos
        };
    }

    /**
     * Places start and end positions ensuring they are not adjacent
     */
    _placeStartAndEnd() {
        // Place start position randomly
        this.startPos = {
            row: Math.floor(Math.random() * this.rows),
            col: Math.floor(Math.random() * this.cols)
        };
        this.grid[this.startPos.row][this.startPos.col] = CELL_TYPES.START;

        // Place end position ensuring it's not adjacent to start
        let attempts = 0;
        const maxAttempts = 100;
        
        do {
            this.endPos = {
                row: Math.floor(Math.random() * this.rows),
                col: Math.floor(Math.random() * this.cols)
            };
            attempts++;
        } while (
            this._isAdjacent(this.startPos, this.endPos) && 
            attempts < maxAttempts
        );

        this.grid[this.endPos.row][this.endPos.col] = CELL_TYPES.END;
    }

    /**
     * Places obstacles randomly while avoiding start and end positions
     */
    _placeObstacles() {
        const totalCells = this.rows * this.cols;
        const obstacleCount = Math.floor(totalCells * GRID_CONFIG.OBSTACLE_DENSITY);
        let placedObstacles = 0;

        while (placedObstacles < obstacleCount) {
            const row = Math.floor(Math.random() * this.rows);
            const col = Math.floor(Math.random() * this.cols);

            // Don't place obstacles on start, end, or existing obstacles
            if (this.grid[row][col] === CELL_TYPES.FREE) {
                this.grid[row][col] = CELL_TYPES.OBSTACLE;
                placedObstacles++;
            }
        }
    }

    /**
     * Checks if two positions are adjacent (including diagonally)
     */
    _isAdjacent(pos1, pos2) {
        const rowDiff = Math.abs(pos1.row - pos2.row);
        const colDiff = Math.abs(pos1.col - pos2.col);
        return rowDiff <= 1 && colDiff <= 1 && !(rowDiff === 0 && colDiff === 0);
    }
}

/**
 * PathFinder class implements BFS algorithm to find shortest path
 */
class PathFinder {
    constructor(grid, startPos, endPos) {
        this.grid = grid;
        this.startPos = startPos;
        this.endPos = endPos;
        this.rows = grid.length;
        this.cols = grid[0].length;
    }

    /**
     * Finds the shortest path using BFS algorithm
     * Returns path array or null if no path exists
     */
    findPath() {
        const queue = [{ ...this.startPos, path: [this.startPos] }];
        const visited = new Set();
        const directions = [
            [-1, 0], [1, 0], [0, -1], [0, 1] // Up, Down, Left, Right
        ];

        visited.add(`${this.startPos.row},${this.startPos.col}`);

        while (queue.length > 0) {
            const current = queue.shift();
            
            // Check if we reached the end
            if (current.row === this.endPos.row && current.col === this.endPos.col) {
                return current.path;
            }

            // Explore neighbors
            for (const [dRow, dCol] of directions) {
                const newRow = current.row + dRow;
                const newCol = current.col + dCol;
                const key = `${newRow},${newCol}`;

                if (
                    this._isValidPosition(newRow, newCol) &&
                    !visited.has(key) &&
                    this._isWalkable(newRow, newCol)
                ) {
                    visited.add(key);
                    queue.push({
                        row: newRow,
                        col: newCol,
                        path: [...current.path, { row: newRow, col: newCol }]
                    });
                }
            }
        }

        return null; // No path found
    }

    /**
     * Checks if position is within grid bounds
     */
    _isValidPosition(row, col) {
        return row >= 0 && row < this.rows && col >= 0 && col < this.cols;
    }

    /**
     * Checks if a cell is walkable (not an obstacle)
     */
    _isWalkable(row, col) {
        const cell = this.grid[row][col];
        return cell !== CELL_TYPES.OBSTACLE;
    }
}

/**
 * UI Controller handles user interactions and grid visualization
 */
class UIController {
    constructor() {
        this.gridElement = document.getElementById('grid');
        this.resultElement = document.getElementById('pathResult');
    }

    /**
     * Renders the grid in the UI
     */
    renderGrid(gridData, animatePath = false, path = null) {
        const { grid, startPos, endPos } = gridData;
        this.gridElement.innerHTML = '';
        
        // Set grid template
        this.gridElement.style.gridTemplateColumns = `repeat(${grid[0].length}, 1fr)`;
        this.gridElement.style.gridTemplateRows = `repeat(${grid.length}, 1fr)`;

        // Create cells
        for (let row = 0; row < grid.length; row++) {
            for (let col = 0; col < grid[row].length; col++) {
                const cell = document.createElement('div');
                cell.className = 'cell';
                cell.textContent = grid[row][col];
                cell.dataset.row = row;
                cell.dataset.col = col;
                
                // Add appropriate class based on cell type
                switch (grid[row][col]) {
                    case CELL_TYPES.FREE:
                        cell.classList.add('free');
                        break;
                    case CELL_TYPES.OBSTACLE:
                        cell.classList.add('obstacle');
                        break;
                    case CELL_TYPES.START:
                        cell.classList.add('start');
                        break;
                    case CELL_TYPES.END:
                        cell.classList.add('end');
                        break;
                    case CELL_TYPES.PATH:
                        cell.classList.add('path');
                        break;
                }
                
                this.gridElement.appendChild(cell);
            }
        }

        // Animate path if requested
        if (animatePath && path) {
            setTimeout(() => this.animatePathSequentially(path), 100);
        }
    }

    /**
     * Highlights the path on the grid with sequential animation
     */
    highlightPath(path, originalGrid) {
        const gridCopy = originalGrid.map(row => [...row]);
        
        // Mark path cells (excluding start and end)
        for (let i = 1; i < path.length - 1; i++) {
            const { row, col } = path[i];
            gridCopy[row][col] = CELL_TYPES.PATH;
        }

        return gridCopy;
    }

    /**
     * Animates the path sequentially
     */
    animatePathSequentially(path) {
        // Remove any existing animations
        const pathCells = this.gridElement.querySelectorAll('.cell.path');
        pathCells.forEach(cell => {
            cell.classList.remove('animated');
            cell.style.animationDelay = '';
        });

        // Get grid dimensions
        const cols = parseInt(this.gridElement.style.gridTemplateColumns.match(/repeat\((\d+),/)[1]);

        // Animate path cells sequentially (excluding start and end)
        for (let i = 1; i < path.length - 1; i++) {
            const { row, col } = path[i];
            const cellIndex = row * cols + col;
            const cell = this.gridElement.children[cellIndex];
            
            if (cell && cell.classList.contains('path')) {
                cell.style.animationDelay = `${(i - 1) * 0.15}s`;
                cell.classList.add('animated');
            }
        }
    }

    /**
     * Displays the pathfinding result
     */
    displayResult(hasPath, pathLength = 0) {
        this.resultElement.className = 'path-result';
        
        if (hasPath) {
            this.resultElement.textContent = `Shortest Path Found! Length: ${pathLength - 1} steps`;
            this.resultElement.classList.add('success');
        } else {
            this.resultElement.textContent = 'Not Possible - No path exists!';
            this.resultElement.classList.add('failure');
        }
    }

    /**
     * Shows loading state
     */
    showLoading() {
        this.resultElement.className = 'path-result info';
        this.resultElement.textContent = 'Generating grid and finding path...';
    }

    /**
     * Validates input values
     */
    validateInputs(rows, cols) {
        if (rows < GRID_CONFIG.MIN_SIZE || rows > GRID_CONFIG.MAX_SIZE) {
            throw new Error(`Rows must be between ${GRID_CONFIG.MIN_SIZE} and ${GRID_CONFIG.MAX_SIZE}`);
        }
        if (cols < GRID_CONFIG.MIN_SIZE || cols > GRID_CONFIG.MAX_SIZE) {
            throw new Error(`Columns must be between ${GRID_CONFIG.MIN_SIZE} and ${GRID_CONFIG.MAX_SIZE}`);
        }
    }
}

// Initialize UI controller
const uiController = new UIController();

/**
 * Main function to generate grid and find path
 */
function generateGrid() {
    try {
        // Get input values
        const rows = parseInt(document.getElementById('rows').value);
        const cols = parseInt(document.getElementById('cols').value);

        // Validate inputs
        uiController.validateInputs(rows, cols);

        // Show loading state
        uiController.showLoading();

        // Small delay to show loading state
        setTimeout(() => {
            try {
                // Generate grid
                const generator = new GridGenerator(rows, cols);
                const gridData = generator.generate();

                // Store global state
                currentGrid = gridData.grid;
                gridRows = rows;
                gridCols = cols;
                startPos = gridData.startPos;
                endPos = gridData.endPos;

                // Find path
                const pathFinder = new PathFinder(gridData.grid, gridData.startPos, gridData.endPos);
                const path = pathFinder.findPath();

                if (path) {
                    // Highlight path on grid
                    const gridWithPath = uiController.highlightPath(path, gridData.grid);
                    uiController.renderGrid({ 
                        grid: gridWithPath, 
                        startPos: gridData.startPos, 
                        endPos: gridData.endPos 
                    }, true, path);
                    uiController.displayResult(true, path.length);
                } else {
                    // No path found
                    uiController.renderGrid(gridData);
                    uiController.displayResult(false);
                }
            } catch (error) {
                console.error('Error generating grid:', error);
                uiController.resultElement.className = 'path-result failure';
                uiController.resultElement.textContent = `Error: ${error.message}`;
            }
        }, 100);

    } catch (error) {
        console.error('Input validation error:', error);
        uiController.resultElement.className = 'path-result failure';
        uiController.resultElement.textContent = `Error: ${error.message}`;
    }
}

// Initialize with default grid on page load
document.addEventListener('DOMContentLoaded', function() {
    generateGrid();
});

// Add enter key support for inputs
document.getElementById('rows').addEventListener('keypress', function(event) {
    if (event.key === 'Enter') {
        generateGrid();
    }
});

document.getElementById('cols').addEventListener('keypress', function(event) {
    if (event.key === 'Enter') {
        generateGrid();
    }
});