import type { AppData, Dividend, FeeSettings, Transaction, TradeType } from './types';

const round2 = (n: number) => Math.round(n * 100) / 100;

/** ค่าคอม + ค่าธรรมเนียม + VAT ตามอัตราใน Settings */
export function calcFees(type: TradeType, quantity: number, price: number, s: FeeSettings) {
  const gross = quantity * price;
  if (gross <= 0) return { gross: 0, commission: 0, fees: 0, vat: 0, total: 0 };
  const commission = round2(Math.max((gross * s.commissionRate) / 100, s.minCommission));
  const fees = round2((gross * s.tradingFeeRate) / 100);
  const vat = round2(((commission + fees) * s.vatRate) / 100);
  return { gross, commission, fees, vat, total: netTotal(type, gross, commission, fees, vat) };
}

export function netTotal(type: TradeType, gross: number, commission: number, fees: number, vat: number) {
  const cost = commission + fees + vat;
  return round2(type === 'BUY' ? gross + cost : gross - cost);
}

export function calcDividend(shares: number, perShare: number, whtRate: number) {
  const gross = round2(shares * perShare);
  const withholdingTax = round2((gross * whtRate) / 100);
  return { gross, withholdingTax, net: round2(gross - withholdingTax) };
}

export interface Holding {
  symbol: string;
  quantity: number;
  avgCost: number; // ต้นทุนเฉลี่ยต่อหุ้น (รวมค่าธรรมเนียมฝั่งซื้อ)
  costBasis: number;
  price: number;
  marketValue: number;
  unrealized: number;
  unrealizedPct: number;
  realized: number; // กำไรขาดทุนที่ขายไปแล้ว (สะสม)
  dividends: number; // เงินปันผลสุทธิสะสม
}

export interface RealizedTrade {
  id: string;
  date: string;
  symbol: string;
  quantity: number;
  proceeds: number;
  cost: number;
  pnl: number;
}

const byDate = <T extends { date: string; id: string }>(a: T, b: T) =>
  a.date === b.date ? a.id.localeCompare(b.id) : a.date.localeCompare(b.date);

/**
 * เดิน transactions ตามลำดับวันที่ ด้วยวิธีต้นทุนเฉลี่ย (Average Cost) แบบที่โบรกเกอร์ไทยใช้:
 * ซื้อ → ต้นทุนรวมเพิ่มด้วยเงินจ่ายสุทธิ, ขาย → ตัดต้นทุนเฉลี่ย × จำนวน และรับรู้กำไรจากเงินรับสุทธิ
 */
export function walkTrades(transactions: Transaction[], until?: string) {
  const pos = new Map<string, { qty: number; cost: number; realized: number }>();
  const realizedTrades: RealizedTrade[] = [];
  for (const t of [...transactions].sort(byDate)) {
    if (until && t.date > until) break;
    const p = pos.get(t.symbol) ?? { qty: 0, cost: 0, realized: 0 };
    if (t.type === 'BUY') {
      p.qty += t.quantity;
      p.cost += t.total;
    } else {
      const qty = Math.min(t.quantity, p.qty);
      const avg = p.qty > 0 ? p.cost / p.qty : 0;
      const cost = avg * qty;
      const pnl = t.total - cost;
      p.qty -= qty;
      p.cost = p.qty > 0 ? p.cost - cost : 0;
      p.realized += pnl;
      realizedTrades.push({ id: t.id, date: t.date, symbol: t.symbol, quantity: qty, proceeds: t.total, cost, pnl });
    }
    pos.set(t.symbol, p);
  }
  return { pos, realizedTrades };
}

