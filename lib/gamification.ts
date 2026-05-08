// ─── LEVELS ───────────────────────────────────────────────────────────────────
export const LEVELS = [
  { level: 1, title: "SDR",          minXP: 0,    icon: "🎯", color: "text-gray-400",   bg: "bg-gray-800" },
  { level: 2, title: "Senior SDR",   minXP: 200,  icon: "📞", color: "text-blue-400",   bg: "bg-blue-900/40" },
  { level: 3, title: "Closer",       minXP: 500,  icon: "🔥", color: "text-amber-400",  bg: "bg-amber-900/40" },
  { level: 4, title: "Elite Closer", minXP: 1200, icon: "⚡", color: "text-purple-400", bg: "bg-purple-900/40" },
  { level: 5, title: "Legend",       minXP: 3000, icon: "👑", color: "text-yellow-400", bg: "bg-yellow-900/40" },
];

export function getLevelFromXP(xp: number) {
  return [...LEVELS].reverse().find((l) => xp >= l.minXP) ?? LEVELS[0];
}

export function getNextLevel(xp: number) {
  const idx = LEVELS.findIndex((l) => xp < l.minXP);
  return idx === -1 ? null : LEVELS[idx];
}

export function getXPProgress(xp: number) {
  const current = getLevelFromXP(xp);
  const next = getNextLevel(xp);
  if (!next) return 100;
  return Math.round(((xp - current.minXP) / (next.minXP - current.minXP)) * 100);
}

// ─── BADGES ───────────────────────────────────────────────────────────────────
export interface Badge {
  id: string;
  title: string;
  description: string;
  emoji: string;
  rarity: "common" | "rare" | "epic" | "legendary";
  xpReward: number;
  check: (stats: UserStats) => boolean;
}

export interface UserStats {
  totalCalls: number;
  totalClosed: number;
  totalLeadsScanned: number;
  currentStreak: number;
  bestStreak: number;
  noWebsiteLeadsCalled: number;
  citiesConquered: number;
  totalXP: number;
  warRoomSessions: number;
  speedRoundsCompleted: number;
}

export const BADGES: Badge[] = [
  // Common
  { id: "first_call",      title: "First Blood",      description: "Made your first cold call",              emoji: "📞", rarity: "common",    xpReward: 50,  check: (s) => s.totalCalls >= 1 },
  { id: "ten_calls",       title: "Dialing In",       description: "Made 10 calls",                          emoji: "🔟", rarity: "common",    xpReward: 75,  check: (s) => s.totalCalls >= 10 },
  { id: "first_scan",      title: "Scout",            description: "Ran your first lead scan",               emoji: "🔍", rarity: "common",    xpReward: 30,  check: (s) => s.totalLeadsScanned >= 1 },
  { id: "hundred_leads",   title: "Lead Machine",     description: "Scanned 100+ leads",                     emoji: "🚀", rarity: "common",    xpReward: 100, check: (s) => s.totalLeadsScanned >= 100 },
  // Rare
  { id: "first_close",     title: "Closer",           description: "Closed your first deal",                 emoji: "💰", rarity: "rare",      xpReward: 200, check: (s) => s.totalClosed >= 1 },
  { id: "fifty_calls",     title: "War Veteran",      description: "Made 50 calls",                          emoji: "🎖️", rarity: "rare",      xpReward: 150, check: (s) => s.totalCalls >= 50 },
  { id: "streak_5",        title: "Hot Streak",       description: "5 positive calls in a row",              emoji: "🔥", rarity: "rare",      xpReward: 175, check: (s) => s.bestStreak >= 5 },
  { id: "no_website_hunter", title: "No Website Hunter", description: "Called 20+ businesses with no website", emoji: "🎯", rarity: "rare",   xpReward: 150, check: (s) => s.noWebsiteLeadsCalled >= 20 },
  { id: "city_conqueror",  title: "City Conqueror",   description: "Conquered your first city",              emoji: "⚔️", rarity: "rare",      xpReward: 200, check: (s) => s.citiesConquered >= 1 },
  // Epic
  { id: "five_closes",     title: "Deal Machine",     description: "Closed 5 deals",                        emoji: "💎", rarity: "epic",      xpReward: 500, check: (s) => s.totalClosed >= 5 },
  { id: "hundred_calls",   title: "Century Club",     description: "Made 100 calls",                        emoji: "💯", rarity: "epic",      xpReward: 400, check: (s) => s.totalCalls >= 100 },
  { id: "streak_10",       title: "Unstoppable",      description: "10 positive calls in a row",            emoji: "⚡", rarity: "epic",      xpReward: 600, check: (s) => s.bestStreak >= 10 },
  { id: "war_room_5",      title: "War Room Warrior",  description: "Completed 5 War Room sessions",        emoji: "🪖", rarity: "epic",      xpReward: 350, check: (s) => s.warRoomSessions >= 5 },
  { id: "five_cities",     title: "Territory King",   description: "Conquered 5 cities",                   emoji: "🗺️", rarity: "epic",      xpReward: 500, check: (s) => s.citiesConquered >= 5 },
  // Legendary
  { id: "twenty_closes",   title: "Legend",           description: "Closed 20 deals",                      emoji: "👑", rarity: "legendary", xpReward: 2000, check: (s) => s.totalClosed >= 20 },
  { id: "five_hundred_calls", title: "The Machine",   description: "Made 500 calls",                       emoji: "🤖", rarity: "legendary", xpReward: 1500, check: (s) => s.totalCalls >= 500 },
  { id: "speed_master",    title: "Speed Demon",      description: "Completed 10 Speed Rounds",            emoji: "💨", rarity: "legendary", xpReward: 800,  check: (s) => s.speedRoundsCompleted >= 10 },
];

