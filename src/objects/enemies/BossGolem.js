import { BaseEnemy } from './BaseEnemy.js';
import { FloatingText } from '../FloatingText.js';
import { getWordsByTier } from '../../data/words.js';

export class BossGolem extends BaseEnemy {
  constructor(scene, x, y) {
    super(scene, x, y, {
      hp: 300, damage: 2,
      attackInterval: 4000,
      attackWarningTime: 2500,
      wordTierBonus: 2,
      attackType: 'heavy'
    });

    this.phase = 1;
    this.isBoss = true;
  }

  _buildGraphics() {
    this.container = this.scene.add.container(this.x, this.y - 250);
    this.container.setDepth(4);

    // Giant square body
    this.body = this.scene.add.rectangle(0, 15, 80, 90, 0x888888);
    this.body.setStrokeStyle(4, 0xaaaaaa);

    // Head
    this.head = this.scene.add.rectangle(0, -45, 60, 50, 0x777777);
    this.head.setStrokeStyle(3, 0xaaaaaa);

    // Cracks
    this.crack1 = this.scene.add.line(0, 0, -15, -60, -5, -30, 0x333333);
    this.crack1.setLineWidth(2);
    this.crack2 = this.scene.add.line(0, 0, 10, -20, 20, 10, 0x333333);
    this.crack2.setLineWidth(2);

    // Eyes — glowing circles
    this.eyeL = this.scene.add.circle(-15, -47, 8, 0xff8800);
    this.eyeR = this.scene.add.circle(15, -47, 8, 0xff8800);
    this.scene.tweens.add({
      targets: [this.eyeL, this.eyeR],
      fillColor: 0xff2200,
      duration: 800,
      yoyo: true,
      repeat: -1
    });

    // Fists
    this.fistL = this.scene.add.rectangle(-52, 20, 24, 24, 0x888888);
    this.fistL.setStrokeStyle(3, 0xaaaaaa);
    this.fistR = this.scene.add.rectangle(52, 20, 24, 24, 0x888888);
    this.fistR.setStrokeStyle(3, 0xaaaaaa);

    this.container.add([this.body, this.head, this.crack1, this.crack2,
                        this.eyeL, this.eyeR, this.fistL, this.fistR]);
    this._buildHUD();

    // Make HP bar wider for boss
    this.hpBarBg.setScale(3, 1.5);
    this.hpBar.setScale(3, 1.5);
  }

  _updatePhase() {
    const ratio = this.hp / this.maxHP;

    if (ratio <= 0.5 && this.phase < 2) {
      this._enterPhase2();
    }
    if (ratio <= 0.25 && this.phase < 3) {
      this._enterPhase3();
    }
  }

  _enterPhase2() {
    this.phase = 2;
    this.attackInterval = 3000;
    FloatingText.spawn(this.scene, this.x, this.y - 80, '⚠️ ENRAGED!', '#ff4400', '22px');
    this.scene.cameras.main.shake(400, 0.02);

    // Visual crack update
    this.scene.tweens.add({
      targets: this.body,
      fillColor: 0x665555,
      duration: 500
    });
  }

  _enterPhase3() {
    this.phase = 3;
    this.attackInterval = 2500;
    FloatingText.spawn(this.scene, this.x, this.y - 80, '💀 BERSERK!', '#ff0000', '24px');
    this.scene.cameras.main.shake(600, 0.03);
    this.scene.events.emit('BOSS_PHASE_3');

    // Eyes turn red
    this.eyeL.setFillStyle(0xff0000);
    this.eyeR.setFillStyle(0xff0000);
  }

  receiveDamage(amount, special) {
    super.receiveDamage(amount, special);
    if (this.alive) this._updatePhase();
  }

  // Phase 2: Fire BOULDER_THROW special attack (10-letter word in 3s)
  _fireAttack() {
    if (!this.alive) return;

    if (this.phase >= 2 && Math.random() < 0.3) {
      this._boulderThrow();
      return;
    }

    super._fireAttack();
  }

  _boulderThrow() {
    // Player must type a 10-letter word in 3 seconds
    const words = getWordsByTier('EPIC', 1);
    const word = words[0] || 'DEVASTATE';

    this.scene.events.emit('SPECIAL_CHALLENGE', {
      word,
      timeLimit: 3000,
      label: '🪨 BOULDER THROW! Type to deflect:',
      punishment: { damage: 2 }
    });

    // Slam animation
    this.scene.tweens.add({
      targets: [this.fistL, this.fistR],
      y: 50,
      duration: 200,
      yoyo: true,
      repeat: 1
    });
  }

  _buildHUD() {
    super._buildHUD();
    // Boss has its own HP bar at top of screen (handled by GameScene HUD)
  }
}
