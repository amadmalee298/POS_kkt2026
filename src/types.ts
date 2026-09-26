export type UserRole = 'Admin' | 'Manager' | 'Cashier' | 'Staff';

export interface RolePermissions {
  Manager: string[];
  Cashier: string[];
  Staff: string[];
}

export interface User {
  id: string;
  name: string;
  role: UserRole;
  username: string;
  pin?: string;
  password?: string;
}

export interface Branch {
  id: string;
  name: string;
  location: string;
  phone: string;
}

export interface MenuItem {
  id: string;
  name: string;
  price: number;
  cost: number;
  category: string;
  image: string;
  active: boolean;
  recipeId?: string;
  isManualCost?: boolean;
}

export interface RecipeIngredient {
  ingredientId: string;
  amount: number; // in unit (e.g. 100g)
}

export interface Recipe {
  id: string;
  menuItemId: string;
  ingredients: RecipeIngredient[];
}

export interface Ingredient {
  id: string;
  name: string;
  stock: number;
  minStock: number;
  unit: string;
  unitCost: number; // Cost per unit (e.g. THB per kg)
  expiryDate?: string;
  lotNo?: string;
}

export interface StockCardLog {
  id: string;
  ingredientId: string;
  type: 'IN' | 'OUT' | 'ADJUST';
  amount: number;
  remaining: number;
  note: string;
  timestamp: string;
  user: string;
}

export interface Supplier {
  id: string;
  name: string;
  contact: string;
  phone: string;
  address: string;
  leadTimeDays?: number; // Lead time in days for delivery
  bankName?: string;
  bankAccountNo?: string;
  bankAccountName?: string;
}

export interface PurchaseOrderItem {
  ingredientId: string;
  amount: number;
  unitCost: number;
}

export interface PurchaseOrder {
  id: string;
  supplierId: string;
  items: PurchaseOrderItem[];
  status: 'PENDING' | 'RECEIVED' | 'CANCELLED';
  total: number;
  createdAt: string;
  expectedArrivalDate?: string; // Automatically calculated date when items are expected to arrive
  receivedAt?: string;
  paymentSlip?: string; // dataURL of the attached receipt slip
  paymentStatus?: 'UNPAID' | 'PAID';
  paymentDate?: string;
  paymentNote?: string;
  subtotal?: number;
  vatRate?: number;
  vatAmount?: number;
  vatType?: 'INCLUSIVE' | 'EXCLUSIVE' | 'NO_VAT';
}

export interface OrderItem {
  id: string; // unique for item in cart
  menuItemId: string;
  name: string;
  price: number;
  quantity: number;
  addFriedEgg: boolean;
  eggPrice: number;
  notes: string;
}

export interface TaxInvoice {
  invoiceNo: string;
  customerName: string;
  customerTaxId: string;
  customerAddress: string;
  customerBranch: string; // 'สำนักงานใหญ่' or 5-digit branch code
  issuedAt: string;
}

export interface OrderSplit {
  id: string;
  name: string;
  type: 'ITEMS' | 'PERCENTAGE';
  percentage?: number;
  items?: {
    orderItemId: string;
    quantity: number;
  }[];
  total: number;
  paymentStatus: 'PENDING' | 'PAID';
  paymentMethod?: 'CASH' | 'PROMPTPAY' | 'TRANSFER';
}

export interface Order {
  id: string;
  branchId: string;
  tableNo: string;
  items: OrderItem[];
  subtotal: number;
  discount: number;
  total: number;
  paymentMethod: 'CASH' | 'PROMPTPAY' | 'TRANSFER';
  paymentStatus: 'PENDING' | 'PAID' | 'REFUNDED';
  kitchenStatus: 'PENDING' | 'COOKING' | 'READY' | 'SERVED';
  timestamp: string;
  cookingTime?: number; // in seconds
  cashierName: string;
  customerPhone?: string;
  earnedPoints?: number;
  isQROrder?: boolean;
  qrStatus?: 'PENDING_APPROVE' | 'APPROVED' | 'REJECTED';
  cashReceived?: number;
  cashChange?: number;
  vatAmount?: number;
  vatType?: 'INCLUSIVE' | 'EXCLUSIVE';
  serviceChargeAmount?: number;
  synced?: boolean;
  isOfflineCached?: boolean;
  paymentSlip?: string; // dataURL of the transfer slip or payment slip
  taxInvoice?: TaxInvoice;
  splits?: OrderSplit[];
  soNumber?: string; // Sales Order Number e.g. SO-20260802-1001
}

