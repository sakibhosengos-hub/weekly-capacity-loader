import React from "react";
import { PlanningSettings, SortKey, QtyScheduleMode } from "../types";

interface SettingsPanelProps {
  settings: PlanningSettings;
  onChange: (settings: PlanningSettings) => void;
}

export const SettingsPanel: React.FC<SettingsPanelProps> = ({ settings, onChange }) => {
  const handleChange = (key: keyof PlanningSettings, value: any) => {
    onChange({
      ...settings,
      [key]: value,
    });
  };

  return (
    <div className="bg-white border border-slate-100 rounded-xl p-6 shadow-xs" id="settings-panel">
      <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-4">
        Settings
      </h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Number of Weeks */}
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-slate-700" htmlFor="numWeeks">
            Number of weeks
          </label>
          <input
            id="numWeeks"
            type="number"
            min="1"
            max="30"
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-sm"
            value={settings.numWeeks}
            onChange={(e) => handleChange("numWeeks", Math.max(1, parseInt(e.target.value) || 1))}
          />
        </div>

        {/* Working Days per Week */}
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-slate-700" htmlFor="workingDays">
            Working days / week
          </label>
          <input
            id="workingDays"
            type="number"
            min="1"
            max="7"
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-sm"
            value={settings.workingDays}
            onChange={(e) => handleChange("workingDays", Math.max(1, Math.min(7, parseInt(e.target.value) || 1)))}
          />
        </div>

        {/* Quantity to Schedule */}
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-slate-700" htmlFor="qtyScheduleMode">
            Quantity to schedule
          </label>
          <select
            id="qtyScheduleMode"
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-sm"
            value={settings.qtyScheduleMode}
            onChange={(e) => handleChange("qtyScheduleMode", e.target.value as QtyScheduleMode)}
          >
            <option value="PO Qty (full order)">PO Qty (full order)</option>
            <option value="BAL (PO Qty - Done)">PO Qty - Done (Balance)</option>
          </select>
        </div>
      </div>

      {/* Description text */}
      <p className="text-xs text-slate-400 mt-5 leading-relaxed bg-slate-50 border border-slate-100 rounded-lg p-3">
        Each order is distributed individually at its own line & product rate:{" "}
        <strong className="text-slate-600 font-medium">
          weekly qty = CAP/DAY × Working days/week
        </strong>
        . The order flows across consecutive weeks at that pace until its qty is placed; any
        leftover after WK-N goes to Remainder. If a row is missing its{" "}
        <strong className="text-slate-600 font-medium">CAP/DAY</strong> value, it is placed on{" "}
        <strong className="text-rose-600 font-semibold">Auto-Hold</strong> and cannot be scheduled until a valid rate is entered.
      </p>
    </div>
  );
};
