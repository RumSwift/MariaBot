const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('say')
        .setDescription('Make the bot send a message')
        .addStringOption(option =>
            option.setName('message')
                .setDescription('What should the bot say?')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('channel')
                .setDescription('Channel ID to send message to')
                .setRequired(false)),

    async execute(interaction) {
        const message = interaction.options.getString('message');
        const channelId = interaction.options.getString('channel');

        let targetChannel = interaction.channel;

        if (channelId) {
            try {
                targetChannel = await interaction.client.channels.fetch(channelId);
                if (!targetChannel || !targetChannel.isTextBased()) {
                    return await interaction.reply({ content: 'Invalid channel ID.', ephemeral: true });
                }
            } catch (error) {
                return await interaction.reply({ content: 'Could not find that channel.', ephemeral: true });
            }
        }

        try {
            await targetChannel.send(message);

            const logChannel = await interaction.client.channels.fetch(process.env.LOG_CHANNEL_ID);
            if (logChannel) {
                const logEmbed = new EmbedBuilder()
                    .setColor('#00ff00')
                    .setTitle('Plain text')
                    .setDescription(`${message}\n\nSent by: ${interaction.user}/n${interaction.user.username}\nIn: ${targetChannel}\nTime: <t:${Math.floor(Date.now() / 1000)}:R>`);

                await logChannel.send({ embeds: [logEmbed] });
            }

            await interaction.reply({ content: 'Message sent successfully!', ephemeral: true });
        } catch (error) {
            await interaction.reply({ content: 'Failed to send message.', ephemeral: true });
        }
    },
};