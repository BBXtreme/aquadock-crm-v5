// src/lib/constants/index.ts
// This file serves as a central export point for all constants used throughout the application.
// It re-exports constants from various files, such as map status colors, wassertyp options and mappings, and kundentyp options.
// This allows other parts of the app to import all constants from a single location, improving maintainability and organization.
// By consolidating exports in this file, we can easily manage and update constants without having to change import paths across the app.

export * from "./kundentyp";
export * from "./map-poi-config";
export * from "./map-status-colors";
export * from "./wassertyp";
