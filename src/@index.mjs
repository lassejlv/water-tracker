import { config } from "dotenv";
config();
const { DISCORD_TOKEN } = process.env;
import {
  Client,
  Collection,
  Events,
  GatewayIntentBits,
  Partials,
} from "discord.js";
import fs from "node:fs";
import path, { parse } from "node:path";
// Create a new client instance
const client = new Client({
  intents: [Object.keys(GatewayIntentBits)],
  partials: [
    Partials.Message,
    Partials.Channel,
    Partials.GuildMember,
    Partials.User,
  ],
});

// Client collections
client.commands = new Collection();

// Import prima client
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

// Discord.js command handler
import { fileURLToPath } from "url";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Command Handler
const commandPath = path.join(__dirname, "commands");
const commandFiles = fs
  .readdirSync(commandPath)
  .filter((file) => file.endsWith(".mjs"));

// Loop through the command files
for (const file of commandFiles) {
  // Import the command file
  const filePath = path.join(commandPath, file);
  const command = await import(`./commands/${file}`);

  if ("data" in command && "execute" in command) {
    client.commands.set(command.data.name, command);
  } else {
    console.log(
      `Command ${file} is missing either the data or execute method!`
    );
  }
}

// Events: InteractionCreate
client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const command = interaction.client.commands.get(interaction.commandName);

  if (!command) {
    new Logger().log(
      "error",
      `No command matching ${interaction.commandName} was found.`
    );
    return;
  }

  try {
    await command.execute(interaction);
  } catch (error) {
    console.error(error);

    const string = `
        There was an error while executing this command, this may happend sometimes. Try agian.
      `;

    if (interaction.replied || interaction.deferred) {
      await interaction.followUp({
        content: string,
        ephemeral: true,
      });
    } else {
      await interaction.reply({
        content: string,
        ephemeral: true,
      });
    }
  }
});

// We use 'c' for the event parameter to keep it separate from the already defined 'client'
client.once(Events.ClientReady, (c) => {
  console.log(`Ready! Logged in as ${c.user.tag}`);
});

// Event Modal
client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isModalSubmit()) return;
  const id = interaction.customId;

  switch (id) {
    case "glasses_modal": {
      const user = await prisma.user.findUnique({
        where: {
          discordId: interaction.user.id,
        },
      });

      if (user) {
        const amount = interaction.fields.getTextInputValue("glasses_amount");

        if (amount) {
          const update = await prisma.user.update({
            where: {
              discordId: interaction.user.id,
            },
            data: {
              glasses: parseInt(amount),
            },
          });

          console.log("update", update);

          const content = `🌊 Your should now be drinking \`${parseInt(
            amount
          )}\` glasses of water per day! ${
            parseInt(amount) < 8
              ? "\n\n*(Recommended daily water intake: 8 glasses. 😊)*"
              : ""
          }`;

          if (interaction.replied || interaction.deferred) {
            await interaction.followUp({
              content,
              ephemeral: true,
            });
          } else {
            await interaction.reply({
              content,
              ephemeral: true,
            });
          }
        }
      } else {
        await interaction.reply({
          content: `⛴️ You ended up in a waterfall, please use \`/register\` to survive!`,
          components: [],
          ephemeral: true,
        });
      }

      break;
    }
  }
});

// Check every 24 hours if the user drank their goal. If so add 1 to their streak
setInterval(() => {
  prisma.user.findMany().then((users) => {
    users.forEach((user) => {
      if (user.glassesCompleted > user.glasses) {
        prisma.user.update({
          where: {
            discordId: user.discordId,
          },
          data: {
            streak: user.streak + 1,
          },
        });

        console.log("User streak updated to", user.streak + 1);
      }
    });
  });
}, 1000);

// Log in to Discord with your client's token
client.login(DISCORD_TOKEN);
