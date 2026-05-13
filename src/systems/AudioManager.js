// AudioManager — Web Audio API procedural sound effects and music

export class AudioManager {
  constructor() {
    this._ctx = null;
    this.muted = false;
    this.sfxVolume = 0.6;
    this.bgmVolume = 0.3;
    this._bgmSource = null;
    this._bgmPlaying = false;
    this._currentTrack = null;
    this._masterGain = null;
    this._trackBuffers = {}; // Cache rendered buffers
  }

  _getCtx() {
    if (!this._ctx) {
      this._ctx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (this._ctx.state === 'suspended') {
      this._ctx.resume();
    }
    return this._ctx;
  }

  _playTone(freq, type = 'sine', duration = 0.1, vol = 0.3, decay = 0.1) {
    if (this.muted) return;
    try {
      const ctx = this._getCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = type;
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      gain.gain.setValueAtTime(vol * this.sfxVolume, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration + decay);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + duration + decay);
    } catch(e) {}
  }

  _playNoise(duration = 0.05, vol = 0.2) {
    if (this.muted) return;
    try {
      const ctx = this._getCtx();
      const bufSize = ctx.sampleRate * duration;
      const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < bufSize; i++) data[i] = Math.random() * 2 - 1;
      const src = ctx.createBufferSource();
      const gain = ctx.createGain();
      src.buffer = buf;
      src.connect(gain);
      gain.connect(ctx.destination);
      gain.gain.setValueAtTime(vol * this.sfxVolume, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
      src.start();
    } catch(e) {}
  }

  // ─── SFX Methods ───────────────────────────────────────────────────────────

  playKeyClick() {
    this._playTone(800, 'square', 0.02, 0.15, 0.02);
  }

  playWordComplete(perfect = false) {
    if (perfect) {
      this._playTone(523, 'sine', 0.08, 0.4, 0.15);
      setTimeout(() => this._playTone(659, 'sine', 0.08, 0.4, 0.15), 80);
      setTimeout(() => this._playTone(784, 'sine', 0.12, 0.5, 0.2), 160);
    } else {
      this._playTone(440, 'sine', 0.08, 0.35, 0.12);
      setTimeout(() => this._playTone(523, 'sine', 0.1, 0.35, 0.15), 70);
    }
  }

  playWrong() {
    this._playTone(150, 'sawtooth', 0.06, 0.3, 0.05);
  }

  playHitEnemy() {
    this._playTone(300, 'square', 0.05, 0.25, 0.08);
    this._playNoise(0.04, 0.15);
  }

  playPlayerHit() {
    this._playTone(180, 'sawtooth', 0.15, 0.5, 0.2);
    this._playNoise(0.1, 0.3);
  }

  playEnemyDeath() {
    this._playTone(200, 'square', 0.05, 0.3, 0.05);
    setTimeout(() => this._playTone(150, 'square', 0.05, 0.3, 0.1), 50);
    setTimeout(() => this._playNoise(0.1, 0.2), 100);
  }

  playComboMilestone(combo) {
    const freqs = [262, 330, 392, 523, 659];
    const f = freqs[Math.min(Math.floor(combo / 5), freqs.length - 1)];
    this._playTone(f, 'triangle', 0.1, 0.5, 0.15);
    setTimeout(() => this._playTone(f * 1.5, 'triangle', 0.12, 0.4, 0.2), 100);
  }

  playStatusEffect(type) {
    const map = {
      burn: [800, 'sawtooth'], slow: [200, 'sine'], stun: [600, 'square'],
      heal: [523, 'sine'], weaken: [300, 'triangle']
    };
    const [freq, wave] = map[type] || [440, 'sine'];
    this._playTone(freq, wave, 0.15, 0.4, 0.2);
  }

  playBossIntro() {
    const freqs = [100, 90, 80, 70];
    freqs.forEach((f, i) => {
      setTimeout(() => this._playTone(f, 'sawtooth', 0.3, 0.6, 0.3), i * 200);
    });
  }

  playUIClick() {
    this._playTone(600, 'square', 0.04, 0.2, 0.03);
  }

