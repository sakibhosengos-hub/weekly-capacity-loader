import React, { useState } from "react";
import { OrderItem, PlanningSettings } from "./types";
import { calculatePlanning } from "./lib/planning";
import { SettingsPanel } from "./components/SettingsPanel";
import { SummaryCard } from "./components/SummaryCard";
import { DataTable } from "./components/DataTable";
import {
  Upload,
  Download,
  Plus,
  Trash2,
  CalendarCheck2,
  Info,
} from "lucide-react";
import * as XLSX from "xlsx";

import { formatExcelDate } from "./lib/googleSheets";
import { formatToDDMMM } from "./lib/planning";

// Default realistic demo rows
const INITIAL_DEMO_ROWS: OrderItem[] = [
  {
    line: "1",
    cust: "Patagonia Inc.",
    family: "Outerwear",
    fo: "FO-2026-01",
    po: "PO-99105",
    item: "JK-902",
    description: "Recycled Torrentshell Jacket",
    poQty: 4800,
    done: 800,
    bal: 4000,
    ship: "15/Aug",
    capDay: 150,
    daysReq: 0,
    remain: 0,
  },
  {
    line: "2",
    cust: "Nike Running",
    family: "Apparel",
    fo: "FO-2026-02",
    po: "PO-99106",
    item: "TS-440",
    description: "Dri-FIT Trail Running Tee",
    poQty: 2400,
    done: 0,
    bal: 2400,
    ship: "01/Aug",
    capDay: 100,
    daysReq: 0,
    remain: 0,
  },
  {
    line: "3",
    cust: "Arc'teryx",
    family: "Gear",
    fo: "FO-2026-03",
    po: "PO-99107",
    item: "BP-320",
    description: "Alpha Lightweight Backpack",
    poQty: 1800,
    done: 600,
    bal: 1200,
    ship: "20/Aug",
    capDay: 50,
    daysReq: 0,
    remain: 0,
  },
  {
    line: "4",
    cust: "lululemon athletica",
    family: "Athleisure",
    fo: "FO-2026-04",
    po: "PO-99108",
    item: "JG-110",
    description: "Align Jogger Pant Black",
    poQty: 6000,
    done: 2000,
    bal: 4000,
    ship: "10/Aug",
    capDay: 200,
    daysReq: 0,
    remain: 0,
  },
  {
    line: "5",
    cust: "The North Face",
    family: "Outerwear",
    fo: "FO-2026-05",
    po: "PO-99109",
    item: "SL-510",
    description: "Eco-Trail Double Sleeping Bag",
    poQty: 1200,
    done: 1200,
    bal: 0,
    ship: "25/Jul",
    capDay: 30,
    daysReq: 0,
    remain: 0,
  }
];

