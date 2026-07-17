import React, { useState, useEffect } from "react";
import { OrderItem, SortKey, SortLevel, SortDirection } from "../types";
import { Calendar, Layers, Trash2, SlidersHorizontal, ChevronDown, Maximize2, Minimize2, Search, X, ArrowUpDown, Plus, ArrowUp, ArrowDown, Lock, Unlock } from "lucide-react";
import { formatToDDMMM } from "../lib/planning";

interface DataTableProps {
  orders: OrderItem[];
  numWeeks: number;
  sortBy: SortKey;
  onSortByChange: (val: SortKey) => void;
  sortLevels: SortLevel[];
  onSortLevelsChange: (levels: SortLevel[]) => void;
  onUpdateRow: (index: number, updatedRow: OrderItem) => void;
  onDeleteRow: (index: number) => void;
}

export const DataTable: React.FC<DataTableProps> = ({
  orders,
  numWeeks,
  sortBy,
  onSortByChange,
  sortLevels,
  onSortLevelsChange,
  onUpdateRow,
  onDeleteRow,
}) => {
  const [showColumnMenu, setShowColumnMenu] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchField, setSearchField] = useState<string>("all");
  const [showMultiLevelSort, setShowMultiLevelSort] = useState(false);

  const handleSortByChange = (val: SortKey) => {
    onSortByChange(val);
    const defaultDirection = ["PO QTY", "DONE", "BAL", "CAP/DAY", "DAYS REQ", "REMAIN"].includes(val) ? "desc" : "asc";
    onSortLevelsChange([{ key: val, direction: defaultDirection }]);
  };

  const [visibleCols, setVisibleCols] = useState<Record<string, boolean>>({
    line: true,
    planStatus: true,
    cust: true,
    family: true,
    fo: true,
    po: true,
    item: true,
    description: true,
    poQty: true,
    done: true,
    bal: true,
    ship: true,
    capDay: true,
    daysReq: true,
    weeks: true,
    remain: true,
    status: true,
    comment: true,
  });

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isFullscreen) {
        setIsFullscreen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isFullscreen]);

  const columnLabels: { key: string; label: string }[] = [
    { key: "line", label: "Line" },
    { key: "planStatus", label: "Plan/Hold" },
    { key: "cust", label: "Cust" },
    { key: "family", label: "Family" },
    { key: "fo", label: "FO#" },
    { key: "po", label: "PO#" },
    { key: "item", label: "Item" },
    { key: "description", label: "Description" },
    { key: "poQty", label: "PO Qty" },
    { key: "done", label: "Done" },
    { key: "bal", label: "Bal" },
    { key: "ship", label: "Ship" },
    { key: "capDay", label: "Cap/Day" },
    { key: "daysReq", label: "Days Req" },
    { key: "weeks", label: "Weekly Allocation" },
    { key: "remain", label: "Remain" },
    { key: "status", label: "Status" },
    { key: "comment", label: "Comment" },
  ];

  const searchFields = [
    { key: "all", label: "All Fields" },
    { key: "line", label: "Line" },
    { key: "cust", label: "Customer" },
    { key: "family", label: "Family" },
    { key: "fo", label: "FO#" },
    { key: "po", label: "PO#" },
    { key: "item", label: "Item" },
    { key: "description", label: "Description" },
    { key: "ship", label: "Shipment Date" },
    { key: "status", label: "Status" },
    { key: "comment", label: "Comment" },
  ];

  const searchLower = searchTerm.toLowerCase().trim();
  const filteredOrdersWithIndices = orders
    .map((order, originalIndex) => ({ order, originalIndex }))
    .filter(({ order }) => {
      if (!searchLower) return true;
      if (searchField === "all") {
        return (
          String(order.line || "").toLowerCase().includes(searchLower) ||
          String(order.cust || "").toLowerCase().includes(searchLower) ||
          String(order.family || "").toLowerCase().includes(searchLower) ||
          String(order.fo || "").toLowerCase().includes(searchLower) ||
          String(order.po || "").toLowerCase().includes(searchLower) ||
          String(order.item || "").toLowerCase().includes(searchLower) ||
          String(order.description || "").toLowerCase().includes(searchLower) ||
          String(order.ship || "").toLowerCase().includes(searchLower) ||
          String(order.status || "").toLowerCase().includes(searchLower) ||
          String(order.comment || "").toLowerCase().includes(searchLower)
        );
      } else {
        const value = order[searchField as keyof OrderItem];
        return String(value || "").toLowerCase().includes(searchLower);
      }
    });

  const getColSpan = () => {
    let count = 1; // Delete action col is always visible
    if (visibleCols.line) count++;
    if (visibleCols.planStatus) count++;
    if (visibleCols.cust) count++;
    if (visibleCols.family) count++;
    if (visibleCols.fo) count++;
    if (visibleCols.po) count++;
    if (visibleCols.item) count++;
    if (visibleCols.description) count++;
    if (visibleCols.poQty) count++;
    if (visibleCols.done) count++;
    if (visibleCols.bal) count++;
    if (visibleCols.ship) count++;
    if (visibleCols.capDay) count++;
    if (visibleCols.daysReq) count++;
    if (visibleCols.weeks) count += numWeeks;
    if (visibleCols.remain) count++;
    if (visibleCols.status) count++;
    if (visibleCols.comment) count++;
    return count;
  };

  return (
    <div
      className={
        isFullscreen
          ? "fixed inset-0 z-50 bg-white p-6 overflow-hidden flex flex-col h-screen w-screen animate-in fade-in duration-150"
          : "bg-white border border-slate-100 rounded-xl shadow-xs overflow-hidden flex flex-col"
      }
      id="data-table"
    >
      {/* Control bar inside table container */}
      <div className="p-3 border-b border-slate-100 bg-slate-50/40 flex justify-between items-center gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-700">Orders Capacity Plan</span>
          <span className="text-[10px] text-slate-400 font-mono bg-slate-100 px-1.5 py-0.5 rounded-md">
            {searchTerm ? `${filteredOrdersWithIndices.length} of ${orders.length}` : orders.length} Row{orders.length !== 1 && "s"}
          </span>
          {isFullscreen && (
            <span className="bg-amber-100 text-amber-800 text-[10px] px-2 py-0.5 rounded-full font-bold animate-pulse">
              Fullscreen Mode (Press Esc to Exit)
            </span>
          )}
        </div>

        {/* Buttons Toolbar */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Search Input & Dropdown */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            <div className="relative flex items-center">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder={
                  searchField === "all"
                    ? "Search orders..."
                    : `Search ${searchFields.find((f) => f.key === searchField)?.label}...`
                }
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 pr-7 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all w-36 sm:w-48 shadow-2xs"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm("")}
                  className="absolute right-2 text-slate-400 hover:text-slate-600 transition-colors p-0.5 rounded-full hover:bg-slate-100 cursor-pointer"
                  title="Clear search"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            <div className="flex items-center bg-white border border-slate-200 rounded-lg px-2 py-1.5 shadow-2xs">
              <select
                value={searchField}
                onChange={(e) => setSearchField(e.target.value)}
                className="text-xs font-semibold text-slate-600 hover:text-slate-800 bg-transparent focus:outline-none cursor-pointer pr-1"
                title="Filter by column"
              >
                {searchFields.map((f) => (
                  <option key={f.key} value={f.key}>
                    {f.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          {/* Sort By Dropdown & Multi-level Sort Trigger */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 shadow-2xs">
              <span className="text-[11px] font-semibold text-slate-500 whitespace-nowrap">Sort by:</span>
              <select
                value={sortLevels.length > 1 ? "multi" : (sortLevels.length === 1 ? sortLevels[0].key : sortBy)}
                onChange={(e) => {
                  if (e.target.value === "multi") {
                    setShowMultiLevelSort(true);
                  } else {
                    handleSortByChange(e.target.value as SortKey);
                  }
                }}
                className="text-xs font-semibold text-slate-700 bg-transparent focus:outline-none cursor-pointer pr-1"
              >
                {sortLevels.length > 1 && <option value="multi">Custom (Multi-level)</option>}
                <option value="Shipment date">Shipment date</option>
                <option value="LINE">LINE</option>
                <option value="Plan/Hold">Plan/Hold</option>
                <option value="CUST">CUST</option>
                <option value="FAMILY">FAMILY</option>
                <option value="FO#">FO#</option>
                <option value="PO#">PO#</option>
                <option value="ITEM">ITEM</option>
                <option value="DESCRIPTION">DESCRIPTION</option>
                <option value="PO QTY">PO QTY</option>
                <option value="DONE">DONE</option>
                <option value="BAL">BAL</option>
                <option value="CAP/DAY">CAP/DAY</option>
                <option value="DAYS REQ">DAYS REQ</option>
                <option value="REMAIN">REMAIN</option>
                <option value="STATUS">STATUS</option>
                <option value="COMMENT">COMMENT</option>
              </select>
            </div>

            <button
              onClick={() => setShowMultiLevelSort(!showMultiLevelSort)}
              className={`border font-semibold text-[11px] px-2.5 py-1.5 rounded-lg cursor-pointer transition-all flex items-center gap-1.5 shadow-2xs ${
                showMultiLevelSort
                  ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                  : "bg-white border-slate-200 hover:border-slate-300 text-slate-700 hover:bg-slate-50"
              }`}
              title="Configure advanced multi-level sorting criteria"
            >
              <ArrowUpDown className="w-3.5 h-3.5 text-slate-500" />
              <span className="hidden sm:inline">Multi-level Sort</span>
              {sortLevels.length > 1 && (
                <span className="bg-emerald-100 text-emerald-800 text-[9px] font-bold px-1.5 py-0.5 rounded-full">
                  {sortLevels.length}
                </span>
              )}
            </button>
          </div>

          {/* Column Hide/Show Dropdown Menu */}
          <div className="relative">
            <button
              onClick={() => setShowColumnMenu(!showColumnMenu)}
              className="bg-white border border-slate-200 hover:border-slate-300 text-slate-700 font-semibold text-xs px-2.5 py-1.5 rounded-lg cursor-pointer hover:bg-slate-50 transition-all flex items-center gap-1.5 shadow-2xs"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-slate-500" />
              <span>Show / Hide Columns</span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>

            {showColumnMenu && (
              <>
                <div className="fixed inset-0 z-20" onClick={() => setShowColumnMenu(false)} />
                <div className="absolute right-0 mt-1 w-64 bg-white border border-slate-200 rounded-xl shadow-lg z-30 p-3 max-h-96 overflow-y-auto animate-in fade-in slide-in-from-top-1 duration-100">
                  <div className="flex justify-between items-center pb-2 mb-2 border-b border-slate-100">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Columns</span>
                    <button
                      onClick={() => {
                        const allOn: Record<string, boolean> = {};
                        columnLabels.forEach((col) => {
                          allOn[col.key] = true;
                        });
                        setVisibleCols(allOn);
                      }}
                      className="text-[10px] text-emerald-600 font-semibold hover:underline cursor-pointer"
                    >
                      Reset All
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    {columnLabels.map((col) => (
                      <label
                        key={col.key}
                        className="flex items-center gap-1.5 px-1.5 py-1 rounded-md hover:bg-slate-50 cursor-pointer text-xs select-none transition-all text-slate-700"
                      >
                        <input
                          type="checkbox"
                          checked={!!visibleCols[col.key]}
                          onChange={(e) => {
                            setVisibleCols({
                              ...visibleCols,
                              [col.key]: e.target.checked,
                            });
                          }}
                          className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 h-3.5 w-3.5"
                        />
                        <span className="font-medium text-slate-600 text-[11px] truncate">{col.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Full Screen Toggle Button */}
          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="bg-white border border-slate-200 hover:border-slate-300 text-slate-700 font-semibold text-xs px-2.5 py-1.5 rounded-lg cursor-pointer hover:bg-slate-50 transition-all flex items-center gap-1.5 shadow-2xs"
            title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
          >
            {isFullscreen ? (
              <>
                <Minimize2 className="w-3.5 h-3.5 text-slate-500" />
                <span>Exit Fullscreen</span>
              </>
            ) : (
              <>
                <Maximize2 className="w-3.5 h-3.5 text-slate-500" />
                <span>Fullscreen</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Multi-level Sort Panel */}
      {showMultiLevelSort && (
        <div className="p-4 bg-slate-50 border-b border-slate-100 flex flex-col gap-3 animate-in slide-in-from-top-1 duration-150">
          <div className="flex justify-between items-center">
            <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <ArrowUpDown className="w-4 h-4 text-emerald-500" />
              Configure Multi-level Sorting Order
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  const newLevels = [...sortLevels, { key: "LINE" as SortKey, direction: "asc" as SortDirection }];
                  onSortLevelsChange(newLevels);
                }}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-[11px] px-2.5 py-1 rounded-md transition-all flex items-center gap-1 cursor-pointer shadow-sm animate-in zoom-in-95 duration-100"
              >
                <Plus className="w-3 h-3" />
                Add Level
              </button>
              <button
                onClick={() => {
                  onSortLevelsChange([{ key: "Shipment date", direction: "asc" }]);
                }}
                className="bg-white hover:bg-slate-100 border border-slate-200 text-slate-600 font-semibold text-[11px] px-2.5 py-1 rounded-md transition-all cursor-pointer"
              >
                Reset to Default
              </button>
            </div>
          </div>

          {sortLevels.length === 0 ? (
            <p className="text-xs text-slate-400 italic">No sorting levels configured. Orders will be displayed as imported.</p>
          ) : (
            <div className="flex flex-col gap-2 max-h-48 overflow-y-auto pr-1">
              {sortLevels.map((level, idx) => (
                <div key={idx} className="flex items-center gap-2 flex-wrap sm:flex-nowrap p-1 bg-white border border-slate-100 rounded-lg shadow-2xs">
                  <span className="text-xs font-semibold text-slate-500 min-w-[70px] pl-1.5">
                    {idx === 0 ? "Sort by" : "Then by"}
                  </span>

                  {/* Key Dropdown */}
                  <select
                    value={level.key}
                    onChange={(e) => {
                      const updated = [...sortLevels];
                      updated[idx] = { ...updated[idx], key: e.target.value as SortKey };
                      onSortLevelsChange(updated);
                    }}
                    className="text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-md px-2 py-1 focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer min-w-[150px]"
                  >
                    <option value="Shipment date">Shipment date</option>
                    <option value="LINE">LINE</option>
                    <option value="Plan/Hold">Plan/Hold</option>
                    <option value="CUST">CUST</option>
                    <option value="FAMILY">FAMILY</option>
                    <option value="FO#">FO#</option>
                    <option value="PO#">PO#</option>
                    <option value="ITEM">ITEM</option>
                    <option value="DESCRIPTION">DESCRIPTION</option>
                    <option value="PO QTY">PO QTY</option>
                    <option value="DONE">DONE</option>
                    <option value="BAL">BAL</option>
                    <option value="CAP/DAY">CAP/DAY</option>
                    <option value="DAYS REQ">DAYS REQ</option>
                    <option value="REMAIN">REMAIN</option>
                    <option value="STATUS">STATUS</option>
                    <option value="COMMENT">COMMENT</option>
                  </select>

                  {/* Direction Dropdown */}
                  <select
                    value={level.direction}
                    onChange={(e) => {
                      const updated = [...sortLevels];
                      updated[idx] = { ...updated[idx], direction: e.target.value as SortDirection };
                      onSortLevelsChange(updated);
                    }}
                    className="text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-md px-2 py-1 focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
                  >
                    <option value="asc">Ascending (A to Z, Low to High)</option>
                    <option value="desc">Descending (Z to A, High to Low)</option>
                  </select>

                  {/* Actions */}
                  <div className="flex items-center gap-1 ml-auto pr-1">
                    <button
                      disabled={idx === 0}
                      onClick={() => {
                        if (idx === 0) return;
                        const updated = [...sortLevels];
                        const temp = updated[idx];
                        updated[idx] = updated[idx - 1];
                        updated[idx - 1] = temp;
                        onSortLevelsChange(updated);
                      }}
                      className="p-1 hover:bg-slate-100 text-slate-500 hover:text-slate-700 rounded transition-all disabled:opacity-30 cursor-pointer"
                      title="Move Up"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      disabled={idx === sortLevels.length - 1}
                      onClick={() => {
                        if (idx === sortLevels.length - 1) return;
                        const updated = [...sortLevels];
                        const temp = updated[idx];
                        updated[idx] = updated[idx + 1];
                        updated[idx + 1] = temp;
                        onSortLevelsChange(updated);
                      }}
                      className="p-1 hover:bg-slate-100 text-slate-500 hover:text-slate-700 rounded transition-all disabled:opacity-30 cursor-pointer"
                      title="Move Down"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => {
                        const updated = sortLevels.filter((_, i) => i !== idx);
                        onSortLevelsChange(updated);
                      }}
                      className="p-1 hover:bg-rose-50 text-rose-500 rounded transition-all cursor-pointer"
                      title="Delete Level"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
          <p className="text-[10px] text-slate-400 leading-relaxed italic border-t border-slate-100 pt-1.5 mt-1">
            * Sorting criteria are evaluated sequentially. If values for the preceding level are identical, rows are sorted by the subsequent level. Priority can be reordered using the arrow keys.
          </p>
        </div>
      )}

      <div className={`scrollbar-thin ${isFullscreen ? "overflow-auto flex-1 h-full" : "overflow-x-auto overflow-y-visible"}`}>
        <table className="w-full text-left border-collapse table-fixed min-w-[1400px]">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              {visibleCols.line && <th className="p-3 w-24">Line</th>}
              {visibleCols.planStatus && <th className="p-3 w-28">Plan/Hold</th>}
              {visibleCols.cust && <th className="p-3 w-24">Cust</th>}
              {visibleCols.family && <th className="p-3 w-24">Family</th>}
              {visibleCols.fo && <th className="p-3 w-24">FO#</th>}
              {visibleCols.po && <th className="p-3 w-24">PO#</th>}
              {visibleCols.item && <th className="p-3 w-28">Item</th>}
              {visibleCols.description && <th className="p-3 w-40">Description</th>}
              {visibleCols.poQty && <th className="p-3 text-right w-24">PO Qty</th>}
              {visibleCols.done && <th className="p-3 text-right w-20">Done</th>}
              {visibleCols.bal && <th className="p-3 text-right w-20">Bal</th>}
              {visibleCols.ship && <th className="p-3 w-28">Ship</th>}
              {visibleCols.capDay && <th className="p-3 w-24">Cap/Day</th>}
              {visibleCols.daysReq && <th className="p-3 text-right w-24">Days Req</th>}
              
              {/* Dynamic Week columns */}
              {visibleCols.weeks && Array.from({ length: numWeeks }, (_, i) => (
                <th key={i} className="p-3 text-right w-20 bg-emerald-50/20 text-emerald-700 font-semibold">
                  WK-{i + 1}
                </th>
              ))}

              {visibleCols.remain && <th className="p-3 text-right w-24 bg-rose-50/20 text-rose-600">Remain</th>}
              {visibleCols.status && <th className="p-3 w-28">Status</th>}
              {visibleCols.comment && <th className="p-3 w-48">Comment</th>}
              <th className="p-3 w-12 text-center">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-xs">
            {filteredOrdersWithIndices.length === 0 ? (
              <tr>
                <td colSpan={getColSpan()} className="p-10 text-center text-slate-400">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <Layers className="w-8 h-8 text-slate-300" />
                    <p className="text-slate-500 font-medium text-sm">
                      {orders.length === 0 ? "No orders loaded yet." : "No matching orders found."}
                    </p>
                    <p className="text-xs text-slate-400 max-w-sm leading-relaxed">
                      {orders.length === 0
                        ? "Import a CSV or Excel file to start scheduling capacity automatically."
                        : "Try adjusting your search keywords or clearing the search filter."}
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              filteredOrdersWithIndices.map(({ order, originalIndex }, idx) => (
                <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                  {/* Line */}
                  {visibleCols.line && (
                    <td className="p-3 font-medium text-slate-900">
                      {order.line}
                    </td>
                  )}
                  {/* Plan/Hold Selection */}
                  {visibleCols.planStatus && (
                    <td className="p-3">
                      <div className="flex items-center gap-2 justify-start min-w-[90px]" id={`toggle-container-${order.line}`}>
                        {(() => {
                          const isCapDayMissing = order.capDay === "" || order.capDay === undefined || order.capDay === null;
                          const currentPlanStatus = isCapDayMissing ? "Hold" : (order.planStatus || "Plan");
                          
                          return (
                            <>
                              <button
                                type="button"
                                disabled={isCapDayMissing}
                                onClick={() => {
                                  if (isCapDayMissing) return;
                                  const next = currentPlanStatus === "Plan" ? "Hold" : "Plan";
                                  onUpdateRow(originalIndex, { ...order, planStatus: next });
                                }}
                                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-emerald-500/20 ${
                                  isCapDayMissing
                                    ? "bg-slate-200 cursor-not-allowed opacity-60"
                                    : currentPlanStatus === "Plan" ? "bg-emerald-500" : "bg-slate-300"
                                }`}
                                title={isCapDayMissing ? "Enter CAP/DAY in order to plan" : `Click to toggle to ${currentPlanStatus === "Plan" ? "Hold" : "Plan"}`}
                              >
                                <span
                                  className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-xs transition duration-200 ease-in-out ${
                                    currentPlanStatus === "Plan" ? "translate-x-4" : "translate-x-0"
                                  }`}
                                />
                              </button>
                              <span className={`text-[11px] font-bold tracking-wide select-none ${
                                isCapDayMissing
                                  ? "text-rose-500 font-extrabold"
                                  : currentPlanStatus === "Plan" ? "text-emerald-700" : "text-slate-500"
                              }`}>
                                {isCapDayMissing ? "Auto-Hold" : currentPlanStatus}
                              </span>
                            </>
                          );
                        })()}
                      </div>
                    </td>
                  )}
                  {/* Cust */}
                  {visibleCols.cust && (
                    <td className="p-3 truncate">
                      <input
                        type="text"
                        className="w-full bg-transparent hover:bg-slate-100 focus:bg-white focus:ring-1 focus:ring-emerald-500 rounded px-1 py-0.5 border-0"
                        value={order.cust}
                        onChange={(e) => onUpdateRow(originalIndex, { ...order, cust: e.target.value })}
                      />
                    </td>
                  )}
                  {/* Family */}
                  {visibleCols.family && (
                    <td className="p-3 truncate">
                      <input
                        type="text"
                        className="w-full bg-transparent hover:bg-slate-100 focus:bg-white focus:ring-1 focus:ring-emerald-500 rounded px-1 py-0.5 border-0"
                        value={order.family}
                        onChange={(e) => onUpdateRow(originalIndex, { ...order, family: e.target.value })}
                      />
                    </td>
                  )}
                  {/* FO# */}
                  {visibleCols.fo && (
                    <td className="p-3 truncate font-mono text-[11px]">
                      <input
                        type="text"
                        className="w-full bg-transparent hover:bg-slate-100 focus:bg-white focus:ring-1 focus:ring-emerald-500 rounded px-1 py-0.5 border-0"
                        value={order.fo}
                        onChange={(e) => onUpdateRow(originalIndex, { ...order, fo: e.target.value })}
                      />
                    </td>
                  )}
                  {/* PO# */}
                  {visibleCols.po && (
                    <td className="p-3 truncate font-mono text-[11px]">
                      <input
                        type="text"
                        className="w-full bg-transparent hover:bg-slate-100 focus:bg-white focus:ring-1 focus:ring-emerald-500 rounded px-1 py-0.5 border-0"
                        value={order.po}
                        onChange={(e) => onUpdateRow(originalIndex, { ...order, po: e.target.value })}
                      />
                    </td>
                  )}
                  {/* Item */}
                  {visibleCols.item && (
                    <td className="p-3 truncate">
                      <input
                        type="text"
                        className="w-full bg-transparent hover:bg-slate-100 focus:bg-white focus:ring-1 focus:ring-emerald-500 rounded px-1 py-0.5 border-0 font-medium text-slate-800"
                        value={order.item}
                        onChange={(e) => onUpdateRow(originalIndex, { ...order, item: e.target.value })}
                      />
                    </td>
                  )}
                  {/* Description */}
                  {visibleCols.description && (
                    <td className="p-3 truncate text-slate-500">
                      <input
                        type="text"
                        className="w-full bg-transparent hover:bg-slate-100 focus:bg-white focus:ring-1 focus:ring-emerald-500 rounded px-1 py-0.5 border-0"
                        value={order.description}
                        onChange={(e) => onUpdateRow(originalIndex, { ...order, description: e.target.value })}
                      />
                    </td>
                  )}
                  {/* PO Qty */}
                  {visibleCols.poQty && (
                    <td className="p-3 text-right">
                      <input
                        type="number"
                        className="w-full bg-transparent text-right hover:bg-slate-100 focus:bg-white focus:ring-1 focus:ring-emerald-500 rounded px-1 py-0.5 border-0 font-mono"
                        value={order.poQty}
                        onChange={(e) => onUpdateRow(originalIndex, { ...order, poQty: Math.max(0, parseInt(e.target.value) || 0) })}
                      />
                    </td>
                  )}
                  {/* Done */}
                  {visibleCols.done && (
                    <td className="p-3 text-right">
                      <input
                        type="number"
                        className="w-full bg-transparent text-right hover:bg-slate-100 focus:bg-white focus:ring-1 focus:ring-emerald-500 rounded px-1 py-0.5 border-0 font-mono text-slate-500"
                        value={order.done}
                        onChange={(e) => onUpdateRow(originalIndex, { ...order, done: Math.max(0, parseInt(e.target.value) || 0) })}
                      />
                    </td>
                  )}
                  {/* Bal */}
                  {visibleCols.bal && (
                    <td className="p-3 text-right font-mono font-medium text-slate-700">
                      {(order.bal || 0).toLocaleString()}
                    </td>
                  )}
                  {/* Ship */}
                  {visibleCols.ship && (
                    <td className="p-3 truncate text-slate-600">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-slate-400 shrink-0" />
                        <input
                          type="text"
                          className="w-full bg-transparent hover:bg-slate-100 focus:bg-white focus:ring-1 focus:ring-emerald-500 rounded px-1 py-0.5 border-0 text-xs text-slate-600 font-mono font-semibold"
                          value={order.ship}
                          onChange={(e) => onUpdateRow(originalIndex, { ...order, ship: e.target.value })}
                          onBlur={(e) => onUpdateRow(originalIndex, { ...order, ship: formatToDDMMM(e.target.value) })}
                        />
                      </div>
                    </td>
                  )}
                  {/* Cap/Day */}
                  {visibleCols.capDay && (
                    <td className="p-3">
                      <input
                        type="number"
                        placeholder="Required"
                        className={`w-full bg-transparent hover:bg-slate-100 focus:bg-white focus:ring-1 rounded px-1 py-0.5 border border-dashed text-center font-mono font-bold text-xs ${
                          order.capDay === ""
                            ? "border-rose-300 text-rose-500 placeholder-rose-300 bg-rose-50/10 focus:ring-rose-500"
                            : "border-slate-200 text-slate-800 focus:ring-emerald-500"
                        }`}
                        value={order.capDay === "" ? "" : order.capDay}
                        onChange={(e) => {
                          const val = e.target.value;
                          onUpdateRow(originalIndex, {
                            ...order,
                            capDay: val === "" ? "" : Math.max(0, parseFloat(val) || 0),
                          });
                        }}
                      />
                    </td>
                  )}
                  {/* Days Req */}
                  {visibleCols.daysReq && (
                    <td className="p-3 text-right font-mono font-medium text-slate-600">
                      {order.daysReq}
                    </td>
                  )}

                  {/* Weeks values (WK-1...WK-N) */}
                  {visibleCols.weeks && Array.from({ length: numWeeks }, (_, wIdx) => {
                    const wkKey = `wk${wIdx + 1}`;
                    const wkVal = order[wkKey] || 0;
                    const lockedWeeks = order.lockedWeeks || {};
                    const isLocked = lockedWeeks[wkKey] !== undefined;

                    // Toggle Lock/Unlock state
                    const toggleLock = () => {
                      const newLockedWeeks = { ...lockedWeeks };
                      if (isLocked) {
                        delete newLockedWeeks[wkKey];
                      } else {
                        newLockedWeeks[wkKey] = wkVal;
                      }
                      
                      onUpdateRow(originalIndex, {
                        ...order,
                        lockedWeeks: Object.keys(newLockedWeeks).length > 0 ? newLockedWeeks : undefined
                      });
                    };

                    // Update manual locked quantity
                    const handleLockedValChange = (valStr: string) => {
                      const newLockedWeeks = { ...lockedWeeks };
                      const val = Math.max(0, parseInt(valStr) || 0);
                      newLockedWeeks[wkKey] = val;
                      onUpdateRow(originalIndex, {
                        ...order,
                        lockedWeeks: newLockedWeeks
                      });
                    };

                    return (
                      <td
                        key={wIdx}
                        className={`p-2 text-right font-mono border-x border-slate-100 transition-colors ${
                          isLocked 
                            ? "bg-amber-50/20 text-amber-700 font-bold" 
                            : "bg-emerald-50/10 text-emerald-600 font-medium"
                        }`}
                      >
                        <div className="flex items-center justify-end gap-1 group min-h-[28px]">
                          {isLocked ? (
                            <>
                              <input
                                type="number"
                                value={wkVal}
                                onChange={(e) => handleLockedValChange(e.target.value)}
                                className="w-16 bg-white/80 text-right focus:bg-white focus:ring-1 focus:ring-amber-500 rounded px-1 py-0.5 border border-amber-200 text-xs font-mono font-bold text-amber-800"
                                placeholder="0"
                              />
                              <button
                                onClick={toggleLock}
                                className="p-0.5 hover:bg-amber-100 rounded text-amber-600 hover:text-amber-800 transition-colors cursor-pointer shrink-0"
                                title="Click to UNLOCK and return to auto-planning"
                              >
                                <Lock className="w-3 h-3" />
                              </button>
                            </>
                          ) : (
                            <>
                              <span className="select-none py-0.5 px-1">
                                {wkVal > 0 ? wkVal.toLocaleString() : "-"}
                              </span>
                              <button
                                onClick={toggleLock}
                                className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-emerald-100 rounded text-slate-400 hover:text-emerald-600 transition-opacity cursor-pointer shrink-0"
                                title="Click to LOCK and fix this quantity"
                              >
                                <Unlock className="w-3 h-3" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    );
                  })}

                  {/* Remain */}
                  {visibleCols.remain && (
                    <td className={`p-3 text-right font-mono font-semibold bg-rose-50/10 border-r border-slate-50 ${order.remain > 0 ? "text-rose-500" : "text-slate-400"}`}>
                      {order.remain > 0 ? order.remain.toLocaleString() : "-"}
                    </td>
                  )}

                  {/* Status */}
                  {visibleCols.status && (
                    <td className="p-3">
                      {(() => {
                        const s = order.status || "Scheduled";
                        let badgeClass = "bg-indigo-50 text-indigo-700 border-indigo-100";
                        if (s === "Complete") {
                          badgeClass = "bg-emerald-50 text-emerald-700 border-emerald-200";
                        } else if (s === "Hold") {
                          badgeClass = "bg-amber-50 text-amber-700 border-amber-200";
                        } else if (s === "Risk") {
                          badgeClass = "bg-rose-50 text-rose-700 border-rose-200";
                        }
                        return (
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold border ${badgeClass}`} id={`status-badge-${order.line}`}>
                            {s}
                          </span>
                        );
                      })()}
                    </td>
                  )}

                  {/* Comment */}
                  {visibleCols.comment && (
                    <td className="p-3">
                      <input
                        type="text"
                        className="w-full bg-transparent hover:bg-slate-100 focus:bg-white focus:ring-1 focus:ring-emerald-500 rounded px-1.5 py-0.5 border-0 text-slate-600 text-xs"
                        value={order.comment || ""}
                        placeholder="Comment"
                        onChange={(e) => onUpdateRow(originalIndex, { ...order, comment: e.target.value })}
                      />
                    </td>
                  )}

                  {/* Action */}
                  <td className="p-3 text-center">
                    <button
                      onClick={() => onDeleteRow(originalIndex)}
                      className="p-1 text-slate-400 hover:text-rose-500 rounded hover:bg-rose-50 transition-colors cursor-pointer"
                      title="Delete Row"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
