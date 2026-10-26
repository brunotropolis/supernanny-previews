/* Black 2026 (Black Maternity + Clube do Bebê): contador semanal, formulário e redirecionamento.
   Tudo que muda fica neste bloco CONFIG. */
window.CONFIG = {
  // Primeira Black. Depois dela o contador pula sozinho pra terça seguinte.
  primeiraBlack: '2026-11-10',
  // Última terça de Black ('AAAA-MM-DD'). null = continua toda terça até alguém preencher.
  ultimaBlack: null,
  // Link pra onde a página de "entrando no grupo" leva. Vazio = mostra aviso de prévia.
  // Quando a ferramenta de grupos estiver pronta, trocar aqui (um link por frente).
  linkGrupo: {
    'black-maternity': '',
    'clube-do-bebe': ''
  }
};

(function () {
  const DIA = 864e5, BRT = 3 * 36e5;
  const semana = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];

  // Terça da próxima Black, em horário de Brasília.
  function proximaBlack() {
    const [y, m, d] = CONFIG.primeiraBlack.split('-').map(Number);
    const primeira = Date.UTC(y, m - 1, d) + BRT;
    const agora = Date.now();
    let alvo, hoje = false;
    if (agora < primeira) alvo = primeira;
    else {
      const dias = Math.floor((agora - primeira) / DIA), sem = Math.floor(dias / 7);
      if (dias % 7 === 0) { alvo = primeira + sem * 7 * DIA; hoje = true; }
      else alvo = primeira + (sem + 1) * 7 * DIA;
    }
    let acabou = false;
    if (CONFIG.ultimaBlack) {
      const [a, b, c] = CONFIG.ultimaBlack.split('-').map(Number);
      if (alvo > Date.UTC(a, b - 1, c) + BRT) acabou = true;
    }
    const dt = new Date(alvo - BRT);
    const dd = String(dt.getUTCDate()).padStart(2, '0'), mm = String(dt.getUTCMonth() + 1).padStart(2, '0');
    return { alvo, hoje, acabou, curta: `${dd}/${mm}`, longa: `${semana[dt.getUTCDay()]}, ${dd}/${mm}` };
  }

  function contador() {
    const p = proximaBlack();
    document.querySelectorAll('[data-data-black]').forEach(el => {
      el.textContent = p.hoje ? `hoje, ${p.longa}` : p.longa;
    });
    document.querySelectorAll('[data-data-curta]').forEach(el => { el.textContent = p.curta; });
    document.documentElement.classList.toggle('black-hoje', p.hoje);
    document.documentElement.classList.toggle('black-acabou', p.acabou);
    const box = document.querySelectorAll('[data-contador]');
    const pinta = () => {
      let s = Math.max(0, Math.floor((p.alvo - Date.now()) / 1000));
      const v = { d: Math.floor(s / 86400), h: Math.floor(s % 86400 / 3600), m: Math.floor(s % 3600 / 60), s: s % 60 };
      box.forEach(b => Object.keys(v).forEach(k => {
        const el = b.querySelector(`[data-${k}]`); if (el) el.textContent = String(v[k]).padStart(2, '0');
      }));
      if (s === 0 && !p.hoje) location.reload();
    };
    pinta(); setInterval(pinta, 1000);
  }

  // Máscara (41) 99999-9999
  function mascara(input) {
    input.addEventListener('input', () => {
      let d = input.value.replace(/\D/g, '').slice(0, 11), f = d;
      if (d.length > 2) f = `(${d.slice(0, 2)}) ${d.slice(2)}`;
      if (d.length > 7) f = `(${d.slice(0, 2)}) ${d.slice(2, d.length - 4)}-${d.slice(-4)}`;
      input.value = f;
    });
  }

  // Ponto de integração com a ferramenta de grupos (a fazer). Hoje não envia nada.
  async function enviarLead(lead) {
    return lead;
  }

  function formularios() {
    document.querySelectorAll('form[data-lead]').forEach(form => {
      const tel = form.querySelector('[name=whatsapp]'); mascara(tel);
      form.addEventListener('submit', async e => {
        e.preventDefault();
        if (form.querySelector('[name=site]').value) return; // robô
        const nome = form.querySelector('[name=nome]'), erro = form.querySelector('.erro');
        const digitos = tel.value.replace(/\D/g, '');
        erro.textContent = '';
        if (nome.value.trim().length < 2) { erro.textContent = 'Escreve seu nome pra gente te chamar certinho.'; nome.focus(); return; }
        if (digitos.length < 10) { erro.textContent = 'Confere o WhatsApp com DDD, por favor.'; tel.focus(); return; }
        const btn = form.querySelector('button'); btn.disabled = true; btn.classList.add('enviando');
        const q = new URLSearchParams(location.search);
        const lead = {
          nome: nome.value.trim(), whatsapp: '55' + digitos,
          frente: form.dataset.lead, versao: form.dataset.versao || '',
          origem: q.get('origem') || q.get('utm_source') || '', utm_campaign: q.get('utm_campaign') || '',
          enviado_em: new Date().toISOString()
        };
        try { await enviarLead(lead); } catch (_) {}
        try { sessionStorage.setItem('primeiroNome', lead.nome.split(' ')[0]); } catch (_) {}
        location.href = form.dataset.destino;
      });
    });
  }

  window.BLACK = { proximaBlack, contador, formularios };
  document.addEventListener('DOMContentLoaded', () => { contador(); formularios(); });
})();
