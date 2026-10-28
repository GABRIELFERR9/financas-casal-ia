'use strict';

/**
 * ============================================================================
 * MOTOR DE IA DE ALTA PRECISÃO — FINANÇAS DO CASAL (GABRIEL & ANA)
 * Visão Computacional + Conclusão com NVIDIA Nemotron 3 Ultra 550B
 * ============================================================================
 */

const https = require('https');

const getNvidiaKey = () => process.env.NVIDIA_API_KEY || '';
const getGeminiKey = () => process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '';

const CATEGORIAS_VALIDAS = [
  'Supermercado',
  'Alimentação',
  'Transporte',
  'Moradia',
  'Saúde',
  'Lazer',
  'Compras',
  'Contas/Serviços',
  'Educação',
  'Outros'
];

const METODOS_VALIDOS = ['Pix', 'Cartão de Crédito', 'Débito', 'Dinheiro', 'Boleto'];

const MESES_PT = {
  'jan': '01', 'janeiro': '01',
  'fev': '02', 'fevereiro': '02',
  'mar': '03', 'março': '03', 'marco': '03',
  'abr': '04', 'abril': '04',
  'mai': '05', 'maio': '05',
  'jun': '06', 'junho': '06',
  'jul': '07', 'julho': '07',
  'ago': '08', 'agosto': '08',
  'set': '09', 'setembro': '09',
  'out': '10', 'outubro': '10',
  'nov': '11', 'novembro': '11',
  'dez': '12', 'dezembro': '12'
};

/**
 * CONTEXTO ESPECIALIZADO DE FINANÇAS DO CASAL (BRASIL)
 * O ano de vigência é estritamente 2026.
 */
const CONTEXTO_FINANCAS_CASAL = `Você é o auditor e consultor financeiro mestre de inteligência artificial do casal brasileiro GABRIEL e ANA.
Você é o ÚLTIMO MODELO que conclui o processamento na esteira, sendo a inteligência suprema encarregada de auditar a leitura ótica, raciocinar criticamente e bater o martelo final sobre cada despesa.

O ANO ATUAL VIGENTE É ESTRITAMENTE 2026.

SEU CONTEXTO FINANCEIRO E REGRAS DE CONVERSÃO:

1. DATA DO GASTO (CRÍTICO - ANO VIGENTE 2026):
   - O ano corrente é 2026.
   - Em comprovantes Pix brasileiros, datas frequentemente aparecem sem ano (exemplo: "sexta-feira, 2 de out. 09:38" ou "2 de out" ou "02/10").
   - REGRA DE OURO: Sempre atribua ao ano 2026! Exemplo: "2 de out" -> "2026-10-02". Nunca alucine anos passados como 2020 ou 2022.
   - No ID da transação Pix (código oficial Bacen iniciando com E...), a data da transação está gravada nos dígitos seguintes ao ISPB (formato AAAAMMDD, exemplo: E4339441920261002... = 2026-10-02).
   - O formato de saída da data deve ser SEMPRE no padrão internacional estrito "AAAA-MM-DD".

2. IDENTIFICAÇÃO DO PAGADOR / REMETENTE (Gabriel vs Ana):
   - Remetente / Pagador ("De:", "Remetente", "Pagador", "Origem"):
     * Se constar "GABRIEL FERREIRA RIBEIRO" ou "Gabriel" -> "Gabriel".
     * Se constar "ANA" (ou "Heloisa", "Hellô") -> "Ana".
   - Se for anônimo ou cupom fiscal físico onde não há nome -> "Indefinido".

3. ESTABELECIMENTO / BENEFICIÁRIO:
   - Limpe nomenclaturas empresariais burocráticas e razões sociais feias (exemplo: "NEOENERGIA DISTRIBUICAO BRASILIA S A" -> "Neoenergia Brasília", "WMB SUPERMERCADOS" -> "Carrefour / Big", "DROGARIA ARAUJO S/A" -> "Drogaria Araújo").
   - Em Pix: o estabelecimento é a PESSOA OU EMPRESA RECEBEDORA (Destinatário / Favorecido / "Para:").

4. VALOR REAL PAGO:
   - Valor líquido final em Reais desembolsado pelo casal (número decimal positivo, exemplo: 173.54).

5. CATEGORIZAÇÃO ORÇAMENTÁRIA (Escolha 1 entre as 10 categorias oficiais):
   - "Supermercado": Supermercados, atacadistas, feiras, açougues.
   - "Alimentação": Restaurantes, delivery (iFood/Rappi), bares, lanchonetes, padarias.
   - "Transporte": Combustível/gasolina, Uber/99, estacionamento, pedágio, manutenção de veículo.
   - "Moradia": Conta de luz (Neoenergia, Enel, Cemig, Copel), água (Sabesp, Caesb), aluguel, condomínio, internet residencial, gás.
   - "Saúde": Farmácias, medicamentos, consultas médicas, exames laboratoriais, dentista.
   - "Lazer": Cinema, passeios, viagens, shows, assinaturas de entretenimento (Netflix, Spotify, jogos).
   - "Compras": Roupas, calçados, eletrônicos, cosméticos, presentes, utilidades.
   - "Contas/Serviços": Tarifas bancárias, contabilidade, cartório, serviços gerais.
   - "Educação": Cursos, faculdade, livros, material técnico.
   - "Outros": Despesas atípicas.

6. FORMA DE PAGAMENTO:
   - "Pix", "Cartão de Crédito", "Débito", "Dinheiro" ou "Boleto".`;

