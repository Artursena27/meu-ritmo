/* MCP do Meu Ritmo: deixa o Claude ler e lançar no app (tabela meu_ritmo.tracker).
   Protocolo MCP por HTTP (Streamable HTTP, sem estado), sem dependências.

   Variáveis de ambiente (Vercel > Settings > Environment Variables):
     SUPABASE_URL               https://agdyspfoupflwdesemdl.supabase.co (opcional, já é o padrão)
     SUPABASE_SERVICE_ROLE_KEY  chave secreta (service_role) do projeto. Nunca vai para o navegador.
     MCP_KEY                    senha longa e aleatória que o conector manda na URL (?key=...)
     MCP_USER_ID                id do usuário (auth.users) cujos dados o Claude acessa

   URL do conector: https://<seu-dominio>/api/mcp?key=<MCP_KEY>
*/
const crypto = require("crypto");

const SB_URL = (process.env.SUPABASE_URL || "https://agdyspfoupflwdesemdl.supabase.co").replace(/\/$/, "");
const SB_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const MCP_KEY = process.env.MCP_KEY || "";
const USER_ID = process.env.MCP_USER_ID || "";
const SCHEMA = "meu_ritmo";
const TZ = "America/Recife";
const START = Date.UTC(2026, 10, 9); // segunda 09/11/2026 = semana 1
const VERSOES = ["2025-06-18", "2025-03-26", "2024-11-05"];

/* ---------- Supabase (PostgREST) ---------- */
async function sb(method, query, body, extra = {}) {
  const headers = {
    apikey: SB_KEY,
    Authorization: "Bearer " + SB_KEY,
    "Accept-Profile": SCHEMA,
    "Content-Profile": SCHEMA,
    "Content-Type": "application/json",
    Prefer: "return=representation",
    ...extra,
  };
  const r = await fetch(`${SB_URL}/rest/v1/tracker?${query}`, { method, headers, body: body ? JSON.stringify(body) : undefined });
  const txt = await r.text();
  let data = null;
  try { data = txt ? JSON.parse(txt) : null; } catch { data = txt; }
  return { status: r.status, ok: r.ok, data };
}
const enc = encodeURIComponent;
const doUsuario = () => `user_id=eq.${enc(USER_ID)}`;
const ID_OK = /^[A-Za-z0-9_\-.:]{1,80}$/;

async function lerDoc(id) {
  const r = await sb("GET", `${doUsuario()}&id=eq.${enc(id)}&select=id,data,updated_at`);
  if (!r.ok) throw new Error("Supabase: " + JSON.stringify(r.data));
  const row = (r.data || [])[0];
  return row ? { id: row.id, existe: true, versao: row.updated_at, data: row.data } : { id, existe: false, versao: null, data: null };
}

async function gravar(id, data, versao) {
  const agora = new Date().toISOString();
  if (versao) {
    const r = await sb("PATCH", `${doUsuario()}&id=eq.${enc(id)}&updated_at=eq.${enc(versao)}`, { data, updated_at: agora });
    if (!r.ok) throw new Error("Supabase: " + JSON.stringify(r.data));
    if (!r.data || !r.data.length) {
      const atual = await lerDoc(id);
      return { conflito: true, mensagem: "O documento mudou desde a leitura (ou não existe). Leia de novo e refaça.", atual };
    }
    return { ok: true, id, versao: r.data[0].updated_at, data: r.data[0].data };
  }
  const r = await sb("POST", "select=id,data,updated_at", { user_id: USER_ID, id, data, updated_at: agora });
  if (r.status === 409) {
    const atual = await lerDoc(id);
    return { conflito: true, mensagem: "O documento já existe. Passe a versao lida para alterá-lo.", atual };
  }
  if (!r.ok) throw new Error("Supabase: " + JSON.stringify(r.data));
  return { ok: true, id, versao: r.data[0].updated_at, data: r.data[0].data };
}

/* ---------- datas ---------- */
function hojeRecife() {
  const p = Object.fromEntries(new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" })
    .formatToParts(new Date()).map(x => [x.type, x.value]));
  return { data: `${p.year}-${p.month}-${p.day}`, hora: `${p.hour}:${p.minute}` };
}
function docDoDia(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || "");
  if (!m) throw new Error("Data inválida, use AAAA-MM-DD.");
  const dias = Math.round((Date.UTC(+m[1], +m[2] - 1, +m[3]) - START) / 864e5);
  if (dias < 0) throw new Error("O app começa em 09/11/2026.");
  const nomes = ["segunda", "terça", "quarta", "quinta", "sexta", "sábado", "domingo"];
  return { doc_id: `w${Math.floor(dias / 7) + 1}d${dias % 7}`, dia_semana: nomes[dias % 7] };
}
function dataDoDoc(id) {
  const m = /^w(\d+)d(\d)$/.exec(id);
  if (!m) return null;
  return new Date(START + ((+m[1] - 1) * 7 + +m[2]) * 864e5).toISOString().slice(0, 10);
}

