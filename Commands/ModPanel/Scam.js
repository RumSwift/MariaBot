const { EmbedBuilder } = require('discord.js');
const fetch = require('node-fetch');

module.exports = async (interaction, selectInteraction, targetUser, member) => {
    try {
        // Ban the user immediately
        await member.ban({ reason: 'Scam/Phishing - Instant Ban' });

        // Log to mod report channel
        const logChannel = await interaction.client.channels.fetch(process.env.MOD_REPORT_CHANNEL_ID);
        let logMessage = null;
        if (logChannel) {
            const logEmbed = new EmbedBuilder()
                .setTitle('🚨 Scam/Phishing Ban Applied 🚨')
                .setDescription(`**__User Banned for Scam/Phishing__**\n**To: **${targetUser} (${member.displayName})\n**Sanction: ** User Banned 🚨\n\n**__Reason:__**\n\`\`\`Scam/Phishing\`\`\`\n**__Reason Provided To User:__**\n\`\`\`Scam/Phishing\`\`\`\n\n**Mod:** ${interaction.user} (${interaction.user.username})`)
                .setColor('#FF0000') // Red color
                .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }));

            logMessage = await logChannel.send({ embeds: [logEmbed] });
        }

        // Add to database via API
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
                    SanctionType: 'Scam',
                    PrivateReason: 'Scam/Phishing',
                    PublicReason: 'Scam/Phishing',
                    Punishment: 'User Banned',
                    MessageLink: null,
                    SanctionLink: logMessage ? logMessage.url : null,
                    ModDiscordID: interaction.user.id,
                    ModDiscordName: interaction.user.username
                })
            });
        } catch (apiError) {
            console.log('Failed to log scam/phishing sanction to database:', apiError.message);
        }

        const confirmationMessage = `:fishing_pole_and_fish: **Scam/Phishing Ban** Applied - **User banned for Scam/Phishing**\n${logMessage ? logMessage.url : ''}`;

        const confirmationReply = await selectInteraction.reply({ content: confirmationMessage, ephemeral: true });

        setTimeout(async () => {
            try {
                await confirmationReply.delete();
            } catch (error) {
                console.log('Could not delete confirmation message');
            }
        }, 15000);

    } catch (error) {
        console.log('Error in scam/phishing handler:', error);
        await selectInteraction.reply({ content: 'Failed to ban user for scam/phishing. Contact Hbabo Staff.', ephemeral: true });

        setTimeout(async () => {
            try {
                await selectInteraction.deleteReply();
            } catch (error) {
                console.log('Could not delete error message');
            }
        }, 15000);
    }
};