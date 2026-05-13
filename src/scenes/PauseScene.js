// PauseScene — Overlay pause menu

import { audioManager } from '../systems/AudioManager.js';

export class PauseScene extends Phaser.Scene {
  constructor() {
    super({ key: 'PauseScene' });
  }

  init(data) {
    this.parentScene = data.parentScene || 'GameScene';
  }

  create() {
    const W = this.cameras.main.width;
    const H = this.cameras.main.height;

    // Dim overlay
    this.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0.65);

    // Panel
    const panel = this.add.rectangle(W / 2, H / 2, 340, 280, 0x0d0d22)
      .setStrokeStyle(2, 0x4444aa);

    this.add.text(W / 2, H / 2 - 100, '⏸  PAUSED', {
      fontFamily: 'Courier New, monospace',
      fontSize: '30px',
      color: '#ffffff'
    }).setOrigin(0.5);

    // Volume slider stub
    this.add.text(W / 2, H / 2 - 50, 'SFX Volume', {
      fontFamily: 'Courier New, monospace',
      fontSize: '12px',
      color: '#888888'
    }).setOrigin(0.5);

    // Simple +/- buttons for volume
    this._makeVolumeControl(W / 2, H / 2 - 25);

    const btns = [
      { label: '▶  RESUME',   action: () => this._resume() },
      { label: '🏠  QUIT',     action: () => this._quit() },
    ];

    btns.forEach((btn, i) => {
      const bx = W / 2;
      const by = H / 2 + 30 + i * 52;
      const bg = this.add.rectangle(bx, by, 220, 40, 0x111122)
        .setInteractive({ useHandCursor: true })
        .setStrokeStyle(1, 0x4444aa);
      const txt = this.add.text(bx, by, btn.label, {
        fontFamily: 'Courier New, monospace',
        fontSize: '16px',
        color: '#cccccc'
      }).setOrigin(0.5);

      bg.on('pointerover', () => { bg.setFillStyle(0x222244); txt.setStyle({ color: '#ffffff' }); audioManager.playUIClick(); });
      bg.on('pointerout', () => { bg.setFillStyle(0x111122); txt.setStyle({ color: '#cccccc' }); });
      bg.on('pointerdown', btn.action);
    });

    // ESC to resume
    this.input.keyboard.once('keydown-ESC', () => this._resume());
  }

  _makeVolumeControl(x, y) {
    const minusBtn = this.add.text(x - 60, y, '[-]', {
      fontFamily: 'Courier New, monospace', fontSize: '14px', color: '#aaaaaa'
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    this.volTxt = this.add.text(x, y, `${Math.round(audioManager.sfxVolume * 100)}%`, {
      fontFamily: 'Courier New, monospace', fontSize: '14px', color: '#ffffff'
    }).setOrigin(0.5);

    const plusBtn = this.add.text(x + 60, y, '[+]', {
      fontFamily: 'Courier New, monospace', fontSize: '14px', color: '#aaaaaa'
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    minusBtn.on('pointerdown', () => {
      audioManager.setSFXVolume(Math.max(0, audioManager.sfxVolume - 0.1));
      this.volTxt.setText(`${Math.round(audioManager.sfxVolume * 100)}%`);
      audioManager.playUIClick();
    });
    plusBtn.on('pointerdown', () => {
      audioManager.setSFXVolume(Math.min(1, audioManager.sfxVolume + 0.1));
      this.volTxt.setText(`${Math.round(audioManager.sfxVolume * 100)}%`);
      audioManager.playUIClick();
    });

    // Mute toggle
    const muteBg = this.add.rectangle(x + 120, y, 60, 24, 0x111122)
      .setInteractive({ useHandCursor: true })
      .setStrokeStyle(1, 0x333355);
    const muteTxt = this.add.text(x + 120, y, 'MUTE', {
      fontFamily: 'Courier New, monospace', fontSize: '11px', color: '#888888'
    }).setOrigin(0.5);
    muteBg.on('pointerdown', () => {
      audioManager.setMuted(!audioManager.muted);
      muteTxt.setStyle({ color: audioManager.muted ? '#ff4444' : '#888888' });
      muteTxt.setText(audioManager.muted ? 'MUTED' : 'MUTE');
    });
  }

  _resume() {
    this.scene.resume(this.parentScene);
    this.scene.stop();
  }

  _quit() {
    this.scene.stop(this.parentScene);
    this.scene.stop();
    this.scene.start('MainMenuScene');
  }
}
