/**
 * Haptic Feedback Utilities for Mobile
 * Provides tactile feedback for user interactions
 */

export const haptic = {
  /**
   * Light tap - for subtle interactions (hover, focus)
   */
  light: () => {
    if (typeof window !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate(10);
    }
  },

  /**
   * Medium tap - for button presses, selections
   */
  medium: () => {
    if (typeof window !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate(20);
    }
  },

  /**
   * Heavy tap - for important actions (delete, confirm)
   */
  heavy: () => {
    if (typeof window !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate(30);
    }
  },

  /**
   * Success pattern - for successful operations
   */
  success: () => {
    if (typeof window !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate([10, 50, 10]);
    }
  },

  /**
   * Error pattern - for failed operations
   */
  error: () => {
    if (typeof window !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate([50, 100, 50]);
    }
  },

  /**
   * Warning pattern - for warnings or confirmations needed
   */
  warning: () => {
    if (typeof window !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate([30, 50, 30, 50, 30]);
    }
  },

  /**
   * Notification pattern - for new notifications
   */
  notification: () => {
    if (typeof window !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate([10, 20, 10]);
    }
  }
};

/**
 * Check if haptic feedback is supported
 */
export const isHapticSupported = (): boolean => {
  return typeof window !== 'undefined' && 'vibrate' in navigator;
};
