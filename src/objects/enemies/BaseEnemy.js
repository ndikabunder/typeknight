// BaseEnemy — foundation for all enemy types

import { WordLabel } from '../WordLabel.js';
import { FloatingText } from '../FloatingText.js';
import { getWordForDifficulty, WORD_TIERS } from '../../data/words.js';

export class BaseEnemy {
  constructor(scene, x, y, config) {
    this.scene = scene;
    this.x = x;
    this.y = y;
    this.config = config;

    // Stats
    this.maxHP = config.hp;
    this.hp = config.hp;
    this.baseDamage = config.damage || 1;
    this.armor = config.armor || 0;
    this.alive = true;
    this.flipped = false;    // for ShieldEnemy
    this.stunned = false;
    this.slowed = false;
    this.burning = false;

    // Attack timing
    this.attackInterval = config.attackInterval || 4000;
    this.attackTimer = 0;
    this.attackWarningTime = config.attackWarningTime || 2000;
    this.attackReady = false;

    // Word
    this.currentWord = '';
    this.wordHidden = false;
    this._wordHideTimeout = null;

    // Build visuals
    this.container = null;
    this.hpBar = null;
    this.timerBar = null;
    this.wordLabel = null;

    this._buildGraphics();
    this._buildHUD();
    this._assignWord();
    this._startAttackCycle();
    this._spawnAnim();
  }

  _buildGraphics() {
    // Subclass overrides this
    this.container = this.scene.add.container(this.x, this.y - 200);
    this.container.setDepth(4);
  }

  _buildHUD() {
    const hudY = 18;

    // HP bar background
    this.hpBarBg = this.scene.add.rectangle(0, hudY, 50, 6, 0x333333)
      .setOrigin(0.5, 0.5);

    // HP bar fill
    this.hpBar = this.scene.add.rectangle(-25, hudY, 50, 6, 0x22cc44)
      .setOrigin(0, 0.5);

    // Attack timer bar background
    this.timerBarBg = this.scene.add.rectangle(0, hudY + 9, 50, 4, 0x330000)
      .setOrigin(0.5, 0.5);

    // Attack timer bar fill (red, draining)
    this.timerBar = this.scene.add.rectangle(-25, hudY + 9, 50, 4, 0xff3300)
      .setOrigin(0, 0.5);

    this.container.add([this.hpBarBg, this.hpBar, this.timerBarBg, this.timerBar]);
  }

  _assignWord(forceWord = null) {
    const avgCPS = this.scene.typingEngine?.getAverageCPS?.() || 3;
    let bonus = this.config.wordTierBonus || 0;

    // Challenge: short words only forces basic tier
    if (this.scene._shortWordsOnly) {
      bonus = -10; // force CPS into BASIC tier
    }

    const adjustedCPS = avgCPS + bonus;

    if (forceWord) {
      this.currentWord = forceWord.toUpperCase();
    } else {
      this.currentWord = getWordForDifficulty(adjustedCPS, this.scene.themeWords || []);
    }

    // Safeguard: ensure word is valid
    if (!this.currentWord || this.currentWord.length === 0) {
      this.currentWord = 'FIGHT';
    }

    // Challenge: blind typing hides words immediately
    this.wordHidden = false;
    if (this.scene._blindTyping) {
      this.wordHidden = true;
    }

    if (this.wordLabel) {
      this.wordLabel.destroy();
    }
    this.wordLabel = new WordLabel(this.scene, this.x, this.y - 60, this.currentWord);
    this.wordLabel.setDepth(10);

    // Blind typing: immediately hide the word text
    if (this.wordHidden) {
      const hidden = this.currentWord.split('').map(() => '?').join('');
      this.wordLabel.updateCharTexts(hidden);
    }

    // Register with typing engine
    this.scene.typingEngine?.registerTarget(this);
  }

  _startAttackCycle() {
    this.attackTimer = this.attackInterval;
    this._attackTimerEvent = this.scene.time.addEvent({
      delay: 100,
      loop: true,
      callback: this._tickAttack,
      callbackScope: this
    });
  }

  _tickAttack() {
    if (!this.alive || this.stunned) return;
    
    // Pause during story dialogs
    if (this.scene.gamePaused) return;

    // 70% slow = 30ms effective tick (from 100ms normal)
    const delta = this.slowed ? 30 : 100;
    this.attackTimer -= delta;

    // Warning zone
    this.attackReady = this.attackTimer <= this.attackWarningTime;

    // Fired!
    if (this.attackTimer <= 0) {
      this._fireAttack();
      this.attackTimer = this.attackInterval;
      this.attackReady = false;
    }

    this._updateTimerBar();
  }

