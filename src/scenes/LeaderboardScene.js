// LeaderboardScene — View top scores

import { audioManager } from '../systems/AudioManager.js';

export class LeaderboardScene extends Phaser.Scene {
  constructor() {
    super({ key: 'LeaderboardScene' });
  }

  create() {
    const W = this.cameras.main.width;
    const H = this.cameras.main.height;

    this.add.rectangle(W / 2, H / 2, W, H, 0x050510);

    this.add.text(W / 2, 35, '🏆 LEADERBOARD', {
      fontFamily: 'Courier New, monospace',
      fontSize: '30px',
      color: '#ffdd88',
      stroke: '#000000',
      strokeThickness: 3
    }).setOrigin(0.5);

    const modes = ['story', 'endless', 'challenge'];
    modes.forEach((mode, mi) => {
      const ox = W / 2 - 260 + mi * 260;
      this._renderBoard(ox, 90, mode);
    });

    // Back button
    const backBg = this.add.rectangle(W / 2, H - 40, 160, 36, 0x111122)
      .setInteractive({ useHandCursor: true })
      .setStrokeStyle(1, 0x4444aa);
    const backTxt = this.add.text(W / 2, H - 40, '← BACK', {
      fontFamily: 'Courier New, monospace',
      fontSize: '14px',
      color: '#aaaaaa'
    }).setOrigin(0.5);

    backBg.on('pointerover', () => { backBg.setFillStyle(0x222244); backTxt.setStyle({ color: '#ffffff' }); });
    backBg.on('pointerout', () => { backBg.setFillStyle(0x111122); backTxt.setStyle({ color: '#aaaaaa' }); });
    backBg.on('pointerdown', () => {
      audioManager.playUIClick();
      this.cameras.main.fadeOut(300, 0, 0, 0);
      this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('MainMenuScene'));
    });

    this.cameras.main.fadeIn(400, 0, 0, 0);
  }

  _renderBoard(x, y, mode) {
    const data = JSON.parse(localStorage.getItem(`leaderboard_${mode}`) || '[]');
    const modeLabel = mode.toUpperCase();

    this.add.rectangle(x, y + 140, 240, 290, 0x0d0d22)
      .setStrokeStyle(1, 0x333366);

    this.add.text(x, y + 10, `— ${modeLabel} —`, {
      fontFamily: 'Courier New, monospace',
      fontSize: '14px',
      color: '#8888bb'
    }).setOrigin(0.5);

    const medals = ['🥇', '🥈', '🥉', '4', '5', '6', '7', '8', '9', '10'];

    if (data.length === 0) {
      this.add.text(x, y + 140, 'No scores yet.\nPlay to record!', {
        fontFamily: 'Courier New, monospace',
        fontSize: '12px',
        color: '#444455',
        align: 'center'
      }).setOrigin(0.5);
    }

    data.slice(0, 10).forEach((entry, i) => {
      this.add.text(x - 100, y + 40 + i * 24, `${medals[i]}  ${entry.name || 'KNIGHT'}`, {
        fontFamily: 'Courier New, monospace',
        fontSize: '11px',
        color: i === 0 ? '#ffdd44' : '#cccccc'
      });
      this.add.text(x + 100, y + 40 + i * 24, String(entry.score), {
        fontFamily: 'Courier New, monospace',
        fontSize: '11px',
        color: i === 0 ? '#ffdd44' : '#cccccc'
      }).setOrigin(1, 0);
    });
  }
}
