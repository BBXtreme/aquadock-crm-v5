import { type LucideIcon, Sparkles, Trophy, XCircle, Utensils, Building2, Palmtree, Tent, Anchor, Sailboat, Ship, Star, Eye, Handshake } from "lucide-react";

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
