import { localStore } from './localStore';

/**
 * Seeds or resets initial common kirana products, customers, and sales in local storage.
 */
export async function seedSampleKiranaData() {
  localStore.resetToDefaults();
  return true;
}
