document.querySelectorAll('[data-copy-link]').forEach((button) => {
  const share = button.closest('.post-share');
  const status = share.querySelector('[role="status"]');
  button.hidden = false;
  share.querySelector('[data-copy-separator]').hidden = false;

  button.addEventListener('click', async () => {
    const url = button.dataset.copyLink;
    status.textContent = '';
    try {
      await navigator.clipboard.writeText(url);
      status.textContent = 'Link copied.';
    } catch {
      window.prompt('Copy this link:', url);
      status.textContent = 'You can copy the link from the dialog.';
    }
  });
});