  _updateTimerBar() {
    const ratio = Math.max(0, this.attackTimer / this.attackInterval);
    this.timerBar.setScale(ratio, 1);

    // Color: green → yellow → red
    if (ratio > 0.5)      this.timerBar.setFillStyle(0x44cc44);
    else if (ratio > 0.25) this.timerBar.setFillStyle(0xffaa00);
    else                   this.timerBar.setFillStyle(0xff3300);
  }

  _fireAttack() {
    if (!this.alive) return;
    this.scene.events.emit('ENEMY_ATTACK', {
      enemy: this,
      damage: this.baseDamage,
      attackType: this.config.attackType || 'normal'
    });
    this._attackAnim();
  }

  _attackAnim() {
    // Lunge toward player with weapon swing
    const playerX = this.scene.player?.x || (this.x - 200);
    const lungeDist = Math.max(-80, Math.min(-30, playerX - this.x + 40));

    // Phase 1: Wind up (pull back slightly)
    this.scene.tweens.add({
      targets: this.container,
      x: this.x + 10,
      duration: 60,
      ease: 'Sine.easeOut',
      onComplete: () => {
        // Phase 2: Lunge forward
        this.scene.tweens.add({
          targets: this.container,
          x: this.x + lungeDist,
          duration: 100,
          ease: 'Power2',
          onComplete: () => {
            // Phase 3: Return to position
            this.scene.tweens.add({
              targets: this.container,
              x: this.x,
              duration: 200,
              ease: 'Sine.easeOut'
            });
          }
        });
      }
    });

    // Weapon swing (if weapon exists)
    const weapon = this.dagger || this.axeHandle || this.staff;
    if (weapon) {
      this.scene.tweens.add({
        targets: weapon,
        angle: -40,
        duration: 60,
        onComplete: () => {
          this.scene.tweens.add({
            targets: weapon,
            angle: 20,
            duration: 80,
            yoyo: true
          });
        }
      });
    }

    // Attack flash on enemy (glow)
    const flash = this.scene.add.circle(this.x + lungeDist * 0.5, this.y - 5, 15, 0xff4400, 0.4);
    flash.setDepth(6);
    this.scene.tweens.add({
      targets: flash,
      alpha: 0,
      scaleX: 2,
      scaleY: 2,
      duration: 200,
      onComplete: () => flash.destroy()
    });
  }

  _spawnAnim() {
    // Drop in from top
    this.scene.tweens.add({
      targets: this.container,
      y: this.y,
      duration: 400,
      ease: 'Bounce.easeOut'
    });
  }

  // Called by TypingEngine — typed progress
  onProgress(typed) {
    if (!this.wordLabel) return;
    this.wordLabel.setProgress(typed);
    if (typed.length === 1) {
      this.scene.typingEngine?.onWordStart();
    }
  }

  // Called by TypingEngine — wrong key
  onWrong() {
    this.wordLabel?.showError();
  }

  // Deal damage to this enemy
  receiveDamage(amount, special = null) {
    if (!this.alive) return;

    const dmg = Math.max(1, amount - this.armor);
    this.hp = Math.max(0, this.hp - dmg);

    // Update HP bar IMMEDIATELY (before animations)
    this._updateHPBar();

    // Floating damage number (immediate visual feedback)
    FloatingText.spawn(this.scene, this.x, this.y - 30, `-${dmg}`, '#ffff44', '18px');

    // Flash white
    this._flashWhite();

    // Unregister from typing engine immediately to prevent untypeable state
    this.scene.typingEngine?.unregisterTarget(this);

    // Explode word label
    this.wordLabel?.explode();

    // Handle special effects
    if (special) this._applySpecial(special);

    if (this.hp <= 0) {
      this._die();
    } else {
      // Stagger animation
      this.scene.tweens.add({
        targets: this.container,
        x: this.x + 15,
        duration: 80,
        yoyo: true
      });
      // Re-assign new word after short delay
      this.scene.time.delayedCall(300, () => {
        if (this.alive) this._assignWord();
      });
    }
  }

