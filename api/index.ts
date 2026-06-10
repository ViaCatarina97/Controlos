import express from "express";
import { GoogleGenAI, Type } from "@google/genai";

const app = express();
app.use(express.json({ limit: "50mb" }));

// Robust numeric sanitizer to handle various numeric and currency formats (e.g. European, standard)
function sanitizeHaviValue(val: any): number {
  if (typeof val === 'number') return val;
  if (!val) return 0;
  
  let str = String(val).trim();
  
  // Remove currency markers
  str = str.replace(/EUR|€/gi, '').trim();
  
  // Count occurrences of points and commas
  const dots = (str.match(/\./g) || []).length;
  const commas = (str.match(/,/g) || []).length;
  
  if (dots === 1 && commas === 0) {
    return parseFloat(str) || 0;
  }
  if (commas === 1 && dots === 0) {
    return parseFloat(str.replace(',', '.')) || 0;
  }
  
  if (commas === 1 && dots >= 1) {
    str = str.replace(/\./g, '').replace(',', '.');
  } else if (dots === 1 && commas >= 1) {
    str = str.replace(/,/g, '');
  } else {
    const lastCommaIdx = str.lastIndexOf(',');
    const lastDotIdx = str.lastIndexOf('.');
    if (lastCommaIdx > lastDotIdx) {
      str = str.replace(/\./g, '').replace(',', '.');
    } else if (lastDotIdx > lastCommaIdx) {
      str = str.replace(/,/g, '');
    }
  }
  
  const clean = str.replace(/[^\d.-]/g, '');
  return parseFloat(clean) || 0;
}

function cleanGroupName(name: string): string {
  if (!name) return "";
  return name.replace(/^[\d\s.\-_/\\]+/, '').trim();
}

/**
 * Handles calling Gemini with exponential backoff retry on transient/capacity errors,
 * and falls back across robust model alternatives: gemini-3.5-flash, gemini-flash-latest, and gemini-3.1-flash-lite.
 */
