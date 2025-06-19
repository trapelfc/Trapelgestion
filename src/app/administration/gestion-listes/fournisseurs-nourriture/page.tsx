
'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
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
import { ArrowLeft, PlusCircle, Trash2, Edit3 } from 'lucide-react';
import { INITIAL_FOOD_SUPPLIERS, type FoodSupplierDetail, GLOBAL_STOCK_STORAGE_KEY } from '@/config/stock-constants';
import { useToast } from '@/hooks/use-toast';
import type { EquipementItem as StockItem } from '@/app/stock/equipement/page';
import { FoodSupplierFormModal, type FoodSupplierFormData } from '@/components/administration/food-supplier-form-modal';

export const FOOD_SUPPLIERS_STORAGE_KEY = 'TRAPEL_FC_ADMIN_LIST_FOOD_SUPPLIERS';
// GLOBAL_STOCK_STORAGE_KEY importé depuis stock-constants

type StoredStockItem = Omit<StockItem, 'lastUpdated'> & {
  lastUpdated: string;
};

export const getStoredSuppliers = (): FoodSupplierDetail[] => {
  if (typeof window === 'undefined') return [...INITIAL_FOOD_SUPPLIERS];
  const stored = localStorage.getItem(FOOD_SUPPLIERS_STORAGE_KEY);
  if (stored) {
    try {
      const parsed = JSON.parse(stored) as FoodSupplierDetail[];
      if (Array.isArray(parsed) && parsed.every(item => item.id && item.name)) {
        return parsed.sort((a, b) => a.name.localeCompare(b.name));
      }
    } catch (e) {
      console.error("Failed to parse suppliers from localStorage", e);
    }
  }
  const initialSuppliers = [...INITIAL_FOOD_SUPPLIERS];
  localStorage.setItem(FOOD_SUPPLIERS_STORAGE_KEY, JSON.stringify(initialSuppliers));
  return initialSuppliers.sort((a, b) => a.name.localeCompare(b.name));
};

const saveStoredSuppliers = (suppliers: FoodSupplierDetail[]) => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(FOOD_SUPPLIERS_STORAGE_KEY, JSON.stringify(suppliers));
  window.dispatchEvent(new StorageEvent('storage', { key: FOOD_SUPPLIERS_STORAGE_KEY }));
};

const getGlobalStockItemsFromStorage = (): StockItem[] => {
  if (typeof window === 'undefined') return [];
  const storedData = localStorage.getItem(GLOBAL_STOCK_STORAGE_KEY);
  if (storedData) {
    try {
      const items = JSON.parse(storedData) as StoredStockItem[];
      return items.map(item => ({
        ...item,
        lastUpdated: item.lastUpdated ? new Date(item.lastUpdated) : new Date(),
      }));
    } catch (error) {
      console.error("Error parsing global stock data from localStorage:", error);
      return [];
    }
  }
  return [];
};

const saveGlobalStockItemsToStorage = (items: StockItem[]) => {
  if (typeof window === 'undefined') return;
  const itemsToStore: StoredStockItem[] = items.map(item => ({
    ...item,
    lastUpdated: item.lastUpdated.toISOString(),
  }));
  localStorage.setItem(GLOBAL_STOCK_STORAGE_KEY, JSON.stringify(itemsToStore));
};