/* ---------- ferramentas ---------- */
const TOOLS = [
  {
    name: "agora",
    description: "Data e hora atuais em Recife, com o doc_id do dia no Meu Ritmo (antes das 04:00 ainda conta como o dia anterior).",
    inputSchema: { type: "object", properties: {} },
    annotations: { readOnlyHint: true },
  },
  {
    name: "ler_dia",
    description: "Lê o registro de um dia (comidas, treino, cardio, extras, sono, água). Passe a data (AAAA-MM-DD) ou o doc_id (ex.: w2d1). Devolve a versao para gravar depois.",
    inputSchema: { type: "object", properties: { data: { type: "string", description: "AAAA-MM-DD" }, doc_id: { type: "string" } } },
    annotations: { readOnlyHint: true },
  },
  {
    name: "ler_documentos",
    description: "Lê documentos pelo id: settings, perfil, rotina, treino, treino_hoje, treino_extra, treino_historico, base, avisos, inbox, ag_..., wNdD. Sem ids, lista só os ids e versões de todos.",
    inputSchema: { type: "object", properties: { ids: { type: "array", items: { type: "string" } } } },
    annotations: { readOnlyHint: true },
  },
  {
    name: "atualizar_campos",
    description: "Junta campos no documento (merge de primeiro nível). Campo com valor null é apagado. Arrays são substituídos inteiros, então mande o array completo. Para documento que já existe, passe a versao lida; sem versao, só cria documento novo.",
    inputSchema: {
      type: "object",
      required: ["doc_id", "campos"],
      properties: { doc_id: { type: "string" }, campos: { type: "object" }, versao: { type: "string" } },
    },
  },
  {
    name: "apagar_documento",
    description: "Apaga um documento inteiro (ex.: um dia). Não tem volta: só use depois de o usuário confirmar no chat.",
    inputSchema: {
      type: "object",
      required: ["doc_id", "versao", "confirmado"],
      properties: { doc_id: { type: "string" }, versao: { type: "string" }, confirmado: { type: "boolean", description: "true só se o usuário confirmou" } },
    },
    annotations: { destructiveHint: true },
  },
];

async function chamar(nome, a = {}) {
  if (nome === "agora") {
    const h = hojeRecife();
    let dataDia = h.data;
    if (h.hora < "04:00") dataDia = new Date(Date.parse(h.data + "T12:00:00Z") - 864e5).toISOString().slice(0, 10);
    return { data: h.data, hora: h.hora, fuso: TZ, dia_do_app: dataDia, ...docDoDia(dataDia) };
  }
  if (nome === "ler_dia") {
    let id = a.doc_id, info = {};
    if (!id) { info = docDoDia(a.data); id = info.doc_id; }
    if (!/^w\d+d\d$/.test(id)) throw new Error("doc_id de dia inválido.");
    return { ...(await lerDoc(id)), data_dia: dataDoDoc(id), ...info };
  }
  if (nome === "ler_documentos") {
    if (!a.ids || !a.ids.length) {
      const r = await sb("GET", `${doUsuario()}&select=id,updated_at&order=id`);
      if (!r.ok) throw new Error("Supabase: " + JSON.stringify(r.data));
      return { documentos: r.data.map(x => ({ id: x.id, versao: x.updated_at, data_dia: dataDoDoc(x.id) })) };
    }
    if (a.ids.length > 40 || !a.ids.every(i => ID_OK.test(i))) throw new Error("ids inválidos (máx. 40).");
    const lista = a.ids.map(i => `"${i}"`).join(",");
    const r = await sb("GET", `${doUsuario()}&id=in.(${enc(lista)})&select=id,data,updated_at`);
    if (!r.ok) throw new Error("Supabase: " + JSON.stringify(r.data));
    const achados = Object.fromEntries(r.data.map(x => [x.id, x]));
    return { documentos: a.ids.map(i => achados[i] ? { id: i, existe: true, versao: achados[i].updated_at, data: achados[i].data } : { id: i, existe: false }) };
  }
  if (nome === "atualizar_campos") {
    if (!ID_OK.test(a.doc_id || "")) throw new Error("doc_id inválido.");
    if (!a.campos || typeof a.campos !== "object" || Array.isArray(a.campos)) throw new Error("campos deve ser um objeto.");
    let base = {};
    if (a.versao) {
      const atual = await lerDoc(a.doc_id);
      if (!atual.existe || atual.versao !== a.versao) return { conflito: true, mensagem: "O documento mudou desde a leitura (ou não existe). Leia de novo e refaça.", atual };
      base = atual.data || {};
    }
    const novo = { ...base };
    for (const [k, v] of Object.entries(a.campos)) { if (v === null) delete novo[k]; else novo[k] = v; }
    return gravar(a.doc_id, novo, a.versao);
  }
  if (nome === "apagar_documento") {
    if (a.confirmado !== true) throw new Error("Confirme com o usuário antes de apagar.");
    if (!ID_OK.test(a.doc_id || "")) throw new Error("doc_id inválido.");
    const r = await sb("DELETE", `${doUsuario()}&id=eq.${enc(a.doc_id)}&updated_at=eq.${enc(a.versao)}`);
    if (!r.ok) throw new Error("Supabase: " + JSON.stringify(r.data));
    if (!r.data || !r.data.length) return { conflito: true, mensagem: "Nada apagado: o documento mudou ou não existe.", atual: await lerDoc(a.doc_id) };
    return { ok: true, apagado: a.doc_id };
  }
  throw new Error("Ferramenta desconhecida: " + nome);
}

