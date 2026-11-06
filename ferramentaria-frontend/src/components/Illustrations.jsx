// Ilustrações decorativas simples e originais (formas abstratas em SVG),
// usadas no painel lateral das telas de login e cadastro de usuário —
// no espírito dos protótipos do Figma, sem reproduzir nenhuma arte de terceiros.

export function IllustrationLogin() {
  return (
    <svg viewBox="0 0 240 240" className="illustration" role="img" aria-hidden="true">
      <circle cx="120" cy="120" r="100" fill="var(--color-primary-light)" />
      <rect
        x="70"
        y="55"
        width="100"
        height="150"
        rx="16"
        fill="#ffffff"
        stroke="var(--color-primary)"
        strokeWidth="3"
      />
      <circle cx="120" cy="188" r="9" fill="var(--color-primary)" />
      <path
        d="M92 95 h56 M92 115 h56 M92 135 h34"
        stroke="var(--color-primary)"
        strokeWidth="4"
        strokeLinecap="round"
      />
      <circle cx="178" cy="68" r="20" fill="var(--color-primary)" />
      <path
        d="M169 68 l6 7 l13 -16"
        stroke="#ffffff"
        strokeWidth="4"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function IllustrationCadastro() {
  return (
    <svg viewBox="0 0 240 240" className="illustration" role="img" aria-hidden="true">
      <circle cx="120" cy="120" r="100" fill="var(--color-primary-light)" />
      <circle cx="100" cy="95" r="32" fill="#ffffff" stroke="var(--color-primary)" strokeWidth="3" />
      <path
        d="M66 155 a34 40 0 0 1 68 0"
        fill="#ffffff"
        stroke="var(--color-primary)"
        strokeWidth="3"
      />
      <circle cx="168" cy="150" r="22" fill="var(--color-primary)" />
      <path d="M168 139 v22 M157 150 h22" stroke="#ffffff" strokeWidth="4" strokeLinecap="round" />
    </svg>
  );
}
