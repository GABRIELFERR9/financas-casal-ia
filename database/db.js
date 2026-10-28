'use strict';

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DATA_DIR = path.join(__dirname, '..', 'data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const dbPath = path.join(DATA_DIR, 'financas.db');
const db = new Database(dbPath);

// Otimizações de performance SQLite
db.pragma('journal_mode = WAL');
db.pragma('synchronous = NORMAL');

// Inicialização das tabelas
db.exec(`
  CREATE TABLE IF NOT EXISTS gastos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    data TEXT NOT NULL,
    valor REAL NOT NULL,
    estabelecimento TEXT NOT NULL,
    categoria TEXT NOT NULL,
    metodo TEXT NOT NULL DEFAULT 'Pix',
    responsavel TEXT NOT NULL DEFAULT 'Gabriel',
    comprovante_nome TEXT,
    observacoes TEXT,
    itens_json TEXT,
    criado_em TEXT DEFAULT (datetime('now', 'localtime'))
  );

  CREATE TABLE IF NOT EXISTS receitas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    data TEXT NOT NULL,
    valor REAL NOT NULL,
    descricao TEXT NOT NULL,
    responsavel TEXT NOT NULL DEFAULT 'Gabriel',
    categoria TEXT NOT NULL DEFAULT 'Salário',
    criado_em TEXT DEFAULT (datetime('now', 'localtime'))
  );

  CREATE INDEX IF NOT EXISTS idx_gastos_data ON gastos(data);
  CREATE INDEX IF NOT EXISTS idx_gastos_resp ON gastos(responsavel);
  CREATE INDEX IF NOT EXISTS idx_gastos_cat ON gastos(categoria);
  CREATE INDEX IF NOT EXISTS idx_receitas_data ON receitas(data);
  CREATE INDEX IF NOT EXISTS idx_receitas_resp ON receitas(responsavel);
`);

// Migração retrocompatível: Atualiza 'Esposa' para 'Ana' em gastos existentes
try {
  db.prepare("UPDATE gastos SET responsavel = 'Ana' WHERE responsavel = 'Esposa'").run();
} catch (_) {}

module.exports = db;
