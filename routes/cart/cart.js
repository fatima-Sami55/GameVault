const express = require('express');
const router = express.Router();
const sql = require('mssql');
const { pool, poolConnect } = require('../../database/db');
const { redirectWithFlash } = require('../../utils/flash');

// Middleware to check if user is authenticated
const isAuthenticated = (req, res, next) => {
    if (req.session.user) {
        return next();
    }
    if (req.path === '/' && req.accepts('html') && !req.xhr) {
        return redirectWithFlash(res, '/login', 'Please login first.', 'error');
    }
    res.status(401).json({ error: 'Please login first' });
};

// Render cart page
router.get('/', isAuthenticated, (req, res) => {
    res.render('cart', { user: req.session.user });
});

// Get user's cart (API endpoint)
router.get('/cart', isAuthenticated, async (req, res) => {
    try {
        await poolConnect;
        // Ensure user_id exists in session
        if (!req.session.user || !req.session.user.uuid) {
            return res.status(401).json({ error: 'User not authenticated' });
        }

        const userId = req.session.user.uuid;
        
        // Get or create cart for user
        let cartResult = await pool.request()
            .input('userId', sql.UniqueIdentifier, userId)
            .query('SELECT cart_id FROM cart WHERE user_id = @userId');
        
        let cartId;
        if (cartResult.recordset.length === 0) {
            // Create new cart if doesn't exist
            const newCart = await pool.request()
                .input('userId', sql.UniqueIdentifier, userId)
                .query('INSERT INTO cart (user_id) OUTPUT INSERTED.cart_id VALUES (@userId)');
            cartId = newCart.recordset[0].cart_id;
        } else {
            cartId = cartResult.recordset[0].cart_id;
        }

        // Get cart items with product details
        const cartItems = await pool.request()
            .input('cartId', sql.Int, cartId)
            .query(`
                SELECT p.pid, p.name, p.price, p.img, cp.quantity, (p.price * cp.quantity) as total_price
                FROM cart_products cp
                JOIN product p ON cp.pid = p.pid
                WHERE cp.cart_id = @cartId
            `);

            const updatedCartItems = cartItems.recordset.map(item => ({
                ...item,
                img: item.img.startsWith('http') ? item.img : `/uploads/${item.img}`
            }));


        res.json(updatedCartItems);
    } catch (error) {
        console.error('Error fetching cart:', error);
        res.status(500).json({ error: 'Error fetching cart' });
    }
});

// Add item to cart
router.post('/add', isAuthenticated, async (req, res) => {
    try {
        await poolConnect;
        // Ensure user_id exists in session
        if (!req.session.user || !req.session.user.uuid) {
            return res.status(401).json({ error: 'User not authenticated' });
        }

        const { pid, quantity } = req.body;
        const userId = req.session.user.uuid;

        // Validate input
        if (!pid || !quantity || quantity < 1) {
            return res.status(400).json({ error: 'Invalid input' });
        }

        // Get or create cart
        let cartResult = await pool.request()
            .input('userId', sql.UniqueIdentifier, userId)
            .query('SELECT cart_id FROM cart WHERE user_id = @userId');
        
        let cartId;
        if (cartResult.recordset.length === 0) {
            // Create new cart if doesn't exist
            const newCart = await pool.request()
                .input('userId', sql.UniqueIdentifier, userId)
                .query('INSERT INTO cart (user_id) OUTPUT INSERTED.cart_id VALUES (@userId)');
            cartId = newCart.recordset[0].cart_id;
        } else {
            cartId = cartResult.recordset[0].cart_id;
        }

        // Check if product exists in cart
        const existingItem = await pool.request()
            .input('cartId', sql.Int, cartId)
            .input('pid', sql.Int, pid)
            .query('SELECT quantity FROM cart_products WHERE cart_id = @cartId AND pid = @pid');

        if (existingItem.recordset.length > 0) {
            // Update quantity if product exists
            await pool.request()
                .input('cartId', sql.Int, cartId)
                .input('pid', sql.Int, pid)
                .input('quantity', sql.Int, quantity)
                .query('UPDATE cart_products SET quantity = quantity + @quantity WHERE cart_id = @cartId AND pid = @pid');
        } else {
            // Add new product to cart
            await pool.request()
                .input('cartId', sql.Int, cartId)
                .input('pid', sql.Int, pid)
                .input('quantity', sql.Int, quantity)
                .query('INSERT INTO cart_products (cart_id, pid, quantity) VALUES (@cartId, @pid, @quantity)');
        }

        res.json({ message: 'Item added to cart successfully' });
    } catch (error) {
        console.error('Error adding to cart:', error);
        if (error.number === 245) { // SQL Server error for type conversion
            res.status(400).json({ error: 'Invalid product ID format' });
        } else {
            res.status(500).json({ error: 'Error adding to cart' });
        }
    }
});

