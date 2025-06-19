
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
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { FoodSupplierDetail } from '@/config/stock-constants';

const nourritureBoissonListItemFormSchema = z.object({
  nom: z.string().min(1, "Le nom de l'article est requis."),
  commentaire: z.string().optional(),
  fournisseur: z.string().optional(), // Stores supplier name
  prix: z.coerce.number().positive("Le prix doit être un nombre positif.").optional().nullable(), // Coerce to number
});

export type NourritureBoissonListItemFormData = z.infer<typeof nourritureBoissonListItemFormSchema>;

interface NourritureBoissonListItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: NourritureBoissonListItemFormData) => void;
  initialData?: Partial<NourritureBoissonListItemFormData> | null;
  fournisseursOptions: FoodSupplierDetail[];
}

const NO_SUPPLIER_VALUE = "_AUCUN_FOURNISSEUR_";

export function NourritureBoissonListItemModal({ 
    isOpen, 
    onClose, 
    onSave, 
    initialData, 
    fournisseursOptions 
}: NourritureBoissonListItemModalProps) {
  const form = useForm<NourritureBoissonListItemFormData>({
    resolver: zodResolver(nourritureBoissonListItemFormSchema),
    defaultValues: {
      nom: "",
      commentaire: "",
      fournisseur: undefined,
      prix: undefined,
    },
  });

  React.useEffect(() => {
    if (isOpen) {
      if (initialData) {
        form.reset({
          nom: initialData.nom || "",
          commentaire: initialData.commentaire || "",
          fournisseur: initialData.fournisseur || undefined,
          prix: initialData.prix === undefined || initialData.prix === null ? undefined : Number(initialData.prix),
        });
      } else {
        form.reset({
          nom: "",
          commentaire: "",
          fournisseur: undefined,
          prix: undefined,
        });
      }
    }
  }, [isOpen, initialData, form]);

  const onSubmit = (data: NourritureBoissonListItemFormData) => {
    // Ensure price is a number or undefined, not null if empty
    const dataToSave = {
      ...data,
      prix: data.prix === null ? undefined : data.prix,
    };
    onSave(dataToSave);
  };

  const modalTitle = initialData ? "Modifier l'article" : "Ajouter un article (Nourriture/Boissons)";

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{modalTitle}</DialogTitle>
          <DialogDescription>
            Saisissez les informations de l'article.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 py-4">
            <FormField
              control={form.control}
              name="nom"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nom de l'article *</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: Pack de Frites, Bouteille d'eau..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="commentaire"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Commentaire</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Détails supplémentaires, ingrédients..." {...field} value={field.value || ''} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="fournisseur"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Fournisseur (Optionnel)</FormLabel>
                  <Select 
                    onValueChange={(value) => field.onChange(value === NO_SUPPLIER_VALUE ? undefined : value)} 
                    value={field.value || NO_SUPPLIER_VALUE}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner un fournisseur" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value={NO_SUPPLIER_VALUE}>Aucun</SelectItem>
                      {fournisseursOptions.map((supplier) => (
                        <SelectItem key={supplier.id} value={supplier.name}>
                          {supplier.name}
                        </SelectItem>
                      ))}
                      {fournisseursOptions.length === 0 && (
                        <p className="p-2 text-sm text-muted-foreground">Aucun fournisseur défini.</p>
                      )}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="prix"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Prix (Optionnel)</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      step="0.01" 
                      placeholder="Ex: 2.50" 
                      {...field}
                      value={field.value === undefined || field.value === null ? '' : field.value}
                      onChange={e => {
                        const value = e.target.value;
                        field.onChange(value === '' ? null : parseFloat(value));
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter className="pt-4">
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
