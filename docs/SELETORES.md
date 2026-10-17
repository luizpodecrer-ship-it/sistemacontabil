# Padrão de seleção

O componente compartilhado `components/ui/select.tsx` substitui os seletores dos formulários, filtros, cadastros, configurações, contas contábeis e importadores. Ele recebe opções e valores existentes, sem alterar os dados cadastrados ou as regras de cada módulo.

A apresentação usa Manrope, bordas arredondadas, seta, texto inicial discreto e lista branca com sombra, destaque de foco e marca de seleção. O menu abre em um portal no corpo da página ou dentro do diálogo nativo que contém o campo, evitando cortes em tabelas e perda de acesso em janelas modais. A posição acompanha rolagem, redimensionamento e mudanças da área visível.

Listas com pelo menos dez opções e seletores identificados como empresa, cargo, CBO, sindicato, conta ou colaborador oferecem busca por texto e valor/código. A busca ignora caixa e acentos. Opções podem fornecer `data-search` para códigos adicionais sem acrescentá-los ao rótulo exibido. No contexto de empresa, isso inclui código interno e CPF/CNPJ. Listas sem resultados apresentam mensagem própria.

Teclado: Enter/Espaço ou setas abrem; setas, Home e End navegam; Enter confirma; Escape fecha sem alterar e devolve o foco ao campo; Tab fecha e continua a navegação. Opções desabilitadas são preservadas e não podem ser escolhidas. Rótulos, estado inválido, descrições de ajuda e obrigatoriedade são mantidos. O nome e o valor também são disponibilizados para envio de formulários por input oculto; a validação de cada módulo permanece responsável pelos campos obrigatórios, como antes.

Em telas pequenas, opções têm área de toque mínima de 44 px, nomes extensos podem quebrar e o menu limita a largura e permite rolagem interna. Não é uma substituição dos calendários, caixas de marcação ou fluxos especializados de consulta em tabelas, como a pesquisa completa de ocupações CBO.

Novos campos de seleção devem usar `Select` ou `FormField` com `options`/`choices`, mantendo o mesmo comportamento. Os testes interagem com as opções visíveis em vez de controlar um select nativo. Há cobertura Chromium para cadastros, filtros, importações, seleção por segmento, teclado, busca, diálogos e telas de celular, tablet e computador. Essa cobertura não equivale a um teste direto no Safari ou em dispositivos físicos.
