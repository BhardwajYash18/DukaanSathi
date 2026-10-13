import { addProduct } from './productService';
import { createCustomer } from './customerService';

const SAMPLE_PRODUCTS = [
  { name: 'Aashirvaad Shudh Chakki Atta (5kg)', category: 'Atta & Flours', sellingPrice: 245, costPrice: 220, stockQuantity: 18, unit: 'packet', minStockThreshold: 5 },
  { name: 'Tata Salt Vaccum Evaporated (1kg)', category: 'Spices & Salt', sellingPrice: 28, costPrice: 24, stockQuantity: 35, unit: 'packet', minStockThreshold: 10 },
  { name: 'Fortune Sunlite Refined Sunflower Oil (1L)', category: 'Edible Oils', sellingPrice: 145, costPrice: 130, stockQuantity: 4, unit: 'pouch', minStockThreshold: 8 },
  { name: 'Madhur Pure & Hygienic Sugar (1kg)', category: 'Sugar & Jaggery', sellingPrice: 48, costPrice: 42, stockQuantity: 22, unit: 'kg', minStockThreshold: 10 },
  { name: 'Tata Tea Gold (250g)', category: 'Tea & Coffee', sellingPrice: 135, costPrice: 120, stockQuantity: 3, unit: 'packet', minStockThreshold: 6 },
  { name: 'Parle-G Glucose Biscuits (800g)', category: 'Biscuits & Snacks', sellingPrice: 75, costPrice: 65, stockQuantity: 14, unit: 'pack', minStockThreshold: 5 },
  { name: 'Surf Excel Quick Wash Detergent Powder (1kg)', category: 'Cleaning & Household', sellingPrice: 160, costPrice: 142, stockQuantity: 8, unit: 'packet', minStockThreshold: 5 },
  { name: 'Dettol Original Bathing Soap (75g x 4)', category: 'Personal Care', sellingPrice: 120, costPrice: 105, stockQuantity: 12, unit: 'pack', minStockThreshold: 4 },
];

const SAMPLE_CUSTOMERS = [
  { name: 'Ramesh Sharma', phone: '9812345678', address: 'Gali 3, Near Shiv Mandir' },
  { name: 'Sunita Verma', phone: '9876501234', address: 'Plot 45, Main Market' },
  { name: 'Manoj Gupta (Teacherji)', phone: '9711223344', address: 'Sector 4, Block B' },
];

/**
 * Seeds initial common kirana products and customers into Firestore if empty.
 */
export async function seedSampleKiranaData() {
  const productPromises = SAMPLE_PRODUCTS.map((prod) => addProduct(prod));
  const customerPromises = SAMPLE_CUSTOMERS.map((cust) => createCustomer(cust));
  await Promise.all([...productPromises, ...customerPromises]);
}
