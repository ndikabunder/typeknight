import { BaseEnemy } from './BaseEnemy.js';
import { WordLabel } from '../WordLabel.js';
import { FloatingText } from '../FloatingText.js';

export class ShieldEnemy extends BaseEnemy {
  constructor(scene, x, y) {
    super(scene, x, y, {
      hp: 80, damage: 1,
      attackInterval: 9000, // Increased for easier gameplay
      attackWarningTime: 2500,
      wordTierBonus: 0.5,
      attackType: 'normal'
    });

    this.shielded = true; // Must be flipped first
    this._showFlipWord();
  }

  _buildGraphics() {
    this.container = this.scene.add.container(this.x, this.y - 200);
    this.container.setDepth(4);

    // Body
    this.body = this.scene.add.rectangle(0, 5, 38, 44, 0xdd6600);
    this.body.setStrokeStyle(2, 0xff9922);

    // Head
    this.head = this.scene.add.circle(0, -22, 13, 0xdd6600);
    this.head.setStrokeStyle(2, 0xff9922);

    // Eyes
    this.eyeL = this.scene.add.circle(-5, -24, 3, 0x000000);
    this.eyeR = this.scene.add.circle(5, -24, 3, 0x000000);

    // Shield (large rectangle in front)
    this.shield = this.scene.add.rectangle(-18, 0, 18, 42, 0x5588cc);
    this.shield.setStrokeStyle(3, 0x88aaff);
    // Shield emblem
    this.emblem = this.scene.add.star(-18, 0, 5, 4, 8, 0xffd700);

    this.container.add([this.body, this.head, this.eyeL, this.eyeR,
                        this.shield, this.emblem]);
    this._buildHUD();
  }

  _showFlipWord() {
    // Show FLIP or TURN word above normal word, pulsing
    const word = Math.random() < 0.5 ? 'FLIP' : 'TURN';
    if (this._flipLabel) this._flipLabel.destroy();
    this._flipLabel = new WordLabel(this.scene, this.x, this.y - 85, word);
    this._flipLabel.setDepth(11);

    // Register this as the current target word
    this.currentWord = word;
    if (this.wordLabel) this.wordLabel.destroy();
    this.wordLabel = this._flipLabel;
    this._flipLabel = null;

    this.scene.typingEngine?.registerTarget(this);
  }

  // Override receiveDamage — if shielded, bounce back and show FLIP word
  receiveDamage(amount, special = null) {
    if (this.shielded) {
      // Show "SHIELDED!" and bounce
      FloatingText.spawn(this.scene, this.x, this.y - 40, 'BLOCKED!', '#88aaff', '16px');
      this.scene.tweens.add({
        targets: this.container,
        x: this.x + 20,
        duration: 80,
        yoyo: true
      });
      return; // no damage
    }
    super.receiveDamage(amount, special);
  }

  // Called when player types FLIP/TURN
  flip() {
    this.shielded = false;
    this.flipped = true;

    // Animate shield flying away
    this.scene.tweens.add({
      targets: this.shield,
      x: -100,
      alpha: 0,
      duration: 300,
      ease: 'Power2',
      onComplete: () => this.shield.destroy()
    });
    this.scene.tweens.add({
      targets: this.emblem,
      x: -100,
      alpha: 0,
      duration: 300,
      ease: 'Power2',
      onComplete: () => this.emblem.destroy()
    });

    FloatingText.spawn(this.scene, this.x, this.y - 40, 'FLIPPED!', '#ffaa00', '18px');

    // Now assign a real attack word
    this.scene.time.delayedCall(300, () => {
      if (this.alive) this._assignWord();
    });
  }
}
