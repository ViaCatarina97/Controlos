
import React, { useState, useMemo, useRef } from 'react';
import { HistoryEntry, HourlyProjection } from '../types';
import { TIME_SLOTS_KEYS } from '../constants';
import { Calendar, TrendingUp, CheckCircle, Search, ArrowRight, Filter, FileSpreadsheet, AlertCircle, Trash2, Database, Save, CloudCheck } from 'lucide-react';
import * as XLSX from 'xlsx';

interface HistoryForecastProps {
  history: HistoryEntry[];
  setHistory: React.Dispatch<React.SetStateAction<HistoryEntry[]>>;
  targetDate: string;
  setTargetDate: (date: string) => void;
  targetSales: number;
  setTargetSales: (val: number) => void;
  setHourlyData: (data: HourlyProjection[]) => void;
  onNavigateToPositioning: () => void;
}

export const HistoryForecast: React.FC<HistoryForecastProps> = ({ 
  history,
  setHistory,
  targetDate,
  setTargetDate,
  setTargetSales,
  setHourlyData,
  onNavigateToPositioning
}) => {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  // Agora suporta múltiplos dias selecionados
  const [dayFilters, setDayFilters] = useState<number[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const filteredHistory = useMemo(() => {
    // Se nenhum filtro estiver selecionado, mostra todos. Caso contrário, filtra pelos dias incluídos no array.
    return history.filter(entry => dayFilters.length === 0 || dayFilters.includes(entry.dayOfWeek));
  }, [dayFilters, history]);

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

  const toggleDayFilter = (day: number) => {
    setDayFilters(prev => {
      const isAlreadySelected = prev.includes(day);
      if (isAlreadySelected) {
        return prev.filter(d => d !== day);
      } else {
        return [...prev, day];
      }
    });
    // Limpar seleção individual ao mudar o filtro global para evitar confusão na média
    setSelectedIds(new Set());
  };

  const handleDeleteEntry = (id: string) => {
    if (confirm('Tem a certeza que deseja eliminar este registo histórico?')) {
      setHistory(prev => prev.filter(h => h.id !== id));
      const newSelected = new Set(selectedIds);
      newSelected.delete(id);
      setSelectedIds(newSelected);
      setLastSaved(new Date().toLocaleTimeString());
    }
  };

  const handleClearHistory = () => {
    if (confirm('AVISO: Deseja eliminar TODO o histórico deste restaurante? Esta ação não pode ser revertida.')) {
        setHistory([]);
        setSelectedIds(new Set());
        setDayFilters([]);
        setLastSaved(new Date().toLocaleTimeString());
    }
  };

  const averageData = useMemo(() => {
    const selectedEntries = history.filter(h => selectedIds.has(h.id));
    const count = selectedEntries.length;
    if (count === 0) return null;

    const avgTotalSales = Math.round(selectedEntries.reduce((sum, e) => sum + e.totalSales, 0) / count);
    const avgTotalGC = Math.round(selectedEntries.reduce((sum, e) => sum + e.totalGC, 0) / count);

    const slotsAverage: Record<string, { sales: number; gc: number }> = {};
    TIME_SLOTS_KEYS.forEach(slotKey => {
      const sumSales = selectedEntries.reduce((sum, e) => sum + (e.slots[slotKey]?.sales || 0), 0);
      const sumGC = selectedEntries.reduce((sum, e) => sum + (e.slots[slotKey]?.gc || 0), 0);
      slotsAverage[slotKey] = {
        sales: Math.round(sumSales / count),
        gc: Math.round(sumGC / count)
      };
    });

    return { totalSales: avgTotalSales, totalGC: avgTotalGC, slots: slotsAverage };
  }, [selectedIds, history]);

  const handleApplyForecast = () => {
    if (!averageData) return;
    setTargetSales(averageData.totalSales);
    const hourlyProjections: HourlyProjection[] = TIME_SLOTS_KEYS.map(slotKey => {
      const metrics = averageData.slots[slotKey];
      return {
        hour: slotKey.replace(/:00/g, 'h'), 
        totalSales: metrics.sales,
        totalGC: metrics.gc,
        channelGC: {
          counter: Math.round(metrics.gc * 0.15),
          sok: Math.round(metrics.gc * 0.73),
          drive: Math.round(metrics.gc * 0.05),
          delivery: Math.round(metrics.gc * 0.07)
        }
      };
    });
    setHourlyData(hourlyProjections);
    onNavigateToPositioning();
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setIsSaving(true);
    const reader = new FileReader();
    reader.onload = (e) => {
        const data = e.target?.result;
        if (data) {
            parseExcel(data as ArrayBuffer);
            setTimeout(() => {
                setIsSaving(false);
                setLastSaved(new Date().toLocaleTimeString());
            }, 1000);
        }
    };
    reader.readAsArrayBuffer(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const parseExcel = (buffer: ArrayBuffer) => {
    try {
        const wb = XLSX.read(buffer, { type: 'array', cellDates: true });
        const sheet = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: true, defval: '' }) as any[][];
        const newEntries: HistoryEntry[] = [];

        const parseDate = (val: any) => {
            if (val === undefined || val === null || val === '') return null;
            if (val instanceof Date) return val.toISOString().split('T')[0];
            if (typeof val === 'number') {
                const date = new Date(Math.round((val - 25569) * 86400 * 1000));
                if (!isNaN(date.getTime())) return date.toISOString().split('T')[0];
            }
            const str = String(val).trim();
            const dmyMatch = str.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})/);
            if (dmyMatch) {
                const d = dmyMatch[1].padStart(2, '0');
                const m = dmyMatch[2].padStart(2, '0');
                let y = dmyMatch[3];
                if (y.length === 2) y = '20' + y;
                return `${y}-${m}-${d}`;
            }
            return null;
        };

        const parseNum = (val: any) => {
            if (typeof val === 'number') return val;
            const clean = String(val).replace(/[€\s\r\n\t]/g, '').replace(',', '.');
            const n = parseFloat(clean);
            return isNaN(n) ? 0 : n;
        };

        rows.forEach((row) => {
            const dateStr = parseDate(row[0]);
            if (!dateStr) return; 
            const entry: HistoryEntry = {
                id: crypto.randomUUID(),
                date: dateStr,
                dayOfWeek: new Date(dateStr).getDay(),
                totalSales: 0,
                totalGC: 0,
                slots: {}
            };
            const mappings = [
                { key: "12:00-13:00", s: 4, g: 5 }, { key: "13:00-14:00", s: 6, g: 7 }, { key: "14:00-15:00", s: 8, g: 9 }, 
                { key: "19:00-20:00", s: 10, g: 11 }, { key: "20:00-21:00", s: 12, g: 13 }, { key: "21:00-22:00", s: 14, g: 15 },
            ];
            let ts = 0, tg = 0;
            let hasHourlyData = false;
            mappings.forEach(m => {
                const s = parseNum(row[m.s]);
                const g = parseNum(row[m.g]);
                if (s > 0 || g > 0) hasHourlyData = true;
                entry.slots[m.key] = { sales: s, gc: g };
                ts += s; tg += g;
            });
            if (!hasHourlyData) { ts = parseNum(row[2]); tg = parseNum(row[3]); }
            entry.totalSales = Math.round(ts);
            entry.totalGC = Math.round(tg);
            if (entry.totalSales > 0) newEntries.push(entry);
        });

        if (newEntries.length > 0) {
            setHistory(prev => [...prev, ...newEntries]);
        } else {
            alert("Erro: Não foram encontrados dados válidos. Certifique-se que as DATAS estão na Coluna A (dd/mm/yyyy).");
        }
    } catch (err) {
        console.error("XLSX Error:", err);
        alert("Erro técnico ao processar o Excel.");
    }
  };

  const formatCurrency = (val: number) => `€ ${val.toLocaleString('pt-PT')}`;
  const getDayName = (day: number) => ['Dom', '2ª', '3ª', '4ª', '5ª', '6ª', 'Sáb'][day];

  return (
    <div className="space-y-6 h-full flex flex-col animate-fade-in">
      {/* Área de Controlos Sticky */}
      <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200 flex flex-col lg:flex-row justify-between items-end lg:items-center gap-4 sticky top-[-24px] z-30">
        <div className="flex flex-col">
          <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <TrendingUp className="text-blue-600" /> Histórico & Previsão
          </h2>
          <div className="flex items-center gap-2 mt-1">
             <span className={`flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${isSaving ? 'bg-amber-50 text-amber-600 border-amber-100 animate-pulse' : 'bg-emerald-50 text-emerald-600 border-emerald-100'}`}>
                {isSaving ? <Database size={12}/> : <CheckCircle size={12}/>}
                {isSaving ? 'GRAVANDO NA BASE DE DADOS...' : 'BASE DE DADOS SINCRONIZADA'}
             </span>
             {lastSaved && <span className="text-[10px] text-gray-400 font-medium">Última gravação: {lastSaved}</span>}
          </div>
        </div>
        
        <div className="flex flex-col sm:flex-row items-center gap-4 w-full lg:w-auto">
            <div className="flex items-center gap-2 bg-gray-50 p-2 rounded-lg border border-gray-200">
                <div className="flex flex-col">
                    <div className="flex justify-between items-center mb-1">
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Filtrar Dias (Acumulativo)</span>
                        {dayFilters.length > 0 && (
                            <button onClick={() => setDayFilters([])} className="text-[9px] text-blue-600 font-black uppercase hover:underline">Limpar</button>
                        )}
                    </div>
                    <div className="flex gap-1">
                        {/* Ordem: 2ª, 3ª, 4ª, 5ª, 6ª, Sáb, Dom */}
                        {[1,2,3,4,5,6,0].map(d => {
                            const isSelected = dayFilters.includes(d);
                            return (
                                <button 
                                    key={d} 
                                    onClick={() => toggleDayFilter(d)}
                                    className={`w-8 h-8 rounded-lg text-[10px] font-bold flex items-center justify-center transition-all border ${isSelected ? 'bg-blue-600 border-blue-600 text-white shadow-md scale-110' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-100'}`}
                                >
                                    {getDayName(d)}
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>
            <div className="flex items-center gap-3">
               <div className="flex gap-2 h-full">
                  <input type="file" ref={fileInputRef} accept=".xls,.xlsx" className="hidden" onChange={handleFileUpload} />
                  <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-2 bg-emerald-600 text-white px-3 py-2 rounded-lg hover:bg-emerald-700 transition-colors shadow-sm text-sm font-medium h-full">
                    <FileSpreadsheet size={18} /> <span className="hidden md:inline">Importar Excel</span>
                  </button>
                  <button onClick={handleClearHistory} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors border border-gray-200 bg-white" title="Limpar Tudo">
                    <Trash2 size={18} />
                  </button>
               </div>
               <div className="flex flex-col">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Data Destino</span>
                  <input type="date" value={targetDate} onChange={(e) => setTargetDate(e.target.value)} className="bg-white border border-gray-300 text-gray-800 text-sm rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500 shadow-sm" />
               </div>
            </div>
        </div>
      </div>

      {/* Tabela com Cabeçalho Sticky Offset */}
      <div className="flex-1 overflow-visible bg-white rounded-xl shadow border border-gray-200 relative min-h-[300px]">
        <table className="w-full text-sm text-center border-separate border-spacing-0">
           <thead className="text-[11px] font-black text-gray-700 uppercase tracking-tighter">
             <tr>
               <th className="p-3 sticky left-0 top-[116px] bg-white z-40 border-r border-b border-gray-200 min-w-[140px] text-left shadow-[1px_1px_0_0_rgba(0,0,0,0.1)]">
                  <div className="flex items-center gap-3">
                    <input type="checkbox" className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500" onChange={(e) => handleSelectAll(e.target.checked)} checked={filteredHistory.length > 0 && selectedIds.size === filteredHistory.length} />
                    <span>DATA</span>
                  </div>
               </th>
               <th className="p-3 sticky top-[116px] bg-[#fffbeb] z-30 border-r border-b border-yellow-200 text-yellow-800 w-24 shadow-[0_1px_0_0_rgba(0,0,0,0.05)]">DIA SEM.</th>
               <th className="p-3 sticky top-[116px] bg-[#fffbeb] z-30 border-r border-b border-yellow-200 text-yellow-800 w-32 shadow-[0_1px_0_0_rgba(0,0,0,0.05)]">VENDAS TOTAIS</th>
               {TIME_SLOTS_KEYS.map(slot => (
                 <th key={slot} className={`p-2 sticky top-[116px] z-30 border-r border-b border-white/20 text-white min-w-[120px] shadow-[0_1px_0_0_rgba(0,0,0,0.05)] ${parseInt(slot) >= 19 ? 'bg-[#f97316]' : 'bg-[#475569]'}`}>
                    {slot}
                 </th>
               ))}
               <th className="p-3 sticky top-[116px] bg-gray-50 z-30 text-gray-400 w-16 border-b border-gray-200 shadow-[0_1px_0_0_rgba(0,0,0,0.05)]">AÇÕES</th>
             </tr>
           </thead>
           <tbody className="divide-y divide-gray-100">
             {filteredHistory.map((entry) => {
               const isSelected = selectedIds.has(entry.id);
               const [y, m, d] = entry.date.split('-');
               return (
                 <tr key={entry.id} className={`hover:bg-blue-50 transition-colors ${isSelected ? 'bg-blue-50/50' : ''}`}>
                   <td className="p-3 sticky left-0 bg-white border-r border-gray-100 text-left font-medium text-gray-900 z-10 shadow-[1px_0_0_0_rgba(0,0,0,0.05)]">
                      <div className="flex items-center gap-3">
                        <input type="checkbox" checked={isSelected} onChange={() => toggleSelection(entry.id)} className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500" />
                        {`${d}/${m}/${y}`}
                      </div>
                   </td>
                   <td className="p-2 border-r border-gray-100 text-gray-500 font-bold">{getDayName(entry.dayOfWeek)}</td>
                   <td className="p-2 border-r border-gray-100 font-black bg-[#fffef3] text-gray-800">{formatCurrency(entry.totalSales)}</td>
                   {TIME_SLOTS_KEYS.map(slot => (
                     <td key={slot} className="p-2 border-r border-gray-100">
                        <div className="grid grid-cols-2 gap-2 text-xs">
                           <span className="font-bold text-slate-800">{Math.round(entry.slots[slot]?.sales || 0)}€</span>
                           <span className="text-slate-400 font-medium">{entry.slots[slot]?.gc || 0} GC</span>
                        </div>
                     </td>
                   ))}
                   <td className="p-2 flex justify-center items-center">
                      <button onClick={() => handleDeleteEntry(entry.id)} className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded transition-colors"><Trash2 size={16} /></button>
                   </td>
                 </tr>
               );
             })}
             {filteredHistory.length === 0 && (
                 <tr>
                    <td colSpan={TIME_SLOTS_KEYS.length + 4} className="py-20 text-center text-gray-400">
                        <Database size={48} className="mx-auto mb-4 opacity-10" />
                        <p className="font-medium text-lg italic">Sem dados históricos correspondentes aos filtros selecionados.</p>
                        <p className="text-xs">Altere os filtros ou importe um ficheiro Excel para começar.</p>
                    </td>
                 </tr>
             )}
           </tbody>
        </table>
      </div>

      <div className="bg-slate-900 text-white p-4 rounded-xl shadow-lg flex flex-col md:flex-row items-center justify-between gap-6 animate-slide-up sticky bottom-2 z-30 border border-slate-700">
        <div className="flex items-center gap-4">
             <div className="p-3 bg-slate-800 rounded-lg"><CheckCircle size={24} className={selectedIds.size > 0 ? "text-emerald-400" : "text-gray-600"} /></div>
             <div>
                <p className="text-xs text-slate-400 uppercase font-bold tracking-widest">Previsão Baseada na Média</p>
                <div className="text-2xl font-bold flex items-baseline gap-2">
                    {averageData ? formatCurrency(averageData.totalSales) : '---'}
                    <span className="text-xs font-normal text-slate-400">({selectedIds.size} dias selecionados)</span>
                </div>
             </div>
        </div>
        <button onClick={handleApplyForecast} disabled={!averageData} className={`px-6 py-3 rounded-lg font-bold flex items-center gap-2 transition-all shadow-lg whitespace-nowrap ${averageData ? 'bg-blue-600 hover:bg-blue-500 text-white cursor-pointer hover:scale-105 active:scale-95' : 'bg-slate-800 text-slate-600 cursor-not-allowed'}`}>
            Definir como Previsão Ativa <ArrowRight size={18} />
        </button>
      </div>
    </div>
  );
};
