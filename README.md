# Obrix — Front-end

Interface da plataforma Obrix: um site que liga quem precisa de um serviço em casa —
eletricista, encanador, pintor, diarista, jardineiro — a profissionais autônomos da região.

**O diferencial que o produto defende:** o profissional só paga comissão à plataforma
quando o cliente confirma que o serviço foi concluído. Buscar, receber solicitações e
trocar contato não custam nada. Essa regra não ficou só no texto — ela decidiu a
interface, e os pontos onde isso aparece estão marcados mais abaixo.

Projeto Integrador · Análise e Desenvolvimento de Sistemas · Faculdade SENAI FATESG · 2026

---

## Como abrir

Não precisa instalar nada, nem compilar, nem subir servidor.

```
Abra o arquivo index.html no navegador.
```

O site funciona inteiro, com dados de demonstração carregados no próprio navegador.

| Perfil       | E-mail               | Senha      |
|--------------|----------------------|------------|
| Cliente      | `ana@exemplo.com`    | `obrix123` |
| Profissional | `carlos@exemplo.com` | `obrix123` |

Entre como **Ana** para ver o painel do cliente com os cinco serviços de exemplo, um em
cada estado do ciclo. Entre como **Carlos** para ver o painel do profissional e o
extrato de comissões.

---

## Tecnologias

HTML5, CSS3 e JavaScript — **sem framework e sem etapa de build**, por exigência da
disciplina. Nenhuma dependência externa: o que está no repositório é o que roda.

---

## Como o código está organizado

```
obrix-frontend/
├─ index.html              Início e busca
├─ resultados.html         Resultados da busca
├─ perfil.html             Perfil público do profissional
├─ solicitar.html          Nova solicitação
├─ entrar.html             Acesso
├─ criar-conta.html        Cadastro de cliente ou de profissional
├─ painel-cliente.html     Minhas solicitações
├─ painel-prestador.html   Painel do profissional e extrato
├─ minha-conta.html        Dados cadastrais e privacidade
├─ css/
│  └─ obrix.css            Folha única
└─ js/
   ├─ api.js               Camada de acesso a dados
   ├─ demo.js              Dados e regras resolvidos no navegador
   ├─ ui.js                Componentes compartilhados
   └─ pagina-*.js          Um arquivo por tela
```

### A camada de API

Nenhuma tela chama `fetch` diretamente. Tudo passa pelo `api.js`, que tem dois modos com
a **mesma assinatura**:

- **servidor** — quando a página é servida por uma aplicação com a API REST em `/api/v1`,
  ele chama a API de verdade, com a sessão no cookie.
- **demonstração** — quando a página é aberta direto do disco, ou quando a API não
  responde, ele resolve no próprio navegador pelo `demo.js`.

A troca acontece sozinha, no carregamento. O ganho prático é que **a tela não sabe de
onde veio a resposta**: dá para abrir o site sem servidor nenhum e ele continua
funcionando, e no dia em que a API mudar de lugar nenhuma tela precisa ser tocada.

O `demo.js` não é um punhado de dados estáticos: ele replica as mesmas regras do
servidor — a máquina de estados com as oito transições, o cálculo da comissão de 10% e
as validações de quem pode fazer o quê. É por isso que, abrindo o `index.html`, dá para
percorrer o ciclo inteiro e ver a cobrança nascer de verdade.

### A folha de estilo

O `obrix.css` começa por **tokens de design** — cor, espaçamento, tipografia e formas
ficam todos na primeira seção, em variáveis CSS. Trocar a identidade visual do produto é
trocar aquele bloco; o resto do arquivo não tem um valor solto.

Depois vêm os componentes, na ordem em que aparecem na tela: cabeçalho, botões,
formulários, cartões, selos de status, modal e tabela.

---

## Decisões de interface

Estas não são detalhes de acabamento. Cada uma resolve um problema concreto:

**O status nunca é comunicado só pela cor.** O texto está sempre escrito dentro do selo.
Quem não distingue cores continua entendendo a tela.

**Nenhum telefone aparece antes do aceite.** Nos resultados da busca e no perfil público
não há contato nenhum. Ele é liberado para os dois lados no momento em que o profissional
aceita a solicitação — e sem custo, que é justamente o oposto do modelo que o produto
critica.

**Profissionais sem avaliação aparecem em bloco separado e sinalizado.** Se ficassem no
fim da lista sem explicação, um cadastro novo seria lido como mal avaliado.

**Na confirmação de conclusão, tudo o que vai acontecer é dito antes do clique:** o valor
informado, que confirmar gera 10% de comissão ao profissional, e até quando o cliente
pode responder. "Contestar" tem peso visual menor que "Confirmar", mas nunca fica
escondido — esconder a proteção do cliente esvaziaria o requisito que ela atende.

**Cada cartão mostra só as ações permitidas naquele status.** A lista vem pronta do
campo `acoesDisponiveis`, e não é recalculada na tela: a regra de quem pode fazer o quê
mora num lugar só.

**O fluxo de contratação tem exatamente quatro telas**, da busca ao envio do pedido, e o
indicador de etapas na última torna isso visível para quem está usando.

---

## Acessibilidade e responsividade

- Contraste do verde de ação sobre branco em **5,5:1**, acima do mínimo 4,5:1 do padrão
  WCAG 2.1 AA.
- Todo campo tem rótulo associado; o foco do teclado é sempre visível.
- Modal fecha no `Esc`, prende o foco e o devolve ao elemento que o abriu.
- Alvos de toque com no mínimo 44 pixels.
- Layout de **320 a 1920 pixels**. Nenhuma ação disponível no computador desaparece no
  celular — o cabeçalho quebra em duas linhas em vez de empurrar a página para o lado.

---

## As telas

| Tela | O que resolve |
|---|---|
| Início e busca | Busca por categoria, cidade e bairro, sem exigir conta |
| Resultados | Lista ordenada por nota, com os não avaliados em bloco próprio |
| Perfil | Descrição, categorias, regiões, nota e avaliações recebidas |
| Nova solicitação | Descrição, endereço de execução e data, em quatro etapas |
| Painel do cliente | Os serviços por status, com as ações de cada etapa |
| Confirmação | A tela que materializa a regra do produto |
| Contestação | Motivo obrigatório e as consequências ditas antes do envio |
| Painel do profissional | Solicitações, serviços em andamento e indicadores |
| Extrato | Histórico de comissões, com total do período |
| Minha conta | Dados cadastrais e os direitos sobre os dados pessoais |

---

## Equipe

- **Gabriel Ribeiro** — front-end e UX/UI
- **Joel Felipe dos Santos** — gerência do projeto e back-end
- **Luiz Leite** — testes e documentação
