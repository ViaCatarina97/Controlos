import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";

const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve((reader.result as string).split(',')[1]);
    reader.onerror = reject;
  });
};

export const processInvoicePdf = async (file: File): Promise<any> => {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (!apiKey) throw new Error("AUTH_REQUIRED");

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

  try {
    const base64Data = await fileToBase64(file);

    const prompt = `
      Analise a fatura HAVI anexada. 
      Extraia os valores da tabela "TOTAL POR GRUPO PRODUTO". [cite: 57]
      Converta valores como "6.052,67" para "6052.67" (ponto em vez de vírgula). 
      
      Campos obrigatórios:
      - documento: Nº DOCUMENTO 
      - data: DATA ENTREGA [cite: 30]
      - pto_verde_total: Valor da coluna PTO VERDE na linha TOTAL 
      - grupos: Lista com {nome, total} para cada grupo (Ex: CONGELADOS, REFRIGERADOS). 
    `;

    const result = await model.generateContent({
      contents: [{
        role: "user",
        parts: [{ inlineData: { mimeType: "application/pdf", data: base64Data } }, { text: prompt }]
      }],
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: {
          type: SchemaType.OBJECT,
          properties: {
            documento: { type: SchemaType.STRING },
            data: { type: SchemaType.STRING },
            pto_verde_total: { type: SchemaType.NUMBER },
            valor_final: { type: SchemaType.NUMBER },
            grupos: {
              type: SchemaType.ARRAY,
              items: {
                type: SchemaType.OBJECT,
                properties: {
                  nome: { type: SchemaType.STRING },
                  total: { type: SchemaType.NUMBER }
                },
                required: ["nome", "total"]
              }
            }
          },
          required: ["documento", "data", "grupos"]
        }
      }
    });

    return JSON.parse(result.response.text());
  } catch (error) {
    console.error("Erro Gemini:", error);
    throw new Error("Não foi possível processar a fatura. Verifique a API Key.");
  }
};
