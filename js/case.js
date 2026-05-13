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
    // caseOverviewを表示
    const caseOverview = document.getElementById("caseOverview");
    if (caseOverview) {
      caseOverview.style.display = "block";
      console.log("caseOverviewを表示");
    }

    updateThumbnailData(jsonData, title);

    // 確実にDOM更新を実行
    const controversyRatio = getControversyRatio(jsonData);
    const promotionScore = getPromotionScore(jsonData);

    // 論争比率を確実に更新
    const controversyElement = document.getElementById("thumbControversyStat");
    if (controversyElement) {
      controversyElement.textContent =
        (controversyRatio * 100).toFixed(1) + "%";
      console.log(
        "確実更新: 論争比率を更新:",
        (controversyRatio * 100).toFixed(1) + "%",
      );
    }

    // プロモーションスコアを確実に更新
    const promotionElement = document.getElementById("promotionText");
    if (promotionElement) {
      promotionElement.textContent = promotionScore + "%";
      console.log(
        "確実更新: プロモーションスコアを更新:",
        promotionScore + "%",
      );
    }

    // バーを確実に更新（アニメーションを考慮）
    const barElement = document.getElementById("structuralJudgmentBar");
    if (barElement) {
      // トランジションを設定してから幅を更新
      barElement.style.transition = "width 1.2s cubic-bezier(0.4, 0, 0.2, 1)";
      barElement.style.width = promotionScore + "%";
      console.log("確実更新: バー幅を更新:", promotionScore + "%");
    }

    // 拡張機能：チャートセクションを表示
    displayChartsSection(jsonData);
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

  // 背景画像を更新（現在の配置を維持）
  thumbnail.style.background = `white ${backgroundImage} no-repeat 50% 129%`;
  thumbnail.style.backgroundSize = "contain";
}

// 構造的判定スコアを更新
function updateStructuralJudgmentScore(judgment) {
  // 統一的なデータ取得関数を使用
  const structuralScore = getPromotionScore(judgment);

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

      // スコアに応じて色を設定（新しい仕様：0~20緑、20~40黄、40~60橙、60~100赤）
      if (structuralScore <= 20) {
        // 0~20：緑系
        structuralBar.style.backgroundColor = "#28a745";
      } else if (structuralScore <= 40) {
        // 20~40：黄色系
        structuralBar.style.backgroundColor = "#ffc107";
      } else if (structuralScore <= 60) {
        // 40~60：オレンジ系
        structuralBar.style.backgroundColor = "#fd7e14";
      } else {
        // 60~100：赤系
        structuralBar.style.backgroundColor = "#dc3545";
      }

      // CSSアニメーションを使用
      structuralBar.style.width = structuralScore + "%";
      structuralBar.classList.add("score-fill-animated");

      // アニメーション完了後にクラスを削除（再利用のため）
      setTimeout(() => {
        structuralBar.classList.remove("score-fill-animated");
      }, 1200);

      console.log("CSSアニメーションでバー幅を設定:", structuralScore + "%");
    } else {
      // DOM要素が見つからない場合は少し待って再試行
      setTimeout(updateBar, 100);
    }
  };

  // 即時実行
  updateBar();
}

// プロモーションスコアを更新
function updatePromotionScore(score) {
  let promotionScore = 0;

  if (typeof score === "number") {
    promotionScore = score;
  } else if (score && score.promotion_score) {
    promotionScore = score.promotion_score;
  } else if (score && score.reasoning && score.reasoning.promotion_elements) {
    promotionScore = score.reasoning.promotion_elements.percentage;
  }

  console.log("プロモーションスコア更新:", promotionScore);

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
