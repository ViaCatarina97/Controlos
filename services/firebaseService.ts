import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously } from 'firebase/auth';
import { 
  getFirestore, doc, getDoc, getDocs, setDoc, deleteDoc, collection, 
  query, getDocFromServer, writeBatch 
} from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';
import { 
  AppSettings, Employee, StaffingTableEntry, HistoryEntry, 
  DailySchedule, DeliveryRecord, CreditNoteRecord, MonthlyOperationalData 
} from '../types';
import { INITIAL_RESTAURANTS, MOCK_EMPLOYEES, DEFAULT_STAFFING_TABLE, MOCK_HISTORY } from '../constants';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId); /* CRITICAL: The app will break without this line */
export const auth = getAuth();

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

// Quota and connection states
let quotaExceeded = false;
const quotaListeners = new Set<(status: boolean) => void>();

export function getQuotaExceeded(): boolean {
  return quotaExceeded;
}

export function subscribeToQuotaChange(listener: (status: boolean) => void) {
  quotaListeners.add(listener);
  listener(quotaExceeded);
  return () => {
    quotaListeners.delete(listener);
  };
}

export function setQuotaExceeded(val: boolean) {
  if (quotaExceeded !== val) {
    quotaExceeded = val;
    quotaListeners.forEach(l => {
      try {
        l(quotaExceeded);
      } catch (err) {
        console.error("Error in quota change subscriber:", err);
      }
    });
  }
}

function isQuotaError(error: unknown): boolean {
  if (!error) return false;
  const msg = error instanceof Error ? error.message : String(error);
  return (
    msg.toLowerCase().includes('quota exceeded') ||
    msg.toLowerCase().includes('quota-exceeded') ||
    msg.toLowerCase().includes('resource-exhausted') ||
    msg.toLowerCase().includes('resource_exhausted') ||
    (typeof error === 'object' && 'code' in error && (error as any).code === 'resource-exhausted')
  );
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  if (isQuotaError(error)) {
    setQuotaExceeded(true);
  }
}

export async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (isQuotaError(error)) {
      setQuotaExceeded(true);
    }
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Please check your Firebase configuration.");
    }
  }
}

// Ensure the user is authenticated anonymously so rules can verify identity if enabled
export async function ensureAuthenticated(): Promise<string | null> {
  if (auth.currentUser) {
    return auth.currentUser.uid;
  }
  try {
    const cred = await signInAnonymously(auth);
    return cred.user.uid;
  } catch (error) {
    console.warn("Anonymous authentication failed or not enabled in the Firebase Console. Continuing with unauthenticated session.", error);
    return null;
  }
}

// Tests connection on startup
testConnection();

// --- DB GENERIC RUNNER WRAPPERS ---

async function runFirestoreOp<T>(
  op: () => Promise<T>,
  localFallback: () => T | Promise<T>,
  operationType: OperationType,
  path: string | null
): Promise<T> {
  if (quotaExceeded) {
    console.warn(`[Quota Fallback Mode] Reading ${path} directly from localStorage`);
    return await localFallback();
  }
  try {
    return await op();
  } catch (error) {
    if (isQuotaError(error)) {
      console.warn(`[Quota Limit Exceeded] Firestore quota error on ${operationType} ${path}. Switching dynamically to localStorage.`);
      setQuotaExceeded(true);
      return await localFallback();
    }
    handleFirestoreError(error, operationType, path);
    console.warn(`[Firestore Read Error] Falling back to local storage for ${path}`);
    return await localFallback();
  }
}

async function runFirestoreWrite(
  op: () => Promise<void>,
  localFallback: () => void | Promise<void>,
  operationType: OperationType,
  path: string | null
): Promise<void> {
  if (quotaExceeded) {
    await localFallback();
    return;
  }
  try {
    await op();
  } catch (error) {
    if (isQuotaError(error)) {
      console.warn(`[Quota Limit Exceeded] Firestore write quota hit during ${operationType} on ${path}. Saving to localStorage.`);
      setQuotaExceeded(true);
      await localFallback();
      return;
    }
    handleFirestoreError(error, operationType, path);
    console.warn(`[Firestore Write Error] Swapping to local storage write: ${error}`);
    await localFallback();
  }
}

// --- RESTAURANTS OPERATIONS ---