  playMenuSelect() {
    this._playTone(800, 'square', 0.06, 0.25, 0.05);
    this._playTone(1000, 'square', 0.04, 0.15, 0.08);
  }

  playVictory() {
    const melody = [523, 523, 523, 659, 784, 784, 784];
    const times = [0, 120, 240, 360, 480, 580, 700];
    melody.forEach((f, i) => {
      setTimeout(() => this._playTone(f, 'triangle', 0.2, 0.5, 0.3), times[i]);
    });
  }

  // ─── Background Music System (Buffer-based looping) ────────────────────────

  startBGM(trackName = 'gameplay') {
    this.stopBGM();
    if (this.muted) return;

    try {
      const ctx = this._getCtx();
      this._bgmPlaying = true;
      this._currentTrack = trackName;

      this._masterGain = ctx.createGain();
      this._masterGain.connect(ctx.destination);
      this._masterGain.gain.setValueAtTime(this.bgmVolume * 0.5, ctx.currentTime);

      // Get or render the track buffer
      if (!this._trackBuffers[trackName]) {
        this._trackBuffers[trackName] = this._renderTrack(trackName);
      }

      const src = ctx.createBufferSource();
      src.buffer = this._trackBuffers[trackName];
      src.loop = true;
      src.connect(this._masterGain);
      src.start(0);
      this._bgmSource = src;
    } catch(e) {
      console.warn('BGM failed to start:', e);
    }
  }

  stopBGM() {
    this._bgmPlaying = false;
    this._currentTrack = null;

    if (this._bgmSource) {
      try { this._bgmSource.stop(); } catch(e) {}
      this._bgmSource = null;
    }

    if (this._masterGain) {
      try {
        this._masterGain.gain.setValueAtTime(0, this._getCtx().currentTime);
        this._masterGain.disconnect();
      } catch(e) {}
      this._masterGain = null;
    }
  }

  // Render a complete loop into a stereo AudioBuffer
  _renderTrack(trackName) {
    const ctx = this._getCtx();
    const sampleRate = ctx.sampleRate;
    const trackData = this._getTrackData(trackName);
    const { bpm, beatsPerLoop, notes } = trackData;

    const beatDur = 60 / bpm;
    const loopDur = beatsPerLoop * beatDur;
    const length = Math.ceil(loopDur * sampleRate);
    const buffer = ctx.createBuffer(2, length, sampleRate);
    const left = buffer.getChannelData(0);
    const right = buffer.getChannelData(1);

    notes.forEach(note => {
      const startSample = Math.floor(note.time * beatDur * sampleRate);
      const dur = note.dur * beatDur;
      const samples = Math.floor(dur * sampleRate);
      const vol = note.vol || 0.12;
      const freq = note.freq;
      const type = note.type || 'sine';
      const pan = note.pan || 0;

      for (let i = 0; i < samples; i++) {
        const idx = startSample + i;
        if (idx >= length) break;

        const t = i / sampleRate;
        // ADSR envelope
        const attack = 0.015;
        const release = dur * 0.3;
        let env;
        if (t < attack) env = t / attack;
        else if (t > dur - release) env = Math.max(0, (dur - t) / release);
        else env = 1;

        let sample = 0;
        const phase = freq * t * Math.PI * 2;
        switch (type) {
          case 'sine': sample = Math.sin(phase); break;
          case 'square': sample = Math.sin(phase) > 0 ? 0.6 : -0.6; break;
          case 'triangle': sample = (2 / Math.PI) * Math.asin(Math.sin(phase)); break;
          case 'sawtooth': sample = (2 * ((freq * t) % 1) - 1) * 0.5; break;
          case 'noise': sample = Math.random() * 2 - 1; break;
        }

        sample *= env * vol;
        const lGain = Math.cos((pan + 1) * Math.PI / 4);
        const rGain = Math.sin((pan + 1) * Math.PI / 4);
        left[idx] += sample * lGain;
        right[idx] += sample * rGain;
      }
    });

    // Soft-clip
    for (let i = 0; i < length; i++) {
      left[i] = Math.tanh(left[i]);
      right[i] = Math.tanh(right[i]);
    }

    return buffer;
  }