export function computeHoldings(data: AppData): Holding[] {
  const { pos } = walkTrades(data.transactions);
  const divBySymbol = sumBy(data.dividends, (d) => d.symbol, (d) => d.net);
  const symbols = new Set([...pos.keys(), ...divBySymbol.keys()]);
  const out: Holding[] = [];
  for (const symbol of symbols) {
    const p = pos.get(symbol) ?? { qty: 0, cost: 0, realized: 0 };
    const price = priceOf(data, symbol);
    const marketValue = p.qty * price;
    const unrealized = marketValue - p.cost;
    out.push({
      symbol,
      quantity: p.qty,
      avgCost: p.qty > 0 ? p.cost / p.qty : 0,
      costBasis: p.cost,
      price,
      marketValue,
      unrealized,
      unrealizedPct: p.cost > 0 ? (unrealized / p.cost) * 100 : 0,
      realized: p.realized,
      dividends: divBySymbol.get(symbol) ?? 0,
    });
  }
  return out.sort((a, b) => b.marketValue - a.marketValue);
}

export function priceOf(data: AppData, symbol: string) {
  return data.stocks.find((s) => s.symbol === symbol)?.price ?? 0;
}

/** เงินสดคงเหลือ = ฝาก − ถอน − ซื้อ + ขาย + ปันผลสุทธิ */
export function cashBalance(data: AppData, until?: string) {
  let cash = 0;
  for (const c of data.cash) if (!until || c.date <= until) cash += c.type === 'DEPOSIT' ? c.amount : -c.amount;
  for (const t of data.transactions) if (!until || t.date <= until) cash += t.type === 'BUY' ? -t.total : t.total;
  for (const d of data.dividends) if (!until || d.payDate <= until) cash += d.net;
  return cash;
}

/** เงินลงทุนสุทธิ (ฝาก − ถอน) */
export function netDeposits(data: AppData, until?: string) {
  return data.cash
    .filter((c) => !until || c.date <= until)
    .reduce((s, c) => s + (c.type === 'DEPOSIT' ? c.amount : -c.amount), 0);
}

export interface Summary {
  holdingsValue: number;
  cash: number;
  portfolioValue: number;
  invested: number; // ต้นทุนหุ้นที่ถืออยู่
  deposits: number;
  unrealized: number;
  realized: number;
  dividends: number;
  totalPnl: number; // มูลค่าพอร์ต − เงินฝากสุทธิ
  totalPnlPct: number;
}

export function computeSummary(data: AppData, holdings = computeHoldings(data)): Summary {
  const holdingsValue = holdings.reduce((s, h) => s + h.marketValue, 0);
  const cash = cashBalance(data);
  const deposits = netDeposits(data);
  const portfolioValue = holdingsValue + cash;
  const totalPnl = portfolioValue - deposits;
  return {
    holdingsValue,
    cash,
    portfolioValue,
    invested: holdings.reduce((s, h) => s + h.costBasis, 0),
    deposits,
    unrealized: holdings.reduce((s, h) => s + h.unrealized, 0),
    realized: holdings.reduce((s, h) => s + h.realized, 0),
    dividends: data.dividends.reduce((s, d) => s + d.net, 0),
    totalPnl,
    totalPnlPct: deposits > 0 ? (totalPnl / deposits) * 100 : 0,
  };
}

/** กำไรที่รับรู้แล้วรายเดือน (ขาย + ปันผล) — 12 เดือนล่าสุด */
export function monthlyRealized(data: AppData, months = 12, today = todayISO()) {
  const { realizedTrades } = walkTrades(data.transactions);
  const keys: string[] = [];
  const d = new Date(today + 'T00:00:00');
  for (let i = months - 1; i >= 0; i--) {
    const m = new Date(d.getFullYear(), d.getMonth() - i, 1);
    keys.push(`${m.getFullYear()}-${String(m.getMonth() + 1).padStart(2, '0')}`);
  }
  const trade = sumBy(realizedTrades, (r) => r.date.slice(0, 7), (r) => r.pnl);
  const div = sumBy(data.dividends, (r) => r.payDate.slice(0, 7), (r) => r.net);
  return keys.map((k) => ({
    month: k,
    trading: trade.get(k) ?? 0,
    dividend: div.get(k) ?? 0,
    total: (trade.get(k) ?? 0) + (div.get(k) ?? 0),
  }));
}

