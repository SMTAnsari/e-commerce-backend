const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: { type: String, required: true },
  type: { type: String, enum: ['flower', 'green_leaf'], required: true },
  price: { type: Number, required: true },
  stock: { type: Number, default: 0 },
  image: { type: String, required: true },
  description: { type: String, default: '' }
}, { timestamps: true });

module.exports = mongoose.model('Product', productSchema);
