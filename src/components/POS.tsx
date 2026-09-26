import React, { useState, useEffect } from 'react';
import { MenuItem, Order, OrderItem, OrderSplit, Promotion, Ingredient, Recipe, User, StoreSettings, Expense, Customer } from '../types';
import { 
  Plus, Minus, Trash2, ShoppingCart, Percent, 
  Check, X, Receipt, CircleAlert, DollarSign, QrCode, 
  Wifi, WifiOff, Users, Lock, ArrowRight, Clock, Search,
  RefreshCw, CreditCard, Upload, FileText,
  Printer, FolderOpen, Coins, Sparkles
} from 'lucide-react';

interface POSProps {
  menuItems: MenuItem[];
  promotions: Promotion[];
  ingredients: Ingredient[];
  recipes: Recipe[];
  currentUser: User;
  onOrderCompleted: (order: Order, updatedIngredients: Ingredient[]) => void;
  currency: string;
  taxRate: number;
  storeSettings?: StoreSettings;
  orders?: Order[];
  onUpdateOrders?: (updatedOrders: Order[]) => void;
  isOnline?: boolean;
  simulateOffline?: boolean;
  onToggleSimulateOffline?: () => void;
  onSyncOffline?: () => void;
  syncingOffline?: boolean;
  onAddExpense?: (expense: Expense) => void;
  activeBranchId?: string;
}

interface ParkedOrder {
  id: string;
  tableNo: string;
  cart: OrderItem[];
  timestamp: string;
  activeDiscount: Promotion | null;
  manualDiscount: number;
  promoCode: string;
  notes: string;
  total: number;
}

