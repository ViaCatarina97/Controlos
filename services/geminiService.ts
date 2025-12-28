
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
  // Verificação rigorosa da API Key antes da inicialização
  const apiKey = process.env.API_KEY;
  if (!apiKey || apiKey === "undefined" || apiKey === "") {
    throw new Error("AUTH_REQUIRED");
  }

  // Inicialização obrigatória conforme as diretrizes
  const ai = new GoogleGenAI({ apiKey });

  try {
    const base64Data = await fileToBase64(file);

    const prompt = `
      Aja como um especialista em análise de faturas da HAVI Logistics. 
      Analise o PDF e identifique a tabela 'TOTAL POR GRUPO PRODUTO'.
      Extraia:
      1. Nº da Fatura (Documento)
      2. Data da Fatura
      3. Grupos e seus valores totais (Coluna Valor Total)
      4. Valor do Ponto Verde
      5. Valor Final da Fatura

      Retorne APENAS um objeto JSON.
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
    if (!textOutput) throw new Error("A API não retornou dados legíveis.");
    
    return JSON.parse(textOutput.trim());

  } catch (error: any) {
    console.error("Gemini Process Error:", error);
    if (error.message?.includes("Requested entity was not found") || error.message?.includes("API key")) {
      throw new Error("AUTH_REQUIRED");
    }
    throw error;
  }
};