export default function FournisseursNourriturePage() {
  const [suppliers, setSuppliers] = useState<FoodSupplierDetail[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [itemToDelete, setItemToDelete] = useState<FoodSupplierDetail | null>(null);
  const [isConfirmDeleteDialogOpen, setIsConfirmDeleteDialogOpen] = useState(false);
  const { toast } = useToast();

  const [supplierToEdit, setSupplierToEdit] = useState<FoodSupplierDetail | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  

  useEffect(() => {
    setSuppliers(getStoredSuppliers());
    setIsLoading(false);

    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === FOOD_SUPPLIERS_STORAGE_KEY) {
        setSuppliers(getStoredSuppliers());
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const handleOpenModal = (supplier?: FoodSupplierDetail) => {
    setSupplierToEdit(supplier || null);
    setIsModalOpen(true);
  };

  const handleSaveSupplier = (data: FoodSupplierFormData) => {
    let updatedSuppliers;
    const newName = data.name.trim();

    if (supplierToEdit) { // Edition
      if (newName.toLowerCase() !== supplierToEdit.name.toLowerCase() && suppliers.some(s => s.id !== supplierToEdit.id && s.name.toLowerCase() === newName.toLowerCase())) {
        toast({ title: "Erreur", description: "Un autre fournisseur avec ce nom existe déjà.", variant: "destructive" });
        return;
      }
      const oldName = supplierToEdit.name;
      updatedSuppliers = suppliers.map(s => (s.id === supplierToEdit.id ? { ...supplierToEdit, ...data, name: newName } : s));
      
      if (oldName !== newName) {
        const globalStockItems = getGlobalStockItemsFromStorage();
        const updatedStockItems = globalStockItems.map(item => {
          if (item.itemCategory === 'food' && item.supplier === oldName) {
            return { ...item, supplier: newName, lastUpdated: new Date() };
          }
          return item;
        });
        saveGlobalStockItemsToStorage(updatedStockItems);
        window.dispatchEvent(new StorageEvent('storage', { key: GLOBAL_STOCK_STORAGE_KEY }));
        toast({ title: "Succès", description: `Fournisseur "${oldName}" modifié en "${newName}". Articles de stock mis à jour.` });
      } else {
        toast({ title: "Succès", description: `Fournisseur "${newName}" mis à jour.` });
      }

    } else { // Ajout
      if (suppliers.some(s => s.name.toLowerCase() === newName.toLowerCase())) {
        toast({ title: "Erreur", description: "Ce fournisseur existe déjà.", variant: "destructive" });
        return;
      }
      const newSupplier: FoodSupplierDetail = {
        id: crypto.randomUUID(),
        ...data,
        name: newName,
      };
      updatedSuppliers = [...suppliers, newSupplier];
      toast({ title: "Succès", description: `Fournisseur "${newName}" ajouté.` });
    }
    
    setSuppliers(updatedSuppliers.sort((a, b) => a.name.localeCompare(b.name)));
    saveStoredSuppliers(updatedSuppliers);
    setIsModalOpen(false);
    setSupplierToEdit(null);
  };

  const requestDeleteSupplier = (supplier: FoodSupplierDetail) => {
    const globalStockItems = getGlobalStockItemsFromStorage();
    const isSupplierUsed = globalStockItems.some(
      (item) => item.itemCategory === 'food' && item.supplier === supplier.name
    );

    if (isSupplierUsed) {
      toast({
        title: "Suppression impossible",
        description: `Le fournisseur "${supplier.name}" est utilisé par un ou plusieurs articles de stock et ne peut pas être supprimé.`,
        variant: "destructive",
        duration: 5000,
      });
      return;
    }

    setItemToDelete(supplier);
    setIsConfirmDeleteDialogOpen(true);
  };

  const confirmDeleteSupplier = () => {
    if (itemToDelete) {
      const updatedSuppliers = suppliers.filter(s => s.id !== itemToDelete.id);
      setSuppliers(updatedSuppliers);
      saveStoredSuppliers(updatedSuppliers);
      toast({ title: "Succès", description: `Fournisseur "${itemToDelete.name}" supprimé.` });
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
            <h1 className="text-2xl font-bold">Fournisseurs</h1>
        </div>
         <Button onClick={() => handleOpenModal()}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Ajouter un Fournisseur
        </Button>
      </div>
      
      {suppliers.length > 0 ? (
        <div className="rounded-md border shadow-sm">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="py-2 px-4">Nom du Fournisseur</TableHead>
                <TableHead className="py-2 px-4">Nom Contact</TableHead>
                <TableHead className="py-2 px-4">E-mail</TableHead>
                <TableHead className="py-2 px-4">Téléphone</TableHead>
                <TableHead className="text-right py-2 px-4 w-[150px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {suppliers.map((supplier) => (
                <TableRow key={supplier.id}>
                  <TableCell className="py-2 px-4 font-medium">{supplier.name}</TableCell>
                  <TableCell className="py-2 px-4">{supplier.contactName || '-'}</TableCell>
                  <TableCell className="py-2 px-4">{supplier.email || '-'}</TableCell>
                  <TableCell className="py-2 px-4">{supplier.phone || '-'}</TableCell>
                  <TableCell className="py-2 px-4 text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleOpenModal(supplier)}
                      aria-label={`Modifier ${supplier.name}`}
                      className="mr-2"
                    >
                      <Edit3 className="h-4 w-4 text-blue-600" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => requestDeleteSupplier(supplier)}
                      aria-label={`Supprimer ${supplier.name}`}
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
        <p className="text-center text-muted-foreground">Aucun fournisseur à afficher.</p>
      )}

      {itemToDelete && (
        <AlertDialog open={isConfirmDeleteDialogOpen} onOpenChange={setIsConfirmDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
              <AlertDialogDescription>
                Voulez-vous vraiment supprimer le fournisseur "{itemToDelete.name}" ?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setIsConfirmDeleteDialogOpen(false)}>Annuler</AlertDialogCancel>
              <AlertDialogAction onClick={confirmDeleteSupplier} className="bg-destructive hover:bg-destructive/90">Supprimer</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}

      {isModalOpen && (
        <FoodSupplierFormModal
            isOpen={isModalOpen}
            onClose={() => {
                setIsModalOpen(false);
                setSupplierToEdit(null);
            }}
            onSave={handleSaveSupplier}
            initialData={supplierToEdit}
        />
      )}
    </div>
  );
}
