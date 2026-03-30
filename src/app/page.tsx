// src/app/page.tsx
// This is the main entry point for the application, representing the home page.
// It uses Next.js's redirect function to immediately redirect users to the /companies page.
// This allows us to have a clean URL structure and direct users to the main functionality of the app without needing a separate landing page.

import { redirect } from "next/navigation";

export default function Home() {
  redirect("/companies");
}
