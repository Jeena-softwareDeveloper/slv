const mongoose = require('mongoose');

const razorpaySchema = new mongoose.Schema({
    sellerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Seller' },
    razorpayAccountId: String,
    code: String,
    createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Razorpay', razorpaySchema);
