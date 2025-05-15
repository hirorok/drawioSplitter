#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { DOMParser, XMLSerializer } = require('xmldom');

// コマンドラインから引数を取得
const args = process.argv.slice(2);

// 使用方法を表示する関数
function showUsage() {
  // 実行ファイル名を特定（node実行かexe実行かによって変える）
  const exeName = path.basename(process.argv[0]).toLowerCase() === 'node' || 
                 path.basename(process.argv[0]).toLowerCase() === 'node.exe' ? 
                 `node ${path.basename(process.argv[1])}` : path.basename(process.argv[0]);
  
  console.log(`使用方法: ${exeName} <drawioファイルのパス>`);
  console.log(`例: ${exeName} example.drawio`);
  process.exit(1);
}

// 引数をチェック
if (args.length === 0) {
  console.error('エラー: Drawioファイルが指定されていません');
  showUsage();
}

const inputFilePath = args[0];

// ファイルの存在確認
if (!fs.existsSync(inputFilePath)) {
  console.error(`エラー: ファイル "${inputFilePath}" が見つかりません`);
  process.exit(1);
}

// 入力ファイルを読み込む
try {
  const data = fs.readFileSync(inputFilePath, 'utf8');
  
  // XMLをパース
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(data, 'text/xml');
  
  // draw.ioのすべてのページを取得
  const diagrams = xmlDoc.getElementsByTagName('diagram');
  
  if (diagrams.length === 0) {
    console.error('エラー: ファイル内にdiagramタグが見つかりません');
    process.exit(1);
  }
  
  console.log(`${diagrams.length}ページのdiagramを見つけました。分割を開始します...`);
  
  // 出力ディレクトリを作成（元のファイル名をベースにする）
  const fileNameWithoutExt = path.basename(inputFilePath, '.drawio');
  const outputDir = path.join(path.dirname(inputFilePath), `${fileNameWithoutExt}_pages`);
  
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir);
  }
  
  // 各ページを個別のファイルに分ける
  for (let i = 0; i < diagrams.length; i++) {
    const diagram = diagrams[i];
    const pageId = diagram.getAttribute('id') || `page_${i+1}`;
    const pageName = diagram.getAttribute('name') || `Page_${i+1}`;
    
    // 安全なファイル名を作成
    const safePageName = pageName.replace(/[\\/:*?"<>|]/g, '_');
    
    // 新しいXMLドキュメントを作成
    const newXmlDoc = parser.parseFromString('<?xml version="1.0" encoding="UTF-8"?><mxfile></mxfile>', 'text/xml');
    const rootNode = newXmlDoc.getElementsByTagName('mxfile')[0];
    
    // 元のmxfileの属性をコピー
    const originalMxfile = xmlDoc.getElementsByTagName('mxfile')[0];
    for (let j = 0; j < originalMxfile.attributes.length; j++) {
      const attr = originalMxfile.attributes[j];
      rootNode.setAttribute(attr.name, attr.value);
    }
    
    // ダイアグラムをインポート
    const importedDiagram = newXmlDoc.importNode(diagram, true);
    rootNode.appendChild(importedDiagram);
    
    // XMLをシリアライズ
    const serializer = new XMLSerializer();
    const outputXml = serializer.serializeToString(newXmlDoc);
    
    // ファイルに保存
    const outputFilePath = path.join(outputDir, `${safePageName}.drawio`);
    fs.writeFileSync(outputFilePath, outputXml);
    
    console.log(`ページ ${i+1}/${diagrams.length}: "${pageName}" を保存しました: ${outputFilePath}`);
  }
  
  console.log(`処理が完了しました。分割されたファイルは ${outputDir} に保存されました。`);
  
} catch (error) {
  console.error('エラーが発生しました:', error.message);
  process.exit(1);
}