// src/lib/constants/company-icons.ts

import { Anchor, Building2, Eye, Handshake, type LucideIcon, Palmtree, Sailboat, Ship, Sparkles, Star, Tent, Trophy, Utensils, XCircle } from "lucide-react";

export const statusIcons: Record<string, LucideIcon | null> = {
  lead: Sparkles,
  gewonnen: Trophy,
  verloren: XCircle,
};

export const kategorieIcons: Record<string, LucideIcon | null> = {
  restaurant: Utensils,
  hotel: Building2,
  resort: Palmtree,
  camping: Tent,
  marina: Anchor,
  segelschule: Sailboat,
  segelverein: Trophy,
  bootsverleih: Ship,
  neukunde: Sparkles,
  bestandskunde: Star,
  interessent: Eye,
  partner: Handshake,
  sonstige: null,
};
