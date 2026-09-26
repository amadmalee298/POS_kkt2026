import React, { useState, useEffect } from 'react';
import { MenuItem, Recipe, Ingredient, Promotion, Order, StoreSettings } from '../types';
import { 
  QrCode, Copy, ExternalLink, Settings, Check, X, 
  Smartphone, Trash, Printer, Info, Clock, AlertCircle, Play, Sparkles,
  Edit2
} from 'lucide-react';
import QRClientOrder from './QRClientOrder';

interface QROrderingProps {
  orders: Order[];
  menuItems: MenuItem[];
  recipes: Recipe[];
  ingredients: Ingredient[];
  promotions: Promotion[];
  storeSettings: StoreSettings;
  onUpdateIngredients: (updated: Ingredient[]) => void;
  onOrderCompleted: (newOrder: Order, updatedIngredients: Ingredient[]) => void;
  onUpdateKitchenStatus: (orderId: string, newStatus: 'PENDING' | 'COOKING' | 'READY' | 'SERVED') => void;
  onUpdateOrdersList: (updatedOrders: Order[]) => void;
  currency: string;
}

interface QRDownloadHistoryItem {
  id: string;
  tableNo: string;
  theme: 'CORAL' | 'GOLD' | 'MINT';
  showLogo: boolean;
  timestamp: string;
}

