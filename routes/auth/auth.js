const express = require('express');
const { pool, sql , poolConnect } = require('../../database/db');
const { v4: uuidv4 } = require('uuid');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { isAuthenticated, isAdmin, redirectIfAuthenticated } = require('../../middleware/authChecks');
const { upload, cloudinary } = require('../../middleware/upload');
const { redirectWithFlash } = require('../../utils/flash');

async function deleteCloudinaryImageByUrl(url) {
  if (!url || !url.startsWith('http')) return;
  try {
    const parts = url.split('/image/upload/');
    if (parts.length < 2) return;
    
    let publicIdWithExt = parts[1];
    if (publicIdWithExt.startsWith('v')) {
      const nextSlash = publicIdWithExt.indexOf('/');
      if (nextSlash !== -1) {
        publicIdWithExt = publicIdWithExt.substring(nextSlash + 1);
      }
    }
    
    const lastDot = publicIdWithExt.lastIndexOf('.');
    const publicId = lastDot !== -1 ? publicIdWithExt.substring(0, lastDot) : publicIdWithExt;
    
    console.log(`Deleting Cloudinary asset: ${publicId}`);
    const result = await cloudinary.uploader.destroy(publicId);
    console.log(`Cloudinary deletion result:`, result);
  } catch (err) {
    console.error(`❌ Failed to delete Cloudinary asset:`, err.message);
  }
}


// ================== ADMIN Routes ==================

router.get('/admin-dashboard', isAuthenticated, isAdmin, async (req, res) => {
  await poolConnect; // ensures DB is connected

  if (!pool.connected) {
    console.warn('⚠️ Admin Dashboard Error: Database is offline.');
    return redirectWithFlash(res, '/', 'Database is currently offline. Please try again later.', 'error');
  }

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
    const newRegistrationsResult = await pool.request().query(`SELECT COUNT(*) AS newRegistrations FROM dbo.users WHERE created_at >= CAST(GETDATE() AS DATE)`);
    const totalRevenueResult = await pool.request().query(`SELECT SUM(amount) AS totalRevenue FROM dbo.billing`);

    const stats = {
      totalUsers: totalUsersResult.recordset[0].totalUsers,
      newRegistrations: newRegistrationsResult.recordset[0].newRegistrations,
      totalRevenue: totalRevenueResult.recordset[0].totalRevenue || 0
    };

    // Fetch recent orders
    const recentOrdersResult = await pool.request().query(`
      SELECT TOP 20 o_id AS order_id, user_id, o_status AS status, created_at 
      FROM dbo.orders 
      ORDER BY created_at DESC
    `);

    // Fetch recent new users
    const recentUsersResult = await pool.request().query(`
      SELECT TOP 20 uuid AS user_id, name, email, created_at 
      FROM dbo.users 
      ORDER BY created_at DESC
    `);

    // Fetch recent payments
    const recentPaymentsResult = await pool.request().query(`
      SELECT TOP 20 pid AS payment_id, bill_id, p_method AS method, created_at 
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
        description: `New user ${row.name} Email: (${row.email}) registered`,
        timestamp: row.created_at
      })),
      ...recentPaymentsResult.recordset.map(row => ({
        type: 'credit-card',
        description: `Payment #${row.payment_id} of (Method: ${row.method}) received`,
        timestamp: row.created_at
      }))
    ]
    // Sort by timestamp (newest first) and limit to 40
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
    .slice(0, 40);

    res.render('adminDashboard', {
      user,
      stats,
      activities,
      currentDate,
      currentTime
    });

  } catch (err) {
    console.error('Dashboard error:', err);
    redirectWithFlash(res, '/', 'Could not load the dashboard. Please try again.', 'error');
  }
});

router.get('/admin-user', isAuthenticated, isAdmin, async (req, res) => {
    try {
        await poolConnect; // Ensures DB connection is ready
        if (!pool.connected) {
            console.warn('⚠️ Admin User Management Error: Database is offline.');
            return redirectWithFlash(res, '/', 'Database is currently offline. Please try again later.', 'error');
        }

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
        redirectWithFlash(res, '/admin-dashboard', 'Could not load users. Please try again.', 'error');
    }
});

