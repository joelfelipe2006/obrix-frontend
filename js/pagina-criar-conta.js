/* Criar conta (W02/M02 e M15).
   Um formulario, dois perfis: os blocos exclusivos aparecem conforme a escolha.
   O CPF so e pedido ao profissional — minimizacao de dados pessoais. */
(function () {
  'use strict';

  var form, perfil = 'cliente', catalogo = { categorias: [], regioes: [] };

  UI.iniciarPagina().then(function (inicio) {
    if (inicio.sessao) {
      window.location.href = inicio.sessao.perfil === 'CLIENTE'
        ? 'painel-cliente.html' : 'painel-prestador.html';
      return;
    }

    form = document.getElementById('form-conta');
    form.addEventListener('submit', enviar);

    var seletor = document.getElementById('seletor-perfil');
    seletor.addEventListener('click', function (ev) {
      var botao = ev.target.closest('[data-perfil]');
      if (botao) trocarPerfil(botao.dataset.perfil);
    });

    if (UI.parametro('perfil') === 'prestador') trocarPerfil('prestador');

    return Api.catalogo();
  }).then(function (dados) {
    if (!dados) return;
    catalogo = dados;

    document.getElementById('categorias').innerHTML = catalogo.categorias.map(function (c) {
      return '<label><input type="checkbox" name="categoriaIds" value="' + c.id + '"> ' +
             UI.escapar(c.nome) + '</label>';
    }).join('');

    document.getElementById('regioes').innerHTML = catalogo.regioes.map(function (r) {
      return '<label><input type="checkbox" name="regiaoIds" value="' + r.id + '"> ' +
             UI.escapar(r.descricao) + '</label>';
    }).join('');
  }).catch(UI.erro);

  function trocarPerfil(novo) {
    perfil = novo;
    document.querySelectorAll('[data-perfil]').forEach(function (b) {
      b.setAttribute('aria-pressed', String(b.dataset.perfil === novo));
    });
    document.querySelector('[data-bloco="cliente"]').hidden = novo !== 'cliente';
    document.querySelector('[data-bloco="prestador"]').hidden = novo !== 'prestador';
  }

  function enviar(evento) {
    evento.preventDefault();
    UI.limparErros(form);

    var d = UI.lerFormulario(form);
    var botao = form.querySelector('button[type="submit"]');

    if (!d.nome || !d.email || !d.telefone || !d.senha) {
      UI.toast('Preencha nome, e-mail, telefone e senha.', 'erro');
      return;
    }
    if (String(d.senha).length < 8 || !/[A-Za-z]/.test(d.senha) || !/\d/.test(d.senha)) {
      UI.marcarErro(form, 'senha', 'Use ao menos 8 caracteres, com letras e numeros.');
      return;
    }
    if (!d.aceiteTermos) {
      UI.toast('E preciso aceitar os termos de uso.', 'erro');
      return;
    }

    var comum = {
      nome: d.nome.trim(), email: d.email.trim(), telefone: d.telefone.trim(),
      senha: d.senha, aceiteTermos: true
    };

    UI.ocupado(botao, true, 'Criando conta...');

    var envio;
    if (perfil === 'cliente') {
      comum.endereco = {
        cep: d.cep || '', logradouro: d.logradouro || '', numero: d.numero || '',
        bairro: d.bairro || '', cidade: d.cidade || 'Goiania', estado: 'GO'
      };
      envio = Api.cadastrarCliente(comum);
    } else {
      var categoriaIds = [].concat(d.categoriaIds || []).filter(Boolean);
      var regiaoIds = [].concat(d.regiaoIds || []).filter(Boolean);

      if (!categoriaIds.length || !regiaoIds.length) {
        UI.ocupado(botao, false);
        UI.toast('Selecione ao menos uma categoria e uma regiao de atuacao.', 'erro');
        return;
      }
      comum.cpf = d.cpf || '';
      comum.descricaoProfissional = d.descricaoProfissional || '';
      comum.categoriaIds = categoriaIds.map(Number);
      comum.regiaoIds = regiaoIds.map(Number);
      envio = Api.cadastrarPrestador(comum);
    }

    envio.then(function () {
      UI.toast('Conta criada. Bem-vindo ao Obrix!', 'ok');
      setTimeout(function () {
        window.location.href = perfil === 'cliente' ? 'painel-cliente.html' : 'painel-prestador.html';
      }, 800);
    }).catch(function (e) {
      UI.ocupado(botao, false);
      UI.erro(e);
    });
  }
})();
