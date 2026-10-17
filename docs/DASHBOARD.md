# Dashboard do escritório

O Dashboard reúne as empresas do escritório, independentemente da empresa selecionada nos outros módulos. A competência pode ser alterada no seletor e usada no filtro **Competência atual**. Os filtros **7, 30 e 90 dias** terminam na data local do navegador e incluem o dia atual.

- **Empresas ativas:** posição atual dos cadastros com situação no escritório `Ativa`. Não apresenta tendência histórica presumida.
- **Tarefas concluídas:** registros não arquivados de Processos e tarefas, atualmente concluídos, com `completedAt` dentro do período.
- **Obrigações pendentes:** obrigações atualmente abertas com vencimento dentro do período; vencidas têm prazo anterior ao dia atual. É uma posição atual, não uma reconstrução do passado.
- **Honorários recebidos:** soma dos valores das Cobranças liquidadas pela data de recebimento. Lançamentos integrados ao Financeiro do escritório não são somados novamente; outras receitas do escritório não são tratadas como honorários.

Ao concluir uma tarefa ou obrigação, sua data de conclusão é registrada automaticamente; edições posteriores preservam a data. Reabrir remove a conclusão atual e concluir novamente registra a nova data. Registros legados sem data são sinalizados e excluídos dos gráficos, sem inferir uma data a partir da última edição.

As comparações de tarefas e honorários usam o período imediatamente anterior de igual duração. São omitidas quando a base não contém registros desde o início do período anterior ou a base de comparação é zero. Percentuais usam apenas os registros disponíveis, não uma fotografia histórica imutável. Empresas e pendências não apresentam percentuais históricos.

O gráfico e as minibarras usam 12 intervalos cronológicos; zero permanece zero. O gráfico compara quantidades de tarefas e obrigações concluídas. O CSV exporta indicadores, datas, observações e as duas séries de intervalos. Sem dados, o painel informa a ausência de conclusões em vez de desenhar tendências fictícias.

Validação: testes unitários de agregação, datas, ano bissexto, legado e deduplicação financeira; teste Chromium de filtros, exportação CSV e tamanhos de 390, 768 e 1440 px; jornadas operacionais existentes. Não equivale a teste direto em Safari ou dispositivos físicos.
