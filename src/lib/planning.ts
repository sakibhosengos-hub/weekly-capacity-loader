import { OrderItem, PlanningSettings, SortKey, SortDirection, SortLevel } from "../types";

export function parseShipDate(dateStr: string): Date | null {
  if (!dateStr) return null;
  const clean = dateStr.trim();
  if (!clean) return null;

  // Check if it's DD/MMM (e.g., 15/Aug or 15/AUG)
  const ddMmmMatch = clean.match(/^(\d{1,2})\/([A-Za-z]{3})$/);
  if (ddMmmMatch) {
    const day = parseInt(ddMmmMatch[1], 10);
    const monthStr = ddMmmMatch[2].toLowerCase();
    const months = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
    const monthIdx = months.indexOf(monthStr);
    if (monthIdx !== -1 && day >= 1 && day <= 31) {
      const year = new Date().getFullYear();
      const date = new Date(year, monthIdx, day);
      if (!isNaN(date.getTime())) {
        return date;
      }
    }
  }

  const parsed = new Date(clean);
  if (!isNaN(parsed.getTime())) {
    return parsed;
  }
  return null;
}

export function formatToDDMMM(val: string): string {
  if (!val) return "";
  const clean = val.trim();
  if (!clean) return "";

  // Check if already in DD/MMM format
  const ddMmmMatch = clean.match(/^(\d{1,2})\/([A-Za-z]{3})$/);
  if (ddMmmMatch) {
    const day = ddMmmMatch[1];
    const month = ddMmmMatch[2].charAt(0).toUpperCase() + ddMmmMatch[2].slice(1).toLowerCase();
    return `${day.padStart(2, "0")}/${month}`;
  }

  const parsed = new Date(clean);
  if (!isNaN(parsed.getTime())) {
    const day = String(parsed.getDate()).padStart(2, "0");
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const month = months[parsed.getMonth()];
    return `${day}/${month}`;
  }
  return val;
}

