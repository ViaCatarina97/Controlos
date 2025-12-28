
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
  // Sempre obter a chave do ambiente no momento da chamada
  const apiKey = process.env.API_KEY;

  if (!apiKey || apiKey === 'undefined' || apiKey === '') {
    throw new Error("AUTH_REQUIRED");
  }

  const ai = new GoogleGenAI({ apiKey });

  try {
    const base64Data = await fileToBase64(file);

    const prompt = `
      Analise o documento PDF da HAVI Logistics.
      Localize a tabela "TOTAL POR GRUPO PRODUTO".
      Extraia:
      1. Nº DOCUMENTO e DATA DOCUMENTO do cabeçalho.
      2. Para cada linha da tabela de grupos (ex: CONGELADOS, SECOS COMIDA), extraia o nome do grupo e o "VALOR TOTAL" (última coluna).
      3. O valor do "PTO VERDE" (Ponto Verde) da linha de total.
      4. O valor final absoluto da fatura (TOTAL da coluna VALOR TOTAL).

      Retorne estritamente JSON.
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
                  valor_total: { type: Type.NUMBER }
                },
                required: ["nome", "valor_total"]
              }
            },
            ponto_verde_total: { type: Type.NUMBER },
            total_geral_fatura: { type: Type.NUMBER }
          },
          required: ["documento", "data", "grupos", "total_geral_fatura"]
        }
      }
    });

    const textOutput = response.text;
    if (!textOutput) throw new Error("A API retornou uma resposta vazia.");
    
    return JSON.parse(textOutput.trim());

  } catch (error: any) {
    const errorMessage = error.message || "";
    console.error("Gemini Error:", errorMessage);

    // Mapear erros de permissão ou chave inválida para AUTH_REQUIRED
    if (
      errorMessage.includes("Requested entity was not found") || 
      errorMessage.includes("API key") ||
      errorMessage.includes("unauthorized") ||
      error.status === 403 || 
      error.status === 401
    ) {
      throw new Error("AUTH_REQUIRED");
    }
    throw error;
  }
};
