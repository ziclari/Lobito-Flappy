// --- Canvas setup ---
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// --- Canvas dimensions ---
const CANVAS_WIDTH  = 1536;
const CANVAS_HEIGHT = 349;

// --- Physics constants ---
const GRAVITY       = 0.12;  // pixels/frame² downward
const IMPULSE       = -4.8;  // pixels/frame upward (negative = up)
const JUMP_DURATION = 12;    // frames to display jump.png after flap

// --- Tower constants ---
const TOWER_WIDTH    = 90;
const TOWER_HITBOX_INSET = 10;
const TOWER_SPEED    = 6;    // pixels per frame
const GAP_HEIGHT     = 175;  // vertical opening size
const SPAWN_INTERVAL = 120;  // frames between tower spawns
const GAP_MIN        = 30;   // minimum gapY (pixels from top)
const GAP_MAX        = CANVAS_HEIGHT - GAP_HEIGHT - 30; // maximum gapY

// --- Game state ---
let gameState = 'READY'; // 'READY' | 'PLAYING' | 'GAME_OVER'
let score     = 0;
let spawnTimer = 0;
let wolfHit   = false;

// --- Sprites ---
const sprites = {
  fly:  new Image(),
  jump: new Image(),
  hit:  new Image(),
  dead: new Image(),
};
sprites.fly.src  = 'assets/wolf/fly.png';
sprites.jump.src = 'assets/wolf/jump.png';
sprites.hit.src  = 'assets/wolf/hit.png';
sprites.dead.src = 'assets/wolf/dead.png';

// --- Wolf object ---
const wolf = {
  x: 250,
  y: 140,
  vy: 0,
  width: 100,
  height: 71,
  jumpTimer: 0,
};
const SPRITE_PADDING = 15;
const HITBOX_INSET = 24;

// --- Physics ---
function applyGravity() {
  wolf.vy += GRAVITY;
  wolf.y  += wolf.vy;
  // Clamp to canvas bounds
  if (wolf.y < 0) {
    wolf.y  = 0;
    wolf.vy = 0;
  }
  if (wolf.y > CANVAS_HEIGHT - wolf.height) {
    wolf.y = CANVAS_HEIGHT - wolf.height;
  }
}

// --- Towers ---
const towers = [];

function spawnTower() {
  const gapY = Math.floor(Math.random() * (GAP_MAX - GAP_MIN + 1)) + GAP_MIN;
  towers.push({
    x: CANVAS_WIDTH,
    gapY: gapY,
    scored: false,
  });
}

// --- Flap (impulse) ---
function flap() {
  wolf.vy = IMPULSE;
  wolf.jumpTimer = JUMP_DURATION;
}

// --- Decrement jump timer (called each PLAYING frame) ---
function tickJumpTimer() {
  if (wolf.jumpTimer > 0) {
    wolf.jumpTimer--;
  }
}

// --- Tower movement and culling ---
function moveTowers() {
  for (let i = towers.length - 1; i >= 0; i--) {
    towers[i].x -= TOWER_SPEED;
    if (towers[i].x + TOWER_WIDTH <= 0) {
      towers.splice(i, 1);
    }
  }
}

// --- Sprite selection ---
function getCurrentSprite() {
  if (gameState === 'GAME_OVER') return sprites.dead;
  if (wolfHit)                   return sprites.hit;
  if (wolf.jumpTimer > 0)        return sprites.jump;
  return sprites.fly;
}

// --- Collision detection ---
function rectsOverlap(a, b) {
  return a.x < b.x + b.w &&
         a.x + a.w > b.x &&
         a.y < b.y + b.h &&
         a.y + a.h > b.y;
}

function checkCollisions() {
  const wolfRect = {
    x: wolf.x + HITBOX_INSET,
    y: wolf.y + HITBOX_INSET,
    w: wolf.width - HITBOX_INSET * 2,
    h: wolf.height - HITBOX_INSET * 2,
  };

  // Ground collision
  if (wolf.y + wolf.height >= CANVAS_HEIGHT) {
    wolfHit = true;
    gameState = 'GAME_OVER';
    return;
  }

  // Tower collisions
  for (const tower of towers) {
    const topRect = {
      x: tower.x + TOWER_HITBOX_INSET,
      y: 0,
      w: TOWER_WIDTH - TOWER_HITBOX_INSET * 2,
      h: Math.max(0, tower.gapY - TOWER_HITBOX_INSET)
    };
    const bottomRect = {
      x: tower.x + TOWER_HITBOX_INSET,
      y: tower.gapY + GAP_HEIGHT + TOWER_HITBOX_INSET,
      w: TOWER_WIDTH - TOWER_HITBOX_INSET * 2,
      h: Math.max(0, CANVAS_HEIGHT - (tower.gapY + GAP_HEIGHT) - TOWER_HITBOX_INSET)
    };

    if (rectsOverlap(wolfRect, topRect) || rectsOverlap(wolfRect, bottomRect)) {
      wolfHit = true;
      gameState = 'GAME_OVER';
      return;
    }
  }
}

// --- Rendering: background ---
const background = new Image();
background.src = 'assets/background.png';
const towerTopSprite = new Image();
const towerBottomSprite = new Image();
towerTopSprite.src = 'assets/torre-top.png';
towerBottomSprite.src = 'assets/torre-bottom.png';
let backgroundOffset = 0;

function drawBackground() {
  ctx.fillStyle = '#87CEEB';
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  if (!background.naturalWidth) return;

  const scale = Math.max(CANVAS_WIDTH / background.width, CANVAS_HEIGHT / background.height);
  const width = background.width * scale;
  const height = background.height * scale;
  backgroundOffset = (backgroundOffset - 0.25) % width;
  for (let x = backgroundOffset; x < CANVAS_WIDTH; x += width) {
    ctx.drawImage(background, x, 0, width, height);
  }
}

