const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const fetch = require('node-fetch');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('debugmodmail')
        .setDescription('Debug ModMail database entries')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('User to check ModMail for')
                .setRequired(false)),

    async execute(interaction) {
        const targetUser = interaction.options.getUser('user') || interaction.user;

        try {
            // Check active ModMail
            const activeResponse = await fetch(`http://localhost:3000/api/modmail/GetActiveModMail/${targetUser.id}`, {
                headers: {
                    'x-api-key': process.env.API_KEY
                }
            });

            const activeData = await activeResponse.json();

            // Check ModMail ban
            const banResponse = await fetch(`http://localhost:3000/api/modmail/CheckModMailBan/${targetUser.id}`, {
                headers: {
                    'x-api-key': process.env.API_KEY
                }
            });

            const banData = await banResponse.json();

            const debugEmbed = new EmbedBuilder()
                .setTitle('🔍 ModMail Debug Info')
                .setDescription(`Debug information for ${targetUser.username}`)
                .addFields(
                    {
                        name: 'Active ModMail Status',
                        value: activeData.success ?
                            (activeData.hasActive ?
                                `✅ **Active**\nThread ID: ${activeData.activeModMail.ThreadID}\nChannel ID: ${activeData.activeModMail.ChannelID}\nTeam: ${activeData.activeModMail.TeamLanguage}\nTitle: ${activeData.activeModMail.Title}\nCreated: <t:${Math.floor(new Date(activeData.activeModMail.CreatedAt).getTime() / 1000)}:R>` :
                                '❌ No active ModMail') :
                            `❌ Error: ${activeData.error}`,
                        inline: false
                    },
                    {
                        name: 'Ban Status',
                        value: banData.success ?
                            (banData.isBanned ?
                                `🚫 **Banned**\nBanned: <t:${Math.floor(new Date(banData.banInfo.Timestamp).getTime() / 1000)}:R>` :
                                '✅ Not banned') :
                            `❌ Error: ${banData.error}`,
                        inline: false
                    }
                )
                .setColor('#0099FF')
                .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }));

            await interaction.reply({ embeds: [debugEmbed], ephemeral: true });

        } catch (error) {
            console.error('Debug ModMail error:', error);
            await interaction.reply({
                content: `Failed to get debug info: ${error.message}`,
                ephemeral: true
            });
        }
    },
};