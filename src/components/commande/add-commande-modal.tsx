
'use client';

import * as React from 'react';
import { useForm, useFieldArray, FormProvider } from 'react-hook-form';
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
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { PlusCircle, Trash2 } from 'lucide-react';
import type { NouvelleCommandeEnPreparation, CommandeArticleDetail } from '@/app/commande/nourriture-boissons/nouvelle/page';
import type { NourritureBoissonListItem } from '@/app/administration/gestion-listes/listes-nourriture-boissons/page';

const commandeArticleSchema = z.object({
  nomArticle: z.string().min(1, "La sélection d'un article est requise."),
  quantite: z.coerce.number().int().min(1, "La quantité doit être au moins 1."),
  prixUnitaire: z.number().optional(),
  prixTotalArticle: z.number().optional(),
});

// Schéma simplifié pour une commande ponctuelle uniquement
const addPonctuelleCommandeFormSchema = z.object({
  nomCommande: z.string().min(1, "Le nom de la commande est requis."),
  articles: z.array(commandeArticleSchema).min(1, "Au moins un article est requis pour la commande."),
});

type AddPonctuelleCommandeFormData = z.infer<typeof addPonctuelleCommandeFormSchema>;

interface AddCommandeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSavePreparedCommande: (commande: Omit<NouvelleCommandeEnPreparation, 'id'>) => void;
  initialData?: NouvelleCommandeEnPreparation | null;
  articlesNourritureDisponibles: NourritureBoissonListItem[];
}

