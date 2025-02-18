const { Schema, model } = require('mongoose')

const customerSchema = new Schema({
    name: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true,
        unique: true, // Ensure email uniqueness
        match: [/\S+@\S+\.\S+/, 'Invalid email format'] // Optional regex for email validation
    },
    password: {
        type: String,
        required: true,
        select: false
    },
    method: {
        type: String,
        required: true
    }
}, { timestamps: true });

module.exports = model('Customer', customerSchema);
