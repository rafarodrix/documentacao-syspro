/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    {
      name: 'no-web-to-api-source',
      comment: 'O web deve consumir a API por HTTP e contratos publicados, nunca o codigo-fonte da API.',
      severity: 'error',
      from: { path: '^apps/web' },
      to: { path: '^apps/api' },
    },
    {
      name: 'no-api-to-web-source',
      comment: 'A API nao deve depender da composicao ou runtime do Next.js.',
      severity: 'error',
      from: { path: '^apps/api' },
      to: { path: '^apps/web' },
    },
    {
      name: 'no-package-to-app-source',
      comment: 'Pacotes compartilhados nao podem depender de apps.',
      severity: 'error',
      from: { path: '^packages' },
      to: { path: '^apps' },
    },
    {
      name: 'no-workspace-deep-imports',
      comment: 'Consuma somente a API publica de cada workspace.',
      severity: 'error',
      from: {},
      to: { path: '^@dosc-syspro/[^/]+/(src|internal)/' },
    },
    {
      name: 'no-circular-dependencies',
      comment: 'Ciclos tornam a ordem de inicializacao e refatoracoes inseguras.',
      severity: 'error',
      from: {},
      to: { circular: true },
    },
  ],
  options: {
    doNotFollow: { path: 'node_modules|\\.next|dist' },
    exclude: 'node_modules|\\.next|dist|coverage',
    tsConfig: { fileName: 'tsconfig.base.json' },
  },
};
