// **完全なUnicode対応PDFエクスポート - 最終版**
// 日本語・タイ語フォントを確実に埋め込み、すべてのテキストを選択可能にする

import { MOM, StructureItem } from '@/types/mom';
import { PDFDocument, PDFPage, rgb, PDFFont, StandardFonts } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import { getRevisionHexColor, isModifiedInRevision, compareMOMs } from '@/lib/mom/revision-utils';
import { generateHierarchicalNumbers } from '@/lib/mom/numbering-utils';
// Fonts will be loaded dynamically

interface PDFContext {
  doc: PDFDocument;
  page: PDFPage;
  fonts: {
    regular: PDFFont;
    bold: PDFFont;
    japanese: PDFFont;
    thai: PDFFont;
  };
  y: number;
  pageHeight: number;
  pageWidth: number;
  leftMargin: number;
  rightMargin: number;
  contentWidth: number;
  lineHeight: number;
}



/**
 * ローカルフォントの読み込み（Publicフォルダから）
 */
async function loadLocalFont(fontPath: string): Promise<ArrayBuffer> {
  try {
    const response = await fetch(fontPath);
    if (!response.ok) {
      throw new Error(`Failed to load font: ${response.statusText}`);
    }
    return await response.arrayBuffer();
  } catch (error) {
    console.error(`Error loading local font ${fontPath}:`, error);
    throw error;
  }
}

/**
 * テキストに応じて適切なフォントを選択
 */
