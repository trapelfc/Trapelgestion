
'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ShieldCheck, PlusCircle, Edit3, Trash2 } from 'lucide-react';
import { 
  getStoredRoles, 
  saveStoredRoles, 
  type Role, 
  INITIAL_ROLES, 
  ROLES_STORAGE_KEY,
  getStoredRolePermissions,
  saveStoredRolePermissions,
  type RolePermissions,
  ROLE_PERMISSIONS_STORAGE_KEY, // Assurez-vous que ceci est bien exporté et importé
  type RoleId
} from '@/config/roles-constants';
import { APP_MODULES, type AppModule } from '@/config/app-modules';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import React, { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { RoleFormModal, type RoleFormData } from '@/components/administration/role-form-modal'; 
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ScrollArea } from '@/components/ui/scroll-area';

const generateRoleId = (label: string): string => {
  return label.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/gi, '');
};

export default function DroitsAccesPage() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<RolePermissions>({});
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [roleToEdit, setRoleToEdit] = useState<Role | null>(null);

  const [roleToDelete, setRoleToDelete] = useState<Role | null>(null);
  const [isConfirmDeleteModalOpen, setIsConfirmDeleteModalOpen] = useState(false);

  const loadData = useCallback(() => {
    setIsLoading(true);
    setRoles(getStoredRoles());
    setPermissions(getStoredRolePermissions());
    setIsLoading(false);
  }, []);

  useEffect(() => {
    loadData();
    
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === ROLES_STORAGE_KEY || event.key === ROLE_PERMISSIONS_STORAGE_KEY) { 
        loadData();
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [loadData]);

  const handleOpenModal = (role: Role | null = null) => {
    setRoleToEdit(role);
    setIsModalOpen(true);
  };

  const handleSaveRole = (data: RoleFormData, editingId?: string) => {
    let updatedRoles: Role[];
    const formattedLabel = data.label.trim();
    let roleIdForPermissions = editingId;

    if (editingId) { 
      const originalRole = roles.find(r => r.id === editingId);
      if (!originalRole) {
        toast({ title: "Erreur", description: "Rôle à modifier non trouvé.", variant: "destructive" });
        return;
      }
      if (formattedLabel.toLowerCase() !== originalRole.label.toLowerCase() && roles.some(r => r.id !== editingId && r.label.toLowerCase() === formattedLabel.toLowerCase())) {
        toast({ title: "Erreur", description: "Un rôle avec ce nom existe déjà.", variant: "destructive" });
        return;
      }
      updatedRoles = roles.map(r => 
        r.id === editingId ? { ...r, label: formattedLabel, description: data.description.trim() } : r
      );
      toast({ title: "Succès", description: `Rôle "${formattedLabel}" mis à jour.` });
    } else { 
      if (roles.some(r => r.label.toLowerCase() === formattedLabel.toLowerCase())) {
        toast({ title: "Erreur", description: "Un rôle avec ce nom existe déjà.", variant: "destructive" });
        return;
      }
      let newRoleId = generateRoleId(formattedLabel);
      let counter = 1;
      while (roles.some(r => r.id === newRoleId) || INITIAL_ROLES.some(ir => ir.id === newRoleId)) {
        newRoleId = `${generateRoleId(formattedLabel)}-${counter}`;
        counter++;
      }
      roleIdForPermissions = newRoleId;
      const newRole: Role = {
        id: newRoleId,
        label: formattedLabel,
        description: data.description.trim(),
        isDefault: false,
      };
      updatedRoles = [...roles, newRole];
      
      const currentPermissions = getStoredRolePermissions();
      currentPermissions[newRoleId] = []; // Initialize with no permissions
      saveStoredRolePermissions(currentPermissions);
      setPermissions(currentPermissions); 

      toast({ title: "Succès", description: `Rôle "${newRole.label}" ajouté.` });
    }
    
    setRoles(updatedRoles.sort((a,b) => a.label.localeCompare(b.label)));
    saveStoredRoles(updatedRoles);
    setIsModalOpen(false);
  };

  const requestDeleteRole = (role: Role) => {
    if (role.isDefault) {
      toast({ title: "Suppression impossible", description: "Les rôles par défaut ne peuvent pas être supprimés.", variant: "default" });
      return;
    }
    setRoleToDelete(role);
    setIsConfirmDeleteModalOpen(true);
  };

  const confirmDeleteRole = () => {
    if (roleToDelete && !roleToDelete.isDefault) {
      const updatedRoles = roles.filter(r => r.id !== roleToDelete.id);
      setRoles(updatedRoles);
      saveStoredRoles(updatedRoles);

      const currentPermissions = getStoredRolePermissions();
      delete currentPermissions[roleToDelete.id];
      saveStoredRolePermissions(currentPermissions);
      setPermissions(currentPermissions);

      toast({ title: "Succès", description: `Rôle "${roleToDelete.label}" et ses permissions supprimés.` });
    }
    setIsConfirmDeleteModalOpen(false);
    setRoleToDelete(null);
  };

  const handlePermissionChange = (roleId: RoleId, moduleId: string, isChecked: boolean) => {
    const currentPermissions = getStoredRolePermissions();
    const rolePerms = currentPermissions[roleId] || [];
    let updatedRolePerms;

    if (isChecked) {
      if (!rolePerms.includes(moduleId)) {
        updatedRolePerms = [...rolePerms, moduleId];
      } else {
        updatedRolePerms = rolePerms;
      }
    } else {
      updatedRolePerms = rolePerms.filter(perm => perm !== moduleId);
    }
    
    currentPermissions[roleId] = updatedRolePerms;
    saveStoredRolePermissions(currentPermissions);
    setPermissions(currentPermissions); 
  };

  if (isLoading) {
    return <div className="container mx-auto p-4 text-center">Chargement...</div>;
  }

  return (
    <div className="container mx-auto p-4">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center">
          <Button variant="outline" size="icon" asChild className="mr-4">
            <Link href="/administration">
              <ArrowLeft className="h-4 w-4" />
              <span className="sr-only">Retour au Module Administration</span>
            </Link>
          </Button>
          <h1 className="text-2xl font-bold">Gestion des Rôles et Permissions</h1>
        </div>
        <Button onClick={() => handleOpenModal()}>
          <PlusCircle className="mr-2 h-4 w-4" />
          Ajouter un Rôle
        </Button>
      </div>

      <div className="mb-8 space-y-4">
        {roles.map((role) => (
          <Card key={role.id} className="bg-card shadow-sm">
            <CardHeader className="pb-3 pt-4 px-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center">
                  <ShieldCheck className="h-5 w-5 mr-2 text-primary" />
                  {role.label}
                </CardTitle>
                <div className="space-x-1">
                  <Button variant="ghost" size="icon" onClick={() => handleOpenModal(role)} aria-label={`Modifier ${role.label}`}>
                    <Edit3 className="h-4 w-4 text-blue-600" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => requestDeleteRole(role)} 
                    aria-label={`Supprimer ${role.label}`}
                    disabled={role.isDefault}
                    title={role.isDefault ? "Les rôles par défaut ne peuvent pas être supprimés" : "Supprimer ce rôle"}
                  >
                    <Trash2 className={`h-4 w-4 ${role.isDefault ? 'text-muted-foreground/50' : 'text-destructive'}`} />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="px-4 pb-2">
              <p className="text-sm text-muted-foreground">{role.description}</p>
              {role.isDefault && <p className="text-xs text-primary/80 mt-1 italic">(Rôle par défaut)</p>}
            </CardContent>
            <Accordion type="single" collapsible className="w-full px-2">
              <AccordionItem value={`permissions-${role.id}`} className="border-t">
                <AccordionTrigger className="text-sm font-medium py-3 px-2">Permissions d'accès aux modules/routes</AccordionTrigger>
                <AccordionContent className="pb-4 px-2">
                  <ScrollArea className="h-64"> {/* Ajout du ScrollArea */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-3 pr-4">
                      {APP_MODULES.map((module) => (
                        <div key={module.id} className="flex items-center space-x-2">
                          <Checkbox
                            id={`perm-${role.id}-${module.id.replace(/\//g, '-')}`} // Ensure ID is valid
                            checked={(permissions[role.id] || []).includes(module.id)}
                            onCheckedChange={(checked) => handlePermissionChange(role.id, module.id, Boolean(checked))}
                            disabled={role.id === 'administrateur'}
                            aria-label={`${module.label} pour ${role.label}`}
                          />
                          <Label htmlFor={`perm-${role.id}-${module.id.replace(/\//g, '-')}`} className="text-xs font-normal cursor-pointer">
                            {module.label}
                            {role.id === 'administrateur' && <span className="text-xs text-muted-foreground italic"> (accès complet)</span>}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </Card>
        ))}
        {roles.length === 0 && (
          <p className="text-center text-muted-foreground py-4">Aucun rôle défini. Cliquez sur "Ajouter un Rôle" pour commencer.</p>
        )}
      </div>
      
      <RoleFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveRole}
        initialData={roleToEdit}
        editingId={roleToEdit?.id}
      />

      {roleToDelete && (
        <AlertDialog open={isConfirmDeleteModalOpen} onOpenChange={setIsConfirmDeleteModalOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
              <AlertDialogDescription>
                Voulez-vous vraiment supprimer le rôle "{roleToDelete.label}" ? Ses permissions associées seront également supprimées.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setIsConfirmDeleteModalOpen(false)}>Annuler</AlertDialogCancel>
              <AlertDialogAction onClick={confirmDeleteRole} className="bg-destructive hover:bg-destructive/90">Supprimer</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}
