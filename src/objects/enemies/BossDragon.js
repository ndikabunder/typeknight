import { BaseEnemy } from './BaseEnemy.js';
import { FloatingText } from '../FloatingText.js';
import { getWordsByTier } from '../../data/words.js';

export class BossDragon extends BaseEnemy {
  constructor(scene, x, y) {
    super(scene, x, y, {
      hp: 500, damage: 2,
      attackInterval: 3500,
      attackWarningTime: 2500,
      wordTierBonus: 3,
      attackType: 'fire'
    });
    this.phase = 1;
    this.isBoss = true;
    this._scrambleMode = false;
  }

  _buildGraphics() {
    this.container = this.scene.add.container(this.x, this.y - 250);
    this.container.setDepth(4);

    // Big triangle body
    this.body = this.scene.add.triangle(0, 20, 0, -60, -55, 50, 55, 50, 0xcc2200);
    this.body.setStrokeStyle(4, 0xff4422);

    // Head circle
    this.head = this.scene.add.circle(0, -60, 28, 0xdd3311);
    this.head.setStrokeStyle(3, 0xff5533);

    // Snout
    this.snout = this.scene.add.ellipse(18, -58, 20, 14, 0xbb2200);

    // Eyes
    this.eyeL = this.scene.add.circle(-10, -65, 6, 0xffcc00);
    this.eyeR = this.scene.add.circle(10, -65, 6, 0xffcc00);
    this.pupilL = this.scene.add.ellipse(-10, -65, 3, 6, 0x000000);
    this.pupilR = this.scene.add.ellipse(10, -65, 3, 6, 0x000000);

    // Wings (lines)
    this.wingL = this.scene.add.triangle(-60, -10, 0, 0, -50, -60, -30, 0, 0xaa1a00);
    this.wingL.setStrokeStyle(2, 0xff3300);
    this.wingR = this.scene.add.triangle(60, -10, 0, 0, 50, -60, 30, 0, 0xaa1a00);
    this.wingR.setStrokeStyle(2, 0xff3300);

    // Tail
    this.tail = this.scene.add.triangle(-40, 50, 0, 0, -60, 30, -50, -10, 0xcc2200);

    // Flame glow
    this.flame = this.scene.add.circle(26, -58, 5, 0xff6600);
    this.scene.tweens.add({
      targets: this.flame,
      scaleX: 2, scaleY: 2,
      alpha: 0.6,
      duration: 400,
      yoyo: true,
      repeat: -1
    });

    // Wing flap
    this.scene.tweens.add({
      targets: [this.wingL, this.wingR],
      scaleY: 0.6,
      duration: 600,
      yoyo: true,
      repeat: -1
    });

    this.container.add([
      this.wingL, this.wingR, this.tail,
      this.body, this.head, this.snout,
      this.eyeL, this.eyeR, this.pupilL, this.pupilR,
      this.flame
    ]);

    this._buildHUD();
    this.hpBarBg.setScale(4, 1.5);
    this.hpBar.setScale(4, 1.5);
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
    this._scrambleMode = true; // Words now scrambled
    this.attackInterval = 3000;
    FloatingText.spawn(this.scene, this.x, this.y - 100, '🔥 WORDS SCRAMBLED!', '#ff6600', '20px');
    this.scene.cameras.main.shake(500, 0.025);
    this.scene.events.emit('BOSS_PHASE_CHANGE', { phase: 2, label: 'Dragon awakens! Words scrambled!' });
  }

  _enterPhase3() {
    this.phase = 3;
    this.attackInterval = 2000;
    FloatingText.spawn(this.scene, this.x, this.y - 100, '🌋 FIRE BREATH INCOMING!', '#ff0000', '22px');
    this.scene.cameras.main.shake(700, 0.04);
    this.scene.events.emit('BOSS_PHASE_CHANGE', { phase: 3, label: 'FIRE BREATH MODE!' });
  }

  _assignWord(forceWord = null) {
    if (this._scrambleMode) {
      // Get a real word then scramble its letters
      const words = getWordsByTier('ADVANCED', 1);
      const orig = words[0] || 'THUNDER';
      const scrambled = this._scramble(orig);
      // Store original for matching
      this._originalWord = orig;
      super._assignWord(scrambled);
      this.currentWord = orig; // matching still uses original
    } else {
      super._assignWord(forceWord);
    }
  }

  _scramble(word) {
    // Fisher-Yates shuffle
    const arr = word.split('');
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    // If identical, scramble again
    return arr.join('') === word ? this._scramble(word) : arr.join('');
  }

  _fireAttack() {
    if (!this.alive) return;

    if (this.phase >= 3 && Math.random() < 0.4) {
      this._fireBreath();
      return;
    }
    super._fireAttack();
  }

  _fireBreath() {
    // Sequential words to type in 5 seconds
    const words = getWordsByTier('STANDARD', 3);
    this.scene.events.emit('SPECIAL_CHALLENGE', {
      words,
      timeLimit: 5000,
      label: '🔥 FIRE BREATH! Type all words:',
      punishment: { damage: 2 }
    });

    // Breathe animation
    this.scene.tweens.add({
      targets: this.flame,
      scaleX: 8, scaleY: 8,
      alpha: 1,
      duration: 300,
      yoyo: true,
      onComplete: () => {
        this.scene.cameras.main.flash(200, 255, 80, 0);
      }
    });
  }

  receiveDamage(amount, special) {
    super.receiveDamage(amount, special);
    if (this.alive) this._updatePhase();
  }
}
