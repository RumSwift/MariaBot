const { EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');
const fetch = require('node-fetch');

module.exports = async (interaction, selectInteraction, targetUser, member) => {
    // Create confirmation embed
    const confirmEmbed = new EmbedBuilder()
        .setTitle('🚨 Scam/Phishing Ban Confirmation')
        .setDescription(`**Are you sure you want to ban ${targetUser.username} for Scam/Phishing?**\n\n**This action will:**\n• Permanently ban the user from the server\n• Delete all their message history (last 7 days)\n• Cannot be undone without manual unban\n\n**User:** ${targetUser} (${targetUser.username})\n**User ID:** ${targetUser.id}`)
        .setColor('#FF0000') // Red color for danger
        .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }))
        .setFooter({ text: 'This confirmation will expire in 15 seconds' })
        .setTimestamp();

    // Create confirmation buttons
    const confirmButton = new ButtonBuilder()
        .setCustomId(`confirm_scam_ban_${targetUser.id}`)
        .setLabel('Yes, Ban User')
        .setStyle(ButtonStyle.Danger)
        .setEmoji('🚨');

    const cancelButton = new ButtonBuilder()
        .setCustomId(`cancel_scam_ban_${targetUser.id}`)
        .setLabel('No, Cancel')
        .setStyle(ButtonStyle.Secondary)
        .setEmoji('❌');

    const row = new ActionRowBuilder().addComponents(confirmButton, cancelButton);

    // Send confirmation message
    const confirmationReply = await selectInteraction.reply({
        embeds: [confirmEmbed],
        components: [row],
        ephemeral: true
    });

    // Create collector for button interactions
    const collector = confirmationReply.createMessageComponentCollector({
        time: 15000 // 15 seconds
    });

    collector.on('collect', async (buttonInteraction) => {
        if (buttonInteraction.user.id !== interaction.user.id) {
            return await buttonInteraction.reply({ content: 'This confirmation is not for you.', ephemeral: true });
        }

        // First, acknowledge the interaction
        await buttonInteraction.deferReply({ ephemeral: true });

        if (buttonInteraction.customId === `confirm_scam_ban_${targetUser.id}`) {
            // User confirmed the ban - execute immediately
            await executeScamBan(interaction, buttonInteraction, targetUser, member, confirmationReply);
        } else if (buttonInteraction.customId === `cancel_scam_ban_${targetUser.id}`) {
            // User cancelled
            await buttonInteraction.editReply({
                content: '❌ **Scam/Phishing ban cancelled.**'
            });

            // Delete the original confirmation message
            try {
                await confirmationReply.delete();
            } catch (error) {
                console.log('Could not delete confirmation message');
            }
        }
    });

    collector.on('end', async (collected) => {
        if (collected.size === 0) {
            // Timeout - just delete the confirmation message
            try {
                await confirmationReply.delete();
            } catch (error) {
                console.log('Could not delete confirmation message on timeout');
            }
        }
    });
};

async function executeScamBan(interaction, buttonInteraction, targetUser, member, confirmationReply) {
    try {
        // Ban the user with message deletion (7 days)
        await member.ban({
            reason: 'Scam/Phishing - Instant Ban',
            deleteMessageSeconds: 7 * 24 * 60 * 60 // 7 days in seconds
        });

        // Log to mod report channel
        const logChannel = await interaction.client.channels.fetch(process.env.MOD_REPORT_CHANNEL_ID);
        let logMessage = null;
        if (logChannel) {
            const logEmbed = new EmbedBuilder()
                .setTitle('🚨 Scam/Phishing Ban Applied 🚨')
                .setDescription(`**__User Banned for Scam/Phishing__**\n**To: **${targetUser} (${member.displayName})\n**Sanction: ** User Banned 🚨\n\n**__Reason:__**\n\`\`\`Scam/Phishing\`\`\`\n**__Reason Provided To User:__**\n\`\`\`Scam/Phishing\`\`\`\n**__Message History:__** Deleted (7 days)\n\n**Mod:** ${interaction.user} (${interaction.user.username})`)
                .setColor('#FF0000') // Red color
                .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }));

            logMessage = await logChannel.send({ embeds: [logEmbed] });
        }

        // Add to database via API
        try {
            await fetch('http://localhost:3000/api/sanctions/AddSanction', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': process.env.API_KEY
                },
                body: JSON.stringify({
                    DiscordID: targetUser.id,
                    DiscordName: targetUser.username,
                    SanctionType: 'Scam',
                    PrivateReason: 'Scam/Phishing',
                    PublicReason: 'Scam/Phishing',
                    Punishment: 'User Banned',
                    MessageLink: null,
                    SanctionLink: logMessage ? logMessage.url : null,
                    ModDiscordID: interaction.user.id,
                    ModDiscordName: interaction.user.username
                })
            });
        } catch (apiError) {
            console.log('Failed to log scam/phishing sanction to database:', apiError.message);
        }

        // Send success message as a follow-up
        await buttonInteraction.editReply({
            content: `✅ **Scam/Phishing Ban Applied**\n\n${targetUser.username} has been permanently banned for scam/phishing.\n\n**Actions taken:**\n• User banned from server\n• Message history deleted (7 days)\n• Logged to database\n\n${logMessage ? `**Log:** ${logMessage.url}` : ''}`
        });

        // Delete the original confirmation message
        try {
            await confirmationReply.delete();
        } catch (error) {
            console.log('Could not delete confirmation message');
        }

    } catch (error) {
        console.log('Error in scam/phishing ban execution:', error);

        // Send error message as a follow-up
        await buttonInteraction.editReply({
            content: '❌ **Ban Failed**\n\nFailed to ban user for scam/phishing. Contact Hbabo Staff.'
        });

        // Delete the original confirmation message
        try {
            await confirmationReply.delete();
        } catch (error) {
            console.log('Could not delete confirmation message');
        }
    }
}