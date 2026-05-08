"use client";

import { usePathname } from "next/navigation";
import { Phone, BarChart3, Search, GitBranch, Settings, Globe2, Trophy, User, Layers, Flame, BookOpen, Kanban } from "lucide-react";

const NAV_LINKS = [
  { href: "/scan",        label: "Scanner",     icon: Search },
  { href: "/swipe",       label: "Swipe",       icon: Layers },
  { href: "/war-room",    label: "War Room",    icon: Flame,    highlight: true },
  { href: "/call-mode",   label: "Call Mode",   icon: Phone },
  { href: "/kanban",      label: "Kanban",      icon: Kanban },
  { href: "/pipeline",    label: "Pipeline",    icon: GitBranch },
  { href: "/analytics",   label: "Analytics",   icon: BarChart3 },
  { href: "/globe",       label: "Globe",       icon: Globe2 },
  { href: "/leaderboard", label: "Leaderboard", icon: Trophy },
  { href: "/playbook",    label: "Playbook",    icon: BookOpen },
  { href: "/profile",     label: "Profile",     icon: User },
];

export default function Nav() {
  const pathname = usePathname();
  if (pathname === "/war-room") return null;

  return (
    <nav className="bg-gray-950 border-b border-gray-800 px-3 flex items-center sticky top-0 z-50 overflow-x-auto scrollbar-hide">
      <a href="/scan" className="font-black text-blue-400 text-base mr-4 py-3 shrink-0">⚡ ColdCRM</a>
      <div className="flex items-center gap-0.5 flex-nowrap">
        {NAV_LINKS.map((link) => {
          const active = pathname === link.href;
          return (
            <a key={link.href} href={link.href}
              className={`flex items-center gap-1.5 px-2.5 py-3 text-xs font-semibold border-b-2 transition-colors whitespace-nowrap ${
                active
                  ? "border-blue-500 text-blue-400"
                  : link.highlight
                  ? "border-transparent text-red-400 hover:text-red-300 hover:border-red-500"
                  : "border-transparent text-gray-500 hover:text-gray-200 hover:border-gray-600"
              }`}>
              <link.icon className="w-3.5 h-3.5 shrink-0" />
              {link.label}
              {link.highlight && (
                <span className="bg-red-900/60 text-red-400 text-[9px] font-black px-1 py-0.5 rounded border border-red-800 ml-0.5">HOT</span>
              )}
            </a>
          );
        })}
      </div>
    </nav>
  );
}
