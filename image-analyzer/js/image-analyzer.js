class ImageAnalyzer {
  constructor() {
    this.model = null;
    this.isAnalyzing = false;
  }

  async initialize() {
    try {
      this.showStatus("MobileNetモデルを読み込み中...", "loading");
      this.model = await mobilenet.load();
      this.showStatus("モデル読み込み完了", "success");
    } catch (error) {
      this.showStatus("モデル読み込みエラー: " + error.message, "error");
    }
  }

  showStatus(message, type = "info") {
    const statusDiv = document.getElementById("status");
    const className =
      type === "error" ? "error" : type === "success" ? "success" : "loading";
    statusDiv.innerHTML = `<div class="${className}">${message}</div>`;
  }

  showImagePreview(url) {
    const previewDiv = document.getElementById("imagePreview");
    previewDiv.innerHTML = `<img id="imagePreview" src="${url}" alt="解析対象画像" />`;
  }

  async analyzeImage(url) {
    if (this.isAnalyzing) {
      this.showStatus("解析中です。お待ちください...", "loading");
      return;
    }

    this.isAnalyzing = true;
    this.showStatus("解析を開始します...", "loading");

    try {
      // 動画URLの検出と変換
      const analysisUrl = await this.processUrl(url);
      const isVideo = analysisUrl !== url;

      this.showImagePreview(analysisUrl);

      // 画像の読み込みと検証
      const img = await this.loadImage(analysisUrl);

      // 並列解析実行
      const [ocrResult, visionResult, pixelResult] = await Promise.all([
        this.performOCR(img),
        this.performVisionAnalysis(img),
        this.performPixelAnalysis(img),
      ]);

      // 結果の表示
      this.displayResults(ocrResult, visionResult, pixelResult, url, isVideo);

      this.showStatus("解析完了", "success");
    } catch (error) {
      this.showStatus("解析エラー: " + error.message, "error");
    } finally {
      this.isAnalyzing = false;
    }
  }

  async loadImage(url) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("画像の読み込みに失敗しました"));
      img.src = url;
    });
  }

  async performOCR(img) {
    try {
      this.showStatus("OCR解析中...", "loading");

      const result = await Tesseract.recognize(img, "jpn+eng", {
        logger: (m) => console.log(m),
      });

      return {
        text: result.data.text.trim(),
        confidence: result.data.confidence,
        words: result.data.words.map((word) => ({
          text: word.text,
          confidence: word.confidence,
          bbox: word.bbox,
        })),
      };
    } catch (error) {
      return {
        error: "OCR解析エラー: " + error.message,
        text: "",
        confidence: 0,
        words: [],
      };
    }
  }

  async performVisionAnalysis(img) {
    try {
      this.showStatus("画像認識中...", "loading");

      if (!this.model) {
        throw new Error("モデルが読み込まれていません");
      }

      const predictions = await this.model.classify(img);

      return {
        predictions: predictions.map((p) => ({
          className: p.className,
          probability: p.probability,
        })),
        topPrediction: predictions[0],
      };
    } catch (error) {
      return {
        error: "画像認識エラー: " + error.message,
        predictions: [],
        topPrediction: null,
      };
    }
  }

  async performPixelAnalysis(img) {
    try {
      this.showStatus("ピクセル解析中...", "loading");

      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const pixels = imageData.data;

      // 色彩分析
      const colorAnalysis = this.analyzeColors(pixels);

      // 明度・コントラスト分析
      const brightnessContrast = this.analyzeBrightnessContrast(pixels);

      return {
        dimensions: {
          width: img.width,
          height: img.height,
          aspectRatio: (img.width / img.height).toFixed(2),
        },
        colorAnalysis,
        brightnessContrast,
        fileSize: this.estimateFileSize(img.src),
      };
    } catch (error) {
      return {
        error: "ピクセル解析エラー: " + error.message,
        dimensions: null,
        colorAnalysis: null,
        brightnessContrast: null,
      };
    }
  }

  analyzeColors(pixels) {
    const colorMap = {};
    let totalR = 0,
      totalG = 0,
      totalB = 0;
    let pixelCount = 0;

    for (let i = 0; i < pixels.length; i += 4) {
      const r = pixels[i];
      const g = pixels[i + 1];
      const b = pixels[i + 2];
      const a = pixels[i + 3];

      if (a > 0) {
        // 透明ピクセルを除外
        const colorKey = `${Math.floor(r / 32) * 32},${Math.floor(g / 32) * 32},${Math.floor(b / 32) * 32}`;
        colorMap[colorKey] = (colorMap[colorKey] || 0) + 1;

        totalR += r;
        totalG += g;
        totalB += b;
        pixelCount++;
      }
    }

    // 主要色の抽出
    const sortedColors = Object.entries(colorMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([color, count]) => {
        const [r, g, b] = color.split(",").map(Number);
        return {
          rgb: `rgb(${r},${g},${b})`,
          count,
          percentage: ((count / pixelCount) * 100).toFixed(1),
        };
      });

    return {
      dominantColors: sortedColors,
      averageColor: {
        r: Math.floor(totalR / pixelCount),
        g: Math.floor(totalG / pixelCount),
        b: Math.floor(totalB / pixelCount),
      },
      totalPixels: pixelCount,
    };
  }

  analyzeBrightnessContrast(pixels) {
    let brightness = 0;
    let minBrightness = 255;
    let maxBrightness = 0;

    for (let i = 0; i < pixels.length; i += 4) {
      const r = pixels[i];
      const g = pixels[i + 1];
      const b = pixels[i + 2];
      const a = pixels[i + 3];

      if (a > 0) {
        const pixelBrightness = (r + g + b) / 3;
        brightness += pixelBrightness;
        minBrightness = Math.min(minBrightness, pixelBrightness);
        maxBrightness = Math.max(maxBrightness, pixelBrightness);
      }
    }

    const avgBrightness = brightness / (pixels.length / 4);
    const contrast = maxBrightness - minBrightness;

    return {
      averageBrightness: Math.round(avgBrightness),
      minBrightness,
      maxBrightness,
      contrast: Math.round(contrast),
      brightnessLevel:
        avgBrightness > 180 ? "明るい" : avgBrightness > 100 ? "普通" : "暗い",
      contrastLevel:
        contrast > 150
          ? "高コントラスト"
          : contrast > 80
            ? "普通"
            : "低コントラスト",
    };
  }

  estimateFileSize(url) {
    try {
      const urlWithoutParams = url.split("?")[0];
      const extension = urlWithoutParams.split(".").pop().toLowerCase();

      // 簡易的なファイルサイズ推定（実際はサーバーから取得が必要）
      const sizeMap = {
        jpg: "50KB-500KB",
        jpeg: "50KB-500KB",
        png: "100KB-1MB",
        gif: "50KB-2MB",
        webp: "30KB-300KB",
      };

      return sizeMap[extension] || "不明";
    } catch {
      return "不明";
    }
  }

  displayResults(ocrResult, visionResult, pixelResult, url, isVideo = false) {
    document.getElementById("results").style.display = "grid";

    // OCR結果
    const ocrDiv = document.getElementById("ocrResult");
    if (ocrResult.error) {
      ocrDiv.innerHTML = `<div class="error">${ocrResult.error}</div>`;
    } else {
      ocrDiv.innerHTML = `
                <p><strong>抽出テキスト:</strong></p>
                <p>${ocrResult.text || "テキストが検出されませんでした"}</p>
                <p><strong>信頼度:</strong> ${ocrResult.confidence.toFixed(1)}%</p>
                ${ocrResult.words.length > 0 ? `<p><strong>単語数:</strong> ${ocrResult.words.length}</p>` : ""}
            `;
    }

    // 画像認識結果
    const visionDiv = document.getElementById("visionResult");
    if (visionResult.error) {
      visionDiv.innerHTML = `<div class="error">${visionResult.error}</div>`;
    } else {
      const predictionsHtml = visionResult.predictions
        .slice(0, 5)
        .map(
          (p) =>
            `<li>${p.className}: ${(p.probability * 100).toFixed(1)}%</li>`,
        )
        .join("");

      visionDiv.innerHTML = `
                <p><strong>最も可能性の高い物体:</strong> ${visionResult.topPrediction.className}</p>
                <p><strong>確信度:</strong> ${(visionResult.topPrediction.probability * 100).toFixed(1)}%</p>
                <p><strong>上位5件の予測:</strong></p>
                <ul>${predictionsHtml}</ul>
            `;
    }

    // ピクセル解析結果
    const pixelDiv = document.getElementById("pixelResult");
    if (pixelResult.error) {
      pixelDiv.innerHTML = `<div class="error">${pixelResult.error}</div>`;
    } else {
      const colorsHtml = pixelResult.colorAnalysis.dominantColors
        .map(
          (c) =>
            `<div style="background: ${c.rgb}; width: 20px; height: 20px; display: inline-block; margin: 2px;" title="${c.percentage}%"></div>`,
        )
        .join("");

      pixelDiv.innerHTML = `
                <p><strong>画像サイズ:</strong> ${pixelResult.dimensions.width} × ${pixelResult.dimensions.height} (アスペクト比: ${pixelResult.dimensions.aspectRatio})</p>
                <p><strong>推定ファイルサイズ:</strong> ${pixelResult.fileSize}</p>
                <p><strong>明るさ:</strong> ${pixelResult.brightnessContrast.brightnessLevel} (平均: ${pixelResult.brightnessContrast.averageBrightness})</p>
                <p><strong>コントラスト:</strong> ${pixelResult.brightnessContrast.contrastLevel}</p>
                <p><strong>主要色:</strong> ${colorsHtml}</p>
            `;
    }

    // 総合分析結果
    const summary = {
        imageUrl: url,
        timestamp: new Date().toISOString(),
        contentType: isVideo ? 'video_thumbnail' : 'image',
        analysis: {
            ocr: ocrResult.error ? null : {
                hasText: ocrResult.text.length > 0,
                textLength: ocrResult.text.length,
                confidence: ocrResult.confidence
            },
            vision: visionResult.error ? null : {
                topObject: visionResult.topPrediction.className,
                confidence: visionResult.topPrediction.probability
            },
            pixel: pixelResult.error ? null : {
                dimensions: pixelResult.dimensions,
                brightness: pixelResult.brightnessContrast.brightnessLevel,
                contrast: pixelResult.brightnessContrast.contrastLevel,
                dominantColors: pixelResult.colorAnalysis.dominantColors.length,
            },
        },
    };

    document.getElementById("summaryResult").textContent = JSON.stringify(summary, null, 2);
}

