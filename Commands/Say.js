const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');

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
                .setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

    async execute(interaction) {

        const allowedRoles = [
            process.env.HABBO_STAFF,
            process.env.SULAKE_STAFF,
            process.env.HEAD_MOD,
            process.env.COMMUNITY_MOD,
            process.env.LANGUAGE_MOD_ES,
            process.env.LANGUAGE_MOD_BR
        ].filter(Boolean);


        const userRoles = interaction.member.roles.cache;
        const hasPermission = allowedRoles.some(roleId => userRoles.has(roleId));

        if (!hasPermission) {
            const errorReply = await interaction.reply({
                content: 'You do not have permission to use this command.',
                ephemeral: true
            });

            setTimeout(async () => {
                try {
                    await errorReply.delete();
                } catch (error) {
                    console.log('Could not delete permission error message');
                }
            }, 15000);

            return;
        }

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

            const logChannel = await interaction.client.channels.fetch(process.env.SAYS_LOG_CHANNEL_ID);
            if (logChannel) {
                const logEmbed = new EmbedBuilder()
                    .setColor('#00ff00')
                    .setTitle('Plain text')
                    .setDescription(`${message}\n\nSent by: ${interaction.user} (${interaction.user.username})\nIn: ${targetChannel}\nTime: <t:${Math.floor(Date.now() / 1000)}:R>`);

                await logChannel.send({ embeds: [logEmbed] });
            }

            await interaction.reply({ content: 'Message sent successfully!', ephemeral: true });
        } catch (error) {
            await interaction.reply({ content: 'Failed to send message.', ephemeral: true });
        }
    },
};