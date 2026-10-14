const STORAGE_KEY = "ubs-facil-dados-v1";

const TIPOS_ATENDIMENTO = [
    "Triagem",
    "Consulta Médica",
    "Vacinação",
    "Curativo"
];

const $ = (id) => document.getElementById(id);

const form = $("patient-form");
const nameInput = $("patient-name");
const documentInput = $("patient-document");
const typeInput = $("service-type");
const message = $("form-message");

let state = criarEstadoVazio();

function dataLocal() {
    const agora = new Date();

    const ano = agora.getFullYear();
    const mes = String(agora.getMonth() + 1).padStart(2, "0");
    const dia = String(agora.getDate()).padStart(2, "0");

    return `${ano}-${mes}-${dia}`;
}

function criarEstadoVazio() {
    return {
        data: dataLocal(),
        fila: [],
        atual: null,
        historico: [],
        proximoId: 1
    };
}

function carregarDados() {
    try {
        const dados = localStorage.getItem(STORAGE_KEY);

        if (!dados) {
            return criarEstadoVazio();
        }

        const salvo = JSON.parse(dados);

        // Não reutiliza os indicadores de outro dia.
        if (salvo.data !== dataLocal()) {
            return criarEstadoVazio();
        }

        if (
            !Array.isArray(salvo.fila) ||
            !Array.isArray(salvo.historico) ||
            !Number.isInteger(salvo.proximoId) ||
            salvo.proximoId < 1
        ) {
            return criarEstadoVazio();
        }

        return {
            data: dataLocal(),
            fila: salvo.fila,
            atual: salvo.atual || null,
            historico: salvo.historico,
            proximoId: salvo.proximoId
        };
    } catch (erro) {
        console.error("Erro ao carregar os dados:", erro);
        return criarEstadoVazio();
    }
}

function salvarDados() {
    try {
        state.data = dataLocal();

        localStorage.setItem(
            STORAGE_KEY,
            JSON.stringify(state)
        );

        return true;
    } catch (erro) {
        console.error("Erro ao salvar os dados:", erro);

        mostrarMensagem(
            "Não foi possível salvar os dados neste navegador.",
            true
        );

        return false;
    }
}

function verificarNovoDia() {
    if (state.data !== dataLocal()) {
        state = criarEstadoVazio();
        salvarDados();
        renderizar();

        mostrarMensagem(
            "Um novo dia começou. Os indicadores foram reiniciados."
        );
    }
}

function mostrarMensagem(texto, erro = false) {
    message.textContent = texto;
    message.classList.toggle("error", erro);
}

function criarElemento(tag, classe, texto) {
    const elemento = document.createElement(tag);

    if (classe) {
        elemento.className = classe;
    }

    if (texto !== undefined) {
        elemento.textContent = texto;
    }

    return elemento;
}

function criarBotao(texto, classe, acao) {
    const botao = criarElemento("button", classe, texto);

    botao.type = "button";
    botao.addEventListener("click", acao);

    return botao;
}

function criarStatus(texto, classe) {
    return criarElemento("span", `status ${classe}`, texto);
}

function criarCartaoPaciente(paciente, status) {
    const item = criarElemento("article", "patient-item");
    const info = criarElemento("div", "patient-info");

    info.appendChild(
        criarElemento("div", "patient-name", paciente.nome)
    );

    info.appendChild(
        criarElemento("div", "patient-type", paciente.tipo)
    );

    if (status === "Aguardando") {
        info.appendChild(
            criarStatus("Aguardando", "status-waiting")
        );
    } else if (status === "Em atendimento") {
        info.appendChild(
            criarStatus("Em atendimento", "status-active")
        );
    } else {
        info.appendChild(
            criarStatus("Finalizado", "status-finished")
        );
    }

    item.appendChild(info);

    return item;
}

