// WordLabel — Floating word display above enemies
// Shows typing progress with character highlighting

export class WordLabel {
  constructor(scene, x, y, word) {
    this.scene = scene;
    this.word = word;
    this.progress = 0;    // how many chars typed correctly
    this.hasError = false;

    // Container for character sprites
    this.container = scene.add.container(x, y);
    this.charTexts = [];
    this.bgRect = null;

    this._build();
  }

  _build() {
    // Background pill
    const w = this.word.length * 13 + 16;
    this.bgRect = this.scene.add.rectangle(0, 0, w, 24, 0x000000, 0.75)
      .setOrigin(0.5, 0.5);
    this.bgRect.setStrokeStyle(1, 0x555555);
    this.container.add(this.bgRect);

    // Individual character texts
    this.charTexts = [];
    const startX = -(this.word.length * 13) / 2 + 6;

    for (let i = 0; i < this.word.length; i++) {
      const txt = this.scene.add.text(startX + i * 13, 0, this.word[i], {
        fontFamily: 'Courier New, monospace',
        fontSize: '14px',
        color: '#aaaaaa',
        align: 'center'
      }).setOrigin(0.5, 0.5);
      this.charTexts.push(txt);
      this.container.add(txt);
    }
  }

  // Update typed progress (0..word.length)
  setProgress(typed) {
    this.progress = typed.length;
    this.hasError = false;

    for (let i = 0; i < this.charTexts.length; i++) {
      if (i < this.progress) {
        this.charTexts[i].setStyle({ color: '#00ff88' }); // typed — green
      } else if (i === this.progress) {
        this.charTexts[i].setStyle({ color: '#ffffff' }); // next — white/bright
      } else {
        this.charTexts[i].setStyle({ color: '#777777' }); // untyped — dim
      }
    }

    // Show border locked indicator
    if (this.progress > 0) {
      this.bgRect.setStrokeStyle(1.5, 0x00ff88);
    } else {
      this.bgRect.setStrokeStyle(1, 0x555555);
    }
  }

  // Flash red on wrong keypress
  showError() {
    this.hasError = true;
    const nextIdx = this.progress;
    if (this.charTexts[nextIdx]) {
      this.charTexts[nextIdx].setStyle({ color: '#ff4444' });
    }
    // Shake tween
    this.scene.tweens.add({
      targets: this.container,
      x: this.container.x + 4,
      duration: 40,
      yoyo: true,
      repeat: 2,
      onComplete: () => {
        this.hasError = false;
        // Re-apply colors based on current progress to fix any corruption
        for (let i = 0; i < this.charTexts.length; i++) {
          if (i < this.progress) {
            this.charTexts[i].setStyle({ color: '#00ff88' });
          } else if (i === this.progress) {
            this.charTexts[i].setStyle({ color: '#ffffff' });
          } else {
            this.charTexts[i].setStyle({ color: '#777777' });
          }
        }
      }
    });
  }

  // Explode animation on word complete
  explode(onDone) {
    this.scene.tweens.add({
      targets: this.container,
      scaleX: 1.5,
      scaleY: 1.5,
      alpha: 0,
      duration: 250,
      ease: 'Power2',
      onComplete: () => {
        this.destroy();
        if (onDone) onDone();
      }
    });
    // Flash all chars yellow
    this.charTexts.forEach(t => t.setStyle({ color: '#ffff00' }));
  }

  // Set word and rebuild (for wizard refresh)
  setWord(word) {
    this.word = word;
    this.container.removeAll(true);
    this.charTexts = [];
    this._build();
    this.progress = 0;
  }

  // Update visible text of each character without rebuilding (for hidden words)
  updateCharTexts(newWord) {
    for (let i = 0; i < this.charTexts.length; i++) {
      if (this.charTexts[i]) {
        this.charTexts[i].setText(newWord[i] || '');
      }
    }
  }

  setPosition(x, y) {
    this.container.setPosition(x, y);
  }

  setDepth(d) {
    this.container.setDepth(d);
  }

  destroy() {
    this.container.destroy(true);
  }
}
