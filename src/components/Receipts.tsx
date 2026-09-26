import React, { useState } from 'react';
import { 
  Receipt, Plus, Search, Filter, CheckCircle2, XCircle, Clock, 
  Printer, Download, Edit, Trash2, ArrowRight, User, Building, 
  Phone, Mail, MapPin, Send, Calendar, DollarSign, Check, X, 
  FileCheck, Eye, Tag, AlertCircle, ShoppingBag, CreditCard, Ban, FileText
} from 'lucide-react';
import { OfficialReceipt, OfficialReceiptItem, Customer, MenuItem, StoreSettings, User as UserType, Order, Quotation, OtherIncome } from '../types';

interface ReceiptsProps {
  receipts: OfficialReceipt[];
  onUpdateReceipts: (updated: OfficialReceipt[]) => void;
  customers: Customer[];
  menuItems: MenuItem[];
  orders: Order[];
  quotations: Quotation[];
  storeSettings: StoreSettings;
  currentUser: UserType;
  currency: string;
  activeBranchId: string;
  onAddOtherIncome?: (newIncome: OtherIncome) => void;
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

export const ReceiptsComponent: React.FC<ReceiptsProps> = ({
  receipts,
  onUpdateReceipts,
  customers,
  menuItems,
  orders,
  quotations,
  storeSettings,
  currentUser,
  currency,
  activeBranchId,
  onAddOtherIncome
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<string>('ALL');
  
  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingReceipt, setEditingReceipt] = useState<OfficialReceipt | null>(null);
  const [previewReceipt, setPreviewReceipt] = useState<OfficialReceipt | null>(null);
  const [previewFormat, setPreviewFormat] = useState<'A4' | 'SLIP'>('A4');
  const [cancelModalReceipt, setCancelModalReceipt] = useState<OfficialReceipt | null>(null);
  const [cancelReason, setCancelReason] = useState('');

  // Form State
  const [formData, setFormData] = useState<{
    id?: string;
    receiptType: 'FULL_TAX' | 'OFFICIAL_RECEIPT' | 'SIMPLIFIED';
    customerName: string;
    customerPhone: string;
    customerEmail: string;
    customerAddress: string;
    customerTaxId: string;
    customerBranch: string;
    issueDate: string;
    items: OfficialReceiptItem[];
    discount: number;
    serviceCharge: number;
    vatType: 'INCLUSIVE' | 'EXCLUSIVE' | 'NO_VAT';
    withholdingTaxRate: number; // 0, 1, 3, 5
    paymentMethod: 'CASH' | 'PROMPTPAY' | 'TRANSFER' | 'CREDIT_CARD' | 'AR_CREDIT';
    paymentRef: string;
    notes: string;
    issuerName: string;
    soNumber: string;
    autoRecordIncome: boolean;
  }>({
    receiptType: 'FULL_TAX',
    customerName: '',
    customerPhone: '',
    customerEmail: '',
    customerAddress: '',
    customerTaxId: '',
    customerBranch: 'สำนักงานใหญ่',
    soNumber: '',
    issueDate: new Date().toISOString().split('T')[0],
    items: [
      { id: `rci-${Date.now()}-1`, name: '', quantity: 1, unitPrice: 0, amount: 0 }
    ],
    discount: 0,
    serviceCharge: 0,
    vatType: storeSettings.vatType || 'INCLUSIVE',
    withholdingTaxRate: 0,
    paymentMethod: 'TRANSFER',
    paymentRef: '',
    notes: 'ได้รับเงินชำระครบถ้วนแล้ว ขอบคุณที่ใช้บริการ',
    issuerName: currentUser?.name || 'ผู้จัดการ',
    autoRecordIncome: false
  });

  // Calculate Form Financials
  const calculateFormTotals = () => {
    const rawSubtotal = formData.items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
    const afterDiscount = Math.max(0, rawSubtotal - formData.discount + formData.serviceCharge);
    
    let vatAmount = 0;
    let grandTotal = afterDiscount;
    let preVatBase = afterDiscount;

    if (formData.vatType === 'INCLUSIVE') {
      vatAmount = Number(((afterDiscount * 7) / 107).toFixed(2));
      preVatBase = afterDiscount - vatAmount;
      grandTotal = afterDiscount;
    } else if (formData.vatType === 'EXCLUSIVE') {
      vatAmount = Number((afterDiscount * 0.07).toFixed(2));
      preVatBase = afterDiscount;
      grandTotal = afterDiscount + vatAmount;
    } else {
      vatAmount = 0;
      preVatBase = afterDiscount;
      grandTotal = afterDiscount;
    }

    // Withholding Tax calculation (calculated on pre-vat base)
    const withholdingTaxAmount = Number(((preVatBase * formData.withholdingTaxRate) / 100).toFixed(2));
    const netPaidAmount = Number((grandTotal - withholdingTaxAmount).toFixed(2));

    return { subtotal: rawSubtotal, preVatBase, vatAmount, grandTotal, withholdingTaxAmount, netPaidAmount };
  };

  const { subtotal: formSubtotal, preVatBase: formPreVat, vatAmount: formVatAmount, grandTotal: formGrandTotal, withholdingTaxAmount: formWhtAmount, netPaidAmount: formNetPaid } = calculateFormTotals();

  // Reset Form
  const resetForm = () => {
    setFormData({
      receiptType: 'FULL_TAX',
      customerName: '',
      customerPhone: '',
      customerEmail: '',
      customerAddress: '',
      customerTaxId: '',
      customerBranch: 'สำนักงานใหญ่',
      soNumber: '',
      issueDate: new Date().toISOString().split('T')[0],
      items: [
        { id: `rci-${Date.now()}-1`, name: '', quantity: 1, unitPrice: 0, amount: 0 }
      ],
      discount: 0,
      serviceCharge: 0,
      vatType: storeSettings.vatType || 'INCLUSIVE',
      withholdingTaxRate: 0,
      paymentMethod: 'TRANSFER',
      paymentRef: '',
      notes: 'ได้รับเงินชำระครบถ้วนแล้ว ขอบคุณที่ใช้บริการ',
      issuerName: currentUser?.name || 'ผู้จัดการ',
      autoRecordIncome: false
    });
    setEditingReceipt(null);
  };

  // Open Edit
  const handleOpenEdit = (rc: OfficialReceipt) => {
    setEditingReceipt(rc);
    setFormData({
      id: rc.id,
      receiptType: rc.receiptType,
      customerName: rc.customerName,
      customerPhone: rc.customerPhone || '',
      customerEmail: rc.customerEmail || '',
      customerAddress: rc.customerAddress || '',
      customerTaxId: rc.customerTaxId || '',
      customerBranch: rc.customerBranch || 'สำนักงานใหญ่',
      soNumber: rc.soNumber || '',
      issueDate: rc.issueDate,
      items: rc.items.length > 0 ? rc.items : [{ id: `rci-${Date.now()}-1`, name: '', quantity: 1, unitPrice: 0, amount: 0 }],
      discount: rc.discount,
      serviceCharge: rc.serviceCharge || 0,
      vatType: rc.vatType,
      withholdingTaxRate: rc.withholdingTaxRate || 0,
      paymentMethod: rc.paymentMethod,
      paymentRef: rc.paymentRef || '',
      notes: rc.notes || '',
      issuerName: rc.issuerName || currentUser?.name || 'ผู้จัดการ',
      autoRecordIncome: false
    });
    setShowCreateModal(true);
  };

  // Quick pull from POS Order
  const handlePullOrder = (orderId: string) => {
    const order = orders.find(o => o.id === orderId);
    if (!order) return;

    setFormData(prev => ({
      ...prev,
      receiptType: order.taxInvoice ? 'FULL_TAX' : 'SIMPLIFIED',
      customerName: order.taxInvoice?.customerName || order.customerName || `ลูกค้าบิล ${order.id}`,
      customerPhone: order.customerPhone || '',
      customerAddress: order.taxInvoice?.customerAddress || '',
      customerTaxId: order.taxInvoice?.customerTaxId || '',
      customerBranch: order.taxInvoice?.customerBranch || 'สำนักงานใหญ่',
      soNumber: order.soNumber || `SO-${order.id.replace('TX-', '')}`,
      items: order.items.map(i => {
        const itemPrice = i.price + (i.addFriedEgg ? (i.eggPrice || 0) : 0);
        const itemName = (i.name || 'สินค้า') + (i.addFriedEgg ? ' (+ไข่ดาว)' : '');
        return {
          id: `rci-ord-${i.id}`,
          name: itemName,
          quantity: i.quantity,
          unitPrice: itemPrice,
          amount: i.quantity * itemPrice
        };
      }),
      discount: order.discount || 0,
      serviceCharge: order.serviceChargeAmount || 0,
      vatType: order.vatType || 'INCLUSIVE',
      paymentMethod: (order.paymentMethod === 'CASH' || order.paymentMethod === 'PROMPTPAY' || order.paymentMethod === 'TRANSFER' || order.paymentMethod === 'CREDIT_CARD' || order.paymentMethod === 'AR_CREDIT') ? order.paymentMethod : 'CASH',
      notes: `ออกใบเสร็จรับเงินสำหรับออเดอร์ ${order.id} (${order.tableNo === 'TakeAway' ? 'ทานกลับบ้าน' : 'โต๊ะ ' + order.tableNo})`
    }));
  };

  // Quick pull from Quotation
  const handlePullQuotation = (quotationId: string) => {
    const qt = quotations.find(q => q.id === quotationId);
    if (!qt) return;

    setFormData(prev => ({
      ...prev,
      receiptType: 'FULL_TAX',
      customerName: qt.customerName,
      customerPhone: qt.customerPhone || '',
      customerEmail: qt.customerEmail || '',
      customerAddress: qt.customerAddress || '',
      customerTaxId: qt.customerTaxId || '',
      soNumber: `SO-QT-${qt.id}`,
      items: qt.items.map(i => ({
        id: `rci-qt-${i.id}`,
        name: i.name,
        quantity: i.quantity,
        unitPrice: i.unitPrice,
        amount: i.amount
      })),
      discount: qt.discount,
      vatType: qt.vatType,
      notes: `อ้างอิงใบเสนอราคาเลขที่ ${qt.id}`
    }));
  };

  // Save Receipt (Create or Edit)
  const handleSaveReceipt = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.customerName.trim()) {
      alert('กรุณากรอกชื่อลูกค้า / บริษัท');
      return;
    }

