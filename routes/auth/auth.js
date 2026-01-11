const express = require('express');
const { pool, sql , poolConnect } = require('../../database/db');
const { v4: uuidv4 } = require('uuid');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { isAuthenticated, isAdmin, redirectIfAuthenticated } = require('../../middleware/authChecks');
const { upload } = require('../../main');


// ================== ADMIN Routes ==================

router.get('/admin-dashboard', isAuthenticated, isAdmin, async (req, res) => {
  await poolConnect; // ensures DB is connected

  try {
    const user = req.session.user || { name: 'Admin' };
    const now = new Date();
    const currentDate = now.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    const currentTime = now.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });

    const totalUsersResult = await pool.request().query(`SELECT COUNT(*) AS totalUsers FROM dbo.users`);
    const newRegistrationsResult = await pool.request().query(`SELECT COUNT(*) AS newRegistrations FROM dbo.users WHERE created_at >= DATEADD(DAY, -1, GETDATE())`);
    const totalRevenueResult = await pool.request().query(`SELECT SUM(amount) AS totalRevenue FROM dbo.billing`);

    const stats = {
      totalUsers: totalUsersResult.recordset[0].totalUsers,
      newRegistrations: newRegistrationsResult.recordset[0].newRegistrations,
      totalRevenue: totalRevenueResult.recordset[0].totalRevenue || 0
    };

    // Fetch recent orders
    const recentOrdersResult = await pool.request().query(`
      SELECT TOP 3 o_id AS order_id, user_id, o_status AS status, created_at 
      FROM dbo.orders 
      ORDER BY created_at DESC
    `);

    // Fetch recent new users
    const recentUsersResult = await pool.request().query(`
      SELECT TOP 3 uuid AS user_id, name, email, created_at 
      FROM dbo.users 
      ORDER BY created_at DESC
    `);

    // Fetch recent payments
    const recentPaymentsResult = await pool.request().query(`
      SELECT TOP 3 pid AS payment_id, bill_id, p_method AS method, created_at 
      FROM dbo.payment 
      ORDER BY created_at DESC
    `);

    // Combine and format activities
    const activities = [
      ...recentOrdersResult.recordset.map(row => ({
        type: 'shopping-cart',
        description: `New order #${row.order_id} (Status: ${row.status}) placed by user ${row.user_id}`,
        timestamp: row.created_at
      })),
      ...recentUsersResult.recordset.map(row => ({
        type: 'user',
        description: `New user ${row.name} Emai: (${row.email}) registered`,
        timestamp: row.created_at
      })),
      ...recentPaymentsResult.recordset.map(row => ({
        type: 'credit-card',
        description: `Payment #${row.payment_id} of (Method: ${row.method}) received`,
        timestamp: row.created_at
      }))
    ]
    // Sort by timestamp (newest first) and limit to 5
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
    .slice(0, 5);

    res.render('adminDashboard', {
      user,
      stats,
      activities,
      currentDate,
      currentTime
    });

  } catch (err) {
    console.error('Dashboard error:', err);
    res.status(500).send('Error loading dashboard');
  }
});

router.get('/admin-user', isAuthenticated, isAdmin, async (req, res) => {
    try {
        await poolConnect; // Ensures DB connection is ready

        const result = await pool.request().query(`
            SELECT uuid, name, email, role, phone_number
            FROM Users
        `);

        const users = result.recordset; // This will contain your users

        res.render('admin-user', {
            users,
            user: req.session.user
        });

    } catch (err) {
        console.error('❌ Error fetching users:', err);
        res.status(500).send('Internal Server Error');
    }
});

router.post('/admin-user/delete', isAuthenticated, isAdmin, async (req, res) => {
    try {
        await poolConnect;

        const { uuid } = req.body;

        await pool.request()
            .input('uuid', sql.UniqueIdentifier, uuid)
            .query('DELETE FROM Users WHERE uuid = @uuid');

        res.redirect('/admin-user');
    } catch (err) {
        console.error('❌ Error deleting user:', err);
        res.status(500).send('Internal Server Error');
    }
});

router.post('/admin-user/makeAdmin', isAuthenticated, isAdmin, async (req, res) => {
    try {
        await poolConnect;

        const { uuid } = req.body;

    await pool.request()
    .input('uuid', sql.UniqueIdentifier, uuid)
    .query("UPDATE Users SET role = 'admin' WHERE uuid = @uuid");


        res.redirect('/admin-user');
    } catch (err) {
        console.error('❌ Error updating user:', err);
        res.status(500).send('Internal Server Error');
    }
});

router.get('/admin-products', isAuthenticated, isAdmin, async (req, res) => {
        res.render('ProductForm');
});

router.post('/admin-products/add', isAuthenticated, isAdmin, upload.single('image'), async (req, res) => {
    await poolConnect;

    const { name, description, price, genre, status } = req.body;
    const image = req.file ? req.file.filename : null;

    if (!image) {
        return res.status(400).send("Image upload failed");
    }

    try {
        const result = await pool.request()
            .input('name', sql.NVarChar(255), name)
            .input('description', sql.NVarChar(sql.MAX), description)
            .input('price', sql.Decimal(10, 2), price)
            .input('genre', sql.NVarChar(100), genre)
            .input('status', sql.NVarChar(50), status)
            .input('img', sql.NVarChar(255), image)
            .query(`
                INSERT INTO Product (name, description, price, genre, status, img)
                VALUES (@name, @description, @price, @genre, @status, @img)
            `);

        res.redirect('/admin-products'); 
    } catch (err) {
        console.error('Database error:', err);
        res.status(500).send('Something went wrong while adding the product');
    }
});

