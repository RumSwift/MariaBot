const { EmbedBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require('discord.js');

module.exports = async (interaction, selectInteraction, targetUser, member) => {
    const modal = new ModalBuilder()
        .setCustomId('verbal_warning_modal')
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

    await selectInteraction.showModal(modal);

    const modalFilter = (modalInteraction) => modalInteraction.customId === 'verbal_warning_modal' && modalInteraction.user.id === interaction.user.id;

    try {
        const modalSubmission = await selectInteraction.awaitModalSubmit({ filter: modalFilter, time: 300000 });

        const privateReason = modalSubmission.fields.getTextInputValue('private_reason');
        const publicReason = modalSubmission.fields.getTextInputValue('public_reason');
        const messageLink = modalSubmission.fields.getTextInputValue('message_link');

        try {
            if (member.isCommunicationDisabled()) {
                await member.timeout(null);
            }

            const dmEmbed = new EmbedBuilder()
                .setTitle('Formal Message from __Habbo Hotel: Origins Server__')
                .setDescription(`Hello ${targetUser},\n\nThis is a **__verbal warning__** regarding your recent behaviour in the Discord.\n\n\`\`\`${publicReason}\`\`\`\nUnfortunately, if this continues, we will have to take further actions. We encourage you to read out community guides, found here: https://discord.com/channels/1252726515712528444/1276211712760090685\n\nIf you have any questions or require clarification, you can use **/dmmod** in any channel for assistance. Alternatively, feel free to reply to this DM to start a conversation with the moderation team.\n\nThank you for understanding.`)
                .setColor(16620576)
                .setFooter({ text: 'Habbo Hotel: Origins Moderation Team' });

            await targetUser.send({ embeds: [dmEmbed] });

            const logChannel = await interaction.client.channels.fetch(process.env.MOD_REPORT_CHANNEL_ID);
            let logMessage = null;
            if (logChannel) {
                const logEmbed = new EmbedBuilder()
                    .setTitle('⚠️ Verbal Warning ⚠️')
                    .setDescription(`**__Official Verbal Warning Applied__**\n**To: **${targetUser} (${member.displayName})\n\n**__Reason:__**\n\`\`\`${privateReason}\`\`\`\n**__Reason Provided To The User:__**\n\`\`\`${publicReason}\`\`\`\n**__Message Link:__** ${messageLink}\n\nMod: ${interaction.user} (${interaction.user.username})`)
                    .setColor(3851229)
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
                        SanctionType: 'Verbal Warning',
                        PrivateReason: privateReason,
                        PublicReason: publicReason,
                        Punishment: null,
                        MessageLink: messageLink,
                        SanctionLink: logMessage ? logMessage.url : null,
                        ModDiscordID: interaction.user.id,
                        ModDiscordName: interaction.user.username
                    })
                });
            } catch (apiError) {
                console.log('Failed to log sanction to database:', apiError.message);
            }

            const logLink = logMessage ? logMessage.url : '';
            const confirmationReply = await modalSubmission.reply({ content: `:warning: **Verbal Warning** Applied - **${privateReason}**\n${logLink}`, ephemeral: true });

            setTimeout(async () => {
                try {
                    await confirmationReply.delete();
                } catch (error) {
                    console.log('Could not delete confirmation message');
                }
            }, 15000);
        } catch (error) {
            await modalSubmission.reply({ content: 'Failed to send verbal warning. Contact Hbabo Staff.', ephemeral: true });

            setTimeout(async () => {
                try {
                    await modalSubmission.deleteReply();
                } catch (error) {
                    console.log('Could not delete error message');
                }
            }, 15000);
        }
    } catch (error) {
        console.log('Modal timeout or error');
    }
};