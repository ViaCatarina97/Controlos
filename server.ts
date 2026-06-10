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
        console.error("[Invoice API] Error: Missing file base64 data");
        return res.status(400).json({ error: "Missing file base64 data" });
      }

      console.log(`[Invoice API] Processing invoice PDF. base64 size: ${fileBase64.length} bytes, mimeType: ${mimeType}`);

      const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
      if (!apiKey) {
        console.error("[Invoice API] Error: API Key not configured (process.env.GEMINI_API_KEY/API_KEY is empty)");
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

      console.log("[Invoice API] Sending request to Gemini with model gemini-3.5-flash...");
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
            required: ["documento", "data", "grupos", "ponto_verde_str", "total_geral_str"]
          }
        }
      });

      const textOutput = response.text;
      console.log(`[Invoice API] Received raw text output from Gemini: ${textOutput?.substring(0, 1000)}...`);

      if (!textOutput) {
        throw new Error("No text output was returned by the Gemini API.");
      }

      const parsed = JSON.parse(textOutput.trim());
      console.log("[Invoice API] Successfully parsed JSON from Gemini:", JSON.stringify(parsed, null, 2));

      const pvTotal = sanitizeHaviValue(parsed.ponto_verde_str);
      const totalFatura = sanitizeHaviValue(parsed.total_geral_str);
      const mappedGroups = (parsed.grupos || []).map((g: any) => ({
        nome: cleanGroupName(g.nome),
        valor_total: sanitizeHaviValue(g.valor_total_str)
      }));

      console.log(`[Invoice API] Sanitized Ponto Verde: ${pvTotal}, Total Geral: ${totalFatura}, Groups Extracted Count: ${mappedGroups.length}`);

      res.json({
        documento: parsed.documento,
        data: parsed.data,
        ponto_verde_total: pvTotal,
        total_geral_fatura: totalFatura,
        grupos: mappedGroups
      });

    } catch (error: any) {
      console.error("[Invoice API] Server Invoice Processing Error detailed:", error);
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
