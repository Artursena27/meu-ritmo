/* Gerado a partir de agente-whatsapp/lib/treino-gen.js: mesma lógica no app e no agente. */
(function(){
/**
 * Montador de treino do Meu Ritmo. Puro: sem banco, sem rede, sem IA.
 *
 * O MESMO arquivo roda no agente (lib/treino-gen.js) e no app
 * (meu-ritmo/treino-gen.js, que só troca a última linha de export por
 * window.TreinoGen). Se mudar um, copie para o outro.
 *
 * Os nomes em `a` são as chaves do banco de exercícios do mapa muscular
 * (mapa.html): é o que faz o "Ver execução animada" funcionar.
 *
 * montarTreino({ modalidade, grupos, esporte, min, nivel, idade, objetivo, local })
 *   modalidade: 'musculacao' | 'resistencia' | 'aerobico'
 *   grupos: ['Peito','Costas','Ombro','Bíceps','Tríceps','Pernas','Glúteo','Abdômen'] (vazio = corpo todo)
 *   esporte (aeróbico): 'corrida' | 'caminhada' | 'natacao' | 'bike' | 'eliptico' | 'escada' | 'corda'
 *   nivel: 'iniciante' (< 6 meses) | 'intermediario' (6 meses a 2 anos) | 'avancado' (> 2 anos)
 *   objetivo: 'hipertrofia' | 'emagrecer' | 'forca' | 'resistencia' | 'saude'
 *   local: 'academia' | 'casa'
 * Devolve um dia no formato da aba Treino: { nome, tipo, grupos, obs, ex:[{n,a,s,r,c,d,m,o}], ... }.
 */

const GRUPOS_TREINO = ['Peito', 'Costas', 'Ombro', 'Bíceps', 'Tríceps', 'Pernas', 'Glúteo', 'Abdômen'];
const MODALIDADES = ['musculacao', 'resistencia', 'aerobico'];
const ESPORTES = ['corrida', 'caminhada', 'natacao', 'bike', 'eliptico', 'escada', 'corda'];
const NIVEIS = ['iniciante', 'intermediario', 'avancado'];
const OBJETIVOS = ['hipertrofia', 'emagrecer', 'forca', 'resistencia', 'saude'];
const NOME_ESPORTE = { corrida: 'Corrida', caminhada: 'Caminhada', natacao: 'Natação', bike: 'Bike', eliptico: 'Elíptico', escada: 'Escada', corda: 'Pular corda' };
const NOME_NIVEL = { iniciante: 'Iniciante', intermediario: 'Intermediário', avancado: 'Avançado' };
const NOME_OBJ = { hipertrofia: 'Hipertrofia', emagrecer: 'Emagrecimento', forca: 'Força', resistencia: 'Resistência', saude: 'Saúde e condicionamento' };
// Para lançar no Registro: tipos de cardio que o app conhece.
const CARDIO_DO_ESPORTE = { corrida: 'esteira', caminhada: 'caminhada', natacao: 'natacao', bike: 'bike', eliptico: 'eliptico', escada: 'escada', corda: 'corda' };

/* Cada item: 'Nome' (nome = chave do mapa) ou ['Nome mostrado', 'chave do mapa']. */
const BANCO = {
  academia: {
    'Peito': ['Supino reto', 'Supino inclinado', 'Crucifixo', 'Flexão de braço'],
    'Costas': ['Puxada frontal', 'Remada na máquina', 'Puxada neutra no triângulo', 'Remada curvada', 'Barra fixa', 'Hiperextensão'],
    'Ombro': ['Desenvolvimento', 'Elevação lateral', 'Crucifixo inverso', 'Face pull', 'Elevação frontal'],
    'Bíceps': ['Rosca direta', 'Rosca martelo', 'Rosca Scott'],
    'Tríceps': ['Tríceps pulley', 'Tríceps testa', 'Supino fechado', 'Mergulho'],
    'Pernas': ['Agachamento livre', 'Leg press', 'Cadeira extensora', 'Mesa flexora', 'Stiff', 'Afundo búlgaro', 'Gêmeos em pé', 'Gêmeos sentado'],
    'Glúteo': ['Hip thrust', 'Agachamento sumô', 'Abdução na polia', 'Afundo búlgaro', 'Stiff'],
    'Abdômen': ['Prancha', 'Abdominal supra', 'Elevação de pernas', 'Abdominal na polia', 'Prancha lateral', 'Russian twist']
  },
  casa: {
    'Peito': ['Flexão de braço', ['Flexão inclinada (mãos no sofá)', 'Flexão de braço'], 'Mergulho'],
    'Costas': ['Superman', ['Remada curvada com mochila', 'Remada curvada'], 'Good morning', ['Barra fixa (se tiver)', 'Barra fixa']],
    'Ombro': [['Flexão pike', 'Desenvolvimento'], ['Elevação lateral com garrafas', 'Elevação lateral'], ['Crucifixo inverso com garrafas', 'Crucifixo inverso']],
    'Bíceps': [['Rosca com mochila', 'Rosca direta'], ['Rosca martelo com garrafas', 'Rosca martelo']],
    'Tríceps': ['Mergulho', ['Flexão fechada', 'Supino fechado'], ['Tríceps francês com garrafa', 'Tríceps testa']],
    'Pernas': ['Agachamento livre', 'Afundo búlgaro', 'Afundo lateral', 'Agachamento sumô', 'Nordic curl', 'Gêmeos em pé'],
    'Glúteo': ['Hip thrust', 'Agachamento sumô', 'Afundo búlgaro', ['Abdução deitada', 'Abdução na polia']],
    'Abdômen': ['Prancha', 'Abdominal supra', 'Elevação de pernas', 'Abdominal bicicleta', 'Prancha lateral', 'Russian twist']
  }
};

const COMPOSTOS = new Set(['Supino reto', 'Supino inclinado', 'Flexão de braço', 'Puxada frontal', 'Remada curvada', 'Remada na máquina',
  'Puxada neutra no triângulo', 'Barra fixa', 'Desenvolvimento', 'Supino fechado', 'Mergulho', 'Agachamento livre', 'Leg press',
  'Stiff', 'Afundo búlgaro', 'Hip thrust', 'Agachamento sumô', 'Good morning', 'Afundo lateral']);
const POR_TEMPO = new Set(['Prancha', 'Prancha lateral', 'Copenhagen plank']);
// Exigem técnica ou força de base: ficam para depois no iniciante.
const DIFICEIS = new Set(['Barra fixa', 'Remada curvada', 'Nordic curl', 'Mergulho', 'Good morning', 'Tríceps testa']);
// Mais carga na coluna, no ombro ou no equilíbrio: ficam para o fim da fila a partir dos 55.
const CUIDADO_IDADE = new Set(['Remada curvada', 'Good morning', 'Nordic curl', 'Mergulho', 'Afundo búlgaro', 'Barra fixa', 'Agachamento livre']);
const GRANDES = new Set(['Peito', 'Costas', 'Pernas', 'Glúteo']);
const SUPERIORES = new Set(['Peito', 'Costas', 'Ombro', 'Bíceps', 'Tríceps']);

const DICAS = {
  'Supino reto': 'Escápulas presas no banco, pés firmes no chão; desça a barra até a linha do peito controlando.',
  'Supino inclinado': 'Banco a 30–45°. Desça até o alto do peito sem tirar as escápulas do banco.',
  'Crucifixo': 'Cotovelos levemente dobrados o tempo todo; abra até sentir o peito alongar, sem forçar o ombro.',
  'Flexão de braço': 'Corpo em prancha (abdômen e glúteo contraídos); cotovelos a uns 45° do tronco.',
  'Puxada frontal': 'Peito estufado; puxe com os cotovelos em direção ao quadril, sem balançar o tronco.',
  'Remada na máquina': 'Junte as escápulas no fim da puxada e volte devagar alongando as costas.',
  'Remada curvada': 'Coluna neutra e joelhos levemente dobrados; puxe a barra até o umbigo.',
  'Desenvolvimento': 'Abdômen firme e sem arquear a lombar; empurre até quase estender os cotovelos.',
  'Elevação lateral': 'Suba até a altura dos ombros, cotovelos à frente das mãos, sem embalo.',
  'Agachamento livre': 'Pés na largura dos ombros, joelhos na direção dos pés; desça com a coluna neutra até onde mantiver a postura.',
  'Leg press': 'Lombar colada no encosto; não trave os joelhos no alto.',
  'Stiff': 'Joelhos semiflexionados; leve o quadril para trás com a coluna reta até sentir o posterior alongar.',
  'Hip thrust': 'Queixo para dentro; suba contraindo o glúteo e segure 1 s no alto sem arquear a lombar.',
  'Afundo búlgaro': 'Pé de trás apoiado no banco; desça reto, joelho da frente alinhado com o pé.',
  'Prancha': 'Cotovelos sob os ombros, glúteo e abdômen contraídos; não deixe o quadril cair.',
  'Rosca direta': 'Cotovelos colados ao corpo; desça devagar até estender o braço.',
  'Tríceps pulley': 'Cotovelos parados ao lado do corpo; estenda até o fim e volte controlando.'
};

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const item = e => Array.isArray(e) ? { n: e[0], a: e[1] } : { n: e, a: e };

function nivelDe(v) {
  const s = String(v || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  if (NIVEIS.includes(s)) return s;
  if (/avanc/.test(s)) return 'avancado';
  if (/inter/.test(s)) return 'intermediario';
  return 'iniciante';
}

/** Meses de academia -> nível. */
function nivelPorMeses(meses) {
  const m = Number(meses);
  if (!Number.isFinite(m)) return null;
  return m < 6 ? 'iniciante' : m < 24 ? 'intermediario' : 'avancado';
}

function tipoDosGrupos(gs) {
  if (!gs.length) return 'Full';
  const sup = gs.filter(g => SUPERIORES.has(g)).length, inf = gs.filter(g => g === 'Pernas' || g === 'Glúteo').length;
  return sup && inf ? 'Full' : inf ? 'MMII' : sup ? 'MMSS' : 'Core';
}

/** Escolhe `n` exercícios para os grupos, sem repetir, respeitando nível e idade. */
function escolher(grupos, n, { local, nivel, idade }) {
  const banco = BANCO[local] || BANCO.academia;
  const filas = {};
  for (const g of grupos) {
    let lista = (banco[g] || []).map(item);
    // Joga para o fim (não tira): se o grupo só tiver esses, ainda sai treino.
    const peso = e => (nivel === 'iniciante' && DIFICEIS.has(e.a) ? 2 : 0) + (idade >= 55 && CUIDADO_IDADE.has(e.a) ? 1 : 0);
    lista = lista.map((e, i) => ({ e, i })).sort((x, y) => peso(x.e) - peso(y.e) || x.i - y.i).map(x => x.e);
    filas[g] = lista;
  }
  // Cotas: todo grupo ganha 1; o resto vai primeiro para os grupos grandes.
  const cota = Object.fromEntries(grupos.map(g => [g, 1]));
  let resto = Math.max(0, n - grupos.length);
  const ordem = [...grupos].sort((a, b) => (GRANDES.has(b) ? 1 : 0) - (GRANDES.has(a) ? 1 : 0));
  // Ao lado de um grupo grande, um pequeno (bíceps, tríceps...) leva no máximo 2 exercícios.
  const teto = g => (!GRANDES.has(g) && grupos.some(x => GRANDES.has(x)) ? 2 : filas[g].length);
  for (let volta = 0; resto > 0 && volta < 6; volta++) {
    for (const g of ordem) {
      if (resto <= 0) break;
      if (volta > 0 && !GRANDES.has(g) && volta % 2) continue; // pequenos crescem na metade do ritmo
      if (cota[g] < Math.min(teto(g), filas[g].length)) { cota[g]++; resto--; }
    }
  }
  const usados = new Set(), out = [];
  for (const g of ordem) {
    let k = 0;
    for (const e of filas[g]) {
      if (k >= cota[g]) break;
      if (usados.has(e.n)) continue;
      usados.add(e.n); out.push({ ...e, g }); k++;
    }
  }
  // Compostos primeiro (dos grupos grandes), isolados depois, abdômen no fim.
  const rank = e => (e.g === 'Abdômen' ? 3 : COMPOSTOS.has(e.a) ? (GRANDES.has(e.g) ? 0 : 1) : 2);
  return out.map((e, i) => ({ e, i })).sort((x, y) => rank(x.e) - rank(y.e) || x.i - y.i).map(x => x.e);
}

function aquecimento(idade, modalidade) {
  const longo = idade >= 40;
  return {
    n: 'Aquecimento', a: null, s: 1, r: longo ? '8–10 min' : '5–8 min', c: 'Leve', d: '—', m: null,
    o: modalidade === 'aerobico' ? null
      : `${longo ? '8 a 10' : '5 a 8'} min de bike ou esteira leve e mobilidade das articulações que vai usar. No 1º exercício, faça 1 ou 2 séries leves de aproximação.`
  };
}

function musculacao(p) {
  const { grupos, min, nivel, idade, objetivo, local } = p;
  const gs = grupos.length ? grupos : ['Pernas', 'Peito', 'Costas', 'Ombro', 'Glúteo', 'Abdômen'];
  const n = clamp(Math.round((min - 8) / 8.5), 3, 9);
  const lista = escolher(gs, n, p);
  const jovem = idade && idade < 16, maduro = idade >= 50;
  const forcaOk = objetivo === 'forca' && nivel !== 'iniciante' && !jovem && !(idade >= 60);
  const REPS = { hipertrofia: '8–12', emagrecer: '12–15', resistencia: '15–20', saude: '10–15', forca: '8–10' };
  const DESC = { hipertrofia: '60–90s', emagrecer: '45–60s', resistencia: '30–45s', saude: '60s', forca: '90s' };
  const ex = lista.map((e, i) => {
    const comp = COMPOSTOS.has(e.a);
    let s = nivel === 'iniciante' ? 3 : nivel === 'avancado' ? 4 : comp ? 4 : 3;
    if (maduro) s = Math.min(s, 3);
    if (min < 40 && !comp) s = Math.min(s, 2 + (nivel === 'avancado' ? 1 : 0));
    let r = REPS[objetivo] || REPS.hipertrofia, d = DESC[objetivo] || DESC.hipertrofia;
    if (forcaOk && comp) { r = '4–6'; d = '2–3 min'; }
    if (POR_TEMPO.has(e.a)) r = nivel === 'iniciante' ? '20–30s' : '30–45s';
    const peso = local === 'casa' ? (/garrafa|mochila/i.test(e.n) ? 'Garrafas ou mochila com peso' : 'Peso do corpo')
      : POR_TEMPO.has(e.a) ? 'Corporal'
      : nivel === 'iniciante' || jovem ? 'Leve a moderada: técnica primeiro'
      : forcaOk && comp ? 'Pesada: 1–2 repetições sobrando'
      : 'Termine com 1–2 repetições sobrando';
    let m = null;
    if (nivel === 'avancado' && objetivo === 'hipertrofia' && !comp && e.g !== 'Abdômen' && i === lista.length - 2) m = 'Drop-set na última série';
    if (nivel !== 'iniciante' && objetivo === 'emagrecer' && i >= lista.length - 2 && lista.length >= 5) m = 'Bi-set (sem descanso entre os dois)';
    return { n: e.n, a: e.a, s, r, c: peso, d, m, o: DICAS[e.a] || null };
  });
  const nome = grupos.length ? grupos.join(' + ') : 'Corpo inteiro';
  const obs = [
    nivel === 'iniciante' ? 'Nas primeiras semanas, priorize aprender o movimento; aumente a carga só quando todas as séries saírem com boa postura.' : null,
    forcaOk ? 'Nos compostos, descanse o tempo todo indicado: é o que deixa repetir a força.' : null,
    maduro ? 'Aumente a carga aos poucos (5 a 10% por vez) e não trave articulações. Dor articular é sinal para reduzir.' : null,
    jovem ? 'Na adolescência, foque em técnica e repetições moderadas; evite cargas máximas.' : null
  ].filter(Boolean).join(' ') || null;
  return { nome, tipo: tipoDosGrupos(gs), grupos: grupos.length ? grupos : gs, obs, ex: [aquecimento(idade, 'musculacao'), ...ex] };
}

function resistencia(p) {
  const { grupos, min, nivel, idade, local } = p;
  let voltas = nivel === 'iniciante' ? 2 : nivel === 'avancado' ? 4 : 3;
  if (idade >= 50) voltas = Math.min(voltas, 3);
  const acelerador = nivel !== 'iniciante' && !(idade >= 60);
  // Cada exercício leva ~1,3 min com a troca; o aquecimento e as pausas entre voltas ficam nos 8 min.
  const n = clamp(Math.round((min - 8) / (voltas * 1.3)) - (acelerador ? 1 : 0), 4, 10);
  const gs = grupos.length ? grupos : ['Pernas', 'Peito', 'Costas', 'Glúteo', 'Ombro', 'Abdômen', 'Tríceps', 'Bíceps'];
  const lista = escolher(gs, n, { ...p, local });
  const tempo = nivel === 'avancado' ? '45s' : nivel === 'intermediario' ? '40s' : '30s';
  const ex = lista.map(e => ({
    n: e.n, a: e.a, s: voltas, r: POR_TEMPO.has(e.a) ? tempo : '15–20',
    c: POR_TEMPO.has(e.a) ? 'Corporal' : local === 'casa' ? 'Peso do corpo' : 'Leve: termine a série sem falhar',
    d: '15–20s para o próximo', m: 'Circuito', o: DICAS[e.a] || null
  }));
  // Um "acelerador" cardíaco no meio do circuito para quem já tem base.
  if (acelerador) ex.splice(Math.ceil(ex.length / 2), 0, { n: 'Pular corda', a: 'Pular corda', s: voltas, r: tempo, c: 'Ritmo moderado', d: '15–20s para o próximo', m: 'Circuito', o: 'Saltos baixos, na ponta dos pés. Sem corda, faça polichinelos.' });
  return {
    nome: `Resistência em circuito · ${grupos.length ? grupos.join(' + ') : 'corpo inteiro'}`, tipo: 'Circuito', grupos: gs,
    obs: `Faça os exercícios em sequência, um atrás do outro. Ao fim de cada volta, descanse ${nivel === 'iniciante' || idade >= 50 ? '2 min' : '1 a 1,5 min'}. São ${voltas} voltas. O objetivo é manter o ritmo do começo ao fim, não a carga.`,
    ex: [aquecimento(idade, 'resistencia'), ...ex]
  };
}

/* ---------- aeróbico ---------- */

const ZONA = {
  leve: 'Leve: dá para conversar (esforço 4–5 de 10)',
  moderado: 'Moderado: frases curtas (esforço 6–7)',
  forte: 'Forte: só palavras soltas (esforço 8–9)'
};
const blocoA = (n, s, r, c, d, o = null, a = null) => ({ n, a, s, r, c, d, m: null, o });

function aerobico(p) {
  const { esporte, nivel, idade } = p;
  const maduro = idade >= 50;
  const min = p.min;
  const main = Math.max(6, min - 10);
  const ex = [];
  let estilo = '', obs = null;
  const add = (...a) => ex.push(blocoA(...a));

  if (esporte === 'natacao') {
    const desc = maduro ? '45s' : '30s';
    if (nivel === 'iniciante') {
      add('Aquecimento: nado livre leve', 4, '25 m', ZONA.leve, desc, 'Qualquer estilo, sem pressa. Pare na borda quando precisar.');
      add('Pernada com prancha', 4, '25 m', ZONA.moderado, desc, 'Pernas quase estendidas, chute curto saindo do quadril.');
      add('Crawl com foco na respiração', clamp(Math.floor(main / 2.5), 6, 16), '25 m', ZONA.moderado, maduro ? '45–60s' : '30–45s', 'Solte o ar dentro da água e respire de lado a cada 2 ou 3 braçadas.');
      add('Soltar: costas ou peito', 1, '100 m', ZONA.leve, '—');
      estilo = 'técnica e respiração';
    } else if (nivel === 'intermediario') {
      add('Aquecimento: 100 crawl + 100 costas', 1, '200 m', ZONA.leve, '—');
      add('Educativo: braçada com pull-buoy', 4, '50 m', ZONA.moderado, '20s', 'Alongue bem a braçada e entre com a mão na linha do ombro.');
      add('Série principal: crawl', clamp(Math.floor(main / 3), 4, 10), '100 m', ZONA.moderado, maduro ? '30–40s' : '20–30s', 'Mantenha o mesmo tempo em todas as repetições.');
      add('Soltar', 1, '100 m', ZONA.leve, '—');
      estilo = 'ritmo constante';
    } else {
      add('Aquecimento: livre e costas', 1, '400 m', ZONA.leve, '—');
      add('Série principal: crawl', clamp(Math.floor(main / 3.2), 4, 10), '100 m', ZONA.forte, '15s', 'Tempo alvo: o seu ritmo de prova de 400 m.');
      add('Tiros', 8, '50 m', ZONA.forte, '30s', 'Saída forte e virada rápida; braçada longa mesmo cansado.');
      add('Soltar', 1, '200 m', ZONA.leve, '—');
      estilo = 'ritmo e velocidade';
    }
  } else if (esporte === 'corda') {
    const [on, off] = nivel === 'iniciante' ? [30, 60] : nivel === 'intermediario' ? [45, 45] : [60, 30];
    add('Aquecimento: mobilidade de tornozelo e polichinelos', 1, '5 min', ZONA.leve, '—');
    add('Pular corda', clamp(Math.floor(main * 60 / (on + off)), 4, 20), `${on}s`, nivel === 'iniciante' ? ZONA.moderado : ZONA.forte, `${off}s`, 'Saltos baixos, na ponta dos pés, giro no punho e não no braço.', 'Pular corda');
    add('Desaquecimento: caminhada e alongamento de panturrilha', 1, '5 min', ZONA.leve, '—');
    estilo = 'intervalado';
    if (maduro) obs = 'Pular corda tem impacto. Se sentir joelho ou tornozelo, troque metade das séries por polichinelo sem salto.';
  } else if (esporte === 'corrida') {
    if (nivel === 'iniciante' || (maduro && nivel !== 'avancado')) {
      const [corre, anda] = maduro ? [1, 3] : [1, 2];
      add('Aquecimento: caminhada', 1, '5 min', ZONA.leve, '—', null, null);
      add(`Trote ${corre} min + caminhada ${anda} min`, clamp(Math.floor(main / (corre + anda)), 3, 12), `${corre + anda} min`, ZONA.moderado, 'sem pausa', 'No trote, passadas curtas e postura alta. Na caminhada, recupere o fôlego.', 'Corrida');
      add('Desaquecimento: caminhada', 1, '5 min', ZONA.leve, '—');
      estilo = 'corre e caminha';
      obs = 'Quando os blocos ficarem fáceis, aumente o trote em 30s por semana até correr 20 a 30 min sem parar.';
    } else if (nivel === 'intermediario') {
      add('Aquecimento: trote leve', 1, '5 min', ZONA.leve, '—', null, 'Corrida');
      if (['saude', 'resistencia'].includes(p.objetivo)) {
        add('Corrida contínua', 1, `${main} min`, ZONA.leve, '—', 'Ritmo em que dá para conversar. Nos últimos 5 min, acelere um pouco.', 'Corrida');
        estilo = 'contínuo';
      } else {
        add('1 min forte + 2 min trote', clamp(Math.floor(main / 3), 4, 10), '3 min', ZONA.forte, 'trote', 'No forte, ritmo que você aguentaria uns 10 min. No trote, recupere sem parar.', 'Corrida');
        estilo = 'intervalado';
      }
      add('Desaquecimento: trote e caminhada', 1, '5 min', ZONA.leve, '—');
    } else {
      add('Aquecimento: trote + 4 acelerações de 20s', 1, '10 min', ZONA.leve, '—', null, 'Corrida');
      if (['saude', 'resistencia'].includes(p.objetivo)) {
        add('Corrida longa progressiva', 1, `${Math.max(10, main - 5)} min`, ZONA.moderado, '—', 'Comece leve e termine os últimos 10 min no ritmo de prova de 10 km.', 'Corrida');
        estilo = 'progressivo';
      } else {
        add('Tiros de 400 m', clamp(Math.floor((main - 5) / 3.5), 4, 10), '400 m', ZONA.forte, '90s trote', 'Ritmo de prova de 5 km ou um pouco mais rápido; o último tiro tem de sair igual ao primeiro.', 'Corrida');
        estilo = 'tiros';
      }
      add('Desaquecimento: trote leve', 1, '5 min', ZONA.leve, '—');
    }
  } else if (esporte === 'caminhada') {
    add('Aquecimento: caminhada tranquila', 1, '5 min', ZONA.leve, '—');
    if (nivel === 'iniciante') {
      add('Caminhada rápida', 1, `${main} min`, ZONA.moderado, '—', 'Passos firmes, braços balançando junto. Deve ficar difícil cantar, mas dá para falar.');
      estilo = 'contínua';
    } else if (nivel === 'intermediario') {
      add('3 min inclinação 6–8% + 2 min plano', clamp(Math.floor(main / 5), 3, 10), '5 min', ZONA.moderado, 'sem pausa', 'Na esteira; na rua, use uma ladeira. Não se segure no apoio.');
      estilo = 'com inclinação';
    } else {
      add('Caminhada inclinada', 1, `${main} min`, ZONA.moderado, '—', 'Esteira a 10–12% e 5 a 6 km/h, sem se segurar.');
      estilo = 'inclinada';
    }
    add('Desaquecimento', 1, '5 min', ZONA.leve, '—');
  } else {
    // bike, elíptico, escada: aparelho de academia
    const nome = NOME_ESPORTE[esporte] || 'Cardio';
    add(`Aquecimento: ${nome.toLowerCase()} leve`, 1, '5 min', ZONA.leve, '—');
    if (nivel === 'iniciante' || (maduro && nivel === 'intermediario')) {
      add(`${nome} contínuo`, 1, `${main} min`, ZONA.leve, '—', 'Carga ou velocidade em que dá para conversar. Suba um pouco a cada semana.');
      estilo = 'contínuo';
    } else if (nivel === 'intermediario') {
      add('1 min forte + 2 min leve', clamp(Math.floor(main / 3), 4, 10), '3 min', ZONA.forte, 'leve', 'No forte, suba carga ou cadência; no leve, recupere sem parar.');
      estilo = 'intervalado';
    } else if (main >= 26) {
      add('4 min forte + 3 min leve', clamp(Math.floor(main / 7), 3, 5), '7 min', ZONA.forte, 'leve', 'Intervalado 4×4: forte é 85–90% do esforço máximo, sustentado os 4 min.');
      estilo = '4×4';
    } else {
      add('30s sprint + 90s leve', clamp(Math.floor(main / 2), 6, 12), '2 min', ZONA.forte, 'leve', 'Sprint de verdade: tudo o que conseguir por 30s.');
      estilo = 'sprints';
    }
    add('Desaquecimento', 1, '5 min', ZONA.leve, '—');
  }

  if (maduro && !obs && /forte/.test(JSON.stringify(ex))) obs = 'Nos blocos fortes, pare se sentir tontura, dor no peito ou falta de ar fora do comum.';
  return {
    nome: `${NOME_ESPORTE[esporte] || 'Aeróbico'} · ${estilo}`, tipo: 'Cardio', grupos: [], obs,
    ex, cardio: { tipo: CARDIO_DO_ESPORTE[esporte] || 'esteira', min }
  };
}

function montarTreino(entrada = {}) {
  const modalidade = MODALIDADES.includes(entrada.modalidade) ? entrada.modalidade : 'musculacao';
  const grupos = [...new Set((entrada.grupos || []).filter(g => GRUPOS_TREINO.includes(g)))];
  const esporte = ESPORTES.includes(entrada.esporte) ? entrada.esporte : 'corrida';
  const nivel = entrada.meses_academia != null && entrada.nivel == null
    ? nivelPorMeses(entrada.meses_academia) || 'iniciante' : nivelDe(entrada.nivel);
  const idade = Number(entrada.idade) || null;
  const objetivo = OBJETIVOS.includes(entrada.objetivo) ? entrada.objetivo
    : modalidade === 'resistencia' ? 'resistencia' : modalidade === 'aerobico' ? 'saude' : 'hipertrofia';
  const local = entrada.local === 'casa' ? 'casa' : 'academia';
  const padraoMin = modalidade === 'aerobico' ? (esporte === 'natacao' ? 40 : 30) : modalidade === 'resistencia' ? 40 : 60;
  const min = clamp(Math.round(Number(entrada.min) || padraoMin), 15, 150);
  const p = { modalidade, grupos, esporte, nivel, idade, objetivo, local, min };

  const dia = modalidade === 'aerobico' ? aerobico(p) : modalidade === 'resistencia' ? resistencia(p) : musculacao(p);
  // O que o Registro do app recebe quando a pessoa marcar que fez.
  const registro = modalidade === 'aerobico'
    ? { cardio: [dia.cardio] }
    : { treino: { grupos: dia.grupos.filter(g => GRUPOS_TREINO.includes(g)), intensidade: modalidade === 'resistencia' || nivel === 'avancado' ? 'intenso' : 'moderado', min } };
  delete dia.cardio;
  return {
    ...dia, modalidade, esporte: modalidade === 'aerobico' ? esporte : null, nivel, objetivo, local, idade, min, registro,
    perfil: `${NOME_NIVEL[nivel]} · ${NOME_OBJ[objetivo]}${idade ? ` · ${idade} anos` : ''} · ${min} min${modalidade !== 'aerobico' ? (local === 'casa' ? ' · em casa' : ' · academia') : ''}`
  };
}

/** O treino em texto, no formato do WhatsApp. */
function textoDoTreino(t) {
  const linhas = [`🏋️ *${t.nome}*`, `_${t.perfil}_`, ''];
  t.ex.forEach((e, i) => {
    const vol = e.s > 1 ? `${e.s} × ${e.r}` : e.r;
    linhas.push(`${i + 1}. *${e.n}*: ${vol}${e.d && e.d !== '—' ? ` · descanso ${e.d}` : ''}${e.m ? ` · ${e.m}` : ''}`);
    if (e.c && !/^Leve$|^Corporal$|^Peso do corpo$/.test(e.c)) linhas.push(`   ${e.c}`);
  });
  if (t.obs) linhas.push('', `💡 ${t.obs}`);
  return linhas.join('\n');
}

window.TreinoGen = { montarTreino, textoDoTreino, nivelPorMeses, GRUPOS_TREINO, MODALIDADES, ESPORTES, NIVEIS, OBJETIVOS, NOME_ESPORTE };
})();
