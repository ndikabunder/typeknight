// GameOverScene — Stats, leaderboard, retry

import { audioManager } from '../systems/AudioManager.js';

export class GameOverScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameOverScene' });
  }

  init(data) {
    this.score = data.score || 0;
    this.mode = data.mode || 'story';
    this.victory = data.victory || false;
    this.stats = data.stats || {};
    this.challengeId = data.challengeId || null;
    this.challengeCondition = data.challengeCondition || null;
  }

  create() {
    const W = this.cameras.main.width;
    const H = this.cameras.main.height;

    // Stop any playing BGM
    audioManager.stopBGM();

    // Save score to leaderboard
    if (this.mode === 'endless' || this.victory) {
      this._saveScore();
    }

    // Background with subtle gradient effect
    this.add.rectangle(W / 2, H / 2, W, H, 0x050510);
    // Vignette overlay
    const vignette = this.add.graphics();
    vignette.fillStyle(0x000000, 0.3);
    vignette.fillRect(0, 0, W, H);
    vignette.setDepth(0);

    // Title
    const titleColor = this.victory ? '#ffdd44' : '#ff4444';
    const titleText = this.victory ? '🏆 VICTORY!' : '💀 GAME OVER';
    const title = this.add.text(W / 2, 45, titleText, {
      fontFamily: 'Courier New, monospace',
      fontSize: '40px',
      color: titleColor,
      stroke: '#000000',
      strokeThickness: 6,
      shadow: { offsetX: 2, offsetY: 2, color: '#000000', blur: 8, fill: true }
    }).setOrigin(0.5).setAlpha(0).setDepth(10);

    this.tweens.add({ targets: title, alpha: 1, duration: 500 });

    // Score with prominent display
    const scoreBg = this.add.rectangle(W / 2, 95, 280, 44, 0x111125, 0.9).setDepth(9);
    scoreBg.setStrokeStyle(2, this.victory ? 0xffdd44 : 0xcc3333);

    const scoreLabel = this.add.text(W / 2, 82, 'FINAL SCORE', {
      fontFamily: 'Courier New, monospace',
      fontSize: '10px',
      color: '#888899'
    }).setOrigin(0.5).setDepth(10);

    const scoreTxt = this.add.text(W / 2, 102, `${this.score.toLocaleString()}`, {
      fontFamily: 'Courier New, monospace',
      fontSize: '28px',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 4,
      shadow: { offsetX: 1, offsetY: 1, color: this.victory ? '#ffdd44' : '#cc3333', blur: 10, fill: true }
    }).setOrigin(0.5).setAlpha(0).setDepth(10);
    this.tweens.add({ targets: scoreTxt, alpha: 1, duration: 500, delay: 150 });

    // Stats panel
    this._buildStatPanel(W, H);

    // Leaderboard
    this._buildLeaderboard(W, H);

    // Buttons
    this._buildButtons(W, H);

    this.cameras.main.fadeIn(600, 0, 0, 0);

    if (this.victory) audioManager.playVictory();
  }

  _buildStatPanel(W, H) {
    const s = this.stats;
    const gap = 16;
    const panelW = 260;
    const panelH = 210;
    const panelX = W / 2 - panelW - gap / 2;
    const panelY = 135;

    // Panel background with border
    this.add.rectangle(panelX + panelW / 2, panelY + panelH / 2, panelW, panelH, 0x0d0d22, 0.95)
      .setStrokeStyle(1.5, 0x333366).setDepth(5);

    // Panel title
    this.add.text(panelX + panelW / 2, panelY + 14, '⚔️ BATTLE STATS', {
      fontFamily: 'Courier New, monospace',
      fontSize: '12px',
      color: '#8888cc',
      stroke: '#000000',
      strokeThickness: 1
    }).setOrigin(0.5, 0).setDepth(10);

    // Divider line
    this.add.rectangle(panelX + panelW / 2, panelY + 34, panelW - 30, 1, 0x333366, 0.5).setDepth(10);

    const rows = [
      ['Words Typed',   s.wordsTyped   || 0, '#88ddff'],
      ['Perfect Words', s.perfectWords || 0, '#88ff88'],
      ['Accuracy',      `${Math.round((s.accuracy || 0) * 100)}%`, '#ffcc44'],
      ['WPM',           s.wpm          || 0, '#ff88cc'],
      ['Peak Combo',    `x${s.comboPeak || 0}`, '#ff8844'],
      ['Kills',         s.killCount    || 0, '#ff6666'],
    ];

    rows.forEach(([label, val, valColor], i) => {
      const rowY = panelY + 46 + i * 27;
      
      // Row background for alternating visibility
      if (i % 2 === 0) {
        this.add.rectangle(panelX + panelW / 2, rowY + 4, panelW - 16, 24, 0xffffff, 0.03).setDepth(6);
      }
      
      // Label
      this.add.text(panelX + 16, rowY, label, {
        fontFamily: 'Courier New, monospace',
        fontSize: '12px',
        color: '#aabbdd'
      }).setDepth(10);
      
      // Value — bright, clearly visible
      this.add.text(panelX + panelW - 16, rowY, String(val), {
        fontFamily: 'Courier New, monospace',
        fontSize: '15px',
        color: valColor,
        stroke: '#000000',
        strokeThickness: 3,
        shadow: { offsetX: 0, offsetY: 0, color: valColor, blur: 6, fill: true }
      }).setOrigin(1, 0).setDepth(10);
    });
  }

  _buildLeaderboard(W, H) {
    const top = this._getLeaderboard();
    const gap = 16;
    const panelW = 260;
    const panelH = 210;
    const panelX = W / 2 + gap / 2;
    const panelY = 135;

    // Panel background
    this.add.rectangle(panelX + panelW / 2, panelY + panelH / 2, panelW, panelH, 0x0d0d22, 0.95)
      .setStrokeStyle(1.5, 0x333366).setDepth(5);

    // Panel title
    this.add.text(panelX + panelW / 2, panelY + 14, `🏅 TOP SCORES`, {
      fontFamily: 'Courier New, monospace',
      fontSize: '12px',
      color: '#ffdd88',
      stroke: '#000000',
      strokeThickness: 1
    }).setOrigin(0.5, 0).setDepth(10);

    // Mode subtitle
    this.add.text(panelX + panelW / 2, panelY + 30, `(${this.mode.toUpperCase()})`, {
      fontFamily: 'Courier New, monospace',
      fontSize: '9px',
      color: '#666688'
    }).setOrigin(0.5, 0).setDepth(10);

    // Divider
    this.add.rectangle(panelX + panelW / 2, panelY + 44, panelW - 30, 1, 0x333366, 0.5).setDepth(10);

    const medals = ['🥇', '🥈', '🥉', '4.', '5.'];
    const medalColors = ['#ffd700', '#c0c0c0', '#cd7f32', '#aabbcc', '#aabbcc'];
    
    top.slice(0, 5).forEach((entry, i) => {
      const rowY = panelY + 54 + i * 30;
      const highlight = entry.score === this.score;
      
      // Highlight current score row
      if (highlight) {
        this.add.rectangle(panelX + panelW / 2, rowY + 6, panelW - 10, 26, 0xffdd44, 0.1)
          .setStrokeStyle(1, 0xffdd44, 0.3).setDepth(6);
      }
      
      const nameColor = highlight ? '#ffff88' : '#ddeeee';
      const scoreColor = highlight ? '#ffdd44' : '#ffcc66';
      
      this.add.text(panelX + 12, rowY, `${medals[i]}`, {
        fontFamily: 'Courier New, monospace', fontSize: '13px', color: medalColors[i]
      }).setDepth(10);
      
      this.add.text(panelX + 38, rowY, `${entry.name}`, {
        fontFamily: 'Courier New, monospace', fontSize: '12px', color: nameColor
      }).setDepth(10);
      
      this.add.text(panelX + panelW - 12, rowY, String(entry.score.toLocaleString()), {
        fontFamily: 'Courier New, monospace', fontSize: '13px', color: scoreColor,
        stroke: '#000000', strokeThickness: 2
      }).setOrigin(1, 0).setDepth(10);
    });

    if (top.length === 0) {
      this.add.text(panelX + panelW / 2, panelY + panelH / 2 + 10, 'No scores yet!', {
        fontFamily: 'Courier New, monospace', fontSize: '12px', color: '#666688'
      }).setOrigin(0.5).setDepth(10);
    }
  }

  _buildButtons(W, H) {
    const btns = [
      { label: '🔄 RETRY',      key: 'retry',  color: 0xcc3333, hoverColor: '#ff8888' },
      { label: '🏠 MAIN MENU',  key: 'menu',   color: 0x3366aa, hoverColor: '#88bbff' },
    ];

    btns.forEach((btn, i) => {
      const x = W / 2 + (i === 0 ? -100 : 100);
      const y = H - 50;
      const bg = this.add.rectangle(x, y, 170, 42, 0x111125)
        .setInteractive({ useHandCursor: true })
        .setStrokeStyle(2, btn.color).setDepth(10);
      const txt = this.add.text(x, y, btn.label, {
        fontFamily: 'Courier New, monospace',
        fontSize: '15px',
        color: '#ccccdd',
        stroke: '#000000',
        strokeThickness: 2
      }).setOrigin(0.5).setDepth(11);

      bg.on('pointerover', () => {
        bg.setFillStyle(btn.color, 0.35);
        txt.setStyle({ color: btn.hoverColor, stroke: '#000000', strokeThickness: 2 });
        audioManager.playUIClick();
      });
      bg.on('pointerout', () => {
        bg.setFillStyle(0x111125);
        txt.setStyle({ color: '#ccccdd', stroke: '#000000', strokeThickness: 2 });
      });
      bg.on('pointerdown', () => {
        audioManager.playUIClick();
        this.cameras.main.fadeOut(300, 0, 0, 0);
        this.cameras.main.once('camerafadeoutcomplete', () => {
          if (btn.key === 'retry') {
            this.scene.start('GameScene', {
              mode: this.mode,
              challengeId: this.challengeId,
              challengeCondition: this.challengeCondition
            });
          } else {
            this.scene.start('MainMenuScene');
          }
        });
      });
    });
  }

  _saveScore() {
    try {
      const key = `leaderboard_${this.mode}`;
      const existing = JSON.parse(localStorage.getItem(key) || '[]');
      existing.push({ score: this.score, name: 'KNIGHT', date: Date.now() });
      existing.sort((a, b) => b.score - a.score);
      localStorage.setItem(key, JSON.stringify(existing.slice(0, 10)));
    } catch (e) {
      // localStorage may be unavailable or full
    }
  }

  _getLeaderboard() {
    try {
      const key = `leaderboard_${this.mode}`;
      return JSON.parse(localStorage.getItem(key) || '[]');
    } catch (e) {
      return [];
    }
  }
}
