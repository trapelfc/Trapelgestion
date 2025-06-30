
"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import type { EmailTemplates, EmailTemplate } from "@/lib/types";
import { updateEmailTemplates } from "@/lib/actions";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Eye } from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

interface MailTypeViewProps {
  initialTemplates: EmailTemplates;
}

const placeholderInfo = [
    { key: "{{recipientName}}", desc: "Nom complet du destinataire (licencié ou responsable légal)." },
    { key: "{{licenseeName}}", desc: "Nom complet du licencié." },
    { key: "{{packName}}", desc: "Nom du pack souscrit (mail de paiement)." },
    { key: "{{finalPrice}}", desc: "Montant final payé (mail de paiement)." },
    { key: "{{equipmentList}}", desc: "Liste HTML des équipements attribués (mails d'équipement)." },
    { key: "{{clubName}}", desc: "Nom du club." },
    { key: "{{clubAddress}}", desc: "Adresse du club." },
    { key: "{{clubEmail}}", desc: "Email de contact du club." },
    { key: "{{clubPhone}}", desc: "Téléphone de contact du club." },
    { key: "{{clubResponsibleName}}", desc: "Nom du responsable du club." },
    { key: "{{clubFacebookUrl}}", desc: "Lien vers la page Facebook du club." },
    { key: "{{clubInstagramUrl}}", desc: "Lien vers la page Instagram du club." },
];

const formattingInfo = [
  { tag: '<strong>Texte</strong>', desc: 'Mettre le texte en gras.' },
  { tag: '<em>Texte</em>', desc: 'Mettre le texte en italique.' },
  { tag: '<p>Paragraphe</p>', desc: 'Créer un nouveau paragraphe.' },
  { tag: '<br>', desc: 'Insérer un saut de ligne.' },
  { tag: '<ul><li>Item</li></ul>', desc: 'Créer une liste à puces.' },
  { tag: '<a href="URL">Texte</a>', desc: 'Créer un lien hypertexte.' },
];

const TemplateEditor = ({ 
  type, 
  title, 
  template, 
  handleTemplateChange,
  handlePreview
}: { 
  type: keyof EmailTemplates, 
  title: string,
  template: EmailTemplate,
  handleTemplateChange: (type: keyof EmailTemplates, field: 'subject' | 'body', value: string) => void,
  handlePreview: (template: EmailTemplate) => void;
}) => (
  <Card>
      <CardHeader>
          <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
          <div className="space-y-2">
              <Label htmlFor={`subject-${type}`}>Objet du mail</Label>
              <Input 
                  id={`subject-${type}`} 
                  value={template.subject} 
                  onChange={(e) => handleTemplateChange(type, 'subject', e.target.value)} 
              />
          </div>
           <div className="space-y-2">
              <Label htmlFor={`body-${type}`}>Corps du mail (HTML)</Label>
               <Textarea
                  id={`body-${type}`}
                  value={template.body}
                  onChange={(e) => handleTemplateChange(type, 'body', e.target.value)}
                  className="min-h-[250px] font-mono text-xs"
              />
          </div>
      </CardContent>
      <CardFooter>
        <Button variant="outline" onClick={() => handlePreview(template)}>
            <Eye className="mr-2 h-4 w-4" />
            Aperçu du mail
        </Button>
      </CardFooter>
  </Card>
);

