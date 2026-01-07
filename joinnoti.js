module.exports.config = {
  name: "joinNoti",
  eventType: ["log:subscribe"],
  version: "1.0.1",
  credits: "Vanloi",
  description: "thông báo"
};

module.exports.run = async function({ api, event, Users }) {
  const { threadID, logMessageData } = event;
  const pathData = require("path").join(__dirname, "../commands/data/joinNoti.json");
  const { readFileSync } = require("fs-extra");
  const moment = require("moment-timezone");

  const MAX_MENTIONS = 5;
  const MAX_SHOW_NAMES = 8;

  const addedParticipants = logMessageData?.addedParticipants || [];
  if (!addedParticipants.length) return;

  const botID = api.getCurrentUserID();
  const botAdded = addedParticipants.some(p => p.userFbId == botID);

  if (botAdded) {
      await api.changeNickname(
          `[ ${global.config.PREFIX} ] • ${global.config.BOTNAME || "Bot"}`,
          threadID,
          botID
      );
      return api.sendMessage(`[𝐊𝐞̂́𝐭 𝐍𝐨̂́𝐢 𝐓𝐡𝐚̀𝐧𝐡 𝐂𝐨̂𝐧𝐠]`, threadID);
  }

  let dataJson = [];
  try {
      dataJson = JSON.parse(readFileSync(pathData, "utf-8"));
  } catch {
      dataJson = [];
  }

  const thisThread = dataJson.find(i => i.threadID == threadID) || { message: null, enable: true };
  if (!thisThread.enable) return;

  const defaultTemplates = [
      "{emj} Chào mừng {name} đến {threadName}\n👥 Thành viên #{soThanhVien} 💝",
      "{emj} Welcome {name}!\n🏡 {threadName} • 👥 #{soThanhVien}",
      "{emj} {name} đã vào nhóm!\n👥 Member #{soThanhVien} • Chúc vui vẻ 💕",
      "{emj} Xin chào {name}\n🎉 {threadName} • 👥 #{soThanhVien}"
  ];
  const msgTemplate = thisThread.message || defaultTemplates[Math.floor(Math.random() * defaultTemplates.length)];

  const nameArray = [];
  const mentions = [];

  for (const p of addedParticipants) {
      if (p.userFbId == botID) continue;
      const userName = p.fullName || "Người dùng mới";
      nameArray.push(userName);
      if (mentions.length < MAX_MENTIONS) {
          mentions.push({ tag: userName, id: p.userFbId });
      }

      if (!global.data.allUserID.includes(p.userFbId)) {
          await Users.createData(p.userFbId, { name: userName, data: {} });
          global.data.userName.set(p.userFbId, userName);
          global.data.allUserID.push(p.userFbId);
      }
  }

  if (nameArray.length == 0) return;

  const threadInfo = await api.getThreadInfo(threadID);
  let authorName = "link join";
  try {
      const authorData = await Users.getData(event.author);
      authorName = authorData?.name || authorName;
  } catch (error) {
      authorName = "link join";
  }

  const time = moment.tz("Asia/Ho_Chi_Minh");
  const gio = parseInt(time.format("HH"));
  const bok = time.format("DD/MM/YYYY");

  let buoi = "𝐁𝐮𝐨̂̉𝐢 𝐒𝐚́𝐧𝐠";
  if (gio >= 11) buoi = "𝐁𝐮𝐨̂̉𝐢 𝐓𝐫𝐮̛𝐚";
  if (gio >= 14) buoi = "𝐁𝐮𝐨̂̉𝐢 𝐂𝐡𝐢Ề𝐮";
  if (gio >= 19) buoi = "𝐁𝐮𝐨̂̉𝐢 𝐓𝐨̂́𝐢";

  const emojiByTime = () => {
      if (gio <= 10) return ["☀️", "🌤️", "🌞", "🍀", "🌼"];
      if (gio <= 13) return ["🌤️", "🍱", "🥤", "😋", "🌻"];
      if (gio <= 18) return ["🌇", "🍃", "✨", "🧡", "🏙️"];
      return ["🌙", "⭐", "🌌", "💫", "🫶"];
  };
  const emojiList = emojiByTime();
  const emj = emojiList[Math.floor(Math.random() * emojiList.length)];

  const addedCount = nameArray.length;
  const extraCount = Math.max(0, addedCount - MAX_SHOW_NAMES);
  const displayNames = extraCount > 0
      ? `${nameArray.slice(0, MAX_SHOW_NAMES).join(", ")} … (+${extraCount})`
      : nameArray.join(", ");

  const compactMessage = "{emj} Chào mừng {count} thành viên mới đến {threadName}\n👥 Hiện tại: {soThanhVien} thành viên 💝";
  const finalTemplate = addedCount > MAX_MENTIONS ? compactMessage : msgTemplate;
  const finalMentions = addedCount > MAX_MENTIONS ? [] : mentions;

  const msg = finalTemplate
      .replace(/\{name}/g, displayNames)
      .replace(/\{type}/g, addedCount > 1 ? "𝐜𝐚́𝐜 𝐛𝐚̣𝐧" : "𝐛𝐚̣𝐧")
      .replace(/\{soThanhVien}/g, threadInfo.participantIDs.length)
      .replace(/\{threadName}/g, threadInfo.threadName || "Nhóm chat")
      .replace(/\{author}/g, authorName)
      .replace(/\{get}/g, buoi)
      .replace(/\{bok}/g, bok)
      .replace(/\{emj}/g, emj)
      .replace(/\{count}/g, addedCount);

  return api.sendMessage({ body: msg, mentions: finalMentions }, threadID);
};
