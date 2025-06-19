
'use client';

import Link from 'next/link';
import { useState, useEffect, type Key, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { StockAdjustmentModal } from '@/components/stock/stock-adjustment-modal';
import { StockDetailModal } from '@/components/stock/stock-detail-modal';
// import { AddItemModal, type NewItemData } from '@/components/stock/add-item-modal'; // AddItemModal n'est plus utilisée ici
import { 
  APPAREL_SIZES, 
  SOCK_SIZES, 
  type ItemCategoryChoice,
  type FoodSupplier,
  INITIAL_STOCK_EQUIPEMENTS, // Utilisé pour l'initialisation si localStorage est vide
  FOOD_LOCATIONS,
  SPORTIF_LOCATIONS,
  GLOBAL_STOCK_STORAGE_KEY, // Import de la clé
} from '@/config/stock-constants';
import { ArrowLeft, Trash2, Edit3 } from 'lucide-react'; // PlusCircle retiré
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import type { EquipementItem as ArticleDefinition } from '@/app/administration/gestion-listes/articles-stock/page';
import { getStoredArticleDefinitions, ARTICLE_DEFINITIONS_STORAGE_KEY } from '@/app/administration/gestion-listes/articles-stock/page';

export interface EquipementItem {
  id: string; 
  name: string;
  lastUpdated: Date;
  quantity: number;
  itemCategory?: ItemCategoryChoice;
  hasSizeVariants?: boolean;
  sizeBreakdown?: Partial<Record<string, number>>;
  availableSizes?: readonly string[];
  supplier?: FoodSupplier | string; 
  standardItemDesignatedSection?: 'equipement' | 'nourriture' | 'sportif';
}

type StoredEquipementItem = Omit<EquipementItem, 'lastUpdated'> & {
  lastUpdated: string;
};

// Fonctions utilitaires pour les listes dynamiques (tailles/lieux)
const APPAREL_SIZES_STORAGE_KEY = 'TRAPEL_FC_ADMIN_LIST_APPAREL_SIZES';
const SOCK_SIZES_STORAGE_KEY = 'TRAPEL_FC_ADMIN_LIST_SOCK_SIZES';
const FOOD_LOCATIONS_STORAGE_KEY = 'TRAPEL_FC_ADMIN_LIST_FOOD_LOCATIONS';
const SPORTIF_LOCATIONS_STORAGE_KEY = 'TRAPEL_FC_ADMIN_LIST_SPORTIF_LOCATIONS';

const getDynamicListFromStorage = (key: string, initialFallback: readonly string[]): string[] => {
  if (typeof window === 'undefined') return [...initialFallback];
  const stored = localStorage.getItem(key);
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed) && parsed.every(item => typeof item === 'string')) {
        return parsed;
      }
    } catch (e) {
      console.error(`Failed to parse ${key} from localStorage`, e);
    }
  }
  // If the key is one of the known dynamic lists and it's not in localStorage,
  // initialize it with its default value.
  if ([APPAREL_SIZES_STORAGE_KEY, SOCK_SIZES_STORAGE_KEY, FOOD_LOCATIONS_STORAGE_KEY, SPORTIF_LOCATIONS_STORAGE_KEY].includes(key)) {
    const initialList = [...initialFallback];
    localStorage.setItem(key, JSON.stringify(initialList));
    return initialList;
  }
  return [...initialFallback];
};

