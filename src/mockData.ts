import { 
  User, Branch, MenuItem, Ingredient, Recipe, 
  Supplier, PurchaseOrder, Order, Expense, OtherIncome,
  Customer, Promotion, StoreSettings, NotificationSettings, StockCardLog, AuditLog,
  TradeReceivable, TradePayable, Quotation, OfficialReceipt
} from './types';

export const mockUsers: User[] = [
  { id: '1', name: 'แอดมิน สมชาย', role: 'Admin', username: 'admin', pin: '1111', password: 'admin' },
  { id: '2', name: 'ผู้จัดการ สมหญิง', role: 'Manager', username: 'manager', pin: '2222', password: '1234' },
  { id: '3', name: 'แคชเชียร์ สมร', role: 'Cashier', username: 'cashier', pin: '3333', password: '1234' },
  { id: '4', name: 'พนักงาน ครัวสมเกียรติ', role: 'Staff', username: 'staff', pin: '4444', password: '1234' }
];

export const mockBranches: Branch[] = [
  { id: 'b1', name: 'สาขาบรรทัดทอง (สำนักงานใหญ่)', location: 'ถนนบรรทัดทอง ปทุมวัน กรุงเทพฯ', phone: '081-123-4567' },
  { id: 'b2', name: 'สาขาอารีย์', location: 'ซอยอารีย์ พหลโยธิน กรุงเทพฯ', phone: '082-234-5678' }
];

export const mockIngredients: Ingredient[] = [
  { id: 'i1', name: 'เนื้อวัวบดพรีเมียม (A5)', stock: 25.4, minStock: 10.0, unit: 'kg', unitCost: 320, expiryDate: '2026-07-20', lotNo: 'LOT-BEEF-003' },
  { id: 'i2', name: 'หมูกรอบสูตรเฉพาะ', stock: 15.0, minStock: 8.0, unit: 'kg', unitCost: 280, expiryDate: '2026-07-18', lotNo: 'LOT-PORK-012' },
  { id: 'i3', name: 'เนื้อไก่สับ', stock: 18.5, minStock: 12.0, unit: 'kg', unitCost: 110, expiryDate: '2026-07-17', lotNo: 'LOT-CHICK-045' },
  { id: 'i4', name: 'เนื้อปูม้าแกะพรีเมียม', stock: 3.2, minStock: 5.0, unit: 'kg', unitCost: 1200, expiryDate: '2026-07-16', lotNo: 'LOT-CRAB-009' }, // Low Stock
  { id: 'i5', name: 'ใบกะเพราแดงป่า (ฉุนพิเศษ)', stock: 4.8, minStock: 5.0, unit: 'kg', unitCost: 80, expiryDate: '2026-07-15', lotNo: 'LOT-BASIL-088' }, // Low Stock
  { id: 'i6', name: 'ข้าวหอมมะลิกลางปี', stock: 85.0, minStock: 30.0, unit: 'kg', unitCost: 35, expiryDate: '2026-12-31', lotNo: 'LOT-RICE-001' },
  { id: 'i7', name: 'ไข่ไก่เบอร์ 2', stock: 360, minStock: 150, unit: 'ฟอง', unitCost: 4.2, expiryDate: '2026-08-05', lotNo: 'LOT-EGG-102' },
  { id: 'i8', name: 'พริกขี้หนูสวน/พริกแห้งผสม', stock: 8.5, minStock: 4.0, unit: 'kg', unitCost: 150, expiryDate: '2026-07-25', lotNo: 'LOT-CHILI-031' },
  { id: 'i9', name: 'กระเทียมไทยแกะเปลือก', stock: 12.0, minStock: 5.0, unit: 'kg', unitCost: 95, expiryDate: '2026-08-15', lotNo: 'LOT-GARLIC-022' },
  { id: 'i10', name: 'ซอสกะเพราสูตรลับครัวกะเพรา', stock: 35.0, minStock: 15.0, unit: 'L', unitCost: 60, expiryDate: '2026-10-30', lotNo: 'LOT-SAUCE-005' },
  { id: 'i11', name: 'ผงชาไทยพรีเมียม', stock: 10.0, minStock: 3.0, unit: 'kg', unitCost: 180, expiryDate: '2027-01-10', lotNo: 'LOT-TEA-001' },
  { id: 'i12', name: 'มะนาวแป้นสด', stock: 120, minStock: 100, unit: 'ลูก', unitCost: 3.5, expiryDate: '2026-07-22', lotNo: 'LOT-LEMON-002' }
];

