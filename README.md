# Personal Finance App

This is a monorepo for a personal finance application, built with Turborepo, Next.js, Expo, Prisma, and Supabase.

## What's inside?

This Turborepo includes the following packages and apps:

### Apps and Packages

- `apps/web`: a [Next.js](https://nextjs.org/) app with `shadcn/ui` and Tailwind CSS.
- `apps/api`: a [Next.js](https://nextjs.org/) app for API routes using Prisma and Supabase.
- `apps/mobile`: an [Expo](https://expo.dev/) app.
- `packages/ui`: a shared React component library used by `web` and `mobile` apps.
- `packages/db`: Prisma schema and client for the database.
- `packages/types`: Zod schemas and shared types.
- `packages/eslint-config`: `eslint` configurations (includes `eslint-config-next` and `eslint-config-prettier`).
- `packages/typescript-config`: `tsconfig.json`s used throughout the monorepo.

### Setup

1.  **Install dependencies:**
    ```bash
    npm install
    ```

2.  **Set up your environment variables:**
    -   Create a `.env` file at the root of the monorepo (`personal-finance-app/.env`).
    -   You'll need a Supabase project for the database and authentication.
    -   Obtain API keys for price fetching (e.g., Finnhub, Alpha Vantage) if you plan to use real data.
    -   Add the following variables to your `.env` file:

        ```
        # Supabase
        DATABASE_URL="postgresql://postgres:[YOUR_PASSWORD]@db.[YOUR_SUPABASE_PROJECT_REF].supabase.co:5432/postgres"
        NEXT_PUBLIC_SUPABASE_URL="https://[YOUR_SUPABASE_PROJECT_REF].supabase.co"
        NEXT_PUBLIC_SUPABASE_ANON_KEY="[YOUR_SUPABASE_ANON_KEY]"

        # API Keys (for price fetching, FX rates)
        FINNHUB_API_KEY="[YOUR_FINNHUB_API_KEY]"
        ALPHA_VANTAGE_API_KEY="[YOUR_ALPHA_VANTAGE_API_KEY]"
        # Add other API keys as needed
        ```

3.  **Push the database schema:**
    ```bash
    npm run db:push
    ```
    This will create the tables in your Supabase database based on `packages/db/prisma/schema.prisma`.

4.  **Seed the database:**
    ```bash
    npm run db:seed
    ```
    This will populate your database with initial data (currencies, categories, accounts, mock transactions, and holdings).

### Development

To run the web app and API in development mode concurrently:

```bash
npm run dev
```

This will start the Next.js web app (usually on `http://localhost:3000`) and the Next.js API routes.

To run the mobile app in development mode:

```bash
npm run dev:mobile
```

This will start the Expo development server. You can then use the Expo Go app on your phone or an emulator to view the mobile app.

### API Endpoints

The `apps/api` project exposes the following API endpoints:

-   `GET /api/dashboard/summary`: Get dashboard summary data.
-   `GET/POST/PUT/DELETE /api/accounts`: CRUD operations for accounts.
-   `GET/POST/PUT/DELETE /api/categories`: CRUD operations for categories.
-   `GET/POST/PUT/DELETE /api/transactions`: CRUD operations for transactions (includes FX conversion on POST/PUT).
-   `GET/POST/PUT/DELETE /api/holdings`: CRUD operations for stock holdings.
-   `GET /api/prices?symbols=...`: Fetch and cache stock prices.
-   `GET/POST /api/settings`: Get/Update user settings.
-   `POST /api/fx/refresh`: Manually trigger FX rate refresh (cron-safe).
-   `GET/POST/PUT/DELETE /api/tasks`: CRUD operations for tasks.

### Project Structure

-   `apps/`: Contains individual applications (`web`, `api`, `mobile`).
-   `packages/`: Contains shared code and configurations (`ui`, `db`, `types`, `eslint-config`, `typescript-config`).

### Security Notes

-   Environment variables are used for sensitive API keys.
-   API routes include basic RLS-like checks using a dummy user ID for now. In a production environment, integrate with Supabase Auth to get the actual user session.

### Future Enhancements

-   Full Supabase Auth integration.
-   Real-time FX rate and stock price fetching.
-   Comprehensive unit and E2E tests.
-   More sophisticated UI/UX for all apps.
-   Advanced reporting and analytics.