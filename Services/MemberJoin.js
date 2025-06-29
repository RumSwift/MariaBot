const { EmbedBuilder } = require('discord.js');

module.exports = {
    async handleMemberJoin(member) {
        if (!member.guild) return;
        if (member.user.bot) return;

        try {
            const logChannel = await member.client.channels.fetch(process.env.MEMBER_JOIN_LOG_CHANNEL_ID);
            if (!logChannel) return;

            const embed = new EmbedBuilder()
                .setColor('#00FF00')
                .setTitle('📥 Member Join')
                .addFields(
                    { name: 'User:', value: `${member.user}`, inline: true },
                    { name: 'Internal info:', value: `${member.user.username} | ${member.user.id}`, inline: true },
                    { name: 'Created at:', value: `<t:${Math.floor(member.user.createdTimestamp / 1000)}:F>`, inline: false }
                )
                .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
                .setFooter({ text: `• ${member.guild.name} •` });

            await logChannel.send({ embeds: [embed] });

        } catch (error) {
            console.log('Failed to log member join:', error.message);
        }
    }
};