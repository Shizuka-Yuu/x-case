// データ取得ユーティリティ関数
// 異なるJSON構造から統一的にデータを取得するためのヘルパー関数群

/**
 * 論争比率を取得（複数のJSON構造に対応）
 * @param {Object} data - JSONデータ
 * @returns {number} 論争比率
 */
function getControversyRatio(data) {
  // 新しい形式 (006以降)
  if (data.ratios?.controversy_ratio !== undefined) {
    return data.ratios.controversy_ratio;
  }
  
  // 旧形式 (005まで)
  if (data.metrics?.controversy_ratio !== undefined) {
    return data.metrics.controversy_ratio;
  }
  
  // engagement_analysis形式
  if (data.engagement_analysis?.ratio_analysis?.controversy_ratio?.value !== undefined) {
    return data.engagement_analysis.ratio_analysis.controversy_ratio.value;
  }
  
  return 0;
}

/**
 * プロモーションスコアを取得（複数のJSON構造に対応）
 * @param {Object} data - JSONデータ
 * @returns {number} プロモーションスコア
 */
function getPromotionScore(data) {
  // 直接のpromotion_score
  if (data.promotion_score !== undefined) {
    return data.promotion_score;
  }
  
  // structural_judgment形式
  if (data.structural_judgment?.promotion_score !== undefined) {
    return data.structural_judgment.promotion_score;
  }
  
  if (data.structural_judgment?.score !== undefined) {
    return data.structural_judgment.score;
  }
  
  // self_promotion_analysis形式
  if (data.self_promotion_analysis?.promotion_score !== undefined) {
    return data.self_promotion_analysis.promotion_score;
  }
  
  return 0;
}

/**
 * エンゲージメント指標を取得（複数のJSON構造に対応）
 * @param {Object} data - JSONデータ
 * @returns {Object} エンゲージメント指標
 */
function getEngagementMetrics(data) {
  // metrics形式（005まで）
  if (data.metrics) {
    return data.metrics;
  }
  
  // engagement形式（006以降）
  if (data.engagement) {
    return data.engagement;
  }
  
  // デフォルト値
  return {
    views: 0,
    replies: 0,
    reposts: 0,
    likes: 0,
    bookmarks: 0
  };
}

/**
 * 著者情報を取得（複数のJSON構造に対応）
 * @param {Object} data - JSONデータ
 * @returns {Object} 著者情報
 */
function getAuthorInfo(data) {
  // content_analysis.author_attributes形式
  if (data.content_analysis?.author_attributes) {
    return data.content_analysis.author_attributes;
  }
  
  // target.author_attributes形式
  if (data.target?.author_attributes) {
    return data.target.author_attributes;
  }
  
  // target形式
  if (data.target) {
    return {
      name: data.target.author,
      handle: data.target.author_handle,
      verification: data.target.verified ? "認証済みアカウント" : "未認証",
      followers: data.target.author_attributes?.followers || 0,
      profile: data.target.author_attributes?.profile || "",
      account_type: data.target.author_attributes?.account_type || "不明"
    };
  }
  
  return {
    name: "N/A",
    handle: "N/A",
    verification: "不明",
    followers: 0,
    profile: "",
    account_type: "不明"
  };
}

/**
 * 構造的判定の結論を取得（複数のJSON構造に対応）
 * @param {Object} data - JSONデータ
 * @returns {string} 結論テキスト
 */
function getJudgmentConclusion(data) {
  return data.structural_judgment?.conclusion ||
         data.summary?.post_characterization ||
         data.analysis?.post_characterization ||
         "";
}

// グローバル関数としてエクスポート
window.getControversyRatio = getControversyRatio;
window.getPromotionScore = getPromotionScore;
window.getEngagementMetrics = getEngagementMetrics;
window.getAuthorInfo = getAuthorInfo;
window.getJudgmentConclusion = getJudgmentConclusion;