router.post('/admin-user/delete', isAuthenticated, isAdmin, async (req, res) => {
    try {
        await poolConnect;

        const { uuid } = req.body;

        await pool.request()
            .input('uuid', sql.UniqueIdentifier, uuid)
            .query('DELETE FROM Users WHERE uuid = @uuid');

        redirectWithFlash(res, '/admin-user', 'User deleted successfully.', 'success');
    } catch (err) {
        console.error('❌ Error deleting user:', err);
        redirectWithFlash(res, '/admin-user', 'Could not delete the user. Please try again.', 'error');
    }
});

router.post('/admin-user/makeAdmin', isAuthenticated, isAdmin, async (req, res) => {
    try {
        await poolConnect;

        const { uuid } = req.body;

    await pool.request()
    .input('uuid', sql.UniqueIdentifier, uuid)
    .query("UPDATE Users SET role = 'admin' WHERE uuid = @uuid");


        redirectWithFlash(res, '/admin-user', 'User promoted to admin.', 'success');
    } catch (err) {
        console.error('❌ Error updating user:', err);
        redirectWithFlash(res, '/admin-user', 'Could not update the user. Please try again.', 'error');
    }
});

router.get('/admin-products', isAuthenticated, isAdmin, async (req, res) => {
        res.render('ProductForm', { user: req.session.user });
});

router.post('/admin-products/add', isAuthenticated, isAdmin, upload.single('image'), async (req, res) => {
    await poolConnect;

    const { name, description, price, genre, status } = req.body;
    const image = req.file ? req.file.path : null;

    if (!image) {
        return redirectWithFlash(res, '/admin-products', 'Image upload failed. Please choose a valid image.', 'error');
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

        redirectWithFlash(res, '/admin-products', 'Product added successfully!', 'success');
    } catch (err) {
        console.error('Database error:', err);
        redirectWithFlash(res, '/admin-products', 'Something went wrong while adding the product.', 'error');
    }
});

router.get('/admin-products/manage', isAuthenticated, isAdmin, async (req, res) => {
    const user = req.session.user
    await poolConnect;
    if (!pool.connected) {
        console.warn('⚠️ Admin Manage Products Error: Database is offline.');
        return redirectWithFlash(res, '/', 'Database is currently offline. Please try again later.', 'error');
    }

    try {
        const result = await pool.request().query('SELECT * FROM Product');
        const products = result.recordset;
        res.render('manageProducts', { products, user });
    } catch (err) {
        console.error('Database error:', err);
        redirectWithFlash(res, '/admin-dashboard', 'Could not load products. Please try again.', 'error');
    }
});

router.post('/products/delete/:id', isAuthenticated, isAdmin, async (req, res) => {
    const { id } = req.params;

    try {
        await poolConnect;
        
        let imageUrl = null;
        const imgResult = await pool.request()
            .input('id', sql.Int, id)
            .query('SELECT img FROM Product WHERE pid = @id');
        if (imgResult.recordset.length > 0) {
            imageUrl = imgResult.recordset[0].img;
        }

        const transaction = new sql.Transaction(pool);
        await transaction.begin();

        try {
            await transaction.request()
                .input('id', sql.Int, id)
                .query('DELETE FROM cart_products WHERE pid = @id');

            await transaction.request()
                .input('id', sql.Int, id)
                .query('DELETE FROM inventory WHERE pid = @id');

            await transaction.request()
                .input('id', sql.Int, id)
                .query('DELETE FROM Product WHERE pid = @id');

            await transaction.commit();

            if (imageUrl) {
                await deleteCloudinaryImageByUrl(imageUrl);
            }

            redirectWithFlash(res, '/admin-products/manage', 'Product deleted successfully.', 'success');
        } catch (txErr) {
            await transaction.rollback();
            throw txErr;
        }
    } catch (err) {
        console.error('Database error:', err);
        redirectWithFlash(res, '/admin-products/manage', 'Something went wrong while deleting the product.', 'error');
    }
});

