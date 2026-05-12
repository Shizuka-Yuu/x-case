// JSON変換スクリプト
// 修正されたMarkdownファイルを標準化されたJSON形式に変換

const fs = require("fs");
const path = require("path");

/**
 * MarkdownファイルからJSONデータを抽出
 */
function extractDataFromMarkdown(filePath) {
  const content = fs.readFileSync(filePath, "utf8");

  // 基本情報の抽出
  const urlMatch = content.match(/\*\*URL\*\*:\s*(.+)/);
  const authorMatch = content.match(/\*\*投稿者\*\*:\s*(.+)/);
  const dateMatch = content.match(/\*\*投稿日時\*\*:\s*(.+)/);
  const contextMatch = content.match(/\*\*時系列事実\*\*:\s*(.+)/);

  // 観測数値の抽出
  const viewsMatch = content.match(/views:\s*([\d,]+)/);
  const repliesMatch = content.match(/replies:\s*([\d,]+)/);
  const repostsMatch = content.match(/reposts:\s*([\d,]+)/);
  const likesMatch = content.match(/likes:\s*([\d,]+)/);
  const bookmarksMatch = content.match(/bookmarks:\s*([\d,]+)/);

  // 投稿者属性の抽出
  const userNameMatch = content.match(/- ユーザー名:\s*(.+)/);
  const followersMatch = content.match(/- フォロワー数:\s*(.+)/);
  const followMatch = content.match(/- フォロー数:\s*(.+)/);
  const postsMatch = content.match(/- 投稿数:\s*(.+)/);
  const joinDateMatch = content.match(/- 参加日:\s*(.+)/);
  const verifiedMatch = content.match(/- 認証状況:\s*(.+)/);
  const profileMatch = content.match(/- プロフィール:\s*(.+)/);
  const categoryMatch = content.match(/- カテゴリ:\s*(.+)/);

  // ポスト形式の抽出
  const contentTypeMatch = content.match(/- コンテンツ種類:\s*(.+)/);
  const textContentMatch = content.match(
    /- テキスト内容:\s*([\s\S]*?)(?=\s*### 画像解析結果|\s*- メディア:|\s*- 投稿に至るまでの時系列事実:|$)/,
  );
  const mediaMatch = content.match(/- メディア:\s*(.+)/);

  // 画像解析結果の抽出
  const imageAnalysisMatch = content.match(
    /### 画像解析結果([\s\S]*?)(?=\s*- 投稿に至るまでの時系列事実:|###|$)/,
  );

  // 分析結果セクションの抽出
  const analysisResultsMatch = content.match(
    /## 分析結果（STEP 3: 分析の実行）([\s\S]*?)(?=\s*---|$)/,
  );

  return {
    target: {
      url: urlMatch ? urlMatch[1].trim() : "",
      author: authorMatch
        ? authorMatch[1]
            .replace(/.*?\(@(.+?)\).*/, "$1")
            .replace(/_\d{4}-\d{2}-\d{2}$/, "")
        : "",
      post_date: dateMatch ? dateMatch[1].trim() : "",
      background_context: contextMatch ? contextMatch[1].trim() : "",
    },
    metrics: {
      views: viewsMatch ? parseInt(viewsMatch[1].replace(/,/g, "")) : 0,
      replies: repliesMatch ? parseInt(repliesMatch[1].replace(/,/g, "")) : 0,
      reposts: repostsMatch ? parseInt(repostsMatch[1].replace(/,/g, "")) : 0,
      likes: likesMatch ? parseInt(likesMatch[1].replace(/,/g, "")) : 0,
      bookmarks: bookmarksMatch
        ? parseInt(bookmarksMatch[1].replace(/,/g, ""))
        : 0,
    },
    content_analysis: {
      author_attributes: {
        name: userNameMatch ? userNameMatch[1].trim() : "",
        followers: followersMatch ? followersMatch[1].trim() : "",
        follow: followMatch ? followMatch[1].trim() : "",
        posts: postsMatch ? postsMatch[1].trim() : "",
        join_date: joinDateMatch ? joinDateMatch[1].trim() : "",
        verification: verifiedMatch ? verifiedMatch[1].trim() : "",
        profile: profileMatch ? profileMatch[1].trim() : "",
        account_type: categoryMatch ? categoryMatch[1].trim() : "",
      },
      content_type: contentTypeMatch ? contentTypeMatch[1].trim() : "",
      text_content: textContentMatch ? textContentMatch[1].trim() : "",
      media: mediaMatch ? mediaMatch[1].trim() : "",
      image_analysis: imageAnalysisMatch ? imageAnalysisMatch[1].trim() : "",
    },
    analysis_results: analysisResultsMatch
      ? analysisResultsMatch[1].trim()
      : "",
  };
}

/**
 * 標準化されたJSONデータを生成
 */
function createStandardizedJson(extractedData, caseId, caseDate) {
  const views = extractedData.metrics.views;
  const likes = extractedData.metrics.likes;
  const replies = extractedData.metrics.replies;
  const bookmarks = extractedData.metrics.bookmarks;

  // 比率の計算
  const controversyRatio = likes > 0 ? ((replies / likes) * 100).toFixed(2) : 0;
  const utilityScore = views > 0 ? ((bookmarks / views) * 100).toFixed(4) : 0;

  // followersを数値に変換
  let followersNum = 0;
  if (extractedData.content_analysis.author_attributes.followers) {
    followersNum = parseInt(
      extractedData.content_analysis.author_attributes.followers
        .toString()
        .replace(/,/g, "")
        .replace(/[^0-9]/g, ""),
    );
  }

  return {
    case_id: caseId,
    case_type: "standard",
    filename: `Case_${caseId}_${extractedData.target.author}_${caseDate}`,
    analysis_date: caseDate,
    analyzer_version: "X-Event-Analyzer v2.0",

    target: extractedData.target,

    metrics: {
      views: extractedData.metrics.views,
      replies: extractedData.metrics.replies,
      reposts: extractedData.metrics.reposts,
      likes: extractedData.metrics.likes,
      bookmarks: extractedData.metrics.bookmarks,
      controversy_ratio: parseFloat(controversyRatio),
      retention_density: 0, // 計算ロジックを追加
      utility_aspiration_score: parseFloat(utilityScore),
      text_length: extractedData.content_analysis.text_content.length,
    },

    content_analysis: {
      content_type: extractedData.content_analysis.content_type,
      text_content: extractedData.content_analysis.text_content,
      media: extractedData.content_analysis.media,
      author_attributes: {
        name: extractedData.content_analysis.author_attributes.name,
        verification:
          extractedData.content_analysis.author_attributes.verification,
        followers: followersNum,
        profile: extractedData.content_analysis.author_attributes.profile,
        account_type:
          extractedData.content_analysis.author_attributes.account_type,
      },
    },

    timeline_facts: {
      inspiration: extractedData.target.background_context,
      mutual_posting: "",
      event_type: "",
    },
  };
}

/**
 * メイン処理
 */
function main() {
  const archiveDirs = ["archive/2026-05-11", "archive/2026-05-12"];

  archiveDirs.forEach((dir) => {
    const files = fs.readdirSync(dir);
    const mdFiles = files.filter((file) => file.endsWith(".md"));

    mdFiles.forEach((file) => {
      const filePath = path.join(dir, file);
      const caseId = file.match(/Case_(\d+)_/)[1];
      const caseDate = dir.split("/")[1]; // 2026-05-11 or 2026-05-12

      console.log(`Processing: ${filePath}`);

      try {
        const extractedData = extractDataFromMarkdown(filePath);
        const jsonData = createStandardizedJson(
          extractedData,
          caseId,
          caseDate,
        );

        const jsonFileName = file.replace(".md", ".json");
        const jsonFilePath = path.join(dir, jsonFileName);

        fs.writeFileSync(
          jsonFilePath,
          JSON.stringify(jsonData, null, 2),
          "utf8",
        );
        console.log(`✓ Converted: ${jsonFilePath}`);
      } catch (error) {
        console.error(`✗ Error processing ${file}:`, error.message);
      }
    });
  });

  console.log("JSON conversion completed!");
}

if (require.main === module) {
  main();
}

module.exports = {
  extractDataFromMarkdown,
  createStandardizedJson,
};
