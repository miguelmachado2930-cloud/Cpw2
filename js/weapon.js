/* =============================================
   weapon.js — Sistema de armas
   ============================================= */

/**
 * Classe Projétil
 */
class Bullet {
  constructor(x, y, dx, dy, damage, color, size, piercing = false, explosive = false) {
    this.x         = x;
    this.y         = y;
    this.dx        = dx;
    this.dy        = dy;
    this.damage    = damage;
    this.color     = color;
    this.size      = size;
    this.piercing  = piercing;   // atravessa inimigos
    this.explosive = explosive;  // explode ao acertar
    this.alive     = true;
    this.trail     = [];         // rastro visual
    this.bounces   = 0;         // ricochetes restantes
    this.maxBounce = 0;
  }

  update(W, H) {
    // Guarda rastro
    this.trail.push({ x: this.x, y: this.y });
    if (this.trail.length > 8) this.trail.shift();

    this.x += this.dx;
    this.y += this.dy;

    // Ricochete nas bordas
    if (this.bounces > 0) {
      if (this.x < 0 || this.x > W) { this.dx *= -1; this.bounces--; }
      if (this.y < 0 || this.y > H) { this.dy *= -1; this.bounces--; }
    } else {
      if (this.x < -20 || this.x > W + 20 || this.y < -20 || this.y > H + 20) {
        this.alive = false;
      }
    }
  }

