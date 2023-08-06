import { config } from "dotenv";
config();
import { REST, Routes } from "discord.js";
import fs from "fs";
import path from "path";
const { DISCORD_TOKEN, DISCORD_CLIENT_ID } = process.env;

import { fileURLToPath } from "url";

export async function updateCommands() {
  const commands = [];

  const __filename = fileURLToPath(import.meta.url);

  const __dirname = path.dirname(__filename);

  const commandPath = path.join(__dirname, "commands");
  const commandFiles = fs
    .readdirSync(commandPath)
    .filter((file) => file.endsWith(".mjs"));

  for (const file of commandFiles) {
    const command = await import(`./commands/${file}`);
    commands.push(command.data.toJSON());
  }

  const rest = new REST({ version: "10" }).setToken(DISCORD_TOKEN);

  try {
    console.log("Updating application (/) commands...");

    await rest.put(Routes.applicationCommands(DISCORD_CLIENT_ID), {
      body: commands,
    });

    console.log("Successfully reloaded application (/) commands");
  } catch (error) {
    console.error(error);
  }
}

updateCommands();
