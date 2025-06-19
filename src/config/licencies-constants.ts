
// src/config/licencies-constants.ts

export const REFERENCE_YEAR_STORAGE_KEY = 'TRAPEL_FC_REFERENCE_YEAR_SETTING';
const DEFAULT_FALLBACK_REFERENCE_YEAR = new Date().getFullYear() + 1;

export function getActiveReferenceYear(): number {
  if (typeof window === 'undefined') {
    return DEFAULT_FALLBACK_REFERENCE_YEAR;
  }
  const storedYear = localStorage.getItem(REFERENCE_YEAR_STORAGE_KEY);
  if (storedYear) {
    const year = parseInt(storedYear, 10);
    if (!isNaN(year) && year > 1900 && year < 2200) {
      return year;
    }
  }
  // If no valid year in localStorage, set and return the default
  localStorage.setItem(REFERENCE_YEAR_STORAGE_KEY, DEFAULT_FALLBACK_REFERENCE_YEAR.toString());
  return DEFAULT_FALLBACK_REFERENCE_YEAR;
}

export function setActiveReferenceYear(year: number): void {
  if (typeof window === 'undefined') {
    return;
  }
  localStorage.setItem(REFERENCE_YEAR_STORAGE_KEY, year.toString());
  window.dispatchEvent(new StorageEvent('storage', { key: REFERENCE_YEAR_STORAGE_KEY, newValue: year.toString() }));
}

export function getSeasonLabel(referenceYear: number): string {
  const startYear = referenceYear - 1;
  const endYearShort = referenceYear.toString().substring(2);
  return `Saison ${startYear}-${endYearShort}`;
}

export const AGE_BASED_CATEGORY_RULES = [
  { ages: [5, 6], baseId: 'U6-U7', labelPrefix: 'U6-U7' },
  { ages: [7, 8], baseId: 'U8-U9', labelPrefix: 'U8-U9' },
  { ages: [9, 10], baseId: 'U10-U11', labelPrefix: 'U10-U11' },
  { ages: [11, 12], baseId: 'U12-U13', labelPrefix: 'U12-U13' },
  { ages: [13, 14], baseId: 'U14-U15', labelPrefix: 'U14-U15' },
  { ages: [15, 16], baseId: 'U16-U17', labelPrefix: 'U16-U17' },
  { ages: [17, 18], baseId: 'U18-U19', labelPrefix: 'U18-U19' },
  { ageMin: 19, baseId: 'Seniors', labelPrefix: 'Seniors' },
] as const;

export type ManualCategoryDefinition = { id: string; label: string; color?: string };

export const INITIAL_MANUAL_CATEGORIES_DEFINITIONS: ManualCategoryDefinition[] = [
  { id: 'Dirigeant', label: 'Dirigeant', color: '#A1A1AA' }, // zinc-400
  { id: 'Educateur', label: 'Educateur', color: '#71717A' }, // zinc-500
  { id: 'Vétéran', label: 'Vétéran', color: '#3B82F6' },   // blue-500
] as const;

export const MANUAL_CATEGORY_DEFINITIONS_STORAGE_KEY = 'TRAPEL_FC_MANUAL_CATEGORY_DEFINITIONS';
export const CATEGORY_COLORS_STORAGE_KEY = 'TRAPEL_FC_CATEGORY_COLORS_DATA';

// Default color palette for age-based categories if no custom color is set
const DEFAULT_AGE_CATEGORY_COLORS = [
  '#FBBF24', // amber-400
  '#34D399', // emerald-400
  '#60A5FA', // blue-400
  '#F472B6', // pink-400
  '#A78BFA', // violet-400
  '#2DD4BF', // teal-400
  '#FDE047', // yellow-300
  '#A3E635', // lime-400
  '#FB923C', // orange-400
  '#7DD3FC', // light-blue-300
  '#BAE6FD', // sky-300
  '#D8B4FE', // purple-300
  '#FBCFE8', // pink-300
  '#FCA5A5', // red-300
  '#BEF264', // lime-300
  '#6EE7B7', // emerald-300
];


export const getStoredManualCategoryDefinitions = (): ManualCategoryDefinition[] => {
  if (typeof window === 'undefined') return [...INITIAL_MANUAL_CATEGORIES_DEFINITIONS];
  const stored = localStorage.getItem(MANUAL_CATEGORY_DEFINITIONS_STORAGE_KEY);
  if (stored) {
    try {
      const parsed = JSON.parse(stored) as ManualCategoryDefinition[];
      if (Array.isArray(parsed) && parsed.every(item => typeof item.id === 'string' && typeof item.label === 'string')) {
        // Ensure existing definitions also have the color property even if it's undefined
        return parsed.map(item => ({ ...item, color: item.color || undefined }));
      }
    } catch (e) {
      console.error("Failed to parse manual category definitions from localStorage", e);
    }
  }
  const initialDefinitions = [...INITIAL_MANUAL_CATEGORIES_DEFINITIONS];
  localStorage.setItem(MANUAL_CATEGORY_DEFINITIONS_STORAGE_KEY, JSON.stringify(initialDefinitions));
  return initialDefinitions;
};

