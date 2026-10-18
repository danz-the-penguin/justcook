// src/lib/storage/save-slots-db.ts
// Robust browser-local save slot manager powered by IndexedDB with localStorage fallback.
// Capable of storing snapshots with full embedded Base64 user assets without 5MB quota limits.

export interface LocalSaveSlot {
  id: string;
  name: string;
  savedAt: string;
  itemCount: number;
  hasAssets?: boolean;
  assetCount?: number;
  payload: any;
}

const DB_NAME = 'pantry_chef_db';
const DB_VERSION = 1;
const STORE_NAME = 'save_slots';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      return reject(new Error('IndexedDB is not supported in this environment'));
    }
    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// Automatically migrates any legacy slots stored in localStorage into IndexedDB
async function migrateLegacyLocalStorage(db: IDBDatabase): Promise<void> {
  try {
    if (typeof window === 'undefined') return;
    const legacy = localStorage.getItem('justcook_save_slots');
    if (!legacy) return;

    const parsed: LocalSaveSlot[] = JSON.parse(legacy);
    if (Array.isArray(parsed) && parsed.length > 0) {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      for (const slot of parsed) {
        store.put(slot);
      }
      await new Promise<void>((resolve, reject) => {
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
      // Clear legacy localStorage once safely migrated
      localStorage.removeItem('justcook_save_slots');
    }
  } catch (err) {
    console.warn('Could not migrate legacy save slots:', err);
  }
}

export async function getAllSaveSlots(): Promise<LocalSaveSlot[]> {
  try {
    const db = await openDB();
    await migrateLegacyLocalStorage(db);

    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.getAll();

      req.onsuccess = () => {
        const slots = (req.result || []) as LocalSaveSlot[];
        // Sort newest first
        slots.sort((a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime());
        resolve(slots);
      };
      req.onerror = () => reject(req.error);
    });
  } catch {
    // Fallback to localStorage if IndexedDB is disabled or blocked
    if (typeof window !== 'undefined') {
      try {
        const raw = localStorage.getItem('justcook_save_slots');
        const parsed = raw ? JSON.parse(raw) : [];
        parsed.sort((a: LocalSaveSlot, b: LocalSaveSlot) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime());
        return parsed;
      } catch {}
    }
    return [];
  }
}

export async function saveSlot(slot: LocalSaveSlot): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(slot);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch {
    // Fallback to localStorage
    if (typeof window !== 'undefined') {
      try {
        const raw = localStorage.getItem('justcook_save_slots');
        const list: LocalSaveSlot[] = raw ? JSON.parse(raw) : [];
        const idx = list.findIndex((s) => s.id === slot.id);
        if (idx >= 0) list[idx] = slot;
        else list.unshift(slot);
        localStorage.setItem('justcook_save_slots', JSON.stringify(list));
      } catch (err) {
        console.error('Failed to save slot to localStorage fallback:', err);
      }
    }
  }
}

export async function deleteSaveSlot(slotId: string): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.delete(slotId);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch {
    if (typeof window !== 'undefined') {
      try {
        const raw = localStorage.getItem('justcook_save_slots');
        const list: LocalSaveSlot[] = raw ? JSON.parse(raw) : [];
        const filtered = list.filter((s) => s.id !== slotId);
        localStorage.setItem('justcook_save_slots', JSON.stringify(filtered));
      } catch {}
    }
  }
}
