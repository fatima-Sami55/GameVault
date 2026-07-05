const path = require('path');
const fs = require('fs');
const { pool, sql, poolConnect } = require('./db');
const { cloudinary } = require('../middleware/upload');

async function run() {
  console.log('🔄 Starting product images migration to Cloudinary...');
  await poolConnect;
  
  if (!pool.connected) {
    console.error('❌ Could not connect to database.');
    process.exit(1);
  }

  // Fetch all products whose images are local (do not start with http)
  const result = await pool.request().query('SELECT pid, name, img FROM Product');
  const products = result.recordset.filter(p => p.img && !p.img.startsWith('http'));

  console.log(`🔍 Found ${products.length} products with local images to migrate.`);

  for (const product of products) {
    const filename = product.img;
    let filePath = path.join(__dirname, '..', 'public', 'uploads', filename);
    
    // Fallback to public/images if not in public/uploads
    if (!fs.existsSync(filePath)) {
      filePath = path.join(__dirname, '..', 'public', 'images', filename);
    }

    if (!fs.existsSync(filePath)) {
      console.warn(`⚠️ Warning: Local image file not found for "${product.name}" (${filename}). Skipping...`);
      continue;
    }

    console.log(`📤 Uploading image for "${product.name}" (${filename}) to Cloudinary...`);
    
    try {
      const uploadResult = await cloudinary.uploader.upload(filePath, {
        folder: 'gamerzone',
        public_id: Date.now() + '-' + filename.split('.')[0]
      });
      
      const secureUrl = uploadResult.secure_url;
      console.log(`✅ Uploaded successfully: ${secureUrl}`);

      console.log(`💾 Updating database path for product ID ${product.pid}...`);
      await pool.request()
        .input('pid', sql.Int, product.pid)
        .input('img', sql.NVarChar(255), secureUrl)
        .query('UPDATE Product SET img = @img WHERE pid = @pid');
      
      console.log(`🎉 Product "${product.name}" successfully migrated!`);
    } catch (uploadErr) {
      console.error(`❌ Error migrating product "${product.name}":`, uploadErr.message);
    }
  }

  console.log('🏁 Migration process completed.');
  process.exit(0);
}

run().catch(err => {
  console.error('❌ Migration failed:', err);
  process.exit(1);
});
