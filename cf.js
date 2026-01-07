module.exports.config = {
  name: "cf",
  version: "1.1.0",
  hasPermssion: 0,
  credits: "Vanloi",
  description: "Cafe tycoon - text game",
  commandCategory: "Trò Chơi",
  usages: "order | b1/b2/b3 | roll | shop | quest | bxh",
  cooldowns: 2
};

const {
  getDateKey,
  initDailyQuests,
  ensureDailyQuests,
  updateQuestProgress,
  applyQuestRewards
} = require("./cfQuestUtils");

const MAX_TICKETS = 40;
const DAILY_FREE_TICKETS = 20;
const DAILY_BUY_TICKETS_LIMIT = 10;
const TICKET_PACK_PRICE_VND = 1000000000;
const TICKET_PACK_AMOUNT = 2;
const BASE_TABLE_COUNT = 3;

const QUALITY_MULTIPLIER = {
  I: 1,
  II: 1.5,
  III: 2
};

const QUALITY_FRIEND = {
  I: 1,
  II: 2,
  III: 3
};

const LEVEL_QUALITY_UNLOCK = {
  I: 1,
  II: 3,
  III: 5
};

const UPGRADE_BASE_COST = {
  marketing: 50,
  brew: 80,
  storage: 60,
  security: 70,
  premiumCup: 120
};

const CUSTOMER_POOL = [
  {
    id: "office",
    name: "👨‍💼 Nhân viên văn phòng",
    vibe: "🧠 Tính toán",
    gu: { base: "coffee", sweet: false, topping: false },
    unlock: 1,
    rewardMod: 1
  },
  {
    id: "student",
    name: "👩‍🎓 Sinh viên",
    vibe: "😌 Dễ thương",
    gu: { base: "coffee", sweet: true, topping: true },
    unlock: 1,
    rewardMod: 0.9
  },
  {
    id: "granny",
    name: "👵 Bà cụ",
    vibe: "🐢 Chill chậm",
    gu: { base: "tea", sweet: false, topping: false },
    unlock: 1,
    rewardMod: 1
  },
  {
    id: "reindeer",
    name: "🦌 Tuần Lộc",
    vibe: "🌿 Healthy",
    gu: { base: "tea", sweet: false, topping: true },
    unlock: 3,
    rewardMod: 1.1
  },
  {
    id: "snowman",
    name: "⛄ Người Tuyết",
    vibe: "😌 Dễ thương",
    gu: { base: "tea", sweet: true, topping: false },
    unlock: 5,
    rewardMod: 1.1
  },
  {
    id: "bee",
    name: "🐝 Ong Thợ",
    vibe: "🧠 Chăm chỉ",
    gu: { base: "coffee", sweet: false, topping: false },
    unlock: 5,
    rewardMod: 1.2
  },
  {
    id: "phuba",
    name: "💰 Phú Bà",
    vibe: "💸 Rủng rỉnh",
    gu: { base: "cacao", sweet: true, topping: true },
    unlock: 6,
    rewardMod: 1.5
  },
  {
    id: "fox",
    name: "🦊 Cáo ranh mảnh",
    vibe: "😈 Hên xui",
    gu: { base: "coffee", sweet: false, topping: false },
    unlock: 1,
    rewardMod: 0.7
  },
  {
    id: "wolf",
    name: "🐺 Sói",
    vibe: "😤 Khó ở",
    gu: { base: "cacao", sweet: false, topping: true },
    unlock: 7,
    rewardMod: 1.6
  },
  {
    id: "night_biz",
    name: "🕴️ Doanh nhân đêm",
    vibe: "🧠 Tính toán",
    gu: { base: "coffee", sweet: false, topping: false },
    unlock: 8,
    rewardMod: 1.8
  },
  {
    id: "vampire",
    name: "🧛‍♂️ Ma cà rồng",
    vibe: "🌙 Bí ẩn",
    gu: { base: "cacao", sweet: false, topping: false },
    unlock: 9,
    rewardMod: 1.2
  },
  {
    id: "dragon",
    name: "🐉 Rồng cổ",
    vibe: "🔥 Endgame",
    gu: { base: "coffee", sweet: true, topping: true },
    unlock: 15,
    rewardMod: 3
  },
  {
    id: "farmer",
    name: "🧑‍🌾 Nông dân",
    vibe: "🐢 Chill chậm",
    gu: { base: "tea", sweet: false, topping: false },
    unlock: 2,
    rewardMod: 1
  },
  {
    id: "chef",
    name: "🧑‍🍳 Đầu bếp",
    vibe: "🧠 Tính toán",
    gu: { base: "cacao", sweet: true, topping: false },
    unlock: 6,
    rewardMod: 1.3
  },
  {
    id: "mechanic",
    name: "🧑‍🔧 Thợ sửa máy",
    vibe: "🧠 Chăm chỉ",
    gu: { base: "coffee", sweet: false, topping: false },
    unlock: 4,
    rewardMod: 1.1
  },
  {
    id: "vanloi",
    name: "🃏 Văn Lợi",
    vibe: "😈 Hên xui",
    gu: { base: "coffee", sweet: true, topping: true },
    unlock: 5,
    rewardMod: 1
  },
  {
    id: "anhdo",
    name: "🧐 Anh Độ",
    vibe: "😏 Lowkey",
    gu: { base: "tea", sweet: false, topping: false },
    unlock: 3,
    rewardMod: 1.1
  },
  {
    id: "ghost",
    name: "👻 Ma lảng vảng",
    vibe: "🌙 Bí ẩn",
    gu: { base: "cacao", sweet: false, topping: false },
    unlock: 7,
    rewardMod: 1.4
  },
  {
    id: "jack",
    name: "🧑‍🎤 Jack Bến Tre",
    vibe: "😌 Dễ thương",
    gu: { base: "tea", sweet: true, topping: false },
    unlock: 6,
    rewardMod: 1.2
  },
  {
    id: "boypho",
    name: "🕶️ Boy Phố",
    vibe: "😎 Chất chơi",
    gu: { base: "coffee", sweet: false, topping: true },
    unlock: 5,
    rewardMod: 1.2
  },
  {
    id: "thanhhoa",
    name: "🐒 Anh Trai Thanh Hoá",
    vibe: "🤡 Mặn mòi",
    gu: { base: "coffee", sweet: false, topping: false },
    unlock: 4,
    rewardMod: 1
  },
  {
    id: "girlpho",
    name: "💅 Girl Phố",
    vibe: "💅 Sang chảnh",
    gu: { base: "tea", sweet: true, topping: true },
    unlock: 6,
    rewardMod: 1.4
  },
  {
    id: "tiktoker",
    name: "📱 TikToker",
    vibe: "📸 Trendy",
    gu: { base: "tea", sweet: true, topping: true },
    unlock: 6,
    rewardMod: 1.1
  },
  {
    id: "traimoi",
    name: "🧑‍🎤 Trai Mới Lớn",
    vibe: "🔥 Bốc đồng",
    gu: { base: "cacao", sweet: true, topping: true },
    unlock: 5,
    rewardMod: 1.1
  },
  {
    id: "phuongthuy",
    name: "🦹‍♀️ Phương Thuỷ",
    vibe: "☠️ Toxic",
    gu: { base: "coffee", sweet: true, topping: true },
    unlock: 8,
    rewardMod: 0.6
  },
  {
    id: "haiyen",
    name: "🦹‍♀️ Hai Yen",
    vibe: "☠️ Toxic",
    gu: { base: "tea", sweet: true, topping: false },
    unlock: 8,
    rewardMod: 0.6
  },
  {
    id: "angel",
    name: "😇 Thiên Thần",
    vibe: "🎀 Dễ thương",
    gu: { base: "tea", sweet: true, topping: true },
    unlock: 10,
    rewardMod: 2
  }
];

