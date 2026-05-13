import { BaseEnemy } from './BaseEnemy.js';
import { FloatingText } from '../FloatingText.js';

export class IceElemental extends BaseEnemy {
  constructor(scene, x, y) {
    super(scene, x, y, {
      hp: 50, damage: 1,
      attackInterval: 7000,
      attackWarningTime: 2500,
      wordTierBonus: 1,
      attackType: 'ice'
    });

    this._slowApplied = false;
  }

  _buildGraphics() {
    this.container = this.scene.add.container(this.x, this.y - 200);
    this.container.setDepth(4);

    // Crystalline body
    this.body = this.scene.add.polygon(0, 0, [0, -25, 20, 0, 15, 25, -15, 25, -20, 0], 0x88ddff);
    this.body.setStrokeStyle(2, 0xaaeeff);

    // Ice crystals
    this.crystal1 = this.scene.add.triangle(-15, -10, 0, -15, -10, 5, 5, 5, 0x66ccee);
    this.crystal2 = this.scene.add.triangle(15, -5, 0, -12, -8, 4, 8, 8, 0x66ccee);

    // Core glow
    this.core = this.scene.add.circle(0, 5, 10, 0xccffff);
    this.scene.tweens.add({
      targets: this.core,
      scaleX: 1.3, scaleY: 1.3,
      alpha: 0.6,
      duration: 600,
      yoyo: true,
      repeat: -1
    });

    // Eyes
    this.eyeL = this.scene.add.circle(-6, -5, 4, 0x0044aa);
    this.eyeR = this.scene.add.circle(6, -5, 4, 0x0044aa);

    this.container.add([this.body, this.crystal1, this.crystal2, this.core, this.eyeL, this.eyeR]);
    this._buildHUD();

    // Shimmer effect
    this.scene.tweens.add({
      targets: this.container,
      alpha: 0.85,
      duration: 800,
      yoyo: true,
      repeat: -1
    });
  }

  _fireAttack() {
    if (!this.alive) return;

    // Ice attack slows player's typing
    this.scene.events.emit('ENEMY_ATTACK', {
      enemy: this,
      damage: this.baseDamage,
      attackType: 'ice',
      effect: 'slow_typing'
    });

    FloatingText.spawn(this.scene, this.x, this.y - 50, '❄️ FREEZE!', '#88ccff', '16px');

    // Apply slow to all enemies (buffs them)
    this.scene.enemies.forEach(enemy => {
      if (enemy.alive && enemy !== this) {
        enemy.slowed = false; // Ice enemies aren't slowed
      }
    });

    this._attackAnim();
  }

  receiveDamage(amount, special) {
    super.receiveDamage(amount, special);

    // When damaged, chance to slow player's next word
    if (this.alive && Math.random() < 0.3 && !this._slowApplied) {
      this._slowApplied = true;
      this.scene.events.emit('PLAYER_SLOWED', { duration: 2000 });
      FloatingText.spawn(this.scene, this.x, this.y - 40, '🥶 SLOW!', '#88ccff', '14px');

      this.scene.time.delayedCall(3000, () => {
        this._slowApplied = false;
      });
    }
  }
}
