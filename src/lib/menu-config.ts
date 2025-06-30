
export interface SubModule {
  href: string;
  label: string;
}

// Config type without the icon component
export interface ModuleConfigData {
  label: string;
  iconName: string; // Store icon name instead of component
  href: string;
  subModules: SubModule[];
}

// The raw data
export const menuConfigData: ModuleConfigData[] = [
  {
    label: 'Inscription',
    iconName: 'UserPlus',
    href: '/inscription',
    subModules: [
      { href: '/inscription/accueil', label: 'Nouvelle inscription' },
      { href: '/inscription/paiement', label: 'Gérer les paiements' },
      { href: '/inscription/equipement', label: 'Attribuer les équipements' },
      { href: '/inscription/en-cours', label: 'Suivre les inscriptions' },
    ],
  },
  {
    label: 'Stock',
    iconName: 'Archive',
    href: '/stock',
    subModules: [{ href: '/stock', label: 'Voir et gérer le stock' }],
  },
  {
    label: 'Mail',
    iconName: 'Mail',
    href: '/mail',
    subModules: [
      { href: '/mail/en-attente', label: 'Boîte d\'envoi' },
      { href: '/mail/archives', label: 'Mails envoyés (archives)' },
    ],
  },
  {
    label: 'Data',
    iconName: 'Database',
    href: '/data',
    subModules: [
      { href: '/data/annee-en-cours', label: 'Données de l\'année en cours' },
      { href: '/data/annees-anterieures', label: 'Archives des saisons' },
    ],
  },
  {
    label: 'Administration',
    iconName: 'Settings',
    href: '/administration',
    subModules: [
      { href: '/administration/listes', label: 'Gestion des listes' },
      { href: '/administration/import', label: 'Import de données' },
      { href: '/administration/parametres', label: 'Paramètres généraux' },
      { href: '/administration/mail-type', label: 'Modèles de Mails' },
      { href: '/administration/pdf-type', label: 'Modèles de PDF' },
      { href: '/administration/utilisateurs', label: 'Gestion des utilisateurs' },
      { href: '/administration/roles', label: 'Rôles et permissions' },
    ],
  },
];

export const adminListSubmodules: SubModule[] = [
    { href: '/administration/listes/categories-licencies', label: 'Catégories de licenciés' },
    { href: '/administration/listes/packs', label: 'Packs' },
    { href: '/administration/listes/equipements', label: 'Équipements' },
    { href: '/administration/listes/categories', label: 'Catégories d\'équipement' },
]

// Helper function that can be used by the middleware
export function getAllAppRoutes() {
    const allRoutes = new Set<string>();
    menuConfigData.forEach(module => {
        allRoutes.add(module.href);
        module.subModules.forEach(sub => {
            allRoutes.add(sub.href);
        });
    });
    adminListSubmodules.forEach(sub => allRoutes.add(sub.href));
    allRoutes.add('/dashboard');
    return allRoutes;
}
