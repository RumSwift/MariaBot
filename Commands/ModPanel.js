const { SlashCommandBuilder, InteractionContextType, PermissionFlagsBits, TextDisplayBuilder, ThumbnailBuilder, SectionBuilder, SeparatorBuilder, SeparatorSpacingSize, ButtonBuilder, ButtonStyle, ActionRowBuilder, StringSelectMenuBuilder, ContainerBuilder, StringSelectMenuOptionBuilder, MessageFlags } = require('discord.js');
const fetch = require('node-fetch');
const emergMute = require('./ModPanel/EmergMute');
const warning = require('./ModPanel/Warning');
const dmUser = require('./ModPanel/DMUser');
const moderate = require('./ModPanel/Moderate');
const scam = require('./ModPanel/Scam');
const inappropriateProfile = require('./ModPanel/InappropriateProfile');
const racism = require('./ModPanel/Racism');
const addNote = require('./ModPanel/AddNote');
const viewNotes = require('./ModPanel/ViewNotes');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('modpanel')
        .setContexts(InteractionContextType.Guild)
        .setDescription('Open moderation panel for a user')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('User to moderate')
                .setRequired(true)),

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
                    console.log('Could not delete permission error');
                }
            }, 15000);

            return;
        }

        const targetUser = interaction.options.getUser('user');
        const member = await interaction.guild.members.fetch(targetUser.id).catch(() => null);

        if (!member) {
            return await interaction.reply({ content: 'User not found in server.', ephemeral: true });
        }

        const modRoles = interaction.member.roles.cache;
        const targetUserRoles = member.roles.cache;

        const isCommunityMod = modRoles.has(process.env.COMMUNITY_MOD);

        if (!isCommunityMod) {
            const isSpanishMod = modRoles.has(process.env.LANGUAGE_MOD_ES);
            const isBrazilianMod = modRoles.has(process.env.LANGUAGE_MOD_BR);

            let canModerate = false;
            let requiredRole = '';
            let languageName = '';

            if (isSpanishMod) {
                canModerate = targetUserRoles.has(process.env.ES);
                requiredRole = `<@&${process.env.ES}>`;
                languageName = 'Spanish';
            } else if (isBrazilianMod) {
                canModerate = targetUserRoles.has(process.env.BR);
                requiredRole = `<@&${process.env.BR}>`;
                languageName = 'Brazilian Portuguese';
            }

            if (!canModerate && (isSpanishMod || isBrazilianMod)) {
                const { EmbedBuilder } = require('discord.js');
                const restrictionEmbed = new EmbedBuilder()
                    .setColor('#FF0000') // Red color
                    .setTitle('❌ Moderation Restriction')
                    .setDescription(`Sorry, you can only moderate users with the ${requiredRole} role. If this person needs moderating please tag <@&${process.env.COMMUNITY_MOD}> for assistance.\n\n**Your Language:** ${languageName}\n\n*This message will expire in 15 seconds.*`)
                    .setTimestamp();

                const restrictionReply = await interaction.reply({
                    embeds: [restrictionEmbed],
                    ephemeral: true
                });

                setTimeout(async () => {
                    try {
                        await restrictionReply.delete();
                    } catch (error) {
                        console.log('Could not delete restriction message');
                    }
                }, 15000);

                return;
            }
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
                            new TextDisplayBuilder().setContent("You're using the official Modpanel of the Habbo Hotel: Origins Discord server. This information is private and should never be shared."),
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
                                .setCustomId("modpanel_emergency_mute"),
                            new ButtonBuilder()
                                .setStyle(ButtonStyle.Danger)
                                .setLabel("Scam/Phishing (Ban)")
                                .setEmoji({
                                    name: "🐟",
                                })
                                .setCustomId("modpanel_scam_phishing"),
                            new ButtonBuilder()
                                .setStyle(ButtonStyle.Primary)
                                .setLabel("Send DM")
                                .setEmoji({
                                    name: "💬",
                                })
                                .setCustomId("modpanel_send_dm"),
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
                                .setCustomId("modpanel_moderate_select")
                                .addOptions(
                                    new StringSelectMenuOptionBuilder()
                                        .setLabel("Verbal Warning")
                                        .setValue("verbal_warning")
                                        .setDescription("Sends the user an official Verbal Warning")
                                        .setEmoji({
                                            name: "⚠️",
                                        }),
                                    new StringSelectMenuOptionBuilder()
                                        .setLabel("Community Rules Violation")
                                        .setValue("moderate_sanction")
                                        .setDescription("Apply Sanction: 10 Mins > 3 Hour > 1 Day > 5 Days > Ban")
                                        .setEmoji({
                                            name: "⚒️",
                                        }),
                                    new StringSelectMenuOptionBuilder()
                                        .setLabel("Inappropriate Profile")
                                        .setValue("profile_violation")
                                        .setDescription("Verbal Warning > Kick after 24 Hours > Ban on Return")
                                        .setEmoji({
                                            name: "🃏",
                                        }),
                                    new StringSelectMenuOptionBuilder()
                                        .setLabel("Racism")
                                        .setValue("racism")
                                        .setDescription("7 Day Mute > Ban")
                                        .setEmoji({
                                            name: "😡",
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
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(`## History Numbers\n${historyNumbers}`),
                )
                .addSeparatorComponents(
                    new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(false),
                )
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent("## User Notes"),
                )
                .addActionRowComponents(
                    new ActionRowBuilder()
                        .addComponents(
                            new ButtonBuilder()
                                .setStyle(ButtonStyle.Secondary)
                                .setLabel("Add Note")
                                .setEmoji({
                                    name: "📝",
                                })
                                .setCustomId("modpanel_add_note"),
                            new ButtonBuilder()
                                .setStyle(ButtonStyle.Secondary)
                                .setLabel("View Notes")
                                .setEmoji({
                                    name: "📋",
                                })
                                .setCustomId("modpanel_view_notes"),
                        ),
                ),
        ];

        const response = await interaction.reply({
            components: components,
            flags: MessageFlags.IsComponentsV2,
            ephemeral: true
        });

        const collector = response.createMessageComponentCollector({
            time: 300000 // 5 mins
        });

        collector.on('collect', async (componentInteraction) => {
            if (componentInteraction.user.id !== interaction.user.id) {
                return await componentInteraction.reply({ content: 'This panel is not for you.', ephemeral: true });
            }

            const customId = componentInteraction.customId;

            if (customId === "modpanel_emergency_mute") {
                await emergMute(interaction, componentInteraction, targetUser, member);
            } else if (customId === "modpanel_scam_phishing") {
                await scam(interaction, componentInteraction, targetUser, member);
            } else if (customId === "modpanel_send_dm") {
                await dmUser(interaction, componentInteraction, targetUser, member);
            } else if (customId === "modpanel_add_note") {
                await addNote(interaction, componentInteraction, targetUser, member);
            } else if (customId === "modpanel_view_notes") {
                await viewNotes(interaction, componentInteraction, targetUser, member);
            }

            if (customId === "modpanel_moderate_select") {
                const selectedValue = componentInteraction.values[0];

                if (selectedValue === "verbal_warning") {
                    await warning(interaction, componentInteraction, targetUser, member);
                } else if (selectedValue === "moderate_sanction") {
                    await moderate(interaction, componentInteraction, targetUser, member);
                } else if (selectedValue === "profile_violation") {
                    await inappropriateProfile(interaction, componentInteraction, targetUser, member);
                } else if (selectedValue === "racism") {
                    await racism(interaction, componentInteraction, targetUser, member);
                }
            }
        });

        collector.on('end', async () => {
            try {
                await response.edit({ components: [] });
            } catch (error) {
                console.log('Could not disable modpanel components');
            }
        });
    },
};