const CUSTOMER_EXPRESSIONS = {
  office: {
    I: ["Ừm... uống được. Lần sau chill hơn chút nha.", "Ok, cũng tạm. Đúng gu rồi đó."],
    II: ["Chuẩn vị đấy. Nãy giờ mới thấy ổn.", "Ổn, đúng gu. Điểm 8/10."],
    III: ["Chuẩn chỉnh, lần sau ghé nữa. Giữ phong độ nha."]
  },
  student: {
    I: ["Ngon nha, rẻ là được! Có đá là ổn rồi.", "Ổn áp đó 😌 Tui dễ tính lắm."],
    II: ["Nay ngon zữ 🤭 Cho thêm cái vibe nữa coi.", "Ui đúng gu luôn! Đỉnh nhẹ."],
    III: ["Đỉnhhh, cho thêm tip nè 💸 Quán chất chơi." ]
  },
  granny: {
    I: ["Không sao đâu con, từ từ. Ấm ấm là được.", "Vừa miệng lắm, bà thích sự nhẹ nhàng."],
    II: ["Ừm, dễ chịu quá. Con pha khéo lắm.", "Ngon rồi, bà thấy vui."],
    III: ["Tốt quá, bà vui lắm. Giữ sự tử tế nha con."]
  },
  reindeer: {
    I: ["Trà này mát ghê á. Nhẹ bụng là ổn.", "Ổn, đúng vibe healthy rồi."],
    II: ["Thanh mát, đúng vibe. Uống xong tỉnh luôn.", "Healthy chuẩn bài đó."],
    III: ["Tuyệt, tặng thêm nguyên liệu nè 🌿 Giữ style sạch." ]
  },
  snowman: {
    I: ["Mát mẻ ghê. Chill nhẹ nhẹ.", "Ổn á, không bị gắt."],
    II: ["Ngon nha, chill ghê. Nói chung thích.", "Đúng vibe luôn, mát rượi."],
    III: ["Quá đã, gọi bạn qua liền! Quán này ổn." ]
  },
  bee: {
    I: ["Ổn, tỉnh tỉnh. Làm tiếp được.", "Cũng được, đủ tỉnh."],
    II: ["Đậm chuẩn. Ngon kiểu công việc.", "Ổn định, tỉnh táo."],
    III: ["Chuẩn bài, tỉnh táo hẳn. Mai ghé nữa." ]
  },
  phuba: {
    I: ["Bình thường quá. Lần sau phải xịn hơn.", "Ơn trời, vẫn uống được."],
    II: ["Ngon đó, khỏi thối nha. Đáng tiền.", "Được, đáng tiền."],
    III: ["Đỉnh, tip thêm nè 💰 Pha vậy mới gọi là xịn." ]
  },
  fox: {
    I: ["Vậy là được rồi. Đừng làm màu.", "Ờ, tạm. Đỡ tốn tiền."],
    II: ["Cũng ổn đấy. Không lố.", "Ok, hợp lý."],
    III: ["Ngon hơn tui tưởng. Thôi được." ]
  },
  wolf: {
    I: ["Mấy món như này mà cũng bán? Thôi cũng tạm.", "Hơi chán. Làm tốt hơn đi."],
    II: ["Tạm ổn. Đừng làm tui bực.", "Cũng được. Lần sau chuẩn hơn."],
    III: ["Được, lần sau làm thế này. Đừng tụt mood." ]
  },
  night_biz: {
    I: ["Rác. Đừng để mất thời gian bố mày.", "Rác rưỡi."],
    II: ["Ổn. Làm việc với người có đầu óc vậy được.", "Ổn pha hơi lâu nhưng được đấy."],
    III: ["Được. Giữ đúng phong độ này, tiền không thiếu.", "Đù vl ngon ác."]
  },
  vampire: {
    I: ["Nhạt vl… chưa đủ.", "Nhạt quá."],
    II: ["Khá hơn ta nghĩ.", "Ổn đó."],
    III: ["Hương vị này… làm ta tỉnh lại."]
  },
  dragon: {
    I: ["Như cc.", "Đừng có đem thứ này cho ta."],
    II: ["Khá. Nhưng bố dell trả tiền đấy?.", "Tạm được."],
    III: ["Con người, ngươi làm ta hài lòng."]
  },
  farmer: {
    I: ["Uống được là mừng rồi.", "Thôi cũng được."],
    II: ["Ừm, dễ uống ghê.", "Ổn áp nha."],
    III: ["Uống xong thấy khỏe người hẳn."]
  },
  chef: {
    I: ["Gia giảm chưa đều.", "Chưa tới."],
    II: ["Ổn rồi đó.", "Khá."],
    III: ["Pha có tay nghề đấy."]
  },
  mechanic: {
    I: ["Tạm dùng được.", "Hơi yếu."],
    II: ["Khá đấy.", "Ổn rồi."],
    III: ["Ổn rồi, chạy mượt lắm."]
  },
  vanloi: {
    I: ["Chịu pha như thế thì chịu.", "Hên xui thôi."],
    II: ["Dcm m biết pha không đấy.", "Cũng được."],
    III: ["Ha ha! Trúng lớn rồi."]
  },
  anhdo: {
    I: ["Ờ anh chào vũ nhá…", "Cũng được."],
    II: ["Em ơi chối làm sao được.", "Ổn áp."],
    III: ["Tặng em khô gà nhé."]
  },
  ghost: {
    I: ["……", "…"],
    II: ["Ta bắt đầu hiện ra.", "Ngươi có vẻ thấy ta."],
    III: ["Ngươi… nhìn thấy ta sao?"]
  },
  jack: {
    I: ["Ok đấy thg em.", "Ổn."],
    II: ["Ồ ổn nha", "Cũng được."],
    III: ["Quán này ngon mốt anh dẫn con anh qua"]
  },
  boypho: {
    I: ["Pha gì mà nhạt thế em.", "Uống tạm thôi."],
    II: ["Anh dân phố mà.", "😎"],
    III: ["Chuẩn vibe phố rồi.", "Anh bao bàn này."]
  },
  thanhhoa: {
    I: ["Sáng mua đôi dép chiều còn 1 chiếc.", "Anh xin."],
    II: ["Nói rằng mình là người Thanh Hoá.", "🤡"],
    III: ["Nem chua Thanh Hoá.", "18+18="]
  },
  girlpho: {
    I: ["Pha gì mà nhạt hơn cả mấy anh inbox chị vậy?", "Thôi chị uống cho có."],
    II: ["Chị quen uống đồ xịn rồi em ạ.", "💅🤡"],
    III: ["Ừm~ được đó, hợp vibe chị.", "Quán này ok, story liền."]
  },
  tiktoker: {
    I: ["Khoan uống, để quay cái đã.", "Pha đẹp mà không lên clip là phí."],
    II: ["Anh/chị làm nội dung mà.", "📸🤡"],
    III: ["Đù clip này chắc triệu view.", "Quán này để anh/chị tag vô nha."]
  },
  traimoi: {
    I: ["Em trai chịu đau quá dữ.", "Chuyện này phải học thêm."],
    II: ["Chém gió thì giỏi, làm thật thì chưa.", "🤡💀"],
    III: ["Đù, chuẩn men rồi đó.", "Cả xóm phải nể."]
  },
  phuongthuy: {
    I: ["Câu được cá to thế cho tao xin.", "Ờ."],
    II: ["Xin vài 100B đánh TX.", "🤡💀"],
    III: ["-Money", "0"]
  },
  haiyen: {
    I: ["Tôi DepGaiNhatGroup.", "Ờ."],
    II: ["Nhìn cặc gì????", "🖕"],
    III: ["Tuổi gì đòi vượt Top 1", "👎"]
  },
  angel: {
    I: ["Không sao đâu~ Dễ thương là được.", "Ổn nè, chill lắm."],
    II: ["Ngon nha~ Nhẹ nhàng vừa đủ.", "Dễ thương quá, cảm ơn~"],
    III: ["Tuyệt vời, thưởng nè ✨ Giữ vibe dễ thương nhé." ]
  }
};

