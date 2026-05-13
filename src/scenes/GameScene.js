// GameScene — Main gameplay scene

import { TypingEngine } from '../systems/TypingEngine.js';
import { ComboSystem } from '../systems/ComboSystem.js';
import { WaveManager } from '../systems/WaveManager.js';
import { UpgradeManager } from '../systems/UpgradeManager.js';
import { audioManager } from '../systems/AudioManager.js';
import { storyManager } from '../systems/StoryManager.js';
import { StoryDialog } from '../objects/StoryDialog.js';
import { Player } from '../objects/Player.js';
import { WordLabel } from '../objects/WordLabel.js';
import { FloatingText } from '../objects/FloatingText.js';
import { GoblinEnemy } from '../objects/enemies/GoblinEnemy.js';
import { OrcEnemy } from '../objects/enemies/OrcEnemy.js';
import { WizardEnemy } from '../objects/enemies/WizardEnemy.js';
import { ShadowEnemy } from '../objects/enemies/ShadowEnemy.js';
import { ShieldEnemy } from '../objects/enemies/ShieldEnemy.js';
import { BossGolem } from '../objects/enemies/BossGolem.js';
import { BossDragon } from '../objects/enemies/BossDragon.js';
import { BossLich } from '../objects/enemies/BossLich.js';
import { BossHydra } from '../objects/enemies/BossHydra.js';
import { BossVoidKnight } from '../objects/enemies/BossVoidKnight.js';
import { BossElemental } from '../objects/enemies/BossElemental.js';
import { SwarmEnemy } from '../objects/enemies/SwarmEnemy.js';
import { ArcherEnemy } from '../objects/enemies/ArcherEnemy.js';
import { HealerEnemy } from '../objects/enemies/HealerEnemy.js';
import { BomberEnemy } from '../objects/enemies/BomberEnemy.js';
import { GhostEnemy } from '../objects/enemies/GhostEnemy.js';
import { IceElemental } from '../objects/enemies/IceElemental.js';
import { FireElemental } from '../objects/enemies/FireElemental.js';
import { NecromancerEnemy } from '../objects/enemies/NecromancerEnemy.js';
import { VoidCreature } from '../objects/enemies/VoidCreature.js';
import { SkeletonEnemy } from '../objects/enemies/SkeletonEnemy.js';
import { ARENAS, THEMED_WORDS } from '../data/waves.js';
import { SPECIAL_WORDS } from '../data/words.js';

// Enemy factory
const ENEMY_MAP = {
  goblin: GoblinEnemy,
  orc: OrcEnemy,
  wizard: WizardEnemy,
  shadow: ShadowEnemy,
  shield: ShieldEnemy,
  boss_golem: BossGolem,
  boss_dragon: BossDragon,
  boss_lich: BossLich,
  boss_hydra: BossHydra,
  boss_void_knight: BossVoidKnight,
  boss_elemental: BossElemental,
  swarm: SwarmEnemy,
  archer: ArcherEnemy,
  healer: HealerEnemy,
  bomber: BomberEnemy,
  ghost: GhostEnemy,
  ice_elemental: IceElemental,
  fire_elemental: FireElemental,
  necromancer: NecromancerEnemy,
  void_creature: VoidCreature,
  skeleton: SkeletonEnemy
};

