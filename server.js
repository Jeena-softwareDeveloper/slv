const express = require('express');
const { dbConnect } = require('./utiles/db');
const app = express();
const cors = require('cors');
const http = require('http');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
require('dotenv').config();
const socket = require('socket.io');

const server = http.createServer(app);

// Enable CORS for specified origins with credentials
app.use(cors({
    origin: ['http://localhost:3001', 'http://localhost:3000'],
    credentials: true
}));

// Initialize Socket.IO server
const io = socket(server, {
    cors: {
        origin: '*',
        credentials: true
    }
});

// Arrays to hold active customers and sellers
var allCustomer = [];
var allSeller = [];

// Helper functions to add/find/remove users/sellers/admin

const addUser = (customerId, socketId, userInfo) => {
    const checkUser = allCustomer.some(u => u.customerId === customerId);
    if (!checkUser) {
        allCustomer.push({
            customerId,
            socketId,
            userInfo
        });
    }
};

const addSeller = (sellerId, socketId, userInfo) => {
    const checkSeller = allSeller.some(u => u.sellerId === sellerId);
    if (!checkSeller) {
        allSeller.push({
            sellerId,
            socketId,
            userInfo
        });
    }
};

const findCustomer = (customerId) => {
    return allCustomer.find(c => c.customerId === customerId);
};

const findSeller = (sellerId) => {
    return allSeller.find(c => c.sellerId === sellerId);
};

const remove = (socketId) => {
    allCustomer = allCustomer.filter(c => c.socketId !== socketId);
    allSeller = allSeller.filter(c => c.socketId !== socketId);
};

let admin = {};

const removeAdmin = (socketId) => {
    if (admin.socketId === socketId) {
        admin = {};
    }
};

// Socket.IO events
io.on('connection', (soc) => {
    console.log('Socket server is connected...');

    // Listen for a customer connecting
    soc.on('add_user', (customerId, userInfo) => {
        addUser(customerId, soc.id, userInfo);
        io.emit('activeSeller', allSeller);
        io.emit('activeCustomer', allCustomer);
    });

    // Listen for a seller connecting
    soc.on('add_seller', (sellerId, userInfo) => {
        addSeller(sellerId, soc.id, userInfo);
        io.emit('activeSeller', allSeller);
        io.emit('activeCustomer', allCustomer);
        io.emit('activeAdmin', { status: true });
    });

    // Listen for an admin connecting
    soc.on('add_admin', (adminInfo) => {
        // Remove email from adminInfo if not needed
        delete adminInfo.email;
        admin = adminInfo;
        admin.socketId = soc.id;
        io.emit('activeSeller', allSeller);
        io.emit('activeAdmin', { status: true });
    });

    // Messaging from seller to customer
    soc.on('send_seller_message', (msg) => {
        const customer = findCustomer(msg.receverId);
        if (customer !== undefined) {
            soc.to(customer.socketId).emit('seller_message', msg);
        }
    });

    // Messaging from customer to seller
    soc.on('send_customer_message', (msg) => {
        const seller = findSeller(msg.receverId);
        if (seller !== undefined) {
            soc.to(seller.socketId).emit('customer_message', msg);
        }
    });

    // Admin sending message to seller
    soc.on('send_message_admin_to_seller', msg => {
        const seller = findSeller(msg.receverId);
        if (seller !== undefined) {
            soc.to(seller.socketId).emit('receved_admin_message', msg);
        }
    });

    // Seller sending message to admin
    soc.on('send_message_seller_to_admin', msg => {
        if (admin.socketId) {
            soc.to(admin.socketId).emit('receved_seller_message', msg);
        }
    });

    // On disconnect, remove user/seller/admin and update active lists
    soc.on('disconnect', () => {
        console.log('User disconnected');
        remove(soc.id);
        removeAdmin(soc.id);
        io.emit('activeAdmin', { status: false });
        io.emit('activeSeller', allSeller);
        io.emit('activeCustomer', allCustomer);
    });
});

// Middleware for parsing JSON and cookies
app.use(bodyParser.json());
app.use(cookieParser());

// Mount routes for various functionalities
app.use('/api', require('./routes/chatRoutes'));
app.use('/api', require('./routes/paymentRoutes'));
app.use('/api', require('./routes/bannerRoutes'));
app.use('/api', require('./routes/dashboard/deveryRoutes'));
app.use('/api', require('./routes/dashboard/dashboardIndexRoutes'));
app.use('/api/home', require('./routes/home/homeRoutes'));
app.use('/api', require('./routes/order/orderRoutes'));
app.use('/api', require('./routes/home/cardRoutes'));
app.use('/api', require('./routes/authRoutes'));
app.use('/api', require('./routes/home/customerAuthRoutes'));
app.use('/api', require('./routes/dashboard/sellerRoutes'));
app.use('/api', require('./routes/dashboard/categoryRoutes'));
app.use('/api', require('./routes/dashboard/productRoutes'));

// Default route
app.get('/', (req, res) => res.send('Hello World!'));

// Connect to the database and start the server
const port = process.env.PORT;
dbConnect();
server.listen(port, () => console.log(`Server is running on port ${port}!`));
