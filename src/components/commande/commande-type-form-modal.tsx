
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
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { PlusCircle, Trash2 } from 'lucide-react';
import type { CommandeType, CommandeTypeArticle } from '@/app/commande/nourriture-boissons/types/page';
import { getActiveReferenceYear, getGeneratedCategoriesConfig, type CategoryConfigItem } from '@/config/licencies-constants';
import type { NourritureBoissonListItem } from '@/app/administration/gestion-listes/listes-nourriture-boissons/page';
import { getStoredNourritureBoissonListItems, NOURRITURE_BOISSONS_LIST_ITEMS_STORAGE_KEY } from '@/app/administration/gestion-listes/listes-nourriture-boissons/page';

const commandeTypeArticleSchema = z.object({
  id: z.string().optional(),
  nomArticle: z.string().min(1, "La sélection d'un article est requise."),
  quantite: z.coerce.number().int().min(1, "La quantité doit être au moins 1."),
});

export const commandeTypeFormSchema = z.object({
  nom: z.string().min(1, "Le nom de base du modèle est requis."),
  useTeamNameTemplate: z.boolean().optional().default(false),
  teamCategorySuffix: z.string().optional(),
  articles: z.array(commandeTypeArticleSchema).optional(),
  articlesExterieur: z.array(commandeTypeArticleSchema).optional(),
  modelType: z.enum(['annexe', 'match'], { required_error: "Le type de modèle (Annexe ou Match) est requis." }),
}).superRefine((data, ctx) => {
  if (data.modelType === 'match' && data.useTeamNameTemplate && (!data.teamCategorySuffix || data.teamCategorySuffix.trim() === "")) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "La sélection d'une catégorie d'équipe est requise si l'option est cochée pour un modèle Match.",
      path: ["teamCategorySuffix"],
    });
  }
});

export type CommandeTypeFormData = z.infer<typeof commandeTypeFormSchema>;

interface CommandeTypeFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: { nom: string; articles?: CommandeTypeArticle[], articlesDomicile?: CommandeTypeArticle[], articlesExterieur?: CommandeTypeArticle[], modelType: 'annexe' | 'match' }) => void;
  initialData?: CommandeType | null;
}

