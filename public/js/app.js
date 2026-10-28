'use strict';

/**
 * ============================================================================
 * FINANÇAS DO CASAL — GABRIEL & ANA
 * Script Executivo de Gestão Financeira com IA (NVIDIA Nemotron 3 Ultra 550B)
 * ============================================================================
 */

// ── Estado Global da Aplicação ──
let perfilAtivo = localStorage.getItem('financas_perfil') || 'Gabriel';
let modoPrivacidade = localStorage.getItem('financas_privacidade') === 'true';
let dataAtual = new Date();
let mesAtivo = formatarAnoMes(dataAtual);
let categoriaFiltro = 'Todas';
let termoBusca = '';

let gastosCache = [];
let receitasCache = [];
let resumoCache = null;

// Ícones e Paleta de Cores de Categorias
const CATEGORIAS_CONFIG = {
  'Supermercado':    { icon: '🛒', color: '#10b981' },
  'Alimentação':     { icon: '🍔', color: '#f59e0b' },
  'Transporte':      { icon: '🚗', color: '#06b6d4' },
  'Moradia':         { icon: '🏠', color: '#6366f1' },
  'Saúde':           { icon: '💊', color: '#ec4899' },
  'Lazer':           { icon: '🎉', color: '#8b5cf6' },
  'Compras':         { icon: '🛍️', color: '#f43f5e' },
  'Contas/Serviços': { icon: '⚡', color: '#eab308' },
  'Educação':        { icon: '📚', color: '#14b8a6' },
  'Outros':          { icon: '📦', color: '#64748b' }
};

// ── Inicialização ──
document.addEventListener('DOMContentLoaded', () => {
  aplicarEstiloPerfil(perfilAtivo);
  aplicarModoPrivacidade();
  atualizarTituloMes();
  carregarDados();
});

// ── Perfil Ativo (Gabriel / Ana) ──
function definirPerfilAtivo(nome) {
  perfilAtivo = nome;
  localStorage.setItem('financas_perfil', nome);
  aplicarEstiloPerfil(nome);
  
  // Atualiza rádio no formulário caso esteja aberto
  const radG = document.getElementById('resp-radio-gabriel');
  const radH = document.getElementById('resp-radio-ana');
  if (radG && radH) {
    if (nome === 'Gabriel') radG.checked = true;
    else radH.checked = true;
  }
}

function aplicarEstiloPerfil(nome) {
  const btnG = document.getElementById('btn-perfil-gabriel');
  const btnH = document.getElementById('btn-perfil-ana');
  
  if (btnG && btnH) {
    if (nome === 'Gabriel') {
      btnG.classList.add('active');
      btnH.classList.remove('active');
    } else {
      btnH.classList.add('active');
      btnG.classList.remove('active');
    }
  }
}

// ── Modo Privacidade (Olhinho) ──
function alternarPrivacidade() {
  modoPrivacidade = !modoPrivacidade;
  localStorage.setItem('financas_privacidade', modoPrivacidade);
  aplicarModoPrivacidade();
}

function aplicarModoPrivacidade() {
  const icon = document.getElementById('privacy-icon');
  if (icon) icon.innerText = modoPrivacidade ? '🙈' : '👁️';

  const sensiveis = document.querySelectorAll('.masked-sensitive');
  sensiveis.forEach(el => {
    if (modoPrivacidade) {
      el.classList.add('privacy-hidden');
    } else {
      el.classList.remove('privacy-hidden');
    }
  });
}

