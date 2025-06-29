const { EmbedBuilder } = require('discord.js');

module.exports = {
    async handleRoleRemove(oldMember, newMember) {
        if (!newMember.guild) return;
        if (newMember.user.bot) return;

        const removedRoles = oldMember.roles.cache.filter(role => !newMember.roles.cache.has(role.id));
        if (removedRoles.size === 0) return;

        try {
            const logChannel = await newMember.client.channels.fetch(process.env.ROLE_REMOVED_LOG_CHANNEL_ID);
            if (!logChannel) return;

            for (const [roleId, role] of removedRoles) {
                const embed = new EmbedBuilder()
                    .setColor('#FF0000')
                    .setTitle('📋 Role Removed')
                    .addFields(
                        { name: 'User:', value: `${newMember.user}`, inline: true },
                        { name: 'Internal info:', value: `${newMember.user.username} | ${newMember.user.id}`, inline: true },
                        { name: 'Created at:', value: `<t:${Math.floor(newMember.user.createdTimestamp / 1000)}:F>`, inline: false },
                        { name: 'Joined at:', value: `<t:${Math.floor(newMember.joinedTimestamp / 1000)}:F>`, inline: false },
                        { name: 'Role removed:', value: `${role} ❌`, inline: false }
                    )
                    .setThumbnail(newMember.user.displayAvatarURL({ dynamic: true }))
                    .setFooter({ text: `• ${newMember.guild.name} •` });

                await logChannel.send({ embeds: [embed] });
            }

        } catch (error) {
            console.log('Failed to log role removal:', error.message);
        }
    }
};