router.get('/products/edit/:id', isAuthenticated, isAdmin, async (req, res) => {
    const user = req.session.user;
    const id = req.params.id;

    try {
        const result = await pool.request()
            .input('id', sql.Int, id)
            .query('SELECT * FROM Product WHERE pid = @id');
        
        const product = result.recordset[0]; 

        if (!product) {
            return redirectWithFlash(res, '/admin-products/manage', 'Product not found.', 'error');
        }
        res.render("editProduct", { user, product });
    } catch (err) {
        console.error(err);
        redirectWithFlash(res, '/admin-products/manage', 'Could not open the product for editing.', 'error');
    }
});

router.post('/products/edit/:id', isAuthenticated, isAdmin, upload.single('img'), async (req, res) => {
    const id = req.params.id;
    const { name, description, price, genre, status } = req.body;
    const image = req.file ? req.file.path : req.body.img; 

    try {
        let oldImageUrl = null;
        if (req.file) {
            const oldProductResult = await pool.request()
                .input('id', sql.Int, id)
                .query('SELECT img FROM Product WHERE pid = @id');
            if (oldProductResult.recordset.length > 0) {
                oldImageUrl = oldProductResult.recordset[0].img;
            }
        }

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
            `);

        if (oldImageUrl) {
            await deleteCloudinaryImageByUrl(oldImageUrl);
        }

        redirectWithFlash(res, '/admin-products/manage', 'Product updated successfully.', 'success');
    } catch (err) {
        console.error('Database error:', err);
        redirectWithFlash(res, '/admin-products/manage', 'Something went wrong while updating the product.', 'error');
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
  req.session = null;
  console.log('✅ Logged out');
  res.redirect('/');
});



// post requests

// ================== LOGIN ==================
router.post('/login',redirectIfAuthenticated, async (req, res) => {
  const { email, password } = req.body;

  if (!email?.trim() || !password) {
    return res.render('login', { error: 'Email and password are required.' });
  }

  try {
    await poolConnect;
    if (!pool.connected) {
      console.warn('⚠️ Login Error: Database is offline.');
      return res.render('login', { error: 'Database is currently offline. Please try again later.' });
    }
    const request = pool.request();
    request.input('email', sql.VarChar(100), email.trim());

    const result = await request.query(`SELECT * FROM users WHERE email = @email`);
    const user = result.recordset[0];
    if (!user) {
      return res.render('login', { error: 'Invalid email or password.' });
    }

    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      return res.render('login', { error: 'Invalid email or password.' });
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
    if (err.message && err.message.includes('Connection')) {
      console.warn('⚠️ Login Error: Database is offline.');
      return res.render('login', { error: 'Database is currently offline. Please try again later.' });
    }
    console.error('❌ Login Error:', err);
    res.render('login', { error: 'Something went wrong. Please try again.' });
  }
});

// ================== REGISTER ==================
router.post('/register',redirectIfAuthenticated, async (req, res) => {
  const { name, email, password, confirm_password, phone_number } = req.body;

  if (!name?.trim() || !email?.trim() || !password || !confirm_password || !phone_number?.trim()) {
    return res.render('register', { error: 'All fields are required.' });
  }

  // Backend validations
  const hasLength = password.length >= 8 && password.length <= 25;
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSymbol = /[!@#$%^&*(),.?":{}|<>]/.test(password);

  if (!hasLength) {
    return res.render('register', { error: 'Password must be between 8 and 25 characters.' });
  }
  if (!hasUpper || !hasLower || !hasNumber || !hasSymbol) {
    return res.render('register', { error: 'Password must include uppercase, lowercase, numbers, and special symbols.' });
  }
  if (password !== confirm_password) {
    return res.render('register', { error: 'Passwords do not match.' });
  }

  const userId = uuidv4();
  const hashedPassword = await bcrypt.hash(password, 10);
  try{
    await poolConnect;
    if (!pool.connected) {
      console.warn('⚠️ Registration Error: Database is offline.');
      return res.render('register', { error: 'Database is currently offline. Please try again later.' });
    }
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
    if (err.message && err.message.includes('Connection')) {
      console.warn('⚠️ Registration Error: Database is offline.');
      return res.render('register', { error: 'Database is currently offline. Please try again later.' });
    }
    if (err.originalError?.info?.number === 2627) {
      return res.render('register', { error: 'Email already exists.' });
    }
    console.error('❌ Registration Error:', err);
    res.render('register', { error: 'Error registering user. Please try again.' });
  }
}
)


module.exports = router;