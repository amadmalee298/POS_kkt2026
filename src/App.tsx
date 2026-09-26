import { useState, useEffect } from 'react';
import { 
  User, MenuItem, Recipe, Ingredient, Supplier, 
  PurchaseOrder, Customer, Promotion, Order, Expense, OtherIncome,
  StoreSettings, NotificationSettings, Branch, StockCardLog, RolePermissions, AuditLog,
  TradeReceivable, TradePayable, Quotation, OfficialReceipt, BackupData
} from './types';
import { 
  mockUsers, mockBranches, defaultStoreSettings, 
  defaultNotificationSettings, mockMenuItems, mockRecipes, 
  mockIngredients, mockSuppliers, mockPurchaseOrders, 
  mockCustomers, mockPromotions, initialOrders, 
  mockExpenses, mockStockCardLogs, mockOtherIncomes, mockAuditLogs,
  mockTradeReceivables, mockTradePayables, mockQuotations, mockOfficialReceipts
} from './mockData';

// Component Imports
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import POS from './components/POS';
import Kitchen from './components/Kitchen';
import Inventory from './components/Inventory';
import RecipeComponent from './components/Recipe';
import Purchase from './components/Purchase';
import Accounting from './components/Accounting';
import { Quotations } from './components/Quotations';
import { ReceiptsComponent } from './components/Receipts';
import Customers from './components/Customers';
import Notifications from './components/Notifications';
import Reports from './components/Reports';
import SettingsComponent from './components/Settings';
import QROrdering from './components/QROrdering';
import QRClientOrder from './components/QRClientOrder';
import OnboardingWizard from './components/OnboardingWizard';
import { sendToTelegram } from './utils/telegram';

// Icon Imports
import { 
  LayoutDashboard, ShoppingCart, Flame, Boxes, BookOpen, 
  Truck, FileText, Users, Bell, BarChart3, Settings, 
  LogOut, Clock, MapPin, Sparkles, Menu, X, ShieldAlert, QrCode,
  Wifi, WifiOff, RefreshCw, FileSpreadsheet, Receipt
} from 'lucide-react';

