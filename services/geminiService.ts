
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
      Aja como um especialista em conferência de faturas HAVI Logistics.
      Analise o PDF e foque EXCLUSIVAMENTE na tabela intitulada "TOTAL POR GRUPO PRODUTO".
      
      INSTRUÇÕES TÉCNICAS:
      1. Localize a tabela de resumo de grupos (conforme a imagem de exemplo).
      2. Para cada linha (ex: CONGELADOS, REFRIGERADOS, etc.), ignore as colunas do meio e extraia APENAS o valor da ÚLTIMA coluna à direita, intitulada "VALOR TOTAL".
      3. Na linha final "TOTAL", extraia o valor da coluna "PTO VERDE".
      4. Extraia também o número do documento (ex: ZF2 BW1X/...) e a data da fatura.

      REGRAS DE FORMATAÇÃO:
      - Remova "EUR" ou "€" dos valores.
      - Retorne estritamente um JSON.
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
                  nome: { type: Type.STRING, description: "O nome do grupo exatamente como escrito na primeira coluna." },
                  valor_total: { type: Type.NUMBER, description: "O valor da última coluna da direita." }
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
