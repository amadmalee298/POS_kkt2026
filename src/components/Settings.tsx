import React, { useState, useRef } from 'react';
import { StoreSettings, Branch, User, UserRole, RolePermissions, AuditLog, BackupData } from '../types';
import { 
  Settings, Store, Percent, Printer, QrCode, 
  Users, Database, Plus, RefreshCw, Check, AlertCircle, X, ShieldAlert, Trash2,
  Download, Upload, FileJson, Sparkles, Copy, Code, FileText, Edit, Key, Lock,
  Wifi, Phone, History, Search, Sliders, Palette, Clock
} from 'lucide-react';

interface SettingsProps {
  settings: StoreSettings;
  branches: Branch[];
  users: User[];
  onUpdateSettings: (updated: StoreSettings) => void;
  onUpdateBranches: (updated: Branch[]) => void;
  onUpdateUsers: (updated: User[]) => void;
  activeBranchId: string;
  onSwitchBranch: (branchId: string) => void;
  rolePermissions: RolePermissions;
  onUpdatePermissions: (updated: RolePermissions) => void;
  currentUser: User;
  auditLogs?: AuditLog[];
  onAddAuditLog?: (
    actionType: 'RECIPE_UPDATE' | 'PERMISSION_CHANGE' | 'PRICE_MODIFICATION' | 'SYSTEM_UPDATE' | 'USER_MANAGEMENT',
    details: string
  ) => void;
  onGetBackupData: () => BackupData;
  onRestoreBackup: (backup: BackupData) => void;
  onOpenOnboarding?: () => void;
  onSystemCleanup?: (mode: 'TRANSACTIONS' | 'ALL') => void;
}

export default function SettingsComponent({ 
  settings, branches, users, onUpdateSettings, onUpdateBranches, onUpdateUsers, activeBranchId, onSwitchBranch,
  rolePermissions, onUpdatePermissions, currentUser, auditLogs, onAddAuditLog,
  onGetBackupData, onRestoreBackup, onOpenOnboarding, onSystemCleanup
}: SettingsProps) {
  // Local states
  const [storeName, setStoreName] = useState(settings.storeName);
  const [taxRate, setTaxRate] = useState(settings.taxRate);
  const [serviceCharge, setServiceCharge] = useState(settings.serviceCharge);
  const [receiptHeader, setReceiptHeader] = useState(settings.receiptHeader);
  const [receiptFooter, setReceiptFooter] = useState(settings.receiptFooter);
  const [promptpayId, setPromptpayId] = useState(settings.promptpayId);
  const [promptpayName, setPromptpayName] = useState(settings.promptpayName);
  const [vatType, setVatType] = useState<'INCLUSIVE' | 'EXCLUSIVE'>(settings.vatType || 'INCLUSIVE');
  const [storeTaxId, setStoreTaxId] = useState(settings.storeTaxId || '');
  const [storeAddress, setStoreAddress] = useState(settings.storeAddress || '');
  const [showReceiptPreview, setShowReceiptPreview] = useState(settings.showReceiptPreview ?? false);

  // Sheets Sync states
  const [sheetUrl, setSheetUrl] = useState(() => localStorage.getItem('kp_sheet_url') || 'https://docs.google.com/spreadsheets/d/1exampleSpreadsheetId_abcdef12345/edit');
  const [appsScriptUrl, setAppsScriptUrl] = useState(() => localStorage.getItem('kp_apps_script_url') || 'https://script.google.com/macros/s/AKfyby_example_AppsScript_Web_App_URL_abcdef/exec');
  const [syncing, setSyncing] = useState(false);
  const [syncSteps, setSyncSteps] = useState<string[]>([]);
  const [syncSuccess, setSyncSuccess] = useState(false);
  const [showScriptCode, setShowScriptCode] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  // Backup & Restore states
  const [backupStatus, setBackupStatus] = useState<'IDLE' | 'SUCCESS'>('IDLE');
  const [restoreError, setRestoreError] = useState<string | null>(null);
  const [parsedBackup, setParsedBackup] = useState<BackupData | null>(null);
  const [showConfirmRestore, setShowConfirmRestore] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // System Cleanup states
  const [cleanupMode, setCleanupMode] = useState<'NONE' | 'TRANSACTIONS' | 'ALL'>('NONE');
  const [cleanupConfirmText, setCleanupConfirmText] = useState<string>('');
  const [cleanupSuccess, setCleanupSuccess] = useState<boolean>(false);

  // Table QR sheet generator states
  const [tablesList, setTablesList] = useState<string[]>(() => {
    const saved = localStorage.getItem('qr_tables_list');
    return saved ? JSON.parse(saved) : ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '12', '14', '15'];
  });
  const [selectedTablesForQR, setSelectedTablesForQR] = useState<string[]>(() => {
    const saved = localStorage.getItem('qr_tables_list');
    return saved ? JSON.parse(saved) : ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '12', '14', '15'];
  });
  const [qrSheetTheme, setQrSheetTheme] = useState<'classic' | 'warm' | 'dark' | 'neon'>('classic');
  const [qrSheetSubtitle, setQrSheetSubtitle] = useState('สแกนสั่งอาหารง่ายๆ รวดเร็วทันใจ');
  const [qrSheetShowInstructions, setQrSheetShowInstructions] = useState(true);
  const [qrSheetShowWifi, setQrSheetShowWifi] = useState(false);
  const [qrSheetWifiName, setQrSheetWifiName] = useState('@KapraoCrunchy');
  const [qrSheetWifiPass, setQrSheetWifiPass] = useState('12345678');
  const [qrSheetShowPhone, setQrSheetShowPhone] = useState(true);
  const [qrSheetPhone, setQrSheetPhone] = useState(() => {
    return branches && branches.length > 0 ? branches[0].phone : '02-123-4567';
  });
  const [qrSheetCardSize, setQrSheetCardSize] = useState<'small' | 'medium' | 'large'>('medium');
  const [showQRPrintPreviewModal, setShowQRPrintPreviewModal] = useState(false);

  // New QR branding and custom styling states
  const [qrLogoStyle, setQrLogoStyle] = useState<'none' | 'icon' | 'bowl' | 'default' | 'custom'>('icon');
  const [qrCustomLogoUrl, setQrCustomLogoUrl] = useState<string>('');
  const [qrFrameCustomColor, setQrFrameCustomColor] = useState<string>('#DC2626'); // default red-600 custom hex
  const [qrFrameUseCustomColor, setQrFrameUseCustomColor] = useState<boolean>(false);
  const [qrFrameThickness, setQrFrameThickness] = useState<'thin' | 'medium' | 'thick'>('medium');
  const [qrFrameBgColor, setQrFrameBgColor] = useState<string>('#FFFFFF'); // QR Frame background color
  const [qrFrameUseCustomBgColor, setQrFrameUseCustomBgColor] = useState<boolean>(false);

