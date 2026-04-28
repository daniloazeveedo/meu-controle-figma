# Meu Controle Web v4.1

Página web funcional de controle financeiro usando os assets, logo e paleta do projeto Figma.

## Funcionalidades
- Dashboard com saldo, entradas e saídas
- Cadastro de receitas e despesas
- Lista de lançamentos
- Orçamento mensal
- Categorias
- Ocultar valores
- Exportar backup em JSON
- Layout responsivo para desktop e celular
- Uso de assets SVG do Figma

## Como subir no GitHub
Suba todos os arquivos e pastas deste ZIP no repositório.

Estrutura principal:
- index.html
- style.css
- app.js
- manifest.webmanifest
- assets/


## v4.2
- Adicionada barra de meses na tela de lançamentos.
- Filtro de lançamentos por mês.
- Resumo mensal com entradas, saídas e saldo.


## v4.3
- Adicionado card de orçamento utilizado na tela de lançamentos.
- Barra rosa mostra o percentual do orçamento mensal usado.
- Card exibe orçamento disponível, usado e limite.


## v4.4
- Barra de meses ajustada para exibir 5 meses, como no Figma.
- Mês selecionado destacado com linha rosa.
- Setas laterais continuam navegando mês a mês.


## v4.5
- Adicionado cadastro/edição de usuário.
- Nome e iniciais aparecem na tela inicial.
- Configurações agora possuem opção de aparência: sistema, claro e escuro.
- Tema acompanha automaticamente o sistema quando selecionado.


## v4.6
- Refinado o modo escuro.
- Cards, sidebar, botões, inputs e textos ajustados para melhor contraste.
- Magenta aplicado com menos estouro visual.
- Ícones adaptados para o tema escuro.


## v4.6.1
- aumentado o espaçamento entre colunas principais
- card de boas-vindas com mais respiro entre conteúdo e botão Editar

## v4.8.2
- Mantida a base enviada pelo usuário com CSS/configurações da v4.6/v4.6.1.
- Reaplicadas as alterações da v4.8: modal mobile sem empurrar a tela, calendário nativo, status Realizado/Previsto, gasto previsto e sobra prevista.
- Refeito o app.js para remover duplicações de eventos e manter compatibilidade com os dados salvos no localStorage da versão v4.1/v4.6.


## v4.8.3
- Removido o bloco de previsto da tela inicial para deixar a Home mais limpa.
- Na tela de lançamentos, o resumo agora alterna entre "Entradas e saídas" e "Previsto".
- Mantido calendário nativo para escolher data.
- Mantida lógica de Realizado/Previsto nos lançamentos.


## v4.8.4
- Ao clicar em um lançamento, abre a tela de detalhes.
- Despesas mostram situação Pago / Não pago.
- Receitas mostram situação Recebido / Não recebido.
- Botão de status alterna entre realizado e previsto.
- A tela de detalhes mostra data, conta, categoria, tags, observação e anexos.
