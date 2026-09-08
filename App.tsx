
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
import { AppSettings, Employee, StaffingTableEntry, DailySchedule, HourlyProjection, HistoryEntry, ShiftType, AgendaEvent } from './types';
import { MOCK_EMPLOYEES, DEFAULT_STAFFING_TABLE, STATIONS, INITIAL_RESTAURANTS, MOCK_HISTORY } from './constants';
import { 
  getRestaurants, saveRestaurant, getEmployees, saveEmployees, 
  getStaffingTable, saveStaffingTable, getHistory, saveHistory, 
  getSchedules, saveScheduleDoc, deleteScheduleDoc, ensureAuthenticated,
  subscribeToQuotaChange, getQuotaExceeded,
  getAgendaEvents, saveAgendaEvent, deleteAgendaEvent, subscribeToAgendaEvents
} from './services/firebaseService';
import { 
  Building2, LayoutDashboard, Sliders, TrendingUp, History, 
  Settings as SettingsIcon, LogOut, Menu, ArrowLeft, FileText, 
  CloudCheck, Lock, ShieldAlert, KeyRound, Loader2, RefreshCw,
  Truck, FileMinus, ClipboardList, Calculator, Landmark, CreditCard, ClipboardCheck,
  CalendarDays, Bell, Sparkles
} from 'lucide-react';

type ModuleType = 'positioning' | 'finance' | 'billing' | 'manager_tasks' | 'agenda' | 'cleaning_plan';

