const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    async handleReplySelection(selectInteraction, originalUserId) {
        const modal = new ModalBuilder()
            .setCustomId('dmmod_reply_modal')
            .setTitle('Write your DM');

        const replyInput = new TextInputBuilder()
            .setCustomId('reply_text')
            .setLabel('Reply')
            .setStyle(TextInputStyle.Paragraph)
            .setRequired(true)
            .setMaxLength(4000);

        const replyRow = new ActionRowBuilder().addComponents(replyInput);
        modal.addComponents(replyRow);

        await selectInteraction.showModal(modal);

        const modalFilter = (modalInteraction) =>
            modalInteraction.customId === 'dmmod_reply_modal' &&
            modalInteraction.user.id === selectInteraction.user.id;

        try {
            const modalSubmission = await selectInteraction.awaitModalSubmit({
                filter: modalFilter,
                time: 300000
            });

            const replyText = modalSubmission.fields.getTextInputValue('reply_text');

            // Get the original user who sent the /dmmod
            const originalUser = await selectInteraction.client.users.fetch(originalUserId);

            // Send DM to original user
            const dmEmbed = new EmbedBuilder()
                .setColor('#800080')
                .setTitle('Formal message from Habbo Hotel: Origins Server')
                .setDescription(`Hello ${originalUser},\n\n${replyText}\n\nIf you have any questions, you can use /dmmod in any channel for quick help. Alternatively, you can write in this DM to start a conversation with Mod Mail. Just remember to click the Open Mod Mail button after typing your message to send it!`)
                .setFooter({ text: 'Habbo Hotel: Origins Moderation' });

            try {
                await originalUser.send({ embeds: [dmEmbed] });
            } catch (dmError) {
                console.log('Failed to send DM to original user:', dmError.message);
                return await modalSubmission.reply({
                    content: 'Failed to send DM to user. They may have DMs disabled.',
                    ephemeral: true
                });
            }

            // Update the original embed to remove selection and add reply
            const originalEmbed = selectInteraction.message.embeds[0];
            const updatedEmbed = new EmbedBuilder()
                .setColor(originalEmbed.color)
                .setTitle(originalEmbed.title)
                .setDescription(originalEmbed.description)
                .setThumbnail(originalEmbed.thumbnail?.url)
                .setFooter(originalEmbed.footer);

            // Copy original fields
            if (originalEmbed.fields) {
                originalEmbed.fields.forEach(field => {
                    updatedEmbed.addFields({ name: field.name, value: field.value, inline: field.inline });
                });
            }

            // Add the reply section
            updatedEmbed.addFields({
                name: '\u200B',
                value: `-------------------\n\n**Replied By:** ${selectInteraction.user}\n\n\`\`\`${replyText}\`\`\``,
                inline: false
            });

            // Copy image if it exists
            if (originalEmbed.image) {
                updatedEmbed.setImage(originalEmbed.image.url);
            }

            // Update the message without components (removes the selection menu)
            await selectInteraction.message.edit({
                embeds: [updatedEmbed],
                components: []
            });

            await modalSubmission.reply({
                content: 'Reply sent successfully and embed updated!',
                ephemeral: true
            });

        } catch (error) {
            console.log('Modal timeout or error:', error);
        }
    }
};