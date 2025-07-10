const { SlashCommandBuilder, PermissionFlagsBits, TextDisplayBuilder, ThumbnailBuilder, SectionBuilder, SeparatorBuilder, SeparatorSpacingSize, ButtonBuilder, ButtonStyle, ActionRowBuilder, StringSelectMenuBuilder, ContainerBuilder, StringSelectMenuOptionBuilder, MessageFlags } = require('discord.js');
const fetch = require('node-fetch');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('headmodpanel')
        .setDescription('Open head moderator panel for a user')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('User to manage')
                .setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        // Define allowed role IDs for head mod panel (restricted roles)
        const allowedRoles = [
            process.env.SULAKE_STAFF,
            process.env.HABBO_STAFF,
            process.env.HEAD_MOD
        ].filter(Boolean);

        // Check if user has any of the required roles
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

        const targetUser = interaction.options.getUser('user');
        const member = await interaction.guild.members.fetch(targetUser.id).catch(() => null);

        if (!member) {
            return await interaction.reply({ content: 'User not found in server.', ephemeral: true });
        }

        // Fetch sanction history like in ModPanel.js
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
                    const allSanctions = sanctionData.data;
                    const warningCount = allSanctions.filter(s => s.SanctionType === 'Verbal Warning').length;
                    const sanctionCount = allSanctions.filter(s => s.SanctionType === 'Guidelines Strike').length;
                    const profileCount = allSanctions.filter(s => s.SanctionType === 'InappropriateProfile').length;
                    const racismCount = allSanctions.filter(s => s.SanctionType === 'Racism').length;

                    const sanctionList = sanctions.map((sanction, index) => {
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

                    sanctionHistory = `**Mod history of ${targetUser}:**\n\n${sanctionList}`;
                    historyNumbers = `⚠️ **Warning Count**: ${warningCount}\n⚔️ **Sanction Count**: ${sanctionCount}\n💳 **Inappropriate Profile**: ${profileCount}\n🤬 **Racism**: ${racismCount}`;
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

        // Create the Discord v2 component layout - EXACTLY as provided
        const components = [
            new ContainerBuilder()
                .setAccentColor(12745742)
                .addSectionComponents(
                    new SectionBuilder()
                        .setThumbnailAccessory(
                            new ThumbnailBuilder()
                                .setURL(targetUser.displayAvatarURL({ dynamic: true, size: 128 }))
                        )
                        .addTextDisplayComponents(
                            new TextDisplayBuilder().setContent("# Habbo Hotel Origins: Modpanel"),
                            new TextDisplayBuilder().setContent("You're using the official Modpanel of the Habbo Hotel: Origins Discord server. This information  is private and should never be shared."),
                        ),
                )
                .addSeparatorComponents(
                    new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Large).setDivider(false),
                )
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent("## Quick Actions"),
                )
                .addActionRowComponents(
                    new ActionRowBuilder()
                        .addComponents(
                            new ButtonBuilder()
                                .setStyle(ButtonStyle.Danger)
                                .setLabel("Emergency Mute (24 Hour)")
                                .setEmoji({
                                    name: "🔕",
                                })
                                .setCustomId("0fddf139105b4da49baa8c91621b448b"),
                            new ButtonBuilder()
                                .setStyle(ButtonStyle.Danger)
                                .setLabel("Scam/Phishing (Ban)")
                                .setEmoji({
                                    name: "🐟",
                                })
                                .setCustomId("9c6b9843f74f4533b1deaae419c66d41"),
                            new ButtonBuilder()
                                .setStyle(ButtonStyle.Primary)
                                .setLabel("Send DM")
                                .setEmoji({
                                    name: "💬",
                                })
                                .setCustomId("eb8f167640894ce0955e37cb0b292215"),
                        ),
                )
                .addSeparatorComponents(
                    new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Large).setDivider(false),
                )
                .addSectionComponents(
                    new SectionBuilder()
                        .setThumbnailAccessory(
                            new ThumbnailBuilder()
                                .setURL("https://icons.iconarchive.com/icons/google/noto-emoji-objects/1024/62953-hammer-icon.png")
                        )
                        .addTextDisplayComponents(
                            new TextDisplayBuilder().setContent("## Moderate User"),
                            new TextDisplayBuilder().setContent("Here you can send Verbal Warnings, apply sanctions and more."),
                        ),
                )
                .addActionRowComponents(
                    new ActionRowBuilder()
                        .addComponents(
                            new StringSelectMenuBuilder()
                                .setCustomId("3011f7df1f3443b28c988f109c566e9c")
                                .addOptions(
                                    new StringSelectMenuOptionBuilder()
                                        .setLabel("Verbal Warning")
                                        .setValue("0e6281978b414445e32b10e0e9094908")
                                        .setDescription("Sends the user an official Verbal Warning")
                                        .setEmoji({
                                            name: "⚠️",
                                        }),
                                    new StringSelectMenuOptionBuilder()
                                        .setLabel("Community Rules Violation")
                                        .setValue("7e4cdfafb3b94c21d4a8be39a30e004d")
                                        .setDescription("Apply Sanction: 10 Mins > 3 Hour > 1 Day > 5 Days > Ban")
                                        .setEmoji({
                                            name: "⚒️",
                                        }),
                                    new StringSelectMenuOptionBuilder()
                                        .setLabel("Inappropriate Profile")
                                        .setValue("e3149f3d923740e6b9cb1bbd9ce2ab44")
                                        .setDescription("Verbal Warning > Kick after 24 Hours > Ban on Return")
                                        .setEmoji({
                                            name: "🃏",
                                        }),
                                    new StringSelectMenuOptionBuilder()
                                        .setLabel("Racism")
                                        .setValue("2742bdacc70248aeea548827bc8747e7")
                                        .setDescription("7 Day Mute > Ban")
                                        .setEmoji({
                                            name: "😡",
                                        }),
                                    new StringSelectMenuOptionBuilder()
                                        .setLabel("Impersonation")
                                        .setValue("cfec258db46c4ed5db6884e20fe79616")
                                        .setDescription("Impersonating Staff > Instant Ban")
                                        .setEmoji({
                                            name: "👺",
                                        }),
                                    new StringSelectMenuOptionBuilder()
                                        .setLabel("Custom Sanction")
                                        .setValue("376e4b5e0e45475b84e9e921e0ada6fb")
                                        .setDescription("Apply a specific mute, kick a user or ban with a custom reason")
                                        .setEmoji({
                                            name: "🚨",
                                        }),
                                ),
                        ),
                )
                .addSeparatorComponents(
                    new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(false),
                )
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(`## History of ${targetUser.toString()}`),
                )
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(sanctionHistory),
                )
                .addSeparatorComponents(
                    new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(false),
                )
                .addActionRowComponents(
                    new ActionRowBuilder()
                        .addComponents(
                            new ButtonBuilder()
                                .setStyle(ButtonStyle.Primary)
                                .setLabel("Add User Note")
                                .setEmoji({
                                    name: "📒",
                                })
                                .setCustomId("d4a7c6e12fc84e0ec7836f5e93870ac7"),
                            new ButtonBuilder()
                                .setStyle(ButtonStyle.Primary)
                                .setLabel("View Current Notes")
                                .setEmoji({
                                    name: "📂",
                                })
                                .setCustomId("6b96a2feeb544344c063c5e5b8bf49d2"),
                            new ButtonBuilder()
                                .setStyle(ButtonStyle.Danger)
                                .setLabel("Warning Strike Adjustment")
                                .setEmoji({
                                    name: "⚖️",
                                })
                                .setCustomId("c2339097ee504e5eb8a3d7db44e911f7"),
                        ),
                ),
        ];

        const response = await interaction.reply({
            components: components,
            flags: MessageFlags.IsComponentsV2,
            ephemeral: true
        });

        const collector = response.createMessageComponentCollector({
            time: 300000 // 5 minutes
        });

        collector.on('collect', async (componentInteraction) => {
            if (componentInteraction.user.id !== interaction.user.id) {
                return await componentInteraction.reply({ content: 'This panel is not for you.', ephemeral: true });
            }

            const customId = componentInteraction.customId;

            // Handle the exact custom IDs from your provided code
            if (customId === "0fddf139105b4da49baa8c91621b448b") {
                await this.handleModerationAction(componentInteraction, 'emergency_mute', targetUser, member);
            } else if (customId === "9c6b9843f74f4533b1deaae419c66d41") {
                await this.handleModerationAction(componentInteraction, 'scam_phishing_ban', targetUser, member);
            } else if (customId === "eb8f167640894ce0955e37cb0b292215") {
                await this.handleModerationAction(componentInteraction, 'send_dm', targetUser, member);
            } else if (customId === "d4a7c6e12fc84e0ec7836f5e93870ac7") {
                await this.handleAdvancedAction(componentInteraction, 'add_note', targetUser, member);
            } else if (customId === "6b96a2feeb544344c063c5e5b8bf49d2") {
                await this.handleAdvancedAction(componentInteraction, 'view_notes', targetUser, member);
            } else if (customId === "c2339097ee504e5eb8a3d7db44e911f7") {
                await this.handleAdvancedAction(componentInteraction, 'warning_strike_adjustment', targetUser, member);
            }

            // Handle select menu interactions
            if (customId === "3011f7df1f3443b28c988f109c566e9c") {
                const selectedValue = componentInteraction.values[0];
                if (selectedValue === "0e6281978b414445e32b10e0e9094908") {
                    await this.handleModerationAction(componentInteraction, 'verbal_warning', targetUser, member);
                } else if (selectedValue === "7e4cdfafb3b94c21d4a8be39a30e004d") {
                    await this.handleModerationAction(componentInteraction, 'community_rules_violation', targetUser, member);
                } else if (selectedValue === "e3149f3d923740e6b9cb1bbd9ce2ab44") {
                    await this.handleModerationAction(componentInteraction, 'inappropriate_profile', targetUser, member);
                } else if (selectedValue === "2742bdacc70248aeea548827bc8747e7") {
                    await this.handleModerationAction(componentInteraction, 'racism', targetUser, member);
                } else if (selectedValue === "cfec258db46c4ed5db6884e20fe79616") {
                    await this.handleModerationAction(componentInteraction, 'impersonation', targetUser, member);
                } else if (selectedValue === "376e4b5e0e45475b84e9e921e0ada6fb") {
                    await this.handleModerationAction(componentInteraction, 'custom_sanction', targetUser, member);
                }
            }
        });

        collector.on('end', async () => {
            try {
                await response.edit({ components: [] });
            } catch (error) {
                console.log('Could not disable head mod panel components');
            }
        });
    },

    async handleModerationAction(interaction, action, targetUser, member) {
        // Placeholder responses for now - implement actual moderation logic later
        let responseMessage = '';

        switch (action) {
            case 'ban_user':
                responseMessage = `🔨 Ban action selected for ${targetUser.username}`;
                break;
            case 'kick_user':
                responseMessage = `👢 Kick action selected for ${targetUser.username}`;
                break;
            case 'timeout_user':
                responseMessage = `🔇 Timeout action selected for ${targetUser.username}`;
                break;
            case 'remove_timeout':
                responseMessage = `🔊 Remove timeout selected for ${targetUser.username}`;
                break;
            default:
                responseMessage = 'Unknown moderation action';
        }

        await interaction.reply({ content: responseMessage, ephemeral: true });

        setTimeout(async () => {
            try {
                await interaction.deleteReply();
            } catch (error) {
                console.log('Could not delete head mod action message');
            }
        }, 10000);
    },

    async handleRoleAction(interaction, action, targetUser, member) {
        let responseMessage = '';

        switch (action) {
            case 'promote_mod':
                responseMessage = `👑 Moderator promotion selected for ${targetUser.username}`;
                break;
            case 'manage_lang_roles':
                responseMessage = `👥 Language role management selected for ${targetUser.username}`;
                break;
            case 'custom_roles':
                responseMessage = `🎯 Custom role assignment selected for ${targetUser.username}`;
                break;
            case 'view_roles':
                const roles = member.roles.cache
                    .filter(role => role.id !== member.guild.id)
                    .map(role => role.toString())
                    .join(', ') || 'No roles';
                responseMessage = `📊 **Roles for ${targetUser.username}:**\n${roles}`;
                break;
            default:
                responseMessage = 'Unknown role action';
        }

        await interaction.reply({ content: responseMessage, ephemeral: true });

        setTimeout(async () => {
            try {
                await interaction.deleteReply();
            } catch (error) {
                console.log('Could not delete head mod action message');
            }
        }, 15000);
    },

    async handleAdvancedAction(interaction, action, targetUser, member) {
        let responseMessage = '';

        switch (action) {
            case 'modmail_ban':
                responseMessage = `🚫 ModMail ban selected for ${targetUser.username}`;
                break;
            case 'modmail_unban':
                responseMessage = `✅ ModMail unban selected for ${targetUser.username}`;
                break;
            case 'full_history':
                responseMessage = `🗂️ Full history view selected for ${targetUser.username}`;
                break;
            case 'add_note':
                responseMessage = `📝 Add staff note selected for ${targetUser.username}`;
                break;
            default:
                responseMessage = 'Unknown advanced action';
        }

        await interaction.reply({ content: responseMessage, ephemeral: true });

        setTimeout(async () => {
            try {
                await interaction.deleteReply();
            } catch (error) {
                console.log('Could not delete head mod action message');
            }
        }, 10000);
    }
};