/** Foxpost printable label — production tracking number + locker details from checkout. */
import { buildFoxpostTrackingUrl } from '@/lib/foxpostClient';

export type FoxpostLabelInput = {
  transactionId: string;
  productName: string;
  trackingNumber: string;
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

function isMobileViewport(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(max-width: 768px)').matches || /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent);
}

export function downloadFoxpostLabel(input: FoxpostLabelInput): { openedPopup: boolean } {
  const trackingUrl = buildFoxpostTrackingUrl(input.trackingNumber);
  const html = buildLabelHtml(input, trackingUrl);

  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const blobUrl = URL.createObjectURL(blob);

  const mobile = isMobileViewport();
  const popup = mobile
    ? window.open(blobUrl, '_blank')
    : window.open(blobUrl, '_blank', 'width=560,height=760');

  if (popup) {
    if (!mobile) {
      const triggerPrint = () => {
        try {
          popup.focus();
          popup.print();
        } catch {
          /* user can print manually with Ctrl+P */
        }
      };
      popup.addEventListener('load', () => {
        window.setTimeout(triggerPrint, 350);
      });
    }
    window.setTimeout(() => URL.revokeObjectURL(blobUrl), 5 * 60_000);
    markFoxpostLabelDownloaded(input.transactionId);
    return { openedPopup: true };
  }

  const a = document.createElement('a');
  a.href = blobUrl;
  a.download = `foxpost-${input.trackingNumber}.html`;
  a.rel = 'noopener';
  a.click();
  window.setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000);
  markFoxpostLabelDownloaded(input.transactionId);
  return { openedPopup: false };
}

function buildLabelHtml(input: FoxpostLabelInput, trackingUrl: string): string {
  return `<!DOCTYPE html>
<html lang="hu">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Foxpost címke — ${escapeHtml(input.trackingNumber)}</title>
  <style>
    body { font-family: system-ui, sans-serif; padding: 20px; max-width: 480px; margin: 0 auto; color: #111; }
    .logo { font-size: 28px; font-weight: 800; color: #e85d04; }
    .barcode { font-family: monospace; font-size: 22px; letter-spacing: 2px; margin: 16px 0; padding: 14px; border: 2px solid #333; text-align: center; font-weight: 700; }
    h1 { font-size: 18px; margin: 8px 0; }
    .muted { color: #666; font-size: 12px; }
    .box { border: 1px solid #ccc; border-radius: 8px; padding: 12px; margin-top: 12px; }
    .track a { color: #007782; font-weight: 600; }
    .print-btn { display: inline-block; margin: 18px 0 4px; padding: 12px 22px; background: #007782; color: #fff; border: 0; border-radius: 999px; font-weight: 700; font-size: 15px; cursor: pointer; }
    @media print {
      body { padding: 10px; }
      .print-btn { display: none; }
    }
  </style>
</head>
<body>
  <div class="logo">FOXPOST</div>
  <p class="muted">ROBEO szállítási címke — nyomtasd ki vagy mentsd PDF-be.</p>
  <div class="barcode">${escapeHtml(input.trackingNumber)}</div>
  <p class="track muted">Követés: <a href="${escapeHtml(trackingUrl)}" target="_blank" rel="noopener">${escapeHtml(trackingUrl)}</a></p>
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
    ${escapeHtml(input.buyerAddress || input.foxpostTerminalAddress || '—')}
  </div>
  <div class="box">
    <strong>Feladó</strong><br/>
    ${escapeHtml(input.sellerEmail || 'Eladó')}
  </div>
  <p class="muted">Tranzakció: ${escapeHtml(input.transactionId)}</p>
  <button class="print-btn" onclick="window.print()">🖨️ Nyomtatás</button>
  <p class="muted">Mobilon a Megosztás / Nyomtatás menüből is mentheted PDF-be.</p>
  <script>
    (function () {
      var mobile = /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent);
      function go() {
        try { window.focus(); } catch (e) {}
        if (!mobile) {
          setTimeout(function () { try { window.print(); } catch (e) {} }, 400);
        }
      }
      if (document.readyState === 'complete') go();
      else window.addEventListener('load', go);
    })();
  </script>
</body>
</html>`;
}

/** @deprecated Use downloadFoxpostLabel — kept for import compatibility */
export const downloadFoxpostLabelStub = downloadFoxpostLabel;

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