export async function getRestaurants(): Promise<AppSettings[]> {
  await ensureAuthenticated();
  const path = 'restaurants';
  return runFirestoreOp<AppSettings[]>(
    async () => {
      const q = collection(db, 'restaurants');
      const snap = await getDocs(q);
      const list = snap.docs.map(d => d.data() as AppSettings);
      localStorage.setItem('app_all_restaurants', JSON.stringify(list));
      return list;
    },
    () => {
      const saved = localStorage.getItem('app_all_restaurants');
      return saved ? JSON.parse(saved) : INITIAL_RESTAURANTS;
    },
    OperationType.LIST,
    path
  );
}

export async function getRestaurant(restaurantId: string): Promise<AppSettings | null> {
  await ensureAuthenticated();
  const path = `restaurants/${restaurantId}`;
  return runFirestoreOp<AppSettings | null>(
    async () => {
      const dRef = doc(db, 'restaurants', restaurantId);
      const snap = await getDoc(dRef);
      const res = snap.exists() ? (snap.data() as AppSettings) : null;
      if (res) {
        // Sync local list
        const saved = localStorage.getItem('app_all_restaurants');
        let list: AppSettings[] = saved ? JSON.parse(saved) : [];
        list = list.filter(r => r.restaurantId !== restaurantId);
        list.push(res);
        localStorage.setItem('app_all_restaurants', JSON.stringify(list));
      }
      return res;
    },
    () => {
      const saved = localStorage.getItem('app_all_restaurants');
      if (saved) {
        const list = JSON.parse(saved) as AppSettings[];
        return list.find(r => r.restaurantId === restaurantId) || null;
      }
      return INITIAL_RESTAURANTS.find(r => r.restaurantId === restaurantId) || null;
    },
    OperationType.GET,
    path
  );
}

export async function saveRestaurant(restaurant: AppSettings): Promise<void> {
  await ensureAuthenticated();
  const path = `restaurants/${restaurant.restaurantId}`;
  return runFirestoreWrite(
    async () => {
      await setDoc(doc(db, 'restaurants', restaurant.restaurantId), restaurant);
      // Mirror locally
      const saved = localStorage.getItem('app_all_restaurants');
      let list: AppSettings[] = saved ? JSON.parse(saved) : [];
      list = list.filter(r => r.restaurantId !== restaurant.restaurantId);
      list.push(restaurant);
      localStorage.setItem('app_all_restaurants', JSON.stringify(list));
    },
    () => {
      const saved = localStorage.getItem('app_all_restaurants');
      let list: AppSettings[] = saved ? JSON.parse(saved) : [];
      list = list.filter(r => r.restaurantId !== restaurant.restaurantId);
      list.push(restaurant);
      localStorage.setItem('app_all_restaurants', JSON.stringify(list));
    },
    OperationType.WRITE,
    path
  );
}

// --- EMPLOYEES OPERATIONS ---

export async function getEmployees(restaurantId: string): Promise<Employee[]> {
  await ensureAuthenticated();
  const path = `restaurants/${restaurantId}/employees`;
  return runFirestoreOp<Employee[]>(
    async () => {
      const q = collection(db, 'restaurants', restaurantId, 'employees');
      const snap = await getDocs(q);
      const list = snap.docs.map(d => d.data() as Employee);
      localStorage.setItem(`app_employees_${restaurantId}`, JSON.stringify(list));
      localStorage.setItem(`app_employees_${restaurantId}_synced`, JSON.stringify(list));
      return list;
    },
    () => {
      const saved = localStorage.getItem(`app_employees_${restaurantId}`);
      return saved ? JSON.parse(saved) : MOCK_EMPLOYEES;
    },
    OperationType.LIST,
    path
  );
}

