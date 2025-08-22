// **テキスト選択可能なPDFエクスポート実装**
// 以前の問題: html2canvasを使用していたため、PDFが画像として出力されていた
// 解決策: jsPDFのテキスト描画APIを直接使用して、選択可能なテキストとして出力

import { MOM, StructureItem } from '@/types/mom';
import jsPDF from 'jspdf';
import { getRevisionHexColor, isModifiedInRevision, compareMOMs } from '@/lib/mom/revision-utils';
import { generateHierarchicalNumbers } from '@/lib/mom/numbering-utils';

// 日本語フォント用のカスタムフォント設定
// import './NotoSansJP-Regular-normal'; // 一時的にコメントアウト

interface PDFContext {
  pdf: jsPDF;
  y: number;
  pageHeight: number;
  pageWidth: number;
  leftMargin: number;
  rightMargin: number;
  contentWidth: number;
}

/**
 * ページの改ページが必要かチェックし、必要なら新しいページを追加
 */
function checkPageBreak(ctx: PDFContext, requiredSpace: number): void {
  if (ctx.y + requiredSpace > ctx.pageHeight - 20) {
    ctx.pdf.addPage();
    ctx.y = 20;
  }
}

/**
 * 段落を保持したテキストを描画
 * @param ctx PDFコンテキスト
 * @param text テキスト
 * @param fontSize フォントサイズ
 * @param indent インデント（左マージンからの追加距離）
 * @param paragraphSpacing 段落間のスペース
 */
function drawParagraph(
  ctx: PDFContext, 
  text: string, 
  fontSize: number = 10, 
  indent: number = 0,
  paragraphSpacing: number = 5
): void {
  ctx.pdf.setFontSize(fontSize);
  const lines = ctx.pdf.splitTextToSize(text, ctx.contentWidth - indent);
  
  lines.forEach((line: string) => {
    checkPageBreak(ctx, fontSize * 0.5);
    ctx.pdf.text(line, ctx.leftMargin + indent, ctx.y);
    ctx.y += fontSize * 0.5;
  });
  
  // 段落間のスペースを追加
  ctx.y += paragraphSpacing;
}

/**
 * 太字テキストを描画
 */
function drawBoldText(ctx: PDFContext, text: string, x: number): void {
  const originalFont = ctx.pdf.getFont();
  ctx.pdf.setFont('helvetica', 'bold');
  ctx.pdf.text(text, x, ctx.y);
  ctx.pdf.setFont(originalFont.fontName, originalFont.fontStyle);
}

/**
 * テキスト選択可能なPDFを生成
 */
export async function exportToPDFWithSelectableText(mom: MOM): Promise<Blob> {
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  // 日本語フォントを設定
  try {
    pdf.setFont('NotoSansJP');
  } catch (e) {
    // フォールバック
    pdf.setFont('helvetica');
  }

  const ctx: PDFContext = {
    pdf,
    y: 20,
    pageHeight: 297, // A4 height in mm
    pageWidth: 210, // A4 width in mm
    leftMargin: 20,
    rightMargin: 20,
    contentWidth: 170 // 210 - 20 - 20
  };

  // タイトル
  pdf.setFontSize(18);
  drawParagraph(ctx, `MOM: ${mom.title}`, 18, 0, 3);
  
  // タイトル翻訳
  if (mom.titleTranslations) {
    pdf.setFontSize(10);
    pdf.setTextColor(100);
    drawParagraph(ctx, `EN: ${mom.titleTranslations.en} | JA: ${mom.titleTranslations.ja} | TH: ${mom.titleTranslations.th}`, 10, 0, 8);
    pdf.setTextColor(0);
  }

  // Meeting Goal
  if (mom.goal) {
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    ctx.pdf.text('Meeting Goal:', ctx.leftMargin, ctx.y);
    pdf.setFont('helvetica', 'normal');
    ctx.y += 6;
    drawParagraph(ctx, mom.goal, 11, 5, 3);
    
    if (mom.goalTranslations) {
      pdf.setFontSize(9);
      pdf.setTextColor(100);
      drawParagraph(ctx, `EN: ${mom.goalTranslations.en} | JA: ${mom.goalTranslations.ja} | TH: ${mom.goalTranslations.th}`, 9, 5, 8);
      pdf.setTextColor(0);
    }
  }

  // メタデータ
  pdf.setFontSize(10);
  const metadata = [
    { label: 'MOM ID:', value: mom.momId },
    { label: 'Revision:', value: mom.revision.toString() },
    { label: 'Date:', value: mom.date },
    { label: 'Status:', value: mom.status }
  ];

  metadata.forEach(item => {
    checkPageBreak(ctx, 8);
    pdf.setFont('helvetica', 'bold');
    ctx.pdf.text(item.label, ctx.leftMargin, ctx.y);
    pdf.setFont('helvetica', 'normal');
    ctx.pdf.text(item.value, ctx.leftMargin + 25, ctx.y);
    ctx.y += 6;
  });
  ctx.y += 5;

  // Companies and Attendees
  if (mom.companies.length > 0) {
    checkPageBreak(ctx, 20);
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    ctx.pdf.text('Companies and Attendees:', ctx.leftMargin, ctx.y);
    pdf.setFont('helvetica', 'normal');
    ctx.y += 8;

    pdf.setFontSize(11);
    mom.companies.forEach(company => {
      const companyAttendees = mom.attendees.filter(a => a.companyId === company.id);
      const attendeeNames = companyAttendees.length > 0 
        ? companyAttendees.map(a => a.name).join(' , ')
        : '(No attendees)';
      
      checkPageBreak(ctx, 8);
      drawParagraph(ctx, `${company.name} : ${attendeeNames}`, 11, 5, 3);
    });
    ctx.y += 5;
  }

  // リビジョン比較
  if (mom.revision > 0 && mom.previousRevisionData) {
    const differences = compareMOMs(mom, mom.previousRevisionData);
    const hasChanges = differences.titleChanged || differences.goalChanged || 
      differences.dateChanged || differences.companiesChanged || 
      differences.attendeesChanged || differences.structureChanges.size > 0;

    if (hasChanges) {
      checkPageBreak(ctx, 30);
      pdf.setFontSize(14);
      pdf.setFont('helvetica', 'bold');
      ctx.pdf.text(`Changes in Rev.${mom.revision} (compared to Rev.${mom.revision - 1})`, ctx.leftMargin, ctx.y);
      pdf.setFont('helvetica', 'normal');
      ctx.y += 8;

      pdf.setFontSize(11);
      const changes: string[] = [];
      if (differences.titleChanged) changes.push('Meeting Title');
      if (differences.goalChanged) changes.push('Meeting Goal');
      if (differences.dateChanged) changes.push('Meeting Date');
      if (differences.companiesChanged) changes.push('Companies');
      if (differences.attendeesChanged) changes.push('Attendees');
      if (differences.structureChanges.size > 0) changes.push(`${differences.structureChanges.size} Agenda Items`);

      changes.forEach(change => {
        checkPageBreak(ctx, 8);
        ctx.pdf.text('• ', ctx.leftMargin + 5, ctx.y);
        // 変更されたフィールド名を太字で表示
        drawBoldText(ctx, change, ctx.leftMargin + 10);
        ctx.pdf.text(' changed', ctx.leftMargin + 10 + ctx.pdf.getTextWidth(change) + 2, ctx.y);
        ctx.y += 6;
      });
      ctx.y += 5;
    }
  }

  // Agenda Structure
  if (mom.structure.length > 0) {
    checkPageBreak(ctx, 20);
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    ctx.pdf.text('Agenda:', ctx.leftMargin, ctx.y);
    pdf.setFont('helvetica', 'normal');
    ctx.y += 10;

    const numberedStructure = generateHierarchicalNumbers(mom.structure);
    drawStructureItems(ctx, numberedStructure, 0, mom.revision);
  }

  return pdf.output('blob');
}

