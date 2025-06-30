const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, EmbedBuilder, ComponentType } = require('discord.js');
const fetch = require('node-fetch');

module.exports = {
    async handleReplySelection(selectInteraction, originalUserId, messageId) {
        try {
            console.log(`Handling reply selection - UserId: ${originalUserId}, MessageId: ${messageId}`);

            // If originalUserId is not provided, look up from database using messageId
            if (!originalUserId) {
                // Use provided messageId or fall back to interaction message ID
                const lookupMessageId = messageId || selectInteraction.message.id;
                console.log(`Looking up DMmod with message ID: ${lookupMessageId}`);

                const response = await fetch(`http://localhost:3000/api/dmmod/GetDMmodByMessage/${lookupMessageId}`, {
                    headers: {
                        'x-api-key': process.env.API_KEY
                    }
                });

                console.log(`API response status: ${response.status}`);

                if (response.ok) {
                    const data = await response.json();
                    console.log('API response data:', JSON.stringify(data, null, 2));

                    if (data.success && data.found) {
                        originalUserId = data.dmmod.DiscordID;
                        console.log(`Found original user ID: ${originalUserId}`);
                    } else {
                        console.log('DMmod not found in database for message:', lookupMessageId);
                        return await selectInteraction.reply({
                            content: 'Could not find the original DMmod message. It may have expired or been processed already.',
                            ephemeral: true
                        });
                    }
                } else {
                    console.log('Failed to fetch DMmod by message ID:', response.status);
                    return await selectInteraction.reply({
                        content: 'Error looking up DMmod information. Please try again.',
                        ephemeral: true
                    });
                }
            }

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

                // Update DMmod status in database
                try {
                    await fetch(`http://localhost:3000/api/dmmod/UpdateDMmodStatus/${selectInteraction.message.id}`, {
                        method: 'PUT',
                        headers: {
                            'Content-Type': 'application/json',
                            'x-api-key': process.env.API_KEY
                        },
                        body: JSON.stringify({
                            status: 'REPLIED'
                        })
                    });
                    console.log(`DMmod ${selectInteraction.message.id} marked as REPLIED in database`);
                } catch (dbError) {
                    console.log('Failed to update DMmod status in database:', dbError.message);
                }

                await modalSubmission.reply({
                    content: 'Reply sent successfully and embed updated!',
                    ephemeral: true
                });

            } catch (error) {
                console.log('Modal timeout or error:', error);
            }

        } catch (error) {
            console.log('Error in handleReplySelection:', error);
            try {
                if (!selectInteraction.replied && !selectInteraction.deferred) {
                    await selectInteraction.reply({
                        content: 'There was an error processing your reply. Please try again.',
                        ephemeral: true
                    });
                }
            } catch (replyError) {
                console.log('Failed to send error reply:', replyError.message);
            }
        }
    },

    // Set up persistent collectors that work after bot restarts
    setupCollectors(client) {
        // Store reference to the service object
        const serviceInstance = this;

        client.on('interactionCreate', async (interaction) => {
            if (!interaction.isStringSelectMenu()) return;

            // Handle DMmod reply selections - now using message ID in custom ID
            if (interaction.customId.startsWith('dmmod_reply_')) {
                console.log(`DMmod reply interaction received for message: ${interaction.message.id}`);
                console.log(`Custom ID: ${interaction.customId}`);

                if (interaction.values[0] === 'reply') {
                    // Extract message ID from custom ID
                    const messageId = interaction.customId.replace('dmmod_reply_', '');
                    console.log(`Extracted message ID: ${messageId}`);

                    // Use the message ID to look up the DMmod
                    await serviceInstance.handleReplySelection(interaction, null, messageId);
                }
            }
        });

        console.log('DMmod collectors set up successfully');
    }
};