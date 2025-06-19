
'use client';

import * as React from 'react';
import { useState, useEffect } from 'react';
import { useForm, Controller, FormProvider, useFormContext, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
  DialogClose,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox'; // Import Checkbox
import type { LicencieItem } from '@/app/inscription/nouveau-licencie/page';
import type { EquipementItem as StockEquipementItem } from '@/app/stock/equipement/page';
import { type PackItemDetail, type AttributedEquipement } from '@/config/stock-constants';
import { getStoredPackCompositions } from '@/app/administration/gestion-listes/packs-licencies/page';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

interface AttributionEquipementModalProps {
  isOpen: boolean;
  onClose: () => void;
  licencie: LicencieItem | null;
  equipementsEnStock: StockEquipementItem[];
  onSave: (licencieId: string, attribution: AttributedEquipement[]) => void;
}

const equipementFormItemSchema = z.object({
  packArticleName: z.string(),
  selectedArticleName: z.string().optional(),
  size: z.string().optional(),
  quantity: z.number().min(1).default(1),
  isChoice: z.boolean().optional(),
  options: z.array(z.string()).optional(),
  availableSizesForSelected: z.array(z.string()).optional(),
  hasSizeVariantsForSelected: z.boolean().optional(),
  isOutOfStockOverride: z.boolean().optional().default(false), // Nouveau champ
});

type EquipementFormItem = z.infer<typeof equipementFormItemSchema>;

const attributionFormSchema = z.object({
  equipements: z.array(equipementFormItemSchema),
});

type AttributionFormData = z.infer<typeof attributionFormSchema>;

export function AttributionEquipementModal({
  isOpen,
  onClose,
  licencie,
  equipementsEnStock,
  onSave,
}: AttributionEquipementModalProps) {
  const { toast } = useToast();
  const methods = useForm<AttributionFormData>({
    resolver: zodResolver(attributionFormSchema),
    defaultValues: {
      equipements: [],
    },
  });

  const { control, handleSubmit, watch, setValue, reset, formState: { errors } } = methods;

  const { fields } = useFieldArray({
    control,
    name: "equipements",
  });

  const [dynamicPackCompositions, setDynamicPackCompositions] = useState<Record<string, PackItemDetail[]>>({});

  useEffect(() => {
    if (isOpen) {
      setDynamicPackCompositions(getStoredPackCompositions());
    }
  }, [isOpen]);


  useEffect(() => {
    if (licencie && licencie.packChoisi && isOpen && Object.keys(dynamicPackCompositions).length > 0) {
      const packDetails = dynamicPackCompositions[licencie.packChoisi];

      if (packDetails) {
        const initialFormEquipements = packDetails.map((item) => {
          const existingAttribution = licencie.equipementAttribué?.find(
            ea => ea.packArticleName === (item.isChoice && item.options && item.options.length > 0 ? item.options.join(' OU ') : item.articleName)
          );

          let defaultSelectedArticleName = "";
          if (existingAttribution) {
            defaultSelectedArticleName = existingAttribution.selectedArticleName;
          } else if (!item.isChoice) {
            defaultSelectedArticleName = item.articleName;
          }

          const stockItemInfo = equipementsEnStock.find(e => e.name === defaultSelectedArticleName);

          return {
            packArticleName: item.isChoice && item.options && item.options.length > 0 ? item.options.join(' OU ') : item.articleName,
            selectedArticleName: defaultSelectedArticleName,
            size: existingAttribution?.size || undefined,
            quantity: existingAttribution?.quantity || 1,
            isChoice: item.isChoice || false,
            options: item.options || [],
            availableSizesForSelected: stockItemInfo?.availableSizes || [],
            hasSizeVariantsForSelected: stockItemInfo?.hasSizeVariants || false,
            isOutOfStockOverride: existingAttribution?.isOutOfStockOverride || false,
          };
        });
        reset({ equipements: initialFormEquipements });
      } else {
        console.warn(`No composition found for pack: ${licencie.packChoisi}`);
        reset({ equipements: [] });
      }
    } else if (isOpen) {
      reset({ equipements: [] });
    }
  }, [licencie, isOpen, equipementsEnStock, reset, dynamicPackCompositions]);

  const onSubmit = (data: AttributionFormData) => {
    if (!licencie) return;
    
    const attributionValidee: AttributedEquipement[] = data.equipements
      .filter(eq => !!eq.selectedArticleName) // Un article doit être sélectionné
      .map(eq => ({
        packArticleName: eq.packArticleName,
        selectedArticleName: eq.selectedArticleName!,
        size: eq.size,
        quantity: eq.quantity,
        isOutOfStockOverride: eq.isOutOfStockOverride,
    }));

    // Validation si un article avec taille n'a pas de taille sélectionnée ET que l'override n'est pas coché
    for (const item of data.equipements) {
        if (item.selectedArticleName && item.hasSizeVariantsForSelected && !item.size && !item.isOutOfStockOverride) {
             toast({
                title: "Erreur de sélection",
                description: `Veuillez sélectionner une taille pour "${item.selectedArticleName}" ou cocher "Forcer (Rupture de stock)".`,
                variant: "destructive",
             });
             return; // Bloque la soumission
        }
    }

    onSave(licencie.id, attributionValidee);
    onClose();
  };

  if (!licencie) return null;

  const handleArticleSelectionChange = (selectedIndex: number, newSelectedArticleName: string) => {
    setValue(`equipements.${selectedIndex}.selectedArticleName`, newSelectedArticleName, { shouldValidate: true });
    const stockItemInfo = equipementsEnStock.find(e => e.name === newSelectedArticleName);
    setValue(`equipements.${selectedIndex}.availableSizesForSelected`, stockItemInfo?.availableSizes || []);
    setValue(`equipements.${selectedIndex}.hasSizeVariantsForSelected`, stockItemInfo?.hasSizeVariants || false, { shouldValidate: true });
    setValue(`equipements.${selectedIndex}.size`, undefined, { shouldValidate: true }); 
  };

  const watchedEquipements = watch("equipements");

  const getStockForTaille = (articleName: string | undefined, taille: string): number => {
    if (!articleName) return 0;
    const stockItem = equipementsEnStock.find(e => e.name === articleName);
    if (stockItem && stockItem.hasSizeVariants && stockItem.sizeBreakdown) {
      return stockItem.sizeBreakdown[taille] ?? 0;
    }
    return 0;
  };

  const getStockForItem = (articleName: string | undefined): number => {
    if (!articleName) return 0;
    const stockItem = equipementsEnStock.find(e => e.name === articleName);
    return stockItem?.quantity ?? 0;
  }

  const currentPackCompositionDetails = licencie?.packChoisi ? dynamicPackCompositions[licencie.packChoisi] : [];

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-lg md:max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Attribution pour {licencie.prenom} {licencie.nom}</DialogTitle>
          <DialogDescription>
            Pack: <span className="font-semibold">{licencie.packChoisi}</span>.
            Stock: (<span className="text-orange-500">bas</span>, <span className="text-red-500">nul</span>)
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-y-auto pr-4 pl-1 py-2">
          <FormProvider {...methods}>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-1">
              {fields.map((fieldItem, index) => {
                const currentSelection = watchedEquipements?.[index];
                const packItemDefinition = currentPackCompositionDetails?.find(
                  pItem => (pItem.isChoice && pItem.options && pItem.options.length > 0 ? pItem.options.join(' OU ') : pItem.articleName) === fieldItem.packArticleName
                );
                
                let dynamicLabelText = fieldItem.packArticleName;
                 if (packItemDefinition) {
                   if (packItemDefinition.isChoice && packItemDefinition.options && packItemDefinition.options.length > 0) {
                     dynamicLabelText = packItemDefinition.options.join(' OU ');
                   } else {
                     dynamicLabelText = packItemDefinition.articleName;
                   }
                 }

                const stockGlobalArticleSelectionne = currentSelection?.selectedArticleName ? getStockForItem(currentSelection.selectedArticleName) : null;

                return (
                  <div key={fieldItem.id} className="p-1.5 border rounded-md shadow-sm space-y-0.5">
                    <div className="flex justify-between items-center mb-1">
                      <h4 className="font-medium text-xs">{dynamicLabelText}</h4>
                      <FormField
                        control={control}
                        name={`equipements.${index}.isOutOfStockOverride`}
                        render={({ field: checkboxField }) => (
                          <FormItem className="flex flex-row items-center space-x-1 space-y-0">
                            <FormControl>
                              <Checkbox
                                checked={checkboxField.value}
                                onCheckedChange={checkboxField.onChange}
                                className="h-3 w-3"
                              />
                            </FormControl>
                            <FormLabel className="text-[10px] font-normal leading-none">
                              Forcer (Rupture)
                            </FormLabel>
                          </FormItem>
                        )}
                      />
                    </div>


                    {currentSelection?.isChoice && currentSelection?.options && (
                      <FormField
                        control={control}
                        name={`equipements.${index}.selectedArticleName`}
                        render={({ field: controllerField }) => (
                          <FormItem>
                            <FormLabel className="text-[10px]">Choisir l'article</FormLabel>
                            <Select
                              onValueChange={(value) => handleArticleSelectionChange(index, value)}
                              value={controllerField.value || ""}
                            >
                              <FormControl><SelectTrigger className="h-7 text-xs py-0.5"><SelectValue placeholder="Sélectionner" /></SelectTrigger></FormControl>
                              <SelectContent>
                                {currentSelection.options?.map(opt => {
                                  const stockOpt = getStockForItem(opt);
                                  return (
                                    <SelectItem 
                                      key={opt} 
                                      value={opt}
                                      disabled={stockOpt === 0 && !currentSelection.isOutOfStockOverride}
                                    >
                                      {opt}
                                      <span className={cn("ml-1.5 text-[10px]", stockOpt === 0 ? "text-red-500" : stockOpt < 10 ? "text-orange-500" : "text-muted-foreground")}>
                                        (Stock: {stockOpt})
                                      </span>
                                    </SelectItem>
                                  );
                                })}
                              </SelectContent>
                            </Select>
                            <FormMessage className="text-xs" />
                          </FormItem>
                        )}
                      />
                    )}

                    {!currentSelection?.isChoice && !currentSelection?.hasSizeVariantsForSelected && currentSelection?.selectedArticleName && stockGlobalArticleSelectionne !== null && (
                       <p className={cn("text-[10px]", stockGlobalArticleSelectionne === 0 ? "text-red-500" : stockGlobalArticleSelectionne < 10 ? "text-orange-500" : "text-muted-foreground")}>
                         Stock: {stockGlobalArticleSelectionne}
                       </p>
                    )}

                    {currentSelection?.hasSizeVariantsForSelected && currentSelection.selectedArticleName && (
                      <FormField
                        control={control}
                        name={`equipements.${index}.size`}
                        render={({ field: controllerField }) => (
                          <FormItem>
                            <FormLabel className="text-[10px]">Taille</FormLabel>
                            <Select
                              onValueChange={(value) => {
                                controllerField.onChange(value);
                                methods.trigger(`equipements.${index}.size`);
                              }}
                              value={controllerField.value || ""}
                              disabled={!currentSelection.selectedArticleName}
                            >
                              <FormControl><SelectTrigger className="h-7 text-xs py-0.5"><SelectValue placeholder="Sélectionner" /></SelectTrigger></FormControl>
                              <SelectContent>
                                {currentSelection.availableSizesForSelected?.map(taille => {
                                  const stockTaille = getStockForTaille(currentSelection.selectedArticleName, taille);
                                  return (
                                    <SelectItem 
                                      key={taille} 
                                      value={taille}
                                      disabled={stockTaille === 0 && !currentSelection.isOutOfStockOverride}
                                    >
                                      {taille}
                                      <span className={cn("ml-1.5 text-[10px]", stockTaille === 0 ? "text-red-500" : stockTaille < 10 ? "text-orange-500" : "text-muted-foreground")}>
                                        (Stock: {stockTaille})
                                      </span>
                                    </SelectItem>
                                  );
                                })}
                              </SelectContent>
                            </Select>
                            <FormMessage className="text-xs" />
                          </FormItem>
                        )}
                      />
                    )}
                  </div>
                );
              })}
            </form>
          </FormProvider>
        </div>

        <DialogFooter className="pt-3 border-t mt-auto">
          <DialogClose asChild>
            <Button type="button" variant="outline" size="sm" onClick={onClose}>
              Annuler
            </Button>
          </DialogClose>
          <Button type="button" size="sm" onClick={handleSubmit(onSubmit)}>Enregistrer l'Attribution</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

    
