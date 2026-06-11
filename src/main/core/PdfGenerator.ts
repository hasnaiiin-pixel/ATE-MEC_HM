/**
 * PdfGenerator - generazione certificati/report PDF. Gestisce layout, loghi e risultati test senza sovrapposizioni.
 *
 * Commento introdotto in AT-MEC HM 2.14 per rendere esplicite responsabilita,
 * flusso dati e punti critici di stabilita del modulo.
 */
import PDFDocument from 'pdfkit';
import * as fs from 'fs';
import * as path from 'path';
import { TestReport } from './AuditSystem';

export class PdfGenerator {
  private static safeFilePart(value: any): string {
    return String(value || 'ND').trim().replace(/[^a-zA-Z0-9_\-]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 80) || 'ND';
  }

  public static generateCertificate(report: TestReport): string {
    const doc = new PDFDocument({ size: 'A4', margin: 40 });
    const outputDir = path.join(process.cwd(), 'certificates');
    if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

    const datePart = new Date(report.timestamp || Date.now()).toISOString().slice(0, 19).replace(/[T:]/g, '-');
    const lotPart = PdfGenerator.safeFilePart((report as any).lot_number || (report as any).work_order || 'NOLOTTO');
    const serialPart = PdfGenerator.safeFilePart(report.serial_dut || 'NOSERIAL');
    const resultPart = PdfGenerator.safeFilePart(report.final_result || 'ND');
    const fileName = `${lotPart}_${serialPart}_${datePart}_${resultPart}.pdf`;
    const outputPath = path.join(outputDir, fileName);
    doc.pipe(fs.createWriteStream(outputPath));

    const passColor = '#2ecc71';
    const failColor = '#ff4136';
    const stopColor = '#f39c12';
    const resultColor = report.final_result === 'PASS' ? passColor : (String(report.final_result || '').includes('STOP') ? stopColor : failColor);

    doc.rect(0, 0, 600, 15).fill(resultColor);

    const defaultLogoBase = path.join(process.cwd(), 'assets', 'default_logos');
    let reportLarge = path.join(defaultLogoBase, 'MEC.PNG');
    let reportSmall = path.join(defaultLogoBase, 'MIRZA_LOGO.png');
    let logoBackgroundMode = 'transparent';
    try {
      const cfgPath = path.join(process.cwd(), 'config', 'app_settings.json');
      if (fs.existsSync(cfgPath)) {
        const cfg = JSON.parse(fs.readFileSync(cfgPath, 'utf8'));
        reportLarge = cfg.reportLargeLogoPath || cfg.companyLogoPath || reportLarge;
        reportSmall = cfg.reportSmallLogoPath || cfg.builderLogoPath || reportSmall;
        const bg = cfg.logoBgModes || {};
        logoBackgroundMode = bg.reportLarge === 'white' || bg.reportSmall === 'white' ? 'white' : (cfg.logoBackgroundMode || 'transparent');
      }
      // Header loghi: azienda MEC a sinistra, sviluppatore MIRZA a destra.
      // Le scritte iniziano sotto l'area loghi per evitare sovrapposizioni.
      if (logoBackgroundMode === 'white') {
        doc.roundedRect(32, 22, 190, 74, 8).fill('#ffffff');
        doc.roundedRect(382, 22, 178, 74, 8).fill('#ffffff');
      }
      if (reportLarge && fs.existsSync(reportLarge)) doc.image(reportLarge, 40, 28, { fit: [170, 60] });
      if (reportSmall && fs.existsSync(reportSmall)) doc.image(reportSmall, 392, 26, { fit: [158, 60], align: 'right' });
    } catch {}

    doc.fillColor('#1a1a24').fontSize(21).text('ATE-MEC AUTOMATED TEST REPORT', 40, 104, { width: 510, align: 'center' });
    doc.fontSize(10).fillColor('#7f8c8d').text('Certificato di Collaudo Elettronico Funzionale ed Audit Trail', 40, 130, { width: 510, align: 'center' });
    doc.moveTo(40, 152).lineTo(550, 152).stroke('#dcdde1');

    doc.fillColor('#2f3640').fontSize(11).text(`Data Test: ${new Date(report.timestamp).toLocaleString('it-IT')}`, 40, 172);
    doc.text(`Operatore di Linea: ${report.operator}`, 40, 187);
    doc.text(`Modello Prodotto: ${report.recipe_name} (v${report.recipe_version})`, 40, 202);
    doc.text(`Seriale DUT: ${report.serial_dut}`, 40, 217);
    doc.text(`Commessa/Lotto: ${(report as any).lot_number || (report as any).work_order || 'N/D'}`, 40, 232);
    doc.text(`Tempo Esecuzione: ${(report.execution_time_ms / 1000).toFixed(2)}s`, 40, 247);
    if ((report as any).repair_note) doc.text(`Relazione riparazione: ${(report as any).repair_note}`, 40, 262, { width: 320 });

    doc.rect(380, 172, 170, 55).fill(resultColor);
    doc.fillColor('#ffffff').fontSize(24).font('Helvetica-Bold').text(report.final_result, 380, 184, { width: 170, align: 'center' });
    doc.font('Helvetica').fontSize(10).text('RISULTATO FINALE', 380, 212, { width: 170, align: 'center' });

    doc.fillColor('#2f3640').fontSize(14).font('Helvetica-Bold').text('Dettaglio Analisi Parametrica Step', 40, 288);
    doc.font('Helvetica');
    doc.moveTo(40, 305).lineTo(550, 305).stroke('#dcdde1');

    doc.fillColor('#ffffff');
    doc.rect(40, 308, 510, 18).fill('#2f3640');
    doc.fillColor('#ffffff').fontSize(9).font('Helvetica-Bold');
    doc.text('STEP', 45, 312);
    doc.text('TIPO', 90, 312);
    doc.text('VALORE MISURATO', 260, 312);
    doc.text('ESITO', 480, 312);
    doc.font('Helvetica');

    let yPos = 331;
    report.steps_log.forEach((step, i) => {
      if (yPos > 750) {
        doc.addPage();
        yPos = 40;
      }
      const rowColor = i % 2 === 0 ? '#f8f9fa' : '#ffffff';
      doc.rect(40, yPos - 2, 510, 17).fill(rowColor);
      doc.fillColor('#2f3640').fontSize(9);
      doc.text(`#${step.step_id}`, 45, yPos);
      doc.text(step.type, 90, yPos);
      doc.text(step.measured !== null && step.measured !== undefined ? `${String(step.measured)}${(step as any).unit ? ' '+(step as any).unit : ''}${(step as any).measurement_source ? ' ['+(step as any).measurement_source+']' : ''}` : 'N/A', 260, yPos);
      const eColor = step.result === 'PASS' ? passColor : (step.result === 'DONE' ? '#3498db' : (String(step.result || '').includes('STOP') ? stopColor : failColor));
      doc.fillColor(eColor).font('Helvetica-Bold').text(step.result, 480, yPos);
      doc.font('Helvetica');
      yPos += 18;
    });

    doc.moveTo(40, yPos + 5).lineTo(550, yPos + 5).stroke('#dcdde1');
    doc.fillColor('#7f8c8d').fontSize(8).text(
      `Generato da ATE-MEC Suite v1.0.0 — ${new Date().toLocaleString('it-IT')} — Documento conforme ISO 9001`,
      40, yPos + 15, { align: 'center', width: 510 }
    );

    doc.end();
    console.log(`[PDF] Certificato generato: ${outputPath}`);
    return outputPath;
  }
}
