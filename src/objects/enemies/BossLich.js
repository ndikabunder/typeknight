import { BaseEnemy } from './BaseEnemy.js';
import { FloatingText } from '../FloatingText.js';
import { getWordsByTier } from '../../data/words.js';

export class BossLich extends BaseEnemy {
  constructor(scene, x, y) {
    super(scene, x, y, {
      hp: 400, damage: 2,
      attackInterval: 5000,
      attackWarningTime: 3000,
      wordTierBonus: 2.5,
      attackType: 'magic'
    });

    this.phase = 1;
    this.isBoss = true;
    this._shieldActive = true;
    this._shieldHP = 50;
    this._summonCount = 0;
    this._maxSummons = 4;
    this._startLichMechanics();
  }

  _buildGraphics() {
    this.container = this.scene.add.container(this.x, this.y - 250);
    this.container.setDepth(4);

    // Robe body
    this.robe = this.scene.add.triangle(0, 20, 0, -50, -45, 50, 45, 50, 0x220033);
    this.robe.setStrokeStyle(4, 0x440066);

    // Hood
    this.hood = this.scene.add.arc(0, -45, 35, 200, 340, false, 0x110022);
    this.hood.setStrokeStyle(3, 0x330044);

    // Face in shadow
    this.face = this.scene.add.circle(0, -45, 22, 0x220022);

    // Glowing purple eyes
    this.eyeL = this.scene.add.circle(-8, -48, 6, 0xaa00ff);
    this.eyeR = this.scene.add.circle(8, -48, 6, 0xaa00ff);

    // Eye glow animation
    this.scene.tweens.add({
      targets: [this.eyeL, this.eyeR],
      fillColor: 0xdd00ff,
      duration: 500,
      yoyo: true,
      repeat: -1
    });

    // Staff with orb
    this.staff = this.scene.add.rectangle(-40, 0, 6, 80, 0x442200);
    this.orb = this.scene.add.circle(-40, -40, 15, 0x8800ff);
    this.orb.setStrokeStyle(3, 0xaa44ff);

    // Orb pulse
    this.scene.tweens.add({
      targets: this.orb,
      scaleX: 1.3, scaleY: 1.3,
      fillColor: 0xaa44ff,
      duration: 600,
      yoyo: true,
      repeat: -1
    });

    // Shield aura (visible when active)
    this.shieldAura = this.scene.add.circle(0, -10, 70, 0x6600ff, 0.3);
    this.shieldAura.setStrokeStyle(4, 0xaa66ff);

    // Dark aura
    this.darkAura = this.scene.add.circle(0, 0, 60, 0x440066, 0.2);
    this.scene.tweens.add({
      targets: this.darkAura,
      scaleX: 1.4, scaleY: 1.4,
      alpha: 0.4,
      duration: 1000,
      yoyo: true,
      repeat: -1
    });

    this.container.add([
      this.darkAura, this.shieldAura, this.robe, this.hood, this.face,
      this.eyeL, this.eyeR, this.staff, this.orb
    ]);
    this._buildHUD();
    this.hpBarBg.setScale(4, 1.5);
    this.hpBar.setScale(4, 1.5);
  }

  _startLichMechanics() {
    // Summon skeletons periodically
    this._summonTimer = this.scene.time.addEvent({
      delay: 7000,
      loop: true,
      callback: () => {
        if (this.alive && this._summonCount < this._maxSummons) {
          this._summonSkeleton();
        }
      }
    });

    // Shield regeneration
    this._shieldRegenTimer = this.scene.time.addEvent({
      delay: 15000,
      loop: true,
      callback: () => {
        if (this.alive && !this._shieldActive && this.phase >= 2) {
          this._reactivateShield();
        }
      }
    });
  }

  _summonSkeleton() {
    this._summonCount++;
    FloatingText.spawn(this.scene, this.x, this.y - 100, '💀 RISE!', '#aa00ff', '18px');

    // Summon effect
    const circle = this.scene.add.circle(
      this.x + Phaser.Math.Between(-80, 80),
      this.y,
      25, 0x660066, 0.6
    );
    circle.setDepth(3);
    this.scene.tweens.add({
      targets: circle,
      scaleX: 2.5, scaleY: 2.5,
      alpha: 0,
      duration: 600,
      onComplete: () => circle.destroy()
    });

    this.scene.events.emit('NECROMANCER_SUMMON', {
      x: this.x + Phaser.Math.Between(-80, 80),
      y: this.y,
      type: 'skeleton'
    });
  }

  _reactivateShield() {
    this._shieldActive = true;
    this._shieldHP = 30;
    this.shieldAura.setVisible(true);
    FloatingText.spawn(this.scene, this.x, this.y - 100, '🛡️ SHIELD RESTORED!', '#aa66ff', '16px');
  }

  receiveDamage(amount, special) {
    if (this._shieldActive) {
      // Damage shield first
      this._shieldHP -= amount;
      FloatingText.spawn(this.scene, this.x, this.y - 70, `Shield: ${Math.max(0, this._shieldHP)}`, '#aa66ff', '14px');

      if (this._shieldHP <= 0) {
        this._shieldActive = false;
        this.shieldAura.setVisible(false);
        FloatingText.spawn(this.scene, this.x, this.y - 100, '🛡️ SHIELD BROKEN!', '#ff4400', '18px');
        this.scene.cameras.main.shake(300, 0.015);
      }
      return; // No damage to HP while shield active
    }

    super.receiveDamage(amount, special);
    this._updatePhase();
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
    this.attackInterval = 4000;
    this._maxSummons = 5;
    FloatingText.spawn(this.scene, this.x, this.y - 100, '⚠️ PHASE 2: DARK RITUAL!', '#aa00ff', '20px');
    this.scene.cameras.main.shake(500, 0.02);
    this._tintColor(0x8800aa, 400);

    // Summon immediately
    this._summonSkeleton();
    this._summonSkeleton();
  }

  _enterPhase3() {
    this.phase = 3;
    this.attackInterval = 3000;
    this._maxSummons = 6;
    FloatingText.spawn(this.scene, this.x, this.y - 100, '💀 FINAL PHASE: ARMY OF THE DEAD!', '#ff00aa', '22px');
    this.scene.cameras.main.shake(600, 0.025);

    // Mass summon
    for (let i = 0; i < 3; i++) {
      this.scene.time.delayedCall(i * 300, () => this._summonSkeleton());
    }
  }

  _fireAttack() {
    if (!this.alive) return;

    const attackType = this.phase >= 3 ? 'void' : 'magic';
    this.scene.events.emit('ENEMY_ATTACK', {
      enemy: this,
      damage: this.baseDamage + (this.phase - 1),
      attackType: attackType
    });

    this._attackAnim();
  }

  _die() {
    if (this._summonTimer) this._summonTimer.destroy();
    if (this._shieldRegenTimer) this._shieldRegenTimer.destroy();
    super._die();
  }
}
