// baccarat.js - Baccarat game module
const fs = require("fs");
const path = require("path");

module.exports.config = {
  name: "bcr",
  version: "2.0.0",
  hasPermssion: 0,
  credits: "Vanloi",
  description: "Baccarat – cho phép cược 1 hoặc 2 cửa",
  commandCategory: "Trò Chơi",
  usages: "bcr player/banker/tie (tiền) [cửa2] (tiền2)",
  cooldowns: 5
};

// --- CONFIG ---
const PAYOUT = {
  player: 1,
  banker: 0.95,
  tie: 8
};

function replace(int) {
  return int.toString().replace(/(.)(?=(\d{3})+$)/g, '$1,');
}

const suits = ["C","D","H","S"];
const suitMap = { C:"clubs", D:"diamonds", H:"hearts", S:"spades" };
const ranks = ["A","2","3","4","5","6","7","8","9","10","J","Q","K"];
const rankMap = { A:"ace", J:"jack", Q:"queen", K:"king" };

function getCardImage(card) {
  const rankName = rankMap[card.rank] || card.rank;
  const suitName = suitMap[card.suit];
  return path.join(__dirname, "game", "poker", `${rankName}_of_${suitName}.png`);
}

function createDeck() {
  const deck = [];
  for (let r of ranks) for (let s of suits) deck.push({ rank:r, suit:s });
  return deck;
}

function shuffle(a) {
  for (let i=a.length-1;i>0;i--) {
    const j = Math.floor(Math.random()*(i+1));
    [a[i],a[j]]=[a[j],a[i]];
  }
  return a;
}

function cardValue(card) {
  if (card.rank === "A") return 1;
  if (["J","Q","K","10"].includes(card.rank)) return 0;
  return parseInt(card.rank);
}

const totalHand = hand => hand.reduce((a,c)=>a+cardValue(c),0) % 10;
const shouldPlayerDraw = t => t <= 5;

function bankerDrawRule(bankerTotal, third) {
  if (!third) return bankerTotal <= 5;
  const pt = cardValue(third);
  if (bankerTotal <= 2) return true;
  if (bankerTotal === 3 && pt !== 8) return true;
  if (bankerTotal === 4 && (pt>=2 && pt<=7)) return true;
  if (bankerTotal === 5 && (pt>=4 && pt<=7)) return true;
  if (bankerTotal === 6 && (pt===6 || pt===7)) return true;
  return false;
}

module.exports.run = async ({ event, api, Currencies, Users, args }) => {
  try {
    const { threadID, messageID, senderID } = event;
    const { sendMessage } = api;
    const name = await Users.getNameUser(senderID);
    const { money } = await Currencies.getData(senderID);

    // -------------------------------
    // XỬ LÝ CỬA & TIỀN CƯỢC
    // -------------------------------
    if (args.length < 2)
      return sendMessage("❌ Sai cú pháp!\n👉 bcr player/banker/tie (tiền) [cửa2] (tiền2)", threadID, messageID);

    const convertSide = s =>
      s==="p"?"player": s==="b"?"banker": s==="t"?"tie": s;

    let side1 = convertSide(args[0]);
    let bet1 = parseInt(args[1]);

    if (!["player","banker","tie"].includes(side1))
      return sendMessage("❌ Cửa 1 không hợp lệ!", threadID, messageID);
    if (isNaN(bet1) || bet1 < 1000) 
      return sendMessage("❌ Tiền cược cửa 1 phải ≥ 1000!", threadID, messageID);

    let side2 = null, bet2 = 0;

    if (args.length >= 4) {
      side2 = convertSide(args[2]);
      bet2 = parseInt(args[3]);

      if (!["player","banker","tie"].includes(side2))
        return sendMessage("❌ Cửa 2 không hợp lệ!", threadID, messageID);
      if (isNaN(bet2) || bet2 < 1000)
        return sendMessage("❌ Tiền cược cửa 2 phải ≥ 1000!", threadID, messageID);

      if (side1 === side2)
        return sendMessage("❌ Bạn không thể cược 2 lần cùng 1 cửa!", threadID, messageID);

      // CHẶN Player + Banker
      if ((side1==="player" && side2==="banker") || (side1==="banker" && side2==="player"))
        return sendMessage("❌ Không được cược Player + Banker cùng lúc!", threadID, messageID);
    }

    const totalBet = bet1 + (bet2 || 0);
    if (totalBet > money)
      return sendMessage("❌ Bạn không đủ tiền để đặt 2 cửa!", threadID, messageID);

    // -------------------------------
    // CHẠY BÀI
    // -------------------------------
    let deck = shuffle(createDeck());

    const player = [deck.pop(), deck.pop()];
    const banker = [deck.pop(), deck.pop()];

    let p3 = null, b3 = null;

    let pTotal = totalHand(player);
    let bTotal = totalHand(banker);

    if (shouldPlayerDraw(pTotal)) {
      p3 = deck.pop();
      player.push(p3);
      pTotal = totalHand(player);
    }
    if (bankerDrawRule(bTotal, p3)) {
      b3 = deck.pop();
      banker.push(b3);
      bTotal = totalHand(banker);
    }

    let winner =
      pTotal > bTotal ? "player" :
      bTotal > pTotal ? "banker" :
      "tie";

    // -------------------------------
    // TÍNH TIỀN
    // -------------------------------
    function calcBet(choice, amount) {
      if (!choice) return 0;
      if (choice === winner) return amount * PAYOUT[choice];
      return -amount;
    }

    const result1 = calcBet(side1, bet1);
    const result2 = side2 ? calcBet(side2, bet2) : 0;

    const totalResult = result1 + result2;

    if (totalResult >= 0) await Currencies.increaseMoney(senderID, totalResult);
    else await Currencies.decreaseMoney(senderID, Math.abs(totalResult));

    const newBal = money + totalResult;

    const imgs = [];
    for (const c of player) {
      const p = getCardImage(c);
      if (fs.existsSync(p)) imgs.push(fs.createReadStream(p));
    }

    const message =
`🃏 𝗕𝗔𝗖𝗖𝗔𝗥𝗔𝗧 – 𝗖𝘂̛𝗼̛̣𝗰 𝟭 & 𝟮 🃏
👤 Người chơi: ${name}

🎯 Cửa 1: ${side1.toUpperCase()} – ${replace(bet1)}$
🎯 Cửa 2: ${side2 ? side2.toUpperCase() : "Không"} ${side2 ? "– " + replace(bet2) + "$" : ""}

🂡 Player: ${player.map(c=>c.rank+c.suit).join(" ")} (Tổng ${pTotal})
🂠 Banker: ${banker.map(c=>c.rank+c.suit).join(" ")} (Tổng ${bTotal})

🏆 KẾT QUẢ: ${winner.toUpperCase()}

💵 Lời/Lỗ: ${replace(totalResult)}$
💰 Số dư mới: ${replace(newBal)}$`;

    return api.sendMessage({ body: message, attachment: imgs }, threadID, messageID);

  } catch (e) {
    console.log(e);
    return api.sendMessage("❌ Lỗi baccarat!", event.threadID, event.messageID);
  }
};