export function MailTypeView({ initialTemplates }: MailTypeViewProps) {
  const [templates, setTemplates] = React.useState<EmailTemplates>(initialTemplates);
  const router = useRouter();
  const { toast } = useToast();

  const [isPreviewOpen, setPreviewOpen] = React.useState(false);
  const [previewContent, setPreviewContent] = React.useState<{ subject: string; body: string } | null>(null);

  const handleTemplateChange = (
    type: keyof EmailTemplates,
    field: 'subject' | 'body',
    value: string
  ) => {
    setTemplates(prev => ({
      ...prev,
      [type]: {
        ...prev[type],
        [field]: value
      }
    }));
  };

  const handleSave = async () => {
    await updateEmailTemplates(templates);
    toast({
      title: "Mails types sauvegardés",
      description: "Vos modèles de mails ont été mis à jour.",
    });
    router.refresh();
  };

  const handlePreview = (templateToPreview: EmailTemplate) => {
    const dummyContext = {
        recipientName: "John Doe (Exemple)",
        licenseeName: "Jane Doe (Exemple)",
        packName: "Pack Premium (Exemple)",
        finalPrice: "99.99",
        equipmentList: "<ul><li>T-shirt (M)</li><li style='color: #dc2626;'>Short (M) - En rupture</li></ul>",
        clubName: "Trapel FC (Exemple)",
        clubAddress: "123 Rue du Stade<br>75000 VILLE",
        clubEmail: "contact@trapel-fc.fr",
        clubPhone: "01 23 45 67 89",
        clubResponsibleName: "Jean-Pierre Coach",
        clubFacebookUrl: "https://facebook.com/trapelfc",
        clubInstagramUrl: "https://instagram.com/trapelfc",
    };

    const render = (templateString: string) => {
        let rendered = templateString;
        Object.entries(dummyContext).forEach(([key, value]) => {
            rendered = rendered.replace(new RegExp(`{{${key}}}`, 'g'), value);
        });
        return rendered;
    };

    setPreviewContent({
        subject: render(templateToPreview.subject),
        body: render(templateToPreview.body)
    });
    setPreviewOpen(true);
  };

  return (
    <div className="space-y-8">
        <Card className="shadow-lg">
            <CardHeader>
                <CardTitle className="text-3xl font-headline">Gestion des Mails Types</CardTitle>
                <CardDescription>
                    Modifiez ici le contenu des mails automatiques. Sélectionnez un modèle pour l'éditer.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="grid md:grid-cols-3 gap-8">
                    <div className="md:col-span-2">
                        <Tabs defaultValue="paymentConfirmation" className="w-full">
                            <TabsList className="grid w-full grid-cols-3 mb-4">
                                <TabsTrigger value="paymentConfirmation">Paiement</TabsTrigger>
                                <TabsTrigger value="equipmentComplete">Équip. Complet</TabsTrigger>
                                <TabsTrigger value="equipmentIncomplete">Équip. Incomplet</TabsTrigger>
                            </TabsList>
                            <TabsContent value="paymentConfirmation">
                                <TemplateEditor type="paymentConfirmation" title="Mail de confirmation de paiement" template={templates.paymentConfirmation} handleTemplateChange={handleTemplateChange} handlePreview={handlePreview} />
                            </TabsContent>
                            <TabsContent value="equipmentComplete">
                                <TemplateEditor type="equipmentComplete" title="Mail d'équipement attribué (complet)" template={templates.equipmentComplete} handleTemplateChange={handleTemplateChange} handlePreview={handlePreview} />
                            </TabsContent>
                            <TabsContent value="equipmentIncomplete">
                                <TemplateEditor type="equipmentIncomplete" title="Mail d'équipement attribué (incomplet)" template={templates.equipmentIncomplete} handleTemplateChange={handleTemplateChange} handlePreview={handlePreview} />
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
                                       {placeholderInfo.map(p => 
                                            <li key={p.key}>
                                                <code className="font-mono bg-primary/10 text-primary p-1 rounded-md">{p.key}</code>
                                                <p className="text-xs text-muted-foreground mt-1">{p.desc}</p>
                                            </li>
                                        )}
                                    </ul>
                                </div>
                                <Separator />
                                <div>
                                    <h4 className="font-medium text-sm mb-2">Mise en forme (HTML)</h4>
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

        <div className="flex justify-end pt-4">
            <Button onClick={handleSave} size="lg">Sauvegarder les modèles</Button>
        </div>
        
        <Dialog open={isPreviewOpen} onOpenChange={setPreviewOpen}>
            <DialogContent className="sm:max-w-3xl">
                <DialogHeader>
                    <DialogTitle>Aperçu du Mail</DialogTitle>
                    <DialogDescription>
                        <strong>Objet :</strong> {previewContent?.subject}
                    </DialogDescription>
                </DialogHeader>
                <ScrollArea className="max-h-[60vh] my-4 rounded-md border p-4 bg-white text-black">
                    <div dangerouslySetInnerHTML={{ __html: previewContent?.body || '' }} />
                </ScrollArea>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setPreviewOpen(false)}>Fermer</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    </div>
  );
}
