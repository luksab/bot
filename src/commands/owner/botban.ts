import {
    ApplicationCommandOptionType,
    InteractionReplyOptions,
} from "discord.js";
import bannedUsers from "../../lib/banlist.service";
import { embedTemplate, failEmbedTemplate } from "../../lib/embedTemplate";
import { Command } from "../../types/Command";
import { CommandGroup } from "../../types/commandGroup";
import RavenInteraction from "../../types/interaction";

module.exports = class extends Command {
    constructor() {
        super({
            name: "botban",
            description: "bans a user from using the bot",
            group: CommandGroup.owner,

            guildOnly: false,

            arguments: [
                {
                    type: ApplicationCommandOptionType.String,
                    name: "target",
                    description: "User ID of the user to ban",
                    required: true,
                },
                {
                    type: ApplicationCommandOptionType.Boolean,
                    name: "state",
                    description: "Whether to ban or unban the user",
                    required: true,
                },
            ],

            throttling: {
                duration: 10,
                usages: 10,
            },
        });
    }

    async execute(msg: RavenInteraction): Promise<InteractionReplyOptions> {
        const target = msg.options.getString("target", true);
        const state = msg.options.getBoolean("state", true);

        if (!target.match(/[0-9]{17,19}/))
            return { content: "Invalid user ID" };

        const fail = failEmbedTemplate();

        let errorEmbed: void | InteractionReplyOptions;
        if (state)
            errorEmbed = await bannedUsers.ban(target).catch(() => ({
                embeds: [fail.setDescription("Failed to ban user")],
            }));
        else
            errorEmbed = await bannedUsers.unban(target).catch(() => ({
                embeds: [fail.setDescription("Failed to unban user")],
            }));

        if (errorEmbed) return errorEmbed;

        const response = embedTemplate();
        response.setDescription(
            `Successfully ${state ? "banned" : "unbanned"} <@${target}>`,
        );

        return { embeds: [response] };
    }
};
