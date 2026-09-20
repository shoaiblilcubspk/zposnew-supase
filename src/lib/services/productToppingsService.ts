/**
 * Product Toppings Service
 * Local-First storage for product to topping associations.
 */

export const productToppingsService = {
  async getByProduct(productId: string): Promise<string[]> {
    try {
      const raw = localStorage.getItem(`product_toppings_${productId}`);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  },

  async setByProduct(productId: string, toppingIds: string[]): Promise<void> {
    try {
      localStorage.setItem(`product_toppings_${productId}`, JSON.stringify(toppingIds));
    } catch (e) {
      console.error('[productToppingsService] Failed to save toppings locally:', e);
    }
  },
};

