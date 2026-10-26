/* Resultados da busca (W03/M03).
   Duas decisoes de interface valem nota aqui:
   - quem ainda nao tem avaliacao aparece em bloco separado e sinalizado, para
     que um cadastro novo nao seja lido como mal avaliado;
   - nenhum cartao mostra telefone: o contato so e liberado depois do aceite. */
(function () {
  'use strict';

  var lista, selCategoria, selRegiao, titulo, resumo;
  var catalogo = { categorias: [], regioes: [] };

  UI.iniciarPagina().then(function () {
    lista = document.getElementById('lista');
    titulo = document.getElementById('titulo');
    resumo = document.getElementById('resumo');
    selCategoria = document.getElementById('categoria');
    selRegiao = document.getElementById('regiao');

    document.getElementById('form-filtros').addEventListener('submit', function (e) {
      e.preventDefault();
      aplicar(selCategoria.value, selRegiao.value);
    });

    return Api.catalogo();
  }).then(function (dados) {
    catalogo = dados || catalogo;

    catalogo.categorias.forEach(function (c) {
      selCategoria.appendChild(new Option(c.nome, c.id));
    });
    catalogo.regioes.forEach(function (r) {
      selRegiao.appendChild(new Option(r.descricao, r.id));
    });

    selCategoria.value = UI.parametro('categoriaId') || (catalogo.categorias[0] || {}).id || '';
    selRegiao.value = UI.parametro('regiaoId') || '';

    return carregar();
  }).catch(UI.erro);

  function aplicar(categoriaId, regiaoId) {
    var destino = 'resultados.html?categoriaId=' + encodeURIComponent(categoriaId);
    if (regiaoId) destino += '&regiaoId=' + encodeURIComponent(regiaoId);
    window.location.href = destino;
  }

  function carregar() {
    var filtro = { categoriaId: selCategoria.value, regiaoId: selRegiao.value || null };
    if (!filtro.categoriaId) { lista.innerHTML = vazio('Escolha uma categoria.'); return; }

    lista.innerHTML = '<p class="painel-apoio">Carregando profissionais...</p>';

    return Api.buscarPrestadores(filtro).then(function (prestadores) {
      var nomeCategoria = (catalogo.categorias.filter(function (c) {
        return String(c.id) === String(filtro.categoriaId);
      })[0] || {}).nome || 'Profissionais';
      var nomeRegiao = filtro.regiaoId ? (catalogo.regioes.filter(function (r) {
        return String(r.id) === String(filtro.regiaoId);
      })[0] || {}).descricao : null;

      titulo.textContent = nomeCategoria;
      resumo.textContent = prestadores.length +
        (prestadores.length === 1 ? ' profissional encontrado' : ' profissionais encontrados') +
        (nomeRegiao ? ' em ' + nomeRegiao : '');

      desenhar(prestadores);
    });
  }

  function desenhar(prestadores) {
    if (!prestadores.length) {
      lista.innerHTML = vazio('Nenhum profissional atende essa categoria nessa regiao ainda.');
      return;
    }

    var avaliados = prestadores.filter(function (p) { return p.quantidadeAvaliacoes > 0; });
    var novos = prestadores.filter(function (p) { return !p.quantidadeAvaliacoes; });

    var html = avaliados.map(cartao).join('');
    if (novos.length) {
      html += '<p class="divisor-sem-nota">Profissionais que ainda nao receberam avaliacao ' +
              'aparecem separados, para que um cadastro novo nao pareca mal avaliado.</p>' +
              novos.map(cartao).join('');
    }
    lista.innerHTML = html;
  }

  function cartao(p) {
    return '' +
      '<article class="cartao cartao-prestador">' +
        '<span class="avatar">' + UI.escapar(UI.iniciais(p.nome)) + '</span>' +
        '<div>' +
          '<h3>' + UI.escapar(p.nome) + '</h3>' +
          UI.estrelas(p.notaMedia, p.quantidadeAvaliacoes) +
          '<p class="desc">' + UI.escapar(p.descricaoProfissional || '') + '</p>' +
          '<div class="etiquetas">' +
            (p.categorias || []).map(function (c) {
              return '<span class="etiqueta">' + UI.escapar(c) + '</span>';
            }).join('') +
            (p.regioes || []).map(function (r) {
              return '<span class="etiqueta">' + UI.escapar(r) + '</span>';
            }).join('') +
          '</div>' +
        '</div>' +
        '<a class="btn btn-secundario" href="perfil.html?id=' + encodeURIComponent(p.id) + '">Ver perfil</a>' +
      '</article>';
  }

  function vazio(mensagem) {
    return '<div class="vazio">' + UI.escapar(mensagem) + '</div>';
  }
})();
