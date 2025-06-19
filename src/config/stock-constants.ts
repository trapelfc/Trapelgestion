
// src/config/stock-constants.ts

export const APPAREL_SIZES = ["6 ans", "8 ans", "10 ans", "12 ans", "14 ans", "XS", "S", "M", "L", "XL", "XXL"] as const;
export type ApparelSize = typeof APPAREL_SIZES[number];

export const SOCK_SIZES = ["27-30", "31-34", "35-37", "38-39", "40-41", "42-43", "44-46", "47-50"] as const;
export type SockSize = typeof SOCK_SIZES[number];

export const FOOD_LOCATIONS = ["Villemoustoussou", "Villegailhenc", "Pennautier", "Malves"] as const;
export type FoodLocation = typeof FOOD_LOCATIONS[number];

export const SPORTIF_LOCATIONS = ["Villemoustoussou", "Villegailhenc", "Pennautier", "Malves", "Reserve"] as const;
export type SportifLocation = typeof SPORTIF_LOCATIONS[number];

export interface FoodSupplierDetail {
  id: string;
  name: string;
  contactName?: string;
  email?: string;
  phone?: string;
}

export const INITIAL_FOOD_SUPPLIERS: FoodSupplierDetail[] = [
  { id: crypto.randomUUID(), name: "Utile", contactName: "", email: "", phone: "" },
  { id: crypto.randomUUID(), name: "Pizza Bella", contactName: "", email: "", phone: "" },
  { id: crypto.randomUUID(), name: "Negre", contactName: "", email: "", phone: "" },
  { id: crypto.randomUUID(), name: "Promocash", contactName: "", email: "", phone: "" },
  { id: crypto.randomUUID(), name: "Boulangerie", contactName: "", email: "", phone: "" },
  { id: crypto.randomUUID(), name: "Occitane fruits", contactName: "", email: "", phone: "" },
  { id: crypto.randomUUID(), name: "Intersport", contactName: "", email: "", phone: "" },
].sort((a,b) => a.name.localeCompare(b.name));

export const FOOD_SUPPLIERS = INITIAL_FOOD_SUPPLIERS.map(s => s.name) as readonly string[];
export type FoodSupplier = typeof FOOD_SUPPLIERS[number];


export const ITEM_CATEGORIES_CHOICES = [
  { id: 'apparel', label: 'Vêtement (Tailles standard)' },
  { id: 'socks', label: 'Chaussettes (Tailles spécifiques)' },
  { id: 'food', label: 'Nourriture/Boisson (Par Lieu)' },
  { id: 'sportif', label: 'Matériel Sportif (Par Lieu)' },
  { id: 'standard', label: 'Standard (Quantité unique)' },
] as const;
export type ItemCategoryChoice = typeof ITEM_CATEGORIES_CHOICES[number]['id'];

export const INITIAL_STOCK_EQUIPEMENTS = [
  { id: 'eq1', name: '1/4 Zippé Noir', lastUpdated: new Date(), quantity: 0, itemCategory: 'apparel', hasSizeVariants: true, availableSizes: APPAREL_SIZES, sizeBreakdown: APPAREL_SIZES.reduce((acc, size) => ({ ...acc, [size]: 0 }), {}) },
  { id: 'eq2', name: 'Bas survetement', lastUpdated: new Date(), quantity: 0, itemCategory: 'apparel', hasSizeVariants: true, availableSizes: APPAREL_SIZES, sizeBreakdown: APPAREL_SIZES.reduce((acc, size) => ({ ...acc, [size]: 0 }), {}) },
  { id: 'eq3', name: 'Chaussette', lastUpdated: new Date(), quantity: 0, itemCategory: 'socks', hasSizeVariants: true, availableSizes: SOCK_SIZES, sizeBreakdown: SOCK_SIZES.reduce((acc, size) => ({ ...acc, [size]: 0 }), {}) },
  { id: 'eq4', name: 'Doudoune', lastUpdated: new Date(), quantity: 0, itemCategory: 'apparel', hasSizeVariants: true, availableSizes: APPAREL_SIZES, sizeBreakdown: APPAREL_SIZES.reduce((acc, size) => ({ ...acc, [size]: 0 }), {}) },
  { id: 'eq5', name: 'Maillot Bleu', lastUpdated: new Date(), quantity: 0, itemCategory: 'apparel', hasSizeVariants: true, availableSizes: APPAREL_SIZES, sizeBreakdown: APPAREL_SIZES.reduce((acc, size) => ({ ...acc, [size]: 0 }), {}) },
  { id: 'eq6', name: 'Sac a dos bleu/noir', lastUpdated: new Date(), quantity: 0, itemCategory: 'standard', standardItemDesignatedSection: 'equipement', hasSizeVariants: false },
  { id: 'eq7', name: 'Sac a dos XL', lastUpdated: new Date(), quantity: 0, itemCategory: 'standard', standardItemDesignatedSection: 'equipement', hasSizeVariants: false },
  { id: 'eq8', name: 'Sac de sport M', lastUpdated: new Date(), quantity: 0, itemCategory: 'standard', standardItemDesignatedSection: 'equipement', hasSizeVariants: false },
  { id: 'eq9', name: 'Short', lastUpdated: new Date(), quantity: 0, itemCategory: 'apparel', hasSizeVariants: true, availableSizes: APPAREL_SIZES, sizeBreakdown: APPAREL_SIZES.reduce((acc, size) => ({ ...acc, [size]: 0 }), {}) },
  { id: 'eq10', name: 'Tee-shirt Noir', lastUpdated: new Date(), quantity: 0, itemCategory: 'apparel', hasSizeVariants: true, availableSizes: APPAREL_SIZES, sizeBreakdown: APPAREL_SIZES.reduce((acc, size) => ({ ...acc, [size]: 0 }), {}) },
  { id: 'eq11', name: 'Veste survetement', lastUpdated: new Date(), quantity: 0, itemCategory: 'apparel', hasSizeVariants: true, availableSizes: APPAREL_SIZES, sizeBreakdown: APPAREL_SIZES.reduce((acc, size) => ({ ...acc, [size]: 0 }), {}) },
].sort((a, b) => a.name.localeCompare(b.name));

