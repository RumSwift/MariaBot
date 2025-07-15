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
const modmailRoutes = require('./Routes/ModMail');
const dmmodRoutes = require('./Routes/DMmod');
const bannedEmojisRoutes = require('./Routes/BannedEmojis');
const userNotesRoutes = require('./Routes/UserNotes');

app.use('/api/sanctions', sanctionsRoutes);
app.use('/api/modmail', modmailRoutes);
app.use('/api/dmmod', dmmodRoutes);
app.use('/api/bannedemojis', bannedEmojisRoutes);
app.use('/api/usernotes', userNotesRoutes);

app.listen(PORT, () => {
    console.log(`API Server running on port ${PORT}`);
    console.log(`Sanctions API: http://localhost:${PORT}/api/sanctions`);
    console.log(`ModMail API: http://localhost:${PORT}/api/modmail`);
    console.log(`DMmod API: http://localhost:${PORT}/api/dmmod`);
    console.log(`Banned Emojis API: http://localhost:${PORT}/api/bannedemojis`);
    console.log(`User Notes API: http://localhost:${PORT}/api/usernotes`);
});