  draw(ctx) {
    if (!this.alive) return;

    // Rastro
    if (this.trail.length > 1) {
      ctx.save();
      for (let i = 1; i < this.trail.length; i++) {
        const a = i / this.trail.length * 0.6;
        ctx.globalAlpha = a;
        ctx.strokeStyle = this.color;
        ctx.lineWidth   = this.size * (i / this.trail.length);
        ctx.beginPath();
        ctx.moveTo(this.trail[i - 1].x, this.trail[i - 1].y);
        ctx.lineTo(this.trail[i].x, this.trail[i].y);
        ctx.stroke();
      }
      ctx.restore();
    }

    // Projétil
    ctx.save();
    ctx.globalAlpha = 1;
    ctx.shadowColor = this.color;
    ctx.shadowBlur  = this.size * 3;
    ctx.fillStyle   = '#ffffff';
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size * 0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

/**
 * Linha do laser
 */
class LaserBeam {
  constructor(x, y, angle, damage) {
    this.x       = x;
    this.y       = y;
    this.angle   = angle;
    this.damage  = damage;
    this.alive   = true;
    this.life    = 0;
    this.maxLife = 12; // frames
    this.color   = '#00f0ff';
    this.piercing = true;
  }

  update() {
    this.life++;
    if (this.life >= this.maxLife) this.alive = false;
  }

  draw(ctx, W, H) {
    if (!this.alive) return;
    const endX = this.x + Math.cos(this.angle) * Math.max(W, H) * 2;
    const endY = this.y + Math.sin(this.angle) * Math.max(W, H) * 2;
    const alpha = 1 - this.life / this.maxLife;

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = this.color;
    ctx.lineWidth   = 3;
    ctx.shadowColor = this.color;
    ctx.shadowBlur  = 20;
    ctx.beginPath();
    ctx.moveTo(this.x, this.y);
    ctx.lineTo(endX, endY);
    ctx.stroke();
    // Núcleo branco
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth   = 1;
    ctx.shadowBlur  = 5;
    ctx.beginPath();
    ctx.moveTo(this.x, this.y);
    ctx.lineTo(endX, endY);
    ctx.stroke();
    ctx.restore();
  }

  /**
   * Verifica se uma posição está na linha do laser
   */
  intersectsPoint(px, py, radius) {
    if (!this.alive) return false;
    // Projeto ponto na linha
    const dx = Math.cos(this.angle);
    const dy = Math.sin(this.angle);
    const t  = (px - this.x) * dx + (py - this.y) * dy;
    if (t < 0) return false;
    const cx = this.x + dx * t;
    const cy = this.y + dy * t;
    return dist(px, py, cx, cy) <= radius + 2;
  }
}

/**
 * Definições de todas as armas
 */
const WEAPON_DEFS = [
  {
    id:          'pistol',
    name:        'PISTOLA',
    damage:      25,
    fireRate:    300,   // ms entre tiros
    ammo:        -1,    // -1 = infinito
    maxAmmo:     -1,
    reloadTime:  0,
    bulletSpeed: 14,
    bulletSize:  4,
    bulletColor: '#00f0ff',
    spread:      0,
    bulletsPerShot: 1,
    type:        'bullet',
    sound:       'shoot_pistol',
  },
  {
    id:          'smg',
    name:        'SMG',
    damage:      12,
    fireRate:    80,
    ammo:        40,
    maxAmmo:     40,
    reloadTime:  1800,
    bulletSpeed: 16,
    bulletSize:  3,
    bulletColor: '#ff00c8',
    spread:      0.12,
    bulletsPerShot: 1,
    type:        'bullet',
    sound:       'shoot_smg',
  },
  {
    id:          'shotgun',
    name:        'SHOTGUN',
    damage:      18,
    fireRate:    700,
    ammo:        8,
    maxAmmo:     8,
    reloadTime:  2200,
    bulletSpeed: 12,
    bulletSize:  3,
    bulletColor: '#ffea00',
    spread:      0.35,
    bulletsPerShot: 6,
    type:        'bullet',
    sound:       'shoot_shotgun',
  },
  {
    id:          'rifle',
    name:        'RIFLE',
    damage:      80,
    fireRate:    1200,
    ammo:        10,
    maxAmmo:     10,
    reloadTime:  2500,
    bulletSpeed: 22,
    bulletSize:  5,
    bulletColor: '#b200ff',
    spread:      0.01,
    bulletsPerShot: 1,
    type:        'bullet',
    sound:       'shoot_rifle',
  },
  {
    id:          'laser',
    name:        'LASER',
    damage:      40,
    fireRate:    200,
    ammo:        -1,
    maxAmmo:     -1,
    reloadTime:  0,
    bulletSpeed: 0,
    bulletSize:  0,
    bulletColor: '#00f0ff',
    spread:      0,
    bulletsPerShot: 1,
    type:        'laser',
    sound:       'shoot_laser',
  },
  {
    id:          'railgun',
    name:        'RAILGUN',
    damage:      200,
    fireRate:    2500,
    ammo:        3,
    maxAmmo:     3,
    reloadTime:  4000,
    bulletSpeed: 30,
    bulletSize:  7,
    bulletColor: '#ff00c8',
    spread:      0,
    bulletsPerShot: 1,
    type:        'bullet',
    piercing:    true,
    sound:       'shoot_railgun',
  },
];

/**
 * Instância de arma em jogo (baseada na definição + upgrades do player)
 */
class WeaponInstance {
  constructor(def) {
    this.def       = { ...def };
    this.ammo      = def.ammo;
    this.lastShot  = 0;
    this.reloading = false;
    this.reloadEnd = 0;
  }

  canFire(now, playerUpgrades) {
    if (this.reloading && now >= this.reloadEnd) this.finishReload();
    if (this.reloading) return false;
    if (this.def.ammo !== -1 && this.ammo <= 0) {
      this.startReload(now);
      return false;
    }
    const rate = this.def.fireRate * (playerUpgrades.fireRateMult || 1);
    return now - this.lastShot >= rate;
  }

  startReload(now) {
    if (this.reloading || this.def.reloadTime === 0) return;
    this.reloading = true;
    this.reloadEnd = now + this.def.reloadTime;
    AudioEngine.reload();
  }

  finishReload() {
    this.reloading = false;
    this.ammo      = this.def.maxAmmo;
  }

  /**
   * Dispara e retorna array de projéteis ou LaserBeam
   */
  fire(x, y, angle, now, playerUpgrades) {
    if (!this.canFire(now, playerUpgrades)) return [];
    this.lastShot = now;
    if (this.def.ammo !== -1) this.ammo--;

    AudioEngine[this.def.sound]?.();

    const results = [];
    const dmgMult = playerUpgrades.damageMult  || 1;
    const critChance = playerUpgrades.critChance || 0;
    const isCrit     = Math.random() < critChance;
    let   dmg        = this.def.damage * dmgMult * (isCrit ? 2 : 1);
    const extras     = playerUpgrades.extraBullets || 0;
    const bounceMax  = playerUpgrades.bounceCount  || 0;

    if (this.def.type === 'laser') {
      const beam = new LaserBeam(x, y, angle, dmg);
      beam.piercing = true;
      results.push(beam);
      return results;
    }

    const count = this.def.bulletsPerShot + extras;
    for (let i = 0; i < count; i++) {
      const spread = (Math.random() - 0.5) * this.def.spread;
      const a = angle + spread;
      const b = new Bullet(
        x, y,
        Math.cos(a) * this.def.bulletSpeed,
        Math.sin(a) * this.def.bulletSpeed,
        dmg,
        this.def.bulletColor,
        this.def.bulletSize,
        this.def.piercing || playerUpgrades.piercing || false,
        playerUpgrades.explosive || false
      );
      b.maxBounce = bounceMax;
      b.bounces   = bounceMax;
      results.push(b);
    }
    return results;
  }

  get reloadProgress() {
    if (!this.reloading) return 1;
    const now = performance.now();
    return clamp((now - (this.reloadEnd - this.def.reloadTime)) / this.def.reloadTime, 0, 1);
  }
}
