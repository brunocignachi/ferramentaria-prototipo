const fs = require('fs');
const path = require('path');

const BACKUP_DIR = process.env.BACKUP_DIR || path.join(__dirname, '..', '..', 'backups');
const RETENCAO = 14;
const INTERVALO_DIARIO_MS = 24 * 60 * 60 * 1000;
const INTERVALO_VERIFICACAO_MS = 60 * 60 * 1000;
const PREFIXO = 'backup-';

// Em ordem de dependência, para a restauração respeitar as chaves estrangeiras.
const TABELAS = [
  { nome: 'usuario', chave: 'id_usuario' },
  { nome: 'tipo_processo', chave: 'id_tipo_processo' },
  { nome: 'solicitacao', chave: 'id_solicitacao' },
  { nome: 'processo_solicitacao', chave: 'id_processo' },
  { nome: 'historico_status', chave: 'id_historico' },
  { nome: 'anexo', chave: 'id_anexo' },
  // Criada depois dos primeiros backups: um arquivo antigo sem ela é restaurado com a tabela vazia.
  { nome: 'notificacao', chave: 'id_notificacao', opcional: true },
];

function listarBackups(diretorio = BACKUP_DIR) {
  if (!fs.existsSync(diretorio)) return [];
  return fs.readdirSync(diretorio)
    .filter((nome) => nome.startsWith(PREFIXO) && nome.endsWith('.json'))
    .sort();
}

// Exporta o banco em JSON. to_jsonb preserva datas e horários exatamente como
// estão gravados, e a leitura ocorre em uma única fotografia consistente.
async function gerarBackup(pool, diretorio = BACKUP_DIR) {
  const client = await pool.connect();
  const dados = {};
  try {
    await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
    for (const { nome, chave } of TABELAS) {
      const { rows } = await client.query(`SELECT to_jsonb(t) AS linha FROM ${nome} t ORDER BY ${chave}`);
      dados[nome] = rows.map((r) => r.linha);
    }
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }

  fs.mkdirSync(diretorio, { recursive: true });
  const criadoEm = new Date().toISOString();
  const arquivo = path.join(diretorio, `${PREFIXO}${criadoEm.replace(/[:.]/g, '-')}.json`);
  // Grava em arquivo temporário para um backup interrompido não parecer válido.
  fs.writeFileSync(`${arquivo}.tmp`, JSON.stringify({ criado_em: criadoEm, tabelas: dados }));
  fs.renameSync(`${arquivo}.tmp`, arquivo);

  for (const antigo of listarBackups(diretorio).slice(0, -RETENCAO)) {
    fs.unlinkSync(path.join(diretorio, antigo));
  }
  return arquivo;
}

// Substitui todo o conteúdo do banco pelo backup, de forma atômica.
async function restaurarBackup(pool, arquivo) {
  const { tabelas } = JSON.parse(fs.readFileSync(arquivo, 'utf8'));
  if (!tabelas || TABELAS.some(({ nome, opcional }) => !opcional && !Array.isArray(tabelas[nome]))) {
    throw new Error('Arquivo de backup inválido.');
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(`TRUNCATE ${TABELAS.map((t) => t.nome).join(', ')} RESTART IDENTITY CASCADE`);
    for (const { nome, chave } of TABELAS) {
      await client.query(
        `INSERT INTO ${nome} SELECT * FROM jsonb_populate_recordset(NULL::${nome}, $1::jsonb)`,
        [JSON.stringify(tabelas[nome] ?? [])]
      );
      await client.query(
        `SELECT setval(pg_get_serial_sequence('${nome}', '${chave}'),
                       COALESCE(MAX(${chave}), 1), MAX(${chave}) IS NOT NULL) FROM ${nome}`
      );
    }
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

function backupEmDia(diretorio) {
  const ultimo = listarBackups(diretorio).at(-1);
  if (!ultimo) return false;
  const idade = Date.now() - fs.statSync(path.join(diretorio, ultimo)).mtimeMs;
  return idade < INTERVALO_DIARIO_MS;
}

// Backup automático diário (RS02). Confere de hora em hora, então um dia em que
// a API ficou desligada é compensado assim que ela voltar a rodar.
function iniciarBackupDiario(pool, diretorio = BACKUP_DIR) {
  const executar = async () => {
    if (backupEmDia(diretorio)) return;
    try {
      console.log(`Backup gerado: ${await gerarBackup(pool, diretorio)}`);
    } catch (err) {
      console.error('Falha no backup automático:', err.message);
    }
  };
  executar();
  return setInterval(executar, INTERVALO_VERIFICACAO_MS).unref();
}

module.exports = { gerarBackup, restaurarBackup, iniciarBackupDiario };
