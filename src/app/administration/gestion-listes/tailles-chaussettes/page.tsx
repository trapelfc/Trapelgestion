
'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
  DialogDescription,
} from "@/components/ui/dialog";
import { ArrowLeft, PlusCircle, Trash2, Edit3 } from 'lucide-react';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { SOCK_SIZES as INITIAL_SOCK_SIZES, GLOBAL_STOCK_STORAGE_KEY } from '@/config/stock-constants';
import { useToast } from '@/hooks/use-toast';
import type { EquipementItem as StockItem } from '@/app/stock/equipement/page'; 

const SOCK_SIZES_STORAGE_KEY = 'TRAPEL_FC_ADMIN_LIST_SOCK_SIZES';
// GLOBAL_STOCK_STORAGE_KEY importé depuis stock-constants

type StoredStockItem = Omit<StockItem, 'lastUpdated'> & {
  lastUpdated: string;
};

const addSizeFormSchema = z.object({
  newSizeName: z.string().min(1, "Le nom de la taille est requis.").max(20, "Le nom ne doit pas dépasser 20 caractères."),
});
type AddSizeFormData = z.infer<typeof addSizeFormSchema>;

const editSizeFormSchema = z.object({
  editedSizeNameInput: z.string().min(1, "Le nom de la taille est requis.").max(20, "Le nom ne doit pas dépasser 20 caractères."),
});
type EditSizeFormData = z.infer<typeof editSizeFormSchema>;


const getStoredSockSizes = (): string[] => {
  if (typeof window === 'undefined') return [...INITIAL_SOCK_SIZES];
  const stored = localStorage.getItem(SOCK_SIZES_STORAGE_KEY);
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed) && parsed.every(item => typeof item === 'string')) {
        return parsed;
      }
    } catch (e) {
      console.error("Failed to parse sock sizes from localStorage", e);
    }
  }
  const initialSizes = [...INITIAL_SOCK_SIZES];
  localStorage.setItem(SOCK_SIZES_STORAGE_KEY, JSON.stringify(initialSizes));
  return initialSizes;
};

const saveStoredSockSizes = (sizes: string[]) => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(SOCK_SIZES_STORAGE_KEY, JSON.stringify(sizes));
  window.dispatchEvent(new StorageEvent('storage', { key: SOCK_SIZES_STORAGE_KEY }));
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

