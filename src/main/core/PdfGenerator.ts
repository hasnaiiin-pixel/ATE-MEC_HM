/**
 * PdfGenerator - generazione certificati/report PDF. Gestisce layout, loghi e risultati test senza sovrapposizioni.
 * AT-MEC_HM_4.12D: report professionale con loghi azienda/sviluppatore, misure universali,
 * tolleranze, origine misura AUTOMATICA/MANUALE e firma operatore.
 */
import PDFDocument from 'pdfkit';
import * as fs from 'fs';
import * as path from 'path';
import { TestReport } from './AuditSystem';

export class PdfGenerator {
  private static readonly APP_VERSION = '4.12I';

  private static safeFilePart(value: any): string {
    return String(value || 'ND').trim().replace(/[^a-zA-Z0-9_\-]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 80) || 'ND';
  }

  private static text(value: any, fallback = 'N/D'): string {
    if (value === null || value === undefined || value === '') return fallback;
    return String(value);
  }

  private static numericText(value: any, unit = ''): string {
    if (value === null || value === undefined || value === '') return 'N/D';
    const n = Number(value);
    const v = Number.isFinite(n) ? String(Number(n.toFixed(6))).replace('.', ',') : String(value);
    return `${v}${unit ? ' ' + unit : ''}`;
  }

  private static dateText(value: any): string {
    const d = value ? new Date(value) : new Date();
    return Number.isNaN(d.getTime()) ? 'N/D' : d.toLocaleString('it-IT');
  }

