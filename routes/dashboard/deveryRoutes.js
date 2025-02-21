const router = require('express').Router();
const { authMiddleware } = require('../../middlewares/authMiddleware');
const deliveryPartnerController = require('../../controllers/dashboard/Deliverycontroller');

// Route to add a new delivery partner (vehicle)
router.post('/delivery-partner-add', authMiddleware, deliveryPartnerController.add_delivery_partner);

// Route to get paginated delivery partners
router.get('/delivery-partners-get', authMiddleware, deliveryPartnerController.deliveryPartners_get);

// Route to get a single delivery partner by ID
router.get('/delivery-partner-get/:partnerId', authMiddleware, deliveryPartnerController.deliveryPartner_get);

// Route to update delivery partner details (excluding images)
router.post('/delivery-partner-update', authMiddleware, deliveryPartnerController.deliveryPartner_update);

// Route to update a delivery partner image (vehicle or licence)
router.post('/delivery-partner-image-update', authMiddleware, deliveryPartnerController.deliveryPartner_image_update);

// Route to delete a delivery partner
router.delete('/delivery-partner/:partnerId', authMiddleware, deliveryPartnerController.deliveryPartner_delete);

module.exports = router;
