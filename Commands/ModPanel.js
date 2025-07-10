const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ComponentType, PermissionFlagsBits } = require('discord.js');
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
                .setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers), // This hides the command from users without mod permissions

    async execute(interaction) {
        // Define allowed role IDs from environment variables
        const allowedRoles = [
            process.env.HABBO_STAFF,
            process.env.SULAKE_STAFF,
            process.env.HEAD_MOD,
            process.env.COMMUNITY_MOD,
            process.env.LANGUAGE_MOD_ES,
            process.env.LANGUAGE_MOD_BR
        ].filter(Boolean); // Filter out any undefined values

        // Check if user has any of the required roles
        const userRoles = interaction.member.roles.cache;
        const hasPermission = allowedRoles.some(roleId => userRoles.has(roleId));

        if (!hasPermission) {
            const errorReply = await interaction.reply({
                content: 'You do not have permission to use this command.',
                ephemeral: true
            });

            // Delete the message after 15 seconds
            setTimeout(async () => {
                try {
                    await errorReply.delete();
                } catch (error) {
                    console.log('Could not delete permission error message');
                }
            }, 15000);

            return;
        }

        const targetUser = interaction.options.getUser('user');
        const member = await interaction.guild.members.fetch(targetUser.id).catch(() => null);

        if (!member) {
            return await interaction.reply({ content: 'User not found in server.', ephemeral: true });
        }

        let sanctionHistory = '';
        let historyNumbers = '';
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

                    // Count each sanction type
                    const allSanctions = sanctionData.data; // Use all sanctions for counting, not just top 10
                    const warningCount = allSanctions.filter(s => s.SanctionType === 'Verbal Warning').length;
                    const sanctionCount = allSanctions.filter(s => s.SanctionType === 'Guidelines Strike').length;
                    const profileCount = allSanctions.filter(s => s.SanctionType === 'InappropriateProfile').length;
                    const racismCount = allSanctions.filter(s => s.SanctionType === 'Racism').length;

                    const sanctionList = sanctions.map((sanction, index) => {
                        // The timestamp is already in UTC format with Z suffix
                        const utcDate = new Date(sanction.Timestamp);
                        const timestamp = Math.floor(utcDate.getTime() / 1000);

                        let emoji = '';
                        let displayText = sanction.SanctionType;

                        if (sanction.SanctionType === 'Emergency Mute') {
                            emoji = '🔕';
                        } else if (sanction.SanctionType === 'Verbal Warning') {
                            emoji = '⚠️';
                        } else if (sanction.SanctionType === 'Guidelines Strike') {
                            emoji = '⚔️';
                            if (sanction.Punishment) {
                                if (sanction.Punishment.includes('User Banned')) {
                                    displayText = 'Guidelines Strike (Ban)';
                                    emoji = '🚨';
                                } else if (sanction.Punishment.includes('Minutes')) {
                                    const minutes = sanction.Punishment.match(/(\d+)\s*Minutes?/i);
                                    displayText = `Guidelines Strike (${minutes ? minutes[1] + 'Min' : '10Min'})`;
                                } else if (sanction.Punishment.includes('Hours')) {
                                    const hours = sanction.Punishment.match(/(\d+)\s*Hours?/i);
                                    displayText = `Guidelines Strike (${hours ? hours[1] + 'Hr' : '3Hr'})`;
                                } else if (sanction.Punishment.includes('Day')) {
                                    const days = sanction.Punishment.match(/(\d+)\s*Days?/i);
                                    displayText = `Guidelines Strike (${days ? days[1] + 'Day' : '1Day'})`;
                                }
                            }
                        }

                        const sanctionDisplay = sanction.SanctionLink ? `[**${displayText}**](${sanction.SanctionLink})` : `**${displayText}**`;
                        return `${index + 1}. ${emoji} ${sanctionDisplay} | <t:${timestamp}:R>`;
                    }).join('\n');
                    sanctionHistory = `**__Mod history of ${targetUser}:__**\n\n${sanctionList}`;

                    historyNumbers = `⚠️ Warning Count: ${warningCount}\n⚔️ Sanction Count: ${sanctionCount}\n💳 Inappropriate Profile: ${profileCount}\n🤬 Racism: ${racismCount}`;
                } else {
                    sanctionHistory = `**Mod history of ${targetUser}:**\n\n✅ No current mod history`;
                    historyNumbers = `⚠️ **Warning Count**: 0\n⚔️ **Sanction Count**: 0\n💳 **Inappropriate Profile**: 0\n🤬 **Racism**: 0`;
                }
            } else {
                sanctionHistory = `**Mod history of ${targetUser}:**\n\n✅ No current mod history`;
                historyNumbers = `⚠️ **Warning Count**: 0\n⚔️ **Sanction Count**: 0\n💳 **Inappropriate Profile**: 0\n🤬 **Racism**: 0`;
            }
        } catch (error) {
            console.log('Failed to fetch sanction history:', error.message);
            sanctionHistory = `**Mod history of ${targetUser}:**\n\n✅ No current mod history`;
            historyNumbers = `⚠️ **Warning Count**: 0\n⚔️ **Sanction Count**: 0\n💳 **Inappropriate Profile**: 0\n🤬 **Racism**: 0`;
        }

        const embed = new EmbedBuilder()
            .setTitle('Welcome to the mod panel of Habbo Hotel: Origins')
            .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }))
            .setDescription(`${sanctionHistory}\n\n**History numbers:**\n${historyNumbers}`)
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
                    description: '10 Min > 3 Hrs > 1 Day > 5 Days > 7 Days > Ban',
                    value: 'moderate_sanction'
                },
                {
                    label: '📮 Direct Message',
                    description: 'Send a DM from Maria, to a user',
                    value: 'direct_message'
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