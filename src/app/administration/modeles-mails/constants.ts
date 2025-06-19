
// src/app/administration/modeles-mails/constants.ts

export const EMAIL_TEMPLATE_PAYMENT_CONFIRMATION_SUBJECT_KEY = 'TRAPEL_FC_EMAIL_TEMPLATE_PAYMENT_CONFIRMATION_SUBJECT';
export const EMAIL_TEMPLATE_PAYMENT_CONFIRMATION_BODY_KEY = 'TRAPEL_FC_EMAIL_TEMPLATE_PAYMENT_CONFIRMATION_BODY';
export const EMAIL_TEMPLATE_EQUIPMENT_CONFIRMATION_SUBJECT_KEY = 'TRAPEL_FC_EMAIL_TEMPLATE_EQUIPMENT_CONFIRMATION_SUBJECT';
export const EMAIL_TEMPLATE_EQUIPMENT_CONFIRMATION_BODY_KEY = 'TRAPEL_FC_EMAIL_TEMPLATE_EQUIPMENT_CONFIRMATION_BODY';
export const EMAIL_TEMPLATE_EQUIPMENT_INCOMPLETE_SUBJECT_KEY = 'TRAPEL_FC_EMAIL_TEMPLATE_EQUIPMENT_INCOMPLETE_SUBJECT';
export const EMAIL_TEMPLATE_EQUIPMENT_INCOMPLETE_BODY_KEY = 'TRAPEL_FC_EMAIL_TEMPLATE_EQUIPMENT_INCOMPLETE_BODY';
export const EMAIL_TEMPLATE_PLANNING_SUBJECT_KEY = 'TRAPEL_FC_EMAIL_TEMPLATE_PLANNING_SUBJECT';
export const EMAIL_TEMPLATE_PLANNING_BODY_KEY = 'TRAPEL_FC_EMAIL_TEMPLATE_PLANNING_BODY';
export const EMAIL_TEMPLATE_SUPPLIER_ORDER_SUBJECT_KEY = 'TRAPEL_FC_EMAIL_TEMPLATE_SUPPLIER_ORDER_SUBJECT';
export const EMAIL_TEMPLATE_SUPPLIER_ORDER_BODY_KEY = 'TRAPEL_FC_EMAIL_TEMPLATE_SUPPLIER_ORDER_BODY';
export const EMAIL_TEMPLATE_RECAP_SESSION_COMMANDE_SUBJECT_KEY = 'TRAPEL_FC_EMAIL_TEMPLATE_RECAP_SESSION_COMMANDE_SUBJECT';
export const EMAIL_TEMPLATE_RECAP_SESSION_COMMANDE_BODY_KEY = 'TRAPEL_FC_EMAIL_TEMPLATE_RECAP_SESSION_COMMANDE_BODY';
export const EMAIL_TEMPLATE_EQUIPMENT_ORDER_SUBJECT_KEY = 'TRAPEL_FC_EMAIL_TEMPLATE_EQUIPMENT_ORDER_SUBJECT';
export const EMAIL_TEMPLATE_EQUIPMENT_ORDER_BODY_KEY = 'TRAPEL_FC_EMAIL_TEMPLATE_EQUIPMENT_ORDER_BODY';
// Clés pour le nouveau modèle
export const EMAIL_TEMPLATE_NEW_MEMBER_SUBJECT_KEY = 'TRAPEL_FC_EMAIL_TEMPLATE_NEW_MEMBER_SUBJECT';
export const EMAIL_TEMPLATE_NEW_MEMBER_BODY_KEY = 'TRAPEL_FC_EMAIL_TEMPLATE_NEW_MEMBER_BODY';


export const DEFAULT_PAYMENT_SUBJECT = "Confirmation d'inscription et de paiement - {{PRENOM_LICENCIE}} {{NOM_LICENCIE}}";
export const DEFAULT_PAYMENT_BODY = `
TRAPEL FOOTBALL CLUB
{{ADRESSE_CLUB}}
N° Affiliation FFF : {{NUMERO_AFFILIATION_FFF}}

ATTESTATION DE PAIEMENT

Je soussigné(e), {{NOM_PRESIDENT_CLUB}}, agissant en qualité de Président(e) du TRAPEL FOOTBALL CLUB, certifie par la présente que :

{{PRENOM_LICENCIE}} {{NOM_LICENCIE}}
Né(e) le : {{DATE_NAISSANCE_LICENCIE}}
Catégorie : {{CATEGORIE_LICENCIE}}

A bien réglé la somme de {{MONTANT_PAYE_TOTAL}}€ correspondant à sa licence sportive pour la saison {{SAISON_ACTUELLE}} (Pack: "{{PACK_CHOISI}}", dont le montant initial était de {{MONTANT_PACK_ORIGINAL_VALEUR}}€).

Date du paiement : {{DATE_PAIEMENT}}
Méthode de paiement : {{METHODE_PAIEMENT}}

Cette attestation est délivrée pour servir et valoir ce que de droit.

Fait à {{VILLE_CLUB}}, le {{DATE_AUJOURDHUI}}.

Signature
{{NOM_PRESIDENT_CLUB}}
Président(e) du TRAPEL FOOTBALL CLUB
`.trim();