  _getTrackData(trackName) {
    switch (trackName) {
      case 'menu': return this._menuTrack();
      case 'gameplay': return this._gameplayTrack();
      case 'boss': return this._bossTrack();
      case 'victory': return this._victoryTrack();
      default: return this._gameplayTrack();
    }
  }

  // ─── Menu: Calm medieval ambience (Am → F → C → G, 70 BPM, 16 beats) ──────
  _menuTrack() {
    const notes = [];
    // Pad chords
    const chords = [[220, 262, 330], [175, 220, 262], [262, 330, 392], [196, 247, 294]];
    chords.forEach((chord, ci) => {
      chord.forEach(freq => {
        notes.push({ time: ci * 4, freq, dur: 3.8, vol: 0.1, type: 'sine' });
      });
    });
    // Arpeggio
    const arp = [330, 392, 440, 523, 440, 392, 330, 294, 262, 330, 392, 440, 523, 587, 523, 440];
    arp.forEach((freq, i) => {
      notes.push({ time: i, freq, dur: 0.8, vol: 0.07, type: 'triangle', pan: (i % 2 === 0) ? -0.3 : 0.3 });
    });
    // Sub bass
    [110, 110, 87, 87, 131, 131, 98, 98].forEach((freq, i) => {
      notes.push({ time: i * 2, freq, dur: 1.8, vol: 0.12, type: 'sine' });
    });
    return { bpm: 70, beatsPerLoop: 16, notes };
  }

  // ─── Gameplay: Driving medieval adventure (Dm → Bb → C → Am, 140 BPM, 32 beats)
  _gameplayTrack() {
    const notes = [];

    // Bass line
    const bassSeq = [147, 147, 147, 147, 117, 117, 117, 117, 131, 131, 131, 131, 110, 110, 110, 110];
    bassSeq.forEach((freq, i) => {
      notes.push({ time: i * 2, freq, dur: 1.6, vol: 0.16, type: 'triangle' });
    });

    // Kick (every 2 beats)
    for (let i = 0; i < 16; i++) {
      notes.push({ time: i * 2, freq: 55, dur: 0.15, vol: 0.22, type: 'sine' });
    }
    // Snare (off-beats)
    for (let i = 0; i < 16; i++) {
      notes.push({ time: i * 2 + 1, freq: 200, dur: 0.07, vol: 0.09, type: 'noise' });
    }
    // Hi-hat
    for (let i = 0; i < 32; i++) {
      notes.push({ time: i, freq: 800, dur: 0.03, vol: 0.05, type: 'noise' });
    }

    // Melody — heroic medieval
    const mel = [
      [0, 294, 2], [2, 330, 1], [3, 349, 1], [4, 392, 2], [6, 440, 2],
      [8, 349, 2], [10, 330, 1], [11, 294, 1], [12, 262, 2], [14, 294, 2],
      [16, 392, 2], [18, 440, 1], [19, 494, 1], [20, 523, 2], [22, 494, 1],
      [23, 440, 1], [24, 392, 2], [26, 349, 1], [27, 330, 1], [28, 294, 3], [31, 262, 1]
    ];
    mel.forEach(([t, freq, dur]) => {
      notes.push({ time: t, freq, dur: dur * 0.9, vol: 0.11, type: 'square' });
    });

    // Harmony pads
    [[0, [294, 349, 440]], [8, [233, 294, 349]], [16, [262, 330, 392]], [24, [220, 262, 330]]].forEach(([t, freqs]) => {
      freqs.forEach(freq => notes.push({ time: t, freq, dur: 7, vol: 0.05, type: 'sine' }));
    });

    return { bpm: 140, beatsPerLoop: 32, notes };
  }

