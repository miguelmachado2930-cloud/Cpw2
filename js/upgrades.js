/* =============================================
   upgrades.js — Sistema roguelike de upgrades
   ============================================= */

const RARITIES = {
  common:    { label: 'COMUM',    weight: 50, color: '#aaaaaa' },
  uncommon:  { label: 'INCOMUM',  weight: 30, color: '#00ff88' },
  rare:      { label: 'RARO',     weight: 15, color: '#00aaff' },
  epic:      { label: 'ÉPICO',    weight: 4,  color: '#cc44ff' },
  legendary: { label: 'LENDÁRIO', weight: 1,  color: '#ffaa00' },
};

/**
 * Sorteia raridade com pesos
 */
function rollRarity() {
  const total = Object.values(RARITIES).reduce((s, r) => s + r.weight, 0);
  let roll = Math.random() * total;
  for (const [key, r] of Object.entries(RARITIES)) {
    roll -= r.weight;
    if (roll <= 0) return key;
  }
  return 'common';
}

/**
 * Catálogo completo de upgrades
 * apply(playerUpgrades) mutates the upgrades object
 */
const UPGRADE_CATALOG = [
  {
    id:      'damage1',
    name:    'MÓDULO DE DANO I',
    desc:    '+20% dano em todos os projéteis',
    icon:    '⚡',
    rarity:  'common',
    apply(u) { u.damageMult = (u.damageMult || 1) * 1.2; }
  },
  {
    id:      'damage2',
    name:    'MÓDULO DE DANO II',
    desc:    '+40% dano em todos os projéteis',
    icon:    '⚡',
    rarity:  'uncommon',
    apply(u) { u.damageMult = (u.damageMult || 1) * 1.4; }
  },
  {
    id:      'firerate1',
    name:    'OVERCLOCK',
    desc:    '-20% tempo entre tiros (mais rápido)',
    icon:    '🔥',
    rarity:  'common',
    apply(u) { u.fireRateMult = (u.fireRateMult || 1) * 0.8; }
  },
  {
    id:      'firerate2',
    name:    'TURBO OVERCLOCK',
    desc:    '-35% tempo entre tiros',
    icon:    '🔥',
    rarity:  'rare',
    apply(u) { u.fireRateMult = (u.fireRateMult || 1) * 0.65; }
  },
  {
    id:      'crit1',
    name:    'MIRA CRÍTICA',
    desc:    '+10% chance de dano crítico (2×)',
    icon:    '🎯',
    rarity:  'uncommon',
    apply(u) { u.critChance = (u.critChance || 0) + 0.10; }
  },
  {
    id:      'crit2',
    name:    'SNIPER NEURAL',
    desc:    '+25% chance de dano crítico',
    icon:    '🎯',
    rarity:  'rare',
    apply(u) { u.critChance = (u.critChance || 0) + 0.25; }
  },
  {
    id:      'bounce',
    name:    'PROJÉTEIS RICOCHETES',
    desc:    'Balas ricocheteiam nas paredes 2×',
    icon:    '↩️',
    rarity:  'uncommon',
    apply(u) { u.bounceCount = (u.bounceCount || 0) + 2; }
  },
  {
    id:      'pierce',
    name:    'PERFURADOR NEON',
    desc:    'Projéteis atravessam inimigos',
    icon:    '🗡️',
    rarity:  'rare',
    apply(u) { u.piercing = true; }
  },
  {
    id:      'explosive',
    name:    'MUNIÇÃO EXPLOSIVA',
    desc:    'Projéteis explodem ao acertar',
    icon:    '💥',
    rarity:  'epic',
    apply(u) { u.explosive = true; }
  },
  {
    id:      'vampire',
    name:    'VAMPIRISMO DIGITAL',
    desc:    'Recupera 5 HP ao eliminar inimigos',
    icon:    '🩸',
    rarity:  'uncommon',
    apply(u) { u.lifeSteal = (u.lifeSteal || 0) + 5; }
  },
  {
    id:      'drone',
    name:    'DRONE AUXILIAR',
    desc:    'Um drone ataca automaticamente',
    icon:    '🤖',
    rarity:  'epic',
    apply(u) { u.droneCount = (u.droneCount || 0) + 1; }
  },
  {
    id:      'extraBullet',
    name:    'TIRO DUPLO',
    desc:    '+1 projétil por disparo',
    icon:    '🔫',
    rarity:  'rare',
    apply(u) { u.extraBullets = (u.extraBullets || 0) + 1; }
  },
  {
    id:      'tripleBullet',
    name:    'TIRO TRIPLO',
    desc:    '+2 projéteis por disparo',
    icon:    '🔫',
    rarity:  'epic',
    apply(u) { u.extraBullets = (u.extraBullets || 0) + 2; }
  },
  {
    id:      'electric',
    name:    'SOBRECARGA ELÉTRICA',
    desc:    'Acertos causam dano elétrico em área',
    icon:    '⚡',
    rarity:  'epic',
    apply(u) { u.electricDamage = (u.electricDamage || 0) + 15; }
  },
  {
    id:      'combo',
    name:    'MODO COMBO',
    desc:    'Cada eliminação consecutiva +5% dano (máx 10×)',
    icon:    '✨',
    rarity:  'rare',
    apply(u) { u.comboDamage = true; }
  },
  {
    id:      'maxhp',
    name:    'IMPLANTE DE HP',
    desc:    '+30 HP máximo e cura total',
    icon:    '❤️',
    rarity:  'uncommon',
    apply(u) { u.hpBonus = (u.hpBonus || 0) + 30; }
  },
  {
    id:      'shield',
    name:    'ESCUDO HOLOGRÁFICO',
    desc:    'Escudo absorve 1 hit por horda',
    icon:    '🛡️',
    rarity:  'rare',
    apply(u) { u.shield = (u.shield || 0) + 1; }
  },
  {
    id:      'speedboost',
    name:    'HACK DE VELOCIDADE',
    desc:    'Projéteis 30% mais rápidos',
    icon:    '💨',
    rarity:  'common',
    apply(u) { u.bulletSpeedMult = (u.bulletSpeedMult || 1) * 1.3; }
  },
  {
    id:      'megadamage',
    name:    'PROTOCOLO OVERKILL',
    desc:    '+100% dano, -20% fire rate',
    icon:    '☠️',
    rarity:  'legendary',
    apply(u) { u.damageMult = (u.damageMult || 1) * 2; u.fireRateMult = (u.fireRateMult || 1) * 1.2; }
  },
  {
    id:      'godmode',
    name:    'MODO FANTASMA',
    desc:    '+50% dano, ricochete, perfuração e crítico +20%',
    icon:    '👻',
    rarity:  'legendary',
    apply(u) {
      u.damageMult  = (u.damageMult  || 1) * 1.5;
      u.bounceCount = (u.bounceCount || 0) + 2;
      u.piercing    = true;
      u.critChance  = (u.critChance  || 0) + 0.2;
    }
  },
];

/**
 * Sorteia 3 upgrades aleatórios, tendendo a raridades mais altas em hordas avançadas
 */
function rollUpgrades(wave, pickedIds = []) {
  // Em hordas altas, bump de raridade
  const bias = Math.floor(wave / 5);

  const available = UPGRADE_CATALOG.filter(u => !pickedIds.includes(u.id));
  if (!available.length) return sampleArr(UPGRADE_CATALOG, 3);

  // Sorteia raridades
  const result = [];
  const used   = new Set();

  while (result.length < 3 && result.length < available.length) {
    let rarity = rollRarity();
    // Bias: tenta subir raridade baseado na horda
    for (let b = 0; b < bias; b++) {
      const keys   = Object.keys(RARITIES);
      const curIdx = keys.indexOf(rarity);
      if (curIdx < keys.length - 1 && Math.random() < 0.4) rarity = keys[curIdx + 1];
    }

    const pool = available.filter(u => u.rarity === rarity && !used.has(u.id));
    const fallback = available.filter(u => !used.has(u.id));
    const candidates = pool.length ? pool : fallback;
    if (!candidates.length) break;

    const pick = candidates[randInt(0, candidates.length - 1)];
    used.add(pick.id);
    result.push(pick);
  }

  return result;
}
