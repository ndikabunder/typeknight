// Player — The Knight
// Placeholder visual: red capsule body + sword rectangle

export class Player {
  constructor(scene, x, y) {
    this.scene = scene;
    this.x = x;
    this.y = y;

    // Stats
    this.maxHP = 3;
    this.hp = 3;
    this.armor = 0;
    this.alive = true;

    // Invincibility frames after taking hit - reduced for responsive feel
    this.invincible = false;
    this.invincibleDuration = 600;

    // State machine
    this.state = 'idle'; // idle | typing | hit | dead | dodge

    // Build graphics
    this._buildGraphics();
    this._setupAnims();
  }

  _buildGraphics() {
    this.container = this.scene.add.container(this.x, this.y);

    // Shadow
    this.shadow = this.scene.add.ellipse(0, 22, 36, 10, 0x000000, 0.3);

    // Body (capsule = rounded rect via circle + rect)
    this.body = this.scene.add.rectangle(0, 0, 28, 38, 0xcc3333)
      .setOrigin(0.5, 0.5);
    this.body.setStrokeStyle(2, 0xff6666);

    // Head
    this.head = this.scene.add.circle(0, -28, 12, 0xdd4444);
    this.head.setStrokeStyle(2, 0xff8888);

    // Visor slit
    this.visor = this.scene.add.rectangle(0, -28, 16, 4, 0x88ccff)
      .setOrigin(0.5, 0.5);

    // Sword
    this.sword = this.scene.add.rectangle(20, -5, 6, 30, 0xcccccc);
    this.sword.setStrokeStyle(1, 0xffffff);
    this.swordGuard = this.scene.add.rectangle(20, -5, 14, 5, 0xaaaa00);

    this.container.add([this.shadow, this.body, this.head, this.visor, this.sword, this.swordGuard]);
    this.container.setDepth(5);
  }

  _setupAnims() {
    // Idle float tween
    this._idleTween = this.scene.tweens.add({
      targets: this.container,
      y: this.y - 4,
      duration: 800,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });
  }

  setState(state) {
    this.state = state;
  }

  // Take damage (returns true if survived)
  takeDamage(amount) {
    if (!this.alive) return false;
    // Invincibility only prevents ADDITIONAL hits, not the first hit
    if (this.invincible) return true; // survived but no damage taken

    const dmg = Math.max(0, amount - this.armor);
    this.hp = Math.max(0, this.hp - dmg);

    if (dmg > 0) {
      this._flashRed();
      this._setInvincible();
      this.scene.cameras.main.shake(200, 0.01);
    }

    if (this.hp <= 0) {
      this._die();
      return false;
    }
    return true;
  }

  healHP(amount) {
    this.hp = Math.min(this.maxHP, this.hp + amount);
    this._flashGreen();
  }

  _flashRed() {
    if (this._idleTween) this._idleTween.pause();

    // Impact flash
    this.body.setFillStyle(0xff4444);
    this.head.setFillStyle(0xff6666);

    // Impact burst
    const burst = this.scene.add.circle(this.x, this.y - 10, 20, 0xff2222, 0.5);
    burst.setDepth(6);
    this.scene.tweens.add({
      targets: burst,
      alpha: 0,
      scaleX: 2,
      scaleY: 2,
      duration: 250,
      onComplete: () => burst.destroy()
    });

    let flashes = 0;
    const flash = () => {
      flashes++;
      const isRed = flashes % 2 === 0;
      this.body.setFillStyle(isRed ? 0xff4444 : 0xcc3333);
      this.head.setFillStyle(isRed ? 0xff6666 : 0xdd4444);
      if (flashes < 6) {
        this.scene.time.delayedCall(70, flash);
      } else {
        this.body.setFillStyle(0xcc3333);
        this.head.setFillStyle(0xdd4444);
        if (this._idleTween) this._idleTween.resume();
      }
    };
    this.scene.time.delayedCall(70, flash);

    // Knockback
    this.scene.tweens.add({
      targets: this.container,
      x: this.x - 25,
      duration: 100,
      ease: 'Power2',
      yoyo: true
    });
  }

