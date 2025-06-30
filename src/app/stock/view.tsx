
"use client";

import * as React from "react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { Download, ShoppingCart } from "lucide-react";

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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { updateStock } from "@/lib/actions";
import type { EquipmentItem, Category, Licensee, Size, StockEntry, AppSettings, PdfTemplates } from "@/lib/types";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

interface StockViewProps {
  equipements: EquipmentItem[];
  categories: Category[];
  licensees: Licensee[];
  initialStock: StockEntry[];
  settings: AppSettings;
  pdfTemplates: PdfTemplates;
}

const getSizesForEquipment = (equipement: EquipmentItem, categories: Category[]): Size[] => {
    const category = categories.find(c => c.name === equipement.category);
    return category?.sizes || [];
};

const getReferenceForSize = (equipement: EquipmentItem | undefined, sizeName: string): string => {
    if (!equipement) return '';
    const isChildSize = sizeName.toLowerCase().includes('ans');
    if (isChildSize && equipement.reference_enfant) {
        return equipement.reference_enfant;
    }
    return equipement.reference_adulte || '';
};

export function StockView({ equipements, categories, licensees, initialStock, settings, pdfTemplates }: StockViewProps) {
  const { toast } = useToast();
  const [stock, setStock] = React.useState(initialStock);
  const [editingCell, setEditingCell] = React.useState<{ item: string; size: string } | null>(null);
  const [editValue, setEditValue] = React.useState("");
  const [categoryFilter, setCategoryFilter] = React.useState("all");

  // State for Order Dialog
  const [isOrderDialogOpen, setOrderDialogOpen] = React.useState(false);
  const [orderQuantities, setOrderQuantities] = React.useState<Record<string, Record<string, number>>>({});
  
  const [isClient, setIsClient] = React.useState(false);
  React.useEffect(() => {
    setIsClient(true);
  }, []);

  const uniqueCategories = [...new Set(equipements.map(e => e.category))].map(name => categories.find(c => c.name === name)).filter(Boolean) as Category[];

  const filteredEquipements = React.useMemo(() => {
    if (categoryFilter === 'all') {
      return equipements;
    }
    return equipements.filter(eq => eq.category === categoryFilter);
  }, [equipements, categoryFilter]);
  
  const equipmentsSortedByCategory = React.useMemo(() => {
    const categoryOrder = categories.map(c => c.name);
    return [...filteredEquipements].sort((a, b) => {
        return categoryOrder.indexOf(a.category) - categoryOrder.indexOf(b.category);
    });
  }, [filteredEquipements, categories]);
  
  const equipmentsByCategory = React.useMemo(() => {
      return equipmentsSortedByCategory.reduce((acc, eq) => {
          const category = eq.category;
          if (!acc[category]) {
              acc[category] = [];
          }
          acc[category].push(eq);
          return acc;
      }, {} as Record<string, EquipmentItem[]>);
  }, [equipmentsSortedByCategory]);

  const orderedCategoriesForHeader = React.useMemo(() => {
    return [...new Set(equipmentsSortedByCategory.map(e => e.category))];
  }, [equipmentsSortedByCategory]);
  
  const relevantSizes = React.useMemo(() => {
    const sizeSet = new Set<string>();
    const relevantCategoryNames = [...new Set(filteredEquipements.map(e => e.category))];
    const relevantCategories = categories.filter(c => relevantCategoryNames.includes(c.name));

    relevantCategories.forEach(cat => {
      if (cat.sizes) {
        cat.sizes.forEach(size => sizeSet.add(size.name))
      }
    });
    return Array.from(sizeSet).sort((a,b) => a.localeCompare(b, undefined, {numeric: true}));
  }, [categories, filteredEquipements]);

  const latestUpdate = React.useMemo(() => {
    if (!stock || stock.length === 0) return null;
    
    const validDates = stock
        .map(s => s.lastModified)
        .filter((d): d is Date => d instanceof Date || typeof d === 'string');

    if (validDates.length === 0) return null;

    return new Date(Math.max(...validDates.map(d => new Date(d).getTime())));
  }, [stock]);

  const getStockInfo = React.useCallback((itemName: string, sizeName: string) => {
    const stockEntry = stock.find(s => s.equipmentName === itemName && s.sizeName === sizeName);
    const managedStock = stockEntry?.quantity ?? 0;
    const lastModified = stockEntry?.lastModified;
    
    const assignedCount = licensees.reduce((count, licensee) => {
        const assignedItem = licensee.assignedEquipment?.find(eq => eq.name === itemName && eq.size === sizeName && !eq.outOfStock);
        return count + (assignedItem ? 1 : 0);
    }, 0);

    return { managedStock, assignedCount, available: managedStock - assignedCount, lastModified };
  }, [stock, licensees]);

  const handleEdit = (itemName: string, sizeName: string) => {
    if (editingCell?.item === itemName && editingCell?.size === sizeName) {
        return;
    }
    const { managedStock } = getStockInfo(itemName, sizeName);
    setEditingCell({ item: itemName, size: sizeName });
    setEditValue(String(managedStock));
  };

  const handleSave = async () => {
    if (!editingCell) return;
    
    const quantity = parseInt(editValue, 10);
    if (isNaN(quantity) || quantity < 0) {
        toast({ title: "Valeur invalide", description: "Le stock ne peut pas être négatif.", variant: "destructive" });
        setEditingCell(null);
        return;
    }

    const { item, size } = editingCell;
    setEditingCell(null);

    const originalStock = [...stock];
    const newStock = [...stock];
    const stockIndex = newStock.findIndex(s => s.equipmentName === item && s.sizeName === size);
    const lastModified = new Date();

    if (stockIndex > -1) {
        if (newStock[stockIndex].quantity === quantity) return; // No change
        newStock[stockIndex] = { ...newStock[stockIndex], quantity, lastModified };
    } else {
        newStock.push({ equipmentName: item, sizeName: size, quantity, lastModified });
    }
    setStock(newStock);

    try {
        await updateStock(item, size, quantity);
        toast({ title: "Stock mis à jour", description: `Le stock pour ${item} (${size}) est maintenant de ${quantity}.` });
    } catch (error) {
        setStock(originalStock);
        toast({ title: "Erreur", description: "Impossible de mettre à jour le stock.", variant: "destructive" });
    }
  };
  
  const handleOrderQuantityChange = (itemName: string, sizeName: string, quantity: number) => {
    setOrderQuantities(prev => ({
        ...prev,
        [itemName]: {
            ...prev[itemName],
            [sizeName]: Math.max(0, quantity)
        }
    }));
  };

  const renderTemplateString = (templateString: string): string => {
    let rendered = templateString;

    const clubContext = {
        currentDate: format(new Date(), 'dd/MM/yyyy'),
        clubName: settings.clubInfo?.name || '',
        clubAddress: settings.clubInfo?.address || '',
        clubEmail: settings.clubInfo?.email || '',
        clubPhone: settings.clubInfo?.phone || '',
        clubResponsibleName: settings.clubInfo?.responsibleName || '',
        clubFacebookUrl: settings.clubInfo?.facebookUrl || '',
        clubInstagramUrl: settings.clubInfo?.instagramUrl || '',
    };

    Object.entries(clubContext).forEach(([key, value]) => {
        if(value) {
             rendered = rendered.replace(new RegExp(`{{${key}}}`, 'g'), value);
        }
    });

    return rendered;
  };

  const handleGenerateOrderPDF = () => {
    const doc = new jsPDF();
    const clubInfo = settings.clubInfo;
    const template = pdfTemplates.orderForm;
    const tableData: (string | number)[][] = [];
    const tableHeaders = ["Référence", "Équipement", "Taille", "Quantité Commandée"];

    Object.entries(orderQuantities).forEach(([itemName, sizes]) => {
        Object.entries(sizes).forEach(([sizeName, quantity]) => {
            if (quantity > 0) {
                const equipementDetails = equipements.find(eq => eq.name === itemName);
                const reference = getReferenceForSize(equipementDetails, sizeName);
                tableData.push([reference, itemName, sizeName, quantity]);
            }
        });
    });

    if (tableData.length === 0) {
        toast({
            title: "Aucun article sélectionné",
            description: "Veuillez spécifier des quantités pour au moins un article.",
            variant: "destructive"
        });
        return;
    }
    
    // --- PDF Header ---
    doc.setFontSize(18);
    doc.text(renderTemplateString(template.title), 14, 22);

    doc.setFontSize(11);
    doc.setTextColor(100);
    const headerText = renderTemplateString(template.headerText);
    const splitHeader = headerText.split('\n').flatMap(line => doc.splitTextToSize(line, 180));
    doc.text(splitHeader, 14, 32);


    // --- PDF Table ---
    autoTable(doc, {
        head: [tableHeaders],
        body: tableData,
        startY: Math.max(45, 32 + (splitHeader.length * 5) + 5),
        theme: 'grid',
    });
    
    // --- PDF Footer ---
    const pageCount = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        const pageHeight = doc.internal.pageSize.getHeight();
        const footerText = renderTemplateString(template.footerText);
        const splitFooter = footerText.split('\n').flatMap(line => doc.splitTextToSize(line, 180));
        doc.setFontSize(9);
        doc.setTextColor(100);
        doc.text(splitFooter, 14, pageHeight - 10 - (splitFooter.length * 4));
    }
    
    const safeClubName = (clubInfo?.name || 'club').replace(/[^a-z0-9]/gi, '_').toLowerCase();
    doc.save(`bon_de_commande_${safeClubName}_${format(new Date(), "yyyy-MM-dd")}.pdf`);

    setOrderDialogOpen(false);
    setOrderQuantities({});
  };

  return (
    <>
        <Card className="shadow-lg">
            <CardHeader>
                <CardTitle className="text-3xl font-headline">Gestion du Stock</CardTitle>
                <CardDescription>
                    Cliquez sur une cellule pour modifier le stock total. Le tableau affiche le stock {' '}
                    <strong className="text-foreground">disponible</strong>, suivi du nombre d'articles <strong className="text-foreground">attribués</strong> et du stock <strong className="text-foreground">total</strong> entre parenthèses : {' '}
                    <code className="font-mono text-sm bg-muted p-1 rounded-md">Disponible (Attribué | Total)</code>.
                    {isClient && latestUpdate && <span className="block mt-1">Dernière mise à jour : {format(latestUpdate, "d MMMM yyyy 'à' HH:mm", { locale: fr })}</span>}
                </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
                <div className="flex flex-wrap items-center gap-4 mb-6">
                    <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                        <SelectTrigger className="w-[280px]">
                            <SelectValue placeholder="Filtrer par catégorie" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Toutes les catégories</SelectItem>
                            {uniqueCategories.map((cat) => (
                                <SelectItem key={cat.id} value={cat.name}>{cat.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <div className="flex-grow"></div>
                    <Button onClick={() => setOrderDialogOpen(true)}>
                        <ShoppingCart className="mr-2 h-4 w-4" />
                        Passer une commande
                    </Button>
                </div>
                <TooltipProvider>
                    <div className="relative overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead rowSpan={2} className="w-[150px] sticky left-0 bg-background z-10 align-middle border-b">Taille</TableHead>
                                    {orderedCategoriesForHeader.map(categoryName => {
                                        const categoryEquipments = equipmentsByCategory[categoryName];
                                        if (!categoryEquipments || categoryEquipments.length === 0) return null;
                                        return (
                                            <TableHead key={categoryName} colSpan={categoryEquipments.length} className="text-center border-b p-2 font-semibold">
                                                {categoryName}
                                            </TableHead>
                                        );
                                    })}
                                </TableRow>
                                <TableRow>
                                    {equipmentsSortedByCategory.map(equipement => (
                                        <TableHead key={equipement.id} className="text-center min-w-[120px] pt-2 pb-3">
                                            {equipement.name}
                                        </TableHead>
                                    ))}
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {relevantSizes.map(size => (
                                    <TableRow key={size}>
                                        <TableCell className="font-medium sticky left-0 bg-background z-10">{size}</TableCell>
                                        {equipmentsSortedByCategory.map(equipement => {
                                            const equipmentSizes = getSizesForEquipment(equipement, categories).map(s => s.name);
                                            const isSizeAvailableForEquipment = equipmentSizes.includes(size);

                                            if (!isSizeAvailableForEquipment) {
                                                return <TableCell key={equipement.id} className="text-center text-muted-foreground">-</TableCell>;
                                            }

                                            const { managedStock, available, assignedCount, lastModified } = getStockInfo(equipement.name, size);
                                            const stockColor = available <= 5 ? 'text-destructive' : (available <= 10 ? 'text-orange-600' : 'text-foreground');
                                            
                                            const isEditing = editingCell?.item === equipement.name && editingCell?.size === size;

                                            const cellContent = isEditing ? (
                                                <Input 
                                                    type="number" 
                                                    value={editValue} 
                                                    onChange={(e) => setEditValue(e.target.value)} 
                                                    onBlur={handleSave}
                                                    onKeyDown={(e) => { 
                                                        if (e.key === 'Enter') handleSave();
                                                        if (e.key === 'Escape') setEditingCell(null);
                                                    }}
                                                    autoFocus
                                                    className="w-20 h-10 mx-auto text-center text-base"
                                                />
                                            ) : (
                                                <div className="flex flex-col items-center">
                                                    <span className={`text-xl font-bold ${stockColor}`}>{available}</span>
                                                    <span className="text-xs text-muted-foreground">({assignedCount} | {managedStock})</span>
                                                </div>
                                            );

                                            return (
                                                <TableCell key={equipement.id} className="text-center p-0">
                                                    <Tooltip delayDuration={300}>
                                                        <TooltipTrigger asChild>
                                                            <div
                                                                className="w-full h-full p-2 cursor-pointer hover:bg-muted/50 flex items-center justify-center"
                                                                onClick={() => handleEdit(equipement.name, size)}
                                                            >
                                                                {cellContent}
                                                            </div>
                                                        </TooltipTrigger>
                                                        {isClient && lastModified && (
                                                            <TooltipContent>
                                                                <p>Modifié le {format(new Date(lastModified), "d MMMM yyyy 'à' HH:mm", { locale: fr })}</p>
                                                            </TooltipContent>
                                                        )}
                                                    </Tooltip>
                                                </TableCell>
                                            );
                                        })}
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                </TooltipProvider>
            </CardContent>
        </Card>

        <Dialog open={isOrderDialogOpen} onOpenChange={setOrderDialogOpen}>
            <DialogContent className="sm:max-w-3xl">
                <DialogHeader>
                    <DialogTitle>Passer une nouvelle commande</DialogTitle>
                    <DialogDescription>
                        Saisissez les quantités pour chaque article que vous souhaitez commander.
                    </DialogDescription>
                </DialogHeader>
                <ScrollArea className="max-h-[60vh] -mr-4 pr-4">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Équipement</TableHead>
                                <TableHead>Référence</TableHead>
                                <TableHead>Taille</TableHead>
                                <TableHead>Stock dispo.</TableHead>
                                <TableHead className="w-32">Quantité</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {equipements.flatMap(equipement =>
                                getSizesForEquipment(equipement, categories).map(size => {
                                    const { available } = getStockInfo(equipement.name, size.name);
                                    const stockColor = available <= 5 ? 'text-destructive font-bold' : 'text-foreground';
                                    const reference = getReferenceForSize(equipement, size.name);
                                    return (
                                        <TableRow key={`${equipement.id}-${size.id}`}>
                                            <TableCell className="font-medium">{equipement.name}</TableCell>
                                            <TableCell className="text-sm text-muted-foreground">{reference}</TableCell>
                                            <TableCell>{size.name}</TableCell>
                                            <TableCell className={stockColor}>{available}</TableCell>
                                            <TableCell>
                                                <Input
                                                    type="number"
                                                    className="h-9"
                                                    min="0"
                                                    placeholder="0"
                                                    value={orderQuantities[equipement.name]?.[size.name] || ''}
                                                    onChange={(e) => handleOrderQuantityChange(equipement.name, size.name, Number(e.target.value))}
                                                />
                                            </TableCell>
                                        </TableRow>
                                    );
                                })
                            )}
                        </TableBody>
                    </Table>
                </ScrollArea>
                <DialogFooter>
                    <Button variant="outline" onClick={() => { setOrderDialogOpen(false); setOrderQuantities({}); }}>Annuler</Button>
                    <Button onClick={handleGenerateOrderPDF}>
                        <Download className="mr-2 h-4 w-4" />
                        Générer le bon de commande
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    </>
  );
}

    
