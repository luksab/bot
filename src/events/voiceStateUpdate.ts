import { VoiceState } from "discord.js";
import bannedUsers from "../lib/banlist.service";
import GuildConfig from "../lib/guildconfig.service";
import VCService from "../lib/privateVC.service";
import RavenEvent from "../types/event";

export default class ready implements RavenEvent {
    name = "voiceStateUpdate";
    once = false;

    async execute(oldState: VoiceState, newState: VoiceState): Promise<void> {
        if (GuildConfig.getGuild(newState.guild.id)?.banned) return;
        if (!newState.member || bannedUsers.isBanned(newState.member.id))
            return;

        await VCService.onChange(oldState, newState).catch((x) =>
            console.error(x),
        );
    }
}