// Fonction pour obtenir le stock global (utilisée aussi par d'autres modules)
export const getStockEquipementFromStorage = (): EquipementItem[] => {
  if (typeof window === 'undefined') return [];
  const storedData = localStorage.getItem(GLOBAL_STOCK_STORAGE_KEY);
  if (storedData) {
    try {
      const items = JSON.parse(storedData) as StoredEquipementItem[];
      return items.map(item => ({
        ...item,
        lastUpdated: item.lastUpdated ? parseISO(item.lastUpdated) : new Date(),
      }));
    } catch (error) {
      console.error("Error parsing global stock data from localStorage:", error);
      return [];
    }
  }
  // Initialize global stock based on definitions if empty
  const definitions = getStoredArticleDefinitions(); // Doit être appelé ici si utilisé pour initialiser
  const initialGlobalStock: EquipementItem[] = definitions.map(def => {
    let breakdown: Partial<Record<string, number>> | undefined = undefined;
    let currentAvailableSizes: readonly string[] | undefined = def.availableSizes;

    if (def.hasSizeVariants) {
        if (def.itemCategory === 'apparel') currentAvailableSizes = getDynamicListFromStorage(APPAREL_SIZES_STORAGE_KEY, APPAREL_SIZES);
        else if (def.itemCategory === 'socks') currentAvailableSizes = getDynamicListFromStorage(SOCK_SIZES_STORAGE_KEY, SOCK_SIZES);
        else if (def.itemCategory === 'food') currentAvailableSizes = getDynamicListFromStorage(FOOD_LOCATIONS_STORAGE_KEY, FOOD_LOCATIONS);
        else if (def.itemCategory === 'sportif') currentAvailableSizes = getDynamicListFromStorage(SPORTIF_LOCATIONS_STORAGE_KEY, SPORTIF_LOCATIONS);
        else currentAvailableSizes = def.availableSizes || [];
        breakdown = currentAvailableSizes.reduce((acc, size) => ({ ...acc, [size]: 0 }), {});
    }
    return {
        id: def.id, 
        name: def.name,
        lastUpdated: new Date(),
        quantity: 0,
        itemCategory: def.itemCategory,
        hasSizeVariants: def.hasSizeVariants,
        sizeBreakdown: breakdown,
        availableSizes: currentAvailableSizes,
        supplier: def.supplier,
        standardItemDesignatedSection: def.standardItemDesignatedSection,
    };
  });
  localStorage.setItem(GLOBAL_STOCK_STORAGE_KEY, JSON.stringify(initialGlobalStock.map(item => ({...item, lastUpdated: item.lastUpdated.toISOString()}))));
  return initialGlobalStock;
};

// Fonction pour sauvegarder le stock global (utilisée aussi par d'autres modules)
export const saveStockEquipementToStorage = (items: EquipementItem[]) => {
  if (typeof window === 'undefined') return;
  const itemsToStore: StoredEquipementItem[] = items.map(item => ({
    ...item,
    lastUpdated: item.lastUpdated.toISOString(),
  }));
  localStorage.setItem(GLOBAL_STOCK_STORAGE_KEY, JSON.stringify(itemsToStore));
  window.dispatchEvent(new StorageEvent('storage', { key: GLOBAL_STOCK_STORAGE_KEY }));
};


