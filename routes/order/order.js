const express = require('express');
const router = express.Router();
const { pool, sql, poolConnect } = require('../../database/db');
const { redirectWithFlash } = require('../../utils/flash');
function generateTrackingNumber() {
    const randomString = Math.random().toString(36).substring(2, 10).toUpperCase();
    return 'TRK' + randomString;
}


// Place an order (generate order + billing)
router.post('/place', async (req, res) => {
    const userId = req.session.user?.uuid;
    // assuming you're storing full user in session

    if (!userId) {
        return res.redirect('/login'); // or send error
    }

    try {
        await poolConnect;

        const poolRequest = pool.request();
        poolRequest.input('userId', sql.UniqueIdentifier, userId);

        // Step 1: Get user's cart_id
        const cartResult = await poolRequest.query(`
    SELECT TOP 1 cart_id 
    FROM cart 
    WHERE user_id = @userId
    ORDER BY cart_id DESC
`    );

   if (cartResult.recordset.length === 0) {
    return res.render('order', { message: "No cart found for this user." });
    }

    const cartId = cartResult.recordset[0].cart_id;


        // Step 2: Fetch cart items + product info
        const itemResult = await pool.request()
            .input('cartId', sql.Int, cartId)
            .query(`
                SELECT cp.pid, cp.quantity, p.name, p.price
                FROM cart_products cp
                JOIN product p ON cp.pid = p.pid
                WHERE cp.cart_id = @cartId
            `);

        const items = itemResult.recordset;

        if (items.length === 0) {
            return res.render('order', { message: "Cart is empty." });
        }

        // Step 3: Calculate total
        let totalAmount = 0;
        items.forEach(item => {
            totalAmount += item.price * item.quantity;
        });

        // Step 4: Insert into order
        // o_id is a non-IDENTITY primary key, so generate the next id (same
        // approach the product table uses via its INSTEAD OF INSERT trigger).
        const orderResult = await pool.request()
            .input('userId', sql.UniqueIdentifier, userId)
            .input('status', sql.VarChar(50), 'Pending')
            .query(`
                DECLARE @newOrderId INT;
                SELECT @newOrderId = ISNULL(MAX(o_id), 0) + 1 FROM [orders];
                INSERT INTO [orders] (o_id, user_id, o_status)
                VALUES (@newOrderId, @userId, @status);
                SELECT @newOrderId AS o_id;
            `);

        const orderId = orderResult.recordset[0].o_id;

        // Step 5: Create billing (bill_id is also a non-IDENTITY primary key)
         const billingResult = await pool.request()
    .input('userId', sql.UniqueIdentifier, userId)
    .input('amount', sql.Decimal(10, 2), totalAmount)
    .input('date', sql.DateTime, new Date())
    .query(`
        DECLARE @newBillId INT;
        SELECT @newBillId = ISNULL(MAX(bill_id), 0) + 1 FROM billing;
        INSERT INTO billing (bill_id, user_id, amount, date)
        VALUES (@newBillId, @userId, @amount, @date);
        SELECT @newBillId AS bill_id;
    `);

     const billId = billingResult.recordset[0].bill_id; // use this generated ID for next steps
     // to render payment
       res.render('payment', {
            billId,
            totalAmount,
            user: req.session.user || null,
            items
        });

    } catch (err) {
        console.error('❌ Order placement error:', err);
        redirectWithFlash(res, '/cart', 'Could not place your order. Please try again.', 'error');
    }
});


router.get('/', async (req, res) => {
  const userId = req.session.user?.uuid;

  if (!userId) {
    return res.redirect('/login');
  }

  try {
    await poolConnect;

    const cartResult = await pool.request()
      .input('userId', sql.UniqueIdentifier, userId)
      .query(`
        SELECT TOP 1 cart_id 
        FROM cart 
        WHERE user_id = @userId 
        ORDER BY cart_id DESC
      `);

    if (cartResult.recordset.length === 0) {
      return res.render('order', { product: [], user: req.session.user });
    }

    const cartId = cartResult.recordset[0].cart_id;

    const itemResult = await pool.request()
      .input('cartId', sql.Int, cartId)
      .query(`
        SELECT cp.pid, cp.quantity, p.name, p.price
        FROM cart_products cp
        JOIN product p ON cp.pid = p.pid
        WHERE cp.cart_id = @cartId
      `);

    const items = itemResult.recordset;

    res.render('order', {
      product: items,
      user: req.session.user
    });

  } catch (err) {
    console.error('❌ Error rendering order page:', err);
    redirectWithFlash(res, '/cart', 'Could not load your order. Please try again.', 'error');
  }
});

