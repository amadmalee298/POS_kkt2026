/**
 * Telegram Expense & Slip Sync Utility
 * Allows pulling expense slips and expense text records directly from Telegram Bot API into Kaprao POS Expenses.
 */

import { Expense, TelegramExpenseMessage } from '../types';

export interface TelegramBotInfo {
  id: number;
  is_bot: boolean;
  first_name: string;
  username: string;
}

export interface ParsedExpenseResult {
  amount: number;
  category: Expense['category'];
  description: string;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  sourceText: string;
}

/**
 * Intelligent Thai Natural Language and Keyword Parser for Expenses & Slips
 */
export function parseThaiExpenseMessage(
  text: string = '',
  caption: string = '',
  photoUrl?: string
): ParsedExpenseResult {
  const combined = `${text} ${caption}`.trim();
  const lower = combined.toLowerCase();

  // 1. Amount Extraction Heuristic
  let extractedAmount = 0;

  // Patterns for Thai amounts:
  // e.g. "1,500 บาท", "ยอดโอน 2,450.00", "ค่าไฟ 2800", "500.-", "฿ 1200", "จำนวนเงิน 350.50"
  const amountPatterns = [
    /(?:ยอดโอน|จำนวนเงิน|ยอดชำระ|เป็นเงิน|ราคา|รวมทั้งสิ้น|รวมเงิน|จ่าย|amount|total)[\s:]*([0-9,]+(?:\.[0-9]{1,2})?)/i,
    /([0-9,]+(?:\.[0-9]{1,2})?)\s*(?:บาท|บ\.|฿|thb|\.-)/i,
    /(?:฿|\$)\s*([0-9,]+(?:\.[0-9]{1,2})?)/i,
    /\b([0-9]{2,7}(?:\.[0-9]{1,2})?)\b/
  ];

  for (const pattern of amountPatterns) {
    const match = combined.match(pattern);
    if (match && match[1]) {
      const cleanNum = parseFloat(match[1].replace(/,/g, ''));
      if (!isNaN(cleanNum) && cleanNum > 0 && cleanNum < 10000000) {
        extractedAmount = cleanNum;
        break;
      }
    }
  }

  // 2. Category Detection Heuristics
  let detectedCategory: Expense['category'] = 'Other';
  let confidence: 'HIGH' | 'MEDIUM' | 'LOW' = 'LOW';

  // Keyword banks
  const electricityKeywords = ['ค่าไฟ', 'ไฟฟ้า', 'บิลค่าไฟ', 'การไฟฟ้านครหลวง', 'การไฟฟ้าส่วนภูมิภาค', 'กฟน', 'กฟภ', 'mea', 'pea', 'electric'];
  const waterKeywords = ['ค่าน้ำ', 'ประปา', 'การประปา', 'กปน', 'กปภ', 'mwa', 'pwa', 'water'];
  const rentKeywords = ['ค่าเช่า', 'เช่าที่', 'เช่าร้าน', 'ค่าที่', 'สัญญาเช่า', 'rent', 'lease', 'ตึกแถว'];
  const salaryKeywords = ['เงินเดือน', 'ค่าจ้าง', 'ค่าแรง', 'โอที', 'ot', 'salary', 'wage', 'เบี้ยเลี้ยง', 'โบนัส', 'พนักงาน'];
  const ingredientsKeywords = [
    'ผัก', 'หมู', 'เนื้อ', 'ไก่', 'ไข่', 'กะเพรา', 'พริก', 'ข้าวสาร', 'ข้าวหอม', 'น้ำมัน',
    'ซอส', 'ปลา', 'กุ้ง', 'อาหารทะเล', 'แม็คโคร', 'makro', 'โลตัส', 'lotus', 'บิ๊กซี',
    'big c', 'เบทาโกร', 'ซีพี', 'cp', 'ตลาด', 'วัตถุดิบ', 'food', 'ingredient', 'เนื้อสัตว์',
    'กระเทียม', 'หอมแดง', 'มะนาว', 'ซีอิ๊ว', 'น้ำปลา', 'น้ำตาล'
  ];
  const marketingKeywords = [
    'ยิงแอด', 'ค่าแอด', 'โฆษณา', 'facebook', 'fb ads', 'tiktok', 'google ads',
    'line oa', 'การตลาด', 'marketing', 'ใบปลิว', 'ป้ายโฆษณา', 'influencer', 'รีวิว'
  ];

  if (electricityKeywords.some(k => lower.includes(k))) {
    detectedCategory = 'Electricity';
    confidence = 'HIGH';
  } else if (waterKeywords.some(k => lower.includes(k))) {
    detectedCategory = 'Water';
    confidence = 'HIGH';
  } else if (rentKeywords.some(k => lower.includes(k))) {
    detectedCategory = 'Rent';
    confidence = 'HIGH';
  } else if (salaryKeywords.some(k => lower.includes(k))) {
    detectedCategory = 'Salary';
    confidence = 'HIGH';
  } else if (ingredientsKeywords.some(k => lower.includes(k))) {
    detectedCategory = 'Ingredients';
    confidence = 'HIGH';
  } else if (marketingKeywords.some(k => lower.includes(k))) {
    detectedCategory = 'Marketing';
    confidence = 'HIGH';
  } else if (photoUrl) {
    // If it's a slip with no matching category keywords, default to Ingredients or Other with medium confidence
    detectedCategory = 'Other';
    confidence = 'MEDIUM';
  }

  // 3. Clean Description Extraction
  let cleanDesc = combined
    .replace(/(?:ยอดโอน|จำนวนเงิน|ยอดชำระ|เป็นเงิน|ราคา|รวมทั้งสิ้น|รวมเงิน)[\s:]*[0-9,]+(?:\.[0-9]{1,2})?/gi, '')
    .replace(/[0-9,]+(?:\.[0-9]{1,2})?\s*(?:บาท|บ\.|฿|thb|\.-)/gi, '')
    .trim();

  if (!cleanDesc) {
    if (photoUrl) {
      cleanDesc = `สลิปโอนเงินค่า${getCategoryThaiName(detectedCategory)}`;
    } else {
      cleanDesc = `ค่าใช้จ่าย${getCategoryThaiName(detectedCategory)}`;
    }
  }

  return {
    amount: extractedAmount,
    category: detectedCategory,
    description: cleanDesc,
    confidence,
    sourceText: combined
  };
}

