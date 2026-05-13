// MainMenuScene — Main menu with animated background

import { audioManager } from '../systems/AudioManager.js';
import { storyManager } from '../systems/StoryManager.js';

export class MainMenuScene extends Phaser.Scene {
  constructor() {
    super({ key: 'MainMenuScene' });
  }

  create() {
    const W = this.cameras.main.width;
    const H = this.cameras.main.height;

    // Start menu music
    audioManager.startBGM('menu');

    // ── Background ─────────────────────────────────────────────
    this._buildBackground(W, H);

    // ── Title ──────────────────────────────────────────────────
    const titleGroup = this.add.container(W / 2, 80);

    const sword1 = this.add.text(-140, -5, '🗡️', { fontSize: '30px' });
    const sword2 = this.add.text(120, -5, '🗡️', { fontSize: '30px' }).setFlipX(true);
    const titleText = this.add.text(0, 0, 'TYPE KNIGHT', {
      fontFamily: 'Courier New, monospace',
      fontSize: '48px',
      color: '#ffffff',
      stroke: '#cc3333',
      strokeThickness: 5,
      shadow: { offsetX: 2, offsetY: 2, color: '#000000', blur: 6, fill: true }
    }).setOrigin(0.5);

    const subtitle = this.add.text(0, 40, '"Your fingers are your sword"', {
      fontFamily: 'Courier New, monospace',
      fontSize: '14px',
      color: '#777788',
      fontStyle: 'italic'
    }).setOrigin(0.5);

    titleGroup.add([sword1, sword2, titleText, subtitle]);

    // Title float
    this.tweens.add({
      targets: titleGroup,
      y: 85,
      duration: 2500,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    // ── Divider line ───────────────────────────────────────────
    this.add.rectangle(W / 2, 135, 320, 1, 0x333355).setAlpha(0.6);

    // ── Menu Buttons ───────────────────────────────────────────
    this.buttons = [
      { label: '⚔️  STORY MODE',     key: 'story',     color: 0xcc3333, desc: 'Fight through 7 arenas' },
      { label: '♾️  ENDLESS MODE',   key: 'endless',   color: 0xcc6600, desc: 'Survive the horde' },
      { label: '⚡  CHALLENGE',      key: 'challenge', color: 0x8833cc, desc: 'Daily challenges' },
      { label: '🏋️  PRACTICE',       key: 'practice',  color: 0x2288cc, desc: 'Train your typing' },
      { label: '🏆  LEADERBOARD',    key: 'leaderboard', color: 0x229944, desc: 'View high scores' },
    ];
    this.selectedIndex = 0;

    const btnStartY = 165;
    const btnSpacing = 52;
    this.buttons.forEach((btn, i) => {
      this._makeButton(W / 2, btnStartY + i * btnSpacing, btn, W);
    });

    // ── Bottom info area ───────────────────────────────────────
    // Separator
    this.add.rectangle(W / 2, H - 72, 400, 1, 0x222233).setAlpha(0.5);

    // Instructions
    this.add.text(W / 2, H - 55, 'Type words to attack  •  BLOCK / DODGE to defend  •  ESC to pause', {
      fontFamily: 'Courier New, monospace',
      fontSize: '11px',
      color: '#444455'
    }).setOrigin(0.5);

    // Enter hint
    const pressText = this.add.text(W / 2, H - 35, '[ Press ENTER for Story Mode ]', {
      fontFamily: 'Courier New, monospace',
      fontSize: '13px',
      color: '#cc3333'
    }).setOrigin(0.5);

    this.tweens.add({
      targets: pressText,
      alpha: 0.2,
      duration: 800,
      yoyo: true,
      repeat: -1
    });

    // Version
    this.add.text(W / 2, H - 14, 'v1.0  •  Built with Phaser 3', {
      fontFamily: 'Courier New, monospace',
      fontSize: '10px',
      color: '#333344'
    }).setOrigin(0.5);

    this.input.keyboard.once('keydown-ENTER', () => {
      this._startGame('story');
    });
  }

  _buildBackground(W, H) {
    this.add.rectangle(W / 2, H / 2, W, H, 0x0a0a1a);

    // Castle silhouette (simple rectangles forming battlements)
    const gfx = this.add.graphics();
    gfx.fillStyle(0x111122, 1);

    // Ground
    gfx.fillRect(0, H - 60, W, 60);

    // Castle walls
    gfx.fillRect(0, H - 180, 100, 120);
    gfx.fillRect(W - 100, H - 180, 100, 120);
    gfx.fillRect(W / 2 - 70, H - 200, 140, 140);

    // Battlements
    for (let x = 8; x < 108; x += 22) gfx.fillRect(x, H - 210, 12, 30);
    for (let x = W - 100; x < W; x += 22) gfx.fillRect(x, H - 210, 12, 30);
    for (let x = W / 2 - 70; x < W / 2 + 70; x += 22) gfx.fillRect(x, H - 230, 12, 30);

    // Stars
    gfx.fillStyle(0xffffff, 1);
    for (let i = 0; i < 60; i++) {
      const sx = Phaser.Math.Between(0, W);
      const sy = Phaser.Math.Between(0, H - 200);
      const sr = Math.random() * 1.2 + 0.3;
      gfx.fillCircle(sx, sy, sr);
    }

    // Moon
    this.add.circle(W - 70, 50, 25, 0xffeedd).setAlpha(0.8);
    this.add.circle(W - 62, 46, 23, 0x0a0a1a); // shadow

    // Floating runes decoration
    const runes = ['ᚠ', 'ᚢ', 'ᚦ', 'ᚨ', 'ᚱ', 'ᚲ', 'ᚷ'];
    runes.forEach((r, i) => {
      const rt = this.add.text(
        Phaser.Math.Between(20, W - 20),
        Phaser.Math.Between(120, H - 180),
        r, { fontFamily: 'serif', fontSize: '16px', color: '#222244' }
      ).setAlpha(0.3);
      this.tweens.add({
        targets: rt,
        y: rt.y - 15,
        alpha: 0.08,
        duration: Phaser.Math.Between(4000, 8000),
        yoyo: true,
        repeat: -1,
        delay: i * 500
      });
    });
  }

  _makeButton(x, y, btnDef, W) {
    const btnW = 300;
    const btnH = 42;

    const bg = this.add.rectangle(x, y, btnW, btnH, 0x0d0d1a)
      .setInteractive({ useHandCursor: true })
      .setStrokeStyle(1, btnDef.color, 0.6);

    const label = this.add.text(x - 10, y - 2, btnDef.label, {
      fontFamily: 'Courier New, monospace',
      fontSize: '15px',
      color: '#bbbbcc'
    }).setOrigin(0.5);

    const desc = this.add.text(x + btnW / 2 - 12, y + 2, btnDef.desc, {
      fontFamily: 'Courier New, monospace',
      fontSize: '9px',
      color: '#444455'
    }).setOrigin(1, 0.5);

    // Hover
    bg.on('pointerover', () => {
      bg.setFillStyle(btnDef.color, 0.2);
      bg.setStrokeStyle(2, btnDef.color);
      label.setStyle({ color: '#ffffff' });
      desc.setStyle({ color: '#888899' });
      audioManager.playUIClick();
      this.tweens.add({ targets: [bg, label, desc], scaleX: 1.02, duration: 60 });
    });
    bg.on('pointerout', () => {
      bg.setFillStyle(0x0d0d1a);
      bg.setStrokeStyle(1, btnDef.color, 0.6);
      label.setStyle({ color: '#bbbbcc' });
      desc.setStyle({ color: '#444455' });
      this.tweens.add({ targets: [bg, label, desc], scaleX: 1, duration: 60 });
    });
    bg.on('pointerdown', () => {
      audioManager.playUIClick();
      this._startGame(btnDef.key);
    });
  }

  _startGame(mode) {
    audioManager.playUIClick();
    
    if (mode === 'leaderboard') {
      this.cameras.main.fadeOut(300, 0, 0, 0);
      this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('LeaderboardScene'));
      return;
    }

    // Default to story if no mode provided
    if (!mode) {
      mode = 'story';
    }

    audioManager.playMenuSelect();

    // Reset story for new game
    storyManager.reset();

    // Fade out then start game
    this.cameras.main.fadeOut(400, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.start('GameScene', { mode });
    });
  }
}
