const { EmbedBuilder } = require('discord.js');

module.exports = {
    async handleMemberBan(ban) {
        if (!ban.guild) return;
        if (ban.user.bot) return;

        try {
            const logChannel = await ban.guild.client.channels.fetch(process.env.MEMBER_BANNED_LOG_CHANNEL_ID);
            if (!logChannel) return;

            let joinedTimestamp = null;
            try {
                const member = await ban.guild.members.fetch(ban.user.id).catch(() => null);
                if (member && member.joinedTimestamp) {
                    joinedTimestamp = member.joinedTimestamp;
                }
            } catch (error) {
                // They're gone, cannot grab
            }

            const embed = new EmbedBuilder()
                .setColor('#8B0000')
                .setTitle('🚫 Member Banned')
                .addFields(
                    { name: 'User:', value: `${ban.user.username}`, inline: true },
                    { name: 'Mention:', value: `<@${ban.user.id}>`, inline: true },
                    { name: 'Created at:', value: `<t:${Math.floor(ban.user.createdTimestamp / 1000)}:F>`, inline: false },
                    { name: 'Joined at:', value: joinedTimestamp ? `<t:${Math.floor(joinedTimestamp / 1000)}:F>` : 'undefined', inline: false }
                )
                .setThumbnail(ban.user.displayAvatarURL({ dynamic: true }))
                .setFooter({ text: `• ${ban.guild.name} •` });

            await logChannel.send({ embeds: [embed] });

        } catch (error) {
            console.log('Failed to log member ban:', error.message);
        }
    }
};