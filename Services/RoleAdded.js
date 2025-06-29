const { EmbedBuilder } = require('discord.js');

module.exports = {
    async handleRoleAdd(oldMember, newMember) {
        if (!newMember.guild) return;
        if (newMember.user.bot) return;

        const addedRoles = newMember.roles.cache.filter(role => !oldMember.roles.cache.has(role.id));
        if (addedRoles.size === 0) return;

        try {
            const logChannel = await newMember.client.channels.fetch(process.env.ROLE_ADDED_LOG_CHANNEL_ID);
            if (!logChannel) return;

            for (const [roleId, role] of addedRoles) {
                const embed = new EmbedBuilder()
                    .setColor('#00FF00')
                    .setTitle('📋 Role Added')
                    .addFields(
                        { name: 'User:', value: `${newMember.user}`, inline: true },
                        { name: 'Internal info:', value: `${newMember.user.username} | ${newMember.user.id}`, inline: true },
                        { name: 'Created at:', value: `<t:${Math.floor(newMember.user.createdTimestamp / 1000)}:F>`, inline: false },
                        { name: 'Joined at:', value: `<t:${Math.floor(newMember.joinedTimestamp / 1000)}:F>`, inline: false },
                        { name: 'Role added:', value: `${role} ✅`, inline: false }
                    )
                    .setThumbnail(newMember.user.displayAvatarURL({ dynamic: true }))
                    .setFooter({ text: `• ${newMember.guild.name} •` });

                await logChannel.send({ embeds: [embed] });
            }

        } catch (error) {
            console.log('Failed to log role addition:', error.message);
        }
    }
};