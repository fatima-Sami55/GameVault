const express = require('express');
const router = express.Router();
const { pool, sql, poolConnect } = require('../../database/db');

function renderPaymentError(res, req, message) {
    return res.render('payment', {
        message,
        toastError: message,
        totalAmount: Number(req.body.totalAmount) || 0,
        billId: req.body.billId,
        user: req.session.user,
    });
}

router.post('/complete', async (req, res) => {
    const user = req.session.user?.uuid;
    const { billId, cardNumber, cvc, expiryDate, cardType } = req.body;

    if (!user) return res.redirect('/login');

    const paymentMethod = 'Card';

    try {
        await poolConnect;

        if (!cardNumber || !cvc || !expiryDate || !cardType) {
            return renderPaymentError(res, req, 'All card fields are required.');
        }

        if (cardType !== 'Visa' && cardType !== 'MasterCard') {
            return renderPaymentError(res, req, 'Invalid card type selected.');
        }

        if (!/^\d{16}$/.test(cardNumber)) {
            return renderPaymentError(res, req, 'Card number must be 16 digits.');
        }

        if (!/^\d{3,4}$/.test(cvc)) {
            return renderPaymentError(res, req, 'CVC must be 3 or 4 digits.');
        }

        const expiry = new Date(expiryDate);
        const now = new Date();
        now.setMonth(now.getMonth() + 1);

        if (expiry < now) {
            return renderPaymentError(res, req, 'Expiry date must be at least one month in the future.');
        }

        const repeatedDigits = /^(\d)\1{15}$/;
        if (repeatedDigits.test(cardNumber)) {
            return renderPaymentError(res, req, 'Invalid card number.');
        }

        await pool.request()
            .input('userId', sql.UniqueIdentifier, user)
            .input('cardNumber', sql.Char(16), cardNumber)
            .input('cvc', sql.Char(4), cvc)
            .input('expiryDate', sql.Date, expiryDate)
            .input('cardType', sql.VarChar(50), cardType)
            .query(`
                DECLARE @newCardId INT;
                SELECT @newCardId = ISNULL(MAX(c_id), 0) + 1 FROM card_details;
                INSERT INTO card_details (c_id, user_id, c_number, cvc, expiry_date, type)
                VALUES (@newCardId, @userId, @cardNumber, @cvc, @expiryDate, @cardType)
            `);

        await pool.request()
            .input('billId', sql.Int, parseInt(billId, 10))
            .input('paymentMethod', sql.VarChar(50), paymentMethod)
            .query(`
                DECLARE @newPaymentId INT;
                SELECT @newPaymentId = ISNULL(MAX(pid), 0) + 1 FROM payment;
                INSERT INTO payment (pid, bill_id, p_method)
                VALUES (@newPaymentId, @billId, @paymentMethod)
            `);

        res.redirect(`/order/confirmation/${billId}`);
    } catch (err) {
        console.error('Payment processing error:', err);
        renderPaymentError(res, req, 'Payment failed. Please check your details and try again.');
    }
});

module.exports = router;
