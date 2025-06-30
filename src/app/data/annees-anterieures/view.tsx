
"use client";

import * as React from "react";
import { format } from "date-fns";
import { unparse } from "papaparse";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { Archive, Download } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";
import { getArchivedLicensees } from "@/lib/actions";
import type { Licensee, Pack, LicenseeCategory, Reduction } from "@/lib/types";


const BASE_EXPORT_FIELDS = [
    { id: 'lastName', label: 'Nom', group: 'Infos Licencié' },
    { id: 'firstName', label: 'Prénom', group: 'Infos Licencié' },
    { id: 'sex', label: 'Sexe', group: 'Infos Licencié', formatter: (v: 'male' | 'female') => v === 'male' ? 'Homme' : 'Femme' },
    { id: 'dateOfBirth', label: 'Date de naissance', group: 'Infos Licencié', formatter: (d: string) => d ? format(new Date(d), 'dd/MM/yyyy') : '' },
    { id: 'placeOfBirth', label: 'Lieu de naissance', group: 'Infos Licencié' },
    { id: 'bornAbroad', label: 'Né(e) à l\'étranger', group: 'Infos Licencié', formatter: (b: boolean) => b ? 'Oui' : 'Non' },
    { id: 'phone', label: 'Téléphone', group: 'Infos Licencié' },
    { id: 'email', label: 'Email', group: 'Infos Licencié' },
    { id: 'licenseeCategoryId', label: 'Catégorie', group: 'Infos Licencié', formatter: (id: string, lic: Licensee, allCats: LicenseeCategory[]) => allCats.find(c => c.id === id)?.name || 'N/A' },
    { id: 'registrationDate', label: 'Date d\'inscription', group: 'Infos Licencié', formatter: (d: string) => d ? format(new Date(d), 'dd/MM/yyyy') : '' },
    { id: 'legalRepresentative.lastName', label: 'Nom (Resp.)', group: 'Infos Rep. Légal' },
    { id: 'legalRepresentative.firstName', label: 'Prénom (Resp.)', group: 'Infos Rep. Légal' },
    { id: 'legalRepresentative.dateOfBirth', label: 'Date de naissance (Resp.)', group: 'Infos Rep. Légal', formatter: (d: string) => d ? format(new Date(d), 'dd/MM/yyyy') : '' },
    { id: 'legalRepresentative.placeOfBirth', label: 'Lieu de naissance (Resp.)', group: 'Infos Rep. Légal' },
    { id: 'legalRepresentative.bornAbroad', label: 'Né(e) à l\'étranger (Resp.)', group: 'Infos Rep. Légal', formatter: (b: boolean) => b ? 'Oui' : 'Non' },
    { id: 'legalRepresentative.email', label: 'Email (Resp.)', group: 'Infos Rep. Légal' },
    { id: 'legalRepresentative.fatherPhone', label: 'Tél. Père', group: 'Infos Rep. Légal' },
    { id: 'legalRepresentative.motherPhone', label: 'Tél. Mère', group: 'Infos Rep. Légal' },
    { id: 'packId', label: 'Pack souscrit', group: 'Paiement', formatter: (id: string, lic: Licensee, allPacks: Pack[]) => allPacks.find(p => p.id === id)?.name || 'N/A' },
    { id: 'paymentStatus', label: 'Statut Paiement', group: 'Paiement' },
    { id: 'paymentMethod', label: 'Méthode Paiement', group: 'Paiement' },
    { id: 'paymentDate', label: 'Date Paiement', group: 'Paiement', formatter: (d: string) => d ? format(new Date(d), 'dd/MM/yyyy') : '' },
    { id: 'finalPrice', label: 'Montant Final (€)', group: 'Paiement', formatter: (val: number) => val.toFixed(2) },
    { id: 'paymentComment', label: 'Commentaire Paiement', group: 'Paiement' },
    { id: 'reductions', label: 'Réductions', group: 'Paiement', formatter: (applied: any[], lic: Licensee, allReducs: Reduction[]) => (applied || []).map(a => allReducs.find(r => r.id === a.id)?.name || '').join(', ') },
    { id: 'equipmentStatus', label: 'Statut Équipement', group: 'Équipement' },
];

