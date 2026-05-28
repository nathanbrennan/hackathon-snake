const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const scoreEl = document.getElementById("score");
const highScoreEl = document.getElementById("highScore");
const speedEl = document.getElementById("speed");
const statusText = document.getElementById("statusText");

const startBtn = document.getElementById("startBtn");
const pauseBtn = document.getElementById("pauseBtn");
const soundBtn = document.getElementById("soundBtn");
const difficultySelect = document.getElementById("difficultySelect");

const BOARD_SIZE = 20;
const CELL_SIZE = canvas.width / BOARD_SIZE;

const DIFFICULTIES = {
  easy: { label: "Easy", baseTickMs: 190, minTickMs: 110, speedStepMs: 3 },
  normal: { label: "Normal", baseTickMs: 160, minTickMs: 78, speedStepMs: 5 },
  hard: { label: "Hard", baseTickMs: 130, minTickMs: 62, speedStepMs: 6 },
};

const DIRECTIONS = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};

let snake;
let direction;
let nextDirection;
let food;
let score;
let highScore = Number(localStorage.getItem("snakeBest")) || 0;
let soundEnabled = localStorage.getItem("snakeSound") !== "off";
let difficulty = localStorage.getItem("snakeDifficulty") || "normal";
let gameOver;
let isRunning;
let isPaused;
let loopTimer;
let audioCtx;

if (!DIFFICULTIES[difficulty]) {
  difficulty = "normal";
}

function updateStartButtonLabel() {
  if (gameOver) {
    startBtn.textContent = "Restart";
    return;
  }

  if (isRunning) {
    startBtn.textContent = "Restart";
    return;
  }

  startBtn.textContent = "Start";
}

function currentDifficulty() {
  return DIFFICULTIES[difficulty];
}

function updateSoundButton() {
  soundBtn.textContent = `Sound: ${soundEnabled ? "On" : "Off"}`;
  soundBtn.setAttribute("aria-pressed", String(soundEnabled));
}

function ensureAudioContext() {
  if (!audioCtx) {
    audioCtx = new window.AudioContext();
  }

  if (audioCtx.state === "suspended") {
    audioCtx.resume();
  }
}

function playTone({ frequency, duration, type = "sine", volume = 0.045, when = 0 }) {
  if (!soundEnabled || !audioCtx) {
    return;
  }

  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();

  osc.type = type;
  osc.frequency.setValueAtTime(frequency, audioCtx.currentTime + when);
  gain.gain.setValueAtTime(0.0001, audioCtx.currentTime + when);
  gain.gain.exponentialRampToValueAtTime(volume, audioCtx.currentTime + when + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + when + duration);

  osc.connect(gain);
  gain.connect(audioCtx.destination);

  osc.start(audioCtx.currentTime + when);
  osc.stop(audioCtx.currentTime + when + duration + 0.02);
}

function playEatSound() {
  playTone({ frequency: 660, duration: 0.06, type: "square", volume: 0.04 });
  playTone({ frequency: 920, duration: 0.08, type: "triangle", volume: 0.038, when: 0.045 });
}

function playStartSound() {
  playTone({ frequency: 392, duration: 0.08, type: "triangle", volume: 0.035 });
  playTone({ frequency: 523, duration: 0.1, type: "triangle", volume: 0.035, when: 0.07 });
}

function playPauseSound(paused) {
  if (paused) {
    playTone({ frequency: 280, duration: 0.08, type: "sine", volume: 0.03 });
  } else {
    playTone({ frequency: 420, duration: 0.08, type: "sine", volume: 0.03 });
  }
}

function playGameOverSound() {
  playTone({ frequency: 380, duration: 0.11, type: "sawtooth", volume: 0.035 });
  playTone({ frequency: 260, duration: 0.13, type: "sawtooth", volume: 0.035, when: 0.09 });
  playTone({ frequency: 180, duration: 0.16, type: "sawtooth", volume: 0.035, when: 0.2 });
}

