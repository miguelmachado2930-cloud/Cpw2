/* =============================================
   player.js — Estado do jogador e projéteis
   ============================================= */

/**
 * Sistema de partículas
 */
class ParticleSystem {
  constructor() {
    this.particles = [];
  }

  /**
   * Emite n partículas em x,y com parâmetros
   */
  emit(x, y, { n = 8, speed = 4, size = 3, life = 30, color = '#00f0ff',
               spread = Math.PI * 2, angle = 0, gravity = 0 } = {}) {
    for (let i = 0; i < n; i++) {
      const a = angle + (Math.random() - 0.5) * spread;
      const s = rand(speed * 0.4, speed);
      this.particles.push({
        x, y,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s,
        size: rand(size * 0.5, size),
        life,
        maxLife: life,
        color,
        gravity,
        alive: true,
      });
    }
  }

  /**
   * Emite número flutuante de dano
   */
  emitText(x, y, text, color = '#ff4444') {
    this.particles.push({
      x, y: y - 10,
      vx: rand(-0.5, 0.5),
      vy: -1.5,
      isText: true,
      text,
      color,
      life: 50,
      maxLife: 50,
      size: 14,
      alive: true,
      gravity: 0,
    });
  }

  update() {
    for (const p of this.particles) {
      if (!p.alive) continue;
      p.x  += p.vx;
      p.y  += p.vy;
      p.vy += p.gravity;
      p.vx *= 0.95;
      p.vy *= 0.95;
      p.life--;
      if (p.life <= 0) p.alive = false;
    }
    this.particles = this.particles.filter(p => p.alive);
  }

  draw(ctx) {
    for (const p of this.particles) {
      if (!p.alive) continue;
      const alpha = p.life / p.maxLife;
      ctx.save();
      ctx.globalAlpha = alpha;

      if (p.isText) {
        ctx.fillStyle    = p.color;
        ctx.font         = `bold ${p.size}px Orbitron, monospace`;
        ctx.textAlign    = 'center';
        ctx.shadowColor  = p.color;
        ctx.shadowBlur   = 8;
        ctx.fillText(p.text, p.x, p.y);
      } else {
        ctx.shadowColor  = p.color;
        ctx.shadowBlur   = p.size * 2;
        ctx.fillStyle    = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * alpha, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    }
  }
}

/**
 * Drone auxiliar — orbita o cursor e atira inimigos próximos
 */
class Drone {
  constructor(index) {
    this.index    = index;
    this.x        = 0;
    this.y        = 0;
    this.angle    = (index / 3) * Math.PI * 2;
    this.orbitR   = 80 + index * 20;
    this.fireTimer= 0;
    this.fireCd   = 90; // frames
  }

  update(cx, cy, enemies, bullets, upgrades) {
    this.angle += 0.04;
    this.x = cx + Math.cos(this.angle) * this.orbitR;
    this.y = cy + Math.sin(this.angle) * this.orbitR;

    // Atira no inimigo mais próximo
    this.fireTimer++;
    if (this.fireTimer >= this.fireCd) {
      this.fireTimer = 0;
      let nearest = null; let nearDist = Infinity;
      for (const e of enemies) {
        const d = dist(this.x, this.y, e.x, e.y);
        if (d < nearDist) { nearDist = d; nearest = e; }
      }
      if (nearest) {
        const a = angleBetween(this.x, this.y, nearest.x, nearest.y);
        const dmg = 20 * (upgrades.damageMult || 1);
        bullets.push(new Bullet(this.x, this.y, Math.cos(a)*10, Math.sin(a)*10, dmg, '#00ff88', 3));
      }
    }
  }

  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(Date.now() * 0.005);
    ctx.strokeStyle = '#00ff88';
    ctx.shadowColor = '#00ff88';
    ctx.shadowBlur  = 10;
    ctx.lineWidth   = 1.5;
    ctx.strokeRect(-8, -8, 16, 16);
    ctx.beginPath();
    ctx.arc(0, 0, 4, 0, Math.PI * 2);
    ctx.fillStyle = '#00ff88';
    ctx.fill();
    ctx.restore();
  }
}

