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

    // JSONデータを取得
    const jsonPath = casePath.replace(".md", ".json");
    console.log("JSONパス:", jsonPath);

    const jsonResponse = await fetch(jsonPath);
    let jsonData = null;

    if (jsonResponse.ok) {
      jsonData = await jsonResponse.json();
      console.log("JSONデータ読み込み成功:", jsonData);
    } else {
      console.warn("JSONファイルが見つかりません:", jsonPath);
    }

    // Markdownコンテンツを取得
    const mdResponse = await fetch(casePath);
    if (!mdResponse.ok) {
      throw new Error("Markdownファイルが見つかりません");
    }

    const markdownContent = await mdResponse.text();
    console.log("Markdown読み込み成功");

    // ページ情報を設定
    updatePageInfo(casePath, caseId, jsonData);

    // Markdownを表示
    displayMarkdown(markdownContent);
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

  // 概要セクションを更新
  if (jsonData) {
    updateOverviewSection(jsonData, title);
  }

  // ページタイトルを更新
  document.title = `${title} - X-case`;
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

  // タイトルとケースID
  document.getElementById("thumbnailTitle").textContent = title;
  document.getElementById("thumbnailCaseId").textContent =
    `Case #${jsonData.case_id || "000"}`;

  // メトリクス
  if (jsonData.metrics) {
    console.log("メトリクスデータ:", jsonData.metrics);
    document.getElementById("thumbViewsStat").textContent = formatNumber(
      jsonData.metrics.views || 0,
    );
    document.getElementById("thumbLikesStat").textContent = formatNumber(
      jsonData.metrics.likes || 0,
    );
    document.getElementById("thumbRepostsStat").textContent = formatNumber(
      jsonData.metrics.reposts || 0,
    );
    document.getElementById("thumbRepliesStat").textContent = formatNumber(
      jsonData.metrics.replies || 0,
    );
    document.getElementById("thumbBookmarksStat").textContent = formatNumber(
      jsonData.metrics.bookmarks || 0,
    );
    document.getElementById("thumbControversyStat").textContent = jsonData
      .metrics.controversy_ratio
      ? (jsonData.metrics.controversy_ratio * 100).toFixed(1) + "%"
      : "0%";
  } else {
    console.warn("メトリクスデータがありません");
  }

  // 構造的判定 - index.htmlのモーダルと同様のロジックに修正
  if (jsonData.structural_judgment || jsonData.self_promotion_analysis) {
    console.log(
      "構造的判定データ:",
      jsonData.structural_judgment || jsonData.self_promotion_analysis,
    );
    // データ構造に応じて適切なオブジェクトを渡す
    const judgmentData =
      jsonData.structural_judgment || jsonData.self_promotion_analysis;
    updateJudgmentBars(judgmentData);
  } else {
    console.warn("構造的判定データがありません");
  }
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

  // 背景画像を更新（現在の配置を維持）
  thumbnail.style.background = `white ${backgroundImage} no-repeat 50% 129%`;
  thumbnail.style.backgroundSize = "contain";
}

