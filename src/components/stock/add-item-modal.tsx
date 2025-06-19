
'use client';

import * as React from 'react';
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
  DialogClose,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { APPAREL_SIZES as INITIAL_APPAREL_SIZES, SOCK_SIZES as INITIAL_SOCK_SIZES, FOOD_LOCATIONS as INITIAL_FOOD_LOCATIONS, SPORTIF_LOCATIONS as INITIAL_SPORTIF_LOCATIONS, ITEM_CATEGORIES_CHOICES, type ItemCategoryChoice, type FoodSupplierDetail, INITIAL_FOOD_SUPPLIERS } from '@/config/stock-constants';
import type { EquipementItem as ArticleDefinition } from '@/app/administration/gestion-listes/articles-stock/page'; // Renamed to avoid conflict
import { getStoredArticleDefinitions, ARTICLE_DEFINITIONS_STORAGE_KEY } from '@/app/administration/gestion-listes/articles-stock/page';

const FOOD_SUPPLIERS_STORAGE_KEY = 'TRAPEL_FC_ADMIN_LIST_FOOD_SUPPLIERS';
const FOOD_LOCATIONS_STORAGE_KEY = 'TRAPEL_FC_ADMIN_LIST_FOOD_LOCATIONS';
const SPORTIF_LOCATIONS_STORAGE_KEY = 'TRAPEL_FC_ADMIN_LIST_SPORTIF_LOCATIONS';
const APPAREL_SIZES_STORAGE_KEY = 'TRAPEL_FC_ADMIN_LIST_APPAREL_SIZES';
const SOCK_SIZES_STORAGE_KEY = 'TRAPEL_FC_ADMIN_LIST_SOCK_SIZES';


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
      // console.error(`Failed to parse ${key} from localStorage`, e);
    }
  }
  if ([APPAREL_SIZES_STORAGE_KEY, SOCK_SIZES_STORAGE_KEY, FOOD_LOCATIONS_STORAGE_KEY, SPORTIF_LOCATIONS_STORAGE_KEY].includes(key)) {
    const initialList = [...initialFallback];
    localStorage.setItem(key, JSON.stringify(initialList));
    return initialList;
  }
  return [...initialFallback];
};

const getStoredFoodSupplierDetails = (): FoodSupplierDetail[] => {
    if (typeof window === 'undefined') return [...INITIAL_FOOD_SUPPLIERS];
    const stored = localStorage.getItem(FOOD_SUPPLIERS_STORAGE_KEY);
    if (stored) {
        try {
        const parsed = JSON.parse(stored) as FoodSupplierDetail[];
        if (Array.isArray(parsed) && parsed.every(item => item.id && item.name)) {
            return parsed.sort((a, b) => a.name.localeCompare(b.name));
        }
        } catch (e) {
        // console.error("Failed to parse suppliers from localStorage", e);
        }
    }
    const initialSuppliers = [...INITIAL_FOOD_SUPPLIERS];
    localStorage.setItem(FOOD_SUPPLIERS_STORAGE_KEY, JSON.stringify(initialSuppliers));
    return initialSuppliers.sort((a, b) => a.name.localeCompare(b.name));
};


export interface NewItemData {
  name: string; // This will now be the ID of the ArticleDefinition
  itemCategory: ItemCategoryChoice;
  values: Record<string, number> | number; 
  supplier?: string; // Will store supplier NAME
  standardItemDesignatedSection?: 'equipement' | 'nourriture' | 'sportif';
}

interface AddItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: NewItemData) => void;
}

