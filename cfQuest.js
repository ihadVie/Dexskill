const {
  ensureDailyQuests,
  updateQuestProgress,
  applyQuestRewards
} = require("../commands/cfQuestUtils");

const MAX_TICKETS = 40;

module.exports.config = {
  name: "cfQuest",
  eventType: ["log:subscribe"],
  version: "1.0.0",
  credits: "Dexwing",
  description: "Update cafe quests when users add members"
};

module.exports.run = async function ({ api, event, Currencies, Users }) {
  const authorID = event.author;
  if (!authorID) return;

  const userData = await Users.getData(authorID);
  const data = userData.data && typeof userData.data === "object" ? userData.data : {};
  if (!data.cafeGame) return;

  const cafeData = data.cafeGame;
  ensureDailyQuests(cafeData);

  const completed = updateQuestProgress(cafeData, "add_member", 1);
  const rewards = applyQuestRewards(cafeData, completed, MAX_TICKETS);

  if (rewards.length) {
    const lines = rewards.map(item => `🎯 Quest xong: ${item.label} → +${item.gained} vé`);
    api.sendMessage(lines.join("\n"), event.threadID);
  }

  userData.data = data;
  await Users.setData(authorID, userData);
};
