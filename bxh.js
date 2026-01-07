/**
 * top.js — Cyberpunk Leaderboard (Top 1–3 Avatar Cards + Top 10 Table)
 * - Mode: boxmoney | svmoney
 * - UI: dark / neon / game-like (no 3D podium)
 * - Money: Top cards show short format (2.8T / 300B), table can show full or short (config)
 */

"use strict";

const fs = require("fs");
const path = require("path");
const moment = require("moment-timezone");
const { createCanvas, registerFont, loadImage } = require("canvas");

const CANVAS_SIZE = 1200;
const CACHE_DIR = path.join(__dirname, "cache");
const AVATAR_CACHE = new Map();
const EMOJI_CACHE = new Map();
const EMOJI_ICON_BASE = "https://twemoji.maxcdn.com/v/latest/72x72/";

// ========== CONFIG UI ==========
const SHOW_PERCENT_COLUMN = true; // cột "% vs Top 1"
const TABLE_MONEY_SHORT = false;  // true = table dùng 2.8T/300B, false = full number

module.exports.config = {
  name: "bxh",
  version: "1.2.1",
  credits: "Vanloi",
  hasPermssion: 0,
  description: "bxh Top Money",
  usages: "bxh [boxmoney|svmoney] [length] (default length=10, max=30)",
  commandCategory: "Tiện ích",
  cooldowns: 5
};

module.exports.run = async function ({ api, event, args, Currencies, Users }) {
  const { threadID, messageID, senderID, participantIDs } = event;

  const type = (args[0] || "").toLowerCase();
  const allType = ["boxmoney", "svmoney"];
  if (!allType.includes(type)) {
    return api.sendMessage(
      "╔══════════════╗\n" +
        "   ✅ 𝐂𝐇𝐄𝐂𝐊 𝐓𝐎𝐏\n" +
        "╚══════════════╝\n" +
        "→ #bxh boxmoney: Top money trong nhóm\n" +
        "→ #bxh svmoney: Top money toàn server\n" +
        "VD: #bxh boxmoney 10",
      threadID,
      messageID
    );
  }

  const lengthArg = parseInt(args[1], 10);
  const length = Math.min(30, Math.max(5, Number.isNaN(lengthArg) ? 10 : lengthArg));

  const rows = await buildLeaderboard({ type, participantIDs, Currencies, Users, length });
  if (!rows.length) return api.sendMessage("Không có dữ liệu để hiển thị.", threadID, messageID);

  const top1 = rows[0];
  const top3 = rows.slice(0, 3);
  const top10 = rows.slice(0, 10);
  const youRow = await buildYouRow({ rows: top10, senderID, type, Currencies, Users, top1 });

  const timeStr = moment.tz("Asia/Ho_Chi_Minh").format("HH:mm • DD/MM/YYYY");

  const imageBuffer = await renderLeaderboardImage({
    top3,
    list: top10,
    youRow,
    mode: type,
    timeStr,
    top1Money: top1.money
  });

  if (!fs.existsSync(CACHE_DIR)) fs.mkdirSync(CACHE_DIR, { recursive: true });

  const outputPath = path.join(CACHE_DIR, `top_${Date.now()}.png`);
  fs.writeFileSync(outputPath, imageBuffer);

  // ✅ CHỈ CÒN 1 DÒNG "LEADERBOARD" (không còn TOP MONEY / You / % ...)
  const caption = "LEADERBOARD";

  return api.sendMessage(
    { body: caption, attachment: fs.createReadStream(outputPath) },
    threadID,
    () => {
      try { fs.unlinkSync(outputPath); } catch (_) {}
    },
    messageID
  );
};

// ================== DATA ==================

