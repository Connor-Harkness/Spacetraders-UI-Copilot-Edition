// Mobile-specific storage implementation using AsyncStorage
import AsyncStorage from '@react-native-async-storage/async-storage';

export class MobileStorage {
  static async getItem(key: string): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(key);
    } catch (error) {
      console.error('Failed to get item from AsyncStorage:', error);
      return null;
    }
  }

  static async setItem(key: string, value: string): Promise<void> {
    try {
      await AsyncStorage.setItem(key, value);
    } catch (error) {
      console.error('Failed to set item in AsyncStorage:', error);
    }
  }

  static async removeItem(key: string): Promise<void> {
    try {
      await AsyncStorage.removeItem(key);
    } catch (error) {
      console.error('Failed to remove item from AsyncStorage:', error);
    }
  }

  static async clear(): Promise<void> {
    try {
      await AsyncStorage.clear();
    } catch (error) {
      console.error('Failed to clear AsyncStorage:', error);
    }
  }

  static async multiGet(keys: string[]): Promise<[string, string | null][]> {
    try {
      return await AsyncStorage.multiGet(keys);
    } catch (error) {
      console.error('Failed to get multiple items from AsyncStorage:', error);
      return keys.map(key => [key, null]);
    }
  }

  static async multiSet(keyValuePairs: [string, string][]): Promise<void> {
    try {
      await AsyncStorage.multiSet(keyValuePairs);
    } catch (error) {
      console.error('Failed to set multiple items in AsyncStorage:', error);
    }
  }
}

// Touch-optimized utility functions
export const TouchUtils = {
  // Minimum touch target size (44x44 points for iOS, 48x48 dp for Android)
  minTouchTarget: 44,
  
  // Touch feedback delays
  feedbackDelay: 50,
  
  // Gesture thresholds
  swipeThreshold: 50,
  longPressDelay: 500,
  
  // Calculate if a touch target meets accessibility guidelines
  isTouchTargetAccessible: (width: number, height: number): boolean => {
    return width >= TouchUtils.minTouchTarget && height >= TouchUtils.minTouchTarget;
  },
  
  // Add haptic feedback (iOS specific, graceful fallback for Android)
  hapticFeedback: (type: 'light' | 'medium' | 'heavy' = 'light') => {
    // In a real React Native app, you would use:
    // import { Haptics } from 'expo-haptics';
    // Haptics.impactAsync(Haptics.ImpactFeedbackStyle[type.charAt(0).toUpperCase() + type.slice(1)]);
    console.log(`Haptic feedback: ${type}`);
  },
  
  // Calculate if swipe gesture threshold is met
  isSwipeGesture: (deltaX: number, deltaY: number): boolean => {
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    return distance >= TouchUtils.swipeThreshold;
  }
};

// Mobile-specific dimension utilities
export const MobileScreen = {
  // Common mobile breakpoints
  breakpoints: {
    small: 320,   // iPhone SE
    medium: 375,  // iPhone 12
    large: 414,   // iPhone 12 Pro Max
    tablet: 768   // iPad
  },
  
  // Check if device is likely a tablet
  isTablet: (screenWidth: number): boolean => {
    return screenWidth >= MobileScreen.breakpoints.tablet;
  },
  
  // Get responsive font sizes
  getFontSize: (baseSize: number, screenWidth: number): number => {
    if (screenWidth >= MobileScreen.breakpoints.tablet) {
      return baseSize * 1.2;
    }
    if (screenWidth <= MobileScreen.breakpoints.small) {
      return baseSize * 0.9;
    }
    return baseSize;
  },
  
  // Get responsive spacing
  getSpacing: (baseSpacing: number, screenWidth: number): number => {
    if (screenWidth >= MobileScreen.breakpoints.tablet) {
      return baseSpacing * 1.5;
    }
    if (screenWidth <= MobileScreen.breakpoints.small) {
      return baseSpacing * 0.8;
    }
    return baseSpacing;
  }
};

// Offline capability utilities
export const OfflineUtils = {
  // Queue for offline actions
  actionQueue: [] as Array<{
    id: string;
    action: string;
    payload: any;
    timestamp: Date;
    retries: number;
  }>,
  
  // Add action to offline queue
  queueAction: (action: string, payload: any) => {
    const queueItem = {
      id: `offline_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      action,
      payload,
      timestamp: new Date(),
      retries: 0
    };
    
    OfflineUtils.actionQueue.push(queueItem);
    OfflineUtils.saveQueue();
  },
  
  // Process queued actions when back online
  processQueue: async (apiClient: any) => {
    const queue = [...OfflineUtils.actionQueue];
    OfflineUtils.actionQueue = [];
    
    for (const item of queue) {
      try {
        // Process each queued action
        console.log(`Processing offline action: ${item.action}`, item.payload);
        // In a real implementation, you would dispatch the action using the API client
        
        // Example:
        // await apiClient[item.action](item.payload);
        
      } catch (error) {
        console.error('Failed to process offline action:', error);
        
        // Re-queue if retries available
        if (item.retries < 3) {
          item.retries++;
          OfflineUtils.actionQueue.push(item);
        }
      }
    }
    
    OfflineUtils.saveQueue();
  },
  
  // Save queue to storage
  saveQueue: async () => {
    try {
      await MobileStorage.setItem('offline_action_queue', JSON.stringify(OfflineUtils.actionQueue));
    } catch (error) {
      console.error('Failed to save offline queue:', error);
    }
  },
  
  // Load queue from storage
  loadQueue: async () => {
    try {
      const queueData = await MobileStorage.getItem('offline_action_queue');
      if (queueData) {
        OfflineUtils.actionQueue = JSON.parse(queueData).map((item: any) => ({
          ...item,
          timestamp: new Date(item.timestamp)
        }));
      }
    } catch (error) {
      console.error('Failed to load offline queue:', error);
    }
  },
  
  // Clear old queued actions (older than 7 days)
  clearOldActions: () => {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    OfflineUtils.actionQueue = OfflineUtils.actionQueue.filter(
      item => item.timestamp > sevenDaysAgo
    );
    OfflineUtils.saveQueue();
  }
};

// Mobile-specific rate limiter that accounts for network conditions
export class MobileRateLimiter {
  private requests: number[] = [];
  private readonly maxRequests = 2;
  private readonly windowMs = 1000;
  private isSlowNetwork = false;

  setNetworkCondition(isSlowNetwork: boolean) {
    this.isSlowNetwork = isSlowNetwork;
  }

  async waitForSlot(): Promise<void> {
    const now = Date.now();
    
    // Adjust rate limiting for slow networks
    const effectiveMaxRequests = this.isSlowNetwork ? 1 : this.maxRequests;
    const effectiveWindowMs = this.isSlowNetwork ? this.windowMs * 2 : this.windowMs;
    
    // Remove requests outside the current window
    this.requests = this.requests.filter(time => now - time < effectiveWindowMs);
    
    // If we're at the limit, wait until we can make another request
    if (this.requests.length >= effectiveMaxRequests) {
      const oldestRequest = Math.min(...this.requests);
      const waitTime = effectiveWindowMs - (now - oldestRequest) + 10;
      
      if (waitTime > 0) {
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
      
      return this.waitForSlot();
    }
    
    // Record this request
    this.requests.push(now);
  }
}