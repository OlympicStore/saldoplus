// Edge function: Extract mortgage data from a PDF/image (escritura) using Lovable AI (Gemini 2.5 Pro multimodal).
// Receives base64-encoded file + mime, returns structured JSON via tool calling.
// Files are NOT stored anywhere — they live only in memory for the duration of the request.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const ALLOWED_MIME = ["application/pdf", "image/jpeg", "image/jpg", "image/png", "image/webp"];
const MAX_BYTES = 10 * 1024 * 1024; // 10 MB

interface ExtractRequest {
  fileBase64: string;
  mimeType: string;
}

const SYSTEM_PROMPT = `És um assistente especializado em ler escrituras de crédito habitação portuguesas e contratos de mútuo bancário.
A tua tarefa é extrair os dados financeiros principais do documento fornecido (PDF ou imagem) e devolvê-los de forma estruturada.

Regras:
- Lê todo o documento com atenção, incluindo notas de rodapé e anexos.
- Devolve valores numéricos em euros sem símbolo (ex: 150000.00, não "150.000 €").
- Taxas em percentagem como número decimal (ex: 3.5 para 3,5%).
- Identifica o tipo de taxa: "fixed" (fixa), "variable" (variável/indexada), "mixed" (mista — período fixo seguido de variável).
- Se um campo não for claro ou não estiver presente, devolve null para esse campo.
- Para taxa variável: separa indexante (ex: Euribor 6M = 3.5) e spread (ex: 1.2).
- Para taxa mista: identifica o período inicial fixo em anos, a taxa fixa inicial, e depois indexante + spread da fase variável.
- Identifica o prazo da Euribor usado (3, 6 ou 12 meses) e devolve "3m", "6m" ou "12m".
- Identifica o valor total da casa (preço de aquisição do imóvel) e o valor da entrada (down payment / capitais próprios) se mencionados.
- Confiança: devolve um nível de confiança global de 0 a 1 (1 = totalmente confiante).`;

const TOOL_DEFINITION = {
  type: "function",
  function: {
    name: "extract_mortgage_data",
    description: "Extrai dados de uma escritura de crédito habitação",
    parameters: {
      type: "object",
      properties: {
        house_value: { type: ["number", "null"], description: "Valor total da casa / preço de aquisição em euros" },
        down_payment: { type: ["number", "null"], description: "Valor da entrada / capitais próprios em euros" },
        loan_amount: { type: ["number", "null"], description: "Valor total do empréstimo em euros" },
        rate_type: {
          type: ["string", "null"],
          enum: ["fixed", "variable", "mixed", null],
          description: "Tipo de taxa: fixed/variable/mixed",
        },
        annual_rate: { type: ["number", "null"], description: "Taxa fixa anual em % (apenas se rate_type=fixed)" },
        indexante: {
          type: ["number", "null"],
          description: "Valor do indexante em % (Euribor) — apenas variável/mista",
        },
        indexante_label: {
          type: ["string", "null"],
          description: "Nome do indexante (ex: 'Euribor 6 meses')",
        },
        euribor_term: {
          type: ["string", "null"],
          enum: ["3m", "6m", "12m", null],
          description: "Prazo da Euribor: '3m', '6m' ou '12m' — apenas variável/mista",
        },
        spread: { type: ["number", "null"], description: "Spread em % — apenas variável/mista" },
        fixed_period_years: {
          type: ["number", "null"],
          description: "Anos da fase fixa — apenas taxa mista",
        },
        fixed_rate_initial: {
          type: ["number", "null"],
          description: "Taxa fixa inicial em % — apenas taxa mista",
        },
        term_years: { type: ["number", "null"], description: "Prazo total do crédito em anos" },
        monthly_payment: { type: ["number", "null"], description: "Prestação mensal em euros, se mencionada" },
        insurance_notes: {
          type: ["string", "null"],
          description: "Resumo curto sobre seguros associados, se mencionado",
        },
        confidence: {
          type: "number",
          minimum: 0,
          maximum: 1,
          description: "Confiança global na extração (0 a 1)",
        },
        notes: {
          type: ["string", "null"],
          description: "Observações relevantes ou avisos sobre a extração",
        },
      },
      required: ["confidence"],
      additionalProperties: false,
    },
  },
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "LOVABLE_API_KEY não configurada" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = (await req.json()) as ExtractRequest;
    const { fileBase64, mimeType } = body || ({} as ExtractRequest);

    if (!fileBase64 || typeof fileBase64 !== "string") {
      return new Response(JSON.stringify({ error: "fileBase64 em falta" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!mimeType || !ALLOWED_MIME.includes(mimeType)) {
      return new Response(
        JSON.stringify({ error: `Formato não suportado. Aceita: ${ALLOWED_MIME.join(", ")}` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Approx size check (base64 is ~4/3 of original)
    const approxBytes = Math.floor((fileBase64.length * 3) / 4);
    if (approxBytes > MAX_BYTES) {
      return new Response(JSON.stringify({ error: "Ficheiro demasiado grande (máx 10 MB)" }), {
        status: 413,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const dataUrl = `data:${mimeType};base64,${fileBase64}`;

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Extrai os dados da escritura/contrato em anexo usando a função extract_mortgage_data.",
              },
              { type: "image_url", image_url: { url: dataUrl } },
            ],
          },
        ],
        tools: [TOOL_DEFINITION],
        tool_choice: { type: "function", function: { name: "extract_mortgage_data" } },
      }),
    });

    if (!aiResp.ok) {
      const errText = await aiResp.text();
      console.error("AI gateway error", aiResp.status, errText);
      if (aiResp.status === 429) {
        return new Response(
          JSON.stringify({ error: "Limite de pedidos atingido. Tente daqui a uns segundos." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      if (aiResp.status === 402) {
        return new Response(
          JSON.stringify({ error: "Créditos de IA esgotados. Adicione créditos em Settings > Workspace > Usage." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      return new Response(JSON.stringify({ error: "Falha ao processar documento", details: errText }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await aiResp.json();
    const toolCall = aiData?.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall?.function?.arguments) {
      console.error("No tool call in response", JSON.stringify(aiData));
      return new Response(
        JSON.stringify({ error: "Não foi possível extrair dados estruturados do documento." }),
        { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    let extracted: Record<string, unknown>;
    try {
      extracted = JSON.parse(toolCall.function.arguments);
    } catch (e) {
      console.error("Failed to parse tool args", e, toolCall.function.arguments);
      return new Response(JSON.stringify({ error: "Resposta da IA mal formada" }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ data: extracted }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("extract-mortgage-doc error", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
