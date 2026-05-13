import { BaseEnemy } from './BaseEnemy.js';

export class SwarmEnemy extends BaseEnemy {
  constructor(scene, x, y) {
    super(scene, x, y, {
      hp: 15, damage: 1,
      attackInterval: 5000,
      attackWarningTime: 1500,
      wordTierBonus: -1, // Easier words
      attackType: 'swarm'
    });

    this.swarmBonus = true; // Flag for swarm damage bonus
  }

  _buildGraphics() {
    this.container = this.scene.add.container(this.x, this.y - 200);
    this.container.setDepth(4);

    // Very small, fast-looking body
    this.body = this.scene.add.ellipse(0, 5, 20, 26, 0x88aa22);
    this.body.setStrokeStyle(1.5, 0xaacc44);

    // Tiny head
    this.head = this.scene.add.circle(0, -14, 8, 0x88aa22);
    this.head.setStrokeStyle(1.5, 0xaacc44);

    // Quick eyes
    this.eyeL = this.scene.add.circle(-3, -15, 2, 0xff0000);
    this.eyeR = this.scene.add.circle(3, -15, 2, 0xff0000);

    // Tiny claws
    this.clawL = this.scene.add.triangle(-10, 5, 0, 0, -6, 8, 0, 12, 0x666600);
    this.clawR = this.scene.add.triangle(10, 5, 0, 0, 6, 8, 0, 12, 0x666600);

    this.container.add([this.body, this.head, this.eyeL, this.eyeR, this.clawL, this.clawR]);
    this._buildHUD();

    // Quick bobbing animation
    this.scene.tweens.add({
      targets: this.container,
      y: this.y - 5,
      duration: 200,
      yoyo: true,
      repeat: -1
    });
  }

  _spawnAnim() {
    // Faster spawn
    this.scene.tweens.add({
      targets: this.container,
      y: this.y,
      duration: 200,
      ease: 'Bounce.easeOut'
    });
  }
}
