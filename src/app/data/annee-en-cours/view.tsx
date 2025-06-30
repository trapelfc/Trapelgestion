
"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { X, Download, MoreHorizontal, Trash2 } from "lucide-react";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { unparse } from "papaparse";

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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import type { Licensee, LicenseeCategory, Pack, Reduction, AssignedEquipment } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { deleteLicensee } from "@/lib/actions";


interface AnneeEnCoursViewProps {
  licensees: Licensee[];
  licenseeCategories: LicenseeCategory[];
  packs: Pack[];
  reductions: Reduction[];
}

const DetailItem = ({ label, value }: { label: string, value: React.ReactNode }) => (
    <div>
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        <div className="text-base break-words">{value || 'N/A'}</div>
    </div>
);

const BASE_EXPORT_FIELDS = [
    // Licensee Info
    { id: 'lastName', label: 'Nom', group: 'Infos Licencié' },
    { id: 'firstName', label: 'Prénom', group: 'Infos Licencié' },
    { id: 'sex', label: 'Sexe', group: 'Infos Licencié', formatter: (v: 'male' | 'female') => v === 'male' ? 'Homme' : 'Femme' },
    { id: 'dateOfBirth', label: 'Date de naissance', group: 'Infos Licencié', formatter: (d: string) => format(new Date(d), 'dd/MM/yyyy') },
    { id: 'placeOfBirth', label: 'Lieu de naissance', group: 'Infos Licencié' },
    { id: 'bornAbroad', label: 'Né(e) à l\'étranger', group: 'Infos Licencié', formatter: (b: boolean) => b ? 'Oui' : 'Non' },
    { id: 'phone', label: 'Téléphone', group: 'Infos Licencié' },
    { id: 'email', label: 'Email', group: 'Infos Licencié' },
    { id: 'licenseeCategoryId', label: 'Catégorie', group: 'Infos Licencié', formatter: (id: string, lic: Licensee, allCats: LicenseeCategory[]) => allCats.find(c => c.id === id)?.name || 'N/A' },
    { id: 'registrationDate', label: 'Date d\'inscription', group: 'Infos Licencié', formatter: (d: string) => format(new Date(d), 'dd/MM/yyyy') },
    
    // Legal Rep Info
    { id: 'legalRepresentative.lastName', label: 'Nom (Resp.)', group: 'Infos Rep. Légal' },
    { id: 'legalRepresentative.firstName', label: 'Prénom (Resp.)', group: 'Infos Rep. Légal' },
    { id: 'legalRepresentative.dateOfBirth', label: 'Date de naissance (Resp.)', group: 'Infos Rep. Légal', formatter: (d: string) => d ? format(new Date(d), 'dd/MM/yyyy') : '' },
    { id: 'legalRepresentative.placeOfBirth', label: 'Lieu de naissance (Resp.)', group: 'Infos Rep. Légal' },
    { id: 'legalRepresentative.bornAbroad', label: 'Né(e) à l\'étranger (Resp.)', group: 'Infos Rep. Légal', formatter: (b: boolean) => b ? 'Oui' : 'Non' },
    { id: 'legalRepresentative.email', label: 'Email (Resp.)', group: 'Infos Rep. Légal' },
    { id: 'legalRepresentative.fatherPhone', label: 'Tél. Père', group: 'Infos Rep. Légal' },
    { id: 'legalRepresentative.motherPhone', label: 'Tél. Mère', group: 'Infos Rep. Légal' },

    // Payment Info
    { id: 'packId', label: 'Pack souscrit', group: 'Paiement', formatter: (id: string, lic: Licensee, allPacks: Pack[]) => allPacks.find(p => p.id === id)?.name || 'N/A' },
    { id: 'paymentStatus', label: 'Statut Paiement', group: 'Paiement' },
    { id: 'paymentMethod', label: 'Méthode Paiement', group: 'Paiement' },
    { id: 'paymentDate', label: 'Date Paiement', group: 'Paiement', formatter: (d: string) => d ? format(new Date(d), 'dd/MM/yyyy') : '' },
    { id: 'finalPrice', label: 'Montant Final (€)', group: 'Paiement', formatter: (val: number) => val.toFixed(2) },
    { id: 'paymentComment', label: 'Commentaire Paiement', group: 'Paiement' },
    { id: 'reductions', label: 'Réductions', group: 'Paiement', formatter: (applied: any[], lic: Licensee, allReducs: Reduction[]) => (applied || []).map(a => allReducs.find(r => r.id === a.id)?.name || '').join(', ') },

    // Equipment Info
    { id: 'equipmentStatus', label: 'Statut Équipement', group: 'Équipement' },
];

