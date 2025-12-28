
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
  // A chave de API é injetada no ambiente. 
  // Devemos inicializar a instância SEMPRE dentro da função para captar a chave mais recente.
  const apiKey = process.env.API_KEY;

  if (!apiKey || apiKey === 'undefined' || apiKey === '') {
    throw new Error("AUTH_REQUIRED");
  }

  const ai = new GoogleGenAI({ apiKey });

  try {
    const base64Data = await fileToBase64(file);

    const prompt = `
      Analise esta fatura da HAVI Logistics.
      Extraia os dados da tabela 'TOTAL POR GRUPO PRODUTO'.
      Campos necessários:
      1. Nº do Documento
      2. Data do Documento (DD/MM/YYYY)
      3. Grupos e Valores (Coluna Valor Total)
      4. Valor do Ponto Verde
      5. Valor Final da Fatura

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
            pto_verde: { type: Type.NUMBER },
            valor_final_fatura: { type: Type.NUMBER }
          },
          required: ["documento", "data", "grupos", "valor_final_fatura"]
        }
      }
    });

    const textOutput = response.text;
    if (!textOutput) throw new Error("A API retornou uma resposta vazia.");
    
    return JSON.parse(textOutput.trim());

  } catch (error: any) {
    const errorMessage = error.message || "";
    console.error("Gemini SDK Error:", errorMessage);

    // Conforme diretrizes: "Requested entity was not found" indica necessidade de re-seleção de chave
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
