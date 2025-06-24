const express = require('express');
const {
  placeOrder,
  getMyOrders,
  getOrderById,
  getAllOrders,
  updateOrderStatus
} = require('../controllers/orderController');

const generateInvoice = require('../utils/invoiceGenerator');
const { protect, isAdmin } = require('../middleware/authMiddleware');
const Order = require('../models/Order');

const router = express.Router();


// ===========================
// 🔒 USER ROUTES
// ===========================

// 1. Place a new order
router.post('/', protect, placeOrder);

// 2. Get logged-in user's orders
router.get('/my-orders', protect, getMyOrders);

// 3. Get specific order by ID (user or admin)
router.get('/:id', protect, getOrderById);

// 4. Generate invoice for order (user/admin only)
router.get('/:id/invoice', protect, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id).populate('user', 'email');

    if (!order) return res.status(404).json({ message: 'Order not found' });

    // Ensure only admin or owner can access invoice
    if (req.user.role !== 'admin' && order.user._id.toString() !== req.user._id.toString()) {
  return res.status(403).json({ message: 'Not authorized' });
}


    generateInvoice(res, order);
  } catch (err) {
    console.error("Invoice generation error:", err);
    res.status(500).json({ message: "Failed to generate invoice" });
  }
});


// ===========================
// 🛠️ ADMIN ROUTES
// ===========================

// 5. Get all orders
router.get('/', protect, isAdmin, getAllOrders);

// 6. Update order status
router.put('/:id/status', protect, isAdmin, updateOrderStatus);


module.exports = router;
