const express = require('express');
const router = express.Router();
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const Product = require('../models/Product');
const { protect, isAdmin } = require('../middleware/authMiddleware');

// ===== Cloudinary Config =====
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// ===== Multer Storage for Cloudinary =====
const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'products', // Cloudinary folder name
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
    transformation: [{ width: 800, height: 800, crop: 'limit' }]
  }
});

const upload = multer({ storage });

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
router.delete('/:id', protect, isAdmin, async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({
        success: false,
        error: 'Product not found'
      });
    }

    // Delete from Cloudinary if image exists
    if (product.image) {
      try {
        // Extract public_id from the image URL
        const publicId = product.image.split('/').pop().split('.')[0];
        await cloudinary.uploader.destroy(`products/${publicId}`);
        console.log('Deleted Cloudinary image:', publicId);
      } catch (cloudErr) {
        console.error('Error deleting Cloudinary image:', cloudErr);
      }
    }

    await Product.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
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
      error: 'Server error during product deletion'
    });
  }
});

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