export async function saveEmployees(restaurantId: string, employees: Employee[]): Promise<void> {
  await ensureAuthenticated();
  const path = `restaurants/${restaurantId}/employees`;
  const saved = localStorage.getItem(`app_employees_${restaurantId}_synced`);
  const previousList: Employee[] = saved ? JSON.parse(saved) : [];

  return runFirestoreWrite(
    async () => {
      const prevMap = new Map(previousList.map(item => [item.id, item]));
      const nextMap = new Map(employees.map(item => [item.id, item]));
      
      const toWrite: Employee[] = [];
      const toDelete: string[] = [];

      for (const item of employees) {
        const prev = prevMap.get(item.id);
        if (!prev || JSON.stringify(prev) !== JSON.stringify(item)) {
          toWrite.push(item);
        }
      }

      for (const prev of previousList) {
        if (!nextMap.has(prev.id)) {
          toDelete.push(prev.id);
        }
      }

      if (toWrite.length === 0 && toDelete.length === 0) {
        return;
      }

      const batch = writeBatch(db);
      for (const emp of toWrite) {
        const dRef = doc(db, 'restaurants', restaurantId, 'employees', emp.id);
        batch.set(dRef, emp);
      }
      for (const idToDelete of toDelete) {
        const dRef = doc(db, 'restaurants', restaurantId, 'employees', idToDelete);
        batch.delete(dRef);
      }
      await batch.commit();
      localStorage.setItem(`app_employees_${restaurantId}`, JSON.stringify(employees));
      localStorage.setItem(`app_employees_${restaurantId}_synced`, JSON.stringify(employees));
    },
    () => {
      localStorage.setItem(`app_employees_${restaurantId}`, JSON.stringify(employees));
    },
    OperationType.WRITE,
    path
  );
}

// --- STAFFING TABLE OPERATIONS ---

export async function getStaffingTable(restaurantId: string): Promise<StaffingTableEntry[]> {
  await ensureAuthenticated();
  const path = `restaurants/${restaurantId}/staffing_table`;
  return runFirestoreOp<StaffingTableEntry[]>(
    async () => {
      const q = collection(db, 'restaurants', restaurantId, 'staffing_table');
      const snap = await getDocs(q);
      const list = snap.docs.map(d => d.data() as StaffingTableEntry);
      localStorage.setItem(`app_staffing_table_${restaurantId}`, JSON.stringify(list));
      localStorage.setItem(`app_staffing_table_${restaurantId}_synced`, JSON.stringify(list));
      return list;
    },
    () => {
      const saved = localStorage.getItem(`app_staffing_table_${restaurantId}`);
      return saved ? JSON.parse(saved) : DEFAULT_STAFFING_TABLE;
    },
    OperationType.LIST,
    path
  );
}

export async function saveStaffingTable(restaurantId: string, staffing: StaffingTableEntry[]): Promise<void> {
  await ensureAuthenticated();
  const path = `restaurants/${restaurantId}/staffing_table`;
  const saved = localStorage.getItem(`app_staffing_table_${restaurantId}_synced`);
  const previousList: StaffingTableEntry[] = saved ? JSON.parse(saved) : [];

  return runFirestoreWrite(
    async () => {
      const prevMap = new Map(previousList.map(item => [item.id, item]));
      const nextMap = new Map(staffing.map(item => [item.id, item]));
      
      const toWrite: StaffingTableEntry[] = [];
      const toDelete: string[] = [];

      for (const item of staffing) {
        const prev = prevMap.get(item.id);
        if (!prev || JSON.stringify(prev) !== JSON.stringify(item)) {
          toWrite.push(item);
        }
      }

      for (const prev of previousList) {
        if (!nextMap.has(prev.id)) {
          toDelete.push(prev.id);
        }
      }

      if (toWrite.length === 0 && toDelete.length === 0) {
        return;
      }

      const batch = writeBatch(db);
      for (const s of toWrite) {
        const dRef = doc(db, 'restaurants', restaurantId, 'staffing_table', s.id);
        batch.set(dRef, s);
      }
      for (const idToDelete of toDelete) {
        const dRef = doc(db, 'restaurants', restaurantId, 'staffing_table', idToDelete);
        batch.delete(dRef);
      }
      await batch.commit();
      localStorage.setItem(`app_staffing_table_${restaurantId}`, JSON.stringify(staffing));
      localStorage.setItem(`app_staffing_table_${restaurantId}_synced`, JSON.stringify(staffing));
    },
    () => {
      localStorage.setItem(`app_staffing_table_${restaurantId}`, JSON.stringify(staffing));
    },
    OperationType.WRITE,
    path
  );
}

// --- HISTORY OPERATIONS ---

export async function getHistory(restaurantId: string): Promise<HistoryEntry[]> {
  await ensureAuthenticated();
  const path = `restaurants/${restaurantId}/history`;
  return runFirestoreOp<HistoryEntry[]>(
    async () => {
      const q = collection(db, 'restaurants', restaurantId, 'history');
      const snap = await getDocs(q);
      const list = snap.docs.map(d => d.data() as HistoryEntry);
      localStorage.setItem(`app_history_detailed_${restaurantId}`, JSON.stringify(list));
      localStorage.setItem(`app_history_detailed_${restaurantId}_synced`, JSON.stringify(list));
      return list;
    },
    () => {
      const saved = localStorage.getItem(`app_history_detailed_${restaurantId}`);
      return saved ? JSON.parse(saved) : MOCK_HISTORY;
    },
    OperationType.LIST,
    path
  );
}

