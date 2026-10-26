/* Acesso (W13/M13).
   A mensagem de erro e sempre a mesma, exista ou nao o e-mail: resposta
   diferente permitiria descobrir quem tem conta na plataforma. */
(function () {
  'use strict';

  var form;

  UI.iniciarPagina().then(function (inicio) {
    if (inicio.sessao) { irParaDestino(inicio.sessao); return; }

    form = document.getElementById('form-entrar');
    form.addEventListener('submit', entrar);

    if (Api.emDemonstracao()) {
      var caixa = document.getElementById('contas-demo');
      caixa.hidden = false;
      caixa.querySelectorAll('[data-entrar]').forEach(function (botao) {
        botao.addEventListener('click', function () {
          document.getElementById('email').value = botao.dataset.entrar;
          document.getElementById('senha').value = 'obrix123';
          form.requestSubmit();
        });
      });
    }
  }).catch(UI.erro);

  function entrar(evento) {
    evento.preventDefault();
    UI.limparErros(form);

    var dados = UI.lerFormulario(form);
    var botao = form.querySelector('button[type="submit"]');

    if (!dados.email || !dados.senha) {
      UI.toast('Informe e-mail e senha.', 'erro');
      return;
    }

    UI.ocupado(botao, true, 'Entrando...');
    Api.login(dados.email, dados.senha)
      .then(irParaDestino)
      .catch(function (e) { UI.ocupado(botao, false); UI.erro(e); });
  }

  function irParaDestino(sessao) {
    var destino = UI.parametro('destino');
    if (destino) { window.location.href = destino; return; }
    window.location.href = sessao.perfil === 'CLIENTE'
      ? 'painel-cliente.html' : 'painel-prestador.html';
  }
})();
