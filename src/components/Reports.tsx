import { useState, Fragment } from 'react';
import { Order, MenuItem, Ingredient, Expense } from '../types';
import { 
  BarChart as ReBarChart, Bar, XAxis, YAxis, CartesianGrid, 
  Tooltip, Legend, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell 
} from 'recharts';
import { 
  Calendar, FileText, TrendingUp, TrendingDown, Award, 
  Users, Utensils, AlertCircle, Sparkles, Filter, Download,
  Search, ChevronDown, ChevronUp, Clock, CreditCard, CheckCircle2,
  XCircle, FileSpreadsheet, Tag, ArrowRight, Table
} from 'lucide-react';

interface ReportsProps {
  orders: Order[];
  menuItems: MenuItem[];
  ingredients: Ingredient[];
  expenses: Expense[];
  currency: string;
}

const THAI_MONTHS = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
];

const THAI_QUARTERS = [
  { value: 1, label: 'ไตรมาส 1 (ม.ค. - มี.ค.)' },
  { value: 2, label: 'ไตรมาส 2 (เม.ย. - มิ.ย.)' },
  { value: 3, label: 'ไตรมาส 3 (ก.ค. - ก.ย.)' },
  { value: 4, label: 'ไตรมาส 4 (ต.ค. - ธ.ค.)' }
];