function initGameState() {
  snake = [
    { x: 10, y: 10 },
    { x: 9, y: 10 },
    { x: 8, y: 10 },
  ];

  direction = { ...DIRECTIONS.right };
  nextDirection = { ...DIRECTIONS.right };
  food = generateFood();
  score = 0;
  gameOver = false;
  isRunning = false;
  isPaused = false;
  updateStartButtonLabel();
  updateHud();
  setStatus("Press Start or Space to play.");
  draw();
}

function generateFood() {
  const occupied = new Set(snake.map((segment) => `${segment.x},${segment.y}`));

  let x;
  let y;
  do {
    x = Math.floor(Math.random() * BOARD_SIZE);
    y = Math.floor(Math.random() * BOARD_SIZE);
  } while (occupied.has(`${x},${y}`));

  return { x, y };
}

function tickRateMs() {
  const mode = currentDifficulty();
  return Math.max(mode.minTickMs, mode.baseTickMs - score * mode.speedStepMs);
}

function cellsPerSecond() {
  return String(Math.round(1000 / tickRateMs()));
}

function updateHud() {
  scoreEl.textContent = String(score);
  highScoreEl.textContent = String(highScore);
  speedEl.textContent = cellsPerSecond();
}

function setStatus(text) {
  statusText.textContent = text;
}

function startGame() {
  ensureAudioContext();

  if (gameOver) {
    initGameState();
  }

  if (isRunning && !isPaused) {
    return;
  }

  isRunning = true;
  isPaused = false;
  updateStartButtonLabel();
  clearTimeout(loopTimer);
  gameLoop();
  playStartSound();
  setStatus(`Use Arrow keys or WASD to move. ${currentDifficulty().label} mode.`);
}

function pauseGame() {
  ensureAudioContext();

  if (!isRunning || gameOver) {
    return;
  }

  isPaused = !isPaused;
  if (isPaused) {
    clearTimeout(loopTimer);
    setStatus("Paused. Press Space to continue.");
    playPauseSound(true);
  } else {
    gameLoop();
    setStatus("Back in action.");
    playPauseSound(false);
  }
}

function restartGame() {
  ensureAudioContext();
  clearTimeout(loopTimer);
  initGameState();
  isRunning = true;
  isPaused = false;
  updateStartButtonLabel();
  gameLoop();
  playStartSound();
  setStatus(`Restarted in ${currentDifficulty().label} mode.`);
}

function handleStartButton() {
  if (isRunning && !gameOver) {
    restartGame();
    return;
  }

  startGame();
}

function isOppositeDirection(candidate) {
  return candidate.x === -direction.x && candidate.y === -direction.y;
}

function queueDirection(newDirection) {
  if (isOppositeDirection(newDirection)) {
    return;
  }

  nextDirection = { ...newDirection };
}

function handleInput(event) {
  const key = event.key.toLowerCase();

  if (key === "m") {
    soundEnabled = !soundEnabled;
    localStorage.setItem("snakeSound", soundEnabled ? "on" : "off");
    updateSoundButton();
    return;
  }

  if (key === " " || key === "spacebar") {
    event.preventDefault();
    if (!isRunning) {
      startGame();
    } else {
      pauseGame();
    }
    return;
  }

  const mapping = {
    arrowup: DIRECTIONS.up,
    w: DIRECTIONS.up,
    arrowdown: DIRECTIONS.down,
    s: DIRECTIONS.down,
    arrowleft: DIRECTIONS.left,
    a: DIRECTIONS.left,
    arrowright: DIRECTIONS.right,
    d: DIRECTIONS.right,
  };

  const pickedDirection = mapping[key];
  if (!pickedDirection) {
    return;
  }

  event.preventDefault();

  if (!isRunning) {
    startGame();
  }

  queueDirection(pickedDirection);
}

function collisionWithSnake(head) {
  return snake.some((segment) => segment.x === head.x && segment.y === head.y);
}

