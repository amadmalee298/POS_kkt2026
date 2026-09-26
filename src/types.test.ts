import { describe, it, expect } from 'vitest';
import { Order, Expense, Ingredient } from './types';
import { initialOrders as mockOrders, mockExpenses, mockIngredients } from './mockData';

describe('Data Models & Type Integrity Validation', () => {
  describe('Ingredient Interface Mapping', () => {
    it('should correctly structure all initial mock ingredients', () => {
      expect(mockIngredients.length).toBeGreaterThan(0);

      mockIngredients.forEach((ingredient: Ingredient) => {
        expect(typeof ingredient.id).toBe('string');
        expect(ingredient.id.length).toBeGreaterThan(0);
        expect(typeof ingredient.name).toBe('string');
        expect(ingredient.name.length).toBeGreaterThan(0);
        expect(typeof ingredient.stock).toBe('number');
        expect(ingredient.stock).toBeGreaterThanOrEqual(0);
        expect(typeof ingredient.minStock).toBe('number');
        expect(ingredient.minStock).toBeGreaterThanOrEqual(0);
        expect(typeof ingredient.unit).toBe('string');
        expect(ingredient.unit.length).toBeGreaterThan(0);
        expect(typeof ingredient.unitCost).toBe('number');
        expect(ingredient.unitCost).toBeGreaterThanOrEqual(0);

        if (ingredient.expiryDate !== undefined) {
          expect(typeof ingredient.expiryDate).toBe('string');
        }
        if (ingredient.lotNo !== undefined) {
          expect(typeof ingredient.lotNo).toBe('string');
        }
      });
    });

    it('should validate a newly created valid Ingredient object', () => {
      const newIngredient: Ingredient = {
        id: 'i-test-01',
        name: 'วัตถุดิบทดสอบ',
        stock: 50,
        minStock: 10,
        unit: 'kg',
        unitCost: 100,
        expiryDate: '2026-12-31',
        lotNo: 'LOT-TEST-001'
      };

      expect(newIngredient.id).toBe('i-test-01');
      expect(newIngredient.unitCost).toBe(100);
      expect(newIngredient.stock).toBeGreaterThan(newIngredient.minStock);
    });
  });

  describe('Expense Interface Mapping', () => {
    it('should correctly structure all initial mock expenses', () => {
      expect(mockExpenses.length).toBeGreaterThan(0);

      const validCategories = ['Rent', 'Salary', 'Electricity', 'Water', 'Ingredients', 'Marketing', 'Other'];

      mockExpenses.forEach((expense: Expense) => {
        expect(typeof expense.id).toBe('string');
        expect(expense.id.length).toBeGreaterThan(0);
        expect(validCategories).toContain(expense.category);
        expect(typeof expense.amount).toBe('number');
        expect(expense.amount).toBeGreaterThan(0);
        expect(typeof expense.description).toBe('string');
        expect(typeof expense.date).toBe('string');
        expect(typeof expense.branchId).toBe('string');

        if (expense.vatAmount !== undefined) {
          expect(typeof expense.vatAmount).toBe('number');
        }
        if (expense.vatType !== undefined) {
          expect(['INCLUSIVE', 'EXCLUSIVE', 'NO_VAT']).toContain(expense.vatType);
        }
      });
    });

    it('should validate a newly created valid Expense object', () => {
      const newExpense: Expense = {
        id: 'e-test-01',
        category: 'Marketing',
        amount: 2500,
        description: 'ค่าป้ายโฆษณาหน้าสาขา',
        date: '2026-07-22',
        branchId: 'b1',
        vatAmount: 175,
        vatType: 'INCLUSIVE'
      };

      expect(newExpense.id).toBe('e-test-01');
      expect(newExpense.category).toBe('Marketing');
      expect(newExpense.amount).toBe(2500);
    });
  });

  describe('Order Interface Mapping', () => {
    it('should correctly structure all initial mock orders', () => {
      expect(mockOrders.length).toBeGreaterThan(0);

      const validPaymentMethods = ['CASH', 'PROMPTPAY', 'TRANSFER'];
      const validPaymentStatuses = ['PENDING', 'PAID', 'REFUNDED'];
      const validKitchenStatuses = ['PENDING', 'COOKING', 'READY', 'SERVED'];

      mockOrders.forEach((order: Order) => {
        expect(typeof order.id).toBe('string');
        expect(order.id.length).toBeGreaterThan(0);
        expect(typeof order.branchId).toBe('string');
        expect(typeof order.tableNo).toBe('string');
        expect(Array.isArray(order.items)).toBe(true);
        expect(order.items.length).toBeGreaterThan(0);

        // Validate OrderItem array
        order.items.forEach(item => {
          expect(typeof item.id).toBe('string');
          expect(typeof item.menuItemId).toBe('string');
          expect(typeof item.name).toBe('string');
          expect(typeof item.price).toBe('number');
          expect(typeof item.quantity).toBe('number');
          expect(item.quantity).toBeGreaterThan(0);
          expect(typeof item.addFriedEgg).toBe('boolean');
          expect(typeof item.eggPrice).toBe('number');
          expect(typeof item.notes).toBe('string');
        });

        expect(typeof order.subtotal).toBe('number');
        expect(typeof order.discount).toBe('number');
        expect(typeof order.total).toBe('number');
        expect(order.total).toBe(order.subtotal - order.discount);
        expect(validPaymentMethods).toContain(order.paymentMethod);
        expect(validPaymentStatuses).toContain(order.paymentStatus);
        expect(validKitchenStatuses).toContain(order.kitchenStatus);
        expect(typeof order.timestamp).toBe('string');
        expect(typeof order.cashierName).toBe('string');
      });
    });

    it('should validate a newly created valid Order object with splits and tax invoice', () => {
      const newOrder: Order = {
        id: 'TX-TEST-001',
        branchId: 'b1',
        tableNo: '5',
        items: [
          {
            id: 'oi-test-1',
            menuItemId: 'm1',
            name: 'กะเพราเนื้อสับพรีเมียมราดข้าว',
            price: 129,
            quantity: 2,
            addFriedEgg: true,
            eggPrice: 10,
            notes: 'เผ็ดมาก'
          }
        ],
        subtotal: 278,
        discount: 28,
        total: 250,
        paymentMethod: 'PROMPTPAY',
        paymentStatus: 'PAID',
        kitchenStatus: 'SERVED',
        timestamp: new Date().toISOString(),
        cashierName: 'แอดมิน สมชาย'
      };

      expect(newOrder.id).toBe('TX-TEST-001');
      expect(newOrder.items[0].addFriedEgg).toBe(true);
      expect(newOrder.total).toBe(250);
    });
  });
});
