// X-case Chart Utils
// チャート関連のユーティリティ関数

class ChartUtils {
  constructor() {
    this.radarChart = null;
    this.matrixChart = null;
    this.chartColors = {
      primary: "rgba(102, 126, 234, 0.8)",
      secondary: "rgba(118, 75, 162, 0.8)",
      background: "rgba(102, 126, 234, 0.2)",
      border: "rgba(102, 126, 234, 1)",
    };
  }

  // 重み付け複合スコア計算（非線形スケーリング）
  calculateCompositeScore(controversyRatio, promotionScore) {
    // 論争比率（0.01 = 1%）を 0-10 のスコアに変換
    // 1%前後で最もスコアが動くように調整（シグモイド的な感度設定）
    const normalizedControversy =
      10 / (1 + Math.exp(-(controversyRatio - 0.01) * 200));
    return (normalizedControversy + promotionScore) / 2;
  }

  // プロモーションスコアのシンプルスケーリング（1/5に変換）
  calculatePromotionPurityScaled(promotionScore) {
    // プロモーションスコアを単純に1/5にスケーリング
    const scaledScore = promotionScore / 5;

    // 0-10の範囲に制限
    return Math.max(0, Math.min(10, scaledScore));
  }

  // 新しい6軸構成によるスコア計算
  calculateSixAxisScores(metrics, promotionScore, controversyRatio) {
    // プロモーション純度（特殊スケーリング適用）
    const promotionPurity = this.calculatePromotionPurityScaled(promotionScore);

    // 論争ポテンシャル (非線形スケーリング)
    const controversyPotential =
      10 / (1 + Math.exp(-(controversyRatio - 0.01) * 200));

    // 拡散力 (Reposts / Views の比率をスコア化)
    const diffusionPower = Math.min(
      (metrics.reposts / (metrics.views || 1)) * 1000,
      10,
    );

    // 共感・保存力 (Bookmarks / Views の比率をスコア化)
    const empathyPower = Math.min(
      (metrics.bookmarks / (metrics.views || 1)) * 1000,
      10,
    );

    // エンゲージメント密度 (Likes / Views の比率をスコア化)
    const engagementDensity = Math.min(
      (metrics.likes / (metrics.views || 1)) * 1000,
      10,
    );

    // 絶対的影響力 (ログスケールの総量)
    const absoluteInfluence = Math.min(Math.log10(metrics.views || 1), 10);

    return {
      promotionPurity,
      controversyPotential,
      diffusionPower,
      empathyPower,
      engagementDensity,
      absoluteInfluence,
    };
  }

  // 旧エンゲージメント指標の重み付け計算（互換性のため残す）
  calculateEngagementScore(metrics) {
    const weights = {
      views: 0.8, // 基準（最も重要）
      likes: 0.6, // 表示数の75%程度
      reposts: 0.5, // 表示数の62.5%程度
      replies: 0.4, // 表示数の50%程度
      bookmarks: 0.3, // 表示数の37.5%程度
    };

    const toLogScale = (value) => (value > 0 ? Math.log10(value) : 0);

    const weightedViews = Math.min(
      toLogScale(metrics.views || 0) * weights.views,
      10,
    );
    const weightedLikes = Math.min(
      toLogScale(metrics.likes || 0) * weights.likes,
      10,
    );
    const weightedReposts = Math.min(
      toLogScale(metrics.reposts || 0) * weights.reposts,
      10,
    );
    const weightedReplies = Math.min(
      toLogScale(metrics.replies || 0) * weights.replies,
      10,
    );
    const weightedBookmarks = Math.min(
      toLogScale(metrics.bookmarks || 0) * weights.bookmarks,
      10,
    );

    return (
      (weightedViews + weightedLikes + weightedReposts + weightedBookmarks) / 4
    );
  }

  // 対数スケール変換（より穏やかなスケーリング）
  toLogScale(value) {
    return value > 0 ? Math.log10(value) * 5 : 0; // 係数を5に調整
  }

