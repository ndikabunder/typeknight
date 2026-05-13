import { BaseEnemy } from './BaseEnemy.js';
import { WordLabel } from '../WordLabel.js';
import { FloatingText } from '../FloatingText.js';

export class ArcherEnemy extends BaseEnemy {
  constructor(scene, x, y) {
    super(scene, x, y, {
      hp: 35, damage: 1,
      attackInterval: 6000,
      attackWarningTime: 2000,
      wordTierBonus: 1.5, // Longer words
      attackType: 'ranged'
    });

    this._chargeArrowTimer = null;
  }

  _buildGraphics() {
    this.container = this.scene.add.container(this.x, this.y - 200);
    this.container.setDepth(4);

    // Lean body
    this.body = this.scene.add.rectangle(0, 5, 28, 40, 0x446688);
    this.body.setStrokeStyle(2, 0x6688aa);

    // Hooded head
    this.head = this.scene.add.circle(0, -20, 12, 0x446688);
    this.head.setStrokeStyle(2, 0x6688aa);

    // Hood shadow
    this.hood = this.scene.add.arc(0, -18, 14, 200, 340, false, 0x334466);

    // Eyes in shadow
    this.eyeL = this.scene.add.circle(-4, -22, 2, 0xaaccff);
    this.eyeR = this.scene.add.circle(4, -22, 2, 0xaaccff);

    // Bow
    this.bow = this.scene.add.arc(-20, 0, 25, 280, 440, false, 0x886644);
    this.bow.setStrokeStyle(3, 0xaa8866);

    // Arrow (hidden until attack)
    this.arrow = this.scene.add.triangle(-15, 0, 0, 0, 15, 4, 0, 8, 0xcccccc);
    this.arrow.setVisible(false);

    this.container.add([this.body, this.head, this.hood, this.eyeL, this.eyeR, this.bow, this.arrow]);
    this._buildHUD();
  }

  _fireAttack() {
    if (!this.alive) return;

    // Show arrow charging
    this.arrow.setVisible(true);
    this._chargeArrowTimer = this.scene.time.addEvent({
      delay: 100,
      repeat: 10,
      callback: () => {
        if (this.alive) {
          this.arrow.x += 2;
        }
      }
    });

    // Fire after warning
    this.scene.time.delayedCall(this.attackWarningTime - 500, () => {
      if (this.alive) {
        this._shootArrow();
      }
    });
  }

  _shootArrow() {
    // Arrow flies toward player
    this.scene.tweens.add({
      targets: this.arrow,
      x: -300,
      duration: 300,
      ease: 'Power2',
      onComplete: () => {
        this.arrow.setVisible(false);
        this.arrow.x = -15;
      }
    });

    this.scene.events.emit('ENEMY_ATTACK', {
      enemy: this,
      damage: this.baseDamage,
      attackType: 'ranged'
    });
  }

  _die() {
    if (this._chargeArrowTimer) this._chargeArrowTimer.destroy();
    super._die();
  }
}