const CUSTOMER_GREETINGS = {
  office: ["Anh cần món nhanh gọn nha.", "Đang vội, làm chuẩn giùm."],
  student: ["Món gì cute xíu nha!", "Cho tui cái ngọt ngọt nha."],
  granny: ["Con làm nhẹ nhàng thôi nha.", "Bà uống ấm là được."],
  reindeer: ["Ưu tiên healthy nhé.", "Đừng ngọt quá nha."],
  snowman: ["Cho tui cái mát mát nha.", "Chill xíu nha."],
  bee: ["Cần tỉnh táo chút.", "Đậm đà chút nhé."],
  phuba: ["Làm xịn vào, tui trả tip.", "Đừng làm qua loa nha."],
  fox: ["Gọn nhẹ thôi nha.", "Đừng rườm rà."],
  wolf: ["Tui kén lắm đó.", "Làm chuẩn nha."],
  night_biz: ["Đang bận, làm nhanh.", "Đúng gu thì ok."],
  vampire: ["Im lặng và làm đi.", "Đừng ngọt quá."],
  dragon: ["Ta muốn đồ xịn nhất.", "Đừng làm ta thất vọng."],
  farmer: ["Bình dị thôi con.", "Nhẹ nhàng là được."],
  chef: ["Gia giảm chuẩn nha.", "Đừng quá tay."],
  mechanic: ["Ổn định là được.", "Làm gọn gàng nha."],
  vanloi: ["Hên xui nha bro.", "Cho bất ngờ coi."],
  anhdo: ["Em ơi làm ly trà nha.", "Đừng ngọt quá nha em."],
  ghost: ["…", "Ngươi thấy ta sao?"],
  jack: ["Cho ly trà ngọt ngọt nha.", "Nói chuyện chill chút."],
  boypho: ["Pha ngầu ngầu chút nha.", "Cho anh vibe phố."],
  thanhhoa: ["Cho anh ly cà phê đậm.", "Đừng ngọt quá."],
  girlpho: ["Pha xịn xịn nha em.", "Cho chị cái sang."],
  tiktoker: ["Pha đẹp đẹp nha.", "Cho anh/chị quay clip."],
  traimoi: ["Cho em cái đậm đậm.", "Đừng làm em quê."],
  phuongthuy: ["Pha lẹ lên.", "Đừng làm tao bực."],
  haiyen: ["Pha cho nhanh.", "Đừng dài dòng."],
  angel: ["Nhẹ nhàng thôi~", "Cho tui chút dễ thương nha~"]
};

const ITEM_LABELS = {
  plastic: "🥤 Ly nhựa",
  glass: "🍷 Ly thủy tinh",
  coffee: "☕ Cà phê",
  tea: "🍵 Trà",
  cacao: "🍫 Cacao",
  milk: "🥛 Sữa",
  syrup: "🍯 Syrup",
  ice: "🧊 Đá",
  fruit: "🍓 Trái cây",
  nut: "🌰 Hạt"
};

const DRINK_MENU = [
  {
    id: "black_coffee",
    name: "Cà phê đen",
    recipe: { cup: "plastic", base: "coffee", addon: null, toppings: [] }
  },
  {
    id: "hot_tea",
    name: "Trà ấm",
    recipe: { cup: "plastic", base: "tea", addon: null, toppings: [] }
  },
  {
    id: "warm_cacao",
    name: "Cacao ấm",
    recipe: { cup: "plastic", base: "cacao", addon: "milk", toppings: [] }
  },
  {
    id: "latte_fruit",
    name: "Latte trái cây",
    recipe: { cup: "glass", base: "coffee", addon: "milk", toppings: ["fruit"] }
  },
  {
    id: "peach_tea",
    name: "Trà đào lạnh",
    recipe: { cup: "glass", base: "tea", addon: "syrup", toppings: ["fruit"] }
  },
  {
    id: "nut_cacao",
    name: "Cacao hạt dẻ",
    recipe: { cup: "glass", base: "cacao", addon: "milk", toppings: ["nut"] }
  },
  {
    id: "tropical_coffee",
    name: "Cà phê vườn nhiệt đới",
    recipe: { cup: "glass", base: "coffee", addon: "syrup", toppings: ["fruit", "nut"] }
  },
  {
    id: "lychee_tea",
    name: "Trà vải hạt",
    recipe: { cup: "glass", base: "tea", addon: "syrup", toppings: ["fruit", "nut"] }
  },
  {
    id: "cacao_mix",
    name: "Cacao mix hạt trái",
    recipe: { cup: "glass", base: "cacao", addon: "milk", toppings: ["fruit", "nut"] }
  },
  {
    id: "iced_milk_tea",
    name: "Trà sữa đá",
    recipe: { cup: "glass", base: "tea", addon: "milk", toppings: ["fruit"] }
  },
  {
    id: "ice_coffee",
    name: "Cà phê đá",
    recipe: { cup: "plastic", base: "coffee", addon: "ice", toppings: [] }
  }
];

