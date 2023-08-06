import {
  SlashCommandBuilder,
  EmbedBuilder,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} from "discord.js";

// Import prima client
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

export const data = new SlashCommandBuilder()
  .setName("me")
  .setDescription("Returns your panel, so you can control your settings etc")
  .setDMPermission(false);

export async function execute(interaction) {
  await interaction.deferReply();

  // Check if the user exists
  const checkIfUserExists = await prisma.user.findUnique({
    where: { discordId: interaction.user.id },
  });

  // Check if the user exists
  if (!checkIfUserExists)
    return interaction.editReply({
      content: `⛴️ You ended up in a waterfall, please use \`/register\` to survive!`,
    });

  // Embed
  const embed = new EmbedBuilder()
    .setTitle(`Water Tracker - Panel`)
    .setDescription(
      "Welcome to your panel, here you can control your settings etc"
    )

    .setColor("Blue")
    .addFields([
      {
        name: "Completed Glasses Today",
        value: `\`${checkIfUserExists.glassesCompleted}\``,
        inline: true,
      },
      {
        name: "Completed Today",
        value: `\`${
          checkIfUserExists.glassesCompleted >= checkIfUserExists.glasses
            ? "Yes"
            : "No"
        }\``,
        inline: true,
      },
      {
        name: "Daily Goal",
        value: `\`${checkIfUserExists.glasses}\``,
      },

      {
        name: "Streak",
        value: `\`${checkIfUserExists.streak}\``,
      },
    ])

    .setTimestamp();

  // Return the embed
  await interaction.editReply({
    embeds: [embed],
    components: [
      new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("glasses")
          .setLabel("Set Daily Goal")
          .setStyle(ButtonStyle.Primary),

        new ButtonBuilder()
          .setCustomId("notifications")
          .setLabel(
            `${
              checkIfUserExists.notificationsEnabled ? "Disable" : "Enable"
            } Notifications`
          )
          .setStyle(
            checkIfUserExists.notificationsEnabled
              ? ButtonStyle.Danger
              : ButtonStyle.Success
          ),

        new ButtonBuilder()
          .setCustomId("add_glass")
          .setLabel("Drink a Glass of Water")
          .setEmoji("🥛")
          .setStyle(ButtonStyle.Secondary)
      ),
    ],
    ephemeral: true,
  });

  // Create collector
  const collector = interaction.channel.createMessageComponentCollector({
    filter: (i) => i.user.id === interaction.user.id,
    time: 30000,
  });

  // On collect
  collector.on("collect", async (i) => {
    const id = i.customId;

    // Check if the user exists
    if (!checkIfUserExists)
      return interaction.editReply({
        content: `⛴️ You ended up in a waterfall, please use \`/register\` to survive!`,
      });

    // Switch id
    switch (id) {
      case "glasses": {
        console.log("glasses");

        const modal = new ModalBuilder()
          .setTitle("Set Daily Goal")
          .setCustomId("glasses_modal");

        const input = new TextInputBuilder()
          .setCustomId("glasses_amount")
          .setPlaceholder("Enter a number")
          .setLabel("How many glasses of water daily?")
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
          .setValue(`${checkIfUserExists.glasses}`)
          .setMinLength(1);

        const inputRow = new ActionRowBuilder().addComponents(input);

        modal.addComponents(inputRow);

        await i.showModal(modal);

        break;
      }

      case "notifications": {
        break;
      }

      case "add_glass": {
        // Add a glass
        await prisma.user.update({
          where: {
            discordId: interaction.user.id,
          },

          data: {
            glassesCompleted: checkIfUserExists.glassesCompleted + 1,
          },
        });

        // Edit the reply
        await interaction.editReply({
          content: `*Drinking a glass of water... 🥛*`,
          embeds: [],
          components: [],
          ephemeral: true,
        });

        setTimeout(async () => {
          // Edit the reply
          await interaction.editReply({
            content: `👏🫵 Great job! You have now completed \`${
              checkIfUserExists.glassesCompleted + 1
            }\` glasses today!`,
            embeds: [],
            components: [],
            ephemeral: true,
          });
        }, 3000);

        break;
      }
    }
  });

  // On end
  collector.on("end", async (i) => {
    // Edit the reply
    await interaction.editReply({
      content: `⏰ This panel has expired, please run \`/me\` again to view it`,
      embeds: [],
      components: [],
      ephemeral: true,
    });
  });
}
