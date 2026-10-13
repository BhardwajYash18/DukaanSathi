/**
 * Firestore test utility disabled in standalone mode.
 */
export async function testFirestoreConnection() {
  return { success: true, message: 'Standalone localStore mode active.' };
}