/**
 * Estado completo do jogador
 */
class Player {
  constructor() {
    this.reset();
  }

  reset() {
    this.maxHp    = 100;
    this.hp       = 100;
    this.score    = 0;
    this.kills    = 0;
    this.combo    = 1;
    this.maxCombo = 1;
    this.comboTimer = 0;
    this.comboMax   = 120; // frames para zerar combo

    // Upgrades acumulados
    this.upgrades = {
      damageMult:     1,
      fireRateMult:   1,
      critChance:     0,
      bounceCount:    0,
      piercing:       false,
      explosive:      false,
      lifeSteal:      0,
      droneCount:     0,
      extraBullets:   0,
      electricDamage: 0,
      comboDamage:    false,
      hpBonus:        0,
      shield:         0,
      bulletSpeedMult:1,
    };

    // IDs dos upgrades escolhidos
    this.pickedUpgradeIds = [];

    // Armas
    this.weapons       = WEAPON_DEFS.map(d => new WeaponInstance(d));
    this.currentWeapon = 0;

    // Projéteis e drones
    this.bullets = [];
    this.drones  = [];

    // Efeitos visuais
    this.particles   = new ParticleSystem();
    this.screenFlash = 0;

    // Hit flash para input feedback
    this.hitFlash = 0;
  }

  get weapon() { return this.weapons[this.currentWeapon]; }

  switchWeapon(idx) {
    if (idx < 0 || idx >= this.weapons.length) return;
    this.currentWeapon = idx;
    UI.updateWeaponBar(idx);
  }

  /**
   * Aplica upgrade escolhido
   */
  applyUpgrade(upgrade) {
    upgrade.apply(this.upgrades);
    this.pickedUpgradeIds.push(upgrade.id);

    // HP bônus: aumenta máximo e cura
    if (upgrade.id === 'maxhp') {
      this.maxHp += 30;
      this.hp     = this.maxHp;
    }

    // Novos drones
    while (this.drones.length < (this.upgrades.droneCount || 0)) {
      this.drones.push(new Drone(this.drones.length));
    }

    AudioEngine.upgrade_pick();
    UI.renderActiveUpgrades(this.pickedUpgradeIds);
  }

  /**
   * Prepara upgrades de escudo pós-horda
   */
  refreshShield() {
    // shield é consumido por hit; reabastecer a cada horda
    this.shieldCurrent = this.upgrades.shield || 0;
  }

  /**
   * Recebe dano — retorna true se morreu
   */
  takeDamage(dmg) {
    // Escudo absorve
    if (this.shieldCurrent > 0) {
      this.shieldCurrent--;
      this.screenFlash = 5;
      return false;
    }
    this.hp -= dmg;
    this.hitFlash   = 10;
    this.screenFlash = 8;
    this.combo = 1;
    this.comboTimer = 0;
    AudioEngine.player_hurt();
    if (this.hp <= 0) { this.hp = 0; return true; }
    return false;
  }

  /**
   * Registra kill
   */
  onKill(enemy) {
    this.kills++;
    this.comboTimer = this.comboMax;
    this.combo = Math.min(this.combo + 1, 10);
    if (this.combo > this.maxCombo) this.maxCombo = this.combo;

    // Lifesteal
    if (this.upgrades.lifeSteal > 0) {
      this.hp = Math.min(this.maxHp, this.hp + this.upgrades.lifeSteal);
    }

    // Score com combo
    const comboBonus = this.upgrades.comboDamage ? this.combo : 1;
    const gained = Math.floor(enemy.score * comboBonus);
    this.score += gained;
    return gained;
  }

