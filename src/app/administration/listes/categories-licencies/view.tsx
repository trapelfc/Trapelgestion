
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
import { PlusCircle, Pencil, Trash2 } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import type { LicenseeCategory } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { addLicenseeCategory, updateLicenseeCategory, deleteLicenseeCategory } from "@/lib/actions";

export function LicenseeCategoriesView({ licenseeCategories, referenceSeason }: { licenseeCategories: LicenseeCategory[], referenceSeason: number }) {
    const [isDialogOpen, setDialogOpen] = React.useState(false);
    const [isAlertOpen, setAlertOpen] = React.useState(false);
    const [selectedCategory, setSelectedCategory] = React.useState<LicenseeCategory | null>(null);
    const [categoryData, setCategoryData] = React.useState<Omit<LicenseeCategory, 'id'>>({ name: "", color: "", description: "" });
    const { toast } = useToast();
    const router = useRouter();

    const handleAddNewClick = () => {
        setSelectedCategory(null);
        setCategoryData({ name: "", color: "#ffffff", description: "" });
        setDialogOpen(true);
    };

    const handleEditClick = (category: LicenseeCategory) => {
        setSelectedCategory(category);
        setCategoryData({ name: category.name, color: category.color, description: category.description });
        setDialogOpen(true);
    };

    const handleDeleteClick = (category: LicenseeCategory) => {
        setSelectedCategory(category);
        setAlertOpen(true);
    }

    const handleSaveChanges = async () => {
        if (!categoryData.name || !categoryData.color || !categoryData.description) {
            toast({
                title: "Erreur",
                description: "Veuillez remplir tous les champs.",
                variant: "destructive"
            });
            return;
        }

        if (selectedCategory) {
            await updateLicenseeCategory({ ...selectedCategory, ...categoryData });
            toast({
                title: "Catégorie modifiée",
                description: `La catégorie "${categoryData.name}" a été mise à jour.`,
            });
        } else {
            await addLicenseeCategory(categoryData);
            toast({
                title: "Catégorie ajoutée",
                description: `La nouvelle catégorie "${categoryData.name}" a été créée.`,
            });
        }
        setDialogOpen(false);
        setSelectedCategory(null);
        router.refresh();
    };

    const handleConfirmDelete = async () => {
        if (selectedCategory) {
            await deleteLicenseeCategory(selectedCategory.id);
            toast({
                title: "Catégorie supprimée",
                description: `La catégorie "${selectedCategory.name}" a été supprimée.`,
                variant: "destructive"
            });
            setAlertOpen(false);
            setSelectedCategory(null);
            router.refresh();
        }
    }

    const dialogTitle = selectedCategory ? "Modifier la catégorie" : "Ajouter une nouvelle catégorie";
    const dialogDescription = selectedCategory
        ? "Modifiez les informations de la catégorie ci-dessous."
        : "Remplissez les informations pour créer une nouvelle catégorie. Pour les catégories standards (ex: U10-U11), la description sera mise à jour automatiquement avec la saison de référence.";


    return (
        <>
            <Card className="shadow-lg">
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle className="text-3xl font-headline">Gestion des Catégories de Licenciés</CardTitle>
                        <CardDescription>
                            Gérez les catégories par âge, chacune avec une couleur distincte. La description de l'âge est basée sur la saison {referenceSeason - 1}-{referenceSeason}.
                        </CardDescription>
                    </div>
                    <Button onClick={handleAddNewClick}>
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Ajouter une catégorie
                    </Button>
                </CardHeader>
                <CardContent className="pt-6">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[80px]">Couleur</TableHead>
                                <TableHead>Nom de la catégorie</TableHead>
                                <TableHead>Description de l'âge (Saison {referenceSeason - 1}-{referenceSeason})</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {licenseeCategories.map((category) => (
                                <TableRow key={category.id}>
                                    <TableCell>
                                        <div className="h-6 w-6 rounded-full border" style={{ backgroundColor: category.color }} />
                                    </TableCell>
                                    <TableCell className="font-medium">{category.name}</TableCell>
                                    <TableCell>{category.description}</TableCell>
                                    <TableCell className="text-right space-x-2">
                                        <Button variant="ghost" size="icon" onClick={() => handleEditClick(category)}>
                                            <Pencil className="h-4 w-4" />
                                            <span className="sr-only">Modifier</span>
                                        </Button>
                                        <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => handleDeleteClick(category)}>
                                            <Trash2 className="h-4 w-4" />
                                            <span className="sr-only">Supprimer</span>
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <Dialog open={isDialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent className="sm:max-w-[520px]">
                    <DialogHeader>
                        <DialogTitle>{dialogTitle}</DialogTitle>
                        <DialogDescription>{dialogDescription}</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="name" className="text-right">
                                Nom
                            </Label>
                            <Input
                                id="name"
                                value={categoryData.name}
                                onChange={(e) => setCategoryData({ ...categoryData, name: e.target.value })}
                                className="col-span-3"
                                placeholder="ex: U10-U11 G ou Loisirs"
                            />
                        </div>
                         <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="description" className="text-right">
                                Description
                            </Label>
                            <Input
                                id="description"
                                value={categoryData.description}
                                onChange={(e) => setCategoryData({ ...categoryData, description: e.target.value })}
                                className="col-span-3"
                                placeholder="ex: Nés en 2016 ou 2017"
                            />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="color" className="text-right">
                                Couleur
                            </Label>
                            <div className="col-span-3 flex items-center gap-2">
                                <Input
                                    id="color"
                                    type="color"
                                    value={categoryData.color}
                                    onChange={(e) => setCategoryData({ ...categoryData, color: e.target.value })}
                                    className="w-full"
                                />
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDialogOpen(false)}>Annuler</Button>
                        <Button onClick={handleSaveChanges}>Sauvegarder</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <AlertDialog open={isAlertOpen} onOpenChange={setAlertOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Êtes-vous sûr ?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Cette action est irréversible. La catégorie "{selectedCategory?.name}" sera définitivement supprimée.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Annuler</AlertDialogCancel>
                        <AlertDialogAction onClick={handleConfirmDelete} className={ "bg-destructive text-destructive-foreground hover:bg-destructive/90" }>Supprimer</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
