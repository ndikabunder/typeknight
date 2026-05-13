// UpgradeScene — Choose 1 of 3 upgrade cards between arenas

import { audioManager } from '../systems/AudioManager.js';

export class UpgradeScene extends Phaser.Scene {
  constructor() {
    super({ key: 'UpgradeScene' });
  }

  init(data) {
    this.mode = data.mode;
    this.arenaIndex = data.arenaIndex;
    this.score = data.score;
    this.upgradeManager = data.upgradeManager;
    this.stats = data.stats;
    this.persistHP = data.persistHP;
  }

  create() {
    const W = this.cameras.main.width;
    const H = this.cameras.main.height;

    // Background
    this.add.rectangle(W / 2, H / 2, W, H, 0x080812);

    // Decorative particles
    this._spawnParticles();

    // Title
    this.add.text(W / 2, 50, '⚔️  UPGRADE  ⚔️', {
      fontFamily: 'Courier New, monospace',
      fontSize: '32px',
      color: '#ffdd88',
      stroke: '#000000',
      strokeThickness: 4
    }).setOrigin(0.5);

    this.add.text(W / 2, 88, 'Choose your enhancement, knight', {
      fontFamily: 'Courier New, monospace',
      fontSize: '14px',
      color: '#888888',
      fontStyle: 'italic'
    }).setOrigin(0.5);

    // Score
    this.add.text(W / 2, 108, `Score: ${this.score}`, {
      fontFamily: 'Courier New, monospace',
      fontSize: '12px',
      color: '#ffcc44'
    }).setOrigin(0.5);

    // Get 3 upgrade options
    const choices = this.upgradeManager.getRandomChoices();

    // Build cards
    const cardW = 220;
    const cardH = 240;
    const spacing = 250;
    const startX = W / 2 - spacing;
    const cardY = H / 2;

    choices.forEach((upg, i) => {
      this._makeCard(startX + i * spacing, cardY, cardW, cardH, upg);
    });

    // Skip button
    const skipBg = this.add.rectangle(W / 2, H - 40, 160, 34, 0x111122)
      .setInteractive({ useHandCursor: true })
      .setStrokeStyle(1, 0x333355);
    const skipTxt = this.add.text(W / 2, H - 40, 'Skip', {
      fontFamily: 'Courier New, monospace',
      fontSize: '14px',
      color: '#666666'
    }).setOrigin(0.5);

    skipBg.on('pointerover', () => {
      skipBg.setFillStyle(0x222244);
      skipTxt.setStyle({ color: '#aaaaaa' });
    });
    skipBg.on('pointerout', () => {
      skipBg.setFillStyle(0x111122);
      skipTxt.setStyle({ color: '#666666' });
    });
    skipBg.on('pointerdown', () => this._proceed(null));

    this.cameras.main.fadeIn(400, 0, 0, 0);
  }

  _makeCard(x, y, w, h, upgrade) {
    const rarityColors = { common: 0x555577, uncommon: 0x226622, rare: 0x882200 };
    const rarityTextColors = { common: '#8888bb', uncommon: '#44cc44', rare: '#ff8844' };
    const color = rarityColors[upgrade.rarity] || 0x333355;

    const container = this.add.container(x, y);

    // Card shadow
    const shadow = this.add.rectangle(4, 4, w, h, 0x000000, 0.5);
    // Card background
    const bg = this.add.rectangle(0, 0, w, h, 0x0e0e22)
      .setInteractive({ useHandCursor: true });
    bg.setStrokeStyle(2, color);

    // Rarity bar at top
    const rarityBar = this.add.rectangle(0, -h / 2 + 4, w, 8, color).setOrigin(0.5, 0.5);

    // Icon
    const icon = this.add.text(0, -h / 2 + 45, upgrade.icon, {
      fontSize: '36px'
    }).setOrigin(0.5);

    // Name
    const name = this.add.text(0, -h / 2 + 85, upgrade.name, {
      fontFamily: 'Courier New, monospace',
      fontSize: '15px',
      color: '#ffffff',
      fontStyle: 'bold',
      wordWrap: { width: w - 20 },
      align: 'center'
    }).setOrigin(0.5);

    // Rarity label
    const rarityLabel = this.add.text(0, -h / 2 + 108, upgrade.rarity.toUpperCase(), {
      fontFamily: 'Courier New, monospace',
      fontSize: '10px',
      color: rarityTextColors[upgrade.rarity] || '#888888'
    }).setOrigin(0.5);

    // Divider
    const divider = this.add.rectangle(0, -h / 2 + 118, w - 30, 1, 0x333355);

    // Description
    const desc = this.add.text(0, -h / 2 + 150, upgrade.description, {
      fontFamily: 'Courier New, monospace',
      fontSize: '11px',
      color: '#aaaaaa',
      wordWrap: { width: w - 24 },
      align: 'center'
    }).setOrigin(0.5, 0);

    // Select button
    const btnBg = this.add.rectangle(0, h / 2 - 22, w - 20, 28, color, 0.3)
      .setStrokeStyle(1, color);
    const btnTxt = this.add.text(0, h / 2 - 22, 'SELECT', {
      fontFamily: 'Courier New, monospace',
      fontSize: '13px',
      color: '#dddddd',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    container.add([shadow, bg, rarityBar, icon, name, rarityLabel, divider, desc, btnBg, btnTxt]);

    // Hover
    bg.on('pointerover', () => {
      this.tweens.add({ targets: container, y: y - 6, duration: 100 });
      bg.setFillStyle(0x1a1a33);
      bg.setStrokeStyle(2.5, color + 0x333333);
      audioManager.playUIClick();
    });
    bg.on('pointerout', () => {
      this.tweens.add({ targets: container, y, duration: 100 });
      bg.setFillStyle(0x0e0e22);
    });
    bg.on('pointerdown', () => this._selectUpgrade(upgrade, container));

    // Entry animation
    const origY = y;
    container.setY(y + 200).setAlpha(0);
    this.tweens.add({
      targets: container,
      y: origY,
      alpha: 1,
      duration: 400,
      delay: this._cardIndex * 80,
      ease: 'Power2'
    });
    this._cardIndex = (this._cardIndex || 0) + 1;
  }

  _selectUpgrade(upgrade, container) {
    audioManager.playWordComplete(true);
    this.upgradeManager.applyUpgrade(upgrade);

    // Animate selection
    this.tweens.add({
      targets: container,
      scaleX: 1.15, scaleY: 1.15,
      duration: 100,
      yoyo: true,
      onComplete: () => this._proceed(upgrade)
    });
  }

  _proceed(upgrade) {
    this.cameras.main.fadeOut(400, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.start('GameScene', {
        mode: this.mode,
        arenaIndex: this.arenaIndex,
        score: this.score,
        upgradeManager: this.upgradeManager,
        stats: this.stats,
        persistHP: this.persistHP
      });
    });
  }

  _spawnParticles() {
    const { width: W, height: H } = this.cameras.main;
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    for (let i = 0; i < 30; i++) {
      const c = this.add.text(
        Phaser.Math.Between(0, W),
        Phaser.Math.Between(0, H),
        chars[Math.floor(Math.random() * chars.length)],
        { fontFamily: 'Courier New, monospace', fontSize: '16px', color: '#111133' }
      ).setAlpha(0.4);
      this.tweens.add({
        targets: c,
        y: c.y - 100,
        alpha: 0,
        duration: Phaser.Math.Between(4000, 9000),
        delay: Phaser.Math.Between(0, 3000),
        repeat: -1,
        onRepeat: () => { c.setY(H + 20); c.setAlpha(0.4); }
      });
    }
  }
}
