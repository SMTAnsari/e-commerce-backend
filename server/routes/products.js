const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const Product = require('../models/Product');
const { protect, isAdmin } = require('../middleware/authMiddleware');

// Configure storage for product images
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/products/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, `product-${uniqueSuffix}${ext}`);
  }
});

// File filter for images only
const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed!'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

// @desc    Create new product
// @route   POST /api/products
// @access  Private/Admin
router.post(
  '/',
  protect,
  isAdmin,
  upload.single('image'),
  async (req, res) => {
    try {
      const { name, price, stock, type, description } = req.body;
      console.log('Received request body:', req.body);
      // Basic validation
      if (!name || !price || !type || !req.file) {
        return res.status(400).json({
          success: false,
          error: 'Name, price, type, and image are required fields'
        });
      }

      const product = new Product({
        name,
        price: parseFloat(price),
        stock: parseInt(stock) || 0,
        type,
        description: description || '',
        image: `/uploads/products/${req.file.filename}`
      });

      await product.save();

      res.status(201).json({
        success: true,
        data: product
      });
    } catch (error) {
      console.error('Product creation error:', error);
      
      // Handle mongoose validation errors
      if (error.name === 'ValidationError') {
        const messages = Object.values(error.errors).map(val => val.message);
        return res.status(400).json({
          success: false,
          error: messages
        });
      }

      res.status(500).json({
        success: false,
        error: 'Server error during product creation'
      });
    }
  }
);

// @desc    Get all products
// @route   GET /api/products
// @access  Public
router.get('/', async (req, res) => {
  try {
    const products = await Product.find({}).sort({ createdAt: -1 });
    res.json({
      success: true,
      count: products.length,
      data: products
    });
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({
      success: false,
      error: 'Server error while fetching products'
    });
  }
});


// @desc    Delete product
// @route   DELETE /api/products/:id
// @access  Private/Admin
router.delete(
  '/:id',
  protect,
  isAdmin,
  async (req, res) => {
    try {
      const product = await Product.findById(req.params.id);
      
      if (!product) {
        return res.status(404).json({
          success: false,
          error: 'Product not found'
        });
      }

      // Delete the associated image file if it exists
      if (product.image) {
        try {
          // Construct the correct path to the image
          const imagePath = path.join(__dirname, '..', product.image);
          
          // Check if file exists before trying to delete
          if (fs.existsSync(imagePath)) {
            fs.unlinkSync(imagePath);
            console.log('Deleted image file:', imagePath);
          } else {
            console.log('Image file not found:', imagePath);
          }
        } catch (fileError) {
          console.error('Error deleting image file:', fileError);
          // Continue with product deletion even if image deletion fails
        }
      }

      // Delete the product from database
      await Product.findByIdAndDelete(req.params.id);

      res.status(200).json({
        success: true,
        data: {},
        message: 'Product deleted successfully'
      });
    } catch (error) {
      console.error('Product deletion error:', error);
      
      if (error.name === 'CastError') {
        return res.status(400).json({
          success: false,
          error: 'Invalid product ID'
        });
      }

      res.status(500).json({
        success: false,
        error: 'Server error during product deletion',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

// @desc    Get single product
// @route   GET /api/products/:id
// @access  Public
router.get('/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    
    if (!product) {
      return res.status(404).json({
        success: false,
        error: 'Product not found'
      });
    }

    res.json({
      success: true,
      data: product
    });
  } catch (error) {
    console.error('Error fetching product:', error);
    
    if (error.kind === 'ObjectId') {
      return res.status(404).json({
        success: false,
        error: 'Product not found'
      });
    }

    res.status(500).json({
      success: false,
      error: 'Server error while fetching product'
    });
  }
});

module.exports = router;