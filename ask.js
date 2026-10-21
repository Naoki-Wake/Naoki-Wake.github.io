// "Ask this paper": instant answers from precomputed FAQs, plus streamed AI answers grounded in the paper.
(() => {
  const script = document.currentScript;
  const endpoint = script && script.dataset.endpoint;
  const ARXIV = /arxiv\.org\/abs\/([0-9]{4}\.[0-9]{4,5})/;

  fetch('/papers/faq/index.json')
    .then((r) => (r.ok ? r.json() : []))
    .then((ids) => attach(new Set(ids)))
    .catch(() => {});

  function attach(ids) {
    document.querySelectorAll('.papers li').forEach((li, i) => {
      const link = li.querySelector('a[href*="arxiv.org/abs/"]');
      const m = link && link.href.match(ARXIV);
      if (!m || !ids.has(m[1])) return;
      const id = m[1];
      const toggle = el('button', { type: 'button', class: 'ask-toggle', 'aria-expanded': 'false' }, 'Ask this paper');
      const panel = el('div', { class: 'ask-panel', id: `ask-${id}-${i}`, hidden: '' });
      toggle.setAttribute('aria-controls', panel.id);
      li.append(toggle, panel);
      let ready = false;
      toggle.addEventListener('click', () => {
        const open = toggle.getAttribute('aria-expanded') !== 'true';
        toggle.setAttribute('aria-expanded', String(open));
        toggle.textContent = open ? 'Close' : 'Ask this paper';
        panel.hidden = !open;
        if (open && !ready) {
          ready = true;
          build(panel, id);
        }
      });
    });
  }

  async function build(panel, id) {
    const history = [];
    const log = el('div', { class: 'ask-log', 'aria-live': 'polite' });
    const input = el('textarea', {
      rows: '2',
      maxlength: '1000',
      placeholder: 'Ask anything about this paper, in any language',
      'aria-label': 'Your question',
    });
    const send = el('button', { type: 'submit' }, 'Ask');
    const form = el('form', { class: 'ask-form' }, input, send);
    const suggest = el('div', { class: 'ask-suggest' });
    const note = el(
      'p',
      { class: 'ask-note' },
      'Answers are written by an AI from the paper text, not by Naoki, and can be wrong. Check the paper for anything important.',
    );
    panel.append(suggest, log, form, note);

    try {
      const faq = await fetch(`/papers/faq/${id}.json`).then((r) => (r.ok ? r.json() : null));
      if (faq) {
        if (faq.summary) panel.prepend(el('p', { class: 'ask-summary' }, faq.summary));
        (faq.faq || []).forEach((item) => {
          const b = el('button', { type: 'button' }, item.q);
          b.addEventListener('click', () => {
            const a = addTurn(log, item.q);
            a.textContent = item.a;
            if (item.source) a.append(el('span', { class: 'ask-source' }, `Source: ${item.source}`));
            history.push({ role: 'user', text: item.q }, { role: 'model', text: item.a });
            b.disabled = true;
          });
          suggest.append(b);
        });
        if (faq.status) note.append(` Suggested answers: ${faq.status}`);
      }
    } catch {
      // Suggestions are optional; free-form questions still work.
    }

    if (!endpoint) {
      form.hidden = true;
      return;
    }

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) {
        e.preventDefault();
        form.requestSubmit();
      }
    });

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const question = input.value.trim();
      if (!question || send.disabled) return;
      input.value = '';
      send.disabled = true;
      const a = addTurn(log, question);
      a.classList.add('ask-pending');
      a.textContent = 'Thinking…';
      let answer = '';
      try {
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ paper: id, question, history }),
        });
        if (!res.ok || !res.body) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.message || 'The answering service is unavailable right now.');
        }
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          answer += decoder.decode(value, { stream: true });
          a.textContent = answer;
        }
        if (!answer) throw new Error('No answer came back. Please try again.');
        history.push({ role: 'user', text: question }, { role: 'model', text: answer });
      } catch (err) {
        const message = err instanceof TypeError ? 'The answering service is unavailable right now.' : err.message;
        a.textContent = answer || message;
        a.classList.add('ask-error');
      } finally {
        a.classList.remove('ask-pending');
        send.disabled = false;
        input.focus();
      }
    });
  }

  function addTurn(log, question) {
    const a = el('div', { class: 'ask-a' });
    log.append(el('div', { class: 'ask-turn' }, el('p', { class: 'ask-q' }, question), a));
    return a;
  }

  function el(tag, attrs, ...children) {
    const node = document.createElement(tag);
    Object.entries(attrs || {}).forEach(([k, v]) => node.setAttribute(k, v));
    node.append(...children);
    return node;
  }
})();
