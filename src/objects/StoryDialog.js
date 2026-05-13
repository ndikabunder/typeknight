// StoryDialog — Displays story narration with typewriter effect

export class StoryDialog {
  constructor(scene) {
    this.scene = scene;
    this.container = null;
    this.textObj = null;
    this.titleObj = null;
    this.isActive = false;
    this.onComplete = null;
    this.typewriterEvent = null;
    this.currentIndex = 0;
    this.lines = [];
  }

  // Show dialog with multiple lines of text
  show(config) {
    const { title, lines, onComplete, color = '#ffffff' } = config;
    
    if (this.isActive) this.hide();
    this.isActive = true;
    this.onComplete = onComplete;
    this.lines = lines;
    this.currentIndex = 0;

    const W = this.scene.cameras.main.width;
    const H = this.scene.cameras.main.height;

    // Create container
    this.container = this.scene.add.container(W / 2, H / 2).setDepth(200);

    // Dark overlay
    const overlay = this.scene.add.rectangle(0, 0, W, H, 0x000000, 0.85);
    
    // Dialog box
    const boxW = Math.min(700, W - 40);
    const boxH = lines.length > 3 ? 200 : 160;
    const box = this.scene.add.rectangle(0, 0, boxW, boxH, 0x111122, 0.95);
    box.setStrokeStyle(2, 0x444466);

    // Title (if provided)
    let textY = 0;
    if (title) {
      const titleObj = this.scene.add.text(0, -boxH / 2 + 25, title, {
        fontFamily: 'Courier New, monospace',
        fontSize: '16px',
        color: '#ffcc00',
        fontStyle: 'bold'
      }).setOrigin(0.5);
      this.container.add(titleObj);
      textY = 10;
    }

    // Main text
    this.textObj = this.scene.add.text(0, textY, '', {
      fontFamily: 'Courier New, monospace',
      fontSize: '14px',
      color: color,
      align: 'center',
      wordWrap: { width: boxW - 40 }
    }).setOrigin(0.5);

    // Continue hint
    const hint = this.scene.add.text(0, boxH / 2 - 20, '[ SPACE untuk lanjut ]', {
      fontFamily: 'Courier New, monospace',
      fontSize: '11px',
      color: '#666677'
    }).setOrigin(0.5);

    this.container.add([overlay, box, this.textObj, hint]);

    // Fade in
    this.container.setAlpha(0);
    this.scene.tweens.add({
      targets: this.container,
      alpha: 1,
      duration: 300,
      onComplete: () => {
        this._showNextLine();
      }
    });

    // Input handler
    this._setupInput();
  }

  _setupInput() {
    this._spaceHandler = () => {
      if (!this.isActive) return;
      
      if (this.typewriterEvent) {
        // Skip typewriter, show full line
        this.typewriterEvent.destroy();
        this.typewriterEvent = null;
        this.textObj.setText(this.lines[this.currentIndex - 1]);
      } else {
        this._showNextLine();
      }
    };

    this.scene.input.keyboard.on('keydown-SPACE', this._spaceHandler);
    this.scene.input.keyboard.on('keydown-ENTER', this._spaceHandler);
    
    // Click to continue
    this.scene.input.on('pointerdown', this._spaceHandler);
  }

  _showNextLine() {
    if (this.currentIndex >= this.lines.length) {
      this._complete();
      return;
    }

    const line = this.lines[this.currentIndex];
    this.currentIndex++;

    // Typewriter effect
    this.textObj.setText('');
    let charIndex = 0;
    this.typewriterEvent = this.scene.time.addEvent({
      delay: 30,
      callback: () => {
        if (charIndex < line.length) {
          this.textObj.setText(line.substring(0, charIndex + 1));
          charIndex++;
        } else {
          this.typewriterEvent.destroy();
          this.typewriterEvent = null;
        }
      },
      repeat: line.length - 1
    });
  }

  _complete() {
    // Remove input handlers first
    if (this._spaceHandler) {
      this.scene.input.keyboard.off('keydown-SPACE', this._spaceHandler);
      this.scene.input.keyboard.off('keydown-ENTER', this._spaceHandler);
      this.scene.input.off('pointerdown', this._spaceHandler);
    }

    // Destroy container immediately (no fade out animation to avoid blocking)
    if (this.container) {
      this.container.destroy();
      this.container = null;
    }
    this.isActive = false;

    // Call completion callback
    if (this.onComplete) {
      this.onComplete();
    }
  }

  hide() {
    if (!this.container) return;

    // Remove input handlers
    if (this._spaceHandler) {
      this.scene.input.keyboard.off('keydown-SPACE', this._spaceHandler);
      this.scene.input.keyboard.off('keydown-ENTER', this._spaceHandler);
      this.scene.input.off('pointerdown', this._spaceHandler);
    }

    if (this.typewriterEvent) {
      this.typewriterEvent.destroy();
      this.typewriterEvent = null;
    }

    // Destroy immediately instead of fading
    this.container.destroy();
    this.container = null;
    this.isActive = false;
  }

  destroy() {
    this.hide();
  }
}
