import React, { useState } from 'react';
import { 
  FileText, Plus, Search, Filter, CheckCircle2, XCircle, Clock, 
  Printer, Download, Edit, Trash2, Copy, ArrowRight, User, Building, 
  Phone, Mail, MapPin, Sparkles, Send, Calendar, DollarSign, Check, X, 
  FileCheck, Eye, Share2, Tag, AlertCircle, ShoppingBag
} from 'lucide-react';
import { Quotation, QuotationItem, Customer, MenuItem, StoreSettings, User as UserType, Order, TradeReceivable } from '../types';

interface QuotationsProps {
  quotations: Quotation[];
  onUpdateQuotations: (updated: Quotation[]) => void;
  customers: Customer[];
  menuItems: MenuItem[];
  storeSettings: StoreSettings;
  currentUser: UserType;
  currency: string;
  activeBranchId: string;
  onAddOrder?: (newOrder: Order) => void;
  onAddTradeReceivable?: (newAR: TradeReceivable) => void;
}

export function thaiBahtText(num: number): string {
  if (isNaN(num) || num === 0) return 'ศูนย์บาทถ้วน';
  const digits = ['ศูนย์', 'หนึ่ง', 'สอง', 'สาม', 'สี่', 'ห้า', 'หก', 'เจ็ด', 'แปด', 'เก้า'];
  const positions = ['', 'สิบ', 'ร้อย', 'พัน', 'หมื่น', 'แสน', 'ล้าน'];

  const split = Math.abs(num).toFixed(2).split('.');
  let integerPart = parseInt(split[0], 10);
  const decimalPart = parseInt(split[1], 10);

  function convertGroup(n: number): string {
    let str = '';
    const s = n.toString();
    const len = s.length;
    for (let i = 0; i < len; i++) {
      const digit = parseInt(s[i], 10);
      const pos = len - i - 1;
      if (digit !== 0) {
        if (pos === 1 && digit === 1) {
          str += 'สิบ';
        } else if (pos === 1 && digit === 2) {
          str += 'ยี่สิบ';
        } else if (pos === 0 && digit === 1 && len > 1) {
          str += 'เอ็ด';
        } else {
          str += digits[digit] + positions[pos];
        }
      }
    }
    return str;
  }

  let result = '';
  if (integerPart === 0) {
    result = 'ศูนย์บาท';
  } else {
    let groupIndex = 0;
    let groupStr = '';
    while (integerPart > 0) {
      const group = integerPart % 1000000;
      if (group > 0) {
        const text = convertGroup(group);
        if (groupIndex > 0) {
          groupStr = text + 'ล้าน' + groupStr;
        } else {
          groupStr = text;
        }
      }
      integerPart = Math.floor(integerPart / 1000000);
      groupIndex++;
    }
    result = groupStr + 'บาท';
  }

  if (decimalPart === 0) {
    result += 'ถ้วน';
  } else {
    result += convertGroup(decimalPart) + 'สตางค์';
  }

  return num < 0 ? `ลบ${result}` : result;
}

