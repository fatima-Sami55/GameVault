const express = require('express');
const router = express.Router();
const { pool } = require('../../database/db');

// Render games page
router.get('/', async (req, res) => {
    res.render('games', { user: req.session.user || null });
});

// Get all games with optional filtering (API endpoint)
router.get('/games', async (req, res) => {
    try {
        const { genre, priceRange, sortBy } = req.query;
        
        let query = `
            SELECT pid, name, description, price, genre, status, img
            FROM product
            WHERE status IN ('available', 'unavailable')
        `;
        
        const params = [];
        
        // Add genre filter
        if (genre) {
            query += ' AND genre = @genre';
            params.push({ name: 'genre', value: genre });
        }
        
        // Add price range filter
        if (priceRange) {
            const [min, max] = priceRange.split('-');
            if (max) {
                query += ' AND price >= @minPrice AND price <= @maxPrice';
                params.push({ name: 'minPrice', value: parseFloat(min) });
                params.push({ name: 'maxPrice', value: parseFloat(max) });
            } else {
                query += ' AND price >= @minPrice';
                params.push({ name: 'minPrice', value: parseFloat(min) });
            }
        }
        
        // Add sorting
        if (sortBy) {
            switch (sortBy) {
                case 'price-asc':
                    query += ' ORDER BY price ASC';
                    break;
                case 'price-desc':
                    query += ' ORDER BY price DESC';
                    break;
                default:
                    query += ' ORDER BY name ASC';
            }
        } else {
            query += ' ORDER BY name ASC';
        }

        // Create request with parameters
        const request = pool.request();
        params.forEach(param => {
            request.input(param.name, param.value);
        });

        const result = await request.query(query);
        
        // Adjust image path for each game
        const gamesWithAdjustedImagePaths = result.recordset.map(game => ({
            ...game,
            img: game.img.startsWith('http') ? game.img : `/uploads/${game.img}` 
        }));
        
        res.json(gamesWithAdjustedImagePaths);
    } catch (error) {
        console.error('Error fetching games:', error);
        res.status(500).json({ error: 'Error fetching games' });
    }
});


module.exports = router;