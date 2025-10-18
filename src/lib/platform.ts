/**
 * 🎯 PLATAFORMA: Abstração para Web/Mobile
 * 
 * Este arquivo cria uma camada de compatibilidade entre Web e Mobile.
 * No futuro, ao converter para React Native, apenas este arquivo precisa ser atualizado.
 */

// ==========================================
// NAVEGAÇÃO
// ==========================================

export interface Navigation {
  push: (path: string) => void;
  replace: (path: string) => void;
  back: () => void;
  getCurrentPath: () => string;
}

/**
 * Hook de navegação cross-platform
 * Web: usa next/navigation
 * Mobile: usará React Navigation
 */
export function useNavigation(): Navigation {
  // WEB (Next.js)
  if (typeof window !== 'undefined') {
    return {
      push: (path: string) => {
        window.location.href = path;
      },
      replace: (path: string) => {
        window.location.replace(path);
      },
      back: () => {
        window.history.back();
      },
      getCurrentPath: () => {
        return window.location.pathname;
      }
    };
  }
  
  // MOBILE (React Native) - implementar no futuro
  // return {
  //   push: (path) => navigation.navigate(path),
  //   replace: (path) => navigation.replace(path),
  //   back: () => navigation.goBack(),
  //   getCurrentPath: () => navigation.getCurrentRoute()?.name || ''
  // };
  
  // Fallback
  return {
    push: () => {},
    replace: () => {},
    back: () => {},
    getCurrentPath: () => ''
  };
}

// ==========================================
// STORAGE
// ==========================================

export interface Storage {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
  removeItem: (key: string) => Promise<void>;
  clear: () => Promise<void>;
}

/**
 * Storage cross-platform
 * Web: localStorage
 * Mobile: AsyncStorage
 */
export const storage: Storage = {
  getItem: async (key: string) => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(key);
    }
    // Mobile: return AsyncStorage.getItem(key);
    return null;
  },
  
  setItem: async (key: string, value: string) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(key, value);
    }
    // Mobile: await AsyncStorage.setItem(key, value);
  },
  
  removeItem: async (key: string) => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(key);
    }
    // Mobile: await AsyncStorage.removeItem(key);
  },
  
  clear: async () => {
    if (typeof window !== 'undefined') {
      localStorage.clear();
    }
    // Mobile: await AsyncStorage.clear();
  }
};

// ==========================================
// CLIPBOARD
// ==========================================

export interface Clipboard {
  copy: (text: string) => Promise<boolean>;
  paste: () => Promise<string>;
}

/**
 * Clipboard cross-platform
 * Web: navigator.clipboard
 * Mobile: Expo Clipboard
 */
export const clipboard: Clipboard = {
  copy: async (text: string): Promise<boolean> => {
    if (typeof window !== 'undefined' && navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(text);
        return true;
      } catch {
        // Fallback
        const textArea = document.createElement("textarea");
        textArea.value = text;
        textArea.style.position = "absolute";
        textArea.style.left = "-9999px";
        document.body.appendChild(textArea);
        textArea.select();
        const successful = document.execCommand('copy');
        document.body.removeChild(textArea);
        return successful;
      }
    }
    // Mobile: await Clipboard.setStringAsync(text);
    return false;
  },
  
  paste: async (): Promise<string> => {
    if (typeof window !== 'undefined' && navigator.clipboard) {
      return await navigator.clipboard.readText();
    }
    // Mobile: return await Clipboard.getStringAsync();
    return '';
  }
};

// ==========================================
// PLATFORM DETECTION
// ==========================================

export const Platform = {
  OS: typeof window !== 'undefined' ? 'web' : 'unknown' as 'web' | 'ios' | 'android' | 'unknown',
  
  isWeb: typeof window !== 'undefined',
  isMobile: false, // Mobile: Platform.OS !== 'web'
  isIOS: false,     // Mobile: Platform.OS === 'ios'
  isAndroid: false, // Mobile: Platform.OS === 'android'
  
  select: <T,>(options: { web?: T; ios?: T; android?: T; native?: T; default?: T }): T | undefined => {
    if (typeof window !== 'undefined') {
      return options.web ?? options.default;
    }
    // Mobile: 
    // if (Platform.OS === 'ios') return options.ios ?? options.native ?? options.default;
    // if (Platform.OS === 'android') return options.android ?? options.native ?? options.default;
    return options.default;
  }
};

// ==========================================
// LINKING (Deep Links)
// ==========================================

export interface Linking {
  openURL: (url: string) => Promise<void>;
  canOpenURL: (url: string) => Promise<boolean>;
}

/**
 * Linking cross-platform
 * Web: window.open
 * Mobile: Linking (React Native)
 */
export const linking: Linking = {
  openURL: async (url: string) => {
    if (typeof window !== 'undefined') {
      window.open(url, '_blank');
    }
    // Mobile: await Linking.openURL(url);
  },
  
  canOpenURL: async (url: string): Promise<boolean> => {
    if (typeof window !== 'undefined') {
      return true; // Web sempre pode abrir URLs
    }
    // Mobile: return await Linking.canOpenURL(url);
    return false;
  }
};

// ==========================================
// DIMENSIONS
// ==========================================

export interface Dimensions {
  width: number;
  height: number;
}

/**
 * Dimensões da tela cross-platform
 */
export function useDimensions(): Dimensions {
  if (typeof window !== 'undefined') {
    return {
      width: window.innerWidth,
      height: window.innerHeight
    };
  }
  // Mobile: const {width, height} = Dimensions.get('window');
  return { width: 0, height: 0 };
}

// ==========================================
// PERMISSIONS (Câmera, Localização, etc)
// ==========================================

export type PermissionStatus = 'granted' | 'denied' | 'undetermined';

export interface Permissions {
  camera: () => Promise<PermissionStatus>;
  location: () => Promise<PermissionStatus>;
  notifications: () => Promise<PermissionStatus>;
}

/**
 * Permissões cross-platform
 */
export const permissions: Permissions = {
  camera: async (): Promise<PermissionStatus> => {
    if (typeof window !== 'undefined') {
      // Web: MediaDevices API
      try {
        const result = await navigator.permissions.query({ name: 'camera' as PermissionName });
        return result.state as PermissionStatus;
      } catch {
        return 'undetermined';
      }
    }
    // Mobile: const {status} = await Camera.requestPermissionsAsync();
    return 'undetermined';
  },
  
  location: async (): Promise<PermissionStatus> => {
    if (typeof window !== 'undefined') {
      try {
        const result = await navigator.permissions.query({ name: 'geolocation' });
        return result.state as PermissionStatus;
      } catch {
        return 'undetermined';
      }
    }
    // Mobile: const {status} = await Location.requestPermissionsAsync();
    return 'undetermined';
  },
  
  notifications: async (): Promise<PermissionStatus> => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      const permission = Notification.permission;
      if (permission === 'default') return 'undetermined';
      return permission as PermissionStatus;
    }
    // Mobile: const {status} = await Notifications.getPermissionsAsync();
    return 'undetermined';
  }
};
