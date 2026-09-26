import React, { useState } from 'react';
import { NotificationSettings, Order, Expense, Ingredient, MenuItem } from '../types';
import { 
  Send, BellRing, Settings as SettingsIcon, ShieldAlert, Sparkles, 
  Eye, AlertCircle, HelpCircle, Calendar, Layers, Check, 
  ShoppingBag, Receipt, ArrowRight, TrendingUp, X, ChevronRight, Info
} from 'lucide-react';
import { sendToTelegram, sendToLine } from '../utils/telegram';

interface NotificationsProps {
  settings: NotificationSettings;
  onUpdateSettings: (updated: NotificationSettings) => void;
  orders: Order[];
  expenses: Expense[];
  ingredients: Ingredient[];
  menuItems: MenuItem[];
  currency: string;
}

const THAI_MONTHS = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
];

export default function Notifications({ 
  settings, onUpdateSettings, orders, expenses, ingredients, menuItems, currency 
}: NotificationsProps) {
  // Local Settings form states
  const [teleToken, setTeleToken] = useState(settings.telegramToken);
  const [teleChatId, setTeleChatId] = useState(settings.telegramChatId);
  const [teleEnabled, setTeleEnabled] = useState(settings.telegramEnabled);

  const [lineTok, setLineTok] = useState(settings.lineToken);
  const [lineEnabled, setLineEnabled] = useState(settings.lineEnabled);

  const [notifyLowStock, setNotifyLowStock] = useState(settings.notifyLowStock);
  const [notifyDaily, setNotifyDaily] = useState(settings.notifyDailyReport);

  const [alertDays, setAlertDays] = useState<string[]>(settings.alertDays || ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']);
  const [alertTime, setAlertTime] = useState(settings.alertTime || '20:00');
  const [alertFrequency, setAlertFrequency] = useState<'DAILY' | 'WEEKLY' | 'CUSTOM'>(settings.alertFrequency || 'DAILY');
  const [alertStockTime, setAlertStockTime] = useState(settings.alertStockTime || '09:00');
  const [alertStockFrequency, setAlertStockFrequency] = useState<'INSTANT' | 'DAILY_SCHEDULED'>(settings.alertStockFrequency || 'INSTANT');

  // Active sub-navigation tab in Notifications Screen
  const [activeSubTab, setActiveSubTab] = useState<'SETTINGS' | 'REPORTS' | 'STOCK' | 'EXPENSE_LOGS'>('REPORTS');

  // Interactive generator controls
  const [selectedDailyDate, setSelectedDailyDate] = useState('2026-07-13'); // default mock date with heavy activity
  const [selectedMonth, setSelectedMonth] = useState(6); // 6 = July
  const [selectedYear, setSelectedYear] = useState(2026);

  // Success / Error status toasts
  const [statusNotification, setStatusNotification] = useState<{
    show: boolean;
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  const [isSending, setIsSending] = useState(false);

  // Live simulation alert state (for local visualization)
  const [simulatedAlert, setSimulatedAlert] = useState<{
    show: boolean;
    app: 'Telegram' | 'LINE';
    title: string;
    body: string;
    timestamp: string;
  } | null>(null);

  // Available dates that contain orders in the system
  const availableDates = Array.from(new Set(orders.map(o => o.timestamp.split('T')[0]))).sort((a, b) => b.localeCompare(a));

  // --- REPORT GENERATORS (THAI & ENG FORMATTERS) ---
  const getDailyReportHTML = (dateStr: string) => {
    const dayOrders = orders.filter(o => o.paymentStatus === 'PAID' && o.timestamp.startsWith(dateStr));
    const totalSales = dayOrders.reduce((sum, o) => sum + o.total, 0);
    const totalOrdersCount = dayOrders.length;
    const averageBill = totalOrdersCount > 0 ? (totalSales / totalOrdersCount) : 0;
    
    // Payment Channels
    const cashSales = dayOrders.filter(o => o.paymentMethod === 'CASH').reduce((sum, o) => sum + o.total, 0);
    const promptPaySales = dayOrders.filter(o => o.paymentMethod === 'PROMPTPAY').reduce((sum, o) => sum + o.total, 0);
    const transferSales = dayOrders.filter(o => o.paymentMethod === 'TRANSFER').reduce((sum, o) => sum + o.total, 0);

    // Calculate best selling items ordered on that day
    const menuCounts: Record<string, number> = {};
    dayOrders.forEach(o => {
      o.items.forEach(item => {
        menuCounts[item.name] = (menuCounts[item.name] || 0) + item.quantity;
      });
    });
    
    const topMenus = Object.entries(menuCounts)
      .map(([name, qty]) => ({ name, qty }))
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 3);

    // Dynamic Food cost COGS
    let foodCost = 0;
    dayOrders.forEach(o => {
      o.items.forEach(item => {
        const menu = menuItems.find(m => m.id === item.menuItemId);
        if (menu) {
          foodCost += (menu.cost + (item.addFriedEgg ? 4.2 : 0)) * item.quantity;
        }
      });
    });
    const foodCostPercent = totalSales > 0 ? (foodCost / totalSales) * 100 : 0;

    // Expenses mapped to this specific date
    const dayExpenses = expenses.filter(e => e.date === dateStr).reduce((sum, e) => sum + e.amount, 0);
    const grossProfit = totalSales - foodCost;
    const netProfit = totalSales - foodCost - dayExpenses;

    const [yr, mo, dy] = dateStr.split('-');
    const formattedDate = `${dy}/${mo}/${yr}`;
    const targetAchieved = totalSales >= 5000 ? '✅ ทำได้' : '❌ ยังไม่ถึงเป้า';

    return `<b>รายงานยอดขายประจำวัน</b>
🌶️ ครัวกะเพรา

📅 วันที่ : ${formattedDate}

💰 ยอดขายรวม : ${totalSales.toLocaleString()} บาท
🧾 จำนวนออเดอร์ : ${totalOrdersCount}
💵 บิลเฉลี่ย : ${averageBill.toFixed(2)} บาท

💳 ช่องทางชำระเงิน
• เงินสด : ${cashSales.toLocaleString()} บาท
• โอน : ${transferSales.toLocaleString()} บาท
• QR PromptPay : ${promptPaySales.toLocaleString()} บาท

🍛 เมนูขายดี
${topMenus.map((m, idx) => `${idx + 1}. ${m.name} ${m.qty} จาน`).join('\n') || 'ไม่มีออเดอร์ในวันนี้'}

📦 ต้นทุนอาหาร : ${foodCost.toLocaleString(undefined, { maximumFractionDigits: 0 })} บาท
📈 Food Cost : ${foodCostPercent.toFixed(1)}%

💸 ค่าใช้จ่าย : ${dayExpenses.toLocaleString()} บาท
📊 กำไรขั้นต้น : ${grossProfit.toLocaleString(undefined, { maximumFractionDigits: 0 })} บาท
💵 กำไรสุทธิ : ${netProfit.toLocaleString(undefined, { maximumFractionDigits: 0 })} บาท

🎯 เป้าหมายยอดขาย : <b>${targetAchieved}</b>`;
  };

  const getMonthlyReportHTML = (year: number, month: number) => {
    const prefix = `${year}-${String(month + 1).padStart(2, '0')}`;
    const monthOrders = orders.filter(o => o.paymentStatus === 'PAID' && o.timestamp.startsWith(prefix));
    
    const totalSales = monthOrders.reduce((sum, o) => sum + o.total, 0);
    const totalOrdersCount = monthOrders.length;
    const averageBill = totalOrdersCount > 0 ? (totalSales / totalOrdersCount) : 0;

    let foodCost = 0;
    monthOrders.forEach(o => {
      o.items.forEach(item => {
        const menu = menuItems.find(m => m.id === item.menuItemId);
        if (menu) {
          foodCost += (menu.cost + (item.addFriedEgg ? 4.2 : 0)) * item.quantity;
        }
      });
    });
    const foodCostPercent = totalSales > 0 ? (foodCost / totalSales) * 100 : 0;

    const monthExpenses = expenses.filter(e => e.date.startsWith(prefix)).reduce((sum, e) => sum + e.amount, 0);
    const netProfit = totalSales - foodCost - monthExpenses;

    const menuCounts: Record<string, number> = {};
    monthOrders.forEach(o => {
      o.items.forEach(item => {
        menuCounts[item.name] = (menuCounts[item.name] || 0) + item.quantity;
      });
    });
    const topMenus = Object.entries(menuCounts)
      .map(([name, qty]) => ({ name, qty }))
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 3);

    const monthNameThai = THAI_MONTHS[month];
    const yearThai = year + 543;
    const medals = ['🥇', '🥈', '🥉'];

    return `<b>รายงานยอดขายประจำเดือน</b>
📈 สรุปยอดขายเดือน ${monthNameThai} ${yearThai}

💰 ยอดขายรวม : ${totalSales.toLocaleString()} บาท
🧾 จำนวนออเดอร์ : ${totalOrdersCount.toLocaleString()}
💵 บิลเฉลี่ย : ${averageBill.toFixed(2)} บาท

📦 ต้นทุนอาหาร : ${foodCost.toLocaleString(undefined, { maximumFractionDigits: 0 })} บาท
📊 Food Cost : ${foodCostPercent.toFixed(2)}%

💸 ค่าใช้จ่ายรวม : ${monthExpenses.toLocaleString()} บาท

💰 กำไรสุทธิ : ${netProfit.toLocaleString(undefined, { maximumFractionDigits: 0 })} บาท

🏆 เมนูขายดีที่สุด
${topMenus.map((m, idx) => `${medals[idx] || '•'} ${m.name}`).join('\n') || 'ไม่มีข้อมูลเมนูขายดี'}`;
  };

  const getStockAlertHTML = () => {
    const lowIngredients = ingredients.filter(i => i.stock <= i.minStock);
    
    if (lowIngredients.length === 0) {
      return `<b>🚨 แจ้งเตือนสต็อก</b>\n\n🟢 วัตถุดิบทุกรายการปกติ ไม่มีสินค้าต่ำกว่าเกณฑ์ขั้นต่ำ!`;
    }

    const alertLines = lowIngredients.map(i => {
      if (i.stock <= 0) {
        return `❌ ${i.name} หมดสต็อก`;
      } else {
        let amountStr = `${i.stock} ${i.unit}`;
        if (i.unit === 'kg' && i.stock < 1) {
          amountStr = `${(i.stock * 1000).toFixed(0)} กรัม`;
        }
        return `⚠️ ${i.name} เหลือ ${amountStr}`;
      }
    });

    return `<b>🚨 แจ้งเตือนสต็อก</b>\n\n${alertLines.join('\n')}`;
  };

  const getExpenseAlertHTML = (expense: Expense) => {
    const categoryMap: Record<string, string> = {
      Rent: 'ค่าเช่า',
      Salary: 'เงินเดือน',
      Electricity: 'ค่าไฟ',
      Water: 'ค่าน้ำ',
      Ingredients: 'วัตถุดิบ',
      Marketing: 'การตลาด',
      Other: 'อื่น ๆ'
    };

    const now = new Date(expense.date);
    const timeStr = new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });

    return `<b>💸 มีการบันทึกค่าใช้จ่าย</b>

หมวด : ${categoryMap[expense.category] || expense.category}
รายการ : ${expense.description}
ยอดเงิน : ${expense.amount.toLocaleString()} บาท

ผู้บันทึก : Admin
เวลา : ${timeStr} น.`;
  };

  // --- ACTIONS HANDLERS ---
  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    const updated: NotificationSettings = {
      telegramToken: teleToken,
      telegramChatId: teleChatId,
      telegramEnabled: teleEnabled,
      lineToken: lineTok,
      lineEnabled: lineEnabled,
      notifyLowStock,
      notifyDailyReport: notifyDaily,
      alertDays,
      alertTime,
      alertFrequency,
      alertStockTime,
      alertStockFrequency
    };
    onUpdateSettings(updated);
    showToast('success', 'บันทึกตั้งค่าการแจ้งเตือนและกำหนดเวลาสำเร็จ! 🔔');
  };

  const showToast = (type: 'success' | 'error', message: string) => {
    setStatusNotification({ show: true, type, message });
    setTimeout(() => {
      setStatusNotification(null);
    }, 4500);
  };

  const executeSendNotification = async (channel: 'Telegram' | 'LINE', messageHTML: string, title: string) => {
    setIsSending(true);
    const plainText = messageHTML.replace(/<[^>]*>/g, ''); // strip HTML for LINE

    let success = false;
    let errorMsg = '';

    if (channel === 'Telegram') {
      if (!teleEnabled || !teleToken || !teleChatId) {
        setIsSending(false);
        showToast('error', 'กรุณาเปิดใช้งานและตั้งค่า Telegram Token / Chat ID ก่อนทำรายการ');
        return;
      }
      const res = await sendToTelegram(teleToken, teleChatId, messageHTML);
      success = res.success;
      errorMsg = res.error || '';
    } else {
      if (!lineEnabled || !lineTok) {
        setIsSending(false);
        showToast('error', 'กรุณาเปิดใช้งานและตั้งค่า LINE Access Token ก่อนทำรายการ');
        return;
      }
      const res = await sendToLine(lineTok, plainText);
      success = res.success;
      errorMsg = res.error || '';
    }

    setIsSending(false);

    if (success) {
      showToast('success', `ส่งแจ้งเตือนเข้า ${channel} สำเร็จเรียบร้อยแล้ว! 🎉`);
      
      // Also show local preview simulation
      const now = new Date();
      setSimulatedAlert({
        show: true,
        app: channel,
        title: channel === 'Telegram' ? '🤖 TG Bot • แจ้งเตือน' : '🟢 LINE Notify • สต๊อกใกล้หมด',
        body: plainText,
        timestamp: now.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })
      });
      setTimeout(() => setSimulatedAlert(null), 8000);
    } else {
      showToast('error', `ส่งแจ้งเตือนขัดข้อง: ${errorMsg}`);
    }
  };

  // Pre-render content based on tab
  const getActivePreviewText = () => {
    if (activeSubTab === 'REPORTS') {
      return getDailyReportHTML(selectedDailyDate);
    } else if (activeSubTab === 'STOCK') {
      return getStockAlertHTML();
    } else if (activeSubTab === 'EXPENSE_LOGS') {
      const latestExp = expenses[0] || { id: 'e-mock', category: 'Ingredients', amount: 1050, description: 'เนื้อวัว', date: '2026-07-19' };
      return getExpenseAlertHTML(latestExp as Expense);
    }
    return '';
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto relative">
      {/* Dynamic Push Notification Simulator popup container */}
      {simulatedAlert && (
        <div className="fixed top-6 right-6 z-50 max-w-sm w-full bg-slate-900 border-2 border-amber-500/30 rounded-2xl p-4 shadow-2xl animate-bounce duration-500">
          <div className="flex items-start gap-3">
            <div className={`p-2 rounded-xl flex items-center justify-center text-white shrink-0 ${
              simulatedAlert.app === 'Telegram' ? 'bg-sky-500' : 'bg-emerald-500'
            }`}>
              <BellRing className="w-5 h-5" />
            </div>
            <div className="flex-1 space-y-1">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-white">{simulatedAlert.title}</span>
                <span className="text-[10px] text-slate-500 font-mono font-bold">{simulatedAlert.timestamp}</span>
              </div>
              <p className="text-[11px] text-slate-300 leading-relaxed whitespace-pre-line font-mono bg-slate-950 p-2.5 rounded-lg border border-slate-850">
                {simulatedAlert.body}
              </p>
            </div>
          </div>
          <div className="mt-3 text-right">
            <span className="text-[9px] text-emerald-400 font-medium">จำลองการส่งแจ้งเตือน API โทรศัพท์จริงสำเร็จ</span>
          </div>
        </div>
      )}

      {/* Floating Status Toast Notification */}
      {statusNotification && (
        <div className={`fixed bottom-6 right-6 z-50 px-5 py-3 rounded-xl shadow-2xl flex items-center gap-3 border animate-in slide-in-from-bottom-5 duration-300 ${
          statusNotification.type === 'success' 
            ? 'bg-emerald-950 border-emerald-500/40 text-emerald-200' 
            : 'bg-rose-950 border-rose-500/40 text-rose-200'
        }`}>
          {statusNotification.type === 'success' ? <Check className="w-5 h-5 text-emerald-400 shrink-0" /> : <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />}
          <span className="text-xs font-bold">{statusNotification.message}</span>
        </div>
      )}

      {/* Header banner */}
      <div className="bg-gradient-to-r from-red-950/20 to-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-500" />
            <span className="text-[10px] bg-red-600/10 text-red-400 border border-red-500/20 px-2.5 py-0.5 rounded-full font-black uppercase">TELEGRAM PRO INTEGRATION</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">ส่งแจ้งเตือนความคืบหน้าร้านเข้ากลุ่มคุณ</h2>
          <p className="text-xs text-slate-400">ผูกเชื่อมต่อระบบบัญชี และคลังวัตถุดิบเข้าสู่ห้องแชท Telegram & LINE Notify ส่งตรงสิรินัดสิ้นวัน</p>
        </div>

        <div className="flex flex-wrap gap-2 shrink-0">
          <button
            onClick={() => setActiveSubTab('REPORTS')}
            className={`px-4 py-2.5 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer ${
              activeSubTab === 'REPORTS' 
                ? 'bg-gradient-to-r from-red-600 to-amber-600 text-white shadow-lg' 
                : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-white'
            }`}
          >
            <Receipt className="w-4 h-4" /> สรุปยอดขาย
          </button>
          <button
            onClick={() => setActiveSubTab('STOCK')}
            className={`px-4 py-2.5 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer ${
              activeSubTab === 'STOCK' 
                ? 'bg-gradient-to-r from-red-600 to-amber-600 text-white shadow-lg' 
                : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-white'
            }`}
          >
            <ShieldAlert className="w-4 h-4" /> เตือนสต๊อกต่ำ
          </button>
          <button
            onClick={() => setActiveSubTab('EXPENSE_LOGS')}
            className={`px-4 py-2.5 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer ${
              activeSubTab === 'EXPENSE_LOGS' 
                ? 'bg-gradient-to-r from-red-600 to-amber-600 text-white shadow-lg' 
                : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-white'
            }`}
          >
            <Layers className="w-4 h-4" /> รายจ่ายของร้าน
          </button>
          <button
            onClick={() => setActiveSubTab('SETTINGS')}
            className={`px-4 py-2.5 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer ${
              activeSubTab === 'SETTINGS' 
                ? 'bg-gradient-to-r from-red-600 to-amber-600 text-white shadow-lg' 
                : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-white'
            }`}
          >
            <SettingsIcon className="w-4 h-4" /> ตั้งค่าแชนแนล
          </button>
        </div>
      </div>

      {/* Main Container: Interactive Controls Panel */}
      <div className="max-w-3xl mx-auto space-y-6">

          {activeSubTab === 'SETTINGS' && (
            <form onSubmit={handleSaveSettings} className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-6 shadow-xl">
              <div className="border-b border-slate-850 pb-3 flex items-center justify-between">
                <div>
                  <h3 className="font-black text-white text-sm">การเชื่อมต่อแชนแนลภายนอก (Connection Gateways)</h3>
                  <p className="text-[10px] text-slate-500">เปิดใช้งาน Bot เพื่อเป็นกระบอกเสียงให้ระบบ POS</p>
                </div>
                <Info className="w-4.5 h-4.5 text-slate-400 shrink-0" />
              </div>

              {/* TELEGRAM SETTINGS ROW */}
              <div className="bg-slate-950 p-5 rounded-2xl border border-slate-850 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="w-7 h-7 bg-sky-500/10 border border-sky-500/20 rounded-lg flex items-center justify-center text-sky-400 text-xs font-black">TG</span>
                    <div>
                      <h4 className="text-xs font-bold text-white">โทรศัพท์ส่วนตัว / กลุ่มแชท Telegram Bot</h4>
                      <p className="text-[9px] text-slate-500">ส่งตรงข้อความ HTML ที่สวยงาม</p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={teleEnabled} 
                      onChange={(e) => setTeleEnabled(e.target.checked)} 
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-slate-400 after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-sky-500"></div>
                  </label>
                </div>

                {teleEnabled && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs animate-in fade-in-30 duration-200">
                    <div className="space-y-1">
                      <span className="text-slate-400 block font-medium">Telegram Bot Token</span>
                      <input
                        type="password"
                        value={teleToken}
                        onChange={(e) => setTeleToken(e.target.value)}
                        placeholder="5841299923:AAFlqZ4_example..."
                        className="w-full bg-slate-900 border border-slate-800 text-white rounded-xl px-3 py-2 text-xs font-mono focus:outline-none focus:border-sky-500"
                      />
                    </div>
                    <div className="space-y-1">
                      <span className="text-slate-400 block font-medium">Chat ID (กลุ่มหรือ ID บัญชี)</span>
                      <input
                        type="text"
                        value={teleChatId}
                        onChange={(e) => setTeleChatId(e.target.value)}
                        placeholder="-100123456789"
                        className="w-full bg-slate-900 border border-slate-800 text-white rounded-xl px-3 py-2 text-xs font-mono focus:outline-none focus:border-sky-500"
                      />
                    </div>
                  </div>
                )}

                {teleEnabled && (
                  <div className="bg-sky-950/20 border border-sky-900/30 rounded-xl p-3 flex items-start gap-2.5 text-xs">
                    <span className="text-sky-400 mt-0.5">💡</span>
                    <div className="space-y-0.5 text-slate-300">
                      <span className="font-bold text-sky-300 block">รองรับการดึงสลิปและบันทึกค่าใช้จ่ายผ่าน Telegram บอทนี้!</span>
                      <p className="text-[11px] text-slate-400 leading-relaxed">
                        พนักงานหรือผู้จัดการสามารถส่งภาพสลิปโอนเงิน หรือพิมพ์ข้อความค่าใช้จ่ายเข้าแชทบอทนี้ได้โดยตรง ระบบบัญชีจะดึงข้อมูลมาลงในหมวด <strong>"ค่าใช้จ่าย (Expenses)"</strong> ในหน้า Accounting ให้โดยอัตโนมัติ
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* LINE NOTIFY SETTINGS ROW */}
              <div className="bg-slate-950 p-5 rounded-2xl border border-slate-850 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="w-7 h-7 bg-emerald-500/10 border border-emerald-500/20 rounded-lg flex items-center justify-center text-emerald-400 text-xs font-black">LN</span>
                    <div>
                      <h4 className="text-xs font-bold text-white">LINE OA / LINE Notify Token</h4>
                      <p className="text-[9px] text-slate-500">ส่งตรงเข้ากลุ่มพนักงานหรือครัวร้านค้า</p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={lineEnabled} 
                      onChange={(e) => setLineEnabled(e.target.checked)} 
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-slate-400 after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500"></div>
                  </label>
                </div>

                {lineEnabled && (
                  <div className="space-y-1 text-xs animate-in fade-in-30 duration-200">
                    <span className="text-slate-400 block font-medium">LINE OA Access Token</span>
                    <input
                      type="password"
                      value={lineTok}
                      onChange={(e) => setLineTok(e.target.value)}
                      placeholder="LpG8exampleLINETokenForKapraoPOS..."
                      className="w-full bg-slate-900 border border-slate-800 text-white rounded-xl px-3 py-2 text-xs font-mono focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                )}
              </div>

              {/* AUTOMATION TRIGGER CONFIGURATIONS */}
              <div className="bg-slate-950 p-5 rounded-2xl border border-slate-850 space-y-3.5">
                <span className="text-[10px] font-black text-slate-400 block uppercase tracking-wider">เงื่อนไขการทำงานอัตโนมัติ (Trigger Configurations)</span>
                
                <div className="flex items-center justify-between text-xs py-1">
                  <div className="space-y-0.5">
                    <span className="text-slate-200 block font-semibold">แจ้งเตือนวัตถุดิบใกล้หมดสต๊อก (Low Stock Alert)</span>
                    <span className="text-[10px] text-slate-500 block">แจ้งเตือนไลน์ / TG อัตโนมัติเมื่อปริมาณวัตถุดิบลดต่ำกว่าเกณฑ์ขั้นต่ำ</span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={notifyLowStock} 
                      onChange={(e) => setNotifyLowStock(e.target.checked)} 
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-slate-400 after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-red-500"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between text-xs py-1 border-t border-slate-900 pt-3">
                  <div className="space-y-0.5">
                    <span className="text-slate-200 block font-semibold">สรุปรายงานยอดปิดร้านสิ้นวันอัตโนมัติ (Daily Closing Report)</span>
                    <span className="text-[10px] text-slate-500 block">ส่งยอดรายงานปิดร้านเมื่อแคชเชียร์สลับกะหรือปิดบิลหลักรายวันสำเร็จ</span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={notifyDaily} 
                      onChange={(e) => setNotifyDaily(e.target.checked)} 
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-slate-400 after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-red-500"></div>
                  </label>
                </div>
              </div>

              {/* SCHEDULER CONFIGURATIONS */}
              <div className="bg-slate-950 p-5 rounded-2xl border border-slate-850 space-y-4">
                <div className="flex items-center gap-2 border-b border-slate-900 pb-2.5">
                  <Calendar className="w-5 h-5 text-amber-500" />
                  <span className="text-xs font-black text-white uppercase tracking-wider">⏰ ตั้งวันเวลาที่แจ้งเตือน (Custom Scheduler)</span>
                </div>

                {/* 1. Daily Closing Report Schedule */}
                <div className="space-y-3.5">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-slate-200 block">ตารางวันและเวลาสำหรับรายงานสรุป (Sales Report Scheduling)</span>
                      <p className="text-[10px] text-slate-500">กำหนดช่วงวันในรอบสัปดาห์และเวลาที่จะให้บอทยิงรายงานอัตโนมัติ</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                    <div className="space-y-1">
                      <label className="text-slate-400 font-medium block">รูปแบบความถี่จัดส่ง</label>
                      <select
                        value={alertFrequency}
                        onChange={(e) => {
                          const freq = e.target.value as 'DAILY' | 'WEEKLY' | 'CUSTOM';
                          setAlertFrequency(freq);
                          if (freq === 'DAILY') {
                            setAlertDays(['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']);
                          } else if (freq === 'WEEKLY') {
                            setAlertDays(['Fri', 'Sat', 'Sun']);
                          }
                        }}
                        className="w-full bg-slate-900 border border-slate-800 text-white rounded-xl px-3 py-2 text-xs font-bold focus:outline-none focus:border-red-500 cursor-pointer"
                      >
                        <option value="DAILY">ส่งรายวัน (ทุกวัน)</option>
                        <option value="WEEKLY">ส่งรายสัปดาห์ (เฉพาะ ศุกร์, เสาร์, อาทิตย์)</option>
                        <option value="CUSTOM">กำหนดวันเองแบบอิสระ (Custom Days)</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-slate-400 font-medium block">เวลาส่งรายงานสรุปยอด</label>
                      <input
                        type="time"
                        value={alertTime}
                        onChange={(e) => setAlertTime(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 text-white rounded-xl px-3 py-2 text-xs font-bold focus:outline-none focus:border-red-500 font-mono"
                      />
                    </div>
                  </div>

                  {/* Day of Week Selector */}
                  <div className="space-y-1.5 pt-1">
                    <span className="text-slate-400 font-medium text-[11px] block">ส่งรายงานตามวันที่กำหนด:</span>
                    <div className="flex flex-wrap gap-1.5">
                      {[
                        { key: 'Mon', label: 'จันทร์' },
                        { key: 'Tue', label: 'อังคาร' },
                        { key: 'Wed', label: 'พุธ' },
                        { key: 'Thu', label: 'พฤหัสบดี' },
                        { key: 'Fri', label: 'ศุกร์' },
                        { key: 'Sat', label: 'เสาร์' },
                        { key: 'Sun', label: 'อาทิตย์' }
                      ].map((d) => {
                        const active = alertDays.includes(d.key);
                        return (
                          <button
                            key={d.key}
                            type="button"
                            onClick={() => {
                              if (alertFrequency === 'DAILY' || alertFrequency === 'WEEKLY') {
                                setAlertFrequency('CUSTOM');
                              }
                              if (active) {
                                setAlertDays(alertDays.filter(k => k !== d.key));
                              } else {
                                setAlertDays([...alertDays, d.key]);
                              }
                            }}
                            className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all border ${
                              active
                                ? 'bg-red-500/10 border-red-500/40 text-red-400 font-black'
                                : 'bg-slate-900 border-slate-800 text-slate-500 hover:text-slate-300'
                            }`}
                          >
                            {d.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div className="border-t border-slate-900 my-4 pt-3 space-y-3.5">
                  {/* 2. Low Stock Schedule */}
                  <div>
                    <span className="text-xs font-bold text-slate-200 block">ตารางส่งแจ้งเตือนวัตถุดิบหมด/สต็อกต่ำ (Stock Alerts Timing)</span>
                    <p className="text-[10px] text-slate-500">เลือกโหมดการรับแจ้งเตือนวัตถุดิบ ให้เหมาะสมกับช่วงเวลางานครัวของท่าน</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                    <div className="space-y-1">
                      <label className="text-slate-400 font-medium block">รูปแบบการยิงสรุปพัสดุ</label>
                      <select
                        value={alertStockFrequency}
                        onChange={(e) => setAlertStockFrequency(e.target.value as 'INSTANT' | 'DAILY_SCHEDULED')}
                        className="w-full bg-slate-900 border border-slate-800 text-white rounded-xl px-3 py-2 text-xs font-bold focus:outline-none focus:border-red-500 cursor-pointer"
                      >
                        <option value="INSTANT">⚡ ยิงเตือนทันทีเรียลไทม์ (เมื่อแคชเชียร์ขายของหมดคลัง)</option>
                        <option value="DAILY_SCHEDULED">⏰ ยิงรายงานฉบับรวมตอนเช้าตามเวลาที่กำหนด</option>
                      </select>
                    </div>

                    {alertStockFrequency === 'DAILY_SCHEDULED' && (
                      <div className="space-y-1 animate-in fade-in-20 duration-200">
                        <label className="text-slate-400 font-medium block">เวลาส่งสรุปสต็อกต่ำประจำวัน</label>
                        <input
                          type="time"
                          value={alertStockTime}
                          onChange={(e) => setAlertStockTime(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-800 text-white rounded-xl px-3 py-2 text-xs font-bold focus:outline-none focus:border-red-500 font-mono"
                        />
                      </div>
                    )}
                  </div>
                </div>

                {/* Human-Readable Active Schedule summary info */}
                <div className="bg-slate-900/50 p-3.5 rounded-xl border border-slate-850/60 text-xs text-slate-300 space-y-1.5">
                  <div className="flex items-center gap-1.5 text-amber-400 font-bold">
                    <Info className="w-3.5 h-3.5" />
                    <span>สรุปตารางการจัดส่งข้อความผ่านบอทไลน์-Telegram (Active Bot Schedule)</span>
                  </div>
                  <p className="text-[11px] leading-relaxed text-slate-400">
                    • 📢 สรุปยอดเงิน: ส่งข้อความอัตโนมัติ <strong>{alertFrequency === 'DAILY' ? 'ทุกวัน' : alertFrequency === 'WEEKLY' ? 'ทุกวัน ศุกร์, เสาร์, อาทิตย์' : `ทุกวัน [ ${alertDays.map(k => {
                      const mapping: Record<string, string> = { Mon: 'จ.', Tue: 'อ.', Wed: 'พ.', Thu: 'พฤ.', Fri: 'ศ.', Sat: 'ส.', Sun: 'อา.' };
                      return mapping[k] || k;
                    }).join(', ')} ]`}</strong> ณ เวลา <strong>{alertTime} น.</strong>
                  </p>
                  <p className="text-[11px] leading-relaxed text-slate-400">
                    • 📦 วัตถุดิบคลัง: {alertStockFrequency === 'INSTANT' ? (
                      <span className="text-red-400">ส่งแจ้งเตือนด่วนทันทีแบบเรียลไทม์เมื่อวัตถุดิบลดถึงขีดอันตราย</span>
                    ) : (
                      <span>สรุปรายงานฉบับรวมส่งตรงทุกเช้า ณ เวลา <strong className="text-amber-400 font-bold">{alertStockTime} น.</strong></span>
                    )}
                  </p>
                </div>

                {/* TESTER / SIMULATOR BUTTON */}
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      const channel = teleEnabled ? 'Telegram' : lineEnabled ? 'LINE' : 'Telegram';
                      const msg = `<b>⏰ [ทดสอบระบบตั้งเวลาแจ้งเตือน]</b>\n\nบอทได้ยินสัญญาณจำลองตามเวลาที่ท่านกำหนด!\n• เวลาสรุปรายงาน: ${alertTime} น.\n• คลังสินค้าสรุปที่: ${alertStockFrequency === 'INSTANT' ? 'แจ้งเตือนทันที' : alertStockTime + ' น.'}\n• ความถี่: ${alertFrequency}\n\n📊 สถานะบริการ: เชื่อมต่อสมบูรณ์ (Cron Active)`;
                      executeSendNotification(channel, msg, 'ทดสอบตารางเวลา');
                    }}
                    className="w-full py-2.5 bg-gradient-to-r from-amber-600/20 to-red-600/20 hover:from-amber-600/30 hover:to-red-600/30 border border-amber-500/20 text-amber-300 text-[11px] font-black rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>ทดสอบจำลองเงื่อนไขเวลาจริง (Test Scheduler Trigger)</span>
                  </button>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  className="px-6 py-3 bg-gradient-to-r from-red-600 to-amber-600 hover:brightness-115 text-white font-bold rounded-xl text-xs shadow-lg active:scale-95 transition-all cursor-pointer"
                >
                  บันทึกเกตเวย์ทั้งหมด
                </button>
              </div>
            </form>
          )}

          {activeSubTab === 'REPORTS' && (
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-6 shadow-xl">
              <div className="border-b border-slate-850 pb-3 flex items-center justify-between">
                <div>
                  <h3 className="font-black text-white text-sm">ส่งสรุปรายงานประจำวัน / ประจำเดือน</h3>
                  <p className="text-[10px] text-slate-500">เลือกช่วงเวลาเพื่อประมวลผลข้อมูลการเงิน และส่งผลลัพธ์ผ่าน Bot</p>
                </div>
                <Receipt className="w-4.5 h-4.5 text-amber-500" />
              </div>

              {/* Dynamic Period Settings Section */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* DAILY PERIOD PICKER */}
                <div className="bg-slate-950 p-4 rounded-2xl border border-slate-850 space-y-3">
                  <div className="flex items-center gap-1.5 text-slate-300">
                    <Calendar className="w-4 h-4 text-red-500" />
                    <span className="text-xs font-bold">1. เลือกวันสรุปยอดขายรายวัน</span>
                  </div>
                  
                  <div className="space-y-1.5">
                    <select
                      value={selectedDailyDate}
                      onChange={(e) => setSelectedDailyDate(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 text-white rounded-xl px-3 py-2 text-xs font-bold focus:outline-none focus:border-red-500 cursor-pointer"
                    >
                      {availableDates.map(dateStr => {
                        const [y, m, d] = dateStr.split('-');
                        return (
                          <option key={dateStr} value={dateStr}>
                            วันที่ {d}/{m}/{y} (มีออเดอร์ในระบบ)
                          </option>
                        );
                      })}
                    </select>
                    <p className="text-[10px] text-slate-500">ระบบคัดรายชื่อเฉพาะวันที่พบออเดอร์จ่ายเงินในระบบ</p>
                  </div>

                  <button
                    onClick={() => executeSendNotification('Telegram', getDailyReportHTML(selectedDailyDate), 'รายงานยอดขายประจำวัน')}
                    disabled={isSending}
                    className="w-full py-2.5 bg-gradient-to-r from-sky-600 to-blue-600 hover:brightness-110 active:scale-95 text-white font-black rounded-xl text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>ส่งรายงานประจำวันเข้า Telegram ✈️</span>
                  </button>
                </div>

                {/* MONTHLY PERIOD PICKER */}
                <div className="bg-slate-950 p-4 rounded-2xl border border-slate-850 space-y-3">
                  <div className="flex items-center gap-1.5 text-slate-300">
                    <TrendingUp className="w-4 h-4 text-amber-500" />
                    <span className="text-xs font-bold">2. เลือกเดือนสรุปยอดประกอบการ</span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2">
                    <select
                      value={selectedMonth}
                      onChange={(e) => setSelectedMonth(Number(e.target.value))}
                      className="bg-slate-900 border border-slate-800 text-white rounded-xl px-3 py-2 text-xs font-bold focus:outline-none focus:border-red-500 cursor-pointer"
                    >
                      {THAI_MONTHS.map((m, idx) => (
                        <option key={m} value={idx}>{m}</option>
                      ))}
                    </select>
                    
                    <select
                      value={selectedYear}
                      onChange={(e) => setSelectedYear(Number(e.target.value))}
                      className="bg-slate-900 border border-slate-800 text-white rounded-xl px-3 py-2 text-xs font-bold focus:outline-none focus:border-red-500 cursor-pointer"
                    >
                      <option value={2026}>ปี 2569 CE</option>
                      <option value={2025}>ปี 2568 CE</option>
                    </select>
                  </div>

                  <button
                    onClick={() => executeSendNotification('Telegram', getMonthlyReportHTML(selectedYear, selectedMonth), 'รายงานยอดขายประจำเดือน')}
                    disabled={isSending}
                    className="w-full py-2.5 bg-gradient-to-r from-sky-600 to-blue-600 hover:brightness-110 active:scale-95 text-white font-black rounded-xl text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>ส่งยอดรายเดือนเข้า Telegram 📊</span>
                  </button>
                </div>

              </div>

              {/* Option to send via LINE OA if enabled */}
              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-850 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="space-y-0.5">
                  <span className="text-xs font-bold text-slate-200 block">หรือเลือกใช้ช่องทางสำรอง LINE OA Notify</span>
                  <p className="text-[10px] text-slate-500">ส่งข้อความรายงานปิดบิลเข้าแชทไลน์พนักงานเพื่อร่วมตรวจสอบยอด</p>
                </div>
                <div className="flex gap-2 w-full md:w-auto">
                  <button
                    onClick={() => executeSendNotification('LINE', getDailyReportHTML(selectedDailyDate), 'รายงานยอดขายประจำวัน')}
                    className="flex-1 md:flex-initial py-2 px-3.5 bg-emerald-700 hover:bg-emerald-600 active:scale-95 text-white font-bold rounded-lg text-[10px] transition-all flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <Send className="w-3 h-3" /> ส่งยอดวันเข้า LINE 🟢
                  </button>
                  <button
                    onClick={() => executeSendNotification('LINE', getMonthlyReportHTML(selectedYear, selectedMonth), 'รายงานยอดขายประจำเดือน')}
                    className="flex-1 md:flex-initial py-2 px-3.5 bg-emerald-700 hover:bg-emerald-600 active:scale-95 text-white font-bold rounded-lg text-[10px] transition-all flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <Send className="w-3 h-3" /> ส่งยอดเดือนเข้า LINE 🟢
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeSubTab === 'STOCK' && (
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-6 shadow-xl">
              <div className="border-b border-slate-850 pb-3 flex items-center justify-between">
                <div>
                  <h3 className="font-black text-white text-sm">การแจ้งเตือนพัสดุและคลังวัตถุดิบ (Stock Alerts)</h3>
                  <p className="text-[10px] text-slate-500">ตรวจสอบรายชื่อสินค้าต่ำกว่าเกณฑ์ และจัดยิงรายงานเข้าห้องแชทครอบครัว</p>
                </div>
                <ShieldAlert className="w-4.5 h-4.5 text-red-500" />
              </div>

              {/* Show actual low items */}
              <div className="space-y-3">
                <span className="text-[10px] font-black text-slate-400 block uppercase tracking-wider">วัตถุดิบวิกฤตต้องการการจัดซื้อ (Critical Items)</span>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {ingredients.filter(i => i.stock <= i.minStock).map(i => {
                    const pct = Math.min((i.stock / (i.minStock || 1)) * 100, 100);
                    return (
                      <div key={i.id} className="bg-slate-950 p-3 rounded-xl border border-slate-850 flex items-center justify-between gap-3 text-xs">
                        <div className="space-y-0.5">
                          <span className="font-bold text-slate-200 block">{i.name}</span>
                          <span className="text-[10px] text-slate-500 font-mono">คงเหลือ: <strong className="text-red-400 font-bold">{i.stock} {i.unit}</strong> / เตือนที่ {i.minStock}</span>
                        </div>
                        <div className="text-right">
                          <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                            i.stock <= 0 ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                          }`}>
                            {i.stock <= 0 ? 'หมดสต็อก' : 'สต็อกต่ำกว่าเกณฑ์'}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                  {ingredients.filter(i => i.stock <= i.minStock).length === 0 && (
                    <div className="col-span-2 p-5 bg-slate-950 rounded-xl text-center text-slate-500 text-xs">
                      🎉 ยินดีด้วย! วัตถุดิบทุกรายการยังปลอดภัย ไม่มีรายการใดต่ำกว่าเกณฑ์ขั้นต่ำ
                    </div>
                  )}
                </div>
              </div>

              {/* Direct Actions to shoot */}
              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-850 space-y-3">
                <span className="text-[10px] font-bold text-slate-400 block">กดทริกเกอร์แจ้งเตือนสต็อกวิกฤตสู่ภายนอกทันที (Trigger Alert Manual)</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    onClick={() => executeSendNotification('Telegram', getStockAlertHTML(), 'แจ้งเตือนสต็อก')}
                    className="py-2.5 bg-gradient-to-r from-sky-600 to-blue-600 hover:brightness-110 active:scale-95 text-white font-black rounded-xl text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>แจ้งภัยสต็อกเข้า Telegram ✈️</span>
                  </button>
                  <button
                    onClick={() => executeSendNotification('LINE', getStockAlertHTML(), 'แจ้งเตือนสต็อก')}
                    className="py-2.5 bg-emerald-700 hover:bg-emerald-600 active:scale-95 text-white font-black rounded-xl text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>แจ้งภัยสต็อกเข้า LINE OA 🟢</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeSubTab === 'EXPENSE_LOGS' && (
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-6 shadow-xl">
              <div className="border-b border-slate-850 pb-3 flex items-center justify-between">
                <div>
                  <h3 className="font-black text-white text-sm">การแจ้งเตือนการลงบันทึกรายจ่าย (Expense Notifications)</h3>
                  <p className="text-[10px] text-slate-500">กดส่งแจ้งเตือนบันทึกรายจ่ายร้านล่าสุด เพื่อให้ทีมผู้บริหารรับทราบความเคลื่อนไหว</p>
                </div>
                <Layers className="w-4.5 h-4.5 text-red-400" />
              </div>

              {/* List of 2 recent expenses */}
              <div className="space-y-3">
                <span className="text-[10px] font-black text-slate-400 block uppercase tracking-wider">รายจ่ายล่าสุดที่บันทึกเข้าระบบ (Recent Expenses)</span>
                
                <div className="space-y-2">
                  {expenses.slice(0, 3).map(exp => (
                    <div key={exp.id} className="bg-slate-950 p-4 rounded-xl border border-slate-850 flex items-center justify-between gap-4 text-xs">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-bold text-slate-200">{exp.description}</span>
                          <span className="text-[9px] bg-red-500/10 text-red-400 border border-red-500/20 px-1.5 py-0.2 rounded font-mono font-bold">
                            {exp.category}
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-500 block">วันที่บันทึก: {exp.date}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <strong className="text-white text-sm">{exp.amount.toLocaleString()} ฿</strong>
                        <button
                          onClick={() => executeSendNotification('Telegram', getExpenseAlertHTML(exp), 'บันทึกค่าใช้จ่าย')}
                          className="p-1.5 bg-sky-600/10 hover:bg-sky-500 hover:text-white text-sky-400 border border-sky-500/20 rounded-lg transition-all"
                          title="กดแชร์เข้าระบบ Telegram"
                        >
                          <Send className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                  {expenses.length === 0 && (
                    <div className="p-5 bg-slate-950 rounded-xl text-center text-slate-500 text-xs">
                      ไม่มีรายการรายจ่ายบันทึกในระบบในขณะนี้
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

      </div>
    </div>
  );
}
