// UpgradeManager — Tracks active upgrades and exposes bonus state

import { getRandomUpgrades } from '../data/upgrades.js';
import { getRandomAbilityWord } from '../data/words.js';

export class UpgradeManager {
  constructor() {
    this.ownedIds = ['word_shield']; // Start with shield ability
    this.state = {
      player: { armor: 0 },
      bonuses: {
        longWordDamage: 1,
        shortWordStun: false,
        spellweave: false,
        echoStrike: false,
        timeWarp: false,
        bloodType: false,
        bloodTypeCharges: 0,
        alphaburst: false,
        alphaburstIdx: 0,
        berserker: false,
        keenEye: false,
        comboCap: 25,
        wordLengthReduction: 0,
        tempHPBonus: 0,
        arcaneSurge: false
      },
      abilities: {
        // Start with shield ability unlocked
        shield: { cooldown: 20000, ready: true, lastUsed: 0 }
      }
    };
    
    // Current ability words (random, change after each use)
    this.abilityWords = {};
    this._refreshAbilityWords();
  }
  
  // Generate random words for all owned abilities
  _refreshAbilityWords() {
    const abilities = ['battleCry', 'timeSlow', 'shield', 'chain'];
    abilities.forEach(ab => {
      if (this.state.abilities[ab]) {
        this.abilityWords[ab] = getRandomAbilityWord(ab);
      }
    });
  }
  
  // Get current word for an ability
  getAbilityWord(abilityName) {
    return this.abilityWords[abilityName] || null;
  }
  
  // Regenerate word for a specific ability after use
  refreshAbilityWord(abilityName) {
    if (this.state.abilities[abilityName]) {
      this.abilityWords[abilityName] = getRandomAbilityWord(abilityName);
    }
  }
  
  // Check if a word matches any ability and return the ability name
  matchAbilityWord(word) {
    const abilities = ['battleCry', 'timeSlow', 'shield', 'chain'];
    for (const ab of abilities) {
      if (this.state.abilities[ab] && this.abilityWords[ab] === word.toUpperCase()) {
        return ab;
      }
    }
    return null;
  }

  applyUpgrade(upgrade) {
    if (this.ownedIds.includes(upgrade.id)) return;
    this.ownedIds.push(upgrade.id);
    upgrade.apply(this.state);
    
    // If this is an ability upgrade, generate a word for it
    if (upgrade.id === 'word_shield' || upgrade.id === 'chain_lightning' || 
        upgrade.id === 'battle_cry' || upgrade.id === 'time_slow_ability') {
      this._refreshAbilityWords();
    }
  }

  getRandomChoices() {
    return getRandomUpgrades(this.ownedIds, 3);
  }

  get bonuses() { return this.state.bonuses; }
  get abilities() { return this.state.abilities; }
  get playerStats() { return this.state.player; }

  // Apply upgrade effects to damage calculation
  calcDamage(baseDmg, word, perfect, cps, avgCps, lastWord, combo) {
    let dmg = baseDmg;

    // Long word bonus
    if (word.length >= 6) {
      dmg *= this.state.bonuses.longWordDamage;
    }

    // Echo strike
    if (this.state.bonuses.echoStrike && word === lastWord) {
      dmg *= 1.5;
    }

    // Alphaburst check happens separately in scene

    // Tier multiplier already applied in caller
    return Math.floor(dmg);
  }

  // Check if ability is ready
  isAbilityReady(name, now) {
    const ab = this.state.abilities[name];
    if (!ab) return false;
    return now - (ab.lastUsed || 0) >= ab.cooldown;
  }

  useAbility(name, now) {
    const ab = this.state.abilities[name];
    if (!ab) return false;
    ab.lastUsed = now;
    ab.ready = false;
    return true;
  }

  // Get cooldown ratio 0–1 for HUD display
  getAbilityCooldownRatio(name, now) {
    const ab = this.state.abilities[name];
    if (!ab) return 1;
    const elapsed = now - (ab.lastUsed || 0);
    return Math.min(elapsed / ab.cooldown, 1);
  }

  reset() {
    this.ownedIds = ['word_shield']; // Start with shield ability
    this.state = {
      player: { armor: 0 },
      bonuses: {
        longWordDamage: 1,
        shortWordStun: false,
        spellweave: false,
        echoStrike: false,
        timeWarp: false,
        bloodType: false,
        bloodTypeCharges: 0,
        alphaburst: false,
        alphaburstIdx: 0,
        berserker: false,
        keenEye: false,
        comboCap: 25,
        wordLengthReduction: 0,
        tempHPBonus: 0,
        arcaneSurge: false
      },
      abilities: {
        // Start with shield ability unlocked
        shield: { cooldown: 20000, ready: true, lastUsed: 0 }
      }
    };
    this.abilityWords = {};
    this._refreshAbilityWords();
  }
}
