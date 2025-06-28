const express = require('express');
const { pool } = require('./database');
require('dotenv').config();

const app = express();
const PORT = process.env.API_PORT || 3000;

app.use(express.json());

const authenticateAPI = (req, res, next) => {
    const apiKey = req.headers['x-api-key'];

    if (!apiKey || apiKey !== process.env.API_KEY) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    next();
};

app.use('/api', authenticateAPI);

const sanctionsRoutes = require('./Routes/Sanctions');
app.use('/api/sanctions', sanctionsRoutes);

app.listen(PORT, () => {
    console.log(`API Server running on port ${PORT}`);
    console.log(`Sanctions API: http://localhost:${PORT}/api/sanctions`);
});