export default function App() {
  // --- CENTRAL STATES ---
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activeBranchId, setActiveBranchId] = useState<string>('b1');
  const [activeTab, setActiveTab] = useState<string>('POS');
  const [showOnboarding, setShowOnboarding] = useState<boolean>(false);

  // Network and offline simulation states
  const [isOnline, setIsOnline] = useState<boolean>(() => typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [simulateOffline, setSimulateOffline] = useState<boolean>(() => {
    return localStorage.getItem('kp_simulate_offline') === 'true';
  });
  const [syncingOffline, setSyncingOffline] = useState<boolean>(false);

  // Dynamic role permissions state
  const [rolePermissions, setRolePermissions] = useState<RolePermissions>(() => {
    const saved = localStorage.getItem('kp_rolePermissions');
    return saved ? JSON.parse(saved) : {
      Manager: ['DASHBOARD', 'POS', 'QR_ORDERING', 'KITCHEN', 'INVENTORY', 'RECIPES', 'PURCHASE', 'ACCOUNTING', 'QUOTATION', 'RECEIPT', 'CRM', 'REPORTS'],
      Cashier: ['POS', 'QR_ORDERING', 'KITCHEN', 'QUOTATION', 'RECEIPT', 'CRM'],
      Staff: ['KITCHEN']
    };
  });

  // Database core states
  const [users, setUsers] = useState<User[]>(() => {
    const saved = localStorage.getItem('kp_users');
    return saved ? JSON.parse(saved) : mockUsers;
  });
  const [branches, setBranches] = useState<Branch[]>(() => {
    const saved = localStorage.getItem('kp_branches');
    return saved ? JSON.parse(saved) : mockBranches;
  });
  const [storeSettings, setStoreSettings] = useState<StoreSettings>(() => {
    const saved = localStorage.getItem('kp_storeSettings');
    return saved ? JSON.parse(saved) : defaultStoreSettings;
  });
  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>(() => {
    const saved = localStorage.getItem('kp_notificationSettings');
    return saved ? JSON.parse(saved) : defaultNotificationSettings;
  });
  const [menuItems, setMenuItems] = useState<MenuItem[]>(() => {
    const saved = localStorage.getItem('kp_menuItems');
    return saved ? JSON.parse(saved) : mockMenuItems;
  });
  const [recipes, setRecipes] = useState<Recipe[]>(() => {
    const saved = localStorage.getItem('kp_recipes');
    return saved ? JSON.parse(saved) : mockRecipes;
  });
  const [ingredients, setIngredients] = useState<Ingredient[]>(() => {
    const saved = localStorage.getItem('kp_ingredients');
    return saved ? JSON.parse(saved) : mockIngredients;
  });
  const [suppliers, setSuppliers] = useState<Supplier[]>(() => {
    const saved = localStorage.getItem('kp_suppliers');
    return saved ? JSON.parse(saved) : mockSuppliers;
  });
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>(() => {
    const saved = localStorage.getItem('kp_purchaseOrders');
    return saved ? JSON.parse(saved) : mockPurchaseOrders;
  });
  const [customers, setCustomers] = useState<Customer[]>(() => {
    const saved = localStorage.getItem('kp_customers');
    return saved ? JSON.parse(saved) : mockCustomers;
  });
  const [promotions, setPromotions] = useState<Promotion[]>(() => {
    const saved = localStorage.getItem('kp_promotions');
    return saved ? JSON.parse(saved) : mockPromotions;
  });
  const [orders, setOrders] = useState<Order[]>(() => {
    const saved = localStorage.getItem('kp_orders');
    return saved ? JSON.parse(saved) : initialOrders;
  });
  const [expenses, setExpenses] = useState<Expense[]>(() => {
    const saved = localStorage.getItem('kp_expenses');
    return saved ? JSON.parse(saved) : mockExpenses;
  });
  const [otherIncomes, setOtherIncomes] = useState<OtherIncome[]>(() => {
    const saved = localStorage.getItem('kp_otherIncomes');
    return saved ? JSON.parse(saved) : mockOtherIncomes;
  });
  const [tradeReceivables, setTradeReceivables] = useState<TradeReceivable[]>(() => {
    const saved = localStorage.getItem('kp_tradeReceivables');
    return saved ? JSON.parse(saved) : mockTradeReceivables;
  });
  const [tradePayables, setTradePayables] = useState<TradePayable[]>(() => {
    const saved = localStorage.getItem('kp_tradePayables');
    return saved ? JSON.parse(saved) : mockTradePayables;
  });
  const [quotations, setQuotations] = useState<Quotation[]>(() => {
    const saved = localStorage.getItem('kp_quotations');
    return saved ? JSON.parse(saved) : mockQuotations;
  });
  const [officialReceipts, setOfficialReceipts] = useState<OfficialReceipt[]>(() => {
    const saved = localStorage.getItem('kp_officialReceipts');
    return saved ? JSON.parse(saved) : mockOfficialReceipts;
  });
  const [stockLogs, setStockLogs] = useState<StockCardLog[]>(() => {
    const saved = localStorage.getItem('kp_stockLogs');
    return saved ? JSON.parse(saved) : mockStockCardLogs;
  });
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(() => {
    const saved = localStorage.getItem('kp_auditLogs');
    return saved ? JSON.parse(saved) : mockAuditLogs;
  });

  // Mobile sidebar trigger
  const [sidebarOpen, setSidebarOpen] = useState(false);
  // Local Clock state
  const [currentTime, setCurrentTime] = useState<string>('');

  // Detect if scanning Table QR code
  const [tableNo, setTableNo] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const table = params.get('table');
    if (table) {
      setTableNo(table);
    }
  }, []);

  // Save states to localStorage on modifications
  useEffect(() => { localStorage.setItem('kp_users', JSON.stringify(users)); }, [users]);
  useEffect(() => { localStorage.setItem('kp_branches', JSON.stringify(branches)); }, [branches]);
  useEffect(() => { localStorage.setItem('kp_storeSettings', JSON.stringify(storeSettings)); }, [storeSettings]);
  useEffect(() => { localStorage.setItem('kp_notificationSettings', JSON.stringify(notificationSettings)); }, [notificationSettings]);
  useEffect(() => { localStorage.setItem('kp_menuItems', JSON.stringify(menuItems)); }, [menuItems]);
  useEffect(() => { localStorage.setItem('kp_recipes', JSON.stringify(recipes)); }, [recipes]);
  useEffect(() => { localStorage.setItem('kp_ingredients', JSON.stringify(ingredients)); }, [ingredients]);
  useEffect(() => { localStorage.setItem('kp_suppliers', JSON.stringify(suppliers)); }, [suppliers]);
  useEffect(() => { localStorage.setItem('kp_purchaseOrders', JSON.stringify(purchaseOrders)); }, [purchaseOrders]);
  useEffect(() => { localStorage.setItem('kp_customers', JSON.stringify(customers)); }, [customers]);
  useEffect(() => { localStorage.setItem('kp_promotions', JSON.stringify(promotions)); }, [promotions]);
  useEffect(() => { localStorage.setItem('kp_orders', JSON.stringify(orders)); }, [orders]);
  useEffect(() => { localStorage.setItem('kp_expenses', JSON.stringify(expenses)); }, [expenses]);
  useEffect(() => { localStorage.setItem('kp_otherIncomes', JSON.stringify(otherIncomes)); }, [otherIncomes]);
  useEffect(() => { localStorage.setItem('kp_tradeReceivables', JSON.stringify(tradeReceivables)); }, [tradeReceivables]);
  useEffect(() => { localStorage.setItem('kp_tradePayables', JSON.stringify(tradePayables)); }, [tradePayables]);
  useEffect(() => { localStorage.setItem('kp_quotations', JSON.stringify(quotations)); }, [quotations]);
  useEffect(() => { localStorage.setItem('kp_officialReceipts', JSON.stringify(officialReceipts)); }, [officialReceipts]);
  useEffect(() => { localStorage.setItem('kp_stockLogs', JSON.stringify(stockLogs)); }, [stockLogs]);
  useEffect(() => { localStorage.setItem('kp_auditLogs', JSON.stringify(auditLogs)); }, [auditLogs]);
  useEffect(() => { localStorage.setItem('kp_rolePermissions', JSON.stringify(rolePermissions)); }, [rolePermissions]);

  // Realtime multi-tab cross-sync via Storage Events
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'kp_orders' && e.newValue) {
        setOrders(JSON.parse(e.newValue));
      }
      if (e.key === 'kp_otherIncomes' && e.newValue) {
        setOtherIncomes(JSON.parse(e.newValue));
      }
      if (e.key === 'kp_tradeReceivables' && e.newValue) {
        setTradeReceivables(JSON.parse(e.newValue));
      }
      if (e.key === 'kp_tradePayables' && e.newValue) {
        setTradePayables(JSON.parse(e.newValue));
      }
      if (e.key === 'kp_quotations' && e.newValue) {
        setQuotations(JSON.parse(e.newValue));
      }
      if (e.key === 'kp_expenses' && e.newValue) {
        setExpenses(JSON.parse(e.newValue));
      }
      if (e.key === 'kp_ingredients' && e.newValue) {
        setIngredients(JSON.parse(e.newValue));
      }
      if (e.key === 'kp_stockLogs' && e.newValue) {
        setStockLogs(JSON.parse(e.newValue));
      }
      if (e.key === 'kp_customers' && e.newValue) {
        setCustomers(JSON.parse(e.newValue));
      }
      if (e.key === 'kp_auditLogs' && e.newValue) {
        setAuditLogs(JSON.parse(e.newValue));
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Update clock effect
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Save offline simulator status
  useEffect(() => {
    localStorage.setItem('kp_simulate_offline', String(simulateOffline));
  }, [simulateOffline]);

  // Network connection event listeners
  useEffect(() => {
    const goOnline = () => {
      setIsOnline(true);
    };
    const goOffline = () => {
      setIsOnline(false);
    };
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  // Sync offline transactions to mock backend cloud database
  const handleSyncOfflineOrders = () => {
    const unsyncedCount = orders.filter(o => !o.synced).length;
    if (unsyncedCount === 0) {
      alert('ไม่มีออเดอร์ออฟไลน์ที่รอการซิงค์ข้อมูล');
      return;
    }

    setSyncingOffline(true);
    // Simulate real cloud transmission sequence
    setTimeout(() => {
      setOrders(prevOrders => {
        const updated = prevOrders.map(o => {
          if (!o.synced) {
            return { ...o, synced: true, isOfflineCached: false };
          }
          return o;
        });
        return updated;
      });
      setSyncingOffline(false);
      alert(`🎉 ซิงค์ออเดอร์สะสมออฟไลน์จำนวน ${unsyncedCount} รายการเข้าสู่ระเบียนระบบเซิร์ฟเวอร์หลักเสร็จสมบูรณ์!`);
    }, 2000);
  };

  // Automatically trigger sync when network status changes from offline to online
  useEffect(() => {
    const effectiveOnline = isOnline && !simulateOffline;
    if (effectiveOnline) {
      const unsyncedCount = orders.filter(o => !o.synced).length;
      if (unsyncedCount > 0) {
        setSyncingOffline(true);
        const timer = setTimeout(() => {
          setOrders(prevOrders => {
            return prevOrders.map(o => {
              if (!o.synced) {
                return { ...o, synced: true, isOfflineCached: false };
              }
              return o;
            });
          });
          setSyncingOffline(false);
          console.log(`[AutoSync] Synced ${unsyncedCount} offline transactions.`);
        }, 1500);
        return () => clearTimeout(timer);
      }
    }
  }, [isOnline, simulateOffline, orders.length]);

  // Background Scheduler for LINE & Telegram Custom Alerts
  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      const currentDay = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][now.getDay()]; // Sun, Mon, Tue, etc.
      const currentHour = String(now.getHours()).padStart(2, '0');
      const currentMinute = String(now.getMinutes()).padStart(2, '0');
      const currentTimeStr = `${currentHour}:${currentMinute}`;
      const todayDateStr = now.toDateString();

      // Check sales report schedule
      if (notificationSettings.notifyDailyReport) {
        const schedTime = notificationSettings.alertTime || '20:00';
        const schedDays = notificationSettings.alertDays || ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
        
        if (currentTimeStr === schedTime && schedDays.includes(currentDay)) {
          const lastTriggeredReport = localStorage.getItem('kp_last_triggered_report_date');
          if (lastTriggeredReport !== todayDateStr) {
            localStorage.setItem('kp_last_triggered_report_date', todayDateStr);
            
            // Format and send daily report
            const dayOrders = orders.filter(o => o.paymentStatus === 'PAID' && o.timestamp.startsWith(now.toISOString().split('T')[0]));
            const totalSales = dayOrders.reduce((sum, o) => sum + o.total, 0);
            
            const msg = `<b>⏰ [รายงานสรุปยอดขายตามกำหนดเวลา]</b>\n\n📅 ประจำวันที่: ${now.toLocaleDateString('th-TH')}\n💰 ยอดขายรวม: ${totalSales.toLocaleString()} บาท\n🧾 จำนวน: ${dayOrders.length} ออเดอร์\n\n🔔 แจ้งเตือนอัตโนมัติตามกำหนดเวลาที่ตั้งไว้`;
            
            if (notificationSettings.telegramEnabled && notificationSettings.telegramToken && notificationSettings.telegramChatId) {
              sendToTelegram(notificationSettings.telegramToken, notificationSettings.telegramChatId, msg)
                .catch(err => console.error('Cron Telegram sales report failed:', err));
            }
          }
        }
      }

      // Check stock alert schedule
      if (notificationSettings.notifyLowStock && notificationSettings.alertStockFrequency === 'DAILY_SCHEDULED') {
        const stockTime = notificationSettings.alertStockTime || '09:00';
        if (currentTimeStr === stockTime) {
          const lastTriggeredStock = localStorage.getItem('kp_last_triggered_stock_date');
          if (lastTriggeredStock !== todayDateStr) {
            localStorage.setItem('kp_last_triggered_stock_date', todayDateStr);

            const lowIngredients = ingredients.filter(i => i.stock <= i.minStock);
            let stockReportMsg = '';
            if (lowIngredients.length === 0) {
              stockReportMsg = `<b>🚨 [รายงานสรุปสต็อกตามกำหนดเวลา]</b>\n\n🟢 วัตถุดิบทุกรายการปกติ ไม่มีสินค้าต่ำกว่าเกณฑ์ขั้นต่ำ!`;
            } else {
              const lines = lowIngredients.map(i => `• ${i.name}: เหลือ ${i.stock} ${i.unit} (เกณฑ์ต่ำสุด ${i.minStock})`);
              stockReportMsg = `<b>🚨 [รายงานสรุปสต็อกต่ำตามกำหนดเวลา]</b>\n\n${lines.join('\n')}\n\n⚠️ กรุณาดำเนินการจัดซื้อวัตถุดิบเพิ่มเติม`;
            }

            if (notificationSettings.telegramEnabled && notificationSettings.telegramToken && notificationSettings.telegramChatId) {
              sendToTelegram(notificationSettings.telegramToken, notificationSettings.telegramChatId, stockReportMsg)
                .catch(err => console.error('Cron Telegram stock report failed:', err));
            }
          }
        }
      }

    }, 30000); // Check every 30 seconds

    return () => clearInterval(interval);
  }, [notificationSettings, orders, ingredients]);

  // When current user changes, direct them to their default authorised tab
  useEffect(() => {
    if (currentUser) {
      if (currentUser.role === 'Staff') {
        setActiveTab('KITCHEN');
      } else if (currentUser.role === 'Cashier') {
        setActiveTab('POS');
      } else {
        setActiveTab('DASHBOARD');
      }
    }
  }, [currentUser]);

  // Logout action
  const handleLogout = () => {
    setCurrentUser(null);
    setSidebarOpen(false);
  };

  // Get name of current branch
  const activeBranch = branches.find(b => b.id === activeBranchId) || branches[0];

  // Role permissions checking
  const isAuthorized = (tabId: string) => {
    if (!currentUser) return false;
    const role = currentUser.role;

    if (role === 'Admin') return true; // Admin has complete access to everything

    if (role === 'Manager') {
      return (rolePermissions.Manager || []).includes(tabId);
    }

    if (role === 'Cashier') {
      return (rolePermissions.Cashier || []).includes(tabId);
    }

    if (role === 'Staff') {
      return (rolePermissions.Staff || []).includes(tabId);
    }

    return false;
  };

  // Sidebar navigation menu options
  const navItems = [
    { id: 'DASHBOARD', label: 'แดชบอร์ดสรุปผู้บริหาร', icon: LayoutDashboard },
    { id: 'POS', label: 'ระบบขายหน้าร้าน (POS)', icon: ShoppingCart },
    { id: 'QR_ORDERING', label: 'ระบบสั่งอาหารคิวอาร์ (QR)', icon: QrCode },
    { id: 'KITCHEN', label: 'ระบบครัว (KDS)', icon: Flame },
    { id: 'INVENTORY', label: 'สต๊อกวัตถุดิบอัตโนมัติ', icon: Boxes },
    { id: 'RECIPES', label: 'เมนูและสูตรตัดสต๊อก', icon: BookOpen },
    { id: 'PURCHASE', label: 'จัดซื้อ PO & ซัพพลายเออร์', icon: Truck },
    { id: 'ACCOUNTING', label: 'การเงินและสมุดบัญชี', icon: FileText },
    { id: 'QUOTATION', label: 'ใบเสนอราคา (Quotations)', icon: FileSpreadsheet },
    { id: 'RECEIPT', label: 'ใบเสร็จรับเงิน & ใบกำกับภาษี', icon: Receipt },
    { id: 'CRM', label: 'สมาชิก CRM & คูปอง', icon: Users },
    { id: 'ALERTS', label: 'แจ้งเตือนไลน์ Telegram', icon: Bell },
    { id: 'REPORTS', label: 'วิเคราะห์ผลประกอบการ', icon: BarChart3 },
    { id: 'SETTINGS', label: 'ตั้งค่าร้าน & สาขาพ่วง', icon: Settings },
  ];

  // Filter menu items by authorization
  const visibleNavItems = navItems.filter(item => isAuthorized(item.id));

  // --- ACTIONS HANDLERS (STATE MUTATIONS & CALIBRATIONS) ---

  // Add Audit Trail Log
  const handleAddAuditLog = (
    actionType: 'RECIPE_UPDATE' | 'PERMISSION_CHANGE' | 'PRICE_MODIFICATION' | 'SYSTEM_UPDATE' | 'USER_MANAGEMENT',
    details: string
  ) => {
    if (!currentUser) return;
    const newLog: AuditLog = {
      id: `audit-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      user: currentUser.name,
      username: currentUser.username,
      role: currentUser.role,
      actionType,
      details
    };
    setAuditLogs(prev => [newLog, ...prev]);
  };

  // Generate structured snapshot of entire current system state
  const handleGetBackupData = (): BackupData => {
    return {
      users,
      branches,
      storeSettings,
      notificationSettings,
      menuItems,
      recipes,
      ingredients,
      suppliers,
      purchaseOrders,
      customers,
      promotions,
      orders,
      expenses,
      otherIncomes,
      tradeReceivables,
      tradePayables,
      quotations,
      officialReceipts,
      stockLogs,
      auditLogs,
      rolePermissions,
      backupTimestamp: new Date().toISOString(),
      version: '1.2.4-enterprise'
    };
  };

  // Perform full state restore from the parsed backup snapshot
  const handleRestoreBackup = (backup: BackupData) => {
    if (backup.users) setUsers(backup.users);
    if (backup.branches) setBranches(backup.branches);
    if (backup.storeSettings) setStoreSettings(backup.storeSettings);
    if (backup.notificationSettings) setNotificationSettings(backup.notificationSettings);
    if (backup.menuItems) setMenuItems(backup.menuItems);
    if (backup.recipes) setRecipes(backup.recipes);
    if (backup.ingredients) setIngredients(backup.ingredients);
    if (backup.suppliers) setSuppliers(backup.suppliers);
    if (backup.purchaseOrders) setPurchaseOrders(backup.purchaseOrders);
    if (backup.customers) setCustomers(backup.customers);
    if (backup.promotions) setPromotions(backup.promotions);
    if (backup.orders) setOrders(backup.orders);
    if (backup.expenses) setExpenses(backup.expenses);
    if (backup.otherIncomes) setOtherIncomes(backup.otherIncomes);
    if (backup.tradeReceivables) setTradeReceivables(backup.tradeReceivables);
    if (backup.tradePayables) setTradePayables(backup.tradePayables);
    if (backup.quotations) setQuotations(backup.quotations);
    if (backup.officialReceipts) setOfficialReceipts(backup.officialReceipts);
    if (backup.stockLogs) setStockLogs(backup.stockLogs);
    if (backup.rolePermissions) setRolePermissions(backup.rolePermissions);
    
    // Log the restore event to audit logs
    const now = new Date();
    const newLog: AuditLog = {
      id: `audit-${now.getTime()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: now.toISOString(),
      user: currentUser ? currentUser.name : 'System',
      username: currentUser ? currentUser.username : 'system',
      role: currentUser ? currentUser.role : 'Admin',
      actionType: 'SYSTEM_UPDATE',
      details: 'นำเข้าข้อมูลสำรองระบบและกู้คืนระเบียนทั้งหมดสำเร็จ (Manual Backup Restored)'
    };
    
    if (backup.auditLogs) {
      setAuditLogs([newLog, ...backup.auditLogs]);
    } else {
      setAuditLogs(prev => [newLog, ...prev]);
    }
  };

  // Perform full system cleanup / factory reset
  const handleSystemCleanup = (mode: 'TRANSACTIONS' | 'ALL') => {
    // Clear transactions
    setOrders([]);
    setExpenses([]);
    setOtherIncomes([]);
    setStockLogs([]);
    setPurchaseOrders([]);
    setTradeReceivables([]);
    setTradePayables([]);
    setQuotations([]);
    setOfficialReceipts([]);

    if (mode === 'ALL') {
      // Factory reset configuration data as well
      setMenuItems([]);
      setRecipes([]);
      setIngredients([]);
      setSuppliers([]);
      setCustomers([]);
      setPromotions([]);
      
      // Reset users but keep current logged in user so they are not logged out
      if (currentUser) {
        setUsers([currentUser]);
      }
      
      // Reset branches to 1 default branch
      setBranches([{
        id: 'b1',
        name: 'สาขาหลัก',
        location: 'กรุงเทพฯ',
        phone: '02-123-4567'
      }]);
    }

    // Add a single audit log entry detailing the cleanup
    const now = new Date();
    const newLog: AuditLog = {
      id: `audit-${now.getTime()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: now.toISOString(),
      user: currentUser ? currentUser.name : 'System',
      username: currentUser ? currentUser.username : 'system',
      role: currentUser ? currentUser.role : 'Admin',
      actionType: 'SYSTEM_UPDATE',
      details: mode === 'TRANSACTIONS'
        ? 'ล้างข้อมูลธุรกรรมระบบทั้งหมดสำเร็จ (เตรียมใช้งานจริง)'
        : 'ล้างทำความสะอาดระบบทั้งหมดกลับเป็นค่าเริ่มต้น (Factory Reset)'
    };
    setAuditLogs([newLog]);
  };

  // Handle POS order completed (Deducts stock automatically!)
  const handleOrderCompleted = (newOrder: Order, updatedIngredientsList: Ingredient[], newLogs?: StockCardLog[]) => {
    const isCurrentlyOnline = isOnline && !simulateOffline;
    const syncedOrder: Order = {
      ...newOrder,
      synced: isCurrentlyOnline,
      isOfflineCached: !isCurrentlyOnline
    };

    setOrders(prev => [syncedOrder, ...prev]);
    setIngredients(updatedIngredientsList);
    if (newLogs) {
      setStockLogs(prev => [...newLogs, ...prev]);
    }
    
    // Automatically update CRM customer points and total spends if linked
    if (newOrder.customerPhone) {
      setCustomers(prevCusts => {
        return prevCusts.map(c => {
          if (c.phone === newOrder.customerPhone) {
            return {
              ...c,
              points: c.points + (newOrder.earnedPoints || 0),
              totalSpend: c.totalSpend + newOrder.total,
              ordersCount: c.ordersCount + 1
            };
          }
          return c;
        });
      });
    }
  };

  // Handle Kitchen cooking status updates
  const handleUpdateKitchenStatus = (orderId: string, newStatus: 'PENDING' | 'COOKING' | 'READY' | 'SERVED') => {
    setOrders(prevOrders => {
      return prevOrders.map(o => {
        if (o.id === orderId) {
          const updatedItems = o.items.map(item => ({ ...item, status: newStatus }));
          return {
            ...o,
            kitchenStatus: newStatus,
            items: updatedItems
          };
        }
        return o;
      });
    });
  };

  // Handle ingredient adjustments directly from Inventory.tsx
  const handleUpdateIngredients = (updatedList: Ingredient[], newLogs: StockCardLog[]) => {
    setIngredients(updatedList);
    setStockLogs(prev => [...newLogs, ...prev]);
  };

  // Handle menu changes from Recipe.tsx
  const handleUpdateMenuItems = (updatedItems: MenuItem[], updatedRecipes: Recipe[]) => {
    setMenuItems(updatedItems);
    setRecipes(updatedRecipes);
  };

  // Handle Purchase order actions from Purchase.tsx
  const handleUpdatePurchaseOrders = (updatedPOs: PurchaseOrder[], updatedIngs: Ingredient[], newLogs: StockCardLog[]) => {
    setPurchaseOrders(updatedPOs);
    setIngredients(updatedIngs);
    if (newLogs.length > 0) {
      setStockLogs(prev => [...newLogs, ...prev]);
    }
  };

  // Handle new manual expense logging
  const handleAddExpense = (newExp: Expense) => {
    setExpenses(prev => [newExp, ...prev]);

    // Send Telegram alert if enabled
    if (notificationSettings.telegramEnabled && notificationSettings.telegramToken && notificationSettings.telegramChatId) {
      const categoryMap: Record<string, string> = {
        Rent: 'ค่าเช่า',
        Salary: 'เงินเดือน',
        Electricity: 'ค่าไฟ',
        Water: 'ค่าน้ำ',
        Ingredients: 'วัตถุดิบ',
        Marketing: 'การตลาด',
        Other: 'อื่น ๆ'
      };
      
      const timeStr = new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
      const msg = `<b>💸 มีการบันทึกค่าใช้จ่าย</b>

หมวด : ${categoryMap[newExp.category] || newExp.category}
รายการ : ${newExp.description}
ยอดเงิน : ${newExp.amount.toLocaleString()} บาท

ผู้บันทึก : ${currentUser?.name || 'Admin'}
เวลา : ${timeStr} น.`;

      sendToTelegram(notificationSettings.telegramToken, notificationSettings.telegramChatId, msg)
        .catch(err => console.error("Auto Telegram Expense Notification failed:", err));
    }
  };

  // Handle new manual other income logging
  const handleAddOtherIncome = (newInc: OtherIncome) => {
    setOtherIncomes(prev => [newInc, ...prev]);
  };

  // Handle new manual customer signup
  const handleAddCustomer = (newCust: Customer) => {
    setCustomers(prev => [newCust, ...prev]);
  };

  // --- RENDER ROUTING PANELS ---
  const renderContent = () => {
    switch (activeTab) {
      case 'DASHBOARD':
        return (
          <Dashboard 
            orders={orders} 
            ingredients={ingredients} 
            menuItems={menuItems}
            expenses={expenses} 
            currency={storeSettings.currency} 
          />
        );
      case 'POS':
        return (
          <POS 
            menuItems={menuItems} 
            recipes={recipes} 
            ingredients={ingredients} 
            promotions={promotions} 
            currentUser={currentUser!}
            onOrderCompleted={handleOrderCompleted}
            currency={storeSettings.currency} 
            taxRate={storeSettings.taxRate}
            storeSettings={storeSettings}
            orders={orders}
            onUpdateOrders={setOrders}
            isOnline={isOnline && !simulateOffline}
            simulateOffline={simulateOffline}
            onToggleSimulateOffline={() => setSimulateOffline(prev => !prev)}
            onSyncOffline={handleSyncOfflineOrders}
            syncingOffline={syncingOffline}
            onAddExpense={handleAddExpense}
            activeBranchId={activeBranchId}
          />
        );
      case 'QR_ORDERING':
        return (
          <QROrdering 
            orders={orders}
            menuItems={menuItems}
            recipes={recipes}
            ingredients={ingredients}
            promotions={promotions}
            storeSettings={storeSettings}
            onUpdateIngredients={setIngredients}
            onOrderCompleted={handleOrderCompleted}
            onUpdateKitchenStatus={handleUpdateKitchenStatus}
            onUpdateOrdersList={setOrders}
            currency={storeSettings.currency}
          />
        );
      case 'KITCHEN':
        return (
          <Kitchen 
            orders={orders} 
            onUpdateKitchenStatus={handleUpdateKitchenStatus} 
            onRefreshOrders={() => {
              const saved = localStorage.getItem('kp_orders');
              if (saved) {
                setOrders(JSON.parse(saved));
              }
            }}
          />
        );
      case 'INVENTORY':
        return (
          <Inventory 
            ingredients={ingredients} 
            stockLogs={stockLogs} 
            currentUser={currentUser!}
            onUpdateIngredients={handleUpdateIngredients} 
          />
        );
      case 'RECIPES':
        return (
          <RecipeComponent 
            menuItems={menuItems} 
            recipes={recipes} 
            ingredients={ingredients} 
            onUpdateMenuItems={handleUpdateMenuItems} 
            currency={storeSettings.currency}
            onAddAuditLog={handleAddAuditLog}
          />
        );
      case 'PURCHASE':
        return (
          <Purchase 
            suppliers={suppliers} 
            purchaseOrders={purchaseOrders} 
            ingredients={ingredients} 
            currentUser={currentUser!}
            onUpdatePurchaseOrders={handleUpdatePurchaseOrders} 
            onUpdateSuppliers={setSuppliers}
            currency={storeSettings.currency}
          />
        );
      case 'ACCOUNTING':
        return (
          <Accounting 
            expenses={expenses} 
            orders={orders} 
            ingredients={ingredients} 
            onAddExpense={handleAddExpense} 
            currency={storeSettings.currency}
            otherIncomes={otherIncomes}
            onAddOtherIncome={handleAddOtherIncome}
            onUpdateOtherIncomes={setOtherIncomes}
            onUpdateExpenses={setExpenses}
            tradeReceivables={tradeReceivables}
            onUpdateTradeReceivables={setTradeReceivables}
            tradePayables={tradePayables}
            onUpdateTradePayables={setTradePayables}
            purchaseOrders={purchaseOrders}
            suppliers={suppliers}
            storeSettings={storeSettings}
            onUpdateOrders={setOrders}
            notificationSettings={notificationSettings}
            onUpdateNotificationSettings={setNotificationSettings}
          />
        );
      case 'QUOTATION':
        return (
          <Quotations
            quotations={quotations}
            onUpdateQuotations={setQuotations}
            customers={customers}
            menuItems={menuItems}
            storeSettings={storeSettings}
            currentUser={currentUser!}
            currency={storeSettings.currency}
            activeBranchId={activeBranchId}
            onAddTradeReceivable={(newAR) => setTradeReceivables(prev => [newAR, ...prev])}
          />
        );
      case 'RECEIPT':
        return (
          <ReceiptsComponent
            receipts={officialReceipts}
            onUpdateReceipts={setOfficialReceipts}
            customers={customers}
            menuItems={menuItems}
            orders={orders}
            quotations={quotations}
            storeSettings={storeSettings}
            currentUser={currentUser!}
            currency={storeSettings.currency}
            activeBranchId={activeBranchId}
            onAddOtherIncome={handleAddOtherIncome}
          />
        );
      case 'CRM':
        return (
          <Customers 
            customers={customers} 
            promotions={promotions} 
            orders={orders} 
            onAddCustomer={handleAddCustomer} 
            onUpdatePromotions={setPromotions}
            currency={storeSettings.currency}
            onAddAuditLog={handleAddAuditLog}
          />
        );
      case 'ALERTS':
        return (
          <Notifications 
            settings={notificationSettings} 
            onUpdateSettings={setNotificationSettings} 
            orders={orders}
            expenses={expenses}
            ingredients={ingredients}
            menuItems={menuItems}
            currency={storeSettings.currency}
          />
        );
      case 'REPORTS':
        return (
          <Reports 
            orders={orders} 
            menuItems={menuItems} 
            ingredients={ingredients} 
            expenses={expenses} 
            currency={storeSettings.currency}
          />
        );
      case 'SETTINGS':
        return (
          <SettingsComponent 
            settings={storeSettings} 
            branches={branches} 
            users={users} 
            onUpdateSettings={setStoreSettings} 
            onUpdateBranches={setBranches} 
            onUpdateUsers={setUsers}
            activeBranchId={activeBranchId}
            onSwitchBranch={setActiveBranchId}
            rolePermissions={rolePermissions}
            onUpdatePermissions={setRolePermissions}
            currentUser={currentUser!}
            auditLogs={auditLogs}
            onAddAuditLog={handleAddAuditLog}
            onGetBackupData={handleGetBackupData}
            onRestoreBackup={handleRestoreBackup}
            onOpenOnboarding={() => setShowOnboarding(true)}
            onSystemCleanup={handleSystemCleanup}
          />
        );
      default:
        return <div className="text-white p-6">ยังไม่เปิดให้บริการส่วนนี้</div>;
    }
  };

  // RENDER CUSTOMER QR ORDER SCREEN IF TABLE IS DETECTED IN URL
  if (tableNo) {
    return (
      <QRClientOrder 
        tableNo={tableNo}
        menuItems={menuItems}
        recipes={recipes}
        ingredients={ingredients}
        promotions={promotions}
        storeSettings={storeSettings}
        onOrderCompleted={handleOrderCompleted}
        orders={orders}
        onUpdateOrders={setOrders}
      />
    );
  }

  // RENDER LOGIN SCREEN IF NO SESSION ACTIVE
  if (!currentUser) {
    return <Login onLoginSuccess={setCurrentUser} users={users} />;
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      
      {/* GLOBAL HEADER BAR */}
      <header className="bg-slate-900 border-b border-slate-800 h-16 px-4 flex items-center justify-between shrink-0 sticky top-0 z-40">
        
        {/* Left side brand name / Mobile trigger */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-1.5 hover:bg-slate-800 rounded-xl lg:hidden text-slate-300"
          >
            {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl overflow-hidden border border-slate-700 bg-slate-950 flex items-center justify-center shrink-0 shadow-md">
              <img 
                src="/src/assets/images/app_logo_1784468034081.jpg" 
                alt="Logo" 
                className="w-full h-full object-cover" 
                referrerPolicy="no-referrer"
              />
            </div>
            <div className="hidden sm:block">
              <h1 className="text-xs font-black tracking-tight text-white uppercase">{storeSettings.storeName}</h1>
              <span className="text-[9px] text-red-500 font-bold block mt-0.5 tracking-wider font-mono">ENTERPRISE CLOUD</span>
            </div>
          </div>
        </div>

        {/* Right side status panels (Clock, Branch switch, User role badge, Logout) */}
        <div className="flex items-center gap-4">

          {/* Connection Status & Simulated Interrupt Button */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setSimulateOffline(prev => !prev)}
              title={simulateOffline ? "คลิกเพื่อจำลองเชื่อมต่อเน็ตกลับคืน" : "คลิกเพื่อจำลองเน็ตหลุด (ออฟไลน์)"}
              className={`flex items-center gap-1 text-[10px] font-bold px-2.5 py-1.5 rounded-xl border transition-all cursor-pointer ${
                (isOnline && !simulateOffline)
                  ? 'bg-emerald-950/20 text-emerald-400 border-emerald-900/30 hover:bg-emerald-950/40'
                  : 'bg-rose-950/25 text-rose-400 border-rose-900/30 hover:bg-rose-950/40 animate-pulse'
              }`}
            >
              {(isOnline && !simulateOffline) ? (
                <>
                  <Wifi className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  <span className="hidden lg:inline font-sans">เชื่อมต่อออนไลน์</span>
                </>
              ) : (
                <>
                  <WifiOff className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                  <span className="hidden lg:inline font-sans">ออฟไลน์ (แคชโลคอล)</span>
                </>
              )}
            </button>

            {/* Offline Sync Indicator Badge */}
            {orders.some(o => !o.synced) && (
              <button
                onClick={handleSyncOfflineOrders}
                disabled={syncingOffline || (!isOnline || simulateOffline)}
                title={(!isOnline || simulateOffline) ? "ระบบตรวจพบเน็ตขาดอยู่ ไม่สามารถอัปโหลดได้" : "มีข้อมูลออฟไลน์ค้างซิงค์ คลิกเพื่อซิงค์ทันที"}
                className={`flex items-center gap-1 text-[10px] font-bold px-2 py-1.5 rounded-xl border transition-all cursor-pointer ${
                  (!isOnline || simulateOffline)
                    ? 'bg-slate-900 text-slate-500 border-slate-800 cursor-not-allowed opacity-50'
                    : 'bg-amber-600 hover:bg-amber-500 text-white border-amber-500 hover:scale-105 active:scale-95'
                }`}
              >
                <RefreshCw className={`w-3 h-3 ${syncingOffline ? 'animate-spin' : ''}`} />
                <span>ซิงค์ ({orders.filter(o => !o.synced).length})</span>
              </button>
            )}
          </div>
          
          {/* Active Branch Badge */}
          <div className="hidden md:flex items-center gap-1 text-[10px] bg-slate-950 px-2.5 py-1.5 rounded-xl border border-slate-850 text-slate-400 font-bold">
            <MapPin className="w-3.5 h-3.5 text-red-500" />
            <span>{activeBranch.name}</span>
          </div>

          {/* Running Clock */}
          <div className="hidden sm:flex items-center gap-1 text-[10px] font-mono font-bold bg-slate-950 px-2.5 py-1.5 rounded-xl border border-slate-850 text-slate-300">
            <Clock className="w-3.5 h-3.5 text-amber-500" />
            <span>{currentTime}</span>
          </div>

          {/* Logged user role pill */}
          <div className="flex items-center gap-2">
            <div className="text-right">
              <span className="block text-[11px] font-bold text-white leading-none">{currentUser.name}</span>
              <span className="text-[9px] text-slate-500 mt-0.5 block font-mono font-bold uppercase">{currentUser.role}</span>
            </div>
            
            <button
              onClick={handleLogout}
              title="ออกจากระบบ"
              className="p-2 bg-slate-950 hover:bg-red-950/20 text-slate-400 hover:text-red-400 rounded-xl border border-slate-850 hover:border-red-900/30 transition-all shrink-0"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>

        </div>
      </header>

      {/* BODY CONTENT WRAPPER */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* DESKTOP SIDEBAR / MOBILE DRAWER */}
        <aside className={`
          bg-slate-900 border-r border-slate-800 w-64 shrink-0 flex flex-col justify-between p-4 overflow-y-auto
          fixed inset-y-16 left-0 z-30 transform transition-transform duration-300 lg:static lg:transform-none
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        `}>
          <div className="space-y-4">
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest block px-2.5">คุมบริหารสาขา</span>
            
            <nav className="space-y-1">
              {visibleNavItems.map(item => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setActiveTab(item.id);
                      setSidebarOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 py-3 px-4 rounded-xl text-xs font-black transition-all text-left active:scale-98 ${
                      isActive 
                        ? 'bg-gradient-to-r from-red-600/15 to-amber-600/5 text-red-400 border-l-2 border-red-500 pl-2'
                        : 'text-slate-400 hover:text-white hover:bg-slate-850/40'
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${isActive ? 'text-red-500' : 'text-slate-400'}`} />
                    <span>{item.label}</span>
                    {item.id === 'INVENTORY' && ingredients.some(i => i.stock <= i.minStock) && (
                      <span className="ml-auto w-2.5 h-2.5 rounded-full bg-red-500 border border-slate-900 shadow-md ring-2 ring-red-500/30 animate-pulse shrink-0" />
                    )}
                  </button>
                );
              })}
            </nav>
          </div>

          <div className="pt-4 border-t border-slate-850 space-y-2 text-[10px] text-slate-500 font-medium">
            <div className="flex justify-between">
              <span>ฐานข้อมูลร่วม</span>
              <span className="text-green-500 font-bold font-mono">CONNECTED</span>
            </div>
            <div className="flex justify-between">
              <span>เวอร์ชันระบบ</span>
              <span className="font-mono">v1.2.4-enterprise</span>
            </div>
          </div>
        </aside>

        {/* Backdrop for mobile drawer */}
        {sidebarOpen && (
          <div 
            onClick={() => setSidebarOpen(false)}
            className="fixed inset-0 bg-black/65 z-20 lg:hidden"
          />
        )}

        {/* MAIN PANEL AREA */}
        <main className="flex-1 overflow-y-auto bg-slate-950 p-4 sm:p-6 lg:p-8">
          {renderContent()}
        </main>

      </div>

      {showOnboarding && (
        <OnboardingWizard
          settings={storeSettings}
          onUpdateSettings={setStoreSettings}
          menuItems={menuItems}
          onUpdateMenuItems={setMenuItems}
          onClose={() => setShowOnboarding(false)}
        />
      )}

      {/* Global Loading Spinner Overlay for Offline Sync */}
      {syncingOffline && (
        <div id="global-sync-overlay" className="fixed inset-0 z-[100] bg-slate-950/85 backdrop-blur-md flex flex-col items-center justify-center p-4">
          <div id="sync-overlay-container" className="bg-slate-900 border border-slate-800 rounded-3xl p-8 max-w-sm w-full text-center space-y-6 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-amber-500 via-red-500 to-amber-500 animate-pulse" />
            
            <div className="relative flex items-center justify-center mx-auto w-20 h-20">
              {/* Spinning outer loader */}
              <div className="absolute inset-0 rounded-full border-4 border-slate-800 border-t-red-500 border-r-amber-500 animate-spin" />
              {/* Pulsing inner icon background */}
              <div className="w-12 h-12 rounded-full bg-slate-950/80 flex items-center justify-center shadow-inner border border-slate-800/40">
                <RefreshCw className="w-5 h-5 text-amber-500 animate-pulse" />
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="text-base font-black text-white tracking-wide">กำลังซิงค์ออเดอร์ออฟไลน์...</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                ระบบกำลังเชื่อมโยงข้อมูลธุรกรรมสะสมและจัดส่งเข้าสู่ฐานข้อมูลคลาวด์ส่วนกลาง กรุณาอย่าปิดหน้าต่างนี้
              </p>
            </div>

            <div className="pt-2 border-t border-slate-850/60 flex items-center justify-center gap-2 text-[10px] text-slate-500 font-mono font-bold uppercase tracking-wider">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
              <span>Cloud Sync Active</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