function formatMoney(value) {
  return (Number(value) || 0).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

function formatShortMoney(n) {
  n = Number(n) || 0;
  const abs = Math.abs(n);

  const fmt = (v, suf) =>
    (Math.round(v * 10) / 10).toFixed(1).replace(/\.0$/, "") + suf;

  if (abs >= 1e12) return fmt(n / 1e12, "T");
  if (abs >= 1e9) return fmt(n / 1e9, "B");
  if (abs >= 1e6) return fmt(n / 1e6, "M");
  if (abs >= 1e3) return fmt(n / 1e3, "K");
  return (Number(n) || 0).toLocaleString("en-US", { maximumFractionDigits: 2 });
}

function createNameCache(Users) {
  const cache = new Map();
  return async (id) => {
    if (cache.has(id)) return cache.get(id);
    const name = (await Users.getData(id))?.name || "Unknown";
    cache.set(id, name);
    return name;
  };
}

async function buildLeaderboard({ type, participantIDs, Currencies, Users, length }) {
  const getName = createNameCache(Users);
  let entries = [];

  if (type === "boxmoney") {
    for (const id of participantIDs) {
      const data = await Currencies.getData(id);
      if (!data) continue;
      entries.push({ id, money: data.money || 0 });
    }
  }

  if (type === "svmoney") {
    const data = await Currencies.getAll(["userID", "money"]);
    entries = data.map((item) => ({ id: item.userID, money: item.money || 0 }));
  }

  entries.sort((a, b) => b.money - a.money);
  const sliced = entries.slice(0, length);

  const rows = [];
  for (let i = 0; i < sliced.length; i++) {
    const name = await getName(sliced[i].id);
    rows.push({
      rank: i + 1,
      rankLabel: `[${i + 1}]`,
      id: sliced[i].id,
      name,
      money: sliced[i].money
    });
  }
  return rows;
}

async function buildYouRow({ rows, senderID, type, Currencies, Users, top1 }) {
  const youEntry = rows.find((row) => row.id === senderID);
  if (youEntry) {
    return {
      rankLabel: youEntry.rankLabel,
      name: "You",
      money: youEntry.money,
      percent: top1.money > 0 ? (youEntry.money / top1.money) * 100 : 0
    };
  }

  let money = 0;
  if (type === "boxmoney" || type === "svmoney") {
    const data = await Currencies.getData(senderID);
    if (data) money = data.money || 0;
  }

  const name = (await Users.getData(senderID))?.name || "You";
  return {
    rankLabel: "UNRANKED",
    name,
    money,
    percent: top1.money > 0 ? (money / top1.money) * 100 : 0
  };
}

// ================== RENDER ==================

async function renderLeaderboardImage({ top3, list, youRow, mode, timeStr, top1Money }) {
  registerFonts();

  const canvas = createCanvas(CANVAS_SIZE, CANVAS_SIZE);
  const ctx = canvas.getContext("2d");

  // background
  ctx.fillStyle = "#050607";
  ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
  drawVignette(ctx);
  drawNoise(ctx);

  // header
  drawHeader(ctx, timeStr);

  // top region
  const topRegion = { x: 0, y: 140, w: CANVAS_SIZE, h: 520 };
  drawGridBackground(ctx, topRegion);
  await drawTopCards(ctx, topRegion, top3);

  // table region
  const tableRegion = { x: 60, y: 690, w: CANVAS_SIZE - 120, h: 470 };
  drawTable(ctx, tableRegion.x, tableRegion.y, tableRegion.w, tableRegion.h, list, youRow, top1Money);

  return canvas.toBuffer("image/png");
}

function registerFonts() {
  const fonts = [
    { file: "SplineSans.ttf", family: "SplineSans" },
    { file: "SplineSans-Medium.ttf", family: "SplineSansMedium" },
    { file: "Play-Bold.ttf", family: "PlayBold" }
  ];

  fonts.forEach((f) => {
    const fp = path.join(__dirname, f.file);
    if (fs.existsSync(fp)) registerFont(fp, { family: f.family });
  });
}

// ✅ Header: bỏ mode (SVMONEY/BOXMONEY), chỉ giữ ngày giờ
function drawHeader(ctx, timeStr) {
  ctx.save();
  ctx.textAlign = "center";

  drawGlowText(ctx, "Bxh Tiền", CANVAS_SIZE / 2, 70, {
    font: '72px "PlayBold", "SplineSans", sans-serif',
    color: "#47ff7a",
    glowColor: "#38ff6a"
  });

  const sub = `╔═【 ${timeStr} 】═╗`;
  ctx.font = '22px "SplineSansMedium", "SplineSans", monospace';
  ctx.fillStyle = "rgba(255,255,255,0.78)";
  ctx.fillText(sub, CANVAS_SIZE / 2, 118);

  ctx.restore();
}

function drawGridBackground(ctx, region) {
  ctx.save();
  ctx.strokeStyle = "rgba(71,255,122,0.05)";
  ctx.lineWidth = 1;

  const gridSize = 40;
  for (let x = region.x; x <= region.x + region.w; x += gridSize) {
    ctx.beginPath();
    ctx.moveTo(x, region.y + 20);
    ctx.lineTo(x, region.y + region.h - 20);
    ctx.stroke();
  }
  for (let y = region.y + 20; y <= region.y + region.h - 20; y += gridSize) {
    ctx.beginPath();
    ctx.moveTo(region.x + 80, y);
    ctx.lineTo(region.x + region.w - 80, y);
    ctx.stroke();
  }
  ctx.restore();
}

function drawGlowText(ctx, text, x, y, { font, color, glowColor }) {
  ctx.save();
  ctx.font = font;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  ctx.fillStyle = glowColor;
  ctx.shadowColor = glowColor;
  ctx.shadowBlur = 26;
  ctx.globalAlpha = 0.2;
  ctx.fillText(text, x, y);

  ctx.shadowBlur = 16;
  ctx.globalAlpha = 0.55;
  ctx.fillText(text, x, y);

  ctx.shadowBlur = 0;
  ctx.globalAlpha = 1;
  ctx.fillStyle = color;
  ctx.fillText(text, x, y);

  ctx.restore();
}

// ================== TOP 1-3 CARDS (NO OVERLAP) ==================

function neonStroke(ctx, x, y, w, h, color, blur = 16, line = 2) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = line;
  ctx.shadowColor = color;
  ctx.shadowBlur = blur;
  ctx.strokeRect(x, y, w, h);
  ctx.restore();
}

