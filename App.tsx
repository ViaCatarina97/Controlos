import { createClient } from '@supabase/supabase-js';

// Substitui pelos teus dados do painel do Supabase
const supabase = createClient('URL_DO_TEU_PROJETO', 'CHAVE_ANON_PUBLIC');

// ... dentro do componente App ...

const saveToCloud = useCallback(async () => {
  if (!authenticatedRestaurantId) return;
  
  setSyncStatus('syncing');
  
  // O objeto que contém TUDO o que pediste para gravar
  const snapshot: RestaurantDataSnapshot = {
    settings: allRestaurants.find(r => r.restaurantId === authenticatedRestaurantId)!,
    employees: currentEmployees,
    staffingTable: currentStaffingTable,
    history: historyEntries,
    schedules: savedSchedules,
    lastUpdated: new Date().toISOString()
  };

  try {
    const { error } = await supabase
      .from('restaurant_data')
      .upsert({ 
        restaurant_id: authenticatedRestaurantId, 
        data: snapshot,
        updated_at: new Date().toISOString() 
      });

    if (error) throw error;
    setSyncStatus('synced');
  } catch (e) {
    setSyncStatus('error');
    console.error("Erro Supabase:", e);
  }
}, [authenticatedRestaurantId, allRestaurants, currentEmployees, currentStaffingTable, historyEntries, savedSchedules]);

const loadFromCloud = useCallback(async (id: string) => {
  setSyncStatus('syncing');
  try {
    const { data, error } = await supabase
      .from('restaurant_data')
      .select('data')
      .eq('restaurant_id', id)
      .single();

    if (error || !data) throw error;

    const cloudData: RestaurantDataSnapshot = data.data;
    
    // Atualiza todos os estados com o que veio da nuvem
    setAllRestaurants([cloudData.settings]);
    setCurrentEmployees(cloudData.employees);
    setCurrentStaffingTable(cloudData.staffingTable);
    setHistoryEntries(cloudData.history);
    setSavedSchedules(cloudData.schedules);
    
    setSyncStatus('synced');
    return true;
  } catch (e) {
    setSyncStatus('error');
    return false;
  }
}, []);
