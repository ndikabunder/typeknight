import { BaseEnemy } from './BaseEnemy.js';

export class ShadowEnemy extends BaseEnemy {
  constructor(scene, x, y) {
    super(scene, x, y, {
      hp: 35, damage: 1,
      attackInterval: 6000, // Increased for easier gameplay
      attackWarningTime: 2000,
      wordTierBonus: 0,
      attackType: 'shadow' // cannot be blocked, only dodged
    });
  }

  _buildGraphics() {
    this.container = this.scene.add.container(this.x, this.y - 200);
    this.container.setDepth(4);
    this.container.setAlpha(0.75); // semi-transparent

    // Dark circle body
    this.body = this.scene.add.circle(0, 0, 18, 0x222233);
    this.body.setStrokeStyle(2, 0x6655aa);

    // Cloak
    this.cloak = this.scene.add.triangle(0, 15, 0, -15, -16, 25, 16, 25, 0x111122);
    this.cloak.setStrokeStyle(1, 0x4433aa);

    // Glowing eyes
    this.eyeL = this.scene.add.circle(-6, -2, 3, 0xaa00ff);
    this.eyeR = this.scene.add.circle(6, -2, 3, 0xaa00ff);

    this.container.add([this.cloak, this.body, this.eyeL, this.eyeR]);
    this._buildHUD();

    // Pulse opacity
    this.scene.tweens.add({
      targets: this.container,
      alpha: 0.4,
      duration: 1000,
      yoyo: true,
      repeat: -1
    });
  }

  _assignWord(forceWord = null) {
    // Clear any pending hide timeout before assigning new word
    if (this._wordHideTimeout) {
      clearTimeout(this._wordHideTimeout);
      this._wordHideTimeout = null;
    }
    this.wordHidden = false;

    super._assignWord(forceWord);

    // Hide word after 1 second (unless keenEye upgrade)
    if (this.scene.upgradeManager?.bonuses?.keenEye) return;

    this._wordHideTimeout = setTimeout(() => {
      if (this.alive && this.wordLabel) {
        const word = this.currentWord;
        const hiddenWord = word.split('').map(() => '?').join('');
        // Only hide if player hasn't started typing this word
        if (this.scene.typingEngine?.lockedTarget !== this) {
          this.wordLabel.updateCharTexts(hiddenWord);
        }
        // Always track original for matching
        this.currentWord = word;
        this.wordHidden = true;
      }
    }, 1000);
  }

  // Override onProgress to show typed chars, keep rest as '?'
  onProgress(typed) {
    if (!this.wordLabel) return;
    if (this.wordHidden && typed.length > 0) {
      // Show original chars for typed portion, '?' for the rest
      const display = this.currentWord.split('').map((c, i) =>
        i < typed.length ? c : '?'
      ).join('');
      this.wordLabel.updateCharTexts(display);
    } else if (!this.wordHidden) {
      this.wordLabel.updateCharTexts(this.currentWord);
    }
    this.wordLabel.setProgress(typed);
  }
}
