const fs = require("fs");
const path = require("path");

module.exports.config = {
  name: "blackjack",
  version: "1.3.0",
  hasPermssion: 0,
  credits: "Vanloi",
  description: "Zidach, hit/stand",
  commandCategory: "Trò Chơi",
  usages: "blackjack <số tiền>",
  cooldowns: 10
};

let games = {};

function getGameKey(threadID, senderID) {
  return `${threadID}_${senderID}`;
}

function findAssetPath(filename) {
  const localPath = path.join(__dirname, filename);
  if (fs.existsSync(localPath)) return localPath;
  const cwdPath = path.join(process.cwd(), filename);
  if (fs.existsSync(cwdPath)) return cwdPath;
  const moduleAssetPath = path.join(process.cwd(), "modules", "commands", "game", "poker", filename);
  if (fs.existsSync(moduleAssetPath)) return moduleAssetPath;
  return null;
}

function parseBetAmount(value) {
  if (!value) return NaN;
  if (typeof value === "number") return value;
  const normalized = String(value).trim().toLowerCase();
  const match = normalized.match(/^(\d+(?:\.\d+)?)(qi|q|t|b|m|k)?$/);
  if (!match) return NaN;
  const amount = parseFloat(match[1]);
  const suffix = match[2];
  const multipliers = {
    k: 1e3,
    m: 1e6,
    b: 1e9,
    t: 1e12,
    q: 1e15,
    qi: 1e18
  };
  const multiplier = suffix ? multipliers[suffix] : 1;
  return Math.round(amount * multiplier);
}

function shuffleDeck() {
  const suits = ["S","H","D","C"];
  const values = ["A","2","3","4","5","6","7","8","9","10","J","Q","K"];
  let deck = [];
  for(let s of suits) for(let v of values) deck.push({value:v,suit:s});
  return deck.sort(()=>Math.random()-0.5);
}

function drawCard(game) {
  if (!game.deck.length) game.deck = shuffleDeck();
  return game.deck.pop();
}

function getCardValue(card){
  if(["J","Q","K"].includes(card.value)) return 10;
  if(card.value==="A") return 11;
  return parseInt(card.value);
}

function handValue(hand){
  let total=hand.reduce((sum,c)=>sum+getCardValue(c),0);
  let aces=hand.filter(c=>c.value==="A").length;
  while(total>21 && aces>0){ total-=10; aces--; }
  return total;
}

function handString(hand){
  return hand.map(c=>`${c.value}${c.suit}`).join(" ");
}

function getCardImage(card){
  const valueMap={A:"ace",J:"jack",Q:"queen",K:"king"};
  const suitMap={S:"spades",H:"hearts",D:"diamonds",C:"clubs"};
  const value=valueMap[card.value]||card.value;
  const suit=suitMap[card.suit];
  const faceSuffix=["J","Q","K"].includes(card.value) ? "2" : "";
  return findAssetPath(`${value}_of_${suit}${faceSuffix}.png`);
}

function handImages(hand, hideFirst=false){
  return hand.map((c,i)=>{
    if(i===0 && hideFirst) {
      const backPath = findAssetPath("back.png");
      return backPath ? fs.createReadStream(backPath) : null;
    }
    const p=getCardImage(c);
    return p ? fs.createReadStream(p) : null;
  }).filter(Boolean);
}

// Delay helper
function sleep(ms){return new Promise(resolve=>setTimeout(resolve,ms));}

