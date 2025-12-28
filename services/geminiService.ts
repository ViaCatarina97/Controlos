
import { GoogleGenAI, Type } from "@google/genai";

// Função para converter File para Base64
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
    reader.onerror = () => reject(new Error("Erro ao ler o ficheiro."));
  });
};

export const processInvoicePdf = async (file: File): Promise<any> => {
  // Obter a chave diretamente do ambiente no momento da chamada
  const apiKey = process.env.API_KEY;
  
  // Verificação robusta: se a chave for nula, vazia ou a string "undefined"
  if (!apiKey || apiKey === "" || apiKey === "undefined") {
    throw new Error("AUTH_REQUIRED");
  }

  // Inicialização obrigatória conforme as diretrizes (sempre novo instance)
  const ai = new GoogleGenAI({ apiKey });

  try {
    const base64Data = await fileToBase64(file);

    const prompt = `
      Aja como um analista financeiro. Analise este PDF da HAVI Logistics e extraia os dados da tabela 'TOTAL POR GRUPO PRODUTO'.
      Regras de extração:
      1. Extraia o 'Nº DOCUMENTO' e a 'DATA DOCUMENTO'.
      2. Mapeie cada linha da tabela para o formato JSON.
      3. Extraia o valor do 'PTO VERDE' (Ponto Verde).
      4. O valor final da fatura.

      Retorne APENAS o JSON.
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
    if (!textOutput) throw new Error("Resposta da API vazia.");
    
    return JSON.parse(textOutput.trim());

  } catch (error: any) {
    console.error("Gemini Critical Error:", error);
    // Erros de permissão ou chave inválida/ausente
    if (error.message?.includes("API key") || error.status === 403 || error.status === 401) {
      throw new Error("AUTH_REQUIRED");
    }
    throw error;
  }
};