export const DEFAULT_EQUIPMENT_SUBJECT = "Confirmation de remise d'équipement - {{PRENOM_LICENCIE}} {{NOM_LICENCIE}}";
export const DEFAULT_EQUIPMENT_BODY = `
Bonjour {{PRENOM_LICENCIE}} {{NOM_LICENCIE}},

Nous vous confirmons la remise de votre équipement pour le pack "{{PACK_CHOISI}}" :

{{LISTE_EQUIPEMENTS}}

Nous vous souhaitons une excellente saison !

Sportivement,
Le Trapel FC.
`.trim();

export const DEFAULT_EQUIPMENT_INCOMPLETE_SUBJECT = "Information sur votre équipement - {{PRENOM_LICENCIE}} {{NOM_LICENCIE}}";
export const DEFAULT_EQUIPMENT_INCOMPLETE_BODY = `
Bonjour {{PRENOM_LICENCIE}} {{NOM_LICENCIE}},

Suite à votre inscription et au choix de votre pack "{{PACK_CHOISI}}", voici le détail de votre équipement :

{{LISTE_EQUIPEMENTS}}

Certains articles sont actuellement en attente en raison d'une rupture de stock. Nous vous contacterons dès qu'ils seront disponibles.

Merci de votre compréhension.

Sportivement,
Le Trapel FC.
`.trim();

export const DEFAULT_PLANNING_SUBJECT = "Plannification des {{TYPE_EVENEMENTS}} du TRAPEL FC en compétition du {{PERIODE_PLANNING}}";
export const DEFAULT_PLANNING_BODY = `
Bonjour,

Vous trouverez ci-dessous l'occupation des terrains pour les {{TYPE_EVENEMENTS}} en compétition du TRAPEL FC pour {{PERIODE_PLANNING}}.

{{PLANNING_CONTENT}}

Nous vous remercions pour toute l'attention que vous porterez à ces informations ainsi que pour votre implication pour le bien des jeunes de vos territoires.

Bien cordialement,

SIGNATURE
`.trim();

export const DEFAULT_SUPPLIER_ORDER_SUBJECT = "Commande du Trapel FC - {{NOM_FOURNISSEUR}} - {{DATE_COMMANDE}}";
export const DEFAULT_SUPPLIER_ORDER_BODY = `
Bonjour {{NOM_FOURNISSEUR}},

Veuillez trouver ci-dessous notre commande pour le Trapel FC, datée du {{DATE_COMMANDE}}.

Articles commandés :
{{LISTE_ARTICLES_COMMANDE}}

Merci de nous confirmer la réception et la disponibilité.

Cordialement,
Le Trapel FC.
`.trim();

export const DEFAULT_RECAP_SESSION_COMMANDE_SUBJECT = "Récapitulatif de la Session de Commande pour {{PERIODE_PLANNING}}";
export const DEFAULT_RECAP_SESSION_COMMANDE_BODY = `
Bonjour,

Voici le récapitulatif détaillé de la session de commande pour {{PERIODE_PLANNING}}:

{{LISTE_COMMANDES_DETAIL_SESSION}}

Cordialement,
Le Trapel FC.
`.trim();

export const DEFAULT_EQUIPMENT_ORDER_SUBJECT = "Nouvelle Commande d'Équipement - Trapel FC - {{DATE_COMMANDE}}";
export const DEFAULT_EQUIPMENT_ORDER_BODY = `
Bonjour,

Veuillez trouver ci-dessous notre commande d'équipement pour le Trapel FC, datée du {{DATE_COMMANDE}}.

Articles commandés :
{{LISTE_ARTICLES_COMMANDE_EQUIPEMENT}}

Merci de nous tenir informés de la disponibilité et des délais.

Cordialement,
Le Trapel FC.
`.trim();

// Contenu par défaut pour le nouveau modèle
export const DEFAULT_NEW_MEMBER_SUBJECT = "Bienvenue au Trapel FC - Vos identifiants de connexion";
export const DEFAULT_NEW_MEMBER_BODY = `
Bonjour {{NOM_MEMBRE}},

Bienvenue dans l'équipe de gestion du Trapel FC !
Voici vos identifiants pour accéder à l'application de gestion du club :

Login : {{LOGIN}}
Rôle : {{ROLE}}
Mot de passe : {{MOT_DE_PASSE}}

Attention : Ce mot de passe est fourni à titre indicatif. Pour des raisons de sécurité, nous vous recommandons de le modifier lors de votre première connexion si une fonctionnalité de changement de mot de passe est disponible.

Cordialement,
L'équipe du Trapel FC.
`.trim();

