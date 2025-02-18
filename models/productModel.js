const { Schema, model } = require('mongoose');

const productSchema = new Schema(
  {
    sellerId: {
      type: Schema.ObjectId,
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
    },
    category: {
      type: String,
      required: true,
    },
    brand: {
      type: String,
      required: true,
      default: 'Default Brand', // ✅ Default value added
    },
    price: {
      type: Number,
      required: true,
    },
    stock: {
      type: Number,
      required: true,
      default: 0,
    },
    discount: {
      type: Number,
      required: false,
    },
    description: {
      type: String,
      required: true,
      default: 'none',
    },
    shopName: {
      type: String,
      required: true,
      default: 'None Store', // ✅ Default value added
    },
    images: {
      type: Array,
      required: true,
    },
    rating: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

productSchema.index(
  {
    name: 'text',
    category: 'text',
    brand: 'text',
    description: 'text',
  },
  {
    weights: {
      name: 5,
      category: 4,
      brand: 3,
      description: 2,
    },
  }
);

module.exports = model('products', productSchema);