function glassCard(ctx, x, y, w, h) {
  ctx.save();

  ctx.fillStyle = "rgba(255,255,255,0.030)";
  ctx.fillRect(x, y, w, h);

  const g = ctx.createLinearGradient(x, y, x, y + h);
  g.addColorStop(0, "rgba(255,255,255,0.10)");
  g.addColorStop(0.5, "rgba(255,255,255,0.03)");
  g.addColorStop(1, "rgba(0,0,0,0.45)");
  ctx.fillStyle = g;
  ctx.fillRect(x, y, w, h);

  ctx.strokeStyle = "rgba(255,255,255,0.09)";
  ctx.lineWidth = 1;
  ctx.strokeRect(x + 6, y + 6, w - 12, h - 12);

  ctx.globalAlpha = 0.07;
  ctx.fillStyle = "#ffffff";
  for (let yy = y + 12; yy < y + h - 12; yy += 6) {
    ctx.fillRect(x + 10, yy, w - 20, 1);
  }
  ctx.globalAlpha = 1;

  ctx.restore();
}

function rankBadge(ctx, x, y, text, color, icon) {
  ctx.save();
  ctx.font = '14px "SplineSansMedium", "SplineSans", sans-serif';

  const padX = 10;
  const tw = ctx.measureText(text).width;
  const iconSize = 16;
  const iconGap = icon ? 6 : 0;
  const w = tw + padX * 2 + (icon ? iconSize + iconGap : 0);
  const h = 28;

  ctx.fillStyle = "rgba(0,0,0,0.50)";
  ctx.fillRect(x, y, w, h);

  neonStroke(ctx, x, y, w, h, color, 12, 2);

  ctx.fillStyle = "rgba(255,255,255,0.93)";
  ctx.textBaseline = "middle";
  ctx.textAlign = "left";
  if (icon) {
    ctx.drawImage(icon, x + padX, y + (h - iconSize) / 2, iconSize, iconSize);
  }
  ctx.fillText(text, x + padX + (icon ? iconSize + iconGap : 0), y + h / 2 + 0.5);

  ctx.restore();
}

