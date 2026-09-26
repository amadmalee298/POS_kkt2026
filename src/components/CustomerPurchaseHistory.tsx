import React, { useState, useMemo } from 'react';
import { Customer, Order, OrderItem } from '../types';
import { 
  Calendar, Clock, ShoppingBag, Tag, ChevronDown, ChevronUp, 
  TrendingUp, Award, DollarSign, Heart, Utensils, Search, Filter
} from 'lucide-react';

interface CustomerPurchaseHistoryProps {
  customer: Customer;
  orders: Order[];
  currency: string;
}

export default function CustomerPurchaseHistory({ 
  customer, 
  orders, 
  currency 
}: CustomerPurchaseHistoryProps) {
  // States
  const [expandedOrders, setExpandedOrders] = useState<Record<string, boolean>>({});
  const [filterType, setFilterType] = useState<'ALL' | 'PAID' | 'PENDING'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Get all orders associated with this customer
  const customerOrders = useMemo(() => {
    return orders
      .filter(o => o.customerPhone === customer.phone)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [orders, customer.phone]);

  // Dynamically calculate metrics based on historical orders
  const metrics = useMemo(() => {
    const paidOrders = customerOrders.filter(o => o.paymentStatus === 'PAID');
    const totalOrdersCount = customerOrders.length;
    const paidOrdersCount = paidOrders.length;
    
    // Calculate actual total spend from the mock orders to align perfectly
    const calculatedTotalSpend = paidOrders.reduce((sum, o) => sum + o.total, 0);
    // Fallback to customer's profile value if no orders loaded yet
    const displayTotalSpend = calculatedTotalSpend || customer.totalSpend;
    
    const averageOrderValue = paidOrdersCount > 0 
      ? Math.round(displayTotalSpend / paidOrdersCount) 
      : 0;

    // Determine favorite dish
    const dishCounts: Record<string, { count: number; name: string }> = {};
    customerOrders.forEach(o => {
      o.items.forEach(item => {
        if (!dishCounts[item.menuItemId]) {
          dishCounts[item.menuItemId] = { count: 0, name: item.name };
        }
        dishCounts[item.menuItemId].count += item.quantity;
      });
    });

    let favoriteDish = 'ไม่มีข้อมูล';
    let favoriteCount = 0;
    Object.values(dishCounts).forEach(dish => {
      if (dish.count > favoriteCount) {
        favoriteCount = dish.count;
        favoriteDish = dish.name;
      }
    });

    return {
      totalOrdersCount,
      paidOrdersCount,
      totalSpend: displayTotalSpend,
      averageOrderValue,
      favoriteDish,
      favoriteCount
    };
  }, [customerOrders, customer.totalSpend]);

  // Filtered orders based on user input
  const filteredOrders = useMemo(() => {
    return customerOrders.filter(order => {
      // 1. Filter by Status
      if (filterType === 'PAID' && order.paymentStatus !== 'PAID') return false;
      if (filterType === 'PENDING' && order.paymentStatus !== 'PENDING') return false;

      // 2. Filter by search query (Order ID, Table No, Cashier Name, or Menu Item Names)
      if (searchQuery.trim() !== '') {
        const query = searchQuery.toLowerCase();
        const matchesId = order.id.toLowerCase().includes(query);
        const matchesTable = order.tableNo.toLowerCase().includes(query);
        const matchesCashier = order.cashierName?.toLowerCase().includes(query) || false;
        const matchesItems = order.items.some(item => item.name.toLowerCase().includes(query));

        return matchesId || matchesTable || matchesCashier || matchesItems;
      }

      return true;
    });
  }, [customerOrders, filterType, searchQuery]);

  const toggleOrderExpand = (orderId: string) => {
    setExpandedOrders(prev => ({
      ...prev,
      [orderId]: !prev[orderId]
    }));
  };

  const expandAll = () => {
    const allExpanded: Record<string, boolean> = {};
    filteredOrders.forEach(o => {
      allExpanded[o.id] = true;
    });
    setExpandedOrders(allExpanded);
  };

  const collapseAll = () => {
    setExpandedOrders({});
  };

  // Helper to format date
  const formatDate = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleDateString('th-TH', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch {
      return isoString;
    }
  };

  // Helper to format time
  const formatTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleTimeString('th-TH', {
        hour: '2-digit',
        minute: '2-digit'
      }) + ' น.';
    } catch {
      return '';
    }
  };

  return (
    <div className="space-y-5" id="customer-purchase-history">
      
      {/* 1. COMPACT CRM ANALYTICS BADGES */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
        
        {/* Total Spend */}
        <div className="bg-slate-950 p-3 rounded-xl border border-slate-850 flex flex-col justify-between">
          <div className="flex items-center justify-between text-[10px] text-slate-500 font-bold uppercase tracking-wider">
            <span>ยอดซื้อสะสมจริง</span>
            <DollarSign className="w-3.5 h-3.5 text-red-500" />
          </div>
          <div className="mt-1.5">
            <span className="font-mono font-black text-white text-base">
              {metrics.totalSpend.toLocaleString()}
            </span>
            <span className="text-[10px] text-slate-400 font-bold ml-1">{currency}</span>
          </div>
          <span className="text-[9px] text-slate-500 mt-1">ยอดรวมบิลที่ชำระแล้ว</span>
        </div>

        {/* Total Orders / Visits */}
        <div className="bg-slate-950 p-3 rounded-xl border border-slate-850 flex flex-col justify-between">
          <div className="flex items-center justify-between text-[10px] text-slate-500 font-bold uppercase tracking-wider">
            <span>จำนวนครั้งที่มาทาน</span>
            <ShoppingBag className="w-3.5 h-3.5 text-red-500" />
          </div>
          <div className="mt-1.5">
            <span className="font-mono font-black text-white text-base">
              {metrics.paidOrdersCount}
            </span>
            <span className="text-[10px] text-slate-400 font-bold ml-1">บิล</span>
          </div>
          <span className="text-[9px] text-slate-500 mt-1">
            {metrics.totalOrdersCount !== metrics.paidOrdersCount ? `(รอชำระอีก ${metrics.totalOrdersCount - metrics.paidOrdersCount})` : 'บริการเสร็จสิ้นทั้งหมด'}
          </span>
        </div>

        {/* Average Order Value */}
        <div className="bg-slate-950 p-3 rounded-xl border border-slate-850 flex flex-col justify-between">
          <div className="flex items-center justify-between text-[10px] text-slate-500 font-bold uppercase tracking-wider">
            <span>เฉลี่ยต่อบิล (AOV)</span>
            <TrendingUp className="w-3.5 h-3.5 text-amber-500" />
          </div>
          <div className="mt-1.5">
            <span className="font-mono font-black text-white text-base">
              {metrics.averageOrderValue.toLocaleString()}
            </span>
            <span className="text-[10px] text-slate-400 font-bold ml-1">{currency}</span>
          </div>
          <span className="text-[9px] text-slate-500 mt-1">พฤติกรรมการจ่ายเฉลี่ย</span>
        </div>

        {/* Favorite Menu Item */}
        <div className="bg-slate-950 p-3 rounded-xl border border-slate-850 flex flex-col justify-between">
          <div className="flex items-center justify-between text-[10px] text-slate-500 font-bold uppercase tracking-wider">
            <span>เมนูโปรดปราน</span>
            <Heart className="w-3.5 h-3.5 text-[#D9383A] fill-[#D9383A]/10" />
          </div>
          <div className="mt-1.5 overflow-hidden">
            <span className="font-bold text-slate-100 text-xs block truncate" title={metrics.favoriteDish}>
              {metrics.favoriteDish}
            </span>
            {metrics.favoriteCount > 0 && (
              <span className="text-[10px] text-amber-500 font-mono font-extrabold block mt-0.5">
                สั่งทั้งหมด {metrics.favoriteCount} จาน
              </span>
            )}
          </div>
          <span className="text-[9px] text-slate-500 mt-0.5 truncate">คำนวณจากประวัติ</span>
        </div>

      </div>

      {/* 2. HISTORY TIMELINE FILTER & SEARCH CONTROLS */}
      <div className="bg-slate-950 p-3 rounded-xl border border-slate-850 space-y-2.5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
          
          {/* Timeline filter state tabs */}
          <div className="flex bg-[#0B131E] p-1 rounded-lg border border-[#1A2C42] shrink-0">
            {[
              { id: 'ALL' as const, label: 'ทั้งหมด' },
              { id: 'PAID' as const, label: 'ชำระแล้ว' },
              { id: 'PENDING' as const, label: 'ค้างจ่าย' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setFilterType(tab.id)}
                className={`px-3 py-1 text-[10px] font-black rounded-md transition-all ${
                  filterType === tab.id 
                    ? 'bg-red-600 text-white shadow-sm' 
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Quick expand/collapse helper keys */}
          <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 justify-end">
            <button 
              onClick={expandAll}
              className="px-2 py-1 bg-slate-900 border border-slate-850 rounded hover:bg-slate-800 transition-colors"
            >
              ขยายทั้งหมด
            </button>
            <button 
              onClick={collapseAll}
              className="px-2 py-1 bg-slate-900 border border-slate-850 rounded hover:bg-slate-800 transition-colors"
            >
              ย่อทั้งหมด
            </button>
          </div>

        </div>

        {/* Real-time history search box */}
        <div className="relative">
          <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center text-slate-600">
            <Search className="w-3.5 h-3.5" />
          </span>
          <input
            type="text"
            placeholder="ค้นหาในประวัติ (เลขบิล, ชื่อเมนู, เลขโต๊ะ, แคชเชียร์)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#0B131E] border border-[#1E2E42] text-white placeholder-slate-600 pl-8 pr-3 py-2 rounded-lg text-[11px] font-bold focus:outline-none focus:border-red-500/80 transition-all"
          />
        </div>
      </div>

      {/* 3. VERTICAL TIMELINE CONTAINER */}
      <div className="space-y-4">
        <span className="block text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
          <Award className="w-4 h-4 text-amber-500" /> 
          เส้นเวลาการซื้อ (Purchase Timeline - {filteredOrders.length} รายการ)
        </span>

        {filteredOrders.length === 0 ? (
          <div className="py-12 text-center text-slate-500 bg-slate-950 rounded-2xl border border-slate-850 flex flex-col items-center justify-center p-6">
            <Utensils className="w-8 h-8 text-slate-700 mb-2 animate-bounce" />
            <p className="text-xs font-bold text-slate-400">ไม่พบประวัติการสั่งซื้อตามเงื่อนไขที่ค้นหา</p>
            <p className="text-[10px] text-slate-600 mt-1">ลองเปลี่ยนตัวกรอง คืนค่าตัวกรอง หรือขยายกลุ่มประวัติ</p>
          </div>
        ) : (
          <div className="relative border-l border-slate-800 ml-3.5 pl-5 space-y-5">
            {filteredOrders.map((order, idx) => {
              const isExpanded = !!expandedOrders[order.id];
              const isPaid = order.paymentStatus === 'PAID';

              return (
                <div key={order.id} className="relative group/item">
                  
                  {/* Timeline bullet dot marker */}
                  <span className={`absolute -left-[27.5px] top-1.5 w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors z-10 ${
                    isPaid 
                      ? 'bg-emerald-950 border-emerald-500 text-emerald-400' 
                      : 'bg-red-950 border-red-500 text-red-400'
                  }`}>
                    <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
                  </span>

                  {/* Single timeline card block */}
                  <div className="bg-slate-950 rounded-xl border border-slate-850 overflow-hidden shadow-lg transition-all duration-300 hover:border-slate-800">
                    
                    {/* Header trigger for expansion */}
                    <div 
                      onClick={() => toggleOrderExpand(order.id)}
                      className="p-3.5 flex items-center justify-between gap-3 cursor-pointer select-none hover:bg-slate-900/40 transition-colors"
                    >
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="font-mono font-black text-slate-200 text-xs">
                            {order.id}
                          </span>
                          <span className={`px-1.5 py-0.5 rounded text-[8.5px] font-extrabold uppercase tracking-wide ${
                            isPaid 
                              ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-900/30' 
                              : 'bg-red-950/80 text-red-400 border border-red-900/30'
                          }`}>
                            {isPaid ? 'จ่ายแล้ว' : 'ค้างชำระ'}
                          </span>
                          <span className="bg-slate-900 px-1.5 py-0.5 border border-slate-800 rounded text-[9px] text-slate-400 font-bold">
                            โต๊ะ {order.tableNo}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-[10px] text-slate-500">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3 text-slate-600" />
                            {formatDate(order.timestamp)}
                          </span>
                          <span className="flex items-center gap-1 font-mono">
                            <Clock className="w-3 h-3 text-slate-600" />
                            {formatTime(order.timestamp)}
                          </span>
                        </div>
                      </div>

                      {/* Spend / Expand Indicator */}
                      <div className="text-right shrink-0 flex items-center gap-3">
                        <div className="space-y-0.5">
                          <span className="block font-mono font-black text-white text-sm">
                            {order.total.toLocaleString()} {currency}
                          </span>
                          {order.earnedPoints !== undefined && (
                            <span className="block text-[9.5px] text-amber-500 font-bold font-mono">
                              +{order.earnedPoints} คะแนน
                            </span>
                          )}
                        </div>
                        <div className="text-slate-500 group-hover/item:text-slate-300 transition-colors">
                          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </div>
                      </div>
                    </div>

                    {/* Detailed expanded panel */}
                    {isExpanded && (
                      <div className="border-t border-slate-850 bg-slate-900/25 p-3.5 space-y-3.5 animate-fadeIn">
                        
                        {/* 1. List of ordered items */}
                        <div className="space-y-1.5">
                          <span className="block text-[9.5px] font-black uppercase text-slate-500 tracking-wider">รายการอาหารที่สั่งในบิล</span>
                          <div className="space-y-1.5 divide-y divide-slate-850/40">
                            {order.items.map((item, index) => {
                              const lineTotal = (item.price + item.eggPrice) * item.quantity;
                              return (
                                <div key={item.id || index} className={`pt-1.5 first:pt-0 flex items-start justify-between text-xs gap-3`}>
                                  <div className="min-w-0 flex-1 space-y-0.5">
                                    <div className="flex items-center gap-1.5">
                                      <span className="font-mono text-red-500 font-extrabold shrink-0 bg-red-950/35 px-1 py-0.2 rounded text-[10px]">
                                        {item.quantity}x
                                      </span>
                                      <span className="font-bold text-slate-300 truncate">{item.name}</span>
                                    </div>
                                    
                                    {/* Option tags */}
                                    <div className="flex flex-wrap items-center gap-1.5 pl-6">
                                      {item.addFriedEgg && (
                                        <span className="inline-block px-1 py-0.2 bg-amber-950/40 text-amber-500 border border-amber-900/20 rounded text-[9px] font-bold">
                                          เพิ่มไข่ดาวกรอบ (+฿{item.eggPrice})
                                        </span>
                                      )}
                                      {item.notes && (
                                        <span className="inline-block px-1 py-0.2 bg-slate-850 text-slate-400 rounded text-[9px] font-semibold italic">
                                          " {item.notes} "
                                        </span>
                                      )}
                                    </div>
                                  </div>

                                  <div className="text-right shrink-0 font-mono text-slate-400 text-xs">
                                    {lineTotal.toLocaleString()} {currency}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        {/* 2. Bill Pricing & Breakdown summary */}
                        <div className="bg-slate-950/80 p-2.5 rounded-lg border border-slate-850/60 text-[10px] space-y-1">
                          <div className="flex justify-between text-slate-500">
                            <span>ยอดรวมก่อนลด (Subtotal)</span>
                            <span className="font-mono text-slate-400">฿{order.subtotal}</span>
                          </div>
                          {order.discount > 0 && (
                            <div className="flex justify-between text-red-400">
                              <span>ส่วนลดโปรโมชั่น (Discount)</span>
                              <span className="font-mono font-bold">-฿{order.discount}</span>
                            </div>
                          )}
                          <div className="flex justify-between text-slate-300 font-bold border-t border-slate-800/40 pt-1 mt-1 text-xs">
                            <span className="text-slate-400">ยอดสุทธิ (Total Spend)</span>
                            <span className="font-mono text-white">฿{order.total}</span>
                          </div>
                        </div>

                        {/* 3. Meta information */}
                        <div className="flex justify-between items-center text-[9px] text-slate-500 font-bold border-t border-slate-850/60 pt-2">
                          <span>แคชเชียร์ผู้ทำรายการ: <span className="text-slate-400">{order.cashierName || 'ระบบออโต้ QR'}</span></span>
                          <span>ช่องทาง: <span className="text-slate-400">{order.paymentMethod === 'PROMPTPAY' ? 'พร้อมเพย์' : order.paymentMethod === 'TRANSFER' ? 'โอนเงิน' : 'เงินสด'}</span></span>
                        </div>

                      </div>
                    )}

                  </div>
                </div>
              );
            })}
          </div>
        )}

      </div>

    </div>
  );
}
