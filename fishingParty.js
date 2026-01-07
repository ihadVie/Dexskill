const fs = require("fs");

module.exports.config = {
  name: "party",
  version: "1.0.0",
  hasPermssion: 0,
  credits: "Vanloi",
  description: "Tổ đội câu cá",
  commandCategory: "Trò Chơi",
  usages: "party create/info/leave/disband @tag1 @tag2 ...",
  cooldowns: 3
};

// Khởi tạo global nếu chưa có
if (!global.fishingParty) global.fishingParty = {};

const MAX_MEMBERS = 6;
const INACTIVITY_LIMIT = 5 * 60 * 1000; // 5 phút

module.exports.run = async function({ api, event, args, Users }) {
  const { threadID, senderID, mentions } = event;
  const send = msg => api.sendMessage(msg, threadID);

  const subcommand = args[0]?.toLowerCase();
  if (!subcommand) return send("⚠️ Hãy nhập lệnh con: create/info/leave/disband");

  switch (subcommand) {

    // =====================================
    // TẠO PARTY
    // =====================================
    case "create": {
      if (global.fishingParty[threadID]) return send("⚠️ Đã có party trong thread này!");

      const tagged = Object.keys(mentions || {});
      if (!tagged.length) return send("⚠️ Hãy tag ít nhất 1 người để tạo party!");
      if (tagged.length > MAX_MEMBERS - 1) return send(`⚠️ Tối đa ${MAX_MEMBERS - 1} người cùng bạn trong party!`);

      // Thêm người tạo vào
      const members = [senderID, ...tagged];

      global.fishingParty[threadID] = {
        members,
        bonus: members.length * 0.05, // 5% mỗi người
        lastActive: Date.now()
      };

      const names = await Promise.all(members.map(async uid => (await Users.getData(uid)).name));
      return send(`🎉 Party được tạo thành công!\nThành viên: ${names.join(", ")}\nBonus hiếm: ${(global.fishingParty[threadID].bonus*100).toFixed(0)}%`);
    }

    // =====================================
    // XEM INFO PARTY
    // =====================================
    case "info": {
      const party = global.fishingParty[threadID];
      if (!party) return send("⚠️ Thread này chưa có party.");

      const names = await Promise.all(party.members.map(async uid => (await Users.getData(uid)).name));
      return send(`📋 Thông tin party:\nThành viên: ${names.join(", ")}\nBonus hiếm: ${(party.bonus*100).toFixed(0)}%\nLast active: ${Math.floor((Date.now()-party.lastActive)/1000)} giây trước`);
    }

    // =====================================
    // RỜI PARTY
    // =====================================
    case "leave": {
      const party = global.fishingParty[threadID];
      if (!party || !party.members.includes(senderID)) return send("⚠️ Bạn không có trong party này.");

      party.members = party.members.filter(uid => uid != senderID);
      party.bonus = party.members.length * 0.05;
      if (!party.members.length) delete global.fishingParty[threadID];

      return send("✅ Bạn đã rời party!");
    }

    // =====================================
    // GIẢI TÁN PARTY
    // =====================================
    case "disband": {
      const party = global.fishingParty[threadID];
      if (!party) return send("⚠️ Thread này chưa có party.");
      if (!party.members.includes(senderID)) return send("⚠️ Chỉ thành viên trong party mới có thể giải tán!");

      delete global.fishingParty[threadID];
      return send("⚠️ Party đã được giải tán!");
    }

    default:
      return send("⚠️ Lệnh không hợp lệ. Sử dụng: create/info/leave/disband");
  }
};

// =====================================
// AUTO-KICK người không hoạt động 5 phút
// =====================================
setInterval(async () => {
  const now = Date.now();
  for (const threadID in global.fishingParty) {
    const party = global.fishingParty[threadID];
    const toKick = party.members.filter(uid => now - party.lastActive > INACTIVITY_LIMIT);
    if (toKick.length) {
      party.members = party.members.filter(uid => !toKick.includes(uid));
      party.bonus = party.members.length * 0.05;
      try {
        const names = toKick.map(uid => uid); // tên có thể lấy nếu cần Users
        console.log(`⚠️ Đã kick ${toKick.length} người khỏi party ${threadID}`);
      } catch (e) {}
      if (!party.members.length) delete global.fishingParty[threadID];
    }
  }
}, 60 * 1000); // kiểm tra mỗi phút