// Cadastro de paciente
form.addEventListener("submit", function (evento) {
    evento.preventDefault();

    verificarNovoDia();

    const nome = nameInput.value.trim();
    const documento = documentInput.value.trim();
    const tipo = typeInput.value;

    if (!nome) {
        mostrarMensagem(
            "Informe o nome do paciente.",
            true
        );

        nameInput.focus();
        return;
    }

    if (!TIPOS_ATENDIMENTO.includes(tipo)) {
        mostrarMensagem(
            "Selecione um tipo de atendimento válido.",
            true
        );

        return;
    }

    const paciente = {
        id: state.proximoId++,
        nome: nome,
        documento: documento,
        tipo: tipo,
        criadoEm: new Date().toISOString()
    };

    state.fila.push(paciente);

    if (!salvarDados()) {
        state.fila.pop();
        state.proximoId--;
        return;
    }

    form.reset();

    mostrarMensagem(
        `${nome} foi adicionado à fila com sucesso.`
    );

    renderizar();
    nameInput.focus();
});

// Chamar o próximo paciente
$("call-next-button").addEventListener("click", function () {
    verificarNovoDia();

    if (state.atual) {
        mostrarMensagem(
            "Finalize o atendimento atual antes de chamar outro.",
            true
        );

        return;
    }

    if (state.fila.length === 0) {
        mostrarMensagem(
            "Não existem pacientes aguardando.",
            true
        );

        return;
    }

    const paciente = state.fila.shift();
    state.atual = paciente;

    if (!salvarDados()) {
        state.fila.unshift(paciente);
        state.atual = null;
        renderizar();
        return;
    }

    mostrarMensagem(
        `${paciente.nome} foi chamado para atendimento.`
    );

    renderizar();
});

// Chamar um paciente específico
function chamarPaciente(id) {
    verificarNovoDia();

    if (state.atual) {
        mostrarMensagem(
            "Finalize o atendimento atual antes de chamar outro.",
            true
        );

        return;
    }

    const indice = state.fila.findIndex(
        paciente => paciente.id === id
    );

    if (indice === -1) {
        return;
    }

    const paciente = state.fila.splice(indice, 1)[0];
    state.atual = paciente;

    if (!salvarDados()) {
        state.fila.splice(indice, 0, paciente);
        state.atual = null;
        renderizar();
        return;
    }

    mostrarMensagem(
        `${paciente.nome} foi chamado para atendimento.`
    );

    renderizar();
}

// Finalizar atendimento
$("finish-button").addEventListener("click", function () {
    verificarNovoDia();

    if (!state.atual) {
        mostrarMensagem(
            "Não existe atendimento em andamento.",
            true
        );

        return;
    }

    const paciente = state.atual;

    const registro = {
        ...paciente,
        finalizadoEm: new Date().toISOString()
    };

    state.historico.push(registro);
    state.atual = null;

    if (!salvarDados()) {
        state.historico.pop();
        state.atual = paciente;
        renderizar();
        return;
    }

    mostrarMensagem(
        `Atendimento de ${paciente.nome} finalizado.`
    );

    renderizar();
});

// Renderizar fila de espera
function renderizarFila() {
    const lista = $("waiting-list");

    lista.replaceChildren();

    $("queue-count").textContent =
        `${state.fila.length} ${
            state.fila.length === 1 ? "paciente" : "pacientes"
        }`;

    if (state.fila.length === 0) {
        lista.appendChild(
            criarElemento(
                "p",
                "empty-state",
                "Nenhum paciente na fila."
            )
        );

        return;
    }

    state.fila.forEach(function (paciente) {
        const item = criarCartaoPaciente(
            paciente,
            "Aguardando"
        );

        const acoes = criarElemento("div", "patient-actions");

        const botaoChamar = criarBotao(
            "Chamar",
            "btn btn-small",
            () => chamarPaciente(paciente.id)
        );

        botaoChamar.disabled = Boolean(state.atual);

        acoes.appendChild(botaoChamar);
        item.appendChild(acoes);
        lista.appendChild(item);
    });
}

// Renderizar paciente atual
function renderizarAtual() {
    const nome = $("current-patient-name");
    const tipo = $("current-patient-type");
    const finalizar = $("finish-button");
    const chamar = $("call-next-button");

    if (state.atual) {
        nome.textContent = state.atual.nome;
        tipo.textContent =
            `${state.atual.tipo} · Em atendimento`;

        finalizar.hidden = false;
        chamar.disabled = true;
    } else {
        nome.textContent = "Nenhum paciente chamado";
        tipo.textContent = "Aguardando chamada";

        finalizar.hidden = true;
        chamar.disabled = state.fila.length === 0;
    }
}

