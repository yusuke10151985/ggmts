// **階層番号ユーティリティ**: 階層的な番号付け（1., 1.1., 1.1.1.）を生成

import { StructureItem } from '@/types/mom';

/**
 * 階層的な番号を生成する
 * @param items - 構造アイテムの配列
 * @param parentNumber - 親の番号（例: "1.2"）
 * @returns 番号付けされたアイテムの配列
 */
export function generateHierarchicalNumbers(
  items: StructureItem[], 
  parentNumber: string = ''
): StructureItem[] {
  return items.map((item, index) => {
    // 現在のレベルの番号を生成
    const currentNumber = parentNumber 
      ? `${parentNumber}.${index + 1}`
      : `${index + 1}`;
    
    // 子要素にも再帰的に番号を付ける
    const numberedChildren = item.children.length > 0
      ? generateHierarchicalNumbers(item.children, currentNumber)
      : [];
    
    return {
      ...item,
      number: currentNumber,
      children: numberedChildren
    };
  });
}

/**
 * 番号付けされた構造をフラットなリストに変換（エクスポート用）
 * @param items - 構造アイテムの配列
 * @param result - 結果を格納する配列
 * @returns フラットなアイテムの配列
 */
export function flattenNumberedStructure(
  items: StructureItem[], 
  result: StructureItem[] = []
): StructureItem[] {
  items.forEach(item => {
    result.push(item);
    if (item.children.length > 0) {
      flattenNumberedStructure(item.children, result);
    }
  });
  return result;
}

/**
 * 既存の番号を階層番号に変換するヘルパー関数
 * @param oldNumber - 既存の番号（例: "1"）
 * @param level - アイテムのレベル
 * @param parentNumber - 親の番号
 * @returns 階層番号（例: "1.1"）
 */
export function convertToHierarchicalNumber(
  oldNumber: string,
  level: number,
  parentNumber?: string
): string {
  if (!parentNumber) {
    return oldNumber;
  }
  
  // 既に階層番号の場合はそのまま返す
  if (oldNumber.includes('.')) {
    return oldNumber;
  }
  
  return `${parentNumber}.${oldNumber}`;
}