  _applySpecial(special) {
    switch (special.effect) {
      case 'burn':
        this._applyBurn(special.damage || 5, special.duration || 3000);
        FloatingText.spawn(this.scene, this.x, this.y - 50, '🔥 BURN', '#ff6600', '14px');
        break;
      case 'slow':
        this._applySlow(special.duration || 2000);
        FloatingText.spawn(this.scene, this.x, this.y - 50, '❄️ SLOW', '#66ccff', '14px');
        break;
      case 'stun':
        this._applyStun(special.duration || 1000);
        FloatingText.spawn(this.scene, this.x, this.y - 50, '⚡ STUN', '#ffff00', '14px');
        break;
      case 'weaken':
        this.armor = Math.max(0, this.armor - (special.armorReduction || 1));
        FloatingText.spawn(this.scene, this.x, this.y - 50, '💀 WEAK', '#aa44aa', '14px');
        break;
    }
  }

  _applyBurn(dmg, duration) {
    if (this.burning) return;
    this.burning = true;
    const interval = this.scene.time.addEvent({
      delay: 600,
      repeat: Math.floor(duration / 600) - 1,
      callback: () => {
        if (this.alive) {
          this.hp = Math.max(0, this.hp - dmg * 0.3);
          FloatingText.spawn(this.scene, this.x + Phaser.Math.Between(-10, 10), this.y - 20, `🔥 ${Math.floor(dmg * 0.3)}`, '#ff8800', '12px');
          this._updateHPBar();
          if (this.hp <= 0) this._die();
        }
      }
    });
    this.scene.time.delayedCall(duration, () => { this.burning = false; });
  }

  _applySlow(duration) {
    this.slowed = true;
    this.scene.time.delayedCall(duration, () => { this.slowed = false; });
    this._tintColor(0x66ccff, duration);
  }

  _applyStun(duration) {
    this.stunned = true;
    this.scene.time.delayedCall(duration, () => { this.stunned = false; });
    this._tintColor(0xffff00, duration);
  }

  _tintColor(color, duration) {
    // Store original fill colors before tinting
    if (this._tintRestore) this._restoreColors();
    this._tintRestore = [];
    this.container.each(child => {
      if (child.fillColor !== undefined) {
        this._tintRestore.push({ obj: child, color: child.fillColor });
        child.setFillStyle(color);
      }
    });
    this.scene.time.delayedCall(duration, () => {
      if (this.alive) this._restoreColors();
    });
  }

  _restoreColors() {
    if (!this._tintRestore) return;
    this._tintRestore.forEach(({ obj, color }) => {
      if (obj.active) obj.setFillStyle(color);
    });
    this._tintRestore = null;
  }

  _flashWhite() {
    this._tintColor(0xffffff, 100);
  }

  _updateHPBar() {
    const ratio = Math.max(0, this.hp / this.maxHP);
    this.hpBar.setScale(ratio, 1);
    if (ratio > 0.5)       this.hpBar.setFillStyle(0x22cc44);
    else if (ratio > 0.25) this.hpBar.setFillStyle(0xffaa00);
    else                   this.hpBar.setFillStyle(0xff2222);
  }

  _die() {
    if (!this.alive) return;
    this.alive = false;

    // Unregister from typing engine
    this.scene.typingEngine?.unregisterTarget(this);

    if (this._attackTimerEvent) this._attackTimerEvent.destroy();
    if (this._wordHideTimeout) clearTimeout(this._wordHideTimeout);

    this.wordLabel?.destroy();

    // Death animation
    this.scene.tweens.add({
      targets: this.container,
      scaleX: 1.4,
      scaleY: 0,
      alpha: 0,
      duration: 300,
      ease: 'Power2',
      onComplete: () => {
        this.container.destroy(true);
        this.scene.events.emit('ENEMY_DEAD', { enemy: this });
      }
    });
  }

  slowAllTimers(ratio, duration) {
    // Used by time_slow ability
    const prevInterval = this.attackInterval;
    this.attackInterval = prevInterval / ratio;
    this.scene.time.delayedCall(duration, () => {
      this.attackInterval = prevInterval;
    });
  }

  freezeFor(duration) {
    this.stunned = true;
    this._tintColor(0xaaaaff, duration);
    this.scene.time.delayedCall(duration, () => { this.stunned = false; });
  }

  destroy() {
    if (this._attackTimerEvent) this._attackTimerEvent.destroy();
    this.wordLabel?.destroy();
    this.container?.destroy(true);
  }
}