export const Quotations: React.FC<QuotationsProps> = ({
  quotations,
  onUpdateQuotations,
  customers,
  menuItems,
  storeSettings,
  currentUser,
  currency,
  activeBranchId,
  onAddTradeReceivable
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  
  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingQuotation, setEditingQuotation] = useState<Quotation | null>(null);
  const [previewQuotation, setPreviewQuotation] = useState<Quotation | null>(null);
  const [convertingQuotation, setConvertingQuotation] = useState<Quotation | null>(null);

  // Form State for Create / Edit
  const [formData, setFormData] = useState<{
    id?: string;
    customerName: string;
    customerPhone: string;
    customerEmail: string;
    customerAddress: string;
    customerTaxId: string;
    issueDate: string;
    validUntilDate: string;
    items: QuotationItem[];
    discount: number;
    vatType: 'INCLUSIVE' | 'EXCLUSIVE' | 'NO_VAT';
    notes: string;
    preparedBy: string;
  }>({
    customerName: '',
    customerPhone: '',
    customerEmail: '',
    customerAddress: '',
    customerTaxId: '',
    issueDate: new Date().toISOString().split('T')[0],
    validUntilDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    items: [
      { id: `qti-${Date.now()}-1`, name: '', quantity: 1, unitPrice: 0, amount: 0 }
    ],
    discount: 0,
    vatType: storeSettings.vatType || 'INCLUSIVE',
    notes: 'ราคานี้ยืนยันภายใน 15 วัน นับจากวันที่ออกเอกสาร / ชำระมัดจำ 50% เมื่ออนุมัติสั่งซื้อ',
    preparedBy: currentUser?.name || 'ผู้จัดการ'
  });

  // Calculate Totals for Form
  const calculateFormTotals = () => {
    const rawSubtotal = formData.items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
    const afterDiscount = Math.max(0, rawSubtotal - formData.discount);
    
    let vatAmount = 0;
    let grandTotal = afterDiscount;

    if (formData.vatType === 'INCLUSIVE') {
      vatAmount = Number(((afterDiscount * 7) / 107).toFixed(2));
      grandTotal = afterDiscount;
    } else if (formData.vatType === 'EXCLUSIVE') {
      vatAmount = Number((afterDiscount * 0.07).toFixed(2));
      grandTotal = afterDiscount + vatAmount;
    } else {
      vatAmount = 0;
      grandTotal = afterDiscount;
    }

    return { subtotal: rawSubtotal, vatAmount, grandTotal };
  };

  const { subtotal: formSubtotal, vatAmount: formVatAmount, grandTotal: formGrandTotal } = calculateFormTotals();

  // Reset form
  const resetForm = () => {
    setFormData({
      customerName: '',
      customerPhone: '',
      customerEmail: '',
      customerAddress: '',
      customerTaxId: '',
      issueDate: new Date().toISOString().split('T')[0],
      validUntilDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      items: [
        { id: `qti-${Date.now()}-1`, name: '', quantity: 1, unitPrice: 0, amount: 0 }
      ],
      discount: 0,
      vatType: storeSettings.vatType || 'INCLUSIVE',
      notes: 'ราคานี้ยืนยันภายใน 15 วัน นับจากวันที่ออกเอกสาร / ชำระมัดจำ 50% เมื่ออนุมัติสั่งซื้อ',
      preparedBy: currentUser?.name || 'ผู้จัดการ'
    });
    setEditingQuotation(null);
  };

  // Open Edit Modal
  const handleOpenEdit = (qt: Quotation) => {
    setEditingQuotation(qt);
    setFormData({
      id: qt.id,
      customerName: qt.customerName,
      customerPhone: qt.customerPhone || '',
      customerEmail: qt.customerEmail || '',
      customerAddress: qt.customerAddress || '',
      customerTaxId: qt.customerTaxId || '',
      issueDate: qt.issueDate,
      validUntilDate: qt.validUntilDate,
      items: qt.items.length > 0 ? qt.items : [{ id: `qti-${Date.now()}-1`, name: '', quantity: 1, unitPrice: 0, amount: 0 }],
      discount: qt.discount,
      vatType: qt.vatType,
      notes: qt.notes || '',
      preparedBy: qt.preparedBy || currentUser?.name || 'ผู้จัดการ'
    });
    setShowCreateModal(true);
  };

  // Save Quotation (Create or Edit)
  const handleSaveQuotation = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.customerName.trim()) {
      alert('กรุณากรอกชื่อลูกค้า / บริษัท');
      return;
    }

    if (formData.items.length === 0 || !formData.items.some(i => i.name.trim() && i.amount > 0)) {
      alert('กรุณาเพิ่มรายการสินค้าหรือบริการอย่างน้อย 1 รายการ');
      return;
    }

    const { subtotal, vatAmount, grandTotal } = calculateFormTotals();

    if (editingQuotation) {
      const updatedList = quotations.map(q => {
        if (q.id === editingQuotation.id) {
          return {
            ...q,
            customerName: formData.customerName,
            customerPhone: formData.customerPhone,
            customerEmail: formData.customerEmail,
            customerAddress: formData.customerAddress,
            customerTaxId: formData.customerTaxId,
            issueDate: formData.issueDate,
            validUntilDate: formData.validUntilDate,
            items: formData.items.filter(i => i.name.trim() !== ''),
            subtotal,
            discount: formData.discount,
            vatType: formData.vatType,
            vatRate: formData.vatType === 'NO_VAT' ? 0 : 7,
            vatAmount,
            grandTotal,
            notes: formData.notes,
            preparedBy: formData.preparedBy
          };
        }
        return q;
      });
      onUpdateQuotations(updatedList);
      alert(`แก้ไขใบเสนอราคา ${editingQuotation.id} สำเร็จ!`);
    } else {
      // Create New
      const nextNum = quotations.length + 1;
      const qtId = `QT-${new Date().getFullYear()}-${String(nextNum).padStart(3, '0')}`;
      
      const newQt: Quotation = {
        id: qtId,
        customerName: formData.customerName,
        customerPhone: formData.customerPhone,
        customerEmail: formData.customerEmail,
        customerAddress: formData.customerAddress,
        customerTaxId: formData.customerTaxId,
        issueDate: formData.issueDate,
        validUntilDate: formData.validUntilDate,
        items: formData.items.filter(i => i.name.trim() !== ''),
        subtotal,
        discount: formData.discount,
        vatType: formData.vatType,
        vatRate: formData.vatType === 'NO_VAT' ? 0 : 7,
        vatAmount,
        grandTotal,
        status: 'SENT',
        notes: formData.notes,
        branchId: activeBranchId || 'b1',
        createdAt: new Date().toISOString(),
        preparedBy: formData.preparedBy
      };

      onUpdateQuotations([newQt, ...quotations]);
      alert(`สร้างใบเสนอราคา ${qtId} สำเร็จ!`);
    }

    setShowCreateModal(false);
    resetForm();
  };

  // Delete Quotation
  const handleDeleteQuotation = (id: string) => {
    if (confirm(`คุณต้องการลบใบเสนอราคา ${id} ใช่หรือไม่?`)) {
      onUpdateQuotations(quotations.filter(q => q.id !== id));
    }
  };

  // Quick Status Toggle
  const handleUpdateStatus = (id: string, newStatus: Quotation['status']) => {
    const updated = quotations.map(q => {
      if (q.id === id) {
        return { ...q, status: newStatus };
      }
      return q;
    });
    onUpdateQuotations(updated);
  };

  // Convert Quotation to Trade Receivable (AR) or Order
  const handleConfirmConvert = (qt: Quotation) => {
    // 1. Create Trade Receivable in Accounting
    if (onAddTradeReceivable) {
      const newAR: TradeReceivable = {
        id: `ar-qt-${Date.now()}`,
        customerName: qt.customerName,
        amount: qt.grandTotal,
        dueDate: qt.validUntilDate,
        status: 'PENDING',
        description: `ตั้งตั้งลูกหนี้จากใบเสนอราคา ${qt.id} (${qt.items.map(i => i.name).join(', ')})`,
        createdAt: new Date().toISOString().split('T')[0]
      };
      onAddTradeReceivable(newAR);
    }

    // 2. Mark Quotation as CONVERTED
    const updatedQuotations = quotations.map(q => {
      if (q.id === qt.id) {
        return {
          ...q,
          status: 'CONVERTED' as const,
          convertedOrderId: `ar-qt-${Date.now()}`
        };
      }
      return q;
    });

    onUpdateQuotations(updatedQuotations);
    setConvertingQuotation(null);
    alert(`🎉 แปลงใบเสนอราคา ${qt.id} เป็นรายการตั้งลูกหนี้การค้าในระบบการเงินสำเร็จ! (ยอดเงิน: ${qt.grandTotal.toLocaleString()} บาท)`);
  };

  // Add Item Line to Form
  const handleAddItem = () => {
    setFormData(prev => ({
      ...prev,
      items: [
        ...prev.items,
        { id: `qti-${Date.now()}-${prev.items.length + 1}`, name: '', quantity: 1, unitPrice: 0, amount: 0 }
      ]
    }));
  };

  // Remove Item Line
  const handleRemoveItem = (index: number) => {
    if (formData.items.length <= 1) return;
    setFormData(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }));
  };

  // Update Item Line
  const handleItemChange = (index: number, field: keyof QuotationItem, value: string | number) => {
    setFormData(prev => {
      const newItems = [...prev.items];
      const cur = { ...newItems[index], [field]: value };
      
      if (field === 'quantity' || field === 'unitPrice') {
        const qty = field === 'quantity' ? Number(value) : cur.quantity;
        const price = field === 'unitPrice' ? Number(value) : cur.unitPrice;
        cur.amount = qty * price;
      }
      newItems[index] = cur;
      return { ...prev, items: newItems };
    });
  };

  // Select Item from Menu Items
  const handleSelectMenuItem = (index: number, menuItemId: string) => {
    const found = menuItems.find(m => m.id === menuItemId);
    if (found) {
      setFormData(prev => {
        const newItems = [...prev.items];
        const cur = { 
          ...newItems[index], 
          menuItemId: found.id, 
          name: found.name, 
          unitPrice: found.price,
          amount: newItems[index].quantity * found.price
        };
        newItems[index] = cur;
        return { ...prev, items: newItems };
      });
    }
  };

  // Customer Select Fill
  const handleSelectCustomer = (phone: string) => {
    const cust = customers.find(c => c.phone === phone);
    if (cust) {
      setFormData(prev => ({
        ...prev,
        customerName: cust.name,
        customerPhone: cust.phone
      }));
    }
  };

  // Filtering
  const filteredQuotations = quotations.filter(q => {
    const matchesSearch = 
      q.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      q.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (q.customerPhone && q.customerPhone.includes(searchTerm)) ||
      (q.customerTaxId && q.customerTaxId.includes(searchTerm));

    const matchesStatus = selectedStatus === 'ALL' || q.status === selectedStatus;
    return matchesSearch && matchesStatus;
  });

  // Calculate High Level Stats
  const totalCount = quotations.length;
  const totalValue = quotations.reduce((sum, q) => sum + q.grandTotal, 0);
  const acceptedCount = quotations.filter(q => q.status === 'ACCEPTED' || q.status === 'CONVERTED').length;
  const acceptedValue = quotations.filter(q => q.status === 'ACCEPTED' || q.status === 'CONVERTED').reduce((sum, q) => sum + q.grandTotal, 0);
  const pendingCount = quotations.filter(q => q.status === 'SENT' || q.status === 'DRAFT').length;

  const getStatusBadge = (status: Quotation['status']) => {
    switch (status) {
      case 'DRAFT':
        return <span className="px-2.5 py-1 bg-slate-800 text-slate-300 rounded-lg text-[10px] font-bold border border-slate-700">ร่างเอกสาร</span>;
      case 'SENT':
        return <span className="px-2.5 py-1 bg-amber-950/80 text-amber-400 rounded-lg text-[10px] font-bold border border-amber-800/50 flex items-center gap-1"><Send className="w-3 h-3" /> ส่งแล้ว</span>;
      case 'ACCEPTED':
        return <span className="px-2.5 py-1 bg-emerald-950/80 text-emerald-400 rounded-lg text-[10px] font-bold border border-emerald-800/50 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> ลูกค้าอนุมัติ</span>;
      case 'REJECTED':
        return <span className="px-2.5 py-1 bg-red-950/80 text-red-400 rounded-lg text-[10px] font-bold border border-red-800/50 flex items-center gap-1"><XCircle className="w-3 h-3" /> ไม่อนุมัติ</span>;
      case 'EXPIRED':
        return <span className="px-2.5 py-1 bg-slate-800 text-slate-400 rounded-lg text-[10px] font-bold border border-slate-700 flex items-center gap-1"><Clock className="w-3 h-3" /> หมดอายุ</span>;
      case 'CONVERTED':
        return <span className="px-2.5 py-1 bg-blue-950/80 text-blue-400 rounded-lg text-[10px] font-bold border border-blue-800/50 flex items-center gap-1"><FileCheck className="w-3 h-3" /> แปลงเป็นลูกหนี้แล้ว</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/90 border border-slate-800 p-5 rounded-2xl shadow-xl">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-gradient-to-tr from-amber-600 to-amber-500 rounded-xl text-white shadow">
              <FileText className="w-5 h-5" />
            </div>
            <h1 className="text-xl font-bold text-white tracking-tight">ใบเสนอราคา (Quotations & Catering Estimates)</h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            ออกใบเสนอราคา พิมพ์เอกสาร A4 เสนอราคาจัดเลี้ยง/ข้าวกล่ององค์กร และตั้งลูกหนี้การค้าอัตโนมัติ
          </p>
        </div>

        <button
          onClick={() => {
            resetForm();
            setShowCreateModal(true);
          }}
          className="px-4 py-2.5 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-slate-950 font-black rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg hover:shadow-amber-500/20 transition-all cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4 stroke-[3]" /> ออกใบเสนอราคาใหม่
        </button>
      </div>

      {/* Stats Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-2xl flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-400 block font-medium">ใบเสนอราคาทั้งหมด</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-black text-white font-mono">{totalCount}</span>
              <span className="text-xs text-slate-400">ฉบับ ({totalValue.toLocaleString()} {currency})</span>
            </div>
          </div>
          <div className="p-3 bg-slate-800/80 rounded-xl text-slate-300">
            <FileText className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-2xl flex items-center justify-between">
          <div>
            <span className="text-xs text-emerald-400 block font-medium">อนุมัติแล้ว / ตกลงสั่งซื้อ</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-black text-emerald-400 font-mono">{acceptedCount}</span>
              <span className="text-xs text-emerald-400/80">ฉบับ ({acceptedValue.toLocaleString()} {currency})</span>
            </div>
          </div>
          <div className="p-3 bg-emerald-950/50 text-emerald-400 rounded-xl border border-emerald-800/40">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-2xl flex items-center justify-between">
          <div>
            <span className="text-xs text-amber-400 block font-medium">รอดำเนินการ / เสนอราคา</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-black text-amber-400 font-mono">{pendingCount}</span>
              <span className="text-xs text-amber-400/80">ฉบับ</span>
            </div>
          </div>
          <div className="p-3 bg-amber-950/50 text-amber-400 rounded-xl border border-amber-800/40">
            <Clock className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="ค้นหาเลข QT, ชื่อลูกค้า, บริษัท..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-all"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
          <Filter className="w-3.5 h-3.5 text-slate-500 shrink-0 mr-1" />
          {[
            { id: 'ALL', label: 'ทั้งหมด' },
            { id: 'SENT', label: 'ส่งแล้ว' },
            { id: 'ACCEPTED', label: 'อนุมัติแล้ว' },
            { id: 'CONVERTED', label: 'เป็นลูกหนี้แล้ว' },
            { id: 'DRAFT', label: 'ร่าง' },
            { id: 'REJECTED', label: 'ปฏิเสธ' },
          ].map(st => (
            <button
              key={st.id}
              onClick={() => setSelectedStatus(st.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                selectedStatus === st.id 
                  ? 'bg-amber-500 text-slate-950 shadow' 
                  : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              {st.label}
            </button>
          ))}
        </div>
      </div>

      {/* Quotations Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs divide-y divide-slate-800">
            <thead>
              <tr className="bg-slate-950 text-slate-400 font-bold uppercase">
                <th className="p-4">เลขที่ QT / วันที่</th>
                <th className="p-4">ลูกค้า / บริษัท</th>
                <th className="p-4">สรุปรายการเสนอราคา</th>
                <th className="p-4 text-right">ยอดเงินรวมสุทธิ</th>
                <th className="p-4 text-center">สถานะ</th>
                <th className="p-4 text-right">การจัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-850 text-slate-300">
              {filteredQuotations.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-12 text-center text-slate-500">
                    <FileText className="w-8 h-8 text-slate-600 mx-auto mb-2 opacity-50" />
                    ไม่พบรายการใบเสนอราคาที่ค้นหา
                  </td>
                </tr>
              ) : (
                filteredQuotations.map(qt => (
                  <tr key={qt.id} className="hover:bg-slate-850/30 transition-colors">
                    <td className="p-4">
                      <span className="font-bold text-white block font-mono text-xs">{qt.id}</span>
                      <span className="text-[10px] text-slate-500 font-mono">
                        ออกเมื่อ: {qt.issueDate} | หมดอายุ: {qt.validUntilDate}
                      </span>
                    </td>

                    <td className="p-4">
                      <span className="font-bold text-slate-200 block">{qt.customerName}</span>
                      <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5">
                        {qt.customerPhone && <span className="flex items-center gap-0.5"><Phone className="w-3 h-3 text-slate-500" /> {qt.customerPhone}</span>}
                        {qt.customerTaxId && <span className="font-mono text-slate-500">TAX: {qt.customerTaxId}</span>}
                      </div>
                    </td>

                    <td className="p-4 max-w-xs">
                      <p className="truncate text-slate-300 text-xs">
                        {qt.items.map(i => `${i.name} x${i.quantity}`).join(', ')}
                      </p>
                      <span className="text-[10px] text-slate-500">({qt.items.length} รายการ)</span>
                    </td>

                    <td className="p-4 text-right">
                      <span className="font-bold font-mono text-sm text-emerald-400 block">
                        {qt.grandTotal.toLocaleString()} {currency}
                      </span>
                      <span className="text-[10px] text-slate-500">
                        {qt.vatType === 'INCLUSIVE' ? 'รวม VAT 7%' : qt.vatType === 'EXCLUSIVE' ? '+ VAT 7%' : 'ไม่มี VAT'}
                      </span>
                    </td>

                    <td className="p-4 text-center">
                      <div className="flex flex-col items-center gap-1">
                        {getStatusBadge(qt.status)}
                        {/* Status Change Selector */}
                        <select
                          value={qt.status}
                          onChange={(e) => handleUpdateStatus(qt.id, e.target.value as Quotation['status'])}
                          className="bg-slate-950 border border-slate-800 text-[10px] text-slate-400 rounded-lg px-1.5 py-0.5 mt-1 focus:outline-none"
                        >
                          <option value="DRAFT">ร่าง</option>
                          <option value="SENT">ส่งแล้ว</option>
                          <option value="ACCEPTED">อนุมัติแล้ว</option>
                          <option value="REJECTED">ไม่อนุมัติ</option>
                          <option value="EXPIRED">หมดอายุ</option>
                        </select>
                      </div>
                    </td>

                    <td className="p-4 text-right space-x-1 whitespace-nowrap">
                      {/* Preview / Print */}
                      <button
                        onClick={() => setPreviewQuotation(qt)}
                        title="พิมพ์เอกสาร A4 / ดูตัวอย่าง"
                        className="p-1.5 bg-slate-800 hover:bg-slate-700 text-amber-400 rounded-lg transition-colors cursor-pointer"
                      >
                        <Eye className="w-4 h-4" />
                      </button>

                      {/* Convert to Trade Receivable */}
                      {qt.status !== 'CONVERTED' && (
                        <button
                          onClick={() => setConvertingQuotation(qt)}
                          title="แปลงเป็นลูกหนี้การค้าในระบบการเงิน"
                          className="p-1.5 bg-emerald-950 hover:bg-emerald-900 border border-emerald-800/60 text-emerald-400 rounded-lg transition-colors cursor-pointer"
                        >
                          <ArrowRight className="w-4 h-4" />
                        </button>
                      )}

                      {/* Edit */}
                      <button
                        onClick={() => handleOpenEdit(qt)}
                        title="แก้ไขใบเสนอราคา"
                        className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors cursor-pointer"
                      >
                        <Edit className="w-4 h-4" />
                      </button>

                      {/* Delete */}
                      <button
                        onClick={() => handleDeleteQuotation(qt.id)}
                        title="ลบ"
                        className="p-1.5 bg-slate-800 hover:bg-red-950 text-slate-400 hover:text-red-400 rounded-lg transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CREATE / EDIT MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl p-6 my-8">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-amber-400" />
                <h2 className="text-lg font-bold text-white">
                  {editingQuotation ? `แก้ไขใบเสนอราคา (${editingQuotation.id})` : 'ออกใบเสนอราคาใหม่ (New Quotation)'}
                </h2>
              </div>
              <button
                onClick={() => { setShowCreateModal(false); resetForm(); }}
                className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveQuotation} className="space-y-6 mt-4">
              {/* Customer Info Section */}
              <div className="bg-slate-950/80 border border-slate-800 p-4 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                    <User className="w-4 h-4" /> ข้อมูลลูกค้า / ผู้เสนอราคา
                  </span>
                  
                  {/* Quick Select Existing Customer */}
                  {customers.length > 0 && (
                    <select
                      onChange={(e) => handleSelectCustomer(e.target.value)}
                      defaultValue=""
                      className="bg-slate-900 border border-slate-700 text-xs text-slate-300 rounded-lg px-2 py-1 focus:outline-none"
                    >
                      <option value="" disabled>-- เลือกจากรายชื่อสมาชิก CRM --</option>
                      {customers.map(c => (
                        <option key={c.id} value={c.phone}>{c.name} ({c.phone})</option>
                      ))}
                    </select>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="text-slate-400 block mb-1 font-medium">ชื่อลูกค้า / บริษัท *</label>
                    <input
                      type="text"
                      required
                      placeholder="เช่น บจก. เอสซีจี แพคเกจจิ้ง หรือ คุณสมชาย"
                      value={formData.customerName}
                      onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-white focus:border-amber-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-slate-400 block mb-1 font-medium">เบอร์โทรศัพท์ติดต่อ</label>
                    <input
                      type="text"
                      placeholder="081-234-5678"
                      value={formData.customerPhone}
                      onChange={(e) => setFormData({ ...formData, customerPhone: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-white focus:border-amber-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-slate-400 block mb-1 font-medium">อีเมล</label>
                    <input
                      type="email"
                      placeholder="contact@company.com"
                      value={formData.customerEmail}
                      onChange={(e) => setFormData({ ...formData, customerEmail: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-white focus:border-amber-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-slate-400 block mb-1 font-medium">เลขประจำตัวผู้เสียภาษี (Tax ID)</label>
                    <input
                      type="text"
                      placeholder="0105558000000"
                      value={formData.customerTaxId}
                      onChange={(e) => setFormData({ ...formData, customerTaxId: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-white focus:border-amber-500 focus:outline-none"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="text-slate-400 block mb-1 font-medium">ที่อยู่ / สถานที่จัดส่ง</label>
                    <input
                      type="text"
                      placeholder="123/45 ถนนบรรทัดทอง เขตปทุมวัน กรุงเทพฯ"
                      value={formData.customerAddress}
                      onChange={(e) => setFormData({ ...formData, customerAddress: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-white focus:border-amber-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-2 border-t border-slate-850">
                  <div>
                    <label className="text-slate-400 block mb-1 font-medium">วันที่ออกเอกสาร</label>
                    <input
                      type="date"
                      value={formData.issueDate}
                      onChange={(e) => setFormData({ ...formData, issueDate: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-white focus:border-amber-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-slate-400 block mb-1 font-medium">กำหนดยืนยันถึงวันที่ (Valid Until)</label>
                    <input
                      type="date"
                      value={formData.validUntilDate}
                      onChange={(e) => setFormData({ ...formData, validUntilDate: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-white focus:border-amber-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Items Section */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                    <ShoppingBag className="w-4 h-4" /> รายการสินค้า / ค่าบริการ
                  </span>
                  <button
                    type="button"
                    onClick={handleAddItem}
                    className="px-2.5 py-1 bg-amber-500/10 border border-amber-500/30 text-amber-400 hover:bg-amber-500/20 text-xs font-bold rounded-lg flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" /> เพิ่มแถวรายการ
                  </button>
                </div>

                <div className="space-y-2">
                  {formData.items.map((item, idx) => (
                    <div key={item.id} className="bg-slate-950 border border-slate-800 p-3 rounded-xl grid grid-cols-12 gap-2 items-center text-xs">
                      {/* Quick Menu Select */}
                      <div className="col-span-12 sm:col-span-5 space-y-1">
                        <div className="flex gap-1">
                          <input
                            type="text"
                            placeholder="ชื่อสินค้า / ค่าบริการ..."
                            value={item.name}
                            onChange={(e) => handleItemChange(idx, 'name', e.target.value)}
                            className="flex-1 bg-slate-900 border border-slate-800 rounded-lg p-2 text-white focus:border-amber-500 focus:outline-none"
                          />
                          {menuItems.length > 0 && (
                            <select
                              onChange={(e) => handleSelectMenuItem(idx, e.target.value)}
                              value=""
                              className="bg-slate-900 border border-slate-800 text-slate-400 rounded-lg px-2 text-[11px] focus:outline-none w-28 shrink-0"
                            >
                              <option value="" disabled>+เลือกเมนู</option>
                              {menuItems.map(m => (
                                <option key={m.id} value={m.id}>{m.name} ({m.price}฿)</option>
                              ))}
                            </select>
                          )}
                        </div>
                      </div>

                      {/* Qty */}
                      <div className="col-span-4 sm:col-span-2">
                        <label className="text-[10px] text-slate-500 block sm:hidden">จำนวน</label>
                        <input
                          type="number"
                          min="1"
                          placeholder="จำนวน"
                          value={item.quantity}
                          onChange={(e) => handleItemChange(idx, 'quantity', e.target.value)}
                          className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-center text-white focus:border-amber-500 focus:outline-none font-mono"
                        />
                      </div>

                      {/* Unit Price */}
                      <div className="col-span-4 sm:col-span-2">
                        <label className="text-[10px] text-slate-500 block sm:hidden">ราคา/หน่วย</label>
                        <input
                          type="number"
                          min="0"
                          placeholder="ราคา/หน่วย"
                          value={item.unitPrice}
                          onChange={(e) => handleItemChange(idx, 'unitPrice', e.target.value)}
                          className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-right text-white focus:border-amber-500 focus:outline-none font-mono"
                        />
                      </div>

                      {/* Line Amount */}
                      <div className="col-span-3 sm:col-span-2 text-right font-mono font-bold text-amber-400">
                        {(item.quantity * item.unitPrice).toLocaleString()} ฿
                      </div>

                      {/* Remove Button */}
                      <div className="col-span-1 text-right">
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(idx)}
                          className="p-1.5 hover:bg-red-950/50 text-slate-500 hover:text-red-400 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Financial Calculation Summary */}
              <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Left Notes & VAT */}
                  <div className="space-y-3 text-xs">
                    <div>
                      <label className="text-slate-400 block mb-1 font-medium">ประเภทภาษีมูลค่าเพิ่ม (VAT)</label>
                      <select
                        value={formData.vatType}
                        onChange={(e) => setFormData({ ...formData, vatType: e.target.value as Quotation['vatType'] })}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-white focus:border-amber-500 focus:outline-none"
                      >
                        <option value="INCLUSIVE">รวมภาษีมูลค่าเพิ่ม 7% (VAT Inclusive)</option>
                        <option value="EXCLUSIVE">แยกภาษีมูลค่าเพิ่ม 7% (VAT Exclusive)</option>
                        <option value="NO_VAT">ไม่มีภาษีมูลค่าเพิ่ม (No VAT)</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-slate-400 block mb-1 font-medium">เงื่อนไขการชำระเงิน & หมายเหตุท้ายเอกสาร</label>
                      <textarea
                        rows={3}
                        value={formData.notes}
                        onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-white text-xs focus:border-amber-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Right Price Totals */}
                  <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-xl space-y-2 text-xs">
                    <div className="flex justify-between text-slate-400">
                      <span>ยอดรวมรายการ (Subtotal):</span>
                      <span className="font-mono">{formSubtotal.toLocaleString()} ฿</span>
                    </div>

                    <div className="flex justify-between items-center text-slate-400">
                      <span>ส่วนลดเพิ่มเติม (Discount):</span>
                      <input
                        type="number"
                        min="0"
                        value={formData.discount}
                        onChange={(e) => setFormData({ ...formData, discount: Number(e.target.value) })}
                        className="w-28 bg-slate-950 border border-slate-800 rounded-lg p-1 text-right text-white font-mono focus:border-amber-500 focus:outline-none"
                      />
                    </div>

                    {formData.vatType !== 'NO_VAT' && (
                      <div className="flex justify-between text-slate-400">
                        <span>ภาษีมูลค่าเพิ่ม (VAT 7%):</span>
                        <span className="font-mono text-amber-400/90">{formVatAmount.toLocaleString()} ฿</span>
                      </div>
                    )}

                    <div className="border-t border-slate-800 pt-2 flex justify-between items-center">
                      <span className="font-bold text-white text-sm">ยอดเงินสุทธิ (Grand Total):</span>
                      <span className="font-mono text-lg font-black text-amber-400">
                        {formGrandTotal.toLocaleString()} {currency}
                      </span>
                    </div>

                    <div className="text-[11px] text-slate-400 bg-slate-950/80 p-2 rounded-lg font-medium text-center text-amber-300">
                      ({thaiBahtText(formGrandTotal)})
                    </div>
                  </div>
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => { setShowCreateModal(false); resetForm(); }}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-xs transition-colors"
                >
                  ยกเลิก
                </button>

                <button
                  type="submit"
                  className="px-6 py-2 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-slate-950 font-black rounded-xl text-xs flex items-center gap-2 shadow-lg transition-all"
                >
                  <Check className="w-4 h-4 stroke-[3]" />
                  {editingQuotation ? 'บันทึกการแก้ไข' : 'ยืนยันออกใบเสนอราคา'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PRINTABLE / FORMAL A4 PREVIEW MODAL */}
      {previewQuotation && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-3xl max-h-[95vh] overflow-y-auto shadow-2xl p-4 sm:p-6 my-4">
            {/* Modal Controls Bar */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-800 no-print">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-amber-400" />
                <span className="text-sm font-bold text-white">
                  ตัวอย่างใบเสนอราคา A4 ({previewQuotation.id})
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-1.5 shadow transition-all cursor-pointer"
                >
                  <Printer className="w-4 h-4" /> พิมพ์เอกสาร A4 / PDF
                </button>

                <button
                  onClick={() => setPreviewQuotation(null)}
                  className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* A4 PRINT CONTAINER (STYLING FOR PAPER LOOK) */}
            <div id="printable-quotation-document" className="bg-white text-slate-900 p-8 sm:p-10 rounded-xl shadow-2xl my-4 text-xs font-sans space-y-6">
              {/* Header Company & Doc Title */}
              <div className="flex flex-col sm:flex-row justify-between items-start gap-4 border-b border-slate-300 pb-6">
                <div>
                  <h1 className="text-lg font-black text-slate-900 tracking-tight">{storeSettings.storeName}</h1>
                  <p className="text-slate-600 mt-1 whitespace-pre-line text-[11px] leading-relaxed">
                    {storeSettings.receiptHeader || 'สาขาบรรทัดทอง ปทุมวัน กรุงเทพฯ\nโทร. 081-123-4567'}
                  </p>
                  {storeSettings.storeTaxId && (
                    <p className="text-slate-600 font-mono text-[11px] mt-0.5">เลขประจำตัวผู้เสียภาษี: {storeSettings.storeTaxId}</p>
                  )}
                </div>

                <div className="text-right sm:text-right">
                  <h2 className="text-xl font-black text-amber-600 uppercase tracking-widest">ใบเสนอราคา</h2>
                  <h3 className="text-xs font-bold text-slate-500 tracking-widest uppercase font-mono">QUOTATION</h3>
                  <div className="mt-3 bg-slate-100 p-2.5 rounded-lg border border-slate-200 text-[11px] space-y-1 font-mono">
                    <div><span className="font-bold text-slate-700">เลขที่ / NO:</span> {previewQuotation.id}</div>
                    <div><span className="font-bold text-slate-700">วันที่ / DATE:</span> {previewQuotation.issueDate}</div>
                    <div><span className="font-bold text-slate-700">กำหนดยืนยันถึง:</span> {previewQuotation.validUntilDate}</div>
                  </div>
                </div>
              </div>

              {/* Customer Info Box */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-3 text-[11px]">
                <div>
                  <span className="font-bold text-slate-800 block text-xs mb-1">ชื่อและที่อยู่ลูกค้า (CUSTOMER INFO):</span>
                  <p className="font-bold text-slate-900 text-sm">{previewQuotation.customerName}</p>
                  {previewQuotation.customerAddress && (
                    <p className="text-slate-600 mt-0.5">{previewQuotation.customerAddress}</p>
                  )}
                  {previewQuotation.customerPhone && (
                    <p className="text-slate-600 mt-0.5">โทรศัพท์: {previewQuotation.customerPhone}</p>
                  )}
                  {previewQuotation.customerTaxId && (
                    <p className="text-slate-600 font-mono mt-0.5">เลขผู้เสียภาษี: {previewQuotation.customerTaxId}</p>
                  )}
                </div>

                <div className="sm:text-right flex flex-col justify-end">
                  <p className="text-slate-500">ผู้จัดทำเอกสาร: <span className="font-bold text-slate-800">{previewQuotation.preparedBy || 'ผู้จัดการ'}</span></p>
                  <p className="text-slate-500 mt-0.5">สถานะ: <span className="font-bold text-amber-700">{previewQuotation.status}</span></p>
                </div>
              </div>

              {/* Items Table */}
              <div className="border border-slate-300 rounded-lg overflow-hidden">
                <table className="w-full text-left text-[11px] divide-y divide-slate-300">
                  <thead className="bg-slate-100 font-bold text-slate-700 uppercase">
                    <tr>
                      <th className="p-3 text-center w-12">ลำดับ</th>
                      <th className="p-3">รายการสินค้า / ค่าบริการ</th>
                      <th className="p-3 text-center w-20">จำนวน</th>
                      <th className="p-3 text-right w-24">ราคา/หน่วย</th>
                      <th className="p-3 text-right w-28">จำนวนเงิน</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {previewQuotation.items.map((item, idx) => (
                      <tr key={item.id}>
                        <td className="p-3 text-center font-mono text-slate-500">{idx + 1}</td>
                        <td className="p-3">
                          <span className="font-bold text-slate-900">{item.name}</span>
                          {item.note && <span className="block text-[10px] text-slate-500">{item.note}</span>}
                        </td>
                        <td className="p-3 text-center font-mono text-slate-800">{item.quantity}</td>
                        <td className="p-3 text-right font-mono text-slate-800">{item.unitPrice.toLocaleString()}</td>
                        <td className="p-3 text-right font-mono font-bold text-slate-900">{item.amount.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Totals & Baht Text */}
              <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                {/* Left Notes & Baht text */}
                <div className="flex-1 space-y-2">
                  <div className="bg-amber-50 border border-amber-200 p-2.5 rounded-lg text-amber-900 font-bold text-center text-xs">
                    จำนวนเงินตัวอักษร: {thaiBahtText(previewQuotation.grandTotal)}
                  </div>

                  {previewQuotation.notes && (
                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-[11px] text-slate-600">
                      <span className="font-bold text-slate-800 block mb-0.5">เงื่อนไขและการชำระเงิน:</span>
                      <p className="whitespace-pre-line leading-relaxed">{previewQuotation.notes}</p>
                    </div>
                  )}
                </div>

                {/* Right Totals Box */}
                <div className="w-full sm:w-64 bg-slate-50 p-3.5 rounded-lg border border-slate-300 space-y-1.5 text-[11px]">
                  <div className="flex justify-between text-slate-600">
                    <span>ยอดรวมสินค้า:</span>
                    <span className="font-mono">{previewQuotation.subtotal.toLocaleString()} ฿</span>
                  </div>

                  {previewQuotation.discount > 0 && (
                    <div className="flex justify-between text-red-600">
                      <span>ส่วนลด:</span>
                      <span className="font-mono">-{previewQuotation.discount.toLocaleString()} ฿</span>
                    </div>
                  )}

                  {previewQuotation.vatType !== 'NO_VAT' && (
                    <div className="flex justify-between text-slate-600">
                      <span>ภาษีมูลค่าเพิ่ม 7%:</span>
                      <span className="font-mono">{previewQuotation.vatAmount.toLocaleString()} ฿</span>
                    </div>
                  )}

                  <div className="border-t border-slate-300 pt-1.5 flex justify-between font-bold text-slate-900 text-sm">
                    <span>ยอดรวมสุทธิ:</span>
                    <span className="font-mono text-amber-600">{previewQuotation.grandTotal.toLocaleString()} {currency}</span>
                  </div>
                </div>
              </div>

              {/* Signatures */}
              <div className="pt-8 border-t border-slate-300 grid grid-cols-2 gap-8 text-[11px] text-center">
                <div>
                  <div className="h-12 border-b border-dashed border-slate-400"></div>
                  <p className="mt-2 font-bold text-slate-800">({previewQuotation.preparedBy || 'ผู้จัดทำเอกสาร'})</p>
                  <p className="text-slate-500">ผู้เสนอราคา / Authorized Signature</p>
                  <p className="text-slate-400 text-[10px] mt-1">วันที่ ..... / ..... / ..........</p>
                </div>

                <div>
                  <div className="h-12 border-b border-dashed border-slate-400"></div>
                  <p className="mt-2 font-bold text-slate-800">({previewQuotation.customerName})</p>
                  <p className="text-slate-500">ผู้อนุมัติสั่งซื้อ / Customer Acceptance</p>
                  <p className="text-slate-400 text-[10px] mt-1">วันที่ ..... / ..... / ..........</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CONVERT TO TRADE RECEIVABLE CONFIRMATION MODAL */}
      {convertingQuotation && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-emerald-950 text-emerald-400 border border-emerald-800/60 rounded-xl">
                <FileCheck className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">แปลงใบเสนอราคาเป็นลูกหนี้การค้า</h3>
                <p className="text-xs text-slate-400">สร้างระเบียนลูกหนี้ในระบบการเงินอัตโนมัติ</p>
              </div>
            </div>

            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-xs space-y-2 font-mono">
              <div className="flex justify-between text-slate-400">
                <span>เลขที่ใบเสนอราคา:</span>
                <span className="text-white font-bold">{convertingQuotation.id}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>ชื่อลูกค้า/บริษัท:</span>
                <span className="text-white font-bold truncate max-w-[180px]">{convertingQuotation.customerName}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>ยอดเงินตั้งลูกหนี้:</span>
                <span className="text-emerald-400 font-bold text-sm">{convertingQuotation.grandTotal.toLocaleString()} {currency}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>กำหนดชำระเงิน:</span>
                <span className="text-amber-400 font-bold">{convertingQuotation.validUntilDate}</span>
              </div>
            </div>

            <p className="text-xs text-slate-400">
              เมื่อกดยืนยัน ระบบจะตั้งลูกหนี้การค้า (Trade Receivable) ในเมนูสมุดบัญชีการเงิน และเปลี่ยนสถานะใบเสนอราคาเป็น "แปลงเป็นลูกหนี้แล้ว"
            </p>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setConvertingQuotation(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-xs"
              >
                ยกเลิก
              </button>
              <button
                onClick={() => handleConfirmConvert(convertingQuotation)}
                className="px-5 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow"
              >
                <Check className="w-4 h-4" /> ยืนยันตั้งลูกหนี้การค้า
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
