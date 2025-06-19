
'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft, PlusCircle, Edit3, Trash2 } from 'lucide-react';
import { useState, useEffect, useCallback } from 'react';
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
import { useToast } from '@/hooks/use-toast';
import type { FoodSupplierDetail } from '@/config/stock-constants';
import { getStoredSuppliers } from '../fournisseurs-nourriture/page';
import { NourritureBoissonListItemModal, type NourritureBoissonListItemFormData } from '@/components/administration/nourriture-boisson-list-item-modal';

export interface NourritureBoissonListItem {
  id: string;
  nom: string;
  commentaire?: string;
  fournisseur?: string; // Stocke le nom du fournisseur
  prix?: number; // Nouveau champ prix
}

export const NOURRITURE_BOISSONS_LIST_ITEMS_STORAGE_KEY = 'TRAPEL_FC_ADMIN_NOURRITURE_BOISSONS_LIST_ITEMS_DATA';
const FOOD_SUPPLIERS_STORAGE_KEY = 'TRAPEL_FC_ADMIN_LIST_FOOD_SUPPLIERS'; // For listening to supplier changes

export const getStoredNourritureBoissonListItems = (): NourritureBoissonListItem[] => {
  if (typeof window === 'undefined') return [];
  const stored = localStorage.getItem(NOURRITURE_BOISSONS_LIST_ITEMS_STORAGE_KEY);
  if (stored) {
    try {
      const parsed = JSON.parse(stored) as NourritureBoissonListItem[];
      if (Array.isArray(parsed) && parsed.every(item => item.id && item.nom)) {
        return parsed.map(item => ({
          ...item,
          prix: typeof item.prix === 'number' ? item.prix : undefined,
        })).sort((a, b) => a.nom.localeCompare(b.nom));
      }
    } catch (e) {
      console.error("Failed to parse nourriture/boisson list items from localStorage", e);
    }
  }
  return [];
};

export const saveStoredNourritureBoissonListItems = (items: NourritureBoissonListItem[]) => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(NOURRITURE_BOISSONS_LIST_ITEMS_STORAGE_KEY, JSON.stringify(items));
  window.dispatchEvent(new StorageEvent('storage', { key: NOURRITURE_BOISSONS_LIST_ITEMS_STORAGE_KEY }));
};

const formatPrice = (price?: number) => {
  if (price === undefined || price === null) return '-';
  return `${price.toFixed(2)} €`;
};

