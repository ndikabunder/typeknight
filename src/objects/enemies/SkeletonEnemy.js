import { BaseEnemy } from './BaseEnemy.js';

export class SkeletonEnemy extends BaseEnemy {
  constructor(scene, x, y) {
    super(scene, x, y, {
      hp: 20, damage: 1,
      attackInterval: 5000,
      attackWarningTime: 1500,
      wordTierBonus: -0.5, // Easy words
      attackType: 'normal'
    });

    this.isSummoned = true; // Flag for summoned creatures
  }

  _buildGraphics() {
    this.container = this.scene.add.container(this.x, this.y - 200);
    this.container.setDepth(4);

    // Ribcage
    this.ribs = this.scene.add.rectangle(0, 5, 24, 30, 0xccccaa);
    this.ribs.setStrokeStyle(1, 0xaaaa88);

    // Spine
    this.spine = this.scene.add.rectangle(0, 5, 4, 35, 0xccccaa);

    // Skull
    this.skull = this.scene.add.circle(0, -20, 12, 0xccccaa);
    this.skull.setStrokeStyle(1, 0xaaaa88);

    // Eye sockets
    this.eyeL = this.scene.add.circle(-5, -22, 4, 0x000000);
    this.eyeR = this.scene.add.circle(5, -22, 4, 0x000000);

    // Red glowing eyes
    this.eyeGlowL = this.scene.add.circle(-5, -22, 2, 0xff0000);
    this.eyeGlowR = this.scene.add.circle(5, -22, 2, 0xff0000);

    // Jaw
    this.jaw = this.scene.add.rectangle(0, -10, 14, 6, 0xccccaa);

    // Arms (bones)
    this.armL = this.scene.add.rectangle(-16, 0, 4, 25, 0xccccaa);
    this.armR = this.scene.add.rectangle(16, 0, 4, 25, 0xccccaa);

    this.container.add([this.ribs, this.spine, this.skull, this.eyeL, this.eyeR, this.eyeGlowL, this.eyeGlowR, this.jaw, this.armL, this.armR]);
    this._buildHUD();

    // Eye glow pulse
    this.scene.tweens.add({
      targets: [this.eyeGlowL, this.eyeGlowR],
      alpha: 0.5,
      duration: 500,
      yoyo: true,
      repeat: -1
    });
  }

  _spawnAnim() {
    // Rise from ground
    this.container.setScale(1, 0.3);
    this.container.setAlpha(0.5);

    this.scene.tweens.add({
      targets: this.container,
      scaleY: 1,
      alpha: 1,
      duration: 400,
      ease: 'Back.easeOut'
    });
  }
}
