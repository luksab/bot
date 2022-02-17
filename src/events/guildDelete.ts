import { Guild, HexColorString, MessageEmbed } from "discord.js";
import RavenEvent from "../types/event";

export default class implements RavenEvent {
    name = "guildDelete";
    once = false;

    async execute(guild: Guild): Promise<void> {
        try {
            if (!guild) throw "failed to register guild";

            console.log(`Left Guild, ID: ${guild.id} Owner: ${guild.ownerId} Name: ${guild.name}`.red.bold);

            const notifEmbed = new MessageEmbed()
                .setColor(process.env.EMBED_FAIL_COLOR as HexColorString)
                .setTitle("Guild deleted")
                .setDescription(`Name: ${guild.name}\nID: ${guild.id}\nOwner: ${guild.ownerId}\nMembercount: ${guild.memberCount}`);

            await (await guild.client.users.fetch(process.env.OWNER_ID as string)).send({ embeds: [notifEmbed] }).catch(() => null);
        } catch (e) {
            console.error(e);
        }
    }
}