import { useState, useEffect } from 'react';
import { Order } from '../types';
import { 
  Clock, Check, Play, ChevronRight, Utensils, 
  AlertCircle, History, RefreshCw 
} from 'lucide-react';

interface KitchenProps {
  orders: Order[];
  onUpdateKitchenStatus: (orderId: string, status: 'PENDING' | 'COOKING' | 'READY' | 'SERVED') => void;
  onRefreshOrders?: () => void;
}

export default function Kitchen({ orders, onUpdateKitchenStatus, onRefreshOrders }: KitchenProps) {
  const [tick, setTick] = useState(0);
  const [autoRefresh, setAutoRefresh] = useState<boolean>(true);
  const [countdown, setCountdown] = useState<number>(30);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  // Trigger re-render every second to update waiting time clocks
  useEffect(() => {
    const timer = setInterval(() => {
      setTick(prev => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Auto-refresh countdown effect
  useEffect(() => {
    if (!autoRefresh) return;
    
    const interval = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          triggerRefresh();
          return 30;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [autoRefresh, onRefreshOrders]);

  const triggerRefresh = () => {
    setIsRefreshing(true);
    if (onRefreshOrders) {
      onRefreshOrders();
    }
    setCountdown(30);
    setTimeout(() => {
      setIsRefreshing(false);
    }, 800);
  };

  // Filter out served orders unless they choose to view History
  const activeOrders = orders.filter(o => o.kitchenStatus !== 'SERVED');
  const servedHistory = orders.filter(o => o.kitchenStatus === 'SERVED').sort((a,b) => b.timestamp.localeCompare(a.timestamp)).slice(0, 10);

  // Status-based orders
  const pendingOrders = activeOrders.filter(o => o.kitchenStatus === 'PENDING');
  const cookingOrders = activeOrders.filter(o => o.kitchenStatus === 'COOKING');
  const readyOrders = activeOrders.filter(o => o.kitchenStatus === 'READY');

  // Helper to format waiting time and get warning colors
  const getWaitingTimeInfo = (timestamp: string) => {
    const elapsedMs = Date.now() - new Date(timestamp).getTime();
    const totalSecs = Math.floor(elapsedMs / 1000);
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;

    let colorClass = 'text-green-400 bg-green-950/40 border-green-900/40';
    let urgency = 'ปกติ';

    if (mins >= 10) {
      colorClass = 'text-red-400 bg-red-950/40 border-red-900/40 animate-pulse';
      urgency = 'วิกฤต - นานเกินไป';
    } else if (mins >= 5) {
      colorClass = 'text-amber-400 bg-amber-950/40 border-amber-900/40';
      urgency = 'เกินเกณฑ์';
    }

    return {
      formatted: `${mins}:${secs.toString().padStart(2, '0')}`,
      colorClass,
      urgency,
      mins
    };
  };

  return (
    <div className="space-y-6">
      {/* KDS Header info */}
      <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">ระบบจอในครัว (Kitchen Display System - KDS)</h2>
          <p className="text-xs text-slate-400">ควบคุมรายการปรุงอาหารแบบเรียลไทม์ ตรวจเช็คคิวและเวลารอรับประทาน</p>
        </div>
        
        <div className="flex flex-wrap gap-3 text-xs font-semibold text-slate-300 items-center">
          {/* Auto Refresh Toggle & Countdown */}
          <div className="bg-slate-900 border border-slate-800 px-3.5 py-1.5 rounded-xl flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-slate-400 font-medium">รีเฟรชอัตโนมัติ (30วิ)</span>
              <button
                type="button"
                onClick={() => setAutoRefresh(prev => !prev)}
                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  autoRefresh ? 'bg-amber-500' : 'bg-slate-700'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-3.5 w-3.5 transform rounded-full bg-slate-950 shadow ring-0 transition duration-200 ease-in-out ${
                    autoRefresh ? 'translate-x-4' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
            
            {autoRefresh && (
              <div className="flex items-center gap-1.5 pl-3 border-l border-slate-800 text-[10px] text-slate-400 font-mono">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span>อีก {countdown} วินาที</span>
              </div>
            )}
          </div>

          {/* Manual Refresh Button */}
          <button
            type="button"
            onClick={triggerRefresh}
            disabled={isRefreshing}
            className={`bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer text-xs disabled:opacity-50 font-bold`}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-amber-400' : ''}`} />
            <span>{isRefreshing ? 'กำลังโหลด...' : 'รีเฟรชสด'}</span>
          </button>

          <div className="bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-xl flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-slate-500"></span>
            คิวค้าง: {activeOrders.length} บิล
          </div>
          <div className="bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-xl flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse"></span>
            เกิน 10 นาที: {activeOrders.filter(o => getWaitingTimeInfo(o.timestamp).mins >= 10).length} คิว
          </div>
        </div>
      </div>

      {/* Grid containing KDS Status Columns */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        
        {/* Column 1: คิวออเดอร์ใหม่ (PENDING) */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-4 shadow flex flex-col h-[750px]">
          <div className="flex justify-between items-center border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <span className="flex items-center justify-center w-6 h-6 rounded bg-red-950 text-red-500 font-bold text-xs">
                {pendingOrders.length}
              </span>
              <h3 className="font-bold text-white text-sm">คิวอาหารเข้าใหม่</h3>
            </div>
            <span className="text-[10px] text-slate-500 font-medium">รอปรุง</span>
          </div>

          <div className="flex-1 overflow-y-auto space-y-3.5 pr-1">
            {pendingOrders.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-600 text-center py-20">
                <Utensils className="w-12 h-12 text-slate-800 mb-2" />
                <p className="text-xs font-semibold">ไม่มีคิวสั่งอาหารใหม่</p>
              </div>
            ) : (
              pendingOrders.map(order => {
                const wait = getWaitingTimeInfo(order.timestamp);
                return (
                  <div key={order.id} className="bg-slate-950 border border-slate-850 rounded-xl p-4 space-y-3.5 relative overflow-hidden shadow">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="inline-block px-2.5 py-0.5 bg-slate-900 text-white rounded-lg font-bold text-[11px] border border-slate-800">
                          โต๊ะ {order.tableNo}
                        </span>
                        <p className="text-[10px] text-slate-500 font-mono mt-1">ID: {order.id}</p>
                      </div>
                      <div className={`px-2 py-0.5 border rounded-md font-mono text-xs font-extrabold flex items-center gap-1 ${wait.colorClass}`}>
                        <Clock className="w-3.5 h-3.5" />
                        <span>เวลารอ: {wait.formatted}</span>
                      </div>
                    </div>

                    {/* Ordered dishes list */}
                    <div className="space-y-2 border-y border-slate-850 py-3.5">
                      {order.items.map(item => (
                        <div key={item.id} className="text-xs">
                          <div className="flex justify-between font-bold text-slate-200">
                            <span>{item.name} <strong className="text-red-400 font-mono text-xs font-black">x{item.quantity}</strong></span>
                          </div>
                          {item.addFriedEgg && (
                            <span className="block text-[10px] text-amber-500 font-bold pl-2">
                              + ไข่ดาวโคตรกรอบ (กรอบพิเศษ)
                            </span>
                          )}
                          {item.notes && (
                            <span className="block text-[10px] text-yellow-400 font-semibold pl-2 italic">
                              *{item.notes}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>

                    <button
                      onClick={() => onUpdateKitchenStatus(order.id, 'COOKING')}
                      className="w-full py-2.5 bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-500 hover:to-amber-500 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all shadow"
                    >
                      <Play className="w-3.5 h-3.5" /> เริ่มทำอาหาร
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Column 2: กำลังทำ (COOKING) */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-4 shadow flex flex-col h-[750px]">
          <div className="flex justify-between items-center border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <span className="flex items-center justify-center w-6 h-6 rounded bg-amber-950 text-amber-500 font-bold text-xs">
                {cookingOrders.length}
              </span>
              <h3 className="font-bold text-white text-sm">กำลังทำอาหาร</h3>
            </div>
            <span className="text-[10px] text-slate-500 font-medium">กระทะเดือด</span>
          </div>

          <div className="flex-1 overflow-y-auto space-y-3.5 pr-1">
            {cookingOrders.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-600 text-center py-20">
                <Utensils className="w-12 h-12 text-slate-800 mb-2 animate-bounce" />
                <p className="text-xs font-semibold">ไม่มีอาหารกำลังปรุง</p>
              </div>
            ) : (
              cookingOrders.map(order => {
                const wait = getWaitingTimeInfo(order.timestamp);
                return (
                  <div key={order.id} className="bg-slate-950 border border-slate-850 rounded-xl p-4 space-y-3.5 relative overflow-hidden shadow">
                    <div className="absolute top-0 left-0 w-1.5 h-full bg-amber-500"></div>
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="inline-block px-2.5 py-0.5 bg-slate-900 text-white rounded-lg font-bold text-[11px] border border-slate-800">
                          โต๊ะ {order.tableNo}
                        </span>
                        <p className="text-[10px] text-slate-500 font-mono mt-1">ID: {order.id}</p>
                      </div>
                      <div className={`px-2 py-0.5 border rounded-md font-mono text-xs font-extrabold flex items-center gap-1 ${wait.colorClass}`}>
                        <Clock className="w-3.5 h-3.5" />
                        {wait.formatted}
                      </div>
                    </div>

                    {/* Ordered dishes list */}
                    <div className="space-y-2 border-y border-slate-850 py-3.5">
                      {order.items.map(item => (
                        <div key={item.id} className="text-xs">
                          <div className="flex justify-between font-bold text-slate-200">
                            <span>{item.name} <strong className="text-amber-500 font-mono text-xs font-black">x{item.quantity}</strong></span>
                          </div>
                          {item.addFriedEgg && (
                            <span className="block text-[10px] text-amber-500 font-bold pl-2">
                              + ไข่ดาวโคตรกรอบ (กรอบพิเศษ)
                            </span>
                          )}
                          {item.notes && (
                            <span className="block text-[10px] text-yellow-400 font-semibold pl-2 italic">
                              *{item.notes}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>

                    <button
                      onClick={() => onUpdateKitchenStatus(order.id, 'READY')}
                      className="w-full py-2.5 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all shadow"
                    >
                      <Check className="w-3.5 h-3.5" /> ปรุงเสร็จแล้ว
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Column 3: เสร็จแล้ว (READY) */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-4 shadow flex flex-col h-[750px]">
          <div className="flex justify-between items-center border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <span className="flex items-center justify-center w-6 h-6 rounded bg-green-950 text-green-500 font-bold text-xs">
                {readyOrders.length}
              </span>
              <h3 className="font-bold text-white text-sm">ปรุงเสร็จพร้อมเสิร์ฟ</h3>
            </div>
            <span className="text-[10px] text-slate-500 font-medium">รอขึ้นโต๊ะ</span>
          </div>

          <div className="flex-1 overflow-y-auto space-y-3.5 pr-1">
            {readyOrders.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-600 text-center py-20">
                <Utensils className="w-12 h-12 text-slate-800 mb-2" />
                <p className="text-xs font-semibold">ไม่มีอาหารพร้อมเสิร์ฟ</p>
              </div>
            ) : (
              readyOrders.map(order => {
                const wait = getWaitingTimeInfo(order.timestamp);
                return (
                  <div key={order.id} className="bg-slate-950 border border-slate-850 rounded-xl p-4 space-y-3.5 relative overflow-hidden shadow">
                    <div className="absolute top-0 left-0 w-1.5 h-full bg-emerald-500"></div>
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="inline-block px-2.5 py-0.5 bg-slate-900 text-white rounded-lg font-bold text-[11px] border border-slate-800">
                          โต๊ะ {order.tableNo}
                        </span>
                        <p className="text-[10px] text-slate-500 font-mono mt-1">ID: {order.id}</p>
                      </div>
                      <span className="px-2 py-0.5 bg-emerald-950/60 border border-emerald-900/40 rounded text-emerald-400 font-bold text-[10px]">
                        เสร็จแล้ว
                      </span>
                    </div>

                    {/* Ordered dishes list */}
                    <div className="space-y-2 border-y border-slate-850 py-3.5">
                      {order.items.map(item => (
                        <div key={item.id} className="text-xs">
                          <div className="flex justify-between font-bold text-slate-200">
                            <span>{item.name} <strong className="text-green-500 font-mono text-xs font-black">x{item.quantity}</strong></span>
                          </div>
                          {item.addFriedEgg && (
                            <span className="block text-[10px] text-amber-500 pl-2">
                              + ไข่ดาวโคตรกรอบ
                            </span>
                          )}
                          {item.notes && (
                            <span className="block text-[10px] text-slate-400 pl-2 italic">
                              *{item.notes}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>

                    <button
                      onClick={() => onUpdateKitchenStatus(order.id, 'SERVED')}
                      className="w-full py-2.5 bg-slate-800 hover:bg-slate-750 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all"
                    >
                      เสิร์ฟขึ้นโต๊ะเรียบร้อย <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>

      </div>

      {/* Served History section at bottom */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow">
        <div className="flex items-center gap-2 mb-4 border-b border-slate-800 pb-3">
          <History className="w-4 h-4 text-slate-400" />
          <h4 className="text-sm font-semibold text-white">ประวัติส่งเสิร์ฟสำเร็จล่าสุด (10 คิวล่าสุด)</h4>
        </div>

        <div className="overflow-x-auto">
          {servedHistory.length === 0 ? (
            <p className="text-xs text-slate-500 text-center py-6">ยังไม่มีประวัติการส่งเสิร์ฟในระบบรอบนี้</p>
          ) : (
            <table className="w-full text-left text-xs divide-y divide-slate-800">
              <thead>
                <tr className="text-slate-400 font-medium">
                  <th className="pb-2.5">เลขที่ออเดอร์</th>
                  <th className="pb-2.5">ช่องทาง/โต๊ะ</th>
                  <th className="pb-2.5">รายการอาหาร</th>
                  <th className="pb-2.5">เวลาสั่งชำระ</th>
                  <th className="pb-2.5 text-right">สถานะจัดส่ง</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-850 text-slate-300">
                {servedHistory.map(order => {
                  const itemsSummary = order.items.map(i => `${i.name} x${i.quantity}`).join(', ');
                  return (
                    <tr key={order.id} className="hover:bg-slate-850/20">
                      <td className="py-3 font-mono font-bold text-slate-400">{order.id}</td>
                      <td className="py-3 font-semibold text-white">โต๊ะ {order.tableNo}</td>
                      <td className="py-3 max-w-[320px] truncate">{itemsSummary}</td>
                      <td className="py-3 text-slate-500">{new Date(order.timestamp).toLocaleTimeString('th-TH')}</td>
                      <td className="py-3 text-right">
                        <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 bg-green-950 text-green-400 rounded-full font-bold border border-green-900/30">
                          <Check className="w-3 h-3" /> เสิร์ฟเรียบร้อย
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