export function CommandeTypeFormModal({
  isOpen,
  onClose,
  onSave,
  initialData,
}: CommandeTypeFormModalProps) {

  const [licenseeCategories, setLicenseeCategories] = React.useState<CategoryConfigItem[]>([]);
  const [availableFoodItems, setAvailableFoodItems] = React.useState<NourritureBoissonListItem[]>([]);

  const methods = useForm<CommandeTypeFormData>({
    resolver: zodResolver(commandeTypeFormSchema),
    defaultValues: {
      nom: '',
      useTeamNameTemplate: false,
      teamCategorySuffix: undefined,
      articles: [],
      articlesExterieur: [],
      modelType: 'annexe',
    },
  });

  const { control, handleSubmit, reset, watch, setValue } = methods;
  const watchedModelType = watch('modelType');

  const { fields: articlesFields, append: appendArticle, remove: removeArticle } = useFieldArray({
    control,
    name: "articles",
  });
  const { fields: articlesExterieurFields, append: appendArticleExterieur, remove: removeArticleExterieur } = useFieldArray({
    control,
    name: "articlesExterieur",
  });


  const loadArticleOptions = React.useCallback(() => {
    setAvailableFoodItems(getStoredNourritureBoissonListItems());
  }, []);

  React.useEffect(() => {
    if (isOpen) {
      const activeYear = getActiveReferenceYear();
      const cats = getGeneratedCategoriesConfig(activeYear);
      setLicenseeCategories(cats);
      loadArticleOptions();

      if (initialData) {
        let baseName = initialData.nom;
        let useEffectTeamSuffix = false;
        let useEffectCategorySuffixId = undefined;
        const teamSuffixMarker = " - ";

        if (initialData.modelType === 'match' && initialData.nom.includes(teamSuffixMarker)) {
          const parts = initialData.nom.split(teamSuffixMarker);
          const potentialCategoryId = parts[parts.length - 1];
          const foundCategoryById = cats.find(c => c.id === potentialCategoryId);

          if (foundCategoryById) {
            baseName = parts.slice(0, -1).join(teamSuffixMarker);
            useEffectTeamSuffix = true;
            useEffectCategorySuffixId = foundCategoryById.id;
          } else {
            baseName = initialData.nom;
          }
        }

        reset({
          nom: baseName,
          useTeamNameTemplate: initialData.modelType === 'match' ? useEffectTeamSuffix : false,
          teamCategorySuffix: initialData.modelType === 'match' ? useEffectCategorySuffixId : undefined,
          articles: initialData.modelType === 'annexe' ? (initialData.articles || []) : (initialData.articlesDomicile || []),
          articlesExterieur: initialData.modelType === 'match' ? (initialData.articlesExterieur || []) : [],
          modelType: initialData.modelType || 'annexe',
        });
        if (initialData.modelType === 'match') {
            setValue('useTeamNameTemplate', true);
        }

      } else {
        reset({
          nom: '',
          useTeamNameTemplate: false,
          teamCategorySuffix: undefined,
          articles: [],
          articlesExterieur: [],
          modelType: 'annexe',
        });
      }
    }
    const handleStorageChange = (event: StorageEvent) => {
        if (event.key === NOURRITURE_BOISSONS_LIST_ITEMS_STORAGE_KEY && isOpen) {
            loadArticleOptions();
        }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);

  }, [isOpen, initialData, reset, loadArticleOptions, setValue]);

  React.useEffect(() => {
    if (watchedModelType === 'annexe') {
      setValue('useTeamNameTemplate', false);
      setValue('teamCategorySuffix', undefined);
    } else if (watchedModelType === 'match') {
      setValue('useTeamNameTemplate', true);
    }
  }, [watchedModelType, setValue]);


  const onSubmit = (formData: CommandeTypeFormData) => {
    let finalName = formData.nom.trim();

    if (formData.modelType === 'match') {
      if (formData.teamCategorySuffix) {
          const selectedCategory = licenseeCategories.find(c => c.id === formData.teamCategorySuffix);
          if (selectedCategory) {
              finalName += ` - ${selectedCategory.id}`;
          }
      } else {
        methods.setError("teamCategorySuffix", {type: "manual", message: "La catégorie d'équipe est requise pour le suffixe."});
        return;
      }
    }

    if (!finalName) {
        methods.setError("nom", { type: "manual", message: "Le nom final du modèle ne peut pas être vide."});
        return;
    }

    const articlesToSave = formData.articles?.map(({ id, ...rest }) => rest) || [];
    const articlesExterieurToSave = formData.articlesExterieur?.map(({ id, ...rest }) => rest) || [];

    if (formData.modelType === 'match') {
      onSave({ nom: finalName, articlesDomicile: articlesToSave, articlesExterieur: articlesExterieurToSave, modelType: formData.modelType });
    } else {
      onSave({ nom: finalName, articles: articlesToSave, modelType: formData.modelType });
    }
    onClose();
  };

  const modalTitle = initialData ? 'Modifier le Modèle de Commande' : 'Ajouter un Modèle de Commande';

  const renderArticleList = (
    fieldArray: typeof articlesFields | typeof articlesExterieurFields,
    appendFn: typeof appendArticle | typeof appendArticleExterieur,
    removeFn: typeof removeArticle | typeof removeArticleExterieur,
    namePrefix: "articles" | "articlesExterieur"
  ) => (
    <div className="pr-2 pl-0.5 py-2 border rounded-md">
        <h4 className="text-sm font-medium mb-2 px-1.5">
          {namePrefix === "articles" ? (watchedModelType === 'match' ? "Articles Domicile" : "Articles") : "Articles Extérieur"}
        </h4>
        {fieldArray.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-4">
                Aucun article.
            </p>
        )}
        {fieldArray.map((item, index) => (
          <div key={item.id} className="flex items-end space-x-2 p-1.5 border-b last:border-b-0 mb-1">
            <FormField
              control={control}
              name={`${namePrefix}.${index}.nomArticle`}
              render={({ field }) => (
                <FormItem className="flex-1">
                  <FormLabel className="text-xs sr-only">Article {index + 1}</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || ""}>
                    <FormControl>
                      <SelectTrigger className="h-9">
                        <SelectValue placeholder="Sélectionner un article" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {availableFoodItems.length > 0 ?
                        availableFoodItems.map((foodItem) => (
                          <SelectItem key={foodItem.id} value={foodItem.nom}>
                            {foodItem.nom}
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
              name={`${namePrefix}.${index}.quantite`}
              render={({ field }) => (
                <FormItem className="w-24">
                  <FormLabel className="text-xs sr-only">Quantité</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="Qté" {...field} className="h-9"/>
                  </FormControl>
                  <FormMessage className="text-xs" />
                </FormItem>
              )}
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => removeFn(index)}
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
          onClick={() => appendFn({ id: crypto.randomUUID(), nomArticle: '', quantite: 1 })}
          className="mt-2 w-full"
        >
          <PlusCircle className="mr-2 h-4 w-4" />
          Ajouter un article
        </Button>
    </div>
  );


  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-lg md:max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{modalTitle}</DialogTitle>
          <DialogDescription>
            Définissez le nom du modèle, son type, et les articles qu'il contient.
          </DialogDescription>
        </DialogHeader>

        {/* THIS IS THE SCROLLABLE SECTION */}
        <div className="flex-1 min-h-0 overflow-y-auto py-2 pr-3 pl-1"> 
          <FormProvider {...methods}>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4"> {/* Form itself should not have flex-1 or height constraints */}
              <FormField
                control={control}
                name="modelType"
                render={({ field }) => (
                  <FormItem className="space-y-2 mb-4">
                    <FormLabel>Type de Modèle *</FormLabel>
                    <FormControl>
                      <RadioGroup
                        onValueChange={field.onChange}
                        value={field.value}
                        className="flex space-x-4"
                      >
                        <FormItem className="flex items-center space-x-2">
                          <FormControl><RadioGroupItem value="annexe" /></FormControl>
                          <FormLabel className="font-normal">Annexe</FormLabel>
                        </FormItem>
                        <FormItem className="flex items-center space-x-2">
                          <FormControl><RadioGroupItem value="match" /></FormControl>
                          <FormLabel className="font-normal">Match</FormLabel>
                        </FormItem>
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={control}
                name="nom"
                render={({ field }) => (
                  <FormItem className="mb-4">
                    <FormLabel>Nom de base du Modèle *</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: Commande Buvette Week-end" {...field} value={field.value || ''} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {watchedModelType === 'match' && (
                <>
                  <FormField
                    control={control}
                    name="useTeamNameTemplate"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center space-x-2 space-y-0 pt-1 mb-2">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            disabled={watchedModelType === 'match'}
                          />
                        </FormControl>
                        <FormLabel className="font-normal">
                          Ajouter un suffixe de catégorie d'équipe (obligatoire pour type Match)
                        </FormLabel>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={control}
                    name="teamCategorySuffix"
                    render={({ field }) => (
                      <FormItem className="mb-4">
                        <FormLabel>Catégorie de l'Équipe pour Suffixe *</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value || ""}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Sélectionner une catégorie" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {licenseeCategories.map((cat) => (
                              <SelectItem key={cat.id} value={cat.id}>
                                {cat.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </>
              )}

              {renderArticleList(articlesFields, appendArticle, removeArticle, "articles")}

              {watchedModelType === 'match' && (
                <div className="mt-4">
                  {renderArticleList(articlesExterieurFields, appendArticleExterieur, removeArticleExterieur, "articlesExterieur")}
                </div>
              )}
            </form>
          </FormProvider>
        </div>
        {/* END SCROLLABLE SECTION */}

        <DialogFooter className="pt-4 border-t mt-auto">
          <DialogClose asChild>
            <Button type="button" variant="outline" onClick={onClose}>
              Annuler
            </Button>
          </DialogClose>
          <Button type="button" onClick={handleSubmit(onSubmit)}>Enregistrer le Modèle</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
