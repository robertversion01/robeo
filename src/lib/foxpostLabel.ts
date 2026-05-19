/** Foxpost stub címke — böngészőben letölthető HTML (nyomtatás → PDF). */
export type FoxpostLabelInput = {
  transactionId: string;
  productName: string;
  buyerName?: string;
  buyerAddress?: string;
  sellerEmail?: string;
  foxpostTerminalId?: string;
  foxpostTerminalName?: string;
  foxpostTerminalAddress?: string;
};

const LABEL_DOWNLOADED_PREFIX = 'robeo_foxpost_label_';

export function markFoxpostLabelDownloaded(transactionId: string): void {
  if (typeof window === 'undefined' || !transactionId) return;
  localStorage.setItem(`${LABEL_DOWNLOADED_PREFIX}${transactionId}`, '1');
}

export function hasFoxpostLabelDownloaded(transactionId: string): boolean {
  if (typeof window === 'undefined' || !transactionId) return false;
  return localStorage.getItem(`${LABEL_DOWNLOADED_PREFIX}${transactionId}`) === '1';
}

export function downloadFoxpostLabelStub(input: FoxpostLabelInput): void {
  const html = `<!DOCTYPE html>
<html lang="hu">
<head>
  <meta charset="utf-8" />
  <title>Foxpost címke — ${escapeHtml(input.productName)}</title>
  <style>
    body { font-family: system-ui, sans-serif; padding: 24px; max-width: 480px; margin: 0 auto; }
    .logo { font-size: 28px; font-weight: 800; color: #e85d04; }
    .barcode { font-family: monospace; font-size: 22px; letter-spacing: 2px; margin: 16px 0; padding: 12px; border: 2px dashed #333; }
    h1 { font-size: 18px; margin: 8px 0; }
    .muted { color: #666; font-size: 12px; }
    .box { border: 1px solid #ccc; border-radius: 8px; padding: 12px; margin-top: 12px; }
  </style>
</head>
<body>
  <div class="logo">FOXPOST</div>
  <p class="muted">ROBEO stub szállítási címke — nyomtasd PDF-be vagy vidd a csomagpontra.</p>
  <div class="barcode">*${input.transactionId.slice(0, 8).toUpperCase()}*</div>
  <h1>${escapeHtml(input.productName)}</h1>
  ${
    input.foxpostTerminalName || input.foxpostTerminalAddress
      ? `<div class="box" style="border-color:#e85d04;background:#fff7ed">
    <strong>🦊 Foxpost automata (átvétel)</strong><br/>
    ${escapeHtml(input.foxpostTerminalName || '')}<br/>
    ${escapeHtml(input.foxpostTerminalAddress || '')}<br/>
    <span class="muted">Automata ID: ${escapeHtml(input.foxpostTerminalId || '—')}</span>
  </div>`
      : ''
  }
  <div class="box">
    <strong>Címzett</strong><br/>
    ${escapeHtml(input.buyerName || 'Vevő')}<br/>
    ${escapeHtml(input.buyerAddress || input.foxpostTerminalAddress || 'Cím a profilban / chatben')}
  </div>
  <div class="box">
    <strong>Feladó</strong><br/>
    ${escapeHtml(input.sellerEmail || 'Eladó')}
  </div>
  <p class="muted">Tranzakció: ${escapeHtml(input.transactionId)}</p>
  <script>window.onload = () => window.print();</script>
</body>
</html>`;

  const blob = new Blob([html], {
    type: 'text/html;charset=utf-8',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `foxpost-cimke-${input.transactionId.slice(0, 8)}.html`;
  a.click();
  URL.revokeObjectURL(url);
  markFoxpostLabelDownloaded(input.transactionId);
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