export async function saveHistory(restaurantId: string, history: HistoryEntry[]): Promise<void> {
  await ensureAuthenticated();
  const path = `restaurants/${restaurantId}/history`;
  const saved = localStorage.getItem(`app_history_detailed_${restaurantId}_synced`);
  const previousList: HistoryEntry[] = saved ? JSON.parse(saved) : [];

  return runFirestoreWrite(
    async () => {
      const prevMap = new Map(previousList.map(h => [h.id, h]));
      const nextMap = new Map(history.map(h => [h.id, h]));
      
      const toWrite: HistoryEntry[] = [];
      const toDelete: string[] = [];

      for (const h of history) {
        const prev = prevMap.get(h.id);
        if (!prev || JSON.stringify(prev) !== JSON.stringify(h)) {
          toWrite.push(h);
        }
      }

      for (const prev of previousList) {
        if (!nextMap.has(prev.id)) {
          toDelete.push(prev.id);
        }
      }

      if (toWrite.length === 0 && toDelete.length === 0) {
        return;
      }

      const batchSize = 200;
      let currentBatch = writeBatch(db);
      let opCount = 0;

      const commitIfNeeded = async () => {
        if (opCount >= batchSize) {
          await currentBatch.commit();
          currentBatch = writeBatch(db);
          opCount = 0;
        }
      };

      for (const h of toWrite) {
        const dRef = doc(db, 'restaurants', restaurantId, 'history', h.id);
        currentBatch.set(dRef, h);
        opCount++;
        await commitIfNeeded();
      }

      for (const idToDelete of toDelete) {
        const dRef = doc(db, 'restaurants', restaurantId, 'history', idToDelete);
        currentBatch.delete(dRef);
        opCount++;
        await commitIfNeeded();
      }

      if (opCount > 0) {
        await currentBatch.commit();
      }

      localStorage.setItem(`app_history_detailed_${restaurantId}`, JSON.stringify(history));
      localStorage.setItem(`app_history_detailed_${restaurantId}_synced`, JSON.stringify(history));
    },
    () => {
      localStorage.setItem(`app_history_detailed_${restaurantId}`, JSON.stringify(history));
    },
    OperationType.WRITE,
    path
  );
}

// --- SCHEDULES OPERATIONS ---

export async function getSchedules(restaurantId: string): Promise<DailySchedule[]> {
  await ensureAuthenticated();
  const path = `restaurants/${restaurantId}/schedules`;
  return runFirestoreOp<DailySchedule[]>(
    async () => {
      const q = collection(db, 'restaurants', restaurantId, 'schedules');
      const snap = await getDocs(q);
      const list = snap.docs.map(d => d.data() as DailySchedule);
      localStorage.setItem(`app_schedules_${restaurantId}`, JSON.stringify(list));
      return list;
    },
    () => {
      const saved = localStorage.getItem(`app_schedules_${restaurantId}`);
      return saved ? JSON.parse(saved) : [];
    },
    OperationType.LIST,
    path
  );
}

export async function saveScheduleDoc(restaurantId: string, schedule: DailySchedule): Promise<void> {
  await ensureAuthenticated();
  const path = `restaurants/${restaurantId}/schedules/${schedule.date}`;
  return runFirestoreWrite(
    async () => {
      const dRef = doc(db, 'restaurants', restaurantId, 'schedules', schedule.date);
      await setDoc(dRef, schedule);
      
      const saved = localStorage.getItem(`app_schedules_${restaurantId}`);
      let list: DailySchedule[] = saved ? JSON.parse(saved) : [];
      list = list.filter(s => s.date !== schedule.date);
      list.push(schedule);
      localStorage.setItem(`app_schedules_${restaurantId}`, JSON.stringify(list));
    },
    () => {
      const saved = localStorage.getItem(`app_schedules_${restaurantId}`);
      let list: DailySchedule[] = saved ? JSON.parse(saved) : [];
      list = list.filter(s => s.date !== schedule.date);
      list.push(schedule);
      localStorage.setItem(`app_schedules_${restaurantId}`, JSON.stringify(list));
    },
    OperationType.WRITE,
    path
  );
}

