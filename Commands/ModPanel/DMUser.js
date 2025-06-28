const { EmbedBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require('discord.js');

module.exports = async (interaction, selectInteraction, targetUser, member) => {
    const modal = new ModalBuilder()
        .setCustomId('direct_message_modal')
        .setTitle('Write your DM');

    const messageInput = new TextInputBuilder()
        .setCustomId('dm_message')
        .setLabel('WHAT IS YOUR MESSAGE?')
        .setStyle(TextInputStyle.Paragraph)
        .setPlaceholder('Message to send the targeted user VIA DM')
        .setRequired(true)
        .setMaxLength(2947);

    const messageRow = new ActionRowBuilder().addComponents(messageInput);

    modal.addComponents(messageRow);

    await selectInteraction.showModal(modal);

    const modalFilter = (modalInteraction) => modalInteraction.customId === 'direct_message_modal' && modalInteraction.user.id === interaction.user.id;

    try {
        const modalSubmission = await selectInteraction.awaitModalSubmit({ filter: modalFilter, time: 300000 });

        const dmMessage = modalSubmission.fields.getTextInputValue('dm_message');

        try {
            const dmEmbed = new EmbedBuilder()
                .setTitle('Formal Message from **Habbo Hotel: Origins Server**')
                .setDescription(`Hello ${targetUser},\n\n${dmMessage}\n\nIf you have any questions or require clarification, you can use **/dmmod** in any channel for assistance. Alternatively, feel free to reply to this message to start a conversation with the moderation team.\n\nThank you for understanding.`)
                .setColor(16620576)
                .setFooter({ text: 'Habbo Hotel: Origins Moderation Team' });

            await targetUser.send({ embeds: [dmEmbed] });

            const logChannel = await interaction.client.channels.fetch(process.env.MOD_ACTIONS_LOG_CHANNEL_ID);
            let logMessage = null;
            if (logChannel) {
                const logEmbed = new EmbedBuilder()
                    .setTitle('📬 Direct Message Sent 📬')
                    .setDescription(`**__Official Direct Message Sent__**\n**To: **${targetUser} (${member.displayName})\n\n\`\`\`Hello ${targetUser},\n\n${dmMessage}\`\`\`\n\n**Mod:** ${interaction.user} (${interaction.user.username})`)
                    .setColor(9779933)
                    .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }));

                logMessage = await logChannel.send({ embeds: [logEmbed] });
            }

            const logLink = logMessage ? logMessage.url : '';
            await modalSubmission.reply({ content: `:mailbox_with_mail: **Direct Message** Sent - **${dmMessage}**\n${logLink}`, ephemeral: true });
        } catch (error) {
            await modalSubmission.reply({ content: 'Failed to send direct message. Contact Hbabo Staff.', ephemeral: true });
        }
    } catch (error) {
        console.log('Modal timeout or error');
    }
};