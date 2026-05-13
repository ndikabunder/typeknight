import { BaseEnemy } from './BaseEnemy.js';
import { FloatingText } from '../FloatingText.js';

export class BomberEnemy extends BaseEnemy {
  constructor(scene, x, y) {
    super(scene, x, y, {
      hp: 40, damage: 2,
      attackInterval: 4000,
      attackWarningTime: 1500,
      wordTierBonus: 0,
      attackType: 'explosion'
    });

    this._fuseTimer = null;
    this._exploding = false;
  }

  _buildGraphics() {
    this.container = this.scene.add.container(this.x, this.y - 200);
    this.container.setDepth(4);

    // Round body - like a bomb
    this.body = this.scene.add.circle(0, 0, 22, 0x333333);
    this.body.setStrokeStyle(3, 0x666666);

    // Fuse on top
    this.fuse = this.scene.add.rectangle(0, -25, 4, 15, 0x886644);

    // Spark at fuse tip
    this.spark = this.scene.add.circle(0, -32, 4, 0xff6600);
    this.scene.tweens.add({
      targets: this.spark,
      alpha: 0.3,
      scaleX: 1.5, scaleY: 1.5,
      duration: 150,
      yoyo: true,
      repeat: -1
    });

    // Angry eyes
    this.eyeL = this.scene.add.circle(-7, -5, 4, 0xff0000);
    this.eyeR = this.scene.add.circle(7, -5, 4, 0xff0000);

    // Evil grin
    this.mouth = this.scene.add.arc(0, 5, 10, 0, 180, false, 0xff4444);
    this.mouth.setStrokeStyle(2, 0xff6666);

    this.container.add([this.body, this.fuse, this.spark, this.eyeL, this.eyeR, this.mouth]);
    this._buildHUD();
  }

  _fireAttack() {
    if (!this.alive || this._exploding) return;

    // Start explosion countdown
    this._startExplosion();
  }

  _startExplosion() {
    this._exploding = true;
    FloatingText.spawn(this.scene, this.x, this.y - 60, '💥 EXPLODING!', '#ff4400', '16px');

    // Flash rapidly
    let flashCount = 0;
    this._fuseTimer = this.scene.time.addEvent({
      delay: 200,
      repeat: 5,
      callback: () => {
        flashCount++;
        if (flashCount % 2 === 0) {
          this._tintColor(0xff4400, 100);
        }
      }
    });

    // Explode after 1.2 seconds
    this.scene.time.delayedCall(1200, () => {
      if (this.alive) {
        this._explode();
      }
    });
  }

  _explode() {
    // Damage player if not killed in time
    this.scene.events.emit('ENEMY_ATTACK', {
      enemy: this,
      damage: this.baseDamage,
      attackType: 'explosion'
    });

    // Visual explosion
    const explosion = this.scene.add.circle(this.x, this.y, 10, 0xff6600);
    explosion.setDepth(6);
    this.scene.tweens.add({
      targets: explosion,
      scaleX: 5, scaleY: 5,
      alpha: 0,
      duration: 300,
      onComplete: () => explosion.destroy()
    });

    // Camera shake
    this.scene.cameras.main.shake(200, 0.015);

    // Die after explosion
    this.hp = 0;
    this._die();
  }

  receiveDamage(amount, special) {
    super.receiveDamage(amount, special);

    // If killed before explosion, cancel it
    if (this.hp <= 0 && this._fuseTimer) {
      this._fuseTimer.destroy();
      this._exploding = false;
    }
  }

  _die() {
    if (this._fuseTimer) this._fuseTimer.destroy();
    super._die();
  }
}
