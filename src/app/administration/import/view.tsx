
"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Papa from "papaparse";
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
import { importLicensees } from "@/lib/actions";
import type { LicenseeCategory, Pack } from "@/lib/types";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { FileUp, CheckCircle2, XCircle, Download, List } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";

interface ImportViewProps {
  packs: Pack[];
  licenseeCategories: LicenseeCategory[];
}

type CsvRow = Record<string, string>;
type ValidationError = { index: number; errors: string[] };

const CSV_HEADERS = [
  'firstName', 'lastName', 'sex', 'dateOfBirth', 'placeOfBirth', 'bornAbroad',
  'phone', 'email', 'licenseeCategoryName', 'packName',
  'repFirstName', 'repLastName', 'repDateOfBirth', 'repPlaceOfBirth', 'repBornAbroad',
  'repEmail', 'repFatherPhone', 'repMotherPhone'
];

const calculateAge = (birthDate: Date): number => {
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDifference = today.getMonth() - birthDate.getMonth();
    if (monthDifference < 0 || (monthDifference === 0 && today.getDate() < birthDate.getDate())) {
        age--;
    }
    return age;
};

export function ImportView({ packs, licenseeCategories }: ImportViewProps) {
  const { toast } = useToast();
  const router = useRouter();
  const [file, setFile] = React.useState<File | null>(null);
  const [data, setData] = React.useState<CsvRow[]>([]);
  const [validationErrors, setValidationErrors] = React.useState<ValidationError[]>([]);
  const [isProcessing, setIsProcessing] = React.useState(false);
  
  const resetState = () => {
    setFile(null);
    setData([]);
    setValidationErrors([]);
    setIsProcessing(false);
    const fileInput = document.getElementById('csv-file') as HTMLInputElement;
    if (fileInput) fileInput.value = '';
  };

  const validateData = (parsedData: CsvRow[]) => {
    const errors: ValidationError[] = [];
    
    parsedData.forEach((row, index) => {
        const rowErrors: string[] = [];
        
        // Basic required fields
        if (!row.firstName) rowErrors.push("Prénom manquant");
        if (!row.lastName) rowErrors.push("Nom manquant");
        if (!row.sex || !['male', 'female'].includes(row.sex.toLowerCase())) rowErrors.push("Sexe invalide (male/female)");
        if (!row.dateOfBirth || isNaN(new Date(row.dateOfBirth).getTime())) rowErrors.push("Date de naissance invalide (AAAA-MM-JJ)");
        if (!row.email || !/^\S+@\S+\.\S+$/.test(row.email)) rowErrors.push("Email invalide");
        if (!row.packName || !packs.some(p => p.name === row.packName)) rowErrors.push("Pack non trouvé");
        if (!row.licenseeCategoryName || !licenseeCategories.some(c => c.name === row.licenseeCategoryName)) rowErrors.push("Catégorie licencié non trouvée");

        // Minor validation
        if (row.dateOfBirth && !isNaN(new Date(row.dateOfBirth).getTime())) {
            const age = calculateAge(new Date(row.dateOfBirth));
            if (age < 18) {
                if (!row.repFirstName) rowErrors.push("Prénom du responsable manquant");
                if (!row.repLastName) rowErrors.push("Nom du responsable manquant");
                if (!row.repEmail || !/^\S+@\S+\.\S+$/.test(row.repEmail)) rowErrors.push("Email du responsable invalide");
                if (!row.repDateOfBirth || isNaN(new Date(row.repDateOfBirth).getTime())) rowErrors.push("Date de naissance du responsable invalide");
            }
        }

        if (rowErrors.length > 0) {
            errors.push({ index: index + 1, errors: rowErrors });
        }
    });

    setValidationErrors(errors);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    resetState();
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
        setIsProcessing(true);
        setFile(selectedFile);
        Papa.parse<CsvRow>(selectedFile, {
            header: true,
            skipEmptyLines: true,
            complete: (results) => {
                setData(results.data);
                validateData(results.data);
                setIsProcessing(false);
            },
            error: (error) => {
                toast({ title: "Erreur de lecture du fichier", description: error.message, variant: "destructive" });
                setIsProcessing(false);
            }
        });
    }
  };
  
  const handleDownloadTemplate = () => {
    const csv = Papa.unparse([CSV_HEADERS], { delimiter: ';' });
    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "modele_import_inscriptions.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleImport = async () => {
    setIsProcessing(true);
    const validData = data.filter((_, index) => !validationErrors.some(e => e.index === index + 1));
    
    if (validData.length === 0) {
        toast({ title: "Aucune donnée valide", description: "Veuillez corriger les erreurs dans votre fichier.", variant: "destructive" });
        setIsProcessing(false);
        return;
    }
    
    const dataToImport = validData.map(row => {
        const pack = packs.find(p => p.name === row.packName)!;
        const category = licenseeCategories.find(c => c.name === row.licenseeCategoryName)!;
        const age = calculateAge(new Date(row.dateOfBirth));
        return {
            firstName: row.firstName.trim(),
            lastName: row.lastName.trim(),
            sex: row.sex.toLowerCase() as 'male' | 'female',
            dateOfBirth: new Date(row.dateOfBirth),
            placeOfBirth: row.placeOfBirth?.trim() || '',
            bornAbroad: row.bornAbroad?.toLowerCase() === 'true',
            phone: row.phone?.trim() || '',
            email: row.email.trim(),
            packId: pack.id,
            licenseeCategoryId: category.id,
            legalRepresentative: age < 18 ? {
                firstName: row.repFirstName.trim(),
                lastName: row.repLastName.trim(),
                dateOfBirth: new Date(row.repDateOfBirth),
                placeOfBirth: row.repPlaceOfBirth?.trim() || '',
                bornAbroad: row.repBornAbroad?.toLowerCase() === 'true',
                email: row.repEmail.trim(),
                fatherPhone: row.repFatherPhone?.trim() || '',
                motherPhone: row.repMotherPhone?.trim() || '',
            } : undefined,
        }
    });
    
    try {
        const result = await importLicensees(dataToImport);
        toast({ title: "Importation réussie", description: `${result.importedCount} licencié(s) ont été importés.` });
        resetState();
        router.refresh(); // To update other parts of the app that show licensees
    } catch (error) {
        toast({ title: "Erreur lors de l'importation", description: "Une erreur est survenue sur le serveur.", variant: "destructive" });
    } finally {
        setIsProcessing(false);
    }
  };

  const validRows = data.length - validationErrors.length;
  const hasData = data.length > 0;

  return (
    <div className="space-y-8">
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-3xl font-headline">Import de Données</CardTitle>
          <CardDescription>
            Importez plusieurs inscriptions en une seule fois à l'aide d'un fichier CSV.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
            <Alert>
                <List className="h-4 w-4" />
                <AlertTitle>Instructions</AlertTitle>
                <AlertDescription>
                    <ul className="list-disc list-inside space-y-1 mt-2">
                        <li>Le fichier doit être au format CSV avec des séparateurs point-virgule (;).</li>
                        <li>Les en-têtes de colonnes doivent correspondre exactement au modèle.</li>
                        <li>Les dates doivent être au format AAAA-MM-JJ.</li>
                        <li>Le champ `sex` doit contenir `male` ou `female`.</li>
                        <li>Le champ `bornAbroad` doit contenir `true` ou `false`.</li>
                        <li>Les champs pour le responsable légal sont obligatoires pour les mineurs.</li>
                    </ul>
                </AlertDescription>
            </Alert>
            <div className="flex flex-col sm:flex-row items-center gap-4">
                <div className="grid w-full max-w-sm items-center gap-1.5">
                    <Label htmlFor="csv-file">1. Choisir un fichier CSV</Label>
                    <Input id="csv-file" type="file" accept=".csv" onChange={handleFileChange} disabled={isProcessing} />
                </div>
                <div className="sm:pt-5">
                    <Button variant="outline" onClick={handleDownloadTemplate}>
                        <Download className="mr-2 h-4 w-4" />
                        Télécharger le modèle
                    </Button>
                </div>
            </div>
        </CardContent>
      </Card>
      
      {hasData && (
        <Card className="shadow-lg">
            <CardHeader>
                <CardTitle>Aperçu et Validation</CardTitle>
                <CardDescription>Vérifiez les données de votre fichier avant de finaliser l'importation.</CardDescription>
                <div className="pt-4 space-y-2">
                    <div className="flex justify-between text-sm">
                        <span>Lignes valides</span>
                        <span className="font-medium text-green-600">{validRows} / {data.length}</span>
                    </div>
                    <Progress value={(validRows / data.length) * 100} />
                </div>
            </CardHeader>
            <CardContent>
                <ScrollArea className="h-72 w-full">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-12">Ligne</TableHead>
                                <TableHead className="w-24">Statut</TableHead>
                                <TableHead>Détails</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {data.map((row, index) => {
                                const error = validationErrors.find(e => e.index === index + 1);
                                return (
                                    <TableRow key={index}>
                                        <TableCell className="font-mono">{index + 1}</TableCell>
                                        <TableCell>
                                            {error ? 
                                                <Badge variant="destructive"><XCircle className="h-3.5 w-3.5 mr-1.5" />Erreur</Badge> : 
                                                <Badge className="bg-green-600 hover:bg-green-700"><CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />Valide</Badge>
                                            }
                                        </TableCell>
                                        <TableCell className="text-xs">
                                            {error ? (
                                                <ul className="list-disc list-inside text-destructive">
                                                   {error.errors.map((e, i) => <li key={i}>{e}</li>)}
                                                </ul>
                                            ) : (
                                                <span className="text-muted-foreground">{`${row.firstName} ${row.lastName} - ${row.packName}`}</span>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </ScrollArea>
            </CardContent>
             <CardContent className="flex justify-end pt-0">
                <Button 
                    onClick={handleImport} 
                    disabled={isProcessing || validRows === 0}
                    size="lg"
                >
                    <FileUp className="mr-2 h-5 w-5" />
                    {isProcessing ? "Importation..." : `Importer ${validRows} licencié(s)`}
                </Button>
             </CardContent>
        </Card>
      )}
    </div>
  );
}