export function AddCommandeModal({
  isOpen,
  onClose,
  onSavePreparedCommande,
  initialData,
  articlesNourritureDisponibles,
}: AddCommandeModalProps) {

  const methods = useForm<AddPonctuelleCommandeFormData>({
    resolver: zodResolver(addPonctuelleCommandeFormSchema),
    defaultValues: {
      nomCommande: '',
      articles: [{ nomArticle: '', quantite: 1, prixUnitaire: 0, prixTotalArticle: 0 }],
    },
  });

  const { control, handleSubmit, watch, setValue, reset } = methods;
  const currentArticles = watch('articles');

  const { fields, append, remove, replace } = useFieldArray({
    control,
    name: "articles",
  });

  React.useEffect(() => {
    if (isOpen) {
      if (initialData && initialData.type === 'ponctuelle') { // S'assurer que c'est une ponctuelle si on édite
        const articlesAvecPrix = initialData.articles.map(art => {
            const itemDef = articlesNourritureDisponibles.find(nbli => nbli.nom === art.nomArticle);
            return {
                ...art,
                prixUnitaire: itemDef?.prix,
                prixTotalArticle: itemDef?.prix ? itemDef.prix * art.quantite : 0,
            };
        });
        reset({
          nomCommande: initialData.nom,
          articles: articlesAvecPrix.length > 0 ? articlesAvecPrix : [{ nomArticle: '', quantite: 1, prixUnitaire: 0, prixTotalArticle: 0 }],
        });
      } else if (initialData && initialData.type === 'modele' && initialData.id) { // Permet d'éditer une commande existante qui était un modèle
         const articlesAvecPrix = initialData.articles.map(art => {
            const itemDef = articlesNourritureDisponibles.find(nbli => nbli.nom === art.nomArticle);
            return {
                ...art,
                prixUnitaire: itemDef?.prix,
                prixTotalArticle: itemDef?.prix ? itemDef.prix * art.quantite : 0,
            };
        });
        reset({
          nomCommande: initialData.nom,
          articles: articlesAvecPrix.length > 0 ? articlesAvecPrix : [{ nomArticle: '', quantite: 1, prixUnitaire: 0, prixTotalArticle: 0 }],
        });
      }
      else {
        reset({
          nomCommande: '',
          articles: [{ nomArticle: '', quantite: 1, prixUnitaire: 0, prixTotalArticle: 0 }],
        });
      }
    }
  }, [isOpen, initialData, reset, articlesNourritureDisponibles]);


  const calculateTotalCommande = React.useCallback(() => {
    return currentArticles.reduce((total, art) => {
      const itemDef = articlesNourritureDisponibles.find(nbli => nbli.nom === art.nomArticle);
      const prix = itemDef?.prix ?? 0;
      return total + (prix * (art.quantite || 0));
    }, 0);
  }, [currentArticles, articlesNourritureDisponibles]);

  const onSubmit = (data: AddPonctuelleCommandeFormData) => {
    const finalArticles: CommandeArticleDetail[] = data.articles.map(art => {
        const itemDef = articlesNourritureDisponibles.find(nbli => nbli.nom === art.nomArticle);
        return {
            nomArticle: art.nomArticle,
            quantite: art.quantite,
            prixUnitaire: itemDef?.prix,
            prixTotalArticle: (itemDef?.prix ?? 0) * art.quantite,
        };
    });

    const montantTotal = calculateTotalCommande();

    onSavePreparedCommande({
      nom: data.nomCommande,
      type: initialData?.id ? initialData.type : 'ponctuelle', // Garde le type si édition, sinon ponctuelle
      articles: finalArticles,
      montantTotalCommande: montantTotal,
      modelType: initialData?.id ? initialData.modelType : 'annexe', // Garde le modelType si édition, sinon annexe pour ponctuelle
    });
    onClose();
  };

  const modalTitle = initialData?.id ? "Modifier la Commande" : "Ajouter une Commande Ponctuelle";

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-lg md:max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{modalTitle}</DialogTitle>
        </DialogHeader>

        <FormProvider {...methods}>
          <form onSubmit={handleSubmit(onSubmit)} className="flex-1 min-h-0 flex flex-col space-y-4">
            <FormField
              control={control}
              name="nomCommande"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nom de la Commande *</FormLabel>
                  <FormControl><Input placeholder="Ex: Commande Buvette Tournoi U11" {...field} value={field.value || ''} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <ScrollArea className="flex-1 min-h-0 pr-2 pl-0.5 py-2 border rounded-md">
              <h4 className="text-sm font-medium mb-2 px-1.5">Articles de la Commande</h4>
              {fields.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-4">
                  Aucun article dans cette commande.
                </p>
              )}
              {fields.map((item, index) => (
                <div key={item.id} className="flex items-end space-x-2 p-1.5 border-b last:border-b-0 mb-1">
                  <FormField
                    control={control}
                    name={`articles.${index}.nomArticle`}
                    render={({ field }) => (
                      <FormItem className="flex-1">
                        <FormLabel className="text-xs sr-only">Article {index + 1}</FormLabel>
                        <Select
                          onValueChange={(value) => {
                            field.onChange(value);
                            const itemDef = articlesNourritureDisponibles.find(nbli => nbli.nom === value);
                            setValue(`articles.${index}.prixUnitaire`, itemDef?.prix);
                          }}
                          value={field.value || ""}
                        >
                          <FormControl>
                            <SelectTrigger className="h-9">
                              <SelectValue placeholder="Sélectionner un article" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {articlesNourritureDisponibles.length > 0 ?
                              articlesNourritureDisponibles.map((foodItem) => (
                                <SelectItem key={foodItem.id} value={foodItem.nom}>
                                  {foodItem.nom} {foodItem.prix !== undefined ? `(${foodItem.prix.toFixed(2)}€)`: ''}
                                </SelectItem>
                              ))
                              : <p className="p-2 text-sm text-muted-foreground">Aucun article défini.</p>
                            }
                          </SelectContent>
                        </Select>
                        <FormMessage className="text-xs" />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={control}
                    name={`articles.${index}.quantite`}
                    render={({ field }) => (
                      <FormItem className="w-24">
                        <FormLabel className="text-xs sr-only">Quantité</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="Qté"
                            {...field}
                            className="h-9"
                          />
                        </FormControl>
                        <FormMessage className="text-xs" />
                      </FormItem>
                    )}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => remove(index)}
                    className="text-destructive hover:bg-destructive/10 h-9 w-9"
                    aria-label="Supprimer cet article"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => append({ nomArticle: '', quantite: 1, prixUnitaire:0, prixTotalArticle:0 })}
                className="mt-2 w-full"
              >
                <PlusCircle className="mr-2 h-4 w-4" />
                Ajouter un article
              </Button>
            </ScrollArea>

            <div className="text-right font-semibold text-lg mt-2">
              Montant Total : {calculateTotalCommande().toFixed(2)} €
            </div>

            <DialogFooter className="pt-4 border-t mt-auto">
              <DialogClose asChild>
                <Button type="button" variant="outline" onClick={onClose}>
                  Annuler
                </Button>
              </DialogClose>
              <Button type="submit">
                {initialData?.id ? "Modifier la Commande" : "Ajouter à la Préparation"}
              </Button>
            </DialogFooter>
          </form>
        </FormProvider>
      </DialogContent>
    </Dialog>
  );
}
