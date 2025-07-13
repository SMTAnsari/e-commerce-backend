const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const Product = require('../models/Product');
const { protect, isAdmin } = require('../middleware/authMiddleware');
const { getAdminStats,exportOrdersCSV } = require('../controllers/adminController');
const {
  getAllOrders,
  updateOrderStatus,
  getAllProducts,
  updateProduct,
  deleteProduct
} = require('../controllers/adminController');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/products/');
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, `product-${uniqueSuffix}${ext}`);
  }
});

const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed!'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
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
        // TODO: Delete old image file from server
        product.image = `/uploads/products/${req.file.filename}`;
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

    // TODO: Delete the associated image file from server
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