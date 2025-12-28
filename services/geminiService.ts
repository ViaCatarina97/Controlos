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
      Você é um especialista em faturas da HAVI Logistics Portugal.
      Analise o documento PDF anexado e extraia os dados da tabela intitulada "TOTAL POR GRUPO PRODUTO".

      INSTRUÇÕES DE EXTRAÇÃO:
      1. Localize a tabela que contém as colunas: "GRUPO PRODUTO", "VALOR LIQ.", "PTO VERDE", "Cont. Embal. Plástico" e "VALOR TOTAL".
      2. Para cada linha desta tabela (ex: CONGELADOS, REFRIGERADOS, SECOS COMIDA, etc.):
         - Extraia o nome do grupo (remova o número inicial se houver, ex: de "1 CONGELADOS" extraia apenas "CONGELADOS").
         - Extraia o valor da última coluna intitulada "VALOR TOTAL".
      3. Na linha final "TOTAL":
         - Extraia o valor da coluna "PTO VERDE".
         - Extraia o valor da última coluna "VALOR TOTAL" (Total Geral).
      4. Extraia o "Nº DOCUMENTO" e a "DATA DOCUMENTO" do cabeçalho da fatura.

      IMPORTANTE - FORMATO DE NÚMEROS:
      - A fatura usa vírgula como separador decimal (ex: 6.052,67).
      - Você DEVE converter para ponto (ex: 6052.67) para que o JSON retorne números válidos.
      - Remova o símbolo "EUR" ou "€".

      Retorne estritamente o JSON conforme o esquema definido.
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
                  nome: { type: Type.STRING, description: "Nome do grupo sem o número (ex: CONGELADOS)" },
                  valor_total: { type: Type.NUMBER, description: "Valor da coluna VALOR TOTAL" }
                },
                required: ["nome", "valor_total"]
              }
            },
            ponto_verde_total: { type: Type.NUMBER, description: "O valor da coluna PTO VERDE na linha de TOTAL" },
            total_geral_fatura: { type: Type.NUMBER, description: "O VALOR TOTAL na linha de TOTAL" }
          },
          required: ["documento", "data", "grupos", "total_geral_fatura"]
        }
      }
    });

    const textOutput = response.text;
    if (!textOutput) throw new Error("A API retornou uma resposta vazia.");
    
    return JSON.parse(textOutput.trim());

  } catch (error: any) {
    console.error("Erro na extração Gemini:", error);
    if (error.message?.includes("API key") || error.status === 403) {
      throw new Error("AUTH_REQUIRED");
    }
    throw error;
  }
};