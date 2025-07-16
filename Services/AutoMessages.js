const { EmbedBuilder } = require('discord.js');
const fetch = require('node-fetch');

module.exports = {
    // In-memory storage for message counts and current message index per channel
    channelMessageCounts: new Map(),
    channelMessageIndex: new Map(),
    autoMessagesCache: new Map(),
    lastCacheUpdate: 0,
    cacheUpdateInterval: 5 * 60 * 1000, // 5 minutes in milliseconds

    // Configuration
    messagesPerTrigger: 2, // Send auto message every 2 messages

    async loadAutoMessagesFromDatabase() {
        try {
            const response = await fetch('http://localhost:3000/api/automessages/GetAutoMessages', {
                headers: {
                    'x-api-key': process.env.API_KEY
                }
            });

            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    // Group messages by channel ID
                    const messagesByChannel = new Map();

                    data.messages.forEach(message => {
                        if (!messagesByChannel.has(message.ChannelID)) {
                            messagesByChannel.set(message.ChannelID, []);
                        }
                        messagesByChannel.get(message.ChannelID).push(message);
                    });

                    // Sort messages by ID for each channel
                    messagesByChannel.forEach((messages, channelId) => {
                        messages.sort((a, b) => a.ID - b.ID);
                    });

                    this.autoMessagesCache = messagesByChannel;
                    this.lastCacheUpdate = Date.now();

                    console.log(`Loaded auto messages for ${messagesByChannel.size} channels`);
                    return true;
                }
            }
            console.log('Failed to load auto messages from database');
            return false;
        } catch (error) {
            console.log('Error loading auto messages from database:', error.message);
            return false;
        }
    },

    async checkAndUpdateCache() {
        const now = Date.now();
        if (now - this.lastCacheUpdate > this.cacheUpdateInterval) {
            console.log('Auto messages cache expired, updating...');
            await this.loadAutoMessagesFromDatabase();
        }
    },

    async handleMessage(message) {
        // Don't process bot messages
        if (message.author.bot) return;

        // Don't process DMs
        if (!message.guild) return;

        // Don't process messages without content (embeds, files only, etc.)
        if (!message.content || message.content.trim() === '') return;

        try {
            // Check and update cache if needed
            await this.checkAndUpdateCache();

            const channelId = message.channel.id;

            // Check if this channel has auto messages configured
            const channelMessages = this.autoMessagesCache.get(channelId);
            if (!channelMessages || channelMessages.length === 0) {
                return; // No auto messages for this channel
            }

            // Increment message count for this channel
            const currentCount = this.channelMessageCounts.get(channelId) || 0;
            const newCount = currentCount + 1;
            this.channelMessageCounts.set(channelId, newCount);

            // Check if we should send an auto message
            if (newCount >= this.messagesPerTrigger) {
                await this.sendAutoMessage(message.channel, channelMessages);

                // Reset counter
                this.channelMessageCounts.set(channelId, 0);
            }

        } catch (error) {
            console.log('Error in auto messages handler:', error.message);
        }
    },

    async sendAutoMessage(channel, channelMessages) {
        try {
            const channelId = channel.id;

            // Get current message index for this channel (default to 0)
            let currentIndex = this.channelMessageIndex.get(channelId) || 0;

            // Get the message to send
            const messageToSend = channelMessages[currentIndex];

            if (!messageToSend) {
                console.log(`No message found at index ${currentIndex} for channel ${channelId}`);
                return;
            }

            // Create the embed
            const embed = new EmbedBuilder()
                .setColor('#00FF00') // Green color
                .setTimestamp();

            // Add title if provided
            if (messageToSend.Title && messageToSend.Title.trim() !== '') {
                embed.setTitle(messageToSend.Title);
            }

            // Add message content
            if (messageToSend.Message && messageToSend.Message.trim() !== '') {
                if (messageToSend.Title && messageToSend.Title.trim() !== '') {
                    embed.setDescription(messageToSend.Message);
                } else {
                    // If no title, use message as title
                    embed.setTitle(messageToSend.Message);
                }
            }

            // Send the embed
            await channel.send({ embeds: [embed] });

            // Update the index for next time (rotate through messages)
            const nextIndex = (currentIndex + 1) % channelMessages.length;
            this.channelMessageIndex.set(channelId, nextIndex);

            console.log(`Auto message sent to ${channel.name} (${channelId}): Message ID ${messageToSend.ID}, Next index: ${nextIndex}`);

        } catch (error) {
            console.log('Error sending auto message:', error.message);
        }
    },

    // Initialize the service (call this when bot starts)
    async initialize() {
        console.log('Initializing AutoMessages service...');
        await this.loadAutoMessagesFromDatabase();
        console.log(`AutoMessages service initialized with ${this.autoMessagesCache.size} channels configured`);
    },

    // Force refresh cache (for manual updates)
    async refreshCache() {
        console.log('Manually refreshing auto messages cache...');
        const success = await this.loadAutoMessagesFromDatabase();
        if (success) {
            console.log('Auto messages cache refresh successful');

            // Reset message counts and indexes when cache is refreshed
            this.channelMessageCounts.clear();
            this.channelMessageIndex.clear();

            return true;
        } else {
            console.log('Auto messages cache refresh failed');
            return false;
        }
    },

    // Get current status (for debugging)
    getStatus() {
        return {
            configuredChannels: this.autoMessagesCache.size,
            channelCounts: Object.fromEntries(this.channelMessageCounts),
            channelIndexes: Object.fromEntries(this.channelMessageIndex),
            lastCacheUpdate: new Date(this.lastCacheUpdate),
            nextCacheUpdate: new Date(this.lastCacheUpdate + this.cacheUpdateInterval)
        };
    },

    // Update the message trigger count (for configuration)
    setMessageTriggerCount(count) {
        this.messagesPerTrigger = count;
        console.log(`Auto message trigger count updated to ${count} messages`);
    }
};