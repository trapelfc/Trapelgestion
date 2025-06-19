
'use client';

import Link from 'next/link';
import { useState, useEffect, useCallback } from 'react'; // Added useCallback
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input'; 
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
import { ArrowLeft, PlusCircle, Trash2, Edit3 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { INITIAL_STOCK_EQUIPEMENTS, type ItemCategoryChoice, APPAREL_SIZES, SOCK_SIZES, FOOD_LOCATIONS, SPORTIF_LOCATIONS, GLOBAL_STOCK_STORAGE_KEY } from '@/config/stock-constants';
import type { EquipementItem as StockItemDefinitionFromEquipementPage } from '@/app/stock/equipement/page'; // Using this type for definition
import { getStockEquipementFromStorage as getGlobalStockData, saveStockEquipementToStorage as saveGlobalStockData } from '@/app/stock/equipement/page'; 
import { getStoredPackCompositions, saveStoredPackCompositions } from '../packs-licencies/page'; 
import { ArticleDefinitionModal, type ArticleDefinitionFormData } from '@/components/administration/article-definition-modal';


// Interface pour les définitions d'articles (sans quantités de stock)
export interface EquipementItem {
  id: string;
  name: string;
  itemCategory?: ItemCategoryChoice;
  hasSizeVariants?: boolean;
  availableSizes?: readonly string[];
  supplier?: string; 
  standardItemDesignatedSection?: 'equipement' | 'nourriture' | 'sportif';
}

export const ARTICLE_DEFINITIONS_STORAGE_KEY = 'TRAPEL_FC_ARTICLE_DEFINITIONS_DATA';
const PACK_COMPOSITIONS_STORAGE_KEY = 'TRAPEL_FC_PACK_COMPOSITIONS_DATA'; 
// GLOBAL_STOCK_STORAGE_KEY est importé depuis stock-constants

const getDynamicSizesOrLocations = (category: ItemCategoryChoice | undefined): readonly string[] => {
    if (category === 'apparel') return APPAREL_SIZES;
    if (category === 'socks') return SOCK_SIZES;
    if (category === 'food') return FOOD_LOCATIONS;
    if (category === 'sportif') return SPORTIF_LOCATIONS;
    return [];
};

export const getStoredArticleDefinitions = (): EquipementItem[] => {
  if (typeof window === 'undefined') {
    return [...INITIAL_STOCK_EQUIPEMENTS].map(def => ({
      id: def.id || crypto.randomUUID(),
      name: def.name,
      itemCategory: def.itemCategory,
      hasSizeVariants: def.hasSizeVariants,
      availableSizes: def.availableSizes || getDynamicSizesOrLocations(def.itemCategory),
      supplier: def.supplier,
      standardItemDesignatedSection: def.standardItemDesignatedSection,
    })).sort((a, b) => a.name.localeCompare(b.name));
  }
  const stored = localStorage.getItem(ARTICLE_DEFINITIONS_STORAGE_KEY);
  if (stored) {
    try {
      const parsed = JSON.parse(stored) as EquipementItem[];
      if (Array.isArray(parsed) && parsed.every(item => item.id && item.name)) {
        return parsed.map(p => ({
            ...p,
            availableSizes: p.availableSizes || getDynamicSizesOrLocations(p.itemCategory)
        })).sort((a, b) => a.name.localeCompare(b.name));
      }
    } catch (e) {
      console.error("Failed to parse article definitions from localStorage", e);
    }
  }
  const initialDefinitions = [...INITIAL_STOCK_EQUIPEMENTS].map(def => ({
    id: def.id || crypto.randomUUID(),
    name: def.name,
    itemCategory: def.itemCategory,
    hasSizeVariants: def.hasSizeVariants,
    availableSizes: def.availableSizes || getDynamicSizesOrLocations(def.itemCategory),
    supplier: def.supplier,
    standardItemDesignatedSection: def.standardItemDesignatedSection,
  })).sort((a, b) => a.name.localeCompare(b.name));
  localStorage.setItem(ARTICLE_DEFINITIONS_STORAGE_KEY, JSON.stringify(initialDefinitions));
  return initialDefinitions;
};

export const saveStoredArticleDefinitions = (definitions: EquipementItem[]) => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(ARTICLE_DEFINITIONS_STORAGE_KEY, JSON.stringify(definitions));
  window.dispatchEvent(new StorageEvent('storage', { key: ARTICLE_DEFINITIONS_STORAGE_KEY }));
};


