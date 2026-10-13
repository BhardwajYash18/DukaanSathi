import { localStore } from './localStore';

/**
 * Subscribes to real-time product inventory updates.
 * @param {Function} onUpdate - callback receiving products array
 * @param {Function} onError - callback receiving error
 * @returns {Function} unsubscribe function
 */
export function subscribeToProducts(onUpdate, onError) {
  try {
    return localStore.subscribe((data) => {
      // Sort alphabetically by name
      const sorted = [...data.products].sort((a, b) =>
        (a.name || '').localeCompare(b.name || '')
      );
      onUpdate(sorted);
    });
  } catch (err) {
    console.error('[subscribeToProducts error]', err);
    if (onError) onError(err);
    return () => {};
  }
}

/**
 * Adds a new product to inventory.
 * @param {Object} data
 * @returns {Promise<string>}
 */
export async function addProduct({
  name,
  category = 'General',
  sellingPrice,
  costPrice = 0,
  stockQuantity = 0,
  unit = 'packet',
  minStockThreshold = 5,
}) {
  if (!name || !name.trim()) {
    throw new Error('Product name is required');
  }
  const price = Number(sellingPrice);
  if (isNaN(price) || price < 0) {
    throw new Error('Valid selling price is required');
  }

  const now = new Date().toISOString();
  const newProduct = {
    id: `prod-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    name: name.trim(),
    category: category.trim() || 'General',
    sellingPrice: price,
    costPrice: Number(costPrice) || 0,
    stockQuantity: Number(stockQuantity) || 0,
    unit: unit.trim() || 'packet',
    minStockThreshold: Number(minStockThreshold) || 5,
    createdAt: now,
    updatedAt: now,
  };

  localStore.data.products.push(newProduct);
  localStore.save();
  return newProduct.id;
}

/**
 * Updates product details.
 * @param {string} productId
 * @param {Object} updates
 */
export async function updateProduct(productId, updates) {
  if (!productId) throw new Error('Product ID is required');
  const product = localStore.data.products.find((p) => p.id === productId);
  if (!product) throw new Error('Product not found');

  Object.assign(product, updates, {
    updatedAt: new Date().toISOString(),
  });

  localStore.save();
}

/**
 * Adjusts product stock by adding or subtracting delta.
 * @param {string} productId
 * @param {number} delta
 */
export async function adjustProductStock(productId, delta) {
  if (!productId) throw new Error('Product ID is required');
  const product = localStore.data.products.find((p) => p.id === productId);
  if (!product) throw new Error('Product not found');

  const current = Number(product.stockQuantity) || 0;
  product.stockQuantity = Math.max(0, current + Number(delta));
  product.updatedAt = new Date().toISOString();

  localStore.save();
}
