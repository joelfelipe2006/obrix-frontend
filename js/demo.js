/* ==========================================================================
   Obrix — modo demonstracao
   ==========================================================================
   Implementa a mesma superficie da API do back-end, mas resolvendo tudo no
   navegador. Serve para abrir o front-end sem servidor nenhum — e para provar
   que a camada de dados esta isolada do resto do codigo: nenhuma tela sabe
   se a resposta veio daqui ou do Spring Boot.

   As regras replicadas abaixo sao as mesmas de SolicitacaoService.java.
   ========================================================================== */
(function (global) {
  'use strict';

  var CHAVE = 'obrix.demo.v1';
  var PERCENTUAL_COMISSAO = 10;
  var PRAZO_CONFIRMACAO_DIAS = 7;

  /* As transicoes permitidas. Mesmo mapa da entidade Solicitacao. */
  var TRANSICOES = {
    SOLICITADA:             ['ACEITA', 'RECUSADA', 'CANCELADA'],
    ACEITA:                 ['EM_EXECUCAO', 'CANCELADA'],
    EM_EXECUCAO:            ['AGUARDANDO_CONFIRMACAO'],
    AGUARDANDO_CONFIRMACAO: ['CONCLUIDA', 'CONTESTADA'],
    CONTESTADA:             ['AGUARDANDO_CONFIRMACAO'],
    RECUSADA: [], CANCELADA: [], CONCLUIDA: []
  };

  var ROTULOS = {
    SOLICITADA: 'Solicitada', ACEITA: 'Aceita', RECUSADA: 'Recusada',
    EM_EXECUCAO: 'Em execucao', AGUARDANDO_CONFIRMACAO: 'Aguardando confirmacao',
    CONTESTADA: 'Contestada', CONCLUIDA: 'Concluida', CANCELADA: 'Cancelada'
  };

  /* ---------------------------------------------------------------- estado */

  var memoria = null;

  function guardar(estado) {
    memoria = estado;
    try { sessionStorage.setItem(CHAVE, JSON.stringify(estado)); } catch (e) { /* sem storage: segue em memoria */ }
  }

  function ler() {
    if (memoria) return memoria;
    try {
      var bruto = sessionStorage.getItem(CHAVE);
      if (bruto) { memoria = JSON.parse(bruto); return memoria; }
    } catch (e) { /* ignora */ }
    memoria = criarEstadoInicial();
    guardar(memoria);
    return memoria;
  }

  function salvar() { guardar(memoria); }

  /* ------------------------------------------------------------ utilitarios */

  function hoje(offsetDias) {
    var d = new Date();
    d.setDate(d.getDate() + (offsetDias || 0));
    return d;
  }

  function dataHora(d) {
    var p = function (n) { return String(n).padStart(2, '0'); };
    return p(d.getDate()) + '/' + p(d.getMonth() + 1) + '/' + d.getFullYear() +
           ' ' + p(d.getHours()) + ':' + p(d.getMinutes());
  }

  function data(d) {
    var p = function (n) { return String(n).padStart(2, '0'); };
    return p(d.getDate()) + '/' + p(d.getMonth() + 1) + '/' + d.getFullYear();
  }

  function erro(codigo, mensagem) {
    var e = new Error(mensagem);
    e.codigo = codigo;
    e.mensagem = mensagem;
    return e;
  }

  function proximoId(lista) {
    return lista.reduce(function (maior, item) { return Math.max(maior, item.id); }, 0) + 1;
  }

  /* --------------------------------------------------------- estado inicial */

  function criarEstadoInicial() {
    var categorias = [
      { id: 1, nome: 'Eletrica' },      { id: 2, nome: 'Hidraulica' },
      { id: 3, nome: 'Pintura' },       { id: 4, nome: 'Alvenaria' },
      { id: 5, nome: 'Limpeza' },       { id: 6, nome: 'Jardinagem' },
      { id: 7, nome: 'Marcenaria' },    { id: 8, nome: 'Refrigeracao' }
    ];

    var regioes = [
      { id: 1, cidade: 'Goiania', bairro: 'Setor Sul' },
      { id: 2, cidade: 'Goiania', bairro: 'Setor Bueno' },
      { id: 3, cidade: 'Goiania', bairro: 'Setor Oeste' },
      { id: 4, cidade: 'Goiania', bairro: 'Setor Marista' },
      { id: 5, cidade: 'Goiania', bairro: 'Jardim America' },
      { id: 6, cidade: 'Goiania', bairro: 'Setor Campinas' },
      { id: 7, cidade: 'Aparecida de Goiania', bairro: 'Centro' }
    ];

    var usuarios = [
      { id: 1, perfil: 'CLIENTE', nome: 'Ana Carolina Souza', email: 'ana@exemplo.com',
        telefone: '(62) 98111-4512', senha: 'obrix123',
        endereco: { cep: '74080-010', logradouro: 'Rua 84', numero: '120',
                    bairro: 'Setor Sul', cidade: 'Goiania', estado: 'GO' } },

      { id: 2, perfil: 'PRESTADOR', nome: 'Carlos Mendes', email: 'carlos@exemplo.com',
        telefone: '(62) 98222-1180', senha: 'obrix123', cpf: '12345678901',
        descricaoProfissional: 'Eletricista com 12 anos de experiencia em instalacoes residenciais.',
        categoriaIds: [1], regiaoIds: [1, 2] },

      { id: 3, perfil: 'PRESTADOR', nome: 'Rita Alves', email: 'rita@exemplo.com',
        telefone: '(62) 98333-2244', senha: 'obrix123', cpf: '23456789012',
        descricaoProfissional: 'Pintora residencial. Trabalho limpo e prazo combinado.',
        categoriaIds: [3], regiaoIds: [1, 2] },

      { id: 4, perfil: 'PRESTADOR', nome: 'Joao Ferreira', email: 'joao@exemplo.com',
        telefone: '(62) 98444-7788', senha: 'obrix123', cpf: '34567890123',
        descricaoProfissional: 'Jardinagem, poda e manutencao de areas verdes.',
        categoriaIds: [6], regiaoIds: [1, 5] },

      { id: 5, perfil: 'PRESTADOR', nome: 'Marcos Pereira', email: 'marcos@exemplo.com',
        telefone: '(62) 98555-9090', senha: 'obrix123', cpf: '45678901234',
        descricaoProfissional: 'Encanador. Vazamentos, caixa dágua e instalacoes.',
        categoriaIds: [2], regiaoIds: [1] },

      { id: 6, perfil: 'PRESTADOR', nome: 'Beatriz Lima', email: 'beatriz@exemplo.com',
        telefone: '(62) 98666-3131', senha: 'obrix123', cpf: '56789012345',
        descricaoProfissional: 'Eletricista recem-cadastrada na plataforma.',
        categoriaIds: [1], regiaoIds: [1] }
    ];

    var estado = {
      categorias: categorias,
      regioes: regioes,
      usuarios: usuarios,
      solicitacoes: [],
      avaliacoes: [],
      cobrancas: [],
      notificacoes: [],
      sessao: null
    };

    semear(estado);
    return estado;
  }

  /* Os mesmos cinco servicos dos mockups, um por status do ciclo. */
  function semear(estado) {
    var endereco = estado.usuarios[0].endereco;

    function nova(prestadorId, categoriaId, descricao, diasDesejados) {
      var s = {
        id: proximoId(estado.solicitacoes),
        clienteId: 1, prestadorId: prestadorId, categoriaId: categoriaId, regiaoId: 1,
        descricao: descricao,
        dataDesejada: data(hoje(diasDesejados)),
        dataCriacao: dataHora(hoje(-1)),
        status: 'SOLICITADA',
        valorFinal: null, motivo: null,
        dataRegistroConclusao: null, confirmacaoAutomatica: false,
        enderecoExecucao: endereco,
        historico: [{ statusAnterior: null, statusNovo: 'SOLICITADA',
                      dataHora: dataHora(hoje(-1)), motivo: null, autor: 'CLIENTE' }]
      };
      estado.solicitacoes.push(s);
      return s;
    }

    function mover(s, novo, motivo, autor) {
      s.historico.push({ statusAnterior: s.status, statusNovo: novo,
                         dataHora: dataHora(new Date()), motivo: motivo || null, autor: autor });
      s.status = novo;
      s.motivo = motivo || null;
    }

    // 1. Aguardando confirmacao — o caso dos mockups: R$ 280,00.
    var chuveiro = nova(2, 1, 'Instalacao de chuveiro eletrico 220v no banheiro social.', 2);
    mover(chuveiro, 'ACEITA', null, 'PRESTADOR');
    mover(chuveiro, 'EM_EXECUCAO', null, 'PRESTADOR');
    chuveiro.valorFinal = 280;
    chuveiro.dataRegistroConclusao = dataHora(new Date());
    mover(chuveiro, 'AGUARDANDO_CONFIRMACAO', null, 'PRESTADOR');

    // 2. Em execucao.
    var pintura = nova(3, 3, 'Pintura da sala e do corredor, tinta ja comprada.', 5);
    mover(pintura, 'ACEITA', null, 'PRESTADOR');
    mover(pintura, 'EM_EXECUCAO', null, 'PRESTADOR');

    // 3. Concluida e avaliada — gerou cobranca de 10%.
    var tomadas = nova(2, 1, 'Troca de quatro tomadas da cozinha.', -10);
    mover(tomadas, 'ACEITA', null, 'PRESTADOR');
    mover(tomadas, 'EM_EXECUCAO', null, 'PRESTADOR');
    tomadas.valorFinal = 150;
    tomadas.dataRegistroConclusao = dataHora(hoje(-8));
    mover(tomadas, 'AGUARDANDO_CONFIRMACAO', null, 'PRESTADOR');
    mover(tomadas, 'CONCLUIDA', null, 'CLIENTE');
    estado.cobrancas.push(criarCobranca(estado, tomadas));
    estado.avaliacoes.push({ id: 1, solicitacaoId: tomadas.id, nota: 5,
      comentario: 'Pontual, explicou tudo e deixou limpo.', dataHora: dataHora(hoje(-8)) });

    // 4. Solicitada — aguardando resposta do profissional.
    nova(4, 6, 'Poda de duas arvores no quintal dos fundos.', 7);

    // 5. Contestada — nenhuma cobranca foi gerada.
    var torneira = nova(5, 2, 'Conserto de vazamento na torneira da pia.', -3);
    mover(torneira, 'ACEITA', null, 'PRESTADOR');
    mover(torneira, 'EM_EXECUCAO', null, 'PRESTADOR');
    torneira.valorFinal = 190;
    torneira.dataRegistroConclusao = dataHora(hoje(-2));
    mover(torneira, 'AGUARDANDO_CONFIRMACAO', null, 'PRESTADOR');
    mover(torneira, 'CONTESTADA', 'A torneira voltou a pingar no dia seguinte.', 'CLIENTE');
  }

  function criarCobranca(estado, s) {
    return {
      id: proximoId(estado.cobrancas),
      solicitacaoId: s.id,
      valorServico: s.valorFinal,
      percentualComissao: PERCENTUAL_COMISSAO,
      valorComissao: Math.round(s.valorFinal * PERCENTUAL_COMISSAO) / 100,
      dataGeracao: dataHora(new Date())
    };
  }

  /* --------------------------------------------------------------- consultas */

  function usuario(id) {
    return ler().usuarios.filter(function (u) { return u.id === id; })[0];
  }

  function categoria(id) {
    return ler().categorias.filter(function (c) { return c.id === id; })[0];
  }

  function regiao(id) {
    return ler().regioes.filter(function (r) { return r.id === id; })[0];
  }

  function avaliacoesDoPrestador(prestadorId) {
    var e = ler();
    return e.avaliacoes.filter(function (a) {
      var s = e.solicitacoes.filter(function (x) { return x.id === a.solicitacaoId; })[0];
      return s && s.prestadorId === prestadorId;
    });
  }

  function notaMedia(prestadorId) {
    var notas = avaliacoesDoPrestador(prestadorId).map(function (a) { return a.nota; });
    if (!notas.length) return 0;
    var soma = notas.reduce(function (a, b) { return a + b; }, 0);
    return Math.round((soma / notas.length) * 100) / 100;
  }

  function foiContestada(s) {
    return s.historico.some(function (h) { return h.statusNovo === 'CONTESTADA'; });
  }

  function prazoConfirmacao(s) {
    if (!s.dataRegistroConclusao || foiContestada(s)) return null;
    var partes = s.dataRegistroConclusao.split(' ')[0].split('/');
    var d = new Date(Number(partes[2]), Number(partes[1]) - 1, Number(partes[0]));
    d.setDate(d.getDate() + PRAZO_CONFIRMACAO_DIAS);
    return data(d);
  }

  /* Mesma lista de acoes do SolicitacaoMapper do back-end. */
  function acoes(s, ehCliente) {
    switch (s.status) {
      case 'SOLICITADA':
        return ehCliente ? ['cancelar'] : ['aceitar', 'recusar'];
      case 'ACEITA':
        return ehCliente ? ['cancelar'] : ['iniciar', 'cancelar'];
      case 'EM_EXECUCAO':
        return ehCliente ? [] : ['concluir'];
      case 'AGUARDANDO_CONFIRMACAO':
        return ehCliente ? ['confirmar', 'contestar'] : [];
      case 'CONTESTADA':
        return ehCliente ? [] : ['concluir'];
      case 'CONCLUIDA':
        return ehCliente && !temAvaliacao(s.id) ? ['avaliar'] : [];
      default:
        return [];
    }
  }

  function temAvaliacao(solicitacaoId) {
    return ler().avaliacoes.some(function (a) { return a.solicitacaoId === solicitacaoId; });
  }

  function paraResposta(s, usuarioQueVe) {
    var e = ler();
    var ehCliente = s.clienteId === usuarioQueVe;
    var cli = usuario(s.clienteId);
    var pre = usuario(s.prestadorId);
    var contatoLiberado = ['SOLICITADA', 'RECUSADA', 'CANCELADA'].indexOf(s.status) === -1;
    var cob = e.cobrancas.filter(function (c) { return c.solicitacaoId === s.id; })[0] || null;
    var ava = e.avaliacoes.filter(function (a) { return a.solicitacaoId === s.id; })[0] || null;
    var end = s.enderecoExecucao;

    return {
      id: s.id,
      descricao: s.descricao,
      categoria: categoria(s.categoriaId).nome,
      regiao: regiao(s.regiaoId).bairro + ' - ' + regiao(s.regiaoId).cidade,
      status: s.status,
      statusRotulo: ROTULOS[s.status],
      dataDesejada: s.dataDesejada,
      dataCriacao: s.dataCriacao,
      valorFinal: s.valorFinal,
      motivo: s.motivo,
      dataRegistroConclusao: s.dataRegistroConclusao,
      prazoConfirmacao: prazoConfirmacao(s),
      confirmacaoAutomatica: s.confirmacaoAutomatica,
      foiContestada: foiContestada(s),
      podeSerCancelada: s.status === 'SOLICITADA' || s.status === 'ACEITA',
      enderecoExecucao: end ? (end.logradouro + ', ' + end.numero + ' - ' + end.bairro +
                               ', ' + end.cidade + '/' + end.estado) : null,
      cliente: contatoLiberado
        ? { nome: cli.nome, telefone: cli.telefone, email: cli.email }
        : null,
      prestador: contatoLiberado
        ? { nome: pre.nome, telefone: pre.telefone, email: pre.email }
        : { nome: pre.nome, telefone: null, email: null },
      cobranca: cob ? {
        id: cob.id, valorServico: cob.valorServico,
        percentualComissao: cob.percentualComissao,
        valorComissao: cob.valorComissao, dataGeracao: cob.dataGeracao
      } : null,
      notaAvaliacao: ava ? ava.nota : null,
      historico: s.historico.slice(),
      acoesDisponiveis: acoes(s, ehCliente)
    };
  }

  function exigirSessao() {
    var e = ler();
    if (!e.sessao) throw erro('NAO_AUTENTICADO', 'Faca login para continuar.');
    return e.sessao;
  }

  function buscarSolicitacao(id) {
    var s = ler().solicitacoes.filter(function (x) { return x.id === Number(id); })[0];
    if (!s) throw erro('NAO_ENCONTRADO', 'Solicitacao nao encontrada.');
    return s;
  }

  function mover(s, novo, motivo, autor) {
    if ((TRANSICOES[s.status] || []).indexOf(novo) === -1) {
      throw erro('TRANSICAO_INVALIDA',
                 'Nao e possivel passar de ' + ROTULOS[s.status] + ' para ' + ROTULOS[novo] + '.');
    }
    s.historico.push({ statusAnterior: s.status, statusNovo: novo,
                       dataHora: dataHora(new Date()), motivo: motivo || null, autor: autor });
    s.status = novo;
    s.motivo = motivo || null;
  }

  function exigirMotivo(motivo) {
    if (!motivo || !String(motivo).trim()) {
      throw erro('MOTIVO_OBRIGATORIO', 'Informe o motivo.');
    }
  }

  /* ------------------------------------------------------- superficie da API */

  var Demo = {

    modo: 'demonstracao',

    sessao: function () {
      return ler().sessao;
    },

    login: function (email, senha) {
      var e = ler();
      var u = e.usuarios.filter(function (x) {
        return x.email.toLowerCase() === String(email).toLowerCase();
      })[0];
      // Resposta generica: nao revela se o e-mail existe.
      if (!u || u.senha !== senha) {
        throw erro('CREDENCIAIS_INVALIDAS', 'E-mail ou senha incorretos.');
      }
      e.sessao = { id: u.id, nome: u.nome, email: u.email, perfil: u.perfil };
      salvar();
      return e.sessao;
    },

    sair: function () {
      ler().sessao = null;
      salvar();
    },

    cadastrarCliente: function (dados) {
      var e = ler();
      if (e.usuarios.some(function (u) { return u.email.toLowerCase() === dados.email.toLowerCase(); })) {
        throw erro('EMAIL_EM_USO', 'Este e-mail ja esta cadastrado.');
      }
      var novo = {
        id: proximoId(e.usuarios), perfil: 'CLIENTE', nome: dados.nome, email: dados.email,
        telefone: dados.telefone, senha: dados.senha, endereco: dados.endereco
      };
      e.usuarios.push(novo);
      e.sessao = { id: novo.id, nome: novo.nome, email: novo.email, perfil: 'CLIENTE' };
      salvar();
      return e.sessao;
    },

    cadastrarPrestador: function (dados) {
      var e = ler();
      if (e.usuarios.some(function (u) { return u.email.toLowerCase() === dados.email.toLowerCase(); })) {
        throw erro('EMAIL_EM_USO', 'Este e-mail ja esta cadastrado.');
      }
      if (!dados.categoriaIds || !dados.categoriaIds.length) {
        throw erro('CATEGORIA_OBRIGATORIA', 'Selecione ao menos uma categoria.');
      }
      if (!dados.regiaoIds || !dados.regiaoIds.length) {
        throw erro('REGIAO_OBRIGATORIA', 'Selecione ao menos uma regiao.');
      }
      var novo = {
        id: proximoId(e.usuarios), perfil: 'PRESTADOR', nome: dados.nome, email: dados.email,
        telefone: dados.telefone, senha: dados.senha, cpf: String(dados.cpf).replace(/\D/g, ''),
        descricaoProfissional: dados.descricaoProfissional,
        categoriaIds: dados.categoriaIds.map(Number),
        regiaoIds: dados.regiaoIds.map(Number)
      };
      e.usuarios.push(novo);
      e.sessao = { id: novo.id, nome: novo.nome, email: novo.email, perfil: 'PRESTADOR' };
      salvar();
      return e.sessao;
    },

    catalogo: function () {
      var e = ler();
      return {
        categorias: e.categorias.map(function (c) { return { id: c.id, nome: c.nome }; }),
        regioes: e.regioes.map(function (r) {
          return { id: r.id, cidade: r.cidade, bairro: r.bairro,
                   descricao: r.bairro + ' - ' + r.cidade };
        })
      };
    },

    buscarPrestadores: function (filtro) {
      var e = ler();
      var categoriaId = Number(filtro.categoriaId);
      var regiaoId = filtro.regiaoId ? Number(filtro.regiaoId) : null;

      return e.usuarios
        .filter(function (u) {
          if (u.perfil !== 'PRESTADOR') return false;
          if (u.categoriaIds.indexOf(categoriaId) === -1) return false;
          if (regiaoId && u.regiaoIds.indexOf(regiaoId) === -1) return false;
          return true;
        })
        .map(function (u) {
          return {
            id: u.id, nome: u.nome, descricaoProfissional: u.descricaoProfissional,
            notaMedia: notaMedia(u.id),
            quantidadeAvaliacoes: avaliacoesDoPrestador(u.id).length,
            categorias: u.categoriaIds.map(function (id) { return categoria(id).nome; }),
            regioes: u.regiaoIds.map(function (id) {
              return regiao(id).bairro + ' - ' + regiao(id).cidade;
            })
          };
        })
        // Ordenado por nota; quem nao tem avaliacao vai depois, em bloco proprio.
        .sort(function (a, b) {
          if (!a.quantidadeAvaliacoes && b.quantidadeAvaliacoes) return 1;
          if (a.quantidadeAvaliacoes && !b.quantidadeAvaliacoes) return -1;
          return b.notaMedia - a.notaMedia;
        });
    },

    perfilPublico: function (id) {
      var u = usuario(Number(id));
      if (!u || u.perfil !== 'PRESTADOR') throw erro('NAO_ENCONTRADO', 'Profissional nao encontrado.');
      var e = ler();
      return {
        id: u.id, nome: u.nome, descricaoProfissional: u.descricaoProfissional,
        notaMedia: notaMedia(u.id),
        quantidadeAvaliacoes: avaliacoesDoPrestador(u.id).length,
        categorias: u.categoriaIds.map(function (cid) { return categoria(cid).nome; }),
        regioes: u.regiaoIds.map(function (rid) {
          return regiao(rid).bairro + ' - ' + regiao(rid).cidade;
        }),
        avaliacoes: avaliacoesDoPrestador(u.id).map(function (a) {
          var s = e.solicitacoes.filter(function (x) { return x.id === a.solicitacaoId; })[0];
          return { nota: a.nota, comentario: a.comentario, dataHora: a.dataHora,
                   servico: s ? categoria(s.categoriaId).nome : '' };
        })
      };
    },

    criarSolicitacao: function (dados) {
      var sessao = exigirSessao();
      if (sessao.perfil !== 'CLIENTE') {
        throw erro('NAO_AUTORIZADO', 'Esta acao e exclusiva de clientes.');
      }
      var e = ler();
      var prestador = usuario(Number(dados.prestadorId));
      var categoriaId = Number(dados.categoriaId);
      var regiaoId = Number(dados.regiaoId);

      // Mesma regra do RF12: categoria e regiao precisam estar entre as atendidas.
      if (prestador.categoriaIds.indexOf(categoriaId) === -1 ||
          prestador.regiaoIds.indexOf(regiaoId) === -1) {
        throw erro('FORA_DE_ATUACAO',
                   'Este profissional nao atende essa categoria nessa regiao.');
      }

      var s = {
        id: proximoId(e.solicitacoes),
        clienteId: sessao.id, prestadorId: prestador.id,
        categoriaId: categoriaId, regiaoId: regiaoId,
        descricao: dados.descricao,
        dataDesejada: dados.dataDesejada,
        dataCriacao: dataHora(new Date()),
        status: 'SOLICITADA',
        valorFinal: null, motivo: null,
        dataRegistroConclusao: null, confirmacaoAutomatica: false,
        enderecoExecucao: dados.enderecoExecucao,
        historico: [{ statusAnterior: null, statusNovo: 'SOLICITADA',
                      dataHora: dataHora(new Date()), motivo: null, autor: 'CLIENTE' }]
      };
      e.solicitacoes.push(s);
      salvar();
      return paraResposta(s, sessao.id);
    },

    minhasSolicitacoes: function () {
      var sessao = exigirSessao();
      var campo = sessao.perfil === 'CLIENTE' ? 'clienteId' : 'prestadorId';
      return ler().solicitacoes
        .filter(function (s) { return s[campo] === sessao.id; })
        .slice().reverse()
        .map(function (s) { return paraResposta(s, sessao.id); });
    },

    solicitacao: function (id) {
      var sessao = exigirSessao();
      var s = buscarSolicitacao(id);
      if (s.clienteId !== sessao.id && s.prestadorId !== sessao.id) {
        throw erro('NAO_AUTORIZADO', 'Voce nao participa desta solicitacao.');
      }
      return paraResposta(s, sessao.id);
    },

    acao: function (id, nome, corpo) {
      var sessao = exigirSessao();
      var s = buscarSolicitacao(id);
      var e = ler();
      corpo = corpo || {};

      var ehCliente = s.clienteId === sessao.id;
      var ehPrestador = s.prestadorId === sessao.id;
      if (!ehCliente && !ehPrestador) {
        throw erro('NAO_AUTORIZADO', 'Voce nao participa desta solicitacao.');
      }

      switch (nome) {
        case 'aceitar':
          exigirPrestador(ehPrestador);
          mover(s, 'ACEITA', null, 'PRESTADOR');
          break;

        case 'recusar':
          exigirPrestador(ehPrestador);
          exigirMotivo(corpo.motivo);
          mover(s, 'RECUSADA', corpo.motivo, 'PRESTADOR');
          break;

        case 'iniciar':
          exigirPrestador(ehPrestador);
          mover(s, 'EM_EXECUCAO', null, 'PRESTADOR');
          break;

        case 'concluir':
          exigirPrestador(ehPrestador);
          if (!corpo.valorFinal || Number(corpo.valorFinal) <= 0) {
            throw erro('VALOR_INVALIDO', 'O valor final deve ser maior que zero.');
          }
          s.valorFinal = Number(corpo.valorFinal);
          s.dataRegistroConclusao = dataHora(new Date());
          mover(s, 'AGUARDANDO_CONFIRMACAO', null, 'PRESTADOR');
          break;

        // O unico ponto que cria cobranca.
        case 'confirmar':
          exigirCliente(ehCliente);
          mover(s, 'CONCLUIDA', null, 'CLIENTE');
          if (!e.cobrancas.some(function (c) { return c.solicitacaoId === s.id; })) {
            e.cobrancas.push(criarCobranca(e, s));
          }
          break;

        case 'contestar':
          exigirCliente(ehCliente);
          exigirMotivo(corpo.motivo);
          mover(s, 'CONTESTADA', corpo.motivo, 'CLIENTE');
          break;

        case 'cancelar':
          exigirMotivo(corpo.motivo);
          mover(s, 'CANCELADA', corpo.motivo, ehCliente ? 'CLIENTE' : 'PRESTADOR');
          break;

        case 'avaliar':
          exigirCliente(ehCliente);
          if (s.status !== 'CONCLUIDA') {
            throw erro('AVALIACAO_NAO_LIBERADA',
                       'A avaliacao so e liberada apos a confirmacao da conclusao.');
          }
          if (temAvaliacao(s.id)) {
            throw erro('AVALIACAO_DUPLICADA', 'Este servico ja foi avaliado.');
          }
          if (!(corpo.nota >= 1 && corpo.nota <= 5)) {
            throw erro('NOTA_INVALIDA', 'A nota deve estar entre 1 e 5.');
          }
          e.avaliacoes.push({ id: proximoId(e.avaliacoes), solicitacaoId: s.id,
                              nota: Number(corpo.nota), comentario: corpo.comentario || '',
                              dataHora: dataHora(new Date()) });
          break;

        default:
          throw erro('ACAO_DESCONHECIDA', 'Acao nao reconhecida: ' + nome);
      }

      salvar();
      return paraResposta(s, sessao.id);
    },

    extrato: function () {
      var sessao = exigirSessao();
      if (sessao.perfil !== 'PRESTADOR') {
        throw erro('NAO_AUTORIZADO', 'Esta acao e exclusiva de profissionais.');
      }
      var e = ler();
      var itens = e.cobrancas
        .map(function (c) {
          var s = e.solicitacoes.filter(function (x) { return x.id === c.solicitacaoId; })[0];
          if (!s || s.prestadorId !== sessao.id) return null;
          return {
            solicitacaoId: s.id,
            servico: categoria(s.categoriaId).nome,
            cliente: usuario(s.clienteId).nome,
            data: c.dataGeracao.split(' ')[0],
            valorServico: c.valorServico,
            valorComissao: c.valorComissao
          };
        })
        .filter(Boolean);

      return {
        itens: itens,
        totalComissao: itens.reduce(function (t, i) { return t + i.valorComissao; }, 0),
        totalServicos: itens.reduce(function (t, i) { return t + i.valorServico; }, 0)
      };
    },

    conta: function () {
      var sessao = exigirSessao();
      var u = usuario(sessao.id);
      return {
        id: u.id, nome: u.nome, email: u.email, telefone: u.telefone, perfil: u.perfil,
        status: 'ATIVA', emailVerificado: true,
        cpfMascarado: u.cpf ? '***.***.***-' + u.cpf.slice(-2) : null,
        descricaoProfissional: u.descricaoProfissional || null,
        categoriaIds: u.categoriaIds || [], regiaoIds: u.regiaoIds || [],
        endereco: u.endereco || null, termosVersao: '1.0'
      };
    },

    atualizarConta: function (dados) {
      var sessao = exigirSessao();
      var u = usuario(sessao.id);
      u.nome = dados.nome;
      u.telefone = dados.telefone;
      if (u.perfil === 'PRESTADOR') {
        if (!dados.categoriaIds || !dados.categoriaIds.length) {
          throw erro('CATEGORIA_OBRIGATORIA', 'Mantenha ao menos uma categoria.');
        }
        if (!dados.regiaoIds || !dados.regiaoIds.length) {
          throw erro('REGIAO_OBRIGATORIA', 'Mantenha ao menos uma regiao.');
        }
        u.descricaoProfissional = dados.descricaoProfissional;
        u.categoriaIds = dados.categoriaIds.map(Number);
        u.regiaoIds = dados.regiaoIds.map(Number);
      } else if (dados.endereco) {
        u.endereco = dados.endereco;
      }
      sessao.nome = u.nome;
      salvar();
      return Demo.conta();
    },

    reiniciar: function () {
      memoria = criarEstadoInicial();
      guardar(memoria);
    }
  };

  function exigirCliente(ok) {
    if (!ok) throw erro('NAO_AUTORIZADO', 'Esta acao e exclusiva do cliente dono da solicitacao.');
  }

  function exigirPrestador(ok) {
    if (!ok) throw erro('NAO_AUTORIZADO', 'Esta acao e exclusiva do profissional destinatario.');
  }

  global.ObrixDemo = Demo;

})(window);
