// Ícones de traço simples (24×24), desenhados com a cor do texto ao redor.
const ICONES = {
  inicio: 'M3 11.5 12 4l9 7.5M5.5 10v10h13V10M10 20v-5h4v5',
  solicitacoes: 'M9 4h6v3H9zM7 5.5H5.5v15h13v-15H17M8.5 11h7M8.5 14.5h7M8.5 18h4',
  tarefas: 'M4 6.5 6 8.5l3.5-3.5M4 12.5l2 2 3.5-3.5M4 18.5l2 2 3.5-3.5M12.5 7h7.5M12.5 13h7.5M12.5 19h7.5',
  historico: 'M12 7v5l3 2M3.5 12a8.5 8.5 0 1 0 2.5-6M3.5 4v4h4',
  relatorios: 'M4 20h16M7 16.5v-5M12 16.5V7M17 16.5v-8',
  usuarios:
    'M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM2.5 20c.5-3.5 3-5.5 6.5-5.5s6 2 6.5 5.5M16 4.5a3.5 3.5 0 0 1 0 6.5M18.5 14.5c1.7.7 2.8 2.7 3 5.5',
  tipos: 'M12 3.5 3.5 8 12 12.5 20.5 8zM3.5 12.5 12 17l8.5-4.5M3.5 16.5 12 21l8.5-4.5',
  mais: 'M4 7h16M4 12h16M4 17h16',
  sair: 'M15 4h4.5v16H15M10.5 16.5 15 12l-4.5-4.5M15 12H4',
  usuario: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4.5 20.5c.8-3.8 3.6-6 7.5-6s6.7 2.2 7.5 6',
  email: 'M3.5 6h17v12h-17zM3.5 6.5 12 13l8.5-6.5',
  senha: 'M5.5 11h13v9.5h-13zM8.5 11V8a3.5 3.5 0 0 1 7 0v3M12 15v2.5',
};

export default function Icone({ nome, className = '' }) {
  return (
    <svg className={`icone ${className}`.trim()} viewBox="0 0 24 24" aria-hidden="true">
      <path d={ICONES[nome]} />
    </svg>
  );
}
