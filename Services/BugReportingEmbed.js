const { EmbedBuilder, ChannelType, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

module.exports = {
    async handleThreadCreate(thread) {
        // Check if this is a thread in the bug reporting forum
        if (thread.parentId !== process.env.BUG_REPORTING_FORUM) return;

        // Only handle forum threads (not regular text channel threads)
        if (thread.type !== ChannelType.PublicThread) return;

        // Make sure the parent is actually a forum channel
        if (!thread.parent || thread.parent.type !== ChannelType.GuildForum) return;

        try {
            // Get the thread owner (original poster)
            const threadOwner = thread.ownerId;

            // Create the embed with the bug reporting content
            const embed = new EmbedBuilder()
                .setTitle('🐛 Welcome to the Bug Report Channel!')
                .setDescription(`## GENERAL NOTES 📋

- We dont provide **any** support about accounts. Contact our Support for it.
  - [EN Support](https://habbohotelorigins.zendesk.com/hc/en-us/requests/new)
  - [ES Support](https://habbohotelorigins.zendesk.com/hc/es/requests/new)
  - [PT/BR Support](https://habbohotelorigins.zendesk.com/hc/pt-br/requests/new)
- Habbo Staff may occasionally reply to threads for more details or clarification. However, due to the high volume of feedback, we cannot respond to every post.
- Do not post large GIFs, off-topic comments, or any other content that may distract from the main conversation.
- Harassment or inflammatory comments towards Habbo staff or developers will not be tolerated.
- Remember to obey the [Habbo Way](https://habbohotelorigins.zendesk.com/hc/en-us/articles/19376774373405-Habbo-Way).

## WHAT IF I WANT TO LEAVE FEEDBACK? 📝

Please report feedback in our dedicated forum here. Do not post any game feedback in [this forum](https://discord.com/channels/1252726515712528444/1336051320406282311/1336051361984417855).`)
                .setColor('#5865F2'); // Discord blurple color

            // Create the link button
            const linkButton = new ButtonBuilder()
                .setLabel('Support Channel Guidelines')
                .setURL('https://discord.com/channels/1252726515712528444/1277639596062015500')
                .setStyle(ButtonStyle.Link);

            const row = new ActionRowBuilder().addComponents(linkButton);

            // Post the embed with the button in the thread
            await thread.send({
                embeds: [embed],
                components: [row]
            });

            console.log(`Posted bug reporting welcome embed in thread: ${thread.name} (${thread.id})`);

        } catch (error) {
            console.log('Failed to post bug reporting embed:', error.message);
        }
    }
};