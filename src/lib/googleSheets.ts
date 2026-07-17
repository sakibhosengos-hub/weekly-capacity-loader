import { formatToDDMMM } from "./planning";

export interface GoogleSheetInfo {
  spreadsheetId: string;
  sheetTitle: string;
}

// Extract Spreadsheet ID from Google Sheets URL
export function extractSpreadsheetId(urlOrId: string): string {
  const clean = urlOrId.trim();
  const match = clean.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  return match ? match[1] : clean;
}

// Fetch basic metadata of the spreadsheet (like available tab names)
export async function fetchSpreadsheetTabs(
  spreadsheetId: string,
  accessToken: string
): Promise<string[]> {
  try {
    const res = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets.properties.title`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || "Failed to load spreadsheet tabs");
    }

    const data = await res.json();
    if (!data.sheets) return [];
    return data.sheets.map((s: any) => s.properties.title);
  } catch (err: any) {
    console.error("Error fetching spreadsheet tabs:", err);
    throw err;
  }
}

// Fetch row values from a spreadsheet tab
export async function fetchSheetValues(
  spreadsheetId: string,
  sheetTitle: string,
  accessToken: string
): Promise<string[][]> {
  try {
    const range = `${encodeURIComponent(sheetTitle)}!A1:Z500`; // Fetch first 500 rows and columns A to Z
    const res = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || "Failed to load sheet values");
    }

    const data = await res.json();
    return data.values || [];
  } catch (err: any) {
    console.error("Error fetching sheet values:", err);
    throw err;
  }
}

// Write planning results back to the spreadsheet
export async function updateSheetValues(
  spreadsheetId: string,
  sheetTitle: string,
  headerRow: string[],
  rowsData: any[], // Raw computed items
  accessToken: string
): Promise<void> {
  try {
    // 1. We must read the existing sheet values to know how many columns/rows are there
    const existingValues = await fetchSheetValues(spreadsheetId, sheetTitle, accessToken);
    if (existingValues.length === 0) {
      throw new Error("Target sheet is empty. Please import or set headers first.");
    }

    // 2. Identify the column indices for where we should write
    // We want to write back: DAYS REQ, WK-1, WK-2... WK-N, REMAIN, STATUS, COMMENT
    const headers = existingValues[0].map(h => String(h).trim().toUpperCase());
    
    // We will construct an updated 2D grid of values
    const numRows = existingValues.length;
    const newGrid: string[][] = JSON.parse(JSON.stringify(existingValues)); // Deep copy

    // Ensure headers exist in the target sheet. If they don't, append them to the first row!
    const requiredOutputHeaders = ["PLAN STATUS", "DAYS REQ", "REMAIN", "STATUS", "COMMENT"];
    
    // Check how many weeks are configured dynamically
    const maxWeeks = 30; // safety ceiling
    const wkHeaders: string[] = [];
    rowsData.forEach(row => {
      Object.keys(row).forEach(key => {
        if (key.startsWith("wk")) {
          const wkNum = key.replace("wk", "WK-");
          if (!wkHeaders.includes(wkNum)) wkHeaders.push(wkNum);
        }
      });
    });

    // Sort WK headers naturally (WK-1, WK-2, etc.)
    wkHeaders.sort((a, b) => {
      const numA = parseInt(a.replace("WK-", ""));
      const numB = parseInt(b.replace("WK-", ""));
      return numA - numB;
    });

    const allOutputHeaders = ["PLAN STATUS", "DAYS REQ", ...wkHeaders, "REMAIN", "STATUS", "COMMENT"];

    // Map which index belongs to which header
    const headerIndices: Record<string, number> = {};
    allOutputHeaders.forEach(header => {
      const idx = headers.indexOf(header);
      if (idx !== -1) {
        headerIndices[header] = idx;
      } else {
        // Append missing column header
        newGrid[0].push(header);
        headerIndices[header] = newGrid[0].length - 1;
      }
    });

    // Match rows on "LINE", "FO#", or "PO#"
    const lineIdx = headers.indexOf("LINE");
    const foIdx = headers.indexOf("FO#");
    const poIdx = headers.indexOf("PO#");

    // Let's iterate through rowsData and fill values in the grid
    for (let r = 1; r < numRows; r++) {
      const existingRow = existingValues[r];
      const rowLine = lineIdx !== -1 ? String(existingRow[lineIdx] || "").trim() : "";
      const rowFo = foIdx !== -1 ? String(existingRow[foIdx] || "").trim() : "";
      const rowPo = poIdx !== -1 ? String(existingRow[poIdx] || "").trim() : "";

      // Find matching row in our computed rowsData
      const match = rowsData.find(item => {
        if (rowLine && String(item.line).trim() === rowLine) return true;
        if (rowFo && String(item.fo).trim() === rowFo) return true;
        if (rowPo && String(item.po).trim() === rowPo) return true;
        return false;
      });

      if (match) {
        // Pad the row in newGrid to match the new headers length
        const targetLen = newGrid[0].length;
        while (newGrid[r].length < targetLen) {
          newGrid[r].push("");
        }

        // Write computed fields
        if ("PLAN STATUS" in headerIndices) {
          newGrid[r][headerIndices["PLAN STATUS"]] = String(match.planStatus || "Plan");
        }
        if ("DAYS REQ" in headerIndices) {
          newGrid[r][headerIndices["DAYS REQ"]] = String(match.daysReq || 0);
        }
        wkHeaders.forEach(wkHeader => {
          const wkKey = wkHeader.toLowerCase().replace("-", ""); // wk1, wk2, etc.
          if (wkHeader in headerIndices) {
            newGrid[r][headerIndices[wkHeader]] = String(match[wkKey] || 0);
          }
        });
        if ("REMAIN" in headerIndices) {
          newGrid[r][headerIndices["REMAIN"]] = String(match.remain || 0);
        }
        if ("STATUS" in headerIndices) {
          newGrid[r][headerIndices["STATUS"]] = String(match.status || "");
        }
        if ("COMMENT" in headerIndices) {
          newGrid[r][headerIndices["COMMENT"]] = String(match.comment || "");
        }
      }
    }

    // 3. Save the full updated grid back to the spreadsheet using BatchUpdate
    const range = `${encodeURIComponent(sheetTitle)}!A1`;
    const res = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}?valueInputOption=USER_ENTERED`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          range: `${sheetTitle}!A1`,
          majorDimension: "ROWS",
          values: newGrid,
        }),
      }
    );

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || "Failed to update spreadsheet data");
    }
  } catch (err: any) {
    console.error("Error updating sheet:", err);
    throw err;
  }
}

