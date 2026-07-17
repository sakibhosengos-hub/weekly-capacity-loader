import React from "react";
import { OrderItem } from "../types";

interface SummaryCardProps {
  orders: OrderItem[];
  numWeeks: number;
}

export const SummaryCard: React.FC<SummaryCardProps> = ({ orders, numWeeks }) => {
  const ordersCount = orders.length;

  // Calculate sum of quantities scheduled across all weeks
  const totalScheduled = orders.reduce((sum, order) => {
    let weekSum = 0;
    for (let w = 1; w <= numWeeks; w++) {
      weekSum += Number(order[`wk${w}`]) || 0;
    }
    return sum + weekSum;
  }, 0);

  // Total Remainder (unfit)
  const totalRemainder = orders.reduce((sum, order) => sum + (Number(order.remain) || 0), 0);

  // Total Ordered (Total volume to schedule)
  const totalOrdered = orders.reduce((sum, order) => {
    return sum + (Number(order.poQty) || 0);
  }, 0);

  return (
    <div className="bg-white border border-slate-100 rounded-xl p-5 shadow-xs flex flex-col justify-between" id="summary-card">
      <div>
        <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-4">
          Summary
        </h2>
        
        <div className="space-y-4">
          <div className="flex justify-between items-center py-1 border-b border-slate-50">
            <span className="text-sm font-medium text-slate-600">Orders</span>
            <span className="font-mono text-base font-bold text-slate-800">
              {ordersCount.toLocaleString()}
            </span>
          </div>

          <div className="flex justify-between items-center py-1 border-b border-slate-50">
            <span className="text-sm font-medium text-slate-600">Scheduled</span>
            <span className="font-mono text-base font-bold text-emerald-600">
              {Math.round(totalScheduled).toLocaleString()}
            </span>
          </div>

          <div className="flex justify-between items-center py-1 border-b border-slate-50">
            <span className="text-sm font-medium text-slate-600">Remainder (unfit)</span>
            <span className="font-mono text-base font-bold text-rose-500">
              {Math.round(totalRemainder).toLocaleString()}
            </span>
          </div>

          <div className="flex justify-between items-center py-1">
            <span className="text-sm font-medium text-slate-600 font-semibold text-slate-700">Total ordered</span>
            <span className="font-mono text-lg font-extrabold text-slate-800">
              {Math.round(totalOrdered).toLocaleString()}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
