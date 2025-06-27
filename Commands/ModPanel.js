const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ComponentType } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('modpanel')
        .setDescription('Open moderation panel for a user')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('User to moderate')
                .setRequired(true)),

    async execute(interaction) {
        const targetUser = interaction.options.getUser('user');
        const member = await interaction.guild.members.fetch(targetUser.id).catch(() => null);

        if (!member) {
            return await interaction.reply({ content: 'User not found in server.', ephemeral: true });
        }

        const embed = new EmbedBuilder()
            .setTitle('Welcome to the mod panel of Habbo Hotel: Origins')
            .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }))
            .setDescription(`**Mod history of ${targetUser}:**\n\n• ✅ No current mod history\n\n**History numbers:**\nWarning counts: 0\nInappropriate Profile: 0\nPhishing: 0\nRacism: 0\n\n**Nicknames:**\n• ${member.displayName}`)
            .setColor('#ffcc00');

        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId('modpanel_select')
            .setPlaceholder('Make a selection')
            .addOptions([
                {
                    label: '🔕 Emergency Mute',
                    description: "In case of emergency, mutes but doesn't notify",
                    value: 'emergency_mute'
                },
                {
                    label: '⚠️ Verbal Warning',
                    description: 'Moderate a user with only a verbal warning. No sanction.',
                    value: 'verbal_warning'
                },
                {
                    label: '⚔️ Moderate with Sanction',
                    description: 'Take moderation action against a troublemaker. Sanction applied.',
                    value: 'moderate'
                },

                {
                    label: '📮 Direct Message',
                    description: 'Send a DM from Maria, to a user',
                    value: 'direct_message'
                },
                {
                    label: '📕 User Notes',
                    description: 'View added notes for the user',
                    value: 'user_notes'
                }
            ]);

        const row = new ActionRowBuilder().addComponents(selectMenu);

        const response = await interaction.reply({
            embeds: [embed],
            components: [row],
            ephemeral: true
        });

        const collector = response.createMessageComponentCollector({
            componentType: ComponentType.StringSelect,
            time: 60000
        });

        collector.on('collect', async (selectInteraction) => {
            if (selectInteraction.user.id !== interaction.user.id) {
                return await selectInteraction.reply({ content: 'This panel is not for you.', ephemeral: true });
            }

            const selectedValue = selectInteraction.values[0];

            if (selectedValue === 'emergency_mute') {
                try {
                    await member.timeout(24 * 60 * 60 * 1000, 'Emergency mute - 24 hours');

                    const logChannel = await interaction.client.channels.fetch(process.env.MOD_REPORT_CHANNEL_ID);
                    let logMessage = null;
                    if (logChannel) {
                        const logEmbed = new EmbedBuilder()
                            .setTitle('🚔 EMERGENCY - Preventive 24h Mute 🚔')
                            .setDescription(`**__24 Hour Emergency Mute Applied__**\n**To: **${targetUser} (${member.displayName})\n\n**__Reason:__**\n\`\`\`The situation is critical. The user has been muted for 24 hours without notification, while we prepare a mod report. This could also be so we can leave the user for staff evaluation\`\`\`\n**Mod:** ${interaction.user} (${interaction.user.username})`)
                            .setColor(13961941)
                            .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }));

                        logMessage = await logChannel.send({ embeds: [logEmbed] });
                    }

                    const logLink = logMessage ? `\n[View Log Entry](${logMessage.url})` : '';
                    await selectInteraction.reply({ content: `${targetUser.username} has been emergency muted for 24 hours${logLink}`, ephemeral: true });
                } catch (error) {
                    await selectInteraction.reply({ content: 'Failed to apply emergency mute. Contact Hbabo Staff.', ephemeral: true });
                }
            } else {
                let responseMessage = '';

                switch (selectedValue) {
                    case 'moderate':
                        responseMessage = 'You selected: Moderate';
                        break;
                    case 'direct_message':
                        responseMessage = 'You selected: Direct Message';
                        break;
                    case 'user_notes':
                        responseMessage = 'You selected: User Notes';
                        break;
                    case 'verbal_warning':
                        responseMessage = 'You selected: Verbal Warning';
                        break;
                }

                await selectInteraction.reply({ content: responseMessage, ephemeral: true });
            }
        });

        collector.on('end', async () => {
            try {
                await response.delete();
            } catch (error) {
                console.log('Could not delete expired modpanel');
            }
        });
    },
};