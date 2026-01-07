// modules/commands/work.js

// danh sách công việc
let works = [
    { name: 'câu cá', done: [
        '{name} bạn vừa bắt được cá đèn lồng và bán được {money}$',
        '{name} bạn vừa bắt được cá mập và bán được {money}$',
        '{name} bạn vừa bắt được tôm tít và bán được {money}$',
        '{name} bạn vừa bắt được cá ngừ và bán được {money}$',
        '{name} bạn vừa bắt được cá thu và bán được {money}$',
        '{name} bạn vừa bắt được cá koi và bán được {money}$',
        '{name} bạn vừa bắt được cá trê và bán được {money}$',
        '{name} bạn vừa bắt được cá chép và bán được {money}$'
    ]},
    { name: 'săn thú hoang', done: [
        '{name} bắn được con rắn và bán được {money}$',
        '{name} bắn được con rồng komodo và bán được {money}$',
        '{name} bắn được con bói cá và bán được {money}$',
        '{name} bắn được con gấu nâu và bán được {money}$'
    ]},
    { name: 'Đào đá', done: [
        '{name} đã đào được viên kim cương và bán được {money}$',
        '{name} đã đào được vàng và bán được {money}$',
        '{name} đã đào được quặng sắt và bán được {money}$',
        '{name} đã đào được ngọc lục bảo và bán được {money}$'
    ]},
    { name: 'bắn chim', done: [
        '{name} bắn được con chim đen và bán được {money}$',
        '{name} bắn được con đại bàng và bán được {money}$',
        '{name} bắn được con chim én và bán được {money}$'
    ]}
];

// cấu hình module
exports.config = {
    name: 'work',
    version: '0.0.5',
    hasPermssion: 0,
    credits: 'VanLoi',
    description: 'Tham gia công việc kiếm tiền với hệ thống pity bonus',
    commandCategory: 'Tiện ích',
    usages: '[]',
    cooldowns: 3
};

// hàm phụ trợ
let _0 = x => x < 10 ? '0' + x : x;
let random = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

exports.run = async o => {
    let body = `[ Công việc ]\n${works.map((w, i) => `[${i + 1}] ${w.name}`).join('\n')}\n\n-> Reply số tương ứng để chọn công việc.`;
    o.api.sendMessage({ body }, o.event.threadID, (err, res) => {
        if (!err) {
            res.name = exports.config.name;
            res.event = o.event;
            global.client.handleReply.push(res);
        }
    }, o.event.messageID);
};

exports.handleReply = async o => {
    let _ = o.handleReply;
    let uid = o.event.senderID;
    let user = await o.Users.getData(uid);
    if (!user) return o.api.sendMessage(`Đã xảy ra lỗi!`, o.event.threadID);

    let data = user.data || {};
    let send = msg => o.api.sendMessage(msg, o.event.threadID);

    if (uid != _.event.senderID) return;

    // kiểm tra cooldown
    if (data.work && data.work > Date.now()) {
        let x = data.work - Date.now();
        let min = Math.floor(x / 60000);
        let sec = Math.floor((x % 60000) / 1000);
        return send(`Hãy làm việc sau: ${_0(min)} phút ${_0(sec)} giây.`);
    }

    let index = parseInt(o.event.body) - 1;
    if (isNaN(index) || index < 0 || index >= works.length)
        return send(`Công việc không hợp lệ, vui lòng reply số từ 1 đến ${works.length}.`);

    let work = works[index];
    data.work = Date.now() + (1000 * 60 * 60); // cooldown 1 giờ
    data.workCount = data.workCount || 0;
    data.workCount += 1; // tăng số lần work
    o.Users.setData(uid, user);

    send(`Đang ${work.name}...`);
    await new Promise(res => setTimeout(res, 3500));

    // tiền cơ bản: 1 triệu – 5 triệu
    let baseMoney = random(1000000, 5000000);

    // tính pity bonus: cứ 200 lần tăng 1 level
    let pityLevel = Math.floor(data.workCount / 200);
    let pityBonus = 0;
    if (pityLevel > 0) {
        pityBonus = random(pityLevel * 5000000, pityLevel * 5000000 + 5000000);
    }

    let totalMoney = baseMoney + pityBonus;

    let done = work.done[random(0, work.done.length - 1)];
    let msg = done.replace(/{name}/g, user.name).replace(/{money}/g, totalMoney) +
              `\n\nSố lần work hiện tại: ${data.workCount}` +
              (pityBonus > 0 ? `\nTiền thưởng pity: ${pityBonus}$` : '');

    send(msg);
    o.Currencies.increaseMoney(uid, totalMoney);
};
