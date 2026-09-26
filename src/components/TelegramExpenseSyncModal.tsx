import React, { useState, useEffect } from 'react';
import { Expense, NotificationSettings, TelegramExpenseMessage } from '../types';
import { 
  Bot, RefreshCw, Send, Check, Trash2, Edit3, Image, 
  Sparkles, ExternalLink, QrCode, AlertCircle, CheckCircle2,
  Clock, ArrowRight, ShieldCheck, Upload, X, Eye, FileText,
  DollarSign, ChevronDown, CheckCheck, Activity, Terminal,
  HelpCircle, Wrench, Zap, Info, Play, MessageSquare, AlertTriangle
} from 'lucide-react';
import { 
  fetchTelegramExpenseUpdates, verifyTelegramBot, replyExpenseSuccess,
  getTelegramExpenseQueue, saveTelegramExpenseQueue, generateMockTelegramMessages,
  getCategoryThaiName, parseThaiExpenseMessage, TelegramBotInfo,
  runTelegramDiagnostics, deleteTelegramWebhook, sendTelegramTestPing, TelegramDiagnosticsResult
} from '../utils/telegramExpenseSync';

interface TelegramExpenseSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddExpense: (newExpense: Expense) => void;
  notificationSettings?: NotificationSettings;
  onUpdateNotificationSettings?: (updated: NotificationSettings) => void;
  currency?: string;
  activeBranchId?: string;
}

