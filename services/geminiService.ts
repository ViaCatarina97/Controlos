import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";
import { StaffingTableEntry, AppSettings, Employee, SalesData } from "../types";

export const generateScheduleSuggestion = async (
  salesData: SalesData,
  staffingTable: StaffingTableEntry[],
  settings: AppSettings,
  employees: Employee[]
): Promise<string> => {
  // Configuração com a biblioteca oficial
  // Nota: No Vercel, usamos import.meta.env para Vite ou process.env
  const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY || "");

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
    Responda estritamente em JSON.
  `;

  try {
    // Usamos o modelo 'gemini-1.5-flash' que é o mais rápido e estável
    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash",
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: {
          type: SchemaType.OBJECT,
          properties: {
            rationale: { type: SchemaType.STRING },
            shiftDistribution: {
              type: SchemaType.OBJECT,
              properties: {
                abertura: { type: SchemaType.STRING },
                intermedio: { type: SchemaType.STRING },
                fecho: { type: SchemaType.STRING }
              }
            }
          }
        },
      },
    });

    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
    
  } catch (error) {
    console.error("Gemini Error:", error);
    throw error;
  }
};
