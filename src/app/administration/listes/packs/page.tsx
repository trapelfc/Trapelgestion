
import { getPacks, getEquipements } from "@/lib/actions";
import { PacksView } from "./view";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export const dynamic = 'force-dynamic';

export default async function PacksPage() {
    const packs = await getPacks();
    const equipements = await getEquipements();

    return (
        <div className="container mx-auto p-4 md:p-6 lg:p-8">
            <div className="mb-6">
                <Button asChild variant="outline">
                    <Link href="/administration/listes">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Retour
                    </Link>
                </Button>
            </div>
            <PacksView packs={packs} equipements={equipements} />
        </div>
    );
}
