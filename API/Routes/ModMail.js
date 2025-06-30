const express = require('express');
const { pool } = require('../database');
const router = express.Router();

router.post('/ModMailBan', async (req, res) => {
    try {
        const { DiscordID, BannedByID } = req.body;

        if (!DiscordID || !BannedByID) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields: DiscordID, BannedByID'
            });
        }

        const connection = await pool.getConnection();

        // Check if user is already banned
        const [existingBan] = await connection.execute(
            'SELECT * FROM ModMailBan WHERE DiscordID = ?',
            [DiscordID]
        );

        if (existingBan.length > 0) {
            connection.release();
            return res.status(409).json({
                success: false,
                error: 'User is already banned from ModMail'
            });
        }

        // Add the ban
        const [result] = await connection.execute(
            'INSERT INTO ModMailBan (DiscordID, BannedByID) VALUES (?, ?)',
            [DiscordID, BannedByID]
        );

        connection.release();

        res.status(201).json({
            success: true,
            message: 'User banned from ModMail successfully',
            banId: result.insertId
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Failed to ban user from ModMail',
            details: error.message
        });
    }
});

router.get('/CheckModMailBan/:discordId', async (req, res) => {
    try {
        const { discordId } = req.params;
        const connection = await pool.getConnection();

        const [rows] = await connection.execute(
            'SELECT * FROM ModMailBan WHERE DiscordID = ?',
            [discordId]
        );

        connection.release();

        res.json({
            success: true,
            isBanned: rows.length > 0,
            banInfo: rows.length > 0 ? rows[0] : null
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Failed to check ModMail ban status',
            details: error.message
        });
    }
});

router.delete('/ModMailBan/:discordId', async (req, res) => {
    try {
        const { discordId } = req.params;
        const connection = await pool.getConnection();

        const [result] = await connection.execute(
            'DELETE FROM ModMailBan WHERE DiscordID = ?',
            [discordId]
        );

        connection.release();

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                error: 'User is not banned from ModMail'
            });
        }

        res.json({
            success: true,
            message: 'User unbanned from ModMail successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Failed to unban user from ModMail',
            details: error.message
        });
    }
});

// Create active ModMail entry
router.post('/CreateActiveModMail', async (req, res) => {
    try {
        const { DiscordID, ThreadID, ChannelID, TeamLanguage, Title } = req.body;

        if (!DiscordID || !ThreadID || !ChannelID || !TeamLanguage) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields: DiscordID, ThreadID, ChannelID, TeamLanguage'
            });
        }

        const connection = await pool.getConnection();

        // Check if user already has an active ModMail
        const [existing] = await connection.execute(
            'SELECT * FROM ActiveModMails WHERE DiscordID = ? AND Status = "OPEN"',
            [DiscordID]
        );

        if (existing.length > 0) {
            connection.release();
            return res.status(409).json({
                success: false,
                error: 'User already has an active ModMail',
                activeModMail: existing[0]
            });
        }

        // Create new active ModMail
        const [result] = await connection.execute(
            'INSERT INTO ActiveModMails (DiscordID, ThreadID, ChannelID, TeamLanguage, Title) VALUES (?, ?, ?, ?, ?)',
            [DiscordID, ThreadID, ChannelID, TeamLanguage, Title]
        );

        connection.release();

        res.status(201).json({
            success: true,
            message: 'Active ModMail created successfully',
            modMailId: result.insertId
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Failed to create active ModMail',
            details: error.message
        });
    }
});

// Get active ModMail for user
router.get('/GetActiveModMail/:discordId', async (req, res) => {
    try {
        const { discordId } = req.params;
        const connection = await pool.getConnection();

        // Get the most recent OPEN ModMail for this user
        const [rows] = await connection.execute(
            'SELECT * FROM ActiveModMails WHERE DiscordID = ? AND Status = "OPEN" ORDER BY CreatedAt DESC LIMIT 1',
            [discordId]
        );

        connection.release();

        res.json({
            success: true,
            hasActive: rows.length > 0,
            activeModMail: rows.length > 0 ? rows[0] : null
        });
    } catch (error) {
        console.log('GetActiveModMail API Error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get active ModMail',
            details: error.message
        });
    }
});

// Get ModMail by thread ID
router.get('/GetModMailByThread/:threadId', async (req, res) => {
    try {
        const { threadId } = req.params;
        const connection = await pool.getConnection();

        const [rows] = await connection.execute(
            'SELECT * FROM ActiveModMails WHERE ThreadID = ? AND Status = "OPEN"',
            [threadId]
        );

        connection.release();

        res.json({
            success: true,
            found: rows.length > 0,
            modMail: rows.length > 0 ? rows[0] : null
        });
    } catch (error) {
        console.log('GetModMailByThread API Error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get ModMail by thread',
            details: error.message
        });
    }
});

// Close active ModMail
router.put('/CloseActiveModMail/:discordId', async (req, res) => {
    try {
        const { discordId } = req.params;
        const connection = await pool.getConnection();

        const [result] = await connection.execute(
            'UPDATE ActiveModMails SET Status = "CLOSED", LastActivity = CURRENT_TIMESTAMP WHERE DiscordID = ? AND Status = "OPEN"',
            [discordId]
        );

        connection.release();

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                error: 'No active ModMail found for user'
            });
        }

        res.json({
            success: true,
            message: 'ModMail closed successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Failed to close ModMail',
            details: error.message
        });
    }
});

// Update last activity for ModMail
router.put('/UpdateActivity/:threadId', async (req, res) => {
    try {
        const { threadId } = req.params;
        const connection = await pool.getConnection();

        const [result] = await connection.execute(
            'UPDATE ActiveModMails SET LastActivity = CURRENT_TIMESTAMP WHERE ThreadID = ? AND Status = "OPEN"',
            [threadId]
        );

        connection.release();

        res.json({
            success: true,
            updated: result.affectedRows > 0
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Failed to update activity',
            details: error.message
        });
    }
});

module.exports = router;