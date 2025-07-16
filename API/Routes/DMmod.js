const express = require('express');
const { pool } = require('../database');
const router = express.Router();

router.post('/CreateDMmod', async (req, res) => {
    try {
        const {
            DiscordID,
            DiscordName,
            Language,
            MessageText,
            ReportedPlayerID,
            ReportedPlayerName,
            ReportedMessage,
            ImageURL,
            ModChannelID,
            ModMessageID
        } = req.body;

        if (!DiscordID || !DiscordName || !Language || !MessageText || !ModChannelID || !ModMessageID) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields'
            });
        }

        const connection = await pool.getConnection();

        const [result] = await connection.execute(
            `INSERT INTO ActiveDMmods 
            (DiscordID, DiscordName, Language, MessageText, ReportedPlayerID, ReportedPlayerName, ReportedMessage, ImageURL, ModChannelID, ModMessageID) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [DiscordID, DiscordName, Language, MessageText, ReportedPlayerID, ReportedPlayerName, ReportedMessage, ImageURL, ModChannelID, ModMessageID]
        );

        connection.release();

        res.status(201).json({
            success: true,
            message: 'DMmod created successfully',
            dmmodId: result.insertId
        });
    } catch (error) {
        console.log('CreateDMmod API Error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to create DMmod',
            details: error.message
        });
    }
});

router.get('/GetDMmodByMessage/:messageId', async (req, res) => {
    try {
        const { messageId } = req.params;
        const connection = await pool.getConnection();

        const [rows] = await connection.execute(
            'SELECT * FROM ActiveDMmods WHERE ModMessageID = ? AND Status IN ("OPEN", "REPLIED")',
            [messageId]
        );

        connection.release();

        res.json({
            success: true,
            found: rows.length > 0,
            dmmod: rows.length > 0 ? rows[0] : null
        });
    } catch (error) {
        console.log('GetDMmodByMessage API Error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get DMmod by message',
            details: error.message
        });
    }
});

router.get('/GetUserDMmods/:discordId', async (req, res) => {
    try {
        const { discordId } = req.params;
        const connection = await pool.getConnection();

        const [rows] = await connection.execute(
            'SELECT * FROM ActiveDMmods WHERE DiscordID = ? AND Status IN ("OPEN", "REPLIED") ORDER BY CreatedAt DESC',
            [discordId]
        );

        connection.release();

        res.json({
            success: true,
            count: rows.length,
            dmmods: rows
        });
    } catch (error) {
        console.log('GetUserDMmods API Error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get user DMmods',
            details: error.message
        });
    }
});

router.put('/UpdateDMmodStatus/:messageId', async (req, res) => {
    try {
        const { messageId } = req.params;
        const { status } = req.body;

        if (!status || !['OPEN', 'REPLIED', 'CLOSED'].includes(status)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid status. Must be OPEN, REPLIED, or CLOSED'
            });
        }

        const connection = await pool.getConnection();

        const [result] = await connection.execute(
            'UPDATE ActiveDMmods SET Status = ?, LastActivity = CURRENT_TIMESTAMP WHERE ModMessageID = ?',
            [status, messageId]
        );

        connection.release();

        res.json({
            success: true,
            updated: result.affectedRows > 0,
            message: `DMmod status updated to ${status}`
        });
    } catch (error) {
        console.log('UpdateDMmodStatus API Error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update DMmod status',
            details: error.message
        });
    }
});

router.put('/CloseDMmod/:messageId', async (req, res) => {
    try {
        const { messageId } = req.params;
        const connection = await pool.getConnection();

        const [result] = await connection.execute(
            'UPDATE ActiveDMmods SET Status = "CLOSED", LastActivity = CURRENT_TIMESTAMP WHERE ModMessageID = ?',
            [messageId]
        );

        connection.release();

        res.json({
            success: true,
            updated: result.affectedRows > 0,
            message: 'DMmod closed successfully'
        });
    } catch (error) {
        console.log('CloseDMmod API Error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to close DMmod',
            details: error.message
        });
    }
});

router.get('/GetDMmodStats', async (req, res) => {
    try {
        const connection = await pool.getConnection();

        const [openCount] = await connection.execute(
            'SELECT COUNT(*) as count FROM ActiveDMmods WHERE Status = "OPEN"'
        );

        const [repliedCount] = await connection.execute(
            'SELECT COUNT(*) as count FROM ActiveDMmods WHERE Status = "REPLIED"'
        );

        const [totalCount] = await connection.execute(
            'SELECT COUNT(*) as count FROM ActiveDMmods'
        );

        connection.release();

        res.json({
            success: true,
            stats: {
                open: openCount[0].count,
                replied: repliedCount[0].count,
                total: totalCount[0].count
            }
        });
    } catch (error) {
        console.log('GetDMmodStats API Error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get DMmod stats',
            details: error.message
        });
    }
});

module.exports = router;