async function generateContentWithFallbackAndRetry(ai: any, params: any) {
  const modelsToTry = [params.model, 'gemini-flash-latest', 'gemini-3.1-flash-lite'].filter(Boolean);
  let lastError: any = null;

  for (const modelName of modelsToTry) {
    let attempt = 0;
    const maxAttempts = 3;
    const initialDelay = 1500;

    console.log(`[Vercel Serverless Gemini] Trying model: ${modelName}`);
    while (attempt < maxAttempts) {
      try {
        attempt++;
        const response = await ai.models.generateContent({
          ...params,
          model: modelName
        });
        return response; // Success!
       } catch (err: any) {
        lastError = err;
        const errMsg = err?.message || String(err);
        console.warn(`[Vercel Serverless Gemini] Attempt ${attempt} with model ${modelName} failed. Error:`, errMsg);

        const isRetryable = 
          errMsg.includes("503") || 
          errMsg.includes("demand") || 
          errMsg.includes("UNAVAILABLE") || 
          errMsg.includes("rate limit") || 
          errMsg.includes("RESOURCE_EXHAUSTED") ||
          errMsg.includes("overloaded");

        if (isRetryable && attempt < maxAttempts) {
          const delay = initialDelay * Math.pow(2, attempt - 1);
          console.log(`[Vercel Serverless Gemini] Retrying model ${modelName} in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        } else {
          break;
        }
      }
    }
  }

  throw lastError;
}

// API route for extracting invoice PDF details using Gemini
app.post(["/api/process-invoice", "/process-invoice"], async (req, res) => {
  try {
    const { fileBase64, mimeType } = req.body;
    if (!fileBase64) {
      console.error("[Invoice API] Error: Missing file base64 data");
      return res.status(400).json({ error: "Missing file base64 data" });
    }

    console.log(`[Invoice API] Processing invoice PDF. base64 size: ${fileBase64.length} bytes, mimeType: ${mimeType}`);

    const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
    if (!apiKey) {
      console.error("[Invoice API] Error: API Key not configured");
      return res.status(401).json({ error: "AUTH_REQUIRED" });
    }

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });

    const prompt = `
      Você é um assistente especializado em faturas HAVI Logistics Portugal.
      Analise todo o documento PDF e localize a tabela de título "TOTAL POR GRUPO PRODUTO" ou a tabela de resumo de grupos que se encontra nas últimas páginas do documento (normalmente na penúltima ou última página).
      Esta tabela possui colunas como: "GRUPO PRODUTO", "VALOR LIQ.", "PTO VERDE", "Cont. Embal. Plástico", "VALOR TOTAL".

      REGRAS DE EXTRAÇÃO DE GRUPOS:
      1. Varra a tabela de grupos de produtos linha a linha e extraia todos os grupos listados. Exemplos de itens a extrair:
         - "1 CONGELADOS"
         - "14 FERRAMENTAS & UTENSÍLIOS" (ou "FERRAMENTAS & UTENSILIOS")
         - "17 FARDAS"
         - "19 BULK ALIMENTAR"
         - "2 REFRIGERADOS"
         - "20 BULK PAPEL"
         - "3 SECOS COMIDA"
         - "4 SECOS PAPEL"
         - "5 MANUTENÇÃO & LIMPEZA"
         - "8 PRODUTOS FRESCOS"
         - "9 MANUTENÇÃO & LIMPEZA COMPRAS"
         - Qualquer outra linha descritiva correspondente a grupos de produtos (ex. Secos, Condimentos, etc.).
      2. Para cada um destes grupos descritos acima:
         - Extraia o nome exato ou limpo do grupo em "nome" (pode manter ou remover o índice, ex: "1 CONGELADOS" ou "CONGELADOS"). 
         - Extraia o valor associado sob a coluna "VALOR TOTAL" (última coluna da tabela) em "valor_total_str". Por exemplo, se a linha for "1 CONGELADOS 6.489,07 EUR 10,54 EUR 0,05 EUR 6.499,66 EUR", o valor total é "6.499,66 EUR" ou "6.499,66".

      REGRAS DE EXTRAÇÃO DE TOTAIS (Rodapé da Tabela):
      3. No final da mesma tabela ou na linha que indica o resumo de rodapé "TOTAL":
         - Extraia o valor acumulado correspondente ao "PTO VERDE" (Ponto Verde) e armazene em "ponto_verde_str" (exemplo: "42,25" ou "42,25 EUR" na linha do TOTAL).
         - Extraia o valor acumulado correspondente ao "VALOR TOTAL" e armazene em "total_geral_str" (exemplo: "10.229,64" ou "10.229,64 EUR" na linha do TOTAL).

      REGRAS DE EXTRAÇÃO DE METADADOS DA FATURA:
      4. No início do documento (geralmente primeira página), encontre:
         - O número da fatura ou do documento (normalmente identificado sob "DOCUMENTO", "Fatura Nº" ou "Nº DOCUMENTO:") e preencha "documento". Ex: "ZF2 BW1X/7131331125".
         - A data de emissão do documento (normalmente designada por "DATA DOCUMENTO:" ou "Data da Fatura", no formato DD/MM/AAAA) e preencha "data". Ex: "14/05/2026".

      Por favor, retorne estritamente o formato JSON solicitado nas respostas, sem marcadores adicionais.
      Retorne valores numéricos como string contendo o número formatado tal como se encontra na fatura.
    `;

    console.log("[Invoice API] Sending request to Gemini (with fallback and retry)...");
    const response = await generateContentWithFallbackAndRetry(ai, {
      model: 'gemini-3.5-flash',
      contents: [
        {
          inlineData: {
            mimeType: mimeType || 'application/pdf',
            data: fileBase64,
          },
        },
        prompt
      ],
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
          required: ["documento", "data", "grupos", "ponto_verde_str", "total_geral_str"]
        }
      }
    });

    const textOutput = response.text;
    if (!textOutput) {
      throw new Error("No text output was returned by the Gemini API.");
    }

    const parsed = JSON.parse(textOutput.trim());
    const pvTotal = sanitizeHaviValue(parsed.ponto_verde_str);
    const totalFatura = sanitizeHaviValue(parsed.total_geral_str);
    const mappedGroups = (parsed.grupos || []).map((g: any) => ({
      nome: cleanGroupName(g.nome),
      valor_total: sanitizeHaviValue(g.valor_total_str)
    }));

    res.json({
      documento: parsed.documento,
      data: parsed.data,
      ponto_verde_total: pvTotal,
      total_geral_fatura: totalFatura,
      grupos: mappedGroups
    });

  } catch (error: any) {
    console.error("[Invoice API] Server Invoice Processing Error:", error);
    res.status(500).json({ error: error.message || "Failed to process PDF" });
  }
});

// API route for extracting delivery PDF totals for MyStore
app.post(["/api/process-delivery", "/process-delivery"], async (req, res) => {
  try {
    const { fileBase64, mimeType } = req.body;
    if (!fileBase64) {
      console.error("[Delivery API] Error: Missing file base64 data");
      return res.status(400).json({ error: "Missing file base64 data" });
    }

    console.log(`[Delivery API] Processing delivery PDF. base64 size: ${fileBase64.length} bytes, mimeType: ${mimeType}`);

    const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
    if (!apiKey) {
      console.error("[Delivery API] Error: API Key not configured");
      return res.status(401).json({ error: "AUTH_REQUIRED" });
    }

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });

    const prompt = `
      Você é um assistente especializado em conferência de documentos de entrega McDonald's Portugal ("Entrega" ou "Entrega Não Planificada").
      Analise todo o documento PDF e localize a tabela de totais por categoria de custos ou as linhas de totais por área/grupo de mercadorias, normalmente localizadas no final do documento (muitas vezes na página 4 ou rodapé, após a linha "VALOR TOTAL" ou na tabela de distribuição).
      As categorias comumente encontradas são: "COMIDA", "PAPEL", "OPS" (ou "OPERACIONAIS"), "OUTROS" ou "HAPPY MEAL", "MATERIAL ADM".

      Você deve mapear esses valores para as seguintes categorias padrão de custos/tabela MyStore:
      - 'Comida' (representa COMIDA ou alimentos)
      - 'Papel' (representa PAPEL ou embalagens)
      - 'F. Operacionais' (representa OPS, fungíveis operacionais ou despesas de funcionamento)
      - 'Material Adm' (representa MATERIAL ADM ou administrativo)
      - 'Happy Meal' (representa HAPPY MEAL)
      - 'Outros' (representa OUTROS ou de preferência qualquer outra categoria que não caiba nas anteriores)

      Para cada categoria padrão encontrada ou mapeada na folha de entrega, forneça o valor total decimal associado (ex: "8765,83" ou "8.765,83").
      Extraia também o tipo de documento (ex: "Entrega" ou "Entrega Não Planificada") sob a chave "documentName" e a data de fecho ou entrega (ex: "14/05/2026") sob "date" (se encontrar no cabeçalho como "Data da Entrega:" ou similar).
      
      Por favor, retorne estritamente o formato JSON solicitado nas respostas, sem marcadores adicionais.
    `;

    console.log("[Delivery API] Sending request to Gemini (with fallback and retry)...");
    const response = await generateContentWithFallbackAndRetry(ai, {
      model: 'gemini-3.5-flash',
      contents: [
        {
          inlineData: {
            mimeType: mimeType || 'application/pdf',
            data: fileBase64,
          },
        },
        prompt
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            documentName: { type: Type.STRING },
            date: { type: Type.STRING },
            categories: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  categoryName: { type: Type.STRING },
                  totalVal: { type: Type.STRING }
                },
                required: ["categoryName", "totalVal"]
              }
            }
          },
          required: ["documentName", "date", "categories"]
        }
      }
    });

    const textOutput = response.text;
    if (!textOutput) {
      throw new Error("No text output was returned by the Gemini API.");
    }

    const parsed = JSON.parse(textOutput.trim());
    const mappedCategories = (parsed.categories || []).map((c: any) => ({
      categoryName: c.categoryName,
      totalVal: sanitizeHaviValue(c.totalVal)
    }));

    res.json({
      documento: parsed.documentName || "Entrega",
      data: parsed.date || "",
      valores: mappedCategories
    });

  } catch (error: any) {
    console.error("[Delivery API] Server Delivery Processing Error:", error);
    res.status(500).json({ error: error.message || "Failed to process PDF" });
  }
});

// API route for extracting credit note details using Gemini
app.post(["/api/process-credit-note", "/process-credit-note"], async (req, res) => {
  try {
    const { fileBase64, mimeType } = req.body;
    if (!fileBase64) {
      console.error("[Credit Note API] Error: Missing file base64 data");
      return res.status(400).json({ error: "Missing file base64 data" });
    }

    console.log(`[Credit Note API] Processing. base64 size: ${fileBase64.length} bytes, mimeType: ${mimeType}`);

    const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
    if (!apiKey) {
      console.error("[Credit Note API] Error: API Key not configured");
      return res.status(401).json({ error: "AUTH_REQUIRED" });
    }

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });

    const prompt = `
      Você é um assistente especializado em faturas e notas de crédito da HAVI Logistics Portugal para os restaurantes McDonald's Portugal.
      Analise a nota de crédito em anexo e extraia as seguintes informações:
      
      1. "No DOCUMENTO" / "Nº DOCUMENTO": geralmente no cabeçalho ou tabelas, ex: "ZG2 BW8X/7138467625".
      2. "DATA DOCUMENTO": a data do documento ex: "22/05/2026". Retorne no formato AAAA-MM-DD (ISO).
      3. "TOTAL POR GRUPO PRODUTO" ou "TOTAL POR IVA" ou seção semelhante:
         - Procure o nome do grupo do produto ex: "4 SECOS PAPEL" ou "CONGELADOS". Mapeie ou limpe o nome do grupo do produto.
         - Valor total correspondente a este grupo ou o valor total líquido, ex: "44,55" ou "44,55 EUR".
      4. Artigo/Produto listado na descrição: ex: "CX CHK BM" ou "MOL BIG MAC".
      5. Quantidade: ex: "1,000 BX1" -> extraia o valor "1" ou "1.0".

      Por favor, retorne os dados no formato JSON solicitado.
    `;

    console.log("[Credit Note API] Sending request to Gemini...");
    const response = await generateContentWithFallbackAndRetry(ai, {
      model: 'gemini-3.5-flash',
      contents: [
        {
          inlineData: {
            mimeType: mimeType || 'application/pdf',
            data: fileBase64,
          },
        },
        prompt
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            documentNumber: { type: Type.STRING },
            date: { type: Type.STRING },
            productGroup: { type: Type.STRING },
            totalValue: { type: Type.STRING },
            productName: { type: Type.STRING },
            quantity: { type: Type.STRING }
          },
          required: ["documentNumber", "date", "productGroup", "totalValue", "productName", "quantity"]
        }
      }
    });

    const textOutput = response.text;
    if (!textOutput) {
      throw new Error("No text output was returned by the Gemini API.");
    }

    const parsed = JSON.parse(textOutput.trim());
    
    res.json({
      documentNumber: parsed.documentNumber || "",
      date: parsed.date || "",
      productGroup: parsed.productGroup || "",
      totalValue: sanitizeHaviValue(parsed.totalValue),
      productName: parsed.productName || "",
      quantity: sanitizeHaviValue(parsed.quantity)
    });

  } catch (error: any) {
    console.error("[Credit Note API] Error detailed:", error);
    res.status(500).json({ error: error.message || "Failed to process Credit Note PDF" });
  }
});

// For Vercel Serverless environment:
export default app;