function holoRing(ctx, x, y, size, color) {
  ctx.save();
  ctx.globalAlpha = 0.85;

  ctx.shadowColor = color;
  ctx.shadowBlur = 18;
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.strokeRect(x - 6, y - 6, size + 12, size + 12);

  ctx.globalAlpha = 0.18;
  ctx.lineWidth = 10;
  ctx.strokeRect(x - 10, y - 10, size + 20, size + 20);

  ctx.restore();
}

async function drawTopCards(ctx, region, top3) {
  const center = CANVAS_SIZE / 2;

  const C1 = "#47ff7a";
  const C2 = "#50d2ff";
  const C3 = "#b45aff";
  const badgeIcons = await loadBadgeIcons();

  const baseY = region.y + 110;

  const bigW = 420, bigH = 320;
  const smallW = 330, smallH = 260;
  const gap = 40;

  const totalW = smallW + gap + bigW + gap + smallW;
  const startX = center - totalW / 2;

  const cards = [
    { rank: 2, x: startX, y: baseY + 36, w: smallW, h: smallH, c: C2 },
    { rank: 1, x: startX + smallW + gap, y: baseY, w: bigW, h: bigH, c: C1 },
    { rank: 3, x: startX + smallW + gap + bigW + gap, y: baseY + 36, w: smallW, h: smallH, c: C3 }
  ];

  ctx.save();
  ctx.globalAlpha = 0.11;
  const rg = ctx.createRadialGradient(center, region.y + 290, 80, center, region.y + 290, 560);
  rg.addColorStop(0, "#47ff7a");
  rg.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = rg;
  ctx.fillRect(0, region.y + 70, CANVAS_SIZE, 520);
  ctx.restore();

  for (const k of cards) {
    const u =
      top3.find((i) => i.rank === k.rank) ||
      top3[k.rank - 1] ||
      { name: "Unknown", money: 0, id: null };

    glassCard(ctx, k.x, k.y, k.w, k.h);
    neonStroke(ctx, k.x, k.y, k.w, k.h, k.c, 20, k.rank === 1 ? 2.8 : 2.1);

    ctx.save();
    ctx.strokeStyle = k.c;
    ctx.globalAlpha = 0.65;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(k.x + 14, k.y + 14);
    ctx.lineTo(k.x + 76, k.y + 14);
    ctx.moveTo(k.x + 14, k.y + 14);
    ctx.lineTo(k.x + 14, k.y + 76);
    ctx.moveTo(k.x + k.w - 14, k.y + k.h - 14);
    ctx.lineTo(k.x + k.w - 76, k.y + k.h - 14);
    ctx.moveTo(k.x + k.w - 14, k.y + k.h - 14);
    ctx.lineTo(k.x + k.w - 14, k.y + k.h - 76);
    ctx.stroke();
    ctx.restore();

    const icon =
      k.rank === 1 ? badgeIcons?.gold :
      k.rank === 2 ? badgeIcons?.silver :
      badgeIcons?.bronze;

    rankBadge(
      ctx,
      k.x + 18,
      k.y + 18,
      k.rank === 1 ? "TOP 1" : k.rank === 2 ? "TOP 2" : "TOP 3",
      k.c,
      icon
    );

    const av = k.rank === 1 ? 132 : 112;
    const avX = k.x + 22;
    const avY = k.y + 66;

    holoRing(ctx, avX, avY, av, k.c);
    await drawAvatar(ctx, avX, avY, av, u.name, u.id, k.c);

    ctx.save();
    ctx.textAlign = "left";
    ctx.textBaseline = "top";

    ctx.fillStyle = "rgba(255,255,255,0.92)";
    ctx.font = k.rank === 1 ? '22px "SplineSansMedium"' : '19px "SplineSansMedium"';
    ctx.fillText(fitTextEllipsis(ctx, u.name, k.w - av - 78), avX + av + 18, avY + 6);

    ctx.fillStyle = k.c;
    ctx.font = k.rank === 1 ? '38px "SplineSansMedium"' : '30px "SplineSansMedium"';
    ctx.fillText(formatShortMoney(u.money || 0), avX + av + 18, avY + 54);

    ctx.fillStyle = "rgba(255,255,255,0.42)";
    ctx.font = '12px "SplineSans"';
    ctx.fillText("MONEY", avX + av + 18, avY + 102);

    ctx.restore();
  }
}

