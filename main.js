  // Safety net: log async errors instead of crashing the process (e.g. if the
  // database is unreachable and a stray promise rejects).
  process.on('unhandledRejection', (reason) => {
    console.error('⚠️ Unhandled promise rejection:', reason);
  });
  process.on('uncaughtException', (err) => {
    console.error('⚠️ Uncaught exception:', err.message);
  });

  require('dotenv').config();

  const express = require('express');
  const path = require('path');
  const bodyParser = require('body-parser');
  const session = require('cookie-session');
  const helmet = require('helmet');
  const { redirectWithFlash } = require('./utils/flash');

  const isProduction = process.env.NODE_ENV === 'production';
  const sessionSecret = process.env.SESSION_SECRET;

  if (isProduction && !sessionSecret) {
    console.error('FATAL: SESSION_SECRET must be set when NODE_ENV=production');
    process.exit(1);
  }

  const app = express();
  global.db = require('./database/db');

  const PORT = process.env.PORT || 3000;

  if (isProduction) {
    app.set('trust proxy', 1);
  }

  app.set('view engine', 'ejs');
  app.set('views', path.join(__dirname, 'views'));

  app.use(express.static(path.join(__dirname, 'public')));
  app.use(bodyParser.urlencoded({ extended: true }));
  app.use(bodyParser.json());

  app.use(session({
    name: 'session',
    keys: [sessionSecret || 'dev-only-insecure-secret'],
    maxAge: 24 * 60 * 60 * 1000,
    secure: isProduction,
    httpOnly: true,
    sameSite: 'lax'
  }));

  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: [
          "'self'",
          "'unsafe-inline'",
          'https://fonts.googleapis.com',
          'https://cdnjs.cloudflare.com'
        ],
        fontSrc: [
          "'self'",
          'https://fonts.gstatic.com',
          'https://cdnjs.cloudflare.com'
        ],
        imgSrc: ["'self'", 'data:', 'https:'],
        connectSrc: ["'self'"]
      }
    }
  }));

  app.use('/uploads', express.static(path.join(__dirname, 'public', 'uploads')));

  const { pool, poolConnect } = global.db;

  async function getComingSoonGames() {
    await poolConnect;
    if (!pool.connected) {
      console.warn('⚠️ Database is offline. Skipping coming-soon games query.');
      return [];
    }
    const result = await pool.request().query(`
      SELECT name, description, price, genre, img
      FROM product
      WHERE status = 'coming-soon'
      ORDER BY pid DESC
    `);
    return result.recordset.map((g) => ({
      title: g.name,
      genre: g.genre,
      price: `$${Number(g.price).toFixed(2)}`,
      image: g.img.startsWith('http') ? g.img : `/uploads/${g.img}`,
      description: g.description
    }));
  }

  async function renderHome(req, res) {
    let games = [];
    try {
      games = await getComingSoonGames();
    } catch (err) {
      console.error('Error loading coming-soon games:', err);
    }
    res.render('home', { user: req.session.user || null, games });
  }

  app.get('/home', renderHome);

  const authRoutes = require('./routes/auth/auth');
  const gameRoutes = require('./routes/game/game');
  const cartRoutes = require('./routes/cart/cart');
  const orderRoutes = require('./routes/order/order.js');
  const paymentRoutes = require('./routes/payment/payment.js');
  const supportRoute = require('./routes/support/support');

  app.use('/', authRoutes);
  app.use('/games', gameRoutes);
  app.use('/cart', cartRoutes);
  app.use('/order', orderRoutes);
  app.use('/payment', paymentRoutes);
  app.use('/support', supportRoute);

  app.get('/', renderHome);

  app.use((req, res) => {
    if (req.method === 'GET' && req.accepts('html')) {
      return redirectWithFlash(res, '/', 'That page could not be found.', 'error');
    }
    res.status(404).json({ error: 'Not found' });
  });

  if (!process.env.VERCEL) {
    app.listen(PORT, () => {
      console.log(`✅ Server is running on http://localhost:${PORT}`);
    });
  }

  module.exports = app;