export async function deleteScheduleDoc(restaurantId: string, date: string): Promise<void> {
  await ensureAuthenticated();
  const path = `restaurants/${restaurantId}/schedules/${date}`;
  return runFirestoreWrite(
    async () => {
      const dRef = doc(db, 'restaurants', restaurantId, 'schedules', date);
      await deleteDoc(dRef);
      
      const saved = localStorage.getItem(`app_schedules_${restaurantId}`);
      if (saved) {
        let list: DailySchedule[] = JSON.parse(saved);
        list = list.filter(s => s.date !== date);
        localStorage.setItem(`app_schedules_${restaurantId}`, JSON.stringify(list));
      }
    },
    () => {
      const saved = localStorage.getItem(`app_schedules_${restaurantId}`);
      if (saved) {
        let list: DailySchedule[] = JSON.parse(saved);
        list = list.filter(s => s.date !== date);
        localStorage.setItem(`app_schedules_${restaurantId}`, JSON.stringify(list));
      }
    },
    OperationType.DELETE,
    path
  );
}

// --- DELIVERIES ---

export async function getDeliveries(restaurantId: string): Promise<DeliveryRecord[]> {
  await ensureAuthenticated();
  const path = `restaurants/${restaurantId}/deliveries`;
  return runFirestoreOp<DeliveryRecord[]>(
    async () => {
      const q = collection(db, 'restaurants', restaurantId, 'deliveries');
      const snap = await getDocs(q);
      const list = snap.docs.map(d => d.data() as DeliveryRecord);
      localStorage.setItem(`app_deliveries_${restaurantId}`, JSON.stringify(list));
      return list;
    },
    () => {
      const saved = localStorage.getItem(`app_deliveries_${restaurantId}`);
      return saved ? JSON.parse(saved) : [];
    },
    OperationType.LIST,
    path
  );
}

export async function saveDeliveryDoc(restaurantId: string, delivery: DeliveryRecord): Promise<void> {
  await ensureAuthenticated();
  const path = `restaurants/${restaurantId}/deliveries/${delivery.id}`;
  return runFirestoreWrite(
    async () => {
      const dRef = doc(db, 'restaurants', restaurantId, 'deliveries', delivery.id);
      await setDoc(dRef, delivery);
      
      const saved = localStorage.getItem(`app_deliveries_${restaurantId}`);
      let list: DeliveryRecord[] = saved ? JSON.parse(saved) : [];
      list = list.filter(d => d.id !== delivery.id);
      list.push(delivery);
      localStorage.setItem(`app_deliveries_${restaurantId}`, JSON.stringify(list));
    },
    () => {
      const saved = localStorage.getItem(`app_deliveries_${restaurantId}`);
      let list: DeliveryRecord[] = saved ? JSON.parse(saved) : [];
      list = list.filter(d => d.id !== delivery.id);
      list.push(delivery);
      localStorage.setItem(`app_deliveries_${restaurantId}`, JSON.stringify(list));
    },
    OperationType.WRITE,
    path
  );
}

export async function deleteDeliveryDoc(restaurantId: string, id: string): Promise<void> {
  await ensureAuthenticated();
  const path = `restaurants/${restaurantId}/deliveries/${id}`;
  return runFirestoreWrite(
    async () => {
      const dRef = doc(db, 'restaurants', restaurantId, 'deliveries', id);
      await deleteDoc(dRef);
      
      const saved = localStorage.getItem(`app_deliveries_${restaurantId}`);
      if (saved) {
        let list: DeliveryRecord[] = JSON.parse(saved);
        list = list.filter(d => d.id !== id);
        localStorage.setItem(`app_deliveries_${restaurantId}`, JSON.stringify(list));
      }
    },
    () => {
      const saved = localStorage.getItem(`app_deliveries_${restaurantId}`);
      if (saved) {
        let list: DeliveryRecord[] = JSON.parse(saved);
        list = list.filter(d => d.id !== id);
        localStorage.setItem(`app_deliveries_${restaurantId}`, JSON.stringify(list));
      }
    },
    OperationType.DELETE,
    path
  );
}

// --- CREDIT NOTES ---

