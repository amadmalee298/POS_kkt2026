import React, { useState, useEffect } from 'react';
import { User, UserRole } from '../types';
import { Shield, Key, Eye, EyeOff, Store, Lock, Grid } from 'lucide-react';

interface LoginProps {
  onLoginSuccess: (user: User) => void;
  users: User[];
}

export default function Login({ onLoginSuccess, users }: LoginProps) {
  const [loginMethod, setLoginMethod] = useState<'pin' | 'password'>('pin');
  const [selectedRole, setSelectedRole] = useState<UserRole>('Admin');
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  // PIN mode states
  const [pin, setPin] = useState<string>('');

  const handleRoleChange = (role: UserRole) => {
    setSelectedRole(role);
    const matchedUser = users.find(u => u.role === role);
    if (matchedUser) {
      setUsername(matchedUser.username);
      setPassword(matchedUser.password || (role === 'Admin' ? 'admin' : '1234'));
    } else {
      if (role === 'Admin') {
        setUsername('admin');
        setPassword('admin');
      } else if (role === 'Manager') {
        setUsername('manager');
        setPassword('1234');
      } else if (role === 'Cashier') {
        setUsername('cashier');
        setPassword('1234');
      } else {
        setUsername('staff');
        setPassword('1234');
      }
    }
    setError('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const user = users.find(
      (u) => u.username === username.toLowerCase() && u.role === selectedRole
    );

    const correctPassword = user ? (user.password || (selectedRole === 'Admin' ? 'admin' : '1234')) : '';

    if (user && password === correctPassword) {
      onLoginSuccess(user);
    } else {
      setError('ชื่อผู้ใช้งานหรือรหัสผ่านไม่ถูกต้องสำหรับสิทธิ์ที่เลือก');
    }
  };

  const handleNumberClick = (num: string) => {
    if (pin.length >= 4) return;
    const newPin = pin + num;
    setPin(newPin);
    setError('');

    if (newPin.length === 4) {
      // Find user matching this pin
      const matchedUser = users.find((u) => u.pin === newPin);
      if (matchedUser) {
        // Successful login
        setTimeout(() => {
          onLoginSuccess(matchedUser);
        }, 150);
      } else {
        // Failed login
        setTimeout(() => {
          setError('รหัส PIN 4 หลักไม่ถูกต้อง กรุณาลองใหม่อีกครั้ง');
          setPin('');
        }, 300);
      }
    }
  };

  const handleBackspace = () => {
    setPin((prev) => prev.slice(0, -1));
    setError('');
  };

  const handleClear = () => {
    setPin('');
    setError('');
  };

  // Keyboard listener for physical keyboard typing in PIN mode
  useEffect(() => {
    if (loginMethod !== 'pin') return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key >= '0' && e.key <= '9') {
        handleNumberClick(e.key);
      } else if (e.key === 'Backspace') {
        handleBackspace();
      } else if (e.key === 'Escape') {
        handleClear();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [loginMethod, pin]);

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Decorative ambient background */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-red-600/10 rounded-full blur-3xl"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-amber-600/10 rounded-full blur-3xl"></div>

      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden relative z-10">
        <div className="p-6 text-center border-b border-slate-800 bg-slate-900/50">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-slate-950 border-2 border-slate-800 mb-3 overflow-hidden shadow-xl shadow-slate-950/50">
            <img 
              src="/src/assets/images/app_logo_1784468034081.jpg" 
              alt="Logo" 
              className="w-full h-full object-cover" 
              referrerPolicy="no-referrer"
            />
          </div>
          <h1 className="text-xl font-black text-white tracking-tight uppercase">ร้านครัวกะเพรา</h1>
          <p className="text-slate-400 text-[11px] mt-1 font-bold">ระบบบริหารจัดการร้านอาหารและคิดเงิน POS อัจฉริยะครบวงจร</p>
        </div>

        <div className="p-6">
          {/* Login Method Toggle */}
          <div className="flex p-1 bg-slate-950 rounded-xl border border-slate-800 mb-6">
            <button
              type="button"
              onClick={() => {
                setLoginMethod('pin');
                setError('');
                setPin('');
              }}
              className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                loginMethod === 'pin'
                  ? 'bg-gradient-to-r from-red-600 to-amber-600 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Grid className="w-3.5 h-3.5" />
              <span>PIN เข้างานด่วน</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setLoginMethod('password');
                setError('');
              }}
              className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                loginMethod === 'password'
                  ? 'bg-gradient-to-r from-red-600 to-amber-600 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Lock className="w-3.5 h-3.5" />
              <span>ชื่อผู้ใช้ & รหัสผ่าน</span>
            </button>
          </div>

          {loginMethod === 'pin' ? (
            /* PIN Numeric Keypad View */
            <div className="space-y-6">
              <div className="text-center space-y-1">
                <p className="text-xs text-slate-300 font-bold">เข้าสู่ระบบสลับกะพนักงานด้วย PIN 4 หลัก</p>
                <p className="text-[10px] text-slate-500 font-medium">กดปุ่มตัวเลขบนหน้าจอหรือใช้แป้นพิมพ์ของท่าน</p>
              </div>

              {/* Dot Indicators */}
              <div className="flex justify-center gap-5 my-4">
                {[0, 1, 2, 3].map((index) => (
                  <div
                    key={index}
                    className={`w-4 h-4 rounded-full transition-all duration-150 ${
                      pin.length > index
                        ? 'bg-gradient-to-tr from-amber-500 to-red-500 scale-110 shadow shadow-amber-500/50'
                        : 'bg-slate-950 border border-slate-800'
                    }`}
                  />
                ))}
              </div>

              {/* On-screen Numeric Pad Grid */}
              <div className="grid grid-cols-3 gap-3 max-w-[280px] mx-auto">
                {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => handleNumberClick(num)}
                    className="w-16 h-16 rounded-full bg-slate-950 hover:bg-slate-800 border border-slate-850 active:bg-slate-700 text-white text-lg font-black transition-all flex items-center justify-center cursor-pointer hover:border-slate-700"
                  >
                    {num}
                  </button>
                ))}
                
                {/* Clear Key */}
                <button
                  type="button"
                  onClick={handleClear}
                  className="w-16 h-16 rounded-full bg-slate-950 hover:bg-slate-900 border border-slate-900 active:bg-slate-800 text-red-500 text-xs font-bold transition-all flex items-center justify-center cursor-pointer"
                >
                  ล้าง
                </button>

                {/* 0 Key */}
                <button
                  type="button"
                  onClick={() => handleNumberClick('0')}
                  className="w-16 h-16 rounded-full bg-slate-950 hover:bg-slate-800 border border-slate-850 active:bg-slate-700 text-white text-lg font-black transition-all flex items-center justify-center cursor-pointer hover:border-slate-700"
                >
                  0
                </button>

                {/* Backspace Key */}
                <button
                  type="button"
                  onClick={handleBackspace}
                  className="w-16 h-16 rounded-full bg-slate-950 hover:bg-slate-900 border border-slate-900 active:bg-slate-800 text-slate-400 text-xs font-bold transition-all flex items-center justify-center cursor-pointer"
                >
                  ลบ
                </button>
              </div>


            </div>
          ) : (
            /* Traditional Password Form View */
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Role selection tab */}
              <div>
                <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-2">
                  เลือกสิทธิ์การใช้งาน
                </label>
                <div className="grid grid-cols-4 gap-1.5 p-1 bg-slate-950 rounded-xl border border-slate-800">
                  {(['Admin', 'Manager', 'Cashier', 'Staff'] as UserRole[]).map((role) => (
                    <button
                      key={role}
                      type="button"
                      onClick={() => handleRoleChange(role)}
                      className={`py-2 text-[10px] font-bold rounded-lg transition-all ${
                        selectedRole === role
                          ? 'bg-gradient-to-r from-red-600 to-amber-600 text-white shadow-md'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      {role === 'Admin' ? 'แอดมิน' : role === 'Manager' ? 'ผู้จัดการ' : role === 'Cashier' ? 'แคชเชียร์' : 'ครัว'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Credentials Fields */}
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    ชื่อผู้ใช้งาน
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500">
                      <Shield className="w-4 h-4" />
                    </span>
                    <input
                      type="text"
                      required
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="w-full bg-slate-950 text-white placeholder-slate-600 pl-10 pr-4 py-2.5 rounded-xl border border-slate-800 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-all text-xs font-semibold"
                      placeholder="ป้อนชื่อผู้ใช้งาน"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    รหัสผ่าน
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500">
                      <Key className="w-4 h-4" />
                    </span>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full bg-slate-950 text-white placeholder-slate-600 pl-10 pr-10 py-2.5 rounded-xl border border-slate-800 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-all text-xs font-semibold"
                      placeholder="ป้อนรหัสผ่าน"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-slate-300"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-500 hover:to-amber-500 text-white font-bold rounded-xl transition-all shadow-lg shadow-red-950/50 hover:shadow-red-900/30 focus:outline-none text-xs"
              >
                เข้าสู่ระบบด้วยรหัสผ่าน
              </button>
            </form>
          )}

          {error && (
            <div className="bg-red-950/50 border border-red-900/50 text-red-400 p-3 rounded-xl text-xs text-center font-semibold mt-4">
              {error}
            </div>
          )}
        </div>
      </div>
      
      <div className="mt-4 text-center text-[10px] text-slate-600 relative z-10">
        KAPRAO POS Enterprise v1.0.0 • ทำงานออฟไลน์ด้วยระบบเก็บข้อมูลแบบ LocalStorage & Synchronized Sheets
      </div>
    </div>
  );
}

