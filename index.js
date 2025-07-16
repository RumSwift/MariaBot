const { Client, GatewayIntentBits, REST, Routes, Partials } = require('discord.js');
const fs = require('fs');
const path = require('path');

// Import all services
const messageDeletedService = require('./Services/MessageDeleted');
const messageEditedService = require('./Services/MessageEdited');
const roleAddedService = require('./Services/RoleAdded');
const roleRemovedService = require('./Services/RoleRemoved');
const memberLeftService = require('./Services/MemberLeft');
const memberJoinService = require('./Services/MemberJoin');
const memberBannedService = require('./Services/MemberBanned');
const memberJoinShortService = require('./Services/MemberJoinShort');
const modMailService = require('./Services/ModMail');
const dmmodReplyService = require('./Services/DMmodReply');
const reactRemovalService = require('./Services/ReactRemoval');
const feedbackEmbed = require('./Services/FeedbackEmbed');
const bugReportingEmbed = require('./Services/BugReportingEmbed');
const autoMessagesService = require('./Services/AutoMessages');

require('dotenv').config();
const TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.DirectMessages,
        GatewayIntentBits.DirectMessageTyping,
        GatewayIntentBits.GuildMessageReactions
    ],
    partials: [Partials.Channel, Partials.Message, Partials.Reaction]
});

const commands = new Map();
const commandData = [];

const commandsPath = path.join(__dirname, 'Commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = require(filePath);

    if (command.data && command.execute) {
        commands.set(command.data.name, command);
        commandData.push(command.data.toJSON());
    }
}

const rest = new REST({ version: '10' }).setToken(TOKEN);

async function deployCommands() {
    try {
        console.log('Started refreshing application (/) commands.');

        await rest.put(
            Routes.applicationCommands(CLIENT_ID),
            { body: commandData },
        );

        console.log('Successfully reloaded application (/) commands.');
    } catch (error) {
        console.error(error);
    }
}

client.once('ready', async () => {
    console.log(`Ready! Logged in as ${client.user.tag}`);
    deployCommands();

    // Setup collectors
    modMailService.setupCollectors(client);
    dmmodReplyService.setupCollectors(client);

    // Initialize ReactRemoval service with database
    await reactRemovalService.initialize();
    await autoMessagesService.initialize();
});

client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;

    const command = commands.get(interaction.commandName);

    if (!command) return;

    try {
        await command.execute(interaction);
    } catch (error) {
        console.error(error);
        if (interaction.replied || interaction.deferred) {
            await interaction.followUp({ content: 'There was an error while executing this command!', ephemeral: true });
        } else {
            await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
        }
    }
});

client.on('interactionCreate', async (interaction) => {
    if (!interaction.isButton()) return;

    // Check if this is a scam confirmation button
    if (interaction.customId.startsWith('scam_confirm_') || interaction.customId.startsWith('scam_cancel_')) {
        const scamModule = require('./Commands/ModPanel/Scam');
        if (scamModule.handleScamConfirmation) {
            const handled = await scamModule.handleScamConfirmation(interaction);
            if (handled) {
                console.log('Scam confirmation button handled successfully');
            }
        }
    }
});

// Message deletion event handler
client.on('messageDelete', async (message) => {
    await messageDeletedService.handleMessageDelete(message);
});

// Message edit event handler
client.on('messageUpdate', async (oldMessage, newMessage) => {
    await messageEditedService.handleMessageEdit(oldMessage, newMessage);
});

// DM handler for mod mail
client.on('messageCreate', async (message) => {
    await modMailService.handleUserDM(message);
    await modMailService.handleModeratorReply(message);
    await autoMessagesService.handleMessage(message);
});

// Member update event handler (for role changes)
client.on('guildMemberUpdate', async (oldMember, newMember) => {
    await roleAddedService.handleRoleAdd(oldMember, newMember);
    await roleRemovedService.handleRoleRemove(oldMember, newMember);
});

// Member ban event handler
client.on('guildBanAdd', async (ban) => {
    await memberBannedService.handleMemberBan(ban);
});

// Member join event handler
client.on('guildMemberAdd', async (member) => {
    await memberJoinService.handleMemberJoin(member);
    await memberJoinShortService.handleMemberJoinShort(member);
});

// Member leave event handler
client.on('guildMemberRemove', async (member) => {
    await memberLeftService.handleMemberLeave(member);
});

// Reaction add event handler
client.on('messageReactionAdd', async (reaction, user) => {
    await reactRemovalService.handleReactionAdd(reaction, user);
});

// Thread create event handler (NEW)
client.on('threadCreate', async (thread) => {
    await feedbackEmbed.handleThreadCreate(thread);
    await bugReportingEmbed.handleThreadCreate(thread);
});

client.login(TOKEN);