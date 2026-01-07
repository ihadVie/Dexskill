// modules/nhacdau.js
const fs = require("fs");
const path = require("path");
const schedule = require("node-schedule");
const moment = require("moment-timezone");

const dataDir = path.join(__dirname, "data");
const dataFilePath = path.join(dataDir, "nhacdau.json");

if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir);

function loadData() {
    if (fs.existsSync(dataFilePath)) {
        try { return JSON.parse(fs.readFileSync(dataFilePath, "utf8")); } 
        catch (e) { return {}; }
    } else return {};
}

function saveData(data) {
    fs.writeFileSync(dataFilePath, JSON.stringify(data, null, 4));
}

function generateMatchID(data) {
    let lastIndex = Object.keys(data).length + 1;
    return `TRD${lastIndex.toString().padStart(3, '0')}`;
}

module.exports.config = {
    name: "ff", // đổi tên lệnh nếu muốn
    version: "2.3.0",
    hasPermssion: 3,
    credits: "Vanloi",
    description: "Quản lý nhắc nhở phòng/trận đấu, đăng ký, hủy, xem danh sách",
    commandCategory: "Hệ Thống",
    usages: "<giờ:phút> <tên phòng> [số người tối đa] | danh_sach | huy <ID> | xem <ID>",
    cooldowns: 5
};

module.exports.run = async function({ api, event, args }) {
    const data = loadData();
    if (args.length === 0) return api.sendMessage("Vui lòng nhập lệnh hợp lệ.", event.threadID);

    const subCommand = args[0].toLowerCase();

    // --- DANH SÁCH PHÒNG HÔM NAY ---
    if (subCommand === "danh_sach") {
        const today = moment().tz("Asia/Ho_Chi_Minh").format("YYYY-MM-DD");
        let listText = "📋 Danh sách phòng hôm nay:\n";
        let hasMatch = false;

        for (let id in data) {
            const match = data[id];
            if (match.date === today) {
                hasMatch = true;
                listText += `\nID: ${id}\nTên phòng: ${match.matchName}\nThời gian: ${match.time}\nĐã đăng ký: ${match.registered.length}/${match.maxPlayers}`;
            }
        }

        if (!hasMatch) listText = "Hôm nay chưa có phòng nào!";
        return api.sendMessage(listText, event.threadID);
    }

    // --- HỦY ĐĂNG KÝ ---
    if (subCommand === "huy" && args[1]) {
        const matchID = args[1].toUpperCase();
        if (data[matchID]) {
            const idx = data[matchID].registered.indexOf(event.senderID);
            if (idx > -1) {
                data[matchID].registered.splice(idx, 1);
                saveData(data);
                return api.sendMessage(`✅ Bạn đã hủy đăng ký phòng "${data[matchID].matchName}"`, event.threadID);
            } else {
                return api.sendMessage("❌ Bạn chưa đăng ký phòng này.", event.threadID);
            }
        } else {
            return api.sendMessage("❌ Không tìm thấy phòng với ID này.", event.threadID);
        }
    }

    // --- XEM NGƯỜI ĐĂNG KÝ THEO ID PHÒNG ---
    if (subCommand === "xem" && args[1]) {
        const matchID = args[1].toUpperCase();
        if (data[matchID]) {
            const match = data[matchID];
            if (match.registered.length === 0) {
                return api.sendMessage(`Chưa có ai đăng ký phòng "${match.matchName}"`, event.threadID);
            }
            const mentions = match.registered.map(uid => ({ tag: "", id: uid }));
            const mentionText = match.registered.map(uid => `@${uid}`).join("\n");
            return api.sendMessage(`📋 Danh sách người đăng ký phòng "${match.matchName}":\n${mentionText}`, event.threadID, { mentions });
        } else {
            return api.sendMessage("❌ Không tìm thấy phòng với ID này.", event.threadID);
        }
    }

    // --- TẠO PHÒNG MỚI ---
    if (args.length >= 2) {
        const time = args[0];

        // Lấy số cuối cùng nếu là số → maxPlayers, còn lại là tên phòng
        let maxPlayers = 10;
        let matchName = args.slice(1).join(" ");
        const lastArg = args[args.length - 1];
        if (!isNaN(parseInt(lastArg))) {
            maxPlayers = parseInt(lastArg);
            matchName = args.slice(1, -1).join(" ");
        }

        if (!/^\d{1,2}:\d{2}$/.test(time)) return api.sendMessage("Giờ không hợp lệ. Định dạng HH:MM", event.threadID);
        if (isNaN(maxPlayers) || maxPlayers < 1) return api.sendMessage("Số người tối đa không hợp lệ", event.threadID);

        const [hour, minute] = time.split(":").map(Number);
        const matchID = generateMatchID(data);

        // Gửi tin nhắn nhắc nhở và lấy messageID
        const text = `🏆 Sắp có Phòng: ${matchName}\n⏰ Lúc: ${time}\nReply tin nhắn này để đăng ký!\nSố người tối đa: ${maxPlayers}\nID phòng: ${matchID}`;
        const sentMsg = await api.sendMessage(text, event.threadID);

        // Lưu dữ liệu phòng, kèm messageID
        data[matchID] = {
            threadID: event.threadID,
            time,
            matchName,
            maxPlayers,
            registered: [],
            date: moment().tz("Asia/Ho_Chi_Minh").format("YYYY-MM-DD"),
            messageID: sentMsg.messageID
        };
        saveData(data);

        // Lịch hẹn bắt đầu
        schedule.scheduleJob({ hour, minute }, () => {
            const allData = loadData();
            if (allData[matchID]) {
                const registeredUsers = allData[matchID].registered;
                if (registeredUsers.length === 0) return;

                const mentions = registeredUsers.map(uid => ({ tag: "", id: uid }));
                const mentionText = registeredUsers.map(uid => `@${uid}`).join(" ");
                api.sendMessage(`⚔️ Phòng ${matchName} bắt đầu!\nTham gia: ${mentionText}`, event.threadID, { mentions });

                delete allData[matchID];
                saveData(allData);
            }
        });

        return api.sendMessage(`✅ Phòng "${matchName}" đã được tạo với ID: ${matchID}`, event.threadID);
    }

    return api.sendMessage("Lệnh không hợp lệ.", event.threadID);
};

// --- Khi người dùng reply để đăng ký ---
module.exports.handleReply = async function({ api, event }) {
    if (!event.messageReply) return;

    const data = loadData();
    const repliedMessageID = event.messageReply.messageID;
    const senderID = event.senderID;

    // Tìm match theo messageID
    const matchID = Object.keys(data).find(id => data[id].messageID === repliedMessageID);
    if (!matchID) return;

    const match = data[matchID];
    if (match.registered.includes(senderID)) return; // đã đăng ký
    if (match.registered.length >= match.maxPlayers) {
        return api.sendMessage("❌ Đã đủ người tham gia phòng", event.threadID);
    }

    match.registered.push(senderID);
    saveData(data);
    return api.sendMessage(`✅ Bạn đã đăng ký tham gia phòng "${match.matchName}"`, event.threadID);
};