export default function TaillesChaussettesPage() {
  const [sockSizes, setSockSizes] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);
  const [isConfirmDeleteDialogOpen, setIsConfirmDeleteDialogOpen] = useState(false);
  const { toast } = useToast();

  const [sizeToEdit, setSizeToEdit] = useState<string | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  const addForm = useForm<AddSizeFormData>({
    resolver: zodResolver(addSizeFormSchema),
  });

  const editForm = useForm<EditSizeFormData>({
    resolver: zodResolver(editSizeFormSchema),
  });

  useEffect(() => {
    setSockSizes(getStoredSockSizes());
    setIsLoading(false);

    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === SOCK_SIZES_STORAGE_KEY) {
        setSockSizes(getStoredSockSizes());
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const handleAddSize: SubmitHandler<AddSizeFormData> = (data) => {
    const newName = data.newSizeName.trim();
    if (sockSizes.some(s => s.toLowerCase() === newName.toLowerCase())) {
      toast({
        title: "Erreur",
        description: "Cette taille existe déjà.",
        variant: "destructive",
      });
      return;
    }
    const updatedSizes = [...sockSizes, newName].sort((a, b) => {
      // Attempt a more natural sort if sizes can be numeric ranges like "27-30"
      const regex = /(\d+)/g;
      const numA = parseInt((a.match(regex) || ['0'])[0]);
      const numB = parseInt((b.match(regex) || ['0'])[0]);
      if (!isNaN(numA) && !isNaN(numB) && numA !== numB) {
        return numA - numB;
      }
      return a.localeCompare(b);
    });
    setSockSizes(updatedSizes);
    saveStoredSockSizes(updatedSizes);
    addForm.reset();
    toast({
      title: "Succès",
      description: `Taille "${newName}" ajoutée.`,
    });
  };

  const requestDeleteSize = (sizeName: string) => {
    const globalStockItems = getGlobalStockItemsFromStorage();
    const isSizeUsedInStock = globalStockItems.some(
      (item) => item.itemCategory === 'socks' && 
                 item.sizeBreakdown && 
                 typeof item.sizeBreakdown[sizeName] === 'number' &&
                 item.sizeBreakdown[sizeName]! > 0 
    );

    if (isSizeUsedInStock) {
      toast({
        title: "Suppression impossible",
        description: `La taille "${sizeName}" est actuellement utilisée par un ou plusieurs articles de stock (chaussettes) et ne peut pas être supprimée.`,
        variant: "destructive",
        duration: 5000,
      });
      return;
    }
    
    setItemToDelete(sizeName);
    setIsConfirmDeleteDialogOpen(true);
  };

  const confirmDeleteSize = () => {
    if (itemToDelete) {
      const updatedSizes = sockSizes.filter(s => s !== itemToDelete);
      setSockSizes(updatedSizes);
      saveStoredSockSizes(updatedSizes);
      toast({
        title: "Succès",
        description: `Taille "${itemToDelete}" supprimée.`,
      });
    }
    setIsConfirmDeleteDialogOpen(false);
    setItemToDelete(null);
  };

  const openEditDialog = (sizeName: string) => {
    setSizeToEdit(sizeName);
    editForm.setValue("editedSizeNameInput", sizeName);
    setIsEditDialogOpen(true);
  };

  const handleSaveEditedSize: SubmitHandler<EditSizeFormData> = (data) => {
    if (!sizeToEdit) return;

    const oldName = sizeToEdit;
    const newName = data.editedSizeNameInput.trim();

    if (newName.toLowerCase() !== oldName.toLowerCase() && sockSizes.some(s => s.toLowerCase() === newName.toLowerCase())) {
      toast({
        title: "Erreur",
        description: "Une autre taille avec ce nom existe déjà.",
        variant: "destructive",
      });
      return;
    }

    if (oldName === newName) {
      setIsEditDialogOpen(false);
      setSizeToEdit(null);
      return;
    }

    // Update in sock sizes list
    const updatedSizes = sockSizes.map(s => (s === oldName ? newName : s)).sort((a, b) => {
        const regex = /(\d+)/g;
        const numA = parseInt((a.match(regex) || ['0'])[0]);
        const numB = parseInt((b.match(regex) || ['0'])[0]);
        if (!isNaN(numA) && !isNaN(numB) && numA !== numB) {
            return numA - numB;
        }
        return a.localeCompare(b);
    });
    setSockSizes(updatedSizes);
    saveStoredSockSizes(updatedSizes);

    // Update in global stock items
    const globalStockItems = getGlobalStockItemsFromStorage();
    const updatedStockItems = globalStockItems.map(item => {
      if (item.itemCategory === 'socks' && item.sizeBreakdown && item.sizeBreakdown.hasOwnProperty(oldName)) {
        const newSizeBreakdown = { ...item.sizeBreakdown };
        newSizeBreakdown[newName] = newSizeBreakdown[oldName];
        delete newSizeBreakdown[oldName];
        
        let newAvailableSizes = item.availableSizes;
        if (item.availableSizes && item.availableSizes.includes(oldName)) {
            newAvailableSizes = item.availableSizes.map(s => s === oldName ? newName : s).sort((a,b) => {
                const regex = /(\d+)/g;
                const numA_sort = parseInt((a.match(regex) || ['0'])[0]);
                const numB_sort = parseInt((b.match(regex) || ['0'])[0]);
                if (!isNaN(numA_sort) && !isNaN(numB_sort) && numA_sort !== numB_sort) return numA_sort - numB_sort;
                return a.localeCompare(b);
            });
        }
        return { ...item, sizeBreakdown: newSizeBreakdown, availableSizes: newAvailableSizes, lastUpdated: new Date() };
      }
      return item;
    });
    saveGlobalStockItemsToStorage(updatedStockItems);
    window.dispatchEvent(new StorageEvent('storage', { key: GLOBAL_STOCK_STORAGE_KEY }));

    toast({
      title: "Succès",
      description: `Taille "${oldName}" modifiée en "${newName}". Les articles de stock associés ont été mis à jour.`,
    });
    setIsEditDialogOpen(false);
    setSizeToEdit(null);
  };

  if (isLoading) {
    return <div className="container mx-auto p-4 text-center">Chargement...</div>;
  }

  return (
    <div className="container mx-auto p-4">
      <div className="mb-6 flex items-center">
        <Button variant="outline" size="icon" asChild className="mr-4">
          <Link href="/administration/gestion-listes">
            <ArrowLeft className="h-4 w-4" />
            <span className="sr-only">Retour à la Gestion des Listes</span>
          </Link>
        </Button>
        <h1 className="text-2xl font-bold">Gestion des Tailles de Chaussettes</h1>
      </div>

      <form onSubmit={addForm.handleSubmit(handleAddSize)} className="mb-6 flex items-start gap-2">
        <div className="flex-grow">
          <Input
            {...addForm.register("newSizeName")}
            placeholder="Nouvelle taille (ex: 27-30)"
            className={addForm.formState.errors.newSizeName ? "border-destructive" : ""}
          />
          {addForm.formState.errors.newSizeName && (
            <p className="text-sm text-destructive mt-1">{addForm.formState.errors.newSizeName.message}</p>
          )}
        </div>
        <Button type="submit">
          <PlusCircle className="mr-2 h-4 w-4" />
          Ajouter
        </Button>
      </form>

      {sockSizes.length > 0 ? (
        <div className="rounded-md border shadow-sm">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="py-2 px-4">Taille</TableHead>
                <TableHead className="text-right py-2 px-4 w-[150px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sockSizes.map((taille) => (
                <TableRow key={taille}>
                  <TableCell className="py-2 px-4 font-medium">{taille}</TableCell>
                  <TableCell className="py-2 px-4 text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openEditDialog(taille)}
                      aria-label={`Modifier ${taille}`}
                      className="mr-2"
                    >
                      <Edit3 className="h-4 w-4 text-blue-600" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => requestDeleteSize(taille)}
                      aria-label={`Supprimer ${taille}`}
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
        <p className="text-center text-muted-foreground">Aucune taille de chaussette à afficher.</p>
      )}

      {itemToDelete && (
        <AlertDialog open={isConfirmDeleteDialogOpen} onOpenChange={setIsConfirmDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
              <AlertDialogDescription>
                Voulez-vous vraiment supprimer la taille "{itemToDelete}" ?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setIsConfirmDeleteDialogOpen(false)}>Annuler</AlertDialogCancel>
              <AlertDialogAction onClick={confirmDeleteSize} className="bg-destructive hover:bg-destructive/90">Supprimer</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}

      {sizeToEdit && (
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Modifier la taille</DialogTitle>
              <DialogDescription>
                Modifier le nom de la taille "{sizeToEdit}".
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={editForm.handleSubmit(handleSaveEditedSize)} className="space-y-4">
              <Input
                {...editForm.register("editedSizeNameInput")}
                defaultValue={sizeToEdit}
                className={editForm.formState.errors.editedSizeNameInput ? "border-destructive" : ""}
              />
              {editForm.formState.errors.editedSizeNameInput && (
                <p className="text-sm text-destructive mt-1">{editForm.formState.errors.editedSizeNameInput.message}</p>
              )}
              <DialogFooter>
                <DialogClose asChild>
                  <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>Annuler</Button>
                </DialogClose>
                <Button type="submit">Enregistrer les modifications</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
    
