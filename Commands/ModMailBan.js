const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const fetch = require('node-fetch');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('modmailban')
        .setDescription('Ban a user from using ModMail')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('User to ban from ModMail')
                .setRequired(true)),

    async execute(interaction) {
        const targetUser = interaction.options.getUser('user');

        // Prevent banning bots
        if (targetUser.bot) {
            return await interaction.reply({
                content: 'Cannot ban bots from ModMail.',
                ephemeral: true
            });
        }

        // Prevent self-banning
        if (targetUser.id === interaction.user.id) {
            return await interaction.reply({
                content: 'You cannot ban yourself from ModMail.',
                ephemeral: true
            });
        }

        try {
            // Call API to ban user
            const response = await fetch('http://localhost:3000/api/modmail/ModMailBan', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': process.env.API_KEY
                },
                body: JSON.stringify({
                    DiscordID: targetUser.id,
                    BannedByID: interaction.user.id
                })
            });

            const result = await response.json();

            if (!response.ok) {
                if (response.status === 409) {
                    return await interaction.reply({
                        content: `${targetUser.username} is already banned from ModMail.`,
                        ephemeral: true
                    });
                }
                throw new Error(result.error || 'Unknown error occurred');
            }

            // Log the ban action
            const logChannel = await interaction.client.channels.fetch(process.env.MOD_ACTIONS_LOG_CHANNEL_ID);
            if (logChannel) {
                const logEmbed = new EmbedBuilder()
                    .setTitle('🚫 ModMail Ban Applied')
                    .setDescription(`**__ModMail Access Restricted__**\n**User:** ${targetUser} (${targetUser.username})\n**User ID:** ${targetUser.id}\n\n**Moderator:** ${interaction.user} (${interaction.user.username})`)
                    .setColor('#FF0000')
                    .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }))
                    .setTimestamp();

                await logChannel.send({ embeds: [logEmbed] });
            }

            // Send confirmation
            const confirmEmbed = new EmbedBuilder()
                .setColor('#FF0000')
                .setTitle('✅ ModMail Ban Applied')
                .setDescription(`${targetUser.username} has been banned from using ModMail.\n\nThey will no longer be able to contact the moderation team through DMs.`)
                .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }))
                .setTimestamp();

            await interaction.reply({ embeds: [confirmEmbed], ephemeral: true });

        } catch (error) {
            console.error('ModMail ban error:', error);
            await interaction.reply({
                content: 'Failed to ban user from ModMail. Contact Hbabo Staff.',
                ephemeral: true
            });
        }
    },
};