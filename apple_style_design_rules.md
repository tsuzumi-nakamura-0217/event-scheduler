# 日程調整サイト デザインシステム (Apple HIG ベース)

Appleの「Human Interface Guidelines (HIG)」の思想（明瞭さ、違和感のなさ、奥行き）を取り入れつつ、Tailwind CSSでの実装を前提とした洗練されたデザインルールを定義します。

## 1. カラーシステム (Color System)

Apple製品のような「クリーンでコンテンツが主役になる」配色を意識し、純黒を避けた目に優しいグレーと、明確なアクションを示す鮮やかなアクセントカラーを使用します。

*   **UI 背景 (Backgrounds)**
    *   メイン背景 (Light): `bg-white` (純白) または `bg-zinc-50` (極めて薄いグレー)
    *   カード背景: `bg-white`
    *   セカンダリ背景 (フォーム要素等): `bg-zinc-100` (`#F4F4F5`)
*   **テキスト (Typography Colors)**
    *   プライマリ (見出し・本文): `text-zinc-900` (`#18181B`) - 純黒を避け、柔らかさを。
    *   セカンダリ (補足・日付の曜日など): `text-zinc-500` (`#71717A`)
    *   ターシャリ (プレースホルダー): `text-zinc-400` (`#A1A1AA`)
*   **アクセント (Actions)**
    *   システムブルー (iOS標準風): `text-blue-500` (`bg-blue-500`)
    *   ホバー/タップ時: Tailwindの `active:opacity-80` または `hover:bg-blue-600`
    *   破壊的アクション (削除など): `text-red-500` (`bg-red-500`)

## 2. タイポグラフィ (Typography)

HIGのDynamic Typeに着想を得て、文字の大きさとウェイトで階層（ヒエラルキー）を明確にし、読みやすさを最大化します。デフォルトの `font-sans`（San Francisco / Inter などのシステムフォント）を想定します。

*   **Large Title (ページタイトル)**: `text-3xl font-bold tracking-tight text-zinc-900`
*   **Title 1 (セクション見出し)**: `text-2xl font-semibold tracking-tight text-zinc-900`
*   **Headline (カード見出し・重要項目)**: `text-base font-semibold text-zinc-900`
*   **Body (通常のテキスト)**: `text-base font-normal text-zinc-900 leading-relaxed`
*   **Footnote (補足・細かい注釈)**: `text-sm font-normal text-zinc-500`

## 3. 余白・間隔 (Spacing)

8ptグリッドシステムを採用し、近接性の原則に基づいて情報のかたまりを整理します。

*   **画面全体の余白**: モバイル `p-4` (16px), PC `md:p-8` (32px)
*   **セクション間の大きな余白**: `gap-8` (32px) または `gap-12` (48px)
*   **関連する要素同士（見出しと本文など）**: `gap-2` (8px) または `gap-4` (16px)
*   **リストコンポーネント内**: `gap-3` (12px)

## 4. 角丸 (Border Radius)

Appleらしい「連続的で滑らかな角丸（Squircle）」を表現するため、大きめの角丸を使用し、親しみやすさと洗練さを両立させます。

*   **画面全体を覆うようなモーダル**: `rounded-t-3xl`
*   **カード・大きな枠組み**: `rounded-2xl` (16px) - 柔らかくモダンな印象
*   **主要なボタン・入力フィールド**: `rounded-xl` (12px)
*   **小さなバッジやタグ**: `rounded-lg` または `rounded-full` (カレンダーの日付選択円など)

## 5. 影の効果と境界線 (Shadows & Borders)

HIGでは、過度なドロップシャドウよりも、「奥行き（Depth）」を表現するためのかすかな影や、1pxの繊細なボーダーを好みます。

*   **カードや要素の境界 (フラット＆クリーン)**: 
    *   クラス: `border border-zinc-200/80` (うっすらとしたボーダーで区切る)
*   **浮き上がっている要素 (フローティングボタン・ポップオーバー)**:
    *   クラス: `shadow-sm border border-zinc-100` (基本のカード)
    *   クラス: `shadow-lg shadow-zinc-200/50` (重なりを強調したい要素)

## 6. コンポーネント設計 (Components)

Tailwind CSSのクラスを組み合わせた具体的なコンポーネント実装例です。

### プライマリボタン (日程調整URLを発行するなど)
タップしやすい十分な高さ（44px〜）を確保し、ベタ塗りで視線を誘導します。
```html
<button class="w-full min-h-[44px] bg-blue-500 text-white font-semibold rounded-xl px-4 py-3 active:opacity-80 transition-opacity">
  URLをコピーする
</button>
```

### セカンダリボタン (キャンセル・サブアクション)
背景をグレーにして目立たせすぎず、文字色にアクセントカラーを使います。
```html
<button class="w-full min-h-[44px] bg-zinc-100 text-blue-500 font-semibold rounded-xl px-4 py-3 active:bg-zinc-200 transition-colors">
  キャンセル
</button>
```

### 入力フィールド (名前やコメント入力)
角丸をボタンと合わせ(`rounded-xl`)、フォーカス時に明確なフィードバックを与えます。
```html
<input 
  type="text" 
  placeholder="あなたのお名前"
  class="w-full bg-zinc-100 text-zinc-900 rounded-xl px-4 py-3 border border-transparent focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none transition-all placeholder:text-zinc-400"
/>
```

### 日付候補カード (Card)
```html
<div class="bg-white rounded-2xl p-4 border border-zinc-200 flex items-center justify-between">
  <div>
    <p class="text-base font-semibold text-zinc-900">3月15日 (金)</p>
    <p class="text-sm text-zinc-500">19:00 - 21:00</p>
  </div>
  <!-- 選択状態のチェックマークなどが入る -->
</div>
```

## 7. アクセシビリティ配慮 (Accessibility)

HIGでも強く推奨される「すべての人に使いやすい」設計をTailwindで実装します。

1.  **最小タップ領域の確保**: 
    スマートフォンでの誤タップを防ぐため、すべてのインタラクティブ要素（ボタン、リンク）は最低 `44px × 44px` のサイズを確保します。
    *Tailwind*: `min-h-[44px] min-w-[44px]`
2.  **キーボードナビゲーションのフォーカスリング**:
    Tabキー操作時の現在位置を明確にします（マウス操作時は出ないように `focus-visible` を使用）。
    *Tailwind*: `focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2`
3.  **コントラスト比**:
    テキスト（特にプレースホルダーや補足テキスト）を薄くしすぎないよう、背景色に対して十分なコントラスト（WCAG 2.1 AA準拠以上）を持たせます（`text-zinc-500` は白背景で概ねクリアします）。
4.  **スクリーンリーダー対応（Tailwindの視覚外テキスト）**:
    アイコンだけのボタンなどには、視覚的には見えず読み上げだけに使われるクラスを付与します。
    *Tailwind*: `sr-only` (例: `<span class="sr-only">カレンダーを閉じる</span>`)
