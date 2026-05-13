// TypingEngine — Core typing mechanic
// Handles keyboard input, word matching, target locking, combo tracking

import { SPECIAL_WORDS } from '../data/words.js';

export class TypingEngine {
  constructor(scene) {
    this.scene = scene;
    this.targets = [];       // Active enemy targets with words
    this.lockedTarget = null; // Currently locked enemy
    this.typedSoFar = '';    // Current progress string
    this.active = false;

    // Accuracy tracking
    this.totalChars = 0;
    this.correctChars = 0;
    this.wrongStreak = 0;    // consecutive wrong keystrokes

    // CPS tracking (rolling window)
    this.cpsWindow = [];     // [{time, chars}]
    this.cpsWindowMs = 30000;

    // Events emitted:
    // WORD_COMPLETE — { enemy, word, perfect, cps, accuracy }
    // WORD_WRONG    — { char }
    // TARGET_LOCKED — { enemy }
    // SPECIAL_WORD  — { effect }
    this.events = scene.events;

    this._keyHandler = this._onKey.bind(this);
    this._setupInput();
  }

  _setupInput() {
    // Use native keyboard event for full character capture
    this.scene.input.keyboard.on('keydown', this._keyHandler);
  }

  _onKey(event) {
    if (!this.active) return;

    // Arena gimmick: input delay (Frozen Tundra)
    const delay = this.scene._inputDelay || 0;
    if (delay > 0) {
      this.scene.time.delayedCall(delay, () => this._processKeyDirect(event));
      return;
    }

    const key = event.key;

    // Ignore non-character keys
    if (key === 'Backspace') {
      this._handleBackspace();
      return;
    }
    if (key === 'Escape') {
      this._clearTarget();
      return;
    }
    if (key.length !== 1) return;

    const char = key.toUpperCase();
    if (!/[A-Z]/.test(char)) return;

    this._processChar(char);
  }

  _processKeyDirect(event) {
    if (!this.active) return;
    const key = event.key;
    if (key === 'Backspace') { this._handleBackspace(); return; }
    if (key === 'Escape') { this._clearTarget(); return; }
    if (key.length !== 1) return;
    const char = key.toUpperCase();
    if (!/[A-Z]/.test(char)) return;
    this._processChar(char);
  }

  _processChar(char) {
    this.totalChars++;

    // --- Validate locked target ---
    if (this.lockedTarget) {
      // Check if target is still valid
      if (!this.lockedTarget.alive || 
          !this.lockedTarget.currentWord || 
          this.lockedTarget.currentWord.length === 0 ||
          this.typedSoFar.length >= this.lockedTarget.currentWord.length) {
        // Target became invalid, clear and start fresh
        this._clearTarget();
      }
    }

    // --- No locked target yet: find one ---
    if (!this.lockedTarget) {
      const candidate = this._findTargetByFirstChar(char);
      if (candidate) {
        this.lockedTarget = candidate;
        this.typedSoFar = char;
        this._wordStartTime = Date.now(); // Track word start for CPS
        this.wrongStreak = 0;
        this._wordWrongCount = 0;  // per-word wrong tracking
        this.correctChars++;
        this.lockedTarget.onProgress(this.typedSoFar);
        this.events.emit('TARGET_LOCKED', { enemy: this.lockedTarget });
      } else {
        // No match — wrong input
        this._emitWrong(char);
      }
      return;
    }

    // --- Target locked: match next char ---
    const word = this.lockedTarget.currentWord;
    const nextChar = word[this.typedSoFar.length];

    if (char === nextChar) {
      this.typedSoFar += char;
      this.correctChars++;
      this.wrongStreak = 0;
      this.lockedTarget.onProgress(this.typedSoFar);

      // Word completed?
      if (this.typedSoFar.length === word.length) {
        this._completeWord();
      }
    } else {
      this._emitWrong(char);
      this.wrongStreak++;
      this._wordWrongCount = (this._wordWrongCount || 0) + 1;
      this.lockedTarget.onWrong();

      // Break combo on 3 consecutive misses
      if (this.wrongStreak >= 3) {
        this.events.emit('COMBO_BREAK');
        this.wrongStreak = 0;
      }
    }
  }

