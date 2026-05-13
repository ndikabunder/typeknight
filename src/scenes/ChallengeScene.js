// ChallengeScene — Daily challenge selection and play

import { audioManager } from '../systems/AudioManager.js';

const CHALLENGES = [
  {
    id: 'no_miss',
    title: '🎯 Perfect Run',
    description: 'Complete 3 arenas without a single typing mistake.',
    condition: 'noMiss',
    reward: 'Bonus: 3x score multiplier',
    color: 0x22cc44
  },
  {
    id: 'speed_demon',
    title: '⚡ Speed Demon',
    description: 'Maintain 7+ CPS average for an entire arena.',
    condition: 'highCPS',
    reward: 'Bonus: Unlock Speed skin',
    color: 0xffcc00
  },
  {
    id: 'short_only',
    title: '🔡 Short Stack',
    description: 'Only use words of 4 letters or fewer. No long words!',
    condition: 'shortWordsOnly',
    reward: 'Bonus: 2x score on short words',
    color: 0x44aaff
  },
  {
    id: 'combo_king',
    title: '🔥 Combo King',
    description: 'Reach a 30x combo streak and hold it for 5 words.',
    condition: 'highCombo',
    reward: 'Bonus: Combo cap doubled',
    color: 0xff6600
  },
  {
    id: 'survival',
    title: '💀 Last Stand',
    description: 'Survive 5 waves with only 1 HP.',
    condition: 'oneHP',
    reward: 'Bonus: Permanent extra heart',
    color: 0xcc3333
  },
  {
    id: 'boss_rush',
    title: '👑 Boss Rush',
    description: 'Fight both bosses back to back with no upgrade between them.',
    condition: 'bossRush',
    reward: 'Bonus: Double boss score',
    color: 0xff4400
  },
  {
    id: 'blind_typing',
    title: '🙈 Blind Knight',
    description: 'Every enemy word is hidden immediately. Trust your memory!',
    condition: 'blindTyping',
    reward: 'Bonus: All words give epic FX',
    color: 0x884488
  }
];

export class ChallengeScene extends Phaser.Scene {
  constructor() {
    super({ key: 'ChallengeScene' });
  }

  create() {
    const W = this.cameras.main.width;
    const H = this.cameras.main.height;

    // Background
    this.add.rectangle(W / 2, H / 2, W, H, 0x08080f);

    // Stars
    const gfx = this.add.graphics();
    gfx.fillStyle(0xffffff, 0.5);
    for (let i = 0; i < 60; i++) {
      gfx.fillCircle(Phaser.Math.Between(0, W), Phaser.Math.Between(0, H * 0.6), Math.random() * 1.2 + 0.3);
    }

    // Title
    this.add.text(W / 2, 28, '⚡  CHALLENGE MODE  ⚡', {
      fontFamily: 'Courier New, monospace',
      fontSize: '26px',
      color: '#ffdd44',
      stroke: '#000000',
      strokeThickness: 4
    }).setOrigin(0.5);

    // Daily indicator
    const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
    this.add.text(W / 2, 60, `Daily Challenges — ${today}`, {
      fontFamily: 'Courier New, monospace',
      fontSize: '12px',
      color: '#555577',
      fontStyle: 'italic'
    }).setOrigin(0.5);

    // Daily seed (same for all players on same day)
    const dailySeed = this._getDailySeed();
    const todayChallenges = this._pickTodayChallenges(dailySeed, 3);

    // Render challenge cards in a row
    const cardW = 240;
    const spacing = 270;
    const startX = W / 2 - spacing;
    const cardY = H / 2 + 10;

    todayChallenges.forEach((ch, i) => {
      this._makeCard(startX + i * spacing, cardY, cardW, 200, ch);
    });

    // Progress/completion display
    this._buildCompletionBar(W, H);

    // Back button
    const backBg = this.add.rectangle(W / 2, H - 28, 160, 34, 0x111122)
      .setInteractive({ useHandCursor: true })
      .setStrokeStyle(1, 0x333355);
    const backTxt = this.add.text(W / 2, H - 28, '← MAIN MENU', {
      fontFamily: 'Courier New, monospace',
      fontSize: '13px',
      color: '#888888'
    }).setOrigin(0.5);

    backBg.on('pointerover', () => { backBg.setFillStyle(0x222244); backTxt.setStyle({ color: '#ffffff' }); });
    backBg.on('pointerout', () => { backBg.setFillStyle(0x111122); backTxt.setStyle({ color: '#888888' }); });
    backBg.on('pointerdown', () => {
      audioManager.playUIClick();
      this.cameras.main.fadeOut(300, 0, 0, 0);
      this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('MainMenuScene'));
    });

    this.input.keyboard.once('keydown-ESC', () => this.scene.start('MainMenuScene'));

