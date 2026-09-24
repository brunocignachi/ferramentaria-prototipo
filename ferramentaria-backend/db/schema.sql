-- Schema do Sistema de Gerenciamento de Solicitações — Ferramentaria Metalmecânica

CREATE TYPE perfil_usuario AS ENUM ('administrador', 'solicitante', 'operador');
CREATE TYPE prioridade_solicitacao AS ENUM ('urgente', 'alta', 'normal', 'baixa');
CREATE TYPE status_solicitacao AS ENUM ('aberta', 'em_andamento', 'concluida', 'cancelada');
CREATE TYPE status_processo AS ENUM ('pendente', 'em_andamento', 'concluido', 'cancelado');
CREATE TYPE entidade_historico AS ENUM ('solicitacao', 'processo');

CREATE TABLE usuario (
    id_usuario   SERIAL PRIMARY KEY,
    nome         VARCHAR(100) NOT NULL,
    email        VARCHAR(150) NOT NULL UNIQUE,
    senha_hash   VARCHAR(255) NOT NULL,
    perfil       perfil_usuario NOT NULL,
    ativo        BOOLEAN NOT NULL DEFAULT TRUE,
    criado_em    TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE tipo_processo (
    id_tipo_processo SERIAL PRIMARY KEY,
    nome             VARCHAR(80) NOT NULL,
    descricao        VARCHAR(255),
    ativo            BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE solicitacao (
    id_solicitacao  SERIAL PRIMARY KEY,
    numero_desenho  VARCHAR(50) NOT NULL,
    descricao       TEXT,
    quantidade      INT NOT NULL CHECK (quantidade > 0),
    prioridade      prioridade_solicitacao NOT NULL DEFAULT 'normal',
    status          status_solicitacao NOT NULL DEFAULT 'aberta',
    data_abertura   TIMESTAMP NOT NULL DEFAULT NOW(),
    data_prazo      DATE NOT NULL,
    data_conclusao  TIMESTAMP,
    observacoes     TEXT,
    id_solicitante  INT NOT NULL REFERENCES usuario(id_usuario)
);

CREATE TABLE processo_solicitacao (
    id_processo      SERIAL PRIMARY KEY,
    ordem_execucao   INT NOT NULL,
    status           status_processo NOT NULL DEFAULT 'pendente',
    data_inicio      TIMESTAMP,
    data_conclusao   TIMESTAMP,
    observacoes      TEXT,
    id_solicitacao   INT NOT NULL REFERENCES solicitacao(id_solicitacao) ON DELETE CASCADE,
    id_tipo_processo INT NOT NULL REFERENCES tipo_processo(id_tipo_processo),
    id_operador      INT REFERENCES usuario(id_usuario)
);

CREATE TABLE historico_status (
    id_historico    SERIAL PRIMARY KEY,
    entidade        entidade_historico NOT NULL,
    id_entidade     INT NOT NULL,
    status_anterior VARCHAR(50),
    status_novo     VARCHAR(50) NOT NULL,
    alterado_em     TIMESTAMP NOT NULL DEFAULT NOW(),
    id_usuario      INT REFERENCES usuario(id_usuario),
    observacao      TEXT
);

CREATE TABLE anexo (
    id_anexo       SERIAL PRIMARY KEY,
    nome_arquivo   VARCHAR(200) NOT NULL,
    caminho        VARCHAR(500) NOT NULL,
    tipo_mime      VARCHAR(100),
    tamanho_bytes  BIGINT,
    enviado_em     TIMESTAMP NOT NULL DEFAULT NOW(),
    id_solicitacao INT NOT NULL REFERENCES solicitacao(id_solicitacao) ON DELETE CASCADE,
    id_usuario     INT REFERENCES usuario(id_usuario)
);


CREATE INDEX idx_solicitacao_status ON solicitacao(status);
CREATE INDEX idx_processo_solicitacao ON processo_solicitacao(id_solicitacao);
CREATE INDEX idx_processo_tipo_status ON processo_solicitacao(id_tipo_processo, status);
CREATE INDEX idx_historico_entidade ON historico_status(entidade, id_entidade);
