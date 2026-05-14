// URLパラメータからケース情報を取得
function getCaseFromURL() {
  const urlParams = new URLSearchParams(window.location.search);
  const casePath = urlParams.get("case");
  const caseId = urlParams.get("id");

  if (casePath && caseId) {
    loadCase(casePath, caseId);
  } else {
    showError();
  }
}

// ケースデータを読み込み
async function loadCase(casePath, caseId) {
  try {
    console.log("ケース読み込み開始:", casePath);
    const jsonPath = casePath.replace(".md", ".json");

    // JSONとMarkdownのフェッチを同時に開始
    const jsonPromise = fetch(jsonPath).then(res => res.ok ? res.json() : null);
    const mdPromise = fetch(casePath).then(res => {
      if (!res.ok) throw new Error("Markdownファイルが見つかりません");
      return res.text();
    });

    // JSONが完了したら即座にメトリクスを表示（Markdownを待たない）
    jsonPromise.then(jsonData => {
      if (jsonData) {
        updatePageInfo(casePath, caseId, jsonData);
        console.log("メトリクスを早期表示しました");
      }
    });

    // Markdownが完了したら本文を表示
    const markdownContent = await mdPromise;
    displayMarkdown(markdownContent);
    
    // まだ更新されていなければ念のため実行
    const jsonData = await jsonPromise;
    if (jsonData) {
      document.title = `${casePath.split("/").pop().replace(".md", "")} - X-case`;
    }

  } catch (error) {
    console.error("ケース読み込みエラー:", error);
    showError();
  }
}

// ページ情報を更新
function updatePageInfo(casePath, caseId, jsonData) {
  const filename = casePath.split("/").pop();
  const title = filename.replace(".md", "");

  document.getElementById("caseTitle").textContent = title;
  document.getElementById("caseSubtitle").textContent = jsonData
    ? `分析日: ${jsonData.analysis_date || "不明"}`
    : "";

  if (jsonData) {
    // 概要セクションを表示
    const caseOverview = document.getElementById("caseOverview");
    if (caseOverview) caseOverview.style.display = "block";

    // メトリクスとサムネイルの更新を1回に集約
    updateThumbnailData(jsonData, title);
    
    // チャート表示（非同期でOK）
    displayChartsSection(jsonData);
  }
}

// 概要セクションを更新
function updateOverviewSection(jsonData, title) {
  // サムネイルデータを更新
  updateThumbnailData(jsonData, title);

  // 概要セクションを表示
  document.getElementById("caseOverview").style.display = "block";
}

// サムネイルデータを更新
function updateThumbnailData(jsonData, title) {
  console.log("サムネイルデータ更新開始:", jsonData);

  // 重要なデータを取得
  const controversyRatio = getControversyRatio(jsonData);
  const promotionScore = getPromotionScore(jsonData);
  const engagement = getEngagementMetrics(jsonData);

  console.log(
    "データ取得 - 論争比率:",
    controversyRatio,
    "プロモーションスコア:",
    promotionScore,
  );

  // タイトルとケースIDを更新
  const titleElement = document.getElementById("thumbnailTitle");
  if (titleElement) titleElement.textContent = title;

  const caseIdElement = document.getElementById("thumbnailCaseId");
  if (caseIdElement) {
    // case_idから"Case_"プレフィックスを除去して重複を防ぐ
    const cleanCaseId = jsonData.case_id
      ? jsonData.case_id.replace(/^Case_/, "")
      : "000";
    caseIdElement.textContent = `Case #${cleanCaseId}`;
  }

  // メトリクスデータを更新
  if (
    engagement &&
    (engagement.views || engagement.likes || engagement.reposts)
  ) {
    console.log("エンゲージメントデータ:", engagement);

    const viewsElement = document.getElementById("thumbViewsStat");
    if (viewsElement)
      viewsElement.textContent = formatNumber(engagement.views || 0);

    const likesElement = document.getElementById("thumbLikesStat");
    if (likesElement)
      likesElement.textContent = formatNumber(engagement.likes || 0);

    const repostsElement = document.getElementById("thumbRepostsStat");
    if (repostsElement)
      repostsElement.textContent = formatNumber(engagement.reposts || 0);

    const repliesElement = document.getElementById("thumbRepliesStat");
    if (repliesElement)
      repliesElement.textContent = formatNumber(engagement.replies || 0);

    const bookmarksElement = document.getElementById("thumbBookmarksStat");
    if (bookmarksElement)
      bookmarksElement.textContent = formatNumber(engagement.bookmarks || 0);
  }

  // 論争比率を更新
  const controversyElement = document.getElementById("thumbControversyStat");
  if (controversyElement) {
    const currentValue = (controversyRatio * 100).toFixed(1) + "%";
    controversyElement.textContent = currentValue;
    console.log("論争比率を更新:", currentValue);
  }

  // プロモーションスコアを更新
  const promotionElement = document.getElementById("promotionText");
  if (promotionElement) {
    promotionElement.textContent = promotionScore + "%";
    console.log("プロモーションスコアを更新:", promotionScore + "%");
  }

  // バーを更新（アニメーションを考慮）
  const barElement = document.getElementById("structuralJudgmentBar");
  if (barElement) {
    // トランジションを設定してから幅を更新
    barElement.style.transition = "width 1.2s cubic-bezier(0.4, 0, 0.2, 1)";
    barElement.style.width = promotionScore + "%";
    console.log("バー幅を更新:", promotionScore + "%");
  }

  // 構造的判定関連の関数を呼び出す（エラーを無視）
  try {
    updatePromotionScore(promotionScore);
    updateStructuralJudgmentScore(jsonData);
  } catch (error) {
    console.warn("構造的判定更新でエラーが発生しましたが、続行します:", error);
  }

  console.log("updateThumbnailData完了");
}

