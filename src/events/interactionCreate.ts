import { state } from "@src/app";
import { env } from "@src/modules/env";
import { CommandGroup } from "@src/structs/command";
import { CommandStruct } from "@src/structs/command/command";
import { ParentCommandStruct } from "@src/structs/command/parent";
import { SubCommandStruct } from "@src/structs/command/subcommand";
import { Event } from "@src/structs/event";
import { ReturnMessage } from "@src/structs/returnmessage";
import { ButtonInteraction, ChatInputCommandInteraction, InteractionType } from "discord.js";
import bannedUsers from "../lib/banlist.service";
import { failEmbedTemplate } from "../lib/embedTemplate";
import GuildConfig from "../lib/guildconfig.service";
import logService from "../modules/logger.service";
import throttleService from "../modules/throttle.service";

const throttle = throttleService;
const errorEmbed = failEmbedTemplate(
  `An error occurred, please make a report of this in [the Raven bot discord server](${state.env.SUPPORT_SERVER})`,
);

export default {
  name: "interactionCreate",
  once: false,

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const guildconfig = GuildConfig.getGuild(interaction.guildId || "");
    if (bannedUsers.isBanned(interaction.user.id)) return;
    if (guildconfig?.banned) {
      console.log(
        `${interaction.guild?.name} - ${interaction.user.username}: attempted ${interaction.commandName}`
          .red,
      );
      return;
    }

    if (interaction.isButton()) {
      return await buttonEvent(interaction).catch((e) =>
        console.error(e),
      );
    }
    if (interaction.type == InteractionType.ApplicationCommand) {
      return await commandEvent(interaction).catch((e) =>
        console.error(e),
      );
    }
  },
} as Event;

const quickReply = async (msg: ChatInputCommandInteraction, content: string): Promise<void> => {
  await msg
    .reply({ ephemeral: true, content })
    .catch((e) => console.error(e));
};

const commandEvent = async (msg: ChatInputCommandInteraction): Promise<void> => {
  let { commandName } = msg;
  if (!msg.guildId) return;

  const timeStart = Date.now();

  const subCommandGroup = msg.options.getSubcommandGroup(false);
  const subCommand = msg.options.getSubcommand(false);

  subCommandGroup ? (commandName += `-${subCommandGroup}`) : null;
  subCommand ? (commandName += `-${subCommand}`) : null;

  const command = state.commands.get(commandName) as
    | SubCommandStruct
    | CommandStruct;

  if (!command) return;

  let parentCommand: ParentCommandStruct | undefined;
  if (commandName.includes("-")) {
    // if the command includes a dash, that means its a subcommand
    parentCommand = state.commands.get(
      commandName.split("-")[0],
    ) as ParentCommandStruct;
  }

  const group = (command as CommandStruct).group || parentCommand?.group;
  if (!group) return;

  if (
    group === CommandGroup.moderation &&
    msg.user.id == "213911889325981697"
  ) {
    return;
  }

  if (group === CommandGroup.owner && msg.user.id !== env.OWNER_ID)
    // Chek if owner command.
    return await quickReply(
      msg,
      "You are not allowed to do this command.",
    );

  const isPremium = GuildConfig.getGuild(msg.guildId)?.premium;

  // Check if premium command.
  if (command.premium && !isPremium && !(msg.user.id === env.OWNER_ID))
    return await quickReply(msg, "This command is premium only.");

  // Check if the user is throttled.
  const isThrottled = throttle.isThrottled(
    msg.guildId || "e",
    msg.user.id,
    command,
  );

  if (isThrottled)
    return await quickReply(
      msg,
      `Throttled, try again in \`${isThrottled}\` seconds`,
    );

  // Check if the bot has the needed permissions.
  if (command.botPermissions) {
    const missingPerms = command.botPermissions.filter(
      (x) => !msg.guild?.members.me?.permissions.has(x),
    );

    if (missingPerms.length > 0)
      return await quickReply(
        msg,
        `Missing permissions: \`${missingPerms.join("`, `")}\``,
      );
  }

  respond(msg, timeStart, command?.execute);
};

const buttonEvent = async (msg: ButtonInteraction): Promise<void> => {
  const options = msg.customId.split("_");
  const commandName = options[0];
  options.shift();
  msg.customId = options.join("_");

  const command = state.buttons.get(commandName);

  if (!command) return;

  const response = await command.execute(msg).catch((e: Error) => {
    console.log(e);
    return {
      ephemeral: true,
      embeds: [errorEmbed],
    } as ReturnMessage;
  });

  if (Object.keys(response).length === 0) return;
  await msg.reply(response).catch((e) => console.error(e));
};

const respond = async (
  interaction: ChatInputCommandInteraction,
  timeStart: number,
  func: (message: ChatInputCommandInteraction) => Promise<ReturnMessage | void>,
): Promise<void> => {
  const hidden =
    interaction.options.get("hidden") === null
      ? false
      : (interaction.options.get("hidden")?.value as boolean);

  throttle.addToThrottle(
    interaction.guildId || "e",
    interaction.user.id,
    interaction.commandName,
  );

  const response = await func(interaction)
    .then((x) => {
      if (!x) return null;
      x.ephemeral = x.ephemeral || hidden;
      return x;
    })
    .catch((e: Error) => {
      console.log(e);
      return {
        ephemeral: true,
        embeds: [errorEmbed],
      } as ReturnMessage;
    });

  const processingDuration = Date.now() - timeStart;

  if (!response) return;
  if (interaction.replied)
    await interaction.followUp(response).catch((e) => console.error(e));
  else if (interaction.deferred)
    await interaction
      .editReply(response)
      .catch((e) => console.error(e));
  else await interaction.reply(response).catch((e) => console.error(e));

  logService.logCommand(interaction, processingDuration, hidden);

  if (response.callback)
    respond(interaction, 0, response.callback).catch((e) =>
      console.error(e),
    );
};
