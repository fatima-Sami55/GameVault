# GameVault

A database-driven e-commerce web application for video games. Users can browse titles, manage a shopping cart, and complete checkout with simulated payment processing. Administrators get a unified console for inventory and user management.

## Features

- **Authentication & roles** — Signup, login, bcrypt hashing, session-based auth, customer vs admin roles
- **Game catalog** — Browse, filter, sort, and coming-soon highlights on the home page
- **Cart & orders** — Real-time cart totals, checkout, order history, simulated card validation
- **Admin console** — Dashboard stats, add/edit/delete products, user role management
- **Security** — Helmet CSP headers, password validation, input checks, secure session cookies in production

## Tech Stack

- **Frontend:** EJS, Vanilla CSS, JavaScript
- **Backend:** Node.js, Express 5
- **Database:** Microsoft SQL Server (Azure SQL compatible)

## Prerequisites

- Node.js 18+
- SQL Server or Azure SQL Database

## Local Setup

1. **Clone and install**
   ```bash
   git clone <repository-url>
   cd GamerZone
   npm install
   ```

2. **Environment**
   ```bash
   cp .env.example .env
   ```
   Fill in your database credentials and a `SESSION_SECRET`.

3. **Database**
   - Fresh install: run `database/schema.sql` in SQL Server Management Studio or Azure Data Studio
   - Existing Azure deployment: use `database/azure_deploy.sql` for table-only setup
   - Seed demo data (optional):
     ```bash
     npm run seed
     ```

4. **Run**
   ```bash
   npm run dev    # development with nodemon
   npm start      # production-style start
   ```
   Open [http://localhost:3000](http://localhost:3000)

## Production Checklist

| Variable | Required | Notes |
|---|---|---|
| `NODE_ENV` | Yes | Set to `production` |
| `SESSION_SECRET` | Yes | Long random string |
| `DB_SERVER`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` | Yes | Azure SQL credentials |
| `DB_TRUST_SERVER_CERT` | No | Leave unset/`false` on Azure SQL |
| `PORT` | No | Defaults to `3000`; Azure sets this automatically |

Uploaded product images are stored in `public/uploads/` at runtime and are **not** committed to git. Ensure that folder is writable on your host.

## Deployment

### Azure App Service

The repo includes `web.config` for IIS/iisnode and a GitHub Actions workflow (`.github/workflows/main_gamevault.yml`).

1. Connect the repository to Azure Deployment Center
2. Add environment variables under **Configuration → Application settings**
3. Allow Azure App Service outbound IPs in your SQL firewall rules

### Vercel

A `vercel.json` is included for serverless deployment. Set the same environment variables in the Vercel dashboard. Note: file uploads to `public/uploads/` are ephemeral on serverless hosts — use blob storage for production file uploads on Vercel.

## Project Structure

```
├── database/          # DB connection, schema SQL, seed script
├── middleware/        # Auth guards
├── public/            # Static assets (css, js, images, uploads)
├── routes/            # Express route modules
├── utils/             # Shared helpers
├── views/             # EJS templates
├── main.js            # App entry point
└── web.config         # Azure IIS config
```

## License

See [LICENSE](LICENSE).