export async function getCredits(restaurantId: string): Promise<CreditNoteRecord[]> {
  await ensureAuthenticated();
  const path = `restaurants/${restaurantId}/credits`;
  return runFirestoreOp<CreditNoteRecord[]>(
    async () => {
      const q = collection(db, 'restaurants', restaurantId, 'credits');
      const snap = await getDocs(q);
      const list = snap.docs.map(d => d.data() as CreditNoteRecord);
      localStorage.setItem(`app_credits_${restaurantId}`, JSON.stringify(list));
      return list;
    },
    () => {
      const saved = localStorage.getItem(`app_credits_${restaurantId}`);
      return saved ? JSON.parse(saved) : [];
    },
    OperationType.LIST,
    path
  );
}

export async function saveCreditDoc(restaurantId: string, credit: CreditNoteRecord): Promise<void> {
  await ensureAuthenticated();
  const path = `restaurants/${restaurantId}/credits/${credit.id}`;
  return runFirestoreWrite(
    async () => {
      const dRef = doc(db, 'restaurants', restaurantId, 'credits', credit.id);
      await setDoc(dRef, credit);
      
      const saved = localStorage.getItem(`app_credits_${restaurantId}`);
      let list: CreditNoteRecord[] = saved ? JSON.parse(saved) : [];
      list = list.filter(c => c.id !== credit.id);
      list.push(credit);
      localStorage.setItem(`app_credits_${restaurantId}`, JSON.stringify(list));
    },
    () => {
      const saved = localStorage.getItem(`app_credits_${restaurantId}`);
      let list: CreditNoteRecord[] = saved ? JSON.parse(saved) : [];
      list = list.filter(c => c.id !== credit.id);
      list.push(credit);
      localStorage.setItem(`app_credits_${restaurantId}`, JSON.stringify(list));
    },
    OperationType.WRITE,
    path
  );
}

export async function deleteCreditDoc(restaurantId: string, id: string): Promise<void> {
  await ensureAuthenticated();
  const path = `restaurants/${restaurantId}/credits/${id}`;
  return runFirestoreWrite(
    async () => {
      const dRef = doc(db, 'restaurants', restaurantId, 'credits', id);
      await deleteDoc(dRef);
      
      const saved = localStorage.getItem(`app_credits_${restaurantId}`);
      if (saved) {
        let list: CreditNoteRecord[] = JSON.parse(saved);
        list = list.filter(c => c.id !== id);
        localStorage.setItem(`app_credits_${restaurantId}`, JSON.stringify(list));
      }
    },
    () => {
      const saved = localStorage.getItem(`app_credits_${restaurantId}`);
      if (saved) {
        let list: CreditNoteRecord[] = JSON.parse(saved);
        list = list.filter(c => c.id !== id);
        localStorage.setItem(`app_credits_${restaurantId}`, JSON.stringify(list));
      }
    },
    OperationType.DELETE,
    path
  );
}

// --- MONTHLY OPTIONS ---

export async function getMonthlyOps(restaurantId: string, month: string): Promise<MonthlyOperationalData | null> {
  await ensureAuthenticated();
  const path = `restaurants/${restaurantId}/monthly_ops/${month}`;
  return runFirestoreOp<MonthlyOperationalData | null>(
    async () => {
      const dRef = doc(db, 'restaurants', restaurantId, 'monthly_ops', month);
      const snap = await getDoc(dRef);
      const data = snap.exists() ? (snap.data() as MonthlyOperationalData) : null;
      if (data) {
        localStorage.setItem(`app_monthly_ops_${restaurantId}_${month}`, JSON.stringify(data));
      }
      return data;
    },
    () => {
      const saved = localStorage.getItem(`app_monthly_ops_${restaurantId}_${month}`);
      return saved ? JSON.parse(saved) : null;
    },
    OperationType.GET,
    path
  );
}

export async function saveMonthlyOps(restaurantId: string, monthlyData: MonthlyOperationalData): Promise<void> {
  await ensureAuthenticated();
  const path = `restaurants/${restaurantId}/monthly_ops/${monthlyData.month}`;
  return runFirestoreWrite(
    async () => {
      const dRef = doc(db, 'restaurants', restaurantId, 'monthly_ops', monthlyData.month);
      await setDoc(dRef, monthlyData);
      localStorage.setItem(`app_monthly_ops_${restaurantId}_${monthlyData.month}`, JSON.stringify(monthlyData));
    },
    () => {
      localStorage.setItem(`app_monthly_ops_${restaurantId}_${monthlyData.month}`, JSON.stringify(monthlyData));
    },
    OperationType.WRITE,
    path
  );
}
