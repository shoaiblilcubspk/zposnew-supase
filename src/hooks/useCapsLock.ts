import { useSyncExternalStore } from 'react';

/**
 * Global Caps Lock State Singleton
 * Maintains synchronized Caps Lock state across all components, modals, and tabs.
 */
let globalCapsLock = false;
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((listener) => listener());
}

export function setGlobalCapsLock(value: boolean) {
  if (globalCapsLock !== value) {
    globalCapsLock = value;
    notify();
  }
}

export function getGlobalCapsLock(): boolean {
  return globalCapsLock;
}

function subscribe(callback: () => void) {
  listeners.add(callback);
  return () => {
    listeners.delete(callback);
  };
}

if (typeof window !== 'undefined') {
  const handleKeyboard = (e: KeyboardEvent) => {
    const isCapsKey = e.key === 'CapsLock' || e.code === 'CapsLock';
    if (isCapsKey) {
      if (e.type === 'keydown') {
        if (!e.repeat) {
          // Instant 0ms toggle on CapsLock key press.
          // Chromium/WebKit on macOS reports modifier state before the toggle on keydown.
          // Toggling immediately guarantees zero latency and instant visual response.
          setGlobalCapsLock(!globalCapsLock);
        }
      } else if (e.type === 'keyup') {
        if (typeof e.getModifierState === 'function') {
          setGlobalCapsLock(e.getModifierState('CapsLock'));
        }
      }
      return;
    }

    // Any other key (characters, digits, enter, backspace, etc.)
    if (typeof e.getModifierState === 'function') {
      setGlobalCapsLock(e.getModifierState('CapsLock'));
    }
  };

  const handlePointer = (e: MouseEvent | PointerEvent) => {
    if (typeof e.getModifierState === 'function') {
      setGlobalCapsLock(e.getModifierState('CapsLock'));
    }
  };

  // Capture phase to ensure detection before event propagation stops
  window.addEventListener('keydown', handleKeyboard, true);
  window.addEventListener('keyup', handleKeyboard, true);
  window.addEventListener('pointerdown', handlePointer, true);
  window.addEventListener('mousedown', handlePointer, true);
  window.addEventListener('click', handlePointer, true);
}

/**
 * Global Caps Lock Detection Hook
 * React 18 useSyncExternalStore provides tearing-free instant 0ms reactivity.
 */
export function useCapsLock(): boolean {
  return useSyncExternalStore(subscribe, getGlobalCapsLock, () => false);
}

