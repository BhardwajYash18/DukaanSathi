import {
  collection,
  addDoc,
  getDocs,
  serverTimestamp,
  query,
  limit,
  orderBy,
} from "firebase/firestore";
import { db } from "./firebase";

/**
 * Tests Firestore connectivity by:
 * 1. Writing a test document to 'connection_tests' collection using serverTimestamp().
 * 2. Reading back documents from 'connection_tests'.
 *
 * @param {Object} options
 * @param {boolean} [options.throwOnError=false] - Whether to rethrow exceptions.
 * @returns {Promise<{
 *   success: boolean;
 *   message: string;
 *   documentId?: string;
 *   readCount?: number;
 *   error?: { code?: string; message: string };
 * }>}
 */
export async function testFirestoreConnection(options = { throwOnError: false }) {
  try {
    const testCollectionRef = collection(db, "connection_tests");

    // 1. Write a test document with a server timestamp
    const writeData = {
      testName: "DukaanSathi Connection Verification",
      createdAt: serverTimestamp(),
      clientTimestamp: new Date().toISOString(),
      platform: "web",
    };

    const docRef = await addDoc(testCollectionRef, writeData);

    // 2. Read back from the collection
    // Query recent test docs to verify read permissions as well
    let readCount = 0;
    try {
      const q = query(testCollectionRef, orderBy("createdAt", "desc"), limit(5));
      const snapshot = await getDocs(q);
      readCount = snapshot.size;
    } catch (queryErr) {
      // In case ordering requires an index that is pending, fallback to simple collection read
      console.warn(
        "[Firestore Test] Ordered query failed, falling back to base collection read:",
        queryErr?.message
      );
      const snapshot = await getDocs(testCollectionRef);
      readCount = snapshot.size;
    }

    return {
      success: true,
      message: `Firestore connection verified! Successfully wrote doc '${docRef.id}' and read ${readCount} document(s).`,
      documentId: docRef.id,
      readCount,
    };
  } catch (err) {
    console.error("[Firestore Connection Test Failed]", {
      code: err?.code,
      message: err?.message,
    });

    if (options.throwOnError) {
      throw err;
    }

    return {
      success: false,
      message: err?.message || "Failed to connect to Firestore.",
      error: {
        code: err?.code || "unknown",
        message: err?.message || "An unknown error occurred during Firestore test.",
      },
    };
  }
}
