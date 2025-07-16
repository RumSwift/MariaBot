const express = require('express');
const { pool } = require('../database');
const router = express.Router();

// Get all auto messages
router.get('/GetAutoMessages', async (req, res) => {
    try {
        const connection = await pool.getConnection();

        const [rows] = await connection.execute(
            'SELECT ID, ChannelID, Message, Title FROM AutoMessages ORDER BY ChannelID, ID'
        );

        connection.release();

        res.json({
            success: true,
            count: rows.length,
            messages: rows
        });
    } catch (error) {
        console.log('GetAutoMessages API Error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get auto messages',
            details: error.message
        });
    }
});

// Add a new auto message
router.post('/AddAutoMessage', async (req, res) => {
    try {
        const { ChannelID, Message, Title } = req.body;

        if (!ChannelID || !Message) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields: ChannelID, Message'
            });
        }

        const connection = await pool.getConnection();

        const [result] = await connection.execute(
            'INSERT INTO AutoMessages (ChannelID, Message, Title) VALUES (?, ?, ?)',
            [ChannelID, Message, Title]
        );

        connection.release();

        res.status(201).json({
            success: true,
            message: 'Auto message added successfully',
            messageId: result.insertId
        });
    } catch (error) {
        console.log('AddAutoMessage API Error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to add auto message',
            details: error.message
        });
    }
});

// Update an existing auto message
router.put('/UpdateAutoMessage/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { ChannelID, Message, Title } = req.body;

        if (!ChannelID || !Message) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields: ChannelID, Message'
            });
        }

        const connection = await pool.getConnection();

        const [result] = await connection.execute(
            'UPDATE AutoMessages SET ChannelID = ?, Message = ?, Title = ? WHERE ID = ?',
            [ChannelID, Message, Title, id]
        );

        connection.release();

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                error: 'Auto message not found'
            });
        }

        res.json({
            success: true,
            message: 'Auto message updated successfully'
        });
    } catch (error) {
        console.log('UpdateAutoMessage API Error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update auto message',
            details: error.message
        });
    }
});

// Delete an auto message
router.delete('/DeleteAutoMessage/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const connection = await pool.getConnection();

        const [result] = await connection.execute(
            'DELETE FROM AutoMessages WHERE ID = ?',
            [id]
        );

        connection.release();

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                error: 'Auto message not found'
            });
        }

        res.json({
            success: true,
            message: 'Auto message deleted successfully'
        });
    } catch (error) {
        console.log('DeleteAutoMessage API Error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to delete auto message',
            details: error.message
        });
    }
});

// Get auto messages for a specific channel
router.get('/GetAutoMessagesByChannel/:channelId', async (req, res) => {
    try {
        const { channelId } = req.params;
        const connection = await pool.getConnection();

        const [rows] = await connection.execute(
            'SELECT ID, ChannelID, Message, Title FROM AutoMessages WHERE ChannelID = ? ORDER BY ID',
            [channelId]
        );

        connection.release();

        res.json({
            success: true,
            count: rows.length,
            messages: rows
        });
    } catch (error) {
        console.log('GetAutoMessagesByChannel API Error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get auto messages for channel',
            details: error.message
        });
    }
});

module.exports = router;