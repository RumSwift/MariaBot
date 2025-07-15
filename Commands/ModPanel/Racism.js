const { EmbedBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require('discord.js');
const fetch = require('node-fetch');

module.exports = async (interaction, selectInteraction, targetUser, member) => {
    const modal = new ModalBuilder()
        .setCustomId('racism_modal')
        .setTitle('Racism Violation');

    const privateReasonInput = new TextInputBuilder()
        .setCustomId('private_reason')
        .setLabel('INTERNAL REASON')
        .setStyle(TextInputStyle.Paragraph)
        .setPlaceholder('Explanation to share in the Report Channel.')
        .setRequired(true)
        .setMaxLength(800);

    const publicReasonInput = new TextInputBuilder()
        .setCustomId('public_reason')
        .setLabel('PUBLIC REASON')
        .setStyle(TextInputStyle.Paragraph)
        .setPlaceholder('Reason to share to the player. Please, keep it shortly and dont use more than one paragraph.')
        .setRequired(true)
        .setMaxLength(500);

    const messageLinkInput = new TextInputBuilder()
        .setCustomId('message_link')
        .setLabel('MESSAGE LINK (PROOFS)')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('Share any message link for the report. If you delete the message(s), use the link from logs.')
        .setRequired(true)
        .setMaxLength(500);

    const privateRow = new ActionRowBuilder().addComponents(privateReasonInput);
    const publicRow = new ActionRowBuilder().addComponents(publicReasonInput);
    const linkRow = new ActionRowBuilder().addComponents(messageLinkInput);

    modal.addComponents(privateRow, publicRow, linkRow);

    await selectInteraction.showModal(modal);

    const modalFilter = (modalInteraction) => modalInteraction.customId === 'racism_modal' && modalInteraction.user.id === interaction.user.id;

    try {
        const modalSubmission = await selectInteraction.awaitModalSubmit({ filter: modalFilter, time: 300000 });

        const privateReason = modalSubmission.fields.getTextInputValue('private_reason');
        const publicReason = modalSubmission.fields.getTextInputValue('public_reason');
        const messageLink = modalSubmission.fields.getTextInputValue('message_link');

        try {
            // Get existing racism sanctions count
            let racismViolations = 0;
            try {
                const apiResponse = await fetch(`http://localhost:3000/api/sanctions/GetSanctionsByDiscordID/${targetUser.id}`, {
                    headers: {
                        'x-api-key': process.env.API_KEY
                    }
                });

                if (apiResponse.ok) {
                    const sanctionData = await apiResponse.json();
                    if (sanctionData.success && sanctionData.count > 0) {
                        racismViolations = sanctionData.data.filter(sanction => sanction.SanctionType === 'Racism').length;
                    }
                }
            } catch (apiError) {
                console.log('Failed to fetch sanction history:', apiError.message);
            }

            // Remove any existing timeout before applying new one
            if (member.isCommunicationDisabled()) {
                await member.timeout(null);
            }

            let punishment = '';
            let muteDuration = 0;
            let isBanned = false;

            console.log(`User has ${racismViolations} existing Racism violations`);

            if (racismViolations === 0) {
                // First offense - 7 day mute
                muteDuration = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds
                punishment = '7 Days Muted';
                await member.timeout(muteDuration, 'Racism - 7 day mute');
            } else if (racismViolations >= 1) {
                // Second+ offense - Ban
                punishment = 'User Banned';
                isBanned = true;
                await member.ban({ reason: 'Racism - Ban' });
            }

            console.log(`Applied punishment: ${punishment}`);

            // Send DM to user (same format as Moderate.js)
            const dmEmbed = new EmbedBuilder()
                .setTitle('Formal Message from __Habbo Hotel: Origins Server__')
                .setDescription(`Hello ${targetUser},\n\nThis is a **__racism violation__** regarding your recent behaviour in the Discord.\n\n\`\`\`${publicReason}\`\`\`\n${isBanned ? 'You have been banned from the server.' : `You have been muted for ${punishment.toLowerCase()}.`}\n\nRacism and discriminatory behavior have zero tolerance in our community. We encourage you to read our community guides, found here: https://discord.com/channels/1252726515712528444/1276211712760090685\n\nIf you have any questions or require clarification, you can use **/dmmod** in any channel for assistance. Alternatively, feel free to reply to this DM to start a conversation with the moderation team.\n\nThank you for understanding.`)
                .setColor(16620576)
                .setFooter({ text: 'Habbo Hotel: Origins Moderation Team' });

            try {
                if (!isBanned) {
                    await targetUser.send({ embeds: [dmEmbed] });
                }
            } catch (dmError) {
                console.log('Failed to send DM to user:', dmError.message);
            }

            // Log to mod channel
            const logChannel = await interaction.client.channels.fetch(process.env.MOD_REPORT_CHANNEL_ID);
            let logMessage = null;
            if (logChannel) {
                const logEmbed = new EmbedBuilder()
                    .setTitle('😡 Racism Violation Applied 😡')
                    .setDescription(`**__Racism Violation__**\n**To: **${targetUser} (${member.displayName})\n**Sanction: ** ${punishment} ${isBanned ? '🚨' : '🔇'}\n\n**__Reason:__**\n\`\`\`${privateReason}\`\`\`\n**__Reason Provided To User:__**\n\`\`\`${publicReason}\`\`\`\n**__Message Link:__** ${messageLink}\n\n**Mod:** ${interaction.user} (${interaction.user.username})`)
                    .setColor('#8B0000') // Dark red color for racism
                    .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }));

                logMessage = await logChannel.send({ embeds: [logEmbed] });
            }

            // Add to database
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
                        SanctionType: 'Racism',
                        PrivateReason: privateReason,
                        PublicReason: publicReason,
                        Punishment: punishment,
                        MessageLink: messageLink,
                        SanctionLink: logMessage ? logMessage.url : null,
                        ModDiscordID: interaction.user.id,
                        ModDiscordName: interaction.user.username
                    })
                });
            } catch (apiError) {
                console.log('Failed to log racism sanction to database:', apiError.message);
            }

            const confirmationMessage = `:rage: **Racism Violation** Applied - **${privateReason}**\n${logMessage ? logMessage.url : ''}`;

            const confirmationReply = await modalSubmission.reply({ content: confirmationMessage, ephemeral: true });

            setTimeout(async () => {
                try {
                    await confirmationReply.delete();
                } catch (error) {
                    console.log('Could not delete confirmation message');
                }
            }, 15000);

        } catch (error) {
            console.log('Error in racism handler:', error);
            await modalSubmission.reply({ content: 'Failed to apply racism sanction. Contact Hbabo Staff.', ephemeral: true });

            setTimeout(async () => {
                try {
                    await modalSubmission.deleteReply();
                } catch (error) {
                    console.log('Could not delete error message');
                }
            }, 15000);
        }
    } catch (error) {
        console.log('Modal timeout or error:', error);
    }
};