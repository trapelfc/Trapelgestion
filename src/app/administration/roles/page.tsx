
import { getRoles } from "@/lib/actions";
import { menuConfigData, adminListSubmodules } from "@/lib/menu-config";
import { RolesView } from "./view";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import type { SerializableModuleConfig, SerializableSubModule } from "@/lib/types";

export const dynamic = 'force-dynamic';

export default async function RolesPage() {
    const roles = await getRoles();
    
    const serializableModules: SerializableModuleConfig[] = menuConfigData.map(({ iconName, ...rest }) => rest);

    // Manually add the list submodules to the "Gestion des listes" module for the view
    const adminModule = serializableModules.find(m => m.href === '/administration');
    if (adminModule) {
        const listSubModule = adminModule.subModules.find(sm => sm.href === '/administration/listes');
        if (listSubModule) {
            // This relies on the SerializableSubModule type allowing an optional subModules array.
            listSubModule.subModules = adminListSubmodules;
        }
    }

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
            <RolesView initialRoles={roles} modulesConfig={serializableModules} />
        </div>
    );
}