export default function App() {
  const [settings, setSettings] = useState<PlanningSettings>({
    numWeeks: 6,
    workingDays: 6,
    sortBy: "Shipment date",
    sortLevels: [{ key: "Shipment date", direction: "asc" }],
    qtyScheduleMode: "BAL (PO Qty - Done)",
  });

  const [orders, setOrders] = useState<OrderItem[]>(INITIAL_DEMO_ROWS);
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [showClearConfirm, setShowClearConfirm] = useState<boolean>(false);

  // Recalculate plan instantly on any order or settings change
  const computedOrders = calculatePlanning(orders, settings);

  // Add a blank row manually
  const handleAddRow = () => {
    const nextLine = orders.length > 0 ? String(Math.max(...orders.map(o => parseInt(o.line) || 0)) + 1) : "1";
    const newRow: OrderItem = {
      line: nextLine,
      planStatus: "Plan",
      cust: "",
      family: "",
      fo: "",
      po: "",
      item: "",
      description: "",
      poQty: 0,
      done: 0,
      bal: 0,
      ship: formatToDDMMM(new Date().toISOString().split("T")[0]),
      capDay: "",
      daysReq: 0,
      remain: 0,
    };
    setOrders([...orders, newRow]);
  };

  // Update specific row fields inline
  const handleUpdateRow = (index: number, updatedRow: OrderItem) => {
    // We update the original orders list, which will then trigger computed recalculation
    const updated = [...orders];
    updated[index] = updatedRow;
    setOrders(updated);
  };

  // Delete row
  const handleDeleteRow = (index: number) => {
    const updated = [...orders];
    updated.splice(index, 1);
    setOrders(updated);
  };

  // Clear all data
  const handleClearAll = () => {
    setShowClearConfirm(true);
  };

  // Import Excel/CSV files locally
  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    const reader = new FileReader();

    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const workbook = XLSX.read(bstr, { type: "binary" });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const rawJson = XLSX.utils.sheet_to_json<any[]>(worksheet, { header: 1 });

        if (rawJson.length === 0) {
          throw new Error("Imported file is empty");
        }

        const headers = rawJson[0].map((h: any) => String(h || "").trim().toUpperCase());
        const mappedItems: OrderItem[] = [];

        // Identify indexes with robust fallback matching
        const findImportHeaderIndex = (keys: string[], partials: string[] = []): number => {
          const exactIdx = headers.findIndex(h => keys.includes(h));
          if (exactIdx !== -1) return exactIdx;
          if (partials.length > 0) {
            const partialIdx = headers.findIndex(h => partials.some(p => h.includes(p)));
            if (partialIdx !== -1) return partialIdx;
          }
          return -1;
        };

        const lineIdx = findImportHeaderIndex(["LINE", "LN", "LINE NO", "LINE#", "SL"], ["LINE"]);
        const planStatusIdx = findImportHeaderIndex(["PLAN STATUS", "PLAN/HOLD", "STATUS STATUS", "PLAN_STATUS", "SCHEDULING"]);
        const custIdx = findImportHeaderIndex(["CUST", "CUSTOMER", "CLIENT"], ["CUST", "CLIENT"]);
        const familyIdx = findImportHeaderIndex(["FAMILY", "PROD FAMILY", "PRODUCT FAMILY"], ["FAMILY"]);
        const foIdx = findImportHeaderIndex(["FO#", "FO", "FO NO", "FO NUMBER", "FACTORY ORDER"]);
        const poIdx = findImportHeaderIndex(["PO#", "PO", "PO NO", "PO NUMBER", "PURCHASE ORDER"]);
        const itemIdx = findImportHeaderIndex(["ITEM", "ITEM NO", "ITEM NUMBER", "PART", "PART NO", "PRODUCT", "STYLE", "ARTICLE"], ["ITEM", "PRODUCT", "STYLE"]);
        const descIdx = findImportHeaderIndex(["DESCRIPTION", "DESC", "ITEM DESCRIPTION"], ["DESC"]);
        const poQtyIdx = findImportHeaderIndex(["PO QTY", "POQTY", "PO QUANTITY", "QTY", "QUANTITY", "ORDER QTY"], ["PO QTY", "POQTY", "QTY", "QUANTITY"]);
        const doneIdx = findImportHeaderIndex(["DONE", "COMPLETED", "QTY DONE"], ["DONE", "COMPLETED"]);
        const shipIdx = findImportHeaderIndex(["SHIP", "SHIPMENT DATE", "SHIP DATE", "SHIPMENT_DATE", "SHIP_DATE", "DELIVERY DATE"], ["SHIP", "DATE"]);
        const capIdx = findImportHeaderIndex(["CAP/DAY", "CAPDAY", "CAP/ DAY", "CAP / DAY", "CAPACITY", "CAP", "CAPACITY/DAY", "DAILY CAPACITY"], ["CAP/DAY", "CAPDAY", "CAPACITY", "CAP"]);
        const statusIdx = findImportHeaderIndex(["STATUS", "STATE", "PRODUCTION STATUS"]);
        const commentIdx = findImportHeaderIndex(["COMMENT", "COMMENTS", "REMARK", "REMARKS", "NOTE", "NOTES"]);

        for (let i = 1; i < rawJson.length; i++) {
          const row = rawJson[i];
          if (!row || row.length === 0 || row.every((val: any) => val === undefined || val === "")) continue;

          const line = lineIdx !== -1 && row[lineIdx] !== undefined ? String(row[lineIdx]) : String(i);
          const planStatusRaw = planStatusIdx !== -1 && row[planStatusIdx] !== undefined ? String(row[planStatusIdx]).trim() : "Plan";
          const planStatus = planStatusRaw.toLowerCase().includes("hold") ? "Hold" : "Plan";
          const cust = custIdx !== -1 && row[custIdx] !== undefined ? String(row[custIdx]) : "";
          const family = familyIdx !== -1 && row[familyIdx] !== undefined ? String(row[familyIdx]) : "";
          const fo = foIdx !== -1 && row[foIdx] !== undefined ? String(row[foIdx]) : "";
          const po = poIdx !== -1 && row[poIdx] !== undefined ? String(row[poIdx]) : "";
          const item = itemIdx !== -1 && row[itemIdx] !== undefined ? String(row[itemIdx]) : "";
          const description = descIdx !== -1 && row[descIdx] !== undefined ? String(row[descIdx]) : "";
          
          const poQty = poQtyIdx !== -1 && row[poQtyIdx] !== undefined ? parseFloat(String(row[poQtyIdx]).replace(/,/g, "")) : 0;
          const poQtyVal = isNaN(poQty) ? 0 : poQty;

          const done = doneIdx !== -1 && row[doneIdx] !== undefined ? parseFloat(String(row[doneIdx]).replace(/,/g, "")) : 0;
          const doneVal = isNaN(done) ? 0 : done;

          const shipRaw = shipIdx !== -1 && row[shipIdx] !== undefined ? row[shipIdx] : "";
          const ship = formatToDDMMM(formatExcelDate(shipRaw));
          
          let capDay: number | "" = "";
          if (capIdx !== -1 && row[capIdx] !== undefined && row[capIdx] !== null && row[capIdx] !== "") {
            const parsedCap = parseFloat(String(row[capIdx]).replace(/,/g, ""));
            if (!isNaN(parsedCap)) capDay = parsedCap;
          }

          const status = statusIdx !== -1 && row[statusIdx] !== undefined ? String(row[statusIdx]).trim() : "";
          const comment = commentIdx !== -1 && row[commentIdx] !== undefined ? String(row[commentIdx]).trim() : "";

          mappedItems.push({
            line,
            planStatus,
            cust,
            family,
            fo,
            po,
            item,
            description,
            poQty: poQtyVal,
            done: doneVal,
            bal: Math.max(0, poQtyVal - doneVal),
            ship,
            capDay,
            daysReq: 0,
            remain: 0,
            status,
            comment,
          });
        }

        setOrders(mappedItems);
        setStatusMessage({
          type: "success",
          text: `Imported ${mappedItems.length} orders successfully from file [${file.name}].`,
        });
      } catch (err: any) {
        setStatusMessage({
          type: "error",
          text: `Failed to parse Excel/CSV: ${err.message || err}`,
        });
      }
    };

    reader.readAsBinaryString(file);
    e.target.value = ""; // reset input
  };

  // Export computed plan to Excel
  const handleExportFile = () => {
    if (computedOrders.length === 0) return;

    // Map table rows to key-value pairs representing actual output grid
    const exportRows = computedOrders.map((o) => {
      const rowObj: any = {
        "LINE": o.line,
        "PLAN STATUS": o.planStatus || "Plan",
        "CUST": o.cust,
        "FAMILY": o.family,
        "FO#": o.fo,
        "PO#": o.po,
        "ITEM": o.item,
        "DESCRIPTION": o.description,
        "PO QTY": o.poQty,
        "DONE": o.done,
        "BAL": o.bal,
        "SHIP": o.ship,
        "CAP/DAY": o.capDay === "" ? "" : o.capDay,
        "DAYS REQ": o.daysReq,
      };

      // Add WK columns dynamically
      for (let w = 1; w <= settings.numWeeks; w++) {
        rowObj[`WK-${w}`] = o[`wk${w}`] || 0;
      }

      rowObj["REMAIN"] = o.remain;
      rowObj["STATUS"] = o.status || "";
      rowObj["COMMENT"] = o.comment || "";

      return rowObj;
    });

    const worksheet = XLSX.utils.json_to_sheet(exportRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Capacity Load Plan");

    XLSX.writeFile(workbook, "Weekly_Capacity_Load_Plan.xlsx");
  };

  // Download simple input CSV template
  const handleDownloadTemplate = () => {
    const templateRows = [
      {
        "LINE": "1",
        "CUST": "Sample Customer",
        "FAMILY": "Sample Family",
        "FO#": "FO-101",
        "PO#": "PO-101",
        "ITEM": "ITEM-SAMPLE",
        "DESCRIPTION": "Example product description",
        "PO QTY": 5000,
        "DONE": 1000,
        "SHIP": "2026-08-15",
        "CAP/DAY": 400,
      },
    ];

    const worksheet = XLSX.utils.json_to_sheet(templateRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Planning_Template");
    XLSX.writeFile(workbook, "Capacity_Planning_Template.xlsx");
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans" id="app-root">
      {/* Top Header Section */}
      <header className="bg-[#0f172a] text-white px-8 py-5 flex flex-col gap-2 shadow-md">
        <div className="flex items-center gap-3">
          <CalendarCheck2 className="w-8 h-8 text-emerald-400 shrink-0" />
          <div>
            <h1 className="text-xl font-extrabold tracking-tight">Weekly Capacity Loader</h1>
            <p className="text-xs text-slate-400 font-medium">
              Automates the WK-1 ... WK-N / Remainder columns. Orders are poured into weekly buckets
              (in shipment-date order) until each week's capacity is full; overflow spills into the next week.
            </p>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 p-8 max-w-7xl mx-auto w-full flex flex-col gap-8">
        
        {/* Top Widgets Grid: Settings (Left) & Summary/Local Mode (Right) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          <div className="lg:col-span-2">
            <SettingsPanel settings={settings} onChange={setSettings} />
          </div>
          <div className="space-y-6">
            <div className="bg-slate-900 text-white rounded-xl p-6 shadow-sm border border-slate-800 flex flex-col gap-3">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Local-only mode</h3>
                <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                  This version runs entirely in the browser. Import Excel or CSV files, edit rows directly,
                  and export the result back to Excel without Firebase or a backend server.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="rounded-lg border border-slate-800 bg-slate-800/60 p-3">
                  <p className="text-slate-400 uppercase tracking-wider text-[10px]">Sync</p>
                  <p className="mt-1 font-semibold text-slate-100">Disabled</p>
                </div>
                <div className="rounded-lg border border-slate-800 bg-slate-800/60 p-3">
                  <p className="text-slate-400 uppercase tracking-wider text-[10px]">Hosting</p>
                  <p className="mt-1 font-semibold text-slate-100">GitHub Pages</p>
                </div>
              </div>
            </div>
            <SummaryCard orders={computedOrders} numWeeks={settings.numWeeks} />
          </div>
        </div>

        {/* Action Controls Toolbar */}
        <div className="flex flex-wrap justify-between items-center gap-4 bg-white border border-slate-100 rounded-xl p-4 shadow-2xs">
          <div className="flex flex-wrap items-center gap-3">
            {/* Local Import File (Input trigger hidden) */}
            <label className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs px-4 py-2 rounded-lg cursor-pointer transition-all flex items-center gap-1.5 shadow-xs">
              <Upload className="w-3.5 h-3.5" />
              Import Excel / CSV
              <input
                type="file"
                accept=".csv, .xlsx, .xls"
                className="hidden"
                onChange={handleImportFile}
              />
            </label>

            {/* Local Export File */}
            <button
              onClick={handleExportFile}
              disabled={computedOrders.length === 0}
              className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 font-semibold text-xs px-4 py-2 rounded-lg cursor-pointer transition-all flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              Export Excel
            </button>

            {/* Template Downloader */}
            <button
              onClick={handleDownloadTemplate}
              className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 font-semibold text-xs px-4 py-2 rounded-lg cursor-pointer transition-all flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5 text-emerald-600" />
              Download template
            </button>

            {/* Add Custom Row */}
            <button
              onClick={handleAddRow}
              className="bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs px-4 py-2 rounded-lg cursor-pointer transition-all flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Row
            </button>
          </div>

          <div className="flex items-center gap-3">
            {/* Clear All */}
            {showClearConfirm ? (
              <div className="flex items-center gap-2 bg-rose-50 border border-rose-100 rounded-lg px-3 py-1.5 animate-in fade-in zoom-in-95 duration-150">
                <span className="text-[11px] text-rose-700 font-semibold">Are you sure?</span>
                <button
                  onClick={() => {
                    setOrders([]);
                    setStatusMessage(null);
                    setShowClearConfirm(false);
                  }}
                  className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-[10px] px-2 py-1 rounded-md transition-all cursor-pointer"
                >
                  Yes, Clear
                </button>
                <button
                  onClick={() => setShowClearConfirm(false)}
                  className="bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 font-bold text-[10px] px-2 py-1 rounded-md transition-all cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={handleClearAll}
                className="bg-white hover:bg-rose-50 text-rose-600 border border-rose-100 font-semibold text-xs px-4 py-2 rounded-lg cursor-pointer transition-all flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Clear all
              </button>
            )}
          </div>
        </div>

        {/* Status notification toast/alert if any */}
        {statusMessage && (
          <div
            className={`border rounded-lg p-4 flex items-start gap-2.5 text-xs animate-in slide-in-from-top-2 duration-200 ${
              statusMessage.type === "success"
                ? "bg-emerald-50 border-emerald-100 text-emerald-800"
                : "bg-rose-50 border-rose-100 text-rose-800"
            }`}
          >
            <Info className={`w-4 h-4 shrink-0 ${statusMessage.type === "success" ? "text-emerald-500" : "text-rose-500"}`} />
            <div className="flex-1">
              <p className="font-semibold">{statusMessage.type === "success" ? "Success Notification" : "Error Occurred"}</p>
              <p className="mt-0.5 text-slate-600 leading-relaxed">{statusMessage.text}</p>
            </div>
            <button
              onClick={() => setStatusMessage(null)}
              className="text-slate-400 hover:text-slate-600 font-medium font-mono text-xs cursor-pointer ml-auto"
            >
              ✕
            </button>
          </div>
        )}

        {/* Dynamic Capacity Allocation Table */}
        <div className="space-y-2">
          <div className="flex justify-between items-center px-1">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
              <span>Production Schedule Grid</span>
            </h3>
            <span className="text-slate-400 text-[11px] font-medium italic">
              Double click any value to inline edit spreadsheet cell
            </span>
          </div>
          <DataTable
            orders={computedOrders}
            numWeeks={settings.numWeeks}
            sortBy={settings.sortBy}
            onSortByChange={(val) => setSettings((prev) => ({ ...prev, sortBy: val }))}
            sortLevels={settings.sortLevels || []}
            onSortLevelsChange={(levels) => setSettings((prev) => {
              const updated = { ...prev, sortLevels: levels };
              if (levels.length === 1) {
                updated.sortBy = levels[0].key;
              }
              return updated;
            })}
            onUpdateRow={handleUpdateRow}
            onDeleteRow={handleDeleteRow}
          />
        </div>

        {/* Informational Explanation Footnote */}
        <footer className="bg-slate-100 border border-slate-200 rounded-xl p-5 text-xs text-slate-500 leading-relaxed space-y-2">
          <p className="font-semibold text-slate-700 mb-1">How it works:</p>
          <p>
            Orders are prioritized sequentially based on your active <strong className="text-slate-700 font-medium">Sorting Order</strong> (which supports advanced, custom <strong className="text-slate-700 font-medium">Multi-level Sorting</strong>). Each order is then auto-scheduled individually across the planning weeks according to its line capacity rate — calculated as <strong className="text-slate-700 font-medium">CAP/DAY × Working days/week</strong>.
          </p>
          <p>
            <strong className="text-amber-700 font-semibold flex items-center gap-1.5 mt-1.5">
              <span className="inline-block w-1.5 h-1.5 bg-amber-500 rounded-full"></span>
              Plan Lock feature:
            </strong>{" "}
            You can lock any week column (e.g. WK-1, WK-2) for any order by clicking the padlock icon. When a week is locked, you can manually input a specific quantity; that amount is locked in place and bypassed by the automatic scheduler. The locked quantity is subtracted from the total order requirement and its corresponding capacity is deducted from that line's available days for subsequent orders.
          </p>
          <p>
            <strong className="text-rose-700 font-semibold flex items-center gap-1.5 mt-1.5">
              <span className="inline-block w-1.5 h-1.5 bg-rose-500 rounded-full"></span>
              Risk Alerts:
            </strong>{" "}
            Any active order that cannot be fully allocated within the visible weeks is left with a remaining quantity (<strong className="text-rose-600 font-medium">Remainder &gt; 0</strong>) and is automatically flagged with a high-visibility <strong className="text-rose-600 font-medium">Risk</strong> status badge.
          </p>
          <p className="text-[11px] text-slate-400 italic pt-1 border-t border-slate-200/60 mt-2">
            Adjust working days, capacity rates, multi-level sort parameters, or number of weeks to recalculate and run the capacity planning engine instantly. Any updates can be exported as Excel sheets and hosted as a static site on GitHub Pages.
          </p>
        </footer>
      </main>
    </div>
  );
}
