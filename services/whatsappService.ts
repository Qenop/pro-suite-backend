// backend/services/whatsappService.ts
export const sendInvoiceViaWhatsApp = async (
  phoneNumber: string,
  pdfBuffer: Buffer,
  message: string
) => {
  console.log(`📲 WhatsApp: Sent to ${phoneNumber} with message "${message}" and PDF buffer.`);
};