function step() {
  direction = { ...nextDirection };

  const head = {
    x: snake[0].x + direction.x,
    y: snake[0].y + direction.y,
  };

  const hitWall = head.x < 0 || head.y < 0 || head.x >= BOARD_SIZE || head.y >= BOARD_SIZE;
  const hitSelf = collisionWithSnake(head);

  if (hitWall || hitSelf) {
    gameOver = true;
    isRunning = false;
    clearTimeout(loopTimer);
    updateStartButtonLabel();

    if (score > highScore) {
      highScore = score;
      localStorage.setItem("snakeBest", String(highScore));
    }

    updateHud();
    playGameOverSound();
    setStatus("Game over. Press Restart to try again.");
    draw();
    return;
  }

  snake.unshift(head);

  const ateFood = head.x === food.x && head.y === food.y;

  if (ateFood) {
    score += 10;
    food = generateFood();
    playEatSound();

    if (score > highScore) {
      highScore = score;
      localStorage.setItem("snakeBest", String(highScore));
    }
  } else {
    snake.pop();
  }

  updateHud();
}

function drawGrid() {
  ctx.strokeStyle = "rgba(180, 220, 255, 0.15)";
  ctx.lineWidth = 1;

  for (let i = 0; i <= BOARD_SIZE; i += 1) {
    const offset = i * CELL_SIZE;

    ctx.beginPath();
    ctx.moveTo(offset, 0);
    ctx.lineTo(offset, canvas.height);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(0, offset);
    ctx.lineTo(canvas.width, offset);
    ctx.stroke();
  }
}

function drawSnake() {
  snake.forEach((segment, index) => {
    const x = segment.x * CELL_SIZE;
    const y = segment.y * CELL_SIZE;

    ctx.fillStyle = index === 0 ? "#a9ffcf" : "#2ee89a";
    ctx.fillRect(x + 1, y + 1, CELL_SIZE - 2, CELL_SIZE - 2);
  });
}

function drawFood() {
  const x = food.x * CELL_SIZE + CELL_SIZE / 2;
  const y = food.y * CELL_SIZE + CELL_SIZE / 2;

  ctx.fillStyle = "#ff5f7a";
  ctx.beginPath();
  ctx.arc(x, y, CELL_SIZE * 0.35, 0, Math.PI * 2);
  ctx.fill();
}

function drawOverlay() {
  if (!gameOver) {
    return;
  }

  ctx.fillStyle = "rgba(2, 12, 20, 0.58)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "#f4f8ff";
  ctx.font = "700 34px Space Grotesk";
  ctx.textAlign = "center";
  ctx.fillText("GAME OVER", canvas.width / 2, canvas.height / 2 - 10);

  ctx.font = "500 18px Space Grotesk";
  ctx.fillText(`Score: ${score}`, canvas.width / 2, canvas.height / 2 + 24);
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const bg = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
  bg.addColorStop(0, "#071524");
  bg.addColorStop(1, "#12324a");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  drawGrid();
  drawFood();
  drawSnake();
  drawOverlay();
}

function gameLoop() {
  if (!isRunning || isPaused || gameOver) {
    return;
  }

  step();
  draw();
  loopTimer = setTimeout(gameLoop, tickRateMs());
}

startBtn.addEventListener("click", handleStartButton);
pauseBtn.addEventListener("click", pauseGame);
soundBtn.addEventListener("click", () => {
  ensureAudioContext();
  soundEnabled = !soundEnabled;
  localStorage.setItem("snakeSound", soundEnabled ? "on" : "off");
  updateSoundButton();
});

difficultySelect.addEventListener("change", () => {
  const selected = difficultySelect.value;
  if (!DIFFICULTIES[selected]) {
    return;
  }

  difficulty = selected;
  localStorage.setItem("snakeDifficulty", difficulty);
  updateHud();

  if (isRunning && !isPaused && !gameOver) {
    clearTimeout(loopTimer);
    gameLoop();
  }

  if (!gameOver) {
    setStatus(`Difficulty set to ${currentDifficulty().label}.`);
  }
});

document.addEventListener("keydown", handleInput);

document.querySelectorAll(".touch-controls .dpad").forEach((button) => {
  button.addEventListener("click", () => {
    const dirName = button.getAttribute("data-dir");
    const dir = DIRECTIONS[dirName];

    if (!isRunning) {
      startGame();
    }

    queueDirection(dir);
  });
});

highScoreEl.textContent = String(highScore);
updateSoundButton();
difficultySelect.value = difficulty;
initGameState();
