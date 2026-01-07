const fs = require("fs");
const path = require("path");

module.exports.config = {
    name: "whitelistcmd",
    version: "1.0.0",
    hasPermssion: 1,
    credits: "Vanloi",
    description: "",
    commandCategory: "system",
    usages: "whitelistcmd [add/remove/list/clear] <lệnh>",
    cooldowns: 1
};

module.exports.run = async ({ api, event, args }) => {
    const { threadID, messageID, senderID } = event;
    const filePath = path.join(__dirname, "../../includes/handle/groupWhitelist.json");

    if (!fs.existsSync(filePath)) fs.writeFileSync(filePath, JSON.stringify({}, null, 4));
    let data = JSON.parse(fs.readFileSync(filePath));

    if (!data[threadID]) data[threadID] = { allowed: [] };

    const sub = args[0];
    const cmd = args[1];

    // only admins/NDH/ADMINBOT allowed to manage — bot permission system will check hasPermssion:1, but add extra safety:
    if (!global.config || (!global.config.ADMINBOT && !global.config.NDH)) {
        // no-op (keep default)
    }

    switch (sub) {
        case "add":
            if (!cmd) return api.sendMessage("❗ Bạn phải nhập tên lệnh để thêm.\nVí dụ: whitelistcmd add pay", threadID, messageID);
            if (!data[threadID].allowed.includes(cmd)) data[threadID].allowed.push(cmd);
            fs.writeFileSync(filePath, JSON.stringify(data, null, 4));
            return api.sendMessage(`✅ Đã thêm lệnh "${cmd}" vào whitelist của group này.`, threadID, messageID);

        case "remove":
            if (!cmd) return api.sendMessage("❗ Bạn phải nhập tên lệnh để xoá.\nVí dụ: whitelistcmd remove pay", threadID, messageID);
            data[threadID].allowed = data[threadID].allowed.filter(e => e !== cmd);
            fs.writeFileSync(filePath, JSON.stringify(data, null, 4));
            return api.sendMessage(`❌ Đã xoá lệnh "${cmd}" khỏi whitelist.`, threadID, messageID);

        case "list":
            const list = data[threadID].allowed;
            if (list.length === 0) return api.sendMessage("📌 Group này hiện không whitelist lệnh nào (mọi lệnh được dùng).", threadID, messageID);
            return api.sendMessage("📜 Whitelist của group:\n• " + list.join("\n• "), threadID, messageID);

        case "clear":
            data[threadID].allowed = [];
            fs.writeFileSync(filePath, JSON.stringify(data, null, 4));
            return api.sendMessage("🗑 Đã xoá toàn bộ whitelist. Group này có thể dùng mọi lệnh.", threadID, messageID);

        default:
            return api.sendMessage(
                "⚙️ Cách dùng whitelistcmd:\n" +
                "• whitelistcmd add <lệnh>\n" +
                "• whitelistcmd remove <lệnh>\n" +
                "• whitelistcmd list\n" +
                "• whitelistcmd clear",
                threadID, messageID
            );
    }
};
