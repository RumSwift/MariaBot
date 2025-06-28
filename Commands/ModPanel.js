const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ComponentType } = require('discord.js');
const fetch = require('node-fetch');
const emergMute = require('./ModPanel/EmergMute');
const warning = require('./ModPanel/Warning');
const dmUser = require('./ModPanel/DMUser');
const moderate = require('./ModPanel/Moderate');

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

        let sanctionHistory = '';
        try {
            const apiResponse = await fetch(`http://localhost:3000/api/sanctions/GetSanctionsByDiscordID/${targetUser.id}`, {
                headers: {
                    'x-api-key': process.env.API_KEY
                }
            });

            if (apiResponse.ok) {
                const sanctionData = await apiResponse.json();
                if (sanctionData.success && sanctionData.count > 0) {
                    const sanctions = sanctionData.data.slice(0, 10);
                    const sanctionList = sanctions.map((sanction, index) => {
                        const date = new Date(sanction.Timestamp);
                        const formattedDate = date.toLocaleDateString('en-GB', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric'
                        }) + ' ' + date.toLocaleTimeString('en-GB', {
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit',
                            hour12: false
                        });

                        let emoji = '';
                        if (sanction.SanctionType === 'Emergency Mute') {
                            emoji = '🔕';
                        } else if (sanction.SanctionType === 'Verbal Warning') {
                            emoji = '⚠️';
                        } else if (sanction.SanctionType === 'Guidelines Strike') {
                            emoji = '⚔️';
                        }

                        const sanctionType = sanction.SanctionLink ? `[${sanction.SanctionType}](${sanction.SanctionLink})` : sanction.SanctionType;
                        return `${index + 1}. ${emoji} ${sanctionType} | ${formattedDate} (UTC)`;
                    }).join('\n');
                    sanctionHistory = `**Mod history of ${targetUser}:**\n\n${sanctionList}`;
                } else {
                    sanctionHistory = `**Mod history of ${targetUser}:**\n\n✅ No current mod history`;
                }
            } else {
                sanctionHistory = `**Mod history of ${targetUser}:**\n\n✅ No current mod history`;
            }
        } catch (error) {
            console.log('Failed to fetch sanction history:', error.message);
            sanctionHistory = `**Mod history of ${targetUser}:**\n\n✅ No current mod history`;
        }

        const embed = new EmbedBuilder()
            .setTitle('Welcome to the mod panel of Habbo Hotel: Origins')
            .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }))
            .setDescription(`${sanctionHistory}\n\n**History numbers:**\nWarning counts: 0\nInappropriate Profile: 0\nPhishing: 0\nRacism: 0\n\n**Nicknames:**\n• ${member.displayName}`)
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
                    value: 'moderate_sanction'
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

            try {
                await response.delete();
            } catch (error) {
                console.log('Could not delete modpanel embed');
            }

            if (selectedValue === 'emergency_mute') {
                await emergMute(interaction, selectInteraction, targetUser, member);
            } else if (selectedValue === 'direct_message') {
                await dmUser(interaction, selectInteraction, targetUser, member);
            } else if (selectedValue === 'verbal_warning') {
                await warning(interaction, selectInteraction, targetUser, member);
            } else if (selectedValue === 'moderate_sanction') {
                await moderate(interaction, selectInteraction, targetUser, member);
            } else {
                let responseMessage = '';

                switch (selectedValue) {
                    case 'user_notes':
                        responseMessage = 'You selected: User Notes';
                        break;
                    case 'profile_violation':
                        responseMessage = 'You selected: Profile Violation';
                        break;
                    case 'racism':
                        responseMessage = 'You selected: Racism';
                        break;
                    default:
                        responseMessage = 'Unknown option selected';
                }

                await selectInteraction.reply({ content: responseMessage, ephemeral: true });

                setTimeout(async () => {
                    try {
                        await selectInteraction.deleteReply();
                    } catch (error) {
                        console.log('Could not delete placeholder message');
                    }
                }, 15000);
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