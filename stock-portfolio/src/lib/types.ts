// Data model — mirrors supabase/schema.sql so the local store can be swapped for Supabase later.

export type TradeType = 'BUY' | 'SELL';

export interface Stock {
  symbol: string;
  name: string;
  sector: string;
  price: number; // ราคาปัจจุบัน (อัปเดตเอง)
  priceUpdatedAt: string; // ISO date
}

export interface Transaction {
  id: string;
  date: string; // YYYY-MM-DD
  symbol: string;
  type: TradeType;
  quantity: number;
  price: number;
  commission: number;
  fees: number; // trading fee + clearing fee
  vat: number;
  total: number; // BUY: เงินที่จ่ายสุทธิ, SELL: เงินที่ได้รับสุทธิ
  broker: string;
  note: string;
}

export interface Dividend {
  id: string;
  symbol: string;
  shares: number;
  xdDate: string;
  payDate: string;
  perShare: number;
  gross: number;
  withholdingTax: number;
  net: number;
  note: string;
}

export type CashType = 'DEPOSIT' | 'WITHDRAW';

export interface CashTransaction {
  id: string;
  date: string;
  type: CashType;
  amount: number;
  note: string;
}

export interface WatchItem {
  id: string;
  symbol: string;
  targetPrice: number;
  pe: number | null;
  dividendYield: number | null; // %
  note: string;
  addedAt: string;
}

export interface StockAnalysis {
  symbol: string;
  revenue: number | null; // ล้านบาท
  netProfit: number | null; // ล้านบาท
  eps: number | null;
  pe: number | null;
  pbv: number | null;
  roe: number | null; // %
  roa: number | null; // %
  debtToEquity: number | null; // เท่า
  dividendYield: number | null; // %
  fairPrice: number | null;
  targetPrice: number | null;
  thesis: string;
  risks: string;
  watchPoints: string;
  updatedAt: string;
}

export interface PortfolioSnapshot {
  date: string; // YYYY-MM-DD
  value: number; // มูลค่าหุ้น + เงินสด
  invested: number; // เงินฝากสุทธิ
}

export interface FeeSettings {
  commissionRate: number; // % เช่น 0.157
  minCommission: number; // บาท
  tradingFeeRate: number; // % (trading + clearing) เช่น 0.007
  vatRate: number; // % เช่น 7
  withholdingTaxRate: number; // % ภาษีเงินปันผล เช่น 10
  defaultBroker: string;
}

export interface AppData {
  version: 1;
  stocks: Stock[];
  transactions: Transaction[];
  dividends: Dividend[];
  cash: CashTransaction[];
  watchlist: WatchItem[];
  analyses: StockAnalysis[];
  snapshots: PortfolioSnapshot[];
  settings: FeeSettings;
  isSample: boolean;
}
