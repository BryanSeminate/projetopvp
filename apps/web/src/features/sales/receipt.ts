import type { SaleDetail } from './sales.api';

const brl = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const esc = (s: string) => s.replace(/[<>&]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c]!));

/** Opens a print-friendly receipt for the sale in a new window and triggers print. */
export function printReceipt(sale: SaleDetail, companyName: string) {
  const rows = sale.items
    .map(
      (i) =>
        `<tr><td>${esc(i.product.name)}</td><td class="r">${Number(i.quantity)}x</td><td class="r">${brl(Number(i.unitPrice))}</td><td class="r">${brl(Number(i.subtotal))}</td></tr>`,
    )
    .join('');

  const payments = sale.payments
    .map((p) => `<div class="row"><span>${esc(p.paymentMethod.name)}</span><span>${brl(Number(p.amount))}</span></div>`)
    .join('');

  const installments = sale.installments.length
    ? `<div class="sec"><b>Parcelas</b>${sale.installments
        .map(
          (i) =>
            `<div class="row"><span>#${i.number} ${new Date(i.dueDate).toLocaleDateString('pt-BR')}</span><span>${brl(Number(i.amount))}</span></div>`,
        )
        .join('')}</div>`
    : '';

  const html = `<!doctype html><html><head><meta charset="utf-8"><title>Recibo #${sale.number}</title>
  <style>
    * { font-family: ui-monospace, monospace; font-size: 12px; }
    body { width: 280px; margin: 0 auto; padding: 8px; color: #111; }
    h1 { font-size: 14px; text-align: center; margin: 4px 0; }
    .muted { color: #555; text-align: center; margin-bottom: 8px; }
    table { width: 100%; border-collapse: collapse; }
    td { padding: 2px 0; }
    .r { text-align: right; }
    .sec { border-top: 1px dashed #999; margin-top: 8px; padding-top: 6px; }
    .row { display: flex; justify-content: space-between; }
    .total { font-size: 14px; font-weight: bold; border-top: 1px solid #000; margin-top: 6px; padding-top: 6px; }
  </style></head><body>
    <h1>${esc(companyName)}</h1>
    <div class="muted">Recibo de venda #${sale.number}<br>${new Date(sale.createdAt).toLocaleString('pt-BR')}</div>
    <div>Cliente: ${esc(sale.customer?.name ?? 'Consumidor')}</div>
    <div class="sec"><table>${rows}</table></div>
    <div class="sec"><div class="row"><span>Subtotal</span><span>${brl(Number(sale.subtotal))}</span></div>
      <div class="row"><span>Desconto</span><span>${brl(Number(sale.discount))}</span></div>
      <div class="row total"><span>TOTAL</span><span>${brl(Number(sale.total))}</span></div></div>
    ${payments ? `<div class="sec"><b>Pagamento</b>${payments}</div>` : ''}
    ${installments}
    <div class="muted" style="margin-top:12px">Obrigado pela preferência!</div>
    <script>window.onload = () => { window.print(); }</script>
  </body></html>`;

  const win = window.open('', '_blank', 'width=360,height=640');
  if (!win) return;
  win.document.write(html);
  win.document.close();
}
