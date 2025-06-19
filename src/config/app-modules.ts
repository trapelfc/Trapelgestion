
// src/config/app-modules.ts

export interface AppModule {
  id: string; // Le chemin complet de la route
  label: string; // Le nom affichable
  adminOnly?: boolean; // Si true, l'administrateur doit toujours y avoir accès
}

// Liste exhaustive de toutes les routes accessibles et gérables par permissions
export const APP_MODULES: AppModule[] = [
  // Modules Principaux
  { id: "/", label: "Accueil / Menu Principal" },
  { id: "/planning", label: "Planning (Module Principal)" },
  { id: "/inscription", label: "Inscriptions (Module Principal)" },
  { id: "/stock", label: "Gestion des Stocks (Module Principal)" },
  { id: "/data", label: "Data (Module Principal)" },
  { id: "/mails", label: "Mails (Module Principal)" },
  { id: "/commande", label: "Commande (Module Principal)" },
  { id: "/administration", label: "Administration (Module Principal)", adminOnly: true },

  // Sous-modules de Planning
  { id: "/planning/occupation-stades", label: "Planning - Occupation des Stades" },
  { id: "/planning/occupation-annexe", label: "Planning - Occupation Annexe" },

  // Sous-modules d'Inscription
  { id: "/inscription/nouveau-licencie", label: "Inscriptions - Gestion des Licenciés" },
  { id: "/inscription/paiement", label: "Inscriptions - Paiements" },
  { id: "/inscription/equipement", label: "Inscriptions - Equipement" },
  { id: "/inscription/accueil-invite", label: "Inscriptions - Accueil Invité" },

  // Sous-modules de Stock
  { id: "/stock/equipement", label: "Stock - Équipement" },
  { id: "/stock/nourriture-boissons", label: "Stock - Nourriture & Boissons" },
  // { id: "/stock/sportif", label: "Stock - Matériel Sportif" }, // Supprimé

  // Sous-modules de Data
  { id: "/data/paiement", label: "Data - Paiements" },
  { id: "/data/equipement", label: "Data - Equipement" },
  { id: "/data/nourriture-boissons", label: "Data - Nourriture & Boissons (Archives)" },
  { id: "/data/mail", label: "Data - Mail (Historique)" },
  
  // Sous-modules de Commande
  { id: "/commande/equipement", label: "Commande - Equipement (Menu)"},
  { id: "/commande/equipement/nouvelle-commande", label: "Commande - Equipement - Nouvelle Commande"},
  { id: "/commande/equipement/rupture-stock", label: "Commande - Equipement - Rupture Stock"},
  { id: "/commande/nourriture-boissons", label: "Commande - Nourriture & Boissons (Menu)"},
  { id: "/commande/nourriture-boissons/nouvelle-commande", label: "Commande - Nourriture & Boissons - Nouvelle Session"},
  { id: "/commande/nourriture-boissons/recapitulatif-fournisseurs", label: "Commande - Nourriture & Boissons - Récap. Fournisseurs"},
  { id: "/commande/nourriture-boissons/types", label: "Commande - Nourriture & Boissons - Gérer Modèles"},

  // Sous-modules d'Administration
  { id: "/administration/gestion-listes", label: "Administration - Gestion des Listes (Menu)", adminOnly: true },
  { id: "/administration/gestion-listes/categories-licencies", label: "Administration - Listes - Catégories Licenciés", adminOnly: true },
  { id: "/administration/gestion-listes/packs-licencies", label: "Administration - Listes - Packs Licenciés", adminOnly: true },
  { id: "/administration/gestion-listes/tailles-vetements", label: "Administration - Listes - Tailles Vêtements", adminOnly: true },
  { id: "/administration/gestion-listes/tailles-chaussettes", label: "Administration - Listes - Tailles Chaussettes", adminOnly: true },
  { id: "/administration/gestion-listes/lieux-stock-nourriture", label: "Administration - Listes - Lieux Stock Nourriture", adminOnly: true },
  { id: "/administration/gestion-listes/fournisseurs-nourriture", label: "Administration - Listes - Fournisseurs Nourriture", adminOnly: true },
  { id: "/administration/gestion-listes/articles-stock", label: "Administration - Listes - Définitions Articles Stock", adminOnly: true },
  { id: "/administration/gestion-listes/listes-nourriture-boissons", label: "Administration - Listes - Articles Spécifiques Nourriture", adminOnly: true },
  { id: "/administration/gestion-listes/unites-stades", label: "Administration - Listes - Unités Stades", adminOnly: true },
  { id: "/administration/gestion-listes/annexes", label: "Administration - Listes - Annexes (Planning)", adminOnly: true },
  
  { id: "/administration/parametre", label: "Administration - Paramètres", adminOnly: true },
  { id: "/administration/modeles-mails", label: "Administration - Modèles d'E-mails (Menu)", adminOnly: true },
  { id: "/administration/modeles-mails/edit/[templateId]", label: "Administration - Modèles d'E-mails - Édition", adminOnly: true }, 
  { id: "/administration/documents", label: "Administration - Documents Officiels", adminOnly: true },
  { id: "/administration/droits-acces", label: "Administration - Droits et Accès", adminOnly: true },
  { id: "/administration/gestion-membres", label: "Administration - Gestion des Membres", adminOnly: true },
].sort((a,b) => a.label.localeCompare(b.label));