    this.cameras.main.fadeIn(400, 0, 0, 0);
  }

  _makeCard(x, y, w, h, challenge) {
    const container = this.add.container(x, y);
    const c = challenge.color;

    const shadow = this.add.rectangle(4, 4, w, h, 0x000000, 0.5);
    const bg = this.add.rectangle(0, 0, w, h, 0x0d0d22)
      .setInteractive({ useHandCursor: true })
      .setStrokeStyle(2, c);

    const topBar = this.add.rectangle(0, -h / 2 + 4, w, 8, c).setOrigin(0.5, 0.5);

    const title = this.add.text(0, -h / 2 + 30, challenge.title, {
      fontFamily: 'Courier New, monospace',
      fontSize: '14px',
      color: '#ffffff',
      fontStyle: 'bold',
      align: 'center',
      wordWrap: { width: w - 20 }
    }).setOrigin(0.5);

    const divider = this.add.rectangle(0, -h / 2 + 52, w - 30, 1, 0x333355);

    const desc = this.add.text(0, -h / 2 + 70, challenge.description, {
      fontFamily: 'Courier New, monospace',
      fontSize: '11px',
      color: '#aaaaaa',
      align: 'center',
      wordWrap: { width: w - 24 }
    }).setOrigin(0.5, 0);

    const reward = this.add.text(0, h / 2 - 50, challenge.reward, {
      fontFamily: 'Courier New, monospace',
      fontSize: '10px',
      color: '#' + c.toString(16).padStart(6, '0'),
      align: 'center',
      wordWrap: { width: w - 20 }
    }).setOrigin(0.5, 0);

    // Completion badge
    const completed = this._isChallengeCompleted(challenge.id);
    const btnBg = this.add.rectangle(0, h / 2 - 18, w - 20, 28, completed ? 0x115511 : (c & 0xffffff), 0.3)
      .setStrokeStyle(1, completed ? 0x22cc44 : c);
    const btnTxt = this.add.text(0, h / 2 - 18, completed ? '✓ COMPLETED' : 'START →', {
      fontFamily: 'Courier New, monospace',
      fontSize: '13px',
      color: completed ? '#22cc44' : '#dddddd',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    container.add([shadow, bg, topBar, title, divider, desc, reward, btnBg, btnTxt]);

    if (!completed) {
      bg.on('pointerover', () => {
        this.tweens.add({ targets: container, y: y - 6, duration: 100 });
        bg.setFillStyle(0x1a1a33);
        audioManager.playUIClick();
      });
      bg.on('pointerout', () => {
        this.tweens.add({ targets: container, y, duration: 100 });
        bg.setFillStyle(0x0d0d22);
      });
      bg.on('pointerdown', () => {
        audioManager.playWordComplete(false);
        this._startChallenge(challenge);
      });
    }

    // Entry animation
    container.setAlpha(0).setY(y + 80);
    this.tweens.add({ targets: container, y, alpha: 1, duration: 400, delay: container.length * 80, ease: 'Power2' });
  }

  _buildCompletionBar(W, H) {
    const allChallenges = CHALLENGES;
    const completedCount = allChallenges.filter(c => this._isChallengeCompleted(c.id)).length;
    const ratio = completedCount / allChallenges.length;

    const barY = H - 60;
    this.add.text(W / 2, barY - 12, `Total Progress: ${completedCount} / ${allChallenges.length}`, {
      fontFamily: 'Courier New, monospace',
      fontSize: '11px',
      color: '#555577'
    }).setOrigin(0.5);
    this.add.rectangle(W / 2, barY, 400, 8, 0x111133).setStrokeStyle(1, 0x222244);
    this.add.rectangle(W / 2 - 200, barY, 400 * ratio, 8, 0x22cc44).setOrigin(0, 0.5);
  }

  _getDailySeed() {
    const d = new Date();
    return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
  }

  _pickTodayChallenges(seed, count) {
    // Deterministic shuffle using seed
    const arr = [...CHALLENGES];
    let s = seed;
    for (let i = arr.length - 1; i > 0; i--) {
      s = (s * 1664525 + 1013904223) & 0xffffffff;
      const j = Math.abs(s) % (i + 1);
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr.slice(0, count);
  }

  _isChallengeCompleted(id) {
    try {
      const data = JSON.parse(localStorage.getItem('challenge_progress') || '{}');
      const today = new Date().toDateString();
      return data[today]?.includes(id) || false;
    } catch (e) {
      return false;
    }
  }

  _markChallengeCompleted(id) {
    try {
      const data = JSON.parse(localStorage.getItem('challenge_progress') || '{}');
      const today = new Date().toDateString();
      if (!data[today]) data[today] = [];
      if (!data[today].includes(id)) data[today].push(id);
      localStorage.setItem('challenge_progress', JSON.stringify(data));
    } catch (e) {
      // localStorage may be unavailable
    }
  }

  _startChallenge(challenge) {
    // Launch game with challenge modifiers
    this.cameras.main.fadeOut(400, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.start('GameScene', {
        mode: 'challenge',
        challengeId: challenge.id,
        challengeCondition: challenge.condition,
        arenaIndex: 0
      });
    });
  }
}