/**
 * Extração resiliente de JSON
 */
function extrairJsonSeguro(str) {
  if (!str) return null;
  const limpo = str.replace(/```json/gi, '').replace(/```/g, '').trim();

  try {
    return JSON.parse(limpo);
  } catch (_) {}

  let open = 0, start = -1;
  for (let i = 0; i < str.length; i++) {
    if (str[i] === '{') {
      if (open === 0) start = i;
      open++;
    } else if (str[i] === '}') {
      open--;
      if (open === 0 && start !== -1) {
        try {
          return JSON.parse(str.slice(start, i + 1));
        } catch (_) {}
      }
    }
  }

  const match = str.match(/\{[\s\S]*\}/);
  if (match) {
    try {
      return JSON.parse(match[0]);
    } catch (_) {}
  }

  return null;
}

/**
 * Parser inteligente de datas brasileiras com âncora no ano 2026
 */
function extrairDataInteligente(dataRaw, textoCompleto = '') {
  const ANO_CORRENTE = 2026;
  const texto = `${dataRaw || ''} ${textoCompleto || ''}`;

  // 1. Padrão oficial Bacen ID de Pix (E + 8 dígitos ISPB + AAAAMMDD)
  const pixMatch = texto.match(/E\d{8}(202[4-9])(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])/i);
  if (pixMatch) {
    const [, y, m, d] = pixMatch;
    return `${y}-${m}-${d}`;
  }

  // 2. Data em texto por extenso: "2 de out", "02 de outubro de 2026", "2 de out. 09:38"
  const matchExtenso = texto.match(/(\d{1,2})\s+de\s+([a-zA-Zç]+)(?:\s+de\s+(\d{4}))?/i);
  if (matchExtenso) {
    const dia = String(matchExtenso[1]).padStart(2, '0');
    const mesNome = matchExtenso[2].toLowerCase().replace('.', '');
    const mesNum = MESES_PT[mesNome];
    let ano = matchExtenso[3] ? Number(matchExtenso[3]) : ANO_CORRENTE;
    if (ano < 2025 || ano > 2027) ano = ANO_CORRENTE;

    if (mesNum) {
      return `${ano}-${mesNum}-${dia}`;
    }
  }

  // 3. Formato DD/MM/AAAA ou DD/MM/AA ou DD-MM-AAAA
  const matchBR = (dataRaw || '').match(/(\d{1,2})[\/\.-](\d{1,2})[\/\.-](\d{2,4})/);
  if (matchBR) {
    let d = String(matchBR[1]).padStart(2, '0');
    let m = String(matchBR[2]).padStart(2, '0');
    let y = matchBR[3].length === 2 ? `20${matchBR[3]}` : matchBR[3];
    if (Number(y) < 2025 || Number(y) > 2027) y = ANO_CORRENTE;
    return `${y}-${m}-${d}`;
  }

  // 4. Data em formato AAAA-MM-DD
  if (dataRaw && /^\d{4}-\d{2}-\d{2}$/.test(dataRaw)) {
    let [y, m, d] = dataRaw.split('-').map(Number);
    if (y < 2025 || y > 2027) y = ANO_CORRENTE;
    return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  }

  // 5. Fallback para hoje no fuso horário de Brasília (GMT-3)
  const agoraSP = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
  const y = agoraSP.getFullYear();
  const m = String(agoraSP.getMonth() + 1).padStart(2, '0');
  const d = String(agoraSP.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Dedução do pagador com base no remetente
 */
function extrairResponsavelInteligente(respRaw, textoCompleto = '') {
  const t = `${respRaw || ''} ${textoCompleto || ''}`.toLowerCase();

  const remetenteMatchG = /de:\s*gabriel|remetente[:\s]+[^\n]*gabriel|pagador[:\s]+[^\n]*gabriel/i.test(t);
  const remetenteMatchH = /de:\s*ana|de:\s*heloisa|remetente[:\s]+[^\n]*ana|pagador[:\s]+[^\n]*ana/i.test(t);

  if (remetenteMatchG && !remetenteMatchH) return 'Gabriel';
  if (remetenteMatchH && !remetenteMatchG) return 'Ana';

  if (t.includes('gabriel ferreira ribeiro') || t.includes('gabriel')) {
    if (!t.includes('ana') && !t.includes('heloisa')) return 'Gabriel';
  }
  if (t.includes('ana') || t.includes('heloisa')) {
    if (!t.includes('gabriel')) return 'Ana';
  }

  return respRaw === 'Ana' ? 'Ana' : (respRaw === 'Gabriel' ? 'Gabriel' : null);
}

/**
 * ETAPA 1: Leitura visual de alta fidelidade via NVIDIA Vision
 */
async function extrairVisualmenteComNvidia(base64Data, mimeType = 'image/jpeg', model = 'meta/llama-3.2-11b-vision-instruct') {
  const apiKey = getNvidiaKey();
  if (!apiKey) throw new Error('NVIDIA_API_KEY ausente.');

  const dataUri = `data:${mimeType};base64,${base64Data}`;
  const payload = JSON.stringify({
    model: model,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: 'Transcreva com precisão absoluta todo o texto deste comprovante brasileiro. Em especial, detalhe:\n- Valor pago (R$)\n- Data e horário literais da transação (ex: "2 de out. 09:38" ou "02/10/2026")\n- Destinatário / Favorecido (Para quem foi pago)\n- Remetente / Pagador (Quem pagou, campo "De:")\n- ID da Transação / Código de Autenticação Pix'
          },
          { type: 'image_url', image_url: { url: dataUri } }
        ]
      }
    ],
    temperature: 0.1,
    max_tokens: 1000
  });

  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error(`Timeout de 45s na leitura visual (${model}).`));
    }, 45000);

    const req = https.request({
      hostname: 'integrate.api.nvidia.com',
      path: '/v1/chat/completions',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'Content-Length': Buffer.byteLength(payload)
      }
    }, (res) => {
      let body = '';
      res.on('data', chunk => { body += chunk; });
      res.on('end', () => {
        clearTimeout(timeout);
        try {
          const resp = JSON.parse(body);
          if (resp.error) {
            return reject(new Error(resp.error.message || `Erro NVIDIA Vision (${model})`));
          }
          const raw = resp.choices?.[0]?.message?.content || '';
          if (!raw) return reject(new Error('Leitura visual vazia.'));
          resolve(raw);
        } catch (err) {
          reject(new Error(`Erro leitura visual: ${err.message}`));
        }
      });
    });

    req.on('error', err => {
      clearTimeout(timeout);
      reject(err);
    });

    req.write(payload);
    req.end();
  });
}

