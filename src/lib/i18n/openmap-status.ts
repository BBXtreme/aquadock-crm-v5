/** Maps DB `companies.status` (lowercase) to `openmap` message keys. */

export type OpenmapStatusMsgKey =
  | "status_lead"
  | "status_interessant"
  | "status_qualifiziert"
  | "status_akquise"
  | "status_angebot"
  | "status_gewonnen"
  | "status_verloren"
  | "status_kunde"
  | "status_partner"
  | "status_inaktiv";

export function getOpenmapStatusMsgKey(statusLower: string): OpenmapStatusMsgKey {
  switch (statusLower) {
    case "lead":
      return "status_lead";
    case "interessant":
      return "status_interessant";
    case "qualifiziert":
      return "status_qualifiziert";
    case "akquise":
      return "status_akquise";
    case "angebot":
      return "status_angebot";
    case "gewonnen":
      return "status_gewonnen";
    case "verloren":
      return "status_verloren";
    case "kunde":
      return "status_kunde";
    case "partner":
      return "status_partner";
    case "inaktiv":
      return "status_inaktiv";
    default:
      return "status_lead";
  }
}
