import './ProgressRing.css';

/**
 * Anel de progresso (donut) usado no card "Situação Atual" do Dashboard,
 * reproduzindo os três indicadores circulares do protótipo (Figura 3).
 */
export default function ProgressRing({ value, color, label }) {
  const radius = 34;
  const circunferencia = 2 * Math.PI * radius;
  const valorSeguro = Number.isFinite(value) ? Math.min(Math.max(value, 0), 100) : 0;
  const offset = circunferencia - (valorSeguro / 100) * circunferencia;

  return (
    <div className="progress-ring">
      <svg width="84" height="84" viewBox="0 0 88 88">
        <circle cx="44" cy="44" r={radius} className="progress-ring__track" />
        <circle
          cx="44"
          cy="44"
          r={radius}
          className="progress-ring__value"
          style={{ stroke: color, strokeDasharray: circunferencia, strokeDashoffset: offset }}
        />
        <text x="44" y="48" textAnchor="middle" className="progress-ring__text">
          {valorSeguro}%
        </text>
      </svg>
      <span className="progress-ring__label">{label}</span>
    </div>
  );
}
