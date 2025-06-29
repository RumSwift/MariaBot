const { EmbedBuilder } = require('discord.js');

module.exports = {
    async handleMessageDelete(message) {
        if (!message.guild) return;
        if (message.author?.bot) return;
        if (!message.author) return;

        try {
            const logChannel = await message.client.channels.fetch(process.env.MESSAGE_DELETED_LOG_CHANNEL_ID);
            if (!logChannel) return;

            const userEmbed = new EmbedBuilder()
                .setColor('#FF0000')
                .setTitle('❌ Message deleted')
                .addFields(
                    { name: 'User:', value: `${message.author}`, inline: true },
                    { name: 'Internal info:', value: `${message.author.username} | ${message.author.id}`, inline: true },
                    { name: 'Time:', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true },
                    { name: 'Channel:', value: `${message.channel}`, inline: false }
                )
                .setThumbnail(message.author.displayAvatarURL({ dynamic: true }));

            const contentEmbed = new EmbedBuilder()
                .setColor('#FF0000')
                .setTitle('💬 Content of the Deleted Message')
                .setDescription(message.content || '*No text content*')
                .setThumbnail('https://cdn.discordapp.com/attachments/your-channel/your-attachment/delete-icon.png');

            if (message.attachments.size > 0) {
                const attachment = message.attachments.first();
                if (attachment && attachment.contentType && attachment.contentType.startsWith('image/')) {
                    contentEmbed.setImage(attachment.url);
                }
            }

            await logChannel.send({ embeds: [userEmbed] });
            await logChannel.send({ embeds: [contentEmbed] });

        } catch (error) {
            console.log('Failed to log deleted message:', error.message);
        }
    }
};