export default function ArticlesStockPage() {
  const [articleDefinitions, setArticleDefinitions] = useState<EquipementItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [itemToDelete, setItemToDelete] = useState<EquipementItem | null>(null);
  const [isConfirmDeleteDialogOpen, setIsConfirmDeleteDialogOpen] = useState(false);
  const { toast } = useToast();
  const [isDefinitionModalOpen, setIsDefinitionModalOpen] = useState(false);
  const [articleDefinitionToEdit, setArticleDefinitionToEdit] = useState<EquipementItem | null>(null);

  const loadDefinitions = useCallback(() => {
    setIsLoading(true);
    setArticleDefinitions(getStoredArticleDefinitions());
    setIsLoading(false);
  }, []);

  useEffect(() => {
    loadDefinitions();
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === ARTICLE_DEFINITIONS_STORAGE_KEY) {
        loadDefinitions();
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [loadDefinitions]);

  const handleAddArticleDefinition = () => {
    setArticleDefinitionToEdit(null);
    setIsDefinitionModalOpen(true);
  };

  const handleEditArticleDefinitionClick = (definition: EquipementItem) => {
    setArticleDefinitionToEdit(definition);
    setIsDefinitionModalOpen(true);
  };

  const handleSaveArticleDefinition = (data: ArticleDefinitionFormData, editingId?: string) => {
    let updatedDefinitions;
    const isVariantCategory = ['apparel', 'socks', 'food', 'sportif'].includes(data.itemCategory);
    const newHasSizeVariants = isVariantCategory;
    const newAvailableSizes = getDynamicSizesOrLocations(data.itemCategory);

    if (editingId) { 
      const oldDefinition = articleDefinitions.find(def => def.id === editingId);
      if (!oldDefinition) {
        toast({ title: "Erreur", description: "Définition non trouvée.", variant: "destructive" });
        return;
      }

      if (data.name.toLowerCase() !== oldDefinition.name.toLowerCase() && articleDefinitions.some(def => def.id !== editingId && def.name.toLowerCase() === data.name.toLowerCase())) {
        toast({ title: "Erreur", description: "Une définition avec ce nom existe déjà.", variant: "destructive" });
        return;
      }

      updatedDefinitions = articleDefinitions.map(def => {
        if (def.id === editingId) {
          return {
            ...def,
            name: data.name,
            itemCategory: data.itemCategory,
            hasSizeVariants: newHasSizeVariants,
            availableSizes: newAvailableSizes,
            supplier: data.itemCategory === 'food' ? def.supplier : undefined,
            standardItemDesignatedSection: data.itemCategory === 'standard' ? data.standardItemDesignatedSection : undefined,
          };
        }
        return def;
      });
      
      if (oldDefinition.name !== data.name) {
        const globalStock = getGlobalStockData();
        const updatedGlobalStock = globalStock.map(stockItem => {
          if (stockItem.id === oldDefinition.id) { 
            return { ...stockItem, name: data.name, lastUpdated: new Date() };
          }
          return stockItem;
        });
        saveGlobalStockData(updatedGlobalStock);

        const packComps = getStoredPackCompositions();
        let packCompsModified = false;
        for (const packName in packComps) {
          packComps[packName] = packComps[packName].map(compItem => {
            if (compItem.articleName === oldDefinition.name) {
              packCompsModified = true;
              return { ...compItem, articleName: data.name };
            }
            if (compItem.options) {
              const newOptions = compItem.options.map(opt => opt === oldDefinition.name ? data.name : opt);
              if (newOptions.join(',') !== compItem.options?.join(',')) {
                packCompsModified = true;
                return { ...compItem, options: newOptions };
              }
            }
            return compItem;
          });
        }
        if (packCompsModified) {
          saveStoredPackCompositions(packComps);
        }
      }
      toast({ title: "Succès", description: `Définition "${data.name}" mise à jour.` });

    } else { 
      if (articleDefinitions.some(def => def.name.toLowerCase() === data.name.toLowerCase())) {
        toast({ title: "Erreur", description: "Une définition avec ce nom existe déjà.", variant: "destructive" });
        return;
      }
      const newDefinition: EquipementItem = {
        id: crypto.randomUUID(),
        name: data.name,
        itemCategory: data.itemCategory,
        hasSizeVariants: newHasSizeVariants,
        availableSizes: newAvailableSizes,
        supplier: data.itemCategory === 'food' ? undefined : undefined, 
        standardItemDesignatedSection: data.itemCategory === 'standard' ? data.standardItemDesignatedSection : undefined,
      };
      updatedDefinitions = [...articleDefinitions, newDefinition];
      toast({ title: "Succès", description: `Définition "${data.name}" ajoutée.` });
    }
    
    setArticleDefinitions(updatedDefinitions.sort((a, b) => a.name.localeCompare(b.name)));
    saveStoredArticleDefinitions(updatedDefinitions);
    setIsDefinitionModalOpen(false);
  };

  const requestDeleteDefinition = (definition: EquipementItem) => {
    const globalStock = getGlobalStockData();
    const isUsedInStock = globalStock.some(
      (item) => item.id === definition.id && item.quantity > 0
    );
    if (isUsedInStock) {
      toast({
        title: "Suppression impossible",
        description: `La définition "${definition.name}" est utilisée par un ou plusieurs articles en stock avec une quantité positive.`,
        variant: "destructive",
        duration: 5000,
      });
      return;
    }

    const packComps = getStoredPackCompositions();
    let isUsedInPacks = false;
    for (const packName in packComps) {
      if (packComps[packName].some(compItem => compItem.articleName === definition.name || (compItem.options && compItem.options.includes(definition.name)))) {
        isUsedInPacks = true;
        break;
      }
    }
     if (isUsedInPacks) {
      toast({
        title: "Suppression impossible",
        description: `La définition "${definition.name}" est utilisée dans la composition d'un ou plusieurs packs.`,
        variant: "destructive",
        duration: 5000,
      });
      return;
    }

    setItemToDelete(definition);
    setIsConfirmDeleteDialogOpen(true);
  };

  const confirmDeleteDefinition = () => {
    if (itemToDelete) {
      const updatedDefinitions = articleDefinitions.filter(def => def.id !== itemToDelete.id);
      setArticleDefinitions(updatedDefinitions);
      saveStoredArticleDefinitions(updatedDefinitions);
      
      const globalStock = getGlobalStockData();
      const updatedGlobalStock = globalStock.filter(item => item.id !== itemToDelete.id);
      if (globalStock.length !== updatedGlobalStock.length) {
          saveGlobalStockData(updatedGlobalStock);
      }

      toast({ title: "Succès", description: `Définition "${itemToDelete.name}" supprimée.` });
    }
    setIsConfirmDeleteDialogOpen(false);
    setItemToDelete(null);
  };

  const getCategoryLabel = (categoryId?: ItemCategoryChoice): string => {
    if (!categoryId) return 'N/A';
    const categoryMap: Record<ItemCategoryChoice, string> = {
      'apparel': 'Vêtement',
      'socks': 'Chaussettes',
      'food': 'Nourriture/Boisson',
      'sportif': 'Matériel Sportif',
      'standard': 'Standard',
    };
    return categoryMap[categoryId] || categoryId;
  };

  const getSectionLabel = (sectionId?: 'equipement' | 'nourriture' | 'sportif'): string | null => {
    if (!sectionId) return null;
    const sectionMap = {
      'equipement': 'Équipement',
      'nourriture': 'Nourriture',
      'sportif': 'Sportif',
    };
    return sectionMap[sectionId] || sectionId;
  }


  if (isLoading) {
    return <div className="container mx-auto p-4 text-center">Chargement...</div>;
  }

  return (
    <div className="container mx-auto p-4">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center">
          <Button variant="outline" size="icon" asChild className="mr-4">
            <Link href="/administration/gestion-listes">
              <ArrowLeft className="h-4 w-4" />
              <span className="sr-only">Retour à la Gestion des Listes</span>
            </Link>
          </Button>
          <h1 className="text-2xl font-bold">Définitions des Articles de Stock</h1>
        </div>
        <Button onClick={handleAddArticleDefinition}>
          <PlusCircle className="mr-2 h-4 w-4" />
          Ajouter une Définition
        </Button>
      </div>
      
      <div className="mb-6 p-4 border rounded-md bg-muted text-muted-foreground">
        <p className="text-sm">Cette page liste les définitions des articles de base disponibles dans l'application. Ce sont ces articles qui peuvent être utilisés pour composer les packs des licenciés et pour être ajoutés aux stocks réels.</p>
        <p className="text-xs mt-1">Vous pouvez ici ajouter de nouvelles définitions d'articles ou modifier le nom/catégorie/section des définitions existantes. La suppression n'est possible que si l'article n'est pas utilisé.</p>
      </div>

      {articleDefinitions.length > 0 ? (
        <div className="rounded-md border shadow-sm">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="py-2 px-4">Nom de l'Article (Définition)</TableHead>
                <TableHead className="py-2 px-4">Catégorie</TableHead>
                <TableHead className="py-2 px-4">Section (si Standard)</TableHead>
                <TableHead className="text-right py-2 px-4 w-[150px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {articleDefinitions.map((def) => (
                <TableRow key={def.id}>
                  <TableCell className="py-2 px-4 font-medium">{def.name}</TableCell>
                  <TableCell className="py-2 px-4">{getCategoryLabel(def.itemCategory)}</TableCell>
                  <TableCell className="py-2 px-4">
                    {def.itemCategory === 'standard' ? getSectionLabel(def.standardItemDesignatedSection) || 'Non spécifiée' : '-'}
                  </TableCell>
                  <TableCell className="py-2 px-4 text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEditArticleDefinitionClick(def)}
                      aria-label={`Modifier ${def.name}`}
                      className="mr-2"
                    >
                      <Edit3 className="h-4 w-4 text-blue-600" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => requestDeleteDefinition(def)}
                      aria-label={`Supprimer ${def.name}`}
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
        <p className="text-center text-muted-foreground">Aucune définition d'article à afficher.</p>
      )}

      {itemToDelete && (
        <AlertDialog open={isConfirmDeleteDialogOpen} onOpenChange={setIsConfirmDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
              <AlertDialogDescription>
                Voulez-vous vraiment supprimer la définition de l'article "{itemToDelete.name}" ?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setIsConfirmDeleteDialogOpen(false)}>Annuler</AlertDialogCancel>
              <AlertDialogAction onClick={confirmDeleteDefinition} className="bg-destructive hover:bg-destructive/90">Supprimer</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}

      {isDefinitionModalOpen && (
         <ArticleDefinitionModal
            isOpen={isDefinitionModalOpen}
            onClose={() => {
                setIsDefinitionModalOpen(false);
                setArticleDefinitionToEdit(null);
            }}
            onSave={handleSaveArticleDefinition}
            initialData={articleDefinitionToEdit ? { 
                name: articleDefinitionToEdit.name, 
                itemCategory: articleDefinitionToEdit.itemCategory,
                standardItemDesignatedSection: articleDefinitionToEdit.standardItemDesignatedSection
            } : undefined}
            editingId={articleDefinitionToEdit?.id}
         />
      )}
    </div>
  );
}
