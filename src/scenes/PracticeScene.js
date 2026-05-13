// PracticeScene — Type without danger. Pure typing practice.

import { TypingEngine } from '../systems/TypingEngine.js';
import { WordLabel } from '../objects/WordLabel.js';
import { FloatingText } from '../objects/FloatingText.js';
import { audioManager } from '../systems/AudioManager.js';
import { getWordForDifficulty } from '../data/words.js';

export class PracticeScene extends Phaser.Scene {
  constructor() {
    super({ key: 'PracticeScene' });
  }

  create() {
    const W = this.cameras.main.width;
    const H = this.cameras.main.height;
    this.W = W;
    this.H = H;

    // --- Background ---
    this.add.rectangle(W / 2, H / 2, W, H, 0x0a0a1a);
    const gfx = this.add.graphics();
    gfx.fillStyle(0x333355, 0.3);
    gfx.fillRect(0, H - 90, W, 90);
    gfx.fillStyle(0x444466, 0.4);
    gfx.fillRect(0, H - 94, W, 4);

    // Title
    this.add.text(W / 2, 20, '🏋️  PRACTICE ARENA', {
      fontFamily: 'Courier New, monospace',
      fontSize: '22px',
      color: '#88aaff',
      stroke: '#000000',
      strokeThickness: 3
    }).setOrigin(0.5, 0);

    this.add.text(W / 2, 50, 'Type the words — no enemies, no pressure!', {
      fontFamily: 'Courier New, monospace',
      fontSize: '12px',
      color: '#555577'
    }).setOrigin(0.5, 0);

    // Stats
    this.wordsTyped = 0;
    this.correctChars = 0;
    this.totalChars = 0;
    this.startTime = Date.now();
    this._lastKillTime = Date.now();

    this.statsTxt = this.add.text(W / 2, H - 70, '', {
      fontFamily: 'Courier New, monospace',
      fontSize: '12px',
      color: '#888888'
    }).setOrigin(0.5, 0.5).setDepth(20);

    // Typing engine
    this.typingEngine = new TypingEngine(this);

    // Dummy target management
    this.dummies = [];
    this.dummyCapacity = 4;

    // Spawn initial dummies
    for (let i = 0; i < 4; i++) {
      this._spawnDummy(i);
    }

    this.typingEngine.enable();

    // Word complete handler
    this.events.on('WORD_COMPLETE', ({ enemy, word, perfect, cps, accuracy }) => {
      this.wordsTyped++;
      audioManager.playWordComplete(perfect);
      FloatingText.spawn(this, enemy.x || W / 2, H / 2, perfect ? '⚡ PERFECT!' : '✓', perfect ? '#ffff00' : '#00ff88', perfect ? '20px' : '16px');

      // Immediately replace
      const idx = this.dummies.indexOf(enemy);
      if (idx !== -1) {
        this._replaceDummy(idx, enemy);
      }
    });

    this.events.on('WORD_WRONG', () => {
      audioManager.playWrong();
    });

    // Update stats every second
    this.time.addEvent({
      delay: 1000,
      loop: true,
      callback: this._updateStats,
      callbackScope: this
    });

    // Back button
    const backBg = this.add.rectangle(60, H - 20, 100, 28, 0x111122)
      .setInteractive({ useHandCursor: true })
      .setStrokeStyle(1, 0x334466);
    const backTxt = this.add.text(60, H - 20, '← MENU', {
      fontFamily: 'Courier New, monospace',
      fontSize: '12px',
      color: '#888888'
    }).setOrigin(0.5);
    backBg.on('pointerover', () => { backBg.setFillStyle(0x222244); backTxt.setStyle({ color: '#ffffff' }); });
    backBg.on('pointerout', () => { backBg.setFillStyle(0x111122); backTxt.setStyle({ color: '#888888' }); });
    backBg.on('pointerdown', () => {
      this.typingEngine.destroy();
      this.cameras.main.fadeOut(300, 0, 0, 0);
      this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('MainMenuScene'));
    });

    this.input.keyboard.once('keydown-ESC', () => {
      this.typingEngine.destroy();
      this.scene.start('MainMenuScene');
    });

    this.cameras.main.fadeIn(400, 0, 0, 0);
  }

  _spawnDummy(slotIndex) {
    const { W, H } = this;
    const slots = [W * 0.18, W * 0.38, W * 0.62, W * 0.82];
    const x = slots[slotIndex] || Phaser.Math.Between(120, W - 120);
    const y = H - 130;
    const avgCPS = this.typingEngine?.getAverageCPS?.() || 3;

    // Visual dummy: simple target circle
    const gfx = this.add.graphics().setDepth(3);
    gfx.lineStyle(3, 0x4444aa);
    gfx.strokeCircle(x, y + 10, 22);
    gfx.lineStyle(1, 0x222244);
    gfx.strokeCircle(x, y + 10, 14);
    gfx.lineStyle(1, 0x222244);
    gfx.strokeCircle(x, y + 10, 6);

    // Dummy target object
    const word = getWordForDifficulty(avgCPS).toUpperCase();
    const label = new WordLabel(this, x, y - 30, word);
    label.setDepth(10);

    const dummy = {
      alive: true,
      currentWord: word,
      x,
      y,
      gfx,
      label,
      _slot: slotIndex,
      onProgress: (typed) => label.setProgress(typed),
      onWrong: () => label.showError()
    };

    this.typingEngine.registerTarget(dummy);
    this.dummies[slotIndex] = dummy;
    return dummy;
  }

  _replaceDummy(idx, old) {
    old.alive = false;
    old.label?.explode();
    this.typingEngine.unregisterTarget(old);
    old.gfx?.destroy();

    // Brief delay then respawn
    this.time.delayedCall(400, () => {
      this._spawnDummy(idx);
    });
  }

  _updateStats() {
    const elapsed = (Date.now() - this.startTime) / 1000;
    const avgCPS = this.typingEngine?.getAverageCPS?.() || 0;
    const wpm = Math.round(avgCPS * 12);
    const acc = this.typingEngine?.getAccuracy?.() || 1;
    this.statsTxt.setText(
      `Words: ${this.wordsTyped}  |  WPM: ~${wpm}  |  Accuracy: ${Math.round(acc * 100)}%  |  Time: ${Math.floor(elapsed)}s`
    );
  }

  shutdown() {
    this.typingEngine?.destroy();
    this.events.removeAllListeners();
  }
}