// Renderizar indicadores por categoria
function renderizarCategorias() {
    const container = $("category-indicators");

    container.replaceChildren();

    TIPOS_ATENDIMENTO.forEach(function (tipo) {
        const quantidade = state.historico.filter(
            paciente => paciente.tipo === tipo
        ).length;

        const cartao = criarElemento("div", "category-card");

        cartao.appendChild(
            criarElemento("strong", "", String(quantidade))
        );

        cartao.appendChild(
            criarElemento("span", "", tipo)
        );

        container.appendChild(cartao);
    });
}

// Renderizar histórico
function renderizarHistorico() {
    const container = $("attendance-history");

    container.replaceChildren();

    if (state.historico.length === 0) {
        container.appendChild(
            criarElemento(
                "p",
                "empty-state",
                "Nenhum atendimento finalizado."
            )
        );

        return;
    }

    const ultimos = state.historico.slice(-5).reverse();

    ultimos.forEach(function (paciente) {
        container.appendChild(
            criarCartaoPaciente(paciente, "Finalizado")
        );
    });
}

// Atualizar todos os elementos da tela
function renderizar() {
    $("current-date").textContent =
        new Date().toLocaleDateString("pt-BR");

    $("total-attended").textContent =
        state.historico.length;

    $("total-waiting").textContent =
        state.fila.length;

    $("total-active").textContent =
        state.atual ? 1 : 0;

    renderizarFila();
    renderizarAtual();
    renderizarCategorias();
    renderizarHistorico();
}

// Exportar resumo CSV
$("export-button").addEventListener("click", function () {
    verificarNovoDia();

    const linhas = [
        ["Nome", "Tipo de atendimento", "Status", "Data"]
    ];

    state.fila.forEach(function (paciente) {
        linhas.push([
            paciente.nome,
            paciente.tipo,
            "Aguardando",
            paciente.criadoEm
        ]);
    });

    if (state.atual) {
        linhas.push([
            state.atual.nome,
            state.atual.tipo,
            "Em atendimento",
            state.atual.criadoEm
        ]);
    }

    state.historico.forEach(function (paciente) {
        linhas.push([
            paciente.nome,
            paciente.tipo,
            "Finalizado",
            paciente.finalizadoEm
        ]);
    });

    const csv = linhas.map(function (linha) {
        return linha.map(function (valor) {
            const texto = String(valor ?? "")
                .replace(/"/g, '""');

            return `"${texto}"`;
        }).join(";");
    }).join("\r\n");

    const arquivo = new Blob(
        ["\uFEFF" + csv],
        { type: "text/csv;charset=utf-8;" }
    );

    const url = URL.createObjectURL(arquivo);
    const link = document.createElement("a");

    link.href = url;
    link.download = `ubs-resumo-${dataLocal()}.csv`;

    document.body.appendChild(link);
    link.click();
    link.remove();

    setTimeout(() => URL.revokeObjectURL(url), 1000);

    mostrarMensagem("Resumo CSV exportado.");
});

// Reiniciar o dia
$("reset-button").addEventListener("click", function () {
    const confirmado = confirm(
        "Deseja realmente reiniciar o dia?\n\n" +
        "A fila, o paciente em atendimento e o histórico " +
        "deste dia serão apagados."
    );

    if (!confirmado) {
        return;
    }

    const estadoAnterior = state;

    state = criarEstadoVazio();

    if (!salvarDados()) {
        state = estadoAnterior;
        renderizar();
        return;
    }

    mostrarMensagem(
        "O dia foi reiniciado. Os indicadores estão zerados."
    );

    renderizar();
});

// Inicialização
state = carregarDados();
renderizar();

// Verificar mudança de data quando a página volta ao primeiro plano.
document.addEventListener("visibilitychange", function () {
    if (!document.hidden) {
        verificarNovoDia();
    }
});