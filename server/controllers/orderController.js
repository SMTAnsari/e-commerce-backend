const Order = require('../models/Order');
const Product = require('../models/Product');

// POST /api/orders - place order
exports.placeOrder = async (req, res) => {
  try {
    
    const { orderItems, totalAmount, paymentMethod, address  } = req.body;

    if (!orderItems || orderItems.length === 0) {
      return res.status(400).json({ message: 'No items to order' });
    }
  if (!address) {
      return res.status(400).json({ message: 'Address is required' });
    }

    for (const item of orderItems) {
      const product = await Product.findById(item.product);
      if (!product) {
        return res.status(404).json({ message: `Product not found: ${item.name}` });
      }

      if (product.stock < item.quantity) {
        return res.status(400).json({
          message: `Insufficient stock for product: ${product.name}. Available: ${product.stock}`,
        });
      }
    }

    for (const item of orderItems) {
      await Product.findByIdAndUpdate(item.product, {
        $inc: { stock: -item.quantity },
      });
    }

    const order = await Order.create({
      user: req.user._id,
      orderItems,
      totalAmount,
      paymentMethod,
      address,
      isPaid: paymentMethod !== 'cash' // simulate payment
    });

    res.status(201).json(order);
  } catch (err) {
    res.status(500).json({ message: 'Order failed', error: err.message });
  }
};

// GET /api/orders - get user's orders
exports.getMyOrders = async (req, res) => {
  const orders = await Order.find({ user: req.user._id });
  res.json(orders);
};

// PATCH /api/orders/:id - admin: update status
exports.updateOrderStatus = async (req, res) => {
  const { status } = req.body;
  const order = await Order.findById(req.params.id);
  if (!order) return res.status(404).json({ message: 'Order not found' });

  order.status = status;
  await order.save();

  res.json({ message: 'Order status updated', order });
};



// const Order = require('../models/Order');

// POST /api/orders - place order
exports.createOrder = async (req, res) => {
  try {
    const { orderItems, totalAmount, paymentMethod, address } = req.body;

    const order = await Order.create({
      user: req.user.id,
      orderItems,
      totalAmount,
      paymentMethod,
      address,
    });

    res.status(201).json(order);
  } catch (err) {
    res.status(400).json({ message: 'Failed to create order', error: err.message });
  }
};

// GET /api/orders/my-orders
exports.getMyOrders = async (req, res) => {
  try {
    const orders = await Order.find({ user: req.user.id }).sort({ createdAt: -1 });
    res.json(orders);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch orders', error: err.message });
  }
};

// GET /api/orders/:id
exports.getOrderById = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id).populate('user', 'name email');
    if (!order) return res.status(404).json({ message: 'Order not found' });

    if (req.user.role !== 'admin' && order.user._id.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    res.json(order);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching order', error: err.message });
  }
};

// GET /api/orders - Admin only
exports.getAllOrders = async (req, res) => {
  try {
    const orders = await Order.find().populate('user', 'name email').sort({ createdAt: -1 });
    res.json(orders);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching all orders' });
  }
};

// PUT /api/orders/:id/status - Admin only
exports.updateOrderStatus = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: "Order not found" });

    const { status } = req.body;
    order.status = status;

    // ✅ Set payment as paid if status is delivered
    if (status === "delivered" && !order.isPaid) {
      order.isPaid = true;
    }

    await order.save();
    res.json({ message: "Order updated", order });
  } catch (err) {
    console.error("Update error:", err);
    res.status(500).json({ message: "Failed to update order" });
  }
};
