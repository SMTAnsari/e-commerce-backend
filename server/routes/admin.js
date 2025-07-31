const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const Product = require('../models/Product');
const { protect, isAdmin } = require('../middleware/authMiddleware');
const { getAdminStats, exportOrdersCSV } = require('../controllers/adminController');
const {
  getAllOrders,
  updateOrderStatus,
  getAllProducts,
  updateProduct,
  deleteProduct
} = require('../controllers/adminController');
const { storage } = require('../utils/cloudinary'); // Import Cloudinary storage

// Configure multer with Cloudinary storage
const upload = multer({ 
  storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'), false);
    }
  },
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB
});

router.get('/orders', protect, isAdmin, getAllOrders);
router.patch('/orders/:id', protect, isAdmin, updateOrderStatus);

// @desc    Get all products (admin view)
// @route   GET /api/admin/products
// @access  Private/Admin
router.get('/products', protect, isAdmin, async (req, res) => {
  try {
    const products = await Product.find({}).sort({ createdAt: -1 });
    res.json({
      success: true,
      count: products.length,
      data: products
    });
  } catch (error) {
    console.error('Admin product fetch error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error while fetching products'
    });
  }
});

// @desc    Create a new product
// @route   POST /api/admin/products
// @access  Private/Admin
router.post(
  '/products',
  protect,
  isAdmin,
  upload.single('image'),
  async (req, res) => {
    console.log('Request body:', req.body);
    console.log('Request file:', req.file);
    try {
      const { name, price, stock, type, description } = req.body;

      // Check for required fields
      if (!req.file || !name || !price || !type) {
        return res.status(400).json({
          message: 'Failed to create product',
          error: 'Product validation failed: ' +
            `${!req.file ? 'image: Path `image` is required., ' : ''}` +
            `${!price ? 'price: Path `price` is required., ' : ''}` +
            `${!type ? 'type: Path `type` is required., ' : ''}` +
            `${!name ? 'name: Path `name` is required.' : ''}`
        });
      }

      const product = new Product({
        name,
        price: parseFloat(price),
        stock: stock ? parseInt(stock) : 0,
        type,
        description,
        image: req.file.path // Cloudinary URL
      });

      await product.save();

      res.status(201).json({
        success: true,
        data: product
      });
    } catch (error) {
      console.error('Product creation error:', error);

      if (error.name === 'ValidationError') {
        const messages = Object.values(error.errors).map(val => val.message);
        return res.status(400).json({
          message: 'Failed to create product',
          error: messages.join(', ')
        });
      }

      res.status(500).json({
        message: 'Failed to create product',
        error: 'Server error during product creation'
      });
    }
  }
);

// @desc    Update product
// @route   PUT /api/admin/products/:id
// @access  Private/Admin
router.put(
  '/products/:id',
  protect,
  isAdmin,
  upload.single('image'),
  async (req, res) => {
    try {
      const { name, price, stock, type, description } = req.body;
      const productId = req.params.id;

      const product = await Product.findById(productId);
      if (!product) {
        return res.status(404).json({
          success: false,
          error: 'Product not found'
        });
      }

      // Update fields
      product.name = name || product.name;
      product.price = price ? parseFloat(price) : product.price;
      product.stock = stock ? parseInt(stock) : product.stock;
      product.type = type || product.type;
      product.description = description || product.description;

      // Update image if new file was uploaded
      if (req.file) {
        // Delete old image from Cloudinary if it exists
        if (product.image) {
          const publicId = product.image.split('/').pop().split('.')[0];
          await cloudinary.uploader.destroy(`buraq-products/${publicId}`);
        }
        product.image = req.file.path; // New Cloudinary URL
      }

      await product.save();

      res.json({
        success: true,
        data: product
      });
    } catch (error) {
      console.error('Product update error:', error);
      
      if (error.name === 'ValidationError') {
        const messages = Object.values(error.errors).map(val => val.message);
        return res.status(400).json({
          success: false,
          error: messages
        });
      }

      res.status(500).json({
        success: false,
        error: 'Server error during product update'
      });
    }
  }
);

router.get('/stats', protect, isAdmin, getAdminStats);

// @desc    Delete product
// @route   DELETE /api/admin/products/:id
// @access  Private/Admin
router.delete('/products/:id', protect, isAdmin, async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    
    if (!product) {
      return res.status(404).json({
        success: false,
        error: 'Product not found'
      });
    }

    // Delete the associated image from Cloudinary if it exists
    if (product.image) {
      const publicId = product.image.split('/').pop().split('.')[0];
      await cloudinary.uploader.destroy(`buraq-products/${publicId}`);
    }

    await product.remove();

    res.json({
      success: true,
      data: {}
    });
  } catch (error) {
    console.error('Product deletion error:', error);
    
    if (error.kind === 'ObjectId') {
      return res.status(404).json({
        success: false,
        error: 'Product not found'
      });
    }

    res.status(500).json({
      success: false,
      error: 'Server error during product deletion'
    });
  }
});

module.exports = router;