export function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

export function restoreFocus(root) {
  const active = document.activeElement;
  if (!active || !root.contains(active)) {
    return () => {};
  }

  const id = active.id;
  const name = active.getAttribute('name');
  const selectionStart = typeof active.selectionStart === 'number' ? active.selectionStart : null;
  const selectionEnd = typeof active.selectionEnd === 'number' ? active.selectionEnd : null;

  return () => {
    let next = null;
    if (id) {
      next = root.querySelector(`#${CSS.escape(id)}`);
    } else if (name) {
      next = root.querySelector(`[name="${CSS.escape(name)}"]`);
    }
    if (!next) {
      return;
    }
    next.focus();
    if (
      selectionStart != null &&
      selectionEnd != null &&
      typeof next.setSelectionRange === 'function' &&
      (next.type === 'text' || next.type === 'search' || next.type === 'tel' || next.type === 'url' || next.type === 'password' || next.tagName === 'TEXTAREA')
    ) {
      try {
        next.setSelectionRange(selectionStart, selectionEnd);
      } catch {
        // Ignore unsupported selection ranges.
      }
    }
  };
}

export function currencyOptionsHtml(selected, options) {
  return options
    .map(
      (item) =>
        `<option value="${escapeHtml(item.value)}"${item.value === selected ? ' selected' : ''}>${escapeHtml(item.text)}</option>`,
    )
    .join('');
}
