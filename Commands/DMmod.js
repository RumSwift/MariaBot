const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ComponentType } = require('discord.js');
const fetch = require('node-fetch');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('dmmod')
        .setDescription('Send a message to the moderation team')
        .addStringOption(option =>
            option.setName('language')
                .setDescription('Select your language')
                .setRequired(true)
                .addChoices(
                    { name: 'English', value: 'EN' },
                    { name: 'Español', value: 'ES' },
                    { name: 'Português (Brasil)', value: 'BR' }
                ))
        .addStringOption(option =>
            option.setName('text')
                .setDescription('Your message to the moderation team')
                .setRequired(true))
        .addUserOption(option =>
            option.setName('reported_player')
                .setDescription('Player you want to report (optional)')
                .setRequired(false))
        .addStringOption(option =>
            option.setName('reported_message')
                .setDescription('Link to the message you want to report (optional)')
                .setRequired(false))
        .addAttachmentOption(option =>
            option.setName('image')
                .setDescription('Upload an image as evidence (optional)')
                .setRequired(false)),

    async execute(interaction) {
        await interaction.reply({
            content: 'Processing your message to the mod team...',
            ephemeral: true
        });

        const language = interaction.options.getString('language');
        const userText = interaction.options.getString('text');
        const reportedPlayer = interaction.options.getUser('reported_player');
        const reportedMessage = interaction.options.getString('reported_message');
        const imageAttachment = interaction.options.getAttachment('image');

        let channelId, roleId;
        switch (language) {
            case 'ES':
                channelId = process.env.DM_MOD_ES;
                roleId = process.env.LANGUAGE_MOD_ES;
                break;
            case 'BR':
                channelId = process.env.MD_MOD_BR;
                roleId = process.env.LANGUAGE_MOD_BR;
                break;
            default: // EN
                channelId = process.env.DM_MOD_EN;
                roleId = process.env.COMMUNITY_MOD;
                break;
        }

        try {
            const modChannel = await interaction.client.channels.fetch(channelId);
            if (!modChannel) {
                return await interaction.editReply({
                    content: 'Moderation channel not found. Contact Hbabo Staff.'
                });
            }

            const modEmbed = new EmbedBuilder()
                .setColor('#800080')
                .setTitle('💬 New message for the Mod team')
                .setDescription(`${interaction.user} has left a message`)
                .addFields(
                    { name: 'Optional field', value: `Reported player: ${reportedPlayer ? reportedPlayer.toString() : 'None'}\nReported message: ${reportedMessage || 'None'}`, inline: false }
                )
                .setThumbnail(interaction.user.displayAvatarURL({ dynamic: true }))
                .setFooter({ text: 'React to this msg with a ✅ if you are taking care of this message.' });

            const userMessageContent = `Hello <@&${roleId}>,\n\n${userText}`;
            modEmbed.addFields({ name: '\u200B', value: `\`\`\`${userMessageContent}\`\`\``, inline: false });

            if (imageAttachment) {
                modEmbed.setImage(imageAttachment.url);
            }

            const modMessage = await modChannel.send({
                content: `<@&${roleId}>`,
                embeds: [modEmbed]
            });

            const selectMenu = new StringSelectMenuBuilder()
                .setCustomId(`dmmod_reply_${modMessage.id}`)
                .setPlaceholder('Make a selection')
                .addOptions([
                    {
                        label: '💬 Reply',
                        description: 'Send a message to the player',
                        value: 'reply'
                    }
                ]);

            const row = new ActionRowBuilder().addComponents(selectMenu);

            await modMessage.edit({
                content: `<@&${roleId}>`,
                embeds: [modEmbed],
                components: [row]
            });

            fetch('http://localhost:3000/api/dmmod/CreateDMmod', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': process.env.API_KEY
                },
                body: JSON.stringify({
                    DiscordID: interaction.user.id,
                    DiscordName: interaction.user.username,
                    Language: language,
                    MessageText: userText,
                    ReportedPlayerID: reportedPlayer ? reportedPlayer.id : null,
                    ReportedPlayerName: reportedPlayer ? reportedPlayer.username : null,
                    ReportedMessage: reportedMessage,
                    ImageURL: imageAttachment ? imageAttachment.url : null,
                    ModChannelID: channelId,
                    ModMessageID: modMessage.id
                })
            }).then(response => {
                console.log(`DMmod stored in database for user ${interaction.user.username} (${interaction.user.id})`);
            }).catch(dbError => {
                console.log('Failed to store DMmod in database:', dbError.message);
            });

            const userDMEmbed = new EmbedBuilder()
                .setColor('#800080')
                .setTitle('Formal message from Habbo Hotel: Origins Server')
                .setDescription(`Thank you again, ${interaction.user}!\n\nYour message has been received and will be reviewed promptly. Should we require further information or need to get in touch, we'll do it here.\n\nMeanwhile, this is a preview of your message:`)
                .addFields({
                    name: '\u200B',
                    value: `\`\`\`${userText}\`\`\``,
                    inline: false
                })
                .setThumbnail(interaction.client.user.displayAvatarURL({ dynamic: true }))
                .setFooter({ text: 'Have a nice day!' });

            interaction.user.send({ embeds: [userDMEmbed] }).then(() => {
                interaction.editReply({
                    content: 'Your message has been sent to the moderation team and you should receive a confirmation DM shortly.'
                });
            }).catch(dmError => {
                interaction.editReply({
                    content: 'Your message has been sent to the moderation team, but I couldn\'t send you a confirmation DM. Please check your DM settings.'
                });
            });

        } catch (error) {
            console.error('DMmod error:', error);
            await interaction.editReply({
                content: 'Failed to send message to moderation team. Contact Habbo Staff.'
            });
        }
    },
};