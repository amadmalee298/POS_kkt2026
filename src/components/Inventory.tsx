import React, { useState } from 'react';
import { Ingredient, StockCardLog, User } from '../types';
import { 
  Package, Plus, Minus, FileText, AlertTriangle, 
  Calendar, Layers, Sparkles, Filter, CheckCircle2,
  Pencil, X, History, TrendingUp, TrendingDown, ArrowUpDown, Search, RotateCcw, RefreshCw
} from 'lucide-react';

interface InventoryProps {
  ingredients: Ingredient[];
  stockLogs: StockCardLog[];
  currentUser: User;
  onUpdateIngredients: (updated: Ingredient[], newLogs: StockCardLog[]) => void;
}

export default function Inventory({ 
  ingredients, stockLogs, currentUser, onUpdateIngredients 
}: InventoryProps) {
  // Local States
  const [activeTab, setActiveTab] = useState<'STOCK' | 'ITEM_HISTORY' | 'LOGS'>('STOCK');
  const [filterLowStock, setFilterLowStock] = useState<boolean>(false);

  // Dedicated Per-Item History Log Filter States
  const [selectedIngredientId, setSelectedIngredientId] = useState<string>('ALL');
  const [logTypeFilter, setLogTypeFilter] = useState<'ALL' | 'IN' | 'OUT' | 'ADJUST'>('ALL');
  const [logSearchQuery, setLogSearchQuery] = useState<string>('');
  const [logTimeRange, setLogTimeRange] = useState<'ALL' | 'TODAY' | 'WEEK' | 'MONTH'>('ALL');
  
  // New/Adjust Stock Dialog State
  const [editingIngredient, setEditingIngredient] = useState<Ingredient | null>(null);
  const [adjustType, setAdjustType] = useState<'IN' | 'OUT' | 'ADJUST'>('IN');
  const [adjustAmount, setAdjustAmount] = useState<number>(0);
  const [adjustNote, setAdjustNote] = useState<string>('');

  // Adjust Cost Price Dialog State
  const [editingCostIngredient, setEditingCostIngredient] = useState<Ingredient | null>(null);
  const [newCostValue, setNewCostValue] = useState<number>(0);

  // Create New Ingredient State
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [newName, setNewName] = useState('');
  const [newStock, setNewStock] = useState<number>(10);
  const [newMinStock, setNewMinStock] = useState<number>(5);
  const [newUnit, setNewUnit] = useState('kg');
  const [newUnitCost, setNewUnitCost] = useState<number>(100);
  const [newExpiry, setNewExpiry] = useState('');
  const [newLot, setNewLot] = useState('');

  // Filtered ingredients
  const displayedIngredients = filterLowStock 
    ? ingredients.filter(i => i.stock <= i.minStock)
    : ingredients;

  // Handler to record stock transactions
  const handleAdjustStockSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingIngredient || adjustAmount <= 0) return;

    let delta = adjustAmount;
    let finalStock = editingIngredient.stock;

    if (adjustType === 'IN') {
      finalStock += delta;
    } else if (adjustType === 'OUT') {
      finalStock = Math.max(0, finalStock - delta);
      delta = -delta; // represent as decrease
    } else {
      // Direct adjustment set
      finalStock = adjustAmount;
      delta = adjustAmount - editingIngredient.stock;
    }

    // Rounding decimals safely
    finalStock = parseFloat(finalStock.toFixed(3));

    // Update ingredients array
    const updatedIngredients = ingredients.map(ing => {
      if (ing.id === editingIngredient.id) {
        return {
          ...ing,
          stock: finalStock
        };
      }
      return ing;
    });

    // Append to stock logs
    const newLog: StockCardLog = {
      id: `sc-log-${Date.now()}`,
      ingredientId: editingIngredient.id,
      type: adjustType,
      amount: parseFloat(Math.abs(delta).toFixed(3)),
      remaining: finalStock,
      note: adjustNote || (adjustType === 'IN' ? 'รับวัตถุดิบเข้าคลัง' : adjustType === 'OUT' ? 'เบิกใช้งานปกติ' : 'ปรับยอดสต๊อกจริง'),
      timestamp: new Date().toISOString(),
      user: currentUser.name
    };

    onUpdateIngredients(updatedIngredients, [newLog, ...stockLogs]);
    setEditingIngredient(null);
    setAdjustAmount(0);
    setAdjustNote('');
  };

  // Add new ingredient completely
  const handleCreateIngredient = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName) return;

    const newIng: Ingredient = {
      id: `i${ingredients.length + 1}`,
      name: newName,
      stock: newStock,
      minStock: newMinStock,
      unit: newUnit,
      unitCost: newUnitCost,
      expiryDate: newExpiry || undefined,
      lotNo: newLot || undefined
    };

    // Append standard log
    const newLog: StockCardLog = {
      id: `sc-log-${Date.now()}`,
      ingredientId: newIng.id,
      type: 'IN',
      amount: newStock,
      remaining: newStock,
      note: 'เริ่มต้นเปิดยอดวัตถุดิบใหม่',
      timestamp: new Date().toISOString(),
      user: currentUser.name
    };

    onUpdateIngredients([newIng, ...ingredients], [newLog, ...stockLogs]);
    setShowCreateModal(false);
    // Reset
    setNewName('');
    setNewStock(10);
    setNewMinStock(5);
    setNewUnit('kg');
    setNewUnitCost(100);
    setNewExpiry('');
    setNewLot('');
  };

  // Filtered item logs for dedicated per-ingredient history tab
  const filteredItemLogs = stockLogs.filter(log => {
    if (selectedIngredientId !== 'ALL' && log.ingredientId !== selectedIngredientId) {
      return false;
    }
    if (logTypeFilter !== 'ALL' && log.type !== logTypeFilter) {
      return false;
    }
    if (logTimeRange !== 'ALL') {
      const logDate = new Date(log.timestamp);
      const now = new Date();
      if (logTimeRange === 'TODAY') {
        if (logDate.toDateString() !== now.toDateString()) return false;
      } else if (logTimeRange === 'WEEK') {
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        if (logDate < sevenDaysAgo) return false;
      } else if (logTimeRange === 'MONTH') {
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        if (logDate < thirtyDaysAgo) return false;
      }
    }
    if (logSearchQuery.trim()) {
      const q = logSearchQuery.toLowerCase();
      const ing = ingredients.find(i => i.id === log.ingredientId);
      const ingName = ing ? ing.name.toLowerCase() : '';
      const note = (log.note || '').toLowerCase();
      const user = (log.user || '').toLowerCase();
      if (!ingName.includes(q) && !note.includes(q) && !user.includes(q) && !log.id.toLowerCase().includes(q)) {
        return false;
      }
    }
    return true;
  });

  const selectedIng = ingredients.find(i => i.id === selectedIngredientId);

  const totalInAmount = filteredItemLogs
    .filter(l => l.type === 'IN')
    .reduce((sum, l) => sum + l.amount, 0);

  const totalOutAmount = filteredItemLogs
    .filter(l => l.type === 'OUT')
    .reduce((sum, l) => sum + l.amount, 0);

  const totalAdjustAmount = filteredItemLogs
    .filter(l => l.type === 'ADJUST')
    .reduce((sum, l) => sum + l.amount, 0);

  return (
    <div className="space-y-6">
      {/* Upper header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">คลังวัตถุดิบ (Inventory & Stocks)</h2>
          <p className="text-xs text-slate-400">ระบบเบิกรับ ปรับยอด สัญญาณวัตถุดิบขาดแคลน และบันทึกประวัติ Stock Card หมุนเวียน</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-500 hover:to-amber-500 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition-all shadow cursor-pointer"
          >
            <Plus className="w-4 h-4" /> เพิ่มรหัสวัตถุดิบใหม่
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-800 overflow-x-auto">
        <button
          onClick={() => setActiveTab('STOCK')}
          className={`py-3 px-5 text-xs font-bold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
            activeTab === 'STOCK' 
              ? 'border-red-500 text-white' 
              : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          <Package className="w-4 h-4" /> วัตถุดิบคงเหลือปัจจุบัน
        </button>

        <button
          onClick={() => setActiveTab('ITEM_HISTORY')}
          className={`py-3 px-5 text-xs font-bold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
            activeTab === 'ITEM_HISTORY' 
              ? 'border-red-500 text-white bg-slate-850/30' 
              : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          <History className="w-4 h-4 text-amber-500" />
          <span>ประวัติรับ-เบิกรายวัตถุดิบ (Item Usage Log)</span>
          {selectedIngredientId !== 'ALL' && (
            <span className="px-1.5 py-0.5 rounded-full text-[9px] bg-amber-500/20 text-amber-400 border border-amber-500/30 font-bold font-mono">
              กรองอยู่
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('LOGS')}
          className={`py-3 px-5 text-xs font-bold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
            activeTab === 'LOGS' 
              ? 'border-red-500 text-white' 
              : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          <FileText className="w-4 h-4" /> สมุดประวัติรวมทั้งหมด (Stock Card)
        </button>
      </div>

      {activeTab === 'STOCK' ? (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-slate-900 border border-slate-800/80 p-4 rounded-xl">
            <div className="text-xs font-medium text-slate-400 flex items-center gap-2">
              <Filter className="w-4 h-4 text-slate-500" />
              <span>คัดกรองวัตถุดิบ:</span>
              <span className="text-white font-semibold">{displayedIngredients.length} รายการ</span>
            </div>
            <button
              onClick={() => setFilterLowStock(!filterLowStock)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                filterLowStock
                  ? 'bg-amber-950 text-amber-400 border border-amber-900/40'
                  : 'bg-slate-950 text-slate-400 border border-slate-800 hover:text-white'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5" /> แสดงเฉพาะวัตถุดิบใกล้หมดสต๊อก
            </button>
          </div>

          {/* Stock Table List */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs divide-y divide-slate-800">
                <thead>
                  <tr className="bg-slate-950 text-slate-400 font-bold uppercase tracking-wider">
                    <th className="p-4">รายการวัตถุดิบ</th>
                    <th className="p-4">รหัสล๊อต / หมดอายุ</th>
                    <th className="p-4">ราคาทุนเฉลี่ย</th>
                    <th className="p-4">เกณฑ์ขั้นต่ำ</th>
                    <th className="p-4">ปริมาณคงคลัง</th>
                    <th className="p-4 text-right">ดำเนินการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-850 text-slate-300">
                  {displayedIngredients.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-slate-500 font-medium">
                        ไม่พบบันทึกข้อมูลวัตถุดิบที่เข้าเกณฑ์
                      </td>
                    </tr>
                  ) : (
                    displayedIngredients.map(ing => {
                      const isLow = ing.stock <= ing.minStock;
                      const stockPercent = Math.min(100, (ing.stock / (ing.minStock * 2.5)) * 100);

                      return (
                        <tr key={ing.id} className="hover:bg-slate-850/10">
                          <td className="p-4">
                            <div className="flex items-center gap-3">
                              <div className={`p-2 rounded-lg border ${
                                isLow 
                                  ? 'bg-red-950/40 border-red-900/30 text-red-500' 
                                  : 'bg-slate-950 border-slate-800 text-slate-400'
                              }`}>
                                <Package className="w-4 h-4" />
                              </div>
                              <div>
                                <span className="font-bold text-slate-100">{ing.name}</span>
                                <span className="block text-[10px] text-slate-500 mt-0.5">ID: {ing.id}</span>
                              </div>
                            </div>
                          </td>
                          <td className="p-4">
                            <div className="space-y-0.5 font-mono text-[10px]">
                              {ing.lotNo ? (
                                <span className="block text-slate-300 flex items-center gap-1">
                                  <Layers className="w-3 h-3 text-slate-500" /> {ing.lotNo}
                                </span>
                              ) : (
                                <span className="text-slate-600">-</span>
                              )}
                              {ing.expiryDate ? (
                                <span className="block text-amber-500/80 flex items-center gap-1">
                                  <Calendar className="w-3 h-3 text-slate-500" /> EXP: {ing.expiryDate}
                                </span>
                              ) : (
                                <span className="text-slate-600">-</span>
                              )}
                            </div>
                          </td>
                          <td className="p-4 font-mono">
                            <div className="flex items-center gap-1.5 group/price">
                              <span className="text-slate-100 font-bold">{ing.unitCost.toLocaleString()} ฿ / {ing.unit}</span>
                              <button
                                onClick={() => {
                                  setEditingCostIngredient(ing);
                                  setNewCostValue(ing.unitCost);
                                }}
                                title="ปรับราคาวัตถุดิบ"
                                className="p-1 bg-slate-950/40 text-amber-500 hover:text-amber-400 hover:bg-slate-950/80 rounded-lg transition-colors cursor-pointer"
                              >
                                <Pencil className="w-3 h-3" />
                              </button>
                            </div>
                          </td>
                          <td className="p-4 font-semibold text-slate-400">
                            {ing.minStock} {ing.unit}
                          </td>
                          <td className="p-4">
                            <div className="space-y-1.5 w-40">
                              <div className="flex justify-between items-center text-[11px] font-bold">
                                <span className={isLow ? 'text-red-400' : 'text-slate-200'}>
                                  {ing.stock} {ing.unit}
                                </span>
                                {isLow && (
                                  <span className="text-[9px] text-red-400 bg-red-950/60 px-1 rounded-md border border-red-900/40 font-bold uppercase tracking-wider animate-pulse">
                                    Low
                                  </span>
                                )}
                              </div>
                              <div className="w-full bg-slate-950 h-1.5 rounded-full overflow-hidden border border-slate-850">
                                <div 
                                  className={`h-full rounded-full ${isLow ? 'bg-red-500' : 'bg-emerald-500'}`}
                                  style={{ width: `${stockPercent}%` }}
                                ></div>
                              </div>
                            </div>
                          </td>
                          <td className="p-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => {
                                  setSelectedIngredientId(ing.id);
                                  setActiveTab('ITEM_HISTORY');
                                }}
                                title="ดูประวัติการรับ-เบิกวัตถุดิบรายการนี้"
                                className="px-2.5 py-1.5 bg-slate-950 hover:bg-slate-850 text-amber-400 hover:text-amber-300 border border-slate-800 hover:border-amber-500/40 font-bold rounded-lg text-[11px] transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                              >
                                <History className="w-3.5 h-3.5 text-amber-500" />
                                <span>ประวัติรับ-เบิก</span>
                              </button>
                              <button
                                onClick={() => {
                                  setEditingIngredient(ing);
                                  setAdjustType('IN');
                                  setAdjustAmount(0);
                                  setAdjustNote('');
                                }}
                                className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-lg text-[11px] transition-all cursor-pointer whitespace-nowrap"
                              >
                                เบิก / รับเข้า / ปรับปรุง
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : activeTab === 'ITEM_HISTORY' ? (
        /* DEDICATED TAB: ITEM USAGE & MOVEMENT HISTORY LOG */
        <div className="space-y-5">
          {/* Top Banner & Active Ingredient Selected Header */}
          <div className="bg-slate-900 border border-slate-800 p-4 sm:p-5 rounded-2xl space-y-4 shadow">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-amber-950/60 border border-amber-900/40 text-amber-400 rounded-xl">
                    <History className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-white tracking-tight flex items-center gap-2">
                      <span>ประวัติการใช้งานและรับ-เบิกวัตถุดิบ (Item Movement Log)</span>
                      {selectedIng && (
                        <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 text-[10px] font-bold font-mono">
                          {selectedIng.name}
                        </span>
                      )}
                    </h3>
                    <p className="text-xs text-slate-400">
                      ติดตามประวัติการตัดสต๊อกอัตโนมัติจากหน้า POS, การรับสินค้าเข้าคลัง และการปรับยอดคงเหลือย้อนหลัง
                    </p>
                  </div>
                </div>
              </div>

              {/* Selected Ingredient Quick Switcher */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative min-w-[220px]">
                  <select
                    value={selectedIngredientId}
                    onChange={(e) => setSelectedIngredientId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:border-amber-500 cursor-pointer pr-8"
                  >
                    <option value="ALL">📦 วัตถุดิบทั้งหมดในระบบ (All Ingredients)</option>
                    {ingredients.map(ing => (
                      <option key={ing.id} value={ing.id}>
                        {ing.name} (คงเหลือ: {ing.stock} {ing.unit})
                      </option>
                    ))}
                  </select>
                </div>

                {selectedIngredientId !== 'ALL' && (
                  <button
                    onClick={() => setSelectedIngredientId('ALL')}
                    className="px-3 py-2 bg-slate-850 hover:bg-slate-800 text-slate-300 font-bold text-xs rounded-xl border border-slate-750 transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-amber-400" /> แสดงทั้งหมด
                  </button>
                )}
              </div>
            </div>

            {/* Selected Ingredient Highlight Info Bar (if individual ingredient selected) */}
            {selectedIng && (
              <div className="p-3 bg-slate-950/80 border border-slate-800/80 rounded-xl flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-3">
                  <span className="font-bold text-white text-sm">{selectedIng.name}</span>
                  <span className="text-slate-400 font-mono text-[11px]">รหัส: {selectedIng.id}</span>
                  {selectedIng.lotNo && (
                    <span className="text-slate-400 font-mono text-[11px] bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                      LOT: {selectedIng.lotNo}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-4 text-xs font-mono font-bold">
                  <span className="text-slate-400">
                    เกณฑ์ขั้นต่ำ: <strong className="text-slate-200">{selectedIng.minStock} {selectedIng.unit}</strong>
                  </span>
                  <span className="text-slate-400">
                    ราคาทุน: <strong className="text-amber-400">{selectedIng.unitCost} ฿ / {selectedIng.unit}</strong>
                  </span>
                  <span className={`px-2.5 py-1 rounded-lg text-xs font-extrabold ${
                    selectedIng.stock <= selectedIng.minStock 
                      ? 'bg-red-950/80 text-red-400 border border-red-900/50' 
                      : 'bg-emerald-950/80 text-emerald-400 border border-emerald-900/50'
                  }`}>
                    สต๊อกปัจจุบัน: {selectedIng.stock} {selectedIng.unit}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Metric Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">จำนวนประวัติย้อนหลัง</span>
              <div className="flex items-baseline justify-between">
                <span className="text-xl font-black text-white font-mono">{filteredItemLogs.length}</span>
                <span className="text-[10px] text-slate-500 font-medium">รายการ</span>
              </div>
            </div>

            <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl space-y-1">
              <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider block flex items-center gap-1">
                <TrendingUp className="w-3 h-3" /> ยอดรับเข้าสะสม (IN)
              </span>
              <div className="flex items-baseline justify-between">
                <span className="text-xl font-black text-emerald-400 font-mono">
                  +{totalInAmount.toLocaleString(undefined, { maximumFractionDigits: 3 })}
                </span>
                <span className="text-[10px] text-slate-400">{selectedIng ? selectedIng.unit : 'หน่วย'}</span>
              </div>
            </div>

            <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl space-y-1">
              <span className="text-[10px] font-bold text-red-400 uppercase tracking-wider block flex items-center gap-1">
                <TrendingDown className="w-3 h-3" /> ยอดเบิก / ตัดขายสะสม (OUT)
              </span>
              <div className="flex items-baseline justify-between">
                <span className="text-xl font-black text-red-400 font-mono">
                  -{totalOutAmount.toLocaleString(undefined, { maximumFractionDigits: 3 })}
                </span>
                <span className="text-[10px] text-slate-400">{selectedIng ? selectedIng.unit : 'หน่วย'}</span>
              </div>
            </div>

            <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl space-y-1">
              <span className="text-[10px] font-bold text-blue-400 uppercase tracking-wider block flex items-center gap-1">
                <ArrowUpDown className="w-3 h-3" /> ยอดปรับปรุงบัญชี (ADJUST)
              </span>
              <div className="flex items-baseline justify-between">
                <span className="text-xl font-black text-blue-400 font-mono">
                  {totalAdjustAmount.toLocaleString(undefined, { maximumFractionDigits: 3 })}
                </span>
                <span className="text-[10px] text-slate-400">{selectedIng ? selectedIng.unit : 'หน่วย'}</span>
              </div>
            </div>
          </div>

          {/* Filters Bar for Log Type, Date Range & Keyword Search */}
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl space-y-3">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
              {/* Type Filter Buttons */}
              <div className="flex flex-wrap items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-850">
                <span className="text-[10px] font-bold text-slate-500 px-2 uppercase tracking-wider">ประเภท:</span>
                {(['ALL', 'IN', 'OUT', 'ADJUST'] as const).map(type => (
                  <button
                    key={type}
                    onClick={() => setLogTypeFilter(type)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      logTypeFilter === type
                        ? type === 'IN' 
                          ? 'bg-emerald-600 text-white shadow'
                          : type === 'OUT'
                          ? 'bg-red-600 text-white shadow'
                          : type === 'ADJUST'
                          ? 'bg-blue-600 text-white shadow'
                          : 'bg-amber-600 text-white shadow'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {type === 'ALL' ? 'ทั้งหมด' : type === 'IN' ? '📥 รับเข้า (IN)' : type === 'OUT' ? '📤 เบิก/ขาย (OUT)' : '⚙️ ปรับปรุง (ADJUST)'}
                  </button>
                ))}
              </div>

              {/* Time Range Filter Buttons */}
              <div className="flex flex-wrap items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-850">
                <span className="text-[10px] font-bold text-slate-500 px-2 uppercase tracking-wider">ช่วงเวลา:</span>
                {(['ALL', 'TODAY', 'WEEK', 'MONTH'] as const).map(range => (
                  <button
                    key={range}
                    onClick={() => setLogTimeRange(range)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      logTimeRange === range
                        ? 'bg-slate-800 text-white border border-slate-700 shadow'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {range === 'ALL' ? 'ทั้งหมด' : range === 'TODAY' ? 'วันนี้' : range === 'WEEK' ? '7 วันล่าสุด' : '30 วันล่าสุด'}
                  </button>
                ))}
              </div>
            </div>

            {/* Keyword Search Field */}
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="ค้นหาตามชื่อวัตถุดิบ, หมายเหตุการทำรายการ, เลขออเดอร์ หรือชื่อพนักงาน..."
                  value={logSearchQuery}
                  onChange={(e) => setLogSearchQuery(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl py-2 pl-9 pr-8 text-xs focus:outline-none focus:border-amber-500"
                />
                {logSearchQuery && (
                  <button
                    onClick={() => setLogSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {(logTypeFilter !== 'ALL' || logTimeRange !== 'ALL' || logSearchQuery || selectedIngredientId !== 'ALL') && (
                <button
                  onClick={() => {
                    setSelectedIngredientId('ALL');
                    setLogTypeFilter('ALL');
                    setLogTimeRange('ALL');
                    setLogSearchQuery('');
                  }}
                  className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-pointer whitespace-nowrap"
                >
                  <RotateCcw className="w-3.5 h-3.5" /> ล้างตัวกรองทั้งหมด
                </button>
              )}
            </div>
          </div>

          {/* Filtered Logs Table */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs divide-y divide-slate-800">
                <thead>
                  <tr className="bg-slate-950 text-slate-400 font-bold uppercase tracking-wider">
                    <th className="p-4">วันเวลาที่ทำรายการ</th>
                    <th className="p-4">รายการวัตถุดิบ</th>
                    <th className="p-4">ประเภทธุรกรรม</th>
                    <th className="p-4 text-right">จำนวนตัด / รับเข้า</th>
                    <th className="p-4 text-right">ยอดคงเหลือหลังทำรายการ</th>
                    <th className="p-4">หมายเหตุ / แหล่งที่มา</th>
                    <th className="p-4 text-right">ผู้บันทึก</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-850 text-slate-300">
                  {filteredItemLogs.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-12 text-center text-slate-500 font-medium space-y-2">
                        <FileText className="w-8 h-8 text-slate-700 mx-auto" />
                        <p className="text-sm font-bold text-slate-400">ไม่พบบันทึกประวัติการใช้หรือรับ-เบิกวัตถุดิบที่ตรงตามตัวกรอง</p>
                        <p className="text-xs text-slate-600">ลองปรับเปลี่ยนตัวกรอง ค้นหาคำอื่น หรือเลือกวัตถุดิบรายการอื่น</p>
                      </td>
                    </tr>
                  ) : (
                    filteredItemLogs.map(log => {
                      const ing = ingredients.find(i => i.id === log.ingredientId);
                      const isSelected = selectedIngredientId === log.ingredientId;

                      return (
                        <tr key={log.id} className={`hover:bg-slate-850/40 transition-colors ${isSelected ? 'bg-amber-950/10' : ''}`}>
                          <td className="p-4 font-mono text-slate-400 whitespace-nowrap">
                            {new Date(log.timestamp).toLocaleString('th-TH', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                              second: '2-digit'
                            })}
                          </td>

                          <td className="p-4">
                            <button
                              onClick={() => setSelectedIngredientId(log.ingredientId)}
                              className="text-left group/ing cursor-pointer"
                              title="คลิกเพื่อกรองเฉพาะวัตถุดิบนี้"
                            >
                              <span className="font-bold text-slate-100 group-hover/ing:text-amber-400 transition-colors block">
                                {ing ? ing.name : `วัตถุดิบรหัส ${log.ingredientId}`}
                              </span>
                              <span className="text-[10px] text-slate-500 font-mono">
                                ID: {log.ingredientId}
                              </span>
                            </button>
                          </td>

                          <td className="p-4">
                            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-extrabold border ${
                              log.type === 'IN' 
                                ? 'bg-emerald-950/80 text-emerald-400 border-emerald-900/50' 
                                : log.type === 'OUT' 
                                ? 'bg-red-950/80 text-red-400 border-red-900/50' 
                                : 'bg-blue-950/80 text-blue-400 border-blue-900/50'
                            }`}>
                              {log.type === 'IN' ? (
                                <>
                                  <TrendingUp className="w-3 h-3" /> รับเข้าคลัง (IN)
                                </>
                              ) : log.type === 'OUT' ? (
                                <>
                                  <TrendingDown className="w-3 h-3" /> เบิก/ตัดขาย (OUT)
                                </>
                              ) : (
                                <>
                                  <RefreshCw className="w-3 h-3" /> ปรับปรุงบัญชี
                                </>
                              )}
                            </span>
                          </td>

                          <td className={`p-4 font-mono font-bold text-right text-sm whitespace-nowrap ${
                            log.type === 'IN' ? 'text-emerald-400' : log.type === 'OUT' ? 'text-red-400' : 'text-blue-400'
                          }`}>
                            {log.type === 'IN' ? '+' : log.type === 'OUT' ? '-' : ''}
                            {log.amount} {ing?.unit}
                          </td>

                          <td className="p-4 font-mono font-bold text-slate-100 text-right whitespace-nowrap">
                            {log.remaining} {ing?.unit}
                          </td>

                          <td className="p-4 max-w-xs">
                            <span className="block text-slate-200 font-medium leading-relaxed">
                              {log.note}
                            </span>
                          </td>

                          <td className="p-4 text-right whitespace-nowrap">
                            <span className="text-slate-400 font-medium block">{log.user}</span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        /* TAB: STOCK CARDS (MOVEMENT LEDGERS) */
        <div className="space-y-4">
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center justify-between text-xs">
            <span className="text-slate-400 font-medium">บันทึกสมุด Stock Card ตรวจสอบย้อนหลัง: {stockLogs.length} บันทึก</span>
            <span className="text-slate-500 text-[10px]">อ้างอิงรหัสพนักงานผู้ดำเนินการทุกเคส</span>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs divide-y divide-slate-800">
                <thead>
                  <tr className="bg-slate-950 text-slate-400 font-bold uppercase tracking-wider">
                    <th className="p-4">วันเวลาบันทึก</th>
                    <th className="p-4">วัตถุดิบ</th>
                    <th className="p-4">ประเภทรายการ</th>
                    <th className="p-4 text-right">จำนวนคาร์ด</th>
                    <th className="p-4 text-right">ยอดคงเหลือสุทธิ</th>
                    <th className="p-4">ผู้ทำรายการ / หมายเหตุ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-850 text-slate-300">
                  {stockLogs.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-slate-500 font-medium">
                        ยังไม่มีบันทึกความเคลื่อนไหวสต๊อกในระบบ
                      </td>
                    </tr>
                  ) : (
                    stockLogs.map(log => {
                      const ing = ingredients.find(i => i.id === log.ingredientId);
                      return (
                        <tr key={log.id} className="hover:bg-slate-850/10">
                          <td className="p-4 font-mono text-slate-500">
                            {new Date(log.timestamp).toLocaleString('th-TH')}
                          </td>
                          <td className="p-4 font-semibold text-slate-200">
                            {ing ? ing.name : `วัตถุดิบรหัส ${log.ingredientId}`}
                          </td>
                          <td className="p-4">
                            <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                              log.type === 'IN' 
                                ? 'bg-green-950 text-green-400 border border-green-900/30' 
                                : log.type === 'OUT' 
                                ? 'bg-red-950 text-red-400 border border-red-900/30' 
                                : 'bg-blue-950 text-blue-400 border border-blue-900/30'
                            }`}>
                              {log.type === 'IN' ? 'รับเข้า (IN)' : log.type === 'OUT' ? 'เบิกออก (OUT)' : 'ปรับปรุงบัญชี'}
                            </span>
                          </td>
                          <td className={`p-4 font-mono font-bold text-right ${
                            log.type === 'IN' ? 'text-green-400' : log.type === 'OUT' ? 'text-red-400' : 'text-blue-400'
                          }`}>
                            {log.type === 'IN' ? '+' : log.type === 'OUT' ? '-' : ''} {log.amount} {ing?.unit}
                          </td>
                          <td className="p-4 font-mono font-bold text-slate-100 text-right">
                            {log.remaining} {ing?.unit}
                          </td>
                          <td className="p-4">
                            <span className="block text-slate-300 font-medium">{log.note}</span>
                            <span className="block text-[10px] text-slate-500 mt-0.5">โดย: {log.user}</span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: MANUAL ADJUST (IN/OUT/ADJUST) */}
      {editingIngredient && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <form onSubmit={handleAdjustStockSubmit} className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <h4 className="font-bold text-white text-sm">เบิกสินค้า / ปรับสต๊อกวัตถุดิบ</h4>
              <button 
                type="button"
                onClick={() => setEditingIngredient(null)}
                className="text-slate-500 hover:text-white p-1 rounded-lg hover:bg-slate-850"
              >
                <Minus className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-850 space-y-1">
                <span className="block text-xs font-bold text-slate-200">{editingIngredient.name}</span>
                <span className="block text-[11px] text-slate-400">คงเหลือเดิม: <strong className="text-white font-mono">{editingIngredient.stock} {editingIngredient.unit}</strong></span>
              </div>

              {/* Transaction Type selection */}
              <div className="space-y-1.5">
                <span className="block text-xs font-semibold text-slate-300 font-medium">ประเภทธุรกรรมคลัง</span>
                <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-950 rounded-xl border border-slate-850">
                  {(['IN', 'OUT', 'ADJUST'] as const).map(type => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setAdjustType(type)}
                      className={`py-2 rounded-lg text-xs font-bold transition-all ${
                        adjustType === type
                          ? 'bg-red-600 text-white shadow-md'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      {type === 'IN' ? 'รับเข้า (+)' : type === 'OUT' ? 'เบิกออก (-)' : 'ปรับสต๊อกตรง'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Amount field */}
              <div className="space-y-1.5">
                <span className="block text-xs font-semibold text-slate-300">
                  {adjustType === 'IN' ? 'จำนวนที่รับเข้าคลัง' : adjustType === 'OUT' ? 'จำนวนเบิกใช้จริง' : 'จำนวนปรับรวมทั้งหมดใหม่'} ({editingIngredient.unit})
                </span>
                <input
                  type="number"
                  step="any"
                  min="0.001"
                  required
                  placeholder={`ระบุปริมาณ (${editingIngredient.unit})`}
                  value={adjustAmount || ''}
                  onChange={(e) => setAdjustAmount(parseFloat(e.target.value) || 0)}
                  className="w-full bg-slate-950 border border-slate-850 text-white rounded-xl px-3 py-2 text-xs font-mono font-bold focus:outline-none focus:border-red-500"
                />
              </div>

              {/* Adjust note */}
              <div className="space-y-1.5">
                <span className="block text-xs font-semibold text-slate-300">ระบุหมายเหตุการแก้ไข</span>
                <input
                  type="text"
                  placeholder="เช่น ตรวจนับสต๊อกสิ้นเดือน, เนื้อเน่าทิ้ง, เติมของรอบสอง"
                  value={adjustNote}
                  onChange={(e) => setAdjustNote(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-850 text-white rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-red-500"
                />
              </div>
            </div>

            <div className="p-4 bg-slate-950 border-t border-slate-800 flex gap-2">
              <button
                type="button"
                onClick={() => setEditingIngredient(null)}
                className="flex-1 py-2 border border-slate-800 hover:bg-slate-900 text-slate-400 rounded-xl text-xs font-semibold"
              >
                ย้อนกลับ
              </button>
              <button
                type="submit"
                className="flex-1 py-2 bg-gradient-to-r from-red-600 to-amber-600 text-white rounded-xl text-xs font-bold"
              >
                ยืนยันการปรับสต๊อก
              </button>
            </div>
          </form>
        </div>
      )}

      {/* CREATE NEW INGREDIENT MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <form onSubmit={handleCreateIngredient} className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <h4 className="font-bold text-white text-sm">เพิ่มรหัสวัตถุดิบวัตถุดิบใหม่</h4>
              <button 
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="text-slate-500 hover:text-white p-1 rounded-lg hover:bg-slate-850"
              >
                <Minus className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 max-h-[480px] overflow-y-auto">
              <div className="space-y-1.5">
                <span className="block text-xs font-semibold text-slate-300">ชื่อวัตถุดิบ</span>
                <input
                  type="text"
                  required
                  placeholder="เช่น มะเขือเทศท้อแกะ, นมข้นหวานคาร์เนชั่น"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-850 text-white rounded-xl px-3 py-2.5 text-xs focus:outline-none focus:border-red-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <span className="block text-xs font-semibold text-slate-300">จำนวนยกร้านเปิดสต๊อก</span>
                  <input
                    type="number"
                    step="any"
                    required
                    value={newStock}
                    onChange={(e) => setNewStock(parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-950 border border-slate-850 text-white rounded-xl px-3 py-2 text-xs font-mono font-bold focus:outline-none"
                  />
                </div>
                <div className="space-y-1.5">
                  <span className="block text-xs font-semibold text-slate-300">เกณฑ์ขั้นต่ำเตือนภัย (Min)</span>
                  <input
                    type="number"
                    step="any"
                    required
                    value={newMinStock}
                    onChange={(e) => setNewMinStock(parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-950 border border-slate-850 text-white rounded-xl px-3 py-2 text-xs font-mono font-bold focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <span className="block text-xs font-semibold text-slate-300">หน่วยนับ (เช่น kg, ลิตร, ฟอง)</span>
                  <input
                    type="text"
                    required
                    placeholder="kg"
                    value={newUnit}
                    onChange={(e) => setNewUnit(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-850 text-white rounded-xl px-3 py-2 text-xs focus:outline-none"
                  />
                </div>
                <div className="space-y-1.5">
                  <span className="block text-xs font-semibold text-slate-300">ราคาทุนเฉลี่ยต่อหน่วย (฿)</span>
                  <input
                    type="number"
                    required
                    value={newUnitCost}
                    onChange={(e) => setNewUnitCost(parseInt(e.target.value) || 0)}
                    className="w-full bg-slate-950 border border-slate-850 text-white rounded-xl px-3 py-2 text-xs font-mono focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <span className="block text-xs font-semibold text-slate-300">รหัสล๊อต (Lot Code)</span>
                  <input
                    type="text"
                    placeholder="LOT-BASIL-088"
                    value={newLot}
                    onChange={(e) => setNewLot(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-850 text-white rounded-xl px-3 py-2 text-xs focus:outline-none"
                  />
                </div>
                <div className="space-y-1.5">
                  <span className="block text-xs font-semibold text-slate-300">วันหมดอายุอาหาร (EXP)</span>
                  <input
                    type="date"
                    value={newExpiry}
                    onChange={(e) => setNewExpiry(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-850 text-white rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="p-4 bg-slate-950 border-t border-slate-800 flex gap-2">
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="flex-1 py-2 border border-slate-800 hover:bg-slate-900 text-slate-400 rounded-xl text-xs font-semibold"
              >
                ย้อนกลับ
              </button>
              <button
                type="submit"
                className="flex-1 py-2 bg-gradient-to-r from-red-600 to-amber-600 text-white rounded-xl text-xs font-bold"
              >
                บันทึกสต๊อกใหม่
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL: ADJUST INGREDIENT COST PRICE */}
      {editingCostIngredient && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <form 
            onSubmit={(e) => {
              e.preventDefault();
              // Update ingredient unitCost
              const updatedIngredients = ingredients.map(ing => {
                if (ing.id === editingCostIngredient.id) {
                  return { ...ing, unitCost: newCostValue };
                }
                return ing;
              });

              // Create stock card log for audit trail of price change
              const newLog: StockCardLog = {
                id: `sc-log-${Date.now()}`,
                ingredientId: editingCostIngredient.id,
                type: 'ADJUST',
                amount: 0,
                remaining: editingCostIngredient.stock,
                note: `ปรับราคาทุนเฉลี่ยของวัตถุดิบ จาก ${editingCostIngredient.unitCost} ฿ เป็น ${newCostValue} ฿`,
                timestamp: new Date().toISOString(),
                user: currentUser.name
              };

              onUpdateIngredients(updatedIngredients, [newLog, ...stockLogs]);
              setEditingCostIngredient(null);
            }} 
            className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-150"
          >
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <h4 className="font-bold text-white text-xs sm:text-sm flex items-center gap-2">
                <FileText className="w-4 h-4 text-amber-500 animate-pulse" />
                ปรับเพิ่ม-ลดราคาทุนวัตถุดิบ (Adjust Cost Price)
              </h4>
              <button 
                type="button"
                onClick={() => setEditingCostIngredient(null)}
                className="text-slate-500 hover:text-white p-1 rounded-lg hover:bg-slate-850"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-850 space-y-1">
                <span className="block text-xs font-bold text-slate-200">{editingCostIngredient.name}</span>
                <span className="block text-[11px] text-slate-400">ราคาทุนเดิม: <strong className="text-white font-mono">{editingCostIngredient.unitCost} ฿ / {editingCostIngredient.unit}</strong></span>
              </div>

              {/* Price input field */}
              <div className="space-y-2">
                <span className="block text-xs font-semibold text-slate-300">ระบุราคาทุนใหม่ (฿ ต่อ {editingCostIngredient.unit})</span>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500 font-bold text-xs">฿</span>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    required
                    placeholder="ระบุราคาทุนใหม่"
                    value={newCostValue || ''}
                    onChange={(e) => setNewCostValue(parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-950 border border-slate-850 text-white rounded-xl py-2.5 pl-8 pr-3 text-sm font-mono font-bold focus:outline-none focus:border-red-500"
                  />
                </div>
              </div>

              {/* Touch friendly Quick Increase/Decrease adjust buttons */}
              <div className="space-y-2">
                <span className="block text-[10px] font-black text-slate-400 uppercase tracking-wider">ปุ่มลัดปรับเพิ่ม-ลดราคาด่วน (Touch Adjust):</span>
                <div className="grid grid-cols-6 gap-1.5">
                  {[-50, -10, -1, 1, 10, 50].map((val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setNewCostValue(prev => Math.max(0, parseFloat((prev + val).toFixed(2))))}
                      className={`py-2 rounded-lg text-xs font-mono font-bold transition-all active:scale-95 cursor-pointer ${
                        val < 0 
                          ? 'bg-red-950/40 text-red-400 border border-red-900/30 hover:bg-red-900/20' 
                          : 'bg-emerald-950/40 text-emerald-400 border border-emerald-900/30 hover:bg-emerald-900/20'
                      }`}
                    >
                      {val > 0 ? `+${val}` : val}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-4 bg-slate-950 border-t border-slate-800 flex gap-2">
              <button
                type="button"
                onClick={() => setEditingCostIngredient(null)}
                className="flex-1 py-2 border border-slate-800 hover:bg-slate-900 text-slate-400 rounded-xl text-xs font-semibold"
              >
                ย้อนกลับ
              </button>
              <button
                type="submit"
                className="flex-1 py-2 bg-gradient-to-r from-red-600 to-amber-600 text-white rounded-xl text-xs font-bold"
              >
                ยืนยันการเปลี่ยนราคา
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
