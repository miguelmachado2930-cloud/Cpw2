/* =============================================
   audio.js — Motor de áudio procedural
   ============================================= */

const AudioEngine = (() => {
  let ctx = null;

  function init() {
    if (ctx) return;
    ctx = new (window.AudioContext || window.webkitAudioContext)();
  }

  function resume() {
    if (ctx && ctx.state === 'suspended') ctx.resume();
  }

  /**
   * Toca um som sintético com parâmetros customizáveis
   */
  function playTone({ freq = 440, freq2 = null, type = 'square', duration = 0.1,
                       volume = 0.3, attack = 0.005, decay = 0.05,
                       filterFreq = null, detune = 0 } = {}) {
    if (!ctx) return;
    const now = ctx.currentTime;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(volume, now + attack);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    if (freq2) osc.frequency.linearRampToValueAtTime(freq2, now + duration);
    osc.detune.value = detune;

    if (filterFreq) {
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = filterFreq;
      osc.connect(filter);
      filter.connect(gain);
    } else {
      osc.connect(gain);
    }

    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + duration + 0.01);
  }

  /**
   * Noise para explosões
   */
  function playNoise({ duration = 0.15, volume = 0.2, filterFreq = 1000 } = {}) {
    if (!ctx) return;
    const now  = ctx.currentTime;
    const buf  = ctx.createBuffer(1, ctx.sampleRate * duration, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;

    const src    = ctx.createBufferSource();
    src.buffer   = buf;

    const filter = ctx.createBiquadFilter();
    filter.type  = 'bandpass';
    filter.frequency.value = filterFreq;
    filter.Q.value = 0.5;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    src.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    src.start(now);
  }

  // ── Sons por evento ──────────────────────────────────────

  return {
    init, resume,

    shoot_pistol()   { playTone({ freq:300, freq2:200, type:'sawtooth', duration:.12, volume:.25, filterFreq:2000 }); },
    shoot_smg()      { playTone({ freq:400, freq2:250, type:'square',   duration:.06, volume:.15, filterFreq:3000 }); },
    shoot_shotgun()  {
      for (let i = 0; i < 3; i++)
        setTimeout(() => playNoise({ duration:.1, volume:.3, filterFreq:800 + i * 200 }), i * 15);
    },
    shoot_rifle()    { playTone({ freq:150, freq2:80,  type:'sawtooth', duration:.25, volume:.4,  filterFreq:1200 }); },
    shoot_laser()    { playTone({ freq:800, freq2:200, type:'sine',     duration:.2,  volume:.3,  detune:20 }); },
    shoot_railgun()  {
      playNoise({ duration:.4, volume:.5, filterFreq:400 });
      playTone({ freq:80, freq2:40, type:'sawtooth', duration:.5, volume:.5 });
    },
    hit()            { playTone({ freq:200, freq2:100, type:'square',   duration:.08, volume:.2 }); },
    explode()        { playNoise({ duration:.3,  volume:.4,  filterFreq:600 }); },
    enemy_die()      {
      playNoise({ duration:.15, volume:.25, filterFreq:1200 });
      setTimeout(() => playTone({ freq:150, freq2:50, type:'sawtooth', duration:.2, volume:.15 }), 50);
    },
    level_up()       {
      [300,400,500,700].forEach((f, i) =>
        setTimeout(() => playTone({ freq:f, type:'sine', duration:.15, volume:.25 }), i * 80)
      );
    },
    upgrade_pick()   {
      [500,700,1000].forEach((f, i) =>
        setTimeout(() => playTone({ freq:f, type:'sine', duration:.12, volume:.2 }), i * 60)
      );
    },
    boss_appear()    {
      playNoise({ duration:.6, volume:.5, filterFreq:300 });
      setTimeout(() => playTone({ freq:100, freq2:60, type:'sawtooth', duration:.8, volume:.5 }), 200);
    },
    player_hurt()    { playTone({ freq:150, freq2:80, type:'sawtooth', duration:.2, volume:.4 }); },
    reload()         {
      playTone({ freq:600, freq2:800, type:'square', duration:.08, volume:.2, attack:.001 });
      setTimeout(() => playTone({ freq:800, freq2:400, type:'square', duration:.08, volume:.2 }), 120);
    },
    wave_complete()  {
      [400,500,600,800,1000].forEach((f, i) =>
        setTimeout(() => playTone({ freq:f, type:'sine', duration:.2, volume:.3 }), i * 100)
      );
    }
  };
})();
