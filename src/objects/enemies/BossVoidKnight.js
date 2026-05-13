import { BaseEnemy } from './BaseEnemy.js';
import { FloatingText } from '../FloatingText.js';
import { getWordsByTier } from '../../data/words.js';

export class BossVoidKnight extends BaseEnemy {
  constructor(scene, x, y) {
    super(scene, x, y, {
      hp: 450, damage: 3,
      attackInterval: 4000,
      attackWarningTime: 2000,
      wordTierBonus: 2,
      attackType: 'void'
    });

    this.phase = 1;
    this.isBoss = true;
    this._counterMode = false;
    this._mirrorDamage = 0;
    this._parryActive = false;
  }

  _buildGraphics() {
    this.container = this.scene.add.container(this.x, this.y - 250);
    this.container.setDepth(4);

    // Corrupted armor body
    this.armor = this.scene.add.rectangle(0, 10, 50, 70, 0x220022);
    this.armor.setStrokeStyle(4, 0x440044);

    // Void-infused chest plate
    this.chestPlate = this.scene.add.rectangle(0, 5, 35, 45, 0x330033);
    this.chestPlate.setStrokeStyle(2, 0x660066);

    // Helmet
    this.helmet = this.scene.add.rectangle(0, -35, 40, 35, 0x220022);
    this.helmet.setStrokeStyle(3, 0x440044);

    // Visor slit
    this.visor = this.scene.add.rectangle(0, -38, 25, 6, 0x000000);

    // Glowing void eyes in visor
    this.eyeL = this.scene.add.circle(-8, -38, 3, 0x8800ff);
    this.eyeR = this.scene.add.circle(8, -38, 3, 0x8800ff);

    // Eye pulse
    this.scene.tweens.add({
      targets: [this.eyeL, this.eyeR],
      fillColor: 0xcc00ff,
      duration: 400,
      yoyo: true,
      repeat: -1
    });

    // Void sword
    this.sword = this.scene.add.rectangle(35, 0, 8, 80, 0x440044);
    this.sword.setStrokeStyle(2, 0x8800ff);

    // Sword glow
    this.swordGlow = this.scene.add.rectangle(35, 0, 12, 85, 0x8800ff, 0.3);
    this.scene.tweens.add({
      targets: this.swordGlow,
      alpha: 0.6,
      scaleX: 1.5,
      duration: 500,
      yoyo: true,
      repeat: -1
    });

    // Shield
    this.shield = this.scene.add.rectangle(-35, 5, 20, 45, 0x330033);
    this.shield.setStrokeStyle(2, 0x660066);

    // Void aura
    this.aura = this.scene.add.circle(0, 0, 55, 0x440044, 0.2);
    this.scene.tweens.add({
      targets: this.aura,
      scaleX: 1.4, scaleY: 1.4,
      alpha: 0.4,
      duration: 800,
      yoyo: true,
      repeat: -1
    });

    // Parry indicator
    this.parryAura = this.scene.add.circle(0, 0, 40, 0xffff00, 0);
    this.parryAura.setStrokeStyle(3, 0xffff00);

    this.container.add([
      this.aura, this.parryAura, this.armor, this.chestPlate,
      this.helmet, this.visor, this.eyeL, this.eyeR,
      this.sword, this.swordGlow, this.shield
    ]);

    this._buildHUD();
    this.hpBarBg.setScale(4, 1.5);
    this.hpBar.setScale(4, 1.5);
  }

  _startAttackCycle() {
    super._startAttackCycle();

    // Periodic parry mode
    this._parryTimer = this.scene.time.addEvent({
      delay: 8000,
      loop: true,
      callback: () => {
        if (this.alive && this.phase >= 2) {
          this._activateParry();
        }
      }
    });
  }

  _activateParry() {
    this._parryActive = true;
    this.parryAura.setAlpha(0.5);

    FloatingText.spawn(this.scene, this.x, this.y - 100, '⚔️ PARRY MODE!', '#ffff00', '16px');

    // Parry lasts 2 seconds
    this.scene.time.delayedCall(2000, () => {
      this._parryActive = false;
      this.parryAura.setAlpha(0);
    });
  }

  receiveDamage(amount, special) {
    if (this._parryActive) {
      // Counter-attack! Reflect damage to player
      FloatingText.spawn(this.scene, this.x, this.y - 80, '⚔️ COUNTER!', '#ff4444', '18px');
      this.scene.events.emit('ENEMY_ATTACK', {
        enemy: this,
        damage: Math.floor(amount * 0.5),
        attackType: 'counter'
      });

      // Still take reduced damage
      amount = Math.floor(amount * 0.3);
    }

    super.receiveDamage(amount, special);

    // Mirror damage mechanic - stores damage to unleash later
    if (this.alive && this.phase >= 2) {
      this._mirrorDamage += Math.floor(amount * 0.25);
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
    FloatingText.spawn(this.scene, this.x, this.y - 100, '⚔️ PHASE 2: VOID BLADE!', '#aa00ff', '20px');
    this.scene.cameras.main.shake(400, 0.015);

    // Sword turns more purple
    this.sword.setFillStyle(0x660066);
    this.swordGlow.setFillStyle(0xaa00ff, 0.4);
  }

  _enterPhase3() {
    this.phase = 3;
    this.attackInterval = 2500;
    FloatingText.spawn(this.scene, this.x, this.y - 100, '🗡️ FINAL PHASE: MIRROR STRIKE!', '#ff00ff', '22px');
    this.scene.cameras.main.shake(500, 0.02);

    // Unleash stored mirror damage
    if (this._mirrorDamage > 0) {
      FloatingText.spawn(this.scene, this.x, this.y - 80, `💥 MIRROR DAMAGE: ${this._mirrorDamage}!`, '#ff00ff', '16px');
      this.scene.events.emit('ENEMY_ATTACK', {
        enemy: this,
        damage: this._mirrorDamage,
        attackType: 'void'
      });
      this._mirrorDamage = 0;
    }

    // Full void corruption
    this.armor.setFillStyle(0x440044);
    this.helmet.setFillStyle(0x440044);
    this.eyeL.setFillStyle(0xff00ff);
    this.eyeR.setFillStyle(0xff00ff);
  }

  _fireAttack() {
    if (!this.alive) return;

    // Sword slash animation
    this.scene.tweens.add({
      targets: this.sword,
      angle: 45,
      duration: 200,
      yoyo: true
    });

    const damage = this.baseDamage + (this.phase - 1);

    this.scene.events.emit('ENEMY_ATTACK', {
      enemy: this,
      damage: damage,
      attackType: 'void'
    });

    FloatingText.spawn(this.scene, this.x, this.y - 80, '🗡️ VOID SLASH!', '#aa00ff', '16px');
  }

  _die() {
    if (this._parryTimer) this._parryTimer.destroy();
    super._die();
  }
}
