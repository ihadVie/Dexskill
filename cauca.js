const fs = require("fs");
const path = require("path");

module.exports.config = {
    name: "cauca",
    version: "4.4.0",
    hasPermssion: 0,
    credits: "Vanloi",
    description: "Câu cá đi bro",
    commandCategory: "Trò Chơi",
    usages: "cauca",
    cooldowns: 20
};

// ==========================
// LOAD DỮ LIỆU CÁ
// ==========================
const fishData = JSON.parse(fs.readFileSync(path.join(__dirname, "fishdata.json")));

const cooldownTime = 20 * 1000; // 20 giây
const BASE_MAX_SLOT = 20;

// CẦN CÂU
const canCauList = {
    "rẻ": { name: "Cần câu rẻ", rate: 0.2 },
    "trung": { name: "Cần câu trung bình", rate: 0.4 },
    "mắc": { name: "Cần câu mắc", rate: 0.7 },
    "xịn": { name: "Cần câu xịn", rate: 0.7 },
    "thần": { name: "Cần câu thần", rate: 0.8 },
    "siêu": { name: "Cần câu siêu cấp", rate: 0.9 },
    "vinhcuu": { name: "Cần câu Vĩnh Cửu", rate: 0.9 },
    "vohan": { name: "Cần câu Vô Hạn", rate: 1.0 }
};

// MẢNH VÔ HẠN
const shardList = [
    { key: "infinity", name: "Mảnh Vô Cực", rate: 0.001 },
    { key: "everlasting", name: "Mảnh Hằng Cửu", rate: 0.002 },
    { key: "supreme", name: "Mảnh Tuyệt Luân", rate: 0.003 },
    { key: "origin", name: "Mảnh Khởi Nguyên", rate: 0.004 }
];

// SKIN CÁ
const fishSkins = [
    { count: 200, name: "Skin Thường" },
    { count: 500, name: "Skin Lửa Tuyệt Luân" },
    { count: 1500, name: "Skin Băng Hàng" },
    { count: 4000, name: "Skin Rồng" }
];

// ==========================
// EXP THEO RARITY
// ==========================
const expByRarity = {
    common: 1,
    uncommon: 3,
    rare: 5,
    epic: 15,
    legendary: 40,
    mythical: 60,
    divine: 70,
    secret: 100
};

// ==========================
// RANDOM CÁ
// ==========================
function randomFish(canType, bonus = 0) {
    const rate = canCauList[canType].rate + bonus;
    const r = Math.random();

    let pool;
    if (r < rate) {
        pool = fishData.filter(f => ["rare","epic","legendary","mythical","divine","secret"].includes(f.rarity));
    } else {
        pool = fishData.filter(f => ["common","uncommon"].includes(f.rarity));
    }

    let total = pool.reduce((a,b)=>a+b.chance,0);
    let rand = Math.random()*total;
    for (let f of pool) {
        if (rand < f.chance) return f;
        rand -= f.chance;
    }
    return pool[Math.floor(Math.random()*pool.length)];
}

// ==========================
// RANDOM MẢNH
// ==========================
function randomShard() {
    const r = Math.random();
    let acc = 0;
    for (let s of shardList) {
        acc += s.rate;
        if (r < acc) return s;
    }
    return null;
}

// ==========================
// TÍNH LEVEL THEO EXP
// ==========================
function calculateLevel(exp) {
    let level = 1;
    let expRequired = 100;
    while (exp >= expRequired) {
        level++;
        expRequired += 400;
    }
    return level;
}

// ==========================
// TÍNH MAX SLOT
// ==========================
function calcMaxSlot(level, equip) {
    let max = BASE_MAX_SLOT;
    if (level >= 15) max += 5;
    if (level >= 20) max += 5;
    if (level > 20) max += Math.floor((level - 20)/5)*5;
    if (equip === "vohan") max += 5;
    return max;
}

