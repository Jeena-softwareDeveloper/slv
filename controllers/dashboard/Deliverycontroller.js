const formidable = require('formidable');
const cloudinary = require('cloudinary').v2;
const deliveryPartnerModel = require('../../models/deliverypartnermodel'); // Ensure you have this model created
const { responseReturn } = require('../../utiles/response');

// Centralize Cloudinary Configuration
cloudinary.config({
    cloud_name: process.env.cloud_name,
    api_key: process.env.api_key,
    api_secret: process.env.api_secret,
    secure: true,
});

class DeliveryPartnerController {
    // Create a new delivery partner (vehicle)
    add_delivery_partner = async (req, res) => {
        console.log("Received request to add delivery partner");
        const { id } = req; // Assuming id is the seller's id
        const form = formidable({ multiples: true });

        const parseForm = (req) =>
            new Promise((resolve, reject) => {
                form.parse(req, (err, fields, files) => {
                    if (err) reject(err);
                    else resolve({ fields, files });
                });
            });

        try {
            console.log("Parsing form data...");
            const { fields, files } = await parseForm(req);
            console.log("Form data parsed successfully:", fields);

            let { driverName, driverAddress, vehicleName, vehicleNumber } = fields;
            const { vehicleImages, licenceImage } = files;

            // Validate required fields
            if (!driverName || !driverAddress || !vehicleName || !vehicleNumber || !vehicleImages || !licenceImage) {
                console.error("Missing required fields: driverName, driverAddress, vehicleName, vehicleNumber, vehicleImages or licenceImage");
                responseReturn(res, 400, { error: 'Missing required fields' });
                return;
            }

            // Trim string inputs
            driverName = driverName.trim();
            driverAddress = driverAddress.trim();
            vehicleName = vehicleName.trim();
            vehicleNumber = vehicleNumber.trim();

            // Process vehicle images (support multiple files)
            const vehicleImagesArray = Array.isArray(vehicleImages) ? vehicleImages : [vehicleImages];
            console.log("Uploading vehicle images to Cloudinary...");
            const vehicleUploadPromises = vehicleImagesArray.map((image) =>
                cloudinary.uploader.upload(image.filepath, { folder: 'vehicles' })
            );
            const vehicleUploadResults = await Promise.all(vehicleUploadPromises);
            console.log("Vehicle images uploaded successfully:", vehicleUploadResults);
            const allVehicleImageUrls = vehicleUploadResults.map((result) => result.url);

            // Process licence image (only one file expected)
            console.log("Uploading licence image to Cloudinary...");
            const licenceUploadResult = await cloudinary.uploader.upload(licenceImage.filepath, { folder: 'vehicles/licences' });
            console.log("Licence image uploaded successfully:", licenceUploadResult);
            const licenceImageUrl = licenceUploadResult.url;

            // Create delivery partner record in database
            console.log("Creating delivery partner in the database...");
            await deliveryPartnerModel.create({
                sellerId: id,
                driverName,
                driverAddress,
                vehicleName,
                vehicleNumber,
                vehicleImages: allVehicleImageUrls,
                licenceImage: licenceImageUrl,
            });

            console.log("Delivery partner added successfully");
            responseReturn(res, 201, { message: 'Delivery partner added successfully' });
        } catch (error) {
            console.error("Error in adding delivery partner:", error.message);
            responseReturn(res, 500, { error: error.message });
        }
    };

    // Get paginated delivery partners
    deliveryPartners_get = async (req, res) => {
        console.log("Fetching delivery partners...");
        const { page = 1, searchValue = '', parPage = 10 } = req.query;
        const { id } = req; // Seller id

        const limit = parseInt(parPage);
        const skipPage = limit * (parseInt(page) - 1);

        try {
            const query = searchValue
                ? {
                      $text: { $search: searchValue },
                      sellerId: id,
                  }
                : { sellerId: id };

            console.log("Querying delivery partners with:", query);

            const [partners, totalPartners] = await Promise.all([
                deliveryPartnerModel.find(query).skip(skipPage).limit(limit).sort({ createdAt: -1 }),
                deliveryPartnerModel.find(query).countDocuments(),
            ]);

            console.log("Delivery partners fetched successfully");
            responseReturn(res, 200, { totalPartners, partners });
        } catch (error) {
            console.error("Error fetching delivery partners:", error.message);
            responseReturn(res, 500, { error: error.message });
        }
    };

    // Get single delivery partner details
    deliveryPartner_get = async (req, res) => {
        console.log("Fetching single delivery partner...");
        const { partnerId } = req.params;
        try {
            const partner = await deliveryPartnerModel.findById(partnerId);
            if (!partner) {
                console.error("Delivery partner not found");
                responseReturn(res, 404, { error: 'Delivery partner not found' });
                return;
            }
            console.log("Delivery partner fetched successfully");
            responseReturn(res, 200, { partner });
        } catch (error) {
            console.error("Error fetching delivery partner:", error.message);
            responseReturn(res, 500, { error: error.message });
        }
    };