const ADMIN_PASSWORD = 'Imperial96';

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
  const [isLoaded, setIsLoaded] = useState(false);
  const [lastSync, setLastSync] = useState<string>(new Date().toLocaleTimeString());
  
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
          // First ever run, seed the master restaurants
          for (const r of INITIAL_RESTAURANTS) {
            await saveRestaurant(r);
          }
          list = [...INITIAL_RESTAURANTS];
        }
        setAllRestaurants(list);
      } catch (err) {
        console.error("Failed to load restaurants from cloud:", err);
        // Fallback to local
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
  const [targetSales, setTargetSales] = useState(0);
  const [hourlyData, setHourlyData] = useState<HourlyProjection[]>([]); 
  const [selectedShift, setSelectedShift] = useState<ShiftType>('ABERTURA');

  useEffect(() => {
    if (targetShift) {
      setSelectedShift(targetShift);
    }
  }, [targetShift]); 

  const [currentSchedule, setCurrentSchedule] = useState<DailySchedule>({
    date: targetDate,
    shifts: {}
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
          getAgendaEvents(id)
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
              description: 'Revisão de objetivos diários, organização de postos no posicionamento e tarefas de turno.',
              managerName: finalEmp.find(e => e.role === 'GERENTE')?.name || 'Gerente de Turno',
              reminderDuration: 'no_dia',
              isCompleted: false,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            };
            await saveAgendaEvent(id, defaultEvent);
            finalAgEvents = [defaultEvent];
          }
        }

        setCurrentEmployees(finalEmp);
        setCurrentStaffingTable(finalStaffing);
        setHistoryEntries(finalHist);
        setSavedSchedules(sched || []);
        setAgendaEvents(finalAgEvents);
        setIsLoaded(true);
        setLastSync(new Date().toLocaleTimeString());

        // Check for today's reminders popup when opening restaurant
        const todayDateStr = getLocalDateString();
        const hasTodayAlert = finalAgEvents.some(ev => ev.date === todayDateStr);
        if (hasTodayAlert && hasCheckedTodayReminderRef.current !== id) {
          hasCheckedTodayReminderRef.current = id;
          setShowTodayReminderPopup(true);
        }
      } catch (err) {
        console.error("Cloud loading error, falling back locally:", err);
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
        if (parsedEvents.some(ev => ev.date === todayDateStr) && hasCheckedTodayReminderRef.current !== id) {
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
      (liveEvents) => {
        setAgendaEvents(liveEvents);
        setLastSync(new Date().toLocaleTimeString());
      },
      (err) => {
        console.warn("Real-time agenda sync listener error, will rely on polling:", err);
      }
    );

    return () => {
      unsubscribe();
    };
  }, [authenticatedRestaurantId, isLoaded]);

  // Synchronize changes to cloud and local storage with debouncing (to avoid spamming Firestore and exceeding free tier quotas)
  useEffect(() => {
    if (!authenticatedRestaurantId || !isLoaded) return;
    const id = authenticatedRestaurantId;

    // Immediately update local storage so UI is extremely fast and stable
    localStorage.setItem('app_all_restaurants', JSON.stringify(allRestaurants));
    localStorage.setItem(`app_employees_${id}`, JSON.stringify(currentEmployees));
    localStorage.setItem(`app_staffing_table_${id}`, JSON.stringify(currentStaffingTable));
    localStorage.setItem(`app_history_detailed_${id}`, JSON.stringify(historyEntries));
    localStorage.setItem(`app_schedules_${id}`, JSON.stringify(savedSchedules));

    const performSync = async () => {
      setIsSyncing(true);
      try {
        const activeRest = allRestaurants.find(r => r.restaurantId === id);
        if (activeRest) {
          await saveRestaurant(activeRest);
        }
        await Promise.all([
          saveEmployees(id, currentEmployees),
          saveStaffingTable(id, currentStaffingTable),
          saveHistory(id, historyEntries)
        ]);
        setLastSync(new Date().toLocaleTimeString());
      } catch (err) {
        console.error("Error syncing to Firestore:", err);
      } finally {
        setIsSyncing(false);
      }
    };

    const timer = setTimeout(() => {
      performSync();
    }, 1500);

    return () => clearTimeout(timer);
  }, [allRestaurants, currentEmployees, currentStaffingTable, historyEntries, savedSchedules, authenticatedRestaurantId, isLoaded]);

  useEffect(() => {
    const existingSchedule = savedSchedules.find(s => s.date === targetDate);
    setCurrentSchedule(existingSchedule ? { ...existingSchedule, lockedShifts: existingSchedule.lockedShifts || [] } : { date: targetDate, shifts: {}, lockedShifts: [] });
    const known = historyEntries.find(s => s.date === targetDate);
    if(known) setTargetSales(known.totalSales);
  }, [targetDate, historyEntries, savedSchedules]);

  const handleRegister = async (newRest: AppSettings) => {
    try {
      const seededRest = { ...newRest, customStations: STATIONS };
      await saveRestaurant(seededRest);
      await Promise.all([
        saveEmployees(seededRest.restaurantId, MOCK_EMPLOYEES),
        saveStaffingTable(seededRest.restaurantId, DEFAULT_STAFFING_TABLE),
        saveHistory(seededRest.restaurantId, MOCK_HISTORY)
      ]);
      setAllRestaurants(prev => [...prev.filter(r => r.restaurantId !== seededRest.restaurantId), seededRest]);
      setAuthenticatedRestaurantId(seededRest.restaurantId);
      handleModuleSelect(null); 
    } catch (e) {
      console.error("Failed to register restaurant", e);
      alert("Erro ao criar restaurante na nuvem.");
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

  const handleModuleSelect = (module: ModuleType | null) => {
    setActiveModule(module);
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
      setLastSync(new Date().toLocaleTimeString());
    } catch (e) {
      console.error("Error saving agenda event:", e);
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
      setLastSync(new Date().toLocaleTimeString());
    } catch (e) {
      console.error("Error deleting agenda event:", e);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSaveRestaurantSettings = (updated: AppSettings) => {
    setAllRestaurants(prev => prev.map(r => r.restaurantId === updated.restaurantId ? updated : r));
  };

  const [scheduleToSave, setScheduleToSave] = useState<DailySchedule | null>(null);

  // Debounced cloud save for the schedule to prevent rapid write requests to Firestore.
  useEffect(() => {
    if (!scheduleToSave || !authenticatedRestaurantId) return;

    const timer = setTimeout(async () => {
      try {
        await saveScheduleDoc(authenticatedRestaurantId, scheduleToSave);
      } catch (err) {
        console.error("Auto-save schedule to cloud failed:", err);
      }
    }, 1000); // 1-second debounce is ideal for fast user editing actions

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

  const handleSaveSchedule = async (scheduleToSave: DailySchedule) => {
    setCurrentSchedule(scheduleToSave);
    setSavedSchedules(prev => {
        const others = prev.filter(s => s.date !== scheduleToSave.date);
        return [...others, scheduleToSave];
    });
    if (authenticatedRestaurantId) {
      try {
        await saveScheduleDoc(authenticatedRestaurantId, scheduleToSave);
      } catch (err) {
        console.error("Failed to save schedule to cloud:", err);
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
        getAgendaEvents(id)
      ]);

      if (restList.length > 0) {
        setAllRestaurants(restList);
      }
      if (emp.length > 0) {
        setCurrentEmployees(emp);
      }
      if (staffing.length > 0) {
        setCurrentStaffingTable(staffing);
      }
      if (hist.length > 0) {
        setHistoryEntries(hist);
      }
      setSavedSchedules(sched || []);
      if (events) {
        setAgendaEvents(events);
      }
      setLastSync(new Date().toLocaleTimeString());
    } catch (err) {
      console.error("Error pulling data from cloud:", err);
      alert("Não foi possível carregar os dados mais recentes.");
    } finally {
      setIsSyncing(false);
    }
  };

  // Background polling every 30 seconds to fetch changes from other devices automatically
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
              getAgendaEvents(id)
            ]);

            if (restList.length > 0) {
              setAllRestaurants(prev => {
                if (JSON.stringify(prev) === JSON.stringify(restList)) return prev;
                return restList;
              });
            }
            if (emp.length > 0) {
              setCurrentEmployees(prev => {
                if (JSON.stringify(prev) === JSON.stringify(emp)) return prev;
                return emp;
              });
            }
            if (staffing.length > 0) {
              setCurrentStaffingTable(prev => {
                if (JSON.stringify(prev) === JSON.stringify(staffing)) return prev;
                return staffing;
              });
            }
            if (hist.length > 0) {
              setHistoryEntries(prev => {
                if (JSON.stringify(prev) === JSON.stringify(hist)) return prev;
                return hist;
              });
            }
            setSavedSchedules(prev => {
              if (JSON.stringify(prev) === JSON.stringify(sched)) return prev;
              return sched || [];
            });
            if (events) {
              setAgendaEvents(prev => {
                if (JSON.stringify(prev) === JSON.stringify(events)) return prev;
                return events;
              });
            }
            setLastSync(new Date().toLocaleTimeString());
          } catch (err) {
            console.warn("Background auto-refresh failed:", err);
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
        exportTimestamp: new Date().toISOString()
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
        alert("Ficheiro de importação inválido.");
        return;
    }
    if (confirm("Isto irá substituir TODOS os dados locais e na NUVEM deste restaurante pelos do ficheiro. Continuar?")) {
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
          alert("Dados restaurados com sucesso na nuvem e localmente.");
        } catch (e) {
          console.error("Import error: ", e);
          alert("Ocorreu um erro ao importar dados para a nuvem.");
        }
    }
  };



  if (allRestaurants.length === 0) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4">
        <Loader2 className="h-10 w-10 text-blue-600 animate-spin mb-4" />
        <p className="text-white text-xs font-black uppercase tracking-widest">A carregar dados na nuvem...</p>
      </div>
    );
  }

  const activeRestaurant = allRestaurants.find(r => r.restaurantId === authenticatedRestaurantId);

  if (!authenticatedRestaurantId || !activeRestaurant) {
    return <Login restaurants={allRestaurants} onLogin={handleLogin} onRegister={handleRegister} />;
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

  const renderProtectedTab = (content: React.ReactNode) => {
    if (!isAdminAuthorized) {
        return (
            <div className="h-full flex items-center justify-center animate-fade-in">
                <div className="bg-white p-12 rounded-3xl shadow-2xl border border-gray-100 max-w-md w-full text-center space-y-6">
                    <div className="inline-flex p-4 bg-blue-50 text-blue-600 rounded-full">
                        <Lock size={48} strokeWidth={2.5} />
                    </div>
                    <div>
                        <h2 className="text-2xl font-black text-gray-800 uppercase tracking-tighter">Área Restrita</h2>
                        <p className="text-sm text-gray-400 font-bold uppercase tracking-wider mt-1">Apenas Administradores</p>
                    </div>
                    
                    <form onSubmit={handleUnlockAdmin} className="space-y-4 pt-4">
                        <div className="relative">
                            <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                            <input 
                                type="password" 
                                placeholder="Palavra-passe de gestão..."
                                value={lockPassword}
                                onChange={(e) => setLockPassword(e.target.value)}
                                className={`w-full pl-12 pr-4 py-4 bg-gray-50 border rounded-2xl outline-none transition-all font-bold ${lockError ? 'border-red-500 focus:ring-red-200' : 'border-gray-200 focus:ring-2 focus:ring-blue-500'}`}
                                autoFocus
                            />
                        </div>
                        {lockError && (
                            <p className="text-red-500 text-[10px] font-black uppercase flex items-center justify-center gap-1 animate-pulse">
                                <ShieldAlert size={12} /> Palavra-passe incorreta
                            </p>
                        )}
                        <button 
                            type="submit"
                            className="w-full bg-slate-900 text-white font-black py-4 rounded-2xl hover:bg-slate-800 transition-all shadow-xl active:scale-95 uppercase text-xs tracking-widest"
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

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden print:h-auto print:overflow-visible">
      <aside className={`${sidebarOpen ? 'w-64' : 'w-20'} bg-slate-900 text-white transition-all duration-300 flex flex-col shadow-xl z-20 print:hidden`}>
        <div className="p-4 flex items-center gap-3 border-b border-slate-700 h-16">
          <div className="p-1.5 bg-blue-600 rounded-lg shrink-0"><Building2 size={20} /></div>
          {sidebarOpen && (
              <div className="overflow-hidden">
                  <h1 className="font-bold text-sm tracking-tight truncate">{activeRestaurant.restaurantName}</h1>
                  <p className="text-xs text-slate-400 truncate">Controlos de Gestão</p>
              </div>
          )}
        </div>
        <nav className="flex-1 p-4 space-y-1">
           <button onClick={() => handleModuleSelect(null)} className="w-full flex items-center gap-3 p-3 rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white mb-6 border border-slate-700/50">
             <ArrowLeft size={20} />
             {sidebarOpen && <span className="font-medium">Menu Principal</span>}
           </button>
          
          {activeModule === 'positioning' && (
            <>
              <button onClick={() => setActiveTab('positioning')} className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors ${activeTab === 'positioning' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-800'}`}>
                <LayoutDashboard size={20} /> {sidebarOpen && <span>Posicionamento</span>}
              </button>
              <button onClick={() => setActiveTab('staffing')} className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors ${activeTab === 'staffing' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-800'}`}>
                <Sliders size={20} /> {sidebarOpen && <span>Staffing</span>}
              </button>
              <button onClick={() => setActiveTab('sales_history')} className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors ${activeTab === 'sales_history' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-800'}`}>
                <TrendingUp size={20} /> {sidebarOpen && <span>Vendas</span>}
              </button>
              <button onClick={() => setActiveTab('schedule_history')} className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors ${activeTab === 'schedule_history' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-800'}`}>
                <History size={20} /> {sidebarOpen && <span>Histórico</span>}
              </button>
              <button onClick={() => setActiveTab('settings')} className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors ${activeTab === 'settings' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-800'}`}>
                <SettingsIcon size={20} /> {sidebarOpen && <span>Definições</span>}
              </button>
            </>
          )}

          {activeModule === 'billing' && (
            <>
              <button 
                onClick={() => setActiveTab('deliveries')} 
                className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors ${activeTab === 'deliveries' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-800'}`}
              >
                <Truck size={20} /> {sidebarOpen && <span>Descargas</span>}
              </button>
              <button 
                onClick={() => setActiveTab('credits')} 
                className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors ${activeTab === 'credits' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-800'}`}
              >
                <FileMinus size={20} /> {sidebarOpen && <span>Notas de Crédito</span>}
              </button>
              <button 
                onClick={() => setActiveTab('summary')} 
                className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors ${activeTab === 'summary' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-800'}`}
              >
                <ClipboardList size={20} /> {sidebarOpen && <span>Resumo</span>}
              </button>
            </>
          )}

          {activeModule === 'finance' && (
            <>
              <button 
                onClick={() => setActiveTab('cofre')} 
                className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors ${activeTab === 'cofre' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-800'}`}
              >
                <Calculator size={20} /> {sidebarOpen && <span>Contagem de Cofre</span>}
              </button>
              <button 
                onClick={() => setActiveTab('faturas')} 
                className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors ${activeTab === 'faturas' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-800'}`}
              >
                <FileText size={20} /> {sidebarOpen && <span>Faturas</span>}
              </button>
              <button 
                onClick={() => setActiveTab('depositos')} 
                className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors ${activeTab === 'depositos' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-800'}`}
              >
                <Landmark size={20} /> {sidebarOpen && <span>Folha de Depósito</span>}
              </button>
              <button 
                onClick={() => setActiveTab('prosegur')} 
                className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors ${activeTab === 'prosegur' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-800'}`}
              >
                <CreditCard size={20} /> {sidebarOpen && <span>Depósito Prosegur</span>}
              </button>
              <button 
                onClick={() => setActiveTab('finance_settings')} 
                className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors ${activeTab === 'finance_settings' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-800'}`}
              >
                <Sliders size={20} /> {sidebarOpen && <span>Definições</span>}
              </button>
            </>
          )}

          {activeModule === 'manager_tasks' && (
            <>
              <button 
                onClick={() => setActiveTab('checklist')} 
                className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors ${activeTab === 'checklist' ? 'bg-blue-600 text-white font-bold' : 'text-slate-400 hover:bg-slate-800'}`}
              >
                <ClipboardCheck size={20} /> {sidebarOpen && <span>Lista de Tarefas</span>}
              </button>
              <button 
                onClick={() => setActiveTab('history')} 
                className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors ${activeTab === 'history' ? 'bg-blue-600 text-white font-bold' : 'text-slate-400 hover:bg-slate-800'}`}
              >
                <TrendingUp size={20} /> {sidebarOpen && <span>Resumo</span>}
              </button>
              <button 
                onClick={() => setActiveTab('admin')} 
                className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors ${activeTab === 'admin' ? 'bg-blue-600 text-white font-bold' : 'text-slate-400 hover:bg-slate-800'}`}
              >
                <FileText size={20} /> {sidebarOpen && <span>Gestão de Tarefas</span>}
              </button>
            </>
          )}

          {activeModule === 'agenda' && (
            <>
              <button 
                onClick={() => setActiveTab('agenda_calendar')} 
                className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors ${activeTab === 'agenda_calendar' ? 'bg-indigo-600 text-white font-bold' : 'text-slate-400 hover:bg-slate-800'}`}
              >
                <CalendarDays size={20} /> {sidebarOpen && <span>Agenda Digital</span>}
              </button>
            </>
          )}

          {activeModule === 'cleaning_plan' && (
            <>
              <button 
                onClick={() => setActiveTab('cleaning_plan')} 
                className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors ${activeTab === 'cleaning_plan' ? 'bg-teal-600 text-white font-bold' : 'text-slate-400 hover:bg-slate-800'}`}
              >
                <Sparkles size={20} /> {sidebarOpen && <span>Plano de Limpeza</span>}
              </button>
            </>
          )}
        </nav>
        <div className="p-4 border-t border-slate-700">
             <button onClick={handleLogout} className="w-full flex items-center gap-3 p-2 text-slate-400 hover:text-red-400 transition-colors"><LogOut size={20} />{sidebarOpen && <span>Sair</span>}</button>
             <button onClick={() => setSidebarOpen(!sidebarOpen)} className="w-full mt-2 flex justify-center text-slate-500"><Menu size={20} /></button>
        </div>
      </aside>

      <main className="flex-1 overflow-auto flex flex-col print:h-auto print:overflow-visible">
        <header className="bg-white shadow-sm px-6 py-4 sticky top-0 z-10 flex justify-between items-center print:hidden">
          <h2 className="text-xl font-bold text-gray-800 uppercase tracking-tight">
            {activeModule === 'billing' ? 'Controlo de Faturação' : 
             activeModule === 'finance' ? 'Controlo Financeiro' :
             activeModule === 'manager_tasks' ? 'Tarefas de Gerentes' :
             activeModule === 'agenda' ? 'Agenda Digital' :
             activeModule === 'cleaning_plan' ? 'Plano de Limpeza' :
             'Posicionamento'}
          </h2>
          <div className="flex items-center gap-3">
            {todayEvents.length > 0 && (
              <button
                onClick={() => setShowTodayReminderPopup(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-lg text-xs font-bold transition-all border border-indigo-200"
                title="Ver lembretes de hoje"
              >
                <Bell size={14} className="text-indigo-600 animate-pulse" />
                <span>{todayEvents.length} {todayEvents.length === 1 ? 'Lembrete hoje' : 'Lembretes hoje'}</span>
              </button>
            )}
            <button
              onClick={pullCloudData}
              disabled={isSyncing}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-xs font-black uppercase tracking-wider hover:bg-blue-100 active:scale-95 transition-all border border-blue-100/50 disabled:opacity-50 disabled:pointer-events-none"
              title="Forçar sincronização e carregar dados mais recentes da nuvem"
            >
              <RefreshCw size={12} className={`${isSyncing ? 'animate-spin' : ''}`} />
              <span>Sincronizar</span>
            </button>
            <div className="text-[10px] font-black uppercase text-slate-400 bg-slate-50 px-2 py-1 rounded border border-slate-100 flex items-center gap-1">
                {isSyncing ? (
                  <Loader2 size={12} className="text-blue-500 animate-spin" />
                ) : (
                  <CloudCheck size={12} className="text-emerald-500" />
                )}
                {isSyncing ? 'A Guardar na Nuvem...' : `Nuvem Sincronizada: ${lastSync}`}
            </div>
          </div>
        </header>

        {quotaExceeded && (
          <div id="quota-warning-banner" className="mx-6 mt-6 p-4 bg-amber-50 border border-amber-200 rounded-2xl flex flex-col md:flex-row justify-between items-center gap-4 text-amber-900 animate-pulse">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-amber-100 text-amber-700 rounded-xl shrink-0 mt-0.5">
                <ShieldAlert size={20} />
              </div>
              <div>
                <h4 className="text-sm font-black uppercase tracking-tight">Limite de Quota do Banco de Dados Excedido (Spark Plan)</h4>
                <p className="text-xs text-amber-700 font-bold mt-1">
                  O banco de dados do projeto excedeu os limites de gravação diários e gratuitos da Firebase. <strong>A aplicação continua totalmente segura e funcional</strong> guardando as suas alterações localmente (localStorage). Os seus dados serão sincronizados com a nuvem quando a quota for redefinida a amanhã.
                </p>
              </div>
            </div>
            <a 
              href={`https://console.firebase.google.com/project/gen-lang-client-0960499326/firestore/databases/ai-studio-3b572120-1507-4607-9365-d61746a6a5ec/data?openUpgradeDialog=true`}
              target="_blank" 
              rel="noopener noreferrer" 
              className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-[10px] font-black uppercase tracking-wider rounded-xl transition-all shadow-sm shrink-0 text-center"
            >
              Ver Consola do Banco de Dados
            </a>
          </div>
        )}

        <div className="p-6 flex-1">
          {activeTab === 'settings' && renderProtectedTab(
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
                  hourlyData={currentSchedule.hourlyProjections?.[selectedShift] || []} 
                  onSaveSchedule={handleSaveSchedule} 
                  initialShift={selectedShift} 
                  onShiftChangeComplete={() => {}} 
                  selectedShift={selectedShift}
                  setSelectedShift={setSelectedShift}
                />
              )}
              
              {activeTab === 'staffing' && renderProtectedTab(
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
                  setTargetSales={(val) => {
                    const updated = {
                      ...currentSchedule,
                      projectedSales: {
                        ...(currentSchedule.projectedSales || {}),
                        [selectedShift]: val
                      }
                    };
                    handleUpdateSchedule(updated);
                  }} 
                  setHourlyData={(data) => {
                    const updated = {
                      ...currentSchedule,
                      hourlyProjections: {
                        ...(currentSchedule.hourlyProjections || {}),
                        [selectedShift]: data
                      }
                    };
                    handleUpdateSchedule(updated);
                  }} 
                  onNavigateToPositioning={() => setActiveTab('positioning')} 
                  isSyncing={isSyncing}
                  lastSync={lastSync}
                  selectedShift={selectedShift}
                />
              )}
              {activeTab === 'schedule_history' && <ScheduleHistory schedules={savedSchedules} onLoadSchedule={(d, s) => { setTargetDate(d); if(s) setTargetShift(s); setActiveTab('positioning'); }} onDeleteSchedule={(d) => setSavedSchedules(prev => prev.filter(s => s.date !== d))} employees={currentEmployees} />}
            </>
          )}

          {activeModule === 'billing' && (
            <>
              {(['deliveries', 'credits', 'summary'].includes(activeTab)) && (
                <BillingControl 
                  restaurantId={activeRestaurant.restaurantId} 
                  employees={currentEmployees} 
                  activeSubTab={activeTab as any}
                  onTabChange={setActiveTab}
                />
              )}
            </>
          )}

          {activeModule === 'finance' && (
            <>
              {(['cofre', 'depositos', 'prosegur', 'faturas', 'finance_settings'].includes(activeTab)) && (
                <FinanceControl 
                  restaurantId={activeRestaurant.restaurantId} 
                  employees={currentEmployees} 
                  onSaveEmployees={setCurrentEmployees}
                  settings={activeRestaurant}
                  onSaveSettings={handleSaveRestaurantSettings}
                  activeSubTab={activeTab === 'finance_settings' ? 'settings' : activeTab as any}
                  onTabChange={setActiveTab}
                />
              )}
            </>
          )}

          {activeModule === 'manager_tasks' && (['checklist', 'history', 'admin'].includes(activeTab)) && (
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