// ================== AVATAR ==================

async function loadAvatar(id) {
  if (!id) return null;
  if (AVATAR_CACHE.has(id)) return AVATAR_CACHE.get(id);

  const url = `https://graph.facebook.com/${id}/picture?height=256&width=256`;

  try {
    const img = await loadImage(url);
    AVATAR_CACHE.set(id, img);

    if (AVATAR_CACHE.size > 250) {
      const firstKey = AVATAR_CACHE.keys().next().value;
      AVATAR_CACHE.delete(firstKey);
    }
    return img;
  } catch (e) {
    AVATAR_CACHE.set(id, null);
    if (AVATAR_CACHE.size > 250) {
      const firstKey = AVATAR_CACHE.keys().next().value;
      AVATAR_CACHE.delete(firstKey);
    }
    return null;
  }
}

function emojiToCodePoint(emoji) {
  return Array.from(emoji)
    .map((symbol) => symbol.codePointAt(0).toString(16))
    .join("-");
}

async function loadEmojiIcon(emoji) {
  if (EMOJI_CACHE.has(emoji)) return EMOJI_CACHE.get(emoji);

  try {
    const url = `${EMOJI_ICON_BASE}${emojiToCodePoint(emoji)}.png`;
    const img = await loadImage(url);
    EMOJI_CACHE.set(emoji, img);
    return img;
  } catch (e) {
    EMOJI_CACHE.set(emoji, null);
    return null;
  }
}

async function loadBadgeIcons() {
  const [gold, silver, bronze] = await Promise.all([
    loadEmojiIcon("🥇"),
    loadEmojiIcon("🥈"),
    loadEmojiIcon("🥉")
  ]);
  return { gold, silver, bronze };
}

async function drawAvatar(ctx, x, y, size, name, id, rankColor) {
  const initials = (name || "?")
    .split(" ")
    .filter(Boolean)
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  ctx.save();

  ctx.fillStyle = "#0b0f12";
  ctx.fillRect(x, y, size, size);

  const avatar = await loadAvatar(id);
  if (avatar) {
    const pixelSize = 34;
    const tempCanvas = createCanvas(pixelSize, pixelSize);
    const tctx = tempCanvas.getContext("2d");

    tctx.imageSmoothingEnabled = false;
    tctx.drawImage(avatar, 0, 0, pixelSize, pixelSize);

    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(tempCanvas, x + 4, y + 4, size - 8, size - 8);
    ctx.imageSmoothingEnabled = true;
  } else {
    ctx.fillStyle = "rgba(71,255,122,0.18)";
    ctx.fillRect(x + 4, y + 4, size - 8, size - 8);

    ctx.fillStyle = "#1a1f24";
    for (let i = 0; i < 8; i++) {
      ctx.fillRect(x + 8 + i * 10, y + 8, 6, 6);
      ctx.fillRect(x + 8 + i * 10, y + size - 14, 6, 6);
    }

    ctx.fillStyle = "rgba(255,255,255,0.92)";
    ctx.font = `bold ${Math.max(22, Math.floor(size / 4))}px "SplineSans"`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(initials || "U", x + size / 2, y + size / 2 + 2);
  }

  ctx.strokeStyle = rankColor;
  ctx.lineWidth = 2;
  ctx.shadowColor = rankColor;
  ctx.shadowBlur = 14;
  ctx.strokeRect(x, y, size, size);

  ctx.restore();
}

