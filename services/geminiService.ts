// 1. Correção do import: O nome correto do pacote é @google/generative-ai
import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";

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
  // 2. No Vite/Vercel, use import.meta.env para variáveis de ambiente
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error("AUTH_REQUIRED");
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  // Uso do modelo 1.5 Flash que suporta PDFs nativamente
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

  try {
    const base64Data = await fileToBase64(file);

    const prompt = `
      Analise a fatura da HAVI Logistics Portugal[cite: 1, 10].
      Extraia os dados da tabela "TOTAL POR GRUPO PRODUTO"[cite: 57, 58].
      
      Campos a extrair da tabela:
      - Grupos: CONGELADOS, REFRIGERADOS, SECOS COMIDA, SECOS PAPEL, PRODUTOS FRESCOS, MANUTENÇÃO & LIMPEZA COMPRAS, FERRAMENTAS & UTENSÍLIOS, BULK ALIMENTAR, BULK PAPEL.
      - Extraia o VALOR LIQ. de cada grupo.
      - Extraia o PTO VERDE da linha TOTAL (valor: 30.06).
      - Do cabeçalho: Nº DOCUMENTO (7131317425) e DATA ENTREGA (20/12/2025)[cite: 29, 30].
    `;

    const result = await model.generateContent({
      contents: [{
        role: "user",
        parts: [
          {
            inlineData: {
              mimeType: "application/pdf",
              data: base64Data
            }
          },
          { text: prompt }
        ]
      }],
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: {
          type: SchemaType.OBJECT,
          properties: {
            documento: { type: SchemaType.STRING },
            data: { type: SchemaType.STRING },
            grupos: {
              type: SchemaType.ARRAY,
              items: {
                type: SchemaType.OBJECT,
                properties: {
                  nome: { type: SchemaType.STRING },
                  total: { type: SchemaType.NUMBER } // Alterado para 'total' para bater com o seu BillingControl
                },
                required: ["nome", "total"]
              }
            },
            pto_verde_total: { type: SchemaType.NUMBER },
            valor_final: { type: SchemaType.NUMBER }
          },
          required: ["documento", "data", "grupos", "valor_final"]
        }
      }
    });

    const response = await result.response;
    return JSON.parse(response.text());

  } catch (error: any) {
    console.error("Erro Gemini:", error);
    throw error;
  }
};