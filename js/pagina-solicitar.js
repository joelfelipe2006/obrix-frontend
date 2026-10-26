/* Nova solicitacao (W05/M05). Quarta e ultima tela do fluxo de contratacao. */
(function () {
  'use strict';

  var form, prestador, catalogo = { categorias: [], regioes: [] }, sessao;

  UI.iniciarPagina({ exigeSessao: true, perfil: 'CLIENTE' }).then(function (inicio) {
    if (!inicio.sessao) return;
    sessao = inicio.sessao;
    form = document.getElementById('form-solicitar');

    var prestadorId = UI.parametro('prestadorId');
    if (!prestadorId) {
      document.getElementById('resumo-prestador').innerHTML =
        '<div class="vazio">Escolha um profissional pela busca.</div>';
      form.hidden = true;
      return;
    }

    return Promise.all([Api.perfilPublico(prestadorId), Api.catalogo(), Api.conta()])
      .then(function (resultados) {
        prestador = resultados[0];
        catalogo = resultados[1];
        preencher(resultados[2]);
        form.addEventListener('submit', enviar);
        document.getElementById('regiaoId').addEventListener('change', sincronizarEndereco);
      });
  }).catch(UI.erro);

  function preencher(conta) {
    document.getElementById('resumo-prestador').innerHTML =
      '<div class="resumo-prestador">' +
        '<span class="avatar">' + UI.escapar(UI.iniciais(prestador.nome)) + '</span>' +
        '<div>' +
          '<h3>' + UI.escapar(prestador.nome) + '</h3>' +
          UI.estrelas(prestador.notaMedia, prestador.quantidadeAvaliacoes) +
        '</div>' +
      '</div>';

    // So as categorias e regioes que este profissional atende: a regra do RF12
    // aparece na interface como ausencia de opcao invalida, nao como erro depois.
    var selCategoria = document.getElementById('categoriaId');
    catalogo.categorias
      .filter(function (c) { return prestador.categorias.indexOf(c.nome) !== -1; })
      .forEach(function (c) { selCategoria.appendChild(new Option(c.nome, c.id)); });

    var selRegiao = document.getElementById('regiaoId');
    catalogo.regioes
      .filter(function (r) { return prestador.regioes.indexOf(r.descricao) !== -1; })
      .forEach(function (r) { selRegiao.appendChild(new Option(r.descricao, r.id)); });

    var endereco = (conta && conta.endereco) || {};
    document.getElementById('cep').value = endereco.cep || '';
    document.getElementById('logradouro').value = endereco.logradouro || '';
    document.getElementById('numero').value = endereco.numero || '';

    var hoje = new Date();
    var campoData = document.getElementById('dataDesejada');
    campoData.min = hoje.toISOString().slice(0, 10);
    hoje.setDate(hoje.getDate() + 2);
    campoData.value = hoje.toISOString().slice(0, 10);

    sincronizarEndereco();
  }

  /** Cidade e bairro vem da regiao escolhida na lista, nunca digitados. */
  function sincronizarEndereco() {
    var id = document.getElementById('regiaoId').value;
    var regiao = catalogo.regioes.filter(function (r) { return String(r.id) === String(id); })[0];
    document.getElementById('cidade').value = regiao ? regiao.cidade : '';
    document.getElementById('bairro').value = regiao ? regiao.bairro : '';
  }

  function enviar(evento) {
    evento.preventDefault();
    UI.limparErros(form);

    var d = UI.lerFormulario(form);
    var botao = form.querySelector('button[type="submit"]');

    if (!d.descricao || !d.descricao.trim()) {
      UI.marcarErro(form, 'descricao', 'Descreva o que voce precisa.');
      return;
    }
    if (!d.logradouro || !d.numero) {
      UI.marcarErro(form, 'logradouro', 'Informe o endereco onde o servico sera feito.');
      return;
    }

    UI.ocupado(botao, true, 'Enviando...');

    Api.criarSolicitacao({
      prestadorId: Number(UI.parametro('prestadorId')),
      categoriaId: Number(d.categoriaId),
      regiaoId: Number(d.regiaoId),
      descricao: d.descricao.trim(),
      dataDesejada: d.dataDesejada,
      enderecoExecucao: {
        cep: d.cep, logradouro: d.logradouro, numero: d.numero,
        bairro: d.bairro, cidade: d.cidade, estado: 'GO'
      }
    }).then(function () {
      UI.toast('Solicitacao enviada. O profissional vai responder em breve.', 'ok');
      setTimeout(function () { window.location.href = 'painel-cliente.html'; }, 900);
    }).catch(function (e) {
      UI.ocupado(botao, false);
      UI.erro(e);
    });
  }
})();
