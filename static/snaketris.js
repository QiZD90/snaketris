'use strict';

const canvas = document.querySelector('canvas');
const ctx = canvas.getContext('2d');

// Game constants
const width = 10, height = 24; // width and height of the game field
const limitY = 4; // y-coordinate of a limit that turns snake into tetramino
const tileSize = 20; // size of one tile in pixels

const directions = [
	{dx: 0, dy: -1}, {dx: 1, dy: 0}, // up and right
	{dx: 0, dy: 1}, {dx: -1, dy: 0} // down and left
];

// Game state
let gameState = 'menu'; // 'menu', 'game' or 'gameover'

let blocks = [];
for (let i = 0; i < height; i++) {
	blocks.push(new Array(width).fill(false));
}

let snake = randomSnake();
let tetramino = null;

// Images of GUI elements
let playButtonImage = new Image(64, 64);
playButtonImage.src = '/static/play_button.png';
let playButtonRect = {
	x: canvas.width / 2 - 32,
	y: canvas.height / 2 - 32,
	w: 64,
	h: 64
};
playButtonImage.onload = function() {
	playButtonRect = {
		x: canvas.width / 2 - this.width / 2,
		y: canvas.height / 2 - this.height / 2,
		w: this.width,
		h: this.height
	};
}

let restartButtonImage = new Image(64, 64);
restartButtonImage.src = '/static/restart_button.png';
let restartButtonRect = {
	x: canvas.width / 2 - 32,
	y: canvas.height / 2 - 32,
	w: 64,
	h: 64
};
restartButtonImage.onload = function() {
	restartButtonRect = {
		x: canvas.width / 2 - this.width / 2,
		y: canvas.height / 2 - this.height / 2,
		w: this.width,
		h: this.height
	};
}

// Color constants
let snakeHeadColor = 'rgb(15, 120, 4)'; 
let snakeBodyColor = 'rgb(20, 204, 0)';
let tetraminoColor = 'rgb(255, 255, 5)';
let fallenBlocksColor = 'rgb(27, 23, 255)';

// Returns random cardinal direction
function randomDirection() {
	return directions[Math.floor(Math.random() * 4)];
}

function randomSnake() {
	let blocks = [];

	// Place head randomly
	let x = 1 + Math.floor(Math.random() * (width - 2));
	let y = 1 + Math.floor(Math.random() * (limitY - 2));
	blocks.push({x: x, y: y});

	// Place the rest of the snake
	for (let i = 0; i < 3; i++) {
		while (true) {
			let snakeDirection = randomDirection();

			if (x + snakeDirection.dx < 0 || x + snakeDirection.dx >= width)
				continue;

			if (y + snakeDirection.dy < 0 || y + snakeDirection.dy >= limitY)
				continue;

			// Check if there is already a snake block in this tile
			let continueFlag = false;
			for (const block of blocks) {
				if (x + snakeDirection.dx == block.x && y + snakeDirection.dy == block.y) {
					continueFlag = true;
					break;
				}
			}

			if (continueFlag) {
				continue;
			}

			// Add the snake block
			x += snakeDirection.dx;
			y += snakeDirection.dy;
			blocks.push({x: x, y: y});
			break;
		}
	}

	// Pick a random direction that would let snake live for more than one step
	let direction = null;
	while (true) {
		direction = randomDirection();

		let continueFlag = false;
		for (const block of blocks) {
			if (blocks[0].x + direction.dx == block.x && blocks[0].y + direction.dy == block.y) {
				continueFlag = true;
				break;
			}
		}
		if (continueFlag)
			continue;

		break;
	}

	return {
		blocks: blocks,
		direction: direction
	};
}

function makeTetraminoFromSnake() {
	if (!snake) 
		return;

	tetramino = {blocks: snake.blocks};
	snake = null;
}

// Tries to change direction of the snake
// Returns `true` if direction was successfully changed or `false` otherwise
function tryToChangeDirection(direction) {
	let head = snake.blocks[0];
	let secondBlock = snake.blocks[1];

	// Don't allow snake to steer into itself
	if (head.x + direction.dx == secondBlock.x && head.y + direction.dy == secondBlock.y)
		return false;

	snake.direction = direction;
	return true;
}

function snakeMove() {
	let head = snake.blocks[0];
	if (head.x + snake.direction.dx < 0 || head.x + snake.direction.dx >= width) {
		makeTetraminoFromSnake();
		return;
	}

	if (head.y + snake.direction.dy < 0
	    || head.y + snake.direction.dy >= limitY) {
		makeTetraminoFromSnake();
		return;
	}

	// move every block of the snake except the head
	for (let i = snake.blocks.length - 1; i > 0; i--) {
		snake.blocks[i].x = snake.blocks[i - 1].x;
		snake.blocks[i].y = snake.blocks[i - 1].y;
	}

	// move the head
	head.x += snake.direction.dx;
	head.y += snake.direction.dy;
}

function tryToMoveTetramino(dx) {
	for (let block of tetramino.blocks) {
		if (block.x + dx < 0 || block.x + dx >= width)
			return false;

		if (blocks[block.y][block.x + dx])
			return false;
	}

	for (let block of tetramino.blocks) {
		block.x += dx;
	}
}

// Move tetramino one tile down
// Returns `true` if tetramino turns solid and `false` otherwise
function tetraminoFall() {
	for (let block of tetramino.blocks) {
		if (block.y + 1 == height) {
			tetraminoTurnSolid();
			return true;
		}

		if (blocks[block.y + 1][block.x]) {
			tetraminoTurnSolid();
			return true;
		}
	}

	for (let block of tetramino.blocks) {
		block.y += 1;
	}

	return false;
}

function tetraminoDrop() {
	while (!tetraminoFall());
}

