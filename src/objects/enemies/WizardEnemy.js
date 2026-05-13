import { BaseEnemy } from './BaseEnemy.js';

export class WizardEnemy extends BaseEnemy {
  constructor(scene, x, y) {
    super(scene, x, y, {
      hp: 40, damage: 1,
      attackInterval: 7000, // Increased for easier gameplay
      attackWarningTime: 2000,
      wordTierBonus: 1.5,
      attackType: 'magic'
    });

    // Wizard refreshes its word every 4s
    this._refreshTimer = this.scene.time.addEvent({
      delay: 4000,
      loop: true,
      callback: () => {
        if (this.alive) {
          // If player is mid-typing this enemy, unregister first
          const engine = this.scene.typingEngine;
          if (engine?.lockedTarget === this) {
            engine._clearTarget?.();
          }
          this._assignWord();
          // Visual flash to signal refresh
          this._tintColor(0x8844ff, 400);
        }
      }
    });
  }

  _buildGraphics() {
    this.container = this.scene.add.container(this.x, this.y - 200);
    this.container.setDepth(4);

    // Triangle robe body
    this.robe = this.scene.add.triangle(0, 10, 0, -30, -20, 30, 20, 30, 0x2244cc);
    this.robe.setStrokeStyle(2, 0x6688ff);

    // Head circle
    this.head = this.scene.add.circle(0, -32, 12, 0x4466dd);
    this.head.setStrokeStyle(2, 0x99aaff);

    // Hat
    this.hat = this.scene.add.triangle(0, -44, 0, -20, -11, 0, 11, 0, 0x1122aa);
    this.hatBrim = this.scene.add.rectangle(0, -44, 26, 5, 0x1122aa);

    // Glowing eye
    this.eye = this.scene.add.circle(0, -33, 4, 0x00ffff);

    // Staff
    this.staff = this.scene.add.rectangle(-18, -5, 4, 50, 0x7755aa);
    this.orb = this.scene.add.circle(-18, -30, 7, 0x8844ff);
    this.orb.setStrokeStyle(2, 0xcc88ff);

    // Floating particles effect (simple pulsing)
    this.scene.tweens.add({
      targets: this.orb,
      scaleX: 1.3, scaleY: 1.3,
      duration: 600,
      yoyo: true,
      repeat: -1
    });

    this.container.add([this.robe, this.head, this.hat, this.hatBrim,
                        this.eye, this.staff, this.orb]);
    this._buildHUD();
  }

  _die() {
    if (this._refreshTimer) this._refreshTimer.destroy();
    super._die();
  }
}
