import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";

// Robust numeric sanitizer to handle various numeric and currency formats (eg. European, standard)
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

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "50mb" }));

  // API route for extracting invoice PDF details using Gemini
  app.post("/api/process-invoice", async (req, res) => {
    try {
      const { fileBase64, mimeType } = req.body;
      if (!fileBase64) {
        return res.status(400).json({ error: "Missing file base64 data" });
      }

      const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
      if (!apiKey) {
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
            required: ["documento", "data", "grupos"]
          }
        }
      });

      const textOutput = response.text;
      if (!textOutput) {
        throw new Error("Empty response from Gemini.");
      }

      const parsed = JSON.parse(textOutput.trim());

      res.json({
        documento: parsed.documento,
        data: parsed.data,
        ponto_verde_total: sanitizeHaviValue(parsed.ponto_verde_str),
        total_geral_fatura: sanitizeHaviValue(parsed.total_geral_str),
        grupos: (parsed.grupos || []).map((g: any) => ({
          nome: cleanGroupName(g.nome),
          valor_total: sanitizeHaviValue(g.valor_total_str)
        }))
      });

    } catch (error: any) {
      console.error("Server Invoice Processing Error:", error);
      res.status(500).json({ error: error.message || "Failed to process PDF" });
    }
  });

  // Serve static UI assets or bind Vite dev middleware
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*all', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server starting on port ${PORT}`);
  });
}

startServer();