export function calculatePlanning(
  orders: OrderItem[],
  settings: PlanningSettings
): OrderItem[] {
  const { numWeeks, workingDays, sortBy, qtyScheduleMode } = settings;

  // 1. First, prepare and clone the orders to avoid mutating original data
  const processedOrders = orders.map((order) => {
    // Ensure numeric values are valid
    const poQty = Number(order.poQty) || 0;
    const done = Number(order.done) || 0;
    const capDayInput = order.capDay;
    
    // Check if CAP/DAY is missing in the table
    const isCapDayMissing = capDayInput === "" || capDayInput === undefined || capDayInput === null;

    // If CAP/DAY is missing, force to Hold state
    const currentPlanStatus = isCapDayMissing ? "Hold" : (order.planStatus || "Plan");
    const cap = isCapDayMissing ? 0 : (Number(capDayInput) || 0);

    // Determine quantity to schedule
    const qtyToSchedule = Math.max(0, qtyScheduleMode === "PO Qty (full order)" ? poQty : poQty - done);
    
    // Calculate Days Required
    const daysReq = cap > 0 ? Number((qtyToSchedule / cap).toFixed(2)) : 0;

    // Calculate status dynamically based on rules:
    // Done = "Complete", Hold = "Hold", exceed shipment date = "Risk", plan = "Scheduled"
    let isPastShipment = false;
    if (order.ship) {
      const shipDate = parseShipDate(order.ship);
      if (shipDate) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const shipDateMidnight = new Date(shipDate);
        shipDateMidnight.setHours(0, 0, 0, 0);
        
        if (today.getTime() > shipDateMidnight.getTime()) {
          isPastShipment = true;
        }
      }
    }

    const isComplete = poQty > 0 && Math.max(0, poQty - done) === 0;

    let computedStatus = "Scheduled";
    if (isComplete) {
      computedStatus = "Complete";
    } else if (currentPlanStatus === "Hold") {
      computedStatus = "Hold";
    } else if (isPastShipment) {
      computedStatus = "Risk";
    } else {
      computedStatus = "Scheduled";
    }

    const updatedOrder: OrderItem = {
      ...order,
      poQty,
      done,
      bal: Math.max(0, poQty - done),
      capDay: capDayInput,
      daysReq,
      remain: 0,
      status: computedStatus,
      // Overwrite planStatus if CAP/DAY is missing
      planStatus: currentPlanStatus,
    };

    // Initialize all week columns to 0 unless locked
    const lockedWeeks = order.lockedWeeks || {};
    for (let w = 1; w <= 30; w++) {
      const wkKey = `wk${w}`;
      delete (updatedOrder as any)[wkKey];
      if (lockedWeeks[wkKey] !== undefined) {
        updatedOrder[wkKey] = lockedWeeks[wkKey];
      } else {
        updatedOrder[wkKey] = 0;
      }
    }

    return updatedOrder;
  });

  // Helper comparison function for single fields
  const compareSingleField = (a: OrderItem, b: OrderItem, key: SortKey, direction: SortDirection): number => {
    let result = 0;
    switch (key) {
      case "Shipment date": {
        const dateA = a.ship ? parseShipDate(a.ship) : null;
        const dateB = b.ship ? parseShipDate(b.ship) : null;
        const timeA = dateA ? dateA.getTime() : 0;
        const timeB = dateB ? dateB.getTime() : 0;
        if (!timeA && !timeB) result = 0;
        else if (!timeA) result = 1;
        else if (!timeB) result = -1;
        else result = timeA - timeB;
        break;
      }
      case "LINE": {
        result = String(a.line).localeCompare(String(b.line), undefined, { numeric: true });
        break;
      }
      case "Plan/Hold": {
        const valA = a.planStatus || "Plan";
        const valB = b.planStatus || "Plan";
        result = valA.localeCompare(valB);
        break;
      }
      case "CUST": {
        result = String(a.cust || "").localeCompare(String(b.cust || ""));
        break;
      }
      case "FAMILY": {
        result = String(a.family || "").localeCompare(String(b.family || ""));
        break;
      }
      case "FO#": {
        result = String(a.fo || "").localeCompare(String(b.fo || ""));
        break;
      }
      case "PO#": {
        result = String(a.po || "").localeCompare(String(b.po || ""));
        break;
      }
      case "ITEM": {
        result = String(a.item || "").localeCompare(String(b.item || ""));
        break;
      }
      case "DESCRIPTION": {
        result = String(a.description || "").localeCompare(String(b.description || ""));
        break;
      }
      case "PO QTY": {
        result = a.poQty - b.poQty;
        break;
      }
      case "DONE": {
        result = a.done - b.done;
        break;
      }
      case "BAL": {
        result = a.bal - b.bal;
        break;
      }
      case "CAP/DAY": {
        const valA = a.capDay === "" ? 0 : Number(a.capDay) || 0;
        const valB = b.capDay === "" ? 0 : Number(b.capDay) || 0;
        result = valA - valB;
        break;
      }
      case "DAYS REQ": {
        result = a.daysReq - b.daysReq;
        break;
      }
      case "REMAIN": {
        result = a.remain - b.remain;
        break;
      }
      case "STATUS": {
        result = String(a.status || "").localeCompare(String(b.status || ""));
        break;
      }
      case "COMMENT": {
        result = String(a.comment || "").localeCompare(String(b.comment || ""));
        break;
      }
      default:
        result = 0;
    }
    return direction === "asc" ? result : -result;
  };

  // Determine sort levels to use
  const defaultDirection = ["PO QTY", "DONE", "BAL", "CAP/DAY", "DAYS REQ", "REMAIN"].includes(sortBy) ? "desc" : "asc";
  const levels: SortLevel[] = settings.sortLevels && settings.sortLevels.length > 0
    ? settings.sortLevels
    : [{ key: sortBy, direction: defaultDirection }];

  // 2. Sort the list of orders based on selected multi-level sort settings to establish priority
  processedOrders.sort((a, b) => {
    for (const level of levels) {
      const res = compareSingleField(a, b, level.key, level.direction);
      if (res !== 0) {
        return res;
      }
    }
    return 0;
  });

  // 3. Perform Line-wise capacity distribution (Time Pool)
  // Store remaining available working days per line per week: { [lineName]: { [weekNumber]: availableDays } }
  const remainingDaysPool: Record<string, Record<number, number>> = {};

  for (const order of processedOrders) {
    const line = order.line || "default";
    const cap = Number(order.capDay) || 0;
    const isHold = order.planStatus === "Hold";

    // Determine quantity to schedule
    const qtyToSchedule = Math.max(0, qtyScheduleMode === "PO Qty (full order)" ? order.poQty : order.poQty - order.done);

    if (isHold || cap <= 0 || qtyToSchedule <= 0) {
      for (let w = 1; w <= numWeeks; w++) {
        order[`wk${w}`] = 0;
      }
      order.remain = qtyToSchedule;
      continue;
    }

    // Initialize the line's week pool if not yet created
    if (!remainingDaysPool[line]) {
      remainingDaysPool[line] = {};
      for (let w = 1; w <= numWeeks; w++) {
        remainingDaysPool[line][w] = workingDays;
      }
    }

    // Calculate total locked quantity for this order within the planning weeks range
    const lockedWeeks = order.lockedWeeks || {};
    let totalLockedQty = 0;
    
    // Deduct days consumed by locked weeks of this specific order
    for (let w = 1; w <= numWeeks; w++) {
      const wkKey = `wk${w}`;
      if (lockedWeeks[wkKey] !== undefined) {
        const lockedQty = lockedWeeks[wkKey];
        totalLockedQty += lockedQty;
        const consumedDays = cap > 0 ? lockedQty / cap : 0;
        const availableDays = remainingDaysPool[line][w];
        remainingDaysPool[line][w] = Math.max(0, Number((availableDays - consumedDays).toFixed(4)));
      }
    }

    let remainingQtyToSchedule = Math.max(0, qtyToSchedule - totalLockedQty);

    for (let w = 1; w <= numWeeks; w++) {
      const wkKey = `wk${w}`;
      
      // If this week is locked, it already has the locked quantity, skip auto-scheduling
      if (lockedWeeks[wkKey] !== undefined) {
        continue;
      }

      const availableDays = remainingDaysPool[line][w];
      if (availableDays <= 0 || remainingQtyToSchedule <= 0) {
        order[wkKey] = 0;
        continue;
      }

      // Max capacity available this week
      const maxWeeklyQty = availableDays * cap;
      let allocatedQty = Math.min(remainingQtyToSchedule, maxWeeklyQty);

      // Round to nearest integer as requested
      allocatedQty = Math.round(allocatedQty);

      // Bound to remainingQtyToSchedule
      if (allocatedQty > remainingQtyToSchedule) {
        allocatedQty = remainingQtyToSchedule;
      }

      if (allocatedQty > 0) {
        order[wkKey] = allocatedQty;
        remainingQtyToSchedule -= allocatedQty;

        // Deduct actual days consumed by this rounded quantity
        const consumedDays = allocatedQty / cap;
        remainingDaysPool[line][w] = Math.max(0, Number((availableDays - consumedDays).toFixed(4)));
      } else {
        order[wkKey] = 0;
      }
    }

    // Assign remaining unallocated quantity
    let totalAllocated = 0;
    for (let w = 1; w <= numWeeks; w++) {
      totalAllocated += order[`wk${w}`] || 0;
    }
    const remainVal = Math.max(0, qtyToSchedule - totalAllocated);
    order.remain = remainVal;
    if (remainVal > 0 && order.status !== "Hold") {
      order.status = "Risk";
    }
  }

  return processedOrders;
}