    // Update delivery partner details (excluding images)
    deliveryPartner_update = async (req, res) => {
        console.log("Updating delivery partner...");
        const { partnerId, driverName, driverAddress, vehicleName, vehicleNumber } = req.body;

        try {
            const updateData = {
                driverName: driverName.trim(),
                driverAddress: driverAddress.trim(),
                vehicleName: vehicleName.trim(),
                vehicleNumber: vehicleNumber.trim(),
            };

            const partner = await deliveryPartnerModel.findByIdAndUpdate(partnerId, updateData, { new: true });
            if (!partner) {
                console.error("Delivery partner not found");
                responseReturn(res, 404, { error: 'Delivery partner not found' });
                return;
            }

            console.log("Delivery partner updated successfully");
            responseReturn(res, 200, { partner, message: 'Delivery partner updated successfully' });
        } catch (error) {
            console.error("Error updating delivery partner:", error.message);
            responseReturn(res, 500, { error: error.message });
        }
    };

    // Update delivery partner images (vehicle or licence)
    deliveryPartner_image_update = async (req, res) => {
        console.log("Updating delivery partner image...");
        const form = formidable({ multiples: true });

        const parseForm = (req) =>
            new Promise((resolve, reject) => {
                form.parse(req, (err, fields, files) => {
                    if (err) reject(err);
                    else resolve({ fields, files });
                });
            });

        try {
            const { fields, files } = await parseForm(req);
            const { partnerId, imageType, oldImage } = fields;
            // imageType should be either "vehicle" or "licence"
            const { newImage } = files;

            if (!newImage) {
                console.error("New image is required");
                responseReturn(res, 400, { error: 'New image is required' });
                return;
            }

            // Set folder based on image type
            const folder = imageType === 'licence' ? 'vehicles/licences' : 'vehicles';
            const uploadResult = await cloudinary.uploader.upload(newImage.filepath, { folder });
            const partner = await deliveryPartnerModel.findById(partnerId);

            if (!partner) {
                console.error("Delivery partner not found");
                responseReturn(res, 404, { error: 'Delivery partner not found' });
                return;
            }

            if (imageType === 'vehicle') {
                const index = partner.vehicleImages.findIndex((img) => img === oldImage);
                if (index === -1) {
                    console.error("Old vehicle image not found");
                    responseReturn(res, 400, { error: 'Old vehicle image not found' });
                    return;
                }
                partner.vehicleImages[index] = uploadResult.url;
            } else if (imageType === 'licence') {
                partner.licenceImage = uploadResult.url;
            } else {
                console.error("Invalid image type");
                responseReturn(res, 400, { error: 'Invalid image type' });
                return;
            }

            await partner.save();

            console.log("Delivery partner image updated successfully");
            responseReturn(res, 200, { partner, message: 'Image updated successfully' });
        } catch (error) {
            console.error("Error updating image:", error.message);
            responseReturn(res, 500, { error: error.message });
        }
    };

    // Delete a delivery partner and its images
    deliveryPartner_delete = async (req, res) => {
        console.log("Deleting delivery partner...");
        const { partnerId } = req.params;

        try {
            // Find the delivery partner by ID
            const partner = await deliveryPartnerModel.findById(partnerId);
            if (!partner) {
                console.error("Delivery partner not found");
                responseReturn(res, 404, { error: 'Delivery partner not found' });
                return;
            }

            // Delete vehicle images from Cloudinary
            console.log("Deleting vehicle images from Cloudinary...");
            const deleteVehiclePromises = partner.vehicleImages.map((imageUrl) => {
                const publicId = imageUrl.split('/').pop().split('.')[0];
                return cloudinary.uploader.destroy(`vehicles/${publicId}`);
            });

            // Delete licence image from Cloudinary
            const licencePublicId = partner.licenceImage.split('/').pop().split('.')[0];
            const deleteLicencePromise = cloudinary.uploader.destroy(`vehicles/licences/${licencePublicId}`);

            await Promise.all([...deleteVehiclePromises, deleteLicencePromise]);

            // Remove the delivery partner from the database
            console.log("Deleting delivery partner from the database...");
            await deliveryPartnerModel.findByIdAndDelete(partnerId);

            console.log("Delivery partner deleted successfully");
            responseReturn(res, 200, { message: 'Delivery partner deleted successfully' });
        } catch (error) {
            console.error("Error deleting delivery partner:", error.message);
            responseReturn(res, 500, { error: error.message });
        }
    };
}

module.exports = new DeliveryPartnerController();
