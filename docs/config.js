// X-case Archive Viewer Configuration
const CONFIG = {
  // アーカイブデータ構造
  archiveStructure: {
    "2026-05-10": [
      "Case_001_hideto_sa_2026-05-10_reanalysis.md",
      "Case_002_hayakore_2026-05-10.md",
      "Case_003_gihuboy_2026-05-10.md",
      "Case_004_tesuta001_2026-05-10.md",
    ],
    "2026-05-11": ["Case_005_okada_junichi_2026-05-11.md"],
  },

  // GitHubリポジトリ設定
  github: {
    baseUrl: "https://github.com/Shizuka-Yuu/x-case/blob/master",
    rawUrl: "https://raw.githubusercontent.com/Shizuka-Yuu/x-case/master",
  },

  // UI設定
  ui: {
    title: "X-case",
    subtitle: "Archive Viewer - 研究データアーカイブ",
    loadingMessage: "アーカイブデータを読み込み中...",
    noResultsMessage: "該当するケースが見つかりませんでした",
    noResultsSubMessage: "検索条件を変更して再度お試しください",
  },

  // 表示設定
  display: {
    itemsPerPage: 20,
    dateFormat: "YYYY年MM月DD日",
  },

  // モーダル設定
  modal: {
    loadingMessage: "読み込み中...",
    errorMessage: "JSONファイルが見つかりません",
    fallbackMessage: "このコンテンツはGitHubリポジトリでご確認いただけます。",
  },

  // 検索設定
  search: {
    placeholder: "ケース名、日付、内容で検索...",
    debounceDelay: 300,
  },

  // ソートオプション
  sortOptions: [
    { value: "date-desc", label: "日付 (新しい順)" },
    { value: "date-asc", label: "日付 (古い順)" },
    { value: "name-asc", label: "名前 (A-Z)" },
    { value: "name-desc", label: "名前 (Z-A)" },
  ],
};

// グローバル変数としてCONFIGをエクスポート
if (typeof module !== "undefined" && module.exports) {
  module.exports = CONFIG;
} else {
  window.CONFIG = CONFIG;
}
