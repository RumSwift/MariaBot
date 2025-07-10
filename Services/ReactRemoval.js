const { EmbedBuilder } = require('discord.js');
const fetch = require('node-fetch');

module.exports = {
    // Cached banned emojis (updated from database)
    bannedEmojisCache: [],
    lastCacheUpdate: 0,
    cacheUpdateInterval: 60 * 60 * 1000, // 1 hour in milliseconds

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
        // Don't process bot reactions
        if (user.bot) return;

        // Don't process reactions in DMs
        if (!reaction.message.guild) return;

        try {
            // Check and update cache if needed
            await this.checkAndUpdateCache();

            // Get the emoji identifier (could be Unicode or custom emoji)
            let emojiIdentifier = '';
            let emojiAlternatives = [];

            if (reaction.emoji.id) {
                // Custom emoji - use the full format <:name:id>
                emojiIdentifier = `<:${reaction.emoji.name}:${reaction.emoji.id}>`;
                emojiAlternatives = [
                    emojiIdentifier,
                    reaction.emoji.name,
                    `:${reaction.emoji.name}:`
                ];
            } else {
                // Unicode emoji - use the actual emoji and alternatives
                emojiIdentifier = reaction.emoji.name;
                emojiAlternatives = [
                    reaction.emoji.name, // The actual Unicode character
                    reaction.emoji.toString(), // Same as above usually
                    `:${reaction.emoji.name}:`, // :name: format
                    // Add the text name for common emojis
                    this.getEmojiTextName(reaction.emoji.name)
                ].filter(Boolean); // Remove any undefined values
            }

            // Check if this emoji is banned (check cache against all alternatives)
            const isBanned = this.bannedEmojisCache.some(bannedEmoji =>
                emojiAlternatives.includes(bannedEmoji)
            );

            if (!isBanned) return;

            // Remove the reaction
            await reaction.users.remove(user.id);

            // Send DM to user
            await this.sendWarningDM(user, emojiIdentifier);

            // Log the removal
            await this.logReactionRemoval(reaction, user, emojiIdentifier);

        } catch (error) {
            console.log('Failed to handle reaction removal:', error.message);
        }
    },

    async sendWarningDM(user, emojiIdentifier) {
        try {
            const { EmbedBuilder } = require('discord.js');

            // Get the emoji display for the DM
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
                .setColor('#FF8C00') // Dark orange color
                .setTimestamp();

            await user.send({ embeds: [dmEmbed] });
            console.log(`Warning DM sent to ${user.username} for banned emoji: ${emojiIdentifier}`);

        } catch (error) {
            console.log(`Failed to send warning DM to ${user.username}:`, error.message);
            // Don't throw error - continue with logging even if DM fails
        }
    },

    async logReactionRemoval(reaction, user, emojiIdentifier) {
        try {
            const logChannel = await reaction.message.client.channels.fetch(process.env.REACTION_REMOVAL_LOG_CHANNEL_ID);
            if (!logChannel) return;

            // Fetch the full message to ensure we have content
            let message = reaction.message;
            if (reaction.message.partial) {
                message = await reaction.message.fetch();
            }

            // Get message content
            let messageContent = message.content || '*No text content*';

            // Get the emoji display
            let emojiDisplay = '';
            if (reaction.emoji.id) {
                // Custom emoji
                emojiDisplay = `<:${reaction.emoji.name}:${reaction.emoji.id}>`;
            } else {
                // Unicode emoji
                emojiDisplay = reaction.emoji.toString();
            }

            // Create the embed with the new format
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

    // Initialize the service (call this when bot starts)
    async initialize() {
        console.log('Initializing ReactRemoval service...');
        await this.loadBannedEmojisFromDatabase();
    },

    // Force refresh cache (for manual updates)
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

    // Helper method to get text name for common Unicode emojis
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

    // Method to get current cache status (for debugging)
    getCacheInfo() {
        return {
            cachedEmojis: this.bannedEmojisCache.length,
            lastUpdate: new Date(this.lastCacheUpdate),
            nextUpdate: new Date(this.lastCacheUpdate + this.cacheUpdateInterval)
        };
    }
};