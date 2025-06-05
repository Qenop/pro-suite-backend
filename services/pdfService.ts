// backend/services/pdfService.ts
import PDFDocument from 'pdfkit';
import { IInvoice } from '../models/invoiceModel';

export const generateInvoicePdfBuffer = (
  invoice: IInvoice & {
    tenantName: string;
    propertyName?: string;
    unitId?: string;
    paymentDetails?: {
      accountName?: string;
      accountNumber?: string;
      bank?: string;
      deadline?: string | number;
    };
  }
): Promise<Buffer> => {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    const buffers: Uint8Array[] = [];

    doc.on('data', (chunk) => buffers.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(buffers)));
    doc.on('error', reject);

    const startX = 50;
    let y = 50;

    // ===== HEADER =====
    doc.fontSize(20).fillColor('blue').text(invoice.propertyName || 'Your Company Name', { align: 'center' });
    y += 30;
    doc.fontSize(16).fillColor('red').text('INVOICE', { align: 'center', underline: true });
    y += 30;

    // ===== BASIC DETAILS =====
    doc.fontSize(12).fillColor('black');
    [
      `Invoice #: ${invoice.invoiceNumber}`,
      `Tenant: ${invoice.tenantName}`,
      `Unit: ${invoice.unitId || 'N/A'}`,
      `Period: ${invoice.period}`,
      `Status: ${invoice.status}`,
      `Due Date: ${new Date(invoice.dueDate).toLocaleDateString()}`
    ].forEach(line => {
      doc.text(line, startX, y);
      y += 15;
    });
    y += 10;

    // ===== BILLING BREAKDOWN TABLE =====
    doc.fontSize(13).text('Billing Breakdown', startX, y, { underline: true });
    y += 20;

    const col1Width = 350;
    const col2Width = 100;
    const rowHeight = 20;

    // Table Headers
    doc.rect(startX, y, col1Width, rowHeight).stroke();
    doc.rect(startX + col1Width, y, col2Width, rowHeight).stroke();
    doc.fontSize(11)
      .text('Item', startX + 5, y + 5)
      .text('Amount (KES)', startX + col1Width + 5, y + 5);
    y += rowHeight;

    // Extract water items separately
    const waterItems: typeof invoice.lineItems = [];
    
    invoice.lineItems.forEach((item) => {
      const isWater = item.label.toLowerCase().includes('water') && item.detail?.includes('Prev');
      if (isWater) {
        waterItems.push(item);
        return; // Skip adding to main billing table
      }

      doc.rect(startX, y, col1Width, rowHeight).stroke();
      doc.rect(startX + col1Width, y, col2Width, rowHeight).stroke();

      doc.fontSize(10).text(item.label, startX + 5, y + 5);
      doc.text(item.amount.toFixed(2), startX + col1Width + 5, y + 5);
      y += rowHeight;

      if (item.detail) {
        doc.fontSize(9).fillColor('gray').text(`- ${item.detail}`, startX + 10, y, { width: 400 });
        doc.fillColor('black');
        y += 15;
      }
    });

    y += 10;
    y += 30;

    // ===== WATER USAGE TABLE =====
if (waterItems.length > 0) {
  doc.fontSize(13).text('Water Usage Details', startX, y, { underline: true });
  y += 20;

  const headers = ['Previous', 'Current', 'Consumed', 'Rate', 'Amount'];
  const colWidths = [80, 80, 80, 80, 130]; // Total: 450 = same as billing (350+100)
  const cellHeight = 20;

  // Header Row with BG Color
  let x = startX;
  headers.forEach((header, i) => {
    doc.rect(x, y, colWidths[i], cellHeight).fillAndStroke('#f0f0f0', 'black'); // light gray bg
    doc.fillColor('black').fontSize(10).text(header, x + 5, y + 5);
    x += colWidths[i];
  });
  y += cellHeight;

  // Data Rows
  waterItems.forEach((item) => {
    const regex = /Prev:\s*(\d+),\s*Curr:\s*(\d+),\s*Consumed:\s*(\d+),\s*Rate:\s*(\d+)/i;
    const match = item.detail?.match(regex);
    const [_, prev, curr, consumed, rate] = match || [];

    const values = [
      prev ?? '-',
      curr ?? '-',
      consumed ?? '-',
      rate ?? '-',
      item.amount.toFixed(2)
    ];

    let x = startX;
    values.forEach((val, i) => {
      doc.rect(x, y, colWidths[i], cellHeight).stroke();
      doc.fontSize(10).fillColor('black').text(val, x + 5, y + 5);
      x += colWidths[i];
    });
    y += cellHeight;
  });

  y += 10;

  // Move and style Total Due here
  doc.fontSize(13).fillColor('blue').font('Helvetica-Bold')
    .text(`Total Due: KES ${invoice.totalDue.toFixed(2)}`, startX, y);
  doc.font('Helvetica').fillColor('black'); // reset
  y += 30;
}

    // ===== PAYMENT DETAILS =====
    const p = invoice.paymentDetails || {};
    const hasPaymentInfo = p.accountName || p.accountNumber || p.bank || p.deadline;

    if (hasPaymentInfo) {
      doc.fontSize(13).text('Payment Details', startX, y, { underline: true });
      y += 20;

      doc.fontSize(11)
        .text(`Account Name: ${p.accountName || 'N/A'}`, startX, y); y += 15;
      doc.text(`Account Number: ${p.accountNumber || 'N/A'}`, startX, y); y += 15;
      doc.text(`Bank: ${p.bank || 'N/A'}`, startX, y); y += 15;
      doc.text(
        `Payment Deadline: ${p.deadline ? `By the ${p.deadline}th` : 'N/A'}`,
        startX,
        y
      ); y += 20;
    }

    // ===== NOTES & BALANCES =====
    doc.fontSize(12).text('Notes:', startX, y, { underline: true }); y += 15;
    doc.fontSize(10).text('Please make payment by the due date to avoid penalties.', startX, y); y += 20;

    const cf = invoice.lineItems.find((item) => item.label === 'Carried Forward Balance');
    if (cf) {
      doc.text(`Carried Forward: KES ${cf.amount.toFixed(2)}`, startX, y);
      y += 15;
    }

    const over = invoice.lineItems.find((item) => item.label === 'Carried Overpayment');
    if (over) {
      doc.text(`Overpayment Credit: KES ${Math.abs(over.amount).toFixed(2)}`, startX, y);
      y += 15;
    }

    doc.end();
  });
};
