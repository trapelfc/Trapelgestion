
"use client";

import * as React from "react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { MoreHorizontal, Pencil } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { mockMembers } from "@/lib/mock-data";
import type { Member, Equipment, EquipmentSize, SockSize } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";

export default function EquipementPage() {
  const [members, setMembers] = React.useState<Member[]>(mockMembers);
  const [isDialogOpen, setDialogOpen] = React.useState(false);
  const [editingMember, setEditingMember] = React.useState<Member | null>(null);
  const [currentEquipment, setCurrentEquipment] = React.useState<Equipment | null>(null);
  const { toast } = useToast();

  const handleEditClick = (member: Member) => {
    setEditingMember(member);
    setCurrentEquipment(member.equipment);
    setDialogOpen(true);
  };

  const handleSaveChanges = () => {
    if (editingMember && currentEquipment) {
      const updatedMembers = members.map((m) =>
        m.id === editingMember.id ? { ...m, equipment: currentEquipment } : m
      );
      setMembers(updatedMembers);
      toast({
        title: "Équipement mis à jour",
        description: `L'équipement de ${editingMember.firstName} ${editingMember.lastName} a été sauvegardé.`,
      });
      setDialogOpen(false);
      setEditingMember(null);
      setCurrentEquipment(null);
    }
  };
  
  const equipmentSizes: EquipmentSize[] = ["S", "M", "L", "XL", "XXL"];
  const sockSizes: SockSize[] = ["38-40", "41-43", "44-46"];

  return (
    <>
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-3xl font-headline">Gestion de l'équipement</CardTitle>
          <CardDescription>
            Consultez et attribuez l'équipement pour chaque membre du club.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Membre</TableHead>
                <TableHead className="text-center">T-Shirt</TableHead>
                <TableHead className="text-center">Short</TableHead>
                <TableHead className="text-center">Chaussettes</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.map((member) => (
                <TableRow key={member.id}>
                  <TableCell>
                    <div className="font-medium">{`${member.firstName} ${member.lastName}`}</div>
                    <div className="text-sm text-muted-foreground">
                      Inscrit le {format(member.registrationDate, "d MMMM yyyy", { locale: fr })}
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    {member.equipment.tshirt ? (
                      <Badge variant="secondary">{member.equipment.tshirt}</Badge>
                    ) : (
                      <Badge variant="outline">N/A</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    {member.equipment.shorts ? (
                      <Badge variant="secondary">{member.equipment.shorts}</Badge>
                    ) : (
                      <Badge variant="outline">N/A</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    {member.equipment.socks ? (
                      <Badge variant="secondary">{member.equipment.socks}</Badge>
                    ) : (
                      <Badge variant="outline">N/A</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => handleEditClick(member)}>
                      <Pencil className="h-4 w-4" />
                      <span className="sr-only">Éditer</span>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Éditer l'équipement</DialogTitle>
            <DialogDescription>
              Modifier les tailles pour {editingMember?.firstName} {editingMember?.lastName}.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="tshirt-size" className="text-right">
                T-Shirt
              </Label>
              <Select
                value={currentEquipment?.tshirt ?? ""}
                onValueChange={(value) =>
                  setCurrentEquipment((prev) => ({ ...prev!, tshirt: value as EquipmentSize }))
                }
              >
                <SelectTrigger id="tshirt-size" className="col-span-3">
                  <SelectValue placeholder="Choisir une taille" />
                </SelectTrigger>
                <SelectContent>
                  {equipmentSizes.map(size => <SelectItem key={size} value={size}>{size}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="shorts-size" className="text-right">
                Short
              </Label>
              <Select
                 value={currentEquipment?.shorts ?? ""}
                 onValueChange={(value) =>
                   setCurrentEquipment((prev) => ({ ...prev!, shorts: value as EquipmentSize }))
                 }
              >
                <SelectTrigger id="shorts-size" className="col-span-3">
                  <SelectValue placeholder="Choisir une taille" />
                </SelectTrigger>
                <SelectContent>
                  {equipmentSizes.map(size => <SelectItem key={size} value={size}>{size}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="socks-size" className="text-right">
                Chaussettes
              </Label>
              <Select
                value={currentEquipment?.socks ?? ""}
                onValueChange={(value) =>
                  setCurrentEquipment((prev) => ({ ...prev!, socks: value as SockSize }))
                }
              >
                <SelectTrigger id="socks-size" className="col-span-3">
                  <SelectValue placeholder="Choisir une taille" />
                </SelectTrigger>
                <SelectContent>
                   {sockSizes.map(size => <SelectItem key={size} value={size}>{size}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Annuler</Button>
            <Button onClick={handleSaveChanges}>Sauvegarder</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
