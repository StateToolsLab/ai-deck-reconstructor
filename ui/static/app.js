let appState = null;
let selectedSlideId = null;
let previewMode = "original";
let showBackground = true;
let showTextBlocksLayer = true;
let showRebuildElementsLayer = false;
let backgroundOpacity = 0.78;
let currentBlocks = [];
let currentSpec = null;
let currentElements = [];
let selectedElementKey = null;
let currentWorkspaceRegistryPath = null;
let currentThemeStyles = {};
let themeStylesLoaded = false;
let themeStylesLoadingPromise = null;
let selectedThemeStyleRef = null;
let currentSystemPaletteColors = [];
let currentSystemPaletteSlideId = null;
let systemFonts = [];
let systemFontsLoaded = false;
let systemFontsLoadingPromise = null;
let systemFavoriteFonts = [];
let userFavoriteFonts = JSON.parse(localStorage.getItem("adr_favorite_fonts") || "[]");
let hiddenDefaultFavoriteFonts = JSON.parse(localStorage.getItem("adr_hidden_default_fonts") || "[]");
let currentAssistMode = null;
let rebuildCardCollapsed = false;
let aidrBottomPaneMode = localStorage.getItem("adr_bottom_pane_mode") || "log";
let aidrBottomPreviewZoom = 1;
let aidrBottomPaneHeight = Number(localStorage.getItem("adr_bottom_pane_height") || 190);

const BOTTOM_PANE_DEFAULT_HEIGHT = 190;
const BOTTOM_PANE_MIN_HEIGHT = 34;
const BOTTOM_PANE_MAX_RATIO = 0.55;
const BOTTOM_PANE_COLLAPSE_THRESHOLD = 56;

const $ = (id) => document.getElementById(id);


let currentLanguage = localStorage.getItem("adr_language") || "ja";
let currentTheme = localStorage.getItem("adr_theme") || "light";

const UI_I18N = {
  ja: {
    "app.documentTitle": "AI Deck Reconstructor Console",
    "app.subtitle": "スライド再構成アシスタントツール",

    "workspace.actions": "ワークスペース操作",
    "workspace.open": "開く",
    "workspace.openTitle": "登録済みワークスペースを開く",
    "workspace.registered": "登録済みワークスペース",
    "workspace.empty": "登録済みワークスペースはありません。",
    "workspace.limitNote": "OSS版コンソール：最大20枚",

    "common.new": "新規",
    "common.add": "追加",
    "common.reload": "再読込",
    "common.reloadTitle": "更新",
    "common.clear": "クリア",
    "common.cancel": "キャンセル",
    "common.apply": "適用",
    "common.copy": "コピー",
    "bottom.log": "RUN LOG",
    "bottom.preview": "PREVIEW",
    "bottom.previewEmpty": "選択中の要素がありません。",
    "bottom.previewUnsupported": "この選択対象は下部Previewではまだ表示対象外です。",
    "bottom.textPreview": "OCR Preview",
    "bottom.assetPreview": "Asset Preview",
    "bottom.font": "Font",
    "bottom.size": "Size",
    "bottom.color": "Color",
    "bottom.bbox": "bbox",
    "common.delete": "削除",
    "common.noSlideSelected": "スライドが選択されていません。",
    "common.notSelected": "未選択",
    "common.target": "対象",
    "selected.textStyle": "テキストスタイル",
    "assetEdit.openSelectedAsset": "選択中の素材を開く",
    "assetEdit.fillOpacityDescription": "背景・中身の透過バリアントを生成します。",
    "assetEdit.quickRepairDescription": "色を拾って矩形で局所補修します。",
    "assist.desc.theme": "テーマギャラリー：テーマを一覧で見て、デッキ全体に適用する入口です。",
    "assist.desc.style": "テキスト設定：テキスト要素のstyle_ref、フォント、サイズ、色、配置を編集する入口です。",
    "assist.desc.fit": "フィット：現在は使用しません。",
    "assist.desc.ai": "AIアシスト：Pro拡張予定。AIテーマ提案 / ロール再分類 / クリーンアップ支援などを格納します。",
    "assist.desc.asset": "素材編集：画像素材の文字消し・透過・局所補修を行う入口です。",
    "assist.desc.default": "アシストモードを選択してください。",
    "workspace.unregisterConfirm": "このワークスペースの登録を解除しますか？\n\nフォルダ本体は削除されません。登録一覧からのみ解除されます。",
    "workspace.unregisterTitle": "登録解除",
    "workspace.folderDescription": "ワークスペースフォルダを登録して、次回から一覧で開けるようにします。",
    "workspace.unregisterNote": "★を外すと登録一覧から解除します。実フォルダは削除されません。",
    "workspace.openAsNewNote": "新規ワークスペースとして開きます。",
    "workspace.addToCurrentNote": "現在のワークスペースに追加します。",
    "workspace.replaceSourceNote": "現在の source/ を置き換えて slide_001 から採番します。",
    "workspace.appendSourceNote": "現在の source/ は残し、slide_XXX の続きから追加します。",
    "status.assetClipOff": "素材切り出しモードはOFFです。",
    "status.assetClipSelectSlide": "素材切り出しモードはONです。先にスライドを選択してください。",
    "status.assetClipDragToSelect": "素材切り出しモードはONです。プレビュー上でドラッグして画像素材を選択してください。",
    "status.assetClipSelectionCancelled": "選択をキャンセルしました。プレビュー上で再度ドラッグして選択してください。",
    "status.assetClipNoRectangle": "選択矩形がありません。先にプレビュー上でドラッグしてください。",
    "status.assetClipRectangleTooSmall": "選択矩形が小さすぎます。",
    "status.noCandidateSelected": "候補が選択されていません。",
    "status.textEraserSourceCandidate": "source_candidate_id: {sourceCandidateId} を基準に消去します。",
    "status.textEraserCandidateAsset": "候補由来の素材です。この素材範囲を文字消し対象として扱います。",
    "status.textEraserBbox": "bbox_px: [{bbox}] の素材範囲を文字消し対象として扱います。",
    "status.candidateBbox": "候補 bbox_px: [{bbox}]",
    "status.textEraserTargetUnavailable": "消去対象を表示できません。この素材全体を文字消し対象として扱います。",
    "status.textEraserFallbackSourceCandidate": "source_candidate_id: {candidateId} を基準にします。bbox表示は素材全体で確認します。",
    "status.textEraserFallbackWholeAsset": "bboxを特定できないため、素材全体を文字消し対象として表示しています。",
    "status.textEraserSourceCandidateBbox": "source_candidate_id: {candidateId} のbboxを消去対象として表示しています。",
    "status.textEraserDetectedTargets": "検出対象: {count}",
    "status.textEraserDetectedTargetsEmpty": "検出対象: -",
    "status.textEraserShowTargets": "消去対象を表示",
    "status.textEraserPanelNote": "一部だけ補修したい場合はクイック補修を使ってください。対象bboxを特定できない場合は、この素材全体を文字消し対象として扱います。",
    "status.applyTextEraser": "文字消しを適用",
    "status.applyFillOpacity": "透過処理を適用",
    "status.saveRepair": "補修を保存",
    "recolor.guidance.quickRepairTitle": "クイック補修モード",
    "recolor.guidance.quickRepairBody": "画像上で補修に使う色をクリックしてください。",
    "recolor.guidance.rectangleTitle": "クイック補修モード - 矩形",
    "recolor.guidance.rectangleBody": "ドラッグで補修範囲を指定します。Shiftで水平/垂直方向に固定できます。",
    "recolor.guidance.sourceSelectedTitle": "再配色モード - 置換元の色を選択済み",
    "recolor.guidance.sourceSelectedBody": "置換元の色が選択されました。文字や影が残っている場合は、先に文字消しを使うことをおすすめします。問題なければ「置換後の色を選択」を押してください。",
    "recolor.guidance.sourceStepTitle": "再配色モード - Step 1 / 2",
    "recolor.guidance.sourceStepBody": "再配色は文字消し後の素材に対して使うと安定します。画像上で「置き換えたい背景色・図形色」をクリックしてください。",
    "recolor.guidance.targetStepTitle": "再配色モード - Step 2 / 2",
    "recolor.guidance.targetStepBody": "Theme Colorから「置き換え後の色」を選択してください。再配色は現在の置換元の色に近い領域をまとめて置換します。",
    "recolor.guidance.readyTitle": "再配色準備完了",
    "recolor.guidance.readyBody": "置換元の色と置換後の色が選択されました。適用で保存できます。",
    "recolor.action.selectSourceFirst": "先に置換元の色を選択",
    "recolor.action.selectTargetColor": "置換後の色を選択",
    "recolor.action.apply": "適用",
    "recolor.palette.currentThemeNote": "現在のテーマの色候補から、置き換え後の色を選択します。",
    "recolor.palette.fallbackNote": "テーマ色が未取得のため、デフォルトパレットを表示しています。",
    "recolor.palette.selectTargetPlaceholder": "置換後の色を選択",
    "recolor.palette.targetColorTitle": "置換後の色: {color}",
    "recolor.label.source": "置換元",
    "recolor.label.target": "置換後",
    "recolor.label.notSelected": "未選択",
    "recolor.label.tolerance": "許容範囲",
    "recolor.label.colorPalette": "カラーパレット",
    "recolor.palette.initialNote": "置換後の色をテーマパレットから選択します。",

    "pane.input": "入力",
    "pane.slides": "スライド",
    "pane.preview": "プレビュー",
    "pane.inspect": "確認",
    "pane.rebuildState": "再構成状態",
    "rightPane.collapse": "右ペインを折りたたむ",
    "rightPane.expand": "右ペインを表示",

    "source.openFiles": "新規で開く",
    "source.addFiles": "追加で開く",
    "source.openFilesSub": "ファイル選択",
    "source.addFilesSub": "ファイル追加",
    "source.current": "現在の入力画像",
    "asset.emptySource": "source/ に画像がありません。",
    "source.clearTitle": "現在の入力画像をクリア",

    "preview.original": "元画像",
    "preview.reconstructed": "再構成後",
    "preview.processSelected": "このスライドを処理",
    "preview.processPending": "未処理を処理",
    "preview.reprocessAll": "全スライド再処理",
    "preview.reprocessAllTitle": "全スライドをOCRから再処理します",
    "preview.controls": "プレビュー操作",
    "preview.background": "背景画像",
    "preview.opacity": "不透明度",
    "preview.textBlocks": "読み取り範囲",
    "preview.rebuildElements": "再構成要素",
    "preview.empty": "AI生成スライド画像を投入すると、ここにプレビューが表示されます。",
    "preview.overlayEmpty": "表示中のoverlay layerはありません。",

    "clip.assist": "切り出し補助",
    "clip.grid": "グリッド",
    "clip.pitch": "間隔",
    "clip.snap": "スナップ",
    "clip.origin": "原点",
    "clip.originTopLeft": "左上",
    "clip.originCenter": "中央",
    "clip.originTopCenter": "上辺中央",

    "assist.menu": "アシストメニュー",
    "assist.theme": "テーマ",
    "assist.textSettings": "テキスト設定",
    "assist.assetEdit": "素材編集",

    "rebuild.title": "再構成",
    "pptx.open": "PPTXを開く",
    "pptx.export": "PPTXを書き出す",
    "folder.openShort": "フォルダ",

    "selected.title": "選択中の項目",
    "selected.assetReadyNote": "素材は画像ファイルとして素材化済みです。bbox編集・再切り出しは今後の更新で対応します。",
    "selected.emptyHint": "再構成後タブで要素をクリックすると、ここに情報が表示されます。",
    "selected.assetNotFound": "選択素材が見つかりません。",
    "selected.kind": "種類",
    "selected.kindAsset": "画像素材",
    "selected.kindCandidate": "素材候補",
    "selected.fileName": "ファイル名",
    "selected.createdBy": "作成元",
    "selected.status": "状態",
    "selected.acceptedAsset": "素材",
    "selected.role": "ロール",
    "selected.confidence": "信頼度",
    "selected.material": "素材",
    "selected.materialCandidate": "素材候補",
    "selected.materialSettingsTitle": "素材",
    "selected.localRepair": "ローカル素材補修",
    "selected.openMaterialSettings": "素材設定を開く",
    "selected.materialFixedEntryNote": "現在は入口を固定します。各処理は素材バリアントとして非破壊で書き出す方針です。",
    "selected.candidateNotFound": "選択候補が見つかりません。",
    "selected.elementNotFound": "選択要素が見つかりません。",
    "selected.candidateAdjustNote": "プレビュー上のbboxハンドルで範囲を調整してから採用できます。",
    "candidate.deleteCandidate": "候補を削除",

    "assets.title": "素材",
    "assets.empty": "素材はまだありません。",
    "asset.overlay": "素材オーバーレイ",
    "asset.clipMode": "素材切り出しモード",
    "asset.confirmClip": "切り出し確定",
    "asset.clipOff": "素材切り出しモードはOFFです。",
    "asset.detectCandidates": "候補を検出",
    "asset.useInPptx": "PPTXに出す",

    "candidates.title": "候補",
    "candidates.empty": "候補はまだありません。",
    "candidates.noActive": "有効な候補はありません。",
    "candidate.overlay": "候補オーバーレイ",
    "candidate.acceptSelected": "選択候補 + PPTX",
    "candidate.acceptAll": "すべて採用 + PPTX",
    "candidate.statusNotLoaded": "候補：未読込",
    "candidate.statusLoaded": "素材候補：{count}",

    "modal.workspace": "ワークスペース",
    "modal.openFiles": "ファイルを開く",
    "modal.openFolder": "フォルダを開く",
    "upload.dropMain": "ここにドロップ、またはクリックして選択",
    "upload.dropSub": "PNG / JPG / JPEG / WEBP / BMP / TIFF / PDF",
    "upload.clipboard": "クリップボード画像を追加",
    "upload.addImage": "画像を追加",
    "upload.addPdf": "PDFを追加",

    "settings.title": "設定",
    "settings.assistMenu": "アシストメニュー",
    "settings.themeStyleNote": "テーマ / スタイル設定を切り替えて編集します。テーマは全体適用、スタイル設定はテキスト要素の編集です。",
    "settings.saveStyle": "スタイルを保存",
    "settings.saveAllDrafts": "すべての下書きを保存",
    "settings.saveAllDraftsTitle": "未保存のスタイル下書きをすべて保存します",
    "settings.noStyleDraftsToSave": "保存するスタイル下書きはありません。",
    "settings.saveAllDraftsSaved": "{saved}件のスタイル下書きを保存しました。",
    "settings.saveAllDraftsSavedSynced": "{saved}件のスタイル下書きを保存しました / 現在のThemeも同期しました。",
    "settings.saveAllDraftsFailed": "すべての下書き保存に失敗しました: {message}",
    "settings.styleSaveNote": "保存すると sector_defaults.json に反映されます。PPTXには次回Build時に反映されます。",
    "settings.loadingTextStyles": "テキストスタイルを読込中...",

    "previewContext.assetTitle": "素材",
    "previewContext.textRoleTitle": "テキスト役割",
    "previewContext.clearSelection": "選択を解除",
    "previewContext.openAssetPreview": "素材プレビューを開く",
    "previewContext.adjustAssetBBox": "素材範囲を調整",
    "previewContext.includeInPptx": "PPTXに含める",
    "previewContext.excludeFromPptx": "PPTXから除外",
    "previewContext.deleteAsset": "素材を削除",
    "previewContext.setRoleH1": "Left H1 / 左メインタイトルに設定",
    "previewContext.setRoleH2": "Left H2 / 左サブタイトルに設定",
    "previewContext.setRoleBody": "Left p / 左本文に設定",
    "previewContext.setRoleCenterH1": "Center H1 / 中央メインタイトルに設定",
    "previewContext.setRoleCenterH2": "Center H2 / 中央サブタイトルに設定",
    "previewContext.setRoleCenterBody": "Center p / 中央本文に設定",
    "previewContext.setRoleFooter": "フッター注記に設定",
    "previewContext.setRoleMeta": "メタ情報・小に設定",
    "previewContext.setRoleCardTitle": "カード / タイトルに設定",
    "previewContext.setRoleCardBody": "カード / 本文に設定",
    "previewContext.setRoleCardNote": "カード / 注記に設定",
    "previewContext.setRoleCardMeta": "カード / メタに設定",
    "previewContext.deleteFromRebuild": "再構成から削除",

    "dialog.deleteSlideConfirm": "{slideId} を削除しますか？\n\n関連するOCR / text_blocks / rebuild_spec / assetsも削除されます。既存PPTXは削除されません。",
    "dialog.clearSourceConfirm": "現在の source をすべて削除しますか？\n\nsource画像と関連するOCR / text_blocks / rebuild_spec / assetsを削除します。既存PPTXとワークスペース登録は削除されません。",
    "dialog.rebuildElementMissing": "対応する再構成要素が見つかりません。再構成要素レイヤー側を選択してから変更してください。",
    "dialog.deleteTextElementConfirm": "このテキスト要素を再構成対象から削除しますか？\n\n元画像やOCR rawは削除されません。",
    "dialog.updateRebuildElementFailed": "再構成要素の更新に失敗しました: {message}",
    "dialog.assetPreviewUnavailable": "素材プレビューは利用できません。",
    "dialog.assetNotFound": "素材が見つかりません。",
    "dialog.deleteAssetConfirm": "{assetId} を削除しますか？",
    "dialog.togglePptxFailed": "PPTX出力の切り替えに失敗しました: {message}",

    "theme.limitReached": "Theme上限に達しました: {count} / {max}",
    "theme.limitReachedTitle": "Theme上限に達しました",
    "theme.duplicateTitle": "Themeを複製",
    "theme.createFailed": "Theme作成に失敗しました: {message}",
    "theme.createError": "Theme作成エラー: {message}",
    "theme.duplicateFailed": "Theme複製に失敗しました: {message}",
    "theme.duplicateError": "Theme複製エラー: {message}",
    "theme.renameFailed": "Theme名変更に失敗しました: {message}",
    "theme.renameError": "Theme名変更エラー: {message}",
    "theme.deleteConfirm": "このThemeを削除しますか？\n\n{label}",
    "theme.deleteCurrentConfirm": "現在適用中のThemeです。削除しますか？\n\n{label}",
    "theme.deleteFileConfirm": "Theme「{label}」を削除しますか？\n\njson/themes/{themeId}.json が削除されます。",
    "theme.deleteFailed": "Theme削除に失敗しました: {message}",
    "theme.deleteError": "Theme削除エラー: {message}",
    "theme.applyConfirm": "Theme「{themeName}」をデッキ全体に適用しますか？",
    "theme.applyFailed": "Theme適用に失敗しました: {message}",
    "theme.applyError": "Theme適用エラー: {message}",
    "theme.saveFailed": "Theme保存に失敗しました: {message}",
    "theme.saveError": "Theme保存エラー: {message}",
    "theme.loadConfirm": "Theme「{themeId}」を sector_defaults.json に読み込みますか？\n\n現在のロールスタイルは置き換えられます。",
    "theme.loadFailed": "Theme読込に失敗しました: {message}",
    "theme.loadError": "Theme読込エラー: {message}",
    "theme.noThemeSelected": "Themeが選択されていません。",
    "theme.nameCreateTitle": "テーマを作成",
    "theme.nameRenameTitle": "Theme名を変更",
    "theme.nameCreateNote": "現在の設定から新しいThemeを作成します。",
    "theme.nameRenameNote": "保存済みThemeの表示名を更新します。",
    "theme.nameCreateSubmit": "作成",
    "theme.nameRenameSubmit": "変更",
    "theme.userThemeDefaultName": "User Theme",

    "assetEdit.selectAssetOrCandidate": "素材または候補を選択してから、素材編集を開いてください。",
    "assetEdit.title": "素材編集",
    "assetEdit.panelTitle": "素材編集",
    "assetEdit.panelDescription": "画像素材に対して、文字消し・透過・局所補修を非破壊バリアントとして実行します。実際の編集は素材編集モーダル / プレビューワークスペースで行います。",
    "assetEdit.textEraserDescription": "OCR文字領域を消去します。",
    "assetEdit.candidateTitle": "素材編集: 候補",
    "assetEdit.modalOpenFailed": "素材編集モーダルを開けませんでした。",
    "assetEdit.sourceColorRequired": "先に画像から置換元の色を選択してください。",
    "assetEdit.sourceAndTargetColorRequired": "置換元の色と置換後の色を先に選択してください。",
    "assetEdit.noAssetSelected": "素材が選択されていません。",
    "assetEdit.assetNotSelected": "素材が選択されていません。",
    "assetEdit.applyRecolorConfirm": "再配色を適用して、新しい素材バリアントを作成しますか？",
    "assetEdit.recolorFailed": "再配色に失敗しました: {message}",
    "assetEdit.noQuickRepairRectangles": "クイック補修の矩形がまだありません。",
    "assetEdit.quickRepairFailed": "クイック補修に失敗しました: {message}",
    "assetEdit.textEraserAcceptedAssetRequired": "文字消しには採用済み素材が必要です。",
    "assetEdit.textEraserCandidateFirstRequired": "文字消しには採用済み素材が必要です。先にこの候補を採用してください。",
    "assetEdit.applyTextEraserConfirm": "文字消し v1を適用して、新しい素材バリアントを作成しますか？",
    "assetEdit.textEraserFailed": "文字消しに失敗しました: {message}",
    "assetEdit.fillOpacityAcceptedAssetRequired": "透過処理には採用済み素材が必要です。",
    "assetEdit.fillOpacityCandidateFirstRequired": "透過処理には採用済み素材が必要です。先にこの候補を採用してください。",
    "assetEdit.applyFillOpacityConfirm": "透過処理 v1を適用して、新しい素材バリアントを作成しますか？",
    "assetEdit.fillOpacityTargetRequired": "背景または塗りのどちらかを選択してください。",
    "assetEdit.fillOpacityFailed": "透過処理に失敗しました: {message}",
    "assetEdit.assetPreviewUrlNotFound": "素材プレビューURLが見つかりません。",
    "assetEdit.currentAssetNotFound": "現在の素材が見つかりません。",
    "assetEdit.rootSourceAssetNotFound": "ルートの元素材が見つかりません。",
    "assetEdit.alreadySourceAsset": "これはすでにsource/originalの元素材です。",
    "assetEdit.variantDeleteFailed": "バリアント削除に失敗しました: {message}",
    "assetEdit.quickRepairOverwriteConfirm": "この素材をクイック補修で上書きしますか？",
    "assetEdit.quickRepairSaveVariantConfirm": "クイック補修を新しいバリアントとして保存しますか？",
    "assetEdit.returnToSourceConfirm": "元素材に戻りますか？\n\n現在の作業対象はバリアントです。\nOKで元素材に戻ります。",
    "assetEdit.returnToSourceButton": "元素材に戻る",
    "assetEdit.nonDestructiveNote": "素材編集は非破壊処理です。元画像は保持され、処理結果は新しいバリアントとして生成されます。バリアント作業をやめたい場合は「元素材に戻る」を使ってください。",
    "assetEdit.openHelpTitle": "素材編集の説明と入口を開きます",
    "assetEdit.returnToRootSourceConfirm": "元素材に戻りますか？\n\n現在の作業対象はバリアントです。\n戻り先: {rootId}",
    "assetEdit.deleteVariantBeforeReturnConfirm": "このバリアントを削除してから元素材に戻りますか？\n\nOK: 戻って削除\nキャンセル: 戻る（バリアントは残す）",
    "dialog.deleteAssetUnavailable": "素材削除は利用できません。",
    "materialOp.textEraser": "文字消し",
    "materialOp.fillOpacity": "透過処理",
    "materialOp.quickRepair": "クイック補修",
    "materialOp.recolor": "再配色",
    "assetKind.variant": "バリアント",
    "assetKind.original": "オリジナル",
    "textStyle.roleStyle": "ロールスタイル",
    "textStyle.category": "カテゴリ",
    "textStyle.styleRef": "スタイル参照",
    "textStyle.fontFamily": "フォント",
    "textStyle.fontSize": "サイズ",
    "textStyle.color": "色",
    "textStyle.align": "配置",
    "textStyle.style": "スタイル",
    "textStyle.alignLeft": "左",
    "textStyle.alignCenter": "中央",
    "textStyle.alignRight": "右",
    "textStyle.toggleFavoriteFont": "お気に入りフォントを切り替え",
    "textStyle.increaseFontSize": "フォントサイズを大きくする",
    "textStyle.decreaseFontSize": "フォントサイズを小さくする",
    "textStyle.openColorPalette": "カラーパレットを開く",
    "theme.galleryTitle": "テーマギャラリー",
    "theme.galleryNote": "保存済みテーマを管理します。文字スタイルはテキスト設定から編集します。",
    "theme.createFromCurrent": "現在の設定から作成",
    "theme.styleCount": "{count}件のスタイル",
    "theme.styleCountFallback": "スタイル",
    "theme.currentApplied": "現在 / 適用済み",
    "theme.cardKicker": "テーマ",
    "theme.sampleH1": "Aa 123 見出し",
    "theme.sampleH2": "Sub 456 小見出し",
    "theme.sampleBody": "Body 789 本文",
    "theme.applied": "適用済み",
    "theme.apply": "適用",
    "theme.limitCreateNote": "テーマ保存枠: {count} / {max}。新しく作成するにはテーマを削除してください。",
    "theme.noSavedThemes": "保存済みテーマはありません",
    "theme.slotHelp": "テーマ保存枠は最大{max}件です。複製・名前変更・削除は ⋯ から操作できます。",
    "theme.currentTheme": "現在のテーマ",
    "theme.notLoaded": "未読込",
    "theme.loadedAt": "読込日時",
    "theme.currentSectorDefaults": "現在の sector_defaults.json",
    "theme.designSystem": "デザインシステム",
    "theme.designSystemNote": "スライドから抽出した色をもとに、テーマトークンを作成します。",
    "theme.designSystemCollapsed": "デザインシステム編集エリアは折りたたまれています",
    "theme.designSystemCollapsedNote": "展開すると、テーマトークンとスライド抽出色を編集できます。",
    "theme.designSystemPreviewAria": "デザインシステムのプレビュー色: Main, Sub, Accent",
    "theme.expand": "展開",
    "theme.collapse": "折りたたみ",
    "theme.reload": "再読込",
    "theme.save": "保存",
    "theme.tokensTitle": "テーマトークン",
    "theme.tokensNote": "デザインシステムの色です。トークンを選択してから、抽出色を選びます。",
    "theme.sampledColors": "抽出色",
    "theme.sampledColorsNote": "現在のスライドから抽出した色です。テーマトークンは自動では上書きされません。",
    "theme.refreshSlideColors": "スライド色を再抽出",
    "theme.sampledColorsEmpty": "抽出色は未読込です",
    "theme.updatedAt": "更新日時",
    "theme.notExtracted": "未抽出",
    "theme.source": "入力元",
    "theme.sourceCurrentSlide": "入力元: 現在のスライド画像",
    "theme.selected": "選択中",
    "theme.copy": "コピー",
    "theme.assignTo": "割り当て先",

    "language.toggle.en": "English に切り替え",
    "language.toggle.ja": "日本語に切り替え",
    "theme.toggle.dark": "ダーク表示へ切り替え",
    "theme.toggle.light": "ライト表示へ切り替え"
  },
  en: {
    "app.documentTitle": "AI Deck Reconstructor Console",
    "app.subtitle": "One-shot Deck Converter",

    "workspace.actions": "Workspace Actions",
    "workspace.open": "Open",
    "workspace.openTitle": "Open registered workspace",
    "workspace.registered": "Registered Workspaces",
    "workspace.empty": "No registered workspaces yet.",
    "workspace.limitNote": "OSS Console: up to 20 slides",

    "common.new": "New",
    "common.add": "Add",
    "common.reload": "Reload",
    "common.reloadTitle": "Refresh",
    "common.clear": "Clear",
    "common.cancel": "Cancel",
    "common.apply": "Apply",
    "common.copy": "Copy",
    "bottom.log": "RUN LOG",
    "bottom.preview": "PREVIEW",
    "bottom.previewEmpty": "No selected item.",
    "bottom.previewUnsupported": "This selected item is not supported in Bottom Preview yet.",
    "bottom.textPreview": "OCR Preview",
    "bottom.assetPreview": "Asset Preview",
    "bottom.font": "Font",
    "bottom.size": "Size",
    "bottom.color": "Color",
    "bottom.bbox": "bbox",
    "common.delete": "Delete",
    "common.noSlideSelected": "No slide selected.",
    "common.notSelected": "not selected",
    "common.target": "Target",
    "selected.textStyle": "Text Style",
    "assetEdit.openSelectedAsset": "Open selected Asset",
    "assetEdit.fillOpacityDescription": "Create a transparent variant for the background or contents.",
    "assetEdit.quickRepairDescription": "Pick a color and repair a local rectangle area.",
    "assist.desc.theme": "Theme Gallery: Browse themes and apply them to the whole deck.",
    "assist.desc.style": "Text Settings: Edit style_ref, font, size, color, and alignment for text elements.",
    "assist.desc.fit": "Fit: Currently not used.",
    "assist.desc.ai": "AI Assist: Planned Pro extension for AI Theme Suggest, Role Reclassification, Cleanup Assist, and related tools.",
    "assist.desc.asset": "Asset Edit: Entry point for text erasing, transparency, and local repair of image assets.",
    "assist.desc.default": "Select an assist mode.",
    "workspace.unregisterConfirm": "Unregister this workspace?\n\nThe folder itself will not be deleted. It will only be removed from the registered workspace list.",
    "workspace.unregisterTitle": "Unregister",
    "workspace.folderDescription": "Register a workspace folder so you can open it from the list next time.",
    "workspace.unregisterNote": "Turn off the star to unregister it from the list. The actual folder will not be deleted.",
    "workspace.openAsNewNote": "Open as a new workspace.",
    "workspace.addToCurrentNote": "Add to the current workspace.",
    "workspace.replaceSourceNote": "Replace the current source/ and start numbering from slide_001.",
    "workspace.appendSourceNote": "Keep the current source/ and append from the next slide_XXX number.",
    "status.assetClipOff": "Asset Clip Mode is OFF.",
    "status.assetClipSelectSlide": "Asset Clip Mode is ON. Select a slide first.",
    "status.assetClipDragToSelect": "Asset Clip Mode is ON. Drag on preview to select an image asset.",
    "status.assetClipSelectionCancelled": "Selection cancelled. Drag on preview to select again.",
    "status.assetClipNoRectangle": "No selected rectangle. Drag on preview first.",
    "status.assetClipRectangleTooSmall": "Selected rectangle is too small.",
    "status.noCandidateSelected": "No candidate selected.",
    "status.textEraserSourceCandidate": "Erase using source_candidate_id: {sourceCandidateId}.",
    "status.textEraserCandidateAsset": "This Asset came from a Candidate. The Asset area will be used for Text Eraser.",
    "status.textEraserBbox": "Use bbox_px: [{bbox}] as the Asset area for Text Eraser.",
    "status.candidateBbox": "Candidate bbox_px: [{bbox}]",
    "status.textEraserTargetUnavailable": "Could not display erase targets. The whole Asset will be used for Text Eraser.",
    "status.textEraserFallbackSourceCandidate": "Using source_candidate_id: {candidateId}. Check the bbox display using the whole Asset area.",
    "status.textEraserFallbackWholeAsset": "Could not identify the bbox, so the whole Asset is shown as the Text Eraser target.",
    "status.textEraserSourceCandidateBbox": "Showing the bbox for source_candidate_id: {candidateId} as the erase target.",
    "status.textEraserDetectedTargets": "Detected targets: {count}",
    "status.textEraserDetectedTargetsEmpty": "Detected targets: -",
    "status.textEraserShowTargets": "Show Erase Targets",
    "status.textEraserPanelNote": "Use Quick Repair if you only want to repair part of the image. If the target bbox cannot be identified, the whole Asset will be used for Text Eraser.",
    "status.applyTextEraser": "Apply Text Eraser",
    "status.applyFillOpacity": "Apply Fill Opacity",
    "status.saveRepair": "Save Repair",
    "recolor.guidance.quickRepairTitle": "Quick Repair Mode",
    "recolor.guidance.quickRepairBody": "Click a color on the image to use for repair.",
    "recolor.guidance.rectangleTitle": "Quick Repair Mode - Rectangle",
    "recolor.guidance.rectangleBody": "Drag to select the repair area. Hold Shift to lock horizontal or vertical movement.",
    "recolor.guidance.sourceSelectedTitle": "Recolor Mode - Source Color Selected",
    "recolor.guidance.sourceSelectedBody": "Source Color has been selected. If text or shadows remain, use Text Eraser first. If it looks good, choose Select Target Color.",
    "recolor.guidance.sourceStepTitle": "Recolor Mode - Step 1 / 2",
    "recolor.guidance.sourceStepBody": "Recolor works best after Text Eraser. Click the background or shape color you want to replace.",
    "recolor.guidance.targetStepTitle": "Recolor Mode - Step 2 / 2",
    "recolor.guidance.targetStepBody": "Choose the replacement color from Theme Color. Recolor replaces areas close to the current Source Color.",
    "recolor.guidance.readyTitle": "Recolor Ready",
    "recolor.guidance.readyBody": "Source Color and Target Color are selected. Choose Apply to save.",
    "recolor.action.selectSourceFirst": "Select Source Color first",
    "recolor.action.selectTargetColor": "Select Target Color",
    "recolor.action.apply": "Apply",
    "recolor.palette.currentThemeNote": "Choose the replacement color from the Current Theme color candidates.",
    "recolor.palette.fallbackNote": "Theme colors are not available, so the Default Palette is shown.",
    "recolor.palette.selectTargetPlaceholder": "Select target color",
    "recolor.palette.targetColorTitle": "Target Color: {color}",
    "recolor.label.source": "Source",
    "recolor.label.target": "Target",
    "recolor.label.notSelected": "not selected",
    "recolor.label.tolerance": "Tolerance",
    "recolor.label.colorPalette": "Color Palette",
    "recolor.palette.initialNote": "Select Target Color from the Theme Palette.",

    "pane.input": "Input",
    "pane.slides": "Slides",
    "pane.preview": "Preview",
    "pane.inspect": "Inspect",
    "pane.rebuildState": "Rebuild State",
    "rightPane.collapse": "Hide right pane",
    "rightPane.expand": "Show right pane",

    "source.openFiles": "Open Files",
    "source.addFiles": "Add Files",
    "source.openFilesSub": "New",
    "source.addFilesSub": "Append",
    "source.current": "Current source",
    "asset.emptySource": "No images found in source/.",
    "source.clearTitle": "Clear current source",

    "preview.original": "Original",
    "preview.reconstructed": "Reconstructed",
    "preview.processSelected": "Process this slide",
    "preview.processPending": "Process pending",
    "preview.reprocessAll": "Reprocess all slides",
    "preview.reprocessAllTitle": "Reprocess all slides from OCR",
    "preview.controls": "Preview Controls",
    "preview.background": "Background image",
    "preview.opacity": "Opacity",
    "preview.textBlocks": "Text Blocks",
    "preview.rebuildElements": "Rebuild Elements",
    "preview.empty": "Drop AI-generated slide images here to preview them.",
    "preview.overlayEmpty": "No overlay layer is currently visible.",

    "clip.assist": "Clip Assist",
    "clip.grid": "Grid",
    "clip.pitch": "Pitch",
    "clip.snap": "Snap",
    "clip.origin": "Origin",
    "clip.originTopLeft": "Top left",
    "clip.originCenter": "Center",
    "clip.originTopCenter": "Top center",

    "assist.menu": "Assist Menu",
    "assist.theme": "Theme",
    "assist.textSettings": "Text Settings",
    "assist.assetEdit": "Asset Edit",

    "rebuild.title": "Rebuild",
    "pptx.open": "Open PPTX",
    "pptx.export": "Export PPTX",
    "folder.openShort": "Folder",

    "selected.title": "Selected Item",
    "selected.assetReadyNote": "This asset has been materialized as an image file. BBox editing and re-crop will be handled in a future update.",
    "selected.emptyHint": "Click an element on the reconstructed tab to show its details here.",
    "selected.assetNotFound": "Selected Asset was not found.",
    "selected.kind": "Type",
    "selected.kindAsset": "Image Asset",
    "selected.kindCandidate": "Asset Candidate",
    "selected.fileName": "File Name",
    "selected.createdBy": "Created By",
    "selected.status": "Status",
    "selected.acceptedAsset": "Asset",
    "selected.role": "Role",
    "selected.confidence": "Confidence",
    "selected.material": "Asset",
    "selected.materialCandidate": "Asset Candidate",
    "selected.materialSettingsTitle": "Asset",
    "selected.localRepair": "Local Asset Repair",
    "selected.openMaterialSettings": "Open Asset Settings",
    "selected.materialFixedEntryNote": "For now, this entry point is fixed. Each operation will be exported non-destructively as an asset variant.",
    "selected.candidateNotFound": "Selected Candidate was not found.",
    "selected.elementNotFound": "Selected element was not found.",
    "selected.candidateAdjustNote": "Adjust the area with the bbox handles on Preview before accepting.",
    "candidate.deleteCandidate": "Delete Candidate",

    "assets.title": "Assets",
    "assets.empty": "No assets yet.",
    "asset.overlay": "Asset Overlay",
    "asset.clipMode": "Asset Clip Mode",
    "asset.confirmClip": "Confirm Clip",
    "asset.clipOff": "Asset Clip Mode is OFF.",
    "asset.detectCandidates": "Detect Candidates",
    "asset.useInPptx": "Use in PPTX",

    "candidates.title": "Candidates",
    "candidates.empty": "No candidates yet.",
    "candidates.noActive": "No active candidates.",
    "candidate.overlay": "Candidate Overlay",
    "candidate.acceptSelected": "Accept + PPTX",
    "candidate.acceptAll": "Accept All + PPTX",
    "candidate.statusNotLoaded": "Asset Candidates: not loaded.",
    "candidate.statusLoaded": "Asset Candidates: {count}",

    "modal.workspace": "WORKSPACE",
    "modal.openFiles": "Open Files",
    "modal.openFolder": "Open Folder",
    "upload.dropMain": "Drop files here, or click to select",
    "upload.dropSub": "PNG / JPG / JPEG / WEBP / BMP / TIFF / PDF",
    "upload.clipboard": "Add clipboard image",
    "upload.addImage": "Add image",
    "upload.addPdf": "Add PDF",

    "settings.title": "Settings",
    "settings.assistMenu": "Assist Menu",
    "settings.themeStyleNote": "Switch between Theme / Style Settings. Theme applies to the whole deck. Style Settings edit text elements.",
    "settings.saveStyle": "Save Style",
    "settings.saveAllDrafts": "Save All Drafts",
    "settings.saveAllDraftsTitle": "Save all unsaved style drafts",
    "settings.noStyleDraftsToSave": "No style drafts to save.",
    "settings.saveAllDraftsSaved": "Saved {saved} style draft(s).",
    "settings.saveAllDraftsSavedSynced": "Saved {saved} style draft(s) / current theme synced.",
    "settings.saveAllDraftsFailed": "Save All Drafts failed: {message}",
    "settings.styleSaveNote": "Saving updates sector_defaults.json. The change is applied to PPTX on the next build.",
    "settings.loadingTextStyles": "Loading text styles...",

    "previewContext.assetTitle": "Asset",
    "previewContext.textRoleTitle": "Text Role",
    "previewContext.clearSelection": "Clear selection",
    "previewContext.openAssetPreview": "Open Asset Preview",
    "previewContext.adjustAssetBBox": "Adjust Asset BBox",
    "previewContext.includeInPptx": "Include in PPTX",
    "previewContext.excludeFromPptx": "Exclude from PPTX",
    "previewContext.deleteAsset": "Delete Asset",
    "previewContext.setRoleH1": "Set as Left H1",
    "previewContext.setRoleH2": "Set as Left H2",
    "previewContext.setRoleBody": "Set as Left p",
    "previewContext.setRoleCenterH1": "Set as Center H1",
    "previewContext.setRoleCenterH2": "Set as Center H2",
    "previewContext.setRoleCenterBody": "Set as Center p",
    "previewContext.setRoleFooter": "Set as Footer Note",
    "previewContext.setRoleMeta": "Set as Meta Small",
    "previewContext.setRoleCardTitle": "Set as Card / Title",
    "previewContext.setRoleCardBody": "Set as Card / Body",
    "previewContext.setRoleCardNote": "Set as Card / Note",
    "previewContext.setRoleCardMeta": "Set as Card / Meta",
    "previewContext.deleteFromRebuild": "Delete from Rebuild",

    "dialog.deleteSlideConfirm": "Delete {slideId}?\n\nRelated OCR / text_blocks / rebuild_spec / assets will also be deleted. Existing PPTX files will not be deleted.",
    "dialog.clearSourceConfirm": "Clear all Current source files?\n\nSource images and related OCR / text_blocks / rebuild_spec / assets will be deleted. Existing PPTX files and Workspace registrations will not be deleted.",
    "dialog.rebuildElementMissing": "The matching Rebuild Element was not found. Select it from the Rebuild Elements layer before changing it.",
    "dialog.deleteTextElementConfirm": "Delete this text element from the rebuild target?\n\nThe original image and OCR raw data will not be deleted.",
    "dialog.updateRebuildElementFailed": "Failed to update rebuild element: {message}",
    "dialog.assetPreviewUnavailable": "Asset Preview is not available.",
    "dialog.assetNotFound": "Asset was not found.",
    "dialog.deleteAssetConfirm": "Delete {assetId}?",
    "dialog.togglePptxFailed": "Failed to toggle PPTX output: {message}",

    "theme.limitReached": "Theme limit reached: {count} / {max}",
    "theme.limitReachedTitle": "Theme limit reached",
    "theme.duplicateTitle": "Duplicate theme",
    "theme.createFailed": "Theme create failed: {message}",
    "theme.createError": "Theme create error: {message}",
    "theme.duplicateFailed": "Theme duplicate failed: {message}",
    "theme.duplicateError": "Theme duplicate error: {message}",
    "theme.renameFailed": "Theme rename failed: {message}",
    "theme.renameError": "Theme rename error: {message}",
    "theme.deleteConfirm": "Delete this theme?\n\n{label}",
    "theme.deleteCurrentConfirm": "This theme is currently applied. Delete it anyway?\n\n{label}",
    "theme.deleteFileConfirm": "Delete theme \"{label}\"?\n\nThis removes json/themes/{themeId}.json.",
    "theme.deleteFailed": "Theme delete failed: {message}",
    "theme.deleteError": "Theme delete error: {message}",
    "theme.applyConfirm": "Apply theme \"{themeName}\" to the entire deck?",
    "theme.applyFailed": "Theme apply failed: {message}",
    "theme.applyError": "Theme apply error: {message}",
    "theme.saveFailed": "Theme save failed: {message}",
    "theme.saveError": "Theme save error: {message}",
    "theme.loadConfirm": "Load theme \"{themeId}\" into sector_defaults.json?\n\nCurrent role styles will be replaced.",
    "theme.loadFailed": "Theme load failed: {message}",
    "theme.loadError": "Theme load error: {message}",
    "theme.noThemeSelected": "No theme selected.",
    "theme.nameCreateTitle": "Create Theme",
    "theme.nameRenameTitle": "Rename Theme",
    "theme.nameCreateNote": "Create a new theme from current settings.",
    "theme.nameRenameNote": "Update the display name of this saved theme.",
    "theme.nameCreateSubmit": "Create",
    "theme.nameRenameSubmit": "Rename",
    "theme.userThemeDefaultName": "User Theme",

    "assetEdit.selectAssetOrCandidate": "Select an Asset or Candidate before opening Asset Edit.",
    "assetEdit.title": "Asset Edit",
    "assetEdit.panelTitle": "Asset Edit",
    "assetEdit.panelDescription": "Run text erasing, transparency, and local repair on image assets as non-destructive variants. Actual editing is done in the Asset Edit modal or Preview Workspace.",
    "assetEdit.textEraserDescription": "Erase OCR text regions.",
    "assetEdit.candidateTitle": "Asset Edit: Candidate",
    "assetEdit.modalOpenFailed": "Asset Edit modal could not be opened.",
    "assetEdit.sourceColorRequired": "Select Source Color from the image first.",
    "assetEdit.sourceAndTargetColorRequired": "Select Source Color and Target Color first.",
    "assetEdit.noAssetSelected": "No asset selected.",
    "assetEdit.assetNotSelected": "Asset is not selected.",
    "assetEdit.applyRecolorConfirm": "Apply Recolor and create a new asset variant?",
    "assetEdit.recolorFailed": "Recolor failed: {message}",
    "assetEdit.noQuickRepairRectangles": "No quick repair rectangles yet.",
    "assetEdit.quickRepairFailed": "Quick Repair failed: {message}",
    "assetEdit.textEraserAcceptedAssetRequired": "Text Eraser requires an accepted Asset.",
    "assetEdit.textEraserCandidateFirstRequired": "Text Eraser requires an accepted Asset. Accept this candidate first.",
    "assetEdit.applyTextEraserConfirm": "Apply Text Eraser v1 and create a new asset variant?",
    "assetEdit.textEraserFailed": "Text Eraser failed: {message}",
    "assetEdit.fillOpacityAcceptedAssetRequired": "Fill Opacity requires an accepted Asset.",
    "assetEdit.fillOpacityCandidateFirstRequired": "Fill Opacity requires an accepted Asset. Accept this candidate first.",
    "assetEdit.applyFillOpacityConfirm": "Apply Fill Opacity v1 and create a new asset variant?",
    "assetEdit.fillOpacityTargetRequired": "Select either Background or Fill.",
    "assetEdit.fillOpacityFailed": "Fill Opacity failed: {message}",
    "assetEdit.assetPreviewUrlNotFound": "Asset preview URL was not found.",
    "assetEdit.currentAssetNotFound": "Current Asset was not found.",
    "assetEdit.rootSourceAssetNotFound": "Root source asset was not found.",
    "assetEdit.alreadySourceAsset": "This is already the source/original asset.",
    "assetEdit.variantDeleteFailed": "Variant delete failed: {message}",
    "assetEdit.quickRepairOverwriteConfirm": "Overwrite this asset with Quick Repair?",
    "assetEdit.quickRepairSaveVariantConfirm": "Save Quick Repair as a new variant?",
    "assetEdit.returnToSourceConfirm": "Return to the source asset?\n\nThe current target is a variant.\nChoose OK to return to the source asset.",
    "assetEdit.returnToSourceButton": "Return to source asset",
    "assetEdit.nonDestructiveNote": "Asset Edit is non-destructive. The original image is kept, and processing results are generated as new variants. Use Return to source asset if you want to stop working on the current variant.",
    "assetEdit.openHelpTitle": "Open the Asset Edit explanation and entry point.",
    "assetEdit.returnToRootSourceConfirm": "Return to the source asset?\n\nThe current target is a variant.\nDestination: {rootId}",
    "assetEdit.deleteVariantBeforeReturnConfirm": "Delete this variant before returning to the source asset?\n\nOK: return and delete\nCancel: return and keep the variant",
    "dialog.deleteAssetUnavailable": "Delete Asset is not available.",
    "materialOp.textEraser": "Text Eraser",
    "materialOp.fillOpacity": "Fill Opacity",
    "materialOp.quickRepair": "Quick Repair",
    "materialOp.recolor": "Recolor",
    "assetKind.variant": "Variant",
    "assetKind.original": "Original",
    "textStyle.roleStyle": "Role Style",
    "textStyle.category": "Category",
    "textStyle.styleRef": "Style Ref",
    "textStyle.fontFamily": "Font family",
    "textStyle.fontSize": "Font size",
    "textStyle.color": "Color",
    "textStyle.align": "Align",
    "textStyle.style": "Style",
    "textStyle.alignLeft": "Left",
    "textStyle.alignCenter": "Center",
    "textStyle.alignRight": "Right",
    "textStyle.toggleFavoriteFont": "Toggle favorite font",
    "textStyle.increaseFontSize": "Increase font size",
    "textStyle.decreaseFontSize": "Decrease font size",
    "textStyle.openColorPalette": "Open color palette",
    "theme.galleryTitle": "Theme Gallery",
    "theme.galleryNote": "Manage saved themes. Edit text styles from Text Settings.",
    "theme.createFromCurrent": "Create from current settings",
    "theme.styleCount": "{count} styles",
    "theme.styleCountFallback": "Styles",
    "theme.currentApplied": "Current / Applied",
    "theme.cardKicker": "Theme",
    "theme.sampleH1": "Aa 123 Heading",
    "theme.sampleH2": "Sub 456 Subheading",
    "theme.sampleBody": "Body 789 Body",
    "theme.applied": "Applied",
    "theme.apply": "Apply",
    "theme.limitCreateNote": "Theme slots: {count} / {max}. Delete a theme to create a new one.",
    "theme.noSavedThemes": "No saved themes",
    "theme.slotHelp": "Theme slots are limited to {max}. Use ⋯ to duplicate, rename, or delete themes.",
    "theme.currentTheme": "Current theme",
    "theme.notLoaded": "Not loaded",
    "theme.loadedAt": "Loaded at",
    "theme.currentSectorDefaults": "Current sector_defaults.json",
    "theme.designSystem": "Design System",
    "theme.designSystemNote": "Create theme tokens from colors extracted from the slide.",
    "theme.designSystemCollapsed": "Design System editor is collapsed",
    "theme.designSystemCollapsedNote": "Expand to edit theme tokens and extracted slide colors.",
    "theme.designSystemPreviewAria": "Design System preview colors: Main, Sub, Accent",
    "theme.expand": "Expand",
    "theme.collapse": "Collapse",
    "theme.reload": "Reload",
    "theme.save": "Save",
    "theme.tokensTitle": "Theme Tokens",
    "theme.tokensNote": "These are Design System colors. Select a token, then choose an extracted color.",
    "theme.sampledColors": "Extracted colors",
    "theme.sampledColorsNote": "Colors extracted from the current slide. Theme tokens are not overwritten automatically.",
    "theme.refreshSlideColors": "Re-extract slide colors",
    "theme.sampledColorsEmpty": "Extracted colors are not loaded",
    "theme.updatedAt": "Updated at",
    "theme.notExtracted": "Not extracted",
    "theme.source": "Source",
    "theme.sourceCurrentSlide": "Source: current slide image",
    "theme.selected": "Selected",
    "theme.copy": "Copy",
    "theme.assignTo": "Assign to",

    "language.toggle.en": "Switch to English",
    "language.toggle.ja": "Switch to Japanese",
    "theme.toggle.dark": "Switch to dark appearance",
    "theme.toggle.light": "Switch to light appearance"
  }
};

function uiText(key, fallback = "") {
  const messages = UI_I18N[currentLanguage] || UI_I18N.en;
  return messages[key] || UI_I18N.en[key] || fallback || key;
}

function formatUiText(key, values = {}, fallback = "") {
  return uiText(key, fallback).replace(/\{([a-zA-Z0-9_]+)\}/g, (match, name) => {
    return Object.prototype.hasOwnProperty.call(values, name) ? String(values[name]) : match;
  });
}

function applyLanguage() {
  document.body.dataset.lang = currentLanguage;

  document.querySelectorAll("[data-i18n]").forEach((el) => {
    const key = el.dataset.i18n;
    if (key) el.textContent = uiText(key, el.textContent);
  });

  document.querySelectorAll("[data-i18n-title]").forEach((el) => {
    const key = el.dataset.i18nTitle;
    if (key) el.title = uiText(key, el.title);
  });

  document.querySelectorAll("[data-i18n-placeholder]").forEach((el) => {
    const key = el.dataset.i18nPlaceholder;
    if (key) el.placeholder = uiText(key, el.placeholder);
  });

  document.querySelectorAll("[data-i18n-aria-label]").forEach((el) => {
    const key = el.dataset.i18nAriaLabel;
    if (key) el.setAttribute("aria-label", uiText(key, el.getAttribute("aria-label") || ""));
  });

  refreshLanguageSensitiveUi();
}

function refreshLanguageSensitiveUi() {
  if (typeof renderRightAssets === "function") renderRightAssets();
  if (typeof renderRightCandidates === "function") renderRightCandidates();
  if (typeof renderInspector === "function") renderInspector();
  if (typeof renderBottomPreview === "function") renderBottomPreview();

  if (typeof window.refreshAssistLanguageSensitiveUi === "function") {
    window.refreshAssistLanguageSensitiveUi();
  }
}

function applyUiPreferences() {
  document.body.dataset.theme = currentTheme;

  applyLanguage();

  const langBtn = $("langToggleBtn");
  if (langBtn) {
    langBtn.textContent = currentLanguage === "ja" ? "EN" : "JA";
    langBtn.title = currentLanguage === "ja" ? uiText("language.toggle.en") : uiText("language.toggle.ja");
  }

  const themeBtn = $("themeToggleBtn");
  if (themeBtn) {
    themeBtn.textContent = currentTheme === "dark" ? "☾" : "☀";
    themeBtn.title = currentTheme === "dark" ? uiText("theme.toggle.light") : uiText("theme.toggle.dark");
  }

  if (typeof applyBottomPaneHeight === "function") {
    applyBottomPaneHeight(aidrBottomPaneHeight, { skipStorage: true });
  }

  if (typeof setBottomPaneMode === "function") {
    setBottomPaneMode(aidrBottomPaneMode, { skipStorage: true });
  }
}

function toggleLanguage() {
  currentLanguage = currentLanguage === "ja" ? "en" : "ja";
  localStorage.setItem("adr_language", currentLanguage);
  applyUiPreferences();

  const langBtn = $("langToggleBtn");
  if (langBtn) langBtn.blur();

  log(`language: ${currentLanguage}`);
}
function refreshPreviewLayoutAfterPaneChange() {
  const refresh = () => {
    window.dispatchEvent(new Event("resize"));

    if (typeof renderPreview === "function") renderPreview();
    if (typeof renderAssetOverlays === "function") renderAssetOverlays();
    if (typeof renderCandidateOverlays === "function") renderCandidateOverlays();
  };

  requestAnimationFrame(refresh);
  window.setTimeout(refresh, 80);
}

function setRightPaneCollapsed(collapsed) {
  const isCollapsed = Boolean(collapsed);
  document.body.classList.toggle("aidr-right-pane-collapsed", isCollapsed);

  const expandTab = document.getElementById("aidrRightPaneExpandTab");
  const collapseBtn = document.getElementById("aidrRightPaneCollapseBtn");

  if (expandTab) expandTab.hidden = !isCollapsed;

  if (collapseBtn) {
    collapseBtn.setAttribute("aria-expanded", isCollapsed ? "false" : "true");
  }

  refreshPreviewLayoutAfterPaneChange();
}

function collapseRightPane() {
  setRightPaneCollapsed(true);
}

function expandRightPane() {
  setRightPaneCollapsed(false);
}

window.setRightPaneCollapsed = setRightPaneCollapsed;
window.collapseRightPane = collapseRightPane;
window.expandRightPane = expandRightPane;


function toggleTheme() {
  currentTheme = currentTheme === "dark" ? "light" : "dark";
  localStorage.setItem("adr_theme", currentTheme);
  applyUiPreferences();

  const themeBtn = $("themeToggleBtn");
  if (themeBtn) themeBtn.blur();

  log(`theme: ${currentTheme}`);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", applyUiPreferences);
} else {
  applyUiPreferences();
}


function log(message) {
  const el = $("runLog");
  const time = new Date().toLocaleTimeString();
  el.textContent += `[${time}] ${message}\n`;
  el.scrollTop = el.scrollHeight;
}

let runSpinnerTimer = null;
let runSpinnerFrame = 0;
let runSpinnerLine = "";
let runSpinnerLabel = "";

const runSpinnerFrames = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];

function setRunSpinnerLine(line) {
  const el = $("runLog");
  if (!el) return;

  const text = el.textContent || "";
  if (runSpinnerLine && text.includes(runSpinnerLine)) {
    el.textContent = text.replace(runSpinnerLine, line);
  } else {
    el.textContent += line;
  }

  runSpinnerLine = line;
  el.scrollTop = el.scrollHeight;
}

function renderRunSpinnerLine() {
  if (!runSpinnerLabel) return;

  const time = new Date().toLocaleTimeString();
  const frame = runSpinnerFrames[runSpinnerFrame % runSpinnerFrames.length];
  runSpinnerFrame += 1;

  setRunSpinnerLine(`[${time}] ${frame} ${runSpinnerLabel} running\n`);
}

function startRunSpinner(label) {
  stopRunSpinner();

  runSpinnerLabel = label;
  runSpinnerFrame = 0;
  renderRunSpinnerLine();

  runSpinnerTimer = window.setInterval(renderRunSpinnerLine, 120);
}

function stopRunSpinner(finalMessage = "", isError = false) {
  if (runSpinnerTimer) {
    window.clearInterval(runSpinnerTimer);
    runSpinnerTimer = null;
  }

  if (runSpinnerLine && finalMessage) {
    const time = new Date().toLocaleTimeString();
    const marker = isError ? "[error]" : "[done]";
    setRunSpinnerLine(`[${time}] ${marker} ${finalMessage}\n`);
  }

  runSpinnerLabel = "";
  runSpinnerFrame = 0;
  runSpinnerLine = "";
}

function clearLog() {
  $("runLog").textContent = "";
}

async function copyLog() {
  const text = $("runLog").textContent || "";
  if (!text.trim()) {
    log("copy log: empty");
    return;
  }

  try {
    await navigator.clipboard.writeText(text);
    log("copy log: copied to clipboard");
  } catch (e) {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.left = "-9999px";
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    try {
      document.execCommand("copy");
      log("copy log: copied to clipboard");
    } catch (_) {
      log("ERROR copy log: clipboard unavailable");
    } finally {
      document.body.removeChild(ta);
    }
  }
}

function setBottomPaneMode(mode, options = {}) {
  aidrBottomPaneMode = mode === "preview" ? "preview" : "log";
  if (!options.skipStorage) {
    localStorage.setItem("adr_bottom_pane_mode", aidrBottomPaneMode);
  }

  const pane = $("aidrBottomPane");
  const logTab = $("aidrBottomLogTab");
  const previewTab = $("aidrBottomPreviewTab");
  const runLog = $("runLog");
  const aidrBottomPreview = $("aidrBottomPreview");

  if (pane) pane.dataset.aidrBottomMode = aidrBottomPaneMode;
  if (logTab) logTab.classList.toggle("is-active", aidrBottomPaneMode === "log");
  if (previewTab) previewTab.classList.toggle("is-active", aidrBottomPaneMode === "preview");
  if (runLog) runLog.style.display = aidrBottomPaneMode === "log" ? "" : "none";
  if (aidrBottomPreview) aidrBottomPreview.style.display = aidrBottomPaneMode === "preview" ? "block" : "none";

  updateBottomPreviewZoomLabel();
  if (aidrBottomPaneMode === "preview") renderBottomPreview();
}

function updateBottomPreviewZoomLabel() {
  const label = $("aidrBottomPreviewZoomLabel");
  if (label) label.textContent = `${Math.round(aidrBottomPreviewZoom * 100)}%`;
}

function adjustBottomPreviewZoom(delta) {
  aidrBottomPreviewZoom = Math.min(3, Math.max(0.25, Number((aidrBottomPreviewZoom + delta).toFixed(2))));
  updateBottomPreviewZoomLabel();
  renderBottomPreview();
}

function resetBottomPreviewZoom() {
  aidrBottomPreviewZoom = 1;
  updateBottomPreviewZoomLabel();
  renderBottomPreview();
}

function aidrBottomPreviewBoxLabel(value) {
  if (!value) return "-";
  if (Array.isArray(value)) return `[${value.map((item) => String(item)).join(", ")}]`;
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function normalizeBottomPreviewColor(value, fallback = "#111827") {
  const raw = String(value || "").replace("#", "").trim();
  return /^[0-9a-fA-F]{6}$/.test(raw) ? `#${raw}` : fallback;
}

function getSelectedTextPreviewTarget() {
  if (!selectedElementKey) return null;

  if (selectedElementKey.startsWith("textblock:")) {
    const rawKey = selectedElementKey.slice("textblock:".length);
    const item = currentBlocks.find((block, i) => elementKey(block, i) === rawKey);
    return item ? { item, type: "Text Block" } : null;
  }

  if (selectedElementKey.startsWith("rebuild:")) {
    const rawKey = selectedElementKey.slice("rebuild:".length);
    const item = currentElements.find((el, i) => elementKey(el, i) === rawKey);
    return item ? { item, type: "Rebuild Element" } : null;
  }

  return null;
}

function renderBottomTextPreview(target) {
  const item = target.item || {};
  const styleRef = elementStyleRef(item);
  const style = styleRef ? (currentThemeStyles?.[styleRef] || {}) : {};
  const text = elementText(item);
  const fontFamily = style.font_family || item.font_family || item.style?.font_family || "sans-serif";
  const fontSizeRaw = Number(style.font_size ?? item.font_size ?? item.style?.font_size ?? 18);
  const fontSize = Number.isFinite(fontSizeRaw) ? Math.max(6, Math.min(96, fontSizeRaw)) : 18;
  const color = normalizeBottomPreviewColor(style.color ?? item.color ?? item.style?.color);
  const weight = style.bold || item.bold || item.style?.bold ? 700 : 400;
  const bbox = aidrBottomPreviewBoxLabel(extractRawBox(item));

  return `
    <div class="aidr-bottom-preview-card aidr-bottom-text-preview-card">
      <div class="aidr-bottom-preview-head">
        <div>
          <div class="aidr-bottom-preview-kicker">${escapeHtml(uiText("bottom.textPreview"))}</div>
          <strong>${escapeHtml(styleRef || target.type || "Text")}</strong>
        </div>
        <div class="aidr-bottom-preview-meta">${escapeHtml(target.type || "-")}</div>
      </div>
      <div class="aidr-bottom-preview-meta-grid">
        <span>${escapeHtml(uiText("bottom.font"))}: <strong>${escapeHtml(fontFamily)}</strong></span>
        <span>${escapeHtml(uiText("bottom.size"))}: <strong>${escapeHtml(String(fontSize))}pt</strong></span>
        <span>${escapeHtml(uiText("bottom.color"))}: <strong>${escapeHtml(color)}</strong></span>
        <span>${escapeHtml(uiText("bottom.bbox"))}: <strong>${escapeHtml(bbox)}</strong></span>
      </div>
      <div
        class="aidr-bottom-text-render"
        style="font-family:${escapeAttr(fontFamily)}, sans-serif;font-size:${fontSize}pt;font-weight:${weight};color:${escapeAttr(color)};"
      >${escapeHtml(text || "")}</div>
    </div>
  `;
}

function renderBottomAssetPreview(asset) {
  const bbox = aidrBottomPreviewBoxLabel(asset?.bbox_px);
  const url = asset?.url ? `${asset.url}?t=${Date.now()}` : "";
  const zoomPct = Math.round(aidrBottomPreviewZoom * 100);
  const assetWidthPx = Array.isArray(asset?.bbox_px) ? Number(asset.bbox_px[2]) : 0;
  const imageWidthStyle = Number.isFinite(assetWidthPx) && assetWidthPx > 0
    ? `width:${Math.max(1, Math.round(assetWidthPx * aidrBottomPreviewZoom))}px;max-width:none;`
    : "width:auto;max-width:none;";

  return `
    <div class="aidr-bottom-preview-card aidr-bottom-asset-preview-card">
      <div class="aidr-bottom-preview-head">
        <div>
          <div class="aidr-bottom-preview-kicker">${escapeHtml(uiText("bottom.assetPreview"))}</div>
          <strong>${escapeHtml(asset?.asset_id || "-")}</strong>
        </div>
        <div class="aidr-bottom-preview-meta">${escapeHtml(asset?.filename || "-")}</div>
      </div>
      <div class="aidr-bottom-preview-meta-grid">
        <span>${escapeHtml(uiText("bottom.bbox"))}: <strong>${escapeHtml(bbox)}</strong></span>
        <span>zoom: <strong>${zoomPct}%</strong></span>
      </div>
      <div class="aidr-bottom-asset-preview-stage">
        ${url ? `<img class="aidr-bottom-asset-preview-img" src="${url}" alt="${escapeAttr(asset?.filename || asset?.asset_id || "asset")}" style="${imageWidthStyle}">` : `<div class="aidr-bottom-preview-empty">${escapeHtml(uiText("bottom.previewUnsupported"))}</div>`}
      </div>
    </div>
  `;
}

function renderBottomPreview() {
  const el = $("aidrBottomPreview");
  if (!el) return;

  if (!selectedElementKey) {
    el.innerHTML = `<div class="aidr-bottom-preview-empty">${escapeHtml(uiText("bottom.previewEmpty"))}</div>`;
    return;
  }

  if (selectedElementKey.startsWith("asset:")) {
    const assetId = selectedElementKey.slice("asset:".length);
    const asset = getSelectedAsset(assetId);
    el.innerHTML = asset
      ? renderBottomAssetPreview(asset)
      : `<div class="aidr-bottom-preview-empty">${escapeHtml(uiText("selected.assetNotFound"))}</div>`;
    return;
  }

  const textTarget = getSelectedTextPreviewTarget();
  if (textTarget) {
    el.innerHTML = renderBottomTextPreview(textTarget);
    return;
  }

  el.innerHTML = `<div class="aidr-bottom-preview-empty">${escapeHtml(uiText("bottom.previewUnsupported"))}</div>`;
}

function getBottomPaneMaxHeight() {
  return Math.max(220, Math.floor(window.innerHeight * BOTTOM_PANE_MAX_RATIO));
}

function clampBottomPaneHeight(height) {
  const maxHeight = getBottomPaneMaxHeight();
  const raw = Number(height);
  if (!Number.isFinite(raw)) return BOTTOM_PANE_DEFAULT_HEIGHT;
  return Math.max(BOTTOM_PANE_MIN_HEIGHT, Math.min(maxHeight, Math.round(raw)));
}

function applyBottomPaneHeight(height, options = {}) {
  aidrBottomPaneHeight = clampBottomPaneHeight(height);
  document.documentElement.style.setProperty("--console-h", `${aidrBottomPaneHeight}px`);

  if (!options.skipStorage) {
    localStorage.setItem("adr_bottom_pane_height", String(aidrBottomPaneHeight));
  }

  refreshPreviewLayoutAfterPaneChange();
}

function setBottomPaneCollapsed(collapsed) {
  const isCollapsed = Boolean(collapsed);
  document.body.classList.toggle("aidr-bottom-collapsed", isCollapsed);

  const btn = $("logToggle");
  if (btn) btn.textContent = isCollapsed ? "▶" : "▼";

  refreshPreviewLayoutAfterPaneChange();
}

function toggleRunLog() {
  setBottomPaneCollapsed(!document.body.classList.contains("aidr-bottom-collapsed"));
}

function resetBottomPaneHeight() {
  setBottomPaneCollapsed(false);
  applyBottomPaneHeight(BOTTOM_PANE_DEFAULT_HEIGHT);
}

function startBottomPaneResize(event) {
  if (!event) return;

  event.preventDefault();
  event.stopPropagation();

  const handle = event.currentTarget;
  if (handle?.setPointerCapture && event.pointerId !== undefined) {
    try {
      handle.setPointerCapture(event.pointerId);
    } catch (e) {}
  }

  document.body.classList.add("aidr-bottom-pane-resizing");

  const onMove = (moveEvent) => {
    const nextHeight = window.innerHeight - moveEvent.clientY;

    if (nextHeight <= BOTTOM_PANE_COLLAPSE_THRESHOLD) {
      setBottomPaneCollapsed(true);
      return;
    }

    setBottomPaneCollapsed(false);
    applyBottomPaneHeight(nextHeight, { skipStorage: true });
  };

  const onUp = () => {
    document.body.classList.remove("aidr-bottom-pane-resizing");

    if (!document.body.classList.contains("aidr-bottom-collapsed")) {
      localStorage.setItem("adr_bottom_pane_height", String(aidrBottomPaneHeight));
    }

    window.removeEventListener("pointermove", onMove);
    window.removeEventListener("pointerup", onUp);
    window.removeEventListener("pointercancel", onUp);
  };

  window.addEventListener("pointermove", onMove);
  window.addEventListener("pointerup", onUp);
  window.addEventListener("pointercancel", onUp);
}

window.startBottomPaneResize = startBottomPaneResize;
window.resetBottomPaneHeight = resetBottomPaneHeight;

async function fetchJson(url, options = {}) {
  const res = await fetch(url, options);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `${res.status} ${res.statusText}`);
  }
  return data;
}

function badge(label, ok) {
  return `<span class="badge ${ok ? "ok" : "warn"}">${label}</span>`;
}


function styleValueLabel(style) {
  const font = style.font_family || "-";
  const size = style.font_size ?? "-";
  const weight = style.bold ? "bold" : "regular";
  const color = style.color ? `#${String(style.color).replace("#", "")}` : "-";
  return `${font} / ${size}pt / ${weight} / ${color}`;
}



function normalizeFontName(name) {
  return String(name || "").trim();
}

function fontKey(name) {
  return normalizeFontName(name).toLowerCase();
}

function uniqueSortedFonts(names) {
  const seen = new Set();
  const out = [];

  (names || []).forEach((name) => {
    const normalized = normalizeFontName(name);
    if (!normalized) return;

    const key = fontKey(normalized);
    if (seen.has(key)) return;

    seen.add(key);
    out.push(normalized);
  });

  return out.sort((a, b) => a.localeCompare(b));
}

function favoriteFonts() {
  const hiddenKeys = new Set((hiddenDefaultFavoriteFonts || []).map(fontKey));

  const systemFavorites = uniqueSortedFonts(systemFavoriteFonts || [])
    .filter((name) => !hiddenKeys.has(fontKey(name)));

  return uniqueSortedFonts([
    ...systemFavorites,
    ...(userFavoriteFonts || []),
  ]);
}

function isSystemFavoriteFont(name) {
  const key = fontKey(name);
  if (!key) return false;

  return (systemFavoriteFonts || []).some((font) => fontKey(font) === key);
}

function isHiddenDefaultFavoriteFont(name) {
  const key = fontKey(name);
  if (!key) return false;

  return (hiddenDefaultFavoriteFonts || []).some((font) => fontKey(font) === key);
}

function isFavoriteFont(name) {
  const key = fontKey(name);
  if (!key) return false;

  return favoriteFonts().some((font) => fontKey(font) === key);
}

function fontOptionsHtml(selectedFont = "") {
  const selected = normalizeFontName(selectedFont);
  const selectedKey = fontKey(selected);

  const favorites = favoriteFonts();
  const favoriteKeys = new Set(favorites.map(fontKey));

  const detected = uniqueSortedFonts(systemFonts || [])
    .filter((name) => !favoriteKeys.has(fontKey(name)));

  const makeOptions = (names) => names.map((name) => {
    const isSelected = fontKey(name) === selectedKey;
    return `<option value="${escapeAttr(name)}" ${isSelected ? "selected" : ""}>${escapeHtml(name)}</option>`;
  }).join("");

  const selectedInKnown = [...favorites, ...detected].some((name) => fontKey(name) === selectedKey);

  const currentOption = selected && !selectedInKnown
    ? `<optgroup label="Current"><option value="${escapeAttr(selected)}" selected>${escapeHtml(selected)}</option></optgroup>`
    : "";

  return `
    ${currentOption}
    <optgroup label="Favorites">
      ${makeOptions(favorites)}
    </optgroup>
    <optgroup label="Detected Fonts">
      ${makeOptions(detected)}
    </optgroup>
  `;
}

function updateFontFavoriteButton() {
  const btn = $("fontFavoriteBtn");
  const select = $("styleEditFontFamily");
  if (!btn || !select) return;

  const name = select.value || "";
  const active = isFavoriteFont(name);

  btn.textContent = active ? "★" : "☆";
  btn.classList.toggle("active", active);
}

function toggleCurrentFontFavorite() {
  const select = $("styleEditFontFamily");
  if (!select) return;

  const name = normalizeFontName(select.value);
  if (!name) return;

  const key = fontKey(name);
  const currentlyFavorite = isFavoriteFont(name);
  const systemFavorite = isSystemFavoriteFont(name);

  if (currentlyFavorite) {
    if (systemFavorite) {
      hiddenDefaultFavoriteFonts = uniqueSortedFonts([
        ...(hiddenDefaultFavoriteFonts || []),
        name,
      ]);
      localStorage.setItem("adr_hidden_default_fonts", JSON.stringify(hiddenDefaultFavoriteFonts));
    }

    userFavoriteFonts = (userFavoriteFonts || []).filter((font) => fontKey(font) !== key);
    localStorage.setItem("adr_favorite_fonts", JSON.stringify(userFavoriteFonts));
  } else {
    if (systemFavorite && isHiddenDefaultFavoriteFont(name)) {
      hiddenDefaultFavoriteFonts = (hiddenDefaultFavoriteFonts || []).filter((font) => fontKey(font) !== key);
      localStorage.setItem("adr_hidden_default_fonts", JSON.stringify(hiddenDefaultFavoriteFonts));
    } else {
      userFavoriteFonts = uniqueSortedFonts([...(userFavoriteFonts || []), name]);
      localStorage.setItem("adr_favorite_fonts", JSON.stringify(userFavoriteFonts));
    }
  }

  select.innerHTML = fontOptionsHtml(name);
  select.value = name;
  updateFontFavoriteButton();

  log(`font favorite updated: ${name}`);
}

async function loadSystemFonts(options = {}) {
  const force = !!options.force;

  if (!force && systemFontsLoaded) {
    return { fonts: systemFonts, favorite_fonts: systemFavoriteFonts, cached: true };
  }

  if (!force && systemFontsLoadingPromise) {
    return systemFontsLoadingPromise;
  }

  systemFontsLoadingPromise = (async () => {
    try {
      const data = await fetchJson("/api/system/fonts");
      systemFavoriteFonts = data.favorite_fonts || [];
      systemFonts = data.fonts || [];
      systemFontsLoaded = true;
      log(`system fonts loaded: ${systemFonts.length}`);
      return data;
    } catch (e) {
      log(`WARN system fonts: ${e.message}`);
      return { fonts: systemFonts, favorite_fonts: systemFavoriteFonts, cached: true, error: e.message };
    } finally {
      systemFontsLoadingPromise = null;
    }
  })();

  return systemFontsLoadingPromise;
}


function renderThemeStyles() {
  const el = $("themeStyleList");
  if (!el) {
    log("ERROR renderThemeStyles: themeStyleList not found");
    return;
  }

  try {
    const styles = currentThemeStyles || {};
    const styleRef = selectedThemeStyleRef || getCurrentSelectedStyleRef() || "";
    const style = styleRef ? styles[styleRef] : null;

    if (!styleRef) {
      el.innerHTML = `
        <div class="selected-empty">
          style_ref が未選択です。Selected Item の歯車から開いてください。
        </div>
      `;
      log("renderThemeStyles: waiting for selected style_ref");
      return;
    }

    if (!style) {
      el.innerHTML = `
        <div class="selected-empty">
          <div>style_ref not found: ${escapeHtml(styleRef)}</div>
          <div class="tiny-note">loaded styles: ${Object.keys(styles).length}</div>
        </div>
      `;
      log(`ERROR renderThemeStyles: style not found ${styleRef}, styles=${Object.keys(styles).length}`);
      return;
    }

    selectedThemeStyleRef = styleRef;

    const color = style.color ? String(style.color).replace("#", "") : "";
    const swatch = color
      ? `<span class="style-color-swatch" style="background:#${color}"></span>`
      : `<span class="style-color-swatch empty"></span>`;

    const align = style.align || "left";
    const fontFamily = style.font_family || "Yu Gothic";
    const fontSize = style.font_size ?? 12;

    el.innerHTML = `
      <div class="text-style-item selected-style-item">
        <div class="text-style-head">
          <span class="text-style-name">${escapeHtml(styleRef)}</span>
          ${swatch}
        </div>
        <div class="text-style-meta">${escapeHtml(styleValueLabel(style))}</div>

        <div class="style-edit-form">
          <label class="style-edit-wide">
            <span>${escapeHtml(uiText("textStyle.fontFamily"))}</span>
            <div class="font-family-row">
              <select id="styleEditFontFamily" onchange="updateFontFavoriteButton()">
                ${fontOptionsHtml(fontFamily)}
              </select>
              <button
                id="fontFavoriteBtn"
                type="button"
                class="font-favorite-btn ${isFavoriteFont(fontFamily) ? "active" : ""}"
                onclick="toggleCurrentFontFavorite()"
                title="${escapeAttr(uiText("textStyle.toggleFavoriteFont"))}"
              >${isFavoriteFont(fontFamily) ? "★" : "☆"}</button>
            </div>
          </label>

          <label class="aidr-font-size-field-direct">
            <span>${escapeHtml(uiText("textStyle.fontSize"))}</span>
            <span class="aidr-font-size-combo">
              <input
                id="styleEditFontSize"
                class="aidr-font-size-number"
                type="number"
                min="6"
                max="96"
                step="1"
                value="${escapeAttr(String(fontSize))}"
              >
              <span class="aidr-font-size-spin">
                <button
                  type="button"
                  class="aidr-font-size-spin-btn aidr-font-size-spin-up"
                  onclick="window.aidrAdjustStyleFontSize(1)"
                  title="${escapeAttr(uiText("textStyle.increaseFontSize"))}"
                >▲</button>
                <button
                  type="button"
                  class="aidr-font-size-spin-btn aidr-font-size-spin-down"
                  onclick="window.aidrAdjustStyleFontSize(-1)"
                  title="${escapeAttr(uiText("textStyle.decreaseFontSize"))}"
                >▼</button>
              </span>
            </span>
            <span class="aidr-font-size-unit-compact">pt</span>
          </label>

                  <label>
          <span>${escapeHtml(uiText("textStyle.color"))}</span>
          <div class="style-color-editor-row">
            <button
              id="styleEditColorSwatch"
              type="button"
              class="style-color-edit-swatch"
              style="background:#${escapeAttr(color || "333333")}"
              onclick="window.openStyleColorPopover()"
              title="${escapeAttr(uiText("textStyle.openColorPalette"))}"
            ></button>
            <input
              id="styleEditColor"
              type="text"
              value="${escapeAttr(color)}"
              placeholder="333333"
              oninput="window.syncStyleColorFromText()"
            >
          </div>
        </label>

          <label>
            <span>${escapeHtml(uiText("textStyle.align"))}</span>
            <input id="styleEditAlign" type="hidden" value="${escapeAttr(align)}">
            <div class="style-segment-row">
              <button type="button" class="style-segment-btn ${align === "left" ? "active" : ""}" onclick="setStyleAlign('left')">${escapeHtml(uiText("textStyle.alignLeft"))}</button>
              <button type="button" class="style-segment-btn ${align === "center" ? "active" : ""}" onclick="setStyleAlign('center')">${escapeHtml(uiText("textStyle.alignCenter"))}</button>
              <button type="button" class="style-segment-btn ${align === "right" ? "active" : ""}" onclick="setStyleAlign('right')">${escapeHtml(uiText("textStyle.alignRight"))}</button>
            </div>
          </label>

          <label>
            <span>${escapeHtml(uiText("textStyle.style"))}</span>
            <input id="styleEditBold" type="checkbox" ${style.bold ? "checked" : ""} hidden>
            <input id="styleEditItalic" type="checkbox" ${style.italic ? "checked" : ""} hidden>
            <div class="style-toggle-row">
              <button type="button" id="styleEditBoldBtn" class="style-toggle-btn ${style.bold ? "active" : ""}" onclick="toggleStyleBool('styleEditBold')">B</button>
              <button type="button" id="styleEditItalicBtn" class="style-toggle-btn ${style.italic ? "active" : ""}" onclick="toggleStyleBool('styleEditItalic')"><em>I</em></button>
            </div>
          </label>
        </div>

        <div class="style-edit-actions">
          <button class="btn primary compact-action" onclick="saveSelectedThemeStyle()">${escapeHtml(uiText("settings.saveStyle"))}</button>

        </div>

        <div id="styleEditStatus" class="tiny-note style-edit-note">
          ${escapeHtml(uiText("settings.styleSaveNote"))}
        </div>
      </div>
    `;

    updateFontFavoriteButton();
    log(`render style editor: ${styleRef}`);
  } catch (e) {
    el.innerHTML = `
      <div class="selected-empty">
        ERROR render style editor: ${escapeHtml(e.message)}
      </div>
    `;
    log(`ERROR render style editor: ${e.message}`);
  }
}

async function loadThemeStyles(options = {}) {
  const force = !!options.force;

  if (!force && themeStylesLoaded) {
    return { styles: currentThemeStyles, cached: true };
  }

  if (!force && themeStylesLoadingPromise) {
    return themeStylesLoadingPromise;
  }

  themeStylesLoadingPromise = (async () => {
    try {
      const data = await fetchJson("/api/theme/styles");
      currentThemeStyles = data.styles || {};
      themeStylesLoaded = true;
      return data;
    } catch (e) {
      log(`ERROR theme styles: ${e.message}`);
      return { styles: currentThemeStyles, cached: true, error: e.message };
    } finally {
      themeStylesLoadingPromise = null;
    }
  })();

  return themeStylesLoadingPromise;
}




function getCurrentSelectedStyleRef() {
  if (!selectedElementKey) return "";

  let found = null;

  if (selectedElementKey.startsWith("textblock:")) {
    const rawKey = selectedElementKey.slice("textblock:".length);
    found = currentBlocks.find((item, i) => elementKey(item, i) === rawKey);
  } else if (selectedElementKey.startsWith("rebuild:")) {
    const rawKey = selectedElementKey.slice("rebuild:".length);
    found = currentElements.find((item, i) => elementKey(item, i) === rawKey);
  } else {
    found = currentElements.find((item, i) => elementKey(item, i) === selectedElementKey);
  }

  return found ? elementStyleRef(found) : "";
}

async function openThemeSettings(styleRef = null) {
  const modal = $("themeSettingsModal");
  const list = $("themeStyleList");

  if (!modal || !list) {
    log("ERROR openThemeSettings: modal/list not found");
    return;
  }

  const domStyleRef =
    document.querySelector(".inspect-style-panel[data-style-ref]")?.dataset?.styleRef ||
    document.querySelector(".selected-style-settings-btn[data-style-ref]")?.dataset?.styleRef ||
    "";

  const currentSelectedStyleRef = getCurrentSelectedStyleRef() || "";

  const resolvedStyleRef =
    styleRef ||
    selectedThemeStyleRef ||
    currentSelectedStyleRef ||
    domStyleRef ||
    "";

  log(
    `openThemeSettings args: arg=${styleRef || "-"} selected=${selectedThemeStyleRef || "-"} current=${currentSelectedStyleRef || "-"} dom=${domStyleRef || "-"}`
  );

  if (resolvedStyleRef) {
    selectedThemeStyleRef = resolvedStyleRef;
  }

  const hasThemeStyleCache = !!themeStylesLoaded && Object.keys(currentThemeStyles || {}).length > 0;

  if (hasThemeStyleCache) {
    modal.style.display = "flex";
    renderThemeStyles();
  }

  if (!selectedThemeStyleRef) {
    renderThemeStyles();
    log("ERROR openThemeSettings: no selectedThemeStyleRef");
    return;
  }

  try {
    log("openThemeSettings: loading theme styles");

    await loadThemeStyles();

    log(`openThemeSettings: theme styles ready ${Object.keys(currentThemeStyles).length}`);

    modal.style.display = "flex";
    renderThemeStyles();

    // Fonts are useful for the dropdown, but should not block the modal itself.
    try {
      await loadSystemFonts();
      renderThemeStyles();
      log(`openThemeSettings: fonts ready ${systemFonts.length}`);
    } catch (fontError) {
      log(`WARN openThemeSettings fonts: ${fontError.message}`);
    }

    log(`open style settings: ${selectedThemeStyleRef}`);
  } catch (e) {
    list.innerHTML = `<div class="selected-empty">ERROR loading style settings: ${escapeHtml(e.message)}</div>`;
    log(`ERROR openThemeSettings: ${e.message}`);
  }
}

function closeThemeSettings() {
  const modal = $("themeSettingsModal");
  if (!modal) return;

  modal.style.display = "none";
}



function setAssistMode(mode) {
  currentAssistMode = mode;

  const status = $("aidrAssistModeStatus");
  if (!status) return;

  const labels = {
    theme: uiText("assist.desc.theme"),
    style: uiText("assist.desc.style"),
    fit: uiText("assist.desc.fit"),
    ai: uiText("assist.desc.ai"),
    asset: uiText("assist.desc.asset"),
  };

  status.textContent = labels[mode] || uiText("assist.desc.default");

  document.querySelectorAll(".aidr-assist-menu-btn").forEach((btn) => {
    btn.classList.toggle("active", btn.textContent.toLowerCase().includes(String(mode).toLowerCase()));
  });

  log(`assist mode: ${mode}`);
}

function toggleRebuildCard() {
  rebuildCardCollapsed = !rebuildCardCollapsed;

  const body = $("rebuildCompactBody");
  const icon = $("rebuildToggleIcon");

  if (body) body.style.display = rebuildCardCollapsed ? "none" : "block";
  if (icon) icon.textContent = rebuildCardCollapsed ? "▸" : "▾";
}

function setTextIfExists(id, value) {
  const el = $(id);
  if (el) el.textContent = value;
}

async function refreshAll() {
  try {
    appState = await fetchJson("/api/status");
    renderStatus(appState);
    renderSlides(appState.slides || []);
    await Promise.allSettled([
      loadThemeStyles(),
      loadSystemFonts()
    ]);
    // Slide-scoped assets are loaded by selectSlide().

    if (!selectedSlideId && appState.slides?.length) {
      await selectSlide(appState.slides[0].slide_id);
    } else if (selectedSlideId) {
      await selectSlide(selectedSlideId, false);
    }
  } catch (e) {
    log(`ERROR refresh: ${e.message}`);
  }
}

function renderStatus(status) {
  setTextIfExists("workspacePath", status.workspace || "-");
  setTextIfExists("manifestStatus", status.has_manifest ? "OK" : "None");
  setTextIfExists("slideCount", String(status.slide_count || 0));
  setTextIfExists("latestPptx", status.latest_pptx?.name || "-");
}

async function saveSlideOrder(slideIds) {
  const data = await fetchJson("/api/slides/reorder", {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify({slide_ids: slideIds}),
  });

  if (data.status) {
    appState = data.status;
    renderStatus(appState);
    renderSlides(appState.slides || []);
  } else {
    await refreshAll();
  }

  log(`slide order saved: ${slideIds.join(", ")}`);
}

async function moveSlideByOffset(slideId, offset) {
  const currentIds = (appState?.slides || []).map(slide => slide.slide_id);
  const index = currentIds.indexOf(slideId);
  const nextIndex = index + offset;

  if (index < 0 || nextIndex < 0 || nextIndex >= currentIds.length) return;

  const nextIds = [...currentIds];
  [nextIds[index], nextIds[nextIndex]] = [nextIds[nextIndex], nextIds[index]];

  try {
    await saveSlideOrder(nextIds);
  } catch (e) {
    log(`ERROR slide reorder: ${e.message}`);
    await refreshAll();
  }
}

function renderSlides(slides) {
  const el = $("slideList");
  if (!slides.length) {
    el.innerHTML = `<div class="asset-item">${escapeHtml(uiText("asset.emptySource"))}</div>`;
    return;
  }

  el.innerHTML = slides.map((s, idx) => `
    <div class="slide-item ${s.slide_id === selectedSlideId ? "active" : ""}" data-slide-id="${escapeHtml(s.slide_id)}">
      <div class="slide-order-controls" aria-label="Slide order controls">
        <button class="slide-order-btn" data-move="-1" title="Move up" ${idx === 0 ? "disabled" : ""}>↑</button>
        <button class="slide-order-btn" data-move="1" title="Move down" ${idx === slides.length - 1 ? "disabled" : ""}>↓</button>
      </div>
      <div class="slide-click-area">
        <div class="slide-name">${escapeHtml(s.slide_id)}</div>
        <div class="badges">
          ${badge("source", s.has_source)}
          ${badge("ocr", s.has_ocr)}
          ${badge("blocks", s.has_text_blocks || s.has_working_text_blocks)}
          ${badge("spec", s.has_rebuild_spec)}
        </div>
      </div>
      <button class="slide-delete-btn" title="Delete source slide">×</button>
    </div>
  `).join("");

  el.querySelectorAll(".slide-item").forEach(item => {
    const slideId = item.dataset.slideId;

    const clickArea = item.querySelector(".slide-click-area");
    if (clickArea) {
      clickArea.addEventListener("click", () => selectSlide(slideId));
    }

    item.querySelectorAll(".slide-order-btn").forEach(button => {
      button.addEventListener("click", event => {
        event.stopPropagation();
        if (button.disabled) return;
        moveSlideByOffset(slideId, Number(button.dataset.move || 0));
      });
    });

    const deleteButton = item.querySelector(".slide-delete-btn");
    if (deleteButton) {
      deleteButton.addEventListener("click", event => deleteSourceSlide(event, slideId));
    }
  });
}

function resetPreviewState() {
  selectedSlideId = null;
  selectedElementKey = null;
  currentBlocks = [];
  currentSpec = null;
  currentElements = [];

  setTextIfExists("selectedTitle", uiText("common.noSlideSelected"));
  $("previewStage").style.display = "none";
  $("emptyPreview").style.display = "block";
  $("slidePreview").removeAttribute("src");
  $("reconstructOverlay").style.display = "none";
  $("reconstructOverlay").innerHTML = "";
  setTextIfExists("elementCount", "0");
  setTextIfExists("blockCount", "0");
  renderInspector();
  resetMaterialState();
}

function resetMaterialState() {
  if (typeof aidrAssetList !== "undefined") {
    aidrAssetList = [];
  }
  if (typeof aidrCandidateList !== "undefined") {
    aidrCandidateList = [];
  }
  if (typeof aidrSelectedAssetId !== "undefined") {
    aidrSelectedAssetId = null;
  }
  if (typeof aidrSelectedCandidateId !== "undefined") {
    aidrSelectedCandidateId = null;
  }
  if (window.__quickRepairState) {
    window.__quickRepairState.assetId = "";
  }

  if (typeof renderRightAssets === "function") {
    renderRightAssets();
  }
  if (typeof renderRightCandidates === "function") {
    renderRightCandidates();
  }
  if (typeof renderAssetOverlays === "function") {
    renderAssetOverlays();
  }
  if (typeof renderCandidateOverlays === "function") {
    renderCandidateOverlays();
  }
}

async function selectFirstSlideOrReset() {
  await refreshAll();

  if (appState?.slides?.length) {
    await selectSlide(appState.slides[0].slide_id);
  } else {
    resetPreviewState();
  }
}

async function deleteSourceSlide(event, slideId) {
  event.stopPropagation();

  const ok = confirm(formatUiText("dialog.deleteSlideConfirm", { slideId }));
  if (!ok) return;

  try {
    const data = await fetchJson(`/api/source/${slideId}/delete`, {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify({}),
    });

    log(`deleted source slide: ${slideId}`);
    if (selectedSlideId === slideId) {
      await selectFirstSlideOrReset();
    } else {
      await refreshAll();
    }
  } catch (e) {
    log(`ERROR delete source slide: ${e.message}`);
  }
}

async function clearSourceFiles() {
  const ok = confirm(uiText("dialog.clearSourceConfirm"));
  if (!ok) return;

  try {
    const data = await fetchJson("/api/source/clear", {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify({}),
    });

    log("cleared current source");
    resetPreviewState();
    await refreshAll();
  } catch (e) {
    log(`ERROR clear source: ${e.message}`);
  }
}

async function selectSlide(slideId, rerenderList = true) {
  selectedSlideId = slideId;
  selectedElementKey = null;

  const slide = appState?.slides?.find(s => s.slide_id === slideId);
  setTextIfExists("selectedTitle", slideId);

  if (slide?.source_url) {
    $("emptyPreview").style.display = "none";
    $("previewStage").style.display = "inline-block";
    $("slidePreview").src = `${slide.source_url}?t=${Date.now()}`;
  } else {
    $("previewStage").style.display = "none";
    $("emptyPreview").style.display = "block";
  }

  if (rerenderList) renderSlides(appState?.slides || []);

  await loadRebuildData(slideId);
  renderPreview();
  renderInspector();

  if (typeof window.aidrSyncAssetClipAfterSlideSelect === "function") {
    await window.aidrSyncAssetClipAfterSlideSelect(slideId);
  }

  if (typeof window.aidrSyncCandidateClipAfterSlideSelect === "function") {
    await window.aidrSyncCandidateClipAfterSlideSelect(slideId);
  }
}

async function loadRebuildData(slideId) {
  currentBlocks = [];
  currentSpec = null;
  currentElements = [];

  try {
    const tb = await fetchJson(`/api/text-blocks/${slideId}`);
    currentBlocks = Array.isArray(tb.blocks) ? tb.blocks : [];
  } catch (e) {
    currentBlocks = [];
  }

  try {
    const spec = await fetchJson(`/api/rebuild-spec/${slideId}`);
    currentSpec = spec?.data || null;
  } catch (e) {
    currentSpec = null;
  }

  currentElements = collectPreviewElements(currentSpec, currentBlocks);

  setTextIfExists("elementCount", String(currentElements.length));
  setTextIfExists("blockCount", String(currentBlocks.length));
}

function setPreviewMode(mode) {
  previewMode = mode;
  $("tabOriginal").classList.toggle("active", mode === "original");
  $("tabReconstructed").classList.toggle("active", mode === "reconstructed");
  renderPreview();
}

function toggleBackground() {
  showBackground = $("showBg").checked;
  renderPreview();
}

function setBackgroundOpacity(value) {
  backgroundOpacity = Number(value) / 100;
  $("bgOpacityValue").textContent = `${value}%`;
  renderPreview();
}

function toggleTextBlocksLayer() {
  showTextBlocksLayer = $("showTextBlocks").checked;
  renderPreview();
}

function toggleRebuildElementsLayer() {
  showRebuildElementsLayer = $("showRebuildElements").checked;
  renderPreview();
}

function renderPreview() {
  const img = $("slidePreview");
  const overlay = $("reconstructOverlay");

  if (!selectedSlideId) return;

  if (previewMode === "original") {
    img.style.opacity = "1";
    overlay.style.display = "none";
    overlay.innerHTML = "";
    return;
  }

  img.style.opacity = showBackground ? String(backgroundOpacity) : "0";
  overlay.style.display = "block";
  renderOverlayLayers();
}




let previewContextMenuEl = null;
let previewContextMenuAttached = false;
let previewContextTarget = null;
let previewContextMenuOpenedAt = 0;

const PREVIEW_TEXT_ROLE_VALUES = [
  "h1",
  "h2",
  "p",
  "footer.note",
  "meta.small",
  "text",
  "card.title",
  "card.body",
  "card.note",
  "card.meta",
];

const PREVIEW_TEXT_ROLE_MAP = {
  "set-role-h1": { style_ref: "left.h1", role: "h1" },
  "set-role-center-h1": { style_ref: "center.h1", role: "h1" },
  "set-role-h2": { style_ref: "left.h2", role: "h2" },
  "set-role-center-h2": { style_ref: "center.h2", role: "h2" },
  "set-role-body": { style_ref: "left.p", role: "p" },
  "set-role-center-body": { style_ref: "center.p", role: "p" },
  "set-role-footer": { style_ref: "footer.note", role: "footer.note" },
  "set-role-meta": { style_ref: "meta.small", role: "meta.small" },
  "set-role-card-title": { style_ref: "card.title", role: "card.title" },
  "set-role-card-body": { style_ref: "card.body", role: "card.body" },
  "set-role-card-note": { style_ref: "card.note", role: "card.note" },
  "set-role-card-meta": { style_ref: "card.meta", role: "card.meta" },
};

const PREVIEW_TEXT_ROLE_OPTIONS = [
  { action: "set-role-h1", labelKey: "previewContext.setRoleH1" },
  { action: "set-role-center-h1", labelKey: "previewContext.setRoleCenterH1" },
  { action: "set-role-h2", labelKey: "previewContext.setRoleH2" },
  { action: "set-role-center-h2", labelKey: "previewContext.setRoleCenterH2" },
  { action: "set-role-body", labelKey: "previewContext.setRoleBody" },
  { action: "set-role-center-body", labelKey: "previewContext.setRoleCenterBody" },
  { action: "set-role-footer", labelKey: "previewContext.setRoleFooter" },
  { action: "set-role-meta", labelKey: "previewContext.setRoleMeta" },
  { action: "set-role-card-title", labelKey: "previewContext.setRoleCardTitle" },
  { action: "set-role-card-body", labelKey: "previewContext.setRoleCardBody" },
  { action: "set-role-card-note", labelKey: "previewContext.setRoleCardNote" },
  { action: "set-role-card-meta", labelKey: "previewContext.setRoleCardMeta" },
];

function ensurePreviewContextMenu() {
  if (previewContextMenuEl) return previewContextMenuEl;

  const menu = document.createElement("div");
  menu.id = "previewContextMenu";
  menu.className = "preview-context-menu";
  menu.setAttribute("role", "menu");

  menu.addEventListener("click", (event) => {
    const btn = event.target.closest("[data-preview-context-action]");
    if (!btn) return;
    handlePreviewContextAction(btn.dataset.previewContextAction);
  });

  document.body.appendChild(menu);
  previewContextMenuEl = menu;
  return menu;
}

function getPreviewContextAssetById(assetId) {
  if (!assetId) return null;

  if (typeof findAssetById === "function") {
    const found = findAssetById(assetId);
    if (found) return found;
  }

  if (typeof aidrAssetList !== "undefined" && Array.isArray(aidrAssetList)) {
    return aidrAssetList.find((asset) => asset?.asset_id === assetId) || null;
  }

  return null;
}

function findRebuildElementKeyForTextBlock(textBlockKey) {
  if (!textBlockKey || !Array.isArray(currentElements)) return "";

  for (let i = 0; i < currentElements.length; i += 1) {
    const el = currentElements[i] || {};
    const candidates = [
      elementKey(el, i),
      el.source_block_id,
      el.source_id,
      el.block_id,
      el.id,
      el.name,
    ]
      .filter((value) => value !== undefined && value !== null)
      .map((value) => String(value));

    if (candidates.includes(String(textBlockKey))) {
      return elementKey(el, i);
    }
  }

  return "";
}



function previewContextDebug(message, detail = null) {
  // Debug hook kept intentionally quiet in normal mode.
  // Re-enable console/log output here when investigating context menu behavior.
  return;
}



function getPreviewContextTargetFromSelectedElement() {
  previewContextDebug("selected-item lookup", { selectedElementKey });

  if (!selectedElementKey) return null;

  if (selectedElementKey.startsWith("asset:")) {
    const assetId = selectedElementKey.slice("asset:".length);
    if (!assetId) return null;
    const target = {
      kind: "asset",
      assetId,
      sourceKind: "selected-item",
    };
    previewContextDebug("selected-item target", target);
    return target;
  }

  if (selectedElementKey.startsWith("rebuild:")) {
    const elementKey = selectedElementKey.slice("rebuild:".length);
    if (!elementKey) return null;
    const target = {
      kind: "rebuild",
      elementKey,
      sourceKind: "selected-item",
    };
    previewContextDebug("selected-item target", target);
    return target;
  }

  if (selectedElementKey.startsWith("textblock:")) {
    const textBlockKey = selectedElementKey.slice("textblock:".length);
    const rebuildKey = findRebuildElementKeyForTextBlock(textBlockKey);

    if (!rebuildKey) {
      return {
        kind: "textblock",
        elementKey: "",
        textBlockKey,
        sourceKind: "selected-item",
      };
    }

    return {
      kind: "rebuild",
      elementKey: rebuildKey,
      sourceKind: "selected-item",
      textBlockKey,
    };
  }

  return null;
}


function previewContextStyleSummaryHtml(styleRef) {
  const ref = String(styleRef || "").trim();
  const style = currentThemeStyles?.[ref] || {};
  const parts = [];

  if (ref) {
    parts.push(`<span>${escapeHtml(ref)}</span>`);
  }

  if (style.font_size !== undefined && style.font_size !== null && style.font_size !== "") {
    parts.push(`<span>${escapeHtml(`${style.font_size}pt`)}</span>`);
  }

  const color = String(style.color || "").replace(/^#/, "").trim().toUpperCase();
  if (/^[0-9A-F]{6}$/.test(color)) {
    parts.push(`
      <span class="preview-context-role-color">
        <span class="preview-context-role-color-dot" style="background:#${escapeHtml(color)}"></span>
        <span>#${escapeHtml(color)}</span>
      </span>
    `);
  }

  return parts.filter(Boolean).join(`<span class="preview-context-role-separator">・</span>`);
}

function getPreviewContextCurrentStyleRef(target) {
  if (!target) return "";

  const keys = new Set(
    [
      target.elementKey,
      target.textBlockKey,
    ]
      .filter((value) => value !== undefined && value !== null && String(value).trim())
      .map((value) => String(value))
  );

  if (!keys.size) return "";

  function findItemStyleRef(item, index) {
    if (!item || typeof item !== "object") return "";

    const candidates = [
      elementKey(item, index),
      item.id,
      item.block_id,
      item.source_block_id,
      item.source_id,
      item.name,
    ]
      .filter((value) => value !== undefined && value !== null)
      .map((value) => String(value));

    if (!candidates.some((value) => keys.has(value))) return "";

    return String(item.style_ref || "").trim();
  }

  for (const collection of [currentElements, currentBlocks]) {
    if (!Array.isArray(collection)) continue;

    for (let i = 0; i < collection.length; i += 1) {
      const ref = findItemStyleRef(collection[i], i);
      if (ref) return ref;
    }
  }

  return "";
}

function previewContextRoleOptionHtml(option, currentStyleRef = "") {
  if (option.separator) {
    return `<div class="preview-context-menu-separator"></div>`;
  }

  const mapping = PREVIEW_TEXT_ROLE_MAP[option.action] || {};
  const summaryHtml = previewContextStyleSummaryHtml(mapping.style_ref);
  const isCurrent = Boolean(currentStyleRef && mapping.style_ref === currentStyleRef);
  const currentClass = isCurrent ? " current" : "";
  const ariaCurrent = isCurrent ? ` aria-current="true"` : "";

  return `
    <button type="button" class="preview-context-role-option${currentClass}" data-preview-context-action="${escapeHtml(option.action)}"${ariaCurrent}>
      <span class="preview-context-role-main">${escapeHtml(uiText(option.labelKey))}</span>
      <span class="preview-context-role-sub">${summaryHtml}</span>
    </button>
  `;
}

function previewContextTextRoleOptionsHtml(target = previewContextTarget) {
  const currentStyleRef = getPreviewContextCurrentStyleRef(target);

  return `
    <div class="preview-context-role-grid">
      ${PREVIEW_TEXT_ROLE_OPTIONS.map((option) => previewContextRoleOptionHtml(option, currentStyleRef)).join("")}
    </div>
  `;
}


function renderPreviewContextMenu(menu, target) {
  if (!target) {
    menu.innerHTML = "";
    return false;
  }

  if (target.kind === "assetClip") {
    menu.innerHTML = `
      <div class="preview-context-menu-head">
        <div class="preview-context-menu-title">${uiText("asset.clipMode")}</div>
        <button
          type="button"
          class="preview-context-menu-close"
          data-preview-context-action="cancel-asset-clip"
          aria-label="${uiText("common.cancel")}"
        >×</button>
      </div>
      <button type="button" data-preview-context-action="confirm-asset-clip">${uiText("asset.confirmClip")}</button>
      <div class="preview-context-menu-separator"></div>
      <button type="button" class="danger" data-preview-context-action="cancel-asset-clip">${uiText("common.cancel")}</button>
    `;

    return true;
  }

  if (target.kind === "candidate") {
    menu.innerHTML = `
      <div class="preview-context-menu-head">
        <div class="preview-context-menu-title">${uiText("candidates.title")}</div>
        <button
          type="button"
          class="preview-context-menu-close"
          data-preview-context-action="clear-selection"
          aria-label="${uiText("previewContext.clearSelection")}"
        >×</button>
      </div>
      <button type="button" data-preview-context-action="accept-candidate">${uiText("candidate.acceptSelected")}</button>
      <div class="preview-context-menu-separator"></div>
      <button type="button" class="danger" data-preview-context-action="delete-candidate">${uiText("candidate.deleteCandidate")}</button>
    `;

    return true;
  }

  if (target.kind === "asset") {
    const asset = getPreviewContextAssetById(target.assetId);
    const useInPptx = Boolean(asset?.use_in_pptx);
    const pptxLabel = useInPptx ? uiText("previewContext.excludeFromPptx") : uiText("previewContext.includeInPptx");

    menu.innerHTML = `
      <div class="preview-context-menu-head">
        <div class="preview-context-menu-title">${uiText("previewContext.assetTitle")}</div>
        <button
          type="button"
          class="preview-context-menu-close"
          data-preview-context-action="clear-selection"
          aria-label="${uiText("previewContext.clearSelection")}"
        >×</button>
      </div>
      <button type="button" data-preview-context-action="open-asset-preview">${uiText("previewContext.openAssetPreview")}</button>
      <button type="button" data-preview-context-action="adjust-asset-bbox">${uiText("previewContext.adjustAssetBBox")}</button>
      <button type="button" data-preview-context-action="toggle-asset-pptx">${pptxLabel}</button>
      <div class="preview-context-menu-separator"></div>
      <button type="button" class="danger" data-preview-context-action="delete-asset">${uiText("previewContext.deleteAsset")}</button>
    `;

    return true;
  }

  if (target.kind === "rebuild" || target.kind === "textblock") {
    menu.innerHTML = `
      <div class="preview-context-menu-head">
        <div class="preview-context-menu-title">${uiText("previewContext.textRoleTitle")}</div>
        <button
          type="button"
          class="preview-context-menu-close"
          data-preview-context-action="clear-selection"
          aria-label="${uiText("previewContext.clearSelection")}"
        >×</button>
      </div>
      ${previewContextTextRoleOptionsHtml()}
      <div class="preview-context-menu-separator"></div>
      <button type="button" class="danger" data-preview-context-action="delete-rebuild-element">${uiText("previewContext.deleteFromRebuild")}</button>
    `;

    return true;
  }

  menu.innerHTML = "";
  return false;
}

function positionPreviewContextMenu(menu, event) {
  const padding = 8;

  // Force visible before measuring.
  menu.style.position = "fixed";
  menu.style.display = "block";
  menu.style.visibility = "visible";
  menu.style.opacity = "1";
  menu.style.pointerEvents = "auto";
  menu.style.zIndex = "2147483647";

  const rect = menu.getBoundingClientRect();
  let left = event.clientX;
  let top = event.clientY;

  if (left + rect.width + padding > window.innerWidth) {
    left = Math.max(padding, window.innerWidth - rect.width - padding);
  }
  if (top + rect.height + padding > window.innerHeight) {
    top = Math.max(padding, window.innerHeight - rect.height - padding);
  }

  menu.style.left = `${left}px`;
  menu.style.top = `${top}px`;
  previewContextMenuOpenedAt = Date.now();

  previewContextDebug("menu positioned", {
    left,
    top,
    width: rect.width,
    height: rect.height,
    display: menu.style.display,
    visibility: menu.style.visibility,
    zIndex: menu.style.zIndex,
    text: menu.textContent?.trim()?.slice(0, 120) || "",
  });
}


function findPreviewContextTargetElement(event) {
  // Stable route:
  // 1. Use the actual DOM target / closest element first.
  // 2. Avoid aggressive rectangle hit-testing because asset/text overlays often overlap.
  const direct = event.target?.closest?.(
    ".candidate-bbox-item, .asset-bbox-item, .rebuild-element-item, .text-block-item"
  );

  if (direct) return direct;

  // Fallback only when direct target is not available.
  const stack = document.elementsFromPoint(event.clientX, event.clientY) || [];

  return (
    stack.find((el) => el?.classList?.contains("candidate-bbox-item")) ||
    stack.find((el) => el?.classList?.contains("asset-bbox-item")) ||
    stack.find((el) => el?.classList?.contains("rebuild-element-item")) ||
    stack.find((el) => el?.classList?.contains("text-block-item")) ||
    null
  );
}


function isPreviewImagePoint(event) {
  const stage = document.querySelector(".preview-stage");
  const img = stage?.querySelector?.(".slide-preview") || aidrAssetClipEl("slidePreview");

  if (!event || !img) return false;

  const rect = img.getBoundingClientRect();
  return isPointInsideRect(event.clientX, event.clientY, rect);
}

function hasAssetClipSelection() {
  const selection = aidrAssetClipEl("assetSelectionOverlay");

  return Boolean(
    Array.isArray(aidrSelectedAssetBBoxPx) &&
    aidrSelectedAssetBBoxPx.length === 4 &&
    selection &&
    selection.style.display !== "none"
  );
}

function syncAssetClipModeToggle(enabled) {
  const toggle = aidrAssetClipEl("assetClipModeToggle");
  if (toggle) toggle.checked = Boolean(enabled);
}

function setAssetClipModeFromPreviewShortcut(enabled) {
  syncAssetClipModeToggle(enabled);
  setAssetClipMode(enabled);
}

function showPreviewClipActionMenu(event) {
  if (!selectedSlideId) return false;
  if (!aidrAssetClipMode) return false;
  if (!hasAssetClipSelection()) return false;
  if (!isPreviewImagePoint(event)) return false;

  event.preventDefault();
  event.stopPropagation();

  previewContextTarget = { kind: "assetClip" };

  const menu = ensurePreviewContextMenu();
  const rendered = renderPreviewContextMenu(menu, previewContextTarget);
  previewContextDebug("clip menu rendered", { rendered });

  if (!rendered) return true;

  positionPreviewContextMenu(menu, event);
  return true;
}

function startAssetClipModeFromPreviewBlank(event) {
  if (!selectedSlideId) return false;
  if (!isPreviewImagePoint(event)) return false;

  event.preventDefault();
  event.stopPropagation();

  if (typeof clearAssetCandidateBBoxSelection === "function") {
    clearAssetCandidateBBoxSelection("preview blank right-click started asset clip");
  }

  setAssetClipModeFromPreviewShortcut(true);

  if (typeof log === "function") {
    log("asset clip mode: preview blank right-click");
  }

  return true;
}

function showPreviewContextMenu(event) {
  if (!selectedSlideId) return;

  previewContextDebug("event fired", {
    selectedSlideId,
    selectedElementKey,
    targetTag: event.target?.tagName || "",
    targetId: event.target?.id || "",
    targetClass: event.target?.className || "",
  });

  const selectedPanel = event.target.closest?.("#selectedElement");
  let selectedTarget = null;

  if (selectedPanel) {
    previewContextDebug("selected panel hit");
    selectedTarget = getPreviewContextTargetFromSelectedElement();
  } else {
    previewContextDebug("selected panel miss");
  }

  const targetEl = selectedTarget ? null : findPreviewContextTargetElement(event);

  if (!selectedTarget && showPreviewClipActionMenu(event)) {
    previewContextDebug("handled: asset clip action menu");
    return;
  }

  previewContextDebug("target resolved", {
    selectedTarget,
    targetElClass: targetEl?.className || "",
    targetElId: targetEl?.id || "",
  });

  if (!selectedTarget && !targetEl) {
    if (startAssetClipModeFromPreviewBlank(event)) {
      previewContextDebug("handled: preview blank asset clip start");
      return;
    }

    previewContextDebug("abort: no context target");
    return;
  }

  event.preventDefault();
  event.stopPropagation();

  if (selectedTarget) {
    previewContextTarget = selectedTarget;

  } else {
    // Direct target priority:
    // Asset direct right-click should stay Asset.
    // Text direct right-click should stay Text.
    const isCandidate = targetEl.classList.contains("candidate-bbox-item");
    const isAsset = targetEl.classList.contains("asset-bbox-item");
    const isRebuild = targetEl.classList.contains("rebuild-element-item");
    const isTextBlock = targetEl.classList.contains("text-block-item");

    if (isCandidate) {
      const candidateId =
        targetEl.dataset.candidateId ||
        targetEl.getAttribute("data-candidate-id") ||
        targetEl.getAttribute("title");
      if (!candidateId) return;

      previewContextTarget = {
        kind: "candidate",
        candidateId,
      };

      if (typeof aidrSelectedCandidateId !== "undefined") {
        aidrSelectedCandidateId = candidateId;
      }

      selectedElementKey = `candidate:${candidateId}`;
      if (typeof renderRightCandidates === "function") renderRightCandidates();
      if (typeof renderCandidateOverlays === "function") renderCandidateOverlays();
      if (typeof renderInspector === "function") renderInspector();

    } else if (isAsset) {
      const assetId = targetEl.dataset.assetId || targetEl.getAttribute("data-asset-id");
      if (!assetId) return;

      previewContextTarget = {
        kind: "asset",
        assetId,
      };

    } else if (isRebuild) {
      const elementKeyValue = targetEl.dataset.elementKey || targetEl.getAttribute("data-element-key");
      if (!elementKeyValue) return;

      previewContextTarget = {
        kind: "rebuild",
        elementKey: elementKeyValue,
      };

      selectedElementKey = `rebuild:${elementKeyValue}`;
      if (typeof renderOverlayElements === "function") renderOverlayElements();
      if (typeof renderInspector === "function") renderInspector();

    } else if (isTextBlock) {
      const textBlockKey = targetEl.dataset.elementKey || targetEl.getAttribute("data-element-key");
      const rebuildKey = findRebuildElementKeyForTextBlock(textBlockKey);

      if (!rebuildKey) {
        selectedElementKey = `textblock:${textBlockKey}`;
        if (typeof renderOverlayElements === "function") renderOverlayElements();
        if (typeof renderInspector === "function") renderInspector();

        previewContextTarget = {
          kind: "textblock",
          elementKey: "",
          textBlockKey,
          sourceKind: "textblock",
        };
      } else {
        previewContextTarget = {
          kind: "rebuild",
          elementKey: rebuildKey,
          sourceKind: "textblock",
          textBlockKey,
        };

        selectedElementKey = `rebuild:${rebuildKey}`;
        if (typeof renderOverlayElements === "function") renderOverlayElements();
        if (typeof renderInspector === "function") renderInspector();
      }
    }
  }

  previewContextDebug("context target final", previewContextTarget);

  const menu = ensurePreviewContextMenu();
  const rendered = renderPreviewContextMenu(menu, previewContextTarget);
  previewContextDebug("menu rendered", { rendered });

  if (!rendered) return;

  positionPreviewContextMenu(menu, event);
}


function hidePreviewContextMenu(reason = "unknown") {
  if (!previewContextMenuEl) return;

  const isVisible = previewContextMenuEl.style.display !== "none";
  if (!isVisible) return;

  // Right after opening, log auto-scroll / synthetic click events may fire.
  // Do not close immediately after the context menu appears.
  if (Date.now() - previewContextMenuOpenedAt < 450) {
    return;
  }

  previewContextMenuEl.style.display = "none";

  // Keep this quiet to avoid Run Log feedback loops.
  if (reason !== "scroll") {
    previewContextDebug("menu hidden", { reason });
  }
}



function clearPreviewContextSelection() {
  selectedElementKey = null;

  if (typeof aidrSelectedAssetId !== "undefined") {
    aidrSelectedAssetId = null;
  }

  if (typeof aidrSelectedCandidateId !== "undefined") {
    aidrSelectedCandidateId = null;
  }

  if (typeof renderOverlayElements === "function") renderOverlayElements();
  if (typeof renderRightCandidates === "function") renderRightCandidates();
  if (typeof renderCandidateOverlays === "function") renderCandidateOverlays();
  if (typeof renderRightAssets === "function") renderRightAssets();
  if (typeof renderAssetOverlays === "function") renderAssetOverlays();
  if (typeof renderInspector === "function") renderInspector();
  if (typeof aidrScheduleBBoxGuideSync === "function") aidrScheduleBBoxGuideSync();
}


function applyPreviewTextRoleLocally(target, elementKeyValue, mapping) {
  const keys = new Set(
    [
      elementKeyValue,
      target?.elementKey,
      target?.textBlockKey,
    ]
      .filter((value) => value !== undefined && value !== null && String(value).trim())
      .map((value) => String(value))
  );

  function patchItem(item, index) {
    if (!item || typeof item !== "object") return false;

    const candidates = [
      elementKey(item, index),
      item.id,
      item.block_id,
      item.source_block_id,
      item.source_id,
      item.name,
    ]
      .filter((value) => value !== undefined && value !== null)
      .map((value) => String(value));

    if (!candidates.some((value) => keys.has(value))) return false;

    item.style_ref = mapping.style_ref;
    item.role = mapping.role;

    // Keep common label fields aligned when they were used by older specs.
    if (item.type && PREVIEW_TEXT_ROLE_VALUES.includes(String(item.type))) {
      item.type = mapping.role;
    }
    if (item.kind && PREVIEW_TEXT_ROLE_VALUES.includes(String(item.kind))) {
      item.kind = mapping.role;
    }
    if (item.category && PREVIEW_TEXT_ROLE_VALUES.includes(String(item.category))) {
      item.category = mapping.role;
    }

    return true;
  }

  if (Array.isArray(currentElements)) {
    currentElements.forEach((item, index) => patchItem(item, index));
  }

  if (Array.isArray(currentBlocks)) {
    currentBlocks.forEach((item, index) => patchItem(item, index));
  }
}



async function updateRebuildElementStyleFromContext(action) {
  const target = previewContextTarget;
  const mapping = PREVIEW_TEXT_ROLE_MAP[action];

  if (!target || !mapping) return;

  let elementKey = target.elementKey;

  if (!elementKey && target.kind === "textblock" && target.textBlockKey) {
    elementKey = findRebuildElementKeyForTextBlock(target.textBlockKey);
  }

  if (!elementKey) {
    alert(uiText("dialog.rebuildElementMissing"));
    return;
  }

  const data = await fetchJson(`/api/rebuild-spec/${selectedSlideId}/element-style`, {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify({
      element_key: elementKey,
      text_block_key: target.textBlockKey || "",
      style_ref: mapping.style_ref,
      role: mapping.role,
    }),
  });

  if ((data.updated_target === "text_blocks" || data.updated_text_blocks) && Array.isArray(data.blocks)) {
    currentBlocks = data.blocks;
  }

  if (data.updated_target === "text_blocks") {
    currentElements = collectPreviewElements(currentSpec, currentBlocks);
    selectedElementKey = target.textBlockKey
      ? `textblock:${target.textBlockKey}`
      : `textblock:${elementKey}`;
  } else {
    currentSpec = data.data || currentSpec;
    currentElements = collectPreviewElements(currentSpec, currentBlocks);
    selectedElementKey = target.textBlockKey
      ? `textblock:${target.textBlockKey}`
      : `rebuild:${elementKey}`;
  }

  applyPreviewTextRoleLocally(target, elementKey, mapping);

  renderPreview();
  renderInspector();

  if (typeof log === "function") {
    log(`rebuild element style_ref updated: ${elementKey} => ${mapping.style_ref}`);
  }
}

async function deleteRebuildElementFromContext() {
  const target = previewContextTarget;
  if (!target || target.kind !== "rebuild" || !target.elementKey) return;

  const ok = confirm(uiText("dialog.deleteTextElementConfirm"));
  if (!ok) return;

  const data = await fetchJson(`/api/rebuild-spec/${selectedSlideId}/element-delete`, {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify({
      element_key: target.elementKey,
    }),
  });

  if (data.updated_target === "text_blocks" && Array.isArray(data.blocks)) {
    currentBlocks = data.blocks;
    currentElements = collectPreviewElements(currentSpec, currentBlocks);
  } else {
    currentSpec = data.data || currentSpec;
    currentElements = collectPreviewElements(currentSpec, currentBlocks);
  }

  selectedElementKey = null;

  renderPreview();
  renderInspector();

  if (typeof log === "function") {
    log(`rebuild element deleted: ${target.elementKey}`);
  }
}

async function handlePreviewContextAction(action) {
  const target = previewContextTarget;

  if (action === "clear-selection") {
    clearPreviewContextSelection();
    hidePreviewContextMenu();
    return;
  }

  if (!target) {
    hidePreviewContextMenu();
    return;
  }

  if (target.kind === "rebuild" || target.kind === "textblock") {
    try {
      if (PREVIEW_TEXT_ROLE_MAP[action]) {
        await updateRebuildElementStyleFromContext(action);
      } else if (action === "delete-rebuild-element") {
        await deleteRebuildElementFromContext();
      }
    } catch (e) {
      if (typeof log === "function") log(`ERROR rebuild context action: ${e.message}`);
      alert(formatUiText("dialog.updateRebuildElementFailed", { message: e.message }));
    }

    hidePreviewContextMenu();
    return;
  }

  if (target.kind === "candidate") {
    const candidateId = target.candidateId;

    if (!candidateId) {
      hidePreviewContextMenu();
      return;
    }

    try {
      if (action === "accept-candidate") {
        await acceptCandidate(null, candidateId, true);
      } else if (action === "delete-candidate") {
        await deleteCandidate(null, candidateId);
      }
    } catch (e) {
      if (typeof log === "function") log(`ERROR candidate context action: ${e.message}`);
      alert(e.message);
    }

    hidePreviewContextMenu();
    return;
  }

  if (target.kind === "assetClip") {
    if (action === "confirm-asset-clip") {
      hidePreviewContextMenu("confirm asset clip");
      await confirmAssetClip();

    } else if (action === "cancel-asset-clip") {
      hidePreviewContextMenu("cancel asset clip");
      syncAssetClipModeToggle(false);
      setAssetClipMode(false);

      if (typeof log === "function") {
        log("asset clip canceled: context menu");
      }
    }

    return;
  }

  if (target.kind !== "asset" || !target.assetId) {
    hidePreviewContextMenu();
    return;
  }

  const assetId = target.assetId;
  const asset = getPreviewContextAssetById(assetId);

  if (action === "open-asset-preview") {
    if (typeof openAssetPreviewWorkspaceById === "function") {
      openAssetPreviewWorkspaceById(assetId);
    } else {
      alert(uiText("dialog.assetPreviewUnavailable"));
    }

  } else if (action === "adjust-asset-bbox") {
    if (typeof selectAsset === "function") {
      selectAsset(assetId);
    } else {
      selectedElementKey = `asset:${assetId}`;
      if (typeof renderAssetOverlays === "function") renderAssetOverlays();
      if (typeof renderInspector === "function") renderInspector();
    }

  } else if (action === "toggle-asset-pptx") {
    if (!asset) {
      alert(uiText("dialog.assetNotFound"));
      hidePreviewContextMenu();
      return;
    }

    const nextUse = !Boolean(asset.use_in_pptx);

    try {
      const data = await fetchJson(`/api/assets/${selectedSlideId}/${assetId}/toggle-use`, {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({ use_in_pptx: nextUse }),
      });

      aidrAssetList = data.manifest?.assets || aidrAssetList;
      if (typeof renderRightAssets === "function") renderRightAssets();
      if (typeof renderAssetOverlays === "function") renderAssetOverlays();
      if (typeof renderInspector === "function") renderInspector();
      if (typeof log === "function") log(`asset use_in_pptx updated: ${assetId} => ${nextUse}`);
    } catch (e) {
      if (typeof log === "function") log(`ERROR toggle asset use_in_pptx: ${e.message}`);
      alert(formatUiText("dialog.togglePptxFailed", { message: e.message }));
    }

  } else if (action === "delete-asset") {
    if (typeof deleteAsset === "function") {
      await deleteAsset({
        stopPropagation() {},
        preventDefault() {},
      }, assetId);
    } else {
      alert(uiText("dialog.deleteAssetUnavailable"));
    }
  }

  hidePreviewContextMenu();
}

function attachPreviewContextMenu() {
  if (previewContextMenuAttached) {
    previewContextDebug("attach skipped: already attached");
    return;
  }

  const stage = document.getElementById("previewStage");
  if (!stage) return;

  stage.addEventListener("contextmenu", showPreviewContextMenu);

  document.addEventListener("click", (event) => {
    if (!previewContextMenuEl) return;
    if (!previewContextMenuEl.contains(event.target)) {
      hidePreviewContextMenu("outside-click");
    }
  });

  window.addEventListener("keydown", (event) => {
    if (event.key === "Escape") hidePreviewContextMenu("escape");
  });

  window.addEventListener("resize", () => hidePreviewContextMenu("resize"));
  window.addEventListener("scroll", () => hidePreviewContextMenu("scroll"), true);

  previewContextMenuAttached = true;
  previewContextDebug("attached");
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", attachPreviewContextMenu);
} else {
  attachPreviewContextMenu();
}


function overlayBoxToStageCss(box) {
  const stage = $("previewStage");
  const img = $("slidePreview");

  if (!stage || !img || !img.naturalWidth || !img.naturalHeight || !box) {
    return null;
  }

  const stageRect = stage.getBoundingClientRect();
  const imgRect = img.getBoundingClientRect();

  if (!imgRect.width || !imgRect.height) {
    return null;
  }

  return {
    left: (imgRect.left - stageRect.left) + (box.left / 100) * imgRect.width,
    top: (imgRect.top - stageRect.top) + (box.top / 100) * imgRect.height,
    width: (box.width / 100) * imgRect.width,
    height: (box.height / 100) * imgRect.height,
  };
}

function overlayStyleFromCssBox(cssBox) {
  if (!cssBox) return "";
  return `left:${cssBox.left}px;top:${cssBox.top}px;width:${cssBox.width}px;height:${cssBox.height}px;`;
}

function renderOverlayLayers() {
  const overlay = $("reconstructOverlay");
  const img = $("slidePreview");

  const naturalW = img.naturalWidth || 1280;
  const naturalH = img.naturalHeight || 720;

  const parts = [];

  if (showTextBlocksLayer) {
    parts.push(...currentBlocks.map((block, i) => {
      const key = `textblock:${elementKey(block, i)}`;
      const box = computeBox(block, i, naturalW, naturalH);
      const cssBox = overlayBoxToStageCss(box);
      const selected = key === selectedElementKey;
      const text = elementText(block);
      const role = elementRole(block);

      return `
        <button
          class="overlay-item text-block-item ${selected ? "selected" : ""}"
          data-preview-kind="textblock"
          data-element-key="${escapeAttr(elementKey(block, i))}"
          style="${overlayStyleFromCssBox(cssBox)}"
          onclick="selectElement('${escapeAttr(key)}')"
          title="${escapeAttr(text.slice(0, 80))}"
        >
          <span class="overlay-role">${escapeHtml(role)}</span>
          <span class="overlay-text">${escapeHtml(text)}</span>
        </button>
      `;
    }));
  }

  if (showRebuildElementsLayer) {
    parts.push(...currentElements.map((el, i) => {
      const key = `rebuild:${elementKey(el, i)}`;
      const box = computeBox(el, i, naturalW, naturalH);
      const cssBox = overlayBoxToStageCss(box);
      const selected = key === selectedElementKey;
      const text = elementText(el);
      const role = elementRole(el);

      return `
        <button
          class="overlay-item rebuild-element-item ${selected ? "selected" : ""}"
          data-preview-kind="rebuild"
          data-element-key="${escapeAttr(elementKey(el, i))}"
          style="${overlayStyleFromCssBox(cssBox)}"
          onclick="selectElement('${escapeAttr(key)}')"
          title="${escapeAttr(text.slice(0, 80))}"
        >
          <span class="overlay-role">${escapeHtml(role)}</span>
          <span class="overlay-text">${escapeHtml(text)}</span>
        </button>
      `;
    }));
  }

  if (!parts.length) {
    overlay.innerHTML = `<div class="overlay-empty">${escapeHtml(uiText("preview.overlayEmpty"))}</div>`;
    return;
  }

  overlay.innerHTML = parts.join("");
  aidrScheduleBBoxGuideSync();
}

function renderOverlayElements() {
  renderOverlayLayers();
}

function selectElement(key) {
  selectedElementKey = key;
  aidrSelectedCandidateId = null;
  aidrSelectedAssetId = null;
  renderOverlayElements();
  renderRightCandidates();
  renderCandidateOverlays();
  renderRightAssets();
  renderAssetOverlays();
  renderInspector();
  aidrScheduleBBoxGuideSync();
}

function renderInspector() {
  const el = $("selectedElement");
  if (typeof renderBottomPreview === "function") renderBottomPreview();

  if (typeof window.scheduleAssetEditStableUi === "function") {
    window.scheduleAssetEditStableUi();
  }

  if (!selectedElementKey) {
    el.className = "selected-empty";
    el.innerHTML = escapeHtml(uiText("selected.emptyHint"));
    return;
  }

  if (selectedElementKey.startsWith("asset:")) {
    const assetId = selectedElementKey.slice("asset:".length);
    const asset = getSelectedAsset(assetId);

    if (!asset) {
      el.className = "selected-empty";
      el.innerHTML = escapeHtml(uiText("selected.assetNotFound"));
      return;
    }

    const bbox = Array.isArray(asset.bbox_px) ? asset.bbox_px.join(", ") : "-";
    const url = asset.url ? `${asset.url}?t=${Date.now()}` : "";

    el.className = "selected-detail";
    el.innerHTML = `
      <div class="inspect-row"><span>${escapeHtml(uiText("selected.kind"))}</span><strong>${escapeHtml(uiText("selected.kindAsset"))}</strong></div>
      <div class="inspect-row"><span>ID</span><strong>${escapeHtml(asset.asset_id || "-")}</strong></div>
      <div class="inspect-row"><span>${escapeHtml(uiText("selected.fileName"))}</span><strong>${escapeHtml(asset.filename || "-")}</strong></div>
      <div class="inspect-row"><span>bbox_px</span><strong>[${escapeHtml(bbox)}]</strong></div>
      <div class="inspect-row"><span>${escapeHtml(uiText("selected.createdBy"))}</span><strong>${escapeHtml(asset.created_by || "-")}</strong></div>
      <div class="inspect-row"><span>PPTX</span><strong>${asset.use_in_pptx ? "ON" : "OFF"}</strong></div>
      ${renderSelectedMaterialPanel("asset", asset)}
      ${
        url
          ? `
            <div class="aidr-right-asset-thumb-wrap selected-item-thumb-wrap">
              <img class="aidr-right-asset-thumb" src="${url}" alt="${escapeAttr(asset.filename || asset.asset_id || "asset")}">
            </div>
          `
          : ""
      }
      <div class="selected-actions">
        <label class="aidr-asset-use-toggle">
          <input
            type="checkbox"
            ${asset.use_in_pptx ? "checked" : ""}
            onchange="toggleAssetUseInPptx(null, '${escapeAttr(asset.asset_id)}', this.checked)"
          >
          <span>${uiText("asset.useInPptx")}</span>
        </label>
        <button class="aidr-asset-delete-btn" onclick="deleteAsset(null, '${escapeAttr(asset.asset_id)}')">${uiText("previewContext.deleteAsset")}</button>
      </div>
      <div class="tiny-note">${uiText("selected.assetReadyNote")}</div>
    `;
    return;
  }

  if (selectedElementKey.startsWith("candidate:")) {
    const candidateId = selectedElementKey.slice("candidate:".length);
    const candidate = getSelectedAssetCandidate(candidateId);

    if (!candidate) {
      el.className = "selected-empty";
      el.innerHTML = escapeHtml(uiText("selected.candidateNotFound"));
      return;
    }

    const bbox = Array.isArray(candidate.bbox_px) ? candidate.bbox_px.join(", ") : "-";
    const accepted = candidate.status === "accepted";

    el.className = "selected-detail";
    el.innerHTML = `
      <div class="inspect-row"><span>${escapeHtml(uiText("selected.kind"))}</span><strong>${escapeHtml(uiText("selected.kindCandidate"))}</strong></div>
      <div class="inspect-row"><span>ID</span><strong>${escapeHtml(candidate.candidate_id || "-")}</strong></div>
      <div class="inspect-row"><span>bbox_px</span><strong>[${escapeHtml(bbox)}]</strong></div>
      <div class="inspect-row"><span>area_ratio</span><strong>${escapeHtml(String(candidate.area_ratio ?? "-"))}</strong></div>
      <div class="inspect-row"><span>${escapeHtml(uiText("selected.status"))}</span><strong>${escapeHtml(candidate.status || "candidate")}</strong></div>
      ${renderSelectedMaterialPanel("candidate", candidate)}
      ${
        accepted
          ? `<div class="inspect-row"><span>${escapeHtml(uiText("selected.acceptedAsset"))}</span><strong>${escapeHtml(candidate.accepted_asset_id || "-")}</strong></div>`
          : `
            <div class="selected-actions">
              <button class="aidr-asset-accept-btn" onclick="acceptCandidate(null, '${escapeAttr(candidate.candidate_id)}', true)">${escapeHtml(uiText("candidate.acceptSelected"))}</button>
              <button class="aidr-asset-delete-btn" onclick="deleteCandidate(null, '${escapeAttr(candidate.candidate_id)}')">${escapeHtml(uiText("candidate.deleteCandidate"))}</button>
            </div>
            <div class="tiny-note">${escapeHtml(uiText("selected.candidateAdjustNote"))}</div>
          `
      }
    `;
    return;
  }

  let itemType = "Rebuild Element";
  let found = null;

  if (selectedElementKey.startsWith("textblock:")) {
    const rawKey = selectedElementKey.slice("textblock:".length);
    found = currentBlocks.find((item, i) => elementKey(item, i) === rawKey);
    itemType = "Text Block";
  } else if (selectedElementKey.startsWith("rebuild:")) {
    const rawKey = selectedElementKey.slice("rebuild:".length);
    found = currentElements.find((item, i) => elementKey(item, i) === rawKey);
    itemType = "Rebuild Element";
  } else {
    found = currentElements.find((item, i) => elementKey(item, i) === selectedElementKey);
  }

  if (!found) {
    el.className = "selected-empty";
    el.innerHTML = escapeHtml(uiText("selected.elementNotFound"));
    return;
  }

  el.className = "selected-detail";

  const payload = {
    type: itemType,
    id: found.id || found.block_id || found.source_block_id || selectedElementKey,
    role: elementRole(found),
    style_ref: elementStyleRef(found) || null,
    confidence: found.confidence ?? found.score ?? null,
    text: elementText(found),
    source_block_id: found.source_block_id || found.source_id || null,
    position: extractRawBox(found),
  };

  el.innerHTML = `
    <div class="inspect-row"><span>ID</span><strong>${escapeHtml(payload.id)}</strong></div>
    <div class="inspect-row"><span>${escapeHtml(uiText("selected.role"))}</span><strong>${escapeHtml(payload.role)}</strong></div>
    <div class="inspect-row"><span>${escapeHtml(uiText("selected.confidence"))}</span><strong>${payload.confidence ?? "-"}</strong></div>
    <div class="inspect-text">${escapeHtml(payload.text || "")}</div>
    ${renderSelectedTextStyle(found)}
    <pre class="inspect-json">${escapeHtml(JSON.stringify(payload, null, 2))}</pre>
  `;
}

function collectPreviewElements(spec, blocks) {
  const fromSpec = extractElementsFromSpec(spec)
    .filter(el => elementText(el).trim().length > 0);

  if (fromSpec.length) return fromSpec;

  return (blocks || [])
    .filter(b => elementText(b).trim().length > 0)
    .map((b, i) => ({ ...b, __fallback_index: i }));
}

function extractElementsFromSpec(spec) {
  if (!spec || typeof spec !== "object") return [];

  const candidates = [
    spec.elements,
    spec.slide_elements,
    spec.objects,
    spec.layers,
    spec.shapes,
  ];

  for (const c of candidates) {
    if (Array.isArray(c)) return c;
  }

  if (spec.slide && Array.isArray(spec.slide.elements)) return spec.slide.elements;
  if (spec.rebuild_spec && Array.isArray(spec.rebuild_spec.elements)) return spec.rebuild_spec.elements;

  return [];
}

function elementKey(el, i) {
  return String(el.id || el.block_id || el.source_block_id || el.name || `el_${i}`);
}

function elementText(el) {
  return String(
    el.text ??
    el.display_text ??
    el.ocr_text ??
    el.content ??
    el.value ??
    el.label ??
    el.raw_text ??
    ""
  );
}


function elementStyleRef(el) {
  return String(
    el.style_ref ??
    el.styleRef ??
    el.style?.style_ref ??
    ""
  );
}

function renderSelectedTextStyle(el) {
  const styleRef = elementStyleRef(el);
  if (!styleRef) return "";

  // Keep selected style_ref for modal fallback.
  selectedThemeStyleRef = styleRef;

  const style = currentThemeStyles?.[styleRef] || {};
  const color = style.color ? String(style.color).replace("#", "") : "";
  const swatch = color
    ? `<span class="style-color-swatch" style="background:#${color}"></span>`
    : `<span class="style-color-swatch empty"></span>`;

  return `
    <div class="inspect-style-panel" data-style-ref="${escapeAttr(styleRef)}">
      <div class="inspect-style-head">
        <div>
          <div class="inspect-style-kicker">${escapeHtml(uiText("selected.textStyle"))}</div>
          <strong>${escapeHtml(styleRef)}</strong>
        </div>
        <button
          class="header-icon-btn selected-style-settings-btn"
          data-style-ref="${escapeAttr(styleRef)}"
          onclick="openThemeSettings(this.dataset.styleRef)"
          title="スタイル設定を開く"
        >⚙</button>
      </div>

      <div class="inspect-style-line">
        ${swatch}
        <span>${escapeHtml(styleValueLabel(style))}</span>
      </div>
    </div>
  `;
}


function renderSelectedMaterialPanel(kind, item) {
  const materialKind = String(kind || "asset");
  const materialId = String(
    item?.asset_id ??
    item?.candidate_id ??
    item?.accepted_asset_id ??
    item?.id ??
    ""
  );

  if (!materialId) return "";

  const label = materialKind === "candidate" ? uiText("selected.materialCandidate") : uiText("selected.material");
  const bbox = Array.isArray(item?.bbox_px) ? item.bbox_px.join(", ") : "";

  return `
    <div class="inspect-style-panel inspect-material-panel" data-material-kind="${escapeAttr(materialKind)}" data-material-id="${escapeAttr(materialId)}">
      <div class="inspect-style-head">
        <div>
          <div class="inspect-style-kicker">${escapeHtml(label)}</div>
        </div>
        <button
          class="header-icon-btn selected-material-settings-btn"
          data-material-kind="${escapeAttr(materialKind)}"
          data-material-id="${escapeAttr(materialId)}"
          onclick="openMaterialSettings(this.dataset.materialKind, this.dataset.materialId)"
          title="${escapeAttr(uiText("selected.openMaterialSettings"))}"
        >⚙</button>
      </div>

      <div class="inspect-style-line">
        <span>${escapeHtml(materialId)}</span>
      </div>
      ${bbox ? `<div class="tiny-note">bbox_px: [${escapeHtml(bbox)}]</div>` : ""}
    </div>
  `;
}

function ensureMaterialSettingsModal() {
  let modal = document.getElementById("materialSettingsModal");
  if (modal) return modal;

  modal = document.createElement("div");
  modal.id = "materialSettingsModal";
  modal.className = "material-settings-overlay";
  modal.hidden = true;
  modal.innerHTML = `
    <div class="material-settings-dialog" role="dialog" aria-modal="true" aria-labelledby="materialSettingsTitle">
      <div class="material-settings-head">
        <div>
          <div class="pane-kicker">${escapeHtml(uiText("selected.localRepair"))}</div>
          <div class="pane-title" id="materialSettingsTitle">${escapeHtml(uiText("selected.materialSettingsTitle"))}</div>
        </div>
        <button class="header-icon-btn" onclick="closeMaterialSettings()" title="閉じる">×</button>
      </div>

      <div class="material-settings-body">
        <div class="inspect-row"><span>${escapeHtml(uiText("recolor.label.target"))}</span><strong id="materialSettingsTarget">-</strong></div>

        <div class="material-tool-list">
          <button class="material-tool-btn" type="button" onclick="applyMaterialTextEraser()">
            <strong>${escapeHtml(uiText("materialOp.textEraser"))}</strong>
            <span>OCR文字ピクセルをローカル処理で消去する</span>
          </button>

          <button class="material-tool-btn" type="button" onclick="applyMaterialFillOpacity()">
            <strong>${escapeHtml(uiText("materialOp.fillOpacity"))}</strong>
            <span>カード背景面・ラベル背景面の透過を調整する</span>
          </button>

          <button class="material-tool-btn" type="button" onclick="log('material tool: recolor')">
            <strong>再配色</strong>
            <span>近似色・アクセント色を置換する</span>
          </button>
        </div>

        <div class="tiny-note">
          ${escapeHtml(uiText("selected.materialFixedEntryNote"))}
        </div>
      </div>
    </div>
  `;

  modal.querySelector("#assetPreviewImage")?.addEventListener("load", () => {
    applyAssetPreviewZoom();
  });

  modal.addEventListener("click", (event) => {
    if (event.target === modal) closeMaterialSettings();
  });

  document.body.appendChild(modal);
  return modal;
}

function openMaterialSettings(kind, materialId) {
  const materialKind = String(kind || "asset");
  const id = String(materialId || "");

  if (materialKind === "asset" && id && typeof window.openAssetPreviewWorkspaceById === "function") {
    const opened = window.openAssetPreviewWorkspaceById(id);
    if (opened) return;
  }

  const modal = ensureMaterialSettingsModal();
  const title = document.getElementById("materialSettingsTitle");
  const target = document.getElementById("materialSettingsTarget");
  const label = `${materialKind}:${id}`;

  modal.dataset.materialKind = materialKind;
  modal.dataset.materialId = id;

  if (title) title.textContent = materialKind === "candidate" ? uiText("assetEdit.candidateTitle") : uiText("assetEdit.title");
  if (target) target.textContent = label;

  modal.hidden = false;
  log(`open material settings: ${label}`);

  setTimeout(() => {
    if (typeof window.hideRecolorV1Ui === "function") {
      window.hideRecolorV1Ui();
    }
    if (typeof window.scheduleAssetEditStableUi === "function") {
      window.scheduleAssetEditStableUi();
    }
  }, 0);
}

function closeMaterialSettings() {
  const modal = document.getElementById("materialSettingsModal");
  if (modal) modal.hidden = true;
}



function resolveMaterialTargetAssetId() {
  const modal = document.getElementById("materialSettingsModal");
  const kind = String(modal?.dataset?.materialKind || "asset");
  const id = String(modal?.dataset?.materialId || "");

  if (!id) return "";

  const asAsset = typeof getSelectedAsset === "function" ? getSelectedAsset(id) : null;
  if (asAsset) return id;

  if (kind === "candidate" && typeof getSelectedAssetCandidate === "function") {
    const candidate = getSelectedAssetCandidate(id);
    if (candidate?.accepted_asset_id) return String(candidate.accepted_asset_id || "");
  }

  return kind === "asset" ? id : "";
}

async function applyMaterialTextEraser() {
  if (!selectedSlideId) {
    alert(uiText("common.noSlideSelected"));
    return;
  }

  const assetId = resolveMaterialTargetAssetId();

  if (!assetId) {
    alert(uiText("assetEdit.textEraserCandidateFirstRequired"));
    return;
  }

  const ok = window.confirm(uiText("assetEdit.applyTextEraserConfirm"));
  if (!ok) return;

  try {
    const data = await fetchJson(`/api/material/${selectedSlideId}/${assetId}/text-eraser`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        threshold: 32,
        dilation: 1,
        use_in_pptx: false
      }),
    });

    aidrAssetList = data.manifest?.assets || [];
    aidrSelectedAssetId = data.asset?.asset_id || assetId;
    selectedElementKey = `asset:${aidrSelectedAssetId}`;

    renderRightAssets();
    renderAssetOverlays();
    renderInspector();

    if (typeof loadAssetsForSlide === "function") {
      await loadAssetsForSlide(selectedSlideId);
      aidrSelectedAssetId = data.asset?.asset_id || aidrSelectedAssetId;
      selectedElementKey = `asset:${aidrSelectedAssetId}`;
      renderRightAssets();
      renderAssetOverlays();
      renderInspector();
    }

    log(`material text eraser applied: ${data.asset?.filename || data.asset?.asset_id || assetId}`);
    closeMaterialSettings();
  } catch (e) {
    console.warn("Text Eraser failed:", e);
    alert(formatUiText("assetEdit.textEraserFailed", { message: e.message }));
    if (typeof log === "function") log(`ERROR material text eraser: ${e.message}`);
  }
}



async function applyMaterialFillOpacity() {
  if (!selectedSlideId) {
    alert(uiText("common.noSlideSelected"));
    return;
  }

  const assetId = resolveMaterialTargetAssetId();

  if (!assetId) {
    alert(uiText("assetEdit.fillOpacityCandidateFirstRequired"));
    return;
  }

  const ok = window.confirm(uiText("assetEdit.applyFillOpacityConfirm"));
  if (!ok) return;

  try {
    const data = await fetchJson(`/api/material/${selectedSlideId}/${assetId}/fill-opacity`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        opacity: 0.35,
        tolerance: 36,
        min_luma: 170,
        use_in_pptx: false
      }),
    });

    aidrAssetList = data.manifest?.assets || [];
    aidrSelectedAssetId = data.asset?.asset_id || assetId;
    selectedElementKey = `asset:${aidrSelectedAssetId}`;

    renderRightAssets();
    renderAssetOverlays();
    renderInspector();

    if (typeof loadAssetsForSlide === "function") {
      await loadAssetsForSlide(selectedSlideId);
      aidrSelectedAssetId = data.asset?.asset_id || aidrSelectedAssetId;
      selectedElementKey = `asset:${aidrSelectedAssetId}`;
      renderRightAssets();
      renderAssetOverlays();
      renderInspector();
    }

    log(`material fill opacity applied: ${data.asset?.filename || data.asset?.asset_id || assetId}`);
    closeMaterialSettings();
  } catch (e) {
    console.warn("Fill Opacity failed:", e);
    alert(formatUiText("assetEdit.fillOpacityFailed", { message: e.message }));
    if (typeof log === "function") log(`ERROR material fill opacity: ${e.message}`);
  }
}



function getAssetMaterialOps(asset) {
  if (!asset || !Array.isArray(asset.material_ops)) return [];
  return asset.material_ops.map((op) => String(op?.type || "")).filter(Boolean);
}

function formatAssetOpLabel(op) {
  const labels = {
    text_eraser_v1: uiText("materialOp.textEraser"),
    fill_opacity_v1: uiText("materialOp.fillOpacity"),
    quick_repair_v1: uiText("materialOp.quickRepair"),
    recolor_v1: uiText("materialOp.recolor"),
  };
  return labels[op] || op;
}

function getAssetMaterialChainLabel(asset) {
  const ops = getAssetMaterialOps(asset);
  if (!ops.length) return asset?.source_asset_id ? uiText("assetKind.variant") : uiText("assetKind.original");
  return ops.map(formatAssetOpLabel).join(" → ");
}

function findAssetById(assetId) {
  return (aidrAssetList || []).find((a) => a && a.asset_id === assetId) || null;
}


function inferAssetIdFromPreview(src = "", title = "") {
  const cleanTitle = String(title || "").split("?")[0].trim();
  const cleanSrc = String(src || "").split("?")[0].trim();

  const titleBase = cleanTitle.split("/").pop() || "";
  const srcBase = cleanSrc.split("/").pop() || "";

  const base = titleBase || srcBase;
  if (!base) return "";

  return base.replace(/\.png$/i, "");
}

function findAssetByFilenameOrUrl(src = "", title = "") {
  const cleanSrc = String(src || "").split("?")[0];
  const cleanTitle = String(title || "").split("?")[0];

  const titleBase = cleanTitle.split("/").pop() || "";
  const srcBase = cleanSrc.split("/").pop() || "";

  const candidates = aidrAssetList || [];

  // 1) exact URL match is the safest route when filename and asset_id drift.
  let found = candidates.find((asset) => {
    const url = String(asset?.url || "").split("?")[0];
    return url && cleanSrc.endsWith(url);
  });
  if (found) return found;

  // 2) exact filename match
  found = candidates.find((asset) => {
    const filename = String(asset?.filename || "");
    return filename && (filename === titleBase || filename === srcBase);
  });
  if (found) return found;

  // 3) exact asset_id match as a final fallback only.
  const inferred = inferAssetIdFromPreview(src, title);
  if (inferred) {
    found = candidates.find((asset) => String(asset?.asset_id || "") === inferred);
    if (found) return found;
  }

  // Do not use loose substring match here.
  // Variant ids include source ids as prefixes, so substring matching can resolve
  // slide_001_asset_013_recolor_001 to slide_001_asset_013 incorrectly.
  return null;
}



function roleFromStyleRef(styleRef) {
  const ref = String(styleRef || "").trim();

  const map = {
    "left.h1": "h1",
    "main.h1": "h1",
    "title.h1": "h1",
    "left.h2": "h2",
    "main.h2": "h2",
    "title.h2": "h2",
    "left.p": "p",
    "main.p": "p",
    "body.p": "p",
    "footer.note": "footer.note",
    "meta.small": "meta.small",
    "card.title": "card.title",
    "card.body": "card.body",
    "card.note": "card.note",
    "card.meta": "card.meta",
    "card.title.on_light": "card.title",
    "card.body.on_light": "card.body",
    "card.note.on_light": "card.note",
    "card.meta.on_light": "card.meta",
    "card.title.on_dark": "card.title",
    "card.body.on_dark": "card.body",
    "card.note.on_dark": "card.note",
    "card.meta.on_dark": "card.meta",
  };

  return map[ref] || "";
}


function elementRole(el) {
  const styleRole = roleFromStyleRef(elementStyleRef(el));
  if (styleRole) return styleRole;

  return String(
    el.role ??
    el.type ??
    el.kind ??
    el.category ??
    ""
  );
}

function extractRawBox(el) {
  return (
    el.bbox_px ??
    el.bbox ??
    el.boundingBox ??
    el.bounding_box ??
    el.box ??
    el.placement_in ??
    el.position ??
    el.rect ??
    null
  );
}

function computeBox(el, index, naturalW, naturalH) {
  const raw = extractRawBox(el);

  let x = null, y = null, w = null, h = null;

  if (Array.isArray(raw)) {
    // [[x,y], [x,y]...] or [x,y,w,h]
    if (raw.length >= 4 && typeof raw[0] === "number") {
      [x, y, w, h] = raw;
    } else if (raw.length >= 2 && Array.isArray(raw[0])) {
      const xs = raw.map(p => Number(p[0])).filter(Number.isFinite);
      const ys = raw.map(p => Number(p[1])).filter(Number.isFinite);
      if (xs.length && ys.length) {
        const minX = Math.min(...xs), maxX = Math.max(...xs);
        const minY = Math.min(...ys), maxY = Math.max(...ys);
        x = minX; y = minY; w = maxX - minX; h = maxY - minY;
      }
    }
  } else if (raw && typeof raw === "object") {
    x = raw.x ?? raw.left ?? raw.l;
    y = raw.y ?? raw.top ?? raw.t;
    w = raw.w ?? raw.width;
    h = raw.h ?? raw.height;
  }

  if (x == null) x = el.x ?? el.left;
  if (y == null) y = el.y ?? el.top;
  if (w == null) w = el.w ?? el.width;
  if (h == null) h = el.h ?? el.height;

  x = Number(x); y = Number(y); w = Number(w); h = Number(h);

  // 位置がない場合は確認用に縦積み表示
  if (![x, y, w, h].every(Number.isFinite) || w <= 0 || h <= 0) {
    const top = 4 + index * 5.2;
    return { left: 5, top: Math.min(top, 88), width: 90, height: 4.5 };
  }

  const maxVal = Math.max(Math.abs(x + w), Math.abs(y + h), Math.abs(x), Math.abs(y));
  let denomW = naturalW;
  let denomH = naturalH;

  // PowerPoint inch scale fallback
  if (maxVal <= 20) {
    denomW = 13.333;
    denomH = 7.5;
  }

  return {
    left: clamp((x / denomW) * 100, 0, 100),
    top: clamp((y / denomH) * 100, 0, 100),
    width: clamp((w / denomW) * 100, 1, 100),
    height: clamp((h / denomH) * 100, 1, 100),
  };
}

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

async function renderAssets() {
  // Legacy global assets list is disabled.
  // Slide-scoped assets are rendered by loadAssetsForSlide() into aidrRightAssetsList.
  return;
}

function escapeHtml(s) {
  return String(s ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeAttr(s) {
  return escapeHtml(s).replaceAll("\n", " ");
}


let pendingUploadMode = "replace";

function openFiles() {
  openUploadModal("replace");
}

function addFiles() {
  openUploadModal("append");
}

function openUploadModal(mode) {
  pendingUploadMode = mode;
  const isReplace = mode === "replace";

  $("resetBeforeUpload").checked = isReplace;
  $("uploadModalTitle").textContent = isReplace ? uiText("source.openFiles") : uiText("source.addFiles");
  $("uploadModalDescription").textContent = isReplace
    ? uiText("workspace.openAsNewNote")
    : uiText("workspace.addToCurrentNote");
  $("uploadModeNote").textContent = isReplace
    ? uiText("workspace.replaceSourceNote")
    : uiText("workspace.appendSourceNote");

  $("uploadModal").classList.add("open");
  $("uploadModal").setAttribute("aria-hidden", "false");
}

function closeUploadModal() {
  $("uploadModal").classList.remove("open");
  $("uploadModal").setAttribute("aria-hidden", "true");
}

function chooseUploadFiles() {
  $("resetBeforeUpload").checked = pendingUploadMode === "replace";
  $("fileInput").accept = "image/*,.pdf,application/pdf";
  $("fileInput").click();
}

function chooseImageFiles() {
  $("resetBeforeUpload").checked = pendingUploadMode === "replace";
  $("fileInput").accept = "image/*";
  $("fileInput").click();
}

function choosePdfFiles() {
  $("resetBeforeUpload").checked = pendingUploadMode === "replace";
  $("fileInput").accept = ".pdf,application/pdf";
  $("fileInput").click();
}

async function readClipboardImage() {
  $("resetBeforeUpload").checked = pendingUploadMode === "replace";

  if (navigator.clipboard && navigator.clipboard.read) {
    try {
      const items = await navigator.clipboard.read();
      const files = [];

      for (const item of items) {
        const imageType = item.types.find((type) => type.startsWith("image/"));
        if (!imageType) continue;

        const blob = await item.getType(imageType);
        const ext = imageType.split("/")[1] || "png";
        const file = new File([blob], `clipboard_${Date.now()}.${ext}`, {type: imageType});
        files.push(file);
      }

      if (files.length) {
        log(`clipboard image: ${files.length} file(s)`);
        await uploadFiles(files);
        closeUploadModal();
        return;
      }
    } catch (e) {
      log(`clipboard read fallback: ${e.message}`);
    }
  }

  log("clipboard image: paste with ⌘V / Ctrl+V");
}

async function handleClipboardPaste(event) {
  const items = event.clipboardData?.items;
  if (!items) return;

  const files = [];
  for (const item of items) {
    if (!item.type || !item.type.startsWith("image/")) continue;
    const file = item.getAsFile();
    if (!file) continue;

    const ext = item.type.split("/")[1] || "png";
    files.push(new File([file], `clipboard_${Date.now()}.${ext}`, {type: item.type}));
  }

  if (!files.length) return;

  event.preventDefault();

  const modalOpen = $("uploadModal")?.classList.contains("open");
  $("resetBeforeUpload").checked = modalOpen
    ? pendingUploadMode === "replace"
    : false;

  log(`clipboard paste image: ${files.length} file(s)`);
  await uploadFiles(files);
  if (modalOpen) closeUploadModal();
}


async function uploadFiles(files) {
  if (!files.length) return;

  const form = new FormData();
  for (const file of files) form.append("files", file);
  form.append("reset", $("resetBeforeUpload").checked ? "true" : "false");

  log(`upload: ${files.length} file(s)`);

  try {
    const data = await fetchJson("/api/upload", {
      method: "POST",
      body: form,
    });

    for (const item of data.saved || []) {
      log(`saved: ${item.original} -> ${item.path}`);
    }
    for (const item of data.unsupported || []) {
      log(`skip: ${item.name} (${item.reason})`);
    }

    selectedSlideId = null;
    await refreshAll();
  } catch (e) {
    log(`ERROR upload: ${e.message}`);
  }
}

async function reconstruct() {
  $("reconstructBtn").disabled = true;
  log("reconstruct deck: start");
  startRunSpinner("reconstruct deck");

  try {
    const data = await fetchJson("/api/reconstruct", {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify({}),
    });

    stopRunSpinner("reconstruct deck completed");
    renderPipelineLogs(data.logs || []);
    log("reconstruct deck: done");
    await refreshAll();
    setPreviewMode("reconstructed");
  } catch (e) {
    stopRunSpinner("reconstruct deck failed", true);
    log(`ERROR reconstruct: ${e.message}`);
    try {
      await refreshAll();
    } catch (_) {}
  } finally {
    $("reconstructBtn").disabled = false;
  }
}

function renderPipelineLogs(logs) {
  for (const item of logs) {
    log(`--- ${item.label} ---`);
    log(`$ ${item.command}`);
    log(`returncode: ${item.returncode}`);
    if (item.stdout) log(`STDOUT:\n${item.stdout.trim()}`);
    if (item.stderr) log(`STDERR:\n${item.stderr.trim()}`);
  }
}

async function openFolderModal() {
  $("folderModal").classList.add("open");
  $("folderModal").setAttribute("aria-hidden", "false");
  await loadWorkspaceFolders();
}

function closeFolderModal() {
  $("folderModal").classList.remove("open");
  $("folderModal").setAttribute("aria-hidden", "true");
}

async function loadWorkspaceFolders() {
  try {
    const data = await fetchJson("/api/workspace-folders");
    currentWorkspaceRegistryPath = data.current || appState?.workspace || null;
    renderWorkspaceFolders(data.items || []);
  } catch (e) {
    log(`ERROR load workspaces: ${e.message}`);
  }
}

function renderWorkspaceFolders(items) {
  const el = $("registeredWorkspaceList");
  if (!items.length) {
    el.innerHTML = `<div class="registered-empty">${escapeHtml(uiText("workspace.empty"))}</div>`;
    return;
  }

  el.innerHTML = items.map((item) => {
    const isCurrent = currentWorkspaceRegistryPath && item.path === currentWorkspaceRegistryPath;
    return `
      <div class="registered-workspace-card">
        <button
          class="registered-star-btn"
          onclick="unregisterWorkspaceFolder('${escapeAttr(item.path)}')"
          title="${escapeAttr(uiText("workspace.unregisterTitle"))}"
        >★</button>

        <button class="registered-workspace-item" onclick="openRegisteredWorkspace('${escapeAttr(item.path)}')">
          <span class="registered-name-row">
            <strong>${escapeHtml(item.name || item.path)}</strong>
            ${isCurrent ? '<em>使用中</em>' : ''}
          </span>
          <small>${escapeHtml(item.path)}</small>
        </button>
      </div>
    `;
  }).join("");
}


function setWorkspaceRegisterStarState(active) {
  const btn = $("registerWorkspaceBtn");
  if (!btn) return;

  const registered = Boolean(active);
  btn.classList.toggle("is-registered", registered);
  btn.textContent = registered ? "★" : "☆";
  btn.title = registered
    ? "Current workspace is registered"
    : "Register current workspace";
}

async function registerCurrentWorkspaceFolder() {
  try {
    const data = await fetchJson("/api/workspace-folders/register-current", {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify({}),
    });

    renderWorkspaceFolders(data.items || []);
    setWorkspaceRegisterStarState(Boolean(data.item?.path));
    log(`registered current workspace: ${data.item?.path || ""}`);
  } catch (e) {
    log(`ERROR register current workspace: ${e.message}`);
  }
}

async function registerWorkspaceFolder() {
  const path = $("workspaceFolderPath").value.trim();
  if (!path) {
    log("register workspace: path is empty");
    return;
  }

  try {
    const data = await fetchJson("/api/workspace-folders/register", {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify({path}),
    });

    $("workspaceFolderPath").value = "";
    renderWorkspaceFolders(data.items || []);
    log(`registered workspace: ${path}`);
  } catch (e) {
    log(`ERROR register workspace: ${e.message}`);
  }
}

async function unregisterWorkspaceFolder(path) {
  const ok = confirm(uiText("workspace.unregisterConfirm"));
  if (!ok) return;

  try {
    const data = await fetchJson("/api/workspace-folders/unregister", {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify({path}),
    });

    renderWorkspaceFolders(data.items || []);
    log(`unregistered workspace: ${path}`);
  } catch (e) {
    log(`ERROR unregister workspace: ${e.message}`);
  }
}

async function openRegisteredWorkspace(path) {
  log(`open folder: ${path}`);

  try {
    const data = await fetchJson("/api/open/workspace-folder", {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify({path}),
    });

    log(data.message || "workspace opened");
    selectedSlideId = null;
    closeFolderModal();
    await refreshAll();
  } catch (e) {
    log(`ERROR open folder: ${e.message}`);
  }
}

async function openLatestPptx() {
  try {
    const data = await fetchJson("/api/open/latest-pptx", {method: "POST"});
    log(`open pptx: ${data.message}`);
  } catch (e) {
    log(`ERROR open pptx: ${e.message}`);
  }
}

async function openOutputFolder() {
  try {
    const data = await fetchJson("/api/open/output-folder", {method: "POST"});
    log(`open output folder: ${data.message}`);
  } catch (e) {
    log(`ERROR open output: ${e.message}`);
  }
}

function bindUpload() {
  const input = $("fileInput");

  input.addEventListener("change", (e) => {
    uploadFiles([...e.target.files]);
    input.value = "";
    closeUploadModal();
  });

  document.addEventListener("dragover", (e) => {
    e.preventDefault();
    document.body.classList.add("global-dragover");
  });

  document.addEventListener("dragleave", (e) => {
    if (!e.relatedTarget) document.body.classList.remove("global-dragover");
  });

  document.addEventListener("drop", (e) => {
    e.preventDefault();
    document.body.classList.remove("global-dragover");
    $("resetBeforeUpload").checked = false;
    uploadFiles([...e.dataTransfer.files]);
  });

  document.addEventListener("paste", handleClipboardPaste);

  const modalDropZone = $("modalDropZone");
  if (modalDropZone) {
    modalDropZone.addEventListener("dragover", (e) => {
      e.preventDefault();
      modalDropZone.classList.add("dragover");
    });

    modalDropZone.addEventListener("dragleave", () => {
      modalDropZone.classList.remove("dragover");
    });

    modalDropZone.addEventListener("drop", (e) => {
      e.preventDefault();
      modalDropZone.classList.remove("dragover");
      uploadFiles([...e.dataTransfer.files]);
      closeUploadModal();
    });
  }

  $("slidePreview").addEventListener("load", () => {
    renderPreview();
    renderOverlayLayers();
  });
}

document.addEventListener("DOMContentLoaded", () => {
  bindUpload();
  refreshAll();
});


// ─────────────────────────────────────────────────────────────
// Manual Image Asset Clipping
// ─────────────────────────────────────────────────────────────

let aidrAssetList = [];
let aidrSelectedAssetId = null;
let aidrAssetClipMode = false;
let aidrAssetClipDragStart = null;
let aidrAssetClipDragCurrent = null;
let aidrSelectedAssetBBoxPx = null;
let aidrCandidateResizeMode = null;
let aidrCandidateResizeStartBBox = null;
let aidrCandidateResizeId = null;

let aidrAssetResizeMode = null;
let aidrAssetResizeStartBBox = null;
let aidrAssetResizeId = null;
let aidrAssetPreviewEventsAttached = false;

let aidrClipGridEnabled = true;
let aidrClipSnapEnabled = true;
let aidrClipGridPitch = 32;
let aidrClipGridOrigin = "top_left";
let aidrClipResizeMode = null;
let aidrClipResizeStartBBox = null;

function aidrAssetClipEl(id) {
  return document.getElementById(id);
}

function aidrSetAssetClipStatus(message) {
  const el = aidrAssetClipEl("assetClipStatus");
  if (el) el.textContent = message;
}

function aidrEnsureAssetClipOverlays() {
  const stage = aidrAssetClipEl("previewStage");
  if (!stage) return;

  if (!aidrAssetClipEl("assetOverlay")) {
    const overlay = document.createElement("div");
    overlay.id = "assetOverlay";
    overlay.className = "asset-overlay";
    stage.appendChild(overlay);
  }

  if (!aidrAssetClipEl("clipGridOverlay")) {
    const grid = document.createElement("div");
    grid.id = "clipGridOverlay";
    grid.className = "clip-grid-overlay";
    grid.style.display = "none";
    stage.appendChild(grid);
  }

  if (!aidrAssetClipEl("assetSelectionOverlay")) {
    const selection = document.createElement("div");
    selection.id = "assetSelectionOverlay";
    selection.className = "asset-selection-overlay";
    selection.style.display = "none";
    stage.appendChild(selection);
  }

  if (!aidrAssetPreviewEventsAttached) {
    stage.addEventListener("mousedown", aidrOnAssetClipPreviewMouseDown);
    window.addEventListener("mousemove", aidrOnAssetClipPreviewMouseMove);
    window.addEventListener("mouseup", aidrOnAssetClipPreviewMouseUp);
    aidrAssetPreviewEventsAttached = true;
  }
}

function aidrGetAssetClipImageGeometry() {
  const stage = aidrAssetClipEl("previewStage");
  const img = aidrAssetClipEl("slidePreview");
  if (!stage || !img || !img.naturalWidth || !img.naturalHeight) return null;

  const stageRect = stage.getBoundingClientRect();
  const imgRect = img.getBoundingClientRect();

  if (!imgRect.width || !imgRect.height) return null;

  return {
    stage,
    img,
    stageRect,
    imgRect,
    naturalWidth: img.naturalWidth,
    naturalHeight: img.naturalHeight,
    scaleX: img.naturalWidth / imgRect.width,
    scaleY: img.naturalHeight / imgRect.height,
  };
}

function aidrAssetClipClamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

function aidrAssetClipClientToImagePx(clientX, clientY) {
  const g = aidrGetAssetClipImageGeometry();
  if (!g) return null;

  const xCss = aidrAssetClipClamp(clientX - g.imgRect.left, 0, g.imgRect.width);
  const yCss = aidrAssetClipClamp(clientY - g.imgRect.top, 0, g.imgRect.height);

  return {
    x: Math.round(xCss * g.scaleX),
    y: Math.round(yCss * g.scaleY),
    xCss,
    yCss,
  };
}

function aidrAssetBBoxPxToStageCss(bboxPx) {
  const g = aidrGetAssetClipImageGeometry();
  if (!g || !Array.isArray(bboxPx) || bboxPx.length !== 4) return null;

  const [x, y, w, h] = bboxPx.map(Number);
  const left = (g.imgRect.left - g.stageRect.left) + (x / g.naturalWidth) * g.imgRect.width;
  const top = (g.imgRect.top - g.stageRect.top) + (y / g.naturalHeight) * g.imgRect.height;
  const width = (w / g.naturalWidth) * g.imgRect.width;
  const height = (h / g.naturalHeight) * g.imgRect.height;

  return { left, top, width, height };
}

function aidrDrawAssetSelectionFromClient(startClient, currentClient) {
  const selection = aidrAssetClipEl("assetSelectionOverlay");
  const g = aidrGetAssetClipImageGeometry();
  if (!selection || !g || !startClient || !currentClient) return;

  const leftClient = aidrAssetClipClamp(Math.min(startClient.x, currentClient.x), g.imgRect.left, g.imgRect.right);
  const rightClient = aidrAssetClipClamp(Math.max(startClient.x, currentClient.x), g.imgRect.left, g.imgRect.right);
  const topClient = aidrAssetClipClamp(Math.min(startClient.y, currentClient.y), g.imgRect.top, g.imgRect.bottom);
  const bottomClient = aidrAssetClipClamp(Math.max(startClient.y, currentClient.y), g.imgRect.top, g.imgRect.bottom);

  const a = aidrAssetClipClientToImagePx(leftClient, topClient);
  const b = aidrAssetClipClientToImagePx(rightClient, bottomClient);
  if (!a || !b) return;

  let x1 = Math.min(a.x, b.x);
  let y1 = Math.min(a.y, b.y);
  let x2 = Math.max(a.x, b.x);
  let y2 = Math.max(a.y, b.y);

  if (aidrClipSnapEnabled) {
    x1 = snapImageValueToGrid(x1, g.naturalWidth, "x");
    y1 = snapImageValueToGrid(y1, g.naturalHeight, "y");
    x2 = snapImageValueToGrid(x2, g.naturalWidth, "x");
    y2 = snapImageValueToGrid(y2, g.naturalHeight, "y");

    if (x2 <= x1) x2 = aidrAssetClipClamp(x1 + getClipGridPitch(), 0, g.naturalWidth);
    if (y2 <= y1) y2 = aidrAssetClipClamp(y1 + getClipGridPitch(), 0, g.naturalHeight);
  }

  const x = Math.min(x1, x2);
  const y = Math.min(y1, y2);
  const w = Math.abs(x2 - x1);
  const h = Math.abs(y2 - y1);

  aidrSelectedAssetBBoxPx = [x, y, w, h];

  const css = aidrAssetBBoxPxToStageCss(aidrSelectedAssetBBoxPx);
  if (!css) return;

  selection.style.display = "block";
  selection.style.left = `${css.left}px`;
  selection.style.top = `${css.top}px`;
  selection.style.width = `${css.width}px`;
  selection.style.height = `${css.height}px`;

  const snapLabel = aidrClipSnapEnabled ? "Selected bbox_px snapped" : "Selected bbox_px";
  aidrRenderSelectionFromBBox(snapLabel);
}

function aidrOnAssetClipPreviewMouseDown(event) {
  if (event.button !== 0) return;
  if (!aidrAssetClipMode || !selectedSlideId) return;

  const g = aidrGetAssetClipImageGeometry();
  if (!g) return;

  const inside =
    event.clientX >= g.imgRect.left &&
    event.clientX <= g.imgRect.right &&
    event.clientY >= g.imgRect.top &&
    event.clientY <= g.imgRect.bottom;

  if (!inside) return;

  event.preventDefault();
  aidrAssetClipDragStart = { x: event.clientX, y: event.clientY };
  aidrAssetClipDragCurrent = { x: event.clientX, y: event.clientY };
  aidrSelectedAssetBBoxPx = null;
  aidrDrawAssetSelectionFromClient(aidrAssetClipDragStart, aidrAssetClipDragCurrent);
}

function aidrOnAssetClipPreviewMouseMove(event) {
  if (aidrAssetResizeMode) {
    aidrResizeAssetToClient(event.clientX, event.clientY);
    return;
  }

  if (aidrCandidateResizeMode) {
    aidrResizeCandidateToClient(event.clientX, event.clientY);
    return;
  }

  if (!aidrAssetClipMode) return;

  if (aidrClipResizeMode) {
    aidrResizeSelectionToClient(event.clientX, event.clientY);
    return;
  }

  if (!aidrAssetClipDragStart) return;

  aidrAssetClipDragCurrent = { x: event.clientX, y: event.clientY };
  aidrDrawAssetSelectionFromClient(aidrAssetClipDragStart, aidrAssetClipDragCurrent);
}

function aidrOnAssetClipPreviewMouseUp(event) {
  if (aidrAssetResizeMode) {
    const assetId = aidrAssetResizeId || aidrSelectedAssetId;
    aidrResizeAssetToClient(event.clientX, event.clientY);
    aidrAssetResizeMode = null;
    aidrAssetResizeStartBBox = null;
    aidrAssetResizeId = null;

    renderRightAssets();
    renderAssetOverlays();
    renderInspector();
    aidrScheduleBBoxGuideSync();

    saveAssetBBox(assetId);
    return;
  }

  if (aidrCandidateResizeMode) {
    const candidateId = aidrCandidateResizeId || aidrSelectedCandidateId;
    aidrResizeCandidateToClient(event.clientX, event.clientY);
    aidrCandidateResizeMode = null;
    aidrCandidateResizeStartBBox = null;
    aidrCandidateResizeId = null;
    saveCandidateBBox(candidateId);
    return;
  }

  if (!aidrAssetClipMode) return;

  if (aidrClipResizeMode) {
    aidrResizeSelectionToClient(event.clientX, event.clientY);
    aidrClipResizeMode = null;
    aidrClipResizeStartBBox = null;
    return;
  }

  if (!aidrAssetClipDragStart) return;

  aidrAssetClipDragCurrent = { x: event.clientX, y: event.clientY };
  aidrDrawAssetSelectionFromClient(aidrAssetClipDragStart, aidrAssetClipDragCurrent);
  aidrAssetClipDragStart = null;
  aidrAssetClipDragCurrent = null;
}



function aidrEnsureSelectionHandles() {
  const selection = aidrAssetClipEl("assetSelectionOverlay");
  if (!selection) return;

  if (selection.dataset.handlesReady === "1") return;

  selection.innerHTML = `
    <span class="clip-resize-handle n" data-handle="n"></span>
    <span class="clip-resize-handle s" data-handle="s"></span>
    <span class="clip-resize-handle e" data-handle="e"></span>
    <span class="clip-resize-handle w" data-handle="w"></span>
    <span class="clip-resize-handle ne" data-handle="ne"></span>
    <span class="clip-resize-handle nw" data-handle="nw"></span>
    <span class="clip-resize-handle se" data-handle="se"></span>
    <span class="clip-resize-handle sw" data-handle="sw"></span>
  `;

  selection.addEventListener("mousedown", aidrOnSelectionHandleMouseDown);
  selection.dataset.handlesReady = "1";
}

function aidrOnSelectionHandleMouseDown(event) {
  const handle = event.target?.dataset?.handle;
  if (!handle || !aidrSelectedAssetBBoxPx) return;

  event.preventDefault();
  event.stopPropagation();

  aidrClipResizeMode = handle;
  aidrClipResizeStartBBox = [...aidrSelectedAssetBBoxPx];
  aidrAssetClipDragStart = null;
  aidrAssetClipDragCurrent = null;
}

function aidrRenderSelectionFromBBox(label = "Selected bbox_px") {
  const selection = aidrAssetClipEl("assetSelectionOverlay");
  if (!selection || !Array.isArray(aidrSelectedAssetBBoxPx)) return;

  aidrEnsureSelectionHandles();

  const css = aidrAssetBBoxPxToStageCss(aidrSelectedAssetBBoxPx);
  if (!css) return;

  selection.style.display = "block";
  selection.style.left = `${css.left}px`;
  selection.style.top = `${css.top}px`;
  selection.style.width = `${css.width}px`;
  selection.style.height = `${css.height}px`;

  const [x, y, w, h] = aidrSelectedAssetBBoxPx;
  updateClipAssistInfo();
  aidrSetAssetClipStatus(`${label}: [${x}, ${y}, ${w}, ${h}]`);
}

function aidrResizeSelectionToClient(clientX, clientY) {
  const g = aidrGetAssetClipImageGeometry();
  const pos = aidrAssetClipClientToImagePx(clientX, clientY);

  if (!g || !pos || !aidrClipResizeMode || !Array.isArray(aidrClipResizeStartBBox)) {
    return;
  }

  let [x, y, w, h] = aidrClipResizeStartBBox;
  let x1 = x;
  let y1 = y;
  let x2 = x + w;
  let y2 = y + h;

  const mode = aidrClipResizeMode;

  if (mode.includes("w")) x1 = pos.x;
  if (mode.includes("e")) x2 = pos.x;
  if (mode.includes("n")) y1 = pos.y;
  if (mode.includes("s")) y2 = pos.y;

  x1 = aidrAssetClipClamp(x1, 0, g.naturalWidth);
  x2 = aidrAssetClipClamp(x2, 0, g.naturalWidth);
  y1 = aidrAssetClipClamp(y1, 0, g.naturalHeight);
  y2 = aidrAssetClipClamp(y2, 0, g.naturalHeight);

  if (aidrClipSnapEnabled) {
    x1 = snapImageValueToGrid(x1, g.naturalWidth, "x");
    x2 = snapImageValueToGrid(x2, g.naturalWidth, "x");
    y1 = snapImageValueToGrid(y1, g.naturalHeight, "y");
    y2 = snapImageValueToGrid(y2, g.naturalHeight, "y");
  }

  const minSize = Math.max(1, aidrClipSnapEnabled ? getClipGridPitch() : 2);

  if (x2 <= x1) {
    if (mode.includes("w")) x1 = aidrAssetClipClamp(x2 - minSize, 0, g.naturalWidth);
    else x2 = aidrAssetClipClamp(x1 + minSize, 0, g.naturalWidth);
  }

  if (y2 <= y1) {
    if (mode.includes("n")) y1 = aidrAssetClipClamp(y2 - minSize, 0, g.naturalHeight);
    else y2 = aidrAssetClipClamp(y1 + minSize, 0, g.naturalHeight);
  }

  const nx = Math.min(x1, x2);
  const ny = Math.min(y1, y2);
  const nw = Math.abs(x2 - x1);
  const nh = Math.abs(y2 - y1);

  aidrSelectedAssetBBoxPx = [
    Math.round(nx),
    Math.round(ny),
    Math.round(nw),
    Math.round(nh),
  ];

  const label = aidrClipSnapEnabled ? "Resized bbox_px snapped" : "Resized bbox_px";
  aidrRenderSelectionFromBBox(label);
}


function getClipGridOrigin() {
  return aidrClipGridOrigin || "top_left";
}

function setClipGridOrigin(value) {
  const allowed = new Set(["top_left", "center", "top_center"]);
  aidrClipGridOrigin = allowed.has(value) ? value : "top_left";

  renderClipGrid();

  if (aidrAssetClipDragStart && aidrAssetClipDragCurrent) {
    aidrDrawAssetSelectionFromClient(aidrAssetClipDragStart, aidrAssetClipDragCurrent);
  }

  if (Array.isArray(aidrSelectedAssetBBoxPx)) {
    aidrRenderSelectionFromBBox("Selected bbox_px");
  }
}

function getClipGridOriginOffset(axis, maxValue) {
  const origin = getClipGridOrigin();

  if (origin === "center") {
    return maxValue / 2;
  }

  if (origin === "top_center") {
    return axis === "x" ? maxValue / 2 : 0;
  }

  return 0;
}

function setClipAssistText(id, value) {
  const el = aidrAssetClipEl(id);
  if (el) el.textContent = value;
}

function updateClipAssistInfo() {
  const g = aidrGetAssetClipImageGeometry();

  if (!g) {
    setClipAssistText("aidrClipImageSizeInfo", "Source: -");
  } else {
    setClipAssistText("aidrClipImageSizeInfo", `Source: ${g.naturalWidth} × ${g.naturalHeight}px`);
  }

}

function getClipGridPitch() {
  const input = aidrAssetClipEl("aidrClipGridPitch");
  const raw = input ? Number(input.value) : aidrClipGridPitch;
  const pitch = Number.isFinite(raw) ? raw : 32;
  return Math.max(1, Math.min(240, Math.round(pitch)));
}

function snapImageValueToGrid(value, maxValue, axis = "x") {
  const pitch = getClipGridPitch();
  const originOffset = getClipGridOriginOffset(axis, maxValue);
  const snapped = originOffset + Math.round((Number(value) - originOffset) / pitch) * pitch;
  return aidrAssetClipClamp(Math.round(snapped), 0, maxValue);
}

function setClipGridEnabled(enabled) {
  aidrClipGridEnabled = Boolean(enabled);
  renderClipGrid();
}

function setClipGridPitch(value) {
  const pitch = Number(value);
  aidrClipGridPitch = Number.isFinite(pitch)
    ? Math.max(1, Math.min(240, Math.round(pitch)))
    : 32;

  const input = aidrAssetClipEl("aidrClipGridPitch");
  if (input) input.value = String(aidrClipGridPitch);

  renderClipGrid();

  if (aidrAssetClipDragStart && aidrAssetClipDragCurrent) {
    aidrDrawAssetSelectionFromClient(aidrAssetClipDragStart, aidrAssetClipDragCurrent);
  }
}

function setClipSnapEnabled(enabled) {
  aidrClipSnapEnabled = Boolean(enabled);

  if (aidrAssetClipDragStart && aidrAssetClipDragCurrent) {
    aidrDrawAssetSelectionFromClient(aidrAssetClipDragStart, aidrAssetClipDragCurrent);
  }
}

function aidrIsBBoxGuideActive() {
  return Boolean(
    aidrAssetClipMode ||
    aidrSelectedAssetId ||
    aidrSelectedCandidateId ||
    aidrCandidateResizeMode
  );
}

function aidrSyncBBoxGuideControls() {
  const assist = aidrAssetClipEl("aidrClipAssistControls");
  if (assist) {
    assist.style.display = aidrIsBBoxGuideActive() ? "flex" : "none";
  }
  renderClipGrid();
}

function aidrScheduleBBoxGuideSync() {
  aidrSyncBBoxGuideControls();

  requestAnimationFrame(() => {
    aidrSyncBBoxGuideControls();
  });

  window.setTimeout(() => {
    aidrSyncBBoxGuideControls();
  }, 0);
}

function renderClipGrid() {
  aidrEnsureAssetClipOverlays();

  const grid = aidrAssetClipEl("clipGridOverlay");
  const g = aidrGetAssetClipImageGeometry();

  updateClipAssistInfo();

  if (!grid || !g || !aidrIsBBoxGuideActive() || !aidrClipGridEnabled) {
    if (grid) {
      grid.style.display = "none";
      grid.style.backgroundImage = "";
      grid.style.backgroundPosition = "";
    }
    return;
  }

  const pitch = getClipGridPitch();
  const pitchX = Math.max(2, (pitch / g.naturalWidth) * g.imgRect.width);
  const pitchY = Math.max(2, (pitch / g.naturalHeight) * g.imgRect.height);

  const originX = getClipGridOriginOffset("x", g.naturalWidth);
  const originY = getClipGridOriginOffset("y", g.naturalHeight);
  const originCssX = (originX / g.naturalWidth) * g.imgRect.width;
  const originCssY = (originY / g.naturalHeight) * g.imgRect.height;

  grid.style.display = "block";
  grid.style.left = `${g.imgRect.left - g.stageRect.left}px`;
  grid.style.top = `${g.imgRect.top - g.stageRect.top}px`;
  grid.style.width = `${g.imgRect.width}px`;
  grid.style.height = `${g.imgRect.height}px`;
  grid.style.backgroundSize = `${pitchX}px ${pitchY}px`;
  grid.style.backgroundPosition = `${originCssX}px ${originCssY}px`;
}

function setAssetClipMode(enabled) {
  aidrAssetClipMode = Boolean(enabled);
  aidrEnsureAssetClipOverlays();

  const stage = aidrAssetClipEl("previewStage");
  if (stage) stage.classList.toggle("asset-clip-mode", aidrAssetClipMode);

  aidrSyncBBoxGuideControls();

  if (!aidrAssetClipMode) {
    cancelAssetClip();
    renderClipGrid();
    aidrSetAssetClipStatus(uiText("status.assetClipOff"));
  } else if (!selectedSlideId) {
    renderClipGrid();
    aidrSetAssetClipStatus(uiText("status.assetClipSelectSlide"));
  } else {
    renderClipGrid();
    aidrSetAssetClipStatus(uiText("status.assetClipDragToSelect"));
  }
}

function cancelAssetClip() {
  aidrAssetClipDragStart = null;
  aidrAssetClipDragCurrent = null;
  aidrClipResizeMode = null;
  aidrClipResizeStartBBox = null;
  aidrSelectedAssetBBoxPx = null;

  const selection = aidrAssetClipEl("assetSelectionOverlay");
  if (selection) selection.style.display = "none";

  updateClipAssistInfo();

  if (aidrAssetClipMode) {
    aidrSetAssetClipStatus(uiText("status.assetClipSelectionCancelled"));
  } else {
    aidrSetAssetClipStatus(uiText("status.assetClipOff"));
  }
}

async function loadAssetsForSlide(slideId = selectedSlideId) {
  if (!slideId) {
    aidrAssetList = [];
    aidrSelectedAssetId = null;
    renderRightAssets();
    renderAssetOverlays();
    return;
  }

  try {
    const data = await fetchJson(`/api/assets/${slideId}`);
    aidrAssetList = Array.isArray(data.assets) ? data.assets : [];
    renderRightAssets();
    renderAssetOverlays();
  } catch (e) {
    aidrAssetList = [];
    renderRightAssets(`ERROR loading assets: ${e.message}`);
    renderAssetOverlays();
  }
}

async function confirmAssetClip() {
  if (!selectedSlideId) {
    aidrSetAssetClipStatus(uiText("common.noSlideSelected"));
    return;
  }

  if (!Array.isArray(aidrSelectedAssetBBoxPx) || aidrSelectedAssetBBoxPx.length !== 4) {
    aidrSetAssetClipStatus(uiText("status.assetClipNoRectangle"));
    return;
  }

  const [x, y, w, h] = aidrSelectedAssetBBoxPx;
  if (w <= 2 || h <= 2) {
    aidrSetAssetClipStatus(uiText("status.assetClipRectangleTooSmall"));
    return;
  }

  try {
    const data = await fetchJson(`/api/assets/${selectedSlideId}/clip`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bbox_px: aidrSelectedAssetBBoxPx }),
    });

    aidrAssetList = data.manifest?.assets || [];
    aidrSelectedAssetId = data.asset?.asset_id || null;
    syncAssetClipModeToggle(false);
    setAssetClipMode(false);
    renderRightAssets();
    renderAssetOverlays();
    aidrSetAssetClipStatus(`Clipped: ${data.asset?.filename || "asset"}`);

    if (typeof log === "function") {
      log(`asset clipped: ${selectedSlideId} ${data.asset?.filename || ""}`);
    }
  } catch (e) {
    aidrSetAssetClipStatus(`ERROR clip asset: ${e.message}`);
    if (typeof log === "function") log(`ERROR clip asset: ${e.message}`);
  }
}

function renderRightAssets(errorMessage = "") {
  const el = aidrAssetClipEl("aidrRightAssetsList");
  if (!el) return;

  if (errorMessage) {
    el.innerHTML = `<div class="aidr-asset-empty error">${escapeHtml(errorMessage)}</div>`;
    return;
  }

  if (!selectedSlideId) {
    el.innerHTML = `<div class="aidr-asset-empty">${uiText("common.noSlideSelected")}</div>`;
    return;
  }

  if (!aidrAssetList.length) {
    el.innerHTML = `<div class="aidr-asset-empty">${uiText("assets.empty")}</div>`;
    return;
  }

  el.innerHTML = aidrAssetList.map((asset) => {
    const selected = asset.asset_id === aidrSelectedAssetId;
    const bbox = Array.isArray(asset.bbox_px) ? asset.bbox_px.join(", ") : "-";
    const url = asset.url ? `${asset.url}?t=${Date.now()}` : "";

    return `
      <div class="aidr-right-asset-item ${selected ? "selected" : ""}" onclick="selectAsset('${escapeHtml(asset.asset_id)}')">
        <div class="aidr-right-asset-thumb-wrap">
          ${url ? `<img class="aidr-right-asset-thumb" src="${url}" alt="${escapeHtml(asset.filename || asset.asset_id)}">` : ""}
        </div>
        <div class="aidr-right-asset-body">
          <div class="aidr-right-asset-id">${escapeHtml(asset.asset_id || "-")}</div>
          <div class="aidr-right-asset-meta">${escapeHtml(asset.filename || "-")}</div>
          <div class="aidr-right-asset-meta">bbox_px: [${escapeHtml(bbox)}]</div>
          <label class="aidr-asset-use-toggle" onclick="event.stopPropagation()">
            <input
              type="checkbox"
              ${asset.use_in_pptx ? "checked" : ""}
              onchange="toggleAssetUseInPptx(event, '${escapeHtml(asset.asset_id)}', this.checked)"
            >
            <span>${uiText("asset.useInPptx")}</span>
          </label>
        </div>
        <button class="aidr-asset-delete-btn" onclick="deleteAsset(event, '${escapeHtml(asset.asset_id)}')">${uiText("common.delete")}</button>
      </div>
    `;
  }).join("");
}

function getSelectedAsset(assetId = aidrSelectedAssetId) {
  if (!assetId) return null;
  return aidrAssetList.find((asset) => asset.asset_id === assetId) || null;
}

function selectAsset(assetId) {
  aidrSelectedAssetId = assetId;
  aidrSelectedCandidateId = null;
  selectedElementKey = `asset:${assetId}`;

  renderRightAssets();
  renderAssetOverlays();
  renderRightCandidates();
  renderCandidateOverlays();
  renderInspector();
  aidrScheduleBBoxGuideSync();
}

function startAssetBBoxResize(event, assetId, handle) {
  const asset = getSelectedAsset(assetId);
  if (!asset || !Array.isArray(asset.bbox_px)) return;

  event.preventDefault();
  event.stopPropagation();

  aidrSelectedAssetId = assetId;
  aidrSelectedCandidateId = null;
  selectedElementKey = `asset:${assetId}`;

  aidrAssetResizeMode = handle;
  aidrAssetResizeStartBBox = [...asset.bbox_px].map(Number);
  aidrAssetResizeId = assetId;

  renderRightAssets();
  renderAssetOverlays();
  renderRightCandidates();
  renderCandidateOverlays();
  renderInspector();
  aidrScheduleBBoxGuideSync();
}

function aidrResizeAssetToClient(clientX, clientY) {
  const g = aidrGetAssetClipImageGeometry();
  const pos = aidrAssetClipClientToImagePx(clientX, clientY);
  const asset = getSelectedAsset(aidrAssetResizeId);

  if (
    !g ||
    !pos ||
    !asset ||
    !aidrAssetResizeMode ||
    !Array.isArray(aidrAssetResizeStartBBox)
  ) {
    return;
  }

  let [x, y, w, h] = aidrAssetResizeStartBBox;
  let x1 = x;
  let y1 = y;
  let x2 = x + w;
  let y2 = y + h;

  const mode = aidrAssetResizeMode;

  if (mode.includes("w")) x1 = pos.x;
  if (mode.includes("e")) x2 = pos.x;
  if (mode.includes("n")) y1 = pos.y;
  if (mode.includes("s")) y2 = pos.y;

  x1 = aidrAssetClipClamp(x1, 0, g.naturalWidth);
  x2 = aidrAssetClipClamp(x2, 0, g.naturalWidth);
  y1 = aidrAssetClipClamp(y1, 0, g.naturalHeight);
  y2 = aidrAssetClipClamp(y2, 0, g.naturalHeight);

  if (aidrClipSnapEnabled) {
    x1 = snapImageValueToGrid(x1, g.naturalWidth, "x");
    x2 = snapImageValueToGrid(x2, g.naturalWidth, "x");
    y1 = snapImageValueToGrid(y1, g.naturalHeight, "y");
    y2 = snapImageValueToGrid(y2, g.naturalHeight, "y");
  }

  const minSize = Math.max(1, aidrClipSnapEnabled ? getClipGridPitch() : 2);

  if (x2 <= x1) {
    if (mode.includes("w")) x1 = aidrAssetClipClamp(x2 - minSize, 0, g.naturalWidth);
    else x2 = aidrAssetClipClamp(x1 + minSize, 0, g.naturalWidth);
  }

  if (y2 <= y1) {
    if (mode.includes("n")) y1 = aidrAssetClipClamp(y2 - minSize, 0, g.naturalHeight);
    else y2 = aidrAssetClipClamp(y1 + minSize, 0, g.naturalHeight);
  }

  const nx = Math.min(x1, x2);
  const ny = Math.min(y1, y2);
  const nw = Math.abs(x2 - x1);
  const nh = Math.abs(y2 - y1);

  asset.bbox_px = [
    Math.round(nx),
    Math.round(ny),
    Math.round(nw),
    Math.round(nh),
  ];

  renderAssetOverlays();
  renderInspector();
  aidrScheduleBBoxGuideSync();

  aidrSetAssetClipStatus(`Asset bbox_px preview: [${asset.bbox_px.join(", ")}]`);
}



async function saveAssetBBox(assetId = aidrSelectedAssetId) {
  const asset = getSelectedAsset(assetId);
  if (!selectedSlideId || !asset || !Array.isArray(asset.bbox_px)) return;

  try {
    const data = await fetchJson(`/api/assets/${selectedSlideId}/${assetId}/bbox`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bbox_px: asset.bbox_px }),
    });

    if (data.manifest && Array.isArray(data.manifest.assets)) {
      aidrAssetList = data.manifest.assets;
    }

    renderRightAssets();
    renderAssetOverlays();
    renderInspector();
    aidrScheduleBBoxGuideSync();

    aidrSetAssetClipStatus(`Asset bbox saved: ${assetId}`);
    if (typeof log === "function") {
      log(`asset bbox saved: ${selectedSlideId} ${assetId}`);
    }
  } catch (e) {
    aidrSetAssetClipStatus(`ERROR asset bbox save: ${e.message}`);
    if (typeof log === "function") log(`ERROR asset bbox save: ${e.message}`);
    await loadAssetsForSlide(selectedSlideId);
    renderInspector();
  }
}


async function toggleAssetUseInPptx(event, assetId, useInPptx) {
  if (event) event.stopPropagation();
  if (!selectedSlideId || !assetId) return;

  try {
    const data = await fetchJson(`/api/assets/${selectedSlideId}/${assetId}/toggle-use`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ use_in_pptx: Boolean(useInPptx) }),
    });

    aidrAssetList = data.manifest?.assets || [];
    renderRightAssets();
    renderAssetOverlays();
    renderInspector();
    aidrScheduleBBoxGuideSync();

    if (typeof log === "function") {
      log(`asset use_in_pptx updated: ${assetId} => ${Boolean(useInPptx)}`);
    }
  } catch (e) {
    if (typeof log === "function") log(`ERROR toggle asset use_in_pptx: ${e.message}`);
    await loadAssetsForSlide(selectedSlideId);
  }
}

async function deleteAsset(event, assetId) {
  if (event) event.stopPropagation();
  if (!selectedSlideId || !assetId) return;

  const ok = confirm(formatUiText("dialog.deleteAssetConfirm", { assetId }));
  if (!ok) return;

  try {
    const data = await fetchJson(`/api/assets/${selectedSlideId}/${assetId}`, {
      method: "DELETE",
    });

    aidrAssetList = data.manifest?.assets || [];

    if (aidrSelectedAssetId === assetId) {
      aidrSelectedAssetId = null;
    }

    if (selectedElementKey === `asset:${assetId}`) {
      selectedElementKey = null;
    }

    if (window.__quickRepairState?.assetId === assetId) {
      window.__quickRepairState.assetId = "";
      window.__quickRepairState.repairs = [];
      window.__quickRepairState.dragStart = null;
      window.__quickRepairState.tempRect = null;

      if (typeof window.closeAssetPreview === "function") {
        window.closeAssetPreview();
      }
    }

    renderRightAssets();
    renderAssetOverlays();
    renderInspector();
    aidrScheduleBBoxGuideSync();

    if (typeof log === "function") log(`asset deleted: ${assetId}`);
  } catch (e) {
    aidrSetAssetClipStatus(`ERROR delete asset: ${e.message}`);
    if (typeof log === "function") log(`ERROR delete asset: ${e.message}`);
  }
}

function renderAssetOverlays() {
  aidrEnsureAssetClipOverlays();

  const overlay = aidrAssetClipEl("assetOverlay");
  const toggle = aidrAssetClipEl("assetOverlayToggle");
  if (!overlay) return;

  const enabled = !toggle || toggle.checked;
  if (!enabled || !selectedSlideId) {
    overlay.innerHTML = "";
    overlay.style.display = "none";
    aidrSyncBBoxGuideControls();
    return;
  }

  overlay.style.display = "block";

  const parts = [];

  for (const asset of aidrAssetList) {
    const css = aidrAssetBBoxPxToStageCss(asset.bbox_px);
    if (!css) continue;

    const selected = asset.asset_id === aidrSelectedAssetId;
    const assetId = escapeHtml(asset.asset_id || "");
    const handles = selected ? `
        <span class="clip-resize-handle n" onmousedown="startAssetBBoxResize(event, '${assetId}', 'n')"></span>
        <span class="clip-resize-handle s" onmousedown="startAssetBBoxResize(event, '${assetId}', 's')"></span>
        <span class="clip-resize-handle e" onmousedown="startAssetBBoxResize(event, '${assetId}', 'e')"></span>
        <span class="clip-resize-handle w" onmousedown="startAssetBBoxResize(event, '${assetId}', 'w')"></span>
        <span class="clip-resize-handle ne" onmousedown="startAssetBBoxResize(event, '${assetId}', 'ne')"></span>
        <span class="clip-resize-handle nw" onmousedown="startAssetBBoxResize(event, '${assetId}', 'nw')"></span>
        <span class="clip-resize-handle se" onmousedown="startAssetBBoxResize(event, '${assetId}', 'se')"></span>
        <span class="clip-resize-handle sw" onmousedown="startAssetBBoxResize(event, '${assetId}', 'sw')"></span>
      ` : "";

    parts.push(`
      <div
        class="asset-bbox-item ${selected ? "selected" : ""}"
        data-asset-id="${escapeAttr(asset.asset_id || "")}"
        style="left:${css.left}px; top:${css.top}px; width:${css.width}px; height:${css.height}px;"
        onclick="selectAsset('${assetId}')"
        title="${assetId}"
      >
        <span class="asset-bbox-label">${escapeHtml(asset.filename || "asset")}</span>
        ${handles}
      </div>
    `);
  }

  overlay.innerHTML = parts.join("");
  aidrScheduleBBoxGuideSync();
}

function aidrResetAssetsForNoSlide() {
  aidrAssetList = [];
  aidrSelectedAssetId = null;
  aidrSelectedAssetBBoxPx = null;
  cancelAssetClip();
  renderRightAssets();
  renderAssetOverlays();
}

async function aidrSyncAssetClipAfterSlideSelect(slideId) {
  aidrSelectedAssetId = null;
  cancelAssetClip();
  await loadAssetsForSlide(slideId);
  renderAssetOverlays();
  renderClipGrid();
}

window.aidrResetAssetsForNoSlide = aidrResetAssetsForNoSlide;
window.aidrSyncAssetClipAfterSlideSelect = aidrSyncAssetClipAfterSlideSelect;

function aidrInstallAssetClipHooks() {
  aidrEnsureAssetClipOverlays();

  const img = aidrAssetClipEl("slidePreview");
  if (img && !img.__aidrAssetClipResizeHooked) {
    img.addEventListener("load", () => {
      renderAssetOverlays();
      if (aidrAssetClipMode) {
        aidrSetAssetClipStatus(uiText("status.assetClipDragToSelect"));
      }
    });
    img.__aidrAssetClipResizeHooked = true;
  }

  window.addEventListener("resize", renderOverlayLayers);
window.addEventListener("resize", renderClipGrid);
  window.addEventListener("resize", renderAssetOverlays);

  renderRightAssets();
  renderAssetOverlays();
}

window.setAssetClipMode = setAssetClipMode;
window.setClipGridEnabled = setClipGridEnabled;
window.setClipGridPitch = setClipGridPitch;
window.setClipSnapEnabled = setClipSnapEnabled;
window.setClipGridOrigin = setClipGridOrigin;
window.renderClipGrid = renderClipGrid;
window.cancelAssetClip = cancelAssetClip;
window.confirmAssetClip = confirmAssetClip;
window.exitBBoxEditMode = exitBBoxEditMode;


/* Asset Clip interaction: cancel clip mode by clicking preview stage margin outside the slide image */
let assetClipStageMarginConfirmStart = null;
let assetClipStageMarginConfirmBusy = false;

function clearAssetCandidateBBoxSelection(reason = "bbox selection cleared") {
  const hadAsset = Boolean(aidrSelectedAssetId);
  const hadCandidate = Boolean(aidrSelectedCandidateId);

  aidrSelectedAssetId = null;
  aidrSelectedCandidateId = null;
  aidrAssetResizeMode = null;
  aidrAssetResizeStartBBox = null;
  aidrAssetResizeId = null;
  aidrCandidateResizeMode = null;
  aidrCandidateResizeStartBBox = null;
  aidrCandidateResizeId = null;

  if (
    typeof selectedElementKey !== "undefined" &&
    selectedElementKey &&
    (
      selectedElementKey.startsWith("asset:") ||
      selectedElementKey.startsWith("candidate:")
    )
  ) {
    selectedElementKey = null;
  }

  renderRightAssets();
  renderAssetOverlays();
  renderRightCandidates();
  renderCandidateOverlays();
  renderInspector();
  aidrScheduleBBoxGuideSync();

  if (typeof log === "function" && (hadAsset || hadCandidate)) {
    log(reason);
  }
}

function exitBBoxEditMode() {
  // Leave Asset Clip / BBox edit mode explicitly.
  aidrAssetClipMode = false;

  const toggle = aidrAssetClipEl("assetClipModeToggle");
  if (toggle) toggle.checked = false;

  const assist = aidrAssetClipEl("aidrClipAssistControls");
  if (assist) assist.style.display = "none";

  const stage = document.querySelector(".preview-stage");
  if (stage) stage.classList.remove("asset-clip-mode");

  cancelAssetClip();
  clearAssetCandidateBBoxSelection("bbox edit exited");

  renderClipGrid();
  aidrSetAssetClipStatus(uiText("status.assetClipOff"));

  if (typeof log === "function") {
    log("bbox edit exited");
  }
}

function isAssetClipReadyToConfirmByStageMargin() {
  const hasAssetSelection =
    typeof aidrSelectedAssetId !== "undefined" &&
    Boolean(aidrSelectedAssetId);

  const hasCandidateSelection =
    typeof aidrSelectedCandidateId !== "undefined" &&
    Boolean(aidrSelectedCandidateId);

  return Boolean(
    aidrAssetClipMode ||
    hasAssetSelection ||
    hasCandidateSelection
  );
}

function isPointInsideRect(x, y, rect) {
  return (
    rect &&
    x >= rect.left &&
    x <= rect.right &&
    y >= rect.top &&
    y <= rect.bottom
  );
}

function shouldIgnoreAssetClipStageMarginTarget(target) {
  if (!target || !target.closest) return true;

  return Boolean(
    target.closest("#assetSelectionOverlay") ||
    target.closest(".asset-selection-overlay") ||
    target.closest(".clip-resize-handle") ||
    target.closest(".preview-context-menu") ||
    target.closest(".center-preview-controls") ||
    target.closest(".deck-action-row") ||
    target.closest("button") ||
    target.closest("input") ||
    target.closest("select") ||
    target.closest("textarea") ||
    target.closest("label") ||
    target.closest("a")
  );
}

function getAssetClipStageMarginHit(event) {
  if (!event || shouldIgnoreAssetClipStageMarginTarget(event.target)) return null;

  const wrap = event.target.closest?.(".preview-wrap") || document.querySelector(".preview-wrap");
  const stage = document.querySelector(".preview-stage");
  const img = stage?.querySelector?.(".slide-preview");

  if (!wrap || !stage || !img) return null;

  const wrapRect = wrap.getBoundingClientRect();
  const imgRect = img.getBoundingClientRect();

  // Must be inside the preview workspace wrapper.
  if (!isPointInsideRect(event.clientX, event.clientY, wrapRect)) return null;

  // Must be outside the actual slide image.
  if (isPointInsideRect(event.clientX, event.clientY, imgRect)) return null;

  return { stage: wrap };
}

function handleAssetClipStageMarginConfirmMouseDown(event) {
  if (event.button !== 0) return;

  if (!isAssetClipReadyToConfirmByStageMargin() || assetClipStageMarginConfirmBusy) {
    assetClipStageMarginConfirmStart = null;
    return;
  }

  const hit = getAssetClipStageMarginHit(event);
  if (!hit) {
    assetClipStageMarginConfirmStart = null;
    return;
  }

  assetClipStageMarginConfirmStart = {
    x: event.clientX,
    y: event.clientY,
    stage: hit.stage
  };
}

function handleAssetClipStageMarginConfirmMouseUp(event) {
  const start = assetClipStageMarginConfirmStart;
  assetClipStageMarginConfirmStart = null;

  if (!start) return;
  if (!isAssetClipReadyToConfirmByStageMargin()) return;
  if (assetClipStageMarginConfirmBusy) return;
  if (aidrClipResizeMode) return;

  const hit = getAssetClipStageMarginHit(event);
  if (!hit || hit.stage !== start.stage) return;

  const dx = Math.abs(event.clientX - start.x);
  const dy = Math.abs(event.clientY - start.y);
  if (dx > 4 || dy > 4) return;

  assetClipStageMarginConfirmBusy = true;

  try {
    exitBBoxEditMode();
  } finally {
    assetClipStageMarginConfirmBusy = false;
  }
}

if (!window.__assetClipStageMarginConfirmReady) {
  document.addEventListener("mousedown", handleAssetClipStageMarginConfirmMouseDown, true);
  document.addEventListener("mouseup", handleAssetClipStageMarginConfirmMouseUp, true);
  window.__assetClipStageMarginConfirmReady = true;
}


window.renderRightAssets = renderRightAssets;
window.selectAsset = selectAsset;
window.deleteAsset = deleteAsset;
window.toggleAssetUseInPptx = toggleAssetUseInPptx;
window.renderAssetOverlays = renderAssetOverlays;
window.loadAssetsForSlide = loadAssetsForSlide;

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", aidrInstallAssetClipHooks);
} else {
  aidrInstallAssetClipHooks();
}


// ─────────────────────────────────────────────────────────────
// Asset Candidate UI
// ─────────────────────────────────────────────────────────────

let aidrCandidateList = [];
let aidrSelectedCandidateId = null;
let aidrCandidatePreviewEventsAttached = false;

function aidrCandidateEl(id) {
  return document.getElementById(id);
}

function aidrSetCandidateStatus(message) {
  const el = aidrCandidateEl("assetCandidateStatus");
  if (el) el.textContent = message;
}

function aidrEnsureCandidateOverlay() {
  const stage = aidrCandidateEl("previewStage");
  if (!stage) return;

  if (!aidrCandidateEl("candidateOverlay")) {
    const overlay = document.createElement("div");
    overlay.id = "candidateOverlay";
    overlay.className = "candidate-overlay";
    stage.appendChild(overlay);
  }
}

function candidateBBoxPxToStageCss(bboxPx) {
  if (typeof aidrAssetBBoxPxToStageCss === "function") {
    return aidrAssetBBoxPxToStageCss(bboxPx);
  }

  const stage = aidrCandidateEl("previewStage");
  const img = aidrCandidateEl("slidePreview");
  if (!stage || !img || !img.naturalWidth || !img.naturalHeight) return null;

  const stageRect = stage.getBoundingClientRect();
  const imgRect = img.getBoundingClientRect();
  if (!imgRect.width || !imgRect.height) return null;

  const [x, y, w, h] = bboxPx.map(Number);
  return {
    left: (imgRect.left - stageRect.left) + (x / img.naturalWidth) * imgRect.width,
    top: (imgRect.top - stageRect.top) + (y / img.naturalHeight) * imgRect.height,
    width: (w / img.naturalWidth) * imgRect.width,
    height: (h / img.naturalHeight) * imgRect.height,
  };
}

async function loadAssetCandidatesForSlide(slideId = selectedSlideId) {
  if (!slideId) {
    aidrCandidateList = [];
    aidrSelectedCandidateId = null;
    renderRightCandidates();
    renderCandidateOverlays();
    return;
  }

  try {
    const data = await fetchJson(`/api/asset-candidates/${slideId}`);
    aidrCandidateList = Array.isArray(data.candidates) ? data.candidates : [];
    renderRightCandidates();
    renderCandidateOverlays();
    aidrSetCandidateStatus(formatUiText("candidate.statusLoaded", { count: aidrCandidateList.length }));
  } catch (e) {
    aidrCandidateList = [];
    renderRightCandidates(`ERROR loading candidates: ${e.message}`);
    renderCandidateOverlays();
    aidrSetCandidateStatus(`ERROR loading candidates: ${e.message}`);
  }
}

async function detectAssetCandidates() {
  if (!selectedSlideId) {
    aidrSetCandidateStatus(uiText("common.noSlideSelected"));
    return;
  }

  aidrSetCandidateStatus("Detecting asset candidates...");
  startRunSpinner(`detect candidates ${selectedSlideId}`);

  try {
    const data = await fetchJson(`/api/asset-candidates/${selectedSlideId}/detect`, {
      method: "POST",
    });

    aidrCandidateList = Array.isArray(data.candidates?.candidates)
      ? data.candidates.candidates
      : [];

    aidrSelectedCandidateId = null;
    renderRightCandidates();
    renderCandidateOverlays();
    aidrSetCandidateStatus(`Detected candidates: ${aidrCandidateList.length}`);
    stopRunSpinner(`detect candidates completed ${selectedSlideId}`);

    if (typeof log === "function") {
      log(`asset candidates detected: ${selectedSlideId} count=${aidrCandidateList.length}`);
    }
  } catch (e) {
    stopRunSpinner(`detect candidates failed ${selectedSlideId}`, true);
    aidrSetCandidateStatus(`ERROR detect candidates: ${e.message}`);
    if (typeof log === "function") log(`ERROR detect candidates: ${e.message}`);
  }
}

function renderCandidateOverlays() {
  aidrEnsureCandidateOverlay();

  const overlay = aidrCandidateEl("candidateOverlay");
  const toggle = aidrCandidateEl("assetCandidatesToggle");
  if (!overlay) return;

  const enabled = !toggle || toggle.checked;
  if (!enabled || !selectedSlideId) {
    overlay.innerHTML = "";
    overlay.style.display = "none";
    return;
  }

  overlay.style.display = "block";

  const parts = [];

  for (const candidate of aidrCandidateList) {
    if (candidate.status === "accepted") continue;

    const css = candidateBBoxPxToStageCss(candidate.bbox_px);
    if (!css) continue;

    const selected = candidate.candidate_id === aidrSelectedCandidateId;

    const candidateId = escapeHtml(candidate.candidate_id || "");
    const handles = selected ? `
        <span class="clip-resize-handle n" onmousedown="startCandidateBBoxResize(event, '${candidateId}', 'n')"></span>
        <span class="clip-resize-handle s" onmousedown="startCandidateBBoxResize(event, '${candidateId}', 's')"></span>
        <span class="clip-resize-handle e" onmousedown="startCandidateBBoxResize(event, '${candidateId}', 'e')"></span>
        <span class="clip-resize-handle w" onmousedown="startCandidateBBoxResize(event, '${candidateId}', 'w')"></span>
        <span class="clip-resize-handle ne" onmousedown="startCandidateBBoxResize(event, '${candidateId}', 'ne')"></span>
        <span class="clip-resize-handle nw" onmousedown="startCandidateBBoxResize(event, '${candidateId}', 'nw')"></span>
        <span class="clip-resize-handle se" onmousedown="startCandidateBBoxResize(event, '${candidateId}', 'se')"></span>
        <span class="clip-resize-handle sw" onmousedown="startCandidateBBoxResize(event, '${candidateId}', 'sw')"></span>
      ` : "";

    parts.push(`
      <div
        class="candidate-bbox-item ${selected ? "selected" : ""}"
        data-candidate-id="${escapeAttr(candidate.candidate_id || "")}"
        style="left:${css.left}px; top:${css.top}px; width:${css.width}px; height:${css.height}px;"
        onclick="selectAssetCandidate('${candidateId}')"
        title="${candidateId}"
      >
        <span class="candidate-bbox-label">${escapeHtml(candidate.candidate_id || "candidate")}</span>
        ${handles}
      </div>
    `);
  }

  overlay.innerHTML = parts.join("");
}

function renderRightCandidates(errorMessage = "") {
  const el = aidrCandidateEl("aidrRightCandidatesList");
  if (!el) return;

  if (errorMessage) {
    el.innerHTML = `<div class="aidr-asset-empty error">${escapeHtml(errorMessage)}</div>`;
    return;
  }

  if (!selectedSlideId) {
    el.innerHTML = `<div class="aidr-asset-empty">${uiText("common.noSlideSelected")}</div>`;
    return;
  }

  const visibleCandidates = aidrCandidateList.filter((candidate) => candidate.status !== "accepted");

  if (!visibleCandidates.length) {
    el.innerHTML = `<div class="aidr-asset-empty">${uiText("candidates.noActive")}</div>`;
    return;
  }

  el.innerHTML = visibleCandidates.map((candidate) => {
    const selected = candidate.candidate_id === aidrSelectedCandidateId;
    const accepted = candidate.status === "accepted";
    const bbox = Array.isArray(candidate.bbox_px) ? candidate.bbox_px.join(", ") : "-";

    return `
      <div
        class="aidr-right-candidate-item ${selected ? "selected" : ""} ${accepted ? "accepted" : ""}"
        onclick="selectAssetCandidate('${escapeHtml(candidate.candidate_id)}')"
      >
        <div class="aidr-right-candidate-id">${escapeHtml(candidate.candidate_id || "-")}</div>
        <div class="aidr-right-asset-meta">bbox_px: [${escapeHtml(bbox)}]</div>
        <div class="aidr-right-asset-meta">area_ratio: ${escapeHtml(String(candidate.area_ratio ?? "-"))}</div>
        <div class="aidr-right-asset-meta">status: ${escapeHtml(candidate.status || "candidate")}</div>
        ${
          accepted
            ? `<div class="aidr-right-asset-meta">asset: ${escapeHtml(candidate.accepted_asset_id || "-")}</div>`
            : `
              <button class="aidr-asset-accept-btn" onclick="acceptCandidate(event, '${escapeHtml(candidate.candidate_id)}', true)">${uiText("candidate.acceptSelected")}</button>
              <button class="aidr-asset-delete-btn" onclick="deleteCandidate(event, '${escapeHtml(candidate.candidate_id)}')">${uiText("common.delete")}</button>
            `
        }
      </div>
    `;
  }).join("");
}

function selectAssetCandidate(candidateId) {
  aidrSelectedCandidateId = candidateId;
  aidrSelectedAssetId = null;
  selectedElementKey = `candidate:${candidateId}`;

  renderRightCandidates();
  renderCandidateOverlays();
  renderRightAssets();
  renderAssetOverlays();
  renderInspector();
  aidrScheduleBBoxGuideSync();
}

function getSelectedAssetCandidate(candidateId = aidrSelectedCandidateId) {
  if (!candidateId) return null;
  return aidrCandidateList.find((candidate) => candidate.candidate_id === candidateId) || null;
}

function startCandidateBBoxResize(event, candidateId, handle) {
  const candidate = getSelectedAssetCandidate(candidateId);
  if (!candidate || !Array.isArray(candidate.bbox_px)) return;

  event.preventDefault();
  event.stopPropagation();

  aidrSelectedCandidateId = candidateId;
  aidrCandidateResizeMode = handle;
  aidrCandidateResizeStartBBox = [...candidate.bbox_px].map(Number);
  aidrCandidateResizeId = candidateId;

  renderRightCandidates();
  renderCandidateOverlays();
}

function aidrResizeCandidateToClient(clientX, clientY) {
  const g = aidrGetAssetClipImageGeometry();
  const pos = aidrAssetClipClientToImagePx(clientX, clientY);
  const candidate = getSelectedAssetCandidate(aidrCandidateResizeId);

  if (
    !g ||
    !pos ||
    !candidate ||
    !aidrCandidateResizeMode ||
    !Array.isArray(aidrCandidateResizeStartBBox)
  ) {
    return;
  }

  let [x, y, w, h] = aidrCandidateResizeStartBBox;
  let x1 = x;
  let y1 = y;
  let x2 = x + w;
  let y2 = y + h;

  const mode = aidrCandidateResizeMode;

  if (mode.includes("w")) x1 = pos.x;
  if (mode.includes("e")) x2 = pos.x;
  if (mode.includes("n")) y1 = pos.y;
  if (mode.includes("s")) y2 = pos.y;

  x1 = aidrAssetClipClamp(x1, 0, g.naturalWidth);
  x2 = aidrAssetClipClamp(x2, 0, g.naturalWidth);
  y1 = aidrAssetClipClamp(y1, 0, g.naturalHeight);
  y2 = aidrAssetClipClamp(y2, 0, g.naturalHeight);

  if (aidrClipSnapEnabled) {
    x1 = snapImageValueToGrid(x1, g.naturalWidth, "x");
    x2 = snapImageValueToGrid(x2, g.naturalWidth, "x");
    y1 = snapImageValueToGrid(y1, g.naturalHeight, "y");
    y2 = snapImageValueToGrid(y2, g.naturalHeight, "y");
  }

  const minSize = Math.max(1, aidrClipSnapEnabled ? getClipGridPitch() : 2);

  if (x2 <= x1) {
    if (mode.includes("w")) x1 = aidrAssetClipClamp(x2 - minSize, 0, g.naturalWidth);
    else x2 = aidrAssetClipClamp(x1 + minSize, 0, g.naturalWidth);
  }

  if (y2 <= y1) {
    if (mode.includes("n")) y1 = aidrAssetClipClamp(y2 - minSize, 0, g.naturalHeight);
    else y2 = aidrAssetClipClamp(y1 + minSize, 0, g.naturalHeight);
  }

  const nx = Math.min(x1, x2);
  const ny = Math.min(y1, y2);
  const nw = Math.abs(x2 - x1);
  const nh = Math.abs(y2 - y1);

  candidate.bbox_px = [
    Math.round(nx),
    Math.round(ny),
    Math.round(nw),
    Math.round(nh),
  ];

  renderRightCandidates();
  renderCandidateOverlays();

  aidrSetCandidateStatus(formatUiText("status.candidateBbox", { bbox: candidate.bbox_px.join(", ") }));
}

async function saveCandidateBBox(candidateId = aidrSelectedCandidateId) {
  const candidate = getSelectedAssetCandidate(candidateId);
  if (!selectedSlideId || !candidate || !Array.isArray(candidate.bbox_px)) return;

  try {
    const data = await fetchJson(`/api/asset-candidates/${selectedSlideId}/${candidateId}/bbox`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bbox_px: candidate.bbox_px }),
    });

    const updated = data.candidate;
    if (updated && Array.isArray(updated.bbox_px)) {
      candidate.bbox_px = updated.bbox_px;
    }

    if (data.candidates && Array.isArray(data.candidates.candidates)) {
      aidrCandidateList = data.candidates.candidates;
    }

    renderRightCandidates();
    renderCandidateOverlays();
    aidrSetCandidateStatus(`Candidate bbox updated: ${candidateId}`);

    if (typeof log === "function") {
      log(`candidate bbox updated: ${selectedSlideId} ${candidateId}`);
    }
  } catch (e) {
    aidrSetCandidateStatus(`ERROR candidate bbox update: ${e.message}`);
    if (typeof log === "function") log(`ERROR candidate bbox update: ${e.message}`);
    await loadAssetCandidatesForSlide(selectedSlideId);
  }
}

async function acceptSelectedCandidate() {
  if (!aidrSelectedCandidateId) {
    aidrSetCandidateStatus(uiText("status.noCandidateSelected"));
    return;
  }
  await acceptCandidate(null, aidrSelectedCandidateId, true);
}

async function deleteCandidate(event, candidateId) {
  if (event) {
    event.preventDefault();
    event.stopPropagation();
  }

  if (!selectedSlideId || !candidateId) return;

  try {
    const data = await fetchJson(`/api/asset-candidates/${selectedSlideId}/${candidateId}/delete`, {
      method: "POST",
    });

    aidrCandidateList = Array.isArray(data.candidates?.candidates)
      ? data.candidates.candidates
      : [];

    if (aidrSelectedCandidateId === candidateId) {
      aidrSelectedCandidateId = null;
    }

    if (selectedElementKey === `candidate:${candidateId}`) {
      selectedElementKey = null;
    }

    renderRightCandidates();
    renderCandidateOverlays();
    renderInspector();
    aidrScheduleBBoxGuideSync();
    aidrSetCandidateStatus(`Deleted candidate: ${candidateId}`);

    if (typeof log === "function") {
      log(`asset candidate deleted: ${selectedSlideId} ${candidateId}`);
    }
  } catch (e) {
    aidrSetCandidateStatus(`ERROR delete candidate: ${e.message}`);
    if (typeof log === "function") log(`ERROR delete candidate: ${e.message}`);
  }
}

async function acceptCandidate(event, candidateId, useInPptx = true) {
  if (event) event.stopPropagation();
  if (!selectedSlideId || !candidateId) return;

  try {
    const data = await fetchJson(`/api/asset-candidates/${selectedSlideId}/${candidateId}/accept`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ use_in_pptx: Boolean(useInPptx) }),
    });

    aidrCandidateList = Array.isArray(data.candidates?.candidates)
      ? data.candidates.candidates
      : aidrCandidateList;

    if (aidrSelectedCandidateId === candidateId) {
      aidrSelectedCandidateId = null;
    }

    if (selectedElementKey === `candidate:${candidateId}`) {
      selectedElementKey = null;
    }

    if (typeof loadAssetsForSlide === "function") {
      await loadAssetsForSlide(selectedSlideId);
    }

    renderRightCandidates();
    renderCandidateOverlays();
    renderInspector();
    aidrScheduleBBoxGuideSync();
    aidrSetCandidateStatus(`Accepted candidate: ${candidateId}`);

    if (typeof log === "function") {
      log(`asset candidate accepted: ${selectedSlideId} ${candidateId}`);
    }
  } catch (e) {
    aidrSetCandidateStatus(`ERROR accept candidate: ${e.message}`);
    if (typeof log === "function") log(`ERROR accept candidate: ${e.message}`);
  }
}



async function acceptAllCandidates() {
  if (!selectedSlideId) {
    aidrSetCandidateStatus(uiText("common.noSlideSelected"));
    return;
  }

  startRunSpinner(`accept all candidates ${selectedSlideId}`);

  try {
    const data = await fetchJson(`/api/asset-candidates/${selectedSlideId}/accept-all`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ use_in_pptx: true }),
    });

    aidrCandidateList = Array.isArray(data.candidates?.candidates)
      ? data.candidates.candidates
      : aidrCandidateList;

    if (typeof loadAssetsForSlide === "function") {
      await loadAssetsForSlide(selectedSlideId);
    }

    renderRightCandidates();
    renderCandidateOverlays();

    const count = Array.isArray(data.accepted) ? data.accepted.length : 0;
    stopRunSpinner(`accept all candidates completed ${selectedSlideId}`);
    aidrSetCandidateStatus(`Accepted all candidates: ${count}`);

    if (typeof log === "function") {
      log(`asset candidates accepted all: ${selectedSlideId} count=${count}`);
    }
  } catch (e) {
    stopRunSpinner(`accept all candidates failed ${selectedSlideId}`, true);
    aidrSetCandidateStatus(`ERROR accept all candidates: ${e.message}`);
    if (typeof log === "function") log(`ERROR accept all candidates: ${e.message}`);
  }
}

function aidrResetCandidatesForNoSlide() {
  aidrCandidateList = [];
  aidrSelectedCandidateId = null;
  renderRightCandidates();
  renderCandidateOverlays();
}

async function aidrSyncCandidateClipAfterSlideSelect(slideId) {
  aidrSelectedCandidateId = null;
  await loadAssetCandidatesForSlide(slideId);
  renderCandidateOverlays();
}

window.aidrResetCandidatesForNoSlide = aidrResetCandidatesForNoSlide;
window.aidrSyncCandidateClipAfterSlideSelect = aidrSyncCandidateClipAfterSlideSelect;

function aidrInstallCandidateHooks() {
  aidrEnsureCandidateOverlay();

  const img = aidrCandidateEl("slidePreview");
  if (img && !img.__aidrCandidateClipResizeHooked) {
    img.addEventListener("load", () => {
      renderCandidateOverlays();
    });
    img.__aidrCandidateClipResizeHooked = true;
  }

  window.addEventListener("resize", renderCandidateOverlays);

  renderRightCandidates();
  renderCandidateOverlays();
}

window.loadAssetCandidatesForSlide = loadAssetCandidatesForSlide;
window.detectAssetCandidates = detectAssetCandidates;
window.renderCandidateOverlays = renderCandidateOverlays;
window.renderRightCandidates = renderRightCandidates;
window.selectAssetCandidate = selectAssetCandidate;
window.acceptSelectedCandidate = acceptSelectedCandidate;
window.acceptCandidate = acceptCandidate;
window.acceptAllCandidates = acceptAllCandidates;

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", aidrInstallCandidateHooks);
} else {
  aidrInstallCandidateHooks();
}


// ─────────────────────────────────────────────────────────────
// Incremental Slide Processing UI
// ─────────────────────────────────────────────────────────────

function logPipelineSteps(prefix, data) {
  if (!data) return;

  if (data.message) {
    log(`${prefix}: ${data.message}`);
  }

  const steps = Array.isArray(data.steps) ? data.steps : [];
  for (const step of steps) {
    log(`--- ${step.label || "step"} ---`);
    if (Array.isArray(step.cmd)) {
      log(`$ ${step.cmd.join(" ")}`);
    }
    log(`returncode: ${step.returncode}`);

    if (step.stdout) {
      log(`STDOUT:\n${step.stdout}`);
    }

    if (step.stderr) {
      log(`STDERR:\n${step.stderr}`);
    }
  }
}

async function processSelectedSlide() {
  if (!selectedSlideId) {
    log("ERROR process slide: no slide selected");
    return;
  }

  try {
    log(`process slide: start ${selectedSlideId}`);
    startRunSpinner(`process slide ${selectedSlideId}`);
    const data = await fetchJson(`/api/process-slide/${selectedSlideId}`, {
      method: "POST",
    });
    stopRunSpinner(`process slide completed ${selectedSlideId}`);
    logPipelineSteps(`process slide ${selectedSlideId}`, data);
    await refreshAll();
    log(`process slide: done ${selectedSlideId}`);
  } catch (e) {
    stopRunSpinner(`process slide failed ${selectedSlideId}`, true);
    log(`ERROR process slide: ${e.message}`);
  }
}

async function processPendingSlides() {
  try {
    log("process pending slides: start");
    startRunSpinner("process pending slides");
    const data = await fetchJson("/api/process-pending-slides", {
      method: "POST",
    });
    stopRunSpinner("process pending slides completed");
    logPipelineSteps("process pending slides", data);

    if (Array.isArray(data.slide_ids)) {
      log(`pending slide ids: ${data.slide_ids.join(", ") || "(none)"}`);
    }

    await refreshAll();
    log("process pending slides: done");
  } catch (e) {
    stopRunSpinner("process pending slides failed", true);
    log(`ERROR process pending slides: ${e.message}`);
  }
}

async function exportPptx() {
  try {
    log("export pptx: start");
    startRunSpinner("export pptx");
    const data = await fetchJson("/api/export-pptx", {
      method: "POST",
    });
    stopRunSpinner("export pptx completed");
    logPipelineSteps("export pptx", data);
    await refreshAll();
    log("export pptx: done");
  } catch (e) {
    stopRunSpinner("export pptx failed", true);
    log(`ERROR export pptx: ${e.message}`);
  }
}

window.processSelectedSlide = processSelectedSlide;
window.processPendingSlides = processPendingSlides;
window.exportPptx = exportPptx;


// HEX color input and swatch controls
window.normalizeStyleColor = function(value) {
  const color = String(value || "").trim().replace("#", "").toUpperCase();
  return /^[0-9A-F]{6}$/.test(color) ? color : "";
};

window.applyStyleColorPreview = function(colorValue) {
  const color = window.normalizeStyleColor(colorValue);
  const swatch = $("styleEditColorSwatch");

  if (!color) return;

  if (swatch) swatch.style.background = `#${color}`;
};

window.syncStyleColorFromText = function() {
  const input = $("styleEditColor");
  if (!input) return;

  const color = window.normalizeStyleColor(input.value);
  if (color) {
    input.value = color;
    window.applyStyleColorPreview(color);
  }
};



// Color popover from swatch
window.styleColorPalettes = {
  Theme: ["111827", "F9FAFB", "6B7280", "CBD5E1", "0B3B8C", "64748B", "F59E0B"]
};



// Auto system palette from current slide image
function inferSlideIdFromValue(value) {
  const text = String(value || "");
  const m = text.match(/slide_\d+/);
  return m ? m[0] : "";
}

function inferSlideIdFromObject(obj) {
  if (!obj || typeof obj !== "object") return "";

  const keys = [
    "slide_id",
    "slideId",
    "id",
    "block_id",
    "source_block_id",
    "source_id",
    "asset_id",
    "candidate_id",
    "filename",
  ];

  for (const key of keys) {
    const hit = inferSlideIdFromValue(obj[key]);
    if (hit) return hit;
  }

  return "";
}


// Infer currently visible or active slide from DOM.
// This is needed when Theme tab is active and selectedElementKey points to style_ref.
function aidrInferSlideIdFromDom() {
  const candidates = [];

  function addCandidate(value, el, baseScore = 0) {
    const slideId = inferSlideIdFromValue(value);
    if (!slideId) return;

    let score = baseScore;

    try {
      const rect = el?.getBoundingClientRect?.();
      if (rect && rect.width > 20 && rect.height > 20) score += 5;
    } catch (e) {}

    try {
      const text = [
        el?.id || "",
        el?.className || "",
        el?.getAttribute?.("aria-selected") || "",
        el?.getAttribute?.("data-active") || "",
        el?.getAttribute?.("data-selected") || "",
      ].join(" ").toLowerCase();

      if (/current|active|selected|preview|canvas|workspace/.test(text)) score += 20;
      if (/thumb|thumbnail|slide-card|slide-item/.test(text)) score += 8;
    } catch (e) {}

    try {
      if (el?.closest?.('[aria-selected="true"], .active, .selected, .is-active, .is-selected, .current')) {
        score += 40;
      }
    } catch (e) {}

    candidates.push({ slideId, score });
  }

  try {
    document.querySelectorAll("[data-slide-id], [data-slide], [data-id], [data-key], [data-src]").forEach(el => {
      ["data-slide-id", "data-slide", "data-id", "data-key", "data-src"].forEach(attr => {
        addCandidate(el.getAttribute(attr), el, 10);
      });
    });
  } catch (e) {}

  try {
    document.querySelectorAll("img[src], image[href]").forEach(el => {
      addCandidate(el.getAttribute("src") || el.getAttribute("href"), el, 12);
    });
  } catch (e) {}

  try {
    document.querySelectorAll("[style*='slide_']").forEach(el => {
      addCandidate(el.getAttribute("style"), el, 6);
    });
  } catch (e) {}

  if (!candidates.length) return "";

  candidates.sort((a, b) => b.score - a.score);
  return candidates[0].slideId || "";
}


function getCurrentPaletteSlideId() {
  // 1. selected item key
  let hit = inferSlideIdFromValue(selectedElementKey);
  if (hit) return hit;

  // 2. current selected object
  try {
    let found = null;

    if (selectedElementKey && selectedElementKey.startsWith("textblock:")) {
      const rawKey = selectedElementKey.slice("textblock:".length);
      found = currentBlocks.find((item, i) => elementKey(item, i) === rawKey);
    } else if (selectedElementKey && selectedElementKey.startsWith("rebuild:")) {
      const rawKey = selectedElementKey.slice("rebuild:".length);
      found = currentElements.find((item, i) => elementKey(item, i) === rawKey);
    } else if (selectedElementKey) {
      found = currentElements.find((item, i) => elementKey(item, i) === selectedElementKey);
    }

    hit = inferSlideIdFromObject(found);
    if (hit) return hit;
  } catch (e) {
    // ignore
  }

  // 3. visible/active slide DOM, useful when Theme tab is active
  try {
    hit = aidrInferSlideIdFromDom();
    if (hit) return hit;
  } catch (e) {
    // ignore
  }

  // 4. common global states, if present
  try {
    hit =
      inferSlideIdFromValue(typeof currentSlideId !== "undefined" ? currentSlideId : "") ||
      inferSlideIdFromObject(typeof currentSlide !== "undefined" ? currentSlide : null) ||
      inferSlideIdFromObject(typeof selectedSlide !== "undefined" ? selectedSlide : null) ||
      inferSlideIdFromObject(appState?.current_slide) ||
      inferSlideIdFromValue(appState?.current_slide_id) ||
      inferSlideIdFromValue(appState?.selected_slide_id);

    if (hit) return hit;
  } catch (e) {
    // ignore
  }

  // 5. fallback: first slide in appState, only if available
  try {
    const first = (appState?.slides || [])[0];
    hit = inferSlideIdFromObject(first) || inferSlideIdFromValue(first);
    if (hit) return hit;
  } catch (e) {
    // ignore
  }

  return "";
}

function systemPaletteColors() {
  if (Array.isArray(currentSystemPaletteColors) && currentSystemPaletteColors.length) {
    return currentSystemPaletteColors;
  }

  return window.styleColorPalettes?.System || ["0B3B8C", "333333", "666666", "999999", "FFFFFF"];
}

async function loadSystemPaletteForCurrentSlide() {
  const slideId = getCurrentPaletteSlideId();

  if (!slideId) {
    log("WARN system palette: slide_id not found");
    return [];
  }

  if (currentSystemPaletteSlideId === slideId && currentSystemPaletteColors.length) {
    return currentSystemPaletteColors;
  }

  try {
    const data = await fetchJson(`/api/slides/${encodeURIComponent(slideId)}/palette`);
    currentSystemPaletteSlideId = slideId;
    currentSystemPaletteColors = data.palette || [];

    log(`system palette loaded: ${slideId} / ${currentSystemPaletteColors.length} colors`);

    return currentSystemPaletteColors;
  } catch (e) {
    log(`WARN system palette: ${e.message}`);
    return [];
  }
}

function styleColorPaletteDisplayName(name) {
  if (name === "Theme") return uiText("assist.theme");
  if (name === "System") return currentLanguage === "ja" ? "システム" : "System";
  return name;
}

function refreshStyleColorPopoverLabels(pop) {
  if (!pop) return;

  const title = pop.querySelector(".style-color-popover-head strong");
  if (title) title.textContent = uiText("recolor.label.colorPalette");

  const cancelBtn = pop.querySelector("[data-style-color-action='cancel']");
  if (cancelBtn) cancelBtn.textContent = uiText("common.cancel");

  const applyBtn = pop.querySelector("[data-style-color-action='apply']");
  if (applyBtn) applyBtn.textContent = uiText("common.apply");
}

window.ensureStyleColorPopover = function() {
  let pop = $("styleColorPopover");
  if (pop) {
    refreshStyleColorPopoverLabels(pop);
    return pop;
  }

  pop = document.createElement("div");
  pop.id = "styleColorPopover";
  pop.className = "style-color-popover";
  pop.innerHTML = `
    <div class="style-color-popover-head">
      <strong>${escapeHtml(uiText("recolor.label.colorPalette"))}</strong>
      <button type="button" class="style-color-popover-close" onclick="window.closeStyleColorPopover()">×</button>
    </div>

    <div class="style-color-popover-preview">
      <span id="styleColorPopoverSwatch" class="style-color-popover-swatch"></span>
      <input id="styleColorPopoverHex" type="text" placeholder="333333" oninput="window.syncStyleColorPopoverHex()">
    </div>

    <div id="styleColorPaletteTabs" class="style-color-palette-tabs"></div>
    <div id="styleColorPaletteSwatches" class="style-color-palette-swatches"></div>

    <div class="style-color-popover-actions">
      <button type="button" class="btn compact-action" data-style-color-action="cancel" onclick="window.closeStyleColorPopover()">${escapeHtml(uiText("common.cancel"))}</button>
      <button type="button" class="btn primary compact-action" data-style-color-action="apply" onclick="window.applyStyleColorPopover()">${escapeHtml(uiText("common.apply"))}</button>
    </div>
  `;

  document.body.appendChild(pop);
  refreshStyleColorPopoverLabels(pop);
  return pop;
};

window.renderStyleColorPalette = function(activeName = "System") {
  const tabs = $("styleColorPaletteTabs");
  const swatches = $("styleColorPaletteSwatches");
  if (!tabs || !swatches) return;

  const names = Object.keys(window.styleColorPalettes || {});
  tabs.innerHTML = names.map((name) => `
    <button
      type="button"
      class="style-color-palette-tab ${name === activeName ? "active" : ""}"
      onclick="window.renderStyleColorPalette('${escapeAttr(name)}')"
    >${escapeHtml(styleColorPaletteDisplayName(name))}</button>
  `).join("");

  const colors = activeName === "System"
    ? systemPaletteColors()
    : (window.styleColorPalettes[activeName] || []);

  swatches.innerHTML = colors.map((color) => `
    <button
      type="button"
      class="style-color-chip"
      style="background:#${escapeAttr(color)}"
      title="#${escapeAttr(color)}"
      onclick="window.setStyleColorPopoverValue('${escapeAttr(color)}')"
    ></button>
  `).join("");
};

window.setStyleColorPopoverValue = function(colorValue) {
  const color = window.normalizeStyleColor(colorValue);
  if (!color) return;

  const input = $("styleColorPopoverHex");
  const swatch = $("styleColorPopoverSwatch");

  if (input) input.value = color;
  if (swatch) swatch.style.background = `#${color}`;
};

window.syncStyleColorPopoverHex = function() {
  const input = $("styleColorPopoverHex");
  if (!input) return;

  const color = window.normalizeStyleColor(input.value);
  if (!color) return;

  window.setStyleColorPopoverValue(color);
};

window.ensureStyleColorPopoverBackdrop = function() {
  let backdrop = document.getElementById("styleColorPopoverBackdrop");
  if (!backdrop) {
    backdrop = document.createElement("div");
    backdrop.id = "styleColorPopoverBackdrop";
    backdrop.className = "style-color-popover-backdrop";
    backdrop.style.display = "none";

    backdrop.addEventListener("click", function (event) {
      event.preventDefault();
      event.stopPropagation();
      if (typeof log === "function") log("color palette backdrop: blocked outside click");
    }, true);

    document.body.appendChild(backdrop);
  }

  return backdrop;
};

window.openStyleColorPopover = function() {
  const pop = window.ensureStyleColorPopover();
  const backdrop = window.ensureStyleColorPopoverBackdrop();
  const swatch = $("styleEditColorSwatch");
  const input = $("styleEditColor");

  const current = window.normalizeStyleColor(input?.value || "") || "333333";
  window.setStyleColorPopoverValue(current);
  window.renderStyleColorPalette("Theme");

  loadSystemPaletteForCurrentSlide().then(() => {
    window.renderStyleColorPalette("Theme");
  });

  const rect = swatch?.getBoundingClientRect?.();
  if (rect) {
    pop.style.left = `${Math.min(window.innerWidth - 340, Math.max(16, rect.left))}px`;
    pop.style.top = `${Math.min(window.innerHeight - 300, rect.bottom + 10)}px`;
  }

  backdrop.style.display = "block";
  pop.classList.add("is-modal");
  pop.style.display = "block";
};

window.closeStyleColorPopover = function() {
  const pop = $("styleColorPopover");
  if (pop) pop.style.display = "none";

  const backdrop = $("styleColorPopoverBackdrop");
  if (backdrop) backdrop.style.display = "none";
};

window.applyStyleColorPopover = function() {
  const input = $("styleColorPopoverHex");
  const color = window.normalizeStyleColor(input?.value || "");
  if (!color) return;

  const mainInput = $("styleEditColor");
  if (mainInput) mainInput.value = color;

  window.applyStyleColorPreview(color);
  window.closeStyleColorPopover();
};


/* Role style catalog controls
 * Role Style Catalog Editor enhancer.
 *
 * Design policy:
 * - Existing Text Style Calibration modal remains the single editor.
 * - Selected Item gear opens the modal with that item's style_ref selected.
 * - Category is a dropdown.
 * - Style Ref inside the category is chip/radio-like.
 * - Font Size remains directly editable and uses native number stepper.
 * - Existing Save Style logic and /api/theme/styles/<style_ref> POST are reused.
 */
(function () {
  if (window.__AIDR_ROLE_STYLE_CATALOG_INSTALLED__) return;
  window.__AIDR_ROLE_STYLE_CATALOG_INSTALLED__ = true;

  let aidrTextStyleCatalog = [];
  let aidrTextStyleDefinitions = {};
  let aidrTextStyleCurrentCategory = "";

  function aidrTextStyleEl(id) {
    if (typeof $ === "function") return $(id);
    return document.getElementById(id);
  }

  function aidrTextStyleEscape(value) {
    const s = String(value ?? "");
    return s
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function aidrGetSelectedStyleRef() {
    try {
      if (typeof selectedThemeStyleRef !== "undefined" && selectedThemeStyleRef) return selectedThemeStyleRef;
    } catch (e) {}

    try {
      if (window.selectedThemeStyleRef) return window.selectedThemeStyleRef;
    } catch (e) {}

    try {
      if (typeof selectedStyleRef !== "undefined" && selectedStyleRef) return selectedStyleRef;
    } catch (e) {}

    try {
      if (window.selectedStyleRef) return window.selectedStyleRef;
    } catch (e) {}

    const active = document.querySelector(".aidr-style-ref-chip.is-active");
    if (active && active.dataset.styleRef) return active.dataset.styleRef;

    const first = aidrTextStyleCatalog?.[0]?.style_refs?.[0];
    return first || "";
  }

  function aidrSetSelectedStyleRef(ref) {
    if (!ref) return;

    try {
      selectedThemeStyleRef = ref;
    } catch (e) {}

    try {
      window.selectedThemeStyleRef = ref;
    } catch (e) {}

    try {
      selectedStyleRef = ref;
    } catch (e) {}

    try {
      window.selectedStyleRef = ref;
    } catch (e) {}
  }

  function aidrCategoryForStyleRef(ref) {
    const hit = aidrTextStyleCatalog.find(group => (group.style_refs || []).includes(ref));
    return hit ? hit.category : (aidrTextStyleCatalog[0]?.category || "");
  }

  function aidrShortStyleLabel(ref) {
    if (!ref) return "";

    if (ref.startsWith("left.")) return ref.replace("left.", "");
    if (ref.startsWith("center.")) return ref.replace("center.", "");
    if (ref.startsWith("right.")) return ref.replace("right.", "");

    if (ref.startsWith("card.") && ref.endsWith(".on_light")) {
      return ref.replace("card.", "").replace(".on_light", "");
    }

    if (ref.startsWith("card.") && ref.endsWith(".on_dark")) {
      return ref.replace("card.", "").replace(".on_dark", "");
    }

    if (ref.startsWith("card.")) return ref.replace("card.", "");

    return ref;
  }

  function aidrStyleSubGroupLabel(ref) {
    if (ref.startsWith("left.")) return "Left";
    if (ref.startsWith("center.")) return "Center";
    if (ref.startsWith("right.")) return "Right";
    return "";
  }

  function aidrGroupStyleRefsForDisplay(category, refs) {
    if (category !== "Main") {
      return [{ label: "", refs }];
    }

    const buckets = [
      { key: "left.", label: "Left", refs: [] },
      { key: "center.", label: "Center", refs: [] },
      { key: "right.", label: "Right", refs: [] },
    ];

    const other = { key: "other", label: "Other", refs: [] };

    refs.forEach(ref => {
      const bucket = buckets.find(b => ref.startsWith(b.key));
      if (bucket) bucket.refs.push(ref);
      else other.refs.push(ref);
    });

    return [...buckets, other].filter(b => b.refs.length > 0).map(b => ({
      label: b.label,
      refs: b.refs,
    }));
  }

  async function aidrLoadTextStyleCatalog() {
    try {
      const res = await fetch("/api/theme/style-catalog");
      const data = await res.json();

      if (!res.ok || data.error) {
        console.warn("Role style catalog load failed:", data);
        return;
      }

      aidrTextStyleCatalog = data.catalog || [];
      aidrTextStyleDefinitions = data.styles || {};
    } catch (err) {
      console.warn("Role style catalog load error:", err);
    }
  }

  function aidrEnsureFontSizeStepper() {
    const input = document.getElementById("styleEditFontSize");
    if (!input) return;
    if (input.closest(".aidr-font-size-combo")) return;

    input.setAttribute("type", "number");
    input.setAttribute("min", "6");
    input.setAttribute("max", "96");
    input.setAttribute("step", "1");
    input.classList.add("aidr-font-size-stepper");

    const parent = input.parentElement;
    if (parent && !parent.querySelector(".aidr-font-size-unit")) {
      const unit = document.createElement("span");
      unit.className = "aidr-font-size-unit";
      unit.textContent = "pt";
      input.insertAdjacentElement("afterend", unit);
    }
  }

  function aidrFindTextStyleInsertionContainer() {
    const sizeInput = document.getElementById("styleEditFontSize");
    if (!sizeInput) return null;

    const row = sizeInput.closest("label") || sizeInput.closest(".style-row") || sizeInput.parentElement;
    if (!row) return null;

    return row.parentElement || row;
  }

  function aidrRenderTextStyleCatalogControls() {
    const insertionContainer = aidrFindTextStyleInsertionContainer();
    if (!insertionContainer) return;

    const currentRef = aidrGetSelectedStyleRef();
    const category = aidrTextStyleCurrentCategory || aidrCategoryForStyleRef(currentRef);
    aidrTextStyleCurrentCategory = category;

    let panel = document.getElementById("aidrRoleStyleCatalog");
    if (!panel) {
      panel = document.createElement("div");
      panel.id = "aidrRoleStyleCatalog";
      panel.className = "aidr-role-style-catalog";
      insertionContainer.insertBefore(panel, insertionContainer.firstChild);
    }

    const group = aidrTextStyleCatalog.find(g => g.category === category) || aidrTextStyleCatalog[0] || { category: "", style_refs: [] };
    const refs = group.style_refs || [];

    const categoryOptions = aidrTextStyleCatalog.map(g => {
      const selected = g.category === category ? "selected" : "";
      return `<option value="${aidrTextStyleEscape(g.category)}" ${selected}>${aidrTextStyleEscape(g.category)}</option>`;
    }).join("");

    const groupedRefs = aidrGroupStyleRefsForDisplay(group.category, refs);

    const chipsHtml = groupedRefs.map(row => {
      const rowLabel = row.label
        ? `<div class="aidr-style-ref-subgroup">${aidrTextStyleEscape(row.label)}</div>`
        : "";

      const chips = row.refs.map(ref => {
        const active = ref === currentRef ? "is-active" : "";
        return `
          <button
            type="button"
            class="aidr-style-ref-chip ${active}"
            data-style-ref="${aidrTextStyleEscape(ref)}"
            title="${aidrTextStyleEscape(ref)}"
          >${aidrTextStyleEscape(aidrShortStyleLabel(ref))}</button>
        `;
      }).join("");

      return `
        <div class="aidr-style-ref-row">
          ${rowLabel}
          <div class="aidr-style-ref-chip-wrap">${chips}</div>
        </div>
      `;
    }).join("");

    panel.innerHTML = `
      <div class="aidr-role-style-head">
        <div class="aidr-role-style-title">${aidrTextStyleEscape(uiText("textStyle.roleStyle"))}</div>
        <div class="aidr-role-style-current">${aidrTextStyleEscape(currentRef || "-")}</div>
      </div>

      <div class="aidr-role-style-line">
        <label for="aidrStyleCategory">${aidrTextStyleEscape(uiText("textStyle.category"))}</label>
        <select id="aidrStyleCategory">${categoryOptions}</select>
      </div>

      <div class="aidr-role-style-line aidr-role-style-line-refs">
        <label>${aidrTextStyleEscape(uiText("textStyle.styleRef"))}</label>
        <div class="aidr-style-ref-list">${chipsHtml}</div>
      </div>
    `;

    const categorySelect = document.getElementById("aidrStyleCategory");
    if (categorySelect) {
      categorySelect.addEventListener("change", () => {
        aidrTextStyleCurrentCategory = categorySelect.value;
        const nextGroup = aidrTextStyleCatalog.find(g => g.category === aidrTextStyleCurrentCategory);
        const nextRef = nextGroup?.style_refs?.[0];
        if (nextRef) {
          aidrSetSelectedStyleRef(nextRef);
          aidrRerenderOriginalStyleEditor();
        }
      });
    }

    panel.querySelectorAll(".aidr-style-ref-chip").forEach(btn => {
      btn.addEventListener("click", () => {
        const ref = btn.dataset.styleRef;
        if (!ref) return;
        aidrSetSelectedStyleRef(ref);
        aidrTextStyleCurrentCategory = aidrCategoryForStyleRef(ref);
        aidrRerenderOriginalStyleEditor();
      });
    });
  }

  function aidrEnhanceStyleEditor() {
    aidrEnsureFontSizeStepper();
    aidrRenderTextStyleCatalogControls();
  }

  let aidrOriginalRenderThemeStyles = null;

  function aidrRerenderOriginalStyleEditor() {
    if (typeof aidrOriginalRenderThemeStyles === "function") {
      aidrOriginalRenderThemeStyles();
      window.setTimeout(aidrEnhanceStyleEditor, 0);
      return;
    }

    if (typeof window.renderThemeStyles === "function") {
      window.renderThemeStyles();
      window.setTimeout(aidrEnhanceStyleEditor, 0);
    }
  }

  async function aidrInstallStyleRenderWrapper() {
    await aidrLoadTextStyleCatalog();

    let original = null;

    try {
      if (typeof renderThemeStyles === "function") {
        original = renderThemeStyles;
      }
    } catch (e) {}

    if (!original && typeof window.renderThemeStyles === "function") {
      original = window.renderThemeStyles;
    }

    if (!original) {
      console.warn("renderThemeStyles not found. Role Style Catalog UI was not installed.");
      return;
    }

    aidrOriginalRenderThemeStyles = original;

    const patched = function patchedRenderThemeStylesAidr(...args) {
      const result = aidrOriginalRenderThemeStyles.apply(this, args);

      const currentRef = aidrGetSelectedStyleRef();
      if (currentRef) {
        aidrTextStyleCurrentCategory = aidrCategoryForStyleRef(currentRef);
      }

      window.setTimeout(aidrEnhanceStyleEditor, 0);
      return result;
    };

    window.renderThemeStyles = patched;

    try {
      renderThemeStyles = patched;
    } catch (e) {}

    window.setTimeout(aidrEnhanceStyleEditor, 0);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", aidrInstallStyleRenderWrapper);
  } else {
    aidrInstallStyleRenderWrapper();
  }
})();

/* Theme save and load controls
 * Minimal Theme Assetization UI.
 *
 * Scope:
 * - Save current sector_defaults.theme as json/themes/*.json
 * - List saved themes
 * - Load theme into sector_defaults.json
 * - Reload page after load to keep all cached style data consistent
 */
(function () {
  if (window.__AIDR_THEME_SAVE_LOAD_CONTROLS_INSTALLED__) return;
  window.__AIDR_THEME_SAVE_LOAD_CONTROLS_INSTALLED__ = true;

  let aidrThemeGalleryItems = [];
  let aidrCurrentThemeState = null;
  let aidrThemeMaxSlots = 6;

  function escapeHtmlLocal(value) {
    const s = String(value ?? "");
    return s
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function themePanelAnchor() {
    return document.getElementById("aidrRoleStyleCatalog");
  }

  async function loadThemeList() {
    try {
      const res = await fetch("/api/themes");
      const data = await res.json();
      if (!res.ok || data.error) {
        console.warn("Theme list failed:", data);
        return [];
      }
      aidrThemeGalleryItems = data.themes || [];
      aidrCurrentThemeState = data.current_theme || null;
      aidrThemeMaxSlots = Number(data.max_themes || aidrThemeMaxSlots || 6) || 6;
      return aidrThemeGalleryItems;
    } catch (err) {
      console.warn("Theme list error:", err);
      return [];
    }
  }



  function readFavoriteThemeIds() {
    try {
      const parsed = JSON.parse(localStorage.getItem("adr_favorite_themes") || "[]");
      return Array.isArray(parsed) ? parsed.map(String) : [];
    } catch (e) {
      return [];
    }
  }

  function writeFavoriteThemeIds(ids) {
    const unique = Array.from(new Set((ids || []).map(String).filter(Boolean)));
    localStorage.setItem("adr_favorite_themes", JSON.stringify(unique));
  }

  function isFavoriteTheme(themeId) {
    if (!themeId) return false;
    return readFavoriteThemeIds().includes(String(themeId));
  }

  function toggleFavoriteTheme(themeId) {
    if (!themeId) return;

    const id = String(themeId);
    const favorites = readFavoriteThemeIds();
    const next = favorites.includes(id)
      ? favorites.filter(item => item !== id)
      : [id, ...favorites];

    writeFavoriteThemeIds(next);
    renderThemeControls();
  }

  function sortedThemesForGallery() {
    const currentId = aidrCurrentThemeState?.theme_id || "";

    return [...aidrThemeGalleryItems].sort((a, b) => {
      const aid = a.theme_id || "";
      const bid = b.theme_id || "";

      const af = isFavoriteTheme(aid) ? 1 : 0;
      const bf = isFavoriteTheme(bid) ? 1 : 0;
      if (af !== bf) return bf - af;

      const ac = aid === currentId ? 1 : 0;
      const bc = bid === currentId ? 1 : 0;
      if (ac !== bc) return bc - ac;

      const an = String(a.theme_name || aid);
      const bn = String(b.theme_name || bid);
      return an.localeCompare(bn);
    });
  }


  function aidrNormalizeThemePreviewHex(color) {
    const hex = String(color || "").replace("#", "").trim().toUpperCase();
    return /^[0-9A-F]{6}$/.test(hex) ? hex : "";
  }

  function aidrThemePreviewSwatchesHtml(theme) {
    const fallback = {
      Main: "0B3B8C",
      Sub: "64748B",
      Accent: "F59E0B"
    };

    const preview = theme?.preview_tokens || {};
    const tokens = ["Main", "Sub", "Accent"];

    return tokens.map(token => {
      const hex = aidrNormalizeThemePreviewHex(preview[token]) || fallback[token];
      return `
        <span
          class="aidr-theme-preview-swatch"
          title="${escapeHtmlLocal(token)} #${escapeHtmlLocal(hex)}"
          style="background:#${escapeHtmlLocal(hex)}"
        ></span>
      `;
    }).join("");
  }



  function aidrThemePreviewStyleAttr(theme, part) {
    const style = theme?.preview_styles?.[part] || {};
    const css = [];

    if (style.font_family) {
      css.push(`font-family:${String(style.font_family).replaceAll('"', '\\"')}`);
    }

    if (style.color) {
      const color = String(style.color || "").replace("#", "").trim();
      if (/^[0-9A-Fa-f]{6}$/.test(color)) {
        css.push(`color:#${color.toUpperCase()}`);
      }
    }

    if (style.bold) {
      css.push("font-weight:700");
    } else if (style.bold === false) {
      css.push("font-weight:400");
    }

    if (style.italic) {
      css.push("font-style:italic");
    }

    const align = String(style.align || "").toLowerCase();
    if (["left", "center", "right"].includes(align)) {
      css.push(`text-align:${align}`);
      css.push(`--aidr-theme-preview-align:${align}`);
    }

    return css.length ? ` style="${escapeAttr(css.join(";"))}"` : "";
  }


  function aidrThemeLimitReached() {
    return (aidrThemeGalleryItems || []).length >= aidrThemeMaxSlots;
  }

  function aidrThemeSlotCount() {
    return Math.max(0, Math.min(aidrThemeMaxSlots, (aidrThemeGalleryItems || []).length));
  }

  function aidrThemeCreateCardHtml() {
    return `
      <button
        type="button"
        class="aidr-theme-card aidr-theme-create-card"
      >
        <div class="aidr-theme-create-plus">＋</div>
        <div class="aidr-theme-create-title">${escapeHtml(uiText("theme.nameCreateTitle"))}</div>
        <div class="aidr-theme-create-note">${escapeHtml(uiText("theme.createFromCurrent"))}</div>
      </button>
    `;
  }

  function aidrThemeBlankSlotHtml(index) {
    return `
      <div class="aidr-theme-card aidr-theme-blank-slot" aria-hidden="true">
        <div class="aidr-theme-blank-dash">—</div>
      </div>
    `;
  }

  function themeCardsHtml() {
    const currentId = aidrCurrentThemeState?.theme_id || "";
    const sorted = sortedThemesForGallery().slice(0, aidrThemeMaxSlots);
    const limitReached = sorted.length >= aidrThemeMaxSlots;

    const cards = sorted.map(theme => {
      const id = theme.theme_id || "";
      const name = theme.theme_name || id;
      const count = theme.style_count != null ? formatUiText("theme.styleCount", { count: theme.style_count }) : uiText("theme.styleCountFallback");
      const updated = theme.updated_at || theme.saved_at || "";
      const isCurrent = id && id === currentId;
      const isFavorite = isFavoriteTheme(id);

      return `
        <div class="aidr-theme-card ${isCurrent ? "is-current" : ""}" data-theme-id="${escapeHtmlLocal(id)}" data-theme-name="${escapeHtmlLocal(name)}">
          <div class="aidr-theme-card-head">
            <div>
              <div class="aidr-theme-card-kicker">${escapeHtmlLocal(isCurrent ? uiText("theme.currentApplied") : uiText("theme.cardKicker"))}</div>
              <div class="aidr-theme-title-row">
                <div class="aidr-theme-card-title">${escapeHtmlLocal(name)}</div>
                <div class="aidr-theme-card-actions">
                  <button
                    type="button"
                    class="aidr-theme-favorite-btn ${isFavorite ? "is-favorite" : ""}"
                    data-theme-id="${escapeHtmlLocal(id)}"
                    title="${isFavorite ? "Remove from favorites" : "Add to favorites"}"
                    aria-label="${isFavorite ? "Remove from favorites" : "Add to favorites"}"
                  >${isFavorite ? "★" : "☆"}</button>

                  <div class="aidr-theme-menu-wrap">
                    <button
                      type="button"
                      class="aidr-theme-menu-btn"
                      data-theme-id="${escapeHtmlLocal(id)}"
                      data-theme-name="${escapeHtmlLocal(name)}"
                      title="Theme actions"
                      aria-label="Theme actions"
                    >⋯</button>
                    <div class="aidr-theme-menu" hidden>
                      <button
                        type="button"
                        class="aidr-theme-menu-item"
                        data-action="duplicate"
                        data-theme-id="${escapeHtmlLocal(id)}"
                        data-theme-name="${escapeHtmlLocal(name)}"
                        ${limitReached ? "disabled" : ""}
                        title="${limitReached ? uiText("theme.limitReachedTitle") : uiText("theme.duplicateTitle")}"
                      >Duplicate</button>
                      <button
                        type="button"
                        class="aidr-theme-menu-item"
                        data-action="rename"
                        data-theme-id="${escapeHtmlLocal(id)}"
                        data-theme-name="${escapeHtmlLocal(name)}"
                      >Rename</button>
                      <button
                        type="button"
                        class="aidr-theme-menu-item danger"
                        data-action="delete"
                        data-theme-id="${escapeHtmlLocal(id)}"
                        data-theme-name="${escapeHtmlLocal(name)}"
                        data-is-current="${isCurrent ? "true" : "false"}"
                      >Delete</button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div class="aidr-theme-card-status"></div>
          </div>

          <div class="aidr-theme-preview">
            <div class="aidr-theme-typography-stack">
              <div class="aidr-theme-type-row">
                <span class="aidr-theme-type-label">h1</span>
                <span class="aidr-theme-type-sample aidr-theme-type-h1"${aidrThemePreviewStyleAttr(theme, "h1")}>${escapeHtmlLocal(uiText("theme.sampleH1"))}</span>
              </div>
              <div class="aidr-theme-type-row">
                <span class="aidr-theme-type-label">h2</span>
                <span class="aidr-theme-type-sample aidr-theme-type-h2"${aidrThemePreviewStyleAttr(theme, "h2")}>${escapeHtmlLocal(uiText("theme.sampleH2"))}</span>
              </div>
              <div class="aidr-theme-type-row">
                <span class="aidr-theme-type-label">p</span>
                <span class="aidr-theme-type-sample aidr-theme-type-p"${aidrThemePreviewStyleAttr(theme, "p")}>${escapeHtmlLocal(uiText("theme.sampleBody"))}</span>
              </div>
            </div>
            <div class="aidr-theme-design-label">
              <span>${escapeHtmlLocal(uiText("theme.designSystem"))}</span>
              <small>Main / Sub / Accent</small>
            </div>
            <div class="aidr-theme-swatches" aria-label="${escapeAttr(uiText("theme.designSystemPreviewAria"))}">
              ${aidrThemePreviewSwatchesHtml(theme)}
            </div>
          </div>

          <div class="aidr-theme-card-meta">
            <span>${escapeHtmlLocal(count)}</span>
            <span>${updated ? escapeHtmlLocal(updated) : ""}</span>
          </div>

          <button
            type="button"
            class="aidr-theme-apply-btn"
            data-theme-id="${escapeHtmlLocal(id)}"
            data-theme-name="${escapeHtmlLocal(name)}"
            ${isCurrent ? "disabled" : ""}
          >
            ${escapeHtmlLocal(isCurrent ? uiText("theme.applied") : uiText("theme.apply"))}
          </button>
        </div>
      `;
    });

    if (!limitReached) {
      cards.push(aidrThemeCreateCardHtml());
      const blanks = Math.max(0, aidrThemeMaxSlots - sorted.length - 1);
      for (let i = 0; i < blanks; i += 1) {
        cards.push(aidrThemeBlankSlotHtml(i));
      }
    }

    if (limitReached) {
      cards.push(`
        <div class="aidr-theme-limit-note">
          ${escapeHtmlLocal(formatUiText("theme.limitCreateNote", { count: sorted.length, max: aidrThemeMaxSlots }))}
        </div>
      `);
    }

    return cards.join("");
  }


  function themeOptionsHtml(selectedId) {
    if (!aidrThemeGalleryItems.length) {
      return `<option value="">${escapeHtmlLocal(uiText("theme.noSavedThemes"))}</option>`;
    }

    return sortedThemesForGallery().map(theme => {
      const id = theme.theme_id || "";
      const name = theme.theme_name || id;
      const count = theme.style_count != null ? ` / ${theme.style_count} styles` : "";
      const selected = id === selectedId ? "selected" : "";
      return `<option value="${escapeHtmlLocal(id)}" ${selected}>${escapeHtmlLocal(name + count)}</option>`;
    }).join("");
  }



  // Design system theme tokens and sampled colors
  const AIDR_THEME_TOKEN_ORDER = [
    "Main",
    "Sub",
    "Accent",
    "Background.Light",
    "Background.Dark",
    "Surface.Light",
    "Surface.Dark",
    "Text.OnLight",
    "Text.OnDark",
    "MutedText.OnLight",
    "MutedText.OnDark",
    "Border.OnLight",
    "Border.OnDark",
    "Highlight",
    "Warning",
    "Success",
    "Danger"
  ];

  let aidrThemePaletteState = {
    slideId: "",
    source: "",
    colors: [],
    updatedAt: "",
    selectedColor: ""
  };


  const AIDR_DEFAULT_THEME_TOKENS = {
    "Main": "0B3B8C",
    "Sub": "64748B",
    "Accent": "F59E0B",
    "Background.Light": "F8FAFC",
    "Background.Dark": "111827",
    "Surface.Light": "FFFFFF",
    "Surface.Dark": "1F2937",
    "Text.OnLight": "111827",
    "Text.OnDark": "F9FAFB",
    "MutedText.OnLight": "6B7280",
    "MutedText.OnDark": "CBD5E1",
    "Border.OnLight": "D1D5DB",
    "Border.OnDark": "334155",
    "Highlight": "FACC15",
    "Warning": "F97316",
    "Success": "22C55E",
    "Danger": "EF4444"
  };

  function aidrDefaultThemeTokens() {
    return { ...AIDR_DEFAULT_THEME_TOKENS };
  }

  let aidrThemeTokenState = {
    selectedToken: "Main",
    tokens: aidrDefaultThemeTokens(),
    dirty: false,
    loaded: false,
    source: "",
    updatedAt: "",
    editingToken: "",
    editingValue: "",
    editingError: ""
  };


  // Theme tokens are editable details, collapsed by default.
  let aidrThemeTokenPanelCollapsed = true;

  function aidrNormalizeHexColor(color) {
    const hex = String(color || "").trim().replace(/^#/, "").toUpperCase();

    if (/^[0-9A-F]{3}$/.test(hex)) {
      return hex.split("").map(ch => ch + ch).join("");
    }

    return /^[0-9A-F]{6}$/.test(hex) ? hex : "";
  }

  function aidrColorChipHtml(hex, className = "", attrs = "") {
    const safeHex = aidrNormalizeHexColor(hex);
    if (!safeHex) return "";
    return `
      <span
        class="aidr-color-token-swatch ${className}"
        title="#${escapeHtmlLocal(safeHex)}"
        style="background:#${escapeHtmlLocal(safeHex)}"
        ${attrs}
      ></span>
    `;
  }


  function aidrTextPaletteColorsFromThemeTokens() {
    const tokens = aidrThemeTokenState?.tokens || {};
    const preferred = [
      "Text.OnLight",
      "Text.OnDark",
      "MutedText.OnLight",
      "MutedText.OnDark",
      "Main",
      "Sub",
      "Accent",
      "Highlight",
      "Warning",
      "Success",
      "Danger",
      "Border.OnLight",
      "Border.OnDark",
      "Background.Dark",
      "Background.Light"
    ];

    const colors = [];
    preferred.forEach(token => {
      const color = aidrNormalizeHexColor(tokens[token]);
      if (color && !colors.includes(color)) {
        colors.push(color);
      }
    });

    return colors;
  }

  function aidrSyncTextColorPaletteFromThemeTokens() {
    const themeColors = aidrTextPaletteColorsFromThemeTokens();
    if (!themeColors.length) return;

    // Text Settings color palette uses Theme Tokens only.
    // Text Settings color palette is now Design System / Theme-only.
    // Legacy presets are intentionally hidden to keep color selection tied to Theme Tokens.
    window.styleColorPalettes = {
      Theme: themeColors
    };
  }


  function aidrThemeTokenHexEditorHtml(token, hex) {
    const editingToken = aidrThemeTokenState.editingToken || "";
    const isEditing = token === editingToken;
    const editingValue = aidrThemeTokenState.editingValue || `#${hex}`;
    const editingError = isEditing ? aidrThemeTokenState.editingError || "" : "";

    if (isEditing) {
      return `
        <span class="aidr-theme-token-hex-cell">
          <input
            type="text"
            class="aidr-theme-token-hex-input ${editingError ? "is-invalid" : ""}"
            data-aidr-token-hex-input="${escapeHtmlLocal(token)}"
            value="${escapeHtmlLocal(editingValue)}"
            aria-label="Edit ${escapeHtmlLocal(token)} color"
            aria-invalid="${editingError ? "true" : "false"}"
            spellcheck="false"
          >
          ${editingError ? `<span class="aidr-theme-token-hex-error">${escapeHtmlLocal(editingError)}</span>` : ""}
        </span>
      `;
    }

    return `
      <span class="aidr-theme-token-hex-cell">
        <span
          class="aidr-theme-token-hex"
          data-aidr-token-hex-edit="${escapeHtmlLocal(token)}"
          title="Edit token color"
        >#${escapeHtmlLocal(hex)}</span>
      </span>
    `;
  }

  function aidrBeginThemeTokenHexEdit(token) {
    if (!AIDR_THEME_TOKEN_ORDER.includes(token)) return;

    const tokens = aidrThemeTokenState.tokens || {};
    const hex = aidrNormalizeHexColor(tokens[token]) || aidrNormalizeHexColor(AIDR_DEFAULT_THEME_TOKENS[token]) || "CCCCCC";

    aidrThemeTokenState.selectedToken = token;
    aidrThemeTokenState.editingToken = token;
    aidrThemeTokenState.editingValue = `#${hex}`;
    aidrThemeTokenState.editingError = "";

    aidrRenderThemePalettePanel();
    aidrFocusThemeTokenHexInput();
  }

  function aidrFocusThemeTokenHexInput() {
    requestAnimationFrame(() => {
      const input = document.querySelector(".aidr-theme-token-hex-input");
      if (!input) return;
      input.focus();
      input.select();
    });
  }

  function aidrCancelThemeTokenHexEdit() {
    aidrThemeTokenState.editingToken = "";
    aidrThemeTokenState.editingValue = "";
    aidrThemeTokenState.editingError = "";
    aidrRenderThemePalettePanel();
  }

  function aidrCommitThemeTokenHexEdit(token, value) {
    if (!AIDR_THEME_TOKEN_ORDER.includes(token)) return false;
    if (aidrThemeTokenState.editingToken !== token) return false;

    const color = aidrNormalizeHexColor(value);

    if (!color) {
      aidrThemeTokenState.editingValue = String(value || "").trim();
      aidrThemeTokenState.editingError = "HEX";
      aidrRenderThemePalettePanel();
      aidrFocusThemeTokenHexInput();
      log(`WARN invalid theme token color: ${token} = ${String(value || "").trim()}`);
      return false;
    }

    aidrThemeTokenState.tokens = {
      ...(aidrThemeTokenState.tokens || {}),
      [token]: color
    };
    aidrThemeTokenState.selectedToken = token;
    aidrThemeTokenState.dirty = true;
    aidrThemeTokenState.editingToken = "";
    aidrThemeTokenState.editingValue = "";
    aidrThemeTokenState.editingError = "";

    aidrSyncTextColorPaletteFromThemeTokens();

    log(`theme token edited: ${token} = #${color}`);

    aidrRenderThemePalettePanel();
    return true;
  }

  function aidrThemeTokensHtml() {
    const selectedToken = aidrThemeTokenState.selectedToken || "Main";
    const tokens = aidrThemeTokenState.tokens || {};

    return `
      <div class="aidr-theme-token-section">
        <div class="aidr-theme-section-head">
          <div>
            <div class="aidr-theme-section-title">${escapeHtmlLocal(uiText("theme.tokensTitle"))}</div>
            <div class="aidr-theme-section-note">${escapeHtmlLocal(uiText("theme.tokensNote"))}</div>
          </div>
        </div>

        <div class="aidr-theme-token-grid">
          ${AIDR_THEME_TOKEN_ORDER.map(token => {
            const hex = aidrNormalizeHexColor(tokens[token]) || "CCCCCC";
            const isSelected = token === selectedToken;
            return `
              <div
                role="button"
                tabindex="0"
                class="aidr-theme-token-row ${isSelected ? "is-selected" : ""}"
                data-aidr-token="${escapeHtmlLocal(token)}"
              >
                ${aidrColorChipHtml(hex)}
                <span class="aidr-theme-token-name">${escapeHtmlLocal(token)}</span>
                ${aidrThemeTokenHexEditorHtml(token, hex)}
              </div>
            `;
          }).join("")}
        </div>
      </div>
    `;
  }

  function aidrSampledColorsHtml() {
    const colors = Array.isArray(aidrThemePaletteState.colors)
      ? aidrThemePaletteState.colors
      : [];

    const validColors = colors
      .map(aidrNormalizeHexColor)
      .filter(Boolean)
      .slice(0, 32);

    const selectedColor = aidrNormalizeHexColor(aidrThemePaletteState.selectedColor);
    const selectedToken = aidrThemeTokenState.selectedToken || "Main";

    const swatches = validColors.length
      ? validColors.map(hex => {
          const isSelected = selectedColor && hex === selectedColor;
          return aidrColorChipHtml(
            hex,
            `theme-color-swatch ${isSelected ? "is-selected" : ""}`,
            `data-aidr-sampled-color="${escapeHtmlLocal(hex)}"`
          );
        }).join("")
      : `<span class="aidr-theme-palette-empty">${escapeHtmlLocal(uiText("theme.sampledColorsEmpty"))}</span>`;

    const meta = aidrThemePaletteState.updatedAt
      ? `${uiText("theme.updatedAt")}: ${escapeHtmlLocal(aidrThemePaletteState.updatedAt)}`
      : uiText("theme.notExtracted");

    const source = aidrThemePaletteState.source
      ? `${uiText("theme.source")}: ${escapeHtmlLocal(aidrThemePaletteState.source)}`
      : uiText("theme.sourceCurrentSlide");

    const selectedLabel = selectedColor
      ? `${uiText("theme.selected")}: #${escapeHtmlLocal(selectedColor)}`
      : `${uiText("theme.selected")}: -`;

    return `
      <div class="aidr-sampled-color-section">
        <div class="aidr-theme-section-head">
          <div>
            <div class="aidr-theme-section-title">${escapeHtmlLocal(uiText("theme.sampledColors"))}</div>
            <div class="aidr-theme-section-note">${escapeHtmlLocal(uiText("theme.sampledColorsNote"))}</div>
          </div>
          <button type="button" class="aidr-theme-btn" id="aidrRefreshThemePaletteBtn">
            ${escapeHtmlLocal(uiText("theme.refreshSlideColors"))}
          </button>
        </div>

        <div class="aidr-theme-palette-swatches" id="aidrThemePaletteSwatches">
          ${swatches}
        </div>

        <div class="aidr-selected-color-row">
          <span>${selectedLabel}</span>
          <button type="button" class="aidr-copy-color-btn" id="aidrCopySelectedColorBtn" ${selectedColor ? "" : "disabled"}>
            ${escapeHtmlLocal(uiText("theme.copy"))}
          </button>
          <span class="aidr-selected-token-hint">${escapeHtmlLocal(uiText("theme.assignTo"))}: ${escapeHtmlLocal(selectedToken)}</span>
        </div>

        <div class="aidr-theme-palette-meta">
          ${source}<br>
          ${meta}
        </div>
      </div>
    `;
  }

  function aidrThemePaletteHtml() {
    const collapsed = !!aidrThemeTokenPanelCollapsed;

    return `
      <div
        class="aidr-theme-palette-panel aidr-design-system-panel ${collapsed ? "is-collapsed" : "is-expanded"}"
        id="aidrThemePalettePanel"
      >
        <div class="aidr-theme-palette-head">
          <div>
            <div class="aidr-theme-palette-title">${escapeHtmlLocal(uiText("theme.designSystem"))}</div>
            <div class="aidr-theme-palette-note">${escapeHtmlLocal(uiText("theme.designSystemNote"))}</div>
          </div>
          <div class="aidr-theme-palette-actions">
            <button type="button" class="aidr-theme-btn" id="aidrToggleDesignSystemPanelBtn">
              ${collapsed ? escapeHtmlLocal(uiText("theme.expand")) : escapeHtmlLocal(uiText("theme.collapse"))}
            </button>
            ${collapsed ? "" : `
              <button type="button" class="aidr-theme-btn" id="aidrReloadThemeTokensBtn">${escapeHtmlLocal(uiText("theme.reload"))}</button>
              <button type="button" class="aidr-theme-btn" id="aidrSaveThemeTokensBtn">${escapeHtmlLocal(uiText("theme.save"))}</button>
            `}
          </div>
        </div>

        ${collapsed
          ? `<div class="aidr-design-system-collapsed">
              <span>${escapeHtmlLocal(uiText("theme.designSystemCollapsed"))}</span>
              <small>${escapeHtmlLocal(uiText("theme.designSystemCollapsedNote"))}</small>
            </div>`
          : `<div class="aidr-design-system-workarea">
              ${aidrThemeTokensHtml()}
              ${aidrSampledColorsHtml()}
            </div>`}
      </div>
    `;
  }


  function aidrRenderThemePalettePanel() {
    const panel = document.getElementById("aidrThemePalettePanel");
    if (panel) {
      panel.outerHTML = aidrThemePaletteHtml();
      aidrBindThemePalettePanel();
    }

    if (typeof renderRecolorThemeColors === "function") {
      renderRecolorThemeColors();
    }
  }


  async function aidrLoadThemeTokensFromCurrentTheme(options = {}) {
    const force = !!options.force;
    const silent = !!options.silent;

    if (!force && aidrThemeTokenState.loaded) return;
    if (!force && aidrThemeTokenState.dirty) return;

    try {
      const data = await fetchJson("/api/theme/tokens");
      const incoming = data.tokens || {};
      const merged = aidrDefaultThemeTokens();

      Object.keys(incoming).forEach(token => {
        const color = aidrNormalizeHexColor(incoming[token]);
        if (color && Object.prototype.hasOwnProperty.call(merged, token)) {
          merged[token] = color;
        }
      });

      aidrThemeTokenState.tokens = merged;
      aidrThemeTokenState.loaded = true;
      aidrThemeTokenState.dirty = false;
      aidrThemeTokenState.source = data.source || "";
      aidrThemeTokenState.updatedAt = data.tokens_meta?.updated_at || "";
      aidrSyncTextColorPaletteFromThemeTokens();

      if (!silent) {
        log(`theme tokens loaded: ${Object.keys(merged).length} tokens`);
      }
    } catch (err) {
      log(`WARN theme tokens load: ${err.message}`);
    }
  }

  async function aidrSaveThemeTokensToCurrentTheme() {
    const tokens = aidrThemeTokenState.tokens || {};
    const sampledColors = Array.isArray(aidrThemePaletteState.colors)
      ? aidrThemePaletteState.colors
      : [];

    try {
      const res = await fetch("/api/theme/tokens", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          tokens,
          sampled_slide_id: aidrThemePaletteState.slideId || "",
          sampled_source: aidrThemePaletteState.source || "",
          sampled_colors: sampledColors
        })
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok || data.error) {
        throw new Error(data.error || `HTTP ${res.status}`);
      }

      const merged = aidrDefaultThemeTokens();
      Object.keys(data.tokens || {}).forEach(token => {
        const color = aidrNormalizeHexColor(data.tokens[token]);
        if (color && Object.prototype.hasOwnProperty.call(merged, token)) {
          merged[token] = color;
        }
      });

      aidrThemeTokenState.tokens = merged;
      aidrThemeTokenState.loaded = true;
      aidrThemeTokenState.dirty = false;
      aidrThemeTokenState.source = data.source || "json/sector_defaults.json";
      aidrThemeTokenState.updatedAt = data.tokens_meta?.updated_at || "";
      aidrSyncTextColorPaletteFromThemeTokens();

      log(`theme tokens saved: ${Object.keys(merged).length} tokens${data.theme_file_updated ? " / theme file synced" : ""}`);

      if (typeof window.renderThemeControls === "function") {
        await window.renderThemeControls();
      } else {
        aidrRenderThemePalettePanel();
      }
    } catch (err) {
      log(`WARN theme tokens save: ${err.message}`);
    }
  }


  async function aidrRefreshThemePalette() {
    const slideId = getCurrentPaletteSlideId();

    if (!slideId) {
      log("WARN theme sampled colors: slide_id not found");
      return;
    }

    try {
      const data = await fetchJson(`/api/slides/${encodeURIComponent(slideId)}/palette`);
      const colors = Array.isArray(data.palette) ? data.palette : [];

      aidrThemePaletteState = {
        slideId,
        source: data.source || "",
        colors,
        updatedAt: new Date().toISOString(),
        selectedColor: aidrThemePaletteState.selectedColor || ""
      };

      currentSystemPaletteSlideId = slideId;
      currentSystemPaletteColors = colors;

      log(`sampled colors refreshed: ${slideId} / ${colors.length} colors`);

      aidrRenderThemePalettePanel();
    } catch (err) {
      log(`WARN theme sampled colors: ${err.message}`);
    }
  }

  function aidrAssignSampledColorToSelectedToken(hex) {
    const color = aidrNormalizeHexColor(hex);
    if (!color) return;

    const token = aidrThemeTokenState.selectedToken || "Main";
    aidrThemePaletteState.selectedColor = color;
    aidrThemeTokenState.tokens[token] = color;
    aidrThemeTokenState.dirty = true;
    aidrSyncTextColorPaletteFromThemeTokens();

    log(`theme token assigned: ${token} = #${color}`);

    aidrRenderThemePalettePanel();
  }


  let aidrPendingColorAction = {
    color: "",
    token: ""
  };

  function aidrHexToRgb(hex) {
    const c = aidrNormalizeHexColor(hex);
    if (!c) return null;
    return {
      r: parseInt(c.slice(0, 2), 16),
      g: parseInt(c.slice(2, 4), 16),
      b: parseInt(c.slice(4, 6), 16)
    };
  }

  function aidrRgbToHex(r, g, b) {
    const clamp = (v) => Math.max(0, Math.min(255, Math.round(Number(v) || 0)));
    return [clamp(r), clamp(g), clamp(b)]
      .map(v => v.toString(16).padStart(2, "0").toUpperCase())
      .join("");
  }

  function aidrRgbToHsl(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h = 0;
    let s = 0;
    const l = (max + min) / 2;

    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r: h = (g - b) / d + (g < b ? 6 : 0); break;
        case g: h = (b - r) / d + 2; break;
        case b: h = (r - g) / d + 4; break;
      }
      h /= 6;
    }

    return { h, s, l };
  }

  function aidrHslToRgb(h, s, l) {
    h = ((Number(h) || 0) % 1 + 1) % 1;
    s = Math.max(0, Math.min(1, Number(s) || 0));
    l = Math.max(0, Math.min(1, Number(l) || 0));

    if (s === 0) {
      const v = Math.round(l * 255);
      return { r: v, g: v, b: v };
    }

    const hue2rgb = (p, q, t) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };

    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;

    return {
      r: hue2rgb(p, q, h + 1 / 3) * 255,
      g: hue2rgb(p, q, h) * 255,
      b: hue2rgb(p, q, h - 1 / 3) * 255
    };
  }

  function aidrHslHex(h, s, l) {
    const rgb = aidrHslToRgb(h, s, l);
    return aidrRgbToHex(rgb.r, rgb.g, rgb.b);
  }


  function aidrColorFamilyFromHex(hex) {
    const color = aidrNormalizeHexColor(hex);
    const rgb = aidrHexToRgb(color);
    if (!color || !rgb) return null;

    const hsl = aidrRgbToHsl(rgb.r, rgb.g, rgb.b);
    return {
      color,
      h: hsl.h,
      s: Math.max(0.28, Math.min(0.86, hsl.s || 0.5)),
      l: Math.max(0.18, Math.min(0.78, hsl.l || 0.45))
    };
  }

  function aidrSuggestTokensFromAnchor(token, hex) {
    const family = aidrColorFamilyFromHex(hex);
    if (!family) return;

    const { color, h, s, l } = family;
    const current = { ...(aidrThemeTokenState.tokens || {}) };

    // Always assign the selected token first.
    current[token] = color;

    // Token-aware reconstruction:
    // Preserve the existing design system as much as possible,
    // and only regenerate the token family related to the selected anchor.
    if (token === "Main") {
      current["Main"] = color;
      current["Sub"] = aidrHslHex(h, Math.max(0.18, s * 0.48), l > 0.48 ? 0.38 : 0.62);
      current["Accent"] = aidrHslHex(h + 0.10, Math.min(0.9, s * 1.12), 0.56);
      current["Background.Light"] = aidrHslHex(h, 0.22, 0.96);
      current["Background.Dark"] = aidrHslHex(h, 0.28, 0.12);
      current["Surface.Dark"] = aidrHslHex(h, 0.24, 0.18);
      current["Border.OnLight"] = aidrHslHex(h, 0.18, 0.82);
      current["Border.OnDark"] = aidrHslHex(h, 0.22, 0.32);
      current["Highlight"] = aidrHslHex(h + 0.06, 0.88, 0.62);
    } else if (token === "Sub") {
      current["Sub"] = color;
      current["Border.OnLight"] = aidrHslHex(h, Math.max(0.12, s * 0.32), 0.82);
      current["Border.OnDark"] = aidrHslHex(h, Math.max(0.16, s * 0.42), 0.32);
      current["MutedText.OnLight"] = aidrHslHex(h, Math.max(0.10, s * 0.25), 0.42);
      current["MutedText.OnDark"] = aidrHslHex(h, Math.max(0.10, s * 0.28), 0.78);
    } else if (token === "Accent") {
      current["Accent"] = color;
      current["Highlight"] = aidrHslHex(h, Math.min(0.92, s * 1.05), Math.min(0.72, Math.max(0.58, l + 0.10)));
      // Do not overwrite Warning / Success / Danger from Accent.
      // Accent is a brand/emphasis color, not necessarily a semantic status color.
    } else if (token === "Background.Light") {
      current["Background.Light"] = color;
      current["Surface.Light"] = aidrHslHex(h, Math.max(0.08, s * 0.22), Math.min(0.99, Math.max(0.94, l + 0.03)));
      current["Border.OnLight"] = aidrHslHex(h, Math.max(0.10, s * 0.25), Math.max(0.72, Math.min(0.86, l - 0.12)));
      current["Text.OnLight"] = current["Text.OnLight"] || "111827";
    } else if (token === "Background.Dark") {
      current["Background.Dark"] = color;
      current["Surface.Dark"] = aidrHslHex(h, Math.max(0.16, s * 0.55), Math.min(0.26, Math.max(0.14, l + 0.06)));
      current["Border.OnDark"] = aidrHslHex(h, Math.max(0.14, s * 0.44), Math.min(0.38, Math.max(0.26, l + 0.16)));
      current["Text.OnDark"] = current["Text.OnDark"] || "F9FAFB";
    } else if (token === "Surface.Light") {
      current["Surface.Light"] = color;
      current["Border.OnLight"] = aidrHslHex(h, Math.max(0.10, s * 0.25), Math.max(0.72, Math.min(0.86, l - 0.10)));
    } else if (token === "Surface.Dark") {
      current["Surface.Dark"] = color;
      current["Border.OnDark"] = aidrHslHex(h, Math.max(0.14, s * 0.44), Math.min(0.40, Math.max(0.26, l + 0.12)));
    } else if (token === "Text.OnLight") {
      current["Text.OnLight"] = color;
      current["MutedText.OnLight"] = aidrHslHex(h, Math.max(0.08, s * 0.22), Math.min(0.54, Math.max(0.36, l + 0.18)));
    } else if (token === "Text.OnDark") {
      current["Text.OnDark"] = color;
      current["MutedText.OnDark"] = aidrHslHex(h, Math.max(0.08, s * 0.22), Math.max(0.62, Math.min(0.82, l - 0.12)));
    } else if (token === "MutedText.OnLight") {
      current["MutedText.OnLight"] = color;
    } else if (token === "MutedText.OnDark") {
      current["MutedText.OnDark"] = color;
    } else if (token === "Border.OnLight") {
      current["Border.OnLight"] = color;
    } else if (token === "Border.OnDark") {
      current["Border.OnDark"] = color;
    } else if (token === "Highlight") {
      current["Highlight"] = color;
    } else if (token === "Warning") {
      current["Warning"] = color;
      current["Highlight"] = current["Highlight"] || aidrHslHex(h, Math.min(0.9, s * 0.95), 0.68);
    } else if (token === "Success") {
      current["Success"] = color;
    } else if (token === "Danger") {
      current["Danger"] = color;
    }

    aidrThemeTokenState.tokens = current;
    aidrThemeTokenState.selectedToken = token;
    aidrThemeTokenState.dirty = true;
    aidrThemePaletteState.selectedColor = color;
    aidrSyncTextColorPaletteFromThemeTokens();

    log(`design system suggested from ${token} = #${color}`);

    aidrCloseColorActionModal();
    aidrRenderThemePalettePanel();
  }

  function aidrGenerateDesignSystemFromColor(hex) {
    const token = aidrPendingColorAction.token || aidrThemeTokenState.selectedToken || "Main";
    aidrSuggestTokensFromAnchor(token, hex);
  }

  function aidrOpenColorActionModal(hex) {
    const color = aidrNormalizeHexColor(hex);
    if (!color) return;

    const token = aidrThemeTokenState.selectedToken || "Main";

    aidrPendingColorAction = {
      color,
      token
    };

    let modal = document.getElementById("aidrColorActionModal");
    if (!modal) {
      modal = document.createElement("div");
      modal.id = "aidrColorActionModal";
      modal.className = "aidr-color-action-modal";
      document.body.appendChild(modal);
    }

    modal.innerHTML = `
      <div class="aidr-color-action-card">
        <div class="aidr-color-action-head">
          <div>
            <div class="aidr-color-action-title">Apply sampled color?</div>
            <div class="aidr-color-action-note">Choose whether to update only the selected token or rebuild related tokens from this token.</div>
          </div>
          <button type="button" class="aidr-color-action-close" data-aidr-color-action="cancel">×</button>
        </div>

        <div class="aidr-color-action-target">
          <span class="aidr-color-token-swatch" style="background:#${escapeHtmlLocal(color)}"></span>
          <div>
            <div class="aidr-color-action-token">Target Token: ${escapeHtmlLocal(token)}</div>
            <div class="aidr-color-action-hex">#${escapeHtmlLocal(color)}</div>
          </div>
        </div>

        <div class="aidr-color-action-buttons">
          <button type="button" class="btn primary compact-action" data-aidr-color-action="assign">
            Change Token Color
          </button>
          <button type="button" class="btn compact-action" data-aidr-color-action="suggest">
            Suggest Set from Target Token
          </button>
          <button type="button" class="btn compact-action" data-aidr-color-action="cancel">
            Cancel
          </button>
        </div>
      </div>
    `;

    modal.hidden = false;
  }

  function aidrCloseColorActionModal() {
    const modal = document.getElementById("aidrColorActionModal");
    if (modal) {
      modal.hidden = true;
    }
  }

  function aidrConfirmAssignPendingColor() {
    const color = aidrNormalizeHexColor(aidrPendingColorAction.color);
    if (!color) return;

    aidrCloseColorActionModal();
    aidrAssignSampledColorToSelectedToken(color);
  }


  function aidrCopySelectedColor() {
    const color = aidrNormalizeHexColor(aidrThemePaletteState.selectedColor);
    if (!color) return;

    const text = `#${color}`;

    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(text).then(() => {
        log(`color copied: ${text}`);
      }).catch(() => {
        log(`WARN color copy failed: ${text}`);
      });
      return;
    }

    try {
      const input = document.createElement("input");
      input.value = text;
      document.body.appendChild(input);
      input.select();
      document.execCommand("copy");
      input.remove();
      log(`color copied: ${text}`);
    } catch (e) {
      log(`WARN color copy failed: ${text}`);
    }
  }

  function aidrBindThemePalettePanel() {
    // Keep delegated focusout binding stable across regenerated panels.
    // Event handling is centralized in the delegated document click handler.
    // Keep this function as a no-op because render paths still call it.
  }

  if (!window.__aidrDesignSystemDelegatedFocusout) {
    window.__aidrDesignSystemDelegatedFocusout = true;
    document.addEventListener("focusout", (event) => {
      const input = event.target?.closest?.("[data-aidr-token-hex-input]");
      if (!input) return;

      aidrCommitThemeTokenHexEdit(input.dataset.aidrTokenHexInput || "", input.value);
    });
  }

  if (!window.__aidrDesignSystemDelegatedKeydown) {
    window.__aidrDesignSystemDelegatedKeydown = true;
    document.addEventListener("keydown", (event) => {
      const input = event.target?.closest?.("[data-aidr-token-hex-input]");
      if (input) {
        if (event.key === "Enter") {
          event.preventDefault();
          event.stopPropagation();
          aidrCommitThemeTokenHexEdit(input.dataset.aidrTokenHexInput || "", input.value);
        } else if (event.key === "Escape") {
          event.preventDefault();
          event.stopPropagation();
          aidrCancelThemeTokenHexEdit();
        }
        return;
      }

      const tokenBtn = event.target?.closest?.("[data-aidr-token]");
      if (tokenBtn && (event.key === "Enter" || event.key === " ")) {
        event.preventDefault();
        event.stopPropagation();
        const token = tokenBtn.dataset.aidrToken || "Main";
        aidrThemeTokenState.selectedToken = token;
        aidrThemeTokenState.editingToken = "";
        aidrThemeTokenState.editingValue = "";
        aidrThemeTokenState.editingError = "";
        log(`theme token selected: ${token}`);
        aidrRenderThemePalettePanel();
      }
    });
  }

  // Delegated click handlers for regenerated Design System panel
  if (!window.__aidrDesignSystemDelegatedClick) {
    window.__aidrDesignSystemDelegatedClick = true;
    document.addEventListener("click", (event) => {
      const toggleTokensBtn = event.target?.closest?.("#aidrToggleThemeTokensBtn");
      if (toggleTokensBtn) {
        event.preventDefault();
        event.stopPropagation();
        aidrThemeTokenPanelCollapsed = !aidrThemeTokenPanelCollapsed;
        aidrRenderThemePalettePanel();
        log(`theme tokens ${aidrThemeTokenPanelCollapsed ? "collapsed" : "expanded"}`);
        return;
      }

      const toggleDesignSystemBtn = event.target?.closest?.("#aidrToggleDesignSystemPanelBtn");
      if (toggleDesignSystemBtn) {
        event.preventDefault();
        event.stopPropagation();
        aidrThemeTokenPanelCollapsed = !aidrThemeTokenPanelCollapsed;
        aidrRenderThemePalettePanel();
        log(`design system panel ${aidrThemeTokenPanelCollapsed ? "collapsed" : "expanded"}`);
        return;
      }

      const refreshBtn = event.target?.closest?.("#aidrRefreshThemePaletteBtn");
      if (refreshBtn) {
        event.preventDefault();
        event.stopPropagation();
        aidrRefreshThemePalette();
        return;
      }

      const reloadTokensBtn = event.target?.closest?.("#aidrReloadThemeTokensBtn");
      if (reloadTokensBtn) {
        event.preventDefault();
        event.stopPropagation();
        aidrLoadThemeTokensFromCurrentTheme({ force: true }).then(() => {
          aidrRenderThemePalettePanel();
          log("theme tokens reloaded");
        });
        return;
      }

      const saveTokensBtn = event.target?.closest?.("#aidrSaveThemeTokensBtn");
      if (saveTokensBtn) {
        event.preventDefault();
        event.stopPropagation();
        aidrSaveThemeTokensToCurrentTheme();
        return;
      }

      const tokenHexEdit = event.target?.closest?.("[data-aidr-token-hex-edit]");
      if (tokenHexEdit) {
        event.preventDefault();
        event.stopPropagation();
        aidrBeginThemeTokenHexEdit(tokenHexEdit.dataset.aidrTokenHexEdit || "Main");
        return;
      }

      const tokenHexInput = event.target?.closest?.("[data-aidr-token-hex-input]");
      if (tokenHexInput) {
        event.stopPropagation();
        return;
      }

      const tokenBtn = event.target?.closest?.("[data-aidr-token]");
      if (tokenBtn) {
        event.preventDefault();
        event.stopPropagation();
        const token = tokenBtn.dataset.aidrToken || "Main";
        aidrThemeTokenState.selectedToken = token;
        aidrThemeTokenState.editingToken = "";
        aidrThemeTokenState.editingValue = "";
        aidrThemeTokenState.editingError = "";
        log(`theme token selected: ${token}`);
        aidrRenderThemePalettePanel();
        return;
      }

      const sampleChip = event.target?.closest?.("[data-aidr-sampled-color]");
      if (sampleChip) {
        event.preventDefault();
        event.stopPropagation();
        aidrOpenColorActionModal(sampleChip.dataset.aidrSampledColor || "");
        return;
      }

      const colorActionBtn = event.target?.closest?.("[data-aidr-color-action]");
      if (colorActionBtn) {
        event.preventDefault();
        event.stopPropagation();

        const action = colorActionBtn.dataset.aidrColorAction || "";
        if (action === "assign") {
          aidrConfirmAssignPendingColor();
        } else if (action === "suggest") {
          aidrGenerateDesignSystemFromColor(aidrPendingColorAction.color);
        } else {
          aidrCloseColorActionModal();
        }
        return;
      }

      const colorActionBackdrop = event.target?.closest?.("#aidrColorActionModal");
      if (colorActionBackdrop && event.target?.id === "aidrColorActionModal") {
        event.preventDefault();
        event.stopPropagation();
        aidrCloseColorActionModal();
        return;
      }

      const copyBtn = event.target?.closest?.("#aidrCopySelectedColorBtn");
      if (copyBtn) {
        event.preventDefault();
        event.stopPropagation();
        aidrCopySelectedColor();
      }
    });
  }

  // Close Text Settings color popover when leaving Text Settings tab
  if (!window.__aidrCloseStyleColorPopoverOnAssistTab) {
    window.__aidrCloseStyleColorPopoverOnAssistTab = true;
    document.addEventListener("click", (event) => {
      const tabBtn = event.target?.closest?.(".aidr-assist-tab-btn");
      if (!tabBtn) return;

      const tab = tabBtn.dataset?.tab || "";
      if (tab === "style") return;

      if (typeof window.closeStyleColorPopover === "function") {
        window.closeStyleColorPopover();
      }
    });
  }


  async function renderThemeControls() {
    const anchor = themePanelAnchor();
    const themePane = document.getElementById("aidrAssistThemePane");
    const parent = anchor?.parentElement || themePane;

    if (!parent) return;

    let panel = document.getElementById("aidrThemeLibraryPanel");

    if (!panel) {
      panel = document.createElement("div");
      panel.id = "aidrThemeLibraryPanel";
      panel.className = "aidr-theme-library-panel";

      if (anchor && anchor.parentElement === parent) {
        parent.insertBefore(panel, anchor);
      } else {
        parent.prepend(panel);
      }
    }

    const previousSelected = document.getElementById("aidrThemeSelect")?.value || "";
    await loadThemeList();
    await aidrLoadThemeTokensFromCurrentTheme({ silent: true });

    panel.innerHTML = `
      <div class="aidr-theme-library-head">
        <div>
          <div class="aidr-theme-library-title">${escapeHtmlLocal(uiText("theme.galleryTitle"))}</div>
          <div class="aidr-theme-library-note">${escapeHtmlLocal(uiText("theme.galleryNote"))}</div>
        </div>
      </div>

      <div class="aidr-current-theme-box">
        <div class="aidr-current-theme-label">${escapeHtmlLocal(uiText("theme.currentTheme"))}</div>
        <div class="aidr-current-theme-name">
          ${aidrCurrentThemeState?.theme_name ? escapeHtmlLocal(aidrCurrentThemeState.theme_name) : escapeHtmlLocal(uiText("theme.notLoaded"))}
        </div>
        <div class="aidr-current-theme-meta">
          ${aidrCurrentThemeState?.loaded_at ? escapeHtmlLocal(uiText("theme.loadedAt")) + ": " + escapeHtmlLocal(aidrCurrentThemeState.loaded_at) : escapeHtmlLocal(uiText("theme.currentSectorDefaults"))}
        </div>
      </div>

      ${aidrThemePaletteHtml()}

      <div class="aidr-theme-gallery">
        ${themeCardsHtml()}
      </div>

      <div class="tiny-note">
        ${escapeHtmlLocal(formatUiText("theme.slotHelp", { max: aidrThemeMaxSlots }))}
      </div>
    `;

    aidrCloseThemeMenus();

    panel.querySelectorAll(".aidr-theme-favorite-btn").forEach(btn => {
      btn.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        toggleFavoriteTheme(btn.dataset.themeId || "");
      });
    });

    panel.querySelectorAll(".aidr-theme-apply-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        const themeId = btn.dataset.themeId || "";
        const themeName = btn.dataset.themeName || themeId;
        applyThemeFromGallery(themeId, themeName);
      });
    });

    panel.querySelectorAll(".aidr-theme-create-card").forEach(btn => {
      btn.addEventListener("click", (event) => {
        event.preventDefault();
        aidrCreateThemeFromCurrent();
      });
    });

    panel.querySelectorAll(".aidr-theme-menu-btn").forEach(btn => {
      btn.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();

        const wrap = btn.closest(".aidr-theme-menu-wrap");
        const menu = wrap?.querySelector(".aidr-theme-menu");
        const wasOpen = !!wrap?.classList.contains("is-open");

        aidrCloseThemeMenus();

        if (wrap && menu && !wasOpen) {
          wrap.classList.add("is-open");
          menu.hidden = false;
        }
      });
    });

    panel.querySelectorAll(".aidr-theme-menu-item").forEach(btn => {
      btn.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();

        if (btn.disabled) return;

        const action = btn.dataset.action || "";
        const themeId = btn.dataset.themeId || "";
        const themeName = btn.dataset.themeName || themeId;
        const isCurrent = btn.dataset.isCurrent || "false";

        aidrCloseThemeMenus();

        if (action === "duplicate") {
          aidrDuplicateTheme(themeId, themeName);
        } else if (action === "rename") {
          aidrRenameTheme(themeId, themeName);
        } else if (action === "delete") {
          aidrDeleteTheme(themeId, themeName, isCurrent);
        }
      });
    });

    if (!panel.__aidrThemeMenuCloseBound) {
      panel.__aidrThemeMenuCloseBound = true;
      panel.addEventListener("click", (event) => {
        if (!event.target?.closest?.(".aidr-theme-menu-wrap")) {
          aidrCloseThemeMenus();
        }
      });
    }

    aidrBindThemePalettePanel();
  }

  window.renderThemeControls = renderThemeControls;

  let aidrThemeNameModalState = null;

  function aidrEnsureThemeNameModal() {
    let modal = document.getElementById("aidrThemeNameModal");
    if (modal) return modal;

    modal = document.createElement("div");
    modal.id = "aidrThemeNameModal";
    modal.className = "aidr-theme-name-modal";
    modal.hidden = true;

    modal.innerHTML = `
      <div class="aidr-theme-name-dialog" role="dialog" aria-modal="true" aria-labelledby="aidrThemeNameTitle">
        <button type="button" class="aidr-theme-name-close" id="aidrThemeNameCloseBtn" aria-label="Close">×</button>
        <div class="aidr-theme-name-title" id="aidrThemeNameTitle">Theme</div>
        <div class="aidr-theme-name-note" id="aidrThemeNameNote">Enter theme name.</div>
        <input id="aidrThemeNameInput" class="aidr-theme-name-input" type="text" maxlength="80">
        <div class="aidr-theme-name-actions">
          <button type="button" class="btn compact-action" id="aidrThemeNameCancelBtn">Cancel</button>
          <button type="button" class="btn primary compact-action" id="aidrThemeNameSubmitBtn">Save</button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    modal.addEventListener("click", (event) => {
      if (event.target === modal) {
        aidrCloseThemeNameModal();
      }
    });

    modal.querySelector("#aidrThemeNameCloseBtn")?.addEventListener("click", aidrCloseThemeNameModal);
    modal.querySelector("#aidrThemeNameCancelBtn")?.addEventListener("click", aidrCloseThemeNameModal);
    modal.querySelector("#aidrThemeNameSubmitBtn")?.addEventListener("click", aidrSubmitThemeNameModal);

    modal.querySelector("#aidrThemeNameInput")?.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        aidrSubmitThemeNameModal();
      } else if (event.key === "Escape") {
        event.preventDefault();
        aidrCloseThemeNameModal();
      }
    });

    return modal;
  }

  function aidrOpenThemeNameModal(options = {}) {
    const modal = aidrEnsureThemeNameModal();
    aidrThemeNameModalState = { ...options };

    const title = modal.querySelector("#aidrThemeNameTitle");
    const note = modal.querySelector("#aidrThemeNameNote");
    const input = modal.querySelector("#aidrThemeNameInput");
    const submit = modal.querySelector("#aidrThemeNameSubmitBtn");

    const mode = options.mode || "rename";

    if (title) {
      title.textContent = mode === "create" ? uiText("theme.nameCreateTitle") : uiText("theme.nameRenameTitle");
    }

    if (note) {
      note.textContent = mode === "create"
        ? uiText("theme.nameCreateNote")
        : uiText("theme.nameRenameNote");
    }

    if (submit) {
      submit.textContent = mode === "create" ? uiText("theme.nameCreateSubmit") : uiText("theme.nameRenameSubmit");
    }

    if (input) {
      input.value = options.initialName || "";
    }

    modal.hidden = false;

    window.setTimeout(() => {
      input?.focus();
      input?.select();
    }, 0);
  }

  function aidrCloseThemeNameModal() {
    const modal = document.getElementById("aidrThemeNameModal");
    if (modal) modal.hidden = true;
    aidrThemeNameModalState = null;
  }

  async function aidrSubmitThemeNameModal() {
    const modal = document.getElementById("aidrThemeNameModal");
    const input = modal?.querySelector("#aidrThemeNameInput");
    const name = String(input?.value || "").trim();

    if (!name) {
      input?.focus();
      return;
    }

    const state = aidrThemeNameModalState || {};
    aidrCloseThemeNameModal();

    if (state.mode === "create") {
      await aidrCreateThemeWithName(name);
    } else if (state.mode === "rename") {
      await aidrRenameThemeWithName(state.themeId, name);
    }
  }

  function aidrCloseThemeMenus() {
    document.querySelectorAll(".aidr-theme-menu-wrap.is-open").forEach(wrap => {
      wrap.classList.remove("is-open");
    });

    document.querySelectorAll(".aidr-theme-menu").forEach(menu => {
      menu.hidden = true;
    });
  }

  function aidrCleanThemeName(value) {
    return String(value || "").trim();
  }

  function aidrDefaultNewThemeName() {
    const n = (aidrThemeGalleryItems || []).length + 1;
    return `Theme ${n}`;
  }

  async function aidrCreateThemeFromCurrent() {
    if (aidrThemeLimitReached()) {
      alert(formatUiText("theme.limitReached", { count: aidrThemeMaxSlots, max: aidrThemeMaxSlots }));
      return;
    }

    aidrOpenThemeNameModal({
      mode: "create",
      initialName: aidrDefaultNewThemeName()
    });
  }

  async function aidrCreateThemeWithName(name) {
    const themeName = String(name || "").trim();
    if (!themeName) return;

    try {
      const res = await fetch("/api/themes/save", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({ theme_name: themeName })
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok || data.error) {
        alert(formatUiText("theme.createFailed", { message: data.error || res.status }));
        return;
      }

      log(`theme created: ${data.theme?.theme_name || themeName}`);
      await renderThemeControls();
    } catch (err) {
      alert(formatUiText("theme.createError", { message: err }));
    }
  }


  async function aidrDuplicateTheme(themeId, themeName) {
    if (!themeId) return;

    if (aidrThemeLimitReached()) {
      alert(formatUiText("theme.limitReached", { count: aidrThemeMaxSlots, max: aidrThemeMaxSlots }));
      return;
    }

    try {
      const res = await fetch("/api/themes/duplicate", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({ theme_id: themeId })
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok || data.error) {
        alert(formatUiText("theme.duplicateFailed", { message: data.error || res.status }));
        return;
      }

      log(`theme duplicated: ${data.theme?.theme_name || themeName || themeId}`);
      await renderThemeControls();
    } catch (err) {
      alert(formatUiText("theme.duplicateError", { message: err }));
    }
  }

  async function aidrRenameTheme(themeId, themeName) {
    if (!themeId) return;

    aidrOpenThemeNameModal({
      mode: "rename",
      themeId,
      initialName: aidrCleanThemeName(themeName) || themeId
    });
  }

  async function aidrRenameThemeWithName(themeId, nextName) {
    if (!themeId) return;

    const themeName = String(nextName || "").trim();
    if (!themeName) return;

    try {
      const res = await fetch("/api/themes/rename", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({
          theme_id: themeId,
          theme_name: themeName
        })
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok || data.error) {
        alert(formatUiText("theme.renameFailed", { message: data.error || res.status }));
        return;
      }

      log(`theme renamed: ${data.theme?.theme_name || themeName}`);
      await renderThemeControls();
    } catch (err) {
      alert(formatUiText("theme.renameError", { message: err }));
    }
  }


  async function aidrDeleteTheme(themeId, themeName, isCurrent) {
    if (!themeId) return;

    const label = aidrCleanThemeName(themeName) || themeId;
    const message = isCurrent === "true"
      ? formatUiText("theme.deleteCurrentConfirm", { label })
      : formatUiText("theme.deleteConfirm", { label });

    if (!confirm(message)) return;

    try {
      const res = await fetch("/api/themes/delete", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({ theme_id: themeId })
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok || data.error) {
        alert(formatUiText("theme.deleteFailed", { message: data.error || res.status }));
        return;
      }

      log(`theme deleted: ${data.theme_name || label}`);
      await renderThemeControls();
    } catch (err) {
      alert(formatUiText("theme.deleteError", { message: err }));
    }
  }

  async function applyThemeFromGallery(themeId, themeName) {
    if (!themeId) return;

    const ok = window.confirm(formatUiText("theme.applyConfirm", { themeName: themeName || themeId }));
    if (!ok) return;

    try {
      const res = await fetch("/api/themes/load", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ theme_id: themeId }),
      });
      const data = await res.json();

      if (!res.ok || data.error) {
        console.warn("Theme apply failed:", data);
        alert(formatUiText("theme.applyFailed", { message: data.error || res.status }));
        return;
      }

      log(`theme applied to deck: ${themeName || themeId}`);

      // Keep behavior aligned with existing theme load: reload to clear cached styles/spec views.
      window.location.reload();
    } catch (err) {
      console.warn("Theme apply error:", err);
      alert(formatUiText("theme.applyError", { message: err }));
    }
  }

  async function saveCurrentTheme() {
    const input = document.getElementById("aidrThemeName");
    const defaultName = uiText("theme.userThemeDefaultName", "User Theme");
    const name = (input?.value || defaultName).trim() || defaultName;

    try {
      const res = await fetch("/api/themes/save", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({ theme_name: name })
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        console.warn("Theme save failed:", data);
        alert(formatUiText("theme.saveFailed", { message: data.error || res.status }));
        return;
      }

      if (typeof log === "function") {
        log(`theme saved: ${data.theme?.theme_id || name}`);
      }

      await renderThemeControls();

      const select = document.getElementById("aidrThemeSelect");
      if (select && data.theme?.theme_id) {
        select.value = data.theme.theme_id;
      }
    } catch (err) {
      console.warn("Theme save error:", err);
      alert(formatUiText("theme.saveError", { message: err }));
    }
  }

  async function loadSelectedTheme() {
    const select = document.getElementById("aidrThemeSelect");
    const themeId = select?.value || "";

    if (!themeId) return;

    const ok = confirm(formatUiText("theme.loadConfirm", { themeId }));
    if (!ok) return;

    try {
      const res = await fetch("/api/themes/load", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({ theme_id: themeId })
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        console.warn("Theme load failed:", data);
        alert(formatUiText("theme.loadFailed", { message: data.error || res.status }));
        return;
      }

      try {
        const name = data.theme_name || data.theme_id || themeId || "theme";
        localStorage.setItem("aiDeckReconstructor.themeLoadedLog", `theme loaded: ${name}`);
      } catch (err) {
        console.warn("theme load log capture failed:", err);
      }

      // Reload to refresh cached style catalog, current modal state, preview bindings.
      window.location.reload();
    } catch (err) {
      console.warn("Theme load error:", err);
      alert(formatUiText("theme.loadError", { message: err }));
    }
  }

  function runSoon() {
    window.setTimeout(renderThemeControls, 0);
    window.setTimeout(renderThemeControls, 120);
  }

  const originalRenderThemeStyles = window.renderThemeStyles;
  if (typeof originalRenderThemeStyles === "function") {
    window.renderThemeStyles = function patchedRenderThemeStylesThemeLibrary(...args) {
      const result = originalRenderThemeStyles.apply(this, args);
      runSoon();
      return result;
    };

    try {
      renderThemeStyles = window.renderThemeStyles;
    } catch (e) {}
  }

  document.addEventListener("click", (event) => {
    const target = event.target;
    if (!target) return;
    if (target.closest?.("#aidrThemeLibraryPanel")) return;
    if (target.closest?.(".compact-action") || target.closest?.(".btn") || target.closest?.("[onclick*='renderThemeStyles']")) {
      runSoon();
    }
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", runSoon);
  } else {
    runSoon();
  }
})();


/* Font size step fix
 * Make compact font_size stepper independent from legacy adjustStyleFontSize().
 * - Direct input remains editable.
 * - ▲ / ▼ changes by 1pt.
 * - Value is clamped to min/max.
 */
(function () {
  if (window.__AIDR_FONT_SIZE_STEP_FIX_INSTALLED__) return;
  window.__AIDR_FONT_SIZE_STEP_FIX_INSTALLED__ = true;

  function clamp(value, min, max) {
    const n = Number(value);
    if (!Number.isFinite(n)) return min;
    return Math.max(min, Math.min(max, n));
  }

  window.aidrAdjustStyleFontSize = function aidrAdjustStyleFontSize(delta) {
    const input = document.getElementById("styleEditFontSize");
    if (!input) return;

    const min = Number(input.getAttribute("min") || 6);
    const max = Number(input.getAttribute("max") || 96);
    const current = Number(input.value || 0);
    const base = Number.isFinite(current) && current > 0 ? current : min;
    const next = clamp(base + Number(delta || 0), min, max);

    input.value = String(next);
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
  };

  document.addEventListener("click", function (event) {
    const btn = event.target?.closest?.(".aidr-font-size-spin-btn");
    if (!btn) return;

    event.preventDefault();

    if (btn.classList.contains("aidr-font-size-spin-up")) {
      window.aidrAdjustStyleFontSize(1);
    } else if (btn.classList.contains("aidr-font-size-spin-down")) {
      window.aidrAdjustStyleFontSize(-1);
    }
  });

  document.addEventListener("change", function (event) {
    const input = event.target;
    if (!input || input.id !== "styleEditFontSize") return;

    const min = Number(input.getAttribute("min") || 6);
    const max = Number(input.getAttribute("max") || 96);
    input.value = String(clamp(input.value, min, max));
  });
})();

/* Current style placement inside form
 * Correct layout:
 * Theme + Role Style panels
 * -> Current Style summary
 * -> font_family / font_size / color / align...
 */
(function () {
  if (window.__AIDR_CURRENT_STYLE_SUMMARY_FORM_RELOCATOR_INSTALLED__) return;
  window.__AIDR_CURRENT_STYLE_SUMMARY_FORM_RELOCATOR_INSTALLED__ = true;

  function moveCurrentStyleInsideForm() {
    const item = document.querySelector(".selected-style-item");
    if (!item) return;

    const form = item.querySelector(":scope > .style-edit-form");
    if (!form) return;

    let summary = item.querySelector(":scope > .aidr-current-style-summary") ||
                  form.querySelector(":scope > .aidr-current-style-summary");

    const head = item.querySelector(":scope > .text-style-head") ||
                 summary?.querySelector(".text-style-head");

    const meta = item.querySelector(":scope > .text-style-meta") ||
                 summary?.querySelector(".text-style-meta");

    if (!head || !meta) return;

    if (!summary) {
      summary = document.createElement("div");
      summary.className = "aidr-current-style-summary";
    }

    if (!summary.contains(head)) summary.appendChild(head);
    if (!summary.contains(meta)) summary.appendChild(meta);

    const themePanel = form.querySelector("#aidrThemeLibraryPanel");
    const rolePanel = form.querySelector("#aidrRoleStyleCatalog");

    let anchor = null;

    if (rolePanel) {
      anchor = rolePanel;
    } else if (themePanel) {
      anchor = themePanel;
    }

    if (anchor && anchor.parentElement === form) {
      if (anchor.nextElementSibling !== summary) {
        form.insertBefore(summary, anchor.nextElementSibling);
      }
    } else {
      if (form.firstElementChild !== summary) {
        form.insertBefore(summary, form.firstElementChild);
      }
    }
  }

  function runSoon() {
    window.setTimeout(moveCurrentStyleInsideForm, 0);
    window.setTimeout(moveCurrentStyleInsideForm, 100);
    window.setTimeout(moveCurrentStyleInsideForm, 300);
  }

  const originalRender = window.renderThemeStyles;
  if (typeof originalRender === "function") {
    window.renderThemeStyles = function patchedRenderThemeStylesMoveCurrentInside(...args) {
      const result = originalRender.apply(this, args);
      runSoon();
      return result;
    };

    try {
      renderThemeStyles = window.renderThemeStyles;
    } catch (e) {}
  }

  document.addEventListener("click", (event) => {
    const target = event.target;
    if (!target) return;

    if (
      target.closest?.(".aidr-style-ref-chip") ||
      target.closest?.("#aidrStyleCategory") ||
      target.closest?.("#aidrThemeLibraryPanel") ||
      target.closest?.(".compact-action") ||
      target.closest?.(".btn")
    ) {
      runSoon();
    }
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", runSoon);
  } else {
    runSoon();
  }
})();


/* Compact lower form controls
 * Layout polish:
 * Lower controls become compact rows:
 *   font_family [select] ★   font_size [number ▲▼] pt   color [swatch] [hex]
 *   align [Left Center Right]   style [B I]
 *   [Save Style] [Reset]
 */
(function () {
  if (window.__AIDR_COMPACT_TEXT_STYLE_CONTROLS_INSTALLED__) return;
  window.__AIDR_COMPACT_TEXT_STYLE_CONTROLS_INSTALLED__ = true;

  function compactLowerControls() {
    const form = document.querySelector(".selected-style-item > .style-edit-form");
    if (!form) return;

    const fontFamily = document.getElementById("styleEditFontFamily");
    const fontSize = document.getElementById("styleEditFontSize");
    const color = document.getElementById("styleEditColor");
    const align = document.getElementById("styleEditAlign");
    const bold = document.getElementById("styleEditBold");

    const fontLabel = fontFamily?.closest("label");
    const sizeLabel = fontSize?.closest("label");
    const colorLabel = color?.closest("label");
    const alignLabel = align?.closest("label");
    const styleLabel = bold?.closest("label");

    if (!fontLabel || !sizeLabel || !colorLabel || !alignLabel || !styleLabel) return;

    form.classList.add("aidr-compact-lower-form");

    fontLabel.classList.add("aidr-field", "aidr-field-font-family");
    sizeLabel.classList.add("aidr-field", "aidr-field-font-size");
    colorLabel.classList.add("aidr-field", "aidr-field-color");
    alignLabel.classList.add("aidr-field", "aidr-field-align");
    styleLabel.classList.add("aidr-field", "aidr-field-style");

    let actionRow = form.querySelector(":scope > .aidr-action-row");
    if (!actionRow) {
      const buttons = Array.from(form.querySelectorAll("button"));
      const saveBtn = buttons.find(btn => (btn.textContent || "").trim() === "Save Style");
      const resetBtn = buttons.find(btn => (btn.textContent || "").trim() === "Reset");

      if (saveBtn && resetBtn) {
        actionRow = document.createElement("div");
        actionRow.className = "aidr-action-row";

        form.insertBefore(actionRow, saveBtn);
        actionRow.appendChild(saveBtn);
        actionRow.appendChild(resetBtn);
      }
    }

    // Keep the bottom help note full-width.
    Array.from(form.children).forEach(child => {
      const t = (child.textContent || "").trim();
      if (t.includes("sector_defaults.json") && t.includes("PPTX")) {
        child.classList.add("aidr-help-note");
      }
    });
  }

  function runSoon() {
    window.setTimeout(compactLowerControls, 0);
    window.setTimeout(compactLowerControls, 120);
    window.setTimeout(compactLowerControls, 300);
  }

  const originalRender = window.renderThemeStyles;
  if (typeof originalRender === "function") {
    window.renderThemeStyles = function patchedRenderThemeStylesCompactLower(...args) {
      const result = originalRender.apply(this, args);
      runSoon();
      return result;
    };

    try {
      renderThemeStyles = window.renderThemeStyles;
    } catch (e) {}
  }

  document.addEventListener("click", (event) => {
    const target = event.target;
    if (!target) return;
    if (
      target.closest?.(".aidr-style-ref-chip") ||
      target.closest?.("#aidrStyleCategory") ||
      target.closest?.("#aidrThemeLibraryPanel") ||
      target.closest?.(".compact-action") ||
      target.closest?.(".btn")
    ) {
      runSoon();
    }
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", runSoon);
  } else {
    runSoon();
  }
})();


/* Theme delete log
 * Theme Management Polish:
 * - Show "theme loaded" log after reload using localStorage.
 * - Add Delete Theme button.
 */
(function () {
  if (window.__AIDR_THEME_DELETE_LOGGING_INSTALLED__) return;
  window.__AIDR_THEME_DELETE_LOGGING_INSTALLED__ = true;

  const LOAD_LOG_KEY = "aiDeckReconstructor.themeLoadedLog";

  function safeLog(message) {
    if (typeof log === "function") {
      log(message);
    } else {
      console.log(message);
    }
  }

  function showPendingThemeLoadedLog() {
    try {
      const message = localStorage.getItem(LOAD_LOG_KEY);
      if (!message) return;
      localStorage.removeItem(LOAD_LOG_KEY);
      safeLog(message);
    } catch (err) {
      console.warn("theme loaded log restore failed:", err);
    }
  }

  function getSelectedThemeId() {
    return document.getElementById("aidrThemeSelect")?.value || "";
  }

  function getSelectedThemeLabel() {
    const select = document.getElementById("aidrThemeSelect");
    if (!select) return getSelectedThemeId();
    const option = select.options[select.selectedIndex];
    return option ? option.textContent.trim() : getSelectedThemeId();
  }

  function injectDeleteButton() {
    const panel = document.getElementById("aidrThemeLibraryPanel");
    if (!panel) return;

    const loadBtn = document.getElementById("aidrLoadThemeBtn");
    const refreshBtn = document.getElementById("aidrRefreshThemeBtn");
    if (!loadBtn || !refreshBtn) return;

    if (document.getElementById("aidrDeleteThemeBtn")) return;

    const btn = document.createElement("button");
    btn.type = "button";
    btn.id = "aidrDeleteThemeBtn";
    btn.className = "aidr-theme-btn danger";
    btn.dataset.i18n = "common.delete";
    btn.textContent = uiText("common.delete");
    btn.addEventListener("click", deleteSelectedTheme);

    refreshBtn.insertAdjacentElement("afterend", btn);
  }

  async function deleteSelectedTheme() {
    const themeId = getSelectedThemeId();
    if (!themeId) return;

    const label = getSelectedThemeLabel();
    const ok = confirm(formatUiText("theme.deleteFileConfirm", { label, themeId }));
    if (!ok) return;

    try {
      const res = await fetch("/api/themes/delete", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({ theme_id: themeId })
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        console.warn("Theme delete failed:", data);
        alert(formatUiText("theme.deleteFailed", { message: data.error || res.status }));
        return;
      }

      safeLog(`theme deleted: ${data.theme_id}`);

      // Re-render existing Theme panel if available.
      const refreshBtn = document.getElementById("aidrRefreshThemeBtn");
      if (refreshBtn) {
        refreshBtn.click();
      } else {
        window.location.reload();
      }
    } catch (err) {
      console.warn("Theme delete error:", err);
      alert(formatUiText("theme.deleteError", { message: err }));
    }
  }

  function runSoon() {
    window.setTimeout(injectDeleteButton, 0);
    window.setTimeout(injectDeleteButton, 120);
    window.setTimeout(injectDeleteButton, 320);
  }


  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      showPendingThemeLoadedLog();
      runSoon();
    });
  } else {
    showPendingThemeLoadedLog();
    runSoon();
  }

  document.addEventListener("click", (event) => {
    const target = event.target;
    if (!target) return;
    if (
      target.closest?.("#aidrThemeLibraryPanel") ||
      target.closest?.(".compact-action") ||
      target.closest?.(".btn")
    ) {
      runSoon();
    }
  });
})();


/* Theme delete click fix
 * Robust global Delete Theme handler.
 * Fixes cases where Delete button is visible but scoped event binding does not fire.
 */
(function () {
  if (window.__AIDR_THEME_DELETE_CLICK_HANDLER_INSTALLED__) return;
  window.__AIDR_THEME_DELETE_CLICK_HANDLER_INSTALLED__ = true;

  function safeLog(message) {
    if (typeof log === "function") {
      log(message);
    } else {
      console.log(message);
    }
  }

  function selectedThemeInfo() {
    const select = document.getElementById("aidrThemeSelect");
    const themeId = select?.value || "";

    if (!select || !themeId) {
      return { themeId: "", label: "" };
    }

    const option = select.options[select.selectedIndex];
    const label = option ? option.textContent.trim() : themeId;

    return { themeId, label };
  }

  window.aidrDeleteSelectedTheme = async function aidrDeleteSelectedTheme() {
    const { themeId, label } = selectedThemeInfo();

    if (!themeId) {
      alert(uiText("theme.noThemeSelected"));
      return;
    }

    const ok = confirm(formatUiText("theme.deleteFileConfirm", {
      label: label || themeId,
      themeId,
    }));

    if (!ok) return;

    try {
      const res = await fetch("/api/themes/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ theme_id: themeId })
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        console.warn("Theme delete failed:", data);
        alert(formatUiText("theme.deleteFailed", { message: data.error || res.status }));
        return;
      }

      safeLog(`theme deleted: ${data.theme_id}`);

      // Keep the UI reliable: reload after delete so the list/current theme state is fresh.
      window.location.reload();
    } catch (err) {
      console.warn("Theme delete error:", err);
      alert(formatUiText("theme.deleteError", { message: err }));
    }
  };

  document.addEventListener("click", function (event) {
    const btn = event.target?.closest?.("#aidrDeleteThemeBtn");
    if (!btn) return;

    event.preventDefault();
    event.stopPropagation();

    window.aidrDeleteSelectedTheme();
  }, true);
})();

/* Assist Menu tabs
 * Single source of truth for Assist Menu modal tabs.
 * Theme button -> open Assist Menu / Theme tab.
 * Text Settings button -> open Assist Menu / Text Settings tab.
 * Text gear -> open Assist Menu / Text Settings tab.
 */
(function () {
  if (window.__AIDR_ASSIST_TABS_INSTALLED__) return;
  window.__AIDR_ASSIST_TABS_INSTALLED__ = true;

  let assistActiveTab = "style";
  let assistOpenIntent = null;
  let isNormalizing = false;

  function listEl() {
    return document.getElementById("themeStyleList");
  }

  function themePanelEl() {
    return document.getElementById("aidrThemeLibraryPanel");
  }

  function fallbackStyleRef() {
    try {
      if (typeof getCurrentSelectedStyleRef === "function") {
        const ref = getCurrentSelectedStyleRef();
        if (ref) return ref;
      }
    } catch (e) {}

    try {
      if (selectedThemeStyleRef) return selectedThemeStyleRef;
    } catch (e) {}

    return "left.h2";
  }

  function ensureAssistShell() {
    const list = listEl();
    if (!list) return null;

    let tabs = document.getElementById("aidrAssistTabs");
    if (!tabs) {
      tabs = document.createElement("div");
      tabs.id = "aidrAssistTabs";
      tabs.className = "aidr-assist-tabs";
      tabs.innerHTML = `
        <button type="button" class="aidr-assist-tab-btn" data-tab="theme">${escapeHtml(uiText("assist.theme"))}</button>
        <button type="button" class="aidr-assist-tab-btn" data-tab="style">${escapeHtml(uiText("assist.textSettings"))}</button>
        <button type="button" class="aidr-assist-tab-btn" data-tab="asset">${escapeHtml(uiText("assist.assetEdit"))}</button>
      `;
      list.prepend(tabs);
    }

    let themePane = document.getElementById("aidrAssistThemePane");
    if (!themePane) {
      themePane = document.createElement("div");
      themePane.id = "aidrAssistThemePane";
      themePane.className = "aidr-assist-pane";
    }

    let stylePane = document.getElementById("aidrAssistStylePane");
    if (!stylePane) {
      stylePane = document.createElement("div");
      stylePane.id = "aidrAssistStylePane";
      stylePane.className = "aidr-assist-pane";
    }

    if (tabs.nextSibling !== themePane) {
      list.insertBefore(themePane, tabs.nextSibling);
    }

    if (themePane.nextSibling !== stylePane) {
      list.insertBefore(stylePane, themePane.nextSibling);
    }

    return { list, tabs, themePane, stylePane };
  }

  function normalizeAssistMenu() {
    if (isNormalizing) return;
    isNormalizing = true;

    try {
      const shell = ensureAssistShell();
      if (!shell) return;

      const { list, tabs, themePane, stylePane } = shell;
      const themePanel = themePanelEl();

      if (themePanel && themePanel.parentElement !== themePane) {
        themePane.appendChild(themePanel);
      }

      Array.from(list.children).forEach(child => {
        if (
          child.id === "aidrAssistTabs" ||
          child.id === "aidrAssistThemePane" ||
          child.id === "aidrAssistStylePane" ||
          child.id === "aidrAssistAssetEditPanel" ||
          child.id === "aidrThemeLibraryPanel"
        ) {
          return;
        }

        stylePane.appendChild(child);
      });

      tabs.querySelectorAll(".aidr-assist-tab-btn").forEach(btn => {
        btn.onclick = (event) => {
          event?.preventDefault?.();
          event?.stopPropagation?.();
          handleAssistTabButton(btn.dataset.tab || "style");
        };
      });

      applyAssistTab();
    } finally {
      isNormalizing = false;
    }
  }


  function getCurrentAssetEditTargetForAssist() {
    if (typeof selectedElementKey !== "undefined" && selectedElementKey) {
      if (selectedElementKey.startsWith("asset:")) {
        return { kind: "asset", id: selectedElementKey.slice("asset:".length) };
      }
      if (selectedElementKey.startsWith("candidate:")) {
        return { kind: "candidate", id: selectedElementKey.slice("candidate:".length) };
      }
    }

    const state = window.__quickRepairState || {};
    if (state.assetId) return { kind: "asset", id: state.assetId };

    if (typeof aidrSelectedAssetId !== "undefined" && aidrSelectedAssetId) {
      return { kind: "asset", id: aidrSelectedAssetId };
    }

    return { kind: "", id: "" };
  }

  function ensureAssistAssetEditPanel() {
    const shell = ensureAssistShell();
    if (!shell || !shell.list) return null;

    let panel = document.getElementById("aidrAssistAssetEditPanel");
    if (panel) return panel;

    panel = document.createElement("div");
    panel.id = "aidrAssistAssetEditPanel";
    panel.className = "aidr-assist-asset-edit-panel";
    panel.style.display = "none";

    panel.innerHTML = `
      <div class="assist-modal-asset-card">
        <h3>${escapeHtml(uiText("assetEdit.panelTitle"))}</h3>
        <p>${escapeHtml(uiText("assetEdit.panelDescription"))}</p>

        <div class="assist-modal-asset-tools">
          <div>
            <strong>${escapeHtml(uiText("materialOp.textEraser"))}</strong>
            <span>${escapeHtml(uiText("assetEdit.textEraserDescription"))}</span>
          </div>
          <div>
            <strong>${escapeHtml(uiText("materialOp.fillOpacity"))}</strong>
            <span>${escapeHtml(uiText("assetEdit.fillOpacityDescription"))}</span>
          </div>
          <div>
            <strong>${escapeHtml(uiText("materialOp.quickRepair"))}</strong>
            <span>${escapeHtml(uiText("assetEdit.quickRepairDescription"))}</span>
          </div>
        </div>

        <div class="assist-modal-asset-target">
          <span>${escapeHtml(uiText("common.target"))}</span>
          <strong class="assist-asset-target-value">${escapeHtml(uiText("common.notSelected"))}</strong>
        </div>

        <button type="button" class="assist-asset-open-btn" disabled>
          ${escapeHtml(uiText("assetEdit.selectAssetOrCandidate"))}
        </button>
      </div>
    `;

    shell.list.insertBefore(panel, shell.stylePane ? shell.stylePane.nextSibling : null);

    const openBtn = panel.querySelector(".assist-asset-open-btn");
    openBtn.onclick = () => {
      updateAssistAssetEditPanel();

      const target = getCurrentAssetEditTargetForAssist();
      if (!target.kind || !target.id) {
        alert(uiText("assetEdit.selectAssetOrCandidate"));
        return;
      }

      if (typeof openSelectedAssetEditModal === "function") {
        openSelectedAssetEditModal();
        return;
      }

      if (typeof openMaterialSettings === "function") {
        openMaterialSettings(target.kind, target.id);
        return;
      }

      alert(uiText("assetEdit.modalOpenFailed"));
    };

    return panel;
  }

  function updateAssistAssetEditPanel() {
    const panel = ensureAssistAssetEditPanel();
    if (!panel) return;

    const target = getCurrentAssetEditTargetForAssist();
    const hasTarget = !!(target.kind && target.id);

    const value = panel.querySelector(".assist-asset-target-value");
    if (value) value.textContent = hasTarget ? `${target.kind}:${target.id}` : uiText("common.notSelected");

    const btn = panel.querySelector(".assist-asset-open-btn");
    if (btn) {
      btn.disabled = !hasTarget;
      btn.textContent = hasTarget ? uiText("assetEdit.openSelectedAsset") : uiText("assetEdit.selectAssetOrCandidate");
    }
  }

  function setAssistContentVisibilityForAsset(tab) {
    const shell = ensureAssistShell();
    if (!shell || !shell.list) return;

    const isAsset = tab === "asset";

    const assetPanel = ensureAssistAssetEditPanel();
    if (assetPanel) {
      assetPanel.style.display = isAsset ? "block" : "none";
      if (isAsset) updateAssistAssetEditPanel();
    }

    if (!shell.list || typeof shell.list.querySelectorAll !== "function") return;

    shell.list.querySelectorAll(".aidr-theme-library-title, .aidr-role-style-title").forEach((title) => {
      const block =
        title.closest(".aidr-theme-panel") ||
        title.closest(".aidr-theme-library") ||
        title.closest(".aidr-role-style-panel") ||
        title.closest(".aidr-role-style-card") ||
        title.parentElement;

      if (block) block.style.display = isAsset ? "none" : "";
    });
  }

  function applyAssistTab() {
    const tabs = document.getElementById("aidrAssistTabs");
    const themePane = document.getElementById("aidrAssistThemePane");
    const stylePane = document.getElementById("aidrAssistStylePane");
    const assetPanel = ensureAssistAssetEditPanel();

    if (!tabs || !themePane || !stylePane) return;

    tabs.querySelectorAll(".aidr-assist-tab-btn").forEach(btn => {
      const active = btn.dataset.tab === assistActiveTab;
      btn.classList.toggle("is-active", active);
      btn.classList.toggle("active", active);
      btn.setAttribute("aria-selected", active ? "true" : "false");
    });

    themePane.hidden = assistActiveTab !== "theme";
    stylePane.hidden = assistActiveTab !== "style";

    if (assetPanel) {
      assetPanel.hidden = assistActiveTab !== "asset";
      assetPanel.style.display = assistActiveTab === "asset" ? "block" : "none";
      if (assistActiveTab === "asset") updateAssistAssetEditPanel();
    }

    if (assistActiveTab === "theme") {
      themePane.querySelectorAll("[hidden]").forEach(el => el.hidden = false);
    }

    if (assistActiveTab === "style") {
      stylePane.querySelectorAll("[hidden]").forEach(el => el.hidden = false);
    }
  }

  function setAssistTab(tab) {
    const normalizedTab = tab === "theme" || tab === "style" || tab === "asset" ? tab : "style";
    assistActiveTab = normalizedTab;
    normalizeAssistMenu();
    setAssistContentVisibilityForAsset(normalizedTab);
    applyAssistTab();
  }

  function refreshAssistTabLabels() {
    const tabs = document.getElementById("aidrAssistTabs");
    if (!tabs) return;

    const labels = {
      theme: uiText("assist.theme"),
      style: uiText("assist.textSettings"),
      asset: uiText("assist.assetEdit"),
    };

    tabs.querySelectorAll(".aidr-assist-tab-btn").forEach(btn => {
      const tab = btn.dataset.tab || "";
      if (labels[tab]) btn.textContent = labels[tab];
    });
  }

  function markAssistPaneLanguage(tab) {
    const shell = ensureAssistShell();
    const lang = currentLanguage;

    if (tab === "theme") {
      if (shell?.themePane) shell.themePane.dataset.assistLanguage = lang;
      const themePanel = document.getElementById("aidrThemeLibraryPanel");
      if (themePanel) themePanel.dataset.assistLanguage = lang;
    }

    if (tab === "style") {
      if (shell?.stylePane) shell.stylePane.dataset.assistLanguage = lang;
    }
  }

  function invalidateAssistPaneLanguages() {
    const themePane = document.getElementById("aidrAssistThemePane");
    const stylePane = document.getElementById("aidrAssistStylePane");
    const themePanel = document.getElementById("aidrThemeLibraryPanel");

    if (themePane) themePane.dataset.assistLanguage = "";
    if (stylePane) stylePane.dataset.assistLanguage = "";
    if (themePanel) themePanel.dataset.assistLanguage = "";
  }

  function refreshAssistLanguageSensitiveUi() {
    refreshAssistTabLabels();
    invalidateAssistPaneLanguages();

    const assetPanel = document.getElementById("aidrAssistAssetEditPanel");
    if (assetPanel) assetPanel.remove();

    const modal = document.getElementById("themeSettingsModal");
    const modalIsOpen = !!modal && modal.style.display !== "" && modal.style.display !== "none";

    if (!modalIsOpen) {
      const themePanel = document.getElementById("aidrThemeLibraryPanel");
      if (themePanel && typeof window.renderThemeControls === "function") {
        setTimeout(() => window.renderThemeControls(), 0);
      }
      return;
    }

    const tab = assistActiveTab || "style";
    setTimeout(() => {
      if (typeof window.openAssistSettings === "function") {
        window.openAssistSettings(tab);
      }
    }, 0);
  }

  window.refreshAssistLanguageSensitiveUi = refreshAssistLanguageSensitiveUi;

  function assistPaneHasContent(tab) {
    if (tab === "theme") {
      const themePanel = document.getElementById("aidrThemeLibraryPanel");
      const themePane = document.getElementById("aidrAssistThemePane");
      const langMatches =
        themePane?.dataset.assistLanguage === currentLanguage ||
        themePanel?.dataset.assistLanguage === currentLanguage;

      return langMatches && !!themePanel && !!themePanel.querySelector(".aidr-theme-gallery");
    }

    if (tab === "style") {
      const stylePane = document.getElementById("aidrAssistStylePane");
      const langMatches = stylePane?.dataset.assistLanguage === currentLanguage;
      return langMatches && !!stylePane && !!stylePane.querySelector(".style-edit-form");
    }

    if (tab === "asset") {
      return !!document.getElementById("aidrAssistAssetEditPanel");
    }

    return false;
  }

  function handleAssistTabButton(tab) {
    const normalizedTab = tab === "theme" || tab === "style" || tab === "asset" ? tab : "style";

    if (assistPaneHasContent(normalizedTab)) {
      setAssistTab(normalizedTab);
      return;
    }

    if (normalizedTab === "theme" || normalizedTab === "style") {
      openAssistSettings(normalizedTab);
      return;
    }

    setAssistTab(normalizedTab);
  }

  async function openAssistSettings(tab, styleRef = null) {
    assistOpenIntent = tab === "theme" ? "theme" : tab === "asset" ? "asset" : "style";
    assistActiveTab = assistOpenIntent;

    if (assistOpenIntent === "theme") {
      const modal = document.getElementById("themeSettingsModal");

      ensureAssistShell();

      if (typeof window.renderThemeControls === "function") {
        await window.renderThemeControls();
      }

      if (modal) modal.style.display = "flex";

      if (typeof loadThemeStyles === "function") {
        loadThemeStyles();
      }

      if (typeof loadSystemFonts === "function") {
        loadSystemFonts();
      }

      normalizeAssistMenu();
      markAssistPaneLanguage("theme");
      setAssistTab("theme");

      setTimeout(() => setAssistTab("theme"), 120);
      setTimeout(() => {
        assistOpenIntent = null;
      }, 180);
      return;
    }

    const ref = styleRef || fallbackStyleRef();

    if (assistOpenIntent === "style") {
      setAssistTab("style");
    }

    if (typeof window.openThemeSettings === "function") {
      await window.openThemeSettings(ref);
    } else if (typeof openThemeSettings === "function") {
      await openThemeSettings(ref);
    }

    if (assistOpenIntent === "style") {
      markAssistPaneLanguage("style");
    }

    setTimeout(() => setAssistTab(assistOpenIntent), 0);
    setTimeout(() => setAssistTab(assistOpenIntent), 120);
    setTimeout(() => {
      assistOpenIntent = null;
    }, 180);
  }

  window.openAssistSettings = openAssistSettings;

  const baseOpenThemeSettings = window.openThemeSettings;
  if (typeof baseOpenThemeSettings === "function") {
    window.openThemeSettings = async function aidrOpenThemeSettings(...args) {
      const result = await baseOpenThemeSettings.apply(this, args);

      const targetTab = assistOpenIntent || "style";
      assistActiveTab = targetTab;

      setTimeout(() => setAssistTab(targetTab), 0);
      setTimeout(() => setAssistTab(targetTab), 120);

      return result;
    };

    try {
      openThemeSettings = window.openThemeSettings;
    } catch (e) {}
  }

  const baseRenderThemeStyles = window.renderThemeStyles;
  if (typeof baseRenderThemeStyles === "function") {
    window.renderThemeStyles = function aidrRenderThemeStyles(...args) {
      const result = baseRenderThemeStyles.apply(this, args);
      setTimeout(normalizeAssistMenu, 0);
      setTimeout(normalizeAssistMenu, 120);
      return result;
    };

    try {
      renderThemeStyles = window.renderThemeStyles;
    } catch (e) {}
  }

  const baseSetAssistMode = window.setAssistMode;
  if (typeof baseSetAssistMode === "function") {
    window.setAssistMode = function aidrSetAssistMode(mode) {
      if (mode === "theme") {
        openAssistSettings("theme");
        return;
      }

      if (mode === "asset") {
        openAssistSettings("asset");
        return;
      }

      const result = baseSetAssistMode.apply(this, arguments);

      if (mode === "style") {
        openAssistSettings("style");
      }

      return result;
    };

    try {
      setAssistMode = window.setAssistMode;
    } catch (e) {}
  }

  document.addEventListener("click", event => {
    const btn = event.target?.closest?.("#aidrAssistTabs .aidr-assist-tab-btn");
    if (!btn) return;
    event.preventDefault();
    event.stopPropagation();
    handleAssistTabButton(btn.dataset.tab || "style");
  });

  const observer = new MutationObserver(() => {
    if (isNormalizing) return;
    setTimeout(normalizeAssistMenu, 0);
  });

  if (document.body) {
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }
})();

/* Asset Preview lightbox
 * Click asset thumbnails to inspect generated variants.
 */
(function () {
  if (window.__AIDR_ASSET_PREVIEW_LIGHTBOX_INSTALLED__) return;
  window.__AIDR_ASSET_PREVIEW_LIGHTBOX_INSTALLED__ = true;


function ensureAssetPreviewModal() {
  let modal = document.getElementById("assetPreviewModal");
  if (modal) return modal;

  modal = document.createElement("div");
  modal.id = "assetPreviewModal";
  modal.className = "asset-preview-overlay";
  modal.hidden = true;
  modal.innerHTML = `
    <div class="asset-preview-dialog" role="dialog" aria-modal="true">
      <div class="asset-preview-head">
        <div>
          <div class="pane-kicker">素材プレビュー</div>
          <div class="asset-preview-title" id="assetPreviewTitle">素材</div>
          <div class="asset-preview-meta" id="assetPreviewMeta"></div>
        </div>
        <button class="header-icon-btn" type="button" onclick="closeAssetPreview()" title="閉じる">×</button>
      </div>

      <div class="asset-preview-toolbar">
        <button class="asset-preview-tool-btn" type="button" id="quickRepairPickBtn" onclick="setQuickRepairMode('pick')">
          <span class="asset-preview-tool-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" class="asset-preview-tool-svg">
              <path d="M14.7 6.3l3 3m-9.9 9.9l-3.6 1.2 1.2-3.6L14 8.3a1.7 1.7 0 0 1 2.4 0l1.3 1.3a1.7 1.7 0 0 1 0 2.4L9.3 20.4Z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </span>
          <span>色を拾う</span>
        </button>
        <button class="asset-preview-tool-btn" type="button" id="quickRepairRectBtn" onclick="setQuickRepairMode('rect')">矩形</button>
        <button class="asset-preview-tool-btn" type="button" id="quickRepairRecolorBtn" onclick="setPreviewWorkspaceTool('recolor')">再配色</button>
        <div class="asset-preview-color-chip-wrap">
          <span>色</span>
          <span class="asset-preview-color-chip" id="quickRepairColorChip"></span>
          <span class="asset-preview-color-value" id="quickRepairColorValue">rgb(255,255,255)</span>
        </div>
        <div class="asset-preview-toggle-group">
          <button class="asset-preview-mini-toggle active" type="button" id="quickRepairFillToggle" onclick="toggleQuickRepairFill()">塗り</button>
          <button class="asset-preview-mini-toggle" type="button" id="quickRepairStrokeToggle" onclick="toggleQuickRepairStroke()">線</button>
        </div>
        <div class="asset-preview-tool-spacer"></div>
        <button class="asset-preview-save-btn secondary" type="button" onclick="resetPreviewWorkspace()">リセット</button>
        <button class="asset-preview-save-btn" type="button" onclick="saveQuickRepair('variant')">バリアント保存</button>
      </div>

      <div class="asset-preview-guidance" id="assetPreviewGuidance">
        <strong>${escapeHtml(uiText("recolor.guidance.quickRepairTitle"))}</strong>
        <span>${escapeHtml(uiText("recolor.guidance.quickRepairBody"))}</span>
      </div>

      <div class="asset-preview-recolor-panel" id="assetPreviewRecolorPanel" hidden>
        <div class="asset-preview-recolor-row">
          <div class="asset-preview-recolor-chip-wrap">
            <span>${escapeHtml(uiText("recolor.label.source"))}</span>
            <span class="asset-preview-color-chip" id="recolorSourceChip"></span>
            <span class="asset-preview-color-value" id="recolorSourceValue">${escapeHtml(uiText("recolor.label.notSelected"))}</span>
          </div>
          <div class="asset-preview-recolor-chip-wrap">
            <span>対象</span>
            <span class="asset-preview-color-chip" id="recolorTargetChip"></span>
            <span class="asset-preview-color-value" id="recolorTargetValue">${escapeHtml(uiText("recolor.label.notSelected"))}</span>
          </div>
          <label class="asset-preview-tolerance">
            <span>${escapeHtml(uiText("recolor.label.tolerance"))}</span>
            <input id="recolorToleranceInput" type="number" min="1" max="160" value="28" onchange="updateRecolorTolerance(this.value)">
          </label>
          <div class="asset-preview-tolerance-presets">
            <button type="button" onclick="setRecolorTolerancePreset(12)">Strict 12</button>
            <button type="button" onclick="setRecolorTolerancePreset(28)">Normal 28</button>
            <button type="button" onclick="setRecolorTolerancePreset(48)">Wide 48</button>
            <button type="button" onclick="setRecolorTolerancePreset(72)">Risky 72</button>
          </div>
        </div>
        <div class="asset-preview-recolor-actions">
          <button class="asset-preview-save-btn secondary" type="button" id="recolorNextBtn" onclick="advanceRecolorToTarget()" disabled>
            ${escapeHtml(uiText("recolor.action.selectTargetColor"))}
          </button>
        </div>
        <div class="asset-preview-theme-palette-wrap" id="recolorThemePaletteWrap" hidden>
          <div class="asset-preview-theme-palette-head">
            <strong>${escapeHtml(uiText("recolor.label.colorPalette"))}</strong>
            <span id="recolorThemePaletteNote">${escapeHtml(uiText("recolor.palette.initialNote"))}</span>
          </div>
          <div class="asset-preview-theme-current">
            <span class="asset-preview-color-chip" id="recolorPaletteCurrentChip"></span>
            <input id="recolorPaletteCurrentHex" type="text" value="" readonly>
          </div>
          <div class="asset-preview-theme-tabs">
            <button type="button" class="asset-preview-theme-tab active">System</button>
            <button type="button" class="asset-preview-theme-tab">Minimal</button>
            <button type="button" class="asset-preview-theme-tab">Retro</button>
            <button type="button" class="asset-preview-theme-tab">Cyberpunk</button>
            <button type="button" class="asset-preview-theme-tab">WarmProposal</button>
          </div>
          <div class="asset-preview-theme-colors" id="recolorThemeColors"></div>
        </div>
        <button class="asset-preview-save-btn" type="button" id="recolorActionBtn" onclick="handleRecolorAction()" disabled>
          ${escapeHtml(uiText("recolor.action.selectSourceFirst"))}
        </button>
        <button class="asset-preview-save-btn" type="button" id="recolorApplyBtn" onclick="applyRecolorVariant()" disabled>
          ${escapeHtml(uiText("recolor.action.apply"))}
        </button>
      </div>

      <div class="asset-preview-zoom-row">
        <div class="asset-preview-zoom-controls" aria-label="Asset preview zoom">
          <button class="asset-preview-mini-toggle" type="button" onclick="zoomAssetPreview(-0.1)" title="Zoom out">−</button>
          <button class="asset-preview-mini-toggle asset-preview-zoom-reset" type="button" id="assetPreviewZoomValue" onclick="resetAssetPreviewZoom()" title="Reset zoom">100%</button>
          <button class="asset-preview-mini-toggle" type="button" onclick="zoomAssetPreview(0.1)" title="Zoom in">＋</button>
        </div>
      </div>

      <div class="asset-preview-body">
        <div class="asset-preview-canvas-wrap checkerboard" id="assetPreviewCanvasWrap">
          <img id="assetPreviewImage" class="asset-preview-image" src="" alt="素材プレビュー" draggable="false">
          <svg id="assetPreviewOverlay" class="asset-preview-overlay-svg"></svg>
        </div>
      </div>

      <details class="asset-preview-repair-note">
        <summary>補足</summary>
        <div>クイック補修は非破壊処理で、常に新しいバリアントとして保存します。透過バリアントでは、先に不透明な元素材を補修してから、透過処理を再適用してください。</div>
      </details>
    </div>
  `;

  modal.addEventListener("click", (event) => {
    if (event.target === modal) closeAssetPreview();
  });

  document.body.appendChild(modal);
  bindQuickRepairPointerEvents();
  return modal;
}

window.__quickRepairState = window.__quickRepairState || {
  assetId: "",
  mode: "pick",
  color: [255, 255, 255, 255],
  fillEnabled: true,
  strokeEnabled: false,
  recolorStep: "idle",
  recolorSource: null,
  recolorTarget: null,
  recolorTolerance: 28,
  repairs: [],
  dragStart: null,
  tempRect: null,
};


function syncQuickRepairToggles() {
  const state = window.__quickRepairState || {};
  document.getElementById("quickRepairFillToggle")?.classList.toggle("active", state.fillEnabled !== false);
  document.getElementById("quickRepairStrokeToggle")?.classList.toggle("active", state.strokeEnabled === true);
}

function toggleQuickRepairFill() {
  window.__quickRepairState.fillEnabled = window.__quickRepairState.fillEnabled === false;
  syncQuickRepairToggles();
}

function toggleQuickRepairStroke() {
  window.__quickRepairState.strokeEnabled = window.__quickRepairState.strokeEnabled !== true;
  syncQuickRepairToggles();
}

window.toggleQuickRepairFill = toggleQuickRepairFill;
window.toggleQuickRepairStroke = toggleQuickRepairStroke;


let assetPreviewZoom = 1;

function clampAssetPreviewZoom(value) {
  return Math.max(0.25, Math.min(4, Number(value) || 1));
}

function applyAssetPreviewZoom() {
  const img = document.getElementById("assetPreviewImage");
  const label = document.getElementById("assetPreviewZoomValue");

  if (label) {
    label.textContent = `${Math.round(assetPreviewZoom * 100)}%`;
  }

  if (!img) return;

  const naturalWidth = Number(img.naturalWidth || 0);
  if (!naturalWidth) return;

  img.style.width = `${Math.max(1, Math.round(naturalWidth * assetPreviewZoom))}px`;
  img.style.height = "auto";
}

function setAssetPreviewZoom(value) {
  assetPreviewZoom = clampAssetPreviewZoom(value);
  applyAssetPreviewZoom();
}

function zoomAssetPreview(delta) {
  setAssetPreviewZoom(assetPreviewZoom + Number(delta || 0));
}

function resetAssetPreviewZoom() {
  setAssetPreviewZoom(1);
}

window.zoomAssetPreview = zoomAssetPreview;
window.resetAssetPreviewZoom = resetAssetPreviewZoom;

function renderPreviewGuidance() {
  const box = document.getElementById("assetPreviewGuidance");
  if (!box) return;

  const state = window.__quickRepairState || {};
  const mode = state.mode || "pick";

  let title = uiText("recolor.guidance.quickRepairTitle");
  let body = uiText("recolor.guidance.quickRepairBody");

  if (mode === "rect") {
    title = uiText("recolor.guidance.rectangleTitle");
    body = uiText("recolor.guidance.rectangleBody");
  }

  if (mode === "recolor_source") {
    if (state.recolorSource) {
      title = uiText("recolor.guidance.sourceSelectedTitle");
      body = uiText("recolor.guidance.sourceSelectedBody");
    } else {
      title = uiText("recolor.guidance.sourceStepTitle");
      body = uiText("recolor.guidance.sourceStepBody");
    }
  }

  if (mode === "recolor_target") {
    title = uiText("recolor.guidance.targetStepTitle");
    body = uiText("recolor.guidance.targetStepBody");
  }

  if (mode === "recolor_ready") {
    title = uiText("recolor.guidance.readyTitle");
    body = uiText("recolor.guidance.readyBody");
  }

  box.innerHTML = `<strong>${escapeHtml(title)}</strong><span>${escapeHtml(body)}</span>`;
}

function setPreviewWorkspaceTool(tool) {
  if (tool === "recolor") {
    if (typeof window.hideRecolorV1Ui === "function") {
      window.hideRecolorV1Ui();
    }
    if (typeof log === "function") log("recolor v1 frozen: reserved for AI recolor bridge");
    return;
  }

  setQuickRepairMode("pick");
}


function setRecolorTolerancePreset(value) {
  updateRecolorTolerance(value);
  const input = document.getElementById("recolorToleranceInput");
  if (input) input.value = String(value);
  renderRecolorPanel();
  if (typeof log === "function") log(`recolor tolerance preset: ${value}`);
}

window.setRecolorTolerancePreset = setRecolorTolerancePreset;

function updateRecolorTolerance(value) {
  const n = Math.max(1, Math.min(160, parseInt(value || "28", 10)));
  window.__quickRepairState.recolorTolerance = n;
}

function rgbCss(color) {
  if (!Array.isArray(color) || color.length < 3) return "";
  const a = color.length >= 4 ? Math.round((Number(color[3]) / 255) * 100) / 100 : 1;
  return `rgba(${Number(color[0])}, ${Number(color[1])}, ${Number(color[2])}, ${a})`;
}

function renderRecolorPanel() {
  const state = window.__quickRepairState || {};
  const panel = document.getElementById("assetPreviewRecolorPanel");
  if (!panel) return;

  const sourceChip = document.getElementById("recolorSourceChip");
  const sourceValue = document.getElementById("recolorSourceValue");
  const targetChip = document.getElementById("recolorTargetChip");
  const targetValue = document.getElementById("recolorTargetValue");
  const tol = document.getElementById("recolorToleranceInput");

  if (sourceChip) sourceChip.style.background = state.recolorSource ? rgbCss(state.recolorSource) : "";
  if (sourceValue) sourceValue.textContent = state.recolorSource ? rgbCss(state.recolorSource) : uiText("recolor.label.notSelected");

  if (targetChip) targetChip.style.background = state.recolorTarget ? rgbCss(state.recolorTarget) : "";
  if (targetValue) targetValue.textContent = state.recolorTarget ? rgbCss(state.recolorTarget) : uiText("recolor.label.notSelected");

  if (tol) tol.value = String(state.recolorTolerance || 28);

  const actionBtn = document.getElementById("recolorActionBtn");
  const themeColors = document.getElementById("recolorThemeColors");
  const themePaletteWrap = document.getElementById("recolorThemePaletteWrap");

  if (actionBtn) {
    if (!state.recolorSource) {
      actionBtn.textContent = uiText("recolor.action.selectSourceFirst");
      actionBtn.disabled = true;
    } else if (!state.recolorTarget) {
      actionBtn.textContent = uiText("recolor.action.selectTargetColor");
      actionBtn.disabled = false;
    } else {
      actionBtn.textContent = uiText("recolor.action.apply");
      actionBtn.disabled = false;
    }
  }

  const showThemeColors = state.mode === "recolor_target" || state.mode === "recolor_ready";

  if (themePaletteWrap) {
    themePaletteWrap.hidden = !showThemeColors;
    themePaletteWrap.style.display = showThemeColors ? "grid" : "none";
  }

  if (themeColors) {
    themeColors.style.display = showThemeColors ? "flex" : "none";
  }

  // Hide legacy buttons if old markup still exists.
  document.getElementById("recolorNextBtn")?.setAttribute("hidden", "hidden");
  document.getElementById("recolorApplyBtn")?.setAttribute("hidden", "hidden");

  renderRecolorThemeColors();
}

function getWorkspaceThemeColors() {
  const colors = [];
  try {
    document.querySelectorAll(".aidr-theme-swatches span, .aidr-color-swatch, .theme-color-swatch").forEach(el => {
      const bg = getComputedStyle(el).backgroundColor;
      if (bg && bg !== "rgba(0, 0, 0, 0)" && !colors.includes(bg)) colors.push(bg);
    });
  } catch (e) {}

  if (colors.length) {
    return { colors: colors.slice(0, 12), source: "theme" };
  }

  return {
    colors: [
      "rgb(255, 255, 255)",
      "rgb(17, 24, 39)",
      "rgb(59, 130, 246)",
      "rgb(230, 171, 71)",
      "rgb(107, 114, 128)"
    ],
    source: "fallback"
  };
}


function rgbToHex(color) {
  if (!Array.isArray(color) || color.length < 3) return "";
  const toHex = (v) => {
    const n = Math.max(0, Math.min(255, Math.round(Number(v) || 0)));
    return n.toString(16).padStart(2, "0").toUpperCase();
  };
  return `${toHex(color[0])}${toHex(color[1])}${toHex(color[2])}`;
}

function parseRgbCss(css) {
  const m = String(css || "").match(/rgba?\(([^)]+)\)/);
  if (!m) return [255, 255, 255];
  const parts = m[1].split(",").map(v => Number(String(v).trim()));
  return [
    Math.max(0, Math.min(255, Math.round(parts[0] || 0))),
    Math.max(0, Math.min(255, Math.round(parts[1] || 0))),
    Math.max(0, Math.min(255, Math.round(parts[2] || 0))),
  ];
}

function renderRecolorThemeColors() {
  const el = document.getElementById("recolorThemeColors");
  const note = document.getElementById("recolorThemePaletteNote");
  if (!el) return;

  const result = getWorkspaceThemeColors();
  const colors = result.colors || [];
  const source = result.source || "fallback";
  const target = window.__quickRepairState?.recolorTarget || null;

  if (note) {
    note.textContent =
      source === "theme"
        ? uiText("recolor.palette.currentThemeNote")
        : uiText("recolor.palette.fallbackNote");
  }

  const currentChip = document.getElementById("recolorPaletteCurrentChip");
  const currentHex = document.getElementById("recolorPaletteCurrentHex");

  if (currentChip) {
    currentChip.style.background = target ? rgbCss(target) : "transparent";
  }

  if (currentHex) {
    currentHex.value = target ? rgbToHex(target) : "";
    currentHex.placeholder = uiText("recolor.palette.selectTargetPlaceholder");
  }

  el.innerHTML = colors.map((css) => {
    const rgb = parseRgbCss(css);
    const isSelected =
      target &&
      Number(target[0]) === rgb[0] &&
      Number(target[1]) === rgb[1] &&
      Number(target[2]) === rgb[2];

    return `
      <button
        type="button"
        class="recolor-theme-color-btn ${isSelected ? "is-selected" : ""}"
        style="background:${escapeAttr(css)}"
        title="${escapeAttr(formatUiText("recolor.palette.targetColorTitle", { color: css }))}"
        onclick="selectRecolorTargetColor('${escapeAttr(css)}')"
      ></button>
    `;
  }).join("");
}



function handleRecolorAction() {
  const state = window.__quickRepairState || {};

  if (!state.recolorSource) {
    alert(uiText("assetEdit.sourceColorRequired"));
    return;
  }

  if (!state.recolorTarget) {
    advanceRecolorToTarget();
    return;
  }

  applyRecolorVariant();
}

window.handleRecolorAction = handleRecolorAction;

function advanceRecolorToTarget() {
  const state = window.__quickRepairState || {};

  if (!state.recolorSource) {
    alert(uiText("assetEdit.sourceColorRequired"));
    return;
  }

  state.mode = "recolor_target";
  state.recolorStep = "target";

  const wrap = document.getElementById("assetPreviewCanvasWrap");
  if (wrap) {
    wrap.classList.remove("is-pick-mode");
    wrap.classList.remove("is-rect-mode");
  }

  renderRecolorPanel();
  renderPreviewGuidance();

  if (typeof log === "function") log("recolor step: target color");
}

window.advanceRecolorToTarget = advanceRecolorToTarget;

function selectRecolorTargetColor(css) {
  const rgb = parseRgbCss(css);
  window.__quickRepairState.recolorTarget = rgb;
  window.__quickRepairState.mode = "recolor_ready";
  window.__quickRepairState.recolorStep = "ready";
  renderRecolorPanel();
  renderPreviewGuidance();
  if (typeof log === "function") log(`recolor target selected: ${css}`);
}

window.setPreviewWorkspaceTool = setPreviewWorkspaceTool;
window.updateRecolorTolerance = updateRecolorTolerance;
window.selectRecolorTargetColor = selectRecolorTargetColor;

async function applyRecolorVariant() {
  const state = window.__quickRepairState || {};
  const assetId = state.assetId;

  if (!selectedSlideId || !assetId) {
    alert(uiText("assetEdit.noAssetSelected"));
    return;
  }

  if (!state.recolorSource || !state.recolorTarget) {
    alert(uiText("assetEdit.sourceAndTargetColorRequired"));
    return;
  }

  const ok = window.confirm(uiText("assetEdit.applyRecolorConfirm"));
  if (!ok) return;

  try {
    const data = await fetchJson(`/api/material/${selectedSlideId}/${assetId}/recolor`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        source_rgb: state.recolorSource.slice(0, 3),
        target_rgb: state.recolorTarget.slice(0, 3),
        tolerance: state.recolorTolerance || 28,
        use_in_pptx: false
      }),
    });

    aidrAssetList = data.manifest?.assets || [];
    aidrSelectedAssetId = data.asset?.asset_id || assetId;
    selectedElementKey = `asset:${aidrSelectedAssetId}`;

    if (typeof loadAssetsForSlide === "function") {
      await loadAssetsForSlide(selectedSlideId);
    }

    renderRightAssets();
    renderAssetOverlays();
    renderInspector();

    const target = findAssetById(aidrSelectedAssetId);
    if (target?.url) {
      openAssetPreview(target.url + `?t=${Date.now()}`, target.filename || target.asset_id, target);
      setPreviewWorkspaceTool("recolor");
    }

    log(`material recolor applied: ${data.asset?.filename || data.asset?.asset_id || assetId}`);
  } catch (e) {
    console.warn("Recolor failed:", e);
    alert(formatUiText("assetEdit.recolorFailed", { message: e.message }));
    if (typeof log === "function") log(`ERROR material recolor: ${e.message}`);
  }
}

window.applyRecolorVariant = applyRecolorVariant;

function renderQuickRepairColor() {
  const chip = document.getElementById("quickRepairColorChip");
  const value = document.getElementById("quickRepairColorValue");
  const color = (window.__quickRepairState?.color || [255,255,255,255]).map((v) => Number(v || 0));
  const alpha = color.length >= 4 ? color[3] : 255;
  const alphaRatio = Math.round((alpha / 255) * 100) / 100;
  const css = `rgba(${color[0]}, ${color[1]}, ${color[2]}, ${alphaRatio})`;
  if (chip) chip.style.background = css;
  if (value) value.textContent = css;
}

function renderQuickRepairOverlay() {
  const overlay = document.getElementById("assetPreviewOverlay");
  const img = document.getElementById("assetPreviewImage");
  const wrap = document.getElementById("assetPreviewCanvasWrap");
  if (!overlay || !img || !wrap) return;

  const imgRect = img.getBoundingClientRect();
  const naturalW = img.naturalWidth || 1;
  const naturalH = img.naturalHeight || 1;

  // Align SVG overlay directly to the rendered image in viewport coordinates.
  overlay.style.left = `${imgRect.left}px`;
  overlay.style.top = `${imgRect.top}px`;
  overlay.style.width = `${imgRect.width}px`;
  overlay.style.height = `${imgRect.height}px`;
  overlay.style.display = "block";
  overlay.style.position = "fixed";
  overlay.style.pointerEvents = "none";
  overlay.style.zIndex = "99999";
  overlay.style.overflow = "visible";

  overlay.setAttribute("viewBox", `0 0 ${naturalW} ${naturalH}`);
  overlay.innerHTML = "";

  const allRects = [...(window.__quickRepairState?.repairs || [])];
  if (window.__quickRepairState?.tempRect) allRects.push(window.__quickRepairState.tempRect);

  for (const item of allRects) {
    if (item.shape !== "rectangle") continue;
    const [r, g, b, a = 255] = item.color || [255,255,255,255];
    const alpha = Math.max(0, Math.min(1, a / 255));
    const fillEnabled = item.fill_enabled !== false;
    const strokeEnabled = item.stroke_enabled === true;
    const el = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    el.setAttribute("x", item.x);
    el.setAttribute("y", item.y);
    el.setAttribute("width", item.w);
    el.setAttribute("height", item.h);
    el.setAttribute("fill", fillEnabled ? `rgba(${r},${g},${b},${alpha})` : "none");
    el.setAttribute("stroke", strokeEnabled ? `rgba(${r},${g},${b},${alpha})` : "none");
    el.setAttribute("stroke-width", strokeEnabled ? "1" : "0");
    el.setAttribute("vector-effect", "non-scaling-stroke");
    overlay.appendChild(el);
  }
}

function setQuickRepairMode(mode) {
  window.__quickRepairState.mode = mode;
  window.__quickRepairState.dragStart = null;
  window.__quickRepairState.tempRect = null;

  document.getElementById("quickRepairPickBtn")?.classList.toggle("active", mode === "pick");
  document.getElementById("quickRepairRectBtn")?.classList.toggle("active", mode === "rect");

  const wrap = document.getElementById("assetPreviewCanvasWrap");
  const img = document.getElementById("assetPreviewImage");
  const isPick = ["pick", "recolor_source"].includes(mode);

  if (wrap) {
    wrap.dataset.quickRepairMode = mode;
    wrap.style.cursor = mode === "rect" ? "crosshair" : "copy";
    wrap.classList.toggle("is-pick-mode", isPick);
    wrap.classList.toggle("is-rect-mode", mode === "rect");
  }

  if (img) {
    img.classList.toggle("is-pick-mode", isPick);
    img.classList.toggle("is-rect-mode", mode === "rect");
  }

  const cursor = document.getElementById("quickRepairEyedropperCursor");
  if (cursor) cursor.style.display = "none";

  document.getElementById("quickRepairRecolorBtn")?.classList.remove("active");
  document.getElementById("assetPreviewRecolorPanel")?.setAttribute("hidden", "hidden");

  renderQuickRepairOverlay();
  renderPreviewGuidance();

  if (typeof log === "function") log(`quick repair mode: ${mode}`);
}

function imageEventToNaturalPoint(event) {
  const img = document.getElementById("assetPreviewImage");
  if (!img || !img.naturalWidth || !img.naturalHeight) return null;

  const rect = img.getBoundingClientRect();
  const x = event.clientX - rect.left;
  const y = event.clientY - rect.top;

  if (x < 0 || y < 0 || x > rect.width || y > rect.height) return null;

  const nx = Math.max(
    0,
    Math.min(
      img.naturalWidth - 1,
      Math.floor((x / rect.width) * img.naturalWidth)
    )
  );

  const ny = Math.max(
    0,
    Math.min(
      img.naturalHeight - 1,
      Math.floor((y / rect.height) * img.naturalHeight)
    )
  );

  return { x: nx, y: ny };
}

function pickColorFromPreview(event) {
  const pt = imageEventToNaturalPoint(event);
  const img = document.getElementById("assetPreviewImage");
  if (!pt || !img) return;

  const canvas = document.createElement("canvas");
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(img, 0, 0);
  const data = ctx.getImageData(Math.max(0, pt.x - 1), Math.max(0, pt.y - 1), 1, 1).data;
  if (window.__quickRepairState.mode === "recolor_source") {
    window.__quickRepairState.recolorSource = [data[0], data[1], data[2], data[3]];
    window.__quickRepairState.recolorStep = "source_selected";
    renderRecolorPanel();
    renderPreviewGuidance();
    if (typeof log === "function") log(`recolor source selected: rgba(${data[0]}, ${data[1]}, ${data[2]}, ${Math.round((data[3] / 255) * 100) / 100})`);
    return;
  }

  window.__quickRepairState.color = [data[0], data[1], data[2], data[3]];
  renderQuickRepairColor();
  renderPreviewGuidance();
}

function bindQuickRepairPointerEvents() {
  const img = document.getElementById("assetPreviewImage");
  const wrap = document.getElementById("assetPreviewCanvasWrap");
  if (!img || !wrap || wrap.dataset.quickRepairBound === "1") return;
  wrap.dataset.quickRepairBound = "1";

  wrap.addEventListener("click", (event) => {
    if (!["pick", "recolor_source"].includes(window.__quickRepairState.mode)) return;
    if (event.target?.id !== "assetPreviewImage") return;
    pickColorFromPreview(event);
  });

  wrap.addEventListener("pointerdown", (event) => {
    if (window.__quickRepairState.mode !== "rect") return;

    const pt = imageEventToNaturalPoint(event);
    if (!pt) return;

    event.preventDefault();
    wrap.setPointerCapture?.(event.pointerId);

    window.__quickRepairState.dragStart = pt;
    window.__quickRepairState.tempRect = {
      shape: "rectangle",
      x: pt.x,
      y: pt.y,
      w: 1,
      h: 1,
      color: [...window.__quickRepairState.color],
      fill_enabled: window.__quickRepairState.fillEnabled !== false,
      stroke_enabled: window.__quickRepairState.strokeEnabled === true,
    };

    renderQuickRepairOverlay();
  });

  wrap.addEventListener("pointermove", (event) => {
    if (window.__quickRepairState.mode !== "rect") return;

    const start = window.__quickRepairState.dragStart;
    if (!start) return;

    const pt = imageEventToNaturalPoint(event);
    if (!pt) return;

    let dx = pt.x - start.x;
    let dy = pt.y - start.y;

    if (event.shiftKey) {
      if (Math.abs(dx) >= Math.abs(dy)) dy = 0;
      else dx = 0;
    }

    const x = Math.min(start.x, start.x + dx);
    const y = Math.min(start.y, start.y + dy);
    const w = Math.max(1, Math.abs(dx));
    const h = Math.max(1, Math.abs(dy));

    window.__quickRepairState.tempRect = {
      shape: "rectangle",
      x,
      y,
      w,
      h,
      color: [...window.__quickRepairState.color],
      fill_enabled: window.__quickRepairState.fillEnabled !== false,
      stroke_enabled: window.__quickRepairState.strokeEnabled === true,
    };

    renderQuickRepairOverlay();
  });

  function finalizeQuickRepairRect() {
    const temp = window.__quickRepairState.tempRect;
    if (temp) {
      window.__quickRepairState.repairs.push(temp);
      window.__quickRepairState.tempRect = null;
      renderQuickRepairOverlay();
      if (typeof log === "function") log("quick repair rectangle added");
    }
    window.__quickRepairState.dragStart = null;
  }

  wrap.addEventListener("pointerup", (event) => {
    if (window.__quickRepairState.mode !== "rect") return;
    wrap.releasePointerCapture?.(event.pointerId);
    finalizeQuickRepairRect();
  });

  wrap.addEventListener("pointercancel", () => {
    window.__quickRepairState.dragStart = null;
    window.__quickRepairState.tempRect = null;
    renderQuickRepairOverlay();
  });
}


function resetPreviewWorkspace() {
  const state = window.__quickRepairState || {};

  state.repairs = [];
  state.dragStart = null;
  state.tempRect = null;
  state.recolorSource = null;
  state.recolorTarget = null;
  state.recolorTolerance = 28;
  state.fillEnabled = true;
  state.strokeEnabled = false;

  const recolorActive = document.getElementById("quickRepairRecolorBtn")?.classList.contains("active");

  if (recolorActive) {
    state.mode = "recolor_source";
    state.recolorStep = "source";
    document.getElementById("assetPreviewRecolorPanel")?.removeAttribute("hidden");
    renderRecolorPanel();
    renderPreviewGuidance();
    renderQuickRepairOverlay();
  } else {
    setQuickRepairMode("pick");
  }

  syncQuickRepairToggles();
  renderQuickRepairColor();
  renderQuickRepairOverlay();

  if (typeof log === "function") log("preview workspace reset");
}

window.resetPreviewWorkspace = resetPreviewWorkspace;

async function saveQuickRepair(saveMode) {
  // Quick Repair is non-destructive by policy.
  // Even if "save" is passed from an older UI, always save as variant.
  saveMode = "variant";
  const state = window.__quickRepairState || {};
  if (!state.assetId) {
    console.warn("Quick Repair save failed: no asset selected", {
      quickRepairState: state,
      selectedSlideId,
      aidrSelectedAssetId,
      previewTitle: document.getElementById("assetPreviewTitle")?.textContent || "",
      previewSrc: document.getElementById("assetPreviewImage")?.getAttribute("src") || "",
    });
    alert(uiText("assetEdit.noAssetSelected"));
    return;
  }
  if (!state.repairs?.length) {
    alert(uiText("assetEdit.noQuickRepairRectangles"));
    return;
  }

  const msg = saveMode === "save"
    ? uiText("assetEdit.quickRepairOverwriteConfirm")
    : uiText("assetEdit.quickRepairSaveVariantConfirm");
  if (!window.confirm(msg)) return;

  try {
    const data = await fetchJson(`/api/material/${selectedSlideId}/${state.assetId}/quick-repair`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        save_mode: saveMode,
        repairs: state.repairs,
        use_in_pptx: false,
      }),
    });

    aidrAssetList = data.manifest?.assets || [];
    aidrSelectedAssetId = data.asset?.asset_id || state.assetId;
    selectedElementKey = `asset:${aidrSelectedAssetId}`;

    if (typeof loadAssetsForSlide === "function") {
      await loadAssetsForSlide(selectedSlideId);
    }

    renderRightAssets();
    renderAssetOverlays();
    renderInspector();

    const target = findAssetById(aidrSelectedAssetId);
    if (target?.url) {
      openAssetPreview(target.url + `?t=${Date.now()}`, target.filename || target.asset_id, target);
    }

    log(`material quick repair applied: ${data.asset?.filename || data.asset?.asset_id || state.assetId}`);
  } catch (e) {
    console.warn("Quick Repair failed:", e);
    alert(formatUiText("assetEdit.quickRepairFailed", { message: e.message }));
    if (typeof log === "function") log(`ERROR material quick repair: ${e.message}`);
  }
}

window.openAssetPreview = function openAssetPreview(src, title = "Asset", asset = null) {
  if (!src) return;

  const inferredAssetId = inferAssetIdFromPreview(src, title);
  const resolvedAsset =
    asset ||
    findAssetByFilenameOrUrl(src, title) ||
    (inferredAssetId ? findAssetById(inferredAssetId) : null);

  const modal = ensureAssetPreviewModal();
  const img = document.getElementById("assetPreviewImage");
  const titleEl = document.getElementById("assetPreviewTitle");
  const metaEl = document.getElementById("assetPreviewMeta");

  if (img) img.src = src;
  if (titleEl) titleEl.textContent = resolvedAsset?.asset_id || title || resolvedAsset?.filename || "Asset";

  if (resolvedAsset && metaEl) {
    const kind = resolvedAsset.source_asset_id ? uiText("assetKind.variant") : uiText("assetKind.original");
    const chain = getAssetMaterialChainLabel(resolvedAsset);
    const from = resolvedAsset.source_asset_id ? ` / from: ${resolvedAsset.source_asset_id}` : "";
    const filename = resolvedAsset.filename ? ` / file: ${resolvedAsset.filename}` : "";
    metaEl.textContent = `${kind} / ${chain}${from}${filename}`;
  } else if (metaEl) {
    metaEl.textContent = "";
  }

  window.__quickRepairState.assetId = resolvedAsset?.asset_id || "";
  window.__quickRepairState.repairs = [];
  window.__quickRepairState.dragStart = null;
  window.__quickRepairState.tempRect = null;
  window.__quickRepairState.fillEnabled = true;
  window.__quickRepairState.strokeEnabled = false;
  window.__quickRepairState.recolorStep = "idle";
  window.__quickRepairState.recolorSource = null;
  window.__quickRepairState.recolorTarget = null;
  window.__quickRepairState.recolorTolerance = 28;
  document.getElementById("assetPreviewRecolorPanel")?.setAttribute("hidden", "hidden");
  document.getElementById("quickRepairRecolorBtn")?.classList.remove("active");
  syncQuickRepairToggles();
  renderPreviewGuidance();
  setQuickRepairMode("pick");
  renderQuickRepairColor();

  modal.hidden = false;

  setTimeout(() => {
    renderQuickRepairOverlay();
  }, 10);

  setTimeout(() => {
    if (typeof window.ensureWorkspaceMaterialButtons === "function") {
      window.ensureWorkspaceMaterialButtons();
    }
    if (typeof window.hideRecolorV1Ui === "function") {
      window.hideRecolorV1Ui();
    }
    if (typeof window.scheduleAssetEditStableUi === "function") {
      window.scheduleAssetEditStableUi();
    }
    if (typeof window.syncQuickRepairGrouping === "function") {
      window.syncQuickRepairGrouping();
    }
    if (typeof window.syncWorkspaceNavPanels === "function") {
      window.syncWorkspaceNavPanels();
    }
    if (typeof window.setWorkspaceNavActive === "function") {
      window.setWorkspaceNavActive("quick");
    }
    if (typeof window.updateTextEraserTargetSummary === "function") {
      window.updateTextEraserTargetSummary();
    }

    if (typeof window.resetShowEraseTargetsOff === "function") {
      setTimeout(() => window.resetShowEraseTargetsOff("open-asset-preview"), 120);
    }

    if (typeof window.removeDuplicateTextEraserControls === "function") {
      setTimeout(window.removeDuplicateTextEraserControls, 120);
      setTimeout(window.removeDuplicateTextEraserControls, 360);
    }

    if (typeof window.setWorkspacePrimaryFinalMode === "function") {
      window.setWorkspacePrimaryFinalMode("quick", "open-preview");
    }

    if (typeof window.scheduleFinalPrimarySync === "function") {
      window.scheduleFinalPrimarySync("open-preview");
    } else if (typeof window.syncFinalPrimaryAction === "function") {
      window.syncFinalPrimaryAction("open-preview");
    }
  }, 0);

  if (typeof log === "function") {
    log(`open asset preview: id=${window.__quickRepairState.assetId || "-"} file=${resolvedAsset?.filename || title || "-"} src=${src}`);
  }
};

window.closeAssetPreview = function closeAssetPreview() {
  const modal = document.getElementById("assetPreviewModal");
  const img = document.getElementById("assetPreviewImage");
  if (modal) modal.hidden = true;
  if (img) img.src = "";
};
document.addEventListener("click", (event) => {
    const img = event.target?.closest?.(".aidr-right-asset-thumb");
    if (!img) return;

    event.preventDefault();
    event.stopPropagation();

    const src = img.getAttribute("src") || "";
    const title = img.getAttribute("alt") || "Asset";
    const card = img.closest("[data-asset-id]");
    const assetId = card?.dataset?.assetId || "";
    const asset = assetId ? findAssetById(assetId) : null;

    openAssetPreview(src, title, asset);
  });

  window.setQuickRepairMode = setQuickRepairMode;
  window.saveQuickRepair = saveQuickRepair;
  window.renderQuickRepairOverlay = renderQuickRepairOverlay;

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeAssetPreview();
  });
})();

/* Visual eyedropper cursor follower */
(function () {
  if (window.__AIDR_QUICK_REPAIR_EYEDROPPER_CURSOR_INSTALLED__) return;
  window.__AIDR_QUICK_REPAIR_EYEDROPPER_CURSOR_INSTALLED__ = true;

  function ensureEyedropperCursor() {
    let cursor = document.getElementById("quickRepairEyedropperCursor");
    if (cursor) return cursor;

    cursor = document.createElement("div");
    cursor.id = "quickRepairEyedropperCursor";
    cursor.className = "quick-repair-eyedropper-cursor";
    cursor.innerHTML = `
      <svg viewBox="0 0 48 48" aria-hidden="true">
        <g fill="none" stroke-linecap="round" stroke-linejoin="round">
          <!-- dark underlay -->
          <path d="M17.2 8.4A17 17 0 0 0 8.4 17.2M30.8 8.4A17 17 0 0 1 39.6 17.2M39.6 30.8A17 17 0 0 1 30.8 39.6M17.2 39.6A17 17 0 0 1 8.4 30.8"
            stroke="rgba(0,0,0,0.52)"
            stroke-width="2.5"/>
          <path d="M24 0.5V15M24 33V47.5M0.5 24H15M33 24H47.5"
            stroke="rgba(0,0,0,0.52)"
            stroke-width="2.5"/>

          <!-- light main lines -->
          <path d="M17.2 8.4A17 17 0 0 0 8.4 17.2M30.8 8.4A17 17 0 0 1 39.6 17.2M39.6 30.8A17 17 0 0 1 30.8 39.6M17.2 39.6A17 17 0 0 1 8.4 30.8"
            stroke="rgba(255,255,255,0.96)"
            stroke-width="1.2"/>
          <path d="M24 0.5V15M24 33V47.5M0.5 24H15M33 24H47.5"
            stroke="rgba(255,255,255,0.96)"
            stroke-width="1.2"/>

          <!-- center hollow ring: keeps the sampled pixel visible -->
          <circle cx="24" cy="24" r="2.8"
            stroke="rgba(0,0,0,0.50)"
            stroke-width="2.1"/>
          <circle cx="24" cy="24" r="2.8"
            stroke="rgba(255,255,255,0.98)"
            stroke-width="1.05"/>
        </g>
      </svg>
    `;

    document.body.appendChild(cursor);
    return cursor;
  }

  function isPickModeActive() {
    return ["pick", "recolor_source"].includes(window.__quickRepairState?.mode);
  }

  function isInsidePreviewImage(event) {
    const img = document.getElementById("assetPreviewImage");
    if (!img) return false;

    const rect = img.getBoundingClientRect();
    return (
      event.clientX >= rect.left &&
      event.clientX <= rect.right &&
      event.clientY >= rect.top &&
      event.clientY <= rect.bottom
    );
  }

  function updateEyedropperCursor(event) {
    const cursor = ensureEyedropperCursor();
    const wrap = document.getElementById("assetPreviewCanvasWrap");

    if (!wrap || !isPickModeActive() || !isInsidePreviewImage(event)) {
      cursor.style.display = "none";
      return;
    }

    cursor.style.display = "flex";
    // Center the reticle on the actual sampling point.
    cursor.style.left = `${event.clientX - 24}px`;
    cursor.style.top = `${event.clientY - 24}px`;
  }

  document.addEventListener("pointermove", updateEyedropperCursor, true);

  document.addEventListener("pointerleave", () => {
    const cursor = document.getElementById("quickRepairEyedropperCursor");
    if (cursor) cursor.style.display = "none";
  }, true);

})();

/* Prevent native image drag in Quick Repair preview */
document.addEventListener("dragstart", (event) => {
  if (event.target?.id === "assetPreviewImage") {
    event.preventDefault();
  }
}, true);

/* Recolor v1 hidden; keep as AI recolor bridge */
(function () {
  if (window.__AIDR_RECOLOR_FREEZE_GUARD_INSTALLED__) return;
  window.__AIDR_RECOLOR_FREEZE_GUARD_INSTALLED__ = true;

  function hideRecolorV1Ui() {
    document.getElementById("quickRepairRecolorBtn")?.setAttribute("hidden", "hidden");
    document.getElementById("assetPreviewRecolorPanel")?.setAttribute("hidden", "hidden");

    document.querySelectorAll(".material-tool-btn").forEach((btn) => {
      const label = btn.textContent || "";
      if (label.includes("Recolor") || label.includes("リカラー") || label.includes("再配色")) {
        btn.setAttribute("hidden", "hidden");
        btn.style.display = "none";
      }
    });
  }

  function getWorkspaceAssetId() {
    const state = window.__quickRepairState || {};
    if (state.assetId) return state.assetId;

    if (typeof aidrSelectedAssetId !== "undefined" && aidrSelectedAssetId) {
      return aidrSelectedAssetId;
    }

    if (typeof selectedElementKey !== "undefined" && selectedElementKey?.startsWith?.("asset:")) {
      return selectedElementKey.slice("asset:".length);
    }

    return "";
  }

  async function refreshWorkspaceAfterMaterialApply(data, fallbackAssetId, label) {
    const newAssetId = data?.asset?.asset_id || fallbackAssetId;

    if (data?.manifest?.assets) {
      aidrAssetList = data.manifest.assets;
    }

    if (newAssetId) {
      aidrSelectedAssetId = newAssetId;
      selectedElementKey = `asset:${newAssetId}`;
      if (window.__quickRepairState) {
        window.__quickRepairState.assetId = newAssetId;
      }
    }

    if (typeof loadAssetsForSlide === "function" && typeof selectedSlideId !== "undefined") {
      await loadAssetsForSlide(selectedSlideId);
    }

    if (typeof renderRightAssets === "function") renderRightAssets();
    if (typeof renderAssetOverlays === "function") renderAssetOverlays();
    if (typeof renderInspector === "function") renderInspector();

    const target =
      (typeof findAssetById === "function" ? findAssetById(newAssetId) : null) ||
      (aidrAssetList || []).find((a) => a?.asset_id === newAssetId);

    if (target?.url && typeof openAssetPreview === "function") {
      openAssetPreview(
        target.url + `?t=${Date.now()}`,
        target.filename || target.asset_id || "Asset",
        target
      );
    }

    if (typeof log === "function") {
      log(`${label}: ${data?.asset?.filename || data?.asset?.asset_id || newAssetId}`);
    }
  }

  async function applyWorkspaceTextEraser() {
    const assetId = getWorkspaceAssetId();

    if (!assetId || typeof selectedSlideId === "undefined" || !selectedSlideId) {
      alert(uiText("assetEdit.textEraserAcceptedAssetRequired"));
      return;
    }

    try {
      const data = await fetchJson(`/api/material/${selectedSlideId}/${assetId}/text-eraser`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          use_in_pptx: false,
          apply_background: !!document.getElementById("fillOpacityBackgroundTarget")?.checked,
          apply_fill: !!document.getElementById("fillOpacityFillTarget")?.checked,
          opacity_percent: Number(document.querySelector("#assetPreviewFillOpacityPanel .asset-preview-opacity-preset.is-active")?.dataset.opacity || window.__aidrFillOpacityPercent || 35),
        }),
      });

      await refreshWorkspaceAfterMaterialApply(data, assetId, "workspace text eraser applied");
    } catch (e) {
      console.warn("Workspace Text Eraser failed:", e);
      alert(formatUiText("assetEdit.textEraserFailed", { message: e.message }));
      if (typeof log === "function") log(`ERROR workspace text eraser: ${e.message}`);
    } finally {
      setTimeout(() => {
        if (typeof window.setWorkspaceNavActive === "function") {
          window.setWorkspaceNavActive("text");
        }
      }, 80);
    }
  }

  async function applyWorkspaceFillOpacity() {
    const assetId = getWorkspaceAssetId();

    if (!assetId || typeof selectedSlideId === "undefined" || !selectedSlideId) {
      alert(uiText("assetEdit.fillOpacityAcceptedAssetRequired"));
      return;
    }

    try {
      const applyBackground = !!document.getElementById("fillOpacityBackgroundTarget")?.checked;
      const applyFill = !!document.getElementById("fillOpacityFillTarget")?.checked;

      if (!applyBackground && !applyFill) {
        alert(uiText("assetEdit.fillOpacityTargetRequired"));
        return;
      }

      const data = await fetchJson(`/api/material/${selectedSlideId}/${assetId}/fill-opacity`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ use_in_pptx: false }),
      });

      await refreshWorkspaceAfterMaterialApply(data, assetId, "workspace fill opacity applied");
    } catch (e) {
      console.warn("Workspace Fill Opacity failed:", e);
      alert(formatUiText("assetEdit.fillOpacityFailed", { message: e.message }));
      if (typeof log === "function") log(`ERROR workspace fill opacity: ${e.message}`);
    }
  }

  function ensureWorkspaceMaterialButtons() {
    const pickBtn = document.getElementById("quickRepairPickBtn");
    if (!pickBtn) return;

    if (!document.getElementById("workspaceTextEraserBtn")) {
      const btn = document.createElement("button");
      btn.id = "workspaceTextEraserBtn";
      btn.className = "asset-preview-tool-btn aidr-workspace-material-btn";
      btn.type = "button";
      btn.textContent = uiText("materialOp.textEraser");
      btn.onclick = applyWorkspaceTextEraser;
      pickBtn.parentNode.insertBefore(btn, pickBtn);
    }

    if (!document.getElementById("workspaceFillOpacityBtn")) {
      const btn = document.createElement("button");
      btn.id = "workspaceFillOpacityBtn";
      btn.className = "asset-preview-tool-btn aidr-workspace-material-btn";
      btn.type = "button";
      btn.textContent = uiText("materialOp.fillOpacity");
      btn.onclick = applyWorkspaceFillOpacity;
      pickBtn.parentNode.insertBefore(btn, pickBtn);
    }

    hideRecolorV1Ui();
  }

  window.hideRecolorV1Ui = hideRecolorV1Ui;
  window.applyWorkspaceTextEraser = applyWorkspaceTextEraser;
  window.applyWorkspaceFillOpacity = applyWorkspaceFillOpacity;
  window.ensureWorkspaceMaterialButtons = ensureWorkspaceMaterialButtons;

  document.addEventListener("DOMContentLoaded", () => {
    hideRecolorV1Ui();
    ensureWorkspaceMaterialButtons();
  });

  const observer = new MutationObserver(() => {
    hideRecolorV1Ui();
    ensureWorkspaceMaterialButtons();
  });

  observer.observe(document.body, { childList: true, subtree: true });
})();












/* Stable Assist Menu and Asset Edit entry without mutation loop */
(function () {
  if (window.__AIDR_ASSET_EDIT_STABLE_INSTALLED__) return;
  window.__AIDR_ASSET_EDIT_STABLE_INSTALLED__ = true;

  function getAssetListLocal() {
    if (typeof aidrAssetList !== "undefined" && Array.isArray(aidrAssetList)) return aidrAssetList;
    if (Array.isArray(window.aidrAssets)) return window.aidrAssets;
    return [];
  }

  function getCurrentAssetEditTarget() {
    if (typeof selectedElementKey !== "undefined" && selectedElementKey) {
      if (selectedElementKey.startsWith("asset:")) {
        return { kind: "asset", id: selectedElementKey.slice("asset:".length) };
      }
      if (selectedElementKey.startsWith("candidate:")) {
        return { kind: "candidate", id: selectedElementKey.slice("candidate:".length) };
      }
    }

    const state = window.__quickRepairState || {};
    if (state.assetId) return { kind: "asset", id: state.assetId };

    if (typeof aidrSelectedAssetId !== "undefined" && aidrSelectedAssetId) {
      return { kind: "asset", id: aidrSelectedAssetId };
    }

    return { kind: "", id: "" };
  }

  function findAssetLocal(assetId) {
    if (!assetId) return null;
    if (typeof findAssetById === "function") {
      const found = findAssetById(assetId);
      if (found) return found;
    }
    return getAssetListLocal().find((a) => a?.asset_id === assetId) || null;
  }

  function openAssetEditModalStable() {
    const target = getCurrentAssetEditTarget();

    if (!target.kind || !target.id) {
      alert(uiText("assetEdit.selectAssetOrCandidate"));
      return;
    }

    if (typeof openMaterialSettings === "function") {
      openMaterialSettings(target.kind, target.id);
      if (typeof log === "function") log(`open asset edit modal: ${target.kind}:${target.id}`);
      return;
    }

    alert(uiText("assetEdit.modalOpenFailed"));
  }

  async function deleteAssetStable(assetId) {
    if (!selectedSlideId || !assetId) return;

    const res = await fetchJson(`/api/assets/${selectedSlideId}/${assetId}`, {
      method: "DELETE",
    });

    if (typeof loadAssetsForSlide === "function") {
      await loadAssetsForSlide(selectedSlideId);
    } else if (res?.manifest?.assets && typeof aidrAssetList !== "undefined") {
      aidrAssetList = res.manifest.assets;
    }
  }

  async function openAssetPreviewStable(assetId) {
    const asset = findAssetLocal(assetId);

    if (!asset || !asset.url) {
      alert(uiText("assetEdit.assetPreviewUrlNotFound"));
      return;
    }

    if (typeof aidrSelectedAssetId !== "undefined") aidrSelectedAssetId = asset.asset_id;
    if (typeof selectedElementKey !== "undefined") selectedElementKey = `asset:${asset.asset_id}`;
    if (window.__quickRepairState) window.__quickRepairState.assetId = asset.asset_id;

    if (typeof renderRightAssets === "function") renderRightAssets();
    if (typeof renderAssetOverlays === "function") renderAssetOverlays();
    if (typeof renderInspector === "function") renderInspector();

    if (typeof openAssetPreview === "function") {
      openAssetPreview(
        asset.url + `?t=${Date.now()}`,
        asset.filename || asset.asset_id || "Asset",
        asset
      );
    }
  }

  async function returnToSourceAssetStable() {
    const target = getCurrentAssetEditTarget();
    const current = target.kind === "asset" ? findAssetLocal(target.id) : null;

    if (!current) {
      alert(uiText("assetEdit.currentAssetNotFound"));
      return;
    }

    const sourceId = current.source_asset_id;

    if (!sourceId) {
      alert(uiText("assetEdit.alreadySourceAsset"));
      return;
    }

    const goBack = window.confirm(uiText("assetEdit.returnToSourceConfirm"));
    if (!goBack) return;

    const deleteVariant = window.confirm(uiText("assetEdit.deleteVariantBeforeReturnConfirm"));

    if (deleteVariant) {
      try {
        await deleteAssetStable(current.asset_id);
        if (typeof log === "function") log(`deleted variant before returning source: ${current.asset_id}`);
      } catch (e) {
        alert(formatUiText("assetEdit.variantDeleteFailed", { message: e.message }));
        return;
      }
    }

    await openAssetPreviewStable(sourceId);

    if (typeof log === "function") log(`return to source asset: ${sourceId}`);
  }

  function normalizeAssistMenuStable() {
    const buttons = Array.from(document.querySelectorAll(".aidr-assist-menu-btn"));

    buttons.forEach((btn) => {
      const label = (btn.textContent || "").trim();
      const onclick = btn.getAttribute("onclick") || "";

      if (label === "Style Settings" || label === "Style") {
        btn.textContent = "Text Settings";
      }

      if (
        label === "AI Assist" ||
        label === "Fit" ||
        onclick.includes("setAssistMode('ai')") ||
        onclick.includes('setAssistMode("ai")') ||
        onclick.includes("setAssistMode('fit')") ||
        onclick.includes('setAssistMode("fit")')
      ) {
        if (!btn.hidden) btn.hidden = true;
        if (btn.style.display !== "none") btn.style.display = "none";
      }
    });

    const menu =
      document.querySelector(".aidr-assist-menu-actions") ||
      document.querySelector(".aidr-assist-menu-grid") ||
      document.querySelector(".aidr-assist-menu-buttons");

    if (!menu) return;

    const assetButton = buttons.find((btn) => {
      const onclick = btn.getAttribute("onclick") || "";
      return (
        btn.dataset.i18n === "assist.assetEdit" ||
        onclick.includes("setAssistMode('asset')") ||
        onclick.includes('setAssistMode("asset")')
      );
    });

    if (assetButton) {
      assetButton.textContent = uiText("assist.assetEdit");
      return;
    }

    if (!document.getElementById("assistAssetEditBtn")) {
      const btn = document.createElement("button");
      btn.id = "assistAssetEditBtn";
      btn.className = "aidr-assist-menu-btn";
      btn.type = "button";
      btn.textContent = uiText("assist.assetEdit");
      btn.onclick = () => {
        if (typeof setAssistMode === "function") setAssistMode("asset");
        openAssetEditModalStable();
      };
      menu.appendChild(btn);
    }
  }
  function hideDeprecatedControlsStable(root = document) {
    root.querySelectorAll("button").forEach((btn) => {
      const text = (btn.textContent || "").trim();
      const onclick = btn.getAttribute("onclick") || "";

      if (
        text === "Recolor" ||
        text.includes("リカラー") ||
        onclick.includes("setPreviewWorkspaceTool('recolor')") ||
        onclick.includes('setPreviewWorkspaceTool("recolor")') ||
        text === "Reset" ||
        text === "Clear Settings" ||
        onclick.includes("resetPreviewWorkspace")
      ) {
        if (!btn.hidden) btn.hidden = true;
        if (btn.style.display !== "none") btn.style.display = "none";
      }
    });

    document.getElementById("quickRepairRecolorBtn")?.setAttribute("hidden", "hidden");
    document.getElementById("assetPreviewRecolorPanel")?.setAttribute("hidden", "hidden");
  }

  function ensureReturnToSourceButtonStable() {
    const toolbar = document.querySelector(".asset-preview-toolbar");
    if (!toolbar) return;

    if (document.getElementById("returnToSourceAssetBtn")) return;

    const btn = document.createElement("button");
    btn.id = "returnToSourceAssetBtn";
    btn.className = "asset-preview-save-btn secondary";
    btn.type = "button";
    btn.textContent = uiText("assetEdit.returnToSourceButton");
    btn.onclick = returnToSourceAssetStable;

    const spacer = toolbar.querySelector(".asset-preview-tool-spacer");
    if (spacer) toolbar.insertBefore(btn, spacer.nextSibling);
    else toolbar.appendChild(btn);
  }

  function updateBottomNoteStable() {
    const note = document.querySelector(".asset-preview-repair-note");
    if (!note) return;

    const text = uiText("assetEdit.nonDestructiveNote");

    if (note.textContent !== text) note.textContent = text;
  }

  function applyStableUiOnce() {
    normalizeAssistMenuStable();
    hideDeprecatedControlsStable();
    ensureReturnToSourceButtonStable();
    updateBottomNoteStable();
  }

  function scheduleApplyStableUiOnce() {
    setTimeout(applyStableUiOnce, 0);
  }

  window.applyAssetEditStableUi = applyStableUiOnce;
  window.scheduleAssetEditStableUi = scheduleApplyStableUiOnce;

  window.returnToSourceAsset = returnToSourceAssetStable;
  window.openSelectedAssetEditModal = openAssetEditModalStable;

  document.addEventListener("DOMContentLoaded", applyStableUiOnce);
  setTimeout(applyStableUiOnce, 0);
})();

/* Route right-pane Asset Edit to the Assist modal Asset tab */
(function () {
  if (window.__AIDR_ASSET_EDIT_ASSIST_ROUTE_INSTALLED__) return;
  window.__AIDR_ASSET_EDIT_ASSIST_ROUTE_INSTALLED__ = true;

  function openAssistAssetEditTabOnly() {
    if (typeof window.openAssistSettings === "function") {
      window.openAssistSettings("asset");
      return;
    }

    if (typeof openAssistSettings === "function") {
      openAssistSettings("asset");
      return;
    }

    if (typeof setAssistMode === "function") {
      setAssistMode("asset");
      return;
    }

    if (typeof log === "function") {
      log("Asset Edit tab route failed: openAssistSettings is not available");
    }
  }

  function retargetRightPaneAssetEditButton() {
    const btn = document.getElementById("assistAssetEditBtn");
    if (!btn) return;

    btn.onclick = (event) => {
      event?.preventDefault?.();
      event?.stopPropagation?.();
      openAssistAssetEditTabOnly();
    };

    btn.title = uiText("assetEdit.openHelpTitle");
  }

  // Capture phase keeps legacy inline handlers from bypassing the Assist tab route.
  document.addEventListener("click", (event) => {
    const btn = event.target?.closest?.("#assistAssetEditBtn");
    if (!btn) return;

    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();

    openAssistAssetEditTabOnly();
  }, true);

  document.addEventListener("DOMContentLoaded", () => {
    retargetRightPaneAssetEditButton();
    setTimeout(retargetRightPaneAssetEditButton, 0);
    setTimeout(retargetRightPaneAssetEditButton, 120);
  });

  // Limited retries because the right pane may be rebuilt after slide/asset selection.
  let retries = 30;
  const timer = setInterval(() => {
    retargetRightPaneAssetEditButton();
    retries -= 1;
    if (retries <= 0) clearInterval(timer);
  }, 250);

  window.openAssistAssetEditTabOnly = openAssistAssetEditTabOnly;
})();

/* Route Asset Edit asset targets to Preview Workspace */
(function () {
  if (window.__AIDR_ASSET_EDIT_WORKSPACE_ROUTE_INSTALLED__) return;
  window.__AIDR_ASSET_EDIT_WORKSPACE_ROUTE_INSTALLED__ = true;

  function getAssetEditTarget() {
    if (typeof selectedElementKey !== "undefined" && selectedElementKey) {
      if (selectedElementKey.startsWith("asset:")) {
        return { kind: "asset", id: selectedElementKey.slice("asset:".length) };
      }
      if (selectedElementKey.startsWith("candidate:")) {
        return { kind: "candidate", id: selectedElementKey.slice("candidate:".length) };
      }
    }

    const state = window.__quickRepairState || {};
    if (state.assetId) return { kind: "asset", id: state.assetId };

    if (typeof aidrSelectedAssetId !== "undefined" && aidrSelectedAssetId) {
      return { kind: "asset", id: aidrSelectedAssetId };
    }

    return { kind: "", id: "" };
  }

  function getAssetByIdForWorkspace(assetId) {
    if (!assetId) return null;

    if (typeof findAssetById === "function") {
      const found = findAssetById(assetId);
      if (found) return found;
    }

    if (typeof aidrAssetList !== "undefined" && Array.isArray(aidrAssetList)) {
      return aidrAssetList.find((a) => a?.asset_id === assetId) || null;
    }

    if (Array.isArray(window.aidrAssets)) {
      return window.aidrAssets.find((a) => a?.asset_id === assetId) || null;
    }

    return null;
  }

  function openAssetPreviewWorkspaceById(assetId) {
    const asset = getAssetByIdForWorkspace(assetId);

    if (!asset || !asset.url) {
      alert(uiText("assetEdit.assetPreviewUrlNotFound"));
      return false;
    }

    if (typeof aidrSelectedAssetId !== "undefined") {
      aidrSelectedAssetId = asset.asset_id;
    }

    if (typeof selectedElementKey !== "undefined") {
      selectedElementKey = `asset:${asset.asset_id}`;
    }

    if (window.__quickRepairState) {
      window.__quickRepairState.assetId = asset.asset_id;
    }

    if (typeof renderRightAssets === "function") renderRightAssets();
    if (typeof renderAssetOverlays === "function") renderAssetOverlays();
    if (typeof renderInspector === "function") renderInspector();

    if (typeof openAssetPreview === "function") {
      openAssetPreview(
        asset.url + `?t=${Date.now()}`,
        asset.filename || asset.asset_id || "Asset",
        asset
      );

      if (typeof log === "function") {
        log(`open asset edit workspace: ${asset.asset_id}`);
      }

      return true;
    }

    return false;
  }

  function openSelectedAssetEditWorkspace() {
    const target = getAssetEditTarget();

    if (!target.kind || !target.id) {
      alert(uiText("assetEdit.selectAssetOrCandidate"));
      return;
    }

    if (target.kind === "asset") {
      openAssetPreviewWorkspaceById(target.id);
      return;
    }

    // Candidate targets still use the material settings modal.
    if (typeof openMaterialSettings === "function") {
      openMaterialSettings(target.kind, target.id);
    }
  }

  window.openSelectedAssetEditModal = openSelectedAssetEditWorkspace;
  window.openSelectedAssetEditWorkspace = openSelectedAssetEditWorkspace;
  window.openAssetPreviewWorkspaceById = openAssetPreviewWorkspaceById;
})();

/* Group Quick Repair controls under Quick Repair section */
(function () {
  if (window.__AIDR_QUICK_REPAIR_GROUPING_INSTALLED__) return;
  window.__AIDR_QUICK_REPAIR_GROUPING_INSTALLED__ = true;

  function ensureQuickRepairGrouping() {
    const modal = document.getElementById("assetPreviewModal");
    const toolbar = document.querySelector(".asset-preview-toolbar");
    const guidance = document.getElementById("assetPreviewGuidance");

    if (!modal || !toolbar || !guidance) return;

    const pickBtn = document.getElementById("quickRepairPickBtn");
    const rectBtn = document.getElementById("quickRepairRectBtn");
    const colorWrap = toolbar.querySelector(".asset-preview-color-chip-wrap");
    const toggleGroup = toolbar.querySelector(".asset-preview-toggle-group");

    if (!pickBtn || !rectBtn) return;

    let quickTab = document.getElementById("assetPreviewQuickRepairTabBtn");
    if (!quickTab) {
      quickTab = document.createElement("button");
      quickTab.id = "assetPreviewQuickRepairTabBtn";
      quickTab.className = "asset-preview-tool-btn aidr-workspace-mode-btn is-active";
      quickTab.type = "button";
      quickTab.textContent = uiText("materialOp.quickRepair");
      quickTab.onclick = () => showQuickRepairSection(true);

      const fillOpacityBtn = document.getElementById("workspaceFillOpacityBtn");
      if (fillOpacityBtn && fillOpacityBtn.parentNode === toolbar) {
        fillOpacityBtn.insertAdjacentElement("afterend", quickTab);
      } else {
        toolbar.insertBefore(quickTab, pickBtn);
      }
    }

    let panel = document.getElementById("assetPreviewQuickRepairPanel");
    if (!panel) {
      panel = document.createElement("div");
      panel.id = "assetPreviewQuickRepairPanel";
      panel.className = "asset-preview-tool-panel quick-repair-panel";

      panel.innerHTML = `
        <div class="asset-preview-tool-panel-head">
          <strong>${escapeHtml(uiText("materialOp.quickRepair"))}</strong>
          <span>${escapeHtml(uiText("assetEdit.quickRepairDescription"))}</span>
        </div>
        <div class="asset-preview-tool-panel-controls" id="assetPreviewQuickRepairControls"></div>
      `;

      guidance.insertAdjacentElement("afterend", panel);
    }

    const controls = document.getElementById("assetPreviewQuickRepairControls");
    if (!controls) return;

    [pickBtn, rectBtn, colorWrap, toggleGroup].forEach((el) => {
      if (el && el.parentElement !== controls) {
        controls.appendChild(el);
      }
    });

    pickBtn.classList.add("aidr-quick-control");
    rectBtn.classList.add("aidr-quick-control");

    showQuickRepairSection(true);
  }

  function showQuickRepairSection(show) {
    const panel = document.getElementById("assetPreviewQuickRepairPanel");
    const tab = document.getElementById("assetPreviewQuickRepairTabBtn");

    if (panel) {
      panel.hidden = !show;
      panel.style.display = show ? "grid" : "none";
    }

    if (tab) {
      tab.classList.toggle("is-active", !!show);
      tab.classList.toggle("active", !!show);
    }

    if (show && typeof setQuickRepairMode === "function") {
      const quickMode = window.__quickRepairState?.mode;
      const isDrawingRect =
        !!window.__quickRepairState?.dragStart || !!window.__quickRepairState?.tempRect;

      if (!isDrawingRect && !["pick", "rect", "recolor_source"].includes(quickMode)) {
        setQuickRepairMode("pick");
      }
    }
  }

  function hookWorkspaceModeButtons() {
    const textBtn = document.getElementById("workspaceTextEraserBtn");
    const fillBtn = document.getElementById("workspaceFillOpacityBtn");

    [textBtn, fillBtn].forEach((btn) => {
      if (!btn || btn.__aidrQuickRepairHooked) return;
      btn.__aidrQuickRepairHooked = true;

      btn.addEventListener("click", () => {
        const panel = document.getElementById("assetPreviewQuickRepairPanel");
        const tab = document.getElementById("assetPreviewQuickRepairTabBtn");

        if (panel) {
          panel.hidden = true;
          panel.style.display = "none";
        }

        if (tab) {
          tab.classList.remove("is-active", "active");
        }
      }, true);
    });
  }

  function syncQuickRepairGrouping() {
    ensureQuickRepairGrouping();
    hookWorkspaceModeButtons();
  }

  document.addEventListener("DOMContentLoaded", () => {
    setTimeout(syncQuickRepairGrouping, 0);
  });

  window.ensureQuickRepairGrouping = ensureQuickRepairGrouping;
  window.showQuickRepairSection = showQuickRepairSection;
  window.syncQuickRepairGrouping = syncQuickRepairGrouping;
})();

/* Return to root source asset, not only immediate parent */
(function () {
  if (window.__AIDR_RETURN_TO_ROOT_SOURCE_ASSET_INSTALLED__) return;
  window.__AIDR_RETURN_TO_ROOT_SOURCE_ASSET_INSTALLED__ = true;

  function getAssetListForRootSource() {
    if (typeof aidrAssetList !== "undefined" && Array.isArray(aidrAssetList)) return aidrAssetList;
    if (Array.isArray(window.aidrAssets)) return window.aidrAssets;
    return [];
  }

  function findAssetForRootSource(assetId) {
    if (!assetId) return null;

    if (typeof findAssetById === "function") {
      const found = findAssetById(assetId);
      if (found) return found;
    }

    return getAssetListForRootSource().find((a) => a?.asset_id === assetId) || null;
  }

  function findRootSourceAssetId(assetId) {
    const seen = new Set();
    let currentId = assetId;
    let current = findAssetForRootSource(currentId);

    while (current && current.source_asset_id && !seen.has(current.source_asset_id)) {
      seen.add(currentId);
      currentId = current.source_asset_id;
      current = findAssetForRootSource(currentId);
    }

    return currentId;
  }

  async function deleteCurrentVariantForRootSource(assetId) {
    if (!selectedSlideId || !assetId) return;

    const res = await fetchJson(`/api/assets/${selectedSlideId}/${assetId}`, {
      method: "DELETE",
    });

    if (typeof loadAssetsForSlide === "function") {
      await loadAssetsForSlide(selectedSlideId);
    } else if (res?.manifest?.assets && typeof aidrAssetList !== "undefined") {
      aidrAssetList = res.manifest.assets;
    }
  }

  async function openRootSourceAsset(assetId) {
    const rootId = findRootSourceAssetId(assetId);
    const root = findAssetForRootSource(rootId);

    if (!root || !root.url) {
      alert(uiText("assetEdit.rootSourceAssetNotFound"));
      return;
    }

    if (typeof aidrSelectedAssetId !== "undefined") {
      aidrSelectedAssetId = root.asset_id;
    }

    if (typeof selectedElementKey !== "undefined") {
      selectedElementKey = `asset:${root.asset_id}`;
    }

    if (window.__quickRepairState) {
      window.__quickRepairState.assetId = root.asset_id;
    }

    if (typeof renderRightAssets === "function") renderRightAssets();
    if (typeof renderAssetOverlays === "function") renderAssetOverlays();
    if (typeof renderInspector === "function") renderInspector();

    if (typeof openAssetPreview === "function") {
      openAssetPreview(
        root.url + `?t=${Date.now()}`,
        root.filename || root.asset_id || "Asset",
        root
      );
    }

    if (typeof log === "function") {
      log(`return to root source asset: ${root.asset_id}`);
    }
  }

  async function returnToRootSourceAsset() {
    const state = window.__quickRepairState || {};
    let currentId = state.assetId || "";

    if (!currentId && typeof selectedElementKey !== "undefined" && selectedElementKey?.startsWith?.("asset:")) {
      currentId = selectedElementKey.slice("asset:".length);
    }

    if (!currentId && typeof aidrSelectedAssetId !== "undefined") {
      currentId = aidrSelectedAssetId;
    }

    const current = findAssetForRootSource(currentId);

    if (!current) {
      alert(uiText("assetEdit.currentAssetNotFound"));
      return;
    }

    if (!current.source_asset_id) {
      alert(uiText("assetEdit.alreadySourceAsset"));
      return;
    }

    const rootId = findRootSourceAssetId(current.asset_id);

    const goBack = window.confirm(formatUiText("assetEdit.returnToRootSourceConfirm", { rootId }));

    if (!goBack) return;

    const deleteVariant = window.confirm(uiText("assetEdit.deleteVariantBeforeReturnConfirm"));

    if (deleteVariant) {
      try {
        await deleteCurrentVariantForRootSource(current.asset_id);
        if (typeof log === "function") {
          log(`deleted variant before returning root source: ${current.asset_id}`);
        }
      } catch (e) {
        alert(formatUiText("assetEdit.variantDeleteFailed", { message: e.message }));
        return;
      }
    }

    await openRootSourceAsset(rootId);
  }

  window.returnToSourceAsset = returnToRootSourceAsset;
})();

/* Workspace nav panels before destructive or variant actions */
(function () {
  if (window.__AIDR_WORKSPACE_NAV_PANELS_INSTALLED__) return;
  window.__AIDR_WORKSPACE_NAV_PANELS_INSTALLED__ = true;

  function getWorkspacePanelMount() {
    const quickPanel = document.getElementById("assetPreviewQuickRepairPanel");
    if (quickPanel) return quickPanel.parentElement;

    const guidance = document.getElementById("assetPreviewGuidance");
    return guidance ? guidance.parentElement : null;
  }

  function ensureWorkspacePanels() {
    const mount = getWorkspacePanelMount();
    const guidance = document.getElementById("assetPreviewGuidance");
    if (!mount || !guidance) return;

    let textPanel = document.getElementById("assetPreviewTextEraserPanel");
    if (!textPanel) {
      textPanel = document.createElement("div");
      textPanel.id = "assetPreviewTextEraserPanel";
      textPanel.className = "asset-preview-tool-panel asset-preview-text-eraser-panel";
      textPanel.hidden = true;
      textPanel.innerHTML = `
        <div class="asset-preview-tool-panel-head">
          <strong>${escapeHtml(uiText("materialOp.textEraser"))}</strong>
          <span>
            OCRで検出された文字領域をまとめて消します。
            実行すると新しいバリアントが生成され、以後の作業対象はそのバリアントに移ります。
          </span>
        </div>
        <div class="text-eraser-target-summary" id="textEraserTargetSummary">
          <strong>消去対象</strong>
          <span id="textEraserTargetStatus">確認中...</span>
        </div>

        <label class="text-eraser-target-toggle">
          <input type="checkbox" id="showTextEraserTargetsToggle">
          <span>${escapeHtml(uiText("status.textEraserShowTargets"))}</span>
        </label>

        <div class="asset-preview-panel-note">
          ${escapeHtml(uiText("status.textEraserPanelNote"))}
        </div>

        <div class="asset-preview-panel-actions">
          <button type="button" class="asset-preview-save-btn" id="applyWorkspaceTextEraserBtn">
            ${escapeHtml(uiText("status.applyTextEraser"))}
          </button>
        </div>
      `;
      guidance.insertAdjacentElement("afterend", textPanel);
    }

    let opacityPanel = document.getElementById("assetPreviewFillOpacityPanel");
    if (!opacityPanel) {
      opacityPanel = document.createElement("div");
      opacityPanel.id = "assetPreviewFillOpacityPanel";
      opacityPanel.className = "asset-preview-tool-panel asset-preview-fill-opacity-panel";
      opacityPanel.hidden = true;
      opacityPanel.innerHTML = `
        <div class="asset-preview-tool-panel-head">
          <strong>${escapeHtml(uiText("materialOp.fillOpacity"))}</strong>
          <span>
            背景と塗り面の透過バリアントを生成します。
            透過後は補修しづらいため、必要な文字消し・クイック補修を先に行ってください。
          </span>
        </div>

        <div class="asset-preview-opacity-targets">
          <label class="asset-preview-opacity-target">
            <input type="checkbox" id="fillOpacityBackgroundTarget" checked>
            <span>
              <strong>背景</strong>
              <small>画像外側・余白・透明背景まわりを処理します。</small>
            </span>
          </label>

          <label class="asset-preview-opacity-target">
            <input type="checkbox" id="fillOpacityFillTarget" checked>
            <span>
              <strong>塗り</strong>
              <small>カード背景面・ラベル背景面などの塗り面を処理します。</small>
            </span>
          </label>
        </div>

        <div class="asset-preview-opacity-presets">
          <button type="button" class="asset-preview-opacity-preset" data-opacity="0">0%</button>
          <button type="button" class="asset-preview-opacity-preset" data-opacity="15">15%</button>
          <button type="button" class="asset-preview-opacity-preset is-active" data-opacity="35">35%</button>
          <button type="button" class="asset-preview-opacity-preset" data-opacity="50">50%</button>
          <button type="button" class="asset-preview-opacity-preset" data-opacity="70">70%</button>
        </div>

        <div class="asset-preview-panel-note">
          背景 / 塗り のどちらか一方だけでも実行できます。
          0% は完全透明、15% はかなり薄い透過です。どちらもOFFの場合は適用できません。
        </div>

        <div class="asset-preview-panel-actions">
          <button type="button" class="asset-preview-save-btn" id="applyWorkspaceFillOpacityBtn">
            透過処理を適用
          </button>
        </div>
      `;
      guidance.insertAdjacentElement("afterend", opacityPanel);
    }

    const applyText = document.getElementById("applyWorkspaceTextEraserBtn");
    if (applyText && !applyText.__aidrWorkspaceControlBound) {
      applyText.__aidrWorkspaceControlBound = true;
      applyText.onclick = () => {
        if (typeof window.applyWorkspaceTextEraser === "function") {
          window.applyWorkspaceTextEraser();
        }
      };
    }

    const applyOpacity = document.getElementById("applyWorkspaceFillOpacityBtn");
    if (applyOpacity && !applyOpacity.__aidrWorkspaceControlBound) {
      applyOpacity.__aidrWorkspaceControlBound = true;
      applyOpacity.onclick = () => {
        if (typeof window.applyWorkspaceFillOpacity === "function") {
          window.applyWorkspaceFillOpacity();
        }
      };
    }

    document.querySelectorAll(".asset-preview-opacity-preset").forEach((btn) => {
      if (btn.__aidrWorkspaceControlBound) return;
      btn.__aidrWorkspaceControlBound = true;
      btn.onclick = () => {
        document.querySelectorAll(".asset-preview-opacity-preset").forEach((b) => {
          b.classList.remove("is-active");
        });
        btn.classList.add("is-active");

        if (typeof log === "function") {
          log(`fill opacity preset selected: ${btn.dataset.opacity}%`);
        }
      };
    });
  }

  function setWorkspaceNavActive(mode) {
    if (mode === "text" || mode === "opacity" || mode === "quick") {
      window.__aidrWorkspaceModeState = mode;
      window.__aidrWorkspacePrimaryMode = mode;

      setTimeout(() => {
        if (typeof window.syncFinalPrimaryAction === "function") {
          window.syncFinalPrimaryAction(`workspace-nav-${mode}`);
        }
      }, 0);

      setTimeout(() => {
        if (typeof window.syncFinalPrimaryAction === "function") {
          window.syncFinalPrimaryAction(`workspace-nav-${mode}`);
        }
      }, 120);

      if (typeof log === "function") {
        log(`final primary mode from workspace nav: ${mode}`);
      }
    }
    ensureWorkspacePanels();

    const textPanel = document.getElementById("assetPreviewTextEraserPanel");
    const opacityPanel = document.getElementById("assetPreviewFillOpacityPanel");
    const quickPanel = document.getElementById("assetPreviewQuickRepairPanel");

    const textBtn = document.getElementById("workspaceTextEraserBtn");
    const opacityBtn = document.getElementById("workspaceFillOpacityBtn");
    const quickBtn = document.getElementById("assetPreviewQuickRepairTabBtn");

    if (textPanel) {
      textPanel.hidden = mode !== "text";
      textPanel.style.display = mode === "text" ? "grid" : "none";
    }

    if (opacityPanel) {
      opacityPanel.hidden = mode !== "opacity";
      opacityPanel.style.display = mode === "opacity" ? "grid" : "none";
    }

    if (quickPanel) {
      quickPanel.hidden = mode !== "quick";
      quickPanel.style.display = mode === "quick" ? "grid" : "none";
    }

    [
      [textBtn, "text"],
      [opacityBtn, "opacity"],
      [quickBtn, "quick"],
    ].forEach(([btn, key]) => {
      if (!btn) return;
      btn.classList.toggle("is-active", mode === key);
      btn.classList.toggle("active", mode === key);
    });

    if (mode === "quick" && typeof setQuickRepairMode === "function") {
      const quickMode = window.__quickRepairState?.mode;
      const isDrawingRect =
        !!window.__quickRepairState?.dragStart || !!window.__quickRepairState?.tempRect;

      if (!isDrawingRect && !["pick", "rect", "recolor_source"].includes(quickMode)) {
        setQuickRepairMode("pick");
      }
    }

    setTimeout(() => {
      if (typeof window.activateTextEraserTargetsIfNeeded === "function") {
        window.activateTextEraserTargetsIfNeeded(mode);
      }

      if (typeof window.hookTextEraserOverlayToggle === "function") {
        window.hookTextEraserOverlayToggle();
      }

      if (mode === "text") {
        if (typeof window.resetShowEraseTargetsOff === "function") {
          window.resetShowEraseTargetsOff("text-tab-open");
        }

        if (typeof window.removeDuplicateTextEraserControls === "function") {
          window.removeDuplicateTextEraserControls();
          setTimeout(window.removeDuplicateTextEraserControls, 160);
          setTimeout(window.removeDuplicateTextEraserControls, 360);
        }

        if (typeof window.updateTextEraserTargetSummary === "function") {
          window.updateTextEraserTargetSummary();
        }

        if (typeof window.scheduleTextEraserOverlayDraw === "function") {
          window.scheduleTextEraserOverlayDraw("nav-text");
        } else if (typeof window.drawTextEraserRobustOverlays === "function") {
          window.drawTextEraserRobustOverlays();
        }
      } else if (typeof window.clearTextEraserOverlayAll === "function") {
        window.clearTextEraserOverlayAll();
      } else if (typeof window.clearTextEraserRobustOverlays === "function") {
        window.clearTextEraserRobustOverlays();
      }
    }, 40);

    if (typeof log === "function") {
      log(`workspace nav: ${mode}`);
    }
  }

  function retargetWorkspaceNavButtons() {
    const textBtn = document.getElementById("workspaceTextEraserBtn");
    const opacityBtn = document.getElementById("workspaceFillOpacityBtn");
    const quickBtn = document.getElementById("assetPreviewQuickRepairTabBtn");

    if (textBtn) {
      textBtn.onclick = (event) => {
        event?.preventDefault?.();
        setWorkspaceNavActive("text");
      };
    }

    if (opacityBtn) {
      opacityBtn.onclick = (event) => {
        event?.preventDefault?.();
        setWorkspaceNavActive("opacity");
      };
    }

    if (quickBtn) {
      quickBtn.onclick = (event) => {
        event?.preventDefault?.();
        setWorkspaceNavActive("quick");
      };
    }
  }

  // Capture old direct-action clicks before inline handlers fire.
  document.addEventListener("click", (event) => {
    const textBtn = event.target?.closest?.("#workspaceTextEraserBtn");
    const opacityBtn = event.target?.closest?.("#workspaceFillOpacityBtn");

    if (textBtn) {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      setWorkspaceNavActive("text");
      return;
    }

    if (opacityBtn) {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      setWorkspaceNavActive("opacity");
      return;
    }
  }, true);

  function syncWorkspaceNavPanels() {
    ensureWorkspacePanels();
    retargetWorkspaceNavButtons();
  }

  document.addEventListener("DOMContentLoaded", () => {
    setTimeout(syncWorkspaceNavPanels, 0);
  });

  window.setWorkspaceNavActive = setWorkspaceNavActive;
  window.ensureWorkspacePanels = ensureWorkspacePanels;
  window.syncWorkspaceNavPanels = syncWorkspaceNavPanels;
})();

/* Persist Fill Opacity preset for Apply payload */
(function () {
  if (window.__AIDR_FILL_OPACITY_PRESET_STATE_INSTALLED__) return;
  window.__AIDR_FILL_OPACITY_PRESET_STATE_INSTALLED__ = true;

  window.__aidrFillOpacityPercent = window.__aidrFillOpacityPercent || 35;

  document.addEventListener("click", (event) => {
    const btn = event.target?.closest?.(".asset-preview-opacity-preset");
    if (!btn) return;

    const value = Number(btn.dataset.opacity || 35);
    window.__aidrFillOpacityPercent = value;

    document.querySelectorAll(".asset-preview-opacity-preset").forEach((b) => {
      b.classList.toggle("is-active", b === btn);
    });

    if (typeof log === "function") {
      log(`fill opacity preset selected: ${value}%`);
    }
  }, true);
})();

/* Robust Fill Opacity Apply payload */
(function () {
  if (window.__AIDR_FILL_OPACITY_ROBUST_APPLY_INSTALLED__) return;
  window.__AIDR_FILL_OPACITY_ROBUST_APPLY_INSTALLED__ = true;

  function getCurrentWorkspaceAssetId() {
    const state = window.__quickRepairState || {};
    if (state.assetId) return state.assetId;

    if (typeof selectedElementKey !== "undefined" && selectedElementKey?.startsWith?.("asset:")) {
      return selectedElementKey.slice("asset:".length);
    }

    if (typeof aidrSelectedAssetId !== "undefined" && aidrSelectedAssetId) {
      return aidrSelectedAssetId;
    }

    return "";
  }

  function getFillOpacityPercent() {
    const panel = document.getElementById("assetPreviewFillOpacityPanel");
    const active = panel?.querySelector?.(".asset-preview-opacity-preset.is-active");
    const value = Number(active?.dataset?.opacity || window.__aidrFillOpacityPercent || 35);
    return Number.isFinite(value) ? value : 35;
  }

  function getFillOpacityTargets() {
    const bg = !!document.getElementById("fillOpacityBackgroundTarget")?.checked;
    const fill = !!document.getElementById("fillOpacityFillTarget")?.checked;
    return { apply_background: bg, apply_fill: fill };
  }

  async function robustApplyWorkspaceFillOpacity() {
    const assetId = getCurrentWorkspaceAssetId();

    if (!selectedSlideId || !assetId) {
      alert(uiText("assetEdit.assetNotSelected"));
      return;
    }

    const targets = getFillOpacityTargets();

    if (!targets.apply_background && !targets.apply_fill) {
      alert(uiText("assetEdit.fillOpacityTargetRequired"));
      return;
    }

    const opacityPercent = getFillOpacityPercent();

    const payload = {
      use_in_pptx: false,
      apply_background: targets.apply_background,
      apply_fill: targets.apply_fill,
      opacity_percent: opacityPercent,
    };

    if (typeof log === "function") {
      log(
        `fill opacity apply payload: opacity=${opacityPercent}% background=${payload.apply_background} fill=${payload.apply_fill}`
      );
    }

    try {
      const data = await fetchJson(`/api/material/${selectedSlideId}/${assetId}/fill-opacity`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (data?.manifest?.assets && typeof aidrAssetList !== "undefined") {
        aidrAssetList = data.manifest.assets;
      }

      const nextAsset = data?.asset;

      if (nextAsset?.asset_id) {
        if (typeof aidrSelectedAssetId !== "undefined") {
          aidrSelectedAssetId = nextAsset.asset_id;
        }

        if (typeof selectedElementKey !== "undefined") {
          selectedElementKey = `asset:${nextAsset.asset_id}`;
        }

        if (window.__quickRepairState) {
          window.__quickRepairState.assetId = nextAsset.asset_id;
        }

        if (typeof renderRightAssets === "function") renderRightAssets();
        if (typeof renderAssetOverlays === "function") renderAssetOverlays();
        if (typeof renderInspector === "function") renderInspector();

        if (typeof openAssetPreview === "function") {
          openAssetPreview(
            nextAsset.url || `/api/assets/${selectedSlideId}/${nextAsset.filename}`,
            nextAsset.filename || nextAsset.asset_id,
            nextAsset
          );
        }

        if (typeof log === "function") {
          log(`workspace fill opacity applied: ${nextAsset.filename || nextAsset.asset_id}`);
        }
      }
    } catch (e) {
      console.error(e);
      alert(formatUiText("assetEdit.fillOpacityFailed", { message: e.message }));
      if (typeof log === "function") {
        log(`ERROR workspace fill opacity: ${e.message}`);
      }
    } finally {
      setTimeout(() => {
        if (typeof window.setWorkspaceNavActive === "function") {
          window.setWorkspaceNavActive("opacity");
        }

        if (typeof window.updateVariantSaveVisibility === "function") {
          window.updateVariantSaveVisibility("opacity");
        }
      }, 80);
    }
  }

  window.applyWorkspaceFillOpacity = robustApplyWorkspaceFillOpacity;
})();

/* Text Eraser bbox preview overlay */
(function () {
  if (window.__AIDR_TEXT_ERASER_TARGET_OVERLAY_INSTALLED__) return;
  window.__AIDR_TEXT_ERASER_TARGET_OVERLAY_INSTALLED__ = true;

  function getCurrentTextEraserAssetId() {
    const state = window.__quickRepairState || {};
    if (state.assetId) return state.assetId;

    if (typeof selectedElementKey !== "undefined" && selectedElementKey?.startsWith?.("asset:")) {
      return selectedElementKey.slice("asset:".length);
    }

    if (typeof aidrSelectedAssetId !== "undefined" && aidrSelectedAssetId) {
      return aidrSelectedAssetId;
    }

    return "";
  }

  function getTextEraserAsset() {
    const assetId = getCurrentTextEraserAssetId();
    if (!assetId) return null;

    if (typeof findAssetById === "function") {
      const found = findAssetById(assetId);
      if (found) return found;
    }

    if (typeof aidrAssetList !== "undefined" && Array.isArray(aidrAssetList)) {
      return aidrAssetList.find((a) => a?.asset_id === assetId) || null;
    }

    if (Array.isArray(window.aidrAssets)) {
      return window.aidrAssets.find((a) => a?.asset_id === assetId) || null;
    }

    return null;
  }

  function findCandidateForTextEraser(candidateId) {
    if (!candidateId) return null;

    if (typeof findCandidateById === "function") {
      const found = findCandidateById(candidateId);
      if (found) return found;
    }

    if (typeof aidrCandidateList !== "undefined" && Array.isArray(aidrCandidateList)) {
      return aidrCandidateList.find((c) => c?.candidate_id === candidateId) || null;
    }

    if (Array.isArray(window.aidrCandidates)) {
      return window.aidrCandidates.find((c) => c?.candidate_id === candidateId) || null;
    }

    return null;
  }

  function normalizeBboxForTextEraser(item) {
    const bbox =
      item?.bbox_px ||
      item?.bbox ||
      item?.rect ||
      item?.bounds ||
      null;

    if (!Array.isArray(bbox) || bbox.length < 4) return null;

    return [
      Number(bbox[0]) || 0,
      Number(bbox[1]) || 0,
      Number(bbox[2]) || 0,
      Number(bbox[3]) || 0,
    ];
  }

  function getTextEraserLocalTargets() {
    const asset = getTextEraserAsset();
    const img = document.getElementById("assetPreviewImage");

    if (!asset || !img) return [];

    const naturalW = img.naturalWidth || Number(asset?.bbox_px?.[2]) || 1;
    const naturalH = img.naturalHeight || Number(asset?.bbox_px?.[3]) || 1;

    const assetBbox = normalizeBboxForTextEraser(asset);
    const sourceCandidateId = String(asset.source_candidate_id || "");
    const candidate = findCandidateForTextEraser(sourceCandidateId);
    const candidateBbox = normalizeBboxForTextEraser(candidate);

    // Best case: accepted asset maps back to a candidate bbox.
    if (candidateBbox) {
      let [cx, cy, cw, ch] = candidateBbox;
      let localX = cx;
      let localY = cy;

      // If candidate bbox appears to be slide coordinates, convert to local asset coordinates.
      if (assetBbox) {
        const [ax, ay] = assetBbox;
        const looksLikeSlideCoords =
          cx + cw > naturalW + 2 ||
          cy + ch > naturalH + 2 ||
          cx >= ax - 2 ||
          cy >= ay - 2;

        if (looksLikeSlideCoords) {
          localX = cx - ax;
          localY = cy - ay;
        }
      }

      // Clip to preview image bounds.
      const x1 = Math.max(0, localX);
      const y1 = Math.max(0, localY);
      const x2 = Math.min(naturalW, localX + cw);
      const y2 = Math.min(naturalH, localY + ch);

      if (x2 > x1 && y2 > y1) {
        return [{
          x: x1,
          y: y1,
          w: x2 - x1,
          h: y2 - y1,
          label: sourceCandidateId || "text target",
        }];
      }
    }

    // Fallback: backend can still erase by source candidate / asset info.
    // Preview shows whole asset as the planned eraser region.
    if (sourceCandidateId || String(asset.created_by || "").includes("candidate")) {
      return [{
        x: 0,
        y: 0,
        w: naturalW,
        h: naturalH,
        label: sourceCandidateId || "asset target",
        fallback: true,
      }];
    }

    return [];
  }

  function ensureTextEraserTargetUi() {
    const panel = document.getElementById("assetPreviewTextEraserPanel");
    if (!panel || document.getElementById("textEraserTargetTools")) return;

    const actions = panel.querySelector(".asset-preview-panel-actions");

    const tools = document.createElement("div");
    tools.id = "textEraserTargetTools";
    tools.className = "text-eraser-target-tools";
    tools.innerHTML = `
      <label class="text-eraser-target-toggle">
        <input type="checkbox" id="showTextEraserTargetsToggle">
        <span>${escapeHtml(uiText("status.textEraserShowTargets"))}</span>
      </label>
      <div class="text-eraser-target-count" id="textEraserTargetCount">
        ${escapeHtml(uiText("status.textEraserDetectedTargetsEmpty"))}
      </div>
    `;

    if (actions) {
      panel.insertBefore(tools, actions);
    } else {
      panel.appendChild(tools);
    }

    const toggle = document.getElementById("showTextEraserTargetsToggle");
    if (toggle && !toggle.__aidrWorkspaceControlBound) {
      toggle.__aidrWorkspaceControlBound = true;
      toggle.addEventListener("change", drawTextEraserTargets);
    }
  }

  function clearTextEraserTargets() {
    document.querySelectorAll(".text-eraser-target-overlay").forEach((el) => el.remove());

    const count = document.getElementById("textEraserTargetCount");
    if (count) count.textContent = uiText("status.textEraserDetectedTargetsEmpty");
  }

  function drawTextEraserTargets() {
    clearTextEraserTargets();
    ensureTextEraserTargetUi();

    const toggle = document.getElementById("showTextEraserTargetsToggle");
    if (toggle && !toggle.checked) return;

    const wrap = document.getElementById("assetPreviewCanvasWrap");
    const img = document.getElementById("assetPreviewImage");
    const count = document.getElementById("textEraserTargetCount");

    if (!wrap || !img || !img.naturalWidth || !img.naturalHeight) {
      if (count) count.textContent = formatUiText("status.textEraserDetectedTargets", { count: 0 });
      return;
    }

    const targets = getTextEraserLocalTargets();

    if (count) {
      count.textContent = formatUiText("status.textEraserDetectedTargets", { count: targets.length });
    }

    if (!targets.length) return;

    const wrapRect = wrap.getBoundingClientRect();
    const imgRect = img.getBoundingClientRect();

    targets.forEach((target) => {
      const overlay = document.createElement("div");
      overlay.className = "text-eraser-target-overlay";
      overlay.title = target.fallback
        ? "Fallback erase target preview"
        : "Text eraser target preview";

      const left = imgRect.left - wrapRect.left + (target.x / img.naturalWidth) * imgRect.width;
      const top = imgRect.top - wrapRect.top + (target.y / img.naturalHeight) * imgRect.height;
      const width = (target.w / img.naturalWidth) * imgRect.width;
      const height = (target.h / img.naturalHeight) * imgRect.height;

      overlay.style.left = `${left}px`;
      overlay.style.top = `${top}px`;
      overlay.style.width = `${width}px`;
      overlay.style.height = `${height}px`;

      overlay.innerHTML = `<span>${target.fallback ? "fallback target" : "erase target"}</span>`;
      wrap.appendChild(overlay);
    });
  }

  function activateTextEraserTargetsIfNeeded(mode) {
    if (mode === "text") {
      ensureTextEraserTargetUi();
      setTimeout(drawTextEraserTargets, 30);

      const img = document.getElementById("assetPreviewImage");
      if (img && !img.__aidrTextEraserOverlayBound) {
        img.__aidrTextEraserOverlayBound = true;
        img.addEventListener("load", () => {
          if (document.getElementById("assetPreviewTextEraserPanel")?.style.display !== "none") {
            setTimeout(drawTextEraserTargets, 30);
          }
        });
      }

      window.addEventListener("resize", drawTextEraserTargets, { passive: true });
    } else {
      clearTextEraserTargets();
    }
  }

  window.ensureTextEraserTargetUi = ensureTextEraserTargetUi;
  window.drawTextEraserTargets = drawTextEraserTargets;
  window.clearTextEraserTargets = clearTextEraserTargets;
  window.activateTextEraserTargetsIfNeeded = activateTextEraserTargetsIfNeeded;
})();

/* Stable Text Eraser target summary */
(function () {
  if (window.__AIDR_TEXT_ERASER_TARGET_SUMMARY_INSTALLED__) return;
  window.__AIDR_TEXT_ERASER_TARGET_SUMMARY_INSTALLED__ = true;

  function getCurrentTextEraserAssetForSummary() {
    const state = window.__quickRepairState || {};
    let assetId = state.assetId || "";

    if (!assetId && typeof selectedElementKey !== "undefined" && selectedElementKey?.startsWith?.("asset:")) {
      assetId = selectedElementKey.slice("asset:".length);
    }

    if (!assetId && typeof aidrSelectedAssetId !== "undefined") {
      assetId = aidrSelectedAssetId;
    }

    if (!assetId) return null;

    if (typeof findAssetById === "function") {
      const found = findAssetById(assetId);
      if (found) return found;
    }

    if (typeof aidrAssetList !== "undefined" && Array.isArray(aidrAssetList)) {
      return aidrAssetList.find((a) => a?.asset_id === assetId) || null;
    }

    if (Array.isArray(window.aidrAssets)) {
      return window.aidrAssets.find((a) => a?.asset_id === assetId) || null;
    }

    return null;
  }

  function updateTextEraserTargetSummary() {
    const status = document.getElementById("textEraserTargetStatus");
    if (!status) return;

    const asset = getCurrentTextEraserAssetForSummary();

    if (!asset) {
      status.textContent = uiText("assetEdit.assetNotSelected");
      return;
    }

    const sourceCandidateId = asset.source_candidate_id || "";
    const createdBy = asset.created_by || "";
    const bbox = asset.bbox_px || [];

    if (sourceCandidateId) {
      status.textContent = formatUiText("status.textEraserSourceCandidate", { sourceCandidateId });
      return;
    }

    if (createdBy.includes("candidate")) {
      status.textContent = uiText("status.textEraserCandidateAsset");
      return;
    }

    if (Array.isArray(bbox) && bbox.length >= 4) {
      status.textContent = formatUiText("status.textEraserBbox", { bbox: bbox.join(", ") });
      return;
    }

    status.textContent = uiText("status.textEraserFallbackWholeAsset");
  }

  document.addEventListener("DOMContentLoaded", () => {
    setTimeout(updateTextEraserTargetSummary, 100);
  });

  window.updateTextEraserTargetSummary = updateTextEraserTargetSummary;
})();

/* Robust Text Eraser target overlay */
(function () {
  if (window.__AIDR_TEXT_ERASER_ROBUST_OVERLAY_INSTALLED__) return;
  window.__AIDR_TEXT_ERASER_ROBUST_OVERLAY_INSTALLED__ = true;

  function getCurrentTextEraserAssetIdRobust() {
    const state = window.__quickRepairState || {};
    if (state.assetId) return state.assetId;

    if (typeof selectedElementKey !== "undefined" && selectedElementKey?.startsWith?.("asset:")) {
      return selectedElementKey.slice("asset:".length);
    }

    if (typeof aidrSelectedAssetId !== "undefined" && aidrSelectedAssetId) {
      return aidrSelectedAssetId;
    }

    return "";
  }

  function findTextEraserAssetRobust(assetId) {
    if (!assetId) return null;

    if (typeof findAssetById === "function") {
      const found = findAssetById(assetId);
      if (found) return found;
    }

    if (typeof aidrAssetList !== "undefined" && Array.isArray(aidrAssetList)) {
      return aidrAssetList.find((a) => a?.asset_id === assetId) || null;
    }

    if (Array.isArray(window.aidrAssets)) {
      return window.aidrAssets.find((a) => a?.asset_id === assetId) || null;
    }

    return null;
  }

  function findTextEraserCandidateRobust(candidateId) {
    if (!candidateId) return null;

    if (typeof findCandidateById === "function") {
      const found = findCandidateById(candidateId);
      if (found) return found;
    }

    if (typeof aidrCandidateList !== "undefined" && Array.isArray(aidrCandidateList)) {
      return aidrCandidateList.find((c) => c?.candidate_id === candidateId) || null;
    }

    if (Array.isArray(window.aidrCandidates)) {
      return window.aidrCandidates.find((c) => c?.candidate_id === candidateId) || null;
    }

    return null;
  }

  function asBbox4(item) {
    const bbox = item?.bbox_px || item?.bbox || item?.bounds || item?.rect;
    if (!Array.isArray(bbox) || bbox.length < 4) return null;

    return [
      Number(bbox[0]) || 0,
      Number(bbox[1]) || 0,
      Number(bbox[2]) || 0,
      Number(bbox[3]) || 0,
    ];
  }

  function clearTextEraserRobustOverlays() {
    document.querySelectorAll(".text-eraser-robust-overlay").forEach((el) => el.remove());
  }

  function getRobustEraseTargets() {
    const assetId = getCurrentTextEraserAssetIdRobust();
    const asset = findTextEraserAssetRobust(assetId);
    const img = document.getElementById("assetPreviewImage");

    if (!asset || !img) return [];

    const naturalW = img.naturalWidth || Number(asset?.bbox_px?.[2]) || 1;
    const naturalH = img.naturalHeight || Number(asset?.bbox_px?.[3]) || 1;

    const assetBbox = asBbox4(asset);
    const candidateId = String(asset.source_candidate_id || "");
    const candidate = findTextEraserCandidateRobust(candidateId);
    const candidateBbox = asBbox4(candidate);

    if (candidateBbox) {
      let [cx, cy, cw, ch] = candidateBbox;

      // Candidate bbox may be slide-coordinate. If so, convert to asset-local.
      if (assetBbox) {
        const [ax, ay, aw, ah] = assetBbox;

        const likelySlideCoord =
          cx >= ax - 2 ||
          cy >= ay - 2 ||
          cx + cw > naturalW + 2 ||
          cy + ch > naturalH + 2 ||
          aw === naturalW ||
          ah === naturalH;

        if (likelySlideCoord) {
          cx = cx - ax;
          cy = cy - ay;
        }
      }

      const x1 = Math.max(0, cx);
      const y1 = Math.max(0, cy);
      const x2 = Math.min(naturalW, cx + cw);
      const y2 = Math.min(naturalH, cy + ch);

      if (x2 > x1 && y2 > y1) {
        return [{
          x: x1,
          y: y1,
          w: x2 - x1,
          h: y2 - y1,
          label: "erase target",
          mode: "candidate",
        }];
      }
    }

    // Fallback: show the whole asset as erase target.
    return [{
      x: 0,
      y: 0,
      w: naturalW,
      h: naturalH,
      label: "asset erase target",
      mode: "fallback",
    }];
  }

  function updateTextEraserOverlayCount(count, fallback) {
    const status = document.getElementById("textEraserTargetStatus");
    if (!status) return;

    const asset = findTextEraserAssetRobust(getCurrentTextEraserAssetIdRobust());
    const candidateId = asset?.source_candidate_id || "";

    if (count <= 0) {
      status.textContent = uiText("status.textEraserTargetUnavailable");
      return;
    }

    if (fallback) {
      status.textContent = candidateId
        ? formatUiText("status.textEraserFallbackSourceCandidate", { candidateId })
        : uiText("status.textEraserFallbackWholeAsset");
      return;
    }

    status.textContent = candidateId
      ? formatUiText("status.textEraserSourceCandidateBbox", { candidateId })
      : formatUiText("status.textEraserDetectedTargets", { count });
  }

  function drawTextEraserRobustOverlays() {
    clearTextEraserRobustOverlays();

    const panel = document.getElementById("assetPreviewTextEraserPanel");
    const panelVisible = panel && panel.style.display !== "none" && !panel.hidden;
    if (!panelVisible) return;

    const toggle = document.getElementById("showTextEraserTargetsToggle");
    if (toggle && !toggle.checked) {
      updateTextEraserOverlayCount(0, false);
      return;
    }

    const wrap = document.getElementById("assetPreviewCanvasWrap");
    const img = document.getElementById("assetPreviewImage");

    if (!wrap || !img || !img.naturalWidth || !img.naturalHeight) {
      updateTextEraserOverlayCount(0, false);
      return;
    }

    const wrapRect = wrap.getBoundingClientRect();
    const imgRect = img.getBoundingClientRect();
    const targets = getRobustEraseTargets();

    let fallback = false;

    targets.forEach((target) => {
      fallback = fallback || target.mode === "fallback";

      const overlay = document.createElement("div");
      overlay.className = "text-eraser-robust-overlay";
      overlay.dataset.mode = target.mode || "target";

      const left = imgRect.left - wrapRect.left + (target.x / img.naturalWidth) * imgRect.width;
      const top = imgRect.top - wrapRect.top + (target.y / img.naturalHeight) * imgRect.height;
      const width = (target.w / img.naturalWidth) * imgRect.width;
      const height = (target.h / img.naturalHeight) * imgRect.height;

      overlay.style.left = `${left}px`;
      overlay.style.top = `${top}px`;
      overlay.style.width = `${width}px`;
      overlay.style.height = `${height}px`;
      overlay.innerHTML = `<span>${target.label || "erase target"}</span>`;

      wrap.appendChild(overlay);
    });

    updateTextEraserOverlayCount(targets.length, fallback);
  }

  function hookTextEraserOverlayToggle() {
    const toggle = document.getElementById("showTextEraserTargetsToggle");
    if (!toggle || toggle.__aidrRobustTextEraserOverlayBound) return;

    toggle.__aidrRobustTextEraserOverlayBound = true;
    toggle.addEventListener("change", () => {
      if (toggle.checked) {
        drawTextEraserRobustOverlays();
      } else {
        clearTextEraserRobustOverlays();
      }
    });
  }

  window.hookTextEraserOverlayToggle = hookTextEraserOverlayToggle;
  window.drawTextEraserRobustOverlays = drawTextEraserRobustOverlays;
  window.clearTextEraserRobustOverlays = clearTextEraserRobustOverlays;
})();

/* Stabilize Text Eraser overlay timing */
(function () {
  if (window.__AIDR_TEXT_ERASER_OVERLAY_TIMING_FIX_INSTALLED__) return;
  window.__AIDR_TEXT_ERASER_OVERLAY_TIMING_FIX_INSTALLED__ = true;

  function scheduleTextEraserOverlayDraw(reason = "schedule") {
    const draw = () => {
      if (typeof window.drawTextEraserRobustOverlays === "function") {
        window.drawTextEraserRobustOverlays();

        if (typeof log === "function") {
          log(`text eraser overlay draw: ${reason}`);
        }
      }
    };

    requestAnimationFrame(() => {
      draw();
      setTimeout(draw, 80);
      setTimeout(draw, 220);
      setTimeout(draw, 500);
    });
  }

  document.addEventListener("change", (event) => {
    const toggle = event.target?.closest?.("#showTextEraserTargetsToggle");
    if (!toggle) return;

    if (toggle.checked) {
      scheduleTextEraserOverlayDraw("toggle-on");
    } else if (typeof window.clearTextEraserRobustOverlays === "function") {
      window.clearTextEraserRobustOverlays();
    }
  }, true);

  const img = document.getElementById("assetPreviewImage");
  if (img && !img.__aidrTextEraserOverlayTimingFixed) {
    img.__aidrTextEraserOverlayTimingFixed = true;
    img.addEventListener("load", () => {
      const panel = document.getElementById("assetPreviewTextEraserPanel");
      const isTextVisible = panel && panel.style.display !== "none" && !panel.hidden;

      if (isTextVisible) {
        scheduleTextEraserOverlayDraw("image-load");
      }
    });
  }

  window.scheduleTextEraserOverlayDraw = scheduleTextEraserOverlayDraw;
})();

/* Direct Text Eraser overlay redraw trigger */
(function () {
  if (window.__AIDR_TEXT_ERASER_DIRECT_REDRAW_INSTALLED__) return;
  window.__AIDR_TEXT_ERASER_DIRECT_REDRAW_INSTALLED__ = true;

  function forceTextEraserOverlayRedraw(reason = "direct") {
    const toggle = document.getElementById("showTextEraserTargetsToggle");

    // Default OFF. Do not force-enable Show Erase Targets.

    const draw = () => {
      if (typeof window.drawTextEraserRobustOverlays === "function") {
        window.drawTextEraserRobustOverlays();
      } else if (typeof window.drawTextEraserTargets === "function") {
        window.drawTextEraserTargets();
      }

      if (typeof log === "function") {
        log(`text eraser overlay direct redraw: ${reason}`);
      }
    };

    // 既存UIの表示切替・画像レイアウト確定を待って複数回描画
    setTimeout(draw, 80);
    setTimeout(draw, 220);
    setTimeout(draw, 500);
    setTimeout(draw, 900);
  }

  document.addEventListener("click", (event) => {
    const textBtn = event.target?.closest?.("#workspaceTextEraserBtn");
    if (!textBtn) return;

    forceTextEraserOverlayRedraw("text-button-click");
  }, true);

  document.addEventListener("change", (event) => {
    const toggle = event.target?.closest?.("#showTextEraserTargetsToggle");
    if (!toggle) return;

    if (toggle.checked) {
      forceTextEraserOverlayRedraw("toggle-on");
    } else {
      if (typeof window.clearTextEraserRobustOverlays === "function") {
        window.clearTextEraserRobustOverlays();
      }
      if (typeof window.clearTextEraserTargets === "function") {
        window.clearTextEraserTargets();
      }
    }
  }, true);

  // 念のため、画像ロード時にも再描画
  document.addEventListener("load", (event) => {
    if (event.target?.id !== "assetPreviewImage") return;

    const panel = document.getElementById("assetPreviewTextEraserPanel");
    const isTextPanel =
      panel &&
      !panel.hidden &&
      panel.style.display !== "none";

    if (isTextPanel) {
      forceTextEraserOverlayRedraw("image-load");
    }
  }, true);

  window.forceTextEraserOverlayRedraw = forceTextEraserOverlayRedraw;
})();

/* Draw Text Eraser overlay on tab activation, not checkbox change */
(function () {
  if (window.__AIDR_TEXT_ERASER_DRAW_ON_TAB_INSTALLED__) return;
  window.__AIDR_TEXT_ERASER_DRAW_ON_TAB_INSTALLED__ = true;

  function drawTextEraserOverlayOnTab(reason = "text-tab") {
    const toggle = document.getElementById("showTextEraserTargetsToggle");
    // Default OFF. Do not force-enable Show Erase Targets.

    const draw = () => {
      if (typeof window.drawTextEraserRobustOverlays === "function") {
        window.drawTextEraserRobustOverlays();

        if (typeof log === "function") {
          log(`text eraser overlay draw on tab: ${reason}`);
        }
      }
    };

    // panel生成・画像layout確定を待つ
    setTimeout(draw, 60);
    setTimeout(draw, 160);
    setTimeout(draw, 320);
    setTimeout(draw, 700);
  }

  document.addEventListener("click", (event) => {
    const textBtn = event.target?.closest?.("#workspaceTextEraserBtn");
    if (!textBtn) return;

    drawTextEraserOverlayOnTab("button-click");
  }, true);

  window.drawTextEraserOverlayOnTab = drawTextEraserOverlayOnTab;
})();

/* Do not persist Show Erase Targets state */
(function () {
  if (window.__AIDR_TEXT_ERASER_TARGETS_DEFAULT_OFF_INSTALLED__) return;
  window.__AIDR_TEXT_ERASER_TARGETS_DEFAULT_OFF_INSTALLED__ = true;

  function clearTextEraserOverlayAll() {
    document.querySelectorAll(
      ".text-eraser-target-overlay, .text-eraser-robust-overlay"
    ).forEach((el) => el.remove());
  }

  function resetShowEraseTargetsOff(reason = "reset") {
    const toggle = document.getElementById("showTextEraserTargetsToggle");

    if (toggle) {
      toggle.checked = false;
    }

    clearTextEraserOverlayAll();

    if (typeof log === "function") {
      log(`show erase targets reset off: ${reason}`);
    }
  }

  document.addEventListener("click", (event) => {
    const textBtn = event.target?.closest?.("#workspaceTextEraserBtn");
    if (!textBtn) return;

    setTimeout(() => {
      resetShowEraseTargetsOff("text-button-click");
    }, 120);
  }, true);

  window.clearTextEraserOverlayAll = clearTextEraserOverlayAll;
  window.resetShowEraseTargetsOff = resetShowEraseTargetsOff;
})();

/* Remove duplicated Text Eraser target controls */
(function () {
  if (window.__AIDR_REMOVE_DUPLICATE_TEXT_ERASER_CONTROLS_INSTALLED__) return;
  window.__AIDR_REMOVE_DUPLICATE_TEXT_ERASER_CONTROLS_INSTALLED__ = true;

  function removeDuplicateTextEraserControls() {
    const tools = document.getElementById("textEraserTargetTools");
    if (tools) tools.remove();

    const count = document.getElementById("textEraserTargetCount");
    if (count) count.remove();

    // Duplicate checkbox protection:
    // keep the first visible Show Erase Targets control, remove later duplicates.
    const toggles = Array.from(document.querySelectorAll("#showTextEraserTargetsToggle"));
    toggles.slice(1).forEach((toggle) => {
      const label = toggle.closest("label");
      if (label) label.remove();
      else toggle.remove();
    });
  }

  // Disable old helper that injected the duplicate tools row.
  window.ensureTextEraserTargetUi = function () {
    removeDuplicateTextEraserControls();
  };

  document.addEventListener("DOMContentLoaded", () => {
    setTimeout(removeDuplicateTextEraserControls, 100);
  });

  window.removeDuplicateTextEraserControls = removeDuplicateTextEraserControls;
})();

















/* Locked workspace primary action */
(function () {
  if (window.__AIDR_PRIMARY_ACTION_LOCK_INSTALLED__) return;
  window.__AIDR_PRIMARY_ACTION_LOCK_INSTALLED__ = true;

  window.__aidrWorkspaceModeState = window.__aidrWorkspaceModeState || "quick";
  window.__aidrWorkspacePrimaryMode = window.__aidrWorkspacePrimaryMode || "quick";

  function setFinalMode(mode, reason = "set") {
    if (mode !== "text" && mode !== "opacity" && mode !== "quick") return;

    window.__aidrWorkspaceModeState = mode;
    window.__aidrWorkspacePrimaryMode = mode;

    if (typeof log === "function") {
      log(`final primary mode: ${mode} reason=${reason}`);
    }
  }

  function getFinalMode() {
    return window.__aidrWorkspaceModeState || window.__aidrWorkspacePrimaryMode || "quick";
  }

  function getToolbar() {
    return document.querySelector("#assetPreviewModal .asset-preview-toolbar");
  }

  function ensureFinalPrimaryButton() {
    const toolbar = getToolbar();
    if (!toolbar) return null;

    let btn = document.getElementById("aidrWorkspacePrimaryActionBtn");
    if (btn) return btn;

    btn = document.createElement("button");
    btn.id = "aidrWorkspacePrimaryActionBtn";
    btn.type = "button";
    btn.className = "asset-preview-save-btn";
    btn.textContent = uiText("status.saveRepair");

    const legacy =
      document.getElementById("assetPreviewLegacySaveBtn") ||
      Array.from(toolbar.querySelectorAll("button")).find((b) => {
        const text = (b.textContent || "").replace(/\s+/g, " ").trim();
        return text === "Variant Save" || text === "Save Repair";
      });

    if (legacy && legacy.parentNode) {
      legacy.insertAdjacentElement("afterend", btn);
    } else {
      toolbar.appendChild(btn);
    }

    return btn;
  }

  function hideLegacyPrimaryButtons() {
    const toolbar = getToolbar();
    if (!toolbar) return;

    Array.from(toolbar.querySelectorAll("button")).forEach((btn) => {
      if (btn.id === "aidrWorkspacePrimaryActionBtn") return;

      const text = (btn.textContent || "").replace(/\s+/g, " ").trim();
      const onclick = btn.getAttribute("onclick") || "";

      const isLegacy =
        btn.id === "assetPreviewLegacySaveBtn" ||
        btn.id === "assetPreviewPrimaryActionBtn" ||
        text === "Variant Save" ||
        text === "Save Repair" ||
        text === "Apply Text Eraser" ||
        text === "Apply Fill Opacity" ||
        text === "バリアント保存" ||
        text === "補修を保存" ||
        text === "文字消しを適用" ||
        text === "透過処理を適用" ||
        onclick.includes("saveQuickRepair");

      if (isLegacy) {
        btn.hidden = true;
        btn.style.display = "none";
        btn.disabled = true;
      }
    });
  }

  function hideInlineApplyButtonsFinal() {
    [
      document.getElementById("applyWorkspaceTextEraserBtn"),
      document.getElementById("applyWorkspaceFillOpacityBtn"),
    ].forEach((btn) => {
      if (!btn) return;
      btn.hidden = true;
      btn.style.display = "none";
    });
  }

  function labelForFinalMode(mode) {
    if (mode === "text") return uiText("status.applyTextEraser");
    if (mode === "opacity") return uiText("status.applyFillOpacity");
    return uiText("status.saveRepair");
  }

  function runFinalPrimaryAction() {
    const mode = getFinalMode();

    if (mode === "text") {
      if (typeof window.applyWorkspaceTextEraser === "function") {
        window.applyWorkspaceTextEraser();
      }
      return;
    }

    if (mode === "opacity") {
      if (typeof window.applyWorkspaceFillOpacity === "function") {
        window.applyWorkspaceFillOpacity();
      }
      return;
    }

    if (typeof saveQuickRepair === "function") {
      saveQuickRepair("variant");
    } else if (typeof window.saveQuickRepair === "function") {
      window.saveQuickRepair("variant");
    }
  }

  function syncFinalPrimaryAction(reason = "sync") {
    hideInlineApplyButtonsFinal();
    hideLegacyPrimaryButtons();

    const btn = ensureFinalPrimaryButton();
    if (!btn) return;

    const mode = getFinalMode();
    const label = labelForFinalMode(mode);

    btn.hidden = false;
    btn.disabled = false;
    btn.style.display = "";
    btn.textContent = label;
    btn.title = label;
    btn.dataset.aidrFinalPrimaryMode = mode;
    btn.removeAttribute("onclick");

    btn.onclick = function (event) {
      event.preventDefault();
      event.stopPropagation();
      runFinalPrimaryAction();
    };

    if (typeof log === "function") {
      log(`final primary action sync: mode=${mode} label=${label} reason=${reason}`);
    }
  }

  function scheduleFinalPrimarySync(reason) {
    setTimeout(() => syncFinalPrimaryAction(reason), 0);
    setTimeout(() => syncFinalPrimaryAction(reason), 80);
    setTimeout(() => syncFinalPrimaryAction(reason), 220);
    setTimeout(() => syncFinalPrimaryAction(reason), 500);
    setTimeout(() => syncFinalPrimaryAction(reason), 1000);
  }

  document.addEventListener("click", function (event) {
    if (event.target && event.target.closest("#workspaceTextEraserBtn")) {
      setFinalMode("text", "text-click");
      scheduleFinalPrimarySync("text-click");
      return;
    }

    if (event.target && event.target.closest("#workspaceFillOpacityBtn")) {
      setFinalMode("opacity", "opacity-click");
      scheduleFinalPrimarySync("opacity-click");
      return;
    }

    if (event.target && event.target.closest("#assetPreviewQuickRepairTabBtn")) {
      setFinalMode("quick", "quick-click");
      scheduleFinalPrimarySync("quick-click");
      return;
    }
  }, true);

  document.addEventListener("click", function (event) {
    const btn = event.target && event.target.closest("#aidrWorkspacePrimaryActionBtn");
    if (!btn) return;

    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();

    runFinalPrimaryAction();
  }, true);

  const observer = new MutationObserver(function () {
    scheduleFinalPrimarySync("mutation");
  });

  function observeAssetPreviewModal() {
    const modal = document.getElementById("assetPreviewModal");
    if (!modal || modal.__aidrPrimaryActionObserved) return;

    modal.__aidrPrimaryActionObserved = true;
    observer.observe(modal, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["class", "style", "hidden"],
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    observeAssetPreviewModal();
    scheduleFinalPrimarySync("dom-ready");
  });

  setTimeout(function () {
    observeAssetPreviewModal();
    scheduleFinalPrimarySync("init");
  }, 0);

  window.setWorkspacePrimaryFinalMode = setFinalMode;
  window.scheduleFinalPrimarySync = scheduleFinalPrimarySync;
  window.syncFinalPrimaryAction = syncFinalPrimaryAction;
  window.syncPrimaryActionDirect = syncFinalPrimaryAction;
  window.syncDedicatedPrimary = syncFinalPrimaryAction;
  window.syncWorkspacePrimaryAction = syncFinalPrimaryAction;
  window.syncContextualPrimaryActionFinal = syncFinalPrimaryAction;
  window.syncSaveRepairVisibilityStrict = syncFinalPrimaryAction;
  window.updateVariantSaveVisibility = function () {
    syncFinalPrimaryAction("legacy-update");
  };
})();









/* Fixed-ID Assist and Rebuild collapse control */
(function () {
  if (window.__AIDR_RIGHT_PANE_COLLAPSE_CONTROLS_INSTALLED__) return;
  window.__AIDR_RIGHT_PANE_COLLAPSE_CONTROLS_INSTALLED__ = true;

  window.__aidrAssistCardCollapsed = true;
  window.__aidrRebuildCardCollapsed = true;

  function setDisplay(id, visible) {
    const el = document.getElementById(id);
    if (!el) return;
    el.style.display = visible ? "" : "none";
  }

  function setIcon(id, collapsed) {
    const el = document.getElementById(id);
    if (!el) return;
    el.textContent = collapsed ? "▸" : "▾";
  }

  function setAssistCardCollapsed(collapsed, reason = "set") {
    window.__aidrAssistCardCollapsed = !!collapsed;
    setDisplay("aidrAssistCompactBody", !collapsed);
    setIcon("aidrAssistToggleIcon", collapsed);

    if (typeof log === "function") {
      log(`assist card ${collapsed ? "closed" : "open"} reason=${reason}`);
    }
  }

  function setRebuildCardCollapsed(collapsed, reason = "set") {
    window.__aidrRebuildCardCollapsed = !!collapsed;
    setDisplay("rebuildCompactBody", !collapsed);
    setIcon("rebuildToggleIcon", collapsed);

    if (typeof log === "function") {
      log(`rebuild card ${collapsed ? "closed" : "open"} reason=${reason}`);
    }
  }

  function toggleAssistCardFixed() {
    setAssistCardCollapsed(!window.__aidrAssistCardCollapsed, "manual-toggle");
  }

  function toggleRebuildCardFixed() {
    setRebuildCardCollapsed(!window.__aidrRebuildCardCollapsed, "manual-toggle");
  }

  function closeDefaultRightCards() {
    setAssistCardCollapsed(true, "default");
    setRebuildCardCollapsed(true, "default");
  }

  function openAssistCard(reason = "open-assist") {
    setAssistCardCollapsed(false, reason);
  }

  function openRebuildCard(reason = "open-rebuild") {
    setRebuildCardCollapsed(false, reason);
  }

  function normText(value) {
    return String(value || "").replace(/\s+/g, " ").trim();
  }

  document.addEventListener("click", function (event) {
    const btn = event.target && event.target.closest("button");
    if (!btn) return;

    const text = normText(btn.textContent);

    if (text.includes("PPTXを書き出す") || text.includes("Export PPTX")) {
      setTimeout(() => openRebuildCard("after-pptx-export"), 800);
      setTimeout(() => openRebuildCard("after-pptx-export"), 1800);
      return;
    }

    if (text.includes("再構成後") || text.includes("Reconstructed")) {
      setTimeout(() => openAssistCard("switch-to-reconstructed"), 80);
      setTimeout(() => openAssistCard("switch-to-reconstructed"), 300);
      return;
    }
  }, true);

  document.addEventListener("DOMContentLoaded", function () {
    setTimeout(closeDefaultRightCards, 80);
    setTimeout(closeDefaultRightCards, 240);
  });

  setTimeout(closeDefaultRightCards, 300);

  window.toggleAssistCard = toggleAssistCardFixed;
  window.toggleRebuildCard = toggleRebuildCardFixed;
  window.aidrOpenAssistCard = openAssistCard;
  window.aidrOpenRebuildCard = openRebuildCard;
  window.aidrCloseDefaultRightCards = closeDefaultRightCards;

  try {
    toggleAssistCard = window.toggleAssistCard;
  } catch (e) {}

  try {
    toggleRebuildCard = window.toggleRebuildCard;
  } catch (e) {}
})();

/* Remove duplicated Assist Menu Asset Edit button */
(function () {
  if (window.__AIDR_REMOVE_DUPLICATE_ASSIST_ASSET_BUTTON_INSTALLED__) return;
  window.__AIDR_REMOVE_DUPLICATE_ASSIST_ASSET_BUTTON_INSTALLED__ = true;

  function normText(value) {
    return String(value || "").replace(/\s+/g, " ").trim();
  }

  function removeDuplicateAssistAssetButtons(reason = "sync") {
    const grids = document.querySelectorAll(".aidr-assist-menu-grid");

    grids.forEach((grid) => {
      const buttons = Array.from(grid.querySelectorAll("button.aidr-assist-menu-btn"));
      const assetButtons = buttons.filter((btn) => {
        const onclick = btn.getAttribute("onclick") || "";
        const text = normText(btn.textContent);
        return (
          btn.id === "assistAssetEditBtn" ||
          btn.dataset.i18n === "assist.assetEdit" ||
          onclick.includes("setAssistMode('asset')") ||
          onclick.includes('setAssistMode("asset")') ||
          text === "Asset Edit" ||
          text === "素材編集"
        );
      });

      assetButtons.slice(1).forEach((btn) => btn.remove());
    });

    if (typeof log === "function") {
      log(`assist asset duplicate cleanup: ${reason}`);
    }
  }

  document.addEventListener("DOMContentLoaded", () => {
    setTimeout(() => removeDuplicateAssistAssetButtons("dom-ready"), 80);
    setTimeout(() => removeDuplicateAssistAssetButtons("dom-ready"), 240);
  });

  const observer = new MutationObserver(() => {
    removeDuplicateAssistAssetButtons("mutation");
  });

  setTimeout(() => {
    removeDuplicateAssistAssetButtons("init");

    const card = document.getElementById("aidrAssistMenuCard");
    if (card && !card.__aidrAssistAssetCleanupObserved) {
      card.__aidrAssistAssetCleanupObserved = true;
      observer.observe(card, {
        childList: true,
        subtree: true,
      });
    }
  }, 0);

  window.removeDuplicateAssistAssetButtons = removeDuplicateAssistAssetButtons;
})();





/* Keep only fixed Assist Menu collapse icon */
(function () {
  if (window.__AIDR_FIXED_ASSIST_COLLAPSE_CLEANUP_INSTALLED__) return;
  window.__AIDR_FIXED_ASSIST_COLLAPSE_CLEANUP_INSTALLED__ = true;

  function normText(value) {
    return String(value || "").replace(/\s+/g, " ").trim();
  }

  function cleanupAssistCollapseDuplicates(reason = "sync") {
    const card = document.getElementById("aidrAssistMenuCard");
    if (!card) return;

    // Remove old injected Assist collapse button.
    const legacyBtn = document.getElementById("assistMenuCollapseBtn");
    if (legacyBtn) legacyBtn.remove();

    // Remove old injected carets inside Assist Menu only.
    card.querySelectorAll(".aidr-assist-menu-caret, .aidr-fold-caret, .aidr-stable-fold-caret").forEach((el) => {
      if (el.id === "aidrAssistToggleIcon") return;
      el.remove();
    });

    // Remove extra triangle-only spans inside Assist Menu.
    card.querySelectorAll("span").forEach((span) => {
      const text = normText(span.textContent);
      if ((text === "▾" || text === "▸") && span.id !== "aidrAssistToggleIcon") {
        span.remove();
      }
    });

    // Keep official fixed icon visible.
    const officialIcon = document.getElementById("aidrAssistToggleIcon");
    if (officialIcon) {
      officialIcon.style.display = "";
    }

    const head = card.querySelector(".aidr-assist-collapse-head");
    if (head) {
      head.style.display = "flex";
      head.style.width = "100%";
    }

    if (typeof log === "function") {
      log(`assist collapse duplicate cleanup: ${reason}`);
    }
  }

  document.addEventListener("DOMContentLoaded", function () {
    setTimeout(() => cleanupAssistCollapseDuplicates("dom-ready"), 80);
    setTimeout(() => cleanupAssistCollapseDuplicates("dom-ready"), 240);
  });

  const observer = new MutationObserver(function () {
    cleanupAssistCollapseDuplicates("mutation");
  });

  setTimeout(function () {
    cleanupAssistCollapseDuplicates("init");

    const card = document.getElementById("aidrAssistMenuCard");
    if (card && !card.__aidrAssistCollapseCleanupObserved) {
      card.__aidrAssistCollapseCleanupObserved = true;
      observer.observe(card, {
        childList: true,
        subtree: true,
      });
    }
  }, 0);

  window.cleanupAssistCollapseDuplicates = cleanupAssistCollapseDuplicates;
})();

/* Canonical Save Style implementation */
(function () {
  if (window.__AIDR_CANONICAL_SAVE_STYLE_INSTALLED__) return;
  window.__AIDR_CANONICAL_SAVE_STYLE_INSTALLED__ = true;

  function getStyleRefForSave() {
    try {
      if (typeof selectedThemeStyleRef !== "undefined" && selectedThemeStyleRef) {
        return selectedThemeStyleRef;
      }
    } catch (e) {}

    try {
      if (window.selectedThemeStyleRef) return window.selectedThemeStyleRef;
    } catch (e) {}

    const active = document.querySelector(".aidr-style-ref-chip.is-active");
    if (active?.dataset?.styleRef) return active.dataset.styleRef;

    return "";
  }

  function normalizeHex(value) {
    const raw = String(value || "").replace("#", "").trim().toUpperCase();
    return /^[0-9A-F]{6}$/.test(raw) ? raw : "";
  }

  window.saveSelectedThemeStyle = async function saveSelectedThemeStyle() {
    const styleRef = getStyleRefForSave();

    if (!styleRef) {
      log("WARN Save Style: style_ref not selected");
      return;
    }

    const fontFamily = document.getElementById("styleEditFontFamily")?.value || "";
    const fontSizeRaw = document.getElementById("styleEditFontSize")?.value || "";
    const color = normalizeHex(document.getElementById("styleEditColor")?.value || "");
    const align = document.getElementById("styleEditAlign")?.value || "left";
    const bold = !!document.getElementById("styleEditBold")?.checked;
    const italic = !!document.getElementById("styleEditItalic")?.checked;

    const payload = {
      font_family: fontFamily,
      bold,
      italic,
      align
    };

    if (fontSizeRaw) {
      payload.font_size = Number(fontSizeRaw);
    }

    if (color) {
      payload.color = color;
    }

    const status = document.getElementById("styleEditStatus");

    try {
      const res = await fetch(`/api/theme/styles/${encodeURIComponent(styleRef)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok || data.error) {
        throw new Error(data.error || `HTTP ${res.status}`);
      }

      try {
        if (typeof currentThemeStyles !== "undefined") {
          currentThemeStyles = data.styles || currentThemeStyles || {};
        }
      } catch (e) {}

      if (status) {
        status.textContent = `Saved ${styleRef}${data.theme_file_updated ? " / current theme synced" : ""}`;
      }

      log(`style saved: ${styleRef}${data.theme_file_updated ? " / theme file synced" : ""}`);

      if (window.aidrStyleDrafts && window.aidrStyleDrafts[styleRef]) {
        delete window.aidrStyleDrafts[styleRef];
        if (typeof window.updateStyleDraftBadge === "function") {
          window.updateStyleDraftBadge();
        }
        log(`style draft cleared: ${styleRef}`);
      }

      if (typeof loadThemeStyles === "function") {
        await loadThemeStyles();
      }

      if (typeof renderThemeStyles === "function") {
        renderThemeStyles();
      }

      if (typeof window.renderThemeControls === "function") {
        await window.renderThemeControls();
      }
    } catch (err) {
      if (status) {
        status.textContent = `Save Style failed: ${err.message}`;
      }
      log(`ERROR Save Style: ${err.message}`);
    }
  };

  try {
    saveSelectedThemeStyle = window.saveSelectedThemeStyle;
  } catch (e) {}
})();



/* Preserve unsaved style drafts across style_ref switching */
(function () {
  if (window.__AIDR_STYLE_DRAFT_PERSISTENCE_INSTALLED__) return;
  window.__AIDR_STYLE_DRAFT_PERSISTENCE_INSTALLED__ = true;

  const drafts = {};

  function currentStyleRef() {
    try {
      if (typeof selectedThemeStyleRef !== "undefined" && selectedThemeStyleRef) {
        return selectedThemeStyleRef;
      }
    } catch (e) {}

    try {
      if (window.selectedThemeStyleRef) return window.selectedThemeStyleRef;
    } catch (e) {}

    const active = document.querySelector(".aidr-style-ref-chip.is-active");
    return active?.dataset?.styleRef || "";
  }

  function normalizeHex(value) {
    const raw = String(value || "").replace("#", "").trim().toUpperCase();
    return /^[0-9A-F]{6}$/.test(raw) ? raw : "";
  }

  function readEditorDraft() {
    const fontFamily = document.getElementById("styleEditFontFamily")?.value || "";
    const fontSizeRaw = document.getElementById("styleEditFontSize")?.value || "";
    const color = normalizeHex(document.getElementById("styleEditColor")?.value || "");
    const align = document.getElementById("styleEditAlign")?.value || "left";
    const bold = !!document.getElementById("styleEditBold")?.checked;
    const italic = !!document.getElementById("styleEditItalic")?.checked;

    const draft = {
      font_family: fontFamily,
      bold,
      italic,
      align
    };

    if (fontSizeRaw !== "") draft.font_size = Number(fontSizeRaw);
    if (color) draft.color = color;

    return draft;
  }

  function writeEditorDraft(draft) {
    if (!draft) return;

    const fontFamily = document.getElementById("styleEditFontFamily");
    const fontSize = document.getElementById("styleEditFontSize");
    const color = document.getElementById("styleEditColor");
    const colorSwatch = document.getElementById("styleEditColorSwatch");
    const align = document.getElementById("styleEditAlign");
    const bold = document.getElementById("styleEditBold");
    const italic = document.getElementById("styleEditItalic");

    if (fontFamily && draft.font_family) fontFamily.value = draft.font_family;
    if (fontSize && draft.font_size !== undefined) fontSize.value = draft.font_size;
    if (color && draft.color) color.value = draft.color;
    if (colorSwatch && draft.color) colorSwatch.style.background = `#${draft.color}`;
    if (align && draft.align) align.value = draft.align;

    if (bold) bold.checked = !!draft.bold;
    if (italic) italic.checked = !!draft.italic;

    syncToggleButtons();
    syncAlignButtons(draft.align);
  }

  function syncToggleButtons() {
    const bold = document.getElementById("styleEditBold");
    const italic = document.getElementById("styleEditItalic");
    const boldBtn = document.getElementById("styleEditBoldBtn");
    const italicBtn = document.getElementById("styleEditItalicBtn");

    if (boldBtn && bold) boldBtn.classList.toggle("active", !!bold.checked);
    if (italicBtn && italic) italicBtn.classList.toggle("active", !!italic.checked);
  }

  function syncAlignButtons(value) {
    if (!value) return;
    document.querySelectorAll(".style-segment-btn").forEach(btn => {
      const text = (btn.textContent || "").trim().toLowerCase();
      btn.classList.toggle("active", text === String(value).toLowerCase());
    });
  }

  function saveCurrentDraft(reason = "auto") {
    const ref = currentStyleRef();
    if (!ref) return;

    const hasEditor = document.getElementById("styleEditFontFamily") ||
      document.getElementById("styleEditFontSize") ||
      document.getElementById("styleEditColor");

    if (!hasEditor) return;

    drafts[ref] = readEditorDraft();

    const status = document.getElementById("styleEditStatus");
    if (status && reason !== "silent") {
      status.textContent = `Draft kept for ${ref}. Save Style writes it to the theme.`;
    }
  }

  function restoreDraftForCurrent() {
    const ref = currentStyleRef();
    if (!ref || !drafts[ref]) return;

    writeEditorDraft(drafts[ref]);

    const status = document.getElementById("styleEditStatus");
    if (status) {
      status.textContent = `Unsaved draft restored for ${ref}.`;
    }
  }

  function updateDraftFromInput() {
    saveCurrentDraft("silent");
  }

  // Stabilize B / I buttons, especially for left.p.
  window.toggleStyleBool = function toggleStyleBool(inputId) {
    const input = document.getElementById(inputId);
    if (!input) return;

    input.checked = !input.checked;
    syncToggleButtons();
    saveCurrentDraft("silent");
  };

  // Capture style_ref switching before the existing handlers re-render the editor.
  document.addEventListener("pointerdown", function (event) {
    const chip = event.target?.closest?.(".aidr-style-ref-chip");
    if (chip) {
      saveCurrentDraft("silent");
    }
  }, true);

  // Keep drafts updated while editing.
  document.addEventListener("input", function (event) {
    const target = event.target;
    if (!target) return;

    if (
      target.id === "styleEditFontFamily" ||
      target.id === "styleEditFontSize" ||
      target.id === "styleEditColor" ||
      target.id === "styleEditAlign"
    ) {
      updateDraftFromInput();
    }
  }, true);

  document.addEventListener("click", function (event) {
    const target = event.target;
    if (!target) return;

    if (target.closest?.("#styleEditBoldBtn")) {
      event.preventDefault();
      event.stopImmediatePropagation();
      event.stopPropagation();
      window.toggleStyleBool("styleEditBold");
      return;
    }

    if (target.closest?.("#styleEditItalicBtn")) {
      event.preventDefault();
      event.stopImmediatePropagation();
      event.stopPropagation();
      window.toggleStyleBool("styleEditItalic");
      return;
    }

    if (target.closest?.(".style-segment-btn")) {
      window.setTimeout(() => saveCurrentDraft("silent"), 0);
    }
  }, true);

  // Restore draft after renderThemeStyles / renderStyleEditor rerenders the editor.
  function patchRender(name) {
    const original = window[name];
    if (typeof original !== "function" || original.__aidrStyleDraftPersistencePatched) return;

    function patched(...args) {
      const result = original.apply(this, args);
      window.setTimeout(restoreDraftForCurrent, 0);
      window.setTimeout(restoreDraftForCurrent, 80);
      return result;
    }

    patched.__aidrStyleDraftPersistencePatched = true;
    window[name] = patched;

    try {
      if (name === "renderThemeStyles") renderThemeStyles = patched;
      if (name === "renderStyleEditor") renderStyleEditor = patched;
    } catch (e) {}
  }

  patchRender("renderThemeStyles");
  patchRender("renderStyleEditor");

  window.aidrStyleDrafts = drafts;
})();



/* Save all unsaved style drafts */
(function () {
  if (window.__AIDR_SAVE_ALL_STYLE_DRAFTS_INSTALLED__) return;
  window.__AIDR_SAVE_ALL_STYLE_DRAFTS_INSTALLED__ = true;

  function safeLog(message) {
    if (typeof log === "function") log(message);
    else console.log(message);
  }

  function normalizeHex(value) {
    const raw = String(value || "").replace("#", "").trim().toUpperCase();
    return /^[0-9A-F]{6}$/.test(raw) ? raw : "";
  }

  function currentStyleRef() {
    try {
      if (typeof selectedThemeStyleRef !== "undefined" && selectedThemeStyleRef) {
        return selectedThemeStyleRef;
      }
    } catch (e) {}

    try {
      if (window.selectedThemeStyleRef) return window.selectedThemeStyleRef;
    } catch (e) {}

    const active = document.querySelector(".aidr-style-ref-chip.is-active");
    return active?.dataset?.styleRef || "";
  }

  function readCurrentEditorDraft() {
    const fontFamily = document.getElementById("styleEditFontFamily")?.value || "";
    const fontSizeRaw = document.getElementById("styleEditFontSize")?.value || "";
    const color = normalizeHex(document.getElementById("styleEditColor")?.value || "");
    const align = document.getElementById("styleEditAlign")?.value || "left";
    const bold = !!document.getElementById("styleEditBold")?.checked;
    const italic = !!document.getElementById("styleEditItalic")?.checked;

    const draft = {
      font_family: fontFamily,
      bold,
      italic,
      align
    };

    if (fontSizeRaw !== "" && Number.isFinite(Number(fontSizeRaw))) {
      draft.font_size = Number(fontSizeRaw);
    }

    if (color) {
      draft.color = color;
    }

    return draft;
  }

  function keepCurrentDraft() {
    const ref = currentStyleRef();
    if (!ref) return;

    window.aidrStyleDrafts = window.aidrStyleDrafts || {};
    window.aidrStyleDrafts[ref] = readCurrentEditorDraft();
  }

  function buildPayload(draft) {
    const payload = {};

    if (draft.font_family) payload.font_family = draft.font_family;
    if (draft.font_size !== undefined && Number.isFinite(Number(draft.font_size))) {
      payload.font_size = Number(draft.font_size);
    }

    const color = normalizeHex(draft.color || "");
    if (color) payload.color = color;

    payload.bold = !!draft.bold;
    payload.italic = !!draft.italic;

    const align = String(draft.align || "left").toLowerCase();
    payload.align = ["left", "center", "right"].includes(align) ? align : "left";

    return payload;
  }

  async function saveOneDraft(styleRef, draft) {
    const res = await fetch(`/api/theme/styles/${encodeURIComponent(styleRef)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(buildPayload(draft))
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok || data.error) {
      throw new Error(`${styleRef}: ${data.error || `HTTP ${res.status}`}`);
    }

    return data;
  }

  function injectSaveAllButton() {
    const row =
      document.querySelector(".selected-style-item .aidr-action-row") ||
      document.querySelector(".selected-style-item .style-edit-actions") ||
      document.querySelector(".style-edit-actions");

    if (!row || document.getElementById("aidrSaveAllStyleDraftsBtn")) return;

    const btn = document.createElement("button");
    btn.type = "button";
    btn.id = "aidrSaveAllStyleDraftsBtn";
    btn.className = "btn compact-action";
    btn.textContent = uiText("settings.saveAllDrafts");
    btn.title = uiText("settings.saveAllDraftsTitle");

    row.appendChild(btn);
  }

  window.aidrSaveAllStyleDrafts = async function aidrSaveAllStyleDrafts() {
    keepCurrentDraft();

    const drafts = window.aidrStyleDrafts || {};
    const entries = Object.entries(drafts).filter(([ref, draft]) => ref && draft);

    const status = document.getElementById("styleEditStatus");

    if (!entries.length) {
      if (status) status.textContent = uiText("settings.noStyleDraftsToSave");
      safeLog("style drafts: none to save");
      return;
    }

    let saved = 0;
    let synced = 0;

    try {
      for (const [styleRef, draft] of entries) {
        const data = await saveOneDraft(styleRef, draft);
        saved += 1;
        if (data.theme_file_updated) synced += 1;

        try {
          if (typeof currentThemeStyles !== "undefined" && data.styles) {
            currentThemeStyles = data.styles;
          }
        } catch (e) {}
      }

      if (typeof loadThemeStyles === "function") {
        await loadThemeStyles();
      }

      if (typeof renderThemeStyles === "function") {
        renderThemeStyles();
      }

      if (typeof window.renderThemeControls === "function") {
        await window.renderThemeControls();
      }

      if (status) {
        status.textContent = synced
          ? formatUiText("settings.saveAllDraftsSavedSynced", { saved })
          : formatUiText("settings.saveAllDraftsSaved", { saved });
      }

      safeLog(`style drafts saved: ${saved}${synced ? " / theme file synced" : ""}`);

      Object.keys(window.aidrStyleDrafts || {}).forEach(key => delete window.aidrStyleDrafts[key]);

      if (typeof window.updateStyleDraftBadge === "function") {
        window.updateStyleDraftBadge();
      }

      if (status && saved > 0) {
        status.textContent = `Saved ${saved} style draft(s) / drafts cleared.`;
      }

      safeLog(`style drafts cleared: ${saved}`);
    } catch (err) {
      if (status) status.textContent = formatUiText("settings.saveAllDraftsFailed", { message: err.message });
      safeLog(`ERROR Save All Drafts: ${err.message}`);
    }
  };

  document.addEventListener("click", function (event) {
    const btn = event.target?.closest?.("#aidrSaveAllStyleDraftsBtn");
    if (!btn) return;

    event.preventDefault();
    event.stopPropagation();
    window.aidrSaveAllStyleDrafts();
  }, true);

  function runSoon() {
    window.setTimeout(injectSaveAllButton, 0);
    window.setTimeout(injectSaveAllButton, 120);
    window.setTimeout(injectSaveAllButton, 300);
  }

  window.ensureStyleActionButtons = injectSaveAllButton;

  document.addEventListener("input", function (event) {
    const target = event.target;
    if (!target) return;

    if (
      target.id === "styleEditFontFamily" ||
      target.id === "styleEditFontSize" ||
      target.id === "styleEditColor" ||
      target.id === "styleEditAlign"
    ) {
      keepCurrentDraft();
    }
  }, true);

  runSoon();
})();



/* Style action row alignment and draft status */
(function () {
  if (window.__AIDR_STYLE_ACTION_ROW_STATUS_INSTALLED__) return;
  window.__AIDR_STYLE_ACTION_ROW_STATUS_INSTALLED__ = true;

  function currentStyleRef() {
    try {
      if (typeof selectedThemeStyleRef !== "undefined" && selectedThemeStyleRef) {
        return selectedThemeStyleRef;
      }
    } catch (e) {}

    try {
      if (window.selectedThemeStyleRef) return window.selectedThemeStyleRef;
    } catch (e) {}

    const active = document.querySelector(".aidr-style-ref-chip.is-active");
    return active?.dataset?.styleRef || "";
  }

  function draftKeys() {
    return Object.keys(window.aidrStyleDrafts || {}).filter(k => k && window.aidrStyleDrafts[k]);
  }

  function ensureDraftBadge(row) {
    if (!row) return null;

    let badge = document.getElementById("aidrStyleDraftStatus");
    if (!badge) {
      badge = document.createElement("div");
      badge.id = "aidrStyleDraftStatus";
      badge.className = "aidr-style-draft-status";
      row.insertAdjacentElement("afterend", badge);
    }

    return badge;
  }

  function updateDraftBadge() {
    const row =
      document.querySelector(".selected-style-item .aidr-action-row") ||
      document.querySelector(".selected-style-item .style-edit-actions") ||
      document.querySelector(".style-edit-actions");

    if (!row) return;

    row.classList.add("aidr-style-actions-row");

    const badge = ensureDraftBadge(row);
    if (!badge) return;

    const keys = draftKeys();
    const current = currentStyleRef();

    if (!keys.length) {
      badge.textContent = "Drafts kept: 0";
      badge.classList.remove("has-drafts");
      return;
    }

    badge.textContent = `Drafts kept: ${keys.length}${current && keys.includes(current) ? ` / editing ${current}` : ""}`;
    badge.classList.add("has-drafts");
  }

  window.updateStyleDraftBadge = updateDraftBadge;

  function reorderButtons() {
    const row =
      document.querySelector(".selected-style-item .aidr-action-row") ||
      document.querySelector(".selected-style-item .style-edit-actions") ||
      document.querySelector(".style-edit-actions");

    if (!row) return;

    const buttons = Array.from(row.querySelectorAll("button"));
    const saveLabels = new Set(["Save Style", uiText("settings.saveStyle")]);
    const saveAllLabels = new Set(["Save All Drafts", uiText("settings.saveAllDrafts")]);
    const save = buttons.find((btn) => saveLabels.has((btn.textContent || "").trim()));
    const saveAll = buttons.find((btn) => saveAllLabels.has((btn.textContent || "").trim()));

    [save, saveAll].forEach(btn => {
      if (btn && btn.parentElement === row) row.appendChild(btn);
    });

    row.classList.add("aidr-style-actions-row");
  }

  function runSoon() {
    window.setTimeout(() => {
      if (typeof window.ensureStyleActionButtons === "function") {
        window.ensureStyleActionButtons();
      }
      reorderButtons();
      updateDraftBadge();
    }, 0);

    window.setTimeout(() => {
      if (typeof window.ensureStyleActionButtons === "function") {
        window.ensureStyleActionButtons();
      }
      reorderButtons();
      updateDraftBadge();
    }, 160);

    window.setTimeout(() => {
      if (typeof window.ensureStyleActionButtons === "function") {
        window.ensureStyleActionButtons();
      }
      reorderButtons();
      updateDraftBadge();
    }, 360);
  }

  const originalRender = window.renderThemeStyles;
  if (typeof originalRender === "function" && !originalRender.__aidrStyleActionRowLayoutPatched) {
    function patchedRenderThemeStyles(...args) {
      const result = originalRender.apply(this, args);
      runSoon();
      return result;
    }

    patchedRenderThemeStyles.__aidrStyleActionRowLayoutPatched = true;
    window.renderThemeStyles = patchedRenderThemeStyles;

    try {
      renderThemeStyles = patchedRenderThemeStyles;
    } catch (e) {}
  }

  document.addEventListener("input", function (event) {
    const target = event.target;
    if (!target) return;

    if (
      target.id === "styleEditFontFamily" ||
      target.id === "styleEditFontSize" ||
      target.id === "styleEditColor" ||
      target.id === "styleEditAlign"
    ) {
      window.setTimeout(updateDraftBadge, 0);
    }
  }, true);

  document.addEventListener("click", function (event) {
    const target = event.target;
    if (!target) return;

    if (
      target.closest?.(".aidr-style-ref-chip") ||
      target.closest?.("#styleEditBoldBtn") ||
      target.closest?.("#styleEditItalicBtn") ||
      target.closest?.(".style-segment-btn") ||
      target.closest?.("#aidrSaveAllStyleDraftsBtn")
    ) {
      runSoon();
    }
  }, true);

  runSoon();
})();



/* Style color modal escape and draft badge refresh */
(function () {
  if (window.__AIDR_STYLE_COLOR_MODAL_REFRESH_INSTALLED__) return;
  window.__AIDR_STYLE_COLOR_MODAL_REFRESH_INSTALLED__ = true;

  // Escape closes the palette like Cancel.
  document.addEventListener("keydown", function (event) {
    if (event.key !== "Escape") return;

    const pop = document.getElementById("styleColorPopover");
    if (pop && pop.style.display !== "none") {
      event.preventDefault();
      event.stopPropagation();
      if (typeof window.closeStyleColorPopover === "function") {
        window.closeStyleColorPopover();
      }
    }
  }, true);

  function refreshStyleColorModalState() {
    if (typeof window.ensureStyleColorPopoverBackdrop === "function") {
      window.ensureStyleColorPopoverBackdrop();
    }

    if (typeof window.updateStyleDraftBadge === "function") {
      window.updateStyleDraftBadge();
    }
  }

  function runSoon() {
    window.setTimeout(refreshStyleColorModalState, 0);
    window.setTimeout(refreshStyleColorModalState, 250);
  }

  runSoon();

  document.addEventListener("click", function (event) {
    if (
      event.target?.closest?.("#aidrSaveAllStyleDraftsBtn") ||
      event.target?.closest?.(".aidr-style-ref-chip") ||
      event.target?.closest?.("#styleEditBoldBtn") ||
      event.target?.closest?.("#styleEditItalicBtn") ||
      event.target?.closest?.(".style-segment-btn")
    ) {
      runSoon();
    }
  }, true);
})();



/* Canonical Text Settings align control */
(function () {
  if (window.__AIDR_TEXT_SETTINGS_ALIGN_CONTROL_INSTALLED__) return;
  window.__AIDR_TEXT_SETTINGS_ALIGN_CONTROL_INSTALLED__ = true;

  function safeLog(message) {
    if (typeof log === "function") log(message);
    else console.log(message);
  }

  function currentStyleRef() {
    try {
      if (typeof selectedThemeStyleRef !== "undefined" && selectedThemeStyleRef) {
        return selectedThemeStyleRef;
      }
    } catch (e) {}

    try {
      if (window.selectedThemeStyleRef) return window.selectedThemeStyleRef;
    } catch (e) {}

    const active = document.querySelector(".aidr-style-ref-chip.is-active");
    return active?.dataset?.styleRef || "";
  }

  function normalizeAlign(value) {
    const align = String(value || "").trim().toLowerCase();
    return ["left", "center", "right"].includes(align) ? align : "left";
  }

  function syncAlignButtons(align) {
    const normalized = normalizeAlign(align);

    document.querySelectorAll(".style-segment-btn").forEach(btn => {
      const text = (btn.textContent || "").trim().toLowerCase();
      btn.classList.toggle("active", text === normalized);
    });
  }

  function normalizeHex(value) {
    const raw = String(value || "").replace("#", "").trim().toUpperCase();
    return /^[0-9A-F]{6}$/.test(raw) ? raw : "";
  }

  function keepFullDraftWithAlign(align) {
    const ref = currentStyleRef();
    if (!ref) return;

    window.aidrStyleDrafts = window.aidrStyleDrafts || {};

    const fontFamily = document.getElementById("styleEditFontFamily")?.value || "";
    const fontSizeRaw = document.getElementById("styleEditFontSize")?.value || "";
    const color = normalizeHex(document.getElementById("styleEditColor")?.value || "");
    const bold = !!document.getElementById("styleEditBold")?.checked;
    const italic = !!document.getElementById("styleEditItalic")?.checked;

    const draft = {
      font_family: fontFamily,
      bold,
      italic,
      align: normalizeAlign(align)
    };

    if (fontSizeRaw !== "" && Number.isFinite(Number(fontSizeRaw))) {
      draft.font_size = Number(fontSizeRaw);
    }

    if (color) {
      draft.color = color;
    }

    window.aidrStyleDrafts[ref] = draft;
  }

  window.setStyleAlign = function setStyleAlign(value) {
    const align = normalizeAlign(value);
    const input = document.getElementById("styleEditAlign");

    if (input) {
      input.value = align;
      input.dispatchEvent(new Event("input", { bubbles: true }));
      input.dispatchEvent(new Event("change", { bubbles: true }));
    }

    syncAlignButtons(align);
    keepFullDraftWithAlign(align);

    const ref = currentStyleRef();
    const status = document.getElementById("styleEditStatus");

    if (status && ref) {
      status.textContent = `Draft kept for ${ref}. Save Style writes it to the theme.`;
    }

    safeLog(`style align changed: ${ref || "-"} = ${align}`);
  };

  document.addEventListener("click", function (event) {
    const btn = event.target?.closest?.(".style-segment-btn");
    if (!btn) return;

    const align = normalizeAlign((btn.textContent || "").trim());

    event.preventDefault();
    event.stopImmediatePropagation();
    event.stopPropagation();

    window.setStyleAlign(align);
  }, true);

  function syncFromHidden() {
    const input = document.getElementById("styleEditAlign");
    if (!input) return;
    syncAlignButtons(input.value || "left");
  }

  function runSoon() {
    window.setTimeout(syncFromHidden, 0);
    window.setTimeout(syncFromHidden, 120);
    window.setTimeout(syncFromHidden, 300);
  }

  const originalRender = window.renderThemeStyles;
  if (typeof originalRender === "function" && !originalRender.__aidrTextSettingsAlignControlPatched) {
    function patchedRenderThemeStyles(...args) {
      const result = originalRender.apply(this, args);
      runSoon();
      return result;
    }

    patchedRenderThemeStyles.__aidrTextSettingsAlignControlPatched = true;
    window.renderThemeStyles = patchedRenderThemeStyles;

    try {
      renderThemeStyles = patchedRenderThemeStyles;
    } catch (e) {}
  }

  runSoon();
})();
