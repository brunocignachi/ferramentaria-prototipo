import { formatarDataHora, rotuloHistorico } from '../utils/solicitacao';

// Histórico completo da peça: mudanças da solicitação e de cada etapa, com
// usuário e data/hora (RF08, UC14, H2).
export default function HistoricoCard({ historico }) {
  return (
    <section className="card">
      <h2>Histórico</h2>

      {historico.length === 0 ? (
        <p className="card__empty">Nenhuma alteração registrada ainda.</p>
      ) : (
        <ol className="historico">
          {historico.map((item) => (
            <li key={item.id_historico}>
              <time dateTime={item.alterado_em}>{formatarDataHora(item.alterado_em)}</time>
              <div className="historico__evento">
                <strong>
                  {item.entidade === 'processo'
                    ? `Etapa ${item.ordem_execucao}: ${item.nome_tipo_processo}`
                    : 'Solicitação'}
                </strong>
                <span>
                  {rotuloHistorico(item.status_anterior)} → {rotuloHistorico(item.status_novo)}
                </span>
                <small>
                  Por {item.nome_usuario ?? 'sistema'}
                  {item.observacao ? ` · ${item.observacao}` : ''}
                </small>
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
