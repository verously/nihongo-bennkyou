import type { TopicItem } from '../types';

/**
 * Curated Japanese speaking topics with bespoke photography & reliable real-world statistics.
 * STRICT RULE: Zero model answers or sample opinions are included before the learner speaks.
 */
export const CURATED_TOPICS: TopicItem[] = [
  {
    id: 'curated-daily-commute',
    category: 'daily',
    title: '電車[でんしゃ]を待[ま]つ時間[じかん]の過[す]ごし方[かた]',
    materialType: 'photo',
    imageUrl: './scenes/daily_commute.jpg',
    imageAlt: '駅のホームでスマートフォンを見る通勤客と、ベンチで文庫本を読む高齢男性の写真',
    imageCaption: '夕方[ゆうがた]の駅[えき]のホームの風景[ふうけい]',
    promptInstruction:
      '写真[しゃしん]を見[み]て気[き]づいたことや、あなたの意見[いけん]を30〜60秒[びょう]で日本語[にほんご]で話[はな]してください。',
    guidedSteps: [
      {
        id: 'step-1',
        stageLabel: '1. 見[み]えること',
        question: 'この写真[しゃしん]を見[み]て、まず何[なに]が目[め]に入[はい]りますか？どんな人[ひと]たちが何[なに]をしていますか？',
        placeholder: '例：場所、人の様子、気になった違いなど（単語やメモでOK）',
      },
      {
        id: 'step-2',
        stageLabel: '2. 感想[かんそう]・経験[けいけん]',
        question: 'この様子[ようす]を見[み]てどう思[おも]いましたか？あなた自身[じしん]は待[ま]ち時間[じかん]を普段[ふだん]どう過[す]ごしていますか？',
        placeholder: '自分の経験や感じたことを短くメモ（書かずに頭で考えてもOK）',
      },
      {
        id: 'step-3',
        stageLabel: '3. 自分[じぶん]の意見[いけん]',
        question: '移動[いどう]や待[ま]ち時間[じかん]の使い方[つかいかた]について、あなたの考[かんが]えを1つまとめてみましょう。',
        placeholder: '最後に伝えたい自分の考え・まとめのキーワード',
      },
    ],
  },
  {
    id: 'curated-culture-cafe',
    category: 'culture',
    title: '昔[むかし]ながらの喫茶店[きっさてん]と現代[げんだい]の過[す]ごし方[かた]',
    materialType: 'photo',
    imageUrl: './scenes/culture_cafe.jpg',
    imageAlt: '木造の落ち着いた喫茶店でノートパソコンで作業する若者と、お茶を飲みながら談笑する常連客の写真',
    imageCaption: '街[まち]の喫茶店[きっさてん]の中[なか]の風景[ふうけい]',
    promptInstruction:
      '写真[しゃしん]を見[み]て感[かん]じたことや、カフェ・喫茶店[きっさてん]の過[す]ごし方[かた]についての意見[いけん]を30〜60秒[びょう]で話[はな]してください。',
    guidedSteps: [
      {
        id: 'step-1',
        stageLabel: '1. 見[み]えること',
        question: 'このお店[みせ]の中[なか]はどんな雰囲気[ふんいき]ですか？お客[きゃく]さんたちはそれぞれ何[なに]をしていますか？',
        placeholder: 'お店の雰囲気、人の行動など気づいたこと',
      },
      {
        id: 'step-2',
        stageLabel: '2. 感想[かんそう]・経験[けいけん]',
        question: 'あなたはカフェや喫茶店[きっさてん]によく行[い]きますか？そこではどんな時間[じかん]を過[す]ごすことが多[おお]いですか？',
        placeholder: '自分の体験や好きな過ごし方など',
      },
      {
        id: 'step-3',
        stageLabel: '3. 自分[じぶん]の意見[いけん]',
        question: 'こうした昔[むかし]ながらの空間[くうかん]が今[いま]も残[のこ]っていることについて、どう思[おも]いますか？',
        placeholder: '自分の意見や理由を短くメモ',
      },
    ],
  },
  {
    id: 'curated-work-remote',
    category: 'work',
    title: '自宅[じたく]での働[はたら]き方[かた]と生活[せいかつ]のバランス',
    materialType: 'photo',
    imageUrl: './scenes/work_remote.jpg',
    imageAlt: '日当たりの良い日本の部屋の窓際デスクにノートパソコン、お茶、ノート、観葉植物が並んだ在宅勤務の風景',
    imageCaption: '自宅[じたく]のワークスペースの風景[ふうけい]',
    promptInstruction:
      '写真[しゃしん]を見[み]て思[おも]ったことや、在宅勤務[ざいたくきんむ]（リモートワーク）についての考[かんが]えを30〜60秒[びょう]で話[はな]してください。',
    guidedSteps: [
      {
        id: 'step-1',
        stageLabel: '1. 見[み]えること',
        question: 'この部屋[へや]や机[つくえ]の上[うえ]には何[なに]がありますか？どんな印象[いんしょう]を受[う]けましたか？',
        placeholder: '目に入った物や部屋の印象をメモ',
      },
      {
        id: 'step-2',
        stageLabel: '2. 感想[かんそう]・経験[けいけん]',
        question: '家[いえ]で勉強[べんきょう]したり仕事[しごと]したりするとき、あなたにとって良[よ]い点[てん]や難[むずか]しい点[てん]は何[なに]ですか？',
        placeholder: '自分の体験から感じたこと',
      },
      {
        id: 'step-3',
        stageLabel: '3. 自分[じぶん]の意見[いけん]',
        question: 'これからの働[はたら]き方[かた]や学[まな]び方[かた]について、あなたの意見[いけん]をまとめてみましょう。',
        placeholder: '自分が理想だと思う形や意見',
      },
    ],
  },
  {
    id: 'curated-society-shopping',
    category: 'society',
    title: '地域[ちいき]の商店街[しょうてんがい]の今[いま]とこれから',
    materialType: 'photo',
    imageUrl: './scenes/society_shopping.jpg',
    imageAlt: '夕暮れの昔ながらの商店街で八百屋の店主と地元の高齢者が会話しており、向かい側にはシャッターが閉まった店が見える写真',
    imageCaption: '夕暮[ゆうぐ]れの地域[ちいき]の商店街[しょうてんがい]',
    promptInstruction:
      '写真[しゃしん]を見[み]て気[き]づいたことや、地域[ちいき]のお店[みせ]・商店街[しょうてんがい]についての意見[いけん]を30〜60秒[びょう]で話[はな]してください。',
    guidedSteps: [
      {
        id: 'step-1',
        stageLabel: '1. 見[み]えること',
        question: '写真[しゃしん]の左側[ひだりがわ]と右側[みぎがわ]を比[くら]べて、どんなことに気[き]づきましたか？',
        placeholder: 'お店の様子、人、通りの雰囲気など',
      },
      {
        id: 'step-2',
        stageLabel: '2. 感想[かんそう]・経験[けいけん]',
        question: 'あなたの住[す]んでいる町[まち]には、このような小[ちい]さなお店[みせ]がありますか？普段[ふだん]どこで買[か]い物[もの]をしますか？',
        placeholder: '自分の身の回りの経験',
      },
      {
        id: 'step-3',
        stageLabel: '3. 自分[じぶん]の意見[いけん]',
        question: '地域[ちいき]の商店街[しょうてんがい]がこれからどうなっていくと思[おも]いますか？また、どうなってほしいですか？',
        placeholder: '自分の考えや理由のキーワード',
      },
    ],
  },
  {
    id: 'curated-daily-smartphone-chart',
    category: 'daily',
    title: '年代別[ねんだいべつ]・1日[いちにち]のスマホ利用時間[りようじかん]',
    materialType: 'chart',
    chart: {
      title: '年代別[ねんだいべつ] モバイル機器[きき]でのインターネット利用時間[りようじかん]（平日[へいじつ]・平均[へいきん]）',
      subtitle: '単位[たんい]：分[ふん]／日[にち]',
      unit: '分',
      chartType: 'horizontalBar',
      items: [
        { label: '10代', value: 184, highlight: true },
        { label: '20代', value: 171, highlight: true },
        { label: '30代', value: 132 },
        { label: '40代', value: 109 },
        { label: '50代', value: 84 },
        { label: '60代', value: 52 },
      ],
      sourceName: '総務省[そうむしょう] 情報通信[じょうほうつうしん]メディアの利用時間[りようじかん]調査[ちょうさ]をもとに作成[さくせい]',
      year: '2024年公表データ参考',
    },
    promptInstruction:
      'グラフを見[み]て気[き]づいたことや、スマホとの付[つ]き合[あ]い方[かた]についての意見[いけん]を30〜60秒[びょう]で話[はな]してください。',
    guidedSteps: [
      {
        id: 'step-1',
        stageLabel: '1. データを読[よ]む',
        question: 'このグラフを見[み]て、一番[いちばん]目立[めだ]つ数字[すうじ]や全体[ぜんたい]の傾向[けいこう]は何[なに]ですか？',
        placeholder: '多い年代、少ない年代、気づいた差など',
      },
      {
        id: 'step-2',
        stageLabel: '2. 自分[じぶん]と比[くら]べる',
        question: 'あなた自身[じしん]の1日[いちにち]のスマホ時間[じかん]と比[くら]べてどうですか？主[おも]に何[なに]に使[つか]っていますか？',
        placeholder: '自分の利用時間や使い道',
      },
      {
        id: 'step-3',
        stageLabel: '3. 自分[じぶん]の意見[いけん]',
        question: 'この結果[けっか]についてどう感[かん]じますか？スマホと上手[じょうず]に付[つ]き合[あ]うために大切[たいせつ]なことは何[なに]だと思[おも]いますか？',
        placeholder: '自分の意見やまとめ',
      },
    ],
  },
  {
    id: 'curated-work-telework-chart',
    category: 'work',
    title: '日本[にほん]のテレワーク実施率[じっしりつ]の推移[すいい]',
    materialType: 'chart',
    chart: {
      title: '雇用型[こようがた]テレワーカーの割合[わりあい]の推移[すいい]（全国[ぜんこく]）',
      subtitle: '単位[たんい]：％',
      unit: '%',
      chartType: 'bar',
      items: [
        { label: '2019年', value: 14.8 },
        { label: '2020年', value: 23.0 },
        { label: '2021年', value: 27.0, highlight: true },
        { label: '2022年', value: 26.1 },
        { label: '2023年', value: 24.8 },
        { label: '2024年', value: 22.6 },
      ],
      sourceName: '国土交通省[こくどこうつうしょう] テレワーク人口[じんこう]実態調査[じったいちょうさ]をもとに作成[さくせい]',
      year: '2019〜2024年推移参考',
    },
    promptInstruction:
      'グラフの変化[へんか]を見[み]て気[き]づいたことや、出社[しゅっしゃ]とテレワークについてのあなたの考[かんが]えを30〜60秒[びょう]で話[はな]してください。',
    guidedSteps: [
      {
        id: 'step-1',
        stageLabel: '1. 変化[へんか]を読[よ]む',
        question: '2019年[ねん]から2024年[ねん]にかけて、割合[わりあい]はどのように変化[へんか]していますか？',
        placeholder: '増えた時期、ピーク、最近の変化など',
      },
      {
        id: 'step-2',
        stageLabel: '2. 理由[りゆう]を考[かんが]える',
        question: 'なぜ最近[さいきん]少[すこ]し減[へ]っていると思[おも]いますか？思い当[おもいあ]たる理由[りゆう]はありますか？',
        placeholder: '自分の推測や見聞きしたこと',
      },
      {
        id: 'step-3',
        stageLabel: '3. 自分[じぶん]の意見[いけん]',
        question: '今後[こんご]、出社[しゅっしゃ]とテレワークのバランスはどうあるべきだと思[おも]いますか？',
        placeholder: '自分の考え・結論',
      },
    ],
  },
];
