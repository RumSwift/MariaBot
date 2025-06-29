module.exports = {
    async handleMemberJoinShort(member) {
        if (!member.guild) return;
        if (member.user.bot) return;

        try {
            const logChannel = await member.client.channels.fetch(process.env.MEMBER_JOIN_SHORT_LOG_CHANNEL_ID);
            if (!logChannel) return;

            const message = `${member.user} has joined the server`;

            await logChannel.send(message);

        } catch (error) {
            console.log('Failed to log short member join:', error.message);
        }
    }
};