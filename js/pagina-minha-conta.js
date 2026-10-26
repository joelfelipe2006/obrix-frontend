/* Minha conta (W12/M12).
   O bloco de privacidade reune os tres direitos da LGPD numa tela so:
   exportar, desativar e excluir — e explica que excluir e anonimizar. */
(function () {
  'use strict';

  var form, conta, catalogo = { categorias: [], regioes: [] };

  UI.iniciarPagina({ exigeSessao: true }).then(function (inicio) {
    if (!inicio.sessao) return;
    form = document.getElementById('form-conta');
    return Promise.all([Api.conta(), Api.catalogo()]);
  }).then(function (r) {
    if (!r) return;
    conta = r[0];
    catalogo = r[1];
    preencher();
    form.addEventListener('submit', salvar);
    ligarPrivacidade();
  }).catch(UI.erro);

  function preencher() {
    document.getElementById('nome').value = conta.nome || '';
    document.getElementById('email').value = conta.email || '';
    document.getElementById('telefone').value = conta.telefone || '';
    document.getElementById('versao-termos').textContent = conta.termosVersao || '1.0';
    document.getElementById('estado-email').textContent =
      conta.emailVerificado ? 'E-mail verificado.' : 'E-mail ainda nao verificado.';

    if (conta.perfil !== 'PRESTADOR') return;

    document.querySelectorAll('[data-bloco="prestador"]').forEach(function (b) { b.hidden = false; });
    document.getElementById('cpf').value = conta.cpfMascarado || '';
    document.getElementById('descricaoProfissional').value = conta.descricaoProfissional || '';

    document.getElementById('categorias').innerHTML = catalogo.categorias.map(function (c) {
      var marcada = (conta.categoriaIds || []).indexOf(c.id) !== -1;
      return '<label><input type="checkbox" name="categoriaIds" value="' + c.id + '"' +
             (marcada ? ' checked' : '') + '> ' + UI.escapar(c.nome) + '</label>';
    }).join('');

    document.getElementById('regioes').innerHTML = catalogo.regioes.map(function (r) {
      var marcada = (conta.regiaoIds || []).indexOf(r.id) !== -1;
      return '<label><input type="checkbox" name="regiaoIds" value="' + r.id + '"' +
             (marcada ? ' checked' : '') + '> ' + UI.escapar(r.descricao) + '</label>';
    }).join('');
  }

  function salvar(evento) {
    evento.preventDefault();
    var d = UI.lerFormulario(form);
    var botao = form.querySelector('button[type="submit"]');

    var dados = { nome: d.nome, telefone: d.telefone };

    if (conta.perfil === 'PRESTADOR') {
      var categoriaIds = [].concat(d.categoriaIds || []).filter(Boolean).map(Number);
      var regiaoIds = [].concat(d.regiaoIds || []).filter(Boolean).map(Number);
      if (!categoriaIds.length || !regiaoIds.length) {
        UI.toast('Mantenha ao menos uma categoria e uma regiao ativas.', 'erro');
        return;
      }
      dados.descricaoProfissional = d.descricaoProfissional;
      dados.categoriaIds = categoriaIds;
      dados.regiaoIds = regiaoIds;
    } else {
      dados.endereco = conta.endereco;
    }

    UI.ocupado(botao, true, 'Salvando...');
    Api.atualizarConta(dados)
      .then(function (atualizada) {
        conta = atualizada;
        UI.ocupado(botao, false);
        UI.toast('Dados atualizados.', 'ok');
      })
      .catch(function (e) { UI.ocupado(botao, false); UI.erro(e); });
  }

  function ligarPrivacidade() {
    document.getElementById('exportar').addEventListener('click', function () {
      var arquivo = new Blob([JSON.stringify(conta, null, 2)], { type: 'application/json' });
      var url = URL.createObjectURL(arquivo);
      var link = document.createElement('a');
      link.href = url;
      link.download = 'obrix-meus-dados.json';
      link.click();
      URL.revokeObjectURL(url);
      UI.toast('Arquivo gerado com os seus dados.', 'ok');
    });

    document.getElementById('desativar').addEventListener('click', function () {
      UI.abrirModal({
        titulo: 'Desativar conta',
        rotuloConfirmar: 'Desativar',
        classeConfirmar: 'btn-perigo',
        corpo: '<p>Seu perfil sai dos resultados de busca e voce para de receber solicitacoes. ' +
               'Voce continua podendo entrar e reativar quando quiser.</p>',
        aoConfirmar: function () { UI.toast('Conta desativada.', 'ok'); }
      });
    });

    document.getElementById('excluir').addEventListener('click', function () {
      UI.abrirModal({
        titulo: 'Excluir minha conta',
        rotuloConfirmar: 'Excluir definitivamente',
        classeConfirmar: 'btn-perigo',
        corpo:
          '<p>A exclusao e <strong>anonimizacao</strong>, nao apagamento.</p>' +
          '<ul class="lista-efeitos" style="margin-top:10px;padding-left:18px;color:var(--texto-2)">' +
            '<li>Seus dados pessoais sao anonimizados em ate 30 dias.</li>' +
            '<li>O historico dos servicos e as cobrancas permanecem, sem identificar voce.</li>' +
            '<li>A conta deixa de autenticar imediatamente.</li>' +
          '</ul>' +
          '<p style="margin-top:10px;font-size:13.5px;color:var(--texto-3)">' +
            'Apagar de verdade quebraria o historico da outra parte da transacao.</p>',
        aoConfirmar: function () { UI.toast('Solicitacao de exclusao registrada.', 'ok'); }
      });
    });
  }
})();
