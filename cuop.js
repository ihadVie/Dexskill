const cc = 33; // Tỉ lệ thành công :>

module.exports.config = {
    name: "cuop",
    version: "1.0.1",
    hasPermssion: 0,
    credits: "Vanloi",
    description: "Cướp tiền người chơi (cooldown 30 phút) tỉ lệ 33%",
    commandCategory: "Trò Chơi",
    usages: "@tag",
    cooldowns: 1800 // 30 phút tính bằng giây
};

module.exports.run = async function({ api, event, Users, Currencies }) {
    const { threadID, messageID, senderID } = event;

    // Lấy dữ liệu người dùng
    let userData = await Users.getData(senderID);
    let user = userData.data || {};

    // Kiểm tra cooldown
    if (user.cuop && user.cuop > Date.now()) {
        const left = user.cuop - Date.now();
        const minutes = Math.floor(left / 60000);
        const seconds = Math.floor((left % 60000) / 1000);
        return api.sendMessage(`⏱ cảnh sát tới đợi ${minutes} phút ${seconds} rồi quay lại chạy đi`, threadID, messageID);
    }

    // Kiểm tra tiền người dùng
    const data1 = await Currencies.getData(senderID);
    const money1 = data1.money;
    if (money1 < 1 || isNaN(money1))
        return api.sendMessage(`Bạn không có tiền, lỡ bị bắt rồi lấy gì trả!`, threadID, messageID);

    // Kiểm tra tag
    const mention = Object.keys(event.mentions)[0];
    if (!mention)
        return api.sendMessage(`Vui lòng tag mục tiêu!`, threadID, messageID);

    // Không cướp bot
    const botID = api.getCurrentUserID();
    if (mention == botID)
        return api.sendMessage("Định cướp cả tao à -.-", threadID, messageID);

    const name = await Users.getNameUser(mention);

    // Tiền mục tiêu
    const data2 = await Currencies.getData(mention);
    const money2 = data2.money;
    if (money2 < 1 || isNaN(money2))
        return api.sendMessage(`Mục tiêu ${name} không có đồng nào để cướp!`, threadID, messageID);

    // Random tỉ lệ
    const tile = Math.floor(Math.random() * 100) + 1;

    if (tile < cc) {
        const phan = money2 < 10000 ? 4 : 8;
        const sotien = Math.floor(Math.random() * (money2 / phan)) + 1;

        await Currencies.increaseMoney(senderID, sotien);
        await Currencies.decreaseMoney(mention, sotien);

        // Lưu cooldown 30 phút
        user.cuop = Date.now() + 30 * 60 * 1000;
        await Users.setData(senderID, { data: user });

        return api.sendMessage(`Bạn đã cướp thành công ${sotien}$ của ${name} :>`, threadID, messageID);
    } else {
        const phan = money1 < 10000 ? 4 : 8;
        const sotienmat = Math.floor(Math.random() * (money1 / phan)) + 1;

        await Currencies.decreaseMoney(senderID, sotienmat);
        await Currencies.increaseMoney(mention, sotienmat);

        // Lưu cooldown 30 phút
        user.cuop = Date.now() + 30 * 60 * 1000;
        await Users.setData(senderID, { data: user });

        return api.sendMessage(`Bạn cướp ${name} thất bại và mất ${sotienmat}$ :>`, threadID, messageID);
    }
};
