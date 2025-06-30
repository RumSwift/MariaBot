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
const dmmodReplyService = require('./Services/DMmodReply'); // Add this line

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
        GatewayIntentBits.DirectMessageTyping
    ],
    partials: [Partials.Channel, Partials.Message]
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

client.once('ready', () => {
    console.log(`Ready! Logged in as ${client.user.tag}`);
    deployCommands();

    // Setup collectors
    modMailService.setupCollectors(client);
    dmmodReplyService.setupCollectors(client); // Add this line
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

client.login(TOKEN);