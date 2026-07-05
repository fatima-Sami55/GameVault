/**
 * Seed GameVault database with realistic dummy data.
 * Usage: node database/seed.js
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const { pool, sql } = require('./db');

const UPLOADS_DIR = path.join(__dirname, '..', 'public', 'uploads');
const IMAGES_DIR = path.join(__dirname, '..', 'public', 'images');

const SEED_USERS = [
  { name: 'Alex Rivera', email: 'alex@gamevault.demo', password: 'Demo1234!', phone: '03001234567', role: 'user' },
  { name: 'Jordan Lee', email: 'jordan@gamevault.demo', password: 'Demo1234!', phone: '03007654321', role: 'user' },
  { name: 'Admin User', email: 'admin@gamevault.demo', password: 'Admin1234!', phone: '03009998877', role: 'admin' }
];

const SEED_PRODUCTS = [
  { name: 'Neon Vice', description: 'Open-world action in a sprawling neon city.', price: 59.99, genre: 'Action', status: 'available', src: 'gta6_rec.jpg' },
  { name: 'Cyber Nexus', description: 'Futuristic RPG with deep character customization.', price: 49.99, genre: 'RPG', status: 'available', src: 'cyberpunk_rec.jpg' },
  { name: 'Arena Legends', description: 'Competitive multiplayer strategy battles.', price: 39.99, genre: 'Strategy', status: 'available', src: 'fifa_rec.jpg' },
  { name: 'Web Runner', description: 'Fast-paced action adventure through a living city.', price: 59.99, genre: 'Action', status: 'available', src: 'spiderman_rec.jpg' },
  { name: 'Mythic Odyssey', description: 'Epic mythological action RPG with brutal combat.', price: 69.99, genre: 'RPG', status: 'available', src: 'kratos_rec.jpg' },
  { name: 'Shadow Creed', description: 'Stealth action set in feudal landscapes.', price: 69.99, genre: 'Adventure', status: 'available', src: 'ac_rec.jpg' },
  { name: 'Android Dreams', description: 'Narrative-driven sci-fi adventure.', price: 44.99, genre: 'Adventure', status: 'available', src: 'detroit_rec.jpg' },
  { name: 'Frontier Tales', description: 'Western open-world epic with rich storytelling.', price: 54.99, genre: 'Adventure', status: 'available', src: 'rdr2_rec.jpg' },
  { name: 'Starfall Protocol', description: 'Upcoming space exploration RPG.', price: 59.99, genre: 'RPG', status: 'coming-soon', src: 'cyberpunk_3d.png' },
  { name: 'Iron Dominion', description: 'Upcoming mech combat strategy title.', price: 49.99, genre: 'Strategy', status: 'coming-soon', src: 'gta6_action_3d.png' }
];

function ensureUploadsDir() {
  if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  }
}

function copySeedImage(srcFilename) {
  const src = path.join(IMAGES_DIR, srcFilename);
  const destName = `seed_${srcFilename}`;
  const dest = path.join(UPLOADS_DIR, destName);
  if (fs.existsSync(src) && !fs.existsSync(dest)) {
    fs.copyFileSync(src, dest);
  }
  return destName;
}

async function seedUsers() {
  for (const u of SEED_USERS) {
    const existing = await pool.request()
      .input('email', sql.VarChar(100), u.email)
      .query('SELECT uuid FROM users WHERE email = @email');

    if (existing.recordset.length) {
      console.log(`  skip user (exists): ${u.email}`);
      continue;
    }

    const hash = await bcrypt.hash(u.password, 10);
    await pool.request()
      .input('uuid', sql.UniqueIdentifier, uuidv4())
      .input('name', sql.VarChar(100), u.name)
      .input('email', sql.VarChar(100), u.email)
      .input('password', sql.VarChar(200), hash)
      .input('phone_number', sql.VarChar(15), u.phone)
      .input('role', sql.VarChar(20), u.role)
      .query(`
        INSERT INTO users (uuid, name, email, password, phone_number, role)
        VALUES (@uuid, @name, @email, @password, @phone_number, @role)
      `);
    console.log(`  + user: ${u.email} (${u.role})`);
  }
}

async function seedProducts() {
  ensureUploadsDir();

  for (const p of SEED_PRODUCTS) {
    const existing = await pool.request()
      .input('name', sql.NVarChar(255), p.name)
      .query('SELECT pid FROM product WHERE name = @name');

    if (existing.recordset.length) {
      console.log(`  skip product (exists): ${p.name}`);
      continue;
    }

    const img = copySeedImage(p.src);
    await pool.request()
      .input('name', sql.NVarChar(255), p.name)
      .input('description', sql.NVarChar(sql.MAX), p.description)
      .input('price', sql.Decimal(10, 2), p.price)
      .input('genre', sql.NVarChar(100), p.genre)
      .input('status', sql.NVarChar(50), p.status)
      .input('img', sql.NVarChar(255), img)
      .query(`
        INSERT INTO product (name, description, price, genre, status, img)
        VALUES (@name, @description, @price, @genre, @status, @img)
      `);
    console.log(`  + product: ${p.name}`);
  }
}

async function seedInventory() {
  const products = await pool.request().query('SELECT pid FROM product');
  for (const row of products.recordset) {
    const exists = await pool.request()
      .input('pid', sql.Int, row.pid)
      .query('SELECT pid FROM inventory WHERE pid = @pid');
    if (exists.recordset.length) continue;

    await pool.request()
      .input('pid', sql.Int, row.pid)
      .input('quantity', sql.Int, Math.floor(Math.random() * 80) + 20)
      .input('discount', sql.Decimal(5, 2), Math.random() > 0.7 ? 10 : 0)
      .query('INSERT INTO inventory (pid, quantity, discount) VALUES (@pid, @quantity, @discount)');
  }
  console.log('  + inventory rows ensured');
}

async function run() {
  console.log('🌱 Seeding GameVault database...\n');
  await pool.connect();

  console.log('Users:');
  await seedUsers();

  console.log('\nProducts:');
  await seedProducts();

  console.log('\nInventory:');
  await seedInventory();

  console.log('\n✅ Seed complete.');
  console.log('\nDemo credentials:');
  console.log('  admin@gamevault.demo / Admin1234!');
  console.log('  alex@gamevault.demo  / Demo1234!');
  process.exit(0);
}

run().catch((err) => {
  console.error('❌ Seed failed:', err.message);
  process.exit(1);
});
