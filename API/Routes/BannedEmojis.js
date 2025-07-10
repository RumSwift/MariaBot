const express = require('express');
const { pool } = require('../database');
const router = express.Router();

// Get all active banned emojis (for bot caching)
router.get('/GetBannedEmojis', async (req, res) => {
    try {
        const connection = await pool.getConnection();

        const [rows] = await connection.execute(
            'SELECT EmojiIdentifier, EmojiType, EmojiName, EmojiID FROM BannedEmojis WHERE IsActive = TRUE ORDER BY CreatedAt DESC'
        );

        connection.release();

        res.json({
            success: true,
            count: rows.length,
            emojis: rows
        });
    } catch (error) {
        console.log('GetBannedEmojis API Error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get banned emojis',
            details: error.message
        });
    }
});

// Add a new banned emoji
router.post('/AddBannedEmoji', async (req, res) => {
    try {
        const {
            EmojiIdentifier,
            EmojiType,
            EmojiName,
            EmojiID,
            Description,
            AddedByDiscordID,
            AddedByDiscordName
        } = req.body;

        if (!EmojiIdentifier || !EmojiType || !AddedByDiscordID) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields: EmojiIdentifier, EmojiType, AddedByDiscordID'
            });
        }

        if (!['unicode', 'custom'].includes(EmojiType)) {
            return res.status(400).json({
                success: false,
                error: 'EmojiType must be either "unicode" or "custom"'
            });
        }

        const connection = await pool.getConnection();

        // Check if emoji already exists
        const [existing] = await connection.execute(
            'SELECT * FROM BannedEmojis WHERE EmojiIdentifier = ? AND IsActive = TRUE',
            [EmojiIdentifier]
        );

        if (existing.length > 0) {
            connection.release();
            return res.status(409).json({
                success: false,
                error: 'Emoji is already banned'
            });
        }

        // Add the banned emoji
        const [result] = await connection.execute(
            `INSERT INTO BannedEmojis 
            (EmojiIdentifier, EmojiType, EmojiName, EmojiID, Description, AddedByDiscordID, AddedByDiscordName) 
            VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [EmojiIdentifier, EmojiType, EmojiName, EmojiID, Description, AddedByDiscordID, AddedByDiscordName]
        );

        connection.release();

        res.status(201).json({
            success: true,
            message: 'Banned emoji added successfully',
            banId: result.insertId
        });
    } catch (error) {
        console.log('AddBannedEmoji API Error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to add banned emoji',
            details: error.message
        });
    }
});

// Remove a banned emoji (soft delete)
router.delete('/RemoveBannedEmoji/:identifier', async (req, res) => {
    try {
        const { identifier } = req.params;
        const { RemovedByDiscordID, RemovedByDiscordName } = req.body;

        const connection = await pool.getConnection();

        const [result] = await connection.execute(
            'UPDATE BannedEmojis SET IsActive = FALSE, UpdatedAt = CURRENT_TIMESTAMP WHERE EmojiIdentifier = ? AND IsActive = TRUE',
            [decodeURIComponent(identifier)]
        );

        connection.release();

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                error: 'Banned emoji not found or already removed'
            });
        }

        res.json({
            success: true,
            message: 'Banned emoji removed successfully'
        });
    } catch (error) {
        console.log('RemoveBannedEmoji API Error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to remove banned emoji',
            details: error.message
        });
    }
});

// Get banned emoji statistics
router.get('/GetBannedEmojiStats', async (req, res) => {
    try {
        const connection = await pool.getConnection();

        const [activeCount] = await connection.execute(
            'SELECT COUNT(*) as count FROM BannedEmojis WHERE IsActive = TRUE'
        );

        const [totalCount] = await connection.execute(
            'SELECT COUNT(*) as count FROM BannedEmojis'
        );

        const [typeBreakdown] = await connection.execute(
            'SELECT EmojiType, COUNT(*) as count FROM BannedEmojis WHERE IsActive = TRUE GROUP BY EmojiType'
        );

        connection.release();

        res.json({
            success: true,
            stats: {
                active: activeCount[0].count,
                total: totalCount[0].count,
                breakdown: typeBreakdown
            }
        });
    } catch (error) {
        console.log('GetBannedEmojiStats API Error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get banned emoji stats',
            details: error.message
        });
    }
});

// Get all banned emojis with full details (for management)
router.get('/GetAllBannedEmojis', async (req, res) => {
    try {
        const connection = await pool.getConnection();

        const [rows] = await connection.execute(
            'SELECT * FROM BannedEmojis ORDER BY CreatedAt DESC'
        );

        connection.release();

        res.json({
            success: true,
            count: rows.length,
            emojis: rows
        });
    } catch (error) {
        console.log('GetAllBannedEmojis API Error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get all banned emojis',
            details: error.message
        });
    }
});

module.exports = router;