export function getCategoryThaiName(cat: Expense['category']): string {
  switch (cat) {
    case 'Rent': return 'ค่าเช่าสถานที่';
    case 'Salary': return 'ค่าจ้าง/เงินเดือนพนักงาน';
    case 'Electricity': return 'ค่าไฟฟ้า';
    case 'Water': return 'ค่าน้ำประปา';
    case 'Ingredients': return 'ซื้อวัตถุดิบ/อาหารสด';
    case 'Marketing': return 'การตลาด/โฆษณา';
    case 'Other': return 'เบ็ดเตล็ด/ของใช้ร้าน';
    default: return 'ค่าใช้จ่ายทั่วไป';
  }
}

/**
 * Verify Telegram Bot Token and retrieve bot username
 */
export async function verifyTelegramBot(token: string): Promise<{
  success: boolean;
  botInfo?: TelegramBotInfo;
  error?: string;
}> {
  if (!token || !token.trim()) {
    return { success: false, error: 'กรุณาระบุ Telegram Bot Token' };
  }

  const cleanToken = token.trim();

  try {
    const res = await fetch(`https://api.telegram.org/bot${cleanToken}/getMe`);
    const data = await res.json();

    if (res.ok && data.ok && data.result) {
      return {
        success: true,
        botInfo: data.result as TelegramBotInfo
      };
    } else {
      return {
        success: false,
        error: data.description || `HTTP ${res.status}`
      };
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, error: msg || 'เชื่อมต่อกับ Telegram API ล้มเหลว' };
  }
}

/**
 * Fetch updates (messages and slips) from Telegram Bot API
 */
