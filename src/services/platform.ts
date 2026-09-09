/**
 * Platform detection and Desktop API helper service
 */

export function isElectron(): boolean {
  return typeof window !== 'undefined' && Boolean(window.desktopAPI?.isElectron);
}

export function isBrowser(): boolean {
  return !isElectron();
}

export function getDesktopAPI() {
  if (typeof window !== 'undefined' && window.desktopAPI) {
    return window.desktopAPI;
  }
  return null;
}

export function getPlatformName(): string {
  if (typeof window !== 'undefined' && window.desktopAPI?.platform) {
    return window.desktopAPI.platform;
  }
  if (typeof navigator !== 'undefined') {
    return navigator.platform;
  }
  return 'web';
}
