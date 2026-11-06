const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const multer = require('multer');

const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(__dirname, '..', '..', 'uploads');
const TAMANHO_MAXIMO_MB = 20;
// Formatos usuais de desenho técnico (RF03).
const EXTENSOES_PERMITIDAS = new Set([
  '.pdf', '.png', '.jpg', '.jpeg', '.tif', '.tiff', '.dwg', '.dxf', '.step', '.stp', '.iges', '.igs',
]);

// O multer entrega o nome original em latin1, o que estragaria acentos.
function nomeOriginal(arquivo) {
  return Buffer.from(arquivo.originalname, 'latin1').toString('utf8');
}

const upload = multer({
  storage: multer.diskStorage({
    destination(req, arquivo, cb) {
      fs.mkdir(UPLOAD_DIR, { recursive: true }, (err) => cb(err, UPLOAD_DIR));
    },
    // O nome em disco é aleatório: nunca vem do usuário.
    filename(req, arquivo, cb) {
      cb(null, `${crypto.randomUUID()}${path.extname(arquivo.originalname).toLowerCase()}`);
    },
  }),
  limits: { fileSize: TAMANHO_MAXIMO_MB * 1024 * 1024, files: 1 },
  fileFilter(req, arquivo, cb) {
    if (EXTENSOES_PERMITIDAS.has(path.extname(arquivo.originalname).toLowerCase())) {
      return cb(null, true);
    }
    const erro = new Error(`Formato não permitido. Use: ${[...EXTENSOES_PERMITIDAS].join(', ')}`);
    erro.status = 400;
    cb(erro);
  },
});

function receberArquivo(req, res, next) {
  upload.single('arquivo')(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      const erro = new Error(
        err.code === 'LIMIT_FILE_SIZE'
          ? `O arquivo excede o limite de ${TAMANHO_MAXIMO_MB} MB.`
          : 'Não foi possível receber o arquivo.'
      );
      erro.status = 400;
      return next(erro);
    }
    next(err);
  });
}

function caminhoDoArquivo(caminho) {
  return path.join(UPLOAD_DIR, path.basename(caminho));
}

// Falha ao apagar um arquivo não deve desfazer uma operação já confirmada no banco.
async function removerArquivo(caminho) {
  try {
    await fs.promises.unlink(caminhoDoArquivo(caminho));
  } catch (err) {
    if (err.code !== 'ENOENT') console.error('Não foi possível remover o anexo:', err.message);
  }
}

module.exports = { receberArquivo, caminhoDoArquivo, removerArquivo, nomeOriginal };
