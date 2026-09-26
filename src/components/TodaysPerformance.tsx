import React from 'react';
import { Order, MenuItem } from '../types';
import { 
  TrendingUp, ShoppingBag, DollarSign, ArrowRight,
  Sparkles, CheckCircle2, ShieldAlert, Coins
} from 'lucide-react';

interface TodaysPerformanceProps {
  orders: Order[];
  menuItems: MenuItem[];
  currency: string;
}

export default function TodaysPerformance({ orders, menuItems, currency }: TodaysPerformanceProps) {
  const todayStr = new Date().toDateString();
  
  // Filter today's orders
  const todayOrders = orders.filter(o => new Date(o.timestamp).toDateString() === todayStr);
  const paidTodayOrders = todayOrders.filter(o => o.paymentStatus === 'PAID');
  const pendingTodayOrders = todayOrders.filter(o => o.paymentStatus === 'PENDING');
  
  // Calculations
  const totalSales = paidTodayOrders.reduce((sum, o) => sum + o.total, 0);
  const totalTransactions = todayOrders.length;
  const paidTransactions = paidTodayOrders.length;
  const pendingTransactions = pendingTodayOrders.length;
  
  // Cost of Goods Sold (COGS) for paid orders
  let totalCOGS = 0;
  paidTodayOrders.forEach(order => {
    order.items.forEach(item => {
      const menuItem = menuItems.find(m => m.id === item.menuItemId);
      if (menuItem) {
        const baseCost = menuItem.cost * item.quantity;
        const eggCost = item.addFriedEgg ? 4.2 * item.quantity : 0;
        totalCOGS += (baseCost + eggCost);
      }
    });
  });

  // Gross profit & margin
  const grossProfit = totalSales - totalCOGS;
  const grossMarginPercentage = totalSales > 0 ? (grossProfit / totalSales) * 100 : 0;

  // Food cost percentage of sales
  const foodCostRatio = totalSales > 0 ? (totalCOGS / totalSales) * 100 : 0;

  // Potential Sales from pending orders
  const pendingSales = pendingTodayOrders.reduce((sum, o) => sum + o.total, 0);

  return (
    <div className="bg-slate-900 border border-slate-800/80 rounded-2xl p-5 hover:border-slate-700/80 transition-all shadow-lg relative overflow-hidden group">
      {/* Background decoration */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-600/5 rounded-bl-full group-hover:bg-emerald-600/8 transition-all duration-300"></div>
      
      {/* Header */}
      <div className="flex items-center justify-between mb-4 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-emerald-950/40 text-emerald-500 rounded-lg border border-emerald-900/30">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-white">ประสิทธิภาพการขายวันนี้ (Today's Performance)</h4>
            <p className="text-[11px] text-slate-400">สรุปความเคลื่อนไหวทางบัญชี ยอดขาย ต้นทุนอาหาร และผลกำไรประจำวัน</p>
          </div>
        </div>
        <span className="text-[10px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full font-bold">
          เรียลไทม์
        </span>
      </div>

      {/* Grid for KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Total Sales Metric */}
        <div className="bg-slate-950/80 border border-slate-850 p-4 rounded-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
              <span>ยอดขายรวมสุทธิ</span>
              <DollarSign className="w-4 h-4 text-emerald-500" />
            </div>
            <h5 className="text-xl font-extrabold text-white font-mono">
              {totalSales.toLocaleString()}{currency}
            </h5>
          </div>
          <div className="mt-2.5 pt-2 border-t border-slate-900 flex items-center justify-between text-[11px]">
            <span className="text-slate-400">ชำระแล้ว: {paidTransactions} บิล</span>
            {pendingSales > 0 && (
              <span className="text-amber-400 font-medium">รอชำระ: +{pendingSales.toLocaleString()}{currency}</span>
            )}
          </div>
        </div>

        {/* Transactions Metric */}
        <div className="bg-slate-950/80 border border-slate-850 p-4 rounded-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
              <span>ออเดอร์ทั้งหมดวันนี้</span>
              <ShoppingBag className="w-4 h-4 text-sky-400" />
            </div>
            <h5 className="text-xl font-extrabold text-white font-mono">
              {totalTransactions} <span className="text-xs font-sans text-slate-400 font-normal">บิล</span>
            </h5>
          </div>
          <div className="mt-2.5 pt-2 border-t border-slate-900 flex items-center gap-1.5 text-[11px] text-slate-400">
            <span className="flex items-center gap-1 text-emerald-500">
              <CheckCircle2 className="w-3 h-3" /> {paidTransactions} สำเร็จ
            </span>
            {pendingTransactions > 0 && (
              <span className="flex items-center gap-1 text-amber-500 font-medium">
                <ShieldAlert className="w-3 h-3" /> {pendingTransactions} ค้างคอย
              </span>
            )}
          </div>
        </div>

        {/* COGS Metric */}
        <div className="bg-slate-950/80 border border-slate-850 p-4 rounded-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
              <span>ต้นทุนขายวัตถุดิบ (COGS)</span>
              <Coins className="w-4 h-4 text-amber-500" />
            </div>
            <h5 className="text-xl font-extrabold text-white font-mono">
              {totalCOGS.toLocaleString()}{currency}
            </h5>
          </div>
          <div className="mt-2.5 pt-2 border-t border-slate-900 flex items-center justify-between text-[11px]">
            <span className="text-slate-400">อัตราต้นทุนอาหาร:</span>
            <span className={`font-semibold ${foodCostRatio > 35 ? 'text-red-400' : 'text-emerald-400'}`}>
              {foodCostRatio.toFixed(1)}%
            </span>
          </div>
        </div>
      </div>

      {/* Gross Profit Margin and Interactive Progress bar */}
      <div className="mt-4 bg-slate-950/40 border border-slate-850/50 p-3.5 rounded-xl space-y-2.5">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5 text-slate-300">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span>กำไรขั้นต้นประเมินวันนี้ (Gross Profit Today)</span>
          </div>
          <div className="flex items-baseline gap-1.5 font-mono">
            <span className="text-base font-extrabold text-emerald-400">
              {grossProfit.toLocaleString()}{currency}
            </span>
            <span className="text-[10px] text-slate-400">
              (Margin: {grossMarginPercentage.toFixed(1)}%)
            </span>
          </div>
        </div>
        
        {/* Progress bar */}
        <div className="h-2 w-full bg-slate-850 rounded-full overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-500"
            style={{ width: `${Math.min(100, Math.max(0, grossMarginPercentage))}%` }}
          />
        </div>

        {/* Informative message */}
        <div className="text-[10px] text-slate-500 leading-normal flex items-center justify-between">
          <span>*คำนวณต้นทุนตามสัดส่วนสูตรอาหารกะเพราและวัตถุดิบรองรับของบิลที่จ่ายเงินแล้ววันนี้</span>
          <span className="flex items-center gap-0.5 text-slate-400 hover:text-emerald-400 cursor-pointer transition-colors font-medium">
            ดูรายละเอียดบัญชี <ArrowRight className="w-3 h-3" />
          </span>
        </div>
      </div>
    </div>
  );
}
