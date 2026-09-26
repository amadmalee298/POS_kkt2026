import React, { useState } from 'react';
import { Supplier, PurchaseOrder, Ingredient, User, StockCardLog, PurchaseOrderItem } from '../types';
import { 
  Building2, Plus, Sparkles, ClipboardList, Layers, 
  Truck, Check, Clock, Phone, MapPin, Tag, UserCheck, X,
  CreditCard, FileText, Image as ImageIcon, Upload, AlertTriangle, 
  CheckCircle2, Copy, ExternalLink, HelpCircle, Calendar, DollarSign, ShoppingBag
} from 'lucide-react';

interface PurchaseProps {
  suppliers: Supplier[];
  purchaseOrders: PurchaseOrder[];
  ingredients: Ingredient[];
  currentUser: User;
  onUpdatePurchaseOrders: (orders: PurchaseOrder[], updatedIngredients: Ingredient[], stockLogs: StockCardLog[]) => void;
  onUpdateSuppliers: (suppliers: Supplier[]) => void;
  currency: string;
}

export default function Purchase({ 
  suppliers, purchaseOrders, ingredients, currentUser, onUpdatePurchaseOrders, onUpdateSuppliers, currency 
}: PurchaseProps) {
  // Tabs
  const [activeTab, setActiveTab] = useState<'ORDERS' | 'SUPPLIERS'>('ORDERS');
  const [showCreatePOModal, setShowCreatePOModal] = useState<boolean>(false);

  // New PO Form States
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>(suppliers[0]?.id || '');
  const [poItems, setPoItems] = useState<PurchaseOrderItem[]>([]);
  const [selectedIngId, setSelectedIngId] = useState<string>(ingredients[0]?.id || '');
  const [poAmount, setPoAmount] = useState<number>(10);
  const [poUnitCost, setPoUnitCost] = useState<number>(100);
  const [poVatType, setPoVatType] = useState<'INCLUSIVE' | 'EXCLUSIVE' | 'NO_VAT'>('NO_VAT');
  const [poVatRate, setPoVatRate] = useState<number>(7);

  // Helper function to calculate expected arrival date based on lead time days
  const calculateExpectedDateStr = (days: number, fromDate: Date = new Date()) => {
    const d = new Date(fromDate);
    d.setDate(d.getDate() + (days || 0));
    return d.toISOString().split('T')[0];
  };

  const initialSup = suppliers.find(s => s.id === selectedSupplierId) || suppliers[0];
  const [poLeadTimeDays, setPoLeadTimeDays] = useState<number>(initialSup?.leadTimeDays ?? 2);
  const [poExpectedArrivalDate, setPoExpectedArrivalDate] = useState<string>(
    calculateExpectedDateStr(initialSup?.leadTimeDays ?? 2)
  );

  // Update expected arrival date when supplier changes
  const handleSelectSupplierForPO = (supId: string) => {
    setSelectedSupplierId(supId);
    const sup = suppliers.find(s => s.id === supId);
    const days = sup?.leadTimeDays ?? 2;
    setPoLeadTimeDays(days);
    setPoExpectedArrivalDate(calculateExpectedDateStr(days));
  };

  // Calculate PO totals based on VAT configuration
  const calculatePoDraftTotals = () => {
    const subtotal = poItems.reduce((sum, item) => sum + (item.amount * item.unitCost), 0);
    let vatAmount = 0;
    let total = subtotal;

    if (poVatType === 'INCLUSIVE') {
      vatAmount = Math.round((subtotal * poVatRate / (100 + poVatRate)) * 100) / 100;
      total = subtotal;
    } else if (poVatType === 'EXCLUSIVE') {
      vatAmount = Math.round((subtotal * (poVatRate / 100)) * 100) / 100;
      total = subtotal + vatAmount;
    }

    return { subtotal, vatAmount, total };
  };

  // Attach/View Slip Modal States
  const [selectedPOForSlip, setSelectedPOForSlip] = useState<PurchaseOrder | null>(null);
  const [showSlipModal, setShowSlipModal] = useState<boolean>(false);
  const [slipFile, setSlipFile] = useState<string>('');
  const [slipDate, setSlipDate] = useState<string>('');
  const [slipNote, setSlipNote] = useState<string>('');
  const [isDragging, setIsDragging] = useState<boolean>(false);

  // Edit Supplier Bank & Lead Time Modal States
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [editBankName, setEditBankName] = useState<string>('');
  const [editBankAccNo, setEditBankAccNo] = useState<string>('');
  const [editBankAccName, setEditBankAccName] = useState<string>('');
  const [editLeadTimeDays, setEditLeadTimeDays] = useState<number>(2);

  // UI state
  const [copiedSupplierId, setCopiedSupplierId] = useState<string | null>(null);
  const [copiedAccountNo, setCopiedAccountNo] = useState<string | null>(null);

  // New Supplier Form States
  const [showAddSupplierModal, setShowAddSupplierModal] = useState<boolean>(false);
  const [newSupplierName, setNewSupplierName] = useState<string>('');
  const [newSupplierContact, setNewSupplierContact] = useState<string>('');
  const [newSupplierPhone, setNewSupplierPhone] = useState<string>('');
  const [newSupplierAddress, setNewSupplierAddress] = useState<string>('');
  const [newSupplierLeadTimeDays, setNewSupplierLeadTimeDays] = useState<number>(2);
  const [newSupplierBankName, setNewSupplierBankName] = useState<string>('ธนาคารกสิกรไทย (KBANK)');
  const [newSupplierBankAccNo, setNewSupplierBankAccNo] = useState<string>('');
  const [newSupplierBankAccName, setNewSupplierBankAccName] = useState<string>('');

  // Programmatically generate a realistic Thai Bank e-Slip SVG
  const generateMockSlip = (po: PurchaseOrder, supplier: Supplier) => {
    const bankName = supplier.bankName || 'ธนาคารกสิกรไทย (KBANK)';
    const accNo = supplier.bankAccountNo || '123-4-56789-0';
    const accName = supplier.bankAccountName || supplier.name;
    const isKbank = bankName.toLowerCase().includes('kbank') || bankName.includes('กสิกร');
    const isScb = bankName.toLowerCase().includes('scb') || bankName.includes('ไทยพาณิชย์');
    const isBbl = bankName.toLowerCase().includes('bbl') || bankName.includes('กรุงเทพ');
    const isCash = bankName === 'เงินสด (Cash)';
    
    let themeColor = '#00A950'; // Green KBANK default
    let bankTitle = 'KASIKORNBANK';
    if (isScb) {
      themeColor = '#4A2B93'; // Purple SCB
      bankTitle = 'SCB BANK';
    } else if (isBbl) {
      themeColor = '#1E3A8A'; // Blue BBL
      bankTitle = 'BANGKOK BANK';
    } else if (isCash) {
      themeColor = '#D97706'; // Amber CASH
      bankTitle = 'CASH VOUCHER';
    }

    const refNo = `${po.id}-TXN${Math.floor(100000 + Math.random() * 900000)}`;
    const nowStr = new Date().toLocaleString('th-TH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    }) + ' น.';

    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="360" height="520" viewBox="0 0 360 520">
        <rect width="360" height="520" rx="16" fill="#F8FAFC" stroke="#E2E8F0" stroke-width="2"/>
        
        <!-- Header Banner -->
        <rect width="360" height="72" rx="16" fill="${themeColor}"/>
        <rect y="50" width="360" height="22" fill="${themeColor}"/>
        
        <text x="24" y="42" fill="white" font-family="system-ui, -apple-system, sans-serif" font-size="16" font-weight="900" letter-spacing="1.5">${bankTitle}</text>
        <text x="336" y="42" fill="white" font-family="system-ui, -apple-system, sans-serif" font-size="12" font-weight="bold" text-anchor="end">${isCash ? 'CASH' : 'e-Slip'}</text>
        
        <!-- Success Icon -->
        <circle cx="180" cy="120" r="28" fill="${themeColor}" opacity="0.1"/>
        <path d="M170 120 L177 127 L194 110" fill="none" stroke="${themeColor}" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round"/>
        
        <text x="180" y="172" fill="#1E293B" font-family="system-ui, -apple-system, sans-serif" font-size="20" font-weight="900" text-anchor="middle">฿${po.total.toLocaleString()}</text>
        <text x="180" y="188" fill="#10B981" font-family="system-ui, -apple-system, sans-serif" font-size="10" font-weight="800" text-anchor="middle" letter-spacing="0.5">${isCash ? 'จ่ายเงินสดสำเร็จ (CASH PAID)' : 'โอนเงินสำเร็จ (SUCCESSFUL)'}</text>
        
        <line x1="24" y1="206" x2="336" y2="206" stroke="#E2E8F0" stroke-width="1.5" stroke-dasharray="4 4"/>
        
        <!-- Sender info -->
        <text x="24" y="230" fill="#64748B" font-family="system-ui, -apple-system, sans-serif" font-size="10" font-weight="bold">จาก (SENDER)</text>
        <text x="24" y="248" fill="#1E293B" font-family="system-ui, -apple-system, sans-serif" font-size="12" font-weight="bold">ครัวกะเพราโคตรกรอบ (Kaprao POS)</text>
        <text x="24" y="262" fill="#64748B" font-family="system-ui, -apple-system, sans-serif" font-size="10">${isCash ? 'จ่ายหน้าร้านด้วยเงินสดสด' : 'บัญชีร้านค้าหลัก (PromptPay โอนออก)'}</text>
        
        <!-- Receiver info -->
        <text x="24" y="302" fill="#64748B" font-family="system-ui, -apple-system, sans-serif" font-size="10" font-weight="bold">ไปยัง (RECEIVER)</text>
        <text x="24" y="320" fill="#1E293B" font-family="system-ui, -apple-system, sans-serif" font-size="12" font-weight="bold">${accName}</text>
        <text x="24" y="334" fill="#64748B" font-family="system-ui, -apple-system, sans-serif" font-size="10">${isCash ? 'ชำระสดหน้าร้าน / หน้าโรงงาน' : bankName}</text>
        <text x="24" y="348" fill="${themeColor}" font-family="system-ui, -apple-system, sans-serif" font-size="11" font-weight="bold">${isCash ? 'สถานะ: ได้รับเงินสดเรียบร้อย' : 'เลขบัญชี: ' + accNo}</text>
        
        <line x1="24" y1="372" x2="336" y2="372" stroke="#E2E8F0" stroke-width="1.5" stroke-dasharray="4 4"/>
        
        <!-- Transaction Details -->
        <text x="24" y="396" fill="#64748B" font-family="system-ui, -apple-system, sans-serif" font-size="10" font-weight="bold">เลขที่อ้างอิง (REF NO.)</text>
        <text x="336" y="396" fill="#1E293B" font-family="monospace" font-size="11" font-weight="bold" text-anchor="end">${refNo}</text>
        
        <text x="24" y="420" fill="#64748B" font-family="system-ui, -apple-system, sans-serif" font-size="10" font-weight="bold">วันที่และเวลา (DATE &amp; TIME)</text>
        <text x="336" y="420" fill="#1E293B" font-family="system-ui, -apple-system, sans-serif" font-size="11" font-weight="bold" text-anchor="end">${nowStr}</text>
        
        ${po.vatType && po.vatType !== 'NO_VAT' ? `
        <text x="24" y="438" fill="#64748B" font-family="system-ui, -apple-system, sans-serif" font-size="8" font-weight="bold">ยอดก่อนภาษี: ฿${(po.subtotal || (po.total - (po.vatAmount || 0))).toLocaleString()}</text>
        <text x="336" y="438" fill="#E11D48" font-family="system-ui, -apple-system, sans-serif" font-size="8" font-weight="bold" text-anchor="end">ภาษีซื้อ ${po.vatRate}% (${po.vatType === 'INCLUSIVE' ? 'รวมในราคา' : 'แยกนอกราคา'}): ฿${(po.vatAmount || 0).toLocaleString()}</text>
        ` : ''}

        <text x="24" y="454" fill="#64748B" font-family="system-ui, -apple-system, sans-serif" font-size="10" font-weight="bold">ยอดสุทธิใบสั่งซื้อ (NET AMOUNT)</text>
        <text x="336" y="454" fill="#1E293B" font-family="system-ui, -apple-system, sans-serif" font-size="12" font-weight="black" text-anchor="end">฿${po.total.toLocaleString()}</text>
        
        <rect x="24" y="468" width="312" height="34" rx="8" fill="#F1F5F9"/>
        <text x="34" y="488" fill="#475569" font-family="system-ui, -apple-system, sans-serif" font-size="9" font-weight="bold">${isCash ? 'ใบสำคัญการรับเงินสด / บันทึกคลังสินค้า' : 'ตรวจสอบสลิปได้ด้วยการสแกน QR Code นี้'}</text>
        <rect x="296" y="472" width="26" height="26" rx="4" fill="#1E293B"/>
        <!-- Simple decorative QR pattern -->
        <rect x="300" y="476" width="7" height="7" fill="white"/>
        <rect x="311" y="476" width="7" height="7" fill="white"/>
        <rect x="300" y="487" width="7" height="7" fill="white"/>
        <rect x="312" y="489" width="3" height="3" fill="white"/>
      </svg>
    `;
    
    return `data:image/svg+xml;utf8,${encodeURIComponent(svg.trim())}`;
  };

  // Add Item to current draft PO
  const handleAddItemToDraft = () => {
    const ingredient = ingredients.find(i => i.id === selectedIngId);
    if (!ingredient) return;

    const existingIndex = poItems.findIndex(item => item.ingredientId === selectedIngId);
    if (existingIndex > -1) {
      const updated = [...poItems];
      updated[existingIndex].amount += poAmount;
      setPoItems(updated);
    } else {
      setPoItems([...poItems, { ingredientId: selectedIngId, amount: poAmount, unitCost: poUnitCost }]);
    }
  };

  const handleRemoveDraftItem = (id: string) => {
    setPoItems(poItems.filter(item => item.ingredientId !== id));
  };

  // Submit Draft PO
  const handleSubmitPO = (e: React.FormEvent) => {
    e.preventDefault();
    if (poItems.length === 0) {
      alert('กรุณาเพิ่มรายการวัตถุดิบลงในใบสั่งซื้อก่อน');
      return;
    }

    const { subtotal, vatAmount, total } = calculatePoDraftTotals();

    const expectedArrivalIso = poExpectedArrivalDate
      ? new Date(poExpectedArrivalDate).toISOString()
      : new Date(Date.now() + ((poLeadTimeDays || 2) * 86400000)).toISOString();

    const newPO: PurchaseOrder = {
      id: `PO-${new Date().getFullYear()}-${100 + purchaseOrders.length}`,
      supplierId: selectedSupplierId,
      items: poItems,
      status: 'PENDING',
      total: total,
      subtotal: subtotal,
      vatRate: poVatRate,
      vatAmount: vatAmount,
      vatType: poVatType,
      createdAt: new Date().toISOString(),
      expectedArrivalDate: expectedArrivalIso,
      paymentStatus: 'UNPAID'
    };

    onUpdatePurchaseOrders([newPO, ...purchaseOrders], ingredients, []);
    setShowCreatePOModal(false);
    setPoItems([]);
    setPoVatType('NO_VAT');
    setPoVatRate(7);
  };

  // Receive PO (Mark as RECEIVED and ADD STOCK directly to central inventory!)
  const handleReceivePO = (po: PurchaseOrder) => {
    if (po.status !== 'PENDING') return;

    if (!confirm(`คุณได้รับสินค้าตามใบสั่งซื้อ ${po.id} ครบถ้วนแล้วใช่หรือไม่? ระบบจะทำการเติมสต๊อกคลังและพิมพ์ประวัติหมุนเวียนคลังอัตโนมัติ`)) {
      return;
    }

    // Update ingredients stock levels
    const updatedIngredients = [...ingredients];
    const newLogs: StockCardLog[] = [];

    po.items.forEach(item => {
      const ingIndex = updatedIngredients.findIndex(i => i.id === item.ingredientId);
      if (ingIndex > -1) {
        const prevStock = updatedIngredients[ingIndex].stock;
        const newStock = parseFloat((prevStock + item.amount).toFixed(3));
        updatedIngredients[ingIndex].stock = newStock;
        
        // Use average cost weighted recalculation or set directly
        updatedIngredients[ingIndex].unitCost = item.unitCost;

        // Log into Stock Card
        newLogs.push({
          id: `sc-log-po-${Date.now()}-${Math.random().toString(36).substr(2,4)}`,
          ingredientId: item.ingredientId,
          type: 'IN',
          amount: item.amount,
          remaining: newStock,
          note: `รับเข้าคลังสินค้าตามใบสั่งซื้อ ${po.id}`,
          timestamp: new Date().toISOString(),
          user: currentUser.name
        });
      }
    });

    const updatedPurchaseOrders = purchaseOrders.map(order => {
      if (order.id === po.id) {
        return {
          ...order,
          status: 'RECEIVED' as const,
          receivedAt: new Date().toISOString()
        };
      }
      return order;
    });

    onUpdatePurchaseOrders(updatedPurchaseOrders, updatedIngredients, newLogs);
  };

  // Open attach/view slip modal
  const handleOpenSlipModal = (po: PurchaseOrder) => {
    setSelectedPOForSlip(po);
    setSlipFile(po.paymentSlip || '');
    setSlipDate(po.paymentDate ? po.paymentDate.split('T')[0] : new Date().toISOString().split('T')[0]);
    setSlipNote(po.paymentNote || '');
    setShowSlipModal(true);
  };

  // File Upload Handlers (Base64 conversion)
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSlipFile(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSlipFile(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Instant generator trigger
  const handleTriggerAutoSlip = () => {
    if (!selectedPOForSlip) return;
    const sup = suppliers.find(s => s.id === selectedPOForSlip.supplierId);
    if (!sup) return;
    const slip = generateMockSlip(selectedPOForSlip, sup);
    setSlipFile(slip);
  };

  // Save payment slip details
  const handleSavePaymentSlip = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPOForSlip) return;

    const s = suppliers.find(su => su.id === selectedPOForSlip.supplierId);
    const isCash = s?.bankName === 'เงินสด (Cash)';

    const updatedPurchaseOrders = purchaseOrders.map(po => {
      if (po.id === selectedPOForSlip.id) {
        return {
          ...po,
          paymentSlip: slipFile || undefined,
          paymentStatus: (isCash || slipFile ? 'PAID' : 'UNPAID') as 'PAID' | 'UNPAID',
          paymentDate: new Date(slipDate).toISOString(),
          paymentNote: slipNote || undefined
        };
      }
      return po;
    });

    onUpdatePurchaseOrders(updatedPurchaseOrders, ingredients, []);
    setShowSlipModal(false);
    setSelectedPOForSlip(null);
  };

  // Delete payment slip details
  const handleDeletePaymentSlip = () => {
    if (!selectedPOForSlip) return;
    if (!confirm('คุณต้องการลบข้อมูลหลักฐานการชำระเงินนี้ใช่หรือไม่?')) return;

    const updatedPurchaseOrders = purchaseOrders.map(po => {
      if (po.id === selectedPOForSlip.id) {
        return {
          ...po,
          paymentSlip: undefined,
          paymentStatus: 'UNPAID' as const,
          paymentDate: undefined,
          paymentNote: undefined
        };
      }
      return po;
    });

    onUpdatePurchaseOrders(updatedPurchaseOrders, ingredients, []);
    setSlipFile('');
    setSlipNote('');
    setShowSlipModal(false);
    setSelectedPOForSlip(null);
  };

  // Copy helper
  const handleCopyText = (text: string, id: string, type: 'sup' | 'acc') => {
    navigator.clipboard.writeText(text);
    if (type === 'sup') {
      setCopiedSupplierId(id);
      setTimeout(() => setCopiedSupplierId(null), 2000);
    } else {
      setCopiedAccountNo(id);
      setTimeout(() => setCopiedAccountNo(null), 2000);
    }
  };

  // Open Edit Supplier Bank Account & Lead Time Info
  const handleOpenEditBankModal = (sup: Supplier) => {
    setEditingSupplier(sup);
    setEditBankName(sup.bankName || 'ธนาคารกสิกรไทย (KBANK)');
    setEditBankAccNo(sup.bankAccountNo || '');
    setEditBankAccName(sup.bankAccountName || sup.name);
    setEditLeadTimeDays(sup.leadTimeDays ?? 2);
  };

  // Save Supplier Bank Account & Lead Time Info
  const handleSaveSupplierBank = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSupplier) return;

    const isCash = editBankName === 'เงินสด (Cash)';

    const updatedSuppliers = suppliers.map(s => {
      if (s.id === editingSupplier.id) {
        return {
          ...s,
          bankName: editBankName,
          bankAccountNo: isCash ? undefined : editBankAccNo,
          bankAccountName: isCash ? undefined : editBankAccName,
          leadTimeDays: editLeadTimeDays
        };
      }
      return s;
    });

    onUpdateSuppliers(updatedSuppliers);
    setEditingSupplier(null);
  };

  // Create New Supplier
  const handleCreateSupplier = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSupplierName || !newSupplierContact || !newSupplierPhone) {
      alert('กรุณากรอกข้อมูลที่จำเป็นให้ครบถ้วน');
      return;
    }

    const isCash = newSupplierBankName === 'เงินสด (Cash)';

    const newSup: Supplier = {
      id: `s${Date.now()}`,
      name: newSupplierName,
      contact: newSupplierContact,
      phone: newSupplierPhone,
      address: newSupplierAddress || 'ไม่ระบุที่อยู่',
      leadTimeDays: newSupplierLeadTimeDays,
      bankName: newSupplierBankName,
      bankAccountNo: isCash ? undefined : newSupplierBankAccNo,
      bankAccountName: isCash ? undefined : newSupplierBankAccName
    };

    onUpdateSuppliers([...suppliers, newSup]);

    // Reset Form
    setNewSupplierName('');
    setNewSupplierContact('');
    setNewSupplierPhone('');
    setNewSupplierAddress('');
    setNewSupplierLeadTimeDays(2);
    setNewSupplierBankName('ธนาคารกสิกรไทย (KBANK)');
    setNewSupplierBankAccNo('');
    setNewSupplierBankAccName('');
    setShowAddSupplierModal(false);
    alert('เพิ่มข้อมูลคู่ค้าใหม่เรียบร้อยแล้ว!');
  };

  return (
    <div className="space-y-6" id="procurement-suppliers-main">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">การสั่งซื้อและซัพพลายเออร์ (Procurement &amp; Suppliers)</h2>
          <p className="text-xs text-slate-400">สร้างใบสั่งซื้อวัตถุดิบ (PO) คำนวณวันส่งมอบอัตโนมัติ แนบหลักฐานการชำระเงิน และบริหารคู่ค้า</p>
        </div>
        <button
          onClick={() => {
            if (activeTab === 'ORDERS') {
              const defaultSupId = suppliers[0]?.id || '';
              setSelectedSupplierId(defaultSupId);
              const sup = suppliers.find(s => s.id === defaultSupId);
              const days = sup?.leadTimeDays ?? 2;
              setPoLeadTimeDays(days);
              setPoExpectedArrivalDate(calculateExpectedDateStr(days));
              setPoItems([]);
              setShowCreatePOModal(true);
            } else {
              setShowAddSupplierModal(true);
            }
          }}
          className="px-4 py-2 bg-gradient-to-r from-red-600 to-amber-600 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 hover:opacity-95 shadow transition-all"
        >
          <Plus className="w-4 h-4" /> {activeTab === 'ORDERS' ? 'เปิดใบสั่งซื้อ PO ใหม่' : 'เพิ่มคู่ค้าซัพพลายเออร์'}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-800">
        <button
          onClick={() => setActiveTab('ORDERS')}
          className={`py-3 px-5 text-xs font-bold border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'ORDERS' ? 'border-red-500 text-white' : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          <ShoppingBag className="w-4 h-4" /> ประวัติใบสั่งซื้อ PO ({purchaseOrders.length})
        </button>
        <button
          onClick={() => setActiveTab('SUPPLIERS')}
          className={`py-3 px-5 text-xs font-bold border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'SUPPLIERS' ? 'border-red-500 text-white' : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          <Building2 className="w-4 h-4" /> บัญชีคู่ค้า / ซัพพลายเออร์ ({suppliers.length})
        </button>
      </div>

      {activeTab === 'ORDERS' ? (
        /* PURCHASE ORDERS TAB */
        <div className="space-y-4" id="purchase-orders-tab-content">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs divide-y divide-slate-800">
                <thead>
                  <tr className="bg-slate-950 text-slate-400 font-bold uppercase">
                    <th className="p-4">เลขที่ PO / วันที่สั่ง & กำหนดส่ง</th>
                    <th className="p-4">ซัพพลายเออร์ (Lead Time)</th>
                    <th className="p-4">วัตถุดิบสั่งซื้อ</th>
                    <th className="p-4">ยอดรวมสุทธิ</th>
                    <th className="p-4 text-center">หลักฐานการชำระ</th>
                    <th className="p-4 text-center">สถานะรับสินค้า</th>
                    <th className="p-4 text-right">ดำเนินการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-850 text-slate-300">
                  {purchaseOrders.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-slate-500 font-medium">
                        ยังไม่มีประวัติใบสั่งซื้อ PO ในระบบ
                      </td>
                    </tr>
                  ) : (
                    purchaseOrders.map(po => {
                      const sup = suppliers.find(s => s.id === po.supplierId);
                      const itemsSummary = po.items.map(item => {
                        const ing = ingredients.find(i => i.id === item.ingredientId);
                        return `${ing ? ing.name : 'วัตถุดิบ'} (${item.amount} ${ing?.unit || ''})`;
                      }).join(', ');

                      const isPaid = po.paymentStatus === 'PAID';

                      return (
                        <tr key={po.id} className="hover:bg-slate-850/10">
                          {/* 1. ID, Creation date & Expected arrival date */}
                          <td className="p-4">
                            <span className="font-bold text-slate-200 block font-mono">{po.id}</span>
                            <div className="flex flex-col gap-0.5 mt-1">
                              <span className="text-[10px] text-slate-500 font-mono flex items-center gap-1">
                                <Calendar className="w-3 h-3 text-slate-500 shrink-0" />
                                สั่งเมื่อ: {new Date(po.createdAt).toLocaleDateString('th-TH')}
                              </span>
                              {po.expectedArrivalDate && (
                                <span className="text-[10px] text-amber-400 font-mono font-bold flex items-center gap-1" title="วันส่งมอบที่คาดการณ์ตาม Lead Time">
                                  <Clock className="w-3 h-3 text-amber-400 shrink-0" />
                                  ส่งมอบ: {new Date(po.expectedArrivalDate).toLocaleDateString('th-TH')}
                                </span>
                              )}
                            </div>
                          </td>
                          {/* 2. Supplier Name & Lead Time */}
                          <td className="p-4 font-semibold text-white">
                            <div>{sup ? sup.name : 'ซัพพลายเออร์ไร้ชื่อ'}</div>
                            {sup && (
                              <span className="text-[9.5px] text-slate-500 font-normal block mt-0.5">
                                Lead time: {sup.leadTimeDays ?? 2} วัน
                              </span>
                            )}
                          </td>
                          {/* 3. Items list summary */}
                          <td className="p-4 max-w-[200px] truncate" title={itemsSummary}>
                            {itemsSummary}
                          </td>
                          {/* 4. Net Price */}
                          <td className="p-4 font-mono">
                            <span className="font-bold text-white block">{po.total.toLocaleString()} {currency}</span>
                            {po.vatType && po.vatType !== 'NO_VAT' && (
                              <span className="text-[10px] text-slate-400 block mt-0.5">
                                (ภาษี {po.vatRate}%: {po.vatAmount?.toLocaleString()} ฿)
                              </span>
                            )}
                          </td>
                          {/* 5. Proof of Payment Slip Status */}
                          <td className="p-4 text-center">
                            {isPaid ? (
                              <div className="flex flex-col items-center gap-1">
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9.5px] font-black bg-emerald-950 text-emerald-400 border border-emerald-900/30">
                                  <CheckCircle2 className="w-3 h-3 text-emerald-400" /> ชำระแล้ว
                                </span>
                                <button
                                  onClick={() => handleOpenSlipModal(po)}
                                  className="text-[10px] font-extrabold text-blue-400 hover:text-blue-300 transition-colors underline flex items-center gap-0.5"
                                >
                                  <ImageIcon className="w-3 h-3" /> ดูสลิปหลักฐาน
                                </button>
                              </div>
                            ) : (
                              <div className="flex flex-col items-center gap-1">
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9.5px] font-black bg-red-950 text-red-400 border border-red-900/30">
                                  <AlertTriangle className="w-3 h-3 text-red-400" /> ยังไม่แนบสลิป
                                </span>
                                <button
                                  onClick={() => handleOpenSlipModal(po)}
                                  className="text-[10px] font-extrabold text-amber-500 hover:text-amber-400 transition-colors flex items-center gap-0.5 bg-amber-950/40 border border-amber-900/20 px-2 py-0.5 rounded-md"
                                >
                                  <Upload className="w-3 h-3" /> แนบสลิปโอนเงิน
                                </button>
                              </div>
                            )}
                          </td>
                          {/* 6. Stock Status */}
                          <td className="p-4 text-center">
                            <span className={`inline-block px-2 py-0.5 rounded-full text-[9.5px] font-black ${
                              po.status === 'RECEIVED'
                                ? 'bg-green-950 text-green-400 border border-green-900/30'
                                : 'bg-amber-950 text-amber-500 border border-amber-900/30 animate-pulse'
                            }`}>
                              {po.status === 'RECEIVED' ? 'รับของเข้าสต๊อกแล้ว' : 'รอรับวัตถุดิบ'}
                            </span>
                          </td>
                          {/* 7. Action buttons */}
                          <td className="p-4 text-right">
                            {po.status === 'PENDING' ? (
                              <button
                                onClick={() => handleReceivePO(po)}
                                className="px-3 py-1.5 bg-gradient-to-r from-emerald-600 to-green-600 text-white font-bold rounded-lg text-[10px] flex items-center gap-1 inline-flex hover:opacity-95 shadow"
                              >
                                <Check className="w-3.5 h-3.5" /> ยืนยันรับของ
                              </button>
                            ) : (
                              <span className="text-[10px] text-slate-500 font-medium font-mono flex items-center justify-end gap-1">
                                <UserCheck className="w-3.5 h-3.5 text-green-500" /> บันทึกโดยคลังแล้ว
                              </span>
                            )}
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
        /* SUPPLIERS TAB */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" id="suppliers-tab-content">
          {/* Dashed Add Button Card */}
          <button
            onClick={() => setShowAddSupplierModal(true)}
            className="border-2 border-dashed border-slate-800 hover:border-slate-700 bg-slate-900/40 hover:bg-slate-900/60 transition-all rounded-2xl p-5 flex flex-col items-center justify-center text-slate-500 hover:text-slate-300 min-h-[220px] gap-2.5 group cursor-pointer"
            type="button"
          >
            <div className="p-3 bg-slate-950/60 rounded-full border border-slate-850 group-hover:scale-110 transition-transform">
              <Plus className="w-6 h-6 text-slate-400 group-hover:text-red-500" />
            </div>
            <span className="font-bold text-xs text-slate-300">เพิ่มซัพพลายเออร์คู่ค้าใหม่</span>
            <span className="text-[10px] text-slate-500 text-center max-w-[200px]">สร้างบัญชีคู่ค้าสำหรับจัดซื้อวัตถุดิบ</span>
          </button>

          {suppliers.map(sup => (
            <div key={sup.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 hover:border-slate-700 transition-all shadow-lg space-y-4">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-red-950/40 border border-red-900/30 text-red-500 rounded-xl">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-white text-xs">{sup.name}</h4>
                    <p className="text-[10px] text-slate-500 mt-0.5">ID: {sup.id}</p>
                  </div>
                </div>
                <span className="text-[10px] font-bold text-slate-500 font-mono bg-slate-950 px-2 py-0.5 border border-slate-850 rounded">
                  Active
                </span>
              </div>

              {/* Contact info */}
              <div className="space-y-2 border-t border-slate-850 pt-3 text-xs text-slate-400">
                <div className="flex items-center gap-2">
                  <Phone className="w-3.5 h-3.5 text-slate-500" />
                  <span>โทร: {sup.phone} ({sup.contact})</span>
                </div>
                <div className="flex items-start gap-2">
                  <MapPin className="w-3.5 h-3.5 text-slate-500 mt-0.5" />
                  <span className="line-clamp-2">ที่อยู่: {sup.address}</span>
                </div>
              </div>

              {/* Bank Details section */}
              <div className="bg-slate-950/80 rounded-xl p-3 border border-slate-850/60 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                    <CreditCard className="w-3.5 h-3.5 text-amber-500" /> ข้อมูลบัญชีรับเงิน
                  </span>
                  <button
                    onClick={() => handleOpenEditBankModal(sup)}
                    className="text-[9.5px] text-red-400 hover:text-red-300 transition-colors font-bold"
                  >
                    ✏️ แก้ไขบัญชี
                  </button>
                </div>
                {sup.bankName === 'เงินสด (Cash)' ? (
                  <div className="py-2 flex flex-col items-center justify-center gap-1 bg-amber-950/20 border border-amber-900/30 rounded-xl">
                    <span className="text-amber-400 text-[11px] font-black flex items-center gap-1.5">
                      💵 ชำระด้วยเงินสด (Cash Only)
                    </span>
                    <span className="text-[9px] text-slate-400 text-center">ชำระสดตรงหน้างาน / บันทึกประวัติการรับสด</span>
                  </div>
                ) : sup.bankName && sup.bankAccountNo ? (
                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between text-slate-400">
                      <span>ธนาคาร:</span>
                      <span className="font-bold text-slate-200">{sup.bankName}</span>
                    </div>
                    <div className="flex justify-between items-center text-slate-400">
                      <span>เลขบัญชี:</span>
                      <div className="flex items-center gap-1">
                        <span className="font-mono font-bold text-white bg-slate-900 px-1.5 py-0.5 border border-slate-800 rounded">{sup.bankAccountNo}</span>
                        <button
                          onClick={() => handleCopyText(sup.bankAccountNo || '', sup.id, 'sup')}
                          className="p-1 hover:bg-slate-800 text-slate-400 hover:text-white rounded transition-colors"
                          title="คัดลอกเลขบัญชี"
                          type="button"
                        >
                          <Copy className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                    {copiedSupplierId === sup.id && (
                      <p className="text-right text-[9.5px] text-emerald-400 font-bold animate-pulse">คัดลอกเลขบัญชีสำเร็จ!</p>
                    )}
                    <div className="flex justify-between text-slate-400">
                      <span>ชื่อบัญชี:</span>
                      <span className="font-semibold text-slate-300 truncate max-w-[140px]" title={sup.bankAccountName}>{sup.bankAccountName || sup.name}</span>
                    </div>
                  </div>
                ) : (
                  <div className="py-2 text-center">
                    <p className="text-[10.5px] text-slate-600 italic">ยังไม่มีการตั้งค่าข้อมูลบัญชีธนาคาร</p>
                    <button
                      onClick={() => handleOpenEditBankModal(sup)}
                      className="text-[10px] text-red-500 hover:underline font-bold mt-1 inline-block"
                      type="button"
                    >
                      + เพิ่มเลขบัญชีสำหรับชำระเงิน
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* CREATE NEW PO DIALOG MODAL */}
      {showCreatePOModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn" id="create-po-modal">
          <form onSubmit={handleSubmitPO} className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[580px]">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900">
              <h4 className="font-bold text-white text-sm">เขียนใบสั่งซื้อ PO ใหม่ (Purchase Order)</h4>
              <button 
                type="button"
                onClick={() => setShowCreatePOModal(false)}
                className="text-slate-500 hover:text-white p-1 rounded-lg hover:bg-slate-850"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 overflow-y-auto flex-1">
              {/* Select Supplier */}
              <div className="space-y-1.5">
                <span className="block text-xs font-semibold text-slate-300">ซัพพลายเออร์ผู้รับเหมาจัดส่ง</span>
                <select
                  value={selectedSupplierId}
                  onChange={(e) => setSelectedSupplierId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-850 text-white rounded-xl px-3 py-2 text-xs focus:outline-none"
                >
                  {suppliers.map(s => (
                    <option key={s.id} value={s.id}>{s.name} - ติดต่อ {s.contact}</option>
                  ))}
                </select>
              </div>

              {/* Input section to add items */}
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-850/80 space-y-3.5">
                <span className="block text-[11px] font-bold text-slate-400">ระบุรายละเอียดวัตถุดิบสายส่ง</span>
                
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div className="space-y-1">
                    <span className="text-[10px] text-slate-500 block">วัตถุดิบคลัง</span>
                    <select
                      value={selectedIngId}
                      onChange={(e) => {
                        setSelectedIngId(e.target.value);
                        // pre-fill unit cost
                        const ing = ingredients.find(i => i.id === e.target.value);
                        if (ing) setPoUnitCost(ing.unitCost);
                      }}
                      className="w-full bg-slate-900 border border-slate-800 text-white rounded-lg px-2.5 py-1.5 text-xs focus:outline-none"
                    >
                      {ingredients.map(i => (
                        <option key={i.id} value={i.id}>{i.name} ({i.unit})</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <span className="text-[10px] text-slate-500 block">จำนวนสั่งซื้อ</span>
                    <input
                      type="number"
                      min="1"
                      required
                      value={poAmount}
                      onChange={(e) => setPoAmount(parseInt(e.target.value) || 1)}
                      className="w-full bg-slate-900 border border-slate-800 text-white rounded-lg px-2.5 py-1 text-xs font-mono font-bold"
                    />
                  </div>

                  <div className="space-y-1">
                    <span className="text-[10px] text-slate-500 block">ต้นทุนส่งต่อหน่วย (฿)</span>
                    <input
                      type="number"
                      required
                      value={poUnitCost}
                      onChange={(e) => setPoUnitCost(parseInt(e.target.value) || 1)}
                      className="w-full bg-slate-900 border border-slate-800 text-white rounded-lg px-2.5 py-1 text-xs font-mono font-bold"
                    />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleAddItemToDraft}
                  className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-lg text-xs flex items-center justify-center gap-1 transition-all"
                >
                  <Plus className="w-4 h-4" /> เพิ่มสินค้าเข้ารายการ PO
                </button>
              </div>

              {/* Current Line Items list */}
              <div className="space-y-2">
                <span className="block text-xs font-bold text-slate-400">รายการพัสดุจัดซื้อในตาราง</span>
                
                {poItems.length === 0 ? (
                  <p className="text-xs text-slate-600 italic bg-slate-950 py-4 text-center rounded-xl border border-slate-850">
                    ยังไม่มีรายการวัตถุดิบในตารางสั่งซื้อ
                  </p>
                ) : (
                  <div className="divide-y divide-slate-800 max-h-[140px] overflow-y-auto pr-1">
                    {poItems.map(item => {
                      const ing = ingredients.find(i => i.id === item.ingredientId);
                      return (
                        <div key={item.ingredientId} className="py-2 flex justify-between items-center text-xs">
                          <div>
                            <span className="font-semibold text-slate-200">{ing ? ing.name : 'วัตถุดิบ'}</span>
                            <span className="block text-[10px] text-slate-500 font-mono">
                              {item.amount} {ing?.unit} x {item.unitCost}฿
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-white font-bold">{(item.amount * item.unitCost).toLocaleString()} ฿</span>
                            <button
                              type="button"
                              onClick={() => handleRemoveDraftItem(item.ingredientId)}
                              className="text-slate-500 hover:text-red-400 p-1 rounded hover:bg-red-950/20"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Purchase VAT Configuration */}
              <div className="space-y-2">
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-850/80 space-y-3">
                  <span className="block text-[11px] font-bold text-slate-400">กำหนดข้อมูลภาษีซื้อ (Purchase VAT Configuration)</span>
                  
                  <div className="grid grid-cols-2 gap-2.5">
                    <div className="space-y-1">
                      <span className="text-[10px] text-slate-500 block">ประเภทภาษีซื้อ</span>
                      <select
                        value={poVatType}
                        onChange={(e) => setPoVatType(e.target.value as 'INCLUSIVE' | 'EXCLUSIVE' | 'NO_VAT')}
                        className="w-full bg-slate-900 border border-slate-800 text-white rounded-lg px-2.5 py-1.5 text-xs focus:outline-none font-bold cursor-pointer"
                      >
                        <option value="NO_VAT">ไม่มีภาษี (No VAT)</option>
                        <option value="INCLUSIVE">รวมภาษี (VAT Inclusive)</option>
                        <option value="EXCLUSIVE">แยกภาษี (VAT Exclusive)</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <span className="text-[10px] text-slate-500 block">อัตราภาษี (%)</span>
                      <select
                        value={poVatRate}
                        onChange={(e) => setPoVatRate(parseInt(e.target.value) || 7)}
                        className="w-full bg-slate-900 border border-slate-800 text-white rounded-lg px-2.5 py-1.5 text-xs focus:outline-none font-bold disabled:opacity-50 cursor-pointer"
                        disabled={poVatType === 'NO_VAT'}
                      >
                        <option value={7}>7% (มาตรฐาน)</option>
                        <option value={0}>0% (ยกเว้น)</option>
                        <option value={10}>10%</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-4 bg-slate-950 border-t border-slate-800 flex justify-between items-center text-xs">
              {(() => {
                const { subtotal, vatAmount, total } = calculatePoDraftTotals();
                return (
                  <div className="space-y-0.5">
                    {poVatType !== 'NO_VAT' && (
                      <div className="space-y-0.5 mb-1 text-left">
                        <div className="flex gap-2 text-[10px] text-slate-500 font-mono">
                          <span>ก่อนภาษี:</span>
                          <span className="font-bold">฿{subtotal.toLocaleString()}</span>
                        </div>
                        <div className="flex gap-2 text-[10px] text-slate-500 font-mono">
                          <span>ภาษีซื้อ ({poVatRate}%):</span>
                          <span className="font-bold text-red-400">฿{vatAmount.toLocaleString()}</span>
                        </div>
                      </div>
                    )}
                    <div className="flex gap-1.5 items-baseline text-left">
                      <span className="text-slate-400 text-[11px] font-semibold">ยอดสุทธิ:</span>
                      <span className="text-red-500 font-black text-base font-mono">
                        ฿{total.toLocaleString()}
                      </span>
                    </div>
                  </div>
                );
              })()}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowCreatePOModal(false)}
                  className="py-2 px-4 border border-slate-800 hover:bg-slate-900 text-slate-400 rounded-xl text-xs font-semibold"
                >
                  ย้อนกลับ
                </button>
                <button
                  type="submit"
                  className="py-2 px-5 bg-gradient-to-r from-red-600 to-amber-600 text-white font-bold rounded-xl text-xs shadow"
                >
                  บันทึก PO รอจัดส่ง
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* ATTACH / VIEW SLIP DETAILS MODAL */}
      {showSlipModal && selectedPOForSlip && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn" id="slip-modal">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col md:flex-row max-h-[90vh]">
            
            {/* Left Side: Receipt Slip / Cash Visual Preview */}
            {(() => {
              const s = suppliers.find(su => su.id === selectedPOForSlip.supplierId);
              const isCash = s?.bankName === 'เงินสด (Cash)';

              if (isCash) {
                return (
                  <div className="w-full md:w-[420px] bg-slate-950 p-6 flex flex-col items-center justify-center border-b md:border-b-0 md:border-r border-slate-800/80 min-h-[350px]">
                    <div className="w-20 h-20 bg-emerald-500/10 border border-emerald-500/30 rounded-full flex items-center justify-center text-emerald-400 mb-4 animate-bounce">
                      <DollarSign className="w-10 h-10" />
                    </div>
                    <h4 className="text-sm font-bold text-emerald-400 text-center">💵 ชำระเงินสดหน้าร้าน (Cash Payment)</h4>
                    <p className="text-xs text-slate-400 text-center mt-2 max-w-[280px] leading-relaxed">
                      เนื่องจากซัพพลายเออร์รายนี้รับเงินสดเป็นหลัก ไม่จำเป็นต้องอัปโหลดสลิปธนาคาร ระบบจะปรับสถานะออเดอร์เป็น <span className="text-emerald-400 font-bold">"ชำระเงินแล้ว"</span> ทันทีหลังจากคุณกดบันทึก
                    </p>

                    <div className="mt-6 border-t border-slate-900 pt-4 w-full text-center">
                      <p className="text-[10px] text-slate-500 mb-2">หากต้องการอัปโหลดภาพใบเสร็จรับเงินสดเก็บไว้ (ถ้ามี):</p>
                      {slipFile ? (
                        <div className="relative bg-white p-2 rounded-lg max-w-[150px] mx-auto border border-slate-200">
                          <img src={slipFile} alt="ใบเสร็จเงินสด" className="max-h-[120px] object-contain rounded" referrerPolicy="no-referrer" />
                          <button
                            type="button"
                            onClick={() => setSlipFile('')}
                            className="absolute -top-1.5 -right-1.5 bg-red-600 text-white rounded-full p-1 hover:bg-red-500 transition-colors"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <label className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 border border-slate-800 hover:border-slate-750 text-slate-300 rounded-lg text-xs font-bold cursor-pointer transition-all">
                          <Upload className="w-3.5 h-3.5 text-slate-500" />
                          <span>อัปโหลดใบเสร็จ (ไม่บังคับ)</span>
                          <input 
                            type="file" 
                            accept="image/*" 
                            onChange={handleFileChange}
                            className="hidden" 
                          />
                        </label>
                      )}
                    </div>
                  </div>
                );
              }

              return (
                <div className="w-full md:w-[420px] bg-slate-950 p-6 flex flex-col items-center justify-center border-b md:border-b-0 md:border-r border-slate-800/80 min-h-[350px]">
                  <span className="text-[10px] font-bold text-slate-500 mb-3 block uppercase tracking-wider">
                    📱 ภาพหลักฐานสลิปโอนเงิน (Receipt Slip Preview)
                  </span>
                  
                  {slipFile ? (
                    <div className="relative group bg-white p-3 rounded-xl shadow-lg border border-slate-200">
                      <img 
                        src={slipFile} 
                        alt="หลักฐานสลิปโอนเงิน" 
                        className="max-h-[380px] w-auto max-w-[280px] object-contain rounded-lg"
                        referrerPolicy="no-referrer"
                      />
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 rounded-xl">
                        <button
                          onClick={handleTriggerAutoSlip}
                          className="px-3 py-1 bg-amber-500 text-slate-950 text-[10px] font-extrabold rounded-lg hover:bg-amber-400 transition-colors"
                        >
                          สุ่มสลิปจำลองใหม่
                        </button>
                        <button
                          onClick={() => setSlipFile('')}
                          className="px-3 py-1 bg-red-600 text-white text-[10px] font-extrabold rounded-lg hover:bg-red-500 transition-colors"
                        >
                          ลบภาพสลิป
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div 
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                      className={`w-full max-w-[280px] aspect-[3/4] rounded-2xl border-2 border-dashed flex flex-col items-center justify-center p-6 text-center transition-all ${
                        isDragging 
                          ? 'border-red-500 bg-red-950/10' 
                          : 'border-slate-800 bg-slate-900/30 hover:border-slate-700'
                      }`}
                    >
                      <Upload className="w-8 h-8 text-slate-600 mb-3 animate-pulse" />
                      <p className="text-xs font-bold text-slate-300">ลากและวางสลิปโอนเงินที่นี่</p>
                      <p className="text-[10px] text-slate-500 mt-1">รองรับ JPG, PNG หรือลากไฟล์มาวางได้โดยตรง</p>
                      <span className="text-[10px] text-slate-600 my-2 block">— หรือ —</span>
                      
                      <label className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-bold rounded-lg cursor-pointer transition-colors border border-slate-750">
                        เลือกไฟล์จากอุปกรณ์
                        <input 
                          type="file" 
                          accept="image/*" 
                          onChange={handleFileChange} 
                          className="hidden" 
                        />
                      </label>

                      {/* Programmatic slip option */}
                      <div className="mt-5 border-t border-slate-850 pt-4 w-full">
                        <p className="text-[9.5px] text-slate-500 mb-1.5">ต้องการสลิปโอนเงินเสมือนจริงของบิลนี้?</p>
                        <button
                          type="button"
                          onClick={handleTriggerAutoSlip}
                          className="w-full py-1.5 bg-gradient-to-r from-red-600/20 to-amber-600/20 hover:from-red-600/30 hover:to-amber-600/30 border border-red-900/30 text-amber-500 text-[10px] font-black rounded-lg transition-all"
                        >
                          ⚡️ สร้างสลิปจำลองด่วนอัตโนมัติ
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Right Side: Slip Information & Form Details */}
            <form onSubmit={handleSavePaymentSlip} className="flex-1 p-6 flex flex-col justify-between overflow-y-auto">
              <div className="space-y-5">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[10px] font-bold text-red-500 uppercase tracking-widest font-mono">
                      {selectedPOForSlip.id}
                    </span>
                    <h4 className="font-bold text-white text-lg mt-0.5">บันทึกประวัติการชำระเงินของ PO</h4>
                  </div>
                  <button 
                    type="button"
                    onClick={() => {
                      setShowSlipModal(false);
                      setSelectedPOForSlip(null);
                    }}
                    className="text-slate-500 hover:text-white p-1 rounded-lg hover:bg-slate-850"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Account details box for convenience */}
                {(() => {
                  const s = suppliers.find(su => su.id === selectedPOForSlip.supplierId);
                  if (!s) return null;
                  const isCash = s.bankName === 'เงินสด (Cash)';

                  if (isCash) {
                    return (
                      <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-850 space-y-2">
                        <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1">
                          <DollarSign className="w-3.5 h-3.5" /> ช่องทางการชำระเงินเริ่มต้น (เงินสด)
                        </p>
                        <div className="grid grid-cols-2 gap-3 text-xs pt-1">
                          <div>
                            <span className="text-[10px] text-slate-500 block">ชื่อคู่ค้า</span>
                            <span className="font-bold text-white block truncate">{s.name}</span>
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-500 block">ประเภทการจ่ายเงิน</span>
                            <span className="font-bold text-emerald-400 block">ชำระด้วยเงินสด (Cash Only)</span>
                          </div>
                          <div className="col-span-2 border-t border-slate-900 pt-2 mt-1">
                            <span className="text-[10px] text-slate-500 block">ที่อยู่ติดต่อจัดส่ง / สำนักงาน</span>
                            <span className="text-slate-300 block text-[11px] leading-relaxed">{s.address || 'ไม่ระบุที่อยู่'}</span>
                          </div>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-850 space-y-2">
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                        <CreditCard className="w-3.5 h-3.5 text-red-500" /> บัญชีปลายทางของผู้รับเงินโอน
                      </p>
                      <div className="grid grid-cols-2 gap-3 text-xs pt-1">
                        <div>
                          <span className="text-[10px] text-slate-500 block">ชื่อคู่ค้า</span>
                          <span className="font-bold text-white block truncate">{s.name}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-500 block">ธนาคาร</span>
                          <span className="font-bold text-amber-500 block">{s.bankName || 'กสิกรไทย'}</span>
                        </div>
                        <div className="col-span-2 flex items-center justify-between border-t border-slate-900 pt-2 mt-1">
                          <div>
                            <span className="text-[10px] text-slate-500 block">เลขที่บัญชี</span>
                            <span className="font-mono font-black text-white text-sm">{s.bankAccountNo || '123-4-56789-0'}</span>
                          </div>
                          <div className="flex flex-col items-end">
                            <button
                              type="button"
                              onClick={() => handleCopyText(s.bankAccountNo || '', 'po-modal', 'acc')}
                              className="px-2 py-1 bg-slate-900 border border-slate-850 rounded text-[10px] font-bold text-slate-400 hover:text-white flex items-center gap-1 transition-all"
                            >
                              <Copy className="w-3 h-3" /> คัดลอกเลขบัญชี
                            </button>
                            {copiedAccountNo === 'po-modal' && (
                              <span className="text-[9px] text-emerald-400 font-bold mt-1 animate-pulse">คัดลอกแล้ว!</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* Form fields */}
                <div className="space-y-3.5">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <span className="text-[10px] text-slate-400 font-bold block">วันที่ดำเนินการโอนเงิน</span>
                      <input 
                        type="date"
                        required
                        value={slipDate}
                        onChange={(e) => setSlipDate(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-850 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <span className="text-[10px] text-slate-400 font-bold block">ยอดโอนเงินสุทธิ (บาท)</span>
                      <div className="relative">
                        <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center text-slate-500 font-bold text-xs">฿</span>
                        <input 
                          type="text"
                          disabled
                          value={selectedPOForSlip.total.toLocaleString()}
                          className="w-full bg-slate-950/50 border border-slate-850/60 rounded-xl pl-6 pr-3 py-2 text-xs text-slate-400 font-mono font-extrabold focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <span className="text-[10px] text-slate-400 font-bold block">บันทึกช่วยจำเพิ่มเติม</span>
                    <textarea 
                      placeholder="เช่น โอนโดย บัญชีแอดมิน สมหญิง, จ่ายเช็คสั่งจ่ายล่วงหน้า, มัดจำ 50%..."
                      value={slipNote}
                      onChange={(e) => setSlipNote(e.target.value)}
                      rows={3}
                      className="w-full bg-slate-950 border border-slate-850 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-red-500/50 transition-all"
                    />
                  </div>
                </div>
              </div>

              {/* Action buttons */}
              <div className="border-t border-slate-850 pt-5 mt-5 flex justify-between items-center">
                {selectedPOForSlip.paymentSlip ? (
                  <button
                    type="button"
                    onClick={handleDeletePaymentSlip}
                    className="py-2 px-4 border border-red-900 hover:bg-red-950/20 text-red-500 rounded-xl text-xs font-bold transition-all"
                  >
                    🗑️ ลบหลักฐานสลิป
                  </button>
                ) : (
                  <div />
                )}

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowSlipModal(false);
                      setSelectedPOForSlip(null);
                    }}
                    className="py-2 px-4 border border-slate-800 hover:bg-slate-900 text-slate-400 rounded-xl text-xs font-semibold"
                  >
                    ย้อนกลับ
                  </button>
                  <button
                    type="submit"
                    className="py-2 px-6 bg-gradient-to-r from-red-600 to-amber-600 hover:opacity-95 text-white font-black rounded-xl text-xs shadow-lg transition-all"
                  >
                    {selectedPOForSlip.paymentSlip ? 'บันทึกการแก้ไขหลักฐาน' : 'บันทึกสลิปและยืนยันการจ่าย'}
                  </button>
                </div>
              </div>
            </form>

          </div>
        </div>
      )}

      {/* EDIT SUPPLIER BANK ACCOUNT DIALOG MODAL */}
      {editingSupplier && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn" id="edit-bank-modal">
          <form onSubmit={handleSaveSupplierBank} className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900">
              <h4 className="font-bold text-white text-sm">แก้ไขข้อมูลบัญชีธนาคารสำหรับจ่ายเงิน</h4>
              <button 
                type="button"
                onClick={() => setEditingSupplier(null)}
                className="text-slate-500 hover:text-white p-1 rounded-lg hover:bg-slate-850"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-850 flex items-center gap-2.5">
                <Building2 className="w-5 h-5 text-red-500 shrink-0" />
                <div>
                  <span className="text-[10px] text-slate-500 block">แก้ไขให้กับซัพพลายเออร์</span>
                  <span className="font-bold text-white text-xs">{editingSupplier.name}</span>
                </div>
              </div>

              {/* Bank Name Selection */}
              <div className="space-y-1">
                <span className="block text-xs font-semibold text-slate-300">เลือกหรือระบุชื่อธนาคาร / ช่องทางชำระเงิน</span>
                <select
                  value={editBankName}
                  onChange={(e) => setEditBankName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-850 text-white rounded-xl px-3 py-2 text-xs focus:outline-none"
                >
                  <option value="ธนาคารกสิกรไทย (KBANK)">ธนาคารกสิกรไทย (KBANK)</option>
                  <option value="ธนาคารไทยพาณิชย์ (SCB)">ธนาคารไทยพาณิชย์ (SCB)</option>
                  <option value="ธนาคารกรุงเทพ (BBL)">ธนาคารกรุงเทพ (BBL)</option>
                  <option value="ธนาคารกรุงไทย (KTB)">ธนาคารกรุงไทย (KTB)</option>
                  <option value="ธนาคารกรุงศรีอยุธยา (BAY)">ธนาคารกรุงศรีอยุธยา (BAY)</option>
                  <option value="ธนาคารออมสิน (GSB)">ธนาคารออมสิน (GSB)</option>
                  <option value="บัญชีพร้อมเพย์ (PromptPay)">บัญชีพร้อมเพย์ (PromptPay)</option>
                  <option value="เงินสด (Cash)">เงินสด (Cash)</option>
                </select>
              </div>

              {/* Bank Account Number */}
              {editBankName !== 'เงินสด (Cash)' && (
                <div className="space-y-1 animate-fadeIn">
                  <span className="block text-xs font-semibold text-slate-300">เลขที่บัญชีรับเงิน (Account No.)</span>
                  <input
                    type="text"
                    required={editBankName !== 'เงินสด (Cash)'}
                    placeholder="เช่น 123-4-56789-0 หรือเบอร์โทรศัพท์พร้อมเพย์"
                    value={editBankAccNo}
                    onChange={(e) => setEditBankAccNo(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-850 text-white rounded-xl px-3 py-2 text-xs font-mono font-bold focus:outline-none focus:border-red-500/50"
                  />
                </div>
              )}

              {/* Bank Account Name */}
              {editBankName !== 'เงินสด (Cash)' && (
                <div className="space-y-1 animate-fadeIn">
                  <span className="block text-xs font-semibold text-slate-300">ชื่อบัญชีผู้รับเงิน (Account Holder Name)</span>
                  <input
                    type="text"
                    required={editBankName !== 'เงินสด (Cash)'}
                    placeholder="เช่น บจก. พรีเมียมซัพพลาย หรือชื่อบุคคล"
                    value={editBankAccName}
                    onChange={(e) => setEditBankAccName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-850 text-white rounded-xl px-3 py-2 text-xs font-bold focus:outline-none focus:border-red-500/50"
                  />
                </div>
              )}
            </div>

            <div className="p-4 bg-slate-950 border-t border-slate-800 flex justify-end gap-2 text-xs">
              <button
                type="button"
                onClick={() => setEditingSupplier(null)}
                className="py-2 px-4 border border-slate-800 hover:bg-slate-900 text-slate-400 rounded-xl text-xs font-semibold"
              >
                ย้อนกลับ
              </button>
              <button
                type="submit"
                className="py-2 px-5 bg-gradient-to-r from-red-600 to-amber-600 text-white font-bold rounded-xl text-xs shadow"
              >
                บันทึกการตั้งค่า
              </button>
            </div>
          </form>
        </div>
      )}

      {/* CREATE NEW SUPPLIER DIALOG MODAL */}
      {showAddSupplierModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn" id="add-supplier-modal">
          <form onSubmit={handleCreateSupplier} className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900">
              <h4 className="font-bold text-white text-sm flex items-center gap-2">
                <Building2 className="w-4 h-4 text-red-500" /> เพิ่มซัพพลายเออร์คู่ค้าใหม่
              </h4>
              <button 
                type="button"
                onClick={() => setShowAddSupplierModal(false)}
                className="text-slate-500 hover:text-white p-1 rounded-lg hover:bg-slate-850"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 overflow-y-auto flex-1">
              {/* Partner Name */}
              <div className="space-y-1">
                <span className="block text-xs font-semibold text-slate-300">ชื่อซัพพลายเออร์ / ร้านค้า / บริษัท <span className="text-red-500">*</span></span>
                <input
                  type="text"
                  required
                  placeholder="เช่น ฟาร์มผักอินทรีย์ลุงชัย, สยามมีทโปรดักส์"
                  value={newSupplierName}
                  onChange={(e) => setNewSupplierName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-850 text-white rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:border-red-500/50"
                />
              </div>

              {/* Contact and Phone Grid */}
              <div className="grid grid-cols-2 gap-3.5">
                <div className="space-y-1">
                  <span className="block text-xs font-semibold text-slate-300">ผู้ติดต่อหลัก <span className="text-red-500">*</span></span>
                  <input
                    type="text"
                    required
                    placeholder="เช่น คุณชัยชนะ, แอดมินสมศรี"
                    value={newSupplierContact}
                    onChange={(e) => setNewSupplierContact(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-850 text-white rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-red-500/50"
                  />
                </div>
                <div className="space-y-1">
                  <span className="block text-xs font-semibold text-slate-300">เบอร์โทรศัพท์ติดต่อ <span className="text-red-500">*</span></span>
                  <input
                    type="text"
                    required
                    placeholder="เช่น 085-333-XXXX"
                    value={newSupplierPhone}
                    onChange={(e) => setNewSupplierPhone(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-850 text-white rounded-xl px-3 py-2 text-xs font-mono focus:outline-none focus:border-red-500/50"
                  />
                </div>
              </div>

              {/* Address */}
              <div className="space-y-1">
                <span className="block text-xs font-semibold text-slate-300">ที่อยู่จัดส่ง / สำนักงานใหญ่</span>
                <textarea
                  placeholder="เลขที่, ถนน, ตำบล, อำเภอ, จังหวัด..."
                  value={newSupplierAddress}
                  onChange={(e) => setNewSupplierAddress(e.target.value)}
                  rows={2}
                  className="w-full bg-slate-950 border border-slate-850 text-white rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-red-500/50"
                />
              </div>

              <hr className="border-slate-850" />

              {/* Payment Method / Bank Selection */}
              <div className="space-y-1.5">
                <span className="block text-xs font-semibold text-slate-300">ช่องทางการชำระเงินเริ่มต้น</span>
                <select
                  value={newSupplierBankName}
                  onChange={(e) => setNewSupplierBankName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-850 text-white rounded-xl px-3 py-2 text-xs focus:outline-none"
                >
                  <option value="ธนาคารกสิกรไทย (KBANK)">ธนาคารกสิกรไทย (KBANK)</option>
                  <option value="ธนาคารไทยพาณิชย์ (SCB)">ธนาคารไทยพาณิชย์ (SCB)</option>
                  <option value="ธนาคารกรุงเทพ (BBL)">ธนาคารกรุงเทพ (BBL)</option>
                  <option value="ธนาคารกรุงไทย (KTB)">ธนาคารกรุงไทย (KTB)</option>
                  <option value="ธนาคารกรุงศรีอยุธยา (BAY)">ธนาคารกรุงศรีอยุธยา (BAY)</option>
                  <option value="ธนาคารออมสิน (GSB)">ธนาคารออมสิน (GSB)</option>
                  <option value="บัญชีพร้อมเพย์ (PromptPay)">บัญชีพร้อมเพย์ (PromptPay)</option>
                  <option value="เงินสด (Cash)">เงินสด (Cash)</option>
                </select>
              </div>

              {/* Bank Acc details if not cash */}
              {newSupplierBankName !== 'เงินสด (Cash)' && (
                <div className="grid grid-cols-2 gap-3.5 animate-fadeIn">
                  <div className="space-y-1">
                    <span className="block text-xs font-semibold text-slate-300">เลขที่บัญชีรับเงิน</span>
                    <input
                      type="text"
                      required={newSupplierBankName !== 'เงินสด (Cash)'}
                      placeholder="123-4-56789-0"
                      value={newSupplierBankAccNo}
                      onChange={(e) => setNewSupplierBankAccNo(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-850 text-white rounded-xl px-3 py-2 text-xs font-mono font-bold focus:outline-none focus:border-red-500/50"
                    />
                  </div>
                  <div className="space-y-1">
                    <span className="block text-xs font-semibold text-slate-300">ชื่อบัญชีผู้รับเงิน</span>
                    <input
                      type="text"
                      required={newSupplierBankName !== 'เงินสด (Cash)'}
                      placeholder="เช่น ชื่อร้านค้า / นามบุคคล"
                      value={newSupplierBankAccName}
                      onChange={(e) => setNewSupplierBankAccName(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-850 text-white rounded-xl px-3 py-2 text-xs font-bold focus:outline-none focus:border-red-500/50"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 bg-slate-950 border-t border-slate-800 flex justify-end gap-2 text-xs">
              <button
                type="button"
                onClick={() => setShowAddSupplierModal(false)}
                className="py-2 px-4 border border-slate-800 hover:bg-slate-900 text-slate-400 rounded-xl text-xs font-semibold"
              >
                ย้อนกลับ
              </button>
              <button
                type="submit"
                className="py-2 px-6 bg-gradient-to-r from-red-600 to-amber-600 text-white font-bold rounded-xl text-xs shadow-lg"
              >
                บันทึกคู่ค้าใหม่
              </button>
            </div>
          </form>
        </div>
      )}

    </div>
  );
}
