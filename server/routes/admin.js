const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path'); // Added path module
const Product = require('../models/Product');
const { protect, isAdmin } = require('../middleware/authMiddleware');
const { getAdminStats } = require('../controllers/adminController');
const {
  getAllOrders,
  updateOrderStatus,
  getAllProducts,
  updateProduct,
  deleteProduct
} = require('../controllers/adminController');
const { storage, cloudinary } = require('../utils/cloudinary');

// Helper functions
const isCloudinaryUrl = (url) => {
  return url && (url.startsWith('http://') || url.startsWith('https://'));
};

const extractPublicId = (url) => {
  if (!url) return null;
  
  // Handle Cloudinary URLs
  if (url.includes('res.cloudinary.com')) {
    const parts = url.split('/');
    const uploadIndex = parts.indexOf('upload');
    if (uploadIndex !== -1) {
      return parts.slice(uploadIndex + 1).join('/').split('.')[0];
    }
  }
  
  // Handle local paths
  return path.basename(url).split('.')[0];
};

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
    try {
      console.log('Received file:', req.file);
      
      // Access fields directly from req.body
      const { name, price, stock, type, description } = req.body;

      // Check for required fields
      if (!req.file || !name || !price || !type) {
        return res.status(400).json({
          success: false,
          error: 'Product validation failed: ' +
            `${!req.file ? 'Image is required, ' : ''}` +
            `${!price ? 'Price is required, ' : ''}` +
            `${!type ? 'Type is required, ' : ''}` +
            `${!name ? 'Name is required' : ''}`
        });
      }

      const product = new Product({
        name,
        price: parseFloat(price),
        stock: stock ? parseInt(stock) : 0,
        type,
        description,
        image: req.file.path
      });
      
      // Bypass validation for Cloudinary URLs
      if (isCloudinaryUrl(req.file.path)) {
        product.$ignore('image');
      }

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
          success: false,
          error: messages.join(', ')
        });
      }

      res.status(500).json({
        success: false,
        error: error.message || 'Server error during product creation'
      });
    }
  }
);

// Temporary test route
router.get('/test-cloudinary', async (req, res) => {
  try {
    const result = await cloudinary.uploader.upload('https://res.cloudinary.com/demo/image/upload/sample.jpg', {
      folder: 'buraq-products'
    });
    res.json({
      success: true,
      result
    });
  } catch (err) {
    console.error('Cloudinary test error:', err);
    res.status(500).json({
      success: false,
      error: err.message
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
        // Delete old image from Cloudinary if it exists
        if (product.image) {
          try {
            const publicId = extractPublicId(product.image);
            if (publicId) {
              await cloudinary.uploader.destroy(publicId);
              console.log(`Deleted old image: ${publicId}`);
            }
          } catch (err) {
            console.error('Error deleting old image:', err);
          }
        }
        product.image = req.file.path; // New Cloudinary URL
        
        // Bypass validation for Cloudinary URLs
        if (isCloudinaryUrl(req.file.path)) {
          product.$ignore('image');
        }
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
        error: error.message || 'Server error during product update'
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
      try {
        const publicId = extractPublicId(product.image);
        if (publicId) {
          await cloudinary.uploader.destroy(publicId);
          console.log(`Deleted image: ${publicId}`);
        }
      } catch (err) {
        console.error('Error deleting image:', err);
      }
    }

    await product.deleteOne();

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
      error: error.message || 'Server error during product deletion'
    });
  }
});

module.exports = router;