// ── Navegação Temporal ──
function formatarAnoMes(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

function mudarMes(delta) {
  dataAtual.setMonth(dataAtual.getMonth() + delta);
  mesAtivo = formatarAnoMes(dataAtual);
  atualizarTituloMes();
  carregarDados();
}

function irParaMesAtual() {
  dataAtual = new Date();
  mesAtivo = formatarAnoMes(dataAtual);
  atualizarTituloMes();
  carregarDados();
}

function atualizarTituloMes() {
  const meses = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
  const m = meses[dataAtual.getMonth()];
  const y = dataAtual.getFullYear();
  document.getElementById('mes-titulo').innerText = `${m} / ${y}`;

  const hoje = new Date();
  const isMesAtual = (dataAtual.getMonth() === hoje.getMonth() && dataAtual.getFullYear() === hoje.getFullYear());
  const btnHoje = document.getElementById('btn-voltar-hoje');
  if (btnHoje) btnHoje.style.display = isMesAtual ? 'none' : 'inline-block';
}

// ── Navegação por Abas ──
function trocarAba(abaId) {
  document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
  document.querySelectorAll('.tab-content').forEach(sec => sec.classList.remove('active'));

  const btnAtivo = document.getElementById(`tab-btn-${abaId}`);
  const secAtiva = document.getElementById(`tab-content-${abaId}`);

  if (btnAtivo) btnAtivo.classList.add('active');
  if (secAtiva) secAtiva.classList.add('active');

  if (abaId === 'charts') {
    renderizarGraficos();
  } else if (abaId === 'salarios') {
    carregarReceitas();
  } else if (abaId === 'advisor') {
    const advBody = document.getElementById('advisor-body');
    if (advBody && advBody.innerHTML.includes('Carregando diagnóstico')) {
      obterConsultoriaIA();
    }
  }
}

// ── Carregamento de Dados ──
async function carregarDados() {
  await Promise.all([
    carregarResumo(),
    carregarGastos(),
    carregarReceitas()
  ]);
  aplicarModoPrivacidade();
}

// ── Resumo Geral e Cartão Executivo ──
async function carregarResumo() {
  try {
    const res = await fetch(`/api/resumo?mes=${mesAtivo}`);
    const data = await res.json();
    if (!data.success) return;

    resumoCache = data;

    // Cartão Executivo: Sobra do Mês
    const saldoEl = document.getElementById('saldo-liquido-valor');
    const saldoBadgeEl = document.getElementById('saldo-taxa-badge');
    const totalRendaEl = document.getElementById('total-renda-valor');
    const totalGastosEl = document.getElementById('total-gastos-valor');
    const totalQtdEl = document.getElementById('total-qtd-despesas');

    if (saldoEl) saldoEl.innerText = formatarMoeda(data.saldoGeral);
    if (totalRendaEl) totalRendaEl.innerText = formatarMoeda(data.totalReceitas);
    if (totalGastosEl) totalGastosEl.innerText = formatarMoeda(data.totalGeral);
    if (totalQtdEl) totalQtdEl.innerText = `${data.qtdTotal} ${data.qtdTotal === 1 ? 'item' : 'itens'}`;

    if (saldoBadgeEl) {
      if (data.saldoGeral >= 0) {
        saldoBadgeEl.className = 'status-pill positive';
        saldoBadgeEl.innerText = `+${data.taxaPoupanca}% Guardado`;
      } else {
        saldoBadgeEl.className = 'status-pill negative';
        saldoBadgeEl.innerText = `Déficit no Mês`;
      }
    }

    // Divisão do Casal (Gabriel vs Ana)
    const splitValG = document.getElementById('split-val-gabriel');
    const splitPctG = document.getElementById('split-pct-gabriel');
    const splitValH = document.getElementById('split-val-ana');
    const splitPctH = document.getElementById('split-pct-ana');
    const splitBarG = document.getElementById('split-bar-gabriel');
    const splitBarH = document.getElementById('split-bar-ana');

    const totalAna = data.totalAna ?? data.totalEsposa ?? 0;
    const pctAna = data.pctAna ?? data.pctEsposa ?? 0;

    if (splitValG) splitValG.innerText = formatarMoeda(data.totalGabriel);
    if (splitPctG) splitPctG.innerText = `(${data.pctGabriel}%)`;
    if (splitValH) splitValH.innerText = formatarMoeda(totalAna);
    if (splitPctH) splitPctH.innerText = `(${pctAna}%)`;

    if (splitBarG && splitBarH) {
      if (data.totalGeral === 0) {
        splitBarG.style.width = '50%';
        splitBarH.style.width = '50%';
      } else {
        splitBarG.style.width = `${data.pctGabriel}%`;
        splitBarH.style.width = `${pctAna}%`;
      }
    }

    // Atualiza aba de salários e gráficos caso estejam visíveis
    atualizarVisaoSalarios();
  } catch (err) {
    console.error('Erro ao carregar resumo:', err);
  }
}

// ── Lista de Gastos (Extrato) ──
async function carregarGastos() {
  const listaEl = document.getElementById('gastos-lista');
  const filtroResp = document.getElementById('filtro-resp').value;

  let url = `/api/gastos?mes=${mesAtivo}`;
  if (filtroResp !== 'Todos') url += `&responsavel=${filtroResp}`;
  if (categoriaFiltro !== 'Todas') url += `&categoria=${encodeURIComponent(categoriaFiltro)}`;

  try {
    const res = await fetch(url);
    const data = await res.json();
    if (!data.success) return;

    gastosCache = data.gastos || [];
    renderizarExtrato();
  } catch (err) {
    console.error('Erro ao carregar gastos:', err);
  }
}

function filtrarPorTexto(texto) {
  termoBusca = (texto || '').toLowerCase().trim();
  renderizarExtrato();
}

function filtrarCategoria(cat, elemento) {
  categoriaFiltro = cat;
  document.querySelectorAll('.cat-chip').forEach(el => el.classList.remove('active'));
  if (elemento) elemento.classList.add('active');
  carregarGastos();
}

function filtrarPorPessoa(pessoa) {
  const select = document.getElementById('filtro-resp');
  if (select) {
    select.value = pessoa;
    carregarGastos();
    trocarAba('feed');
  }
}

function renderizarExtrato() {
  const listaEl = document.getElementById('gastos-lista');
  if (!listaEl) return;

  let filtrados = gastosCache;
  if (termoBusca) {
    filtrados = filtrados.filter(g => 
      (g.estabelecimento && g.estabelecimento.toLowerCase().includes(termoBusca)) ||
      (g.categoria && g.categoria.toLowerCase().includes(termoBusca)) ||
      (g.observacoes && g.observacoes.toLowerCase().includes(termoBusca))
    );
  }

  if (filtrados.length === 0) {
    listaEl.innerHTML = `
      <div style="text-align:center;padding:40px 20px;color:var(--text-dim);">
        <div style="font-size:32px;margin-bottom:8px;">🔍</div>
        <p style="font-weight:700;">Nenhum lançamento encontrado neste filtro.</p>
      </div>
    `;
    return;
  }

  // Agrupar por data (YYYY-MM-DD)
  const grupos = {};
  filtrados.forEach(g => {
    const d = g.data || 'Outros';
    if (!grupos[d]) grupos[d] = [];
    grupos[d].push(g);
  });

  const datasOrdenadas = Object.keys(grupos).sort((a, b) => b.localeCompare(a));

  let html = '';
  datasOrdenadas.forEach(dataKey => {
    const itens = grupos[dataKey];
    const totalDia = itens.reduce((acc, curr) => acc + Number(curr.valor), 0);
    const dataFmt = formatarTituloData(dataKey);

    html += `
      <div class="date-group">
        <div class="date-group-header">
          <span>${dataFmt}</span>
          <span class="date-group-total masked-sensitive">${formatarMoeda(totalDia)}</span>
        </div>
        ${itens.map(g => renderizarCardGasto(g)).join('')}
      </div>
    `;
  });

  listaEl.innerHTML = html;
  aplicarModoPrivacidade();
}

function renderizarCardGasto(g) {
  const conf = CATEGORIAS_CONFIG[g.categoria] || { icon: '📦', color: '#64748b' };
  const respClass = (g.responsavel === 'Ana' || g.responsavel === 'Esposa') ? 'ana' : 'gabriel';
  const respNome = respClass === 'ana' ? 'Ana' : 'Gabriel';
  const comprovanteLink = g.comprovante_nome 
    ? `<a href="/uploads/${g.comprovante_nome}" target="_blank" class="tx-proof-link">📎 Ver</a>`
    : '';

  return `
    <div class="transaction-card">
      <div class="tx-cat-icon">${conf.icon}</div>
      <div class="tx-details">
        <div class="tx-title-row">
          <span class="tx-title">${escapeHtml(g.estabelecimento)}</span>
          <span class="tx-badge-resp ${respClass}">${respNome}</span>
        </div>
        <div class="tx-meta-row">
          <span>${escapeHtml(g.categoria)}</span>
          <span>•</span>
          <span>${escapeHtml(g.metodo || 'Pix')}</span>
          ${comprovanteLink ? `<span>•</span> ${comprovanteLink}` : ''}
        </div>
      </div>
      <div class="tx-amount-section">
        <div class="tx-amount masked-sensitive">${formatarMoeda(g.valor)}</div>
      </div>
      <div class="tx-actions">
        <button type="button" class="btn-tx-action edit" title="Editar este lançamento" onclick="abrirModalEdicao(${g.id})">✏️</button>
        <button type="button" class="btn-tx-action delete" title="Excluir este lançamento" onclick="excluirGasto(${g.id})">🗑️</button>
      </div>
    </div>
  `;
}

function obterDataHojeBR() {
  const agora = new Date();
  const y = agora.getFullYear();
  const m = String(agora.getMonth() + 1).padStart(2, '0');
  const d = String(agora.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// ── Edição e Lançamento de Gastos ──
function abrirModalManual() {
  document.getElementById('modal-form-title').innerText = 'Novo Lançamento';
  document.getElementById('form-gasto-id').value = '';
  document.getElementById('form-valor').value = '';
  document.getElementById('form-estabelecimento').value = '';
  document.getElementById('form-categoria').value = 'Supermercado';
  document.getElementById('form-metodo').value = 'Pix';
  document.getElementById('form-data').value = obterDataHojeBR();
  document.getElementById('form-observacoes').value = '';
  document.getElementById('form-comprovante-nome').value = '';

  const radG = document.getElementById('resp-radio-gabriel');
  const radH = document.getElementById('resp-radio-ana');
  if (perfilAtivo === 'Ana') radH.checked = true;
  else radG.checked = true;

  document.getElementById('modal-confirmacao').classList.add('active');
}

function abrirModalEdicao(id) {
  const g = gastosCache.find(item => item.id == id);
  if (!g) {
    alert('Lançamento não encontrado.');
    return;
  }

  document.getElementById('modal-form-title').innerText = `Editar Despesa #${g.id}`;
  document.getElementById('form-gasto-id').value = g.id;
  document.getElementById('form-valor').value = g.valor;
  document.getElementById('form-estabelecimento').value = g.estabelecimento || '';
  document.getElementById('form-categoria').value = g.categoria || 'Supermercado';
  document.getElementById('form-metodo').value = g.metodo || 'Pix';
  document.getElementById('form-data').value = g.data || '';
  document.getElementById('form-observacoes').value = g.observacoes || '';
  document.getElementById('form-comprovante-nome').value = g.comprovante_nome || '';

  const radG = document.getElementById('resp-radio-gabriel');
  const radH = document.getElementById('resp-radio-ana');
  if (g.responsavel === 'Ana' || g.responsavel === 'Esposa') {
    radH.checked = true;
  } else {
    radG.checked = true;
  }

  document.getElementById('modal-confirmacao').classList.add('active');
}

function fecharModalConfirmacao() {
  document.getElementById('modal-confirmacao').classList.remove('active');
}

async function salvarGastoForm(e) {
  e.preventDefault();

  const id = document.getElementById('form-gasto-id').value;
  const isEdicao = Boolean(id);

  const respRadio = document.querySelector('input[name="form_resp"]:checked');
  const responsavel = respRadio ? respRadio.value : perfilAtivo;

  const payload = {
    valor: parseFloat(document.getElementById('form-valor').value),
    estabelecimento: document.getElementById('form-estabelecimento').value.trim(),
    categoria: document.getElementById('form-categoria').value,
    metodo: document.getElementById('form-metodo').value,
    responsavel: responsavel,
    data: document.getElementById('form-data').value,
    observacoes: document.getElementById('form-observacoes').value.trim(),
    comprovante_nome: document.getElementById('form-comprovante-nome').value
  };

  const btn = document.getElementById('btn-salvar-gasto');
  btn.disabled = true;
  btn.innerText = 'Salvando...';

  try {
    const url = isEdicao ? `/api/gastos/${id}` : '/api/gastos';
    const method = isEdicao ? 'PUT' : 'POST';

    const res = await fetch(url, {
      method: method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    btn.disabled = false;
    btn.innerText = 'Salvar Lançamento';

    if (data.success) {
      fecharModalConfirmacao();
      carregarDados();
    } else {
      alert('Erro ao salvar: ' + (data.error || 'Falha ao processar'));
    }
  } catch (err) {
    btn.disabled = false;
    btn.innerText = 'Salvar Lançamento';
    alert('Erro de conexão: ' + err.message);
  }
}

async function excluirGasto(id) {
  if (!confirm('Deseja realmente apagar este lançamento?')) return;

  try {
    const res = await fetch(`/api/gastos/${id}`, { method: 'DELETE' });
    const data = await res.json();
    if (data.success) {
      carregarDados();
    } else {
      alert('Erro ao excluir: ' + data.error);
    }
  } catch (err) {
    alert('Erro ao excluir: ' + err.message);
  }
}

// ── Salários e Rendas ──
function abrirModalSalario(id) {
  const formId = document.getElementById('form-salario-id');
  const title = document.getElementById('modal-salario-title');
  const valorInput = document.getElementById('salario-valor');
  const descInput = document.getElementById('salario-descricao');
  const catInput = document.getElementById('salario-categoria');
  const dataInput = document.getElementById('salario-data');
  const radG = document.getElementById('sal-radio-gabriel');
  const radH = document.getElementById('sal-radio-ana');

  if (id) {
    const rec = receitasCache.find(r => r.id == id);
    if (!rec) return;
    formId.value = rec.id;
    title.innerText = `Editar Receita #${rec.id}`;
    valorInput.value = rec.valor;
    descInput.value = rec.descricao || '';
    catInput.value = rec.categoria || 'Salário';
    dataInput.value = rec.data || '';
    if (rec.responsavel === 'Ana' || rec.responsavel === 'Esposa') radH.checked = true;
    else radG.checked = true;
  } else {
    formId.value = '';
    title.innerText = 'Lançar Salário / Entrada';
    valorInput.value = '';
    descInput.value = '';
    catInput.value = 'Salário';
    dataInput.value = obterDataHojeBR();
    if (perfilAtivo === 'Ana') radH.checked = true;
    else radG.checked = true;
  }

  document.getElementById('modal-salario').classList.add('active');
}

function fecharModalSalario() {
  document.getElementById('modal-salario').classList.remove('active');
}

async function salvarSalarioForm(e) {
  e.preventDefault();

  const id = document.getElementById('form-salario-id').value;
  const isEdicao = Boolean(id);

  const respRadio = document.querySelector('input[name="salario_resp"]:checked');
  const responsavel = respRadio ? respRadio.value : perfilAtivo;

  const payload = {
    valor: parseFloat(document.getElementById('salario-valor').value),
    responsavel: responsavel,
    descricao: document.getElementById('salario-descricao').value.trim(),
    categoria: document.getElementById('salario-categoria').value,
    data: document.getElementById('salario-data').value
  };

  const btn = document.getElementById('btn-salvar-salario');
  btn.disabled = true;
  btn.innerText = 'Confirmando...';

  try {
    const url = isEdicao ? `/api/receitas/${id}` : '/api/receitas';
    const method = isEdicao ? 'PUT' : 'POST';

    const res = await fetch(url, {
      method: method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    btn.disabled = false;
    btn.innerText = 'Confirmar Salário';

    if (data.success) {
      fecharModalSalario();
      carregarDados();
    } else {
      alert('Erro ao salvar receita: ' + (data.error || 'Falha no servidor'));
    }
  } catch (err) {
    btn.disabled = false;
    btn.innerText = 'Confirmar Salário';
    alert('Erro de conexão: ' + err.message);
  }
}

async function carregarReceitas() {
  try {
    const res = await fetch(`/api/receitas?mes=${mesAtivo}`);
    const data = await res.json();
    if (!data.success) return;

    receitasCache = data.receitas || [];
    renderizarListaReceitas();
  } catch (err) {
    console.error('Erro ao carregar receitas:', err);
  }
}

function renderizarListaReceitas() {
  const listaEl = document.getElementById('receitas-lista');
  if (!listaEl) return;

  if (receitasCache.length === 0) {
    listaEl.innerHTML = `
      <div style="text-align:center;padding:30px;color:var(--text-dim);background:var(--surface);border-radius:12px;">
        <p>Nenhum salário ou receita cadastrada para este mês.</p>
        <button type="button" class="btn-primary-inline" style="margin-top:10px;" onclick="abrirModalSalario()">+ Lançar Primeiro Salário</button>
      </div>
    `;
    return;
  }

  listaEl.innerHTML = receitasCache.map(r => {
    const respClass = (r.responsavel === 'Ana' || r.responsavel === 'Esposa') ? 'ana' : 'gabriel';
    const respNome = respClass === 'ana' ? 'Ana' : 'Gabriel';
    const dataFmt = formatarDataCurta(r.data);

    return `
      <div class="receita-item-card">
        <div class="rec-info">
          <span class="rec-badge ${respClass}">${respNome}</span>
          <div>
            <div class="rec-title">${escapeHtml(r.descricao)}</div>
            <div class="rec-meta">${escapeHtml(r.categoria)} • ${dataFmt}</div>
          </div>
        </div>
        <div class="rec-right">
          <div class="rec-amount masked-sensitive">+ ${formatarMoeda(r.valor)}</div>
          <button type="button" class="btn-tx-action edit" title="Editar" onclick="abrirModalSalario(${r.id})">✏️</button>
          <button type="button" class="btn-tx-action delete" title="Excluir" onclick="excluirReceita(${r.id})">🗑️</button>
        </div>
      </div>
    `;
  }).join('');

  aplicarModoPrivacidade();
}

async function excluirReceita(id) {
  if (!confirm('Deseja realmente apagar esta receita?')) return;

  try {
    const res = await fetch(`/api/receitas/${id}`, { method: 'DELETE' });
    const data = await res.json();
    if (data.success) {
      carregarDados();
    } else {
      alert('Erro ao excluir: ' + data.error);
    }
  } catch (err) {
    alert('Erro ao excluir: ' + err.message);
  }
}

function atualizarVisaoSalarios() {
  if (!resumoCache) return;

  const viewSalG = document.getElementById('view-salario-gabriel');
  const viewGastoG = document.getElementById('view-gasto-gabriel');
  const viewPillG = document.getElementById('view-saldo-gabriel-pill');

  const viewSalH = document.getElementById('view-salario-ana');
  const viewGastoH = document.getElementById('view-gasto-ana');
  const viewPillH = document.getElementById('view-saldo-ana-pill');

  const rG = resumoCache.receitaGabriel || 0;
  const gG = resumoCache.totalGabriel || 0;
  const sG = resumoCache.saldoGabriel || (rG - gG);

  const rH = resumoCache.receitaAna || 0;
  const gH = resumoCache.totalAna ?? resumoCache.totalEsposa ?? 0;
  const sH = resumoCache.saldoAna || (rH - gH);

  if (viewSalG) viewSalG.innerText = formatarMoeda(rG);
  if (viewGastoG) viewGastoG.innerText = formatarMoeda(gG);
  if (viewPillG) {
    viewPillG.innerText = `Sobra: ${formatarMoeda(sG)}`;
    viewPillG.className = `pill-saldo ${sG >= 0 ? 'pos' : 'neg'}`;
  }

  if (viewSalH) viewSalH.innerText = formatarMoeda(rH);
  if (viewGastoH) viewGastoH.innerText = formatarMoeda(gH);
  if (viewPillH) {
    viewPillH.innerText = `Sobra: ${formatarMoeda(sH)}`;
    viewPillH.className = `pill-saldo ${sH >= 0 ? 'pos' : 'neg'}`;
  }
}

// ── Gráficos e Raio-X Interativo ──
function renderizarGraficos() {
  if (!resumoCache) return;

  renderizarDonutCategorias();
  renderizarBarrasComparativas();
  renderizarMetodosPagamento();
}

function renderizarDonutCategorias() {
  const svg = document.getElementById('donut-svg');
  const legend = document.getElementById('chart-legend-categories');
  const centerPct = document.getElementById('donut-center-pct');
  const centerTitle = document.getElementById('donut-center-title');
  const centerVal = document.getElementById('donut-center-val');

  if (!svg || !legend) return;

  const cats = resumoCache.gastosPorCategoria || [];
  const total = resumoCache.totalGeral || 0;

  centerPct.innerText = '100%';
  centerTitle.innerText = 'Total Gasto';
  centerVal.innerText = formatarMoeda(total);

  if (cats.length === 0 || total === 0) {
    svg.innerHTML = `
      <circle cx="50" cy="50" r="38" fill="none" stroke="#161f33" stroke-width="14"></circle>
    `;
    legend.innerHTML = '<div style="color:var(--text-dim);font-size:12px;grid-column:1/-1;text-align:center;">Nenhum gasto registrado neste mês.</div>';
    return;
  }

  const radius = 38;
  const circumference = 2 * Math.PI * radius; // ~238.76
  let offsetAcc = 0;

  let circlesHtml = '';
  let legendHtml = '';

  cats.forEach(c => {
    const val = Number(c.total) || 0;
    const pct = total > 0 ? (val / total) : 0;
    const dashLength = pct * circumference;
    const dashSpace = circumference - dashLength;
    const conf = CATEGORIAS_CONFIG[c.categoria] || { icon: '📦', color: '#64748b' };
    const pctFmt = Math.round(pct * 100);

    circlesHtml += `
      <circle class="donut-slice"
        cx="50" cy="50" r="${radius}"
        fill="none"
        stroke="${conf.color}"
        stroke-width="14"
        stroke-dasharray="${dashLength.toFixed(2)} ${dashSpace.toFixed(2)}"
        stroke-dashoffset="${(-offsetAcc).toFixed(2)}"
        onmouseenter="destacarDonut('${escapeHtml(c.categoria)}', '${pctFmt}%', '${formatarMoeda(val)}')"
        onclick="destacarDonut('${escapeHtml(c.categoria)}', '${pctFmt}%', '${formatarMoeda(val)}')">
      </circle>
    `;

    legendHtml += `
      <div class="legend-item" 
           onmouseenter="destacarDonut('${escapeHtml(c.categoria)}', '${pctFmt}%', '${formatarMoeda(val)}')"
           onclick="destacarDonut('${escapeHtml(c.categoria)}', '${pctFmt}%', '${formatarMoeda(val)}')">
        <div class="legend-left">
          <div class="legend-color-box" style="background:${conf.color};"></div>
          <span class="legend-name">${conf.icon} ${escapeHtml(c.categoria)}</span>
        </div>
        <div class="legend-val masked-sensitive">${pctFmt}% (${formatarMoeda(val)})</div>
      </div>
    `;

    offsetAcc += dashLength;
  });

  svg.innerHTML = circlesHtml;
  legend.innerHTML = legendHtml;
  aplicarModoPrivacidade();
}

function destacarDonut(titulo, pct, val) {
  const centerPct = document.getElementById('donut-center-pct');
  const centerTitle = document.getElementById('donut-center-title');
  const centerVal = document.getElementById('donut-center-val');

  if (centerPct) centerPct.innerText = pct;
  if (centerTitle) centerTitle.innerText = titulo;
  if (centerVal) centerVal.innerText = val;
}

function renderizarBarrasComparativas() {
  const container = document.getElementById('couple-comparison-bars');
  if (!container || !resumoCache) return;

  const rG = resumoCache.receitaGabriel || 0;
  const gG = resumoCache.totalGabriel || 0;
  const pctGastoG = rG > 0 ? Math.min(Math.round((gG / rG) * 100), 100) : 0;
  const sobraG = rG - gG;

  const rH = resumoCache.receitaAna || 0;
  const gH = resumoCache.totalAna ?? resumoCache.totalEsposa ?? 0;
  const pctGastoH = rH > 0 ? Math.min(Math.round((gH / rH) * 100), 100) : 0;
  const sobraH = rH - gH;

  container.innerHTML = `
    <!-- Barra Gabriel -->
    <div class="person-bar-card">
      <div class="p-bar-top">
        <strong style="color:var(--gabriel-light);">🟢 Gabriel</strong>
        <span class="p-val masked-sensitive">Renda: ${formatarMoeda(rG)}</span>
      </div>
      <div class="p-bar-track">
        <div class="p-bar-fill" style="width:${pctGastoG}%;background:linear-gradient(90deg,#059669,#10b981);"></div>
      </div>
      <div class="p-bar-stats">
        <span>Gastou: <strong class="masked-sensitive">${formatarMoeda(gG)}</strong> (${pctGastoG}%)</span>
        <span style="color:${sobraG >= 0 ? 'var(--gabriel-light)' : '#f87171'};font-weight:800;" class="masked-sensitive">
          ${sobraG >= 0 ? 'Sobra: +' : 'Déficit: '}${formatarMoeda(sobraG)}
        </span>
      </div>
    </div>

    <!-- Barra Ana -->
    <div class="person-bar-card">
      <div class="p-bar-top">
        <strong style="color:var(--ana-light);">🟣 Ana</strong>
        <span class="p-val masked-sensitive">Renda: ${formatarMoeda(rH)}</span>
      </div>
      <div class="p-bar-track">
        <div class="p-bar-fill" style="width:${pctGastoH}%;background:linear-gradient(90deg,#db2777,#ec4899);"></div>
      </div>
      <div class="p-bar-stats">
        <span>Gastou: <strong class="masked-sensitive">${formatarMoeda(gH)}</strong> (${pctGastoH}%)</span>
        <span style="color:${sobraH >= 0 ? 'var(--ana-light)' : '#f87171'};font-weight:800;" class="masked-sensitive">
          ${sobraH >= 0 ? 'Sobra: +' : 'Déficit: '}${formatarMoeda(sobraH)}
        </span>
      </div>
    </div>
  `;

  aplicarModoPrivacidade();
}

function renderizarMetodosPagamento() {
  const container = document.getElementById('payment-methods-list');
  if (!container || !gastosCache) return;

  const totais = {};
  gastosCache.forEach(g => {
    const met = g.metodo || 'Outro';
    totais[met] = (totais[met] || 0) + Number(g.valor);
  });

  const metodos = Object.keys(totais).sort((a, b) => totais[b] - totais[a]);

  if (metodos.length === 0) {
    container.innerHTML = '<div style="color:var(--text-dim);font-size:12px;text-align:center;">Nenhuma despesa para listar métodos.</div>';
    return;
  }

  container.innerHTML = metodos.map(m => `
    <div class="pay-item">
      <span class="pay-item-name">💳 ${escapeHtml(m)}</span>
      <span class="pay-item-val masked-sensitive">${formatarMoeda(totais[m])}</span>
    </div>
  `).join('');

  aplicarModoPrivacidade();
}

// ── Scanner de Documentos e IA Conclusora ──
function acionarScanner() {
  document.getElementById('modal-escolha-origem').classList.add('active');
}

function fecharModalEscolha() {
  document.getElementById('modal-escolha-origem').classList.remove('active');
}

function abrirCamera() {
  fecharModalEscolha();
  document.getElementById('camera-input').click();
}

function abrirGaleria() {
  fecharModalEscolha();
  document.getElementById('galeria-input').click();
}

function abrirDocumento() {
  fecharModalEscolha();
  document.getElementById('pdf-input').click();
}

async function processarArquivoSelecionado(file) {
  if (!file) return;

  const modalScanner = document.getElementById('modal-scanner');
  const statusEl = document.getElementById('scanner-status');
  modalScanner.classList.add('active');
  statusEl.innerText = '1/2: Lendo comprovante com visão IA...';

  const timerEtapa2 = setTimeout(() => {
    statusEl.innerText = '2/2: NVIDIA Nemotron 550B concluindo análise financeira...';
  }, 2500);

  const formData = new FormData();
  formData.append('comprovante', file);

  try {
    const res = await fetch('/api/scan', {
      method: 'POST',
      body: formData
    });

    clearTimeout(timerEtapa2);
    const data = await res.json();
    modalScanner.classList.remove('active');

    if (!data.success) {
      alert('Erro na leitura da IA: ' + (data.error || 'Falha ao processar'));
      return;
    }

    const d = data.dados || {};
    
    // Abrir formulário preenchido pela IA
    document.getElementById('modal-form-title').innerText = '✨ Identificado pela NVIDIA IA';
    document.getElementById('form-gasto-id').value = '';
    document.getElementById('form-valor').value = d.valor || '';
    document.getElementById('form-estabelecimento').value = d.estabelecimento || '';
    document.getElementById('form-categoria').value = d.categoria || 'Supermercado';
    document.getElementById('form-metodo').value = d.metodo || 'Pix';
    document.getElementById('form-data').value = d.data || obterDataHojeBR();
    document.getElementById('form-observacoes').value = d.observacao || '';
    document.getElementById('form-comprovante-nome').value = data.arquivoNome || '';

    const respSugerido = (d.responsavel === 'Ana' || d.responsavel === 'Esposa') ? 'Ana' : (d.responsavel === 'Gabriel' ? 'Gabriel' : perfilAtivo);
    const radG = document.getElementById('resp-radio-gabriel');
    const radH = document.getElementById('resp-radio-ana');
    if (respSugerido === 'Ana') radH.checked = true;
    else radG.checked = true;

    document.getElementById('modal-confirmacao').classList.add('active');

  } catch (err) {
    clearTimeout(timerEtapa2);
    modalScanner.classList.remove('active');
    alert('Erro de conexão ao processar comprovante: ' + err.message);
  }
}

// ── Consultoria com NVIDIA Nemotron 3 Ultra 550B ──
async function obterConsultoriaIA() {
  trocarAba('advisor');
  const bodyEl = document.getElementById('advisor-body');
  if (!bodyEl) return;

  bodyEl.innerHTML = `
    <div class="advisor-placeholder">
      <div class="pulse-ring"></div>
      <p style="font-weight:700;color:#fff;">NVIDIA Nemotron 3 Ultra 550B em execução...</p>
      <p style="font-size:12px;margin-top:6px;">Processando salários, despesas e comportamento financeiro do casal.</p>
    </div>
  `;

  try {
    const res = await fetch(`/api/ia/consultoria?mes=${mesAtivo}`);
    const data = await res.json();

    if (data.success) {
      let formatado = escapeHtml(data.analise)
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/### (.*?)(<br>|\n|$)/g, '<h3 style="color:var(--cyan);margin-top:16px;margin-bottom:8px;">$1</h3>')
        .replace(/\n\n/g, '<br><br>')
        .replace(/\n/g, '<br>');

      bodyEl.innerHTML = `<div class="ai-report-content">${formatado}</div>`;
    } else {
      bodyEl.innerHTML = `
        <div style="color:#f87171;padding:20px;text-align:center;">
          Erro ao gerar auditoria: ${data.error || 'Falha na resposta da IA'}
        </div>
      `;
    }
  } catch (err) {
    bodyEl.innerHTML = `
      <div style="color:#f87171;padding:20px;text-align:center;">
        Erro de rede com o serviço da NVIDIA: ${err.message}
      </div>
    `;
  }
}

// ── Exportação CSV ──
function exportarCSV() {
  window.open(`/api/export?mes=${mesAtivo}`, '_blank');
}

// ── Utilitários ──
function formatarMoeda(val) {
  const n = Number(val) || 0;
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatarDataCurta(dataISO) {
  if (!dataISO) return '';
  const [y, m, d] = dataISO.split('-');
  return `${d}/${m}`;
}

function formatarTituloData(dataISO) {
  if (!dataISO || dataISO === 'Outros') return 'Outras Datas';
  const hoje = new Date().toISOString().slice(0, 10);
  const ontem = new Date(Date.now() - 86400000).toISOString().slice(0, 10);

  if (dataISO === hoje) return 'Hoje';
  if (dataISO === ontem) return 'Ontem';

  const [y, m, d] = dataISO.split('-');
  return `${d}/${m}/${y}`;
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
