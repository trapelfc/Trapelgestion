
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
import { 
  FOOD_LOCATIONS as INITIAL_FOOD_LOCATIONS,
} from '@/config/stock-constants';
import { ArrowLeft, Trash2, Edit3 } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import type { NourritureBoissonListItem } from '@/app/administration/gestion-listes/listes-nourriture-boissons/page';
import { getStoredNourritureBoissonListItems, NOURRITURE_BOISSONS_LIST_ITEMS_STORAGE_KEY } from '@/app/administration/gestion-listes/listes-nourriture-boissons/page';
import type { EquipementItem } from '@/app/stock/equipement/page'; 
import { getStockEquipementFromStorage, saveStockEquipementToStorage } from '@/app/stock/equipement/page'; 

const FOOD_LOCATIONS_STORAGE_KEY = 'TRAPEL_FC_ADMIN_LIST_FOOD_LOCATIONS'; // Pour getDynamicFoodLocations
const GLOBAL_STOCK_STORAGE_KEY = 'TRAPEL_FC_STOCK_DATA'; // Clé pour le stock global

const getDynamicFoodLocations = (): string[] => {
  if (typeof window === 'undefined') return [...INITIAL_FOOD_LOCATIONS];
  const stored = localStorage.getItem(FOOD_LOCATIONS_STORAGE_KEY);
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed) && parsed.every(item => typeof item === 'string')) {
        return parsed;
      }
    } catch (e) {
      console.error(`Failed to parse ${FOOD_LOCATIONS_STORAGE_KEY} from localStorage`, e);
    }
  }
  const initialList = [...INITIAL_FOOD_LOCATIONS];
  localStorage.setItem(FOOD_LOCATIONS_STORAGE_KEY, JSON.stringify(initialList));
  return initialList;
};


