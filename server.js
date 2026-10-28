'use strict';

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const multer = require('multer');

const db = require('./database/db');
const { processarComprovanteComIA, gerarConsultoriaFinanceiraNvidia, CATEGORIAS_VALIDAS, METODOS_VALIDOS } = require('./services/ocrService');

const app = express();
const PORT = process.env.PORT || 3010;

// Diretório de uploads
const UPLOAD_DIR = path.join(__dirname, 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// Helpers de data no fuso de Brasília (GMT-3)
function obterDataBrasilia() {
  const d = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dia = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dia}`;
}

function obterMesBrasilia() {
  return obterDataBrasilia().slice(0, 7);
}

// Migração de compatibilidade: Esposa -> Ana
try {
  db.prepare("UPDATE gastos SET responsavel = 'Ana' WHERE responsavel = 'Esposa'").run();
} catch (e) {
  console.warn('[DB MIGRAÇÃO AVISO]', e.message);
}

// Configuração do Multer (armazenamento em disco e memória)
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
    const timestamp = Date.now();
    const cleanName = file.originalname.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 30);
    cb(null, `${timestamp}_${cleanName}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 15 * 1024 * 1024 } // Até 15MB
});

app.use(cors());
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

// Servir frontend estático e uploads
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(UPLOAD_DIR));

// ── ROTAS DE API ──

/**
 * 1. SCAN COM IA: Recebe imagem ou PDF e retorna dados extraídos
 */
app.post('/api/scan', upload.single('comprovante'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'Nenhum arquivo enviado.' });
    }

    const filePath = req.file.path;
    const mimeType = req.file.mimetype || 'image/jpeg';
    const buffer = fs.readFileSync(filePath);

    console.log(`[SCAN] Processando arquivo: ${req.file.filename} (${mimeType}, ${buffer.length} bytes)`);

    const dadosExtraidos = await processarComprovanteComIA(buffer, mimeType);

    return res.json({
      success: true,
      arquivoNome: req.file.filename,
      dados: dadosExtraidos
    });
  } catch (err) {
    console.error('[SCAN ERRO]', err);
    return res.status(500).json({
      success: false,
      error: err.message || 'Falha ao processar comprovante com IA.'
    });
  }
});

/**
 * 2. SALVAR GASTO
 */
