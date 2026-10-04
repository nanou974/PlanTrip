/**
 * Jeu d'icônes PlanTrip — planche 11 « Iconography System ».
 * Ligne simple, grille 24 px, trait 2 px, angles arrondis.
 * Toutes les icônes sont en `currentColor` : leur couleur vient du contexte.
 */

const shapes = {
  // — Navigation —
  home: (
    <>
      <path d="M3.5 10.8 12 4l8.5 6.8" />
      <path d="M5.8 9.6V19.2a.8.8 0 0 0 .8.8H10v-5.2h4V20h3.4a.8.8 0 0 0 .8-.8V9.6" />
    </>
  ),
  grid: (
    <>
      <rect x="3.5" y="3.5" width="7" height="7" rx="1.6" />
      <rect x="13.5" y="3.5" width="7" height="7" rx="1.6" />
      <rect x="3.5" y="13.5" width="7" height="7" rx="1.6" />
      <rect x="13.5" y="13.5" width="7" height="7" rx="1.6" />
    </>
  ),
  map: (
    <>
      <path d="M9 4.5 3.5 6.8v13L9 17.5l6 2.3 5.5-2.3v-13L15 6.8 9 4.5Z" />
      <path d="M9 4.5v13" />
      <path d="M15 6.8v13" />
    </>
  ),
  route: (
    <>
      <circle cx="6" cy="19" r="2.6" />
      <path d="M8.6 19h8.4a3.5 3.5 0 0 0 0-7h-6a3.5 3.5 0 0 1 0-7h6.4" />
      <circle cx="18" cy="5" r="2.6" />
    </>
  ),
  navigation: <path d="m3.5 11 17-7-7 17-2.4-7.6L3.5 11Z" />,
  flag: (
    <>
      <path d="M5.5 21V4" />
      <path d="M5.5 4.5h11l-1.6 3.5 1.6 3.5h-11" />
    </>
  ),
  "arrow-left": (
    <>
      <path d="M19 12H5" />
      <path d="m11 18-6-6 6-6" />
    </>
  ),
  "arrow-right": (
    <>
      <path d="M5 12h14" />
      <path d="m13 6 6 6-6 6" />
    </>
  ),
  "chevron-down": <path d="m6 9.5 6 6 6-6" />,
  "chevron-up": <path d="m6 14.5 6-6 6 6" />,
  "chevron-left": <path d="m14.5 6-6 6 6 6" />,
  "chevron-right": <path d="m9.5 6 6 6-6 6" />,
  menu: (
    <>
      <path d="M4 7h16" />
      <path d="M4 12h16" />
      <path d="M4 17h16" />
    </>
  ),
  close: (
    <>
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </>
  ),
  plus: (
    <>
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </>
  ),
  minus: <path d="M5 12h14" />,
  more: (
    <>
      <circle cx="5" cy="12" r="1.3" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12" r="1.3" fill="currentColor" stroke="none" />
      <circle cx="19" cy="12" r="1.3" fill="currentColor" stroke="none" />
    </>
  ),
  swap: (
    <>
      <path d="M4 8.5h13" />
      <path d="m14 5.5 3 3-3 3" />
      <path d="M20 15.5H7" />
      <path d="m10 12.5-3 3 3 3" />
    </>
  ),
  external: (
    <>
      <path d="M14 4h6v6" />
      <path d="M20 4 11.5 12.5" />
      <path d="M18 14.5V19a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h4.5" />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="6.5" />
      <path d="m20 20-3.7-3.7" />
    </>
  ),
  filter: <path d="M4 5.5h16l-6.2 7.4V19l-3.6-2v-4.1L4 5.5Z" />,
  sort: (
    <>
      <path d="M7 4.5v15" />
      <path d="m4 7.5 3-3 3 3" />
      <path d="M17 19.5v-15" />
      <path d="m14 16.5 3 3 3-3" />
    </>
  ),
  refresh: (
    <>
      <path d="M20.5 12a8.5 8.5 0 1 1-2.6-6.1" />
      <path d="M20.5 4v5h-5" />
    </>
  ),
  share: (
    <>
      <path d="M12 3.5v11" />
      <path d="m8 7.5 4-4 4 4" />
      <path d="M5.5 13v6a1 1 0 0 0 1 1h11a1 1 0 0 0 1-1v-6" />
    </>
  ),
  download: (
    <>
      <path d="M12 3.5v11" />
      <path d="m8 10.5 4 4 4-4" />
      <path d="M5 19.5h14" />
    </>
  ),
  print: (
    <>
      <path d="M7 8.5V4h10v4.5" />
      <path d="M7 17.5H5a1.5 1.5 0 0 1-1.5-1.5v-5A1.5 1.5 0 0 1 5 9.5h14a1.5 1.5 0 0 1 1.5 1.5v5a1.5 1.5 0 0 1-1.5 1.5h-2" />
      <rect x="7" y="14" width="10" height="6.5" rx="1" />
    </>
  ),
  eye: (
    <>
      <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  copy: (
    <>
      <rect x="8.5" y="8.5" width="12" height="12" rx="2" />
      <path d="M5.5 15.5H5A1.5 1.5 0 0 1 3.5 14V5A1.5 1.5 0 0 1 5 3.5h9A1.5 1.5 0 0 1 15.5 5v.5" />
    </>
  ),
  edit: (
    <>
      <path d="M4 20h4L19.5 8.5a2.12 2.12 0 0 0-3-3L5 17v3Z" />
      <path d="m14.5 6.5 3 3" />
    </>
  ),
  trash: (
    <>
      <path d="M4.5 6.5h15" />
      <path d="M9 6.5V4.8A1.3 1.3 0 0 1 10.3 3.5h3.4A1.3 1.3 0 0 1 15 4.8v1.7" />
      <path d="M6.5 6.5 7.3 20a1.5 1.5 0 0 0 1.5 1.4h6.4a1.5 1.5 0 0 0 1.5-1.4l.8-13.5" />
      <path d="M10.5 10.5v6.5" />
      <path d="M13.5 10.5v6.5" />
    </>
  ),

  // — État & retours —
  check: <path d="m5 12.5 4.5 4.5L19 7" />,
  "check-circle": (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="m8.2 12.3 2.6 2.6 5-5.4" />
    </>
  ),
  info: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 11.2v5" />
      <path d="M12 7.9h.01" />
    </>
  ),
  alert: (
    <>
      <path d="M10.7 4.4 2.9 17.7A1.5 1.5 0 0 0 4.2 20h15.6a1.5 1.5 0 0 0 1.3-2.3L13.3 4.4a1.5 1.5 0 0 0-2.6 0Z" />
      <path d="M12 9.6v4" />
      <path d="M12 16.6h.01" />
    </>
  ),
  "alert-circle": (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.8v4.6" />
      <path d="M12 16.2h.01" />
    </>
  ),
  "x-circle": (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="m9 9 6 6" />
      <path d="m15 9-6 6" />
    </>
  ),
  help: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M9.7 9.5a2.4 2.4 0 1 1 3.2 2.3c-.6.3-.9.8-.9 1.5v.4" />
      <path d="M12 16.8h.01" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 1.8" />
    </>
  ),
  inbox: (
    <>
      <path d="M3.5 13.5h4l1.5 3h6l1.5-3h4" />
      <path d="M6.6 4.5h10.8l3.1 9v5a1.5 1.5 0 0 1-1.5 1.5H5a1.5 1.5 0 0 1-1.5-1.5v-5l3.1-9Z" />
    </>
  ),

  // — Voyages & planification —
  suitcase: (
    <>
      <rect x="3" y="7.5" width="18" height="12.5" rx="2.2" />
      <path d="M8.5 7.5V5.8A1.8 1.8 0 0 1 10.3 4h3.4a1.8 1.8 0 0 1 1.8 1.8v1.7" />
      <path d="M3 12.8h18" />
    </>
  ),
  steps: (
    <>
      <path d="M9.5 6H20" />
      <path d="M9.5 12H20" />
      <path d="M9.5 18H20" />
      <circle cx="4.8" cy="6" r="1.4" />
      <circle cx="4.8" cy="12" r="1.4" />
      <circle cx="4.8" cy="18" r="1.4" />
    </>
  ),
  calendar: (
    <>
      <rect x="3.5" y="5" width="17" height="15.5" rx="2.2" />
      <path d="M3.5 9.8h17" />
      <path d="M8 3.2v3.4" />
      <path d="M16 3.2v3.4" />
    </>
  ),
  "calendar-day": (
    <>
      <rect x="3.5" y="5" width="17" height="15.5" rx="2.2" />
      <path d="M3.5 9.8h17" />
      <path d="M8 3.2v3.4" />
      <path d="M16 3.2v3.4" />
      <path d="M8.5 14.2h3" />
    </>
  ),
  tasks: (
    <>
      <rect x="4" y="4" width="16" height="17" rx="2.2" />
      <path d="m7.8 10.2 1.6 1.6 3-3.2" />
      <path d="M7.8 16h8.4" />
    </>
  ),
  checklist: (
    <>
      <rect x="5" y="4.5" width="14" height="16.5" rx="2.2" />
      <path d="M9 4.5V3.3A1.3 1.3 0 0 1 10.3 2h3.4A1.3 1.3 0 0 1 15 3.3v1.2" />
      <path d="m8.3 11 1.3 1.3 2.4-2.6" />
      <path d="M14.2 11.4h2" />
      <path d="m8.3 16.2 1.3 1.3 2.4-2.6" />
      <path d="M14.2 16.6h2" />
    </>
  ),
  note: (
    <>
      <path d="M6 3.5h8l4 4v13H6Z" />
      <path d="M14 3.5v4h4" />
      <path d="M9 12.5h6" />
      <path d="M9 16h4" />
    </>
  ),
  bell: (
    <>
      <path d="M6.5 10a5.5 5.5 0 0 1 11 0c0 4 1.6 5.6 1.6 5.6H4.9S6.5 14 6.5 10Z" />
      <path d="M10 18.6a2.2 2.2 0 0 0 4 0" />
    </>
  ),
  users: (
    <>
      <circle cx="9" cy="8" r="3.6" />
      <path d="M2.5 20a6.5 6.5 0 0 1 13 0" />
      <path d="M16.2 4.8a3.6 3.6 0 0 1 0 6.6" />
      <path d="M17.6 14.4A6.6 6.6 0 0 1 21.5 20" />
    </>
  ),

  // — Véhicules & lieux —
  car: (
    <>
      <path d="M3.4 13.5 5.2 8.2A2 2 0 0 1 7.1 6.8h9.8a2 2 0 0 1 1.9 1.4l1.8 5.3" />
      <rect x="2.6" y="13.5" width="18.8" height="5" rx="1.7" />
      <path d="M6.6 16.1h.02" />
      <path d="M17.4 16.1h.02" />
    </>
  ),
  van: (
    <>
      <path d="M2.5 16.5V7.6a1 1 0 0 1 1-1h9.6v9.9" />
      <path d="M13.1 9.6h3.4l3.9 3.9v3h-1.8" />
      <path d="M6.4 16.5v1.9M17.6 16.5v1.9" />
      <path d="M8.4 18.4h7.2" />
      <path d="M6.4 16.5h11.2" />
      <path d="M2.5 12.6h10.6" />
    </>
  ),
  bike: (
    <>
      <circle cx="6" cy="17" r="3.4" />
      <circle cx="18" cy="17" r="3.4" />
      <path d="m6 17 4.2-7.5h4.6L18 17" />
      <path d="M10.2 9.5h5.2" />
      <path d="m14.4 6.4 2 1.4" />
    </>
  ),
  moto: (
    <>
      <circle cx="5.5" cy="16.5" r="3.6" />
      <circle cx="18.5" cy="16.5" r="3.6" />
      <path d="M5.5 16.5h4l3.4-4.5h4.6" />
      <path d="m12.9 12 2 4.5" />
      <path d="M9.5 8.5h3.6" />
    </>
  ),
  tent: (
    <>
      <path d="m12 4 8.5 16H3.5L12 4Z" />
      <path d="M12 4v16" />
      <path d="m8.4 20 3.6-6.4 3.6 6.4" />
    </>
  ),
  bed: (
    <>
      <path d="M3 19.5v-9" />
      <path d="M3 14.5h18v5" />
      <path d="M6.5 14.5V10h11a3.5 3.5 0 0 1 3.5 3.5v1" />
      <circle cx="8.6" cy="11.8" r="1.7" />
    </>
  ),
  fuel: (
    <>
      <path d="M14 21.5H6a2 2 0 0 1-2-2V4.5a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v17" />
      <path d="M4 11h8" />
      <path d="M14 9h2.5a2 2 0 0 1 2 2v5.5a1.75 1.75 0 0 0 3.5 0V9.6L19.5 6.5" />
    </>
  ),
  utensils: (
    <>
      <path d="M5 3v6a3 3 0 0 0 6 0V3" />
      <path d="M8 12v9" />
      <path d="M17 3c-1.7 1.8-2.5 3.7-2.5 6 0 1.7.8 2.7 2.5 3.1V21" />
    </>
  ),
  coffee: (
    <>
      <path d="M4 8.5h12v5.5a4.5 4.5 0 0 1-4.5 4.5h-3A4.5 4.5 0 0 1 4 14V8.5Z" />
      <path d="M16 10h1.6a2.5 2.5 0 0 1 0 5H16" />
      <path d="M7.5 3v2.4" />
      <path d="M11.5 3v2.4" />
    </>
  ),
  parking: (
    <>
      <rect x="3.5" y="3.5" width="17" height="17" rx="4" />
      <path d="M9.6 17V7.5h3.1a3.1 3.1 0 0 1 0 6.2H9.6" />
    </>
  ),
  pin: (
    <>
      <path d="M12 21.2s7-5.7 7-11.2a7 7 0 1 0-14 0c0 5.5 7 11.2 7 11.2Z" />
      <circle cx="12" cy="10" r="2.6" />
    </>
  ),
  plane: <path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2Z" />,
  train: (
    <>
      <rect x="5" y="3.5" width="14" height="13" rx="3.2" />
      <path d="M5 11h14" />
      <path d="M9 16.5 7 21" />
      <path d="m15 16.5 2 4.5" />
      <path d="M8.8 14h.02" />
      <path d="M15.2 14h.02" />
      <path d="M7.5 20h9" />
    </>
  ),
  boat: (
    <>
      <path d="M3 18.5c1.5 0 2.5 1 4.5 1s3-1 4.5-1 3 1 4.5 1 3-1 4.5-1" />
      <path d="M5.2 15.5 6.6 9h10.8l1.4 6.5" />
      <path d="M12 9V3.5" />
      <path d="M8.6 6.4 12 3.4l3.4 3" />
    </>
  ),
  address: (
    <>
      <path d="M4 10.5 12 4.2l8 6.3" />
      <path d="M6.2 9.6V19a.8.8 0 0 0 .8.8h3.2v-4.6h3.6v4.6H17a.8.8 0 0 0 .8-.8V9.6" />
    </>
  ),
  camera: (
    <>
      <rect x="3" y="7.5" width="18" height="13" rx="2.5" />
      <circle cx="12" cy="14" r="3.6" />
      <path d="M8.6 7.5 10 4.5h4l1.4 3" />
    </>
  ),

  // — Budget —
  wallet: (
    <>
      <path d="M3.5 8A2.5 2.5 0 0 1 6 5.5h11A1.5 1.5 0 0 1 18.5 7v1" />
      <rect x="3.5" y="8" width="17" height="11" rx="2.5" />
      <path d="M16.4 13.5h1.8" />
    </>
  ),
  receipt: (
    <>
      <path d="M6 3.5h12v17l-2.4-1.4L13.2 20.5l-2.4-1.4L8.4 20.5 6 19.1V3.5Z" />
      <path d="M9 8.5h6" />
      <path d="M9 12.5h6" />
    </>
  ),
  "chart-bar": (
    <>
      <path d="M4 20.2h16" />
      <rect x="5.4" y="12" width="3.6" height="6" rx="1.2" />
      <rect x="10.6" y="8" width="3.6" height="10" rx="1.2" />
      <rect x="15.8" y="4.6" width="3.6" height="13.4" rx="1.2" />
    </>
  ),
  "chart-donut": (
    <>
      <path d="M12 3.5a8.5 8.5 0 1 0 8.5 8.5H12V3.5Z" />
      <path d="M15.2 3.9A8.5 8.5 0 0 1 20.1 8.8H15.2V3.9Z" />
    </>
  ),
  target: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <circle cx="12" cy="12" r="5" />
      <circle cx="12" cy="12" r="1.6" />
    </>
  ),
  euro: (
    <>
      <path d="M17.2 6.6A6.6 6.6 0 0 0 7.6 12a6.6 6.6 0 0 0 9.6 5.4" />
      <path d="M4.5 10.4h8.2" />
      <path d="M4.5 13.6h8.2" />
    </>
  ),
  "trend-up": (
    <>
      <path d="M4 17.5 10 11l3.4 3.4L20 7.4" />
      <path d="M15 7.4h5v5" />
    </>
  ),

  // — Comptes & paramètres —
  user: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4.5 20.2a7.5 7.5 0 0 1 15 0" />
    </>
  ),
  settings: (
    <>
      <circle cx="12" cy="12" r="3.2" />
      <path d="M12 2.6v3" />
      <path d="M12 18.4v3" />
      <path d="M21.4 12h-3" />
      <path d="M5.6 12h-3" />
      <path d="m18.6 5.4-2.1 2.1" />
      <path d="m7.5 16.5-2.1 2.1" />
      <path d="m18.6 18.6-2.1-2.1" />
      <path d="m7.5 7.5-2.1-2.1" />
    </>
  ),
  shield: (
    <>
      <path d="M12 3.4 5.2 5.9v6.1c0 4.2 2.8 7.6 6.8 8.6 4-1 6.8-4.4 6.8-8.6V5.9L12 3.4Z" />
      <path d="m9.2 12.1 2.1 2.1 4-4.3" />
    </>
  ),
  lock: (
    <>
      <rect x="4.5" y="10" width="15" height="10.5" rx="2.2" />
      <path d="M8 10V7.6a4 4 0 0 1 8 0V10" />
    </>
  ),

  // — Documents —
  "id-card": (
    <>
      <rect x="3" y="5" width="18" height="14" rx="2.5" />
      <circle cx="9" cy="10.8" r="2.2" />
      <path d="M5.9 16.4a3.7 3.7 0 0 1 6.2 0" />
      <path d="M15 10.4h3.4" />
      <path d="M15 14h3.4" />
    </>
  ),
  ticket: (
    <>
      <path d="M3.5 8.4V6a2 2 0 0 1 2-2H8" />
      <path d="M16 4h2.5a2 2 0 0 1 2 2v2.4" />
      <path d="M20.5 15.6V18a2 2 0 0 1-2 2H16" />
      <path d="M8 20H5.5a2 2 0 0 1-2-2v-2.4" />
      <path d="M7.5 12h9" />
    </>
  ),
  umbrella: (
    <>
      <path d="M12 3.5v1.8" />
      <path d="M3.5 12.6a8.5 8.5 0 0 1 17 0c0 1.1-.8 1.9-1.8 1.9H5.3c-1 0-1.8-.8-1.8-1.9Z" />
      <path d="M12 14.5v4a2 2 0 0 0 4 0" />
    </>
  ),

  // — Météo —
  sun: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2.6v2.6" />
      <path d="M12 18.8v2.6" />
      <path d="M21.4 12h-2.6" />
      <path d="M5.2 12H2.6" />
      <path d="m18.6 5.4-1.9 1.9" />
      <path d="m7.3 16.7-1.9 1.9" />
      <path d="m18.6 18.6-1.9-1.9" />
      <path d="m7.3 7.3-1.9-1.9" />
    </>
  ),
  cloud: <path d="M7.2 18.5A4.6 4.6 0 0 1 7.6 9.4a5.6 5.6 0 0 1 10.6 1.4 3.9 3.9 0 0 1-.5 7.7H7.2Z" />,
  rain: (
    <>
      <path d="M7.2 15.4A4.6 4.6 0 0 1 7.6 6.3a5.6 5.6 0 0 1 10.6 1.4 3.9 3.9 0 0 1-.5 7.7H7.2Z" />
      <path d="M8.6 18v2.4" />
      <path d="M12 18.6v2.4" />
      <path d="M15.4 18v2.4" />
    </>
  ),
  snow: (
    <>
      <path d="M7.2 15.4A4.6 4.6 0 0 1 7.6 6.3a5.6 5.6 0 0 1 10.6 1.4 3.9 3.9 0 0 1-.5 7.7H7.2Z" />
      <path d="M8.4 18.8h.02" />
      <path d="M12 20.4h.02" />
      <path d="M15.6 18.8h.02" />
    </>
  ),
  wind: (
    <>
      <path d="M3.5 8.5h10a3 3 0 1 0-3-3" />
      <path d="M3.5 12.5h13.5a3 3 0 1 1-3 3" />
      <path d="M3.5 16.5h6.5" />
    </>
  ),

  // — Divers —
  star: <path d="m12 3.8 2.6 5.3 5.8.8-4.2 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8L3.6 9.9l5.8-.8L12 3.8Z" />,
  heart: <path d="M12 20.2s-7.6-4.8-7.6-9.7A4.4 4.4 0 0 1 12 7.5a4.4 4.4 0 0 1 7.6 3c0 4.9-7.6 9.7-7.6 9.7Z" />,
  globe: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M3.5 12h17" />
      <path d="M12 3.5c2.2 2.4 3.3 5.3 3.3 8.5S14.2 18.1 12 20.5c-2.2-2.4-3.3-5.3-3.3-8.5S9.8 5.9 12 3.5Z" />
    </>
  ),
  compass: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="m15.6 8.4-2.1 5.1-5.1 2.1 2.1-5.1 5.1-2.1Z" />
    </>
  ),
  phone: <path d="M6.6 3.5h3l1.5 4-2 1.5a12.4 12.4 0 0 0 5.9 5.9l1.5-2 4 1.5v3a2 2 0 0 1-2.2 2A17.6 17.6 0 0 1 4.6 5.7a2 2 0 0 1 2-2.2Z" />,
  mail: (
    <>
      <rect x="3" y="5" width="18" height="14" rx="2.2" />
      <path d="m3.6 7 8.4 5.8L20.4 7" />
    </>
  ),
  book: (
    <>
      <path d="M4 5.2A1.7 1.7 0 0 1 5.7 3.5H11v16H5.7A1.7 1.7 0 0 0 4 21.2V5.2Z" />
      <path d="M20 5.2A1.7 1.7 0 0 0 18.3 3.5H13v16h5.3a1.7 1.7 0 0 1 1.7 1.7V5.2Z" />
    </>
  ),
  sparkle: (
    <>
      <path d="M12 3.5 13.6 9l5.4 1.6-5.4 1.6L12 17.6l-1.6-5.4L5 10.6 10.4 9 12 3.5Z" />
      <path d="M18.5 16.5 19.2 18.6 21.3 19.3 19.2 20 18.5 22.1 17.8 20 15.7 19.3 17.8 18.6 18.5 16.5Z" />
    </>
  ),
}

export function Icon({ name, size = 24, className = "", strokeWidth = 2, ...rest }) {
  const shape = shapes[name]
  if (!shape) {
    if (import.meta.env.DEV) console.warn(`[Icon] icône inconnue : "${name}"`)
    return null
  }
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className={className}
      {...rest}
    >
      {shape}
    </svg>
  )
}
