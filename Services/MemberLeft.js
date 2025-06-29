const { EmbedBuilder } = require('discord.js');

module.exports = {
    async handleMemberLeave(member) {
        if (!member.guild) return;
        if (member.user.bot) return;

        try {
            const logChannel = await member.client.channels.fetch(process.env.MEMBER_LEFT_LOG_CHANNEL_ID);
            if (!logChannel) return;

            const embed = new EmbedBuilder()
                .setColor('#FF0000')
                .setTitle('📤 Member Left')
                .addFields(
                    { name: 'User:', value: `<@${member.user.id}>`, inline: true },
                    { name: 'Internal info:', value: `${member.user.username} | ${member.user.id}`, inline: true },
                    { name: 'Created at:', value: `<t:${Math.floor(member.user.createdTimestamp / 1000)}:F>`, inline: false },
                    { name: 'Joined at:', value: `<t:${Math.floor(member.joinedTimestamp / 1000)}:F>`, inline: false }
                )
                .setThumbnail('https://cdn.discordapp.com/attachments/your-channel/your-attachment/discord-logo-red.png')
                .setFooter({ text: `• ${member.guild.name} •` });

            await logChannel.send({ embeds: [embed] });

        } catch (error) {
            console.log('Failed to log member leave:', error.message);
        }
    }
};