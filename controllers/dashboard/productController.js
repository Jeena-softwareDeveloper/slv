const formidable = require('formidable');
const cloudinary = require('cloudinary').v2;
const productModel = require('../../models/productModel');
const { responseReturn } = require('../../utiles/response');

// Centralize Cloudinary Configuration
cloudinary.config({
    cloud_name: process.env.cloud_name,
    api_key: process.env.api_key,
    api_secret: process.env.api_secret,
    secure: true,
});



class ProductController {
    add_product = async (req, res) => {
        console.log("Received request to add product"); // Log entry point
        const { id } = req;
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
    
            let { name, category, stock, price } = fields;
            const { images } = files;
    
            if (!name || !category || !stock || !price || !images) {
                console.error("Missing required fields: name, category, stock, price, or images");
                responseReturn(res, 400, { error: 'Missing required fields' });
                return;
            }
    
            name = name.trim();
            const slug = name.split(' ').join('-');
            const imagesArray = Array.isArray(images) ? images : [images];
    
            console.log("Uploading images to Cloudinary...");
            const uploadPromises = imagesArray.map((image) =>
                cloudinary.uploader.upload(image.filepath, { folder: 'products' })
            );
    
            const uploadResults = await Promise.all(uploadPromises);
            console.log("Images uploaded successfully:", uploadResults);
    
            const allImageUrl = uploadResults.map((result) => result.url);
    
            console.log("Creating product in the database...");
            await productModel.create({
                sellerId: id,
                name,
                slug,
                category: category.trim(),
                stock: parseInt(stock),
                price: parseFloat(price),
                images: allImageUrl,
            });
    
            console.log("Product added successfully");
            responseReturn(res, 201, { message: 'Product added successfully' });
        } catch (error) {
            console.error("Error in adding product:", error.message);
            responseReturn(res, 500, { error: error.message });
        }
    };
    

    products_get = async (req, res) => {
        console.log("Fetching products...");
        const { page = 1, searchValue = '', parPage = 10 } = req.query;
        const { id } = req;

        const limit = parseInt(parPage);
        const skipPage = limit * (parseInt(page) - 1);

        try {
            const query = searchValue
                ? {
                      $text: { $search: searchValue },
                      sellerId: id,
                  }
                : { sellerId: id };

            console.log("Querying products with:", query);

            const [products, totalProduct] = await Promise.all([
                productModel.find(query).skip(skipPage).limit(limit).sort({ createdAt: -1 }),
                productModel.find(query).countDocuments(),
            ]);

            console.log("Products fetched successfully");
            responseReturn(res, 200, { totalProduct, products });
        } catch (error) {
            console.error("Error fetching products:", error.message);
            responseReturn(res, 500, { error: error.message });
        }
    };

    product_get = async (req, res) => {
        console.log("Fetching single product...");
        const { productId } = req.params;
        try {
            const product = await productModel.findById(productId);
            if (!product) {
                console.error("Product not found");
                responseReturn(res, 404, { error: 'Product not found' });
                return;
            }
            console.log("Product fetched successfully");
            responseReturn(res, 200, { product });
        } catch (error) {
            console.error("Error fetching product:", error.message);
            responseReturn(res, 500, { error: error.message });
        }
    };

    product_update = async (req, res) => {
        console.log("Updating product...");
        let { name, description, discount, price, brand, productId, stock } = req.body;

        try {
            const slug = name.trim().split(' ').join('-');
            const updateData = {
                name: name.trim(),
                description: description.trim(),
                discount: parseInt(discount),
                price: parseInt(price),
                brand: brand.trim(),
                stock: parseInt(stock),
                slug,
            };

            const product = await productModel.findByIdAndUpdate(productId, updateData, { new: true });
            if (!product) {
                console.error("Product not found");
                responseReturn(res, 404, { error: 'Product not found' });
                return;
            }

            console.log("Product updated successfully");
            responseReturn(res, 200, { product, message: 'Product updated successfully' });
        } catch (error) {
            console.error("Error updating product:", error.message);
            responseReturn(res, 500, { error: error.message });
        }
    };

    product_image_update = async (req, res) => {
        console.log("Updating product image...");
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
            const { productId, oldImage } = fields;
            const { newImage } = files;

            if (!newImage) {
                console.error("New image is required");
                responseReturn(res, 400, { error: 'New image is required' });
                return;
            }

            const result = await cloudinary.uploader.upload(newImage.filepath, { folder: 'products' });
            const product = await productModel.findById(productId);

            if (!product) {
                console.error("Product not found");
                responseReturn(res, 404, { error: 'Product not found' });
                return;
            }

            const index = product.images.findIndex((img) => img === oldImage);
            if (index === -1) {
                console.error("Old image not found in product");
                responseReturn(res, 400, { error: 'Old image not found in product' });
                return;
            }

            product.images[index] = result.url;
            await product.save();

            console.log("Product image updated successfully");
            responseReturn(res, 200, { product, message: 'Product image updated successfully' });
        } catch (error) {
            console.error("Error updating product image:", error.message);
            responseReturn(res, 500, { error: error.message });
        }
    };
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

module.exports = new ProductController();
