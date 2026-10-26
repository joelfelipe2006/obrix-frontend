/* ==========================================================================
   Obrix — componentes e utilitarios de interface
   ==========================================================================
   O que se repete em mais de uma tela mora aqui: cabecalho, selo de status,
   estrelas, modal, aviso flutuante e formatacao.
   ========================================================================== */
(function (global) {
  'use strict';

  var UI = {};

  /* ----------------------------------------------------------- formatacao */

  UI.moeda = function (valor) {
    if (valor === null || valor === undefined || valor === '') return '—';
    var n = Number(valor);
    return 'R$ ' + n.toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  };

  UI.iniciais = function (nome) {
    if (!nome) return '?';
    var partes = String(nome).trim().split(/\s+/);
    var primeira = partes[0] ? partes[0][0] : '';
    var ultima = partes.length > 1 ? partes[partes.length - 1][0] : '';
    return (primeira + ultima).toUpperCase();
  };

  /** Escapa texto que veio de dados, nunca interpolado cru no HTML. */
  UI.escapar = function (texto) {
    if (texto === null || texto === undefined) return '';
    return String(texto)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  };

  UI.parametro = function (nome) {
    return new URLSearchParams(global.location.search).get(nome);
  };

  /* -------------------------------------------------------- selo de status */

  /**
   * O status nunca e comunicado so pela cor: o texto vem junto, sempre.
   * Quem nao distingue cores continua entendendo a tela.
   */
  UI.selo = function (status, rotulo) {
    return '<span class="selo selo-' + UI.escapar(String(status).toLowerCase()) + '">' +
           UI.escapar(rotulo || status) + '</span>';
  };

  UI.estrelas = function (nota, quantidade) {
    var n = Math.round(Number(nota) || 0);
    var html = '<span class="estrelas" aria-hidden="true">';
    for (var i = 1; i <= 5; i++) {
      html += '<span class="' + (i <= n ? '' : 'apagada') + '">★</span>';
    }
    html += '</span>';

    if (!quantidade) {
      return html + ' <span class="sem-avaliacao">Ainda sem avaliacao</span>';
    }
    return html + ' <span class="nota-numero">' + Number(nota).toFixed(1).replace('.', ',') +
           '</span> <span class="sem-avaliacao">(' + quantidade +
           (quantidade === 1 ? ' avaliacao)' : ' avaliacoes)') + '</span>';
  };

  /* --------------------------------------------------------------- avisos */

  UI.toast = function (mensagem, tipo) {
    var area = document.querySelector('.avisos-flutuantes');
    if (!area) {
      area = document.createElement('div');
      area.className = 'avisos-flutuantes';
      area.setAttribute('role', 'status');
      area.setAttribute('aria-live', 'polite');
      document.body.appendChild(area);
    }
    var caixa = document.createElement('div');
    caixa.className = 'toast' + (tipo ? ' toast-' + tipo : '');
    caixa.textContent = mensagem;
    area.appendChild(caixa);
    setTimeout(function () { caixa.remove(); }, 4200);
  };

  UI.erro = function (e) {
    var msg = (e && (e.mensagem || e.message)) || 'Ocorreu um erro inesperado.';
    if (e && e.campos && e.campos.length) msg += ' (' + e.campos.join('; ') + ')';
    UI.toast(msg, 'erro');
    if (e && e.codigo === 'NAO_AUTENTICADO') {
      setTimeout(function () { global.location.href = 'entrar.html'; }, 1200);
    }
  };

  /* ---------------------------------------------------------------- modal */

  /**
   * Modal acessivel: fecha no Esc, devolve o foco ao elemento que o abriu e
   * nao deixa o fundo rolar enquanto esta aberto.
   */
  UI.abrirModal = function (opcoes) {
    var anterior = document.activeElement;

    var fundo = document.createElement('div');
    fundo.className = 'modal-fundo';
    fundo.innerHTML =
      '<div class="modal" role="dialog" aria-modal="true" aria-labelledby="modal-titulo">' +
        '<div class="modal-cabecalho">' +
          '<h2 id="modal-titulo">' + UI.escapar(opcoes.titulo) + '</h2>' +
          '<button type="button" class="modal-fechar" aria-label="Fechar">&times;</button>' +
        '</div>' +
        '<div class="modal-corpo">' + (opcoes.corpo || '') + '</div>' +
        '<div class="modal-rodape">' +
          '<button type="button" class="btn btn-secundario" data-acao="cancelar">' +
            UI.escapar(opcoes.rotuloCancelar || 'Voltar') + '</button>' +
          '<button type="button" class="btn ' + (opcoes.classeConfirmar || 'btn-primario') +
            '" data-acao="confirmar">' + UI.escapar(opcoes.rotuloConfirmar || 'Confirmar') + '</button>' +
        '</div>' +
      '</div>';

    document.body.appendChild(fundo);
    document.body.style.overflow = 'hidden';

    var primeiroCampo = fundo.querySelector('input, textarea, select');
    (primeiroCampo || fundo.querySelector('[data-acao="confirmar"]')).focus();

    function fechar() {
      document.removeEventListener('keydown', aoTeclar);
      fundo.remove();
      document.body.style.overflow = '';
      if (anterior && anterior.focus) anterior.focus();
    }

    function aoTeclar(ev) { if (ev.key === 'Escape') fechar(); }
    document.addEventListener('keydown', aoTeclar);

    fundo.querySelector('.modal-fechar').addEventListener('click', fechar);
    fundo.querySelector('[data-acao="cancelar"]').addEventListener('click', fechar);
    fundo.addEventListener('mousedown', function (ev) { if (ev.target === fundo) fechar(); });

    fundo.querySelector('[data-acao="confirmar"]').addEventListener('click', function () {
      var resultado = opcoes.aoConfirmar ? opcoes.aoConfirmar(fundo) : true;
      if (resultado !== false) fechar();
    });

    return { fechar: fechar, elemento: fundo };
  };

  /* ------------------------------------------------------------- cabecalho */

  /**
   * Monta o cabecalho de acordo com a sessao: visitante ve "Entrar" e
   * "Criar conta"; quem entrou ve o painel do seu perfil e o nome.
   */
  UI.montarTopo = function (sessao) {
    var topo = document.querySelector('[data-topo]');
    if (!topo) return;

    var acoes;
    if (!sessao) {
      acoes =
        '<a class="topo-link" href="index.html#como-funciona">Como funciona</a>' +
        '<a class="topo-link" href="entrar.html">Entrar</a>' +
        '<a class="btn btn-primario btn-pequeno" href="criar-conta.html">Criar conta</a>';
    } else {
      var painel = sessao.perfil === 'CLIENTE' ? 'painel-cliente.html' : 'painel-prestador.html';
      acoes =
        '<a class="topo-link" href="index.html">Buscar profissional</a>' +
        '<a class="topo-link" href="' + painel + '">Meu painel</a>' +
        '<a class="topo-link" href="minha-conta.html">Minha conta</a>' +
        '<span class="avatar" title="' + UI.escapar(sessao.nome) + '">' +
          UI.escapar(UI.iniciais(sessao.nome)) + '</span>' +
        '<button type="button" class="btn-texto" data-sair>Sair</button>';
    }

    topo.innerHTML =
      '<div class="container topo-interno">' +
        '<a class="marca" href="index.html">' +
          '<span class="marca-icone">' +
            '<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3.2" ' +
            'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
            '<path d="M4 12.5l5.5 5.5L20 7"/></svg>' +
          '</span>' +
          '<span class="marca-nome">OBRIX</span>' +
        '</a>' +
        '<nav class="topo-acoes" aria-label="Navegacao principal">' + acoes + '</nav>' +
      '</div>';

    var botaoSair = topo.querySelector('[data-sair]');
    if (botaoSair) {
      botaoSair.addEventListener('click', function () {
        global.Api.sair().then(function () { global.location.href = 'index.html'; });
      });
    }
  };

  /**
   * Faixa que explica de onde vem o dado nesta execucao.
   *
   * <p>Nao e um aviso de defeito: a mesma camada de API conversa com a API REST
   * quando ela esta disponivel, e resolve no navegador quando nao esta.</p>
   */
  UI.montarFaixaDemo = function () {
    if (document.querySelector('.faixa-demo')) return;
    var faixa = document.createElement('div');
    faixa.className = 'faixa-demo';
    faixa.innerHTML = '<div class="container"><strong>Dados de demonstracao</strong> — ' +
      'rodando sem back-end, com um modulo local no navegador. ' +
      'Entre com <strong>ana@exemplo.com</strong> ou <strong>carlos@exemplo.com</strong>, ' +
      'senha <strong>obrix123</strong>.</div>';
    document.body.insertBefore(faixa, document.body.firstChild);
  };

  /* --------------------------------------------------------- formularios */

  UI.lerFormulario = function (form) {
    var dados = {};
    new FormData(form).forEach(function (valor, chave) {
      if (dados[chave] === undefined) {
        dados[chave] = valor;
      } else {
        if (!Array.isArray(dados[chave])) dados[chave] = [dados[chave]];
        dados[chave].push(valor);
      }
    });
    return dados;
  };

  UI.marcarErro = function (form, nome, mensagem) {
    var campo = form.querySelector('[name="' + nome + '"]');
    if (!campo) return;
    var envolvente = campo.closest('.campo');
    if (!envolvente) return;
    envolvente.classList.add('invalido');
    var alvo = envolvente.querySelector('.erro');
    if (!alvo) {
      alvo = document.createElement('span');
      alvo.className = 'erro';
      envolvente.appendChild(alvo);
    }
    alvo.textContent = mensagem;
  };

  UI.limparErros = function (form) {
    form.querySelectorAll('.campo.invalido').forEach(function (c) { c.classList.remove('invalido'); });
    form.querySelectorAll('.campo .erro').forEach(function (e) { e.remove(); });
  };

  UI.ocupado = function (botao, ocupado, textoOcupado) {
    if (!botao) return;
    if (ocupado) {
      botao.dataset.textoOriginal = botao.textContent;
      botao.textContent = textoOcupado || 'Aguarde...';
      botao.disabled = true;
    } else {
      if (botao.dataset.textoOriginal) botao.textContent = botao.dataset.textoOriginal;
      botao.disabled = false;
    }
  };

  /* ------------------------------------------------------------- inicio */

  /**
   * Toda pagina comeca por aqui: define o modo, monta o cabecalho e entrega
   * a sessao para o script da tela.
   */
  UI.iniciarPagina = function (opcoes) {
    opcoes = opcoes || {};
    return global.Api.iniciar().then(function (inicio) {
      if (inicio.modo === 'demonstracao') UI.montarFaixaDemo();
      UI.montarTopo(inicio.sessao);

      if (opcoes.exigeSessao && !inicio.sessao) {
        var destino = global.location.pathname.split('/').pop() + global.location.search;
        global.location.href = 'entrar.html?destino=' + encodeURIComponent(destino);
        return inicio;
      }
      if (opcoes.perfil && inicio.sessao && inicio.sessao.perfil !== opcoes.perfil) {
        var painel = inicio.sessao.perfil === 'CLIENTE' ? 'painel-cliente.html' : 'painel-prestador.html';
        global.location.href = painel;
        return inicio;
      }
      return inicio;
    });
  };

  global.UI = UI;

})(window);
