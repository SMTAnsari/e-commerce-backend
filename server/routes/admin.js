const express = require('express');
const { protect, isAdmin  } = require('../middleware/authMiddleware');
const { getAdminStats,exportOrdersCSV } = require('../controllers/adminController');
const {
  getAllOrders,
  updateOrderStatus,
  getAllProducts,
  updateProduct,
  deleteProduct
} = require('../controllers/adminController');

const router = express.Router();

// Orders
router.get('/orders', protect, isAdmin, getAllOrders);
router.patch('/orders/:id', protect, isAdmin, updateOrderStatus);
router.get('/stats', protect, isAdmin, getAdminStats);
// Products
router.get('/orders/export', protect, isAdmin, exportOrdersCSV);
router.get('/products', protect, isAdmin, getAllProducts);
router.put('/products/:id', protect, isAdmin, updateProduct);
router.delete('/products/:id', protect, isAdmin, deleteProduct);

module.exports = router;
