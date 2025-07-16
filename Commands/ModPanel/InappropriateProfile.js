const { EmbedBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require('discord.js');
const fetch = require('node-fetch');

module.exports = async (interaction, selectInteraction, targetUser, member) => {
    const modal = new ModalBuilder()
        .setCustomId('inappropriate_profile_modal')
        .setTitle('Inappropriate Profile Action');

    const reasonInput = new TextInputBuilder()
        .setCustomId('profile_reason')
        .setLabel('PROFILE VIOLATION DETAILS')
        .setStyle(TextInputStyle.Paragraph)
        .setPlaceholder('Describe what about their profile is inappropriate (avatar, banner, status, etc.)')
        .setRequired(true)
        .setMaxLength(800);

    const reasonRow = new ActionRowBuilder().addComponents(reasonInput);
    modal.addComponents(reasonRow);

    await selectInteraction.showModal(modal);

    const modalFilter = (modalInteraction) => modalInteraction.customId === 'inappropriate_profile_modal' && modalInteraction.user.id === interaction.user.id;

    try {
        const modalSubmission = await selectInteraction.awaitModalSubmit({ filter: modalFilter, time: 300000 });

        const profileReason = modalSubmission.fields.getTextInputValue('profile_reason');

        try {
            let profileViolations = 0;
            try {
                const apiResponse = await fetch(`http://localhost:3000/api/sanctions/GetSanctionsByDiscordID/${targetUser.id}`, {
                    headers: {
                        'x-api-key': process.env.API_KEY
                    }
                });

                if (apiResponse.ok) {
                    const sanctionData = await apiResponse.json();
                    if (sanctionData.success && sanctionData.count > 0) {
                        profileViolations = sanctionData.data.filter(sanction => sanction.SanctionType === 'InappropriateProfile').length;
                    }
                }
            } catch (apiError) {
                console.log('Failed to fetch sanction history:', apiError.message);
            }

            let punishment = '';
            let dmTitle = '';
            let dmDescription = '';
            let logTitle = '';
            let logDescription = '';
            let isKicked = false;
            let isBanned = false;

            console.log(`User has ${profileViolations} existing Inappropriate Profile violations`);

            if (profileViolations === 0) {
                // Warn
                punishment = '24 Hour Warning';
                dmTitle = 'Profile Violation Warning - Habbo Hotel: Origins';
                dmDescription = `Hello ${targetUser},\n\nThis is an **official warning** regarding your current profile on our Discord server.\n\n**Issue:** Your profile contains inappropriate content that violates our community guidelines.\n\n**Details:** ${profileReason}\n\n**Required Action:** You have **24 hours** to update your profile (avatar, banner, status, etc.) to comply with our community standards.\n\n**Next Steps:** If your profile is not updated within 24 hours, further moderation actions will be taken, including removal from the server.\n\nPlease review our community guidelines here: https://discord.com/channels/1252726515712528444/1276211712760090685\n\nIf you have any questions, please use /dmmod for assistance.\n\nThank you for your understanding.`;
                logTitle = '💳 Inappropriate Profile Warning 💳';
                logDescription = `**__Profile Violation Warning (24 Hours)__**\n**To: **${targetUser} (${member.displayName})\n**Action: ** 24 Hour Warning 💳\n\n**__Profile Issue:__**\n\`\`\`${profileReason}\`\`\`\n\n**Mod:** ${interaction.user} (${interaction.user.username})`;
            } else if (profileViolations === 1) {
                // Kick
                punishment = 'User Kicked';
                isKicked = true;
                dmTitle = 'Profile Violation - Removed from Server';
                dmDescription = `Hello ${targetUser},\n\nYou have been **removed from the Habbo Hotel: Origins Discord server** due to an inappropriate profile violation.\n\n**Previous Warning:** We previously gave you 24 hours to update your inappropriate profile content.\n\n**Current Issue:** Your profile still contains inappropriate content that violates our community guidelines.\n\n**Details:** ${profileReason}\n\n**Important:** If you choose to rejoin our server, you **must** have an appropriate profile. Rejoining with an inappropriate profile will result in an immediate and permanent ban.\n\nPlease ensure your profile (avatar, banner, status, etc.) complies with our community standards before rejoining.\n\nCommunity Guidelines: https://discord.com/channels/1252726515712528444/1276211712760090685`;
                logTitle = '💳 Inappropriate Profile Kick 💳';
                logDescription = `**__Profile Violation Kick__**\n**To: **${targetUser} (${member.displayName})\n**Action: ** User Kicked 👢\n\n**__Profile Issue:__**\n\`\`\`${profileReason}\`\`\`\n\n**Previous Violations:** 1 (24-hour warning not heeded)\n\n**Mod:** ${interaction.user} (${interaction.user.username})`;

                await member.kick('Inappropriate Profile - Second Violation');
            } else if (profileViolations >= 2) {
                // Ban
                punishment = 'User Banned';
                isBanned = true;
                dmTitle = 'Permanent Ban - Profile Violations';
                dmDescription = `Hello ${targetUser},\n\nYou have been **permanently banned** from the Habbo Hotel: Origins Discord server due to repeated inappropriate profile violations.\n\n**Violation History:**\n• First offense: 24-hour warning to change inappropriate profile\n• Second offense: Temporary removal with warning about rejoining\n• Current offense: Continued inappropriate profile content\n\n**Current Issue:** ${profileReason}\n\n**Final Decision:** Due to multiple chances given to comply with our community standards, this ban is permanent.\n\nWe provided multiple opportunities to update your profile to meet our community guidelines, but these requests were not honored.\n\nThank you for understanding our commitment to maintaining a safe and appropriate environment for all members.`;
                logTitle = '💳 Inappropriate Profile Ban 💳';
                logDescription = `**__Profile Violation Ban (Permanent)__**\n**To: **${targetUser} (${member.displayName})\n**Action: ** User Banned 🚨\n\n**__Profile Issue:__**\n\`\`\`${profileReason}\`\`\`\n\n**Previous Violations:** ${profileViolations} (Multiple warnings ignored)\n\n**Mod:** ${interaction.user} (${interaction.user.username})`;

                await member.ban({ reason: 'Inappropriate Profile - Third Violation (Permanent)' });
            }

            console.log(`Applied punishment: ${punishment}`);

            try {
                if (!isBanned) {
                    const dmEmbed = new EmbedBuilder()
                        .setTitle(dmTitle)
                        .setDescription(dmDescription)
                        .setColor('#FF69B4') // Pink color
                        .setFooter({ text: 'Habbo Hotel: Origins Moderation Team' });

                    await targetUser.send({ embeds: [dmEmbed] });
                }
            } catch (dmError) {
                console.log('Failed to send DM to user:', dmError.message);
            }

            const logChannel = await interaction.client.channels.fetch(process.env.MOD_REPORT_CHANNEL_ID);
            let logMessage = null;
            if (logChannel) {
                const logEmbed = new EmbedBuilder()
                    .setTitle(logTitle)
                    .setDescription(logDescription)
                    .setColor('#FF69B4')
                    .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }));

                logMessage = await logChannel.send({ embeds: [logEmbed] });
            }

            try {
                await fetch('http://localhost:3000/api/sanctions/AddSanction', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'x-api-key': process.env.API_KEY
                    },
                    body: JSON.stringify({
                        DiscordID: targetUser.id,
                        DiscordName: targetUser.username,
                        SanctionType: 'InappropriateProfile',
                        PrivateReason: profileReason,
                        PublicReason: profileReason,
                        Punishment: punishment,
                        MessageLink: null,
                        SanctionLink: logMessage ? logMessage.url : null,
                        ModDiscordID: interaction.user.id,
                        ModDiscordName: interaction.user.username
                    })
                });
            } catch (apiError) {
                console.log('Failed to log inappropriate profile sanction to database:', apiError.message);
            }

            let confirmationEmoji = '';
            if (isKicked) {
                confirmationEmoji = '👢';
            } else if (isBanned) {
                confirmationEmoji = '🚨';
            } else {
                confirmationEmoji = '💳';
            }

            const confirmationMessage = `${confirmationEmoji} **Inappropriate Profile Action** Applied - **${profileReason}**\n${logMessage ? logMessage.url : ''}`;

            const confirmationReply = await modalSubmission.reply({ content: confirmationMessage, ephemeral: true });

            setTimeout(async () => {
                try {
                    await confirmationReply.delete();
                } catch (error) {
                    console.log('Could not delete confirmation message');
                }
            }, 15000);

        } catch (error) {
            console.log('Error in inappropriate profile handler:', error);
            await modalSubmission.reply({ content: 'Failed to apply inappropriate profile action. Contact Hbabo Staff.', ephemeral: true });

            setTimeout(async () => {
                try {
                    await modalSubmission.deleteReply();
                } catch (error) {
                    console.log('Could not delete error message');
                }
            }, 15000);
        }
    } catch (error) {
        console.log('Modal timeout or error:', error);
    }
};