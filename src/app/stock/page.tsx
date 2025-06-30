
import { getEquipements, getCategories, getLicensees, getStock, getSettings, getPdfTemplates } from "@/lib/actions";
import { StockView } from "./view";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export const dynamic = 'force-dynamic';

export default async function StockPage() {
    const [equipements, categories, licensees, stock, settings, pdfTemplates] = await Promise.all([
        getEquipements(),
        getCategories(),
        getLicensees(),
        getStock(),
        getSettings(),
        getPdfTemplates(),
    ]);

    return (
        <div className="container mx-auto p-4 md:p-6 lg:p-8">
            <div className="mb-6">
                <Button asChild variant="outline">
                    <Link href="/dashboard">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Retour
                    </Link>
                </Button>
            </div>
            <StockView 
                equipements={equipements} 
                categories={categories}
                licensees={licensees}
                initialStock={stock}
                settings={settings}
                pdfTemplates={pdfTemplates}
            />
        </div>
    );
}