  private static loadReportLogos(): { reportLarge: string; reportSmall: string; logoBackgroundMode: string } {
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
    } catch {}
    return { reportLarge, reportSmall, logoBackgroundMode };
  }

  private static resolveCustomerLogo(report: any): string {
    const explicit = String(report?.customer_logo || report?.client_logo || '').trim();
    if (explicit && fs.existsSync(explicit)) return explicit;
    const customer = PdfGenerator.safeFilePart(report?.customer_name || report?.client_name || report?.customer || '');
    if (!customer || customer === 'ND') return '';
    const candidates = [
      path.join(process.cwd(), 'assets', 'customers', `${customer}.png`),
      path.join(process.cwd(), 'assets', 'customers', `${customer}.jpg`),
      path.join(process.cwd(), 'assets', 'customers', `${customer}.jpeg`),
      path.join(process.cwd(), 'src', 'renderer', 'assets', 'customers', `${customer}.png`)
    ];
    return candidates.find(c => fs.existsSync(c)) || '';
  }

  private static drawHeader(doc: PDFKit.PDFDocument, title: string, subtitle: string, resultColor: string, report?: any): void {
    const { reportLarge, reportSmall, logoBackgroundMode } = PdfGenerator.loadReportLogos();
    const customerLogo = PdfGenerator.resolveCustomerLogo(report || {});
    const customerName = PdfGenerator.text((report as any)?.customer_name || (report as any)?.client_name || (report as any)?.customer, '');
    doc.rect(0, 0, 600, 16).fill(resultColor);
    if (logoBackgroundMode === 'white') {
      doc.roundedRect(32, 24, 188, 70, 8).fill('#ffffff').stroke('#e4e7ee');
      doc.roundedRect(382, 24, 178, 70, 8).fill('#ffffff').stroke('#e4e7ee');
    }
    try { if (reportLarge && fs.existsSync(reportLarge)) doc.image(reportLarge, 40, 30, { fit: [168, 56] }); } catch {}
    try { if (reportSmall && fs.existsSync(reportSmall)) doc.image(reportSmall, 394, 28, { fit: [154, 58], align: 'right' }); } catch {}
    if (customerLogo) {
      try { doc.roundedRect(232, 24, 128, 54, 8).fill('#ffffff').stroke('#e4e7ee'); doc.image(customerLogo, 240, 30, { fit: [112, 42], align: 'center' }); } catch {}
    } else if (customerName) {
      doc.roundedRect(232, 24, 128, 54, 8).fill('#ffffff').stroke('#e4e7ee');
      doc.fillColor('#1f2937').font('Helvetica-Bold').fontSize(11).text(customerName, 238, 43, { width: 116, align: 'center' });
    }
    doc.fillColor('#1a1a24').font('Helvetica-Bold').fontSize(19).text(title, 40, 102, { width: 510, align: 'center' });
    doc.font('Helvetica').fontSize(9).fillColor('#667085').text(subtitle, 40, 128, { width: 510, align: 'center' });
    doc.moveTo(40, 150).lineTo(550, 150).lineWidth(1).stroke('#d0d5dd');
  }

  private static drawKeyValue(doc: PDFKit.PDFDocument, x: number, y: number, label: string, value: any, width = 240): void {
    doc.font('Helvetica-Bold').fontSize(8).fillColor('#667085').text(label.toUpperCase(), x, y, { width });
    doc.font('Helvetica').fontSize(10).fillColor('#1f2937').text(PdfGenerator.text(value), x, y + 11, { width });
  }

  private static drawFooter(doc: PDFKit.PDFDocument): void {
    const bottom = 805;
    doc.moveTo(40, bottom - 10).lineTo(550, bottom - 10).stroke('#e5e7eb');
    doc.font('Helvetica').fontSize(8).fillColor('#667085')
      .text(`Generato da AT-MEC HM ${PdfGenerator.APP_VERSION} — ${new Date().toLocaleString('it-IT')}`, 40, bottom, { width: 255, align: 'left' });
    doc.text('Documento report collaudo / tracciabilità — uso interno qualità', 295, bottom, { width: 255, align: 'right' });
  }

  private static ensureSpace(doc: PDFKit.PDFDocument, yPos: number, needed = 44): number {
    if (yPos + needed > 790) {
      PdfGenerator.drawFooter(doc);
      doc.addPage();
      return 44;
    }
    return yPos;
  }

  private static measurementSummary(step: any): string {
    const unit = PdfGenerator.text(step.unit, '');
    const measured = step.measured !== null && step.measured !== undefined ? PdfGenerator.numericText(step.measured, unit) : 'N/D';
    const target = step.target !== null && step.target !== undefined ? PdfGenerator.numericText(step.target, unit) : '';
    const min = step.min !== null && step.min !== undefined ? PdfGenerator.numericText(step.min, unit) : '';
    const max = step.max !== null && step.max !== undefined ? PdfGenerator.numericText(step.max, unit) : '';
    const tol = step.tolerance !== null && step.tolerance !== undefined ? `±${PdfGenerator.numericText(step.tolerance, unit)}` : '';
    const parts = [`Misurato: ${measured}`];
    if (target) parts.push(`Atteso: ${target}`);
    if (min || max) parts.push(`Range: ${min || 'N/D'} → ${max || 'N/D'}`);
    if (tol) parts.push(`Tol: ${tol}`);
    return parts.join('\n');
  }

  public static generateCertificate(report: TestReport): string {
    const doc = new PDFDocument({ size: 'A4', margin: 40, bufferPages: true });
    const outputDir = path.join(process.cwd(), 'certificates');
    if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

    const datePart = new Date(report.timestamp || Date.now()).toISOString().slice(0, 19).replace(/[T:]/g, '-');
    const lotPart = PdfGenerator.safeFilePart((report as any).lot_number || (report as any).work_order || 'NOLOTTO');
    const serialPart = PdfGenerator.safeFilePart(report.serial_dut || 'NOSERIAL');
    const resultPart = PdfGenerator.safeFilePart(report.final_result || 'ND');
    const fileName = `${lotPart}_${serialPart}_${datePart}_${resultPart}.pdf`;
    const outputPath = path.join(outputDir, fileName);
    doc.pipe(fs.createWriteStream(outputPath));

    const passColor = '#12b76a';
    const failColor = '#f04438';
    const stopColor = '#f79009';
    const resultColor = report.final_result === 'PASS' ? passColor : (String(report.final_result || '').includes('STOP') ? stopColor : failColor);

    PdfGenerator.drawHeader(doc, 'AT-MEC HM - TEST REPORT', 'Certificato di collaudo, misure universali e tracciabilità prodotto', resultColor, report as any);

    doc.roundedRect(40, 164, 315, 148, 10).stroke('#d0d5dd');
    PdfGenerator.drawKeyValue(doc, 54, 178, 'Data test', PdfGenerator.dateText(report.timestamp), 140);
    PdfGenerator.drawKeyValue(doc, 205, 178, 'Operatore', report.operator, 135);
    PdfGenerator.drawKeyValue(doc, 54, 214, 'Ricetta', `${PdfGenerator.text(report.recipe_name)} v${PdfGenerator.text(report.recipe_version, '-')}`, 286);
    PdfGenerator.drawKeyValue(doc, 54, 250, 'Seriale DUT', PdfGenerator.text(report.serial_dut, 'N/D'), 130);
    PdfGenerator.drawKeyValue(doc, 205, 250, 'Commessa / Lotto', (report as any).lot_number || (report as any).work_order || 'N/D', 135);
    PdfGenerator.drawKeyValue(doc, 54, 286, 'Postazione', (report as any).station_name || (report as any).station_id || 'N/D', 140);
    PdfGenerator.drawKeyValue(doc, 205, 286, 'Station ID / Sede', [((report as any).station_id || ''), ((report as any).station_site || '')].filter(Boolean).join(' / ') || 'N/D', 135);

    doc.roundedRect(380, 164, 170, 78, 12).fill(resultColor);
    doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(25).text(PdfGenerator.text(report.final_result), 380, 185, { width: 170, align: 'center' });
    doc.font('Helvetica').fontSize(9).text('RISULTATO FINALE', 380, 218, { width: 170, align: 'center' });
    doc.fillColor('#1f2937').font('Helvetica').fontSize(10).text(`Tempo esecuzione: ${((report.execution_time_ms || 0) / 1000).toFixed(2)} s`, 380, 254, { width: 170, align: 'center' });

    let yPos = 334;
    if ((report as any).repair_note) {
      doc.roundedRect(40, yPos, 510, 42, 8).fill('#fff7ed').stroke('#fed7aa');
      doc.fillColor('#9a3412').font('Helvetica-Bold').fontSize(9).text('NOTA RIPARAZIONE / INTERVENTO', 54, yPos + 8);
      doc.font('Helvetica').fontSize(9).fillColor('#431407').text(String((report as any).repair_note), 54, yPos + 22, { width: 482, height: 16, ellipsis: true });
      yPos += 58;
    }

    doc.fillColor('#1f2937').font('Helvetica-Bold').fontSize(13).text('Dettaglio step e misure', 40, yPos);
    yPos += 22;

    doc.rect(40, yPos, 510, 22).fill('#111827');
    doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(8);
    doc.text('STEP', 46, yPos + 7, { width: 38 });
    doc.text('TIPO', 86, yPos + 7, { width: 88 });
    doc.text('VALORI / TOLLERANZA', 178, yPos + 7, { width: 168 });
    doc.text('ORIGINE / DEVICE', 350, yPos + 7, { width: 92 });
    doc.text('ESITO', 468, yPos + 7, { width: 72, align: 'center' });
    yPos += 27;

    (report.steps_log || []).forEach((step: any, i: number) => {
      const rowHeight = 48;
      yPos = PdfGenerator.ensureSpace(doc, yPos, rowHeight + 8);
      const rowColor = i % 2 === 0 ? '#f9fafb' : '#ffffff';
      doc.roundedRect(40, yPos - 2, 510, rowHeight, 5).fill(rowColor).stroke('#eaecf0');
      doc.fillColor('#1f2937').font('Helvetica').fontSize(8.5);
      doc.text(`#${PdfGenerator.text(step.step_id, '-')}`, 46, yPos + 8, { width: 36 });
      doc.text(PdfGenerator.text(step.type), 86, yPos + 8, { width: 88, height: 30, ellipsis: true });
      doc.text(PdfGenerator.measurementSummary(step), 178, yPos + 7, { width: 168, height: 36, ellipsis: true });
      const source = PdfGenerator.text(step.measurement_source || (step.measured !== undefined ? 'SISTEMA' : ''), '-');
      const device = PdfGenerator.text(step.measurement_device, '');
      const ts = step.timestamp ? PdfGenerator.dateText(step.timestamp) : '';
      doc.text([source, device, ts].filter(Boolean).join('\n'), 350, yPos + 7, { width: 104, height: 36, ellipsis: true });
      const eColor = step.result === 'PASS' ? passColor : (step.result === 'DONE' ? '#1570ef' : (String(step.result || '').includes('STOP') ? stopColor : failColor));
      doc.roundedRect(466, yPos + 10, 70, 20, 6).fill(eColor);
      doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(9).text(PdfGenerator.text(step.result), 466, yPos + 16, { width: 70, align: 'center' });
      yPos += rowHeight + 6;
    });

    yPos = PdfGenerator.ensureSpace(doc, yPos, 90);
    doc.roundedRect(40, yPos + 4, 245, 55, 8).stroke('#d0d5dd');
    doc.font('Helvetica-Bold').fontSize(9).fillColor('#667085').text('FIRMA OPERATORE', 54, yPos + 14);
    doc.moveTo(54, yPos + 46).lineTo(270, yPos + 46).stroke('#98a2b3');
    doc.font('Helvetica').fontSize(8).fillColor('#667085').text(PdfGenerator.text(report.operator), 54, yPos + 49, { width: 215 });
    doc.roundedRect(305, yPos + 4, 245, 55, 8).stroke('#d0d5dd');
    doc.font('Helvetica-Bold').fontSize(9).fillColor('#667085').text('APPROVAZIONE QUALITÀ', 319, yPos + 14);
    doc.moveTo(319, yPos + 46).lineTo(535, yPos + 46).stroke('#98a2b3');

    PdfGenerator.drawFooter(doc);
    doc.end();
    console.log(`[PDF] Certificato generato: ${outputPath}`);
    return outputPath;
  }
}