export const ALL_PLACEHOLDERS = [
  { name: '{{PRENOM_LICENCIE}}', desc: 'Prénom du licencié' },
  { name: '{{NOM_LICENCIE}}', desc: 'Nom du licencié' },
  { name: '{{EMAIL_LICENCIE}}', desc: 'Email du licencié' },
  { name: '{{DATE_NAISSANCE_LICENCIE}}', desc: 'Date de naissance du licencié (jj/mm/aaaa)' },
  { name: '{{CATEGORIE_LICENCIE}}', desc: 'Catégorie du licencié' },
  { name: '{{PACK_CHOISI}}', desc: 'Nom du pack choisi' },
  { name: '{{MONTANT_DU}}', desc: 'Montant total dû (après réductions, avant paiements)' },
  { name: '{{MONTANT_PAYE_TOTAL}}', desc: 'Montant total effectivement payé par le licencié' },
  { name: '{{METHODE_PAIEMENT}}', desc: 'Méthode de paiement utilisée' },
  { name: '{{DATE_PAIEMENT}}', desc: 'Date du paiement (jj/mm/aaaa)' },
  { name: '{{NOM_RESPONSABLE}}', desc: 'Nom du responsable légal (si applicable)' },
  { name: '{{PRENOM_RESPONSABLE}}', desc: 'Prénom du responsable légal (si applicable)' },
  { name: '{{EMAIL_RESPONSABLE}}', desc: 'Email du responsable légal (si applicable)' },
  { name: '{{LISTE_EQUIPEMENTS}}', desc: 'Liste des équipements attribués (détaille fournis/en attente si applicable)' },
  { name: '{{PLANNING_CONTENT}}', desc: 'Contenu généré du planning des stades' },
  { name: '{{PERIODE_PLANNING}}', desc: 'Période du planning/commande (ex: le weekend du X et Y mai)' },
  { name: '{{DATE_DEBUT_PLANNING}}', desc: 'Date de début du planning (jj/mm/aaaa)' },
  { name: '{{DATE_FIN_PLANNING}}', desc: 'Date de fin du planning (jj/mm/aaaa)' },
  { name: '{{TYPE_EVENEMENTS}}', desc: 'Type d\'événements (matchs, entrainements, etc.)' },
  { name: '{{NOM_FOURNISSEUR}}', desc: 'Nom du fournisseur' },
  { name: '{{LISTE_ARTICLES_COMMANDE}}', desc: 'Liste des articles commandés au fournisseur' },
  { name: '{{DATE_COMMANDE}}', desc: 'Date de la commande (jj/mm/aaaa)' },
  { name: '{{LISTE_COMMANDES_DETAIL_SESSION}}', desc: 'Liste détaillée des commandes d\'une session' },
  { name: '{{LISTE_ARTICLES_COMMANDE_EQUIPEMENT}}', desc: 'Liste des articles d\'équipement commandés' },
  { name: '{{SAISON_ACTUELLE}}', desc: 'Saison en cours (ex: 2023-2024)' },
  { name: '{{DATE_AUJOURDHUI}}', desc: 'Date du jour de la génération (jj/mm/aaaa)' },
  { name: '{{ADRESSE_CLUB}}', desc: 'Adresse du siège social du club' },
  { name: '{{NUMERO_AFFILIATION_FFF}}', desc: 'Numéro d\'affiliation FFF du club' },
  { name: '{{NOM_PRESIDENT_CLUB}}', desc: 'Nom et prénom du président(e) du club' },
  { name: '{{VILLE_CLUB}}', desc: 'Ville où le document est fait (généralement ville du siège)' },
  { name: '{{MONTANT_PACK_ORIGINAL_VALEUR}}', desc: 'Montant de base du pack choisi par le licencié' },
  // Nouveaux placeholders pour le membre
  { name: '{{NOM_MEMBRE}}', desc: 'Nom complet (ou login) du nouveau membre' },
  { name: '{{LOGIN}}', desc: 'Login du nouveau membre' },
  { name: '{{ROLE}}', desc: 'Rôle attribué au nouveau membre' },
  { name: '{{MOT_DE_PASSE}}', desc: 'Mot de passe du nouveau membre (non sécurisé pour la production)' },
].sort((a, b) => a.name.localeCompare(b.name));

