import { MessageEmbed, HexColorString } from "discord.js";
import { returnMessage } from "../../../../types/Command";
import RavenInteraction from "../../../../types/interaction";
import GuildConfig from "../../../../lib/guildconfig.service";

export default async function configVoiceToggle(msg: RavenInteraction): Promise<returnMessage> {
    if (!msg.guildId) throw "No guildID???";

    let channelID = null;
    const config = await msg.client.db.guilds.findUnique({ where: { guild_id: msg.guildId as string } });
    if (!config) throw "No guild??";

    if (config.vc_channel_id) {
        const channel = msg.guild?.channels.cache.get(config.vc_channel_id);
        if (channel) await channel.delete().catch(null);
    } else {
        const channel = await msg.guild?.channels.create("Create private room", {
            type: 2,
            permissionOverwrites: [{
                id: msg.guildId as string,
                allow: ["CONNECT"],
                deny: ["SPEAK"],
            }],
        });

        if (!channel) throw "Couldnt make vc";
        channelID = channel.id;
    }

    const query = await msg.client.db.guilds.update({ where: { guild_id: msg.guildId as string }, data: { vc_channel_id: channelID } });
    GuildConfig.updateGuild(query);

    const embed = new MessageEmbed()
        .setDescription(`${channelID ? `Enabled private vcs <#${channelID}>` : "Removed private vcs"}`)
        .setColor(process.env.EMBED_COLOR as HexColorString);

    return { embeds: [embed] };
}