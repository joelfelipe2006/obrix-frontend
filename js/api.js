/* ==========================================================================
   Obrix — camada de acesso a dados
   ==========================================================================
   Toda a comunicacao do front-end passa por aqui. As telas chamam Api.algo()
   e nao sabem de onde veio a resposta.

   Dois modos, mesma assinatura:

     servidor      — fetch para /api/v1, com a sessao no cookie. E o normal,
                     quando a pagina e servida pelo Spring Boot.
     demonstracao  — resolve no navegador (js/demo.js). Entra em acao quando
                     a pagina e aberta direto do disco ou quando a API nao
                     responde, para que as telas possam ser vistas sem servidor.

   Isolar o acesso a dados tem um ganho pratico: trocar a origem nao toca em
   nenhuma tela.
   ========================================================================== */
(function (global) {
  'use strict';

  var BASE = '/api/v1';
  var modo = null;            // definido por Api.iniciar()
  var ouvintesDeModo = [];

  /* ------------------------------------------------------------- utilitarios */

  function ErroApi(codigo, mensagem, campos) {
    var e = new Error(mensagem);
    e.codigo = codigo;
    e.mensagem = mensagem;
    e.campos = campos || [];
    return e;
  }

  function naoServidoPorHttp() {
    return global.location.protocol === 'file:';
  }

  /** Uma chamada ao back-end. Converte o corpo de erro padronizado em excecao. */
  function requisitar(caminho, opcoes) {
    opcoes = opcoes || {};
    var config = {
      method: opcoes.method || 'GET',
      headers: { 'Accept': 'application/json' },
      credentials: 'same-origin'
    };
    if (opcoes.corpo !== undefined) {
      config.headers['Content-Type'] = 'application/json';
      config.body = JSON.stringify(opcoes.corpo);
    }

    return fetch(BASE + caminho, config).then(function (resposta) {
      if (resposta.status === 204) return null;

      return resposta.text().then(function (texto) {
        var dados = null;
        if (texto) {
          try { dados = JSON.parse(texto); } catch (e) { dados = null; }
        }
        if (resposta.ok) return dados;

        if (resposta.status === 401) {
          throw ErroApi('NAO_AUTENTICADO', 'Faca login para continuar.');
        }
        throw ErroApi(
          (dados && dados.codigo) || 'ERRO_' + resposta.status,
          (dados && dados.mensagem) || 'Nao foi possivel completar a operacao.',
          dados && dados.campos
        );
      });
    });
  }

  /* ------------------------------------------------------- deteccao do modo */

  /**
   * Decide o modo uma vez, no carregamento da pagina. A sessao ja volta junto,
   * para a tela nao precisar de uma segunda ida ao servidor.
   */
  function iniciar() {
    if (naoServidoPorHttp()) {
      modo = 'demonstracao';
      avisarModo();
      return Promise.resolve({ modo: modo, sessao: global.ObrixDemo.sessao() });
    }

    return requisitar('/auth/sessao')
      .then(function (sessao) {
        modo = 'servidor';
        avisarModo();
        return { modo: modo, sessao: sessao };
      })
      .catch(function () {
        // API fora do ar: as telas continuam navegaveis com dados de demonstracao.
        modo = 'demonstracao';
        avisarModo();
        return { modo: modo, sessao: global.ObrixDemo.sessao() };
      });
  }

  function avisarModo() {
    ouvintesDeModo.forEach(function (fn) {
      try { fn(modo); } catch (e) { /* um ouvinte com defeito nao derruba a pagina */ }
    });
  }

  function emDemonstracao() { return modo === 'demonstracao'; }

  /** Executa a versao de demonstracao dentro de uma Promise, para a assinatura nao mudar. */
  function demo(fn) {
    try { return Promise.resolve(fn()); }
    catch (e) { return Promise.reject(e); }
  }

  /* ------------------------------------------------------------ superficie */

  var Api = {

    iniciar: iniciar,
    get modo() { return modo; },
    emDemonstracao: emDemonstracao,
    aoDefinirModo: function (fn) { ouvintesDeModo.push(fn); if (modo) fn(modo); },

    sessao: function () {
      if (emDemonstracao()) return demo(function () { return global.ObrixDemo.sessao(); });
      return requisitar('/auth/sessao');
    },

    login: function (email, senha) {
      if (emDemonstracao()) return demo(function () { return global.ObrixDemo.login(email, senha); });
      return requisitar('/auth/login', { method: 'POST', corpo: { email: email, senha: senha } });
    },

    sair: function () {
      if (emDemonstracao()) return demo(function () { return global.ObrixDemo.sair(); });
      return requisitar('/auth/sair', { method: 'POST' });
    },

    cadastrarCliente: function (dados) {
      if (emDemonstracao()) return demo(function () { return global.ObrixDemo.cadastrarCliente(dados); });
      return requisitar('/cadastro/cliente', { method: 'POST', corpo: dados })
        .then(function (sessao) {
          // Cadastro nao autentica: o login entra logo em seguida.
          return Api.login(dados.email, dados.senha).then(function () { return sessao; });
        });
    },

    cadastrarPrestador: function (dados) {
      if (emDemonstracao()) return demo(function () { return global.ObrixDemo.cadastrarPrestador(dados); });
      return requisitar('/cadastro/prestador', { method: 'POST', corpo: dados })
        .then(function (sessao) {
          return Api.login(dados.email, dados.senha).then(function () { return sessao; });
        });
    },

    catalogo: function () {
      if (emDemonstracao()) return demo(function () { return global.ObrixDemo.catalogo(); });
      return requisitar('/catalogo');
    },

    buscarPrestadores: function (filtro) {
      if (emDemonstracao()) return demo(function () { return global.ObrixDemo.buscarPrestadores(filtro); });
      var q = '?categoriaId=' + encodeURIComponent(filtro.categoriaId);
      if (filtro.regiaoId) q += '&regiaoId=' + encodeURIComponent(filtro.regiaoId);
      return requisitar('/prestadores/busca' + q).then(function (pagina) {
        return (pagina && pagina.content) || [];
      });
    },

    perfilPublico: function (id) {
      if (emDemonstracao()) return demo(function () { return global.ObrixDemo.perfilPublico(id); });
      return requisitar('/prestadores/' + encodeURIComponent(id) + '/publico');
    },

    criarSolicitacao: function (dados) {
      if (emDemonstracao()) return demo(function () { return global.ObrixDemo.criarSolicitacao(dados); });
      return requisitar('/solicitacoes', { method: 'POST', corpo: dados });
    },

    minhasSolicitacoes: function () {
      if (emDemonstracao()) return demo(function () { return global.ObrixDemo.minhasSolicitacoes(); });
      return requisitar('/solicitacoes');
    },

    solicitacao: function (id) {
      if (emDemonstracao()) return demo(function () { return global.ObrixDemo.solicitacao(id); });
      return requisitar('/solicitacoes/' + encodeURIComponent(id));
    },

    /**
     * Transicao de estado. O nome da acao e o proprio sub-recurso no back-end:
     * POST /solicitacoes/{id}/confirmar, /contestar, /aceitar, e assim por diante.
     */
    acao: function (id, nome, corpo) {
      if (emDemonstracao()) return demo(function () { return global.ObrixDemo.acao(id, nome, corpo); });
      return requisitar('/solicitacoes/' + encodeURIComponent(id) + '/' + nome,
                        { method: 'POST', corpo: corpo || {} });
    },

    extrato: function () {
      if (emDemonstracao()) return demo(function () { return global.ObrixDemo.extrato(); });
      return requisitar('/solicitacoes/extrato');
    },

    conta: function () {
      if (emDemonstracao()) return demo(function () { return global.ObrixDemo.conta(); });
      return requisitar('/conta');
    },

    atualizarConta: function (dados) {
      if (emDemonstracao()) return demo(function () { return global.ObrixDemo.atualizarConta(dados); });
      return requisitar('/conta', { method: 'PUT', corpo: dados });
    },

    reiniciarDemonstracao: function () {
      if (global.ObrixDemo) global.ObrixDemo.reiniciar();
    }
  };

  global.Api = Api;

})(window);
