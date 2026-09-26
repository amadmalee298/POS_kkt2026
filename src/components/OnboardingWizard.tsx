import React, { useState, useEffect } from 'react';
import { StoreSettings, MenuItem } from '../types';
import { 
  Check, Play, Store, Utensils, QrCode, Phone, IdCard, Image, 
  Trash2, Plus, Sparkles, X, ArrowRight, ArrowLeft, Upload, Grid
} from 'lucide-react';

interface OnboardingWizardProps {
  settings: StoreSettings;
  onUpdateSettings: (updated: StoreSettings) => void;
  menuItems: MenuItem[];
  onUpdateMenuItems: (updated: MenuItem[]) => void;
  onClose: () => void;
}

export default function OnboardingWizard({
  settings,
  onUpdateSettings,
  menuItems,
  onUpdateMenuItems,
  onClose
}: OnboardingWizardProps) {
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1);

  // Step 1: Store Name State
  const [storeName, setStoreName] = useState(settings.storeName || 'Matchaholic');

  // Step 2: Products State (Local list of items)
  const [localItems, setLocalItems] = useState<MenuItem[]>(menuItems);
  const [newProductName, setNewProductName] = useState('');
  const [newProductPrice, setNewProductPrice] = useState<number>(65);
  const [newProductCategory, setNewProductCategory] = useState('อาหารจานเดียว');

  // Step 3: Categories State
  const [categories, setCategories] = useState<string[]>(() => {
    const cats = menuItems.map(item => item.category);
    return Array.from(new Set(cats)).length > 0 
      ? Array.from(new Set(cats)) 
      : ['อาหารจานเดียว', 'เครื่องดื่ม'];
  });
  const [newCategoryName, setNewCategoryName] = useState('');

  // Step 4: QR Payment State
  const [paymentType, setPaymentType] = useState<'PHONE' | 'ID_CARD' | 'QR_IMAGE'>('PHONE');
  const [promptpayId, setPromptpayId] = useState(settings.promptpayId || '');
  const [promptpayName, setPromptpayName] = useState(settings.promptpayName || '');
  const [qrImageUrl, setQrImageUrl] = useState<string>('');

  // Auto pre-fill PromptPay Name when Store Name changes or initializes
  useEffect(() => {
    if (!promptpayName || promptpayName === settings.storeName) {
      setPromptpayName(storeName);
    }
  }, [storeName]);

  // Sync state with parent when completing or skipping steps
  const saveAllSettings = () => {
    const updatedSettings: StoreSettings = {
      ...settings,
      storeName: storeName,
      promptpayId: promptpayId,
      promptpayName: promptpayName,
      currency: '฿'
    };
    onUpdateSettings(updatedSettings);
    onUpdateMenuItems(localItems);
    localStorage.setItem('kp_onboarding_completed', 'true');
    onClose();
  };

  const handleSkip = () => {
    localStorage.setItem('kp_onboarding_completed', 'true');
    onClose();
  };

  // Step 2 Helpers
  const handleAddProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProductName.trim()) return;

    const newItem: MenuItem = {
      id: `m-onboard-${Date.now()}`,
      name: newProductName,
      price: newProductPrice,
      cost: Math.round(newProductPrice * 0.4),
      category: newProductCategory,
      image: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?q=80&w=600&auto=format&fit=crop',
      active: true
    };

    setLocalItems(prev => [...prev, newItem]);
    setNewProductName('');
    // Switch default Category if the current one was newly added
    if (!categories.includes(newProductCategory)) {
      setCategories(prev => [...prev, newProductCategory]);
    }
  };

  const handleDeleteProduct = (id: string) => {
    setLocalItems(prev => prev.filter(item => item.id !== id));
  };

  // Step 3 Helpers
  const handleAddCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;
    if (categories.includes(newCategoryName.trim())) {
      setNewCategoryName('');
      return;
    }
    setCategories(prev => [...prev, newCategoryName.trim()]);
    setNewProductCategory(newCategoryName.trim());
    setNewCategoryName('');
  };

  const handleDeleteCategory = (cat: string) => {
    setCategories(prev => prev.filter(c => c !== cat));
    // Re-map items belonging to deleted category to the first available category
    const remaining = categories.filter(c => c !== cat);
    const fallbackCat = remaining[0] || 'อาหารจานเดียว';
    setLocalItems(prev => prev.map(item => {
      if (item.category === cat) {
        return { ...item, category: fallbackCat };
      }
      return item;
    }));
  };

  // PromptPay QR generation logic
  const getPromptPayQRUrl = () => {
    if (!promptpayId) return '';
    const cleanId = promptpayId.replace(/[^0-9]/g, '');
    return `https://promptpay.io/${cleanId}.png`;
  };

  return (
    <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto selection:bg-sky-500/30">
      
      {/* Onboarding Wizard Main Card */}
      <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col my-8 animate-in zoom-in-95 duration-200">
        
        {/* Sky/Teal Gradient Header Panel */}
        <div className="bg-gradient-to-r from-cyan-600 via-sky-600 to-indigo-600 p-6 text-white relative">
          <button 
            onClick={handleSkip} 
            className="absolute top-4 right-4 text-white/70 hover:text-white p-1 rounded-full bg-black/15 hover:bg-black/30 transition-all cursor-pointer"
            title="ปิดขั้นตอนตั้งค่า"
          >
            <X className="w-4 h-4" />
          </button>
          
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 bg-white/10 w-fit px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider">
                <Sparkles className="w-3 h-3 text-amber-300 fill-amber-300" /> Onboarding Setup Wizard
              </div>
              <h2 className="text-xl font-black tracking-tight mt-1.5">
                {currentStep === 1 && "ตั้งชื่อร้านค้าของคุณ"}
                {currentStep === 2 && "เพิ่มรายการสินค้าในร้าน"}
                {currentStep === 3 && "สร้างหมวดหมู่เพื่อจัดระเบียบ"}
                {currentStep === 4 && "ตั้งค่ารับเงิน QR (PromptPay)"}
              </h2>
              <p className="text-xs text-white/80 font-medium">
                {currentStep === 1 && "เริ่มต้นสร้างร้านค้าด้วยขั้นตอนง่าย ๆ เพื่อเริ่มเปิดระบบขายหน้าร้าน"}
                {currentStep === 2 && "เพิ่มรายการสินค้า/อาหารจานอร่อยของคุณ เพื่อใช้แสดงบนจอคิดเงิน POS"}
                {currentStep === 3 && "แบ่งกลุ่มรายการสินค้าเพื่อช่วยให้แคชเชียร์และลูกค้าค้นหาเมนูได้เร็วขึ้น"}
                {currentStep === 4 && "ให้ลูกค้าสแกนจ่ายได้ทันทีผ่าน PromptPay คิวอาร์โค้ดแบบอัตโนมัติ"}
              </p>
            </div>
            <span className="text-xs bg-black/25 text-sky-200 px-3 py-1.5 rounded-2xl font-black font-mono shrink-0">
              ขั้นตอน {currentStep}/4
            </span>
          </div>

          {/* Stepper Progress Bar (Mirroring exact design from screenshot) */}
          <div className="mt-8 relative flex items-center justify-between px-4">
            
            {/* Background progress lines */}
            <div className="absolute left-8 right-8 top-1/2 -translate-y-1/2 h-1 bg-white/20 -z-10"></div>
            <div 
              className="absolute left-8 top-1/2 -translate-y-1/2 h-1 bg-emerald-400 transition-all duration-300 -z-10"
              style={{ width: `${((currentStep - 1) / 3) * 100}%` }}
            ></div>

            {/* Step 1 */}
            <div className="flex flex-col items-center gap-1.5 relative">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-xs transition-all ${
                currentStep > 1 
                  ? 'bg-emerald-500 text-white shadow shadow-emerald-500/50' 
                  : currentStep === 1 
                  ? 'bg-white text-sky-600 ring-4 ring-sky-500/30 font-black scale-110' 
                  : 'bg-slate-800 text-slate-500'
              }`}>
                {currentStep > 1 ? <Check className="w-4 h-4 stroke-[3px]" /> : "1"}
              </div>
              <span className={`text-[10px] font-black ${currentStep === 1 ? 'text-white' : 'text-white/60'}`}>
                {storeName || "ชื่อร้าน"}
              </span>
            </div>

            {/* Step 2 */}
            <div className="flex flex-col items-center gap-1.5 relative">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-xs transition-all ${
                currentStep > 2 
                  ? 'bg-emerald-500 text-white shadow shadow-emerald-500/50' 
                  : currentStep === 2 
                  ? 'bg-white text-sky-600 ring-4 ring-sky-500/30 font-black scale-110' 
                  : 'bg-slate-800 text-slate-500'
              }`}>
                {currentStep > 2 ? <Check className="w-4 h-4 stroke-[3px]" /> : "2"}
              </div>
              <span className={`text-[10px] font-black ${currentStep === 2 ? 'text-white' : 'text-white/60'}`}>
                {localItems.length} สินค้า
              </span>
            </div>

            {/* Step 3 */}
            <div className="flex flex-col items-center gap-1.5 relative">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-xs transition-all ${
                currentStep > 3 
                  ? 'bg-emerald-500 text-white shadow shadow-emerald-500/50' 
                  : currentStep === 3 
                  ? 'bg-white text-sky-600 ring-4 ring-sky-500/30 font-black scale-110' 
                  : 'bg-slate-800 text-slate-500'
              }`}>
                {currentStep > 3 ? <Check className="w-4 h-4 stroke-[3px]" /> : "3"}
              </div>
              <span className={`text-[10px] font-black ${currentStep === 3 ? 'text-white' : 'text-white/60'}`}>
                {categories.length} หมวดหมู่
              </span>
            </div>

            {/* Step 4 */}
            <div className="flex flex-col items-center gap-1.5 relative">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-xs transition-all ${
                currentStep === 4 
                  ? 'bg-white text-sky-600 ring-4 ring-sky-500/30 font-black scale-110' 
                  : 'bg-slate-800 text-slate-500'
              }`}>
                4
              </div>
              <span className={`text-[10px] font-black ${currentStep === 4 ? 'text-white' : 'text-white/60'}`}>
                พร้อมเพย์
              </span>
            </div>

          </div>
        </div>

        {/* Dynamic Step Content Panel */}
        <div className="p-6 sm:p-8 flex-1 bg-slate-900 overflow-y-auto max-h-[460px]">
          
          {/* STEP 1: SHOP NAME */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <div className="flex items-center gap-2 text-slate-300 font-bold text-sm">
                <Store className="w-5 h-5 text-sky-400" />
                <span>ระบุชื่อกิจการร้านค้าหลักของคุณ</span>
              </div>
              
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 block">
                  ชื่อร้านค้า / กิจการ *
                </label>
                <input
                  type="text"
                  required
                  value={storeName}
                  onChange={(e) => setStoreName(e.target.value)}
                  placeholder="เช่น มะนาวสเปซ, ครัวกะเพราพรีเมียม"
                  className="w-full bg-slate-950 border border-slate-800 text-white rounded-2xl px-4 py-3.5 text-sm font-bold focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition-all placeholder-slate-600"
                />
                <p className="text-[10px] text-slate-500">ชื่อนี้จะปรากฏบนหัวบิลพิมพ์ใบเสร็จ สลิปการชำระเงิน และระบบสั่งอาหารคิวอาร์ (QR Ordering Client)</p>
              </div>

              <div className="bg-slate-950 rounded-2xl p-4 border border-slate-850/60 flex items-start gap-3">
                <div className="bg-sky-500/10 p-2 rounded-xl text-sky-400 shrink-0">
                  <Sparkles className="w-4 h-4 fill-sky-400/20" />
                </div>
                <div className="text-xs space-y-1 text-slate-400 leading-relaxed">
                  <span className="font-extrabold text-slate-200">💡 ทิปส์การออกแบบร้าน:</span>
                  <p>ตั้งชื่อร้านให้สั้น กระชับ จำง่าย และสะท้อนตัวตนเมนูหลักของคุณเพื่อสร้างการจดจำที่ดีให้กับลูกค้า</p>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: MANAGE PRODUCTS */}
          {currentStep === 2 && (
            <div className="space-y-6">
              {/* Add Product Form */}
              <form onSubmit={handleAddProduct} className="bg-slate-950 p-4 rounded-2xl border border-slate-850 space-y-4">
                <span className="text-xs font-black text-white block">เพิ่มสินค้าใหม่ด่วน</span>
                
                <div className="grid grid-cols-1 md:grid-cols-12 gap-3 text-xs">
                  <div className="md:col-span-5 space-y-1">
                    <label className="text-[11px] font-bold text-slate-400">ชื่อสินค้า *</label>
                    <input
                      type="text"
                      required
                      value={newProductName}
                      onChange={(e) => setNewProductName(e.target.value)}
                      placeholder="เช่น กะเพราเนื้อโคขุนสับราดข้าว"
                      className="w-full bg-slate-900 border border-slate-800 text-white rounded-xl px-3 py-2.5 focus:outline-none focus:border-sky-500"
                    />
                  </div>
                  
                  <div className="md:col-span-3 space-y-1">
                    <label className="text-[11px] font-bold text-slate-400">ราคาขาย (บาท) *</label>
                    <input
                      type="number"
                      required
                      value={newProductPrice}
                      onChange={(e) => setNewProductPrice(parseInt(e.target.value) || 0)}
                      className="w-full bg-slate-900 border border-slate-800 text-white rounded-xl px-3 py-2.5 font-mono font-bold focus:outline-none focus:border-sky-500"
                    />
                  </div>

                  <div className="md:col-span-4 space-y-1">
                    <label className="text-[11px] font-bold text-slate-400">หมวดหมู่สินค้า</label>
                    <select
                      value={newProductCategory}
                      onChange={(e) => setNewProductCategory(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 text-white rounded-xl px-2 py-2.5 font-bold focus:outline-none"
                    >
                      {categories.map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    className="bg-sky-600 hover:bg-sky-500 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" /> เพิ่มลงในร้าน
                  </button>
                </div>
              </form>

              {/* Added Products List */}
              <div className="space-y-2">
                <span className="text-xs font-bold text-slate-400 block">รายการสินค้าในร้านค้า ({localItems.length})</span>
                <div className="bg-slate-950 rounded-2xl border border-slate-850 overflow-hidden max-h-48 overflow-y-auto divide-y divide-slate-850 text-xs">
                  {localItems.map((item, index) => (
                    <div key={item.id} className="p-3 flex items-center justify-between hover:bg-slate-900/40 transition-colors">
                      <div className="flex items-center gap-2.5">
                        <span className="text-[10px] font-mono text-slate-600">#{index + 1}</span>
                        <div>
                          <span className="font-bold text-slate-200 block">{item.name}</span>
                          <span className="text-[10px] bg-slate-900 text-slate-400 px-2 py-0.5 rounded-md font-semibold border border-slate-800 mt-1 inline-block">
                            {item.category}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="font-mono font-bold text-white text-sm">{item.price} ฿</span>
                        <button
                          type="button"
                          onClick={() => handleDeleteProduct(item.id)}
                          className="text-slate-600 hover:text-red-400 p-1.5 hover:bg-red-950/20 rounded-lg transition-all cursor-pointer"
                          title="ลบสินค้า"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}

                  {localItems.length === 0 && (
                    <div className="p-6 text-center text-slate-600 italic">
                      ยังไม่มีสินค้าในร้านของคุณ กรุณากรอกเพิ่มด้านบน
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: CATEGORIES */}
          {currentStep === 3 && (
            <div className="space-y-6">
              {/* Add Category Form */}
              <form onSubmit={handleAddCategory} className="bg-slate-950 p-4 rounded-2xl border border-slate-850 space-y-3">
                <span className="text-xs font-black text-white block">เพิ่มหมวดหมู่จัดกลุ่มสินค้า</span>
                
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    placeholder="เช่น ของทานเล่น, เมนูแกงร้อน"
                    className="flex-1 bg-slate-900 border border-slate-800 text-white rounded-xl px-3 py-2.5 text-xs font-semibold focus:outline-none focus:border-sky-500"
                  />
                  <button
                    type="submit"
                    className="bg-sky-600 hover:bg-sky-500 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-pointer shrink-0"
                  >
                    <Plus className="w-3.5 h-3.5" /> สร้างหมวด
                  </button>
                </div>
              </form>

              {/* Added Categories List */}
              <div className="space-y-2">
                <span className="text-xs font-bold text-slate-400 block">หมวดหมู่ทั้งหมด ({categories.length})</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {categories.map((cat, index) => {
                    const itemCount = localItems.filter(item => item.category === cat).length;
                    return (
                      <div key={index} className="bg-slate-950 p-3.5 rounded-2xl border border-slate-850 flex items-center justify-between hover:border-slate-800 transition-colors">
                        <div className="space-y-1">
                          <span className="font-extrabold text-white text-xs block">{cat}</span>
                          <span className="text-[10px] text-slate-500 font-semibold block">มีสินค้าอยู่ {itemCount} รายการ</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleDeleteCategory(cat)}
                          className="text-slate-600 hover:text-red-400 p-1.5 hover:bg-red-950/20 rounded-lg transition-all cursor-pointer"
                          title="ลบหมวดหมู่"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: QR PAYMENT SETUP (Exactly matching original screenshot!) */}
          {currentStep === 4 && (
            <div className="space-y-6">
              
              {/* 3 tabs selectors for QR code options */}
              <div className="grid grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={() => setPaymentType('PHONE')}
                  className={`p-4 rounded-2xl border transition-all text-center flex flex-col items-center justify-center gap-2 cursor-pointer ${
                    paymentType === 'PHONE'
                      ? 'bg-slate-950 border-sky-500 text-white shadow-lg ring-2 ring-sky-500/10'
                      : 'bg-slate-950/40 border-slate-850 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                    paymentType === 'PHONE' ? 'bg-sky-500 text-white' : 'bg-slate-900 text-slate-500'
                  }`}>
                    <Phone className="w-5 h-5" />
                  </div>
                  <span className="text-[11px] font-black block leading-none">เบอร์โทร</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentType('ID_CARD')}
                  className={`p-4 rounded-2xl border transition-all text-center flex flex-col items-center justify-center gap-2 cursor-pointer ${
                    paymentType === 'ID_CARD'
                      ? 'bg-slate-950 border-sky-500 text-white shadow-lg ring-2 ring-sky-500/10'
                      : 'bg-slate-950/40 border-slate-850 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                    paymentType === 'ID_CARD' ? 'bg-sky-500 text-white' : 'bg-slate-900 text-slate-500'
                  }`}>
                    <IdCard className="w-5 h-5" />
                  </div>
                  <span className="text-[11px] font-black block leading-none">เลขบัตร ปชช.</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentType('QR_IMAGE')}
                  className={`p-4 rounded-2xl border transition-all text-center flex flex-col items-center justify-center gap-2 cursor-pointer ${
                    paymentType === 'QR_IMAGE'
                      ? 'bg-slate-950 border-sky-500 text-white shadow-lg ring-2 ring-sky-500/10'
                      : 'bg-slate-950/40 border-slate-850 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                    paymentType === 'QR_IMAGE' ? 'bg-sky-500 text-white' : 'bg-slate-900 text-slate-500'
                  }`}>
                    <Image className="w-5 h-5" />
                  </div>
                  <span className="text-[11px] font-black block leading-none">รูป QR ของฉัน</span>
                </button>
              </div>

              {/* Form Inputs (with exact text and layout from screenshot) */}
              <div className="space-y-4">
                {paymentType === 'PHONE' && (
                  <div className="space-y-1.5">
                    <label className="text-xs font-black text-slate-400 flex items-center gap-1">
                      เบอร์โทรศัพท์พร้อมเพย์ <span className="text-rose-500 font-extrabold">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={promptpayId}
                      onChange={(e) => setPromptpayId(e.target.value)}
                      placeholder="เช่น 081-234-5678"
                      className="w-full bg-slate-950 border border-slate-850 text-white rounded-2xl px-4 py-3.5 text-sm font-bold focus:outline-none focus:border-sky-500"
                    />
                  </div>
                )}

                {paymentType === 'ID_CARD' && (
                  <div className="space-y-1.5">
                    <label className="text-xs font-black text-slate-400 flex items-center gap-1">
                      เลขบัตรประจำตัวประชาชน <span className="text-rose-500 font-extrabold">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={promptpayId}
                      onChange={(e) => setPromptpayId(e.target.value)}
                      placeholder="เช่น 1-2345-67890-12-3"
                      className="w-full bg-slate-950 border border-slate-850 text-white rounded-2xl px-4 py-3.5 text-sm font-bold focus:outline-none focus:border-sky-500"
                    />
                  </div>
                )}

                {paymentType === 'QR_IMAGE' && (
                  <div className="space-y-1.5">
                    <label className="text-xs font-black text-slate-400 flex items-center gap-1">
                      ที่อยู่ลิงก์รูปภาพ QR Code ของคุณ <span className="text-rose-500 font-extrabold">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={qrImageUrl}
                      onChange={(e) => {
                        setQrImageUrl(e.target.value);
                        setPromptpayId(e.target.value); // Use the url as the promptpayId to display
                      }}
                      placeholder="เช่น https://domain.com/your-qr.jpg"
                      className="w-full bg-slate-950 border border-slate-850 text-white rounded-2xl px-4 py-3.5 text-xs font-bold focus:outline-none focus:border-sky-500"
                    />
                    <p className="text-[10px] text-slate-500">หรือจะใช้เบอร์โทรพร้อมเพย์ในระบบเพื่อแสดงผลอัตโนมัติแทนได้</p>
                  </div>
                )}

                {/* Shared Field: Account Name */}
                <div className="space-y-1.5">
                  <label className="text-xs font-black text-slate-400">
                    ชื่อบัญชี (แสดงให้ลูกค้าดู) (ไม่บังคับ)
                  </label>
                  <input
                    type="text"
                    value={promptpayName}
                    onChange={(e) => setPromptpayName(e.target.value)}
                    placeholder="เช่น ครัวกะเพราพรีเมียม"
                    className="w-full bg-slate-950 border border-slate-850 text-white rounded-2xl px-4 py-3.5 text-sm font-bold focus:outline-none focus:border-sky-500"
                  />
                </div>
              </div>

              {/* Dynamic QR Preview (Exactly styled matching the screenshot!) */}
              <div className="space-y-2">
                <span className="text-xs font-bold text-slate-400 block">ตัวอย่าง QR ที่ลูกค้าจะเห็น</span>
                
                <div className="bg-slate-950 rounded-2xl border-2 border-slate-850 p-5 flex flex-col items-center justify-center relative min-h-[220px]">
                  
                  {/* Subtle watermarked background logo */}
                  <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] select-none pointer-events-none">
                    <QrCode className="w-56 h-56" />
                  </div>

                  {promptpayId ? (
                    <div className="space-y-3 flex flex-col items-center z-10">
                      <div className="p-2 bg-white rounded-xl shadow-lg border border-slate-800">
                        {paymentType === 'QR_IMAGE' && qrImageUrl ? (
                          <img
                            src={qrImageUrl}
                            alt="Custom QR"
                            className="w-36 h-36 object-contain"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <img
                            src={getPromptPayQRUrl()}
                            alt="PromptPay QR Code"
                            className="w-36 h-36 object-contain"
                            referrerPolicy="no-referrer"
                            onError={(e) => {
                              e.currentTarget.src = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(promptpayId)}`;
                            }}
                          />
                        )}
                      </div>
                      
                      <div className="text-center space-y-1">
                        <span className="text-[11px] bg-sky-500/10 text-sky-400 px-3 py-1 rounded-full font-black border border-sky-500/20 inline-block uppercase font-mono tracking-wider">
                          พร้อมเพย์ {paymentType === 'PHONE' ? 'เบอร์โทร' : paymentType === 'ID_CARD' ? 'เลขบัตร ปชช.' : 'ภาพคิวอาร์'}
                        </span>
                        <p className="text-xs font-mono font-bold text-slate-300 mt-1">{promptpayId}</p>
                        {promptpayName && (
                          <p className="text-[10px] text-slate-400 font-bold">ชื่อบัญชี: {promptpayName}</p>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center space-y-2 py-4 z-10 text-slate-600">
                      <QrCode className="w-12 h-12 mx-auto opacity-30 stroke-[1.5]" />
                      <p className="text-[11px] font-medium italic">กรุณากรอกข้อมูลพร้อมเพย์ด้านบนเพื่อแสดงคิวอาร์โค้ดจริง</p>
                    </div>
                  )}

                </div>
              </div>

            </div>
          )}

        </div>

        {/* Action Buttons Footer Panel */}
        <div className="p-6 bg-slate-900 border-t border-slate-850 flex flex-col gap-3">
          
          <div className="flex items-center justify-between gap-4">
            {/* Back button */}
            {currentStep > 1 ? (
              <button
                type="button"
                onClick={() => setCurrentStep(prev => Math.max(1, prev - 1) as 1 | 2 | 3 | 4)}
                className="px-5 py-3 bg-slate-950 hover:bg-slate-850 text-slate-300 border border-slate-850 rounded-2xl text-xs font-black transition-all flex items-center gap-1 cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" /> ย้อนกลับ
              </button>
            ) : (
              <div></div>
            )}

            {/* Next/Save button */}
            {currentStep < 4 ? (
              <button
                type="button"
                onClick={() => setCurrentStep(prev => Math.min(4, prev + 1) as 1 | 2 | 3 | 4)}
                className="px-6 py-3 bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white font-black rounded-2xl text-xs shadow-lg shadow-sky-950/40 transition-all flex items-center gap-1 cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
              >
                ขั้นตอนถัดไป <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={saveAllSettings}
                className="px-8 py-3.5 bg-sky-500 hover:bg-sky-400 text-slate-950 font-black rounded-2xl text-xs shadow-lg shadow-sky-500/20 transition-all flex items-center justify-center gap-1.5 cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
              >
                🛒 บันทึกและเริ่มขาย
              </button>
            )}
          </div>

          {/* Skip/Dismiss Action link (Mirroring exactly from screen!) */}
          <button
            type="button"
            onClick={handleSkip}
            className="text-[11px] text-slate-500 hover:text-slate-300 transition-colors font-extrabold flex items-center justify-center gap-1 py-1 cursor-pointer"
          >
            <Play className="w-3 h-3 fill-current rotate-90" /> ข้ามไปขายเลย
          </button>

        </div>

      </div>
    </div>
  );
}
