import { ButtonBuilder } from "@discordjs/builders";
import { Guild, ActionRowBuilder, ButtonStyle } from "discord.js";
import { embedTemplate } from "../lib/embedTemplate";
import GuildConfig from "../lib/guildconfig.service";
import registerCommand from "../modules/command.register";
import env from "../modules/env";
import RavenEvent from "../types/event";
import RavenClient from "../types/ravenClient";

export default class implements RavenEvent {
    name = "guildCreate";
    once = false;

    async execute(guild: Guild): Promise<void> {
        try {
            if (!guild) throw "failed to register guild";
            if (GuildConfig.getGuild(guild.id)?.banned) return;

            const db = (guild.client as RavenClient).db;
            await db.guilds.createMany({
                data: { guild_id: guild.id },
                skipDuplicates: true,
            });

            console.log(
                `Joined new guild, Id: ${guild.id} Owner: ${guild.ownerId} Name: ${guild.name}`
                    .red.bold,
            );
            const channel = guild.systemChannel;

            await registerCommand(guild.client as RavenClient, guild);

            if (!channel) return;

            const embed = embedTemplate()
                .setTitle("Thank you!")
                .setDescription(
                    "Thank you for inviting me! The server owner can configure the bot with /config",
                )
                .addFields([
                    {
                        name: "How do i play music?",
                        value: `Right now the only way is to get a subscription, for more info and questions please [join the discord!](${env.SUPPORT_SERVER})`,
                    },
                ])
                .setThumbnail(
                    guild.client.user?.avatarURL() ||
                        (guild.client.user?.defaultAvatarURL as string),
                )
                .setTimestamp();

            const donateButton = new ButtonBuilder()
                .setLabel("Donation🗿")
                .setStyle(ButtonStyle.Link)
                .setURL("https://ko-fi.com/owlive");
            const discordButton = new ButtonBuilder()
                .setLabel("Discord")
                .setStyle(ButtonStyle.Link)
                .setURL("https://discord.gg/CD5xsWNbmU");

            const component = new ActionRowBuilder().setComponents([
                donateButton,
                discordButton,
            ]) as ActionRowBuilder<ButtonBuilder>;

            await channel
                .send({ embeds: [embed], components: [component] })
                .catch(() =>
                    console.log("Couldnt send message in new server."),
                );

            const notifEmbed = embedTemplate(
                `Name: ${guild.name}\nID: ${guild.id}\nOwner: ${guild.ownerId}\nMembercount: ${guild.memberCount}`,
            );
            embed.setTitle("New guild");

            const owner = await guild.client.users.fetch(env.OWNER_ID);

            owner.send({ embeds: [notifEmbed] }).catch(() => null);
        } catch (e) {
            console.error(e);
        }
    }
}
