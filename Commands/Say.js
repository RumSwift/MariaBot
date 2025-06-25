const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('say')
        .setDescription('Speak as Maria')
        .addStringOption(option =>
            option.setName('message')
                .setDescription('What should Maria say?')
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
                    return await interaction.reply({ content: 'Invalid channel ID or channel is not text-based.', ephemeral: true });
                }
            } catch (error) {
                return await interaction.reply({ content: 'Could not find that channel.', ephemeral: true });
            }
        }

        try {
            await targetChannel.send(message);
            await interaction.reply({ content: 'Message sent successfully!', ephemeral: true });
        } catch (error) {
            await interaction.reply({ content: 'Failed to send message. Check bot permissions.', ephemeral: true });
        }
    },
};