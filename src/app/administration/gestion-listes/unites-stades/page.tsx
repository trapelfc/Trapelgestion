
'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft, PlusCircle, Edit, Trash2 } from 'lucide-react';
import type { CommuneDefinition, FieldDefinition, PlannableUnit } from '@/app/planning/occupation-stades/page';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger as ShadcnAccordionTrigger } from "@/components/ui/accordion";
import { useState, useEffect } from 'react';
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
  DialogClose,
  DialogContent as ShadcnDialogContent,
  DialogDescription as ShadcnDialogDescription,
  DialogFooter as ShadcnDialogFooter,
  DialogHeader as ShadcnDialogHeader,
  DialogTitle as ShadcnDialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';


const STADES_CONFIG_STORAGE_KEY = 'TRAPEL_FC_STADES_CONFIG_DATA';
const PLANNING_EVENTS_STORAGE_KEY = 'TRAPEL_FC_PLANNING_EVENTS_DATA';

// Utilisation de la constante DEFAULT_STADES_CONFIG_FALLBACK de la page planning
// si aucune configuration n'est trouvée dans le localStorage.
// Assurez-vous que ce chemin d'importation et le nom de la constante sont corrects.
import { DEFAULT_STADES_CONFIG_FALLBACK } from '@/app/planning/occupation-stades/page';


interface PlanningEvent { id: string; date: string; startTime: string; endTime: string; stadeUnitId: string; categoryName: string; }

const getPlanningEventsFromStorage = (): PlanningEvent[] => {
  if (typeof window === 'undefined') return [];
  const stored = localStorage.getItem(PLANNING_EVENTS_STORAGE_KEY);
  return stored ? JSON.parse(stored) : [];
};


const getStadesConfigFromStorage = (): CommuneDefinition[] => {
  if (typeof window === 'undefined') return [...DEFAULT_STADES_CONFIG_FALLBACK];
  const stored = localStorage.getItem(STADES_CONFIG_STORAGE_KEY);
  if (stored) {
    try {
      const parsed = JSON.parse(stored) as CommuneDefinition[];
      if (Array.isArray(parsed) && parsed.every(c => c.name && Array.isArray(c.fields) && c.id && typeof c.colspan === 'number')) {
        const isValidConfig = parsed.every(commune =>
          commune.fields.every(field =>
            field.name && Array.isArray(field.units) && field.id && typeof field.colspan === 'number' &&
            field.units.every(unit => unit.headerName && unit.id)
          )
        );
        if (isValidConfig) return parsed;
      }
    } catch (e) { console.error("Failed to parse stades config from localStorage", e); }
  }
  const initialConfig = [...DEFAULT_STADES_CONFIG_FALLBACK];
  localStorage.setItem(STADES_CONFIG_STORAGE_KEY, JSON.stringify(initialConfig));
  return initialConfig;
};

const saveStadesConfigToStorage = (config: CommuneDefinition[]) => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STADES_CONFIG_STORAGE_KEY, JSON.stringify(config));
  window.dispatchEvent(new StorageEvent('storage', { key: STADES_CONFIG_STORAGE_KEY }));
};