export const mockMenuItems: MenuItem[] = [
  { id: 'm1', name: 'กะเพราเนื้อสับพรีเมียมราดข้าว', price: 129, cost: 48.5, category: 'กะเพราดั้งเดิม', image: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?q=80&w=600&auto=format&fit=crop', active: true, recipeId: 'r1' },
  { id: 'm2', name: 'กะเพราหมูกรอบหนาพริกเกลือราดข้าว', price: 149, cost: 53.0, category: 'กะเพราดั้งเดิม', image: 'https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?q=80&w=600&auto=format&fit=crop', active: true, recipeId: 'r2' },
  { id: 'm3', name: 'กะเพราไก่สับต้นตำรับพริกแห้งราดข้าว', price: 89, cost: 26.5, category: 'กะเพราดั้งเดิม', image: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?q=80&w=600&auto=format&fit=crop', active: true, recipeId: 'r3' },
  { id: 'm4', name: 'ข้าวไข่ข้นกะเพราเนื้อปูม้าพรีเมียม', price: 299, cost: 135.0, category: 'กะเพราฟิวชั่น', image: 'https://images.unsplash.com/photo-1551183053-bf91a1d81141?q=80&w=600&auto=format&fit=crop', active: true, recipeId: 'r4' },
  { id: 'm5', name: 'ข้าวผัดกะเพราเนื้อสับคลุกคลิกคลุกไข่เค็ม', price: 139, cost: 52.0, category: 'กะเพราฟิวชั่น', image: 'https://images.unsplash.com/photo-1512058564366-18510be2db19?q=80&w=600&auto=format&fit=crop', active: true, recipeId: 'r5' },
  { id: 'm6', name: 'แกงจืดเต้าหู้หมูสับสาหร่าย', price: 95, cost: 30.0, category: 'ซุป/แกง', image: 'https://images.unsplash.com/photo-1547592180-85f173990554?q=80&w=600&auto=format&fit=crop', active: true },
  { id: 'm7', name: 'ชาไทยเย็นวิปครีมโบราณ', price: 65, cost: 18.0, category: 'เครื่องดื่ม', image: 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?q=80&w=600&auto=format&fit=crop', active: true },
  { id: 'm8', name: 'น้ำอัญชันมะนาวสดซ่า', price: 55, cost: 12.0, category: 'เครื่องดื่ม', image: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?q=80&w=600&auto=format&fit=crop', active: true }
];

export const mockRecipes: Recipe[] = [
  {
    id: 'r1',
    menuItemId: 'm1',
    ingredients: [
      { ingredientId: 'i1', amount: 0.12 },  // 120g Beef
      { ingredientId: 'i5', amount: 0.02 },  // 20g Basil
      { ingredientId: 'i6', amount: 0.15 },  // 150g Rice
      { ingredientId: 'i8', amount: 0.015 }, // 15g Chili
      { ingredientId: 'i9', amount: 0.01 },  // 10g Garlic
      { ingredientId: 'i10', amount: 0.03 }  // 30ml Sauce
    ]
  },
  {
    id: 'r2',
    menuItemId: 'm2',
    ingredients: [
      { ingredientId: 'i2', amount: 0.12 },  // 120g Crispy pork
      { ingredientId: 'i5', amount: 0.02 },
      { ingredientId: 'i6', amount: 0.15 },
      { ingredientId: 'i8', amount: 0.015 },
      { ingredientId: 'i9', amount: 0.01 },
      { ingredientId: 'i10', amount: 0.03 }
    ]
  },
  {
    id: 'r3',
    menuItemId: 'm3',
    ingredients: [
      { ingredientId: 'i3', amount: 0.12 },  // 120g Chicken
      { ingredientId: 'i5', amount: 0.02 },
      { ingredientId: 'i6', amount: 0.15 },
      { ingredientId: 'i8', amount: 0.015 },
      { ingredientId: 'i9', amount: 0.01 },
      { ingredientId: 'i10', amount: 0.03 }
    ]
  },
  {
    id: 'r4',
    menuItemId: 'm4',
    ingredients: [
      { ingredientId: 'i4', amount: 0.08 },  // 80g Crab meat
      { ingredientId: 'i5', amount: 0.015 },
      { ingredientId: 'i6', amount: 0.15 },
      { ingredientId: 'i7', amount: 2 },     // 2 Eggs for scrambled
      { ingredientId: 'i8', amount: 0.01 },
      { ingredientId: 'i9', amount: 0.01 },
      { ingredientId: 'i10', amount: 0.025 }
    ]
  },
  {
    id: 'r5',
    menuItemId: 'm5',
    ingredients: [
      { ingredientId: 'i1', amount: 0.10 },
      { ingredientId: 'i5', amount: 0.02 },
      { ingredientId: 'i6', amount: 0.15 },
      { ingredientId: 'i8', amount: 0.015 },
      { ingredientId: 'i9', amount: 0.01 },
      { ingredientId: 'i10', amount: 0.03 }
    ]
  }
];

export const mockSuppliers: Supplier[] = [
  { 
    id: 's1', 
    name: 'ฟาร์มเนื้อไทยกำแพงแสน', 
    contact: 'คุณชัยชนะ', 
    phone: '085-333-4444', 
    address: 'นครปฐม',
    leadTimeDays: 2,
    bankName: 'ธนาคารกสิกรไทย (KBANK)',
    bankAccountNo: '123-1-56789-0',
    bankAccountName: 'บจก. เนื้อไทยกำแพงแสน ฟาร์มมิ่ง'
  },
  { 
    id: 's2', 
    name: 'ตลาดไทค้าส่งผักและเครื่องเทศ', 
    contact: 'เจ๊ศรี', 
    phone: '089-777-8888', 
    address: 'ปทุมธานี',
    leadTimeDays: 1,
    bankName: 'ธนาคารไทยพาณิชย์ (SCB)',
    bankAccountNo: '987-2-34567-1',
    bankAccountName: 'นางศรีวรรณ รัตนวิจิตรา'
  },
  { 
    id: 's3', 
    name: 'เบทาโกรจัดส่งพรีเมียม', 
    contact: 'ทีมบริการลูกค้า', 
    phone: '1382', 
    address: 'กรุงเทพฯ',
    leadTimeDays: 3,
    bankName: 'ธนาคารกรุงเทพ (BBL)',
    bankAccountNo: '012-3-45678-9',
    bankAccountName: 'บริษัท เบทาโกร จำกัด (มหาชน)'
  }
];

export const mockPurchaseOrders: PurchaseOrder[] = [
  {
    id: 'PO-2026-001',
    supplierId: 's1',
    items: [
      { ingredientId: 'i1', amount: 30, unitCost: 310 }
    ],
    status: 'RECEIVED',
    total: 9300,
    createdAt: '2026-07-01T10:00:00-07:00',
    expectedArrivalDate: '2026-07-03T10:00:00-07:00',
    receivedAt: '2026-07-02T14:30:00-07:00',
    paymentStatus: 'PAID',
    paymentDate: '2026-07-01T14:15:00-07:00',
    paymentNote: 'ชำระเงินมัดจำล่วงหน้าเต็มจำนวน'
  },
  {
    id: 'PO-2026-002',
    supplierId: 's2',
    items: [
      { ingredientId: 'i5', amount: 15, unitCost: 75 },
      { ingredientId: 'i8', amount: 10, unitCost: 145 },
      { ingredientId: 'i9', amount: 15, unitCost: 90 }
    ],
    status: 'RECEIVED',
    total: 3925,
    createdAt: '2026-07-05T09:15:00-07:00',
    expectedArrivalDate: '2026-07-06T09:15:00-07:00',
    receivedAt: '2026-07-05T16:00:00-07:00',
    paymentStatus: 'PAID',
    paymentDate: '2026-07-05T09:45:00-07:00',
    paymentNote: 'จ่ายหน้างานรับสินค้าทันที'
  },
  {
    id: 'PO-2026-003',
    supplierId: 's3',
    items: [
      { ingredientId: 'i4', amount: 5, unitCost: 1180 }
    ],
    status: 'PENDING',
    total: 5900,
    createdAt: '2026-07-13T11:00:00-07:00',
    expectedArrivalDate: '2026-07-16T11:00:00-07:00',
    paymentStatus: 'UNPAID'
  }
];

export const mockCustomers: Customer[] = [
  { id: 'c1', name: 'คุณเอกวิทย์ รักกะเพรา', phone: '0812345678', points: 340, createdAt: '2026-01-10', totalSpend: 5420, ordersCount: 22 },
  { id: 'c2', name: 'คุณรินรดา สายกิน', phone: '0898765432', points: 120, createdAt: '2026-03-15', totalSpend: 2480, ordersCount: 11 },
  { id: 'c3', name: 'คุณนพดล แฟนพันธุ์แท้', phone: '0855551122', points: 680, createdAt: '2026-02-20', totalSpend: 9230, ordersCount: 38 },
  { id: 'c4', name: 'คุณจุฑามาศ รักไข่ดาว', phone: '0877773344', points: 45, createdAt: '2026-07-01', totalSpend: 590, ordersCount: 4 }
];

export const mockPromotions: Promotion[] = [
  { id: 'p1', code: 'KAPRAO50', name: 'ส่วนลดพิเศษลูกค้าใหม่ 50 บาท', type: 'FIXED', value: 50, minSpend: 300, active: true },
  { id: 'p2', code: 'EGG10', name: 'ส่วนลดกะเพราดั้งเดิม 10%', type: 'PERCENT', value: 10, minSpend: 150, active: true },
  { id: 'p3', code: 'CRABFREE', name: 'ส่วนลดเซตคอมโบ้ปู 15%', type: 'PERCENT', value: 15, minSpend: 500, active: false }
];

export const mockExpenses: Expense[] = [
  { id: 'e1', category: 'Rent', amount: 35000, description: 'ค่าเช่าพื้นที่โครงการ บรรทัดทอง', date: '2026-07-01', branchId: 'b1' },
  { id: 'e2', category: 'Salary', amount: 48000, description: 'เงินเดือน พนักงานประจำ 3 คน', date: '2026-07-01', branchId: 'b1' },
  { id: 'e3', category: 'Electricity', amount: 8450, description: 'ค่าไฟฟ้าร้านรอบเดือน มิ.ย.', date: '2026-07-05', branchId: 'b1' },
  { id: 'e4', category: 'Water', amount: 1250, description: 'ค่าน้ำประปาร้านรอบเดือน มิ.ย.', date: '2026-07-05', branchId: 'b1' },
  { id: 'e5', category: 'Marketing', amount: 5000, description: 'ค่ายิงแอดโปรโมทโปรโมชั่นไข่ดาวโคตรกรอบ', date: '2026-07-08', branchId: 'b1' },
  { id: 'e6', category: 'Other', amount: 1500, description: 'ค่าอุปกรณ์ทำความสะอาดครัวประจำเดือน', date: '2026-07-10', branchId: 'b1' }
];

export const mockOtherIncomes: OtherIncome[] = [
  { id: 'oi1', category: 'Delivery GP', amount: 12450, description: 'ยอดขายเดลิเวอรี่ผ่านแอป Lineman / Grab รอบสัปดาห์แรก', date: '2026-07-05', branchId: 'b1' },
  { id: 'oi2', category: 'Catering', amount: 18500, description: 'จัดเลี้ยงอาหารกล่องงานประชุม ออฟฟิศ SCG', date: '2026-07-08', branchId: 'b1' },
  { id: 'oi3', category: 'Space Rental', amount: 4500, description: 'ค่าเช่าพื้นที่ตั้งตู้กดน้ำดื่มอัตโนมัติหน้าร้าน', date: '2026-07-10', branchId: 'b1' },
  { id: 'oi4', category: 'Franchise Fee', amount: 10000, description: 'ค่าบริการระบบ POS รายเดือนแชร์ลิขสิทธิ์จากสาขาย่อย อารีย์', date: '2026-07-12', branchId: 'b1' }
];

// Helper to generate realistic historical orders
const generateOrders = (): Order[] => {
  const orders: Order[] = [];
  const startDay = new Date('2026-07-07');
  const now = new Date('2026-07-13');

  let orderIdCounter = 1000;
  
  // Loop from July 7 to July 13
  for (let d = new Date(startDay); d <= now; d.setDate(d.getDate() + 1)) {
    const isToday = d.toDateString() === now.toDateString();
    
    // July 12 was Sunday (busy day)
    const isSunday = d.getDay() === 0;
    const numOrders = isToday ? 28 : (isSunday ? 45 : 30 + Math.floor(Math.random() * 10));

    for (let o = 0; o < numOrders; o++) {
      orderIdCounter++;
      const hour = 11 + Math.floor(Math.random() * 10); // 11:00 to 21:00
      const minute = Math.floor(Math.random() * 60);
      const timestamp = new Date(d);
      timestamp.setHours(hour, minute, 0);

      // Random menu selection
      const itemChoices = [
        { menuItem: mockMenuItems[0], qty: 1 + Math.floor(Math.random() * 2), egg: Math.random() > 0.3 },
        { menuItem: mockMenuItems[1], qty: 1, egg: Math.random() > 0.4 },
        { menuItem: mockMenuItems[2], qty: 1, egg: Math.random() > 0.3 },
        { menuItem: mockMenuItems[3], qty: 1, egg: false },
        { menuItem: mockMenuItems[4], qty: 1, egg: Math.random() > 0.5 },
        { menuItem: mockMenuItems[6], qty: 1 + Math.floor(Math.random() * 2), egg: false },
        { menuItem: mockMenuItems[7], qty: 1, egg: false }
      ];

      // Build cart with 1 to 3 items
      const selectedChoices = [];
      const numItems = 1 + Math.floor(Math.random() * 2);
      for (let i = 0; i < numItems; i++) {
        const choice = itemChoices[Math.floor(Math.random() * itemChoices.length)];
        if (!selectedChoices.some(sc => sc.menuItem.id === choice.menuItem.id)) {
          selectedChoices.push(choice);
        }
      }

      const orderItems = selectedChoices.map((choice, index) => {
        const eggPrice = choice.egg ? 10 : 0;
        return {
          id: `oi-${orderIdCounter}-${index}`,
          menuItemId: choice.menuItem.id,
          name: choice.menuItem.name,
          price: choice.menuItem.price,
          quantity: choice.qty,
          addFriedEgg: choice.egg,
          eggPrice: eggPrice,
          notes: Math.random() > 0.8 ? 'ขอเผ็ดๆ' : ''
        };
      });

      let subtotal = 0;
      orderItems.forEach(item => {
        subtotal += (item.price + item.eggPrice) * item.quantity;
      });

      // Simple Discount simulation
      let discount = 0;
      if (subtotal >= 300 && Math.random() > 0.5) {
        discount = 50;
      } else if (subtotal >= 150 && Math.random() > 0.6) {
        discount = Math.floor(subtotal * 0.1);
      }

      const total = subtotal - discount;
      const paymentMethod = Math.random() > 0.6 ? 'PROMPTPAY' : 'CASH';
      const earnedPoints = Math.floor(total / 20);

      // All past orders are paid & served, today's some can be active/cooking
      let paymentStatus: 'PENDING' | 'PAID' | 'REFUNDED' = 'PAID';
      let kitchenStatus: 'PENDING' | 'COOKING' | 'READY' | 'SERVED' = 'SERVED';

      if (isToday && o >= numOrders - 3) {
        // Last 3 orders today are active
        paymentStatus = o === numOrders - 1 ? 'PENDING' : 'PAID';
        kitchenStatus = o === numOrders - 1 ? 'PENDING' : (o === numOrders - 2 ? 'COOKING' : 'READY');
      }

      const hasCustomer = Math.random() > 0.4;
      const randomCust = mockCustomers[Math.floor(Math.random() * mockCustomers.length)];

      orders.push({
        id: `TX-${orderIdCounter}`,
        branchId: Math.random() > 0.15 ? 'b1' : 'b2',
        tableNo: String(1 + Math.floor(Math.random() * 15)),
        items: orderItems,
        subtotal: subtotal,
        discount: discount,
        total: total,
        paymentMethod: paymentMethod as 'CASH' | 'PROMPTPAY',
        paymentStatus: paymentStatus,
        kitchenStatus: kitchenStatus,
        timestamp: timestamp.toISOString(),
        cookingTime: kitchenStatus === 'SERVED' ? 300 + Math.floor(Math.random() * 400) : undefined,
        cashierName: mockUsers[2].name,
        customerPhone: hasCustomer ? randomCust.phone : undefined,
        earnedPoints: hasCustomer ? earnedPoints : undefined
      });
    }
  }

  return orders;
};

export const initialOrders = generateOrders();

export const defaultStoreSettings: StoreSettings = {
  storeName: 'ครัวกะเพราโคตรกรอบ (Kaprao POS Enterprise)',
  taxRate: 7,
  serviceCharge: 0,
  currency: '฿',
  receiptHeader: 'ครัวกะเพราโคตรกรอบ สาขาบรรทัดทอง\nยินดีต้อนรับ\nโทร. 081-123-4567\nเลขประจำตัวผู้เสียภาษี: 0105563029991',
  receiptFooter: 'ขอบคุณที่อุดหนุน\nโอกาสหน้าเชิญใหม่ค่ะ\nใบเสร็จรับเงินอย่างย่อ',
  promptpayId: '0811234567',
  promptpayName: 'ครัวกะเพราโคตรกรอบ บรรทัดทอง',
  vatType: 'INCLUSIVE',
  autoBackupFrequency: 'OFF',
  showReceiptPreview: false // default false: ไม่ต้องแสดงตัวอย่างใบเสร็จอัตโนมัติหลังรับชำระเงิน
};

export const defaultNotificationSettings: NotificationSettings = {
  telegramToken: '5841299923:AAFlqZ4_example_token_abcdef',
  telegramChatId: '123456789',
  telegramEnabled: false,
  telegramBotUsername: 'KapraoExpenseBot',
  telegramAutoSyncExpenses: true,
  telegramSyncIntervalMinutes: 1,
  lineToken: 'LpG8exampleLINETokenForKapraoPOS_abcdef123',
  lineEnabled: false,
  notifyLowStock: true,
  notifyDailyReport: true,
  alertDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
  alertTime: '20:00',
  alertFrequency: 'DAILY',
  alertStockTime: '09:00',
  alertStockFrequency: 'INSTANT'
};

export const mockStockCardLogs: StockCardLog[] = [
  { id: 'sc1', ingredientId: 'i1', type: 'IN', amount: 30, remaining: 35.4, note: 'รับของจาก PO-2026-001', timestamp: '2026-07-02T14:30:00-07:00', user: 'ผู้จัดการ สมหญิง' },
  { id: 'sc2', ingredientId: 'i5', type: 'IN', amount: 15, remaining: 18.2, note: 'รับของจาก PO-2026-002', timestamp: '2026-07-05T16:00:00-07:00', user: 'ผู้จัดการ สมหญิง' },
  { id: 'sc3', ingredientId: 'i5', type: 'OUT', amount: 0.5, remaining: 17.7, note: 'เบิกไปเตรียมออเดอร์เปิดร้าน', timestamp: '2026-07-06T09:00:00-07:00', user: 'พนักงาน ครัวสมเกียรติ' },
  { id: 'sc4', ingredientId: 'i1', type: 'OUT', amount: 1.2, remaining: 34.2, note: 'ลูกค้าเคลมออเดอร์เนื้อเสีย ปรับทิ้ง', timestamp: '2026-07-10T15:00:00-07:00', user: 'ผู้จัดการ สมหญิง' },
  { id: 'sc5', ingredientId: 'i5', type: 'ADJUST', amount: -2.0, remaining: 4.8, note: 'ปรับยอดใบกะเพราเน่าเสียจากความชื้น', timestamp: '2026-07-13T09:30:00-07:00', user: 'ผู้จัดการ สมหญิง' }
];

export const mockAuditLogs: AuditLog[] = [
  {
    id: 'audit-1',
    timestamp: '2026-07-16T10:15:00-07:00',
    user: 'แอดมิน สมชาย',
    username: 'admin',
    role: 'Admin',
    actionType: 'PERMISSION_CHANGE',
    details: 'แก้ไขสิทธิ์การเข้าใช้งานของตำแหน่ง "แคชเชียร์ (Cashier)" เพิ่มสิทธิ์เข้าใช้ระบบสั่งอาหารคิวอาร์ (QR)'
  },
  {
    id: 'audit-2',
    timestamp: '2026-07-16T09:45:00-07:00',
    user: 'ผู้จัดการ สมหญิง',
    username: 'manager',
    role: 'Manager',
    actionType: 'PRICE_MODIFICATION',
    details: 'ปรับราคาเมนู "กะเพราเนื้อสับโคตรกรอบ" จาก 85 ฿ เป็น 89 ฿ เพื่อรองรับราคาวัตถุดิบเนื้อวัวที่เพิ่มขึ้น'
  },
  {
    id: 'audit-3',
    timestamp: '2026-07-15T16:20:00-07:00',
    user: 'ผู้จัดการ สมหญิง',
    username: 'manager',
    role: 'Manager',
    actionType: 'RECIPE_UPDATE',
    details: 'ปรับสูตรอาหาร "กะเพราหมูกรอบสิบวิ" เพิ่มปริมาณ "หมูกรอบสไลด์แช่แข็ง" จาก 0.12 kg เป็น 0.13 kg'
  },
  {
    id: 'audit-4',
    timestamp: '2026-07-14T11:00:00-07:00',
    user: 'แอดมิน สมชาย',
    username: 'admin',
    role: 'Admin',
    actionType: 'USER_MANAGEMENT',
    details: 'เพิ่มบัญชีผู้ใช้งานใหม่ "พนักงานครัว สมจิตร" (Username: staff2) สิทธิ์ระดับพนักงานครัว (Staff)'
  },
  {
    id: 'audit-5',
    timestamp: '2026-07-14T09:30:00-07:00',
    user: 'ผู้จัดการ สมหญิง',
    username: 'manager',
    role: 'Manager',
    actionType: 'SYSTEM_UPDATE',
    details: 'แก้ไขอัตราภาษีมูลค่าเพิ่ม (VAT) ของร้านค้าจากเดิม 0% เป็น 7% (รวมในราคาสินค้า - Inclusive)'
  }
];

export const mockTradeReceivables: TradeReceivable[] = [
  { id: 'ar-1', customerName: 'บจก. เอสซีจี แพคเกจจิ้ง (จัดเลี้ยง)', amount: 18500, dueDate: '2026-07-25', status: 'PENDING', description: 'ค่าจัดเลี้ยงบุฟเฟต์กะเพราป่าสัมมนาผู้บริหาร', createdAt: '2026-07-15' },
  { id: 'ar-2', customerName: 'คุณอภิชาติ (ลูกค้าเหมาปิ่นโต)', amount: 4200, dueDate: '2026-07-20', status: 'PENDING', description: 'มัดจำค่าผูกปิ่นโตกะเพราเนื้อรายเดือน', createdAt: '2026-07-10' }
];

export const mockTradePayables: TradePayable[] = [
  { id: 'ap-1', supplierName: 'บจก. เบทาโกรจัดส่งพรีเมียม', amount: 5900, dueDate: '2026-07-25', status: 'PENDING', description: 'ค้างจ่ายค่าปูม้าแกะพรีเมียมจาก PO-2026-003', createdAt: '2026-07-13' },
  { id: 'ap-2', supplierName: 'โรงงานพลาสติก มงคลภัณฑ์', amount: 2800, dueDate: '2026-07-18', status: 'PENDING', description: 'ค่ากล่องใส่อาหารเดลิเวอรี่ไซส์มาตรฐาน 500 ใบ', createdAt: '2026-07-12' }
];

export const mockQuotations: Quotation[] = [
  {
    id: 'QT-2026-001',
    customerName: 'บริษัท ไทยเทคโนโลยี จำกัด (มหาชน)',
    customerPhone: '081-999-8877',
    customerEmail: 'catering@thaitech.co.th',
    customerAddress: '123/45 ถนนสาทรใต้ แขวงยานนาวา เขตสาทร กรุงเทพฯ 10120',
    customerTaxId: '0105558012345',
    issueDate: '2026-07-20',
    validUntilDate: '2026-08-05',
    items: [
      { id: 'qti-1', menuItemId: 'm2', name: 'กะเพราหมูกรอบสิบวิ (ข้าวกล่องพรีเมียม)', quantity: 100, unitPrice: 89, amount: 8900, note: 'บรรจุกล่องกระดาษรักษ์โลก พร้อมช้อนส้อม' },
      { id: 'qti-2', menuItemId: 'm4', name: 'ไข่ดาวกรอบลาวา', quantity: 100, unitPrice: 15, amount: 1500 },
      { id: 'qti-3', menuItemId: 'm6', name: 'ชาดำเย็นสูตรโบราณ (แก้ว 22oz)', quantity: 100, unitPrice: 35, amount: 3500 },
      { id: 'qti-4', name: 'ค่าบริการขนส่งและจัดวางอาหารสถานที่จัดเลี้ยง', quantity: 1, unitPrice: 1500, amount: 1500 }
    ],
    subtotal: 15400,
    discount: 400,
    vatType: 'INCLUSIVE',
    vatRate: 7,
    vatAmount: 981.31,
    grandTotal: 15000,
    status: 'SENT',
    notes: 'กำหนดยืนยันสั่งซื้อภายใน 15 วัน ชำระมัดจำ 50% ณ วันอนุมัติใบเสนอราคา',
    branchId: 'b1',
    createdAt: '2026-07-20T10:00:00-07:00',
    preparedBy: 'ผู้จัดการ สมหญิง'
  },
  {
    id: 'QT-2026-002',
    customerName: 'สำนักงานเขตปทุมวัน (กิจกรรมบุฟเฟต์วันแม่)',
    customerPhone: '02-214-3000',
    customerEmail: 'admin@pathumwan.go.th',
    customerAddress: '444 ถนนพระราม 1 แขวงรองเมือง เขตปทุมวัน กรุงเทพฯ 10330',
    customerTaxId: '0994000165432',
    issueDate: '2026-07-18',
    validUntilDate: '2026-08-01',
    items: [
      { id: 'qti-21', menuItemId: 'm1', name: 'กะเพราเนื้อสับโคตรกรอบ (ถาดบุฟเฟต์ใหญ่)', quantity: 5, unitPrice: 1200, amount: 6000, note: 'สำหรับประมาณ 50 ท่าน' },
      { id: 'qti-22', menuItemId: 'm5', name: 'ต้มยำกุ้งแม่น้ำซุปร้อน (หม้อไฟบุฟเฟต์)', quantity: 3, unitPrice: 850, amount: 2550 },
      { id: 'qti-23', name: 'ชุดบริการถาดอุ่นร้อนภาชนะบุฟเฟต์พร้อมพนักงานดูแล 1 ท่าน', quantity: 1, unitPrice: 2000, amount: 2000 }
    ],
    subtotal: 10550,
    discount: 550,
    vatType: 'NO_VAT',
    vatRate: 0,
    vatAmount: 0,
    grandTotal: 10000,
    status: 'ACCEPTED',
    notes: 'อนุมัติแล้ว รอออกใบแจ้งหนี้มัดจำ',
    branchId: 'b1',
    createdAt: '2026-07-18T14:30:00-07:00',
    preparedBy: 'ผู้จัดการ สมหญิง'
  }
];

export const mockOfficialReceipts: OfficialReceipt[] = [
  {
    id: 'RC-2026-001',
    receiptType: 'FULL_TAX',
    customerName: 'บริษัท ไทยเทคโนโลยี จำกัด (มหาชน)',
    customerPhone: '081-999-8877',
    customerEmail: 'finance@thaitech.co.th',
    customerAddress: '123/45 ถนนสาทรใต้ แขวงยานนาวา เขตสาทร กรุงเทพฯ 10120',
    customerTaxId: '0105558012345',
    customerBranch: 'สำนักงานใหญ่',
    issueDate: '2026-07-21',
    items: [
      { id: 'rci-1', name: 'กะเพราหมูกรอบสิบวิ (ชุดข้าวกล่องจัดเลี้ยง)', quantity: 100, unitPrice: 89, amount: 8900 },
      { id: 'rci-2', name: 'ชามะนาวเย็นสดชื่น (22oz)', quantity: 100, unitPrice: 35, amount: 3500 }
    ],
    subtotal: 12400,
    discount: 400,
    serviceCharge: 0,
    vatType: 'INCLUSIVE',
    vatRate: 7,
    vatAmount: 785.05,
    grandTotal: 12000,
    withholdingTaxRate: 3,
    withholdingTaxAmount: 336.45, // 3% of pre-vat 11214.95
    netPaidAmount: 11663.55,
    paymentMethod: 'TRANSFER',
    paymentRef: 'TXN-88492019',
    status: 'ISSUED',
    notes: 'ได้รับเงินโอนชำระเรียบร้อย ขอบคุณที่อุดหนุน',
    issuerName: 'ผู้จัดการ สมหญิง',
    branchId: 'b1',
    createdAt: '2026-07-21T11:20:00-07:00'
  },
  {
    id: 'RC-2026-002',
    receiptType: 'OFFICIAL_RECEIPT',
    customerName: 'คุณอนันต์ สุขสวัสดิ์',
    customerPhone: '089-111-2233',
    issueDate: '2026-07-22',
    items: [
      { id: 'rci-10', name: 'ชุดอาหารจัดเลี้ยงย่อยวันเกิด', quantity: 1, unitPrice: 4500, amount: 4500 }
    ],
    subtotal: 4500,
    discount: 0,
    vatType: 'NO_VAT',
    vatRate: 0,
    vatAmount: 0,
    grandTotal: 4500,
    netPaidAmount: 4500,
    paymentMethod: 'PROMPTPAY',
    paymentRef: 'PP-20260722-102',
    status: 'ISSUED',
    issuerName: 'แอดมิน สมชาย',
    branchId: 'b1',
    createdAt: '2026-07-22T09:15:00-07:00'
  }
];


