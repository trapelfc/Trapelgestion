
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import type { AppSettings, Reduction } from "@/lib/types";
import { updateSettings, archiveAndResetSeason } from "@/lib/actions";
import { PlusCircle, Pencil, Trash2, AlertCircle } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";


export function ParametresView({ settings }: { settings: AppSettings }) {
    const [localSettings, setLocalSettings] = React.useState<AppSettings>(settings);
    const router = useRouter();
    const { toast } = useToast();

    // State for Reduction modals
    const [isReductionDialogOpen, setReductionDialogOpen] = React.useState(false);
    const [isReductionAlertOpen, setReductionAlertOpen] = React.useState(false);
    const [selectedReduction, setSelectedReduction] = React.useState<Reduction | null>(null);
    const [reductionData, setReductionData] = React.useState<Omit<Reduction, 'id'>>({ name: "", amount: 0, note: "", multiplier: 1 });
    
    // State for Archive modal
    const [isArchiveAlertOpen, setArchiveAlertOpen] = React.useState(false);


    const handleSaveSettings = async () => {
        await updateSettings(localSettings);
        toast({
            title: "Paramètres sauvegardés",
            description: "Les paramètres ont été mis à jour.",
        });
        router.refresh();
    };

    // --- Reduction Handlers ---
    const handleAddReductionClick = () => {
        setSelectedReduction(null);
        setReductionData({ name: "", amount: 0, note: "", multiplier: 1 });
        setReductionDialogOpen(true);
    };

    const handleEditReductionClick = (reduction: Reduction) => {
        setSelectedReduction(reduction);
        setReductionData({ name: reduction.name, amount: reduction.amount, note: reduction.note || "", multiplier: reduction.multiplier || 1 });
        setReductionDialogOpen(true);
    };

    const handleDeleteReductionClick = (reduction: Reduction) => {
        setSelectedReduction(reduction);
        setReductionAlertOpen(true);
    };

    const handleSaveReduction = () => {
        if (!reductionData.name) {
            toast({ title: "Erreur", description: "Le nom de la réduction est requis.", variant: "destructive" });
            return;
        }

        if (selectedReduction) {
            // Edit
            const updatedReductions = localSettings.reductions.map(r =>
                r.id === selectedReduction.id ? { ...selectedReduction, ...reductionData } : r
            );
            setLocalSettings(prev => ({...prev, reductions: updatedReductions}));
        } else {
            // Add
            const newReduction: Reduction = { ...reductionData, id: `reduc-${Date.now()}` };
            setLocalSettings(prev => ({...prev, reductions: [...(prev.reductions || []), newReduction]}));
        }

        setReductionDialogOpen(false);
        setSelectedReduction(null);
    };

    const handleConfirmDeleteReduction = () => {
        if (selectedReduction) {
            const updatedReductions = localSettings.reductions.filter(r => r.id !== selectedReduction.id);
            setLocalSettings(prev => ({...prev, reductions: updatedReductions}));
            setReductionAlertOpen(false);
            setSelectedReduction(null);
        }
    };
    
    // --- Archive Handler ---
    const handleArchiveSeason = async () => {
        try {
            await archiveAndResetSeason();
            toast({
                title: "Saison archivée et réinitialisée !",
                description: "Une nouvelle saison peut commencer.",
            });
            router.refresh(); // Refresh to show the new season number
        } catch (error) {
            toast({
                title: "Erreur lors de l'archivage",
                description: "L'opération a échoué. Veuillez vérifier la console du serveur.",
                variant: "destructive",
            });
        } finally {
            setArchiveAlertOpen(false);
        }
    };


    return (
        <div className="space-y-8">
            <Card className="shadow-lg">
                <CardHeader>
                    <CardTitle className="text-3xl font-headline">Paramètres Généraux</CardTitle>
                    <CardDescription>
                        Gérez les paramètres généraux de l'application.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="max-w-md space-y-4">
                       <div className="space-y-2">
                            <Label htmlFor="referenceSeason">Saison de référence</Label>
                            <div className="flex items-center gap-2">
                                <Input
                                    id="referenceSeason"
                                    type="number"
                                    value={localSettings.referenceSeason}
                                    onChange={(e) => setLocalSettings(prev => ({...prev, referenceSeason: Number(e.target.value)}))}
                                    className="w-24"
                                    placeholder="ex: 2026"
                                />
                                <span className="text-muted-foreground">
                                    (saison {localSettings.referenceSeason - 1}-{localSettings.referenceSeason})
                                </span>
                            </div>
                       </div>
                    </div>
                </CardContent>
            </Card>

            <Card className="shadow-lg">
                <CardHeader>
                    <CardTitle className="text-3xl font-headline">Informations du Club</CardTitle>
                    <CardDescription>
                        Ces informations apparaîtront sur les documents générés (ex: bons de commande, mails).
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="max-w-md space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="clubName">Nom du club</Label>
                            <Input
                                id="clubName"
                                value={localSettings.clubInfo?.name || ''}
                                onChange={(e) => setLocalSettings(prev => ({...prev, clubInfo: { ...(prev.clubInfo || {}), name: e.target.value } as any}))}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="clubAddress">Adresse</Label>
                            <Textarea
                                id="clubAddress"
                                value={localSettings.clubInfo?.address || ''}
                                onChange={(e) => setLocalSettings(prev => ({...prev, clubInfo: { ...(prev.clubInfo || {}), address: e.target.value } as any}))}
                                placeholder="123 Rue du Stade&#10;75000 VILLE"
                                rows={3}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="clubResponsibleName">Nom du responsable</Label>
                            <Input
                                id="clubResponsibleName"
                                value={localSettings.clubInfo?.responsibleName || ''}
                                onChange={(e) => setLocalSettings(prev => ({ ...prev, clubInfo: { ...(prev.clubInfo || {}), responsibleName: e.target.value } as any }))}
                                placeholder="ex: Jean Dupont"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="clubEmail">Email de contact</Label>
                            <Input
                                id="clubEmail"
                                type="email"
                                value={localSettings.clubInfo?.email || ''}
                                onChange={(e) => setLocalSettings(prev => ({ ...prev, clubInfo: { ...(prev.clubInfo || {}), email: e.target.value } as any }))}
                                placeholder="ex: contact@club.com"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="clubPhone">Téléphone</Label>
                            <Input
                                id="clubPhone"
                                type="tel"
                                value={localSettings.clubInfo?.phone || ''}
                                onChange={(e) => setLocalSettings(prev => ({ ...prev, clubInfo: { ...(prev.clubInfo || {}), phone: e.target.value } as any }))}
                                placeholder="ex: 01 23 45 67 89"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="clubFacebook">URL Facebook</Label>
                            <Input
                                id="clubFacebook"
                                value={localSettings.clubInfo?.facebookUrl || ''}
                                onChange={(e) => setLocalSettings(prev => ({ ...prev, clubInfo: { ...(prev.clubInfo || {}), facebookUrl: e.target.value } as any }))}
                                placeholder="ex: https://facebook.com/votreclub"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="clubInstagram">URL Instagram</Label>
                            <Input
                                id="clubInstagram"
                                value={localSettings.clubInfo?.instagramUrl || ''}
                                onChange={(e) => setLocalSettings(prev => ({ ...prev, clubInfo: { ...(prev.clubInfo || {}), instagramUrl: e.target.value } as any }))}
                                placeholder="ex: https://instagram.com/votreclub"
                            />
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Card className="shadow-lg">
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle className="text-3xl font-headline">Gestion des Réductions</CardTitle>
                        <CardDescription>
                            Gérez les réductions applicables lors de l'inscription.
                        </CardDescription>
                    </div>
                    <Button onClick={handleAddReductionClick}>
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Ajouter une réduction
                    </Button>
                </CardHeader>
                <CardContent className="pt-6">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Nom de la réduction</TableHead>
                                <TableHead>Effet</TableHead>
                                <TableHead>Note</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {(localSettings.reductions || []).map((reduction) => (
                                <TableRow key={reduction.id}>
                                    <TableCell className="font-medium">{reduction.name}</TableCell>
                                    <TableCell>
                                        {reduction.amount > 0 ? `-${reduction.amount} €` : (reduction.multiplier && reduction.multiplier !== 1 ? `x${reduction.multiplier}` : 'Aucun')}
                                    </TableCell>
                                    <TableCell className="text-sm text-muted-foreground">{reduction.note}</TableCell>
                                    <TableCell className="text-right space-x-2">
                                        <Button variant="ghost" size="icon" onClick={() => handleEditReductionClick(reduction)}>
                                            <Pencil className="h-4 w-4" />
                                            <span className="sr-only">Modifier</span>
                                        </Button>
                                        <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => handleDeleteReductionClick(reduction)}>
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
            
            <Card className="shadow-lg border-destructive">
                <CardHeader>
                    <CardTitle className="text-3xl font-headline text-destructive">Opérations Dangereuses</CardTitle>
                    <CardDescription>
                        Ces actions sont irréversibles et affectent l'ensemble des données de l'application.
                    </CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                    <div className="flex items-center justify-between rounded-lg border border-destructive/50 bg-destructive/10 p-4">
                        <div>
                            <p className="font-semibold">Archiver la saison et commencer une nouvelle</p>
                            <p className="text-sm text-muted-foreground mt-1">
                                Cette action archivera toutes les données actuelles (inscriptions, stocks, emails) et incrémentera la saison de référence.
                            </p>
                        </div>
                        <Button variant="destructive" onClick={() => setArchiveAlertOpen(true)}>
                            Archiver la saison
                        </Button>
                    </div>
                </CardContent>
            </Card>

            <div className="flex justify-end pt-4">
                <Button onClick={handleSaveSettings} size="lg">Sauvegarder les changements</Button>
            </div>
            
            {/* Reduction Add/Edit Dialog */}
            <Dialog open={isReductionDialogOpen} onOpenChange={setReductionDialogOpen}>
                <DialogContent className="sm:max-w-[480px]">
                    <DialogHeader>
                        <DialogTitle>{selectedReduction ? "Modifier la réduction" : "Ajouter une réduction"}</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="reduc-name" className="text-right">Nom</Label>
                            <Input id="reduc-name" value={reductionData.name} onChange={(e) => setReductionData(prev => ({ ...prev, name: e.target.value }))} className="col-span-3" />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="reduc-amount" className="text-right">Montant fixe (€)</Label>
                            <Input id="reduc-amount" type="number" value={reductionData.amount} onChange={(e) => setReductionData(prev => ({ ...prev, amount: Number(e.target.value) }))} className="col-span-3" />
                        </div>
                         <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="reduc-multiplier" className="text-right">Multiplicateur</Label>
                            <Input id="reduc-multiplier" type="number" step="0.01" value={reductionData.multiplier || 1} onChange={(e) => setReductionData(prev => ({ ...prev, multiplier: Number(e.target.value) }))} className="col-span-3" />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="reduc-note" className="text-right">Note (facultatif)</Label>
                            <Input id="reduc-note" value={reductionData.note || ''} onChange={(e) => setReductionData(prev => ({ ...prev, note: e.target.value }))} className="col-span-3" />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setReductionDialogOpen(false)}>Annuler</Button>
                        <Button onClick={handleSaveReduction}>Sauvegarder</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Reduction Delete Alert */}
            <AlertDialog open={isReductionAlertOpen} onOpenChange={setReductionAlertOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Êtes-vous sûr ?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Cette action est irréversible. La réduction "{selectedReduction?.name}" sera supprimée.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Annuler</AlertDialogCancel>
                        <AlertDialogAction onClick={handleConfirmDeleteReduction} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Supprimer</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
            
            {/* Archive Season Alert */}
            <AlertDialog open={isArchiveAlertOpen} onOpenChange={setArchiveAlertOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Êtes-vous absolument sûr ?</AlertDialogTitle>
                        <AlertDialogDescription asChild>
                            <div className="space-y-4 text-sm text-muted-foreground">
                                <p>
                                    Cette action est <strong>irréversible</strong> et va clôturer la saison <strong>{settings.referenceSeason - 1}-{settings.referenceSeason}</strong>.
                                </p>
                                <Alert variant="destructive">
                                    <AlertCircle className="h-4 w-4" />
                                    <AlertTitle>Conséquences :</AlertTitle>
                                    <AlertDescription>
                                        <ul className="list-disc list-inside">
                                            <li>Toutes les inscriptions seront archivées et supprimées de la vue courante.</li>
                                            <li>Tous les mails en attente seront supprimés.</li>
                                            <li>Tous les stocks seront remis à zéro.</li>
                                            <li>La saison de référence passera à <strong>{settings.referenceSeason}-{settings.referenceSeason + 1}</strong>.</li>
                                        </ul>
                                    </AlertDescription>
                                </Alert>
                                <p>
                                    Veuillez vous assurer d'avoir traité tous les paiements et équipements avant de continuer.
                                </p>
                            </div>
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Annuler</AlertDialogCancel>
                        <AlertDialogAction
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            onClick={handleArchiveSeason}
                        >
                            Oui, archiver et réinitialiser
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
