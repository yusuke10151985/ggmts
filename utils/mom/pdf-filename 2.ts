// **PDF/MDファイル名生成ユーティリティ**
// 形式: {MOM ID}_{Rev.No.}_{EN Title}_{JP Title}_{TH Title}

import { MOM } from '@/types/mom';

/**
 * PDFファイル名を生成
 * @param mom MOMデータ
 * @returns フォーマットされたファイル名
 */
export function generatePDFFilename(mom: MOM): string {
  // MOM-プレフィックスを削除
  const momId = mom.momId.replace(/^MOM-/, '');
  const revision = `Rev.${mom.revision}`;
  
  // 翻訳タイトルのみを使用（原語タイトルは含めない）
  const enTitle = mom.titleTranslations?.en || 'Meeting';
  const jpTitle = mom.titleTranslations?.ja || '会議';
  const thTitle = mom.titleTranslations?.th || 'การประชุม';
  
  // ファイル名用にタイトルをクリーンアップ
  const cleanTitle = (title: string) => {
    return title
      .replace(/[^a-zA-Z0-9\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF\u0E00-\u0E7F\s]/g, '_')
      .replace(/\s+/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '')
      .substring(0, 30); // 長さ制限
  };
  
  return `${momId}_${revision}_${cleanTitle(enTitle)}_${cleanTitle(jpTitle)}_${cleanTitle(thTitle)}.pdf`;
}

/**
 * Markdownファイル名を生成
 * @param mom MOMデータ
 * @returns フォーマットされたファイル名
 */
export function generateMarkdownFilename(mom: MOM): string {
  // PDFと同じ形式、拡張子のみ変更
  return generatePDFFilename(mom).replace(/\.pdf$/, '.md');
}