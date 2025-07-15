const { EmbedBuilder, ChannelType, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

module.exports = {
    async handleThreadCreate(thread) {
        // Check if this is a thread in the feedback forum
        if (thread.parentId !== process.env.FEEDBACK_FORUM) return;

        // Only handle forum threads (not regular text channel threads)
        if (thread.type !== ChannelType.PublicThread) return;

        // Make sure the parent is actually a forum channel
        if (!thread.parent || thread.parent.type !== ChannelType.GuildForum) return;

        try {
            // Get the thread owner (original poster)
            const threadOwner = thread.ownerId;

            // Create the embed with the exact content specified
            const embed = new EmbedBuilder()
                .setTitle('Welcome to the Feedback Channel!')
                .setDescription(`Hey <@${threadOwner}> 💜\n\nThanks for opening a feedback thread! Please remember to keep all feedback on-topic, civil, and respectful!\n\n♻️ **Avoid duplicate topics:** Before creating a new post, please check if a similar topic already exists. If it does, feel free to add your thoughts and details to the existing discussion.\n\n🤲 **Stay positive and respectful:** We have a zero-tolerance policy for negative or toxic behavior. Let's keep the discussions friendly and constructive, fostering a welcoming environment for all.\n\n🤼 **No spam:** Avoid posting irrelevant or repetitive content. Let's keep the forum organized and focused on meaningful discussions.\n\n🏷️ **Use appropriate tags:** When creating a new topic, make sure to use the relevant tag to help categorize and sort the feedback effectively.\n\n🇬🇧 **[English](https://origins.habbo.com)** (origins.habbo.com)\n🇪🇸 **[Español](https://origins.habbo.es)** (origins.habbo.es)\n🇵🇹🇧🇷 **[Português / Brasileiro](https://origins.habbo.com.br)** (origins.habbo.com.br)`)
                .setColor('#5865F2'); // Discord blurple color

            // Create the link button for Support Channel Guidelines
            const linkButton = new ButtonBuilder()
                .setLabel('Support Channel Guidelines')
                .setURL('https://discord.com/channels/1252726515712528444/1277663215744192625')
                .setStyle(ButtonStyle.Link);

            const row = new ActionRowBuilder().addComponents(linkButton);

            // Post the embed with the button in the thread
            await thread.send({
                embeds: [embed],
                components: [row]
            });

            console.log(`Posted feedback welcome embed in thread: ${thread.name} (${thread.id})`);

        } catch (error) {
            console.log('Failed to post forum response embed:', error.message);
        }
    }
};