export default function QROrdering({
  orders,
  menuItems,
  recipes,
  ingredients,
  promotions,
  storeSettings,
  onUpdateIngredients,
  onOrderCompleted,
  onUpdateKitchenStatus,
  onUpdateOrdersList,
  currency
}: QROrderingProps) {
  // Local states
  const [selectedTable, setSelectedTable] = useState<string>('5');
  const [tablesList, setTablesList] = useState<string[]>(() => {
    const saved = localStorage.getItem('qr_tables_list');
    return saved ? JSON.parse(saved) : ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '12', '14', '15'];
  });
  const [newTableNo, setNewTableNo] = useState<string>('');
  const [isEditMode, setIsEditMode] = useState<boolean>(false);

  // Custom dialog and toast states to bypass iframe blockages
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [modalAlertMessage, setModalAlertMessage] = useState<string | null>(null);
  const [editTableOldName, setEditTableOldName] = useState<string | null>(null);
  const [editTableNewName, setEditTableNewName] = useState<string>('');
  const [deleteTableConfirm, setDeleteTableConfirm] = useState<string | null>(null);

  const triggerAlert = (message: string) => {
    setModalAlertMessage(message);
  };

  const triggerToast = (message: string) => {
    setToastMessage(message);
  };

  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => {
        setToastMessage(null);
      }, 3500);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);
  
  // Settings
  const [autoApprove, setAutoApprove] = useState<boolean>(() => {
    return localStorage.getItem('qr_auto_approve') === 'true';
  });

  // Simulator Toggle
  const [showSimulator, setShowSimulator] = useState<boolean>(true);

  // QR Customizer & Branding states
  const [qrTheme, setQrTheme] = useState<'CORAL' | 'GOLD' | 'MINT'>('CORAL');
  const [showLogo, setShowLogo] = useState<boolean>(true);
  const [downloadHistory, setDownloadHistory] = useState<QRDownloadHistoryItem[]>(() => {
    const saved = localStorage.getItem('kp_qr_download_history');
    return saved ? JSON.parse(saved) : [];
  });

  const handleDownloadQR = (table: string) => {
    const newRecord = {
      id: `DL-${Date.now()}`,
      tableNo: table,
      theme: qrTheme,
      showLogo: showLogo,
      timestamp: new Date().toISOString()
    };
    const updatedHistory = [newRecord, ...downloadHistory];
    setDownloadHistory(updatedHistory);
    localStorage.setItem('kp_qr_download_history', JSON.stringify(updatedHistory));

    // Force download download
    const url = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(getTableUrl(table))}`;
    window.open(url, '_blank');
    triggerToast(`📥 เริ่มดาวน์โหลดโค้ดโต๊ะ ${table} (ธีม ${qrTheme}) แล้ว! บันทึกในประวัติการพิมพ์เรียบร้อย`);
  };

  const handleClearHistory = () => {
    setDownloadHistory([]);
    localStorage.removeItem('kp_qr_download_history');
    triggerToast('🗑️ ล้างประวัติการดาวน์โหลดเรียบร้อยแล้ว');
  };

  // Link generation
  const getTableUrl = (table: string) => {
    const origin = window.location.origin;
    const pathname = window.location.pathname;
    return `${origin}${pathname}?table=${table}`;
  };

  const handleCopyLink = (table: string) => {
    const url = getTableUrl(table);
    navigator.clipboard.writeText(url);
    triggerToast(`คัดลอกลิงก์ของโต๊ะ ${table} สำเร็จ!`);
  };

  // Sync autoApprove state with localstorage
  const handleToggleAutoApprove = () => {
    const newVal = !autoApprove;
    setAutoApprove(newVal);
    localStorage.setItem('qr_auto_approve', String(newVal));
    triggerAlert(newVal 
      ? 'เปิดการอนุมัติออเดอร์อัตโนมัติ: รายการสั่งซื้อของลูกค้าจะส่งเข้าครัว (KDS) ทันทีโดยไม่ต้องให้แคชเชียร์กดยืนยัน'
      : 'ปิดระบบอนุมัติอัตโนมัติ: ออเดอร์ของลูกค้าจะต้องได้รับการพิจารณาและอนุมัติโดยพนักงานก่อนส่งเข้าห้องครัว'
    );
  };

  // Add custom table
  const handleAddTable = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newTableNo.trim();
    if (!trimmed) return;
    if (tablesList.includes(trimmed)) {
      triggerAlert('มีโต๊ะชื่อนี้อยู่แล้วในระบบ');
      return;
    }
    
    const newList = [...tablesList, trimmed].sort((a, b) => {
      const numA = parseInt(a, 10);
      const numB = parseInt(b, 10);
      if (!isNaN(numA) && !isNaN(numB)) {
        return numA - numB;
      }
      return a.localeCompare(b, 'th', { numeric: true });
    });
    
    setTablesList(newList);
    localStorage.setItem('qr_tables_list', JSON.stringify(newList));
    setSelectedTable(trimmed);
    setNewTableNo('');
    triggerToast(`เพิ่มโต๊ะ "${trimmed}" เรียบร้อยแล้ว`);
  };

  // Open edit modal
  const handleEditTableStart = (oldTable: string) => {
    setEditTableOldName(oldTable);
    setEditTableNewName(oldTable);
  };

  // Submit edit table name
  const handleEditTableSubmit = () => {
    if (!editTableOldName) return;
    const trimmed = editTableNewName.trim();
    if (!trimmed) {
      triggerAlert('ชื่อโต๊ะไม่สามารถเป็นค่าว่างได้');
      return;
    }
    if (trimmed === editTableOldName) {
      setEditTableOldName(null);
      return;
    }
    if (tablesList.includes(trimmed)) {
      triggerAlert('มีโต๊ะชื่อนี้อยู่แล้วในระบบ');
      return;
    }
    
    const newList = tablesList.map(t => t === editTableOldName ? trimmed : t);
    setTablesList(newList);
    localStorage.setItem('qr_tables_list', JSON.stringify(newList));
    if (selectedTable === editTableOldName) {
      setSelectedTable(trimmed);
    }
    setEditTableOldName(null);
    triggerToast(`เปลี่ยนชื่อโต๊ะ "${editTableOldName}" เป็น "${trimmed}" เรียบร้อยแล้ว`);
  };

  // Open delete confirm modal
  const handleRemoveTableStart = (table: string) => {
    setDeleteTableConfirm(table);
  };

  // Confirm delete table
  const handleRemoveTableSubmit = () => {
    if (!deleteTableConfirm) return;
    const newList = tablesList.filter(t => t !== deleteTableConfirm);
    setTablesList(newList);
    localStorage.setItem('qr_tables_list', JSON.stringify(newList));
    if (selectedTable === deleteTableConfirm) {
      setSelectedTable(newList[0] || '1');
    }
    const removedTable = deleteTableConfirm;
    setDeleteTableConfirm(null);
    triggerToast(`ลบโต๊ะ "${removedTable}" เรียบร้อยแล้ว`);
  };

  // Approve pending QR order
  const handleApproveOrder = (order: Order) => {
    const updatedOrders = orders.map(o => {
      if (o.id === order.id) {
        return {
          ...o,
          qrStatus: 'APPROVED' as const,
          kitchenStatus: 'PENDING' as const // sent to kitchen
        };
      }
      return o;
    });

    onUpdateOrdersList(updatedOrders);
    alert(`อนุมัติออเดอร์ ${order.id} ส่งเข้าหน้าครัวเรียบร้อยแล้ว!`);
  };

  // Reject pending QR order
  const handleRejectOrder = (order: Order) => {
    const reason = prompt('ระบุเหตุผลในการปฏิเสธออเดอร์นี้ (เช่น วัตถุดิบกะเพราหมด):', 'วัตถุดิบหมดชั่วคราว');
    if (reason === null) return; // cancelled prompt

    const updatedOrders = orders.map(o => {
      if (o.id === order.id) {
        return {
          ...o,
          qrStatus: 'REJECTED' as const,
          kitchenStatus: 'SERVED' as const // remove from active kitchen
        };
      }
      return o;
    });

    onUpdateOrdersList(updatedOrders);
    alert(`ปฏิเสธออเดอร์ ${order.id} สำเร็จ ส่งการแจ้งเตือนกลับหาลูกค้าแล้ว`);
  };

  // Filter QR orders
  const pendingQROrders = orders.filter(o => o.isQROrder && o.qrStatus === 'PENDING_APPROVE');
  const approvedQROrders = orders.filter(o => o.isQROrder && o.qrStatus === 'APPROVED');

  return (
    <div className="space-y-6 text-slate-100 font-sans">
      {/* Top Title Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900 p-5 rounded-2xl border border-slate-850 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-tr from-red-600 to-amber-600 p-2.5 rounded-xl text-white shadow-md">
            <QrCode className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-base font-extrabold text-white tracking-tight flex items-center gap-1.5">
              ระบบสแกนสั่งอาหารผ่านคิวอาร์โค้ด <span className="bg-red-500 text-white font-bold text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider animate-pulse">Enterprise</span>
            </h2>
            <p className="text-xs text-slate-400 mt-1">สร้างคิวอาร์โค้ดประจำโต๊ะ, ตรวจรับออเดอร์เรียลไทม์ และจำลองหน้าจอฝั่งมือถือลูกค้า</p>
          </div>
        </div>

        {/* Global Settings */}
        <div className="flex flex-wrap items-center gap-3 border-t md:border-t-0 border-slate-800 pt-3 md:pt-0">
          <div className="flex items-center gap-2 bg-slate-950 px-3.5 py-2 rounded-xl border border-slate-800">
            <span className="text-xs font-semibold text-slate-300">อนุมัติอัตโนมัติ (Auto-Approve):</span>
            <button
              onClick={handleToggleAutoApprove}
              className={`p-1 rounded-full transition-colors duration-200 focus:outline-none ${
                autoApprove ? 'text-red-500' : 'text-slate-500'
              }`}
            >
              <div className={`w-9 h-5 rounded-full p-0.5 transition-colors duration-200 ${autoApprove ? 'bg-red-600' : 'bg-slate-800'}`}>
                <div className={`w-4 h-4 rounded-full bg-white transition-transform duration-200 transform ${autoApprove ? 'translate-x-4' : 'translate-x-0'}`} />
              </div>
            </button>
          </div>

          <button
            onClick={() => setShowSimulator(prev => !prev)}
            className={`px-4 py-2 rounded-xl text-xs font-bold border flex items-center gap-2 transition-all ${
              showSimulator 
                ? 'bg-red-600/10 border-red-500/30 text-red-400' 
                : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            <Smartphone className="w-4 h-4" />
            {showSimulator ? 'ซ่อนหน้าจอมือถือจำลอง' : 'แสดงมือถือจำลองของลูกค้า'}
          </button>
        </div>
      </div>

      <div className={`grid grid-cols-1 ${showSimulator ? 'lg:grid-cols-12' : 'lg:grid-cols-3'} gap-6`}>
        
        {/* COLUMN 1: QR Generator & Tables List */}
        <div className={`${showSimulator ? 'lg:col-span-4' : 'lg:col-span-1'} space-y-6`}>
          
          {/* Active Table QR Generator */}
          <div className="bg-slate-900 border border-slate-850 rounded-2xl p-5 shadow-lg space-y-4">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-850 pb-3">
              <QrCode className="w-4 h-4 text-red-500" /> แท่นคิวอาร์โค้ดประจำโต๊ะ {selectedTable}
            </h3>

            {/* Dynamic Print Stand Card Preview */}
            {(() => {
              const cardStyles = {
                CORAL: {
                  bg: "bg-white text-slate-900 border border-slate-200",
                  topBar: "bg-gradient-to-r from-red-600 to-amber-600",
                  badgeText: "text-red-600",
                  mainText: "text-[#0f172a]",
                  subText: "text-slate-500",
                  qrBg: "bg-slate-50 border-slate-100"
                },
                GOLD: {
                  bg: "bg-slate-950 text-slate-200 border border-[#D4AF37]/40",
                  topBar: "bg-gradient-to-r from-[#D4AF37] to-[#AA7C11]",
                  badgeText: "text-[#D4AF37] font-black",
                  mainText: "text-white font-extrabold",
                  subText: "text-slate-400",
                  qrBg: "bg-[#0b1321] border-[#D4AF37]/20"
                },
                MINT: {
                  bg: "bg-[#0B131E] text-emerald-100 border border-emerald-500/40",
                  topBar: "bg-gradient-to-r from-emerald-500 to-teal-500",
                  badgeText: "text-emerald-400",
                  mainText: "text-emerald-300",
                  subText: "text-slate-400",
                  qrBg: "bg-[#070b12] border-emerald-500/20"
                }
              }[qrTheme];

              return (
                <div className={`${cardStyles.bg} p-5 rounded-xl shadow-md flex flex-col items-center text-center space-y-3 relative overflow-hidden transition-all duration-300`}>
                  <div className={`absolute top-0 inset-x-0 h-2 ${cardStyles.topBar}`} />
                  
                  <div className="text-center space-y-0.5">
                    <p className={`text-[9px] font-black tracking-widest ${cardStyles.badgeText} uppercase font-sans`}>WELCOME TO</p>
                    <h4 className={`font-extrabold text-sm tracking-tight ${cardStyles.mainText} font-sans`}>ครัวกะเพราโคตรกรอบ</h4>
                    <p className={`text-[8px] ${cardStyles.subText}`}>อาหารปรุงสดใหม่ รวดเร็ว คัดสรรคุณภาพ</p>
                  </div>

                  {/* QR Code fetched dynamically */}
                  <div className={`p-2.5 rounded-lg border ${cardStyles.qrBg} flex items-center justify-center relative`}>
                    <img 
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(getTableUrl(selectedTable))}`}
                      alt={`QR Table ${selectedTable}`}
                      className="w-32 h-32 object-contain"
                      referrerPolicy="no-referrer"
                    />
                    {showLogo && (
                      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white p-1 rounded-full border border-slate-200 shadow-md flex items-center justify-center w-8 h-8 select-none">
                        <span className="text-red-600 font-extrabold text-xs">🍳</span>
                      </div>
                    )}
                  </div>

                  <div className="space-y-1">
                    <span className={`block text-[10px] ${cardStyles.subText} uppercase font-bold tracking-widest`}>TABLE NUMBER</span>
                    <span className={`text-2xl font-black ${cardStyles.mainText} tracking-tight font-mono`}>โต๊ะที่ {selectedTable}</span>
                  </div>

                  <div className="border-t border-slate-800/10 pt-3 w-full space-y-1">
                    <p className={`text-[9px] font-bold ${cardStyles.badgeText}`}>Scan QR Code to Order!</p>
                    <p className={`text-[8px] ${cardStyles.subText}`}>สแกนโค้ดเพื่อเข้าดูเมนูอาหาร เลือกความเผ็ด ไข่ดาว และส่งออเดอร์เข้าห้องครัวได้ทันที</p>
                  </div>
                </div>
              );
            })()}

            {/* Branding Style Customizer Options */}
            <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-850 space-y-3">
              <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">🎨 เลือกรูปแบบและแบรนดิ้ง (Branding Style)</span>
              
              <div className="grid grid-cols-3 gap-1.5">
                <button
                  type="button"
                  onClick={() => setQrTheme('CORAL')}
                  className={`py-1.5 rounded-lg border text-[9px] font-bold transition-all ${
                    qrTheme === 'CORAL'
                      ? 'bg-red-950/40 text-red-400 border-red-500/50 shadow'
                      : 'bg-slate-900 text-slate-400 border-transparent hover:text-slate-300'
                  }`}
                >
                  🔴 Coral
                </button>
                <button
                  type="button"
                  onClick={() => setQrTheme('GOLD')}
                  className={`py-1.5 rounded-lg border text-[9px] font-bold transition-all ${
                    qrTheme === 'GOLD'
                      ? 'bg-amber-950/40 text-[#D4AF37] border-amber-500/50 shadow'
                      : 'bg-slate-900 text-slate-400 border-transparent hover:text-slate-300'
                  }`}
                >
                  👑 Royal Gold
                </button>
                <button
                  type="button"
                  onClick={() => setQrTheme('MINT')}
                  className={`py-1.5 rounded-lg border text-[9px] font-bold transition-all ${
                    qrTheme === 'MINT'
                      ? 'bg-emerald-950/40 text-emerald-400 border-emerald-500/50 shadow'
                      : 'bg-slate-900 text-slate-400 border-transparent hover:text-slate-300'
                  }`}
                >
                  🟢 Mint Green
                </button>
              </div>

              {/* Logo Overlay Toggle */}
              <div className="flex items-center justify-between border-t border-slate-850 pt-2 text-xs">
                <span className="text-slate-300 text-[10px]">ใส่โลโก้กลางคิวอาร์โค้ด:</span>
                <button
                  type="button"
                  onClick={() => setShowLogo(!showLogo)}
                  className={`px-2 py-0.5 rounded border transition-all text-[9px] font-bold ${
                    showLogo
                      ? 'bg-emerald-950 text-emerald-400 border-emerald-500/30'
                      : 'bg-slate-900 text-slate-500 border-slate-800'
                  }`}
                >
                  {showLogo ? '🍳 เปิดโลโก้' : 'ปิดโลโก้'}
                </button>
              </div>
            </div>

            {/* Actions for Table Link */}
            <div className="space-y-2">
              <span className="text-[9px] text-slate-500 font-mono block truncate bg-slate-950 p-2 rounded border border-slate-850">
                {getTableUrl(selectedTable)}
              </span>
              
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => handleCopyLink(selectedTable)}
                  className="py-2 bg-slate-950 hover:bg-slate-800 text-slate-200 border border-slate-850 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all"
                >
                  <Copy className="w-3 h-3" /> คัดลอกลิงก์
                </button>
                <a
                  href={getTableUrl(selectedTable)}
                  target="_blank"
                  rel="noreferrer"
                  className="py-2 bg-slate-950 hover:bg-slate-800 text-slate-200 border border-slate-850 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all"
                >
                  <ExternalLink className="w-3 h-3" /> เปิดแท็บใหม่
                </a>
              </div>

              <button
                onClick={() => handleDownloadQR(selectedTable)}
                className="w-full py-2.5 bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-500 hover:to-amber-500 text-white rounded-xl text-xs font-extrabold flex items-center justify-center gap-2 transition-all shadow-md active:scale-95"
              >
                📥 ดาวน์โหลดโค้ด / บันทึกประวัติ
              </button>
            </div>
          </div>

          {/* Download History list */}
          <div className="bg-slate-900 border border-slate-850 rounded-2xl p-5 shadow-lg space-y-4">
            <div className="flex justify-between items-center border-b border-slate-850 pb-3">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-red-500" /> ประวัติการพิมพ์ป้ายตั้งโต๊ะ ({downloadHistory.length})
              </h3>
              {downloadHistory.length > 0 && (
                <button
                  onClick={handleClearHistory}
                  className="text-[9px] text-red-400 hover:text-red-300 font-extrabold uppercase tracking-wider"
                >
                  ล้างประวัติ
                </button>
              )}
            </div>

            {downloadHistory.length === 0 ? (
              <div className="py-6 text-center text-slate-500 text-xs">
                <Info className="w-5 h-5 mx-auto text-slate-700 mb-1" />
                ยังไม่มีการบันทึกประวัติการดาวน์โหลดป้าย
              </div>
            ) : (
              <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                {downloadHistory.map((item) => (
                  <div key={item.id} className="bg-slate-950 p-2 rounded-xl border border-slate-850 flex items-center justify-between text-[11px]">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-1.5">
                        <span className="font-extrabold text-white">โต๊ะที่ {item.tableNo}</span>
                        <span className={`text-[8px] px-1 py-0.2 rounded font-bold uppercase ${
                          item.theme === 'CORAL' 
                            ? 'bg-red-950 text-red-400' 
                            : item.theme === 'GOLD' 
                              ? 'bg-amber-950 text-[#D4AF37]' 
                              : 'bg-emerald-950 text-emerald-400'
                        }`}>
                          {item.theme}
                        </span>
                      </div>
                      <span className="text-[9px] text-slate-500 font-mono">
                        {new Date(item.timestamp).toLocaleString('th-TH')}
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-400 font-medium">
                      {item.showLogo ? '🍳 มีโลโก้' : 'ไม่มีโลโก้'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

                  {/* Manage Tables List */}
          <div className="bg-slate-900 border border-slate-850 rounded-2xl p-5 shadow-lg space-y-4">
            <div className="flex items-center justify-between border-b border-slate-850 pb-3">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex flex-col">
                <span>รายการโต๊ะอาหารทั้งหมด ({tablesList.length})</span>
                <span className="text-[9px] text-slate-500 font-normal mt-0.5">คลิกเลือกเพื่อดูคิวอาร์โค้ด</span>
              </h3>
              
              <button
                type="button"
                onClick={() => setIsEditMode(!isEditMode)}
                className={`text-[10px] px-2.5 py-1.5 rounded-lg border font-bold transition-all flex items-center gap-1 cursor-pointer ${
                  isEditMode 
                    ? 'bg-amber-500/10 text-amber-400 border-amber-500/30 hover:bg-amber-500/20' 
                    : 'bg-slate-950 text-slate-400 border-slate-850 hover:text-white hover:bg-slate-850'
                }`}
              >
                <Settings className="w-3 h-3" /> {isEditMode ? 'เสร็จสิ้นการจัดโต๊ะ' : 'โหมดจัดการ (แก้ไข/ลบ)'}
              </button>
            </div>

            {/* Quick add Table Form */}
            <form onSubmit={handleAddTable} className="flex gap-2">
              <input
                type="text"
                placeholder="พิมพ์ชื่อโต๊ะใหม่... (เช่น 15, VIP-1, บาร์)"
                value={newTableNo}
                onChange={(e) => setNewTableNo(e.target.value)}
                className="flex-1 bg-slate-950 border border-slate-800 text-white px-3 py-2 rounded-xl text-xs focus:outline-none focus:border-red-500"
              />
              <button
                type="submit"
                className="bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-200 px-3 py-2 rounded-xl text-xs font-bold transition-all"
              >
                เพิ่มโต๊ะ +
              </button>
            </form>

            {/* Table Grid list */}
            <div className={`grid ${isEditMode ? 'grid-cols-2' : 'grid-cols-4'} gap-2 max-h-48 overflow-y-auto pr-1`}>
              {tablesList.map(t => (
                <div key={t} className="relative group">
                  <div
                    onClick={() => setSelectedTable(t)}
                    className={`w-full py-2.5 px-2 rounded-xl font-bold text-xs flex items-center justify-between transition-all cursor-pointer border ${
                      selectedTable === t
                        ? 'bg-gradient-to-tr from-red-600 to-amber-600 text-white shadow-md border-transparent'
                        : 'bg-slate-950 hover:bg-slate-850 border border-slate-850 text-slate-400 hover:text-white'
                    }`}
                  >
                    <div className="flex flex-col items-start min-w-0 flex-1">
                      <span className={`text-[8px] font-sans font-medium uppercase block ${selectedTable === t ? 'text-white/70' : 'text-slate-500'}`}>T-No</span>
                      <span className="text-xs font-extrabold font-sans truncate w-full">{t}</span>
                    </div>

                    {isEditMode ? (
                      <div className="flex items-center gap-1 pl-1">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEditTableStart(t);
                          }}
                          className={`p-1 rounded-md transition-colors ${
                            selectedTable === t 
                              ? 'bg-white/20 hover:bg-white/30 text-white' 
                              : 'bg-slate-900 hover:bg-slate-800 text-amber-500 border border-slate-800'
                          }`}
                          title="แก้ไขชื่อโต๊ะ"
                        >
                          <Edit2 className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveTableStart(t);
                          }}
                          className={`p-1 rounded-md transition-colors ${
                            selectedTable === t 
                              ? 'bg-white/20 hover:bg-white/30 text-white' 
                              : 'bg-slate-900 hover:bg-slate-800 text-red-500 border border-slate-800'
                          }`}
                          title="ลบโต๊ะ"
                        >
                          <Trash className="w-3 h-3" />
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveTableStart(t);
                        }}
                        className="absolute -top-1 -right-1 bg-red-600 hover:bg-red-500 text-white rounded-full p-0.5 border border-slate-900 hidden group-hover:block transition-all"
                      >
                        <X className="w-2.5 h-2.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* COLUMN 2: Live Pending QR Orders Approval Board */}
        <div className={`${showSimulator ? 'lg:col-span-4' : 'lg:col-span-2'} space-y-6`}>
          
          {/* Pending Approval Queue */}
          <div className="bg-slate-900 border border-slate-850 rounded-2xl p-5 shadow-lg space-y-4 flex flex-col min-h-[22rem]">
            <div className="flex justify-between items-center border-b border-slate-850 pb-3 flex-shrink-0">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-amber-500" /> ตรวจรับคิวอาร์ออเดอร์ ({pendingQROrders.length})
              </h3>
              {autoApprove && (
                <span className="bg-emerald-500/10 text-emerald-400 text-[10px] font-bold px-2.5 py-0.5 rounded-full border border-emerald-500/20">
                  Auto-Approve เปิดใช้งานอยู่
                </span>
              )}
            </div>

            {pendingQROrders.length === 0 ? (
              <div className="flex-1 flex flex-col justify-center items-center text-center py-12 text-slate-500 space-y-3">
                <QrCode className="w-10 h-10 text-slate-700 animate-pulse" />
                <div>
                  <p className="text-xs font-bold text-slate-400">ยังไม่มีออเดอร์ค้างสแกนเข้ามา</p>
                  <p className="text-[10px] text-slate-600 mt-1">ออเดอร์ที่ถูกสั่งซื้อจากลูกค้าจะปรากฏตรงนี้เพื่อให้พนักงานยืนยัน</p>
                </div>
              </div>
            ) : (
              <div className="space-y-3 max-h-[30rem] overflow-y-auto pr-1 flex-1">
                {pendingQROrders.map(order => (
                  <div key={order.id} className="bg-slate-950 p-4 rounded-xl border border-amber-500/20 shadow space-y-3 relative overflow-hidden animate-pulse-border">
                    <div className="absolute top-0 left-0 bottom-0 w-1 bg-amber-500" />
                    
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="bg-amber-600 text-white font-extrabold text-[9px] px-1.5 py-0.5 rounded">QR ORDER</span>
                          <span className="text-xs font-black text-white font-mono">{order.id}</span>
                        </div>
                        <p className="text-[10px] text-slate-500 mt-1 font-semibold">
                          สั่งเมื่อ: {new Date(order.timestamp).toLocaleTimeString('th-TH')} • โต๊ะ {order.tableNo}
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] text-slate-500 block">ยอดรวมทั้งสิ้น</span>
                        <span className="text-sm font-extrabold text-amber-400 font-mono">{order.total}฿</span>
                      </div>
                    </div>

                    {/* Order items lists */}
                    <div className="border-y border-slate-900 py-2 space-y-1">
                      {order.items.map((item, idx) => (
                        <div key={idx} className="flex justify-between text-xs text-slate-400">
                          <span className="font-medium text-slate-300">
                            x{item.quantity} {item.name}
                            {item.addFriedEgg && <span className="text-[10px] text-amber-500 font-bold ml-1.5">+ไข่ดาว</span>}
                            {item.notes && <span className="text-[9px] text-slate-500 italic block">({item.notes})</span>}
                          </span>
                          <span className="font-mono">{(item.price + item.eggPrice) * item.quantity}฿</span>
                        </div>
                      ))}
                    </div>

                    {/* Actions buttons */}
                    <div className="flex gap-2 justify-end pt-1">
                      <button
                        onClick={() => handleRejectOrder(order)}
                        className="px-3 py-1.5 bg-red-600/10 hover:bg-red-600/20 text-red-400 border border-red-500/15 rounded-lg text-xs font-bold transition-all flex items-center gap-1"
                      >
                        <X className="w-3.5 h-3.5" /> ปฏิเสธ
                      </button>
                      <button
                        onClick={() => handleApproveOrder(order)}
                        className="px-4 py-1.5 bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-500 hover:to-amber-500 text-white rounded-lg text-xs font-bold shadow transition-all flex items-center gap-1"
                      >
                        <Check className="w-3.5 h-3.5" /> อนุมัติส่งครัว
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Active approved table orders with tracking stats */}
          <div className="bg-slate-900 border border-slate-850 rounded-2xl p-5 shadow-lg space-y-4">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-850 pb-3">
              <Play className="w-4 h-4 text-emerald-500 animate-pulse" /> ออเดอร์คิวอาร์ที่อนุมัติแล้ว ({approvedQROrders.length})
            </h3>

            {approvedQROrders.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-6">ไม่มีออเดอร์คิวอาร์ที่กำลังปรุง</p>
            ) : (
              <div className="grid grid-cols-1 gap-2 max-h-56 overflow-y-auto pr-1">
                {approvedQROrders.map(order => (
                  <div key={order.id} className="bg-slate-950 p-3 rounded-xl border border-slate-850 flex justify-between items-center text-xs">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-white font-mono">{order.id}</span>
                        <span className="text-[10px] text-slate-400">โต๊ะ {order.tableNo}</span>
                      </div>
                      <p className="text-[9px] text-slate-500 mt-0.5">รวม {order.items.reduce((s, i) => s + i.quantity, 0)} จาน • {order.total}฿</p>
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Kitchen Status badges */}
                      <span className={`px-2 py-1 rounded text-[10px] font-bold ${
                        order.kitchenStatus === 'PENDING' ? 'bg-blue-600/10 text-blue-400 border border-blue-500/10' :
                        order.kitchenStatus === 'COOKING' ? 'bg-red-600/10 text-red-400 border border-red-500/10 animate-pulse' :
                        order.kitchenStatus === 'READY' ? 'bg-amber-600/10 text-amber-400 border border-amber-500/10' :
                        'bg-emerald-600/10 text-emerald-400 border border-emerald-500/10'
                      }`}>
                        {order.kitchenStatus === 'PENDING' ? 'ห้องครัวรับแล้ว' :
                         order.kitchenStatus === 'COOKING' ? 'กำลังปรุงอาหาร' :
                         order.kitchenStatus === 'READY' ? 'อาหารปรุงเสร็จ' : 'เสิร์ฟเรียบร้อย'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

        {/* COLUMN 3: Simulated customer mobile screen */}
        {showSimulator && (
          <div className="lg:col-span-4 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                <Smartphone className="w-4 h-4 text-red-500 animate-bounce" /> หน้าจำลองลูกค้าสแกนโต๊ะ {selectedTable}
              </span>
              <span className="text-[10px] text-slate-500">จำลองการทดสอบ</span>
            </div>

            {/* Smartphone frame container */}
            <div className="relative mx-auto w-full max-w-[340px] aspect-[9/18.5] bg-slate-900 rounded-[40px] p-2.5 border-[6px] border-slate-800 shadow-2xl flex flex-col overflow-hidden">
              {/* Speaker & camera slot */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 h-5 w-24 bg-slate-800 rounded-b-2xl z-50 flex items-center justify-center">
                <div className="w-10 h-1 bg-slate-900 rounded-full" />
                <div className="w-2 h-2 bg-slate-900 rounded-full ml-2" />
              </div>

              {/* Simulated Inner Client Webpage */}
              <div className="flex-1 w-full h-full rounded-[30px] overflow-hidden bg-slate-950 flex flex-col relative">
                <QRClientOrder 
                  tableNo={selectedTable}
                  menuItems={menuItems}
                  recipes={recipes}
                  ingredients={ingredients}
                  promotions={promotions}
                  storeSettings={storeSettings}
                  onOrderCompleted={onOrderCompleted}
                  orders={orders}
                />
              </div>
            </div>
          </div>
        )}

      </div>

      {/* Custom Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 bg-slate-900 border border-slate-800 text-slate-100 px-4 py-3 rounded-xl shadow-2xl flex items-center gap-3 animate-bounce max-w-sm">
          <div className="bg-emerald-500/20 text-emerald-400 p-1 rounded-full shrink-0">
            <Check className="w-4 h-4" />
          </div>
          <p className="text-xs font-bold">{toastMessage}</p>
          <button 
            onClick={() => setToastMessage(null)}
            className="text-slate-500 hover:text-slate-300 ml-1 cursor-pointer shrink-0"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Custom Alert Modal */}
      {modalAlertMessage && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-800 max-w-sm w-full rounded-2xl p-6 shadow-2xl space-y-4 text-center animate-in fade-in zoom-in-95 duration-200">
            <div className="mx-auto w-12 h-12 bg-amber-500/15 text-amber-400 rounded-full flex items-center justify-center">
              <Info className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-slate-200">แจ้งเตือนระบบ</h4>
              <p className="text-xs text-slate-400 leading-relaxed">{modalAlertMessage}</p>
            </div>
            <button
              onClick={() => setModalAlertMessage(null)}
              className="w-full bg-slate-100 hover:bg-white text-slate-950 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer"
            >
              ตกลง
            </button>
          </div>
        </div>
      )}

      {/* Custom Edit Table Modal */}
      {editTableOldName && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-800 max-w-sm w-full rounded-2xl p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3 border-b border-slate-800 pb-3">
              <div className="bg-amber-500/20 text-amber-400 p-1.5 rounded-lg">
                <Edit2 className="w-4 h-4" />
              </div>
              <h4 className="text-sm font-bold text-slate-100">แก้ไขชื่อโต๊ะอาหาร</h4>
            </div>
            
            <div className="space-y-2">
              <label className="text-[11px] text-slate-400 font-medium block">
                แก้ไขชื่อโต๊ะ <span className="font-bold text-white font-mono bg-slate-950 px-1.5 py-0.5 rounded border border-slate-850">"{editTableOldName}"</span> เป็นชื่อใหม่:
              </label>
              <input
                type="text"
                value={editTableNewName}
                onChange={(e) => setEditTableNewName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 text-white px-3 py-2.5 rounded-xl text-xs focus:outline-none focus:border-amber-500"
                placeholder="ชื่อโต๊ะใหม่..."
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleEditTableSubmit();
                  }
                }}
              />
            </div>
            
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEditTableOldName(null)}
                className="flex-1 bg-slate-950 hover:bg-slate-850 border border-slate-800 text-slate-400 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleEditTableSubmit}
                className="flex-1 bg-amber-500 hover:bg-amber-400 text-slate-950 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                บันทึกการแก้ไข
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Confirm Delete Table Modal */}
      {deleteTableConfirm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-800 max-w-sm w-full rounded-2xl p-6 shadow-2xl space-y-4 text-center animate-in fade-in zoom-in-95 duration-200">
            <div className="mx-auto w-12 h-12 bg-red-500/15 text-red-400 rounded-full flex items-center justify-center">
              <Trash className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-slate-200">ยืนยันการลบโต๊ะอาหาร</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                คุณแน่ใจหรือไม่ว่าต้องการลบสิทธิ์คิวอาร์โค้ดของโต๊ะ <span className="font-bold text-white bg-slate-950 px-1.5 py-0.5 rounded border border-slate-850">"{deleteTableConfirm}"</span>? การลบนี้จะไม่สามารถย้อนกลับได้
              </p>
            </div>
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteTableConfirm(null)}
                className="flex-1 bg-slate-950 hover:bg-slate-850 border border-slate-800 text-slate-400 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleRemoveTableSubmit}
                className="flex-1 bg-red-600 hover:bg-red-500 text-white py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                ยืนยันลบโต๊ะ
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
