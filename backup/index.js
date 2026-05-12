let archiveData = [];
let filteredData = [];

// 初期化
async function init() {
  // UI要素をCONFIGから設定
  document.getElementById("headerContent").innerHTML = `
    <h1>${CONFIG.ui.title}</h1>
    <p class="subtitle">${CONFIG.ui.subtitle}</p>
  `;

  // ソートオプションを設定
  const sortSelect = document.getElementById("sortSelect");
  CONFIG.sortOptions.forEach((option) => {
    sortSelect.innerHTML += `<option value="${option.value}">${option.label}</option>`;
  });
  // デフォルトで最新順を選択
  sortSelect.value = "date-desc";

  await loadArchiveData();
  updateStats();
  populateFilters();

  // filteredDataが空の場合は初期化
  if (filteredData.length === 0) {
    filteredData = [...archiveData];
  }

  // 初期表示時もソートを適用
  sortArchive();
}

// アーカイブデータを読み込み（動的ディレクトリ構造対応）
async function loadArchiveData() {
  archiveData = [];

  try {
    // archiveディレクトリの構造を取得
    const archiveResponse = await fetch(
      "https://api.github.com/repos/Shizuka-Yuu/x-case/contents/archive",
    );
    if (!archiveResponse.ok) {
      console.error("Archive directory fetch failed");
      return;
    }

    const archiveContents = await archiveResponse.json();

    // ディレクトリごとに処理
    for (const dir of archiveContents) {
      if (dir.type !== "dir") continue;

      const dateDir = dir.name;
      const [year, month, day] = dateDir.split("-");

      // 各日付ディレクトリ内のファイルを取得
      const filesResponse = await fetch(
        `https://api.github.com/repos/Shizuka-Yuu/x-case/contents/archive/${dateDir}`,
      );
      if (!filesResponse.ok) continue;

      const files = await filesResponse.json();

      // .mdファイルのみを処理
      for (const file of files) {
        if (!file.name.endsWith(".md")) continue;

        const filename = file.name;
        // ファイル名から情報を抽出
        const parts = filename.replace(".md", "").split("_");
        const caseId = parts[1];
        // ユーザー名を複数部分から正しく抽出
        const nameParts = parts.slice(2, -1); // 最後の日付部分を除く
        const name = nameParts.join("_");

        // 日付部分を抽出（YYYY-MM-DD形式）
        const caseDate = `${year}年${parseInt(month)}月${parseInt(day)}日`;

        // JSONファイルから分析時間を取得（ローカル環境とGitHub Pages両対応）
        let analysisTime = "";
        try {
          // まずローカルパスを試す
          let jsonPath = `archive/${dateDir}/${filename.replace(".md", ".json")}`;
          let jsonResponse = await fetch(jsonPath);

          if (!jsonResponse.ok) {
            // ローカルでなければGitHub Raw URLを試す
            jsonPath = `https://raw.githubusercontent.com/Shizuka-Yuu/x-case/master/archive/${dateDir}/${filename.replace(".md", ".json")}`;
            jsonResponse = await fetch(jsonPath);
          }

          if (jsonResponse.ok) {
            const jsonData = await jsonResponse.json();
            // analysis_timestampから分析時間を生成
            if (jsonData.analysis_timestamp) {
              const analysisDate = new Date(jsonData.analysis_timestamp);
              analysisTime = ` ${analysisDate.getHours().toString().padStart(2, "0")}:${analysisDate.getMinutes().toString().padStart(2, "0")}`;
            }
          }
        } catch (error) {
          // JSONが存在しない場合はデフォルト時間を使用
          analysisTime = " 12:00";
        }

        archiveData.push({
          filename: filename,
          year: year,
          month: month,
          day: day,
          dateDir: dateDir,
          path: `archive/${dateDir}/${filename}`,
          date: new Date(`${year}-${month}-${day}T12:00:00`),
          caseId: caseId,
          name: name,
          caseDate: caseDate,
          analysisTime: analysisTime,
        });
      }
    }
  } catch (error) {
    console.error(
      "Dynamic directory loading failed, falling back to CONFIG:",
      error,
    );
    // エラー時はCONFIGにフォールバック
    await loadArchiveDataFromConfig();
  }

  // filteredDataを初期化
  filteredData = [...archiveData];
}

