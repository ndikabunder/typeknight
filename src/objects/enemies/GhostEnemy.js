import { BaseEnemy } from './BaseEnemy.js';

export class GhostEnemy extends BaseEnemy {
  constructor(scene, x, y) {
    super(scene, x, y, {
      hp: 30, damage: 1,
      attackInterval: 7000,
      attackWarningTime: 2000,
      wordTierBonus: 0.5,
      attackType: 'ghost' // Passes through shields
    });

    this._phaseTimer = null;
    this._phasedOut = false;
    this._startPhaseCycle();
  }

  _buildGraphics() {
    this.container = this.scene.add.container(this.x, this.y - 200);
    this.container.setDepth(4);
    this.container.setAlpha(0.7);

    // Ghostly body - wavy bottom
    this.body = this.scene.add.ellipse(0, 0, 32, 40, 0xaaccff);
    this.body.setStrokeStyle(2, 0xccddff);

    // Wavy tail
    this.tail1 = this.scene.add.arc(-8, 25, 8, 0, 180, false, 0xaaccff);
    this.tail2 = this.scene.add.arc(8, 25, 8, 180, 360, false, 0xaaccff);

    // Head
    this.head = this.scene.add.circle(0, -15, 16, 0xbbddff);
    this.head.setStrokeStyle(2, 0xddeeff);

    // Hollow eyes
    this.eyeL = this.scene.add.circle(-6, -18, 5, 0x000044);
    this.eyeR = this.scene.add.circle(6, -18, 5, 0x000044);

    // Sad mouth
    this.mouth = this.scene.add.arc(0, -8, 5, 180, 360, false, 0x000044);

    this.container.add([this.body, this.tail1, this.tail2, this.head, this.eyeL, this.eyeR, this.mouth]);
    this._buildHUD();

    // Floating animation
    this.scene.tweens.add({
      targets: this.container,
      y: this.y - 15,
      duration: 1500,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });
  }

  _startPhaseCycle() {
    // Phase out every 4 seconds for 2 seconds
    this._phaseTimer = this.scene.time.addEvent({
      delay: 4000,
      loop: true,
      callback: () => {
        if (this.alive) {
          this._phaseOut();
        }
      }
    });
  }

  _phaseOut() {
    this._phasedOut = true;

    // Become nearly invisible
    this.scene.tweens.add({
      targets: this.container,
      alpha: 0.15,
      duration: 300
    });

    // Word becomes harder to see
    if (this.wordLabel) {
      this.scene.tweens.add({
        targets: this.wordLabel.container,
        alpha: 0.3,
        duration: 300
      });
    }

    // Return after 2 seconds
    this.scene.time.delayedCall(2000, () => {
      if (this.alive) {
        this._phaseIn();
      }
    });
  }

  _phaseIn() {
    this._phasedOut = false;

    this.scene.tweens.add({
      targets: this.container,
      alpha: 0.7,
      duration: 300
    });

    if (this.wordLabel) {
      this.scene.tweens.add({
        targets: this.wordLabel.container,
        alpha: 1,
        duration: 300
      });
    }
  }

  receiveDamage(amount, special) {
    // If phased out, reduce damage
    if (this._phasedOut) {
      amount = Math.floor(amount * 0.5);
    }
    super.receiveDamage(amount, special);
  }

  _die() {
    if (this._phaseTimer) this._phaseTimer.destroy();
    super._die();
  }
}
