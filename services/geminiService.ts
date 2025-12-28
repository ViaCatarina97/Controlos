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
  // Obtemos a chave no momento exato da chamada para evitar problemas de sincronização
  const apiKey = process.env.API_KEY;

  if (!apiKey || apiKey === 'undefined' || apiKey === '') {
    throw new Error("AUTH_REQUIRED");
  }

  // Inicialização obrigatória conforme as diretrizes (sempre nova instância)
  const ai = new GoogleGenAI({ apiKey });

  try {
    const base64Data = await fileToBase64(file);

    const prompt = `
      Aja como um analista de dados especializado em logística. Analise esta fatura da HAVI Logistics.
      Extraia os dados da tabela intitulada 'TOTAL POR GRUPO PRODUTO'.
      Identifique obrigatoriamente:
      1. Nº DO DOCUMENTO (fatura)
      2. DATA DO DOCUMENTO
      3. Grupos (Código e Nome) e os respetivos Valores Totais.
      4. Valor do Ponto Verde (contribuição).
      5. Valor Total Final da fatura.

      Retorne exclusivamente um objeto JSON seguindo o esquema definido.
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
            data: { type: Type.STRING, description: 'Data no formato DD/MM/YYYY' },
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
    if (!textOutput) throw new Error("A API não retornou conteúdo.");
    
    return JSON.parse(textOutput.trim());

  } catch (error: any) {
    console.error("Gemini Error:", error);
    // Verificação de erro de permissão ou chave não encontrada
    if (
      error.message?.includes("API key") || 
      error.message?.includes("API_KEY") ||
      error.status === 403 || 
      error.status === 401 ||
      error.message?.includes("Requested entity was not found")
    ) {
      throw new Error("AUTH_REQUIRED");
    }
    throw error;
  }
};