export interface Expense {
  id: string;
  category: 'Rent' | 'Salary' | 'Electricity' | 'Water' | 'Ingredients' | 'Marketing' | 'Other';
  amount: number;
  description: string;
  date: string;
  branchId: string;
  vatAmount?: number;
  vatType?: 'INCLUSIVE' | 'EXCLUSIVE' | 'NO_VAT';
  slipUrl?: string; // photo/slip attached from Telegram or manual upload
  source?: 'MANUAL' | 'TELEGRAM' | 'SLIP_OCR';
  telegramMessageId?: number;
  telegramSender?: string;
  refNo?: string;
}

export interface TelegramExpenseMessage {
  id: string;
  updateId: number;
  messageId: number;
  chatId: number | string;
  senderName: string;
  senderUsername?: string;
  date: string; // ISO date
  rawText?: string;
  caption?: string;
  photoUrl?: string;
  fileId?: string;
  parsedAmount: number;
  parsedCategory: 'Rent' | 'Salary' | 'Electricity' | 'Water' | 'Ingredients' | 'Marketing' | 'Other';
  parsedDescription: string;
  status: 'PENDING' | 'IMPORTED' | 'DISMISSED';
  importedExpenseId?: string;
  receivedAt: string;
}

export interface OtherIncome {
  id: string;
  category: 'Catering' | 'Delivery GP' | 'Space Rental' | 'Franchise Fee' | 'Other';
  amount: number;
  description: string;
  date: string;
  branchId: string;
  vatAmount?: number;
  vatType?: 'INCLUSIVE' | 'EXCLUSIVE' | 'NO_VAT';
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  points: number;
  createdAt: string;
  totalSpend: number;
  ordersCount: number;
}

export interface Promotion {
  id: string;
  code: string;
  name: string;
  type: 'PERCENT' | 'FIXED';
  value: number;
  minSpend: number;
  active: boolean;
}

export interface CashTransaction {
  id: string;
  type: 'INCOME' | 'EXPENSE';
  category: string;
  amount: number;
  description: string;
  date: string;
  referenceId?: string; // e.g. orderId or expenseId
}

export interface NotificationSettings {
  telegramToken: string;
  telegramChatId: string;
  telegramEnabled: boolean;
  telegramBotUsername?: string;
  telegramAutoSyncExpenses?: boolean;
  telegramSyncIntervalMinutes?: number;
  lastTelegramSyncTime?: string;
  lastTelegramUpdateId?: number;
  lineToken: string;
  lineEnabled: boolean;
  notifyLowStock: boolean;
  notifyDailyReport: boolean;
  // New scheduling configuration fields
  alertDays?: string[]; // Day names e.g. ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
  alertTime?: string; // Time string e.g. '18:00'
  alertFrequency?: 'DAILY' | 'WEEKLY' | 'CUSTOM';
  alertStockTime?: string; // Time for stock alerts e.g. '09:00'
  alertStockFrequency?: 'INSTANT' | 'DAILY_SCHEDULED';
}

export interface StoreSettings {
  storeName: string;
  taxRate: number; // in %
  serviceCharge: number; // in %
  currency: string;
  receiptHeader: string;
  receiptFooter: string;
  promptpayId: string; // Mobile or Tax ID
  promptpayName: string;
  vatType?: 'INCLUSIVE' | 'EXCLUSIVE';
  contactPage?: string;
  storeTaxId?: string;
  storeAddress?: string;
  autoBackupFrequency?: 'OFF' | 'DAILY' | 'WEEKLY';
  lastAutoBackupDate?: string;
  showReceiptPreview?: boolean; // false to prevent preview modal from popping up automatically
}

export interface AuditLog {
  id: string;
  timestamp: string;
  user: string;
  username: string;
  role: string;
  actionType: 'RECIPE_UPDATE' | 'PERMISSION_CHANGE' | 'PRICE_MODIFICATION' | 'SYSTEM_UPDATE' | 'USER_MANAGEMENT';
  details: string;
}