async processUrl(url) {
    // 動画URLの検出
    if (this.isVideoUrl(url)) {
        this.showStatus('動画を検出しました。サムネイルを抽出します...', 'loading');
        const thumbnailUrl = await this.extractThumbnailUrl(url);
        if (thumbnailUrl) {
            return thumbnailUrl;
        }
    }
    return url;
}

isVideoUrl(url) {
    const videoPatterns = [
        '/video/',
        '/tweet_video/',
        '/ext_tw_video/',
        'amplify_video/',
        'video.twimg.com',
        'pbs.twimg.com/ext_tw_video'
    ];
    return videoPatterns.some(pattern => url.includes(pattern));
}

async extractThumbnailUrl(videoUrl) {
    try {
        // Xの動画URLからサムネイルURLを抽出
        if (videoUrl.includes('video.twimg.com')) {
            // video.twimg.comの場合は既にサムネイルURLの場合がある
            return videoUrl;
        }

        // 標準的なX動画URLの変換
        if (videoUrl.includes('/status/')) {
            const statusId = this.extractStatusId(videoUrl);
            if (statusId) {
                // ここでは簡易的にサムネイルURLを生成
                // 実際にはAPI叩く必要があるが、BOT対策のため静的推定
                return this.generateThumbnailUrl(statusId);
            }
        }

        // その他の動画URLパターン
        if (videoUrl.includes('ext_tw_video')) {
            return videoUrl.replace('/ext_tw_video/', '/ext_tw_video_thumb/').replace('.mp4', '.jpg');
        }

        return null;
    } catch (error) {
        console.error('サムネイル抽出エラー:', error);
        return null;
    }
}

extractStatusId(url) {
    const match = url.match(/status\/(\d+)/);
    return match ? match[1] : null;
}

generateThumbnailUrl(statusId) {
    // XのサムネイルURLパターン（推定）
    // 実際には動的に取得が必要だが、BOT対策のため静的推定
    return `https://pbs.twimg.com/ext_tw_video_thumb/${statusId}/pu/img/${statusId}-1.jpg`;
}

clearResults() {
    document.getElementById('results').style.display = 'none';
    document.getElementById('status').innerHTML = '';
    document.getElementById('imagePreview').innerHTML = '';
    document.getElementById('imageUrl').value = '';
}

// グローバル関数
let analyzer;

async function analyzeImage() {
  const url = document.getElementById("imageUrl").value.trim();
  if (!url) {
      analyzer.showStatus("画像URLを入力してください", "error");
      return;
  }

  await analyzer.analyzeImage(url);
}

function clearResults() {
  analyzer.clearResults();
}

// 初期化
window.addEventListener('DOMContentLoaded', async () => {
  analyzer = new ImageAnalyzer();
  await analyzer.initialize();
});
