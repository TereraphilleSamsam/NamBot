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
  call: {
    text: "You call out 'Hello? Is anyone there?' A friendly-looking woodsman emerges from the trees.",
    choices: [
      { text: "Ask for directions", next: "ask_directions" },
      { text: "Ask about the noise", next: "ask_noise" },
      { text: "Continue on your own", next: "continue_alone" }
    ]
  },
  help_animal: {
    text: "You gently tend to the animal's wounds. As you help it, the animal suddenly transforms into a forest spirit!",
    choices: [
      { text: "Ask for its blessing", next: "ask_blessing" },
      { text: "Ask about the forest", next: "ask_forest" },
      { text: "Continue your journey", next: "blessed_continue" }
    ]
  },
  continue_forest: {
    text: "You leave the animal behind and continue deeper into the forest. The path splits in two directions.",
    choices: [
      { text: "Take the left path", next: "left_path" },
      { text: "Take the right path", next: "right_path" },
      { text: "Go off the path entirely", next: "off_path" }
    ]
  },
  talk_figure: {
    text: "The figure lowers its hood, revealing an ancient wizard. 'I've been expecting you, traveler.'",
    choices: [
      { text: "Ask what he means", next: "wizard_expect" },
      { text: "Ask for help", next: "wizard_help" },
      { text: "Be cautious and back away", next: "wizard_cautious" }
    ]
  },
  scream: {
    text: "Your scream echoes through the forest. Suddenly, several forest guardians appear, surrounding you!",
    choices: [
      { text: "Explain yourself", next: "explain_guardians" },
      { text: "Try to fight", next: "fight_guardians" },
      { text: "Run away", next: "run_guardians" }
    ]
  },
  ask_directions: {
    text: "The woodsman points you toward an ancient temple. 'But beware,' he warns, 'the temple holds both great treasure and great danger.'",
    choices: [
      { text: "Head to the temple", next: "go_temple" },
      { text: "Ask about the danger", next: "ask_danger" },
      { text: "Choose a different path", next: "different_path" }
    ]
  },
  ask_noise: {
    text: "'That noise?' the woodsman laughs. 'Just the forest spirits playing. They're harmless unless provoked.'",
    choices: [
      { text: "Ask to meet the spirits", next: "meet_spirits" },
      { text: "Continue your journey", next: "woodsman_continue" },
      { text: "Ask about local legends", next: "ask_legends" }
    ]
  },
  continue_alone: {
    text: "You thank the woodsman and continue alone. You soon come across a mysterious glowing pond.",
    choices: [
      { text: "Drink from the pond", next: "drink_pond" },
      { text: "Swim in the pond", next: "swim_pond" },
      { text: "Avoid the pond", next: "avoid_pond" }
    ]
  },
  ask_blessing: {
    text: "The forest spirit grants you a blessing of enhanced senses. 'Use this gift wisely,' it says before vanishing.",
    choices: [
      { text: "Test your new senses", next: "test_senses" },
      { text: "Continue exploring", next: "blessed_explore" }
    ]
  },
  ask_forest: {
    text: "The spirit reveals: 'This forest is ancient and magical. Follow the fireflies to find what you seek.'",
    choices: [
      { text: "Follow the fireflies", next: "follow_fireflies" },
      { text: "Ask what you seek", next: "ask_seek" }
    ]
  },
  blessed_continue: {
    text: "With the spirit's gratitude, you feel lighter and more confident. The forest seems less intimidating now.",
    choices: [
      { text: "Explore a cave", next: "explore_cave" },
      { text: "Climb a tall tree", next: "climb_tree" },
      { text: "Follow a river", next: "follow_river" }
    ]
  },
  left_path: {
    text: "The left path leads to a beautiful meadow filled with exotic flowers and butterflies.",
    choices: [
      { text: "Rest in the meadow", next: "rest_meadow" },
      { text: "Pick some flowers", next: "pick_flowers" },
      { text: "Continue through", next: "through_meadow" }
    ]
  },
  right_path: {
    text: "The right path becomes steep and rocky. You find yourself climbing a small mountain.",
    choices: [
      { text: "Continue climbing", next: "continue_climb" },
      { text: "Look for another way", next: "find_other_way" },
      { text: "Rest and enjoy the view", next: "enjoy_view" }
    ]
  },
  off_path: {
    text: "Going off the path, you discover a hidden grove with a ancient stone circle.",
    choices: [
      { text: "Enter the stone circle", next: "enter_circle" },
      { text: "Study the carvings", next: "study_carvings" },
      { text: "Leave it alone", next: "leave_circle" }
    ]
  },
  wizard_expect: {
    text: "'The stars foretold your arrival,' the wizard explains. 'You are the one who can restore balance to this forest.'",
    choices: [
      { text: "Accept the quest", next: "accept_quest" },
      { text: "Ask for more information", next: "more_info" },
      { text: "Decline and leave", next: "decline_quest" }
    ]
  },
  wizard_help: {
    text: "The wizard offers you a choice of magical items to aid your journey.",
    choices: [
      { text: "Take the glowing orb", next: "take_orb" },
      { text: "Take the enchanted cloak", next: "take_cloak" },
      { text: "Take the ancient map", next: "take_map" }
    ]
  },
  // ... and many more scenes continue below
  explain_guardians: {
    text: "You explain you meant no harm. The guardians lower their weapons. 'The forest is dangerous at night. Let us guide you.'",
    choices: [
      { text: "Accept their guidance", next: "accept_guidance" },
      { text: "Politely decline", next: "decline_guidance" }
    ]
  },
  fight_guardians: {
    text: "You attempt to fight but are quickly subdued. The guardians take you to their village for judgment.",
    choices: [
      { text: "Plead your case", next: "plead_case" },
      { text: "Try to escape", next: "try_escape" }
    ]
  },
  run_guardians: {
    text: "You manage to escape the guardians but find yourself lost in an unfamiliar part of the forest.",
    choices: [
      { text: "Look for landmarks", next: "find_landmarks" },
      { text: "Follow animal tracks", next: "follow_tracks" },
      { text: "Climb a tree for perspective", next: "climb_perspective" }
    ]
  },
  go_temple: {
    text: "You arrive at the ancient temple. The entrance is sealed with mysterious runes.",
    choices: [
      { text: "Try to decipher the runes", next: "decipher_runes" },
      { text: "Look for another entrance", next: "find_entrance" },
      { text: "Call out to see if anyone's inside", next: "call_temple" }
    ]
  },
  ask_danger: {
    text: "'The temple is guarded by ancient magic,' the woodsman explains. 'Many have entered, few have returned.'",
    choices: [
      { text: "Risk it for the treasure", next: "risk_temple" },
      { text: "Ask about safer adventures", next: "safer_adventure" }
    ]
  },
  // Adding some endings and special scenes
  accept_quest: {
    text: "You accept the wizard's quest. He gives you a magical compass that points toward your destiny. **QUEST STARTED: Restore the Forest's Balance**",
    choices: [
      { text: "Follow the compass", next: "follow_compass" },
      { text: "Prepare supplies first", next: "prepare_supplies" }
    ]
  },
  take_orb: {
    text: "The orb glows with inner light. 'This will light your way in dark places,' the wizard says.",
    choices: [
      { text: "Test the orb's light", next: "test_orb" },
      { text: "Continue your journey", next: "orb_continue" }
    ]
  },
  enter_circle: {
    text: "As you step into the stone circle, time seems to slow down. Visions of the forest's past flood your mind.",
    choices: [
      { text: "Watch the visions", next: "watch_visions" },
      { text: "Try to leave the circle", next: "leave_vision" }
    ]
  },
  // Some conclusion scenes
  complete_quest: {
    text: "🎉 **QUEST COMPLETE!** You have restored balance to the forest! The trees glow with renewed energy and animals gather to thank you. You return home a hero, forever changed by your adventure.",
    choices: [
      { text: "Start New Adventure", next: "start" },
      { text: "Take a Rest", next: "quest_complete" }
    ]
  },
  treasure_end: {
    text: "💰 **TREASURE FOUND!** You discover the ancient treasure of the forest temple! You're now wealthy beyond your dreams and have amazing stories to tell for generations.",
    choices: [
      { text: "Start New Adventure", next: "start" },
      { text: "Retire Rich", next: "treasure_complete" }
    ]
  },
  peaceful_end: {
    text: "☮️ **PEACEFUL CONCLUSION** You decide to live in harmony with the forest, learning its secrets and becoming its guardian. You find true happiness in the simple, magical life.",
    choices: [
      { text: "Start New Adventure", next: "start" },
      { text: "Remain in Peace", next: "peace_complete" }
    ]
  },
  // Final completion states (no further choices)
  quest_complete: {
    text: "Your legend grows as travelers speak of the hero who saved the forest. You've achieved your destiny!",
    choices: []
  },
  treasure_complete: {
    text: "You build a magnificent estate at the forest's edge, always remembering the adventure that made it possible.",
    choices: []
  },
  peace_complete: {
    text: "Years pass, and you become known as the wise forest dweller, content with your chosen life of magic and nature.",
    choices: []
  }
};

// Add this function to handle the expanded adventure system
function getAdventureScene(sceneKey) {
  return adventureScenes[sceneKey] || {
    text: "Your adventure continues... (More content coming soon!)",
    choices: [
      { text: "Return to Start", next: "start" }
    ]
  };
}

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

    // In your button interaction handler, replace the adventure game section with:
else if (interaction.customId.startsWith('adv_')) {
  const sceneKey = interaction.customId.replace('adv_', '');
  const scene = getAdventureScene(sceneKey);
  
  const embed = createEmbed("🏰 Adventure Game", scene.text, 0x00FF00);
  
  if (scene.choices && scene.choices.length > 0) {
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
    // This is an ending with no further choices
    await interaction.editReply({ 
      embeds: [embed],
      components: [
        new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId('adv_start')
            .setLabel('Start New Adventure')
            .setStyle(ButtonStyle.Success)
        )
      ]
    });
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
