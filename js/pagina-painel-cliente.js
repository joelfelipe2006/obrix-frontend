/* Painel do cliente (W06/M06) e confirmacao de conclusao (W07/M07).
   Esta e a tela onde a regra do produto vira interface: antes de clicar, o
   cliente le quanto sera a comissao, ate quando pode responder, e tem as duas
   acoes lado a lado. "Contestar" tem peso visual menor que "Confirmar", mas
   nunca fica escondido — esconder a protecao esvaziaria o requisito. */
(function () {
  'use strict';

  var lista, abas, filtroAtual = 'todas', solicitacoes = [];

  var GRUPOS = {
    todas:      function () { return true; },
    andamento:  function (s) { return ['ACEITA', 'EM_EXECUCAO'].indexOf(s.status) !== -1; },
    aguardando: function (s) { return ['AGUARDANDO_CONFIRMACAO', 'CONTESTADA'].indexOf(s.status) !== -1; },
    concluidas: function (s) { return s.status === 'CONCLUIDA'; },
    canceladas: function (s) { return ['CANCELADA', 'RECUSADA'].indexOf(s.status) !== -1; }
  };

  UI.iniciarPagina({ exigeSessao: true, perfil: 'CLIENTE' }).then(function (inicio) {
    if (!inicio.sessao) return;

    lista = document.getElementById('lista');
    abas = document.getElementById('abas');

    abas.addEventListener('click', function (ev) {
      var botao = ev.target.closest('.aba');
      if (!botao) return;
      filtroAtual = botao.dataset.filtro;
      abas.querySelectorAll('.aba').forEach(function (a) {
        a.setAttribute('aria-selected', String(a === botao));
      });
      desenhar();
    });

    // Delegacao de evento: os cartoes sao redesenhados a cada acao, entao o
    // ouvinte fica no container e nunca precisa ser religado.
    lista.addEventListener('click', aoClicar);

    return carregar();
  }).catch(UI.erro);

  function carregar() {
    lista.innerHTML = '<p class="painel-apoio">Carregando...</p>';
    return Api.minhasSolicitacoes().then(function (dados) {
      solicitacoes = dados || [];
      desenhar();
    });
  }

  function desenhar() {
    atualizarContadorDaAba();

    var filtradas = solicitacoes.filter(GRUPOS[filtroAtual]);
    if (!filtradas.length) {
      lista.innerHTML = '<div class="vazio">' +
        (solicitacoes.length
          ? 'Nenhuma solicitacao neste filtro.'
          : 'Voce ainda nao solicitou nenhum servico. <br><a href="index.html">Buscar um profissional</a>') +
        '</div>';
      return;
    }
    lista.innerHTML = filtradas.map(cartao).join('');
  }

  function atualizarContadorDaAba() {
    var pendentes = solicitacoes.filter(function (s) {
      return s.status === 'AGUARDANDO_CONFIRMACAO';
    }).length;
    var aba = abas.querySelector('[data-filtro="aguardando"]');
    aba.innerHTML = 'Aguardando voce' +
      (pendentes ? ' <span class="contador">' + pendentes + '</span>' : '');
  }

  function cartao(s) {
    var destacar = s.status === 'AGUARDANDO_CONFIRMACAO';

    var valor = '';
    if (s.valorFinal !== null && s.valorFinal !== undefined) {
      valor =
        '<div class="valor-bloco">' +
          '<div class="valor-rotulo">Valor informado</div>' +
          '<div class="valor-numero">' + UI.moeda(s.valorFinal) + '</div>' +
          (s.prazoConfirmacao && destacar
            ? '<div class="prazo">Responda ate ' + UI.escapar(s.prazoConfirmacao) + '</div>'
            : '') +
        '</div>';
    }

    return '' +
      '<article class="cartao cartao-servico' + (destacar ? ' cartao-destaque' : '') + '">' +
        '<div>' +
          '<div class="cabecalho">' +
            UI.selo(s.status, s.statusRotulo) +
            '<span class="meta">Criada em ' + UI.escapar(s.dataCriacao) + '</span>' +
          '</div>' +
          '<h3>' + UI.escapar(s.descricao) + '</h3>' +
          '<p class="sub">' + UI.escapar(s.prestador.nome) + ' &middot; ' +
            UI.escapar(s.categoria) + ' &middot; ' + UI.escapar(s.regiao) + '</p>' +
          contato(s) +
          (s.status === 'CONTESTADA'
            ? '<p class="nota-contestada">Nenhuma cobranca foi gerada. Resolva a divergencia ' +
              'direto com o profissional; ele registrara a conclusao de novo.</p>'
            : '') +
          (s.motivo && ['RECUSADA', 'CANCELADA', 'CONTESTADA'].indexOf(s.status) !== -1
            ? '<p class="nota-contestada">Motivo: ' + UI.escapar(s.motivo) + '</p>'
            : '') +
          (s.status === 'CONCLUIDA' && s.cobranca
            ? '<p class="nota-contestada">Comissao de ' + UI.moeda(s.cobranca.valorComissao) +
              ' registrada ao profissional' +
              (s.confirmacaoAutomatica ? ', por decurso do prazo de 7 dias.' : '.') + '</p>'
            : '') +
          (s.notaAvaliacao ? '<p class="nota-contestada">Voce avaliou com ' +
            s.notaAvaliacao + ' estrelas.</p>' : '') +
        '</div>' +
        valor +
        acoes(s) +
      '</article>';
  }

  /* RF14: telefone e e-mail so aparecem depois do aceite. */
  function contato(s) {
    if (!s.prestador || !s.prestador.telefone) return '';
    return '<p class="sub">Contato liberado: ' + UI.escapar(s.prestador.telefone) +
           ' &middot; ' + UI.escapar(s.prestador.email) + '</p>';
  }

  function acoes(s) {
    if (!s.acoesDisponiveis.length) return '<div></div>';

    var botoes = s.acoesDisponiveis.map(function (acao) {
      var classe = acao === 'confirmar' ? 'btn-primario'
                 : acao === 'avaliar'   ? 'btn-escuro'
                 : acao === 'cancelar'  ? 'btn-perigo'
                 : 'btn-secundario';
      var rotulo = { confirmar: 'Confirmar conclusao', contestar: 'Contestar',
                     cancelar: 'Cancelar solicitacao', avaliar: 'Avaliar profissional' }[acao] || acao;
      return '<button type="button" class="btn ' + classe + '" ' +
             'data-acao="' + acao + '" data-id="' + s.id + '">' + rotulo + '</button>';
    }).join('');

    return '<div class="acoes">' + botoes + '</div>';
  }

  /* ------------------------------------------------------------- acoes */

  function aoClicar(ev) {
    var botao = ev.target.closest('[data-acao]');
    if (!botao) return;

    var id = Number(botao.dataset.id);
    var s = solicitacoes.filter(function (x) { return x.id === id; })[0];
    if (!s) return;

    switch (botao.dataset.acao) {
      case 'confirmar': abrirConfirmacao(s); break;
      case 'contestar': abrirContestacao(s); break;
      case 'cancelar':  abrirCancelamento(s); break;
      case 'avaliar':   abrirAvaliacao(s); break;
    }
  }

  /** A tela que define o produto. Tudo o que acontece ao confirmar fica visivel antes do clique. */
  function abrirConfirmacao(s) {
    var comissao = Number(s.valorFinal) * 0.10;

    UI.abrirModal({
      titulo: 'Confirmar a conclusao do servico',
      rotuloConfirmar: 'Confirmar conclusao',
      rotuloCancelar: 'Voltar',
      corpo:
        '<p class="valor-rotulo">Servico</p>' +
        '<h3>' + UI.escapar(s.descricao) + '</h3>' +
        '<p class="sub" style="color:var(--texto-2);font-size:14px">' +
          UI.escapar(s.prestador.nome) + ' &middot; ' + UI.escapar(s.categoria) +
          ' &middot; execucao registrada em ' + UI.escapar(s.dataRegistroConclusao || '—') + '</p>' +

        '<div class="aviso aviso-ok" style="margin-top:16px;display:block">' +
          '<div class="valor-rotulo">Valor final informado pelo profissional</div>' +
          '<div class="destaque-valor">' + UI.moeda(s.valorFinal) + '</div>' +
          '<div style="font-size:13.5px;margin-top:4px">Nao confere com o combinado? ' +
            'Use "Contestar" e descreva a divergencia.</div>' +
        '</div>' +

        '<h3 style="margin-top:16px">Ao confirmar</h3>' +
        '<ul class="lista-efeitos">' +
          '<li>O servico passa para o status Concluida e voce podera avaliar o profissional.</li>' +
          '<li>A plataforma registra a comissao de 10% ao profissional: <strong>' +
            UI.moeda(comissao) + '</strong>.</li>' +
        '</ul>' +

        (s.prazoConfirmacao
          ? '<div class="aviso aviso-alerta" style="margin-top:16px">' +
            'Voce tem ate <strong>' + UI.escapar(s.prazoConfirmacao) + '</strong> para responder. ' +
            'Sem confirmacao nem contestacao ate essa data, a conclusao e confirmada automaticamente.' +
            '</div>'
          : '') +

        '<p style="margin-top:14px;font-size:13px;color:var(--texto-3)">' +
          'Nenhuma das duas acoes envolve pagamento pela plataforma. ' +
          'O valor do servico e acertado direto com o profissional.</p>',

      aoConfirmar: function () {
        executar(s.id, 'confirmar', {}, 'Servico confirmado. Comissao registrada ao profissional.');
      }
    });
  }

  /** Contestar e protecao permanente: avisa que o prazo automatico deixa de valer. */
  function abrirContestacao(s) {
    var modal = UI.abrirModal({
      titulo: 'Contestar a conclusao',
      rotuloConfirmar: 'Enviar contestacao',
      classeConfirmar: 'btn-escuro',
      corpo:
        '<p class="painel-apoio">Use esta opcao se o servico nao corresponde ao que foi combinado.</p>' +
        '<div class="cartao" style="box-shadow:none;margin-top:12px">' +
          '<h3>' + UI.escapar(s.descricao) + '</h3>' +
          '<p class="sub" style="color:var(--texto-2);font-size:14px">' +
            UI.escapar(s.prestador.nome) + ' &middot; valor informado: ' +
            UI.moeda(s.valorFinal) + '</p>' +
        '</div>' +
        '<div class="campo" style="margin-top:16px">' +
          '<label for="motivo-contestacao">Motivo da contestacao — obrigatorio</label>' +
          '<textarea id="motivo-contestacao" maxlength="500" ' +
            'placeholder="Descreva o que nao corresponde ao combinado."></textarea>' +
        '</div>' +
        '<div class="aviso aviso-alerta" style="display:block">' +
          '<strong>O que acontece ao contestar</strong>' +
          '<ul class="lista-efeitos">' +
            '<li>O servico passa para o status Contestada.</li>' +
            '<li>Nenhuma cobranca e gerada ao profissional.</li>' +
            '<li>A confirmacao automatica deixa de valer para este servico — ' +
              'contestar e protecao permanente, nao adiamento de sete dias.</li>' +
            '<li>Resolvida a divergencia, ele registra uma nova conclusao para voce confirmar.</li>' +
          '</ul>' +
        '</div>',

      aoConfirmar: function (fundo) {
        var motivo = fundo.querySelector('#motivo-contestacao').value.trim();
        if (!motivo) {
          UI.toast('O motivo e obrigatorio para contestar.', 'erro');
          return false;
        }
        executar(s.id, 'contestar', { motivo: motivo },
                 'Contestacao enviada. Nenhuma cobranca foi gerada.');
      }
    });
    return modal;
  }

  function abrirCancelamento(s) {
    UI.abrirModal({
      titulo: 'Cancelar solicitacao',
      rotuloConfirmar: 'Cancelar solicitacao',
      classeConfirmar: 'btn-perigo',
      rotuloCancelar: 'Voltar',
      corpo:
        '<p class="painel-apoio">O cancelamento so e permitido enquanto o servico ainda ' +
        'nao comecou.</p>' +
        '<div class="campo" style="margin-top:12px">' +
          '<label for="motivo-cancelamento">Motivo — obrigatorio</label>' +
          '<textarea id="motivo-cancelamento" maxlength="500"></textarea>' +
        '</div>',
      aoConfirmar: function (fundo) {
        var motivo = fundo.querySelector('#motivo-cancelamento').value.trim();
        if (!motivo) { UI.toast('Informe o motivo do cancelamento.', 'erro'); return false; }
        executar(s.id, 'cancelar', { motivo: motivo }, 'Solicitacao cancelada.');
      }
    });
  }

  function abrirAvaliacao(s) {
    var estrelas = [1, 2, 3, 4, 5].map(function (n) {
      return '<label><input type="radio" name="nota" value="' + n + '"' +
             (n === 5 ? ' checked' : '') + '> ' + n + '</label>';
    }).join('');

    UI.abrirModal({
      titulo: 'Avaliar o profissional',
      rotuloConfirmar: 'Enviar avaliacao',
      classeConfirmar: 'btn-escuro',
      rotuloCancelar: 'Agora nao',
      corpo:
        '<p class="painel-apoio">' + UI.escapar(s.prestador.nome) + ' &middot; ' +
          UI.escapar(s.descricao) + '</p>' +
        '<div class="campo" style="margin-top:14px">' +
          '<label>Sua nota</label>' +
          '<div class="caixa-selecao" id="notas">' + estrelas + '</div>' +
        '</div>' +
        '<div class="campo">' +
          '<label for="comentario">Comentario</label>' +
          '<textarea id="comentario" maxlength="500" ' +
            'placeholder="Conte como foi o atendimento para ajudar outros clientes."></textarea>' +
        '</div>' +
        '<p style="font-size:13px;color:var(--texto-3)">A avaliacao e publica e unica para cada servico.</p>',

      aoConfirmar: function (fundo) {
        var marcada = fundo.querySelector('input[name="nota"]:checked');
        executar(s.id, 'avaliar', {
          nota: Number(marcada.value),
          comentario: fundo.querySelector('#comentario').value.trim()
        }, 'Avaliacao enviada. Obrigado!');
      }
    });
  }

  function executar(id, acao, corpo, mensagemDeSucesso) {
    Api.acao(id, acao, corpo)
      .then(function () {
        UI.toast(mensagemDeSucesso, 'ok');
        return carregar();
      })
      .catch(UI.erro);
  }
})();
