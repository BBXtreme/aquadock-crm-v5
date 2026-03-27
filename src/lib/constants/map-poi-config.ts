// This file defines the categories of points of interest (POIs) that are relevant for the application.  src/lib/constants/map-poi-config.ts
export const poiCategories = {
  restaurant: {
    icon: "🍽️",
    name: "Restaurant / Café / Bar",
    tags: ["restaurant", "cafe", "bar", "pub", "biergarten"],
  },
  camping: {
    icon: "🏕️",
    name: "Camping",
    tags: ["camp_site", "caravan_site"],
  },
  marina: {
    icon: "⚓",
    name: "Marina / Harbor",
    tags: ["marina", "harbor", "port"],
  },
  boat: {
    icon: "⛵",
    name: "Boat Rental / Shop",
    tags: ["boat_rental", "shop=boat", "shop=marine"],
  },
  hotel: {
    icon: "🏨",
    name: "Hotel / Hostel / Guest House",
    tags: ["hotel", "hostel", "guest_house"],
  },
  resort: {
    icon: "🌴",
    name: "Resort / Beach",
    tags: ["resort", "beach", "beach_resort"],
  },
  sailing: {
    icon: "⛵",
    name: "Sailing School / Yacht Club",
    tags: ["sailing", "sailing_school", "yacht_club", "sailing_club", "boat_club"],
  },
  rowing: {
    icon: "🚣",
    name: "Ruderclub / Rowing",
    tags: ["rowing", "rowing_club", "sport=rowing"],
  },
  club: {
    icon: "🏛️",
    name: "Vereine / Sports Club",
    tags: ["club", "sports_club", "leisure=club", "leisure=sports_centre"],
  },
  ferry: {
    icon: "⛴️",
    name: "Fähre / Ferry Terminal",
    tags: ["ferry_terminal"],
  },
  tourism: {
    icon: "🏛️",
    name: "Tourismus / Attraktion",
    tags: ["tourism=attraction", "tourism=museum", "tourism=artwork"],
  },
} as const;
