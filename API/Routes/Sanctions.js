const express = require('express');
const { pool } = require('../database');
const router = express.Router();

router.get('/GetSanctionsByDiscordID/:discordId', async (req, res) => {
    try {
        const { discordId } = req.params;
        const connection = await pool.getConnection();
        const [rows] = await connection.execute(
            'SELECT * FROM Sanctions WHERE DiscordID = ? ORDER BY Timestamp DESC',
            [discordId]
        );
        connection.release();

        res.json({
            success: true,
            message: 'User sanctions retrieved successfully',
            discordId: discordId,
            count: rows.length,
            data: rows
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Failed to retrieve user sanctions',
            details: error.message
        });
    }
});

router.post('/AddSanction', async (req, res) => {
    try {
        const {
            DiscordID,
            DiscordName,
            SanctionType,
            PrivateReason,
            PublicReason,
            Punishment,
            MessageLink,
            SanctionLink,
            ModDiscordID,
            ModDiscordName
        } = req.body;

        if (!DiscordID || !SanctionType) {
            return res.status(400).json({
                error: 'Missing required fields: DiscordID, SanctionType'
            });
        }

        const connection = await pool.getConnection();
        const [result] = await connection.execute(
            `INSERT INTO Sanctions 
            (DiscordID, DiscordName, SanctionType, PrivateReason, PublicReason, Punishment, MessageLink, SanctionLink, ModDiscordID, ModDiscordName) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [DiscordID, DiscordName, SanctionType, PrivateReason, PublicReason, Punishment, MessageLink, SanctionLink, ModDiscordID, ModDiscordName]
        );
        connection.release();

        res.status(201).json({
            success: true,
            message: 'Sanction added successfully',
            sanctionId: result.insertId
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Failed to add sanction',
            details: error.message
        });
    }
});

module.exports = router;