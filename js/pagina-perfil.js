/* Perfil publico do profissional (W04/M04).
   Publico de proposito: a conta so e exigida no momento de solicitar. */
(function () {
  'use strict';

  var alvo, sessao;

  UI.iniciarPagina().then(function (inicio) {
    sessao = inicio.sessao;
    alvo = document.getElementById('perfil');
    var id = UI.parametro('id');
    if (!id) { alvo.innerHTML = '<div class="vazio">Profissional nao informado.</div>'; return; }
    return Api.perfilPublico(id).then(desenhar);
  }).catch(UI.erro);

  function desenhar(p) {
    var destino = 'solicitar.html?prestadorId=' + encodeURIComponent(p.id);

    alvo.innerHTML = '' +
      '<article class="cartao">' +
        '<div class="cabecalho-perfil">' +
          '<span class="avatar">' + UI.escapar(UI.iniciais(p.nome)) + '</span>' +
          '<div>' +
            '<h1>' + UI.escapar(p.nome) + '</h1>' +
            UI.estrelas(p.notaMedia, p.quantidadeAvaliacoes) +
            '<p class="painel-apoio" style="margin-top:8px">' +
              UI.escapar(p.descricaoProfissional || '') + '</p>' +
            '<div class="etiquetas">' +
              p.categorias.map(function (c) {
                return '<span class="etiqueta">' + UI.escapar(c) + '</span>';
              }).join('') +
              p.regioes.map(function (r) {
                return '<span class="etiqueta">' + UI.escapar(r) + '</span>';
              }).join('') +
            '</div>' +
          '</div>' +
          '<a class="btn btn-primario" href="' + destino + '">Solicitar servico</a>' +
        '</div>' +
      '</article>' +

      '<div class="aviso aviso-info" style="margin-top:16px">' +
        'Telefone e e-mail nao aparecem aqui. O contato e liberado para os dois lados ' +
        'assim que o profissional aceita a solicitacao, e sem nenhum custo.' +
      '</div>' +

      '<section class="cartao" style="margin-top:16px">' +
        '<h2>Avaliacoes</h2>' +
        (p.avaliacoes.length
          ? p.avaliacoes.map(function (a) {
              return '<div class="avaliacao-item">' +
                       UI.estrelas(a.nota, 1) +
                       '<p style="margin-top:6px">' + UI.escapar(a.comentario || '') + '</p>' +
                       '<p class="meta">' + UI.escapar(a.servico) + ' &middot; ' +
                         UI.escapar(a.dataHora) + '</p>' +
                     '</div>';
            }).join('')
          : '<p class="painel-apoio" style="margin-top:8px">Este profissional ainda nao recebeu avaliacoes. ' +
            'Toda avaliacao no Obrix vem de um servico efetivamente concluido.</p>') +
      '</section>';
  }
})();