/**
 * Structure itemsを再帰的に描画
 */
function drawStructureItems(
  ctx: PDFContext, 
  items: StructureItem[], 
  indentLevel: number,
  currentRevision?: number
): void {
  items.forEach(item => {
    const indent = indentLevel * 10;
    const isModified = currentRevision && isModifiedInRevision(item, currentRevision);
    
    // タイトル
    checkPageBreak(ctx, 20);
    const fontSize = Math.max(14 - item.level, 10);
    ctx.pdf.setFontSize(fontSize);
    
    if (isModified) {
      // 変更されたアイテムは太字
      ctx.pdf.setFont('helvetica', 'bold');
    }
    
    // 番号とタイトルを描画
    const numberText = `${item.number} `;
    const fullText = `${numberText}${item.title}`;
    drawParagraph(ctx, fullText, fontSize, indent, 3);
    
    if (isModified) {
      ctx.pdf.setFont('helvetica', 'normal');
    }

    // 翻訳
    if (item.translations) {
      ctx.pdf.setFontSize(9);
      ctx.pdf.setTextColor(100);
      drawParagraph(ctx, `EN: ${item.translations.en} | JA: ${item.translations.ja} | TH: ${item.translations.th}`, 9, indent + 5, 5);
      ctx.pdf.setTextColor(0);
    }

    // Level 4の詳細情報
    if (item.level === 4) {
      ctx.pdf.setFontSize(10);
      

      if (item.responsibleParties && item.responsibleParties.length > 0) {
        const responsible = `Responsible: ${item.responsibleParties.map(p => p.name).join(', ')}`;
        drawParagraph(ctx, responsible, 10, indent + 10, 3);
      }

      if (item.dueDate) {
        drawParagraph(ctx, `Due Date: ${item.dueDate}`, 10, indent + 10, 3);
      }

      if (item.status) {
        drawParagraph(ctx, `Status: ${item.status.toUpperCase()}`, 10, indent + 10, 3);
      }

      if (item.urls && item.urls.length > 0) {
        drawParagraph(ctx, 'URLs:', 10, indent + 10, 2);
        item.urls.forEach(url => {
          drawParagraph(ctx, `- ${url}`, 10, indent + 15, 2);
        });
      }

      if (item.attachments && item.attachments.length > 0) {
        ctx.pdf.setTextColor(100);
        drawParagraph(ctx, `[${item.attachments.length} attachment(s)]`, 10, indent + 10, 3);
        ctx.pdf.setTextColor(0);
      }
      
      ctx.y += 3;
    }

    // 子要素を処理
    if (item.children && item.children.length > 0) {
      drawStructureItems(ctx, item.children, indentLevel + 1, currentRevision);
    }
  });
}