const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ComponentType, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');

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
                    label: '📮 Direct Message',
                    description: 'Send a DM from Maria, to a user',
                    value: 'direct_message'
                },
                {
                    label: '⚠️ Verbal Warning',
                    description: 'Moderate a user with only a verbal warning. No sanction.',
                    value: 'verbal_warning'
                },
                {
                    label: '⚔️ Moderate with Sanction',
                    description: '10 Min > 3 Hrs > 1 Day > 5 Days > 7 Days > Ban',
                    value: 'moderate'
                },
                {
                    label: '💳 Profile Violation',
                    description: 'Warning > Kick > Ban',
                    value: 'profile_violation'
                },
                {
                    label: '🤬 Racism',
                    description: '7 Days > Ban',
                    value: 'racism'
                },
                {
                    label: '🗂️ User Notes',
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

                    const logLink = logMessage ? logMessage.url : '';
                    await selectInteraction.reply({ content: `:police_car: **Emergency Mute** Applied - **The situation is critical. The user has been muted for 24 hours without notification, while we prepare a mod report. This could also be so we can leave the user for staff evaluation**\n${logLink}`, ephemeral: true });
                } catch (error) {
                    await selectInteraction.reply({ content: 'Failed to apply emergency mute. Contact Hbabo Staff.', ephemeral: true });
                }
            } else if (selectedValue === 'direct_message') {
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
            } else if (selectedValue === 'verbal_warning') {
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

                        const logLink = logMessage ? logMessage.url : '';
                        await modalSubmission.reply({ content: `:warning: **Verbal Warning** Applied - **${privateReason}**\n${logLink}`, ephemeral: true });
                    } catch (error) {
                        await modalSubmission.reply({ content: 'Failed to send verbal warning. Contact Hbabo Staff.', ephemeral: true });
                    }
                } catch (error) {
                    console.log('Modal timeout or error');
                }
            } else {
                let responseMessage = '';

                switch (selectedValue) {
                    case 'moderate':
                        responseMessage = 'You selected: Moderate';
                        break;
                    case 'user_notes':
                        responseMessage = 'You selected: User Notes';
                        break;
                    case 'profile_violation':
                        responseMessage = 'You selected: Profile Violation';
                        break;
                    case 'racism':
                        responseMessage = 'You selected: Racism';
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