export function dividendsInYear(dividends: Dividend[], year: number) {
  return dividends.filter((d) => d.payDate.startsWith(String(year))).reduce((s, d) => s + d.net, 0);
}

export type Period = '1M' | '3M' | '6M' | '1Y' | 'ALL';

export function periodStart(period: Period, today = todayISO()): string | null {
  if (period === 'ALL') return null;
  const d = new Date(today + 'T00:00:00');
  if (period === '1M') return toISO(new Date(d.getFullYear(), d.getMonth(), 1));
  const months = { '3M': 3, '6M': 6, '1Y': 12 }[period];
  return toISO(new Date(d.getFullYear(), d.getMonth() - months, d.getDate()));
}

export function periodReport(data: AppData, period: Period, today = todayISO()) {
  const start = periodStart(period, today);
  const inRange = (date: string) => (!start || date >= start) && date <= today;
  const { realizedTrades } = walkTrades(data.transactions);
  const realized = realizedTrades.filter((r) => inRange(r.date));
  const dividends = data.dividends.filter((d) => inRange(d.payDate));
  const buys = data.transactions.filter((t) => t.type === 'BUY' && inRange(t.date));
  const holdings = computeHoldings(data);

  const startValue = start ? valueAt(data, dayBefore(start)) : 0;
  const startDeposits = start ? netDeposits(data, dayBefore(start)) : 0;
  const endValue = computeSummary(data, holdings).portfolioValue;
  const flows = netDeposits(data) - startDeposits;
  const gain = endValue - startValue - flows;
  // Modified Dietz แบบง่าย: ถือว่าเงินเข้า-ออกเกิดกลางช่วง
  const base = startValue + flows / 2;

  const perSymbol = new Map<string, number>();
  for (const r of realized) perSymbol.set(r.symbol, (perSymbol.get(r.symbol) ?? 0) + r.pnl);
  for (const d of dividends) perSymbol.set(d.symbol, (perSymbol.get(d.symbol) ?? 0) + d.net);
  for (const h of holdings) if (h.quantity > 0) perSymbol.set(h.symbol, (perSymbol.get(h.symbol) ?? 0) + h.unrealized);
  const ranked = [...perSymbol.entries()].map(([symbol, pnl]) => ({ symbol, pnl })).sort((a, b) => b.pnl - a.pnl);

  return {
    start,
    gain,
    returnPct: base > 0 ? (gain / base) * 100 : 0,
    realizedPnl: realized.reduce((s, r) => s + r.pnl, 0),
    realizedTrades: realized,
    unrealized: holdings.reduce((s, h) => s + h.unrealized, 0),
    dividends: dividends.reduce((s, d) => s + d.net, 0),
    dividendItems: dividends,
    invested: buys.reduce((s, t) => s + t.total, 0),
    buyCount: buys.length,
    best: ranked.filter((r) => r.pnl > 0).slice(0, 3),
    worst: ranked.filter((r) => r.pnl < 0).reverse().slice(0, 3),
  };
}

/** มูลค่าพอร์ต ณ วันที่ — ใช้ snapshot ที่ใกล้ที่สุดก่อนหน้า ถ้าไม่มีใช้ต้นทุน + เงินสด */
export function valueAt(data: AppData, date: string) {
  const snap = [...data.snapshots].filter((s) => s.date <= date).sort((a, b) => a.date.localeCompare(b.date)).pop();
  if (snap) return snap.value;
  const { pos } = walkTrades(data.transactions, date);
  let cost = 0;
  for (const p of pos.values()) cost += p.cost;
  return cost + cashBalance(data, date);
}

export function sumBy<T>(items: T[], key: (t: T) => string, val: (t: T) => number) {
  const m = new Map<string, number>();
  for (const it of items) m.set(key(it), (m.get(key(it)) ?? 0) + val(it));
  return m;
}

export function toISO(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
export const todayISO = () => toISO(new Date());
const dayBefore = (iso: string) => {
  const d = new Date(iso + 'T00:00:00');
  d.setDate(d.getDate() - 1);
  return toISO(d);
};
