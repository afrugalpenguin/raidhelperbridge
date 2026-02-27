import { describe, it, expect, beforeEach } from 'vitest';
import { loadMappings, saveMapping, saveMappings } from '../characterMappings';

// Mock localStorage and window for node environment
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; },
    get length() { return Object.keys(store).length; },
    key: (index: number) => Object.keys(store)[index] ?? null,
  };
})();

// characterMappings.ts checks `typeof window === 'undefined'`, so we must define window
Object.defineProperty(globalThis, 'window', { value: globalThis, writable: true });
Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock, writable: true });

describe('characterMappings', () => {
  beforeEach(() => {
    localStorageMock.clear();
  });

  it('returns empty object when no mappings exist', () => {
    expect(loadMappings()).toEqual({});
  });

  it('saves and loads a mapping', () => {
    saveMapping('discord123', 'Frostbolt');
    const mappings = loadMappings();
    expect(mappings['discord123']).toBe('Frostbolt');
  });

  it('removes mapping when name is empty', () => {
    saveMapping('discord123', 'Frostbolt');
    saveMapping('discord123', '');
    expect(loadMappings()['discord123']).toBeUndefined();
  });

  it('removes mapping when name is whitespace', () => {
    saveMapping('discord123', 'Frostbolt');
    saveMapping('discord123', '   ');
    expect(loadMappings()['discord123']).toBeUndefined();
  });

  it('preserves multiple mappings', () => {
    saveMapping('d1', 'Player1');
    saveMapping('d2', 'Player2');
    const mappings = loadMappings();
    expect(mappings['d1']).toBe('Player1');
    expect(mappings['d2']).toBe('Player2');
  });

  it('handles corrupted localStorage gracefully', () => {
    localStorageMock.setItem('rhb-character-mappings', 'not-json');
    expect(loadMappings()).toEqual({});
  });
});
