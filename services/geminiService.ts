import { GoogleGenAI, Type } from "@google/genai";
import { StaffingTableEntry, AppSettings, Employee, SalesData } from "../types";

export const generateScheduleSuggestion = async (
  salesData: SalesData,
  staffingTable: StaffingTableEntry[],
  settings: AppSettings,
  employees: Employee[]
): Promise<string> => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API Key is missing.");
  }

  const ai = new GoogleGenAI({ apiKey });

  const prompt = `
    Atue como um gerente operacional de restaurante.
    
    Contexto:
    Restaurante: ${settings.restaurantName} (${settings.restaurantType})
    Previsão de Vendas: €${salesData.amount}
    
    Tabela de Staffing (Vendas -> Nº Pessoas):
    ${staffingTable.map(r => `€${r.minSales}-€${r.maxSales}: ${r.staffCount} pessoas (${r.stationLabel})`).join('\n')}
    
    Staff Disponível:
    ${employees.map(e => `- ${e.name} (${e.role})`).join('\n')}
    
    Tarefa:
    Sugira a alocação ideal para os 3 turnos (Abertura, Intermédio, Fecho).
    Foque na eficiência baseada nas vendas projetadas.
    Responda em JSON.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            rationale: { type: Type.STRING },
            shiftDistribution: {
              type: Type.OBJECT,
              properties: {
                abertura: { type: Type.STRING },
                intermedio: { type: Type.STRING },
                fecho: { type: Type.STRING }
              }
            }
          }
        }
      }
    });

    return response.text;
  } catch (error) {
    console.error("Gemini Error:", error);
    throw error;
  }
};