export default function StockNourritureBoissonsPage() {
  const [foodStockItems, setFoodStockItems] = useState<EquipementItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [itemToReset, setItemToReset] = useState<EquipementItem | null>(null);
  const [isConfirmResetDialogOpen, setIsConfirmResetDialogOpen] = useState(false);
  const [selectedItemForAdjustment, setSelectedItemForAdjustment] = useState<EquipementItem | null>(null);
  const [isStockAdjustmentModalOpen, setIsStockAdjustmentModalOpen] = useState(false);
  const [selectedItemForDetail, setSelectedItemForDetail] = useState<EquipementItem | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  const loadAndMergeData = useCallback(() => {
    setIsLoading(true);
    const specificFoodItemDefinitions = getStoredNourritureBoissonListItems();
    const globalStock = getStockEquipementFromStorage();
    const dynamicFoodLocs = getDynamicFoodLocations();

    const mergedItems = specificFoodItemDefinitions.map(def => {
      const stockInstance = globalStock.find(item => item.id === def.id);
      
      if (stockInstance) {
        return { 
          ...stockInstance, 
          name: def.nom, // Utiliser le nom de la définition spécifique
          itemCategory: 'food', // Forcer la catégorie pour la logique de stock
          hasSizeVariants: true, // Indique une répartition par lieu
          availableSizes: dynamicFoodLocs, // Lieux pour nourriture
          supplier: def.fournisseur, // Utiliser le fournisseur de la définition
          // Les autres champs (quantity, sizeBreakdown, lastUpdated) viennent de stockInstance
        };
      }
      // L'article spécifique est défini mais n'a pas encore d'entrée dans le stock global
      const breakdown = dynamicFoodLocs.reduce((acc, loc) => ({ ...acc, [loc]: 0 }), {});
      return {
        id: def.id,
        name: def.nom,
        lastUpdated: new Date(), // Date fictive, sera mise à jour au premier ajustement
        quantity: 0,
        itemCategory: 'food',
        hasSizeVariants: true,
        availableSizes: dynamicFoodLocs,
        sizeBreakdown: breakdown,
        supplier: def.fournisseur,
        // standardItemDesignatedSection: undefined, // Non pertinent pour ce flux
      };
    }).sort((a, b) => a.name.localeCompare(b.name));

    setFoodStockItems(mergedItems);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    loadAndMergeData();
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === GLOBAL_STOCK_STORAGE_KEY || 
          event.key === NOURRITURE_BOISSONS_LIST_ITEMS_STORAGE_KEY || 
          event.key === FOOD_LOCATIONS_STORAGE_KEY) {
        loadAndMergeData();
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [loadAndMergeData]);


  const handleItemClick = (item: EquipementItem) => {
    setSelectedItemForDetail(item);
    setIsDetailModalOpen(true);
  };
  
  const requestResetStockItem = (item: EquipementItem) => {
    setItemToReset(item);
    setIsConfirmResetDialogOpen(true);
  };

  const confirmResetStockItem = () => {
    if (itemToReset) {
      const globalStock = getStockEquipementFromStorage();
      const dynamicFoodLocs = getDynamicFoodLocations();
      
      const itemIndex = globalStock.findIndex(stockItem => stockItem.id === itemToReset.id);
      if (itemIndex > -1) {
        const updatedStockItem = {
          ...globalStock[itemIndex],
          quantity: 0,
          sizeBreakdown: dynamicFoodLocs.reduce((acc, loc) => ({ ...acc, [loc]: 0 }), {}),
          lastUpdated: new Date(),
        };
        globalStock[itemIndex] = updatedStockItem;
        saveStockEquipementToStorage(globalStock);
      } else {
        // Si l'item n'était pas dans le stock global (item "virtuel" à 0),
        // on pourrait explicitement ajouter une entrée à 0, mais l'effet est le même.
        // On ne fait rien ici car `loadAndMergeData` le remontera comme étant à 0.
      }
      // loadAndMergeData(); // Géré par l'écouteur de storage
    }
    setIsConfirmResetDialogOpen(false);
    setItemToReset(null);
  };

  const cancelResetStockItem = () => {
    setIsConfirmResetDialogOpen(false);
    setItemToReset(null);
  };

  const handleAdjustStock = (item: EquipementItem) => {
    // L'item passé ici est déjà le résultat de la fusion, donc il a les bonnes propriétés
    setSelectedItemForAdjustment(item);
    setIsStockAdjustmentModalOpen(true);
  };

  const handleSaveStockAdjustment = (itemId: string, newStockValue: number | Partial<Record<string, number>>) => {
    const globalStock = getStockEquipementFromStorage();
    const itemIndex = globalStock.findIndex(item => item.id === itemId);
    let itemToUpdate: EquipementItem;

    if (itemIndex > -1) { 
      itemToUpdate = { ...globalStock[itemIndex] };
    } else { 
      // L'item n'existe pas dans le stock global, il faut le créer.
      // On récupère sa définition depuis la liste des articles spécifiques.
      const specificDefinition = getStoredNourritureBoissonListItems().find(def => def.id === itemId);
      if (!specificDefinition) {
        console.error("Définition spécifique non trouvée pour l'ID:", itemId);
        return;
      }
      const dynamicFoodLocs = getDynamicFoodLocations();
      itemToUpdate = {
        id: specificDefinition.id,
        name: specificDefinition.nom, // Important de prendre le nom de la définition
        itemCategory: 'food',
        hasSizeVariants: true,
        availableSizes: dynamicFoodLocs,
        supplier: specificDefinition.fournisseur,
        quantity: 0, // Sera calculée
        sizeBreakdown: dynamicFoodLocs.reduce((acc, loc) => ({ ...acc, [loc]: 0 }), {}),
        lastUpdated: new Date(), 
      };
    }

    // Pour les articles de nourriture, newStockValue sera toujours un objet (répartition par lieu)
    if (typeof newStockValue === 'object' && itemToUpdate.hasSizeVariants && itemToUpdate.availableSizes) {
      const currentItemBreakdownKeys = itemToUpdate.availableSizes; // ce sont les lieux
      const fullBreakdown = currentItemBreakdownKeys.reduce((acc, key) => {
        acc[key] = (newStockValue as Partial<Record<string, number>>)[key] || itemToUpdate.sizeBreakdown?.[key] || 0;
        return acc;
      }, {} as Partial<Record<string, number>>);
      itemToUpdate.quantity = Object.values(fullBreakdown).reduce((sum, qty) => sum + (qty || 0), 0);
      itemToUpdate.sizeBreakdown = fullBreakdown;
    } else {
        console.warn("Ajustement de stock pour un article de nourriture sans répartition par lieu, ou format de valeur inattendu.");
        // Pour un item de nourriture sans 'hasSizeVariants' (ce qui ne devrait pas arriver avec cette logique),
        // ou si newStockValue n'est pas un objet :
        if (typeof newStockValue === 'number') {
             itemToUpdate.quantity = newStockValue;
        }
    }
    itemToUpdate.lastUpdated = new Date();
    
    if (itemIndex > -1) {
      globalStock[itemIndex] = itemToUpdate;
    } else {
      globalStock.push(itemToUpdate);
    }
    
    saveStockEquipementToStorage(globalStock.sort((a,b)=> a.name.localeCompare(b.name)));
    // loadAndMergeData(); // Géré par l'écouteur de storage
    setIsStockAdjustmentModalOpen(false);
    setSelectedItemForAdjustment(null);
  };

  const formatDate = (dateSource: Date | string) => {
    try {
      const date = typeof dateSource === 'string' ? parseISO(dateSource) : dateSource;
      if (isNaN(date.getTime())) {
        return "N/A"; // Si la date est invalide (par ex. pour un nouvel item non sauvegardé)
      }
      return format(date, 'dd/MM/yyyy', { locale: fr });
    } catch (error) {
      console.error("Error formatting date:", dateSource, error);
      return String(dateSource); 
    }
  };

  if (isLoading) {
    return <div className="container mx-auto p-4 text-center">Chargement des stocks de nourriture &amp; boissons...</div>;
  }

  return (
    <div className="container mx-auto p-4">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center">
          <Button variant="outline" size="icon" asChild className="mr-4">
            <Link href="/stock">
              <ArrowLeft className="h-4 w-4" />
              <span className="sr-only">Retour au Module Stock</span>
            </Link>
          </Button>
          <h1 className="text-2xl font-bold">Stock - Nourriture &amp; Boissons</h1>
        </div>
      </div>
      
      <div className="mb-6 p-4 border rounded-md bg-muted text-muted-foreground">
        <p className="text-sm">Gérez ici les quantités en stock pour les articles spécifiques de nourriture/boisson. Ces articles sont définis dans "Administration &gt; Gestion des Listes &gt; Articles Spécifiques (Nourriture &amp; Boissons)".</p>
      </div>

      {foodStockItems.length > 0 ? (
        <div className="rounded-md border shadow-sm">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[30%] py-1 px-4">Article (Défini)</TableHead>
                <TableHead className="w-[20%] text-center py-1 px-4">Dernière mise à jour</TableHead>
                <TableHead className="w-[15%] text-center py-1 px-4">Ajuster Stock</TableHead>
                <TableHead className="w-[15%] text-center py-1 px-4">Quantité en Stock</TableHead>
                <TableHead className="text-right py-1 px-4 w-[10%]">RAZ Stock</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {foodStockItems.map((item) => (
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
                      onClick={() => requestResetStockItem(item)}
                      aria-label={`Remettre à zéro le stock de ${item.name}`}
                      disabled={item.quantity === 0}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <p className="text-center text-muted-foreground py-8">
          Aucun article spécifique de nourriture/boisson défini. Veuillez définir des articles dans "Administration &gt; Gestion des Listes &gt; Articles Spécifiques (Nourriture &amp; Boissons)" pour pouvoir gérer leur stock ici.
        </p>
      )}

      {itemToReset && (
        <AlertDialog open={isConfirmResetDialogOpen} onOpenChange={setIsConfirmResetDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Remise à Zéro du Stock</AlertDialogTitle>
              <AlertDialogDescription>
                Voulez-vous vraiment remettre à zéro le stock de l'article "{itemToReset.name}" ? Les quantités pour tous les lieux seront mises à 0. Cette action est irréversible.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={cancelResetStockItem}>Annuler</AlertDialogCancel>
              <AlertDialogAction onClick={confirmResetStockItem} className="bg-destructive hover:bg-destructive/90">Remettre à Zéro</AlertDialogAction>
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
    </div>
  );
}

