
'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Edit3, PlusCircle, Trash2, Palette } from 'lucide-react';
import { 
  type CategoryId, 
  AGE_BASED_CATEGORY_RULES, 
  REFERENCE_YEAR_STORAGE_KEY,
  getActiveReferenceYear,
  getGeneratedCategoriesConfig,
  type CategoryConfigItem,
  getSeasonLabel,
  getStoredManualCategoryDefinitions,
  saveStoredManualCategoryDefinitions,
  type ManualCategoryDefinition,
  MANUAL_CATEGORY_DEFINITIONS_STORAGE_KEY,
  INITIAL_MANUAL_CATEGORIES_DEFINITIONS,
  CATEGORY_COLORS_STORAGE_KEY, // New import
  getStoredCategoryColors,     // New import
  saveStoredCategoryColors,    // New import
} from '@/config/licencies-constants';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
  DialogDescription,
} from "@/components/ui/dialog";
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useState, useEffect, useCallback } from 'react';
import type { LicencieItem } from '@/app/inscription/nouveau-licencie/page'; 
import type { PlanningEvent } from '@/app/planning/occupation-stades/page'; 

const LICENCIES_STORAGE_KEY = 'TRAPEL_FC_LICENCIES_DATA';
const PLANNING_EVENTS_STORAGE_KEY = 'TRAPEL_FC_PLANNING_EVENTS_DATA';


const getCategoryCondition = (categoryId: CategoryId, referenceYear: number): string => {
  const ageRule = AGE_BASED_CATEGORY_RULES.find(
    (rule) => categoryId.startsWith(rule.baseId)
  );

  if (ageRule) {
    const isFemale = categoryId.endsWith(' F');
    const genderLabel = isFemale ? 'Née' : 'Né(e)';
    if ('ages' in ageRule) {
      const birthYear1 = referenceYear - ageRule.ages[0];
      const birthYear2 = referenceYear - ageRule.ages[1];
      const sortedYears = [birthYear1, birthYear2].sort((a,b) => a-b);
      return `${genderLabel} en ${sortedYears[0]} ou ${sortedYears[1]}`;
    } else if ('ageMin' in ageRule) {
      const birthYear = referenceYear - ageRule.ageMin;
      return `${genderLabel} avant ou en ${birthYear}`;
    }
  }

  const manualDefs = getStoredManualCategoryDefinitions();
  const manualRule = manualDefs.find(rule => rule.id === categoryId);
  if (manualRule) {
    return "Catégorie manuelle"; 
  }

  return 'Condition non spécifiée';
};

const generateIdFromLabel = (label: string): string => {
  return label.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, '-').replace(/[^a-z0-9-]/gi, '').toLowerCase();
};


