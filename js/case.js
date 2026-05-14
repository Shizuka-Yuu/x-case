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
    
    // タイトルなどの最終同期
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
    const caseOverview = document.getElementById("caseOverview");
    if (caseOverview) caseOverview.style.display = "block";

    // データの更新を1箇所に集約
    updateThumbnailData(jsonData, title);
    displayChartsSection(jsonData);
  }
}

// サムネイルデータを更新
function updateThumbnailData(jsonData, title) {
  const controversyRatio = getControversyRatio(jsonData);
  const promotionScore = getPromotionScore(jsonData);
  const engagement = getEngagementMetrics(jsonData);

  // タイトルとケースIDを更新
  const titleElement = document.getElementById("thumbnailTitle");
  if (titleElement) titleElement.textContent = title;

  const caseIdElement = document.getElementById("thumbnailCaseId");
  if (caseIdElement) {
    const cleanCaseId = jsonData.case_id ? jsonData.case_id.replace(/^Case_/, "") : "000";
    caseIdElement.textContent = `Case #${cleanCaseId}`;
  }

  // メトリクスデータを更新
  if (engagement) {
    const map = {
      "thumbViewsStat": engagement.views,
      "thumbLikesStat": engagement.likes,
      "thumbRepostsStat": engagement.reposts,
      "thumbRepliesStat": engagement.replies,
      "thumbBookmarksStat": engagement.bookmarks
    };
    for (const [id, val] of Object.entries(map)) {
      const el = document.getElementById(id);
      if (el) el.textContent = formatNumber(val);
    }
  }

  // 論争比率
  const controversyElement = document.getElementById("thumbControversyStat");
  if (controversyElement) {
    controversyElement.textContent = (controversyRatio * 100).toFixed(1) + "%";
  }

  // プロモーションスコアとバーの更新
  updatePromotionUI(promotionScore);
  
  // 背景画像の更新
  updateBackgroundByPromotionScore(promotionScore);
}

// プロモーション関連のUI（テキストとバー）を一括更新
function updatePromotionUI(score) {
  const promotionText = document.getElementById("promotionText");
  if (promotionText) promotionText.textContent = score + "%";

  const bar = document.getElementById("structuralJudgmentBar");
  if (bar) {
    bar.style.transition = "width 1.2s cubic-bezier(0.4, 0, 0.2, 1)";
    bar.style.width = score + "%";
    
    // スコアに応じた色分け
    if (score <= 20) bar.style.backgroundColor = "#28a745";
    else if (score <= 40) bar.style.backgroundColor = "#ffc107";
    else if (score <= 60) bar.style.backgroundColor = "#fd7e14";
    else bar.style.backgroundColor = "#dc3545";
  }
}

// 背景画像を更新
function updateBackgroundByPromotionScore(promotionScore) {
  const wrapper = document.getElementById("judgmentWrapper");
  if (!wrapper) return;

  const config = window.CONFIG || {};
  const images = config.backgroundImages?.images || {};
  let imgName = "normal.webp";

  if (promotionScore <= 19) imgName = images.low || "low.webp";
  else if (promotionScore <= 39) imgName = images.normal || "normal.webp";
  else if (promotionScore <= 69) imgName = images.mid || "mid.webp";
  else imgName = images.high || "high.webp";

  const basePath = config.backgroundImages?.basePath || "img";
  wrapper.style.backgroundImage = `url(${basePath}/${imgName})`;
  wrapper.style.backgroundSize = "cover";
  wrapper.style.backgroundPosition = "center";
}

// ヘルパー：論争比率を取得
function getControversyRatio(jsonData) {
  if (!jsonData) return 0;
  if (jsonData.metrics?.controversy_ratio) return jsonData.metrics.controversy_ratio / 100;
  const stats = jsonData.metrics || jsonData.engagement_metrics || jsonData;
  const views = stats.impressions || stats.views || 0;
  const replies = stats.replies || 0;
  return views > 0 ? (replies / views) : 0;
}

