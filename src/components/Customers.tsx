import React, { useState } from 'react';
import { Customer, Promotion, Order } from '../types';
import { 
  Users, UserPlus, Gift, Sparkles, Search, 
  ShoppingBag, Calendar, Award, Phone, CheckCircle,
  Plus, Trash2, X
} from 'lucide-react';
import CustomerPurchaseHistory from './CustomerPurchaseHistory';

interface CustomersProps {
  customers: Customer[];
  promotions: Promotion[];
  orders: Order[];
  onAddCustomer: (customer: Customer) => void;
  onUpdatePromotions: (promotions: Promotion[]) => void;
  currency: string;
  onAddAuditLog: (
    actionType: 'RECIPE_UPDATE' | 'PERMISSION_CHANGE' | 'PRICE_MODIFICATION' | 'SYSTEM_UPDATE' | 'USER_MANAGEMENT',
    details: string
  ) => void;
}

export default function Customers({ 
  customers, promotions, orders, onAddCustomer, onUpdatePromotions, currency, onAddAuditLog
}: CustomersProps) {
  // States
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);

  // New customer form states
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');

  // Coupon/Promotion form states
  const [showAddPromoModal, setShowAddPromoModal] = useState(false);
  const [newPromoCode, setNewPromoCode] = useState('');
  const [newPromoName, setNewPromoName] = useState('');
  const [newPromoType, setNewPromoType] = useState<'PERCENT' | 'FIXED'>('PERCENT');
  const [newPromoValue, setNewPromoValue] = useState<number>(0);
  const [newPromoMinSpend, setNewPromoMinSpend] = useState<number>(0);

  // Search filtered customers
  const filteredCustomers = customers.filter(
    c => c.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
         c.phone.includes(searchQuery)
  );

  // Create loyalty member
  const handleCreateCustomerSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName || !newPhone) return;

    // Check if phone already registered
    if (customers.some(c => c.phone === newPhone)) {
      alert('หมายเลขโทรศัพท์นี้ถูกใช้ลงทะเบียนไปแล้ว');
      return;
    }

    const newCust: Customer = {
      id: `c${customers.length + 1}`,
      name: newName,
      phone: newPhone,
      points: 10, // 10 starter points
      createdAt: new Date().toISOString().split('T')[0],
      totalSpend: 0,
      ordersCount: 0
    };

    onAddCustomer(newCust);
    setShowAddModal(false);
    setNewName('');
    setNewPhone('');
    alert(`ลงทะเบียนสมาชิกสำเร็จ! ได้รับคะแนนต้อนรับ 10 คะแนน`);
  };

  // Create a new Coupon / Promotion
  const handleCreatePromoSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPromoCode || !newPromoName || newPromoValue <= 0) return;

    // Check duplicate code
    if (promotions.some(p => p.code.toUpperCase() === newPromoCode.toUpperCase())) {
      alert('รหัสคูปองนี้มีอยู่แล้วในระบบ');
      return;
    }

    const newPromo: Promotion = {
      id: `p${Date.now()}`,
      code: newPromoCode.toUpperCase(),
      name: newPromoName,
      type: newPromoType,
      value: newPromoValue,
      minSpend: newPromoMinSpend,
      active: true
    };

    onUpdatePromotions([newPromo, ...promotions]);
    onAddAuditLog('SYSTEM_UPDATE', `เพิ่มคูปองโปรโมชั่นการตลาดใหม่: [${newPromo.code}] "${newPromo.name}" (ส่วนลด ${newPromo.value}${newPromo.type === 'PERCENT' ? '%' : '฿'}, ขั้นต่ำ ${newPromo.minSpend}฿)`);
    
    setShowAddPromoModal(false);
    setNewPromoCode('');
    setNewPromoName('');
    setNewPromoValue(0);
    setNewPromoMinSpend(0);
    alert('สร้างคูปองใหม่สำเร็จแล้ว!');
  };

  // Delete Coupon / Promotion
  const handleDeletePromo = (id: string, code: string) => {
    if (confirm(`คุณแน่ใจหรือไม่ว่าต้องการลบคูปอง "${code}" ออกจากระบบถาวร?`)) {
      const updated = promotions.filter(p => p.id !== id);
      onUpdatePromotions(updated);
      onAddAuditLog('SYSTEM_UPDATE', `ลบคูปองโปรโมชั่นการตลาด: [${code}]`);
    }
  };

  // Toggle active / inactive status of Coupon
  const handleTogglePromoActive = (id: string) => {
    const updated = promotions.map(p => {
      if (p.id === id) {
        const newActive = !p.active;
        onAddAuditLog('SYSTEM_UPDATE', `เปลี่ยนสถานะคูปอง [${p.code}]: ${newActive ? 'เปิดใช้งาน' : 'ปิดการใช้งาน'}`);
        return { ...p, active: newActive };
      }
      return p;
    });
    onUpdatePromotions(updated);
  };

  // Get historical transactions for chosen customer
  const getCustomerOrders = (phone: string) => {
    return orders.filter(o => o.customerPhone === phone && o.paymentStatus === 'PAID');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">ระบบ CRM สมาชิกและคูปอง (Customers & Loyalty)</h2>
          <p className="text-xs text-slate-400">ระบบสะสมคะแนนแลกส่วนลด ทะเบียนสมาชิก และตั้งค่าส่วนลดแคมเปญคูปองการตลาด</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2 bg-gradient-to-r from-red-600 to-amber-600 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 hover:opacity-95 shadow transition-all"
        >
          <UserPlus className="w-4 h-4" /> สมัครสมาชิกร้านใหม่
        </button>
      </div>

      {/* CRM Main Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        
        {/* LEFT COLUMN: CUSTOMERS DIRECTORY (7 cols) */}
        <div className="xl:col-span-7 space-y-4">
          {/* Search Box */}
          <div className="relative">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500">
              <Search className="w-4 h-4" />
            </span>
            <input
              type="text"
              placeholder="ค้นหาชื่อสมาชิก หรือเบอร์โทรศัพท์มือถือ (เช่น 0812345678)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 text-white placeholder-slate-500 pl-10 pr-4 py-3 rounded-2xl focus:outline-none focus:border-red-500 text-xs font-semibold"
            />
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs divide-y divide-slate-800">
                <thead>
                  <tr className="bg-slate-950 text-slate-400 font-bold uppercase">
                    <th className="p-4">สมาชิก</th>
                    <th className="p-4">เบอร์มือถือ</th>
                    <th className="p-4 text-center">คะแนนสะสม</th>
                    <th className="p-4 text-right">ยอดซื้อสะสม</th>
                    <th className="p-4 text-right">จำนวนบิล</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-850 text-slate-300">
                  {filteredCustomers.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-slate-500 font-medium">
                        ไม่พบข้อมูลรายชื่อสมาชิกที่ค้นหา
                      </td>
                    </tr>
                  ) : (
                    filteredCustomers.map(cust => (
                      <tr 
                        key={cust.id} 
                        onClick={() => setSelectedCustomer(cust)}
                        className={`cursor-pointer transition-all hover:bg-slate-850/20 ${
                          selectedCustomer?.id === cust.id ? 'bg-red-950/10 border-l-2 border-red-500' : ''
                        }`}
                      >
                        <td className="p-4 font-bold text-slate-200">
                          {cust.name}
                        </td>
                        <td className="p-4 font-mono font-semibold text-slate-400">
                          {cust.phone}
                        </td>
                        <td className="p-4 text-center">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-950 text-amber-500 border border-amber-900/30 font-bold font-mono rounded text-[10px]">
                            <Award className="w-3.5 h-3.5" /> {cust.points} คะแนน
                          </span>
                        </td>
                        <td className="p-4 text-right font-mono text-white">
                          {cust.totalSpend.toLocaleString()} {currency}
                        </td>
                        <td className="p-4 text-right font-mono text-slate-400">
                          {cust.ordersCount} บิล
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: MEMBER ANALYSIS & COUPONS (5 cols) */}
        <div className="xl:col-span-5 space-y-6">
          {/* Member Details or Coupons list */}
          {selectedCustomer ? (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow space-y-4 relative">
              <button 
                onClick={() => setSelectedCustomer(null)}
                className="absolute top-4 right-4 text-slate-500 hover:text-white font-bold"
              >
                ย้อนกลับ
              </button>

              <div className="border-b border-slate-800 pb-3">
                <span className="text-[10px] text-slate-500 uppercase tracking-wider font-mono">Customer Profile CRM</span>
                <h3 className="font-extrabold text-white text-base mt-0.5">{selectedCustomer.name}</h3>
                <p className="text-xs text-slate-400 font-mono mt-1 flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-slate-500" /> {selectedCustomer.phone}
                </p>
              </div>

              {/* Core points block */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-850 text-center">
                  <span className="block text-[10px] text-slate-500">คะแนนสะสมปัจจุบัน</span>
                  <h4 className="font-black text-xl text-amber-500 mt-1">{selectedCustomer.points} pts</h4>
                  <p className="text-[9px] text-slate-500 mt-0.5">ทุกๆ 20฿ ได้ 1 คะแนน</p>
                </div>
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-850 text-center">
                  <span className="block text-[10px] text-slate-500">สมัครสมาชิกตั้งแต่</span>
                  <h4 className="font-semibold text-slate-200 mt-1.5 font-mono text-sm">
                    {new Date(selectedCustomer.createdAt).toLocaleDateString('th-TH')}
                  </h4>
                  <p className="text-[9px] text-slate-500 mt-1">ยอดเยี่ยม</p>
                </div>
              </div>

              {/* Historical orders timeline */}
              <div className="border-t border-slate-800/60 pt-4">
                <CustomerPurchaseHistory 
                  customer={selectedCustomer} 
                  orders={orders} 
                  currency={currency} 
                />
              </div>
            </div>
          ) : (
            /* COUPONS LIST (When no customer chosen) */
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow space-y-4">
              <div className="border-b border-slate-850 pb-3 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Gift className="w-5 h-5 text-red-500" />
                  <div>
                    <h3 className="font-bold text-white text-sm">คูปองโปรโมชั่นการตลาด</h3>
                    <p className="text-[10px] text-slate-400">โค้ดลดแคมเปญกระตุ้นยอดขายหน้าร้าน</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowAddPromoModal(true)}
                  className="px-2.5 py-1.5 bg-gradient-to-r from-red-600 to-amber-600 text-white font-bold rounded-xl text-[10px] flex items-center gap-1 hover:opacity-95 shadow transition-all cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" /> เพิ่มคูปอง
                </button>
              </div>

              <div className="space-y-3">
                {promotions.map(promo => (
                  <div key={promo.id} className="p-3.5 bg-slate-950 rounded-xl border border-slate-850 flex items-center justify-between text-xs relative overflow-hidden">
                    <div className="space-y-1 max-w-[65%]">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono font-extrabold text-white bg-red-600/20 text-red-500 px-2 py-0.5 border border-red-900/40 rounded text-[11px] tracking-wide">
                          {promo.code}
                        </span>
                        {promo.active ? (
                          <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                        ) : (
                          <span className="w-1.5 h-1.5 rounded-full bg-slate-600"></span>
                        )}
                      </div>
                      <span className="font-bold text-slate-200 block">{promo.name}</span>
                      <span className="text-[10px] text-slate-500 block">
                        ขั้นต่ำ: {promo.minSpend}฿ • ส่วนลด: {promo.value}{promo.type === 'PERCENT' ? '%' : '฿'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleTogglePromoActive(promo.id)}
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold cursor-pointer transition-all ${
                          promo.active 
                            ? 'bg-green-950 text-green-400 border border-green-900/30 hover:bg-green-900/40' 
                            : 'bg-slate-850 text-slate-500 border border-slate-800 hover:bg-slate-800'
                        }`}
                        title="คลิกเพื่อเปิด/ปิดใช้งานคูปอง"
                      >
                        {promo.active ? 'กำลังรัน' : 'ปิดแล้ว'}
                      </button>
                      <button
                        onClick={() => handleDeletePromo(promo.id, promo.code)}
                        className="p-1 hover:bg-slate-800 text-slate-500 hover:text-red-500 rounded-lg transition-all cursor-pointer"
                        title="ลบคูปองนี้"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
                {promotions.length === 0 && (
                  <div className="text-center py-8 text-slate-500 font-medium">
                    ไม่มีรหัสคูปองโปรโมชั่นในระบบ
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

      </div>

      {/* ADD LLOYALTY MEMBER MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <form onSubmit={handleCreateCustomerSubmit} className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900">
              <h4 className="font-bold text-white text-sm">สมัครสมาชิกร้านสะสมคะแนน</h4>
              <button 
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-slate-500 hover:text-white p-1 rounded-lg hover:bg-slate-850"
              >
                ย้อนกลับ
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="space-y-1.5">
                <span className="block text-xs font-semibold text-slate-300">ชื่อ-นามสกุล สมาชิก</span>
                <input
                  type="text"
                  required
                  placeholder="เช่น คุณธวัชชัย รักษาสวรรค์"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-850 text-white rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-red-500"
                />
              </div>

              <div className="space-y-1.5">
                <span className="block text-xs font-semibold text-slate-300">เบอร์โทรศัพท์มือถือ</span>
                <input
                  type="tel"
                  required
                  placeholder="เช่น 0891234567"
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-850 text-white rounded-xl px-3 py-2 text-xs font-mono focus:outline-none focus:border-red-500"
                />
              </div>
            </div>

            <div className="p-4 bg-slate-950 border-t border-slate-800 flex gap-2">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="flex-1 py-2 border border-slate-800 hover:bg-slate-900 text-slate-400 rounded-xl text-xs font-semibold"
              >
                ย้อนกลับ
              </button>
              <button
                type="submit"
                className="flex-1 py-2 bg-gradient-to-r from-red-600 to-amber-600 text-white rounded-xl text-xs font-bold shadow"
              >
                ลงทะเบียนสมาชิกใหม่
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ADD PROMOTION MODAL */}
      {showAddPromoModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <form onSubmit={handleCreatePromoSubmit} className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900">
              <h4 className="font-bold text-white text-sm">เพิ่มคูปองโปรโมชั่นใหม่</h4>
              <button 
                type="button"
                onClick={() => setShowAddPromoModal(false)}
                className="text-slate-500 hover:text-white p-1 rounded-lg hover:bg-slate-850 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="space-y-1.5">
                <span className="block text-xs font-semibold text-slate-300">รหัสคูปอง (Coupon Code)</span>
                <input
                  type="text"
                  required
                  placeholder="เช่น KAPRA100 (ใช้ภาษาอังกฤษและตัวเลขเท่านั้น)"
                  value={newPromoCode}
                  onChange={(e) => setNewPromoCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
                  className="w-full bg-slate-950 border border-slate-850 text-white rounded-xl px-3 py-2 text-xs font-mono focus:outline-none focus:border-red-500"
                />
              </div>

              <div className="space-y-1.5">
                <span className="block text-xs font-semibold text-slate-300">ชื่อแคมเปญ / รายละเอียดคูปอง</span>
                <input
                  type="text"
                  required
                  placeholder="เช่น ส่วนลดพิเศษเทศกาลวันแม่ 100 บาท"
                  value={newPromoName}
                  onChange={(e) => setNewPromoName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-850 text-white rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-red-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <span className="block text-xs font-semibold text-slate-300">ประเภทส่วนลด</span>
                  <select
                    value={newPromoType}
                    onChange={(e) => setNewPromoType(e.target.value as 'PERCENT' | 'FIXED')}
                    className="w-full bg-slate-950 border border-slate-850 text-white rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-red-500 cursor-pointer font-bold"
                  >
                    <option value="PERCENT">ลดเปอร์เซ็นต์ (%)</option>
                    <option value="FIXED">ลดคงที่ (฿)</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <span className="block text-xs font-semibold text-slate-300">มูลค่าส่วนลด</span>
                  <input
                    type="number"
                    required
                    min={1}
                    max={newPromoType === 'PERCENT' ? 100 : 10000}
                    placeholder={newPromoType === 'PERCENT' ? 'เช่น 10 (%)' : 'เช่น 100 (฿)'}
                    value={newPromoValue === 0 ? '' : newPromoValue}
                    onChange={(e) => setNewPromoValue(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-850 text-white rounded-xl px-3 py-2 text-xs font-mono focus:outline-none focus:border-red-500"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <span className="block text-xs font-semibold text-slate-300">ยอดซื้อขั้นต่ำ (฿)</span>
                <input
                  type="number"
                  required
                  min={0}
                  placeholder="เช่น 300 (หากไม่มีขั้นต่ำให้ใส่ 0)"
                  value={newPromoMinSpend === 0 ? '' : newPromoMinSpend}
                  onChange={(e) => setNewPromoMinSpend(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-850 text-white rounded-xl px-3 py-2 text-xs font-mono focus:outline-none focus:border-red-500"
                />
              </div>
            </div>

            <div className="p-4 bg-slate-950 border-t border-slate-800 flex gap-2">
              <button
                type="button"
                onClick={() => setShowAddPromoModal(false)}
                className="flex-1 py-2 border border-slate-800 hover:bg-slate-900 text-slate-400 rounded-xl text-xs font-semibold cursor-pointer"
              >
                ย้อนกลับ
              </button>
              <button
                type="submit"
                className="flex-1 py-2 bg-gradient-to-r from-red-600 to-amber-600 text-white rounded-xl text-xs font-bold shadow cursor-pointer"
              >
                บันทึกคูปองใหม่
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
