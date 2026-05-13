import { BaseEnemy } from './BaseEnemy.js';
import { FloatingText } from '../FloatingText.js';
import { getWordsByTier } from '../../data/words.js';

export class BossElemental extends BaseEnemy {
  constructor(scene, x, y) {
    super(scene, x, y, {
      hp: 380, damage: 2,
      attackInterval: 4000,
      attackWarningTime: 2500,
      wordTierBonus: 2,
      attackType: 'fire'
    });

    this.phase = 1;
    this.isBoss = true;
    this._mode = 'fire'; // fire or ice
    this._modeSwitchTimer = null;
    this._startModeCycle();
  }

  _buildGraphics() {
    this.container = this.scene.add.container(this.x, this.y - 250);
    this.container.setDepth(4);

    // Core body - changes color based on mode
    this.core = this.scene.add.polygon(0, 0, [
      0, -50, 35, -30, 45, 15, 25, 45, -25, 45, -45, 15, -35, -30
    ], 0xff6600);
    this.core.setStrokeStyle(4, 0xffaa00);

    // Inner core
    this.innerCore = this.scene.add.circle(0, 0, 25, 0xffcc00);

    // Eye
    this.eye = this.scene.add.circle(0, -15, 12, 0xffff00);
    this.pupil = this.scene.add.circle(0, -15, 6, 0x000000);

    // Fire particles
    this.particles = [];
    for (let i = 0; i < 8; i++) {
      const particle = this.scene.add.circle(
        Phaser.Math.Between(-40, 40),
        Phaser.Math.Between(-40, 30),
        Phaser.Math.Between(5, 10),
        0xff4400
      );
      this.particles.push(particle);
      this.container.add(particle);
    }

    // Mode indicator ring
    this.modeRing = this.scene.add.circle(0, 0, 70, 0xff6600, 0.2);
    this.modeRing.setStrokeStyle(4, 0xff8800);

    this.container.add([this.modeRing, this.core, this.innerCore, this.eye, this.pupil]);
    this._buildHUD();
    this.hpBarBg.setScale(4, 1.5);
    this.hpBar.setScale(4, 1.5);

    this._setupParticleAnimations();
  }

  _setupParticleAnimations() {
    this.particles.forEach((p, i) => {
      if (this._particleTweens) {
        this._particleTweens.forEach(t => t.stop());
      }

      this.scene.tweens.add({
        targets: p,
        y: p.y - 30,
        alpha: 0,
        duration: 800 + i * 100,
        repeat: -1,
        onRepeat: () => {
          p.y = Phaser.Math.Between(-10, 30);
          p.x = Phaser.Math.Between(-40, 40);
          p.alpha = 1;
        }
      });
    });
  }

  _startModeCycle() {
    // Switch mode every 8 seconds
    this._modeSwitchTimer = this.scene.time.addEvent({
      delay: 8000,
      loop: true,
      callback: () => {
        if (this.alive) {
          this._switchMode();
        }
      }
    });
  }

  _switchMode() {
    const newMode = this._mode === 'fire' ? 'ice' : 'fire';
    this._mode = newMode;
    this.attackType = newMode;

    FloatingText.spawn(
      this.scene, this.x, this.y - 100,
      newMode === 'fire' ? '🔥 FIRE MODE!' : '❄️ ICE MODE!',
      newMode === 'fire' ? '#ff6600' : '#88ccff',
      '18px'
    );

    // Visual transformation
    this._transformToMode(newMode);
  }

  _transformToMode(mode) {
    const fireColors = { core: 0xff6600, inner: 0xffcc00, eye: 0xffff00, particles: 0xff4400, ring: 0xff8800 };
    const iceColors = { core: 0x4488cc, inner: 0x88ccff, eye: 0xccffff, particles: 0x44aaff, ring: 0x66aaff };

    const colors = mode === 'fire' ? fireColors : iceColors;

    // Flash effect
    this.scene.tweens.add({
      targets: this.container,
      alpha: 0.5,
      duration: 100,
      yoyo: true,
      onComplete: () => {
        this.core.setFillStyle(colors.core);
        this.innerCore.setFillStyle(colors.inner);
        this.eye.setFillStyle(colors.eye);
        this.modeRing.setFillStyle(colors.ring, 0.2);
        this.modeRing.setStrokeStyle(4, colors.ring);

        this.particles.forEach(p => {
          p.setFillStyle(colors.particles);
        });
      }
    });
  }

  receiveDamage(amount, special) {
    // Weakness mechanic: fire takes extra damage from ice attacks, vice versa
    if (special?.effect === 'ice' && this._mode === 'fire') {
      amount = Math.floor(amount * 1.5);
      FloatingText.spawn(this.scene, this.x, this.y - 60, '❄️ WEAKNESS!', '#88ccff', '14px');
    } else if (special?.effect === 'fire' && this._mode === 'ice') {
      amount = Math.floor(amount * 1.5);
      FloatingText.spawn(this.scene, this.x, this.y - 60, '🔥 WEAKNESS!', '#ff6600', '14px');
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
    this.attackInterval = 3000;

    // Faster mode switching
    this._modeSwitchTimer.delay = 5000;

    FloatingText.spawn(this.scene, this.x, this.y - 100, '⚠️ UNSTABLE ELEMENTS!', '#ffaa00', '20px');
    this.scene.cameras.main.shake(400, 0.015);

    // Core pulses faster
    this.scene.tweens.add({
      targets: this.innerCore,
      scaleX: 1.5, scaleY: 1.5,
      duration: 300,
      yoyo: true,
      repeat: -1
    });
  }

  _enterPhase3() {
    this.phase = 3;
    this.attackInterval = 2000;

    // Even faster mode switching
    this._modeSwitchTimer.delay = 3000;

    FloatingText.spawn(this.scene, this.x, this.y - 100, '🌀 FINAL PHASE: CHAOS!', '#ff00ff', '22px');
    this.scene.cameras.main.shake(500, 0.02);

    // Dual mode - both colors
    this.scene.tweens.add({
      targets: this.core,
      fillColor: 0xff00ff,
      duration: 500,
      yoyo: true,
      repeat: -1
    });
  }

  _fireAttack() {
    if (!this.alive) return;

    // Attack based on current mode
    const damage = this.baseDamage + (this.phase - 1);

    if (this._mode === 'fire') {
      this.scene.events.emit('ENEMY_ATTACK', {
        enemy: this,
        damage: damage,
        attackType: 'fire'
      });
      FloatingText.spawn(this.scene, this.x, this.y - 80, '🔥 INFERNO!', '#ff6600', '16px');
    } else {
      this.scene.events.emit('ENEMY_ATTACK', {
        enemy: this,
        damage: damage,
        attackType: 'ice'
      });
      FloatingText.spawn(this.scene, this.x, this.y - 80, '❄️ BLIZZARD!', '#88ccff', '16px');
    }

    // Core pulse attack
    this.scene.tweens.add({
      targets: this.innerCore,
      scaleX: 2, scaleY: 2,
      duration: 200,
      yoyo: true
    });
  }

  _die() {
    if (this._modeSwitchTimer) this._modeSwitchTimer.destroy();
    super._die();
  }
}
