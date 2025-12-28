
import { GoogleGenAI, Type } from "@google/genai";

const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      const base64String = result.split(',')[1];
      resolve(base64String);
    };
    reader.onerror = reject;
  });
};

export const processInvoicePdf = async (file: File): Promise<any> => {
  const apiKey = process.env.API_KEY;

  if (!apiKey || apiKey === 'undefined' || apiKey === '') {
    throw new Error("AUTH_REQUIRED");
  }

  const ai = new GoogleGenAI({ apiKey });

  try {
    const base64Data = await fileToBase64(file);

    const prompt = `
      Aja como um especialista em conferência de faturas da HAVI Logistics.
      Analise o documento PDF anexado, focando especificamente na tabela de resumo intitulada 'TOTAL POR GRUPO PRODUTO' (geralmente localizada nas páginas finais).
      
      Extraia os seguintes campos:
      1. DOCUMENTO: O número da fatura (ex: ZF2 BW1X/7131317425).
      2. DATA: A data do documento (formato DD/MM/YYYY).
      3. GRUPOS: Uma lista de objetos contendo o 'nome' do grupo (ex: CONGELADOS, SECOS COMIDA) e o 'total' da coluna 'VALOR TOTAL'.
      4. PTO_VERDE_TOTAL: O valor total da coluna 'PTO VERDE' na linha de TOTAL da tabela.
      5. VALOR_FINAL: O valor total final da fatura (TOTAL da coluna 'VALOR TOTAL').

      Certifique-se de extrair os valores da coluna 'VALOR TOTAL' e não apenas do 'VALOR LIQ.'.
      Retorne estritamente um JSON.
    `;

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
            documento: { type: Type.STRING },
            data: { type: Type.STRING },
            grupos: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  nome: { type: Type.STRING },
                  total: { type: Type.NUMBER }
                },
                required: ["nome", "total"]
              }
            },
            pto_verde_total: { type: Type.NUMBER },
            valor_final: { type: Type.NUMBER }
          },
          required: ["documento", "data", "grupos", "valor_final"]
        }
      }
    });

    const textOutput = response.text;
    if (!textOutput) throw new Error("A API retornou uma resposta vazia.");
    
    return JSON.parse(textOutput.trim());

  } catch (error: any) {
    const errorMessage = error.message || "";
    console.error("Gemini SDK Error:", errorMessage);

    if (
      errorMessage.includes("Requested entity was not found") || 
      errorMessage.includes("API key") ||
      errorMessage.includes("API_KEY") ||
      error.status === 403 || 
      error.status === 401
    ) {
      throw new Error("AUTH_REQUIRED");
    }
    throw error;
  }
};