  // ─── Boss: Dark, intense, aggressive (160 BPM, 32 beats) ──────────────────
  _bossTrack() {
    const notes = [];

    // Heavy bass drone
    const bassDrone = [73, 73, 73, 73, 69, 69, 69, 69, 82, 82, 82, 82, 73, 73, 73, 73];
    bassDrone.forEach((freq, i) => {
      notes.push({ time: i * 2, freq, dur: 1.8, vol: 0.18, type: 'sawtooth' });
    });

    // Double kick
    const kicks = [0,1,2,3,4,4.5,5,6,7,8,9,10,11,12,12.5,13,14,15,16,17,18,19,20,20.5,21,22,23,24,25,26,27,28,28.5,29,30,31];
    kicks.forEach(t => notes.push({ time: t, freq: 45, dur: 0.12, vol: 0.25, type: 'sine' }));

    // Snare
    for (let i = 0; i < 16; i++) {
      notes.push({ time: i * 2 + 1, freq: 150, dur: 0.08, vol: 0.12, type: 'noise' });
    }
    // Fast hi-hat
    for (let i = 0; i < 64; i++) {
      notes.push({ time: i * 0.5, freq: 1000, dur: 0.02, vol: 0.035, type: 'noise' });
    }

    // Dark chromatic melody
    const dark = [
      [0, 147, 2], [2, 156, 2], [4, 147, 1], [5, 131, 1], [6, 123, 2],
      [8, 147, 2], [10, 175, 2], [12, 165, 2], [14, 147, 2],
      [16, 294, 1], [17, 311, 1], [18, 294, 1], [19, 262, 1], [20, 247, 2],
      [22, 262, 1], [23, 294, 1], [24, 349, 2], [26, 330, 2], [28, 294, 2], [30, 262, 2]
    ];
    dark.forEach(([t, freq, dur]) => {
      notes.push({ time: t, freq, dur: dur * 0.85, vol: 0.1, type: 'sawtooth' });
    });

    // Power chords
    [[0, [73, 110, 147]], [8, [69, 104, 139]], [16, [82, 123, 165]], [24, [73, 110, 147]]].forEach(([t, freqs]) => {
      freqs.forEach(freq => notes.push({ time: t, freq, dur: 7, vol: 0.04, type: 'sawtooth' }));
    });

    return { bpm: 160, beatsPerLoop: 32, notes };
  }

  // ─── Victory: Triumphant fanfare (120 BPM, 16 beats) ──────────────────────
  _victoryTrack() {
    const notes = [];

    // Fanfare melody
    const fan = [
      [0, 392, 1], [1, 392, 0.5], [1.5, 440, 0.5], [2, 494, 1], [3, 523, 2],
      [5, 494, 1], [6, 523, 1], [7, 587, 2],
      [9, 523, 1], [10, 494, 0.5], [10.5, 440, 0.5], [11, 392, 1],
      [12, 440, 1], [13, 523, 2], [15, 392, 1]
    ];
    fan.forEach(([t, freq, dur]) => {
      notes.push({ time: t, freq, dur: dur * 0.9, vol: 0.14, type: 'square' });
    });

    // Harmony pads
    [[0, [262, 330, 392]], [4, [220, 330, 392]], [8, [262, 330, 392]], [12, [196, 247, 294]]].forEach(([t, freqs]) => {
      freqs.forEach(freq => notes.push({ time: t, freq, dur: 3.5, vol: 0.07, type: 'sine' }));
    });

    // Bass
    [131, 131, 110, 110, 131, 131, 98, 98].forEach((freq, i) => {
      notes.push({ time: i * 2, freq, dur: 1.6, vol: 0.13, type: 'triangle' });
    });

    // Percussion
    for (let i = 0; i < 8; i++) {
      notes.push({ time: i * 2, freq: 60, dur: 0.12, vol: 0.18, type: 'sine' });
      notes.push({ time: i * 2 + 1, freq: 300, dur: 0.05, vol: 0.07, type: 'noise' });
    }

    return { bpm: 120, beatsPerLoop: 16, notes };
  }

  // ─── Volume Controls ───────────────────────────────────────────────────────

  setMuted(v) {
    this.muted = v;
    if (v) this.stopBGM();
  }

  setSFXVolume(v) { this.sfxVolume = v; }

  setBGMVolume(v) {
    this.bgmVolume = v;
    if (this._masterGain) {
      this._masterGain.gain.setValueAtTime(v * 0.5, this._getCtx().currentTime);
    }
  }
}

// Singleton
export const audioManager = new AudioManager();
