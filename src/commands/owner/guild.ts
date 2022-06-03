import {
    ApplicationCommandOptionType,
    Attachment,
    ChannelType,
    Collection,
    Guild,
    InteractionReplyOptions,
    TextChannel,
} from "discord.js";
import GuildConfig from "../../lib/guildconfig.service";
import registerCommand from "../../modules/command.register";
import { Command } from "../../types/Command";
import { CommandGroup } from "../../types/commandGroup";
import RavenInteraction from "../../types/interaction";

module.exports = class extends Command {
    constructor() {
        super({
            name: "guild",
            description: "guild options",
            group: CommandGroup.owner,

            guildOnly: false,

            args: [
                {
                    type: ApplicationCommandOptionType.Subcommand,
                    name: "list",
                    description: "See all guilds",
                },
                {
                    type: ApplicationCommandOptionType.Subcommand,
                    name: "info",
                    description: "See guild info",
                    subCommands: [
                        {
                            type: ApplicationCommandOptionType.String,
                            name: "guild_id",
                            description: "guild id",
                            required: true,
                        },
                    ],
                },
                {
                    type: ApplicationCommandOptionType.Subcommand,
                    name: "premium",
                    description: "sets guild premium state",
                    subCommands: [
                        {
                            type: ApplicationCommandOptionType.Boolean,
                            name: "state",
                            description: "premium status",
                            required: true,
                        },
                        {
                            type: ApplicationCommandOptionType.String,
                            name: "guild_id",
                            description: "guild id",
                            required: true,
                        },
                    ],
                },
                {
                    type: ApplicationCommandOptionType.Subcommand,
                    name: "leave",
                    description: "leave guild",
                    subCommands: [
                        {
                            type: ApplicationCommandOptionType.String,
                            name: "guild_id",
                            description: "guild id",
                            required: true,
                        },
                    ],
                },
                {
                    type: ApplicationCommandOptionType.Subcommand,
                    name: "ban",
                    description: "ban guild",
                    subCommands: [
                        {
                            type: ApplicationCommandOptionType.String,
                            name: "guild_id",
                            description: "guild id",
                            required: true,
                        },
                        {
                            type: ApplicationCommandOptionType.Boolean,
                            name: "state",
                            description: "ban status",
                            required: true,
                        },
                        {
                            type: ApplicationCommandOptionType.Boolean,
                            name: "leave",
                            description: "leave guild",
                            required: false,
                        },
                    ],
                },
            ],

            throttling: {
                duration: 10,
                usages: 2,
            },
        });
    }

    async execute(msg: RavenInteraction): Promise<InteractionReplyOptions> {
        const command = msg.options.getSubcommand(true);

        switch (command) {
            case "info":
                return await guildInfo(msg);
            case "list":
                return await guildList(msg);
            case "premium":
                return await guildPremium(msg);
            case "ban":
                return await guildBan(msg);
            default:
                break;
        }

        return { content: "hmm yes" };
    }
};

async function guildBan(
    msg: RavenInteraction,
): Promise<InteractionReplyOptions> {
    const guildID = msg.options.getString("guild_id", true);
    const state = msg.options.getBoolean("state", true);
    const leave = msg.options.getBoolean("leave", false);

    const client = msg.client;
    const guild = client.guilds.cache.get(guildID);
    if (!guild) return { content: "Guild not found" };

    await client.db.guilds.update({
        where: { guild_id: guild.id },
        data: { banned: state },
    });

    if (state) await msg.guild?.commands.set([]);
    else await registerCommand(client, guild);
    await GuildConfig.updateGuild(guild.id);

    let left = false;
    if (leave && state) {
        const leaveGuild = await guild.leave();
        if (leaveGuild) left = true;
    }

    return {
        content: `ban state: \`${state ? "true" : "false"}\`\nLeft: \`${
            left ? "true" : "false"
        }\`\nName: \`${guild.name}\``,
    };
}

async function guildList(
    msg: RavenInteraction,
): Promise<InteractionReplyOptions> {
    const guilds = msg.client.guilds.cache.sort(
        (x, y) => y.memberCount - x.memberCount,
    );
    const output = guilds
        .map(
            (x) =>
                `id: ${x.id} owner: ${x.ownerId} membercount: ${x.memberCount} name: ${x.name}`,
        )
        .join("\n");

    const attachment = new Attachment(Buffer.from(output), "info.txt");

    return { files: [attachment] };
}

async function guildPremium(
    msg: RavenInteraction,
): Promise<InteractionReplyOptions> {
    const guildID = msg.options.getString("guild_id", true);
    const premium = msg.options.getBoolean("state", true);
    const client = msg.client;

    const guild = client.guilds.cache.get(guildID);

    if (!guild) return { content: "Guild not found" };

    await client.db.guilds.update({
        where: { guild_id: guild.id },
        data: { premium },
    });

    await registerCommand(client, guild);
    await GuildConfig.updateGuild(guild.id);

    return { content: `${guild.name}'s premium was set to \`${premium}\`` };
}

async function guildInfo(
    msg: RavenInteraction,
): Promise<InteractionReplyOptions> {
    const guildID = msg.options.getString("guild_id");
    const client = msg.client;

    let guild = msg.guild as Guild;

    if (guildID) {
        guild = client.guilds.cache.get(guildID) || guild;
    }

    const query = await client.db.guilds.findUnique({
        where: { guild_id: guild.id },
    });

    const owner = await client.users.fetch(guild.ownerId);
    const ownerString = `Server owner:\n name: ${owner.tag}\n ID: ${owner.id}`;

    let channels = guild.channels.cache.filter((x) =>
        [ChannelType.GuildText, ChannelType.GuildVoice].includes(x.type),
    ) as Collection<string, TextChannel>;

    channels = channels.sort((x, y) => y.rawPosition - x.rawPosition);

    const channelOutput = channels
        .map(
            (x) =>
                `id: ${x.id} view: ${x.viewable} type: ${x.type} name: ${x.name}`,
        )
        .join("\n");

    const roles = guild.roles.cache.sort((x, y) => y.position - x.position);
    const roleOutput = roles
        .map((x) => `id: ${x.id} name: ${x.name}`)
        .join("\n");

    const output = [
        guild.name,
        ownerString,
        "\n",
        `premium: ${query?.premium}`,
        `level: ${query?.level}`,
        `Banned: ${query?.banned}`,
        `Dev: ${query?.dev}`,
        "\n",
        `Joined: ${query?.created}`,
        `Staff: ${query?.staff_role}`,
        "\n",
        `channels:\n${channelOutput}`,
        "\n",
        `roles:\n${roleOutput}`,
    ];

    const attachment = new Attachment(
        Buffer.from(output.join("\n")),
        "info.txt",
    );

    return { files: [attachment] };
}
