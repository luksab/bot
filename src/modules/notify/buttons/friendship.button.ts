import { failEmbedTemplate, successEmbedTemplate } from "@lib/embedTemplate";
import { state } from "@app";
import { Button } from "@structs/button";

export default {
  name: "friend",

  async run(msg) {
    const [action, user, friend] = msg.customId.split("_");

    if (msg.user.id !== friend) return {};

    const dataExists = await state.db.friendships.findUnique({
      where: {
        user_id_friend_id: {
          user_id: user,
          friend_id: friend,
        },
      },
    });

    // Check if the friend request exists.
    if (!dataExists) {
      const embed = failEmbedTemplate(
        "Could not find this request in the database",
      );
      embed.setTitle("Invalid request");
      await msg.update({
        embeds: [embed],
        components: [],
      });
      return {};
    }

    // Check if the user accepted the request.
    if (action == "accept") {
      await state.db.friendships.update({
        where: {
          user_id_friend_id: {
            user_id: user,
            friend_id: friend,
          },
        },
        data: {
          pending: false,
        },
      });

      const embed = successEmbedTemplate(
        `Successfully accepted <@${user}>'s friend request!`,
      );
      embed.setTitle("Friend Request Accepted");
      const thumbnail = msg.message.embeds[0].thumbnail?.url;
      if (thumbnail) embed.setThumbnail(thumbnail);

      await msg.update({ components: [], embeds: [embed] });

      return {};
    }

    // Check if the user declined the request.
    if (action == "decline") {
      await state.db.friendships.delete({
        where: {
          user_id_friend_id: {
            user_id: user,
            friend_id: friend,
          },
        },
      });

      const embed = failEmbedTemplate(
        `Successfully declined <@${user}>'s friend request!`,
      );
      embed.setTitle("Friend Request declined");
      const thumbnail = msg.message.embeds[0].thumbnail?.url;
      if (thumbnail) embed.setThumbnail(thumbnail);

      await msg.update({ components: [], embeds: [embed] });

      return {};
    }

    return { embeds: [failEmbedTemplate("Invalid action")] };
  },

} as Button;