router.get('/admin-products/manage', isAuthenticated, isAdmin, async (req, res) => {
    const user = req.session.user
    await poolConnect;

    try {
        const result = await pool.request().query('SELECT * FROM Product');
        const products = result.recordset;
        res.render('manageProducts', { products, user });
    } catch (err) {
        console.error('Database error:', err);
        res.status(500).send('Something went wrong while fetching products');
    }
});

router.post('/products/delete/:id', isAuthenticated, isAdmin, async (req, res) => {
    const { id } = req.params;

    try {
        // Delete the product by its ID
        await pool.request()
            .input('id', sql.Int, id)
            .query('DELETE FROM Product WHERE pid = @id');
        
        res.redirect('/admin-products/manage');
    } catch (err) {
        console.error('Database error:', err);
        res.status(500).send('Something went wrong while deleting the product');
    }
});

router.get('/products/edit/:id', isAuthenticated, isAdmin, async (req, res) => {
    const user = req.user;
    const id = req.params.id;

    try {
        const result = await pool.request()
            .input('id', sql.Int, id)
            .query('SELECT * FROM Product WHERE pid = @id');
        
        const product = result.recordset[0]; 

        if (!product) {
            return res.status(404).send("Product not found");
        }
        res.render("editProduct", { user, product });
    } catch (err) {
        console.error(err);
        res.status(500).send("Server Error");
    }
});

router.post('/products/edit/:id', isAuthenticated, isAdmin, upload.single('img'), async (req, res) => {
    const id = req.params.id;
    const { name, description, price, genre, status } = req.body;
    const image = req.file ? req.file.filename : req.body.img; 

    try {
        await pool.request()
    .input('pid', sql.Int, id)
    .input('name', sql.NVarChar(255), name)
    .input('description', sql.NVarChar(sql.MAX), description)
    .input('price', sql.Decimal(10, 2), price)
    .input('genre', sql.NVarChar(100), genre)
    .input('status', sql.NVarChar(50), status)
    .input('img', sql.NVarChar(255), image)
    .query(`
        UPDATE Product
        SET name = @name, description = @description, price = @price, genre = @genre, status = @status, img = @img
        WHERE pid = @pid
    `).then(result => {
        console.log('Rows affected:', result.rowsAffected);
    });

        res.redirect('/admin-products/manage');
    } catch (err) {
        console.error('Database error:', err);
        res.status(500).send('Something went wrong while updating the product');
    }
});



//get requests
router.get('/login',redirectIfAuthenticated, async (req, res) => {
  res.render('login')
});

router.get('/register',redirectIfAuthenticated, async (req, res) => {
  res.render('register')
});

router.get('/logout', isAuthenticated, async (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('❌ Logout Error:', err);
      return res.status(500).send('Error logging out');
    }
    res.redirect('/');  // Redirect after logout
    console.log('✅ Logged out');
  });
});



// post requests

// ================== LOGIN ==================
router.post('/login',redirectIfAuthenticated, async (req, res) => {
  const { email, password } = req.body;

  if (!email?.trim() || !password) {
    return res.status(400).send('❌ Email and password are required.');
  }

  try {
    await poolConnect;
    const request = pool.request();
    request.input('email', sql.VarChar(100), email.trim());

    const result = await request.query(`SELECT * FROM users WHERE email = @email`);
    const user = result.recordset[0];
    if (!user) {
      return res.status(401).send('❌ Invalid email or password');
    }

    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      return res.status(401).send('❌ Invalid email or password');
    }

    req.session.user = {
      uuid: user.uuid,
      name: user.name,
      email: user.email,
      role: user.role 
    };

    console.log(`✅ Logged in: ${user.email}`);
    res.redirect('/');
  } catch (err) {
    console.error('❌ Login Error:', err);
    res.status(500).send('Internal Server Error');
  }
});

// ================== REGISTER ==================
router.post('/register',redirectIfAuthenticated, async (req, res) => {
  const { name, email, password, phone_number } = req.body;

  if (!name?.trim() || !email?.trim() || !password || !phone_number?.trim()) {
    return res.status(400).send('❌ All fields are required.');
  }

  const userId = uuidv4();
  const hashedPassword = await bcrypt.hash(password, 10);
  try{
    await poolConnect;
    const request = pool.request();
    request.input('uuid', sql.UniqueIdentifier, userId)
    request.input('name', sql.VarChar(100), name);
    request.input('email', sql.VarChar(100), email);
    request.input('password', sql.VarChar(100), hashedPassword);
    request.input('phone_number', sql.VarChar(15), phone_number.trim());
    request.input('role', sql.VarChar(20), 'user'); // 👈 default role

    await request.query(`
      INSERT INTO users (uuid, name, email, password, phone_number)
      VALUES (@uuid, @name, @email, @password, @phone_number)
    `);

    console.log(`Registered: ${name}, successfully`);
    res.redirect('/');
  } catch (err) {
    if (err.originalError?.info?.number === 2627) {
      return res.status(409).send('⚠️ Email already exists.');
    }
    console.error('❌ Registration Error:', err);
    res.status(500).send('Error registering user.');
  }
}
)


module.exports = router;