/**
 * Chamada resiliente de Chat na NVIDIA NIM com controle de timeout e headers
 */
async function chamarNvidiaChat(model, messages, options = {}) {
  const apiKey = getNvidiaKey();
  if (!apiKey) throw new Error('NVIDIA_API_KEY ausente.');

  const maxTokens = options.maxTokens || 2048;
  const temperature = options.temperature !== undefined ? options.temperature : 0.1;
  const timeoutMs = options.timeoutMs || 45000;
  const enableThinking = options.enableThinking !== undefined ? options.enableThinking : false;

  const payloadObj = {
    model,
    messages,
    temperature,
    max_tokens: maxTokens
  };

  if (!enableThinking) {
    payloadObj.chat_template_kwargs = { enable_thinking: false };
  }

  const payload = JSON.stringify(payloadObj);

  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error(`Timeout de ${Math.round(timeoutMs / 1000)}s no modelo ${model}`));
    }, timeoutMs);

    const req = https.request({
      hostname: 'integrate.api.nvidia.com',
      path: '/v1/chat/completions',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'Content-Length': Buffer.byteLength(payload)
      }
    }, (res) => {
      let body = '';
      res.on('data', chunk => { body += chunk; });
      res.on('end', () => {
        clearTimeout(timeout);
        try {
          const resp = JSON.parse(body);
          if (resp.error) {
            return reject(new Error(resp.error.message || `Erro na API NVIDIA (${model})`));
          }
          const content = resp.choices?.[0]?.message?.content || '';
          resolve(content);
        } catch (err) {
          reject(new Error(`Falha parse JSON (${model}): ${err.message}`));
        }
      });
    });

    req.on('error', err => {
      clearTimeout(timeout);
      reject(err);
    });

    req.write(payload);
    req.end();
  });
}