// ================== TABLE ==================

function drawTable(ctx, x, y, w, h, rows, youRow, top1Money) {
  ctx.save();

  ctx.fillStyle = "rgba(255,255,255,0.035)";
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = "rgba(255,255,255,0.08)";
  ctx.strokeRect(x, y, w, h);

  const headerHeight = 52;
  ctx.fillStyle = "rgba(255,255,255,0.06)";
  ctx.fillRect(x, y, w, headerHeight);

  ctx.save();
  ctx.strokeStyle = "rgba(71,255,122,0.35)";
  ctx.lineWidth = 2;
  ctx.shadowColor = "rgba(71,255,122,0.55)";
  ctx.shadowBlur = 10;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + w, y);
  ctx.stroke();
  ctx.restore();

  const rowHeight = 36;

  const colRank = 140;
  const colPlayer = SHOW_PERCENT_COLUMN ? 520 : 640;
  const colPct = SHOW_PERCENT_COLUMN ? 180 : 0;

  const colXRank = x + 20;
  const colXPlayer = x + colRank + 40;
  const colXMoneyRight = x + w - 30 - (SHOW_PERCENT_COLUMN ? colPct : 0);
  const colXPctRight = x + w - 30;

  ctx.fillStyle = "rgba(255,255,255,0.45)";
  ctx.font = '14px "SplineSans", sans-serif';
  ctx.textBaseline = "middle";

  ctx.textAlign = "left";
  ctx.fillText("RANK", colXRank, y + headerHeight / 2);
  ctx.fillText("PLAYER", colXPlayer, y + headerHeight / 2);

  ctx.textAlign = "right";
  ctx.fillText("MONEY", colXMoneyRight, y + headerHeight / 2);

  if (SHOW_PERCENT_COLUMN) {
    ctx.fillStyle = "rgba(255,255,255,0.38)";
    ctx.fillText("% VS TOP 1", colXPctRight, y + headerHeight / 2);
  }

  ctx.strokeStyle = "rgba(255,255,255,0.06)";
  ctx.lineWidth = 1;

  ctx.beginPath();
  ctx.moveTo(colXPlayer - 20, y);
  ctx.lineTo(colXPlayer - 20, y + h);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(colXMoneyRight + 20, y);
  ctx.lineTo(colXMoneyRight + 20, y + h);
  ctx.stroke();

  if (SHOW_PERCENT_COLUMN) {
    ctx.beginPath();
    ctx.moveTo(colXPctRight - colPct + 10, y);
    ctx.lineTo(colXPctRight - colPct + 10, y + h);
    ctx.stroke();
  }

  const dataRows = [
    { rankLabel: youRow.rankLabel, name: "⭐ You", money: youRow.money, percent: youRow.percent, isYou: true },
    ...rows.map((r) => ({
      rankLabel: r.rankLabel,
      name: r.name,
      money: r.money,
      percent: top1Money > 0 ? (r.money / top1Money) * 100 : 0
    }))
  ];

  const rankColors = { "[1]": "#47ff7a", "[2]": "#50d2ff", "[3]": "#b45aff" };

  ctx.font = '15px "SplineSans", sans-serif';
  for (let i = 0; i < dataRows.length; i++) {
    const rowY = y + headerHeight + i * rowHeight;
    if (rowY + rowHeight > y + h) break;

    const rowData = dataRows[i];

    if (["[1]", "[2]", "[3]"].includes(rowData.rankLabel)) {
      ctx.save();
      const glow =
        rowData.rankLabel === "[1]" ? "rgba(71,255,122,0.10)" :
        rowData.rankLabel === "[2]" ? "rgba(80,210,255,0.08)" :
        "rgba(180,90,255,0.08)";
      ctx.fillStyle = glow;
      ctx.fillRect(x + 1, rowY + 1, w - 2, rowHeight - 2);
      ctx.restore();
    }

    if (rowData.isYou) {
      ctx.save();
      ctx.fillStyle = "rgba(255,180,82,0.10)";
      ctx.fillRect(x + 1, rowY + 1, w - 2, rowHeight - 2);
      ctx.restore();
    }

    ctx.strokeStyle = "rgba(255,255,255,0.06)";
    ctx.beginPath();
    ctx.moveTo(x, rowY + rowHeight);
    ctx.lineTo(x + w, rowY + rowHeight);
    ctx.stroke();

    let c = "rgba(255,255,255,0.88)";
    if (rowData.isYou) c = "#ffb452";
    else if (rankColors[rowData.rankLabel]) c = rankColors[rowData.rankLabel];

    ctx.textAlign = "left";
    ctx.fillStyle = c;
    ctx.fillText(rowData.rankLabel, colXRank, rowY + rowHeight / 2);

    ctx.fillStyle = c;
    ctx.fillText(fitTextEllipsis(ctx, rowData.name, colPlayer - 50), colXPlayer, rowY + rowHeight / 2);

    ctx.textAlign = "right";
    ctx.fillStyle = "rgba(255,255,255,0.88)";
    const moneyText = TABLE_MONEY_SHORT ? formatShortMoney(rowData.money) : formatMoney(rowData.money);
    ctx.fillText(moneyText, colXMoneyRight, rowY + rowHeight / 2);

    if (SHOW_PERCENT_COLUMN) {
      ctx.fillStyle = "rgba(255,255,255,0.65)";
      ctx.fillText(`${(rowData.percent || 0).toFixed(1)}%`, colXPctRight, rowY + rowHeight / 2);
    }
  }

  ctx.restore();
}

