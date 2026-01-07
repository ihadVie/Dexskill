module.exports.config = {
  name: "xinchao",
  version: "1.0.1",
  hasPermssion: 0,
  credits: "Vanloi",
  description: "Lệnh test message effect",
  commandCategory: "Công cụ",
  usages: "[text]",
  cooldowns: 5
};

module.exports.run = async function ({ api, event, args }) {
  const body = args.join(" ") || "Xin chào!";
  return api.sendMessage({ body, messageEffect: "love" }, event.threadID, event.messageID);
};
