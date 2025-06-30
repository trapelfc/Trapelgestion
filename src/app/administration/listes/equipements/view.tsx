
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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
  } from "@/components/ui/select";
import type { EquipmentItem, Category } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { addEquipement, updateEquipement, deleteEquipement } from "@/lib/actions";

export function EquipementsView({ equipements, categories }: { equipements: EquipmentItem[], categories: Category[] }) {
    const [isDialogOpen, setDialogOpen] = React.useState(false);
    const [isAlertOpen, setAlertOpen] = React.useState(false);
    const [selectedEquipement, setSelectedEquipement] = React.useState<EquipmentItem | null>(null);
    const [equipementData, setEquipementData] = React.useState<Omit<EquipmentItem, 'id'>>({ name: "", category: "", reference_adulte: "", reference_enfant: "" });
    const { toast } = useToast();
    const router = useRouter();

    const handleAddNewClick = () => {
        setSelectedEquipement(null);
        setEquipementData({ name: "", category: "", reference_adulte: "", reference_enfant: "" });
        setDialogOpen(true);
    };

    const handleEditClick = (equipement: EquipmentItem) => {
        setSelectedEquipement(equipement);
        setEquipementData({
            ...equipement,
            reference_adulte: equipement.reference_adulte || '',
            reference_enfant: equipement.reference_enfant || ''
        });
        setDialogOpen(true);
    };

    const handleDeleteClick = (equipement: EquipmentItem) => {
        setSelectedEquipement(equipement);
        setAlertOpen(true);
    }

    const handleSaveChanges = async () => {
        if (!equipementData.name || !equipementData.category) {
            toast({
                title: "Erreur",
                description: "Veuillez remplir tous les champs obligatoires.",
                variant: "destructive"
            });
            return;
        }

        if (selectedEquipement) {
            await updateEquipement({ ...selectedEquipement, ...equipementData });
            toast({
                title: "Équipement modifié",
                description: `L'équipement "${equipementData.name}" a été mis à jour.`,
            });
        } else {
            await addEquipement(equipementData);
            toast({
                title: "Équipement ajouté",
                description: `Le nouvel équipement "${equipementData.name}" a été créé.`,
            });
        }
        setDialogOpen(false);
        setSelectedEquipement(null);
        router.refresh();
    };

    const handleConfirmDelete = async () => {
        if (selectedEquipement) {
            await deleteEquipement(selectedEquipement.id);
            toast({
                title: "Équipement supprimé",
                description: `L'équipement "${selectedEquipement.name}" a été supprimé.`,
                variant: "destructive"
            });
            setAlertOpen(false);
            setSelectedEquipement(null);
            router.refresh();
        }
    }

    const dialogTitle = selectedEquipement ? "Modifier l'équipement" : "Ajouter un nouvel équipement";
    const dialogDescription = selectedEquipement
        ? "Modifiez les informations de l'équipement ci-dessous."
        : "Remplissez les informations pour créer un nouvel équipement.";


    return (
        <>
            <Card className="shadow-lg">
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle className="text-3xl font-headline">Gestion des Équipements</CardTitle>
                        <CardDescription>
                            Ajoutez, modifiez ou supprimez les types d'équipement disponibles.
                        </CardDescription>
                    </div>
                    <Button onClick={handleAddNewClick}>
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Ajouter un équipement
                    </Button>
                </CardHeader>
                <CardContent className="pt-6">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Nom de l'équipement</TableHead>
                                <TableHead>Catégorie</TableHead>
                                <TableHead>Références</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {equipements.map((equipement) => (
                                <TableRow key={equipement.id}>
                                    <TableCell className="font-medium">{equipement.name}</TableCell>
                                    <TableCell>
                                        <Badge variant="secondary">{equipement.category}</Badge>
                                    </TableCell>
                                    <TableCell>
                                        {equipement.reference_adulte && <div className="text-xs"><span className="font-semibold">Adulte:</span> {equipement.reference_adulte}</div>}
                                        {equipement.reference_enfant && <div className="text-xs"><span className="font-semibold">Enfant:</span> {equipement.reference_enfant}</div>}
                                    </TableCell>
                                    <TableCell className="text-right space-x-2">
                                        <Button variant="ghost" size="icon" onClick={() => handleEditClick(equipement)}>
                                            <Pencil className="h-4 w-4" />
                                            <span className="sr-only">Modifier</span>
                                        </Button>
                                        <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => handleDeleteClick(equipement)}>
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
                <DialogContent className="sm:max-w-[480px]">
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
                                value={equipementData.name}
                                onChange={(e) => setEquipementData({ ...equipementData, name: e.target.value })}
                                className="col-span-3"
                                placeholder="ex: T-shirt d'entrainement"
                            />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="category" className="text-right">
                                Catégorie
                            </Label>
                             <Select
                                value={equipementData.category}
                                onValueChange={(value) =>
                                    setEquipementData({ ...equipementData, category: value })
                                }
                            >
                                <SelectTrigger id="category" className="col-span-3">
                                    <SelectValue placeholder="Choisir une catégorie" />
                                </SelectTrigger>
                                <SelectContent>
                                    {categories.map((category) => (
                                        <SelectItem key={category.id} value={category.name}>{category.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="reference_adulte" className="text-right">
                                Réf. Adulte
                            </Label>
                            <Input
                                id="reference_adulte"
                                value={equipementData.reference_adulte || ''}
                                onChange={(e) => setEquipementData({ ...equipementData, reference_adulte: e.target.value })}
                                className="col-span-3"
                                placeholder="ex: TSHIRT-AD-BL"
                            />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="reference_enfant" className="text-right">
                                Réf. Enfant
                            </Label>
                            <Input
                                id="reference_enfant"
                                value={equipementData.reference_enfant || ''}
                                onChange={(e) => setEquipementData({ ...equipementData, reference_enfant: e.target.value })}
                                className="col-span-3"
                                placeholder="ex: TSHIRT-ENF-BL"
                            />
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
                            Cette action est irréversible. L'équipement "{selectedEquipement?.name}" sera définitivement supprimé.
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
