
"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import type { PdfTemplates, PdfTemplate } from "@/lib/types";
import { updatePdfTemplates } from "@/lib/actions";
import { Download } from "lucide-react";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";

const clubInfoPlaceholders = [
    { key: "{{clubName}}", desc: "Nom du club." },
    { key: "{{clubAddress}}", desc: "Adresse du club." },
    { key: "{{clubEmail}}", desc: "Email de contact du club." },
    { key: "{{clubPhone}}", desc: "Téléphone de contact du club." },
    { key: "{{clubResponsibleName}}", desc: "Nom du responsable du club." },
    { key: "{{clubFacebookUrl}}", desc: "Lien vers la page Facebook du club." },
    { key: "{{clubInstagramUrl}}", desc: "Lien vers la page Instagram du club." },
];

const orderFormPlaceholders = [
    { key: "{{currentDate}}", desc: "Date actuelle (ex: 28/06/2025)." },
    ...clubInfoPlaceholders,
];

const donationPlaceholders = [
    { key: "{{currentDate}}", desc: "Date actuelle." },
    { key: "{{recipientName}}", desc: "Nom du donateur (pour l'aperçu)." },
    { key: "{{donationAmount}}", desc: "Montant du don (pour l'aperçu)." },
    ...clubInfoPlaceholders,
];

const formattingInfo = [
  { tag: '\\n', desc: 'Insérer un saut de ligne dans les textes.' },
];

const TemplateEditor = ({
  template,
  handleTemplateChange,
}: {
  template: PdfTemplate;
  handleTemplateChange: (field: keyof PdfTemplate, value: string) => void;
}) => (
    <Card>
        <CardContent className="space-y-4 pt-6">
            <div className="space-y-2">
                <Label htmlFor="title">Titre du document</Label>
                <Input
                    id="title"
                    value={template?.title ?? ''}
                    onChange={(e) => handleTemplateChange('title', e.target.value)}
                    placeholder="Ex: Bon de Commande"
                />
                <p className="text-sm text-muted-foreground">Apparaîtra en grand en haut du document.</p>
            </div>
            <div className="space-y-2">
                <Label htmlFor="headerText">Texte d'en-tête</Label>
                <Textarea
                    id="headerText"
                    value={template?.headerText ?? ''}
                    onChange={(e) => handleTemplateChange('headerText', e.target.value)}
                    placeholder="Ex: Généré le {{currentDate}} par {{clubName}}"
                    rows={3}
                />
                <p className="text-sm text-muted-foreground">Apparaîtra sous le titre.</p>
            </div>
            <div className="space-y-2">
                <Label htmlFor="footerText">Texte de pied de page</Label>
                <Textarea
                    id="footerText"
                    value={template?.footerText ?? ''}
                    onChange={(e) => handleTemplateChange('footerText', e.target.value)}
                    className="min-h-[100px]"
                    placeholder="Ex: Merci de votre commande. Pour toute question..."
                />
                <p className="text-sm text-muted-foreground">Apparaîtra en bas de chaque page du document.</p>
            </div>
        </CardContent>
    </Card>
);

