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
  // 初期表示時もソートを適用
  sortArchive();
}

// アーカイブデータを読み込み
async function loadArchiveData() {
  archiveData = [];

  for (const [dateDir, files] of Object.entries(CONFIG.archiveStructure)) {
    for (const filename of files) {
      const [year, month, day] = dateDir.split("-");
      // ファイル名から情報を抽出
      const parts = filename.replace(".md", "").split("_");
      const caseId = parts[1];
      const name = parts[2];
      // 日付部分を抽出（YYYY-MM-DD形式）
      const dateMatch = filename.match(/(\d{4})-(\d{2})-(\d{2})/);
      const caseDate = dateMatch
        ? `${dateMatch[1]}年${parseInt(dateMatch[2])}月${parseInt(dateMatch[3])}日`
        : "不明";

      // JSONファイルから分析時間を取得
      let analysisTime = "";
      try {
        const jsonPath = `archive/${dateDir}/${filename.replace(".md", ".json")}`;
        const response = await fetch(jsonPath);
        if (response.ok) {
          const jsonData = await response.json();
          // analysis_dateから分析時間を生成（仮定：分析は当日の昼間に行われた）
          if (jsonData.analysis_date) {
            analysisTime = " 12:00"; // デフォルトの分析時間
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

  filteredData = [...archiveData];
}

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
      filteredData.sort((a, b) => b.date - a.date);
      break;
    case "date-asc":
      filteredData.sort((a, b) => a.date - b.date);
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

  // 基本情報の表示
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
                  <strong>投稿者:</strong> ${data.target?.author || "N/A"}
              </div>
              <div class="overview-item">
                  <strong>ハンドル:</strong> ${data.target?.author_handle || "N/A"}
              </div>
          </div>
      </div>
      
      <div class="metrics-section">
          <h3>エンゲージメント指標</h3>
          <div class="metrics-grid">
              <div class="metric-item">
                  <span class="metric-value" style="${getMetricFontSize(data.metrics?.views || 0)}">${(data.metrics?.views || 0).toLocaleString()}</span>
                  <span class="metric-label">表示数</span>
              </div>
              <div class="metric-item">
                  <span class="metric-value" style="${getMetricFontSize(data.metrics?.likes || 0)}">${(data.metrics?.likes || 0).toLocaleString()}</span>
                  <span class="metric-label">いいね</span>
              </div>
              <div class="metric-item">
                  <span class="metric-value" style="${getMetricFontSize(data.metrics?.reposts || 0)}">${(data.metrics?.reposts || 0).toLocaleString()}</span>
                  <span class="metric-label">リポスト</span>
              </div>
              <div class="metric-item">
                  <span class="metric-value" style="${getMetricFontSize(data.metrics?.replies || 0)}">${(data.metrics?.replies || 0).toLocaleString()}</span>
                  <span class="metric-label">返信</span>
              </div>
              <div class="metric-item">
                  <span class="metric-value" style="${getMetricFontSize(data.metrics?.bookmarks || 0)}">${(data.metrics?.bookmarks || 0).toLocaleString()}</span>
                  <span class="metric-label">ブックマーク</span>
              </div>
              <div class="metric-item">
                  <span class="metric-value" style="font-size: 1.4rem;">${(data.metrics?.controversy_ratio || 0).toFixed(3)}</span>
                  <span class="metric-label">論争比率</span>
              </div>
          </div>
      </div>
  `;

  // コンテンツ分析
  if (data.content_analysis) {
    html += `
        <div class="content-section">
            <h3>コンテンツ分析</h3>
            <div class="content-grid">
                <div class="content-item">
                    <strong>種類:</strong> ${data.content_analysis.content_type || "N/A"}
                </div>
                <div class="content-item">
                    <strong>メディア:</strong> ${data.content_analysis.media || "N/A"}
                </div>
            </div>
            ${
              data.content_analysis.text_content
                ? `
                <div class="text-content">
                    <strong>テキスト内容:</strong>
                    <p>${data.content_analysis.text_content}</p>
                </div>
            `
                : ""
            }
        </div>
    `;
  }

  // 構造的判定
  if (data.structural_judgment || data.self_promotion_analysis) {
    const score =
      data.structural_judgment?.promotion_score ||
      data.self_promotion_analysis?.promotion_score ||
      0;
    html += `
        <div class="judgment-section">
            <h3>構造的判定</h3>
            <div class="judgment-score">
                <div class="score-bar">
                    <div class="score-fill" style="width: ${score}%"></div>
                </div>
                <span class="score-text">プロモーション度: ${score}%</span>
            </div>
            ${
              data.structural_judgment?.conclusion ||
              data.summary?.post_characterization
                ? `
                <div class="judgment-conclusion">
                    <strong>結論:</strong>
                    <p>${data.structural_judgment?.conclusion || data.summary?.post_characterization}</p>
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