// フォールバック関数（既存のCONFIGベース）
async function loadArchiveDataFromConfig() {
  for (const [dateDir, files] of Object.entries(CONFIG.archiveStructure)) {
    for (const filename of files) {
      const [year, month, day] = dateDir.split("-");
      const parts = filename.replace(".md", "").split("_");
      const caseId = parts[1];
      // ユーザー名を複数部分から正しく抽出
      const nameParts = parts.slice(2, -1); // 最後の日付部分を除く
      const name = nameParts.join("_");
      const caseDate = `${year}年${parseInt(month)}月${parseInt(day)}日`;

      let analysisTime = "";
      try {
        // まずローカルパスを試す
        let jsonPath = `archive/${dateDir}/${filename.replace(".md", ".json")}`;
        let response = await fetch(jsonPath);

        if (!response.ok) {
          // ローカルでなければGitHub Raw URLを試す
          jsonPath = `https://raw.githubusercontent.com/Shizuka-Yuu/x-case/master/archive/${dateDir}/${filename.replace(".md", ".json")}`;
          response = await fetch(jsonPath);
        }

        if (response.ok) {
          const jsonData = await response.json();
          if (jsonData.analysis_timestamp) {
            const analysisDate = new Date(jsonData.analysis_timestamp);
            analysisTime = ` ${analysisDate.getHours().toString().padStart(2, "0")}:${analysisDate.getMinutes().toString().padStart(2, "0")}`;
          }
        }
      } catch (error) {
        analysisTime = " 12:00";
      }

      archiveData.push({
        filename: filename,
        year: year,
        month: month,
        day: day,
        dateDir: dateDir,
        path: `archive/${dateDir}/${filename}`,
        date: new Date(`${year}-${month}-${day}T12:00:00`),
        caseId: caseId,
        name: name,
        caseDate: caseDate,
        analysisTime: analysisTime,
      });
    }
  }
}

filteredData = [...archiveData];

// 統計情報を更新
function updateStats() {
  const totalCases = archiveData.length;
  const uniqueDays = new Set(
    archiveData.map((item) => `${item.year}-${item.month}-${item.day}`),
  ).size;
  const currentMonth = new Date().getMonth() + 1;
  const currentMonthCases = archiveData.filter(
    (item) =>
      parseInt(item.month) === currentMonth &&
      parseInt(item.year) === new Date().getFullYear(),
  ).length;

  document.getElementById("totalCases").textContent = totalCases;
  document.getElementById("totalDays").textContent = uniqueDays;
  document.getElementById("currentMonth").textContent = currentMonthCases;
}

// フィルターを設定
function populateFilters() {
  const yearFilter = document.getElementById("yearFilter");
  const monthFilter = document.getElementById("monthFilter");

  const years = [...new Set(archiveData.map((item) => item.year))].sort();
  const months = [...new Set(archiveData.map((item) => item.month))].sort();

  yearFilter.innerHTML = '<option value="">すべて</option>';
  years.forEach((year) => {
    yearFilter.innerHTML += `<option value="${year}">${year}年</option>`;
  });

  monthFilter.innerHTML = '<option value="">すべて</option>';
  months.forEach((month) => {
    monthFilter.innerHTML += `<option value="${month}">${parseInt(month)}月</option>`;
  });
}

// アーカイブを表示
function displayArchive() {
  const grid = document.getElementById("archiveGrid");
  const loading = document.getElementById("loading");
  const noResults = document.getElementById("noResults");

  loading.style.display = "none";

  if (filteredData.length === 0) {
    grid.style.display = "none";
    noResults.style.display = "block";
    return;
  }

  grid.style.display = "grid";
  noResults.style.display = "none";

  grid.innerHTML = filteredData
    .map(
      (item) => `
          <div class="archive-item" onclick="viewCase('${item.path}', '${item.filename}')" title="クリックでプレビューを表示">
              <div class="case-title">${item.filename.replace(".md", "")}</div>
              <div class="case-date">📅 ${item.year}年${parseInt(item.month)}月${parseInt(item.day)}日${item.analysisTime}</div>
              <div class="case-path">📁 ${item.path}</div>
              <div class="case-preview">
                  ケース ID: ${item.caseId} | 投稿者: ${item.name} | 投稿日: ${item.caseDate}
              </div>
          </div>
      `,
    )
    .join("");
}

// 検索を実行
function performSearch() {
  const searchTerm = document.getElementById("searchInput").value.toLowerCase();

  if (!searchTerm) {
    filteredData = [...archiveData];
  } else {
    filteredData = archiveData.filter(
      (item) =>
        item.filename.toLowerCase().includes(searchTerm) ||
        item.name.toLowerCase().includes(searchTerm) ||
        item.caseId.toLowerCase().includes(searchTerm) ||
        item.caseDate.toLowerCase().includes(searchTerm) ||
        item.path.toLowerCase().includes(searchTerm),
    );
  }

  applyFilters();
  sortArchive();
}

// 検索をクリア
function clearSearch() {
  document.getElementById("searchInput").value = "";
  filteredData = [...archiveData];
  applyFilters();
  sortArchive();
}

