const { EmbedBuilder } = require('discord.js');
const fetch = require('node-fetch');

module.exports = async (interaction, selectInteraction, targetUser, member) => {
    try {
        const response = await fetch(`http://localhost:3000/api/usernotes/GetUserNotes/${targetUser.id}`, {
            headers: {
                'x-api-key': process.env.API_KEY
            }
        });

        if (!response.ok) {
            throw new Error('Failed to fetch user notes');
        }

        const data = await response.json();

        if (!data.success) {
            throw new Error(data.error || 'Failed to fetch user notes');
        }

        const notes = data.notes;

        if (notes.length === 0) {
            const noNotesEmbed = new EmbedBuilder()
                .setTitle(`📋 No Notes Found`)
                .setDescription(`No notes found for ${targetUser.username}`)
                .setColor('#98FB98')
                .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }))
                .setTimestamp();

            const noNotesReply = await selectInteraction.reply({
                embeds: [noNotesEmbed],
                ephemeral: true
            });

            return;
        }

        const notesList = notes.map(note => {
            const timestamp = Math.floor(new Date(note.Timestamp).getTime() / 1000);
            if (note.EmbedLink) {
                return `📜 [**${note.Title}**](${note.EmbedLink}) | <t:${timestamp}:R>`;
            } else {
                return `📜 **${note.Title}** | <t:${timestamp}:R>`;
            }
        }).join('\n');

        const notesEmbed = new EmbedBuilder()
            .setTitle(`📋 Viewing Notes of ${targetUser.username}`)
            .setDescription(`**Total Notes:** ${notes.length}\n\n${notesList}`)
            .setColor('#98FB98')
            .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }))
            .setTimestamp();

        if (notes.length > 25) {
            notesEmbed.setFooter({
                text: `Showing first 25 of ${notes.length} notes.`
            });
        }

        const notesReply = await selectInteraction.reply({
            embeds: [notesEmbed],
            ephemeral: true
        });

    } catch (error) {
        console.log('Error in view notes:', error);

        const errorReply = await selectInteraction.reply({
            content: 'Failed to fetch user notes. Contact Hbabo Staff.',
            ephemeral: true
        });

        setTimeout(async () => {
            try {
                await errorReply.delete();
            } catch (error) {
                console.log('Could not delete error message');
            }
        }, 15000);
    }
};