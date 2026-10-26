/* Painel do profissional e extrato de cobrancas (W08/M08, W14/M14).
   Cada cartao mostra apenas as acoes permitidas naquele status — a lista vem
   do back-end, para a regra nao ficar duplicada aqui. */
(function () {
  'use strict';

  var lista, abas, indicadores, filtroAtual = 'pendentes';
  var solicitacoes = [], extrato = null;

  var GRUPOS = {
    pendentes:  function (s) { return s.status === 'SOLICITADA'; },
    andamento:  function (s) {
      return ['ACEITA', 'EM_EXECUCAO', 'AGUARDANDO_CONFIRMACAO', 'CONTESTADA'].indexOf(s.status) !== -1;
    },
    concluidos: function (s) { return s.status === 'CONCLUIDA'; }
  };

  UI.iniciarPagina({ exigeSessao: true, perfil: 'PRESTADOR' }).then(function (inicio) {
    if (!inicio.sessao) return;

    lista = document.getElementById('lista');
    abas = document.getElementById('abas');
    indicadores = document.getElementById('indicadores');

    abas.addEventListener('click', function (ev) {
      var botao = ev.target.closest('.aba');
      if (!botao) return;
      filtroAtual = botao.dataset.filtro;
      abas.querySelectorAll('.aba').forEach(function (a) {
        a.setAttribute('aria-selected', String(a === botao));
      });
      desenhar();
    });

    lista.addEventListener('click', aoClicar);
    return carregar();
  }).catch(UI.erro);

  function carregar() {
    lista.innerHTML = '<p class="painel-apoio">Carregando...</p>';
    return Promise.all([Api.minhasSolicitacoes(), Api.extrato()]).then(function (r) {
      solicitacoes = r[0] || [];
      extrato = r[1] || { itens: [], totalComissao: 0, totalServicos: 0 };
      desenharIndicadores();
      desenhar();
    });
  }

  function desenharIndicadores() {
    var concluidos = solicitacoes.filter(function (s) { return s.status === 'CONCLUIDA'; }).length;
    var notas = solicitacoes.filter(function (s) { return s.notaAvaliacao; })
                            .map(function (s) { return s.notaAvaliacao; });
    var media = notas.length
      ? (notas.reduce(function (a, b) { return a + b; }, 0) / notas.length).toFixed(1).replace('.', ',')
      : '—';

    var apoioNota = notas.length
      ? notas.length + (notas.length === 1 ? ' avaliacao' : ' avaliacoes')
      : 'Sem avaliacoes ainda';

    indicadores.innerHTML =
      bloco('Nota media', media, apoioNota) +
      bloco('Servicos concluidos', String(concluidos), 'Confirmados pelo cliente') +
      bloco('Comissoes registradas', UI.moeda(extrato.totalComissao),
            'Sobre ' + UI.moeda(extrato.totalServicos) + ' em servicos');
  }

  function bloco(rotulo, numero, apoio) {
    return '<article class="cartao indicador">' +
             '<div class="rotulo">' + UI.escapar(rotulo) + '</div>' +
             '<div class="numero">' + UI.escapar(numero) + '</div>' +
             '<div class="apoio">' + UI.escapar(apoio) + '</div>' +
           '</article>';
  }

  function desenhar() {
    var pendentes = solicitacoes.filter(GRUPOS.pendentes).length;
    abas.querySelector('[data-filtro="pendentes"]').innerHTML =
      'Solicitacoes' + (pendentes ? ' <span class="contador">' + pendentes + '</span>' : '');

    if (filtroAtual === 'extrato') { desenharExtrato(); return; }

    var filtradas = solicitacoes.filter(GRUPOS[filtroAtual]);
    if (!filtradas.length) {
      lista.innerHTML = '<div class="vazio">Nenhum servico neste filtro.</div>';
      return;
    }
    lista.innerHTML = filtradas.map(cartao).join('');
  }

  function cartao(s) {
    var valor = '';
    if (s.valorFinal !== null && s.valorFinal !== undefined) {
      valor = '<div class="valor-bloco">' +
                '<div class="valor-rotulo">Valor acordado</div>' +
                '<div class="valor-numero">' + UI.moeda(s.valorFinal) + '</div>' +
                (s.status === 'AGUARDANDO_CONFIRMACAO' && s.prazoConfirmacao
                  ? '<div class="nota">Cliente tem ate ' + UI.escapar(s.prazoConfirmacao) +
                    ' para confirmar</div>' : '') +
              '</div>';
    }

    return '' +
      '<article class="cartao cartao-servico' +
        (s.status === 'CONTESTADA' ? ' cartao-destaque' : '') + '">' +
        '<div>' +
          '<div class="cabecalho">' +
            UI.selo(s.status, s.statusRotulo) +
            '<span class="meta">Recebida em ' + UI.escapar(s.dataCriacao) + '</span>' +
            (s.status === 'SOLICITADA'
              ? '<span class="meta">sem nenhum custo para voce</span>' : '') +
          '</div>' +
          '<h3>' + UI.escapar(s.descricao) + '</h3>' +
          '<p class="sub">' + UI.escapar(s.categoria) + ' &middot; ' +
            UI.escapar(s.regiao) + ' &middot; para ' + UI.escapar(s.dataDesejada) + '</p>' +
          contato(s) +
          (s.status === 'CONTESTADA'
            ? '<p class="nota"><strong>Nenhuma cobranca foi gerada.</strong> ' +
              'Motivo informado pelo cliente: ' + UI.escapar(s.motivo || '—') +
              '. Resolva a divergencia e registre a conclusao novamente.</p>'
            : '') +
          (s.status === 'CONCLUIDA' && s.cobranca
            ? '<p class="nota">Comissao de ' + UI.moeda(s.cobranca.valorComissao) +
              ' sobre ' + UI.moeda(s.cobranca.valorServico) +
              (s.confirmacaoAutomatica ? ' — confirmacao automatica por prazo.' : '.') + '</p>'
            : '') +
          (s.status === 'EM_EXECUCAO'
            ? '<p class="nota">Ao registrar a conclusao, o cliente tera 7 dias para confirmar. ' +
              'A comissao so e gerada na confirmacao.</p>'
            : '') +
        '</div>' +
        valor +
        acoes(s) +
      '</article>';
  }

  function contato(s) {
    if (!s.cliente || !s.cliente.telefone) return '';
    return '<p class="sub">Contato liberado: ' + UI.escapar(s.cliente.nome) + ' &middot; ' +
           UI.escapar(s.cliente.telefone) + ' &middot; ' + UI.escapar(s.cliente.email) + '</p>';
  }

  function acoes(s) {
    if (!s.acoesDisponiveis.length) return '<div></div>';

    var botoes = s.acoesDisponiveis.map(function (acao) {
      var classe = (acao === 'aceitar' || acao === 'concluir') ? 'btn-primario'
                 : acao === 'cancelar' ? 'btn-perigo'
                 : acao === 'iniciar' ? 'btn-escuro' : 'btn-secundario';
      var rotulo = { aceitar: 'Aceitar', recusar: 'Recusar', iniciar: 'Iniciar execucao',
                     concluir: 'Registrar conclusao', cancelar: 'Cancelar' }[acao] || acao;
      return '<button type="button" class="btn ' + classe + '" ' +
             'data-acao="' + acao + '" data-id="' + s.id + '">' + rotulo + '</button>';
    }).join('');

    return '<div class="acoes">' + botoes + '</div>';
  }

  /* ---------------------------------------------------------- extrato */

  function desenharExtrato() {
    if (!extrato.itens.length) {
      lista.innerHTML = '<div class="vazio">Nenhuma cobranca ainda. ' +
        'Toda linha deste extrato corresponde a um servico que o cliente confirmou como concluido.</div>';
      return;
    }

    lista.innerHTML =
      '<div class="aviso aviso-info" style="margin-bottom:16px">' +
        'Nenhuma linha deste extrato nasce de um contato recebido: toda cobranca ' +
        'corresponde a um servico confirmado pelo cliente.' +
      '</div>' +
      '<div class="tabela-envolvente"><table class="extrato">' +
        '<thead><tr>' +
          '<th>Servico de origem</th><th>Cliente</th><th>Data</th>' +
          '<th style="text-align:right">Valor do servico</th>' +
          '<th style="text-align:right">Comissao (10%)</th>' +
        '</tr></thead>' +
        '<tbody>' +
          extrato.itens.map(function (i) {
            return '<tr>' +
              '<td>' + UI.escapar(i.servico) + '</td>' +
              '<td>' + UI.escapar(i.cliente) + '</td>' +
              '<td>' + UI.escapar(i.data) + '</td>' +
              '<td class="valor">' + UI.moeda(i.valorServico) + '</td>' +
              '<td class="valor">' + UI.moeda(i.valorComissao) + '</td>' +
            '</tr>';
          }).join('') +
        '</tbody>' +
        '<tfoot><tr>' +
          '<td colspan="3">Total</td>' +
          '<td class="valor">' + UI.moeda(extrato.totalServicos) + '</td>' +
          '<td class="valor">' + UI.moeda(extrato.totalComissao) + '</td>' +
        '</tr></tfoot>' +
      '</table></div>';
  }

  /* ------------------------------------------------------------ acoes */

  function aoClicar(ev) {
    var botao = ev.target.closest('[data-acao]');
    if (!botao) return;

    var id = Number(botao.dataset.id);
    var s = solicitacoes.filter(function (x) { return x.id === id; })[0];
    if (!s) return;

    switch (botao.dataset.acao) {
      case 'aceitar':  aceitar(s); break;
      case 'iniciar':  executar(s.id, 'iniciar', {}, 'Execucao iniciada.'); break;
      case 'recusar':  pedirMotivo(s, 'recusar', 'Recusar solicitacao', 'Solicitacao recusada.'); break;
      case 'cancelar': pedirMotivo(s, 'cancelar', 'Cancelar solicitacao', 'Solicitacao cancelada.'); break;
      case 'concluir': abrirConclusao(s); break;
    }
  }

  function aceitar(s) {
    UI.abrirModal({
      titulo: 'Aceitar solicitacao',
      rotuloConfirmar: 'Aceitar',
      corpo:
        '<h3>' + UI.escapar(s.descricao) + '</h3>' +
        '<p class="painel-apoio" style="margin-top:6px">' + UI.escapar(s.categoria) +
          ' &middot; ' + UI.escapar(s.regiao) + '</p>' +
        '<div class="aviso aviso-ok" style="margin-top:14px">' +
          'Ao aceitar, telefone e e-mail sao liberados para os dois lados, sem nenhum custo. ' +
          'A comissao so existe depois que o cliente confirmar a conclusao.' +
        '</div>',
      aoConfirmar: function () { executar(s.id, 'aceitar', {}, 'Solicitacao aceita. Contatos liberados.'); }
    });
  }

  function pedirMotivo(s, acao, titulo, mensagem) {
    UI.abrirModal({
      titulo: titulo,
      rotuloConfirmar: titulo,
      classeConfirmar: 'btn-perigo',
      corpo:
        '<p class="painel-apoio">' + UI.escapar(s.descricao) + '</p>' +
        '<div class="campo" style="margin-top:12px">' +
          '<label for="motivo">Motivo — obrigatorio</label>' +
          '<textarea id="motivo" maxlength="500"></textarea>' +
        '</div>',
      aoConfirmar: function (fundo) {
        var motivo = fundo.querySelector('#motivo').value.trim();
        if (!motivo) { UI.toast('Informe o motivo.', 'erro'); return false; }
        executar(s.id, acao, { motivo: motivo }, mensagem);
      }
    });
  }

  /** Registrar a conclusao nao gera cobranca: so inicia o prazo do cliente. */
  function abrirConclusao(s) {
    UI.abrirModal({
      titulo: 'Registrar conclusao',
      rotuloConfirmar: 'Registrar conclusao',
      corpo:
        '<h3>' + UI.escapar(s.descricao) + '</h3>' +
        '<p class="painel-apoio" style="margin-top:6px">' +
          UI.escapar(s.cliente ? s.cliente.nome : '') + '</p>' +
        '<div class="campo" style="margin-top:14px">' +
          '<label for="valor-final">Valor final acordado</label>' +
          '<input type="number" id="valor-final" min="0.01" step="0.01" ' +
            'value="' + (s.valorFinal || '') + '" placeholder="0,00">' +
          '<span class="ajuda">E sobre este valor que a comissao de 10% sera calculada.</span>' +
        '</div>' +
        '<div class="aviso aviso-alerta" style="display:block">' +
          '<strong>O que acontece agora</strong>' +
          '<p style="margin-top:6px;font-size:14px">O cliente tera 7 dias para confirmar ou contestar. ' +
          'A cobranca da comissao so e gerada na confirmacao — e, se ele contestar, ' +
          'a confirmacao automatica deixa de valer para este servico.</p>' +
        '</div>',
      aoConfirmar: function (fundo) {
        var valor = Number(fundo.querySelector('#valor-final').value);
        if (!valor || valor <= 0) {
          UI.toast('Informe um valor maior que zero.', 'erro');
          return false;
        }
        executar(s.id, 'concluir', { valorFinal: valor },
                 'Conclusao registrada. Aguardando a confirmacao do cliente.');
      }
    });
  }

  function executar(id, acao, corpo, mensagem) {
    Api.acao(id, acao, corpo)
      .then(function () { UI.toast(mensagem, 'ok'); return carregar(); })
      .catch(UI.erro);
  }
})();