/**
 * ETAPA 2: NVIDIA Nemotron 3 Ultra 550B — O Árbitro e Conclusor Mestre
 */
async function concluirComNvidiaNemotron(textoBrutoDocumento) {
  const apiKey = getNvidiaKey();
  if (!apiKey) return extrairJsonSeguro(textoBrutoDocumento) || {};

  const entradaTexto = typeof textoBrutoDocumento === 'string'
    ? textoBrutoDocumento
    : JSON.stringify(textoBrutoDocumento, null, 2);

  const promptUsuario = `Analise a transcrição bruta do documento/comprovante e faça a CONCLUSÃO FINAL do gasto:
--- TRANSCRIÇÃO BRUTA DO DOCUMENTO ---
${entradaTexto}
--------------------------------------

Você é o árbitro financeiro mais inteligente da esteira. O ano vigente é 2026.
Aplique todo o contexto do casal Gabriel e Ana e conclua o lançamento com precisão absoluta.
Responda EXCLUSIVAMENTE em JSON puro, no seguinte formato estrito:
{
  "ehValido": true,
  "estabelecimento": "Nome Comercial Fantasia Limpo",
  "valor": 0.0,
  "data": "AAAA-MM-DD",
  "categoria": "Supermercado|Alimentação|Transporte|Moradia|Saúde|Lazer|Compras|Contas/Serviços|Educação|Outros",
  "metodo": "Pix|Cartão de Crédito|Débito|Dinheiro|Boleto",
  "responsavel": "Gabriel|Ana|Indefinido",
  "observacao": "Resumo útil, objetivo e humano da despesa",
  "itens": []
}`;

  const messages = [
    { role: 'system', content: CONTEXTO_FINANCAS_CASAL },
    { role: 'user', content: promptUsuario }
  ];

  // 1. Modelo Principal Solicitado: NVIDIA Nemotron 3 Ultra 550B (Timeout 45s)
  try {
    console.log('[NVIDIA Conclusor Mestre] Processando com nvidia/nemotron-3-ultra-550b-a55b...');
    const raw550 = await chamarNvidiaChat('nvidia/nemotron-3-ultra-550b-a55b', messages, {
      maxTokens: 600,
      temperature: 0.1,
      enableThinking: false,
      timeoutMs: 45000
    });
    const json = extrairJsonSeguro(raw550);
    if (json && (json.valor !== undefined || json.estabelecimento)) {
      console.log('[NVIDIA Conclusor Mestre] Conclusão com sucesso pelo Nemotron 3 Ultra 550B!');
      return json;
    }
  } catch (err550) {
    console.warn('[NVIDIA Conclusor Mestre] Alerta no 550B (' + err550.message + '). Acionando fallback Llama 3.1 Nemotron 70B...');
  }

  // 2. Fallback de alta velocidade e estabilidade: NVIDIA Llama 3.1 Nemotron 70B
  try {
    console.log('[NVIDIA Conclusor Mestre] Fallback com nvidia/llama-3.1-nemotron-70b-instruct...');
    const raw70 = await chamarNvidiaChat('nvidia/llama-3.1-nemotron-70b-instruct', messages, {
      maxTokens: 600,
      temperature: 0.1,
      enableThinking: false,
      timeoutMs: 25000
    });
    const json = extrairJsonSeguro(raw70);
    if (json && (json.valor !== undefined || json.estabelecimento)) {
      console.log('[NVIDIA Conclusor Mestre] Conclusão com sucesso pelo Llama 3.1 Nemotron 70B!');
      return json;
    }
  } catch (err70) {
    console.warn('[NVIDIA Conclusor Mestre] Alerta no 70B:', err70.message);
  }

  // 3. Fallback de emergência: NVIDIA Nemotron 3 Super 120B
  try {
    console.log('[NVIDIA Conclusor Mestre] Fallback de emergência com nvidia/nemotron-3-super-120b-a12b...');
    const raw120 = await chamarNvidiaChat('nvidia/nemotron-3-super-120b-a12b', messages, {
      maxTokens: 600,
      temperature: 0.1,
      enableThinking: false,
      timeoutMs: 30000
    });
    const json = extrairJsonSeguro(raw120);
    if (json && (json.valor !== undefined || json.estabelecimento)) {
      return json;
    }
  } catch (err120) {
    console.warn('[NVIDIA Conclusor Mestre] Alerta no 120B:', err120.message);
  }

  return extrairJsonSeguro(entradaTexto) || {};
}