interface AnneesAnterieuresViewProps {
  archivedSeasons: string[];
  packs: Pack[];
  licenseeCategories: LicenseeCategory[];
  reductions: Reduction[];
}

export function AnneesAnterieuresView({ archivedSeasons, packs, licenseeCategories, reductions }: AnneesAnterieuresViewProps) {
  const { toast } = useToast();
  const [isExportDialogOpen, setExportDialogOpen] = React.useState(false);
  const [selectedSeason, setSelectedSeason] = React.useState<string | null>(null);
  const [exportFormat, setExportFormat] = React.useState<'csv' | 'pdf'>('csv');
  const [isProcessing, setIsProcessing] = React.useState(false);
  
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

  const calculateFinalPrice = (licensee: Licensee): number => {
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
  
  const handleDownloadClick = (season: string) => {
    setSelectedSeason(season);
    setExportDialogOpen(true);
  };
  
  const handleFieldToggle = (fieldId: string) => {
    setSelectedFields(prev => prev.includes(fieldId) ? prev.filter(id => id !== fieldId) : [...prev, fieldId]);
  };

  const handleExport = async () => {
    if (!selectedSeason) return;

    setIsProcessing(true);
    try {
        const licensees = await getArchivedLicensees(selectedSeason);
        
        const fieldsToExport = exportFields.filter(f => selectedFields.includes(f.id));
        const headers = fieldsToExport.map(f => f.label);
        
        const data = licensees.map(licensee => {
            const finalPrice = calculateFinalPrice(licensee);
            const licenseeWithFinalPrice = { ...licensee, finalPrice };

            return fieldsToExport.map(fieldInfo => {
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
            link.setAttribute("download", `archive_trapel_fc_${selectedSeason}.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } else { // PDF
            const doc = new jsPDF({ orientation: 'landscape' });
            doc.text(`Archive des licenciés - Saison ${selectedSeason}`, 14, 15);
            autoTable(doc, {
                head: [headers],
                body: data,
                startY: 20,
                theme: 'grid',
                styles: { fontSize: 8 },
                headStyles: { fillColor: [41, 128, 185] }
            });
            doc.save(`archive_trapel_fc_${selectedSeason}.pdf`);
        }
        setExportDialogOpen(false);
    } catch (error) {
        toast({
            title: "Erreur",
            description: "Impossible de charger les données de l'archive.",
            variant: "destructive",
        });
    } finally {
        setIsProcessing(false);
    }
  };

  return (
    <>
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-3xl font-headline">Données des années antérieures</CardTitle>
          <CardDescription>
            Consultez ou téléchargez les archives des saisons passées.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {archivedSeasons.length > 0 ? (
            <div className="space-y-4">
              {archivedSeasons.map((season) => (
                <div key={season} className="flex items-center justify-between rounded-lg border p-4">
                  <div className="flex items-center gap-3">
                    <Archive className="h-5 w-5 text-muted-foreground" />
                    <p className="font-semibold">Saison {season}</p>
                  </div>
                  <Button onClick={() => handleDownloadClick(season)}>
                    <Download className="mr-2 h-4 w-4" />
                    Télécharger
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-8">Aucune saison n'a encore été archivée.</p>
          )}
        </CardContent>
      </Card>
      
      <Dialog open={isExportDialogOpen} onOpenChange={setExportDialogOpen}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle>Exporter l'archive de la saison {selectedSeason}</DialogTitle>
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
                                                        id={`export-archive-${field.id}`}
                                                        checked={selectedFields.includes(field.id)}
                                                        onCheckedChange={() => handleFieldToggle(field.id)}
                                                    />
                                                    <Label htmlFor={`export-archive-${field.id}`} className="font-normal cursor-pointer text-sm">
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
                    <Button onClick={handleExport} disabled={selectedFields.length === 0 || isProcessing}>
                        {isProcessing ? "Préparation..." : (<><Download className="mr-2 h-4 w-4" />Télécharger</>)}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    </>
  );
}
