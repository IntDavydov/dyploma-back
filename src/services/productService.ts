import { db } from '../db/index.js';
import { products, orders } from '../db/schema.js';
import { eq, sql } from 'drizzle-orm';

/**
 * Service A: Internal Inventory Management Service
 */
export const productService = {
  async getAllProducts() {
    return await db.select().from(products);
  },

  async getProductById(id: number) {
    const [product] = await db.select().from(products).where(eq(products.id, id));
    return product;
  },

  async createProduct(name: string, price: number, stock: number) {
    const [newProduct] = await db.insert(products).values({ name, price, stock }).returning();
    return newProduct;
  },

  async updateStock(id: number, newStock: number) {
    const [updatedProduct] = await db.update(products)
      .set({ stock: newStock })
      .where(eq(products.id, id))
      .returning();
    return updatedProduct;
  },

  async deleteProduct(id: number) {
    const [deletedProduct] = await db.delete(products).where(eq(products.id, id)).returning();
    return deletedProduct;
  },

  async getStats() {
    const allOrders = await db.select({
      price: products.price,
      name: products.name,
    })
    .from(orders)
    .innerJoin(products, eq(orders.productId, products.id));

    const totalOrders = allOrders.length;
    const totalSales = allOrders.reduce((sum, order) => sum + order.price, 0);
    const averageOrderValue = totalOrders > 0 ? parseFloat((totalSales / totalOrders).toFixed(2)) : 0;

    // Find top product
    const productCounts: Record<string, number> = {};
    allOrders.forEach(order => {
      productCounts[order.name] = (productCounts[order.name] || 0) + 1;
    });

    let topProduct = "N/A";
    let maxCount = 0;
    for (const [name, count] of Object.entries(productCounts)) {
      if (count > maxCount) {
        maxCount = count;
        topProduct = name;
      }
    }

    return {
      totalSales,
      totalOrders,
      averageOrderValue,
      topProduct
    };
  }
};
