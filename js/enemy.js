/* =============================================
   enemy.js — Sistema de inimigos
   ============================================= */

/**
 * Tipos de inimigos com seus parâmetros base
 */
const ENEMY_TYPES = {
  drone: {
    name:   'DRONE',
    hp:     40,
    speed:  1.2,
    size:   20,
    color:  '#00f0ff',
    score:  50,
    minWave: 1,
    shape:  'drone',
  },
  robot: {
    name:   'ROBÔ',
    hp:     80,
    speed:  0.9,
    size:   28,
    color:  '#b200ff',
    score:  100,
    minWave: 2,
    shape:  'robot',
  },
  android: {
    name:   'ANDROID',
    hp:     60,
    speed:  2.0,
    size:   22,
    color:  '#ff00c8',
    score:  150,
    minWave: 3,
    shape:  'android',
  },
  tank: {
    name:   'TANQUE',
    hp:     300,
    speed:  0.5,
    size:   40,
    color:  '#ffea00',
    score:  300,
    minWave: 5,
    shape:  'tank',
  },
  elite: {
    name:   'ELITE',
    hp:     150,
    speed:  1.8,
    size:   30,
    color:  '#ff4444',
    score:  400,
    minWave: 7,
    shape:  'elite',
  },
};

/**
 * Configuração do Boss por horda
 */
const BOSS_CONFIG = {
  hp:       2000,
  speed:    0.7,
  size:     70,
  color:    '#ff00c8',
  score:    2000,
  shape:    'boss',
  name:     'OVERLORD',
};

/**
 * Classe base Enemy
 */
class Enemy {
  constructor(type, x, y, wave) {
    const def = type === 'boss' ? BOSS_CONFIG : ENEMY_TYPES[type];
    this.type     = type;
    this.name     = def.name || 'BOSS';
    this.x        = x;
    this.y        = y;
    this.size     = def.size;
    this.color    = def.color;
    this.score    = def.score;
    this.shape    = def.shape;

    // Escala por wave
    const scale   = 1 + (wave - 1) * 0.12;
    this.maxHp    = Math.floor(def.hp * scale);
    this.hp       = this.maxHp;
    this.speed    = def.speed * (1 + (wave - 1) * 0.06);

    // Estado
    this.alive    = true;
    this.hitFlash = 0;     // frames piscando ao ser atingido
    this.angle    = 0;     // ângulo de rotação visual
    this.vx       = 0;
    this.vy       = 0;

    // Padrão de movimento
    this.movePattern = type === 'android' ? 'zigzag' :
                       type === 'elite'   ? 'strafe'  : 'straight';
    this.zigzagTimer = 0;
    this.zigzagDir   = (Math.random() > 0.5) ? 1 : -1;

    // Para o boss: ataque especial
    this.isBoss         = type === 'boss';
    this.specialTimer   = 0;
    this.specialCooldown = 180; // frames
    this.phase          = 1;     // boss tem fases
  }

  /**
   * Move em direção ao alvo (centro da tela / posição do cursor)
   */
  moveToward(tx, ty, dt) {
    const dx  = tx - this.x;
    const dy  = ty - this.y;
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len === 0) return;
    const nx = dx / len;
    const ny = dy / len;

    switch (this.movePattern) {
      case 'zigzag':
        this.zigzagTimer++;
        if (this.zigzagTimer > 20) { this.zigzagDir *= -1; this.zigzagTimer = 0; }
        this.vx = nx * this.speed + (-ny * this.zigzagDir) * this.speed * 0.7;
        this.vy = ny * this.speed + (nx * this.zigzagDir)  * this.speed * 0.7;
        break;
      case 'strafe':
        // Orbita ao redor do alvo
        this.zigzagTimer++;
        const orbitAngle = Math.atan2(this.y - ty, this.x - tx) + 0.03;
        const orbitDist  = 120;
        const targetX    = tx + Math.cos(orbitAngle) * orbitDist;
        const targetY    = ty + Math.sin(orbitAngle) * orbitDist;
        const dx2 = targetX - this.x;
        const dy2 = targetY - this.y;
        const l2  = Math.sqrt(dx2 * dx2 + dy2 * dy2);
        this.vx   = (dx2 / l2) * this.speed * 1.5;
        this.vy   = (dy2 / l2) * this.speed * 1.5;
        break;
      default:
        this.vx = nx * this.speed;
        this.vy = ny * this.speed;
    }