export async function fetchTelegramExpenseUpdates(
  token: string,
  lastUpdateId?: number
): Promise<{
  success: boolean;
  messages: TelegramExpenseMessage[];
  latestUpdateId?: number;
  error?: string;
}> {
  if (!token || !token.trim()) {
    return { success: false, messages: [], error: 'Telegram Bot Token ว่างเปล่า' };
  }

  const cleanToken = token.trim();
  const offset = lastUpdateId ? lastUpdateId + 1 : 0;
  const url = `https://api.telegram.org/bot${cleanToken}/getUpdates?offset=${offset}&limit=50&allowed_updates=["message"]`;

  try {
    const res = await fetch(url);
    const data = await res.json();

    if (!res.ok || !data.ok || !Array.isArray(data.result)) {
      return {
        success: false,
        messages: [],
        error: data.description || `HTTP ${res.status}`
      };
    }

    const updates = data.result;
    const expenseMessages: TelegramExpenseMessage[] = [];
    let maxUpdateId = lastUpdateId || 0;

    for (const update of updates) {
      if (update.update_id > maxUpdateId) {
        maxUpdateId = update.update_id;
      }

      const msg = update.message;
      if (!msg) continue;

      const messageId = msg.message_id;
      const chatId = msg.chat?.id || '';
      const senderName = [msg.from?.first_name, msg.from?.last_name].filter(Boolean).join(' ') || msg.from?.username || 'Telegram User';
      const senderUsername = msg.from?.username;
      const rawText = msg.text || '';
      const caption = msg.caption || '';
      const msgDate = msg.date ? new Date(msg.date * 1000).toISOString() : new Date().toISOString();

      let photoUrl: string | undefined = undefined;
      let fileId: string | undefined = undefined;

      // Check if message has a photo (slip)
      if (Array.isArray(msg.photo) && msg.photo.length > 0) {
        // Largest photo size is the last item
        const bestPhoto = msg.photo[msg.photo.length - 1];
        fileId = bestPhoto.file_id;

        try {
          // Retrieve file path
          const fileRes = await fetch(`https://api.telegram.org/bot${cleanToken}/getFile?file_id=${fileId}`);
          const fileData = await fileRes.json();
          if (fileRes.ok && fileData.ok && fileData.result?.file_path) {
            photoUrl = `https://api.telegram.org/file/bot${cleanToken}/${fileData.result.file_path}`;
          }
        } catch (e) {
          console.warn('Failed to resolve photo URL from Telegram:', e);
        }
      }

      // Only consider if there's either text or a photo
      if (!rawText && !photoUrl && !caption) {
        continue;
      }

      // Ignore standard bot commands like /start, /help unless accompanied by content
      if (rawText.trim() === '/start' || rawText.trim() === '/help') {
        continue;
      }

      const parsed = parseThaiExpenseMessage(rawText, caption, photoUrl);

      expenseMessages.push({
        id: `tg-${update.update_id}-${messageId}`,
        updateId: update.update_id,
        messageId: messageId,
        chatId: chatId,
        senderName: senderName,
        senderUsername: senderUsername,
        date: msgDate.split('T')[0],
        rawText: rawText || undefined,
        caption: caption || undefined,
        photoUrl: photoUrl,
        fileId: fileId,
        parsedAmount: parsed.amount,
        parsedCategory: parsed.category,
        parsedDescription: parsed.description,
        status: 'PENDING',
        receivedAt: msgDate
      });
    }

    return {
      success: true,
      messages: expenseMessages,
      latestUpdateId: maxUpdateId
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, messages: [], error: msg || 'เกิดข้อผิดพลาดในการดึงข้อมูล Telegram' };
  }
}

/**
 * Send an acknowledgment message back to the Telegram chat
 */
export async function replyExpenseSuccess(
  token: string,
  chatId: number | string,
  expenseDesc: string,
  amount: number,
  category: Expense['category'],
  currency = '฿'
): Promise<boolean> {
  if (!token || !chatId) return false;

  const cleanToken = token.trim();
  const catThai = getCategoryThaiName(category);
  const nowStr = new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });

  const text = 
