"use strict";

module.exports.config = {
  name: "upt",
  version: "5.2.0",
  hasPermission: 0,
  credits: "Vanloi",
  description: "SYSTEM DASHBOARD • PROD (Corporate • Realistic Spoof • Public Safe)",
  commandCategory: "Hệ Thống",
  usages: "",
  cooldowns: 10
};

// ====== CONFIG ======
const AUTO_EFFECT = "love";
const THREAD_COOLDOWN_MS = 30 * 1000; // 30s / thread

// ====== COOLDOWN MAP ======
const threadCooldown = new Map();

// ====== deterministic RNG ======
function hash32(str) {
  // FNV-1a 32-bit
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

function mulberry32(seed) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function pick(rng, arr) {
  return arr[Math.floor(rng() * arr.length)];
}

function pad2(n) {
  return String(n).padStart(2, "0");
}

function fmtUptimeLike(days) {
  const d = Math.floor(days);
  const remain = (days - d) * 24 * 3600;
  const h = Math.floor(remain / 3600);
  const m = Math.floor((remain % 3600) / 60);
  const s = Math.floor(remain % 60);
  return `${String(d).padStart(2, "0")}d ${pad2(h)}:${pad2(m)}:${pad2(s)}`;
}

// ====== SPOOF PROFILES (realistic pool) ======
const CPU_MODELS = [
  "Intel Xeon Gold 6230R",
  "Intel Xeon Gold 6338",
  "Intel Xeon E5-2690 v4",
  "AMD EPYC 7B12",
  "AMD EPYC 7452",
  "Intel Xeon Silver 4214R"
];

const OS_CHOICES = [
  { name: "Ubuntu 22.04 LTS", arch: "x64" },
  { name: "Ubuntu 20.04 LTS", arch: "x64" },
  { name: "Debian 12 (bookworm)", arch: "x64" }
];

const RUNTIME_CHOICES = [
  "v20.x | PM2 cluster + Docker",
  "v20.x | PM2 cluster",
  "v20.x | Docker + process manager"
];

const REGION_CHOICES = ["Vietnam", "SEA", "SG", "APAC"];

function pickTierProfile(rng) {
  // 3 tier để realistic: small/standard/pro
  // (tất cả đều “đẹp”, không quá lố, không quá cùi)
  const tiers = [
    // small
    {
      weight: 30,
      cores: [2, 4],
      ramGB: [4, 8],
      diskTB: [0.12, 0.24, 0.5]
    },
    // standard
    {
      weight: 50,
      cores: [4, 6, 8],
      ramGB: [8, 16],
      diskTB: [0.24, 0.5, 1.0]
    },
    // pro
    {
      weight: 20,
      cores: [8, 12, 16],
      ramGB: [16, 32],
      diskTB: [1.0, 2.0]
    }
  ];

  const total = tiers.reduce((s, t) => s + t.weight, 0);
  let x = rng() * total;
  for (const t of tiers) {
    x -= t.weight;
    if (x <= 0) return t;
  }
  return tiers[1];
}

function buildSpoofedDashboard({ threadID }) {
  // ổn định theo ngày + group
  const now = new Date();
  const dayKey = `${now.getUTCFullYear()}-${pad2(now.getUTCMonth() + 1)}-${pad2(now.getUTCDate())}`;
  const seed = hash32(`${dayKey}|${threadID}|upt-spoof-v1`);
  const rng = mulberry32(seed);

  // giờ VN (UTC+7) để tạo peak hợp lý
  const vnHour = (now.getUTCHours() + 7) % 24;
  const peakFactor =
    (vnHour >= 19 && vnHour <= 23) ? 1.30 :
    (vnHour >= 12 && vnHour <= 14) ? 1.15 :
    (vnHour >= 0 && vnHour <= 6) ? 0.85 : 1.0;

  // Chọn profile "máy" giả (cpu/ram/disk/os) — ổn định trong ngày
  const tier = pickTierProfile(rng);
  const cpuModel = pick(rng, CPU_MODELS);
  const osPick = pick(rng, OS_CHOICES);
  const runtime = pick(rng, RUNTIME_CHOICES);
  const region = pick(rng, REGION_CHOICES);

  const cores = pick(rng, tier.cores);
  const totalRamGB = pick(rng, tier.ramGB);
  const totalDiskTB = pick(rng, tier.diskTB);

  // Dùng % realistic, rồi suy ra used/free để ra số “đẹp”
  let cpuPct = (4 + rng() * 18) * peakFactor;          // 4..22% thường
  cpuPct = clamp(cpuPct, 2, 55);

  let ramUsedPct = (10 + rng() * 30) * (peakFactor > 1 ? 1.05 : 1.0); // 10..40%
  ramUsedPct = clamp(ramUsedPct, 8, 65);

  let diskUsedPct = 12 + rng() * 35;                  // 12..47%
  diskUsedPct = clamp(diskUsedPct, 8, 70);

  // latency/proc realistic
  let latency = (15 + rng() * 30) * peakFactor; // 15..45, peak lên
  latency = Math.round(clamp(latency, 12, 120));

  let proc = (0.006 + rng() * 0.018) * (peakFactor > 1 ? 1.08 : 1.0);
  proc = clamp(proc, 0.005, 0.050);

  // uptime realistic (30..220d) + jitter theo giờ
  const baseDays = 30 + rng() * 190;
  const jitter = (vnHour / 24) * 0.9 + rng() * 0.05;
  const uptimeStr = fmtUptimeLike(baseDays + jitter);

  // tính used/free hiển thị
  const usedRamGB = (totalRamGB * (ramUsedPct / 100));
  const freeRamGB = Math.max(0, totalRamGB - usedRamGB);

  const usedDiskTB = (totalDiskTB * (diskUsedPct / 100));
  const freeDiskTB = Math.max(0, totalDiskTB - usedDiskTB);

  // format gọn kiểu bạn muốn
  const fmtGB = (n) => n.toFixed(2);
  const fmtTB = (n) => (n >= 1 ? n.toFixed(1) : n.toFixed(2));

  // status corporate
  const status = (latency >= 90 || cpuPct >= 50 || ramUsedPct >= 65) ? "Degraded" : "Operational";

  // build + commit giả "nhẹ" (không random mỗi lần)
  const commit = (hash32(`${dayKey}|${threadID}`)).toString(16).slice(0, 7);
  const buildLine = `stable • commit ${commit}`;

  return {
    status,
    uptimeStr,
    latency,
    proc: proc.toFixed(3),
    cpuModel,
    cpuPct: cpuPct.toFixed(1),
    cores,
    totalRamGB: totalRamGB.toFixed(2),
    usedRamGB: fmtGB(usedRamGB),
    freeRamGB: fmtGB(freeRamGB),
    totalDiskTB: fmtTB(totalDiskTB),
    freeDiskTB: fmtTB(freeDiskTB),
    diskUsedPct: Math.round(diskUsedPct),
    osDetail: `${osPick.name} (${osPick.arch})`,
    nodeLine: runtime,
    buildLine,
    region
  };
}

// ====== MAIN ======
module.exports.run = async ({ api, event }) => {
  const threadID = event.threadID;

  // Anti-spam theo thread
  const t = Date.now();
  const last = threadCooldown.get(threadID) || 0;
  if (t - last < THREAD_COOLDOWN_MS) return;
  threadCooldown.set(threadID, t);

  const m = buildSpoofedDashboard({ threadID });

  const msg =
`╭━━〔 SYSTEM DASHBOARD • PROD 〕━━╮
│ Status     : ${m.status}
│ Uptime     : ${m.uptimeStr}
│ Latency    : ${m.latency}ms  | Proc: ${m.proc}s
├────────── Performance ──────────
│ CPU Model  : ${m.cpuModel}
│ CPU Load   : ${m.cpuPct}%  | Cores: ${m.cores}
│ RAM        : ${m.usedRamGB}GB / ${m.totalRamGB}GB (Free ${m.freeRamGB}GB)
│ Disk Free  : ${m.freeDiskTB}TB / ${m.totalDiskTB}TB (${m.diskUsedPct}% used)
├────────── Runtime ──────────────
│ OS         : ${m.osDetail}
│ Node       : ${m.nodeLine}
│ Build      : ${m.buildLine}
│ Region     : ${m.region}
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯`.trim();

  return api.sendMessage(
    { body: msg, messageEffect: AUTO_EFFECT },
    threadID,
    event.messageID
  );
};

// ====== OPTIONAL KEYWORD TRIGGER ======
module.exports.handleEvent = async ({ event, api }) => {
  const body = (event.body || "").trim().toLowerCase();
  if (!body) return;

  // chỉ trigger khi nhắn đúng từ khoá, tránh spam
  const keywords = ["upt", "uptime", "status"];
  if (keywords.includes(body)) {
    return module.exports.run({ api, event });
  }
};
