const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const fetch = require('node-fetch');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('addbannedemoji')
        .setDescription('Add an emoji to the banned list')
        .addStringOption(option =>
            option.setName('emoji')
                .setDescription('The emoji to ban (can be actual emoji, :name:, or text name)')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('description')
                .setDescription('Reason for banning this emoji (optional)')
                .setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

    async execute(interaction) {
        // Define allowed role IDs from environment variables
        const allowedRoles = [
            process.env.HABBO_STAFF,
            process.env.SULAKE_STAFF,
            process.env.HEAD_MOD,
            process.env.COMMUNITY_MOD,
            process.env.LANGUAGE_MOD_ES,
            process.env.LANGUAGE_MOD_BR
        ].filter(Boolean);

        // Check if user has any of the required roles
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

        const emojiInput = interaction.options.getString('emoji');
        const description = interaction.options.getString('description') || 'No description provided';

        try {
            // Process the emoji input to determine type and identifiers
            const emojiData = this.processEmojiInput(emojiInput, interaction);

            // Add to database via API
            const response = await fetch('http://localhost:3000/api/bannedemojis/AddBannedEmoji', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': process.env.API_KEY
                },
                body: JSON.stringify({
                    EmojiIdentifier: emojiData.identifier,
                    EmojiType: emojiData.type,
                    EmojiName: emojiData.name,
                    EmojiID: emojiData.id,
                    Description: description,
                    AddedByDiscordID: interaction.user.id,
                    AddedByDiscordName: interaction.user.username
                })
            });

            const result = await response.json();

            if (!response.ok) {
                if (response.status === 409) {
                    const errorReply = await interaction.reply({
                        content: `❌ **Emoji already banned**: ${emojiInput} is already in the banned list.`,
                        ephemeral: true
                    });

                    setTimeout(async () => {
                        try {
                            await errorReply.delete();
                        } catch (error) {
                            console.log('Could not delete error message');
                        }
                    }, 15000);

                    return;
                }
                throw new Error(result.error || 'Unknown error occurred');
            }

            // Refresh the bot's cache
            const reactRemovalService = require('../Services/ReactRemoval');
            await reactRemovalService.refreshCache();

            // Send success message
            const successReply = await interaction.reply({
                content: `✅ **Emoji banned successfully!**\n\n**Emoji:** ${emojiInput}\n**Type:** ${emojiData.type}\n**Description:** ${description}\n\nThe bot's cache has been refreshed and this emoji will now be automatically removed from reactions.`,
                ephemeral: true
            });

            // Delete success message after 15 seconds
            setTimeout(async () => {
                try {
                    await successReply.delete();
                } catch (error) {
                    console.log('Could not delete success message');
                }
            }, 15000);

        } catch (error) {
            console.error('AddBannedEmoji error:', error);

            const errorReply = await interaction.reply({
                content: `❌ **Failed to ban emoji**: ${error.message}`,
                ephemeral: true
            });

            setTimeout(async () => {
                try {
                    await errorReply.delete();
                } catch (error) {
                    console.log('Could not delete error message');
                }
            }, 15000);
        }
    },

    processEmojiInput(input, interaction) {
        // Check if it's a custom Discord emoji (format: <:name:id> or <a:name:id>)
        const customEmojiMatch = input.match(/^<(a?):([^:]+):(\d+)>$/);
        if (customEmojiMatch) {
            return {
                identifier: input,
                type: 'custom',
                name: customEmojiMatch[2],
                id: customEmojiMatch[3]
            };
        }

        // Check if it's in :name: format
        const colonFormatMatch = input.match(/^:([^:]+):$/);
        if (colonFormatMatch) {
            return {
                identifier: input,
                type: 'unicode',
                name: colonFormatMatch[1],
                id: null
            };
        }

        // Check if it's a single Unicode emoji character
        const unicodeEmojiRegex = /^[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]$/u;
        if (unicodeEmojiRegex.test(input) || input.length === 1 || input.length === 2) {
            // For Unicode emojis, try to get the name from Discord's emoji parser
            let emojiName = input;

            // Try to parse as emoji to get the name
            try {
                // This is a basic approach - Discord.js might have better emoji parsing
                const commonEmojis = {
                    '♿': 'wheelchair',
                    '🚫': 'no_entry_sign',
                    '❌': 'x',
                    '🔞': 'underage',
                    '💀': 'skull',
                    '👎': 'thumbsdown',
                    '👍': 'thumbsup'
                };
                emojiName = commonEmojis[input] || input;
            } catch (error) {
                emojiName = input;
            }

            return {
                identifier: input,
                type: 'unicode',
                name: emojiName,
                id: null
            };
        }

        // If it's plain text, treat it as a text identifier
        return {
            identifier: input,
            type: 'unicode',
            name: input,
            id: null
        };
    }
};