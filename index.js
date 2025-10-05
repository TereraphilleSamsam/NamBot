// index.js
require('dotenv').config();
const { Client, GatewayIntentBits, ActionRowBuilder, ButtonBuilder, ButtonStyle, Events, EmbedBuilder } = require('discord.js');
const express = require('express');

// Initialize client with necessary intents
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
  ]
});

// Express server for health checks
const app = express();
app.use(express.json());

app.get('/', (req, res) => {
  res.json({ 
    status: 'online', 
    bot: client.user?.tag || 'Starting...',
    uptime: process.uptime()
  });
});

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'healthy' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Express server running on port ${PORT}`);
});

// Game Manager Class
class GameManager {
  constructor() {
    this.activeGames = new Map();
  }

  startGuessingGame(userId) {
    const game = {
      type: 'guessing',
      number: Math.floor(Math.random() * 10) + 1,
      attempts: 0,
      maxAttempts: 3,
      startedAt: Date.now()
    };
    this.activeGames.set(userId, game);
    return game;
  }

  handleGuess(userId, guess) {
    const game = this.activeGames.get(userId);
    if (!game) return null;

    game.attempts++;
    
    if (guess === game.number) {
      this.activeGames.delete(userId);
      return { result: 'win', attempts: game.attempts, number: game.number };
    } else if (game.attempts >= game.maxAttempts) {
      this.activeGames.delete(userId);
      return { result: 'lose', number: game.number, attempts: game.attempts };
    } else {
      const hint = guess > game.number ? 'lower' : 'higher';
      return { result: 'continue', hint, attempts: game.attempts, maxAttempts: game.maxAttempts };
    }
  }

  cleanupExpiredGames() {
    const now = Date.now();
    const TEN_MINUTES = 10 * 60 * 1000;
    
    for (const [userId, game] of this.activeGames.entries()) {
      if (now - game.startedAt > TEN_MINUTES) {
        this.activeGames.delete(userId);
      }
    }
  }
}

// Adventure Game Data
const adventureScenes = {
  start: {
    text: "You enter a dark forest. You hear a strange noise coming from the bushes. What do you do?",
    choices: [
      { text: "Investigate the noise", next: "investigate" },
      { text: "Run away quickly", next: "run" },
      { text: "Call out to see who's there", next: "call" }
    ]
  },
  investigate: {
    text: "You carefully approach the bushes and find a small, injured animal. It looks up at you with pleading eyes.",
    choices: [
      { text: "Help the animal", next: "help_animal" },
      { text: "Leave it alone and continue", next: "continue_forest" }
    ]
  },
  run: {
    text: "You run as fast as you can, but trip over a root and fall. When you look up, you see a mysterious figure standing over you.",
    choices: [
      { text: "Try to talk to the figure", next: "talk_figure" },
      { text: "Scream for help", next: "scream" }
    ]
  },
  // Add more scenes as needed
};

// Initialize game manager
const gameManager = new GameManager();
// Clean up expired games every 5 minutes
setInterval(() => gameManager.cleanupExpiredGames(), 5 * 60 * 1000);

// Helper function to create embeds
function createEmbed(title, description, color = 0x0099FF) {
  return new EmbedBuilder()
    .setTitle(title)
    .setDescription(description)
    .setColor(color)
    .setTimestamp();
}

// Helper function to create main menu
function createMainMenu() {
  const embed = createEmbed(
    "🎮 Game Center - Main Menu",
    "Welcome to the Game Center! Choose a game to play from the options below:"
  );

  const row = new ActionRowBuilder()
    .addComponents(
      new ButtonBuilder()
        .setCustomId('play_guessing')
        .setLabel('🎯 Guessing Game')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId('play_adventure')
        .setLabel('🏰 Adventure Game')
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId('show_help')
        .setLabel('❓ Help')
        .setStyle(ButtonStyle.Secondary)
    );

  return { embeds: [embed], components: [row] };
}

// Bot Events
client.once('ready', () => {
  console.log(`✅ Bot is online as ${client.user.tag}`);
  console.log(`📊 Serving ${client.guilds.cache.size} servers`);
  
  // Set bot status
  client.user.setActivity('!help for commands', { type: 'PLAYING' });
});

client.on('messageCreate', async (message) => {
  if (message.author.bot) return;

  const content = message.content.toLowerCase();

  // Help command
  if (content === '!help' || content === '!commands') {
    const helpEmbed = createEmbed(
      "🤖 Bot Commands",
      "Here are all the available commands:"
    )
    .addFields(
      { name: "🎮 Main Menu", value: "`!start` - Open the main menu with all games" },
      { name: "🎯 Quick Games", value: "`!guess` - Start a guessing game\n`!adventure` - Start an adventure game" },
      { name: "ℹ️ Info", value: "`!help` - Show this help message\n`!stats` - Show bot statistics" },
      { name: "🔧 Support", value: "Use buttons for interactive gameplay!" }
    );

    message.channel.send({ embeds: [helpEmbed] });
    return;
  }

  // Start command
  if (content === '!start') {
    message.channel.send(createMainMenu());
    return;
  }

  // Quick guessing game
  if (content === '!guess') {
    gameManager.startGuessingGame(message.author.id);
    message.channel.send("🔢 **Guessing Game Started!**\nI'm thinking of a number between 1 and 10. You have 3 attempts to guess it!");
    return;
  }

  // Quick adventure game
  if (content === '!adventure') {
    const scene = adventureScenes.start;
    const embed = createEmbed("🏰 Adventure Game", scene.text, 0x00FF00);
    
    const row = new ActionRowBuilder();
    scene.choices.forEach((choice, index) => {
      row.addComponents(
        new ButtonBuilder()
          .setCustomId(`adv_${choice.next}`)
          .setLabel(choice.text)
          .setStyle(ButtonStyle.Primary)
      );
    });

    message.channel.send({ embeds: [embed], components: [row] });
    return;
  }

  // Stats command
  if (content === '!stats') {
    const embed = createEmbed(
      "📊 Bot Statistics",
      `Currently serving ${client.guilds.cache.size} servers with ${client.users.cache.size} users.`
    )
    .addFields(
      { name: "Active Games", value: `${gameManager.activeGames.size}`, inline: true },
      { name: "Uptime", value: `${Math.floor(process.uptime() / 60)} minutes`, inline: true },
      { name: "Ping", value: `${client.ws.ping}ms`, inline: true }
    );

    message.channel.send({ embeds: [embed] });
    return;
  }

  // Handle guessing game responses
  if (gameManager.activeGames.has(message.author.id)) {
    const guess = parseInt(message.content);
    if (isNaN(guess) || guess < 1 || guess > 10) {
      message.reply("Please enter a valid number between 1 and 10.");
      return;
    }

    const result = gameManager.handleGuess(message.author.id, guess);
    
    if (result.result === 'win') {
      const embed = createEmbed(
        "🎉 You Won!",
        `Congratulations! You guessed the number ${result.number} correctly in ${result.attempts} attempt(s)!`,
        0x00FF00
      );
      message.channel.send({ embeds: [embed] });
    } else if (result.result === 'lose') {
      const embed = createEmbed(
        "💥 Game Over",
        `Sorry! You've used all ${result.attempts} attempts. The number was ${result.number}.`,
        0xFF0000
      );
      message.channel.send({ embeds: [embed] });
    } else {
      message.reply(`Incorrect! Try a ${result.hint} number. (Attempt ${result.attempts}/${result.maxAttempts})`);
    }
  }
});

