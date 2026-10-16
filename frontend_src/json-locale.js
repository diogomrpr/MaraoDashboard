// The installed Portuguese pack contains empty entries. Supply the exposed
// widget strings through Monaco's NLS table before its modules initialize.
const pt = {
  1: 'entrada', 2: 'Distinguir maiúsculas/minúsculas', 3: 'Palavra completa', 4: 'Expressão regular',
  5: 'entrada', 6: 'Manter maiúsculas/minúsculas',
  1003: 'Pesquisar / Substituir', 1004: 'Pesquisar', 1005: 'Pesquisar',
  1006: 'Resultado anterior', 1007: 'Resultado seguinte', 1008: 'Pesquisar na seleção',
  1009: 'Fechar', 1010: 'Substituir', 1011: 'Substituir', 1012: 'Substituir',
  1013: 'Substituir tudo', 1014: 'Mostrar substituição',
  1015: 'Apenas os primeiros {0} resultados estão destacados; a pesquisa abrange todo o texto.',
  1016: '{0} de {1}', 1017: 'Sem resultados', 1018: '{0} encontrados',
  1019: '{0} encontrados para «{1}»', 1020: '{0} encontrados para «{1}», em {2}',
  1021: '{0} encontrados para «{1}»', 1022: 'Prima {0} para ajuda de acessibilidade',
  1023: '{0}, {1}', 1024: '{0}, {1}',
  1534: 'A carregar…', 1535: 'Sem sugestões.', 1536: 'Sugestões',
};
const language = new URL(import.meta.url).searchParams.get('language') || document.documentElement.lang;
if (String(language).toLowerCase().startsWith('pt')) {
  globalThis._VSCODE_NLS_LANGUAGE = 'pt-br';
  globalThis._VSCODE_NLS_MESSAGES = Object.assign([], pt);
}