export function PdfTypeView({ initialTemplates }: { initialTemplates: PdfTemplates }) {
  const [templates, setTemplates] = React.useState<PdfTemplates>(initialTemplates);
  const [activeTab, setActiveTab] = React.useState<keyof PdfTemplates>('orderForm');
  const router = useRouter();
  const { toast } = useToast();

  const handleTemplateChange = (
    field: keyof PdfTemplate,
    value: string
  ) => {
    setTemplates(prev => ({
      ...prev,
      [activeTab]: {
        ...prev[activeTab],
        [field]: value,
      },
    }));
  };

  const handleSave = async () => {
    await updatePdfTemplates(templates);
    toast({
      title: "Modèles PDF sauvegardés",
      description: "Vos modèles de PDF ont été mis à jour.",
    });
    router.refresh();
  };

  const renderTemplateString = (templateString: string): string => {
    const dummyContext = {
        currentDate: format(new Date(), 'dd/MM/yyyy'),
        clubName: "Votre Club (Exemple)",
        clubAddress: "123 Rue du Stade\n75000 VILLE",
        clubEmail: "contact@club-exemple.fr",
        clubPhone: "01 23 45 67 89",
        clubResponsibleName: "Jean Dupont",
        clubFacebookUrl: "https://facebook.com/club-exemple",
        clubInstagramUrl: "https://instagram.com/club-exemple",
        recipientName: "Exemple de Donateur",
        donationAmount: '100.00',
    };

    let rendered = templateString;
    Object.entries(dummyContext).forEach(([key, value]) => {
        rendered = rendered.replace(new RegExp(`{{${key}}}`, 'g'), value);
    });

    return rendered;
  };

  const generatePreview = () => {
    const doc = new jsPDF();
    const template = templates[activeTab];

    const title = renderTemplateString(template.title);
    const headerText = renderTemplateString(template.headerText);
    const footerText = renderTemplateString(template.footerText);

    doc.setFontSize(18);
    doc.text(title, 14, 22);

    doc.setFontSize(11);
    doc.setTextColor(100);
    const splitHeader = headerText.split('\n').flatMap(line => doc.splitTextToSize(line, 180));
    doc.text(splitHeader, 14, 32);

    autoTable(doc, {
      head: [['Exemple', 'Description', 'Valeur']],
      body: [
        ['Article A', 'Un exemple de ligne de contenu', '10'],
        ['Article B', 'Une autre ligne pour la mise en page', '20'],
      ],
      startY: Math.max(45, 32 + (splitHeader.length * 5) + 5),
      theme: 'grid',
    });

    const pageHeight = doc.internal.pageSize.getHeight();
    const splitFooter = footerText.split('\n').flatMap(line => doc.splitTextToSize(line, 180));
    doc.setFontSize(9);
    doc.setTextColor(100);
    doc.text(splitFooter, 14, pageHeight - 10 - (splitFooter.length * 4));

    const safeTitle = title.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    doc.save(`apercu_${safeTitle}.pdf`);
  };

  const currentPlaceholders = activeTab === 'orderForm' ? orderFormPlaceholders : donationPlaceholders;

  return (
    <div className="space-y-8">
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-3xl font-headline">Gestion des Modèles PDF</CardTitle>
          <CardDescription>
            Personnalisez ici le contenu des documents PDF générés par l'application.
          </CardDescription>
        </CardHeader>
        <CardContent>
            <div className="grid md:grid-cols-3 gap-8">
                <div className="md:col-span-2">
                    <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as keyof PdfTemplates)} className="w-full">
                        <TabsList className="grid w-full grid-cols-2 mb-4">
                            <TabsTrigger value="orderForm">Bon de commande</TabsTrigger>
                            <TabsTrigger value="donationReceipt">Reçu de don</TabsTrigger>
                        </TabsList>
                        <TabsContent value="orderForm">
                            <TemplateEditor template={templates.orderForm} handleTemplateChange={handleTemplateChange} />
                        </TabsContent>
                        <TabsContent value="donationReceipt">
                             <TemplateEditor template={templates.donationReceipt} handleTemplateChange={handleTemplateChange} />
                        </TabsContent>
                    </Tabs>
                </div>
                <div className="md:col-span-1">
                    <Card className="bg-muted/50 h-full sticky top-8">
                        <CardHeader>
                            <CardTitle className="text-base font-semibold">Aide à la rédaction</CardTitle>
                            <CardDescription className="text-xs">Utilisez ces éléments dans vos modèles.</CardDescription>
                        </CardHeader>
                        <CardContent className="text-sm space-y-6">
                            <div>
                                <h4 className="font-medium text-sm mb-2">Variables disponibles</h4>
                                <ul className="space-y-3">
                                    {currentPlaceholders.map(p =>
                                        <li key={p.key}>
                                            <code className="font-mono bg-primary/10 text-primary p-1 rounded-md">{p.key}</code>
                                            <p className="text-xs text-muted-foreground mt-1">{p.desc}</p>
                                        </li>
                                    )}
                                </ul>
                            </div>
                            <Separator />
                            <div>
                                <h4 className="font-medium text-sm mb-2">Mise en forme</h4>
                                <ul className="space-y-3">
                                    {formattingInfo.map(f =>
                                        <li key={f.tag}>
                                            <code className="font-mono bg-primary/10 text-primary p-1 rounded-md">{f.tag}</code>
                                            <p className="text-xs text-muted-foreground mt-1">{f.desc}</p>
                                        </li>
                                    )}
                                </ul>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </CardContent>
      </Card>

      <div className="flex justify-between items-center pt-4">
        <Button variant="outline" onClick={generatePreview}>
          <Download className="mr-2 h-4 w-4" />
          Générer un aperçu
        </Button>
        <Button onClick={handleSave} size="lg">Sauvegarder les modèles</Button>
      </div>
    </div>
  );
}