export const saveStoredManualCategoryDefinitions = (definitions: ManualCategoryDefinition[]) => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(MANUAL_CATEGORY_DEFINITIONS_STORAGE_KEY, JSON.stringify(definitions));
  window.dispatchEvent(new StorageEvent('storage', { key: MANUAL_CATEGORY_DEFINITIONS_STORAGE_KEY, newValue: JSON.stringify(definitions) }));
};

export const getStoredCategoryColors = (): Record<string, string> => {
  if (typeof window === 'undefined') return {}; // Return empty object on server
  const stored = localStorage.getItem(CATEGORY_COLORS_STORAGE_KEY);
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      if (typeof parsed === 'object' && parsed !== null) {
        return parsed as Record<string, string>;
      }
    } catch (e) {
      console.error("Failed to parse category colors from localStorage", e);
    }
  }
  return {};
};

export const saveStoredCategoryColors = (colors: Record<string, string>) => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(CATEGORY_COLORS_STORAGE_KEY, JSON.stringify(colors));
  window.dispatchEvent(new StorageEvent('storage', { key: CATEGORY_COLORS_STORAGE_KEY, newValue: JSON.stringify(colors) }));
};


export type CategoryConfigItem = {
  id: string;
  label: string;
  color?: string;
  isManual: boolean;
};

let ageCategoryColorIndex = 0; // To cycle through default colors

export const getGeneratedCategoriesConfig = (referenceYear: number): CategoryConfigItem[] => {
  const customColors = typeof window !== 'undefined' ? getStoredCategoryColors() : {};
  const storedManualDefs = typeof window !== 'undefined' ? getStoredManualCategoryDefinitions() : [...INITIAL_MANUAL_CATEGORIES_DEFINITIONS];
  
  ageCategoryColorIndex = 0; // Reset index for each generation to maintain consistency if rules change

  const generatedAgeCategories: CategoryConfigItem[] = AGE_BASED_CATEGORY_RULES.flatMap(rule => {
    let ageRangeLabel = '';
    if ('ages' in rule) {
      const birthYear1 = referenceYear - rule.ages[0];
      const birthYear2 = referenceYear - rule.ages[1];
      const sortedYears = [birthYear1, birthYear2].sort((a, b) => a - b);
      ageRangeLabel = `(Né en ${sortedYears[0]} ou ${sortedYears[1]})`;
    } else if ('ageMin' in rule) {
      const birthYear = referenceYear - rule.ageMin;
      ageRangeLabel = `(Né avant ou en ${birthYear})`;
    }
    
    const baseLabel = `${rule.labelPrefix}`;
    const idG = `${rule.baseId} G`;
    const idF = `${rule.baseId} F`;

    const colorG = customColors[idG] || DEFAULT_AGE_CATEGORY_COLORS[ageCategoryColorIndex++ % DEFAULT_AGE_CATEGORY_COLORS.length];
    const colorF = customColors[idF] || DEFAULT_AGE_CATEGORY_COLORS[ageCategoryColorIndex++ % DEFAULT_AGE_CATEGORY_COLORS.length];

    return [
      { id: idG, label: `${baseLabel} Garçons ${ageRangeLabel}`, color: colorG, isManual: false },
      { id: idF, label: `${baseLabel} Filles ${ageRangeLabel}`, color: colorF, isManual: false },
    ];
  });

  const manualCategoryEntries: CategoryConfigItem[] = storedManualDefs.map(catDef => ({
    id: catDef.id,
    label: catDef.label,
    // Priority: Custom color > Default color from definition
    color: customColors[catDef.id] || catDef.color,
    isManual: true,
  }));

  return [
    ...generatedAgeCategories,
    ...manualCategoryEntries,
  ].sort((a, b) => {
    const isAManual = storedManualDefs.some(mc => mc.id === a.id);
    const isBManual = storedManualDefs.some(mc => mc.id === b.id);

    if (!isAManual && isBManual) return -1;
    if (isAManual && !isBManual) return 1;
    return a.label.localeCompare(b.label);
  });
};

export type CategoryId = ReturnType<typeof getGeneratedCategoriesConfig>[number]['id'];

export const PACK_OPTIONS_STORAGE_KEY = 'TRAPEL_FC_ADMIN_LIST_LICENSEE_PACKS';

export const INITIAL_PACK_OPTIONS = [
  "Pack 1 - 140€",
  "Pack 2 - 160€",
  "Pack 3 - 160€",
  "Pack 4 - 190€",
  "Pack 5 - 220€",
  "Loisir - 50€",
  "Dirigeant - 30€",
  "Educateur - 30€",
  "Vétéran - 100€",
] as const;

export type PackChoisiId = typeof INITIAL_PACK_OPTIONS[number];