// ==========================
// MAIN FUNCTION
// ==========================
module.exports.run = async function({ api, event, Users, Currencies }) {
    const { senderID, threadID } = event;
    const send = (msg, mentions=[]) => api.sendMessage({ body: msg, mentions }, threadID);

    let user = await Users.getData(senderID);
    if (!user.data) user.data = {};
    if (!user.data.fishInventory) user.data.fishInventory = [];
    if (!user.data.canCau) user.data.canCau = { owned: ["rẻ"], equip: "rẻ" };
    if (!user.data.shards) user.data.shards = { infinity:0, everlasting:0, supreme:0, origin:0 };
    if (!user.data.fishExp) user.data.fishExp = 0;
    if (!user.data.fishLevel) user.data.fishLevel = 1;
    if (!user.data.fishCooldown) user.data.fishCooldown = 0;
    if (!user.data.fishCount) user.data.fishCount = 0;
    if (!user.data.fishHistory) user.data.fishHistory = [];
    if (!user.data.fishSkin) user.data.fishSkin = "Không có";
    if (!user.data.bait) user.data.bait = null;

    // KIỂM TRA COOLDOWN
    if (user.data.fishCooldown && user.data.fishCooldown > Date.now()) {
        let remain = Math.floor((user.data.fishCooldown - Date.now())/1000);
        return send(`⏳ Hãy đợi ${remain}s trước khi câu tiếp.`);
    }

    const equip = user.data.canCau.equip;
    if (!canCauList[equip]) return send("⚠️ Chưa trang bị cần câu hợp lệ");

    const MAX_SLOT = calcMaxSlot(user.data.fishLevel, equip);
    if (user.data.fishInventory.length >= MAX_SLOT)
        return send(`⚠️ Kho cá đầy (${MAX_SLOT})`);

    // Kiểm tra nếu người chơi đang PVP
    const pvp = global.fishPVP?.[threadID];
    if (pvp && (senderID === pvp.fromID || senderID === pvp.toID)) {
        if (!pvp.fishResult) pvp.fishResult = {};
        if (senderID === pvp.fromID && !pvp.fishResult.from) pvp.fishResult.from = true;
        if (senderID === pvp.toID && !pvp.fishResult.to) pvp.fishResult.to = true;
    }

    // BONUS TỪ BAIT
    let bonus = 0, baitFail = 0;
    if (user.data.bait) {
        bonus += user.data.bait.bonus;
        baitFail = user.data.bait.fail;
    }
    if (baitFail > 0 && Math.random() < baitFail) {
        user.data.bait = null;
        await Users.setData(senderID, user);
        return send(`❌ Bị trượt câu! Mồi đã mất.`);
    }

    // Câu cá
    send(`🎣 ${user.name || "Bạn"} đang câu bằng ${canCauList[equip].name}...`);
    await new Promise(res => setTimeout(res,3000));

    const fish = randomFish(equip, bonus);
    user.data.fishInventory.push(fish);
    user.data.fishHistory.push(fish);

    // Tăng EXP theo rarity
    const gainedExp = expByRarity[fish.rarity] || 1;
    user.data.fishExp += gainedExp;

    const oldLevel = user.data.fishLevel;
    user.data.fishLevel = calculateLevel(user.data.fishExp);
    user.data.fishCount += 1;
    user.data.fishCooldown = Date.now() + cooldownTime;
    user.data.bait = null;

    // Rơi shard
    let shardDrop = null;
    if (equip !== "vohan") {
        shardDrop = randomShard();
        if (shardDrop) {
            user.data.shards[shardDrop.key] = (user.data.shards[shardDrop.key] || 0) + 1;
        }
    }

    // CHECK SKIN
    for (let skin of fishSkins.reverse()) {
        if (user.data.fishCount >= skin.count) {
            user.data.fishSkin = skin.name;
            break;
        }
    }

    await Users.setData(senderID, user);

    // Tin nhắn kết quả
    let msg = `🐟 ${user.name || "Bạn"} câu được ${fish.name} (${fish.price}$)
⚡ Level: ${user.data.fishLevel} | EXP: ${user.data.fishExp} (+${gainedExp})
✨ Skin: ${user.data.fishSkin}
Kho: ${user.data.fishInventory.length}/${MAX_SLOT}`;
    if (shardDrop) msg += `\n🎁 Bạn nhận 1 ${shardDrop.name}!`;

    if (user.data.fishLevel > oldLevel) {
        msg += `\n🎉 Chúc mừng! Bạn đã lên Level ${user.data.fishLevel}!`;
    }

    send(msg, [{ tag: user.name || "Bạn", id: senderID }]);

    // ===== XỬ LÝ KẾT QUẢ PVP =====
    if (pvp && pvp.fishResult?.from && pvp.fishResult?.to) {
        // Lấy dữ liệu người chơi
        const fromUser = await Users.getData(pvp.fromID);
        const toUser = await Users.getData(pvp.toID);

        const fromFish = fromUser.data.fishInventory.slice(-1)[0];
        const toFish = toUser.data.fishInventory.slice(-1)[0];

        const fromValue = expByRarity[fromFish.rarity] || 1;
        const toValue = expByRarity[toFish.rarity] || 1;

        let winnerID, loserID;
        if (fromValue > toValue) {
            winnerID = pvp.fromID; loserID = pvp.toID;
        } else if (toValue > fromValue) {
            winnerID = pvp.toID; loserID = pvp.fromID;
        } else {
            winnerID = null; loserID = null; // hòa
        }

        let bet = pvp.bet || 0;

        if (winnerID) {
            await Currencies.increaseMoney(winnerID, bet);
            await Currencies.decreaseMoney(loserID, bet);
        }

        const fromName = fromUser.name || "Người chơi";
        const toName = toUser.name || "Người chơi";
        let resultMsg = `⚔️ Kết quả PVP giữa ${fromName} và ${toName}:\n`;
        if (winnerID) {
            const winnerName = winnerID === pvp.fromID ? fromName : toName;
            const loserName = loserID === pvp.fromID ? fromName : toName;
            resultMsg += `🏆 Người thắng: ${winnerName} (+${bet}$)\n💀 Người thua: ${loserName} (-${bet}$)`;
        } else {
            resultMsg += `🤝 Hai bên hòa, không ai mất tiền.`;
        }

        send(resultMsg);

        // Xóa trận PVP
        delete global.fishPVP[threadID];
    }
};