app.post('/api/gastos', (req, res) => {
  try {
    const {
      data,
      valor,
      estabelecimento,
      categoria,
      metodo,
      responsavel,
      comprovante_nome,
      observacoes,
      itens
    } = req.body;

    if (!valor || isNaN(parseFloat(valor))) {
      return res.status(400).json({ success: false, error: 'Valor inválido.' });
    }

    const vNum = parseFloat(valor);
    const dataGasto = data || obterDataBrasilia();
    const est = (estabelecimento || 'Outros').trim();
    const cat = CATEGORIAS_VALIDAS.includes(categoria) ? categoria : 'Outros';
    const met = METODOS_VALIDOS.includes(metodo) ? metodo : 'Pix';
    const resp = (responsavel === 'Ana' || responsavel === 'Esposa') ? 'Ana' : 'Gabriel';
    const itensJson = Array.isArray(itens) && itens.length ? JSON.stringify(itens) : null;

    const stmt = db.prepare(`
      INSERT INTO gastos (data, valor, estabelecimento, categoria, metodo, responsavel, comprovante_nome, observacoes, itens_json)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      dataGasto,
      vNum,
      est,
      cat,
      met,
      resp,
      comprovante_nome || null,
      observacoes || null,
      itensJson
    );

    return res.json({
      success: true,
      id: result.lastInsertRowid,
      message: 'Gasto registrado com sucesso!'
    });
  } catch (err) {
    console.error('[SALVAR GASTO ERRO]', err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * 2.1. EDITAR GASTO EXISTENTE
 */
app.put('/api/gastos/:id', (req, res) => {
  try {
    const id = req.params.id;
    const {
      data,
      valor,
      estabelecimento,
      categoria,
      metodo,
      responsavel,
      observacoes
    } = req.body;

    if (!valor || isNaN(parseFloat(valor))) {
      return res.status(400).json({ success: false, error: 'Valor inválido.' });
    }

    const vNum = parseFloat(valor);
    const dataGasto = data || new Date().toISOString().slice(0, 10);
    const est = (estabelecimento || 'Outros').trim();
    const cat = CATEGORIAS_VALIDAS.includes(categoria) ? categoria : 'Outros';
    const met = METODOS_VALIDOS.includes(metodo) ? metodo : 'Pix';
    const resp = (responsavel === 'Ana' || responsavel === 'Esposa') ? 'Ana' : 'Gabriel';

    const stmt = db.prepare(`
      UPDATE gastos
      SET data = ?, valor = ?, estabelecimento = ?, categoria = ?, metodo = ?, responsavel = ?, observacoes = ?
      WHERE id = ?
    `);

    const result = stmt.run(dataGasto, vNum, est, cat, met, resp, observacoes || null, id);

    if (result.changes === 0) {
      return res.status(404).json({ success: false, error: 'Gasto não encontrado.' });
    }

    return res.json({ success: true, message: 'Gasto atualizado com sucesso!' });
  } catch (err) {
    console.error('[EDITAR GASTO ERRO]', err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * 3. LISTAR GASTOS (Filtros: mes, responsavel, categoria)
 */
app.get('/api/gastos', (req, res) => {
  try {
    const { mes, responsavel, categoria } = req.query;

    let query = 'SELECT * FROM gastos WHERE 1=1';
    const params = [];

    if (mes && /^\d{4}-\d{2}$/.test(mes)) {
      query += " AND strftime('%Y-%m', data) = ?";
      params.push(mes);
    }

    if (responsavel && (responsavel === 'Gabriel' || responsavel === 'Ana' || responsavel === 'Esposa')) {
      const respParam = responsavel === 'Esposa' ? 'Ana' : responsavel;
      query += ' AND (responsavel = ? OR responsavel = ?)';
      params.push(respParam, responsavel);
    }

    if (categoria && categoria !== 'Todas') {
      query += ' AND categoria = ?';
      params.push(categoria);
    }

    query += ' ORDER BY data DESC, id DESC';

    const gastos = db.prepare(query).all(...params);
    return res.json({ success: true, gastos });
  } catch (err) {
    console.error('[LISTAR GASTOS ERRO]', err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * 3.1. CRUD DE RECEITAS / SALÁRIOS
 */
app.get('/api/receitas', (req, res) => {
  try {
    const mesAtual = req.query.mes || obterMesBrasilia();
    const receitas = db.prepare(`
      SELECT * FROM receitas
      WHERE strftime('%Y-%m', data) = ?
      ORDER BY data DESC, id DESC
    `).all(mesAtual);

    return res.json({ success: true, receitas });
  } catch (err) {
    console.error('[LISTAR RECEITAS ERRO]', err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/receitas', (req, res) => {
  try {
    const { data, valor, descricao, responsavel, categoria } = req.body;
    if (!valor || isNaN(parseFloat(valor))) {
      return res.status(400).json({ success: false, error: 'Valor inválido.' });
    }

    const vNum = parseFloat(valor);
    const dataRec = data || obterDataBrasilia();
    const desc = (descricao || 'Salário').trim();
    const resp = (responsavel === 'Ana' || responsavel === 'Esposa') ? 'Ana' : 'Gabriel';
    const cat = categoria || 'Salário';

    const stmt = db.prepare(`
      INSERT INTO receitas (data, valor, descricao, responsavel, categoria)
      VALUES (?, ?, ?, ?, ?)
    `);

    const result = stmt.run(dataRec, vNum, desc, resp, cat);
    return res.json({ success: true, id: result.lastInsertRowid, message: 'Salário/Receita salvo!' });
  } catch (err) {
    console.error('[SALVAR RECEITA ERRO]', err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

app.put('/api/receitas/:id', (req, res) => {
  try {
    const id = req.params.id;
    const { data, valor, descricao, responsavel, categoria } = req.body;

    if (!valor || isNaN(parseFloat(valor))) {
      return res.status(400).json({ success: false, error: 'Valor inválido.' });
    }

    const vNum = parseFloat(valor);
    const dataRec = data || new Date().toISOString().slice(0, 10);
    const desc = (descricao || 'Salário').trim();
    const resp = (responsavel === 'Ana' || responsavel === 'Esposa') ? 'Ana' : 'Gabriel';
    const cat = categoria || 'Salário';

    const result = db.prepare(`
      UPDATE receitas
      SET data = ?, valor = ?, descricao = ?, responsavel = ?, categoria = ?
      WHERE id = ?
    `).run(dataRec, vNum, desc, resp, cat, id);

    if (result.changes === 0) {
      return res.status(404).json({ success: false, error: 'Receita não encontrada.' });
    }

    return res.json({ success: true, message: 'Receita atualizada!' });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

app.delete('/api/receitas/:id', (req, res) => {
  try {
    const id = req.params.id;
    db.prepare('DELETE FROM receitas WHERE id = ?').run(id);
    return res.json({ success: true, message: 'Receita excluída.' });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * 4. RESUMO DO MÊS (Totais, Divisão de Casal, Salários/Sobra, Categorias e Gráficos)
 */
app.get('/api/resumo', (req, res) => {
  try {
    const mesAtual = req.query.mes || obterMesBrasilia();

    // Total Geral do Mês (Gastos)
    const totalGeral = db.prepare(`
      SELECT COALESCE(SUM(valor), 0) as total, COUNT(*) as qtd
      FROM gastos
      WHERE strftime('%Y-%m', data) = ?
    `).get(mesAtual);

    // Divisão por Responsável (Gastos)
    const porResponsavel = db.prepare(`
      SELECT responsavel, COALESCE(SUM(valor), 0) as total, COUNT(*) as qtd
      FROM gastos
      WHERE strftime('%Y-%m', data) = ?
      GROUP BY responsavel
    `).all(mesAtual);

    let totalGabriel = 0;
    let totalAna = 0;
    porResponsavel.forEach(r => {
      if (r.responsavel === 'Gabriel') totalGabriel += r.total;
      if (r.responsavel === 'Ana' || r.responsavel === 'Esposa') totalAna += r.total;
    });

    // Salários / Receitas do Mês
    const receitasMes = db.prepare(`
      SELECT responsavel, COALESCE(SUM(valor), 0) as total, COUNT(*) as qtd
      FROM receitas
      WHERE strftime('%Y-%m', data) = ?
      GROUP BY responsavel
    `).all(mesAtual);

    let receitaGabriel = 0;
    let receitaAna = 0;
    receitasMes.forEach(r => {
      if (r.responsavel === 'Gabriel') receitaGabriel += r.total;
      if (r.responsavel === 'Ana' || r.responsavel === 'Esposa') receitaAna += r.total;
    });

    const totalReceitas = receitaGabriel + receitaAna;
    const saldoGeral = totalReceitas - totalGeral.total;
    const saldoGabriel = receitaGabriel - totalGabriel;
    const saldoAna = receitaAna - totalAna;

    // Total por Categoria
    const porCategoria = db.prepare(`
      SELECT categoria, COALESCE(SUM(valor), 0) as total, COUNT(*) as qtd
      FROM gastos
      WHERE strftime('%Y-%m', data) = ?
      GROUP BY categoria
      ORDER BY total DESC
    `).all(mesAtual);

    // Total por Método de Pagamento
    const porMetodo = db.prepare(`
      SELECT metodo, COALESCE(SUM(valor), 0) as total, COUNT(*) as qtd
      FROM gastos
      WHERE strftime('%Y-%m', data) = ?
      GROUP BY metodo
      ORDER BY total DESC
    `).all(mesAtual);

    // Evolução diária para gráficos
    const evolucaoDiaria = db.prepare(`
      SELECT strftime('%d', data) as dia, COALESCE(SUM(valor), 0) as total
      FROM gastos
      WHERE strftime('%Y-%m', data) = ?
      GROUP BY strftime('%d', data)
      ORDER BY dia ASC
    `).all(mesAtual);

    return res.json({
      success: true,
      mes: mesAtual,
      totalGeral: totalGeral.total,
      qtdTotal: totalGeral.qtd,
      totalGabriel,
      totalAna,
      totalEsposa: totalAna, // alias compatível
      pctGabriel: totalGeral.total > 0 ? Math.round((totalGabriel / totalGeral.total) * 100) : 0,
      pctAna: totalGeral.total > 0 ? Math.round((totalAna / totalGeral.total) * 100) : 0,
      pctEsposa: totalGeral.total > 0 ? Math.round((totalAna / totalGeral.total) * 100) : 0,
      // Salários e Saldo
      totalReceitas,
      receitaGabriel,
      receitaAna,
      saldoGeral,
      saldoGabriel,
      saldoAna,
      taxaPoupanca: totalReceitas > 0 ? Math.max(0, Math.round((saldoGeral / totalReceitas) * 100)) : 0,
      porCategoria,
      porMetodo,
      evolucaoDiaria
    });
  } catch (err) {
    console.error('[RESUMO ERRO]', err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * 4.1. CONSULTORIA FINANCEIRA IA (NVIDIA NEMOTRON 3 ULTRA 550B)
 */
app.get('/api/ia/consultoria', async (req, res) => {
  try {
    const mesAtual = req.query.mes || obterMesBrasilia();

    const totalGeral = db.prepare(`
      SELECT COALESCE(SUM(valor), 0) as total, COUNT(*) as qtd
      FROM gastos
      WHERE strftime('%Y-%m', data) = ?
    `).get(mesAtual);

    if (!totalGeral || totalGeral.total === 0) {
      return res.json({
        success: true,
        analise: 'Ainda não há gastos registrados neste mês para a IA analisar. Comece escaneando os primeiros comprovantes!'
      });
    }

    const porResponsavel = db.prepare(`
      SELECT responsavel, COALESCE(SUM(valor), 0) as total, COUNT(*) as qtd
      FROM gastos
      WHERE strftime('%Y-%m', data) = ?
      GROUP BY responsavel
    `).all(mesAtual);

    let totalGabriel = 0;
    let totalAna = 0;
    porResponsavel.forEach(r => {
      if (r.responsavel === 'Gabriel') totalGabriel += r.total;
      if (r.responsavel === 'Ana' || r.responsavel === 'Esposa') totalAna += r.total;
    });

    // Buscar receitas do mês para dar contexto à consultoria
    const receitasMes = db.prepare(`
      SELECT responsavel, COALESCE(SUM(valor), 0) as total
      FROM receitas
      WHERE strftime('%Y-%m', data) = ?
      GROUP BY responsavel
    `).all(mesAtual);

    let receitaGabriel = 0;
    let receitaAna = 0;
    receitasMes.forEach(r => {
      if (r.responsavel === 'Gabriel') receitaGabriel += r.total;
      if (r.responsavel === 'Ana' || r.responsavel === 'Esposa') receitaAna += r.total;
    });

    const porCategoria = db.prepare(`
      SELECT categoria, COALESCE(SUM(valor), 0) as total, COUNT(*) as qtd
      FROM gastos
      WHERE strftime('%Y-%m', data) = ?
      GROUP BY categoria
      ORDER BY total DESC
    `).all(mesAtual);

    const porMetodo = db.prepare(`
      SELECT metodo, COALESCE(SUM(valor), 0) as total, COUNT(*) as qtd
      FROM gastos
      WHERE strftime('%Y-%m', data) = ?
      GROUP BY metodo
      ORDER BY total DESC
    `).all(mesAtual);

    const ultimosGastos = db.prepare(`
      SELECT data, valor, estabelecimento, categoria, metodo, responsavel
      FROM gastos
      WHERE strftime('%Y-%m', data) = ?
      ORDER BY data DESC
      LIMIT 20
    `).all(mesAtual);

    const totalReceitas = receitaGabriel + receitaAna;

    const dadosResumo = {
      mes: mesAtual,
      totalGeral: totalGeral.total,
      qtdTotal: totalGeral.qtd,
      totalGabriel,
      totalAna,
      totalEsposa: totalAna,
      pctGabriel: totalGeral.total > 0 ? Math.round((totalGabriel / totalGeral.total) * 100) : 0,
      pctAna: totalGeral.total > 0 ? Math.round((totalAna / totalGeral.total) * 100) : 0,
      pctEsposa: totalGeral.total > 0 ? Math.round((totalAna / totalGeral.total) * 100) : 0,
      totalReceitas,
      receitaGabriel,
      receitaAna,
      saldoGeral: totalReceitas - totalGeral.total,
      porCategoria,
      porMetodo
    };

    const analise = await gerarConsultoriaFinanceiraNvidia(dadosResumo, ultimosGastos);
    return res.json({ success: true, analise });
  } catch (err) {
    console.error('[CONSULTORIA ERRO]', err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * 5. EXCLUIR GASTO
 */
app.delete('/api/gastos/:id', (req, res) => {
  try {
    const id = req.params.id;
    const gasto = db.prepare('SELECT comprovante_nome FROM gastos WHERE id = ?').get(id);

    if (gasto && gasto.comprovante_nome) {
      const fileP = path.join(UPLOAD_DIR, gasto.comprovante_nome);
      if (fs.existsSync(fileP)) {
        try { fs.unlinkSync(fileP); } catch (_) {}
      }
    }

    db.prepare('DELETE FROM gastos WHERE id = ?').run(id);
    return res.json({ success: true, message: 'Gasto excluído com sucesso.' });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * 6. EXPORTAR CSV
 */
app.get('/api/export', (req, res) => {
  try {
    const mes = req.query.mes || obterMesBrasilia();
    const gastos = db.prepare(`
      SELECT data, valor, estabelecimento, categoria, metodo, responsavel, observacoes
      FROM gastos
      WHERE strftime('%Y-%m', data) = ?
      ORDER BY data ASC
    `).all(mes);

    let csv = '\uFEFFData;Estabelecimento;Valor;Categoria;Forma Pagamento;Responsável;Observações\n';
    gastos.forEach(g => {
      const v = Number(g.valor).toFixed(2).replace('.', ',');
      csv += `"${g.data}";"${g.estabelecimento.replace(/"/g, '""')}";"${v}";"${g.categoria}";"${g.metodo}";"${g.responsavel}";"${(g.observacoes || '').replace(/"/g, '""')}"\n`;
    });

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename=gastos_${mes}.csv`);
    return res.send(csv);
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * 7. QR CODE DINÂMICO PARA CONEXÃO DO WHATSAPP DA CAMPANHA (JK 7077)
 */
app.get('/api/qr-campanha', async (req, res) => {
  try {
    // Primeiro checa o estado de conexão
    const stateResp = await fetch('http://localhost:8080/instance/connectionState/campanha7077', {
      headers: { apikey: process.env.EVOLUTION_API_KEY }
    });
    const stateData = await stateResp.json();
    const estado = stateData?.instance?.state;
    if (estado === 'open') {
      return res.json({ status: 'open', connected: true });
    }

    // Se não estiver open, busca o QR Code atualizado
    const evoResp = await fetch('http://localhost:8080/instance/connect/campanha7077', {
      headers: { apikey: process.env.EVOLUTION_API_KEY }
    });
    const evoData = await evoResp.json();
    return res.json(evoData);
  } catch (err) {
    return res.json({ status: 'connecting', error: err.message });
  }
});

app.post('/api/qr-campanha/restart', async (req, res) => {
  try {
    const restartResp = await fetch('http://localhost:8080/instance/restart/campanha7077', {
      method: 'POST',
      headers: { apikey: process.env.EVOLUTION_API_KEY }
    });
    const data = await restartResp.json();
    return res.json(data);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});


// Iniciar servidor
app.listen(PORT, '0.0.0.0', () => {
  console.log(`=================================================`);
  console.log(`  Finanças IA (Casal) — Servidor Ativo!`);
  console.log(`  Porta: ${PORT}`);
  console.log(`  URL Local: http://localhost:${PORT}`);
  console.log(`=================================================`);
});
