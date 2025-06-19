
'use client';

import * as React from 'react'; 
import type { Key } from 'react';
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
import { ScrollArea } from '@/components/ui/scroll-area';
import type { EquipementItem } from '@/app/stock/equipement/page';
import { APPAREL_SIZES, SOCK_SIZES, FOOD_LOCATIONS, SPORTIF_LOCATIONS, type ItemCategoryChoice } from '@/config/stock-constants';


interface StockAdjustmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: EquipementItem;
  onSave: (itemId: Key, newStockValue: number | Partial<Record<string, number>>) => void;
}

const singleQuantitySchema = z.coerce.number().int().min(0, "La quantité doit être positive");

// Helper to create Zod schema for sizes/locations dynamically
const createBreakdownFormSchema = (keys: readonly string[]) => {
  const fieldSchema = z.coerce.number().int().min(0, "La quantité doit être positive").optional().default(0);
  const schemaDefinition = keys.reduce((acc, key) => {
    acc[key] = fieldSchema;
    return acc;
  }, {} as Record<string, typeof fieldSchema>);
  return z.object(schemaDefinition);
};

export function StockAdjustmentModal({ isOpen, onClose, item, onSave }: StockAdjustmentModalProps) {
  
  const itemHasBreakdown = item?.hasSizeVariants; 

  const currentItemBreakdownKeys = React.useMemo(() => {
    if (!item) return [];
    if (item.itemCategory === 'food') return FOOD_LOCATIONS;
    if (item.itemCategory === 'sportif') return SPORTIF_LOCATIONS;
    if (item.itemCategory === 'apparel') return APPAREL_SIZES;
    if (item.itemCategory === 'socks') return SOCK_SIZES;
    if (item.availableSizes && item.hasSizeVariants) return item.availableSizes; 
    return []; 
  }, [item]);

  const CurrentFormSchema = React.useMemo(() => {
    if (itemHasBreakdown && currentItemBreakdownKeys.length > 0) {
      return createBreakdownFormSchema(currentItemBreakdownKeys);
    }
    return z.object({ quantity: singleQuantitySchema }); 
  }, [itemHasBreakdown, currentItemBreakdownKeys]);

  type CurrentFormValues = z.infer<typeof CurrentFormSchema>;

  const form = useForm<CurrentFormValues>({
    resolver: zodResolver(CurrentFormSchema),
  });

  React.useEffect(() => {
    if (item && isOpen) {
      if (itemHasBreakdown && currentItemBreakdownKeys.length > 0) {
        const defaultBreakdownValues = currentItemBreakdownKeys.reduce((acc, key) => {
          acc[key] = item.sizeBreakdown?.[key] || 0;
          return acc;
        }, {} as any); 
        form.reset(defaultBreakdownValues);
      } else { 
        form.reset({ quantity: item.quantity || 0 } as CurrentFormValues);
      }
    }
  }, [item, isOpen, form, itemHasBreakdown, currentItemBreakdownKeys]);


  const onSubmit = (data: CurrentFormValues) => {
    if (itemHasBreakdown && currentItemBreakdownKeys.length > 0) {
      const newBreakdown: Partial<Record<string, number>> = {};
      for (const key of currentItemBreakdownKeys) {
        newBreakdown[key] = (data as any)[key] || 0;
      }
      onSave(item.id, newBreakdown);
    } else { 
      onSave(item.id, (data as { quantity: number }).quantity);
    }
    onClose();
  };

  if (!item) return null;

  const getDialogTitle = () => {
    let title = `Ajuster : ${item.name}`;
    if (item.itemCategory === 'food' || item.itemCategory === 'sportif') return `${title} (Par Lieu)`;
    if (item.itemCategory === 'apparel' || item.itemCategory === 'socks') return `${title} (Par Taille)`;
    return title;
  }

  const getDialogDescription = () => {
    if (item.itemCategory === 'food' || item.itemCategory === 'sportif') return "Modifiez les quantités pour chaque lieu.";
    if (item.itemCategory === 'apparel' || item.itemCategory === 'socks') return "Modifiez les quantités pour chaque taille.";
    return "Modifiez la quantité totale.";
  }

  const scrollHeight = (item.itemCategory === 'food' || item.itemCategory === 'sportif') ? "h-[250px]" : "h-[400px]";


  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className={(itemHasBreakdown && currentItemBreakdownKeys.length > 0) ? "sm:max-w-[425px] md:sm:max-w-[600px]" : "sm:max-w-[425px]"}>
        <DialogHeader>
          <DialogTitle>{getDialogTitle()}</DialogTitle>
          <DialogDescription>
            {getDialogDescription()}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            {(itemHasBreakdown && currentItemBreakdownKeys.length > 0) ? (
              <ScrollArea className={`${scrollHeight} pr-4`}>
                <div className="grid grid-cols-2 gap-4 py-4">
                  {currentItemBreakdownKeys.map((key) => (
                    <FormField
                      key={key}
                      control={form.control}
                      name={key as keyof CurrentFormValues} 
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{key}</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              min="0" 
                              {...field} 
                              value={(field.value as number) ?? ""}
                              onChange={e => field.onChange(parseInt(e.target.value, 10) || 0)}
                              onBlur={e => { 
                                  if (e.target.value === "") {
                                      field.onChange(0);
                                  } else {
                                      field.onChange(parseInt(e.target.value, 10) || 0);
                                  }
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
            ) : ( 
              <div className="py-4">
                <FormField
                  control={form.control}
                  name={"quantity" as keyof CurrentFormValues}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Quantité</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          min="0" 
                           {...field} 
                            value={(field.value as number) ?? ""}
                            onChange={e => field.onChange(parseInt(e.target.value, 10) || 0)}
                            onBlur={e => { 
                                if (e.target.value === "") {
                                    field.onChange(0);
                                } else {
                                    field.onChange(parseInt(e.target.value, 10) || 0);
                                }
                            }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}
            <DialogFooter className="mt-4">
              <DialogClose asChild>
                <Button type="button" variant="outline" onClick={onClose}>
                  Annuler
                </Button>
              </DialogClose>
              <Button type="submit">Enregistrer</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
