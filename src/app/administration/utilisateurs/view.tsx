
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
import type { User, Role } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { addUser, updateUser, deleteUser } from "@/lib/actions";
import { Badge } from "@/components/ui/badge";

type UserWithoutId = Omit<User, 'id'>;

export function UtilisateursView({ initialUsers, roles }: { initialUsers: User[], roles: Role[] }) {
    const [isDialogOpen, setDialogOpen] = React.useState(false);
    const [isAlertOpen, setAlertOpen] = React.useState(false);
    const [selectedUser, setSelectedUser] = React.useState<User | null>(null);
    const [userData, setUserData] = React.useState<Partial<User>>({ name: "", username: "", password: "", role: "user" });
    const { toast } = useToast();
    const router = useRouter();

    const handleAddNewClick = () => {
        setSelectedUser(null);
        setUserData({ name: "", username: "", password: "", role: "user" });
        setDialogOpen(true);
    };

    const handleEditClick = (user: User) => {
        setSelectedUser(user);
        setUserData({ ...user, password: "" }); // Clear password for editing
        setDialogOpen(true);
    };

    const handleDeleteClick = (user: User) => {
        setSelectedUser(user);
        setAlertOpen(true);
    }

    const handleSaveChanges = async () => {
        try {
            if (selectedUser) {
                // Edit mode
                await updateUser({ ...selectedUser, ...userData });
                toast({
                    title: "Utilisateur modifié",
                    description: `L'utilisateur "${userData.name}" a été mis à jour.`,
                });
            } else {
                // Add mode
                if (!userData.password) {
                    toast({ title: "Erreur", description: "Le mot de passe est requis pour un nouvel utilisateur.", variant: "destructive" });
                    return;
                }
                await addUser(userData as UserWithoutId);
                toast({
                    title: "Utilisateur ajouté",
                    description: `Le nouvel utilisateur "${userData.name}" a été créé.`,
                });
            }
            setDialogOpen(false);
            setSelectedUser(null);
            router.refresh();
        } catch (error: any) {
            toast({ title: "Erreur", description: error.message, variant: "destructive" });
        }
    };

    const handleConfirmDelete = async () => {
        if (selectedUser) {
            try {
                if (selectedUser.role === 'admin' && initialUsers.filter(u => u.role === 'admin').length <= 1) {
                    toast({ title: "Action non autorisée", description: "Vous ne pouvez pas supprimer le dernier administrateur.", variant: "destructive" });
                    setAlertOpen(false);
                    return;
                }
                await deleteUser(selectedUser.id);
                toast({
                    title: "Utilisateur supprimé",
                    description: `L'utilisateur "${selectedUser.name}" a été supprimé.`,
                    variant: "destructive"
                });
                setAlertOpen(false);
                setSelectedUser(null);
                router.refresh();
            } catch (error: any) {
                toast({ title: "Erreur", description: error.message, variant: "destructive" });
            }
        }
    }

    const dialogTitle = selectedUser ? "Modifier l'utilisateur" : "Ajouter un nouvel utilisateur";
    const passwordPlaceholder = selectedUser ? "Laisser vide pour ne pas changer" : "Mot de passe";

    return (
        <>
            <Card className="shadow-lg">
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle className="text-3xl font-headline">Gestion des Utilisateurs</CardTitle>
                        <CardDescription>
                            Ajoutez, modifiez ou supprimez les comptes utilisateurs.
                        </CardDescription>
                    </div>
                    <Button onClick={handleAddNewClick}>
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Ajouter un utilisateur
                    </Button>
                </CardHeader>
                <CardContent className="pt-6">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Nom complet</TableHead>
                                <TableHead>Nom d'utilisateur</TableHead>
                                <TableHead>Rôle</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {initialUsers.map((user) => (
                                <TableRow key={user.id}>
                                    <TableCell className="font-medium">{user.name}</TableCell>
                                    <TableCell>{user.username}</TableCell>
                                    <TableCell><Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>{user.role}</Badge></TableCell>
                                    <TableCell className="text-right space-x-2">
                                        <Button variant="ghost" size="icon" onClick={() => handleEditClick(user)}>
                                            <Pencil className="h-4 w-4" />
                                            <span className="sr-only">Modifier</span>
                                        </Button>
                                        <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => handleDeleteClick(user)}>
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
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="name" className="text-right">Nom complet</Label>
                            <Input id="name" value={userData.name} onChange={(e) => setUserData({ ...userData, name: e.target.value })} className="col-span-3"/>
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="username" className="text-right">Nom d'utilisateur</Label>
                            <Input id="username" value={userData.username} onChange={(e) => setUserData({ ...userData, username: e.target.value })} className="col-span-3"/>
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="password" className="text-right">Mot de passe</Label>
                            <Input id="password" type="password" value={userData.password} onChange={(e) => setUserData({ ...userData, password: e.target.value })} className="col-span-3" placeholder={passwordPlaceholder} />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="role" className="text-right">Rôle</Label>
                             <Select value={userData.role} onValueChange={(value) => setUserData({ ...userData, role: value })}>
                                <SelectTrigger id="role" className="col-span-3">
                                    <SelectValue placeholder="Choisir un rôle" />
                                </SelectTrigger>
                                <SelectContent>
                                    {roles.map(role => (
                                        <SelectItem key={role.name} value={role.name}>{role.name}</SelectItem>
                                    ))}
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

            <AlertDialog open={isAlertOpen} onOpenChange={setAlertOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Êtes-vous sûr ?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Cette action est irréversible. L'utilisateur "{selectedUser?.name}" sera définitivement supprimé.
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
