
export class UpdateThrottler {
  private lastUpdates: { [key: string]: number } = {};

  shouldProcessUpdate(id: string): boolean {
    const now = Date.now();
    const lastUpdate = this.lastUpdates[id] || 0;
    
    // Implement exponential backoff for high-frequency updates
    const minUpdateInterval = Math.min(
      200 * Math.pow(2, Object.keys(this.lastUpdates).length), 
      2000
    );
    
    if (now - lastUpdate < minUpdateInterval) {
      console.log(`Update for id ${id} throttled`);
      return false;
    }
    
    this.lastUpdates[id] = now;
    return true;
  }

  cleanup(): void {
    const now = Date.now();
    const newCache: { [key: string]: number } = {};
    
    Object.entries(this.lastUpdates).forEach(([id, timestamp]) => {
      if (now - timestamp < 60000) { // Keep only last minute of updates
        newCache[id] = timestamp;
      }
    });
    
    this.lastUpdates = newCache;
  }
}
