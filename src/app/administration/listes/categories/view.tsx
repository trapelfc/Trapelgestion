
"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PlusCircle, Pencil, Trash2, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
  } from "@/components/ui/alert-dialog"
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import type { Category, Size } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { addCategory, updateCategory, deleteCategory, addSizeToCategory, updateSizeInCategory, deleteSizeInCategory } from "@/lib/actions";

export function CategoriesView({ categories }: { categories: Category[] }) {
    const { toast } = useToast();
    const router = useRouter();

    // State for Category modals
    const [isCategoryDialogOpen, setCategoryDialogOpen] = React.useState(false);
    const [isCategoryAlertOpen, setCategoryAlertOpen] = React.useState(false);
    const [selectedCategory, setSelectedCategory] = React.useState<Category | null>(null);
    const [categoryData, setCategoryData] = React.useState<Omit<Category, 'id' | 'sizes'>>({ name: "" });

    // State for Size modals
    const [isSizeDialogOpen, setSizeDialogOpen] = React.useState(false);
    const [isSizeAlertOpen, setSizeAlertOpen] = React.useState(false);
    const [selectedSize, setSelectedSize] = React.useState<Size | null>(null);
    const [sizeData, setSizeData] = React.useState<Omit<Size, 'id'>>({ name: "" });
    const [currentCategoryForSize, setCurrentCategoryForSize] = React.useState<Category | null>(null);

    // --- Category Handlers ---
    const handleAddNewCategoryClick = () => {
        setSelectedCategory(null);
        setCategoryData({ name: "" });
        setCategoryDialogOpen(true);
    };

    const handleEditCategoryClick = (category: Category) => {
        setSelectedCategory(category);
        setCategoryData({ name: category.name });
        setCategoryDialogOpen(true);
    };

    const handleDeleteCategoryClick = (category: Category) => {
        setSelectedCategory(category);
        setCategoryAlertOpen(true);
    }

    const handleSaveCategory = async () => {
        if (!categoryData.name) {
            toast({ title: "Erreur", description: "Le nom de la catégorie est requis.", variant: "destructive" });
            return;
        }

        if (selectedCategory) {
            await updateCategory({ ...selectedCategory, name: categoryData.name });
            toast({ title: "Catégorie modifiée", description: `La catégorie "${categoryData.name}" a été mise à jour.` });
        } else {
            await addCategory(categoryData);
            toast({ title: "Catégorie ajoutée", description: `La nouvelle catégorie "${categoryData.name}" a été créée.` });
        }
        setCategoryDialogOpen(false);
        setSelectedCategory(null);
        router.refresh();
    };

    const handleConfirmDeleteCategory = async () => {
        if (selectedCategory) {
            await deleteCategory(selectedCategory.id);
            toast({ title: "Catégorie supprimée", description: `La catégorie "${selectedCategory.name}" a été supprimée.`, variant: "destructive" });
            setCategoryAlertOpen(false);
            setSelectedCategory(null);
            router.refresh();
        }
    }

    // --- Size Handlers ---
    const handleAddSizeClick = (category: Category) => {
        setSelectedSize(null);
        setSizeData({ name: "" });
        setCurrentCategoryForSize(category);
        setSizeDialogOpen(true);
    };

    const handleEditSizeClick = (category: Category, size: Size) => {
        setSelectedSize(size);
        setSizeData({ name: size.name });
        setCurrentCategoryForSize(category);
        setSizeDialogOpen(true);
    };

    const handleDeleteSizeClick = (category: Category, size: Size) => {
        setSelectedSize(size);
        setCurrentCategoryForSize(category);
        setSizeAlertOpen(true);
    }

    const handleSaveSize = async () => {
        if (!sizeData.name || !currentCategoryForSize) {
            toast({ title: "Erreur", description: "Le nom de la taille est requis.", variant: "destructive" });
            return;
        }

        if (selectedSize) {
            await updateSizeInCategory(currentCategoryForSize.id, { ...selectedSize, name: sizeData.name });
            toast({ title: "Taille modifiée", description: `La taille a été mise à jour.` });
        } else {
            await addSizeToCategory(currentCategoryForSize.id, sizeData.name);
            toast({ title: "Taille ajoutée", description: `La taille "${sizeData.name}" a été ajoutée.` });
        }
        setSizeDialogOpen(false);
        setSelectedSize(null);
        setCurrentCategoryForSize(null);
        router.refresh();
    };

    const handleConfirmDeleteSize = async () => {
        if (selectedSize && currentCategoryForSize) {
            await deleteSizeInCategory(currentCategoryForSize.id, selectedSize.id);
            toast({ title: "Taille supprimée", description: `La taille "${selectedSize.name}" a été supprimée.`, variant: "destructive" });
            setSizeAlertOpen(false);
            setSelectedSize(null);
            setCurrentCategoryForSize(null);
            router.refresh();
        }
    }

    return (
        <>
            <Card className="shadow-lg">
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle className="text-3xl font-headline">Gestion des Catégories et Tailles</CardTitle>
                        <CardDescription>
                            Gérez les catégories d'équipement et leurs tailles associées.
                        </CardDescription>
                    </div>
                    <Button onClick={handleAddNewCategoryClick}>
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Ajouter une catégorie
                    </Button>
                </CardHeader>
                <CardContent className="pt-6 space-y-6">
                     {categories.map((category) => (
                        <Card key={category.id} className="overflow-hidden border-2">
                            <CardHeader className="bg-muted/30 p-4 flex flex-row items-center justify-between">
                                <CardTitle className="text-xl font-semibold">{category.name}</CardTitle>
                                <div className="flex items-center gap-1">
                                    <Button variant="ghost" size="icon" onClick={() => handleEditCategoryClick(category)}>
                                        <Pencil className="h-4 w-4" />
                                        <span className="sr-only">Modifier la catégorie</span>
                                    </Button>
                                    <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => handleDeleteCategoryClick(category)}>
                                        <Trash2 className="h-4 w-4" />
                                        <span className="sr-only">Supprimer la catégorie</span>
                                    </Button>
                                </div>
                            </CardHeader>
                            <CardContent className="p-4">
                                <h4 className="mb-3 text-sm font-medium text-muted-foreground">Tailles disponibles</h4>
                                {category.sizes?.length > 0 ? (
                                    <div className="flex flex-wrap gap-2">
                                        {category.sizes.map((size) => (
                                            <Badge key={size.id} variant="secondary" className="group text-base py-1 pl-3 pr-2 relative cursor-default">
                                                <span>{size.name}</span>
                                                <div className="absolute inset-0 bg-black/60 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                     <Button variant="ghost" size="icon" className="h-6 w-6 text-white hover:bg-white/20" onClick={() => handleEditSizeClick(category, size)}>
                                                        <Pencil className="h-3 w-3" />
                                                    </Button>
                                                     <Button variant="ghost" size="icon" className="h-6 w-6 text-white hover:bg-white/20" onClick={() => handleDeleteSizeClick(category, size)}>
                                                        <X className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </Badge>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-sm text-muted-foreground">Aucune taille définie.</p>
                                )}
                                <Button variant="outline" size="sm" className="mt-4" onClick={() => handleAddSizeClick(category)}>
                                    <PlusCircle className="mr-2 h-4 w-4" />
                                    Ajouter une taille
                                </Button>
                            </CardContent>
                        </Card>
                     ))}
                </CardContent>
            </Card>

            {/* Category Add/Edit Dialog */}
            <Dialog open={isCategoryDialogOpen} onOpenChange={setCategoryDialogOpen}>
                <DialogContent className="sm:max-w-[480px]">
                    <DialogHeader>
                        <DialogTitle>{selectedCategory ? "Modifier la catégorie" : "Ajouter une catégorie"}</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <Label htmlFor="cat-name">Nom de la catégorie</Label>
                        <Input id="cat-name" value={categoryData.name} onChange={(e) => setCategoryData({ name: e.target.value })} />
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setCategoryDialogOpen(false)}>Annuler</Button>
                        <Button onClick={handleSaveCategory}>Sauvegarder</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Category Delete Alert */}
            <AlertDialog open={isCategoryAlertOpen} onOpenChange={setCategoryAlertOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Êtes-vous sûr ?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Cette action est irréversible. La catégorie "{selectedCategory?.name}" et toutes ses tailles associées seront supprimées.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Annuler</AlertDialogCancel>
                        <AlertDialogAction onClick={handleConfirmDeleteCategory} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Supprimer</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

             {/* Size Add/Edit Dialog */}
            <Dialog open={isSizeDialogOpen} onOpenChange={setSizeDialogOpen}>
                <DialogContent className="sm:max-w-[480px]">
                    <DialogHeader>
                        <DialogTitle>{selectedSize ? 'Modifier la taille' : 'Ajouter une taille'}</DialogTitle>
                        <DialogDescription>
                            Pour la catégorie "{currentCategoryForSize?.name}"
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <Label htmlFor="size-name">Nom de la taille</Label>
                        <Input id="size-name" value={sizeData.name} onChange={(e) => setSizeData({ name: e.target.value })} />
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setSizeDialogOpen(false)}>Annuler</Button>
                        <Button onClick={handleSaveSize}>Sauvegarder</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Size Delete Alert */}
            <AlertDialog open={isSizeAlertOpen} onOpenChange={setSizeAlertOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Êtes-vous sûr ?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Voulez-vous vraiment supprimer la taille "{selectedSize?.name}" de la catégorie "{currentCategoryForSize?.name}"?
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Annuler</AlertDialogCancel>
                        <AlertDialogAction onClick={handleConfirmDeleteSize} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Supprimer</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
