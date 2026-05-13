// Type Knight — Main Entry Point
// Phaser 3 game initialization

import Phaser from 'phaser';

import { BootScene }        from './scenes/BootScene.js';
import { MainMenuScene }    from './scenes/MainMenuScene.js';
import { GameScene }        from './scenes/GameScene.js';
import { UpgradeScene }     from './scenes/UpgradeScene.js';
import { GameOverScene }    from './scenes/GameOverScene.js';
import { PauseScene }       from './scenes/PauseScene.js';
import { LeaderboardScene } from './scenes/LeaderboardScene.js';
import { PracticeScene }    from './scenes/PracticeScene.js';
import { ChallengeScene }   from './scenes/ChallengeScene.js';

const config = {
  type: Phaser.AUTO,
  width: 900,
  height: 520,
  backgroundColor: '#0a0a1a',
  parent: 'game-container',
  scene: [
    BootScene,
    MainMenuScene,
    GameScene,
    UpgradeScene,
    GameOverScene,
    PauseScene,
    LeaderboardScene,
    PracticeScene,
    ChallengeScene
  ],
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH
  },
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { y: 0 },
      debug: false
    }
  },
  render: {
    pixelArt: false,
    antialias: true
  }
};

// Unlock AudioContext on first user interaction
document.addEventListener('click', () => {
  // AudioManager handles this internally
}, { once: true });

window.game = new Phaser.Game(config);