  /**
   * Atira a partir do ponto x,y em direção a angle
   */
  shoot(x, y, angle) {
    const now  = performance.now();
    const ups  = { ...this.upgrades };

    // Velocidade de bala multiplicada
    const speedMult = this.upgrades.bulletSpeedMult || 1;

    const newBullets = this.weapon.fire(x, y, angle, now, ups);
    for (const b of newBullets) {
      if (b instanceof Bullet) {
        b.dx *= speedMult;
        b.dy *= speedMult;
      }
      this.bullets.push(b);
    }

    // Flash de tiro
    this.particles.emit(x, y, { n:6, speed:3, size:3, life:12,
      color: this.weapon.def.bulletColor, spread: 0.8, angle });
  }

  /**
   * Atualiza projéteis e colisões com inimigos
   */
  update(cursor, enemies, W, H) {
    // Combo timer
    if (this.comboTimer > 0) {
      this.comboTimer--;
      if (this.comboTimer === 0) this.combo = 1;
    }

    if (this.hitFlash   > 0) this.hitFlash--;
    if (this.screenFlash > 0) this.screenFlash--;

    // Partículas
    this.particles.update();

    // Drones
    for (const dr of this.drones) {
      dr.update(cursor.x, cursor.y, enemies, this.bullets, this.upgrades);
    }

    // Projéteis
    const toRemove = new Set();
    for (let bi = 0; bi < this.bullets.length; bi++) {
      const b = this.bullets[bi];
      if (!b.alive) { toRemove.add(bi); continue; }

      if (b instanceof LaserBeam) {
        b.update();
        // Colisão laser vs inimigos (por frame enquanto alive)
        for (const e of enemies) {
          if (!e.alive) continue;
          if (b.intersectsPoint(e.x, e.y, e.size)) {
            e.takeDamage(b.damage);
            this.particles.emit(e.x, e.y, { n:5, color:'#00f0ff' });
            this.particles.emitText(e.x, e.y - e.size, `-${Math.floor(b.damage)}`);
          }
        }
        continue;
      }

      b.update(W, H);

      // Colisão bala vs inimigos
      for (const e of enemies) {
        if (!e.alive) continue;
        if (dist(b.x, b.y, e.x, e.y) <= e.size + b.size) {
          const wasAlive = e.alive;
          e.takeDamage(b.damage);

          // Dano elétrico
          if (this.upgrades.electricDamage > 0) {
            for (const e2 of enemies) {
              if (e2 !== e && dist(e.x, e.y, e2.x, e2.y) < 80) {
                e2.takeDamage(this.upgrades.electricDamage);
                this.particles.emit(e2.x, e2.y, { n:4, color:'#ffea00', life:15 });
              }
            }
          }

          // Explosão
          if (b.explosive) {
            AudioEngine.explode();
            this.particles.emit(e.x, e.y, { n:20, speed:5, size:5, life:25, color:'#ffaa00' });
            for (const e2 of enemies) {
              if (e2 !== e && dist(e.x, e.y, e2.x, e2.y) < 100) {
                e2.takeDamage(b.damage * 0.5);
              }
            }
          }

          this.particles.emit(b.x, b.y, { n:8, speed:3, size:3, life:15, color: b.color });
          this.particles.emitText(e.x, e.y - e.size, `-${Math.floor(b.damage)}`,
            b.damage > 80 ? '#ffaa00' : '#ff4444');

          if (!b.piercing) { b.alive = false; toRemove.add(bi); break; }
        }
      }
    }

    // Remove balas mortas
    this.bullets = this.bullets.filter((_, i) => !toRemove.has(i));

    UI.updateHUD(this);
  }

  drawBullets(ctx, W, H) {
    for (const b of this.bullets) {
      if (b instanceof LaserBeam) b.draw(ctx, W, H);
      else b.draw(ctx);
    }
  }

  drawParticles(ctx) {
    this.particles.draw(ctx);
    for (const dr of this.drones) dr.draw(ctx);
  }

  drawScreenFlash(ctx, W, H) {
    if (this.screenFlash > 0) {
      ctx.save();
      ctx.globalAlpha = this.screenFlash / 15;
      ctx.fillStyle   = '#ff0000';
      ctx.fillRect(0, 0, W, H);
      ctx.restore();
    }
  }
}