export default function CategoriesLicenciesPage() {
  const [activeReferenceYear, setActiveReferenceYear] = useState<number>(DEFAULT_FALLBACK_REFERENCE_YEAR);
  const [activeSeasonLabel, setActiveSeasonLabel] = useState<string>('');
  const [categoriesToDisplay, setCategoriesToDisplay] = useState<CategoryConfigItem[]>([]);
  const { toast } = useToast();

  const [isEditLabelModalOpen, setIsEditLabelModalOpen] = useState(false);
  const [categoryToEditLabel, setCategoryToEditLabel] = useState<ManualCategoryDefinition | null>(null);
  const [editedLabelInput, setEditedLabelInput] = useState('');
  
  const [isEditColorModalOpen, setIsEditColorModalOpen] = useState(false);
  const [categoryToEditColor, setCategoryToEditColor] = useState<CategoryConfigItem | null>(null); // Can be any category
  const [editedColorInput, setEditedColorInput] = useState<string>('#000000');


  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newCategoryLabelInput, setNewCategoryLabelInput] = useState('');
  const [newCategoryColorInput, setNewCategoryColorInput] = useState<string>('#CCCCCC');


  const [isConfirmDeleteModalOpen, setIsConfirmDeleteModalOpen] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<ManualCategoryDefinition | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const updateDisplayedCategories = useCallback(() => {
    const currentYear = getActiveReferenceYear(); 
    const currentSeason = getSeasonLabel(currentYear);
    const currentCategories = getGeneratedCategoriesConfig(currentYear); 

    setActiveReferenceYear(currentYear);
    setActiveSeasonLabel(currentSeason);
    setCategoriesToDisplay(currentCategories);
    setIsLoading(false);
  }, []);


  useEffect(() => {
    setIsLoading(true);
    updateDisplayedCategories(); 

    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === REFERENCE_YEAR_STORAGE_KEY || 
          event.key === MANUAL_CATEGORY_DEFINITIONS_STORAGE_KEY ||
          event.key === CATEGORY_COLORS_STORAGE_KEY) { // Listen to color changes too
        updateDisplayedCategories();
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [updateDisplayedCategories]);

  const openEditLabelModal = (category: ManualCategoryDefinition) => {
    setCategoryToEditLabel(category);
    setEditedLabelInput(category.label);
    setIsEditLabelModalOpen(true);
  };
  
  const openEditColorModal = (category: CategoryConfigItem) => {
    setCategoryToEditColor(category);
    setEditedColorInput(category.color || '#CCCCCC'); 
    setIsEditColorModalOpen(true);
  };

  const handleSaveEditedLabel = () => {
    if (!categoryToEditLabel || !editedLabelInput.trim()) {
      toast({ title: "Erreur", description: "Le libellé ne peut pas être vide.", variant: "destructive" });
      return;
    }
    if (editedLabelInput.trim() === categoryToEditLabel.label) {
      setIsEditLabelModalOpen(false);
      setCategoryToEditLabel(null);
      return;
    }

    const currentManualDefs = getStoredManualCategoryDefinitions();
    if (currentManualDefs.some(def => def.id !== categoryToEditLabel.id && def.label.toLowerCase() === editedLabelInput.trim().toLowerCase())) {
      toast({ title: "Erreur", description: "Une catégorie manuelle avec ce libellé existe déjà.", variant: "destructive" });
      return;
    }

    const updatedDefs = currentManualDefs.map(def => 
      def.id === categoryToEditLabel.id ? { ...def, label: editedLabelInput.trim() } : def
    );
    saveStoredManualCategoryDefinitions(updatedDefs);
    
    toast({ title: "Succès", description: `Libellé de la catégorie "${categoryToEditLabel.label}" mis à jour.` });
    setIsEditLabelModalOpen(false);
    setCategoryToEditLabel(null);
  };

  const handleSaveEditedColor = () => {
    if (!categoryToEditColor) return;
  
    const allColors = getStoredCategoryColors();
    allColors[categoryToEditColor.id] = editedColorInput;
    saveStoredCategoryColors(allColors);
  
    toast({ title: "Succès", description: `Couleur de la catégorie "${categoryToEditColor.label}" mise à jour.` });
    setIsEditColorModalOpen(false);
    setCategoryToEditColor(null);
  };
  
  const openAddModal = () => {
    setNewCategoryLabelInput('');
    setNewCategoryColorInput('#CCCCCC');
    setIsAddModalOpen(true);
  };

  const handleAddNewCategory = () => {
    const newLabel = newCategoryLabelInput.trim();
    if (!newLabel) {
      toast({ title: "Erreur", description: "Le libellé de la nouvelle catégorie ne peut pas être vide.", variant: "destructive" });
      return;
    }
    const currentManualDefs = getStoredManualCategoryDefinitions();
    if (currentManualDefs.some(def => def.label.toLowerCase() === newLabel.toLowerCase())) {
      toast({ title: "Erreur", description: "Une catégorie manuelle avec ce libellé existe déjà.", variant: "destructive" });
      return;
    }
    let newId = generateIdFromLabel(newLabel);
    let counter = 1;
    while (currentManualDefs.some(def => def.id === newId) || AGE_BASED_CATEGORY_RULES.some(rule => rule.baseId === newId)) {
      newId = `${generateIdFromLabel(newLabel)}-${counter}`;
      counter++;
    }

    const newCategory: ManualCategoryDefinition = { id: newId, label: newLabel, color: newCategoryColorInput };
    saveStoredManualCategoryDefinitions([...currentManualDefs, newCategory]);
    
    // Save initial color also to the general color storage
    const allColors = getStoredCategoryColors();
    allColors[newId] = newCategoryColorInput;
    saveStoredCategoryColors(allColors);

    toast({ title: "Succès", description: `Catégorie manuelle "${newLabel}" ajoutée.` });
    setIsAddModalOpen(false);
  };

  const openConfirmDeleteModal = (category: ManualCategoryDefinition) => {
    const licencies: LicencieItem[] = JSON.parse(localStorage.getItem(LICENCIES_STORAGE_KEY) || '[]');
    const planningEvents: PlanningEvent[] = JSON.parse(localStorage.getItem(PLANNING_EVENTS_STORAGE_KEY) || '[]');

    const isUsedByLicencie = licencies.some(l => l.categorie === category.id);
    const isUsedInPlanning = planningEvents.some(p => p.categoryName === category.id);

    if (isUsedByLicencie || isUsedInPlanning) {
      let usageMessage = "Cette catégorie est actuellement utilisée";
      if (isUsedByLicencie && isUsedInPlanning) usageMessage += " par des licenciés et dans le planning.";
      else if (isUsedByLicencie) usageMessage += " par des licenciés.";
      else if (isUsedInPlanning) usageMessage += " dans le planning.";
      usageMessage += " Elle ne peut pas être supprimée.";
      toast({ title: "Suppression impossible", description: usageMessage, variant: "destructive", duration: 5000 });
      return;
    }

    setCategoryToDelete(category);
    setIsConfirmDeleteModalOpen(true);
  };

  const handleConfirmDelete = () => {
    if (!categoryToDelete) return;
    const currentManualDefs = getStoredManualCategoryDefinitions();
    const updatedDefs = currentManualDefs.filter(def => def.id !== categoryToDelete.id);
    saveStoredManualCategoryDefinitions(updatedDefs);

    // Also remove color from general color storage if it exists
    const allColors = getStoredCategoryColors();
    if (allColors[categoryToDelete.id]) {
      delete allColors[categoryToDelete.id];
      saveStoredCategoryColors(allColors);
    }

    toast({ title: "Succès", description: `Catégorie manuelle "${categoryToDelete.label}" supprimée.` });
    setIsConfirmDeleteModalOpen(false);
    setCategoryToDelete(null);
  };

  if (isLoading) {
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
              <h1 className="text-2xl font-bold">Gestion des Catégories de Licenciés</h1>
          </div>
          <Button disabled>
            <PlusCircle className="mr-2 h-4 w-4" />
            Ajouter Catégorie Manuelle
          </Button>
        </div>
        <div className="text-center p-8">Chargement des catégories...</div>
      </div>
    );
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
            <h1 className="text-2xl font-bold">Gestion des Catégories de Licenciés</h1>
        </div>
        <Button onClick={openAddModal}>
          <PlusCircle className="mr-2 h-4 w-4" />
          Ajouter Catégorie Manuelle
        </Button>
      </div>
      
      <div className="mb-6 p-4 border rounded-md bg-muted text-muted-foreground">
        <p className="text-sm">Cette page liste les catégories de licenciés. Les catégories basées sur l'âge sont calculées automatiquement. Vous pouvez ajouter/supprimer des catégories manuelles, et modifier le libellé des catégories manuelles ou la couleur de n'importe quelle catégorie.</p>
        <p className="text-xs mt-1">Année de référence pour le calcul des âges : <span className="font-semibold">{activeReferenceYear}</span> ({activeSeasonLabel}). Modifiable dans "Administration &gt; Paramètres".</p>
      </div>

      {categoriesToDisplay.length > 0 ? (
        <div className="rounded-md border shadow-sm">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="py-2 px-4">ID Catégorie</TableHead>
                <TableHead className="py-2 px-4">Libellé (pour sélection)</TableHead>
                <TableHead className="py-2 px-4 w-[100px]">Couleur</TableHead>
                <TableHead className="py-2 px-4">Années de Naissance / Condition ({activeSeasonLabel})</TableHead>
                <TableHead className="text-right py-2 px-4 w-[150px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {categoriesToDisplay.map((cat) => {
                return (
                  <TableRow key={cat.id}>
                    <TableCell className="py-2 px-4 font-medium">{cat.id}</TableCell>
                    <TableCell className="py-2 px-4">{cat.label}</TableCell>
                    <TableCell className="py-2 px-4">
                      {cat.color ? (
                        <div className="h-5 w-10 rounded-sm border" style={{ backgroundColor: cat.color }} />
                      ) : (
                        <span className="text-xs text-muted-foreground">N/A</span>
                      )}
                    </TableCell>
                    <TableCell className="py-2 px-4 text-sm">
                      {getCategoryCondition(cat.id, activeReferenceYear)}
                    </TableCell>
                    <TableCell className="py-2 px-4 text-right">
                      {cat.isManual && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditLabelModal(cat as ManualCategoryDefinition)}
                          aria-label={`Modifier le libellé de ${cat.label}`}
                          title="Modifier le libellé"
                          className="mr-1"
                        >
                          <Edit3 className="h-4 w-4 text-blue-600" />
                        </Button>
                      )}
                       <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEditColorModal(cat)}
                        aria-label={`Modifier la couleur de ${cat.label}`}
                        title="Modifier la couleur"
                        className="mr-1"
                      >
                        <Palette className="h-4 w-4 text-purple-600" />
                      </Button>
                      {cat.isManual && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openConfirmDeleteModal(cat as ManualCategoryDefinition)}
                          aria-label={`Supprimer ${cat.label}`}
                          title="Supprimer"
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      ) : (
        <p className="text-center text-muted-foreground">Aucune catégorie de licencié à afficher.</p>
      )}

      {isEditLabelModalOpen && categoryToEditLabel && (
        <Dialog open={isEditLabelModalOpen} onOpenChange={setIsEditLabelModalOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Modifier le libellé de la catégorie manuelle</DialogTitle>
              <DialogDescription>
                Catégorie ID : {categoryToEditLabel.id}
              </DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-4">
              <div>
                <Label htmlFor="editedLabel">Libellé</Label>
                <Input 
                  id="editedLabel"
                  value={editedLabelInput}
                  onChange={(e) => setEditedLabelInput(e.target.value)}
                  placeholder="Nouveau libellé"
                />
              </div>
            </div>
            <DialogFooter>
              <DialogClose asChild><Button type="button" variant="outline" onClick={() => setIsEditLabelModalOpen(false)}>Annuler</Button></DialogClose>
              <Button type="button" onClick={handleSaveEditedLabel}>Enregistrer</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {isEditColorModalOpen && categoryToEditColor && (
        <Dialog open={isEditColorModalOpen} onOpenChange={setIsEditColorModalOpen}>
          <DialogContent className="sm:max-w-xs">
            <DialogHeader>
              <DialogTitle>Modifier la couleur</DialogTitle>
              <DialogDescription>
                Catégorie: {categoryToEditColor.label}
              </DialogDescription>
            </DialogHeader>
            <div className="py-4 flex justify-center">
                <Input 
                  id="editedColor"
                  type="color"
                  value={editedColorInput}
                  onChange={(e) => setEditedColorInput(e.target.value)}
                  className="h-16 w-32 p-1"
                />
            </div>
            <DialogFooter>
              <DialogClose asChild><Button type="button" variant="outline" onClick={() => setIsEditColorModalOpen(false)}>Annuler</Button></DialogClose>
              <Button type="button" onClick={handleSaveEditedColor}>Enregistrer</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}


      {isAddModalOpen && (
         <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
           <DialogContent>
             <DialogHeader>
               <DialogTitle>Ajouter une catégorie manuelle</DialogTitle>
               <DialogDescription>
                 Saisissez le libellé et choisissez la couleur de la nouvelle catégorie manuelle. Un ID unique sera généré.
               </DialogDescription>
             </DialogHeader>
             <div className="py-4 space-y-4">
                <div>
                    <Label htmlFor="newCategoryLabel">Libellé</Label>
                    <Input 
                    id="newCategoryLabel"
                    value={newCategoryLabelInput}
                    onChange={(e) => setNewCategoryLabelInput(e.target.value)}
                    placeholder="Libellé de la nouvelle catégorie"
                    />
                </div>
                <div>
                    <Label htmlFor="newCategoryColor">Couleur</Label>
                    <Input 
                    id="newCategoryColor"
                    type="color"
                    value={newCategoryColorInput}
                    onChange={(e) => setNewCategoryColorInput(e.target.value)}
                    className="h-10"
                    />
                </div>
             </div>
             <DialogFooter>
               <DialogClose asChild><Button type="button" variant="outline" onClick={() => setIsAddModalOpen(false)}>Annuler</Button></DialogClose>
               <Button type="button" onClick={handleAddNewCategory}>Ajouter</Button>
             </DialogFooter>
           </DialogContent>
         </Dialog>
       )}

      {isConfirmDeleteModalOpen && categoryToDelete && (
        <AlertDialog open={isConfirmDeleteModalOpen} onOpenChange={setIsConfirmDeleteModalOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
              <AlertDialogDescription>
                Voulez-vous vraiment supprimer la catégorie manuelle "{categoryToDelete.label}" (ID: {categoryToDelete.id}) ? Cette action est irréversible si la catégorie n'est pas utilisée.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setIsConfirmDeleteModalOpen(false)}>Annuler</AlertDialogCancel>
              <AlertDialogAction onClick={handleConfirmDelete} className="bg-destructive hover:bg-destructive/90">Supprimer</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}

const DEFAULT_FALLBACK_REFERENCE_YEAR = new Date().getFullYear() + 1;

    