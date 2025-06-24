const express = require('express');
const router = express.Router();
const { getAllProducts, createProduct } = require('../controllers/productController');
const { protect, isAdmin } = require('../middleware/authMiddleware');
const Product = require('../models/Product'); // Mongoose model

// GET /api/products/:id — Public route
router.get('/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: "Product not found" });
    res.json(product);
  } catch (error) {
    console.error("Product fetch error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// GET /api/products — Public route
router.get('/', getAllProducts);

// POST /api/products — Admin only
router.post('/', protect, isAdmin, createProduct);

module.exports = router;
