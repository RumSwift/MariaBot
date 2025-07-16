const express = require('express');
const { pool } = require('../database');
const router = express.Router();

router.post('/AddUserNote', async (req, res) => {
    try {
        const {
            DiscordID,
            AddedByDiscordID,
            Title,
            NoteText,
            LinkedMessage,
            EmbedLink
        } = req.body;

        if (!DiscordID || !AddedByDiscordID || !Title || !NoteText) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields: DiscordID, AddedByDiscordID, Title, NoteText'
            });
        }

        const connection = await pool.getConnection();

        const [result] = await connection.execute(
            `INSERT INTO UserNotes (DiscordID, AddedByDiscordID, Title, NoteText, LinkedMessage, EmbedLink) 
             VALUES (?, ?, ?, ?, ?, ?)`,
            [DiscordID, AddedByDiscordID, Title, NoteText, LinkedMessage, EmbedLink]
        );

        connection.release();

        res.status(201).json({
            success: true,
            message: 'User note added successfully',
            noteId: result.insertId
        });
    } catch (error) {
        console.log('AddUserNote API Error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to add user note',
            details: error.message
        });
    }
});

router.get('/GetUserNotes/:discordId', async (req, res) => {
    try {
        const { discordId } = req.params;
        const connection = await pool.getConnection();

        const [rows] = await connection.execute(
            'SELECT * FROM UserNotes WHERE DiscordID = ? ORDER BY Timestamp DESC',
            [discordId]
        );

        connection.release();

        res.json({
            success: true,
            count: rows.length,
            notes: rows
        });
    } catch (error) {
        console.log('GetUserNotes API Error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get user notes',
            details: error.message
        });
    }
});

router.get('/GetUserNoteStats/:discordId', async (req, res) => {
    try {
        const { discordId } = req.params;
        const connection = await pool.getConnection();

        const [noteCount] = await connection.execute(
            'SELECT COUNT(*) as count FROM UserNotes WHERE DiscordID = ?',
            [discordId]
        );

        const [recentNotes] = await connection.execute(
            'SELECT * FROM UserNotes WHERE DiscordID = ? ORDER BY Timestamp DESC LIMIT 5',
            [discordId]
        );

        connection.release();

        res.json({
            success: true,
            totalNotes: noteCount[0].count,
            recentNotes: recentNotes
        });
    } catch (error) {
        console.log('GetUserNoteStats API Error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get user note stats',
            details: error.message
        });
    }
});

router.get('/GetNote/:noteId', async (req, res) => {
    try {
        const { noteId } = req.params;
        const connection = await pool.getConnection();

        const [rows] = await connection.execute(
            'SELECT * FROM UserNotes WHERE ID = ?',
            [noteId]
        );

        connection.release();

        if (rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Note not found'
            });
        }

        res.json({
            success: true,
            note: rows[0]
        });
    } catch (error) {
        console.log('GetNote API Error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get note',
            details: error.message
        });
    }
});

router.put('/UpdateNote/:noteId', async (req, res) => {
    try {
        const { noteId } = req.params;
        const { Title, NoteText, LinkedMessage } = req.body;

        if (!Title || !NoteText) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields: Title, NoteText'
            });
        }

        const connection = await pool.getConnection();

        const [result] = await connection.execute(
            'UPDATE UserNotes SET Title = ?, NoteText = ?, LinkedMessage = ? WHERE ID = ?',
            [Title, NoteText, LinkedMessage, noteId]
        );

        connection.release();

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                error: 'Note not found'
            });
        }

        res.json({
            success: true,
            message: 'Note updated successfully'
        });
    } catch (error) {
        console.log('UpdateNote API Error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update note',
            details: error.message
        });
    }
});

router.delete('/DeleteNote/:noteId', async (req, res) => {
    try {
        const { noteId } = req.params;
        const connection = await pool.getConnection();

        const [result] = await connection.execute(
            'DELETE FROM UserNotes WHERE ID = ?',
            [noteId]
        );

        connection.release();

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                error: 'Note not found'
            });
        }

        res.json({
            success: true,
            message: 'Note deleted successfully'
        });
    } catch (error) {
        console.log('DeleteNote API Error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to delete note',
            details: error.message
        });
    }
});

module.exports = router;