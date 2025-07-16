const { EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');
const fetch = require('node-fetch');

module.exports = async (interaction, selectInteraction, targetUser, member) => {
    try {
        const confirmEmbed = new EmbedBuilder()
            .setTitle('🚨 Scam/Phishing Ban Confirmation')
            .setDescription(`**Are you sure you want to ban ${targetUser.username} for Scam/Phishing?**\n\n**This action will:**\n• Permanently ban the user from the server\n• Delete all their message history (last 7 days)\n• Cannot be undone without manual unban\n\n**User:** ${targetUser} (${targetUser.username})\n**User ID:** ${targetUser.id}`)
            .setColor('#FF0000')
            .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }))
            .setFooter({ text: 'This confirmation will expire in 30 seconds' })
            .setTimestamp();

        const timestamp = Date.now();
        const confirmId = `scam_confirm_${targetUser.id}_${timestamp}`;
        const cancelId = `scam_cancel_${targetUser.id}_${timestamp}`;

        const confirmButton = new ButtonBuilder()
            .setCustomId(confirmId)
            .setLabel('Yes, Ban User')
            .setStyle(ButtonStyle.Danger)
            .setEmoji('🚨');

        const cancelButton = new ButtonBuilder()
            .setCustomId(cancelId)
            .setLabel('No, Cancel')
            .setStyle(ButtonStyle.Secondary)
            .setEmoji('❌');

        const row = new ActionRowBuilder().addComponents(confirmButton, cancelButton);

        if (!global.scamConfirmations) {
            global.scamConfirmations = new Map();
        }

        global.scamConfirmations.set(confirmId, {
            originalInteraction: interaction,
            targetUser: targetUser,
            member: member,
            timestamp: timestamp,
            authorizedUserId: interaction.user.id
        });

        global.scamConfirmations.set(cancelId, {
            originalInteraction: interaction,
            targetUser: targetUser,
            member: member,
            timestamp: timestamp,
            authorizedUserId: interaction.user.id
        });

        await selectInteraction.reply({
            embeds: [confirmEmbed],
            components: [row],
            ephemeral: true
        });

        setTimeout(() => {
            global.scamConfirmations?.delete(confirmId);
            global.scamConfirmations?.delete(cancelId);
        }, 30000);

    } catch (error) {
        console.error('Error in scam confirmation setup:', error);
        try {
            if (!selectInteraction.replied && !selectInteraction.deferred) {
                await selectInteraction.reply({
                    content: '❌ **Failed to create scam ban confirmation**\n\nThere was an error setting up the confirmation dialog. Please try again.',
                    ephemeral: true
                });
            } else if (selectInteraction.deferred) {
                await selectInteraction.editReply({
                    content: '❌ **Failed to create scam ban confirmation**\n\nThere was an error setting up the confirmation dialog. Please try again.'
                });
            } else {
                await selectInteraction.followUp({
                    content: '❌ **Failed to create scam ban confirmation**\n\nThere was an error setting up the confirmation dialog. Please try again.',
                    ephemeral: true
                });
            }
        } catch (errorReplyError) {
            console.error('Failed to send error reply:', errorReplyError);
        }
    }
};

module.exports.handleScamConfirmation = async (buttonInteraction) => {
    if (!buttonInteraction.customId.startsWith('scam_confirm_') && !buttonInteraction.customId.startsWith('scam_cancel_')) {
        return false;
    }

    try {
        if (!global.scamConfirmations) {
            await buttonInteraction.reply({
                content: '❌ This confirmation has expired. Please try the command again.',
                ephemeral: true
            });
            return true;
        }

        const confirmationData = global.scamConfirmations.get(buttonInteraction.customId);
        if (!confirmationData) {
            await buttonInteraction.reply({
                content: '❌ This confirmation has expired. Please try the command again.',
                ephemeral: true
            });
            return true;
        }

        if (buttonInteraction.user.id !== confirmationData.authorizedUserId) {
            await buttonInteraction.reply({
                content: 'This confirmation is not for you.',
                ephemeral: true
            });
            return true;
        }

        await buttonInteraction.deferReply({ ephemeral: true });

        if (buttonInteraction.customId.startsWith('scam_confirm_')) {
            await executeScamBan(
                confirmationData.originalInteraction,
                buttonInteraction,
                confirmationData.targetUser,
                confirmationData.member
            );
        } else if (buttonInteraction.customId.startsWith('scam_cancel_')) {
            await buttonInteraction.editReply({
                content: '❌ **Scam/Phishing ban cancelled.**'
            });
        }

        global.scamConfirmations.delete(buttonInteraction.customId);
        const otherPrefix = buttonInteraction.customId.startsWith('scam_confirm_') ? 'scam_cancel_' : 'scam_confirm_';
        const otherKey = buttonInteraction.customId.replace(/^scam_(confirm|cancel)_/, otherPrefix);
        global.scamConfirmations.delete(otherKey);

        return true;

    } catch (error) {
        console.error('Error handling scam confirmation button:', error);
        try {
            if (!buttonInteraction.deferred && !buttonInteraction.replied) {
                await buttonInteraction.reply({
                    content: '❌ An error occurred processing your confirmation: ' + error.message,
                    ephemeral: true
                });
            } else {
                await buttonInteraction.editReply({
                    content: '❌ An error occurred processing your confirmation: ' + error.message
                });
            }
        } catch (replyError) {
            console.error('Failed to send error reply:', replyError);
        }
        return true;
    }
};

async function executeScamBan(interaction, buttonInteraction, targetUser, member) {
    try {
        await member.ban({
            reason: 'Scam/Phishing - Instant Ban',
            deleteMessageSeconds: 7 * 24 * 60 * 60
        });

        const logChannel = await interaction.client.channels.fetch(process.env.MOD_REPORT_CHANNEL_ID);
        let logMessage = null;

        if (logChannel) {
            const logEmbed = new EmbedBuilder()
                .setTitle('🚨 Scam/Phishing Ban Applied 🚨')
                .setDescription(`**__User Banned for Scam/Phishing__**\n**To: **${targetUser} (${member.displayName})\n**Sanction: ** User Banned 🚨\n\n**__Reason:__**\n\`\`\`Scam/Phishing\`\`\`\n**__Reason Provided To User:__**\n\`\`\`Scam/Phishing\`\`\`\n**__Message History:__** Deleted (7 days)\n\n**Mod:** ${interaction.user} (${interaction.user.username})`)
                .setColor('#FF0000')
                .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }));

            logMessage = await logChannel.send({ embeds: [logEmbed] });
        }

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
            console.log('Failed to log scam sanction to database:', apiError.message);
        }

        await buttonInteraction.editReply({
            content: `✅ **Scam/Phishing Ban Applied**\n\n${targetUser.username} has been permanently banned for scam/phishing.\n\n**Actions taken:**\n• User banned from server\n• Message history deleted (7 days)\n• Logged to database\n\n${logMessage ? `**Log:** ${logMessage.url}` : ''}`
        });

    } catch (error) {
        console.error('Error in scam ban execution:', error);
        try {
            await buttonInteraction.editReply({
                content: '❌ **Ban Failed**\n\nFailed to ban user for scam/phishing. Contact Hbabo Staff.\n\n**Error details:** ' + error.message
            });
        } catch (replyError) {
            console.error('Failed to send error reply:', replyError);
        }
    }
}