// FloatingText — Damage numbers, status text floating up and fading

export class FloatingText {
  constructor(scene, x, y, text, color = '#ffffff', fontSize = '16px') {
    this.scene = scene;
    this.txt = scene.add.text(x, y, text, {
      fontFamily: 'Courier New, monospace',
      fontSize,
      color,
      stroke: '#000000',
      strokeThickness: 3,
      fontStyle: 'bold'
    }).setOrigin(0.5, 0.5).setDepth(100);

    scene.tweens.add({
      targets: this.txt,
      y: y - 60,
      alpha: 0,
      scaleX: 1.4,
      scaleY: 1.4,
      duration: 900,
      ease: 'Power2',
      onComplete: () => this.txt.destroy()
    });
  }

  static spawn(scene, x, y, text, color, fontSize) {
    return new FloatingText(scene, x, y, text, color, fontSize);
  }
}