  _flashGreen() {
    this.body.setFillStyle(0x00ff88);
    this.head.setFillStyle(0x44ffaa);
    this.scene.time.delayedCall(300, () => {
      if (this.alive) {
        this.body.setFillStyle(0xcc3333);
        this.head.setFillStyle(0xdd4444);
      }
    });
  }

  _setInvincible() {
    this.invincible = true;
    // Flicker while invincible
    this._flickerTween = this.scene.tweens.add({
      targets: this.container,
      alpha: 0.3,
      duration: 100,
      yoyo: true,
      repeat: 3,
      onComplete: () => {
        this.container.setAlpha(1);
        this.invincible = false;
      }
    });
  }

  playAttackAnim(targetX) {
    if (this._idleTween) this._idleTween.pause();

    // Calculate lunge distance toward enemy
    const lungeX = targetX ? Math.min(targetX - this.x - 60, 80) : 50;

    // Phase 1: Lunge forward + sword swing
    this.scene.tweens.add({
      targets: this.container,
      x: this.x + lungeX,
      duration: 120,
      ease: 'Power2'
    });

    // Sword swing: wind up then slash
    this.scene.tweens.add({
      targets: this.sword,
      angle: -90,
      duration: 60,
      ease: 'Power1',
      onComplete: () => {
        // Slash down
        this.scene.tweens.add({
          targets: this.sword,
          angle: 30,
          duration: 80,
          ease: 'Bounce.easeOut',
          onComplete: () => {
            // Return to idle
            this.scene.tweens.add({
              targets: this.sword,
              angle: 0,
              duration: 150
            });
          }
        });
      }
    });

    // Phase 2: Return to position
    this.scene.time.delayedCall(200, () => {
      this.scene.tweens.add({
        targets: this.container,
        x: this.x,
        duration: 200,
        ease: 'Sine.easeOut',
        onComplete: () => {
          if (this._idleTween) this._idleTween.resume();
        }
      });
    });

    // Slash trail effect (white arc)
    const trail = this.scene.add.rectangle(this.x + lungeX + 10, this.y - 10, 40, 3, 0xffffff, 0.8);
    trail.setDepth(6).setAngle(-30);
    this.scene.tweens.add({
      targets: trail,
      alpha: 0,
      scaleX: 2,
      duration: 200,
      onComplete: () => trail.destroy()
    });
  }

  playDodgeAnim(direction = 1) {
    if (this._idleTween) this._idleTween.pause();
    // Quick sidestep + afterimage
    const afterimage = this.scene.add.rectangle(this.x, this.y, 28, 38, 0xcc3333, 0.3);
    afterimage.setDepth(4).setStrokeStyle(1, 0xff6666, 0.3);
    this.scene.tweens.add({
      targets: afterimage,
      alpha: 0,
      duration: 300,
      onComplete: () => afterimage.destroy()
    });

    this.scene.tweens.add({
      targets: this.container,
      x: this.x + direction * 70,
      duration: 100,
      ease: 'Power2',
      yoyo: true,
      onComplete: () => {
        if (this._idleTween) this._idleTween.resume();
      }
    });
  }

  playBlockAnim() {
    // Shield flash + guard expand
    const shield = this.scene.add.circle(this.x + 15, this.y - 5, 25, 0x4488ff, 0.4);
    shield.setDepth(6).setStrokeStyle(2, 0x88aaff, 0.6);
    this.scene.tweens.add({
      targets: shield,
      alpha: 0,
      scaleX: 1.5,
      scaleY: 1.5,
      duration: 300,
      onComplete: () => shield.destroy()
    });
    this.scene.tweens.add({
      targets: this.swordGuard,
      scaleX: 2.5,
      duration: 80,
      yoyo: true,
      repeat: 1
    });
  }

  _die() {
    this.alive = false;
    if (this._idleTween) this._idleTween.stop();
    this.scene.tweens.add({
      targets: this.container,
      angle: 90,
      alpha: 0,
      y: this.y + 30,
      duration: 600,
      ease: 'Power2',
      onComplete: () => {
        this.scene.events.emit('PLAYER_DEAD');
      }
    });
  }

  setMaxHP(hp) {
    this.maxHP = hp;
    this.hp = hp;
  }

  destroy() {
    if (this._idleTween) this._idleTween.stop();
    this.container.destroy(true);
  }
}
