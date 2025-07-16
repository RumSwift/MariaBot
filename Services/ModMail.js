const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, ComponentType, ChannelType } = require('discord.js');
const fetch = require('node-fetch');

module.exports = {
    async handleUserDM(message) {
        if (message.author.bot) return;
        if (message.guild) return;
        if (!message.content) return;

        const userId = message.author.id;


        try {
            const banCheckResponse = await fetch(`http://localhost:3000/api/modmail/CheckModMailBan/${userId}`, {
                headers: {
                    'x-api-key': process.env.API_KEY
                }
            });

            if (banCheckResponse.ok) {
                const banData = await banCheckResponse.json();
                if (banData.success && banData.isBanned) {

                    const bannedEmbed = new EmbedBuilder()
                        .setColor('#FF0000')
                        .setTitle('🚫 ModMail Access Restricted')
                        .setDescription(`Hello ${message.author},\n\nYour access to ModMail has been restricted by the moderation team. You are currently unable to contact our moderators through this system.\n\nIf you believe this restriction was applied in error, please contact our support team through alternative channels:\n\n• 🇬🇧 English: https://habbohotelorigins.zendesk.com/hc/en-us\n• 🇪🇸 Español: https://habbohotelorigins.zendesk.com/hc/es\n• 🇧🇷🇵🇹 Português/Brasileiro: https://habbohotelorigins.zendesk.com/hc/pt-br\n\nThank you for understanding.`)
                        .setThumbnail(message.client.user.displayAvatarURL({ dynamic: true }))
                        .setFooter({ text: 'Habbo Hotel: Origins Moderation Team' });

                    await message.author.send({ embeds: [bannedEmbed] });
                    return;
                }
            }
        } catch (error) {
            console.log('Failed to check ModMail ban status:', error.message);
        }


        try {
            console.log(`Checking active ModMail for user: ${userId}`);
            const activeResponse = await fetch(`http://localhost:3000/api/modmail/GetActiveModMail/${userId}`, {
                headers: {
                    'x-api-key': process.env.API_KEY
                }
            });

            if (activeResponse.ok) {
                const activeData = await activeResponse.json();
                console.log('Active ModMail response:', JSON.stringify(activeData, null, 2));

                if (activeData.success && activeData.hasActive) {

                    try {
                        console.log(`Forwarding message to thread: ${activeData.activeModMail.ThreadID}`);
                        const thread = await message.client.channels.fetch(activeData.activeModMail.ThreadID);
                        if (thread && !thread.locked) {
                            await thread.send(`**${message.author.username}**: ${message.content}`);
                            console.log('Message forwarded successfully');


                            await fetch(`http://localhost:3000/api/modmail/UpdateActivity/${activeData.activeModMail.ThreadID}`, {
                                method: 'PUT',
                                headers: {
                                    'x-api-key': process.env.API_KEY
                                }
                            });

                            return;
                        } else {
                            console.log('Thread is locked or not found, closing ModMail');
                            await fetch(`http://localhost:3000/api/modmail/CloseActiveModMail/${userId}`, {
                                method: 'PUT',
                                headers: {
                                    'x-api-key': process.env.API_KEY
                                }
                            });
                        }
                    } catch (error) {
                        console.log('Failed to forward message to thread:', error.message);

                        await fetch(`http://localhost:3000/api/modmail/CloseActiveModMail/${userId}`, {
                            method: 'PUT',
                            headers: {
                                'x-api-key': process.env.API_KEY
                            }
                        });
                    }
                }
            } else {
                console.log('Failed to check active ModMail:', activeResponse.status, activeResponse.statusText);
            }
        } catch (error) {
            console.log('Failed to check active ModMail:', error.message);
        }


        try {
            const openModMailEmbed = new EmbedBuilder()
                .setColor('#800080')
                .setTitle('📧 Open Mod Mail')
                .setDescription(`Hello ${message.author}!\n\nIt looks like you have something you'd like to discuss with our moderation team. Would you like to open a Mod Mail to get assistance?\n\nPlease keep in mind:\n\n• For **in-game support or technical issues**, please contact the Help Center directly. They are best equipped to assist with game-related matters.\n• 🇬🇧 English https://habbohotelorigins.zendesk.com/hc/en-us\n• 🇪🇸 Español https://habbohotelorigins.zendesk.com/hc/es\n• 🇧🇷🇵🇹 Português / Brasileiro https://habbohotelorigins.zendesk.com/hc/pt-br\n• We will **never ask for personal information** through Mod Mail. Your privacy and security are our top priorities.\n• You can also use the **/dmmod command** for quick queries or concerns.\n\nIf you wish to proceed with opening a Mod Mail, let us know, and we'll set it up for you!\n\nThank you!\n\nClick the button below to open a ticket!`)
                .setThumbnail(message.client.user.displayAvatarURL({ dynamic: true }));

            const openButton = new ButtonBuilder()
                .setCustomId('open_modmail')
                .setLabel('📧 Open Mod Mail')
                .setStyle(ButtonStyle.Danger);

            const row = new ActionRowBuilder().addComponents(openButton);

            await message.author.send({ embeds: [openModMailEmbed], components: [row] });

        } catch (error) {
            console.log('Failed to send mod mail embed:', error.message);
        }
    },

    async handleOpenModMail(interaction) {
        const teamSelectEmbed = new EmbedBuilder()
            .setColor('#800080')
            .setTitle('🌍 Team Selection')
            .setDescription(`Okay, let's connect you to the correct team!\n\nPlease select which language team you'd like to speak with. This will ensure you get the best support possible in your preferred language.\n\nChoose your team below:`)
            .setThumbnail(interaction.client.user.displayAvatarURL({ dynamic: true }));

        const teamSelect = new StringSelectMenuBuilder()
            .setCustomId('team_select')
            .setPlaceholder('Select your preferred team')
            .addOptions([
                {
                    label: '🇬🇧 English Team',
                    description: 'Connect with our English-speaking moderators',
                    value: 'EN'
                },
                {
                    label: '🇪🇸 Spanish Team',
                    description: 'Conecta con nuestros moderadores de habla hispana',
                    value: 'ES'
                },
                {
                    label: '🇧🇷 Brazilian/Portuguese Team',
                    description: 'Conecte-se com nossos moderadores brasileiros/portugueses',
                    value: 'BR'
                }
            ]);

        const selectRow = new ActionRowBuilder().addComponents(teamSelect);

        await interaction.update({ embeds: [teamSelectEmbed], components: [selectRow] });
    },

    async handleTeamSelection(interaction) {
        try {
            const selectedTeam = interaction.values[0];

            const modal = new ModalBuilder()
                .setCustomId(`modmail_form_${selectedTeam}`)
                .setTitle('Modmail');

            const titleInput = new TextInputBuilder()
                .setCustomId('mail_title')
                .setLabel('Give Your Request A Title')
                .setStyle(TextInputStyle.Short)
                .setPlaceholder('e.g. "Reporting a user"')
                .setRequired(true)
                .setMaxLength(100);

            const inquiryInput = new TextInputBuilder()
                .setCustomId('mail_inquiry')
                .setLabel('What Is Your Inquiry?')
                .setStyle(TextInputStyle.Paragraph)
                .setPlaceholder('Explain your issue/request detailed enough for us to help')
                .setRequired(true)
                .setMaxLength(3000);

            const titleRow = new ActionRowBuilder().addComponents(titleInput);
            const inquiryRow = new ActionRowBuilder().addComponents(inquiryInput);

            modal.addComponents(titleRow, inquiryRow);
            await interaction.showModal(modal);

        } catch (error) {
            console.log('Error in handleTeamSelection:', error.message);

            try {
                if (!interaction.replied && !interaction.deferred) {
                    await interaction.reply({
                        content: 'There was an error processing your selection. Please try sending a new message to restart the process.',
                        ephemeral: true
                    });
                }
            } catch (replyError) {
                console.log('Failed to send error reply:', replyError.message);
            }
        }
    },

    async handleModMailSubmission(interaction) {
        const selectedTeam = interaction.customId.split('_')[2];
        const title = interaction.fields.getTextInputValue('mail_title');
        const inquiry = interaction.fields.getTextInputValue('mail_inquiry');


        let forumChannelId, roleId;
        switch (selectedTeam) {
            case 'ES':
                forumChannelId = process.env.MOD_MAIL_ES;
                roleId = process.env.LANGUAGE_MOD_ES;
                break;
            case 'BR':
                forumChannelId = process.env.MOD_MAIL_BR;
                roleId = process.env.LANGUAGE_MOD_BR;
                break;
            default: // EN
                forumChannelId = process.env.MOD_MAIL_EN;
                roleId = process.env.COMMUNITY_MOD;
                break;
        }

        try {

            const confirmationEmbed = new EmbedBuilder()
                .setColor('#00FF00')
                .setTitle('✅ Mod Mail Opened Successfully!')
                .setDescription(`Thank you for contacting our moderation team!\n\nYour mod mail has been created and sent to our ${selectedTeam === 'EN' ? 'English' : selectedTeam === 'ES' ? 'Spanish' : 'Brazilian/Portuguese'} team. A moderator will review your request and respond as soon as possible.\n\nHere's a copy of what you submitted:\n\n**Title:** ${title}\n\n**Your Inquiry:**\n\`\`\`${inquiry}\`\`\`\n\nThank you for your patience!`)
                .setThumbnail(interaction.client.user.displayAvatarURL({ dynamic: true }))
                .setFooter({ text: 'Habbo Hotel: Origins Moderation Team' });

            await interaction.reply({ embeds: [confirmationEmbed], ephemeral: true });

            try {
                await interaction.message.delete();
            } catch (deleteError) {
                console.log('Could not delete selection message:', deleteError.message);
            }

            const forumChannel = await interaction.client.channels.fetch(forumChannelId);
            if (!forumChannel) {
                console.log('Forum channel not found:', forumChannelId);
                return;
            }

            const threadTitle = `${title} - ${interaction.user.username}`;

            const modMailEmbed = new EmbedBuilder()
                .setColor('#FFD700')
                .setTitle(`📧 Mod Mail By ${interaction.user.username}`)
                .addFields(
                    { name: 'Title:', value: `"${title}"`, inline: false },
                    { name: 'Opener:', value: `${interaction.user} (${interaction.user.id})`, inline: false },
                    { name: 'Message:', value: inquiry, inline: false }
                )
                .setFooter({ text: 'Send a message to reply!' });

            const closeButton = new ButtonBuilder()
                .setCustomId(`close_modmail_${interaction.user.id}`)
                .setLabel('🔒 Close')
                .setStyle(ButtonStyle.Danger);

            const closeRow = new ActionRowBuilder().addComponents(closeButton);

            const thread = await forumChannel.threads.create({
                name: threadTitle,
                message: {
                    content: `<@&${roleId}>`,
                    embeds: [modMailEmbed],
                    components: [closeRow]
                }
            });

            try {
                await fetch('http://localhost:3000/api/modmail/CreateActiveModMail', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'x-api-key': process.env.API_KEY
                    },
                    body: JSON.stringify({
                        DiscordID: interaction.user.id,
                        ThreadID: thread.id,
                        ChannelID: forumChannelId,
                        TeamLanguage: selectedTeam,
                        Title: title
                    })
                });
            } catch (dbError) {
                console.log('Failed to store active ModMail in database:', dbError.message);
            }

            console.log(`Mod mail thread created: ${thread.name} (ID: ${thread.id})`);

        } catch (error) {
            console.log('Failed to create mod mail thread:', error.message);
            await interaction.followUp({
                content: 'There was an error creating your mod mail. Please try again later or contact Hbabo Staff.',
                ephemeral: true
            });
        }
    },

    async handleCloseModMail(interaction) {
        const userId = interaction.customId.split('_')[2];

        const confirmEmbed = new EmbedBuilder()
            .setColor('#FF0000')
            .setDescription('Are you sure you want to close this mod mail?');

        const yesButton = new ButtonBuilder()
            .setCustomId(`confirm_close_${userId}`)
            .setLabel('Yes')
            .setStyle(ButtonStyle.Danger);

        const noButton = new ButtonBuilder()
            .setCustomId('cancel_close')
            .setLabel('No')
            .setStyle(ButtonStyle.Secondary);

        const row = new ActionRowBuilder().addComponents(yesButton, noButton);

        const confirmMsg = await interaction.reply({
            embeds: [confirmEmbed],
            components: [row],
            ephemeral: true
        });

        setTimeout(async () => {
            try {
                await confirmMsg.delete();
            } catch (error) {
                console.log('Could not delete confirmation message');
            }
        }, 15000);
    },

    async handleConfirmClose(interaction) {
        const userId = interaction.customId.split('_')[2];
        const moderator = interaction.user;

        try {
            const user = await interaction.client.users.fetch(userId);

            const closedEmbed = new EmbedBuilder()
                .setColor('#FF0000')
                .setTitle('🔒 Mod Mail Closed')
                .setDescription('Your mod mail has been closed by the moderation team. If you need further assistance, feel free to send another message to open a new mod mail.')
                .setFooter({ text: 'Habbo Hotel: Origins Moderation Team' });

            try {
                await user.send({ embeds: [closedEmbed] });
            } catch (dmError) {
                console.log('Could not send close DM to user:', dmError.message);
            }

            const thread = interaction.channel;
            await thread.setLocked(true);
            await thread.send(`🔒 Closed by ${moderator.displayName}!`);

            try {
                await fetch(`http://localhost:3000/api/modmail/CloseActiveModMail/${userId}`, {
                    method: 'PUT',
                    headers: {
                        'x-api-key': process.env.API_KEY
                    }
                });
            } catch (dbError) {
                console.log('Failed to close ModMail in database:', dbError.message);
            }

            await interaction.update({
                content: 'Mod mail has been closed successfully.',
                embeds: [],
                components: []
            });

        } catch (error) {
            console.log('Error closing mod mail:', error.message);
            await interaction.update({
                content: 'Failed to close mod mail.',
                embeds: [],
                components: []
            });
        }
    },

    async handleCancelClose(interaction) {
        await interaction.update({
            content: 'Close action cancelled.',
            embeds: [],
            components: []
        });
    },

    async handleModeratorReply(message) {
        if (message.channel.type !== ChannelType.PublicThread) return;
        if (message.author.bot) return;
        if (!message.channel.parent) return;


        const modMailForums = [
            process.env.MOD_MAIL_EN,
            process.env.MOD_MAIL_ES,
            process.env.MOD_MAIL_BR
        ];

        if (!modMailForums.includes(message.channel.parent.id)) return;

        try {
            console.log(`Looking up ModMail for thread: ${message.channel.id}`);
            const response = await fetch(`http://localhost:3000/api/modmail/GetModMailByThread/${message.channel.id}`, {
                headers: {
                    'x-api-key': process.env.API_KEY
                }
            });

            if (!response.ok) {
                console.log('Failed to fetch ModMail by thread:', response.status, response.statusText);
                return;
            }

            const data = await response.json();
            console.log('ModMail by thread response:', JSON.stringify(data, null, 2));

            if (!data.success || !data.found) {
                console.log('No ModMail found for thread:', message.channel.id);
                return;
            }

            const userId = data.modMail.DiscordID;
            console.log(`Found ModMail for user: ${userId}`);

            const user = await message.client.users.fetch(userId);
            console.log(`Fetched user: ${user.username}`);

            const replyEmbed = new EmbedBuilder()
                .setColor('#800080')
                .setTitle('💬 Reply from Moderation Team')
                .setDescription(`You have received a reply to your mod mail:\n\n> ${message.content}`)
                .setFooter({ text: 'Habbo Hotel: Origins Moderation Team' });

            await user.send({ embeds: [replyEmbed] });
            console.log('Reply sent to user successfully');

            await fetch(`http://localhost:3000/api/modmail/UpdateActivity/${message.channel.id}`, {
                method: 'PUT',
                headers: {
                    'x-api-key': process.env.API_KEY
                }
            });

            await message.react('✅');
            console.log('Added checkmark reaction');

        } catch (error) {
            console.log('Failed to send reply to user:', error.message);
        }
    },

    async setupCollectors(client) {
        client.on('interactionCreate', async (interaction) => {
            if (!interaction.isButton()) return;

            if (interaction.customId === 'open_modmail') {
                await this.handleOpenModMail(interaction);
            }

            if (interaction.customId.startsWith('close_modmail_')) {
                await this.handleCloseModMail(interaction);
            }

            if (interaction.customId.startsWith('confirm_close_')) {
                await this.handleConfirmClose(interaction);
            }

            if (interaction.customId === 'cancel_close') {
                await this.handleCancelClose(interaction);
            }
        });

        client.on('interactionCreate', async (interaction) => {
            if (!interaction.isStringSelectMenu()) return;

            if (interaction.customId === 'team_select') {
                await this.handleTeamSelection(interaction);
            }
        });

        client.on('interactionCreate', async (interaction) => {
            if (!interaction.isModalSubmit()) return;

            if (interaction.customId.startsWith('modmail_form_')) {
                await this.handleModMailSubmission(interaction);
            }
        });
    }
};