/**
 * GERAÇÃO DE CONSULTORIA FINANCEIRA MENSAL
 */
async function gerarConsultoriaFinanceiraNvidia(dadosResumo, ultimosGastos = []) {
  const dadosCasal = {
    mesReferencia: dadosResumo.mes,
    anoVigente: 2026,
    totalGasto: dadosResumo.totalGeral,
    totalGabriel: dadosResumo.totalGabriel,
    totalAna: dadosResumo.totalAna ?? dadosResumo.totalEsposa ?? 0,
    pctGabriel: dadosResumo.pctGabriel,
    pctAna: dadosResumo.pctAna ?? dadosResumo.pctEsposa ?? 0,
    rendaTotal: dadosResumo.totalReceitas || 0,
    rendaGabriel: dadosResumo.receitaGabriel || 0,
    rendaAna: dadosResumo.receitaAna || 0,
    saldoRestante: dadosResumo.saldoGeral !== undefined ? dadosResumo.saldoGeral : (dadosResumo.totalReceitas ? dadosResumo.totalReceitas - dadosResumo.totalGeral : null),
    categorias: dadosResumo.porCategoria,
    metodos: dadosResumo.porMetodo,
    amostraGastos: ultimosGastos.slice(0, 20).map(g => ({
      data: g.data,
      valor: g.valor,
      estabelecimento: g.estabelecimento,
      categoria: g.categoria,
      responsavel: g.responsavel
    }))
  };

  const messages = [
    {
      role: 'system',
      content: `${CONTEXTO_FINANCAS_CASAL}\nVocê é o consultor de finanças mestre do casal Gabriel e Ana. Forneça uma análise executiva de alto nível, acolhedora, prática e direta ao ponto, sem enrolações.`
    },
    {
      role: 'user',
      content: `Aqui estão os dados consolidados do mês do casal:\n${JSON.stringify(dadosCasal, null, 2)}\n\nGere um diagnóstico executivo estruturado com os 3 tópicos a seguir:\n1. 📊 Diagnóstico do Mês (gastos vs renda/salário, quem gastou mais, categoria com maior impacto e comportamento dos gastos);\n2. ⚖️ Equilíbrio do Casal (análise da divisão entre Gabriel e Ana, proporção em relação à renda e se a divisão está saudável);\n3. 💡 Recomendação de Ouro (dica prática e acionável de economia para o próximo mês).`
    }
  ];

  // 1. Nemotron 3 Ultra 550B (Timeout 45s)
  try {
    console.log('[NVIDIA Consultoria] Gerando com Nemotron 3 Ultra 550B...');
    const analise = await chamarNvidiaChat('nvidia/nemotron-3-ultra-550b-a55b', messages, {
      maxTokens: 700,
      temperature: 0.3,
      enableThinking: false,
      timeoutMs: 45000
    });
    if (analise) return analise;
  } catch (err550) {
    console.warn('[NVIDIA Consultoria] Alerta no 550B (' + err550.message + '). Recorrendo ao Llama 3.1 Nemotron 70B...');
  }

  // 2. Fallback de alta velocidade: Llama 3.1 Nemotron 70B
  try {
    console.log('[NVIDIA Consultoria] Fallback com Llama 3.1 Nemotron 70B...');
    const analise70 = await chamarNvidiaChat('nvidia/llama-3.1-nemotron-70b-instruct', messages, {
      maxTokens: 700,
      temperature: 0.3,
      enableThinking: false,
      timeoutMs: 25000
    });
    if (analise70) return analise70;
  } catch (err70) {
    console.warn('[NVIDIA Consultoria] Falha no 70B:', err70.message);
  }

  // 3. Fallback: Nemotron 3 Super 120B
  try {
    console.log('[NVIDIA Consultoria] Fallback com Nemotron 3 Super 120B...');
    const analise120 = await chamarNvidiaChat('nvidia/nemotron-3-super-120b-a12b', messages, {
      maxTokens: 700,
      temperature: 0.3,
      enableThinking: false,
      timeoutMs: 30000
    });
    if (analise120) return analise120;
  } catch (err120) {
    console.warn('[NVIDIA Consultoria] Falha no 120B:', err120.message);
  }

  return 'Não foi possível gerar o diagnóstico da NVIDIA no momento. Tente novamente em instantes.';
}

