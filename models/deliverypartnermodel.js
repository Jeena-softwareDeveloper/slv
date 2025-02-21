const { Schema, model } = require('mongoose');

const deliveryPartnerSchema = new Schema(
  {
    sellerId: {
      type: Schema.ObjectId,
      required: true,
    },
    driverName: {
      type: String,
      required: true,
    },
    driverAddress: {
      type: String,
      required: true,
    },
    vehicleName: {
      type: String,
      required: true,
    },
    vehicleNumber: {
      type: String,
      required: true,
      unique: true,
    },
    vehicleImages: {
      type: [String],
      required: true,
    },
    licenceImage: {
      type: String,
      required: true,
    },
    // Optionally include a rating field or status, if needed
    rating: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

// Create a text index for search functionality if needed
deliveryPartnerSchema.index(
  {
    driverName: 'text',
    vehicleName: 'text',
    vehicleNumber: 'text',
    driverAddress: 'text',
  },
  {
    weights: {
      driverName: 5,
      vehicleName: 4,
      vehicleNumber: 3,
      driverAddress: 2,
    },
  }
);

module.exports = model('deliverypartners', deliveryPartnerSchema);