    if (formData.items.length === 0 || !formData.items.some(i => i.name.trim() && i.amount > 0)) {
      alert('กรุณาเพิ่มรายการสินค้าหรือบริการอย่างน้อย 1 รายการ');
      return;
    }

    const { subtotal, vatAmount, grandTotal, withholdingTaxAmount, netPaidAmount } = calculateFormTotals();

    if (editingReceipt) {
      const updatedList = receipts.map(r => {
        if (r.id === editingReceipt.id) {
          return {
            ...r,
            receiptType: formData.receiptType,
            customerName: formData.customerName,
            customerPhone: formData.customerPhone,
            customerEmail: formData.customerEmail,
            customerAddress: formData.customerAddress,
            customerTaxId: formData.customerTaxId,
            customerBranch: formData.customerBranch,
            soNumber: formData.soNumber.trim() || `SO-${editingReceipt.id}`,
            issueDate: formData.issueDate,
            items: formData.items.filter(i => i.name.trim() !== ''),
            subtotal,
            discount: formData.discount,
            serviceCharge: formData.serviceCharge,
            vatType: formData.vatType,
            vatRate: formData.vatType === 'NO_VAT' ? 0 : 7,
            vatAmount,
            grandTotal,
            withholdingTaxRate: formData.withholdingTaxRate,
            withholdingTaxAmount,
            netPaidAmount,
            paymentMethod: formData.paymentMethod,
            paymentRef: formData.paymentRef,
            notes: formData.notes,
            issuerName: formData.issuerName
          };
        }
        return r;
      });
      onUpdateReceipts(updatedList);
      alert(`แก้ไขใบเสร็จรับเงิน ${editingReceipt.id} สำเร็จ!`);
    } else {
      // Create New
      const prefix = formData.receiptType === 'FULL_TAX' ? 'TAX' : 'RC';
      const nextNum = receipts.length + 1;
      const rcId = `${prefix}-${new Date().getFullYear()}-${String(nextNum).padStart(3, '0')}`;

      const newRc: OfficialReceipt = {
        id: rcId,
        receiptType: formData.receiptType,
        customerName: formData.customerName,
        customerPhone: formData.customerPhone,
        customerEmail: formData.customerEmail,
        customerAddress: formData.customerAddress,
        customerTaxId: formData.customerTaxId,
        customerBranch: formData.customerBranch,
        soNumber: formData.soNumber.trim() || `SO-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${rcId.replace(/[^0-9]/g, '').slice(-3)}`,
        issueDate: formData.issueDate,
        items: formData.items.filter(i => i.name.trim() !== ''),
        subtotal,
        discount: formData.discount,
        serviceCharge: formData.serviceCharge,
        vatType: formData.vatType,
        vatRate: formData.vatType === 'NO_VAT' ? 0 : 7,
        vatAmount,
        grandTotal,
        withholdingTaxRate: formData.withholdingTaxRate,
        withholdingTaxAmount,
        netPaidAmount,
        paymentMethod: formData.paymentMethod,
        paymentRef: formData.paymentRef,
        status: 'ISSUED',
        notes: formData.notes,
        issuerName: formData.issuerName,
        branchId: activeBranchId || 'b1',
        createdAt: new Date().toISOString()
      };

      onUpdateReceipts([newRc, ...receipts]);

      // Auto Record to Accounting Income if checked
      if (formData.autoRecordIncome && onAddOtherIncome) {
        const newIncome: OtherIncome = {
          id: `inc-rc-${Date.now()}`,
          category: 'Catering',
          amount: grandTotal,
          description: `รายรับตามใบเสร็จ ${rcId} (${formData.customerName})`,
          date: formData.issueDate,
          branchId: activeBranchId || 'b1',
          vatAmount,
          vatType: formData.vatType
        };
        onAddOtherIncome(newIncome);
      }

      alert(`ออกใบเสร็จรับเงิน ${rcId} สำเร็จ!`);
    }

