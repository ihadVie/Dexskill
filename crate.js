const fs = require("fs");

module.exports.config = {
  name: "crate",
  version: "1.6.0",
  hasPermssion: 0,
  credits: "Vanloi",
  description: "Xem kho cá, bán cá, xem mảnh và tặng cá",
  commandCategory: "Trò Chơi",
  usages: "crate [shard/give]",
  cooldowns: 3
};

const MAX_FISH = 20;

module.exports.run = async function({ api, event, args, Users, Currencies }) {
  const { senderID, threadID, messageReply, mentions } = event;
  const send = msg => api.sendMessage(msg, threadID);

  let user = await Users.getData(senderID);
  if (!user.data) user.data = {};

  // Tạo shards nếu chưa có
  if (!user.data.shards)
    user.data.shards = { infinity: 0, everlasting: 0, supreme: 0, origin: 0 };

  // =========================
  // 🔮 XEM SHARDS
  // =========================
  if (args[0]?.toLowerCase() === "shard") {
    return send(
`🔮 **Túi Mảnh Vô Hạn của bạn:**
🟪 ${user.data.shards.infinity} × Mảnh Vô Cực
🟦 ${user.data.shards.everlasting} × Mảnh Hằng Cửu
🟫 ${user.data.shards.supreme} × Mảnh Tuyệt Luân
🟥 ${user.data.shards.origin} × Mảnh Khởi Nguyên`
    );
  }

  // =========================
  // 🐟 LỆNH CRATE GIVE
  // =========================
  if (args[0]?.toLowerCase() === "give") {
    if (!user.data.fishInventory || user.data.fishInventory.length === 0)
      return send("⚠️ Bạn không có cá để tặng.");

    const index = parseInt(args[1]) - 1;
    const mentionID = Object.keys(mentions)[0];

    if (isNaN(index) || index < 0 || index >= user.data.fishInventory.length)
      return send("⚠️ Số cá không hợp lệ.");

    if (!mentionID) return send("⚠️ Bạn phải tag người nhận cá.");

    let receiver = await Users.getData(mentionID);
    if (!receiver.data) receiver.data = {};
    if (!receiver.data.fishInventory) receiver.data.fishInventory = [];

    if (receiver.data.fishInventory.length >= MAX_FISH)
      return send("⚠️ Kho cá của người nhận đã đầy (20).");

    const fish = user.data.fishInventory.splice(index, 1)[0];
    receiver.data.fishInventory.push(fish);

    await Users.setData(senderID, user);
    await Users.setData(mentionID, receiver);

    return send(`🎁 Bạn đã tặng **${fish.name}** cho ${mentions[mentionID]}.`);
  }

  // =========================
  // 🐟 XEM KHO CÁ
  // =========================
  if (!user.data.fishInventory || user.data.fishInventory.length === 0)
    return send("⚠️ Bạn không có cá nào trong kho.");

  const fishList = user.data.fishInventory
    .map((f, i) => `[${i + 1}] ${f.name} (${f.rarity}) - ${f.price}$`)
    .join("\n");

  const msg = 
`🐟 Kho cá của bạn (${user.data.fishInventory.length}/${MAX_FISH}):

${fishList}

👉 Reply số để bán cá.
👉 Reply **all** để bán toàn bộ.
👉 Reply: give <số> @tag để tặng cá.`;

  api.sendMessage({ body: msg }, threadID, (err, info) => {
    info.name = module.exports.config.name;
    info.event = event;
    global.client.handleReply.push(info);
  });
};

// =====================================
// 📌 HANDLE REPLY
// =====================================
module.exports.handleReply = async function({ api, event, handleReply, Users, Currencies }) {
  const uid = event.senderID;
  if (uid != handleReply.event.senderID) return;

  let user = await Users.getData(uid);
  if (!user.data.fishInventory || user.data.fishInventory.length === 0)
    return api.sendMessage("⚠️ Bạn không có cá.", event.threadID);

  const body = event.body.toLowerCase().trim();

  // ============================
  // 🎁 TẶNG CÁ QUA REPLY: give <số> + tag
  // ============================
  if (body.startsWith("give")) {
    const parts = body.split(" ");
    const index = parseInt(parts[1]) - 1;
    const mentionID = Object.keys(event.mentions)[0];

    if (!mentionID)
      return api.sendMessage("⚠️ Bạn phải tag người nhận.", event.threadID);

    if (isNaN(index) || index < 0 || index >= user.data.fishInventory.length)
      return api.sendMessage("⚠️ Số cá không hợp lệ.", event.threadID);

    let receiver = await Users.getData(mentionID);
    if (!receiver.data) receiver.data = {};
    if (!receiver.data.fishInventory) receiver.data.fishInventory = [];

    if (receiver.data.fishInventory.length >= 20)
      return api.sendMessage("⚠️ Kho cá người nhận đã đầy.", event.threadID);

    const fish = user.data.fishInventory.splice(index, 1)[0];
    receiver.data.fishInventory.push(fish);

    await Users.setData(uid, user);
    await Users.setData(mentionID, receiver);

    return api.sendMessage(
      `🎁 Bạn đã tặng **${fish.name}** cho ${event.mentions[mentionID]}.`,
      event.threadID
    );
  }

  // ============================
  // 💰 BÁN TOÀN BỘ
  // ============================
  if (body === "all") {
    let total = user.data.fishInventory.reduce((a,b)=> a+b.price, 0);
    user.data.fishInventory = [];
    await Users.setData(uid, user);
    await Currencies.increaseMoney(uid, total);
    return api.sendMessage(`💰 Bạn đã bán toàn bộ cá được **${total}$**!`, event.threadID);
  }

  // ============================
  // 💰 BÁN NHIỀU CÁ
  // ============================
  const indices = body.split(/\s+/)
    .map(n => parseInt(n) - 1)
    .filter(n => !isNaN(n) && n >= 0 && n < user.data.fishInventory.length);

  if (indices.length === 0)
    return api.sendMessage("⚠️ Số không hợp lệ.", event.threadID);

  indices.sort((a,b)=> b-a);

  let totalMoney = 0;
  let sold = [];

  for (let i of indices) {
    const f = user.data.fishInventory.splice(i, 1)[0];
    sold.push(f.name);
    totalMoney += f.price;
  }

  await Users.setData(uid, user);
  await Currencies.increaseMoney(uid, totalMoney);

  api.sendMessage(
    `💰 Đã bán: ${sold.join(", ")}\nNhận: **${totalMoney}$**`,
    event.threadID
  );
};
