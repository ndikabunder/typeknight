// StoryManager — Handles story narration and chapter progression

import storyData from '../../data/story.json';

export class StoryManager {
  constructor() {
    this.story = storyData;
    this.currentChapter = 0;
    this.hasSeenPrologue = false;
    this.midShown = false;
  }

  // Get prologue data
  getPrologue() {
    return this.story.prologue;
  }

  // Get epilogue data
  getEpilogue() {
    return this.story.epilogue;
  }

  // Get chapter by arena ID
  getChapterByArenaId(arenaId) {
    return this.story.chapters.find(ch => ch.arena_id === arenaId);
  }

  // Get current chapter
  getCurrentChapter() {
    return this.story.chapters[this.currentChapter];
  }

  // Advance to next chapter
  advanceChapter() {
    if (this.currentChapter < this.story.chapters.length - 1) {
      this.currentChapter++;
      this.midShown = false;
      return true;
    }
    return false; // No more chapters
  }

  // Check if this is the last chapter
  isLastChapter() {
    return this.currentChapter >= this.story.chapters.length - 1;
  }

  // Get world info
  getWorld() {
    return this.story.world;
  }

  // Get character info
  getCharacter(charId) {
    return this.story.characters[charId];
  }

  // Mark mid narration as shown
  markMidShown() {
    this.midShown = true;
  }

  // Check if mid narration was shown
  wasMidShown() {
    return this.midShown;
  }

  // Reset for new game
  reset() {
    this.currentChapter = 0;
    this.hasSeenPrologue = false;
    this.midShown = false;
  }

  // Get total chapters
  getTotalChapters() {
    return this.story.chapters.length;
  }
}

// Singleton instance
export const storyManager = new StoryManager();
