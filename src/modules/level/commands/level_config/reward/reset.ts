import { embedTemplate } from "@lib/embedTemplate";
import { state } from "@app";
import { SubCommand } from "@structs/command/subcommand";

export default SubCommand(

  // Info
  {
    name: "reset",
    description: "Reset all role rewards.",

    userPermissions: ["Administrator"],

    throttling: {
      duration: 60,
      usages: 3,
    },
  },

  // Execute
  async (msg) => {
    if (!msg.guildId) throw "no guild??";

    const deleted = await state.db.level_reward.deleteMany({
      where: { guild_id: msg.guildId },
    });

    const embed = embedTemplate();
    embed.setDescription(
      `Successfully removed ${deleted.count} level rewards.`,
    );

    return { embeds: [embed] };
  }
);
