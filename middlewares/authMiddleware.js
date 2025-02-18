const jwt = require('jsonwebtoken');

module.exports.authMiddleware = async (req, res, next) => {
    const { accessToken } = req.cookies
    if (!accessToken) {
        return res.status(409).json({ error: 'Please login first' })
    } else {
        try {
            const deCodeToken = await jwt.verify(accessToken, process.env.SECRET)
            req.role = deCodeToken.role
            req.id = deCodeToken.id
            next()
        } catch (error) {
            return res.status(409).json({ error: 'Please login' })
        }
    }
    const authMiddleware = (req, res, next) => {
        // Assuming JWT token is used
        const token = req.header('Authorization')?.split(' ')[1];
    
        if (!token) {
            return res.status(401).json({ message: 'Unauthorized' });
        }
    
        // Verify token (use a JWT verification logic here)
        next();
    };
    
}