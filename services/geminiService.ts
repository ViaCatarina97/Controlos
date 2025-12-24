
import { GoogleGenAI, Type } from "@google/genai";
import { StaffingTableEntry, AppSettings, Employee, SalesData } from "../types";

// Função para converter File para Base64 com tratamento de erro
const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const base64String = (reader.result as string).split(',')[1];
      if (!base64String) {
        reject(new Error("Falha ao processar o conteúdo do ficheiro."));
      } else {
        resolve(base64String);
      }
    };
    reader.onerror = () => reject(new Error("Erro ao ler o ficheiro. O ficheiro pode estar corrompido."));
  });
};

export const processInvoicePdf = async (file: File): Promise<any> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  try {
    // 1. Converter PDF para Base64
    const base64Data = await fileToBase64(file);

    // 2. Definir o Prompt especializado na fatura HAVI
    const prompt = `
      Atue como um especialista em processamento de faturas logísticas. 
      Analise o PDF da fatura HAVI fornecido e extraia os dados da tabela "TOTAL POR GRUPO PRODUTO".
      
      INSTRUÇÕES:
      1. Localize a tabela "TOTAL POR GRUPO PRODUTO".
      2. Para cada grupo listado (ex: CONGELADOS, REFRIGERADOS, SECOS PAPEL), extraia o valor numérico da coluna "VALOR TOTAL" (a última coluna da direita).
      3. Localize a linha de "TOTAL" e extraia o valor da coluna "PTO VERDE".
      
      MAPEAMENTO DE NOMES DE GRUPO:
      Retorne os nomes normalizados conforme o UI: "Congelados", "Refrigerados", "Secos Comida", "Secos Papel", "Manutenção Limpeza", "Marketing IPL", "Marketing Geral", "Produtos Frescos", "Manutenção Limpeza Compras", "Condimentos", "Condimentos Cozinha", "Material Adm", "Manuais", "Ferramentas Utensilios", "Marketing Geral Custo", "Fardas", "Distribuição de Marketing", "Bulk Alimentar", "Bulk Papel".

      REGRAS:
      - Remova símbolos de moeda (€ ou EUR).
      - Converta vírgulas decimais para pontos (ex: 6.052,67 -> 6052.67).
      - Se um grupo não for encontrado, ignore-o ou retorne 0.
      
      Responda APENAS em formato JSON puro.
    `;

    // 3. Chamar a API do Gemini
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: 'application/pdf',
              data: base64Data,
            },
          },
          { text: prompt }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            groups: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  description: { type: Type.STRING },
                  total: { type: Type.NUMBER }
                },
                required: ["description", "total"]
              }
            },
            pontoVerde: { type: Type.NUMBER }
          },
          required: ["groups", "pontoVerde"]
        }
      }
    });

    // 4. Retornar os dados parseados
    return JSON.parse(response.text || '{}');

  } catch (error: any) {
    console.error("Gemini Invoice Error:", error);
    if (error.message?.includes("corrompido")) {
      throw new Error("Não foi possível ler o PDF. O ficheiro parece estar corrompido ou protegido.");
    }
    throw new Error("Erro na extração de dados da fatura. Por favor, tente novamente.");
  }
};

export const generateScheduleSuggestion = async (
  salesData: SalesData,
  staffingTable: StaffingTableEntry[],
  settings: AppSettings,
  employees: Employee[]
): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  const prompt = `
    Atue como um gerente operacional de restaurante.
    Restaurante: ${settings.restaurantName}
    Previsão de Vendas: €${salesData.amount}
    Sugira a alocação para os turnos baseando-se na tabela de staffing e funcionários disponíveis.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        responseMimeType: "application/json"
      }
    });
    return response.text;
  } catch (error) {
    console.error("Gemini Error:", error);
    throw error;
  }
};
