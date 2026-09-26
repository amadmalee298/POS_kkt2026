import React, { useState, useEffect } from 'react';
import { Expense, Order, Ingredient, OtherIncome, TradeReceivable, TradePayable, PurchaseOrder, Supplier, StoreSettings, TaxInvoice, NotificationSettings } from '../types';
import { 
  DollarSign, TrendingUp, TrendingDown, Scale, Plus, 
  Layers, Calculator, FileSpreadsheet, Check, Filter, Trash2,
  Users, AlertCircle, Calendar, ArrowRight, UserCheck, ShieldCheck, CreditCard,
  Upload, X, Eye, FileText, Printer, Search, QrCode, Settings, Bot, Sparkles, Send
} from 'lucide-react';
import { 
  ResponsiveContainer, ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend 
} from 'recharts';
import TelegramExpenseSyncModal from './TelegramExpenseSyncModal';
import { getTelegramExpenseQueue } from '../utils/telegramExpenseSync';

interface AccountingProps {
  expenses: Expense[];
  orders: Order[];
  ingredients: Ingredient[];
  onAddExpense: (newExpense: Expense) => void;
  currency: string;
  otherIncomes: OtherIncome[];
  onAddOtherIncome: (newIncome: OtherIncome) => void;
  onUpdateOtherIncomes?: (updated: OtherIncome[]) => void;
  onUpdateExpenses?: (updated: Expense[]) => void;
  tradeReceivables: TradeReceivable[];
  onUpdateTradeReceivables: (updated: TradeReceivable[]) => void;
  tradePayables: TradePayable[];
  onUpdateTradePayables: (updated: TradePayable[]) => void;
  purchaseOrders?: PurchaseOrder[];
  suppliers?: Supplier[];
  storeSettings?: StoreSettings;
  onUpdateOrders?: (updated: Order[]) => void;
  notificationSettings?: NotificationSettings;
  onUpdateNotificationSettings?: (updated: NotificationSettings) => void;
}

interface PurchaseTaxLog {
  id: string;
  invoiceNo: string;
  supplierName: string;
  invoiceDate: string;
  amountExcludingTax: number;
  taxRate: number;
  purchaseTax: number;
  description: string;
}

interface BatchRow {
  invoiceNo: string;
  supplierName: string;
  invoiceDate: string;
  amountExcludingTax: number;
  taxRate: number;
  description: string;
}