const CUP_ALIASES = {
  nhua: "plastic",
  "lynhua": "plastic",
  plastic: "plastic",
  thuytinh: "glass",
  "lythuytinh": "glass",
  glass: "glass"
};

const BASE_ALIASES = {
  cafe: "coffee",
  coffee: "coffee",
  tra: "tea",
  tea: "tea",
  cacao: "cacao",
  socola: "cacao"
};

const ADDON_ALIASES = {
  sua: "milk",
  milk: "milk",
  siro: "syrup",
  syrup: "syrup",
  da: "ice",
  ice: "ice",
  none: null,
  khong: null
};

const TOPPING_ALIASES = {
  trai: "fruit",
  fruit: "fruit",
  hat: "nut",
  nut: "nut",
  none: null,
  khong: null
};

function createDefaultCafeData() {
  return {
    level: 1,
    exp: 0,
    coins: 0,
    tickets: {
      count: DAILY_FREE_TICKETS,
      lastReset: getDateKey(),
      dailyBought: 0,
      gold: 0
    },
    inventory: {
      cups: { plastic: 0, glass: 0 },
      base: { coffee: 0, tea: 0, cacao: 0 },
      addons: { milk: 0, syrup: 0, ice: 0 },
      toppings: { fruit: 0, nut: 0 }
    },
    upgrades: {
      marketing: 0,
      brew: 0,
      storage: 0,
      security: 0,
      premiumCup: 0
    },
    friendliness: {},
    tables: [],
    rollStreak: 0,
    stats: {
      served: 0
    },
    dailyQuests: initDailyQuests(),
    dailyBuffs: {
      dateKey: getDateKey(),
      jackBoost: false,
      mechanicShield: false
    }
  };
}

