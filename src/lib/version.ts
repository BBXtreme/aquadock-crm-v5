// src/lib/version.ts
/* This file defines the application version, which is injected at build 
time via environment variables.
The version is used in the app footer and can also be used for debugging 
or display purposes.
The version is set in the .env file as NEXT_PUBLIC_APP_VERSION and 
defaults to "0.5.19" if not provided.
This allows for easy tracking of the deployed version of the app, 
especially when deployed to platforms like Vercel.
*/
export const APP_VERSION = process.env.NEXT_PUBLIC_APP_VERSION ?? "0.5.20";
