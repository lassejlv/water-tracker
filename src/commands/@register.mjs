import { SlashCommandBuilder } from "discord.js";

// Import prima client
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

export const data = new SlashCommandBuilder()
  .setName("register")
  .setDescription("Register your account to the bot")
  .setDMPermission(false);

export async function execute(interaction) {
  await interaction.deferReply();

  // Check if the user exists
  const checkIfUserExists = await prisma.user.findUnique({
    where: { discordId: interaction.user.id },
  });

  // Check if the user exists
  if (checkIfUserExists)
    return interaction.editReply({
      content: `🤔 You already have an account!`,
      ephemeral: true,
    });

  // Create the user
  await prisma.user.create({
    data: {
      discordId: interaction.user.id,
    },
  });

  // Send the reply when the user is created
  return interaction.editReply({
    content: `💧 Your \`Water Tracker\` account has been created, you can now run \`/me\``,
    ephemeral: true,
  });
}