/**
 * PIPELINE PRINCIPAL MULTIMODAL
 */
async function processarComprovanteComIA(buffer, mimeType = 'image/jpeg') {
  const b64 = Buffer.isBuffer(buffer) ? buffer.toString('base64') : buffer;

  // 1. Extração Visual
  let rascunhoVisual = null;
  try {
    rascunhoVisual = await extrairVisualmenteComNvidia(b64, mimeType, 'meta/llama-3.2-11b-vision-instruct');
  } catch (err11b) {
    console.warn('[OCR IA] Falha no 11B Vision (' + err11b.message + '), tentando 90B Vision...');
    try {
      rascunhoVisual = await extrairVisualmenteComNvidia(b64, mimeType, 'meta/llama-3.2-90b-vision-instruct');
    } catch (err90b) {
      throw new Error(`Falha na leitura visual da imagem: ${err11b.message}`);
    }
  }

  // 2. Conclusão Final pela NVIDIA (Nemotron 3 Ultra 550B - O Árbitro Mestre)
  console.log('[OCR IA] Enviando para conclusão com NVIDIA Nemotron 3 Ultra 550B...');
  const conclusaoFinal = await concluirComNvidiaNemotron(rascunhoVisual);

  // 3. Normalização e Sanitização Determinística com o texto bruto
  return normalizarResultado(conclusaoFinal, rascunhoVisual);
}

/**
 * Normaliza e sanitiza a saída da IA com regras estritas de data e pagador
 */
function normalizarResultado(raw, textoBruto = '') {
  let valor = parseFloat(String(raw.valor || '0').replace('R$', '').replace(/\s/g, '').replace(',', '.'));
  if (isNaN(valor)) valor = 0.0;

  let categoria = raw.categoria;
  if (!CATEGORIAS_VALIDAS.includes(categoria)) {
    categoria = 'Outros';
  }

  let metodo = raw.metodo;
  if (!METODOS_VALIDOS.includes(metodo)) {
    metodo = 'Pix';
  }

  // Data Inteligente ancorada no ano 2026 e Bacen Pix
  const dataFinal = extrairDataInteligente(raw.data, textoBruto);

  // Responsável inteligente (detecta Gabriel vs Ana pelo campo remetente/De)
  const responsavelFinal = extrairResponsavelInteligente(raw.responsavel, textoBruto);

  return {
    ehValido: raw.ehValido !== false && valor > 0,
    estabelecimento: String(raw.estabelecimento || 'Não identificado').trim(),
    valor: Math.round(valor * 100) / 100,
    data: dataFinal,
    categoria: categoria,
    metodo: metodo,
    responsavel: responsavelFinal,
    itens: Array.isArray(raw.itens) ? raw.itens : [],
    observacao: String(raw.observacao || '').trim()
  };
}

module.exports = {
  processarComprovanteComIA,
  concluirComNvidiaNemotron,
  gerarConsultoriaFinanceiraNvidia,
  extrairVisualmenteComNvidia,
  extrairDataInteligente,
  extrairResponsavelInteligente,
  normalizarResultado,
  CATEGORIAS_VALIDAS,
  METODOS_VALIDOS
};
