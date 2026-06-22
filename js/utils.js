/* =============================================
   utils.js — Funções utilitárias
   ============================================= */

/**
 * Retorna número aleatório entre min e max
 */
function rand(min, max) {
  return Math.random() * (max - min) + min;
}

/**
 * Retorna inteiro aleatório entre min e max (inclusive)
 */
function randInt(min, max) {
  return Math.floor(rand(min, max + 1));
}

/**
 * Sorteia k itens de um array sem repetição
 */
function sampleArr(arr, k) {
  const copy = [...arr];
  const result = [];
  for (let i = 0; i < Math.min(k, copy.length); i++) {
    const idx = randInt(0, copy.length - 1);
    result.push(copy.splice(idx, 1)[0]);
  }
  return result;
}

/**
 * Clamp: mantém valor entre min e max
 */
function clamp(val, min, max) {
  return Math.max(min, Math.min(max, val));
}

/**
 * Distância entre dois pontos
 */
function dist(x1, y1, x2, y2) {
  return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
}

/**
 * Lerp: interpolação linear
 */
function lerp(a, b, t) {
  return a + (b - a) * t;
}

/**
 * Converte ângulo para vetor normalizado
 */
function angleToVec(angle) {
  return { x: Math.cos(angle), y: Math.sin(angle) };
}

/**
 * Ângulo entre dois pontos
 */
function angleBetween(x1, y1, x2, y2) {
  return Math.atan2(y2 - y1, x2 - x1);
}

/**
 * Cor hexadecimal para rgba
 */
function hexToRgba(hex, alpha) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

/**
 * Salva/lê ranking no localStorage
 */
const RankingManager = {
  KEY: 'neonhunt_ranking',

  load() {
    try {
      return JSON.parse(localStorage.getItem(this.KEY)) || [];
    } catch { return []; }
  },

  save(entry) {
    let list = this.load();
    list.push(entry);
    list.sort((a, b) => b.score - a.score);
    list = list.slice(0, 10);
    localStorage.setItem(this.KEY, JSON.stringify(list));
  },

  render() {
    const list = this.load();
    const el = document.getElementById('ranking-list');
    if (!list.length) {
      el.innerHTML = '<p style="color:var(--text-dim);text-align:center;padding:20px">Nenhum registro ainda</p>';
      return;
    }
    el.innerHTML = list.map((e, i) => `
      <div class="rank-row">
        <span class="rank-pos">#${i + 1}</span>
        <span>${e.name || 'ANON'}</span>
        <span style="margin-left:auto;color:var(--text-dim);font-size:.7rem">Horda ${e.wave}</span>
        <span class="rank-score">${e.score.toLocaleString()}</span>
      </div>
    `).join('');
  }
};

/**
 * Pool simples de objetos para partículas (evita GC)
 */
class ObjectPool {
  constructor(factory, reset, initialSize = 50) {
    this.factory = factory;
    this.reset   = reset;
    this.pool    = [];
    for (let i = 0; i < initialSize; i++) this.pool.push(factory());
  }

  get(...args) {
    const obj = this.pool.length ? this.pool.pop() : this.factory();
    this.reset(obj, ...args);
    return obj;
  }

  release(obj) {
    this.pool.push(obj);
  }
}