export const RARITY_COLORS: Record<string, string> = {
  common:    "border-gray-600 bg-gray-800/50 text-gray-300",
  rare:      "border-blue-600 bg-blue-900/30 text-blue-300",
  epic:      "border-purple-600 bg-purple-900/30 text-purple-300",
  legendary: "border-yellow-500 bg-yellow-900/30 text-yellow-300",
};

// ─── MISSIONS ─────────────────────────────────────────────────────────────────
export interface Mission {
  id: string;
  title: string;
  description: string;
  emoji: string;
  xpReward: number;
  type: "calls" | "closed" | "scan" | "streak";
  target: number;
}

export function generateDailyMissions(): Mission[] {
  const all: Mission[] = [
    { id: "m1", title: "Dialer",        description: "Make 5 calls today",                emoji: "📞", xpReward: 50,  type: "calls",  target: 5 },
    { id: "m2", title: "Hunter",        description: "Make 10 calls today",               emoji: "🎯", xpReward: 100, type: "calls",  target: 10 },
    { id: "m3", title: "Warrior",       description: "Make 20 calls today",               emoji: "⚔️", xpReward: 200, type: "calls",  target: 20 },
    { id: "m4", title: "First Blood",   description: "Close 1 deal today",                emoji: "💰", xpReward: 300, type: "closed", target: 1 },
    { id: "m5", title: "Double Down",   description: "Close 2 deals today",               emoji: "💎", xpReward: 600, type: "closed", target: 2 },
    { id: "m6", title: "Scout",         description: "Scan leads in a new city",          emoji: "🔍", xpReward: 75,  type: "scan",   target: 1 },
    { id: "m7", title: "Hot Streak",    description: "Get a 3-call positive streak",      emoji: "🔥", xpReward: 150, type: "streak", target: 3 },
    { id: "m8", title: "On Fire",       description: "Get a 5-call positive streak",      emoji: "🔥", xpReward: 250, type: "streak", target: 5 },
  ];
  // Return 3 random missions daily (seeded by date so same all day)
  const seed = new Date().toDateString();
  const hash = seed.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  const picks: Mission[] = [];
  const used = new Set<number>();
  let i = hash;
  while (picks.length < 3) {
    const idx = i % all.length;
    if (!used.has(idx)) { picks.push(all[idx]); used.add(idx); }
    i++;
  }
  return picks;
}
