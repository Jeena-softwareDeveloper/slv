const router = require('express').Router();
const PaymentController = require('../controllers/payment/paymentController');
const { authMiddleware } = require('../middlewares/authMiddleware');

// Create Razorpay account
router.post('/payment/create-razorpay-account', authMiddleware, PaymentController.create_razorpay_account);

// Activate Razorpay account
router.put('/payment/activate-razorpay-account/:activeCode', authMiddleware, PaymentController.activate_razorpay_account);

// Get seller payment details
router.get('/payment/seller-payment-details/:sellerId', authMiddleware, PaymentController.get_seller_payment_details);

// Withdrawal request
router.post('/payment/withdrawal-request', authMiddleware, PaymentController.withdrawal_request);

// Get payment requests (for admin)
router.get('/payment/payment-requests', authMiddleware, PaymentController.get_payment_request);

// Confirm payment request (admin or authorized users)
router.post('/payment/payment-request-confirm', authMiddleware, PaymentController.payment_request_confirm);

module.exports = router;






