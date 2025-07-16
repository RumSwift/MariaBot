const { EmbedBuilder } = require('discord.js');
const fetch = require('node-fetch');

module.exports = {
    bannedEmojisCache: [],
    lastCacheUpdate: 0,
    cacheUpdateInterval: 60 * 60 * 1000,

    async loadBannedEmojisFromDatabase() {
        try {
            const response = await fetch('http://localhost:3000/api/bannedemojis/GetBannedEmojis', {
                headers: {
                    'x-api-key': process.env.API_KEY
                }
            });

            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    this.bannedEmojisCache = data.emojis.map(emoji => emoji.EmojiIdentifier);
                    this.lastCacheUpdate = Date.now();
                    console.log(`Loaded ${this.bannedEmojisCache.length} banned emojis from database`);
                    return true;
                }
            }
            console.log('Failed to load banned emojis from database');
            return false;
        } catch (error) {
            console.log('Error loading banned emojis from database:', error.message);
            return false;
        }
    },

    async checkAndUpdateCache() {
        const now = Date.now();
        if (now - this.lastCacheUpdate > this.cacheUpdateInterval) {
            console.log('Cache expired, updating banned emojis from database...');
            await this.loadBannedEmojisFromDatabase();
        }
    },

    async handleReactionAdd(reaction, user) {

        if (user.bot) return;

        if (!reaction.message.guild) return;

        try {
            await this.checkAndUpdateCache();

            let emojiIdentifier = '';
            let emojiAlternatives = [];

            if (reaction.emoji.id) {

                emojiIdentifier = `<:${reaction.emoji.name}:${reaction.emoji.id}>`;
                emojiAlternatives = [
                    emojiIdentifier,
                    reaction.emoji.name,
                    `:${reaction.emoji.name}:`
                ];
            } else {
                emojiIdentifier = reaction.emoji.name;
                emojiAlternatives = [
                    reaction.emoji.name,
                    reaction.emoji.toString(),
                    `:${reaction.emoji.name}:`,

                    this.getEmojiTextName(reaction.emoji.name)
                ].filter(Boolean);
            }

            const isBanned = this.bannedEmojisCache.some(bannedEmoji =>
                emojiAlternatives.includes(bannedEmoji)
            );

            if (!isBanned) return;

            await reaction.users.remove(user.id);
            await this.sendWarningDM(user, emojiIdentifier);
            await this.logReactionRemoval(reaction, user, emojiIdentifier);

        } catch (error) {
            console.log('Failed to handle reaction removal:', error.message);
        }
    },

    async sendWarningDM(user, emojiIdentifier) {
        try {
            const { EmbedBuilder } = require('discord.js');


            let emojiDisplay = emojiIdentifier;

            const dmEmbed = new EmbedBuilder()
                .setTitle('Official message from Habbo Hotel: Origins')
                .setDescription(`Hello ${user},

This is a **verbal warning** regarding your recent behavior in Habbo Hotel: Origins.
Your recent reaction contained the following banned emoji(s): ${emojiDisplay}
Your reaction has been removed. Please refrain from using these emojis in the server.

Please take a moment to review our rules at https://discord.com/channels/1252726515712528444/1276211712760090685 and ensure that your actions align with them. If this behavior continues, we may need to escalate the warning.

If you have any questions or need clarification, you can use /dmmod in any channel for quick assistance.

Thank you for your understanding.

- Habbo Hotel: Origins Moderation -`)
                .setColor('#FF8C00')
                .setTimestamp();

            await user.send({ embeds: [dmEmbed] });
            console.log(`Warning DM sent to ${user.username} for banned emoji: ${emojiIdentifier}`);

        } catch (error) {
            console.log(`Failed to send warning DM to ${user.username}:`, error.message);

        }
    },

    async logReactionRemoval(reaction, user, emojiIdentifier) {
        try {
            const logChannel = await reaction.message.client.channels.fetch(process.env.REACTION_REMOVAL_LOG_CHANNEL_ID);
            if (!logChannel) return;

            let message = reaction.message;
            if (reaction.message.partial) {
                message = await reaction.message.fetch();
            }


            let messageContent = message.content || '*No text content*';

            let emojiDisplay = '';
            if (reaction.emoji.id) {

                emojiDisplay = `<:${reaction.emoji.name}:${reaction.emoji.id}>`;
            } else {
                emojiDisplay = reaction.emoji.toString();
            }


            const description = `**The following emoji violation was detected and removed:**

**__User:__**
${user} (${user.username}) | **ID:** ${user.id}

**__Channel:__**
${message.channel} (${message.channel.name})

**__Emoji Reaction Used:__**
${emojiDisplay}

**__Action Taken:__**
Removal & Warning

**__Message:__**
${message.url}
\`\`\`${messageContent}\`\`\``;

            const logEmbed = new EmbedBuilder()
                .setTitle('👽 Emoji Reaction Violation 👽')
                .setDescription(description)
                .setColor(11280673) // The color from your JSON (0xAC2AC1)
                .setThumbnail(user.displayAvatarURL({ dynamic: true }))
                .setTimestamp();

            await logChannel.send({ embeds: [logEmbed] });

        } catch (error) {
            console.log('Failed to log reaction removal:', error.message);
        }
    },

    async initialize() {
        console.log('Initializing ReactRemoval service...');
        await this.loadBannedEmojisFromDatabase();
    },

    async refreshCache() {
        console.log('Manually refreshing banned emojis cache...');
        const success = await this.loadBannedEmojisFromDatabase();
        if (success) {
            console.log('Cache refresh successful');
            return true;
        } else {
            console.log('Cache refresh failed');
            return false;
        }
    },

    // testing purposes  - get name of emoji (usless)
    getEmojiTextName(unicodeEmoji) {
        const emojiMap = {
            '♿': 'wheelchair',
            '🚫': 'no_entry_sign',
            '❌': 'x',
            '🔞': 'underage',
            // Add more mappings as needed
        };
        return emojiMap[unicodeEmoji];
    },

    getCacheInfo() {
        return {
            cachedEmojis: this.bannedEmojisCache.length,
            lastUpdate: new Date(this.lastCacheUpdate),
            nextUpdate: new Date(this.lastCacheUpdate + this.cacheUpdateInterval)
        };
    }
};