// BootScene — Loading screen, generates all placeholder assets

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  preload() {
    // Create loading bar
    const w = this.cameras.main.width;
    const h = this.cameras.main.height;

    const bg = this.add.rectangle(w / 2, h / 2, w, h, 0x0a0a1a);
    const title = this.add.text(w / 2, h / 2 - 60, '⚔️ TYPE KNIGHT', {
      fontFamily: 'Courier New, monospace',
      fontSize: '40px',
      color: '#ffffff',
      stroke: '#cc3333',
      strokeThickness: 4
    }).setOrigin(0.5);

    const barBg = this.add.rectangle(w / 2, h / 2 + 20, 300, 20, 0x333333);
    barBg.setStrokeStyle(1, 0x555555);
    const barFill = this.add.rectangle(w / 2 - 150, h / 2 + 20, 0, 18, 0xcc3333).setOrigin(0, 0.5);

    const loadingText = this.add.text(w / 2, h / 2 + 50, 'Forging your blade...', {
      fontFamily: 'Courier New, monospace',
      fontSize: '14px',
      color: '#888888'
    }).setOrigin(0.5);

    // Generate textures step-by-step so the bar reflects real work
    const steps = ['particle_white', 'particle_yellow', 'particle_orange', 'particle_blue'];
    let current = 0;
    const updateBar = () => {
      current++;
      const v = current / steps.length;
      barFill.setScale(v, 1);
      barFill.width = 300 * v;
      if (current >= steps.length) {
        loadingText.setText('Ready!');
      }
    };

    // Generate each texture and update progress
    this._generateTextures(updateBar);
  }

  create() {
    this.time.delayedCall(300, () => {
      this.scene.start('MainMenuScene');
    });
  }

  _generateTextures(onStep = null) {
    // Particle texture for effects
    const ptGfx = this.make.graphics({ x: 0, y: 0, add: false });
    ptGfx.fillStyle(0xffffff);
    ptGfx.fillCircle(4, 4, 4);
    ptGfx.generateTexture('particle_white', 8, 8);
    ptGfx.destroy();
    onStep?.();

    const ptYellow = this.make.graphics({ x: 0, y: 0, add: false });
    ptYellow.fillStyle(0xffff00);
    ptYellow.fillCircle(4, 4, 4);
    ptYellow.generateTexture('particle_yellow', 8, 8);
    ptYellow.destroy();
    onStep?.();

    const ptOrange = this.make.graphics({ x: 0, y: 0, add: false });
    ptOrange.fillStyle(0xff6600);
    ptOrange.fillCircle(3, 3, 3);
    ptOrange.generateTexture('particle_orange', 6, 6);
    ptOrange.destroy();
    onStep?.();

    const ptBlue = this.make.graphics({ x: 0, y: 0, add: false });
    ptBlue.fillStyle(0x66ccff);
    ptBlue.fillCircle(3, 3, 3);
    ptBlue.generateTexture('particle_blue', 6, 6);
    ptBlue.destroy();
    onStep?.();
  }
}