export default function TelegramExpenseSyncModal({
  isOpen,
  onClose,
  onAddExpense,
  notificationSettings,
  onUpdateNotificationSettings,
  currency = '฿',
  activeBranchId = 'b1'
}: TelegramExpenseSyncModalProps) {
  // Telegram Bot Token
  const [token, setToken] = useState<string>(() => {
    return notificationSettings?.telegramToken || localStorage.getItem('kp_telegram_bot_token') || '';
  });
  const [chatId, setChatId] = useState<string>(() => {
    return notificationSettings?.telegramChatId || localStorage.getItem('kp_telegram_chat_id') || '';
  });

  const [botInfo, setBotInfo] = useState<TelegramBotInfo | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifyStatus, setVerifyStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [verifyError, setVerifyError] = useState<string>('');

  // Queue of messages/slips from Telegram
  const [queue, setQueue] = useState<TelegramExpenseMessage[]>(() => {
    const saved = getTelegramExpenseQueue();
    if (saved && saved.length > 0) return saved;
    // Pre-populate with realistic demo slips so the user immediately sees working data
    const initialMocks = generateMockTelegramMessages();
    saveTelegramExpenseQueue(initialMocks);
    return initialMocks;
  });

  // Fetching state
  const [isFetching, setIsFetching] = useState(false);
  const [fetchNotification, setFetchNotification] = useState<{ type: 'success' | 'info' | 'error'; message: string } | null>(null);

  // Filter & tab in modal
  const [filterTab, setFilterTab] = useState<'ALL' | 'PENDING' | 'IMPORTED'>('PENDING');

  // Preview slip modal
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);

  // Edit item state
  const [editingItem, setEditingItem] = useState<TelegramExpenseMessage | null>(null);

  // Show direct QR / Guide
  const [showGuide, setShowGuide] = useState(false);

  // Manual slip upload test
  const [directSlipImage, setDirectSlipImage] = useState<string | null>(null);
  const [directSlipNote, setDirectSlipNote] = useState('');

  // Diagnostic & Inspection States
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const [diagnostics, setDiagnostics] = useState<TelegramDiagnosticsResult | null>(null);
  const [isRunningDiag, setIsRunningDiag] = useState(false);
  const [isDeletingWebhook, setIsDeletingWebhook] = useState(false);
  const [isSendingPing, setIsSendingPing] = useState(false);
  const [testChatId, setTestChatId] = useState<string>(() => {
    return notificationSettings?.telegramChatId || localStorage.getItem('kp_telegram_chat_id') || '';
  });
  const [testPingResult, setTestPingResult] = useState<{ success: boolean; message: string } | null>(null);

  // Sync token from notificationSettings if updated
  useEffect(() => {
    if (notificationSettings?.telegramToken && !token) {
      setToken(notificationSettings.telegramToken);
    }
  }, [notificationSettings]);

  // Save token locally
  useEffect(() => {
    if (token) {
      localStorage.setItem('kp_telegram_bot_token', token);
    }
  }, [token]);

  // Sync queue to local storage
  useEffect(() => {
    saveTelegramExpenseQueue(queue);
  }, [queue]);

  // Verify bot when token is available
  useEffect(() => {
    if (token && token.trim().length > 20 && !botInfo) {
      handleVerifyBot(false);
    }
  }, [token]);

  const handleVerifyBot = async (showSuccessMsg = true) => {
    if (!token.trim()) {
      setVerifyError('กรุณากรอก Telegram Bot Token');
      setVerifyStatus('error');
      return;
    }

    setIsVerifying(true);
    setVerifyError('');

    const res = await verifyTelegramBot(token);
    setIsVerifying(false);

    if (res.success && res.botInfo) {
      setBotInfo(res.botInfo);
      setVerifyStatus('success');
      if (onUpdateNotificationSettings && notificationSettings) {
        onUpdateNotificationSettings({
          ...notificationSettings,
          telegramToken: token.trim(),
          telegramBotUsername: res.botInfo.username
        });
      }
      if (showSuccessMsg) {
        setFetchNotification({
          type: 'success',
          message: `เชื่อมต่อกับบอท @${res.botInfo.username} สำเร็จเรียบร้อย!`
        });
      }
    } else {
      setVerifyStatus('error');
      setVerifyError(res.error || 'ไม่สามารถเชื่อมต่อกับบอทได้ กรุณาตรวจสอบ Token');
    }
  };

  // Fetch real updates from Telegram
  const handleFetchUpdates = async () => {
    if (!token.trim()) {
      setFetchNotification({
        type: 'error',
        message: 'กรุณากรอก Telegram Bot Token ก่อนทำการดึงข้อมูล'
      });
      return;
    }

    setIsFetching(true);
    setFetchNotification(null);

    // Get highest updateId currently in queue
    const highestUpdateId = queue.reduce((max, item) => Math.max(max, item.updateId || 0), 0);

    const res = await fetchTelegramExpenseUpdates(token, highestUpdateId);
    setIsFetching(false);

    if (res.success) {
      if (res.messages.length === 0) {
        setFetchNotification({
          type: 'info',
          message: 'ดึงข้อมูลสำเร็จ: ยังไม่มีข้อความหรือสลิปใหม่ส่งเข้ามาในแชทบอท'
        });
      } else {
        // Merge without duplicates
        const existingIds = new Set(queue.map(q => q.id));
        const newItems = res.messages.filter(m => !existingIds.has(m.id));

        setQueue(prev => [...newItems, ...prev]);
        setFetchNotification({
          type: 'success',
          message: `ดึงข้อมูลใหม่สำเร็จ! พบสลิป/ข้อความค่าใช้จ่าย ${newItems.length} รายการ`
        });
      }
    } else {
      setFetchNotification({
        type: 'error',
        message: res.error || 'เกิดข้อผิดพลาดในการดึงข้อมูลจาก Telegram'
      });
    }
  };

  // Add realistic simulated Telegram slips/messages
  const handleAddSimulatedMessages = () => {
    const mocks = generateMockTelegramMessages();
    setQueue(prev => [...mocks, ...prev]);
    setFetchNotification({
      type: 'success',
      message: 'สร้างสลิปและข้อความจำลองจาก Telegram 4 รายการสำเร็จ!'
    });
  };

  // Run Telegram Diagnostics
  const handleRunDiagnostics = async () => {
    if (!token.trim()) {
      setVerifyError('กรุณากรอก Telegram Bot Token ก่อนทำการตรวจสอบ');
      setVerifyStatus('error');
      setShowDiagnostics(true);
      return;
    }

    setIsRunningDiag(true);
    setShowDiagnostics(true);
    setTestPingResult(null);

    const result = await runTelegramDiagnostics(token);
    setDiagnostics(result);
    setIsRunningDiag(false);

    if (result.botInfo) {
      setBotInfo(result.botInfo);
      setVerifyStatus('success');
      if (onUpdateNotificationSettings && notificationSettings) {
        onUpdateNotificationSettings({
          ...notificationSettings,
          telegramToken: token.trim(),
          telegramBotUsername: result.botInfo.username
        });
      }
    } else if (result.error) {
      setVerifyStatus('error');
      setVerifyError(result.error);
    }
  };

  // Delete active webhook if conflict detected
  const handleDeleteWebhook = async () => {
    if (!token.trim()) return;
    setIsDeletingWebhook(true);
    const res = await deleteTelegramWebhook(token);
    setIsDeletingWebhook(false);

    if (res.success) {
      setFetchNotification({ type: 'success', message: res.message });
      // Re-run diagnostics to refresh info
      const result = await runTelegramDiagnostics(token);
      setDiagnostics(result);
    } else {
      setFetchNotification({ type: 'error', message: res.message });
    }
  };

  // Send a test ping message to Telegram
  const handleSendTestPing = async () => {
    if (!token.trim()) {
      setTestPingResult({ success: false, message: 'กรุณากรอก Bot Token' });
      return;
    }
    if (!testChatId.trim()) {
      setTestPingResult({
        success: false,
        message: 'กรุณากรอก Chat ID เช่น 123456789 (สามารถดูได้จากการทักหา @userinfobot ใน Telegram)'
      });
      return;
    }

    setIsSendingPing(true);
    setTestPingResult(null);

    // Save testChatId to storage & settings
    localStorage.setItem('kp_telegram_chat_id', testChatId.trim());
    if (onUpdateNotificationSettings && notificationSettings) {
      onUpdateNotificationSettings({
        ...notificationSettings,
        telegramChatId: testChatId.trim()
      });
    }

    const res = await sendTelegramTestPing(token, testChatId.trim());
    setIsSendingPing(false);
    setTestPingResult(res);
  };

  // Import single Telegram message into Expenses
  const handleImportExpense = async (item: TelegramExpenseMessage) => {
    const expenseId = `exp-tg-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const newExpense: Expense = {
      id: expenseId,
      category: item.parsedCategory,
      amount: item.parsedAmount || 0,
      description: item.parsedDescription || item.rawText || 'ค่าใช้จ่ายจาก Telegram',
      date: item.date || new Date().toISOString().split('T')[0],
      branchId: activeBranchId,
      vatType: 'NO_VAT',
      vatAmount: 0,
      slipUrl: item.photoUrl,
      source: 'TELEGRAM',
      telegramMessageId: item.messageId,
      telegramSender: item.senderName,
      refNo: `TG-${item.messageId}`
    };

    // Call addExpense to central state
    onAddExpense(newExpense);

    // Update queue status
    setQueue(prev => prev.map(q => {
      if (q.id === item.id) {
        return {
          ...q,
          status: 'IMPORTED',
          importedExpenseId: expenseId
        };
      }
      return q;
    }));

    // Send confirmation back to Telegram if token & chatId present
    const targetChatId = item.chatId || chatId;
    if (token && targetChatId) {
      replyExpenseSuccess(
        token,
        targetChatId,
        newExpense.description,
        newExpense.amount,
        newExpense.category,
        currency
      ).catch(() => {});
    }

    setFetchNotification({
      type: 'success',
      message: `นำเข้าค่าใช้จ่าย "${newExpense.description}" จำนวน ฿${newExpense.amount.toLocaleString()} สำเร็จ!`
    });
  };

  // Batch import all pending
  const handleImportAllPending = () => {
    const pendingList = queue.filter(q => q.status === 'PENDING' && q.parsedAmount > 0);
    if (pendingList.length === 0) {
      alert('ไม่มีรายการที่รอนำเข้าหรือมียอดเงินที่ถูกต้อง');
      return;
    }

    pendingList.forEach(item => {
      const expenseId = `exp-tg-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
      const newExpense: Expense = {
        id: expenseId,
        category: item.parsedCategory,
        amount: item.parsedAmount,
        description: item.parsedDescription || item.rawText || 'ค่าใช้จ่ายจาก Telegram',
        date: item.date || new Date().toISOString().split('T')[0],
        branchId: activeBranchId,
        vatType: 'NO_VAT',
        vatAmount: 0,
        slipUrl: item.photoUrl,
        source: 'TELEGRAM',
        telegramMessageId: item.messageId,
        telegramSender: item.senderName,
        refNo: `TG-${item.messageId}`
      };
      onAddExpense(newExpense);
    });

    setQueue(prev => prev.map(q => {
      if (q.status === 'PENDING' && q.parsedAmount > 0) {
        return { ...q, status: 'IMPORTED' };
      }
      return q;
    }));

    setFetchNotification({
      type: 'success',
      message: `นำเข้ารายการค่าใช้จ่ายทั้งหมด ${pendingList.length} รายการสำเร็จเรียบร้อย!`
    });
  };

  // Dismiss item from queue
  const handleDismissItem = (id: string) => {
    setQueue(prev => prev.filter(q => q.id !== id));
  };

  // Save edited item
  const handleSaveEditItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;

    setQueue(prev => prev.map(q => {
      if (q.id === editingItem.id) {
        return editingItem;
      }
      return q;
    }));

    setEditingItem(null);
  };

  // Handle direct manual slip upload
  const handleDirectSlipSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!directSlipImage) {
      alert('กรุณาเลือกรูปภาพสลิป');
      return;
    }

    const parsed = parseThaiExpenseMessage(directSlipNote, '', directSlipImage);
    const mockId = `tg-manual-${Date.now()}`;
    const newMsg: TelegramExpenseMessage = {
      id: mockId,
      updateId: 99999,
      messageId: Math.floor(Math.random() * 8000) + 1000,
      chatId: 'web-direct',
      senderName: 'ผู้อัปโหลดหน้าเว็บ (Direct Upload)',
      date: new Date().toISOString().split('T')[0],
      caption: directSlipNote || 'สลิปค่าใช้จ่ายอัปโหลดตรง',
      photoUrl: directSlipImage,
      parsedAmount: parsed.amount || 0,
      parsedCategory: parsed.category,
      parsedDescription: parsed.description || 'สลิปค่าใช้จ่ายอัปโหลดตรง',
      status: 'PENDING',
      receivedAt: new Date().toISOString()
    };

    setQueue(prev => [newMsg, ...prev]);
    setDirectSlipImage(null);
    setDirectSlipNote('');
    setFetchNotification({
      type: 'success',
      message: 'อัปโหลดและวิเคราะห์สลิปสำเร็จ! เพิ่มเข้ารายการรอตรวจสอบแล้ว'
    });
  };

  if (!isOpen) return null;

  const pendingCount = queue.filter(q => q.status === 'PENDING').length;
  const importedCount = queue.filter(q => q.status === 'IMPORTED').length;

  const filteredQueue = queue.filter(item => {
    if (filterTab === 'PENDING') return item.status === 'PENDING';
    if (filterTab === 'IMPORTED') return item.status === 'IMPORTED';
    return true;
  });

  const botUsername = botInfo?.username || notificationSettings?.telegramBotUsername || '';
  const botLink = botUsername ? `https://t.me/${botUsername}` : '';

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-fadeIn">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        
        {/* Header Bar */}
        <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950/40 p-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shadow-inner">
              <Bot className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black text-white tracking-wide">
                  ดึงสลิป & ค่าใช้จ่ายจาก Telegram
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                  Bot Sync
                </span>
              </div>
              <p className="text-xs text-slate-400">
                ส่งสลิปโอนเงินหรือพิมพ์รายการใน Telegram บอทจะดึงเข้าบัญชีค่าใช้จ่ายอัตโนมัติ
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setShowDiagnostics(prev => !prev);
                if (!diagnostics && !isRunningDiag) {
                  handleRunDiagnostics();
                }
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all flex items-center gap-1.5 cursor-pointer ${
                showDiagnostics 
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow' 
                  : 'bg-slate-800 hover:bg-slate-750 text-slate-300 border-slate-700'
              }`}
            >
              <Activity className="w-3.5 h-3.5 text-amber-400" />
              <span>{showDiagnostics ? 'ซ่อนเครื่องมือตรวจบอท' : '🛠️ ตรวจสอบ & วินิจฉัยบอท'}</span>
            </button>
            <button
              onClick={() => setShowGuide(prev => !prev)}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-750 text-slate-300 rounded-xl text-xs font-semibold border border-slate-700 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <FileText className="w-3.5 h-3.5 text-indigo-400" />
              <span>{showGuide ? 'ซ่อนวิธีใช้งาน' : 'วิธีใช้งาน'}</span>
            </button>
            <button
              onClick={onClose}
              className="w-9 h-9 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-400 hover:text-white flex items-center justify-center transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          
          {/* Instructions Guide Collapsible */}
          {showGuide && (
            <div className="bg-gradient-to-br from-indigo-950/40 via-slate-900 to-slate-950 border border-indigo-900/40 rounded-2xl p-5 space-y-4 shadow-lg animate-fadeIn">
              <div className="flex items-center justify-between border-b border-indigo-900/30 pb-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-indigo-400" />
                  <h4 className="text-sm font-bold text-white">4 ขั้นตอนง่ายๆ ในการส่งสลิปผ่าน Telegram</h4>
                </div>
                <span className="text-[11px] text-indigo-400 font-mono">Setup Guide</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
                <div className="bg-slate-950/70 p-3.5 rounded-xl border border-slate-800 space-y-1">
                  <div className="w-6 h-6 rounded-full bg-indigo-600/30 text-indigo-400 font-black flex items-center justify-center text-xs mb-1">
                    1
                  </div>
                  <p className="font-bold text-slate-200">สร้างบอทผ่าน @BotFather</p>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    เปิด Telegram ค้นหา <span className="text-indigo-400 font-mono">@BotFather</span> พิมพ์ <code className="bg-slate-800 px-1 py-0.5 rounded text-amber-300 font-mono">/newbot</code> แล้วคัดลอก Bot Token
                  </p>
                </div>

                <div className="bg-slate-950/70 p-3.5 rounded-xl border border-slate-800 space-y-1">
                  <div className="w-6 h-6 rounded-full bg-indigo-600/30 text-indigo-400 font-black flex items-center justify-center text-xs mb-1">
                    2
                  </div>
                  <p className="font-bold text-slate-200">ใส่ Bot Token & เชื่อมต่อ</p>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    นำ Token มากรอกในช่องตั้งค่าบอทด้านล่างแล้วกด "เชื่อมต่อ/ตรวจสอบบอท" เพื่อผูกระบบ
                  </p>
                </div>

                <div className="bg-slate-950/70 p-3.5 rounded-xl border border-slate-800 space-y-1">
                  <div className="w-6 h-6 rounded-full bg-indigo-600/30 text-indigo-400 font-black flex items-center justify-center text-xs mb-1">
                    3
                  </div>
                  <p className="font-bold text-slate-200">ส่งสลิปหรือพิมพ์ค่าใช้จ่าย</p>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    เปิดแชทกับบอท ส่งรูปสลิป หรือพิมพ์ เช่น: <span className="text-emerald-400">"ซื้อหมู 850"</span>, <span className="text-emerald-400">"ค่าไฟ 2450"</span>
                  </p>
                </div>

                <div className="bg-slate-950/70 p-3.5 rounded-xl border border-slate-800 space-y-1">
                  <div className="w-6 h-6 rounded-full bg-indigo-600/30 text-indigo-400 font-black flex items-center justify-center text-xs mb-1">
                    4
                  </div>
                  <p className="font-bold text-slate-200">ดึงข้อมูล & บันทึกค่าใช้จ่าย</p>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    กดปุ่ม "ดึงข้อมูลจาก Telegram" ข้อมูลจะถูกจัดหมวดหมู่อัตโนมัติ พร้อมกดยืนยันลงบัญชีทันที
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Bot Connection Card */}
          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 shadow space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className={`w-3 h-3 rounded-full ${botInfo ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
                <div>
                  <span className="text-xs font-bold text-slate-200 block">
                    สถานะบอท: {botInfo ? `เชื่อมต่อแล้ว (@${botInfo.username})` : 'ระบุ Token เพื่อเชื่อมต่อ'}
                  </span>
                  <span className="text-[10px] text-slate-500">
                    {botInfo ? `Bot Name: ${botInfo.first_name} • ID: ${botInfo.id}` : 'สามารถกด "จำลองข้อมูล" เพื่อทดสอบการทำงานได้ทันที'}
                  </span>
                </div>
              </div>

              {botLink && (
                <div className="flex items-center gap-2">
                  <a
                    href={botLink}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold shadow flex items-center gap-1.5 transition-all"
                  >
                    <Send className="w-3 h-3" />
                    <span>เปิดแชทใน Telegram</span>
                    <ExternalLink className="w-3 h-3 ml-0.5 opacity-70" />
                  </a>
                </div>
              )}
            </div>

            {/* Token input row */}
            <div className="flex flex-col sm:flex-row gap-2 pt-1 border-t border-slate-850">
              <div className="flex-1 relative">
                <input
                  type="password"
                  placeholder="กรอก Telegram Bot Token (เช่น 5841299923:AAFlqZ4_example...)"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-850 focus:border-indigo-500 text-white text-xs rounded-xl px-3 py-2.5 font-mono focus:outline-none"
                />
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => handleVerifyBot(true)}
                  disabled={isVerifying}
                  className="px-3.5 py-2.5 bg-slate-800 hover:bg-slate-750 text-slate-200 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 whitespace-nowrap"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isVerifying ? 'animate-spin' : ''}`} />
                  <span>{isVerifying ? 'กำลังตรวจสอบ...' : 'ตรวจสอบบอท'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleRunDiagnostics}
                  disabled={isRunningDiag}
                  className="px-3.5 py-2.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 whitespace-nowrap"
                  title="ตรวจสอบเชิงลึก เช็ค Webhook ความเร็ว และตรวจข้อความค้าง"
                >
                  <Activity className={`w-3.5 h-3.5 ${isRunningDiag ? 'animate-spin' : ''}`} />
                  <span>{isRunningDiag ? 'กำลังตรวจ...' : '🛠️ วินิจฉัยบอท'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleFetchUpdates}
                  disabled={isFetching}
                  className="px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-teal-600 hover:from-indigo-500 hover:to-teal-500 text-white rounded-xl text-xs font-bold shadow-md transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 whitespace-nowrap"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin' : ''}`} />
                  <span>{isFetching ? 'กำลังดึง...' : '🔄 ดึงข้อมูลจาก Telegram'}</span>
                </button>
              </div>
            </div>

            {verifyStatus === 'error' && (
              <p className="text-[11px] text-red-400 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                {verifyError}
              </p>
            )}
          </div>

          {/* Diagnostic & Inspector Panel Collapsible */}
          {showDiagnostics && (
            <div className="bg-slate-950/95 border border-amber-500/30 rounded-2xl p-5 space-y-4 shadow-xl animate-fadeIn">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center">
                    <Activity className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white flex items-center gap-2">
                      เครื่องมือตรวจสอบ & วินิจฉัย Telegram Bot (Bot Inspector)
                      {isRunningDiag && (
                        <span className="text-[10px] text-amber-400 font-mono animate-pulse">
                          [กำลังทดสอบ API...]
                        </span>
                      )}
                    </h4>
                    <p className="text-[11px] text-slate-400">
                      ตรวจเช็คการเชื่อมต่อ Latency, ตรวจสอบ Webhook ค้าง และทดสอบส่งข้อความหาบอท
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleRunDiagnostics}
                    disabled={isRunningDiag}
                    className="px-3 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 rounded-lg text-xs font-semibold border border-amber-500/30 transition-all flex items-center gap-1 cursor-pointer"
                  >
                    <RefreshCw className={`w-3 h-3 ${isRunningDiag ? 'animate-spin' : ''}`} />
                    <span>ตรวจซ้ำ</span>
                  </button>
                  <button
                    onClick={() => setShowDiagnostics(false)}
                    className="text-slate-400 hover:text-white p-1"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Status summary grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                {/* 1. Latency */}
                <div className="bg-slate-900/90 p-3 rounded-xl border border-slate-800 space-y-1">
                  <span className="text-[10px] font-semibold text-slate-400 flex items-center gap-1">
                    <Zap className="w-3 h-3 text-amber-400" />
                    Telegram API Latency
                  </span>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-lg font-black text-white">
                      {diagnostics ? `${diagnostics.latencyMs} ms` : '-'}
                    </span>
                    {diagnostics && (
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                        diagnostics.latencyMs < 500 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'
                      }`}>
                        {diagnostics.latencyMs < 500 ? 'เสถียรมาก' : 'ปานกลาง'}
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] text-slate-500 block">
                    {diagnostics?.ok ? 'Telegram Server ตอบกลับปกติ' : 'ยังไม่ได้เชื่อมต่อ'}
                  </span>
                </div>

                {/* 2. Bot Profile */}
                <div className="bg-slate-900/90 p-3 rounded-xl border border-slate-800 space-y-1">
                  <span className="text-[10px] font-semibold text-slate-400 flex items-center gap-1">
                    <Bot className="w-3 h-3 text-indigo-400" />
                    บัญชีบอทที่เชื่อมต่อ
                  </span>
                  <p className="text-sm font-bold text-white truncate">
                    {diagnostics?.botInfo?.username ? `@${diagnostics.botInfo.username}` : (botInfo?.username ? `@${botInfo.username}` : 'ยังไม่ระบุ')}
                  </p>
                  <span className="text-[10px] text-slate-500 block truncate">
                    {diagnostics?.botInfo?.first_name || 'ชื่อบอท'} • ID: {diagnostics?.botInfo?.id || '-'}
                  </span>
                </div>

                {/* 3. Webhook Status */}
                <div className="bg-slate-900/90 p-3 rounded-xl border border-slate-800 space-y-1">
                  <span className="text-[10px] font-semibold text-slate-400 flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3 text-teal-400" />
                    สถานะ Webhook
                  </span>
                  <div>
                    {diagnostics?.hasWebhookConflict ? (
                      <span className="text-xs font-bold text-red-400 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3 shrink-0" />
                        มี Webhook ค้างอยู่!
                      </span>
                    ) : (
                      <span className="text-xs font-bold text-emerald-400 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 shrink-0" />
                        ไม่มี Webhook (ปกติ)
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] text-slate-500 block">
                    {diagnostics?.hasWebhookConflict ? 'ทำให้ดึงข้อมูลผ่าน getUpdates ไม่ได้' : 'สามารถดึงข้อมูล getUpdates ได้'}
                  </span>
                </div>

                {/* 4. Pending updates */}
                <div className="bg-slate-900/90 p-3 rounded-xl border border-slate-800 space-y-1">
                  <span className="text-[10px] font-semibold text-slate-400 flex items-center gap-1">
                    <MessageSquare className="w-3 h-3 text-blue-400" />
                    ข้อความค้างใน Telegram
                  </span>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-lg font-black text-white">
                      {diagnostics?.pendingUpdatesCount !== undefined ? diagnostics.pendingUpdatesCount : '-'}
                    </span>
                    <span className="text-xs text-slate-400">รายการ</span>
                  </div>
                  <span className="text-[10px] text-slate-500 block">
                    {diagnostics?.pendingUpdatesCount && diagnostics.pendingUpdatesCount > 0 ? 'กดดึงข้อมูลเพื่อนำเข้าได้ทันที' : 'ไม่มีข้อความใหม่ค้างอยู่'}
                  </span>
                </div>
              </div>

              {/* Webhook Warning and Clear Button */}
              {diagnostics?.hasWebhookConflict && (
                <div className="p-3 bg-red-950/40 border border-red-800/60 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  <div className="space-y-1">
                    <p className="font-bold text-red-300 flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                      ตรวจพบบอทเปิดใช้งาน Webhook ไปที่:
                    </p>
                    <code className="text-[11px] text-red-200 bg-red-900/30 px-2 py-0.5 rounded font-mono break-all block">
                      {diagnostics.webhookInfo?.url}
                    </code>
                    <p className="text-[11px] text-slate-400">
                      Telegram จะระงับการทำงานของปุ่ม "ดึงข้อมูลจาก Telegram" ทันทีหากมี Webhook ค้างอยู่ กรุณากดปลด Webhook เพื่อใช้งาน
                    </p>
                  </div>

                  <button
                    onClick={handleDeleteWebhook}
                    disabled={isDeletingWebhook}
                    className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl font-bold text-xs shadow transition-all cursor-pointer whitespace-nowrap self-start sm:self-center"
                  >
                    {isDeletingWebhook ? 'กำลังปลด...' : '🔓 ปลด Webhook เดี๋ยวนี้'}
                  </button>
                </div>
              )}

              {/* Diagnostic Recommendations */}
              {diagnostics?.recommendations && diagnostics.recommendations.length > 0 && (
                <div className="bg-slate-900/70 p-3.5 rounded-xl border border-slate-800 space-y-2">
                  <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                    <Info className="w-3.5 h-3.5 text-amber-400" />
                    ผลการวิเคราะห์ & ข้อเสนอแนะจากระบบ:
                  </span>
                  <ul className="space-y-1.5 text-xs text-slate-300">
                    {diagnostics.recommendations.map((rec, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="text-amber-400 font-bold shrink-0">•</span>
                        <span>{rec}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Recent Messages Preview if any */}
              {diagnostics?.recentMessagesPreview && diagnostics.recentMessagesPreview.length > 0 && (
                <div className="bg-slate-900/70 p-3.5 rounded-xl border border-slate-800 space-y-2">
                  <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                    <Terminal className="w-3.5 h-3.5 text-indigo-400" />
                    ข้อความล่าสุดที่ตรวจพบใน Telegram Server:
                  </span>
                  <div className="space-y-1.5">
                    {diagnostics.recentMessagesPreview.map((msg) => (
                      <div key={msg.id} className="bg-slate-950 p-2.5 rounded-lg border border-slate-800/80 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded bg-indigo-950 text-indigo-300 font-mono text-[10px]">
                            {msg.sender}
                          </span>
                          <span className="text-slate-200 truncate max-w-xs sm:max-w-md">
                            {msg.text}
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-500 shrink-0 font-mono">
                          {msg.date}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Direct Test Message Sender (Ping Test) */}
              <div className="bg-gradient-to-r from-slate-900 to-indigo-950/30 p-4 rounded-xl border border-indigo-900/40 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Send className="w-3.5 h-3.5 text-indigo-400" />
                    ทดสอบส่งข้อความจากบอทเข้า Telegram (Test Ping)
                  </span>
                  <span className="text-[10px] text-slate-400">
                    ทดสอบว่าบอทสามารถส่งข้อความถึงคุณได้หรือไม่
                  </span>
                </div>

                <div className="flex flex-col sm:flex-row gap-2">
                  <div className="flex-1 relative">
                    <input
                      type="text"
                      placeholder="กรอก Chat ID ของคุณ (เช่น 123456789)"
                      value={testChatId}
                      onChange={(e) => setTestChatId(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 text-white text-xs rounded-xl px-3 py-2 font-mono focus:outline-none"
                    />
                  </div>
                  <button
                    onClick={handleSendTestPing}
                    disabled={isSendingPing}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold shadow transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 whitespace-nowrap"
                  >
                    <Send className={`w-3.5 h-3.5 ${isSendingPing ? 'animate-pulse' : ''}`} />
                    <span>{isSendingPing ? 'กำลังส่ง...' : 'ส่งข้อความทดสอบ'}</span>
                  </button>
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                  <span>💡 <b>วิธีหา Chat ID:</b> ใน Telegram ให้ค้นหา <a href="https://t.me/userinfobot" target="_blank" rel="noreferrer" className="text-indigo-400 underline font-mono">@userinfobot</a> แล้วกด Start จะได้ตัวเลข Id ทันที</span>
                </div>

                {testPingResult && (
                  <div className={`p-2.5 rounded-lg border text-xs flex items-center gap-2 ${
                    testPingResult.success ? 'bg-emerald-950/40 border-emerald-800 text-emerald-300' : 'bg-red-950/40 border-red-800 text-red-300'
                  }`}>
                    {testPingResult.success ? <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" /> : <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />}
                    <span>{testPingResult.message}</span>
                  </div>
                )}
              </div>

              {/* Troubleshooting Checklist */}
              <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-800 text-xs space-y-2">
                <p className="font-bold text-slate-200 flex items-center gap-1.5">
                  <HelpCircle className="w-3.5 h-3.5 text-indigo-400" />
                  เช็คลิสต์ตรวจสอบเมื่อบอทไม่ดึงข้อมูล (Troubleshooting Checklist):
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-slate-400">
                  <div className="flex items-start gap-1.5">
                    <span className="text-indigo-400 font-bold">1.</span>
                    <span>ส่งหาถูกบอทหรือไม่: ต้องส่งหาบอทที่คุณสร้าง <b className="text-white">(@{botUsername || 'ชื่อบอท'})</b> ไม่ใช่ @BotFather</span>
                  </div>
                  <div className="flex items-start gap-1.5">
                    <span className="text-indigo-400 font-bold">2.</span>
                    <span>กด Start หรือยัง: เปิดแชทกับบอทแล้วต้องกดปุ่ม <b className="text-white">Start</b> ด้านล่างอย่างน้อย 1 ครั้ง</span>
                  </div>
                  <div className="flex items-start gap-1.5">
                    <span className="text-indigo-400 font-bold">3.</span>
                    <span>ถ้าใช้ในกลุ่ม: หากดึงบอทเข้ากลุ่มร้าน ให้ไปที่ @BotFather พิมพ์ /setprivacy แล้วเลือก Disable เพื่อให้บอทอ่านข้อความในกลุ่มได้</span>
                  </div>
                  <div className="flex items-start gap-1.5">
                    <span className="text-indigo-400 font-bold">4.</span>
                    <span>ทดสอบผ่านเบราว์เซอร์: ลองเปิด <code className="text-indigo-300 bg-slate-950 px-1 py-0.5 rounded">https://api.telegram.org/bot{token ? `${token.substring(0, 10)}...` : '<TOKEN>'}/getMe</code></span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Quick Action Notification Banner */}
          {fetchNotification && (
            <div className={`p-3 rounded-xl border text-xs flex items-center justify-between ${
              fetchNotification.type === 'success' ? 'bg-emerald-950/40 border-emerald-900/50 text-emerald-300' :
              fetchNotification.type === 'error' ? 'bg-red-950/40 border-red-900/50 text-red-300' :
              'bg-blue-950/40 border-blue-900/50 text-blue-300'
            }`}>
              <div className="flex items-center gap-2">
                {fetchNotification.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <AlertCircle className="w-4 h-4" />}
                <span>{fetchNotification.message}</span>
              </div>
              <button onClick={() => setFetchNotification(null)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Control Bar: Filter Tabs & Batch Import */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
            <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-850">
              <button
                onClick={() => setFilterTab('PENDING')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  filterTab === 'PENDING'
                    ? 'bg-indigo-600 text-white shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <span>รอนำเข้า</span>
                {pendingCount > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-500 text-slate-950 font-black">
                    {pendingCount}
                  </span>
                )}
              </button>
              <button
                onClick={() => setFilterTab('IMPORTED')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  filterTab === 'IMPORTED'
                    ? 'bg-indigo-600 text-white shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <span>นำเข้าแล้ว ({importedCount})</span>
              </button>
              <button
                onClick={() => setFilterTab('ALL')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  filterTab === 'ALL'
                    ? 'bg-indigo-600 text-white shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                ทั้งหมด ({queue.length})
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleAddSimulatedMessages}
                className="px-3 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                title="สร้างข้อมูลจำลองทดสอบ"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>จำลองสลิปทดสอบ</span>
              </button>

              {pendingCount > 0 && (
                <button
                  type="button"
                  onClick={handleImportAllPending}
                  className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <CheckCheck className="w-4 h-4" />
                  <span>นำเข้าทั้งหมด ({pendingCount})</span>
                </button>
              )}
            </div>
          </div>

          {/* Queue List of Items */}
          {filteredQueue.length === 0 ? (
            <div className="text-center py-12 bg-slate-950/50 rounded-2xl border border-dashed border-slate-800 space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-slate-850 flex items-center justify-center text-slate-500 mx-auto">
                <Bot className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-300">
                  {filterTab === 'PENDING' ? 'ไม่มีรายการสลิป/ค่าใช้จ่ายที่ค้างนำเข้า' : 'ยังไม่มีรายการในหมวดนี้'}
                </p>
                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                  กดปุ่ม "จำลองสลิปทดสอบ" เพื่อดูตัวอย่าง หรือส่งข้อความ/สลิปเข้า Telegram Bot แล้วกด "ดึงข้อมูลจาก Telegram"
                </p>
              </div>
              <button
                type="button"
                onClick={handleAddSimulatedMessages}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl shadow transition-all cursor-pointer inline-flex items-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>สร้างรายการจำลองทันที</span>
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredQueue.map((item) => {
                const isImported = item.status === 'IMPORTED';
                const catName = getCategoryThaiName(item.parsedCategory);

                return (
                  <div
                    key={item.id}
                    className={`bg-slate-950 border rounded-2xl p-4 transition-all hover:border-slate-700 shadow-sm flex flex-col md:flex-row gap-4 items-start md:items-center justify-between ${
                      isImported ? 'border-slate-850 opacity-75' : 'border-indigo-900/30'
                    }`}
                  >
                    {/* Left: Thumbnail & Details */}
                    <div className="flex items-start gap-3.5 flex-1 min-w-0">
                      {/* Slip Thumbnail */}
                      {item.photoUrl ? (
                        <div
                          onClick={() => setPreviewImageUrl(item.photoUrl!)}
                          className="relative w-16 h-16 rounded-xl overflow-hidden border border-slate-800 bg-slate-900 shrink-0 cursor-pointer group"
                        >
                          <img
                            src={item.photoUrl}
                            alt="สลิปค่าใช้จ่าย"
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                            referrerPolicy="no-referrer"
                          />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <Eye className="w-4 h-4 text-white" />
                          </div>
                          <span className="absolute bottom-0 inset-x-0 bg-indigo-950/80 text-[8px] font-bold text-indigo-300 text-center py-0.5">
                            สลิป
                          </span>
                        </div>
                      ) : (
                        <div className="w-16 h-16 rounded-xl bg-slate-900 border border-slate-800 flex flex-col items-center justify-center text-slate-500 shrink-0">
                          <FileText className="w-6 h-6 text-slate-400" />
                          <span className="text-[8px] font-bold mt-1 text-slate-500">ข้อความ</span>
                        </div>
                      )}

                      {/* Info & Detected Fields */}
                      <div className="space-y-1.5 min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                            item.parsedCategory === 'Ingredients' ? 'bg-amber-950/40 text-amber-400 border-amber-900/40' :
                            item.parsedCategory === 'Electricity' ? 'bg-yellow-950/40 text-yellow-400 border-yellow-900/40' :
                            item.parsedCategory === 'Water' ? 'bg-cyan-950/40 text-cyan-400 border-cyan-900/40' :
                            item.parsedCategory === 'Rent' ? 'bg-purple-950/40 text-purple-400 border-purple-900/40' :
                            item.parsedCategory === 'Salary' ? 'bg-blue-950/40 text-blue-400 border-blue-900/40' :
                            item.parsedCategory === 'Marketing' ? 'bg-rose-950/40 text-rose-400 border-rose-900/40' :
                            'bg-slate-850 text-slate-300 border-slate-750'
                          }`}>
                            📂 {catName}
                          </span>

                          <span className="text-[10px] text-slate-500 font-mono flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {item.date} • {item.senderName}
                          </span>

                          {isImported && (
                            <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-950/60 text-emerald-400 border border-emerald-900/50 flex items-center gap-0.5">
                              <Check className="w-2.5 h-2.5" /> นำเข้าแล้ว
                            </span>
                          )}
                        </div>

                        {/* Title / Description */}
                        <p className="text-xs font-bold text-white line-clamp-1">
                          {item.parsedDescription}
                        </p>

                        {/* Raw Telegram Text */}
                        {item.rawText && item.rawText !== item.parsedDescription && (
                          <p className="text-[11px] text-slate-400 italic line-clamp-1">
                            "{item.rawText}"
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Right: Amount & Action Buttons */}
                    <div className="flex items-center gap-4 self-end md:self-center shrink-0">
                      <div className="text-right">
                        <span className="text-[10px] text-slate-500 block">จำนวนเงิน</span>
                        <span className="text-base font-black text-emerald-400 font-mono">
                          ฿{item.parsedAmount.toLocaleString()}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        {!isImported ? (
                          <>
                            <button
                              onClick={() => setEditingItem(item)}
                              className="p-2 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white rounded-xl border border-slate-800 transition-all cursor-pointer"
                              title="แก้ไขข้อมูลก่อนนำเข้า"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>

                            <button
                              onClick={() => handleImportExpense(item)}
                              className="px-3.5 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-bold shadow transition-all flex items-center gap-1 cursor-pointer"
                            >
                              <Check className="w-3.5 h-3.5" />
                              <span>นำเข้า</span>
                            </button>
                          </>
                        ) : (
                          <span className="text-xs text-slate-500 font-mono px-3 py-1.5 bg-slate-900 rounded-xl border border-slate-850">
                            ลงสมุดแล้ว
                          </span>
                        )}

                        <button
                          onClick={() => handleDismissItem(item.id)}
                          className="p-2 hover:bg-red-950/50 text-slate-600 hover:text-red-400 rounded-xl transition-all cursor-pointer"
                          title="ลบออกจากคิว"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Direct Manual Slip Upload Section */}
          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-850 pb-2">
              <div className="flex items-center gap-2">
                <Upload className="w-4 h-4 text-teal-400" />
                <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                  หรือ อัปโหลดสลิป/หลักฐานตรงเข้าคิวนี้ (Direct Slip Upload)
                </h4>
              </div>
              <span className="text-[10px] text-slate-500">ทดสอบระบบอ่านสลิป</span>
            </div>

            <form onSubmit={handleDirectSlipSubmit} className="flex flex-col sm:flex-row gap-3 items-center">
              <div className="flex-1 w-full">
                <input
                  type="text"
                  placeholder="คำอธิบายเพิ่มเติม เช่น ซื้อผักและน้ำมันพืช 450 บาท"
                  value={directSlipNote}
                  onChange={(e) => setDirectSlipNote(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-850 text-white text-xs rounded-xl px-3 py-2 focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <label className="flex-1 sm:flex-none px-3 py-2 bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 rounded-xl text-xs font-bold cursor-pointer transition-all flex items-center justify-center gap-1.5">
                  <Image className="w-3.5 h-3.5 text-indigo-400" />
                  <span>{directSlipImage ? 'เปลี่ยนรูปสลิป' : 'เลือกภาพสลิป'}</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onload = (event) => {
                          if (event.target?.result) {
                            setDirectSlipImage(event.target.result as string);
                          }
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                    className="hidden"
                  />
                </label>

                <button
                  type="submit"
                  disabled={!directSlipImage}
                  className="px-4 py-2 bg-teal-600 hover:bg-teal-500 disabled:opacity-40 text-white rounded-xl text-xs font-bold transition-all shadow cursor-pointer whitespace-nowrap"
                >
                  วิเคราะห์ & เพิ่มเข้าคิว
                </button>
              </div>
            </form>

            {directSlipImage && (
              <div className="flex items-center gap-2 p-2 bg-slate-900 rounded-xl border border-slate-800 w-fit">
                <img src={directSlipImage} alt="preview" className="w-10 h-10 object-cover rounded-lg" />
                <span className="text-xs text-slate-300 font-medium">รูปภาพสลิปพร้อมวิเคราะห์</span>
                <button
                  type="button"
                  onClick={() => setDirectSlipImage(null)}
                  className="text-red-400 hover:text-red-300 ml-2"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="bg-slate-950 p-4 border-t border-slate-800 flex items-center justify-between">
          <div className="text-xs text-slate-400 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>เชื่อมต่อผ่าน Telegram Bot API เข้ารหัสปลอดภัย</span>
          </div>

          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
          >
            ปิดหน้าต่าง
          </button>
        </div>
      </div>

      {/* Slip Image Fullview Lightbox */}
      {previewImageUrl && (
        <div
          className="fixed inset-0 z-60 bg-black/90 backdrop-blur-md flex items-center justify-center p-4"
          onClick={() => setPreviewImageUrl(null)}
        >
          <div className="relative max-w-lg w-full bg-slate-900 rounded-2xl border border-slate-800 p-2 shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-2 border-b border-slate-800 mb-2">
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                <Image className="w-4 h-4 text-indigo-400" /> ภาพหลักฐานสลิปโอนเงิน / ใบเสร็จ
              </span>
              <button
                onClick={() => setPreviewImageUrl(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <img
              src={previewImageUrl}
              alt="สลิปขยายใหญ่"
              className="w-full max-h-[75vh] object-contain rounded-xl bg-slate-950"
              referrerPolicy="no-referrer"
            />
          </div>
        </div>
      )}

      {/* Edit Item Modal */}
      {editingItem && (
        <div className="fixed inset-0 z-60 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                <Edit3 className="w-4 h-4 text-indigo-400" />
                แก้ไขข้อมูลก่อนนำเข้าค่าใช้จ่าย
              </h3>
              <button onClick={() => setEditingItem(null)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEditItem} className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">หมวดหมู่ค่าใช้จ่าย</label>
                <select
                  value={editingItem.parsedCategory}
                  onChange={(e) => setEditingItem({
                    ...editingItem,
                    parsedCategory: e.target.value as Expense['category']
                  })}
                  className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl px-3 py-2 text-xs font-bold"
                >
                  <option value="Ingredients">ซื้อวัตถุดิบ/อาหารสด (Ingredients)</option>
                  <option value="Electricity">ค่าไฟฟ้า (Electricity)</option>
                  <option value="Water">ค่าน้ำประปา (Water)</option>
                  <option value="Rent">ค่าเช่าสถานที่ (Rent)</option>
                  <option value="Salary">ค่าจ้าง/เงินเดือนพนักงาน (Salary)</option>
                  <option value="Marketing">ค่าโฆษณา/การตลาด (Marketing)</option>
                  <option value="Other">ค่าใช้จ่ายเบ็ดเตล็ด (Other)</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">จำนวนเงิน (฿)</label>
                <input
                  type="number"
                  required
                  min="0"
                  step="0.01"
                  value={editingItem.parsedAmount}
                  onChange={(e) => setEditingItem({
                    ...editingItem,
                    parsedAmount: parseFloat(e.target.value) || 0
                  })}
                  className="w-full bg-slate-950 border border-slate-800 text-white font-mono font-bold rounded-xl px-3 py-2 text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">คำอธิบายรายการ</label>
                <input
                  type="text"
                  required
                  value={editingItem.parsedDescription}
                  onChange={(e) => setEditingItem({
                    ...editingItem,
                    parsedDescription: e.target.value
                  })}
                  className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl px-3 py-2 text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">วันที่ทำรายการ</label>
                <input
                  type="date"
                  required
                  value={editingItem.date}
                  onChange={(e) => setEditingItem({
                    ...editingItem,
                    date: e.target.value
                  })}
                  className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl px-3 py-2 text-xs font-mono"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingItem(null)}
                  className="flex-1 py-2 bg-slate-800 text-slate-300 rounded-xl text-xs font-bold"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold"
                >
                  บันทึกการแก้ไข
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
