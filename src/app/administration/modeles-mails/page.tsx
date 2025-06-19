
'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { ArrowLeft, Edit } from 'lucide-react';
import { TEMPLATE_TYPES } from './constants';

export default function ModelesMailsIndexPage() {
  return (
    <div className="container mx-auto p-4">
      <div className="mb-6 flex items-center">
        <Button variant="outline" size="icon" asChild className="mr-4">
          <Link href="/administration">
            <ArrowLeft className="h-4 w-4" />
            <span className="sr-only">Retour au Module Administration</span>
          </Link>
        </Button>
        <h1 className="text-2xl font-bold">Gestion des Modèles d'E-mails</h1>
      </div>

      <p className="mb-6 text-muted-foreground">
        Sélectionnez un modèle d'e-mail ci-dessous pour le modifier. Les placeholders disponibles seront affichés sur chaque page d'édition.
      </p>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {TEMPLATE_TYPES.map((template) => (
          <Link key={template.id} href={`/administration/modeles-mails/edit/${template.id}`} legacyBehavior>
            <a className="block transform transition-all duration-300 hover:scale-105">
              <Card className="h-full shadow-lg hover:shadow-xl">
                <CardHeader>
                  <CardTitle className="text-xl">{template.title}</CardTitle>
                  <CardDescription className="text-sm">{template.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex justify-end">
                    <Button variant="outline" size="sm">
                      <Edit className="mr-2 h-4 w-4" />
                      Modifier
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </a>
          </Link>
        ))}
      </div>
    </div>
  );
}
