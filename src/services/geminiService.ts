import type {
  AppSettings,
  CoachingFeedback,
  ConcreteCategory,
  GroundingSource,
  MaterialPreference,
  PracticeMode,
  SpeechAttempt,
  TopicCategory,
  TopicItem,
} from '../types';
import { CURATED_TOPICS } from '../data/curatedTopics';
import { stripFurigana } from '../utils/furigana';

const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';

const CATEGORY_JA: Record<ConcreteCategory, string> = {
  daily: '日常生活',
  culture: '文化',
  work: '仕事',
  society: '社会問題',
};

function extractJsonObject(rawText: string): any {
  const trimmed = rawText.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1].trim() : trimmed;

  try {
    return JSON.parse(candidate);
  } catch {
    const start = candidate.indexOf('{');
    const end = candidate.lastIndexOf('}');
    if (start !== -1 && end > start) {
      return JSON.parse(candidate.slice(start, end + 1));
    }
    throw new Error('AIからの応答をJSONとして解析できませんでした。もう一度お試しください。');
  }
}

function extractGroundingSources(data: any): GroundingSource[] {
  const chunks = data?.candidates?.[0]?.groundingMetadata?.groundingChunks;
  if (!Array.isArray(chunks)) return [];
  const seen = new Set<string>();
  const results: GroundingSource[] = [];
  for (const chunk of chunks) {
    const uri = chunk?.web?.uri;
    const title = chunk?.web?.title || uri;
    if (uri && !seen.has(uri)) {
      seen.add(uri);
      results.push({ title, uri });
    }
  }
  return results.slice(0, 5);
}

async function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      const base64 = result.split(',')[1];
      resolve(base64 || '');
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

async function callGemini(
  apiKey: string,
  model: string,
  payload: Record<string, any>,
  allowSearchFallback = true
): Promise<any> {
  const url = `${GEMINI_BASE}/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey.trim())}`;

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    // If Google Search grounding caused a 400 on an unsupported model, retry once without tools
    if (allowSearchFallback && payload.tools && res.status === 400) {
      const { tools: _unused, ...withoutTools } = payload;
      return callGemini(apiKey, model, withoutTools, false);
    }
    let detail = `HTTP ${res.status}`;
    try {
      const errJson = await res.json();
      detail = errJson?.error?.message || detail;
    } catch {
      // ignore
    }
    throw new Error(`Gemini APIエラー: ${detail}`);
  }

  return res.json();
}

export async function testGeminiConnection(
  apiKey: string,
  model: string
): Promise<{ ok: boolean; message: string }> {
  if (!apiKey.trim()) {
    return { ok: false, message: 'APIキーを入力してください。' };
  }
  try {
    const data = await callGemini(
      apiKey,
      model,
      {
        contents: [
          {
            role: 'user',
            parts: [{ text: '「接続OK」とだけ短く返答してください。' }],
          },
        ],
        generationConfig: { maxOutputTokens: 32 },
      },
      false
    );
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    return {
      ok: true,
      message: `接続に成功しました（モデル: ${model} / 応答: ${text.trim() || 'OK'}）`,
    };
  } catch (err: any) {
    return {
      ok: false,
      message: err?.message || '接続テストに失敗しました。',
    };
  }
}