// START
module.exports.run=async function({event,api,Currencies,args}){
  try{
    const {threadID,messageID,senderID}=event;
    const gameKey=getGameKey(threadID,senderID);
    const money=(await Currencies.getData(senderID)).money;
    const bet=(args[0]==="all"?money:parseBetAmount(args[0]));
    if(!bet||isNaN(bet)||bet<1000) return api.sendMessage("❌ Tiền cược phải từ 1000 trở lên",threadID,messageID);
    if(bet>money) return api.sendMessage("❌ Bạn không đủ tiền để cược",threadID,messageID);
    if(games[gameKey]) return api.sendMessage("⚠️ Bạn đang có ván Blackjack chưa kết thúc, reply 'hit' hoặc 'stand'.",threadID,messageID);

    let deck=shuffleDeck();
    let playerHand=[], dealerHand=[];

    games[gameKey]={deck,playerHand,dealerHand,bet,threadID,senderID};

    // Chia bài từng lá
    for(let i=0;i<2;i++){
      playerHand.push(drawCard(games[gameKey]));
      dealerHand.push(drawCard(games[gameKey]));
      await api.sendMessage({
        body:`🃏 Chia bài...\n[🎯] Bài bạn: ${handString(playerHand)}\n[🃏] Dealer: 1 lá ẩn + ${handString([dealerHand[1]])}`,
        attachment:handImages(playerHand)
      },threadID,messageID);
      await sleep(1000);
    }

    const msg=`🃏 BLACKJACK 🃏
[🎯] Bài của bạn (Tổng: ${handValue(playerHand)}):
[🃏] Dealer: 1 lá ẩn + ${handString([dealerHand[1]])}
[💵] Cược: ${bet}$
Reply "hit" để rút thêm, "stand" để dừng.`;

    return api.sendMessage({body:msg,attachment:handImages(playerHand)},threadID,(err,info)=>{
      if(err) return;
      global.client.handleReply.push({
        name: module.exports.config.name,
        messageID: info.messageID,
        author: senderID,
        threadID
      });
    },messageID);

  }catch(e){console.error(e); api.sendMessage("❌ Đã xảy ra lỗi",event.threadID,event.messageID);}
};

// REPLY
module.exports.handleReply=async function({event,api,Currencies,handleReply}){
  const {senderID,body,threadID,messageID}=event;
  const action=(body||"").trim().toLowerCase();
  if(!action) return api.sendMessage("⚠️ Reply 'hit' hoặc 'stand'",threadID,messageID);
  if(handleReply?.author && handleReply.author !== senderID) return;
  const gameKey=getGameKey(threadID,senderID);
  if(!games[gameKey]) return;
  const game=games[gameKey];
  let {playerHand,dealerHand,bet}=game;
  const {increaseMoney,decreaseMoney}=Currencies;
  if(handleReply?.messageID){
    global.client.handleReply = global.client.handleReply.filter(item => item.messageID !== handleReply.messageID);
  }

  if(action==="hit"){
    playerHand.push(drawCard(game));
    const total=handValue(playerHand);
    if(total>21){
      await decreaseMoney(senderID,bet);
      delete games[gameKey];
      return api.sendMessage({body:`💥 Bạn bốc bài: ${handString(playerHand)} (Tổng: ${total})\n❌ BUST! Bạn thua ${bet}$`,attachment:handImages(playerHand)},threadID,messageID);
    }else{
      return api.sendMessage({body:`🃏 Bài của bạn: ${handString(playerHand)} (Tổng: ${total})\nReply "hit" để rút thêm, "stand" để dừng.`,attachment:handImages(playerHand)},threadID,(err,info)=>{
        if(err) return;
        global.client.handleReply.push({
          name: module.exports.config.name,
          messageID: info.messageID,
          author: senderID,
          threadID
        });
      },messageID);
    }

  }else if(action==="stand"){
    // Dealer lật lá ẩn và bốc tiếp
    while(handValue(dealerHand)<17) dealerHand.push(drawCard(game));
    const playerTotal=handValue(playerHand);
    const dealerTotal=handValue(dealerHand);
    let result,moneyChange;

    if(dealerTotal>21 || playerTotal>dealerTotal){ result="Thắng"; moneyChange=bet; await increaseMoney(senderID,bet);}
    else if(playerTotal<dealerTotal){ result="Thua"; moneyChange=-bet; await decreaseMoney(senderID,bet);}
    else{ result="Hòa"; moneyChange=0;}

    delete games[gameKey];

    return api.sendMessage({
      body:`🃏 KẾT QUẢ BLACKJACK 🃏
[🎯] Bài bạn: ${handString(playerHand)} (Tổng: ${playerTotal})
[🃏] Bài dealer: ${handString(dealerHand)} (Tổng: ${dealerTotal})
[💵] Cược: ${bet}$
[📊] Kết quả: ${result}
[💰] Thay đổi tiền: ${moneyChange>0?"+":""}${moneyChange}$`,
      attachment:[...handImages(playerHand),...handImages(dealerHand)]
    },threadID,messageID);

  }else{
    return api.sendMessage("⚠️ Reply không hợp lệ, chỉ có 'hit' hoặc 'stand'",threadID,(err,info)=>{
      if(err) return;
      global.client.handleReply.push({
        name: module.exports.config.name,
        messageID: info.messageID,
        author: senderID,
        threadID
      });
    },messageID);
  }
};
