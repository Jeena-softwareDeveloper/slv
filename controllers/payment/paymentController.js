
const sellerModel = require('../../models/sellerModel')
const sellerWallet = require('../../models/sellerWallet')
const myShopWallet = require('../../models/myShopWallet')
const withdrowRequest = require('../../models/withdrowRequest')
const { responseReturn } = require('../../utiles/response')
const { mongo: { ObjectId } } = require('mongoose')
const { v4: uuidv4 } = require('uuid')
const Razorpay = require('razorpay');
const razorpayModel = require('../../models/razorpayModel');
const crypto = require('crypto');


const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_SECRET_KEY,
});
class PaymentController {
   create_razorpay_account = async (req, res) => {
    const { id } = req;
    const uid = uuidv4(); // Unique identifier

    try {
        const razorpayInfo = await razorpayModel.findOne({ sellerId: id });  // Ensure this is the correct model

        if (razorpayInfo) {
            await razorpayModel.deleteOne({ sellerId: id });
        }

        const accountLink = `https://dashboard.razorpay.com/app/onboarding?return_url=http://localhost:3001/success?activeCode=${uid}`;

        await razorpayModel.create({
            sellerId: id,
            razorpayAccountId: `razorpay_account_${uid}`, // Simulating an account ID
            code: uid,
        });

        responseReturn(res, 201, { url: accountLink });
    } catch (error) {
        console.log("razorpay api error",error);
        
        console.error('Razorpay connect account creation error:', error.message);
        responseReturn(res, 500, { message: 'Internal server error' });
    }
};


    activate_razorpay_account    = async (req, res) => {
        const { activeCode } = req.params;
        const { id } = req;
        try {
            const userRazorpayInfo = await striptModel.findOne({ code: activeCode });
            if (userRazorpayInfo) {
                await sellerModel.findByIdAndUpdate(id, {
                    payment: 'active',
                });
                responseReturn(res, 200, { message: 'Payment activated' });
            } else {
                responseReturn(res, 404, { message: 'Payment activation failed' });
            }
        } catch (error) {
            responseReturn(res, 500, { message: 'Internal server error' });
        }
    };

    sunAmount = (data) => {
        return data.reduce((sum, item) => sum + item.amount, 0);
    };

    get_seller_payment_details = async (req, res) => {
        const { sellerId } = req.params;

        try {
            const payments = await sellerWallet.find({ sellerId });

            const pendingWithdrawals = await withdrowRequest.find({
                sellerId,
                status: 'pending',
            });

            const successfulWithdrawals = await withdrowRequest.find({
                sellerId,
                status: 'success',
            });

            const pendingAmount = this.sunAmount(pendingWithdrawals);
            const withdrawalAmount = this.sunAmount(successfulWithdrawals);
            const totalAmount = this.sunAmount(payments);

            const availableAmount = totalAmount - (pendingAmount + withdrawalAmount);

            responseReturn(res, 200, {
                totalAmount,
                pendingAmount,
                withdrawalAmount,
                availableAmount,
                successfulWithdrawals,
                pendingWithdrawals,
            });
        } catch (error) {
            console.log(error.message);
            responseReturn(res, 500, { message: 'Internal server error' });
        }
    };

    withdrawal_request = async (req, res) => {
        const { amount, sellerId } = req.body;

        try {
            const withdrawal = await withdrowRequest.create({
                sellerId,
                amount: parseInt(amount),
            });
            responseReturn(res, 200, { withdrawal, message: 'Withdrawal request sent' });
        } catch (error) {
            responseReturn(res, 500, { message: 'Internal server error' });
        }
    };

    get_payment_request = async (req, res) => {
        try {
            const withdrawalRequest = await withdrowRequest.find({ status: 'pending' });
            responseReturn(res, 200, { withdrawalRequest });
        } catch (error) {
            responseReturn(res, 500, { message: 'Internal server error' });
        }
    };

    payment_request_confirm = async (req, res) => {
        const { paymentId } = req.body;

        try {
            const payment = await withdrowRequest.findById(paymentId);
            const { razorpayAccountId } = await striptModel.findOne({
                sellerId: payment.sellerId,
            });

            // Simulate a transfer using Razorpay's Payouts API
            const payout = await razorpay.transfers.create({
                account: razorpayAccountId,
                amount: payment.amount * 100, // Convert to paise
                currency: 'INR',
            });

            await withdrowRequest.findByIdAndUpdate(paymentId, { status: 'success' });
            responseReturn(res, 200, { payout, message: 'Request confirmed successfully' });
        } catch (error) {
            console.log(error.message);
            responseReturn(res, 500, { message: 'Internal server error' });
        }
    };
}

module.exports = new PaymentController();