export class GameScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameScene' });
  }

  init(data) {
    this.mode = data.mode || 'story';
    this.arenaIndex = data.arenaIndex || 0;
    this.score = data.score || 0;
    this.upgradeManager = data.upgradeManager || new UpgradeManager();
    this.persistHP = data.persistHP;

    // Session stats
    this.stats = data.stats || {
      wordsTyped: 0,
      totalChars: 0,
      correctChars: 0,
      comboPeak: 0,
      killCount: 0,
      perfectWords: 0
    };

    // Challenge mode
    this.challengeId = data.challengeId || null;
    this.challengeCondition = data.challengeCondition || null;
    this.challengeFailed = false;
  }

  create() {
    const W = this.cameras.main.width;
    const H = this.cameras.main.height;

    this.W = W;
    this.H = H;

    // Pick arena
    this.arenaConfig = this._getArena();
    this.themeWords = THEMED_WORDS[this.arenaConfig.theme] || [];

    // Build arena visuals
    this._buildArena();

    // Systems
    this.typingEngine = new TypingEngine(this);
    this.comboSystem = new ComboSystem(this);
    this.comboSystem.setCap(this.upgradeManager.bonuses.comboCap || 25);
    this.waveManager = new WaveManager(this, this.arenaConfig);
    if (this.mode === 'endless') this.waveManager.enableEndless();

    // Player
    this.player = new Player(this, 120, H - 100);
    const hp = this.persistHP !== undefined ? this.persistHP :
               5 + (this.upgradeManager.bonuses.tempHPBonus || 0); // Start with 5 HP for easier gameplay
    this.player.setMaxHP(hp);

    // Enemies list
    this.enemies = [];

    // Defend state
    this.pendingAttacks = []; // Array of pending attacks (supports multi-attack)
    this.defenseWindow = false;
    this.defenseTimer = null;
    this.attackQueue = []; // Queue for attacks during defense window

    // Special challenge state
    this.specialChallenge = null;

    // Last word for echo strike
    this.lastWord = '';

    // Spellweave counter
    this.spellweaveCount = 0;

    // Story dialog (for story mode)
    this.storyDialog = new StoryDialog(this);
    this.storyChapter = storyManager.getChapterByArenaId(this.arenaConfig.id);
    this.storyMidShown = false;

    // Game paused state (for story dialogs)
    this.gamePaused = false;

    // Apply challenge conditions
    this._applyChallengeCondition();

    // Score display
    this._buildHUD();

    // Event listeners
    this._setupEvents();

    // Apply arena gimmick
    this._applyGimmick();

    // Start game with story or direct wave
    this._startGameWithStory();

    // Fade in
    this.cameras.main.fadeIn(500, 0, 0, 0);
  }

  // ─── Story Integration ─────────────────────────────────────────────────────

  _startGameWithStory() {
    // Only show story in story mode
    if (this.mode !== 'story') {
      this._startWaveAfterStory();
      return;
    }

    // Pause game during story
    this.gamePaused = true;

    // Prologue at first arena
    if (this.arenaIndex === 0 && !storyManager.hasSeenPrologue) {
      storyManager.hasSeenPrologue = true;
      const prologue = storyManager.getPrologue();
      this.storyDialog.show({
        title: prologue.title,
        lines: prologue.narration,
        onComplete: () => this._showChapterIntro()
      });
      return;
    }

    // Show chapter intro
    this._showChapterIntro();
  }

  _showChapterIntro() {
    if (!this.storyChapter && this.mode === 'story') {
      this._startWaveAfterStory();
      return;
    }

    if (this.storyChapter) {
      this.gamePaused = true;
      this.storyDialog.show({
        title: `${this.storyChapter.title}`,
        lines: this.storyChapter.intro,
        onComplete: () => this._startWaveAfterStory()
      });
    } else {
      this._startWaveAfterStory();
    }
  }

  _showChapterMid() {
    if (!this.storyChapter || this.storyMidShown) return;
    if (!this.storyChapter.mid || this.storyChapter.mid.length === 0) return;

    this.storyMidShown = true;
    // Pause gameplay temporarily
    this.gamePaused = true;
    this.typingEngine.disable();

    this.storyDialog.show({
      title: null,
      lines: this.storyChapter.mid,
      onComplete: () => {
        this.gamePaused = false;
        this.typingEngine.enable();
      }
    });
  }

  _showChapterOutro(callback) {
    if (!this.storyChapter) {
      if (callback) callback();
      return;
    }

    if (this.storyChapter.outro && this.storyChapter.outro.length > 0) {
      this.gamePaused = true;
      this.storyDialog.show({
        title: null,
        lines: this.storyChapter.outro,
        onComplete: () => {
          this.gamePaused = false;
          if (callback) callback();
        }
      });
    } else {
      if (callback) callback();
    }
  }

  _showEpilogue(callback) {
    this.gamePaused = true;
    const epilogue = storyManager.getEpilogue();
    this.storyDialog.show({
      title: epilogue.title,
      lines: epilogue.narration,
      onComplete: () => {
        this.gamePaused = false;
        if (callback) callback();
      }
    });
  }

  _startWaveAfterStory() {
    // ESC = pause (set up once)
    this.input.keyboard.once('keydown-ESC', () => this._pause());

    // Unpause game
    this.gamePaused = false;

    // Start appropriate BGM
    if (this.arenaConfig.gimmick === 'boss') {
      audioManager.startBGM('boss');
    } else {
      audioManager.startBGM('gameplay');
    }

    // Start wave after short delay
    const startWave = () => {
      if (this.arenaConfig.gimmick === 'boss') {
        this._doBossIntro();
      } else {
        this._showWaveAnnouncement('GET READY!', () => {
          this.typingEngine.enable();
          this.waveManager.startNextWave();
        });
      }
    };

    // Small delay to ensure clean transition
    this.time.delayedCall(300, startWave);
  }

  // ─── Arena Building ────────────────────────────────────────────────────────

  _getArena() {
    if (this.mode === 'endless') {
      return {
        id: 'endless',
        name: 'Endless Arena',
        theme: 'castle',
        bgColor: 0x0a0a1a,
        floorColor: 0x1a1a3a,
        accentColor: 0x4444aa,
        gimmick: null,
        waves: []
      };
    }
    return ARENAS[this.arenaIndex % ARENAS.length];
  }

  _buildArena() {
    const { W, H } = this;
    const cfg = this.arenaConfig;
    const theme = cfg.theme || 'castle';

    // Sky background
    this.add.rectangle(W / 2, H / 2, W, H, cfg.bgColor);

    const gfx = this.add.graphics();

    // Theme-specific background scenery
    switch (theme) {
      case 'castle': this._drawCastleTheme(gfx, W, H, cfg); break;
      case 'forest': this._drawForestTheme(gfx, W, H, cfg); break;
      case 'darkMagic': this._drawDarkMagicTheme(gfx, W, H, cfg); break;
      case 'frozen': this._drawFrozenTheme(gfx, W, H, cfg); break;
      case 'volcanic': this._drawVolcanicTheme(gfx, W, H, cfg); break;
      case 'void': this._drawVoidTheme(gfx, W, H, cfg); break;
      default: this._drawCastleTheme(gfx, W, H, cfg); break;
    }

    // Ground platform (universal)
    this.add.rectangle(W / 2, H - 45, W, 90, cfg.floorColor).setDepth(1);
    this.add.rectangle(W / 2, H - 80, W, 4, cfg.accentColor).setAlpha(0.8).setDepth(2);

    // Gimmick visual effects
    if (cfg.gimmick === 'hidden_enemies') this._buildFogEffect();

    // Animated environment particles
    this._spawnEnvParticles(theme, W, H, cfg);
  }

  // ─── Theme Renderers ────────────────────────────────────────────────────────

  _drawCastleTheme(gfx, W, H, cfg) {
    // Stars
    gfx.fillStyle(0xffffff, 0.6);
    for (let i = 0; i < 50; i++) {
      gfx.fillCircle(Phaser.Math.Between(0, W), Phaser.Math.Between(0, H * 0.5), Math.random() * 1.2 + 0.3);
    }
    // Moon
    this.add.circle(W - 80, 55, 22, 0xffeedd).setAlpha(0.6);
    this.add.circle(W - 73, 50, 20, cfg.bgColor);
    // Castle walls with towers
    gfx.fillStyle(cfg.accentColor, 0.15);
    gfx.fillRect(0, H * 0.35, 70, H * 0.65);
    gfx.fillRect(W - 70, H * 0.35, 70, H * 0.65);
    // Tower tops
    gfx.fillRect(-5, H * 0.25, 80, 30);
    gfx.fillRect(W - 75, H * 0.25, 80, 30);
    // Battlements
    for (let bx = 0; bx < 80; bx += 18) {
      gfx.fillRect(bx, H * 0.25 - 18, 10, 20);
      gfx.fillRect(W - 75 + bx, H * 0.25 - 18, 10, 20);
    }
    // Central gate arch
    gfx.fillStyle(cfg.accentColor, 0.06);
    gfx.fillRect(W / 2 - 50, H * 0.2, 100, H * 0.6);
    gfx.fillStyle(cfg.bgColor, 0.5);
    gfx.fillRect(W / 2 - 30, H * 0.3, 60, H * 0.5);
    // Window lights
    gfx.fillStyle(0xffcc44, 0.15);
    gfx.fillRect(20, H * 0.45, 12, 16);
    gfx.fillRect(40, H * 0.55, 12, 16);
    gfx.fillRect(W - 55, H * 0.45, 12, 16);
    gfx.fillRect(W - 35, H * 0.55, 12, 16);
    // Torches (animated glow)
    [100, W - 100].forEach(tx => {
      const torch = this.add.circle(tx, H * 0.6, 8, 0xff8800, 0.3);
      this.tweens.add({ targets: torch, alpha: 0.1, scaleX: 1.3, scaleY: 1.3, duration: 800, yoyo: true, repeat: -1 });
    });
  }

  _drawForestTheme(gfx, W, H, cfg) {
    // Sky gradient with stars
    gfx.fillStyle(0xffffff, 0.3);
    for (let i = 0; i < 25; i++) {
      gfx.fillCircle(Phaser.Math.Between(0, W), Phaser.Math.Between(0, H * 0.3), Math.random() * 1 + 0.2);
    }
    // Canopy (top foliage layer)
    gfx.fillStyle(0x1a4a1a, 0.4);
    for (let x = 0; x < W; x += 40) {
      const h = Phaser.Math.Between(30, 70);
      gfx.fillCircle(x + 20, h, Phaser.Math.Between(25, 45));
    }
    // Trees (background layer)
    const treePositions = [30, 90, W - 90, W - 30, W / 2 - 120, W / 2 + 120];
    treePositions.forEach(tx => {
      const treeH = Phaser.Math.Between(120, 200);
      gfx.fillStyle(0x3a2a1a, 0.3);
      gfx.fillRect(tx - 6, H - 90 - treeH, 12, treeH);
      gfx.fillStyle(0x2a5a2a, 0.25);
      gfx.fillCircle(tx, H - 90 - treeH + 20, 35);
      gfx.fillCircle(tx - 15, H - 90 - treeH + 40, 28);
      gfx.fillCircle(tx + 15, H - 90 - treeH + 40, 28);
    });
    // Grass tufts on ground
    gfx.fillStyle(0x44aa44, 0.2);
    for (let x = 0; x < W; x += 25) {
      gfx.fillTriangle(x, H - 80, x + 5, H - 95, x + 10, H - 80);
    }
    // Fireflies
    for (let i = 0; i < 8; i++) {
      const ff = this.add.circle(Phaser.Math.Between(50, W - 50), Phaser.Math.Between(100, H - 120), 2, 0xccff44, 0.5);
      this.tweens.add({ targets: ff, alpha: 0, y: ff.y - 30, duration: Phaser.Math.Between(2000, 4000), yoyo: true, repeat: -1, delay: i * 400 });
    }
  }

  _drawDarkMagicTheme(gfx, W, H, cfg) {
    // Dim purple/dark atmosphere — no stars
    // Floating rune circles
    const runeColors = [0x6a4a8a, 0x8844aa, 0x553388];
    for (let i = 0; i < 5; i++) {
      const rx = Phaser.Math.Between(60, W - 60);
      const ry = Phaser.Math.Between(60, H * 0.5);
      const rr = Phaser.Math.Between(15, 30);
      gfx.lineStyle(1, runeColors[i % 3], 0.15);
      gfx.strokeCircle(rx, ry, rr);
      gfx.strokeCircle(rx, ry, rr * 0.6);
    }
    // Pillars
    gfx.fillStyle(cfg.accentColor, 0.2);
    [40, W - 40, W / 3, W * 2 / 3].forEach(px => {
      gfx.fillRect(px - 10, H * 0.3, 20, H * 0.5);
      gfx.fillRect(px - 14, H * 0.28, 28, 10);
      gfx.fillRect(px - 14, H * 0.78, 28, 10);
    });
    // Glowing portal in center bg
    const portal = this.add.circle(W / 2, H * 0.4, 40, 0x6600aa, 0.08);
    portal.setStrokeStyle(2, 0x8844cc, 0.15);
    this.tweens.add({ targets: portal, scaleX: 1.2, scaleY: 1.2, alpha: 0.03, duration: 2500, yoyo: true, repeat: -1 });
    // Floating magic particles
    for (let i = 0; i < 6; i++) {
      const mp = this.add.circle(Phaser.Math.Between(50, W - 50), Phaser.Math.Between(80, H - 120), 2, 0xaa44ff, 0.3);
      this.tweens.add({ targets: mp, y: mp.y - 50, alpha: 0, duration: 3000, yoyo: true, repeat: -1, delay: i * 500 });
    }
  }

  _drawFrozenTheme(gfx, W, H, cfg) {
    // Pale stars
    gfx.fillStyle(0xccddff, 0.4);
    for (let i = 0; i < 40; i++) {
      gfx.fillCircle(Phaser.Math.Between(0, W), Phaser.Math.Between(0, H * 0.5), Math.random() * 1 + 0.3);
    }
    // Ice mountains silhouette
    gfx.fillStyle(cfg.accentColor, 0.12);
    gfx.fillTriangle(0, H * 0.6, 100, H * 0.15, 200, H * 0.6);
    gfx.fillTriangle(150, H * 0.6, 280, H * 0.2, 400, H * 0.6);
    gfx.fillTriangle(W - 200, H * 0.6, W - 80, H * 0.1, W, H * 0.6);
    // Snow caps (brighter)
    gfx.fillStyle(0xddeeff, 0.08);
    gfx.fillTriangle(70, H * 0.25, 100, H * 0.15, 130, H * 0.25);
    gfx.fillTriangle(250, H * 0.3, 280, H * 0.2, 310, H * 0.3);
    gfx.fillTriangle(W - 110, H * 0.2, W - 80, H * 0.1, W - 50, H * 0.2);
    // Ice crystals on ground
    gfx.fillStyle(0x88bbff, 0.12);
    [80, 200, 350, 550, 700, 830].forEach(cx => {
      const ch = Phaser.Math.Between(15, 35);
      gfx.fillTriangle(cx - 6, H - 80, cx, H - 80 - ch, cx + 6, H - 80);
    });
    // Aurora borealis subtle effect
    const aurora = this.add.rectangle(W / 2, H * 0.15, W * 0.6, 8, 0x44ffaa, 0.06);
    this.tweens.add({ targets: aurora, scaleX: 1.3, alpha: 0.02, duration: 4000, yoyo: true, repeat: -1 });
  }

  _drawVolcanicTheme(gfx, W, H, cfg) {
    // No stars — smoke haze
    gfx.fillStyle(0x331100, 0.15);
    for (let i = 0; i < 8; i++) {
      gfx.fillCircle(Phaser.Math.Between(50, W - 50), Phaser.Math.Between(20, H * 0.4), Phaser.Math.Between(30, 60));
    }
    // Volcano silhouette
    gfx.fillStyle(0x2a0800, 0.4);
    gfx.fillTriangle(W / 2 - 200, H * 0.7, W / 2, H * 0.1, W / 2 + 200, H * 0.7);
    gfx.fillStyle(0xff2200, 0.08);
    gfx.fillTriangle(W / 2 - 30, H * 0.15, W / 2, H * 0.1, W / 2 + 30, H * 0.15);
    // Lava cracks on ground
    gfx.lineStyle(2, 0xff4400, 0.2);
    for (let i = 0; i < 6; i++) {
      const sx = Phaser.Math.Between(50, W - 50);
      gfx.lineBetween(sx, H - 80, sx + Phaser.Math.Between(-30, 30), H - 50);
    }
    // Lava pool glow
    const lavaGlow = this.add.ellipse(W / 2, H - 30, 200, 20, 0xff4400, 0.08).setDepth(0);
    this.tweens.add({ targets: lavaGlow, alpha: 0.03, scaleX: 1.1, duration: 1500, yoyo: true, repeat: -1 });
    // Ember particles
    for (let i = 0; i < 10; i++) {
      const ember = this.add.circle(Phaser.Math.Between(50, W - 50), H - 80, Phaser.Math.Between(1, 3), 0xff6600, 0.5);
      this.tweens.add({ targets: ember, y: Phaser.Math.Between(30, H * 0.4), alpha: 0, duration: Phaser.Math.Between(2000, 5000), repeat: -1, delay: i * 300 });
    }
    // Rock pillars
    gfx.fillStyle(0x1a0800, 0.3);
    gfx.fillRect(60, H * 0.5, 25, H * 0.3);
    gfx.fillRect(W - 85, H * 0.45, 25, H * 0.35);
  }

  _drawVoidTheme(gfx, W, H, cfg) {
    // Vortex spiral lines
    gfx.lineStyle(1, 0x4400aa, 0.08);
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      const r = 120;
      gfx.lineBetween(W / 2, H * 0.35, W / 2 + Math.cos(angle) * r, H * 0.35 + Math.sin(angle) * r);
    }
    // Void crack lines
    gfx.lineStyle(1, 0x8800ff, 0.1);
    for (let i = 0; i < 5; i++) {
      const sx = Phaser.Math.Between(100, W - 100);
      const sy = Phaser.Math.Between(50, H * 0.6);
      gfx.lineBetween(sx, sy, sx + Phaser.Math.Between(-60, 60), sy + Phaser.Math.Between(-40, 40));
    }
    // Central void eye
    const voidEye = this.add.circle(W / 2, H * 0.35, 35, 0x220044, 0.15);
    voidEye.setStrokeStyle(2, 0x6600cc, 0.1);
    this.tweens.add({ targets: voidEye, scaleX: 1.3, scaleY: 0.7, duration: 3000, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    const innerEye = this.add.circle(W / 2, H * 0.35, 8, 0xff00ff, 0.1);
    this.tweens.add({ targets: innerEye, alpha: 0.02, scaleX: 2, scaleY: 2, duration: 2000, yoyo: true, repeat: -1 });
    // Floating void fragments
    for (let i = 0; i < 8; i++) {
      const frag = this.add.rectangle(Phaser.Math.Between(30, W - 30), Phaser.Math.Between(50, H - 100),
        Phaser.Math.Between(3, 8), Phaser.Math.Between(3, 8), 0x6600cc, 0.2);
      frag.setAngle(Phaser.Math.Between(0, 360));
      this.tweens.add({ targets: frag, y: frag.y - 40, angle: frag.angle + 180, alpha: 0, duration: Phaser.Math.Between(3000, 6000), yoyo: true, repeat: -1, delay: i * 400 });
    }
  }

  _spawnEnvParticles(theme, W, H, cfg) {
    // Snow for frozen theme
    if (theme === 'frozen') {
      this.time.addEvent({ delay: 300, loop: true, callback: () => {
        const snow = this.add.circle(Phaser.Math.Between(0, W), -5, Phaser.Math.Between(1, 3), 0xddeeff, 0.4);
        this.tweens.add({ targets: snow, y: H + 10, x: snow.x + Phaser.Math.Between(-30, 30), alpha: 0, duration: Phaser.Math.Between(4000, 7000), onComplete: () => snow.destroy() });
      }});
    }
    // Ash for volcanic
    if (theme === 'volcanic') {
      this.time.addEvent({ delay: 500, loop: true, callback: () => {
        const ash = this.add.circle(Phaser.Math.Between(0, W), -5, Phaser.Math.Between(1, 2), 0x666666, 0.3);
        this.tweens.add({ targets: ash, y: H + 10, x: ash.x + Phaser.Math.Between(-40, 40), alpha: 0, duration: Phaser.Math.Between(3000, 6000), onComplete: () => ash.destroy() });
      }});
    }
  }

  _buildFogEffect() {
    const { W, H } = this;
    const fogGfx = this.add.graphics();
    fogGfx.fillStyle(0x002200, 0.3);
    for (let y = H * 0.2; y < H - 90; y += 40) {
      fogGfx.fillRect(0, y, W, 20);
    }
    fogGfx.setDepth(3);
  }

  _applyGimmick() {
    const gimmick = this.arenaConfig.gimmick;
    if (!gimmick) return;

    if (gimmick === 'input_delay') {
      // Frozen Tundra: +0.2s input delay (unless player has upgrade)
      if (!this.upgradeManager.bonuses.frostResist) {
        this._inputDelay = 200;
        // Show a warning
        this.time.delayedCall(500, () => {
          FloatingText.spawn(this, this.W / 2, this.H / 2 - 60, '❄️ FROZEN — Input delayed +0.2s', '#88ccff', '16px');
        });
      }
    } else if (gimmick === 'moving_platform') {
      // Volcanic Pit: platform shifts every 10s
      this._platformTimer = this.time.addEvent({
        delay: 10000,
        loop: true,
        callback: this._shiftPlatform,
        callbackScope: this
      });
    }
  }

  _shiftPlatform() {
    const { W } = this;
    FloatingText.spawn(this, W / 2, 80, '🌋 Platform shifting! Type MOVE', '#ff6600', '18px');
    // Visual shake
    this.cameras.main.shake(300, 0.015);
    // If a MOVE word target is not found in typing engine, penalize
    const hasMoveTarget = this.typingEngine.targets.some(t => t.currentWord === 'MOVE' && t.alive);
    if (!hasMoveTarget) {
      // Spawn a temporary MOVE prompt
      const moveTarget = {
        alive: true,
        currentWord: 'MOVE',
        x: W / 2,
        onProgress: () => {},
        onWrong: () => {},
        _isMoveTarget: true
      };
      this.typingEngine.registerTarget(moveTarget);
      this.time.delayedCall(3000, () => {
        moveTarget.alive = false;
        this.typingEngine.unregisterTarget(moveTarget);
      });
    }
  }

  // ─── HUD Building ──────────────────────────────────────────────────────────

  _buildHUD() {
    const { W, H } = this;
    const depth = 50;

    // ── Top HUD bar ────────────────────────────────────────────
    // Full-width semi-transparent bar
    this.add.rectangle(W / 2, 20, W, 40, 0x000000, 0.7).setDepth(depth - 1);
    this.add.rectangle(W / 2, 40, W, 1, 0x333344).setDepth(depth - 1);

    // Left section: HP Hearts
    this.add.text(12, 12, 'HP', {
      fontFamily: 'Courier New, monospace', fontSize: '9px', color: '#666677'
    }).setDepth(depth);
    this.heartIcons = [];
    for (let i = 0; i < 5; i++) {
      const heart = this.add.text(34 + i * 24, 20, '🖤', {
        fontSize: '18px'
      }).setOrigin(0.5).setDepth(depth);
      this.heartIcons.push(heart);
    }
    this._updateHearts();

    // Center section: Arena name + Wave indicator
    this.arenaNameTxt = this.add.text(W / 2, 10, this.arenaConfig.name?.toUpperCase() || '', {
      fontFamily: 'Courier New, monospace',
      fontSize: '9px',
      color: '#555566'
    }).setOrigin(0.5).setDepth(depth);

    this.waveTxt = this.add.text(W / 2, 24, 'WAVE 1 / 5', {
      fontFamily: 'Courier New, monospace',
      fontSize: '12px',
      color: '#ccccdd'
    }).setOrigin(0.5).setDepth(depth);

    // Right section: Score + Combo
    this.scoreLabel = this.add.text(W - 100, 10, 'SCORE', {
      fontFamily: 'Courier New, monospace',
      fontSize: '9px',
      color: '#666677'
    }).setOrigin(0, 0).setDepth(depth);

    this.scoreTxt = this.add.text(W - 100, 22, '0', {
      fontFamily: 'Courier New, monospace',
      fontSize: '16px',
      color: '#ffdd88',
      stroke: '#000000',
      strokeThickness: 2
    }).setOrigin(0, 0).setDepth(depth);

    this.comboTxt = this.add.text(W - 16, 20, '', {
      fontFamily: 'Courier New, monospace',
      fontSize: '18px',
      color: '#ff6600',
      stroke: '#000000',
      strokeThickness: 2
    }).setOrigin(1, 0.5).setDepth(depth);

    // ── Bottom HUD area ────────────────────────────────────────
    // Bottom bar background
    this.add.rectangle(W / 2, H - 30, W, 60, 0x000000, 0.4).setDepth(depth - 1);
    this.add.rectangle(W / 2, H - 60, W, 1, 0x222233).setDepth(depth - 1);

    // Typing indicator (bottom left)
    this.typingIndicatorTxt = this.add.text(16, H - 30, '', {
      fontFamily: 'Courier New, monospace',
      fontSize: '13px',
      color: '#888899'
    }).setOrigin(0, 0.5).setDepth(depth);

    // Defense prompt (below wave text, hidden until needed)
    this.defensePanelBg = this.add.rectangle(W / 2, 55, 440, 32, 0x000000, 0.9)
      .setDepth(depth + 1).setVisible(false);
    this.defensePanelBg.setStrokeStyle(2, 0xff4400);

    this.defenseTxt = this.add.text(W / 2, 55, '', {
      fontFamily: 'Courier New, monospace',
      fontSize: '12px',
      color: '#ff8800'
    }).setOrigin(0.5).setDepth(depth + 2).setVisible(false);

    // Boss HP bar (hidden unless boss fight)
    this.bossHPBg = this.add.rectangle(W / 2, H - 16, W * 0.8, 14, 0x330000)
      .setDepth(depth).setVisible(false);
    this.bossHPBg.setStrokeStyle(1, 0x660000);
    this.bossHPFill = this.add.rectangle(W / 2 - (W * 0.4), H - 16, W * 0.8, 12, 0xff2222)
      .setOrigin(0, 0.5).setDepth(depth + 1).setVisible(false);
    this.bossLabel = this.add.text(W / 2, H - 26, '', {
      fontFamily: 'Courier New, monospace',
      fontSize: '10px',
      color: '#ff4444'
    }).setOrigin(0.5, 1).setDepth(depth + 1).setVisible(false);

    // Ability slots (bottom right)
    this.abilityWordTargets = {}; // Initialize before _buildAbilitySlots
    this._buildAbilitySlots(depth);
    
    // Register ability word targets with TypingEngine
    Object.values(this.abilityWordTargets).forEach(target => {
      this.typingEngine.registerTarget(target);
    });

    // Special challenge overlay (hidden)
    this._buildChallengeOverlay(depth);
  }

  _buildAbilitySlots(depth) {
    const { W, H } = this;
    this.abilitySlots = {};
    this.abilityWordLabels = {}; // WordLabel objects for typing animation
    const abilities = ['battleCry', 'timeSlow', 'shield', 'chain'];
    const icons  = { battleCry: '📢', timeSlow: '⏰', shield: '🔵', chain: '⚡' };
    const colors = { battleCry: 0xffcc00, timeSlow: 0x88ccff, shield: 0x4488ff, chain: 0xffff44 };

    // Center the ability slots with proper spacing
    const slotSpacing = 110; // wider spacing to prevent word overlap
    const totalWidth = abilities.length * slotSpacing;
    const startX = W / 2 - totalWidth / 2 + slotSpacing / 2;

    abilities.forEach((ab, i) => {
      const x = startX + i * slotSpacing;
      const y = H - 30;
      
      // Background with glow effect
      const slotBg = this.add.rectangle(x, y, 50, 40, 0x0d0d1a).setDepth(depth).setStrokeStyle(1, 0x333355, 0.5).setVisible(false);
      
      // Glow ring (visible when ready)
      const glowRing = this.add.rectangle(x, y, 54, 44, colors[ab], 0).setDepth(depth - 1).setStrokeStyle(2, colors[ab], 0).setVisible(false);
      
      // Cooldown overlay (darkens the slot)
      const cooldownOverlay = this.add.rectangle(x, y, 50, 40, 0x000000, 0).setDepth(depth + 0.5).setVisible(false);
      
      const slotIcon = this.add.text(x, y, icons[ab], { fontSize: '18px' }).setOrigin(0.5).setDepth(depth + 1).setVisible(false);
      
      // WordLabel ABOVE the icon - scaled down to fit in slot spacing
      const wordLabel = new WordLabel(this, x, y - 45, 'WORD');
      wordLabel.setDepth(depth + 2);
      wordLabel.container.setVisible(false);
      wordLabel.container.setScale(0.75); // Scale down to prevent overlap
      
      // Cooldown bar (fills up as cooldown progresses)
      const cooldownBarBg = this.add.rectangle(x, y + 18, 46, 4, 0x222233).setOrigin(0.5).setDepth(depth + 1).setVisible(false);
      const cooldownBar = this.add.rectangle(x - 23, y + 18, 0, 4, colors[ab]).setOrigin(0, 0.5).setDepth(depth + 2).setVisible(false);

      this.abilitySlots[ab] = { 
        slotBg, slotIcon, wordLabel, cooldownBar, cooldownBarBg, 
        glowRing, cooldownOverlay,
        pulseTween: null, flashTween: null
      };
      
      this.abilityWordLabels[ab] = wordLabel;
      
      // Create virtual typing target for this ability
      this.abilityWordTargets[ab] = this._createAbilityWordTarget(ab, wordLabel);
    });
  }
  
  // Create a virtual target object for ability words (compatible with TypingEngine)
  _createAbilityWordTarget(abilityName, wordLabel) {
    const self = this;
    return {
      x: wordLabel.container.x,
      y: wordLabel.container.y,
      alive: true,
      currentWord: '',
      isAbilityTarget: true,
      abilityName: abilityName,
      
      // Called by TypingEngine when progress is made
      onProgress(typed) {
        wordLabel.setProgress(typed);
        if (typed.length === 1) {
          self.typingEngine?.onWordStart();
        }
      },
      
      onWrong() {
        wordLabel.showError();
      },
      
      // Set the word for this ability (only if changed)
      setWord(word) {
        if (this.fullWord !== word) {
          this.fullWord = word;
          this.currentWord = word;
          wordLabel.setWord(word);
        }
      },
      
      // Show/hide
      setVisible(visible) {
        wordLabel.container.setVisible(visible);
        this.alive = visible && this.fullWord && this.fullWord.length > 0;
      },
      
      // Reset visual
      resetVisual() {
        wordLabel.setProgress('');
      }
    };
  }

  _buildChallengeOverlay(depth) {
    const { W, H } = this;
    this.challengeOverlay = this.add.container(W / 2, H / 2 - 40).setDepth(depth + 10).setVisible(false);

    const bg = this.add.rectangle(0, 0, 500, 90, 0x000000, 0.9).setStrokeStyle(2, 0xff4400);
    this.challengeTitle = this.add.text(0, -25, '', {
      fontFamily: 'Courier New, monospace', fontSize: '14px', color: '#ff8800'
    }).setOrigin(0.5);
    this.challengeWordTxt = this.add.text(0, 8, '', {
      fontFamily: 'Courier New, monospace', fontSize: '22px', color: '#ffffff'
    }).setOrigin(0.5);
    this.challengeTimerBar = this.add.rectangle(-240, 35, 0, 6, 0xff4400).setOrigin(0, 0.5);
    this.challengeTimerBg = this.add.rectangle(0, 35, 480, 6, 0x330000);

    this.challengeOverlay.add([bg, this.challengeTimerBg, this.challengeTitle, this.challengeWordTxt, this.challengeTimerBar]);
  }

  // ─── Event Setup ───────────────────────────────────────────────────────────

  _setupEvents() {
    // Word completed
    this.events.on('WORD_COMPLETE', this._onWordComplete, this);

    // Wrong key
    this.events.on('WORD_WRONG', () => {
      audioManager.playWrong();
      if (this.challengeCondition === 'noMiss' && !this.challengeFailed) {
        this.challengeFailed = true;
        FloatingText.spawn(this, this.W / 2, this.H / 2, '❌ CHALLENGE FAILED — No mistakes allowed!', '#ff4444', '20px');
      }
    });

    // Combo
    this.events.on('COMBO_UPDATE', this._onComboUpdate, this);
    this.events.on('COMBO_BREAK', () => {
      this.comboSystem.break();
      this._shakeComboText();
    });

    // Enemy spawn
    this.events.on('SPAWN_ENEMY', this._spawnEnemy, this);

    // Necromancer summon
    this.events.on('NECROMANCER_SUMMON', ({ x, y, type }) => {
      const EnemyClass = ENEMY_MAP[type] || SkeletonEnemy;
      const enemy = new EnemyClass(this, x, y);
      this.enemies.push(enemy);
      // Don't register with waveManager - summoned enemies are extras
    });

    // Enemy attack
    this.events.on('ENEMY_ATTACK', this._onEnemyAttack, this);

    // Enemy death
    this.events.on('ENEMY_DEAD', this._onEnemyDead, this);

    // Player dead
    this.events.once('PLAYER_DEAD', this._onPlayerDead, this);

    // Wave events
    this.events.on('WAVE_START', this._onWaveStart, this);
    this.events.on('WAVE_CLEAR', this._onWaveClear, this);
    this.events.on('ALL_WAVES_DONE', this._onAllWavesDone, this);

    // Boss special
    this.events.on('SPECIAL_CHALLENGE', this._startSpecialChallenge, this);
    this.events.on('BOSS_PHASE_CHANGE', ({ label }) => {
      this._showWaveAnnouncement(label, null, '#ff4400');
    });

    // Abilities are activated by typing their word (shown in HUD slots)
  }

  // ─── Word Complete Handler ─────────────────────────────────────────────────

  _onWordComplete({ enemy, word, perfect, cps, accuracy, special }) {
    this.stats.wordsTyped++;
    if (perfect) this.stats.perfectWords++;

    // Update last word
    const prevWord = this.lastWord;
    this.lastWord = word;

    // Check if this is an ability target
    if (enemy?.isAbilityTarget) {
      const abilityName = enemy.abilityName;
      this._tryUseAbility(abilityName);
      // Reset the ability word visual
      enemy.resetVisual();
      return;
    }

    // Check if this is a defense word
    if (this.defenseWindow && this.pendingAttacks && this.pendingAttacks.length > 0) {
      const defenseKeys = ['BLOCK', 'SHIELD', 'DODGE', 'ROLL'];
      if (defenseKeys.includes(word)) {
        this._handleDefense(word, this.pendingAttacks);
        return;
      }
    }

    // Check for ability word match (dynamic words) - fallback
    const matchedAbility = this.upgradeManager.matchAbilityWord(word);
    if (matchedAbility) {
      this._tryUseAbility(matchedAbility);
      return;
    }

    // Check special ability or effect
    const specialDef = SPECIAL_WORDS[word.toLowerCase()];
    if (specialDef) {
      if (specialDef.effect === 'heal') {
        this.player.healHP(specialDef.hpRestore || 1);
        this._updateHearts();
        FloatingText.spawn(this, this.player.x, this.player.y - 50, '❤️ HEALED!', '#ff88aa', '18px');
        audioManager.playStatusEffect('heal');
        this._addScore(100);
        this.comboSystem.increment();
        return;
      }
    }

    // Check FLIP for shield enemy
    if (enemy && enemy instanceof ShieldEnemy && (word === 'FLIP' || word === 'TURN')) {
      enemy.flip();
      this._addScore(50);
      this.comboSystem.increment();
      return;
    }

    if (!enemy || !enemy.alive) return;

    // Calculate damage
    const tierMult = this._getTierMultiplier(word);
    const accuracyMult = accuracy >= 1 ? 1 : accuracy >= 0.8 ? 1 : accuracy >= 0.5 ? 0.75 : 0.5;
    const comboMult = this.comboSystem.getDamageMultiplier();
    const speedBonus = this._getSpeedBonus(cps);

    let baseDmg = 10;
    let dmg = baseDmg * tierMult * accuracyMult * comboMult * speedBonus;

    // Upgrade: long word bonus
    if (word.length >= 6) {
      dmg *= this.upgradeManager.bonuses.longWordDamage || 1;
    }

    // Upgrade: echo strike
    if (this.upgradeManager.bonuses.echoStrike && word === prevWord) {
      dmg *= 1.5;
      FloatingText.spawn(this, enemy.x, enemy.y - 60, 'ECHO! x1.5', '#88ffff', '14px');
    }

    dmg = Math.ceil(dmg);

    // Perfect = critical hit visual
    if (perfect && cps > 4) {
      dmg *= 2;
      FloatingText.spawn(this, enemy.x, enemy.y - 60, '⚡ CRITICAL!', '#ffff00', '16px');
      this.cameras.main.flash(80, 255, 255, 100);
    }

    // Chain Lightning ability
    if (this.upgradeManager.bonuses._chainNext) {
      this.enemies.forEach(e => {
        if (e.alive) e.receiveDamage(dmg, special);
      });
      delete this.upgradeManager.bonuses._chainNext;
      if (this._chainExpiry) { this._chainExpiry.destroy(); this._chainExpiry = null; }
      // Remove visual glow
      this.player.sword.setStrokeStyle(1, 0xffffff);
      FloatingText.spawn(this, this.W / 2, 80, '⚡ CHAIN LIGHTNING!', '#ffff44', '20px');
      this.cameras.main.flash(100, 255, 255, 50);
    } else {
      enemy.receiveDamage(dmg, special);
    }

    // Heal on epic word
    if (this.upgradeManager.bonuses.arcaneSurge && word.length >= 9) {
      this.player.healHP(1);
      this._updateHearts();
      FloatingText.spawn(this, this.player.x, this.player.y - 60, '❤️ ARCANE HEAL', '#ff88aa', '14px');
    }

    // Spellweave
    if (this.upgradeManager.bonuses.spellweave) {
      this.spellweaveCount++;
      if (this.spellweaveCount >= 3) {
        this.spellweaveCount = 0;
        const effects = ['burn', 'slow', 'stun'];
        const eff = effects[Math.floor(Math.random() * effects.length)];
        enemy.receiveDamage(5, { effect: eff, duration: 2000 });
        FloatingText.spawn(this, enemy.x, enemy.y - 70, '🌀 SPELLWEAVE!', '#cc44ff', '14px');
      }
    }

    // Short word stun
    if (this.upgradeManager.bonuses.shortWordStun && word.length <= 4) {
      enemy.freezeFor(500);
    }

    // Blood type
    if (this.upgradeManager.bonuses.bloodType && perfect) {
      this.upgradeManager.bonuses.bloodTypeCharges = (this.upgradeManager.bonuses.bloodTypeCharges || 0) + 1;
      if (this.upgradeManager.bonuses.bloodTypeCharges >= 5) {
        this.upgradeManager.bonuses.bloodTypeCharges = 0;
        this.player.healHP(1);
        this._updateHearts();
        FloatingText.spawn(this, this.player.x, this.player.y - 50, '❤️ BLOOD TYPE!', '#ff4466', '14px');
      }
    }

    // Score
    const scoreGain = dmg * 10 * (perfect ? 1.5 : 1);
    this._addScore(scoreGain);

    // Combo
    if (accuracy >= 0.8) {
      this.comboSystem.increment();
    }

    // Audio
    audioManager.playWordComplete(perfect);
    audioManager.playHitEnemy();

    // Player attack anim — lunge toward enemy
    this.player.playAttackAnim(enemy.x);

    // Update boss HP bar if boss fight
    if (enemy.isBoss) this._updateBossHP(enemy);

    // Update typing indicator
    this._updateTypingIndicator('');
  }

  _getTierMultiplier(word) {
    const len = word.length;
    if (len <= 4)       return 1.0;
    else if (len <= 6)  return 1.5;
    else if (len <= 8)  return 2.0;
    else                return 3.0;
  }

  _getSpeedBonus(cps) {
    const threshold = 5 + (this.upgradeManager.bonuses.timeWarp ? -1 : 0);
    return cps >= threshold ? 1.2 : 1.0;
  }

  // ─── Enemy Spawn ───────────────────────────────────────────────────────────

  _spawnEnemy({ type, waveLevel = 1 }) {
    const EnemyClass = ENEMY_MAP[type];
    if (!EnemyClass) return;

    const x = this._getEnemySpawnX();
    const y = this.H - 100;

    const enemy = new EnemyClass(this, x, y);

    // Scale HP for endless / high wave levels
    if (waveLevel > 1 && this.mode === 'endless') {
      enemy.maxHP = Math.floor(enemy.maxHP * (1 + waveLevel * 0.08));
      enemy.hp = enemy.maxHP;
    }

    this.enemies.push(enemy);
    this.waveManager.registerEnemy(enemy);

    // Apply active time slow to newly spawned enemies
    if (this._timeSlowActive && enemy.alive) {
      enemy.slowed = true;
      const remaining = Math.max(0, (this._timeSlowEnd || 0) - Date.now());
      if (remaining > 0) {
        enemy._tintColor(0x88ccff, remaining);
        this.time.delayedCall(remaining, () => { if (enemy.alive) enemy.slowed = false; });
      }
    }

    // Boss setup
    if (enemy.isBoss) {
      this._showBossHPBar(enemy);
      audioManager.playBossIntro();
    }
  }

  // ─── Enemy Spawn Position ──────────────────────────────────────────────────

  _getEnemySpawnX() {
    const margin = 250;
    const maxX = this.W - 120;
    const usableWidth = maxX - margin;

    // Count currently alive enemies for slot calculation
    const aliveCount = this.enemies.filter(e => e.alive).length;
    const totalSlots = Math.max(aliveCount + 1, 4); // at least 4 slots

    // Find the least-occupied slot
    const slotWidth = usableWidth / totalSlots;
    const slotOccupancy = new Array(totalSlots).fill(0);

    this.enemies.forEach(e => {
      if (!e.alive) return;
      const slotIdx = Math.floor((e.x - margin) / slotWidth);
      const clampedIdx = Phaser.Math.Clamp(slotIdx, 0, totalSlots - 1);
      slotOccupancy[clampedIdx]++;
    });

    // Pick the slot with fewest enemies (leftmost tie-break)
    let bestSlot = 0;
    let minOccupancy = Infinity;
    for (let i = 0; i < totalSlots; i++) {
      if (slotOccupancy[i] < minOccupancy) {
        minOccupancy = slotOccupancy[i];
        bestSlot = i;
      }
    }

    // Center of slot + small random jitter
    const jitter = Phaser.Math.Between(-20, 20);
    return Phaser.Math.Clamp(margin + bestSlot * slotWidth + slotWidth / 2 + jitter, margin, maxX);
  }

  // ─── Enemy Attack Handler ─────────────────────────────────────────────────

  _onEnemyAttack({ enemy, damage, attackType }) {
    if (!enemy.alive || !this.player.alive) return;

    // If already in defense window, queue the attack
    if (this.defenseWindow) {
      this.attackQueue.push({ enemy, damage, attackType });
      return;
    }

    // Check if we should batch process queued attacks
    // (attacks that happened very close together are shown together)
    const hasQueued = this.attackQueue.length > 0;
    this.attackQueue.push({ enemy, damage, attackType });

    // Shadow and void attacks can only be dodged (unblockable)
    const defenseOptions = (attackType === 'shadow' || attackType === 'void')
      ? ['DODGE', 'ROLL']
      : ['BLOCK', 'SHIELD', 'DODGE', 'ROLL'];

    // Show defense prompt with all queued attacks
    this._showDefensePrompt(defenseOptions, this.attackQueue);
    audioManager.playPlayerHit(); // warning sound (softer version)
  }

  _showDefensePrompt(options, attacks) {
    if (!this.player.alive) return;

    // attacks is an array of { enemy, damage, attackType }
    // If single attack passed as object, convert to array
    if (!Array.isArray(attacks)) {
      attacks = [attacks];
    }

    // Clear any existing defense state
    if (this._defenseTarget) {
      this.typingEngine.unregisterTarget(this._defenseTarget);
      this._defenseTarget = null;
    }
    if (this.defenseTimer) {
      this.defenseTimer.destroy();
      this.defenseTimer = null;
    }
    // Clear attack queue - we're processing all current attacks
    this.attackQueue = [];

    this.defenseWindow = true;
    this.pendingAttacks = attacks; // Store all pending attacks

    const word = options[Math.floor(Math.random() * options.length)];
    
    // Calculate time limit — kept short so HP reduction feels responsive
    const hasVoidOrShadow = attacks.some(a => a.attackType === 'void' || a.attackType === 'shadow');
    const baseTime = hasVoidOrShadow ? 900 : 1200;
    const timeLimit = Math.min(baseTime + (attacks.length - 1) * 200, 2000);

    // Flash screen to alert player
    this.cameras.main.flash(200, 100, 50, 0);

    this.defensePanelBg.setVisible(true);

    // Show message based on number of attacks
    const isMulti = attacks.length > 1;
    const mainType = attacks[0].attackType;
    const colMap = {
      normal: '#ff8800', magic: '#cc44ff', heavy: '#ff4444',
      shadow: '#aa44ff', fire: '#ff4400', ice: '#44ccff',
      poison: '#44ff44', void: '#aa00ff', counter: '#ffaa00'
    };
    const col = colMap[mainType] || '#ff8800';

    const actionText = options.includes('DODGE') && !options.includes('BLOCK') ? 'DODGE' : 'BLOCK/DODGE';
    if (isMulti) {
      this.defenseTxt
        .setText(`⚠️ MULTI-ATTACK x${attacks.length} — Type [${word}] to ${actionText}!`)
        .setStyle({ color: col })
        .setVisible(true);
    } else {
      this.defenseTxt
        .setText(`⚠️ INCOMING ATTACK — Type [${word}] to ${actionText}!`)
        .setStyle({ color: col })
        .setVisible(true);
    }

    // Visual countdown timer bar
    if (!this.defenseTimerBar) {
      this.defenseTimerBar = this.add.rectangle(this.W / 2, 72, 440, 6, 0x44ff44)
        .setOrigin(0.5).setDepth(100).setVisible(false);
    }
    this.defenseTimerBar.setVisible(true).setScale(1, 1).setFillStyle(0x44ff44);

    // Animate countdown bar
    this.tweens.add({
      targets: this.defenseTimerBar,
      scaleX: 0,
      duration: timeLimit,
      ease: 'Linear',
      onUpdate: (tween) => {
        const progress = tween.progress;
        if (progress > 0.7) {
          this.defenseTimerBar.setFillStyle(0xff4444); // Red when low
        } else if (progress > 0.4) {
          this.defenseTimerBar.setFillStyle(0xffaa00); // Orange
        }
      }
    });

    // Timer - damage all pending attacks at once
    this.defenseTimer = this.time.delayedCall(timeLimit, () => {
      if (this.defenseWindow) {
        // Missed defense - hide timer bar
        if (this.defenseTimerBar) this.defenseTimerBar.setVisible(false);
        // Damage from ALL pending attacks
        const totalDamage = this.pendingAttacks?.reduce((sum, a) => sum + (a.damage || 0), 0) || 0;
        this._playerTakeHit(totalDamage);
      }
    });

    // Force-clear any current typing target so player can immediately type defense word
    this.typingEngine._clearTarget();

    // Register defense word with typing engine
    this._defenseTarget = {
      alive: true,
      currentWord: word,
      x: this.player.x,
      onProgress: (typed) => {
        this.defenseTxt.setText(`⚠️ Type [${typed.padEnd(word.length, '_')}]`);
      },
      onWrong: () => {
        audioManager.playWrong();
      },
      _isDefenseTarget: true,
      _defenseWord: word
    };
    this.typingEngine.registerTarget(this._defenseTarget);
  }

  _handleDefense(word, attacks) {
    this.defenseWindow = false;
    this.pendingAttacks = [];
    if (this.defenseTimer) this.defenseTimer.destroy();
    if (this._defenseTarget) {
      this.typingEngine.unregisterTarget(this._defenseTarget);
      this._defenseTarget = null;
    }
    // Hide timer bar
    if (this.defenseTimerBar) this.defenseTimerBar.setVisible(false);
    this.defensePanelBg.setVisible(false);
    this.defenseTxt.setVisible(false);

    const isDodge = word === 'DODGE' || word === 'ROLL';
    const isBlock = word === 'BLOCK' || word === 'SHIELD';

    if (isDodge) {
      this.player.playDodgeAnim();
      FloatingText.spawn(this, this.player.x, this.player.y - 50, '💨 DODGE!', '#88ffff', '18px');
      this._addScore(30 * (Array.isArray(attacks) ? attacks.length : 1));
    } else if (isBlock) {
      this.player.playBlockAnim();
      FloatingText.spawn(this, this.player.x, this.player.y - 50, '🛡️ BLOCK!', '#88aaff', '18px');
      this._addScore(20 * (Array.isArray(attacks) ? attacks.length : 1));
    }

    // Counter window: if block, deal damage back to first alive enemy
    if (isBlock) {
      const attackList = Array.isArray(attacks) ? attacks : [attacks];
      const target = attackList.find(a => a.enemy?.alive);
      if (target) {
        const counterDmg = target.damage * 5;
        target.enemy.receiveDamage(counterDmg);
        FloatingText.spawn(this, target.enemy.x, target.enemy.y - 50, `COUNTER! -${counterDmg}`, '#ffaa00', '16px');
      }
    }

    audioManager.playWordComplete(false);
    this.comboSystem.increment();

    // Process next queued attack
    this._processNextAttack();
  }

  _playerTakeHit(damage) {
    // Clear defense state immediately
    this.defenseWindow = false;
    this.pendingAttacks = [];
    if (this.defenseTimer) {
      this.defenseTimer.destroy();
      this.defenseTimer = null;
    }
    if (this._defenseTarget) {
      this.typingEngine.unregisterTarget(this._defenseTarget);
      this._defenseTarget = null;
    }
    // Hide timer bar
    if (this.defenseTimerBar) this.defenseTimerBar.setVisible(false);
    this.defensePanelBg.setVisible(false);
    this.defenseTxt.setVisible(false);

    // Check word shield ability
    if (this.upgradeManager.bonuses._shieldReady) {
      delete this.upgradeManager.bonuses._shieldReady;
      if (this._shieldExpiry) { this._shieldExpiry.destroy(); this._shieldExpiry = null; }
      // Remove visual glow
      this.player.body.setStrokeStyle(2, 0xff6666);
      FloatingText.spawn(this, this.player.x, this.player.y - 50, '🔵 SHIELD BLOCKED!', '#88aaff', '18px');
      audioManager.playStatusEffect('slow');
      // Process next queued attack even if shield blocked
      this._processNextAttack();
      return; // absorbed
    }

    const survived = this.player.takeDamage(damage);
    this._updateHearts();
    
    // Screen shake and flash on damage
    if (survived) {
      this.cameras.main.shake(300, 0.02);
      this.cameras.main.flash(200, 150, 0, 0);
      this.comboSystem.break();
      audioManager.playPlayerHit();
    }

    // Process next queued attack
    this._processNextAttack();
  }

  // Process next attack from queue
  _processNextAttack() {
    if (this.attackQueue.length === 0) return;
    if (!this.player.alive) {
      this.attackQueue = []; // Clear queue if player dead
      return;
    }
    if (this.defenseWindow) return; // Already defending
    
    // Batch all queued attacks into single prompt
    const attacks = this.attackQueue.filter(a => a.enemy?.alive);
    this.attackQueue = []; // Clear queue
    
    if (attacks.length === 0) return;
    
    // Determine defense options based on attack types
    const hasVoidOrShadow = attacks.some(a => a.attackType === 'void' || a.attackType === 'shadow');
    const defenseOptions = hasVoidOrShadow
      ? ['DODGE', 'ROLL']
      : ['BLOCK', 'SHIELD', 'DODGE', 'ROLL'];
    
    this._showDefensePrompt(defenseOptions, attacks);
    audioManager.playPlayerHit();
  }

  // ─── Enemy Death ───────────────────────────────────────────────────────────

  _onEnemyDead({ enemy }) {
    this.enemies = this.enemies.filter(e => e !== enemy);
    this.waveManager.unregisterEnemy(enemy);
    this.stats.killCount++;

    audioManager.playEnemyDeath();

    // Score
    const scoreGain = enemy.isBoss ? 500 : 100;
    this._addScore(scoreGain);

    // Kill streak check
    this._lastKills = this._lastKills || [];
    this._lastKills.push(Date.now());
    this._lastKills = this._lastKills.filter(t => Date.now() - t < 5000);
    if (this._lastKills.length >= 3) {
      FloatingText.spawn(this, this.W / 2, 100, '🔥 TRIPLE KILL!', '#ff6600', '26px');
      this._addScore(300);
      this._lastKills = [];
    }
  }

  // ─── Wave Events ───────────────────────────────────────────────────────────

  _onWaveStart({ waveNum, total }) {
    this.waveTxt.setText(`WAVE  ${waveNum} / ${total}`);
    this._showWaveAnnouncement(`WAVE ${waveNum}`, null, '#ffffff');

    // Show mid narration at wave 3
    if (waveNum === 3 && this.mode === 'story') {
      this.time.delayedCall(1500, () => this._showChapterMid());
    }
  }

  _onWaveClear() {
    FloatingText.spawn(this, this.W / 2, 150, '✓ WAVE CLEAR', '#00ff88', '22px');
    this._addScore(200);

    // Check if next arena is a boss fight
    const nextIdx = this.arenaIndex + 1;
    if (nextIdx < ARENAS.length) {
      const nextArena = ARENAS[nextIdx];
      if (nextArena.gimmick === 'boss') {
        // Show boss warning
        this.time.delayedCall(500, () => {
          this._showBossWarning(nextArena);
        });
      }
    }
  }

  _showBossWarning(nextArena) {
    const warningText = this.add.text(this.W / 2, this.H / 2, '⚠️ BOSS AHEAD ⚠️', {
      fontFamily: 'Courier New, monospace',
      fontSize: '32px',
      color: '#ff0000',
      stroke: '#000000',
      strokeThickness: 4
    }).setOrigin(0.5).setDepth(100).setAlpha(0);

    const nextLevelText = this.add.text(this.W / 2, this.H / 2 + 40, `Next: ${nextArena.name}`, {
      fontFamily: 'Courier New, monospace',
      fontSize: '18px',
      color: '#ffaa00'
    }).setOrigin(0.5).setDepth(100).setAlpha(0);

    // Flash effect
    this.cameras.main.flash(300, 50, 0, 0);

    this.tweens.add({
      targets: [warningText, nextLevelText],
      alpha: 1,
      duration: 300,
      hold: 1500,
      yoyo: true,
      onComplete: () => {
        warningText.destroy();
        nextLevelText.destroy();
      }
    });
  }

  _onAllWavesDone() {
    // Disable typing during transition
    this.typingEngine.disable();

    if (this.mode === 'endless') return; // endless never ends

    // Arena clear reward
    this._applyArenaClearReward();

    // Switch to victory music
    audioManager.startBGM('victory');
    audioManager.playVictory();
    this._showWaveAnnouncement('ARENA CLEAR!', () => {
      // Mark challenge complete if passed
      if (this.challengeId && !this.challengeFailed) {
        this._markChallengeComplete();
      }

      // Show chapter outro in story mode
      if (this.mode === 'story') {
        this._showChapterOutro(() => this._proceedToNextArena());
      } else {
        this._proceedToNextArena();
      }
    }, '#00ff88');
  }

  // Apply arena clear reward: heal 1 HP if damaged, else refresh all cooldowns
  _applyArenaClearReward() {
    if (!this.player.alive) return;

    const currentHP = this.player.hp;
    const maxHP = this.player.maxHP;

    if (currentHP < maxHP) {
      // Heal 1 HP
      this.player.healHP(1);
      this._updateHearts();
      FloatingText.spawn(this, this.W / 2, this.H / 2 - 60, '❤️ +1 HP RESTORED!', '#ff4466', '20px');
      audioManager.playStatusEffect('slow'); // positive sound
    } else {
      // HP is full — refresh all ability cooldowns
      let refreshedCount = 0;
      const abilities = ['battleCry', 'timeSlow', 'shield', 'chain'];
      abilities.forEach(name => {
        const ab = this.upgradeManager.state.abilities[name];
        if (ab && ab.lastUsed > 0) {
          ab.lastUsed = 0;
          refreshedCount++;
        }
      });

      if (refreshedCount > 0) {
        FloatingText.spawn(this, this.W / 2, this.H / 2 - 60, `⚡ ${refreshedCount} SKILL${refreshedCount > 1 ? 'S' : ''} REFRESHED!`, '#44aaff', '20px');
        audioManager.playStatusEffect('slow');
      }
    }
  }

  _proceedToNextArena() {
    // Check if there's another arena
    const nextIdx = this.arenaIndex + 1;
    if (nextIdx < ARENAS.length) {
      // Boss rush: skip upgrade, go straight to next arena
      if (this.challengeCondition === 'bossRush') {
        this.scene.start('GameScene', {
          mode: this.mode,
          arenaIndex: nextIdx,
          score: this.score,
          upgradeManager: this.upgradeManager,
          stats: this.stats,
          persistHP: this.player.hp,
          challengeId: this.challengeId,
          challengeCondition: this.challengeCondition
        });
        return;
      }
      // Offer upgrade
      this.scene.start('UpgradeScene', {
        mode: this.mode,
        arenaIndex: nextIdx,
        score: this.score,
        upgradeManager: this.upgradeManager,
        stats: this.stats,
        persistHP: this.player.hp
      });
    } else {
      // Game complete
      this._showVictoryScreen();
    }
  }

  // ─── Player Dead ───────────────────────────────────────────────────────────

  _onPlayerDead() {
    this.typingEngine.disable();
    this.cameras.main.flash(500, 200, 0, 0);

    this.time.delayedCall(1200, () => {
      this.scene.start('GameOverScene', {
        score: this.score,
        mode: this.mode,
        stats: {
          ...this.stats,
          accuracy: this.typingEngine.getAccuracy(),
          comboPeak: this.stats.comboPeak,
          wpm: Math.floor(this.typingEngine.getAverageCPS() * 12) // rough WPM
        },
        challengeId: this.challengeId,
        challengeCondition: this.challengeCondition
      });
    });
  }

  // ─── Boss Intro ────────────────────────────────────────────────────────────

  _doBossIntro() {
    const bossType = this.arenaConfig.waves[0]?.enemies[0]?.type;
    
    // Boss name mapping
    const bossNames = {
      'boss_golem': 'STONE GOLEM',
      'boss_dragon': 'VOID DRAGON',
      'boss_lich': 'LICH KING',
      'boss_hydra': 'HYDRA',
      'boss_void_knight': 'VOID KNIGHT',
      'boss_elemental': 'CHAOS ELEMENTAL'
    };
    const bossName = bossNames[bossType] || 'UNKNOWN BOSS';

    // Dramatic camera shake
    this.cameras.main.shake(800, 0.03);

    // Warning flash
    this.cameras.main.flash(500, 100, 0, 0);

    // Boss intro text
    const introText = this.add.text(this.W / 2, this.H / 2 - 40, `⚠️ BOSS APPROACHING ⚠️`, {
      fontFamily: 'Courier New, monospace',
      fontSize: '28px',
      color: '#ff0000',
      stroke: '#000000',
      strokeThickness: 4
    }).setOrigin(0.5).setDepth(100).setAlpha(0);

    const bossText = this.add.text(this.W / 2, this.H / 2 + 10, `👑 ${bossName}`, {
      fontFamily: 'Courier New, monospace',
      fontSize: '44px',
      color: '#ff4400',
      stroke: '#220000',
      strokeThickness: 6
    }).setOrigin(0.5).setDepth(100).setAlpha(0);

    const subText = this.add.text(this.W / 2, this.H / 2 + 60, 'PREPARE FOR BATTLE!', {
      fontFamily: 'Courier New, monospace',
      fontSize: '20px',
      color: '#ff8800'
    }).setOrigin(0.5).setDepth(100).setAlpha(0);

    // Animate all texts
    this.tweens.add({
      targets: introText,
      alpha: 1,
      duration: 400,
      ease: 'Power2'
    });

    this.tweens.add({
      targets: bossText,
      alpha: 1,
      scaleX: { from: 0.5, to: 1 },
      scaleY: { from: 0.5, to: 1 },
      duration: 600,
      delay: 300,
      ease: 'Back.easeOut'
    });

    this.tweens.add({
      targets: subText,
      alpha: 1,
      duration: 400,
      delay: 600
    });

    // Fade out and start
    this.time.delayedCall(2500, () => {
      this.tweens.add({
        targets: [introText, bossText, subText],
        alpha: 0,
        duration: 500,
        onComplete: () => {
          introText.destroy();
          bossText.destroy();
          subText.destroy();
          this.typingEngine.enable();
          this.waveManager.startNextWave();
        }
      });
    });
  }

  // ─── Boss HP Bar ───────────────────────────────────────────────────────────

  _showBossHPBar(boss) {
    this.bossHPBg.setVisible(true);
    this.bossHPFill.setVisible(true);
    this.bossLabel.setText(boss.config ? '👑 BOSS' : '👑 BOSS').setVisible(true);
    this._activeBoss = boss;
  }

  _updateBossHP(boss) {
    if (!boss) return;
    const ratio = Math.max(0, boss.hp / boss.maxHP);
    const barW = this.W * 0.8;
    this.bossHPFill.width = barW * ratio;
    if (ratio > 0.5)       this.bossHPFill.setFillStyle(0xff2222);
    else if (ratio > 0.25) this.bossHPFill.setFillStyle(0xff6600);
    else                   this.bossHPFill.setFillStyle(0xffaa00);
  }

  // ─── Special Challenge ─────────────────────────────────────────────────────

  _startSpecialChallenge({ word, words, timeLimit, label, punishment }) {
    if (this.specialChallenge) return;

    const challengeWords = words || [word];
    let idx = 0;

    this.specialChallenge = { words: challengeWords, idx: 0, punishment };
    this.challengeOverlay.setVisible(true);
    this.challengeTitle.setText(label);
    this.challengeWordTxt.setText(challengeWords[0]);

    // Timer bar
    this.tweens.add({
      targets: this.challengeTimerBar,
      width: 480,
      duration: timeLimit,
      ease: 'Linear',
      onComplete: () => {
        if (this.specialChallenge) {
          // Failed
          this._endSpecialChallenge(false);
        }
      }
    });

    // Listen for word completions targeting the challenge
    const handler = ({ word: typed }) => {
      if (!this.specialChallenge) return;
      const target = challengeWords[idx];
      if (typed.toUpperCase() === target.toUpperCase()) {
        idx++;
        this.specialChallenge.idx = idx;
        if (idx >= challengeWords.length) {
          this._endSpecialChallenge(true);
          this.events.off('WORD_COMPLETE', handler);
        } else {
          this.challengeWordTxt.setText(challengeWords[idx]);
        }
      }
    };

    this.events.on('WORD_COMPLETE', handler);
  }

  _endSpecialChallenge(success) {
    this.challengeOverlay.setVisible(false);
    this.challengeTimerBar.width = 0;
    const sc = this.specialChallenge;
    this.specialChallenge = null;

    if (!success && sc?.punishment) {
      this._playerTakeHit(sc.punishment.damage);
      FloatingText.spawn(this, this.W / 2, this.H / 2, '💀 TOO SLOW!', '#ff2222', '30px');
    } else if (success) {
      FloatingText.spawn(this, this.W / 2, this.H / 2 - 20, '⚡ DEFLECTED!', '#00ff88', '30px');
      this._addScore(500);
    }
  }

  // ─── Abilities ─────────────────────────────────────────────────────────────

  _flashAbilitySlot(name) {
    const slot = this.abilitySlots[name];
    if (!slot) return;
    
    // Flash animation on the slot
    this.tweens.add({
      targets: [slot.slotBg, slot.glowRing],
      scaleX: { from: 1.3, to: 1 },
      scaleY: { from: 1.3, to: 1 },
      alpha: { from: 0.3, to: 1 },
      duration: 300,
      ease: 'Back.easeOut'
    });
    
    // Flash the glow ring
    slot.glowRing.setStrokeStyle(4, slot.glowRing.fillColor || 0xffffff, 1);
    this.tweens.add({
      targets: slot.glowRing,
      alpha: { from: 1, to: 0.6 },
      duration: 500
    });
  }

  _tryUseAbility(name) {
    const now = Date.now();
    if (!this.upgradeManager.isAbilityReady(name, now)) {
      FloatingText.spawn(this, this.player.x, this.player.y - 50, 'COOLDOWN!', '#888888', '14px');
      return;
    }
    this.upgradeManager.useAbility(name, now);
    
    // Refresh the ability word for next use
    this.upgradeManager.refreshAbilityWord(name);
    
    // Flash the ability slot
    this._flashAbilitySlot(name);

    switch (name) {
      case 'battleCry': {
        // Freeze all enemies for 3s with visual stun tint
        this.enemies.forEach(e => {
          if (e.alive) e.freezeFor(3000);
        });
        this._battleCryActive = true;
        this.time.delayedCall(3000, () => { this._battleCryActive = false; });
        FloatingText.spawn(this, this.W / 2, 100, '📢 BATTLE CRY! 3s FREEZE!', '#ffcc00', '22px');
        this.cameras.main.flash(200, 255, 220, 100);
        this.cameras.main.shake(300, 0.015);
        break;
      }

      case 'timeSlow': {
        // Slow all enemies 70% for 5s — new enemies also get slowed
        this._timeSlowActive = true;
        this._timeSlowEnd = now + 5000;
        this.enemies.forEach(e => {
          if (e.alive) {
            e.slowed = true;
            e._tintColor(0x88ccff, 5000);
          }
        });
        this.time.delayedCall(5000, () => {
          this._timeSlowActive = false;
          this._timeSlowEnd = 0;
          this.enemies.forEach(e => { if (e.alive) e.slowed = false; });
        });
        FloatingText.spawn(this, this.W / 2, 100, '⏰ TIME SLOW! 5s!', '#88ccff', '22px');
        this.cameras.main.flash(150, 100, 150, 255);
        break;
      }

      case 'shield': {
        // Auto-block next attack, expires after 15s if unused
        this.upgradeManager.bonuses._shieldReady = true;
        this._shieldExpiry = this.time.delayedCall(15000, () => {
          if (this.upgradeManager.bonuses._shieldReady) {
            delete this.upgradeManager.bonuses._shieldReady;
            FloatingText.spawn(this, this.player.x, this.player.y - 50, '🔵 Shield expired', '#666688', '12px');
          }
        });
        // Visual: blue glow on player
        this.player.body.setStrokeStyle(3, 0x4488ff);
        FloatingText.spawn(this, this.player.x, this.player.y - 50, '🔵 SHIELD READY!', '#88aaff', '18px');
        break;
      }

      case 'chain': {
        // Next word hits all enemies, expires after 15s if unused
        this.upgradeManager.bonuses._chainNext = true;
        this._chainExpiry = this.time.delayedCall(15000, () => {
          if (this.upgradeManager.bonuses._chainNext) {
            delete this.upgradeManager.bonuses._chainNext;
            FloatingText.spawn(this, this.player.x, this.player.y - 50, '⚡ Chain expired', '#888844', '12px');
          }
        });
        // Visual: yellow glow on sword
        this.player.sword.setStrokeStyle(2, 0xffff00);
        FloatingText.spawn(this, this.player.x, this.player.y - 50, '⚡ CHAIN READY!', '#ffff44', '18px');
        break;
      }
    }

    audioManager.playStatusEffect('stun');
  }

  // ─── HUD Updates ───────────────────────────────────────────────────────────

  _updateHearts() {
    const maxHP = this.player.maxHP;
    const hp = this.player.hp;
    this.heartIcons.forEach((h, i) => {
      if (i < maxHP) {
        h.setVisible(true);
        h.setText(i < hp ? '❤️' : '🖤');
        h.setAlpha(i < hp ? 1 : 0.4);
      } else {
        h.setVisible(false);
      }
    });
  }

  _onComboUpdate({ count }) {
    this.stats.comboPeak = Math.max(this.stats.comboPeak, count);
    if (count === 0) {
      this.comboTxt.setText('');
    } else {
      const flames = count >= 20 ? '🔥🔥🔥' : count >= 10 ? '🔥🔥' : count >= 5 ? '🔥' : '';
      this.comboTxt.setText(`${flames} x${count}`);
      this.tweens.add({
        targets: this.comboTxt,
        scaleX: 1.2, scaleY: 1.2,
        duration: 80,
        yoyo: true
      });

      // Milestone audio
      if (count % 5 === 0) {
        audioManager.playComboMilestone(count);
      }
    }
  }

  _shakeComboText() {
    this.tweens.add({
      targets: this.comboTxt,
      x: this.comboTxt.x + 5,
      duration: 50,
      yoyo: true,
      repeat: 3,
      onComplete: () => this.comboTxt.setText('')
    });
  }

  _addScore(amount) {
    this.score += Math.floor(amount);
    this.scoreTxt.setText(this.score.toString());
    this.tweens.add({
      targets: this.scoreTxt,
      scaleX: 1.3, scaleY: 1.3,
      duration: 80,
      yoyo: true
    });
  }

  _updateTypingIndicator(typed) {
    if (typed) {
      this.typingIndicatorTxt.setText(`▶ ${typed}_`);
    } else {
      this.typingIndicatorTxt.setText('');
    }
  }

  // ─── Pause ─────────────────────────────────────────────────────────────────

  _pause() {
    this.typingEngine.disable();
    this.scene.launch('PauseScene', { parentScene: 'GameScene' });
    this.scene.pause();
  }

  // ─── Wave Announcement ─────────────────────────────────────────────────────

  _showWaveAnnouncement(text, callback, color = '#ffffff') {
    const txt = this.add.text(this.W / 2, this.H / 2 - 20, text, {
      fontFamily: 'Courier New, monospace',
      fontSize: '38px',
      color,
      stroke: '#000000',
      strokeThickness: 5
    }).setOrigin(0.5).setDepth(80).setAlpha(0);

    this.tweens.add({
      targets: txt,
      alpha: 1,
      scaleX: 1.1, scaleY: 1.1,
      duration: 400,
      hold: 900,
      yoyo: true,
      ease: 'Power2',
      onComplete: () => {
        txt.destroy();
        if (callback) callback();
      }
    });
  }

  _showVictoryScreen() {
    // Mark challenge complete
    if (this.challengeId && !this.challengeFailed) {
      this._markChallengeComplete();
    }

    // Show epilogue in story mode
    if (this.mode === 'story') {
      this._showEpilogue(() => this._goToGameOver());
    } else {
      this._goToGameOver();
    }
  }

  _goToGameOver() {
    this.time.delayedCall(500, () => {
      this.scene.start('GameOverScene', {
        score: this.score,
        mode: this.mode,
        victory: true,
        stats: {
          ...this.stats,
          accuracy: this.typingEngine.getAccuracy(),
          comboPeak: this.stats.comboPeak,
          wpm: Math.floor(this.typingEngine.getAverageCPS() * 12)
        }
      });
    });
  }

  _applyChallengeCondition() {
    if (!this.challengeCondition) return;
    switch (this.challengeCondition) {
      case 'oneHP':
        this.player.setMaxHP(1);
        FloatingText.spawn(this, this.W / 2, this.H / 2 - 40, '💀 CHALLENGE: 1 HP ONLY', '#ff4444', '18px');
        break;
      case 'blindTyping':
        this._blindTyping = true;
        FloatingText.spawn(this, this.W / 2, this.H / 2 - 40, '🙈 CHALLENGE: Blind Typing', '#aa44aa', '18px');
        break;
      case 'shortWordsOnly':
        this._shortWordsOnly = true;
        FloatingText.spawn(this, this.W / 2, this.H / 2 - 40, '🔡 CHALLENGE: Short Words Only', '#44aaff', '18px');
        break;
      case 'noMiss':
        this._noMiss = true;
        FloatingText.spawn(this, this.W / 2, this.H / 2 - 40, '🎯 CHALLENGE: Perfect Run', '#22cc44', '18px');
        break;
      case 'bossRush':
        this._bossRush = true;
        FloatingText.spawn(this, this.W / 2, this.H / 2 - 40, '👑 CHALLENGE: Boss Rush', '#ff4400', '18px');
        break;
      case 'highCPS':
        this._highCPS = true;
        FloatingText.spawn(this, this.W / 2, this.H / 2 - 40, '⚡ CHALLENGE: Maintain 7+ CPS', '#ffcc00', '18px');
        break;
      case 'highCombo':
        this._highCombo = true;
        FloatingText.spawn(this, this.W / 2, this.H / 2 - 40, '🔥 CHALLENGE: Combo King (30x)', '#ff6600', '18px');
        break;
    }
  }

  _markChallengeComplete() {
    if (!this.challengeId) return;
    try {
      const data = JSON.parse(localStorage.getItem('challenge_progress') || '{}');
      const today = new Date().toDateString();
      if (!data[today]) data[today] = [];
      if (!data[today].includes(this.challengeId)) {
        data[today].push(this.challengeId);
        localStorage.setItem('challenge_progress', JSON.stringify(data));
      }
    } catch (e) {
      // localStorage may be unavailable
    }
    FloatingText.spawn(this, this.W / 2, this.H / 2 - 20, '✅ CHALLENGE COMPLETE!', '#00ff88', '22px');
  }

  // ─── Update Loop ───────────────────────────────────────────────────────────

  update() {
    // Update ability cooldown bars and animations
    const now = Date.now();
    const abilities = ['battleCry', 'timeSlow', 'shield', 'chain'];
    const activeStates = {
      battleCry: this._battleCryActive,
      timeSlow: this._timeSlowActive,
      shield: this.upgradeManager.bonuses._shieldReady,
      chain: this.upgradeManager.bonuses._chainNext
    };
    
    abilities.forEach(ab => {
      const slot = this.abilitySlots[ab];
      const target = this.abilityWordTargets[ab];
      const wordLabel = this.abilityWordLabels[ab];
      if (!slot) return;
      const hasAbility = !!this.upgradeManager.abilities[ab];
      
      // Show/hide all slot elements
      slot.slotBg.setVisible(hasAbility);
      slot.slotIcon.setVisible(hasAbility);
      slot.cooldownBar.setVisible(hasAbility);
      slot.cooldownBarBg.setVisible(hasAbility);
      slot.glowRing.setVisible(hasAbility);
      slot.cooldownOverlay.setVisible(hasAbility);

      if (hasAbility) {
        const isReady = this.upgradeManager.isAbilityReady(ab, now);
        const isActive = activeStates[ab];
        const ratio = this.upgradeManager.getAbilityCooldownRatio(ab, now);
        
        // Update ability word target — avoid first-letter collision with active enemies
        let abilityWord = this.upgradeManager.getAbilityWord(ab);
        if (target && abilityWord && isReady && !isActive) {
          const enemyFirstChars = this.enemies
            .filter(e => e.alive && e.currentWord && e.currentWord.length > 0)
            .map(e => e.currentWord[0]);
          // If ability word's first char collides with any enemy word, refresh it
          if (enemyFirstChars.includes(abilityWord[0])) {
            // Try up to 5 times to find non-colliding word
            for (let attempt = 0; attempt < 5; attempt++) {
              this.upgradeManager.refreshAbilityWord(ab);
              abilityWord = this.upgradeManager.getAbilityWord(ab);
              if (!enemyFirstChars.includes(abilityWord[0])) break;
            }
          }
          target.setWord(abilityWord);
          target.setVisible(true);
        } else if (target) {
          target.setVisible(false);
        }
        
        // Background color based on state
        if (isActive) {
          // Active: bright pulsing
          slot.slotBg.setFillStyle(0x224466);
          slot.glowRing.setStrokeStyle(3, slot.glowRing.fillColor, 0.8);
          slot.cooldownOverlay.setFillStyle(0x000000, 0);
        } else if (isReady) {
          // Ready: green tint with glow
          slot.slotBg.setFillStyle(0x224422);
          slot.glowRing.setStrokeStyle(2, 0x44ff44, 0.6);
          slot.cooldownOverlay.setFillStyle(0x000000, 0);
          
          // Start pulse animation if not already running
          if (!slot.pulseTween) {
            slot.pulseTween = this.tweens.add({
              targets: [slot.glowRing],
              alpha: { from: 0.3, to: 0.8 },
              scaleX: { from: 1, to: 1.1 },
              scaleY: { from: 1, to: 1.1 },
              duration: 600,
              yoyo: true,
              repeat: -1,
              ease: 'Sine.easeInOut'
            });
          }
        } else {
          // Cooldown: dimmed
          slot.slotBg.setFillStyle(0x1a1a2e);
          slot.glowRing.setStrokeStyle(1, 0x333355, 0.2);
          slot.cooldownOverlay.setFillStyle(0x000000, 0.5);
          
          // Stop pulse animation
          if (slot.pulseTween) {
            slot.pulseTween.stop();
            slot.pulseTween = null;
          }
        }
        
        // Icon appearance
        slot.slotIcon.setAlpha(isReady || isActive ? 1 : 0.4);
        
        // Cooldown bar fills as it recharges
        slot.cooldownBar.width = 46 * ratio;
        slot.cooldownBar.setFillStyle(isReady ? 0x44ff44 : isActive ? 0xffcc00 : 0x4466aa);
      } else {
        // No ability: stop any running tweens and hide target
        if (slot.pulseTween) {
          slot.pulseTween.stop();
          slot.pulseTween = null;
        }
        if (target) {
          target.setVisible(false);
        }
      }
    });

    // Update typing indicator
    if (this.typingEngine?.lockedTarget && this.typingEngine?.typedSoFar) {
      this._updateTypingIndicator(this.typingEngine.typedSoFar);
    } else {
      this._updateTypingIndicator('');
    }
  }

  // ─── Cleanup ───────────────────────────────────────────────────────────────

  shutdown() {
    this.storyDialog?.destroy();
    this.typingEngine?.destroy();
    this.waveManager?.destroy();
    // Remove only the listeners this scene explicitly added
    this.events.off('WORD_COMPLETE', this._onWordComplete, this);
    this.events.off('COMBO_UPDATE', this._onComboUpdate, this);
    this.events.off('SPAWN_ENEMY', this._spawnEnemy, this);
    this.events.off('ENEMY_ATTACK', this._onEnemyAttack, this);
    this.events.off('ENEMY_DEAD', this._onEnemyDead, this);
    this.events.off('PLAYER_DEAD', this._onPlayerDead, this);
    this.events.off('WAVE_START', this._onWaveStart, this);
    this.events.off('WAVE_CLEAR', this._onWaveClear, this);
    this.events.off('ALL_WAVES_DONE', this._onAllWavesDone, this);
    this.events.off('SPECIAL_CHALLENGE', this._startSpecialChallenge, this);
  }
}
