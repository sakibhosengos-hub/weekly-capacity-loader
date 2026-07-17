export interface OrderItem {
  line: string;
  cust: string;
  family: string;
  fo: string;
  po: string;
  item: string;
  description: string;
  poQty: number;
  done: number;
  bal: number;
  ship: string; // ISO format "YYYY-MM-DD" or text
  capDay: number | ""; // Specific capacity, empty string means default
  daysReq: number; // Computed: bal / (capDay or defaultCap)
  [key: `wk${number}`]: number; // wk1, wk2, wk3... dynamic
  remain: number; // Remaining balance
  status?: string; // Status description
  comment?: string;
  planStatus?: "Plan" | "Hold"; // User can put rows on "Hold" or "Plan"
  lockedWeeks?: Record<string, number>; // Record of wkX -> locked quantity
}

export type SortKey =
  | "Shipment date"
  | "LINE"
  | "Plan/Hold"
  | "CUST"
  | "FAMILY"
  | "FO#"
  | "PO#"
  | "ITEM"
  | "DESCRIPTION"
  | "PO QTY"
  | "DONE"
  | "BAL"
  | "CAP/DAY"
  | "DAYS REQ"
  | "REMAIN"
  | "STATUS"
  | "COMMENT";
export type SortDirection = "asc" | "desc";

export interface SortLevel {
  key: SortKey;
  direction: SortDirection;
}

export type QtyScheduleMode = "PO Qty (full order)" | "BAL (PO Qty - Done)";

export interface PlanningSettings {
  numWeeks: number;
  workingDays: number;
  sortBy: SortKey;
  sortLevels?: SortLevel[];
  qtyScheduleMode: QtyScheduleMode;
}