// フィルターを適用
function applyFilters() {
  const yearFilter = document.getElementById("yearFilter").value;
  const monthFilter = document.getElementById("monthFilter").value;

  filteredData = filteredData.filter((item) => {
    if (yearFilter && item.year !== yearFilter) return false;
    if (monthFilter && item.month !== monthFilter) return false;
    return true;
  });

  displayArchive();
}

// フィルター変更時
function filterArchive() {
  const searchTerm = document.getElementById("searchInput").value.toLowerCase();

  if (!searchTerm) {
    filteredData = [...archiveData];
  } else {
    filteredData = archiveData.filter(
      (item) =>
        item.filename.toLowerCase().includes(searchTerm) ||
        item.name.toLowerCase().includes(searchTerm) ||
        item.caseId.toLowerCase().includes(searchTerm) ||
        item.caseDate.toLowerCase().includes(searchTerm) ||
        item.path.toLowerCase().includes(searchTerm),
    );
  }

  applyFilters();
  sortArchive();
}

// ソート
function sortArchive() {
  const sortValue = document.getElementById("sortSelect").value;

  switch (sortValue) {
    case "date-desc":
      filteredData.sort((a, b) => {
        if (b.date - a.date !== 0) return b.date - a.date;
        // 同じ日付の場合はcaseIdでソート（降順）
        return parseInt(b.caseId) - parseInt(a.caseId);
      });
      break;
    case "date-asc":
      filteredData.sort((a, b) => {
        if (a.date - b.date !== 0) return a.date - b.date;
        // 同じ日付の場合はcaseIdでソート（昇順）
        return parseInt(a.caseId) - parseInt(b.caseId);
      });
      break;
    case "name-asc":
      filteredData.sort((a, b) => a.name.localeCompare(b.name));
      break;
    case "name-desc":
      filteredData.sort((a, b) => b.name.localeCompare(a.name));
      break;
  }

  displayArchive();
}

// ケースを表示
async function viewCase(path, filename) {
  const modal = document.getElementById("modal");
  const modalBody = document.getElementById("modalBody");

  // JSONファイルのパスに変換
  const jsonPath = path.replace(".md", ".json");

  modalBody.innerHTML = `<div class="loading">${CONFIG.modal.loadingMessage}</div>`;
  modal.style.display = "block";

  try {
    // JSONデータを取得
    const response = await fetch(jsonPath);
    if (!response.ok) {
      throw new Error("JSONファイルが見つかりません");
    }

    const data = await response.json();
    displayJsonData(data, filename, path);
  } catch (error) {
    // JSONが見つからない場合はGitHubリンクを表示
    modalBody.innerHTML = `
        <h2>${filename.replace(".md", "")}</h2>
        <p><strong>パス:</strong> ${path}</p>
        <p><strong>GitHubで表示:</strong> <a href="${CONFIG.github.baseUrl}/${path}" target="_blank">こちらをクリック</a></p>
        <p><strong>JSON表示:</strong> <a href="${CONFIG.github.baseUrl}/${jsonPath}" target="_blank">${filename.replace(".md", ".json")}</a></p>
        <hr>
        <p><em>${CONFIG.modal.fallbackMessage}</em></p>
    `;
  }
}