import type { PackChoisiId } from '@/config/licencies-constants';

export type PackItemDetail = {
  articleName: string;
  isChoice?: boolean;
  options?: string[];
};

export const PACK_COMPOSITIONS: Record<PackChoisiId, PackItemDetail[]> = {
  "Pack 1 - 140€": [
    { articleName: "Veste survetement" },
    { articleName: "Sac a dos bleu/noir" },
    { articleName: "Maillot Bleu OU Tee-shirt Noir", isChoice: true, options: ["Maillot Bleu", "Tee-shirt Noir"] },
    { articleName: "Chaussette" },
  ],
  "Pack 2 - 160€": [
    { articleName: "Veste survetement" },
    { articleName: "Sac a dos bleu/noir" },
    { articleName: "Maillot Bleu OU Tee-shirt Noir", isChoice: true, options: ["Maillot Bleu", "Tee-shirt Noir"] },
    { articleName: "Chaussette" },
    { articleName: "Bas survetement" },
    { articleName: "Short" },
  ],
  "Pack 3 - 160€": [
    { articleName: "Veste survetement" },
    { articleName: "Sac a dos XL OU Sac de sport M", isChoice: true, options: ["Sac a dos XL", "Sac de sport M"] },
    { articleName: "Maillot Bleu OU Tee-shirt Noir", isChoice: true, options: ["Maillot Bleu", "Tee-shirt Noir"] },
    { articleName: "Chaussette" },
    { articleName: "1/4 Zippé Noir" },
  ],
  "Pack 4 - 190€": [
    { articleName: "Veste survetement" },
    { articleName: "Sac a dos bleu/noir" },
    { articleName: "Maillot Bleu OU Tee-shirt Noir", isChoice: true, options: ["Maillot Bleu", "Tee-shirt Noir"] },
    { articleName: "Chaussette" },
    { articleName: "Doudoune" },
  ],
  "Pack 5 - 220€": [
    { articleName: "Veste survetement" },
    { articleName: "Sac a dos XL OU Sac de sport M", isChoice: true, options: ["Sac a dos XL", "Sac de sport M"] },
    { articleName: "Maillot Bleu OU Tee-shirt Noir", isChoice: true, options: ["Maillot Bleu", "Tee-shirt Noir"] },
    { articleName: "Chaussette" },
    { articleName: "Doudoune" },
    { articleName: "1/4 Zippé Noir" },
  ],
  "Loisir - 50€": [
    { articleName: "Chaussette" },
    { articleName: "Maillot Bleu" },
  ],
  "Dirigeant - 30€": [
    { articleName: "Veste survetement" },
    { articleName: "Maillot Bleu OU Tee-shirt Noir", isChoice: true, options: ["Maillot Bleu", "Tee-shirt Noir"] },
  ],
  "Educateur - 30€": [
    { articleName: "Veste survetement" },
    { articleName: "Maillot Bleu OU Tee-shirt Noir", isChoice: true, options: ["Maillot Bleu", "Tee-shirt Noir"] },
  ],
   "Vétéran - 100€": [
    { articleName: "Maillot Bleu" },
    { articleName: "Short" },
    { articleName: "Chaussette" },
  ],
};

export const PACK_COMPOSITIONS_STORAGE_KEY = 'TRAPEL_FC_PACK_COMPOSITIONS_DATA';

export interface AttributedEquipement {
  packArticleName: string;
  selectedArticleName: string;
  size?: string;
  quantity: number;
  isOutOfStockOverride?: boolean;
}

export const GLOBAL_STOCK_STORAGE_KEY = 'TRAPEL_FC_STOCK_DATA';

export const APPAREL_SIZES_STORAGE_KEY = 'TRAPEL_FC_ADMIN_LIST_APPAREL_SIZES';
export const SOCK_SIZES_STORAGE_KEY = 'TRAPEL_FC_ADMIN_LIST_SOCK_SIZES';
export const FOOD_LOCATIONS_STORAGE_KEY = 'TRAPEL_FC_ADMIN_LIST_FOOD_LOCATIONS';
export const SPORTIF_LOCATIONS_STORAGE_KEY = 'TRAPEL_FC_ADMIN_LIST_SPORTIF_LOCATIONS';
export const FOOD_SUPPLIERS_STORAGE_KEY = 'TRAPEL_FC_ADMIN_LIST_FOOD_SUPPLIERS';

// Nouvelle interface et clé pour les commandes d'équipement en cours
export interface EquipmentOrderItemInProgress {
  id: string; // id de la définition de l'article (ArticleDefinition.id)
  articleName: string;
  taille?: string;
  quantite: number;
  dateCommande: string; // ISO date string
}
export const EQUIPMENT_ORDERS_IN_PROGRESS_KEY = 'TRAPEL_FC_EQUIPMENT_ORDERS_IN_PROGRESS_DATA';
