import { GuildMember, HexColorString, MessageEmbed } from "discord.js";
import levelService from "../../lib/level.service";
import progressBar from "../../lib/progressBar";
import { argumentType } from "../../types/argument";
import { Command, returnMessage } from "../../types/Command";
import { CommandGroup } from "../../types/commandGroup";
import RavenInteraction from "../../types/interaction";

module.exports = class extends Command {
    constructor() {
        super({
            name: "level",
            description: "see level info.",
            group: CommandGroup.general,

            guildOnly: true,

            args: [
                {
                    type: argumentType.subCommand,
                    name: "get",
                    description: "Get your or someone else's level.",
                    subCommands: [
                        {
                            type: argumentType.user,
                            name: "user",
                            description: "whose level",
                            required: false,
                        },
                    ],
                },
                {
                    type: argumentType.subCommand,
                    name: "top",
                    description: "See the leaderboard.",
                },
            ],

            throttling: {
                duration: 60,
                usages: 60,
            },
        });
    }

    async execute(msg: RavenInteraction): Promise<returnMessage> {
        const subCommand = msg.options.getSubcommand(true);
        const member = msg.options.getMember("user") as GuildMember | null || (msg.member as GuildMember);
        if (!msg.guildId) throw "a";
        const guild = await msg.client.db.guilds.findUnique({ where: { guild_id: msg.guildId } });

        const failEmbed = new MessageEmbed()
            .setColor(process.env.EMBED_FAIL_COLOR as HexColorString);

        const embed = new MessageEmbed()
            .setColor(process.env.EMBED_COLOR as HexColorString);

        if (!guild?.level) return { embeds: [failEmbed.setDescription("The level system is disabled in this server")] };

        if (subCommand === "top") {
            const top = await msg.client.db.level.findMany({ where: { guild_id: msg.guildId }, orderBy: { experience: "desc" }, take: 10 });
            embed.setTitle(`${msg.guild?.name} leaderboard`);
            embed.setDescription(top.map((x, y) => `${y + 1}. <@${x.user_id}> \`${x.experience}\``).join("\n"));
            return { embeds: [embed] };
        }

        let level = await msg.client.db.level.findUnique({ where: { user_id_guild_id: { guild_id: msg.guildId, user_id: member.id } } });
        if (!level) level = await msg.client.db.level.create({ data: { user_id: member.id, guild_id: msg.guildId } });
        const stats = levelService.calculateLevel(level.experience);

        const NextReward = await msg.client.db.level_reward.findFirst({ where: { guild_id: msg.guildId, level: { gt: stats.level } }, orderBy: { level: "asc" } });

        const theme = {
            start: "8",
            end: "]",
            passed: "=",
            remaining: "-",
            indicator: "D",
        };

        const progress = progressBar(stats.currentXP, stats.levelXP, 40, theme);
        const remaining = stats.levelXP - stats.currentXP;

        embed.setTitle(`${member.user.username}'s level`);
        embed.setThumbnail(member.avatarURL() || member.user.avatarURL() || member.user.defaultAvatarURL);
        embed.setDescription(`${member.user} is currently level ${stats.level}\`\`\`${progress}\`\`\``);
        embed.addField("Level XP", `**Current:** ${stats.currentXP}\n**Next Level:** ${stats.levelXP}`, true);
        embed.addField("Remaining XP", `**XP left:** ${remaining}\n**Messages left:** ${Math.round(remaining / 20)}`, true);
        embed.addField("Total XP", `${stats.totalXP}`, true);
        if (NextReward) embed.addField("Next reward", `**Level:** ${NextReward.level}\n**Role:** <@&${NextReward.role_id}>`);
        return { embeds: [embed] };

    }
};