function randomBetween(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function expNeeded(level) {
  if (level <= 5) return 40 + level * 10;
  if (level <= 10) return Math.round((40 + level * 12) * 1.6);
  return Math.round((40 + level * 15) * 2);
}

function totalInventoryCount(inventory) {
  return [
    ...Object.values(inventory.cups),
    ...Object.values(inventory.base),
    ...Object.values(inventory.addons),
    ...Object.values(inventory.toppings)
  ].reduce((sum, value) => sum + value, 0);
}

function maxStorage() {
  return Number.MAX_SAFE_INTEGER;
}

function clamp(num, min, max) {
  return Math.max(min, Math.min(max, num));
}

function formatInventory(inventory) {
  return [
    `Ly: ${ITEM_LABELS.plastic} x${inventory.cups.plastic} | ${ITEM_LABELS.glass} x${inventory.cups.glass}`,
    `Base: ${ITEM_LABELS.coffee} x${inventory.base.coffee} | ${ITEM_LABELS.tea} x${inventory.base.tea} | ${ITEM_LABELS.cacao} x${inventory.base.cacao}`,
    `Add-on: ${ITEM_LABELS.milk} x${inventory.addons.milk} | ${ITEM_LABELS.syrup} x${inventory.addons.syrup} | ${ITEM_LABELS.ice} x${inventory.addons.ice}`,
    `Topping: ${ITEM_LABELS.fruit} x${inventory.toppings.fruit} | ${ITEM_LABELS.nut} x${inventory.toppings.nut}`
  ].join("\n");
}

function formatTables(tables) {
  if (!tables.length) return "Chưa có bàn nào.";
  return tables.map(table => {
    if (!table.order) return `B${table.id}: (trống)`;
    return `B${table.id}: ${table.order.customer.name}`;
  }).join("\n");
}

function formatQuestList(cafeData) {
  ensureDailyQuests(cafeData);
  return cafeData.dailyQuests.quests.map((quest, index) => {
    const status = quest.claimed ? "✅" : `${quest.progress}/${quest.target}`;
    return `${index + 1}. ${quest.label} (${status}) → +${quest.reward} vé`;
  }).join("\n");
}

function grantGoldTicketIfReady(cafeData) {
  if (cafeData.dailyQuests.goldClaimed) return false;
  const nonMessageDone = cafeData.dailyQuests.quests
    .filter(quest => quest.type !== "message")
    .every(quest => quest.progress >= quest.target);
  if (!nonMessageDone) return false;
  cafeData.dailyQuests.goldClaimed = true;
  cafeData.tickets.gold += 1;
  return true;
}

function pickExpression(customerId, quality, match) {
  const fallback = ["Cũng ổn nha.", "Ngon đó."];
  const expressions = CUSTOMER_EXPRESSIONS[customerId] || {};
  const list = expressions[quality] || fallback;
  const line = list[Math.floor(Math.random() * list.length)];
  if (!match) return `Sai vibe xíu... ${line}`;
  return line;
}

function pickGreeting(customerId) {
  const greetings = CUSTOMER_GREETINGS[customerId] || ["Cho món ổn ổn nha."];
  return greetings[Math.floor(Math.random() * greetings.length)];
}

function resolveAlias(input, aliasMap) {
  if (!input) return null;
  const key = input.toLowerCase();
  return Object.prototype.hasOwnProperty.call(aliasMap, key) ? aliasMap[key] : null;
}

function calculateQuality(cup, toppings) {
  const cupPoint = cup === "glass" ? 1 : 0;
  const toppingPoint = Math.min(toppings.length, 2);
  const total = cupPoint + toppingPoint;
  if (total >= 3) return "III";
  if (total === 2) return "II";
  return "I";
}

function getUnlockedCustomers(level) {
  return CUSTOMER_POOL.filter(customer => level >= customer.unlock);
}

function matchesGu(drink, customer) {
  if (drink.recipe.base !== customer.gu.base) return false;
  const sweetRecipe = drink.recipe.addon === "syrup" || drink.recipe.toppings.length > 0;
  const toppingRecipe = drink.recipe.toppings.length > 0;
  if (customer.gu.sweet !== sweetRecipe) return false;
  if (customer.gu.topping && !toppingRecipe) return false;
  return true;
}

function filterDrinksByQuality(level) {
  const allowed = level >= LEVEL_QUALITY_UNLOCK.III
    ? ["I", "II", "III"]
    : level >= LEVEL_QUALITY_UNLOCK.II
      ? ["I", "II"]
      : ["I"];
  return DRINK_MENU.filter(drink => allowed.includes(calculateQuality(drink.recipe.cup, drink.recipe.toppings)));
}

function generateOrder(cafeData) {
  const candidates = getUnlockedCustomers(cafeData.level);
  const customer = candidates[Math.floor(Math.random() * candidates.length)];
  const allowedDrinks = filterDrinksByQuality(cafeData.level);
  if (customer.id === "dragon") {
    const dragonDrinks = allowedDrinks.filter(drink => calculateQuality(drink.recipe.cup, drink.recipe.toppings) === "III");
    const pick = (dragonDrinks.length ? dragonDrinks : allowedDrinks)[Math.floor(Math.random() * (dragonDrinks.length || allowedDrinks.length))];
    return {
      customer,
      drink: pick,
      quality: "III"
    };
  }
  let drinkPool = allowedDrinks.filter(drink => matchesGu(drink, customer));
  if (!drinkPool.length) drinkPool = allowedDrinks.filter(drink => drink.recipe.base === customer.gu.base);
  if (!drinkPool.length) drinkPool = allowedDrinks;
  const drink = drinkPool[Math.floor(Math.random() * drinkPool.length)];
  const quality = calculateQuality(drink.recipe.cup, drink.recipe.toppings);
  return {
    customer,
    drink,
    quality
  };
}

function checkDailyReset(cafeData) {
  const todayKey = getDateKey();
  if (cafeData.tickets.lastReset !== todayKey) {
    cafeData.tickets.count = Math.min(MAX_TICKETS, cafeData.tickets.count + DAILY_FREE_TICKETS);
    cafeData.tickets.dailyBought = 0;
    cafeData.tickets.lastReset = todayKey;
  }
  ensureDailyQuests(cafeData);
  if (!cafeData.dailyBuffs || cafeData.dailyBuffs.dateKey !== todayKey) {
    cafeData.dailyBuffs = {
      dateKey: todayKey,
      jackBoost: false,
      mechanicShield: false
    };
  }
}

function ensureTables(cafeData) {
  const tableCount = BASE_TABLE_COUNT + cafeData.upgrades.marketing;
  if (!Array.isArray(cafeData.tables)) cafeData.tables = [];
  while (cafeData.tables.length < tableCount) {
    cafeData.tables.push({ id: cafeData.tables.length + 1, order: null });
  }
  if (cafeData.tables.length > tableCount) {
    cafeData.tables = cafeData.tables.slice(0, tableCount);
  }
}

function fillEmptyTables(cafeData) {
  ensureTables(cafeData);
  for (const table of cafeData.tables) {
    if (!table.order) {
      table.order = generateOrder(cafeData);
    }
  }
}

function addItem(inventory, category, key, amount = 1) {
  if (!inventory[category]) return;
  if (inventory[category][key] === undefined) inventory[category][key] = 0;
  inventory[category][key] += amount;
}

function pickRollLoot(rollStreak, isGold) {
  const penalty = rollStreak > 10 ? 0.7 : 1;
  const baseRates = isGold
    ? { gold: 0.03, glass: 0.2, topping: 0.27, base: 0.3, addon: 0.2 }
    : { gold: 0.01, glass: 0.08, topping: 0.2, base: 0.38, addon: 0.33 };

  const rates = {
    gold: baseRates.gold * penalty,
    glass: baseRates.glass * penalty,
    topping: baseRates.topping * (rollStreak > 10 ? 0.85 : 1),
    base: baseRates.base,
    addon: baseRates.addon
  };

  const total = Object.values(rates).reduce((sum, value) => sum + value, 0);
  const roll = Math.random() * total;
  let pointer = rates.gold;
  if (roll < pointer) return { type: "gold", amount: 1 };
  pointer += rates.glass;
  if (roll < pointer) return { type: "cups", item: "glass", amount: 1 };
  pointer += rates.topping;
  if (roll < pointer) {
    const topping = ["fruit", "nut"][randomBetween(0, 1)];
    return { type: "toppings", item: topping, amount: 1 };
  }
  pointer += rates.base;
  if (roll < pointer) {
    const base = ["coffee", "tea", "cacao"][randomBetween(0, 2)];
    return { type: "base", item: base, amount: randomBetween(1, 2) };
  }
  const addon = ["milk", "syrup", "ice"][randomBetween(0, 2)];
  return { type: "addons", item: addon, amount: randomBetween(1, 2) };
}

function formatLoot(loot) {
  if (loot.type === "gold") return `🎫 Vé vàng x${loot.amount}`;
  const label = ITEM_LABELS[loot.item];
  return `${label} x${loot.amount}`;
}

function normalizeOrderInput(args) {
  const cup = resolveAlias(args[0], CUP_ALIASES);
  const base = resolveAlias(args[1], BASE_ALIASES);
  const addon = resolveAlias(args[2], ADDON_ALIASES);
  const toppings = args.slice(3, 5).map(item => resolveAlias(item, TOPPING_ALIASES)).filter(Boolean);
  return { cup, base, addon, toppings };
}

function checkInventory(inventory, selection) {
  if (!selection.cup || !selection.base) return "Thiếu ly hoặc base nha.";
  if (inventory.cups[selection.cup] <= 0) return `Hết ${ITEM_LABELS[selection.cup]} rồi.`;
  if (inventory.base[selection.base] <= 0) return `Hết ${ITEM_LABELS[selection.base]} rồi.`;
  if (selection.addon && inventory.addons[selection.addon] <= 0) return `Hết ${ITEM_LABELS[selection.addon]} rồi.`;
  for (const topping of selection.toppings) {
    if (inventory.toppings[topping] <= 0) return `Hết ${ITEM_LABELS[topping]} rồi.`;
  }
  return null;
}

function spendInventory(inventory, selection) {
  inventory.cups[selection.cup] -= 1;
  inventory.base[selection.base] -= 1;
  if (selection.addon) inventory.addons[selection.addon] -= 1;
  for (const topping of selection.toppings) inventory.toppings[topping] -= 1;
}

function evaluateMatch(order, selection) {
  const recipe = order.drink.recipe;
  if (recipe.cup !== selection.cup) return false;
  if (recipe.base !== selection.base) return false;
  if ((recipe.addon || null) !== (selection.addon || null)) return false;
  const orderToppings = [...recipe.toppings].sort().join("|");
  const selectionToppings = [...selection.toppings].sort().join("|");
  return orderToppings === selectionToppings;
}

function customerFriendliness(cafeData, customerId) {
  if (!cafeData.friendliness[customerId]) cafeData.friendliness[customerId] = 0;
  return cafeData.friendliness[customerId];
}

async function loadCafeData(Users, userID) {
  const userData = await Users.getData(userID);
  const data = userData.data && typeof userData.data === "object" ? userData.data : {};
  if (!data.cafeGame) data.cafeGame = createDefaultCafeData();
  checkDailyReset(data.cafeGame);
  userData.data = data;
  return userData;
}

async function saveCafeData(Users, userID, userData) {
  await Users.setData(userID, userData);
}

function formatStatus(cafeData) {
  const needed = expNeeded(cafeData.level);
  return [
    `Lv ${cafeData.level} | EXP ${cafeData.exp}/${needed}`,
    `Xu: ${cafeData.coins} | Vé: ${cafeData.tickets.count} (+${cafeData.tickets.gold} vé vàng)`
  ].join("\n");
}

function parseTableKey(value) {
  if (!value) return null;
  const lowered = value.toLowerCase();
  if (!lowered.startsWith("b")) return null;
  const number = Number(lowered.slice(1));
  if (Number.isNaN(number)) return null;
  return number;
}

module.exports.run = async function ({ api, event, args, Currencies, Users }) {
  const { threadID, messageID, senderID } = event;
  const subCommand = (args[0] || "").toLowerCase();
  const userData = await loadCafeData(Users, senderID);
  const cafeData = userData.data.cafeGame;

  const reply = (message) => api.sendMessage(message, threadID, messageID);

  const serveTable = async (tableIndex, selectionArgs) => {
    ensureTables(cafeData);
    const table = cafeData.tables.find(item => item.id === tableIndex);
    if (!table || !table.order) {
      return reply("Bàn này đang trống. Gõ cf order để gọi khách mới.");
    }

    const selection = normalizeOrderInput(selectionArgs);
    if (!selection.cup || !selection.base) {
      return reply("Cú pháp: cf b" + tableIndex + " <ly> <base> <addon/none> <topping1> [topping2]");
    }

    const inventoryError = checkInventory(cafeData.inventory, selection);
    if (inventoryError) return reply(inventoryError);

    const selectionQuality = calculateQuality(selection.cup, selection.toppings);
    if (selectionQuality === "II" && cafeData.level < LEVEL_QUALITY_UNLOCK.II) {
      return reply(`Lv ${cafeData.level} chưa mở đồ II.`);
    }
    if (selectionQuality === "III" && cafeData.level < LEVEL_QUALITY_UNLOCK.III) {
      return reply(`Lv ${cafeData.level} chưa mở đồ III.`);
    }

    spendInventory(cafeData.inventory, selection);

    const currentOrder = table.order;
    let finalQuality = currentOrder.quality;
    let failMessage = "";
    const match = evaluateMatch(currentOrder, selection);

    if (match && currentOrder.quality === "III") {
      let successRate = 0.3 + cafeData.upgrades.brew * 0.05;
      if (currentOrder.customer.id === "chef") successRate += 0.1;
      if (Math.random() > successRate) {
        finalQuality = "II";
        failMessage = "\nFail nhẹ, tụt xuống cấp II và rơi topping 😭";
      }
    }

    const baseReward = 20 + cafeData.level * 3;
    let reward = Math.round(baseReward * QUALITY_MULTIPLIER[finalQuality] * currentOrder.customer.rewardMod * (match ? 1 : 0.6));
    let expGain = 6 + (finalQuality === "III" ? 12 : finalQuality === "II" ? 8 : 4);
    let friendGain = QUALITY_FRIEND[finalQuality] + (match ? 1 : 0);
    if (!match) friendGain = Math.max(1, friendGain - 1);

    if (currentOrder.customer.id === "vanloi" && match) {
      const roll = 0.5 + Math.random() * 2;
      reward = Math.round(reward * roll);
    }
    if (currentOrder.customer.id === "ghost" && match) {
      reward = Math.round(reward * 1.8);
    }
    if (currentOrder.customer.id === "dragon" && (!match || finalQuality !== "III")) {
      reward = 0;
    }
    if (currentOrder.customer.id === "office" && match) {
      reward += 5;
    }
    if (currentOrder.customer.id === "student" && match) {
      if (cafeData.tickets.count < MAX_TICKETS && Math.random() < 0.2) {
        cafeData.tickets.count += 1;
        failMessage += "\n🎟️ Sinh viên tặng thêm 1 vé.";
      }
    }
    if (currentOrder.customer.id === "reindeer" && match) {
      addItem(cafeData.inventory, "toppings", "fruit", 1);
      failMessage += "\n🌿 Tuần Lộc tặng 1 trái cây.";
    }
    if (currentOrder.customer.id === "snowman" && match) {
      addItem(cafeData.inventory, "addons", "ice", 1);
      failMessage += "\n🧊 Người Tuyết tặng thêm 1 đá.";
    }
    if (currentOrder.customer.id === "bee" && match) {
      cafeData.rollStreak = Math.max(0, cafeData.rollStreak - 2);
    }
    if (currentOrder.customer.id === "phuba" && match && finalQuality === "III") {
      reward += 15;
    }
    if (currentOrder.customer.id === "fox" && !match) {
      reward = Math.max(0, Math.round(reward * 0.8));
    }
    if (currentOrder.customer.id === "wolf" && !match) {
      reward = Math.max(0, Math.round(reward * 0.6));
    }
    if (currentOrder.customer.id === "boypho" && match && finalQuality !== "I") {
      reward = Math.round(reward * 1.15);
    }
    if (currentOrder.customer.id === "girlpho" && match && finalQuality === "III") {
      reward = Math.round(reward * 1.25);
    }
    if (currentOrder.customer.id === "tiktoker" && match) {
      friendGain += 1;
    }
    if (currentOrder.customer.id === "traimoi" && match && finalQuality !== "I") {
      expGain += 2;
    }
    if (currentOrder.customer.id === "phuongthuy") {
      reward = Math.max(0, Math.round(reward * (match ? 0.7 : 0.3)));
      friendGain = Math.max(0, friendGain - 2);
    }
    if (currentOrder.customer.id === "haiyen") {
      reward = Math.max(0, Math.round(reward * (match ? 0.7 : 0.3)));
      friendGain = Math.max(0, friendGain - 2);
    }

    cafeData.coins += reward;
    cafeData.stats.served += 1;
    if (currentOrder.customer.id === "vampire" && match) {
      expGain += 6;
    }
    cafeData.exp += expGain;

    let friend = customerFriendliness(cafeData, currentOrder.customer.id);
    if (!match && currentOrder.customer.id === "night_biz") {
      friendGain = Math.max(0, friendGain - 2);
    }
    if (cafeData.dailyBuffs && cafeData.dailyBuffs.jackBoost) {
      friendGain += 1;
    }
    friend = clamp(friend + friendGain, 0, 10);
    cafeData.friendliness[currentOrder.customer.id] = friend;

    if (match && currentOrder.customer.id === "farmer") {
      const pool = [
        { type: "base", item: "coffee" },
        { type: "base", item: "tea" },
        { type: "base", item: "cacao" },
        { type: "toppings", item: "fruit" },
        { type: "toppings", item: "nut" }
      ];
      const pick = pool[Math.floor(Math.random() * pool.length)];
      addItem(cafeData.inventory, pick.type, pick.item, 1);
      failMessage += "\n🌾 Nông dân tặng thêm 1 nguyên liệu.";
    }
    if (match && currentOrder.customer.id === "mechanic") {
      cafeData.dailyBuffs.mechanicShield = true;
    }
    if (match && currentOrder.customer.id === "jack") {
      cafeData.dailyBuffs.jackBoost = true;
    }
    if (match && currentOrder.customer.id === "anhdo") {
      if (Math.random() < 0.3) {
        if (cafeData.inventory.toppings.fruit > 0 || cafeData.inventory.toppings.nut > 0) {
          const steal = cafeData.inventory.toppings.fruit > 0 ? "fruit" : "nut";
          cafeData.inventory.toppings[steal] -= 1;
          failMessage += "\n🧀 Anh Độ xin ké 1 topping.";
        }
      }
    }

    table.order = null;

    while (cafeData.exp >= expNeeded(cafeData.level)) {
      cafeData.exp -= expNeeded(cafeData.level);
      cafeData.level += 1;
    }

    await saveCafeData(Users, senderID, userData);

    const expression = pickExpression(currentOrder.customer.id, finalQuality, match);
    return reply(
      `✅ Phục vụ ${currentOrder.customer.name} xong!\n` +
      `Order: ${currentOrder.drink.name}\n` +
      `Chất lượng: ${finalQuality} | +${reward} xu\n` +
      `Thân thiện +${friendGain} (hiện ${friend}/10)\n` +
      `🗨️ ${expression}` +
      `${failMessage}\n` +
      `${formatStatus(cafeData)}`
    );
  };

  if (!subCommand || subCommand === "help") {
    return reply(
      "☕ quán cafe (lưu ý đây chỉ là bản beta sẽ update thêm sau)\n" +
      "• cf order: xem bàn + khách + quest\n" +
      "• cf b1/b2/b3: mở bàn / pha chế\n" +
      "• cf roll: quay nguyên liệu (tốn vé)\n" +
      "• cf shop: mua vé / nâng cấp\n" +
      "• cf quest: xem quest ngày\n" +
      "• cf bxh: bảng xếp hạng xu\n\n" +
      "Cách chơi nhanh:\n" +
      "1) cf order → xem khách\n" +
      "2) cf b1 → xem order + kho\n" +
      "3) cf b1 <ly> <base> <add> <top1> [top2] → pha chế\n\n" +
      "Cách kiếm vé:\n" +
      "• làm Quest ngày\n" +
      "• Mua vé: cf shop ticket <số vé> (1b VND = 2 vé)\n\n" +
      "Roll:\n" +
      "• cf roll → ra nguyên liệu/cốc/topping\n" +
      "• cf roll gold → dùng vé vàng (hiếm)\n\n" +
      "Nâng cấp:\n" +
      "• cf shop upgrade <marketing|brew|storage|security|premiumCup>\n" +
      "• Marketing: +bàn | Brew: tăng tỷ lệ đồ III | Storage: mở rộng kho\n\n" +
      "Khách thân thiết:\n" +
      "• Phục vụ đúng gu → tăng thân thiện (0–10)\n" +
      "• Thân thiện cao mở buff/bonus\n\n" +
      "Pha nhanh: cf b1 <ly> <base> <add> <top1> [top2]\n" +
      "VD: cf b1 lythuytinh cafe siro trai"
    );
  }

  if (subCommand === "order") {
    fillEmptyTables(cafeData);
    const tableList = formatTables(cafeData.tables);
    const status = formatStatus(cafeData);
    const quests = formatQuestList(cafeData);
    await saveCafeData(Users, senderID, userData);
    return reply(
      `🪑 Các bàn đang có khách:\n${tableList}\n\n${status}\n\n🎯 Quest ngày:\n${quests}\n\nGõ: cf b1 để xem order bàn 1.`
    );
  }

  const tableKey = parseTableKey(subCommand);
  if (tableKey) {
    ensureTables(cafeData);
    const table = cafeData.tables.find(item => item.id === tableKey);
    if (!table) {
      return reply("Bàn này không tồn tại. Gõ cf order để xem bàn.");
    }
    if (args.length > 1) {
      return serveTable(tableKey, args.slice(1));
    }
    if (!table.order) {
      table.order = generateOrder(cafeData);
      await saveCafeData(Users, senderID, userData);
    }
    const orderText = `Khách: ${table.order.customer.name}\nOrder: ${table.order.drink.name}`;
    const inventory = formatInventory(cafeData.inventory);
    const greeting = pickGreeting(table.order.customer.id);
    await saveCafeData(Users, senderID, userData);
    return reply(
      `🧾 Bàn ${tableKey} đây nha!\n${orderText}\n🗨️ ${greeting}\n\n${inventory}\n\nPha: cf b${tableKey} <ly> <base> <add> <top1> [top2]\nVí dụ: cf b${tableKey} lythuytinh cafe siro trai`
    );
  }

  if (subCommand === "roll") {
    if (cafeData.tickets.count <= 0 && cafeData.tickets.gold <= 0) {
      return reply("Hết vé rồi. Đi shop mua hoặc chờ reset nha.");
    }

    let usedGold = false;
    if (cafeData.tickets.gold > 0 && args[1] === "gold") {
      cafeData.tickets.gold -= 1;
      usedGold = true;
    } else {
      cafeData.tickets.count -= 1;
    }

    cafeData.rollStreak += 1;

    const loot = pickRollLoot(cafeData.rollStreak, usedGold);
    let addedMessage = "";
    if (loot.type === "gold") {
      cafeData.tickets.gold += loot.amount;
    } else {
      addItem(cafeData.inventory, loot.type, loot.item, loot.amount);
    }

    const capacity = maxStorage();
    if (Number.isFinite(capacity)) {
      const currentCount = totalInventoryCount(cafeData.inventory);
      if (currentCount > capacity) {
        const overflow = currentCount - capacity;
        const shield = cafeData.dailyBuffs && cafeData.dailyBuffs.mechanicShield ? 1 : 0;
        const adjustedOverflow = Math.max(0, overflow - shield);
        if (loot.type !== "gold") {
          const currentItem = cafeData.inventory[loot.type][loot.item];
          const removeAmount = Math.min(adjustedOverflow, currentItem);
          cafeData.inventory[loot.type][loot.item] = Math.max(0, currentItem - removeAmount);
          if (removeAmount > 0) {
            addedMessage = `\nKho full, rơi mất ${removeAmount} món.`;
          }
        }
      }
    }

    await saveCafeData(Users, senderID, userData);

    const ticketType = usedGold ? "🎫 Vé vàng" : "🎫 Vé thường";
    return reply(
      `${ticketType} roll ra: ${formatLoot(loot)}${addedMessage}\n` +
      `Vé còn lại: ${cafeData.tickets.count} (+${cafeData.tickets.gold} vàng)`
    );
  }

  if (subCommand === "shop") {
    const action = (args[1] || "").toLowerCase();

    if (!action || action === "list") {
      return reply(
        "🛒 Shop cafe\n" +
        `• cf shop ticket [số vé] → 1b VND = ${TICKET_PACK_AMOUNT} vé (max ${DAILY_BUY_TICKETS_LIMIT}/ngày)\n` +
        "• cf shop upgrade <marketing|brew|storage|security|premiumCup>\n" +
        `Xu hiện có: ${cafeData.coins}`
      );
    }

    if (action === "ticket") {
      const requested = Number(args[2] || TICKET_PACK_AMOUNT);
      if (!Number.isFinite(requested) || requested <= 0) {
        return reply("Nhập số vé hợp lệ. Ví dụ: cf shop ticket 10");
      }
      if (cafeData.tickets.dailyBought >= DAILY_BUY_TICKETS_LIMIT) {
        return reply("Hôm nay mua đủ vé rồi, mai quay lại nhé.");
      }
      const money = (await Currencies.getData(senderID)).money || 0;
      if (cafeData.tickets.count >= MAX_TICKETS) {
        return reply("Vé đã max, xài bớt đã.");
      }
      const remainingDaily = DAILY_BUY_TICKETS_LIMIT - cafeData.tickets.dailyBought;
      const canBuy = Math.min(requested, MAX_TICKETS - cafeData.tickets.count, remainingDaily);
      if (canBuy <= 0) {
        return reply("Limit vé hôm nay đã full rồi.");
      }
      const packsNeeded = Math.ceil(canBuy / TICKET_PACK_AMOUNT);
      const totalCost = packsNeeded * TICKET_PACK_PRICE_VND;
      if (money < totalCost) {
        return reply(`Không đủ VND. Cần ${totalCost} VND để mua ${canBuy} vé.`);
      }
      await Currencies.decreaseMoney(senderID, totalCost);
      cafeData.tickets.count += canBuy;
      cafeData.tickets.dailyBought += canBuy;
      await saveCafeData(Users, senderID, userData);
      return reply(`✅ Mua ${canBuy} vé. Vé hiện tại: ${cafeData.tickets.count}`);
    }

    if (action === "upgrade") {
      const upgradeKey = (args[2] || "").toLowerCase();
      if (!UPGRADE_BASE_COST[upgradeKey]) {
        return reply("Nâng cấp hợp lệ: marketing | brew | storage | security | premiumCup");
      }
      const currentLevel = cafeData.upgrades[upgradeKey];
      const price = Math.round(UPGRADE_BASE_COST[upgradeKey] * Math.pow(1.8, currentLevel));
      if (cafeData.coins < price) {
        return reply(`Thiếu xu. Cần ${price} xu.`);
      }
      cafeData.coins -= price;
      cafeData.upgrades[upgradeKey] += 1;
      await saveCafeData(Users, senderID, userData);
      return reply(`✅ Up ${upgradeKey} → Lv${cafeData.upgrades[upgradeKey]} (tốn ${price} xu)`);
    }

    return reply("Dùng: cf shop ticket | cf shop upgrade <tên>");
  }

  if (subCommand === "quest") {
    const quests = formatQuestList(cafeData);
    await saveCafeData(Users, senderID, userData);
    return reply(`🎯 Quest ngày:\n${quests}`);
  }

  if (subCommand === "bxh") {
    let allUsers = [];
    try {
      allUsers = await Users.getAll(["userID", "name", "data"]);
    } catch (error) {
      return reply("BXH đang lag, thử lại sau nha.");
    }

    const rankings = allUsers
      .map(item => ({
        userID: String(item.userID),
        coins: (item.data && item.data.cafeGame && item.data.cafeGame.coins) || 0
      }))
      .filter(item => item.coins > 0)
      .sort((a, b) => b.coins - a.coins)
      .slice(0, 10);

    if (rankings.length === 0) {
      return reply("BXH trống, mở quán đi đã.");
    }

    const lines = await Promise.all(rankings.map(async (item, index) => {
      const found = allUsers.find(user => String(user.userID) === item.userID);
      const name = found && found.name ? found.name : item.userID;
      return `${index + 1}. ${name} — ${item.coins} xu`;
    }));

    return reply(`🏆 BXH Cafe\n${lines.join("\n")}`);
  }

  return reply("Lệnh chưa đúng. Gõ cf help để xem cách chơi.");
};

module.exports.handleEvent = async function ({ api, event, Currencies, Users }) {
  const { senderID, threadID } = event;
  if (!senderID || !threadID) return;

  const userData = await Users.getData(senderID);
  const data = userData.data && typeof userData.data === "object" ? userData.data : {};
  if (!data.cafeGame) return;

  const cafeData = data.cafeGame;
  checkDailyReset(cafeData);

  const completed = [];
  completed.push(...updateQuestProgress(cafeData, "message", 1));

  const attachments = []
    .concat(event.attachments || [])
    .concat((event.messageReply && event.messageReply.attachments) || []);
  const hasPhoto = attachments.some(att => att.type === "photo" || att.type === "animated_image");
  const hasSticker = attachments.some(att => att.type === "sticker") || !!event.stickerID;
  const hasVoice = attachments.some(att => att.type === "audio" || att.type === "voice" || att.type === "sound");

  if (hasPhoto) completed.push(...updateQuestProgress(cafeData, "image", 1));
  if (hasSticker) completed.push(...updateQuestProgress(cafeData, "sticker", 1));
  if (hasVoice) completed.push(...updateQuestProgress(cafeData, "voice", 1));

  const hasMention = event.mentions && Object.keys(event.mentions).length > 0;
  const body = (event.body || "").toLowerCase();
  const morningRegex = /chúc.*(buổi\s*sáng|sáng)\s*(vui|vẻ)?/i;
  if (hasMention && morningRegex.test(body)) {
    completed.push(...updateQuestProgress(cafeData, "morning_tag", 1));
  }

  const rewards = applyQuestRewards(cafeData, completed, MAX_TICKETS);
  if (rewards.length) {
    const lines = rewards.map(item => `🎯 Quest xong: ${item.label} → +${item.gained} vé`);
    api.sendMessage(lines.join("\n"), threadID);
  }

  if (grantGoldTicketIfReady(cafeData)) {
    api.sendMessage("✨ Hoàn thành toàn bộ quest (trừ nhắn tin) → +1 vé vàng!", threadID);
  }

  userData.data = data;
  await saveCafeData(Users, senderID, userData);
};