    this.x += this.vx;
    this.y += this.vy;
    this.angle = Math.atan2(ny, nx);
  }

  /**
   * Atualiza estado
   * Retorna true se o inimigo colidiu com a área do jogador (dano)
   */
  update(cursor, W, H) {
    if (!this.alive) return false;
    if (this.hitFlash > 0) this.hitFlash--;

    // Boss: fases
    if (this.isBoss && this.hp < this.maxHp * 0.5 && this.phase === 1) {
      this.phase = 2;
      this.speed *= 1.5;
      this.color = '#ff4444';
    }

    this.moveToward(cursor.x, cursor.y, 1);

    // Colisão com jogador
    const d = dist(this.x, this.y, cursor.x, cursor.y);
    if (d < this.size + 8) {
      return true; // dano ao jogador
    }
    return false;
  }

  takeDamage(dmg) {
    this.hp -= dmg;
    this.hitFlash = 6;
    if (this.hp <= 0) {
      this.alive = false;
      AudioEngine.enemy_die();
    }
    AudioEngine.hit();
  }

  /**
   * Renderização vetorial por tipo
   */
  draw(ctx) {
    if (!this.alive) return;

    ctx.save();
    ctx.translate(this.x, this.y);

    const flash  = this.hitFlash > 0 && this.hitFlash % 2 === 0;
    const color  = flash ? '#ffffff' : this.color;
    const alpha  = this.isBoss && this.phase === 2 ? (0.7 + 0.3 * Math.sin(Date.now() * 0.02)) : 1;
    ctx.globalAlpha = alpha;

    ctx.shadowColor = color;
    ctx.shadowBlur  = 15;

    switch (this.shape) {
      case 'drone':    this._drawDrone(ctx, color);   break;
      case 'robot':    this._drawRobot(ctx, color);   break;
      case 'android':  this._drawAndroid(ctx, color); break;
      case 'tank':     this._drawTank(ctx, color);    break;
      case 'elite':    this._drawElite(ctx, color);   break;
      case 'boss':     this._drawBoss(ctx, color);    break;
      default:         this._drawDrone(ctx, color);
    }

    ctx.restore();

    // Barra de HP
    this._drawHpBar(ctx);
  }

  _drawHpBar(ctx) {
    const w = this.size * 2;
    const x = this.x - this.size;
    const y = this.y - this.size - 10;
    ctx.save();
    ctx.fillStyle   = 'rgba(0,0,0,0.6)';
    ctx.fillRect(x, y, w, 5);
    const pct = this.hp / this.maxHp;
    const hpColor = pct > 0.5 ? '#00ff88' : pct > 0.25 ? '#ffea00' : '#ff2244';
    ctx.fillStyle   = hpColor;
    ctx.shadowColor = hpColor;
    ctx.shadowBlur  = 4;
    ctx.fillRect(x, y, w * pct, 5);
    ctx.restore();
  }

  _drawDrone(ctx, c) {
    ctx.rotate(Date.now() * 0.002);
    // Corpo central
    ctx.strokeStyle = c; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(0, 0, this.size * 0.4, 0, Math.PI * 2); ctx.stroke();
    // 4 braços
    for (let i = 0; i < 4; i++) {
      ctx.save(); ctx.rotate(i * Math.PI / 2);
      ctx.strokeStyle = c;
      ctx.beginPath(); ctx.moveTo(this.size * 0.4, 0); ctx.lineTo(this.size * 0.9, 0); ctx.stroke();
      ctx.fillStyle = c; ctx.beginPath(); ctx.arc(this.size * 0.95, 0, 4, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
  }

  _drawRobot(ctx, c) {
    ctx.strokeStyle = c; ctx.lineWidth = 2;
    // Torso
    const s = this.size * 0.6;
    ctx.strokeRect(-s * 0.5, -s * 0.6, s, s * 1.2);
    // Cabeça
    ctx.strokeRect(-s * 0.3, -s * 1.1, s * 0.6, s * 0.5);
    // Olhos
    ctx.fillStyle = c;
    ctx.fillRect(-s * 0.18, -s * 0.98, s * 0.12, s * 0.12);
    ctx.fillRect(s * 0.06, -s * 0.98, s * 0.12, s * 0.12);
    // Braços
    ctx.beginPath(); ctx.moveTo(-s * 0.5, -s * 0.4); ctx.lineTo(-s * 0.9, s * 0.1); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(s * 0.5,  -s * 0.4); ctx.lineTo(s * 0.9,  s * 0.1); ctx.stroke();
  }

  _drawAndroid(ctx, c) {
    ctx.rotate(this.angle + Math.PI / 2);
    ctx.strokeStyle = c; ctx.lineWidth = 2;
    // Triângulo apontado
    ctx.beginPath();
    ctx.moveTo(0, -this.size);
    ctx.lineTo(-this.size * 0.6, this.size * 0.5);
    ctx.lineTo(this.size * 0.6, this.size * 0.5);
    ctx.closePath(); ctx.stroke();
    // Core
    ctx.fillStyle = c; ctx.globalAlpha *= 0.4;
    ctx.fill();
    ctx.globalAlpha /= 0.4;
    // Ponto central
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(0, 0, 4, 0, Math.PI * 2); ctx.fill();
  }

  _drawTank(ctx, c) {
    ctx.strokeStyle = c; ctx.lineWidth = 3;
    const s = this.size;
    // Corpo
    ctx.strokeRect(-s * 0.7, -s * 0.4, s * 1.4, s * 0.8);
    // Torre
    ctx.strokeRect(-s * 0.3, -s * 0.35, s * 0.6, s * 0.5);
    // Canhão
    ctx.rotate(this.angle);
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(s * 0.9, 0); ctx.stroke();
    // Rodas
    ctx.rotate(-this.angle);
    for (let i = -1; i <= 1; i++) {
      ctx.beginPath(); ctx.arc(i * s * 0.4, s * 0.55, s * 0.18, 0, Math.PI * 2); ctx.stroke();
    }
  }

  _drawElite(ctx, c) {
    ctx.rotate(Date.now() * -0.003);
    const s = this.size;
    // Hexágono
    ctx.strokeStyle = c; ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      i === 0 ? ctx.moveTo(Math.cos(a)*s, Math.sin(a)*s)
              : ctx.lineTo(Math.cos(a)*s, Math.sin(a)*s);
    }
    ctx.closePath(); ctx.stroke();
    // Inner cross
    ctx.rotate(Date.now() * 0.006);
    ctx.beginPath(); ctx.moveTo(-s*0.5, 0); ctx.lineTo(s*0.5, 0); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, -s*0.5); ctx.lineTo(0,  s*0.5); ctx.stroke();
  }

  _drawBoss(ctx, c) {
    const s = this.size;
    const t = Date.now() * 0.001;
    // Múltiplos anéis pulsantes
    for (let r = 0; r < 3; r++) {
      const rScale = 0.5 + r * 0.25 + Math.sin(t + r) * 0.05;
      ctx.strokeStyle = r === 0 ? '#ff00c8' : r === 1 ? '#b200ff' : '#00f0ff';
      ctx.lineWidth   = 3 - r;
      ctx.shadowColor = ctx.strokeStyle;
      ctx.shadowBlur  = 20;
      ctx.beginPath(); ctx.arc(0, 0, s * rScale, 0, Math.PI * 2); ctx.stroke();
    }
    // Núcleo
    ctx.fillStyle = '#ffffff';
    ctx.shadowBlur = 30;
    ctx.beginPath(); ctx.arc(0, 0, s * 0.2, 0, Math.PI * 2); ctx.fill();
    // Braços rotativos
    ctx.rotate(t * 2);
    for (let arm = 0; arm < 4; arm++) {
      ctx.save(); ctx.rotate(arm * Math.PI / 2);
      ctx.strokeStyle = '#ff00c8'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(s * 0.25, 0); ctx.lineTo(s * 0.85, 0); ctx.stroke();
      ctx.fillStyle = '#ff00c8';
      ctx.beginPath(); ctx.arc(s * 0.85, 0, 8, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
    // Label BOSS
    ctx.rotate(-t * 2);
    ctx.fillStyle   = '#ffffff';
    ctx.font        = `bold ${s * 0.25}px Orbitron, monospace`;
    ctx.textAlign   = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowBlur  = 10;
    ctx.fillText('BOSS', 0, 0);
  }
}

/**
 * Gerenciador de spawn de hordas
 */
class WaveManager {
  constructor() {
    this.wave       = 0;
    this.enemies    = [];
    this.spawnQueue = [];
    this.spawnTimer = 0;
    this.spawnDelay = 60; // frames
    this.active     = false;
  }

  /**
   * Inicia nova horda
   */
  startWave(wave, W, H) {
    this.wave    = wave;
    this.active  = true;
    this.enemies = [];

    const isBossWave = wave % 5 === 0;
    this.spawnQueue  = isBossWave
      ? this._buildBossWave(wave)
      : this._buildNormalWave(wave);

    this.spawnDelay = Math.max(20, 60 - wave * 3);
    this.spawnTimer = 0;
  }

  _buildNormalWave(wave) {
    const count = 5 + wave * 2;
    const queue = [];
    const availableTypes = Object.keys(ENEMY_TYPES).filter(k => ENEMY_TYPES[k].minWave <= wave);
    for (let i = 0; i < count; i++) {
      queue.push(availableTypes[randInt(0, availableTypes.length - 1)]);
    }
    return queue;
  }

  _buildBossWave(wave) {
    const escort = Math.floor(wave / 5) * 3;
    const queue  = ['boss'];
    for (let i = 0; i < escort; i++) queue.push('drone');
    return queue;
  }

  /**
   * Atualiza spawn e inimigos, retorna dano causado ao jogador
   */
  update(cursor, W, H) {
    let dmgToPlayer = 0;
    this.killedThisFrame = [];

    // Spawn
    if (this.spawnQueue.length > 0) {
      this.spawnTimer++;
      if (this.spawnTimer >= this.spawnDelay) {
        this.spawnTimer = 0;
        const type = this.spawnQueue.shift();
        this.enemies.push(this._spawnEnemy(type, W, H));
      }
    }

    // Update inimigos
    for (const e of this.enemies) {
      if (!e.alive) continue;
      const hit = e.update(cursor, W, H);
      if (hit) {
        const dmg = e.isBoss ? 25 : 10;
        dmgToPlayer += dmg;
        // Empurra o inimigo pra longe
        const a = Math.atan2(e.y - cursor.y, e.x - cursor.x);
        e.x += Math.cos(a) * (e.size + 20);
        e.y += Math.sin(a) * (e.size + 20);
      }
    }

    // Detecta mortos antes de remover
    for (const e of this.enemies) {
      if (!e.alive) this.killedThisFrame.push(e);
    }

    // Remove mortos
    this.enemies = this.enemies.filter(e => e.alive);

    return dmgToPlayer;
  }

  _spawnEnemy(type, W, H) {
    // Spawn nas bordas
    const side = randInt(0, 3);
    let x, y;
    const margin = 60;
    switch (side) {
      case 0: x = rand(0, W);        y = -margin;    break;
      case 1: x = W + margin;        y = rand(0, H); break;
      case 2: x = rand(0, W);        y = H + margin; break;
      case 3: x = -margin;           y = rand(0, H); break;
    }
    return new Enemy(type, x, y, this.wave);
  }

  get isWaveComplete() {
    return this.spawnQueue.length === 0 && this.enemies.length === 0;
  }

  get enemyCount() {
    return this.enemies.length + this.spawnQueue.length;
  }

  drawAll(ctx, W, H) {
    for (const e of this.enemies) e.draw(ctx);
  }
}
