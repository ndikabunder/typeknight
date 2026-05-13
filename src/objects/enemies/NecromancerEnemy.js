import { BaseEnemy } from './BaseEnemy.js';
import { FloatingText } from '../FloatingText.js';

export class NecromancerEnemy extends BaseEnemy {
  constructor(scene, x, y) {
    super(scene, x, y, {
      hp: 55, damage: 1,
      attackInterval: 9000,
      attackWarningTime: 2500,
      wordTierBonus: 1.5,
      attackType: 'magic'
    });

    this._summonTimer = null;
    this._summonCount = 0;
    this._maxSummons = 3;
    this._startSummonCycle();
  }

  _buildGraphics() {
    this.container = this.scene.add.container(this.x, this.y - 200);
    this.container.setDepth(4);

    // Dark robe
    this.robe = this.scene.add.triangle(0, 10, 0, -30, -22, 30, 22, 30, 0x220033);
    this.robe.setStrokeStyle(2, 0x440066);

    // Hood
    this.hood = this.scene.add.arc(0, -25, 18, 200, 340, false, 0x110022);
    this.hood.setStrokeStyle(2, 0x330044);

    // Face in shadow
    this.face = this.scene.add.circle(0, -25, 10, 0x220022);

    // Glowing purple eyes
    this.eyeL = this.scene.add.circle(-4, -27, 3, 0xaa00ff);
    this.eyeR = this.scene.add.circle(4, -27, 3, 0xaa00ff);

    // Staff with skull
    this.staff = this.scene.add.rectangle(-22, -5, 4, 50, 0x442200);
    this.skull = this.scene.add.circle(-22, -30, 8, 0xcccccc);
    this.skull.setStrokeStyle(1, 0xaaaaaa);
    this.skullEyes = this.scene.add.rectangle(-22, -32, 8, 3, 0x660066);

    // Dark aura
    this.aura = this.scene.add.circle(0, 0, 35, 0x440066, 0.2);
    this.scene.tweens.add({
      targets: this.aura,
      scaleX: 1.3, scaleY: 1.3,
      alpha: 0.4,
      duration: 1000,
      yoyo: true,
      repeat: -1
    });

    this.container.add([this.aura, this.robe, this.hood, this.face, this.eyeL, this.eyeR, this.staff, this.skull, this.skullEyes]);
    this._buildHUD();
  }

  _startSummonCycle() {
    // Summon skeletons every 6 seconds
    this._summonTimer = this.scene.time.addEvent({
      delay: 6000,
      loop: true,
      callback: () => {
        if (this.alive && this._summonCount < this._maxSummons) {
          this._summonSkeleton();
        }
      }
    });
  }

  _summonSkeleton() {
    this._summonCount++;

    // Visual summon effect
    FloatingText.spawn(this.scene, this.x, this.y - 70, '💀 SUMMON!', '#aa00ff', '16px');

    // Purple summon circle
    const circle = this.scene.add.circle(this.x + Phaser.Math.Between(-50, 50), this.y, 20, 0x660066, 0.5);
    circle.setDepth(3);
    this.scene.tweens.add({
      targets: circle,
      scaleX: 2, scaleY: 2,
      alpha: 0,
      duration: 500,
      onComplete: () => circle.destroy()
    });

    // Emit summon event - GameScene will handle spawning
    this.scene.events.emit('NECROMANCER_SUMMON', {
      x: this.x + Phaser.Math.Between(-50, 50),
      y: this.y,
      type: 'skeleton'
    });
  }

  _fireAttack() {
    if (!this.alive) return;

    // Dark magic attack
    this.scene.events.emit('ENEMY_ATTACK', {
      enemy: this,
      damage: this.baseDamage,
      attackType: 'magic'
    });

    this._attackAnim();
  }

  _die() {
    if (this._summonTimer) this._summonTimer.destroy();
    super._die();
  }
}
