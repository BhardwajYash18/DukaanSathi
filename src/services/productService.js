import {
  collection,
  doc,
  addDoc,
  updateDoc,
  query,
  orderBy,
  onSnapshot,
  serverTimestamp,
  increment,
} from 'firebase/firestore';
import { db } from '../lib/firebase';

const PRODUCTS_COLLECTION = 'products';

/**
 * Subscribes to real-time product inventory updates.
 * @param {Function} onUpdate - callback receiving products array
 * @param {Function} onError - callback receiving error
 * @returns {Function} unsubscribe function
 */
export function subscribeToProducts(onUpdate, onError) {
  const q = query(collection(db, PRODUCTS_COLLECTION), orderBy('name', 'asc'));
  return onSnapshot(
    q,
    (snapshot) => {
      const products = [];
      snapshot.forEach((d) => {
        products.push({ id: d.id, ...d.data() });
      });
      onUpdate(products);
    },
    (err) => {
      console.error('[subscribeToProducts error]', err);
      if (onError) onError(err);
    }
  );
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

  const newDoc = {
    name: name.trim(),
    category: category.trim() || 'General',
    sellingPrice: price,
    costPrice: Number(costPrice) || 0,
    stockQuantity: Number(stockQuantity) || 0,
    unit: unit.trim() || 'packet',
    minStockThreshold: Number(minStockThreshold) || 5,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  const ref = await addDoc(collection(db, PRODUCTS_COLLECTION), newDoc);
  return ref.id;
}

/**
 * Updates product details.
 * @param {string} productId
 * @param {Object} updates
 */
export async function updateProduct(productId, updates) {
  if (!productId) throw new Error('Product ID is required');
  const ref = doc(db, PRODUCTS_COLLECTION, productId);
  await updateDoc(ref, {
    ...updates,
    updatedAt: serverTimestamp(),
  });
}

/**
 * Adjusts product stock by adding or subtracting delta.
 * @param {string} productId
 * @param {number} delta
 */
export async function adjustProductStock(productId, delta) {
  if (!productId) throw new Error('Product ID is required');
  const ref = doc(db, PRODUCTS_COLLECTION, productId);
  await updateDoc(ref, {
    stockQuantity: increment(delta),
    updatedAt: serverTimestamp(),
  });
}
