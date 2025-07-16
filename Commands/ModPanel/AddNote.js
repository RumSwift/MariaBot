const { EmbedBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require('discord.js');
const fetch = require('node-fetch');

module.exports = async (interaction, selectInteraction, targetUser, member) => {
    const modal = new ModalBuilder()
        .setCustomId('add_note_modal')
        .setTitle('Add User Note');

    const titleInput = new TextInputBuilder()
        .setCustomId('note_title')
        .setLabel('NOTE TITLE')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('Brief title for this note...')
        .setRequired(true)
        .setMaxLength(100);

    const noteInput = new TextInputBuilder()
        .setCustomId('note_text')
        .setLabel('NOTE TEXT')
        .setStyle(TextInputStyle.Paragraph)
        .setPlaceholder('Enter your note about this user...')
        .setRequired(true)
        .setMaxLength(1000);

    const messageLinkInput = new TextInputBuilder()
        .setCustomId('message_link')
        .setLabel('MESSAGE LINK (OPTIONAL)')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('Link to relevant message (optional)')
        .setRequired(false)
        .setMaxLength(500);

    const titleRow = new ActionRowBuilder().addComponents(titleInput);
    const noteRow = new ActionRowBuilder().addComponents(noteInput);
    const linkRow = new ActionRowBuilder().addComponents(messageLinkInput);

    modal.addComponents(titleRow, noteRow, linkRow);

    await selectInteraction.showModal(modal);

    const modalFilter = (modalInteraction) =>
        modalInteraction.customId === 'add_note_modal' &&
        modalInteraction.user.id === interaction.user.id;

    try {
        const modalSubmission = await selectInteraction.awaitModalSubmit({
            filter: modalFilter,
            time: 300000
        });

        const noteTitle = modalSubmission.fields.getTextInputValue('note_title');
        const noteText = modalSubmission.fields.getTextInputValue('note_text');
        const messageLink = modalSubmission.fields.getTextInputValue('message_link') || null;

        try {
            const logChannel = await interaction.client.channels.fetch(process.env.MOD_REPORT_CHANNEL_ID);
            let logMessage = null;

            if (logChannel) {
                const logEmbed = new EmbedBuilder()
                    .setTitle('📝 User Note Added')
                    .setDescription(`**__Note Added for User__**\n**User:** ${targetUser} (${member.displayName})\n**User ID:** ${targetUser.id}\n\n**__Title:__** ${noteTitle}\n\n**__Note:__**\n\`\`\`${noteText}\`\`\`${messageLink ? `\n**__Related Message:__** ${messageLink}` : ''}\n\n**Added By:** ${interaction.user} (${interaction.user.username})`)
                    .setColor('#98FB98')
                    .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }))
                    .setTimestamp();

                logMessage = await logChannel.send({ embeds: [logEmbed] });
            }

            const response = await fetch('http://localhost:3000/api/usernotes/AddUserNote', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': process.env.API_KEY
                },
                body: JSON.stringify({
                    DiscordID: targetUser.id,
                    AddedByDiscordID: interaction.user.id,
                    Title: noteTitle,
                    NoteText: noteText,
                    LinkedMessage: messageLink,
                    EmbedLink: logMessage ? logMessage.url : null
                })
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || 'Failed to save note to database');
            }

            const confirmationMessage = `📝 **User Note Added** - **${noteTitle}**\n${logMessage ? logMessage.url : ''}`;

            const confirmationReply = await modalSubmission.reply({
                content: confirmationMessage,
                ephemeral: true
            });

            setTimeout(async () => {
                try {
                    await confirmationReply.delete();
                } catch (error) {
                    console.log('Could not delete confirmation message');
                }
            }, 15000);

        } catch (error) {
            console.log('Error in add note handler:', error);
            await modalSubmission.reply({
                content: 'Failed to add user note. Contact Hbabo Staff.',
                ephemeral: true
            });

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