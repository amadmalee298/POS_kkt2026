import React, { useState, useEffect } from 'react';
import { MenuItem, Recipe, Ingredient, Promotion, Order, OrderItem, OrderSplit, StoreSettings } from '../types';
import { 
  Flame, ShoppingBag, Plus, Minus, Check, Clock, 
  Tag, Sparkles, AlertCircle, ArrowLeft, Utensils, QrCode, ChevronRight, X
} from 'lucide-react';

interface QRClientOrderProps {
  tableNo: string;
  menuItems: MenuItem[];
  recipes: Recipe[];
  ingredients: Ingredient[];
  promotions: Promotion[];
  storeSettings: StoreSettings;
  onOrderCompleted: (newOrder: Order, updatedIngredientsList: Ingredient[]) => void;
  orders: Order[];
  onUpdateOrders?: (orders: Order[]) => void;
}

export default function QRClientOrder({
  tableNo,
  menuItems,
  recipes,
  ingredients,
  promotions,
  storeSettings,
  onOrderCompleted,
  orders,
  onUpdateOrders
}: QRClientOrderProps) {
  // Local states
  const [selectedCategory, setSelectedCategory] = useState<string>('ทั้งหมด');
  const [cart, setCart] = useState<OrderItem[]>([]);
  const [showCart, setShowCart] = useState<boolean>(false);
  const [checkoutMode, setCheckoutMode] = useState<'NONE' | 'CASH' | 'PROMPTPAY'>('NONE');
  
  // Customizer states
  const [customizingItem, setCustomizingItem] = useState<MenuItem | null>(null);
  const [addEgg, setAddEgg] = useState<boolean>(true);
  const [itemNote, setItemNote] = useState<string>('');

  // Promo code states
  const [promoCode, setPromoCode] = useState<string>('');
  const [activeDiscount, setActiveDiscount] = useState<Promotion | null>(null);

  // Active placed order state for tracking
  const [trackedOrderId, setTrackedOrderId] = useState<string | null>(null);
  const [customerNickname, setCustomerNickname] = useState<string>('');

  // Split bill states
  const [splitMode, setSplitMode] = useState<boolean>(false);
  const [splitType, setSplitType] = useState<'ITEMS' | 'PERCENTAGE'>('PERCENTAGE');
  const [numPercentSplits, setNumPercentSplits] = useState<number>(2);
  const [activePayingSplitId, setActivePayingSplitId] = useState<string | null>(null);
  const [splitNames, setSplitNames] = useState<string[]>(['คนแรก', 'คนที่สอง', 'คนที่สาม', 'คนที่สี่', 'คนที่ห้า', 'คนที่หก']);
  const [itemSplitAssignments, setItemSplitAssignments] = useState<Record<string, Record<number, number>>>({});
  const [numItemSplits, setNumItemSplits] = useState<number>(2);

  const handleConfirmPercentageSplit = (order: Order) => {
    const total = order.total;
    const share = Math.round((total / numPercentSplits) * 100) / 100;
    
    const splits: OrderSplit[] = [];
    for (let i = 0; i < numPercentSplits; i++) {
      const isLast = i === numPercentSplits - 1;
      const splitTotal = isLast ? (total - (share * (numPercentSplits - 1))) : share;
      
      splits.push({
        id: `split-${Date.now()}-${i}`,
        name: splitNames[i] || `คนที่ ${i + 1}`,
        type: 'PERCENTAGE',
        percentage: 100 / numPercentSplits,
        total: Math.max(0, splitTotal),
        paymentStatus: 'PENDING'
      });
    }
    
    const updatedOrder: Order = {
      ...order,
      splits: splits
    };
    
    if (onUpdateOrders) {
      onUpdateOrders(orders.map(o => o.id === order.id ? updatedOrder : o));
    }
    setSplitMode(false);
  };

  const handleConfirmItemsSplit = (order: Order) => {
    const splits: OrderSplit[] = [];
    
    for (let s = 0; s < numItemSplits; s++) {
      splits.push({
        id: `split-${Date.now()}-${s}`,
        name: splitNames[s] || `กลุ่มที่ ${s + 1}`,
        type: 'ITEMS',
        items: [],
        total: 0,
        paymentStatus: 'PENDING'
      });
    }
    
    order.items.forEach(orderItem => {
      const assignments = itemSplitAssignments[orderItem.id] || {};
      for (let s = 0; s < numItemSplits; s++) {
        const qty = assignments[s] || 0;
        if (qty > 0) {
          splits[s].items?.push({
            orderItemId: orderItem.id,
            quantity: qty
          });
        }
      }
    });
    
    let totalSubtotalAllocated = 0;
    const splitSubtotals = splits.map(split => {
      let sub = 0;
      split.items?.forEach(si => {
        const originalItem = order.items.find(oi => oi.id === si.orderItemId);
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
    for (let s = 0; s < numItemSplits; s++) {
      const isLast = s === numItemSplits - 1;
      const ratio = totalSubtotalAllocated > 0 ? (splitSubtotals[s] / totalSubtotalAllocated) : 0;
      let splitTotal = Math.round(ratio * order.total);
      
      if (isLast) {
        splitTotal = Math.max(0, order.total - runningTotalAllocated);
      } else {
        runningTotalAllocated += splitTotal;
      }
      
      splits[s].total = splitTotal;
    }
    
    const finalSplits = splits.filter(s => s.total > 0);
    
    if (finalSplits.length === 0) {
      alert('กรุณาเลือกจัดสรรรายการอาหารอย่างถูกต้อง');
      return;
    }
    
    const updatedOrder: Order = {
      ...order,
      splits: finalSplits
    };
    
    if (onUpdateOrders) {
      onUpdateOrders(orders.map(o => o.id === order.id ? updatedOrder : o));
    }
    setSplitMode(false);
  };

  const handlePaySplit = (order: Order, splitId: string, method: 'CASH' | 'PROMPTPAY' | 'TRANSFER') => {
    if (!order.splits) return;
    
    const updatedSplits = order.splits.map(s => {
      if (s.id === splitId) {
        return {
          ...s,
          paymentStatus: 'PAID' as const,
          paymentMethod: method
        };
      }
      return s;
    });
    
    const allPaid = updatedSplits.every(s => s.paymentStatus === 'PAID');
    
    const updatedOrder: Order = {
      ...order,
      splits: updatedSplits,
      paymentStatus: allPaid ? 'PAID' as const : order.paymentStatus
    };
    
    if (onUpdateOrders) {
      onUpdateOrders(orders.map(o => o.id === order.id ? updatedOrder : o));
    }
    
    alert(`ชำระเงินสำเร็จสำหรับส่วนแบ่งของ "${updatedSplits.find(s => s.id === splitId)?.name}" เรียบร้อยแล้ว!`);
    setActivePayingSplitId(null);
  };

  const handleResetSplits = (order: Order) => {
    if (confirm('คุณต้องการยกเลิกการแบ่งบิลและกลับไปจ่ายรวมใช่หรือไม่?')) {
      const updatedOrder: Order = {
        ...order,
        splits: undefined
      };
      if (onUpdateOrders) {
        onUpdateOrders(orders.map(o => o.id === order.id ? updatedOrder : o));
      }
      setActivePayingSplitId(null);
    }
  };

  // Load cart from localStorage to survive reloads if any (table-specific)
  useEffect(() => {
    const savedCart = localStorage.getItem(`qr_cart_table_${tableNo}`);
    if (savedCart) {
      setCart(JSON.parse(savedCart));
    }
    const lastOrderId = localStorage.getItem(`qr_last_order_table_${tableNo}`);
    if (lastOrderId) {
      setTrackedOrderId(lastOrderId);
    }
    const savedNickname = localStorage.getItem(`qr_nickname_table_${tableNo}`);
    if (savedNickname) {
      setCustomerNickname(savedNickname);
    }
  }, [tableNo]);

  // Save cart to localStorage
  const saveCart = (newCart: OrderItem[]) => {
    setCart(newCart);
    localStorage.setItem(`qr_cart_table_${tableNo}`, JSON.stringify(newCart));
  };

  // Find tracked order in orders list
  const currentTrackedOrder = orders.find(o => o.id === trackedOrderId);

  // Categories list
  const categories = ['ทั้งหมด', ...Array.from(new Set(menuItems.map(m => m.category)))];

  // Filtered Menu Items
  const filteredMenuItems = selectedCategory === 'ทั้งหมด' 
    ? menuItems.filter(m => m.active) 
    : menuItems.filter(m => m.category === selectedCategory && m.active);

  // Cart operations
  const openCustomizer = (item: MenuItem) => {
    const isDrink = item.category === 'เครื่องดื่ม' || item.category === 'ซุป/แกง';
    setCustomizingItem(item);
    setAddEgg(!isDrink);
    setItemNote('');
  };

  const handleAddToCart = () => {
    if (!customizingItem) return;

    const eggPrice = addEgg ? 10 : 0;
    const notesStr = itemNote.trim();

    const existingIndex = cart.findIndex(
      (i) => i.menuItemId === customizingItem.id && 
             i.addFriedEgg === addEgg && 
             i.notes === notesStr
    );

    let newCart = [...cart];
    if (existingIndex > -1) {
      newCart[existingIndex].quantity += 1;
    } else {
      const newItem: OrderItem = {
        id: `qr-cart-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        menuItemId: customizingItem.id,
        name: customizingItem.name,
        price: customizingItem.price,
        quantity: 1,
        addFriedEgg: addEgg,
        eggPrice: eggPrice,
        notes: notesStr
      };
      newCart.push(newItem);
    }

    saveCart(newCart);
    setCustomizingItem(null);
  };

  const handleUpdateQty = (itemId: string, amount: number) => {
    const updated = cart.map(item => {
      if (item.id === itemId) {
        const newQty = item.quantity + amount;
        return newQty > 0 ? { ...item, quantity: newQty } : null;
      }
      return item;
    }).filter(Boolean) as OrderItem[];
    saveCart(updated);
  };

  const handleRemoveItem = (itemId: string) => {
    saveCart(cart.filter(item => item.id !== itemId));
  };

  // Computations
  const subtotal = cart.reduce((sum, item) => sum + (item.price + item.eggPrice) * item.quantity, 0);
  
  let promoDiscountAmt = 0;
  if (activeDiscount) {
    if (activeDiscount.type === 'PERCENT') {
      promoDiscountAmt = Math.round((subtotal * activeDiscount.value) / 100);
    } else {
      promoDiscountAmt = activeDiscount.value;
    }
  }

  const discountTotal = Math.min(subtotal, promoDiscountAmt);
  const total = Math.max(0, subtotal - discountTotal);

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

  const handlePlaceOrder = () => {
    if (cart.length === 0) return;

    // Simulate inventory check
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
          updatedIngredients[eggIndex].stock = Math.max(0, updatedIngredients[eggIndex].stock - cartItem.quantity);
        }
      }
    });

    const isAutoApprove = localStorage.getItem('qr_auto_approve') === 'true';
    const orderId = `QR-${1000 + Math.floor(Math.random() * 9000)}`;

    const finalTableNo = customerNickname.trim() 
      ? `${tableNo} (${customerNickname.trim()})` 
      : tableNo;

    const newOrder: Order = {
      id: orderId,
      branchId: 'b1',
      tableNo: finalTableNo,
      items: cart,
      subtotal: subtotal,
      discount: discountTotal,
      total: total,
      paymentMethod: checkoutMode === 'NONE' ? 'CASH' : checkoutMode,
      paymentStatus: checkoutMode === 'PROMPTPAY' ? 'PAID' : 'PENDING',
      kitchenStatus: isAutoApprove ? 'PENDING' : 'PENDING', // starts pending
      timestamp: new Date().toISOString(),
      cashierName: 'ลูกค้าสั่งผ่าน QR',
      isQROrder: true,
      qrStatus: isAutoApprove ? 'APPROVED' : 'PENDING_APPROVE'
    };

    onOrderCompleted(newOrder, updatedIngredients);

    // Save state
    localStorage.setItem(`qr_last_order_table_${tableNo}`, orderId);
    setTrackedOrderId(orderId);
    
    // Clear cart
    saveCart([]);
    setActiveDiscount(null);
    setCheckoutMode('NONE');
    setShowCart(false);

    alert('ส่งออเดอร์เรียบร้อยแล้ว! คุณสามารถติดตามสถานะการปรุงอาหารจากหน้าจอได้ทันที');
  };

  // Render Order Tracking screen
  if (trackedOrderId && currentTrackedOrder) {
    const isPendingApprove = currentTrackedOrder.qrStatus === 'PENDING_APPROVE';
    const isRejected = currentTrackedOrder.qrStatus === 'REJECTED';
    const kitchenStatus = currentTrackedOrder.kitchenStatus;

    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans max-w-md mx-auto relative border-x border-slate-900 shadow-2xl">
        {/* Header */}
        <div className="bg-slate-900/80 backdrop-blur-md p-4 border-b border-slate-800 sticky top-0 z-10 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Utensils className="w-5 h-5 text-red-500" />
            <div>
              <h1 className="font-bold text-sm tracking-tight">{storeSettings.storeName}</h1>
              <p className="text-[10px] text-slate-400">สถานะการสั่งซื้อ • โต๊ะ {tableNo}</p>
            </div>
          </div>
          <button 
            onClick={() => {
              if (confirm('คุณต้องการสั่งอาหารเพิ่มเติมสำหรับโต๊ะนี้ใช่หรือไม่?')) {
                localStorage.removeItem(`qr_last_order_table_${tableNo}`);
                setTrackedOrderId(null);
              }
            }}
            className="text-xs bg-red-600/10 hover:bg-red-600/20 text-red-400 font-bold px-3 py-1.5 rounded-xl border border-red-500/20 transition-all"
          >
            สั่งอาหารเพิ่ม +
          </button>
        </div>

        {/* Tracking Body */}
        <div className="flex-1 p-5 space-y-6 overflow-y-auto">
          {/* Order card */}
          <div className="bg-slate-900 rounded-2xl border border-slate-800 p-4 space-y-3">
            <div className="flex justify-between items-start border-b border-slate-800 pb-3">
              <div>
                <span className="text-[10px] text-slate-500 font-mono">ORDER ID</span>
                <h3 className="font-extrabold text-sm text-white font-mono">{currentTrackedOrder.id}</h3>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-slate-500 block">เวลาสั่งซื้อ</span>
                <span className="text-xs font-semibold text-slate-300">
                  {new Date(currentTrackedOrder.timestamp).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} น.
                </span>
              </div>
            </div>

            {/* Items */}
            <div className="space-y-2 py-1 max-h-40 overflow-y-auto">
              {currentTrackedOrder.items.map((item, idx) => (
                <div key={idx} className="flex justify-between text-xs text-slate-300">
                  <div className="flex gap-2">
                    <span className="text-red-500 font-bold font-mono">x{item.quantity}</span>
                    <div>
                      <span className="font-semibold">{item.name}</span>
                      {item.addFriedEgg && <span className="text-[10px] text-amber-500 block">+ เพิ่มไข่ดาว</span>}
                      {item.notes && <span className="text-[10px] text-slate-500 block">({item.notes})</span>}
                    </div>
                  </div>
                  <span className="font-mono">{(item.price + item.eggPrice) * item.quantity}฿</span>
                </div>
              ))}
            </div>

            {/* Pricing details */}
            <div className="border-t border-slate-800 pt-3 space-y-1.5 text-xs">
              <div className="flex justify-between text-slate-400">
                <span>ราคารวม</span>
                <span>{currentTrackedOrder.subtotal}฿</span>
              </div>
              {currentTrackedOrder.discount > 0 && (
                <div className="flex justify-between text-emerald-500">
                  <span>ส่วนลดคูปอง</span>
                  <span>-{currentTrackedOrder.discount}฿</span>
                </div>
              )}
              <div className="flex justify-between text-sm font-bold text-white pt-1">
                <span>ยอดชำระทั้งสิ้น</span>
                <span className="text-red-500 font-mono">{currentTrackedOrder.total}฿</span>
              </div>
            </div>
          </div>

          {/* Real-time Tracking Stepper */}
          <div className="space-y-6">
            <h4 className="text-xs font-bold text-slate-400 tracking-wider uppercase">ติดตามสถานะออเดอร์เรียลไทม์</h4>

            {isRejected ? (
              <div className="bg-red-950/20 border border-red-500/20 text-red-400 p-4 rounded-xl flex gap-3 items-center">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <div>
                  <h5 className="text-xs font-bold">ออเดอร์ถูกปฏิเสธ</h5>
                  <p className="text-[10px] text-red-400/80 mt-0.5">วัตถุดิบบางรายการหมด หรือการสั่งซื้อไม่สมบูรณ์ กรุณาติดต่อพนักงาน</p>
                </div>
              </div>
            ) : (
              <div className="relative pl-6 space-y-8 border-l border-slate-800 ml-3">
                {/* Step 1: Placed & Pending Cashier Approval */}
                <div className="relative">
                  <div className={`absolute -left-[31px] top-0 w-4 h-4 rounded-full border-4 flex items-center justify-center transition-all ${
                    isPendingApprove 
                      ? 'bg-amber-500 border-amber-950 animate-ping' 
                      : 'bg-emerald-500 border-emerald-950'
                  }`} />
                  <div className={`absolute -left-[31px] top-0 w-4 h-4 rounded-full border-4 flex items-center justify-center transition-all ${
                    isPendingApprove 
                      ? 'bg-amber-500 border-amber-950' 
                      : 'bg-emerald-500 border-emerald-950'
                  }`} />
                  <div className="space-y-1">
                    <h5 className={`text-xs font-bold ${isPendingApprove ? 'text-amber-400' : 'text-slate-200'}`}>
                      {isPendingApprove ? 'รอยืนยันออเดอร์จากพนักงาน' : 'ส่งรายการออเดอร์สำเร็จ'}
                    </h5>
                    <p className="text-[10px] text-slate-500">
                      {isPendingApprove ? 'ออเดอร์รอแคชเชียร์ตรวจสอบเพื่อส่งเข้าครัว' : 'พนักงานได้ยืนยันความถูกต้องของอาหารแล้ว'}
                    </p>
                  </div>
                </div>

                {/* Step 2: Kitchen Received & Cooking */}
                <div className="relative">
                  {/* Line completion indicator */}
                  <div className={`absolute -left-[31px] top-0 w-4 h-4 rounded-full border-4 flex items-center justify-center transition-all ${
                    kitchenStatus === 'COOKING'
                      ? 'bg-red-500 border-red-950 animate-ping'
                      : kitchenStatus === 'PENDING' && !isPendingApprove
                      ? 'bg-blue-500 border-blue-950'
                      : ['READY', 'SERVED'].includes(kitchenStatus)
                      ? 'bg-emerald-500 border-emerald-950'
                      : 'bg-slate-800 border-slate-950'
                  }`} />
                  <div className={`absolute -left-[31px] top-0 w-4 h-4 rounded-full border-4 flex items-center justify-center transition-all ${
                    kitchenStatus === 'COOKING'
                      ? 'bg-red-500 border-red-950'
                      : kitchenStatus === 'PENDING' && !isPendingApprove
                      ? 'bg-blue-500 border-blue-950'
                      : ['READY', 'SERVED'].includes(kitchenStatus)
                      ? 'bg-emerald-500 border-emerald-950'
                      : 'bg-slate-800 border-slate-950'
                  }`} />
                  <div className="space-y-1">
                    <h5 className={`text-xs font-bold ${
                      kitchenStatus === 'COOKING' ? 'text-red-400 font-extrabold' : 
                      ['READY', 'SERVED'].includes(kitchenStatus) ? 'text-slate-200 font-bold' : 'text-slate-500'
                    }`}>
                      {kitchenStatus === 'COOKING' ? 'กำลังปรุงอาหารอย่างพิถีพิถัน 🔥' : 'ห้องครัวรับรายการแล้ว'}
                    </h5>
                    <p className="text-[10px] text-slate-500">
                      {kitchenStatus === 'COOKING' ? 'เชฟกำลังปรุงอาหารตามคิวด้วยวัตถุดิบที่คัดสรร' : 'รายการอาหารอยู่ในคิวเตรียมปรุง'}
                    </p>
                  </div>
                </div>

                {/* Step 3: Food Ready */}
                <div className="relative">
                  <div className={`absolute -left-[31px] top-0 w-4 h-4 rounded-full border-4 flex items-center justify-center transition-all ${
                    kitchenStatus === 'READY'
                      ? 'bg-amber-500 border-amber-950 animate-ping'
                      : kitchenStatus === 'SERVED'
                      ? 'bg-emerald-500 border-emerald-950'
                      : 'bg-slate-800 border-slate-950'
                  }`} />
                  <div className={`absolute -left-[31px] top-0 w-4 h-4 rounded-full border-4 flex items-center justify-center transition-all ${
                    kitchenStatus === 'READY'
                      ? 'bg-amber-500 border-amber-950'
                      : kitchenStatus === 'SERVED'
                      ? 'bg-emerald-500 border-emerald-950'
                      : 'bg-slate-800 border-slate-950'
                  }`} />
                  <div className="space-y-1">
                    <h5 className={`text-xs font-bold ${
                      kitchenStatus === 'READY' ? 'text-amber-400 font-extrabold' : 
                      kitchenStatus === 'SERVED' ? 'text-slate-200' : 'text-slate-500'
                    }`}>
                      {kitchenStatus === 'READY' ? 'อาหารเสร็จแล้ว! กำลังนำไปเสิร์ฟ 🍳' : 'อาหารปรุงเสร็จ'}
                    </h5>
                    <p className="text-[10px] text-slate-500">
                      อาหารพร้อมเสิร์ฟ พนักงานกำลังจัดแต่งจานและเดินไปที่โต๊ะของท่าน
                    </p>
                  </div>
                </div>

                {/* Step 4: Served */}
                <div className="relative">
                  <div className={`absolute -left-[31px] top-0 w-4 h-4 rounded-full border-4 flex items-center justify-center transition-all ${
                    kitchenStatus === 'SERVED'
                      ? 'bg-emerald-500 border-emerald-950'
                      : 'bg-slate-800 border-slate-950'
                  }`} />
                  <div className="space-y-1">
                    <h5 className={`text-xs font-bold ${kitchenStatus === 'SERVED' ? 'text-emerald-400 font-extrabold' : 'text-slate-500'}`}>
                      เสิร์ฟอาหารเรียบร้อย ทานให้อร่อยนะคะ 😊
                    </h5>
                    <p className="text-[10px] text-slate-500">
                      อาหารทุกรายการได้รับการส่งมอบถึงโต๊ะของท่านเสร็จสมบูรณ์
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Split Bill section */}
          <div className="bg-slate-900 border border-slate-850 p-4 rounded-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="font-extrabold text-xs text-slate-200 flex items-center gap-1.5">
                <span className="text-amber-500 text-sm">📊</span> แยกจ่ายค่าอาหาร (Split Bill)
              </span>
              <span className="text-[9px] font-mono text-slate-500 uppercase">Proportional Split</span>
            </div>

            {/* A. If split does not exist and splitMode is false, show "Start Split" button */}
            {!currentTrackedOrder.splits && !splitMode && (
              <div className="text-center py-2 space-y-2">
                <p className="text-[10px] text-slate-400">
                  คุณสามารถแยกชำระเงินกับกลุ่มเพื่อนเป็นสัดส่วน หรือแยกจ่ายตามรายการอาหารที่ทานได้สะดวกสบาย
                </p>
                <button
                  onClick={() => {
                    setSplitMode(true);
                    // Initialize empty assignments
                    const initialAssignments: Record<string, Record<number, number>> = {};
                    currentTrackedOrder.items.forEach(item => {
                      initialAssignments[item.id] = { 0: item.quantity };
                    });
                    setItemSplitAssignments(initialAssignments);
                  }}
                  className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white rounded-xl text-xs font-bold transition-all shadow hover:scale-[1.02] active:scale-[0.98]"
                >
                  ➕ เริ่มแบ่งบิลชำระเงิน (Split Bill Now)
                </button>
              </div>
            )}

            {/* B. Split configuration mode is active */}
            {splitMode && (
              <div className="space-y-4 text-xs animate-in fade-in duration-200">
                {/* Mode Selector */}
                <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-850 text-[10px] font-bold">
                  <button
                    type="button"
                    onClick={() => setSplitType('PERCENTAGE')}
                    className={`flex-1 py-1.5 rounded-lg transition-all ${
                      splitType === 'PERCENTAGE'
                        ? 'bg-indigo-600 text-white'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    แบ่งจ่ายเท่ากัน (%)
                  </button>
                  <button
                    type="button"
                    onClick={() => setSplitType('ITEMS')}
                    className={`flex-1 py-1.5 rounded-lg transition-all ${
                      splitType === 'ITEMS'
                        ? 'bg-indigo-600 text-white'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    แบ่งจ่ายตามอาหารที่สั่ง
                  </button>
                </div>

                {/* Percentage configuration */}
                {splitType === 'PERCENTAGE' && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-slate-300 font-bold">จำนวนคนร่วมหาร:</span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setNumPercentSplits(prev => Math.max(2, prev - 1))}
                          className="w-7 h-7 bg-slate-800 rounded-lg text-slate-300 flex items-center justify-center font-bold hover:bg-slate-750"
                        >
                          -
                        </button>
                        <span className="text-xs font-mono font-bold text-white px-1">{numPercentSplits}</span>
                        <button
                          type="button"
                          onClick={() => setNumPercentSplits(prev => Math.min(6, prev + 1))}
                          className="w-7 h-7 bg-slate-800 rounded-lg text-slate-300 flex items-center justify-center font-bold hover:bg-slate-750"
                        >
                          +
                        </button>
                      </div>
                    </div>

                    {/* Custom names */}
                    <div className="space-y-2 bg-slate-950/60 p-3 rounded-xl border border-slate-850">
                      <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">ระบุชื่อผู้จ่ายเงิน (Optional)</span>
                      <div className="grid grid-cols-2 gap-2">
                        {Array.from({ length: numPercentSplits }).map((_, i) => (
                          <div key={i} className="flex flex-col gap-1">
                            <span className="text-[9px] text-slate-500 font-bold">คนที่ {i + 1}</span>
                            <input
                              type="text"
                              value={splitNames[i] || ''}
                              onChange={(e) => {
                                const newNames = [...splitNames];
                                newNames[i] = e.target.value;
                                setSplitNames(newNames);
                              }}
                              placeholder={`เช่น คุณ${String.fromCharCode(65 + i)}`}
                              className="bg-slate-900 border border-slate-800 rounded-lg px-2 py-1 text-[11px] text-white focus:outline-none focus:border-indigo-500"
                            />
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="text-center text-[11px] text-slate-400 bg-slate-950 p-2.5 rounded-xl border border-slate-850">
                      <span>หารเท่ากันท่านละ: </span>
                      <span className="font-mono font-black text-amber-400 text-sm">
                        ฿{Math.round((currentTrackedOrder.total / numPercentSplits) * 100 / 100).toLocaleString()}
                      </span>
                    </div>

                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setSplitMode(false)}
                        className="flex-1 py-2 bg-slate-800 hover:bg-slate-750 text-slate-400 rounded-xl text-xs font-bold"
                      >
                        ยกเลิก
                      </button>
                      <button
                        type="button"
                        onClick={() => handleConfirmPercentageSplit(currentTrackedOrder)}
                        className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold"
                      >
                        ตกลงแบ่งบิล
                      </button>
                    </div>
                  </div>
                )}

                {/* Items configuration */}
                {splitType === 'ITEMS' && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-slate-300 font-bold">จำนวนกลุ่มคนหาร:</span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setNumItemSplits(prev => Math.max(2, prev - 1))}
                          className="w-7 h-7 bg-slate-800 rounded-lg text-slate-300 flex items-center justify-center font-bold hover:bg-slate-750"
                        >
                          -
                        </button>
                        <span className="text-xs font-mono font-bold text-white px-1">{numItemSplits}</span>
                        <button
                          type="button"
                          onClick={() => setNumItemSplits(prev => Math.min(6, prev + 1))}
                          className="w-7 h-7 bg-slate-800 rounded-lg text-slate-300 flex items-center justify-center font-bold hover:bg-slate-750"
                        >
                          +
                        </button>
                      </div>
                    </div>

                    {/* Custom group names */}
                    <div className="space-y-2 bg-slate-950/60 p-3 rounded-xl border border-slate-850">
                      <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">ชื่อของแต่ละกลุ่ม (Optional)</span>
                      <div className="grid grid-cols-2 gap-2">
                        {Array.from({ length: numItemSplits }).map((_, i) => (
                          <div key={i} className="flex flex-col gap-1">
                            <span className="text-[9px] text-slate-500 font-bold">กลุ่มที่ {i + 1}</span>
                            <input
                              type="text"
                              value={splitNames[i] || ''}
                              onChange={(e) => {
                                const newNames = [...splitNames];
                                newNames[i] = e.target.value;
                                setSplitNames(newNames);
                              }}
                              placeholder={`กลุ่มที่ ${i + 1}`}
                              className="bg-slate-900 border border-slate-800 rounded-lg px-2 py-1 text-[11px] text-white focus:outline-none focus:border-indigo-500"
                            />
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Item Assignment Grid */}
                    <div className="space-y-2">
                      <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">เลือกผู้จ่ายเงินให้กับเมนูแต่ละจาน</span>
                      <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                        {currentTrackedOrder.items.map(item => {
                          const assignments = itemSplitAssignments[item.id] || {};
                          const totalAssigned = (Object.values(assignments) as number[]).reduce((sum, q) => sum + (Number(q) || 0), 0);
                          const unassignedQty = Math.max(0, item.quantity - totalAssigned);

                          return (
                            <div key={item.id} className="bg-slate-950 p-2.5 rounded-xl border border-slate-850 space-y-2">
                              <div className="flex justify-between items-start">
                                <span className="font-bold text-[11px] text-slate-200">
                                  {item.name} {item.addFriedEgg && <span className="text-amber-500 text-[10px]">(ไข่ดาว)</span>}
                                </span>
                                <span className="font-mono text-[10px] bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded-md">
                                  จำนวน {item.quantity} จาน
                                </span>
                              </div>

                              {/* Grid for each split selector */}
                              <div className="grid grid-cols-2 gap-2">
                                {Array.from({ length: numItemSplits }).map((_, sIndex) => {
                                  const curQty = assignments[sIndex] || 0;
                                  return (
                                    <div key={sIndex} className="flex items-center justify-between bg-slate-900 px-2 py-1 rounded-lg border border-slate-800">
                                      <span className="text-[10px] text-slate-400 truncate max-w-[50px]">
                                        {splitNames[sIndex] || `กลุ่มที่ ${sIndex + 1}`}
                                      </span>
                                      <div className="flex items-center gap-1.5 shrink-0">
                                        <button
                                          type="button"
                                          disabled={curQty <= 0}
                                          onClick={() => {
                                            const updated = { ...itemSplitAssignments };
                                            if (!updated[item.id]) updated[item.id] = {};
                                            updated[item.id][sIndex] = Math.max(0, curQty - 1);
                                            setItemSplitAssignments(updated);
                                          }}
                                          className="w-5 h-5 bg-slate-800 hover:bg-slate-750 text-slate-200 rounded flex items-center justify-center font-bold text-[10px] disabled:opacity-30"
                                        >
                                          -
                                        </button>
                                        <span className="font-mono font-bold text-[10px] min-w-[10px] text-center text-white">
                                          {curQty}
                                        </span>
                                        <button
                                          type="button"
                                          disabled={unassignedQty <= 0}
                                          onClick={() => {
                                            const updated = { ...itemSplitAssignments };
                                            if (!updated[item.id]) updated[item.id] = {};
                                            updated[item.id][sIndex] = curQty + 1;
                                            setItemSplitAssignments(updated);
                                          }}
                                          className="w-5 h-5 bg-slate-800 hover:bg-slate-750 text-slate-200 rounded flex items-center justify-center font-bold text-[10px] disabled:opacity-30"
                                        >
                                          +
                                        </button>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>

                              {unassignedQty > 0 && (
                                <p className="text-[9px] text-rose-400 font-bold block text-right mt-1">
                                  ⚠️ ยังไม่ได้จัดสรรอีก {unassignedQty} จาน
                                </p>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <div className="flex gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => setSplitMode(false)}
                        className="flex-1 py-2 bg-slate-800 hover:bg-slate-750 text-slate-400 rounded-xl text-xs font-bold"
                      >
                        ยกเลิก
                      </button>
                      <button
                        type="button"
                        onClick={() => handleConfirmItemsSplit(currentTrackedOrder)}
                        className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold"
                      >
                        ยืนยันแบ่งตามเมนู
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* C. Splits have been created, show splits list with individual payment controls */}
            {currentTrackedOrder.splits && !splitMode && (
              <div className="space-y-3">
                <p className="text-[10px] text-slate-400">
                  บิลนี้ได้รับการแบ่งยอดชำระเงินออกเป็น <b>{currentTrackedOrder.splits.length} ส่วน</b> เรียบร้อยแล้ว สามารถแชร์หน้าจอนี้ให้เพื่อนสแกนชำระเงินส่วนตนเองได้ทีละคนเลยค่ะ
                </p>

                <div className="space-y-2">
                  {currentTrackedOrder.splits.map((split) => {
                    const isPaid = split.paymentStatus === 'PAID';
                    const isPayingThis = activePayingSplitId === split.id;

                    return (
                      <div key={split.id} className={`p-3 rounded-xl border transition-all ${
                        isPaid 
                          ? 'bg-emerald-950/20 border-emerald-900/40 text-emerald-300' 
                          : isPayingThis 
                            ? 'bg-indigo-950/40 border-indigo-500/50 text-indigo-200'
                            : 'bg-slate-950 border-slate-850 text-slate-300'
                      }`}>
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="font-extrabold text-[11px] flex items-center gap-1">
                              👤 {split.name}
                              {isPaid && <span className="text-[9px] bg-emerald-900/50 text-emerald-400 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider ml-1">PAID</span>}
                            </span>
                            
                            {/* Display items in this split if split by items */}
                            {split.type === 'ITEMS' && split.items && split.items.length > 0 && (
                              <div className="text-[9px] text-slate-400 mt-1 space-y-0.5 pl-4">
                                {split.items.map(si => {
                                  const originalItem = currentTrackedOrder.items.find(oi => oi.id === si.orderItemId);
                                  return (
                                    <div key={si.orderItemId} className="flex items-center gap-1 text-[9px] text-slate-400">
                                      <span>•</span>
                                      <span>{originalItem?.name || 'อาหาร'} x{si.quantity}</span>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>

                          <div className="text-right shrink-0">
                            <span className="font-mono font-black text-xs block text-white">
                              ฿{split.total.toLocaleString()}
                            </span>
                            {!isPaid && (
                              <button
                                onClick={() => setActivePayingSplitId(isPayingThis ? null : split.id)}
                                className="mt-1 text-[10px] font-bold text-indigo-400 hover:text-indigo-300 flex items-center gap-1.5"
                              >
                                {isPayingThis ? '✖ ปิดสแกน' : '📱 สแกนจ่ายส่วนนี้'}
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Interactive scan panel for this split */}
                        {isPayingThis && !isPaid && (
                          <div className="mt-3 bg-slate-900 p-3 rounded-xl border border-indigo-950 space-y-3 text-center animate-in slide-in-from-top duration-200">
                            <p className="text-[10px] text-indigo-300">
                              สแกนคิวอาร์ชำระเงินส่วนแบ่งของ <b>คุณ {split.name}</b> จำนวน <b>฿{split.total.toLocaleString()}</b>
                            </p>
                            
                            {/* Proportional Mock PromptPay QR Generator */}
                            <div className="w-40 h-40 mx-auto bg-white p-2 rounded-xl border border-slate-200 flex flex-col items-center justify-center relative shadow-md">
                              <img
                                src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=https://promptpay.io/0812345678/${split.total}`}
                                alt="PromptPay QR Code"
                                className="w-full h-full object-contain"
                              />
                              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white p-1 rounded-lg shadow-md border border-slate-100 flex items-center justify-center animate-pulse">
                                <span className="text-blue-900 font-extrabold text-[9px] tracking-tight">PromptPay</span>
                              </div>
                            </div>

                            <p className="text-[9px] text-slate-400">
                              โอนเข้าบัญชีร้านค้าหลัก (ครัวกะเพราโคตรกรอบ) เรียบร้อยแล้ว คลิกปุ่มด้านล่างเพื่อยืนยันรายการ
                            </p>

                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={() => setActivePayingSplitId(null)}
                                className="flex-1 py-1.5 bg-slate-800 hover:bg-slate-750 text-slate-400 rounded-lg text-[10px] font-bold"
                              >
                                กลับ
                              </button>
                              <button
                                type="button"
                                onClick={() => handlePaySplit(currentTrackedOrder, split.id, 'PROMPTPAY')}
                                className="flex-1 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-[10px] font-bold"
                              >
                                ยืนยันชำระเงินสำเร็จ
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                <div className="pt-2 text-center">
                  <button
                    onClick={() => handleResetSplits(currentTrackedOrder)}
                    className="text-[10px] text-rose-400 hover:text-rose-300 font-bold"
                  >
                    ล้างการแยกบิลและกลับไปจ่ายรวม (Cancel Split)
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Payment Status Info */}
          <div className="bg-slate-900 border border-slate-850 p-3.5 rounded-xl text-center">
            {currentTrackedOrder.paymentStatus === 'PAID' ? (
              <span className="text-xs text-emerald-400 font-bold flex items-center justify-center gap-1.5">
                <Check className="w-4 h-4" /> ชำระเงินล่วงหน้าสำเร็จแล้ว (ผ่านพร้อมเพย์)
              </span>
            ) : (
              <div className="space-y-1">
                <span className="text-xs text-amber-400 font-bold block">
                  ชำระเงินภายหลังจากทานอาหารเสร็จ
                </span>
                <p className="text-[10px] text-slate-400">
                  กรุณาแจ้งชำระเงินที่เคาน์เตอร์แคชเชียร์ด้วยหมายเลขโต๊ะ {tableNo}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Footer info */}
        <div className="p-4 bg-slate-900 border-t border-slate-800 text-center text-[10px] text-slate-500 font-mono">
          © {storeSettings.storeName} - Realtime QR Ordering Platform
        </div>
      </div>
    );
  }

  // --- MENU BROWSER VIEW ---
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans max-w-md mx-auto relative border-x border-slate-900 shadow-2xl pb-24">
      {/* Banner */}
      <div className="h-32 bg-gradient-to-r from-red-800 to-amber-700 relative flex items-end p-4 overflow-hidden">
        <div className="absolute inset-0 bg-black/40 z-10" />
        {/* Abstract design */}
        <div className="absolute -right-10 -top-10 w-32 h-32 bg-amber-500/20 rounded-full blur-xl" />
        <div className="absolute -left-10 -bottom-10 w-24 h-24 bg-red-500/20 rounded-full blur-xl" />
        
        <div className="relative z-20 flex justify-between w-full items-end">
          <div>
            <div className="flex items-center gap-1.5">
              <span className="bg-red-600 text-white font-extrabold text-[9px] px-1.5 py-0.5 rounded tracking-wider uppercase animate-pulse">LIVE MENU</span>
              <span className="text-[10px] font-mono text-amber-300 font-bold">@ {storeSettings.storeName}</span>
            </div>
            <h1 className="text-lg font-black text-white mt-1">ครัวกะเพราโคตรกรอบ</h1>
          </div>
          <div className="bg-slate-950/80 border border-slate-800 rounded-xl px-3 py-1.5 text-center backdrop-blur-md">
            <span className="block text-[9px] text-slate-400 font-medium">หมายเลขโต๊ะ</span>
            <span className="text-sm font-extrabold text-amber-400 font-mono">โต๊ะ {tableNo}</span>
          </div>
        </div>
      </div>

      {/* Nickname Input Widget */}
      <div className="mx-4 mt-3 bg-slate-900 border border-slate-850 p-3 rounded-xl flex flex-col gap-1.5 shadow-md">
        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider">
          ลูกค้าสามารถใส่ชื่อเล่นแทนเลขโต๊ะ (เพื่อเรียกคิว / พิมพ์บิล)
        </label>
        <div className="relative">
          <input
            type="text"
            placeholder="ใส่ชื่อเล่นของคุณ เช่น คุณมุก / เจ้นุ่น / โต๊ะ 5 - บอล"
            value={customerNickname}
            onChange={(e) => {
              setCustomerNickname(e.target.value);
              localStorage.setItem(`qr_nickname_table_${tableNo}`, e.target.value);
            }}
            className="w-full bg-slate-950 border border-slate-800 text-xs font-bold text-white rounded-lg px-2.5 py-2 pr-8 focus:outline-none focus:border-red-500 transition-colors placeholder-slate-600"
          />
          {customerNickname && (
            <button
              onClick={() => {
                setCustomerNickname('');
                localStorage.removeItem(`qr_nickname_table_${tableNo}`);
              }}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Category Horizontal scroll */}
      <div 
        className="p-3 bg-slate-900 border-b border-slate-850 sticky top-0 z-20 flex gap-2 overflow-x-auto no-scrollbar scroll-smooth touch-pan-x select-none"
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-4.5 py-2.5 rounded-xl text-xs font-bold transition-all flex-shrink-0 active:scale-95 cursor-pointer ${
              selectedCategory === cat
                ? 'bg-gradient-to-r from-red-600 to-amber-600 text-white shadow-lg'
                : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-850'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Food items grid */}
      <div className="p-4 space-y-3.5 flex-1 overflow-y-auto">
        <div className="flex items-center justify-between">
          <span className="text-xs text-slate-400 font-semibold">รายการเมนูทั้งหมด ({filteredMenuItems.length})</span>
          <span className="text-[10px] text-slate-500 font-mono">แตะรายการเพื่อปรับแต่ง</span>
        </div>

        {filteredMenuItems.length === 0 ? (
          <div className="text-center py-12 text-slate-500 space-y-2">
            <Utensils className="w-8 h-8 mx-auto text-slate-700" />
            <p className="text-xs">ไม่พบเมนูในหมวดหมู่นี้</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {filteredMenuItems.map(item => (
              <div 
                key={item.id}
                onClick={() => openCustomizer(item)}
                className="bg-slate-900 border border-slate-850 rounded-xl p-3 flex gap-3 cursor-pointer hover:border-slate-750 active:scale-[0.98] transition-all"
              >
                <img 
                  src={item.image} 
                  alt={item.name} 
                  className="w-20 h-20 rounded-xl object-cover border border-slate-850" 
                  referrerPolicy="no-referrer"
                />
                <div className="flex-1 flex flex-col justify-between py-0.5">
                  <div>
                    <div className="flex justify-between items-start gap-1">
                      <h4 className="font-bold text-xs text-white line-clamp-2 leading-relaxed">{item.name}</h4>
                    </div>
                    <span className="bg-red-500/10 text-red-400 text-[9px] font-bold px-1.5 py-0.5 rounded border border-red-500/10 mt-1 inline-block">
                      {item.category}
                    </span>
                  </div>
                  <div className="flex justify-between items-center mt-2">
                    <span className="text-sm font-extrabold text-amber-400 font-mono">{item.price}฿</span>
                    <button className="bg-slate-950 hover:bg-slate-850 border border-slate-800 text-slate-200 p-1.5 rounded-lg flex items-center gap-1 text-[10px] font-bold">
                      สั่งเลย <Plus className="w-3.5 h-3.5 text-red-500" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Floating Bottom Cart trigger */}
      {cart.length > 0 && (
        <div className="fixed bottom-0 inset-x-0 max-w-md mx-auto p-4 bg-slate-950/90 border-t border-slate-900 backdrop-blur-md z-30">
          <button
            onClick={() => setShowCart(true)}
            className="w-full bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-500 hover:to-amber-500 text-white py-3.5 px-4 rounded-xl font-bold text-sm shadow-xl flex items-center justify-between active:scale-[0.99] transition-all"
          >
            <div className="flex items-center gap-2">
              <div className="bg-white text-slate-900 rounded-full w-5.5 h-5.5 flex items-center justify-center font-bold text-[11px] font-mono shadow">
                {cart.reduce((sum, item) => sum + item.quantity, 0)}
              </div>
              <span>ดูตระกร้าสั่งอาหาร</span>
            </div>
            <div className="flex items-center gap-1 font-mono text-base font-extrabold">
              <span>{subtotal}฿</span>
              <ChevronRight className="w-4 h-4 text-white/80" />
            </div>
          </button>
        </div>
      )}

      {/* CUSTOMIZER MODAL */}
      {customizingItem && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm flex items-end justify-center z-50 p-0">
          <div className="bg-slate-900 border-t border-slate-800 rounded-t-3xl w-full max-w-md shadow-2xl overflow-hidden pb-6 animate-slide-up">
            <div className="p-4 border-b border-slate-850 flex items-center justify-between">
              <h4 className="font-bold text-white text-sm">ปรับแต่งอาหารของคุณ</h4>
              <button 
                onClick={() => setCustomizingItem(null)}
                className="text-slate-400 hover:text-white p-1 rounded-full bg-slate-950"
              >
                <Minus className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 max-h-[60vh] overflow-y-auto">
              <div className="flex items-center gap-3 bg-slate-950 p-3 rounded-xl border border-slate-850">
                <img 
                  src={customizingItem.image} 
                  alt={customizingItem.name} 
                  className="w-16 h-16 rounded-lg object-cover" 
                  referrerPolicy="no-referrer"
                />
                <div>
                  <h5 className="text-xs font-bold text-white leading-snug">{customizingItem.name}</h5>
                  <p className="text-[11px] font-mono text-slate-400 mt-1">ราคาหลัก: {customizingItem.price}฿</p>
                </div>
              </div>

              {/* Egg modifier */}
              {customizingItem.category !== 'เครื่องดื่ม' && (
                <div className="space-y-1.5">
                  <span className="block text-xs font-bold text-slate-300">ตัวเลือกเพิ่มเติม</span>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setAddEgg(true)}
                      className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-between ${
                        addEgg 
                          ? 'border-amber-500 bg-amber-950/20 text-amber-400' 
                          : 'border-slate-800 bg-slate-950 text-slate-400'
                      }`}
                    >
                      <span>เพิ่มไข่ดาวโคตรกรอบ</span>
                      <span className="font-mono text-[10px]">+10฿</span>
                    </button>
                    <button
                      onClick={() => setAddEgg(false)}
                      className={`p-2.5 rounded-xl border text-xs font-bold ${
                        !addEgg 
                          ? 'border-slate-500 bg-slate-800 text-white' 
                          : 'border-slate-800 bg-slate-950 text-slate-400'
                      }`}
                    >
                      ไม่เพิ่มไข่ดาว
                    </button>
                  </div>
                </div>
              )}

              {/* Custom memo */}
              <div className="space-y-1.5">
                <span className="block text-xs font-bold text-slate-300">คำสั่งพิเศษเพิ่มเติม</span>
                <input
                  type="text"
                  placeholder="เช่น ไม่กระเทียม, ขอข้าวแห้งๆ"
                  value={itemNote}
                  onChange={(e) => setItemNote(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-850 text-white rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-red-500"
                />
              </div>
            </div>

            <div className="p-4 bg-slate-950 border-t border-slate-850 flex gap-2">
              <button
                onClick={() => setCustomizingItem(null)}
                className="flex-1 py-2 border border-slate-800 hover:bg-slate-900 text-slate-400 rounded-xl text-xs font-semibold"
              >
                ย้อนกลับ
              </button>
              <button
                onClick={handleAddToCart}
                className="flex-1 py-2 bg-gradient-to-r from-red-600 to-amber-600 text-white rounded-xl text-xs font-bold"
              >
                เพิ่มใส่ตระกร้า ({customizingItem.price + (addEgg ? 10 : 0)}฿)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* VIEW CART / CHECKOUT SLIDE UP MODAL */}
      {showCart && (
        <div className="fixed inset-0 bg-black/90 z-40 flex items-end justify-center">
          <div className="bg-slate-900 border-t border-slate-800 rounded-t-3xl w-full max-w-md shadow-2xl overflow-hidden pb-6 animate-slide-up flex flex-col max-h-[90vh]">
            <div className="p-4 border-b border-slate-850 flex items-center justify-between">
              <h4 className="font-bold text-white text-sm flex items-center gap-1.5">
                <ShoppingBag className="w-4 h-4 text-red-500" /> สรุปรายการในตระกร้า (โต๊ะ {tableNo})
              </h4>
              <button 
                onClick={() => setShowCart(false)}
                className="text-slate-400 hover:text-white p-1 rounded-full bg-slate-950"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 overflow-y-auto flex-1">
              {/* Item lists */}
              <div className="space-y-3">
                {cart.map((item, idx) => (
                  <div key={idx} className="bg-slate-950 p-3 rounded-xl border border-slate-850 flex justify-between items-center">
                    <div>
                      <h5 className="text-xs font-bold text-white">{item.name}</h5>
                      <div className="flex gap-1.5 mt-0.5">
                        {item.addFriedEgg && <span className="text-[9px] text-amber-500 font-bold bg-amber-500/5 px-1 py-0.5 rounded">เพิ่มไข่ดาว (+10฿)</span>}
                        {item.notes && <span className="text-[9px] text-slate-400 italic font-medium bg-slate-850 px-1 py-0.5 rounded">{item.notes}</span>}
                      </div>
                      <span className="text-xs font-semibold text-amber-400 mt-2 block font-mono">
                        {item.price + item.eggPrice}฿ / จาน
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="flex items-center bg-slate-900 border border-slate-800 rounded-lg p-0.5">
                        <button
                          onClick={() => handleUpdateQty(item.id, -1)}
                          className="p-1 hover:text-white text-slate-400 rounded"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="w-6 text-center text-xs font-bold font-mono text-white">{item.quantity}</span>
                        <button
                          onClick={() => handleUpdateQty(item.id, 1)}
                          className="p-1 hover:text-white text-slate-400 rounded"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                      <span className="text-xs font-bold text-white min-w-12 text-right font-mono">
                        {(item.price + item.eggPrice) * item.quantity}฿
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Coupon input */}
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-850 space-y-2">
                <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">รหัสคูปองส่วนลดพิเศษ</span>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="ใส่รหัสคูปอง (เช่น KP50, SUMMER20)"
                    value={promoCode}
                    onChange={(e) => setPromoCode(e.target.value)}
                    className="flex-1 bg-slate-900 border border-slate-800 text-white rounded-lg px-2.5 py-1.5 text-xs uppercase font-bold focus:outline-none focus:border-red-500"
                  />
                  <button
                    onClick={handleApplyPromo}
                    className="bg-amber-600 hover:bg-amber-500 text-white px-3 py-1.5 rounded-lg text-xs font-bold"
                  >
                    ใช้คูปอง
                  </button>
                </div>
                {activeDiscount && (
                  <div className="flex justify-between items-center bg-emerald-950/20 border border-emerald-500/20 p-2 rounded-lg text-xs text-emerald-400 font-bold mt-1">
                    <span>คูปอง: {activeDiscount.name} ({activeDiscount.code})</span>
                    <span>-{discountTotal}฿</span>
                  </div>
                )}
              </div>

              {/* Payment selection */}
              <div className="space-y-2">
                <span className="text-xs font-bold text-slate-300">เลือกวิธีการชำระเงิน</span>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setCheckoutMode('CASH')}
                    className={`p-3 rounded-xl border text-xs font-bold flex flex-col gap-1 items-center justify-center transition-all ${
                      checkoutMode === 'CASH'
                        ? 'border-amber-500 bg-amber-950/20 text-amber-400 shadow-lg'
                        : 'border-slate-800 bg-slate-950 text-slate-400'
                    }`}
                  >
                    <span>ชำระเงินภายหลัง</span>
                    <span className="text-[9px] text-slate-400 font-normal">ชำระเงินที่แคชเชียร์ทีหลัง</span>
                  </button>
                  <button
                    onClick={() => setCheckoutMode('PROMPTPAY')}
                    className={`p-3 rounded-xl border text-xs font-bold flex flex-col gap-1 items-center justify-center transition-all ${
                      checkoutMode === 'PROMPTPAY'
                        ? 'border-red-500 bg-red-950/20 text-red-400 shadow-lg'
                        : 'border-slate-800 bg-slate-950 text-slate-400'
                    }`}
                  >
                    <span>สแกนจ่ายพร้อมเพย์ทันที</span>
                    <span className="text-[9px] text-red-400 font-normal">สแกนคิวอาร์โอนเงิน</span>
                  </button>
                </div>
              </div>

              {/* Show simulated PromptPay QR if selected */}
              {checkoutMode === 'PROMPTPAY' && (() => {
                const rawId = storeSettings?.promptpayId || '081-123-4567';
                const cleanPromptPayId = rawId.replace(/[^0-9]/g, '') || '0811234567';
                const qrCodeUrl = total > 0 
                  ? `https://promptpay.io/${cleanPromptPayId}/${total}.png`
                  : `https://promptpay.io/${cleanPromptPayId}.png`;
                
                return (
                  <div className="bg-white p-4 rounded-xl border border-slate-200 text-slate-900 flex flex-col items-center max-w-xs mx-auto">
                    <div className="flex items-center gap-1 border-b border-slate-100 pb-2 mb-3 w-full justify-center">
                      <span className="bg-[#0c4a6e] text-white font-extrabold text-[9px] px-1.5 py-0.5 rounded">PromptPay</span>
                      <span className="text-[10px] text-slate-500">พร้อมเพย์ร้านค้า</span>
                    </div>
                    
                    {/* Real scan-able PromptPay QR Code */}
                    <img 
                      src={qrCodeUrl}
                      alt="PromptPay QR Code"
                      className="w-28 h-28 object-contain border border-slate-100 rounded p-1"
                      referrerPolicy="no-referrer"
                      onError={(e) => {
                        e.currentTarget.src = `https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=${encodeURIComponent(`promptpay://${cleanPromptPayId}?amount=${total}`)}`;
                      }}
                    />
                    
                    <p className="text-[10px] font-bold text-[#0c4a6e] mt-2 font-mono">{storeSettings.promptpayName || 'ครัวกะเพราโคตรกรอบ'}</p>
                    <p className="text-[9.5px] text-sky-700 font-mono font-bold">ID: {storeSettings.promptpayId || '081-123-4567'}</p>
                    <p className="text-[9px] text-slate-500 font-mono">บิลโต๊ะ {tableNo} • จำนวนเงิน</p>
                    <p className="text-sm font-extrabold text-red-600 font-mono mt-0.5">{total} ฿</p>
                    <p className="text-[9px] bg-emerald-50 text-emerald-600 border border-emerald-100 px-2 py-0.5 rounded mt-2 text-center">
                      *ระบบจะอนุมัติออเดอร์เข้าครัวอัตโนมัติเมื่อตรวจสอบยอดชำระ
                    </p>
                  </div>
                );
              })()}
            </div>

            {/* Bottom summary and Action button */}
            <div className="p-4 bg-slate-950 border-t border-slate-850 space-y-3.5">
              <div className="space-y-1.5 text-xs text-slate-400">
                <div className="flex justify-between">
                  <span>ราคารวมอาหาร</span>
                  <span className="font-mono">{subtotal}฿</span>
                </div>
                {discountTotal > 0 && (
                  <div className="flex justify-between text-emerald-400 font-semibold">
                    <span>ส่วนลดคูปอง</span>
                    <span className="font-mono">-{discountTotal}฿</span>
                  </div>
                )}
                <div className="flex justify-between text-sm font-bold text-white border-t border-slate-800 pt-2">
                  <span>ยอดสุทธิ</span>
                  <span className="text-red-500 font-mono text-base">{total}฿</span>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => setShowCart(false)}
                  className="flex-1 py-3 border border-slate-800 text-slate-400 hover:text-white rounded-xl text-xs font-semibold"
                >
                  เลือกเมนูเพิ่ม
                </button>
                <button
                  onClick={handlePlaceOrder}
                  disabled={checkoutMode === 'NONE'}
                  className={`flex-1 py-3 text-white rounded-xl text-xs font-extrabold shadow-lg transition-all ${
                    checkoutMode === 'NONE'
                      ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-750'
                      : 'bg-gradient-to-r from-red-600 to-amber-600'
                  }`}
                >
                  {checkoutMode === 'NONE' ? 'กรุณาเลือกวิธีชำระเงิน' : 'ยืนยันสั่งอาหารเข้าครัว 🍳'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
