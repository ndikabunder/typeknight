import { BaseEnemy } from './BaseEnemy.js';
import { FloatingText } from '../FloatingText.js';
import { WordLabel } from '../WordLabel.js';
import { getWordsByTier } from '../../data/words.js';

export class BossHydra extends BaseEnemy {
  constructor(scene, x, y) {
    super(scene, x, y, {
      hp: 350, damage: 2,
      attackInterval: 4500,
      attackWarningTime: 2500,
      wordTierBonus: 1.5,
      attackType: 'poison'
    });

    this.phase = 1;
    this.isBoss = true;
    this._heads = [];
    this._headCount = 3;
    this._maxHeads = 5;
    this._createHeads();
  }

  _buildGraphics() {
    this.container = this.scene.add.container(this.x, this.y - 250);
    this.container.setDepth(4);

    // Serpentine body
    this.body = this.scene.add.ellipse(0, 30, 100, 70, 0x226622);
    this.body.setStrokeStyle(4, 0x44aa44);

    // Scales pattern
    for (let i = 0; i < 8; i++) {
      const scale = this.scene.add.ellipse(
        Phaser.Math.Between(-40, 40),
        Phaser.Math.Between(10, 50),
        12, 8, 0x336633
      );
      this.container.add(scale);
    }

    // Tail
    this.tail = this.scene.add.triangle(60, 50, 0, 0, 50, 20, 30, -10, 0x226622);
    this.tail.setStrokeStyle(2, 0x44aa44);

    this.container.add([this.tail, this.body]);
    this._buildHUD();
    this.hpBarBg.setScale(4, 1.5);
    this.hpBar.setScale(4, 1.5);
  }

  _createHeads() {
    const headPositions = [
      { x: 0, y: -30, angle: 0 },      // Center
      { x: -40, y: -20, angle: -20 },  // Left
      { x: 40, y: -20, angle: 20 }     // Right
    ];

    for (let i = 0; i < this._headCount; i++) {
      if (i >= headPositions.length) {
        // Additional heads for later phases
        headPositions.push({
          x: Phaser.Math.Between(-60, 60),
          y: -25,
          angle: Phaser.Math.Between(-30, 30)
        });
      }

      const pos = headPositions[i];
      const head = this._createHead(pos.x, pos.y, pos.angle, i);
      this._heads.push(head);
    }
  }

  _createHead(x, y, angle, index) {
    // Neck
    const neck = this.scene.add.rectangle(x, y + 20, 16, 40, 0x226622);
    neck.setStrokeStyle(2, 0x44aa44);

    // Head
    const head = this.scene.add.ellipse(x, y, 25, 20, 0x338833);
    head.setStrokeStyle(2, 0x55bb55);
    head.angle = angle;

    // Eyes
    const eyeL = this.scene.add.circle(x - 6, y - 3, 4, 0xffff00);
    const eyeR = this.scene.add.circle(x + 6, y - 3, 4, 0xffff00);

    // Pupils
    const pupilL = this.scene.add.circle(x - 6, y - 3, 2, 0x000000);
    const pupilR = this.scene.add.circle(x + 6, y - 3, 2, 0x000000);

    // Forked tongue
    const tongue = this.scene.add.triangle(x, y + 8, 0, 0, -6, 10, 6, 10, 0xff4444);

    this.container.add([neck, head, eyeL, eyeR, pupilL, pupilR, tongue]);

    // Head bob animation
    this.scene.tweens.add({
      targets: [head, eyeL, eyeR, pupilL, pupilR, tongue],
      y: y + 5,
      duration: 400 + index * 100,
      yoyo: true,
      repeat: -1
    });

    return { neck, head, eyeL, eyeR, pupilL, pupilR, tongue, x, y, alive: true, index };
  }

  _addHead() {
    if (this._headCount >= this._maxHeads) return;

    const side = this._headCount % 2 === 0 ? -1 : 1;
    const x = side * Phaser.Math.Between(50, 70);
    const y = -25;
    const angle = side * Phaser.Math.Between(15, 35);

    const head = this._createHead(x, y, angle, this._headCount);
    head.alive = true;
    this._heads.push(head);
    this._headCount++;

    FloatingText.spawn(this.scene, this.x, this.y - 80, '🐍 NEW HEAD GROWS!', '#44ff44', '16px');
  }

  receiveDamage(amount, special) {
    super.receiveDamage(amount, special);

    // Chance to grow a new head when damaged (hydra regeneration!)
    if (this.alive && Math.random() < 0.25 && this.phase >= 2) {
      this.scene.time.delayedCall(1000, () => {
        if (this.alive) this._addHead();
      });
    }

    this._updatePhase();
  }

  _updatePhase() {
    const ratio = this.hp / this.maxHP;

    if (ratio <= 0.6 && this.phase < 2) {
      this._enterPhase2();
    }
    if (ratio <= 0.3 && this.phase < 3) {
      this._enterPhase3();
    }
  }

  _enterPhase2() {
    this.phase = 2;
    this.attackInterval = 3500;
    FloatingText.spawn(this.scene, this.x, this.y - 100, '⚠️ HYDRA ENRAGES!', '#44ff44', '20px');
    this.scene.cameras.main.shake(400, 0.015);

    // Grow a new head
    this._addHead();

    // Speed up head animations
    this._heads.forEach(h => {
      if (h.alive) {
        h.head.setFillStyle(0x44aa44);
      }
    });
  }

  _enterPhase3() {
    this.phase = 3;
    this.attackInterval = 2500;
    FloatingText.spawn(this.scene, this.x, this.y - 100, '🐍 FINAL PHASE: HYDRA FRENZY!', '#88ff88', '22px');
    this.scene.cameras.main.shake(500, 0.02);

    // Grow two more heads
    this._addHead();
    this.scene.time.delayedCall(500, () => this._addHead());

    // All heads turn red
    this._heads.forEach(h => {
      if (h.alive) {
        h.head.setFillStyle(0x884444);
        h.eyeL.setFillStyle(0xff0000);
        h.eyeR.setFillStyle(0xff0000);
      }
    });
  }

  _fireAttack() {
    if (!this.alive) return;

    // Each alive head attacks!
    const aliveHeads = this._heads.filter(h => h.alive);
    const attackingHeads = Math.min(aliveHeads.length, this.phase + 1);

    for (let i = 0; i < attackingHeads; i++) {
      const head = aliveHeads[i];
      if (head) {
        // Visual bite
        this.scene.tweens.add({
          targets: head.head,
          scaleX: 1.3, scaleY: 1.3,
          duration: 200,
          yoyo: true
        });
      }
    }

    // Damage based on number of heads
    const damage = this.baseDamage + Math.floor(attackingHeads / 2);

    this.scene.events.emit('ENEMY_ATTACK', {
      enemy: this,
      damage: damage,
      attackType: 'poison'
    });

    FloatingText.spawn(
      this.scene, this.x, this.y - 80,
      `🐍 ${attackingHeads}x BITE!`,
      '#44ff44', '16px'
    );
  }

  _die() {
    // All heads die
    this._heads.forEach(h => {
      if (h.alive) {
        this.scene.tweens.add({
          targets: [h.head, h.neck],
          scaleY: 0,
          alpha: 0,
          duration: 300
        });
      }
    });
    super._die();
  }
}
