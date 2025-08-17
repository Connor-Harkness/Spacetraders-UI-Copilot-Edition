// Cross-platform storage implementation (Web only for now)
export class Storage {
  static async getItem(key: string): Promise<string | null> {
    return localStorage.getItem(key);
  }

  static async setItem(key: string, value: string): Promise<void> {
    localStorage.setItem(key, value);
  }

  static async removeItem(key: string): Promise<void> {
    localStorage.removeItem(key);
  }

  static async clear(): Promise<void> {
    localStorage.clear();
  }
}

// Rate limiter to respect API limits (max 2 req/second)
export class RateLimiter {
  private requests: number[] = [];
  private readonly maxRequests = 2;
  private readonly windowMs = 1000; // 1 second

  async waitForSlot(): Promise<void> {
    const now = Date.now();
    
    // Remove requests outside the current window
    this.requests = this.requests.filter(time => now - time < this.windowMs);
    
    // If we're at the limit, wait until we can make another request
    if (this.requests.length >= this.maxRequests) {
      const oldestRequest = Math.min(...this.requests);
      const waitTime = this.windowMs - (now - oldestRequest) + 10; // Add small buffer
      
      if (waitTime > 0) {
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
      
      return this.waitForSlot(); // Recursively check again
    }
    
    // Record this request
    this.requests.push(now);
  }
}

// Utility functions
export const formatCredits = (credits: number): string => {
  return credits.toLocaleString() + ' credits';
};

export const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleString();
};

export const getShipStatusColor = (status: string): string => {
  switch (status) {
    case 'DOCKED':
      return '#10B981'; // Green
    case 'IN_ORBIT':
      return '#F59E0B'; // Amber
    case 'IN_TRANSIT':
      return '#3B82F6'; // Blue
    default:
      return '#6B7280'; // Gray
  }
};

export const getShipStatusText = (status: string): string => {
  switch (status) {
    case 'DOCKED':
      return 'Docked';
    case 'IN_ORBIT':
      return 'In Orbit';
    case 'IN_TRANSIT':
      return 'In Transit';
    default:
      return status;
  }
};