import axios from 'axios';
import { db } from '../db/index.js';
import { apiCache } from '../db/schema.js';
import { eq } from 'drizzle-orm';

const BRANDS = [
  "Amazon", "Annibale Colombo", "Apple", "Asus", "Attitude", "Bath Trends", "Beats",
  "Calvin Klein", "Casual Comfort", "Chanel", "Chic Cosmetics", "Chrysler",
  "Classic Wear", "Comfort Trends", "Dell", "Dior", "Dodge", "Dolce & Gabbana",
  "Elegance Collection", "Essence", "Fashion Co.", "Fashion Diva", "Fashion Express",
  "Fashion Fun", "Fashion Gold", "Fashion Shades", "Fashion Timepieces", "Fashion Trends",
  "Fashionista", "Furniture Co.", "GadgetMaster", "Generic Motors", "Gigabyte",
  "Glamour Beauty", "Gucci", "Heshe", "Huawei", "IWC", "Kawasaki", "Knoll", "Lenovo",
  "Longines", "MotoGP", "Nail Couture", "Nike", "Off White", "Olay", "Oppo", "Pampi",
  "Prada", "ProVision", "Puma", "Realme", "Rolex", "Samsung", "ScootMaster", "SnapTech",
  "SpeedMaster", "TechGear", "Urban Chic", "Vaseline", "Velvet Touch", "Vivo"
];

const COMPANY_MAP: Record<string, string> = BRANDS.reduce((acc, brand, index) => {
  acc[(index + 1).toString()] = brand;
  return acc;
}, {} as Record<string, string>);

export interface ExternalProduct {
  id: number;
  name: string;
  price: number;
  rating: number;
  stock: number;
  brand: string;
}

const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

export const externalAnalyticsService = {
  getCompanies() {
    return BRANDS.map((brand, index) => ({
      id: (index + 1).toString(),
      name: brand
    }));
  },

  async getFromCache(key: string) {
    const [cached] = await db.select().from(apiCache).where(eq(apiCache.key, key));
    if (cached) {
      const now = new Date().getTime();
      const updated = new Date(cached.updatedAt).getTime();
      if (now - updated < CACHE_TTL_MS) {
        return cached.data;
      }
    }
    return null;
  },

  async saveToCache(key: string, data: any) {
    await db.insert(apiCache)
      .values({
        key,
        data,
        updatedAt: new Date()
      })
      .onConflictDoUpdate({
        target: apiCache.key,
        set: { data, updatedAt: new Date() }
      });
  },

  async getProductsByCompany(companyId: string): Promise<ExternalProduct[]> {
    const cacheKey = `products:${companyId}`;
    const cachedData = await this.getFromCache(cacheKey);
    if (cachedData) return cachedData as ExternalProduct[];

    const brand = COMPANY_MAP[companyId];
    if (!brand) return [];

    try {
      const response = await axios.get(`https://dummyjson.com/products/search?q=${brand}`);
      const products = response.data.products
        .filter((p: any) => p.brand === brand || (brand === "Amazon" && !p.brand))
        .map((p: any) => ({
          id: p.id,
          name: p.title,
          price: p.price,
          stock: p.stock,
          rating: p.rating,
          brand: p.brand
        }));

      await this.saveToCache(cacheKey, products);
      return products;
    } catch (error) {
      console.error('Error fetching external products:', error);
      return [];
    }
  },

  async getStatsByCompany(companyId: string) {
    const cacheKey = `stats:${companyId}`;
    const cachedData = await this.getFromCache(cacheKey);
    if (cachedData) return cachedData;

    const products = await this.getProductsByCompany(companyId);
    if (products.length === 0) {
      return {
        totalSales: 0,
        totalOrders: 0,
        averageOrderValue: 0,
        topProduct: "N/A"
      };
    }

    const totalOrders = products.length;
    const totalSales = products.reduce((sum, p) => sum + p.price, 0);
    const averageOrderValue = parseFloat((totalSales / totalOrders).toFixed(2));
    
    const topProductObj = products.reduce((prev, current) => (prev.rating > current.rating) ? prev : current);

    const stats = {
      totalSales: parseFloat(totalSales.toFixed(2)),
      totalOrders,
      averageOrderValue,
      topProduct: topProductObj.name
    };

    await this.saveToCache(cacheKey, stats);
    return stats;
  }
};
