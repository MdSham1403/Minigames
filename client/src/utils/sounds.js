// Sound engine using Web Audio API — no audio files needed, all synthesised
// Usage: import sounds from '../utils/sounds'; sounds.play('match');

class SoundEngine {
  constructor() {
    this.ctx = null;
    this.muted = localStorage.getItem('mg_muted') === 'true';
  }

  // Lazy-init AudioContext on first user gesture
  getCtx() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
    return this.ctx;
  }

  toggle() {
    this.muted = !this.muted;
    localStorage.setItem('mg_muted', this.muted);
    return this.muted;
  }

  // Core tone generator
  tone({ freq = 440, type = 'sine', duration = 0.1, volume = 0.3, delay = 0, ramp = true } = {}) {
    if (this.muted) return;
    try {
      const ctx = this.getCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.type = type;
      osc.frequency.setValueAtTime(freq, ctx.currentTime + delay);
      gain.gain.setValueAtTime(volume, ctx.currentTime + delay);
      if (ramp) gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + duration);

      osc.start(ctx.currentTime + delay);
      osc.stop(ctx.currentTime + delay + duration + 0.05);
    } catch (e) {}
  }

  // Noise burst (for wrong answer, game over)
  noise({ duration = 0.1, volume = 0.15, delay = 0 } = {}) {
    if (this.muted) return;
    try {
      const ctx = this.getCtx();
      const bufSize = ctx.sampleRate * duration;
      const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < bufSize; i++) data[i] = Math.random() * 2 - 1;

      const src = ctx.createBufferSource();
      src.buffer = buf;
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(volume, ctx.currentTime + delay);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + duration);
      src.connect(gain);
      gain.connect(ctx.destination);
      src.start(ctx.currentTime + delay);
    } catch (e) {}
  }

  // ── Named sounds ────────────────────────────────────────────────────────────

  // Card flip
  flip() {
    this.tone({ freq: 800, type: 'sine', duration: 0.07, volume: 0.15 });
  }

  // Card match!
  match() {
    this.tone({ freq: 523, duration: 0.1, volume: 0.25 });
    this.tone({ freq: 659, duration: 0.1, volume: 0.25, delay: 0.1 });
    this.tone({ freq: 784, duration: 0.15, volume: 0.3,  delay: 0.2 });
  }

  // No match / wrong
  wrong() {
    this.tone({ freq: 250, type: 'sawtooth', duration: 0.15, volume: 0.2 });
    this.tone({ freq: 200, type: 'sawtooth', duration: 0.15, volume: 0.2, delay: 0.1 });
  }

  // Correct answer / trivia right
  correct() {
    this.tone({ freq: 660, duration: 0.08, volume: 0.25 });
    this.tone({ freq: 880, duration: 0.12, volume: 0.3, delay: 0.09 });
  }

  // Snake eat food
  eat() {
    this.tone({ freq: 600, type: 'square', duration: 0.06, volume: 0.12 });
  }

  // Tile merge in 2048
  merge() {
    this.tone({ freq: 400, type: 'triangle', duration: 0.08, volume: 0.18 });
    this.tone({ freq: 500, type: 'triangle', duration: 0.08, volume: 0.18, delay: 0.06 });
  }

  // Game over
  gameOver() {
    this.tone({ freq: 400, type: 'sawtooth', duration: 0.15, volume: 0.3 });
    this.tone({ freq: 300, type: 'sawtooth', duration: 0.15, volume: 0.3, delay: 0.15 });
    this.tone({ freq: 200, type: 'sawtooth', duration: 0.25, volume: 0.3, delay: 0.3 });
  }

  // Victory fanfare
  win() {
    const notes = [523, 659, 784, 1047];
    notes.forEach((freq, i) => {
      this.tone({ freq, duration: 0.12, volume: 0.3, delay: i * 0.12 });
    });
  }

  // Countdown beep
  beep() {
    this.tone({ freq: 880, type: 'sine', duration: 0.1, volume: 0.2 });
  }

  // Final countdown GO
  go() {
    this.tone({ freq: 1047, type: 'sine', duration: 0.2, volume: 0.35 });
  }

  // Click / button press
  click() {
    this.tone({ freq: 1200, type: 'sine', duration: 0.04, volume: 0.08 });
  }

  // Streak bonus
  streak() {
    [523, 659, 784, 1047, 1319].forEach((freq, i) => {
      this.tone({ freq, duration: 0.08, volume: 0.2, delay: i * 0.07 });
    });
  }
  // Whack hit
  whack() {
    this.noise({ duration: 0.08, volume: 0.25 });
    this.tone({ freq: 180, type: 'square', duration: 0.06, volume: 0.15, delay: 0.03 });
  }

  // Simon pad light
  pad(idx) {
    const freqs = [392, 494, 330, 262];
    this.tone({ freq: freqs[idx] || 392, type: 'sine', duration: 0.35, volume: 0.3 });
  }

  // Piece slide (puzzle, connect4, chess)
  slide() {
    this.tone({ freq: 600, type: 'triangle', duration: 0.05, volume: 0.1 });
    this.tone({ freq: 900, type: 'triangle', duration: 0.05, volume: 0.1, delay: 0.05 });
  }

  // Card play (UNO)
  card() {
    this.tone({ freq: 700, type: 'sine', duration: 0.06, volume: 0.15 });
    this.tone({ freq: 500, type: 'sine', duration: 0.08, volume: 0.12, delay: 0.05 });
  }

  // Piece place (chess, connect4, ludo)
  place() {
    this.tone({ freq: 300, type: 'triangle', duration: 0.1, volume: 0.2 });
  }

  // Ludo dice roll
  dice() {
    for (let i = 0; i < 5; i++) {
      this.tone({ freq: 200 + Math.random() * 400, type: 'square', duration: 0.04, volume: 0.08, delay: i * 0.06 });
    }
  }

  // Timeout / time low warning
  tick() {
    this.tone({ freq: 1000, type: 'sine', duration: 0.05, volume: 0.12 });
  }

}

const sounds = new SoundEngine();
export default sounds;
// The file already exports sounds — this is a NO-OP safety guard
