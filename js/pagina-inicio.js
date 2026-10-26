/* Tela de inicio e busca (W01/M01).
   A busca e publica: a conta so e exigida na hora de solicitar. */
(function () {
  'use strict';

  var form, selCategoria, selCidade, selRegiao;
  var todasRegioes = [];

  UI.iniciarPagina().then(function () {
    form = document.getElementById('form-busca');
    selCategoria = document.getElementById('categoria');
    selCidade = document.getElementById('cidade');
    selRegiao = document.getElementById('regiao');

    form.addEventListener('submit', buscar);
    selCidade.addEventListener('change', filtrarBairros);

    return Api.catalogo();
  }).then(preencherCatalogo).catch(UI.erro);

  function preencherCatalogo(catalogo) {
    if (!catalogo) return;
    todasRegioes = catalogo.regioes || [];

    (catalogo.categorias || []).forEach(function (c) {
      selCategoria.appendChild(new Option(c.nome, c.id));
    });

    // Cidades distintas, derivadas das regioes do catalogo.
    var cidades = [];
    todasRegioes.forEach(function (r) {
      if (cidades.indexOf(r.cidade) === -1) cidades.push(r.cidade);
    });
    cidades.forEach(function (cidade) {
      selCidade.appendChild(new Option(cidade, cidade));
    });

    filtrarBairros();
  }

  /** O bairro depende da cidade escolhida: lista fechada, nada digitado. */
  function filtrarBairros() {
    var cidade = selCidade.value;
    selRegiao.innerHTML = '';
    selRegiao.appendChild(new Option('Todos os bairros', ''));

    todasRegioes
      .filter(function (r) { return !cidade || r.cidade === cidade; })
      .forEach(function (r) { selRegiao.appendChild(new Option(r.bairro, r.id)); });
  }

  function buscar(evento) {
    evento.preventDefault();
    if (!selCategoria.value) {
      UI.toast('Escolha uma categoria para buscar.', 'erro');
      selCategoria.focus();
      return;
    }
    var destino = 'resultados.html?categoriaId=' + encodeURIComponent(selCategoria.value);
    if (selRegiao.value) destino += '&regiaoId=' + encodeURIComponent(selRegiao.value);
    window.location.href = destino;
  }
})();
