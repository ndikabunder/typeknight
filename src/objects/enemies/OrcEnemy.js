import { BaseEnemy } from './BaseEnemy.js';
import { WordLabel } from '../WordLabel.js';
import { getWordForDifficulty } from '../../data/words.js';

export class OrcEnemy extends BaseEnemy {
  constructor(scene, x, y) {
    super(scene, x, y, {
      hp: 60, damage: 1,
      attackInterval: 8000, // Increased for easier gameplay
      attackWarningTime: 2500,
      wordTierBonus: 1,
      attackType: 'normal'
    });

    // Orcs occasionally show 2 words — player picks one
    this._dualWordTimer = null;
    this._startDualWordCycle();
  }

  _buildGraphics() {
    this.container = this.scene.add.container(this.x, this.y - 200);
    this.container.setDepth(4);

    // Big square body
    this.body = this.scene.add.rectangle(0, 5, 42, 50, 0xcc2222);
    this.body.setStrokeStyle(3, 0xff4444);

    // Head
    this.head = this.scene.add.rectangle(0, -26, 32, 28, 0xcc2222);
    this.head.setStrokeStyle(2, 0xff4444);

    // Eyes
    this.eyeL = this.scene.add.rectangle(-8, -28, 8, 6, 0x000000);
    this.eyeR = this.scene.add.rectangle(8, -28, 8, 6, 0x000000);

    // Tusk
    this.tuskL = this.scene.add.rectangle(-6, -14, 4, 8, 0xffffff);
    this.tuskR = this.scene.add.rectangle(6, -14, 4, 8, 0xffffff);

    // Axe
    this.axeHandle = this.scene.add.rectangle(24, 5, 5, 38, 0x886600);
    this.axeHead = this.scene.add.triangle(30, -12, 0, 0, 16, -10, 16, 10, 0xaaaaaa);
    this.axeHead.setStrokeStyle(1.5, 0xffffff);

    this.container.add([this.body, this.head, this.eyeL, this.eyeR,
                        this.tuskL, this.tuskR, this.axeHandle, this.axeHead]);
    this._buildHUD();
  }

  _startDualWordCycle() {
    // 30% chance to show a second word
    this._dualWordTimer = this.scene.time.addEvent({
      delay: Phaser.Math.Between(6000, 12000),
      callback: () => {
        if (this.alive && Math.random() < 0.3) {
          this._showSecondWord();
        }
      },
      loop: true
    });
  }

  _showSecondWord() {
    const w = getWordForDifficulty(this.scene.typingEngine?.getAverageCPS?.() || 3).toUpperCase();
    // Clean up previous alt word
    if (this._altLabel) this._altLabel.destroy();
    if (this._altTarget) {
      this.scene.typingEngine?.unregisterTarget(this._altTarget);
      this._altTarget = null;
    }

    // Show a second, different word slightly offset
    this._altLabel = new WordLabel(this.scene, this.x + 30, this.y - 80, w);
    this._altLabel.setDepth(10);

    // Register as typing target
    this._altTarget = {
      alive: true,
      currentWord: w,
      x: this.x + 30,
      onProgress: (typed) => this._altLabel?.setProgress(typed),
      onWrong: () => this._altLabel?.showError()
    };
    this.scene.typingEngine?.registerTarget(this._altTarget);

    // Fade it out after 3 seconds if not typed
    this.scene.time.delayedCall(3000, () => {
      if (this._altLabel) {
        this._altLabel.destroy();
        this._altLabel = null;
      }
      if (this._altTarget) {
        this.scene.typingEngine?.unregisterTarget(this._altTarget);
        this._altTarget = null;
      }
    });
  }

  _die() {
    if (this._dualWordTimer) this._dualWordTimer.destroy();
    if (this._altLabel) this._altLabel.destroy();
    if (this._altTarget) {
      this.scene.typingEngine?.unregisterTarget(this._altTarget);
      this._altTarget = null;
    }
    super._die();
  }
}