function tetraminoTurnSolid() {
	for (let block of tetramino.blocks) {
		blocks[block.y][block.x] = true;
	}

	checkForLines();
	if (checkForLoss()) {
		return;
	}

	tetramino = null;
	snake = randomSnake();
}

function checkForLines() {
	for (let i = 0; i < height; i++) {
		let lineIsFilled = true;

		for (let j = 0; j < width; j++) {
			if (!blocks[i][j])
				lineIsFilled = false;
		}

		if (!lineIsFilled)
			continue;

		for (let k = i; k > 0; k--) { // Move all lines higher than this one tile down
			blocks[k] = blocks[k - 1];
		}
		blocks[0] = new Array(width).fill(false);
	}
}

function checkForLoss() {
	for (let i = 0; i < limitY; i++) {
		for (let j = 0; j < width; j++) {
			if (!blocks[i][j])
				continue;

			// if there is a block in the snake zone
			if (gameState == 'menu') { // Mistakes happen in menu, so just start over...
				startGame();
				gameState = 'menu';
				return true;
			} else {
				gameState = 'gameover';
				snake = null;
				tetramino = null;
				return true;
			}
		}
	}

	return false;
}

// Returns cursor position within canvas
// Thank you, @patriques from StackOverflow
function getCursorPosition(event) {
	const rect = canvas.getBoundingClientRect();
	const x = event.clientX - rect.left;
	const y = event.clientY - rect.top;
	return {x: x, y: y};
}

function startGame() {
	gameState = 'game';
	snake = randomSnake();
	tetramino = null;

	blocks = [];
	for (let i = 0; i < height; i++) {
		blocks.push(new Array(width).fill(false));
	}
}

function drawFrame() {
	ctx.clearRect(0, 0, canvas.width, canvas.height);

	if (gameState == 'menu' || gameState == 'gameover') {
		ctx.filter = 'blur(4px)';
	}

	// Draw the limit
	ctx.beginPath();
	ctx.moveTo(0, limitY * tileSize);
	ctx.lineTo(width * tileSize, limitY * tileSize);
	ctx.strokeStyle = 'red';
	ctx.stroke();

	if (snake) { // if snake exists, draw snake
		for (let i = 0; i < snake.blocks.length; i++) {
			if (i == 0) { // Head should have different color
				ctx.fillStyle = snakeHeadColor;
			} else {
				ctx.fillStyle = snakeBodyColor;
			}

			let block = snake.blocks[i];
			ctx.fillRect(block.x * tileSize, block.y * tileSize, tileSize, tileSize);
		}
	}

	if (tetramino) {
		ctx.fillStyle = tetraminoColor;
		for (let i = 0; i < tetramino.blocks.length; i++) {
			let block = tetramino.blocks[i];
			ctx.fillRect(block.x * tileSize, block.y * tileSize, tileSize, tileSize);
		}
	}

	// Draw blocks
	ctx.fillStyle = fallenBlocksColor;
	for (let i = 0; i < height; i++) {
		for (let j = 0; j < width; j++) {
			if (!blocks[i][j])
				continue;

			ctx.fillRect(j * tileSize, i * tileSize, tileSize, tileSize);
		}
	}

	ctx.filter = 'none';
	if (gameState == 'menu') {
		ctx.drawImage(playButtonImage,
		              playButtonRect.x, playButtonRect.y,
		              playButtonRect.w, playButtonRect.h);
	} else if (gameState == 'gameover') {
		ctx.drawImage(restartButtonImage,
		              restartButtonRect.x, restartButtonRect.y,
		              restartButtonRect.w, restartButtonRect.h);
	}

	window.requestAnimationFrame(drawFrame);
}

function update() {
	if (snake) {
		snakeMove();
	}

	if (tetramino) {
		tetraminoFall();
	}
}

document.addEventListener('keydown', function(e) {
	if (!e) return;

	switch (e.key) {
		case 'ArrowUp': {
			if (gameState == 'game' && snake) {
				tryToChangeDirection({dx: 0, dy: -1});
			}
			break;
		}

		case 'ArrowDown': {
			if (gameState == 'game' && snake) {
				tryToChangeDirection({dx: 0, dy: 1});
			} else if (gameState == 'game' && tetramino) {
				tetraminoDrop();
			}
			break;
		}

		case 'ArrowLeft': {
			if (gameState == 'game' && snake) {
				tryToChangeDirection({dx: -1, dy: 0});
			} else if (gameState == 'game' && tetramino) {
				tryToMoveTetramino(-1);
			}
			break;
		}

		case 'ArrowRight': {
			if (gameState == 'game' && snake) {
				tryToChangeDirection({dx: 1, dy: 0});
			} else if (gameState == 'game' && tetramino) {
				tryToMoveTetramino(1);
			}
			break;
		}

		case ' ': {
			if (gameState == 'game' && snake) {
				makeTetraminoFromSnake();
			} else if (gameState == 'menu' || gameState == 'gameover') {
				startGame();
			}
			break;
		}
	}
});

canvas.addEventListener('mousedown', function(e) {
	// We only use a cursor for clicking a play button
	if (gameState != 'menu' && gameState != 'gameover')
		return;

	function pointInRect(point, rect) {
		return point.x > rect.x && point.x < rect.x + rect.w
		    && point.y > rect.y && point.y < rect.y + rect.h;
	}

	let cursorPosition = getCursorPosition(e);
	if (gameState == 'menu' && pointInRect(cursorPosition, playButtonRect)) {
		startGame();
		return;
	}

	if (gameState == 'gameover' && pointInRect(cursorPosition, restartButtonRect)) {
		startGame();
		return;
	}
});

window.requestAnimationFrame(drawFrame);
setInterval(update, 700);