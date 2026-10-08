/**
 * Contrôles de sécurité avant le départ, selon le véhicule.
 *
 * Repères généraux, à compléter par la notice du véhicule. Les obligations légales citées viennent de
 * Justice.fr (équipements obligatoires de la voiture) et de la loi Montagne (équipements hiver) ;
 * les autres lignes sont des bonnes pratiques usuelles.
 *
 * Fonctions pures : aucune dépendance au réseau ni à React.
 */

export const SAFETY_SOURCE = {
  label: 'Justice.fr — équipements obligatoires de la voiture',
  url: 'https://www.justice.fr/fiche/equipements-obligatoires-voiture-gilet-securite-triangle',
}

const TYRES = {
  id: 'tyres',
  title: 'Pneus',
  items: [
    'Pression : contrôlez-la à froid (avant de rouler, ou après moins de 3 km) avec la valeur du constructeur, indiquée sur l’étiquette (montant de porte ou trappe à carburant) ou dans la notice. Utilisez la valeur « pleine charge » si le véhicule est chargé.',
    'État : ni coupure, ni hernie, ni fissure ; sculpture d’au moins 1,6 mm. Rouler avec des pneus en mauvais état est interdit.',
    'Roue de secours ou kit anti-crevaison, cric et clé de roue : recommandés, vérifiez qu’ils sont à bord et en état (y compris la pression de la roue de secours).',
    'Montagne : du 1er novembre au 31 mars, dans les zones signalées par les panneaux B58 et B59, il faut des pneus hiver ou 4 saisons marqués 3PMSF sur les 4 roues, ou des chaînes / chaussettes à neige certifiées dans le véhicule. Sinon : 135 € d’amende et immobilisation.',
  ],
}

const FLUIDS_BRAKES = {
  id: 'fluids',
  title: 'Niveaux et freinage',
  items: [
    'Niveaux : huile moteur, liquide de refroidissement, liquide de freins et lave-glace.',
    'Freins : pédale ferme, pas de bruit ni de vibration. En cas de doute, faites contrôler les plaquettes avant un long trajet.',
    'Batterie : démarrage franc, bornes propres et serrées.',
  ],
}

const LIGHTS = {
  id: 'lights',
  title: 'Feux et visibilité',
  items: [
    'Feux : croisement, route, position, stop, clignotants, antibrouillard arrière et plaque. Une ampoule défaillante se remplace immédiatement : emportez un jeu d’ampoules de rechange.',
    'Essuie-glaces en bon état, pare-brise, vitres et rétroviseurs propres.',
  ],
}

const REQUIRED_CAR = {
  id: 'required',
  title: 'Équipements et papiers',
  items: [
    'Gilet de haute visibilité (marquage CE) à portée de main, à enfiler avant de sortir du véhicule arrêté sur la route.',
    'Triangle de présignalisation homologué, à poser au moins 30 m derrière le véhicule s’il est un danger, sauf si c’est dangereux pour vous.',
    'Permis de conduire, carte grise et attestation d’assurance à bord.',
  ],
}

const LOAD_CAR = {
  id: 'load',
  title: 'Chargement et passagers',
  items: [
    'Répartissez la charge (le plus lourd en bas, au plus près de l’essieu) et arrimez-la ; ne dépassez pas le PTAC de la carte grise. Rien de lourd sur la plage arrière.',
    'Ceinture pour tous, sièges enfants adaptés et bien fixés, animaux attachés ou en caisse.',
    'Reposé avant de partir : en cas de fatigue, arrêtez-vous sans attendre la prochaine pause prévue.',
  ],
}

const HABITATION = {
  id: 'habitation',
  title: 'Vie à bord',
  items: [
    'Pesez le véhicule chargé (eau, gaz, bagages, passagers) sur un pont-bascule et comparez au PTAC ; vérifiez aussi la hauteur totale avec les accessoires (échelle, porte-vélos, panneaux solaires).',
    'Selon la notice, fermez l’arrivée de gaz avant de rouler (le réfrigérateur peut passer sur 12 V) et vérifiez l’absence d’odeur de gaz.',
    'Rentrez le marchepied, l’antenne et le store ; fermez lanterneaux, fenêtres et placards ; calez ou verrouillez tout ce qui peut bouger.',
    'Détecteur de gaz ou de monoxyde de carbone et extincteur : recommandés, vérifiez qu’ils fonctionnent et que leur date n’est pas dépassée.',
  ],
}

const MOTO = [
  {
    id: 'rider',
    title: 'Équipement du pilote',
    items: [
      'Casque homologué, jugulaire attachée ; gants certifiés CE (obligatoires). Blouson, pantalon et bottes avec protections : fortement recommandés.',
      'Gilet de haute visibilité et tenue de pluie à portée de main.',
      'Permis, carte grise et attestation d’assurance à bord.',
    ],
  },
  {
    id: 'moto-machine',
    title: 'Moto',
    items: [
      'Pneus : pression à froid selon la notice (valeur avec passager ou bagages si besoin), absence de coupure et sculpture d’au moins 1,6 mm.',
      'Chaîne : tension et graissage (ou courroie / cardan selon le modèle). Freins : plaquettes et niveau du liquide.',
      'Niveaux : huile et liquide de refroidissement. Feux et clignotants : tous en état.',
      'Bagages arrimés et répartis, sans dépasser la charge maximale indiquée par le constructeur.',
    ],
  },
]

const BIKE = [
  {
    id: 'bike-machine',
    title: 'Vélo',
    items: [
      'Freins : garnitures et câbles en bon état. Pneus : pression indiquée sur le flanc du pneu, sans coupure.',
      'Chaîne propre et graissée, roues bien serrées, rayons intacts.',
      'Éclairage avant (blanc ou jaune) et arrière (rouge), catadioptres et sonnette : obligatoires.',
      'Kit de réparation : chambre à air, rustines, démonte-pneus, pompe. Antivol et eau.',
    ],
  },
  {
    id: 'cyclist',
    title: 'Équipement du cycliste',
    items: [
      'Casque : obligatoire pour les moins de 12 ans, recommandé pour tous.',
      'Gilet rétro-réfléchissant : obligatoire hors agglomération la nuit ou par visibilité insuffisante.',
    ],
  },
]

const CAR_BASE = [TYRES, FLUIDS_BRAKES, LIGHTS, REQUIRED_CAR, LOAD_CAR]

const BY_VEHICLE = {
  voiture: CAR_BASE,
  'voiture-sans-permis': CAR_BASE,
  'camping-car': [...CAR_BASE, HABITATION],
  van: [...CAR_BASE, HABITATION],
  moto: MOTO,
  velo: BIKE,
}

/** Groupes de contrôles pour un véhicule (`[]` si le véhicule est inconnu). */
export function safetyChecksFor(slug) {
  return BY_VEHICLE[slug] ? BY_VEHICLE[slug].map((g) => ({ ...g, items: [...g.items] })) : []
}
