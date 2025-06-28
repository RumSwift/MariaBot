const { EmbedBuilder } = require('discord.js');
const fetch = require('node-fetch');

module.exports = async (interaction, selectInteraction, targetUser, member) => {
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
                    SanctionType: 'Emergency Mute',
                    PrivateReason: null,
                    PublicReason: null,
                    Punishment: null,
                    MessageLink: null,
                    SanctionLink: logMessage ? logMessage.url : null,
                    ModDiscordID: interaction.user.id,
                    ModDiscordName: interaction.user.username
                })
            });
        } catch (apiError) {
            console.log('Failed to log sanction to database:', apiError.message);
        }

        const logLink = logMessage ? logMessage.url : '';
        await selectInteraction.reply({ content: `:police_car: **Emergency Mute** Applied - **The situation is critical. The user has been muted for 24 hours without notification, while we prepare a mod report. This could also be so we can leave the user for staff evaluation**\n${logLink}`, ephemeral: true });
    } catch (error) {
        await selectInteraction.reply({ content: 'Failed to apply emergency mute. Contact Hbabo Staff.', ephemeral: true });
    }
};