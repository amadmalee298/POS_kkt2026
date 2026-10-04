const nf2 = new Intl.NumberFormat('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const nf0 = new Intl.NumberFormat('th-TH', { maximumFractionDigits: 0 });

export const baht = (n: number, digits: 0 | 2 = 2) => `฿${(digits === 2 ? nf2 : nf0).format(n)}`;
export const num = (n: number, digits = 2) =>
  new Intl.NumberFormat('th-TH', { minimumFractionDigits: digits, maximumFractionDigits: digits }).format(n);
export const qty = (n: number) => nf0.format(n);
export const signed = (n: number, digits: 0 | 2 = 2) => `${n > 0 ? '+' : n < 0 ? '−' : ''}${baht(Math.abs(n), digits)}`;
export const pct = (n: number, digits = 2) => `${n > 0 ? '+' : n < 0 ? '−' : ''}${Math.abs(n).toFixed(digits)}%`;
export const tone = (n: number) => (n > 0 ? 'text-up' : n < 0 ? 'text-down' : 'text-muted');

const TH_MONTHS = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
/** 2026-10-04 → 4 ต.ค. 26 */
export const thDate = (iso: string) => {
  if (!iso) return '–';
  const [y, m, d] = iso.split('-').map(Number);
  return `${d} ${TH_MONTHS[m - 1]} ${String(y).slice(2)}`;
};
/** 2026-10 → ต.ค. 26 */
export const thMonth = (ym: string) => {
  const [y, m] = ym.split('-').map(Number);
  return `${TH_MONTHS[m - 1]} ${String(y).slice(2)}`;
};

export const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
