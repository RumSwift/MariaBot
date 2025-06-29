const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ComponentType } = require('discord.js');
const dmmodReplyService = require('../Services/DMmodReply');

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
        const language = interaction.options.getString('language');
        const userText = interaction.options.getString('text');
        const reportedPlayer = interaction.options.getUser('reported_player');
        const reportedMessage = interaction.options.getString('reported_message');
        const imageAttachment = interaction.options.getAttachment('image');

        // Determine channel and role based on language
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
                return await interaction.reply({ content: 'Moderation channel not found. Contact Hbabo Staff.', ephemeral: true });
            }

            // Create the moderation team embed
            const modEmbed = new EmbedBuilder()
                .setColor('#800080')
                .setTitle('💬 New message for the Mod team')
                .setDescription(`${interaction.user} has left a message`)
                .addFields(
                    { name: 'Optional field', value: `Reported player: ${reportedPlayer ? reportedPlayer.toString() : 'None'}\nReported message: ${reportedMessage || 'None'}`, inline: false }
                )
                .setThumbnail(interaction.user.displayAvatarURL({ dynamic: true }))
                .setFooter({ text: 'React to this msg with a ✅ if you are taking care of this message.' });

            // Add the user's message in a code block
            const userMessageContent = `Hello <@&${roleId}>,\n\n${userText}`;
            modEmbed.addFields({ name: '\u200B', value: `\`\`\`${userMessageContent}\`\`\``, inline: false });

            if (imageAttachment) {
                modEmbed.setImage(imageAttachment.url);
            }

            const selectMenu = new StringSelectMenuBuilder()
                .setCustomId(`dmmod_reply_${interaction.user.id}`)
                .setPlaceholder('Make a selection')
                .addOptions([
                    {
                        label: '💬 Reply',
                        description: 'Send a message to the player',
                        value: 'reply'
                    }
                ]);

            const row = new ActionRowBuilder().addComponents(selectMenu);

            // Send to mod channel with role mention
            await modChannel.send({
                content: `<@&${roleId}>`,
                embeds: [modEmbed],
                components: [row]
            });

            // Send confirmation DM to the user
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

            try {
                await interaction.user.send({ embeds: [userDMEmbed] });
                await interaction.reply({ content: 'Your message has been sent to the moderation team and you should receive a confirmation DM shortly.', ephemeral: true });
            } catch (dmError) {
                await interaction.reply({ content: 'Your message has been sent to the moderation team, but I couldn\'t send you a confirmation DM. Please check your DM settings.', ephemeral: true });
            }

            // Set up collector for the reply functionality
            const collector = modChannel.createMessageComponentCollector({
                componentType: ComponentType.StringSelect,
                filter: (i) => i.customId.startsWith('dmmod_reply_'),
                time: 24 * 60 * 60 * 1000 // 24 hours
            });

            collector.on('collect', async (selectInteraction) => {
                if (selectInteraction.values[0] === 'reply') {
                    const originalUserId = selectInteraction.customId.split('_')[2];
                    await dmmodReplyService.handleReplySelection(selectInteraction, originalUserId);
                }
            });

        } catch (error) {
            console.error('DMmod error:', error);
            await interaction.reply({ content: 'Failed to send message to moderation team. Contact Hbabo Staff.', ephemeral: true });
        }
    },
};