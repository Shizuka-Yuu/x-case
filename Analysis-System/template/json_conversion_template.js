// JSON変換用テンプレート
// 既存のCaseの構造を統一するための標準化関数

/**
 * 生データを標準化されたJSON形式に変換
 * @param {Object} rawData - 生の分析データ
 * @param {string} caseId - ケースID
 * @param {string} caseDate - 分析日時
 * @param {string} authorName - 投稿者名
 * @param {string} authorHandle - 投稿者ハンドル
 * @returns {Object} 標準化されたJSONデータ
 */
function standardizeJsonData(rawData, caseId, caseDate, authorName, authorHandle) {
  console.log('=== JSON標準化開始 ===');
  console.log('入力データ:', rawData);
  
  // 基本情報の標準化
  const standardizedData = {
    case_id: caseId,
    case_type: "standard",
    filename: `Case_${caseId}_${authorHandle}_${caseDate}`,
    analysis_date: caseDate,
    analyzer_version: "X-Event-Analyzer v2.0",
    
    // 分析信頼度
    analysis_confidence: {
      total_score: rawData.analysis_confidence?.total_score || 0,
      details: {
        base_data: rawData.analysis_confidence?.details?.base_data || false,
        media_analysis: rawData.analysis_confidence?.details?.media_analysis || false,
        reply_analysis: rawData.analysis_confidence?.details?.reply_analysis || false,
        context_reference: rawData.analysis_confidence?.details?.context_reference || false
      }
    },
    
    // ターゲット情報の標準化
    target: {
      url: rawData.target?.url || "",
      author: authorName,
      author_handle: authorHandle,
      post_date: rawData.target?.post_date || "",
      verified: rawData.target?.verified || false,
      background_context: rawData.target?.background_context || ""
    },
    
    // メトリクスの標準化
    metrics: {
      views: rawData.metrics?.views || 0,
      replies: rawData.metrics?.replies || 0,
      reposts: rawData.metrics?.reposts || 0,
      likes: rawData.metrics?.likes || 0,
      bookmarks: rawData.metrics?.bookmarks || 0,
      controversy_ratio: rawData.metrics?.controversy_ratio || 0,
      retention_density: rawData.metrics?.retention_density || 0,
      utility_aspiration_score: rawData.metrics?.utility_aspiration_score || 0,
      text_length: rawData.metrics?.text_length || 0
    },
    
    // コンテンツ分析の標準化
    content_analysis: {
      content_type: rawData.content_analysis?.content_type || "不明",
      text_content: rawData.content_analysis?.text_content || "",
      media: rawData.content_analysis?.media || "不明",
      author_attributes: {
        name: authorName,
        verification: rawData.content_analysis?.author_attributes?.verification ? "認証済みアカウント" : "未認証",
        followers: rawData.content_analysis?.author_attributes?.followers || 0,
        profile: rawData.content_analysis?.author_attributes?.profile || "",
        account_type: rawData.content_analysis?.author_attributes?.account_type || "不明"
      }
    },
    
    // タイムライン事実の標準化
    timeline_facts: {
      inspiration: rawData.timeline_facts?.inspiration || "",
      mutual_posting: rawData.timeline_facts?.mutual_posting || "",
      event_type: rawData.timeline_facts?.event_type || ""
    },
    
    // 構造分析の標準化
    structure_analysis: {
      logical_structure: rawData.structure_analysis?.logical_structure || {},
      intended_behavior: rawData.structure_analysis?.intended_behavior || {}
    },
    
    // エンゲージメント分析の標準化
    engagement_analysis: {
      ratio_analysis: rawData.engagement_analysis?.ratio_analysis || {},
      retention_density: rawData.engagement_analysis?.retention_density || {}
    },
    
    // アルゴリズム戦略の標準化
    algorithm_strategy: {
      dwell_time_factors: rawData.algorithm_strategy?.dwell_time_factors || {},
      interaction_induction: rawData.algorithm_strategy?.interaction_induction || {},
      celebrity_factor: rawData.algorithm_strategy?.celebrity_factor || {}
    },
    
    // 著者分析の標準化
    author_analysis: {
      name: authorName,
      handle: authorHandle,
      followers: rawData.author_analysis?.followers || 0,
      verified: rawData.author_analysis?.verified || false,
      profile: rawData.author_analysis?.profile || "",
      account_reliability: rawData.author_analysis?.account_reliability || ""
    },
    
    // タイムライン背景の標準化
    timeline_background: {
      post_datetime: rawData.timeline_background?.post_datetime || "",
      mutual_interaction: rawData.timeline_background?.mutual_interaction || "",
      event_rarity: rawData.timeline_background?.event_rarity || ""
    }
  };
  
  // 構造的判定とプロモーション分析の標準化
  if (rawData.structural_judgment) {
    // 新しい形式（structural_judgment）
    standardizedData.structural_judgment = {
      score: rawData.structural_judgment.score || 0,
      reasoning: rawData.structural_judgment.reasoning || []
    };
  } else if (rawData.self_promotion_analysis) {
    // 旧い形式から新しい形式に変換
    standardizedData.structural_judgment = {
      score: rawData.self_promotion_analysis.promotion_score || 0,
      reasoning: rawData.self_promotion_analysis.reasoning || []
    };
  }
  
  // プロモーションスコアの標準化
  if (rawData.promotion_score) {
    standardizedData.promotion_score = rawData.promotion_score;
  } else if (rawData.reasoning && rawData.reasoning.promotion_elements) {
    standardizedData.promotion_score = rawData.reasoning.promotion_elements.percentage;
  } else {
    standardizedData.promotion_score = 0;
  }
  
  // 自己プロモーション分析の標準化
  if (rawData.self_promotion_analysis) {
    standardizedData.self_promotion_analysis = {
      promotion_score: rawData.self_promotion_analysis.promotion_score || 0,
      reasoning: rawData.self_promotion_analysis.reasoning || []
    };
  }
  
  // 推論の標準化
  if (rawData.reasoning) {
    standardizedData.reasoning = rawData.reasoning;
  }
  
  // まとめの標準化
  if (rawData.summary) {
    standardizedData.summary = rawData.summary;
  }
  
  // メタデータの標準化
  if (rawData.metadata) {
    standardizedData.metadata = {
      case_title: rawData.metadata.case_title || `Case #${caseId}`,
      analysis_completion_date: rawData.metadata.analysis_completion_date || caseDate,
      analysis_method: rawData.metadata.analysis_method || "X-Event-Analyzer v2.0",
      content_facts: rawData.metadata.content_facts || ""
    };
  }
  
  console.log('=== 標準化完了 ===');
  console.log('出力データ:', standardizedData);
  
  return standardizedData;
}

// Node.js環境でのエクスポート用
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    standardizeJsonData
  };
}