// Update cart item quantity
router.put('/update', isAuthenticated, async (req, res) => {
    try {
        await poolConnect;
        const { pid, quantity } = req.body;
        const userId = req.session.user.uuid;

        if (!pid || !quantity || quantity < 1) {
            return res.status(400).json({ error: 'Invalid input' });
        }

        // Get user's cart
        const cartResult = await pool.request()
            .input('userId', sql.UniqueIdentifier, userId)
            .query('SELECT cart_id FROM cart WHERE user_id = @userId');

        if (cartResult.recordset.length === 0) {
            return res.status(404).json({ error: 'Cart not found' });
        }

        const cartId = cartResult.recordset[0].cart_id;

        // Update quantity
        const result = await pool.request()
            .input('cartId', sql.Int, cartId)
            .input('pid', sql.Int, pid)
            .input('quantity', sql.Int, quantity)
            .query('UPDATE cart_products SET quantity = @quantity WHERE cart_id = @cartId AND pid = @pid');

        if (result.rowsAffected[0] === 0) {
            return res.status(404).json({ error: 'Item not found in cart' });
        }

        res.json({ message: 'Cart updated successfully' });
    } catch (error) {
        console.error('Error updating cart:', error);
        if (error.number === 245) {
            res.status(400).json({ error: 'Invalid product ID format' });
        } else {
            res.status(500).json({ error: 'Error updating cart' });
        }
    }
});

// Remove item from cart
router.delete('/remove/:pid', isAuthenticated, async (req, res) => {
    try {
        await poolConnect;
        const { pid } = req.params;
        const userId = req.session.user.uuid;

        // Get user's cart
        const cartResult = await pool.request()
            .input('userId', sql.UniqueIdentifier, userId)
            .query('SELECT cart_id FROM cart WHERE user_id = @userId');

        if (cartResult.recordset.length === 0) {
            return res.status(404).json({ error: 'Cart not found' });
        }

        const cartId = cartResult.recordset[0].cart_id;

        // Remove item
        const result = await pool.request()
            .input('cartId', sql.Int, cartId)
            .input('pid', sql.Int, pid)
            .query('DELETE FROM cart_products WHERE cart_id = @cartId AND pid = @pid');

        if (result.rowsAffected[0] === 0) {
            return res.status(404).json({ error: 'Item not found in cart' });
        }

        res.json({ message: 'Item removed from cart successfully' });
    } catch (error) {
        console.error('Error removing from cart:', error);
        if (error.number === 245) {
            res.status(400).json({ error: 'Invalid product ID format' });
        } else {
            res.status(500).json({ error: 'Error removing from cart' });
        }
    }
});

// Clear cart
router.delete('/clear', isAuthenticated, async (req, res) => {
    try {
        await poolConnect;
        const userId = req.session.user.uuid;

        // Get user's cart
        const cartResult = await pool.request()
            .input('userId', sql.UniqueIdentifier, userId)
            .query('SELECT cart_id FROM cart WHERE user_id = @userId');

        if (cartResult.recordset.length === 0) {
            return res.status(404).json({ error: 'Cart not found' });
        }

        const cartId = cartResult.recordset[0].cart_id;

        // Clear cart
        await pool.request()
            .input('cartId', sql.Int, cartId)
            .query('DELETE FROM cart_products WHERE cart_id = @cartId');

        res.json({ message: 'Cart cleared successfully' });
    } catch (error) {
        console.error('Error clearing cart:', error);
        res.status(500).json({ error: 'Error clearing cart' });
    }
});

module.exports = router;