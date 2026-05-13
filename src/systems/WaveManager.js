// WaveManager — Controls wave spawning, progression, and enemy management

import { ENDLESS_CONFIG } from '../data/waves.js';

export class WaveManager {
  constructor(scene, arenaConfig) {
    this.scene = scene;
    this.arena = arenaConfig;
    this.waves = arenaConfig.waves;
    this.currentWave = 0;
    this.activeEnemies = [];
    this.waveInProgress = false;
    this.allWavesDone = false;

    // Endless mode state
    this.isEndless = false;
    this.endlessWaveNum = 0;
  }

  enableEndless() {
    this.isEndless = true;
    this.waves = this._generateEndlessWaves(10); // generate first batch
  }

  _generateEndlessWaves(count) {
    const waves = [];
    for (let i = 0; i < count; i++) {
      const waveNum = this.endlessWaveNum + i;
      // Start with 1 enemy, increase by 1 every 4 waves, max 5
      const enemyCount = Math.min(
        ENDLESS_CONFIG.baseEnemyCount + Math.floor(waveNum / ENDLESS_CONFIG.enemyIncreaseEvery),
        ENDLESS_CONFIG.maxEnemiesPerWave
      );
      const enemies = [];
      const types = ENDLESS_CONFIG.enemyTypes;
      for (let j = 0; j < enemyCount; j++) {
        // Gradually introduce harder enemy types
        const maxTypeIdx = Math.min(Math.floor(waveNum / 3) + 2, types.length);
        const typeIdx = Math.floor(Math.random() * maxTypeIdx);
        enemies.push({ type: types[typeIdx], level: waveNum });
      }
      // Delay scales down slightly as waves progress (min 800)
      const delay = Math.max(1000 - waveNum * 10, 800);
      waves.push({ enemies, delay });
    }
    return waves;
  }

  // Start next wave
  startNextWave() {
    if (this.currentWave >= this.waves.length) {
      if (this.isEndless) {
        this.endlessWaveNum += this.waves.length;
        this.waves = this._generateEndlessWaves(10);
        this.currentWave = 0;
      } else {
        this.allWavesDone = true;
        this.scene.events.emit('ALL_WAVES_DONE');
        return;
      }
    }

    const waveDef = this.waves[this.currentWave];
    this.currentWave++;
    this.waveInProgress = true;

    this.scene.events.emit('WAVE_START', {
      waveNum: this.currentWave,
      total: this.waves.length,
      waveDef
    });

    // Stagger enemy spawns with consistent pacing
    // Base delay between spawns: at least 800ms, scales with wave delay config
    const baseDelay = Math.max(waveDef.delay || 800, 800);
    const enemyCount = waveDef.enemies.length;

    waveDef.enemies.forEach((enemyDef, i) => {
      // First enemy spawns after a short intro pause
      // Subsequent enemies spawn with consistent spacing
      const spawnTime = 400 + (baseDelay * i);
      this.scene.time.delayedCall(spawnTime, () => {
        if (!this.scene || !this.scene.player?.alive) return;
        this.scene.events.emit('SPAWN_ENEMY', { ...enemyDef, waveLevel: this.endlessWaveNum + this.currentWave });
      });
    });
  }

  registerEnemy(enemy) {
    this.activeEnemies.push(enemy);
  }

  unregisterEnemy(enemy) {
    this.activeEnemies = this.activeEnemies.filter(e => e !== enemy);
    this._checkWaveClear();
  }

  _checkWaveClear() {
    if (this.waveInProgress && this.activeEnemies.length === 0) {
      this.waveInProgress = false;
      this.scene.events.emit('WAVE_CLEAR', { waveNum: this.currentWave });

      // Delay before next wave
      this.scene.time.delayedCall(1500, () => {
        if (this.currentWave < this.waves.length || this.isEndless) {
          this.startNextWave();
        } else {
          this.allWavesDone = true;
          this.scene.events.emit('ALL_WAVES_DONE');
        }
      });
    }
  }

  getProgress() {
    return {
      currentWave: this.currentWave,
      totalWaves: this.waves.length,
      activeEnemies: this.activeEnemies.length
    };
  }

  destroy() {
    this.activeEnemies = [];
  }
}
