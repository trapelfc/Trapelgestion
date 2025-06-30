
import { getLicenseeCategories, getPacks } from "@/lib/actions";
import { AccueilInscriptionView } from "./view";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export const dynamic = 'force-dynamic';

export default async function AccueilInscriptionPage() {
  const licenseeCategories = await getLicenseeCategories();
  const packs = await getPacks();

  return (
    <div className="container mx-auto p-4 md:p-6 lg:p-8">
        <div className="mb-6">
            <Button asChild variant="outline">
                <Link href="/inscription">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Retour
                </Link>
            </Button>
        </div>
        <AccueilInscriptionView licenseeCategories={licenseeCategories} packs={packs} />
    </div>
  );
}
