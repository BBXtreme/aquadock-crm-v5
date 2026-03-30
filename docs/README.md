# AquaDock CRM v5

A modern, full-stack CRM application built with Next.js 16, Supabase, and React 19.

## Features

- **Company Management**: Create, edit, and track companies with detailed information
- **Contact Management**: Manage contacts associated with companies
- **Interactive Map (OpenMap)**: Visualize companies and import OSM POIs
- **Reminders & Tasks**: Schedule and track follow-ups
- **Email Integration**: Send emails with templates
- **Timeline**: Activity logging and history
- **Dashboard**: KPIs and statistics with period filtering
- **Mass Email**: Bulk email sending with templates
- **Settings**: User preferences and SMTP configuration

## Tech Stack

- **Frontend**: Next.js 16 (App Router), React 19, Tailwind CSS 4.2.2
- **Backend**: Supabase (PostgreSQL, Auth, RLS)
- **UI**: shadcn/ui (Radix primitives), Lucide icons
- **State**: TanStack React Query 5.x with Suspense
- **Mapping**: Leaflet, OpenStreetMap
- **Linting**: Biome 2.4.9+
- **TypeScript**: Strict mode

## Architecture Highlights

- **Server Components by default** with client components only where needed
- **Suspense for data loading** with `useSuspenseQuery`
- **Service layer** for all database operations
- **DTOs and validations** for type safety
- **RLS enforced** on all tables
- **No null assertions** – safe display utilities
- **Error boundaries** and centralized error handling

## Getting Started

1. Clone the repository
2. Install dependencies: `pnpm install`
3. Set up Supabase project and configure environment variables
4. Run database migrations
5. Start development server: `pnpm dev`

## Documentation

- [Architecture Overview](docs/architecture.md)
- [Supabase Schema](docs/SUPABASE_SCHEMA.md)
- [OpenMap Documentation](docs/README_OpenMap.md)
- [React Table Patterns](docs/react-table-v8-ts-tricks.md)
- [Aider Rules](docs/AIDER-RULES.md)
- [Aider Conventions](docs/aider.conventions.md)

## Scripts

- `pnpm dev` - Start development server
- `pnpm build` - Build for production
- `pnpm start` - Start production server
- `pnpm typecheck` - Run TypeScript type checking
- `pnpm check:fix` - Run Biome linting and formatting
- `pnpm db:generate` - Generate Supabase types

## Contributing

Follow the rules in `docs/AIDER-RULES.md` and `docs/aider.conventions.md`. All changes must pass `pnpm typecheck` and `pnpm check:fix` with zero errors.

Built with ❤️ at Waterfront Beach • 2026
