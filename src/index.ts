import express, { Request, Response } from 'express';
import cors from 'cors';
import { productService } from './services/productService.js';
import { getShippingRate } from './services/shippingService.js';
import { externalAnalyticsService } from './services/externalAnalyticsService.js';

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// List of available external companies (brands) with pagination
app.get('/api/companies', (req: Request, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;
  
  const allCompanies = externalAnalyticsService.getCompanies();
  const startIndex = (page - 1) * limit;
  const endIndex = page * limit;
  
  const results = allCompanies.slice(startIndex, endIndex);
  
  res.json({
    data: results,
    total: allCompanies.length,
    page,
    limit,
    totalPages: Math.ceil(allCompanies.length / limit)
  });
});

// Service A: Internal Inventory Management
app.get('/api/products', async (req: Request, res: Response) => {
  try {
    const products = await productService.getAllProducts();
    res.json(products);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

app.get('/api/stats', async (req: Request, res: Response) => {
  try {
    const stats = await productService.getStats();
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

app.get('/api/health', (req: Request, res: Response) => {
  res.json({
    postgres: "Operational",
    shippingService: "Operational",
    soapInterface: "Standby"
  });
});

// Service C: External Analytics for Different Companies
app.get('/api/products/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const products = await externalAnalyticsService.getProductsByCompany(String(id));
    if (products.length === 0) return res.status(404).json({ error: 'Company not found or no products' });
    res.json(products);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch external products' });
  }
});

app.get('/api/stats/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const stats = await externalAnalyticsService.getStatsByCompany(String(id));
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch external stats' });
  }
});

app.post('/api/products', async (req: Request, res: Response) => {
  const { name, price, stock } = req.body;
  if (!name || price === undefined || stock === undefined) {
    return res.status(400).json({ error: 'Name, price, and stock are required' });
  }
  try {
    const product = await productService.createProduct(name, price, stock);
    res.status(201).json(product);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create product' });
  }
});

app.patch('/api/products/:id/stock', async (req: Request, res: Response) => {
  const { id } = req.params;
  const { stock } = req.body;
  if (stock === undefined) {
    return res.status(400).json({ error: 'Stock is required' });
  }
  try {
    const product = await productService.updateStock(Number(id), stock);
    if (!product) return res.status(404).json({ error: 'Product not found' });
    res.json(product);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update stock' });
  }
});

app.delete('/api/products/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const product = await productService.deleteProduct(Number(id));
    if (!product) return res.status(404).json({ error: 'Product not found' });
    res.json({ message: 'Product deleted successfully', product });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete product' });
  }
});

// Service B: External Global Shipping Simulation
app.get('/api/shipping/rates', (req: Request, res: Response) => {
  const { weight, destination } = req.query;
  
  if (!weight || !destination) {
    return res.status(400).json({ error: 'Weight and destination are required' });
  }

  const rate = getShippingRate(Number(weight), String(destination));
  res.json({ weight: Number(weight), destination, rate });
});

app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});
