
import { GoogleGenAI, Type } from "@google/genai";

// Função para converter File para Base64 com tratamento de erro
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
    reader.onerror = () => reject(new Error("Erro ao ler o ficheiro. O ficheiro pode estar corrompido."));
  });
};

export const processInvoicePdf = async (file: File): Promise<any> => {
  // Inicialização obrigatória conforme as diretrizes
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  try {
    const base64Data = await fileToBase64(file);

    const prompt = `
      Aja como um especialista em análise de dados logísticos. Analise este documento da HAVI Logistics e foque-se na tabela intitulada 'TOTAL POR GRUPO PRODUTO'.

      Extraia os dados e apresente-os exclusivamente em formato JSON, seguindo estas regras:
      1. Identifique o 'Nº DOCUMENTO' e a 'DATA DOCUMENTO'.
      2. Para cada linha da tabela 'TOTAL POR GRUPO PRODUTO', extraia o nome do grupo e o respetivo 'VALOR TOTAL' (a última coluna).
      3. Extraia também o 'PTO VERDE' da linha 'TOTAL' dessa tabela se disponível.
      4. Converta todos os valores monetários para formato numérico (ex: 9.412,00 deve tornar-se 9412.00).

      Estrutura JSON esperada:
      {
        "documento": "string",
        "data": "string",
        "grupos": [
          { "nome": "string", "total": number },
          ...
        ],
        "pto_verde": number,
        "valor_final_fatura": number
      }
    `;

    // Utiliza generateContent diretamente conforme as novas diretrizes
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

    // Acessa .text como propriedade conforme diretriz
    const textOutput = response.text;
    if (!textOutput) throw new Error("A API não retornou texto.");
    
    return JSON.parse(textOutput.trim());

  } catch (error: any) {
    console.error("Gemini Invoice Error:", error);
    // Verifica se é erro de falta de API Key ou entidade não encontrada para resetar
    if (error.message?.includes("Requested entity was not found") || error.message?.includes("API Key")) {
        throw new Error("AUTH_REQUIRED");
    }
    throw new Error("Erro na extração de dados da fatura. Por favor, tente novamente.");
  }
};
