// src/lib/annexes.ts

export const ANNEXE_DEFINITIONS_STORAGE_KEY = 'TRAPEL_FC_ANNEXE_DEFINITIONS_DATA';

export const getStoredAnnexeDefinitions = (): AnnexeDefinition[] => {
  if (typeof window === 'undefined') return [...INITIAL_ANNEXE_DEFINITIONS];
  
  const stored = localStorage.getItem(ANNEXE_DEFINITIONS_STORAGE_KEY);
  
  if (stored) {
    try {
      const parsed = JSON.parse(stored) as AnnexeDefinition[];
      if (Array.isArray(parsed) && parsed.every(item => item.id && item.village && item.lieu)) {
        return parsed.sort((a, b) => `${a.village} - ${a.lieu}`.localeCompare(`${b.village} - ${b.lieu}`));
      }
    } catch (e) {
      console.error("Failed to parse annexe definitions from localStorage", e);
    }
  }
  
  localStorage.setItem(ANNEXE_DEFINITIONS_STORAGE_KEY, JSON.stringify(INITIAL_ANNEXE_DEFINITIONS));
  return [...INITIAL_ANNEXE_DEFINITIONS].sort((a, b) => `${a.village} - ${a.lieu}`.localeCompare(`${b.village} - ${b.lieu}`));
};
