# Poly Roly

This project was generated using [Angular CLI](https://github.com/angular/angular-cli) version 21.2.12.

## UI stack

The application uses PrimeNG with the Aura preset and Tailwind CSS v4 with the official `tailwindcss-primeui` integration. Tailwind utilities are loaded through `src/tailwind.css`.

## Supabase authentication

Create a Supabase project, enable Email authentication, then create a local runtime config:

```bash
cp public/supabase-config.example.js public/supabase-config.js
```

Add the Project URL and publishable key to `public/supabase-config.js`. This file is ignored by Git. Only use the publishable key in the Angular application. Never expose a Supabase secret or service-role key in frontend code.

Apply the included migration through the Supabase SQL editor or CLI:

```text
supabase/migrations/20260604112000_create_profiles.sql
```

The migration creates `public.profiles`, enables Row Level Security, and automatically creates a profile row after registration.

Apply `supabase/migrations/20260604123000_create_saved_trades.sql` to enable each authenticated user to save and delete up to 20 Polymarket links.

Apply `supabase/migrations/20260605210000_create_polymarket_profiles.sql` to enable each authenticated user to connect one personal Polymarket profile to their Poly Roly account.

Apply `supabase/migrations/20260606190000_create_saved_traders.sql` to enable each authenticated user to follow up to 20 Polymarket trader addresses.

## Deployment

Pushes to `master` deploy the application to [GitHub Pages](https://fishtheflip.github.io/polymarket-ang/). Configure the `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY` repository secrets before deploying.

## Development server

To start a local development server, run:

```bash
ng serve
```

Once the server is running, open your browser and navigate to `http://localhost:4200/`. The application will automatically reload whenever you modify any of the source files.

## Code scaffolding

Angular CLI includes powerful code scaffolding tools. To generate a new component, run:

```bash
ng generate component component-name
```

For a complete list of available schematics (such as `components`, `directives`, or `pipes`), run:

```bash
ng generate --help
```

## Building

To build the project run:

```bash
ng build
```

This will compile your project and store the build artifacts in the `dist/` directory. By default, the production build optimizes your application for performance and speed.

## Running unit tests

To execute unit tests with the [Vitest](https://vitest.dev/) test runner, use the following command:

```bash
ng test
```

## Running end-to-end tests

For end-to-end (e2e) testing, run:

```bash
ng e2e
```

Angular CLI does not come with an end-to-end testing framework by default. You can choose one that suits your needs.

## Additional Resources

For more information on using the Angular CLI, including detailed command references, visit the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.
