// routes/products.js
const express = require('express');
const router = express.Router();
const Product = require('../models/Product');
const { protect, isAdmin } = require('../middleware/authMiddleware');
const upload = require('../middleware/multer'); // multer-storage-cloudinary setup

// Create product
router.post(
  '/',
  protect,
  isAdmin,
  (req, res, next) => {
    // Handle multer upload manually to catch errors
    upload.single('image')(req, res, (err) => {
      if (err) {
        console.error('Multer/Cloudinary error:', err);
        return res
          .status(400)
          .json({ success: false, error: err.message || 'Image upload failed' });
      }
      next();
    });
  },
  async (req, res) => {
    try {
      const { name, price, stock, type, description } = req.body;

      // Validate fields
      if (!name || !price || !type || !req.file) {
        return res.status(400).json({
          success: false,
          error: 'Name, price, type, and image are required',
        });
      }

      const product = new Product({
        name,
        price: parseFloat(price),
        stock: parseInt(stock) || 0,
        type,
        description: description || '',
        image: req.file.path,
      });

      await product.save();
      res.status(201).json({ success: true, data: product });
    } catch (error) {
      console.error('Product creation error:', error);
      res
        .status(500)
        .json({ success: false, error: error.message || 'Server error' });
    }
  }
);

// Get all products
router.get('/', async (req, res) => {
  try {
    const products = await Product.find();
    res.json({ success: true, data: products });
  } catch (error) {
    console.error('Fetch products error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get single product
router.get('/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res
        .status(404)
        .json({ success: false, error: 'Product not found' });
    }
    res.json({ success: true, data: product });
  } catch (error) {
    console.error('Fetch product error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update product
router.put(
  '/:id',
  protect,
  isAdmin,
  (req, res, next) => {
    upload.single('image')(req, res, (err) => {
      if (err) {
        console.error('Multer/Cloudinary error:', err);
        return res
          .status(400)
          .json({ success: false, error: err.message || 'Image upload failed' });
      }
      next();
    });
  },
  async (req, res) => {
    try {
      const updates = { ...req.body };
      if (req.file) updates.image = req.file.path;

      const product = await Product.findByIdAndUpdate(req.params.id, updates, {
        new: true,
        runValidators: true,
      });

      if (!product) {
        return res
          .status(404)
          .json({ success: false, error: 'Product not found' });
      }

      res.json({ success: true, data: product });
    } catch (error) {
      console.error('Update product error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

// Delete product
router.delete('/:id', protect, isAdmin, async (req, res) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) {
      return res
        .status(404)
        .json({ success: false, error: 'Product not found' });
    }
    res.json({ success: true, message: 'Product deleted' });
  } catch (error) {
    console.error('Delete product error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
