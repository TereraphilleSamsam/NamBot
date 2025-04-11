// index.js

require('dotenv').config();
const { Client, GatewayIntentBits, ActionRowBuilder, ButtonBuilder, ButtonStyle, Events } = require('discord.js');
const express = require('express');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ]
});

const app = express();
app.get('/', (req, res) => {
  res.send('Bot is running on the web!');
});
app.listen(3000, () => {
  console.log('Express server is up!');
});

// Games data
const guessingNumber = Math.floor(Math.random() * 10) + 1;
const adventures = [
  "You enter a dark forest. You hear a noise. Do you investigate or run?",
  "A dragon blocks your path. Do you fight or flee?",
  "You find a treasure chest. Do you open it or ignore it?"
];

// Events
client.once('ready', () => {
  console.log(`Bot is online as ${client.user.tag}`);
});

client.on('messageCreate', async (message) => {
  if (message.author.bot) return;

  const content = message.content.toLowerCase();

  if (content === '!help') {
    message.channel.send("Commands:\n`!start` - Main Menu\n`!play` - Play the Guessing Game\n`!play2` - Play the Adventure Game");
  }

  if (content === '!start') {
    const row = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId('play_game')
          .setLabel('Play Guessing Game')
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId('play_adventure')
          .setLabel('Play Adventure Game')
          .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
          .setCustomId('show_help')
          .setLabel('Help')
          .setStyle(ButtonStyle.Secondary),
      );

    message.channel.send({
      content: "Main Menu - Choose an option:",
      components: [row],
    });
  }

  if (content.startsWith('!play')) {
    message.channel.send("Use `!start` to access games from the main menu!");
  }

  if (content === '!play2') {
    const random = Math.floor(Math.random() * adventures.length);
    message.channel.send(adventures[random]);
  }
});

// Button Interactions
client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isButton()) return;

  if (interaction.customId === 'play_game') {
    interaction.reply("Guess a number between 1 and 10 by typing it!");

    const filter = msg => msg.author.id === interaction.user.id;
    const collector = interaction.channel.createMessageCollector({ filter, time: 15000, max: 1 });

    collector.on('collect', msg => {
      const guess = parseInt(msg.content);
      if (guess === guessingNumber) {
        msg.reply("Correct! You guessed the number!");
      } else {
        msg.reply(`Wrong! The correct number was ${guessingNumber}`);
      }
    });
  }

  if (interaction.customId === 'play_adventure') {
    const random = Math.floor(Math.random() * adventures.length);
    interaction.reply(adventures[random]);
  }

  if (interaction.customId === 'show_help') {
    interaction.reply("Use `!play` for Guessing Game, `!play2` for Adventure, or `!help` for this message.");
  }
});

// Login
client.login(process.env.DISCORD_TOKEN);