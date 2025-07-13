const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: [true, 'Product name is required'],
    trim: true,
    maxlength: [100, 'Product name cannot exceed 100 characters']
  },
  type: { 
    type: String, 
    required: [true, 'Product type is required'],
    enum: {
      values: ['flower', 'green_leaf'],
      message: 'Please select either flower or green_leaf'
    }
  },
  price: { 
    type: Number, 
    required: [true, 'Product price is required'],
    min: [0, 'Price must be at least 0']
  },
  stock: { 
    type: Number, 
    default: 0,
    min: [0, 'Stock cannot be negative']
  },
  image: { 
    type: String, 
    required: [true, 'Product image is required']
  },
  description: { 
    type: String, 
    trim: true,
    maxlength: [1000, 'Description cannot exceed 1000 characters']
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Product', productSchema);