  // マトリクス用のバブルサイズ計算（より安定したスケーリング）
  calculateBubbleSize(views) {
    if (views <= 0) return 5;
    // 対数スケールを使用し、より小さな範囲に収める
    const logSize = Math.log10(views) * 3;
    return Math.min(Math.max(logSize, 5), 30); // 5-30の範囲に制限
  }

  // レーダーチャートデータ準備（新しい6軸構成）
  prepareRadarData(caseData) {
    const metrics = caseData.metrics;
    const promotionScore = caseData.promotion_score || 0;
    const controversyRatio = metrics.controversy_ratio || 0;

    // 新しい6軸スコアを計算
    const sixAxisScores = this.calculateSixAxisScores(
      metrics,
      promotionScore,
      controversyRatio,
    );

    return {
      labels: [
        "プロモーション純度",
        "論争ポテンシャル",
        "拡散力",
        "共感・保存力",
        "エンゲージメント密度",
        "絶対的影響力",
      ],
      datasets: [
        {
          label: caseData.target?.author || "ケース分析",
          data: [
            sixAxisScores.promotionPurity, // 0-10
            sixAxisScores.controversyPotential, // 0-10
            sixAxisScores.diffusionPower, // 0-10
            sixAxisScores.empathyPower, // 0-10
            sixAxisScores.engagementDensity, // 0-10
            sixAxisScores.absoluteInfluence, // 0-10
          ],
          backgroundColor: this.chartColors.background,
          borderColor: this.chartColors.border,
          borderWidth: 2,
          pointBackgroundColor: this.chartColors.primary,
          pointBorderColor: "#fff",
          pointHoverBackgroundColor: "#fff",
          pointHoverBorderColor: this.chartColors.primary,
        },
      ],
    };
  }

  // マトリクスチャートデータ準備
  prepareMatrixData(caseData) {
    const metrics = caseData.metrics;
    const promotionScore = caseData.promotion_score || 0;
    const compositeScore = this.calculateCompositeScore(
      metrics.controversy_ratio || 0,
      promotionScore,
    );

    // 重み付けエンゲージメントスコアを計算
    const engagementScore = this.calculateEngagementScore(metrics);

    return {
      datasets: [
        {
          label: caseData.target?.author || "ケース",
          data: [
            {
              x: promotionScore, // プロモーションスコアは元の値を使用（0-100範囲）
              y: Math.min(compositeScore * 10, 100), // 複合スコアを10倍にスケーリングし、最大100で制限
              r: this.calculateBubbleSize(metrics.views || 0), // 新しいバブルサイズ計算関数を使用
            },
          ],
          backgroundColor: this.getContentTypeColor(
            caseData.content_analysis?.content_type,
          ),
          borderColor: this.chartColors.border,
          borderWidth: 2,
        },
      ],
    };
  }

  // コンテンツタイプに応じた色を返す
  getContentTypeColor(contentType) {
    const colors = {
      政治: "rgba(220, 53, 69, 0.7)",
      経済: "rgba(40, 167, 69, 0.7)",
      社会: "rgba(102, 126, 234, 0.7)",
      文化: "rgba(255, 193, 7, 0.7)",
      テクノロジー: "rgba(23, 162, 184, 0.7)",
      スポーツ: "rgba(108, 117, 125, 0.7)",
      エンタメ: "rgba(214, 51, 132, 0.7)",
      不明: "rgba(153, 102, 255, 0.7)",
    };
    return colors[contentType] || colors["不明"];
  }