export default function Accounting({ 
  expenses, orders, ingredients, onAddExpense, currency,
  otherIncomes = [], onAddOtherIncome, onUpdateOtherIncomes, onUpdateExpenses,
  tradeReceivables = [], onUpdateTradeReceivables,
  tradePayables = [], onUpdateTradePayables,
  purchaseOrders = [], suppliers = [],
  storeSettings, onUpdateOrders,
  notificationSettings, onUpdateNotificationSettings
}: AccountingProps) {
  // Local states
  const [activeTab, setActiveTab] = useState<'PL' | 'BALANCE' | 'CASHFLOW' | 'LOG_EXPENSE' | 'LOG_INCOME' | 'AR_AP' | 'PURCHASE_TAX' | 'SALES_TAX'>('PL');
  const [showExportModal, setShowExportModal] = useState(false);
  const [copied, setCopied] = useState(false);

  // Telegram Slip & Expense Sync states
  const [showTelegramSyncModal, setShowTelegramSyncModal] = useState(false);
  const [pendingTelegramCount, setPendingTelegramCount] = useState<number>(() => {
    try {
      const q = getTelegramExpenseQueue();
      return q.filter(item => item.status === 'PENDING').length;
    } catch {
      return 0;
    }
  });

  useEffect(() => {
    const checkQueue = () => {
      try {
        const q = getTelegramExpenseQueue();
        setPendingTelegramCount(q.filter(item => item.status === 'PENDING').length);
      } catch {}
    };
    checkQueue();
    const interval = setInterval(checkQueue, 4000);
    return () => clearInterval(interval);
  }, [showTelegramSyncModal]);

  // Purchase Tax States
  const [purchaseTaxLogs, setPurchaseTaxLogs] = useState<PurchaseTaxLog[]>(() => {
    const saved = localStorage.getItem('kp_purchaseTaxLogs');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error(e);
      }
    }
    return [
      {
        id: 'pt-1',
        invoiceNo: 'INV2026-0701',
        supplierName: 'เบทาโกร จำกัด (มหาชน)',
        invoiceDate: '2026-07-02',
        amountExcludingTax: 15000,
        taxRate: 7,
        purchaseTax: 1050,
        description: 'เนื้อไก่สดและสะโพกหมู สำหรับสาขาบรรทัดทอง'
      },
      {
        id: 'pt-2',
        invoiceNo: 'INV2026-0705',
        supplierName: 'แม็คโคร สาขาพระราม 4',
        invoiceDate: '2026-07-05',
        amountExcludingTax: 8400,
        taxRate: 7,
        purchaseTax: 588,
        description: 'ข้าวหอมมะลิ ซอสปรุงรส และวัตถุดิบแห้ง'
      },
      {
        id: 'pt-3',
        invoiceNo: 'INV2026-0710',
        supplierName: 'ฟาร์มผักสด คลองเตย',
        invoiceDate: '2026-07-10',
        amountExcludingTax: 4200,
        taxRate: 7,
        purchaseTax: 294,
        description: 'ใบกะเพราป่า พริกขี้หนูสวน และพริกแห้ง'
      }
    ];
  });

  // Single Input state for Purchase Tax form
  const [ptInvoiceNo, setPtInvoiceNo] = useState('');
  const [ptSupplierName, setPtSupplierName] = useState('');
  const [ptInvoiceDate, setPtInvoiceDate] = useState(new Date().toISOString().split('T')[0]);
  const [ptAmountEx, setPtAmountEx] = useState<number>(0);
  const [ptTaxRate, setPtTaxRate] = useState<number>(7);
  const [ptDesc, setPtDesc] = useState('');

  // Batch Add states
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [batchRows, setBatchRows] = useState<BatchRow[]>([
    { invoiceNo: '', supplierName: '', invoiceDate: new Date().toISOString().split('T')[0], amountExcludingTax: 0, taxRate: 7, description: '' }
  ]);

  // PDF Preview states
  const [showPdfPreview, setShowPdfPreview] = useState(false);

  // Sales Tax and Full Tax Invoice states
  const [selectedSalesInvoice, setSelectedSalesInvoice] = useState<Order | null>(null);
  const [salesSearchQuery, setSalesSearchQuery] = useState('');
  const [salesSelectedMonth, setSalesSelectedMonth] = useState('ALL');

  // Generator states for on-the-fly Full Tax Invoice creation
  const [showGenerateInvoiceModal, setShowGenerateInvoiceModal] = useState(false);
  const [genSelectedOrderId, setGenSelectedOrderId] = useState('');
  const [genCustName, setGenCustName] = useState('');
  const [genCustTaxId, setGenCustTaxId] = useState('');
  const [genCustAddress, setGenCustAddress] = useState('');
  const [genCustBranch, setGenCustBranch] = useState('00000');
  const [genErrorMessage, setGenErrorMessage] = useState('');

  // Print preview configuration options
  const [showCompanySeal, setShowCompanySeal] = useState(true);
  const [showSignatureLines, setShowSignatureLines] = useState(true);

  // Sync to local storage
  React.useEffect(() => {
    localStorage.setItem('kp_purchaseTaxLogs', JSON.stringify(purchaseTaxLogs));
  }, [purchaseTaxLogs]);

  // Dynamically derive combined purchase tax logs including received Purchase Orders with VAT
  const getCombinedPurchaseTaxLogs = () => {
    const poTaxLogs = (purchaseOrders || [])
      .filter(po => po.status === 'RECEIVED' && po.vatType && po.vatType !== 'NO_VAT' && po.vatAmount && po.vatAmount > 0)
      .map(po => {
        const sup = (suppliers || []).find(s => s.id === po.supplierId);
        return {
          id: `po-vat-${po.id}`,
          invoiceNo: po.id,
          supplierName: sup ? sup.name : 'ผู้จัดจำหน่ายอ้างอิง PO',
          invoiceDate: po.receivedAt ? po.receivedAt.split('T')[0] : po.createdAt.split('T')[0],
          amountExcludingTax: po.subtotal || (po.total - (po.vatAmount || 0)),
          taxRate: po.vatRate || 7,
          purchaseTax: po.vatAmount || 0,
          description: `ซื้อวัตถุดิบอัตโนมัติจากใบสั่งซื้อเลขที่ ${po.id}`,
          isFromPO: true
        };
      });
    return [...purchaseTaxLogs, ...poTaxLogs];
  };

  const handleExportAllPurchaseTaxCSV = () => {
    const combined = getCombinedPurchaseTaxLogs();
    const headers = ['เลขที่ใบกำกับภาษี', 'ชื่อผู้ขาย/ผู้จัดจำหน่าย', 'วันที่ใบกำกับภาษี', 'ยอดเงินก่อนภาษี (บาท)', 'อัตราภาษี (%)', 'ภาษีซื้อ (บาท)', 'หมายเหตุ'];
    const rows = combined.map(log => [
      `"${log.invoiceNo}"`,
      `"${log.supplierName}"`,
      log.invoiceDate,
      log.amountExcludingTax,
      log.taxRate,
      log.purchaseTax,
      `"${log.description || ''}"`
    ]);
    
    const csvContent = "\uFEFF" + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `รายงานภาษีซื้อ_ทั้งหมด_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportSalesTaxCSV = () => {
    const taxInvoices = orders.filter(o => o.taxInvoice);
    const headers = ['เลขที่ใบกำกับภาษี', 'ผู้ซื้อสินค้า', 'เลขประจำตัวผู้เสียภาษี', 'ที่อยู่', 'สาขา', 'วันที่ออก', 'ยอดรวมสุทธิ (บาท)', 'ภาษีขาย (บาท)'];
    const rows = taxInvoices.map(o => {
      const inv = o.taxInvoice!;
      const vat = o.vatAmount ?? Math.round((o.total * 7) / 107 * 100) / 100;
      return [
        `"${inv.invoiceNo}"`,
        `"${inv.customerName}"`,
        `"${inv.customerTaxId}"`,
        `"${inv.customerAddress}"`,
        `"${inv.customerBranch}"`,
        new Date(inv.issuedAt).toLocaleDateString('th-TH'),
        o.total,
        vat
      ];
    });
    
    const csvContent = "\uFEFF" + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `รายงานภาษีขาย_ทั้งหมด_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export current Expenses and Income lists as CSV file
  const handleExportExpensesAndIncomeCSV = () => {
    const headers = ['ลำดับ', 'วันที่', 'ประเภทธุรกรรม', 'หมวดหมู่', 'รายละเอียด', 'จำนวนเงิน (บาท)', 'การคิดภาษี (VAT)', 'จำนวน VAT (บาท)'];
    
    let index = 1;

    // 1. Other Incomes
    const incomeRows = (otherIncomes || []).map(inc => {
      const catText = inc.category === 'Delivery GP' ? 'ยอดขายช่องทาง Delivery' 
        : inc.category === 'Catering' ? 'บริการจัดเลี้ยง' 
        : inc.category === 'Space Rental' ? 'รายได้ค่าเช่าสถานที่' 
        : inc.category === 'Franchise Fee' ? 'ส่วนแบ่งแฟรนไชส์' 
        : 'รายรับอื่น';
      const vatText = inc.vatType === 'INCLUSIVE' ? 'รวม VAT 7%' : inc.vatType === 'EXCLUSIVE' ? 'แยก VAT 7%' : 'ไม่มี VAT';
      const vatAmt = inc.vatType === 'INCLUSIVE' ? Math.round((inc.amount * 7 / 107) * 100) / 100 : inc.vatType === 'EXCLUSIVE' ? Math.round((inc.amount * 0.07) * 100) / 100 : 0;
      
      return {
        date: inc.date || '',
        row: [
          index++,
          `"${inc.date || ''}"`,
          '"รายรับ (Other Income)"',
          `"${catText}"`,
          `"${(inc.description || '').replace(/"/g, '""')}"`,
          inc.amount,
          `"${vatText}"`,
          vatAmt
        ]
      };
    });

    // 2. Expenses
    const expenseRows = (expenses || []).map(exp => {
      const catText = exp.category === 'Rent' ? 'ค่าเช่าสถานที่' 
        : exp.category === 'Salary' ? 'ค่าแรง/เงินเดือนพนักงาน' 
        : exp.category === 'Electricity' ? 'ค่าไฟฟ้า' 
        : exp.category === 'Water' ? 'ค่าน้ำประปา' 
        : exp.category === 'Marketing' ? 'ค่าโฆษณา/การตลาด' 
        : exp.category === 'Ingredients' ? 'ซื้อวัตถุดิบ' 
        : 'ค่าใช้จ่ายเบ็ดเตล็ด';
      const vatText = exp.vatType === 'INCLUSIVE' ? 'รวม VAT 7%' : exp.vatType === 'EXCLUSIVE' ? 'แยก VAT 7%' : 'ไม่มี VAT';
      
      return {
        date: exp.date || '',
        row: [
          index++,
          `"${exp.date || ''}"`,
          '"รายจ่าย (Expense)"',
          `"${catText}"`,
          `"${(exp.description || '').replace(/"/g, '""')}"`,
          -exp.amount,
          `"${vatText}"`,
          exp.vatAmount || 0
        ]
      };
    });

    // 3. Paid POS Sales Orders
    const posPaidOrders = (orders || []).filter(o => o.paymentStatus === 'PAID');
    const posRows = posPaidOrders.map(order => {
      const orderDate = order.timestamp ? order.timestamp.split('T')[0] : '';
      const desc = `ออเดอร์ #${order.id} (โต๊ะ ${order.tableNo === 'TakeAway' ? 'กลับบ้าน' : order.tableNo})`;
      const vatText = order.vatAmount && order.vatAmount > 0 ? 'รวม VAT' : 'ไม่มี VAT';
      
      return {
        date: orderDate,
        row: [
          index++,
          `"${orderDate}"`,
          '"รายรับ (POS Sales)"',
          '"ขายอาหารหน้าร้าน POS"',
          `"${desc}"`,
          order.total,
          `"${vatText}"`,
          order.vatAmount || 0
        ]
      };
    });

    const combinedList = [...incomeRows, ...expenseRows, ...posRows];
    combinedList.sort((a, b) => (b.date > a.date ? 1 : b.date < a.date ? -1 : 0));

    const formattedRows = combinedList.map((item, idx) => {
      const r = [...item.row];
      r[0] = idx + 1;
      return r;
    });

    const csvContent = "\uFEFF" + [headers.join(','), ...formattedRows.map(e => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `รายงานรายรับรายจ่าย_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleGenerateInvoice = (e: React.FormEvent) => {
    e.preventDefault();
    setGenErrorMessage('');

    if (!genSelectedOrderId) {
      setGenErrorMessage('กรุณาเลือกรายการสั่งซื้อ (Please select an order)');
      return;
    }
    if (!genCustName.trim()) {
      setGenErrorMessage('กรุณากรอกชื่อลูกค้า / บจก. (Please enter customer name)');
      return;
    }
    if (!genCustTaxId.trim() || genCustTaxId.trim().length !== 13) {
      setGenErrorMessage('กรุณากรอกเลขประจำตัวผู้เสียภาษีให้ครบ 13 หลัก (Tax ID must be exactly 13 digits)');
      return;
    }
    if (!genCustAddress.trim()) {
      setGenErrorMessage('กรุณากรอกที่อยู่จดทะเบียนผู้เสียภาษี (Please enter registered address)');
      return;
    }
    if (!genCustBranch.trim()) {
      setGenErrorMessage('กรุณากรอกรหัสสาขา (Please enter branch code, e.g. 00000)');
      return;
    }

    const orderToUpdate = orders.find(o => o.id === genSelectedOrderId);
    if (!orderToUpdate) {
      setGenErrorMessage('ไม่พบข้อมูลการสั่งซื้อดังกล่าว (Order not found)');
      return;
    }

    // Generate compliant invoice number: TX-YYYYMMDD-XXXX (where XXXX is a random/serial suffix)
    const todayStr = new Date().toISOString().substring(0, 10).replace(/-/g, '');
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const invoiceNo = `TX-${todayStr}-${randomSuffix}`;

    const newInvoice: TaxInvoice = {
      invoiceNo,
      customerName: genCustName.trim(),
      customerTaxId: genCustTaxId.trim(),
      customerAddress: genCustAddress.trim(),
      customerBranch: genCustBranch.trim(),
      issuedAt: new Date().toISOString()
    };

    const updatedOrders = orders.map(o => {
      if (o.id === genSelectedOrderId) {
        return {
          ...o,
          taxInvoice: newInvoice,
          vatAmount: o.vatAmount ?? Math.round((o.total * 7) / 107 * 100) / 100
        };
      }
      return o;
    });

    if (onUpdateOrders) {
      onUpdateOrders(updatedOrders);
    }

    // Immediately trigger printable PDF preview modal for this brand new invoice!
    const newlyUpdatedOrder = updatedOrders.find(o => o.id === genSelectedOrderId) || orderToUpdate;
    setSelectedSalesInvoice(newlyUpdatedOrder);

    // Reset generator form states and close modal
    setGenSelectedOrderId('');
    setGenCustName('');
    setGenCustTaxId('');
    setGenCustAddress('');
    setGenCustBranch('00000');
    setShowGenerateInvoiceModal(false);
  };

  const handleExportCurrentMonthPurchaseTaxCSV = () => {
    const combined = getCombinedPurchaseTaxLogs();
    const currentMonthStr = new Date().toISOString().substring(0, 7);
    const filtered = combined.filter(log => log.invoiceDate.startsWith(currentMonthStr));
    
    if (filtered.length === 0) {
      alert(`⚠️ ไม่พบประวัติภาษีซื้อในรอบเดือนปัจจุบัน (${currentMonthStr}) เพื่อทำการส่งออก`);
      return;
    }

    const headers = ['เลขที่ใบกำกับภาษี', 'ชื่อผู้ขาย/ผู้จัดจำหน่าย', 'วันที่ใบกำกับภาษี', 'ยอดเงินก่อนภาษี (บาท)', 'อัตราภาษี (%)', 'ภาษีซื้อ (บาท)', 'หมายเหตุ'];
    const rows = filtered.map(log => [
      `"${log.invoiceNo}"`,
      `"${log.supplierName}"`,
      log.invoiceDate,
      log.amountExcludingTax,
      log.taxRate,
      log.purchaseTax,
      `"${log.description || ''}"`
    ]);
    
    const csvContent = "\uFEFF" + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `รายงานภาษีซื้อ_ประจำเดือน_${currentMonthStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleAddPurchaseTaxSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ptInvoiceNo || !ptSupplierName || ptAmountEx <= 0) {
      alert('กรุณากรอกข้อมูล เลขที่ใบกำกับ, ผู้จัดจำหน่าย และยอดเงินก่อนภาษีให้ครบถ้วน');
      return;
    }

    const newPT = {
      id: `pt-${Date.now()}`,
      invoiceNo: ptInvoiceNo,
      supplierName: ptSupplierName,
      invoiceDate: ptInvoiceDate,
      amountExcludingTax: ptAmountEx,
      taxRate: ptTaxRate,
      purchaseTax: Math.round((ptAmountEx * (ptTaxRate / 100)) * 100) / 100,
      description: ptDesc
    };

    setPurchaseTaxLogs([...purchaseTaxLogs, newPT]);

    setPtInvoiceNo('');
    setPtSupplierName('');
    setPtAmountEx(0);
    setPtDesc('');
    alert('✅ บันทึกประวัติภาษีซื้อสำเร็จ!');
  };

  const addBatchRow = () => {
    setBatchRows([
      ...batchRows,
      { invoiceNo: '', supplierName: '', invoiceDate: new Date().toISOString().split('T')[0], amountExcludingTax: 0, taxRate: 7, description: '' }
    ]);
  };

  const removeBatchRow = (index: number) => {
    if (batchRows.length === 1) return;
    setBatchRows(batchRows.filter((_, idx) => idx !== index));
  };

  const updateBatchRow = (index: number, key: string, val: string | number) => {
    const updated = batchRows.map((row, idx) => {
      if (idx === index) {
        return { ...row, [key]: val };
      }
      return row;
    });
    setBatchRows(updated);
  };

  const handleSaveBatchPurchaseTax = () => {
    const validRows = batchRows.filter(r => r.invoiceNo.trim() && r.supplierName.trim() && r.amountExcludingTax > 0);
    if (validRows.length === 0) {
      alert('⚠️ ไม่พบรายการที่สมบูรณ์ กรุณาระบุ เลขที่ใบกำกับ, ผู้จัดจำหน่าย และยอดเงินก่อนภาษี (มากกว่า 0) อย่างน้อย 1 รายการ');
      return;
    }

    const newLogs = validRows.map((r, i) => ({
      id: `pt-batch-${Date.now()}-${i}`,
      invoiceNo: r.invoiceNo,
      supplierName: r.supplierName,
      invoiceDate: r.invoiceDate,
      amountExcludingTax: r.amountExcludingTax,
      taxRate: r.taxRate,
      purchaseTax: Math.round((r.amountExcludingTax * (r.taxRate / 100)) * 100) / 100,
      description: r.description
    }));

    setPurchaseTaxLogs([...purchaseTaxLogs, ...newLogs]);
    setShowBatchModal(false);
    setBatchRows([{ invoiceNo: '', supplierName: '', invoiceDate: new Date().toISOString().split('T')[0], amountExcludingTax: 0, taxRate: 7, description: '' }]);
    alert(`✅ บันทึกภาษีซื้อแบบกลุ่มสำเร็จ จำนวน ${newLogs.length} รายการ!`);
  };

  const handleDeletePurchaseTax = (id: string) => {
    if (confirm('คุณต้องการลบรายการประวัติภาษีซื้อนี้ใช่หรือไม่?')) {
      setPurchaseTaxLogs(purchaseTaxLogs.filter(log => log.id !== id));
    }
  };

  
  // Log expense states
  const [expCategory, setExpCategory] = useState<Expense['category']>('Other');
  const [expAmount, setExpAmount] = useState<number>(1000);
  const [expDesc, setExpDesc] = useState('');
  const [expDate, setExpDate] = useState(new Date().toISOString().split('T')[0]);
  const [expVatType, setExpVatType] = useState<'NONE' | 'INCLUSIVE' | 'EXCLUSIVE'>('NONE');

  // Log other income states
  const [incCategory, setIncCategory] = useState<OtherIncome['category']>('Delivery GP');
  const [incAmount, setIncAmount] = useState<number>(1000);
  const [incDesc, setIncDesc] = useState('');
  const [incDate, setIncDate] = useState(new Date().toISOString().split('T')[0]);
  const [incVatType, setIncVatType] = useState<'NONE' | 'INCLUSIVE' | 'EXCLUSIVE'>('NONE');

  // Trade Accounts (AR/AP) states
  const [arClient, setArClient] = useState('');
  const [arAmount, setArAmount] = useState<number>(0);
  const [arDueDate, setArDueDate] = useState(new Date().toISOString().split('T')[0]);
  const [arDesc, setArDesc] = useState('');

  const [apSupplier, setApSupplier] = useState('');
  const [apAmount, setApAmount] = useState<number>(0);
  const [apDueDate, setApDueDate] = useState(new Date().toISOString().split('T')[0]);
  const [apDesc, setApDesc] = useState('');

  // Settle & Slip states
  const [settlingReceivable, setSettlingReceivable] = useState<TradeReceivable | null>(null);
  const [settlingPayable, setSettlingPayable] = useState<TradePayable | null>(null);
  const [settleSlip, setSettleSlip] = useState<string>('');
  const [viewingSlipUrl, setViewingSlipUrl] = useState<string | null>(null);
  const [viewingSlipTitle, setViewingSlipTitle] = useState<string>('');

  // Submit new Trade Receivable
  const handleAddReceivableSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!arClient || arAmount <= 0) return;

    const newAR: TradeReceivable = {
      id: `ar-${Date.now()}`,
      customerName: arClient,
      amount: arAmount,
      dueDate: arDueDate,
      status: 'PENDING',
      description: arDesc || 'ลูกหนี้การค้า',
      createdAt: new Date().toISOString().split('T')[0]
    };

    onUpdateTradeReceivables([...tradeReceivables, newAR]);

    // Reset
    setArClient('');
    setArAmount(0);
    setArDesc('');
  };

  // Submit new Trade Payable
  const handleAddPayableSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!apSupplier || apAmount <= 0) return;

    const newAP: TradePayable = {
      id: `ap-${Date.now()}`,
      supplierName: apSupplier,
      amount: apAmount,
      dueDate: apDueDate,
      status: 'PENDING',
      description: apDesc || 'เจ้าหนี้การค้า',
      createdAt: new Date().toISOString().split('T')[0]
    };

    onUpdateTradePayables([...tradePayables, newAP]);

    // Reset
    setApSupplier('');
    setApAmount(0);
    setApDesc('');
  };

  // Settle Trade Receivable (Collections)
  const handleSettleReceivable = (id: string) => {
    const ar = tradeReceivables.find(r => r.id === id);
    if (!ar) return;
    setSettlingReceivable(ar);
    setSettleSlip('');
  };

  const handleConfirmSettleReceivable = () => {
    if (!settlingReceivable) return;
    const id = settlingReceivable.id;
    
    // 1. Mark AR as PAID
    const updatedARs = tradeReceivables.map(r => r.id === id ? { ...r, status: 'PAID' as const, paymentSlip: settleSlip || undefined } : r);
    onUpdateTradeReceivables(updatedARs);

    // 2. Automatically log other income
    const newInc: OtherIncome = {
      id: `oi-ar-${Date.now()}`,
      category: 'Other',
      amount: settlingReceivable.amount,
      description: `[เก็บเงินลูกหนี้] ${settlingReceivable.customerName} - ${settlingReceivable.description}`,
      date: new Date().toISOString().split('T')[0],
      branchId: 'b1'
    };
    onAddOtherIncome(newInc);

    setSettlingReceivable(null);
    setSettleSlip('');
  };

  // Settle Trade Payable (Payments)
  const handleSettlePayable = (id: string) => {
    const ap = tradePayables.find(p => p.id === id);
    if (!ap) return;
    setSettlingPayable(ap);
    setSettleSlip('');
  };

  const handleConfirmSettlePayable = () => {
    if (!settlingPayable) return;
    const id = settlingPayable.id;

    // 1. Mark AP as PAID
    const updatedAPs = tradePayables.map(p => p.id === id ? { ...p, status: 'PAID' as const, paymentSlip: settleSlip || undefined } : r => r);
    const mappedAPs = tradePayables.map(p => p.id === id ? { ...p, status: 'PAID' as const, paymentSlip: settleSlip || undefined } : p);
    onUpdateTradePayables(mappedAPs);

    // 2. Automatically log expense
    const newExp: Expense = {
      id: `exp-ap-${Date.now()}`,
      category: 'Ingredients',
      amount: settlingPayable.amount,
      description: `[ชำระเจ้าหนี้] ${settlingPayable.supplierName} - ${settlingPayable.description}`,
      date: new Date().toISOString().split('T')[0],
      branchId: 'b1'
    };
    onAddExpense(newExp);

    setSettlingPayable(null);
    setSettleSlip('');
  };

  // Delete Receivable
  const handleDeleteReceivable = (id: string) => {
    if (confirm('คุณต้องการลบรายการลูกหนี้การค้านี้ใช่หรือไม่?')) {
      onUpdateTradeReceivables(tradeReceivables.filter(r => r.id !== id));
    }
  };

  // Delete Payable
  const handleDeletePayable = (id: string) => {
    if (confirm('คุณต้องการลบรายการเจ้าหนี้การค้านี้ใช่หรือไม่?')) {
      onUpdateTradePayables(tradePayables.filter(p => p.id !== id));
    }
  };

  // State for P&L Month Selector
  const [selectedPLMonth, setSelectedPLMonth] = useState<string>('ALL');

  // Helper to get available months in descending order
  const getAvailableMonths = () => {
    const months = new Set<string>();
    
    orders.forEach(o => {
      if (o.timestamp) {
        const m = o.timestamp.substring(0, 7);
        if (m && m.match(/^\d{4}-\d{2}$/)) {
          months.add(m);
        }
      }
    });

    expenses.forEach(e => {
      if (e.date) {
        const m = e.date.substring(0, 7);
        if (m && m.match(/^\d{4}-\d{2}$/)) {
          months.add(m);
        }
      }
    });

    otherIncomes.forEach(oi => {
      if (oi.date) {
        const m = oi.date.substring(0, 7);
        if (m && m.match(/^\d{4}-\d{2}$/)) {
          months.add(m);
        }
      }
    });

    return Array.from(months).sort((a, b) => b.localeCompare(a));
  };

  // Helper to format YYYY-MM to Thai month name and BE year
  const formatMonthThai = (yearMonthStr: string) => {
    if (!yearMonthStr || yearMonthStr === 'ALL') return 'สะสมทั้งหมด (All Time)';
    const parts = yearMonthStr.split('-');
    if (parts.length !== 2) return yearMonthStr;
    const year = parts[0];
    const month = parts[1];
    const thaiMonths = [
      'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
      'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
    ];
    const monthIndex = parseInt(month, 10) - 1;
    if (monthIndex < 0 || monthIndex > 11) return yearMonthStr;
    const thaiYear = parseInt(year, 10) + 543;
    return `${thaiMonths[monthIndex]} ${thaiYear}`;
  };

  // P&L calculation function
  const calculatePLMetrics = (monthFilter: string) => {
    const isAll = monthFilter === 'ALL';
    
    // Filter orders
    const fOrders = isAll 
      ? orders 
      : orders.filter(o => o.timestamp && o.timestamp.startsWith(monthFilter));
    
    const fPaidOrders = fOrders.filter(o => o.paymentStatus === 'PAID');
    const fPOSRevenue = fPaidOrders.reduce((sum, o) => sum + o.total, 0);
    const fVATCollected = fPaidOrders.reduce((sum, o) => sum + (o.vatAmount || 0), 0);
    const fServiceChargeCollected = fPaidOrders.reduce((sum, o) => sum + (o.serviceChargeAmount || 0), 0);

    // Filter other incomes
    const fOtherIncomes = isAll 
      ? otherIncomes 
      : otherIncomes.filter(oi => oi.date && oi.date.startsWith(monthFilter));
    const fOtherIncome = fOtherIncomes.reduce((sum, i) => sum + i.amount, 0);
    const fRevenue = fPOSRevenue + fOtherIncome;

    // Filter expenses
    const fExpenses = isAll 
      ? expenses 
      : expenses.filter(e => e.date && e.date.startsWith(monthFilter));
    
    // Calculate COGS
    let fCOGS = 0;
    fPaidOrders.forEach(o => {
      o.items.forEach(item => {
        const estimatedIngredientCost = (item.price * 0.36) * item.quantity;
        const estimatedEggCost = item.addFriedEgg ? 4.2 * item.quantity : 0;
        fCOGS += (estimatedIngredientCost + estimatedEggCost);
      });
    });

    const fGrossMargin = fPOSRevenue - fCOGS;

    // OPEX categories
    const fRent = fExpenses.filter(e => e.category === 'Rent').reduce((sum, e) => sum + e.amount, 0);
    const fSalary = fExpenses.filter(e => e.category === 'Salary').reduce((sum, e) => sum + e.amount, 0);
    const fElectricity = fExpenses.filter(e => e.category === 'Electricity').reduce((sum, e) => sum + e.amount, 0);
    const fWater = fExpenses.filter(e => e.category === 'Water').reduce((sum, e) => sum + e.amount, 0);
    const fMarketing = fExpenses.filter(e => e.category === 'Marketing').reduce((sum, e) => sum + e.amount, 0);
    const fOtherExp = fExpenses.filter(e => e.category === 'Other' || e.category === 'Ingredients').reduce((sum, e) => sum + e.amount, 0);
    
    const fOPEX = fExpenses.reduce((sum, e) => sum + e.amount, 0);
    const fNetOperatingIncome = fGrossMargin + fOtherIncome - fOPEX;

    // VAT
    const fOtherIncomeVAT = fOtherIncomes.reduce((sum, oi) => sum + (oi.vatAmount || 0), 0);
    const fOutputVAT = fVATCollected + fOtherIncomeVAT;
    const fInputVAT = fExpenses.reduce((sum, exp) => sum + (exp.vatAmount || 0), 0);
    const fNetVATPayable = fOutputVAT - fInputVAT;

    return {
      ordersCount: fOrders.length,
      paidOrdersCount: fPaidOrders.length,
      posRevenue: fPOSRevenue,
      vatCollected: fVATCollected,
      serviceChargeCollected: fServiceChargeCollected,
      otherIncome: fOtherIncome,
      totalRevenue: fRevenue,
      cogs: fCOGS,
      grossMargin: fGrossMargin,
      rent: fRent,
      salary: fSalary,
      electricity: fElectricity,
      water: fWater,
      marketing: fMarketing,
      otherExp: fOtherExp,
      totalOPEX: fOPEX,
      netOperatingIncome: fNetOperatingIncome,
      outputVAT: fOutputVAT,
      inputVAT: fInputVAT,
      netVATPayable: fNetVATPayable,
      otherIncomesBreakdown: fOtherIncomes
    };
  };

  // Get metrics for the selected month to render on screen
  const currentPL = calculatePLMetrics(selectedPLMonth);

  // Helper to generate copyable CSV text
  const generateCSV = () => {
    let csv = '\uFEFF'; // UTF-8 BOM so Excel opens Thai language correctly
    csv += 'ประเภทบัญชี,รายการ,จำนวนเงิน (บาท)\n';
    csv += `รายรับ,ยอดขายอาหารหน้าร้าน POS,${currentPL.posRevenue - currentPL.vatCollected - currentPL.serviceChargeCollected}\n`;
    if (currentPL.serviceChargeCollected > 0) {
      csv += `รายรับ,ค่าบริการสะสมหน้าร้าน (Service Charge),${currentPL.serviceChargeCollected}\n`;
    }
    if (currentPL.vatCollected > 0) {
      csv += `รายรับ,ภาษีขายสะสมหน้าร้าน (Output VAT),${currentPL.vatCollected}\n`;
    }
    
    const otherIncs = currentPL.otherIncomesBreakdown;
    const catLabels = {
      'Delivery GP': 'ยอดขายช่องทาง Delivery Apps',
      'Catering': 'บริการจัดเลี้ยงนอกสถานที่',
      'Space Rental': 'ค่าเช่าพื้นที่ติดตั้งตู้กด/ป้ายโฆษณา',
      'Franchise Fee': 'ส่วนแบ่งค่าลิขสิทธิ์ / ค่าแฟรนไชส์',
      'Other': 'รายได้เสริมหมวดหมู่อื่นๆ'
    };
    Object.entries(catLabels).forEach(([cat, label]) => {
      const amt = otherIncs.filter(oi => oi.category === cat).reduce((sum, oi) => sum + oi.amount, 0);
      if (amt > 0) {
        csv += `รายรับ,${label},${amt}\n`;
      }
    });
    
    csv += `ต้นทุนขาย,ต้นทุนวัตถุดิบและสูตรลดสต๊อก (COGS),-${currentPL.cogs}\n`;
    csv += `ค่าใช้จ่ายดำเนินงาน,ค่าเช่าสถานที่พื้นที่โครงการ,-${currentPL.rent}\n`;
    csv += `ค่าใช้จ่ายดำเนินงาน,ค่าจ้าง/ค่าแรงพนักงานและแม่ครัว,-${currentPL.salary}\n`;
    csv += `ค่าใช้จ่ายดำเนินงาน,ค่าไฟฟ้า,-${currentPL.electricity}\n`;
    csv += `ค่าใช้จ่ายดำเนินงาน,ค่าน้ำประปา,-${currentPL.water}\n`;
    csv += `ค่าใช้จ่ายดำเนินงาน,ค่าโปรโมทโฆษณาและการตลาด,-${currentPL.marketing}\n`;
    csv += `ค่าใช้จ่ายดำเนินงาน,ค่าเบ็ดเตล็ดและค่าใช้จ่ายอื่นๆ,-${currentPL.otherExp}\n`;
    csv += `ภาษี,ภาษีขายสะสม (Output VAT),${currentPL.outputVAT}\n`;
    csv += `ภาษี,ภาษีซื้อสะสม (Input VAT),-${currentPL.inputVAT}\n`;
    csv += `สรุปผลกำไร,กำไรสุทธิ (Net Profit),${currentPL.netOperatingIncome}\n`;
    return csv;
  };

  // 1. DYNAMIC REVENUE CALCULATIONS
  const paidOrders = orders.filter(o => o.paymentStatus === 'PAID');
  const totalPOSRevenue = paidOrders.reduce((sum, o) => sum + o.total, 0);
  const totalVATCollected = paidOrders.reduce((sum, o) => sum + (o.vatAmount || 0), 0);
  const totalServiceChargeCollected = paidOrders.reduce((sum, o) => sum + (o.serviceChargeAmount || 0), 0);

  // Other Incomes calculations
  const totalOtherIncome = otherIncomes.reduce((sum, i) => sum + i.amount, 0);
  const totalRevenue = totalPOSRevenue + totalOtherIncome;

  // 2. COST OF GOODS SOLD (COGS)
  // Calculate exact total cost of raw ingredients used for all paid orders
  let totalCOGS = 0;
  paidOrders.forEach(o => {
    o.items.forEach(item => {
      const estimatedIngredientCost = (item.price * 0.36) * item.quantity;
      const estimatedEggCost = item.addFriedEgg ? 4.2 * item.quantity : 0;
      totalCOGS += (estimatedIngredientCost + estimatedEggCost);
    });
  });

  const grossMargin = totalPOSRevenue - totalCOGS; // gross margin from food sales

  // 3. OPERATING EXPENSES (OPEX)
  const rentExpenses = expenses.filter(e => e.category === 'Rent').reduce((sum, e) => sum + e.amount, 0);
  const salaryExpenses = expenses.filter(e => e.category === 'Salary').reduce((sum, e) => sum + e.amount, 0);
  const electricityExpenses = expenses.filter(e => e.category === 'Electricity').reduce((sum, e) => sum + e.amount, 0);
  const waterExpenses = expenses.filter(e => e.category === 'Water').reduce((sum, e) => sum + e.amount, 0);
  const marketingExpenses = expenses.filter(e => e.category === 'Marketing').reduce((sum, e) => sum + e.amount, 0);
  const otherExpenses = expenses.filter(e => e.category === 'Other' || e.category === 'Ingredients').reduce((sum, e) => sum + e.amount, 0);

  const totalOPEX = expenses.reduce((sum, e) => sum + e.amount, 0);
  
  // Net operating income includes POS Gross Margin + Other Incomes - Operating Expenses
  const netOperatingIncome = grossMargin + totalOtherIncome - totalOPEX;

  // 3.5 VAT CALCULATIONS (ภาษีซื้อ - ภาษีขาย)
  const totalOtherIncomeVAT = otherIncomes.reduce((sum, oi) => sum + (oi.vatAmount || 0), 0);
  const totalOutputVAT = totalVATCollected + totalOtherIncomeVAT; // ภาษีขายสะสม
  const totalInputVAT = expenses.reduce((sum, exp) => sum + (exp.vatAmount || 0), 0); // ภาษีซื้อสะสม
  const netVATPayable = totalOutputVAT - totalInputVAT; // ภาษีต้องนำส่งสุทธิ (ติดลบคือเครดิตภาษีสะสม)

  // 4. BALANCE SHEET
  // Outstanding unpaid Trade Receivables (ลูกหนี้การค้า)
  const activeReceivables = tradeReceivables.filter(r => r.status === 'PENDING');
  const totalTradeReceivables = activeReceivables.reduce((sum, r) => sum + r.amount, 0);

  // Outstanding unpaid Trade Payables (เจ้าหนี้การค้า)
  const activePayables = tradePayables.filter(p => p.status === 'PENDING');
  const totalTradePayables = activePayables.reduce((sum, p) => sum + p.amount, 0);

  // Cash on hand (starting capital 150,000 + POS revenue + other income - expenses)
  const initialCapital = 150000;
  const cashOnHand = initialCapital + totalPOSRevenue + totalOtherIncome - totalOPEX;
  
  // Inventory asset value (dynamic: sum of stock * unitCost)
  const totalInventoryAssetVal = ingredients.reduce((sum, ing) => sum + (ing.stock * ing.unitCost), 0);

  // Equipment & Assets fixed value
  const equipmentAndAssetsVal = 85000;

  // Total Assets = Cash + Inventory + Equipment + Trade Receivables
  const totalAssets = cashOnHand + totalInventoryAssetVal + totalTradeReceivables;
  const finalTotalAssets = totalAssets + equipmentAndAssetsVal;

  // Total Liabilities = Trade Payables + VAT Payable (if any)
  const vatPayableVal = netVATPayable > 0 ? netVATPayable : 0;
  const totalLiabilities = totalTradePayables + vatPayableVal;

  // Retained earnings can be represented as the dynamic balancing residual of assets and liabilities/capital:
  const retainedEarningsVal = finalTotalAssets - totalLiabilities - initialCapital;


  // Submit new expense
  const handleAddExpenseSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (expAmount <= 0) return;

    let computedVat = 0;
    let finalAmount = expAmount;

    if (expVatType === 'INCLUSIVE') {
      computedVat = Math.round((expAmount * 7 / 107) * 100) / 100;
    } else if (expVatType === 'EXCLUSIVE') {
      computedVat = Math.round((expAmount * 0.07) * 100) / 100;
      finalAmount = expAmount + computedVat;
    }

    const newExp: Expense = {
      id: `exp-${Date.now()}`,
      category: expCategory,
      amount: finalAmount,
      description: expDesc || `ค่า${expCategory}`,
      date: expDate,
      branchId: 'b1',
      vatAmount: computedVat
    };

    onAddExpense(newExp);
    
    // Reset fields
    setExpDesc('');
    setExpAmount(1000);
    setExpVatType('NONE');
    setActiveTab('CASHFLOW'); // redirect to Cash Flow to see log
  };

  // Submit other income
  const handleAddOtherIncomeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (incAmount <= 0) return;

    let computedVat = 0;
    let finalAmount = incAmount;

    if (incVatType === 'INCLUSIVE') {
      computedVat = Math.round((incAmount * 7 / 107) * 100) / 100;
    } else if (incVatType === 'EXCLUSIVE') {
      computedVat = Math.round((incAmount * 0.07) * 100) / 100;
      finalAmount = incAmount + computedVat;
    }

    const newInc: OtherIncome = {
      id: `oi-${Date.now()}`,
      category: incCategory,
      amount: finalAmount,
      description: incDesc || `รายได้${incCategory}`,
      date: incDate,
      branchId: 'b1',
      vatAmount: computedVat
    };

    onAddOtherIncome(newInc);
    
    // Reset fields
    setIncDesc('');
    setIncAmount(1000);
    setIncVatType('NONE');
    setActiveTab('CASHFLOW'); // redirect to Cash Flow to see log
  };

  // Delete Expense handler
  const handleDeleteExpense = (id: string) => {
    if (confirm('คุณต้องการยกเลิกและลบรายการรายจ่ายนี้ใช่หรือไม่?')) {
      if (onUpdateExpenses) {
        onUpdateExpenses(expenses.filter(e => e.id !== id));
      }
    }
  };

  // Delete Other Income handler
  const handleDeleteOtherIncome = (id: string) => {
    if (confirm('คุณต้องการยกเลิกและลบรายการรายรับอื่นๆ นี้ใช่หรือไม่?')) {
      if (onUpdateOtherIncomes) {
        onUpdateOtherIncomes(otherIncomes.filter(oi => oi.id !== id));
      }
    }
  };

  return (
    <div className="space-y-6" id="accounting-panel">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">การเงินและสมุดบัญชี (Accounting & Books)</h2>
          <p className="text-xs text-slate-400">สรุปงบกำไรขาดทุน (P&L) รายงานงบดุล กระแสเงินสดหมวนเวียน ช่องทางรายได้อื่นๆ และการบันทึกค่าใช้จ่าย</p>
        </div>
        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          <button
            onClick={handleExportExpensesAndIncomeCSV}
            className="flex-1 sm:flex-none px-3.5 py-2 bg-slate-950 border border-emerald-800/60 hover:border-emerald-500 text-xs text-emerald-400 font-bold rounded-xl flex items-center justify-center gap-1.5 hover:bg-emerald-950/30 transition-all shadow cursor-pointer"
            title="ดาวน์โหลดรายการรายรับและรายจ่ายเป็นไฟล์ CSV"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" /> Export CSV (รายรับ-รายจ่าย)
          </button>
          <button
            onClick={() => setActiveTab('LOG_INCOME')}
            className="flex-1 sm:flex-none px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 hover:opacity-95 shadow transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" /> บันทึกรายรับอื่น
          </button>
          <button
            onClick={() => setActiveTab('LOG_EXPENSE')}
            className="flex-1 sm:flex-none px-4 py-2 bg-gradient-to-r from-red-600 to-amber-600 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 hover:opacity-95 shadow transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" /> บันทึกใบเบิกจ่าย
          </button>
          <button
            onClick={() => setShowTelegramSyncModal(true)}
            className="flex-1 sm:flex-none px-4 py-2 bg-gradient-to-r from-indigo-600 via-teal-600 to-emerald-600 hover:from-indigo-500 hover:to-emerald-500 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-md transition-all cursor-pointer relative"
            title="ดึงสลิปหรือรายการค่าใช้จ่ายจาก Telegram Bot อัตโนมัติ"
          >
            <Bot className="w-4 h-4" />
            <span>⚡ ดึงสลิปจาก Telegram</span>
            {pendingTelegramCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[9px] bg-amber-400 text-slate-950 font-black animate-pulse">
                {pendingTelegramCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Navigation tabs */}
      <div className="flex border-b border-slate-800 overflow-x-auto whitespace-nowrap scrollbar-none">
        <button
          onClick={() => setActiveTab('PL')}
          className={`py-3 px-5 text-xs font-bold border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'PL' ? 'border-red-500 text-white' : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          <FileSpreadsheet className="w-4 h-4" /> งบกำไรขาดทุน (P&L)
        </button>
        <button
          onClick={() => setActiveTab('BALANCE')}
          className={`py-3 px-5 text-xs font-bold border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'BALANCE' ? 'border-red-500 text-white' : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          <Scale className="w-4 h-4" /> งบแสดงฐานะการเงิน (Balance Sheet)
        </button>
        <button
          onClick={() => setActiveTab('CASHFLOW')}
          className={`py-3 px-5 text-xs font-bold border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'CASHFLOW' ? 'border-red-500 text-white' : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          <Layers className="w-4 h-4" /> บันทึกรายรับ-รายจ่าย (Cash Flow)
        </button>
        <button
          onClick={() => setActiveTab('AR_AP')}
          className={`py-3 px-5 text-xs font-bold border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'AR_AP' ? 'border-red-500 text-white' : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          <Users className="w-4 h-4" /> บัญชีลูกหนี้ & เจ้าหนี้การค้า (AR / AP)
        </button>
        <button
          onClick={() => setActiveTab('PURCHASE_TAX')}
          className={`py-3 px-5 text-xs font-bold border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'PURCHASE_TAX' ? 'border-red-500 text-white' : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          <Calculator className="w-4 h-4" /> จัดการภาษีซื้อ (Purchase Tax)
        </button>
        <button
          onClick={() => setActiveTab('SALES_TAX')}
          className={`py-3 px-5 text-xs font-bold border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'SALES_TAX' ? 'border-red-500 text-white' : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          <FileText className="w-4 h-4" /> จัดการภาษีขาย (Sales Tax / Tax Invoices)
        </button>
        <button
          onClick={() => setShowTelegramSyncModal(true)}
          className="py-3 px-5 text-xs font-bold border-b-2 border-transparent text-indigo-400 hover:text-indigo-300 hover:border-indigo-500/50 transition-all flex items-center gap-2 cursor-pointer bg-indigo-950/20"
        >
          <Bot className="w-4 h-4 text-indigo-400" />
          <span>Telegram ดึงสลิป/ค่าใช้จ่าย</span>
          {pendingTelegramCount > 0 && (
            <span className="px-1.5 py-0.2 rounded-full text-[9px] bg-amber-400 text-slate-950 font-black">
              {pendingTelegramCount}
            </span>
          )}
        </button>
      </div>

      {activeTab === 'PL' ? (
        /* P&L งบกำไรขาดทุน */
        <div className="space-y-6">
          {/* Month Selector & Controls */}
          <div className="bg-slate-900 border border-slate-800/80 rounded-2xl p-5 shadow-lg flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="space-y-1">
              <span className="text-[10px] bg-red-500/10 text-red-400 px-2 py-0.5 rounded-full font-bold border border-red-500/20 uppercase tracking-wider">
                AUTO-CALCULATED P&L
              </span>
              <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-slate-400" />
                สรุปบัญชีกำไรขาดทุนรายเดือน (Monthly Billing Period)
              </h3>
              <p className="text-xs text-slate-400">
                ดึงข้อมูลจาก ยอดขายขายหน้าร้าน POS, ใบเสร็จเบิกจ่ายรายจ่าย (OPEX) และบันทึกช่องทางรายได้เสริมอื่นอัตโนมัติ
              </p>
            </div>
            
            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
              <div className="relative flex-1 md:flex-none">
                <select
                  value={selectedPLMonth}
                  onChange={(e) => setSelectedPLMonth(e.target.value)}
                  className="w-full md:w-56 bg-slate-950 border border-slate-800 text-xs text-white rounded-xl py-2 pl-3 pr-8 appearance-none focus:outline-none focus:border-red-500 font-bold"
                >
                  <option value="ALL">🗓️ แสดงสะสมทั้งหมด (All Time)</option>
                  {getAvailableMonths().map(m => (
                    <option key={m} value={m}>
                      🗓️ {formatMonthThai(m)}
                    </option>
                  ))}
                </select>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 text-[10px]">
                  ▼
                </div>
              </div>

              <button
                onClick={() => setShowExportModal(true)}
                className="px-3.5 py-2 bg-slate-950 border border-slate-800 text-xs text-slate-300 font-bold rounded-xl flex items-center gap-1.5 hover:bg-slate-850 hover:text-white transition-all shadow"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                ส่งออกงบ (Export)
              </button>
            </div>
          </div>

          {/* Monthly P&L Trend Chart */}
          <div className="bg-slate-900 border border-slate-800/80 rounded-2xl p-5 shadow-lg space-y-4">
            <div className="flex justify-between items-center border-b border-slate-800/60 pb-3">
              <div>
                <h4 className="text-xs font-bold text-white tracking-wide uppercase">แผนภูมิแนวโน้มรายเดือน (Monthly Financial Trend)</h4>
                <p className="text-[11px] text-slate-400">ภาพรวมสัดส่วนรายรับ ต้นทุน และยอดกำไรสุทธิแต่ละเดือน</p>
              </div>
              <span className="text-[10px] text-emerald-400 bg-emerald-950/30 border border-emerald-900/30 px-2 py-0.5 rounded font-mono font-semibold">
                Recharts Dynamic
              </span>
            </div>

            {getAvailableMonths().length > 0 ? (
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart 
                    data={[...getAvailableMonths()].reverse().map(m => {
                      const mData = calculatePLMetrics(m);
                      return {
                        monthLabel: formatMonthThai(m).split(' ')[0], // only show month name
                        revenue: mData.totalRevenue,
                        costs: mData.cogs + mData.totalOPEX,
                        profit: mData.netOperatingIncome
                      };
                    })} 
                    margin={{ top: 10, right: 5, left: -20, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                    <XAxis dataKey="monthLabel" stroke="#64748b" fontSize={10} tickLine={false} />
                    <YAxis stroke="#64748b" fontSize={10} tickLine={false} />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const rev = payload[0]?.value as number;
                          const cst = payload[1]?.value as number;
                          const prf = payload[2]?.value as number;
                          return (
                            <div className="bg-slate-950/95 border border-slate-800 p-3 rounded-xl shadow-xl space-y-1.5 backdrop-blur-sm">
                              <p className="text-[11px] font-bold text-white">{payload[0]?.payload.monthLabel}</p>
                              <div className="text-[11px] space-y-0.5">
                                <div className="flex justify-between gap-6 text-teal-400">
                                  <span>รายได้:</span>
                                  <span className="font-mono font-bold">{(rev || 0).toLocaleString()} ฿</span>
                                </div>
                                <div className="flex justify-between gap-6 text-rose-400">
                                  <span>ต้นทุน & OPEX:</span>
                                  <span className="font-mono font-bold">{(cst || 0).toLocaleString()} ฿</span>
                                </div>
                                <div className={`flex justify-between gap-6 border-t border-slate-800 pt-1 font-bold ${prf >= 0 ? 'text-emerald-400' : 'text-rose-500'}`}>
                                  <span>กำไรสุทธิ:</span>
                                  <span className="font-mono">{(prf || 0).toLocaleString()} ฿</span>
                                </div>
                              </div>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Legend 
                      verticalAlign="top" 
                      height={36} 
                      iconSize={8}
                      iconType="circle"
                      wrapperStyle={{ fontSize: '10px', color: '#94a3b8' }} 
                    />
                    <Bar dataKey="revenue" name="รายได้รวม" fill="#0d9488" radius={[4, 4, 0, 0]} barSize={28} />
                    <Bar dataKey="costs" name="ต้นทุนและรายจ่าย" fill="#f43f5e" radius={[4, 4, 0, 0]} barSize={28} />
                    <Line type="monotone" dataKey="profit" name="กำไรสุทธิ (Net)" stroke="#10b981" strokeWidth={3} dot={{ r: 4, stroke: '#10b981', strokeWidth: 2, fill: '#020617' }} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-40 flex items-center justify-center border border-dashed border-slate-800 rounded-xl">
                <p className="text-xs text-slate-500">ไม่มีข้อมูลเพียงพอสำหรับประมวลผลแผนภูมิ</p>
              </div>
            )}
          </div>

          {/* Metric Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-slate-900 border border-slate-800/80 p-5 rounded-2xl flex flex-col justify-between">
              <div>
                <span className="text-xs text-slate-400 font-medium">ยอดรวมรายได้ทุกช่องทาง (Total Revenue)</span>
                <h3 className="text-2xl font-bold text-white mt-1">{currentPL.totalRevenue.toLocaleString()}{currency}</h3>
              </div>
              <p className="text-[11px] text-green-400 mt-1 flex flex-wrap gap-x-2">
                <span>POS: {currentPL.posRevenue.toLocaleString()} ฿</span>
                <span className="text-slate-500">|</span>
                <span>อื่น: {currentPL.otherIncome.toLocaleString()} ฿</span>
              </p>
            </div>
            <div className="bg-slate-900 border border-slate-800/80 p-5 rounded-2xl flex flex-col justify-between">
              <div>
                <span className="text-xs text-slate-400 font-medium">ต้นทุนค่าวัตถุดิบอาหาร (COGS)</span>
                <h3 className="text-2xl font-bold text-slate-300 mt-1">{currentPL.cogs.toLocaleString(undefined, { maximumFractionDigits: 0 })}{currency}</h3>
              </div>
              <p className="text-[11px] text-yellow-500 mt-1">
                สัดส่วน: {((currentPL.cogs / (currentPL.posRevenue || 1)) * 100).toFixed(1)}% ของยอด POS
              </p>
            </div>
            <div className="bg-slate-900 border border-slate-800/80 p-5 rounded-2xl flex flex-col justify-between">
              <div>
                <span className="text-xs text-slate-400 font-medium">กำไรสุทธิรวมปลายงวด (Net Profit)</span>
                <h3 className={`text-2xl font-bold mt-1 ${currentPL.netOperatingIncome >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {currentPL.netOperatingIncome.toLocaleString(undefined, { maximumFractionDigits: 0 })}{currency}
                </h3>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                รอบบิล: {selectedPLMonth === 'ALL' ? 'สะสมทั้งหมด' : formatMonthThai(selectedPLMonth)}
              </p>
            </div>
            <div className="bg-slate-900 border border-slate-800/80 p-5 rounded-2xl flex flex-col justify-between">
              <div>
                <span className="text-xs text-slate-400 font-medium">ภาษีมูลค่าเพิ่มนำส่งสุทธิ (Net VAT)</span>
                <h3 className={`text-2xl font-bold mt-1 ${currentPL.netVATPayable >= 0 ? 'text-amber-500' : 'text-emerald-400'}`}>
                  {currentPL.netVATPayable.toLocaleString(undefined, { maximumFractionDigits: 0 })}{currency}
                </h3>
              </div>
              <p className="text-[11px] text-slate-400 mt-1 flex flex-wrap gap-x-1.5">
                <span className="text-red-400">ขาย: {currentPL.outputVAT.toLocaleString()} ฿</span>
                <span className="text-slate-500">|</span>
                <span className="text-emerald-400">ซื้อ: {currentPL.inputVAT.toLocaleString()} ฿</span>
              </p>
            </div>
          </div>

          {/* Detailed sheet */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="font-bold text-white text-base">งบสรุปกำไรขาดทุนรายละเอียด (P&L Sheet)</h3>
              <p className="text-xs text-slate-400 font-medium">รอบ: {formatMonthThai(selectedPLMonth)}</p>
            </div>
            
            <div className="space-y-3.5 text-xs text-slate-300">
              {/* รายได้ */}
              <div className="flex justify-between items-center font-bold border-b border-slate-850 pb-2">
                <span className="text-white text-sm">1. รายรับและรายได้รวม (Total Revenue & Incomes)</span>
                <span className="font-mono text-sm text-white">{currentPL.totalRevenue.toLocaleString()}{currency}</span>
              </div>

              <div className="space-y-1.5 pl-4 pb-2 border-b border-slate-850 text-slate-400 text-[11px]">
                <div className="flex justify-between font-medium text-slate-300">
                  <span>รายได้ยอดขายอาหารหน้าร้าน POS สุทธิ</span>
                  <span className="font-mono">{(currentPL.posRevenue - currentPL.vatCollected - currentPL.serviceChargeCollected).toLocaleString()}{currency}</span>
                </div>
                {currentPL.serviceChargeCollected > 0 && (
                  <div className="flex justify-between">
                    <span>ค่าบริการสะสมหน้าร้าน (Service Charge)</span>
                    <span className="font-mono">+{currentPL.serviceChargeCollected.toLocaleString()}{currency}</span>
                  </div>
                )}
                {currentPL.vatCollected > 0 && (
                  <div className="flex justify-between">
                    <span>ภาษีมูลค่าเพิ่มสะสมหน้าร้าน (Output VAT)</span>
                    <span className="font-mono">+{currentPL.vatCollected.toLocaleString()}{currency}</span>
                  </div>
                )}
                
                {/* Other income categories breakdown */}
                {currentPL.otherIncomesBreakdown.filter(i => i.category === 'Delivery GP').length > 0 && (
                  <div className="flex justify-between text-emerald-400/90">
                    <span>ยอดขายผ่านช่องทาง Delivery Apps (GP Channels)</span>
                    <span className="font-mono">+{currentPL.otherIncomesBreakdown.filter(i => i.category === 'Delivery GP').reduce((sum, i) => sum + i.amount, 0).toLocaleString()}{currency}</span>
                  </div>
                )}
                {currentPL.otherIncomesBreakdown.filter(i => i.category === 'Catering').length > 0 && (
                  <div className="flex justify-between text-emerald-400/90">
                    <span>รายได้บริการจัดเลี้ยงนอกสถานที่ (Catering Services)</span>
                    <span className="font-mono">+{currentPL.otherIncomesBreakdown.filter(i => i.category === 'Catering').reduce((sum, i) => sum + i.amount, 0).toLocaleString()}{currency}</span>
                  </div>
                )}
                {currentPL.otherIncomesBreakdown.filter(i => i.category === 'Space Rental').length > 0 && (
                  <div className="flex justify-between text-emerald-400/90">
                    <span>รายได้ค่าเช่าพื้นที่ติดตั้งตู้กด/ป้ายโฆษณา</span>
                    <span className="font-mono">+{currentPL.otherIncomesBreakdown.filter(i => i.category === 'Space Rental').reduce((sum, i) => sum + i.amount, 0).toLocaleString()}{currency}</span>
                  </div>
                )}
                {currentPL.otherIncomesBreakdown.filter(i => i.category === 'Franchise Fee').length > 0 && (
                  <div className="flex justify-between text-emerald-400/90">
                    <span>รายได้ส่วนแบ่งลิขสิทธิ์ / ค่าแฟรนไชส์สาขาพ่วง</span>
                    <span className="font-mono">+{currentPL.otherIncomesBreakdown.filter(i => i.category === 'Franchise Fee').reduce((sum, i) => sum + i.amount, 0).toLocaleString()}{currency}</span>
                  </div>
                )}
                {currentPL.otherIncomesBreakdown.filter(i => i.category === 'Other').length > 0 && (
                  <div className="flex justify-between text-emerald-400/90">
                    <span>รายได้เสริมหมวดหมู่อื่นๆ</span>
                    <span className="font-mono">+{currentPL.otherIncomesBreakdown.filter(i => i.category === 'Other').reduce((sum, i) => sum + i.amount, 0).toLocaleString()}{currency}</span>
                  </div>
                )}
              </div>

              {/* ต้นทุนขาย */}
              <div className="flex justify-between items-center pl-4 text-slate-400">
                <span>หัก ต้นทุนวัตถุดิบอาหารและสูตรลดสต๊อก (Cost of Goods Sold - COGS)</span>
                <span className="font-mono">- {currentPL.cogs.toLocaleString(undefined, { maximumFractionDigits: 0 })}{currency}</span>
              </div>

              {/* กำไรขั้นต้น */}
              <div className="flex justify-between items-center font-bold bg-slate-950 p-3 rounded-xl border border-slate-850">
                <span className="text-slate-100">กำไรขั้นต้นส่วนการขาย (Gross Profit)</span>
                <span className="font-mono text-white">{currentPL.grossMargin.toLocaleString(undefined, { maximumFractionDigits: 0 })}{currency}</span>
              </div>

              {/* รายรับเสริมอื่นรวม */}
              <div className="flex justify-between items-center pl-4 text-emerald-400 font-bold">
                <span>รวมรายได้เสริมจากช่องทางอื่นๆ ทั้งหมด (Total Other Incomes)</span>
                <span className="font-mono font-bold">+{currentPL.otherIncome.toLocaleString()}{currency}</span>
              </div>

              {/* ค่าใช้จ่ายดำเนินงาน */}
              <div className="space-y-2.5 pt-2">
                <span className="font-bold text-white block">2. ค่าใช้จ่ายในการดำเนินงานร้าน (Operating Expenses - OPEX)</span>
                <div className="flex justify-between items-center pl-4 text-slate-400">
                  <span>ค่าเช่าสถานที่พื้นที่โครงการ (Rent Expense)</span>
                  <span className="font-mono">{currentPL.rent.toLocaleString()}{currency}</span>
                </div>
                <div className="flex justify-between items-center pl-4 text-slate-400">
                  <span>ค่าจ้าง/ค่าแรงพนักงานและแม่ครัว (Payroll Expense)</span>
                  <span className="font-mono">{currentPL.salary.toLocaleString()}{currency}</span>
                </div>
                <div className="flex justify-between items-center pl-4 text-slate-400">
                  <span>ค่าสาธารณูปโภค ค่าไฟฟ้า (Electricity Bill)</span>
                  <span className="font-mono">{currentPL.electricity.toLocaleString()}{currency}</span>
                </div>
                <div className="flex justify-between items-center pl-4 text-slate-400">
                  <span>ค่าสาธารณูปโภค ค่าน้ำประปา (Water Bill)</span>
                  <span className="font-mono">{currentPL.water.toLocaleString()}{currency}</span>
                </div>
                <div className="flex justify-between items-center pl-4 text-slate-400">
                  <span>ค่าโปรโมทโฆษณาและการตลาด (Marketing Expenses)</span>
                  <span className="font-mono">{currentPL.marketing.toLocaleString()}{currency}</span>
                </div>
                <div className="flex justify-between items-center pl-4 text-slate-400">
                  <span>ค่าเบ็ดเตล็ดและค่าใช้จ่ายอื่นๆ (Other Expenses)</span>
                  <span className="font-mono">{currentPL.otherExp.toLocaleString()}{currency}</span>
                </div>
              </div>

              {/* ค่าใช้จ่ายรวม */}
              <div className="flex justify-between items-center font-bold pl-4 border-t border-slate-800 pt-2 text-slate-400">
                <span>รวมค่าใช้จ่ายในการดำเนินงาน (Total OPEX)</span>
                <span className="font-mono text-red-400">- {currentPL.totalOPEX.toLocaleString()}{currency}</span>
              </div>

              {/* ข้อมูลภาษีมูลค่าเพิ่ม */}
              <div className="space-y-2.5 pt-4 border-t border-slate-800 pb-2">
                <span className="font-bold text-white block">3. รายงานภาษีมูลค่าเพิ่มสะสม (Value Added Tax - VAT)</span>
                <div className="flex justify-between items-center pl-4 text-slate-400">
                  <span>ภาษีขายสะสม (Output VAT - จาก POS & รายรับอื่น)</span>
                  <span className="font-mono text-red-400">+{currentPL.outputVAT.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}{currency}</span>
                </div>
                <div className="flex justify-between items-center pl-4 text-slate-400">
                  <span>ภาษีซื้อสะสม (Input VAT - จากบิลค่าใช้จ่าย)</span>
                  <span className="font-mono text-emerald-400">-{currentPL.inputVAT.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}{currency}</span>
                </div>
                <div className="flex justify-between items-center pl-4 font-semibold text-slate-300">
                  <span>ภาษีนำส่งสุทธิสะสม (Net VAT Payable)</span>
                  <span className={`font-mono ${currentPL.netVATPayable >= 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                    {currentPL.netVATPayable >= 0 ? '+' : ''}{currentPL.netVATPayable.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}{currency}
                  </span>
                </div>
              </div>

              {/* กำไรสุทธิปลายงวด */}
              <div className="flex justify-between items-center font-extrabold text-base bg-red-950/20 text-red-400 p-4 rounded-xl border border-red-900/30">
                <span className="text-slate-100 text-sm">กำไรสุทธิรวม (Net Operating Income)</span>
                <span className="font-mono text-emerald-400 text-lg">
                  {currentPL.netOperatingIncome.toLocaleString(undefined, { maximumFractionDigits: 0 })}{currency}
                </span>
              </div>
            </div>
          </div>
        </div>
      ) : activeTab === 'BALANCE' ? (
        /* BALANCE SHEET */
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
          <div>
            <h3 className="font-bold text-white text-base">งบแสดงฐานะการเงิน (Balance Sheet)</h3>
            <p className="text-xs text-slate-400 mt-0.5">ตรวจสอบความมั่งคั่งร้านด้วย สมการบัญชี: สินทรัพย์ = หนี้สิน + ส่วนของเจ้าของ</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
            {/* ฝั่งซ้าย: สินทรัพย์ (Assets) */}
            <div className="space-y-4 bg-slate-950 p-5 rounded-xl border border-slate-850">
              <h4 className="font-bold text-emerald-400 text-sm border-b border-slate-800 pb-2">สินทรัพย์ (Assets)</h4>
              
              <div className="space-y-3">
                <div className="flex justify-between text-slate-300">
                  <span className="font-medium">เงินสดในมือ / ในบัญชีธนาคารร้าน (Cash on Hand)</span>
                  <span className="font-mono font-bold text-white">{cashOnHand.toLocaleString(undefined, { maximumFractionDigits: 0 })}{currency}</span>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span className="font-medium">ลูกหนี้การค้าคงค้าง (Accounts Receivable - AR)</span>
                  <span className="font-mono font-bold text-emerald-400">+{totalTradeReceivables.toLocaleString(undefined, { maximumFractionDigits: 0 })}{currency}</span>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span className="font-medium">มูลค่าคลังวัตถุดิบคงเหลือ (Inventory Asset)</span>
                  <span className="font-mono font-bold text-white">{totalInventoryAssetVal.toLocaleString(undefined, { maximumFractionDigits: 0 })}{currency}</span>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span className="font-medium">อุปกรณ์และเครื่องใช้จัดเตรียมครัว (Equipment & Assets)</span>
                  <span className="font-mono text-slate-400">85,000{currency}</span>
                </div>
                {netVATPayable < 0 && (
                  <div className="flex justify-between text-slate-300">
                    <span className="font-medium text-emerald-400">ภาษีซื้อรอนำคืนสะสม (VAT Credit)</span>
                    <span className="font-mono text-emerald-400">+{Math.abs(netVATPayable).toLocaleString(undefined, { minimumFractionDigits: 2 })} ฿</span>
                  </div>
                )}

                <div className="flex justify-between text-emerald-400 font-extrabold border-t border-slate-800 pt-3 text-sm">
                  <span>รวมสินทรัพย์ทั้งหมด (Total Assets)</span>
                  <span className="font-mono">{finalTotalAssets.toLocaleString(undefined, { maximumFractionDigits: 0 })}{currency}</span>
                </div>
              </div>
            </div>

            {/* ฝั่งขวา: หนี้สิน + ส่วนของทุน (Liabilities & Owner's Equity) */}
            <div className="space-y-4 bg-slate-950 p-5 rounded-xl border border-slate-850 flex flex-col justify-between">
              <div className="space-y-4">
                <h4 className="font-bold text-red-400 text-sm border-b border-slate-800 pb-2">หนี้สินและทุน (Liabilities & Equity)</h4>
                
                <div className="space-y-3">
                  <div className="flex justify-between text-slate-300">
                    <span className="font-medium">เจ้าหนี้การค้าคงค้าง (Accounts Payable - AP)</span>
                    <span className="font-mono text-red-400 font-bold">+{totalTradePayables.toLocaleString()}{currency}</span>
                  </div>
                  {netVATPayable > 0 && (
                    <div className="flex justify-between text-slate-300">
                      <span className="font-medium text-amber-500">ภาษีมูลค่าเพิ่มค้างนำส่ง (VAT Payable)</span>
                      <span className="font-mono text-amber-400">+{netVATPayable.toLocaleString(undefined, { minimumFractionDigits: 2 })} ฿</span>
                    </div>
                  )}
                  <div className="flex justify-between text-slate-300">
                    <span className="font-medium">ทุนจดทะเบียนเริ่มต้นร้าน (Share Capital)</span>
                    <span className="font-mono text-slate-400">150,000{currency}</span>
                  </div>
                  <div className="flex justify-between text-slate-300">
                    <span className="font-medium">กำไรสะสมปรับปรุง (Retained Earnings)</span>
                    <span className="font-mono text-white font-bold">{retainedEarningsVal.toLocaleString(undefined, { maximumFractionDigits: 0 })}{currency}</span>
                  </div>
                </div>
              </div>

              <div className="flex justify-between text-red-400 font-extrabold border-t border-slate-800 pt-3 text-sm mt-4">
                <span>รวมหนี้สินและส่วนของทุน (Total Liabilities & Equity)</span>
                <span className="font-mono">{(totalLiabilities + initialCapital + retainedEarningsVal).toLocaleString(undefined, { maximumFractionDigits: 0 })}{currency}</span>
              </div>
            </div>
          </div>

          <div className="bg-slate-950 p-3.5 border border-slate-800/85 rounded-xl text-xs flex items-center justify-center gap-2">
            <Calculator className="w-4 h-4 text-emerald-500 animate-pulse" />
            <span className="font-medium text-slate-300">สถานะงบดุล: <strong className="text-emerald-400">ดุลลงตัวสมบูรณ์</strong> (สินทรัพย์เท่ากับหนี้สินบวกส่วนทุนเรียบร้อย)</span>
          </div>
        </div>
      ) : activeTab === 'CASHFLOW' ? (
        /* CASH FLOWS TIMELINE (COMBINED LOG) */
        <div className="space-y-4">
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
            <div>
              <span className="text-slate-200 font-bold block">ตารางสรุปกระแสเงินสดผ่านระบบและบิลเบิกจ่าย (Cashflow Chronology)</span>
              <span className="text-slate-400 text-[11px]">รายรับหน้าร้าน POS, รายรับช่องทางอื่นๆ และรายจ่ายประจำสาขา</span>
            </div>
            <button
              onClick={handleExportExpensesAndIncomeCSV}
              className="px-3.5 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow transition-all cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4" /> Export CSV (รายการรายรับ-รายจ่าย)
            </button>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs divide-y divide-slate-800">
                <thead>
                  <tr className="bg-slate-950 text-slate-400 font-bold uppercase">
                    <th className="p-4">วันเวลาบันทึก</th>
                    <th className="p-4">ประเภท/ช่องทางธุรกรรม</th>
                    <th className="p-4">รายละเอียดผู้จ่าย/บันทึกการเบิก</th>
                    <th className="p-4 text-center">ประเภทธุรกรรม</th>
                    <th className="p-4 text-right">จำนวนเงินสุทธิ</th>
                    <th className="p-4 text-center w-20">จัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-850 text-slate-300">
                  {/* Other Incomes mapped as CashFlow */}
                  {otherIncomes.map(inc => (
                    <tr key={`cf-oi-${inc.id}`} className="hover:bg-slate-850/10 bg-emerald-950/10">
                      <td className="p-4 text-slate-500 font-mono">
                        {new Date(inc.date).toLocaleDateString('th-TH')}
                      </td>
                      <td className="p-4 font-semibold text-emerald-400">
                        {inc.category === 'Delivery GP' ? 'เดลิเวอรี่ (Delivery Apps)' : inc.category === 'Catering' ? 'จัดเลี้ยง (Catering Event)' : inc.category === 'Space Rental' ? 'ค่าเช่าสถานที่' : inc.category === 'Franchise Fee' ? 'ส่วนแบ่งแฟรนไชส์' : 'รายรับเสริมอื่นๆ'}
                      </td>
                      <td className="p-4 text-slate-400">
                        {inc.description}
                      </td>
                      <td className="p-4 text-center">
                        <span className="px-2 py-0.5 bg-emerald-950 text-emerald-400 border border-emerald-900/30 rounded font-bold text-[9px] uppercase">
                          รายรับอื่น (Income)
                        </span>
                      </td>
                      <td className="p-4 font-bold text-emerald-400 text-right font-mono">
                        + {inc.amount.toLocaleString()} {currency}
                      </td>
                      <td className="p-4 text-center">
                        {onUpdateOtherIncomes ? (
                          <button
                            onClick={() => handleDeleteOtherIncome(inc.id)}
                            className="p-1 hover:bg-red-950 text-slate-500 hover:text-red-400 rounded-lg transition-all"
                            title="ลบรายการ"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        ) : (
                          <span className="text-slate-600">-</span>
                        )}
                      </td>
                    </tr>
                  ))}

                  {/* Revenue Orders mapped as CashFlow */}
                  {paidOrders.slice(0, 20).map(order => (
                    <tr key={`cf-ord-${order.id}`} className="hover:bg-slate-850/10">
                      <td className="p-4 text-slate-500 font-mono">
                        {new Date(order.timestamp).toLocaleString('th-TH')}
                      </td>
                      <td className="p-4 font-semibold text-slate-200">
                        ยอดขายหน้าร้าน POS
                      </td>
                      <td className="p-4 text-slate-400">
                        โต๊ะ {order.tableNo === 'TakeAway' ? 'กลับบ้าน' : order.tableNo} • ชำระผ่าน {order.paymentMethod === 'PROMPTPAY' ? 'พร้อมเพย์' : order.paymentMethod === 'TRANSFER' ? 'โอนเงิน' : 'เงินสด'}
                      </td>
                      <td className="p-4 text-center">
                        <span className="px-2 py-0.5 bg-green-950 text-green-400 border border-green-900/30 rounded font-bold text-[9px]">
                          ขาย POS (Income)
                        </span>
                      </td>
                      <td className="p-4 font-bold text-green-400 text-right font-mono">
                        + {order.total.toLocaleString()} {currency}
                      </td>
                      <td className="p-4 text-center">
                        <span className="text-slate-600 font-mono text-[9px]">POS AUTO</span>
                      </td>
                    </tr>
                  ))}

                  {/* Expenses mapped as CashFlow */}
                  {expenses.map(exp => (
                    <tr key={`cf-exp-${exp.id}`} className="hover:bg-slate-850/10 bg-red-950/5">
                      <td className="p-4 text-slate-500 font-mono">
                        {new Date(exp.date).toLocaleDateString('th-TH')}
                      </td>
                      <td className="p-4 font-semibold text-red-400">
                        {exp.category === 'Rent' ? 'ค่าเช่าสถานที่' : exp.category === 'Salary' ? 'ค่าแรงพนักงาน' : exp.category === 'Electricity' ? 'ค่าไฟฟ้าร้าน' : exp.category === 'Water' ? 'ค่าน้ำประปา' : exp.category === 'Marketing' ? 'ค่าโฆษณา' : 'ค่าเบ็ดเตล็ด'}
                      </td>
                      <td className="p-4 text-slate-400">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span>{exp.description}</span>
                          {exp.source === 'TELEGRAM' && (
                            <span className="inline-flex items-center gap-1 text-[9px] font-bold text-indigo-300 bg-indigo-950/60 px-2 py-0.5 rounded-full border border-indigo-900/60">
                              <Bot className="w-2.5 h-2.5 text-indigo-400" /> Telegram
                            </span>
                          )}
                          {exp.slipUrl && (
                            <button
                              type="button"
                              onClick={() => {
                                setViewingSlipUrl(exp.slipUrl!);
                                setViewingSlipTitle(`สลิปหลักฐาน: ${exp.description}`);
                              }}
                              className="inline-flex items-center gap-1 text-[9px] font-bold text-teal-300 bg-teal-950/60 hover:bg-teal-900 px-2 py-0.5 rounded border border-teal-900/50 transition-all cursor-pointer"
                              title="คลิกเพื่อดูภาพสลิปหลักฐาน"
                            >
                              <Eye className="w-2.5 h-2.5" /> ดูสลิป
                            </button>
                          )}
                        </div>
                      </td>
                      <td className="p-4 text-center">
                        <span className="px-2 py-0.5 bg-red-950 text-red-400 border border-red-900/30 rounded font-bold text-[9px] uppercase">
                          รายจ่าย (Expense)
                        </span>
                      </td>
                      <td className="p-4 font-bold text-red-400 text-right font-mono">
                        - {exp.amount.toLocaleString()} {currency}
                      </td>
                      <td className="p-4 text-center">
                        {onUpdateExpenses ? (
                          <button
                            onClick={() => handleDeleteExpense(exp.id)}
                            className="p-1 hover:bg-red-950 text-slate-500 hover:text-red-400 rounded-lg transition-all cursor-pointer"
                            title="ลบรายการ"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        ) : (
                          <span className="text-slate-600">-</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : activeTab === 'AR_AP' ? (
        /* TAB: AR & AP MANAGEMENT MODULE */
        <div className="space-y-6">
          {/* Overview KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Accounts Receivable Overview */}
            <div className="bg-slate-900 border border-emerald-900/30 rounded-2xl p-4 flex items-center justify-between shadow">
              <div className="space-y-1">
                <span className="text-xs text-slate-400 font-medium">ลูกหนี้การค้าทั้งหมด (Accounts Receivable)</span>
                <div className="flex items-baseline gap-2">
                  <span className="text-xl font-black text-emerald-400 font-mono">
                    {totalTradeReceivables.toLocaleString()} {currency}
                  </span>
                  <span className="text-[10px] text-slate-500">
                    ({tradeReceivables.filter(r => r.status === 'PENDING').length} รายการค้างรับ)
                  </span>
                </div>
                <p className="text-[10px] text-emerald-500/80">เงินได้ของร้านในอนาคตที่รอเรียกเก็บตามกำหนดดิว</p>
              </div>
              <div className="p-3 bg-emerald-950/40 rounded-xl border border-emerald-900/40">
                <Users className="w-5 h-5 text-emerald-400" />
              </div>
            </div>

            {/* Accounts Payable Overview */}
            <div className="bg-slate-900 border border-red-900/30 rounded-2xl p-4 flex items-center justify-between shadow">
              <div className="space-y-1">
                <span className="text-xs text-slate-400 font-medium">เจ้าหนี้การค้าทั้งหมด (Accounts Payable)</span>
                <div className="flex items-baseline gap-2">
                  <span className="text-xl font-black text-red-400 font-mono">
                    {totalTradePayables.toLocaleString()} {currency}
                  </span>
                  <span className="text-[10px] text-slate-500">
                    ({tradePayables.filter(p => p.status === 'PENDING').length} รายการค้างจ่าย)
                  </span>
                </div>
                <p className="text-[10px] text-red-400/80">ภาระผูกพันทางการเงินที่รอการชำระเงินคืนให้ซัพพลายเออร์</p>
              </div>
              <div className="p-3 bg-red-950/40 rounded-xl border border-red-900/40">
                <CreditCard className="w-5 h-5 text-red-400" />
              </div>
            </div>

            {/* Net Position Overview */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center justify-between shadow">
              {(() => {
                const netPosition = totalTradeReceivables - totalTradePayables;
                return (
                  <div className="space-y-1 w-full">
                    <span className="text-xs text-slate-400 font-medium">ฐานะดุลรวมลูกหนี้-เจ้าหนี้ (Net Position)</span>
                    <div className="flex items-baseline gap-2">
                      <span className={`text-xl font-black font-mono ${netPosition >= 0 ? 'text-teal-400' : 'text-amber-500'}`}>
                        {netPosition >= 0 ? '+' : ''}{netPosition.toLocaleString()} {currency}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-500">
                      {netPosition >= 0 
                        ? 'มีสภาพคล่องส่วนต่างลูกหนี้มากกว่าหนี้สินค้างจ่าย' 
                        : 'มีภาระหนี้ค้างจ่ายสูงกว่าลูกหนี้ค้างรับ ควรเตรียมเงินสดสำรอง'}
                    </p>
                  </div>
                );
              })()}
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                <Scale className="w-5 h-5 text-slate-400" />
              </div>
            </div>
          </div>

          {/* Create Records Form Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Add Receivable Form */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow">
              <div className="flex items-center gap-2 mb-4 border-b border-slate-850 pb-2">
                <Plus className="w-4 h-4 text-emerald-400" />
                <h4 className="font-bold text-white text-sm">ตั้งบัญชีลูกหนี้การค้าใหม่ (Log New Trade Receivable)</h4>
              </div>
              <form onSubmit={handleAddReceivableSubmit} className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="block text-[10px] font-semibold text-slate-400">ชื่อลูกค้า/ผู้ว่าจ้าง/บจก.</label>
                    <input
                      type="text"
                      required
                      placeholder="เช่น บจก.เอ็มเทค คอนสตรัคชั่น"
                      value={arClient}
                      onChange={(e) => setArClient(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-850 text-white rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[10px] font-semibold text-slate-400">จำนวนเงินค้างชำระ (฿)</label>
                    <input
                      type="number"
                      required
                      min="1"
                      placeholder="0"
                      value={arAmount || ''}
                      onChange={(e) => setArAmount(parseInt(e.target.value) || 0)}
                      className="w-full bg-slate-950 border border-slate-850 text-white rounded-xl px-3 py-2 text-xs font-mono font-bold focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="block text-[10px] font-semibold text-slate-400">วันที่กำหนดชำระ (Due Date)</label>
                    <input
                      type="date"
                      required
                      value={arDueDate}
                      onChange={(e) => setArDueDate(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-850 text-slate-200 rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[10px] font-semibold text-slate-400">คำอธิบาย/บิล/บันทึกการส่งงาน</label>
                    <input
                      type="text"
                      placeholder="เช่น ข้าวกล่องจัดเลี้ยงพ่วงสัมมนา 50 กล่อง"
                      value={arDesc}
                      onChange={(e) => setArDesc(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-850 text-white rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs shadow-md transition-all flex items-center justify-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" /> บันทึกบัญชีลูกหนี้
                </button>
              </form>
            </div>

            {/* Add Payable Form */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow">
              <div className="flex items-center gap-2 mb-4 border-b border-slate-850 pb-2">
                <Plus className="w-4 h-4 text-red-400" />
                <h4 className="font-bold text-white text-sm">ตั้งบัญชีเจ้าหนี้การค้าใหม่ (Log New Trade Payable)</h4>
              </div>
              <form onSubmit={handleAddPayableSubmit} className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="block text-[10px] font-semibold text-slate-400">ชื่อเจ้าหนี้/ซัพพลายเออร์</label>
                    <input
                      type="text"
                      required
                      placeholder="ร้านค้า หรือซัพพลายเออร์ผู้ให้บริการ"
                      value={apSupplier}
                      onChange={(e) => setApSupplier(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-850 text-white rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-red-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[10px] font-semibold text-slate-400">จำนวนเงินค้างจ่าย (฿)</label>
                    <input
                      type="number"
                      required
                      min="1"
                      placeholder="0"
                      value={apAmount || ''}
                      onChange={(e) => setApAmount(parseInt(e.target.value) || 0)}
                      className="w-full bg-slate-950 border border-slate-850 text-white rounded-xl px-3 py-2 text-xs font-mono font-bold focus:outline-none focus:border-red-500"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="block text-[10px] font-semibold text-slate-400">วันที่กำหนดชำระ (Due Date)</label>
                    <input
                      type="date"
                      required
                      value={apDueDate}
                      onChange={(e) => setApDueDate(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-850 text-slate-200 rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:border-red-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[10px] font-semibold text-slate-400">คำอธิบาย/บิลจัดซื้ออ้างอิง</label>
                    <input
                      type="text"
                      placeholder="เช่น ค้างจ่ายค่าเครดิตเนื้อไก่สด-วัตถุดิบครัวสัปดาห์ 2"
                      value={apDesc}
                      onChange={(e) => setApDesc(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-850 text-white rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-red-500"
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  className="w-full py-2 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl text-xs shadow-md transition-all flex items-center justify-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" /> บันทึกบัญชีเจ้าหนี้
                </button>
              </form>
            </div>
          </div>

          {/* Trade Accounts Lists Grid */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {/* Trade Receivables List */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow space-y-4">
              <div className="flex justify-between items-center border-b border-slate-850 pb-3">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-emerald-400" />
                  <span className="font-bold text-white text-xs">ทะเบียนประวัติลูกหนี้การค้า (Receivables Roll)</span>
                </div>
                <span className="text-[10px] bg-slate-950 border border-slate-800 text-slate-400 px-2 py-0.5 rounded font-mono font-medium">
                  รวม {tradeReceivables.length} รายการ
                </span>
              </div>

              {tradeReceivables.length === 0 ? (
                <div className="text-center py-10 bg-slate-950 rounded-xl border border-slate-850/80 text-slate-500 text-xs flex flex-col items-center justify-center gap-1">
                  <AlertCircle className="w-6 h-6 text-slate-600" />
                  <span>ไม่มีข้อมูลรายการลูกหนี้การค้าค้างชำระในฐานระบบ</span>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs divide-y divide-slate-800">
                    <thead>
                      <tr className="bg-slate-950 text-slate-400 font-bold uppercase text-[10px]">
                        <th className="p-3">ข้อมูลลูกหนี้ / บันทึกย่อ</th>
                        <th className="p-3">กำหนดชำระ (Due)</th>
                        <th className="p-3 text-right">จำนวนเงินสุทธิ</th>
                        <th className="p-3 text-center">สถานะ</th>
                        <th className="p-3 text-center w-24">จัดการ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {tradeReceivables.map((ar) => {
                        const isOverdue = ar.status === 'PENDING' && new Date(ar.dueDate) < new Date();
                        return (
                          <tr key={ar.id} className="hover:bg-slate-850/10">
                            <td className="p-3">
                              <p className="font-bold text-white">{ar.customerName}</p>
                              <p className="text-[10px] text-slate-400 mt-0.5">{ar.description}</p>
                            </td>
                            <td className="p-3 font-mono">
                              <span className={isOverdue ? 'text-red-400 font-semibold' : 'text-slate-300'}>
                                {new Date(ar.dueDate).toLocaleDateString('th-TH')}
                              </span>
                              {isOverdue && (
                                <p className="text-[9px] text-red-400/90 font-medium">Overdue ⚠️</p>
                              )}
                            </td>
                            <td className="p-3 text-right font-mono font-bold text-emerald-400">
                              {ar.amount.toLocaleString()} ฿
                            </td>
                            <td className="p-3 text-center">
                              <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold border uppercase ${
                                ar.status === 'PAID'
                                  ? 'bg-emerald-950/40 text-emerald-400 border-emerald-900/40'
                                  : 'bg-amber-950/40 text-amber-400 border-amber-900/40'
                              }`}>
                                {ar.status === 'PAID' ? 'เก็บเงินสำเร็จ' : 'ค้างรับชำระ'}
                              </span>
                            </td>
                            <td className="p-3 text-center flex items-center justify-center gap-1.5">
                              {ar.status === 'PENDING' ? (
                                <button
                                  onClick={() => handleSettleReceivable(ar.id)}
                                  className="px-2 py-1 bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600 hover:text-white border border-emerald-900/40 hover:border-transparent rounded font-bold text-[10px] transition-all flex items-center gap-0.5 cursor-pointer"
                                  title="บันทึกรับชำระและลงบัญชีรายรับ"
                                >
                                  <UserCheck className="w-3 h-3" /> เก็บเงิน
                                </button>
                              ) : (
                                <div className="flex flex-col items-center gap-1">
                                  <span className="text-[10px] text-emerald-500/80 font-medium flex items-center gap-0.5">
                                    <Check className="w-3 h-3" /> เรียบร้อย
                                  </span>
                                  {ar.paymentSlip && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setViewingSlipUrl(ar.paymentSlip!);
                                        setViewingSlipTitle(`สลิปหลักฐานการชำระเงินของ ${ar.customerName}`);
                                      }}
                                      className="px-1 py-0.5 bg-indigo-950 hover:bg-indigo-900 border border-indigo-900 text-indigo-400 text-[9px] font-bold rounded flex items-center gap-0.5 transition-all cursor-pointer"
                                      title="คลิกเพื่อดูภาพหลักฐานสลิป"
                                    >
                                      <Eye className="w-2.5 h-2.5" /> สลิปโอนเงิน
                                    </button>
                                  )}
                                </div>
                              )}
                              <button
                                onClick={() => handleDeleteReceivable(ar.id)}
                                className="p-1 hover:bg-red-950 text-slate-500 hover:text-red-400 rounded transition-all"
                                title="ลบ"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Trade Payables List */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow space-y-4">
              <div className="flex justify-between items-center border-b border-slate-850 pb-3">
                <div className="flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-red-400" />
                  <span className="font-bold text-white text-xs">ทะเบียนประวัติเจ้าหนี้การค้า (Payables Roll)</span>
                </div>
                <span className="text-[10px] bg-slate-950 border border-slate-800 text-slate-400 px-2 py-0.5 rounded font-mono font-medium">
                  รวม {tradePayables.length} รายการ
                </span>
              </div>

              {tradePayables.length === 0 ? (
                <div className="text-center py-10 bg-slate-950 rounded-xl border border-slate-850/80 text-slate-500 text-xs flex flex-col items-center justify-center gap-1">
                  <AlertCircle className="w-6 h-6 text-slate-600" />
                  <span>ไม่มีข้อมูลรายการเจ้าหนี้การค้าค้างจ่ายในฐานระบบ</span>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs divide-y divide-slate-800">
                    <thead>
                      <tr className="bg-slate-950 text-slate-400 font-bold uppercase text-[10px]">
                        <th className="p-3">ข้อมูลเจ้าหนี้ / บันทึกย่อ</th>
                        <th className="p-3">กำหนดจ่าย (Due)</th>
                        <th className="p-3 text-right">จำนวนเงินสุทธิ</th>
                        <th className="p-3 text-center">สถานะ</th>
                        <th className="p-3 text-center w-24">จัดการ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {tradePayables.map((ap) => {
                        const isOverdue = ap.status === 'PENDING' && new Date(ap.dueDate) < new Date();
                        return (
                          <tr key={ap.id} className="hover:bg-slate-850/10">
                            <td className="p-3">
                              <p className="font-bold text-white">{ap.supplierName}</p>
                              <p className="text-[10px] text-slate-400 mt-0.5">{ap.description}</p>
                            </td>
                            <td className="p-3 font-mono">
                              <span className={isOverdue ? 'text-red-400 font-semibold' : 'text-slate-300'}>
                                {new Date(ap.dueDate).toLocaleDateString('th-TH')}
                              </span>
                              {isOverdue && (
                                <p className="text-[9px] text-red-400/90 font-medium">Overdue ⚠️</p>
                              )}
                            </td>
                            <td className="p-3 text-right font-mono font-bold text-red-400">
                              {ap.amount.toLocaleString()} ฿
                            </td>
                            <td className="p-3 text-center">
                              <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold border uppercase ${
                                ap.status === 'PAID'
                                  ? 'bg-emerald-950/40 text-emerald-400 border-emerald-900/40'
                                  : 'bg-amber-950/40 text-amber-400 border-amber-900/40'
                              }`}>
                                {ap.status === 'PAID' ? 'ชำระเงินแล้ว' : 'ค้างชำระเงิน'}
                              </span>
                            </td>
                            <td className="p-3 text-center flex items-center justify-center gap-1.5">
                              {ap.status === 'PENDING' ? (
                                <button
                                  onClick={() => handleSettlePayable(ap.id)}
                                  className="px-2 py-1 bg-red-600/20 text-red-400 hover:bg-red-600 hover:text-white border border-red-900/40 hover:border-transparent rounded font-bold text-[10px] transition-all flex items-center gap-0.5 cursor-pointer"
                                  title="บันทึกจ่ายเงินและลงบัญชีรายจ่าย"
                                >
                                  <CreditCard className="w-3 h-3" /> จ่ายเงิน
                                </button>
                              ) : (
                                <div className="flex flex-col items-center gap-1">
                                  <span className="text-[10px] text-emerald-500/80 font-medium flex items-center gap-0.5">
                                    <Check className="w-3 h-3" /> ชำระแล้ว
                                  </span>
                                  {ap.paymentSlip && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setViewingSlipUrl(ap.paymentSlip!);
                                        setViewingSlipTitle(`สลิปหลักฐานการชำระเงินให้ ${ap.supplierName}`);
                                      }}
                                      className="px-1 py-0.5 bg-indigo-950 hover:bg-indigo-900 border border-indigo-900 text-indigo-400 text-[9px] font-bold rounded flex items-center gap-0.5 transition-all cursor-pointer"
                                      title="คลิกเพื่อดูภาพหลักฐานสลิป"
                                    >
                                      <Eye className="w-2.5 h-2.5" /> สลิปโอนเงิน
                                    </button>
                                  )}
                                </div>
                              )}
                              <button
                                onClick={() => handleDeletePayable(ap.id)}
                                className="p-1 hover:bg-red-950 text-slate-500 hover:text-red-400 rounded transition-all"
                                title="ลบ"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : activeTab === 'PURCHASE_TAX' ? (
        /* TAB: PURCHASE TAX SCREEN */
        <div className="space-y-6">
          {/* Top Summary Cards */}
          {(() => {
            const combinedLogs = getCombinedPurchaseTaxLogs();
            const currentMonthStr = new Date().toISOString().substring(0, 7);
            const thisMonthLogs = combinedLogs.filter(log => log.invoiceDate.startsWith(currentMonthStr));
            const thisMonthTax = thisMonthLogs.reduce((sum, l) => sum + l.purchaseTax, 0);
            const thisMonthBase = thisMonthLogs.reduce((sum, l) => sum + l.amountExcludingTax, 0);
            
            const allTimeTax = combinedLogs.reduce((sum, l) => sum + l.purchaseTax, 0);
            const allTimeBase = combinedLogs.reduce((sum, l) => sum + l.amountExcludingTax, 0);

            return (
              <>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow">
                    <span className="text-[10px] bg-red-500/10 text-red-400 px-2 py-0.5 rounded-full font-bold border border-red-500/20">
                      THIS MONTH
                    </span>
                    <p className="text-xs text-slate-400 mt-2">ภาษีซื้อสะสมเดือนปัจจุบัน</p>
                    <p className="text-xl font-black text-white font-mono mt-0.5">฿{thisMonthTax.toLocaleString()}</p>
                    <p className="text-[10px] text-slate-500 mt-1">จากฐานเงินกึ่งก่อนภาษี: ฿{thisMonthBase.toLocaleString()}</p>
                  </div>

                  <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow">
                    <span className="text-[10px] bg-slate-850 text-slate-300 px-2 py-0.5 rounded-full font-bold border border-slate-750">
                      ALL TIME
                    </span>
                    <p className="text-xs text-slate-400 mt-2">ภาษีซื้อสะสมรวมทั้งหมด</p>
                    <p className="text-xl font-black text-white font-mono mt-0.5">฿{allTimeTax.toLocaleString()}</p>
                    <p className="text-[10px] text-slate-500 mt-1">จากฐานเงินรวมทั้งหมด: ฿{allTimeBase.toLocaleString()}</p>
                  </div>

                  <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow">
                    <span className="text-[10px] bg-amber-500/10 text-amber-400 px-2 py-0.5 rounded-full font-bold border border-amber-500/20">
                      MONTHLY INVOICES
                    </span>
                    <p className="text-xs text-slate-400 mt-2">จำนวนบิลภาษีซื้อเดือนนี้</p>
                    <p className="text-xl font-black text-amber-400 font-mono mt-0.5">{thisMonthLogs.length} ใบ</p>
                    <p className="text-[10px] text-slate-500 mt-1">จากบิลรวมสะสมทั้งหมด: {combinedLogs.length} ใบ</p>
                  </div>

                  <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow flex flex-col justify-center gap-1.5 px-5">
                    <button
                      onClick={handleExportCurrentMonthPurchaseTaxCSV}
                      className="w-full py-2 bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1 hover:opacity-95 shadow transition-all cursor-pointer"
                    >
                      <FileSpreadsheet className="w-3.5 h-3.5" /> ส่งออก CSV เดือนนี้
                    </button>
                    <button
                      onClick={() => setShowPdfPreview(true)}
                      className="w-full py-2 bg-[#1A2C42] hover:bg-[#253B55] text-red-400 font-bold rounded-xl text-xs flex items-center justify-center gap-1 border border-red-900/30 shadow transition-all cursor-pointer"
                    >
                      <Calculator className="w-3.5 h-3.5" /> พิมพ์สรุป PDF ยื่นภาษี
                    </button>
                  </div>
                </div>

                {/* Main section: Add single log vs list */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Left panel: Log Form */}
                  <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-850 pb-2.5">
                      <h4 className="text-sm font-bold text-white flex items-center gap-2">
                        <Plus className="w-4 h-4 text-red-500" />
                        เพิ่มประวัติภาษีซื้อเดี่ยว
                      </h4>
                      <button
                        onClick={() => setShowBatchModal(true)}
                        className="px-2.5 py-1 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-lg text-[10px] font-bold hover:bg-amber-500/20 transition-all cursor-pointer animate-pulse"
                      >
                        ⚡ บันทึกเป็นกลุ่ม
                      </button>
                    </div>

                    <form onSubmit={handleAddPurchaseTaxSubmit} className="space-y-3 text-xs">
                      <div className="space-y-1">
                        <span className="block font-semibold text-slate-300">เลขที่ใบกำกับภาษี (Invoice No.)</span>
                        <input
                          type="text"
                          required
                          placeholder="เช่น INV2026-0715"
                          value={ptInvoiceNo}
                          onChange={(e) => setPtInvoiceNo(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-850 text-white rounded-xl px-3 py-2 text-xs font-mono font-bold focus:outline-none focus:border-red-500"
                        />
                      </div>

                      <div className="space-y-1">
                        <span className="block font-semibold text-slate-300">ชื่อผู้ขาย / ผู้จัดจำหน่าย (Supplier)</span>
                        <input
                          type="text"
                          required
                          placeholder="เช่น บริษัท เบทาโกร จำกัด"
                          value={ptSupplierName}
                          onChange={(e) => setPtSupplierName(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-850 text-white rounded-xl px-3 py-2 text-xs font-bold focus:outline-none focus:border-red-500"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <span className="block font-semibold text-slate-300">วันที่ใบกำกับ</span>
                          <input
                            type="date"
                            required
                            value={ptInvoiceDate}
                            onChange={(e) => setPtInvoiceDate(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-850 text-white rounded-xl px-3 py-1.5 text-xs text-slate-200 focus:outline-none"
                          />
                        </div>
                        <div className="space-y-1">
                          <span className="block font-semibold text-slate-300">อัตราภาษี (%)</span>
                          <select
                            value={ptTaxRate}
                            onChange={(e) => setPtTaxRate(parseInt(e.target.value) || 7)}
                            className="w-full bg-slate-950 border border-slate-850 text-white rounded-xl px-3 py-2 text-xs focus:outline-none font-bold cursor-pointer"
                          >
                            <option value={7}>7% (มาตรฐาน)</option>
                            <option value={0}>0% (ยกเว้นภาษี)</option>
                            <option value={10}>10%</option>
                          </select>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <span className="block font-semibold text-slate-300">ยอดเงินก่อนภาษี (Excluding Tax Amount)</span>
                        <input
                          type="number"
                          step="any"
                          required
                          min="0.01"
                          placeholder="0.00"
                          value={ptAmountEx || ''}
                          onChange={(e) => setPtAmountEx(parseFloat(e.target.value) || 0)}
                          className="w-full bg-slate-950 border border-slate-850 text-white rounded-xl px-3 py-2 text-xs font-mono font-bold focus:outline-none focus:border-red-500"
                        />
                      </div>

                      {ptAmountEx > 0 && (
                        <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-850 flex justify-between items-center font-mono text-[10px]">
                          <span className="text-slate-500">คำนวณภาษีซื้ออัตโนมัติ:</span>
                          <span className="text-red-500 font-bold">฿{(Math.round((ptAmountEx * (ptTaxRate / 100)) * 100) / 100).toLocaleString()}</span>
                        </div>
                      )}

                      <div className="space-y-1">
                        <span className="block font-semibold text-slate-300">หมายเหตุ / รายละเอียดจัดซื้อ</span>
                        <textarea
                          placeholder="เช่น ซื้อวัตถุดิบอาหารสด ประจำคลังสินค้ากลาง..."
                          value={ptDesc}
                          onChange={(e) => setPtDesc(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-850 text-white rounded-xl px-3 py-1.5 text-xs focus:outline-none"
                        />
                      </div>

                      <button
                        type="submit"
                        className="w-full py-2.5 bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-500 hover:to-amber-500 text-white font-bold rounded-xl text-xs transition-all shadow-md cursor-pointer"
                      >
                        ➕ บันทึกข้อมูลใบเสร็จ
                      </button>
                    </form>
                  </div>

                  {/* Right panel: Log List */}
                  <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow lg:col-span-2 space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-850 pb-2.5">
                      <div className="flex items-center gap-2">
                        <Calculator className="w-5 h-5 text-red-500" />
                        <div>
                          <h4 className="text-sm font-bold text-white">ประวัติสมุดบันทึกภาษีซื้อวัตถุดิบและอุปกรณ์</h4>
                          <p className="text-[10px] text-slate-400">รายการใบเสร็จรับเงิน/ใบกำกับภาษีทั้งหมดเพื่อบันทึกเป็นต้นทุนลดหย่อนสะสม</p>
                        </div>
                      </div>
                      <div className="flex gap-1.5 self-end sm:self-auto">
                        <button
                          onClick={handleExportAllPurchaseTaxCSV}
                          className="px-3 py-1.5 bg-slate-950 border border-slate-800 text-slate-300 rounded-xl text-[10px] font-bold hover:text-white transition-all flex items-center gap-1 cursor-pointer"
                          title="ดาวน์โหลดไฟล์สำรองทั้งหมดเป็น .csv"
                        >
                          <FileSpreadsheet className="w-3 h-3 text-emerald-400" />
                          <span>ดาวน์โหลดทั้งหมด (.CSV)</span>
                        </button>
                      </div>
                    </div>

                    <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/60 max-h-[380px] overflow-y-auto">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="bg-slate-950 text-slate-400 text-[10px] font-bold border-b border-slate-850">
                            <th className="p-3">เลขที่ใบกำกับ</th>
                            <th className="p-3">ผู้จัดจำหน่าย</th>
                            <th className="p-3">วันที่ใบกำกับ</th>
                            <th className="p-3 text-right">ยอดก่อนภาษี</th>
                            <th className="p-3 text-right">ภาษีซื้อ (VAT)</th>
                            <th className="p-3 text-center">จัดการ</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-850">
                          {(() => {
                            const combined = getCombinedPurchaseTaxLogs();
                            if (combined.length === 0) {
                              return (
                                <tr>
                                  <td colSpan={6} className="p-10 text-center text-slate-500 font-bold italic">
                                    📂 ยังไม่พบประวัติภาษีซื้อใดๆ ในระบบ
                                  </td>
                                </tr>
                              );
                            }
                            return [...combined].reverse().map((log) => (
                              <tr key={log.id} className="hover:bg-slate-900/40 text-slate-300 text-[11px] font-medium">
                                <td className="p-3 font-mono font-bold text-white">
                                  <div className="flex items-center gap-1.5">
                                    <span>{log.invoiceNo}</span>
                                    {log.isFromPO && (
                                      <span className="px-1.5 py-0.5 bg-blue-950/80 text-blue-400 border border-blue-900/40 rounded text-[8.5px] font-bold uppercase tracking-wider">
                                        PO
                                      </span>
                                    )}
                                  </div>
                                </td>
                                <td className="p-3">
                                  <p className="font-bold text-slate-200">{log.supplierName}</p>
                                  {log.description && <p className="text-[9px] text-slate-500 leading-none mt-0.5">{log.description}</p>}
                                </td>
                                <td className="p-3 font-mono">{log.invoiceDate}</td>
                                <td className="p-3 text-right font-mono text-slate-400">฿{log.amountExcludingTax.toLocaleString()}</td>
                                <td className="p-3 text-right font-mono text-red-400 font-bold">฿{log.purchaseTax.toLocaleString()}</td>
                                <td className="p-3 text-center">
                                  {log.isFromPO ? (
                                    <span className="text-[10px] text-slate-500 font-semibold italic cursor-default" title="รายการภาษีซื้อที่ผูกกับใบสั่งซื้อในระบบ ไม่สามารถลบแยกได้">
                                      อ้างอิง PO
                                    </span>
                                  ) : (
                                    <button
                                      onClick={() => handleDeletePurchaseTax(log.id)}
                                      className="p-1.5 hover:bg-red-950/30 text-slate-500 hover:text-red-400 rounded-lg transition-colors cursor-pointer"
                                      title="ลบ"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                </td>
                              </tr>
                            ));
                          })()}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </>
            );
          })()}
        </div>
      ) : activeTab === 'SALES_TAX' ? (
        /* TAB: SALES TAX & TAX INVOICES */
        <div className="space-y-6">
          {/* Top Summary Cards */}
          {(() => {
            const taxInvoices = orders.filter(o => o.taxInvoice);
            const currentMonthStr = new Date().toISOString().substring(0, 7);
            const thisMonthInvoices = taxInvoices.filter(o => o.taxInvoice!.issuedAt.startsWith(currentMonthStr));
            
            // Calculate total output VAT
            const thisMonthOutputVAT = thisMonthInvoices.reduce((sum, o) => sum + (o.vatAmount ?? Math.round((o.total * 7) / 107 * 100) / 100), 0);
            const allTimeOutputVAT = taxInvoices.reduce((sum, o) => sum + (o.vatAmount ?? Math.round((o.total * 7) / 107 * 100) / 100), 0);
            
            // Calculate purchase tax for comparison
            const combinedPT = getCombinedPurchaseTaxLogs();
            const thisMonthInputVAT = combinedPT.filter(log => log.invoiceDate.startsWith(currentMonthStr)).reduce((sum, l) => sum + l.purchaseTax, 0);
            const allTimeInputVAT = combinedPT.reduce((sum, l) => sum + l.purchaseTax, 0);

            const thisMonthNetVAT = thisMonthOutputVAT - thisMonthInputVAT;
            const allTimeNetVAT = allTimeOutputVAT - allTimeInputVAT;

            return (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow">
                  <span className="text-[10px] bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded-full font-bold border border-emerald-500/20">
                    THIS MONTH SALES VAT
                  </span>
                  <p className="text-xs text-slate-400 mt-2">ภาษีขายสะสมเดือนปัจจุบัน (Output VAT)</p>
                  <p className="text-xl font-black text-white font-mono mt-0.5">฿{thisMonthOutputVAT.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                  <p className="text-[10px] text-slate-500 mt-1">จากใบกำกับภาษีจำนวน {thisMonthInvoices.length} ฉบับ</p>
                </div>

                <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow">
                  <span className="text-[10px] bg-slate-850 text-slate-300 px-2 py-0.5 rounded-full font-bold border border-slate-750">
                    ALL TIME SALES VAT
                  </span>
                  <p className="text-xs text-slate-400 mt-2">ภาษีขายสะสมทั้งหมด (Output VAT)</p>
                  <p className="text-xl font-black text-white font-mono mt-0.5">฿{allTimeOutputVAT.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                  <p className="text-[10px] text-slate-500 mt-1">จากใบกำกับภาษีทั้งหมด {taxInvoices.length} ฉบับ</p>
                </div>

                <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow">
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${thisMonthNetVAT >= 0 ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'}`}>
                    MONTHLY NET VAT
                  </span>
                  <p className="text-xs text-slate-400 mt-2">ภาษีมูลค่าเพิ่มนำส่งสุทธิเดือนนี้</p>
                  <p className={`text-xl font-black font-mono mt-0.5 ${thisMonthNetVAT >= 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                    ฿{Math.abs(thisMonthNetVAT).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                  <p className="text-[10px] text-slate-500 mt-1">
                    {thisMonthNetVAT >= 0 ? 'ภาษีขายมากกว่าภาษีซื้อ (ต้องนำส่งสุทธิ)' : 'ภาษีซื้อมากกว่าภาษีขาย (ขอคืน/เครดิตภาษี)'}
                  </p>
                </div>

                <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow">
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${allTimeNetVAT >= 0 ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'}`}>
                    ALL TIME NET VAT
                  </span>
                  <p className="text-xs text-slate-400 mt-2">ภาษีมูลค่าเพิ่มนำส่งสุทธิสะสมทั้งหมด</p>
                  <p className={`text-xl font-black font-mono mt-0.5 ${allTimeNetVAT >= 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                    ฿{Math.abs(allTimeNetVAT).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                  <p className="text-[10px] text-slate-500 mt-1">
                    {allTimeNetVAT >= 0 ? 'มีภาระต้องนำส่งรวม' : 'มีสิทธิ์เครดิตภาษีสะสมรวม'}
                  </p>
                </div>
              </div>
            );
          })()}

          {/* Filters and Search panel */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow space-y-4">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-emerald-400" />
                  ทะเบียนประวัติใบกำกับภาษีเต็มรูปแบบ (Full Tax Invoices Ledger)
                </h4>
                <p className="text-xs text-slate-400">ค้นหา ตรวจสอบ และสร้างแบบฟอร์มเอกสารใบกำกับภาษีต้นฉบับอย่างเป็นทางการสำหรับลูกค้านิติบุคคล</p>
              </div>

              <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
                {/* Search input */}
                <div className="relative flex-1 md:flex-none">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="text"
                    placeholder="ค้นหาชื่อลูกค้า, เลขภาษี, เลขใบกำกับ..."
                    value={salesSearchQuery}
                    onChange={(e) => setSalesSearchQuery(e.target.value)}
                    className="w-full md:w-64 bg-slate-950 border border-slate-800 text-xs text-white rounded-xl pl-9 pr-4 py-2 focus:outline-none focus:border-red-500"
                  />
                </div>

                {/* Month filter */}
                <select
                  value={salesSelectedMonth}
                  onChange={(e) => setSalesSelectedMonth(e.target.value)}
                  className="bg-slate-950 border border-slate-800 text-xs text-white rounded-xl px-3 py-2 focus:outline-none focus:border-red-500 font-bold"
                >
                  <option value="ALL">🗓️ ทุกช่วงเวลา (All Time)</option>
                  {getAvailableMonths().map(m => (
                    <option key={m} value={m}>
                      🗓️ {formatMonthThai(m)}
                    </option>
                  ))}
                </select>

                <button
                  onClick={handleExportSalesTaxCSV}
                  className="px-4 py-2 bg-slate-950 border border-slate-800 hover:bg-slate-850 text-xs text-slate-300 font-bold rounded-xl flex items-center gap-1.5 transition-all shadow"
                >
                  <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                  <span>ดาวน์โหลด CSV</span>
                </button>

                <button
                  onClick={() => {
                    setGenErrorMessage('');
                    setShowGenerateInvoiceModal(true);
                  }}
                  className="px-4 py-2 bg-gradient-to-r from-red-650 to-amber-650 hover:from-red-600 hover:to-amber-600 text-xs text-white font-bold rounded-xl flex items-center gap-1.5 transition-all shadow-md cursor-pointer"
                >
                  <Plus className="w-4 h-4 text-white" />
                  <span>ออกใบกำกับภาษีใหม่</span>
                </button>
              </div>
            </div>

            {/* Invoices Table */}
            <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/60 max-h-[500px] overflow-y-auto font-sans">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-950 text-slate-400 text-[10px] font-bold border-b border-slate-850">
                    <th className="p-3">เลขที่ใบกำกับภาษี</th>
                    <th className="p-3">ชื่อผู้ซื้อ / บจก. / ลูกค้า</th>
                    <th className="p-3">เลขผู้เสียภาษี (Tax ID)</th>
                    <th className="p-3">วันที่ออกเอกสาร</th>
                    <th className="p-3 text-right">ยอดรวมบิล</th>
                    <th className="p-3 text-right">ภาษีขาย (7%)</th>
                    <th className="p-3 text-center w-32">จัดการเอกสาร</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-850">
                  {(() => {
                    const filteredInvoices = orders
                      .filter(o => o.taxInvoice)
                      .filter(o => {
                        const inv = o.taxInvoice!;
                        const matchesSearch = 
                          inv.invoiceNo.toLowerCase().includes(salesSearchQuery.toLowerCase()) ||
                          inv.customerName.toLowerCase().includes(salesSearchQuery.toLowerCase()) ||
                          inv.customerTaxId.includes(salesSearchQuery);
                          
                        const matchesMonth = 
                          salesSelectedMonth === 'ALL' ||
                          inv.issuedAt.startsWith(salesSelectedMonth);

                        return matchesSearch && matchesMonth;
                      });

                    if (filteredInvoices.length === 0) {
                      return (
                        <tr>
                          <td colSpan={7} className="p-10 text-center text-slate-500 font-bold italic">
                            📂 ไม่พบประวัติการออกใบกำกับภาษีเต็มรูปแบบที่ตรงกับเงื่อนไข
                          </td>
                        </tr>
                      );
                    }

                    return [...filteredInvoices].reverse().map((order) => {
                      const inv = order.taxInvoice!;
                      const vat = order.vatAmount ?? Math.round((order.total * 7) / 107 * 100) / 100;
                      return (
                        <tr key={order.id} className="hover:bg-slate-900/40 text-slate-300 text-[11px] font-medium">
                          <td className="p-3 font-mono font-bold text-white">
                            {inv.invoiceNo}
                          </td>
                          <td className="p-3">
                            <p className="font-bold text-slate-100">{inv.customerName}</p>
                            <p className="text-[9px] text-slate-500 line-clamp-1 mt-0.5">{inv.customerAddress}</p>
                          </td>
                          <td className="p-3 font-mono">
                            <span className="bg-slate-900 border border-slate-800 px-1.5 py-0.5 rounded text-[10px] text-slate-400">
                              {inv.customerTaxId} (สาขา {inv.customerBranch})
                            </span>
                          </td>
                          <td className="p-3 font-mono">
                            {new Date(inv.issuedAt).toLocaleDateString('th-TH')} {new Date(inv.issuedAt).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}
                          </td>
                          <td className="p-3 text-right font-mono text-slate-300">฿{order.total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                          <td className="p-3 text-right font-mono text-emerald-400 font-bold">฿{vat.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                          <td className="p-3 text-center">
                            <button
                              onClick={() => setSelectedSalesInvoice(order)}
                              className="px-2.5 py-1.5 bg-red-650/20 text-red-400 hover:bg-red-600 hover:text-white border border-red-900/40 hover:border-transparent rounded-lg font-bold text-[10px] transition-all flex items-center gap-1.5 mx-auto cursor-pointer"
                              title="พิมพ์ใบกำกับภาษีเต็มรูปแบบ / PDF"
                            >
                              <Printer className="w-3.5 h-3.5" />
                              <span>พิมพ์ PDF / สแกน QR</span>
                            </button>
                          </td>
                        </tr>
                      );
                    });
                  })()}
                </tbody>
              </table>
            </div>
          </div>

          {/* Company Tax Settings Widget */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow space-y-4">
            <div className="border-b border-slate-800 pb-2 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">ข้อมูลจดทะเบียนภาษีของสถานประกอบการ (Your Registered Tax Profile)</h4>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-slate-300">
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-850 space-y-1">
                <span className="text-[10px] text-slate-500 font-bold uppercase">ชื่อผู้เสียภาษีจดทะเบียน:</span>
                <p className="font-bold text-white text-sm">{storeSettings?.storeName || 'ครัวกะเพราโคตรกรอบ (สำนักงานใหญ่)'}</p>
              </div>
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-850 space-y-1">
                <span className="text-[10px] text-slate-500 font-bold uppercase">เลขประจำตัวผู้เสียภาษีอากร:</span>
                <p className="font-mono font-bold text-emerald-400 text-sm tracking-wider">{storeSettings?.storeTaxId || '0105560987654'}</p>
              </div>
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-850 space-y-1">
                <span className="text-[10px] text-slate-500 font-bold uppercase">ที่อยู่จดทะเบียนตาม ภ.พ.20:</span>
                <p className="font-bold text-slate-300 text-[11px] leading-relaxed line-clamp-1">{storeSettings?.storeAddress || '123/45 ถนนบรรทัดทอง แขวงวังใหม่ เขตปทุมวัน กรุงเทพมหานคร 10330'}</p>
              </div>
            </div>
            <p className="text-[10px] text-slate-500">
              💡 หมายเหตุ: หากต้องการเปลี่ยนแปลงข้อมูลจดทะเบียนภาษี สามารถเข้าไปเปลี่ยนแปลงข้อมูลได้ที่แท็บ **Settings (การตั้งค่าร้าน)** ระบบใบกำกับภาษีจะดึงข้อมูลที่ตั้งล่าสุดมาแสดงโดยอัตโนมัติ
            </p>
          </div>
        </div>
      ) : activeTab === 'LOG_INCOME' ? (
        /* TAB: LOG INCOME FORM */
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow max-w-md mx-auto">
          <div className="flex items-center gap-2 mb-4 border-b border-slate-850 pb-3">
            <Calculator className="w-5 h-5 text-emerald-500" />
            <h3 className="font-bold text-white text-base">บันทึกรายได้อื่น (Other Revenue Channel)</h3>
          </div>

          <form onSubmit={handleAddOtherIncomeSubmit} className="space-y-4">
            <div className="space-y-1">
              <span className="block text-xs font-semibold text-slate-300">ช่องทางรายได้อื่นๆ</span>
              <select
                value={incCategory}
                onChange={(e) => setIncCategory(e.target.value as OtherIncome['category'])}
                className="w-full bg-slate-950 border border-slate-850 text-white rounded-xl px-3 py-2.5 text-xs font-bold focus:outline-none"
              >
                <option value="Delivery GP">ยอดขายช่องทาง Delivery (Grab, Lineman, ShopeeFood, etc.)</option>
                <option value="Catering">บริการจัดเลี้ยงกล่อง / Catering Event</option>
                <option value="Space Rental">รายได้ค่าเช่าพื้นที่ (เช่น ตู้หยอดน้ำ เครื่องหยอดเหรียญ)</option>
                <option value="Franchise Fee">ส่วนแบ่งค่าลิขสิทธิ์ / สัญญาแฟรนไชส์แชร์พ่วง</option>
                <option value="Other">รายรับหมวดหมู่อื่นๆ</option>
              </select>
            </div>

            <div className="space-y-1">
              <span className="block text-xs font-semibold text-slate-300">จำนวนเงินสดรับสุทธิ (฿)</span>
              <input
                type="number"
                required
                min="1"
                value={incAmount}
                onChange={(e) => setIncAmount(parseInt(e.target.value) || 0)}
                className="w-full bg-slate-950 border border-slate-850 text-white rounded-xl px-3 py-2 text-xs font-mono font-bold focus:outline-none"
              />
            </div>

            <div className="space-y-1">
              <span className="block text-xs font-semibold text-slate-300">คำอธิบายและบิลพ่วงอ้างอิง</span>
              <input
                type="text"
                required
                placeholder="เช่น เงินปันผลยอดขาย Grab สัปดาห์แรก หรือ ข้าวกล่อง บจก.เอ็มเทค"
                value={incDesc}
                onChange={(e) => setIncDesc(e.target.value)}
                className="w-full bg-slate-950 border border-slate-850 text-white rounded-xl px-3 py-2 text-xs focus:outline-none"
              />
            </div>

            <div className="space-y-1">
              <span className="block text-xs font-semibold text-slate-300">วันที่รับเงิน</span>
              <input
                type="date"
                required
                value={incDate}
                onChange={(e) => setIncDate(e.target.value)}
                className="w-full bg-slate-950 border border-slate-850 text-white rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none"
              />
            </div>

            <div className="space-y-1 pb-2">
              <span className="block text-xs font-semibold text-slate-300">การคำนวณภาษีขาย (Output VAT)</span>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setIncVatType('NONE')}
                  className={`py-2.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                    incVatType === 'NONE'
                      ? 'border-emerald-500 bg-emerald-950/20 text-emerald-400'
                      : 'border-slate-800 bg-slate-950 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  ไม่มี VAT
                </button>
                <button
                  type="button"
                  onClick={() => setIncVatType('INCLUSIVE')}
                  className={`py-2.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                    incVatType === 'INCLUSIVE'
                      ? 'border-emerald-500 bg-emerald-950/20 text-emerald-400'
                      : 'border-slate-800 bg-slate-950 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  รวม VAT 7%
                </button>
                <button
                  type="button"
                  onClick={() => setIncVatType('EXCLUSIVE')}
                  className={`py-2.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                    incVatType === 'EXCLUSIVE'
                      ? 'border-emerald-500 bg-emerald-950/20 text-emerald-400'
                      : 'border-slate-800 bg-slate-950 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  แยก VAT 7%
                </button>
              </div>
              {incVatType !== 'NONE' && (
                <p className="text-[10px] text-emerald-400/90 leading-relaxed mt-1">
                  {incVatType === 'INCLUSIVE' 
                    ? `ภาษีขาย: ${Math.round((incAmount * 7 / 107) * 100) / 100} ฿ (ฐานภาษี: ${Math.round((incAmount * 100 / 107) * 100) / 100} ฿)`
                    : `ภาษีขาย: ${Math.round((incAmount * 0.07) * 100) / 100} ฿ (ยอดรวมสุทธิ: ${incAmount + Math.round((incAmount * 0.07) * 100) / 100} ฿)`
                  }
                </p>
              )}
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold rounded-xl text-xs shadow-lg transition-all"
            >
              ยืนยันบันทึกรายรับอื่น
            </button>
          </form>
        </div>
      ) : (
        /* TAB: LOG EXPENSE FORM */
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow max-w-md mx-auto">
          {/* Quick Telegram Bot Sync Banner */}
          <div className="bg-indigo-950/40 border border-indigo-900/40 rounded-xl p-3 mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-indigo-600/20 text-indigo-400">
                <Bot className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-white">ดึงสลิปจาก Telegram อัตโนมัติ</p>
                <p className="text-[10.5px] text-slate-400">ไม่ต้องพิมพ์เอง ส่งรูปเข้าบอทแล้วดึงได้ทันที</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowTelegramSyncModal(true)}
              className="px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold shadow flex items-center gap-1 cursor-pointer shrink-0"
            >
              <span>เปิดตัวดึง</span>
              {pendingTelegramCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[9px] bg-amber-400 text-slate-950 font-black">
                  {pendingTelegramCount}
                </span>
              )}
            </button>
          </div>

          <div className="flex items-center gap-2 mb-4 border-b border-slate-850 pb-3">
            <Calculator className="w-5 h-5 text-red-500" />
            <h3 className="font-bold text-white text-base">ยื่นสมุดบันทึกค่าใช้จ่ายร้าน</h3>
          </div>

          <form onSubmit={handleAddExpenseSubmit} className="space-y-4">
            <div className="space-y-1">
              <span className="block text-xs font-semibold text-slate-300">หมวดหมู่ค่าใช้จ่าย</span>
              <select
                value={expCategory}
                onChange={(e) => setExpCategory(e.target.value as Expense['category'])}
                className="w-full bg-slate-950 border border-slate-850 text-white rounded-xl px-3 py-2.5 text-xs font-bold focus:outline-none"
              >
                <option value="Rent">ค่าเช่าสถานที่พื้นที่โครงการ</option>
                <option value="Salary">ค่าจ้าง/เงินเดือนพนักงานรวม</option>
                <option value="Electricity">ค่าไฟฟ้า (Utilities Bill)</option>
                <option value="Water">ค่าน้ำประปา (Utilities Bill)</option>
                <option value="Marketing">ค่าโฆษณาและการตลาดออนไลน์</option>
                <option value="Other">ค่าเบ็ดเตล็ด / ซื้ออุปกรณ์เพิ่ม</option>
              </select>
            </div>

            <div className="space-y-1">
              <span className="block text-xs font-semibold text-slate-300">จำนวนเงินสดจ่ายออก (฿)</span>
              <input
                type="number"
                required
                min="1"
                value={expAmount}
                onChange={(e) => setExpAmount(parseInt(e.target.value) || 0)}
                className="w-full bg-slate-950 border border-slate-850 text-white rounded-xl px-3 py-2 text-xs font-mono font-bold focus:outline-none"
              />
            </div>

            <div className="space-y-1">
              <span className="block text-xs font-semibold text-slate-300">คำอธิบายรายละเอียดด่าน</span>
              <input
                type="text"
                required
                placeholder="เช่น ซื้อกระดาษใบเสร็จและถุงหูหิ้วสำรอง"
                value={expDesc}
                onChange={(e) => setExpDesc(e.target.value)}
                className="w-full bg-slate-950 border border-slate-850 text-white rounded-xl px-3 py-2 text-xs focus:outline-none"
              />
            </div>

            <div className="space-y-1">
              <span className="block text-xs font-semibold text-slate-300">วันที่จ่าย</span>
              <input
                type="date"
                required
                value={expDate}
                onChange={(e) => setExpDate(e.target.value)}
                className="w-full bg-slate-950 border border-slate-850 text-white rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none"
              />
            </div>

            <div className="space-y-1 pb-2">
              <span className="block text-xs font-semibold text-slate-300">การคำนวณภาษีซื้อ (Input VAT)</span>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setExpVatType('NONE')}
                  className={`py-2.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                    expVatType === 'NONE'
                      ? 'border-red-500 bg-red-950/20 text-red-400'
                      : 'border-slate-800 bg-slate-950 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  ไม่มี VAT
                </button>
                <button
                  type="button"
                  onClick={() => setExpVatType('INCLUSIVE')}
                  className={`py-2.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                    expVatType === 'INCLUSIVE'
                      ? 'border-red-500 bg-red-950/20 text-red-400'
                      : 'border-slate-800 bg-slate-950 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  รวม VAT 7%
                </button>
                <button
                  type="button"
                  onClick={() => setExpVatType('EXCLUSIVE')}
                  className={`py-2.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                    expVatType === 'EXCLUSIVE'
                      ? 'border-red-500 bg-red-950/20 text-red-400'
                      : 'border-slate-800 bg-slate-950 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  แยก VAT 7%
                </button>
              </div>
              {expVatType !== 'NONE' && (
                <p className="text-[10px] text-red-400/90 leading-relaxed mt-1">
                  {expVatType === 'INCLUSIVE' 
                    ? `ภาษีซื้อ: ${Math.round((expAmount * 7 / 107) * 100) / 100} ฿ (ฐานค่าใช้จ่าย: ${Math.round((expAmount * 100 / 107) * 100) / 100} ฿)`
                    : `ภาษีซื้อ: ${Math.round((expAmount * 0.07) * 100) / 100} ฿ (ยอดเบิกจริงรวม VAT: ${expAmount + Math.round((expAmount * 0.07) * 100) / 100} ฿)`
                  }
                </p>
              )}
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-500 hover:to-amber-500 text-white font-bold rounded-xl text-xs shadow-lg transition-all"
            >
              บันทึกบัญชีรายจ่าย
            </button>
          </form>
        </div>
      )}

      {/* Export Modal Overlay */}
      {showExportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg p-6 space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
                <h3 className="font-bold text-white text-base">ส่งออกรายงานกำไรขาดทุน (Export P&L Report)</h3>
              </div>
              <button 
                onClick={() => { setShowExportModal(false); setCopied(false); }}
                className="text-slate-400 hover:text-white text-sm"
              >
                ✕ ปิด
              </button>
            </div>

            <div className="space-y-3">
              <p className="text-xs text-slate-400">
                คัดลอกข้อมูล CSV ด้านล่างเพื่อนำไปเปิดใน Google Sheets, Microsoft Excel หรือนำไปใช้ทำภาษีได้อย่างสะดวกรวดเร็ว:
              </p>

              <textarea
                readOnly
                value={generateCSV()}
                className="w-full h-48 bg-slate-950 border border-slate-800 text-xs font-mono text-emerald-400 p-3 rounded-2xl focus:outline-none resize-none"
              />
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              <button
                onClick={handleExportExpensesAndIncomeCSV}
                className="flex-1 py-2.5 bg-slate-950 border border-emerald-800/80 hover:border-emerald-500 text-emerald-400 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-400" /> ดาวน์โหลด CSV รายรับ-รายจ่าย
              </button>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(generateCSV());
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                }}
                className="flex-1 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 hover:opacity-95 shadow transition-all animate-none"
              >
                {copied ? <Check className="w-4 h-4" /> : <FileSpreadsheet className="w-4 h-4" />}
                {copied ? 'คัดลอกแล้ว!' : 'คัดลอก CSV สรุป P&L'}
              </button>
              <button
                onClick={() => { setShowExportModal(false); setCopied(false); }}
                className="px-4 py-2.5 bg-slate-950 border border-slate-800 text-xs text-slate-400 font-bold rounded-xl hover:text-white"
              >
                ปิดหน้าต่าง
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Settle Receivable Modal */}
      {settlingReceivable && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md p-6 space-y-4 shadow-2xl animate-in fade-in duration-200">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-emerald-400" />
                <h3 className="font-bold text-white text-base">บันทึกรับชำระเงินลูกหนี้</h3>
              </div>
              <button 
                onClick={() => { setSettlingReceivable(null); setSettleSlip(''); }}
                className="text-slate-400 hover:text-white text-sm"
              >
                ✕ ปิด
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-300">
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-850 space-y-1 font-mono">
                <div className="flex justify-between">
                  <span className="text-slate-500">ชื่อลูกค้า:</span>
                  <span className="text-white font-bold">{settlingReceivable.customerName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">รายละเอียด:</span>
                  <span className="text-white">{settlingReceivable.description}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">กำหนดชำระ:</span>
                  <span className="text-white">{new Date(settlingReceivable.dueDate).toLocaleDateString('th-TH')}</span>
                </div>
                <div className="flex justify-between border-t border-slate-800 pt-2 mt-1 text-sm">
                  <span className="text-slate-500 font-bold">จำนวนเงินสุทธิ:</span>
                  <span className="text-emerald-400 font-black">{settlingReceivable.amount.toLocaleString()} ฿</span>
                </div>
              </div>

              {/* Slip Uploader */}
              <div className="w-full bg-slate-950 border border-slate-850 p-4 rounded-2xl space-y-3 text-center">
                <span className="text-[11px] text-slate-400 font-bold block uppercase tracking-wide">
                  แนบหลักฐานสลิปโอนเงินรับชำระ (Optional)
                </span>
                {settleSlip ? (
                  <div className="relative">
                    <img 
                      src={settleSlip} 
                      alt="สลิปโอนเงิน" 
                      className="w-full h-48 object-contain rounded-xl border border-slate-800 bg-slate-950" 
                      referrerPolicy="no-referrer"
                    />
                    <button
                      type="button"
                      onClick={() => setSettleSlip('')}
                      className="absolute -top-2 -right-2 bg-red-600 hover:bg-red-500 text-white rounded-full p-1.5 shadow-lg transition-all cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <div className="relative border border-dashed border-slate-800 hover:border-slate-700 bg-slate-900/10 hover:bg-slate-900/20 rounded-xl p-5 transition-all cursor-pointer flex flex-col items-center justify-center gap-1.5">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onload = (event) => {
                            if (event.target?.result) {
                              setSettleSlip(event.target.result as string);
                            }
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                      className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                    />
                    <Upload className="w-6 h-6 text-emerald-400" />
                    <span className="text-xs text-slate-300 font-bold">อัปโหลดภาพสลิปหลักฐาน</span>
                    <span className="text-[10px] text-slate-500">รองรับไฟล์รูปภาพ PNG, JPG, JPEG</span>
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={handleConfirmSettleReceivable}
                className="flex-1 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold rounded-xl text-xs shadow-md transition-all cursor-pointer"
              >
                บันทึกเก็บเงินสำเร็จและลงบัญชีรายรับ
              </button>
              <button
                onClick={() => { setSettlingReceivable(null); setSettleSlip(''); }}
                className="px-4 py-2.5 bg-slate-950 border border-slate-800 text-xs text-slate-400 font-bold rounded-xl hover:text-white cursor-pointer"
              >
                ยกเลิก
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Settle Payable Modal */}
      {settlingPayable && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md p-6 space-y-4 shadow-2xl animate-in fade-in duration-200">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-red-400" />
                <h3 className="font-bold text-white text-base">บันทึกชำระเงินเจ้าหนี้</h3>
              </div>
              <button 
                onClick={() => { setSettlingPayable(null); setSettleSlip(''); }}
                className="text-slate-400 hover:text-white text-sm"
              >
                ✕ ปิด
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-300">
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-850 space-y-1 font-mono">
                <div className="flex justify-between">
                  <span className="text-slate-500">ชื่อเจ้าหนี้:</span>
                  <span className="text-white font-bold">{settlingPayable.supplierName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">รายละเอียด:</span>
                  <span className="text-white">{settlingPayable.description}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">กำหนดจ่าย:</span>
                  <span className="text-white">{new Date(settlingPayable.dueDate).toLocaleDateString('th-TH')}</span>
                </div>
                <div className="flex justify-between border-t border-slate-800 pt-2 mt-1 text-sm">
                  <span className="text-slate-500 font-bold">จำนวนเงินค้างจ่าย:</span>
                  <span className="text-red-400 font-black">{settlingPayable.amount.toLocaleString()} ฿</span>
                </div>
              </div>

              {/* Slip Uploader */}
              <div className="w-full bg-slate-950 border border-slate-850 p-4 rounded-2xl space-y-3 text-center">
                <span className="text-[11px] text-slate-400 font-bold block uppercase tracking-wide">
                  แนบหลักฐานสลิปโอนเงินชำระ (Optional)
                </span>
                {settleSlip ? (
                  <div className="relative">
                    <img 
                      src={settleSlip} 
                      alt="สลิปโอนเงิน" 
                      className="w-full h-48 object-contain rounded-xl border border-slate-800 bg-slate-950" 
                      referrerPolicy="no-referrer"
                    />
                    <button
                      type="button"
                      onClick={() => setSettleSlip('')}
                      className="absolute -top-2 -right-2 bg-red-600 hover:bg-red-500 text-white rounded-full p-1.5 shadow-lg transition-all cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <div className="relative border border-dashed border-slate-800 hover:border-slate-700 bg-slate-900/10 hover:bg-slate-900/20 rounded-xl p-5 transition-all cursor-pointer flex flex-col items-center justify-center gap-1.5">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onload = (event) => {
                            if (event.target?.result) {
                              setSettleSlip(event.target.result as string);
                            }
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                      className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                    />
                    <Upload className="w-6 h-6 text-red-400" />
                    <span className="text-xs text-slate-300 font-bold">อัปโหลดภาพสลิปหลักฐาน</span>
                    <span className="text-[10px] text-slate-500">รองรับไฟล์รูปภาพ PNG, JPG, JPEG</span>
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={handleConfirmSettlePayable}
                className="flex-1 py-2.5 bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-500 hover:to-amber-500 text-white font-bold rounded-xl text-xs shadow-md transition-all cursor-pointer"
              >
                บันทึกชำระเงินสำเร็จและลงบัญชีรายจ่าย
              </button>
              <button
                onClick={() => { setSettlingPayable(null); setSettleSlip(''); }}
                className="px-4 py-2.5 bg-slate-950 border border-slate-800 text-xs text-slate-400 font-bold rounded-xl hover:text-white cursor-pointer"
              >
                ยกเลิก
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Slip Modal */}
      {viewingSlipUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg p-6 space-y-4 shadow-2xl relative animate-in zoom-in-95 duration-150">
            <button
              onClick={() => setViewingSlipUrl(null)}
              className="absolute top-4 right-4 bg-slate-950/60 hover:bg-slate-950 text-slate-400 hover:text-white rounded-full p-2 transition-all cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
            
            <div className="border-b border-slate-800 pb-3 flex items-center gap-2">
              <Eye className="w-5 h-5 text-indigo-400" />
              <h3 className="font-bold text-white text-base leading-none">{viewingSlipTitle || 'ภาพหลักฐานสลิปการโอนเงิน'}</h3>
            </div>

            <div className="bg-slate-950 rounded-2xl p-2 border border-slate-850 flex items-center justify-center max-h-[70vh] overflow-hidden">
              <img 
                src={viewingSlipUrl} 
                alt="สลิปโอนเงิน" 
                className="max-h-[60vh] object-contain rounded-xl w-auto h-auto shadow-md"
                referrerPolicy="no-referrer"
              />
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => setViewingSlipUrl(null)}
                className="px-5 py-2 bg-slate-950 border border-slate-800 text-xs text-slate-300 font-bold rounded-xl hover:text-white transition-all cursor-pointer"
              >
                ปิดหน้าต่าง
              </button>
            </div>
          </div>
        </div>
      )}

      {/* BATCH ADD PURCHASE TAX MODAL */}
      {showBatchModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm print:hidden">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-4xl p-6 space-y-4 shadow-2xl max-h-[90vh] flex flex-col text-slate-100">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3 shrink-0">
              <div className="flex items-center gap-2">
                <Calculator className="w-5 h-5 text-amber-400" />
                <div>
                  <h3 className="font-bold text-white text-base">บันทึกข้อมูลภาษีซื้อแบบกลุ่ม (Batch Purchase Tax Import)</h3>
                  <p className="text-[11px] text-slate-400">กรอกข้อมูลใบรับเงิน / ใบกำกับภาษีพร้อมๆ กันหลายใบเพื่อเพิ่มเข้ารายการในคราวเดียว</p>
                </div>
              </div>
              <button 
                onClick={() => setShowBatchModal(false)}
                className="text-slate-400 hover:text-white text-sm font-bold"
              >
                ✕ ปิด
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 pr-1 text-xs">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-950 text-slate-400 text-[10px] font-bold border-b border-slate-850">
                    <th className="p-2.5">เลขที่ใบกำกับ *</th>
                    <th className="p-2.5">ชื่อผู้ขาย / ผู้จัดจำหน่าย *</th>
                    <th className="p-2.5">วันที่ใบกำกับ *</th>
                    <th className="p-2.5 text-right w-36">ยอดก่อนภาษี *</th>
                    <th className="p-2.5 text-center w-28">VAT (%)</th>
                    <th className="p-2.5">คำอธิบายเพิ่มเติม</th>
                    <th className="p-2.5 text-center w-12">ลบ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-850">
                  {batchRows.map((row, index) => (
                    <tr key={index} className="hover:bg-slate-900/30 text-[11px]">
                      <td className="p-2">
                        <input
                          type="text"
                          required
                          placeholder="INV..."
                          value={row.invoiceNo}
                          onChange={(e) => updateBatchRow(index, 'invoiceNo', e.target.value)}
                          className="w-full bg-slate-950 border border-slate-800 text-white rounded-lg px-2 py-1.5 text-xs font-mono font-bold focus:outline-none focus:border-amber-500"
                        />
                      </td>
                      <td className="p-2">
                        <input
                          type="text"
                          required
                          placeholder="ชื่อบริษัท/ร้าน"
                          value={row.supplierName}
                          onChange={(e) => updateBatchRow(index, 'supplierName', e.target.value)}
                          className="w-full bg-slate-950 border border-slate-800 text-white rounded-lg px-2 py-1.5 text-xs font-bold focus:outline-none focus:border-amber-500"
                        />
                      </td>
                      <td className="p-2">
                        <input
                          type="date"
                          required
                          value={row.invoiceDate}
                          onChange={(e) => updateBatchRow(index, 'invoiceDate', e.target.value)}
                          className="w-full bg-slate-950 border border-slate-800 text-white rounded-lg px-2 py-1.5 text-xs focus:outline-none"
                        />
                      </td>
                      <td className="p-2 text-right">
                        <input
                          type="number"
                          step="any"
                          required
                          placeholder="0.00"
                          value={row.amountExcludingTax || ''}
                          onChange={(e) => updateBatchRow(index, 'amountExcludingTax', parseFloat(e.target.value) || 0)}
                          className="w-full bg-slate-950 border border-slate-800 text-white rounded-lg px-2 py-1.5 text-xs font-mono font-bold text-right focus:outline-none focus:border-amber-500"
                        />
                      </td>
                      <td className="p-2">
                        <select
                          value={row.taxRate}
                          onChange={(e) => updateBatchRow(index, 'taxRate', parseInt(e.target.value) || 7)}
                          className="w-full bg-slate-950 border border-slate-800 text-white rounded-lg px-2 py-1.5 text-xs focus:outline-none font-bold cursor-pointer"
                        >
                          <option value={7}>7% (มาตรฐาน)</option>
                          <option value={0}>0%</option>
                          <option value={10}>10%</option>
                        </select>
                      </td>
                      <td className="p-2">
                        <input
                          type="text"
                          placeholder="เช่น สั่งซื้อก๊าซหุงต้ม"
                          value={row.description}
                          onChange={(e) => updateBatchRow(index, 'description', e.target.value)}
                          className="w-full bg-slate-950 border border-slate-800 text-white rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:border-amber-500"
                        />
                      </td>
                      <td className="p-2 text-center">
                        <button
                          type="button"
                          onClick={() => removeBatchRow(index)}
                          className="p-1 hover:bg-red-950/40 text-slate-500 hover:text-red-400 rounded-lg transition-colors cursor-pointer"
                          disabled={batchRows.length === 1}
                        >
                          ✕
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <button
                type="button"
                onClick={addBatchRow}
                className="py-2.5 px-4 bg-slate-950 border border-slate-800 hover:bg-slate-850 text-slate-300 font-bold rounded-xl text-xs flex items-center gap-1 cursor-pointer"
              >
                ➕ เพิ่มแถวกรอกข้อมูลใหม่
              </button>
            </div>

            <div className="flex gap-2.5 pt-3 shrink-0 justify-end border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowBatchModal(false)}
                className="px-5 py-2.5 bg-[#1A2C42] text-slate-300 rounded-xl text-xs font-bold hover:bg-[#253B55] transition-all cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleSaveBatchPurchaseTax}
                className="px-6 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-550 text-slate-950 font-black rounded-xl text-xs shadow-lg transition-all cursor-pointer"
              >
                บันทึกอิมพอร์ตกลุ่มข้อมูล
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PDF Tax Filing Summary Modal with Signature Line */}
      {showPdfPreview && (() => {
        const combined = getCombinedPurchaseTaxLogs();
        const currentMonthStr = new Date().toISOString().substring(0, 7);
        const filtered = combined.filter(log => log.invoiceDate.startsWith(currentMonthStr));
        const totalBase = filtered.reduce((sum, l) => sum + l.amountExcludingTax, 0);
        const totalTax = filtered.reduce((sum, l) => sum + l.purchaseTax, 0);
        
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-sm print:p-0 print:bg-white print:relative print:inset-auto">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-4xl p-6 space-y-4 shadow-2xl max-h-[92vh] flex flex-col print:border-0 print:bg-white print:shadow-none print:w-full print:max-h-none print:p-0">
              
              {/* Modal controls */}
              <div className="flex justify-between items-center border-b border-slate-850 pb-3 shrink-0 print:hidden text-white">
                <div className="flex items-center gap-2">
                  <Calculator className="w-5 h-5 text-red-500 animate-pulse" />
                  <div>
                    <h3 className="font-bold text-white text-base">ตัวอย่างเอกสารรายงานภาษีซื้อประจำเดือน (PDF Preview)</h3>
                    <p className="text-[11px] text-slate-400">แบบฟอร์มรายงานสรุปเพื่อยื่นแสดงต่อสรรพากรพร้อมลายเซ็นรับรอง</p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowPdfPreview(false)}
                  className="text-slate-400 hover:text-white text-sm font-bold"
                >
                  ✕ ปิดตัวอย่าง
                </button>
              </div>

              {/* Printable Area */}
              <div className="flex-1 overflow-y-auto p-8 bg-white text-slate-900 rounded-2xl print:bg-white print:p-0 print:overflow-visible">
                {/* PDF Header */}
                <div className="text-center space-y-2 border-b-2 border-slate-900 pb-4">
                  <h2 className="text-lg font-black tracking-tight text-slate-900">รายงานสรุปภาษีมูลค่าเพิ่ม (ภาษีซื้อ)</h2>
                  <p className="text-xs text-slate-600 font-bold">ตามมาตรา 87(1) แห่งประมวลรัษฎากร • ประจำรอบเดือน {formatMonthThai(currentMonthStr)}</p>
                  <div className="text-left text-[11px] text-slate-700 grid grid-cols-1 md:grid-cols-2 gap-2 pt-2 border-t border-slate-100 font-medium">
                    <div>
                      <p><span className="font-bold">ชื่อสถานประกอบการ:</span> ครัวกะเพราโคตรกรอบ (Kaprao Pos Office)</p>
                      <p><span className="font-bold">เลขประจำตัวผู้เสียภาษี:</span> 0-1055-66123-45-6 (สำนักงานใหญ่)</p>
                    </div>
                    <div className="md:text-right">
                      <p><span className="font-bold">วันที่พิมพ์เอกสาร:</span> {new Date().toLocaleDateString('th-TH')} {new Date().toLocaleTimeString('th-TH')}</p>
                      <p><span className="font-bold">จำนวนรายการทั้งหมด:</span> {filtered.length} รายการใบกำกับภาษี</p>
                    </div>
                  </div>
                </div>

                {/* PDF Metrics summary */}
                <div className="grid grid-cols-3 gap-4 my-5 bg-slate-50 border border-slate-200 p-4 rounded-xl font-mono">
                  <div className="text-center">
                    <p className="text-[10px] text-slate-500 font-bold">มูลค่าสินค้า/บริการรวม</p>
                    <p className="text-sm font-black text-slate-900">฿{(totalBase + totalTax).toLocaleString()}</p>
                  </div>
                  <div className="text-center border-x border-slate-200">
                    <p className="text-[10px] text-slate-500 font-bold">ยอดเงินสุทธิก่อนภาษี (Base)</p>
                    <p className="text-sm font-black text-slate-800">฿{totalBase.toLocaleString()}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-[10px] text-red-600 font-bold">ยอดรวมภาษีซื้อสุทธิ (Input VAT)</p>
                    <p className="text-sm font-black text-red-600">฿{totalTax.toLocaleString()}</p>
                  </div>
                </div>

                {/* PDF Items table */}
                <table className="w-full text-left text-[10px] border-collapse border border-slate-300">
                  <thead>
                    <tr className="bg-slate-100 text-slate-800 font-bold border-b border-slate-300">
                      <th className="p-2 border-r border-slate-300 text-center w-8">ลำดับ</th>
                      <th className="p-2 border-r border-slate-300">วันที่ใบกำกับ</th>
                      <th className="p-2 border-r border-slate-300">เลขที่ใบกำกับภาษี</th>
                      <th className="p-2 border-r border-slate-300">ชื่อผู้ขาย / ผู้จำหน่ายวัตถุดิบ</th>
                      <th className="p-2 border-r border-slate-300 text-right">มูลค่าก่อนภาษี (฿)</th>
                      <th className="p-2 border-r border-slate-300 text-center">VAT (%)</th>
                      <th className="p-2 text-right">จำนวนเงินภาษีซื้อ (฿)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {filtered.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="p-6 text-center text-slate-400 font-bold italic">
                          ไม่มีข้อมูลภาษีซื้อที่ถูกบันทึกในรอบเดือน {formatMonthThai(currentMonthStr)}
                        </td>
                      </tr>
                    ) : (
                      filtered.map((log, index) => (
                        <tr key={log.id} className="hover:bg-slate-50/50">
                          <td className="p-2 border-r border-slate-300 text-center font-mono">{index + 1}</td>
                          <td className="p-2 border-r border-slate-300 font-mono">{new Date(log.invoiceDate).toLocaleDateString('th-TH')}</td>
                          <td className="p-2 border-r border-slate-300 font-mono font-bold text-slate-800">{log.invoiceNo}</td>
                          <td className="p-2 border-r border-slate-300 font-semibold">{log.supplierName}</td>
                          <td className="p-2 border-r border-slate-300 text-right font-mono">{log.amountExcludingTax.toLocaleString()}</td>
                          <td className="p-2 border-r border-slate-300 text-center font-mono">{log.taxRate}%</td>
                          <td className="p-2 text-right font-mono font-bold text-red-600">{log.purchaseTax.toLocaleString()}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                  {filtered.length > 0 && (
                    <tfoot>
                      <tr className="bg-slate-50 border-t-2 border-slate-400 font-bold">
                        <td colSpan={4} className="p-2 text-right border-r border-slate-300">รวมยอดรวมทั้งสิ้น (Grand Total):</td>
                        <td className="p-2 text-right border-r border-slate-300 font-mono text-slate-900">{totalBase.toLocaleString()}</td>
                        <td className="p-2 border-r border-slate-300"></td>
                        <td className="p-2 text-right font-mono text-red-600">{totalTax.toLocaleString()}</td>
                      </tr>
                    </tfoot>
                  )}
                </table>

                {/* PDF Signatures and filing terms */}
                <div className="mt-8 border border-slate-200 p-4 rounded-xl text-[10px] text-slate-600 space-y-2 leading-relaxed">
                  <p className="font-bold text-slate-800 flex items-center gap-1">
                    🛡️ การรับรองและตรวจสอบความถูกต้องทางบัญชี (Corporate Tax Compliance)
                  </p>
                  <p>
                    ข้าพเจ้าขอรับรองว่า ข้อมูลรายการใบกำกับภาษีซื้อทั้งหมดที่แสดงในรายงานฉบับนี้ เป็นรายการที่เกิดขึ้นจากการจัดซื้อวัตถุดิบ สินค้า และบริการเพื่อใช้ในการดำเนินธุรกิจของสถานประกอบการจริง ซึ่งได้หักภาษีมูลค่าเพิ่ม ณ อัตราที่ถูกต้องเรียบร้อยแล้ว และขอส่งลายมือชื่อไว้เป็นหลักฐานเพื่อการยื่นแสดงต่อกรมสรรพากรต่อไป
                  </p>
                </div>

                {/* Signature Line */}
                <div className="mt-12 flex justify-between items-end px-12 text-[11px] text-slate-700 font-semibold">
                  <div className="text-center space-y-1">
                    <p>ลงชื่อ: .............................................................. ผู้จัดทำบัญชี</p>
                    <p>( ............................................................................ )</p>
                    <p className="text-[10px] text-slate-400 font-medium">วันที่: ........ / ........ / ................</p>
                  </div>
                  <div className="text-center space-y-1">
                    <p>ลงชื่อ: .............................................................. กรรมการผู้มีอำนาจ</p>
                    <p>( ............................................................................ )</p>
                    <p className="text-[10px] text-slate-400 font-medium">ประทับตราบริษัท (ถ้ามี)</p>
                  </div>
                </div>

              </div>

              {/* Print and Actions footer bar */}
              <div className="flex gap-2.5 pt-3 shrink-0 print:hidden justify-end border-t border-slate-850">
                <button
                  type="button"
                  onClick={() => setShowPdfPreview(false)}
                  className="px-5 py-2.5 bg-slate-850 hover:bg-slate-800 text-slate-300 rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  ย้อนกลับ
                </button>
                <button
                  type="button"
                  onClick={() => { window.print(); }}
                  className="px-6 py-2.5 bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-500 hover:to-amber-500 text-white font-black rounded-xl text-xs shadow-lg transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Calculator className="w-4 h-4" /> สั่งพิมพ์เอกสารภาษี (Print PDF)
                </button>
              </div>

            </div>
          </div>
        );
      })()}

      {/* SALES TAX FULL INVOICE PRINT PREVIEW MODAL */}
      {selectedSalesInvoice && (() => {
        const order = selectedSalesInvoice;
        const inv = order.taxInvoice!;
        const vatRate = storeSettings?.taxRate || 7;
        const subtotal = order.total - (order.vatAmount ?? Math.round((order.total * vatRate) / (100 + vatRate)));
        const vatAmount = order.vatAmount ?? Math.round((order.total * vatRate) / (100 + vatRate));
        const verificationUrl = `https://verify.kapraopos.com/tax-invoice/${inv.invoiceNo}`;
        const qrCodeApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(verificationUrl)}`;

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/95 backdrop-blur-sm print:p-0 print:bg-white print:relative print:inset-auto">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-4xl p-6 space-y-4 shadow-2xl max-h-[92vh] flex flex-col print:border-0 print:bg-white print:shadow-none print:w-full print:max-h-none print:p-0">
              
              {/* Modal controls */}
              <div className="flex justify-between items-center border-b border-slate-850 pb-3 shrink-0 print:hidden text-white">
                <div className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-red-500" />
                  <div>
                    <h3 className="font-bold text-white text-base">ใบกำกับภาษีเต็มรูปแบบ (Full Tax Invoice Document)</h3>
                    <p className="text-[11px] text-slate-400">ระบบประมวลผลจัดเตรียมเอกสารต้นฉบับ สำหรับจัดพิมพ์หรือส่งออกไฟล์ PDF</p>
                  </div>
                </div>
                <button 
                  onClick={() => setSelectedSalesInvoice(null)}
                  className="text-slate-400 hover:text-white text-sm font-bold"
                >
                  ✕ ปิดหน้าต่าง
                </button>
              </div>

              {/* Print preview config options bar */}
              <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-850 p-4 rounded-2xl print:hidden border border-slate-800 text-xs shrink-0">
                <div className="flex items-center gap-2 text-amber-400 font-black">
                  <Settings className="w-4.5 h-4.5 animate-spin-slow" />
                  <span>ตั้งค่าสิ่งพิมพ์ (Document Customizer):</span>
                </div>
                <div className="flex items-center gap-6 text-slate-300 font-bold">
                  <label className="flex items-center gap-2 cursor-pointer hover:text-white select-none">
                    <input 
                      type="checkbox" 
                      checked={showCompanySeal} 
                      onChange={(e) => setShowCompanySeal(e.target.checked)}
                      className="w-4 h-4 rounded border-slate-700 bg-slate-800 text-red-500 focus:ring-red-500 accent-red-500" 
                    />
                    <span>แสดงตราประทับบริษัท (Show Company Seal)</span>
                  </label>
                  
                  <label className="flex items-center gap-2 cursor-pointer hover:text-white select-none">
                    <input 
                      type="checkbox" 
                      checked={showSignatureLines} 
                      onChange={(e) => setShowSignatureLines(e.target.checked)}
                      className="w-4 h-4 rounded border-slate-700 bg-slate-800 text-red-500 focus:ring-red-500 accent-red-500" 
                    />
                    <span>แสดงช่องเซ็นลายเซ็น (Show Signature Line)</span>
                  </label>
                </div>
              </div>

              {/* Printable PDF Area */}
              <div className="flex-1 overflow-y-auto p-8 bg-white text-slate-900 rounded-2xl print:bg-white print:p-0 print:overflow-visible font-sans relative">
                
                {/* PDF Header Section */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-b-2 border-slate-900 pb-4">
                  <div>
                    {/* Seller Profile */}
                    <h2 className="text-base font-black tracking-tight text-slate-900 uppercase">
                      {storeSettings?.storeName || 'ครัวกะเพราโคตรกรอบ (สำนักงานใหญ่)'}
                    </h2>
                    <p className="text-[10px] text-slate-600 mt-1 leading-relaxed max-w-sm">
                      {storeSettings?.storeAddress || '123/45 ถนนบรรทัดทอง แขวงวังใหม่ เขตปทุมวัน กรุงเทพมหานคร 10330'}
                    </p>
                    <p className="text-[10px] text-slate-900 font-bold mt-1">
                      เลขประจำตัวผู้เสียภาษี: {storeSettings?.storeTaxId || '0105560987654'} (สำนักงานใหญ่)
                    </p>
                  </div>
                  <div className="md:text-right flex flex-col justify-between items-end">
                    <div className="text-right">
                      <span className="border-2 border-slate-900 px-3 py-1 font-black text-sm uppercase tracking-wide inline-block text-slate-950">
                        ใบเสร็จรับเงิน / ใบกำกับภาษี
                      </span>
                      <p className="text-[8px] text-slate-500 font-bold tracking-widest mt-1">
                        (ต้นฉบับ / ORIGINAL)
                      </p>
                    </div>
                    <div className="text-right text-[10px] text-slate-700 font-medium space-y-0.5 mt-2 md:mt-0">
                      <p><span className="font-bold">เลขที่ใบกำกับภาษี (Invoice No):</span> <span className="font-bold font-mono text-red-600">{inv.invoiceNo}</span></p>
                      <p><span className="font-bold">วันที่ออกเอกสาร (Issued Date):</span> <span className="font-mono">{new Date(inv.issuedAt).toLocaleDateString('th-TH')} {new Date(inv.issuedAt).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}</span></p>
                      <p><span className="font-bold">หมายเลขบิลอ้างอิง (Ref No):</span> <span className="font-mono">{order.id}</span></p>
                    </div>
                  </div>
                </div>

                {/* Buyer (Customer) & Invoice metadata */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 my-5">
                  <div className="md:col-span-2 bg-slate-50 p-4 rounded-xl border border-slate-200 text-[11px] space-y-1">
                    <span className="text-[8.5px] font-black text-slate-400 uppercase tracking-wide block border-b border-slate-200 pb-1 mb-1.5">
                      ข้อมูลผู้ซื้อ / ผู้รับบริการ (Customer Details)
                    </span>
                    <div className="flex">
                      <span className="w-24 text-slate-500 shrink-0">นามลูกค้า:</span>
                      <span className="font-bold text-slate-900">{inv.customerName}</span>
                    </div>
                    <div className="flex">
                      <span className="w-24 text-slate-500 shrink-0">ที่อยู่:</span>
                      <span className="text-slate-700 leading-normal font-medium">{inv.customerAddress}</span>
                    </div>
                    <div className="flex gap-4 mt-1">
                      <div className="flex">
                        <span className="w-24 text-slate-500 shrink-0">เลขผู้เสียภาษี:</span>
                        <span className="font-bold text-slate-900 font-mono tracking-wider">{inv.customerTaxId}</span>
                      </div>
                      <div className="flex">
                        <span className="text-slate-500 shrink-0 mr-2">สาขา:</span>
                        <span className="font-bold text-slate-900">{inv.customerBranch === '00000' || inv.customerBranch === 'สำนักงานใหญ่' ? 'สำนักงานใหญ่' : `สาขา ${inv.customerBranch}`}</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-[11px] flex flex-col justify-between">
                    <div>
                      <span className="text-[8.5px] font-black text-slate-400 uppercase tracking-wide block border-b border-slate-200 pb-1 mb-1.5">
                        ช่องทางรับชำระ (Payment Info)
                      </span>
                      <div className="space-y-1 mt-1">
                        <div className="flex justify-between">
                          <span className="text-slate-500">วิธีชำระเงิน:</span>
                          <span className="font-bold text-slate-800">
                            {order.paymentMethod === 'CASH' ? 'เงินสด (Cash)' : order.paymentMethod === 'PROMPTPAY' ? 'พร้อมเพย์ (PromptPay)' : 'โอนเงิน (Bank Transfer)'}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">พนักงานแคชเชียร์:</span>
                          <span className="font-semibold text-slate-800">{order.cashierName || 'Admin'}</span>
                        </div>
                      </div>
                    </div>
                    
                    {order.paymentSlip && (
                      <div className="text-[8.5px] text-indigo-500 font-bold border border-indigo-200 bg-indigo-50/50 px-2 py-1 rounded text-center mt-2 print:hidden">
                        ✓ แนบหลักฐานสลิปชำระเงินเรียบร้อย
                      </div>
                    )}
                  </div>
                </div>

                {/* Items table */}
                <table className="w-full text-left text-[11px] border-collapse border border-slate-300">
                  <thead>
                    <tr className="bg-slate-100 text-slate-800 font-bold border-b border-slate-300">
                      <th className="p-2.5 border-r border-slate-300 text-center w-12">ลำดับ</th>
                      <th className="p-2.5 border-r border-slate-300">รายการสินค้า/บริการ (Description of Goods/Services)</th>
                      <th className="p-2.5 border-r border-slate-300 text-center w-20">จำนวน</th>
                      <th className="p-2.5 border-r border-slate-300 text-right w-24">หน่วยละ</th>
                      <th className="p-2.5 text-right w-28">จำนวนเงิน (THB)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {order.items.map((item, index) => {
                      const itemTotal = (item.price + item.eggPrice) * item.quantity;
                      return (
                        <tr key={item.id} className="text-slate-800">
                          <td className="p-2.5 border-r border-slate-300 text-center font-mono">{index + 1}</td>
                          <td className="p-2.5 border-r border-slate-300">
                            <span className="font-bold text-slate-900">{item.name}</span>
                            {item.addFriedEgg && <span className="block text-[9px] text-slate-400 pl-2">+ ไข่ดาวโคตรกรอบ (+฿10)</span>}
                            {item.notes && <span className="block text-[9px] text-slate-500 pl-2">หมายเหตุ: {item.notes}</span>}
                          </td>
                          <td className="p-2.5 border-r border-slate-300 text-center font-mono font-bold">{item.quantity}</td>
                          <td className="p-2.5 border-r border-slate-300 text-right font-mono">{(item.price + item.eggPrice).toLocaleString()}</td>
                          <td className="p-2.5 text-right font-mono font-bold">{itemTotal.toLocaleString()}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    {/* Calculations */}
                    <tr className="border-t-2 border-slate-400 font-semibold bg-slate-50">
                      <td colSpan={3} rowSpan={3} className="p-3 text-center align-middle border-r border-slate-300">
                        {/* Dynamic Verification QR Code & text */}
                        <div className="flex items-center gap-4 text-left">
                          <img 
                            src={qrCodeApiUrl} 
                            alt="Verification QR Code" 
                            className="w-20 h-20 border border-slate-200 bg-white p-1 rounded-md"
                          />
                          <div className="space-y-1 max-w-[240px]">
                            <p className="text-[9px] font-black text-slate-800 flex items-center gap-1">
                              <QrCode className="w-3.5 h-3.5 text-slate-900 shrink-0" />
                              ระบบตรวจสอบความถูกต้องเอกสาร (e-Verification)
                            </p>
                            <p className="text-[8px] text-slate-500 leading-normal font-medium">
                              เอกสารฉบับนี้พิมพ์จากระบบคอมพิวเตอร์ที่ได้รับการรับรอง สามารถสแกนกล้องมือถือเพื่อตรวจสอบข้อมูลต้นฉบับทางบัญชี
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="p-2 text-right border-r border-slate-300">มูลค่าหลังหักส่วนลด (Subtotal):</td>
                      <td className="p-2 text-right font-mono">{subtotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    </tr>
                    <tr className="font-semibold bg-slate-50">
                      <td className="p-2 text-right border-r border-slate-300">ภาษีมูลค่าเพิ่ม VAT ({vatRate}%):</td>
                      <td className="p-2 text-right font-mono text-emerald-600 font-bold">{vatAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    </tr>
                    <tr className="font-bold bg-slate-100 border-t border-slate-300">
                      <td className="p-2 text-right border-r border-slate-300 text-slate-950 font-black">ยอดเงินสุทธิทั้งสิ้น (Grand Total):</td>
                      <td className="p-2 text-right font-mono text-slate-950 font-black text-sm">฿{order.total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    </tr>
                  </tfoot>
                </table>

                {/* Terms disclaimer */}
                <div className="mt-6 border border-slate-200 p-3.5 rounded-xl text-[9px] text-slate-500 leading-relaxed font-medium">
                  <p className="font-bold text-slate-800 flex items-center gap-1 mb-1">
                    🛡️ ข้อมูลรับรองการตรวจสอบความถูกต้อง (Document Authenticity Assurance)
                  </p>
                  <p>
                    ใบเสร็จรับเงิน/ใบกำกับภาษีฉบับนี้ เป็นเอกสารที่เกิดขึ้นจากการดำเนินธุรกรรมทางการค้าโดยสอดคล้องตามประมวลรัษฎากรแห่งประเทศไทย การพิมพ์เอกสารฉบับนี้เสมือนเป็นการยืนยันความรับผิดชอบในการนำส่งภาษีมูลค่าเพิ่มให้ครบถ้วนถูกต้องตามรอบเดือนภาษี
                  </p>
                </div>

                {/* Signatures */}
                {showSignatureLines ? (
                  <div className="mt-10 flex justify-between items-end px-12 text-[10.5px] text-slate-700 font-semibold relative">
                    <div className="text-center space-y-1">
                      <p>ลงชื่อ: .............................................................. ผู้จัดทำบัญชี</p>
                      <p>( ............................................................................ )</p>
                      <p className="text-[9px] text-slate-400 font-medium">วันที่: ........ / ........ / ................</p>
                    </div>
                    <div className="relative text-center space-y-1">
                      {showCompanySeal && (
                        <div className="absolute -top-10 -right-4 w-24 h-24 border-4 border-double border-red-500/40 rounded-full flex items-center justify-center pointer-events-none rotate-12 print:opacity-100 select-none">
                          <div className="border border-dashed border-red-500/55 rounded-full w-[84px] h-[84px] flex flex-col items-center justify-center text-red-500/80 font-bold font-sans">
                            <span className="text-[6.5px] uppercase tracking-widest text-center leading-none">OFFICIAL SEAL</span>
                            <span className="text-[8.5px] tracking-tight font-black text-center my-0.5 leading-tight">ครัวกะเพรา</span>
                            <span className="text-[6.5px] uppercase tracking-wide text-center leading-none">KAPRAO POS</span>
                          </div>
                        </div>
                      )}
                      <p>ลงชื่อ: .............................................................. กรรมการผู้มีอำนาจ</p>
                      <p>( ............................................................................ )</p>
                      <p className="text-[9px] text-slate-400 font-medium">ประทับตราบริษัท (ถ้ามี)</p>
                    </div>
                  </div>
                ) : (
                  showCompanySeal && (
                    <div className="mt-8 flex justify-end px-12 relative">
                      <div className="w-24 h-24 border-4 border-double border-red-500/40 rounded-full flex items-center justify-center pointer-events-none rotate-12 print:opacity-100 select-none">
                        <div className="border border-dashed border-red-500/55 rounded-full w-[84px] h-[84px] flex flex-col items-center justify-center text-red-500/80 font-bold font-sans">
                          <span className="text-[6.5px] uppercase tracking-widest text-center leading-none">OFFICIAL SEAL</span>
                          <span className="text-[8.5px] tracking-tight font-black text-center my-0.5 leading-tight">ครัวกะเพรา</span>
                          <span className="text-[6.5px] uppercase tracking-wide text-center leading-none">KAPRAO POS</span>
                        </div>
                      </div>
                    </div>
                  )
                )}

              </div>

              {/* Print actions footer */}
              <div className="flex gap-2.5 pt-3 shrink-0 print:hidden justify-end border-t border-slate-850">
                <button
                  type="button"
                  onClick={() => setSelectedSalesInvoice(null)}
                  className="px-5 py-2.5 bg-slate-850 hover:bg-slate-800 text-slate-300 rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  ย้อนกลับ
                </button>
                <button
                  type="button"
                  onClick={() => { window.print(); }}
                  className="px-6 py-2.5 bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-500 hover:to-amber-500 text-white font-black rounded-xl text-xs shadow-lg transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Printer className="w-4 h-4" /> สั่งพิมพ์ใบกำกับภาษี (Print PDF)
                </button>
              </div>

            </div>
          </div>
        );
      })()}

      {/* ON-THE-FLY GENERATE TAX INVOICE MODAL */}
      {showGenerateInvoiceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg p-6 space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3 text-white">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-red-500" />
                <h3 className="font-bold text-white text-base">ออกใบกำกับภาษีเต็มรูปแบบ (New Tax Invoice)</h3>
              </div>
              <button 
                onClick={() => setShowGenerateInvoiceModal(false)}
                className="text-slate-400 hover:text-white text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleGenerateInvoice} className="space-y-4">
              {genErrorMessage && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-xs text-red-400 font-bold">
                  ⚠️ {genErrorMessage}
                </div>
              )}

              {/* Order selector */}
              <div className="space-y-1.5">
                <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">เลือกรายการสั่งซื้อ (Select Completed Order):</label>
                <select
                  value={genSelectedOrderId}
                  onChange={(e) => {
                    setGenSelectedOrderId(e.target.value);
                    const ord = orders.find(o => o.id === e.target.value);
                    if (ord?.taxInvoice) {
                      // Pre-fill if there was already an invoice
                      setGenCustName(ord.taxInvoice.customerName);
                      setGenCustTaxId(ord.taxInvoice.customerTaxId);
                      setGenCustAddress(ord.taxInvoice.customerAddress);
                      setGenCustBranch(ord.taxInvoice.customerBranch);
                    } else if (ord) {
                      setGenCustName('');
                      setGenCustTaxId('');
                      setGenCustAddress('');
                      setGenCustBranch('00000');
                    }
                  }}
                  className="w-full bg-slate-950 border border-slate-800 text-xs text-white rounded-xl px-3 py-2.5 focus:outline-none focus:border-red-500 font-medium"
                  required
                >
                  <option value="">-- เลือกรายการอาหารที่ชำระเงินแล้ว --</option>
                  {orders
                    .filter(o => o.paymentStatus === 'PAID')
                    .map(o => {
                      const dateStr = new Date(o.timestamp).toLocaleDateString('th-TH');
                      const timeStr = new Date(o.timestamp).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
                      const itemsStr = o.items.map(it => `${it.name} x${it.quantity}`).join(', ');
                      return (
                        <option key={o.id} value={o.id}>
                          #{o.id.substring(o.id.length - 6)} - ฿{o.total.toLocaleString()} ({dateStr} {timeStr}) [{itemsStr.substring(0, 45)}...] {o.taxInvoice ? '✅ มีใบกำกับภาษีแล้ว' : ''}
                        </option>
                      );
                    })}
                </select>
              </div>

              {/* Customer Name */}
              <div className="space-y-1.5">
                <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">ชื่อผู้ซื้อสินค้า / ชื่อนิติบุคคล (Customer / Corporate Name):</label>
                <input
                  type="text"
                  placeholder="เช่น บริษัท แอนตี้กราวิตี้ จำกัด"
                  value={genCustName}
                  onChange={(e) => setGenCustName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 text-xs text-white rounded-xl px-3 py-2.5 focus:outline-none focus:border-red-500"
                  required
                />
              </div>

              {/* Tax ID */}
              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-2 space-y-1.5">
                  <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">เลขผู้เสียภาษี 13 หลัก (Tax ID):</label>
                  <input
                    type="text"
                    maxLength={13}
                    placeholder="เช่น 0105561000123"
                    value={genCustTaxId}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '');
                      setGenCustTaxId(val);
                    }}
                    className="w-full bg-slate-950 border border-slate-800 text-xs text-white rounded-xl px-3 py-2.5 focus:outline-none focus:border-red-500 font-mono tracking-wider"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">รหัสสาขา (Branch):</label>
                  <input
                    type="text"
                    placeholder="00000"
                    maxLength={10}
                    value={genCustBranch}
                    onChange={(e) => setGenCustBranch(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 text-xs text-white rounded-xl px-3 py-2.5 focus:outline-none focus:border-red-500 font-mono text-center"
                    required
                  />
                </div>
              </div>

              {/* Billing Address */}
              <div className="space-y-1.5">
                <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">ที่อยู่จดทะเบียนตามภาษีมูลค่าเพิ่ม (Registered VAT Address):</label>
                <textarea
                  placeholder="กรอกที่อยู่จดทะเบียนเต็มรูปแบบเพื่อออกใบกำกับภาษีที่ถูกต้องตามกฎหมาย"
                  value={genCustAddress}
                  onChange={(e) => setGenCustAddress(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 text-xs text-white rounded-xl px-3 py-2 h-20 focus:outline-none focus:border-red-500 resize-none leading-relaxed"
                  required
                />
              </div>

              {/* Modal footer / Actions */}
              <div className="flex gap-2.5 pt-2 justify-end">
                <button
                  type="button"
                  onClick={() => setShowGenerateInvoiceModal(false)}
                  className="px-4 py-2 bg-slate-850 hover:bg-slate-800 text-slate-300 rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-500 hover:to-amber-500 text-white font-black rounded-xl text-xs shadow-lg transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Check className="w-4 h-4" /> สร้างใบกำกับภาษี & พิมพ์ PDF
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Telegram Expense & Slip Sync Modal */}
      <TelegramExpenseSyncModal
        isOpen={showTelegramSyncModal}
        onClose={() => setShowTelegramSyncModal(false)}
        onAddExpense={onAddExpense}
        notificationSettings={notificationSettings}
        onUpdateNotificationSettings={onUpdateNotificationSettings}
        currency={currency}
      />
    </div>
  );
}
