import React, { useState, useMemo, useRef } from 'react';
import { HistoryEntry, SalesData, HourlyProjection } from '../types';
import { MOCK_HISTORY, TIME_SLOTS_KEYS } from '../constants';
import { Calendar, TrendingUp, CheckCircle, Search, ArrowRight, Filter, AlertCircle, Upload, FileSpreadsheet, Database } from 'lucide-react';
import * as XLSX from 'xlsx';

interface HistoryForecastProps {
  salesData: SalesData[];
  setSalesData: React.Dispatch<React.SetStateAction<SalesData[]>>;
  targetDate: string;
  setTargetDate: (date: string) => void;
  targetSales: number;
  setTargetSales: (val: number) => void;
  setHourlyData: (data: HourlyProjection[]) => void;
  onNavigateToPositioning: () => void;
}

export const HistoryForecast: React.FC<HistoryForecastProps> = ({ 
  targetDate,
  setTargetDate,
  targetSales,
  setTargetSales,
  setHourlyData,
  onNavigateToPositioning
}) => {
  // Local History State (starts with Mock, but can receive imports)
  const [history, setHistory] = useState<HistoryEntry[]>(MOCK_HISTORY);
  
  // State for selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [dayFilter, setDayFilter] = useState<number | null>(5); // Default to Friday (5) based on screenshot
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Filter Data based on Day of Week
  const filteredHistory = useMemo(() => {
    return history.filter(entry => dayFilter === null || entry.dayOfWeek === dayFilter);
  }, [dayFilter, history]);

  // Handle Select All
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(new Set(filteredHistory.map(h => h.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const toggleSelection = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedIds(newSet);
  };

  // Generate Random Demo Data for Testing
  const handleGenerateMockData = () => {
    const newEntries: HistoryEntry[] = [];
    const baseDate = new Date();
    
    // Generate 4 weeks of data back
    for (let i = 1; i <= 4; i++) {
        const date = new Date(baseDate);
        date.setDate(date.getDate() - (i * 7)); // Go back weeks
        
        // Randomize Sales between 6000 and 9000
        const totalSales = Math.floor(Math.random() * (9000 - 6000 + 1)) + 6000;
        const totalGC = Math.floor(totalSales / 8.5); // Avg check approx 8.5
        
        const slots: any = {};
        TIME_SLOTS_KEYS.forEach(key => {
            // Distribute mostly evenly with some randomness
            const share = (1 / TIME_SLOTS_KEYS.length);
            const slotSales = Math.floor(totalSales * share * (0.8 + Math.random() * 0.4));
            const slotGC = Math.floor(slotSales / 8.5);
            slots[key] = { sales: slotSales, gc: slotGC };
        });

        newEntries.push({
            id: crypto.randomUUID(),
            date: date.toISOString().split('T')[0],
            dayOfWeek: date.getDay(),
            totalSales,
            totalGC,
            slots
        });
    }

    setHistory(prev => [...prev, ...newEntries]);
    // Auto set filter to current day of week to show data immediately
    setDayFilter(baseDate.getDay());
    alert("Dados de demonstração gerados com sucesso! Selecione as linhas para criar a previsão.");
  };

  // Calculate Average of Selected
  const averageData = useMemo(() => {
    const selectedEntries = history.filter(h => selectedIds.has(h.id));
    const count = selectedEntries.length;

    if (count === 0) return null;

    // Calc Average Total Sales
    const avgTotalSales = Math.round(selectedEntries.reduce((sum, e) => sum + e.totalSales, 0) / count);
    const avgTotalGC = Math.round(selectedEntries.reduce((sum, e) => sum + e.totalGC, 0) / count);

    // Calc Average per Slot
    const slotsAverage: Record<string, { sales: number; gc: number }> = {};
    
    TIME_SLOTS_KEYS.forEach(slotKey => {
      const sumSales = selectedEntries.reduce((sum, e) => sum + (e.slots[slotKey]?.sales || 0), 0);
      const sumGC = selectedEntries.reduce((sum, e) => sum + (e.slots[slotKey]?.gc || 0), 0);
      slotsAverage[slotKey] = {
        sales: Math.round(sumSales / count),
        gc: Math.round(sumGC / count)
      };
    });

    return {
      totalSales: avgTotalSales,
      totalGC: avgTotalGC,
      slots: slotsAverage
    };
  }, [selectedIds, history]);

  // Apply Forecast
  const handleApplyForecast = () => {
    if (!averageData) return;

    // 1. Update Target Sales
    setTargetSales(averageData.totalSales);

    // 2. Transform into HourlyProjection format for Positioning page
    const hourlyProjections: HourlyProjection[] = TIME_SLOTS_KEYS.map(slotKey => {
      const metrics = averageData.slots[slotKey];
      
      // Simple logic to distribute GCs (mock distribution percentages from the image: 15% counter, 73% kiosk, etc)
      const totalGC = metrics.gc;
      const counterGC = Math.round(totalGC * 0.15);
      const sokGC = Math.round(totalGC * 0.73);
      const deliveryGC = Math.round(totalGC * 0.07);
      const driveGC = Math.round(totalGC * 0.05); // Remaining

      return {
        // Fix: Replace all occurrences of :00 with h to match '12h-13h' format expected by Positioning
        hour: slotKey.replace(/:00/g, 'h'), 
        totalSales: metrics.sales,
        totalGC: metrics.gc,
        channelGC: {
          counter: counterGC,
          sok: sokGC,
          drive: driveGC,
          delivery: deliveryGC
        }
      };
    });

    setHourlyData(hourlyProjections);
    onNavigateToPositioning();
  };

  // --- Excel Import Logic ---
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        const data = e.target?.result;
        if (data) {
            parseExcel(data as ArrayBuffer);
        }
    };
    reader.readAsArrayBuffer(file);
    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const parseExcel = (buffer: ArrayBuffer) => {
    try {
        const wb = XLSX.read(buffer, { type: 'array' });
        const sheetName = wb.SheetNames[0];
        const sheet = wb.Sheets[sheetName];
        
        // Convert to 2D Array with raw values to better handle numbers/dates
        const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false, defval: '' }) as string[][];

        const newEntries: HistoryEntry[] = [];
        
        // Helper to parse currency/numbers
        const parseNumber = (val: string | number) => {
            if (typeof val === 'number') return val;
            if (!val) return 0;
            // Clean string "1.000,00 €" -> 1000.00
            let clean = val.replace(/[€\s]/g, '');
            // Check for Portuguese format (dots thousands, comma decimal)
            if (clean.includes(',') && clean.indexOf('.') < clean.indexOf(',')) {
                clean = clean.replace(/\./g, '').replace(',', '.');
            } else if (clean.includes(',')) {
                clean = clean.replace(',', '.');
            }
            return parseFloat(clean) || 0;
        };

        // Helper to parse date
        const parseDateStr = (dateStr: string | number) => {
           if (!dateStr) return null;
           // If raw date string "07/01/2022"
           if (typeof dateStr === 'string' && dateStr.includes('/')) {
                const parts = dateStr.trim().split('/');
                if (parts.length === 3) {
                    return `${parts[2]}-${parts[1]}-${parts[0]}`; // YYYY-MM-DD
                }
           }
           // If excel pre-formatted string YYYY-MM-DD
           if (typeof dateStr === 'string' && dateStr.includes('-')) {
             return dateStr;
           }
           return null;
        };

        // Iterate rows. Start checking from row 1 (index 1) assuming row 0 is header
        rows.forEach((row) => {
            if (!row || row.length < 2) return;

            // Column B (Index 1) should be date
            const dateStr = parseDateStr(row[1]);
            if (!dateStr) return; // Skip invalid rows or headers

            const dateObj = new Date(dateStr);
            if (isNaN(dateObj.getTime())) return;

            const dayOfWeek = dateObj.getDay(); // 0-6

            const entry: HistoryEntry = {
                id: crypto.randomUUID(),
                date: dateStr,
                dayOfWeek: dayOfWeek,
                totalSales: 0,
                totalGC: 0,
                slots: {}
            };

            // Column Mapping based on Image Structure
            const slotMappings = [
                { key: "12:00-13:00", salesIdx: 4, gcIdx: 5 },
                { key: "13:00-14:00", salesIdx: 9, gcIdx: 10 },
                { key: "14:00-15:00", salesIdx: 14, gcIdx: 15 },
                { key: "19:00-20:00", salesIdx: 19, gcIdx: 20 },
                { key: "20:00-21:00", salesIdx: 24, gcIdx: 25 },
                { key: "21:00-22:00", salesIdx: 29, gcIdx: 30 },
            ];

            let totalS = 0;
            let totalG = 0;

            slotMappings.forEach(map => {
                // Ensure row has enough columns
                if (row.length <= map.gcIdx) return;
                
                const sales = parseNumber(row[map.salesIdx]);
                const gc = parseNumber(row[map.gcIdx]);
                
                entry.slots[map.key] = { sales, gc };
                totalS += sales;
                totalG += gc;
            });

            entry.totalSales = Math.round(totalS);
            entry.totalGC = Math.round(totalG);

            // Only add if we actually found data
            if (totalS > 0) {
                newEntries.push(entry);
            }
        });

        if (newEntries.length > 0) {
            setHistory(prev => [...prev, ...newEntries]);
            alert(`${newEntries.length} registos importados com sucesso!`);
        } else {
            alert("Não foram encontrados registos válidos. Verifique se o Excel corresponde ao modelo (Data na Coluna B, Vendas/GC nas colunas corretas).");
        }

    } catch (error) {
        console.error("Error parsing Excel:", error);
        alert("Erro ao ler o ficheiro. Certifique-se que é um Excel válido (.xls ou .xlsx).");
    }
  };

  // Format Helpers
  const formatCurrency = (val: number) => `€ ${val.toLocaleString('pt-PT')}`;
  const getDayName = (day: number) => ['Domingo', '2ª Feira', '3ª Feira', '4ª Feira', '5ª Feira', '6ª Feira', 'Sábado'][day];

  return (
    <div className="space-y-6 h-full flex flex-col animate-fade-in">
      
      {/* 1. Header Controls */}
      <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200 flex flex-col lg:flex-row justify-between items-end lg:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <TrendingUp className="text-blue-600" />
            Histórico & Previsão
          </h2>
          <p className="text-sm text-gray-500">Selecione dias similares para gerar a previsão.</p>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-4 w-full lg:w-auto">
            
            {/* Filter Group */}
            <div className="flex items-center gap-2 bg-gray-50 p-2 rounded-lg border border-gray-200">
                <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Filtrar Dia da Semana</span>
                    <div className="flex gap-1 mt-1">
                        {[1,2,3,4,5,6,0].map(d => (
                        <button
                            key={d}
                            onClick={() => {
                                setDayFilter(d === dayFilter ? null : d);
                                setSelectedIds(new Set()); // Reset selection on filter change
                            }}
                            className={`
                                w-7 h-7 rounded text-xs font-bold flex items-center justify-center transition-colors
                                ${dayFilter === d ? 'bg-blue-600 text-white shadow-md' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-100'}
                            `}
                        >
                            {getDayName(d).charAt(0)}
                        </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Actions Group */}
            <div className="flex items-center gap-3">
               
               {/* Import/Generate Button Group */}
               <div className="flex gap-2 h-full">
                  <input 
                    type="file" 
                    ref={fileInputRef}
                    accept=".xls,.xlsx"
                    className="hidden"
                    onChange={handleFileUpload}
                  />
                  <button 
                    onClick={handleGenerateMockData}
                    className="flex items-center gap-2 bg-purple-600 text-white px-3 py-2 rounded-lg hover:bg-purple-700 transition-colors shadow-sm text-sm font-medium h-full"
                    title="Gerar dados aleatórios para teste"
                  >
                    <Database size={18} />
                    <span className="hidden md:inline">Gerar Demo</span>
                  </button>

                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-2 bg-emerald-600 text-white px-3 py-2 rounded-lg hover:bg-emerald-700 transition-colors shadow-sm text-sm font-medium h-full"
                    title="Importar ficheiro Excel"
                  >
                    <FileSpreadsheet size={18} />
                    <span className="hidden md:inline">Importar</span>
                  </button>
               </div>

               {/* Target Date */}
               <div className="flex flex-col">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Previsão Para</span>
                  <input 
                    type="date" 
                    value={targetDate}
                    onChange={(e) => setTargetDate(e.target.value)}
                    className="bg-white border border-gray-300 text-gray-800 text-sm rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
                  />
               </div>
            </div>
        </div>
      </div>

      {/* 2. Data Table */}
      <div className="flex-1 overflow-auto bg-white rounded-xl shadow border border-gray-200 relative min-h-[300px]">
        <table className="w-full text-sm text-center border-collapse">
           <thead className="text-xs font-bold text-gray-700 uppercase bg-gray-50 sticky top-0 z-10 shadow-sm">
             <tr>
               <th className="p-3 sticky left-0 bg-gray-50 z-20 border-r border-gray-200 min-w-[140px] text-left">
                  <div className="flex items-center gap-3">
                    <input 
                        type="checkbox" 
                        className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                        onChange={(e) => handleSelectAll(e.target.checked)}
                        checked={filteredHistory.length > 0 && selectedIds.size === filteredHistory.length}
                    />
                    <span>Data</span>
                  </div>
               </th>
               <th className="p-3 bg-yellow-100/50 border-r border-yellow-200 text-yellow-800 w-24">Dia Sem.</th>
               <th className="p-3 bg-yellow-100/50 border-r border-yellow-200 text-yellow-800 font-extrabold w-32">Vendas Totais</th>
               
               {/* Time Slot Headers */}
               {TIME_SLOTS_KEYS.map(slot => (
                 <th key={slot} className={`p-2 border-r border-white/50 text-white min-w-[120px] ${parseInt(slot) >= 19 ? 'bg-orange-500' : 'bg-slate-600'}`}>
                    {slot}
                 </th>
               ))}
             </tr>
             {/* Sub-header for Sales/GC */}
             <tr className="text-[10px] text-gray-500 bg-gray-100 border-b border-gray-200">
               <th className="sticky left-0 bg-gray-100 border-r border-gray-200"></th>
               <th className="border-r border-gray-200"></th>
               <th className="border-r border-gray-200"></th>
               {TIME_SLOTS_KEYS.map(slot => (
                 <th key={slot + 'sub'} className="border-r border-gray-200 p-1">
                    <div className="grid grid-cols-2 gap-1">
                        <span>Vendas</span>
                        <span>GC</span>
                    </div>
                 </th>
               ))}
             </tr>
           </thead>

           <tbody className="divide-y divide-gray-100">
             {filteredHistory.map((entry) => {
               const isSelected = selectedIds.has(entry.id);
               return (
                 <tr key={entry.id} className={`hover:bg-blue-50 transition-colors ${isSelected ? 'bg-blue-50/50' : ''}`}>
                   <td className="p-3 sticky left-0 bg-white border-r border-gray-100 text-left font-medium text-gray-900 z-10">
                      <div className="flex items-center gap-3">
                        <input 
                            type="checkbox" 
                            checked={isSelected}
                            onChange={() => toggleSelection(entry.id)}
                            className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                        />
                        {new Date(entry.date).toLocaleDateString('pt-PT')}
                      </div>
                   </td>
                   <td className="p-2 border-r border-gray-100 text-gray-500">{entry.dayOfWeek}</td>
                   <td className="p-2 border-r border-gray-100 font-bold bg-yellow-50 text-gray-800">{formatCurrency(entry.totalSales)}</td>
                   
                   {TIME_SLOTS_KEYS.map(slot => (
                     <td key={slot} className="p-2 border-r border-gray-100">
                        <div className="grid grid-cols-2 gap-2 text-xs">
                           <span className="font-semibold text-gray-700">{Math.round(entry.slots[slot]?.sales || 0)}€</span>
                           <span className="text-gray-400">{entry.slots[slot]?.gc || 0}</span>
                        </div>
                     </td>
                   ))}
                 </tr>
               );
             })}
             {filteredHistory.length === 0 && (
                <tr>
                    <td colSpan={10} className="p-12 text-center text-gray-400">
                       <div className="flex flex-col items-center gap-2">
                         <Search size={32} className="opacity-20" />
                         <p>Nenhum histórico encontrado para o filtro selecionado.</p>
                         <div className="flex gap-2 mt-2">
                             <button onClick={handleGenerateMockData} className="text-purple-600 hover:underline text-xs font-bold">
                                Gerar dados demo
                             </button>
                             <span className="text-gray-300">|</span>
                             <button onClick={() => fileInputRef.current?.click()} className="text-blue-500 hover:underline text-xs">
                               Importar Excel
                             </button>
                         </div>
                       </div>
                    </td>
                </tr>
             )}
           </tbody>
        </table>
      </div>

      {/* 3. Footer Average Summary */}
      <div className="bg-slate-900 text-white p-4 rounded-xl shadow-lg flex flex-col md:flex-row items-center justify-between gap-6 animate-slide-up sticky bottom-2 z-30">
        
        <div className="flex items-center gap-4">
             <div className="p-3 bg-slate-800 rounded-lg">
                <CheckCircle size={24} className={selectedIds.size > 0 ? "text-green-400" : "text-gray-600"} />
             </div>
             <div>
                <p className="text-xs text-slate-400 uppercase font-bold">Média da Seleção</p>
                <div className="text-2xl font-bold flex items-baseline gap-2">
                    {averageData ? formatCurrency(averageData.totalSales) : '---'}
                    <span className="text-sm font-normal text-slate-400">Total Previsto</span>
                </div>
             </div>
        </div>

        {averageData && (
            <div className="hidden xl:flex gap-4 overflow-x-auto pb-1 max-w-3xl custom-scrollbar">
                {TIME_SLOTS_KEYS.map(slot => (
                    <div key={slot} className="flex flex-col items-center min-w-[80px] px-2 border-l border-slate-700">
                        <span className="text-[10px] text-slate-400 whitespace-nowrap">{slot}</span>
                        <span className="font-bold text-yellow-400">{averageData.slots[slot].sales}€</span>
                        <span className="text-[10px] text-slate-500">{averageData.slots[slot].gc} GC</span>
                    </div>
                ))}
            </div>
        )}

        <button
            onClick={handleApplyForecast}
            disabled={!averageData}
            className={`
                px-6 py-3 rounded-lg font-bold flex items-center gap-2 transition-all shadow-lg whitespace-nowrap
                ${averageData 
                    ? 'bg-blue-600 hover:bg-blue-500 text-white cursor-pointer hover:scale-105' 
                    : 'bg-slate-800 text-slate-600 cursor-not-allowed'}
            `}
        >
            Definir como Previsão
            <ArrowRight size={18} />
        </button>
      </div>

    </div>
  );
};