
import { getLicensees, getLicenseeCategories, getPacks } from "@/lib/actions";
import { InscriptionEnCoursView } from "./view";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export const dynamic = 'force-dynamic';

export default async function InscriptionEnCoursPage() {
  const [licensees, licenseeCategories, packs] = await Promise.all([
    getLicensees(),
    getLicenseeCategories(),
    getPacks()
  ]);

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
        <InscriptionEnCoursView 
            licensees={licensees} 
            licenseeCategories={licenseeCategories} 
            packs={packs}
        />
    </div>
  );
}