export default function EquipementPage() {
  const [equipements, setEquipements] = useState<EquipementItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [itemToDelete, setItemToDelete] = useState<EquipementItem | null>(null);
  const [isConfirmDeleteDialogOpen, setIsConfirmDeleteDialogOpen] = useState(false);
  const [selectedItemForAdjustment, setSelectedItemForAdjustment] = useState<EquipementItem | null>(null);
  const [isStockAdjustmentModalOpen, setIsStockAdjustmentModalOpen] = useState(false);
  const [selectedItemForDetail, setSelectedItemForDetail] = useState<EquipementItem | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  // const [isAddItemModalOpen, setIsAddItemModalOpen] = useState(false); // Plus nécessaire ici

  const loadAndMergeData = useCallback(() => {
    setIsLoading(true);
    const articleDefinitions = getStoredArticleDefinitions();
    const globalStock = getStockEquipementFromStorage(); // Lit le stock global

    const relevantDefinitions = articleDefinitions.filter(def =>
      def.itemCategory === 'apparel' ||
      def.itemCategory === 'socks' ||
      (def.itemCategory === 'standard' && def.standardItemDesignatedSection === 'equipement')
    );

    const mergedEquipements = relevantDefinitions.map(def => {
      const stockInstance = globalStock.find(item => item.id === def.id);
      if (stockInstance) {
        return { 
          ...stockInstance, 
          name: def.name, // Assurer que le nom vient de la définition
          itemCategory: def.itemCategory,
          hasSizeVariants: def.hasSizeVariants,
          availableSizes: stockInstance.availableSizes || def.availableSizes, // Prioriser le stock si existant, sinon définition
          supplier: def.supplier,
          standardItemDesignatedSection: def.standardItemDesignatedSection,
        };
      }
      // Créer une instance "virtuelle" pour les définitions sans stock réel
      let breakdown: Partial<Record<string, number>> | undefined = undefined;
      let currentAvailableSizes: readonly string[] | undefined;
       if (def.hasSizeVariants) {
          if (def.itemCategory === 'apparel') currentAvailableSizes = getDynamicListFromStorage(APPAREL_SIZES_STORAGE_KEY, APPAREL_SIZES);
          else if (def.itemCategory === 'socks') currentAvailableSizes = getDynamicListFromStorage(SOCK_SIZES_STORAGE_KEY, SOCK_SIZES);
          // Les autres catégories (food, sportif) ne sont pas affichées ici, mais si elles l'étaient, il faudrait leur logique.
          else currentAvailableSizes = def.availableSizes || [];
          breakdown = currentAvailableSizes.reduce((acc, size) => ({ ...acc, [size]: 0 }), {});
      }
      return {
        id: def.id,
        name: def.name,
        lastUpdated: new Date(), // Date fictive car pas de stock réel
        quantity: 0,
        itemCategory: def.itemCategory,
        hasSizeVariants: def.hasSizeVariants,
        availableSizes: currentAvailableSizes,
        sizeBreakdown: breakdown,
        supplier: def.supplier,
        standardItemDesignatedSection: def.standardItemDesignatedSection,
      };
    }).sort((a, b) => a.name.localeCompare(b.name));

    setEquipements(mergedEquipements);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    loadAndMergeData();
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === GLOBAL_STOCK_STORAGE_KEY || event.key === ARTICLE_DEFINITIONS_STORAGE_KEY) {
        loadAndMergeData();
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [loadAndMergeData]);


  const handleItemClick = (item: EquipementItem) => {
    const globalStock = getStockEquipementFromStorage();
    const actualStockItem = globalStock.find(si => si.id === item.id) || item; // Utiliser l'item de la liste si non trouvé dans le stock global (pour l'affichage des tailles/lieux définis)
    setSelectedItemForDetail(actualStockItem);
    setIsDetailModalOpen(true);
  };

  // La fonction handleAddItem n'est plus nécessaire ici car AddItemModal est retirée
  // const handleAddItem = () => {
  //   setIsAddItemModalOpen(true);
  // };

  // handleSaveNewItem n'est plus appelée depuis cette page, la création se fait via l'ajustement de stock pour un item à 0
  
  const requestDeleteItem = (item: EquipementItem) => {
    setItemToDelete(item);
    setIsConfirmDeleteDialogOpen(true);
  };

  const confirmDeleteItem = () => {
    if (itemToDelete) {
      const globalStock = getStockEquipementFromStorage();
      const updatedGlobalStock = globalStock.map(stockItem => {
        if (stockItem.id === itemToDelete.id) {
          let sizesToReset: readonly string[] = [];
          if (stockItem.itemCategory === 'apparel') sizesToReset = getDynamicListFromStorage(APPAREL_SIZES_STORAGE_KEY, APPAREL_SIZES);
          else if (stockItem.itemCategory === 'socks') sizesToReset = getDynamicListFromStorage(SOCK_SIZES_STORAGE_KEY, SOCK_SIZES);
          // Pour les autres catégories, on pourrait avoir des logiques spécifiques si elles étaient gérées ici

          return { 
            ...stockItem, 
            quantity: 0, 
            sizeBreakdown: stockItem.hasSizeVariants 
              ? (stockItem.availableSizes || sizesToReset).reduce((acc, size) => ({ ...acc, [size]: 0 }), {}) 
              : undefined,
            lastUpdated: new Date() 
          };
        }
        return stockItem;
      });
      saveStockEquipementToStorage(updatedGlobalStock);
      // loadAndMergeData(); // Déjà géré par l'écouteur de storage
    }
    setIsConfirmDeleteDialogOpen(false);
    setItemToDelete(null);
  };

  const cancelDeleteItem = () => {
    setIsConfirmDeleteDialogOpen(false);
    setItemToDelete(null);
  };

  const handleAdjustStock = (item: EquipementItem) => {
    // S'assurer de passer l'item réel du stock global à la modale si celui-ci existe,
    // sinon passer l'item "virtuel" (définition avec stock 0)
    const globalStock = getStockEquipementFromStorage();
    const actualStockItem = globalStock.find(si => si.id === item.id);
    
    if (actualStockItem) {
        setSelectedItemForAdjustment(actualStockItem);
    } else {
        // Si l'article n'est pas encore dans le stock global (c'est une définition avec 0 stock affiché),
        // on crée une version "stockable" basée sur la définition pour la modale
        let breakdown: Partial<Record<string, number>> | undefined = undefined;
        let currentAvailableSizes: readonly string[] | undefined;
        if (item.hasSizeVariants) {
            if (item.itemCategory === 'apparel') currentAvailableSizes = getDynamicListFromStorage(APPAREL_SIZES_STORAGE_KEY, APPAREL_SIZES);
            else if (item.itemCategory === 'socks') currentAvailableSizes = getDynamicListFromStorage(SOCK_SIZES_STORAGE_KEY, SOCK_SIZES);
            else currentAvailableSizes = item.availableSizes || []; // Devrait être défini par la définition
            breakdown = currentAvailableSizes.reduce((acc, size) => ({ ...acc, [size]: 0 }), {});
        }
        setSelectedItemForAdjustment({
            ...item, // Provient de la liste 'equipements', basée sur la définition
            quantity: 0,
            sizeBreakdown: breakdown,
            availableSizes: currentAvailableSizes, // Assurer que availableSizes est correct
            lastUpdated: new Date(), // Nouvelle date pour cet item "virtuel"
        });
    }
    setIsStockAdjustmentModalOpen(true);
  };

  const handleSaveStockAdjustment = (itemId: string, newStockValue: number | Partial<Record<string, number>>) => {
    const globalStock = getStockEquipementFromStorage();
    const itemIndex = globalStock.findIndex(item => item.id === itemId);
    let itemToUpdate: EquipementItem;

    if (itemIndex > -1) { 
      itemToUpdate = { ...globalStock[itemIndex] };
    } else { 
      // L'item n'existe pas dans le stock global, il faut le créer à partir de sa définition
      const definition = getStoredArticleDefinitions().find(def => def.id === itemId);
      if (!definition) {
        console.error("Definition not found for item ID:", itemId);
        return;
      }
      let breakdown: Partial<Record<string, number>> | undefined = undefined;
      let currentAvailableSizes: readonly string[] | undefined;
      if (definition.hasSizeVariants) {
        if (definition.itemCategory === 'apparel') currentAvailableSizes = getDynamicListFromStorage(APPAREL_SIZES_STORAGE_KEY, APPAREL_SIZES);
        else if (definition.itemCategory === 'socks') currentAvailableSizes = getDynamicListFromStorage(SOCK_SIZES_STORAGE_KEY, SOCK_SIZES);
        else currentAvailableSizes = definition.availableSizes || [];
        breakdown = currentAvailableSizes.reduce((acc, size) => ({ ...acc, [size]: 0 }), {});
      }
      itemToUpdate = {
        id: definition.id,
        name: definition.name,
        itemCategory: definition.itemCategory,
        hasSizeVariants: definition.hasSizeVariants,
        availableSizes: currentAvailableSizes,
        supplier: definition.supplier,
        standardItemDesignatedSection: definition.standardItemDesignatedSection,
        quantity: 0, // Sera calculée
        sizeBreakdown: breakdown,
        lastUpdated: new Date(), 
      };
    }

    let updatedQuantity = itemToUpdate.quantity;
    let updatedSizeBreakdown = itemToUpdate.sizeBreakdown;

    if (typeof newStockValue === 'number' && !itemToUpdate.hasSizeVariants) {
      updatedQuantity = newStockValue;
    } else if (typeof newStockValue === 'object' && itemToUpdate.hasSizeVariants && itemToUpdate.availableSizes) {
      const currentItemBreakdownKeys = itemToUpdate.availableSizes;
      const fullBreakdown = currentItemBreakdownKeys.reduce((acc, key) => {
        acc[key] = (newStockValue as Partial<Record<string, number>>)[key] || itemToUpdate.sizeBreakdown?.[key] || 0;
        return acc;
      }, {} as Partial<Record<string, number>>);
      updatedQuantity = Object.values(fullBreakdown).reduce((sum, qty) => sum + (qty || 0), 0);
      updatedSizeBreakdown = fullBreakdown;
    }
    itemToUpdate = { ...itemToUpdate, quantity: updatedQuantity, sizeBreakdown: updatedSizeBreakdown, lastUpdated: new Date() };
    
    if (itemIndex > -1) {
      globalStock[itemIndex] = itemToUpdate;
    } else {
      globalStock.push(itemToUpdate);
    }
    
    saveStockEquipementToStorage(globalStock.sort((a,b)=> a.name.localeCompare(b.name))); // Sauvegarde triée
    // loadAndMergeData(); // Géré par l'écouteur de storage
    setIsStockAdjustmentModalOpen(false);
    setSelectedItemForAdjustment(null);
  };

  const formatDate = (dateSource: Date | string) => {
    try {
      const date = typeof dateSource === 'string' ? parseISO(dateSource) : dateSource;
      if (isNaN(date.getTime())) {
        return "Date invalide";
      }
      return format(date, 'dd/MM/yyyy', { locale: fr });
    } catch (error) {
      console.error("Error formatting date:", dateSource, error);
      return String(dateSource); 
    }
  };

  if (isLoading) {
    return <div className="container mx-auto p-4 text-center">Chargement des équipements...</div>;
  }

  return (
    <div className="container mx-auto p-4">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center">
          <Button variant="outline" size="icon" asChild className="mr-4">
            <Link href="/stock">
              <ArrowLeft className="h-4 w-4" />
              <span className="sr-only">Retour</span>
            </Link>
          </Button>
          <h1 className="text-2xl font-bold">Équipement</h1>
        </div>
        {/* Le bouton "Ajouter au stock" est retiré */}
      </div>

      <div className="rounded-md border shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[30%] py-1 px-4">Article (Définition)</TableHead>
              <TableHead className="w-[20%] text-center py-1 px-4">Dernière mise à jour</TableHead>
              <TableHead className="w-[15%] text-center py-1 px-4">Ajuster Stock</TableHead>
              <TableHead className="w-[15%] text-center py-1 px-4">Quantité en Stock</TableHead>
              <TableHead className="text-right py-1 px-4 w-[10%]">RAZ Stock</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {equipements.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="py-1 px-4">
                  <Button
                    variant="link"
                    className="p-0 h-auto text-left w-full justify-start text-primary hover:underline"
                    onClick={() => handleItemClick(item)}
                    aria-label={`Détails pour ${item.name}`}
                  >
                    {item.name}
                  </Button>
                </TableCell>
                <TableCell className="text-center py-1 px-4">{formatDate(item.lastUpdated)}</TableCell>
                <TableCell className="text-center py-1 px-4">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleAdjustStock(item)}
                    aria-label={`Ajuster stock pour ${item.name}`}
                  >
                    <Edit3 className="h-4 w-4 text-blue-600" />
                  </Button>
                </TableCell>
                <TableCell className="text-center py-1 px-4">{item.quantity}</TableCell>
                <TableCell className="text-right py-1 px-4">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => requestDeleteItem(item)}
                    aria-label={`Remettre à zéro le stock de ${item.name}`}
                    disabled={item.quantity === 0}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {equipements.length === 0 && !isLoading && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                  Aucun article d'équipement défini ou pertinent pour cette section. Veuillez d'abord définir des articles dans "Administration &gt; Gestion des Listes &gt; Articles de Stock".
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {itemToDelete && (
        <AlertDialog open={isConfirmDeleteDialogOpen} onOpenChange={setIsConfirmDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Remise à Zéro du Stock</AlertDialogTitle>
              <AlertDialogDescription>
                Voulez-vous vraiment remettre à zéro le stock de l'article "{itemToDelete.name}" ? Les quantités pour toutes les tailles/lieux seront mises à 0. Cette action est irréversible.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={cancelDeleteItem}>Annuler</AlertDialogCancel>
              <AlertDialogAction onClick={confirmDeleteItem} className="bg-destructive hover:bg-destructive/90">Remettre à Zéro</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}

      {selectedItemForAdjustment && (
        <StockAdjustmentModal
          isOpen={isStockAdjustmentModalOpen}
          onClose={() => {
            setIsStockAdjustmentModalOpen(false);
            setSelectedItemForAdjustment(null);
          }}
          item={selectedItemForAdjustment}
          onSave={handleSaveStockAdjustment}
        />
      )}

      {selectedItemForDetail && (
        <StockDetailModal
          isOpen={isDetailModalOpen}
          onClose={() => {
            setIsDetailModalOpen(false);
            setSelectedItemForDetail(null);
          }}
          item={selectedItemForDetail}
        />
      )}

      {/* AddItemModal n'est plus rendue ici */}
    </div>
  );
}
  