export default function POS({ 
  menuItems, promotions, ingredients, recipes, currentUser, onOrderCompleted, currency, taxRate, storeSettings,
  orders = [], onUpdateOrders,
  isOnline = true, simulateOffline = false, onToggleSimulateOffline, onSyncOffline, syncingOffline = false,
  onAddExpense, activeBranchId = 'b1'
}: POSProps) {
  // Connection state derived from isOnline prop
  const isOffline = !isOnline;

  // Parked Orders State
  const [parkedOrders, setParkedOrders] = useState<ParkedOrder[]>(() => {
    const saved = localStorage.getItem('kp_parkedOrders');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error(e);
      }
    }
    return [];
  });
  const [showRecallModal, setShowRecallModal] = useState<boolean>(false);

  useEffect(() => {
    localStorage.setItem('kp_parkedOrders', JSON.stringify(parkedOrders));
  }, [parkedOrders]);

  // States
  const [activePosTab, setActivePosTab] = useState<'menu' | 'cart'>('menu');
  const [selectedCategory, setSelectedCategory] = useState<string>('ทั้งหมด');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [tableNo, setTableNo] = useState<string>('1');
  const [showTableSelector, setShowTableSelector] = useState<boolean>(false);
  const [cart, setCart] = useState<OrderItem[]>([]);
  const [promoCode, setPromoCode] = useState<string>('');
  const [activeDiscount, setActiveDiscount] = useState<Promotion | null>(null);
  const [manualDiscount, setManualDiscount] = useState<number>(0); // Fixed THB discount
  const [checkoutMode, setCheckoutMode] = useState<'NONE' | 'CASH' | 'PROMPTPAY' | 'TRANSFER' | 'SPLIT'>('NONE');

  // POS Split bill states
  const [posSplitType, setPosSplitType] = useState<'ITEMS' | 'PERCENTAGE'>('PERCENTAGE');
  const [posNumPercentSplits, setPosNumPercentSplits] = useState<number>(2);
  const [posNumItemSplits, setPosNumItemSplits] = useState<number>(2);
  const [posSplitNames, setPosSplitNames] = useState<string[]>(['คนแรก', 'คนที่สอง', 'คนที่สาม', 'คนที่สี่', 'คนที่ห้า', 'คนที่หก']);
  const [posItemAssignments, setPosItemAssignments] = useState<Record<string, Record<number, number>>>({});
  const [posSplits, setPosSplits] = useState<OrderSplit[]>([]);
  const [cashReceived, setCashReceived] = useState<string>('');
  const [cashDenomMode, setCashDenomMode] = useState<'SET' | 'ADD'>('SET');
  const [paymentSlip, setPaymentSlip] = useState<string>('');
  const [showReceipt, setShowReceipt] = useState<Order | null>(null);
  const [lastCompletedOrderToast, setLastCompletedOrderToast] = useState<Order | null>(null);
  const [posNotes, setPosNotes] = useState<string>( '');
  const [showSalesHistory, setShowSalesHistory] = useState<boolean>(false);

  // Floating Action Button (FAB) state & sound helper
  const [showFabMenu, setShowFabMenu] = useState<boolean>(false);

  const playCashRegisterSound = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      // Crisp "Ching!" sound: double frequency tone
      const osc1 = audioCtx.createOscillator();
      const osc2 = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(1500, audioCtx.currentTime); // High pitch
      osc1.frequency.exponentialRampToValueAtTime(800, audioCtx.currentTime + 0.15);
      
      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(2000, audioCtx.currentTime); // Extra ring
      osc2.frequency.exponentialRampToValueAtTime(1200, audioCtx.currentTime + 0.2);
      
      gainNode.gain.setValueAtTime(0.12, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.35);
      
      osc1.connect(gainNode);
      osc2.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      
      osc1.start();
      osc2.start();
      osc1.stop(audioCtx.currentTime + 0.35);
      osc2.stop(audioCtx.currentTime + 0.35);
    } catch (e) {
      console.warn('Audio play blocked or not supported:', e);
    }
  };

  const handleOpenCashDrawer = () => {
    playCashRegisterSound();
    const nowStr = new Date().toLocaleTimeString('th-TH');
    setExpenseSuccessToast(`🔓 ลิ้นชักเก็บเงินถูกเปิดออกแล้ว (Cash Drawer Open) • เวลา ${nowStr}`);
    setShowFabMenu(false);
  };

  const handleReprintLastReceipt = () => {
    if (!orders || orders.length === 0) {
      setExpenseSuccessToast("⚠️ ไม่พบประวัติบิลขายใดๆ ในระบบสำหรับการพิมพ์ซ้ำ");
      setShowFabMenu(false);
      return;
    }
    // Get the latest order sorted by timestamp
    const sortedOrders = [...orders].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    const lastOrder = sortedOrders[0];
    if (lastOrder) {
      setShowReceipt(lastOrder);
      setExpenseSuccessToast(`🖨️ เปิดใบเสร็จล่าสุดเรียบร้อย บิลเลขที่: ${lastOrder.id.substring(0, 8)}`);
    } else {
      setExpenseSuccessToast("⚠️ ไม่พบใบเสร็จล่าสุดในระบบ");
    }
    setShowFabMenu(false);
  };

  const handleToggleFABDiscount = () => {
    if (!isManagerOrAdmin) {
      setExpenseSuccessToast("🔒 ต้องใช้สิทธิ์ผู้จัดการ (Manager/Admin) ในการระบุส่วนลดสดนี้");
      setShowFabMenu(false);
      return;
    }
    if (manualDiscount > 0) {
      setManualDiscount(0);
      setExpenseSuccessToast("🏷️ ยกเลิกส่วนลดผู้จัดการเรียบร้อยแล้ว");
    } else {
      const sub = cart.reduce((sum, item) => sum + (item.price + item.eggPrice) * item.quantity, 0);
      const discountAmt = sub > 0 ? Math.round(sub * 0.1) : 50;
      setManualDiscount(discountAmt);
      setExpenseSuccessToast(`🏷️ ประยุกต์ใช้ส่วนลดผู้จัดการ 10% (ลด ฿${discountAmt.toLocaleString()})`);
    }
    setShowFabMenu(false);
  };

  // Full Tax Invoice states
  const [showTaxInvoiceForm, setShowTaxInvoiceForm] = useState<boolean>(false);
  const [taxCustName, setTaxCustName] = useState<string>('');
  const [taxCustTaxId, setTaxCustTaxId] = useState<string>('');
  const [taxCustAddress, setTaxCustAddress] = useState<string>('');
  const [taxCustBranch, setTaxCustBranch] = useState<string>('สำนักงานใหญ่');
  const [invoiceViewMode, setInvoiceViewMode] = useState<'SIMPLIFIED' | 'FULL'>('SIMPLIFIED');

  // Sales History Filter States
  const [historySearchQuery, setHistorySearchQuery] = useState<string>('');
  const [historyStartDate, setHistoryStartDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString().split('T')[0];
  });
  const [historyEndDate, setHistoryEndDate] = useState<string>(() => {
    return new Date().toISOString().split('T')[0];
  });

  // Modifiers Dialog State
  const [customizingItem, setCustomizingItem] = useState<MenuItem | null>(null);
  const [addEgg, setAddEgg] = useState<boolean>(true);
  const [spiceLevel, setSpiceLevel] = useState<string>('ปานกลาง');
  const [itemNote, setItemNote] = useState<string>('');

  // Role Access Checks (RBAC POS Restrictions)
  const isManagerOrAdmin = currentUser.role === 'Admin' || currentUser.role === 'Manager';

  // Quick Expense Dialog States
  const [showQuickExpense, setShowQuickExpense] = useState<boolean>(false);
  const [expenseAmount, setExpenseAmount] = useState<string>('');
  const [expenseCategory, setExpenseCategory] = useState<Expense['category']>('Other');
  const [expenseDescription, setExpenseDescription] = useState<string>('');
  const [expenseDate, setExpenseDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [expenseSuccessToast, setExpenseSuccessToast] = useState<string | null>(null);

  // Auto-dismiss Quick Expense toast
  useEffect(() => {
    if (expenseSuccessToast) {
      const timer = setTimeout(() => {
        setExpenseSuccessToast(null);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [expenseSuccessToast]);

  const handleQuickExpenseSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseFloat(expenseAmount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      alert('กรุณากรอกจำนวนเงินให้ถูกต้องและมากกว่า 0');
      return;
    }
    if (!expenseDescription.trim()) {
      alert('กรุณากรอกรายละเอียดค่าใช้จ่าย');
      return;
    }

    const newExpense: Expense = {
      id: `exp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      category: expenseCategory,
      amount: parsedAmount,
      description: expenseDescription.trim(),
      date: expenseDate,
      branchId: activeBranchId,
      vatAmount: 0
    };

    if (onAddExpense) {
      onAddExpense(newExpense);
    }

    // Reset Form
    setExpenseAmount('');
    setExpenseCategory('Other');
    setExpenseDescription('');
    setExpenseDate(new Date().toISOString().split('T')[0]);
    setShowQuickExpense(false);

    // Trigger toast message
    setExpenseSuccessToast(`บันทึกค่าใช้จ่ายด่วน ${parsedAmount.toLocaleString()} บาท เรียบร้อยแล้ว!`);
  };

  // Haptic Feedback & Snappy Visual Shake State
  const [shakeButton, setShakeButton] = useState<string | null>(null);

  const triggerProceedShakeAndVibrate = (buttonId: string, callback: () => void) => {
    // 1. Intense & snappy physical haptics (Android/Chrome Web Vibe API)
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      // Fast triple-pulse strong haptics for instant tactility
      navigator.vibrate([60, 40, 60, 40, 100]); 
    }
    
    // 2. High performance screen visual vibration feedback
    setShakeButton(buttonId);
    setTimeout(() => {
      setShakeButton(null);
      callback();
    }, 150); // fast transition for super snappy responsiveness!
  };

  // Automatically trigger print dialog when a receipt is displayed
  useEffect(() => {
    if (showReceipt) {
      const timer = setTimeout(() => {
        window.print();
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [showReceipt]);

  // Quick Add Keyboard-shortcut states
  const [showQuickAddModal, setShowQuickAddModal] = useState<boolean>(false);
  const [quickAddSearchTerm, setQuickAddSearchTerm] = useState<string>('');
  const [quickAddSelectedIndex, setQuickAddSelectedIndex] = useState<number>(0);
  const [quickAddAddEgg, setQuickAddAddEgg] = useState<boolean>(false);
  const [quickAddSuccessMsg, setQuickAddSuccessMsg] = useState<string | null>(null);

  const quickAddInputRef = React.useRef<HTMLInputElement>(null);

  // Filter items helper for Quick Add
  const getFilteredQuickItems = (term: string) => {
    const cleanTerm = term.trim().toLowerCase();
    if (!cleanTerm) return menuItems.filter(item => item.active);
    return menuItems.filter(item => {
      if (!item.active) return false;
      return (
        item.id.toLowerCase().includes(cleanTerm) ||
        item.name.toLowerCase().includes(cleanTerm) ||
        item.category.toLowerCase().includes(cleanTerm)
      );
    });
  };

  // Add item helper for Quick Add
  const addQuickItemToCart = (item: MenuItem, withEgg: boolean) => {
    const isDrink = item.category === 'เครื่องดื่ม' || item.category === 'ซุป/แกง';
    const finalEgg = isDrink ? false : withEgg;
    const eggPriceVal = finalEgg ? 10 : 0;

    const existingIndex = cart.findIndex(
      (i) => i.menuItemId === item.id && i.addFriedEgg === finalEgg && i.notes === ''
    );

    if (existingIndex > -1) {
      const updatedCart = [...cart];
      updatedCart[existingIndex].quantity += 1;
      setCart(updatedCart);
    } else {
      const newItem: OrderItem = {
        id: `cart-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        menuItemId: item.id,
        name: item.name,
        price: item.price,
        quantity: 1,
        addFriedEgg: finalEgg,
        eggPrice: eggPriceVal,
        notes: ''
      };
      setCart([...cart, newItem]);
    }

    // Success feedback
    setQuickAddSearchTerm('');
    setQuickAddSelectedIndex(0);

    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(50);
    }

    if (window.innerWidth < 1280) {
      setActivePosTab('cart');
    }

    setQuickAddSuccessMsg(`เพิ่ม "${item.name}${finalEgg ? ' + ไข่ดาว' : ''}" เข้าตะกร้าแล้ว!`);
  };

  // Auto focus input on modal open
  useEffect(() => {
    if (showQuickAddModal) {
      const timer = setTimeout(() => {
        quickAddInputRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [showQuickAddModal]);

  // Auto-dismiss success toast
  useEffect(() => {
    if (quickAddSuccessMsg) {
      const timer = setTimeout(() => {
        setQuickAddSuccessMsg(null);
      }, 1800);
      return () => clearTimeout(timer);
    }
  }, [quickAddSuccessMsg]);

  // Global keydown listener for Quick Add shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Shortcut is F2 or Alt+Q or Alt+q
      const isShortcut = e.key === 'F2' || (e.altKey && e.key.toLowerCase() === 'q');

      if (isShortcut) {
        e.preventDefault();
        setShowQuickAddModal(prev => {
          const next = !prev;
          if (next) {
            setQuickAddSearchTerm('');
            setQuickAddSelectedIndex(0);
            setQuickAddAddEgg(false);
            setQuickAddSuccessMsg(null);
          }
          return next;
        });
        return;
      }

      if (!showQuickAddModal) return;

      const matches = getFilteredQuickItems(quickAddSearchTerm);

      if (e.key === 'Escape') {
        e.preventDefault();
        setShowQuickAddModal(false);
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setQuickAddSelectedIndex(prev => {
          const count = matches.length;
          return count > 0 ? (prev + 1) % count : 0;
        });
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setQuickAddSelectedIndex(prev => {
          const count = matches.length;
          return count > 0 ? (prev - 1 + count) % count : 0;
        });
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (matches.length > 0) {
          const selected = matches[quickAddSelectedIndex % matches.length];
          addQuickItemToCart(selected, quickAddAddEgg);
        }
      } else if (e.key === ' ' && (e.ctrlKey || e.altKey)) {
        e.preventDefault();
        setQuickAddAddEgg(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showQuickAddModal, quickAddSearchTerm, quickAddSelectedIndex, quickAddAddEgg, menuItems, cart]);



  // Categories (User's explicit visual requirement: All, Kaprao, Rice, Drinks, Snacks/Sides)
  const displayCategories = ['ทั้งหมด', 'กะเพรา', 'ข้าว', 'เครื่องดื่ม', 'ของทานเล่น'];

  // Filtered Menu Items with smart semantic mapping for the database
  const filteredMenuItems = menuItems.filter(item => {
    if (!item.active) return false;
    
    let matchesCategory = false;
    if (selectedCategory === 'ทั้งหมด') {
      matchesCategory = true;
    } else if (selectedCategory === 'กะเพรา') {
      matchesCategory = item.category.toLowerCase().includes('กะเพรา') || item.name.toLowerCase().includes('กะเพรา');
    } else if (selectedCategory === 'ข้าว') {
      matchesCategory = item.category.toLowerCase().includes('ข้าว') || item.name.toLowerCase().includes('ข้าว') || item.category.includes('ดั้งเดิม') || item.category.includes('ฟิวชั่น');
    } else if (selectedCategory === 'เครื่องดื่ม') {
      matchesCategory = item.category.toLowerCase().includes('เครื่องดื่ม') || item.name.toLowerCase().includes('ชา') || item.name.toLowerCase().includes('น้ำ') || item.name.toLowerCase().includes('อัญชัน');
    } else if (selectedCategory === 'ของทานเล่น') {
      matchesCategory = item.category.toLowerCase().includes('ของทานเล่น') || item.category.toLowerCase().includes('แกง') || item.category.toLowerCase().includes('ซุป') || item.name.toLowerCase().includes('เต้าหู้') || item.name.toLowerCase().includes('หมูสับ');
    } else {
      matchesCategory = item.category === selectedCategory;
    }

    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          item.category.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  // Cart Handlers
  const openCustomizer = (item: MenuItem) => {
    const isDrink = item.category === 'เครื่องดื่ม' || item.category === 'ซุป/แกง';
    setCustomizingItem(item);
    setAddEgg(!isDrink);
    setItemNote('');
  };

  const handleAddToCart = () => {
    if (!customizingItem) return;

    const eggPrice = addEgg ? 10 : 0;
    const finalName = customizingItem.name;
    const notesStr = itemNote.trim();

    // Check if identical item with modifiers is already in cart
    const existingIndex = cart.findIndex(
      (i) => i.menuItemId === customizingItem.id && 
             i.addFriedEgg === addEgg && 
             i.notes === notesStr
    );

    if (existingIndex > -1) {
      const updatedCart = [...cart];
      updatedCart[existingIndex].quantity += 1;
      setCart(updatedCart);
    } else {
      const newItem: OrderItem = {
        id: `cart-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        menuItemId: customizingItem.id,
        name: finalName,
        price: customizingItem.price,
        quantity: 1,
        addFriedEgg: addEgg,
        eggPrice: eggPrice,
        notes: notesStr
      };
      setCart([...cart, newItem]);
    }

    setCustomizingItem(null);
    // Auto switch tab to cart on mobile for responsive flow
    if (window.innerWidth < 1280) {
      setActivePosTab('cart');
    }
  };

  const handleUpdateQty = (itemId: string, amount: number) => {
    const updated = cart.map(item => {
      if (item.id === itemId) {
        const newQty = item.quantity + amount;
        return newQty > 0 ? { ...item, quantity: newQty } : null;
      }
      return item;
    }).filter(Boolean) as OrderItem[];
    setCart(updated);
  };

  const handleRemoveItem = (itemId: string) => {
    setCart(cart.filter(item => item.id !== itemId));
  };

  // RBAC Restricted void handler
  const handleCancelBill = () => {
    if (!isManagerOrAdmin) {
      alert(`❌ ปฏิเสธสิทธิ์การยกเลิกบิล!\nเฉพาะพนักงานตำแหน่ง "แอดมิน" หรือ "ผู้จัดการ" เท่านั้นที่มีสิทธิ์ล้างและยกเลิกออเดอร์ในระบบนี้ได้`);
      return;
    }

    if (confirm('คุณต้องการยกเลิกและเคลียร์รายการอาหารทั้งหมดในบิลนี้ใช่หรือไม่?')) {
      setCart([]);
      setActiveDiscount(null);
      setManualDiscount(0);
      setPromoCode('');
      setCashReceived('');
      setCheckoutMode('NONE');
    }
  };

  // Open Last Printed Bill logic
  const handleOpenLastBill = () => {
    // Get historical orders stored in localStorage to show the most recent one
    const savedOrdersStr = localStorage.getItem('kp_orders');
    if (savedOrdersStr) {
      const savedOrders: Order[] = JSON.parse(savedOrdersStr);
      if (savedOrders && savedOrders.length > 0) {
        setShowReceipt(savedOrders[0]);
        return;
      }
    }
    alert('⚠️ ยังไม่พบประวัติการทำรายการสั่งซื้อใดๆ ในรอบการเปิดเครื่อง POS ปัจจุบัน');
  };

  // Pricing calculations
  const subtotal = cart.reduce((sum, item) => sum + (item.price + item.eggPrice) * item.quantity, 0);
  
  let promoDiscountAmt = 0;
  if (activeDiscount) {
    if (activeDiscount.type === 'PERCENT') {
      promoDiscountAmt = Math.round((subtotal * activeDiscount.value) / 100);
    } else {
      promoDiscountAmt = activeDiscount.value;
    }
  }

  const discountTotal = Math.min(subtotal, promoDiscountAmt + manualDiscount);
  const netAmount = Math.max(0, subtotal - discountTotal);
  const serviceChargeRate = storeSettings?.serviceCharge || 0;
  const serviceChargeAmount = Math.round((netAmount * serviceChargeRate) / 100);

  const vatType = storeSettings?.vatType || 'INCLUSIVE';
  const vatAmount = vatType === 'INCLUSIVE'
    ? Math.round((netAmount * taxRate) / (100 + taxRate))
    : Math.round(((netAmount + serviceChargeAmount) * taxRate) / 100);

  const total = vatType === 'INCLUSIVE'
    ? netAmount + serviceChargeAmount
    : netAmount + serviceChargeAmount + vatAmount;

  // Park and Recall Order Handlers
  const handleParkOrder = () => {
    if (cart.length === 0) {
      alert('⚠️ ตะกร้าว่างเปล่า ไม่สามารถพักออเดอร์ได้');
      return;
    }
    
    const newParked: ParkedOrder = {
      id: `park-${Date.now()}`,
      tableNo: tableNo,
      cart: cart,
      timestamp: new Date().toISOString(),
      activeDiscount: activeDiscount,
      manualDiscount: manualDiscount,
      promoCode: promoCode,
      notes: posNotes,
      total: total
    };
    
    setParkedOrders([...parkedOrders, newParked]);
    setCart([]);
    setPromoCode('');
    setActiveDiscount(null);
    setManualDiscount(0);
    setPosNotes('');
    setTableNo('1');
    alert(`📥 พักออเดอร์ของโต๊ะ ${newParked.tableNo === 'TakeAway' ? 'กลับบ้าน' : newParked.tableNo} สำเร็จ!`);
  };

  const handleRecallOrder = (parked: ParkedOrder) => {
    if (cart.length > 0) {
      if (!confirm('⚠️ มีรายการในตะกร้าปัจจุบัน การเรียกคืนออเดอร์นี้จะเขียนทับตะกร้าเดิม คุณต้องการทำต่อหรือไม่?')) {
        return;
      }
    }
    setCart(parked.cart);
    setTableNo(parked.tableNo);
    setActiveDiscount(parked.activeDiscount);
    setManualDiscount(parked.manualDiscount);
    setPromoCode(parked.promoCode);
    setPosNotes(parked.notes);
    setParkedOrders(parkedOrders.filter(p => p.id !== parked.id));
    setShowRecallModal(false);
  };

  const handleDeleteParked = (id: string) => {
    if (confirm('คุณต้องการยกเลิกและลบออเดอร์ที่พักไว้นี้ใช่หรือไม่?')) {
      setParkedOrders(parkedOrders.filter(p => p.id !== id));
    }
  };

  // Apply code
  const handleApplyPromo = () => {
    const code = promoCode.trim().toUpperCase();
    const promo = promotions.find(p => p.code === code && p.active);

    if (!promo) {
      alert('โค้ดส่วนลดนี้ไม่ถูกต้อง หมดอายุ หรือยังไม่ได้เปิดใช้งาน');
      return;
    }

    if (subtotal < promo.minSpend) {
      alert(`โค้ดนี้ใช้ได้เฉพาะยอดสั่งซื้อขั้นต่ำ ${promo.minSpend} ฿ ขึ้นไป`);
      return;
    }

    setActiveDiscount(promo);
    setPromoCode('');
  };

  // Payment Handlers
  const handleCheckout = (method: 'CASH' | 'PROMPTPAY' | 'TRANSFER' | 'SPLIT') => {
    if (cart.length === 0) {
      alert('กรุณาเลือกรายการอาหารก่อนชำระเงิน');
      return;
    }
    setCheckoutMode(method);
    setCashReceived('');
    setPaymentSlip('');
    setPosSplits([]);
    
    const initialAssignments: Record<string, Record<number, number>> = {};
    cart.forEach(item => {
      initialAssignments[item.id] = { 0: item.quantity };
    });
    setPosItemAssignments(initialAssignments);
  };

  const handleGeneratePOSPercentageSplits = () => {
    const share = Math.round((total / posNumPercentSplits) * 100) / 100;
    const generated: OrderSplit[] = [];
    for (let i = 0; i < posNumPercentSplits; i++) {
      const isLast = i === posNumPercentSplits - 1;
      const splitTotal = isLast ? (total - (share * (posNumPercentSplits - 1))) : share;
      generated.push({
        id: `pos-split-${Date.now()}-${i}`,
        name: posSplitNames[i] || `คนที่ ${i + 1}`,
        type: 'PERCENTAGE',
        percentage: 100 / posNumPercentSplits,
        total: Math.max(0, splitTotal),
        paymentStatus: 'PENDING'
      });
    }
    setPosSplits(generated);
  };

  const handleGeneratePOSItemsSplits = () => {
    const generated: OrderSplit[] = [];
    for (let s = 0; s < posNumItemSplits; s++) {
      generated.push({
        id: `pos-split-${Date.now()}-${s}`,
        name: posSplitNames[s] || `กลุ่มที่ ${s + 1}`,
        type: 'ITEMS',
        items: [],
        total: 0,
        paymentStatus: 'PENDING'
      });
    }

    cart.forEach(cartItem => {
      const assignments = posItemAssignments[cartItem.id] || {};
      for (let s = 0; s < posNumItemSplits; s++) {
        const qty = assignments[s] || 0;
        if (qty > 0) {
          generated[s].items?.push({
            orderItemId: cartItem.id,
            quantity: qty
          });
        }
      }
    });

    let totalSubtotalAllocated = 0;
    const splitSubtotals = generated.map(split => {
      let sub = 0;
      split.items?.forEach(si => {
        const originalItem = cart.find(oi => oi.id === si.orderItemId);
        if (originalItem) {
          sub += (originalItem.price + originalItem.eggPrice) * si.quantity;
        }
      });
      totalSubtotalAllocated += sub;
      return sub;
    });

    if (totalSubtotalAllocated === 0) {
      alert('กรุณาเลือกจัดสรรอาหารให้มีผู้ชำระเงินอย่างน้อย 1 รายการ');
      return;
    }

    let runningTotalAllocated = 0;
    for (let s = 0; s < posNumItemSplits; s++) {
      const isLast = s === posNumItemSplits - 1;
      const ratio = totalSubtotalAllocated > 0 ? (splitSubtotals[s] / totalSubtotalAllocated) : 0;
      let splitTotal = Math.round(ratio * total);
      
      if (isLast) {
        splitTotal = Math.max(0, total - runningTotalAllocated);
      } else {
        runningTotalAllocated += splitTotal;
      }
      generated[s].total = splitTotal;
    }

    setPosSplits(generated.filter(s => s.total > 0));
  };

  const handlePayPOSSplit = (splitId: string, method: 'CASH' | 'PROMPTPAY' | 'TRANSFER') => {
    setPosSplits(prev => prev.map(s => {
      if (s.id === splitId) {
        return { ...s, paymentStatus: 'PAID', paymentMethod: method };
      }
      return s;
    }));
  };

  const handleCompleteOrder = () => {
    if (checkoutMode === 'CASH') {
      const received = parseFloat(cashReceived);
      if (isNaN(received) || received < total) {
        alert('กรุณาระบุจำนวนเงินสดที่ได้รับให้ถูกต้องและครบถ้วน');
        return;
      }
    }

    if (checkoutMode === 'SPLIT') {
      const allPaid = posSplits.every(s => s.paymentStatus === 'PAID');
      if (posSplits.length === 0 || !allPaid) {
        alert('⚠️ กรุณารับชำระเงินของทุกคนให้ครบถ้วนก่อนยืนยันรายการ');
        return;
      }
    }

    // Perform ingredient stock deduction
    const updatedIngredients = [...ingredients];

    cart.forEach(cartItem => {
      const recipe = recipes.find(r => r.menuItemId === cartItem.menuItemId);
      if (recipe) {
        recipe.ingredients.forEach(recIng => {
          const ingIndex = updatedIngredients.findIndex(i => i.id === recIng.ingredientId);
          if (ingIndex > -1) {
            updatedIngredients[ingIndex].stock = Math.max(
              0,
              parseFloat((updatedIngredients[ingIndex].stock - (recIng.amount * cartItem.quantity)).toFixed(3))
            );
          }
        });
      }

      if (cartItem.addFriedEgg) {
        const eggIndex = updatedIngredients.findIndex(i => i.id === 'i7');
        if (eggIndex > -1) {
          updatedIngredients[eggIndex].stock = Math.max(
            0,
            updatedIngredients[eggIndex].stock - cartItem.quantity
          );
        }
      }
    });

    // Create real order
    const receivedVal = checkoutMode === 'CASH' ? (parseFloat(cashReceived) || total) : undefined;
    const changeVal = checkoutMode === 'CASH' && receivedVal ? Math.max(0, receivedVal - total) : undefined;

    const txRandom = 1000 + Math.floor(Math.random() * 9000);
    const txId = `TX-${txRandom}`;
    const todayStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const soNo = `SO-${todayStr}-${txRandom}`;

    const newOrder: Order = {
      id: txId,
      soNumber: soNo,
      branchId: 'b1',
      tableNo: tableNo,
      items: cart,
      subtotal: subtotal,
      discount: discountTotal,
      total: total,
      paymentMethod: checkoutMode === 'SPLIT' ? 'CASH' : checkoutMode,
      paymentStatus: 'PAID',
      kitchenStatus: 'PENDING',
      timestamp: new Date().toISOString(),
      cashierName: currentUser.name,
      cashReceived: receivedVal,
      cashChange: changeVal,
      vatAmount: vatAmount,
      vatType: vatType,
      serviceChargeAmount: serviceChargeAmount,
      paymentSlip: paymentSlip || undefined,
      splits: checkoutMode === 'SPLIT' ? posSplits : undefined
    };

    onOrderCompleted(newOrder, updatedIngredients);
    if (isOffline) {
      alert(`⚠️ บันทึกออฟไลน์สำเร็จ (Offline Mode)!\nบิลเลขที่ ${newOrder.id} ได้รับการบันทึกเข้าสู่หน่วยความจำเครื่องเรียบร้อยแล้ว\nระบบจะทำการอัปโหลดซิงค์ข้อมูลขึ้นคลาวด์โดยอัตโนมัติเมื่อสัญญาณเน็ตฟื้นคืนกลับมา`);
    }

    // Do not pop up receipt preview automatically if disabled (default false)
    if (storeSettings?.showReceiptPreview === true) {
      setShowReceipt(newOrder);
    } else {
      setLastCompletedOrderToast(newOrder);
      setTimeout(() => {
        setLastCompletedOrderToast(prev => (prev?.id === newOrder.id ? null : prev));
      }, 6000);
    }

    setCart([]);
    setActiveDiscount(null);
    setManualDiscount(0);
    setCheckoutMode('NONE');
    setCashReceived('');
    setPaymentSlip('');
  };

  // Load CRM Customers for auto-fill in Tax Invoice
  const [crmCustomers, setCrmCustomers] = useState<Customer[]>([]);
  useEffect(() => {
    try {
      const saved = localStorage.getItem('kp_customers');
      if (saved) {
        setCrmCustomers(JSON.parse(saved));
      }
    } catch (e) {
      console.error(e);
    }
  }, [showTaxInvoiceForm]);

  // Handle issuing Full Tax Invoice
  const handleIssueTaxInvoice = () => {
    if (!taxCustName.trim()) {
      alert('กรุณากรอกชื่อลูกค้า/ชื่อบริษัทผู้ซื้อ');
      return;
    }
    if (!taxCustTaxId.trim() || taxCustTaxId.trim().length !== 13) {
      alert('กรุณากรอกเลขประจำตัวผู้เสียภาษีอากรให้ถูกต้อง (13 หลัก)');
      return;
    }
    if (!taxCustAddress.trim()) {
      alert('กรุณากรอกที่อยู่ผู้เสียภาษี');
      return;
    }

    const cleanInvoiceNo = `TAX-${showReceipt!.id.replace('TX-', '').toUpperCase()}`;
    const taxInvoiceData = {
      invoiceNo: cleanInvoiceNo,
      customerName: taxCustName.trim(),
      customerTaxId: taxCustTaxId.trim(),
      customerAddress: taxCustAddress.trim(),
      customerBranch: taxCustBranch.trim() || 'สำนักงานใหญ่',
      issuedAt: new Date().toISOString()
    };

    const updatedOrders = (orders || []).map(o => {
      if (o.id === showReceipt!.id) {
        const updatedOrder = { ...o, taxInvoice: taxInvoiceData };
        // Update local receipt state to reflect immediately
        setShowReceipt(updatedOrder);
        return updatedOrder;
      }
      return o;
    });

    if (onUpdateOrders) {
      onUpdateOrders(updatedOrders);
    }

    // Automatically register the tax invoice event in audit logs
    try {
      const savedLogs = localStorage.getItem('kp_auditLogs');
      const auditLogs = savedLogs ? JSON.parse(savedLogs) : [];
      const newLog = {
        id: `audit-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date().toISOString(),
        user: currentUser.name,
        username: currentUser.username,
        role: currentUser.role,
        actionType: 'SYSTEM_UPDATE',
        details: `ออกใบกำกับภาษีเต็มรูปแบบ เลขที่ ${cleanInvoiceNo} สำหรับบิล ${showReceipt!.id} ให้แก่ ${taxInvoiceData.customerName}`
      };
      localStorage.setItem('kp_auditLogs', JSON.stringify([newLog, ...auditLogs]));
    } catch (err) {
      console.error("Failed to append audit log for tax invoice:", err);
    }

    setShowTaxInvoiceForm(false);
    setInvoiceViewMode('FULL');
    alert(`ออกใบกำกับภาษีเต็มรูปแบบสำเร็จ!\nเลขที่เอกสาร: ${cleanInvoiceNo}`);
  };

  // Slip uploader reuseable block
  const renderSlipUploader = () => {
    return (
      <div className="w-full bg-[#0f172a] border border-[#1e293b]/70 p-3 rounded-xl space-y-2 text-center mt-3 mb-2">
        <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wide">
          แนบหลักฐานการชำระเงิน (Transfer Slip)
        </span>
        {paymentSlip ? (
          <div className="relative">
            <img 
              src={paymentSlip} 
              alt="สลิปโอนเงิน" 
              className="w-full h-32 object-contain rounded-lg border border-[#1e293b] bg-slate-950" 
              referrerPolicy="no-referrer"
            />
            <button
              type="button"
              onClick={() => setPaymentSlip('')}
              className="absolute -top-1.5 -right-1.5 bg-red-600 hover:bg-red-500 text-white rounded-full p-1 shadow transition-all cursor-pointer"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        ) : (
          <div className="relative border border-dashed border-slate-700 hover:border-slate-500 bg-slate-900/40 hover:bg-slate-900/60 rounded-lg p-3 transition-all cursor-pointer flex flex-col items-center justify-center gap-1">
            <input
              type="file"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  const reader = new FileReader();
                  reader.onload = (event) => {
                    if (event.target?.result) {
                      setPaymentSlip(event.target.result as string);
                    }
                  };
                  reader.readAsDataURL(file);
                }
              }}
              className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
            />
            <Upload className="w-5 h-5 text-indigo-400" />
            <span className="text-[10.5px] text-slate-300 font-bold">อัปโหลดสลิปธนาคาร</span>
            <span className="text-[9px] text-slate-500">แตะเพื่อเลือกรูปภาพหลักฐาน</span>
          </div>
        )}
      </div>
    );
  };

  // Render PromptPay QR
  const renderPromptPayQR = () => {
    const rawId = storeSettings?.promptpayId || '081-123-4567';
    const cleanPromptPayId = rawId.replace(/[^0-9]/g, '') || '0811234567';
    const qrCodeUrl = total > 0 
      ? `https://promptpay.io/${cleanPromptPayId}/${total}.png`
      : `https://promptpay.io/${cleanPromptPayId}.png`;

    return (
      <div className="flex flex-col items-center bg-slate-900 p-5 rounded-2xl border border-slate-800 shadow-2xl max-w-sm mx-auto text-slate-100">
        <div className="w-full flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
          <div className="flex items-center gap-2">
            <div className="bg-[#0369a1] text-white font-bold px-2 py-0.5 rounded text-[11px] tracking-wider">
              Prompt Pay
            </div>
            <span className="text-xs text-slate-300 font-semibold">พร้อมเพย์</span>
          </div>
          <span className="text-xs font-mono font-bold text-slate-500">Merchant QR</span>
        </div>

        {/* Real Scan-able QR Code */}
        <div className="relative p-2.5 bg-white border-2 border-[#0284c7] rounded-2xl mb-4 flex items-center justify-center shadow-lg">
          <div className="w-48 h-48 bg-white flex items-center justify-center relative overflow-hidden">
            <img 
              src={qrCodeUrl}
              alt="Real PromptPay QR Code"
              className="w-full h-full object-contain"
              referrerPolicy="no-referrer"
              onError={(e) => {
                // Fallback QR code structure if external generator is offline
                e.currentTarget.src = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(`promptpay://${cleanPromptPayId}?amount=${total}`)}`;
              }}
            />
          </div>
        </div>

        <div className="text-center space-y-1">
          <p className="text-[11px] text-slate-400 font-medium">ชื่อบัญชี: {storeSettings?.promptpayName || 'ครัวกะเพราโคตรกรอบ บรรทัดทอง'}</p>
          <p className="text-xs text-sky-400 font-mono font-bold">พร้อมเพย์ ID: {storeSettings?.promptpayId || '081-123-4567'}</p>
          <p className="text-2xl font-black text-white mt-1 tracking-tight">
            {total.toLocaleString()}<span className="text-base font-medium ml-0.5">฿</span>
          </p>
        </div>

        {renderSlipUploader()}

        <div className="w-full mt-4 flex gap-2">
          <button
            onClick={() => setCheckoutMode('NONE')}
            className="flex-1 py-2 bg-slate-800 hover:bg-slate-750 text-slate-300 rounded-xl text-xs font-semibold transition-all"
          >
            ย้อนกลับ
          </button>
          <button
            onClick={() => triggerProceedShakeAndVibrate('btn-complete-promptpay', handleCompleteOrder)}
            className={`flex-1 py-2 bg-[#0284c7] hover:bg-[#0369a1] text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1 shadow-md shadow-sky-950/20 ${shakeButton === 'btn-complete-promptpay' ? 'shake-active' : ''}`}
          >
            <Check className="w-4 h-4" /> ชำระเงินสำเร็จ
          </button>
        </div>
      </div>
    );
  };

  // Render Bank Transfer UI
  const renderBankTransfer = () => {
    return (
      <div className="flex flex-col items-center bg-slate-900 p-5 rounded-2xl border border-slate-800 shadow-2xl max-w-sm mx-auto text-slate-100">
        <div className="w-full flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
          <div className="flex items-center gap-2">
            <div className="bg-indigo-600 text-white font-bold px-2 py-0.5 rounded text-[11px] tracking-wider">
              BANK TRANSFER
            </div>
            <span className="text-xs text-slate-300 font-semibold">โอนเงินผ่านธนาคาร</span>
          </div>
          <span className="text-xs font-mono font-bold text-slate-500">K-Bank Account</span>
        </div>

        <div className="bg-[#0f172a] border border-[#1e293b] p-4 rounded-xl w-full text-center space-y-3 mb-4">
          <div className="w-12 h-12 bg-indigo-600 text-white font-black rounded-2xl flex items-center justify-center text-xs mx-auto shadow-md">
            KBANK
          </div>
          <div className="space-y-1">
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wide">ธนาคารกสิกรไทย</span>
            <p className="text-sm text-slate-200 font-black tracking-wider font-mono">123-4-56789-0</p>
            <p className="text-xs text-indigo-400 font-semibold">ชื่อบัญชี: บจก. ครัวกะเพราโคตรกรอบ</p>
          </div>
        </div>

        <div className="text-center space-y-1">
          <p className="text-[11px] text-slate-400 font-medium">กรุณาแสดงหลักฐานการโอนเงิน (สลิป) ให้แคชเชียร์ตรวจสอบ</p>
          <p className="text-2xl font-black text-white mt-1 tracking-tight">
            {total.toLocaleString()}<span className="text-base font-medium ml-0.5">฿</span>
          </p>
        </div>

        {renderSlipUploader()}

        <div className="w-full mt-4 flex gap-2">
          <button
            onClick={() => setCheckoutMode('NONE')}
            className="flex-1 py-2 bg-slate-800 hover:bg-slate-750 text-slate-300 rounded-xl text-xs font-semibold transition-all"
          >
            ย้อนกลับ
          </button>
          <button
            onClick={() => triggerProceedShakeAndVibrate('btn-complete-transfer', handleCompleteOrder)}
            className={`flex-1 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1 shadow-md ${shakeButton === 'btn-complete-transfer' ? 'shake-active' : ''}`}
          >
            <Check className="w-4 h-4" /> ตรวจสอบสลิป & เสร็จสิ้น
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-12 gap-4 lg:gap-6 items-start bg-[#0B131E] min-h-screen p-1.5 sm:p-3 rounded-3xl border border-[#142235]">
      
      {/* 1. UPPER INTEGRATED POS BRAND HEADER */}
      <div className="md:col-span-12 flex flex-col lg:flex-row justify-between items-start lg:items-center p-4 bg-[#0F1D30] rounded-2xl border border-[#1A2C42] gap-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2.5 bg-red-600 rounded-xl text-white shadow-lg shadow-red-950/40">
            <ShoppingCart className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h2 className="text-lg font-black tracking-tight text-white flex items-center gap-2 uppercase">
              KAPRAO POS 
              <span className="text-[9px] bg-[#1A2C42] text-red-500 font-mono font-black py-0.5 px-1.5 rounded border border-red-900/30">
                OFFLINE SYNC
              </span>
            </h2>
            <p className="text-[10.5px] text-slate-400 font-medium mt-0.5">ระบบจัดการหน้าร้านอัจฉริยะ สาขาหลัก • เข้าสู่ระบบโดย: <span className="text-slate-200 font-bold">{currentUser.name} ({currentUser.role})</span></p>
          </div>
        </div>

        {/* Real-time sync signals and toggling simulator */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Status Indicator */}
          <div className="flex items-center gap-2 bg-[#0B131E] px-3.5 py-2 rounded-xl border border-[#1A2C42]">
            <span className={`w-2.5 h-2.5 rounded-full inline-block ${isOffline ? 'bg-amber-500 animate-pulse' : 'bg-green-500 animate-ping'}`} />
            <span className="text-xs font-bold text-slate-300">
              {isOffline ? 'สถานะ: โหมดจำลองออฟไลน์' : 'สถานะ: เชื่อมต่อคลาวด์แล้ว'}
            </span>
          </div>

          {/* Connection Simulator toggle */}
          <button
            onClick={() => onToggleSimulateOffline && onToggleSimulateOffline()}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              isOffline
                ? 'bg-amber-600/15 text-amber-400 border border-amber-800/40 hover:bg-amber-600/25'
                : 'bg-emerald-600/15 text-emerald-400 border border-emerald-800/40 hover:bg-emerald-600/25'
            }`}
          >
            {isOffline ? <WifiOff className="w-3.5 h-3.5 text-rose-500" /> : <Wifi className="w-3.5 h-3.5 text-emerald-500" />}
            <span>{isOffline ? 'จำลอง ทำงานออนไลน์' : 'จำลอง ออฟไลน์ (Offline Mode)'}</span>
          </button>

          {/* Manual Sync Button if offline orders are pending */}
          {orders.some(o => !o.synced) && (
            <button
              onClick={onSyncOffline}
              disabled={syncingOffline || isOffline}
              title={isOffline ? "กรุณาต่อเน็ตเพื่อซิงค์ข้อมูล" : "ซิงค์ออเดอร์ค้างสะสมขึ้นระบบทันที"}
              className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                isOffline
                  ? 'bg-slate-900 text-slate-500 border border-slate-850 cursor-not-allowed opacity-40'
                  : 'bg-amber-600 hover:bg-amber-500 text-white border border-amber-500 hover:scale-102 active:scale-98'
              }`}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${syncingOffline ? 'animate-spin' : ''}`} />
              <span>ซิงค์ขึ้นเซิร์ฟเวอร์ ({orders.filter(o => !o.synced).length} บิล)</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. DUAL LARGE LAYOUT SELECTION TABS (From user screenshot) */}
      <div className="md:col-span-12 grid grid-cols-2 gap-3 md:hidden">
        <button
          onClick={() => setActivePosTab('menu')}
          className={`py-3.5 px-5 rounded-2xl font-black text-sm tracking-tight text-center transition-all ${
            activePosTab === 'menu'
              ? 'bg-[#D9383A] text-white shadow-lg shadow-red-950/20 scale-[1.02]'
              : 'bg-[#0F1D30] text-slate-400 border border-[#1A2C42] hover:text-slate-200'
          }`}
        >
          เลือกเมนูอาหาร
        </button>
        <button
          onClick={() => setActivePosTab('cart')}
          className={`py-3.5 px-5 rounded-2xl font-black text-sm tracking-tight text-center transition-all flex items-center justify-center gap-2 ${
            activePosTab === 'cart'
              ? 'bg-[#D9383A] text-white shadow-lg shadow-red-950/20 scale-[1.02]'
              : 'bg-[#0F1D30] text-slate-400 border border-[#1A2C42] hover:text-slate-200'
          }`}
        >
          <span>ตะกร้า</span>
          <span className="px-2 py-0.5 text-xs bg-black/40 text-red-400 font-bold font-mono rounded-full">
            {cart.reduce((sum, item) => sum + item.quantity, 0)}
          </span>
        </button>
      </div>

      {/* LEFT COLUMN: Menu items & Categories (7 cols in desktop) */}
      <div className={`md:col-span-7 space-y-5 ${activePosTab === 'menu' ? 'block' : 'hidden md:block'}`}>
        
        {/* Search bar inside the dark blue widget box */}
        <div className="bg-[#0F1D30] border border-[#1A2C42] p-4 rounded-2xl space-y-4">
          
          {/* A. Search Input */}
          <div className="relative flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-500" />
              <input
                type="text"
                placeholder="ค้นหาเมนูกะเพรา / เครื่องดื่ม..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-[#0B131E] border border-[#1E2E42] text-white rounded-xl py-3 pl-11 pr-4 text-xs font-semibold focus:outline-none focus:border-red-500 transition-colors"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 p-0.5 hover:bg-slate-800 rounded-full text-slate-400 hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Quick Add Button with Keyboard shortcut indicator */}
            <button
              type="button"
              onClick={() => {
                setShowQuickAddModal(true);
                setQuickAddSearchTerm('');
                setQuickAddSelectedIndex(0);
                setQuickAddAddEgg(false);
              }}
              className="bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 px-3 py-2 rounded-xl text-[11px] font-black flex items-center gap-1.5 transition-all shadow cursor-pointer whitespace-nowrap"
              title="ค้นหาและเพิ่มรายการด่วนด้วยแป้นพิมพ์ [F2]"
            >
              <span className="text-amber-500 font-extrabold animate-pulse">⚡</span>
              <span>ค้นหาด่วน [F2]</span>
            </button>
          </div>



          {/* B. Sub-search Row of Action shortcuts */}
          <div className="grid grid-cols-4 gap-1.5">
            {/* Table Trigger */}
            <div className="relative">
              <button
                onClick={() => setShowTableSelector(!showTableSelector)}
                className="w-full py-2.5 px-3 bg-[#0B131E] hover:bg-red-950/15 text-slate-300 hover:text-red-400 border border-[#1E2E42] hover:border-red-900/40 rounded-xl text-[11px] font-extrabold flex items-center justify-center gap-1.5 transition-all truncate"
                title={`ระบุ: ${tableNo === 'TakeAway' ? 'กลับบ้าน' : tableNo}`}
              >
                <Users className="w-3.5 h-3.5 text-red-500 shrink-0" />
                <span className="truncate">โต๊ะ/ชื่อ {tableNo === 'TakeAway' ? 'กลับบ้าน' : tableNo}</span>
              </button>

              {/* Grid dropdown of tables */}
              {showTableSelector && (
                <div className="absolute left-0 mt-2 w-56 bg-[#0F1D30] border border-[#1A2C42] p-3 rounded-2xl shadow-2xl z-40 space-y-3">
                  <span className="block text-[10px] font-black uppercase text-slate-500 tracking-wider">เลือกเลขโต๊ะนั่งกิน</span>
                  <div className="grid grid-cols-4 gap-1">
                    {Array.from({ length: 15 }).map((_, i) => {
                      const t = String(i + 1);
                      return (
                        <button
                          key={t}
                          onClick={() => {
                            setTableNo(t);
                            setShowTableSelector(false);
                          }}
                          className={`py-1 rounded-lg text-xs font-bold font-mono transition-colors ${
                            tableNo === t
                              ? 'bg-red-600 text-white'
                              : 'bg-[#0B131E] hover:bg-slate-800 text-slate-400 hover:text-white'
                          }`}
                        >
                          {t}
                        </button>
                      );
                    })}
                  </div>

                  <button
                    onClick={() => {
                      setTableNo('TakeAway');
                      setShowTableSelector(false);
                    }}
                    className="w-full py-1.5 bg-[#0B131E] hover:bg-red-600 text-slate-400 hover:text-white rounded-lg text-[10px] font-bold border border-[#1E2E42] transition-colors"
                  >
                    ทานกลับบ้าน (TakeAway)
                  </button>

                  <div className="pt-2.5 border-t border-[#1E2E42]/60 space-y-1.5">
                    <span className="block text-[10px] font-black uppercase text-slate-400 tracking-wider">ระบุชื่อเล่น / เลขโต๊ะกำหนดเอง</span>
                    <div className="flex gap-1.5">
                      <input
                        type="text"
                        placeholder="เช่น คุณส้ม / โต๊ะ 3-บอล"
                        value={tableNo === 'TakeAway' ? '' : tableNo}
                        onChange={(e) => setTableNo(e.target.value)}
                        className="flex-1 min-w-0 bg-[#0B131E] border border-[#1E2E42] text-white rounded-lg py-1.5 px-2 text-[11px] font-bold focus:outline-none focus:border-red-500 transition-colors"
                      />
                      <button
                        onClick={() => setShowTableSelector(false)}
                        className="bg-red-600 hover:bg-red-500 text-white px-2.5 rounded-lg text-[10px] font-black transition-colors shrink-0"
                      >
                        ยืนยัน
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Take Away Shortcut */}
            <button
              onClick={() => {
                setTableNo('TakeAway');
                setShowTableSelector(false);
                alert('🍔 เลือกช่องทาง: ทานกลับบ้าน (TakeAway) เรียบร้อย');
              }}
              className="py-2.5 px-3 bg-[#0B131E] hover:bg-red-950/15 text-slate-300 hover:text-red-400 border border-[#1E2E42] hover:border-red-900/40 rounded-xl text-[11px] font-extrabold flex items-center justify-center gap-1.5 transition-all"
            >
              <ArrowRight className="w-3.5 h-3.5 text-red-500 rotate-45" />
              <span>กลับบ้าน</span>
            </button>

            {/* Print History / Last Bill Shortcut */}
            <button
              onClick={handleOpenLastBill}
              className="py-2.5 px-3 bg-[#0B131E] hover:bg-red-950/15 text-slate-300 hover:text-red-400 border border-[#1E2E42] hover:border-red-900/40 rounded-xl text-[11px] font-extrabold flex items-center justify-center gap-1.5 transition-all"
              title="บิลพิมพ์ล่าสุด"
            >
              <Clock className="w-3.5 h-3.5 text-red-500 shrink-0" />
              <span className="truncate">บิลล่าสุด</span>
            </button>

            {/* Sales History Shortcut */}
            <button
              onClick={() => setShowSalesHistory(true)}
              className="py-2.5 px-2 bg-[#0B131E] hover:bg-red-950/15 text-slate-300 hover:text-red-400 border border-[#1E2E42] hover:border-red-900/40 rounded-xl text-[11px] font-extrabold flex items-center justify-center gap-1.5 transition-all"
              title="ดูประวัติขายย้อนหลัง 7 วัน บิลซ้ำ ยกเลิกบิล"
            >
              <Receipt className="w-3.5 h-3.5 text-red-500 shrink-0" />
              <span className="truncate">ประวัติ 7 วัน</span>
            </button>
          </div>
        </div>

        {/* 3. CATEGORIES HORIZONTAL PILL LIST */}
        <div 
          className="flex gap-1.5 overflow-x-auto pb-2 scrollbar-none touch-pan-x select-none"
          style={{ WebkitOverflowScrolling: 'touch' }}
        >
          {displayCategories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`py-2.5 px-5 rounded-xl text-xs font-black whitespace-nowrap transition-all duration-200 active:scale-95 cursor-pointer ${
                selectedCategory === cat
                  ? 'bg-[#D9383A] text-white shadow-md shadow-red-950/20 scale-[1.03]'
                  : 'bg-[#0F1D30] text-slate-400 hover:text-slate-200 border border-[#1E2E42]'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* 4. DISHES MENU CARD GRID (Mimics screenshot style - optimized with 2 columns on mobile for iPad/iPhone) */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-3.5">
          {filteredMenuItems.map(item => {
            const recipe = recipes.find(r => r.menuItemId === item.id);
            // Check ingredient stock levels
            let outOfStock = false;
            if (recipe) {
              outOfStock = recipe.ingredients.some(ri => {
                const ing = ingredients.find(i => i.id === ri.ingredientId);
                return ing ? ing.stock < ri.amount : false;
              });
            }

            return (
              <button
                key={item.id}
                disabled={outOfStock}
                onClick={() => openCustomizer(item)}
                className={`group bg-[#0F1D30] border border-[#1A2C42] rounded-2xl overflow-hidden hover:border-red-500/50 hover:shadow-xl hover:shadow-red-950/10 transition-all duration-300 flex flex-col justify-between text-left relative ${
                  outOfStock ? 'opacity-35 cursor-not-allowed' : ''
                }`}
              >
                {/* Image panel - responsive height optimized for mobile screens */}
                <div className="relative h-28 sm:h-36 md:h-28 lg:h-36 xl:h-40 w-full overflow-hidden bg-slate-950 shrink-0">
                  <img 
                    src={item.image} 
                    alt={item.name} 
                    className="w-full h-full object-cover group-hover:scale-105 transition-all duration-500" 
                    referrerPolicy="no-referrer"
                  />
                  
                  {/* Absolute Out of Stock Indicator */}
                  {outOfStock && (
                    <div className="absolute inset-0 bg-slate-950/85 flex flex-col items-center justify-center p-2 text-center z-10">
                      <CircleAlert className="w-6 h-6 text-red-500 mb-1" />
                      <span className="text-[11px] font-black text-red-400 uppercase tracking-wider">วัตถุดิบหมด</span>
                    </div>
                  )}

                  {/* Absolute price badge overlaid in image (Mimics screenshot) */}
                  <div className="absolute top-3 right-3 bg-black/75 backdrop-blur-md px-3 py-1 rounded-xl border border-slate-900 z-10">
                    <span className="font-mono font-black text-[#D9383A] text-xs">฿{item.price}</span>
                  </div>

                  {/* Absolute text gradient overlay inside image bottom */}
                  <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black via-black/50 to-transparent p-3 pt-8 flex flex-col justify-end z-10">
                    <h4 className="text-xs font-bold text-white line-clamp-2 leading-relaxed">
                      {item.name}
                    </h4>
                    <span className="text-[9px] text-slate-400 uppercase tracking-widest font-bold mt-1">
                      {item.category}
                    </span>
                  </div>
                </div>
              </button>
            );
          })}

          {filteredMenuItems.length === 0 && (
            <div className="col-span-full py-16 text-center text-slate-500 bg-[#0F1D30] border border-[#1A2C42] rounded-2xl">
              <CircleAlert className="w-8 h-8 text-slate-700 mx-auto mb-2" />
              <p className="text-xs font-bold">ไม่พบเมนูที่คุณกำลังค้นหา</p>
              <p className="text-[10px] text-slate-600 mt-1">ลองเปลี่ยนคำค้นหา หรือเปลี่ยนหมวดหมู่ใหม่</p>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Cart Backdrop */}
      {activePosTab === 'cart' && (
        <div 
          className="fixed inset-0 bg-black/80 backdrop-blur-xs z-40 md:hidden animate-in fade-in duration-100"
          onClick={() => setActivePosTab('menu')}
        />
      )}

      {/* RIGHT COLUMN: Cart summary, pricing & checkout (5 cols in desktop) */}
      <div className={`
        md:col-span-5 space-y-6 
        fixed md:relative bottom-0 left-0 right-0 z-50 md:z-auto
        bg-[#0F1D30] md:bg-transparent
        max-h-[88vh] md:max-h-none overflow-y-auto
        rounded-t-[2rem] md:rounded-t-none
        border-t border-[#1A2C42] md:border-t-0
        transition-all duration-200 ease-out shadow-2xl
        ${activePosTab === 'cart' 
          ? 'translate-y-0 opacity-100 pointer-events-auto' 
          : 'translate-y-full md:translate-y-0 opacity-0 md:opacity-100 pointer-events-none md:pointer-events-auto'
        }
      `}>
        <div className="bg-[#0F1D30] border border-[#1A2C42] md:rounded-2xl shadow-xl flex flex-col overflow-hidden h-full md:h-auto pb-6 md:pb-0">
          
          {/* Mobile Sheet Drag Handle */}
          <div className="flex justify-center py-2.5 md:hidden">
            <div 
              onClick={() => setActivePosTab('menu')}
              className="w-14 h-1.5 bg-slate-700/80 rounded-full hover:bg-slate-500 active:scale-95 transition-all cursor-pointer" 
            />
          </div>

          {/* Cart Header */}
          <div className="p-4 bg-black/20 border-b border-[#1A2C42] flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <ShoppingCart className="w-5 h-5 text-red-500" />
              <div>
                <h4 className="font-extrabold text-white text-sm">
                  บิลโต๊ะ: {tableNo === 'TakeAway' ? 'กลับบ้าน (TakeAway)' : `โต๊ะนั่ง ${tableNo}`}
                </h4>
                <p className="text-[10px] text-slate-400">ผู้รับจดรายการ: {currentUser.name}</p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              {/* Recall Parked Orders button */}
              <button 
                onClick={() => setShowRecallModal(true)}
                className={`p-1.5 rounded-xl transition-all text-[11px] flex items-center gap-1 font-extrabold relative ${
                  parkedOrders.length > 0 
                    ? 'text-sky-400 hover:text-sky-300 hover:bg-sky-950/25' 
                    : 'text-slate-500 hover:text-slate-450'
                }`}
                title="ออเดอร์ที่พัก/จอดไว้เพื่อเรียกจ่ายเงินทีหลัง"
              >
                <Clock className="w-3.5 h-3.5 text-sky-400" />
                <span>คิวพัก ({parkedOrders.length})</span>
                {parkedOrders.length > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse" />
                )}
              </button>

              {/* Park active order */}
              {cart.length > 0 && (
                <button 
                  onClick={handleParkOrder}
                  className="text-amber-500 hover:text-amber-400 p-1.5 rounded-xl hover:bg-amber-950/20 transition-all text-[11px] flex items-center gap-1 font-extrabold"
                  title="พักบิลโต๊ะนี้ไปจอดไว้เพื่อคิดเงินทีหลัง"
                >
                  <Upload className="w-3.5 h-3.5 text-amber-500" />
                  <span>พักบิล</span>
                </button>
              )}

              {/* Void Cart CTA */}
              {cart.length > 0 && (
                <button 
                  onClick={handleCancelBill}
                  className="text-slate-500 hover:text-red-400 p-1.5 rounded-xl hover:bg-red-950/20 transition-all text-[11px] flex items-center gap-1 font-extrabold"
                  title="ล้างตะกร้าอาหารทั้งหมด"
                >
                  <Trash2 className="w-3.5 h-3.5 text-slate-500" /> 
                  <span>ล้าง</span>
                </button>
              )}

              {/* Mobile Close Button */}
              <button
                onClick={() => setActivePosTab('menu')}
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl md:hidden"
                aria-label="Close cart drawer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Cart items list */}
          <div className="p-4 divide-y divide-[#1E2E42]/60 max-h-[340px] overflow-y-auto space-y-3 min-h-[180px]">
            {cart.length === 0 ? (
              <div className="py-14 flex flex-col items-center justify-center text-slate-500 text-center">
                <ShoppingCart className="w-10 h-10 text-slate-800 mb-2.5" />
                <p className="text-xs font-bold text-slate-400">ยังไม่มีอาหารในตะกร้าของบิลนี้</p>
                <p className="text-[10px] text-slate-600 mt-1">เลือกรายการกะเพรา หรือเครื่องดื่มด้านซ้ายเพื่อสั่งซื้อ</p>
              </div>
            ) : (
              cart.map(item => (
                <div key={item.id} className="pt-3 first:pt-0 flex justify-between items-start gap-3">
                  <div className="space-y-1.5 flex-1">
                    <h5 className="text-xs font-bold text-white leading-relaxed">{item.name}</h5>
                    
                    {/* Modifiers List */}
                    <div className="flex flex-wrap gap-1">
                      {item.addFriedEgg && (
                        <span className="px-1.5 py-0.5 rounded bg-amber-950/40 text-amber-500 border border-amber-900/30 text-[9px] font-bold">
                          + เพิ่มไข่ดาวกรอบ (+10฿)
                        </span>
                      )}
                      {item.notes && (
                        <span className="px-1.5 py-0.5 rounded bg-slate-950 text-slate-400 border border-slate-800 text-[9px] font-medium italic">
                          *{item.notes}
                        </span>
                      )}
                    </div>

                    <span className="block text-[11px] font-mono font-bold text-slate-400">
                      ฿{(item.price + item.eggPrice)} x {item.quantity} ชิ้น
                    </span>
                  </div>

                  {/* Cart Item counter controls */}
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1.5 bg-[#0B131E] border border-[#1A2C42] rounded-lg p-1 shrink-0">
                      <button 
                        onClick={() => handleUpdateQty(item.id, -1)}
                        className="p-1 hover:bg-slate-900 rounded text-slate-400 hover:text-white transition-all"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="text-xs font-mono font-black text-white px-1.5">{item.quantity}</span>
                      <button 
                        onClick={() => handleUpdateQty(item.id, 1)}
                        className="p-1 hover:bg-slate-900 rounded text-slate-400 hover:text-white transition-all"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>

                    <button 
                      onClick={() => handleRemoveItem(item.id)}
                      className="text-slate-500 hover:text-red-400 p-1.5 rounded-lg hover:bg-red-950/20 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Pricing panel calculations */}
          <div className="p-4 bg-[#0B131E]/60 border-t border-[#1A2C42] text-xs space-y-2.5">
            <div className="flex justify-between text-slate-400">
              <span>ยอดสั่งซื้ออาหารสับสะสม</span>
              <span className="font-mono font-bold text-slate-300">฿{subtotal.toLocaleString()}</span>
            </div>

            {/* Promo code application box */}
            <div className="flex items-center gap-2 py-1">
              <input
                type="text"
                placeholder="ป้อนรหัสส่วนลดโปรโมชั่น"
                value={promoCode}
                onChange={(e) => setPromoCode(e.target.value)}
                className="flex-1 bg-[#0F1D30] border border-[#1A2C42] text-white rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-red-500"
              />
              <button 
                onClick={handleApplyPromo}
                className="bg-slate-800 hover:bg-slate-750 text-slate-200 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all border border-[#1A2C42]"
              >
                บันทึกโค้ด
              </button>
            </div>

            {activeDiscount && (
              <div className="flex justify-between text-emerald-400 font-bold">
                <span>ส่วนลดจากคูปอง ({activeDiscount.code})</span>
                <span className="font-mono">- ฿{promoDiscountAmt.toLocaleString()}</span>
              </div>
            )}

            {/* RBAC Restricted Manual Discount overrides */}
            <div className="flex items-center justify-between py-1 border-t border-[#1E2E42]/60">
              <div className="flex items-center gap-1 text-slate-400">
                <span>ส่วนลดส่วนลดสด (ผู้จัดการระบุ)</span>
                {!isManagerOrAdmin && <Lock className="w-3 h-3 text-red-500" title="จำกัดสิทธิ์เฉพาะ แอดมิน/ผู้จัดการ เท่านั้น" />}
              </div>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  min="0"
                  disabled={!isManagerOrAdmin}
                  value={manualDiscount || ''}
                  onChange={(e) => setManualDiscount(Math.max(0, parseInt(e.target.value) || 0))}
                  placeholder={!isManagerOrAdmin ? "สิทธิ์ไม่ถึง" : "กรอก THB"}
                  className={`w-24 bg-[#0F1D30] border border-[#1A2C42] text-white text-right rounded-lg px-2.5 py-1 text-xs font-mono font-bold focus:outline-none focus:border-red-500 ${
                    !isManagerOrAdmin ? 'cursor-not-allowed text-red-400 bg-[#0F1D30]/40 font-semibold' : ''
                  }`}
                />
              </div>
            </div>

            {serviceChargeAmount > 0 && (
              <div className="flex justify-between text-slate-400 text-[11px]">
                <span>ค่าบริการ Service Charge {serviceChargeRate}%</span>
                <span className="font-mono">฿{serviceChargeAmount.toLocaleString()}</span>
              </div>
            )}

            <div className="flex justify-between text-slate-500 text-[10px]">
              <span>ภาษีมูลค่าเพิ่ม VAT {taxRate}% ({vatType === 'INCLUSIVE' ? 'รวมในราคาสินค้าแล้ว' : 'บวกแยกต่างหาก'})</span>
              <span className="font-mono">฿{vatAmount.toLocaleString()}</span>
            </div>

            <div className="flex justify-between text-white font-extrabold text-base border-t border-[#1A2C42] pt-3">
              <span>ยอดจ่ายสุทธิบิลนี้</span>
              <span className="font-mono text-red-500 text-lg">฿{total.toLocaleString()}</span>
            </div>
          </div>

          {/* Payment execution CTAs */}
          <div className="p-4 bg-[#0B131E] border-t border-[#1A2C42]">
            {checkoutMode === 'NONE' ? (
              <div className="space-y-2">
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => triggerProceedShakeAndVibrate('btn-checkout-CASH', () => handleCheckout('CASH'))}
                    disabled={cart.length === 0}
                    className={`py-3 bg-slate-900 hover:bg-slate-850 border border-slate-800 disabled:opacity-40 text-slate-200 font-bold rounded-xl text-[10px] sm:text-xs flex flex-col sm:flex-row items-center justify-center gap-1.5 transition-all shadow ${shakeButton === 'btn-checkout-CASH' ? 'shake-active' : ''}`}
                  >
                    <DollarSign className="w-3.5 h-3.5 text-emerald-500" /> เงินสด
                  </button>
                  <button
                    onClick={() => triggerProceedShakeAndVibrate('btn-checkout-PROMPTPAY', () => handleCheckout('PROMPTPAY'))}
                    disabled={cart.length === 0}
                    className={`py-3 bg-sky-950/80 hover:bg-sky-900/80 border border-sky-900/30 disabled:opacity-40 text-sky-200 font-bold rounded-xl text-[10px] sm:text-xs flex flex-col sm:flex-row items-center justify-center gap-1.5 transition-all shadow ${shakeButton === 'btn-checkout-PROMPTPAY' ? 'shake-active' : ''}`}
                  >
                    <QrCode className="w-3.5 h-3.5 text-sky-400" /> พร้อมเพย์
                  </button>
                  <button
                    onClick={() => triggerProceedShakeAndVibrate('btn-checkout-TRANSFER', () => handleCheckout('TRANSFER'))}
                    disabled={cart.length === 0}
                    className={`py-3 bg-indigo-950/80 hover:bg-indigo-900/80 border border-indigo-900/30 disabled:opacity-40 text-indigo-200 font-bold rounded-xl text-[10px] sm:text-xs flex flex-col sm:flex-row items-center justify-center gap-1.5 transition-all shadow ${shakeButton === 'btn-checkout-TRANSFER' ? 'shake-active' : ''}`}
                  >
                    <CreditCard className="w-3.5 h-3.5 text-indigo-400" /> โอนเงิน
                  </button>
                </div>
                <button
                  onClick={() => handleCheckout('SPLIT')}
                  disabled={cart.length === 0}
                  className="w-full py-2.5 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 disabled:opacity-40 text-white font-extrabold rounded-xl text-[11px] flex items-center justify-center gap-2 transition-all shadow-md active:scale-95"
                >
                  <span>📊 แยกจ่ายค่าอาหาร (Split Bill Checkout)</span>
                </button>
              </div>
            ) : checkoutMode === 'CASH' ? (
              (() => {
                const numReceived = parseFloat(cashReceived) || 0;
                const change = Math.max(0, numReceived - total);
                const isUnderpaid = cashReceived !== '' && numReceived < total;
                const changeRemaining = total - numReceived;

                // Smart cash suggestions helper
                const suggestions = (() => {
                  const amt = total;
                  const list = [amt];
                  const near10 = Math.ceil(amt / 10) * 10;
                  if (near10 > amt) list.push(near10);
                  const near50 = Math.ceil(amt / 50) * 50;
                  if (near50 > amt) list.push(near50);
                  const near100 = Math.ceil(amt / 100) * 100;
                  if (near100 > amt) list.push(near100);
                  
                  [100, 500, 1000].forEach(val => {
                    if (val > amt) list.push(val);
                  });
                  return Array.from(new Set(list)).sort((a, b) => a - b).slice(0, 5);
                })();

                // Change denomination breakdown helper
                const getChangeBreakdown = (chgAmt: number) => {
                  if (chgAmt <= 0) return [];
                  const denoms = [
                    { label: 'ธนบัตร 1,000 บาท', value: 1000, img: '💵' },
                    { label: 'ธนบัตร 500 บาท', value: 500, img: '💵' },
                    { label: 'ธนบัตร 100 บาท', value: 100, img: '💵' },
                    { label: 'ธนบัตร 50 บาท', value: 50, img: '💵' },
                    { label: 'ธนบัตร 20 บาท', value: 20, img: '💵' },
                    { label: 'เหรียญ 10 บาท', value: 10, img: '🪙' },
                    { label: 'เหรียญ 5 บาท', value: 5, img: '🪙' },
                    { label: 'เหรียญ 2 บาท', value: 2, img: '🪙' },
                    { label: 'เหรียญ 1 บาท', value: 1, img: '🪙' }
                  ];
                  let rem = chgAmt;
                  const breakdown = [];
                  for (const d of denoms) {
                    if (rem >= d.value) {
                      const count = Math.floor(rem / d.value);
                      rem = rem % d.value;
                      breakdown.push({ ...d, count });
                    }
                  }
                  return breakdown;
                };

                const breakdownList = getChangeBreakdown(change);

                return (
                  <div className="space-y-4 text-xs animate-in fade-in duration-200" id="cash-payment-channel">
                    {/* Header */}
                    <div className="flex items-center justify-between border-b border-[#1A2C42] pb-2">
                      <span className="font-extrabold text-slate-200 flex items-center gap-1.5">
                        <DollarSign className="w-4 h-4 text-emerald-500" /> ช่องชำระเงินสด (Cashier Channel)
                      </span>
                      <span className="text-[10px] font-mono text-slate-500">POS Cash Register</span>
                    </div>

                    {/* Order Total Highlight */}
                    <div className="bg-[#0B131E] p-3 rounded-xl border border-[#1A2C42] flex justify-between items-center shadow-inner">
                      <span className="text-slate-400 font-bold">ยอดที่ต้องชำระทั้งหมด:</span>
                      <span className="font-mono text-lg font-black text-red-500">฿{total.toLocaleString()}</span>
                    </div>

                    {/* Unified Quick Pay / Banknotes Section */}
                    <div className="space-y-3 bg-[#0B131E] p-3 rounded-2xl border border-[#1A2C42]">
                      <div className="flex items-center justify-between">
                        <span className="block text-[10px] font-black text-slate-300 uppercase tracking-wider">
                          ทางลัดนับเงินสดด่วน (Quick Cash Shortcuts)
                        </span>
                        
                        {/* Interactive toggle between Set and Add modes */}
                        <div className="flex bg-[#0F1D30] border border-[#1A2C42] rounded-lg p-0.5 shrink-0 text-[10px] font-bold select-none">
                          <button
                            type="button"
                            onClick={() => setCashDenomMode('SET')}
                            className={`px-2 py-0.5 rounded-md transition-all cursor-pointer ${
                              cashDenomMode === 'SET'
                                ? 'bg-amber-500 text-slate-950 font-black'
                                : 'text-slate-400 hover:text-white'
                            }`}
                          >
                            แทนที่ค่า
                          </button>
                          <button
                            type="button"
                            onClick={() => setCashDenomMode('ADD')}
                            className={`px-2 py-0.5 rounded-md transition-all cursor-pointer ${
                              cashDenomMode === 'ADD'
                                ? 'bg-amber-500 text-slate-950 font-black'
                                : 'text-slate-400 hover:text-white'
                            }`}
                          >
                            บวกสะสม (+)
                          </button>
                        </div>
                      </div>

                      {/* Banknote grid - 6 columns containing 'Exact' + standard banknotes */}
                      <div className="grid grid-cols-6 gap-1">
                        {[
                          { val: 'EXACT', color: 'border-amber-500/40 bg-amber-950/25 text-amber-400 hover:bg-amber-950/45', label: 'พอดี', img: '🎯' },
                          { val: 20, color: 'border-emerald-500/40 bg-emerald-950/25 text-emerald-400 hover:bg-emerald-950/45', label: '20 ฿', img: '💵' },
                          { val: 50, color: 'border-sky-500/40 bg-sky-950/25 text-sky-400 hover:bg-sky-950/45', label: '50 ฿', img: '💵' },
                          { val: 100, color: 'border-rose-500/40 bg-rose-950/25 text-rose-400 hover:bg-rose-950/45', label: '100 ฿', img: '💵' },
                          { val: 500, color: 'border-purple-500/40 bg-purple-950/25 text-purple-400 hover:bg-purple-950/45', label: '500 ฿', img: '💵' },
                          { val: 1000, color: 'border-amber-500/40 bg-amber-950/25 text-amber-400 hover:bg-amber-950/45', label: '1,000 ฿', img: '💵' },
                        ].map(({ val, color, label, img }) => {
                          const currentVal = parseFloat(cashReceived) || 0;
                          const isSelected = val === 'EXACT'
                            ? currentVal === total
                            : (cashDenomMode === 'SET' && currentVal === val);
                          return (
                            <button
                              key={val}
                              type="button"
                              onClick={() => {
                                if (val === 'EXACT') {
                                  setCashReceived(total.toString());
                                } else {
                                  if (cashDenomMode === 'SET') {
                                    setCashReceived(val.toString());
                                  } else {
                                    setCashReceived((currentVal + (val as number)).toString());
                                  }
                                }
                                
                                if (typeof navigator !== 'undefined' && navigator.vibrate) {
                                  navigator.vibrate(30);
                                }
                              }}
                              className={`py-2 px-0.5 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all text-center select-none cursor-pointer hover:scale-[1.03] ${
                                isSelected 
                                  ? 'ring-2 ring-amber-500 scale-[1.05] font-black' 
                                  : ''
                              } ${color}`}
                            >
                              <span className="text-xs">{img}</span>
                              <span className="font-mono font-bold text-[9px] sm:text-[10px] whitespace-nowrap">
                                {val === 'EXACT' ? '' : (cashDenomMode === 'ADD' ? '+' : '')}{label}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Numeric Cash Received Input */}
                    <div className="bg-[#0B131E] p-3.5 rounded-2xl border border-[#1A2C42] space-y-3 shadow-lg">
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-slate-300 font-bold shrink-0">จำนวนเงินสดที่ได้รับ:</span>
                        <div className="relative flex-1">
                          <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center text-slate-500 font-bold text-xs">฿</span>
                          <input
                            type="number"
                            required
                            placeholder="กรอกเงินสด"
                            value={cashReceived}
                            onChange={(e) => setCashReceived(e.target.value)}
                            className="w-full bg-[#0F1D30] border border-[#1A2C42] text-white rounded-xl py-2 pl-7 pr-3 text-sm font-mono font-black text-right focus:outline-none focus:border-emerald-500"
                          />
                        </div>
                      </div>

                      {/* Cashier Touch Pad Layout */}
                      <div className="grid grid-cols-4 gap-1">
                        {['7', '8', '9', '⌫', '4', '5', '6', 'C', '1', '2', '3', '00', '0', '.', 'พอดี'].map(key => {
                          const isSpecial = ['⌫', 'C', 'พอดี'].includes(key);
                          return (
                            <button
                              key={key}
                              type="button"
                              onClick={() => {
                                if (key === 'C') {
                                  setCashReceived('');
                                } else if (key === '⌫') {
                                  setCashReceived(prev => prev.slice(0, -1));
                                } else if (key === 'พอดี') {
                                  setCashReceived(total.toString());
                                } else if (key === '.') {
                                  if (!cashReceived.includes('.')) {
                                    setCashReceived(prev => (prev === '' ? '0.' : prev + '.'));
                                  }
                                } else {
                                  if (cashReceived === '0') {
                                    setCashReceived(key);
                                  } else {
                                    setCashReceived(prev => prev + key);
                                  }
                                }
                              }}
                              className={`py-2 rounded-xl text-xs font-mono font-black transition-all ${
                                isSpecial
                                  ? key === 'พอดี'
                                    ? 'col-span-1 bg-emerald-950/40 text-emerald-400 hover:bg-emerald-900/30 border border-emerald-900/40'
                                    : 'bg-red-950/20 text-red-400 hover:bg-red-900/20 border border-red-900/30'
                                  : 'bg-[#0F1D30] hover:bg-[#1E2E42] text-slate-300 border border-[#1A2C42]'
                              }`}
                            >
                              {key}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Change Status or Debt Alert Box */}
                    {cashReceived !== '' && (
                      isUnderpaid ? (
                        <div className="flex items-center gap-2 px-3 py-2.5 bg-red-950/20 border border-red-900/40 rounded-xl text-red-400 text-xs">
                          <CircleAlert className="w-4 h-4 shrink-0 text-red-500 animate-pulse" />
                          <div className="flex-1">
                            <span className="font-bold">เงินสดยังไม่ครบ: </span>
                            <span>ขาดอีก </span>
                            <span className="font-mono font-black">฿{changeRemaining.toLocaleString()}</span>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-2.5">
                          {/* Green Change Banner */}
                          <div className="flex justify-between items-center px-4 py-3 text-emerald-400 bg-emerald-950/20 border border-emerald-900/40 rounded-2xl">
                            <div className="flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping shrink-0" />
                              <span className="font-bold">เงินทอนลูกค้า (Change):</span>
                            </div>
                            <span className="font-mono text-xl font-black text-emerald-500">
                              ฿{change.toLocaleString()}
                            </span>
                          </div>

                          {/* Denominations breakdown */}
                          {change > 0 && breakdownList.length > 0 && (
                            <div className="bg-[#0B131E] p-3 rounded-xl border border-[#1A2C42] space-y-2">
                              <span className="block text-[10px] font-black text-slate-400 uppercase tracking-wider">คำแนะนำการทอนเงินย่อย:</span>
                              <div className="grid grid-cols-2 gap-1.5">
                                {breakdownList.map((item, idx) => (
                                  <div key={idx} className="flex items-center justify-between bg-[#0F1D30] border border-[#1A2C42] p-1.5 rounded-lg">
                                    <span className="text-slate-300 flex items-center gap-1.5">
                                      <span>{item.img}</span>
                                      <span className="text-[10px] truncate max-w-[100px]">{item.label}</span>
                                    </span>
                                    <span className="font-mono font-bold text-amber-500 bg-slate-950 px-1.5 py-0.5 rounded text-[10px]">
                                      x {item.count}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )
                    )}

                    {/* Submit and Cancel Buttons */}
                    <div className="grid grid-cols-2 gap-3 pt-1">
                      <button
                        onClick={() => setCheckoutMode('NONE')}
                        className="py-3 bg-slate-800 hover:bg-slate-750 text-slate-400 hover:text-white rounded-xl text-xs font-semibold border border-[#1A2C42] transition-colors"
                      >
                        ย้อนกลับ
                      </button>
                      <button
                        onClick={() => triggerProceedShakeAndVibrate('btn-complete-cash', handleCompleteOrder)}
                        disabled={isUnderpaid || cashReceived === ''}
                        className={`py-3 rounded-xl text-xs font-bold transition-all shadow ${
                          isUnderpaid || cashReceived === ''
                            ? 'bg-slate-800 text-slate-600 border border-slate-900 cursor-not-allowed opacity-50'
                            : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-950/30'
                        } ${shakeButton === 'btn-complete-cash' ? 'shake-active' : ''}`}
                      >
                        ยืนยันรับเงินทอนบิล
                      </button>
                    </div>
                  </div>
                );
              })()
            ) : checkoutMode === 'PROMPTPAY' ? (
              renderPromptPayQR()
            ) : checkoutMode === 'TRANSFER' ? (
              renderBankTransfer()
            ) : (
              /* checkoutMode === 'SPLIT' */
              <div className="space-y-4 text-xs">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <span className="font-extrabold text-xs text-amber-500 flex items-center gap-1.5">
                    📊 ระบบแบ่งจ่ายค่าบริการ (POS Bill Splitting)
                  </span>
                  <button
                    onClick={() => setCheckoutMode('NONE')}
                    className="text-[10px] text-slate-400 hover:text-white"
                  >
                    ย้อนกลับ
                  </button>
                </div>

                {/* Split Type Selector */}
                <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-850 text-[10px] font-bold">
                  <button
                    type="button"
                    onClick={() => {
                      setPosSplitType('PERCENTAGE');
                      setPosSplits([]);
                    }}
                    className={`flex-1 py-1.5 rounded-lg transition-all ${
                      posSplitType === 'PERCENTAGE'
                        ? 'bg-amber-600 text-white'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    แบ่งเท่ากัน (%)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setPosSplitType('ITEMS');
                      setPosSplits([]);
                    }}
                    className={`flex-1 py-1.5 rounded-lg transition-all ${
                      posSplitType === 'ITEMS'
                        ? 'bg-amber-600 text-white'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    แบ่งตามรายการอาหาร
                  </button>
                </div>

                {/* Configuration details */}
                {posSplits.length === 0 ? (
                  <div className="space-y-4 animate-in fade-in duration-200">
                    {posSplitType === 'PERCENTAGE' ? (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] text-slate-300 font-bold">จำนวนคนหาร (2-6 คน):</span>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => setPosNumPercentSplits(prev => Math.max(2, prev - 1))}
                              className="w-7 h-7 bg-[#0B131E] rounded-lg text-slate-300 flex items-center justify-center font-bold border border-slate-800 hover:bg-slate-800"
                            >
                              -
                            </button>
                            <span className="text-xs font-mono font-bold text-white px-1">{posNumPercentSplits}</span>
                            <button
                              type="button"
                              onClick={() => setPosNumPercentSplits(prev => Math.min(6, prev + 1))}
                              className="w-7 h-7 bg-[#0B131E] rounded-lg text-slate-300 flex items-center justify-center font-bold border border-slate-800 hover:bg-slate-800"
                            >
                              +
                            </button>
                          </div>
                        </div>

                        {/* Names input */}
                        <div className="space-y-2 bg-slate-950 p-2.5 rounded-xl border border-slate-850">
                          <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block">ระบุชื่อเรียกผู้จ่าย (Optional)</span>
                          <div className="grid grid-cols-2 gap-2">
                            {Array.from({ length: posNumPercentSplits }).map((_, i) => (
                              <input
                                key={i}
                                type="text"
                                value={posSplitNames[i] || ''}
                                onChange={(e) => {
                                  const newNames = [...posSplitNames];
                                  newNames[i] = e.target.value;
                                  setPosSplitNames(newNames);
                                }}
                                placeholder={`คนจ่ายที่ ${i + 1}`}
                                className="bg-[#0F1D30] border border-slate-800 rounded-lg px-2 py-1 text-[10px] text-white focus:outline-none"
                              />
                            ))}
                          </div>
                        </div>

                        <button
                          onClick={handleGeneratePOSPercentageSplits}
                          className="w-full py-2 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-xl text-xs"
                        >
                          ⚡ คำนวณส่วนแบ่งหารเท่ากัน
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] text-slate-300 font-bold">จำนวนกลุ่มคนหาร (2-6 กลุ่ม):</span>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => setPosNumItemSplits(prev => Math.max(2, prev - 1))}
                              className="w-7 h-7 bg-[#0B131E] rounded-lg text-slate-300 flex items-center justify-center font-bold border border-slate-800 hover:bg-slate-800"
                            >
                              -
                            </button>
                            <span className="text-xs font-mono font-bold text-white px-1">{posNumItemSplits}</span>
                            <button
                              type="button"
                              onClick={() => setPosNumItemSplits(prev => Math.min(6, prev + 1))}
                              className="w-7 h-7 bg-[#0B131E] rounded-lg text-slate-300 flex items-center justify-center font-bold border border-slate-800 hover:bg-slate-800"
                            >
                              +
                            </button>
                          </div>
                        </div>

                        {/* Group Names */}
                        <div className="space-y-2 bg-slate-950 p-2.5 rounded-xl border border-slate-850">
                          <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block">ระบุชื่อแต่ละกลุ่ม (Optional)</span>
                          <div className="grid grid-cols-2 gap-2">
                            {Array.from({ length: posNumItemSplits }).map((_, i) => (
                              <input
                                key={i}
                                type="text"
                                value={posSplitNames[i] || ''}
                                onChange={(e) => {
                                  const newNames = [...posSplitNames];
                                  newNames[i] = e.target.value;
                                  setPosSplitNames(newNames);
                                }}
                                placeholder={`กลุ่มที่ ${i + 1}`}
                                className="bg-[#0F1D30] border border-slate-800 rounded-lg px-2 py-1 text-[10px] text-white focus:outline-none"
                              />
                            ))}
                          </div>
                        </div>

                        {/* Items Allocation */}
                        <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                          {cart.map(item => {
                            const assignments = posItemAssignments[item.id] || {};
                            const totalAssigned = (Object.values(assignments) as number[]).reduce((sum, q) => sum + (Number(q) || 0), 0);
                            const unassignedQty = Math.max(0, item.quantity - totalAssigned);

                            return (
                              <div key={item.id} className="bg-slate-950 p-2 rounded-xl border border-slate-850 space-y-1.5">
                                <div className="flex justify-between items-center">
                                  <span className="font-bold text-[10px] text-slate-200 truncate max-w-[150px]">{item.name}</span>
                                  <span className="font-mono text-[9px] bg-slate-800 px-1 py-0.5 rounded text-slate-400 shrink-0">
                                    จำนวน {item.quantity} จาน
                                  </span>
                                </div>

                                <div className="grid grid-cols-2 gap-1.5">
                                  {Array.from({ length: posNumItemSplits }).map((_, sIdx) => {
                                    const curQty = assignments[sIdx] || 0;
                                    return (
                                      <div key={sIdx} className="flex items-center justify-between bg-[#0F1D30] px-1.5 py-0.5 rounded border border-slate-800 text-[10px]">
                                        <span className="text-[9px] text-slate-400 truncate max-w-[40px]">
                                          {posSplitNames[sIdx] || `กลุ่มที่ ${sIdx + 1}`}
                                        </span>
                                        <div className="flex items-center gap-1">
                                          <button
                                            type="button"
                                            disabled={curQty <= 0}
                                            onClick={() => {
                                              const updated = { ...posItemAssignments };
                                              if (!updated[item.id]) updated[item.id] = {};
                                              updated[item.id][sIdx] = Math.max(0, curQty - 1);
                                              setPosItemAssignments(updated);
                                            }}
                                            className="w-4 h-4 bg-slate-800 rounded text-white flex items-center justify-center font-bold text-[9px] disabled:opacity-30"
                                          >
                                            -
                                          </button>
                                          <span className="font-mono font-bold text-[9px] min-w-[8px] text-center text-white">{curQty}</span>
                                          <button
                                            type="button"
                                            disabled={unassignedQty <= 0}
                                            onClick={() => {
                                              const updated = { ...posItemAssignments };
                                              if (!updated[item.id]) updated[item.id] = {};
                                              updated[item.id][sIdx] = curQty + 1;
                                              setPosItemAssignments(updated);
                                            }}
                                            className="w-4 h-4 bg-slate-800 rounded text-white flex items-center justify-center font-bold text-[9px] disabled:opacity-30"
                                          >
                                            +
                                          </button>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>

                                {unassignedQty > 0 && (
                                  <span className="text-[8px] text-rose-400 block text-right">
                                    ⚠️ ค้างอีก {unassignedQty} ชิ้น
                                  </span>
                                )}
                              </div>
                            );
                          })}
                        </div>

                        <button
                          onClick={handleGeneratePOSItemsSplits}
                          className="w-full py-2 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-xl text-xs"
                        >
                          ⚡ คำนวณแบ่งจ่ายตามอาหาร
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  /* Splits generated, allow cashier to collect payment for each */
                  <div className="space-y-3 animate-in slide-in-from-bottom duration-200">
                    <span className="text-[10px] text-slate-400 block font-bold">บันทึกรับชำระเงินของแต่ละคน:</span>
                    <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                      {posSplits.map(split => {
                        const isPaid = split.paymentStatus === 'PAID';
                        return (
                          <div key={split.id} className={`p-2.5 rounded-xl border flex flex-col gap-1.5 transition-all ${
                            isPaid
                              ? 'bg-emerald-950/20 border-emerald-900/40 text-emerald-400'
                              : 'bg-slate-950 border-slate-850 text-slate-300'
                          }`}>
                            <div className="flex justify-between items-center">
                              <span className="font-extrabold text-[11px]">
                                👤 {split.name}
                              </span>
                              <span className="font-mono font-black text-xs text-white">
                                ฿{split.total.toLocaleString()}
                              </span>
                            </div>

                            {/* Payment control */}
                            {isPaid ? (
                              <div className="flex items-center gap-1 text-[9px] font-bold text-emerald-400 bg-emerald-950/40 p-1 rounded-lg border border-emerald-900/30">
                                <span>✅ ชำระแล้วผ่าน {split.paymentMethod === 'PROMPTPAY' ? 'พร้อมเพย์' : split.paymentMethod === 'CASH' ? 'เงินสด' : 'โอนเงิน'}</span>
                              </div>
                            ) : (
                              <div className="flex gap-1">
                                <button
                                  type="button"
                                  onClick={() => handlePayPOSSplit(split.id, 'CASH')}
                                  className="flex-1 py-1 bg-slate-900 hover:bg-slate-800 text-[9px] text-emerald-400 font-extrabold rounded-md border border-slate-800"
                                >
                                  💵 เงินสด
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handlePayPOSSplit(split.id, 'PROMPTPAY')}
                                  className="flex-1 py-1 bg-slate-900 hover:bg-slate-800 text-[9px] text-sky-400 font-extrabold rounded-md border border-slate-800"
                                >
                                  📱 พร้อมเพย์
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handlePayPOSSplit(split.id, 'TRANSFER')}
                                  className="flex-1 py-1 bg-slate-900 hover:bg-slate-800 text-[9px] text-indigo-400 font-extrabold rounded-md border border-slate-800"
                                >
                                  💳 โอนธนาคาร
                                </button>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    <div className="flex gap-2 pt-2 border-t border-slate-850">
                      <button
                        onClick={() => setPosSplits([])}
                        className="flex-1 py-2 bg-slate-800 hover:bg-slate-750 text-slate-400 rounded-xl text-xs font-bold"
                      >
                        คำนวณใหม่
                      </button>
                      <button
                        onClick={handleCompleteOrder}
                        disabled={!posSplits.every(s => s.paymentStatus === 'PAID')}
                        className={`flex-1 py-2 rounded-xl text-xs font-black transition-all ${
                          posSplits.every(s => s.paymentStatus === 'PAID')
                            ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow'
                            : 'bg-slate-800 text-slate-600 cursor-not-allowed'
                        }`}
                      >
                        💾 บันทึกออเดอร์เสร็จสิ้น
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

        </div>
      </div>

      {/* 5. ITEM MODIFIERS OPTIONS POPUP MODAL */}
      {customizingItem && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[#0F1D30] border border-[#1A2C42] rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-4 bg-black/20 border-b border-[#1A2C42] flex items-center justify-between">
              <h4 className="font-extrabold text-white text-sm">ปรับแต่งอาหารของคุณ</h4>
              <button 
                onClick={() => setCustomizingItem(null)}
                className="text-slate-500 hover:text-white p-1 rounded-lg hover:bg-slate-800"
              >
                <X className="w-4.5 h-4.5" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <div className="flex items-center gap-3.5 bg-[#0B131E] p-3 rounded-xl border border-[#1A2C42]">
                <img 
                  src={customizingItem.image} 
                  alt={customizingItem.name} 
                  className="w-16 h-16 rounded-xl object-cover shrink-0" 
                  referrerPolicy="no-referrer"
                />
                <div>
                  <h5 className="text-xs font-black text-white leading-snug">{customizingItem.name}</h5>
                  <p className="text-[11px] font-mono text-slate-400 mt-1">ราคาหลัก: ฿{customizingItem.price}</p>
                </div>
              </div>

              {/* A. Egg choice */}
              {customizingItem.category !== 'เครื่องดื่ม' && (
                <div className="space-y-1.5">
                  <span className="block text-xs font-black text-slate-300">เลือกท็อปปิ้งไข่ดาว</span>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setAddEgg(true)}
                      className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-between transition-all ${
                        addEgg 
                          ? 'border-amber-500 bg-amber-950/25 text-amber-400' 
                          : 'border-[#1E2E42] bg-[#0B131E] text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <span>ไข่ดาวโคตรกรอบ</span>
                      <span className="font-mono text-[10px] bg-amber-950 px-1.5 py-0.5 rounded text-amber-500">+10฿</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setAddEgg(false)}
                      className={`p-2.5 rounded-xl border text-xs font-bold transition-all ${
                        !addEgg 
                          ? 'border-slate-500 bg-slate-800 text-white' 
                          : 'border-[#1E2E42] bg-[#0B131E] text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      ไม่ใส่ไข่ดาว
                    </button>
                  </div>
                </div>
              )}

              {/* B. Remarks */}
              <div className="space-y-1.5">
                <span className="block text-xs font-black text-slate-300">ระบุหมายเหตุความต้องการพิเศษ</span>
                <input
                  type="text"
                  placeholder="เช่น ไม่กระเทียม, ขอน้ำปลาพริกเพิ่มเยอะๆ, ไข่แดงดิบ"
                  value={itemNote}
                  onChange={(e) => setItemNote(e.target.value)}
                  className="w-full bg-[#0B131E] border border-[#1A2C42] text-white rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-red-500"
                />
              </div>
            </div>

            <div className="p-4 bg-black/20 border-t border-[#1A2C42] flex gap-2">
              <button
                onClick={() => setCustomizingItem(null)}
                className="flex-1 py-2 bg-slate-800 hover:bg-slate-750 text-slate-400 rounded-xl text-xs font-semibold"
              >
                ยกเลิกปรับแต่ง
              </button>
              <button
                onClick={handleAddToCart}
                className="flex-1 py-2 bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-500 hover:to-amber-500 text-white rounded-xl text-xs font-bold"
              >
                บันทึกลงบิล (฿{customizingItem.price + (addEgg ? 10 : 0)})
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. RECEIPT OUTPUT MODAL DIALOG (THAI STYLE & FULL TAX INVOICE INTEGRATION) */}
      {showReceipt && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto print-receipt-modal animate-in fade-in duration-200">
          <div className={`bg-white text-slate-950 rounded-2xl w-full shadow-2xl p-6 font-mono border border-slate-200 print-receipt-card ${invoiceViewMode === 'FULL' ? 'max-w-md' : 'max-w-sm'}`}>
            
            {/* View Selector (no-print tab selector) */}
            {showReceipt.taxInvoice && (
              <div className="flex gap-1 p-1 bg-slate-100 rounded-xl mb-4 no-print text-[10px]">
                <button
                  type="button"
                  onClick={() => setInvoiceViewMode('SIMPLIFIED')}
                  className={`flex-1 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                    invoiceViewMode === 'SIMPLIFIED'
                      ? 'bg-white text-slate-900 shadow-sm border border-slate-200'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  บิลย่อ (Simplified Receipt)
                </button>
                <button
                  type="button"
                  onClick={() => setInvoiceViewMode('FULL')}
                  className={`flex-1 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                    invoiceViewMode === 'FULL'
                      ? 'bg-white text-slate-900 shadow-sm border border-slate-200'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  ใบกำกับภาษีเต็มรูป (Full Tax Invoice)
                </button>
              </div>
            )}

            {invoiceViewMode === 'FULL' && showReceipt.taxInvoice ? (
              /* --- FULL TAX INVOICE VIEW --- */
              <div className="space-y-4 text-[10.5px]">
                {/* Seller (Store) Header */}
                <div className="text-center space-y-1 pb-3 border-b-2 border-dashed border-slate-200">
                  <h4 className="font-extrabold text-sm tracking-tight text-slate-900 uppercase">
                    {storeSettings?.storeName || 'ครัวกะเพราโคตรกรอบ'}
                  </h4>
                  <p className="text-[9.5px] text-slate-600 leading-normal whitespace-pre-line">
                    {storeSettings?.storeAddress || '123/45 ถนนบรรทัดทอง แขวงวังใหม่ เขตปทุมวัน กรุงเทพมหานคร 10330'}
                  </p>
                  <p className="text-[10px] text-slate-800 font-bold">
                    เลขประจำตัวผู้เสียภาษีอากร: {storeSettings?.storeTaxId || '0105560987654'} (สำนักงานใหญ่)
                  </p>
                  <div className="pt-2">
                    <span className="border-2 border-slate-950 px-2.5 py-0.5 font-black text-xs uppercase tracking-wide inline-block text-slate-950">
                      ใบเสร็จรับเงิน / ใบกำกับภาษี
                    </span>
                    <span className="block text-[8px] text-slate-500 font-black mt-0.5 uppercase tracking-wider">(ต้นฉบับ / ORIGINAL)</span>
                  </div>
                </div>

                {/* Buyer (Customer) Details block */}
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-wide block border-b border-slate-200 pb-1 mb-1.5">ข้อมูลลูกค้าผู้รับบริการ</span>
                  <div className="flex">
                    <span className="w-20 text-slate-500 shrink-0">ผู้ซื้อสินค้า:</span>
                    <span className="font-bold text-slate-900">{showReceipt.taxInvoice.customerName}</span>
                  </div>
                  <div className="flex">
                    <span className="w-20 text-slate-500 shrink-0">ที่อยู่ผู้ซื้อ:</span>
                    <span className="text-slate-800 leading-relaxed font-medium">{showReceipt.taxInvoice.customerAddress}</span>
                  </div>
                  <div className="flex">
                    <span className="w-20 text-slate-500 shrink-0">เลขเสียภาษี:</span>
                    <span className="font-bold text-slate-900 font-mono tracking-wider">{showReceipt.taxInvoice.customerTaxId}</span>
                  </div>
                  <div className="flex">
                    <span className="w-20 text-slate-500 shrink-0">รหัสสาขา:</span>
                    <span className="font-bold text-slate-900 font-mono">{showReceipt.taxInvoice.customerBranch}</span>
                  </div>
                </div>

                {/* Metadata billing details */}
                <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 border-b border-slate-150 pb-2 bg-slate-50/50 p-2 rounded-xl border border-slate-200/55">
                  <div>
                    <span className="text-slate-500 block text-[9px] font-bold uppercase tracking-wide">เลขที่ใบกำกับภาษี</span>
                    <span className="font-black font-mono text-xs text-red-600 block">{showReceipt.taxInvoice.invoiceNo}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[9px] font-bold uppercase tracking-wide">เลขที่ SO (Sales Order)</span>
                    <span className="font-black font-mono text-xs text-emerald-700 block">{showReceipt.soNumber || `SO-${showReceipt.id.replace('TX-', '')}`}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[9px] font-bold uppercase tracking-wide">วันที่ออกเอกสาร</span>
                    <span className="font-bold text-slate-900 block">{new Date(showReceipt.taxInvoice.issuedAt).toLocaleString('th-TH')}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[9px] font-bold uppercase tracking-wide">เลขอ้างอิงบิลเดิม</span>
                    <span className="font-bold font-mono text-slate-800 block">{showReceipt.id}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[9px] font-bold uppercase tracking-wide">ผู้รับชำระเงิน</span>
                    <span className="font-bold text-slate-800 block">{showReceipt.cashierName}</span>
                  </div>
                </div>

                {/* Standard items list */}
                <table className="w-full text-left text-[10px] border-collapse">
                  <thead>
                    <tr className="border-b border-slate-300 font-bold text-slate-800">
                      <th className="py-1">รายการสินค้า/บริการ</th>
                      <th className="py-1 text-center w-10">จำนวน</th>
                      <th className="py-1 text-right w-16">จำนวนเงิน</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-dashed divide-slate-200 text-slate-800">
                    {showReceipt.items.map(item => (
                      <tr key={item.id}>
                        <td className="py-2">
                          <span className="font-bold text-slate-900">{item.name}</span>
                          {item.addFriedEgg && <span className="block text-[8px] text-slate-400 pl-2">+ ไข่ดาวโคตรกรอบ (+฿10)</span>}
                        </td>
                        <td className="py-2 text-center font-bold font-mono">{item.quantity}</td>
                        <td className="py-2 text-right font-bold font-mono">฿{((item.price + item.eggPrice) * item.quantity).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Math calculations */}
                <div className="border-t-2 border-dashed border-slate-200 pt-3 space-y-1.5 text-[10px]">
                  <div className="flex justify-between text-slate-600">
                    <span>มูลค่าก่อนภาษีมูลค่าเพิ่ม (Value before VAT):</span>
                    <span className="font-bold font-mono text-slate-900">
                      ฿{(showReceipt.total - (showReceipt.vatAmount ?? Math.round((showReceipt.total * taxRate) / (100 + taxRate)))).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>ภาษีมูลค่าเพิ่ม VAT {taxRate}% (VAT Amount):</span>
                    <span className="font-bold font-mono text-slate-900">
                      ฿{(showReceipt.vatAmount ?? Math.round((showReceipt.total * taxRate) / (100 + taxRate))).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="flex justify-between font-extrabold text-sm text-slate-900 border-t border-slate-200 pt-2.5 pb-1">
                    <span>ยอดสุทธิรับชำระทั้งสิ้น (Grand Total):</span>
                    <span className="text-base font-black font-mono text-slate-950">
                      ฿{showReceipt.total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>

                {/* Signature space */}
                <div className="grid grid-cols-2 gap-4 pt-8 text-center border-t border-slate-200/80">
                  <div className="space-y-6">
                    <span className="block border-b border-slate-300 w-3/4 mx-auto"></span>
                    <span className="block text-[8px] text-slate-500 font-black tracking-wide">ลงชื่อ _______________________<br/>ผู้รับเงิน / Cashier</span>
                  </div>
                  <div className="space-y-6">
                    <span className="block border-b border-slate-300 w-3/4 mx-auto"></span>
                    <span className="block text-[8px] text-slate-500 font-black tracking-wide">ลงชื่อ _______________________<br/>ผู้จ่ายเงิน / Customer</span>
                  </div>
                </div>
              </div>
            ) : (
              /* --- SIMPLIFIED RECEIPT VIEW --- */
              <>
                {/* Header store */}
                <div className="text-center space-y-1.5 border-b-2 border-dashed border-slate-200 pb-4">
                  <h4 className="font-extrabold text-sm tracking-tight text-slate-900 uppercase">{storeSettings?.storeName || 'KAPRAO POS SYSTEM'}</h4>
                  <p className="text-[10.5px] text-slate-500 leading-relaxed whitespace-pre-line">
                    {storeSettings?.receiptHeader || `ครัวกะเพราโคตรกรอบ สาขาบรรทัดทอง\nยินดีต้อนรับ\nโทร. 081-123-4567`}
                  </p>
                </div>

                {/* Receipt core metadata */}
                <div className="py-3.5 space-y-1 text-[11px] border-b border-slate-150">
                  <div className="flex justify-between">
                    <span>เลขที่ SO (Sales Order):</span>
                    <span className="font-bold text-emerald-800 font-mono">{showReceipt.soNumber || `SO-${showReceipt.id.replace('TX-', '')}`}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>เลขที่ใบขาย/บิล:</span>
                    <span className="font-bold">{showReceipt.id}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>โต๊ะอาหาร:</span>
                    <span className="font-bold">{showReceipt.tableNo === 'TakeAway' ? 'ทานกลับบ้าน (TakeAway)' : `โต๊ะนั่ง ${showReceipt.tableNo}`}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>วันเวลาชำระ:</span>
                    <span>{new Date(showReceipt.timestamp).toLocaleString('th-TH')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>พนักงานแคชเชียร์:</span>
                    <span>{showReceipt.cashierName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>ประเภทการชำระ:</span>
                    <span className="font-bold">
                      {showReceipt.paymentMethod === 'PROMPTPAY' 
                        ? 'สแกนพร้อมเพย์ (PromptPay)' 
                        : showReceipt.paymentMethod === 'TRANSFER'
                          ? 'โอนเงินธนาคาร (Bank Transfer)'
                          : 'รับเงินสด (Cash)'}
                    </span>
                  </div>
                </div>

                {/* List items ordered */}
                <div className="py-4 divide-y divide-dashed divide-slate-200 space-y-2 text-[11px] border-b-2 border-dashed border-slate-200">
                  {showReceipt.items.map(item => (
                    <div key={item.id} className="pt-2 first:pt-0">
                      <div className="flex justify-between font-semibold text-slate-900">
                        <span>{item.name} (x{item.quantity})</span>
                        <span>฿{((item.price + item.eggPrice) * item.quantity).toLocaleString()}</span>
                      </div>
                      {item.addFriedEgg && (
                        <span className="block text-[9px] text-slate-400 pl-2">+ ไข่ดาวโคตรกรอบ (+฿10)</span>
                      )}
                      {item.notes && (
                        <span className="block text-[9px] text-slate-500 pl-2 italic">*{item.notes}</span>
                      )}
                    </div>
                  ))}
                </div>

                {/* Totals math calculations */}
                <div className="py-3 text-[11px] space-y-1.5 border-b border-slate-200">
                  <div className="flex justify-between text-slate-500">
                    <span>ยอดเงินสุทธิค่าอาหาร:</span>
                    <span>฿{showReceipt.subtotal.toLocaleString()}</span>
                  </div>
                  {showReceipt.discount > 0 && (
                    <div className="flex justify-between text-emerald-600 font-bold">
                      <span>ส่วนลดรวม (Discounts):</span>
                      <span>- ฿{showReceipt.discount.toLocaleString()}</span>
                    </div>
                  )}
                  {showReceipt.serviceChargeAmount !== undefined && showReceipt.serviceChargeAmount > 0 && (
                    <div className="flex justify-between text-slate-500">
                      <span>ค่าบริการ (Service Charge):</span>
                      <span>฿{showReceipt.serviceChargeAmount.toLocaleString()}</span>
                    </div>
                  )}
                  {showReceipt.vatType === 'EXCLUSIVE' ? (
                    <div className="flex justify-between text-slate-500">
                      <span>ภาษีมูลค่าเพิ่ม VAT {taxRate}%:</span>
                      <span>฿{(showReceipt.vatAmount ?? 0).toLocaleString()}</span>
                    </div>
                  ) : (
                    <div className="flex justify-between text-slate-400 text-[9.5px]">
                      <span>(รวมภาษี VAT {taxRate}%: ฿{(showReceipt.vatAmount ?? Math.round((showReceipt.total * taxRate) / (100 + taxRate))).toLocaleString()} แล้ว)</span>
                    </div>
                  )}
                  <div className="flex justify-between font-black text-sm text-slate-900 border-t border-slate-100 pt-2.5">
                    <span>รวมยอดสุทธิรับชำระ:</span>
                    <span>฿{showReceipt.total.toLocaleString()}</span>
                  </div>
                  {showReceipt.paymentMethod === 'CASH' && (
                    <>
                      <div className="flex justify-between text-slate-600 text-[10.5px] pt-1">
                        <span>รับเงินสดมา (Cash Received):</span>
                        <span>฿{(showReceipt.cashReceived ?? showReceipt.total).toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-emerald-600 font-bold text-[10.5px]">
                        <span>เงินทอน (Change):</span>
                        <span>฿{(showReceipt.cashChange ?? 0).toLocaleString()}</span>
                      </div>
                    </>
                  )}
                </div>

                {/* Attached Payment Slip Display */}
                {showReceipt.paymentSlip && (
                  <div className="py-3 border-b border-slate-200 text-center">
                    <span className="text-[10px] text-slate-500 font-bold block mb-1.5 text-left">📎 หลักฐานการโอนเงิน (Attached Slip):</span>
                    <div className="bg-slate-50 p-2 rounded-xl border border-slate-200 inline-block max-w-full">
                      <img 
                        src={showReceipt.paymentSlip} 
                        alt="หลักฐานสลิปการโอนเงิน" 
                        className="max-h-56 mx-auto object-contain rounded-lg"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                  </div>
                )}

                {/* Receipt footer message */}
                <div className="text-center pt-4 space-y-2 border-t border-dashed border-slate-200 mt-2">
                  <p className="text-[10px] font-bold text-slate-800 whitespace-pre-line">
                    {storeSettings?.receiptFooter || `ขอบคุณที่อุดหนุนครัวกะเพราโคตรกรอบ\nโอกาสหน้าเชิญใหม่ค่ะ • ใบเสร็จรับเงินอย่างย่อ`}
                  </p>
                  
                  {/* Automatically generated QR Code appended to the bottom of the printed receipt */}
                  <div className="py-2 flex flex-col items-center justify-center space-y-1">
                    <p className="text-[8px] text-slate-500 font-bold">✨ แสกนแอดไลน์เพื่อติดต่อร้าน / รับส่วนลด ✨</p>
                    <div className="w-20 h-20 p-1 bg-white border border-slate-200 rounded-lg flex items-center justify-center shadow-xs">
                      <img 
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(storeSettings?.contactPage || 'https://line.me/R/ti/p/@kapraopos')}`}
                        alt="Store Line OA Contact QR" 
                        className="w-full h-full object-contain"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                    <p className="text-[8px] font-bold text-slate-400 font-mono">Line ID: @kapraopos</p>
                  </div>

                  <span className="inline-block mt-1 bg-red-50/80 text-red-600 px-3 py-1 rounded text-[9px] font-black border border-red-100">
                    ส่งสัญญานเข้าครัว KDS คอนเฟิร์มเสร็จสิ้น
                  </span>
                </div>
              </>
            )}

            {/* Actions Panel */}
            <div className="mt-5 flex flex-col gap-2 no-print">
              
              {!showReceipt.taxInvoice && (
                <button
                  type="button"
                  onClick={() => {
                    // Reset fields
                    setTaxCustName('');
                    setTaxCustTaxId('');
                    setTaxCustAddress('');
                    setTaxCustBranch('สำนักงานใหญ่');
                    setShowTaxInvoiceForm(true);
                  }}
                  className="w-full py-2 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer mb-1 shadow-sm"
                >
                  <FileText className="w-4 h-4 text-red-600 shrink-0" />
                  <span>ออกใบกำกับภาษีเต็มรูปแบบ (Full VAT)</span>
                </button>
              )}

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => { window.print(); }}
                  className="flex-1 py-2 border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1 cursor-pointer"
                >
                  <Receipt className="w-4 h-4 text-slate-500" /> 
                  <span>พิมพ์ {invoiceViewMode === 'FULL' ? 'ใบกำกับภาษี' : 'ใบเสร็จ'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowReceipt(null);
                    setInvoiceViewMode('SIMPLIFIED');
                  }}
                  className="flex-1 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  ปิดหน้านี้
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 7. CUSTOMER INFO INPUT OVERLAY MODAL FOR FULL TAX INVOICE */}
      {showTaxInvoiceForm && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 z-[60] overflow-y-auto">
          <div className="bg-[#0f1d30] border border-[#1e2e42] max-w-md w-full rounded-2xl p-6 shadow-2xl space-y-4 text-slate-100 animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-[#1e2e42] pb-3">
              <div className="flex items-center gap-2">
                <div className="bg-red-500/20 text-red-400 p-1.5 rounded-lg border border-red-500/30">
                  <FileText className="w-4 h-4 text-red-400" />
                </div>
                <div>
                  <h4 className="text-sm font-black text-white uppercase tracking-tight">ออกใบกำกับภาษีเต็มรูปแบบ</h4>
                  <p className="text-[10px] text-slate-400">กรอกข้อมูลผู้เสียภาษี (ผู้ซื้อ) เพื่อทำการออกเอกสารภาษี</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowTaxInvoiceForm(false)}
                className="text-slate-400 hover:text-white hover:bg-[#1a2c42] p-1.5 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Quick Customer Selection from CRM */}
            {crmCustomers.length > 0 && (
              <div className="space-y-1.5 bg-[#070d14] p-3 rounded-xl border border-[#1e2e42]/60">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">เลือกจากฐานข้อมูลลูกค้า CRM เพื่อดึงข้อมูลด่วน</label>
                <select
                  onChange={(e) => {
                    const selectedId = e.target.value;
                    if (selectedId) {
                      const cust = crmCustomers.find(c => c.id === selectedId);
                      if (cust) {
                        setTaxCustName(cust.name || '');
                        setTaxCustTaxId(cust.taxId || '');
                        setTaxCustAddress(cust.address || '');
                      }
                    }
                  }}
                  className="w-full bg-[#0b131e] border border-[#1e2e42] text-white px-3 py-2 rounded-xl text-xs focus:outline-none focus:border-red-500 cursor-pointer font-bold"
                >
                  <option value="">-- กรุณาเลือกสมาชิกในร้าน (หากมี) --</option>
                  {crmCustomers.map(cust => (
                    <option key={cust.id} value={cust.id}>
                      {cust.name} {cust.phone ? `(${cust.phone})` : ''}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Form Fields */}
            <div className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="text-slate-300 block font-bold">ชื่อบริษัท / ชื่อผู้เสียภาษี (Customer/Company Name) <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  required
                  value={taxCustName}
                  onChange={(e) => setTaxCustName(e.target.value)}
                  className="w-full bg-[#070d14] border border-[#1e2e42] text-white rounded-xl px-3 py-2.5 text-xs focus:outline-none focus:border-red-500 font-bold"
                  placeholder="เช่น บริษัท สยาม ฟู้ด แอนด์ เบฟเวอเรจ จำกัด"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-slate-300 block font-bold">เลขประจำตัวผู้เสียภาษี 13 หลัก <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    maxLength={13}
                    required
                    value={taxCustTaxId}
                    onChange={(e) => setTaxCustTaxId(e.target.value.replace(/[^0-9]/g, ''))}
                    className="w-full bg-[#070d14] border border-[#1e2e42] text-white rounded-xl px-3 py-2.5 text-xs focus:outline-none focus:border-red-500 font-mono font-bold tracking-wider"
                    placeholder="เช่น 0105560987654"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-slate-300 block font-bold">สาขา / สำนักงานใหญ่ <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    required
                    value={taxCustBranch}
                    onChange={(e) => setTaxCustBranch(e.target.value)}
                    className="w-full bg-[#070d14] border border-[#1e2e42] text-white rounded-xl px-3 py-2.5 text-xs focus:outline-none focus:border-red-500 font-bold"
                    placeholder="เช่น สำนักงานใหญ่ หรือ 00000"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-slate-300 block font-bold">ที่อยู่จดทะเบียนผู้เสียภาษี (Customer Address) <span className="text-red-500">*</span></label>
                <textarea
                  required
                  rows={2.5}
                  value={taxCustAddress}
                  onChange={(e) => setTaxCustAddress(e.target.value)}
                  className="w-full bg-[#070d14] border border-[#1e2e42] text-white rounded-xl px-3 py-2.5 text-xs focus:outline-none focus:border-red-500 font-medium"
                  placeholder="เช่น 456 ถนนพญาไท แขวงวังใหม่ เขตปทุมวัน กรุงเทพมหานคร 10330"
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowTaxInvoiceForm(false)}
                className="flex-1 py-2.5 bg-[#1a2c42] hover:bg-[#253b55] text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleIssueTaxInvoice}
                className="flex-1 py-2.5 bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-500 hover:to-amber-500 text-white rounded-xl text-xs font-black transition-all cursor-pointer shadow-lg hover:shadow-red-500/20"
              >
                บันทึกและออกเอกสาร
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 7-DAY SALES HISTORY MODAL */}
      {showSalesHistory && (() => {
        // Compute filtered orders
        const filteredHistoryOrders = orders.filter(order => {
          // 1. Search query matching
          const query = historySearchQuery.trim().toLowerCase();
          const matchesSearch = !query || 
            order.id.toLowerCase().includes(query) ||
            order.tableNo.toLowerCase().includes(query) ||
            (order.customerPhone && order.customerPhone.includes(query)) ||
            order.items.some(it => it.name.toLowerCase().includes(query));

          // 2. Date range matching (inclusive)
          const orderDateStr = order.timestamp.split('T')[0];
          let matchesDateRange = true;
          if (historyStartDate) {
            matchesDateRange = matchesDateRange && (orderDateStr >= historyStartDate);
          }
          if (historyEndDate) {
            matchesDateRange = matchesDateRange && (orderDateStr <= historyEndDate);
          }

          return matchesSearch && matchesDateRange;
        });

        // Compute dynamic stats based on filtered orders
        const totalBills = filteredHistoryOrders.length;
        const totalPaidAmount = filteredHistoryOrders
          .filter(o => o.paymentStatus === 'PAID')
          .reduce((sum, o) => sum + o.total, 0);
        const totalRefundedAmount = filteredHistoryOrders
          .filter(o => o.paymentStatus === 'REFUNDED')
          .reduce((sum, o) => sum + o.total, 0);

        return (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50 backdrop-blur-sm animate-fadeIn">
            <div className="bg-[#0F1D30] border border-[#1A2C42] rounded-3xl w-full max-w-5xl p-6 shadow-2xl space-y-4 max-h-[90vh] flex flex-col">
              <div className="flex justify-between items-center border-b border-[#1A2C42]/60 pb-3 shrink-0">
                <div className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-red-500 animate-pulse" />
                  <div>
                    <h3 className="font-bold text-white text-base">ระบบประวัติการขายและตรวจสอบบิลย้อนหลัง</h3>
                    <p className="text-[11px] text-slate-400">ค้นหาบิล, กรองข้อมูลตามช่วงเวลา, พิมพ์ใบเสร็จย้อนหลัง และยกเลิกบิลปรับคลังอัตโนมัติ</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowSalesHistory(false)}
                  className="p-1.5 hover:bg-[#1A2C42] text-slate-400 hover:text-white rounded-xl transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* SEARCH & FILTER CONTROLS */}
              <div className="bg-[#0B131E] p-4 rounded-2xl border border-[#1E2E42] shrink-0 grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
                {/* Text Search Input */}
                <div className="space-y-1.5 md:col-span-2">
                  <label className="block text-xs font-bold text-slate-300">ค้นหาตามรหัสบิล / เลขโต๊ะ / เบอร์โทร / ชื่อสินค้า</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
                    <input
                      type="text"
                      placeholder="เช่น ord-xxx, โต๊ะ 1, 085-xxx, ข้าวกะเพรา..."
                      value={historySearchQuery}
                      onChange={(e) => setHistorySearchQuery(e.target.value)}
                      className="w-full bg-[#070D14] border border-[#1E2E42] rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-red-500/50"
                    />
                  </div>
                </div>

                {/* Date range selection */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-300">ตั้งแต่วันที่</label>
                  <input
                    type="date"
                    value={historyStartDate}
                    onChange={(e) => setHistoryStartDate(e.target.value)}
                    className="w-full bg-[#070D14] border border-[#1E2E42] rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-red-500/50"
                  />
                </div>

                <div className="space-y-1.5 flex gap-2 items-center">
                  <div className="flex-1 space-y-1.5">
                    <label className="block text-xs font-bold text-slate-300">ถึงวันที่</label>
                    <input
                      type="date"
                      value={historyEndDate}
                      onChange={(e) => setHistoryEndDate(e.target.value)}
                      className="w-full bg-[#070D14] border border-[#1E2E42] rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-red-500/50"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setHistorySearchQuery('');
                      const d = new Date();
                      d.setDate(d.getDate() - 7);
                      setHistoryStartDate(d.toISOString().split('T')[0]);
                      setHistoryEndDate(new Date().toISOString().split('T')[0]);
                    }}
                    className="px-3 py-2 bg-[#1A2C42] hover:bg-[#253B55] text-slate-300 hover:text-white rounded-xl text-xs font-bold transition-all h-[34px] self-end flex items-center justify-center cursor-pointer"
                    title="ล้างตัวกรองเป็นค่าเริ่มต้น"
                  >
                    ล้างตัวกรอง
                  </button>
                </div>
              </div>

              {/* Dynamic stats for search results */}
              <div className="grid grid-cols-3 gap-3 shrink-0">
                <div className="bg-[#0B131E] p-3 rounded-2xl border border-[#1E2E42] hover:border-red-500/20 transition-all">
                  <span className="text-[10px] text-slate-400 font-bold block uppercase">จำนวนรายการบิลที่พบ</span>
                  <span className="text-lg font-black font-mono text-white mt-0.5 block">
                    {totalBills.toLocaleString()} บิล
                  </span>
                </div>
                <div className="bg-[#0B131E] p-3 rounded-2xl border border-[#1E2E42] hover:border-emerald-500/20 transition-all">
                  <span className="text-[10px] text-slate-400 font-bold block uppercase">ยอดขายสุทธิที่ชำระแล้ว</span>
                  <span className="text-lg font-black font-mono text-emerald-400 mt-0.5 block">
                    ฿{totalPaidAmount.toLocaleString()}
                  </span>
                </div>
                <div className="bg-[#0B131E] p-3 rounded-2xl border border-[#1E2E42] hover:border-red-500/20 transition-all">
                  <span className="text-[10px] text-slate-400 font-bold block uppercase">ยอดเงินจากบิลที่ยกเลิก</span>
                  <span className="text-lg font-black font-mono text-red-500 mt-0.5 block">
                    ฿{totalRefundedAmount.toLocaleString()}
                  </span>
                </div>
              </div>

              {/* List Table with scroll */}
              <div className="flex-1 overflow-y-auto border border-[#1E2E42]/50 rounded-2xl bg-[#0B131E]">
                <table className="w-full text-left text-xs divide-y divide-[#1E2E42]/60">
                  <thead>
                    <tr className="bg-[#0F1D30]/80 text-slate-400 font-bold uppercase sticky top-0 backdrop-blur z-10">
                      <th className="p-3">เลขที่บิล / เวลาทำรายการ</th>
                      <th className="p-3">ลูกค้า / โต๊ะ</th>
                      <th className="p-3">รายการอาหารที่สั่ง</th>
                      <th className="p-3 text-right">ยอดเงินรวม</th>
                      <th className="p-3 text-center">สถานะ</th>
                      <th className="p-3 text-center w-40">การดำเนินการ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1E2E42]/40 text-slate-300">
                    {filteredHistoryOrders.map(order => {
                      const isRef = order.paymentStatus === 'REFUNDED';
                      return (
                        <tr key={order.id} className={`hover:bg-[#1A2C42]/20 transition-all ${isRef ? 'bg-red-950/10 text-slate-500 line-through' : ''}`}>
                          <td className="p-3 space-y-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-black font-mono text-white text-xs">{order.id}</span>
                              {order.synced ? (
                                <span className="px-1 py-0.5 bg-emerald-950/40 text-emerald-400 border border-emerald-900/40 rounded text-[8.5px] font-bold" title="บันทึกเข้าระบบคลาวด์เสร็จสมบูรณ์">CLOUD</span>
                              ) : (
                                <span className="px-1 py-0.5 bg-amber-950/40 text-amber-400 border border-amber-900/40 rounded text-[8.5px] font-bold animate-pulse" title="ออฟไลน์: รอซิงค์เมื่อเน็ตกลับมา">LOCAL ONLY</span>
                              )}
                              {order.paymentSlip && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setShowReceipt(order);
                                  }}
                                  className="px-1.5 py-0.5 bg-indigo-950/60 hover:bg-indigo-900 text-indigo-400 border border-indigo-900/30 rounded text-[8.5px] font-bold flex items-center gap-0.5 transition-all cursor-pointer"
                                  title="คลิกเพื่อดูสลิปหลักฐานการโอน"
                                >
                                  📎 มีสลิป
                                </button>
                              )}
                            </div>
                            <span className="block text-[10px] text-slate-500 font-mono">
                              {new Date(order.timestamp).toLocaleString('th-TH')}
                            </span>
                          </td>
                          <td className="p-3">
                            <span className="block font-bold">
                              โต๊ะ {order.tableNo === 'TakeAway' ? 'กลับบ้าน' : order.tableNo}
                            </span>
                            {order.customerPhone && (
                              <span className="block text-[9px] text-slate-500 font-mono">โทร {order.customerPhone}</span>
                            )}
                          </td>
                          <td className="p-3 max-w-[240px]">
                            <div className="truncate font-medium text-[11px] text-slate-300">
                              {order.items.map(it => `${it.name}${it.addFriedEgg ? '+ไข่กรอบ' : ''} x${it.quantity}`).join(', ')}
                            </div>
                          </td>
                          <td className="p-3 text-right font-black font-mono text-white text-xs">
                            ฿{order.total.toLocaleString()}
                          </td>
                          <td className="p-3 text-center">
                            <span className={`px-2 py-0.5 rounded text-[9px] font-black border uppercase ${
                              order.paymentStatus === 'PAID'
                                ? 'bg-[#0F5A3E]/30 text-green-400 border-green-900/30'
                                : order.paymentStatus === 'REFUNDED'
                                ? 'bg-red-950/40 text-red-500 border-red-900/30'
                                : 'bg-yellow-950/40 text-yellow-500 border-yellow-900/30'
                            }`}>
                              {order.paymentStatus === 'PAID' ? 'ชำระแล้ว' : order.paymentStatus === 'REFUNDED' ? 'ยกเลิก/คืนเงิน' : 'ค้างชำระ'}
                            </span>
                          </td>
                          <td className="p-3 text-center">
                            <div className="flex gap-1.5 justify-center">
                              <button
                                onClick={() => {
                                  setShowReceipt(order);
                                  setShowSalesHistory(false);
                                }}
                                className="px-2 py-1 bg-[#1A2C42] hover:bg-[#253B55] text-slate-200 hover:text-white rounded-lg text-[10px] font-bold flex items-center gap-1 transition-all"
                                title="พิมพ์ใบเสร็จย้อนหลัง"
                              >
                                <Receipt className="w-3 h-3 text-red-500 shrink-0" />
                                <span>พิมพ์ซ้ำ</span>
                              </button>
                              
                              {order.paymentStatus === 'PAID' && (
                                <button
                                  onClick={() => {
                                    if (!isManagerOrAdmin) {
                                      alert(`❌ ปฏิเสธสิทธิ์การยกเลิกบิล!\nเฉพาะพนักงานตำแหน่ง "แอดมิน" หรือ "ผู้จัดการ" เท่านั้นที่มีสิทธิ์ล้างและยกเลิกออเดอร์ย้อนหลังในระบบได้`);
                                      return;
                                    }
                                    if (confirm(`คุณมั่นใจที่จะยกเลิกบิลรายการ ${order.id} ใช่หรือไม่?\nการยกเลิกจะคืนเงิน ฿${order.total.toLocaleString()} คืนวัตถุดิบเข้าคลัง และยกเลิกแต้มสะสม`)) {
                                      // Cancel order logic
                                      const updatedOrders = orders.map(o => {
                                        if (o.id === order.id) {
                                          return { ...o, paymentStatus: 'REFUNDED' as const };
                                        }
                                        return o;
                                      });
                                      if (onUpdateOrders) {
                                        onUpdateOrders(updatedOrders);
                                        alert('✅ ยกเลิกบิลย้อนหลังและปรับปรุงยอดบัญชีคืนเงินเรียบร้อยแล้ว');
                                      }
                                    }
                                  }}
                                  className="px-2 py-1 bg-red-950/40 hover:bg-red-950 text-red-400 hover:text-red-300 rounded-lg text-[10px] font-bold flex items-center gap-1 transition-all border border-red-900/30"
                                  title="ยกเลิกบิล/คืนเงิน"
                                >
                                  <Trash2 className="w-3 h-3 shrink-0" />
                                  <span>ยกเลิกบิล</span>
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    {filteredHistoryOrders.length === 0 && (
                      <tr>
                        <td colSpan={6} className="text-center p-12 text-slate-500 font-semibold">
                          🔍 ไม่พบประวัติการขายที่ตรงตามเงื่อนไขการค้นหา
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-end pt-2 shrink-0">
                <button
                  onClick={() => setShowSalesHistory(false)}
                  className="px-5 py-2.5 bg-[#1A2C42] hover:bg-[#253B55] text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  ปิดหน้าต่าง
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Floating Quick Cart status bar at the bottom for iPad/iPhone (visible only when cart has items and menu tab is active on small/medium screens) */}
      {cart.length > 0 && activePosTab === 'menu' && (
        <div className="fixed bottom-6 inset-x-4 lg:hidden z-40 animate-bounce">
          <button
            onClick={() => setActivePosTab('cart')}
            className="w-full bg-gradient-to-r from-red-600 via-red-500 to-amber-500 text-white p-4 rounded-2xl shadow-2xl flex items-center justify-between font-black text-sm border border-red-500/30"
          >
            <div className="flex items-center gap-2.5">
              <span className="relative flex h-5 w-5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                <span className="relative inline-flex rounded-full h-5 w-5 bg-black/40 text-[11px] font-bold items-center justify-center font-mono text-red-300">
                  {cart.reduce((sum, item) => sum + item.quantity, 0)}
                </span>
              </span>
              <span>ดูตะกร้าสั่งซื้อ ({cart.reduce((sum, item) => sum + item.quantity, 0)} รายการ)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-white/80 font-medium">รวมสุทธิ:</span>
              <span className="font-mono text-base font-black text-white">฿{total.toLocaleString()}</span>
              <ArrowRight className="w-4 h-4 ml-1 shrink-0" />
            </div>
          </button>
        </div>
      )}

      {/* Floating 'Quick Expense' FAB */}
      <div className={`fixed right-6 z-40 transition-all duration-300 ${
        cart.length > 0 && activePosTab === 'menu' ? 'bottom-28' : 'bottom-6'
      } lg:bottom-10 lg:right-10`}>
        <button
          onClick={() => setShowQuickExpense(true)}
          className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-550 text-slate-950 font-black px-5 py-3 rounded-full shadow-2xl border border-amber-400/30 flex items-center gap-2 hover:scale-105 active:scale-95 transition-all duration-200 cursor-pointer text-xs"
          title="บันทึกค่าใช้จ่ายด่วนหน้าร้าน"
        >
          <DollarSign className="w-4 h-4 shrink-0 stroke-[3px]" />
          <span>บันทึกค่าใช้จ่ายด่วน</span>
        </button>
      </div>

      {/* Quick Expense Modal Dialog */}
      {showQuickExpense && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#0F1D30] border border-[#1A2C42] max-w-md w-full rounded-2xl p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-200 text-slate-100">
            
            {/* Header */}
            <div className="flex items-center justify-between border-b border-[#1A2C42] pb-3">
              <div className="flex items-center gap-2.5">
                <div className="bg-amber-500/20 text-amber-400 p-2 rounded-xl border border-amber-500/30">
                  <DollarSign className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-black text-slate-100 uppercase tracking-tight">บันทึกค่าใช้จ่ายด่วน (Quick Expense)</h4>
                  <p className="text-[10px] text-slate-400 font-medium">บันทึกเงินสดย่อย ค่าทิป หรือรายจ่ายหน้าร้านโดยไม่ต้องสลับแท็บ</p>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => setShowQuickExpense(false)}
                className="text-slate-400 hover:text-white hover:bg-[#1A2C42] p-1.5 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleQuickExpenseSubmit} className="space-y-4">
              
              {/* Category */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">หมวดหมู่ค่าใช้จ่าย</label>
                <select
                  value={expenseCategory}
                  onChange={(e) => setExpenseCategory(e.target.value as Expense['category'])}
                  className="w-full bg-[#0B131E] border border-[#1A2C42] text-white px-3 py-2.5 rounded-xl text-xs focus:outline-none focus:border-amber-500 cursor-pointer font-bold"
                >
                  <option value="Other">อื่นๆ / เงินสดย่อย (Other / Petty Cash)</option>
                  <option value="Ingredients">ซื้อวัตถุดิบด่วน (Ingredients / Rush Purchase)</option>
                  <option value="Salary">ค่าแรง / ค่าทิปพนักงาน (Salary / Tips)</option>
                  <option value="Electricity">ค่าไฟฟ้า (Electricity)</option>
                  <option value="Water">ค่าน้ำประปา (Water)</option>
                  <option value="Marketing">ค่าการตลาด / โปรโมท (Marketing)</option>
                  <option value="Rent">ค่าเช่าสถานที่ (Rent)</option>
                </select>
              </div>

              {/* Amount */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">จำนวนเงินสดจ่ายออก (บาท)</label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-amber-500 font-black text-xs">฿</span>
                  <input
                    type="number"
                    step="any"
                    required
                    placeholder="0.00"
                    value={expenseAmount}
                    onChange={(e) => setExpenseAmount(e.target.value)}
                    className="w-full bg-[#0B131E] border border-[#1A2C42] text-white pl-8 pr-4 py-2.5 rounded-xl text-xs focus:outline-none focus:border-amber-500 font-mono font-bold"
                    autoFocus
                  />
                </div>
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">รายละเอียดและเหตุผลประกอบ</label>
                <textarea
                  required
                  rows={2}
                  placeholder="เช่น: ค่าน้ำแข็งด่วนหน้าร้าน, จ่ายทิปรายวันให้เด็กเสิร์ฟ, ค่าบริการจัดส่งพัสดุเร่งด่วน..."
                  value={expenseDescription}
                  onChange={(e) => setExpenseDescription(e.target.value)}
                  className="w-full bg-[#0B131E] border border-[#1A2C42] text-white px-3 py-2 rounded-xl text-xs focus:outline-none focus:border-amber-500 placeholder-slate-500 leading-relaxed font-medium"
                />
              </div>

              {/* Date */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">วันที่บันทึกรายการ</label>
                <input
                  type="date"
                  required
                  value={expenseDate}
                  onChange={(e) => setExpenseDate(e.target.value)}
                  className="w-full bg-[#0B131E] border border-[#1A2C42] text-white px-3 py-2 rounded-xl text-xs focus:outline-none focus:border-amber-500 font-mono font-bold"
                />
              </div>

              {/* Submit / Cancel Buttons */}
              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowQuickExpense(false)}
                  className="flex-1 bg-[#1A2C42] hover:bg-[#253B55] text-slate-300 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-550 text-slate-950 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer shadow-lg shadow-amber-950/20"
                >
                  บันทึกรายการ
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* Quick Expense Success Toast */}
      {expenseSuccessToast && (
        <div className={`fixed right-6 z-50 bg-[#0F1D30] border border-emerald-500/30 text-slate-100 px-4 py-3 rounded-xl shadow-2xl flex items-center gap-3 animate-bounce max-w-sm border-l-4 border-l-emerald-500 transition-all duration-300 ${
          cart.length > 0 && activePosTab === 'menu' ? 'bottom-44' : 'bottom-20'
        } lg:bottom-24 lg:right-10`}>
          <div className="bg-emerald-500/20 text-emerald-400 p-1.5 rounded-full shrink-0">
            <Check className="w-4 h-4" />
          </div>
          <p className="text-[11px] font-bold">{expenseSuccessToast}</p>
          <button 
            type="button"
            onClick={() => setExpenseSuccessToast(null)}
            className="text-slate-500 hover:text-slate-300 ml-1 cursor-pointer shrink-0"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* PARKED ORDERS RECALL MODAL */}
      {showRecallModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#0F1D30] border border-[#1A2C42] rounded-3xl w-full max-w-lg p-6 shadow-2xl space-y-4 max-h-[80vh] flex flex-col">
            <div className="flex justify-between items-center border-b border-[#1A2C42]/60 pb-3 shrink-0 text-slate-100">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-amber-450" />
                <div>
                  <h3 className="font-bold text-white text-base">รายการออเดอร์ที่พักไว้ (Parked Orders Queue)</h3>
                  <p className="text-[11px] text-slate-400">ดึงบิลที่จอดค้างกลับมาทำรายการต่อ หรือลบประวัติที่จดค้างไว้ได้สะดวก</p>
                </div>
              </div>
              <button
                onClick={() => setShowRecallModal(false)}
                className="text-slate-400 hover:text-white text-sm font-bold"
              >
                ✕ ปิด
              </button>
            </div>

            <div className="overflow-y-auto space-y-3 flex-1 pr-1 text-slate-100">
              {parkedOrders.length === 0 ? (
                <div className="text-center py-16 text-slate-500 bg-black/25 border border-[#1A2C42] rounded-2xl">
                  <Clock className="w-8 h-8 text-slate-700 mx-auto mb-2" />
                  <p className="text-xs font-bold text-slate-400">ไม่มีบิลที่จอดพักไว้ในขณะนี้</p>
                  <p className="text-[10px] text-slate-600 mt-1">สามารถกดพักออเดอร์ที่มีของในตะกร้าได้จากปุ่ม "พักบิล"</p>
                </div>
              ) : (
                parkedOrders.map((parked) => (
                  <div key={parked.id} className="bg-black/20 border border-[#1A2C42] rounded-2xl p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[10px] font-bold rounded-md">
                          บิลพักโต๊ะ {parked.tableNo === 'TakeAway' ? 'กลับบ้าน' : parked.tableNo}
                        </span>
                        <span className="text-[10px] text-slate-500 font-mono">
                          ID: {parked.id.substring(5, 12)}
                        </span>
                      </div>
                      <p className="text-xs font-bold text-slate-200">
                        รายการอาหาร ({parked.cart.reduce((sum, item) => sum + item.quantity, 0)} ชิ้น):
                      </p>
                      <p className="text-[10px] text-slate-450 line-clamp-1">
                        {parked.cart.map(i => `${i.name} x${i.quantity}`).join(', ')}
                      </p>
                      <p className="text-[10px] text-slate-500">
                        จอดเมื่อ: {new Date(parked.timestamp).toLocaleTimeString('th-TH')} ({new Date(parked.timestamp).toLocaleDateString('th-TH')})
                      </p>
                    </div>

                    <div className="flex sm:flex-col items-end gap-2 w-full sm:w-auto shrink-0">
                      <span className="text-xs font-black text-red-500 font-mono">
                        ยอดสุทธิ: ฿{parked.total.toLocaleString()}
                      </span>
                      <div className="flex gap-1.5 w-full sm:w-auto">
                        <button
                          onClick={() => handleRecallOrder(parked)}
                          className="flex-1 sm:flex-none px-3 py-1.5 bg-sky-600 hover:bg-sky-500 text-white font-bold rounded-lg text-[11px] transition-all cursor-pointer"
                        >
                          ดึงคืน (Recall)
                        </button>
                        <button
                          onClick={() => handleDeleteParked(parked.id)}
                          className="px-2.5 py-1.5 bg-red-950/40 hover:bg-red-600/20 text-red-400 hover:text-white rounded-lg text-[11px] border border-red-900/30 transition-all cursor-pointer"
                          title="ลบ"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="flex justify-end pt-2 shrink-0">
              <button
                onClick={() => setShowRecallModal(false)}
                className="px-5 py-2 bg-[#0B131E] border border-[#1A2C42] text-xs text-slate-400 font-bold rounded-xl hover:text-white transition-all cursor-pointer"
              >
                ปิดหน้าต่าง
              </button>
            </div>
          </div>
        </div>
      )}

      {/* QUICK ADD MODAL (F2/Alt+Q Shortcut) */}
      {showQuickAddModal && (() => {
        const matches = getFilteredQuickItems(quickAddSearchTerm);
        return (
          <div className="fixed inset-0 bg-black/85 flex items-center justify-center p-4 z-50 backdrop-blur-sm animate-in fade-in duration-150">
            <div className="bg-[#0F1D30] border border-[#1A2C42] rounded-3xl w-full max-w-2xl p-6 shadow-2xl flex flex-col max-h-[85vh] text-slate-100">
              
              {/* Header */}
              <div className="flex justify-between items-center border-b border-[#1A2C42]/60 pb-3.5 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="bg-amber-500/10 text-amber-400 p-2 rounded-xl border border-amber-500/20">
                    <span className="text-base font-black leading-none">⚡</span>
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-base">ค้นหาด่วนและเพิ่มเมนูอาหาร (Keyboard Quick Add)</h3>
                    <p className="text-[11px] text-slate-400">
                      ใช้แป้นพิมพ์เพื่อค้นหาและกด <kbd className="px-1.5 py-0.5 bg-slate-800 text-amber-400 border border-slate-700 rounded text-[9px] font-mono">Enter</kbd> เพื่อเพิ่มอาหารในตะกร้าโดยไม่ต้องใช้เมาส์
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowQuickAddModal(false)}
                  className="text-slate-400 hover:text-white text-sm font-bold bg-[#1A2C42] hover:bg-red-600 w-8 h-8 rounded-full flex items-center justify-center transition-all cursor-pointer shrink-0"
                >
                  ✕
                </button>
              </div>

              {/* Dynamic Success Notification inside Modal */}
              {quickAddSuccessMsg && (
                <div className="mt-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 animate-in slide-in-from-top-1 duration-150 shrink-0">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>{quickAddSuccessMsg}</span>
                </div>
              )}

              {/* Main search and options area */}
              <div className="mt-4 space-y-4 shrink-0">
                {/* Search input inside modal */}
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-500" />
                  <input
                    ref={quickAddInputRef}
                    type="text"
                    placeholder="พิมพ์รหัสสินค้า เช่น m1 หรือพิมพ์ชื่อ เช่น กะเพรา, ชาไทย..."
                    value={quickAddSearchTerm}
                    onChange={(e) => {
                      setQuickAddSearchTerm(e.target.value);
                      setQuickAddSelectedIndex(0);
                    }}
                    className="w-full bg-[#0B131E] border-2 border-amber-500/40 focus:border-amber-500 text-white rounded-2xl py-3.5 pl-11 pr-4 text-sm font-bold focus:outline-none transition-all placeholder-slate-500"
                  />
                  {quickAddSearchTerm && (
                    <button
                      onClick={() => {
                        setQuickAddSearchTerm('');
                        setQuickAddSelectedIndex(0);
                        quickAddInputRef.current?.focus();
                      }}
                      className="absolute right-4 top-1/2 -translate-y-1/2 p-1 hover:bg-slate-800 rounded-full text-slate-400 hover:text-white"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Egg toggler option */}
                <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-950/40 border border-[#1A2C42] px-4 py-3 rounded-2xl">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-300 font-bold">🍳 ออพชั่นไข่ดาวสุก/กรอบล่วงหน้า (Fried Egg option):</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-md font-bold ${quickAddAddEgg ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'bg-slate-800 text-slate-400'}`}>
                      {quickAddAddEgg ? 'เพิ่มไข่ดาว (+10 ฿)' : 'ไม่เพิ่มไข่ดาว'}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setQuickAddAddEgg(prev => !prev)}
                    className="px-4 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black rounded-lg transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <span>{quickAddAddEgg ? 'ปิดไข่ดาว' : 'เปิดไข่ดาว'}</span>
                    <span className="text-[10px] opacity-70 font-mono font-bold">[Ctrl+Space]</span>
                  </button>
                </div>
              </div>

              {/* Items List area */}
              <div className="mt-4 flex-1 overflow-y-auto min-h-[150px] border border-[#1A2C42] rounded-2xl bg-slate-950/60">
                {matches.length === 0 ? (
                  <div className="text-center py-16 text-slate-500">
                    <CircleAlert className="w-8 h-8 text-slate-700 mx-auto mb-2" />
                    <p className="text-xs font-bold text-slate-400">ไม่พบรายการเมนูที่ระบุในคำค้นหา</p>
                    <p className="text-[10px] text-slate-600 mt-1">กรุณาลองป้อนข้อความใหม่อีกครั้ง</p>
                  </div>
                ) : (
                  <div className="divide-y divide-[#1A2C42]/50">
                    {matches.map((item, index) => {
                      const isSelected = index === (quickAddSelectedIndex % matches.length);
                      const isDrink = item.category === 'เครื่องดื่ม' || item.category === 'ซุป/แกง';
                      return (
                        <div
                          key={item.id}
                          onClick={() => addQuickItemToCart(item, quickAddAddEgg)}
                          className={`p-3.5 flex items-center justify-between gap-4 transition-all cursor-pointer select-none ${
                            isSelected
                              ? 'bg-amber-500/10 border-l-4 border-l-amber-500 text-white'
                              : 'hover:bg-slate-900/30 text-slate-300'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            {/* Selected pointer / Index badge */}
                            <span className={`w-6 h-6 flex items-center justify-center rounded-lg text-[10px] font-black font-mono border ${
                              isSelected 
                                ? 'bg-amber-500 border-amber-400 text-slate-950' 
                                : 'bg-[#0B131E] border-[#1E2E42] text-slate-500'
                            }`}>
                              {isSelected ? '✓' : index + 1}
                            </span>

                            {/* Item ID/Code */}
                            <span className="px-2 py-0.5 bg-slate-900 border border-slate-800 text-slate-400 font-mono text-[10px] font-bold rounded-md uppercase shrink-0">
                              {item.id}
                            </span>

                            {/* Info */}
                            <div>
                              <p className={`text-xs font-bold ${isSelected ? 'text-amber-400' : 'text-slate-200'}`}>
                                {item.name}
                              </p>
                              <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider leading-none mt-0.5">
                                {item.category} {!isDrink && quickAddAddEgg && '• รวมไข่ดาว (+10 ฿)'}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-4 shrink-0">
                            <span className="text-xs font-black font-mono text-slate-200">
                              ฿{item.price + (!isDrink && quickAddAddEgg ? 10 : 0)}
                            </span>
                            <span className={`text-[10px] font-bold px-2 py-1 rounded-lg border transition-all ${
                              isSelected 
                                ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' 
                                : 'bg-slate-900 text-slate-400 border-transparent'
                            }`}>
                              กด Enter เพื่อเพิ่ม
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Cheatsheet Footer */}
              <div className="mt-4 shrink-0 border-t border-[#1A2C42]/60 pt-4 flex flex-wrap items-center justify-between gap-3 text-[10px] text-slate-400 font-semibold">
                <div className="flex flex-wrap gap-4">
                  <div className="flex items-center gap-1.5">
                    <kbd className="px-1.5 py-0.5 bg-slate-950 border border-slate-800 rounded font-mono text-[9px]">↑ / ↓</kbd>
                    <span>เลื่อนเลือก</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <kbd className="px-1.5 py-0.5 bg-slate-950 border border-slate-800 rounded font-mono text-[9px]">Enter</kbd>
                    <span>เพิ่มเข้าตะกร้า</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <kbd className="px-1.5 py-0.5 bg-slate-950 border border-slate-800 rounded font-mono text-[9px]">Ctrl + Space</kbd>
                    <span>สลับไข่ดาว</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <kbd className="px-1.5 py-0.5 bg-slate-950 border border-slate-800 rounded font-mono text-[9px]">Esc</kbd>
                    <span>ปิดหน้าต่าง</span>
                  </div>
                </div>

                <div className="text-amber-500 font-bold">
                  เปิดด่วนได้ตลอดเวลาด้วยคีย์ F2 หรือ Alt + Q
                </div>
              </div>

            </div>
          </div>
        );
      })()}

      {/* Floating Action Button (FAB) for Streamlining Cashier Workflows */}
      <div id="cashier-fab-container" className="fixed bottom-6 right-6 z-[80] flex flex-col items-end gap-3 select-none">
        {/* Expanded actions list when open */}
        {showFabMenu && (
          <div id="cashier-fab-menu" className="flex flex-col items-end gap-2.5 mb-2 transition-all duration-300 animate-in fade-in slide-in-from-bottom-5">
            {/* Action 1: Open Cash Drawer */}
            <div className="flex items-center gap-3">
              <span className="bg-[#0F1D30] border border-[#1A2C42] text-xs font-bold text-slate-100 px-3 py-1.5 rounded-xl shadow-lg whitespace-nowrap">
                เปิดลิ้นชักเก็บเงิน (Open Drawer)
              </span>
              <button
                id="fab-action-drawer"
                type="button"
                onClick={handleOpenCashDrawer}
                className="w-12 h-12 rounded-full bg-amber-500 hover:bg-amber-400 text-slate-950 flex items-center justify-center shadow-xl transition-all duration-200 active:scale-95 cursor-pointer"
                title="เปิดลิ้นชักเก็บเงิน"
              >
                <FolderOpen className="w-5 h-5" />
              </button>
            </div>

            {/* Action 2: Reprint Last Receipt */}
            <div className="flex items-center gap-3">
              <span className="bg-[#0F1D30] border border-[#1A2C42] text-xs font-bold text-slate-100 px-3 py-1.5 rounded-xl shadow-lg whitespace-nowrap">
                พิมพ์ใบเสร็จล่าสุดซ้ำ (Reprint Receipt)
              </span>
              <button
                id="fab-action-reprint"
                type="button"
                onClick={handleReprintLastReceipt}
                className="w-12 h-12 rounded-full bg-blue-500 hover:bg-blue-400 text-white flex items-center justify-center shadow-xl transition-all duration-200 active:scale-95 cursor-pointer"
                title="พิมพ์ใบเสร็จล่าสุดอีกครั้ง"
              >
                <Printer className="w-5 h-5" />
              </button>
            </div>

            {/* Action 3: Toggle Discount */}
            <div className="flex items-center gap-3">
              <span className="bg-[#0F1D30] border border-[#1A2C42] text-xs font-bold text-slate-100 px-3 py-1.5 rounded-xl shadow-lg whitespace-nowrap">
                {manualDiscount > 0 ? 'ยกเลิกส่วนลดผู้จัดการ' : 'ใส่ส่วนลดผู้จัดการ 10% (Toggle Discount)'}
              </span>
              <button
                id="fab-action-discount"
                type="button"
                onClick={handleToggleFABDiscount}
                className={`w-12 h-12 rounded-full flex items-center justify-center shadow-xl transition-all duration-200 active:scale-95 cursor-pointer ${
                  manualDiscount > 0
                    ? 'bg-red-500 hover:bg-red-400 text-white'
                    : 'bg-emerald-500 hover:bg-emerald-400 text-white'
                }`}
                title="เปิด/ปิด ส่วนลดผู้จัดการ"
              >
                <Percent className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}

        {/* Main Floating Action Trigger Button */}
        <button
          id="cashier-main-fab"
          type="button"
          onClick={() => setShowFabMenu(!showFabMenu)}
          className={`w-14 h-14 rounded-full flex items-center justify-center shadow-2xl transition-all duration-300 transform active:scale-90 cursor-pointer ${
            showFabMenu
              ? 'bg-[#1E2E42] text-white border border-slate-700 hover:bg-slate-800 rotate-90'
              : 'bg-gradient-to-r from-red-600 to-amber-600 text-white hover:from-red-500 hover:to-amber-500 hover:scale-105 shadow-red-900/30'
          }`}
          title="ควิกแอคชันแคชเชียร์ (Cashier Quick Actions)"
        >
          {showFabMenu ? (
            <X className="w-6 h-6" />
          ) : (
            <Sparkles className="w-6 h-6 animate-pulse" />
          )}
        </button>
      </div>

      {/* Floating Success Toast (When receipt preview is disabled) */}
      {lastCompletedOrderToast && (
        <div className="fixed bottom-24 right-6 z-50 bg-slate-900 border border-emerald-500/50 text-white p-3.5 rounded-2xl shadow-2xl flex items-center gap-3 animate-fadeIn backdrop-blur-md">
          <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-sm">
            ✓
          </div>
          <div>
            <p className="text-xs font-bold text-white">ชำระเงินสำเร็จแล้ว!</p>
            <p className="text-[11px] text-slate-400 font-mono">
              {lastCompletedOrderToast.soNumber || lastCompletedOrderToast.id} • {lastCompletedOrderToast.total.toLocaleString()} {currency}
            </p>
          </div>
          <div className="flex items-center gap-1.5 ml-2">
            <button
              onClick={() => {
                setShowReceipt(lastCompletedOrderToast);
                setLastCompletedOrderToast(null);
              }}
              className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 shadow"
            >
              <Receipt className="w-3.5 h-3.5" /> ดูใบเสร็จ
            </button>
            <button
              onClick={() => setLastCompletedOrderToast(null)}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
