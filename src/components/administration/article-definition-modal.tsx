
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ITEM_CATEGORIES_CHOICES, type ItemCategoryChoice } from '@/config/stock-constants';

const DESIGNATED_SECTIONS = ['equipement', 'nourriture', 'sportif'] as const;
type DesignatedSection = typeof DESIGNATED_SECTIONS[number];

const articleDefinitionFormSchema = z.object({
  name: z.string().min(1, "Le nom de la définition est requis."),
  itemCategory: z.enum(ITEM_CATEGORIES_CHOICES.map(cat => cat.id) as [ItemCategoryChoice, ...ItemCategoryChoice[]], {
    required_error: "La catégorie de l'article est requise."
  }),
  standardItemDesignatedSection: z.enum(DESIGNATED_SECTIONS).optional(),
}).superRefine((data, ctx) => {
  if (data.itemCategory === 'standard' && !data.standardItemDesignatedSection) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "La section de destination est requise pour la catégorie 'Standard'.",
      path: ["standardItemDesignatedSection"],
    });
  }
});

export type ArticleDefinitionFormData = z.infer<typeof articleDefinitionFormSchema>;

interface ArticleDefinitionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: ArticleDefinitionFormData, editingId?: string) => void;
  initialData?: Partial<ArticleDefinitionFormData & { standardItemDesignatedSection?: DesignatedSection | null }>; // Permettre null pour initialData
  editingId?: string;
}

export function ArticleDefinitionModal({ isOpen, onClose, onSave, initialData, editingId }: ArticleDefinitionModalProps) {
  const form = useForm<ArticleDefinitionFormData>({
    resolver: zodResolver(articleDefinitionFormSchema),
    defaultValues: {
      name: "",
      itemCategory: undefined,
      standardItemDesignatedSection: undefined,
    },
  });

  const watchedItemCategory = form.watch("itemCategory");

  React.useEffect(() => {
    if (isOpen) {
      if (initialData) {
        form.reset({
            name: initialData.name || "",
            itemCategory: initialData.itemCategory,
            standardItemDesignatedSection: initialData.standardItemDesignatedSection === null ? undefined : initialData.standardItemDesignatedSection,
        });
      } else {
        form.reset({
          name: "",
          itemCategory: undefined,
          standardItemDesignatedSection: undefined,
        });
      }
    }
  }, [isOpen, initialData, form]);

  const onSubmit = (data: ArticleDefinitionFormData) => {
    const dataToSave = { ...data };
    if (data.itemCategory !== 'standard') {
      dataToSave.standardItemDesignatedSection = undefined;
    }
    onSave(dataToSave, editingId);
  };

  const modalTitle = editingId ? "Modifier la Définition d'Article" : "Ajouter une Définition d'Article";

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{modalTitle}</DialogTitle>
          <DialogDescription>
            Définissez le nom et la catégorie de base pour cet article.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nom de l'article</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: Veste survêtement, Gourde..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="itemCategory"
              render={({ field }) => (
                <FormItem className="space-y-3">
                  <FormLabel>Catégorie de l'article</FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={(value) => {
                        field.onChange(value);
                        if (value !== 'standard') {
                          form.setValue('standardItemDesignatedSection', undefined);
                          form.clearErrors('standardItemDesignatedSection');
                        }
                      }}
                      value={field.value}
                      className="flex flex-col space-y-1"
                    >
                      {ITEM_CATEGORIES_CHOICES.map((cat) => (
                        <FormItem key={cat.id} className="flex items-center space-x-3 space-y-0">
                          <FormControl>
                            <RadioGroupItem value={cat.id} />
                          </FormControl>
                          <FormLabel className="font-normal">
                            {cat.label}
                          </FormLabel>
                        </FormItem>
                      ))}
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {watchedItemCategory === 'standard' && (
              <FormField
                control={form.control}
                name="standardItemDesignatedSection"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Section de Destination (pour Standard) *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Choisir une section" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="equipement">Équipement</SelectItem>
                        <SelectItem value="nourriture">Nourriture & Boissons</SelectItem>
                        <SelectItem value="sportif">Matériel Sportif</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

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
