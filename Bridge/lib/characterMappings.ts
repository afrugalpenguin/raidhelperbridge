const STORAGE_KEY = 'rhb-character-mappings';

interface StoredMapping {
  [discordId: string]: string;
}

export function loadMappings(): StoredMapping {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function saveMappings(mappings: StoredMapping): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(mappings));
  } catch {
    // localStorage full or unavailable
  }
}

export function saveMapping(discordId: string, wowCharacter: string): void {
  const mappings = loadMappings();
  if (wowCharacter.trim()) {
    mappings[discordId] = wowCharacter.trim();
  } else {
    delete mappings[discordId];
  }
  saveMappings(mappings);
}
