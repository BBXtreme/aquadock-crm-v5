// src/lib/version.ts
/* 
AquaDock CRM Version Management
  
This file defines the current application version.
The version is injected at build time via the environment variable 
NEXT_PUBLIC_APP_VERSION and falls back to a default.
  
=== How to update version (recommended workflow) ===
 
1. Before starting a new phase or after significant changes:
Run this exact Aider prompt:
     
In this file: Update app version to 0.5.21
Only edit src/lib/version.ts
Change APP_VERSION default to the new version number (semantic versioning: 0.5.21).

2. After the edit, rebuild and test:
pnpm build

3. Commit with clear message:
git commit -m "chore: bump version to 0.5.21"

4. Deploy (Vercel will pick up the new version automatically).

Benefits:
- Easy to see which version is running in production (check footer)
- Clear history in git

Versioning strategy:
- 0.5.x = current development series (UI/UX + data handling improvements)
- Next major: 0.6.0 when auth + real-time subscriptions are added
*/

export const APP_VERSION = process.env.NEXT_PUBLIC_APP_VERSION ?? "0.5.32";
