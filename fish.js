const fs = require("fs");
const path = require("path");

module.exports.config = {
    name: "fish",
    version: "1.5.3",
    hasPermssion: 0,
    credits: "Vanloi",
    description: "Các lệnh liên quan đến cá: level, shop, mồi, mảnh, PVP",
    commandCategory: "Trò Chơi",
    usages: "fish <level/shop/buy/bait/shard/pvp/acp>",
    cooldowns: 5
};

// Shop mồi câu
const baitShop = {
    datxet: { name: "Mồi Đất xét", price: 50000000, bonus: 0.05, fail: 0.10, displayPrice: "50m" },
    de: { name: "Mồi Dế", price: 100000000, bonus: 0.10, fail: 0.15, displayPrice: "100m" },
    giun: { name: "Mồi Giun", price: 200000000, bonus: 0.20, fail: 0.25, displayPrice: "200m" }
};

// Skin cá theo số lần câu
const fishSkins = [
    { count: 200, name: "Skin Thường", emoji: "🐟" },
    { count: 500, name: "Skin Lửa Tuyệt Luân", emoji: "🔥🐟" },
    { count: 1500, name: "Skin Băng Hàng", emoji: "❄️🐟" },
    { count: 4000, name: "Skin Rồng", emoji: "🐉🐟" }
];

// ============================
// GLOBAL PVP STATE
// ============================
if (!global.fishPVP) global.fishPVP = {}; 
// Cấu trúc:
// global.fishPVP[threadID] = {
//    fromID: "id người khởi tạo",
//    toID: "id người được tag",
//    bet: 50000,
//    fishResult: {from: null, to: null},
//    timeout: timestamp
// }

// ============================
// TÍNH LEVEL THEO EXP
// ============================
function calculateLevel(exp) {
    let level = 1;
    let expRequired = 100;
    while (exp >= expRequired) {
        level++;
        expRequired += 400;
    }
    return level;
}

