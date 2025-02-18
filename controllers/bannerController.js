const formidable = require('formidable')
const productModel = require('../models/productModel')
const cloudinary = require('cloudinary').v2
const { responseReturn } = require('../utiles/response')
const bannerModel = require('../models/bannerModel')
const { mongo: { ObjectId } } = require('mongoose')
class bannerController {
    add_banner = async (req, res) => {
        const form = formidable({ multiples: true })
        form.parse(req, async (err, field, files) => {
            const { productId } = field
            const { image } = files

            cloudinary.config({
                cloud_name: process.env.cloud_name,
                api_key: process.env.api_key,
                api_secret: process.env.api_secret,
                secure: true
            })

            try {
                const { slug } = await productModel.findById(productId)
                const result = await cloudinary.uploader.upload(image.filepath, { folder: 'banners' })
                const banner = await bannerModel.create({
                    productId,
                    banner: result.url,
                    link: slug
                })
                responseReturn(res, 201, { banner, message: "banner add success" })
            } catch (error) {
                console.log(error)
                responseReturn(res, 500, { message: error.message })
            }
        })
    }

    get_banner = async (req, res) => {
        const { productId } = req.params

        try {
            const banner = await bannerModel.findOne({ productId: new ObjectId(productId) })
            responseReturn(res, 200, { banner })
        } catch (error) {
            console.log(error)
            responseReturn(res, 500, { message: error.message })
        }
    }

    get_banners = async (req, res) => {

        try {
            const banners = await bannerModel.aggregate([
                {
                      $sample: {
                        size: 10
                    }
                }
            ])
            responseReturn(res, 200, { banners })
        } catch (error) {
            console.log(error)
            responseReturn(res, 500, { message: error.message })
        }
    }

    update_banner = async (req, res) => {
        const { bannerId } = req.params
        const form = formidable({})

        form.parse(req, async (err, _, files) => {
            const { image } = files

            cloudinary.config({
                cloud_name: process.env.cloud_name,
                api_key: process.env.api_key,
                api_secret: process.env.api_secret,
                secure: true
            })

            try {
                let banner = await bannerModel.findById(bannerId)
                let temp = banner.banner.split('/')
                temp = temp[temp.length - 1]
                const imageName = temp.split('.')[0]
                await cloudinary.uploader.destroy(imageName)

                const { url } = await cloudinary.uploader.upload(image.filepath, { folder: 'banners' })

                await bannerModel.findByIdAndUpdate(bannerId, {
                    banner: url
                })

                banner = await bannerModel.findById(bannerId)

                responseReturn(res, 200, { banner, message: "banner update success" })

            } catch (error) {
                console.log(error)
                responseReturn(res, 500, { message: error.message })
            }
        })
    }
    product_delete = async (req, res) => {
        console.log("Deleting product...");
        const { productId } = req.params;
    
        try {
            // Find the product by ID
            const product = await productModel.findById(productId);
            if (!product) {
                console.error("Product not found");
                responseReturn(res, 404, { error: 'Product not found' });
                return;
            }
    
            // Delete images from Cloudinary
            console.log("Deleting images from Cloudinary...");
            const deleteImagePromises = product.images.map((imageUrl) => {
                const publicId = imageUrl.split('/').pop().split('.')[0];
                return cloudinary.uploader.destroy(`products/${publicId}`);
            });
            await Promise.all(deleteImagePromises);
    
            // Remove the product from the database
            console.log("Deleting product from the database...");
            await productModel.findByIdAndDelete(productId);
    
            console.log("Product deleted successfully");
            responseReturn(res, 200, { message: 'Product deleted successfully' });
        } catch (error) {
            console.error("Error deleting product:", error.message);
            responseReturn(res, 500, { error: error.message });
        }
    };
    
}

module.exports = new bannerController()