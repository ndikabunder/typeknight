import { BaseEnemy } from './BaseEnemy.js';
import { FloatingText } from '../FloatingText.js';

export class FireElemental extends BaseEnemy {
  constructor(scene, x, y) {
    super(scene, x, y, {
      hp: 45, damage: 1,
      attackInterval: 6000,
      attackWarningTime: 2000,
      wordTierBonus: 1,
      attackType: 'fire'
    });

    this._burning = false;
  }

  _buildGraphics() {
    this.container = this.scene.add.container(this.x, this.y - 200);
    this.container.setDepth(4);

    // Flame body
    this.body = this.scene.add.polygon(0, 0, [0, -30, 18, -5, 12, 20, 0, 15, -12, 20, -18, -5], 0xff6600);
    this.body.setStrokeStyle(2, 0xffaa00);

    // Inner flame
    this.innerFlame = this.scene.add.polygon(0, 0, [0, -20, 10, 0, 6, 12, 0, 8, -6, 12, -10, 0], 0xffcc00);

    // Eyes
    this.eyeL = this.scene.add.circle(-6, -10, 4, 0xffff00);
    this.eyeR = this.scene.add.circle(6, -10, 4, 0xffff00);

    // Flame particles
    this.flameParticles = [];
    for (let i = 0; i < 5; i++) {
      const particle = this.scene.add.circle(
        Phaser.Math.Between(-15, 15),
        Phaser.Math.Between(-25, 10),
        Phaser.Math.Between(3, 6),
        0xff4400
      );
      this.flameParticles.push(particle);
      this.container.add(particle);
    }

    this.container.add([this.body, this.innerFlame, this.eyeL, this.eyeR]);
    this._buildHUD();

    // Flame flicker animation
    this.scene.tweens.add({
      targets: this.body,
      scaleX: 1.1, scaleY: 0.95,
      duration: 150,
      yoyo: true,
      repeat: -1
    });

    // Particle rising animation
    this.flameParticles.forEach((p, i) => {
      this.scene.tweens.add({
        targets: p,
        y: p.y - 20,
        alpha: 0,
        duration: 600 + i * 100,
        repeat: -1,
        onRepeat: () => {
          p.y = Phaser.Math.Between(-5, 15);
          p.x = Phaser.Math.Between(-15, 15);
          p.alpha = 1;
        }
      });
    });
  }

  _fireAttack() {
    if (!this.alive) return;

    // Fire attack burns player over time
    this.scene.events.emit('ENEMY_ATTACK', {
      enemy: this,
      damage: this.baseDamage,
      attackType: 'fire',
      effect: 'burn'
    });

    FloatingText.spawn(this.scene, this.x, this.y - 50, '🔥 BURN!', '#ff6600', '16px');
    this._attackAnim();
  }

  receiveDamage(amount, special) {
    super.receiveDamage(amount, special);

    // Fire elemental ignites when damaged - burns nearby enemies for bonus
    if (this.alive && !this._burning) {
      this._burning = true;
      this._ignite();

      this.scene.time.delayedCall(3000, () => {
        this._burning = false;
      });
    }
  }

  _ignite() {
    // Flash intensely
    this._tintColor(0xffff00, 300);

    // Small chance to damage nearby enemies (friendly fire)
    const burnRange = 80;
    this.scene.enemies.forEach(enemy => {
      if (enemy !== this && enemy.alive) {
        const dist = Math.abs(enemy.x - this.x);
        if (dist < burnRange && Math.random() < 0.2) {
          enemy.receiveDamage(5);
          FloatingText.spawn(this.scene, enemy.x, enemy.y - 30, '🔥', '#ff6600', '12px');
        }
      }
    });
  }
}
