
import { GoogleGenAI, Type } from "@google/genai";

const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const base64String = (reader.result as string).split(',')[1];
      resolve(base64String);
    };
    reader.onerror = reject;
  });
};

export const processInvoicePdf = async (file: File): Promise<any> => {
  // Criar instância com a chave atual do ambiente
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  try {
    const base64Data = await fileToBase64(file);

    const prompt = `
      Aja como um analista de dados. Analise esta fatura da HAVI Logistics e extraia os dados da tabela 'TOTAL POR GRUPO PRODUTO'.
      Identifique o Nº Documento, Data, e os valores totais de cada grupo de produtos, além do Ponto Verde.
      Retorne exclusivamente um objeto JSON.
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
            pto_verde: { type: Type.NUMBER },
            valor_final_fatura: { type: Type.NUMBER }
          },
          required: ["documento", "data", "grupos", "valor_final_fatura"]
        }
      }
    });

    const textOutput = response.text;
    if (!textOutput) throw new Error("A API não retornou dados.");
    
    return JSON.parse(textOutput.trim());

  } catch (error: any) {
    console.error("Gemini Error:", error);
    // Se falhar por falta de chave ou permissão, sinalizamos para o componente abrir o seletor
    if (error.message?.includes("API Key") || error.status === 403 || error.status === 401) {
      throw new Error("AUTH_REQUIRED");
    }
    throw error;
  }
};
