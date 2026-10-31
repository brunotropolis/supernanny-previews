/* Black 2026 (Black Maternity + Clube do Bebê): contador semanal, formulário e redirecionamento.
   Tudo que muda fica neste bloco CONFIG. */
window.CONFIG = {
  // Primeira Black. Depois dela o contador pula sozinho pra terça seguinte.
  primeiraBlack: '2026-11-10',
  // Última terça de Black ('AAAA-MM-DD'). null = continua toda terça até alguém preencher.
  ultimaBlack: null,
  // Link RESERVA da página de "entrando no grupo". O normal é o distribuidor do meteórico v2
  // (/api/entrar) escolher o grupo pelo WhatsApp (veteranas x novas, mesmo grupo de antes) e
  // esse link substituir o daqui. Reserva = grupo captando de 31/10 (Black #1 e Clube novas #1).
  linkGrupo: {
    'black-maternity': 'https://chat.whatsapp.com/IvR5e4SChoTIHI5uWSyzS8',
    'clube-do-bebe': 'https://chat.whatsapp.com/FjxNqnmAiJ292VYv0BdSkI'
  }
};
// Link escolhido pelo distribuidor no envio do formulário (guardado na aba, nunca na URL)
['black-maternity', 'clube-do-bebe'].forEach(f => {
  try { const l = sessionStorage.getItem('linkGrupo:' + f); if (l) CONFIG.linkGrupo[f] = l; } catch (_) {}
});

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

  // Manda o lead pro distribuidor (Worker do domínio -> n8n) e guarda o link do grupo escolhido.
  // Falhou ou demorou mais de 9s: a tela de entrada usa o link reserva do CONFIG.
  async function enviarLead(lead) {
    const ctl = new AbortController(), t = setTimeout(() => ctl.abort(), 9000);
    try {
      const r = await fetch('/api/entrar', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(lead), signal: ctl.signal });
      const d = await r.json();
      if (d && d.ok && /^https:\/\/chat\.whatsapp\.com\//.test(d.link)) sessionStorage.setItem('linkGrupo:' + lead.frente, d.link);
    } finally { clearTimeout(t); }
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
        if (nome && nome.value.trim().length < 2) { erro.textContent = 'Escreve seu nome pra gente te chamar certinho.'; nome.focus(); return; }
        if (digitos.length < 10) { erro.textContent = 'Confere o WhatsApp com DDD, por favor.'; tel.focus(); return; }
        ev('envio', { versao: form.dataset.versao || '' });
        const btn = form.querySelector('button'); btn.disabled = true; btn.classList.add('enviando');
        const q = new URLSearchParams(location.search);
        const lead = {
          nome: nome ? nome.value.trim() : '', whatsapp: '55' + digitos,
          frente: form.dataset.lead, versao: form.dataset.versao || '',
          origem: q.get('origem') || q.get('utm_source') || '', utm_campaign: q.get('utm_campaign') || '',
          enviado_em: new Date().toISOString()
        };
        try { await enviarLead(lead); } catch (_) {}
        try { if (lead.nome) sessionStorage.setItem('primeiroNome', lead.nome.split(' ')[0]); else sessionStorage.removeItem('primeiroNome'); } catch (_) {}
        location.href = form.dataset.destino;
      });
    });
  }

  // Medidor próprio (dash "Black 2026" no hub conteudo): manda pro Worker do domínio (/__ev), que grava no Supabase.
  // Só no domínio de verdade (na prévia do github.io não mede). Nada de nome ou WhatsApp: só página, botão, origem e aparelho.
  const MEDE = /(^|\.)manualdorecemnascido\.com\.br$/.test(location.hostname);
  const ss = (k, v) => { try { if (v === undefined) return sessionStorage.getItem(k); sessionStorage.setItem(k, v); } catch (_) {} return null; };
  const id = () => Math.random().toString(36).slice(2) + Date.now().toString(36);
  function ev(evento, extra) {
    if (!MEDE) return;
    let uid = null; try { uid = localStorage.getItem('bk_uid'); if (!uid) localStorage.setItem('bk_uid', uid = id()); } catch (_) {}
    let sid = ss('bk_sid'); if (!sid) ss('bk_sid', sid = id());
    const q = new URLSearchParams(location.search);
    const o = q.get('utm_source') || q.get('origem') || q.get('rede');
    if (o && !ss('bk_origem')) { ss('bk_origem', o); ss('bk_camp', q.get('utm_campaign') || ''); }
    const ua = navigator.userAgent;
    const corpo = Object.assign({
      evento, page: location.pathname.replace(/index\.html$/, '').replace(/\/+$/, '') || '/',
      origem: ss('bk_origem') || (document.referrer && !document.referrer.includes(location.hostname) ? new URL(document.referrer).hostname : ''),
      campanha: ss('bk_camp') || '', sid, uid,
      device: /iPad|Tablet/i.test(ua) ? 'tablet' : /Mobi|Android|iPhone/i.test(ua) ? 'mobile' : 'desktop',
      os: /iPhone|iPad|Mac OS/i.test(ua) ? (/Mobi|iPhone|iPad/i.test(ua) ? 'ios' : 'mac') : /Android/i.test(ua) ? 'android' : /Windows/i.test(ua) ? 'windows' : 'outro'
    }, extra || {});
    try { navigator.sendBeacon('/__ev', new Blob([JSON.stringify(corpo)], { type: 'application/json' })); } catch (_) {}
  }
  function medir() {
    ev('pageview');
    document.addEventListener('click', e => {
      const b = e.target.closest('a.cta, button[type=submit], a[href^="https://chat.whatsapp.com"]'); if (!b) return;
      const sec = b.closest('[id], section, header, footer');
      const onde = sec ? (sec.id || (sec.className || '').toString().split(' ')[0] || sec.tagName.toLowerCase()) : '';
      ev('clique', { alvo: (b.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 60) + (onde ? ' · ' + onde : '') });
    }, true);
  }

  window.BLACK = { proximaBlack, contador, formularios, ev };
  document.addEventListener('DOMContentLoaded', () => { contador(); formularios(); medir(); });
})();