async function tryGenerateImageWithGemini(
  apiKey: string,
  imagePrompt: string
): Promise<string | undefined> {
  const imageModels = ['gemini-2.5-flash-image', 'gemini-2.0-flash-exp-image-generation'];
  for (const model of imageModels) {
    try {
      const url = `${GEMINI_BASE}/${model}:generateContent?key=${encodeURIComponent(apiKey.trim())}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: imagePrompt }] }],
          generationConfig: { responseModalities: ['IMAGE', 'TEXT'] },
        }),
      });
      if (!res.ok) continue;
      const data = await res.json();
      const parts = data?.candidates?.[0]?.content?.parts || [];
      const imgPart = parts.find((p: any) => p?.inlineData?.data);
      if (imgPart?.inlineData?.data) {
        const mime = imgPart.inlineData.mimeType || 'image/png';
        return `data:${mime};base64,${imgPart.inlineData.data}`;
      }
    } catch {
      // Try next image model or fallback cleanly
    }
  }
  return undefined;
}

export async function generateTopicWithGemini(
  settings: AppSettings,
  category: TopicCategory,
  materialPref: MaterialPreference,
  mode: PracticeMode,
  previousTopicIds: string[]
): Promise<TopicItem> {
  const categories: ConcreteCategory[] = ['daily', 'culture', 'work', 'society'];
  const chosenCategory: ConcreteCategory =
    category === 'all'
      ? categories[Math.floor(Math.random() * categories.length)]
      : category;

  const chosenMaterial: 'photo' | 'chart' =
    materialPref === 'auto'
      ? Math.random() < 0.55
        ? 'photo'
        : 'chart'
      : materialPref;

  const furiganaRule =
    '日本語のテキストには、N3学習者が読みやすいように漢字の直後に角括弧でふりがなを付けてください（例：日本語[にほんご]の練習[れんしゅう]、社会問題[しゃかいもんだい]）。ひらがな・カタカナには付けないでください。';

  const prompt = `あなたは日本語スピーキング練習のコーチです。
学習者のレベル: ${mode === 'guided' ? 'JLPT N3（日常的に話す練習がしたい）' : '日本語中上級'}
カテゴリ: ${CATEGORY_JA[chosenCategory]}
希望する材料タイプ: ${chosenMaterial === 'chart' ? '信頼できる統計データの簡単なグラフ' : '場面写真'}

【絶対ルール】
1. 模範解答・意見の例・話す内容の具体例は絶対に書かないでください。
2. guidedSteps は「自分で考えて話すための短い質問（3つ）」だけにしてください（例：1.見えること/データを読む 2.感想・経験 3.自分の意見）。答えのヒントや意見の例は禁止です。
3. ${furiganaRule}
${
  chosenMaterial === 'chart'
    ? '4. Web検索を使って実在する信頼できる統計データ（日本または世界の公的機関・調査機関）を調べ、4〜6項目のシンプルな棒グラフデータを作成してください。数値は必ず数値型にしてください。'
    : '4. 場面写真の場合、思考を促すリアルな日本の日常・文化・仕事・社会の場面を描写する英語の imagePrompt を作成してください（写真に文字を入れない指示を含む）。'
}

以下のJSONのみを \`\`\`json ... \`\`\` で出力してください。
{
  "title": "テーマのタイトル（ふりがな付き）",
  "materialType": "${chosenMaterial}",
  "imageCaption": "写真の短い状況説明（写真の場合、ふりがな付き、意見は書かない）",
  "imagePrompt": "Realistic editorial photography in Japan... no text overlay（写真の場合のみ）",
  "chart": {
    "title": "グラフタイトル（ふりがな付き）",
    "subtitle": "単位：％ など（ふりがな付き）",
    "unit": "%",
    "chartType": "bar または horizontalBar",
    "items": [
      { "label": "項目名", "value": 45.2, "highlight": false }
    ],
    "sourceName": "出典機関名（ふりがな付き）",
    "year": "2024年など"
  },
  "promptInstruction": "写真／グラフを見て気づいたことや自分の意見を30〜60秒で話すよう促す短い指示（ふりがな付き）",
  "guidedSteps": [
    { "id": "step-1", "stageLabel": "1. 見[み]えること", "question": "質問1（ふりがな付き）", "placeholder": "短いメモ欄のプレースホルダー" },
    { "id": "step-2", "stageLabel": "2. 感想[かんそう]・経験[けいけん]", "question": "質問2（ふりがな付き）", "placeholder": "短いメモ欄のプレースホルダー" },
    { "id": "step-3", "stageLabel": "3. 自分[じぶん]の意見[いけん]", "question": "質問3（ふりがな付き）", "placeholder": "短いメモ欄のプレースホルダー" }
  ]
}`;

  const payload: Record<string, any> = {
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: { temperature: 0.85 },
  };

  if (settings.enableSearchGrounding && chosenMaterial === 'chart') {
    payload.tools = [{ google_search: {} }];
  }

  const data = await callGemini(settings.apiKey, settings.model, payload);
  const rawText = data?.candidates?.[0]?.content?.parts
    ?.map((p: any) => p.text || '')
    .join('\n') || '';
  const parsed = extractJsonObject(rawText);
  const groundingSources = extractGroundingSources(data);

  let imageUrl: string | undefined;
  let finalMaterialType: 'photo' | 'chart' = parsed.materialType === 'chart' ? 'chart' : 'photo';

  if (finalMaterialType === 'photo') {
    if (settings.enableAiPhotoGen && parsed.imagePrompt) {
      imageUrl = await tryGenerateImageWithGemini(settings.apiKey, parsed.imagePrompt);
    }
    if (!imageUrl) {
      // Fallback gracefully to a curated high-res Japanese photograph from matching category
      const fallbackPool = CURATED_TOPICS.filter(
        (t) => t.materialType === 'photo' && t.category === chosenCategory
      );
      const anyPhotoPool = CURATED_TOPICS.filter(
        (t) => t.materialType === 'photo' && !previousTopicIds.includes(t.id)
      );
      const picked =
        fallbackPool[0] || anyPhotoPool[0] || CURATED_TOPICS[0];
      return {
        ...picked,
        id: `ai-curated-fallback-${Date.now()}`,
        isAiGenerated: false,
      };
    }
  }

  return {
    id: `ai-topic-${Date.now()}`,
    category: chosenCategory,
    title: parsed.title || '新[あたら]しいスピーキングテーマ',
    materialType: finalMaterialType,
    imageUrl,
    imageAlt: stripFurigana(parsed.imageCaption || parsed.title || 'スピーキングお題写真'),
    imageCaption: parsed.imageCaption,
    chart: finalMaterialType === 'chart' ? parsed.chart : undefined,
    promptInstruction:
      parsed.promptInstruction ||
      '材料[ざいりょう]を見[み]て気[き]づいたことや自分[じぶん]の意見[いけん]を30〜60秒[びょう]で話[はな]してください。',
    guidedSteps:
      Array.isArray(parsed.guidedSteps) && parsed.guidedSteps.length === 3
        ? parsed.guidedSteps
        : CURATED_TOPICS[0].guidedSteps,
    groundingSources,
    isAiGenerated: true,
  };
}

interface EvaluateParams {
  settings: AppSettings;
  topic: TopicItem;
  mode: PracticeMode;
  round: 1 | 2;
  audioBlob: Blob | null;
  liveTranscript: string;
  durationSec: number;
  previousAttempt?: SpeechAttempt;
}

export async function evaluateSpeechWithGemini(
  params: EvaluateParams
): Promise<CoachingFeedback> {
  const { settings, topic, mode, round, audioBlob, liveTranscript, durationSec, previousAttempt } =
    params;

  const topicSummary =
    topic.materialType === 'chart' && topic.chart
      ? `統計グラフ「${stripFurigana(topic.chart.title)}」(${topic.chart.items
          .map((i) => `${i.label}:${i.value}${topic.chart?.unit || ''}`)
          .join(', ')})`
      : `写真「${stripFurigana(topic.imageCaption || topic.title)}」`;

  const round2Context =
    round === 2 && previousAttempt
      ? `\n【これは2回目の挑戦（リトライ）です】\n1回目の発言: 「${stripFurigana(
          previousAttempt.feedback.transcript
        )}」\n1回目で伝えた改善ポイント: ${previousAttempt.feedback.retryFocusPoints
          .map(stripFurigana)
          .join(' / ')}\n必ず「1回目からどこが成長したか」を round2Comparison で具体的に褒めて比較してください。\n`
      : '';

  const instructionPrompt = `あなたは親切で的確な日本語スピーキング練習のコーチです。
学習者プロフィール: ${
    mode === 'guided'
      ? '現在JLPT N3程度。普段の会話・スピーキング力を伸ばしたい学習者。フィードバックは分かりやすい日本語で、励ましつつ具体的に伝えてください。'
      : '日本語中上級学習者。論理的で自然な日本語スピーチを目指しています。'
  }
テーマ: ${stripFurigana(topic.title)}
材料: ${topicSummary}
録音時間: 約${durationSec}秒（目標：30〜60秒）
${liveTranscript.trim() ? `ブラウザの補助文字起こし（参考）: ${liveTranscript.trim()}` : ''}
${round2Context}

【絶対に守るルール】
1. 音声が添付されている場合、必ず音声そのものを丁寧に聞き取り、そのまま transcript に書き起こしてください。
2. 学習者の発言をすべて書き換えることは絶対にしないでください。「良かった点」と「改善すべき点」を具体的に分けて伝えてください。
3. 以下の4つの観点から必ずフィードバックしてください：
   - 内容の構成（話の流れが論理的で、わかりやすいか）
   - 文法（文法的な間違いがないか）
   - 語彙（適切な単語を使えているか）
   - 自然な表現（日本人が普段使う自然な言い方になっているか）
4. 事実に関する発言があれば必要に応じてWeb検索で確認し、「確認できた事実（verified）」「確認が必要（needs_check）」「学習者の意見・感想（opinion）」を明確に区別して factChecks にまとめてください。
5. すべての日本語テキスト（transcript を除く）には、N3学習者が読めるよう漢字の直後に角括弧でふりがなを付けてください（例：内容[ないよう]の構成[こうせい]、自然[しぜん]な表現[ひょうげん]）。
6. 1回目の場合、retryFocusPoints に「2回目で意識すると良いポイント（2〜3個、文章の丸暗記や模範解答は禁止）」を短くまとめ、retryPrompt で「改善点を意識してもう一度30〜60秒話してみましょう」と優しく促してください。

以下のJSONのみを \`\`\`json ... \`\`\` で出力してください。
{
  "transcript": "聞き取った学習者の日本語発言そのまま",
  "overallComment": "全体的な励ましと要約コメント（ふりがな付き）",
  "criteria": [
    {
      "key": "structure",
      "label": "内容[ないよう]の構成[こうせい]",
      "score": 4,
      "goodPoints": ["良かった点1（ふりがな付き）"],
      "improvePoints": ["改善すべき点1（ふりがな付き）"],
      "naturalTip": "構成をつなぐ短い表現のヒント（任意・1文のみ・ふりがな付き）"
    },
    {
      "key": "grammar",
      "label": "文法[ぶんぽう]",
      "score": 4,
      "goodPoints": ["良かった点（ふりがな付き）"],
      "improvePoints": ["改善すべき点（ふりがな付き）"]
    },
    {
      "key": "vocabulary",
      "label": "語彙[ごい]",
      "score": 3,
      "goodPoints": ["良かった点（ふりがな付き）"],
      "improvePoints": ["改善すべき点（ふりがな付き）"]
    },
    {
      "key": "naturalness",
      "label": "自然[しぜん]な表現[ひょうげん]",
      "score": 4,
      "goodPoints": ["良かった点（ふりがな付き）"],
      "improvePoints": ["改善すべき点（ふりがな付き）"],
      "naturalTip": "日本人が普段使う自然な言い回しの短いフレーズ例（1フレーズのみ・ふりがな付き）"
    }
  ],
  "factChecks": [
    {
      "claim": "発言中の事実または意見の抜粋（ふりがな付き）",
      "status": "verified または opinion または needs_check",
      "note": "事実確認の結果、または意見であることの説明（ふりがな付き）"
    }
  ],
  "retryFocusPoints": [
    "2回目で意識するポイント1（ふりがな付き）",
    "2回目で意識するポイント2（ふりがな付き）"
  ],
  "retryPrompt": "改善点[かいぜんてん]を意識[いしき]して、もう一[いち]度[ど]同[おな]じテーマで30〜60秒[びょう]話[はな]してみましょう！",
  "round2Comparison": "2回目の場合のみ：1回目と比べて良くなった具体的なポイント（ふりがな付き）"
}`;

  const parts: any[] = [{ text: instructionPrompt }];

  if (audioBlob && audioBlob.size > 0) {
    const base64Audio = await blobToBase64(audioBlob);
    const cleanMime = (audioBlob.type || 'audio/webm').split(';')[0];
    parts.push({
      inlineData: {
        mimeType: cleanMime,
        data: base64Audio,
      },
    });
  }

  const payload: Record<string, any> = {
    contents: [{ role: 'user', parts }],
    generationConfig: { temperature: 0.4 },
  };

  if (settings.enableSearchGrounding) {
    payload.tools = [{ google_search: {} }];
  }

  const data = await callGemini(settings.apiKey, settings.model, payload);
  const rawText =
    data?.candidates?.[0]?.content?.parts?.map((p: any) => p.text || '').join('\n') || '';
  const parsed = extractJsonObject(rawText);
  const groundingSources = extractGroundingSources(data);

  return {
    transcript: parsed.transcript || liveTranscript || '（音声から内容を解析しました）',
    overallComment:
      parsed.overallComment || '自分[じぶん]の言葉[ことば]でしっかり考[かんが]えて話[はな]せましたね！',
    criteria: Array.isArray(parsed.criteria) ? parsed.criteria : [],
    factChecks: Array.isArray(parsed.factChecks) ? parsed.factChecks : [],
    retryFocusPoints: Array.isArray(parsed.retryFocusPoints) ? parsed.retryFocusPoints : [],
    retryPrompt:
      parsed.retryPrompt ||
      '改善点[かいぜんてん]を意識[いしき]して、もう一[いち]度[ど]同[おな]じテーマで30〜60秒[びょう]話[はな]してみましょう！',
    round2Comparison: parsed.round2Comparison,
    groundingSources,
    isDemo: false,
  };
}

/**
 * Local Demo Coach for trying the complete experience before adding a Gemini API key.
 * Analyzes actual duration, discourse connectors, opinion markers, and Round 1 -> Round 2 progress.
 */
export function evaluateSpeechDemo(params: Omit<EvaluateParams, 'settings'>): CoachingFeedback {
  const { topic, round, liveTranscript, durationSec, previousAttempt } = params;
  const text = liveTranscript.trim();
  const charCount = text.length;

  const hasConnector = /(まず|最初|次|それから|だから|なので|しかし|でも|最後|まとめ|理由)/.test(
    text
  );
  const hasOpinion = /(と思|と考|大切|いいと思|必要|べき|ほしい)/.test(text);
  const hasFactNumber = /(\d+|日本|最近|多く|増え|減っ|割合|データ|グラフ)/.test(text);
  const inTargetTime = durationSec >= 30 && durationSec <= 60;

  const structureScore = Math.min(5, (hasConnector ? 4 : 3) + (inTargetTime ? 1 : 0));
  const grammarScore = charCount >= 40 ? 4 : 3;
  const vocabScore = charCount >= 70 ? 4 : 3;
  const naturalScore = hasOpinion ? 4 : 3;

  const retryFocusPoints: string[] = [];
  if (!inTargetTime && durationSec < 30) {
    retryFocusPoints.push('理由[りゆう]や自分[じぶん]の経験[けいけん]をもう1文[ぶん]足[た]して、30秒以上[びょういじょう]を目指[めざ]す');
  } else if (durationSec > 60) {
    retryFocusPoints.push('言[い]いたい結論[けつろん]を1つに絞[しぼ]って、60秒以内[びょういない]にすっきりまとめる');
  } else {
    retryFocusPoints.push('30〜60秒[びょう]の良[よ]いペースを保[たも]ちながら、接続詞[せつぞくし]で流[なが]れをはっきりさせる');
  }

  if (!hasConnector) {
    retryFocusPoints.push('「まず〜」「それに〜」「最後[さいご]に〜」などのつなぎ言葉[ことば]を1つ入[い]れてみる');
  } else {
    retryFocusPoints.push('具体例[ぐたいれい]（自分[じぶん]の体験[たいけん]や身近[みぢか]な話[はなし]）をもう少[すこ]し詳[くわ]しく言[い]ってみる');
  }

  if (!hasOpinion) {
    retryFocusPoints.push('最後[さいご]に「私[わたし]は〜と思[おも]います」と自分[じぶん]の意見[いけん]で締[し]める');
  }

  const factChecks: CoachingFeedback['factChecks'] = [];
  if (hasFactNumber) {
    factChecks.push({
      claim: 'グラフ・状況[じょうきょう]や数値[すうち]に触[ふ]れた発言[はつげん]',
      status: 'needs_check',
      note: 'デモモードのためWeb検索[けんさく]は省略[しょうりゃく]しています。Gemini APIキーを設定[せってい]すると、事実[じじつ]の正[ただ]しさを自動[じどう]でWeb確認[かくにん]します。',
    });
  }
  factChecks.push({
    claim: text
      ? `「${text.slice(0, 34)}${text.length > 34 ? '…' : ''}」の感想[かんそう]・考[かんが]え`
      : 'テーマに対[たい]する感想[かんそう]・意見[いけん]',
    status: 'opinion',
    note: 'こちらは学習者[がくしゅうしゃ]自身[じしん]の意見[いけん]・感想[かんそう]として整理[せいり]されています。事実[じじつ]と自分[じぶん]の考[かんが]えを分[わ]けて話[はな]すと説得力[せっとくりょく]が上[あ]がります。',
  });

  const prevLen = previousAttempt?.liveTranscript?.trim().length || 0;
  const round2Comparison =
    round === 2
      ? `1回目[かいめ]（${previousAttempt?.durationSec ?? 0}秒[びょう]）から2回目[かいめ]（${durationSec}秒[びょう]）へ挑戦[ちょうせん]できました！${
          charCount > prevLen
            ? '情報量[じょうほうりょう]が増[ふ]え、より具体的[ぐたいてき]に自分[じぶん]の意見[いけん]を伝[つた]えようとする姿勢[しせい]が素晴[すば]らしいです。'
            : 'ポイントを意識[いしき]してもう一度[いちど]言葉[ことば]を整理[せいり]し直[なお]せたのが大[おお]きな前進[ぜんしん]です。'
        }（Gemini APIキーを設定[せってい]すると、実際[じっさい]の音声[おんせい]を聞[き]いて発音[はつおん]や細[こま]かい文法[ぶんぽう]の変化[へんか]まで比較[ひかく]できます）`
      : undefined;

  const pacePraise =
    durationSec < 15
      ? `まず自分[じぶん]の言葉[ことば]で話[はな]し出[だ]せましたね（今回[こんかい]は${durationSec}秒[びょう]でした。本番[ほんばん]では30〜60秒[びょう]を目指[めざ]してもう少[すこ]し広[ひろ]げてみましょう）！`
      : `自分[じぶん]の頭[あたま]で考[かんが]えて${durationSec}秒[びょう]しっかり話[はな]せましたね！`;

  return {
    transcript:
      text ||
      `（デモモード：${durationSec}秒[びょう]の音声[おんせい]を受[う]け取[と]りました。APIキーを設定[せってい]すると音声[おんせい]をそのまま文字起[もじお]こし・分析[ぶんせき]します）`,
    overallComment: `テーマ「${topic.title}」について、${pacePraise}※現在[げんざい]はデモモードの簡易[かんい]フィードバックです。右上[みぎうえ]の「API設定[せってい]」からGemini APIキーを入[い]れると、音声[おんせい]そのものを聞[き]いた本格的[ほんかくてき]な添削[てんさく]＋Web事実確認[じじつかくにん]が使[つか]えます。`,
    criteria: [
      {
        key: 'structure',
        label: '内容[ないよう]の構成[こうせい]',
        score: structureScore,
        goodPoints: [
          inTargetTime
            ? `目標[もくひょう]の30〜60秒[びょう]（今回[こんかい]${durationSec}秒[びょう]）にぴったり収[おさ]まっていて、聞[き]きやすい長[なが]さでした。`
            : `自分[じぶん]の視点[してん]から話[はな]し始[はじ]められていて、テーマに沿[そ]った内容[ないよう]になっていました。`,
          hasConnector
            ? '話[はなし]をつなぐ言葉[ことば]が使[つか]えており、流[なが]れが追[お]いやすい構成[こうせい]でした。'
            : '見[み]たことから自分[じぶん]の考[かんが]えへつなげようとする意図[いと]が伝[つた]わりました。',
        ],
        improvePoints: [
          !inTargetTime
            ? durationSec < 30
              ? `今回[こんかい]は${durationSec}秒[びょう]と少[すこ]し短[みじか]めでした。「見[み]えたこと→理由[りゆう]→自分[じぶん]の意見[いけん]」の3ステップで30秒以上[びょういじょう]を目指[めざ]しましょう。`
              : `今回[こんかい]は${durationSec}秒[びょう]でした。60秒以内[びょういない]に収[おさ]まるよう、一番[いちばん]伝[つた]えたい点[てん]を1つに絞[しぼ]るとさらにクリアになります。`
            : '「理由[りゆう]は2つあります」のように先[さき]に枠組[わくぐ]みを言[い]うと、さらに論理的[ろんりてき]に聞[き]こえます。',
        ],
        naturalTip: 'まず気[き]づいたのは〜ことです。それを見[み]て私[わたし]は〜と感[かん]じました。',
      },
      {
        key: 'grammar',
        label: '文法[ぶんぽう]',
        score: grammarScore,
        goodPoints: [
          '基本[きほん]の文型[ぶんけい]を使[つか]って、意味[いみ]がしっかり通[つう]じる日本語[にほんご]で話[はな]せています。',
        ],
        improvePoints: [
          '原因[げんいん]や理由[りゆう]を言[い]うときに「〜から」だけでなく、N3の「〜ので」「〜ため」「〜おかげで」を使[つか]い分[わ]けると表現[ひょうげん]の幅[はば]が広[ひろ]がります。',
        ],
      },
      {
        key: 'vocabulary',
        label: '語彙[ごい]',
        score: vocabScore,
        goodPoints: [
          '身近[みぢか]で分[わ]かりやすい単語[たんご]を選[えら]んで、自分[じぶん]の気持[きも]ちを表現[ひょうげん]できています。',
        ],
        improvePoints: [
          '「いい」「すごい」などの言葉[ことば]を、「便利[べんり]だ」「落[お]ち着[つ]く」「もったいない」など少[すこ]し具体的[ぐたいてき]な言葉[ことば]に置[お]き換[か]えてみましょう。',
        ],
      },
      {
        key: 'naturalness',
        label: '自然[しぜん]な表現[ひょうげん]',
        score: naturalScore,
        goodPoints: [
          hasOpinion
            ? '自分[じぶん]の意見[いけん]を丁寧[ていねい]に伝[つた]えようとする自然[しぜん]なトーンが出ています。'
            : '焦[あせ]らず自分[じぶん]のペースで話[はな]そうとしている点[てん]が好印象[こういんしょう]です。',
        ],
        improvePoints: [
          '文末[ぶんまつ]が同[おな]じ形[かたち]（〜です。〜ます。）ばかりにならないよう、「〜と思[おも]います」「〜のではないでしょうか」などを混[ま]ぜるとより自然[しぜん]です。',
        ],
        naturalTip: 'たしかに便利[べんり]ですが、〜ことも大切[たいせつ]だと思[おも]います。',
      },
    ],
    factChecks,
    retryFocusPoints,
    retryPrompt:
      '改善点[かいぜんてん]を1〜2個[こ]だけ意識[いしき]して、もう一[いち]度[ど]同[おな]じテーマで30〜60秒[びょう]話[はな]してみましょう！',
    round2Comparison,
    isDemo: true,
  };
}