  // レーダーチャート作成
  createRadarChart(canvasId, caseData) {
    const ctx = document.getElementById(canvasId);
    if (!ctx) return null;

    // 既存のチャートがあれば破棄
    if (this.radarChart) {
      this.radarChart.destroy();
    }

    const data = this.prepareRadarData(caseData);

    this.radarChart = new Chart(ctx, {
      type: "radar",
      data: data,
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: "top",
          },
          tooltip: {
            callbacks: {
              label: function (context) {
                return (
                  context.dataset.label + ": " + context.parsed.r.toFixed(1)
                );
              },
            },
          },
        },
        scales: {
          r: {
            beginAtZero: true,
            max: 10,
            ticks: {
              stepSize: 2,
            },
          },
        },
      },
    });

    return this.radarChart;
  }

  // マトリクスチャート作成
  createMatrixChart(canvasId, caseData) {
    const ctx = document.getElementById(canvasId);
    if (!ctx) return null;

    // 既存のチャートがあれば破棄
    if (this.matrixChart) {
      this.matrixChart.destroy();
    }

    const data = this.prepareMatrixData(caseData);

    this.matrixChart = new Chart(ctx, {
      type: "bubble",
      data: data,
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: "top",
          },
          tooltip: {
            callbacks: {
              label: function (context) {
                const point = context.raw;
                return [
                  context.dataset.label,
                  "志向性: " + point.x.toFixed(1),
                  "影響力: " + point.y.toFixed(1),
                  "リーチ: " + Math.pow(10, point.r / 10).toFixed(0),
                ];
              },
            },
          },
        },
        scales: {
          x: {
            title: {
              display: true,
              text: "志向性（プロモーション度）",
            },
            min: -10,
            max: 110, // 縦横110に統一（-10から110まで）
            grid: {
              display: false, // グリッドを非表示
            },
            border: {
              display: false, // 枠のボーダーを非表示
            },
            ticks: {
              display: false, // すべての目盛りを非表示
            },
          },
          y: {
            title: {
              display: true,
              text: "熱量/毒性（論争ポテンシャル）",
            },
            min: -10,
            max: 110, // 縦横110に統一（-10から110まで）
            grid: {
              display: false, // グリッドを非表示
            },
            border: {
              display: false, // 枠のボーダーを非表示
            },
            ticks: {
              display: false, // すべての目盛りを非表示
            },
          },
        },
        plugins: {
          legend: {
            position: "top",
          },
          tooltip: {
            callbacks: {
              label: function (context) {
                const point = context.raw;
                return [
                  context.dataset.label,
                  "志向性: " + point.x.toFixed(1),
                  "影響力: " + point.y.toFixed(1),
                  "リーチ: " + Math.pow(10, point.r / 10).toFixed(0),
                ];
              },
            },
          },
          annotation: {
            annotations: {
              lineX: {
                type: "line",
                xMin: 50,
                xMax: 50,
                borderColor: "rgba(0, 0, 0, 0.3)",
                borderWidth: 1,
              },
              lineY: {
                type: "line",
                yMin: 50,
                yMax: 50,
                borderColor: "rgba(0, 0, 0, 0.3)",
                borderWidth: 1,
              },
            },
          },
        },
      },
    });

    return this.matrixChart;
  }

  // チャートを更新
  updateCharts(caseData) {
    if (this.radarChart) {
      const radarData = this.prepareRadarData(caseData);
      this.radarChart.data = radarData;
      this.radarChart.update();
    }

    if (this.matrixChart) {
      const matrixData = this.prepareMatrixData(caseData);
      this.matrixChart.data = matrixData;
      this.matrixChart.update();
    }
  }

  // チャートを破棄
  destroyCharts() {
    if (this.radarChart) {
      this.radarChart.destroy();
      this.radarChart = null;
    }
    if (this.matrixChart) {
      this.matrixChart.destroy();
      this.matrixChart = null;
    }
  }
}

// テスト用：プロモーションスコアのスケーリング動作を確認
function testPromotionScaling() {
  const chartUtils = new ChartUtils();

  console.log("=== 基本的なスケーリングテスト（1/5変換）===");
  const testScores = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
  testScores.forEach((score) => {
    const scaled = chartUtils.calculatePromotionPurityScaled(score);
    console.log(`元の値: ${score} → スケーリング後: ${scaled.toFixed(1)}`);
  });

  console.log("\n=== 実際のケースデータテスト（1/5変換）===");
  const actualScores = [10, 15, 25, 35]; // 実際のサンプルデータ
  actualScores.forEach((score) => {
    const scaled = chartUtils.calculatePromotionPurityScaled(score);
    console.log(
      `ケースデータ: ${score} → スケーリング後: ${scaled.toFixed(1)}`,
    );
  });
}

// グローバルインスタンスを作成
window.chartUtils = new ChartUtils();

// テスト関数をグローバルに公開（開発時のみ使用）
window.testPromotionScaling = testPromotionScaling;
