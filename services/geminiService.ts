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
  // Obter a chave API diretamente do ambiente
  const apiKey = process.env.API_KEY;

  if (!apiKey || apiKey === 'undefined' || apiKey === '') {
    throw new Error("AUTH_REQUIRED");
  }

  const ai = new GoogleGenAI({ apiKey });

  try {
    const base64Data = await fileToBase64(file);

    const prompt = `
      Você é um assistente especializado em ler faturas da HAVI Logistics.
      
      FOCO: Extrair dados da tabela "TOTAL POR GRUPO PRODUTO" (geralmente no final do documento).
      
      INSTRUÇÕES:
      1. Localize a tabela intitulada "TOTAL POR GRUPO PRODUTO".
      2. Extraia o nome do grupo e o valor da ÚLTIMA coluna ("VALOR TOTAL") para cada linha.
      3. Extraia o valor da coluna "PTO VERDE" na linha final de "TOTAL".
      4. Extraia o número do documento e a data do documento do cabeçalho.
      
      IMPORTANTE:
      - Nomes de grupos comuns: CONGELADOS, REFRIGERADOS, SECOS COMIDA, SECOS PAPEL, etc.
      - Use apenas números para os valores.
      - Retorne o resultado estritamente em JSON.
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
    if (!textOutput) throw new Error("Resposta da API vazia.");
    
    return JSON.parse(textOutput.trim());

  } catch (error: any) {
    const errorMessage = error.message || "";
    console.error("Gemini Service Error:", errorMessage);

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