export default function ListesNourritureBoissonsPage() {
  const [items, setItems] = useState<NourritureBoissonListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const [fournisseursOptions, setFournisseursOptions] = useState<FoodSupplierDetail[]>([]);

  const [itemToDelete, setItemToDelete] = useState<NourritureBoissonListItem | null>(null);
  const [isConfirmDeleteDialogOpen, setIsConfirmDeleteDialogOpen] = useState(false);
  
  const [editingItem, setEditingItem] = useState<NourritureBoissonListItem | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const loadData = useCallback(() => {
    setIsLoading(true);
    setItems(getStoredNourritureBoissonListItems());
    setFournisseursOptions(getStoredSuppliers());
    setIsLoading(false);
  }, []);

  useEffect(() => {
    loadData();
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === NOURRITURE_BOISSONS_LIST_ITEMS_STORAGE_KEY || event.key === FOOD_SUPPLIERS_STORAGE_KEY) {
        loadData();
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [loadData]);

  const handleOpenModal = (item: NourritureBoissonListItem | null = null) => {
    setEditingItem(item);
    setIsModalOpen(true);
  };

  const handleSaveItem = (data: NourritureBoissonListItemFormData) => {
    let updatedItems;
    const newItemNomLower = data.nom.trim().toLowerCase();

    if (editingItem) {
      if (newItemNomLower !== editingItem.nom.toLowerCase() && items.some(i => i.id !== editingItem.id && i.nom.toLowerCase() === newItemNomLower)) {
        toast({ title: "Erreur", description: "Un autre article avec ce nom existe déjà.", variant: "destructive" });
        return;
      }
      updatedItems = items.map(i =>
        i.id === editingItem.id ? { 
            ...editingItem, 
            nom: data.nom.trim(), 
            commentaire: data.commentaire, 
            fournisseur: data.fournisseur,
            prix: data.prix 
        } : i
      );
      toast({ title: "Succès", description: `Article "${data.nom.trim()}" modifié.` });
    } else {
      if (items.some(i => i.nom.toLowerCase() === newItemNomLower)) {
        toast({ title: "Erreur", description: "Un article avec ce nom existe déjà.", variant: "destructive" });
        return;
      }
      const newItem: NourritureBoissonListItem = {
        id: crypto.randomUUID(),
        nom: data.nom.trim(),
        commentaire: data.commentaire,
        fournisseur: data.fournisseur,
        prix: data.prix,
      };
      updatedItems = [...items, newItem];
      toast({ title: "Succès", description: `Article "${newItem.nom}" ajouté.` });
    }
    setItems(updatedItems.sort((a, b) => a.nom.localeCompare(b.nom)));
    saveStoredNourritureBoissonListItems(updatedItems);
    setIsModalOpen(false);
    setEditingItem(null);
  };

  const requestDeleteItem = (item: NourritureBoissonListItem) => {
    // TODO: Later, add check if this item is used in any actual commandes or menus types
    setItemToDelete(item);
    setIsConfirmDeleteDialogOpen(true);
  };

  const confirmDeleteItem = () => {
    if (itemToDelete) {
      const updatedItems = items.filter(i => i.id !== itemToDelete.id);
      setItems(updatedItems);
      saveStoredNourritureBoissonListItems(updatedItems);
      toast({ title: "Succès", description: `Article "${itemToDelete.nom}" supprimé.` });
    }
    setIsConfirmDeleteDialogOpen(false);
    setItemToDelete(null);
  };

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
          <h1 className="text-2xl font-bold">Articles Spécifiques (Nourriture & Boissons)</h1>
        </div>
        <Button onClick={() => handleOpenModal()}>
          <PlusCircle className="mr-2 h-4 w-4" />
          Ajouter un article
        </Button>
      </div>
      
      <div className="mb-6 p-4 border rounded-md bg-muted text-muted-foreground">
        <p className="text-sm">Gérez ici les articles fréquemment commandés ou utilisés pour la nourriture et les boissons, qui ne sont pas forcément suivis dans le stock global (ex: ingrédients spécifiques, menus, etc.). Ces articles pourront être utilisés dans les "Commandes Types".</p>
      </div>

      {items.length > 0 ? (
        <div className="rounded-md border shadow-sm">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="py-2 px-4">Nom de l'article</TableHead>
                <TableHead className="py-2 px-4">Commentaire</TableHead>
                <TableHead className="py-2 px-4">Fournisseur</TableHead>
                <TableHead className="py-2 px-4 text-right">Prix</TableHead>
                <TableHead className="text-right py-2 px-4 w-[150px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="py-2 px-4 font-medium">{item.nom}</TableCell>
                  <TableCell className="py-2 px-4 text-sm text-muted-foreground truncate max-w-xs">{item.commentaire || '-'}</TableCell>
                  <TableCell className="py-2 px-4">{item.fournisseur || '-'}</TableCell>
                  <TableCell className="py-2 px-4 text-right">{formatPrice(item.prix)}</TableCell>
                  <TableCell className="py-2 px-4 text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleOpenModal(item)}
                      aria-label={`Modifier ${item.nom}`}
                      className="mr-2"
                    >
                      <Edit3 className="h-4 w-4 text-blue-600" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => requestDeleteItem(item)}
                      aria-label={`Supprimer ${item.nom}`}
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
        <p className="text-center text-muted-foreground">
          Aucun article spécifique à afficher. Cliquez sur "Ajouter un article" pour commencer.
        </p>
      )}

      {itemToDelete && (
        <AlertDialog open={isConfirmDeleteDialogOpen} onOpenChange={setIsConfirmDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
              <AlertDialogDescription>
                Voulez-vous vraiment supprimer l'article "{itemToDelete.nom}" ?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => {setIsConfirmDeleteDialogOpen(false); setItemToDelete(null);}}>Annuler</AlertDialogCancel>
              <AlertDialogAction onClick={confirmDeleteItem} className="bg-destructive hover:bg-destructive/90">Supprimer</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}

      {isModalOpen && (
         <NourritureBoissonListItemModal
            isOpen={isModalOpen}
            onClose={() => {
                setIsModalOpen(false);
                setEditingItem(null);
            }}
            onSave={handleSaveItem}
            initialData={editingItem}
            fournisseursOptions={fournisseursOptions}
         />
      )}
    </div>
  );
}