/* ---------- JSON-RPC / MCP ---------- */
async function responder(msg) {
  const { id, method, params = {} } = msg || {};
  const ok = result => ({ jsonrpc: "2.0", id, result });
  const erro = (code, message) => ({ jsonrpc: "2.0", id: id ?? null, error: { code, message } });
  if (!msg || msg.jsonrpc !== "2.0" || typeof method !== "string") return erro(-32600, "Requisição inválida");
  if (id === undefined) return null; // notificação
  try {
    if (method === "initialize") {
      const v = VERSOES.includes(params.protocolVersion) ? params.protocolVersion : VERSOES[0];
      return ok({
        protocolVersion: v,
        capabilities: { tools: {} },
        serverInfo: { name: "meu-ritmo", version: "1.0.0" },
        instructions: "Dados do app Meu Ritmo do Artur (alimentação, treino, sono, água, rotina). Leia antes de gravar e passe sempre a versao lida.",
      });
    }
    if (method === "ping") return ok({});
    if (method === "tools/list") return ok({ tools: TOOLS });
    if (method === "tools/call") {
      try {
        const res = await chamar(params.name, params.arguments || {});
        return ok({ content: [{ type: "text", text: JSON.stringify(res) }], isError: !!res?.conflito });
      } catch (e) {
        return ok({ content: [{ type: "text", text: "Erro: " + e.message }], isError: true });
      }
    }
    return erro(-32601, "Método não encontrado: " + method);
  } catch (e) {
    return erro(-32603, e.message);
  }
}

function chaveOk(req) {
  const url = new URL(req.url, "http://x");
  const dada = url.searchParams.get("key") || (req.headers.authorization || "").replace(/^Bearer\s+/i, "");
  if (!MCP_KEY || !dada) return false;
  const a = crypto.createHash("sha256").update(dada).digest();
  const b = crypto.createHash("sha256").update(MCP_KEY).digest();
  return crypto.timingSafeEqual(a, b);
}

module.exports = async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  if (!SB_KEY || !MCP_KEY || !USER_ID) return res.status(500).json({ error: "Faltam variáveis de ambiente do MCP." });
  if (!chaveOk(req)) return res.status(401).json({ error: "Chave inválida." });
  if (req.method !== "POST") { res.setHeader("Allow", "POST"); return res.status(405).end(); }

  let body = req.body;
  if (typeof body === "string") { try { body = JSON.parse(body); } catch { return res.status(400).json({ jsonrpc: "2.0", id: null, error: { code: -32700, message: "JSON inválido" } }); } }

  if (Array.isArray(body)) {
    const outs = (await Promise.all(body.map(responder))).filter(Boolean);
    return outs.length ? res.status(200).json(outs) : res.status(202).end();
  }
  const out = await responder(body);
  return out ? res.status(200).json(out) : res.status(202).end();
};