export default function UnitesStadesPage() {
  const [stadesConfig, setStadesConfig] = useState<CommuneDefinition[]>([]);
  const [itemToDelete, setItemToDelete] = useState<{ type: 'commune' | 'field' | 'unit', communeId?: string, fieldId?: string, unitId?: string, name: string } | null>(null);
  const [isConfirmDeleteDialogOpen, setIsConfirmDeleteDialogOpen] = useState(false);
  const { toast } = useToast();

  const [itemToEdit, setItemToEdit] = useState<{ type: 'commune' | 'field' | 'unit', id: string, currentName: string, parentId1?: string, parentId2?: string } | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editedName, setEditedName] = useState('');


  useEffect(() => {
    setStadesConfig(getStadesConfigFromStorage());
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === STADES_CONFIG_STORAGE_KEY) {
        setStadesConfig(getStadesConfigFromStorage());
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const recalculateColspans = (config: CommuneDefinition[]): CommuneDefinition[] => {
    return config.map(commune => {
      let communeColspan = 0;
      const updatedFields = commune.fields.map(field => {
        const fieldColspan = field.units.length > 0 ? field.units.length : 1;
        communeColspan += fieldColspan;
        return { ...field, colspan: fieldColspan };
      });
      return { ...commune, fields: updatedFields, colspan: communeColspan > 0 ? communeColspan : 1 };
    });
  };

  const handleAddCommune = () => {
    let newCommuneName = "Nouvelle Commune";
    let counter = 1;
    // Ensure unique default name if "Nouvelle Commune" already exists
    while (stadesConfig.some(c => c.name.toLowerCase() === newCommuneName.toLowerCase())) {
      newCommuneName = `Nouvelle Commune ${counter}`;
      counter++;
    }

    const newCommune: CommuneDefinition = {
      id: crypto.randomUUID(),
      name: newCommuneName,
      fields: [],
      colspan: 1
    };
    const updatedConfig = recalculateColspans([...stadesConfig, newCommune]);
    setStadesConfig(updatedConfig);
    saveStadesConfigToStorage(updatedConfig);
    toast({ title: "Succès", description: `Commune "${newCommuneName}" ajoutée. Vous pouvez la renommer.` });
  };

  const handleAddField = (communeId: string) => {
    const commune = stadesConfig.find(c => c.id === communeId);
    if (!commune) return;

    let newFieldName = "Nouveau Terrain";
    let counter = 1;
    while (commune.fields.some(f => f.name.toLowerCase() === newFieldName.toLowerCase())) {
      newFieldName = `Nouveau Terrain ${counter}`;
      counter++;
    }

    const updatedConfig = stadesConfig.map(c => {
      if (c.id === communeId) {
        const newField: FieldDefinition = {
          id: crypto.randomUUID(),
          name: newFieldName,
          units: [],
          colspan: 1
        };
        return { ...c, fields: [...c.fields, newField] };
      }
      return c;
    });
    const finalConfig = recalculateColspans(updatedConfig);
    setStadesConfig(finalConfig);
    saveStadesConfigToStorage(finalConfig);
    toast({ title: "Succès", description: `Terrain "${newFieldName}" ajouté à ${commune.name}. Vous pouvez le renommer.` });
  };

  const handleAddUnit = (communeId: string, fieldId: string) => {
    const commune = stadesConfig.find(c => c.id === communeId);
    const field = commune?.fields.find(f => f.id === fieldId);
    if (!field) return;

    let newUnitName = "Nouvelle Unité";
    let counter = 1;
    while (field.units.some(u => u.headerName.toLowerCase() === newUnitName.toLowerCase())) {
      newUnitName = `Nouvelle Unité ${counter}`;
      counter++;
    }

    const updatedConfig = stadesConfig.map(c => {
      if (c.id === communeId) {
        const updatedFields = c.fields.map(f => {
          if (f.id === fieldId) {
            const newUnit: PlannableUnit = {
              id: crypto.randomUUID(),
              headerName: newUnitName
            };
            return { ...f, units: [...f.units, newUnit] };
          }
          return f;
        });
        return { ...c, fields: updatedFields };
      }
      return c;
    });
    const finalConfig = recalculateColspans(updatedConfig);
    setStadesConfig(finalConfig);
    saveStadesConfigToStorage(finalConfig);
    toast({ title: "Succès", description: `Unité "${newUnitName}" ajoutée à ${field.name}. Vous pouvez la renommer.` });
  };


  const requestDeleteItem = (type: 'commune' | 'field' | 'unit', id: string, parentId1?: string, parentId2?: string) => {
    const commune = stadesConfig.find(c => c.id === (type === 'commune' ? id : parentId1));
    const field = type !== 'commune' && commune ? commune.fields.find(f => f.id === (type === 'field' ? id : parentId2)) : undefined;
    const unit = type === 'unit' && field ? field.units.find(u => u.id === id) : undefined;

    const name = unit?.headerName || field?.name || commune?.name || "Élément inconnu";

    let itemPath = { type, name } as any;
    if (type === 'commune') itemPath.communeId = id;
    if (type === 'field') { itemPath.communeId = parentId1; itemPath.fieldId = id; }
    if (type === 'unit') { itemPath.communeId = parentId1; itemPath.fieldId = parentId2; itemPath.unitId = id; }

    const planningEvents = getPlanningEventsFromStorage();
    let isUsed = false;
    if (type === 'unit') {
        isUsed = planningEvents.some(event => event.stadeUnitId === id);
    } else if (type === 'field' && field) {
        isUsed = field.units.some(u => planningEvents.some(event => event.stadeUnitId === u.id));
    } else if (type === 'commune' && commune) {
        isUsed = commune.fields.some(f => f.units.some(u => planningEvents.some(event => event.stadeUnitId === u.id)));
    }

    if (isUsed) {
        toast({ title: "Suppression impossible", description: `"${name}" est utilisé(e) dans des événements planifiés.`, variant: "destructive", duration: 5000 });
        return;
    }

    if (type === 'commune' && commune?.fields.length > 0) {
        toast({ title: "Suppression impossible", description: `La commune "${name}" contient des terrains. Supprimez d'abord les terrains.`, variant: "destructive", duration: 5000 });
        return;
    }
    if (type === 'field' && field?.units.length > 0) {
        toast({ title: "Suppression impossible", description: `Le terrain "${name}" contient des unités. Supprimez d'abord les unités.`, variant: "destructive", duration: 5000 });
        return;
    }

    setItemToDelete(itemPath);
    setIsConfirmDeleteDialogOpen(true);
  };

  const confirmDeleteItem = () => {
    if (!itemToDelete) return;
    let updatedConfig = [...stadesConfig];

    if (itemToDelete.type === 'commune' && itemToDelete.communeId) {
      updatedConfig = updatedConfig.filter(c => c.id !== itemToDelete.communeId);
    } else if (itemToDelete.type === 'field' && itemToDelete.communeId && itemToDelete.fieldId) {
      updatedConfig = updatedConfig.map(c => {
        if (c.id === itemToDelete.communeId) {
          return { ...c, fields: c.fields.filter(f => f.id !== itemToDelete.fieldId) };
        }
        return c;
      });
    } else if (itemToDelete.type === 'unit' && itemToDelete.communeId && itemToDelete.fieldId && itemToDelete.unitId) {
      updatedConfig = updatedConfig.map(c => {
        if (c.id === itemToDelete.communeId) {
          return {
            ...c,
            fields: c.fields.map(f => {
              if (f.id === itemToDelete.fieldId) {
                return { ...f, units: f.units.filter(u => u.id !== itemToDelete.unitId) };
              }
              return f;
            })
          };
        }
        return c;
      });
    }
    const finalConfig = recalculateColspans(updatedConfig);
    setStadesConfig(finalConfig);
    saveStadesConfigToStorage(finalConfig);
    toast({ title: "Succès", description: `"${itemToDelete.name}" a été supprimé(e).` });
    setIsConfirmDeleteDialogOpen(false);
    setItemToDelete(null);
  };

  const handleRequestEditItem = (type: 'commune' | 'field' | 'unit', id: string, currentName: string, parentId1?: string, parentId2?: string) => {
    setItemToEdit({ type, id, currentName, parentId1, parentId2 });
    setEditedName(currentName);
    setIsEditModalOpen(true);
  };

  const handleSaveEditedName = () => {
    if (!itemToEdit || !editedName.trim()) {
      toast({ title: "Erreur", description: "Le nom ne peut pas être vide.", variant: "destructive" });
      return;
    }

    const newName = editedName.trim();
    let configToUpdate = [...stadesConfig];
    let nameExists = false;

    if (itemToEdit.type === 'commune') {
      if (newName.toLowerCase() !== itemToEdit.currentName.toLowerCase() && configToUpdate.some(c => c.id !== itemToEdit.id && c.name.toLowerCase() === newName.toLowerCase())) {
        nameExists = true;
      } else {
        configToUpdate = configToUpdate.map(c => c.id === itemToEdit.id ? { ...c, name: newName } : c);
      }
    } else if (itemToEdit.type === 'field' && itemToEdit.parentId1) {
      const commune = configToUpdate.find(c => c.id === itemToEdit.parentId1);
      if (commune) {
        if (newName.toLowerCase() !== itemToEdit.currentName.toLowerCase() && commune.fields.some(f => f.id !== itemToEdit.id && f.name.toLowerCase() === newName.toLowerCase())) {
          nameExists = true;
        } else {
          configToUpdate = configToUpdate.map(c => {
            if (c.id === itemToEdit.parentId1) {
              return { ...c, fields: c.fields.map(f => f.id === itemToEdit.id ? { ...f, name: newName } : f) };
            }
            return c;
          });
        }
      }
    } else if (itemToEdit.type === 'unit' && itemToEdit.parentId1 && itemToEdit.parentId2) {
      const commune = configToUpdate.find(c => c.id === itemToEdit.parentId1);
      const field = commune?.fields.find(f => f.id === itemToEdit.parentId2);
      if (field) {
        if (newName.toLowerCase() !== itemToEdit.currentName.toLowerCase() && field.units.some(u => u.id !== itemToEdit.id && u.headerName.toLowerCase() === newName.toLowerCase())) {
          nameExists = true;
        } else {
          configToUpdate = configToUpdate.map(c => {
            if (c.id === itemToEdit.parentId1) {
              return {
                ...c,
                fields: c.fields.map(f => {
                  if (f.id === itemToEdit.parentId2) {
                    return { ...f, units: f.units.map(u => u.id === itemToEdit.id ? { ...u, headerName: newName } : u) };
                  }
                  return f;
                })
              };
            }
            return c;
          });
        }
      }
    }

    if (nameExists) {
      toast({ title: "Erreur", description: "Un autre élément avec ce nom existe déjà au même niveau.", variant: "destructive" });
      return;
    }

    const finalConfig = recalculateColspans(configToUpdate);
    setStadesConfig(finalConfig);
    saveStadesConfigToStorage(finalConfig);
    toast({ title: "Succès", description: `"${itemToEdit.currentName}" modifié en "${newName}".` });
    setIsEditModalOpen(false);
    setItemToEdit(null);
  };


  return (
    <div className="container mx-auto p-4">
      <div className="mb-6 flex items-center justify-between">
        <div className='flex items-center'>
          <Button variant="outline" size="icon" asChild className="mr-4">
            <Link href="/administration/gestion-listes">
              <ArrowLeft className="h-4 w-4" />
              <span className="sr-only">Retour à la Gestion des Listes</span>
            </Link>
          </Button>
          <h1 className="text-2xl font-bold">Gestion des Unités des Stades</h1>
        </div>
        <Button onClick={handleAddCommune}>
          <PlusCircle className="mr-2 h-4 w-4" />
          Ajouter une Commune
        </Button>
      </div>
      <div className="mb-6 p-4 border rounded-md bg-muted text-muted-foreground">
        <p className="text-sm">
          Gérez ici la configuration des stades, terrains et unités planifiables.
        </p>
         <p className="text-xs mt-1 text-destructive">
          Attention : La suppression d'éléments utilisés dans le planning ou contenant d'autres éléments peut entraîner des incohérences.
        </p>
      </div>

      {stadesConfig.length > 0 ? (
        <Accordion type="multiple" className="w-full space-y-2">
          {stadesConfig.map((commune) => (
            <AccordionItem value={commune.id} key={commune.id} className="border rounded-md shadow-sm bg-card">
              <div className="flex items-center justify-between w-full px-4 py-3 hover:bg-muted/50 rounded-t-md">
                <ShadcnAccordionTrigger
                  className="text-lg font-semibold p-0 flex-1 hover:no-underline data-[state=open]:text-primary text-left"
                >
                  <span>{commune.name} (Unités planifiables: {commune.fields.reduce((acc, f) => acc + f.units.length, 0)})</span>
                </ShadcnAccordionTrigger>
                <div className="space-x-1 ml-4 flex-shrink-0">
                  <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); handleAddField(commune.id); }} className="h-7 px-2">
                      <PlusCircle className="h-3 w-3 mr-1" /> Terrain
                  </Button>
                  <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); handleRequestEditItem('commune', commune.id, commune.name); }}><Edit className="h-4 w-4 text-blue-600" /></Button>
                  <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); requestDeleteItem('commune', commune.id); }}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                </div>
              </div>
              <AccordionContent className="px-4 pt-0 pb-3 space-y-3">
                {commune.fields.map((field) => (
                  <Card key={field.id} className="bg-background/50">
                    <CardHeader className="py-3 px-4 border-b">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-md font-medium">{field.name}</CardTitle>
                        <div className="space-x-1">
                           <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); handleAddUnit(commune.id, field.id); }} className="h-6 px-2 text-xs">
                             <PlusCircle className="h-3 w-3 mr-1" /> Unité
                           </Button>
                          <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); handleRequestEditItem('field', field.id, field.name, commune.id); }}><Edit className="h-4 w-4 text-blue-500" /></Button>
                          <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); requestDeleteItem('field', field.id, commune.id); }}><Trash2 className="h-4 w-4 text-red-400" /></Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="p-3 text-sm">
                      <p className="mb-1 text-xs text-muted-foreground">Unités planifiables :</p>
                      {field.units.length > 0 ? (
                        <ul className="list-disc list-inside space-y-1 pl-2">
                          {field.units.map((unit) => (
                            <li key={unit.id} className="flex justify-between items-center">
                              <span>{unit.headerName} <span className="text-xs text-muted-foreground">(ID: {unit.id.substring(0,8)})</span></span>
                               <div className="space-x-1">
                                   <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); handleRequestEditItem('unit', unit.id, unit.headerName, commune.id, field.id); }}><Edit className="h-3 w-3 text-blue-400" /></Button>
                                   <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); requestDeleteItem('unit', unit.id, commune.id, field.id); }}><Trash2 className="h-3 w-3 text-red-300" /></Button>
                               </div>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-xs text-muted-foreground">Aucune unité définie. Cliquez sur "+ Unité" pour en ajouter une.</p>
                      )}
                    </CardContent>
                  </Card>
                ))}
                {commune.fields.length === 0 && (
                    <p className="text-center text-muted-foreground text-xs py-2">Aucun terrain défini pour cette commune. Cliquez sur "+ Terrain" pour en ajouter un.</p>
                )}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      ) : (
        <p className="text-center text-muted-foreground">Aucune configuration de stade. Cliquez sur "Ajouter une Commune" pour commencer.</p>
      )}

      {itemToDelete && (
        <AlertDialog open={isConfirmDeleteDialogOpen} onOpenChange={setIsConfirmDeleteDialogOpen}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
                    <AlertDialogDescription>
                        Voulez-vous vraiment supprimer "{itemToDelete.name}" ?
                        {itemToDelete.type === 'commune' && ' Cela supprimera tous les terrains et unités associés qui ne sont pas utilisés dans le planning.'}
                        {itemToDelete.type === 'field' && ' Cela supprimera toutes les unités associées qui ne sont pas utilisées dans le planning.'}
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel onClick={() => setIsConfirmDeleteDialogOpen(false)}>Annuler</AlertDialogCancel>
                    <AlertDialogAction onClick={confirmDeleteItem} className="bg-destructive hover:bg-destructive/90">Supprimer</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
      )}

      {itemToEdit && (
        <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
          <ShadcnDialogContent>
            <ShadcnDialogHeader>
              <ShadcnDialogTitle>Modifier le nom</ShadcnDialogTitle>
              <ShadcnDialogDescription>
                Modifier le nom de "{itemToEdit.currentName}".
              </ShadcnDialogDescription>
            </ShadcnDialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="editedNameInput" className="text-right">
                  Nouveau nom
                </Label>
                <Input
                  id="editedNameInput"
                  value={editedName}
                  onChange={(e) => setEditedName(e.target.value)}
                  className="col-span-3"
                />
              </div>
            </div>
            <ShadcnDialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="outline" onClick={() => setIsEditModalOpen(false)}>Annuler</Button>
              </DialogClose>
              <Button type="button" onClick={handleSaveEditedName}>Enregistrer</Button>
            </ShadcnDialogFooter>
          </ShadcnDialogContent>
        </Dialog>
      )}
    </div>
  );
}

