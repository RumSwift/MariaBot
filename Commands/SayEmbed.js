const { SlashCommandBuilder, InteractionContextType, EmbedBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('sayembed')
        .setContexts(InteractionContextType.Guild)
        .setDescription('Send a custom embed message')
        .addStringOption(option =>
            option.setName('channel')
                .setDescription('Channel ID to send embed to')
                .setRequired(false))
        .addAttachmentOption(option =>
            option.setName('image')
                .setDescription('Upload an image for the embed')
                .setRequired(false))
        .addStringOption(option =>
            option.setName('image-url')
                .setDescription('Image URL for the embed')
                .setRequired(false))
        .addRoleOption(option =>
            option.setName('force-tag')
                .setDescription('Role to tag before the embed')
                .setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),



    async execute(interaction) {

        const allowedRoles = [
            process.env.HABBO_STAFF,
            process.env.SULAKE_STAFF,
            process.env.HEAD_MOD,
            process.env.COMMUNITY_MOD,
            process.env.LANGUAGE_MOD_ES,
            process.env.LANGUAGE_MOD_BR
        ].filter(Boolean);


        const userRoles = interaction.member.roles.cache;
        const hasPermission = allowedRoles.some(roleId => userRoles.has(roleId));

        if (!hasPermission) {
            const errorReply = await interaction.reply({
                content: 'You do not have permission to use this command.',
                ephemeral: true
            });

            setTimeout(async () => {
                try {
                    await errorReply.delete();
                } catch (error) {
                    console.log('Could not delete permission error message');
                }
            }, 15000);

            return;
        }

        const modal = new ModalBuilder()
            .setCustomId('embed_modal')
            .setTitle('Create Embed');

        const titleInput = new TextInputBuilder()
            .setCustomId('embed_title')
            .setLabel('Title')
            .setStyle(TextInputStyle.Short)
            .setRequired(true)
            .setMaxLength(256);

        const messageInput = new TextInputBuilder()
            .setCustomId('embed_message')
            .setLabel('Message')
            .setStyle(TextInputStyle.Paragraph)
            .setRequired(true)
            .setMaxLength(4000);

        const colorInput = new TextInputBuilder()
            .setCustomId('embed_color')
            .setLabel('Colour (hex code, e.g. #ffcc00)')
            .setStyle(TextInputStyle.Short)
            .setRequired(false)
            .setPlaceholder('#ffcc00');

        const titleRow = new ActionRowBuilder().addComponents(titleInput);
        const messageRow = new ActionRowBuilder().addComponents(messageInput);
        const colorRow = new ActionRowBuilder().addComponents(colorInput);

        modal.addComponents(titleRow, messageRow, colorRow);

        await interaction.showModal(modal);

        const filter = (modalInteraction) => modalInteraction.customId === 'embed_modal' && modalInteraction.user.id === interaction.user.id;

        try {
            const modalSubmission = await interaction.awaitModalSubmit({ filter, time: 300000 });

            const title = modalSubmission.fields.getTextInputValue('embed_title');
            const message = modalSubmission.fields.getTextInputValue('embed_message');
            const colorInput = modalSubmission.fields.getTextInputValue('embed_color');

            let color = '#ffcc00';
            if (colorInput && colorInput.trim()) {
                const hexRegex = /^#?([0-9A-Fa-f]{6}|[0-9A-Fa-f]{3})$/;
                if (hexRegex.test(colorInput.trim())) {
                    color = colorInput.trim().startsWith('#') ? colorInput.trim() : '#' + colorInput.trim();
                }
            }

            const channelId = interaction.options.getString('channel');
            const imageAttachment = interaction.options.getAttachment('image');
            const imageUrl = interaction.options.getString('image-url');
            const forceTag = interaction.options.getRole('force-tag');

            let targetChannel = interaction.channel;

            if (channelId) {
                try {
                    targetChannel = await interaction.client.channels.fetch(channelId);
                    if (!targetChannel || !targetChannel.isTextBased()) {
                        return await modalSubmission.reply({ content: 'Invalid channel ID.', ephemeral: true });
                    }
                } catch (error) {
                    return await modalSubmission.reply({ content: 'Could not find that channel.', ephemeral: true });
                }
            }

            const embed = new EmbedBuilder()
                .setTitle(title)
                .setDescription(message)
                .setColor(color);

            if (imageUrl) {
                embed.setImage(imageUrl);
            } else if (imageAttachment) {
                embed.setImage(imageAttachment.url);
            }

            let messageContent = '';
            if (forceTag) {
                messageContent = `${forceTag}`;
            }

            try {
                await targetChannel.send({
                    content: messageContent || undefined,
                    embeds: [embed]
                });

                const logChannel = await interaction.client.channels.fetch(process.env.SAYS_LOG_CHANNEL_ID);
                if (logChannel) {
                    const logEmbed = new EmbedBuilder()
                        .setTitle(title)
                        .setDescription(`${message}\n\nSent by: ${interaction.user} (${interaction.user.username})\nIn: ${targetChannel}\nTime: <t:${Math.floor(Date.now() / 1000)}:R>`)
                        .setColor(color);

                    if (imageUrl) {
                        logEmbed.setImage(imageUrl);
                    } else if (imageAttachment) {
                        logEmbed.setImage(imageAttachment.url);
                    }

                    if (forceTag) {
                        await logChannel.send({
                            content: `Force Tag: ${forceTag}`,
                            embeds: [logEmbed]
                        });
                    } else {
                        await logChannel.send({ embeds: [logEmbed] });
                    }
                }

                await modalSubmission.reply({ content: 'Embed sent successfully!', ephemeral: true });
            } catch (error) {
                await modalSubmission.reply({ content: 'Failed to send embed.', ephemeral: true });
            }

        } catch (error) {
            console.error('Modal error:', error);
        }
    },
};