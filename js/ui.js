/* =============================================
   ui.js — Gerenciamento de interface
   ============================================= */

const UI = (() => {

  // Cache de elementos
  const $ = id => document.getElementById(id);

  /**
   * Cursor customizado SVG
   */
  let cursorEl = null;

  function initCursor() {
    cursorEl = document.createElement('div');
    cursorEl.id = 'cursor';
    cursorEl.innerHTML = `
      <svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
        <circle cx="16" cy="16" r="12" fill="none" stroke="#00f0ff" stroke-width="1.5" opacity="0.7"/>
        <circle cx="16" cy="16" r="2"  fill="#00f0ff"/>
        <line x1="16" y1="2"  x2="16" y2="8"  stroke="#00f0ff" stroke-width="1.5"/>
        <line x1="16" y1="24" x2="16" y2="30" stroke="#00f0ff" stroke-width="1.5"/>
        <line x1="2"  y1="16" x2="8"  y2="16" stroke="#00f0ff" stroke-width="1.5"/>
        <line x1="24" y1="16" x2="30" y2="16" stroke="#00f0ff" stroke-width="1.5"/>
      </svg>`;
    document.body.appendChild(cursorEl);

    document.addEventListener('mousemove', e => {
      cursorEl.style.left = e.clientX + 'px';
      cursorEl.style.top  = e.clientY + 'px';
    });
  }

  /**
   * Atualiza HUD a cada frame
   */
  function updateHUD(player) {
    // HP
    const hpPct = player.hp / player.maxHp;
    $('hp-bar').style.width  = (hpPct * 100) + '%';
    $('hp-text').textContent = `${Math.ceil(player.hp)}/${player.maxHp}`;
    $('hp-bar').style.background = hpPct > 0.5
      ? 'linear-gradient(90deg,#00f0ff,#00ff88)'
      : hpPct > 0.25
        ? 'linear-gradient(90deg,#ffea00,#ff8800)'
        : 'linear-gradient(90deg,#ff2244,#ff6600)';

    // Horda, score, inimigos, combo
    // (chamados separadamente para não sobrescrever)
    $('hud-score').textContent = player.score.toLocaleString();
    $('hud-combo').textContent = `x${player.combo}`;
    $('hud-combo').style.color = player.combo > 3 ? '#ffea00' : '#00f0ff';

    // Arma e munição
    const w = player.weapon;
    $('hud-weapon').textContent = w.def.name;
    if (w.reloading) {
      const pct = Math.floor(w.reloadProgress * 100);
      $('hud-ammo').textContent   = `CARREGANDO ${pct}%`;
      $('hud-ammo').style.color   = '#ffea00';
    } else {
      $('hud-ammo').textContent   = w.def.ammo === -1 ? '∞' : `${w.ammo}/${w.def.maxAmmo}`;
      $('hud-ammo').style.color   = '#00ff88';
    }
  }

  function updateWaveHUD(wave, enemyCount) {
    const el = $('hud-wave');
    el.textContent = String(wave).padStart(2, '0');
    $('hud-enemies').textContent = enemyCount;
  }

  function updateWeaponBar(idx) {
    document.querySelectorAll('.weapon-slot').forEach((s, i) => {
      s.classList.toggle('active', i === idx);
    });
  }

  /**
   * Exibe anúncio de horda no centro da tela
   */
  function announceWave(wave, isBoss) {
    let el = $('wave-announce');
    if (!el) {
      el = document.createElement('div');
      el.id = 'wave-announce';
      $('screen-game').appendChild(el);
    }
    el.textContent = isBoss ? `⚠ BOSS FIGHT ⚠` : `HORDA ${wave}`;
    el.style.color = isBoss ? '#ff00c8' : '#00f0ff';
    el.style.textShadow = `0 0 30px ${isBoss ? '#ff00c8' : '#00f0ff'}`;
    el.style.opacity = '1';
    setTimeout(() => { el.style.opacity = '0'; }, 2000);
  }

  /**
   * Renderiza ícones de upgrades ativos no HUD lateral
   */
  function renderActiveUpgrades(pickedIds) {
    const container = $('active-upgrades');
    container.innerHTML = '';
    for (const id of pickedIds) {
      const def = UPGRADE_CATALOG.find(u => u.id === id);
      if (!def) continue;
      const rarityColor = {
        common: '#aaa', uncommon: '#00ff88', rare: '#00aaff', epic: '#cc44ff', legendary: '#ffaa00'
      }[def.rarity] || '#aaa';
      const div = document.createElement('div');
      div.className = 'upg-icon';
      div.title     = `${def.name}: ${def.desc}`;
      div.style.background   = `rgba(0,0,0,0.6)`;
      div.style.border       = `1px solid ${rarityColor}`;
      div.style.color        = rarityColor;
      div.textContent        = def.icon;
      container.appendChild(div);
    }
  }

  /**
   * Mostra tela de seleção de upgrades
   */
  function showUpgradeScreen(upgrades, onChoose) {
    const container = $('upgrade-cards');
    container.innerHTML = '';

    for (const upg of upgrades) {
      const card = document.createElement('div');
      card.className = `upgrade-card rarity-${upg.rarity}`;

      const rarityData = RARITIES[upg.rarity];
      card.innerHTML = `
        <span class="card-icon">${upg.icon}</span>
        <div class="card-rarity">${rarityData.label}</div>
        <div class="card-name">${upg.name}</div>
        <div class="card-desc">${upg.desc}</div>
      `;

      card.addEventListener('click', () => {
        onChoose(upg);
      });

      // Hover: glow border matching rarity
      container.appendChild(card);
    }

    showScreen('upgrade');
  }

  /**
   * Tela de Game Over
   */
  function showGameOver(player, wave) {
    $('go-wave').textContent  = wave;
    $('go-score').textContent = player.score.toLocaleString();
    $('go-kills').textContent = player.kills;
    $('go-combo').textContent = `x${player.maxCombo}`;
    showScreen('gameover');

    // Salva ranking
    RankingManager.save({ score: player.score, wave, kills: player.kills });
  }

  /**
   * Controle de telas
   */
  function showScreen(name) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    const el = $(`screen-${name}`);
    if (el) el.classList.add('active');
  }

  return {
    initCursor,
    updateHUD,
    updateWaveHUD,
    updateWeaponBar,
    announceWave,
    renderActiveUpgrades,
    showUpgradeScreen,
    showGameOver,
    showScreen,
  };
})();
