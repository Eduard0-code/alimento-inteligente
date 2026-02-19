/**
 * Chef Local - Versão para GitHub Pages (Resiliente)
 * "Flavor": Se a cozinha está silenciosa demais, vamos fazer barulho para descobrir o porquê!
 */

console.log("Chef Local: Script iniciado..."); // Log imediato para confirmar execução

let baseReceitas = [];
let sinonimos = {};
let meusIngredientes = [];

// Elementos do DOM
const form = document.getElementById('form-ingrediente');
const input = document.getElementById('ingrediente-input');
const listaTags = document.getElementById('lista-tags');
const gridReceitas = document.getElementById('grid-receitas');
const statusBusca = document.getElementById('status-busca');
const contador = document.getElementById('contador-receitas');
const btnLimpar = document.getElementById('btn-limpar-tudo');

// Garantir que o Bootstrap Modal existe antes de tentar instanciar
let bootstrapModal;
try {
    bootstrapModal = new bootstrap.Modal(document.getElementById('recipeModal'));
} catch (e) {
    console.error("Erro ao carregar Bootstrap Modal:", e);
}

/**
 * Carrega os dados do arquivo estático receitas.json
 */
async function carregarDados() {
    console.log("Chef Local: Tentando carregar receitas.json...");
    try {
        // Usamos um timestamp para evitar cache do navegador durante testes
        const resposta = await fetch(`receitas.json?v=${new Date().getTime()}`); 
        
        if (!resposta.ok) {
            throw new Error(`Erro HTTP! Status: ${resposta.status}`);
        }
        
        const dados = await resposta.json();
        baseReceitas = dados.receitas || [];
        sinonimos = dados.sinonimos || {};
        
        console.log("Chef Local: Banco de dados carregado!", dados);
        if (statusBusca) statusBusca.innerText = "Ingredientes prontos para a mistura!";
    } catch (erro) {
        console.error("Erro fatal na cozinha:", erro);
        if (statusBusca) {
            statusBusca.innerHTML = `<div class="alert alert-danger">
                <strong>Erro de Conexão:</strong> Não conseguimos ler o arquivo de receitas. 
                Verifique se o arquivo <code>receitas.json</code> está na raiz do seu repositório.
            </div>`;
        }
    }
}

function normalizar(item) {
    const termo = item.trim().toLowerCase();
    for (const [oficial, variacoes] of Object.entries(sinonimos)) {
        if (termo === oficial || variacoes.includes(termo)) return oficial;
    }
    return termo;
}

function adicionarIngrediente(e) {
    if (e) e.preventDefault();
    const valor = input.value.trim().toLowerCase();
    
    if (!valor) {
        form.classList.add('shake');
        setTimeout(() => form.classList.remove('shake'), 400);
        return;
    }

    if (!meusIngredientes.includes(valor)) {
        meusIngredientes.push(valor);
        renderizarInterface();
    }
    
    input.value = "";
    input.focus();
}

window.removerIngrediente = (idx) => {
    meusIngredientes.splice(idx, 1);
    renderizarInterface();
};

function renderizarTags() {
    if (!listaTags) return;
    listaTags.innerHTML = meusIngredientes.map((ing, i) => `
        <div class="tag-pill">
            ${ing}
            <button type="button" onclick="removerIngrediente(${i})">×</button>
        </div>
    `).join('');
    if (btnLimpar) btnLimpar.classList.toggle('d-none', meusIngredientes.length === 0);
}

