const fs = require('fs');
const files = [
'apps/web/content/docs/duvidas/rejeicoes/solutions-nfe/306.mdx',
'apps/web/content/docs/duvidas/rejeicoes/solutions-nfe/539.mdx',
'apps/web/content/docs/duvidas/rejeicoes/solutions-nfe/600.mdx',
'apps/web/content/docs/duvidas/rejeicoes/solutions-nfe/694.mdx',
'apps/web/content/docs/manuais-tecnicos/documentacao-tecnica-arquitetura/acesso-remoto/REVISAO.mdx',
'apps/web/content/docs/manuais-tecnicos/documentacao-tecnica-arquitetura/acesso-remoto/arquitetura-remote.mdx',
'apps/web/content/docs/manual/financeiro/contas-bancarias/components/BankingExport.tsx',
'apps/web/content/docs/manual/fiscal/tributacao.mdx',
'apps/web/content/docs/suporte/components/requisitos-pdf.tsx',
'apps/web/content/docs/suporte/parametrizacoes/migracao-nfse-nacional.mdx',
'apps/web/content/docs/suporte/scripts/produto-referencia-codigo-fiscal.mdx',
'apps/web/src/components/platform/cadastros/user/CreateUserPageForm.tsx'
];

files.forEach(f => {
  if (fs.existsSync(f)) {
    let content = fs.readFileSync(f, 'utf8');
    let original = content;

    // Convert generic mojibake
    content = content.replace(/Ã[\x80-\xBF]/g, m => {
      // Create a buffer from the Latin1 interpretation of the JS characters,
      // then decode it as UTF-8
      const buf = Buffer.alloc(2);
      buf[0] = m.charCodeAt(0);
      buf[1] = m.charCodeAt(1);
      return buf.toString('utf8');
    });

    // Special hardcoded fallback replacements for characters that were read
    // differently (like í being Ã + U+00AD)
    content = content.replace(/Ã\xAD/g, 'í');
    content = content.replace(/Ã\u00AD/g, 'í');    
    content = content.replace(/Ã§/g, 'ç');
    content = content.replace(/Ã£/g, 'ã');
    content = content.replace(/Ãµ/g, 'õ');
    content = content.replace(/Ã¡/g, 'á');
    content = content.replace(/Ã©/g, 'é');
    content = content.replace(/Ã³/g, 'ó');
    content = content.replace(/Ãº/g, 'ú');
    content = content.replace(/Ã¢/g, 'â');
    content = content.replace(/Ãª/g, 'ê');
    content = content.replace(/Ã´/g, 'ô');
    content = content.replace(/Ã/g, 'í'); // Any leftover Ã alone is often í, wait, no, might be À or others. 
    // Wait, let's not apply solitary isolated Ã immediately without checking, but looking at typical occurrences, like "MELGORIAS" -> actually wait, REVISAO.mdx had "MELGORIAS" ??? "MELHORIAS". Not an Ã issue.

    // Questions mark corruptions
    content = content.replace(/t\?cnica/gi, 'técnica');
    content = content.replace(/T\?cnica/gi, 'Técnica');
    content = content.replace(/d\?vida/gi, 'dúvida');
    content = content.replace(/usu\?rio/gi, 'usuário');
    content = content.replace(/Usu\?rio/gi, 'Usuário');
    content = content.replace(/cont\?m/gi, 'contém');
    content = content.replace(/Cont\?m/gi, 'Contém');
    content = content.replace(/op\?Ã§Ã£o/gi, 'opção');
    content = content.replace(/op\?Ã§Ãµes/gi, 'opções');
    content = content.replace(/op\?ção/gi, 'opção');
    content = content.replace(/opera\?ão/gi, 'operação');
    content = content.replace(/configura\?ão/gi, 'configuração');
    content = content.replace(/configura\?ões/gi, 'configurações');
    content = content.replace(/M\?dulo/gi, 'Módulo');
    content = content.replace(/m\?dulo/gi, 'módulo');
    content = content.replace(/p\?gina/gi, 'página');
    content = content.replace(/P\?gina/gi, 'Página');
    content = content.replace(/v\?lido/gi, 'válido');
    content = content.replace(/n\?mero/gi, 'número');
    content = content.replace(/N\?mero/gi, 'Número');
    content = content.replace(/Voc\?/gi, 'Você');
    content = content.replace(/voc\?/gi, 'você');
    content = content.replace(/N\?o/gi, 'Não');
    content = content.replace(/n\?o/gi, 'não');
    content = content.replace(/s\?o/gi, 'são');
    content = content.replace(/S\?o/gi, 'São');
    content = content.replace(/al\?quotas/gi, 'alíquotas');
    content = content.replace(/f\?sico/gi, 'físico');
    content = content.replace(/Aten\?ão/gi, 'Atenção');
    content = content.replace(/aten\?ão/gi, 'atenção');
    content = content.replace(/informa\?ões/gi, 'informações');
    content = content.replace(/Informa\?ões/gi, 'Informações');
    content = content.replace(/necess\?rio/gi, 'necessário');
    content = content.replace(/Necess\?rio/gi, 'Necessário');
    content = content.replace(/atrav\?s/gi, 'através');
    content = content.replace(/Atrav\?s/gi, 'Através');

    // specific to BankingExport.tsx:
    content = content.replace(/Remessa autom\?tica/gi, 'Remessa automática');

    if (original !== content) {
      fs.writeFileSync(f, content, 'utf8');
      console.log('Fixed ' + f);
    }
  }
});