// ============================
// MAIN FUNCTION
// ============================
module.exports.run = async function({ api, event, args, Users, Currencies }) {
    const { senderID, threadID, mentions } = event;
    const send = (msg) => api.sendMessage(msg, threadID);

    // Lấy data người chơi
    let user = await Users.getData(senderID);
    if (!user.data) user.data = {};
    if (!user.data.fishExp) user.data.fishExp = 0;
    if (!user.data.fishLevel) user.data.fishLevel = calculateLevel(user.data.fishExp);
    if (!user.data.bait) user.data.bait = null;
    if (!user.data.shards) user.data.shards = { infinity:0, everlasting:0, supreme:0, origin:0 };
    if (!user.data.fishCount) user.data.fishCount = 0;
    if (!user.data.fishSkin) user.data.fishSkin = "Không có";

    // Cập nhật skin theo số cá đã câu
    for (let skin of fishSkins.reverse()) {
        if (user.data.fishCount >= skin.count) {
            user.data.fishSkin = `${skin.emoji} ${skin.name}`;
            break;
        }
    }

    const sub = args[0]?.toLowerCase();

    // ===== LEVEL =====
    if (sub === "level") {
        user.data.fishLevel = calculateLevel(user.data.fishExp);
        const need = 100 + (user.data.fishLevel - 1) * 400;
        await Users.setData(senderID, user);
        return send(`📘 Level câu cá
• Level: ${user.data.fishLevel}
• EXP: ${user.data.fishExp}/${need}
• Bonus hiếm: +${user.data.fishLevel}%`);
    }

    // ===== SHOP =====
    if (sub === "shop") {
        return send(`🎣 SHOP MỒI CÂU
1. 🪱 Mồi Đất xét – ${baitShop.datxet.displayPrice}
2. 💠 Mồi Dế – ${baitShop.de.displayPrice}
3. 🔷 Mồi Giun – ${baitShop.giun.displayPrice}
Dùng: fish buy <datxet/de/giun>`);
    }

    // ===== BUY =====
    if (sub === "buy") {
        const type = args[1];
        if (!type || !baitShop[type]) return send("⚠️ Loại mồi không hợp lệ.");
        let money = (await Currencies.getData(senderID)).money;
        if (money < baitShop[type].price) return send("💸 Bạn không đủ tiền.");
        await Currencies.decreaseMoney(senderID, baitShop[type].price);
        user.data.bait = baitShop[type];
        await Users.setData(senderID, user);
        return send(`🪱 Bạn đã mua & trang bị mồi ${baitShop[type].name}!`);
    }

    // ===== BAIT =====
    if (sub === "bait") {
        const type = args[1];
        if (!type || !baitShop[type]) return send("⚠️ Dùng: fish bait <datxet/de/giun>");
        user.data.bait = baitShop[type];
        await Users.setData(senderID, user);
        return send(`🪱 Bạn đã trang bị mồi ${baitShop[type].name} cho lần câu kế tiếp!`);
    }

    // ===== SHARD =====
    if (sub === "shard") {
        return send(`🔮 Túi Mảnh Vô Hạn:
- 🟪 ${user.data.shards.infinity} × Mảnh Vô Cực
- 🟦 ${user.data.shards.everlasting} × Mảnh Hằng Cửu
- 🟫 ${user.data.shards.supreme} × Mảnh Tuyệt Luân
- 🟥 ${user.data.shards.origin} × Mảnh Khởi Nguyên`);
    }

    // ===== PVP KHỞI TẠO =====
    if (sub === "pvp") {
        if (!mentions || Object.keys(mentions).length === 0)
            return send("⚠️ Tag người muốn PVP và số tiền\nVí dụ: fish pvp 50000 @tag");

        const bet = parseInt(args[1]);
        if (isNaN(bet) || bet <= 0) return send("⚠️ Số tiền cược không hợp lệ");

        const opponentID = Object.keys(mentions)[0];
        if (opponentID === senderID)
            return send("⚠️ Bạn không thể PVP với chính mình");

        const moneyA = (await Currencies.getData(senderID)).money;
        const moneyB = (await Currencies.getData(opponentID)).money;
        if (moneyA < bet) return send("💸 Bạn không đủ tiền");
        if (moneyB < bet) return send("💸 Đối thủ không đủ tiền");

        global.fishPVP[threadID] = {
            fromID: senderID,
            toID: opponentID,
            bet,
            fishResult: { from: null, to: null },
            timeout: Date.now() + 2 * 60 * 1000
        };

        const opponentName = mentions[opponentID];
        return send(`⚔️ ${opponentName} được mời PVP ${bet}$. Người được tag reply \`acp\` để chấp nhận và bắt đầu câu cá bằng lệnh \`cauca\`. Nếu không reply trong 2 phút, trận hòa.`);
    }

    // ===== PVP REPLY (acp) =====
    if (sub === "acp") {
        const pvp = global.fishPVP[threadID];
        if (!pvp) return send("⚠️ Không có trận PVP nào đang chờ bạn.");

        if (senderID !== pvp.toID)
            return send("⚠️ Bạn không phải người được mời PVP.");

        if (Date.now() > pvp.timeout) {
            delete global.fishPVP[threadID];
            return send("⏱ Trận PVP đã hết thời gian, hòa, không ai mất tiền.");
        }

        const fromName = (await Users.getData(pvp.fromID)).name;
        const toName = (await Users.getData(pvp.toID)).name;

        return send(`🎣⚔️ Trận PVP giữa ${fromName} và ${toName} đã được chấp nhận!
Mỗi người chỉ được câu 1 lần bằng lệnh \`cauca\`. Bonus level, mồi, EXP, slot kho cá vẫn áp dụng.
Người thắng sẽ nhận ${pvp.bet}$ từ đối thủ. Hãy bắt đầu câu cá!`);
    }

    return send("⚠️ Lệnh fish không hợp lệ.");
};