// --- Rendering: towers ---
function drawTowers() {
  for (const tower of towers) {
    // Top tower: y=0 to gapY
    if (towerTopSprite.naturalWidth) {
      ctx.drawImage(towerTopSprite, tower.x, 0, TOWER_WIDTH, tower.gapY);
    }
    // Bottom tower: gapY+GAP_HEIGHT to CANVAS_HEIGHT
    if (towerBottomSprite.naturalWidth) {
      ctx.drawImage(
        towerBottomSprite,
        tower.x,
        tower.gapY + GAP_HEIGHT,
        TOWER_WIDTH,
        CANVAS_HEIGHT - (tower.gapY + GAP_HEIGHT)
      );
    }
  }
}

// --- Rendering: wolf ---
function drawWolf() {
  const sprite = getCurrentSprite();
  ctx.drawImage(
    sprite,
    SPRITE_PADDING,
    SPRITE_PADDING,
    sprite.width - SPRITE_PADDING * 2,
    sprite.height - SPRITE_PADDING * 2,
    wolf.x,
    wolf.y,
    wolf.width,
    wolf.height
  );
}

// --- Scoring ---
function updateScore() {
  for (const tower of towers) {
    if (!tower.scored && wolf.x > tower.x + TOWER_WIDTH) {
      score++;
      tower.scored = true;
    }
  }
}

// --- Rendering: score ---
function drawScore() {
  ctx.font = '48px "Isometra", serif';
  ctx.textAlign = 'center';
  ctx.strokeStyle = '#333';
  ctx.lineWidth = 4;
  ctx.strokeText(score, CANVAS_WIDTH / 2, 56);
  ctx.fillStyle = '#fff';
  ctx.fillText(score, CANVAS_WIDTH / 2, 56);
}

// --- Rendering: READY screen ---
function drawReady() {
  drawBackground();
  drawWolf();
  ctx.font = '20px "Isometra", serif';
  ctx.textAlign = 'center';
  ctx.strokeStyle = '#333';
  ctx.lineWidth = 3;
  ctx.strokeText('Press Space or click to begin', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);
  ctx.fillStyle = '#fff';
  ctx.fillText('Press Space or click to begin', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);
}

// --- Rendering: GAME OVER screen ---
function drawGameOver() {
  // Spacious, rounded game-over panel
  const panelW = 460, panelH = 210;
  const panelX = (CANVAS_WIDTH - panelW) / 2;
  const panelY = (CANVAS_HEIGHT - panelH) / 2;
  ctx.fillStyle = 'rgba(20, 75, 145, 0.82)';
  ctx.strokeStyle = 'rgba(180, 225, 255, 0.9)';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.roundRect(panelX, panelY, panelW, panelH, 24);
  ctx.fill();
  ctx.stroke();

  ctx.textAlign = 'center';
  const cx = CANVAS_WIDTH / 2;

  // "GAME OVER" heading
  ctx.font = '40px "Isometra", serif';
  ctx.strokeStyle = '#000';
  ctx.lineWidth = 3;
  ctx.strokeText('GAME OVER', cx, panelY + 62);
  ctx.fillStyle = '#fff';
  ctx.fillText('GAME OVER', cx, panelY + 62);

  // Score
  ctx.font = '24px "Isometra", serif';
  ctx.strokeText(`Score: ${score}`, cx, panelY + 112);
  ctx.fillStyle = '#fff';
  ctx.fillText(`Score: ${score}`, cx, panelY + 112);

  // Restart prompt
  ctx.font = '16px "Isometra", serif';
  ctx.strokeText('Press Space or click to restart', cx, panelY + 162);
  ctx.fillStyle = '#fff';
  ctx.fillText('Press Space or click to restart', cx, panelY + 162);
}

// --- State machine: start and reset ---
function startGame() {
  gameState = 'PLAYING';
}

function resetGame() {
  wolf.y      = CANVAS_HEIGHT / 2;
  wolf.vy     = 0;
  wolf.jumpTimer = 0;
  towers.length  = 0;
  score       = 0;
  spawnTimer  = 0;
  wolfHit     = false;
  gameState   = 'READY';
}

// --- Input handling ---
function handleInput() {
  if (gameState === 'READY')          { startGame(); }
  else if (gameState === 'PLAYING')   { flap(); }
  else if (gameState === 'GAME_OVER') { resetGame(); }
}

document.addEventListener('keydown', (e) => {
  if (e.code === 'Space') {
    e.preventDefault(); // prevent page scrolling
    handleInput();
  }
});
canvas.addEventListener('click', handleInput);

// --- Game loop: update ---
function update() {
  if (gameState !== 'PLAYING') return;

  // Physics
  applyGravity();
  tickJumpTimer();

  // Tower spawn
  spawnTimer++;
  if (spawnTimer % SPAWN_INTERVAL === 0) {
    spawnTower();
  }

  // Tower movement and culling
  moveTowers();

  // Collision
  checkCollisions();

  // Scoring
  updateScore();
}

// --- Game loop: draw ---
function draw() {
  if (gameState === 'READY') {
    drawReady();
  } else if (gameState === 'PLAYING') {
    drawBackground();
    drawTowers();
    drawWolf();
    drawScore();
  } else if (gameState === 'GAME_OVER') {
    drawBackground();
    drawTowers();
    drawWolf();
    drawGameOver();
  }
}
// --- Game loop: main rAF loop ---
function gameLoop() {
  update();
  draw();
  requestAnimationFrame(gameLoop);
}

// --- Start ---
gameLoop();
