const TIMEZONE = "Asia/Ho_Chi_Minh";
const DAILY_QUEST_COUNT = 3;

const QUEST_POOL = [
  {
    id: "chat",
    type: "message",
    label: "Nhắn %target tin nhắn",
    minTarget: 20,
    maxTarget: 60,
    minReward: 4,
    maxReward: 7
  },
  {
    id: "image",
    type: "image",
    label: "Gửi %target ảnh",
    minTarget: 1,
    maxTarget: 1,
    minReward: 4,
    maxReward: 6
  },
  {
    id: "add_member",
    type: "add_member",
    label: "Thêm %target người vào nhóm",
    minTarget: 1,
    maxTarget: 1,
    minReward: 8,
    maxReward: 12
  },
  {
    id: "sticker",
    type: "sticker",
    label: "Gửi %target sticker",
    minTarget: 1,
    maxTarget: 2,
    minReward: 3,
    maxReward: 5
  },
  {
    id: "voice",
    type: "voice",
    label: "Gửi %target voice",
    minTarget: 1,
    maxTarget: 1,
    minReward: 4,
    maxReward: 6
  },
  {
    id: "morning_tag",
    type: "morning_tag",
    label: "Tag 1 người và chúc buổi sáng vui vẻ",
    minTarget: 1,
    maxTarget: 1,
    minReward: 5,
    maxReward: 8
  }
];

function randomBetween(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getDateKey(timestamp = Date.now()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TIMEZONE }).format(new Date(timestamp));
}

function buildQuestFromTemplate(template) {
  const target = randomBetween(template.minTarget, template.maxTarget);
  const reward = randomBetween(template.minReward, template.maxReward);
  return {
    id: template.id,
    type: template.type,
    label: template.label.replace("%target", target),
    target,
    progress: 0,
    reward,
    claimed: false
  };
}

function shuffle(array) {
  return array
    .map(item => ({ value: item, sort: Math.random() }))
    .sort((a, b) => a.sort - b.sort)
    .map(item => item.value);
}

function initDailyQuests() {
  const shuffled = shuffle(QUEST_POOL);
  const quests = shuffled.slice(0, DAILY_QUEST_COUNT).map(buildQuestFromTemplate);
  return {
    dateKey: getDateKey(),
    quests,
    goldClaimed: false
  };
}

function ensureDailyQuests(cafeData) {
  if (!cafeData.dailyQuests || !Array.isArray(cafeData.dailyQuests.quests)) {
    cafeData.dailyQuests = initDailyQuests();
    return;
  }
  if (typeof cafeData.dailyQuests.goldClaimed !== "boolean") {
    cafeData.dailyQuests.goldClaimed = false;
  }
  const todayKey = getDateKey();
  if (cafeData.dailyQuests.dateKey !== todayKey) {
    cafeData.dailyQuests = initDailyQuests();
  }
}

function updateQuestProgress(cafeData, type, amount = 1) {
  ensureDailyQuests(cafeData);
  const completed = [];
  for (const quest of cafeData.dailyQuests.quests) {
    if (quest.type !== type || quest.claimed) continue;
    if (quest.progress >= quest.target) continue;
    quest.progress = Math.min(quest.target, quest.progress + amount);
    if (quest.progress >= quest.target && !quest.claimed) {
      completed.push(quest);
    }
  }
  return completed;
}

function applyQuestRewards(cafeData, completedQuests, maxTickets) {
  const rewards = [];
  for (const quest of completedQuests) {
    if (quest.claimed) continue;
    quest.claimed = true;
    const before = cafeData.tickets.count;
    cafeData.tickets.count = Math.min(maxTickets, cafeData.tickets.count + quest.reward);
    const gained = cafeData.tickets.count - before;
    rewards.push({ label: quest.label, reward: quest.reward, gained });
  }
  return rewards;
}

module.exports = {
  getDateKey,
  initDailyQuests,
  ensureDailyQuests,
  updateQuestProgress,
  applyQuestRewards
};
