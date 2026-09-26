import React, { useState } from 'react';
import { MenuItem, Recipe, Ingredient, RecipeIngredient } from '../types';
import { 
  Menu, BookOpen, Plus, Percent, Sparkles, 
  Trash2, HelpCircle, Utensils, Save, Check, X, Pencil, Search
} from 'lucide-react';

interface RecipeProps {
  menuItems: MenuItem[];
  recipes: Recipe[];
  ingredients: Ingredient[];
  onUpdateMenuItems: (updated: MenuItem[], updatedRecipes: Recipe[]) => void;
  currency: string;
  onAddAuditLog: (
    actionType: 'RECIPE_UPDATE' | 'PERMISSION_CHANGE' | 'PRICE_MODIFICATION' | 'SYSTEM_UPDATE' | 'USER_MANAGEMENT',
    details: string
  ) => void;
}

export default function RecipeComponent({ 
  menuItems, recipes, ingredients, onUpdateMenuItems, currency, onAddAuditLog
}: RecipeProps) {
  // Local states
  const [selectedCategory, setSelectedCategory] = useState<string>('ทั้งหมด');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedItemForRecipe, setSelectedItemForRecipe] = useState<MenuItem | null>(null);

  // Form edit states for new menu items
  const [showAddMenuModal, setShowAddMenuModal] = useState(false);
  const [newMenuName, setNewMenuName] = useState('');
  const [newMenuPrice, setNewMenuPrice] = useState<number>(100);
  const [newMenuCategory, setNewMenuCategory] = useState('กะเพราดั้งเดิม');
  const [newMenuImage, setNewMenuImage] = useState('https://images.unsplash.com/photo-1546069901-ba9599a7e63c?q=80&w=600&auto=format&fit=crop');
  const [newMenuIsManualCost, setNewMenuIsManualCost] = useState<boolean>(false);
  const [newMenuCost, setNewMenuCost] = useState<number>(30);

  // Form edit states for editing menu items
  const [showEditMenuModal, setShowEditMenuModal] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [editName, setEditName] = useState('');
  const [editPrice, setEditPrice] = useState<number>(100);
  const [editCategory, setEditCategory] = useState('กะเพราดั้งเดิม');
  const [editImage, setEditImage] = useState('');
  const [editIsManualCost, setEditIsManualCost] = useState<boolean>(false);
  const [editCost, setEditCost] = useState<number>(30);

  // Categories
  const categories = ['ทั้งหมด', 'กะเพราดั้งเดิม', 'กะเพราฟิวชั่น', 'ซุป/แกง', 'เครื่องดื่ม'];

  // Filtered Items (by category and search query)
  const filteredMenuItems = menuItems.filter(item => {
    // Category filter
    const matchesCategory = selectedCategory === 'ทั้งหมด' || item.category === selectedCategory;
    if (!matchesCategory) return false;

    // Search query filter
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase().trim();

    // Match menu item name
    if (item.name.toLowerCase().includes(query)) return true;

    // Match category
    if (item.category.toLowerCase().includes(query)) return true;

    // Match ingredient name in its recipe
    const recipe = recipes.find(r => r.menuItemId === item.id);
    if (recipe) {
      const matchesIngredient = recipe.ingredients.some(ri => {
        const ing = ingredients.find(i => i.id === ri.ingredientId);
        return ing && ing.name.toLowerCase().includes(query);
      });
      if (matchesIngredient) return true;
    }

    return false;
  });

  // Helper to calculate exact recipe food cost
  const getRecipeDetails = (menuItem: MenuItem) => {
    const recipe = recipes.find(r => r.menuItemId === menuItem.id);
    if (!recipe) return { totalCost: menuItem.cost, items: [] };

    let totalCost = 0;
    const items = recipe.ingredients.map(ri => {
      const ing = ingredients.find(i => i.id === ri.ingredientId);
      const cost = ing ? ri.amount * ing.unitCost : 0;
      totalCost += cost;
      return {
        id: ri.ingredientId,
        name: ing ? ing.name : 'วัตถุดิบไร้รหัส',
        amount: ri.amount,
        unit: ing ? ing.unit : '',
        unitCost: ing ? ing.unitCost : 0,
        cost: parseFloat(cost.toFixed(2))
      };
    });

    return {
      totalCost: parseFloat(totalCost.toFixed(2)),
      items
    };
  };

  // Toggle active status
  const handleToggleActive = (id: string) => {
    const updated = menuItems.map(m => {
      if (m.id === id) {
        const newStatus = !m.active;
        onAddAuditLog('PRICE_MODIFICATION', `ตั้งค่าสถานะเมนู "${m.name}" เป็น ${newStatus ? 'เปิดขาย' : 'ปิดชั่วคราว'}`);
        return { ...m, active: newStatus };
      }
      return m;
    });
    onUpdateMenuItems(updated, recipes);
  };

  // Delete menu item and its recipe
  const handleDeleteMenuItem = (itemId: string, itemName: string) => {
    if (confirm(`คุณต้องการลบเมนู "${itemName}" และสูตรตัดสต็อกที่เกี่ยวข้องทั้งหมดใช่หรือไม่? (การดำเนินการนี้จะไม่ลบยอดขายในประวัติในอดีต)`)) {
      const updatedMenuItems = menuItems.filter(m => m.id !== itemId);
      const updatedRecipes = recipes.filter(r => r.menuItemId !== itemId);
      onUpdateMenuItems(updatedMenuItems, updatedRecipes);
      onAddAuditLog('RECIPE_UPDATE', `ลบรายการเมนู "${itemName}" พร้อมทั้งสูตรหักสต็อกที่เกี่ยวข้อง`);
      if (selectedItemForRecipe && selectedItemForRecipe.id === itemId) {
        setSelectedItemForRecipe(null);
      }
    }
  };

  // Delete/Clear the entire recipe for a menu item
  const handleDeleteRecipe = (menuItemId: string) => {
    if (confirm('คุณต้องการลบสูตรหักสต็อกทั้งหมดของเมนูนี้ใช่หรือไม่? เมนูนี้จะไม่มีการหักวัตถุดิบอัตโนมัติเมื่อขายออก')) {
      const updatedRecipes = recipes.filter(r => r.menuItemId !== menuItemId);
      const currentItem = menuItems.find(item => item.id === menuItemId);
      
      const updatedMenuItems = menuItems.map(item => {
        if (item.id === menuItemId) {
          return { ...item, cost: 0, recipeId: undefined };
        }
        return item;
      });

      onUpdateMenuItems(updatedMenuItems, updatedRecipes);
      if (currentItem) {
        onAddAuditLog('RECIPE_UPDATE', `ล้างข้อมูลสูตรหักสต็อกทั้งหมดของเมนู "${currentItem.name}"`);
      }
      
      // Refresh local selected state
      const updatedItem = updatedMenuItems.find(m => m.id === menuItemId);
      if (updatedItem) setSelectedItemForRecipe(updatedItem || null);
    }
  };

  // Add menu item
  const handleAddMenuItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMenuName) return;

    const newItem: MenuItem = {
      id: `m${menuItems.length + 1}`,
      name: newMenuName,
      price: newMenuPrice,
      cost: newMenuIsManualCost ? newMenuCost : Math.round(newMenuPrice * 0.35), // initial cost baseline
      category: newMenuCategory,
      image: newMenuImage,
      active: true,
      isManualCost: newMenuIsManualCost
    };

    onUpdateMenuItems([newItem, ...menuItems], recipes);
    onAddAuditLog('RECIPE_UPDATE', `เพิ่มรายการเมนูใหม่ "${newMenuName}" ราคา ${newMenuPrice} ฿ (หมวดหมู่: ${newMenuCategory})`);
    setShowAddMenuModal(false);
    setNewMenuName('');
    setNewMenuPrice(100);
    setNewMenuIsManualCost(false);
    setNewMenuCost(30);
  };

  // Edit menu item
  const handleEditMenuItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;

    let finalCost = editCost;
    if (!editIsManualCost) {
      const recipe = recipes.find(r => r.menuItemId === editingItem.id);
      if (recipe) {
        finalCost = recipe.ingredients.reduce((sum, ri) => {
          const ing = ingredients.find(i => i.id === ri.ingredientId);
          return sum + (ing ? ri.amount * ing.unitCost : 0);
        }, 0);
      } else {
        finalCost = editingItem.cost;
      }
    }

    const updated = menuItems.map(m => {
      if (m.id === editingItem.id) {
        return {
          ...m,
          name: editName,
          price: editPrice,
          cost: parseFloat(finalCost.toFixed(2)),
          category: editCategory,
          image: editImage,
          isManualCost: editIsManualCost
        };
      }
      return m;
    });

    onUpdateMenuItems(updated, recipes);
    onAddAuditLog('PRICE_MODIFICATION', `แก้ไขรายการเมนู "${editingItem.name}" -> "${editName}" ราคา ${editPrice} ฿, ต้นทุน ${parseFloat(finalCost.toFixed(2))} ฿ (โหมด: ${editIsManualCost ? 'กำหนดเองแบบแมนนวล' : 'คำนวณอัตโนมัติตามสูตร'})`);
    setShowEditMenuModal(false);
    setEditingItem(null);
  };

  // Update recipe constituent portions
  const handleUpdatePortion = (ingredientId: string, newAmount: number) => {
    if (!selectedItemForRecipe) return;

    const ing = ingredients.find(i => i.id === ingredientId);
    if (ing) {
      onAddAuditLog('RECIPE_UPDATE', `ปรับสัดส่วนสูตรเมนู "${selectedItemForRecipe.name}": แก้ไขปริมาณส่วนผสม "${ing.name}" เป็น ${newAmount} ${ing.unit}`);
    }

    const updatedRecipes = recipes.map(rec => {
      if (rec.menuItemId === selectedItemForRecipe.id) {
        return {
          ...rec,
          ingredients: rec.ingredients.map(ing => {
            if (ing.ingredientId === ingredientId) {
              return { ...ing, amount: Math.max(0.001, newAmount) };
            }
            return ing;
          })
        };
      }
      return rec;
    });

    // Recalculate menu cost dynamically to match recipe total
    const recipeDetails = updatedRecipes.find(r => r.menuItemId === selectedItemForRecipe.id);
    let finalCost = selectedItemForRecipe.cost;
    if (recipeDetails) {
      finalCost = recipeDetails.ingredients.reduce((sum, ri) => {
        const ing = ingredients.find(i => i.id === ri.ingredientId);
        return sum + (ing ? ri.amount * ing.unitCost : 0);
      }, 0);
    }

    const updatedMenuItems = menuItems.map(item => {
      if (item.id === selectedItemForRecipe.id) {
        if (item.isManualCost) {
          return item;
        }
        return { ...item, cost: parseFloat(finalCost.toFixed(2)) };
      }
      return item;
    });

    onUpdateMenuItems(updatedMenuItems, updatedRecipes);
    // Refresh local selected state
    const currentItem = updatedMenuItems.find(m => m.id === selectedItemForRecipe.id);
    if (currentItem) setSelectedItemForRecipe(currentItem);
  };

  // Delete constituent
  const handleDeleteConstituent = (ingredientId: string) => {
    if (!selectedItemForRecipe) return;

    const ing = ingredients.find(i => i.id === ingredientId);
    if (ing) {
      onAddAuditLog('RECIPE_UPDATE', `ปรับสูตรของเมนู "${selectedItemForRecipe.name}": ลบส่วนผสม "${ing.name}" ออกจากสูตร`);
    }

    const updatedRecipes = recipes.map(rec => {
      if (rec.menuItemId === selectedItemForRecipe.id) {
        return {
          ...rec,
          ingredients: rec.ingredients.filter(ing => ing.ingredientId !== ingredientId)
        };
      }
      return rec;
    });

    // Recalculate cost
    const recipeDetails = updatedRecipes.find(r => r.menuItemId === selectedItemForRecipe.id);
    let finalCost = 0;
    if (recipeDetails) {
      finalCost = recipeDetails.ingredients.reduce((sum, ri) => {
        const ing = ingredients.find(i => i.id === ri.ingredientId);
        return sum + (ing ? ri.amount * ing.unitCost : 0);
      }, 0);
    }

    const updatedMenuItems = menuItems.map(item => {
      if (item.id === selectedItemForRecipe.id) {
        if (item.isManualCost) {
          return item;
        }
        return { ...item, cost: parseFloat(finalCost.toFixed(2)) };
      }
      return item;
    });

    onUpdateMenuItems(updatedMenuItems, updatedRecipes);
    const currentItem = updatedMenuItems.find(m => m.id === selectedItemForRecipe.id);
    if (currentItem) setSelectedItemForRecipe(currentItem);
  };

  // Add constituent to recipe
  const handleAddConstituent = (ingredientId: string) => {
    if (!selectedItemForRecipe) return;

    const ing = ingredients.find(i => i.id === ingredientId);
    if (ing) {
      onAddAuditLog('RECIPE_UPDATE', `ปรับสูตรของเมนู "${selectedItemForRecipe.name}": เพิ่มวัตถุดิบ "${ing.name}" เข้าในสูตรตัดสต็อก`);
    }

    let targetRecipe = recipes.find(r => r.menuItemId === selectedItemForRecipe.id);
    let updatedRecipes = [...recipes];

    if (!targetRecipe) {
      // Create new blank recipe for this item
      const newRec: Recipe = {
        id: `r-new-${Date.now()}`,
        menuItemId: selectedItemForRecipe.id,
        ingredients: [{ ingredientId, amount: 0.1 }]
      };
      updatedRecipes.push(newRec);
    } else {
      updatedRecipes = recipes.map(rec => {
        if (rec.menuItemId === selectedItemForRecipe.id) {
          // Check if already in recipe
          if (rec.ingredients.some(ing => ing.ingredientId === ingredientId)) {
            return rec;
          }
          return {
            ...rec,
            ingredients: [...rec.ingredients, { ingredientId, amount: 0.05 }]
          };
        }
        return rec;
      });
    }

    // Recalculate cost
    const recipeDetails = updatedRecipes.find(r => r.menuItemId === selectedItemForRecipe.id);
    let finalCost = 0;
    if (recipeDetails) {
      finalCost = recipeDetails.ingredients.reduce((sum, ri) => {
        const ing = ingredients.find(i => i.id === ri.ingredientId);
        return sum + (ing ? ri.amount * ing.unitCost : 0);
      }, 0);
    }

    const updatedMenuItems = menuItems.map(item => {
      if (item.id === selectedItemForRecipe.id) {
        if (item.isManualCost) {
          return { 
            ...item, 
            recipeId: recipeDetails?.id
          };
        }
        return { 
          ...item, 
          cost: parseFloat(finalCost.toFixed(2)),
          recipeId: recipeDetails?.id
        };
      }
      return item;
    });

    onUpdateMenuItems(updatedMenuItems, updatedRecipes);
    const currentItem = updatedMenuItems.find(m => m.id === selectedItemForRecipe.id);
    if (currentItem) setSelectedItemForRecipe(currentItem);
  };

  return (
    <div className="space-y-6">
      {/* Header and Add button */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">บริหารเมนูและสูตรอาหาร (Menu & Recipes)</h2>
          <p className="text-xs text-slate-400">ควบคุมราคาขาย ตั้งค่าสัญลักษณ์สูตรอาหาร และคำนวณสัดส่วนกำไรขั้นต้น (Food Cost %)</p>
        </div>
        <button
          onClick={() => setShowAddMenuModal(true)}
          className="px-4 py-2 bg-gradient-to-r from-red-600 to-amber-600 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 hover:opacity-95 shadow transition-all"
        >
          <Plus className="w-4 h-4" /> เพิ่มเมนูอาหารใหม่
        </button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        
        {/* LEFT LIST: MENU MANAGEMENT (7 columns) */}
        <div className="xl:col-span-7 space-y-4">
          {/* Filters & Search Row */}
          <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
            {/* Category Tabs */}
            <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none flex-1">
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`py-1.5 px-3 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                    selectedCategory === cat
                      ? 'bg-slate-850 text-white border border-slate-700'
                      : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800/80'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Search Input */}
            <div className="relative md:w-64 shrink-0">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-slate-500">
                <Search className="w-3.5 h-3.5" />
              </span>
              <input
                type="text"
                placeholder="ค้นหาเมนู หรือวัตถุดิบในสูตร..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-8 py-1.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-red-500 transition-all font-medium"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute inset-y-0 right-0 flex items-center pr-2.5 text-slate-500 hover:text-slate-300"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs divide-y divide-slate-800">
                <thead>
                  <tr className="bg-slate-950 text-slate-400 font-bold">
                    <th className="p-4">เมนู</th>
                    <th className="p-4">ต้นทุนเฉลี่ย</th>
                    <th className="p-4">ราคาขาย</th>
                    <th className="p-4">สัดส่วนทุน %</th>
                    <th className="p-4 text-center">สูตรหักคลัง</th>
                    <th className="p-4 text-right font-bold text-slate-400">การจัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-850 text-slate-300">
                  {filteredMenuItems.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-slate-500 font-medium">
                        <div className="flex flex-col items-center justify-center gap-2 py-6">
                          <Search className="w-6 h-6 text-slate-600" />
                          <span className="text-xs text-slate-400">ไม่พบเมนูอาหารหรือวัตถุดิบที่ตรงกับ "{searchQuery}"</span>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredMenuItems.map(item => {
                    const rDetails = getRecipeDetails(item);
                    const currentCost = item.isManualCost ? item.cost : rDetails.totalCost;
                    const costPct = item.price > 0 ? (currentCost / item.price) * 100 : 0;
                    const hasRecipe = recipes.some(r => r.menuItemId === item.id);

                    return (
                      <tr key={item.id} className="hover:bg-slate-850/10">
                        <td className="p-4">
                          <button
                            onClick={() => setSelectedItemForRecipe(item)}
                            className="flex items-center gap-3 text-left hover:text-red-400 group transition-all"
                          >
                            <img 
                              src={item.image} 
                              alt={item.name} 
                              className="w-10 h-10 rounded-lg object-cover bg-slate-950 border border-slate-850" 
                              referrerPolicy="no-referrer"
                            />
                            <div>
                              <span className="font-bold block text-slate-200 group-hover:text-red-400">{item.name}</span>
                              <span className="text-[10px] text-slate-500 mt-0.5">{item.category}</span>
                            </div>
                          </button>
                        </td>
                        <td className="p-4 font-mono">
                          <div className="flex flex-col">
                            <span className={item.isManualCost ? "text-amber-400 font-bold" : "text-slate-300"}>
                              {currentCost.toFixed(1)} ฿
                            </span>
                            {item.isManualCost && (
                              <span className="text-[8px] text-amber-500 font-black uppercase tracking-wider">แมนนวล 🔒</span>
                            )}
                          </div>
                        </td>
                        <td className="p-4 font-mono font-bold text-white">
                          {item.price} ฿
                        </td>
                        <td className="p-4 font-mono">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            costPct > 40 
                              ? 'bg-red-950/40 text-red-400 border border-red-900/40' 
                              : 'bg-emerald-950/40 text-emerald-400 border border-emerald-900/40'
                          }`}>
                            {costPct.toFixed(1)}%
                          </span>
                        </td>
                        <td className="p-4 text-center">
                          <button
                            onClick={() => setSelectedItemForRecipe(item)}
                            className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-lg border transition-all ${
                              hasRecipe 
                                ? 'bg-amber-950/40 text-amber-500 border-amber-900/40 hover:bg-amber-950/80' 
                                : 'bg-slate-950 text-slate-500 border-slate-850 hover:bg-slate-850'
                            }`}
                          >
                            <BookOpen className="w-3.5 h-3.5" /> 
                            {hasRecipe ? 'เปิดดูสูตร' : 'สร้างสูตร'}
                          </button>
                        </td>
                        <td className="p-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleToggleActive(item.id)}
                              className={`px-2 py-1 rounded text-[10px] font-bold whitespace-nowrap transition-all ${
                                item.active 
                                  ? 'bg-emerald-950/50 text-emerald-400 border border-emerald-900/40' 
                                  : 'bg-slate-950 text-slate-500 border-slate-850'
                              }`}
                            >
                              {item.active ? 'เปิดขาย' : 'ปิดชั่วคราว'}
                            </button>
                            <button
                              onClick={() => {
                                setEditingItem(item);
                                setEditName(item.name);
                                setEditPrice(item.price);
                                setEditCategory(item.category);
                                setEditImage(item.image);
                                setEditIsManualCost(!!item.isManualCost);
                                setEditCost(item.cost || 0);
                                setShowEditMenuModal(true);
                              }}
                              className="p-1 hover:bg-slate-800 text-slate-500 hover:text-amber-500 rounded-lg transition-all"
                              title="แก้ไขชื่อและราคาเมนู"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteMenuItem(item.id, item.name)}
                              className="p-1 hover:bg-slate-800 text-slate-500 hover:text-red-500 rounded-lg transition-all"
                              title="ลบเมนูและสูตรนี้"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  }))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* RIGHT PANEL: RECIPE BUILDER (5 columns) */}
        <div className="xl:col-span-5 space-y-4">
          {selectedItemForRecipe ? (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow space-y-4 relative">
              <div className="flex justify-between items-start border-b border-slate-800 pb-4">
                <div className="flex items-center gap-2">
                  <Utensils className="w-5 h-5 text-red-500" />
                  <div>
                    <h3 className="font-bold text-white text-sm">สูตรอาหารและการคำนวณต้นทุน</h3>
                    <p className="text-[11px] text-slate-400">แก้ไขอัตราส่วนวัตถุดิบและ portion จานต่อจาน</p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedItemForRecipe(null)}
                  className="text-slate-500 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Summary of Active Item */}
              <div className="flex gap-3 bg-slate-950 p-3 rounded-xl border border-slate-850 items-center justify-between">
                <div>
                  <h4 className="font-bold text-white text-xs">{selectedItemForRecipe.name}</h4>
                  <p className="text-[10px] text-slate-400 mt-0.5">ราคาหน้าร้าน: <strong className="text-white">{selectedItemForRecipe.price} ฿</strong></p>
                </div>
                <div className="text-right">
                  {selectedItemForRecipe.isManualCost ? (
                    <>
                      <span className="block text-[10px] text-amber-500 font-bold">🔒 ต้นทุนแมนนวล:</span>
                      <span className="font-mono text-xs font-black text-amber-400">
                        {selectedItemForRecipe.cost.toFixed(2)} ฿
                      </span>
                      <span className="block text-[8px] text-slate-500 mt-0.5">จากสูตรจริง: {getRecipeDetails(selectedItemForRecipe).totalCost.toFixed(2)} ฿</span>
                    </>
                  ) : (
                    <>
                      <span className="block text-[10px] text-slate-500">ต้นทุนรวมสูตร:</span>
                      <span className="font-mono text-xs font-bold text-amber-400">
                        {getRecipeDetails(selectedItemForRecipe).totalCost.toFixed(2)} ฿
                      </span>
                    </>
                  )}
                </div>
              </div>

              {/* Recipe Ingredients portion editor */}
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="block text-xs font-bold text-slate-400">รายการส่วนประกอบในสูตร</span>
                  {recipes.some(r => r.menuItemId === selectedItemForRecipe.id) && (
                    <button
                      type="button"
                      onClick={() => handleDeleteRecipe(selectedItemForRecipe.id)}
                      className="text-[10px] text-red-500 hover:text-red-400 font-bold flex items-center gap-1 transition-all"
                    >
                      <Trash2 className="w-3 h-3" /> ล้างสูตรทั้งหมด
                    </button>
                  )}
                </div>
                
                {getRecipeDetails(selectedItemForRecipe).items.length === 0 ? (
                  <p className="text-xs text-slate-500 bg-slate-950 p-4 text-center rounded-xl border border-slate-850">
                    เมนูนี้ยังไม่มีสูตรหักวัตถุดิบอัตโนมัติ คลิกเลือกวัตถุดิบด้านล่างเพื่อผูกสูตร
                  </p>
                ) : (
                  <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                    {getRecipeDetails(selectedItemForRecipe).items.map(constituent => (
                      <div key={constituent.id} className="p-3 bg-slate-950 rounded-xl border border-slate-850 flex items-center justify-between text-xs">
                        <div className="space-y-0.5 flex-1 pr-2">
                          <span className="font-semibold text-slate-200 block truncate">{constituent.name}</span>
                          <span className="text-[10px] text-slate-500 font-mono">ทุนเฉลี่ย: {constituent.unitCost}฿ / {constituent.unit}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex items-center bg-slate-900 border border-slate-800 rounded-lg p-1.5">
                            <input
                              type="number"
                              step="any"
                              value={constituent.amount}
                              onChange={(e) => handleUpdatePortion(constituent.id, parseFloat(e.target.value) || 0)}
                              className="w-14 bg-transparent text-white text-right font-mono font-bold focus:outline-none"
                            />
                            <span className="text-[10px] text-slate-500 font-medium ml-1">{constituent.unit}</span>
                          </div>
                          <span className="font-mono text-slate-400 font-bold min-w-[45px] text-right">{constituent.cost} ฿</span>
                          <button
                            onClick={() => handleDeleteConstituent(constituent.id)}
                            className="p-1 hover:bg-slate-800 text-slate-500 hover:text-red-400 rounded-md transition-all"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Add constituent selection menu */}
              <div className="space-y-2 border-t border-slate-800 pt-4">
                <span className="block text-xs font-bold text-slate-400">เลือกวัตถุดิบอื่นใส่เพิ่มในสูตร</span>
                <div className="grid grid-cols-2 gap-1.5 max-h-[140px] overflow-y-auto pr-1">
                  {ingredients.map(ing => {
                    const isAlreadyIn = getRecipeDetails(selectedItemForRecipe).items.some(c => c.id === ing.id);
                    return (
                      <button
                        key={ing.id}
                        type="button"
                        disabled={isAlreadyIn}
                        onClick={() => handleAddConstituent(ing.id)}
                        className={`p-2 rounded-xl text-left text-[11px] font-semibold border flex justify-between items-center transition-all ${
                          isAlreadyIn
                            ? 'opacity-40 border-slate-850 bg-slate-950 text-slate-600 cursor-not-allowed'
                            : 'border-slate-800 bg-slate-950 text-slate-300 hover:border-slate-600 hover:text-white'
                        }`}
                      >
                        <span className="truncate">{ing.name}</span>
                        <span className="font-mono text-[9px] text-slate-500">+{ing.unit}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

            </div>
          ) : (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 text-center text-slate-500 shadow py-20 flex flex-col items-center justify-center">
              <BookOpen className="w-10 h-10 text-slate-700 mb-2.5" />
              <h4 className="font-bold text-slate-300 text-xs">ตัวช่วยจัดการสูตรอาหาร</h4>
              <p className="text-[10px] text-slate-600 max-w-[220px] mt-1 mx-auto leading-relaxed">
                คลิกเลือกที่ชื่อเมนูอาหารด้านซ้าย หรือคลิก <strong className="text-slate-400">"เปิดดูสูตร"</strong> เพื่อผูกและแก้ไขสูตรวัตถุดิบในการขายตัดสต๊อก
              </p>
            </div>
          )}
        </div>

      </div>

      {/* CREATE NEW MENU MODAL */}
      {showAddMenuModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <form onSubmit={handleAddMenuItem} className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <h4 className="font-bold text-white text-sm">เพิ่มรายการเมนูใหม่</h4>
              <button 
                type="button"
                onClick={() => setShowAddMenuModal(false)}
                className="text-slate-500 hover:text-white p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="space-y-1.5">
                <span className="block text-xs font-semibold text-slate-300">ชื่อเมนูอาหาร</span>
                <input
                  type="text"
                  required
                  placeholder="เช่น กะเพราเป็ดพริกแกงใต้หน่อไม้ดอง"
                  value={newMenuName}
                  onChange={(e) => setNewMenuName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-850 text-white rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-red-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <span className="block text-xs font-semibold text-slate-300">ราคาขายหน้าร้าน (฿)</span>
                  <input
                    type="number"
                    required
                    value={newMenuPrice}
                    onChange={(e) => setNewMenuPrice(parseInt(e.target.value) || 0)}
                    className="w-full bg-slate-950 border border-slate-850 text-white rounded-xl px-3 py-2 text-xs font-mono font-bold focus:outline-none"
                  />
                </div>
                <div className="space-y-1.5">
                  <span className="block text-xs font-semibold text-slate-300">หมวดหมู่</span>
                  <select
                    value={newMenuCategory}
                    onChange={(e) => setNewMenuCategory(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-850 text-white rounded-xl px-3 py-2 text-xs focus:outline-none font-bold"
                  >
                    <option value="กะเพราดั้งเดิม">กะเพราดั้งเดิม</option>
                    <option value="กะเพราฟิวชั่น">กะเพราฟิวชั่น</option>
                    <option value="ซุป/แกง">ซุป/แกง</option>
                    <option value="เครื่องดื่ม">เครื่องดื่ม</option>
                  </select>
                </div>
              </div>

              {/* MANUAL COST SETTINGS */}
              <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-850 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="block text-xs font-bold text-white">⚙️ โหมดตั้งค่าต้นทุนแมนนวล (Manual Cost)</span>
                    <p className="text-[10px] text-slate-500">ติ๊กหากต้องการระบุต้นทุนคงที่เอง โดยไม่อิงตามสูตรอาหาร</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={newMenuIsManualCost}
                    onChange={(e) => setNewMenuIsManualCost(e.target.checked)}
                    className="w-4 h-4 rounded text-red-500 focus:ring-0 cursor-pointer accent-red-600"
                  />
                </div>

                {newMenuIsManualCost && (
                  <div className="space-y-1.5 animate-in fade-in duration-200">
                    <span className="block text-[11px] font-semibold text-slate-300">ระบุต้นทุนขายคงที่ (฿)</span>
                    <input
                      type="number"
                      required={newMenuIsManualCost}
                      value={newMenuCost}
                      onChange={(e) => setNewMenuCost(parseFloat(e.target.value) || 0)}
                      className="w-full bg-slate-900 border border-slate-800 text-white rounded-xl px-3 py-1.5 text-xs font-mono focus:outline-none focus:border-red-500"
                    />
                  </div>
                )}
              </div>

              <div className="space-y-1.5">
                <span className="block text-xs font-semibold text-slate-300">ลิ้งค์ภาพถ่ายเมนู (URL)</span>
                <input
                  type="text"
                  required
                  value={newMenuImage}
                  onChange={(e) => setNewMenuImage(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-850 text-white rounded-xl px-3 py-2 text-xs focus:outline-none"
                />
              </div>
            </div>

            <div className="p-4 bg-slate-950 border-t border-slate-800 flex gap-2">
              <button
                type="button"
                onClick={() => setShowAddMenuModal(false)}
                className="flex-1 py-2 border border-slate-800 hover:bg-slate-900 text-slate-400 rounded-xl text-xs font-semibold"
              >
                ย้อนกลับ
              </button>
              <button
                type="submit"
                className="flex-1 py-2 bg-gradient-to-r from-red-600 to-amber-600 text-white rounded-xl text-xs font-bold"
              >
                บันทึกเมนูใหม่
              </button>
            </div>
          </form>
        </div>
      )}

      {/* EDIT MENU MODAL (MANUAL OVERRIDES SUPPORTED) */}
      {showEditMenuModal && editingItem && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <form onSubmit={handleEditMenuItem} className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <h4 className="font-bold text-white text-sm">แก้ไขและปรับแต่งเมนูอาหาร</h4>
              <button 
                type="button"
                onClick={() => {
                  setShowEditMenuModal(false);
                  setEditingItem(null);
                }}
                className="text-slate-500 hover:text-white p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="space-y-1.5">
                <span className="block text-xs font-semibold text-slate-300">ชื่อเมนูอาหาร</span>
                <input
                  type="text"
                  required
                  placeholder="ชื่อเมนู"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-850 text-white rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-red-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <span className="block text-xs font-semibold text-slate-300">ราคาขายหน้าร้าน (฿)</span>
                  <input
                    type="number"
                    required
                    value={editPrice}
                    onChange={(e) => setEditPrice(parseInt(e.target.value) || 0)}
                    className="w-full bg-slate-950 border border-slate-850 text-white rounded-xl px-3 py-2 text-xs font-mono font-bold focus:outline-none"
                  />
                </div>
                <div className="space-y-1.5">
                  <span className="block text-xs font-semibold text-slate-300">หมวดหมู่</span>
                  <select
                    value={editCategory}
                    onChange={(e) => setEditCategory(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-850 text-white rounded-xl px-3 py-2 text-xs focus:outline-none font-bold"
                  >
                    <option value="กะเพราดั้งเดิม">กะเพราดั้งเดิม</option>
                    <option value="กะเพราฟิวชั่น">กะเพราฟิวชั่น</option>
                    <option value="ซุป/แกง">ซุป/แกง</option>
                    <option value="เครื่องดื่ม">เครื่องดื่ม</option>
                  </select>
                </div>
              </div>

              {/* MANUAL COST CONFIG */}
              <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-850 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="block text-xs font-bold text-white">⚙️ โหมดตั้งค่าต้นทุนแมนนวล (Manual Cost)</span>
                    <p className="text-[10px] text-slate-500">หากเปิดใช้งาน ระบบจะไม่ทับค่าต้นทุนของเมนูนี้แม้สูตรวัตถุดิบจะเปลี่ยนไป</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={editIsManualCost}
                    onChange={(e) => setEditIsManualCost(e.target.checked)}
                    className="w-4 h-4 rounded text-red-500 focus:ring-0 cursor-pointer accent-red-600"
                  />
                </div>

                {editIsManualCost ? (
                  <div className="space-y-1.5 animate-in fade-in duration-200">
                    <span className="block text-[11px] font-semibold text-slate-300">ระบุต้นทุนขายคงที่ (฿)</span>
                    <input
                      type="number"
                      required={editIsManualCost}
                      value={editCost}
                      onChange={(e) => setEditCost(parseFloat(e.target.value) || 0)}
                      className="w-full bg-slate-900 border border-slate-800 text-white rounded-xl px-3 py-1.5 text-xs font-mono focus:outline-none focus:border-red-500"
                    />
                  </div>
                ) : (
                  <div className="text-[10px] text-slate-500 bg-slate-900/30 p-2 rounded-lg border border-slate-900">
                    ℹ️ ระบบคำนวณต้นทุนอัตโนมัติอ้างอิงสูตรวัตถุดิบจริงปัจจุบัน: <strong className="text-white">{getRecipeDetails(editingItem).totalCost} ฿</strong>
                  </div>
                )}
              </div>

              <div className="space-y-1.5">
                <span className="block text-xs font-semibold text-slate-300">ลิ้งค์ภาพถ่ายเมนู (URL)</span>
                <input
                  type="text"
                  required
                  value={editImage}
                  onChange={(e) => setEditImage(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-850 text-white rounded-xl px-3 py-2 text-xs focus:outline-none"
                />
              </div>
            </div>

            <div className="p-4 bg-slate-950 border-t border-slate-800 flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowEditMenuModal(false);
                  setEditingItem(null);
                }}
                className="flex-1 py-2 border border-slate-800 hover:bg-slate-900 text-slate-400 rounded-xl text-xs font-semibold"
              >
                ยกเลิก
              </button>
              <button
                type="submit"
                className="flex-1 py-2 bg-gradient-to-r from-amber-600 to-red-600 text-white rounded-xl text-xs font-bold"
              >
                บันทึกการแก้ไข
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
