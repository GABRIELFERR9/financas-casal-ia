# financas-casal-ia

App de finanças do casal com scanner de comprovantes por IA de visão, divisão de gastos e consultoria mensal.

App de finanças para um casal: fotografa o comprovante, a IA lê, e o gasto entra classificado e dividido.

## O que faz
- **Scanner de comprovantes com IA de visão** (Llama 3.2 Vision pela API da NVIDIA): extrai valor, loja, data e quem pagou.
- Gastos e receitas com CRUD, resumo do mês e sobra do mês.
- **Modo privacidade**: esconde valores com um toque, para usar em público.
- **Consultoria por IA**: diagnóstico mensal e sugestões de economia.
- Exportação dos dados.
- App Android com Capacitor.

## Stack
Node.js, Express, SQLite (better-sqlite3), multer e IA da NVIDIA (visão + texto), com frontend em JavaScript puro e Capacitor.

## Rodar
```bash
npm install
NVIDIA_API_KEY=... node server.js
```
Os nomes do casal no código são fictícios.

---
Feito por [Gabriel Ferreira](https://github.com/GABRIELFERR9).
