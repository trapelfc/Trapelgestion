
import { getPdfTemplates } from "@/lib/actions";
import { PdfTypeView } from "./view";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export const dynamic = 'force-dynamic';

export default async function PdfTypePage() {
  const templates = await getPdfTemplates();

  return (
    <div className="container mx-auto p-4 md:p-6 lg:p-8">
      <div className="mb-6">
        <Button asChild variant="outline">
          <Link href="/administration">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Retour
          </Link>
        </Button>
      </div>
      <PdfTypeView initialTemplates={templates} />
    </div>
  );
}