// Show order confirmation after payment
router.get('/confirmation/:billId', async (req, res) => {
    const userId = req.session.user?.uuid;
    const billId = req.params.billId;

    if (!userId) return res.redirect('/login');

    try {
        await poolConnect;

        // ✅ Generate a new tracking number
        const trackingNumber = generateTrackingNumber();

        // ✅ Step 1: Confirm the latest pending order & assign tracking number
        const updateResult = await pool.request()
    .input('userId', sql.UniqueIdentifier, userId)
    .input('tracking', sql.VarChar(20), trackingNumber)
    .query(`
        UPDATE orders
        SET o_status = 'confirmed', tracking_number = @tracking
        WHERE o_id = (
            SELECT TOP 1 o_id
            FROM orders
            WHERE user_id = @userId AND o_status = 'pending'
            ORDER BY o_id DESC
        );
    `);

        // ✅ Step 2: Fetch updated billing and order info
        const billingResult = await pool.request()
            .input('billId', sql.Int, billId)
            .input('userId', sql.UniqueIdentifier, userId)
            .query(`
                SELECT TOP 1 b.bill_id, b.amount, o.o_status, o.tracking_number, u.name
                FROM billing b
                JOIN orders o ON o.user_id = b.user_id
                JOIN users u ON u.uuid = o.user_id
                WHERE b.bill_id = @billId AND u.uuid = @userId
                ORDER BY o.o_id DESC
            `);

        if (billingResult.recordset.length === 0) {
            return redirectWithFlash(res, '/', 'Billing record not found.', 'error');
        }

        const billingInfo = billingResult.recordset[0];

        // ✅ Step 3: Fetch latest cart
        const cartResult = await pool.request()
            .input('userId', sql.UniqueIdentifier, userId)
            .query(`
                SELECT TOP 1 cart_id
                FROM cart
                WHERE user_id = @userId
                ORDER BY cart_id DESC
            `);

        const cartId = cartResult.recordset[0]?.cart_id;

        if (!cartId) {
            return res.render('order-confirmation', {
                user: req.session.user,
                billingInfo,
                items: [],
                message: "No cart found."
            });
        }

        // ✅ Step 4: Fetch products in the cart
        const itemsResult = await pool.request()
            .input('cartId', sql.Int, cartId)
            .query(`
                SELECT cp.quantity, p.name, p.price
                FROM cart_products cp
                JOIN product p ON cp.pid = p.pid
                WHERE cp.cart_id = @cartId
            `);

        const items = itemsResult.recordset;

        // ✅ Step 5: Render confirmation
        res.render('order-confirmation', {
            user: req.session.user,
            billingInfo,
            items
        });

         // ✅ Step 6: Clear the cart after order confirmation
         const currentCartResult = await pool.request()
         .input('userId', sql.UniqueIdentifier, userId)
         .query(`
             SELECT TOP 1 cart_id
             FROM cart
             WHERE user_id = @userId
             ORDER BY cart_id DESC
         `);

        if (currentCartResult.recordset.length > 0) {
            const cartId = currentCartResult.recordset[0].cart_id;
            
            // Delete cart products first (due to foreign key constraint)
            await pool.request()
                .input('cartId', sql.Int, cartId)
                .query(`
                    DELETE FROM cart_products
                    WHERE cart_id = @cartId
                `);

            // Then delete the cart
            await pool.request()
                .input('cartId', sql.Int, cartId)
                .query(`
                    DELETE FROM cart
                    WHERE cart_id = @cartId
                `);
        }

    } catch (err) {
        console.error("❌ Error loading confirmation page:", err);
        redirectWithFlash(res, '/', 'Could not load your order confirmation. Please try again.', 'error');
    }
});

  
module.exports = router;