function buscarReceitas() {
    if (meusIngredientes.length === 0) {
        gridReceitas.innerHTML = '';
        statusBusca.innerText = "Aguardando ingredientes...";
        contador.innerText = "0 Receitas";
        return;
    }

    const meusNormalizados = meusIngredientes.map(i => normalizar(i));
    
    const resultados = baseReceitas.map(rec => {
        const tenho = rec.ingredientes.filter(i => meusNormalizados.includes(normalizar(i)));
        const faltam = rec.ingredientes.filter(i => !meusNormalizados.includes(normalizar(i)));
        const percent = Math.round((tenho.length / rec.ingredientes.length) * 100);
        return { ...rec, percent, faltam };
    }).filter(r => r.percent > 0).sort((a, b) => b.percent - a.percent);

    if (contador) contador.innerText = `${resultados.length} Sugestões`;
    if (statusBusca) statusBusca.innerText = "Sugestões para o seu cardápio:";

    gridReceitas.innerHTML = resultados.map(rec => `
        <div class="col-12 col-md-6 col-lg-4">
            <div class="card recipe-card p-4 shadow-sm border-0" onclick='abrirDetalhes(${JSON.stringify(rec)})'>
                <div class="d-flex justify-content-between mb-3">
                    <span class="fs-3">${rec.percent === 100 ? '✨' : '🍳'}</span>
                    <span class="badge ${rec.percent === 100 ? 'bg-success' : 'bg-warning-subtle text-warning'} px-3 py-2 rounded-pill">
                        ${rec.percent}% Match
                    </span>
                </div>
                <h5 class="fw-black text-dark mb-3">${rec.nome}</h5>
                <div class="progress mb-3">
                    <div class="progress-bar ${rec.percent === 100 ? 'bg-success' : 'bg-warning'}" style="width: ${rec.percent}%"></div>
                </div>
                <p class="small text-muted mb-0">
                    ${rec.percent === 100 ? '<span class="text-success fw-bold">Tens tudo!</span>' : `Faltam: ${rec.faltam.join(', ')}`}
                </p>
            </div>
        </div>
    `).join('');
}

window.abrirDetalhes = (rec) => {
    document.getElementById('modal-titulo').innerText = rec.nome;
    document.getElementById('modal-tempo').innerText = `⏱️ ${rec.tempo}`;
    const aviso = document.getElementById('modal-falta-aviso');
    
    aviso.innerText = rec.percent === 100 ? "✨ TUDO PRONTO" : `⚠️ FALTAM ${rec.faltam.length} ITENS`;
    aviso.className = `badge ms-2 px-3 py-2 border ${rec.percent === 100 ? 'bg-success-subtle text-success border-success-subtle' : 'bg-danger-subtle text-danger border-danger-subtle'}`;

    const meusNormalizados = meusIngredientes.map(mi => normalizar(mi));
    
    document.getElementById('modal-conteudo').innerHTML = `
        <div class="row g-4">
            <div class="col-12">
                <p class="text-uppercase small fw-black text-warning mb-3 tracking-widest">Ingredientes</p>
                <div class="row g-2">
                    ${rec.ingredientes.map(i => {
                        const tem = meusNormalizados.includes(normalizar(i));
                        return `<div class="col-6"><div class="p-3 border rounded-4 d-flex align-items-center ${tem ? 'bg-success-subtle border-success-subtle' : 'bg-light'}">
                            <span class="me-2">${tem ? '✅' : '❌'}</span><span class="small fw-bold text-capitalize">${i}</span>
                        </div></div>`;
                    }).join('')}
                </div>
            </div>
            <div class="col-12 mt-4">
                <p class="text-uppercase small fw-black text-warning mb-3 tracking-widest">Preparo</p>
                <div class="preparo-box">${rec.preparo}</div>
            </div>
        </div>
    `;
    if (bootstrapModal) bootstrapModal.show();
};

function renderizarInterface() {
    renderizarTags();
    buscarReceitas();
}

// Inicialização com logs de progresso
window.onload = () => {
    console.log("Chef Local: Página carregada. Iniciando fetch de dados...");
    carregarDados().then(() => {
        if (form) form.addEventListener('submit', adicionarIngrediente);
        if (btnLimpar) btnLimpar.onclick = () => { meusIngredientes = []; renderizarInterface(); };
        renderizarInterface();
    });
};