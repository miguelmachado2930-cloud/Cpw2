/* =============================================
   game.js — Game loop principal e controlador
   ============================================= */

/**
 * Estado global do jogo
 */
const GameState = {
  INTRO:    'intro',
  PLAYING:  'playing',
  UPGRADE:  'upgrade',
  PAUSED:   'paused',
  GAMEOVER: 'gameover',
};

const Game = (() => {
  let canvas, ctx;
  let W, H;

  // Objetos principais
  let player;
  let waveManager;

  // Estado
  let state       = GameState.INTRO;
  let wave        = 0;
  let frameCount  = 0;
  let rafId       = null;
  let mouseDown   = false;

  // Posição da mira
  const cursor = { x: 0, y: 0 };

  // ─── INICIALIZAÇÃO ─────────────────────────────────────────

  function init() {
    canvas = document.getElementById('gameCanvas');
    ctx    = canvas.getContext('2d');

    resize();
    window.addEventListener('resize', resize);

    // Input
    canvas.addEventListener('mousemove', onMouseMove);
    canvas.addEventListener('mousedown', onMouseDown);
    canvas.addEventListener('mouseup',   () => { mouseDown = false; });
    document.addEventListener('keydown', onKeyDown);

    // Toque (mobile)
    canvas.addEventListener('touchmove',  onTouch, { passive: false });
    canvas.addEventListener('touchstart', onTouch, { passive: false });

    // Cursor custom
    UI.initCursor();

    // Inicia loop de render (idle — só a tela intro)
    loop();
  }

  function resize() {
    W = canvas.width  = window.innerWidth;
    H = canvas.height = window.innerHeight;
  }

  // ─── INPUT ─────────────────────────────────────────────────

  function onMouseMove(e) {
    cursor.x = e.clientX;
    cursor.y = e.clientY;
    if (mouseDown && state === GameState.PLAYING) fireWeapon();
  }

  function onMouseDown(e) {
    if (e.button !== 0) return;
    AudioEngine.init();
    AudioEngine.resume();
    mouseDown = true;
    if (state === GameState.PLAYING) fireWeapon();
  }

  function onTouch(e) {
    e.preventDefault();
    const t = e.touches[0];
    cursor.x = t.clientX;
    cursor.y = t.clientY;
    AudioEngine.init();
    AudioEngine.resume();
    if (state === GameState.PLAYING) fireWeapon();
  }

  function onKeyDown(e) {
    if (state === GameState.PLAYING) {
      // Teclas 1-6: troca arma
      if (e.key >= '1' && e.key <= '6') {
        player.switchWeapon(parseInt(e.key) - 1);
      }
      // R: recarregar
      if (e.key === 'r' || e.key === 'R') {
        player.weapon.startReload(performance.now());
      }
      // ESC: pausar
      if (e.key === 'Escape') {
        pauseGame();
        return;
      }
    } else if (state === GameState.PAUSED) {
      if (e.key === 'Escape') resumeGame();
    }
  }

  function fireWeapon() {
    // Tiro sai do cursor apontando para o inimigo mais próximo,
    // ou em direção oposta ao centro (efeito Duck Hunt)
    const cx = W / 2, cy = H / 2;
    // Angulo: do centro da tela → cursor (duck hunt: o alvo se move, vc mira)
    const fireAngle = angleBetween(cx, cy, cursor.x, cursor.y);
    player.shoot(cursor.x, cursor.y, fireAngle);
  }

  // ─── GAME FLOW ──────────────────────────────────────────────

  function startGame() {
    AudioEngine.init();
    player      = new Player();
    waveManager = new WaveManager();
    wave        = 0;
    frameCount  = 0;
    state       = GameState.PLAYING;

    UI.showScreen('game');
    player.refreshShield();
    nextWave();
  }

  function nextWave() {
    wave++;
    waveManager.startWave(wave, W, H);
    const isBoss = wave % 5 === 0;
    UI.announceWave(wave, isBoss);
    if (isBoss) AudioEngine.boss_appear();
    else        AudioEngine.level_up();
    state = GameState.PLAYING;
  }

  function waveComplete() {
    AudioEngine.wave_complete();

    // Preparar upgrades
    const options = rollUpgrades(wave, player.pickedUpgradeIds);

    state = GameState.UPGRADE;
    UI.showUpgradeScreen(options, (chosen) => {
      player.applyUpgrade(chosen);
      player.refreshShield();
      player.bullets = [];
      UI.showScreen('game');
      nextWave();
    });
  }

  function pauseGame() {
    if (state !== GameState.PLAYING) return;
    state = GameState.PAUSED;
    UI.showScreen('pause');
  }

  function resumeGame() {
    if (state !== GameState.PAUSED) return;
    state = GameState.PLAYING;
    UI.showScreen('game');
  }

  function gameOver() {
    state = GameState.GAMEOVER;
    AudioEngine.explode();
    setTimeout(() => {
      UI.showGameOver(player, wave);
    }, 500);
  }

  // ─── BACKGROUND ─────────────────────────────────────────────

  function drawBackground() {
    // Fundo escuro com grade cyberpunk
    ctx.fillStyle = '#050510';
    ctx.fillRect(0, 0, W, H);

    // Grade
    const gridSize = 60;
    const t = frameCount * 0.3;
    ctx.save();
    ctx.strokeStyle = 'rgba(0,240,255,0.04)';
    ctx.lineWidth   = 1;

    // Linhas horizontais com parallax
    const offsetY = (t % gridSize);
    for (let y = -gridSize + offsetY; y < H + gridSize; y += gridSize) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
    }
    // Linhas verticais
    for (let x = 0; x < W; x += gridSize) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
    }

    // Gradiente radial central (profundidade)
    const grad = ctx.createRadialGradient(W/2, H/2, 0, W/2, H/2, Math.max(W,H)*0.7);
    grad.addColorStop(0,   'rgba(10,0,30,0)');
    grad.addColorStop(1,   'rgba(0,0,10,0.6)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    ctx.restore();
  }

  // ─── MIRA / CROSSHAIR ────────────────────────────────────────

  function drawCrosshair() {
    const x = cursor.x, y = cursor.y;
    const r = 18, gap = 5, len = 8;
    const color = '#00f0ff';

    ctx.save();
    ctx.strokeStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur  = 10;
    ctx.lineWidth   = 1.5;

    // Círculo
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.stroke();
    // Cruz
    ctx.beginPath();
    ctx.moveTo(x, y - r - gap);     ctx.lineTo(x, y - r - gap - len);
    ctx.moveTo(x, y + r + gap);     ctx.lineTo(x, y + r + gap + len);
    ctx.moveTo(x - r - gap, y);     ctx.lineTo(x - r - gap - len, y);
    ctx.moveTo(x + r + gap, y);     ctx.lineTo(x + r + gap + len, y);
    ctx.stroke();
    // Ponto central
    ctx.fillStyle  = color;
    ctx.shadowBlur = 5;
    ctx.beginPath(); ctx.arc(x, y, 2, 0, Math.PI * 2); ctx.fill();

    ctx.restore();
  }

  // ─── LOOP PRINCIPAL ──────────────────────────────────────────

  function loop() {
    rafId = requestAnimationFrame(loop);
    frameCount++;

    if (state !== GameState.PLAYING) return;

    // ── Atualização ──
    const dmgToPlayer = waveManager.update(cursor, W, H);

    // Dano ao jogador por contato
    if (dmgToPlayer > 0) {
      const dead = player.takeDamage(dmgToPlayer);
      if (dead) { gameOver(); return; }
    }

    // Registrar kills (inimigos mortos por balas neste frame)
    player.update(cursor, waveManager.enemies, W, H);

    // (old killedThisFrame loop removed — kills handled below)

    // HUD wave
    UI.updateWaveHUD(wave, waveManager.enemyCount);

    // Wave completa?
    if (waveManager.isWaveComplete) {
      waveComplete();
      return;
    }

    // ── Renderização ──
    ctx.clearRect(0, 0, W, H);
    drawBackground();

    waveManager.drawAll(ctx, W, H);
    player.drawBullets(ctx, W, H);
    player.drawParticles(ctx);
    player.drawScreenFlash(ctx, W, H);
    drawCrosshair();
  }

  // Exposição pública
  return { init, startGame, pauseGame, resumeGame };
})();

/**
 * Controller global (chamado pelo HTML)
 */
const GameController = {
  startGame()   { Game.startGame(); },
  resumeGame()  { Game.resumeGame(); },
  pauseGame()   { Game.pauseGame(); },
  showIntro()   { UI.showScreen('intro'); },
  showRanking() { RankingManager.render(); UI.showScreen('ranking'); },
  showHowToPlay(){ UI.showScreen('howto'); },
};

// ─── BOOTSTRAP ────────────────────────────────────────────────

// Kill tracking is handled in the game loop via waveManager.killedThisFrame

window.addEventListener('DOMContentLoaded', () => {
  Game.init();
});
