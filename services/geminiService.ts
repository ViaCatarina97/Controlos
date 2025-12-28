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
      Aja como um assistente de faturação. Analise o documento PDF anexado.
      
      FOCO PRINCIPAL: Tabela "TOTAL POR GRUPO PRODUTO" (geralmente nas páginas finais).
      
      INSTRUÇÕES DE EXTRAÇÃO:
      1. Localize a tabela intitulada "TOTAL POR GRUPO PRODUTO".
      2. Para cada linha (ex: CONGELADOS, SECOS COMIDA, etc.), extraia o NOME do grupo e o "VALOR TOTAL" (é a ÚLTIMA coluna da direita).
      3. Na linha final de "TOTAL", extraia o valor da coluna "PTO VERDE" (Ponto Verde).
      4. Extraia o "Nº DOCUMENTO" e a "DATA DOCUMENTO" encontrados no cabeçalho da fatura.

      REGRAS DE VALORES:
      - Use apenas números. Remova símbolos de moeda (EUR, €).
      - Certifique-se de que os decimais estão corretos.

      Retorne estritamente um objeto JSON com esta estrutura:
      {
        "documento": "string",
        "data": "string (DD/MM/YYYY)",
        "grupos": [{"nome": "string", "valor_total": number}],
        "ponto_verde_total": number,
        "total_geral_fatura": number
      }
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
    if (!textOutput) throw new Error("A API não retornou conteúdo legível.");
    
    return JSON.parse(textOutput.trim());

  } catch (error: any) {
    const errorMessage = error.message || "";
    console.error("Gemini Extraction Error:", errorMessage);

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