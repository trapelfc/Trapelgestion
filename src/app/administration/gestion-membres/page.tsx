
'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft, PlusCircle, Edit3, Trash2 } from 'lucide-react';
import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table';
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
import { useToast } from '@/hooks/use-toast';
import type { AppMember } from '@/config/member-constants';
import { APP_MEMBERS_STORAGE_KEY, getAppMembers, saveAppMembers } from '@/config/member-constants';
import type { Role } from '@/config/roles-constants';
import { getStoredRoles, ROLES_STORAGE_KEY } from '@/config/roles-constants';
import { MemberFormModal, type MemberFormData } from '@/components/administration/member-form-modal';
import type { PendingEmail } from '@/app/inscription/paiement/page';
import { getPendingEmailsFromStorage, savePendingEmailsToStorage } from '@/app/inscription/paiement/page';
import { EMAIL_TEMPLATE_NEW_MEMBER_SUBJECT_KEY, EMAIL_TEMPLATE_NEW_MEMBER_BODY_KEY, DEFAULT_NEW_MEMBER_SUBJECT, DEFAULT_NEW_MEMBER_BODY } from '@/app/administration/modeles-mails/constants';

export default function GestionMembresPage() {
  const [appMembers, setAppMembers] = useState<AppMember[]>([]);
  const [availableRoles, setAvailableRoles] = useState<Role[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [memberToEdit, setMemberToEdit] = useState<AppMember | null>(null);

  const [memberToDelete, setMemberToDelete] = useState<AppMember | null>(null);
  const [isConfirmDeleteModalOpen, setIsConfirmDeleteModalOpen] = useState(false);

  const roleMap = useMemo(() => {
    return new Map(availableRoles.map(role => [role.id, role.label]));
  }, [availableRoles]);

  const loadData = useCallback(() => {
    setIsLoading(true);
    setAppMembers(getAppMembers());
    setAvailableRoles(getStoredRoles());
    setIsLoading(false);
  }, []);

  useEffect(() => {
    loadData();
    
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === APP_MEMBERS_STORAGE_KEY) {
        setAppMembers(getAppMembers());
      }
      if (event.key === ROLES_STORAGE_KEY) {
        setAvailableRoles(getStoredRoles());
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [loadData]);


  const prepareAndQueueNewMemberEmail = (member: AppMember) => {
    const roleLabel = roleMap.get(member.roleId) || member.roleId;
    let subjectTemplate = DEFAULT_NEW_MEMBER_SUBJECT;
    let bodyTemplate = DEFAULT_NEW_MEMBER_BODY;

    if (typeof window !== 'undefined') {
      subjectTemplate = localStorage.getItem(EMAIL_TEMPLATE_NEW_MEMBER_SUBJECT_KEY) || DEFAULT_NEW_MEMBER_SUBJECT;
      bodyTemplate = localStorage.getItem(EMAIL_TEMPLATE_NEW_MEMBER_BODY_KEY) || DEFAULT_NEW_MEMBER_BODY;
    }

    const replacements: Record<string, string> = {
      '{{NOM_MEMBRE}}': member.nom,
      '{{LOGIN}}': member.nom,
      '{{ROLE}}': roleLabel,
      '{{MOT_DE_PASSE}}': member.password || '(Non défini - Connexion impossible)',
    };

    for (const [placeholder, value] of Object.entries(replacements)) {
      subjectTemplate = subjectTemplate.replace(new RegExp(placeholder.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'), 'g'), value || '');
      bodyTemplate = bodyTemplate.replace(new RegExp(placeholder.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'), 'g'), value || '');
    }
    
    const newPendingEmail: PendingEmail = {
      id: crypto.randomUUID(),
      licencieId: member.id,
      licencieNom: member.nom,
      licenciePrenom: "(Nouveau Membre)",
      licencieEmail: member.email,
      packChoisi: '',
      montantTotalDu: 0,
      montantPaye: 0,
      methodePaiement: undefined,
      datePreparation: new Date().toISOString(),
      status: 'en_attente',
      sujet: subjectTemplate,
      corps: bodyTemplate,
      source: 'Création Nouveau Membre',
    };

    const currentPendingEmails = getPendingEmailsFromStorage();
    const updatedPendingEmails = [...currentPendingEmails, newPendingEmail];
    savePendingEmailsToStorage(updatedPendingEmails);
    
    toast({
      title: "E-mail de Bienvenue Préparé",
      description: `Un e-mail avec les identifiants pour ${member.nom} a été ajouté à la file d'attente.`,
      duration: 7000,
    });
  };

  const handleSaveMember = (data: MemberFormData, editingId?: string) => {
    let updatedMembers: AppMember[];
    const trimmedNom = data.nom.trim();
    const trimmedEmail = data.email.trim().toLowerCase();
    let isNewMemberCreation = false;
    let newMemberForEmail: AppMember | null = null;

    if (editingId) { 
      const originalMember = appMembers.find(m => m.id === editingId);
      if (!originalMember) {
        toast({ title: "Erreur", description: "Membre à modifier non trouvé.", variant: "destructive" });
        return;
      }
      const memberDataToUpdate: AppMember = {
        ...originalMember,
        nom: trimmedNom,
        email: trimmedEmail,
        roleId: data.roleId,
      };
      if (data.password && data.password.trim() !== '') {
        memberDataToUpdate.password = data.password;
      }
      updatedMembers = appMembers.map(m => 
        m.id === editingId ? memberDataToUpdate : m
      );
      toast({ title: "Succès", description: `Membre "${trimmedNom}" mis à jour.` });
    } else { 
      isNewMemberCreation = true;
      const newMember: AppMember = {
        id: crypto.randomUUID(),
        nom: trimmedNom,
        email: trimmedEmail,
        roleId: data.roleId,
        password: data.password, 
      };
      updatedMembers = [...appMembers, newMember];
      newMemberForEmail = newMember;
      toast({ title: "Succès", description: `Membre "${newMember.nom}" ajouté.` });
    }
    
    setAppMembers(updatedMembers.sort((a,b) => a.nom.localeCompare(b.nom)));
    saveAppMembers(updatedMembers);
    setIsModalOpen(false);
    setMemberToEdit(null);

    if (isNewMemberCreation && newMemberForEmail) {
      prepareAndQueueNewMemberEmail(newMemberForEmail);
    }
  };

  const handleOpenModal = (member: AppMember | null = null) => {
    setMemberToEdit(member);
    setIsModalOpen(true);
  };

  const requestDeleteMember = (member: AppMember) => {
    setMemberToDelete(member);
    setIsConfirmDeleteModalOpen(true);
  };

  const confirmDeleteMember = () => {
    if (memberToDelete) {
      const updatedMembers = appMembers.filter(m => m.id !== memberToDelete.id);
      setAppMembers(updatedMembers);
      saveAppMembers(updatedMembers);
      toast({ title: "Succès", description: `Membre "${memberToDelete.nom}" supprimé.` });
    }
    setIsConfirmDeleteModalOpen(false);
    setMemberToDelete(null);
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
          <h1 className="text-2xl font-bold">Gestion des Membres de l'Application</h1>
        </div>
        <Button onClick={() => handleOpenModal()}>
          <PlusCircle className="mr-2 h-4 w-4" />
          Ajouter un Membre
        </Button>
      </div>

      <div className="mb-4 p-3 border rounded-md bg-sky-50 text-sky-800 text-sm">
        <p>Gérez ici les utilisateurs qui peuvent se connecter à l'application et leurs rôles respectifs.</p>
        <p className="font-semibold text-destructive mt-1">Attention : La gestion des mots de passe est simplifiée pour ce prototype et n'est pas sécurisée pour un usage en production.</p>
      </div>

      {appMembers.length > 0 ? (
        <div className="rounded-md border shadow-sm">
          <Table>
            <TableHeader>
              <TableRow>{/*
                Ensure no whitespace characters (like spaces or newlines) are direct children
                of TableRow, other than the TableHead components themselves.
                This is a common cause for hydration errors related to "whitespace text nodes".
              */}<TableHead className="py-2 px-4">Login</TableHead><TableHead className="py-2 px-4">E-mail (Identifiant)</TableHead><TableHead className="py-2 px-4">Rôle</TableHead><TableHead className="py-2 px-4">Mot de Passe</TableHead><TableHead className="text-right py-2 px-4 w-[150px]">Actions</TableHead></TableRow>
            </TableHeader>
            <TableBody>
              {appMembers.map((member) => (
                <TableRow key={member.id}>
                  <TableCell className="py-2 px-4 font-medium">{member.nom}</TableCell>
                  <TableCell className="py-2 px-4">{member.email}</TableCell>
                  <TableCell className="py-2 px-4">{roleMap.get(member.roleId) || member.roleId}</TableCell>
                  <TableCell className="py-2 px-4 text-xs text-muted-foreground italic">Masqué</TableCell>
                  <TableCell className="py-2 px-4 text-right">
                     <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => handleOpenModal(member)} 
                        aria-label={`Modifier ${member.nom}`}
                        className="mr-1"
                    >
                        <Edit3 className="h-4 w-4 text-blue-600" />
                    </Button>
                    <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => requestDeleteMember(member)} 
                        aria-label={`Supprimer ${member.nom}`}
                    >
                        <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <p className="text-center text-muted-foreground py-6">
          Aucun membre défini. Cliquez sur "Ajouter un Membre" pour commencer.
        </p>
      )}
      
      <MemberFormModal
        isOpen={isModalOpen}
        onClose={() => {
            setIsModalOpen(false);
            setMemberToEdit(null);
        }}
        onSave={handleSaveMember}
        initialData={memberToEdit}
        editingId={memberToEdit?.id}
        allMembers={appMembers}
      />

      {memberToDelete && (
        <AlertDialog open={isConfirmDeleteModalOpen} onOpenChange={setIsConfirmDeleteModalOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
              <AlertDialogDescription>
                Voulez-vous vraiment supprimer le membre "{memberToDelete.nom}" ({memberToDelete.email}) ?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setIsConfirmDeleteModalOpen(false)}>Annuler</AlertDialogCancel>
              <AlertDialogAction onClick={confirmDeleteMember} className="bg-destructive hover:bg-destructive/90">Supprimer</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}
