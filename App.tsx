import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Settings } from './components/Settings';
import { GlobalSettings } from './components/GlobalSettings';
import { Criteria } from './components/Criteria';
import { HistoryForecast } from './components/HistoryForecast';
import { Login } from './components/Login';
import { ModuleSelector } from './components/ModuleSelector';
import { ScheduleHistory } from './components/ScheduleHistory';
import { BillingControl } from './components/BillingControl';
import { Positioning } from './components/Positioning';
import { FinanceControl } from './components/FinanceControl';
import { ManagerTasks } from './components/ManagerTasks';
import { DigitalAgenda } from './components/DigitalAgenda';
import { TodayReminderModal } from './components/TodayReminderModal';
import { CleaningPlanModule } from './components/cleaning/CleaningPlanModule';
import {
  AppSettings,
  Employee,
  StaffingTableEntry,
  DailySchedule,
  HourlyProjection,
  HistoryEntry,
  ShiftType,
  AgendaEvent,
} from './types';
import {
  MOCK_EMPLOYEES,
  DEFAULT_STAFFING_TABLE,
  STATIONS,
  INITIAL_RESTAURANTS,
  MOCK_HISTORY,
  APP_VERSION,
} from './constants';
import {
  getRestaurants,
  saveRestaurant,
  getEmployees,
  saveEmployees,
  getStaffingTable,
  saveStaffingTable,
  getHistory,
  saveHistory,
  getSchedules,
  saveScheduleDoc,
  deleteScheduleDoc,
  ensureAuthenticated,
  subscribeToQuotaChange,
  getQuotaExceeded,
  getAgendaEvents,
  saveAgendaEvent,
  deleteAgendaEvent,
  subscribeToAgendaEvents,
} from './services/firebaseService';
import {
  LayoutDashboard,
  Sliders,
  TrendingUp,
  History,
  Settings as SettingsIcon,
  LogOut,
  Menu,
  X,
  ArrowLeft,
  FileText,
  CloudCheck,
  Lock,
  ShieldAlert,
  KeyRound,
  Loader2,
  RefreshCw,
  Truck,
  FileMinus,
  ClipboardList,
  Calculator,
  Landmark,
  CreditCard,
  ClipboardCheck,
  CalendarDays,
  Bell,
  Sparkles,
  PanelLeftClose,
  PanelLeftOpen,
  Sun,
  Moon,
} from 'lucide-react';

type ModuleType =
  | 'positioning'
  | 'finance'
  | 'billing'
  | 'manager_tasks'
  | 'agenda'
  | 'cleaning_plan';

const ADMIN_PASSWORD = 'Imperial96';

const MODULE_META: Record<ModuleType, { title: string; subtitle: string }> = {
  positioning: {
    title: 'Gestão Operacional & Posicionamento',
    subtitle: 'Planta 2D de postos, critérios de staffing, previsões e histórico de turnos',
  },
  finance: {
    title: 'Tesouraria, Cofre & Depósitos',
    subtitle: 'Contagens diárias de cofre, despesas de caixa, folha de depósito e recolhas Prosegur',
  },
  billing: {
    title: 'Mercadorias, HAVI & Food Cost',
    subtitle: 'Conferência de descargas, notas de crédito e reconciliação mensal HAVI vs MyStore',
  },
  manager_tasks: {
    title: 'Tarefas & Checklists de Gerentes',
    subtitle: 'Planeamento semanal por departamento e validação pela supervisão',
  },
  agenda: {
    title: 'Agenda Operacional Digital',
    subtitle: 'Eventos, auditorias, reuniões de equipa e lembretes automáticos',
  },
  cleaning_plan: {
    title: 'Plano de Limpeza & Higiene',
    subtitle: 'Mapa semanal por turnos, zelador, responsáveis de área e conformidade',
  },
};

