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
  throw new Error(JSON.stringify(errInfo));
}

export async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Please check your Firebase configuration.");
    }
  }
}

// Ensure the user is authenticated anonymously so rules can verify identity
export async function ensureAuthenticated(): Promise<string> {
  if (auth.currentUser) {
    return auth.currentUser.uid;
  }
  try {
    const cred = await signInAnonymously(auth);
    return cred.user.uid;
  } catch (error) {
    console.error("Anonymous authentication failed", error);
    throw error;
  }
}

// Tests connection on startup
testConnection();

// --- RESTAURANTS OPERATIONS ---

export async function getRestaurants(): Promise<AppSettings[]> {
  await ensureAuthenticated();
  const path = 'restaurants';
  try {
    const q = collection(db, path);
    const snap = await getDocs(q);
    return snap.docs.map(d => d.data() as AppSettings);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
    return [];
  }
}

export async function getRestaurant(restaurantId: string): Promise<AppSettings | null> {
  await ensureAuthenticated();
  const path = `restaurants/${restaurantId}`;
  try {
    const dRef = doc(db, 'restaurants', restaurantId);
    const snap = await getDoc(dRef);
    return snap.exists() ? (snap.data() as AppSettings) : null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
    return null;
  }
}

export async function saveRestaurant(restaurant: AppSettings): Promise<void> {
  await ensureAuthenticated();
  const path = `restaurants/${restaurant.restaurantId}`;
  try {
    await setDoc(doc(db, 'restaurants', restaurant.restaurantId), restaurant);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

// --- EMPLOYEES OPERATIONS ---

export async function getEmployees(restaurantId: string): Promise<Employee[]> {
  await ensureAuthenticated();
  const path = `restaurants/${restaurantId}/employees`;
  try {
    const q = collection(db, 'restaurants', restaurantId, 'employees');
    const snap = await getDocs(q);
    return snap.docs.map(d => d.data() as Employee);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
    return [];
  }
}

export async function saveEmployees(restaurantId: string, employees: Employee[]): Promise<void> {
  await ensureAuthenticated();
  const path = `restaurants/${restaurantId}/employees`;
  try {
    const batch = writeBatch(db);
    // Write new or updated employees
    for (const emp of employees) {
      const dRef = doc(db, 'restaurants', restaurantId, 'employees', emp.id);
      batch.set(dRef, emp);
    }
    // Also fetch current from server to delete any not in local
    const current = await getEmployees(restaurantId);
    for (const cur of current) {
      if (!employees.some(e => e.id === cur.id)) {
        const dRef = doc(db, 'restaurants', restaurantId, 'employees', cur.id);
        batch.delete(dRef);
      }
    }
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

// --- STAFFING TABLE OPERATIONS ---

export async function getStaffingTable(restaurantId: string): Promise<StaffingTableEntry[]> {
  await ensureAuthenticated();
  const path = `restaurants/${restaurantId}/staffing_table`;
  try {
    const q = collection(db, 'restaurants', restaurantId, 'staffing_table');
    const snap = await getDocs(q);
    return snap.docs.map(d => d.data() as StaffingTableEntry);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
    return [];
  }
}

export async function saveStaffingTable(restaurantId: string, staffing: StaffingTableEntry[]): Promise<void> {
  await ensureAuthenticated();
  const path = `restaurants/${restaurantId}/staffing_table`;
  try {
    const batch = writeBatch(db);
    for (const s of staffing) {
      const dRef = doc(db, 'restaurants', restaurantId, 'staffing_table', s.id);
      batch.set(dRef, s);
    }
    const current = await getStaffingTable(restaurantId);
    for (const cur of current) {
      if (!staffing.some(s => s.id === cur.id)) {
        const dRef = doc(db, 'restaurants', restaurantId, 'staffing_table', cur.id);
        batch.delete(dRef);
      }
    }
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

// --- HISTORY OPERATIONS ---

export async function getHistory(restaurantId: string): Promise<HistoryEntry[]> {
  await ensureAuthenticated();
  const path = `restaurants/${restaurantId}/history`;
  try {
    const q = collection(db, 'restaurants', restaurantId, 'history');
    const snap = await getDocs(q);
    return snap.docs.map(d => d.data() as HistoryEntry);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
    return [];
  }
}

export async function saveHistory(restaurantId: string, history: HistoryEntry[]): Promise<void> {
  await ensureAuthenticated();
  const path = `restaurants/${restaurantId}/history`;
  try {
    const batch = writeBatch(db);
    for (const h of history) {
      const dRef = doc(db, 'restaurants', restaurantId, 'history', h.id);
      batch.set(dRef, h);
    }
    const current = await getHistory(restaurantId);
    for (const cur of current) {
      if (!history.some(h => h.id === cur.id)) {
        const dRef = doc(db, 'restaurants', restaurantId, 'history', cur.id);
        batch.delete(dRef);
      }
    }
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

// --- SCHEDULES OPERATIONS ---

export async function getSchedules(restaurantId: string): Promise<DailySchedule[]> {
  await ensureAuthenticated();
  const path = `restaurants/${restaurantId}/schedules`;
  try {
    const q = collection(db, 'restaurants', restaurantId, 'schedules');
    const snap = await getDocs(q);
    return snap.docs.map(d => d.data() as DailySchedule);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
    return [];
  }
}

export async function saveScheduleDoc(restaurantId: string, schedule: DailySchedule): Promise<void> {
  await ensureAuthenticated();
  const path = `restaurants/${restaurantId}/schedules/${schedule.date}`;
  try {
    const dRef = doc(db, 'restaurants', restaurantId, 'schedules', schedule.date);
    await setDoc(dRef, schedule);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteScheduleDoc(restaurantId: string, date: string): Promise<void> {
  await ensureAuthenticated();
  const path = `restaurants/${restaurantId}/schedules/${date}`;
  try {
    const dRef = doc(db, 'restaurants', restaurantId, 'schedules', date);
    await deleteDoc(dRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// --- DELIVERIES ---

export async function getDeliveries(restaurantId: string): Promise<DeliveryRecord[]> {
  await ensureAuthenticated();
  const path = `restaurants/${restaurantId}/deliveries`;
  try {
    const q = collection(db, 'restaurants', restaurantId, 'deliveries');
    const snap = await getDocs(q);
    return snap.docs.map(d => d.data() as DeliveryRecord);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
    return [];
  }
}

export async function saveDeliveryDoc(restaurantId: string, delivery: DeliveryRecord): Promise<void> {
  await ensureAuthenticated();
  const path = `restaurants/${restaurantId}/deliveries/${delivery.id}`;
  try {
    const dRef = doc(db, 'restaurants', restaurantId, 'deliveries', delivery.id);
    await setDoc(dRef, delivery);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteDeliveryDoc(restaurantId: string, id: string): Promise<void> {
  await ensureAuthenticated();
  const path = `restaurants/${restaurantId}/deliveries/${id}`;
  try {
    const dRef = doc(db, 'restaurants', restaurantId, 'deliveries', id);
    await deleteDoc(dRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// --- CREDIT NOTES ---

export async function getCredits(restaurantId: string): Promise<CreditNoteRecord[]> {
  await ensureAuthenticated();
  const path = `restaurants/${restaurantId}/credits`;
  try {
    const q = collection(db, 'restaurants', restaurantId, 'credits');
    const snap = await getDocs(q);
    return snap.docs.map(d => d.data() as CreditNoteRecord);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
    return [];
  }
}

export async function saveCreditDoc(restaurantId: string, credit: CreditNoteRecord): Promise<void> {
  await ensureAuthenticated();
  const path = `restaurants/${restaurantId}/credits/${credit.id}`;
  try {
    const dRef = doc(db, 'restaurants', restaurantId, 'credits', credit.id);
    await setDoc(dRef, credit);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteCreditDoc(restaurantId: string, id: string): Promise<void> {
  await ensureAuthenticated();
  const path = `restaurants/${restaurantId}/credits/${id}`;
  try {
    const dRef = doc(db, 'restaurants', restaurantId, 'credits', id);
    await deleteDoc(dRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// --- MONTHLY OPTIONS ---

export async function getMonthlyOps(restaurantId: string, month: string): Promise<MonthlyOperationalData | null> {
  await ensureAuthenticated();
  const path = `restaurants/${restaurantId}/monthly_ops/${month}`;
  try {
    const dRef = doc(db, 'restaurants', restaurantId, 'monthly_ops', month);
    const snap = await getDoc(dRef);
    return snap.exists() ? (snap.data() as MonthlyOperationalData) : null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
    return null;
  }
}

export async function saveMonthlyOps(restaurantId: string, monthlyData: MonthlyOperationalData): Promise<void> {
  await ensureAuthenticated();
  const path = `restaurants/${restaurantId}/monthly_ops/${monthlyData.month}`;
  try {
    const dRef = doc(db, 'restaurants', restaurantId, 'monthly_ops', monthlyData.month);
    await setDoc(dRef, monthlyData);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}