// Button Interactions
client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isButton()) return;

  await interaction.deferReply({ ephemeral: true });

  try {
    // Guessing Game
    if (interaction.customId === 'play_guessing') {
      gameManager.startGuessingGame(interaction.user.id);
      await interaction.editReply({
        content: "🔢 **Guessing Game Started!**\nI'm thinking of a number between 1 and 10. You have 3 attempts to guess it! Type your guess in the chat."
      });
    }

    // Adventure Game
    else if (interaction.customId === 'play_adventure') {
      const scene = adventureScenes.start;
      const embed = createEmbed("🏰 Adventure Game", scene.text, 0x00FF00);
      
      const row = new ActionRowBuilder();
      scene.choices.forEach(choice => {
        row.addComponents(
          new ButtonBuilder()
            .setCustomId(`adv_${choice.next}`)
            .setLabel(choice.text)
            .setStyle(ButtonStyle.Primary)
        );
      });

      await interaction.editReply({ content: "Starting your adventure...", ephemeral: true });
      await interaction.channel.send({ embeds: [embed], components: [row] });
    }

    // Adventure game choices
    else if (interaction.customId.startsWith('adv_')) {
      const sceneKey = interaction.customId.replace('adv_', '');
      const scene = adventureScenes[sceneKey];
      
      if (scene) {
        const embed = createEmbed("🏰 Adventure Game", scene.text, 0x00FF00);
        
        const row = new ActionRowBuilder();
        scene.choices.forEach(choice => {
          row.addComponents(
            new ButtonBuilder()
              .setCustomId(`adv_${choice.next}`)
              .setLabel(choice.text)
              .setStyle(ButtonStyle.Primary)
          );
        });

        await interaction.editReply({ embeds: [embed], components: [row] });
      } else {
        await interaction.editReply({ content: "Your adventure continues... (More scenes coming soon!)" });
      }
    }

    // Help
    else if (interaction.customId === 'show_help') {
      const helpEmbed = createEmbed(
        "❓ Need Help?",
        "Use the commands below or click the buttons to play games!"
      )
      .addFields(
        { name: "Quick Commands", value: "`!guess` - Start guessing game\n`!adventure` - Start adventure game\n`!stats` - Bot statistics" },
        { name: "Support", value: "Games are interactive! Use buttons when available." }
      );

      await interaction.editReply({ embeds: [helpEmbed] });
    }

  } catch (error) {
    console.error('Error handling interaction:', error);
    await interaction.editReply({ 
      content: "❌ An error occurred while processing your request. Please try again." 
    });
  }
});

// Error handling
client.on('error', (error) => {
  console.error('Discord client error:', error);
});

process.on('unhandledRejection', (error) => {
  console.error('Unhandled promise rejection:', error);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('Shutting down gracefully...');
  client.destroy();
  process.exit(0);
});

// Login to Discord
client.login(process.env.DISCORD_TOKEN).catch(error => {
  console.error('Failed to login:', error);
  process.exit(1);
});
