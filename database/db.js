require('dotenv').config();
const sql = require('mssql');

const isProduction = process.env.NODE_ENV === 'production';

const config = {
  server: process.env.DB_SERVER,
  port: Number(process.env.DB_PORT) || 1433,
  database: process.env.DB_NAME,
  options: {
    encrypt: true,
    trustServerCertificate: process.env.DB_TRUST_SERVER_CERT === 'true' || !isProduction
  }
};

if (process.env.DB_AUTH_TYPE) {
  config.authentication = {
    type: process.env.DB_AUTH_TYPE
  };

  if (process.env.DB_USER || process.env.DB_PASSWORD) {
    config.authentication.options = {
      userName: process.env.DB_USER,
      password: process.env.DB_PASSWORD
    };
  }
} else {
  config.user = process.env.DB_USER;
  config.password = process.env.DB_PASSWORD;
}

const pool = new sql.ConnectionPool(config);
const poolConnect = pool.connect()
  .then(() => {
    console.log('✅ Database Connected');
    return pool;
  })
  .catch((err) => {
    console.error('❌ Database Connection Error:', err.message);
    return null;
  });

pool.on('error', err => {
  console.error('❌ SQL error:', err.message);
});

module.exports = {
  sql, pool, poolConnect
};