// Helper to find header index with robust fallback matching
function findHeaderIndex(headers: string[], keys: string[], partials: string[] = []): number {
  const exactIdx = headers.findIndex(h => keys.includes(h));
  if (exactIdx !== -1) return exactIdx;

  if (partials.length > 0) {
    const partialIdx = headers.findIndex(h => partials.some(p => h.includes(p)));
    if (partialIdx !== -1) return partialIdx;
  }
  return -1;
}

// Robust helper to format dates from Google Sheets/Excel format to YYYY-MM-DD
export function formatExcelDate(val: any): string {
  if (val === undefined || val === null) return "";
  
  const valStr = String(val).trim();
  if (!valStr) return "";

  // 1. If it matches YYYY-MM-DD exactly
  if (valStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
    return valStr;
  }

  // 2. If it's a JS Date object
  if (val instanceof Date && !isNaN(val.getTime())) {
    return val.toISOString().split("T")[0];
  }

  // 3. If it is an Excel serial number (typically a number between 10000 and 100000)
  const num = Number(valStr);
  if (!isNaN(num) && num > 10000 && num < 100000) {
    // Excel base date is Dec 30, 1899 due to leap year bug
    const date = new Date((num - 25569) * 86400 * 1000);
    if (!isNaN(date.getTime())) {
      return date.toISOString().split("T")[0];
    }
  }

  // 4. Try standard JS parsing (for MM/DD/YYYY, DD-MM-YYYY, etc.)
  const parsedDate = new Date(valStr);
  if (!isNaN(parsedDate.getTime())) {
    return parsedDate.toISOString().split("T")[0];
  }

  return valStr;
}