// 構造的判定バーを更新
function updateJudgmentBars(judgment) {
  updateStructuralJudgmentScore(judgment);
  updatePromotionScore(judgment);
}

// プロモーションスコアに応じて背景画像を更新
function updateBackgroundByPromotionScore(promotionScore) {
  const thumbnail = document.querySelector(".overview-thumbnail");
  if (!thumbnail) return;

  let backgroundImage = "";
  const config = window.CONFIG || {};

  if (promotionScore >= 0 && promotionScore <= 19) {
    backgroundImage = `url(${config.backgroundImages?.basePath || "img"}/${config.backgroundImages?.images.low || "low.webp"})`;
  } else if (promotionScore >= 20 && promotionScore <= 39) {
    backgroundImage = `url(${config.backgroundImages?.basePath || "img"}/${config.backgroundImages?.images.normal || "normal.webp"})`;
  } else if (promotionScore >= 40 && promotionScore <= 69) {
    backgroundImage = `url(${config.backgroundImages?.basePath || "img"}/${config.backgroundImages?.images.mid || "mid.webp"})`;
  } else if (promotionScore >= 70) {
    backgroundImage = `url(${config.backgroundImages?.basePath || "img"}/${config.backgroundImages?.images.high || "high.webp"})`;
  }

  if (backgroundImage) {
    const wrapper = document.getElementById("judgmentWrapper");
    if (wrapper) {
      wrapper.style.backgroundImage = backgroundImage;
    }
  }
}

// 論争比率を計算
function getControversyRatio(jsonData) {
  if (!jsonData) return 0;
  
  // JSONの構造に合わせて取得
  const stats = jsonData.engagement_metrics || jsonData.metrics || {};
  const views = stats.impressions || stats.views || 0;
  const replies = stats.replies || 0;
  
  if (views === 0) return 0;
  return (replies / views) * 100; // パーセントで返す場合は適宜調整
}

// プロモーションスコアを計算（例：セルフプロモーション度）
function getPromotionScore(jsonData) {
  if (!jsonData) return 0;
  
  // JSONの構造に合わせて取得
  const structural = jsonData.structural_judgment || {};
  return structural.promotion_score || structural.score || 0;
}

// エンゲージメントメトリクスを取得
function getEngagementMetrics(jsonData) {
  if (!jsonData) return null;
  
  const stats = jsonData.engagement_metrics || jsonData.metrics || {};
  return {
    views: stats.impressions || stats.views || 0,
    likes: stats.likes || 0,
    reposts: stats.retweets || stats.reposts || 0,
    replies: stats.replies || 0,
    bookmarks: stats.bookmarks || 0
  };
}

// 数字をフォーマット（例：1234 -> 1,234）
function formatNumber(num) {
  return num.toString().replace(/(\d)(?=(\d{3})+(?!\d))/g, "$1,");
}

// Markdownを表示
function displayMarkdown(content) {
  const caseContent = document.getElementById("caseContent");
  const loading = document.getElementById("loading");

  if (loading) loading.style.display = "none";
  if (caseContent) {
    caseContent.innerHTML = parseMarkdown(content);
    caseContent.style.display = "block";
  }
}

