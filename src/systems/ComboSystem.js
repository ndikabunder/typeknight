// ComboSystem — Tracks combo streak and damage multipliers

export class ComboSystem {
  constructor(scene) {
    this.scene = scene;
    this.count = 0;
    this.cap = 25;       // upgradeable
    this.maxSeen = 0;
    this._onBreak = null;
  }

  increment() {
    this.count = Math.min(this.count + 1, this.cap);
    this.maxSeen = Math.max(this.maxSeen, this.count);
    this.scene.events.emit('COMBO_UPDATE', { count: this.count });
  }

  break() {
    if (this.count > 0) {
      this.count = 0;
      this.scene.events.emit('COMBO_UPDATE', { count: 0 });
    }
  }

  // Returns damage multiplier based on current combo
  // Every 5 combos adds +10%, max +50% (or +100% with upgrade)
  getDamageMultiplier() {
    const steps = Math.floor(this.count / 5);
    return 1 + steps * 0.10;
  }

  setCap(cap) {
    this.cap = cap;
  }

  reset() {
    this.count = 0;
    this.maxSeen = 0;
  }
}
