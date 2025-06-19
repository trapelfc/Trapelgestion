
'use client';

import { useParams } from 'next/navigation';
import EmailTemplateEditor from '@/app/administration/modeles-mails/components/email-template-editor';
import { TEMPLATE_TYPES } from '@/app/administration/modeles-mails/constants';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

export default function EditEmailTemplatePage() {
  const params = useParams();
  const templateId = params.templateId as string;

  const templateConfig = TEMPLATE_TYPES.find(t => t.id === templateId);

  if (!templateConfig) {
    return (
      <div className="container mx-auto p-4 text-center">
        <div className="mb-6 flex items-center">
            <Button variant="outline" size="icon" asChild className="mr-4">
            <Link href="/administration/modeles-mails">
                <ArrowLeft className="h-4 w-4" />
            </Link>
            </Button>
            <h1 className="text-2xl font-bold">Modèle non trouvé</h1>
        </div>
        <p>Le modèle d'e-mail que vous essayez de modifier n'existe pas.</p>
      </div>
    );
  }

  return (
    <EmailTemplateEditor
      templateId={templateConfig.id}
      title={templateConfig.title}
      description={templateConfig.description}
      subjectKey={templateConfig.subjectKey}
      bodyKey={templateConfig.bodyKey}
      defaultSubject={templateConfig.defaultSubject}
      defaultBody={templateConfig.defaultBody}
    />
  );
}