// 簡易Markdownパーサー
function parseMarkdown(md) {
  return (
    md
      // 見出し
      .replace(/^### (.*$)/gim, "<h3>$1</h3>")
      .replace(/^## (.*$)/gim, "<h2>$1</h2>")
      .replace(/^# (.*$)/gim, "<h1>$1</h1>")
      // 太字
      .replace(/\*\*(.*)\*\*/gim, "<strong>$1</strong>")
      // イタリック
      .replace(/\*(.*)\*/gim, "<em>$1</em>")
      // リンク
      .replace(
        /\[([^\]]+)\]\(([^)]+)\)/gim,
        '<a href="$2" target="_blank">$1</a>',
      )
      // コードブロック
      .replace(/```([^`]+)```/gim, "<pre><code>$1</code></pre>")
      // インラインコード
      .replace(/`([^`]+)`/gim, "<code>$1</code>")
      // 改行
      .replace(/\n/gim, "<br>")
  );
}

// エラーを表示
function showError() {
  const loading = document.getElementById("loading");
  const caseContent = document.getElementById("caseContent");

  if (loading) loading.style.display = "none";
  if (caseContent) {
    caseContent.innerHTML = `
      <div class="error">
        <h2>ケースが見つかりませんでした</h2>
        <p>指定されたケースが存在しないか、読み込みエラーが発生しました。</p>
        <a href="index.html">トップページに戻る</a>
      </div>
    `;
    caseContent.style.display = "block";
  }
}

// Xで共有
function shareToX() {
  const url = window.location.href;
  const title = document.getElementById("caseTitle").textContent;
  const text = `${title} - ${url}`;

  const xUrl = `${CONFIG.external.twitter.shareUrl}?text=${encodeURIComponent(text)}`;
  window.open(xUrl, "_blank");
}

// リンクをコピー
function copyLink() {
  const url = window.location.href;

  if (navigator.clipboard) {
    navigator.clipboard.writeText(url).then(() => {
      alert("リンクをコピーしました！");
    });
  } else {
    // フォールバック
    const textArea = document.createElement("textarea");
    textArea.value = url;
    document.body.appendChild(textArea);
    textArea.select();
    document.execCommand("copy");
    document.body.removeChild(textArea);
    alert("リンクをコピーしました！");
  }
}

// サムネイルを保存
function saveThumbnail() {
  const element = document.getElementById("overviewThumbnail");

  if (typeof html2canvas !== "undefined") {
    // 保存時用のスタイルを一時的に適用（グラデーションテキスト対策）
    element.classList.add("is-capturing");

    html2canvas(element, {
      backgroundColor: null,
      scale: 2,
      useCORS: true,
      logging: false,
    })
      .then((canvas) => {
        // スタイルを元に戻す
        element.classList.remove("is-capturing");

        // ダウンロードリンクを作成
        const link = document.createElement("a");
        link.download = `${document.getElementById("caseTitle").textContent}_thumbnail.png`;
        link.href = canvas.toDataURL();
        link.click();
      })
      .catch((error) => {
        element.classList.remove("is-capturing");
        console.error("サムネイル保存エラー:", error);
        alert("サムネイルの保存に失敗しました。");
      });
  } else {
    alert("html2canvasライブラリが読み込まれていません。");
  }
}

// チャートセクションを表示
function displayChartsSection(jsonData) {
  const chartsSection = document.getElementById("chartsSection");
  if (!chartsSection) return;

  // チャートセクションを表示
  chartsSection.style.display = "block";

  // Chart.jsが利用可能か確認
  if (typeof Chart !== "undefined" && window.chartUtils) {
    // 少し遅延してチャートを描画（DOMが確実に更新されるのを待つ）
    setTimeout(() => {
      try {
        // レーダーチャートを作成
        window.chartUtils.createRadarChart("radarChart", jsonData);

        // マトリクスチャートを作成
        window.chartUtils.createMatrixChart("matrixChart", jsonData);

        console.log("チャートの描画が完了しました");
      } catch (error) {
        console.error("チャート描画エラー:", error);
      }
    }, 500);
  } else {
    console.warn("Chart.jsまたはchartUtilsが利用できません");
  }
}

// ページ読み込み時に初期化
document.addEventListener("DOMContentLoaded", function () {
  // chart-utils.jsを先に読み込む
  const script = document.createElement("script");
  script.src = "js/chart-utils.js";
  script.onload = getCaseFromURL;
  document.head.appendChild(script);
});
