import { BaseEnemy } from './BaseEnemy.js';

export class GoblinEnemy extends BaseEnemy {
  constructor(scene, x, y) {
    super(scene, x, y, {
      hp: 30, damage: 1,
      attackInterval: 10000, // Increased attack interval for easier gameplay
      attackWarningTime: 2000,
      wordTierBonus: 0,
      attackType: 'normal'
    });
  }

  _buildGraphics() {
    this.container = this.scene.add.container(this.x, this.y - 200);
    this.container.setDepth(4);

    // Small oval body
    this.body = this.scene.add.ellipse(0, 5, 30, 38, 0xddcc00);
    this.body.setStrokeStyle(2, 0xffee44);

    // Head
    this.head = this.scene.add.circle(0, -20, 13, 0xddcc00);
    this.head.setStrokeStyle(2, 0xffee44);

    // Eyes — beady
    this.eyeL = this.scene.add.circle(-5, -22, 3, 0x000000);
    this.eyeR = this.scene.add.circle(5, -22, 3, 0x000000);
    this.eyeL.setStrokeStyle(1, 0xff2200);
    this.eyeR.setStrokeStyle(1, 0xff2200);

    // Ear points
    this.earL = this.scene.add.triangle(-12, -25, 0, -10, -6, 0, 6, 0, 0xddcc00);
    this.earR = this.scene.add.triangle(12, -25, 0, -10, -6, 0, 6, 0, 0xddcc00);

    // Tiny dagger
    this.dagger = this.scene.add.rectangle(16, 0, 4, 20, 0xaaaaaa);
    this.dagger.setStrokeStyle(1, 0xffffff);

    this.container.add([this.body, this.head, this.earL, this.earR,
                        this.eyeL, this.eyeR, this.dagger]);
    this._buildHUD();
  }
}
