
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
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Licensee, Pack, EquipmentItem, Category, Size, AssignedEquipment, StockEntry } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { assignEquipmentToLicensee } from "@/lib/actions";

interface EquipementInscriptionViewProps {
  licensees: Licensee[];
  packs: Pack[];
  equipements: EquipmentItem[];
  categories: Category[];
  stock: StockEntry[];
}

export function EquipementInscriptionView({
  licensees,
  packs,
  equipements,
  categories,
  stock,
}: EquipementInscriptionViewProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isDialogOpen, setDialogOpen] = React.useState(false);
  const [selectedLicensee, setSelectedLicensee] = React.useState<Licensee | null>(null);
  const [assignments, setAssignments] = React.useState<{name: string, size: string}[]>([]);
  const [forceAssign, setForceAssign] = React.useState(false);
  
  const licenseesToDisplay = licensees.filter(
    (lic) => lic.paymentStatus === 'Payé' && (lic.equipmentStatus === 'En attente' || lic.equipmentStatus === 'Incomplet')
  );

  const getPack = (id: string) => packs.find((p) => p.id === id);

  const availableStock = React.useMemo(() => {
    const stockMap = new Map<string, number>();
    
    stock.forEach(entry => {
        stockMap.set(`${entry.equipmentName}::${entry.sizeName}`, entry.quantity);
    });

    licensees.forEach(licensee => {
        if (licensee.assignedEquipment) {
            licensee.assignedEquipment.forEach(assigned => {
                if (!assigned.outOfStock) {
                    const key = `${assigned.name}::${assigned.size}`;
                    const currentStock = stockMap.get(key) ?? 0;
                    stockMap.set(key, currentStock - 1);
                }
            });
        }
    });

    return stockMap;
  }, [stock, licensees]);

  const isSizeInStock = (itemName: string, sizeName: string): boolean => {
    const key = `${itemName}::${sizeName}`;
    return (availableStock.get(key) ?? 0) > 0;
  };

  const handleAssignClick = (licensee: Licensee) => {
    const pack = getPack(licensee.packId);
    if (pack) {
      if (licensee.equipmentStatus === 'Incomplet' && licensee.assignedEquipment && licensee.assignedEquipment.length > 0) {
        setAssignments(licensee.assignedEquipment.map(item => ({ name: item.name, size: item.size })));
      } else {
        const initialAssignments = pack.composition.map(itemName => ({ name: itemName, size: '' }));
        setAssignments(initialAssignments);
      }
    }
    setForceAssign(false);
    setSelectedLicensee(licensee);
    setDialogOpen(true);
  };

  const handleSizeChange = (itemName: string, newSize: string) => {
    setAssignments(current => 
        current.map(item => item.name === itemName ? { ...item, size: newSize } : item)
    );
  };

  const handleSaveChanges = async () => {
    if (selectedLicensee && assignments.every(a => a.size)) {
      const finalAssignments: AssignedEquipment[] = assignments.map(a => ({
          name: a.name,
          size: a.size,
          outOfStock: !isSizeInStock(a.name, a.size)
      }));
      
      await assignEquipmentToLicensee(selectedLicensee.id, finalAssignments);
      toast({
        title: "Équipement attribué",
        description: `L'équipement de ${selectedLicensee.firstName} ${selectedLicensee.lastName} a été enregistré.`,
      });
      setDialogOpen(false);
      setSelectedLicensee(null);
      router.refresh();
    } else {
        toast({
            title: "Erreur",
            description: "Veuillez sélectionner une taille pour chaque équipement.",
            variant: "destructive"
        })
    }
  };

  const currentPack = selectedLicensee ? getPack(selectedLicensee.packId) : null;
  
  const getSizesForEquipment = (itemName: string): Size[] => {
    const equipementDetails = equipements.find(eq => eq.name === itemName);
    if (!equipementDetails) return [];
    
    const categoryDetails = categories.find(cat => cat.name === equipementDetails.category);
    return categoryDetails?.sizes || [];
  }

  const getStatusBadge = (status: Licensee['equipmentStatus']) => {
    switch (status) {
        case 'En attente':
            return <Badge variant="destructive">{status}</Badge>;
        case 'Incomplet':
            return <Badge style={{ backgroundColor: 'hsl(var(--chart-4))', color: 'hsl(var(--card-foreground))' }}>{status}</Badge>;
        case 'Attribué':
            return <Badge style={{ backgroundColor: 'hsl(var(--chart-2))', color: 'hsl(var(--primary-foreground))' }}>{status}</Badge>;
    }
  }

  return (
    <>
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-3xl font-headline">Attribution des Équipements</CardTitle>
          <CardDescription>
            Attribuez les équipements aux licenciés dont le paiement a été finalisé.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {licenseesToDisplay.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nom du licencié</TableHead>
                  <TableHead>Pack souscrit</TableHead>
                  <TableHead>Statut Équipement</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {licenseesToDisplay.map((licensee) => (
                  <TableRow key={licensee.id}>
                    <TableCell className="font-medium">{`${licensee.firstName} ${licensee.lastName}`}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{getPack(licensee.packId)?.name ?? "N/A"}</Badge>
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(licensee.equipmentStatus)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button onClick={() => handleAssignClick(licensee)}>
                        {licensee.equipmentStatus === 'Incomplet' ? "Modifier l'attribution" : "Attribuer l'équipement"}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-10">
              <p className="text-muted-foreground">Aucun équipement à attribuer pour le moment.</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Attribution pour : {selectedLicensee?.firstName} {selectedLicensee?.lastName}</DialogTitle>
            {currentPack && (
                <DialogDescription>
                    Pack : {currentPack.name}
                </DialogDescription>
            )}
          </DialogHeader>
          
          <div className="space-y-4 py-2">
            <h4 className="font-medium text-sm">Composition du pack</h4>
            <div className="space-y-4">
                {assignments.map(assignment => (
                    <div key={assignment.name} className="grid grid-cols-3 items-center gap-4">
                        <Label htmlFor={`size-${assignment.name}`} className="text-right">
                            {assignment.name}
                        </Label>
                        <Select
                            value={assignment.size}
                            onValueChange={(value) => handleSizeChange(assignment.name, value)}
                        >
                            <SelectTrigger id={`size-${assignment.name}`} className="col-span-2">
                                <SelectValue placeholder="Choisir une taille" />
                            </SelectTrigger>
                            <SelectContent>
                                {getSizesForEquipment(assignment.name).map(size => {
                                    const inStock = isSizeInStock(assignment.name, size.name);
                                    return (
                                        <SelectItem 
                                            key={size.id} 
                                            value={size.name}
                                            disabled={!inStock && !forceAssign}
                                        >
                                            {size.name} {!inStock && <span className="text-destructive ml-2">(Rupture)</span>}
                                        </SelectItem>
                                    )
                                })}
                            </SelectContent>
                        </Select>
                    </div>
                ))}
            </div>
             <div className="flex items-center space-x-2 pt-4">
                <Checkbox id="force-assign" checked={forceAssign} onCheckedChange={(checked) => setForceAssign(Boolean(checked))} />
                <Label htmlFor="force-assign" className="text-sm font-normal text-muted-foreground cursor-pointer">
                    Forcer l'attribution même en cas de rupture de stock.
                </Label>
            </div>
          </div>

          <DialogFooter className="pt-6">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Annuler</Button>
            <Button onClick={handleSaveChanges}>Sauvegarder et attribuer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

    