`✅ <b>บันทึกค่าใช้จ่ายลงระบบ POS แล้ว</b>
━━━━━━━━━━━━━━━━━━
📝 <b>รายการ:</b> ${expenseDesc}
💰 <b>ยอดเงิน:</b> ${amount.toLocaleString()} ${currency}
📂 <b>หมวดหมู่:</b> ${catThai}
⏰ <b>เวลาที่บันทึก:</b> ${nowStr} น.
━━━━━━━━━━━━━━━━━━
<i>บันทึกโดย Kaprao POS Enterprise</i>`;

  try {
    const res = await fetch(`https://api.telegram.org/bot${cleanToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: text,
        parse_mode: 'HTML'
      })
    });
    return res.ok;
  } catch (e) {
    console.error('Failed to send reply to Telegram chat:', e);
    return false;
  }
}

// --- LOCAL STORAGE HELPERS FOR TELEGRAM EXPENSE QUEUE ---
const QUEUE_STORAGE_KEY = 'kp_telegram_expense_queue';

export function getTelegramExpenseQueue(): TelegramExpenseMessage[] {
  try {
    const raw = localStorage.getItem(QUEUE_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveTelegramExpenseQueue(queue: TelegramExpenseMessage[]): void {
  try {
    localStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(queue));
  } catch (e) {
    console.error('Failed to save Telegram expense queue:', e);
  }
}

/**
 * Generate high-fidelity mock Telegram messages with realistic Thai bank slips and receipts
 * to let users test and experience the workflow instantly.
 */
export function generateMockTelegramMessages(): TelegramExpenseMessage[] {
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];

  return [
    {
      id: `tg-sim-1-${Date.now()}`,
      updateId: 90001,
      messageId: 101,
      chatId: '123456789',
      senderName: 'เชฟสมศักดิ์ (หัวหน้าครัว)',
      senderUsername: 'chef_somsak',
      date: todayStr,
      rawText: 'ซื้อหมูสับกับไข่ไก่สดจากตลาด บิลรวม 850 บาท',
      caption: 'ซื้อหมูสับกับไข่ไก่สดจากตลาด บิลรวม 850 บาท',
      photoUrl: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?q=80&w=600&auto=format&fit=crop',
      parsedAmount: 850,
      parsedCategory: 'Ingredients',
      parsedDescription: 'ซื้อหมูสับกับไข่ไก่สดจากตลาด บิลรวม',
      status: 'PENDING',
      receivedAt: new Date(now.getTime() - 15 * 60000).toISOString()
    },
    {
      id: `tg-sim-2-${Date.now()}`,
      updateId: 90002,
      messageId: 102,
      chatId: '123456789',
      senderName: 'ผู้จัดการ สมหญิง',
      senderUsername: 'somying_mgr',
      date: todayStr,
      rawText: 'ค่าไฟฟ้าประจำเดือน MEA ยอด 2,450 บาท ชำระแล้วผ่านแอปธนาคาร',
      caption: 'ค่าไฟฟ้าประจำเดือน MEA ยอด 2,450 บาท ชำระแล้วผ่านแอปธนาคาร',
      photoUrl: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?q=80&w=600&auto=format&fit=crop',
      parsedAmount: 2450,
      parsedCategory: 'Electricity',
      parsedDescription: 'ค่าไฟฟ้าประจำเดือน MEA ชำระแล้วผ่านแอปธนาคาร',
      status: 'PENDING',
      receivedAt: new Date(now.getTime() - 45 * 60000).toISOString()
    },
    {
      id: `tg-sim-3-${Date.now()}`,
      updateId: 90003,
      messageId: 103,
      chatId: '123456789',
      senderName: 'สมร แคชเชียร์',
      senderUsername: 'samorn_pos',
      date: todayStr,
      rawText: 'ค่าน้ำประปาประจำสาขา 380 บ.',
      parsedAmount: 380,
      parsedCategory: 'Water',
      parsedDescription: 'ค่าน้ำประปาประจำสาขา',
      status: 'PENDING',
      receivedAt: new Date(now.getTime() - 120 * 60000).toISOString()
    },
    {
      id: `tg-sim-4-${Date.now()}`,
      updateId: 90004,
      messageId: 104,
      chatId: '123456789',
      senderName: 'ทีมการตลาด (แอดมิน)',
      senderUsername: 'mkt_kaprao',
      date: todayStr,
      rawText: 'ยิงแอดโปรโมทเมนูกะเพราหมูกรอบใน Facebook 600 บาท',
      parsedAmount: 600,
      parsedCategory: 'Marketing',
      parsedDescription: 'ยิงแอดโปรโมทเมนูกะเพราหมูกรอบใน Facebook',
      status: 'PENDING',
      receivedAt: new Date(now.getTime() - 240 * 60000).toISOString()
    }
  ];
}
