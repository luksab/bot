import { EmbedBuilder, HexColorString } from "discord.js";
import { Command, returnMessage } from "../../../types/Command";
import RavenInteraction from "../../../types/interaction";

module.exports = class extends Command {
    constructor() {
        super({
            name: "sync",
            description: "Fetch birthday from other server.",

            throttling: {
                duration: 60,
                usages: 3,
            },
        });
    }

    async execute(msg: RavenInteraction): Promise<returnMessage> {
        if (!msg.guildId) throw "No guildID???";

        const client = msg.client;
        const embed = new EmbedBuilder();
        embed.setColor(process.env.EMBED_COLOR as HexColorString);

        const query = await client.db.birthdays.findFirst({
            where: {
                user_id: msg.user.id,
                NOT: { birthday: null },
            },
        });

        if (!query) {
            const response = embed.setDescription(
                "You dont have a birthday registered anywhere else.",
            );
            return { embeds: [response] };
        }

        const result = await client.db.birthdays
            .create({
                data: {
                    user_id: query.user_id,
                    guild_id: msg.guildId,
                    birthday: query.birthday,
                },
            })
            .catch(() => null);

        if (!result) {
            const response = embed.setDescription(
                "You already have a birthday registered here",
            );
            return { embeds: [response] };
        }

        return {
            embeds: [embed.setDescription("birthday has been transferred!")],
        };
    }
};
