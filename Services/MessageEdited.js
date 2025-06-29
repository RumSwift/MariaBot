const { EmbedBuilder } = require('discord.js');

module.exports = {
    async handleMessageEdit(oldMessage, newMessage) {
        if (!newMessage.guild) return;
        if (newMessage.author?.bot) return;
        if (!newMessage.author) return;
        if (oldMessage.content === newMessage.content) return;

        try {
            const logChannel = await newMessage.client.channels.fetch(process.env.MESSAGE_EDITED_LOG_CHANNEL_ID);
            if (!logChannel) return;

            const userEmbed = new EmbedBuilder()
                .setColor('#FFA500')
                .setTitle('📝 Message updated')
                .addFields(
                    { name: 'User:', value: `${newMessage.author}`, inline: true },
                    { name: 'Internal info:', value: `${newMessage.author.username} | ${newMessage.author.id}`, inline: true },
                    { name: 'Time:', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true },
                    { name: 'Channel:', value: `${newMessage.channel} [${newMessage.channel.name}]`, inline: false }
                )
                .setThumbnail(newMessage.author.displayAvatarURL({ dynamic: true }))
                .setFooter({ text: `• ${newMessage.guild.name} •` });

            const oldMessageEmbed = new EmbedBuilder()
                .setColor('#FF0000')
                .setTitle('❌ Old Message')
                .setDescription(oldMessage.content || '*No text content*')
                .setThumbnail('https://via.placeholder.com/64x64/ff0000/ffffff?text=OLD');

            const newMessageEmbed = new EmbedBuilder()
                .setColor('#00FF00')
                .setTitle('✅ New message')
                .setDescription(newMessage.content || '*No text content*')
                .setThumbnail('https://via.placeholder.com/64x64/00ff00/ffffff?text=NEW');

            const jumpEmbed = new EmbedBuilder()
                .setColor('#0099FF')
                .setDescription(`[Jump to the message](${newMessage.url}) 🔗`);

            await logChannel.send({ embeds: [userEmbed] });
            await logChannel.send({ embeds: [oldMessageEmbed] });
            await logChannel.send({ embeds: [newMessageEmbed] });
            await logChannel.send({ embeds: [jumpEmbed] });

        } catch (error) {
            console.log('Failed to log edited message:', error.message);
        }
    }
};