function fitTextEllipsis(ctx, text, maxWidth) {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let t = String(text || "");
  while (t.length > 0 && ctx.measureText(t + "...").width > maxWidth) {
    t = t.slice(0, -1);
  }
  return t + "...";
}

// ================== FX (VIGNETTE + NOISE) ==================

function drawVignette(ctx) {
  const g = ctx.createRadialGradient(
    CANVAS_SIZE / 2,
    CANVAS_SIZE / 2,
    CANVAS_SIZE / 3,
    CANVAS_SIZE / 2,
    CANVAS_SIZE / 2,
    CANVAS_SIZE / 1.08
  );
  g.addColorStop(0, "rgba(0,0,0,0)");
  g.addColorStop(1, "rgba(0,0,0,0.68)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
}

function drawNoise(ctx) {
  const noiseCanvas = createCanvas(CANVAS_SIZE, CANVAS_SIZE);
  const nctx = noiseCanvas.getContext("2d");
  const imageData = nctx.createImageData(CANVAS_SIZE, CANVAS_SIZE);

  for (let i = 0; i < imageData.data.length; i += 4) {
    const v = Math.floor(Math.random() * 22);
    imageData.data[i] = v;
    imageData.data[i + 1] = v;
    imageData.data[i + 2] = v;
    imageData.data[i + 3] = 16;
  }

  nctx.putImageData(imageData, 0, 0);
  ctx.globalCompositeOperation = "soft-light";
  ctx.drawImage(noiseCanvas, 0, 0);
  ctx.globalCompositeOperation = "source-over";
}