const AddItemFormSchema = z.object({
  articleDefinitionId: z.string().min(1, "La sélection d'un article défini est requise."),
  itemCategory: z.enum(ITEM_CATEGORIES_CHOICES.map(cat => cat.id) as [ItemCategoryChoice, ...ItemCategoryChoice[]]).optional(), // Will be set based on definition
  supplier: z.string().optional(),
  dynamicBreakdown: z.record(z.coerce.number().int().min(0).optional().default(0)).optional(), 
  standardQuantity: z.coerce.number().int().min(0, "La quantité doit être positive").optional().default(0),
  standardItemDesignatedSection: z.enum(['equipement', 'nourriture', 'sportif']).optional(), // Will be set based on definition
}).superRefine((data, ctx) => {
  const selectedDefinition = getStoredArticleDefinitions().find(def => def.id === data.articleDefinitionId);
  if (selectedDefinition?.itemCategory === 'food' && !data.supplier) {
    ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Le fournisseur est requis pour la catégorie Nourriture/Boisson.",
        path: ["supplier"],
    });
  }
});

type AddItemFormValues = z.infer<typeof AddItemFormSchema>;

export function AddItemModal({ isOpen, onClose, onSave }: AddItemModalProps) {
  const [articleDefinitions, setArticleDefinitions] = React.useState<ArticleDefinition[]>([]);
  const [dynamicFoodSuppliers, setDynamicFoodSuppliers] = React.useState<FoodSupplierDetail[]>([]);
  const [dynamicFoodLocations, setDynamicFoodLocations] = React.useState<string[]>([]);
  const [dynamicSportifLocations, setDynamicSportifLocations] = React.useState<string[]>([]);
  const [dynamicApparelSizes, setDynamicApparelSizes] = React.useState<string[]>([]);
  const [dynamicSockSizes, setDynamicSockSizes] = React.useState<string[]>([]);


  const form = useForm<AddItemFormValues>({
    resolver: zodResolver(AddItemFormSchema),
    defaultValues: {
      articleDefinitionId: "",
      itemCategory: undefined,
      supplier: undefined,
      dynamicBreakdown: {},
      standardQuantity: 0,
      standardItemDesignatedSection: undefined,
    },
  });

  const selectedArticleDefinitionId = form.watch("articleDefinitionId");
  const selectedDefinition = React.useMemo(() => {
    return articleDefinitions.find(def => def.id === selectedArticleDefinitionId);
  }, [selectedArticleDefinitionId, articleDefinitions]);


  const initializeDefaultBreakdown = React.useCallback((category?: ItemCategoryChoice) => {
    let defaultBreakdown = {};
    if (category === 'apparel') {
      defaultBreakdown = dynamicApparelSizes.reduce((acc, size) => ({ ...acc, [size]: 0 }), {});
    } else if (category === 'socks') {
      defaultBreakdown = dynamicSockSizes.reduce((acc, size) => ({ ...acc, [size]: 0 }), {});
    } else if (category === 'food') {
      defaultBreakdown = dynamicFoodLocations.reduce((acc, loc) => ({ ...acc, [loc]: 0 }), {});
    } else if (category === 'sportif') {
      defaultBreakdown = dynamicSportifLocations.reduce((acc, loc) => ({ ...acc, [loc]: 0 }), {});
    }
    form.setValue('dynamicBreakdown', defaultBreakdown);
  }, [form, dynamicApparelSizes, dynamicSockSizes, dynamicFoodLocations, dynamicSportifLocations]);


  React.useEffect(() => {
    if (isOpen) {
      setArticleDefinitions(getStoredArticleDefinitions());
      const apparel = getDynamicListFromStorage(APPAREL_SIZES_STORAGE_KEY, INITIAL_APPAREL_SIZES);
      const socks = getDynamicListFromStorage(SOCK_SIZES_STORAGE_KEY, INITIAL_SOCK_SIZES);
      const foodSupp = getStoredFoodSupplierDetails();
      const foodLoc = getDynamicListFromStorage(FOOD_LOCATIONS_STORAGE_KEY, INITIAL_FOOD_LOCATIONS);
      const sportifLoc = getDynamicListFromStorage(SPORTIF_LOCATIONS_STORAGE_KEY, INITIAL_SPORTIF_LOCATIONS);

      setDynamicApparelSizes(apparel);
      setDynamicSockSizes(socks);
      setDynamicFoodSuppliers(foodSupp);
      setDynamicFoodLocations(foodLoc);
      setDynamicSportifLocations(sportifLoc);
      
      form.reset({
        articleDefinitionId: "",
        itemCategory: undefined,
        supplier: undefined,
        dynamicBreakdown: {}, 
        standardQuantity: 0,
        standardItemDesignatedSection: undefined,
      });
    }
  }, [isOpen, form]);

  React.useEffect(() => {
    if (selectedDefinition) {
      form.setValue('itemCategory', selectedDefinition.itemCategory, { shouldValidate: true });
      form.setValue('standardItemDesignatedSection', selectedDefinition.standardItemDesignatedSection, { shouldValidate: true });
      initializeDefaultBreakdown(selectedDefinition.itemCategory);
      if (selectedDefinition.itemCategory !== 'food') {
        form.setValue('supplier', undefined, { shouldValidate: true });
      }
      if (selectedDefinition.itemCategory === 'standard') {
        form.setValue('dynamicBreakdown', {}, { shouldValidate: true });
      } else {
        form.setValue('standardQuantity', 0, { shouldValidate: true });
      }
    } else {
      form.setValue('itemCategory', undefined);
      form.setValue('standardItemDesignatedSection', undefined);
      form.setValue('supplier', undefined);
      form.setValue('dynamicBreakdown', {});
      form.setValue('standardQuantity', 0);
    }
  }, [selectedDefinition, form, initializeDefaultBreakdown]);

  const onSubmit = (data: AddItemFormValues) => {
    if (!selectedDefinition) {
        // This case should ideally be prevented by form validation (articleDefinitionId is required)
        console.error("No article definition selected.");
        return;
    }
    let valuesToSave: Record<string, number> | number;
    if (selectedDefinition.itemCategory === 'apparel' || selectedDefinition.itemCategory === 'socks' || selectedDefinition.itemCategory === 'food' || selectedDefinition.itemCategory === 'sportif') {
      valuesToSave = data.dynamicBreakdown || {};
    } else { 
      valuesToSave = data.standardQuantity || 0;
    }
    onSave({ 
        name: selectedDefinition.name, // Pass the name of the definition
        itemCategory: selectedDefinition.itemCategory!, 
        values: valuesToSave, 
        supplier: data.supplier, // This is already the supplier name
        standardItemDesignatedSection: selectedDefinition.standardItemDesignatedSection 
    });
    onClose();
  };

  const renderBreakdownInputs = (keys: readonly string[], fieldNamePrefix: "dynamicBreakdown", scrollHeight = "h-[300px]") => {
    if (!keys || keys.length === 0) return <p className="text-sm text-muted-foreground">Aucune option de répartition disponible. Veuillez configurer les options dans la section Administration.</p>;
    return (
      <ScrollArea className={`${scrollHeight} pr-4`}>
        <div className="grid grid-cols-2 gap-x-4 gap-y-3 py-4">
          {keys.map((key) => (
            <FormField
              key={key}
              control={form.control}
              name={`${fieldNamePrefix}.${key}` as any} 
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{key}</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min="0"
                      {...field}
                      value={field.value ?? ""}
                      onChange={e => field.onChange(parseInt(e.target.value, 10) || 0)}
                      onBlur={e => {
                        if (e.target.value === "") field.onChange(0);
                        else field.onChange(parseInt(e.target.value, 10) || 0);
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          ))}
        </div>
      </ScrollArea>
    );
  };

  const currentBreakdownKeys = React.useMemo(() => {
    if (selectedDefinition?.itemCategory === 'apparel') return dynamicApparelSizes;
    if (selectedDefinition?.itemCategory === 'socks') return dynamicSockSizes;
    if (selectedDefinition?.itemCategory === 'food') return dynamicFoodLocations;
    if (selectedDefinition?.itemCategory === 'sportif') return dynamicSportifLocations;
    return [];
  }, [selectedDefinition, dynamicApparelSizes, dynamicSockSizes, dynamicFoodLocations, dynamicSportifLocations]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-[425px] md:sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Ajouter au Stock</DialogTitle>
          <DialogDescription>
            Sélectionnez un article défini et saisissez les quantités.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="articleDefinitionId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Article (Définition) *</FormLabel>
                  <Select 
                    onValueChange={(value) => {
                      field.onChange(value);
                      // Reset dependent fields when definition changes
                      const def = articleDefinitions.find(d => d.id === value);
                      if (def) {
                        form.setValue('itemCategory', def.itemCategory, { shouldValidate: true });
                        form.setValue('standardItemDesignatedSection', def.standardItemDesignatedSection, { shouldValidate: true });
                        initializeDefaultBreakdown(def.itemCategory);
                      } else {
                        form.setValue('itemCategory', undefined);
                        form.setValue('standardItemDesignatedSection', undefined);
                        form.setValue('dynamicBreakdown', {});
                        form.setValue('standardQuantity', 0);
                      }
                    }} 
                    value={field.value || ""}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner un article défini" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {articleDefinitions.length > 0 ? articleDefinitions.map((def) => (
                        <SelectItem key={def.id} value={def.id}>
                          {def.name}
                        </SelectItem>
                      )) : <p className="p-2 text-sm text-muted-foreground">Aucune définition d'article.</p>}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {/* Display itemCategory read-only based on selectedDefinition */}
            {selectedDefinition && (
              <FormItem>
                <FormLabel>Catégorie (Définition)</FormLabel>
                <Input 
                  readOnly 
                  value={ITEM_CATEGORIES_CHOICES.find(c => c.id === selectedDefinition.itemCategory)?.label || selectedDefinition.itemCategory} 
                  className="bg-muted"
                />
              </FormItem>
            )}


            {selectedDefinition?.itemCategory === 'food' && (
                 <FormField
                 control={form.control}
                 name="supplier"
                 render={({ field }) => (
                   <FormItem>
                     <FormLabel>Fournisseur</FormLabel>
                     <Select onValueChange={field.onChange} value={field.value || ""}>
                       <FormControl>
                         <SelectTrigger>
                           <SelectValue placeholder="Sélectionner un fournisseur" />
                         </SelectTrigger>
                       </FormControl>
                       <SelectContent>
                         {dynamicFoodSuppliers.length > 0 ? dynamicFoodSuppliers.map((supplier) => (
                           <SelectItem key={supplier.id} value={supplier.name}>
                             {supplier.name}
                           </SelectItem>
                         )) : <p className="p-2 text-sm text-muted-foreground">Aucun fournisseur configuré.</p>}
                       </SelectContent>
                     </Select>
                     <FormMessage />
                   </FormItem>
                 )}
               />
            )}
            
            {(selectedDefinition?.itemCategory === 'apparel' || selectedDefinition?.itemCategory === 'socks' || selectedDefinition?.itemCategory === 'food' || selectedDefinition?.itemCategory === 'sportif') && 
              renderBreakdownInputs(currentBreakdownKeys, "dynamicBreakdown", 
                (selectedDefinition.itemCategory === 'food' || selectedDefinition.itemCategory === 'sportif') ? "h-[200px]" : "h-[300px]")
            }
            
            {selectedDefinition?.itemCategory === 'standard' && (
              <>
                <FormField
                  control={form.control}
                  name="standardQuantity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Quantité</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="0"
                          {...field}
                          value={field.value ?? ""}
                          onChange={e => field.onChange(parseInt(e.target.value, 10) || 0)}
                          onBlur={e => {
                              if (e.target.value === "") field.onChange(0);
                              else field.onChange(parseInt(e.target.value, 10) || 0);
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {/* Display standardItemDesignatedSection read-only */}
                 <FormItem>
                    <FormLabel>Section de Destination (Définition)</FormLabel>
                    <Input 
                        readOnly 
                        value={selectedDefinition.standardItemDesignatedSection || 'N/A'} 
                        className="bg-muted"
                    />
                </FormItem>
              </>
            )}

            <DialogFooter className="pt-4">
              <DialogClose asChild>
                <Button type="button" variant="outline" onClick={onClose}>
                  Annuler
                </Button>
              </DialogClose>
              <Button 
                type="submit" 
                disabled={!selectedArticleDefinitionId}
              >
                Enregistrer
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
