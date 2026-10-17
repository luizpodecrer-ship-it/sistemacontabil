# Proporção de controles e formulários

Os botões de ação compartilham `.action-button` ou `.btn`: Manrope 600, texto de 12 px, altura mínima de 36 px no computador, preenchimento horizontal de 14 px e ícones de 15 px. O alinhamento vertical é central, para impedir que um botão seja esticado pela altura do título e subtítulo ao lado. No celular, a área de toque mínima é 44 px. Navegação, abas, seletores e ações de ícone continuam respeitando sua função específica.

Campos de preenchimento e seleção usam altura mínima de 38 px no computador e 44 px no celular. Textos extensos podem aumentar a altura dos seletores para manter o conteúdo legível; áreas de texto mantêm espaço para várias linhas.

`FormField` identifica campos curtos (datas, números, máscaras e códigos), regulares, longos e amplos. Os controles têm limites de 14, 28 e 38 rem, respectivamente, enquanto áreas amplas usam o espaço do formulário. As posições explícitas dos cadastros existentes são mantidas. Nos editores operacionais, `.record-field-grid` organiza as larguras proporcionalmente em uma malha responsiva, com uma coluna no celular e mais campos por linha quando há espaço. O editor operacional tem largura máxima de 1040 px.

O seletor de empresa do contexto é limitado a 440 px. Empresa, competência e situação ficam agrupadas em um painel que acompanha o tamanho dos controles, sem se estender por toda a página. No celular, empresa usa uma linha própria. A busca e o filtro de situação ficam próximos; Exportar permanece como ação separada. Os filtros de sindicatos também usam larguras limitadas.

Tabelas e gráficos continuam aproveitando o espaço disponível; nenhum registro, valor ou regra de validação é alterado. Para novas ações, use as classes compartilhadas em vez de definir paddings e alturas independentes.

A validação no Chromium inclui alturas de ações, limite do seletor de empresa, proximidade dos filtros e ausência de transbordamento em 390, 768, 1440 e 1920 px, além das jornadas de cadastro, seleção, importação e navegação. Não representa teste direto em dispositivos físicos ou Safari.
