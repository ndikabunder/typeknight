import { BaseEnemy } from './BaseEnemy.js';
import { FloatingText } from '../FloatingText.js';

export class VoidCreature extends BaseEnemy {
  constructor(scene, x, y) {
    super(scene, x, y, {
      hp: 60, damage: 2,
      attackInterval: 6000,
      attackWarningTime: 2000,
      wordTierBonus: 2,
      attackType: 'void'
    });

    this._teleportTimer = null;
    this._startTeleportCycle();
  }

  _buildGraphics() {
    this.container = this.scene.add.container(this.x, this.y - 200);
    this.container.setDepth(4);

    // Amorphous void body
    this.body = this.scene.add.polygon(0, 0, [
      0, -25, 15, -20, 22, -5, 18, 15, 5, 25, -5, 25, -18, 15, -22, -5, -15, -20
    ], 0x110022);
    this.body.setStrokeStyle(2, 0x440066);

    // Inner void
    this.innerVoid = this.scene.add.circle(0, 0, 15, 0x000011);

    // Void eyes - multiple
    this.eye1 = this.scene.add.circle(-8, -10, 5, 0x8800ff);
    this.eye2 = this.scene.add.circle(8, -10, 5, 0x8800ff);
    this.eye3 = this.scene.add.circle(0, 5, 4, 0x6600cc);

    // Void particles
    this.particles = [];
    for (let i = 0; i < 6; i++) {
      const p = this.scene.add.circle(
        Phaser.Math.Between(-20, 20),
        Phaser.Math.Between(-20, 20),
        Phaser.Math.Between(2, 4),
        0x660066
      );
      this.particles.push(p);
    }

    this.container.add([this.body, this.innerVoid, this.eye1, this.eye2, this.eye3, ...this.particles]);
    this._buildHUD();

    // Void pulsing
    this.scene.tweens.add({
      targets: this.innerVoid,
      scaleX: 1.5, scaleY: 1.5,
      duration: 800,
      yoyo: true,
      repeat: -1
    });

    // Particle orbit
    this.particles.forEach((p, i) => {
      this.scene.tweens.add({
        targets: p,
        angle: 360,
        duration: 2000 + i * 300,
        repeat: -1
      });
    });
  }

  _startTeleportCycle() {
    // Teleport every 5 seconds
    this._teleportTimer = this.scene.time.addEvent({
      delay: 5000,
      loop: true,
      callback: () => {
        if (this.alive) {
          this._teleport();
        }
      }
    });
  }

  _teleport() {
    // Fade out
    this.scene.tweens.add({
      targets: this.container,
      alpha: 0,
      scaleX: 0.5, scaleY: 0.5,
      duration: 300,
      onComplete: () => {
        // Move to new position
        const newX = Phaser.Math.Between(100, this.scene.W - 100);
        this.x = newX;
        this.container.x = newX;

        // Fade in
        this.scene.tweens.add({
          targets: this.container,
          alpha: 1,
          scaleX: 1, scaleY: 1,
          duration: 300
        });

        FloatingText.spawn(this.scene, this.x, this.y - 60, '⚡ TELEPORT!', '#aa00ff', '14px');
      }
    });
  }

  _fireAttack() {
    if (!this.alive) return;

    // Void attack - can't be blocked
    this.scene.events.emit('ENEMY_ATTACK', {
      enemy: this,
      damage: this.baseDamage,
      attackType: 'void'
    });

    FloatingText.spawn(this.scene, this.x, this.y - 50, '🌑 VOID!', '#660066', '16px');
    this._attackAnim();
  }

  receiveDamage(amount, special) {
    // Void creatures take reduced damage from non-void attacks
    if (special?.effect !== 'void') {
      amount = Math.floor(amount * 0.75);
    }
    super.receiveDamage(amount, special);
  }

  _die() {
    if (this._teleportTimer) this._teleportTimer.destroy();
    super._die();
  }
}