// ヘルパー：プロモーションスコアを取得（複数のJSON形式に対応）
function getPromotionScore(jsonData) {
  if (!jsonData) return 0;
  if (typeof jsonData.promotion_score === "number") return jsonData.promotion_score;
  const structural = jsonData.structural_judgment || {};
  return structural.promotion_score || structural.score || jsonData.score || 0;
}

// ヘルパー：エンゲージメントメトリクスを取得
function getEngagementMetrics(jsonData) {
  if (!jsonData) return null;
  const stats = jsonData.metrics || jsonData.engagement_metrics || jsonData;
  return {
    views: stats.impressions || stats.views || 0,
    likes: stats.likes || 0,
    reposts: stats.retweets || stats.reposts || 0,
    replies: stats.replies || 0,
    bookmarks: stats.bookmarks || 0
  };
}

function formatNumber(num) {
  return (num || 0).toLocaleString("ja-JP");
}

function displayMarkdown(content) {
  const markdownContent = document.getElementById("markdownContent");
  const loading = document.getElementById("loading");
  const caseContent = document.getElementById("caseContent");

  if (loading) loading.style.display = "none";
  if (markdownContent) markdownContent.innerHTML = parseMarkdown(content);
  if (caseContent) caseContent.style.display = "block";
}

function parseMarkdown(md) {
  return md
    .replace(/^### (.*$)/gim, "<h3>$1</h3>")
    .replace(/^## (.*$)/gim, "<h2>$1</h2>")
    .replace(/^# (.*$)/gim, "<h1>$1</h1>")
    .replace(/\*\*(.*)\*\*/gim, "<strong>$1</strong>")
    .replace(/\*(.*)\*/gim, "<em>$1</em>")
    .replace(/\[([^\]]+)\]\(([^)]+)\)/gim, '<a href="$2" target="_blank">$1</a>')
    .replace(/```([^`]+)```/gim, "<pre><code>$1</code></pre>")
    .replace(/`([^`]+)`/gim, "<code>$1</code>")
    .replace(/\n/gim, "<br>");
}

function showError() {
  const loading = document.getElementById("loading");
  const caseContent = document.getElementById("caseContent");
  if (loading) loading.style.display = "none";
  if (caseContent) {
    caseContent.innerHTML = `<div class="error"><h2>ケースが見つかりませんでした</h2><p>読み込みに失敗しました。</p><a href="index.html">戻る</a></div>`;
    caseContent.style.display = "block";
  }
}

function shareToX() {
  const url = window.location.href;
  const title = document.getElementById("caseTitle").textContent;
  const xUrl = `https://twitter.com/share?text=${encodeURIComponent(title + " - " + url)}`;
  window.open(xUrl, "_blank");
}

function copyLink() {
  const url = window.location.href;
  navigator.clipboard.writeText(url).then(() => alert("リンクをコピーしました！"));
}

function saveThumbnail() {
  const element = document.getElementById("overviewThumbnail");
  if (typeof html2canvas !== "undefined") {
    element.classList.add("is-capturing");
    html2canvas(element, { backgroundColor: null, scale: 2, useCORS: true }).then(canvas => {
      element.classList.remove("is-capturing");
      const link = document.createElement("a");
      link.download = `${document.getElementById("caseTitle").textContent}_thumbnail.png`;
      link.href = canvas.toDataURL();
      link.click();
    }).catch(err => {
      element.classList.remove("is-capturing");
      console.error(err);
    });
  }
}

function displayChartsSection(jsonData) {
  const section = document.getElementById("chartsSection");
  if (section && typeof Chart !== "undefined" && window.chartUtils) {
    section.style.display = "block";
    setTimeout(() => {
      window.chartUtils.createRadarChart("radarChart", jsonData);
      window.chartUtils.createMatrixChart("matrixChart", jsonData);
    }, 500);
  }
}

document.addEventListener("DOMContentLoaded", function () {
  const script = document.createElement("script");
  script.src = "js/chart-utils.js";
  script.onload = getCaseFromURL;
  document.head.appendChild(script);
});