export default function Reports({ 
  orders, menuItems, ingredients, expenses, currency 
}: ReportsProps) {
  // Local state
  const [reportRange, setReportRange] = useState<'DAILY' | 'WEEKLY' | 'MONTHLY'>('WEEKLY');

  // Search, Filters & Pagination States for Historical Orders
  const [orderSearchQuery, setOrderSearchQuery] = useState('');
  const [orderStartDate, setOrderStartDate] = useState('');
  const [orderEndDate, setOrderEndDate] = useState('');
  const [orderStatusFilter, setOrderStatusFilter] = useState<'ALL' | 'PAID' | 'PENDING' | 'REFUNDED'>('ALL');
  const [orderPaymentFilter, setOrderPaymentFilter] = useState<'ALL' | 'CASH' | 'PROMPTPAY' | 'TRANSFER'>('ALL');
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const [orderPage, setOrderPage] = useState(1);
  const ordersPerPage = 8;

  // Preset helpers for Date Range
  const setDatePreset = (preset: 'ALL' | 'TODAY' | 'YESTERDAY' | 'WEEK' | 'MONTH') => {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    
    if (preset === 'ALL') {
      setOrderStartDate('');
      setOrderEndDate('');
    } else if (preset === 'TODAY') {
      setOrderStartDate(todayStr);
      setOrderEndDate(todayStr);
    } else if (preset === 'YESTERDAY') {
      const yesterday = new Date();
      yesterday.setDate(today.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];
      setOrderStartDate(yesterdayStr);
      setOrderEndDate(yesterdayStr);
    } else if (preset === 'WEEK') {
      const weekAgo = new Date();
      weekAgo.setDate(today.getDate() - 7);
      const weekAgoStr = weekAgo.toISOString().split('T')[0];
      setOrderStartDate(weekAgoStr);
      setOrderEndDate(todayStr);
    } else if (preset === 'MONTH') {
      const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      const firstDayStr = firstDayOfMonth.toISOString().split('T')[0];
      setOrderStartDate(firstDayStr);
      setOrderEndDate(todayStr);
    }
    setOrderPage(1);
  };

  // Filter historical orders
  const filteredHistoricalOrders = orders.filter(order => {
    // 1. Search Query
    if (orderSearchQuery.trim()) {
      const q = orderSearchQuery.toLowerCase();
      const matchesId = order.id.toLowerCase().includes(q);
      const matchesTable = order.tableNo.toLowerCase().includes(q);
      const matchesCashier = order.cashierName.toLowerCase().includes(q);
      const matchesPhone = order.customerPhone?.toLowerCase().includes(q) || false;
      const matchesItems = order.items.some(item => item.name.toLowerCase().includes(q));
      
      if (!matchesId && !matchesTable && !matchesCashier && !matchesPhone && !matchesItems) {
        return false;
      }
    }

    // 2. Date Range
    const orderDateStr = order.timestamp.split('T')[0]; // "YYYY-MM-DD"
    if (orderStartDate && orderDateStr < orderStartDate) {
      return false;
    }
    if (orderEndDate && orderDateStr > orderEndDate) {
      return false;
    }

    // 3. Status Filter
    if (orderStatusFilter !== 'ALL' && order.paymentStatus !== orderStatusFilter) {
      return false;
    }

    // 4. Payment Method Filter
    if (orderPaymentFilter !== 'ALL' && order.paymentMethod !== orderPaymentFilter) {
      return false;
    }

    return true;
  });

  // Pagination calculations
  const totalOrderPages = Math.ceil(filteredHistoricalOrders.length / ordersPerPage) || 1;
  const paginatedOrders = filteredHistoricalOrders.slice(
    (orderPage - 1) * ordersPerPage,
    orderPage * ordersPerPage
  );

  // CSV Export state
  const [exportPeriodType, setExportPeriodType] = useState<'MONTH' | 'QUARTER'>('MONTH');
  
  // Calculate dynamically available years from orders
  const availableYears = Array.from(new Set(orders.map(o => new Date(o.timestamp).getFullYear()))).sort((a, b) => b - a);
  const currentYear = availableYears[0] || new Date().getFullYear();
  const [exportYear, setExportYear] = useState<number>(currentYear);
  const [exportMonth, setExportMonth] = useState<number>(new Date().getMonth());
  const [exportQuarter, setExportQuarter] = useState<number>(Math.floor(new Date().getMonth() / 3) + 1);

  // Filter paid orders
  const paidOrders = orders.filter(o => o.paymentStatus === 'PAID');

  // Calculate high-level values
  const totalSalesVal = paidOrders.reduce((sum, o) => sum + o.total, 0);
  const totalOrdersCount = paidOrders.length;
  
  // Calculate raw ingredient costs
  let totalIngredientsCost = 0;
  paidOrders.forEach(o => {
    o.items.forEach(item => {
      const menu = menuItems.find(m => m.id === item.menuItemId);
      if (menu) {
        totalIngredientsCost += (menu.cost + (item.addFriedEgg ? 4.2 : 0)) * item.quantity;
      }
    });
  });

  const totalOpexVal = expenses.reduce((sum, e) => sum + e.amount, 0);
  const averageBillVal = totalOrdersCount > 0 ? totalSalesVal / totalOrdersCount : 0;

  // 1. Employee stats (รายงานพนักงาน)
  // We can calculate how many orders each cashier processed & total sales driven!
  const employeeStats: Record<string, { name: string; bills: number; totalDriven: number }> = {};
  paidOrders.forEach(order => {
    const name = order.cashierName;
    if (!employeeStats[name]) {
      employeeStats[name] = { name, bills: 0, totalDriven: 0 };
    }
    employeeStats[name].bills += 1;
    employeeStats[name].totalDriven += order.total;
  });
  const employeesList = Object.values(employeeStats).sort((a, b) => b.totalDriven - a.totalDriven);

  // 2. Category Performance Data for Pie Chart
  const categorySalesMap: Record<string, number> = {};
  paidOrders.forEach(o => {
    o.items.forEach(item => {
      const menu = menuItems.find(m => m.id === item.menuItemId);
      const cat = menu ? menu.category : 'กะเพราดั้งเดิม';
      categorySalesMap[cat] = (categorySalesMap[cat] || 0) + (item.price + item.eggPrice) * item.quantity;
    });
  });

  const categoryPieData = Object.entries(categorySalesMap).map(([name, value]) => ({ name, value }));
  const PIE_COLORS = ['#ef4444', '#f97316', '#eab308', '#10b981', '#3b82f6'];

  // 3. Detailed Food Cost Warnings (เมนูที่ฟู้ดคอสต์สูงกว่าเกณฑ์ 35%)
  const menuCostWarnings = menuItems.map(item => {
    const costPct = item.price > 0 ? (item.cost / item.price) * 100 : 0;
    return {
      ...item,
      costPct
    };
  }).sort((a,b) => b.costPct - a.costPct);

  // Adjust Recharts trend depending on the report selection (DAILY, WEEKLY, MONTHLY)
  const getTrendData = () => {
    if (reportRange === 'DAILY') {
      // Group by hours (e.g. 11:00 to 21:00)
      const hours = Array.from({ length: 11 }).map((_, i) => {
        const hour = 11 + i;
        const hourStr = `${hour}:00`;
        const hourOrders = paidOrders.filter(o => {
          const orderHour = new Date(o.timestamp).getHours();
          return orderHour === hour;
        });
        const sales = hourOrders.reduce((sum, o) => sum + o.total, 0);
        return { name: hourStr, 'ยอดขาย': sales };
      });
      return hours;
    } else if (reportRange === 'WEEKLY') {
      // 7 days trend
      return Array.from({ length: 7 }).map((_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - (6 - i));
        const dayStr = d.toLocaleDateString('th-TH', { weekday: 'long' });
        const dateStr = d.toDateString();
        const sales = paidOrders.filter(o => new Date(o.timestamp).toDateString() === dateStr).reduce((sum, o) => sum + o.total, 0);
        return { name: dayStr, 'ยอดขาย': sales };
      });
    } else {
      // Monthly simulation by weeks
      return [
        { name: 'สัปดาห์ที่ 1', 'ยอดขาย': Math.round(totalSalesVal * 0.22) },
        { name: 'สัปดาห์ที่ 2', 'ยอดขาย': Math.round(totalSalesVal * 0.26) },
        { name: 'สัปดาห์ที่ 3', 'ยอดขาย': Math.round(totalSalesVal * 0.24) },
        { name: 'สัปดาห์ที่ 4 (ปัจจุบัน)', 'ยอดขาย': Math.round(totalSalesVal * 0.28) }
      ];
    }
  };

  const getFilteredExportOrders = () => {
    return paidOrders.filter(order => {
      const d = new Date(order.timestamp);
      if (d.getFullYear() !== exportYear) return false;
      
      if (exportPeriodType === 'MONTH') {
        return d.getMonth() === exportMonth;
      } else {
        const q = Math.floor(d.getMonth() / 3) + 1;
        return q === exportQuarter;
      }
    });
  };

  const exportOrders = getFilteredExportOrders();
  const exportOrdersCount = exportOrders.length;
  const exportOrdersTotal = exportOrders.reduce((sum, o) => sum + o.total, 0);

  const handleExportCSV = () => {
    if (exportOrders.length === 0) return;
    
    const headers = [
      'รหัสคำสั่งซื้อ (Order ID)',
      'วันที่ (Date)',
      'เวลา (Time)',
      'เลขโต๊ะ (Table No)',
      'พนักงานขาย/แคชเชียร์ (Cashier)',
      'รายละเอียดรายการสินค้า (Order Details)',
      'จำนวนจานรวม (Total Qty)',
      'ยอดรวมก่อนส่วนลด (Subtotal)',
      'ส่วนลด (Discount)',
      'ยอดรวมสุทธิ (Net Total)',
      'วิธีการชำระเงิน (Payment Method)',
      'ประเภทภาษี (VAT Type)',
      'จำนวนภาษีมูลค่าเพิ่ม (VAT Amount)',
      'สถานะการชำระเงิน (Payment Status)'
    ];

    const rows = exportOrders.map(order => {
      const d = new Date(order.timestamp);
      const dateStr = d.toLocaleDateString('th-TH');
      const timeStr = d.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
      const itemsDetail = order.items.map(item => `${item.name}${item.addFriedEgg ? ' (+ไข่ดาว)' : ''} x${item.quantity}`).join(' | ');
      const totalQty = order.items.reduce((sum, item) => sum + item.quantity, 0);
      
      return [
        order.id,
        dateStr,
        timeStr,
        order.tableNo,
        order.cashierName,
        itemsDetail,
        totalQty,
        order.subtotal,
        order.discount,
        order.total,
        order.paymentMethod === 'CASH' ? 'เงินสด' : 'โอนจ่าย (PromptPay)',
        order.vatType === 'INCLUSIVE' ? 'รวมในราคาสินค้า' : order.vatType === 'EXCLUSIVE' ? 'แยกต่างหาก' : 'ไม่มีภาษีมูลค่าเพิ่ม',
        order.vatAmount || 0,
        order.paymentStatus === 'PAID' ? 'ชำระเงินแล้ว' : 'ค้างชำระ'
      ];
    });

    const csvContent = "\uFEFF" + [
      headers.join(','),
      ...rows.map(row => row.map(val => `"${String(val).replace(/"/g, '""')}"`).join(','))
    ].join('\r\n');

    const fileName = exportPeriodType === 'MONTH'
      ? `รายงานยอดขาย_รายเดือน_${THAI_MONTHS[exportMonth]}_${exportYear}.csv`
      : `รายงานยอดขาย_รายไตรมาส_Q${exportQuarter}_${exportYear}.csv`;

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Upper header filter */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-900 border border-slate-800 p-4 rounded-2xl">
        <div>
          <h3 className="font-bold text-white text-base">วิเคราะห์รายงานและข้อมูลเชิงลึก (Intelligence Reports)</h3>
          <p className="text-xs text-slate-400">กรองช่วงเวลาตรวจสอบแนวโน้มผลประกอบการ และผลงานบารมีทีมงาน</p>
        </div>
        <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 self-start sm:self-auto">
          {(['DAILY', 'WEEKLY', 'MONTHLY'] as const).map(range => (
            <button
              key={range}
              onClick={() => setReportRange(range)}
              className={`py-1.5 px-3 rounded-lg text-xs font-bold transition-all ${
                reportRange === range
                  ? 'bg-gradient-to-r from-red-600 to-amber-600 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {range === 'DAILY' ? 'รายวัน' : range === 'WEEKLY' ? 'รายสัปดาห์' : 'รายเดือน'}
            </button>
          ))}
        </div>
      </div>

      {/* Accounting CSV Exporter widget */}
      <div className="bg-[#0F1D30]/80 border border-[#1E2E42] p-5 rounded-2xl shadow-xl flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Download className="w-4 h-4 text-[#D9383A]" />
            <h4 className="font-bold text-white text-sm">ส่งออกรายงานยอดขายเพื่อโปรแกรมบัญชี (CSV Export)</h4>
          </div>
          <p className="text-xs text-slate-400">
            ส่งออกไฟล์ข้อมูลการขายเพื่อนำไปประมวลผลต่อใน Excel หรือโปรแกรมทำบัญชีอื่น ๆ (รองรับภาษาไทยเต็มรูปแบบ)
          </p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
          {/* Period Type selector */}
          <div className="flex bg-slate-950 p-1 rounded-xl border border-[#1E2E42] shrink-0">
            <button
              type="button"
              onClick={() => setExportPeriodType('MONTH')}
              className={`py-1 px-3.5 rounded-lg text-xs font-black transition-all cursor-pointer ${
                exportPeriodType === 'MONTH'
                  ? 'bg-[#D9383A] text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              รายเดือน
            </button>
            <button
              type="button"
              onClick={() => setExportPeriodType('QUARTER')}
              className={`py-1 px-3.5 rounded-lg text-xs font-black transition-all cursor-pointer ${
                exportPeriodType === 'QUARTER'
                  ? 'bg-[#D9383A] text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              รายไตรมาส
            </button>
          </div>

          {/* Select Year */}
          <select
            value={exportYear}
            onChange={(e) => setExportYear(Number(e.target.value))}
            className="bg-slate-950 border border-[#1E2E42] rounded-xl px-3 py-2 text-xs font-bold text-white focus:outline-none focus:border-[#D9383A] cursor-pointer"
          >
            {availableYears.map(yr => (
              <option key={yr} value={yr}>ปี {yr + 543}</option>
            ))}
          </select>

          {/* Select Month / Quarter */}
          {exportPeriodType === 'MONTH' ? (
            <select
              value={exportMonth}
              onChange={(e) => setExportMonth(Number(e.target.value))}
              className="bg-slate-950 border border-[#1E2E42] rounded-xl px-3 py-2 text-xs font-bold text-white focus:outline-none focus:border-[#D9383A] cursor-pointer"
            >
              {THAI_MONTHS.map((m, idx) => (
                <option key={m} value={idx}>{m}</option>
              ))}
            </select>
          ) : (
            <select
              value={exportQuarter}
              onChange={(e) => setExportQuarter(Number(e.target.value))}
              className="bg-slate-950 border border-[#1E2E42] rounded-xl px-3 py-2 text-xs font-bold text-white focus:outline-none focus:border-[#D9383A] cursor-pointer"
            >
              {THAI_QUARTERS.map(q => (
                <option key={q.value} value={q.value}>{q.label}</option>
              ))}
            </select>
          )}

          {/* Export Action Button */}
          <button
            type="button"
            onClick={handleExportCSV}
            disabled={exportOrdersCount === 0}
            className={`flex items-center justify-center gap-1.5 py-2 px-4 rounded-xl text-xs font-black transition-all duration-200 cursor-pointer ${
              exportOrdersCount > 0
                ? 'bg-gradient-to-r from-[#D9383A] to-amber-600 text-white shadow-lg active:scale-95 hover:brightness-110'
                : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700/50'
            }`}
          >
            <Download className="w-3.5 h-3.5" />
            <span>
              ส่งออก {exportOrdersCount > 0 ? `(${exportOrdersCount} รายการ • ${exportOrdersTotal.toLocaleString()} ฿)` : '(ไม่มีข้อมูล)'}
            </span>
          </button>
        </div>
      </div>

      {/* Grid: 3 Stats widgets */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl text-xs space-y-1">
          <span className="text-slate-400 font-medium flex items-center gap-1">
            <TrendingUp className="w-4 h-4 text-emerald-500" /> ยอดรวมยอดขายสุทธิ
          </span>
          <h3 className="text-2xl font-black text-white font-mono mt-2">{totalSalesVal.toLocaleString()}{currency}</h3>
          <p className="text-[10px] text-slate-500 mt-1">หลังจากหักคูปองส่วนลดในระบบหมดสิ้น</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl text-xs space-y-1">
          <span className="text-slate-400 font-medium flex items-center gap-1">
            <Utensils className="w-4 h-4 text-amber-500" /> ต้นทุนคลังรวมสะสม (COGS)
          </span>
          <h3 className="text-2xl font-black text-slate-300 font-mono mt-2">{totalIngredientsCost.toLocaleString(undefined, { maximumFractionDigits: 0 })}{currency}</h3>
          <p className="text-[10px] text-slate-500 mt-1">สัดส่วนทุน: {((totalIngredientsCost / (totalSalesVal || 1)) * 100).toFixed(1)}%</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl text-xs space-y-1">
          <span className="text-slate-400 font-medium flex items-center gap-1">
            <Users className="w-4 h-4 text-blue-500" /> ยอดเฉลี่ยต่อโต๊ะบิล (Avg Bill)
          </span>
          <h3 className="text-2xl font-black text-white font-mono mt-2">{averageBillVal.toFixed(0)}{currency}</h3>
          <p className="text-[10px] text-slate-500 mt-1">จากกระบวนการชำระเงิน {totalOrdersCount} บิล</p>
        </div>
      </div>

      {/* Grid: Chart section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Trend chart */}
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl lg:col-span-2 shadow">
          <div>
            <h4 className="font-bold text-white text-sm">กราฟพยากรณ์การขาย ({reportRange === 'DAILY' ? 'ช่วงชั่วโมงขายวันนี้' : reportRange === 'WEEKLY' ? '7 วันล่าสุด' : 'รายสัปดาห์เดือนนี้'})</h4>
            <p className="text-xs text-slate-400 mb-4">แสดงปริมาณยอดชำระเงิน POS ไหลเข้าคลังร้าน</p>
          </div>
          <div className="h-64 w-full text-[10px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={getTrendData()} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="name" stroke="#64748b" />
                <YAxis stroke="#64748b" />
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155' }} />
                <Line type="monotone" dataKey="ยอดขาย" stroke="#ef4444" strokeWidth={3} activeDot={{ r: 8 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Category Share (Pie) */}
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow flex flex-col justify-between">
          <div>
            <h4 className="font-bold text-white text-sm">สัดส่วนกลุ่มยอดขายผลิตภัณฑ์</h4>
            <p className="text-xs text-slate-400 mb-4">แบ่งตามหมวดหมู่ประเภทจานหลัก</p>
          </div>
          
          <div className="h-44 w-full text-[10px] relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={categoryPieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={70}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {categoryPieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="space-y-1.5 text-[11px] pt-4">
            {categoryPieData.map((item, index) => (
              <div key={item.name} className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: PIE_COLORS[index % PIE_COLORS.length] }}></span>
                  <span className="text-slate-300 font-medium">{item.name}</span>
                </div>
                <span className="font-mono text-white font-bold">{item.value.toLocaleString()} ฿</span>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Grid: Staff performance and Food cost warning */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Staff performance (รายงานพนักงาน) */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-850 pb-3">
            <Users className="w-4 h-4 text-blue-400" />
            <div>
              <h4 className="font-bold text-white text-sm">ประสิทธิภาพแคชเชียร์ / พนักงานขาย (Cashier Leaderboard)</h4>
              <p className="text-[10px] text-slate-400">วิเคราะห์จำนวนบิลและรายได้รวมคุมเก็บเงินสำเร็จ</p>
            </div>
          </div>

          <div className="space-y-2.5">
            {employeesList.map((emp, index) => (
              <div key={emp.name} className="p-3 bg-slate-950 rounded-xl border border-slate-850 flex items-center justify-between text-xs">
                <div className="flex items-center gap-3">
                  <span className="flex items-center justify-center w-6 h-6 rounded bg-blue-950/40 text-blue-400 font-bold border border-blue-900/30 font-mono">
                    {index + 1}
                  </span>
                  <div>
                    <span className="font-bold text-slate-200 block">{emp.name}</span>
                    <span className="text-[10px] text-slate-500 font-medium">สิทธิ์งาน: แคชเชียร์หน้าร้าน</span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="font-bold text-white block">{emp.totalDriven.toLocaleString()} {currency}</span>
                  <span className="text-[10px] text-slate-500 font-mono">{emp.bills} บิลสำเร็จ</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Food Cost Margin warning list */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-850 pb-3">
            <AlertCircle className="w-4 h-4 text-red-400" />
            <div>
              <h4 className="font-bold text-white text-sm">รายงานสัดส่วนอัตราต้นทุนอาหาร (Food Cost Audit)</h4>
              <p className="text-[10px] text-slate-400">คัดกรองเมนูที่มีเปอร์เซ็นต์ค่าของวิกฤต (เกณฑ์เป้าหมาย ≤ 35%)</p>
            </div>
          </div>

          <div className="space-y-2.5 max-h-[220px] overflow-y-auto pr-1">
            {menuCostWarnings.map(item => {
              const exceeds = item.costPct > 35;
              return (
                <div key={item.id} className="p-3 bg-slate-950 rounded-xl border border-slate-850 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-bold text-slate-200 block">{item.name}</span>
                    <span className="text-[10px] text-slate-500">ราคาขายหน้าร้าน: {item.price} ฿ • ทุน: {item.cost} ฿</span>
                  </div>
                  <div className="text-right">
                    <span className={`inline-block px-2.5 py-0.5 rounded-lg text-[10px] font-bold ${
                      exceeds
                        ? 'bg-red-950/50 text-red-400 border border-red-900/40 animate-pulse'
                        : 'bg-green-950/40 text-green-400 border border-green-900/30'
                    }`}>
                      {item.costPct.toFixed(1)}% {exceeds ? '⚠️ ทุนสูงเกินไป' : 'ปกติ'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>

      {/* Historical Order Transaction Log (Searchable & Date-range filterable) */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-850 pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-red-500" />
              <h4 className="font-black text-white text-base">ประวัติการสั่งซื้อและตรวจสอบบัญชีธุรกรรม (Transaction & Audit Log)</h4>
            </div>
            <p className="text-xs text-slate-400">ค้นหาประวัติ ออเดอร์ เลขโต๊ะ หรือช่วงเวลาสั่งซื้อ เพื่อตรวจสอบข้อมูลรายละเอียดและสรุปการเงิน</p>
          </div>
          <span className="text-[10px] font-mono bg-slate-950 border border-slate-800 text-slate-400 px-3 py-1.5 rounded-full font-bold">
            พบทั้งหมด {filteredHistoricalOrders.length} รายการ จากตัวกรอง
          </span>
        </div>

        {/* Search, Date-range & Filters Controls */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          
          {/* Search Input (4 Columns) */}
          <div className="lg:col-span-4 space-y-1.5">
            <label className="text-xs font-bold text-slate-400 flex items-center gap-1">
              <Search className="w-3.5 h-3.5 text-slate-500" /> ค้นหาข้อมูลออเดอร์
            </label>
            <div className="relative">
              <input
                type="text"
                value={orderSearchQuery}
                onChange={(e) => {
                  setOrderSearchQuery(e.target.value);
                  setOrderPage(1);
                }}
                placeholder="เลขบิล / เลขโต๊ะ / เบอร์โทร / ชื่อพนักงาน / เมนู..."
                className="w-full bg-slate-950 border border-slate-850 text-white rounded-xl pl-3 pr-10 py-2.5 text-xs focus:outline-none focus:border-red-500 placeholder-slate-600 font-medium"
              />
              {orderSearchQuery && (
                <button
                  onClick={() => {
                    setOrderSearchQuery('');
                    setOrderPage(1);
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white text-xs font-bold font-sans cursor-pointer"
                >
                  ล้าง
                </button>
              )}
            </div>
          </div>

          {/* Date-Range Picker (5 Columns) */}
          <div className="lg:col-span-5 space-y-1.5">
            <label className="text-xs font-bold text-slate-400 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-slate-500" /> เลือกช่วงวัน (Date Range)
            </label>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="date"
                value={orderStartDate}
                onChange={(e) => {
                  setOrderStartDate(e.target.value);
                  setOrderPage(1);
                }}
                className="w-full bg-slate-950 border border-slate-850 text-white rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-red-500 cursor-pointer text-slate-300 font-mono"
              />
              <input
                type="date"
                value={orderEndDate}
                onChange={(e) => {
                  setOrderEndDate(e.target.value);
                  setOrderPage(1);
                }}
                className="w-full bg-slate-950 border border-slate-850 text-white rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-red-500 cursor-pointer text-slate-300 font-mono"
              />
            </div>
          </div>

          {/* Quick Date Presets (3 Columns) */}
          <div className="lg:col-span-3 space-y-1.5">
            <span className="text-xs font-bold text-slate-400 block">ช่วงวันด่วน (Presets)</span>
            <div className="grid grid-cols-3 gap-1.5">
              <button
                type="button"
                onClick={() => setDatePreset('TODAY')}
                className={`py-2 rounded-xl text-[10px] font-black transition-all cursor-pointer border ${
                  orderStartDate === new Date().toISOString().split('T')[0] && orderEndDate === new Date().toISOString().split('T')[0]
                    ? 'bg-red-950/20 text-red-400 border-red-500/40'
                    : 'bg-slate-950 text-slate-400 border-slate-850 hover:text-white'
                }`}
              >
                วันนี้
              </button>
              <button
                type="button"
                onClick={() => setDatePreset('WEEK')}
                className={`py-2 rounded-xl text-[10px] font-black transition-all cursor-pointer border ${
                  orderStartDate === new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0]
                    ? 'bg-red-950/20 text-red-400 border-red-500/40'
                    : 'bg-slate-950 text-slate-400 border-slate-850 hover:text-white'
                }`}
              >
                7 วันล่าสุด
              </button>
              <button
                type="button"
                onClick={() => setDatePreset('ALL')}
                className={`py-2 rounded-xl text-[10px] font-black transition-all cursor-pointer border ${
                  !orderStartDate && !orderEndDate
                    ? 'bg-red-950/20 text-red-400 border-red-500/40'
                    : 'bg-slate-950 text-slate-400 border-slate-850 hover:text-white'
                }`}
              >
                ทั้งหมด
              </button>
            </div>
          </div>
        </div>

        {/* Additional Status Filters */}
        <div className="flex flex-col md:flex-row md:items-center gap-4 bg-slate-950 p-4 rounded-2xl border border-slate-850 text-xs">
          <div className="flex items-center gap-2 shrink-0">
            <Filter className="w-4 h-4 text-slate-500" />
            <span className="font-bold text-slate-400">สถานะชำระเงิน:</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {(['ALL', 'PAID', 'PENDING', 'REFUNDED'] as const).map(st => (
              <button
                key={st}
                type="button"
                onClick={() => {
                  setOrderStatusFilter(st);
                  setOrderPage(1);
                }}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-extrabold transition-all cursor-pointer border ${
                  orderStatusFilter === st
                    ? 'bg-red-600 border-red-500 text-white'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                {st === 'ALL' ? 'ทั้งหมด' : st === 'PAID' ? 'จ่ายเงินแล้ว' : st === 'PENDING' ? 'ค้างจ่าย' : 'คืนเงิน/ยกเลิก'}
              </button>
            ))}
          </div>

          <div className="h-4 w-[1px] bg-slate-800 hidden md:block shrink-0"></div>

          <div className="flex items-center gap-2 shrink-0">
            <CreditCard className="w-4 h-4 text-slate-500" />
            <span className="font-bold text-slate-400">ช่องทางชำระ:</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {(['ALL', 'CASH', 'PROMPTPAY', 'TRANSFER'] as const).map(pm => (
              <button
                key={pm}
                type="button"
                onClick={() => {
                  setOrderPaymentFilter(pm);
                  setOrderPage(1);
                }}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-extrabold transition-all cursor-pointer border ${
                  orderPaymentFilter === pm
                    ? 'bg-amber-500 border-amber-400 text-slate-950'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                {pm === 'ALL' ? 'ทั้งหมด' : pm === 'CASH' ? 'เงินสด' : pm === 'PROMPTPAY' ? 'PromptPay' : 'โอนธนาคาร'}
              </button>
            ))}
          </div>
        </div>

        {/* Transaction Table */}
        <div className="overflow-x-auto rounded-2xl border border-slate-850">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-950 text-[10px] font-black uppercase text-slate-400 border-b border-slate-850">
                <th className="py-3 px-4">รหัสบิล</th>
                <th className="py-3 px-4">วัน-เวลา</th>
                <th className="py-3 px-4">โต๊ะ / ช่องทาง</th>
                <th className="py-3 px-4">รายการสินค้า</th>
                <th className="py-3 px-4 text-right">ยอดสุทธิ</th>
                <th className="py-3 px-4 text-center">ช่องทาง</th>
                <th className="py-3 px-4 text-center">สถานะ</th>
                <th className="py-3 px-4 text-center">รายละเอียด</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-850 text-xs">
              {paginatedOrders.map(order => {
                const isExpanded = expandedOrderId === order.id;
                const d = new Date(order.timestamp);
                const dateStr = d.toLocaleDateString('th-TH', { day: '2-digit', month: '2-digit', year: 'numeric' });
                const timeStr = d.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
                const totalItemsQty = order.items.reduce((sum, item) => sum + item.quantity, 0);
                const itemsSummaryText = order.items.map(item => `${item.name} x${item.quantity}`).join(', ');

                return (
                  <Fragment key={order.id}>
                    <tr className={`hover:bg-slate-950/45 transition-colors ${isExpanded ? 'bg-slate-950/70' : ''}`}>
                      <td className="py-3.5 px-4 font-mono font-bold text-red-400 text-[11px]">
                        #{order.id.slice(-6).toUpperCase()}
                      </td>
                      <td className="py-3.5 px-4 text-slate-300">
                        <div className="flex flex-col">
                          <span className="font-bold">{dateStr}</span>
                          <span className="text-[10px] text-slate-500 font-mono font-medium">{timeStr} น.</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          order.tableNo === 'TAKEAWAY' || order.tableNo === 'กลับบ้าน'
                            ? 'bg-purple-950/40 text-purple-400 border border-purple-900/30'
                            : 'bg-blue-950/40 text-blue-400 border border-blue-900/30'
                        }`}>
                          {order.tableNo === 'TAKEAWAY' || order.tableNo === 'กลับบ้าน' ? '🛍️ กลับบ้าน' : `🪑 โต๊ะ ${order.tableNo}`}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-400 max-w-xs truncate">
                        <span className="font-medium text-slate-300 block">{itemsSummaryText}</span>
                        <span className="text-[10px] text-slate-500">รวมทั้งหมด {totalItemsQty} จาน</span>
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-black text-white">
                        {order.total.toLocaleString()} {currency}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className="text-[10px] font-semibold text-slate-300">
                          {order.paymentMethod === 'CASH' ? '💵 เงินสด' : order.paymentMethod === 'PROMPTPAY' ? '📱 QR Code' : '🏦 โอนจ่าย'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold ${
                          order.paymentStatus === 'PAID'
                            ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-900/40'
                            : order.paymentStatus === 'PENDING'
                            ? 'bg-amber-950/80 text-amber-400 border border-amber-900/40'
                            : 'bg-rose-950/80 text-rose-400 border border-rose-900/40'
                        }`}>
                          {order.paymentStatus === 'PAID' ? 'ชำระเงินแล้ว' : order.paymentStatus === 'PENDING' ? 'ค้างชำระ' : 'คืนเงิน/ยกเลิก'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => setExpandedOrderId(isExpanded ? null : order.id)}
                          className="p-1 text-slate-400 hover:text-white hover:bg-slate-850 rounded-lg transition-all cursor-pointer"
                        >
                          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>
                      </td>
                    </tr>

                    {/* Expanded details row */}
                    {isExpanded && (
                      <tr className="bg-slate-950/80 border-t border-slate-850">
                        <td colSpan={8} className="py-5 px-6">
                          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-in slide-in-from-top-1 duration-250">
                            
                            {/* Bill Breakdown (7 Columns) */}
                            <div className="lg:col-span-7 space-y-4">
                              <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                                <span className="font-black text-slate-200">รายละเอียดรายการอาหารในบิล</span>
                                <span className="text-[10px] text-slate-500 font-mono">Bill ID: {order.id}</span>
                              </div>

                              <div className="space-y-2">
                                {order.items.map((item, idx) => (
                                  <div key={idx} className="flex justify-between items-center text-xs text-slate-300">
                                    <div className="space-y-0.5">
                                      <span className="font-bold">{idx + 1}. {item.name}</span>
                                      {item.addFriedEgg && (
                                        <span className="text-[10px] text-amber-500 block">+ เพิ่มไข่ดาว (+{item.eggPrice} ฿)</span>
                                      )}
                                      {item.notes && (
                                        <span className="text-[10px] text-slate-500 italic block">โน้ต: "{item.notes}"</span>
                                      )}
                                    </div>
                                    <div className="font-mono text-slate-400">
                                      {item.quantity} x {(item.price + (item.addFriedEgg ? item.eggPrice : 0)).toLocaleString()} ฿ = <strong className="text-white">{(item.quantity * (item.price + (item.addFriedEgg ? item.eggPrice : 0))).toLocaleString()} ฿</strong>
                                    </div>
                                  </div>
                                ))}
                              </div>

                              <div className="border-t border-slate-850 pt-3 space-y-1.5 text-xs">
                                <div className="flex justify-between text-slate-400">
                                  <span>ยอดรวมสินค้า (Subtotal)</span>
                                  <span className="font-mono">{order.subtotal.toLocaleString()} ฿</span>
                                </div>
                                {order.discount > 0 && (
                                  <div className="flex justify-between text-rose-400 font-medium">
                                    <span>ส่วนลดโปรโมชั่น (Discount)</span>
                                    <span className="font-mono">-{order.discount.toLocaleString()} ฿</span>
                                  </div>
                                )}
                                {order.vatAmount !== undefined && order.vatAmount > 0 && (
                                  <div className="flex justify-between text-slate-400">
                                    <span>ภาษีมูลค่าเพิ่ม (VAT 7% - {order.vatType === 'INCLUSIVE' ? 'รวมในราคาสินค้า' : 'แยกชำระ'})</span>
                                    <span className="font-mono">{order.vatAmount.toLocaleString()} ฿</span>
                                  </div>
                                )}
                                {order.serviceChargeAmount !== undefined && order.serviceChargeAmount > 0 && (
                                  <div className="flex justify-between text-slate-400">
                                    <span>ค่าบริการพิเศษ (Service Charge)</span>
                                    <span className="font-mono">+{order.serviceChargeAmount.toLocaleString()} ฿</span>
                                  </div>
                                )}
                                <div className="flex justify-between text-sm font-black text-white pt-1 border-t border-slate-850">
                                  <span>ยอดชำระสุทธิ (Grand Total)</span>
                                  <span className="font-mono text-red-400 text-base">{order.total.toLocaleString()} ฿</span>
                                </div>
                              </div>
                            </div>

                            {/* Payment, Cashier & Slip metadata (5 Columns) */}
                            <div className="lg:col-span-5 bg-slate-900 border border-slate-800 p-4 rounded-xl space-y-3 text-xs">
                              <span className="font-black text-slate-200 block border-b border-slate-800 pb-1.5">ข้อมูลผู้ลงบันทึกและลอยัลตี้</span>
                              
                              <div className="space-y-2 text-slate-300">
                                <div className="flex justify-between">
                                  <span className="text-slate-500 font-bold">พนักงานผู้ดูแลการเงิน:</span>
                                  <span className="font-medium text-slate-200">{order.cashierName}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-slate-500 font-bold">เบอร์โทรศัพท์ลูกค้า:</span>
                                  <span className="font-mono text-slate-200">{order.customerPhone || 'ไม่ได้ระบุ'}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-slate-500 font-bold">แต้มสะสมที่ได้รับ (Points):</span>
                                  <span className="font-mono text-amber-500 font-bold">+{order.earnedPoints || 0} แต้ม</span>
                                </div>
                                {order.cashReceived !== undefined && order.cashReceived > 0 && (
                                  <>
                                    <div className="flex justify-between border-t border-slate-800/40 pt-2">
                                      <span className="text-slate-500 font-bold">รับเงินสดมา:</span>
                                      <span className="font-mono font-bold text-white">{order.cashReceived.toLocaleString()} ฿</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-slate-500 font-bold">ทอนเงินสด:</span>
                                      <span className="font-mono font-bold text-emerald-400">{order.cashChange?.toLocaleString()} ฿</span>
                                    </div>
                                  </>
                                )}
                              </div>

                              {/* Render Transfer payment slip if available */}
                              {order.paymentSlip ? (
                                <div className="space-y-1.5 border-t border-slate-800/60 pt-3">
                                  <span className="text-slate-500 font-bold block">หลักฐานสลิปโอนเงิน (Attached Slip):</span>
                                  <div className="relative rounded-lg overflow-hidden border border-slate-800 bg-slate-950 p-1 group">
                                    <img
                                      src={order.paymentSlip}
                                      alt="Transfer Slip"
                                      referrerPolicy="no-referrer"
                                      className="max-h-36 object-contain mx-auto rounded transition-transform group-hover:scale-105"
                                    />
                                  </div>
                                </div>
                              ) : order.paymentMethod !== 'CASH' ? (
                                <div className="text-[10px] text-slate-500 italic bg-slate-950 p-2.5 rounded-lg border border-slate-850 text-center">
                                  ไม่มีสลิปการโอนแนบในใบเสร็จนี้
                                </div>
                              ) : null}
                            </div>

                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}

              {filteredHistoricalOrders.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-8 px-4 text-center text-slate-500 font-medium italic">
                    ❌ ไม่พบประวัติธุรกรรมที่ตรงกับเงื่อนไขการค้นหาของท่าน
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination bar */}
        {totalOrderPages > 1 && (
          <div className="flex items-center justify-between border-t border-slate-850 pt-4 text-xs">
            <span className="text-slate-500 font-semibold">
              แสดงหน้าที่ {orderPage} จากทั้งหมด {totalOrderPages} หน้า
            </span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={orderPage === 1}
                onClick={() => setOrderPage(prev => Math.max(prev - 1, 1))}
                className={`px-3 py-1.5 rounded-xl border font-bold transition-all cursor-pointer ${
                  orderPage === 1
                    ? 'bg-slate-800 text-slate-600 border-slate-700/50 cursor-not-allowed'
                    : 'bg-slate-950 border-slate-850 text-slate-400 hover:text-white'
                }`}
              >
                ย้อนกลับ
              </button>
              {Array.from({ length: totalOrderPages }).map((_, i) => {
                const pg = i + 1;
                return (
                  <button
                    key={pg}
                    type="button"
                    onClick={() => setOrderPage(pg)}
                    className={`w-8 h-8 rounded-xl font-bold font-mono text-xs transition-all cursor-pointer ${
                      orderPage === pg
                        ? 'bg-red-600 text-white'
                        : 'bg-slate-950 border border-slate-850 text-slate-400 hover:text-white'
                    }`}
                  >
                    {pg}
                  </button>
                );
              })}
              <button
                type="button"
                disabled={orderPage === totalOrderPages}
                onClick={() => setOrderPage(prev => Math.min(prev + 1, totalOrderPages))}
                className={`px-3 py-1.5 rounded-xl border font-bold transition-all cursor-pointer ${
                  orderPage === totalOrderPages
                    ? 'bg-slate-800 text-slate-600 border-slate-700/50 cursor-not-allowed'
                    : 'bg-slate-950 border-slate-850 text-slate-400 hover:text-white'
                }`}
              >
                ถัดไป
              </button>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