export const TEMPLATE_TYPES = [
  {
    id: 'payment-confirmation',
    title: 'Confirmation de Paiement',
    description: "E-mail envoyé après la validation d'un paiement. Sert aussi d'attestation.",
    subjectKey: EMAIL_TEMPLATE_PAYMENT_CONFIRMATION_SUBJECT_KEY,
    bodyKey: EMAIL_TEMPLATE_PAYMENT_CONFIRMATION_BODY_KEY,
    defaultSubject: DEFAULT_PAYMENT_SUBJECT,
    defaultBody: DEFAULT_PAYMENT_BODY,
  },
  {
    id: 'equipment-confirmation',
    title: 'Confirmation d\'Équipement (Complet)',
    description: "E-mail envoyé après l'attribution complète de l'équipement.",
    subjectKey: EMAIL_TEMPLATE_EQUIPMENT_CONFIRMATION_SUBJECT_KEY,
    bodyKey: EMAIL_TEMPLATE_EQUIPMENT_CONFIRMATION_BODY_KEY,
    defaultSubject: DEFAULT_EQUIPMENT_SUBJECT,
    defaultBody: DEFAULT_EQUIPMENT_BODY,
  },
  {
    id: 'equipment-incomplete',
    title: 'Équipement Incomplet (Rupture)',
    description: "E-mail si des équipements sont en attente (rupture de stock).",
    subjectKey: EMAIL_TEMPLATE_EQUIPMENT_INCOMPLETE_SUBJECT_KEY,
    bodyKey: EMAIL_TEMPLATE_EQUIPMENT_INCOMPLETE_BODY_KEY,
    defaultSubject: DEFAULT_EQUIPMENT_INCOMPLETE_SUBJECT,
    defaultBody: DEFAULT_EQUIPMENT_INCOMPLETE_BODY,
  },
  {
    id: 'planning',
    title: 'Planning des Stades',
    description: "E-mail pour l'envoi du planning d'occupation des stades.",
    subjectKey: EMAIL_TEMPLATE_PLANNING_SUBJECT_KEY,
    bodyKey: EMAIL_TEMPLATE_PLANNING_BODY_KEY,
    defaultSubject: DEFAULT_PLANNING_SUBJECT,
    defaultBody: DEFAULT_PLANNING_BODY,
  },
  {
    id: 'supplier-order',
    title: 'Commande Fournisseur (Nourriture/Boissons)',
    description: "Modèle pour passer commande aux fournisseurs de nourriture/boissons.",
    subjectKey: EMAIL_TEMPLATE_SUPPLIER_ORDER_SUBJECT_KEY,
    bodyKey: EMAIL_TEMPLATE_SUPPLIER_ORDER_BODY_KEY,
    defaultSubject: DEFAULT_SUPPLIER_ORDER_SUBJECT,
    defaultBody: DEFAULT_SUPPLIER_ORDER_BODY,
  },
  {
    id: 'recap-session-commande',
    title: 'Récapitulatif Session Commande (Nourriture/Boissons)',
    description: "E-mail récapitulatif détaillé d'une session de commande de nourriture/boissons.",
    subjectKey: EMAIL_TEMPLATE_RECAP_SESSION_COMMANDE_SUBJECT_KEY,
    bodyKey: EMAIL_TEMPLATE_RECAP_SESSION_COMMANDE_BODY_KEY,
    defaultSubject: DEFAULT_RECAP_SESSION_COMMANDE_SUBJECT,
    defaultBody: DEFAULT_RECAP_SESSION_COMMANDE_BODY,
  },
  {
    id: 'equipment-order',
    title: 'Commande d\'Équipement',
    description: "Modèle pour les commandes générales d'équipement.",
    subjectKey: EMAIL_TEMPLATE_EQUIPMENT_ORDER_SUBJECT_KEY,
    bodyKey: EMAIL_TEMPLATE_EQUIPMENT_ORDER_BODY_KEY,
    defaultSubject: DEFAULT_EQUIPMENT_ORDER_SUBJECT,
    defaultBody: DEFAULT_EQUIPMENT_ORDER_BODY,
  },
  { // Ajout du nouveau modèle
    id: 'new-member-credentials',
    title: 'Identifiants Nouveau Membre',
    description: "E-mail envoyé à un nouveau membre avec ses informations de connexion.",
    subjectKey: EMAIL_TEMPLATE_NEW_MEMBER_SUBJECT_KEY,
    bodyKey: EMAIL_TEMPLATE_NEW_MEMBER_BODY_KEY,
    defaultSubject: DEFAULT_NEW_MEMBER_SUBJECT,
    defaultBody: DEFAULT_NEW_MEMBER_BODY,
  },
].sort((a, b) => a.title.localeCompare(b.title));
