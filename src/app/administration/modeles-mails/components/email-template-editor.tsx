
'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ArrowLeft } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { ALL_PLACEHOLDERS } from '../constants'; // Importer depuis le nouveau fichier de constantes

interface EmailTemplateEditorProps {
  templateId: string;
  title: string;
  description: string;
  subjectKey: string;
  bodyKey: string;
  defaultSubject: string;
  defaultBody: string;
}

export default function EmailTemplateEditor({
  templateId,
  title,
  description,
  subjectKey,
  bodyKey,
  defaultSubject,
  defaultBody,
}: EmailTemplateEditorProps) {
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    setIsLoading(true);
    if (typeof window !== 'undefined') {
      setSubject(localStorage.getItem(subjectKey) || defaultSubject);
      setBody(localStorage.getItem(bodyKey) || defaultBody);
    }
    setIsLoading(false);
  }, [subjectKey, bodyKey, defaultSubject, defaultBody]);

  const handleSaveTemplate = () => {
    localStorage.setItem(subjectKey, subject);
    localStorage.setItem(bodyKey, body);
    toast({
      title: "Succès",
      description: `Modèle "${title}" sauvegardé.`,
    });
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-4">
        <div className="mb-6 flex items-center">
          <Button variant="outline" size="icon" asChild className="mr-4">
            <Link href="/administration/modeles-mails">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <h1 className="text-2xl font-bold">{title}</h1>
        </div>
        <p className="text-center">Chargement du modèle...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      <div className="mb-6 flex items-center">
        <Button variant="outline" size="icon" asChild className="mr-4">
          <Link href="/administration/modeles-mails">
            <ArrowLeft className="h-4 w-4" />
            <span className="sr-only">Retour à la liste des modèles</span>
          </Link>
        </Button>
        <h1 className="text-2xl font-bold">{title}</h1>
      </div>

      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Éditer le Modèle</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor={`${templateId}-subject`}>Sujet de l'e-mail</Label>
            <Input
              id={`${templateId}-subject`}
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor={`${templateId}-body`}>Corps de l'e-mail</Label>
            <Textarea
              id={`${templateId}-body`}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={15}
              className="min-h-[300px]"
            />
          </div>
        </CardContent>
        <CardFooter>
          <Button onClick={handleSaveTemplate}>Enregistrer ce modèle</Button>
        </CardFooter>
      </Card>

      <div className="mt-8 p-4 border rounded-md bg-muted">
        <h4 className="text-md font-semibold mb-2">Placeholders disponibles :</h4>
        <ul className="list-disc list-inside text-xs text-muted-foreground space-y-0.5 columns-2 md:columns-3">
          {ALL_PLACEHOLDERS.map(p => (
            <li key={p.name}><code>{p.name}</code> - {p.desc}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}