// JSONデータを表示
function displayJsonData(data, filename, originalPath) {
  const modalBody = document.getElementById("modalBody");

  // 分析時間を取得（analysis_dateと現在時刻から生成）
  const analysisDateTime = data.analysis_date
    ? `${data.analysis_date} ${new Date().toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" })}`
    : "N/A";

  // 数値のフォントサイズを判定する関数
  function getMetricFontSize(value) {
    const numValue =
      typeof value === "string" ? parseFloat(value.replace(/,/g, "")) : value;
    return numValue >= 10000000 ? "font-size: 1.2rem;" : "font-size: 1.4rem;";
  }

  // 基本情報の表示 - 新しいJSON構造に対応
  const engagement = getEngagementMetrics(data);
  const target = data.target || {};
  const authorInfo = getAuthorInfo(data);

  let html = `
      <h2>${data.filename || filename.replace(".md", "")}</h2>
      <div class="case-overview">
          <div class="overview-grid">
              <div class="overview-item">
                  <strong>ケースID:</strong> ${data.case_id || "N/A"}
              </div>
              <div class="overview-item">
                  <strong>分析日時:</strong> ${analysisDateTime}
              </div>
              <div class="overview-item">
                  <strong>投稿者:</strong> ${authorInfo.name || target.author || "N/A"}
              </div>
              <div class="overview-item">
                  <strong>ハンドル:</strong> ${authorInfo.handle || target.author_handle || "N/A"}
              </div>
          </div>
      </div>
      
      <div class="metrics-section">
          <h3>エンゲージメント指標</h3>
          <div class="metrics-grid">
              <div class="metric-item">
                  <span class="metric-value" style="${getMetricFontSize(engagement.views || 0)}">${(engagement.views || 0).toLocaleString()}</span>
                  <span class="metric-label">表示数</span>
              </div>
              <div class="metric-item">
                  <span class="metric-value" style="${getMetricFontSize(engagement.likes || 0)}">${(engagement.likes || 0).toLocaleString()}</span>
                  <span class="metric-label">いいね</span>
              </div>
              <div class="metric-item">
                  <span class="metric-value" style="${getMetricFontSize(engagement.reposts || 0)}">${(engagement.reposts || 0).toLocaleString()}</span>
                  <span class="metric-label">リポスト</span>
              </div>
              <div class="metric-item">
                  <span class="metric-value" style="${getMetricFontSize(engagement.replies || 0)}">${(engagement.replies || 0).toLocaleString()}</span>
                  <span class="metric-label">返信</span>
              </div>
              <div class="metric-item">
                  <span class="metric-value" style="${getMetricFontSize(engagement.bookmarks || 0)}">${(engagement.bookmarks || 0).toLocaleString()}</span>
                  <span class="metric-label">ブックマーク</span>
              </div>
              <div class="metric-item">
                  <span class="metric-value" style="font-size: 1.4rem;">${(getControversyRatio(data) * 100).toFixed(1)}%</span>
                  <span class="metric-label">論争比率</span>
              </div>
          </div>
      </div>
  `;

  // コンテンツ分析 - 新しいJSON構造に対応
  const contentAnalysis = data.content_analysis || {};
  if (
    contentAnalysis.content_type ||
    contentAnalysis.media ||
    contentAnalysis.text_content
  ) {
    html += `
        <div class="content-section">
            <h3>コンテンツ分析</h3>
            <div class="content-grid">
                <div class="content-item">
                    <strong>種類:</strong> ${contentAnalysis.content_type || "N/A"}
                </div>
                <div class="content-item">
                    <strong>メディア:</strong> ${contentAnalysis.media || "N/A"}
                </div>
            </div>
            ${
              contentAnalysis.text_content
                ? `
                <div class="text-content">
                    <strong>テキスト内容:</strong>
                    <p>${contentAnalysis.text_content}</p>
                </div>
            `
                : ""
            }
        </div>
    `;
  }

  // 構造的判定 - 新しいJSON構造に対応
  const promotionScore = getPromotionScore(data);

  if (
    promotionScore > 0 ||
    data.structural_judgment ||
    data.self_promotion_analysis ||
    data.analysis
  ) {
    html += `
        <div class="judgment-section">
            <h3>構造的判定</h3>
            <div class="judgment-score">
                <div class="score-bar">
                    <div class="score-fill" style="width: ${promotionScore}%"></div>
                </div>
                <span class="score-text">プロモーション度: ${promotionScore}%</span>
            </div>
            ${
              getJudgmentConclusion(data)
                ? `
                <div class="judgment-conclusion">
                    <strong>結論:</strong>
                    <p>${getJudgmentConclusion(data)}</p>
                </div>
            `
                : ""
            }
        </div>
    `;
  }

  // リンク
  html += `
      <div class="links-section">
          <h3>関連リンク</h3>
          <p><strong>GitHub (Markdown):</strong> <a href="${CONFIG.github.baseUrl}/${originalPath}" target="_blank">元ファイル</a></p>
          <p><strong>GitHub (JSON):</strong> <a href="${CONFIG.github.baseUrl}/${originalPath.replace(".md", ".json")}" target="_blank">JSONファイル</a></p>
          <p><strong>個別ページ:</strong> <a href="case.html?case=${originalPath}&id=${filename}" target="_blank">詳細ページで表示</a></p>
          ${data.target?.url ? `<p><strong>元ポスト:</strong> <a href="${data.target.url}" target="_blank">Xで表示</a></p>` : ""}
      </div>
  `;

  modalBody.innerHTML = html;
}

// 個別ページを開く
function openCasePage(path, filename) {
  window.open(`case.html?case=${path}&id=${filename}`, "_blank");
}

// モーダルを閉じる
function closeModal() {
  document.getElementById("modal").style.display = "none";
}

// ウィンドウ外クリックでモーダルを閉じる
window.onclick = function (event) {
  const modal = document.getElementById("modal");
  if (event.target === modal) {
    modal.style.display = "none";
  }
};

// ページ読み込み時に初期化
document.addEventListener("DOMContentLoaded", init);
