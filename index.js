// Load environment variables from .env file
require('dotenv').config();

const express = require('express');
const app = express();

app.get('/', (req, res) => {
  res.send('Bot is running!');
});

app.listen(3000, () => {
  console.log('Express server is up.');
});


// Access individual environment variables
const discordToken = process.env.DISCORD_TOKEN;

// Log the token to check if it's loaded correctly
console.log(discordToken); // Ensure this logs the correct token

// Import necessary components separately from discord.js
const Client = require('discord.js').Client;
const GatewayIntentBits = require('discord.js').GatewayIntentBits;

// Define the client with intents
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

// Define the 'ready' event handler
client.once('ready', () => {
  console.log(`Bot is online as ${client.user.tag}`);
});

// Define the 'messageCreate' event handler
client.on('messageCreate', message => {
  if (message.author.bot) return;

  if (message.content === '!hello') {
    message.channel.send('Hey there!');
  }
});

// Log in using the token from .env file
client.login(discordToken);