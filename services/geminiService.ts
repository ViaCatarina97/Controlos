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

// Função para limpar e converter strings de moeda (ex: "6.052,67 EUR") para Number
const sanitizeHaviValue = (val: any): number => {
  if (typeof val === 'number') return val;
  if (!val) return 0;
  // Remove tudo o que não seja dígito ou vírgula, e remove o ponto de milhar
  const clean = String(val)
    .replace(/[^\d,]/g, '') // Remove EUR, €, espaços, pontos de milhar
    .replace(',', '.');     // Troca vírgula decimal por ponto
  return parseFloat(clean) || 0;
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
      Você é um assistente especializado em faturas HAVI Logistics Portugal.
      Analise o PDF e extraia os dados da tabela "TOTAL POR GRUPO PRODUTO".

      REGRAS DE EXTRAÇÃO:
      1. Localize a tabela que contém "GRUPO PRODUTO" e "VALOR TOTAL".
      2. Para cada linha (ex: 1 CONGELADOS, 14 FERRAMENTAS & UTENSÍLIOS):
         - Extraia o NOME (texto) e o VALOR TOTAL (última coluna).
      3. Na linha "TOTAL" (no fundo da tabela):
         - Extraia o valor de "PTO VERDE".
         - Extraia o valor de "VALOR TOTAL" geral.
      4. Extraia o Nº do documento e a Data.

      Retorne os valores numéricos como strings exatamente como aparecem (ex: "6.052,67").
      Ignore os números de índice dos grupos (extraia "CONGELADOS" em vez de "1 CONGELADOS").
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
                  valor_total_str: { type: Type.STRING }
                },
                required: ["nome", "valor_total_str"]
              }
            },
            ponto_verde_str: { type: Type.STRING },
            total_geral_str: { type: Type.STRING }
          },
          required: ["documento", "data", "grupos"]
        }
      }
    });

    const textOutput = response.text;
    if (!textOutput) throw new Error("Resposta vazia da IA.");
    
    const parsed = JSON.parse(textOutput.trim());

    // Pós-processamento para garantir que os números sejam válidos
    return {
      documento: parsed.documento,
      data: parsed.data,
      ponto_verde_total: sanitizeHaviValue(parsed.ponto_verde_str),
      total_geral_fatura: sanitizeHaviValue(parsed.total_geral_str),
      grupos: parsed.grupos.map((g: any) => ({
        nome: g.nome.replace(/^\d+\s+/, '').trim(), // Remove números iniciais (ex: "1 ")
        valor_total: sanitizeHaviValue(g.valor_total_str)
      }))
    };

  } catch (error: any) {
    console.error("Gemini Extraction Error:", error);
    if (error.message?.includes("API key") || error.status === 403) {
      throw new Error("AUTH_REQUIRED");
    }
    throw error;
  }
};