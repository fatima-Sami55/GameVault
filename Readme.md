# Game Store Application

A database-driven e-commerce web application for video games. This platform enables users to browse titles, manage shopping carts, and place orders through simulated payment processing. It includes a comprehensive administration console for managing inventory, viewing stats, promoting user accounts, and managing game uploads.

## Core Features

- **Authentication & Authorization**: Secure signup, login, and role-based access control (Customers vs. Administrators) with bcrypt password hashing and session management.
- **Registration Security**: Enforced registration password constraints validated on both the frontend and backend:
  - Length must be between 8 and 25 characters.
  - Must contain at least one uppercase letter, one lowercase letter, one number, and one special symbol.
  - Real-time password strength meter (Weak/Medium/Strong visual tracker) and confirm password matching validation on signup.
    
- **Game Catalog**: Browsing, filtering, and responsive coming-soon catalogs.
  
- **Cart & Order Lifecycle**: Real-time cart calculations, checkout processing, order logs, and simulated credit card validation.
  
- **Admin Console**: Unified dashboard displaying key registration stats, product inventory controls (adding, editing, deleting items), and promotion of users to administrators.
- **Cloudinary Image Hosting**: Integrated Cloudinary hosting for game images. Uploads are handled in the cloud instead of local directories:
  - Automatic cleanup destroys old Cloudinary image assets when an administrator replaces a product image or deletes a product.
- **Security & Validation**: Form validation, input sanitization, and Helmet-based security headers.

## Tech Stack

- **Frontend**: HTML5, Vanilla CSS, JavaScript (ES6), EJS templating.
- **Backend**: Node.js, Express.js.
- **Database**: Microsoft SQL Server (MSSQL) using the tedious driver.
- **Cloud Storage**: Cloudinary (Image uploads).
- **Security**: bcrypt password hashing, Express sessions, Helmet CSP headers.

## Local Development Setup

### Prerequisites

- Node.js (v18.0.0 or later)
- Microsoft SQL Server instance

### Setup Steps

1. **Clone the Repository**:
   ```bash
   git clone <repository-url>
   cd GamerZone
   ```

2. **Install Dependencies**:
   ```bash
   npm install
   ```

3. **Configure Environment Variables**:
   Create a `.env` file in the root directory based on `.env.example` and supply your credentials:
   ```env
   PORT=3000
   SESSION_SECRET=your-session-secret-key
   
   # Database Configuration
   DB_SERVER=your-sql-server.database.windows.net
   DB_PORT=1433
   DB_NAME=GameArena
   DB_USER=your_db_username
   DB_PASSWORD=your_db_password
   
   # Cloudinary Configuration
   CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
   CLOUDINARY_API_KEY=your_cloudinary_api_key
   CLOUDINARY_API_SECRET=your_cloudinary_api_secret
   ```

4. **Initialize the Database**:
   Run the SQL scripts provided in the repository (`database/schema.sql`) inside your SQL Server instance to create the necessary tables, relationships, and triggers.

5. **Start the Application**:
   ```bash
   npm start
   ```
   Open `http://localhost:3000` in your web browser.

## Deployment

### Vercel Serverless Hosting

The codebase contains a `vercel.json` configuration file to run Express.js as serverless functions.
1. Install the Vercel CLI: `npm i -g vercel`.
2. Link your project and deploy: `vercel`.
3. Configure environment variables in the Vercel dashboard.

### Microsoft Azure App Service

The application contains Web.config rules to run on IIS and Node.js on Azure.
1. Connect your repository to Azure App Service deployment center.
2. Define environment variables under Application Settings.
3. Configure Azure SQL Database connection firewall rules.