function selectFontForText(text: string, ctx: PDFContext, bold: boolean = false): PDFFont {
  // 日本語文字の検出
  if (/[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/.test(text)) {
    return ctx.fonts.japanese;
  }
  // タイ語文字の検出
  else if (/[\u0E00-\u0E7F]/.test(text)) {
    return ctx.fonts.thai;
  }
  // デフォルト
  return bold ? ctx.fonts.bold : ctx.fonts.regular;
}

/**
 * ページブレークのチェック
 */
function checkPageBreak(ctx: PDFContext, requiredSpace: number): void {
  if (ctx.y - requiredSpace < 50) {
    ctx.page = ctx.doc.addPage();
    ctx.y = ctx.pageHeight - 50;
  }
}

/**
 * テキストの描画（自動改行付き）
 */
function drawText(
  ctx: PDFContext,
  text: string,
  options?: {
    fontSize?: number;
    bold?: boolean;
    color?: { r: number; g: number; b: number };
    indent?: number;
    lineSpacing?: number;
  }
): void {
  const fontSize = options?.fontSize || 10;
  const indent = options?.indent || 0;
  const lineSpacing = options?.lineSpacing || 1.2;
  const color = options?.color || { r: 0, g: 0, b: 0 };
  
  // 適切なフォントを選択
  const font = selectFontForText(text, ctx, options?.bold);
  
  // テキストを単語単位で分割（日本語は文字単位）
  const words = text.match(/[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF\u0E00-\u0E7F]+|[^\s\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF\u0E00-\u0E7F]+/g) || [];
  const lines: string[] = [];
  let currentLine = '';
  
  for (const word of words) {
    const testLine = currentLine ? `${currentLine}${word}` : word;
    const width = font.widthOfTextAtSize(testLine, fontSize);
    
    if (width > ctx.contentWidth - indent && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  }
  
  if (currentLine) {
    lines.push(currentLine);
  }
  
  // 各行を描画
  const lineHeight = fontSize * lineSpacing;
  
  lines.forEach(line => {
    checkPageBreak(ctx, lineHeight);
    
    // 行内の文字を言語別に分割して描画
    const segments = line.match(/[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]+|[\u0E00-\u0E7F]+|[^\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF\u0E00-\u0E7F]+/g) || [];
    let xOffset = 0;
    
    segments.forEach(segment => {
      const segmentFont = selectFontForText(segment, ctx, options?.bold);
      ctx.page.drawText(segment, {
        x: ctx.leftMargin + indent + xOffset,
        y: ctx.y,
        size: fontSize,
        font: segmentFont,
        color: rgb(color.r, color.g, color.b)
      });
      xOffset += segmentFont.widthOfTextAtSize(segment, fontSize);
    });
    
    ctx.y -= lineHeight;
  });
}

/**
 * 段落の描画
 */
function drawParagraph(
  ctx: PDFContext,
  text: string,
  options?: {
    fontSize?: number;
    bold?: boolean;
    color?: { r: number; g: number; b: number };
    indent?: number;
    paragraphSpacing?: number;
  }
): void {
  drawText(ctx, text, options);
  ctx.y -= options?.paragraphSpacing || 5;
}

/**
 * PDFファイル名の生成
 */
export function generatePDFFilename(mom: MOM): string {
  const momId = mom.momId.replace(/^MOM-/, '');
  const revision = `Rev.${mom.revision}`;
  
  const enTitle = mom.titleTranslations?.en || 'Meeting';
  const jpTitle = mom.titleTranslations?.ja || '会議';
  const thTitle = mom.titleTranslations?.th || 'การประชุม';
  
  const cleanTitle = (title: string) => {
    return title.replace(/[^\w\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF\u0E00-\u0E7F]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '')
      .substring(0, 30);
  };
  
  return `${momId}_${revision}_${cleanTitle(enTitle)}_${cleanTitle(jpTitle)}_${cleanTitle(thTitle)}.pdf`;
}

/**
 * 構造アイテムの描画
 */
function drawStructureItems(
  ctx: PDFContext,
  items: StructureItem[],
  indentLevel: number,
  currentRevision?: number
): void {
  items.forEach(item => {
    const indent = indentLevel * 15;
    const isModified = currentRevision && isModifiedInRevision(item, currentRevision);
    const fontSize = Math.max(14 - item.level, 10);
    
    // タイトルと番号
    drawParagraph(ctx, `${item.number} ${item.title}`, {
      fontSize,
      bold: isModified || item.level <= 2,
      indent,
      paragraphSpacing: 3
    });
    
    // 翻訳
    if (item.translations) {
      drawText(ctx, `EN: ${item.translations.en}`, {
        fontSize: 9,
        color: { r: 0.4, g: 0.4, b: 0.4 },
        indent: indent + 10
      });
      drawText(ctx, `JA: ${item.translations.ja}`, {
        fontSize: 9,
        color: { r: 0.4, g: 0.4, b: 0.4 },
        indent: indent + 10
      });
      drawText(ctx, `TH: ${item.translations.th}`, {
        fontSize: 9,
        color: { r: 0.4, g: 0.4, b: 0.4 },
        indent: indent + 10
      });
      ctx.y -= 5;
    }
    
    // レベル4の項目
    if (item.level === 4) {
      const detailIndent = indent + 15;
      
      if (item.responsibleParties && item.responsibleParties.length > 0) {
        drawParagraph(ctx, `Responsible: ${item.responsibleParties.map(p => p.name).join(', ')}`, {
          fontSize: 10,
          indent: detailIndent,
          paragraphSpacing: 3
        });
      }
      
      if (item.dueDate) {
        drawParagraph(ctx, `Due Date: ${item.dueDate}`, {
          fontSize: 10,
          indent: detailIndent,
          paragraphSpacing: 3
        });
      }
      
      if (item.status) {
        drawParagraph(ctx, `Status: ${item.status.toUpperCase()}`, {
          fontSize: 10,
          indent: detailIndent,
          bold: true,
          paragraphSpacing: 3
        });
      }
      
      if (item.urls && item.urls.length > 0) {
        drawText(ctx, 'URLs:', {
          fontSize: 10,
          indent: detailIndent
        });
        item.urls.forEach(url => {
          // URLは2pt小さいフォントサイズで表示
          drawText(ctx, `- ${url}`, {
            fontSize: 8,  // メインコンテンツより2pt小さい
            indent: detailIndent + 10,
            color: { r: 0, g: 0.4, b: 0.8 }
          });
        });
        ctx.y -= 5;
      }
      
      if (item.attachments && item.attachments.length > 0) {
        drawParagraph(ctx, `[${item.attachments.length} attachment(s)]`, {
          fontSize: 10,
          indent: detailIndent,
          color: { r: 0.4, g: 0.4, b: 0.4 },
          paragraphSpacing: 8
        });
      }
    }
    
    // 子要素の処理
    if (item.children && item.children.length > 0) {
      drawStructureItems(ctx, item.children, indentLevel + 1, currentRevision);
    }
  });
}

/**
 * メインのエクスポート関数
 */
export async function exportToPDFUnicodeFinal(mom: MOM): Promise<Blob> {
  // PDFドキュメントの作成
  const pdfDoc = await PDFDocument.create();
  
  // fontkitの登録
  pdfDoc.registerFontkit(fontkit);
  
  // フォントの読み込み
  console.log('Loading Unicode fonts...');
  let fonts: PDFContext['fonts'];
  
  try {
    // ローカルフォントを読み込む
    const [regularBytes, japaneseBytes, thaiBytes] = await Promise.all([
      loadLocalFont('/fonts/NotoSans-Regular.ttf'),
      loadLocalFont('/fonts/NotoSansJP-Regular.ttf'),
      loadLocalFont('/fonts/NotoSansThai-Regular.ttf')
    ]);
    
    // フォントの埋め込み
    const regularFont = await pdfDoc.embedFont(regularBytes);
    const japaneseFont = await pdfDoc.embedFont(japaneseBytes);
    const thaiFont = await pdfDoc.embedFont(thaiBytes);
    
    fonts = {
      regular: regularFont,
      bold: regularFont, // Boldは通常フォントで代用
      japanese: japaneseFont,
      thai: thaiFont
    };
    
    console.log('Successfully loaded all Unicode fonts');
  } catch (error) {
    console.warn('Failed to load Unicode fonts, falling back to simple export:', error);
    
    // エラーが発生した場合は、シンプルなPDFエクスポートにフォールバック
    const { exportToPDFSimple } = await import('./export-pdf-simple');
    return await exportToPDFSimple(mom);
  }
  
  // ドキュメントメタデータの設定
  pdfDoc.setTitle(`${mom.momId}_Rev.${mom.revision}`);
  pdfDoc.setSubject(mom.title);
  pdfDoc.setAuthor('MOM Manager');
  pdfDoc.setProducer('MOM Manager - Unicode Final Edition');
  pdfDoc.setCreator('MOM Manager with Full Unicode Support');
  pdfDoc.setCreationDate(new Date());
  
  // 最初のページを作成
  const firstPage = pdfDoc.addPage();
  const { width, height } = firstPage.getSize();
  
  // コンテキストの初期化
  const ctx: PDFContext = {
    doc: pdfDoc,
    page: firstPage,
    fonts,
    y: height - 50,
    pageHeight: height,
    pageWidth: width,
    leftMargin: 50,
    rightMargin: 50,
    contentWidth: width - 100,
    lineHeight: 12
  };
  
  // タイトル
  drawParagraph(ctx, `MOM: ${mom.title}`, {
    fontSize: 18,
    bold: true,
    paragraphSpacing: 8
  });
  
  // タイトル翻訳
  if (mom.titleTranslations) {
    drawText(ctx, `EN: ${mom.titleTranslations.en}`, {
      fontSize: 10,
      color: { r: 0.4, g: 0.4, b: 0.4 }
    });
    drawText(ctx, `JA: ${mom.titleTranslations.ja}`, {
      fontSize: 10,
      color: { r: 0.4, g: 0.4, b: 0.4 }
    });
    drawText(ctx, `TH: ${mom.titleTranslations.th}`, {
      fontSize: 10,
      color: { r: 0.4, g: 0.4, b: 0.4 }
    });
    ctx.y -= 15;
  }
  
  // Meeting Goal
  if (mom.goal) {
    drawParagraph(ctx, 'Meeting Goal:', {
      fontSize: 12,
      bold: true,
      paragraphSpacing: 3
    });
    drawParagraph(ctx, mom.goal, {
      fontSize: 11,
      indent: 10,
      paragraphSpacing: 5
    });
    
    if (mom.goalTranslations) {
      drawText(ctx, `EN: ${mom.goalTranslations.en}`, {
        fontSize: 9,
        color: { r: 0.4, g: 0.4, b: 0.4 },
        indent: 10
      });
      drawText(ctx, `JA: ${mom.goalTranslations.ja}`, {
        fontSize: 9,
        color: { r: 0.4, g: 0.4, b: 0.4 },
        indent: 10
      });
      drawText(ctx, `TH: ${mom.goalTranslations.th}`, {
        fontSize: 9,
        color: { r: 0.4, g: 0.4, b: 0.4 },
        indent: 10
      });
      ctx.y -= 15;
    }
  }
  
  // メタデータ
  const metadata = [
    { label: 'MOM ID: ', value: mom.momId },
    { label: 'Revision: ', value: mom.revision.toString() },
    { label: 'Date: ', value: mom.date },
    { label: 'Status: ', value: mom.status }
  ];
  
  metadata.forEach(item => {
    checkPageBreak(ctx, 15);
    
    const fontSize = 10;
    const labelWidth = ctx.fonts.bold.widthOfTextAtSize(item.label, fontSize);
    
    ctx.page.drawText(item.label, {
      x: ctx.leftMargin,
      y: ctx.y,
      size: fontSize,
      font: ctx.fonts.bold,
      color: rgb(0, 0, 0)
    });
    
    ctx.page.drawText(item.value, {
      x: ctx.leftMargin + labelWidth,
      y: ctx.y,
      size: fontSize,
      font: ctx.fonts.regular,
      color: rgb(0, 0, 0)
    });
    
    ctx.y -= 15;
  });
  ctx.y -= 10;
  
  // 企業と参加者
  if (mom.companies.length > 0) {
    drawParagraph(ctx, 'Companies and Attendees:', {
      fontSize: 14,
      bold: true,
      paragraphSpacing: 8
    });
    
    mom.companies.forEach(company => {
      const companyAttendees = mom.attendees.filter(a => a.companyId === company.id);
      const attendeeNames = companyAttendees.length > 0
        ? companyAttendees.map(a => a.name).join(' , ')
        : '(No attendees)';
      
      drawParagraph(ctx, `${company.name} : ${attendeeNames}`, {
        fontSize: 11,
        indent: 10,
        paragraphSpacing: 5
      });
    });
    ctx.y -= 10;
  }
  
  // リビジョン比較
  if (mom.revision > 0 && mom.previousRevisionData) {
    const differences = compareMOMs(mom, mom.previousRevisionData);
    const hasChanges = differences.titleChanged || differences.goalChanged ||
      differences.dateChanged || differences.companiesChanged ||
      differences.attendeesChanged || differences.structureChanges.size > 0 ||
      differences.mainTimeSlotChanged || differences.otherTimeSlotsChanged;
    
    if (hasChanges) {
      drawParagraph(ctx, `Changes in Rev.${mom.revision} (compared to Rev.${mom.revision - 1})`, {
        fontSize: 14,
        bold: true,
        paragraphSpacing: 8
      });
      
      const changes: string[] = [];
      if (differences.titleChanged) changes.push('Meeting Title changed');
      if (differences.goalChanged) changes.push('Meeting Goal changed');
      if (differences.dateChanged) changes.push('Meeting Date changed');
      if (differences.companiesChanged) changes.push('Companies modified');
      if (differences.attendeesChanged) changes.push('Attendees modified');
      if (differences.mainTimeSlotChanged) changes.push('Main Time Slot changed');
      if (differences.otherTimeSlotsChanged) changes.push('Other Country Times changed');
      if (differences.structureChanges.size > 0) {
        changes.push(`${differences.structureChanges.size} Agenda Items modified`);
      }
      
      changes.forEach(change => {
        drawParagraph(ctx, `• ${change}`, {
          fontSize: 11,
          indent: 10,
          bold: true,
          paragraphSpacing: 5
        });
      });
      ctx.y -= 10;
    }
  }
  
  // アジェンダ
  if (mom.structure.length > 0) {
    drawParagraph(ctx, 'Agenda:', {
      fontSize: 14,
      bold: true,
      paragraphSpacing: 8
    });
    
    const numberedStructure = generateHierarchicalNumbers(mom.structure);
    drawStructureItems(ctx, numberedStructure, 0, mom.revision);
  }
  
  // 添付画像の処理
  const numberedStructure = generateHierarchicalNumbers(mom.structure);
  
  const processItems = async (items: StructureItem[]): Promise<void> => {
    for (const item of items) {
      if (item.attachments && item.attachments.length > 0) {
        for (const attachment of item.attachments) {
          if (attachment.type === 'image' && attachment.data) {
            try {
              ctx.page = ctx.doc.addPage();
              ctx.y = ctx.pageHeight - 50;
              
              drawParagraph(ctx, `Attachment for: ${item.number}. ${item.title}`, {
                fontSize: 12,
                bold: true,
                paragraphSpacing: 15
              });
              
              const imageData = attachment.annotations || attachment.data;
              const image = await ctx.doc.embedJpg(imageData);
              const { width: imgWidth, height: imgHeight } = image.size();
              
              // 画像のスケーリング
              const maxWidth = 500;
              const maxHeight = 600;
              let scale = Math.min(maxWidth / imgWidth, maxHeight / imgHeight, 1);
              
              const scaledWidth = imgWidth * scale;
              const scaledHeight = imgHeight * scale;
              
              ctx.page.drawImage(image, {
                x: ctx.leftMargin,
                y: ctx.y - scaledHeight,
                width: scaledWidth,
                height: scaledHeight
              });
            } catch (error) {
              console.error('Error adding attachment image:', error);
            }
          }
        }
      }
      
      if (item.children && item.children.length > 0) {
        await processItems(item.children);
      }
    }
  };
  
  await processItems(numberedStructure);
  
  // PDFの保存
  console.log('Generating PDF with Unicode fonts...');
  const pdfBytes = await pdfDoc.save();
  
  console.log('PDF generated successfully with full Unicode support');
  
  return new Blob([pdfBytes as unknown as ArrayBuffer], { type: 'application/pdf' });
}