export interface TradeReceivable {
  id: string;
  customerName: string;
  amount: number;
  dueDate: string;
  status: 'PENDING' | 'PAID';
  description: string;
  createdAt: string;
  paymentSlip?: string; // dataURL of the payment slip / proof of transfer
}

export interface TradePayable {
  id: string;
  supplierName: string;
  amount: number;
  dueDate: string;
  status: 'PENDING' | 'PAID';
  description: string;
  createdAt: string;
  paymentSlip?: string; // dataURL of the payment slip / proof of transfer
}

export interface QuotationItem {
  id: string;
  menuItemId?: string;
  name: string;
  quantity: number;
  unitPrice: number;
  amount: number;
  note?: string;
}

export interface Quotation {
  id: string; // e.g. QT-2026-001
  customerName: string;
  customerPhone?: string;
  customerEmail?: string;
  customerAddress?: string;
  customerTaxId?: string;
  issueDate: string; // YYYY-MM-DD
  validUntilDate: string; // YYYY-MM-DD
  items: QuotationItem[];
  subtotal: number;
  discount: number;
  vatType: 'INCLUSIVE' | 'EXCLUSIVE' | 'NO_VAT';
  vatRate: number;
  vatAmount: number;
  grandTotal: number;
  status: 'DRAFT' | 'SENT' | 'ACCEPTED' | 'REJECTED' | 'EXPIRED' | 'CONVERTED';
  notes?: string;
  branchId: string;
  createdAt: string;
  convertedOrderId?: string;
  preparedBy?: string;
}

export interface OfficialReceiptItem {
  id: string;
  name: string;
  quantity: number;
  unitPrice: number;
  amount: number;
  note?: string;
}

export interface OfficialReceipt {
  id: string; // e.g. RC-2026-001 or TAX-2026-001
  receiptType: 'FULL_TAX' | 'OFFICIAL_RECEIPT' | 'SIMPLIFIED'; // ใบกำกับภาษีเต็มรูป | ใบเสร็จรับเงินทั่วไป | ใบเสร็จอย่างย่อ
  orderId?: string;
  quotationId?: string;
  soNumber?: string; // Sales Order Number e.g. SO-20260802-001
  customerName: string;
  customerPhone?: string;
  customerEmail?: string;
  customerAddress?: string;
  customerTaxId?: string;
  customerBranch?: string; // 'สำนักงานใหญ่' or '00000'
  issueDate: string; // YYYY-MM-DD
  items: OfficialReceiptItem[];
  subtotal: number;
  discount: number;
  serviceCharge?: number;
  vatType: 'INCLUSIVE' | 'EXCLUSIVE' | 'NO_VAT';
  vatRate: number; // 7
  vatAmount: number;
  grandTotal: number;
  withholdingTaxRate?: number; // 0, 1, 3, 5%
  withholdingTaxAmount?: number;
  netPaidAmount?: number; // grandTotal - withholdingTaxAmount
  paymentMethod: 'CASH' | 'PROMPTPAY' | 'TRANSFER' | 'CREDIT_CARD' | 'AR_CREDIT';
  paymentRef?: string;
  status: 'ISSUED' | 'CANCELLED';
  cancelReason?: string;
  notes?: string;
  issuerName: string;
  branchId: string;
  createdAt: string;
}

export interface BackupData {
  users?: User[];
  branches?: Branch[];
  storeSettings?: StoreSettings;
  notificationSettings?: NotificationSettings;
  menuItems?: MenuItem[];
  recipes?: Recipe[];
  ingredients?: Ingredient[];
  suppliers?: Supplier[];
  purchaseOrders?: PurchaseOrder[];
  customers?: Customer[];
  promotions?: Promotion[];
  orders?: Order[];
  expenses?: Expense[];
  otherIncomes?: OtherIncome[];
  tradeReceivables?: TradeReceivable[];
  tradePayables?: TradePayable[];
  quotations?: Quotation[];
  officialReceipts?: OfficialReceipt[];
  stockLogs?: StockCardLog[];
  auditLogs?: AuditLog[];
  rolePermissions?: RolePermissions;
  backupTimestamp: string;
  version: string;
}


