const PDFDocument = require('pdfkit');

function generateInvoice(res, order) {
  const doc = new PDFDocument();

  // Set response headers
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename=invoice-${order._id}.pdf`);

  doc.pipe(res);

  doc.fontSize(20).text('Flower & Green Shop', { align: 'center' });
  doc.moveDown();
  doc.fontSize(14).text(`Invoice for Order ID: ${order._id}`);
  doc.text(`Date: ${order.createdAt.toDateString()}`);
  doc.text(`Customer Email: ${order.user.email}`);
  doc.moveDown();

  doc.fontSize(16).text('Order Items');
  doc.moveDown(0.5);
  order.orderItems.forEach(item => {
    doc.text(`${item.name} - Qty: ${item.quantity} x ₹${item.price}`);
  });

  doc.moveDown();
  doc.fontSize(14).text(`Total Amount: ₹${order.totalAmount}`, { align: 'right' });
  doc.text(`Payment: ${order.isPaid ? 'PAID' : 'UNPAID'}`, { align: 'right' });

  doc.end();
}

module.exports = generateInvoice;
