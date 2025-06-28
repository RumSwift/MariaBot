const { EmbedBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require('discord.js');
const fetch = require('node-fetch');

module.exports = async (interaction, selectInteraction, targetUser, member) => {
    console.log('Moderate handler called');
    console.log('SelectInteraction deferred?', selectInteraction.deferred);
    console.log('SelectInteraction replied?', selectInteraction.replied);

    const modal = new ModalBuilder()
        .setCustomId('moderate_modal')
        .setTitle('Form Title');

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

    try {
        console.log('Attempting to show modal...');
        await selectInteraction.showModal(modal);
        console.log('Modal shown successfully');
    } catch (error) {
        console.log('Failed to show modal:', error);
        return;
    }

    const modalFilter = (modalInteraction) => modalInteraction.customId === 'moderate_modal' && modalInteraction.user.id === interaction.user.id;

    try {
        const modalSubmission = await selectInteraction.awaitModalSubmit({ filter: modalFilter, time: 300000 });

        const privateReason = modalSubmission.fields.getTextInputValue('private_reason');
        const publicReason = modalSubmission.fields.getTextInputValue('public_reason');
        const messageLink = modalSubmission.fields.getTextInputValue('message_link');

        try {
            let guidelinesStrikes = 0;
            try {
                const apiResponse = await fetch(`http://localhost:3000/api/sanctions/GetSanctionsByDiscordID/${targetUser.id}`, {
                    headers: {
                        'x-api-key': process.env.API_KEY
                    }
                });

                if (apiResponse.ok) {
                    const sanctionData = await apiResponse.json();
                    if (sanctionData.success && sanctionData.count > 0) {
                        guidelinesStrikes = sanctionData.data.filter(sanction => sanction.SanctionType === 'Guidelines Strike').length;
                    }
                }
            } catch (apiError) {
                console.log('Failed to fetch sanction history:', apiError.message);
            }

            if (member.isCommunicationDisabled()) {
                await member.timeout(null);
            }

            let punishment = '';
            let muteDuration = 0;
            let isBanned = false;

            if (guidelinesStrikes === 0) {
                muteDuration = 10 * 60 * 1000;
                punishment = '10 Minutes Muted';
                await member.timeout(muteDuration, 'Guidelines Strike - 10 minutes');
            } else if (guidelinesStrikes === 1) {
                muteDuration = 3 * 60 * 60 * 1000;
                punishment = '3 Hours Muted';
                await member.timeout(muteDuration, 'Guidelines Strike - 3 hours');
            } else if (guidelinesStrikes === 2) {
                muteDuration = 24 * 60 * 60 * 1000;
                punishment = '1 Day Muted';
                await member.timeout(muteDuration, 'Guidelines Strike - 1 day');
            } else if (guidelinesStrikes === 3) {
                muteDuration = 5 * 24 * 60 * 60 * 1000;
                punishment = '5 Days Muted';
                await member.timeout(muteDuration, 'Guidelines Strike - 5 days');
            } else if (guidelinesStrikes === 4) {
                muteDuration = 7 * 24 * 60 * 60 * 1000;
                punishment = '7 Days Muted';
                await member.timeout(muteDuration, 'Guidelines Strike - 7 days');
            } else if (guidelinesStrikes >= 5) {
                punishment = 'User Banned';
                isBanned = true;
                await member.ban({ reason: 'Guidelines Strike - Ban' });
            }

            const dmEmbed = new EmbedBuilder()
                .setTitle('Formal Message from __Habbo Hotel: Origins Server__')
                .setDescription(`Hello ${targetUser},\n\nThis is a **__community guidelines strike__** regarding your recent behaviour in the Discord.\n\n\`\`\`${publicReason}\`\`\`\n${isBanned ? 'You have been banned from the server.' : `You have been muted for ${punishment.toLowerCase()}.`}\n\nUnfortunately, if this continues, we will have to take further actions. We encourage you to read out community guides, found here: https://discord.com/channels/1252726515712528444/1276211712760090685\n\nIf you have any questions or require clarification, you can use **/dmmod** in any channel for assistance. Alternatively, feel free to reply to this DM to start a conversation with the moderation team.\n\nThank you for understanding.`)
                .setColor(16620576)
                .setFooter({ text: 'Habbo Hotel: Origins Moderation Team' });

            try {
                if (!isBanned) {
                    await targetUser.send({ embeds: [dmEmbed] });
                }
            } catch (dmError) {
                console.log('Failed to send DM to user:', dmError.message);
            }

            const logChannel = await interaction.client.channels.fetch(process.env.MOD_REPORT_CHANNEL_ID);
            let logMessage = null;
            if (logChannel) {
                const logEmbed = new EmbedBuilder()
                    .setTitle('⚔️ Sanction Applied ⚔️')
                    .setDescription(`**__Community Guidelines Strike__**\n**To: **${targetUser} (${member.displayName})\n**Sanction: ** ${punishment} ${isBanned ? '🚨' : '🔇'}\n\n**__Reason:__**\n\`\`\`${privateReason}\`\`\`\n**__Reason Provided To User:__**\n\`\`\`${publicReason}\`\`\`\n**Mod:** ${interaction.user} (${interaction.user.username})`)
                    .setColor(isBanned ? 12060423 : 4541125)
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
                        SanctionType: 'Guidelines Strike',
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
                console.log('Failed to log sanction to database:', apiError.message);
            }

            const confirmationMessage = `:crossed_swords: **Guidelines Strike** Applied - **${privateReason}**\n${logMessage ? logMessage.url : ''}`;

            const confirmationReply = await modalSubmission.reply({ content: confirmationMessage, ephemeral: true });

            setTimeout(async () => {
                try {
                    await confirmationReply.delete();
                } catch (error) {
                    console.log('Could not delete confirmation message');
                }
            }, 15000);
        } catch (error) {
            console.log('Error in moderate handler:', error);
            await modalSubmission.reply({ content: 'Failed to apply sanction. Contact Hbabo Staff.', ephemeral: true });

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