interface QRHistoryRecord {
  id: string;
  timestamp: string;
  tablesCount: number;
  tablesList: string[];
  action: 'download' | 'print';
}

  // QR Download & Print History states
  const [qrHistory, setQrHistory] = useState<QRHistoryRecord[]>(() => {
    const saved = localStorage.getItem('qr_download_history');
    return saved ? JSON.parse(saved) : [];
  });
  const [qrHistorySearch, setQrHistorySearch] = useState<string>('');

  const recordQRActivity = (tables: string[], action: 'download' | 'print') => {
    const now = new Date();
    const timestamp = now.toLocaleString('th-TH', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
    
    const details = `ธีม: ${
      qrSheetTheme === 'classic' ? 'คลาสสิก' :
      qrSheetTheme === 'warm' ? 'อบอุ่น' :
      qrSheetTheme === 'dark' ? 'มินิมอล' : 'เนออน'
    }, ขนาด: ${
      qrSheetCardSize === 'large' ? 'ใหญ่ (1/A4)' :
      qrSheetCardSize === 'medium' ? 'กลาง (4/A4)' : 'เล็ก (6/A4)'
    }${qrFrameUseCustomColor ? `, สีเฟรม: ${qrFrameCustomColor}` : ''}`;

    const newItems = tables.map(table => ({
      id: `${Date.now()}-${table}-${Math.random().toString(36).substr(2, 4)}`,
      tableNo: table,
      action,
      timestamp,
      details,
    }));

    setQrHistory(prev => {
      const updated = [...newItems, ...prev].slice(0, 100); // keep last 100 items
      localStorage.setItem('qr_download_history', JSON.stringify(updated));
      return updated;
    });
  };

  const renderQrLogo = (size: 'sm' | 'md' | 'lg' = 'md') => {
    if (qrLogoStyle === 'none') return null;
    
    const sizeClasses = {
      sm: 'w-8 h-8 text-[10px]',
      md: 'w-11 h-11 text-sm',
      lg: 'w-16 h-16 text-xl'
    };

    const imgSizes = {
      sm: 'w-8 h-8',
      md: 'w-11 h-11',
      lg: 'w-16 h-16'
    };

    if (qrLogoStyle === 'custom') {
      return (
        <div className={`flex items-center justify-center bg-white border border-slate-200 p-0.5 rounded-xl shadow-xs overflow-hidden ${imgSizes[size]}`}>
          <img
            src={qrCustomLogoUrl || 'https://api.iconify.design/lucide:store.svg'}
            alt="Custom Logo"
            className="w-full h-full object-contain"
            referrerPolicy="no-referrer"
            onError={(e) => {
              e.currentTarget.src = 'https://api.iconify.design/lucide:store.svg';
            }}
          />
        </div>
      );
    }

    // preset icons
    let emoji = '🌶️';
    let bgCol = 'bg-red-50 text-red-600 border-red-100';
    if (qrLogoStyle === 'bowl') {
      emoji = '🍲';
      bgCol = 'bg-amber-50 text-amber-700 border-amber-100';
    } else if (qrLogoStyle === 'default') {
      emoji = '✨';
      bgCol = 'bg-yellow-50 text-yellow-600 border-yellow-100';
    } else if (qrLogoStyle === 'icon') {
      emoji = '🏪';
      bgCol = 'bg-slate-50 text-slate-700 border-slate-100';
    }

    return (
      <div className={`rounded-full flex items-center justify-center border font-bold shadow-xs select-none ${bgCol} ${sizeClasses[size]}`}>
        {emoji}
      </div>
    );
  };

  const getThemeStyles = () => {
    switch (qrSheetTheme) {
      case 'warm':
        return {
          cardBg: 'bg-amber-50/20 text-amber-950 border-amber-200',
          bannerBg: 'bg-gradient-to-r from-amber-800 to-amber-700 text-amber-50',
          textPrimary: 'text-amber-950',
          textSecondary: 'text-amber-800/70',
          tagBg: 'bg-amber-100 text-amber-800 border-amber-300',
          borderColor: 'border-amber-200',
          accentColor: 'text-amber-700',
          cardBorderDashed: 'border-dashed border-amber-300/80',
          bulletColor: 'bg-amber-800 text-white'
        };
      case 'dark':
        // Ink-saving minimalist black/white style
        return {
          cardBg: 'bg-white text-slate-900 border-slate-300',
          bannerBg: 'bg-slate-950 text-white',
          textPrimary: 'text-slate-950',
          textSecondary: 'text-slate-500',
          tagBg: 'bg-slate-100 text-slate-800 border-slate-300',
          borderColor: 'border-slate-200',
          accentColor: 'text-slate-950',
          cardBorderDashed: 'border-dashed border-slate-300',
          bulletColor: 'bg-slate-900 text-white'
        };
      case 'neon':
        return {
          cardBg: 'bg-white text-slate-900 border-slate-200',
          bannerBg: 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white',
          textPrimary: 'text-slate-900',
          textSecondary: 'text-slate-500',
          tagBg: 'bg-indigo-50 text-indigo-700 border-indigo-200',
          borderColor: 'border-slate-100',
          accentColor: 'text-indigo-600',
          cardBorderDashed: 'border-dashed border-indigo-200',
          bulletColor: 'bg-indigo-600 text-white'
        };
      case 'classic':
      default:
        return {
          cardBg: 'bg-white text-slate-900 border-slate-200',
          bannerBg: 'bg-gradient-to-r from-red-600 to-slate-900 text-white',
          textPrimary: 'text-slate-900',
          textSecondary: 'text-slate-500',
          tagBg: 'bg-red-50 text-red-700 border-red-200',
          borderColor: 'border-slate-100',
          accentColor: 'text-red-600',
          cardBorderDashed: 'border-dashed border-slate-200',
          bulletColor: 'bg-red-600 text-white'
        };
    }
  };

  // Trigger JSON download
  const handleDownloadBackup = () => {
    try {
      const data = onGetBackupData();
      const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
        JSON.stringify(data, null, 2)
      )}`;
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute('href', jsonString);
      
      const now = new Date();
      const timestampString = now.toISOString().replace(/[:.]/g, '-').slice(0, 19);
      const filename = `kp_backup_${timestampString}.json`;
      downloadAnchor.setAttribute('download', filename);
      
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      document.body.removeChild(downloadAnchor);

      setBackupStatus('SUCCESS');
      if (onAddAuditLog) {
        onAddAuditLog(
          'SYSTEM_UPDATE',
          `สำรองข้อมูลระเบียนระบบสำเร็จและดาวน์โหลดแล้ว (ไฟล์: ${filename})`
        );
      }
      setTimeout(() => setBackupStatus('IDLE'), 4000);
    } catch (err) {
      console.error(err);
      alert('เกิดข้อผิดพลาดในการสร้างไฟล์สำรองข้อมูล');
    }
  };

  // Handle uploaded JSON backup file
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    setRestoreError(null);
    setParsedBackup(null);
    setShowConfirmRestore(false);

    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const result = event.target?.result as string;
        const parsed = JSON.parse(result) as BackupData;

        // Validation checks
        if (!parsed.backupTimestamp || !parsed.version) {
          setRestoreError('ไฟล์ที่เลือกไม่มีข้อมูลโครงสร้างสำรองระเบียนระบบที่ถูกต้อง (ไม่พบ Timestamp หรือ Version)');
          return;
        }

        setParsedBackup(parsed);
        setShowConfirmRestore(true);
      } catch (err) {
        setRestoreError('ไม่สามารถอ่านไฟล์ได้ กรุณาตรวจสอบว่าไฟล์มีรูปแบบ JSON ที่ถูกต้อง');
      }
    };
    reader.readAsText(file);
  };

  const handleConfirmRestore = () => {
    if (!parsedBackup) return;
    try {
      onRestoreBackup(parsedBackup);
      alert('กู้คืนระเบียนระบบสำเร็จ! ข้อมูลทั้งหมดได้รับการเขียนทับเรียบร้อยแล้ว');
      
      // Reset state
      setParsedBackup(null);
      setShowConfirmRestore(false);
      setRestoreError(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (err) {
      setRestoreError('เกิดข้อผิดพลาดในการกู้คืนระบบ');
    }
  };

  const handleCancelRestore = () => {
    setParsedBackup(null);
    setShowConfirmRestore(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Handle system cleanup execution
  const handlePerformCleanup = () => {
    if (cleanupConfirmText !== 'ล้างข้อมูล') {
      alert('กรุณาพิมพ์คำว่า "ล้างข้อมูล" ให้ถูกต้องเพื่อยืนยัน');
      return;
    }

    if (onSystemCleanup) {
      onSystemCleanup(cleanupMode);
      setCleanupSuccess(true);
      if (onAddAuditLog) {
        onAddAuditLog(
          'SYSTEM_UPDATE',
          cleanupMode === 'TRANSACTIONS' 
            ? 'ล้างข้อมูลธุรกรรมระบบทั้งหมดสำเร็จเพื่อเตรียมเปิดใช้จริง (Clear Transactions Only)'
            : 'ทำความสะอาดล้างระบบทั้งหมดสำเร็จเป็นค่าเริ่มต้นใหม่ (Factory Reset)'
        );
      }
      setTimeout(() => {
        setCleanupSuccess(false);
        setCleanupMode('NONE');
        setCleanupConfirmText('');
      }, 3000);
    }
  };

  // Branch states
  const [newBranchName, setNewBranchName] = useState('');
  const [newBranchLoc, setNewBranchLoc] = useState('');
  const [newBranchPhone, setNewBranchPhone] = useState('');

  // User States
  const [showAddUser, setShowAddUser] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [newRealName, setNewRealName] = useState('');
  const [newUserRole, setNewUserRole] = useState<UserRole>('Staff');
  const [newPassword, setNewPassword] = useState('1234');
  const [newPin, setNewPin] = useState('0000');

  // Edit User States
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editUsername, setEditUsername] = useState('');
  const [editRealName, setEditRealName] = useState('');
  const [editUserRole, setEditUserRole] = useState<UserRole>('Staff');
  const [editPassword, setEditPassword] = useState('');
  const [editPin, setEditPin] = useState('');

  // Handle save configurations
  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    const updated: StoreSettings = {
      storeName,
      taxRate,
      serviceCharge,
      currency: '฿',
      receiptHeader,
      receiptFooter,
      promptpayId,
      promptpayName,
      vatType,
      storeTaxId,
      storeAddress,
      autoBackupFrequency: 'OFF',
      showReceiptPreview
    };
    onUpdateSettings(updated);
    alert('บันทึกปรับแต่งร้านค้าและระบบสแกน PromptPay สำเร็จ!');
  };

  // Add new branch (Multi-branch)
  const handleAddBranch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBranchName) return;

    const newBr: Branch = {
      id: `b${branches.length + 1}`,
      name: newBranchName,
      location: newBranchLoc,
      phone: newBranchPhone
    };

    onUpdateBranches([...branches, newBr]);
    setNewBranchName('');
    setNewBranchLoc('');
    setNewBranchPhone('');
    alert(`เพิ่มข้อมูลสาขาใหม่สำเร็จ! สามารถเปลี่ยนสลับดำเนินการสาขาได้ทันที`);
  };

  // Delete a branch with safety checks
  const handleDeleteBranch = (id: string, name: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Avoid switching branch upon click
    if (branches.length <= 1) {
      alert('ไม่สามารถลบสาขาได้! ร้านค้าต้องมีอย่างน้อย 1 สาขาหลัก');
      return;
    }
    if (confirm(`คุณแน่ใจหรือไม่ที่จะลบสาขา "${name}"? ข้อมูลสาขานี้จะถูกลบอย่างถาวร`)) {
      const updatedBranches = branches.filter(br => br.id !== id);
      onUpdateBranches(updatedBranches);
      if (activeBranchId === id) {
        // Automatically switch active branch to the first available branch
        onSwitchBranch(updatedBranches[0].id);
        alert(`ลบสาขา "${name}" สำเร็จ! ระบบได้สลับไปดำเนินการที่สาขา "${updatedBranches[0].name}" แทน`);
      } else {
        alert(`ลบสาขา "${name}" สำเร็จ!`);
      }
    }
  };

  // Add new user account
  const handleAddUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (currentUser.role !== 'Admin' && currentUser.role !== 'Manager') {
      alert('เฉพาะผู้จัดการ (Manager) และแอดมิน (Admin) เท่านั้นที่สามารถเพิ่มผู้ใช้งานได้');
      return;
    }
    if (!newUsername || !newRealName) return;

    // Check if username already exists
    if (users.some(u => u.username === newUsername.toLowerCase())) {
      alert('ชื่อบัญชีเข้าสู่ระบบนี้มีผู้ใช้งานแล้ว กรุณาเลือกชื่ออื่น');
      return;
    }

    const newUser: User = {
      id: String(Date.now()), // Use robust unique timestamp ID
      name: newRealName,
      role: newUserRole,
      username: newUsername.toLowerCase(),
      pin: newPin || '0000',
      password: newPassword || '1234'
    };

    onUpdateUsers([...users, newUser]);
    setNewUsername('');
    setNewRealName('');
    setNewPassword('1234');
    setNewPin('0000');
    setShowAddUser(false);
    
    if (onAddAuditLog) {
      onAddAuditLog('USER_MANAGEMENT', `เพิ่มผู้ใช้งานใหม่: ${newRealName} (User: ${newUsername.toLowerCase()}, สิทธิ์: ${newUserRole})`);
    }
    alert(`เปิดสิทธิ์สมาชิกและผู้ใช้งานบัญชี "${newRealName}" สำเร็จ!`);
  };

  // Open Edit User dialog
  const handleStartEditUser = (user: User) => {
    if (currentUser.role !== 'Admin' && currentUser.role !== 'Manager') {
      alert('เฉพาะผู้จัดการ (Manager) และแอดมิน (Admin) เท่านั้นที่สามารถแก้ไขข้อมูลผู้ใช้งานได้');
      return;
    }
    setEditingUser(user);
    setEditUsername(user.username);
    setEditRealName(user.name);
    setEditUserRole(user.role);
    setEditPassword(user.password || (user.role === 'Admin' ? 'admin' : '1234'));
    setEditPin(user.pin || '0000');
  };

  // Save modified user details
  const handleSaveEditUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (currentUser.role !== 'Admin' && currentUser.role !== 'Manager') {
      alert('เฉพาะผู้จัดการ (Manager) และแอดมิน (Admin) เท่านั้นที่สามารถแก้ไขข้อมูลผู้ใช้งานได้');
      return;
    }
    if (!editingUser || !editUsername || !editRealName) return;

    // Check if username already exists for another user
    if (users.some(u => u.username === editUsername.toLowerCase() && u.id !== editingUser.id)) {
      alert('ชื่อบัญชีเข้าสู่ระบบนี้มีผู้ใช้งานอื่นใช้อยู่แล้ว กรุณาเลือกชื่ออื่น');
      return;
    }

    const updatedUsers = users.map(u => {
      if (u.id === editingUser.id) {
        return {
          ...u,
          name: editRealName,
          username: editUsername.toLowerCase(),
          role: editUserRole,
          password: editPassword,
          pin: editPin
        };
      }
      return u;
    });

    onUpdateUsers(updatedUsers);
    
    if (onAddAuditLog) {
      const oldPassword = editingUser.password || (editingUser.role === 'Admin' ? 'admin' : '1234');
      const oldPin = editingUser.pin || '0000';
      const isPasswordChanged = editPassword !== oldPassword;
      const isPinChanged = editPin !== oldPin;
      const isNameChanged = editRealName !== editingUser.name;
      const isUsernameChanged = editUsername.toLowerCase() !== editingUser.username;
      const isRoleChanged = editUserRole !== editingUser.role;

      let auditDetails = `ผู้แก้ไข: ${currentUser.name} (${currentUser.role}) ได้แก้ไขข้อมูลบัญชีผู้ใช้งานของ: ${editingUser.name}`;
      const changesList = [];
      if (isNameChanged) changesList.push(`เปลี่ยนชื่อจริงเดิม [${editingUser.name}] เป็น [${editRealName}]`);
      if (isUsernameChanged) changesList.push(`เปลี่ยนชื่อบัญชีเข้าสู่ระบบเดิม [${editingUser.username}] เป็น [${editUsername.toLowerCase()}]`);
      if (isRoleChanged) changesList.push(`เปลี่ยนสิทธิ์จาก ${editingUser.role} เป็น ${editUserRole}`);
      if (isPasswordChanged) changesList.push(`เปลี่ยนรหัสผ่านเข้าสู่ระบบใหม่`);
      if (isPinChanged) changesList.push(`เปลี่ยนรหัส PIN 4 หลักใหม่`);

      if (changesList.length > 0) {
        auditDetails += ` (รายละเอียดที่ถูกเปลี่ยน: ${changesList.join(', ')})`;
      } else {
        auditDetails += ` (ไม่มีการแก้ไขข้อมูล)`;
      }

      onAddAuditLog('USER_MANAGEMENT', auditDetails);
    }

    alert(`แก้ไขรายละเอียดบัญชีผู้ใช้ "${editRealName}" เรียบร้อยแล้ว!`);
    setEditingUser(null);
  };

  // Delete user account with safety checks
  const handleDeleteUser = (id: string, name: string) => {
    if (currentUser.role !== 'Admin' && currentUser.role !== 'Manager') {
      alert('เฉพาะผู้จัดการ (Manager) และแอดมิน (Admin) เท่านั้นที่สามารถลบผู้ใช้งานได้');
      return;
    }
    if (currentUser && id === currentUser.id) {
      alert('ไม่สามารถลบบัญชีตัวเองที่คุณกำลังใช้เข้าสู่ระบบอยู่ในขณะนี้ได้!');
      return;
    }
    if (users.length <= 1) {
      alert('ไม่สามารถลบผู้ใช้งานได้! ระบบต้องมีผู้ใช้งานอย่างน้อย 1 คน');
      return;
    }
    if (confirm(`คุณแน่ใจหรือไม่ที่จะลบสิทธิ์และข้อมูลผู้ใช้งาน "${name}" ออกจากระบบอย่างถาวร?`)) {
      onUpdateUsers(users.filter(u => u.id !== id));
      alert(`ลบข้อมูลผู้ใช้งาน "${name}" สำเร็จ!`);
    }
  };

  // Google Sheets integration sequence (Real Sync)
  const handleStartSheetsSync = async () => {
    setSyncing(true);
    setSyncSuccess(false);
    setSyncSteps([]);

    // Save settings to localStorage
    localStorage.setItem('kp_sheet_url', sheetUrl);
    localStorage.setItem('kp_apps_script_url', appsScriptUrl);

    // 1. Initial Packing
    setSyncSteps(prev => [...prev, '📦 กำลังเตรียมแพ็คข้อมูลระเบียนระบบทั้งหมด...']);
    const backupData = onGetBackupData();

    // 2. Validate spreadsheet URL & extract Spreadsheet ID
    setSyncSteps(prev => [...prev, '🔍 กำลังวิเคราะห์ข้อมูลตำแหน่ง Google Spreadsheet...']);
    const sheetIdMatch = sheetUrl.match(/\/d\/([a-zA-Z0-9-_]+)/);
    const spreadsheetId = sheetIdMatch ? sheetIdMatch[1] : '';

    if (!spreadsheetId && sheetUrl.includes('example')) {
      // If it's the example, let's allow running a simulation fallback
      setSyncSteps(prev => [...prev, 'ℹ️ ตรวจพบ URL ตัวอย่าง: เข้าสู่โหมดทดสอบจำลอง (Sandbox Sync)...']);
      
      const steps = [
        'เชื่อมต่อ Google Spreadsheet สำเร็จ (Spreadsheet ID: 1exampleSpread...)',
        'กำลังส่งออกตารางวัตถุดิบค้างคลัง (Dumping Inventory: i1 - i12)...',
        'กำลังส่งออกตารางการปิดบิลสั่งอาหาร (Dumping Orders)...',
        'กำลังส่งออกตารางสูตรอาหาร (Dumping Recipe & Ingredients)...',
        'กำลังส่งออกตารางบันทึกความเคลื่อนไหว (Dumping Stock Cards)...',
        'ทำการเขียนทับและบันทึกเซลล์ข้อมูลบน Google Sheets (จำลอง) เสร็จเรียบร้อย! 🎉'
      ];

      for (let i = 0; i < steps.length; i++) {
        await new Promise(resolve => setTimeout(resolve, 600));
        setSyncSteps(prev => [...prev, steps[i]]);
      }
      setSyncing(false);
      setSyncSuccess(true);
      if (onAddAuditLog) {
        onAddAuditLog('SYSTEM_UPDATE', 'ซิงค์ข้อมูลกับ Google Sheets สำเร็จ (โหมดจำลอง)');
      }
      return;
    }

    if (!spreadsheetId) {
      setSyncSteps(prev => [...prev, '❌ ข้อผิดพลาด: ไม่สามารถค้นหา Spreadsheet ID จาก URL ที่ระบุได้ กรุณาตรวจสอบรูปแบบ URL (เช่น https://docs.google.com/spreadsheets/d/SPREADSHEET_ID/edit)']);
      setSyncing(false);
      return;
    }

    if (!appsScriptUrl || appsScriptUrl.includes('example_AppsScript_Web_App')) {
      setSyncSteps(prev => [...prev, '❌ ข้อผิดพลาด: กรุณากรอก Apps Script Web App API Endpoint URL ให้ถูกต้องก่อนเริ่มซิงค์']);
      setSyncing(false);
      return;
    }

    // 3. Connect to Web App
    setSyncSteps(prev => [...prev, `📡 กำลังยิงสัญญาณติดต่อ Google Apps Script Web App...`]);
    
    try {
      // Send post request using plain text to bypass CORS preflight
      const response = await fetch(appsScriptUrl, {
        method: 'POST',
        mode: 'cors',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8'
        },
        body: JSON.stringify({
          action: 'sync',
          spreadsheetId: spreadsheetId,
          data: backupData
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP Error Code: ${response.status}`);
      }

      const resultText = await response.text();
      let result;
      try {
        result = JSON.parse(resultText);
      } catch (e) {
        result = { success: true, message: resultText };
      }

      if (result && (result.success || result.status === 'success' || resultText.includes('success') || resultText.includes('OK'))) {
        setSyncSteps(prev => [...prev, `✅ เซิร์ฟเวอร์ตอบรับและยืนยันความถูกต้องสำเร็จ!`]);
        setSyncSteps(prev => [...prev, `📊 กำลังจัดพิมพ์ชุดตารางวัตถุดิบ, เมนูอาหาร, ออเดอร์, บัญชีการเงิน และสต๊อกเข้า Google Sheets...`]);
        await new Promise(resolve => setTimeout(resolve, 500));
        setSyncSteps(prev => [...prev, `🎉 ดำเนินการซิงค์ข้อมูลทุกตารางลง Google Sheets จริงเรียบร้อยแล้ว!`]);
        setSyncSuccess(true);
        if (onAddAuditLog) {
          onAddAuditLog('SYSTEM_UPDATE', `ส่งออกและซิงค์ข้อมูลสำเร็จเข้าสู่ Google Sheets ID: ${spreadsheetId}`);
        }
      } else {
        throw new Error(result?.message || resultText || 'การบันทึกข้อมูลมีปัญหา ข้อมูลที่รับได้ไม่ครบถ้วน');
      }
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      console.error(err);
      setSyncSteps(prev => [
        ...prev, 
        `❌ ไม่สามารถเชื่อมต่อระบบซิงค์ภายนอกได้: ${errMsg}`,
        `💡 คำแนะนำ: หากติดปัญหาเรื่อง CORS กรุณาตรวจสอบการตั้งค่า "Deploy as Web App" ใน Google Apps Script โดยตั้งค่าให้ Who has access: "Anyone" (ทุกคนที่มีลิงก์)`
      ]);
    } finally {
      setSyncing(false);
    }
  };

  const GOOGLE_APPS_SCRIPT_CODE = `function doPost(e) {
  try {
    var requestData = JSON.parse(e.postData.contents);
    var action = requestData.action;
    var spreadsheetId = requestData.spreadsheetId;
    var data = requestData.data;
    
    if (!spreadsheetId) {
      return ContentService.createTextOutput(JSON.stringify({
        success: false,
        message: "Spreadsheet ID is required"
      })).setMimeType(ContentService.MimeType.JSON);
    }
    
    var ss = SpreadsheetApp.openById(spreadsheetId);
    
    if (action === 'sync' && data) {
      // Loop through all tables in data
      for (var tableName in data) {
        if (data.hasOwnProperty(tableName) && Array.isArray(data[tableName])) {
          var rows = data[tableName];
          if (rows.length === 0) continue;
          
          var sheet = ss.getSheetByName(tableName);
          if (!sheet) {
            sheet = ss.insertSheet(tableName);
          } else {
            sheet.clear();
          }
          
          // Generate headers
          var headers = Object.keys(rows[0]);
          sheet.appendRow(headers);
          
          // Format headers
          var headerRange = sheet.getRange(1, 1, 1, headers.length);
          headerRange.setBackground("#0f172a");
          headerRange.setFontColor("#ffffff");
          headerRange.setFontWeight("bold");
          
          // Write rows
          var values = rows.map(function(item) {
            return headers.map(function(key) {
              var val = item[key];
              if (typeof val === 'object' && val !== null) {
                return JSON.stringify(val);
              }
              return val !== undefined ? val : "";
            });
          });
          
          if (values.length > 0) {
            sheet.getRange(2, 1, values.length, headers.length).setValues(values);
          }
          sheet.autoResizeColumns(1, headers.length);
        }
      }
      
      return ContentService.createTextOutput(JSON.stringify({
        success: true,
        message: "Database synced successfully to Google Sheets!"
      })).setMimeType(ContentService.MimeType.JSON);
    }
    
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      message: "Unknown action"
    })).setMimeType(ContentService.MimeType.JSON);
    
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      message: "Error: " + err.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}`;

  const handleCopyScriptCode = () => {
    navigator.clipboard.writeText(GOOGLE_APPS_SCRIPT_CODE);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-white tracking-tight">การตั้งค่าระบบ (System Configuration)</h2>
            <p className="text-xs text-slate-400">ควบคุมรายละเอียดการขายหน้าร้าน พิมพ์ใบเสร็จ สลับสาขา บันทึกผู้ใช้ และการอัปโหลดข้อมูลเข้า Sheets</p>
          </div>
          {onOpenOnboarding && (
            <button
              onClick={onOpenOnboarding}
              className="flex items-center gap-1.5 px-4 py-2.5 bg-gradient-to-r from-cyan-600 to-sky-600 hover:from-cyan-500 hover:to-sky-500 text-white text-xs font-black rounded-xl shadow-lg transition-all cursor-pointer shrink-0 hover:scale-[1.02] active:scale-[0.98]"
            >
              <Sparkles className="w-3.5 h-3.5" /> ตัวช่วยตั้งค่าด่วน 4 ขั้นตอน
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* LEFT COLUMN: GENERAL SETTINGS (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Form Store Configuration */}
          <form onSubmit={handleSaveSettings} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-850 pb-3">
              <Store className="w-5 h-5 text-red-500" />
              <h3 className="font-bold text-white text-sm">ข้อมูลร้านค้าและใบเสร็จรับเงิน</h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
              <div className="space-y-1 sm:col-span-4">
                <span className="text-slate-400 block font-medium">ชื่อกิจการร้านค้าหลัก</span>
                <input
                  type="text"
                  required
                  value={storeName}
                  onChange={(e) => setStoreName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-850 text-white rounded-xl px-3 py-2 text-xs font-bold"
                />
              </div>

              <div className="space-y-1 sm:col-span-2">
                <span className="text-slate-400 block font-medium">เลขประจำตัวผู้เสียภาษีอากรของร้าน (Store Tax ID)</span>
                <input
                  type="text"
                  value={storeTaxId}
                  onChange={(e) => setStoreTaxId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-850 text-white rounded-xl px-3 py-2 text-xs font-mono font-bold"
                  placeholder="เช่น 0105560123456"
                />
              </div>

              <div className="space-y-1 sm:col-span-2">
                <span className="text-slate-400 block font-medium">ที่อยู่ร้านค้าตามทะเบียนภาษี (Store Official Address)</span>
                <input
                  type="text"
                  value={storeAddress}
                  onChange={(e) => setStoreAddress(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-850 text-white rounded-xl px-3 py-2 text-xs font-medium"
                  placeholder="เช่น 123/45 ถ.บรรทัดทอง แขวงวังใหม่ เขตปทุมวัน กรุงเทพฯ 10330"
                />
              </div>

              <div className="space-y-1">
                <span className="text-slate-400 block font-medium">ภาษีมูลค่าเพิ่ม VAT (%)</span>
                <input
                  type="number"
                  required
                  value={taxRate}
                  onChange={(e) => setTaxRate(parseInt(e.target.value) || 0)}
                  className="w-full bg-slate-950 border border-slate-850 text-white rounded-xl px-3 py-2 text-xs font-mono font-bold"
                />
              </div>

              <div className="space-y-1">
                <span className="text-slate-400 block font-medium">รูปแบบภาษี VAT</span>
                <select
                  value={vatType}
                  onChange={(e) => setVatType(e.target.value as 'INCLUSIVE' | 'EXCLUSIVE')}
                  className="w-full bg-slate-950 border border-slate-850 text-white rounded-xl px-3 py-2 text-xs font-bold focus:outline-none"
                >
                  <option value="INCLUSIVE">รวมในราคา (Inclusive)</option>
                  <option value="EXCLUSIVE">แยกราคานอก (Exclusive)</option>
                </select>
              </div>

              <div className="space-y-1">
                <span className="text-slate-400 block font-medium">ค่าบริการ Service Charge (%)</span>
                <input
                  type="number"
                  required
                  value={serviceCharge}
                  onChange={(e) => setServiceCharge(parseInt(e.target.value) || 0)}
                  className="w-full bg-slate-950 border border-slate-850 text-white rounded-xl px-3 py-2 text-xs font-mono font-bold"
                />
              </div>

              <div className="space-y-1">
                <span className="text-slate-400 block font-medium">สัญลักษณ์สกุลเงิน</span>
                <input
                  type="text"
                  disabled
                  value="฿ (THB)"
                  className="w-full bg-slate-950/40 border border-slate-850 text-slate-500 rounded-xl px-3 py-2 text-xs font-bold cursor-not-allowed"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="space-y-1">
                <span className="text-slate-400 block font-medium">ข้อความหัวบิลพิมพ์ใบเสร็จ (Header)</span>
                <textarea
                  rows={3}
                  value={receiptHeader}
                  onChange={(e) => setReceiptHeader(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-850 text-white rounded-xl px-3 py-2 text-[11px] font-mono leading-relaxed"
                />
              </div>
              <div className="space-y-1">
                <span className="text-slate-400 block font-medium">ข้อความท้ายบิลพิมพ์ใบเสร็จ (Footer)</span>
                <textarea
                  rows={3}
                  value={receiptFooter}
                  onChange={(e) => setReceiptFooter(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-850 text-white rounded-xl px-3 py-2 text-[11px] font-mono leading-relaxed"
                />
              </div>
            </div>

            {/* Receipt Preview Popup Toggle */}
            <div className="pt-3 pb-1 border-t border-slate-850">
              <label className="flex items-center justify-between p-3 bg-slate-950 rounded-xl border border-slate-850 cursor-pointer hover:border-slate-700 transition-colors">
                <div className="space-y-0.5">
                  <span className="text-xs font-bold text-white block">
                    แสดงหน้าต่างตัวอย่างใบเสร็จอัตโนมัติหลังรับชำระเงิน
                  </span>
                  <span className="text-[10.5px] text-slate-400 block">
                    หากปิดไว้ ระบบจะแจ้งเตือนสำเร็จแบบลอย ไม่บังหน้าจอ เพื่อให้แคชเชียร์รับออเดอร์ต่อไปได้ทันที
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={showReceiptPreview}
                  onChange={(e) => setShowReceiptPreview(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-700 text-red-600 focus:ring-0 cursor-pointer ml-3"
                />
              </label>
            </div>

            {/* PromptPay setup */}
            <div className="pt-4 border-t border-slate-850 space-y-3">
              <div className="flex items-center gap-1.5 text-xs text-white font-bold">
                <QrCode className="w-4 h-4 text-sky-400" />
                <span>ข้อมูลผู้รับโอนเงินสแกน QR PromptPay</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="space-y-1">
                  <span className="text-slate-400 block">เบอร์พร้อมเพย์ (Mobile / Tax ID)</span>
                  <input
                    type="text"
                    required
                    value={promptpayId}
                    onChange={(e) => setPromptpayId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-850 text-white rounded-xl px-3 py-2 text-xs font-mono font-bold"
                  />
                </div>
                <div className="space-y-1">
                  <span className="text-slate-400 block">ชื่อบัญชีผู้โอน (ภาษาอังกฤษ/ไทย)</span>
                  <input
                    type="text"
                    required
                    value={promptpayName}
                    onChange={(e) => setPromptpayName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-850 text-white rounded-xl px-3 py-2 text-xs font-bold"
                  />
                </div>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                className="px-5 py-2.5 bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-500 hover:to-amber-500 text-white font-bold rounded-xl text-xs shadow transition-all"
              >
                บันทึกการตั้งค่าหลัก
              </button>
            </div>
          </form>

          {/* GOOGLE SHEETS BACKUP PANEL */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-850 pb-3">
              <Database className="w-5 h-5 text-green-500" />
              <div>
                <h3 className="font-bold text-white text-sm">ซิงค์ฐานข้อมูลเข้า Google Sheets (Sync Setup)</h3>
                <p className="text-[10px] text-slate-500">ทำงานเป็นฐานข้อมูลอิงระบบจัดเก็บร่วมกัน</p>
              </div>
            </div>

            <div className="space-y-3.5 text-xs">
              <div className="space-y-1">
                <span className="text-slate-400 block font-medium">Google Spreadsheet URL</span>
                <input
                  type="text"
                  value={sheetUrl}
                  onChange={(e) => {
                    setSheetUrl(e.target.value);
                    localStorage.setItem('kp_sheet_url', e.target.value);
                  }}
                  className="w-full bg-slate-950 border border-slate-850 text-white rounded-xl px-3 py-2 text-xs font-mono"
                  placeholder="https://docs.google.com/spreadsheets/d/your-spreadsheet-id/edit"
                />
              </div>

              <div className="space-y-1">
                <span className="text-slate-400 block font-medium">Google Apps Script Web App API Endpoint URL</span>
                <input
                  type="text"
                  value={appsScriptUrl}
                  onChange={(e) => {
                    setAppsScriptUrl(e.target.value);
                    localStorage.setItem('kp_apps_script_url', e.target.value);
                  }}
                  className="w-full bg-slate-950 border border-slate-850 text-white rounded-xl px-3 py-2 text-xs font-mono"
                  placeholder="https://script.google.com/macros/s/your-deployment-id/exec"
                />
              </div>

              {/* Setup Code Accordion */}
              <div className="pt-1 border-t border-slate-850/60">
                <button
                  type="button"
                  onClick={() => setShowScriptCode(!showScriptCode)}
                  className="flex items-center gap-1.5 text-xs font-bold text-sky-400 hover:text-sky-300 transition-colors"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>{showScriptCode ? '▲ ซ่อนคู่มือ & โค้ด Google Apps Script' : '▼ ดูคู่มือ & โค้ดสำหรับ Google Apps Script เพื่อเปิดใช้ระบบ'}</span>
                </button>

                {showScriptCode && (
                  <div className="mt-3 bg-slate-950 border border-slate-850 rounded-xl p-3.5 space-y-3 text-[11px] leading-relaxed">
                    <p className="text-slate-300">
                      <strong>💡 ขั้นตอนวิธีเชื่อมต่อระบบ (สำหรับทำงานเป็นคลาวด์):</strong>
                    </p>
                    <ol className="list-decimal list-inside text-slate-400 space-y-1 text-[10.5px]">
                      <li>สร้าง Google Spreadsheet เปล่าขึ้นมา จากนั้น Copy ลิงก์เบราว์เซอร์มาใส่ในช่องด้านบน</li>
                      <li>ที่เมนูด้านบน กดที่ <strong className="text-slate-300 font-bold">ส่วนขยาย (Extensions) &gt; Apps Script</strong></li>
                      <li>ลบโค้ดที่มีอยู่ทั้งหมดในหน้าเปล่า แล้ววางโค้ดด้านล่างนี้ลงไป</li>
                      <li>คลิกที่ปุ่ม <strong className="text-slate-300 font-bold">การทำให้ใช้งานได้ (Deploy) &gt; การทำให้ใช้งานได้ใหม่ (New deployment)</strong></li>
                      <li>กดรูปฟันเฟือง เลือกประเภทเป็น <strong className="text-slate-300 font-bold">เว็บแอป (Web app)</strong></li>
                      <li>ตั้งค่าช่อง <strong className="text-slate-300 font-bold">ผู้ที่มีสิทธิ์เข้าถึง (Who has access)</strong> ให้เลือกเป็น <strong className="text-slate-300 font-bold">ทุกคน (Anyone)</strong></li>
                      <li>กด Deploy ทำการอนุมัติสิทธิ์ แล้ว Copy เว็บแอป URL ที่ได้มาใส่ในช่อง Endpoint URL ด้านบน</li>
                    </ol>

                    <div className="space-y-1.5 pt-1">
                      <div className="flex justify-between items-center bg-slate-900 px-3 py-1.5 rounded-t-lg border-b border-slate-800 text-[10px] font-mono text-slate-400">
                        <span className="flex items-center gap-1.5"><Code className="w-3 h-3 text-sky-400" /> GoogleAppsScriptCode.js</span>
                        <button
                          type="button"
                          onClick={handleCopyScriptCode}
                          className="flex items-center gap-1 text-sky-400 hover:text-sky-300 font-bold bg-slate-950/60 px-2 py-0.5 rounded border border-slate-850 transition-all hover:scale-[1.02]"
                        >
                          <Copy className="w-3 h-3" />
                          <span>{copiedCode ? 'คัดลอกสำเร็จ!' : 'คัดลอกโค้ด'}</span>
                        </button>
                      </div>
                      <pre className="p-2.5 bg-slate-900 rounded-b-lg font-mono text-[9.5px] text-slate-300 overflow-x-auto max-h-[160px] leading-normal border border-slate-850">
                        {GOOGLE_APPS_SCRIPT_CODE}
                      </pre>
                    </div>
                  </div>
                )}
              </div>

              {/* Sync Sequence Terminal simulation */}
              {(syncing || syncSteps.length > 0) && (
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-850 space-y-1 text-[10px] font-mono text-emerald-400 max-h-[160px] overflow-y-auto">
                  {syncSteps.map((step, idx) => (
                    <div key={idx} className="flex gap-1.5 items-start">
                      <span className="text-slate-600 font-bold">&gt;</span>
                      <p>{step}</p>
                    </div>
                  ))}
                  {syncing && (
                    <span className="inline-block w-2.5 h-2.5 bg-emerald-400 rounded-full animate-ping mt-1"></span>
                  )}
                </div>
              )}

              {syncSuccess && (
                <div className="bg-emerald-950/40 p-3 rounded-xl border border-emerald-900/30 text-emerald-400 text-xs flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-500" />
                  <span>ยินดีด้วย! ซิงค์และส่งออกตารางสู่ Google Sheets สำเร็จ</span>
                </div>
              )}

              <button
                type="button"
                disabled={syncing}
                onClick={handleStartSheetsSync}
                className="w-full py-2.5 bg-slate-850 hover:bg-slate-800 disabled:opacity-40 text-slate-200 border border-slate-800 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all shadow"
              >
                <RefreshCw className={`w-3.5 h-3.5 text-green-400 ${syncing ? 'animate-spin' : ''}`} /> 
                {syncing ? 'กำลังส่งออกข้อมูล...' : 'เริ่มกระบวนการจัดเก็บเข้า Google Sheets'}
              </button>
            </div>
          </div>

          {/* BACKUP & MANUAL RECOVERY PANEL */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-850 pb-3">
              <Database className="w-5 h-5 text-red-500" />
              <div>
                <h3 className="font-bold text-white text-sm">การสำรองและกู้คืนระเบียนระบบ (Database Backup & Manual Recovery)</h3>
                <p className="text-[10px] text-slate-500">ดาวน์โหลดแฟ้มข้อมูลระเบียนทั้งหมดเพื่อความปลอดภัยและกู้คืนข้อมูลได้ด้วยตนเอง</p>
              </div>
            </div>

            <div className="space-y-4 text-xs">
              {/* Export/Backup section */}
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-850 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Download className="w-4 h-4 text-red-500" />
                    <span className="font-bold text-slate-200">สร้างไฟล์สำรองระเบียนระบบ (.json)</span>
                  </div>
                  <span className="text-[9px] px-2 py-0.5 bg-red-950/40 text-red-400 border border-red-900/40 rounded-lg font-bold font-mono">v1.2.4</span>
                </div>
                
                <p className="text-[10px] text-slate-400 leading-relaxed">
                  เมื่อคลิกปุ่มด้านล่าง ระบบจะดึงฐานข้อมูลจำลองทั้งหมดและบันทึกเป็นไฟล์ JSON เพื่อให้สามารถย้ายเครื่อง, นำไปใช้วิเคราะห์ต่อ, หรือนำมาอัปโหลดเพื่อกู้ข้อมูลกลับคืนได้ทุกเมื่อ
                </p>

                {/* Live Database status preview before packaging */}
                {(() => {
                  const currentSnapshot = onGetBackupData();
                  return (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                      <div className="bg-slate-900/60 p-2 rounded-lg border border-slate-850 text-center">
                        <span className="text-[9px] text-slate-500 block font-semibold">ออเดอร์ทั้งหมด</span>
                        <span className="text-xs font-mono font-bold text-slate-200">{currentSnapshot.orders?.length || 0}</span>
                      </div>
                      <div className="bg-slate-900/60 p-2 rounded-lg border border-slate-850 text-center">
                        <span className="text-[9px] text-slate-500 block font-semibold">รายการเมนู</span>
                        <span className="text-xs font-mono font-bold text-slate-200">{currentSnapshot.menuItems?.length || 0}</span>
                      </div>
                      <div className="bg-slate-900/60 p-2 rounded-lg border border-slate-850 text-center">
                        <span className="text-[9px] text-slate-500 block font-semibold">วัตถุดิบสต๊อก</span>
                        <span className="text-xs font-mono font-bold text-slate-200">{currentSnapshot.ingredients?.length || 0}</span>
                      </div>
                      <div className="bg-slate-900/60 p-2 rounded-lg border border-slate-850 text-center">
                        <span className="text-[9px] text-slate-500 block font-semibold">ผู้ใช้งาน</span>
                        <span className="text-xs font-mono font-bold text-slate-200">{currentSnapshot.users?.length || 0}</span>
                      </div>
                    </div>
                  );
                })()}

                <button
                  type="button"
                  onClick={handleDownloadBackup}
                  className="w-full py-2.5 bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-500 hover:to-amber-500 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all shadow"
                >
                  <Download className="w-4 h-4" />
                  <span>สำรองข้อมูลทันที (Backup Now)</span>
                </button>

                {backupStatus === 'SUCCESS' && (
                  <div className="bg-emerald-950/40 p-2.5 rounded-xl border border-emerald-900/30 text-emerald-400 text-[11px] flex items-center gap-1.5 animate-fade-in">
                    <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    <span>สร้างและเริ่มการดาวน์โหลดไฟล์สำรองข้อมูลเรียบร้อยแล้ว! บันทึกลงในไดเรกทอรีดาวน์โหลดของคุณ</span>
                  </div>
                )}
              </div>

              {/* Import/Restore section */}
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-850 space-y-3">
                <div className="flex items-center gap-2">
                  <Upload className="w-4 h-4 text-amber-500" />
                  <span className="font-bold text-slate-200">กู้คืนระบบจากไฟล์สำรองข้อมูล</span>
                </div>

                <p className="text-[10px] text-slate-400 leading-relaxed">
                  เลือกไฟล์สำรองข้อมูลที่เป็นชนิด JSON เพื่อเขียนทับระเบียนปัจจุบันของร้านค้าทั้งหมด (ออเดอร์, สต๊อก, บัญชีผู้ใช้, ข้อมูลการเงิน และสูตรอาหาร)
                </p>

                <div className="relative border border-dashed border-slate-800 hover:border-slate-700 bg-slate-900/20 hover:bg-slate-900/40 rounded-xl p-4 transition-all text-center">
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept=".json"
                    onChange={handleFileUpload}
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                    title=""
                  />
                  <div className="space-y-1">
                    <FileJson className="w-8 h-8 text-slate-500 mx-auto" />
                    <p className="text-[11px] text-slate-300 font-medium">คลิกเพื่อเลือกไฟล์สำรอง (.json)</p>
                    <p className="text-[9px] text-slate-500">ยอมรับเฉพาะโครงสร้าง Backup ที่ถูกต้องเท่านั้น</p>
                  </div>
                </div>

                {restoreError && (
                  <div className="bg-red-950/40 p-2.5 rounded-xl border border-red-900/30 text-red-400 text-[11px] flex items-center gap-1.5">
                    <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                    <span>{restoreError}</span>
                  </div>
                )}

                {/* Inline Confirmation step */}
                {showConfirmRestore && parsedBackup && (
                  <div className="bg-amber-950/20 p-3.5 rounded-xl border border-amber-900/30 space-y-3">
                    <div className="flex items-start gap-2 text-amber-400">
                      <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold block text-xs">⚠️ ยืนยันกระบวนการกู้คืนข้อมูล</span>
                        <span className="text-[10px] text-slate-400 leading-relaxed block mt-1">
                          ระบบพบสแนปช็อตข้อมูลร้านค้าที่สำรองไว้เมื่อ <span className="text-amber-400 font-mono font-bold">{new Date(parsedBackup.backupTimestamp).toLocaleString('th-TH')}</span>
                        </span>
                        <span className="text-[10px] text-slate-400 leading-relaxed block mt-1">
                          การดำเนินการนี้จะ <strong className="text-red-400">เขียนทับล้างข้อมูลปัจจุบันทั้งหมด</strong> และแทนที่ด้วยข้อมูลสแนปช็อตทันที! คุณยอมรับการเขียนทับหรือไม่?
                        </span>
                      </div>
                    </div>

                    <div className="flex gap-2 justify-end pt-1">
                      <button
                        type="button"
                        onClick={handleCancelRestore}
                        className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-lg text-[10px] font-bold"
                      >
                        ยกเลิก
                      </button>
                      <button
                        type="button"
                        onClick={handleConfirmRestore}
                        className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-[10px] font-bold shadow"
                      >
                        ยืนยันเขียนทับกู้คืนระบบ
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 🧹 ระบบล้างข้อมูลระบบและเตรียมใช้งานจริง (System Cleanup & Production Reset) */}
          <div id="system-cleanup-section" className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-850 pb-3">
              <Database className="w-5 h-5 text-red-500" />
              <div>
                <h3 className="font-bold text-white text-sm">ล้างข้อมูลระบบและเตรียมใช้งานจริง (System Cleanup)</h3>
                <p className="text-[10px] text-slate-500">สำหรับทำความสะอาดลบข้อมูลตัวอย่างเพื่อเตรียมเปิดร้านใช้จริง</p>
              </div>
            </div>

            <div className="space-y-3.5 text-xs">
              <p className="text-slate-400 text-[11px] leading-relaxed">
                คุณสามารถเลือกวิธีการล้างข้อมูลตามลักษณะที่ต้องการได้ เพื่อให้ระบบสะอาดและพร้อมบันทึกยอดขายจริง:
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* Option 1: Transactions Only */}
                <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-850 flex flex-col justify-between">
                  <div className="space-y-1.5 mb-3">
                    <span className="font-bold text-slate-200 text-xs block">1. ล้างข้อมูลธุรกรรมเท่านั้น</span>
                    <p className="text-[10px] text-slate-500 leading-normal">
                      ล้างข้อมูลยอดขายออเดอร์, ค่าใช้จ่าย, สต๊อกการเคลื่อนไหว, ใบจัดซื้อ PO, ลูกหนี้และเจ้าหนี้ค้างชำระทั้งหมด
                    </p>
                    <span className="inline-block text-[9px] bg-green-950/40 text-green-400 font-bold px-1.5 py-0.5 rounded border border-green-905/20">
                      แนะนำ! สำหรับตั้งค่าเมนูอาหาร/สูตรไว้แล้ว
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setCleanupMode('TRANSACTIONS');
                      setCleanupConfirmText('');
                    }}
                    className="w-full py-1.5 px-3 bg-red-950/30 hover:bg-red-900/30 text-red-400 font-bold rounded-lg border border-red-900/30 transition-colors text-center text-[10.5px]"
                  >
                    เริ่มล้างข้อมูลธุรกรรม
                  </button>
                </div>

                {/* Option 2: Factory Reset */}
                <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-850 flex flex-col justify-between">
                  <div className="space-y-1.5 mb-3">
                    <span className="font-bold text-red-400 text-xs block">2. ล้างข้อมูลทั้งหมด (Factory Reset)</span>
                    <p className="text-[10px] text-slate-500 leading-normal">
                      ล้างระเบียนระบบทั้งหมดให้เป็นศูนย์: รายการเมนูอาหาร, สูตรอาหาร, รายการวัตถุดิบ, ซัพพลายเออร์, ลูกค้า CRM, และข้อมูลธุรกรรม
                    </p>
                    <span className="inline-block text-[9px] bg-red-950/40 text-red-400/80 font-bold px-1.5 py-0.5 rounded border border-red-900/30">
                      ลบเกลี้ยงเพื่อเริ่มต้นจากศูนย์
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setCleanupMode('ALL');
                      setCleanupConfirmText('');
                    }}
                    className="w-full py-1.5 px-3 bg-red-600 hover:bg-red-500 text-white font-bold rounded-lg transition-colors text-center text-[10.5px]"
                  >
                    ล้างระบบทั้งหมด
                  </button>
                </div>
              </div>

              {/* Confirmation section */}
              {cleanupMode !== 'NONE' && (
                <div className="bg-red-950/15 border border-red-900/40 rounded-xl p-4 mt-3 space-y-3.5">
                  <div className="flex gap-2 text-red-400">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-500" />
                    <div>
                      <span className="font-bold text-xs block">
                        {cleanupMode === 'TRANSACTIONS' 
                          ? '⚠️ คุณกำลังจะล้างเฉพาะข้อมูลธุรกรรมการขายและคลังสินค้า' 
                          : '⚠️ คำเตือน: คุณกำลังจะรีเซ็ตระบบทั้งหมดกลับเป็นค่าเริ่มต้นจากโรงงาน'}
                      </span>
                      <p className="text-[10px] text-slate-400 leading-relaxed mt-1">
                        การดำเนินการนี้เป็นเรื่องร้ายแรงและไม่สามารถย้อนกลับได้ ข้อมูลประวัติต่างๆ จะหายไปอย่างถาวร
                        กรุณาพิมพ์คำว่า <strong className="text-red-400 font-bold">ล้างข้อมูล</strong> ในช่องด้านล่างเพื่อดำเนินการต่อ
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <input
                      type="text"
                      value={cleanupConfirmText}
                      onChange={(e) => setCleanupConfirmText(e.target.value)}
                      placeholder='พิมพ์คำว่า "ล้างข้อมูล" เพื่อยืนยัน'
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 text-xs focus:outline-none focus:border-red-600 font-medium font-sans"
                    />

                    <div className="flex justify-end gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          setCleanupMode('NONE');
                          setCleanupConfirmText('');
                        }}
                        className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-lg text-[10.5px]"
                      >
                        ยกเลิก
                      </button>
                      <button
                        type="button"
                        onClick={handlePerformCleanup}
                        disabled={cleanupConfirmText !== 'ล้างข้อมูล'}
                        className={`px-3.5 py-1.5 font-bold rounded-lg text-[10.5px] shadow-md transition-all ${
                          cleanupConfirmText === 'ล้างข้อมูล'
                            ? 'bg-red-600 hover:bg-red-500 text-white'
                            : 'bg-slate-850 text-slate-600 cursor-not-allowed border border-slate-800'
                        }`}
                      >
                        {cleanupMode === 'TRANSACTIONS' ? 'ยืนยันล้างข้อมูลธุรกรรม' : 'ยืนยันล้างระบบทั้งหมด'}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {cleanupSuccess && (
                <div className="bg-green-950/40 p-3 rounded-xl border border-green-900/30 text-green-400 text-xs flex items-center gap-2 mt-2">
                  <Check className="w-4 h-4 text-green-500 shrink-0" />
                  <span className="font-medium">ดำเนินการล้างข้อมูลเรียบร้อยแล้ว! ระบบได้รับการรีเซ็ตเพื่อเตรียมพร้อมสำหรับเปิดร้านใช้งานจริงแล้ว</span>
                </div>
              )}
            </div>
          </div>

          {/* Table QR Code Generator Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-850 pb-3">
              <QrCode className="w-5 h-5 text-red-500" />
              <div>
                <h3 className="font-bold text-white text-sm">พิมพ์คิวอาร์โค้ดสั่งอาหารประจำโต๊ะ</h3>
                <p className="text-[10px] text-slate-500">สร้างและจัดพิมพ์แผ่นพับหรือการ์ดตั้งโต๊ะคิวอาร์โค้ดสำหรับให้ลูกค้าสแกนสั่งอาหารเข้าสู่ระบบโดยตรง</p>
              </div>
            </div>

            <div className="space-y-4 text-xs text-slate-300">
              {/* Form parameters */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Theme select */}
                <div className="space-y-1.5">
                  <span className="text-slate-400 block font-medium">ธีมและรูปแบบการจัดแต่ง</span>
                  <select
                    value={qrSheetTheme}
                    onChange={(e) => setQrSheetTheme(e.target.value as 'classic' | 'warm' | 'dark' | 'neon')}
                    className="w-full bg-slate-950 border border-slate-800 text-white rounded-lg px-2.5 py-2 text-[11px] focus:outline-none focus:border-red-500"
                  >
                    <option value="classic">Charcoal Crimson (ธีมคลาสสิก แดง-ดำ)</option>
                    <option value="warm">Warm Amber (ธีมไม้ อบอุ่น สบายตา)</option>
                    <option value="dark">Sleek Minimalist (ธีมมินิมอล ประหยัดหมึกพิมพ์)</option>
                    <option value="neon">Cosmic Violet (ธีมเทคโนโลยี สีสันจัดจ้าน)</option>
                  </select>
                </div>

                {/* Card Size select */}
                <div className="space-y-1.5">
                  <span className="text-slate-400 block font-medium">ขนาดการ์ดต่อกระดาษ A4</span>
                  <select
                    value={qrSheetCardSize}
                    onChange={(e) => setQrSheetCardSize(e.target.value as 'small' | 'medium' | 'large')}
                    className="w-full bg-slate-950 border border-slate-800 text-white rounded-lg px-2.5 py-2 text-[11px] focus:outline-none focus:border-red-500"
                  >
                    <option value="large">ขนาดใหญ่ (1 การ์ดตั้งโต๊ะ ต่อ หน้า A4 - เต็มแผ่น)</option>
                    <option value="medium">ขนาดกลาง (4 การ์ดต่อ หน้า A4 - แนะนำ)</option>
                    <option value="small">ขนาดเล็ก (6 การ์ดต่อ หน้า A4 - ประหยัดกระดาษ)</option>
                  </select>
                </div>
              </div>

              {/* Slogan subtitle input */}
              <div className="space-y-1.5">
                <span className="text-slate-400 block font-medium">คำโปรย / คำอธิบายบนแผ่น QR (Slogan)</span>
                <input
                  type="text"
                  value={qrSheetSubtitle}
                  onChange={(e) => setQrSheetSubtitle(e.target.value)}
                  placeholder="เช่น สแกนสั่งอาหารง่ายๆ รวดเร็วทันใจ"
                  className="w-full bg-slate-950 border border-slate-800 text-white rounded-lg px-2.5 py-2 text-[11px] focus:outline-none focus:border-red-500"
                />
              </div>

              {/* BRANDING STYLE CUSTOMIZER */}
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-850 space-y-4">
                <div className="flex items-center gap-1.5 border-b border-slate-850/80 pb-2">
                  <Palette className="w-4 h-4 text-red-500" />
                  <span className="font-bold text-white text-[11px]">การตั้งค่าแบรนด์และสีสันขอบเฟรม QR (Branding Styles)</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Logo selection */}
                  <div className="space-y-1.5">
                    <span className="text-slate-400 block font-medium">รูปแบบตราโลโก้ / ตราสัญลักษณ์</span>
                    <select
                      value={qrLogoStyle}
                      onChange={(e) => setQrLogoStyle(e.target.value as 'none' | 'icon' | 'bowl' | 'default' | 'custom')}
                      className="w-full bg-slate-900 border border-slate-800 text-white rounded-lg px-2.5 py-2 text-[11px] focus:outline-none"
                    >
                      <option value="none">ไม่มีโลโก้ (No Logo)</option>
                      <option value="icon">โลโก้ร้านอาหาร (Restaurant Icon 🏪)</option>
                      <option value="bowl">ตราหม้อดิน/ถ้วยอาหารปรุงร้อน (Hot Bowl 🍲)</option>
                      <option value="default">ตราดาวประกายประกาย (Sparkles ✨)</option>
                      <option value="custom">ใช้โลโก้กำหนดเองด้วย URL รูปภาพ (Custom Image URL)</option>
                    </select>
                  </div>

                  {/* QR Frame Custom color option */}
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 cursor-pointer pt-2">
                      <input
                        type="checkbox"
                        checked={qrFrameUseCustomColor}
                        onChange={(e) => setQrFrameUseCustomColor(e.target.checked)}
                        className="rounded border-slate-800 bg-slate-900 text-red-600 focus:ring-0 w-3.5 h-3.5"
                      />
                      <span className="font-medium text-slate-300">ปรับแต่งสีสันขอบเฟรม QR เอง</span>
                    </label>

                    {qrFrameUseCustomColor && (
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={qrFrameCustomColor}
                          onChange={(e) => setQrFrameCustomColor(e.target.value)}
                          className="w-8 h-8 rounded cursor-pointer border border-slate-700 bg-transparent p-0"
                        />
                        <span className="text-[10px] text-slate-400 font-mono">{qrFrameCustomColor.toUpperCase()}</span>

                        {/* Thickness selector */}
                        <select
                          value={qrFrameThickness}
                          onChange={(e) => setQrFrameThickness(e.target.value as 'thin' | 'medium' | 'thick')}
                          className="bg-slate-900 border border-slate-800 text-white text-[10px] rounded px-2 py-1 focus:outline-none"
                        >
                          <option value="thin">เส้นบาง</option>
                          <option value="medium">เส้นปกติ</option>
                          <option value="thick">เส้นหนาพิเศษ</option>
                        </select>
                      </div>
                    )}
                  </div>
                </div>

                {/* Conditional fields based on logo and bg color */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {qrLogoStyle === 'custom' && (
                    <div className="space-y-1 sm:col-span-2">
                      <span className="text-[10px] text-slate-400 font-bold block">ลิ้งค์ URL โลโก้ของคุณ (เช่น https://example.com/logo.png):</span>
                      <input
                        type="text"
                        value={qrCustomLogoUrl}
                        onChange={(e) => setQrCustomLogoUrl(e.target.value)}
                        placeholder="กรุณาวางที่อยู่รูปภาพออนไลน์ของคุณ"
                        className="w-full bg-slate-900 border border-slate-800 text-white rounded px-2.5 py-2 text-[11px] focus:outline-none"
                      />
                    </div>
                  )}

                  {/* Frame background color */}
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={qrFrameUseCustomBgColor}
                        onChange={(e) => setQrFrameUseCustomBgColor(e.target.checked)}
                        className="rounded border-slate-800 bg-slate-900 text-red-600 focus:ring-0 w-3.5 h-3.5"
                      />
                      <span className="font-medium text-slate-300">ปรับแต่งสีพื้นหลังกรอบ QR เอง</span>
                    </label>

                    {qrFrameUseCustomBgColor && (
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={qrFrameBgColor}
                          onChange={(e) => setQrFrameBgColor(e.target.value)}
                          className="w-8 h-8 rounded cursor-pointer border border-slate-700 bg-transparent p-0"
                        />
                        <span className="text-[10px] text-slate-400 font-mono">{qrFrameBgColor.toUpperCase()}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Toggles grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 bg-slate-950 p-3 rounded-xl border border-slate-850">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={qrSheetShowInstructions}
                    onChange={(e) => setQrSheetShowInstructions(e.target.checked)}
                    className="rounded border-slate-800 bg-slate-900 text-red-600 focus:ring-0 w-3.5 h-3.5"
                  />
                  <span className="text-[10.5px]">แสดงขั้นตอนสั่งอาหาร</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={qrSheetShowWifi}
                    onChange={(e) => setQrSheetShowWifi(e.target.checked)}
                    className="rounded border-slate-800 bg-slate-900 text-red-600 focus:ring-0 w-3.5 h-3.5"
                  />
                  <span className="text-[10.5px]">แสดงข้อมูล WiFi</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={qrSheetShowPhone}
                    onChange={(e) => setQrSheetShowPhone(e.target.checked)}
                    className="rounded border-slate-800 bg-slate-900 text-red-600 focus:ring-0 w-3.5 h-3.5"
                  />
                  <span className="text-[10.5px]">แสดงเบอร์โทรศัพท์</span>
                </label>
              </div>

              {/* Conditional parameters based on checkboxes */}
              {(qrSheetShowWifi || qrSheetShowPhone) && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 p-3 bg-slate-950/40 border border-slate-850 rounded-xl">
                  {qrSheetShowWifi && (
                    <>
                      <div className="space-y-1">
                        <span className="text-[9.5px] text-slate-400 font-bold">ชื่อสัญญาณ WiFi:</span>
                        <input
                          type="text"
                          value={qrSheetWifiName}
                          onChange={(e) => setQrSheetWifiName(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-800 text-white rounded px-2 py-1 text-[10.5px] focus:outline-none"
                        />
                      </div>
                      <div className="space-y-1">
                        <span className="text-[9.5px] text-slate-400 font-bold">รหัสผ่าน WiFi:</span>
                        <input
                          type="text"
                          value={qrSheetWifiPass}
                          onChange={(e) => setQrSheetWifiPass(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-800 text-white rounded px-2 py-1 text-[10.5px] focus:outline-none font-mono"
                        />
                      </div>
                    </>
                  )}
                  {qrSheetShowPhone && (
                    <div className="space-y-1">
                      <span className="text-[9.5px] text-slate-400 font-bold">เบอร์โทรติดต่อ:</span>
                      <input
                        type="text"
                        value={qrSheetPhone}
                        onChange={(e) => setQrSheetPhone(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 text-white rounded px-2 py-1 text-[10.5px] focus:outline-none font-mono"
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Table checklist selection */}
              <div className="space-y-2">
                <div className="flex justify-between items-center text-[11px]">
                  <span className="text-slate-400 block font-medium">เลือกโต๊ะที่ต้องการพิมพ์คิวอาร์ ({selectedTablesForQR.length} โต๊ะ):</span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedTablesForQR([...tablesList])}
                      className="text-red-500 hover:text-red-400 font-bold text-[10px]"
                    >
                      เลือกทั้งหมด
                    </button>
                    <span className="text-slate-700">|</span>
                    <button
                      type="button"
                      onClick={() => setSelectedTablesForQR([])}
                      className="text-slate-500 hover:text-slate-400 font-bold text-[10px]"
                    >
                      ล้างการเลือก
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-5 sm:grid-cols-7 gap-1.5 p-2 bg-slate-950 rounded-xl border border-slate-850 max-h-[140px] overflow-y-auto">
                  {tablesList.map(table => {
                    const isSelected = selectedTablesForQR.includes(table);
                    return (
                      <button
                        type="button"
                        key={table}
                        onClick={() => {
                          if (isSelected) {
                            setSelectedTablesForQR(selectedTablesForQR.filter(t => t !== table));
                          } else {
                            setSelectedTablesForQR([...selectedTablesForQR, table]);
                          }
                        }}
                        className={`py-1.5 px-1 rounded-lg text-[10.5px] font-bold text-center border transition-all ${
                          isSelected
                            ? 'bg-red-600 border-red-500 text-white shadow-sm'
                            : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        โต๊ะ {table}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex gap-2.5 pt-1.5 font-sans">
                <button
                  type="button"
                  onClick={() => {
                    if (selectedTablesForQR.length === 0) {
                      alert('กรุณาเลือกอย่างน้อย 1 โต๊ะเพื่อสร้างแผ่น QR');
                      return;
                    }
                    recordQRActivity(selectedTablesForQR, 'print');
                    setShowQRPrintPreviewModal(true);
                  }}
                  className="flex-1 py-2 px-3 bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-500 hover:to-amber-500 text-white text-[11px] font-black rounded-xl shadow-lg transition-all flex items-center justify-center gap-1.5 hover:scale-[1.01] active:scale-[0.99] cursor-pointer"
                >
                  <Printer className="w-4 h-4" /> ดูตัวอย่างแผ่นพิมพ์ & สั่งพิมพ์ QR
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    if (selectedTablesForQR.length === 0) {
                      alert('กรุณาเลือกอย่างน้อย 1 โต๊ะเพื่อดาวน์โหลด');
                      return;
                    }
                    if (selectedTablesForQR.length > 5) {
                      const confirmBulk = window.confirm(`ระบบจะสุ่มดาวน์โหลดไฟล์ภาพคิวอาร์โค้ดจำนวน ${selectedTablesForQR.length} รูปแยกกันลงเครื่อง คุณต้องการดาวน์โหลดต่อหรือไม่?`);
                      if (!confirmBulk) return;
                    }
                    recordQRActivity(selectedTablesForQR, 'download');
                    for (const table of selectedTablesForQR) {
                      const tableUrl = `${window.location.origin}${window.location.pathname}?table=${table}`;
                      const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(tableUrl)}`;
                      // Create direct link download or fallback
                      const a = document.createElement('a');
                      a.href = qrUrl;
                      a.target = '_blank';
                      a.download = `QR_Table_${table}.png`;
                      document.body.appendChild(a);
                      a.click();
                      document.body.removeChild(a);
                      await new Promise(resolve => setTimeout(resolve, 300));
                    }
                  }}
                  className="py-2 px-4 bg-slate-800 hover:bg-slate-750 text-slate-200 text-[11px] font-bold rounded-xl border border-slate-700/80 transition-all flex items-center gap-1.5 shrink-0 cursor-pointer"
                  title="ดาวน์โหลดเฉพาะภาพคิวอาร์โค้ด PNG"
                >
                  <Download className="w-4 h-4" /> โหลด PNG
                </button>
              </div>

              {/* DOWNLOAD & PRINT HISTORY SECTION */}
              <div className="border-t border-slate-850 pt-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <History className="w-4 h-4 text-slate-400" />
                    <span className="font-bold text-white text-[11px]">ประวัติการดาวน์โหลดและพิมพ์คิวอาร์โค้ด ({qrHistory.length})</span>
                  </div>
                  {qrHistory.length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        if (window.confirm('คุณต้องการล้างประวัติการพิมพ์/ดาวน์โหลดทั้งหมดหรือไม่?')) {
                          setQrHistory([]);
                          localStorage.removeItem('qr_download_history');
                        }
                      }}
                      className="text-red-500 hover:text-red-400 text-[10px] font-bold"
                    >
                      ล้างประวัติทั้งหมด
                    </button>
                  )}
                </div>

                {qrHistory.length > 0 ? (
                  <div className="space-y-2">
                    {/* Search bar inside history */}
                    <div className="relative">
                      <Search className="absolute left-2.5 top-2 w-3.5 h-3.5 text-slate-500" />
                      <input
                        type="text"
                        value={qrHistorySearch}
                        onChange={(e) => setQrHistorySearch(e.target.value)}
                        placeholder="ค้นหาตามเลขโต๊ะ..."
                        className="w-full pl-8 pr-3 py-1.5 bg-slate-950 border border-slate-850 rounded-lg text-slate-300 text-[10.5px] focus:outline-none"
                      />
                    </div>

                    <div className="bg-slate-950/80 rounded-xl border border-slate-850 max-h-[180px] overflow-y-auto divide-y divide-slate-900 font-sans">
                      {qrHistory
                        .filter(item => !qrHistorySearch || item.tableNo.includes(qrHistorySearch))
                        .map((item) => (
                          <div key={item.id} className="p-2.5 flex items-start justify-between gap-3 text-[10px]">
                            <div className="space-y-0.5 min-w-0 flex-1">
                              <div className="flex items-center gap-1.5">
                                <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase ${
                                  item.action === 'download' 
                                    ? 'bg-blue-950/50 text-blue-400 border border-blue-900/40' 
                                    : 'bg-green-950/50 text-green-400 border border-green-900/40'
                                }`}>
                                  {item.action === 'download' ? 'ดาวน์โหลด' : 'สั่งพิมพ์'}
                                </span>
                                <span className="font-extrabold text-slate-200">โต๊ะที่ {item.tableNo}</span>
                              </div>
                              <p className="text-slate-500 text-[9px] truncate">{item.details}</p>
                              <span className="text-[9px] text-slate-600 block">{item.timestamp}</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                const filtered = qrHistory.filter(x => x.id !== item.id);
                                setQrHistory(filtered);
                                localStorage.setItem('qr_download_history', JSON.stringify(filtered));
                              }}
                              className="text-slate-600 hover:text-red-400 p-1"
                              title="ลบรายการนี้"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      {qrHistory.filter(item => !qrHistorySearch || item.tableNo.includes(qrHistorySearch)).length === 0 && (
                        <div className="p-4 text-center text-slate-600 text-[10.5px]">
                          ไม่พบประวัติการใช้งานตามเงื่อนไขที่ค้นหา
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="bg-slate-950/40 border border-dashed border-slate-850 p-4 rounded-xl text-center text-slate-500 text-[10.5px]">
                    ยังไม่มีการดาวน์โหลดหรือสั่งพิมพ์คิวอาร์โค้ดใดๆ ในระบบนี้
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: BRANCHES & USER ACCOUNTS (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Active Branch Control (Multi-branch) */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-850 pb-3">
              <Store className="w-5 h-5 text-red-500" />
              <div>
                <h3 className="font-bold text-white text-sm">การสลับและบริหารหลายสาขา (Multi-branch)</h3>
                <p className="text-[10px] text-slate-500">เลือกดำเนินการสาขาเพื่อคัดกรองสต๊อกและยอดขาย</p>
              </div>
            </div>

            <div className="space-y-2.5 text-xs">
              <span className="text-slate-400 block font-medium">สาขาที่เปิดให้บริการกำลังดำเนินการ:</span>
              
              <div className="space-y-2">
                {branches.map(br => {
                  const isActive = activeBranchId === br.id;
                  return (
                    <div
                      key={br.id}
                      onClick={() => onSwitchBranch(br.id)}
                      className={`w-full p-3 rounded-xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                        isActive
                          ? 'border-red-500 bg-red-950/10 text-white font-bold'
                          : 'border-slate-800 bg-slate-950 text-slate-400 hover:text-white'
                      }`}
                    >
                      <div>
                        <span className="block text-xs">{br.name}</span>
                        <span className="block text-[10px] text-slate-500 font-normal mt-0.5 font-mono">โทร: {br.phone}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {isActive && (
                          <span className="px-2 py-0.5 bg-red-600 text-white rounded text-[9px] uppercase font-bold tracking-wider">
                            Active
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={(e) => handleDeleteBranch(br.id, br.name, e)}
                          className="p-1 text-slate-500 hover:text-red-500 hover:bg-slate-900 rounded-lg transition-colors"
                          title="ลบสาขา"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Add branch form */}
              <form onSubmit={handleAddBranch} className="bg-slate-950 p-3.5 rounded-xl border border-slate-850/80 space-y-2.5 mt-3">
                <span className="block text-[10px] font-bold text-slate-400">เพิ่มสาขาใหม่</span>
                <input
                  type="text"
                  required
                  placeholder="ชื่อสาขา (เช่น สาขาสยามพารากอน)"
                  value={newBranchName}
                  onChange={(e) => setNewBranchName(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 text-white rounded-lg px-2.5 py-1.5 text-[11px] focus:outline-none"
                />
                <input
                  type="text"
                  placeholder="เบอร์โทรศัพท์สาขา"
                  value={newBranchPhone}
                  onChange={(e) => setNewBranchPhone(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 text-white rounded-lg px-2.5 py-1.5 text-[11px] focus:outline-none"
                />
                <button
                  type="submit"
                  className="w-full py-1.5 bg-slate-800 hover:bg-slate-750 text-slate-200 font-bold rounded-lg text-[10px]"
                >
                  บันทึกสาขาพ่วง
                </button>
              </form>
            </div>
          </div>

          {/* User Management */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow space-y-4">
            <div className="flex items-center justify-between border-b border-slate-850 pb-3">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-red-500" />
                <div>
                  <h3 className="font-bold text-white text-sm">พนักงานในสังกัดและสิทธิ์ผู้ใช้งาน</h3>
                  <p className="text-[10px] text-slate-500">รายชื่อบัญชีพนักงานที่ได้รับอนุญาตเข้าสู่ระบบ</p>
                </div>
              </div>
              {(currentUser.role === 'Admin' || currentUser.role === 'Manager') && (
                <button
                  onClick={() => setShowAddUser(!showAddUser)}
                  className="text-red-500 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-all"
                >
                  <Plus className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Add user form */}
            {showAddUser && (
              <form onSubmit={handleAddUser} className="bg-slate-950 p-3.5 rounded-xl border border-slate-850 space-y-2.5 text-xs">
                <span className="block text-[10px] font-bold text-slate-400">สร้างบัญชีสมาชิก</span>
                <input
                  type="text"
                  required
                  placeholder="ชื่อบัญชีเข้าสู่ระบบ (เช่น somchai)"
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 text-white rounded-lg px-2.5 py-1.5 text-[11px] focus:outline-none font-mono"
                />
                <input
                  type="text"
                  required
                  placeholder="ชื่อจริง-นามสกุลจริง"
                  value={newRealName}
                  onChange={(e) => setNewRealName(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 text-white rounded-lg px-2.5 py-1.5 text-[11px] focus:outline-none"
                />
                
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">รหัสผ่านเริ่มต้น:</span>
                    <input
                      type="text"
                      required
                      placeholder="รหัสผ่าน"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 text-white rounded-lg px-2 py-1 text-[11px] focus:outline-none font-mono"
                    />
                  </div>
                  <div className="space-y-1">
                    <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">PIN 4 หลักเริ่มต้น:</span>
                    <input
                      type="text"
                      required
                      maxLength={4}
                      placeholder="PIN"
                      value={newPin}
                      onChange={(e) => {
                        const val = e.target.value.replace(/[^0-9]/g, '');
                        setNewPin(val);
                      }}
                      className="w-full bg-slate-900 border border-slate-800 text-white rounded-lg px-2 py-1 text-[11px] focus:outline-none font-mono text-center tracking-widest"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2.5">
                  <span className="text-[10px] text-slate-500 font-bold">สิทธิ์:</span>
                  <select
                    value={newUserRole}
                    onChange={(e) => setNewUserRole(e.target.value as UserRole)}
                    className="flex-1 bg-slate-900 border border-slate-800 text-white rounded-lg px-2 py-1 text-[11px]"
                  >
                    <option value="Admin">แอดมิน (Admin)</option>
                    <option value="Manager">ผู้จัดการ (Manager)</option>
                    <option value="Cashier">แคชเชียร์ (Cashier)</option>
                    <option value="Staff">พนักงานครัว (Kitchen Staff)</option>
                  </select>
                </div>
                <button
                  type="submit"
                  className="w-full py-1.5 bg-red-600 text-white font-bold rounded-lg text-[10px]"
                >
                  ยืนยันบันทึกบัญชี
                </button>
              </form>
            )}

            <div className="space-y-2.5 text-xs">
              {users.map(u => {
                const isSelf = currentUser && u.id === currentUser.id;
                return (
                  <div key={u.id} className="p-3 bg-slate-950 rounded-xl border border-slate-850 flex items-center justify-between">
                    <div>
                      <span className="font-bold text-slate-200 block">{u.name}</span>
                      <div className="flex items-center gap-2 mt-0.5 text-[10px] text-slate-500 font-mono">
                        <span>User: {u.username}</span>
                        <span>•</span>
                        <span>PIN: {u.pin || '0000'}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                        u.role === 'Admin'
                           ? 'bg-red-950 text-red-400 border border-red-900/40'
                           : u.role === 'Manager'
                           ? 'bg-amber-950 text-amber-400 border border-amber-900/40'
                           : u.role === 'Cashier'
                           ? 'bg-blue-950 text-blue-400 border border-blue-900/40'
                           : 'bg-slate-900 text-slate-400 border border-slate-800'
                      }`}>
                        {u.role === 'Admin' ? 'แอดมิน' : u.role === 'Manager' ? 'ผู้จัดการ' : u.role === 'Cashier' ? 'แคชเชียร์' : 'ครัว'}
                      </span>
                      
                      {(currentUser.role === 'Admin' || currentUser.role === 'Manager') && (
                        <>
                          <button
                            type="button"
                            onClick={() => handleStartEditUser(u)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-amber-500 hover:bg-slate-900 transition-colors"
                            title="แก้ไขรายละเอียดและรหัสผ่าน"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDeleteUser(u.id, u.name)}
                            className={`p-1.5 rounded-lg transition-colors ${
                              isSelf
                                ? 'text-slate-800 cursor-not-allowed opacity-30'
                                : 'text-slate-500 hover:text-red-500 hover:bg-slate-900'
                            }`}
                            disabled={isSelf}
                            title={isSelf ? 'ไม่สามารถลบบัญชีตัวเองที่กำลังใช้งานได้' : 'ลบข้อมูลผู้ใช้งาน'}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Dynamic Role Permissions Manager */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-850 pb-3">
              <ShieldAlert className="w-5 h-5 text-red-500" />
              <div>
                <h3 className="font-bold text-white text-sm">จำกัดสิทธิ์ตำแหน่งพนักงาน (RBAC Settings)</h3>
                <p className="text-[10px] text-slate-500">ปรับเปลี่ยนการเข้าใช้งานเมนูต่างๆ แยกแต่ละตำแหน่ง</p>
              </div>
            </div>

            {/* Role Tab Selector */}
            {(() => {
              const [selectedRole, setSelectedRole] = useState<'Manager' | 'Cashier' | 'Staff'>('Cashier');
              
              const ALL_SCREENS = [
                { id: 'DASHBOARD', label: 'แดชบอร์ดสรุปผู้บริหาร' },
                { id: 'POS', label: 'ระบบขายหน้าร้าน (POS)' },
                { id: 'QR_ORDERING', label: 'ระบบสั่งอาหารคิวอาร์ (QR)' },
                { id: 'KITCHEN', label: 'ระบบครัว (KDS)' },
                { id: 'INVENTORY', label: 'สต๊อกวัตถุดิบอัตโนมัติ' },
                { id: 'RECIPES', label: 'เมนูและสูตรตัดสต๊อก' },
                { id: 'PURCHASE', label: 'จัดซื้อ PO & ซัพพลายเออร์' },
                { id: 'ACCOUNTING', label: 'การเงินและสมุดบัญชี' },
                { id: 'CRM', label: 'สมาชิก CRM & คูปอง' },
                { id: 'ALERTS', label: 'แจ้งเตือนไลน์ Telegram' },
                { id: 'REPORTS', label: 'วิเคราะห์ผลประกอบการ' }
              ];

              const handleToggle = (screenId: string) => {
                const currentList = rolePermissions[selectedRole] || [];
                let newList: string[];
                if (currentList.includes(screenId)) {
                  newList = currentList.filter(id => id !== screenId);
                } else {
                  newList = [...currentList, screenId];
                }
                onUpdatePermissions({
                  ...rolePermissions,
                  [selectedRole]: newList
                });
              };

              return (
                <div className="space-y-3.5 text-xs">
                  {/* Tab Selector */}
                  <div className="grid grid-cols-3 gap-1 p-1 bg-slate-950 rounded-xl border border-slate-850">
                    {(['Manager', 'Cashier', 'Staff'] as const).map(role => (
                      <button
                        key={role}
                        type="button"
                        onClick={() => setSelectedRole(role)}
                        className={`py-1.5 px-2 rounded-lg text-[10px] font-bold text-center transition-all ${
                          selectedRole === role
                            ? 'bg-red-600 text-white shadow-sm'
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        {role === 'Manager' ? 'ผู้จัดการ' : role === 'Cashier' ? 'แคชเชียร์' : 'ครัว'}
                      </button>
                    ))}
                  </div>

                  <div className="bg-slate-950/55 border border-slate-850 rounded-xl p-1.5 space-y-1">
                    <div className="p-2 border-b border-slate-900 text-[10px] text-slate-500 font-semibold flex justify-between items-center">
                      <span>ชื่อโมดูล / หน้าทำงาน</span>
                      <span>สถานะสิทธิ์</span>
                    </div>

                    <div className="max-h-[220px] overflow-y-auto space-y-0.5 divide-y divide-slate-950">
                      {ALL_SCREENS.map(screen => {
                        const hasAccess = (rolePermissions[selectedRole] || []).includes(screen.id);
                        return (
                          <div 
                            key={screen.id} 
                            onClick={() => handleToggle(screen.id)}
                            className="p-2.5 flex items-center justify-between hover:bg-slate-900/40 rounded-lg cursor-pointer transition-colors"
                          >
                            <span className={`text-[11px] font-medium ${hasAccess ? 'text-slate-200' : 'text-slate-500 line-through'}`}>
                              {screen.label}
                            </span>
                            <div className="relative inline-flex items-center">
                              <input
                                type="checkbox"
                                checked={hasAccess}
                                readOnly
                                className="sr-only peer"
                              />
                              <div className="w-8 h-4.5 bg-slate-800 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-slate-300 after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-red-600 peer-checked:after:bg-white"></div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="bg-red-950/10 border border-red-900/30 rounded-xl p-3 text-[10.5px] text-red-400/80 leading-relaxed flex gap-2">
                    <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                    <p>ระบบกำหนดสิทธิ์แบบไดนามิก! การเปลี่ยนช่องสถานะสิทธิ์ของตำแหน่งจะส่งผลลัพธ์ในการจำกัดหน้าแดชบอร์ด/การทำงานของพนักงานแบบ Real-Time ทันทีที่พวกเขากดเปลี่ยนเมนู</p>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>

      </div>

      {/* Edit User Modal */}
      {editingUser && (
        <div className="fixed inset-0 bg-black/75 z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="bg-gradient-to-r from-slate-900 to-red-950/20 p-4 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Edit className="w-5 h-5 text-red-500" />
                <span className="font-bold text-white text-sm">แก้ไขข้อมูลและรหัสเข้าใช้งาน</span>
              </div>
              <button
                type="button"
                onClick={() => setEditingUser(null)}
                className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800/50 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEditUser} className="p-5 space-y-4 text-xs">
              {/* Name */}
              <div className="space-y-1.5">
                <label className="block text-[10.5px] font-bold text-slate-400 uppercase tracking-wider">ชื่อจริง-นามสกุลจริง</label>
                <input
                  type="text"
                  required
                  value={editRealName}
                  onChange={(e) => setEditRealName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-850 focus:border-red-500/50 text-slate-100 rounded-xl px-3.5 py-2 focus:outline-none transition-all text-xs"
                  placeholder="ชื่อจริง-นามสกุลจริง"
                />
              </div>

              {/* Username */}
              <div className="space-y-1.5">
                <label className="block text-[10.5px] font-bold text-slate-400 uppercase tracking-wider">ชื่อบัญชีผู้ใช้สำหรับล็อกอิน</label>
                <input
                  type="text"
                  required
                  value={editUsername}
                  onChange={(e) => setEditUsername(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-850 focus:border-red-500/50 text-slate-100 rounded-xl px-3.5 py-2 focus:outline-none transition-all text-xs font-mono"
                  placeholder="เช่น admin, somsom"
                />
              </div>

              {/* Role Select */}
              <div className="space-y-1.5">
                <label className="block text-[10.5px] font-bold text-slate-400 uppercase tracking-wider">ตำแหน่ง / สิทธิ์ทำงาน</label>
                <select
                  value={editUserRole}
                  onChange={(e) => setEditUserRole(e.target.value as UserRole)}
                  className="w-full bg-slate-950 border border-slate-850 focus:border-red-500/50 text-slate-100 rounded-xl px-3.5 py-2 focus:outline-none transition-all text-xs"
                >
                  <option value="Admin">แอดมิน (Admin)</option>
                  <option value="Manager">ผู้จัดการ (Manager)</option>
                  <option value="Cashier">แคชเชียร์ (Cashier)</option>
                  <option value="Staff">พนักงานครัว (Kitchen Staff)</option>
                </select>
              </div>

              {/* Credentials Grid */}
              <div className="grid grid-cols-2 gap-3.5">
                {/* Password */}
                <div className="space-y-1.5">
                  <label className="block text-[10.5px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                    <Lock className="w-3.5 h-3.5 text-amber-500" />
                    <span>รหัสผ่านล็อกอิน</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={editPassword}
                    onChange={(e) => setEditPassword(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-850 focus:border-amber-500/50 text-slate-100 rounded-xl px-3.5 py-2 focus:outline-none transition-all text-xs font-mono"
                    placeholder="รหัสผ่าน"
                  />
                </div>

                {/* PIN */}
                <div className="space-y-1.5">
                  <label className="block text-[10.5px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                    <Key className="w-3.5 h-3.5 text-green-500" />
                    <span>รหัส PIN 4 หลัก</span>
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={4}
                    value={editPin}
                    onChange={(e) => {
                      // Allow only numbers, max length 4
                      const val = e.target.value.replace(/[^0-9]/g, '');
                      setEditPin(val);
                    }}
                    className="w-full bg-slate-950 border border-slate-850 focus:border-green-500/50 text-slate-100 rounded-xl px-3.5 py-2 focus:outline-none transition-all text-xs font-mono text-center tracking-widest"
                    placeholder="1234"
                  />
                </div>
              </div>

              {/* Help tip */}
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-850 text-[10px] text-slate-500 leading-relaxed">
                <span className="font-bold text-slate-400 block mb-0.5">💡 วิธีการเข้าใช้งาน:</span>
                • ล็อกอินด้วย **PIN** รวดเร็วโดยพิมพ์รหัส 4 หลักที่แป้นพิมพ์หน้าแรก<br />
                • ล็อกอินด้วย **รหัสผ่าน** โดยสลับไปที่โหมดพิมพ์ด้วยชื่อบัญชีและรหัสผ่าน
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="flex-1 py-2 bg-slate-800 hover:bg-slate-750 text-slate-300 font-bold rounded-xl text-center transition-all text-xs"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-500 hover:to-amber-500 text-white font-bold rounded-xl text-center transition-all shadow-md text-xs"
                >
                  บันทึกการเปลี่ยนแปลง
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Fullscreen Table QR Code Print Preview Modal */}
      {showQRPrintPreviewModal && (() => {
        // Chunk utility helper
        const chunkArray = <T,>(arr: T[], size: number): T[][] => {
          const chunks: T[][] = [];
          for (let i = 0; i < arr.length; i += size) {
            chunks.push(arr.slice(i, i + size));
          }
          return chunks;
        };

        const tStyles = getThemeStyles();
        const chunkSize = qrSheetCardSize === 'large' ? 1 : qrSheetCardSize === 'medium' ? 4 : 6;
        const pageChunks = chunkArray(selectedTablesForQR, chunkSize);

        return (
          <div className="fixed inset-0 bg-slate-950/95 z-[100] flex flex-col no-print overflow-hidden">
            {/* Top Control Bar (Screen only) */}
            <div className="bg-slate-900 p-4 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 shrink-0 shadow-lg font-sans">
              <div className="flex items-center gap-3">
                <div className="bg-red-600 p-2 rounded-xl text-white">
                  <Printer className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-white text-sm">ตัวอย่างหน้าพิมพ์คิวอาร์โค้ด ({selectedTablesForQR.length} โต๊ะ)</h3>
                  <p className="text-[10px] text-slate-400 mt-0.5">ตรวจสอบการจัดวางกระดาษก่อนสั่งพิมพ์จริง แนะนำเปิด 'เปิดกราฟิกพื้นหลัง' (Background graphics) ในการตั้งค่าพิมพ์</p>
                </div>
              </div>

              {/* Controls */}
              <div className="flex flex-wrap items-center gap-2.5">
                <div className="flex items-center gap-1.5 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-400 font-bold">ธีม:</span>
                  <select
                    value={qrSheetTheme}
                    onChange={(e) => setQrSheetTheme(e.target.value as 'classic' | 'warm' | 'dark' | 'neon')}
                    className="bg-transparent text-white text-[10.5px] font-bold focus:outline-none"
                  >
                    <option value="classic">คลาสสิก (Charcoal Crimson)</option>
                    <option value="warm">อบอุ่น (Warm Amber)</option>
                    <option value="dark">มินิมอลประหยัดหมึก (Sleek Dark)</option>
                    <option value="neon">สีสันจัดจ้าน (Cosmic Violet)</option>
                  </select>
                </div>

                <div className="flex items-center gap-1.5 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-400 font-bold">ขนาด:</span>
                  <select
                    value={qrSheetCardSize}
                    onChange={(e) => setQrSheetCardSize(e.target.value as 'small' | 'medium' | 'large')}
                    className="bg-transparent text-white text-[10.5px] font-bold focus:outline-none"
                  >
                    <option value="large">1 การ์ด / A4</option>
                    <option value="medium">4 การ์ด / A4</option>
                    <option value="small">6 การ์ด / A4</option>
                  </select>
                </div>

                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-4 py-2 bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-500 hover:to-amber-500 text-white text-xs font-black rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Printer className="w-4 h-4" /> สั่งพิมพ์ (Print / PDF)
                </button>
                <button
                  type="button"
                  onClick={() => setShowQRPrintPreviewModal(false)}
                  className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-xl transition-all cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Scrollable Document Area (On Screen) */}
            <div className="flex-1 overflow-y-auto p-6 sm:p-10 bg-slate-950 flex flex-col items-center gap-8 font-sans">
              {/* Desktop Help Tip */}
              <div className="w-full max-w-4xl bg-blue-950/30 border border-blue-900/30 rounded-2xl p-4 text-xs text-blue-400 flex gap-2.5 items-start">
                <AlertCircle className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-blue-300 block mb-0.5">💡 เคล็ดลับการพิมพ์แผ่นตั้งโต๊ะให้สวยงาม:</span>
                  • <strong className="text-white">การบันทึก PDF / สั่งพิมพ์:</strong> ในหน้าต่างตั้งค่าการพิมพ์ของเบราว์เซอร์ ให้เปลี่ยนช่องปลายทางเป็น <strong className="text-white">"Save as PDF" (บันทึกเป็น PDF)</strong> หรือเลือกเครื่องพิมพ์ของคุณ<br />
                  • <strong className="text-white">เปิด Background graphics:</strong> ตรวจสอบให้แน่ใจว่าได้ติ๊กถูกเลือก <strong className="text-white">"กราฟิกพื้นหลัง" (Background graphics)</strong> เพื่อแสดงสีสันและดีไซน์อย่างถูกต้อง<br />
                  • <strong className="text-white">ขอบกระดาษ:</strong> แนะนำเลือก Margin เป็น <strong className="text-white">"None" (ไม่มี)</strong> เพื่อให้เนื้อหาจัดเต็มแผ่นกระดาษ A4 ได้พอดี
                </div>
              </div>

              {/* Render of A4 Pages */}
              <div className="w-full max-w-4xl space-y-8 print:space-y-0">
                {pageChunks.map((chunk, pageIndex) => (
                  <div
                    key={pageIndex}
                    className="bg-white text-slate-900 shadow-2xl rounded-2xl p-6 sm:p-8 mx-auto border border-slate-200 print:border-none print:shadow-none print:rounded-none print:p-0 relative overflow-hidden"
                    style={{
                      aspectRatio: '1 / 1.414', // standard A4 ratio
                      width: '100%',
                      maxWidth: '800px',
                      pageBreakAfter: 'always',
                    }}
                  >
                    {/* Background grid line helper (Only on screen) */}
                    <div className="absolute inset-0 pointer-events-none border-2 border-dashed border-red-500/10 rounded-2xl print:hidden" />

                    <div className="h-full flex flex-col justify-between">
                      {qrSheetCardSize === 'large' ? (
                        // 1 CARD PER PAGE
                        chunk.map((tableNo) => (
                          <div key={tableNo} className="h-full flex flex-col justify-between items-center p-8 border border-slate-100 rounded-3xl relative overflow-hidden">
                            {/* Decorative Accent Header */}
                            <div className={`absolute top-0 inset-x-0 h-3 ${tStyles.bannerBg}`} />
                            
                            {/* Header details */}
                            <div className="text-center space-y-2 mt-4 flex flex-col items-center">
                              {qrLogoStyle !== 'none' && (
                                <div className="mb-1">
                                  {renderQrLogo('md')}
                                </div>
                              )}
                              <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${tStyles.tagBg}`}>
                                WELCOME TO
                              </span>
                              <h2 className={`text-2xl font-black tracking-tight ${tStyles.textPrimary}`}>{settings.storeName}</h2>
                              <p className={`text-xs ${tStyles.textSecondary}`}>{qrSheetSubtitle}</p>
                            </div>

                            {/* QR Code Frame */}
                            <div 
                              className="p-5 rounded-3xl shadow-sm flex items-center justify-center relative border transition-all"
                              style={{
                                borderColor: qrFrameUseCustomColor ? qrFrameCustomColor : undefined,
                                borderWidth: qrFrameUseCustomColor ? (qrFrameThickness === 'thin' ? '1px' : qrFrameThickness === 'thick' ? '4px' : '2px') : undefined,
                                backgroundColor: qrFrameUseCustomBgColor ? qrFrameBgColor : undefined,
                              }}
                            >
                              <img
                                src={`https://api.qrserver.com/v1/create-qr-code/?size=260x260&data=${encodeURIComponent(`${window.location.origin}${window.location.pathname}?table=${tableNo}`)}`}
                                alt={`QR Table ${tableNo}`}
                                className="w-52 h-52 object-contain"
                                referrerPolicy="no-referrer"
                              />
                              {qrLogoStyle !== 'none' && (
                                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                  <div className="p-1.5 bg-white rounded-xl shadow-md border border-slate-100">
                                    {renderQrLogo('sm')}
                                  </div>
                                </div>
                              )}
                            </div>

                            {/* Table text */}
                            <div className="text-center space-y-1">
                              <span className={`block text-[11px] font-black uppercase tracking-widest ${tStyles.textSecondary}`}>TABLE NUMBER</span>
                              <span className={`text-5xl font-black tracking-tight ${tStyles.textPrimary}`}>โต๊ะที่ {tableNo}</span>
                            </div>

                            {/* Instructions Block */}
                            {qrSheetShowInstructions && (
                              <div className={`w-full max-w-md bg-slate-50/50 p-4 rounded-2xl border ${tStyles.borderColor} text-left`}>
                                <span className={`block text-[10px] font-black uppercase tracking-widest ${tStyles.textSecondary} mb-2`}>📌 ขั้นตอนการสั่งอาหารง่ายๆ:</span>
                                <div className="space-y-1.5 text-[10.5px]">
                                  <div className="flex items-center gap-2">
                                    <span className={`w-4 h-4 rounded-full flex items-center justify-center font-bold text-[9.5px] ${tStyles.bulletColor}`}>1</span>
                                    <span className="font-semibold text-slate-800">สแกนคิวอาร์โค้ดประจำโต๊ะด้วยกล้องมือถือ</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className={`w-4 h-4 rounded-full flex items-center justify-center font-bold text-[9.5px] ${tStyles.bulletColor}`}>2</span>
                                    <span className="font-semibold text-slate-800">เลือกรายการอาหารสุดโปรดของคุณ และกดยืนยันออเดอร์</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className={`w-4 h-4 rounded-full flex items-center justify-center font-bold text-[9.5px] ${tStyles.bulletColor}`}>3</span>
                                    <span className="font-semibold text-slate-800">รอรับประทานอาหารปรุงสุกใหม่ และชำระเงินที่เคาน์เตอร์เมื่ออิ่ม</span>
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* Wifi and Contacts */}
                            <div className="w-full flex justify-between items-center text-[9.5px] text-slate-400 border-t border-slate-100 pt-4 px-4">
                              {qrSheetShowWifi ? (
                                <div className="flex items-center gap-1">
                                  <Wifi className={`w-3.5 h-3.5 ${tStyles.accentColor}`} />
                                  <span className="font-medium text-slate-600">WiFi: <span className="font-bold text-slate-800">{qrSheetWifiName}</span> (Key: <span className="font-bold text-slate-800">{qrSheetWifiPass}</span>)</span>
                                </div>
                              ) : <span />}

                              {qrSheetShowPhone ? (
                                <div className="flex items-center gap-1">
                                  <Phone className={`w-3 h-3 ${tStyles.accentColor}`} />
                                  <span className="font-medium text-slate-600">ติดต่อร้าน: <span className="font-bold text-slate-800">{qrSheetPhone}</span></span>
                                </div>
                              ) : <span />}
                            </div>
                          </div>
                        ))
                      ) : (
                        // MULTIPLE CARDS PER PAGE (2x2 grid or 3x2 grid)
                        <div className={`grid ${qrSheetCardSize === 'medium' ? 'grid-cols-2 gap-4 h-full' : 'grid-cols-3 gap-3 h-full'}`}>
                          {chunk.map((tableNo) => (
                            <div
                              key={tableNo}
                              className={`border ${tStyles.cardBorderDashed} rounded-2xl p-4 flex flex-col justify-between items-center text-center relative overflow-hidden`}
                            >
                              {/* Small card top accent banner */}
                              <div className={`absolute top-0 inset-x-0 h-1.5 ${tStyles.bannerBg}`} />

                              {/* Title block */}
                              <div className="text-center space-y-0.5 mt-2 flex flex-col items-center">
                                {qrLogoStyle !== 'none' && (
                                  <div className="mb-0.5 scale-75">
                                    {renderQrLogo('sm')}
                                  </div>
                                )}
                                <h4 className={`font-black tracking-tight ${qrSheetCardSize === 'medium' ? 'text-[11.5px]' : 'text-[9.5px]'} ${tStyles.textPrimary}`}>
                                  {settings.storeName}
                                </h4>
                                <p className={`text-[8px] ${tStyles.textSecondary}`}>{qrSheetSubtitle}</p>
                              </div>

                              {/* QR Image */}
                              <div 
                                className="p-2 rounded-xl shadow-sm my-2 flex items-center justify-center relative border transition-all"
                                style={{
                                  borderColor: qrFrameUseCustomColor ? qrFrameCustomColor : undefined,
                                  borderWidth: qrFrameUseCustomColor ? (qrFrameThickness === 'thin' ? '1px' : qrFrameThickness === 'thick' ? '3px' : '2px') : undefined,
                                  backgroundColor: qrFrameUseCustomBgColor ? qrFrameBgColor : undefined,
                                }}
                              >
                                <img
                                  src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(`${window.location.origin}${window.location.pathname}?table=${tableNo}`)}`}
                                  alt={`QR Table ${tableNo}`}
                                  className={qrSheetCardSize === 'medium' ? 'w-24 h-24 object-contain' : 'w-18 h-18 object-contain'}
                                  referrerPolicy="no-referrer"
                                />
                                {qrLogoStyle !== 'none' && (
                                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                    <div className="p-0.5 bg-white rounded-lg shadow-sm border border-slate-100 scale-75">
                                      {renderQrLogo('sm')}
                                    </div>
                                  </div>
                                )}
                              </div>

                              {/* Table label */}
                              <div className="space-y-0.5">
                                <span className={`block text-[7.5px] font-black uppercase tracking-widest ${tStyles.textSecondary}`}>TABLE</span>
                                <span className={`font-black tracking-tight ${tStyles.textPrimary} ${qrSheetCardSize === 'medium' ? 'text-xl' : 'text-base'}`}>
                                  โต๊ะที่ {tableNo}
                                </span>
                              </div>

                              {/* Instructions brief summary */}
                              {qrSheetCardSize === 'medium' && qrSheetShowInstructions && (
                                <p className="text-[7.5px] text-slate-400 font-semibold leading-normal bg-slate-50 p-1 px-2 rounded border border-slate-100 max-w-[170px] mt-1">
                                  📸 สแกนคิวอาร์เพื่อเลือกเมนูอาหาร ส่งเข้าห้องครัว และอิ่มอร่อยทันที!
                                </p>
                              )}

                              {/* Mini details footer */}
                              <div className={`w-full flex items-center justify-between text-[7px] text-slate-400 border-t border-slate-100/60 pt-1.5 mt-1.5 px-1 ${qrSheetCardSize === 'small' ? 'hidden' : ''}`}>
                                {qrSheetShowWifi ? (
                                  <div className="flex items-center gap-0.5">
                                    <Wifi className={`w-2.5 h-2.5 ${tStyles.accentColor}`} />
                                    <span>WiFi: <span className="font-bold text-slate-700">{qrSheetWifiName}</span></span>
                                  </div>
                                ) : <span />}

                                {qrSheetShowPhone ? (
                                  <div className="flex items-center gap-0.5">
                                    <Phone className={`w-2 h-2 ${tStyles.accentColor}`} />
                                    <span>{qrSheetPhone}</span>
                                  </div>
                                ) : <span />}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
      })()}

      {/* Hidden container strictly for browser direct printing output (Ensures print styling works beautifully) */}
      {showQRPrintPreviewModal && (
        <div className="print-qr-modal hidden print:block bg-white text-black p-0 m-0">
          {(() => {
            const tStyles = getThemeStyles();
            const chunkSize = qrSheetCardSize === 'large' ? 1 : qrSheetCardSize === 'medium' ? 4 : 6;
            const chunkArray = <T,>(arr: T[], size: number): T[][] => {
              const chunks: T[][] = [];
              for (let i = 0; i < arr.length; i += size) {
                chunks.push(arr.slice(i, i + size));
              }
              return chunks;
            };
            const pageChunks = chunkArray(selectedTablesForQR, chunkSize);

            return pageChunks.map((chunk, pageIndex) => (
              <div
                key={`print-page-${pageIndex}`}
                style={{
                  width: '210mm', // standard A4 page width
                  height: '297mm', // standard A4 page height
                  padding: '15mm',
                  boxSizing: 'border-box',
                  pageBreakAfter: 'always',
                  backgroundColor: '#ffffff',
                }}
                className="mx-auto"
              >
                <div className="h-full flex flex-col justify-between">
                  {qrSheetCardSize === 'large' ? (
                    chunk.map((tableNo) => (
                      <div key={`print-large-${tableNo}`} className="h-full flex flex-col justify-between items-center p-8 border border-slate-200 rounded-3xl relative overflow-hidden" style={{ boxSizing: 'border-box' }}>
                        {/* Banner */}
                        <div className={`absolute top-0 inset-x-0 h-3 ${tStyles.bannerBg}`} />
                        
                        <div className="text-center space-y-2 mt-4 flex flex-col items-center">
                          {qrLogoStyle !== 'none' && (
                            <div className="mb-1">
                              {renderQrLogo('md')}
                            </div>
                          )}
                          <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${tStyles.tagBg}`}>
                            WELCOME TO
                          </span>
                          <h2 className={`text-2xl font-black tracking-tight ${tStyles.textPrimary}`}>{settings.storeName}</h2>
                          <p className={`text-xs ${tStyles.textSecondary}`}>{qrSheetSubtitle}</p>
                        </div>

                        <div 
                          className="p-5 rounded-3xl shadow-sm flex items-center justify-center relative border transition-all"
                          style={{
                            borderColor: qrFrameUseCustomColor ? qrFrameCustomColor : undefined,
                            borderWidth: qrFrameUseCustomColor ? (qrFrameThickness === 'thin' ? '1px' : qrFrameThickness === 'thick' ? '4px' : '2px') : undefined,
                            backgroundColor: qrFrameUseCustomBgColor ? qrFrameBgColor : undefined,
                          }}
                        >
                          <img
                            src={`https://api.qrserver.com/v1/create-qr-code/?size=260x260&data=${encodeURIComponent(`${window.location.origin}${window.location.pathname}?table=${tableNo}`)}`}
                            alt={`QR Table ${tableNo}`}
                            className="w-52 h-52 object-contain"
                            referrerPolicy="no-referrer"
                          />
                          {qrLogoStyle !== 'none' && (
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                              <div className="p-1.5 bg-white rounded-xl shadow-md border border-slate-100">
                                {renderQrLogo('sm')}
                              </div>
                            </div>
                          )}
                        </div>

                        <div className="text-center space-y-1">
                          <span className={`block text-[11px] font-black uppercase tracking-widest ${tStyles.textSecondary}`}>TABLE NUMBER</span>
                          <span className={`text-5xl font-black tracking-tight ${tStyles.textPrimary}`}>โต๊ะที่ {tableNo}</span>
                        </div>

                        {qrSheetShowInstructions && (
                          <div className={`w-full max-w-md bg-slate-50/50 p-4 rounded-2xl border ${tStyles.borderColor} text-left`}>
                            <span className={`block text-[10px] font-black uppercase tracking-widest ${tStyles.textSecondary} mb-2`}>📌 ขั้นตอนการสั่งอาหารง่ายๆ:</span>
                            <div className="space-y-1.5 text-[10.5px]">
                              <div className="flex items-center gap-2">
                                <span className={`w-4 h-4 rounded-full flex items-center justify-center font-bold text-[9.5px] ${tStyles.bulletColor}`}>1</span>
                                <span className="font-semibold text-slate-800">สแกนคิวอาร์โค้ดประจำโต๊ะด้วยกล้องมือถือ</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className={`w-4 h-4 rounded-full flex items-center justify-center font-bold text-[9.5px] ${tStyles.bulletColor}`}>2</span>
                                <span className="font-semibold text-slate-800">เลือกรายการอาหารสุดโปรดของคุณ และกดยืนยันออเดอร์</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className={`w-4 h-4 rounded-full flex items-center justify-center font-bold text-[9.5px] ${tStyles.bulletColor}`}>3</span>
                                <span className="font-semibold text-slate-800">รอรับประทานอาหารปรุงสุกใหม่ และชำระเงินที่เคาน์เตอร์เมื่ออิ่ม</span>
                              </div>
                            </div>
                          </div>
                        )}

                        <div className="w-full flex justify-between items-center text-[9.5px] text-slate-400 border-t border-slate-100 pt-4 px-4">
                          {qrSheetShowWifi ? (
                            <div className="flex items-center gap-1">
                              <Wifi className={`w-3.5 h-3.5 ${tStyles.accentColor}`} />
                              <span className="font-medium text-slate-600">WiFi: <span className="font-bold text-slate-800">{qrSheetWifiName}</span> (Key: <span className="font-bold text-slate-800">{qrSheetWifiPass}</span>)</span>
                            </div>
                          ) : <span />}

                          {qrSheetShowPhone ? (
                            <div className="flex items-center gap-1">
                              <Phone className={`w-3 h-3 ${tStyles.accentColor}`} />
                              <span className="font-medium text-slate-600">ติดต่อร้าน: <span className="font-bold text-slate-800">{qrSheetPhone}</span></span>
                            </div>
                          ) : <span />}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className={`grid ${qrSheetCardSize === 'medium' ? 'grid-cols-2 gap-6 h-full' : 'grid-cols-3 gap-4 h-full'}`}>
                      {chunk.map((tableNo) => (
                        <div
                          key={`print-small-${tableNo}`}
                          className={`border ${tStyles.cardBorderDashed} rounded-2xl p-5 flex flex-col justify-between items-center text-center relative overflow-hidden`}
                        >
                          <div className={`absolute top-0 inset-x-0 h-1.5 ${tStyles.bannerBg}`} />

                          <div className="text-center space-y-0.5 mt-2 flex flex-col items-center">
                            {qrLogoStyle !== 'none' && (
                              <div className="mb-0.5 scale-75">
                                {renderQrLogo('sm')}
                              </div>
                            )}
                            <h4 className={`font-black tracking-tight ${qrSheetCardSize === 'medium' ? 'text-[12px]' : 'text-[10px]'} ${tStyles.textPrimary}`}>
                              {settings.storeName}
                            </h4>
                            <p className={`text-[8.5px] ${tStyles.textSecondary}`}>{qrSheetSubtitle}</p>
                          </div>

                          <div 
                            className="p-2.5 rounded-xl shadow-sm my-2 flex items-center justify-center relative border transition-all"
                            style={{
                              borderColor: qrFrameUseCustomColor ? qrFrameCustomColor : undefined,
                              borderWidth: qrFrameUseCustomColor ? (qrFrameThickness === 'thin' ? '1px' : qrFrameThickness === 'thick' ? '3px' : '2px') : undefined,
                              backgroundColor: qrFrameUseCustomBgColor ? qrFrameBgColor : undefined,
                            }}
                          >
                            <img
                              src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(`${window.location.origin}${window.location.pathname}?table=${tableNo}`)}`}
                              alt={`QR Table ${tableNo}`}
                              className={qrSheetCardSize === 'medium' ? 'w-28 h-28 object-contain' : 'w-20 h-20 object-contain'}
                              referrerPolicy="no-referrer"
                            />
                            {qrLogoStyle !== 'none' && (
                              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                <div className="p-0.5 bg-white rounded-lg shadow-sm border border-slate-100 scale-75">
                                  {renderQrLogo('sm')}
                                </div>
                              </div>
                            )}
                          </div>

                          <div className="space-y-0.5">
                            <span className={`block text-[8px] font-black uppercase tracking-widest ${tStyles.textSecondary}`}>TABLE</span>
                            <span className={`font-black tracking-tight ${tStyles.textPrimary} ${qrSheetCardSize === 'medium' ? 'text-2xl' : 'text-lg'}`}>
                              โต๊ะที่ {tableNo}
                            </span>
                          </div>

                          {qrSheetCardSize === 'medium' && qrSheetShowInstructions && (
                            <p className="text-[8px] text-slate-400 font-semibold leading-normal bg-slate-50 p-1 px-2.5 rounded border border-slate-100 max-w-[170px] mt-1">
                              📸 สแกนคิวอาร์เพื่อเลือกเมนูอาหาร ส่งเข้าห้องครัว และอิ่มอร่อยทันที!
                            </p>
                          )}

                          <div className={`w-full flex items-center justify-between text-[7.5px] text-slate-400 border-t border-slate-100/60 pt-1.5 mt-1.5 px-1 ${qrSheetCardSize === 'small' ? 'hidden' : ''}`}>
                            {qrSheetShowWifi ? (
                              <div className="flex items-center gap-0.5">
                                <Wifi className={`w-2.5 h-2.5 ${tStyles.accentColor}`} />
                                <span>WiFi: <span className="font-bold text-slate-700">{qrSheetWifiName}</span></span>
                              </div>
                            ) : <span />}

                            {qrSheetShowPhone ? (
                              <div className="flex items-center gap-0.5">
                                <Phone className={`w-2 h-2 ${tStyles.accentColor}`} />
                                <span>{qrSheetPhone}</span>
                              </div>
                            ) : <span />}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ));
          })()}
        </div>
      )}
    </div>
  );
}
