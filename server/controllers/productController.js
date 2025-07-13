const Product = require('../models/Product');
const Order = require('../models/Order');
const fs = require('fs');
const path = require('path');

// @desc    Get admin dashboard stats
// @route   GET /api/admin/stats
// @access  Private/Admin
exports.getAdminStats = async (req, res) => {
  try {
    const [
      totalProducts,
      totalOrders,
      pendingOrders,
      completedOrders
    ] = await Promise.all([
      Product.countDocuments(),
      Order.countDocuments(),
      Order.countDocuments({ status: 'pending' }),
      Order.countDocuments({ status: 'completed' })
    ]);

    res.json({
      success: true,
      data: {
        totalProducts,
        totalOrders,
        pendingOrders,
        completedOrders
      }
    });
  } catch (error) {
    console.error('Admin stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error while fetching stats'
    });
  }
};

// @desc    Export orders to CSV
// @route   GET /api/admin/orders/export
// @access  Private/Admin
exports.exportOrdersCSV = async (req, res) => {
  try {
    const orders = await Order.find({})
      .populate('user', 'name email')
      .sort({ createdAt: -1 });

    let csv = 'Order ID,Date,Customer,Total,Status\n';
    orders.forEach(order => {
      csv += `"${order._id}","${order.createdAt.toISOString()}","${order.user.name}","${order.totalPrice}","${order.status}"\n`;
    });

    res.header('Content-Type', 'text/csv');
    res.attachment('orders-export.csv');
    res.send(csv);
  } catch (error) {
    console.error('Order export error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error during order export'
    });
  }
};