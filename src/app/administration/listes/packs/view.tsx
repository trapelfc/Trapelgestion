
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
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import type { Pack, EquipmentItem } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";
import { addPack, updatePack, deletePack } from "@/lib/actions";

export function PacksView({ packs, equipements }: { packs: Pack[], equipements: EquipmentItem[] }) {
  const [isDialogOpen, setDialogOpen] = React.useState(false);
  const [isAlertOpen, setAlertOpen] = React.useState(false);
  const [selectedPack, setSelectedPack] = React.useState<Pack | null>(null);
  const [packData, setPackData] = React.useState<Omit<Pack, 'id'>>({ name: "", price: 0, composition: [] });
  const { toast } = useToast();
  const router = useRouter();

  const handleAddNewClick = () => {
    setSelectedPack(null);
    setPackData({ name: "", price: 0, composition: [] });
    setDialogOpen(true);
  };

  const handleEditClick = (pack: Pack) => {
    setSelectedPack(pack);
    setPackData({
        ...pack,
    });
    setDialogOpen(true);
  };

  const handleDeleteClick = (pack: Pack) => {
    setSelectedPack(pack);
    setAlertOpen(true);
  }

  const handleSaveChanges = async () => {
    if (!packData.name || !packData.price || packData.composition.length === 0) {
        toast({
            title: "Erreur",
            description: "Veuillez remplir tous les champs et sélectionner au moins un équipement.",
            variant: "destructive"
        });
        return;
    }

    const finalPackData = { ...packData, price: Number(packData.price) };

    if (selectedPack) {
      // Edit mode
      await updatePack({ ...selectedPack, ...finalPackData });
      toast({
        title: "Pack modifié",
        description: `Le pack "${packData.name}" a été mis à jour.`,
      });
    } else {
      // Add mode
      await addPack(finalPackData);
       toast({
        title: "Pack ajouté",
        description: `Le nouveau pack "${packData.name}" a été créé.`,
      });
    }
    setDialogOpen(false);
    setSelectedPack(null);
    router.refresh();
  };

  const handleConfirmDelete = async () => {
    if (selectedPack) {
        await deletePack(selectedPack.id);
        toast({
            title: "Pack supprimé",
            description: `Le pack "${selectedPack.name}" a été supprimé.`,
            variant: "destructive"
        });
        setAlertOpen(false);
        setSelectedPack(null);
        router.refresh();
    }
  }

  const dialogTitle = selectedPack ? "Modifier le pack" : "Ajouter un nouveau pack";
  const dialogDescription = selectedPack
    ? "Modifiez les informations du pack ci-dessous."
    : "Remplissez les informations pour créer un nouveau pack.";


  return (
    <>
      <Card className="shadow-lg">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-3xl font-headline">Gestion des Packs</CardTitle>
            <CardDescription>
              Ajoutez, modifiez ou supprimez les packs d'équipement.
            </CardDescription>
          </div>
          <Button onClick={handleAddNewClick}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Ajouter un pack
          </Button>
        </CardHeader>
        <CardContent className="pt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nom du pack</TableHead>
                <TableHead>Prix</TableHead>
                <TableHead>Composition</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {packs.map((pack) => (
                <TableRow key={pack.id}>
                  <TableCell className="font-medium">{pack.name}</TableCell>
                  <TableCell>{`${pack.price} €`}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {pack.composition.map((item, index) => (
                        <Badge key={index} variant="secondary">{item}</Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button variant="ghost" size="icon" onClick={() => handleEditClick(pack)}>
                      <Pencil className="h-4 w-4" />
                      <span className="sr-only">Modifier</span>
                    </Button>
                    <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => handleDeleteClick(pack)}>
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
                value={packData.name}
                onChange={(e) => setPackData({ ...packData, name: e.target.value })}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="price" className="text-right">
                Prix (€)
              </Label>
              <Input
                id="price"
                type="number"
                value={packData.price}
                onChange={(e) => setPackData({ ...packData, price: Number(e.target.value) })}
                className="col-span-3"
              />
            </div>
             <div className="grid grid-cols-4 items-start gap-4">
                <Label htmlFor="composition" className="text-right pt-2">
                    Composition
                </Label>
                <ScrollArea className="h-48 col-span-3 rounded-md border p-4">
                    <div className="space-y-2">
                        {equipements.map((item) => (
                            <div key={item.id} className="flex items-center gap-2">
                                <Checkbox
                                    id={`comp-${item.id}`}
                                    checked={packData.composition.includes(item.name)}
                                    onCheckedChange={(checked) => {
                                        setPackData((prev) => {
                                            const currentComposition = prev.composition;
                                            if (checked) {
                                                return { ...prev, composition: [...currentComposition, item.name] };
                                            } else {
                                                return { ...prev, composition: currentComposition.filter((name) => name !== item.name) };
                                            }
                                        });
                                    }}
                                />
                                <Label htmlFor={`comp-${item.id}`} className="font-normal cursor-pointer">
                                    {item.name}
                                </Label>
                            </div>
                        ))}
                    </div>
                </ScrollArea>
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
              Cette action est irréversible. Le pack "{selectedPack?.name}" sera définitivement supprimé.
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
