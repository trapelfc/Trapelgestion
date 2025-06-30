
import { getLicensees, getPacks, getEquipements, getCategories, getStock } from "@/lib/actions";
import { EquipementInscriptionView } from "./view";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export const dynamic = 'force-dynamic';

export default async function EquipementInscriptionPage() {
  const [licensees, packs, equipements, categories, stock] = await Promise.all([
    getLicensees(),
    getPacks(),
    getEquipements(),
    getCategories(),
    getStock()
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
        <EquipementInscriptionView 
            licensees={licensees} 
            packs={packs} 
            equipements={equipements}
            categories={categories}
            stock={stock}
        />
    </div>
  );
}
