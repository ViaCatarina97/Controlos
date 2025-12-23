
import { GoogleGenAI, Type } from "@google/genai";
import { StaffingTableEntry, AppSettings, Employee, SalesData } from "../types";

export const generateScheduleSuggestion = async (
  salesData: SalesData,
  staffingTable: StaffingTableEntry[],
  settings: AppSettings,
  employees: Employee[]
): Promise<string> => {
  // Fix: Direct use of process.env.API_KEY as per coding guidelines
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

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
    // Fix: Updated model to 'gemini-3-flash-preview' for basic text tasks
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
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

    // Fix: Correct way to extract text output from GenerateContentResponse
    return response.text;
  } catch (error) {
    console.error("Gemini Error:", error);
    throw error;
  }
};
