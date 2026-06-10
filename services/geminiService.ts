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
      Analise o PDF e extraia os dados da tabela de resumo por grupo que está na última página, com o cabeçalho: "GRUPO PRODUTO", "VALOR LIQ.", "PTO VERDE", "Cont. Embal. Plástico", "VALOR TOTAL".

      REGRAS DE EXTRAÇÃO:
      1. Localize a tabela de resumo dos grupos de produtos da fatura, que possui colunas como "GRUPO PRODUTO", "VALOR LIQ.", "PTO VERDE", "Cont. Embal. Plástico", "VALOR TOTAL".
      2. Para cada linha de produto nesta tabela de resumo (por exemplo: "1 CONGELADOS", "14 FERRAMENTAS & UTENSÍLIOS", "17 FARDAS", "19 BULK ALIMENTAR", "2 REFRIGERADOS", "20 BULK PAPEL", "3 SECOS COMIDA", "4 SECOS PAPEL", "5 MANUTENÇÃO & LIMPEZA", "8 PRODUTOS FRESCOS", "9 MANUTENÇÃO & LIMPEZA COMPRAS"):
         - Extraia o NOME do grupo descritivo limpo (ex: "CONGELADOS", "REFRIGERADOS", etc.).
         - Extraia o valor correspondente sob a coluna "VALOR TOTAL" (última coluna da tabela, por exemplo, para "1 CONGELADOS" o valor total é "6.499,66").
      3. Na linha de rodapé "TOTAL" no final dessa tabela:
         - Extraia o valor de "PTO VERDE" (ex: "42,25").
         - Extraia o valor total geral da fatura "VALOR TOTAL" (ex: "10.229,64").
      4. Extraia também o Nº do documento (fatura) e a Data de emissão.

      Retorne os valores de texto limpos e os valores numéricos como strings exatamente como aparecem no PDF (ex: "6.499,66" ou "10.229,64").
      Ignore o número de índice no início dos grupos ao extrair o nome (ex: extraia "CONGELADOS" em vez de "1 CONGELADOS").
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
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