export function AnneeEnCoursView({
  licensees,
  licenseeCategories,
  packs,
  reductions,
}: AnneeEnCoursViewProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [nameFilter, setNameFilter] = React.useState("");
  const [categoryFilter, setCategoryFilter] = React.useState("all");
  const [isProfileOpen, setProfileOpen] = React.useState(false);
  const [selectedLicensee, setSelectedLicensee] = React.useState<Licensee | null>(null);

  // Export state
  const [isExportDialogOpen, setExportDialogOpen] = React.useState(false);
  const [exportFormat, setExportFormat] = React.useState<'csv' | 'pdf'>('csv');
  
  // Delete Alert State
  const [isAlertOpen, setAlertOpen] = React.useState(false);

  const allEquipmentNames = React.useMemo(() => {
    return [...new Set(packs.flatMap(p => p.composition))].sort();
  }, [packs]);
  
  const exportFields = React.useMemo(() => {
    const equipmentFields = allEquipmentNames.map(name => ({
        id: `equipment.${name}`,
        label: name,
        group: 'Équipement',
        formatter: (_: any, lic: Licensee) => {
            const item = lic.assignedEquipment?.find(e => e.name === name);
            if (!item) return '';
            return `${item.size}${item.outOfStock ? ' (Rupture)' : ''}`;
        },
    }));
    return [...BASE_EXPORT_FIELDS, ...equipmentFields];
  }, [allEquipmentNames]);

  const [selectedFields, setSelectedFields] = React.useState<string[]>([]);
  
  React.useEffect(() => {
    if(exportFields.length > 0){
        setSelectedFields(exportFields.map(f => f.id));
    }
  }, [exportFields]);


  const completedLicensees = licensees.filter(
    (lic) => lic.paymentStatus === 'Payé' && (lic.equipmentStatus === 'Attribué' || lic.equipmentStatus === 'Incomplet')
  );

  const licenseesToDisplay = completedLicensees.filter(lic => {
      const fullName = `${lic.firstName} ${lic.lastName}`.toLowerCase();
      const nameMatch = nameFilter ? fullName.includes(nameFilter.toLowerCase()) : true;
      const categoryMatch = categoryFilter !== "all" ? lic.licenseeCategoryId === categoryFilter : true;
      return nameMatch && categoryMatch;
  });

  const handleOpenProfile = (licensee: Licensee) => {
    setSelectedLicensee(licensee);
    setProfileOpen(true);
  };

  const handleDeleteClick = (licensee: Licensee) => {
    setSelectedLicensee(licensee);
    setAlertOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (selectedLicensee) {
      await deleteLicensee(selectedLicensee.id);
      toast({
        title: "Inscription supprimée",
        description: `L'inscription de ${selectedLicensee.firstName} ${selectedLicensee.lastName} a été supprimée.`,
        variant: "destructive",
      });
      setAlertOpen(false);
      setSelectedLicensee(null);
      router.refresh();
    }
  };

  const clearFilters = () => {
    setNameFilter("");
    setCategoryFilter("all");
  };

  const getCategoryName = (id: string) => {
    return licenseeCategories.find((cat) => cat.id === id)?.name ?? "N/A";
  };

  const getPackInfo = (id: string) => {
    const pack = packs.find((p) => p.id === id);
    return pack ? `${pack.name} - ${pack.price}€` : "N/A";
  };
  
  const getStatusBadge = (status: Licensee['paymentStatus'] | Licensee['equipmentStatus']) => {
    switch (status) {
        case 'Payé':
        case 'Attribué':
            return <Badge style={{ backgroundColor: 'hsl(var(--chart-2))', color: 'hsl(var(--primary-foreground))' }}>Terminé</Badge>;
        case 'Incomplet':
            return <Badge style={{ backgroundColor: 'hsl(var(--chart-4))', color: 'hsl(var(--card-foreground))' }}>Incomplet</Badge>;
        default:
            return <Badge variant="outline">{status}</Badge>;
    }
  }

  const calculateFinalPrice = (licensee: Licensee | null): number => {
    if (!licensee) return 0;
    const pack = packs.find(p => p.id === licensee.packId);
    const packPrice = pack?.price ?? 0;
    const appliedReductionDetails = (licensee.reductions || [])
      .map(applied => reductions.find(r => r.id === applied.id))
      .filter((r): r is Reduction => !!r);

    let priceAfterMultipliers = packPrice;
    appliedReductionDetails.forEach(r => {
      if (r.multiplier && r.multiplier !== 1) {
          priceAfterMultipliers *= r.multiplier;
      }
    });
    
    const totalFixedReduction = appliedReductionDetails.reduce((total, r) => total + (r.amount || 0), 0);
    return Math.max(0, priceAfterMultipliers - totalFixedReduction);
  };

  const finalPrice = calculateFinalPrice(selectedLicensee);

  const handleFieldToggle = (fieldId: string) => {
    setSelectedFields(prev => prev.includes(fieldId) ? prev.filter(id => id !== fieldId) : [...prev, fieldId]);
  };

  const handleExport = () => {
    const fieldsToExport = exportFields.filter(f => selectedFields.includes(f.id));
    const headers = fieldsToExport.map(f => f.label);
    
    const data = licenseesToDisplay.map(licensee => {
        const finalPrice = calculateFinalPrice(licensee);
        const licenseeWithFinalPrice = { ...licensee, finalPrice };

        return fieldsToExport.map(fieldInfo => {
            // Helper to get nested properties e.g., "legalRepresentative.email"
            const value = fieldInfo.id.split('.').reduce((p, c) => (p && p[c] !== undefined) ? p[c] : null, licenseeWithFinalPrice as any);
            
            if (fieldInfo.formatter) {
                // @ts-ignore
                return fieldInfo.formatter(value, licenseeWithFinalPrice, licenseeCategories, packs, reductions);
            }
            return value ?? "";
        });
    });

    if (exportFormat === 'csv') {
        const csv = unparse({ fields: headers, data }, { delimiter: ';' });
        const blob = new Blob(["\uFEFF" + csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", `export_trapel_fc_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    } else { // PDF
        const doc = new jsPDF({ orientation: 'landscape' });
        doc.text("Export des licenciés - Trapel FC", 14, 15);
        autoTable(doc, {
            head: [headers],
            body: data,
            startY: 20,
            theme: 'grid',
            styles: { fontSize: 8 },
            headStyles: { fillColor: [41, 128, 185] }
        });
        doc.save(`export_trapel_fc_${new Date().toISOString().split('T')[0]}.pdf`);
    }
    setExportDialogOpen(false);
  };
  
  return (
    <>
        <Card className="shadow-lg">
            <CardHeader>
                <CardTitle className="text-3xl font-headline">Données de l'année en cours</CardTitle>
                <CardDescription>
                Liste des licenciés avec inscription et équipement finalisés pour la saison actuelle.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="flex flex-wrap items-center gap-4 mb-6">
                    <Input
                        placeholder="Filtrer par nom..."
                        value={nameFilter}
                        onChange={(e) => setNameFilter(e.target.value)}
                        className="max-w-sm"
                    />
                    <Select value={categoryFilter} onValueChange={(value) => setCategoryFilter(value)}>
                        <SelectTrigger className="w-[280px]">
                        <SelectValue placeholder="Filtrer par catégorie" />
                        </SelectTrigger>
                        <SelectContent>
                        <SelectItem value="all">Toutes les catégories</SelectItem>
                        {licenseeCategories.map((cat) => (
                            <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                        ))}
                        </SelectContent>
                    </Select>
                    {(nameFilter || categoryFilter !== "all") && (
                        <Button variant="ghost" onClick={clearFilters}>
                        <X className="mr-2 h-4 w-4" />
                        Effacer
                        </Button>
                    )}
                    <div className="flex-grow"></div>
                    <Button variant="outline" onClick={() => setExportDialogOpen(true)}>
                        <Download className="mr-2 h-4 w-4" />
                        Exporter les données
                    </Button>
                </div>

                {licenseesToDisplay.length > 0 ? (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Nom du licencié</TableHead>
                                <TableHead>Email(s)</TableHead>
                                <TableHead>Catégorie</TableHead>
                                <TableHead>Pack souscrit</TableHead>
                                <TableHead>Date d'inscription</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {licenseesToDisplay.map((licensee) => (
                            <TableRow key={licensee.id}>
                                <TableCell className="font-medium">
                                    {`${licensee.firstName} ${licensee.lastName}`}
                                </TableCell>
                                <TableCell>
                                    <div className="flex flex-col text-sm">
                                        <span>{licensee.email}</span>
                                        {licensee.legalRepresentative?.email && (
                                            <span className="text-muted-foreground">
                                                {`Resp: ${licensee.legalRepresentative.email}`}
                                            </span>
                                        )}
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <Badge variant="outline">{getCategoryName(licensee.licenseeCategoryId)}</Badge>
                                </TableCell>
                                <TableCell>{getPackInfo(licensee.packId)}</TableCell>
                                <TableCell>
                                    {format(new Date(licensee.registrationDate), "d MMMM yyyy", { locale: fr })}
                                </TableCell>
                                <TableCell className="text-right">
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" className="h-8 w-8 p-0">
                                            <span className="sr-only">Ouvrir le menu</span>
                                            <MoreHorizontal className="h-4 w-4" />
                                        </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                            <DropdownMenuItem onClick={() => handleOpenProfile(licensee)}>
                                                Voir le profil
                                            </DropdownMenuItem>
                                            <DropdownMenuSeparator />
                                            <DropdownMenuItem
                                                className="text-destructive focus:bg-destructive focus:text-destructive-foreground"
                                                onClick={() => handleDeleteClick(licensee)}
                                            >
                                                <Trash2 className="mr-2 h-4 w-4" /> Supprimer
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </TableCell>
                            </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                ) : (
                    <div className="text-center py-10">
                    <p className="text-muted-foreground">Aucun licencié finalisé ne correspond à vos filtres.</p>
                    </div>
                )}
            </CardContent>
        </Card>

        <Dialog open={isProfileOpen} onOpenChange={setProfileOpen}>
            <DialogContent className="sm:max-w-3xl">
            <DialogHeader>
                <DialogTitle>Profil de {selectedLicensee?.firstName} {selectedLicensee?.lastName}</DialogTitle>
                <DialogDescription>
                    {`Détails de l'inscription enregistrée le ${selectedLicensee ? format(new Date(selectedLicensee.registrationDate), "d MMMM yyyy", { locale: fr }) : ''}.`}
                </DialogDescription>
            </DialogHeader>
            
            <ScrollArea className="max-h-[70vh] -mr-2 pr-6">
                <div className="space-y-6 py-4">
                    {selectedLicensee && <>
                        <div>
                            <h4 className="text-lg font-semibold mb-3">Informations du licencié</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                <DetailItem label="Nom" value={selectedLicensee.lastName} />
                                <DetailItem label="Prénom" value={selectedLicensee.firstName} />
                                <DetailItem label="Sexe" value={selectedLicensee.sex === 'male' ? 'Homme' : 'Femme'} />
                                <DetailItem label="Date de naissance" value={format(new Date(selectedLicensee.dateOfBirth), "d MMMM yyyy", { locale: fr })} />
                                <DetailItem label="Lieu de naissance" value={selectedLicensee.placeOfBirth} />
                                <DetailItem label="Né(e) à l'étranger" value={selectedLicensee.bornAbroad ? 'Oui' : 'Non'} />
                                <DetailItem label="Téléphone" value={selectedLicensee.phone} />
                                <DetailItem label="Email" value={<span className="break-all">{selectedLicensee.email}</span>} />
                            </div>
                        </div>

                        {selectedLicensee.legalRepresentative && (
                            <div>
                                <Separator className="my-4" />
                                <h4 className="text-lg font-semibold mb-3">Responsable Légal</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    <DetailItem label="Nom" value={selectedLicensee.legalRepresentative.lastName} />
                                    <DetailItem label="Prénom" value={selectedLicensee.legalRepresentative.firstName} />
                                    <DetailItem label="Date de naissance" value={selectedLicensee.legalRepresentative.dateOfBirth ? format(new Date(selectedLicensee.legalRepresentative.dateOfBirth), "d MMMM yyyy", { locale: fr }) : 'N/A'} />
                                    <DetailItem label="Lieu de naissance" value={selectedLicensee.legalRepresentative.placeOfBirth} />
                                    <DetailItem label="Né(e) à l'étranger" value={selectedLicensee.legalRepresentative.bornAbroad ? 'Oui' : 'Non'} />
                                    <DetailItem label="Email" value={<span className="break-all">{selectedLicensee.legalRepresentative.email}</span>} />
                                    <DetailItem label="Téléphone Père" value={selectedLicensee.legalRepresentative.fatherPhone} />
                                    <DetailItem label="Téléphone Mère" value={selectedLicensee.legalRepresentative.motherPhone} />
                                </div>
                            </div>
                        )}

                        <Separator className="my-4" />
                        <div>
                            <h4 className="text-lg font-semibold mb-3">Détails de l'Inscription et Paiement</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                <DetailItem label="Catégorie" value={getCategoryName(selectedLicensee.licenseeCategoryId)} />
                                <DetailItem label="Date d'inscription" value={format(new Date(selectedLicensee.registrationDate), "d MMMM yyyy", { locale: fr })} />
                                <DetailItem label="Statut Paiement" value={getStatusBadge(selectedLicensee.paymentStatus)} />
                                <DetailItem label="Montant final" value={`${finalPrice.toFixed(2)} €`} />
                                {selectedLicensee.paymentMethod && <DetailItem label="Méthode" value={selectedLicensee.paymentMethod} />}
                                {selectedLicensee.paymentDate && <DetailItem label="Date Paiement" value={format(new Date(selectedLicensee.paymentDate), "d MMM yyyy", { locale: fr })} />}
                            </div>
                            {(selectedLicensee.reductions && selectedLicensee.reductions.length > 0) && (
                                <div className="mt-4">
                                    <p className="text-sm font-medium text-muted-foreground">Détails du calcul</p>
                                    <ul className="text-sm mt-1 text-muted-foreground space-y-1">
                                        <li>Pack {packs.find(p => p.id === selectedLicensee.packId)?.name}: {packs.find(p => p.id === selectedLicensee.packId)?.price.toFixed(2)} €</li>
                                        {(selectedLicensee.reductions || []).map(applied => {
                                            const reduction = reductions.find(r => r.id === applied.id);
                                            return reduction ? (
                                                <li key={reduction.id}>Réduction {reduction.name}: {reduction.amount > 0 ? `-${reduction.amount.toFixed(2)}€` : `x${reduction.multiplier}`}</li>
                                            ) : null;
                                        })}
                                    </ul>
                                </div>
                            )}
                            {selectedLicensee.paymentComment && <div className="mt-4"><DetailItem label="Commentaire Paiement" value={selectedLicensee.paymentComment} /></div>}
                        </div>

                        <Separator className="my-4" />
                        <div>
                            <h4 className="text-lg font-semibold mb-3">Équipement Attribué</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                <DetailItem label="Statut" value={getStatusBadge(selectedLicensee.equipmentStatus)} />
                            </div>
                            {selectedLicensee.assignedEquipment && selectedLicensee.assignedEquipment.length > 0 && (
                                <div className="mt-4">
                                    <p className="text-sm font-medium text-muted-foreground">Articles attribués</p>
                                    <ul className="list-disc list-inside text-sm mt-1 space-y-1">
                                        {selectedLicensee.assignedEquipment.map((item, index) => (
                                            <li key={index}>
                                                {item.name} : <span className="font-semibold">{item.size}</span>
                                                {item.outOfStock && <Badge variant="destructive" className="ml-2">Attribué en rupture</Badge>}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>
                    </>}
                </div>
            </ScrollArea>
            
            <DialogFooter className="pr-6 pt-4">
                <Button variant="outline" onClick={() => setProfileOpen(false)}>Fermer</Button>
            </DialogFooter>
            </DialogContent>
        </Dialog>

        <Dialog open={isExportDialogOpen} onOpenChange={setExportDialogOpen}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle>Exporter les Données des Licenciés</DialogTitle>
                    <DialogDescription>
                        Choisissez le format et les colonnes à inclure dans l'export.
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label>Format d'export</Label>
                        <RadioGroup value={exportFormat} onValueChange={(v) => setExportFormat(v as 'csv' | 'pdf')} className="flex gap-4">
                            <Label htmlFor="format-csv" className="flex items-center gap-2 cursor-pointer font-normal">
                                <RadioGroupItem value="csv" id="format-csv" />
                                CSV (pour Excel)
                            </Label>
                            <Label htmlFor="format-pdf" className="flex items-center gap-2 cursor-pointer font-normal">
                                <RadioGroupItem value="pdf" id="format-pdf" />
                                PDF
                            </Label>
                        </RadioGroup>
                    </div>
                    <Separator />
                    <div className="space-y-2">
                        <div className="flex justify-between items-center">
                            <Label>Champs à inclure</Label>
                            <Button variant="link" className="h-auto p-0" onClick={() => setSelectedFields(exportFields.map(f => f.id))}>Tout sél.</Button>
                            <Button variant="link" className="h-auto p-0" onClick={() => setSelectedFields([])}>Tout désél.</Button>
                        </div>
                        <ScrollArea className="h-64 rounded-md border p-4">
                            <div className="space-y-4">
                                {Object.entries(exportFields.reduce((acc, field) => {
                                    (acc[field.group] = acc[field.group] || []).push(field);
                                    return acc;
                                }, {} as Record<string, typeof exportFields>)).map(([group, fields]) => (
                                    <div key={group}>
                                        <h4 className="font-medium mb-2">{group}</h4>
                                        <div className="space-y-2 pl-2">
                                            {fields.map(field => (
                                                <div key={field.id} className="flex items-center space-x-2">
                                                    <Checkbox
                                                        id={`export-${field.id}`}
                                                        checked={selectedFields.includes(field.id)}
                                                        onCheckedChange={() => handleFieldToggle(field.id)}
                                                    />
                                                    <Label htmlFor={`export-${field.id}`} className="font-normal cursor-pointer text-sm">
                                                        {field.label}
                                                    </Label>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </ScrollArea>
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setExportDialogOpen(false)}>Annuler</Button>
                    <Button onClick={handleExport} disabled={selectedFields.length === 0}>
                        <Download className="mr-2 h-4 w-4" />
                        Télécharger
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
        
        <AlertDialog open={isAlertOpen} onOpenChange={setAlertOpen}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Êtes-vous sûr de vouloir supprimer ?</AlertDialogTitle>
                    <AlertDialogDescription>
                    Cette action est irréversible. L'inscription de {selectedLicensee?.firstName} {selectedLicensee?.lastName} sera définitivement supprimée.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Annuler</AlertDialogCancel>
                    <AlertDialogAction onClick={handleConfirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Supprimer</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    </>
  );
}