    setShowCreateModal(false);
    resetForm();
  };

  // Cancel Receipt
  const handleConfirmCancel = () => {
    if (!cancelModalReceipt) return;
    if (!cancelReason.trim()) {
      alert('กรุณาระบุเหตุผลการยกเลิกใบเสร็จ');
      return;
    }

    const updated = receipts.map(r => {
      if (r.id === cancelModalReceipt.id) {
        return {
          ...r,
          status: 'CANCELLED' as const,
          cancelReason: cancelReason.trim()
        };
      }
      return r;
    });

    onUpdateReceipts(updated);
    setCancelModalReceipt(null);
    setCancelReason('');
    alert(`ยกเลิกใบเสร็จเลขที่ ${cancelModalReceipt.id} เรียบร้อยแล้ว`);
  };

  // Item Lines
  const handleAddItem = () => {
    setFormData(prev => ({
      ...prev,
      items: [
        ...prev.items,
        { id: `rci-${Date.now()}-${prev.items.length + 1}`, name: '', quantity: 1, unitPrice: 0, amount: 0 }
      ]
    }));
  };

  const handleRemoveItem = (index: number) => {
    if (formData.items.length <= 1) return;
    setFormData(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }));
  };

  const handleItemChange = (index: number, field: keyof OfficialReceiptItem, value: string | number) => {
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

  const handleSelectMenuItem = (index: number, menuItemId: string) => {
    const found = menuItems.find(m => m.id === menuItemId);
    if (found) {
      setFormData(prev => {
        const newItems = [...prev.items];
        const cur = {
          ...newItems[index],
          name: found.name,
          unitPrice: found.price,
          amount: newItems[index].quantity * found.price
        };
        newItems[index] = cur;
        return { ...prev, items: newItems };
      });
    }
  };

  // Filter receipts
  const filteredReceipts = receipts.filter(r => {
    const matchesSearch = 
      r.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (r.customerTaxId && r.customerTaxId.includes(searchTerm)) ||
      (r.customerPhone && r.customerPhone.includes(searchTerm));

    const matchesType = selectedType === 'ALL' || r.receiptType === selectedType || (selectedType === 'CANCELLED' && r.status === 'CANCELLED');
    return matchesSearch && matchesType;
  });

  // Calculate High Level Stats
  const validReceipts = receipts.filter(r => r.status === 'ISSUED');
  const totalCount = validReceipts.length;
  const totalGrandTotal = validReceipts.reduce((sum, r) => sum + r.grandTotal, 0);
  const totalVat = validReceipts.reduce((sum, r) => sum + r.vatAmount, 0);
  const totalWht = validReceipts.reduce((sum, r) => sum + (r.withholdingTaxAmount || 0), 0);

  const getReceiptTypeBadge = (rc: OfficialReceipt) => {
    if (rc.status === 'CANCELLED') {
      return <span className="px-2 py-0.5 bg-red-950 text-red-400 rounded-lg text-[10px] font-bold border border-red-800/50 flex items-center gap-1"><Ban className="w-3 h-3" /> ยกเลิกแล้ว</span>;
    }
    switch (rc.receiptType) {
      case 'FULL_TAX':
        return <span className="px-2 py-0.5 bg-emerald-950 text-emerald-400 rounded-lg text-[10px] font-bold border border-emerald-800/50">ใบกำกับภาษีเต็มรูป</span>;
      case 'OFFICIAL_RECEIPT':
        return <span className="px-2 py-0.5 bg-amber-950 text-amber-400 rounded-lg text-[10px] font-bold border border-amber-800/50">ใบเสร็จรับเงิน</span>;
      case 'SIMPLIFIED':
        return <span className="px-2 py-0.5 bg-slate-800 text-slate-300 rounded-lg text-[10px] font-bold border border-slate-700">ใบเสร็จอย่างย่อ</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/90 border border-slate-800 p-5 rounded-2xl shadow-xl">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-gradient-to-tr from-emerald-600 to-teal-500 rounded-xl text-white shadow">
              <Receipt className="w-5 h-5" />
            </div>
            <h1 className="text-xl font-bold text-white tracking-tight">ระบบใบเสร็จรับเงิน & ใบกำกับภาษี (Receipts & Tax Invoices)</h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            ออกใบเสร็จรับเงิน/ใบกำกับภาษีเต็มรูปแบบ (A4 & สลิป) คำนวณ VAT 7% และภาษีหัก ณ ที่จ่าย 1%, 3%, 5% อัตโนมัติ
          </p>
        </div>

        <button
          onClick={() => {
            resetForm();
            setShowCreateModal(true);
          }}
          className="px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-black rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg hover:shadow-emerald-500/20 transition-all cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4 stroke-[3]" /> ออกใบเสร็จรับเงินใหม่
        </button>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-2xl flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-400 block font-medium">ใบเสร็จที่ออกแล้ว</span>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span className="text-2xl font-black text-white font-mono">{totalCount}</span>
              <span className="text-xs text-slate-400">ฉบับ</span>
            </div>
          </div>
          <div className="p-3 bg-slate-800/80 rounded-xl text-slate-300">
            <Receipt className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-2xl flex items-center justify-between">
          <div>
            <span className="text-xs text-emerald-400 block font-medium">ยอดเงินรับชำระรวม</span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-xl font-black text-emerald-400 font-mono">{totalGrandTotal.toLocaleString()}</span>
              <span className="text-xs text-emerald-400/80">{currency}</span>
            </div>
          </div>
          <div className="p-3 bg-emerald-950/50 text-emerald-400 rounded-xl border border-emerald-800/40">
            <DollarSign className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-2xl flex items-center justify-between">
          <div>
            <span className="text-xs text-amber-400 block font-medium">ภาษีขาย VAT 7% รวม</span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-xl font-black text-amber-400 font-mono">{totalVat.toLocaleString()}</span>
              <span className="text-xs text-amber-400/80">{currency}</span>
            </div>
          </div>
          <div className="p-3 bg-amber-950/50 text-amber-400 rounded-xl border border-amber-800/40">
            <FileText className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-2xl flex items-center justify-between">
          <div>
            <span className="text-xs text-cyan-400 block font-medium">ภาษีหัก ณ ที่จ่ายรวม (WHT)</span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-xl font-black text-cyan-400 font-mono">{totalWht.toLocaleString()}</span>
              <span className="text-xs text-cyan-400/80">{currency}</span>
            </div>
          </div>
          <div className="p-3 bg-cyan-950/50 text-cyan-400 rounded-xl border border-cyan-800/40">
            <CreditCard className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="ค้นหาเลขใบเสร็จ, ชื่อลูกค้า, TAX ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-all"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
          <Filter className="w-3.5 h-3.5 text-slate-500 shrink-0 mr-1" />
          {[
            { id: 'ALL', label: 'ทั้งหมด' },
            { id: 'FULL_TAX', label: 'ใบกำกับภาษีเต็มรูป' },
            { id: 'OFFICIAL_RECEIPT', label: 'ใบเสร็จรับเงิน' },
            { id: 'SIMPLIFIED', label: 'ใบเสร็จอย่างย่อ' },
            { id: 'CANCELLED', label: 'ยกเลิกแล้ว' },
          ].map(st => (
            <button
              key={st.id}
              onClick={() => setSelectedType(st.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                selectedType === st.id 
                  ? 'bg-emerald-500 text-slate-950 shadow' 
                  : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              {st.label}
            </button>
          ))}
        </div>
      </div>

      {/* Receipts Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs divide-y divide-slate-800">
            <thead>
              <tr className="bg-slate-950 text-slate-400 font-bold uppercase">
                <th className="p-4">เลขที่ใบเสร็จ / วันที่</th>
                <th className="p-4">ประเภทเอกสาร</th>
                <th className="p-4">ลูกค้า / บริษัท</th>
                <th className="p-4 text-right">ยอดรับชำระสุทธิ</th>
                <th className="p-4 text-center">วิธีชำระ</th>
                <th className="p-4 text-right">การจัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-850 text-slate-300">
              {filteredReceipts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-12 text-center text-slate-500">
                    <Receipt className="w-8 h-8 text-slate-600 mx-auto mb-2 opacity-50" />
                    ไม่พบรายการใบเสร็จรับเงินที่ค้นหา
                  </td>
                </tr>
              ) : (
                filteredReceipts.map(rc => (
                  <tr key={rc.id} className={`hover:bg-slate-850/30 transition-colors ${rc.status === 'CANCELLED' ? 'opacity-60 bg-red-950/10' : ''}`}>
                    <td className="p-4">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-white font-mono text-xs">{rc.id}</span>
                        <span className="text-[9px] px-1.5 py-0.5 bg-emerald-950/80 text-emerald-400 border border-emerald-800/40 rounded font-mono font-bold">
                          {rc.soNumber || `SO-${rc.id}`}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-500 font-mono block mt-0.5">วันที่: {rc.issueDate}</span>
                    </td>

                    <td className="p-4">
                      {getReceiptTypeBadge(rc)}
                    </td>

                    <td className="p-4">
                      <span className="font-bold text-slate-200 block">{rc.customerName}</span>
                      <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5">
                        {rc.customerTaxId && <span className="font-mono text-slate-500">TAX: {rc.customerTaxId} ({rc.customerBranch || 'สำนักงานใหญ่'})</span>}
                        {rc.customerPhone && <span>โทร. {rc.customerPhone}</span>}
                      </div>
                    </td>

                    <td className="p-4 text-right">
                      <span className="font-bold font-mono text-sm text-emerald-400 block">
                        {(rc.netPaidAmount || rc.grandTotal).toLocaleString()} {currency}
                      </span>
                      {rc.withholdingTaxAmount ? (
                        <span className="text-[10px] text-cyan-400 font-mono block">
                          (หัก ณ ที่จ่าย {rc.withholdingTaxRate}%: -{rc.withholdingTaxAmount.toLocaleString()} ฿)
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-500 block">
                          {rc.vatType === 'INCLUSIVE' ? 'รวม VAT 7%' : rc.vatType === 'EXCLUSIVE' ? '+ VAT 7%' : 'ไม่มี VAT'}
                        </span>
                      )}
                    </td>

                    <td className="p-4 text-center">
                      <span className="px-2 py-0.5 bg-slate-800 text-slate-300 rounded text-[10px] font-mono">
                        {rc.paymentMethod === 'TRANSFER' ? 'โอนเงิน' : rc.paymentMethod === 'PROMPTPAY' ? 'พร้อมเพย์' : rc.paymentMethod === 'CREDIT_CARD' ? 'บัตรเครดิต' : 'เงินสด'}
                      </span>
                    </td>

                    <td className="p-4 text-right space-x-1 whitespace-nowrap">
                      {/* View & Print A4 */}
                      <button
                        onClick={() => { setPreviewFormat('A4'); setPreviewReceipt(rc); }}
                        title="พิมพ์ใบเสร็จ A4"
                        className="p-1.5 bg-slate-800 hover:bg-slate-700 text-emerald-400 rounded-lg transition-colors cursor-pointer"
                      >
                        <Eye className="w-4 h-4" />
                      </button>

                      {/* View & Print Thermal Slip */}
                      <button
                        onClick={() => { setPreviewFormat('SLIP'); setPreviewReceipt(rc); }}
                        title="พิมพ์สลิป 80mm"
                        className="p-1.5 bg-slate-800 hover:bg-slate-700 text-amber-400 rounded-lg transition-colors cursor-pointer"
                      >
                        <Printer className="w-4 h-4" />
                      </button>

                      {/* Edit */}
                      {rc.status !== 'CANCELLED' && (
                        <button
                          onClick={() => handleOpenEdit(rc)}
                          title="แก้ไขข้อมูลใบเสร็จ"
                          className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors cursor-pointer"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                      )}

                      {/* Cancel */}
                      {rc.status !== 'CANCELLED' && (
                        <button
                          onClick={() => setCancelModalReceipt(rc)}
                          title="ยกเลิกใบเสร็จรับเงิน"
                          className="p-1.5 bg-slate-800 hover:bg-red-950 text-slate-400 hover:text-red-400 rounded-lg transition-colors cursor-pointer"
                        >
                          <Ban className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CREATE / EDIT RECEIPT MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl p-6 my-8">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Receipt className="w-5 h-5 text-emerald-400" />
                <h2 className="text-lg font-bold text-white">
                  {editingReceipt ? `แก้ไขใบเสร็จรับเงิน (${editingReceipt.id})` : 'ออกใบเสร็จรับเงิน / ใบกำกับภาษีใหม่'}
                </h2>
              </div>
              <button
                onClick={() => { setShowCreateModal(false); resetForm(); }}
                className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveReceipt} className="space-y-6 mt-4">
              {/* Top Selector: Pull from Order / Quotation */}
              <div className="bg-slate-950 border border-slate-800 p-3.5 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
                <span className="text-slate-300 font-bold flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-amber-400" /> ดึงข้อมูลอัตโนมัติจากออเดอร์ หรือ ใบเสนอราคา:
                </span>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  {orders.length > 0 && (
                    <select
                      onChange={(e) => handlePullOrder(e.target.value)}
                      defaultValue=""
                      className="bg-slate-900 border border-slate-700 text-slate-300 rounded-lg p-2 focus:outline-none flex-1 sm:flex-initial"
                    >
                      <option value="" disabled>-- เลือกออเดอร์ POS --</option>
                      {orders.map(o => (
                        <option key={o.id} value={o.id}>{o.id} - {o.customerName || 'ลูกค้าหน้าร้าน'} ({o.total}฿)</option>
                      ))}
                    </select>
                  )}

                  {quotations.length > 0 && (
                    <select
                      onChange={(e) => handlePullQuotation(e.target.value)}
                      defaultValue=""
                      className="bg-slate-900 border border-slate-700 text-slate-300 rounded-lg p-2 focus:outline-none flex-1 sm:flex-initial"
                    >
                      <option value="" disabled>-- เลือกใบเสนอราคา QT --</option>
                      {quotations.map(q => (
                        <option key={q.id} value={q.id}>{q.id} - {q.customerName} ({q.grandTotal}฿)</option>
                      ))}
                    </select>
                  )}
                </div>
              </div>

              {/* Receipt Type & Document Options */}
              <div className="bg-slate-950/80 border border-slate-800 p-4 rounded-xl space-y-3">
                <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider block">
                  ประเภทเอกสารใบเสร็จ
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  {[
                    { type: 'FULL_TAX', label: 'ใบกำกับภาษีเต็มรูปแบบ / ใบเสร็จรับเงิน', desc: 'สำหรับนิติบุคคล/บริษัท มี TAX ID' },
                    { type: 'OFFICIAL_RECEIPT', label: 'ใบเสร็จรับเงินทั่วไป', desc: 'สำหรับบุคคลธรรมดา/ทั่วไป' },
                    { type: 'SIMPLIFIED', label: 'ใบเสร็จอย่างย่อ', desc: 'สลิปย่อสำหรับลูกค้าหน้าร้าน' },
                  ].map(t => (
                    <button
                      key={t.type}
                      type="button"
                      onClick={() => setFormData({ ...formData, receiptType: t.type as OfficialReceipt['receiptType'] })}
                      className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                        formData.receiptType === t.type
                          ? 'bg-emerald-950/60 border-emerald-500 text-white shadow'
                          : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      <span className="font-bold block text-xs">{t.label}</span>
                      <span className="text-[10px] text-slate-500 mt-0.5 block">{t.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Customer Info */}
              <div className="bg-slate-950/80 border border-slate-800 p-4 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                    <User className="w-4 h-4" /> ข้อมูลลูกค้า / ผู้ออกใบเสร็จให้
                  </span>

                  {customers.length > 0 && (
                    <select
                      onChange={(e) => {
                        const cust = customers.find(c => c.phone === e.target.value);
                        if (cust) {
                          setFormData(prev => ({
                            ...prev,
                            customerName: cust.name,
                            customerPhone: cust.phone
                          }));
                        }
                      }}
                      defaultValue=""
                      className="bg-slate-900 border border-slate-700 text-xs text-slate-300 rounded-lg px-2 py-1 focus:outline-none"
                    >
                      <option value="" disabled>-- เลือกจากรายชื่อ CRM --</option>
                      {customers.map(c => (
                        <option key={c.id} value={c.phone}>{c.name} ({c.phone})</option>
                      ))}
                    </select>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div className="sm:col-span-2">
                    <label className="text-slate-400 block mb-1 font-medium">ชื่อลูกค้า / ชื่อบริษัท *</label>
                    <input
                      type="text"
                      required
                      placeholder="เช่น บจก. ปตท. น้ำมันและการค้าปลีก"
                      value={formData.customerName}
                      onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-white focus:border-emerald-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-slate-400 block mb-1 font-medium">เบอร์โทรศัพท์</label>
                    <input
                      type="text"
                      placeholder="081-234-5678"
                      value={formData.customerPhone}
                      onChange={(e) => setFormData({ ...formData, customerPhone: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-white focus:border-emerald-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-slate-400 block mb-1 font-medium">เลขผู้เสียภาษี (Tax ID 13 หลัก)</label>
                    <input
                      type="text"
                      placeholder="0105558000000"
                      value={formData.customerTaxId}
                      onChange={(e) => setFormData({ ...formData, customerTaxId: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-white focus:border-emerald-500 focus:outline-none font-mono"
                    />
                  </div>

                  <div>
                    <label className="text-slate-400 block mb-1 font-medium">สาขา</label>
                    <input
                      type="text"
                      placeholder="สำนักงานใหญ่ หรือ 00001"
                      value={formData.customerBranch}
                      onChange={(e) => setFormData({ ...formData, customerBranch: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-white focus:border-emerald-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-slate-400 block mb-1 font-medium">เลขที่ SO / ใบสั่งขาย (Sales Order No.)</label>
                    <input
                      type="text"
                      placeholder="เช่น SO-20260802-001"
                      value={formData.soNumber}
                      onChange={(e) => setFormData({ ...formData, soNumber: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-white focus:border-emerald-500 focus:outline-none font-mono"
                    />
                  </div>

                  <div>
                    <label className="text-slate-400 block mb-1 font-medium">วันที่ออกใบเสร็จ</label>
                    <input
                      type="date"
                      value={formData.issueDate}
                      onChange={(e) => setFormData({ ...formData, issueDate: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-white focus:border-emerald-500 focus:outline-none"
                    />
                  </div>

                  <div className="sm:col-span-3">
                    <label className="text-slate-400 block mb-1 font-medium">ที่อยู่ผู้เสียภาษี</label>
                    <input
                      type="text"
                      placeholder="555/1 ถนนวิภาวดีรังสิต แขวงจตุจักร เขตจตุจักร กรุงเทพฯ 10900"
                      value={formData.customerAddress}
                      onChange={(e) => setFormData({ ...formData, customerAddress: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-white focus:border-emerald-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Items Table */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                    <ShoppingBag className="w-4 h-4" /> รายการสินค้า / บริการที่รับชำระ
                  </span>
                  <button
                    type="button"
                    onClick={handleAddItem}
                    className="px-2.5 py-1 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20 text-xs font-bold rounded-lg flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" /> เพิ่มรายการ
                  </button>
                </div>

                <div className="space-y-2">
                  {formData.items.map((item, idx) => (
                    <div key={item.id} className="bg-slate-950 border border-slate-800 p-3 rounded-xl grid grid-cols-12 gap-2 items-center text-xs">
                      <div className="col-span-12 sm:col-span-5 space-y-1">
                        <div className="flex gap-1">
                          <input
                            type="text"
                            placeholder="ชื่อสินค้า / ค่าบริการ..."
                            value={item.name}
                            onChange={(e) => handleItemChange(idx, 'name', e.target.value)}
                            className="flex-1 bg-slate-900 border border-slate-800 rounded-lg p-2 text-white focus:border-emerald-500 focus:outline-none"
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

                      <div className="col-span-4 sm:col-span-2">
                        <input
                          type="number"
                          min="1"
                          placeholder="จำนวน"
                          value={item.quantity}
                          onChange={(e) => handleItemChange(idx, 'quantity', e.target.value)}
                          className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-center text-white focus:border-emerald-500 focus:outline-none font-mono"
                        />
                      </div>

                      <div className="col-span-4 sm:col-span-2">
                        <input
                          type="number"
                          min="0"
                          placeholder="ราคา/หน่วย"
                          value={item.unitPrice}
                          onChange={(e) => handleItemChange(idx, 'unitPrice', e.target.value)}
                          className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-right text-white focus:border-emerald-500 focus:outline-none font-mono"
                        />
                      </div>

                      <div className="col-span-3 sm:col-span-2 text-right font-mono font-bold text-emerald-400">
                        {(item.quantity * item.unitPrice).toLocaleString()} ฿
                      </div>

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

              {/* Financial Calculation & Withholding Tax */}
              <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Left Controls */}
                  <div className="space-y-3 text-xs">
                    <div>
                      <label className="text-slate-400 block mb-1 font-medium">วิธีชำระเงิน & อ้างอิงสลิป</label>
                      <div className="grid grid-cols-2 gap-2">
                        <select
                          value={formData.paymentMethod}
                          onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value as OfficialReceipt['paymentMethod'] })}
                          className="bg-slate-900 border border-slate-800 rounded-xl p-2 text-white focus:border-emerald-500 focus:outline-none"
                        >
                          <option value="TRANSFER">โอนเงินเข้าบัญชี</option>
                          <option value="PROMPTPAY">สแกน PromptPay</option>
                          <option value="CASH">เงินสด</option>
                          <option value="CREDIT_CARD">บัตรเครดิต</option>
                        </select>

                        <input
                          type="text"
                          placeholder="เลขสลิปโอน / Ref"
                          value={formData.paymentRef}
                          onChange={(e) => setFormData({ ...formData, paymentRef: e.target.value })}
                          className="bg-slate-900 border border-slate-800 rounded-xl p-2 text-white focus:border-emerald-500 focus:outline-none font-mono"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-slate-400 block mb-1 font-medium">ประเภทภาษีมูลค่าเพิ่ม (VAT 7%)</label>
                      <select
                        value={formData.vatType}
                        onChange={(e) => setFormData({ ...formData, vatType: e.target.value as OfficialReceipt['vatType'] })}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2 text-white focus:border-emerald-500 focus:outline-none"
                      >
                        <option value="INCLUSIVE">รวมภาษี VAT 7% (VAT Inclusive)</option>
                        <option value="EXCLUSIVE">แยกภาษี VAT 7% (VAT Exclusive)</option>
                        <option value="NO_VAT">ไม่มีภาษี VAT (No VAT)</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-slate-400 block mb-1 font-medium">ภาษีหัก ณ ที่จ่าย (Withholding Tax - WHT)</label>
                      <select
                        value={formData.withholdingTaxRate}
                        onChange={(e) => setFormData({ ...formData, withholdingTaxRate: Number(e.target.value) })}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2 text-white focus:border-emerald-500 focus:outline-none"
                      >
                        <option value={0}>ไม่มีการหัก ณ ที่จ่าย (0%)</option>
                        <option value={1}>หัก ณ ที่จ่าย 1% (ค่าขนส่ง)</option>
                        <option value={3}>หัก ณ ที่จ่าย 3% (ค่าบริการ / จัดเลี้ยง / รับจ้าง)</option>
                        <option value={5}>หัก ณ ที่จ่าย 5% (ค่าเช่าสถานที่)</option>
                      </select>
                    </div>

                    <div className="pt-2">
                      <label className="flex items-center gap-2 text-slate-300 font-medium cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.autoRecordIncome}
                          onChange={(e) => setFormData({ ...formData, autoRecordIncome: e.target.checked })}
                          className="w-4 h-4 rounded text-emerald-500 focus:ring-emerald-500 bg-slate-900 border-slate-700"
                        />
                        บันทึกรายรับลงสมุดบัญชีการเงินทันที (Auto Income Log)
                      </label>
                    </div>
                  </div>

                  {/* Right Price Breakdown */}
                  <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-xl space-y-2 text-xs">
                    <div className="flex justify-between text-slate-400">
                      <span>ยอดรวมรายการ (Subtotal):</span>
                      <span className="font-mono">{formSubtotal.toLocaleString()} ฿</span>
                    </div>

                    <div className="flex justify-between text-slate-400">
                      <span>ส่วนลด (Discount):</span>
                      <span className="font-mono text-red-400">-{formData.discount.toLocaleString()} ฿</span>
                    </div>

                    {formData.vatType !== 'NO_VAT' && (
                      <div className="flex justify-between text-slate-400">
                        <span>ภาษีมูลค่าเพิ่ม (VAT 7%):</span>
                        <span className="font-mono text-amber-400">{formVatAmount.toLocaleString()} ฿</span>
                      </div>
                    )}

                    <div className="flex justify-between text-slate-300 font-bold border-t border-slate-800 pt-1">
                      <span>ยอดเงินรวมทั้งสิ้น (Grand Total):</span>
                      <span className="font-mono text-emerald-400">{formGrandTotal.toLocaleString()} ฿</span>
                    </div>

                    {formData.withholdingTaxRate > 0 && (
                      <div className="flex justify-between text-cyan-400 bg-cyan-950/40 p-2 rounded-lg font-mono">
                        <span>หัก ณ ที่จ่าย {formData.withholdingTaxRate}%:</span>
                        <span>-{formWhtAmount.toLocaleString()} ฿</span>
                      </div>
                    )}

                    <div className="border-t border-slate-800 pt-2 flex justify-between items-center">
                      <span className="font-bold text-white text-sm">ยอดเงินโอนจริงสุทธิ (Net Paid):</span>
                      <span className="font-mono text-lg font-black text-emerald-400">
                        {formNetPaid.toLocaleString()} {currency}
                      </span>
                    </div>

                    <div className="text-[11px] text-slate-400 bg-slate-950/80 p-2 rounded-lg font-medium text-center text-emerald-300">
                      ({thaiBahtText(formNetPaid)})
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
                  className="px-6 py-2 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-black rounded-xl text-xs flex items-center gap-2 shadow-lg transition-all"
                >
                  <Check className="w-4 h-4 stroke-[3]" />
                  {editingReceipt ? 'บันทึกการแก้ไข' : 'ยืนยันออกใบเสร็จรับเงิน'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CANCEL RECEIPT CONFIRM MODAL */}
      {cancelModalReceipt && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-red-400">
              <div className="p-2 bg-red-950 rounded-xl border border-red-800">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-white text-base">ยกเลิกใบเสร็จรับเงิน</h3>
                <p className="text-xs text-slate-400 font-mono">{cancelModalReceipt.id}</p>
              </div>
            </div>

            <div>
              <label className="text-xs text-slate-300 block mb-1 font-medium">ระบุเหตุผลการยกเลิกใบเสร็จ *</label>
              <textarea
                rows={3}
                required
                placeholder="เช่น ออกเอกสารผิดพลาด, ลูกค้าขอยกเลิกการสั่งซื้อ..."
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:border-red-500 focus:outline-none"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => { setCancelModalReceipt(null); setCancelReason(''); }}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-xs"
              >
                ย้อนกลับ
              </button>
              <button
                onClick={handleConfirmCancel}
                className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl text-xs flex items-center gap-1.5"
              >
                <Ban className="w-4 h-4" /> ยืนยันยกเลิก
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PRINT PREVIEW MODAL (A4 or SLIP) */}
      {previewReceipt && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-3xl max-h-[95vh] overflow-y-auto shadow-2xl p-4 sm:p-6 my-4">
            {/* Modal Controls Bar */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-800 no-print">
              <div className="flex items-center gap-2">
                <Receipt className="w-5 h-5 text-emerald-400" />
                <span className="text-sm font-bold text-white">
                  ตัวอย่างเอกสาร {previewFormat === 'A4' ? 'A4' : 'สลิป 80mm'} ({previewReceipt.id})
                </span>
              </div>

              <div className="flex items-center gap-2">
                <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800">
                  <button
                    onClick={() => setPreviewFormat('A4')}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${previewFormat === 'A4' ? 'bg-emerald-500 text-slate-950 shadow' : 'text-slate-400'}`}
                  >
                    รูปแบบ A4
                  </button>
                  <button
                    onClick={() => setPreviewFormat('SLIP')}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${previewFormat === 'SLIP' ? 'bg-emerald-500 text-slate-950 shadow' : 'text-slate-400'}`}
                  >
                    รูปแบบสลิป POS
                  </button>
                </div>

                <button
                  onClick={() => window.print()}
                  className="px-3.5 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-1.5 shadow transition-all cursor-pointer"
                >
                  <Printer className="w-4 h-4" /> พิมพ์เอกสาร
                </button>

                <button
                  onClick={() => setPreviewReceipt(null)}
                  className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* FORMAT 1: FORMAL A4 PRINTABLE DOCUMENT */}
            {previewFormat === 'A4' ? (
              <div id="printable-receipt-a4" className="bg-white text-slate-900 p-8 sm:p-10 rounded-xl shadow-2xl my-4 text-xs font-sans space-y-6">
                {/* Header Company & Doc Title */}
                <div className="flex flex-col sm:flex-row justify-between items-start gap-4 border-b border-slate-300 pb-6">
                  <div>
                    <h1 className="text-xl font-black text-slate-900 tracking-tight">{storeSettings.storeName}</h1>
                    <p className="text-slate-600 mt-1 whitespace-pre-line text-[11px] leading-relaxed">
                      {storeSettings.receiptHeader || 'สาขาบรรทัดทอง ปทุมวัน กรุงเทพฯ\nโทร. 081-123-4567'}
                    </p>
                    {storeSettings.storeTaxId && (
                      <p className="text-slate-600 font-mono text-[11px] mt-0.5">เลขประจำตัวผู้เสียภาษี: {storeSettings.storeTaxId}</p>
                    )}
                  </div>

                  <div className="text-left sm:text-right">
                    <h2 className="text-lg font-black text-slate-900 uppercase tracking-tight">
                      {previewReceipt.receiptType === 'FULL_TAX' ? 'ใบเสร็จรับเงิน / ใบกำกับภาษี' : 'ใบเสร็จรับเงิน (RECEIPT)'}
                    </h2>
                    <p className="text-slate-500 text-[11px] font-bold mt-0.5">
                      {previewReceipt.receiptType === 'FULL_TAX' ? 'TAX INVOICE / RECEIPT' : 'OFFICIAL RECEIPT'}
                    </p>
                    <div className="mt-2 space-y-0.5 text-xs">
                      <p><span className="text-slate-500">เลขที่เอกสาร:</span> <span className="font-bold font-mono text-slate-900">{previewReceipt.id}</span></p>
                      <p><span className="text-slate-500">เลขที่ SO (Sales Order):</span> <span className="font-bold font-mono text-emerald-700">{previewReceipt.soNumber || `SO-${previewReceipt.id}`}</span></p>
                      <p><span className="text-slate-500">วันที่ออก:</span> <span className="font-bold font-mono text-slate-900">{previewReceipt.issueDate}</span></p>
                      <p><span className="text-slate-500">วิธีรับชำระ:</span> <span className="font-bold text-slate-900">{previewReceipt.paymentMethod === 'TRANSFER' ? 'โอนเงิน' : previewReceipt.paymentMethod === 'PROMPTPAY' ? 'พร้อมเพย์' : 'เงินสด'}</span></p>
                    </div>
                  </div>
                </div>

                {/* Customer Box */}
                <div className="bg-slate-50 border border-slate-200 p-4 rounded-lg">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                    ลูกค้า / ผู้เสียภาษี (CUSTOMER / TAXPAYER)
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    <div>
                      <p className="font-bold text-slate-900 text-sm">{previewReceipt.customerName}</p>
                      {previewReceipt.customerAddress && <p className="text-slate-600 text-[11px] mt-0.5 leading-relaxed">{previewReceipt.customerAddress}</p>}
                    </div>
                    <div className="sm:text-right space-y-0.5">
                      {previewReceipt.customerTaxId && (
                        <p className="font-mono"><span className="text-slate-500">เลขผู้เสียภาษี:</span> <strong>{previewReceipt.customerTaxId}</strong></p>
                      )}
                      {previewReceipt.customerBranch && (
                        <p><span className="text-slate-500">สาขา:</span> <strong>{previewReceipt.customerBranch}</strong></p>
                      )}
                      {previewReceipt.customerPhone && (
                        <p><span className="text-slate-500">โทร:</span> <strong>{previewReceipt.customerPhone}</strong></p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Itemized Table */}
                <table className="w-full text-left border-collapse border border-slate-300">
                  <thead>
                    <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-300">
                      <th className="p-2.5 border-r border-slate-300 text-center w-12">ลำดับ</th>
                      <th className="p-2.5 border-r border-slate-300">รายการสินค้า / บริการ</th>
                      <th className="p-2.5 border-r border-slate-300 text-center w-16">จำนวน</th>
                      <th className="p-2.5 border-r border-slate-300 text-right w-24">ราคา/หน่วย</th>
                      <th className="p-2.5 text-right w-28">จำนวนเงิน</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 text-slate-800">
                    {previewReceipt.items.map((item, index) => (
                      <tr key={item.id}>
                        <td className="p-2.5 border-r border-slate-200 text-center font-mono">{index + 1}</td>
                        <td className="p-2.5 border-r border-slate-200 font-medium">{item.name}</td>
                        <td className="p-2.5 border-r border-slate-200 text-center font-mono">{item.quantity}</td>
                        <td className="p-2.5 border-r border-slate-200 text-right font-mono">{item.unitPrice.toLocaleString()}</td>
                        <td className="p-2.5 text-right font-mono font-bold">{(item.quantity * item.unitPrice).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Totals & Thai Text */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start pt-2">
                  <div className="border border-slate-200 p-3 rounded-lg bg-slate-50 space-y-1">
                    <span className="text-[10px] text-slate-400 font-bold block uppercase">จำนวนเงินตัวอักษร</span>
                    <p className="font-bold text-slate-800 text-xs">
                      ( {thaiBahtText(previewReceipt.netPaidAmount || previewReceipt.grandTotal)} )
                    </p>
                    {previewReceipt.notes && (
                      <p className="text-[11px] text-slate-500 pt-2 border-t border-slate-200">
                        <strong>หมายเหตุ:</strong> {previewReceipt.notes}
                      </p>
                    )}
                  </div>

                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between text-slate-600">
                      <span>รวมเป็นเงิน (Subtotal):</span>
                      <span className="font-mono">{previewReceipt.subtotal.toLocaleString()} ฿</span>
                    </div>

                    {previewReceipt.discount > 0 && (
                      <div className="flex justify-between text-red-600">
                        <span>หักส่วนลด (Discount):</span>
                        <span className="font-mono">-{previewReceipt.discount.toLocaleString()} ฿</span>
                      </div>
                    )}

                    {previewReceipt.vatType !== 'NO_VAT' && (
                      <div className="flex justify-between text-slate-600">
                        <span>ภาษีมูลค่าเพิ่ม 7% (VAT):</span>
                        <span className="font-mono">{previewReceipt.vatAmount.toLocaleString()} ฿</span>
                      </div>
                    )}

                    <div className="flex justify-between font-bold text-slate-900 border-t border-slate-300 pt-1 text-sm">
                      <span>ยอดเงินรวมสุทธิ (Grand Total):</span>
                      <span className="font-mono text-emerald-700">{previewReceipt.grandTotal.toLocaleString()} ฿</span>
                    </div>

                    {previewReceipt.withholdingTaxAmount ? (
                      <div className="flex justify-between text-cyan-700 font-mono text-[11px]">
                        <span>หัก ณ ที่จ่าย ({previewReceipt.withholdingTaxRate}%):</span>
                        <span>-{previewReceipt.withholdingTaxAmount.toLocaleString()} ฿</span>
                      </div>
                    ) : null}

                    {previewReceipt.netPaidAmount ? (
                      <div className="flex justify-between font-black text-slate-900 border-t-2 border-slate-900 pt-1 text-sm bg-amber-50 p-1.5 rounded">
                        <span>ยอดรับชำระสุทธิ (Net Paid):</span>
                        <span className="font-mono">{previewReceipt.netPaidAmount.toLocaleString()} ฿</span>
                      </div>
                    ) : null}
                  </div>
                </div>

                {/* Signatures Area */}
                <div className="grid grid-cols-2 gap-8 pt-8 border-t border-slate-200 text-center text-xs">
                  <div>
                    <div className="h-12 border-b border-dashed border-slate-400 w-48 mx-auto" />
                    <p className="mt-2 font-bold text-slate-800">({previewReceipt.customerName})</p>
                    <p className="text-[10px] text-slate-500">ผู้จ่ายเงิน / Customer Payer</p>
                    <p className="text-[10px] text-slate-400 font-mono mt-1">วันที่ ..... / ..... / ..........</p>
                  </div>

                  <div>
                    <div className="h-12 border-b border-dashed border-slate-400 w-48 mx-auto" />
                    <p className="mt-2 font-bold text-slate-800">({previewReceipt.issuerName})</p>
                    <p className="text-[10px] text-slate-500">ผู้รับเงิน / Authorized Recipient</p>
                    <p className="text-[10px] text-slate-400 font-mono mt-1">วันที่ ..... / ..... / ..........</p>
                  </div>
                </div>
              </div>
            ) : (
              /* FORMAT 2: 80MM POS THERMAL SLIP PREVIEW */
              <div id="printable-receipt-slip" className="bg-white text-slate-900 p-6 rounded-xl shadow-2xl my-4 max-w-xs mx-auto text-xs font-mono space-y-4">
                <div className="text-center border-b border-slate-300 pb-3">
                  <h2 className="font-black text-base">{storeSettings.storeName}</h2>
                  <p className="text-[10px] text-slate-600 mt-0.5">{storeSettings.receiptHeader}</p>
                  {storeSettings.storeTaxId && <p className="text-[10px] text-slate-600">TAX ID: {storeSettings.storeTaxId}</p>}
                  <p className="font-bold uppercase tracking-widest text-xs mt-2 border-t border-slate-200 pt-2">
                    {previewReceipt.receiptType === 'FULL_TAX' ? 'ใบกำกับภาษีอย่างย่อ/ใบเสร็จ' : 'ใบเสร็จรับเงิน'}
                  </p>
                </div>

                <div className="space-y-1 text-[11px]">
                  <div className="flex justify-between"><span>เลขที่:</span> <strong className="font-bold">{previewReceipt.id}</strong></div>
                  <div className="flex justify-between"><span>เลขที่ SO:</span> <strong className="font-bold text-emerald-800">{previewReceipt.soNumber || `SO-${previewReceipt.id}`}</strong></div>
                  <div className="flex justify-between"><span>วันที่:</span> <span>{previewReceipt.issueDate}</span></div>
                  <div className="flex justify-between"><span>ลูกค้า:</span> <span className="font-bold">{previewReceipt.customerName}</span></div>
                </div>

                <div className="border-t border-b border-slate-300 py-2 space-y-1 text-[11px]">
                  {previewReceipt.items.map(item => (
                    <div key={item.id} className="flex justify-between">
                      <span className="truncate pr-2">{item.name} x{item.quantity}</span>
                      <span className="font-bold">{(item.quantity * item.unitPrice).toLocaleString()}</span>
                    </div>
                  ))}
                </div>

                <div className="space-y-1 text-[11px]">
                  <div className="flex justify-between"><span>รวมเงิน:</span> <span>{previewReceipt.subtotal.toLocaleString()} ฿</span></div>
                  {previewReceipt.discount > 0 && <div className="flex justify-between text-red-600"><span>ส่วนลด:</span> <span>-{previewReceipt.discount.toLocaleString()} ฿</span></div>}
                  {previewReceipt.vatAmount > 0 && <div className="flex justify-between text-slate-500"><span>VAT 7%:</span> <span>{previewReceipt.vatAmount.toLocaleString()} ฿</span></div>}
                  <div className="flex justify-between font-black text-sm border-t border-slate-300 pt-1">
                    <span>ยอดสุทธิ:</span>
                    <span>{previewReceipt.grandTotal.toLocaleString()} ฿</span>
                  </div>
                </div>

                <div className="text-center border-t border-slate-200 pt-3 text-[10px] text-slate-500">
                  <p>ขอบคุณที่อุดหนุนโอกาสหน้าเชิญใหม่</p>
                  <p className="mt-1 font-sans font-medium">{storeSettings.receiptFooter}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
