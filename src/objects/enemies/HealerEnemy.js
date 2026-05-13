import { BaseEnemy } from './BaseEnemy.js';
import { FloatingText } from '../FloatingText.js';

export class HealerEnemy extends BaseEnemy {
  constructor(scene, x, y) {
    super(scene, x, y, {
      hp: 45, damage: 1,
      attackInterval: 8000,
      attackWarningTime: 2500,
      wordTierBonus: 0.5,
      attackType: 'magic'
    });

    this._healTimer = null;
    this._startHealCycle();
  }

  _buildGraphics() {
    this.container = this.scene.add.container(this.x, this.y - 200);
    this.container.setDepth(4);

    // Robe body - white/green
    this.robe = this.scene.add.triangle(0, 10, 0, -25, -18, 25, 18, 25, 0xeeeecc);
    this.robe.setStrokeStyle(2, 0x88ff88);

    // Head
    this.head = this.scene.add.circle(0, -30, 11, 0xffeedd);
    this.head.setStrokeStyle(2, 0xaaffaa);

    // Halo
    this.halo = this.scene.add.arc(0, -45, 10, 0, 360, false, 0xffff00);
    this.halo.setStrokeStyle(2, 0xffff88);
    this.halo.setFillStyle(0x000000, 0);

    // Staff with healing orb
    this.staff = this.scene.add.rectangle(-18, -5, 4, 45, 0x886644);
    this.orb = this.scene.add.circle(-18, -28, 7, 0x88ff88);
    this.orb.setStrokeStyle(2, 0xccffcc);

    // Pulsing heal aura
    this.scene.tweens.add({
      targets: this.orb,
      scaleX: 1.4, scaleY: 1.4,
      alpha: 0.6,
      duration: 800,
      yoyo: true,
      repeat: -1
    });

    // Halo spin
    this.scene.tweens.add({
      targets: this.halo,
      angle: 360,
      duration: 3000,
      repeat: -1
    });

    this.container.add([this.robe, this.head, this.halo, this.staff, this.orb]);
    this._buildHUD();
  }

  _startHealCycle() {
    // Heal nearby enemies every 5 seconds
    this._healTimer = this.scene.time.addEvent({
      delay: 5000,
      loop: true,
      callback: () => {
        if (this.alive) {
          this._healNearby();
        }
      }
    });
  }

  _healNearby() {
    const healRange = 150;
    const healAmount = 10;

    // Find damaged enemies within range
    this.scene.enemies.forEach(enemy => {
      if (enemy !== this && enemy.alive && enemy.hp < enemy.maxHP) {
        const dist = Math.abs(enemy.x - this.x);
        if (dist < healRange) {
          enemy.hp = Math.min(enemy.maxHP, enemy.hp + healAmount);
          enemy._updateHPBar();
          FloatingText.spawn(this.scene, enemy.x, enemy.y - 50, `+${healAmount}`, '#88ff88', '14px');

          // Heal visual
          this.scene.tweens.add({
            targets: enemy.container,
            alpha: 0.7,
            duration: 200,
            yoyo: true
          });
        }
      }
    });

    // Self heal visual
    this._tintColor(0x88ff88, 500);
  }

  _die() {
    if (this._healTimer) this._healTimer.destroy();
    super._die();
  }
}