// 構造的判定スコアを更新
function updateStructuralJudgmentScore(judgment) {
  let structuralScore = 0;

  // データ構造に応じてスコアを取得
  if (
    judgment.structural_judgment &&
    judgment.structural_judgment.score !== undefined
  ) {
    structuralScore = judgment.structural_judgment.score;
  } else if (
    judgment.self_promotion_analysis &&
    judgment.self_promotion_analysis.promotion_score !== undefined
  ) {
    structuralScore = judgment.self_promotion_analysis.promotion_score;
  } else if (judgment.promotion_score !== undefined) {
    structuralScore = judgment.promotion_score;
  }

  console.log("構造的判定スコア:", structuralScore);

  // 背景画像を更新（構造的判定スコアに応じて）
  const thumbnail = document.querySelector(".overview-thumbnail");
  if (thumbnail) {
    let backgroundImage = "";
    const config = window.CONFIG || {};

    if (structuralScore >= 0 && structuralScore <= 19) {
      backgroundImage = `url(${config.backgroundImages?.basePath || "img"}/${config.backgroundImages?.images.low || "low.webp "})`;
    } else if (structuralScore >= 20 && structuralScore <= 39) {
      backgroundImage = `url(${config.backgroundImages?.basePath || "img"}/${config.backgroundImages?.images.normal || "normal.webp"})`;
    } else if (structuralScore >= 40 && structuralScore <= 69) {
      backgroundImage = `url(${config.backgroundImages?.basePath || "img"}/${config.backgroundImages?.images.mid || "mid.webp"})`;
    } else if (structuralScore >= 70) {
      backgroundImage = `url(${config.backgroundImages?.basePath || "img"}/${config.backgroundImages?.images.high || "high.webp"})`;
    }

    // 背景画像を更新（現在の配置を維持）
    thumbnail.style.background = `white ${backgroundImage} no-repeat 50% 129%`;
    thumbnail.style.backgroundSize = "contain";
  }

  // DOMが完全に読み込まれた後にバーを更新
  const updateBar = () => {
    const structuralBar = document.getElementById("structuralJudgmentBar");
    if (structuralBar) {
      // トランジションを設定
      structuralBar.style.transition =
        "width 1.2s cubic-bezier(0.4, 0, 0.2, 1)";

      // スコアに応じて色を設定
      if (structuralScore < 30) {
        structuralBar.style.background =
          "linear-gradient(90deg, #28a745, #34ce57)";
        structuralBar.style.backgroundColor = "#28a745";
      } else if (structuralScore < 70) {
        structuralBar.style.background =
          "linear-gradient(90deg, #ffc107, #ffcd39)";
        structuralBar.style.backgroundColor = "#ffc107";
      } else {
        structuralBar.style.background =
          "linear-gradient(90deg, #dc3545, #e4606d)";
        structuralBar.style.backgroundColor = "#dc3545";
      }

      // まず幅を0%にリセット
      structuralBar.style.width = "0%";

      // 500ms後にターゲット幅に設定
      setTimeout(() => {
        structuralBar.style.width = structuralScore + "%";
        console.log("バー幅を設定:", structuralScore + "%");
      }, 500);
    } else {
      // DOM要素が見つからない場合は少し待って再試行
      setTimeout(updateBar, 100);
    }
  };

  // 即時実行
  updateBar();
}

// プロモーションスコアを更新
function updatePromotionScore(judgment) {
  let promotionScore = 0;

  if (judgment.promotion_score) {
    promotionScore = judgment.promotion_score;
  } else if (judgment.reasoning && judgment.reasoning.promotion_elements) {
    promotionScore = judgment.reasoning.promotion_elements.percentage;
  }

  // DOMを更新 - エラーハンドリング付き
  const promotionText = document.getElementById("promotionText");
  if (promotionText) {
    promotionText.textContent = promotionScore + "%";
    // プロモーションスコアに応じて背景画像を更新
    updateBackgroundByPromotionScore(promotionScore);
  }
}

// 数字をフォーマット（生データを表示）
function formatNumber(num) {
  return num.toLocaleString("ja-JP");
}

// Markdownコンテンツを表示
function displayMarkdown(content) {
  const markdownContent = document.getElementById("markdownContent");
  const loading = document.getElementById("loading");
  const caseContent = document.getElementById("caseContent");

  // 簡単なMarkdownパーサ（実際のプロジェクトではmarked.jsなどを使用）
  const htmlContent = parseMarkdown(content);

  markdownContent.innerHTML = htmlContent;

  // ローディングを非表示にしてコンテンツを表示
  loading.style.display = "none";
  caseContent.style.display = "block";
}

// 簡単なMarkdownパーサ
function parseMarkdown(markdown) {
  return (
    markdown
      // ヘッダー
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

  loading.style.display = "none";
  caseContent.innerHTML = `
    <div class="error">
      <h2>ケースが見つかりませんでした</h2>
      <p>指定されたケースが存在しないか、読み込みエラーが発生しました。</p>
      <a href="index.html">トップページに戻る</a>
    </div>
  `;
  caseContent.style.display = "block";
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
    html2canvas(element, {
      backgroundColor: null,
      scale: 2,
    })
      .then((canvas) => {
        // ダウンロードリンクを作成
        const link = document.createElement("a");
        link.download = `${document.getElementById("caseTitle").textContent}_thumbnail.png`;
        link.href = canvas.toDataURL();
        link.click();
      })
      .catch((error) => {
        console.error("サムネイル保存エラー:", error);
        alert("サムネイルの保存に失敗しました。");
      });
  } else {
    alert("html2canvasライブラリが読み込まれていません。");
  }
}

// ページ読み込み時に初期化
document.addEventListener("DOMContentLoaded", getCaseFromURL);