const App: React.FC = () => {
  const [quotaExceeded, setQuotaExceeded] = useState(getQuotaExceeded());

  useEffect(() => {
    return subscribeToQuotaChange(setQuotaExceeded);
  }, []);

  const [authenticatedRestaurantId, setAuthenticatedRestaurantId] = useState<string | null>(null);
  const [activeModule, setActiveModule] = useState<ModuleType | null>(null);
  const [activeTab, setActiveTab] = useState<string>('positioning');
  const [isGlobalSettingsOpen, setIsGlobalSettingsOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    try {
      return localStorage.getItem('app_theme_mode') === 'dark';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
    try {
      localStorage.setItem('app_theme_mode', darkMode ? 'dark' : 'light');
    } catch {
      // ignore storage errors
    }
  }, [darkMode]);

  const toggleDarkMode = () => setDarkMode(prev => !prev);
  const [isLoaded, setIsLoaded] = useState(false);
  const [lastSync, setLastSync] = useState<string>(new Date().toLocaleTimeString('pt-PT'));

  const [isAdminAuthorized, setIsAdminAuthorized] = useState(false);
  const [lockPassword, setLockPassword] = useState('');
  const [lockError, setLockError] = useState(false);

  const [allRestaurants, setAllRestaurants] = useState<AppSettings[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);

  // Load all restaurants on mount
  useEffect(() => {
    const loadInit = async () => {
      try {
        await ensureAuthenticated();
        let list = await getRestaurants();
        if (list.length === 0) {
          for (const r of INITIAL_RESTAURANTS) {
            await saveRestaurant(r);
          }
          list = [...INITIAL_RESTAURANTS];
        }
        setAllRestaurants(list);
      } catch (err) {
        console.error('Failed to load restaurants from cloud:', err);
        const saved = localStorage.getItem('app_all_restaurants');
        setAllRestaurants(saved ? JSON.parse(saved) : INITIAL_RESTAURANTS);
      }
    };
    loadInit();
  }, []);

  const [currentEmployees, setCurrentEmployees] = useState<Employee[]>([]);
  const [currentStaffingTable, setCurrentStaffingTable] = useState<StaffingTableEntry[]>([]);
  const [historyEntries, setHistoryEntries] = useState<HistoryEntry[]>([]);
  const [savedSchedules, setSavedSchedules] = useState<DailySchedule[]>([]);
  const [agendaEvents, setAgendaEvents] = useState<AgendaEvent[]>([]);
  const [showTodayReminderPopup, setShowTodayReminderPopup] = useState<boolean>(false);
  const hasCheckedTodayReminderRef = useRef<string | null>(null);
  const lastSyncedCloudRef = useRef<{
    rest: string;
    emp: string;
    staff: string;
    hist: string;
  } | null>(null);

  const getLocalDateString = (d: Date = new Date()): string => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const getDaysDiff = (dateStrA: string, dateStrB: string): number => {
    const [yA, mA, dA] = dateStrA.split('-').map(Number);
    const [yB, mB, dB] = dateStrB.split('-').map(Number);
    const utcA = Date.UTC(yA, (mA || 1) - 1, dA || 1);
    const utcB = Date.UTC(yB, (mB || 1) - 1, dB || 1);
    return Math.round((utcA - utcB) / (1000 * 60 * 60 * 24));
  };

  const todayEvents = useMemo(() => {
    const todayStr = getLocalDateString();

    return agendaEvents.filter(ev => {
      if (ev.date === todayStr) return true;
      const diffDays = getDaysDiff(ev.date, todayStr);
      if (diffDays > 0) {
        if (ev.reminderDuration === '1_dia' && diffDays <= 1) return true;
        if (ev.reminderDuration === '2_dias' && diffDays <= 2) return true;
        if (ev.reminderDuration === '3_dias' && diffDays <= 3) return true;
        if (ev.reminderDuration === '1_semana' && diffDays <= 7) return true;
        if (ev.reminderDuration === '2_semanas' && diffDays <= 14) return true;
      }
      return false;
    });
  }, [agendaEvents]);

  const [targetDate, setTargetDate] = useState(() => getLocalDateString());
  const [targetShift, setTargetShift] = useState<ShiftType | null>(null);
  const [, setTargetSales] = useState(0);
  const [, setHourlyData] = useState<HourlyProjection[]>([]);
  const [selectedShift, setSelectedShift] = useState<ShiftType>('ABERTURA');

  useEffect(() => {
    if (targetShift) {
      setSelectedShift(targetShift);
    }
  }, [targetShift]);

  const [currentSchedule, setCurrentSchedule] = useState<DailySchedule>({
    date: targetDate,
    shifts: {},
  });

  // Load selected restaurant dynamic data
  useEffect(() => {
    if (!authenticatedRestaurantId) return;
    const id = authenticatedRestaurantId;
    setIsLoaded(false);

    const loadRestaurantData = async () => {
      try {
        const [emp, staffing, hist, sched, agEvents] = await Promise.all([
          getEmployees(id),
          getStaffingTable(id),
          getHistory(id),
          getSchedules(id),
          getAgendaEvents(id),
        ]);

        let finalEmp = emp;
        if (emp.length === 0) {
          await saveEmployees(id, MOCK_EMPLOYEES);
          finalEmp = MOCK_EMPLOYEES;
        }

        let finalStaffing = staffing;
        if (staffing.length === 0) {
          await saveStaffingTable(id, DEFAULT_STAFFING_TABLE);
          finalStaffing = DEFAULT_STAFFING_TABLE;
        }

        let finalHist = hist;
        if (hist.length === 0) {
          await saveHistory(id, MOCK_HISTORY);
          finalHist = MOCK_HISTORY;
        }

        let finalAgEvents = agEvents;
        if (agEvents.length === 0) {
          const isInitialized = localStorage.getItem(`app_agenda_initialized_${id}`);
          if (!isInitialized) {
            localStorage.setItem(`app_agenda_initialized_${id}`, 'true');
            const todayDateStr = getLocalDateString();
            const defaultEvent: AgendaEvent = {
              id: `evt_init_${Date.now()}`,
              title: 'Reunião de Alinhamento Operacional',
              type: 'reuniao',
              date: todayDateStr,
              time: '10:30',
              isAllDay: false,
              description:
                'Revisão de objetivos diários, organização de postos no posicionamento e tarefas de turno.',
              managerName: finalEmp.find(e => e.role === 'GERENTE')?.name || 'Gerente de Turno',
              reminderDuration: 'no_dia',
              isCompleted: false,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            };
            await saveAgendaEvent(id, defaultEvent);
            finalAgEvents = [defaultEvent];
          }
        }

        const loadedRest = allRestaurants.find(r => r.restaurantId === id) || null;
        lastSyncedCloudRef.current = {
          rest: JSON.stringify(loadedRest),
          emp: JSON.stringify(finalEmp),
          staff: JSON.stringify(finalStaffing),
          hist: JSON.stringify(finalHist),
        };

        setCurrentEmployees(finalEmp);
        setCurrentStaffingTable(finalStaffing);
        setHistoryEntries(finalHist);
        setSavedSchedules(sched || []);
        setAgendaEvents(finalAgEvents);
        setIsLoaded(true);
        setLastSync(new Date().toLocaleTimeString('pt-PT'));

        const todayDateStr = getLocalDateString();
        const hasTodayAlert = finalAgEvents.some(ev => ev.date === todayDateStr);
        if (hasTodayAlert && hasCheckedTodayReminderRef.current !== id) {
          hasCheckedTodayReminderRef.current = id;
          setShowTodayReminderPopup(true);
        }
      } catch (err) {
        console.error('Cloud loading error, falling back locally:', err);
        const empSaved = localStorage.getItem(`app_employees_${id}`);
        setCurrentEmployees(empSaved ? JSON.parse(empSaved) : MOCK_EMPLOYEES);
        const staffingSaved = localStorage.getItem(`app_staffing_table_${id}`);
        setCurrentStaffingTable(staffingSaved ? JSON.parse(staffingSaved) : DEFAULT_STAFFING_TABLE);
        const historySaved = localStorage.getItem(`app_history_detailed_${id}`);
        setHistoryEntries(historySaved ? JSON.parse(historySaved) : MOCK_HISTORY);
        const schedSaved = localStorage.getItem(`app_schedules_${id}`);
        setSavedSchedules(schedSaved ? JSON.parse(schedSaved) : []);
        const eventsSaved = localStorage.getItem(`app_agenda_events_${id}`);
        const parsedEvents: AgendaEvent[] = eventsSaved ? JSON.parse(eventsSaved) : [];
        setAgendaEvents(parsedEvents);
        setIsLoaded(true);

        const todayDateStr = getLocalDateString();
        if (
          parsedEvents.some(ev => ev.date === todayDateStr) &&
          hasCheckedTodayReminderRef.current !== id
        ) {
          hasCheckedTodayReminderRef.current = id;
          setShowTodayReminderPopup(true);
        }
      }
    };

    loadRestaurantData();
  }, [authenticatedRestaurantId]);

  // Real-time synchronization for Agenda Events via Firestore onSnapshot
  useEffect(() => {
    if (!authenticatedRestaurantId || !isLoaded) return;
    const id = authenticatedRestaurantId;

    const unsubscribe = subscribeToAgendaEvents(
      id,
      liveEvents => {
        setAgendaEvents(liveEvents);
        setLastSync(new Date().toLocaleTimeString('pt-PT'));
      },
      err => {
        console.warn('Real-time agenda sync listener error, will rely on polling:', err);
      }
    );

    return () => {
      unsubscribe();
    };
  }, [authenticatedRestaurantId, isLoaded]);

  // Debounced cloud sync — strictly writes ONLY changed slices to eliminate redundant Firestore quota drain
  useEffect(() => {
    if (!authenticatedRestaurantId || !isLoaded) return;
    const id = authenticatedRestaurantId;

    localStorage.setItem('app_all_restaurants', JSON.stringify(allRestaurants));
    localStorage.setItem(`app_employees_${id}`, JSON.stringify(currentEmployees));
    localStorage.setItem(`app_staffing_table_${id}`, JSON.stringify(currentStaffingTable));
    localStorage.setItem(`app_history_detailed_${id}`, JSON.stringify(historyEntries));
    localStorage.setItem(`app_schedules_${id}`, JSON.stringify(savedSchedules));

    const activeRest = allRestaurants.find(r => r.restaurantId === id) || null;
    const restJson = JSON.stringify(activeRest);
    const empJson = JSON.stringify(currentEmployees);
    const staffJson = JSON.stringify(currentStaffingTable);
    const histJson = JSON.stringify(historyEntries);
    const prev = lastSyncedCloudRef.current;

    const restDirty = Boolean(activeRest && (!prev || prev.rest !== restJson));
    const empDirty = !prev || prev.emp !== empJson;
    const staffDirty = !prev || prev.staff !== staffJson;
    const histDirty = !prev || prev.hist !== histJson;

    if (!restDirty && !empDirty && !staffDirty && !histDirty) {
      return;
    }

    const performSync = async () => {
      setIsSyncing(true);
      try {
        const writes: Promise<unknown>[] = [];
        if (restDirty && activeRest) writes.push(saveRestaurant(activeRest));
        if (empDirty) writes.push(saveEmployees(id, currentEmployees));
        if (staffDirty) writes.push(saveStaffingTable(id, currentStaffingTable));
        if (histDirty) writes.push(saveHistory(id, historyEntries));
        await Promise.all(writes);
        lastSyncedCloudRef.current = {
          rest: restJson,
          emp: empJson,
          staff: staffJson,
          hist: histJson,
        };
        setLastSync(new Date().toLocaleTimeString('pt-PT'));
      } catch (err) {
        console.error('Error syncing to Firestore:', err);
      } finally {
        setIsSyncing(false);
      }
    };

    const timer = setTimeout(() => {
      performSync();
    }, 1500);

    return () => clearTimeout(timer);
  }, [
    allRestaurants,
    currentEmployees,
    currentStaffingTable,
    historyEntries,
    savedSchedules,
    authenticatedRestaurantId,
    isLoaded,
  ]);

  useEffect(() => {
    const existingSchedule = savedSchedules.find(s => s.date === targetDate);
    setCurrentSchedule(
      existingSchedule
        ? { ...existingSchedule, lockedShifts: existingSchedule.lockedShifts || [] }
        : { date: targetDate, shifts: {}, lockedShifts: [] }
    );
    const known = historyEntries.find(s => s.date === targetDate);
    if (known) setTargetSales(known.totalSales);
  }, [targetDate, historyEntries, savedSchedules]);

  const handleRegister = async (newRest: AppSettings) => {
    try {
      const seededRest = { ...newRest, customStations: STATIONS };
      await saveRestaurant(seededRest);
      await Promise.all([
        saveEmployees(seededRest.restaurantId, MOCK_EMPLOYEES),
        saveStaffingTable(seededRest.restaurantId, DEFAULT_STAFFING_TABLE),
        saveHistory(seededRest.restaurantId, MOCK_HISTORY),
      ]);
      setAllRestaurants(prev => [
        ...prev.filter(r => r.restaurantId !== seededRest.restaurantId),
        seededRest,
      ]);
      setAuthenticatedRestaurantId(seededRest.restaurantId);
      handleModuleSelect(null);
    } catch (e) {
      console.error('Failed to register restaurant', e);
      alert('Erro ao criar restaurante na nuvem.');
    }
  };

  const handleLogin = (restaurant: AppSettings) => {
    setAuthenticatedRestaurantId(restaurant.restaurantId);
    handleModuleSelect(null);
  };

  const handleLogout = () => {
    setAuthenticatedRestaurantId(null);
    setActiveModule(null);
    setIsLoaded(false);
    setIsAdminAuthorized(false);
    setShowTodayReminderPopup(false);
    hasCheckedTodayReminderRef.current = null;
  };

  const handleModuleSelect = (module: ModuleType | null, explicitSubTab?: string) => {
    setActiveModule(module);
    setMobileMenuOpen(false);
    if (explicitSubTab) {
      setActiveTab(explicitSubTab);
      return;
    }
    if (module === 'positioning') setActiveTab('positioning');
    else if (module === 'billing') setActiveTab('deliveries');
    else if (module === 'finance') setActiveTab('cofre');
    else if (module === 'manager_tasks') setActiveTab('checklist');
    else if (module === 'agenda') setActiveTab('agenda_calendar');
    else if (module === 'cleaning_plan') setActiveTab('cleaning_plan');
  };

  const handleSaveAgendaEvent = async (event: AgendaEvent) => {
    if (!authenticatedRestaurantId) return;
    try {
      setIsSyncing(true);
      await saveAgendaEvent(authenticatedRestaurantId, event);
      setAgendaEvents(prev => {
        const idx = prev.findIndex(e => e.id === event.id);
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = event;
          return next;
        }
        return [...prev, event];
      });
      setLastSync(new Date().toLocaleTimeString('pt-PT'));
    } catch (e) {
      console.error('Error saving agenda event:', e);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleDeleteAgendaEvent = async (eventId: string) => {
    if (!authenticatedRestaurantId) return;
    try {
      setIsSyncing(true);
      await deleteAgendaEvent(authenticatedRestaurantId, eventId);
      setAgendaEvents(prev => prev.filter(e => e.id !== eventId));
      setLastSync(new Date().toLocaleTimeString('pt-PT'));
    } catch (e) {
      console.error('Error deleting agenda event:', e);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSaveRestaurantSettings = (updated: AppSettings) => {
    // Persist local-first immediately; a later cloud refresh must not restore stale settings.
    setAllRestaurants(prev => {
      const next = prev.map(r => (r.restaurantId === updated.restaurantId ? updated : r));
      const exists = next.some(r => r.restaurantId === updated.restaurantId);
      const complete = exists ? next : [...next, updated];
      localStorage.setItem('app_all_restaurants', JSON.stringify(complete));
      return complete;
    });
    // Save explicitly as well as through the dirty-slice sync effect. The service
    // falls back to localStorage when Firestore is unavailable.
    void saveRestaurant(updated).catch(error => {
      console.error('Falha ao guardar definições da loja:', error);
    });
  };

  const [scheduleToSave, setScheduleToSave] = useState<DailySchedule | null>(null);

  useEffect(() => {
    if (!scheduleToSave || !authenticatedRestaurantId) return;

    const timer = setTimeout(async () => {
      try {
        await saveScheduleDoc(authenticatedRestaurantId, scheduleToSave);
      } catch (err) {
        console.error('Auto-save schedule to cloud failed:', err);
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, [scheduleToSave, authenticatedRestaurantId]);

  const handleUpdateSchedule = (updated: DailySchedule) => {
    setCurrentSchedule(updated);
    setScheduleToSave(updated);
    setSavedSchedules(prev => {
      const others = prev.filter(s => s.date !== updated.date);
      return [...others, updated];
    });
  };

  const handleSaveSchedule = async (sched: DailySchedule) => {
    setCurrentSchedule(sched);
    setSavedSchedules(prev => {
      const others = prev.filter(s => s.date !== sched.date);
      return [...others, sched];
    });
    if (authenticatedRestaurantId) {
      try {
        await saveScheduleDoc(authenticatedRestaurantId, sched);
      } catch (err) {
        console.error('Failed to save schedule to cloud:', err);
      }
    }
  };

  const handleDeleteSchedule = async (date: string) => {
    if (
      !confirm(
        `Eliminar o posicionamento completo do dia ${date}? Esta ação não pode ser anulada.`
      )
    )
      return;
    if (scheduleToSave?.date === date) setScheduleToSave(null);
    setSavedSchedules(prev => prev.filter(s => s.date !== date));
    if (authenticatedRestaurantId) {
      try {
        setIsSyncing(true);
        await deleteScheduleDoc(authenticatedRestaurantId, date);
        setLastSync(new Date().toLocaleTimeString('pt-PT'));
      } catch (err) {
        console.error('Failed to delete schedule from cloud:', err);
        alert('Não foi possível eliminar o posicionamento na nuvem. Tente novamente.');
      } finally {
        setIsSyncing(false);
      }
    }
  };

  const pullCloudData = async () => {
    if (!authenticatedRestaurantId) return;
    const id = authenticatedRestaurantId;
    setIsSyncing(true);
    try {
      const [restList, emp, staffing, hist, sched, events] = await Promise.all([
        getRestaurants(),
        getEmployees(id),
        getStaffingTable(id),
        getHistory(id),
        getSchedules(id),
        getAgendaEvents(id),
      ]);

      lastSyncedCloudRef.current = {
        rest: JSON.stringify(
          (restList.length > 0 ? restList : allRestaurants).find(r => r.restaurantId === id) || null
        ),
        emp: JSON.stringify(emp.length > 0 ? emp : currentEmployees),
        staff: JSON.stringify(staffing.length > 0 ? staffing : currentStaffingTable),
        hist: JSON.stringify(hist.length > 0 ? hist : historyEntries),
      };
      if (restList.length > 0) setAllRestaurants(restList);
      if (emp.length > 0) setCurrentEmployees(emp);
      if (staffing.length > 0) setCurrentStaffingTable(staffing);
      if (hist.length > 0) setHistoryEntries(hist);
      setSavedSchedules(sched || []);
      if (events) setAgendaEvents(events);
      setLastSync(new Date().toLocaleTimeString('pt-PT'));
    } catch (err) {
      console.error('Error pulling data from cloud:', err);
      alert('Não foi possível carregar os dados mais recentes.');
    } finally {
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    if (!authenticatedRestaurantId || !isLoaded) return;

    const interval = setInterval(() => {
      if (document.visibilityState === 'visible' && !isSyncing) {
        const refreshInBackground = async () => {
          const id = authenticatedRestaurantId;
          try {
            const [restList, emp, staffing, hist, sched, events] = await Promise.all([
              getRestaurants(),
              getEmployees(id),
              getStaffingTable(id),
              getHistory(id),
              getSchedules(id),
              getAgendaEvents(id),
            ]);

            lastSyncedCloudRef.current = {
              rest: JSON.stringify(
                (restList.length > 0 ? restList : allRestaurants).find(r => r.restaurantId === id) ||
                  null
              ),
              emp: JSON.stringify(emp.length > 0 ? emp : currentEmployees),
              staff: JSON.stringify(staffing.length > 0 ? staffing : currentStaffingTable),
              hist: JSON.stringify(hist.length > 0 ? hist : historyEntries),
            };

            if (restList.length > 0) {
              setAllRestaurants(prev =>
                JSON.stringify(prev) === JSON.stringify(restList) ? prev : restList
              );
            }
            if (emp.length > 0) {
              setCurrentEmployees(prev =>
                JSON.stringify(prev) === JSON.stringify(emp) ? prev : emp
              );
            }
            if (staffing.length > 0) {
              setCurrentStaffingTable(prev =>
                JSON.stringify(prev) === JSON.stringify(staffing) ? prev : staffing
              );
            }
            if (hist.length > 0) {
              setHistoryEntries(prev =>
                JSON.stringify(prev) === JSON.stringify(hist) ? prev : hist
              );
            }
            setSavedSchedules(prev =>
              JSON.stringify(prev) === JSON.stringify(sched) ? prev : sched || []
            );
            if (events) {
              setAgendaEvents(prev =>
                JSON.stringify(prev) === JSON.stringify(events) ? prev : events
              );
            }
            setLastSync(new Date().toLocaleTimeString('pt-PT'));
          } catch (err) {
            console.warn('Background auto-refresh failed:', err);
          }
        };
        refreshInBackground();
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [authenticatedRestaurantId, isLoaded, isSyncing]);

  const handleUnlockAdmin = (e: React.FormEvent) => {
    e.preventDefault();
    if (lockPassword === ADMIN_PASSWORD) {
      setIsAdminAuthorized(true);
      setLockPassword('');
      setLockError(false);
    } else {
      setLockError(true);
      setLockPassword('');
    }
  };

  const exportFullStoreData = () => {
    const restaurant = allRestaurants.find(r => r.restaurantId === authenticatedRestaurantId);
    if (!restaurant) return;
    const exportData = {
      restaurant,
      employees: currentEmployees,
      staffingTable: currentStaffingTable,
      history: historyEntries,
      schedules: savedSchedules,
      agendaEvents: agendaEvents,
      exportTimestamp: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `BASE_DADOS_OPERACIONAL_${restaurant.restaurantName.replace(/\s+/g, '_')}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const importFullStoreData = async (data: any) => {
    if (!data.restaurant || !data.employees) {
      alert('Ficheiro de importação inválido.');
      return;
    }
    if (
      confirm(
        'Isto irá substituir TODOS os dados locais e na NUVEM deste restaurante pelos do ficheiro. Continuar?'
      )
    ) {
      const id = data.restaurant.restaurantId;
      try {
        await saveRestaurant(data.restaurant);
        await saveEmployees(id, data.employees);
        await saveStaffingTable(id, data.staffingTable || DEFAULT_STAFFING_TABLE);
        await saveHistory(id, data.history || []);
        if (data.schedules) {
          for (const s of data.schedules) {
            await saveScheduleDoc(id, s);
          }
        }
        if (data.agendaEvents && Array.isArray(data.agendaEvents)) {
          for (const ev of data.agendaEvents) {
            await saveAgendaEvent(id, ev);
          }
          setAgendaEvents(data.agendaEvents);
        }
        setAllRestaurants(prev => {
          const others = prev.filter(r => r.restaurantId !== data.restaurant.restaurantId);
          return [...others, data.restaurant];
        });
        setAuthenticatedRestaurantId(data.restaurant.restaurantId);
        setCurrentEmployees(data.employees);
        setCurrentStaffingTable(data.staffingTable || DEFAULT_STAFFING_TABLE);
        setHistoryEntries(data.history || []);
        setSavedSchedules(data.schedules || []);
        alert('Dados restaurados com sucesso na nuvem e localmente.');
      } catch (e) {
        console.error('Import error: ', e);
        alert('Ocorreu um erro ao importar dados para a nuvem.');
      }
    }
  };

  if (allRestaurants.length === 0) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
        <div className="w-12 h-12 rounded-2xl bg-amber-400 text-slate-950 font-black text-xl flex items-center justify-center mb-4">
          M
        </div>
        <Loader2 className="h-6 w-6 text-amber-400 animate-spin mb-3" />
        <p className="text-slate-400 text-xs font-semibold tracking-wider">
          A ligar à base de dados da unidade...
        </p>
      </div>
    );
  }

  const activeRestaurant = allRestaurants.find(r => r.restaurantId === authenticatedRestaurantId);

  if (!authenticatedRestaurantId || !activeRestaurant) {
    return (
      <Login
        restaurants={allRestaurants}
        onLogin={handleLogin}
        onRegister={handleRegister}
      />
    );
  }

  if (!activeModule) {
    if (isGlobalSettingsOpen) {
      return (
        <GlobalSettings
          employees={currentEmployees}
          setEmployees={setCurrentEmployees}
          onBack={() => setIsGlobalSettingsOpen(false)}
        />
      );
    }
    return (
      <>
        <ModuleSelector
          restaurant={activeRestaurant}
          onSelectModule={handleModuleSelect}
          onLogout={handleLogout}
          onSettingsClick={() => setIsGlobalSettingsOpen(true)}
          todayEventsCount={todayEvents.length}
          onOpenTodayReminders={() => setShowTodayReminderPopup(true)}
          employees={currentEmployees}
          schedules={savedSchedules}
          history={historyEntries}
          darkMode={darkMode}
          onToggleDarkMode={toggleDarkMode}
        />
        <TodayReminderModal
          isOpen={showTodayReminderPopup}
          events={todayEvents}
          onClose={() => setShowTodayReminderPopup(false)}
          onOpenAgenda={() => {
            setShowTodayReminderPopup(false);
            handleModuleSelect('agenda');
          }}
        />
      </>
    );
  }

  // Dynamic Sub-tabs definition per module (shared across Desktop Sidebar, Mobile Drawer & Mobile Bottom Bar!)
  const moduleTabs: { id: string; label: string; short: string; icon: any }[] =
    activeModule === 'positioning'
      ? [
          { id: 'positioning', label: 'Posicionamento', short: 'Postos', icon: LayoutDashboard },
          { id: 'staffing', label: 'Critérios Staffing', short: 'Staffing', icon: Sliders },
          { id: 'sales_history', label: 'Previsão & Vendas', short: 'Vendas', icon: TrendingUp },
          { id: 'schedule_history', label: 'Histórico Turnos', short: 'Histórico', icon: History },
          { id: 'settings', label: 'Definições Loja', short: 'Config.', icon: SettingsIcon },
        ]
      : activeModule === 'billing'
      ? [
          { id: 'deliveries', label: 'Descargas HAVI', short: 'Descargas', icon: Truck },
          { id: 'credits', label: 'Notas de Crédito', short: 'Notas Cr.', icon: FileMinus },
          { id: 'summary', label: 'Resumo & Food Cost', short: 'P&L Mês', icon: ClipboardList },
        ]
      : activeModule === 'finance'
      ? [
          { id: 'cofre', label: 'Contagem de Cofre', short: 'Cofre', icon: Calculator },
          { id: 'depositos', label: 'Folha de Depósito', short: 'Depósitos', icon: Landmark },
          { id: 'prosegur', label: 'Depósito Prosegur', short: 'Prosegur', icon: CreditCard },
          { id: 'faturas', label: 'Despesas de Caixa', short: 'Despesas', icon: FileText },
          { id: 'finance_settings', label: 'Definições Cofre', short: 'Config.', icon: Sliders },
        ]
      : activeModule === 'manager_tasks'
      ? [
          { id: 'checklist', label: 'Folha Semanal', short: 'Checklist', icon: ClipboardCheck },
          { id: 'history', label: 'Resumo & Validação', short: 'Validação', icon: TrendingUp },
          { id: 'admin', label: 'Configurar Tarefas', short: 'Tarefas', icon: FileText },
        ]
      : activeModule === 'agenda'
      ? [{ id: 'agenda_calendar', label: 'Calendário Operacional', short: 'Agenda', icon: CalendarDays }]
      : [{ id: 'cleaning_plan', label: 'Plano & Desempenho', short: 'Limpeza', icon: Sparkles }];

  const renderProtectedTab = (content: React.ReactNode) => {
    if (!isAdminAuthorized) {
      return (
        <div className="min-h-[65vh] flex items-center justify-center animate-fade-in p-4">
          <div className="bg-white p-8 sm:p-10 rounded-3xl shadow-xl border border-slate-200 max-w-md w-full text-center space-y-5">
            <div className="inline-flex p-4 bg-amber-50 text-amber-700 rounded-2xl border border-amber-200">
              <Lock size={34} strokeWidth={2.2} />
            </div>
            <div>
              <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">
                Área Reservada à Gerência
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Introduza a palavra-passe de administração para editar parâmetros sensíveis.
              </p>
            </div>

            <form onSubmit={handleUnlockAdmin} className="space-y-3.5 pt-2">
              <div className="relative">
                <KeyRound
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                  size={17}
                />
                <input
                  type="password"
                  placeholder="Palavra-passe de gestão..."
                  value={lockPassword}
                  onChange={e => setLockPassword(e.target.value)}
                  className={`w-full pl-11 pr-4 py-3.5 bg-slate-50 border rounded-xl outline-none transition-all text-sm font-semibold ${
                    lockError
                      ? 'border-rose-400 focus:ring-2 focus:ring-rose-200'
                      : 'border-slate-200 focus:bg-white focus:border-slate-900'
                  }`}
                  autoFocus
                />
              </div>
              {lockError && (
                <p className="text-rose-600 text-xs font-semibold flex items-center justify-center gap-1.5">
                  <ShieldAlert size={14} /> Palavra-passe incorreta
                </p>
              )}
              <button
                type="submit"
                className="w-full bg-slate-900 text-white font-bold py-3.5 rounded-xl hover:bg-slate-800 transition-all shadow-md text-xs uppercase tracking-wider"
              >
                Desbloquear Acesso
              </button>
            </form>
          </div>
        </div>
      );
    }
    return content;
  };

  const renderSidebarLinks = (expanded: boolean) => (
    <>
      <button
        onClick={() => handleModuleSelect(null)}
        className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-slate-300 bg-slate-800/70 hover:bg-slate-800 hover:text-white mb-5 border border-slate-700/80 text-xs font-semibold transition-colors"
      >
        <ArrowLeft size={16} className="shrink-0 text-amber-400" />
        {expanded && <span className="truncate">Torre de Controlo</span>}
      </button>

      {expanded && (
        <div className="px-3 pb-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">
          Secções do Módulo
        </div>
      )}

      {moduleTabs.map(tab => {
        const Icon = tab.icon;
        const active = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => {
              setActiveTab(tab.id);
              setMobileMenuOpen(false);
            }}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-medium transition-all ${
              active
                ? 'bg-amber-400 text-slate-950 font-bold shadow-sm'
                : 'text-slate-300 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <Icon size={18} className={`shrink-0 ${active ? 'text-slate-950' : 'text-slate-400'}`} />
            {expanded && <span className="truncate">{tab.label}</span>}
          </button>
        );
      })}
    </>
  );

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden print:h-auto print:overflow-visible">
      {/* DESKTOP SIDEBAR (Hidden below lg so mobile phones get 100% full width!) */}
      <aside
        className={`hidden lg:flex ${
          sidebarOpen ? 'w-64' : 'w-20'
        } bg-slate-900 text-white transition-all duration-200 flex-col border-r border-slate-800 shrink-0 z-20 print:hidden`}
      >
        <div className="px-4 flex items-center gap-3 border-b border-slate-800 h-16">
          <div className="w-9 h-9 bg-amber-400 text-slate-950 font-black rounded-xl flex items-center justify-center shrink-0 text-base">
            M
          </div>
          {sidebarOpen && (
            <div className="overflow-hidden">
              <h1 className="font-bold text-sm tracking-tight text-white truncate">
                {activeRestaurant.restaurantName}
              </h1>
              <p className="text-[11px] text-slate-400 truncate">Controlos de Gestão</p>
            </div>
          )}
        </div>

        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">{renderSidebarLinks(sidebarOpen)}</nav>

        <div className="p-3 border-t border-slate-800 space-y-1">
          <button
            type="button"
            onClick={toggleDarkMode}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium text-slate-300 hover:text-amber-300 hover:bg-slate-800/80 transition-colors cursor-pointer"
            title={darkMode ? 'Mudar para Modo Claro' : 'Mudar para Modo Escuro'}
          >
            {darkMode ? (
              <Sun size={17} className="shrink-0 text-amber-400" />
            ) : (
              <Moon size={17} className="shrink-0 text-slate-400" />
            )}
            {sidebarOpen && <span>{darkMode ? 'Modo Claro' : 'Modo Escuro'}</span>}
          </button>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-rose-400 hover:bg-slate-800/80 transition-colors cursor-pointer"
          >
            <LogOut size={17} className="shrink-0" />
            {sidebarOpen && <span>Terminar Sessão</span>}
          </button>
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="w-full flex items-center justify-center py-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/60 transition-colors cursor-pointer"
            title={sidebarOpen ? 'Recolher barra lateral' : 'Expandir barra lateral'}
          >
            {sidebarOpen ? <PanelLeftClose size={17} /> : <PanelLeftOpen size={17} />}
          </button>
        </div>
      </aside>

      {/* MOBILE SLIDE-OVER DRAWER (< lg) */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden print:hidden">
          <div className="w-72 max-w-[85vw] bg-slate-900 text-white h-full flex flex-col justify-between shadow-2xl animate-fade-in">
            <div className="px-4 h-16 flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-400 text-slate-950 font-black flex items-center justify-center">
                  M
                </div>
                <div>
                  <p className="font-bold text-sm text-white leading-tight">
                    {activeRestaurant.restaurantName}
                  </p>
                  <p className="text-[11px] text-slate-400">Navegação Rápida</p>
                </div>
              </div>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="p-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            <nav className="flex-1 p-3 space-y-1 overflow-y-auto">{renderSidebarLinks(true)}</nav>

            <div className="p-3 border-t border-slate-800 space-y-1">
              <button
                type="button"
                onClick={toggleDarkMode}
                className="w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-slate-300 hover:bg-slate-800 cursor-pointer"
              >
                {darkMode ? <Sun size={16} className="text-amber-400" /> : <Moon size={16} />}
                <span>{darkMode ? 'Modo Claro' : 'Modo Escuro'}</span>
              </button>
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-rose-400 hover:bg-slate-800 cursor-pointer"
              >
                <LogOut size={16} /> Terminar Sessão
              </button>
            </div>
          </div>
          <div
            className="flex-1 bg-slate-950/60 backdrop-blur-sm"
            onClick={() => setMobileMenuOpen(false)}
          />
        </div>
      )}

      {/* MAIN WORKSPACE COLUMN */}
      <main className="flex-1 min-w-0 overflow-y-auto flex flex-col pb-20 lg:pb-0 print:h-auto print:overflow-visible print:pb-0">
        <header className="bg-white/95 backdrop-blur border-b border-slate-200 px-4 sm:px-6 h-16 sticky top-0 z-20 flex justify-between items-center gap-3 shrink-0 print:hidden">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-100 shrink-0"
              title="Abrir Menu"
            >
              <Menu size={18} />
            </button>
            <div className="min-w-0">
              <h2 className="text-sm sm:text-base font-extrabold text-slate-900 tracking-tight truncate">
                {MODULE_META[activeModule].title}
              </h2>
              <p className="text-xs text-slate-500 hidden md:block truncate">
                {MODULE_META[activeModule].subtitle}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {todayEvents.length > 0 && (
              <button
                onClick={() => setShowTodayReminderPopup(true)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 bg-amber-50 text-amber-900 hover:bg-amber-100 rounded-xl text-xs font-bold transition-all border border-amber-200"
                title="Ver lembretes de hoje"
              >
                <Bell size={14} className="text-amber-600" />
                <span className="hidden sm:inline">{todayEvents.length} hoje</span>
              </button>
            )}

            <button
              onClick={pullCloudData}
              disabled={isSyncing}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 text-slate-800 rounded-xl text-xs font-semibold hover:bg-slate-200/80 active:scale-95 transition-all disabled:opacity-50"
              title="Sincronizar dados agora"
            >
              <RefreshCw size={13} className={isSyncing ? 'animate-spin' : ''} />
              <span className="hidden sm:inline">Sincronizar</span>
            </button>

            <div className="hidden xl:flex text-[11px] font-semibold text-slate-500 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200/80 items-center gap-1.5 tabular-nums">
              {isSyncing ? (
                <Loader2 size={13} className="text-amber-600 animate-spin" />
              ) : (
                <CloudCheck size={14} className="text-emerald-600" />
              )}
              <span>{isSyncing ? `v${APP_VERSION} · A guardar...` : `v${APP_VERSION} · Sinc.: ${lastSync}`}</span>
            </div>
          </div>
        </header>

        {quotaExceeded && (
          <div
            id="quota-warning-banner"
            className="mx-4 sm:mx-6 mt-4 p-4 bg-amber-50 border border-amber-200 rounded-2xl flex flex-col md:flex-row justify-between items-center gap-4 text-amber-900"
          >
            <div className="flex items-start gap-3">
              <div className="p-2 bg-amber-100 text-amber-700 rounded-xl shrink-0 mt-0.5">
                <ShieldAlert size={18} />
              </div>
              <div>
                <h4 className="text-xs font-extrabold uppercase tracking-tight">
                  Quota Diária Firebase Atingida — Modo Local Seguro Ativo
                </h4>
                <p className="text-xs text-amber-800 mt-0.5">
                  As alterações continuam guardadas localmente no navegador e sincronizam automaticamente na reposição diária.
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="p-4 sm:p-6 flex-1 min-w-0">
          {activeTab === 'settings' &&
            renderProtectedTab(
              <Settings
                settings={activeRestaurant}
                onSaveSettings={handleSaveRestaurantSettings}
                employees={currentEmployees}
                setEmployees={setCurrentEmployees}
                onExportFullData={exportFullStoreData}
                onImportFullData={importFullStoreData}
              />
            )}

          {activeModule === 'positioning' && (
            <>
              {activeTab === 'positioning' && (
                <Positioning
                  date={targetDate}
                  setDate={setTargetDate}
                  projectedSales={currentSchedule.projectedSales?.[selectedShift] || 0}
                  employees={currentEmployees.filter(e => e.isActive)}
                  staffingTable={currentStaffingTable}
                  schedule={currentSchedule}
                  setSchedule={handleUpdateSchedule}
                  settings={activeRestaurant}
                  onSaveSettings={handleSaveRestaurantSettings}
                  hourlyData={currentSchedule.hourlyProjections?.[selectedShift] || []}
                  onSaveSchedule={handleSaveSchedule}
                  initialShift={selectedShift}
                  onShiftChangeComplete={() => {}}
                  selectedShift={selectedShift}
                  setSelectedShift={setSelectedShift}
                />
              )}

              {activeTab === 'staffing' &&
                renderProtectedTab(
                  <Criteria
                    staffingTable={currentStaffingTable}
                    setStaffingTable={setCurrentStaffingTable}
                  />
                )}

              {activeTab === 'sales_history' && (
                <HistoryForecast
                  history={historyEntries}
                  setHistory={setHistoryEntries}
                  targetDate={targetDate}
                  setTargetDate={setTargetDate}
                  targetSales={currentSchedule.projectedSales?.[selectedShift] || 0}
                  setTargetSales={val => {
                    const updated = {
                      ...currentSchedule,
                      projectedSales: {
                        ...(currentSchedule.projectedSales || {}),
                        [selectedShift]: val,
                      },
                    };
                    handleUpdateSchedule(updated);
                  }}
                  setHourlyData={data => setHourlyData(data)}
                  onApplyForecast={(sales, data) => {
                    const updated = {
                      ...currentSchedule,
                      date: targetDate,
                      projectedSales: {
                        ...(currentSchedule.projectedSales || {}),
                        [selectedShift]: sales,
                      },
                      hourlyProjections: {
                        ...(currentSchedule.hourlyProjections || {}),
                        [selectedShift]: data,
                      },
                    };
                    setTargetSales(sales);
                    setHourlyData(data);
                    handleUpdateSchedule(updated);
                  }}
                  onNavigateToPositioning={() => setActiveTab('positioning')}
                  isSyncing={isSyncing}
                  lastSync={lastSync}
                  selectedShift={selectedShift}
                />
              )}
              {activeTab === 'schedule_history' && (
                <ScheduleHistory
                  schedules={savedSchedules}
                  onLoadSchedule={(d, s) => {
                    setTargetDate(d);
                    if (s) setTargetShift(s);
                    setActiveTab('positioning');
                  }}
                  onDeleteSchedule={handleDeleteSchedule}
                  employees={currentEmployees}
                />
              )}
            </>
          )}

          {activeModule === 'billing' &&
            ['deliveries', 'credits', 'summary'].includes(activeTab) && (
              <BillingControl
                restaurantId={activeRestaurant.restaurantId}
                employees={currentEmployees}
                activeSubTab={activeTab as any}
                onTabChange={setActiveTab}
              />
            )}

          {activeModule === 'finance' &&
            ['cofre', 'depositos', 'prosegur', 'faturas', 'finance_settings'].includes(activeTab) && (
              <FinanceControl
                restaurantId={activeRestaurant.restaurantId}
                employees={currentEmployees}
                onSaveEmployees={setCurrentEmployees}
                settings={activeRestaurant}
                onSaveSettings={handleSaveRestaurantSettings}
                activeSubTab={activeTab === 'finance_settings' ? 'settings' : (activeTab as any)}
                onTabChange={setActiveTab}
              />
            )}

          {activeModule === 'manager_tasks' &&
            ['checklist', 'history', 'admin'].includes(activeTab) && (
              <ManagerTasks
                restaurantId={activeRestaurant.restaurantId}
                employees={currentEmployees}
                settings={activeRestaurant}
                activeSubTab={activeTab as any}
                onTabChange={setActiveTab}
              />
            )}

          {activeModule === 'agenda' && (
            <DigitalAgenda
              restaurantId={activeRestaurant.restaurantId}
              employees={currentEmployees}
              settings={activeRestaurant}
              events={agendaEvents}
              onSaveEvent={handleSaveAgendaEvent}
              onDeleteEvent={handleDeleteAgendaEvent}
              isSyncing={isSyncing}
              lastSync={lastSync}
              onManualSync={pullCloudData}
            />
          )}

          {activeModule === 'cleaning_plan' && (
            <CleaningPlanModule
              restaurantId={activeRestaurant.restaurantId}
              employees={currentEmployees}
            />
          )}
        </div>
      </main>

      {/* MOBILE BOTTOM NAVIGATION BAR (< lg) */}
      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-30 bg-white border-t border-slate-200 px-2 h-16 flex items-center justify-around print:hidden">
        <button
          type="button"
          onClick={() => handleModuleSelect(null)}
          className="flex flex-col items-center justify-center gap-0.5 px-2 py-1 text-[10px] font-semibold text-slate-500 hover:text-slate-900"
        >
          <ArrowLeft size={17} />
          <span>Início</span>
        </button>
        {moduleTabs.slice(0, 4).map(tab => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex flex-col items-center justify-center gap-0.5 px-2 py-1 rounded-xl text-[10px] font-semibold transition ${
                active ? 'text-slate-950 font-bold' : 'text-slate-400'
              }`}
            >
              <span className={`px-2.5 py-0.5 rounded-full ${active ? 'bg-amber-400 text-slate-950' : ''}`}>
                <Icon size={16} />
              </span>
              <span className="truncate max-w-[68px]">{tab.short}</span>
            </button>
          );
        })}
      </nav>

      <TodayReminderModal
        isOpen={showTodayReminderPopup}
        events={todayEvents}
        onClose={() => setShowTodayReminderPopup(false)}
        onOpenAgenda={() => {
          setShowTodayReminderPopup(false);
          handleModuleSelect('agenda');
        }}
        onDeleteEvent={handleDeleteAgendaEvent}
      />
    </div>
  );
};

export default App;
