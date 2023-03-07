import { Event } from "@src/structs/event";
import { GuildMember, Message, escapeMarkdown } from "discord.js";
import { warningEmbedTemplate } from "../lib/embedTemplate";
import { getAvatar } from "../lib/functions";
import GuildConfig from "../lib/guildconfig.service";
import logService, { logType } from "../modules/logger.service";

export default {
  name: "messageUpdate",
  once: false,

  async execute(old: Message, current: Message): Promise<void> {
    if (!current.guildId) return;
    if (old.member?.user.bot) return;

    const config = GuildConfig.getGuild(current.guildId);

    if (!config || !config.log_events || config.banned) return;
    if (old.content == current.content) return;

    const member = current.member as GuildMember;

    const embed = warningEmbedTemplate();

    const oldMsg = old.content
      ? `\`\`\`${escapeMarkdown(old.content)}\`\`\`\n`
      : "*empty*\n";

    const newMsg = current.content
      ? `\`\`\`${escapeMarkdown(current.content)}\`\`\`\n`
      : "*empty*\n";

    embed.setTitle("Message updated");
    embed.setDescription(
      `<#${current.channelId}>\n` +
      "**old:**\n" +
      oldMsg +
      "**current:**\n" +
      newMsg,
    );
    embed.setFooter({
      text: `${member.user.tag} <@${member.id}>`,
      iconURL: getAvatar(member),
    });

    logService.log(embed, current.guildId, logType.EVENT);
  },
} as Event;
