
'use client';

import * as React from 'react';
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
// Removed ScrollArea import
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useForm, useFieldArray, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { PlusCircle, Trash2 } from 'lucide-react';
import type { PackItemDetail } from '@/config/stock-constants';
import type { EquipementItem as StockItem } from '@/app/stock/equipement/page';
import { cn } from '@/lib/utils';

const packItemDetailSchema = z.object({
  articleName: z.string().min(1, "Nom requis"),
  isChoice: z.boolean().optional().default(false),
  options: z.array(z.string().min(1, "Option requise")).optional(),
}).refine(data => {
  if (data.isChoice && (!data.options || data.options.length < 1)) {
    return false;
  }
  return true;
}, {
  message: "Au moins une option est requise pour un choix.",
  path: ["options"],
});

const packCompositionFormSchema = z.object({
  composition: z.array(packItemDetailSchema),
});

type PackCompositionFormData = z.infer<typeof packCompositionFormSchema>;

interface PackCompositionModalProps {
  isOpen: boolean;
  onClose: () => void;
  packName: string;
  initialComposition: PackItemDetail[];
  allStockItems: StockItem[]; // This should be the base definitions, not live stock with quantities
  onSaveComposition: (packName: string, newComposition: PackItemDetail[]) => void;
}

export function PackCompositionModal({
  isOpen,
  onClose,
  packName,
  initialComposition,
  allStockItems,
  onSaveComposition,
}: PackCompositionModalProps) {
  
  const methods = useForm<PackCompositionFormData>({
    resolver: zodResolver(packCompositionFormSchema),
    defaultValues: {
      composition: [],
    },
  });

  const { control, handleSubmit, watch, reset, setValue } = methods;

  const { fields, append, remove } = useFieldArray({
    control,
    name: "composition",
  });

  React.useEffect(() => {
    if (isOpen) {
      reset({ composition: initialComposition || [] });
    }
  }, [isOpen, initialComposition, reset]);

  const onSubmit = (data: PackCompositionFormData) => {
    onSaveComposition(packName, data.composition);
    onClose();
  };

  const stockItemOptions = React.useMemo(() => {
    // Ensure allStockItems is an array before mapping
    if (!Array.isArray(allStockItems)) {
      console.error("allStockItems is not an array in PackCompositionModal:", allStockItems);
      return [];
    }
    return allStockItems.map(item => ({ value: item.name, label: item.name }));
  }, [allStockItems]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-xl md:max-w-3xl lg:max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Gérer la Composition du Pack: {packName}</DialogTitle>
          <DialogDescription>
            Ajoutez, modifiez ou supprimez les articles inclus dans ce pack.
          </DialogDescription>
        </DialogHeader>
        {/* Apply overflow-y-auto to this div, remove ScrollArea component */}
        <div className="flex-1 min-h-0 overflow-y-auto pr-4 pl-1 py-2">
          <FormProvider {...methods}>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {fields.map((item, index) => {
                const isChoice = watch(`composition.${index}.isChoice`);
                return (
                  <div key={item.id} className="p-4 border rounded-md shadow-sm space-y-3 relative bg-card">
                    <Button 
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => remove(index)}
                      className="absolute top-2 right-2 text-destructive hover:bg-destructive/10"
                      aria-label="Supprimer cet article du pack"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>

                    <FormField
                      control={control}
                      name={`composition.${index}.isChoice`}
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={(checked) => {
                                const newIsChoice = Boolean(checked);
                                field.onChange(newIsChoice);
                                if (newIsChoice) {
                                  setValue(`composition.${index}.articleName`, `Choix d'articles ${index + 1}`);
                                  // Ensure options is an empty array if it's a new choice or was undefined
                                  setValue(`composition.${index}.options`, watch(`composition.${index}.options`) || []);
                                } else {
                                  setValue(`composition.${index}.options`, undefined);
                                  setValue(`composition.${index}.articleName`, ""); 
                                }
                              }}
                            />
                          </FormControl>
                          <FormLabel className="font-normal">Est un choix multiple ?</FormLabel>
                        </FormItem>
                      )}
                    />

                    {!isChoice ? (
                      <FormField
                        control={control}
                        name={`composition.${index}.articleName`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Article</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value || ""}>
                              <FormControl><SelectTrigger><SelectValue placeholder="Sélectionner un article" /></SelectTrigger></FormControl>
                              <SelectContent>
                                {stockItemOptions.map(opt => (
                                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    ) : (
                      <>
                        <FormField
                          control={control}
                          name={`composition.${index}.articleName`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Nom du groupe de choix (ex: Choix de Haut)</FormLabel>
                              <FormControl><Input {...field} /></FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <OptionsArrayField control={control} nestIndex={index} stockItemOptions={stockItemOptions} />
                      </>
                    )}
                  </div>
                );
              })}

              <Button
                type="button"
                variant="outline"
                onClick={() => append({ articleName: '', isChoice: false, options: [] })}
                className="w-full"
              >
                <PlusCircle className="mr-2 h-4 w-4" />
                Ajouter un article/choix au pack
              </Button>
            </form>
          </FormProvider>
        </div>
        <DialogFooter className="pt-4 border-t mt-auto">
          <DialogClose asChild>
            <Button type="button" variant="outline" onClick={onClose}>
              Annuler
            </Button>
          </DialogClose>
          <Button type="button" onClick={handleSubmit(onSubmit)}>
            Enregistrer la Composition
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface OptionsArrayFieldProps {
  control: any; 
  nestIndex: number;
  stockItemOptions: { value: string; label: string; }[];
}

function OptionsArrayField({ control, nestIndex, stockItemOptions }: OptionsArrayFieldProps) {
  const { fields, append, remove } = useFieldArray({
    control,
    name: `composition.${nestIndex}.options`
  });

  return (
    <div className="space-y-2 pl-4 border-l-2 border-muted ml-2">
      <FormLabel className="text-sm">Options pour ce choix :</FormLabel>
      {fields.map((optionField, optionIndex) => (
        <div key={optionField.id} className="flex items-center space-x-2">
          <FormField
            control={control}
            name={`composition.${nestIndex}.options.${optionIndex}`}
            render={({ field }) => (
              <FormItem className="flex-grow">
                 <Select onValueChange={field.onChange} value={field.value || ""}>
                   <FormControl><SelectTrigger><SelectValue placeholder={`Option ${optionIndex + 1}`} /></SelectTrigger></FormControl>
                   <SelectContent>
                     {stockItemOptions.map(opt => (
                       <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                     ))}
                   </SelectContent>
                 </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button type="button" variant="ghost" size="icon" onClick={() => remove(optionIndex)} aria-label="Supprimer cette option">
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      ))}
      <Button
        type="button"
        variant="link"
        size="sm"
        onClick={() => append("")} // Append an empty string as a placeholder for a new option
        className="text-xs p-0 h-auto"
      >
        <PlusCircle className="mr-1 h-3 w-3" />
        Ajouter une option
      </Button>
    </div>
  );
}