// Function to map a parsed 2D sheet array into OrderItem typed objects
export function mapSheetToOrderItems(values: string[][]): {
  items: any[];
  headers: string[];
} {
  if (values.length === 0) return { items: [], headers: [] };

  const rawHeaders = values[0];
  const headers = rawHeaders.map((h) => String(h || "").trim());
  const headerUpper = headers.map((h) => h.toUpperCase());

  // Find column indices with robust fallback matching
  const lineIdx = findHeaderIndex(headerUpper, ["LINE", "LN", "LINE NO", "LINE#", "SL"], ["LINE"]);
  const custIdx = findHeaderIndex(headerUpper, ["CUST", "CUSTOMER", "CLIENT"], ["CUST", "CLIENT"]);
  const familyIdx = findHeaderIndex(headerUpper, ["FAMILY", "PROD FAMILY", "PRODUCT FAMILY"], ["FAMILY"]);
  const foIdx = findHeaderIndex(headerUpper, ["FO#", "FO", "FO NO", "FO NUMBER", "FACTORY ORDER"]);
  const poIdx = findHeaderIndex(headerUpper, ["PO#", "PO", "PO NO", "PO NUMBER", "PURCHASE ORDER"]);
  const itemIdx = findHeaderIndex(headerUpper, ["ITEM", "ITEM NO", "ITEM NUMBER", "PART", "PART NO", "PRODUCT", "STYLE", "ARTICLE"], ["ITEM", "PRODUCT", "STYLE"]);
  const descIdx = findHeaderIndex(headerUpper, ["DESCRIPTION", "DESC", "ITEM DESCRIPTION"], ["DESC"]);
  const poQtyIdx = findHeaderIndex(headerUpper, ["PO QTY", "POQTY", "PO QUANTITY", "QTY", "QUANTITY", "ORDER QTY"], ["PO QTY", "POQTY", "QTY", "QUANTITY"]);
  const doneIdx = findHeaderIndex(headerUpper, ["DONE", "COMPLETED", "QTY DONE"], ["DONE", "COMPLETED"]);
  const shipIdx = findHeaderIndex(headerUpper, ["SHIP", "SHIPMENT DATE", "SHIP DATE", "SHIPMENT_DATE", "SHIP_DATE", "DELIVERY DATE"], ["SHIP", "DATE"]);
  const capIdx = findHeaderIndex(headerUpper, ["CAP/DAY", "CAPDAY", "CAP/ DAY", "CAP / DAY", "CAPACITY", "CAP", "CAPACITY/DAY", "DAILY CAPACITY"], ["CAP/DAY", "CAPDAY", "CAPACITY", "CAP"]);

  const items: any[] = [];

  for (let r = 1; r < values.length; r++) {
    const row = values[r];
    if (row.length === 0 || row.every(val => !val)) continue; // skip empty rows

    const line = lineIdx !== -1 ? String(row[lineIdx] || "") : String(r);
    const cust = custIdx !== -1 ? String(row[custIdx] || "") : "";
    const family = familyIdx !== -1 ? String(row[familyIdx] || "") : "";
    const fo = foIdx !== -1 ? String(row[foIdx] || "") : "";
    const po = poIdx !== -1 ? String(row[poIdx] || "") : "";
    const item = itemIdx !== -1 ? String(row[itemIdx] || "") : "";
    const description = descIdx !== -1 ? String(row[descIdx] || "") : "";
    
    const poQtyVal = poQtyIdx !== -1 ? parseFloat(String(row[poQtyIdx] || "").replace(/,/g, "")) : 0;
    const poQty = isNaN(poQtyVal) ? 0 : poQtyVal;

    const doneVal = doneIdx !== -1 ? parseFloat(String(row[doneIdx] || "").replace(/,/g, "")) : 0;
    const done = isNaN(doneVal) ? 0 : doneVal;

    const shipRaw = shipIdx !== -1 ? row[shipIdx] : "";
    const ship = formatToDDMMM(formatExcelDate(shipRaw));
    
    let capDay: number | "" = "";
    if (capIdx !== -1 && row[capIdx] !== undefined && row[capIdx] !== null && row[capIdx] !== "") {
      const parsedCap = parseFloat(String(row[capIdx] || "").replace(/,/g, ""));
      if (!isNaN(parsedCap)) {
        capDay = parsedCap;
      }
    }

    items.push({
      line,
      cust,
      family,
      fo,
      po,
      item,
      description,
      poQty,
      done,
      bal: Math.max(0, poQty - done),
      ship,
      capDay,
      daysReq: 0,
      remain: 0,
    });
  }

  return { items, headers };
}