  _completeWord() {
    const enemy = this.lockedTarget;
    const word = enemy.currentWord;
    const now = Date.now();

    // CPS calculation
    const elapsed = (now - (this._wordStartTime || now)) / 1000;
    const cps = elapsed > 0 ? word.length / elapsed : word.length;

    // Accuracy for this word (per-word: wrong presses vs word length)
    const wordWrong = this._wordWrongCount || 0;
    const wordAccuracy = word.length / Math.max(word.length + wordWrong, 1);

    // Overall session accuracy
    const accuracy = this.correctChars / Math.max(this.totalChars, 1);

    // Track CPS in rolling window
    this.cpsWindow.push({ time: now, chars: word.length, cps });
    this.cpsWindow = this.cpsWindow.filter(e => now - e.time < this.cpsWindowMs);

    // Check for special word effect
    const specialKey = word.toLowerCase();
    const special = SPECIAL_WORDS[specialKey];

    const perfect = wordWrong === 0; // perfect = zero mistakes this word

    this.events.emit('WORD_COMPLETE', {
      enemy,
      word,
      perfect,
      cps,
      accuracy: wordAccuracy,   // per-word accuracy
      sessionAccuracy: accuracy, // overall session
      special: special || null
    });

    this._wordWrongCount = 0;

    // Reset state
    this._clearTarget();
    this._wordStartTime = null;
  }

  _findTargetByFirstChar(char) {
    // Clean up invalid targets (but keep ability targets — they toggle alive state)
    this.targets = this.targets.filter(t => 
      t.isAbilityTarget || (t.alive && t.currentWord && t.currentWord.length > 0)
    );

    const matches = this.targets.filter(
      t => t.alive && t.currentWord && t.currentWord[0] === char
    );
    if (matches.length === 0) return null;
    if (matches.length === 1) return matches[0];

    // Priority: defense > enemy > ability (abilities should not steal from enemy words)
    matches.sort((a, b) => {
      // Priority 1: Defense targets (highest — must respond to attacks)
      const aIsDefense = a._isDefenseTarget || false;
      const bIsDefense = b._isDefenseTarget || false;
      if (aIsDefense !== bIsDefense) return aIsDefense ? -1 : 1;

      // Priority 2: Regular enemy targets over ability targets
      // (ability targets should have lowest priority to not interfere with combat)
      const aIsAbility = a.isAbilityTarget || false;
      const bIsAbility = b.isAbilityTarget || false;
      if (aIsAbility !== bIsAbility) return aIsAbility ? 1 : -1;

      // Priority 3: Closest to player (for enemies)
      const dx1 = Math.abs(a.x - (this.scene.player?.x || 400));
      const dx2 = Math.abs(b.x - (this.scene.player?.x || 400));
      return dx1 - dx2;
    });
    return matches[0];
  }

  _clearTarget() {
    if (this.lockedTarget) {
      this.lockedTarget.onProgress('');
      this.lockedTarget = null;
    }
    this.typedSoFar = '';
    this.wrongStreak = 0;
  }

  _handleBackspace() {
    if (!this.lockedTarget || this.typedSoFar.length === 0) return;
    this.typedSoFar = this.typedSoFar.slice(0, -1);
    // The removed char was correct (typedSoFar only stores correct chars)
    this.correctChars = Math.max(0, this.correctChars - 1);
    this.totalChars = Math.max(0, this.totalChars - 1);
    if (this.typedSoFar.length === 0) {
      this._clearTarget();
    } else {
      this.lockedTarget.onProgress(this.typedSoFar);
    }
  }

  _emitWrong(char) {
    this.events.emit('WORD_WRONG', { char });
    if (this.lockedTarget) {
      this.lockedTarget.onWrong();
    }
  }

  // Called when enemy spawns / word refreshes
  registerTarget(enemy) {
    if (!this.targets.includes(enemy)) {
      this.targets.push(enemy);
    }
  }

  unregisterTarget(enemy) {
    this.targets = this.targets.filter(t => t !== enemy);
    if (this.lockedTarget === enemy) {
      this._clearTarget();
    }
  }

  // Start accepting input
  enable() {
    this.active = true;
    this._wordStartTime = Date.now();
  }

  disable() {
    this.active = false;
    this._clearTarget();
  }

  // Get rolling average CPS
  getAverageCPS() {
    if (this.cpsWindow.length === 0) return 3;
    const total = this.cpsWindow.reduce((s, e) => s + e.cps, 0);
    return total / this.cpsWindow.length;
  }

  // Get overall accuracy (session)
  getAccuracy() {
    if (this.totalChars === 0) return 1;
    return this.correctChars / this.totalChars;
  }

  onWordStart() {
    this._wordStartTime = Date.now();
  }

  destroy() {
    this.scene.input.keyboard.off('keydown', this._keyHandler);
    this.targets = [];
    this.lockedTarget = null;
  }
}
