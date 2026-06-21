# ScoreboardApp 布局配置

## 核心布局结构

```javascript
// 外层容器
scoreArea: { flex: 1, flexDirection: 'row', alignItems: 'stretch' }

// 两侧分数面板
scorePanel: { flex: 1 }
scorePanelInner: { flex: 1, alignItems: 'center', justifyContent: 'space-around',
                   borderRadius: 12, paddingVertical: 20, width: '100%', height: '100%', position: 'relative' }

// 中间计时器面板
centerPanel: { width: 130, alignItems: 'center', justifyContent: 'flex-start',
               gap: 4, paddingTop: 24, zIndex: 2 }
```

## 横竖屏适配要点

- `scoreArea` 使用 `flexDirection: 'row'` 实现横向排列
- 两侧 `scorePanel` 使用 `flex: 1` 平分空间
- 中间 `centerPanel` 固定 `width: 130`，不会被压缩
- **禁止在 centerPanel 使用 `flex: 1`**，否则会挤压两侧面板，导致中间太宽、两侧太窄
- `scorePanelInner` 必须是 `width: '100%'` 才能正确填充
- 使用 `height: '100%'` 确保侧边框延伸到底部

## 中间面板布局结构

```
teamNameRow     [主队输入框] [VS] [客队输入框]   ← 顶部一行
timerBox (LinearGradient, onLayout 测高度) {
  TimerDisplay (时间)
  开始/暂停按钮
  设置时间按钮
  ──divider──
  "背景图" label
  bgImageRow [主队] [客队]   ← 一排, 各 flex: 1
  ──divider──
  actionRow [结算] [重置]    ← 一排, 各 flex: 1
  ──divider──
  📊 分享战绩 按钮
}
```

## 侧边框

```javascript
sideBorder: { position: 'absolute', top: 0, height: '100%', width: 3, borderRadius: 2, opacity: 0.5 }
sideBorderLeft: { right: 0 }   // 左侧面板的边框在右侧
sideBorderRight: { left: 0 }  // 右侧面板的边框在左侧
```

横屏时边线高度跟 bg 图同步: `{ backgroundColor: color, height: bgImageHeight || '100%' }`

## 信息列位置

```javascript
// 主队（左侧面板）：infoColumn 在右侧
infoColumn: { position: 'absolute', top: '15%', alignItems: 'center' }
infoColumnLeft: { left: 0, paddingLeft: 8 }
infoColumnRight: { right: 0, paddingRight: 8, alignItems: 'flex-end' }
```

队名和胜负信息通过条件判断：
```javascript
<View style={[styles.infoColumn, side === 'left' ? styles.infoColumnRight : styles.infoColumnLeft]}>
```

## TimerDisplay 字号（窄面板适配）

centerPanel 宽 130、内边距 8，可用宽度 114。原始 `fontSize: 36 + letterSpacing: 4` 偶尔会折成两行。当前配置：

```javascript
timerText: { fontSize: 30, letterSpacing: 2, textAlign: 'center' }
// JSX
<Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
```

`adjustsFontSizeToFit` + `minimumFontScale={0.7}` 是最后保险：即使未来出现 5+ 位时间（如 100:00）也只会缩字号而不折行。

## 滚轮组件样式

```javascript
drumWheel:     { width: 72, height: 180, borderRadius: 12, backgroundColor: 'rgba(0,0,0,0.35)',
                 borderWidth: 1, borderColor: 'rgba(255,255,255,0.10)', overflow: 'hidden' }
drumGradient:  { position: 'absolute', left: 0, right: 0, height: 68, zIndex: 2 }
drumSelectionIndicator: { position: 'absolute', top: '50%', left: 0, right: 0,
                 height: 44, transform: [{ translateY: -22 }],
                 backgroundColor: 'rgba(255,255,255,0.10)',
                 borderTopWidth: 1, borderBottomWidth: 1,
                 borderColor: 'rgba(255,255,255,0.20)', zIndex: 3 }

// 文本 (玻璃化)
drumItem:         { height: 44, alignItems: 'center', justifyContent: 'center' }
drumItemText:     { fontSize: 24, fontWeight: '500', color: 'rgba(255,255,255,0.4)' }
drumItemSelected: { color: GLASS.textOnGlass, fontWeight: '700' }
```

**zIndex 关键点**：`drumSelectionIndicator` 必须在 `drumGradient` 之上（3 > 2）才能让白色高亮条盖住淡出渐变。

**横屏 drumWheel 缩到 100dp 时**: `paddingVertical = (100-44)/2 = 28`, 选中项在 y=50。中心 44px 区域仍由 `drumSelectionIndicator` 高亮, 中间 44px 干净。

## 底部行（-1 按钮）

- 位置：`scoreArea` **外部**，紧跟在 `</View>` 关闭 scoreArea 之后、`showPicker` 条件渲染之前
- 作用：让 -1 按钮在屏幕最底部，与中间面板的队名输入框视觉齐平，但又不被背景图覆盖
- 结构：**镜像 scoreArea 3 槽布局** `[flex:1, 130dp, flex:1]`，让 -1 按钮自然落在各自 score panel 中心

```javascript
bottomRow:    { flexDirection: 'row', alignItems: 'center' }
bottomSide:   { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 6 }
bottomCenter: { width: 130 }   // 匹配 centerPanel 宽度

// JSX
<View style={styles.bottomRow} pointerEvents="box-none">
  <View style={styles.bottomSide}>
    <Pressable onPress={() => subScore(0)} style={[styles.miniBtn, { borderColor: '#3b82f633' }]}>
      <Text style={styles.miniBtnText}>-1</Text>
    </Pressable>
  </View>
  <View style={styles.bottomCenter} />
  <View style={styles.bottomSide}>
    <Pressable onPress={() => subScore(1)} style={[styles.miniBtn, { borderColor: '#f9731633' }]}>
      <Text style={styles.miniBtnText}>-1</Text>
    </Pressable>
  </View>
</View>
```

**关键点**：
- `ScorePanel` 已移除 `onSub` prop 和内部的 `buttonRow`，减分逻辑完全在父组件通过底部行触发
- 队名输入框**不**在 bottomRow 里，在 `centerPanel.teamNameRow`（顶部独立一行）
- `pointerEvents="box-none"` 让空白 slot 不阻挡上层点击穿透
- **用 `flex:1 + 130 + flex:1` 而不是 3 等分**——否则 -1 不会落在 score panel 中心

## 背景图尺寸自适应

```javascript
import { useWindowDimensions } from 'react-native';
const { width: winW, height: winH } = useWindowDimensions();
const isLandscape = winW > winH;
const [centerH, setCenterH] = useState(0);

<LinearGradient
  colors={['#0a1628', '#0f1f35']} style={styles.timerBox}
  onLayout={(e) => setCenterH(e.nativeEvent.layout.height)}
>
  ...controls + 队名 inputs...
</LinearGradient>

<ScorePanel bgImageHeight={isLandscape ? centerH : undefined} ... />

// ScorePanel 内
style={bgImageHeight
  ? { width: '100%', height: bgImageHeight, alignItems: 'center', justifyContent: 'space-around', borderRadius: 12, paddingVertical: 20, position: 'relative' }
  : styles.bgImageFill}
```

- 竖屏 (`isLandscape=false`)：`bgImageHeight = undefined`，bg 图走 `styles.bgImageFill`（`flex:1`），填满 score panel（≈ 全屏）
- 横屏 (`isLandscape=true`)：`bgImageHeight = centerH`（timerBox 实测 dp 高度），bg 图与中间面板内容框视觉齐平

## "背景图" label 居中

```javascript
bgImageSectionLabel: { fontSize: 9, letterSpacing: 2, color: '#475569', textTransform: 'uppercase', alignSelf: 'center' }   // 旧: flex-start
```

让 label 与下面的 ＋主队/＋客队 按钮（`alignItems: 'center'`）在 center panel 水平居中线上对齐。

## 横屏 bg 图 / 边线 / timerBox 底部对齐

```javascript
// 父组件: 传 bgImageHeight + bgImageTop 到 ScorePanel
<ScorePanel
  bgImageHeight={isLandscape ? centerH : undefined}
  bgImageTop={isLandscape ? 30 : 0}     // 30 dp = 90 device px 偏移
  ...
/>

// ScorePanel 内
// 1. bg 图
style={bgImageHeight
  ? { width: '100%', height: bgImageHeight, marginTop: bgImageTop || 0,
      alignItems: 'center', justifyContent: 'space-around',
      borderRadius: 12, paddingVertical: 20, position: 'relative' }
  : styles.bgImageFill}

// 2. 边线 (左蓝 / 右橙)
<View style={[
  styles.sideBorder,
  side === 'left' ? styles.sideBorderLeft : styles.sideBorderRight,
  { backgroundColor: color, height: bgImageHeight || '100%' },
]} />
```

**关键**：
- `bgImageHeight` 让 bg 图与 timerBox 同高
- `bgImageTop: 30` 把 bg 图压下来, 让 bg 图底部 = timerBox 底部 (都在 y=1072)
- 边线同步 `bgImageHeight`, 不再比 bg 图长/短

## 中间面板横竖屏分逻辑

```javascript
import { useWindowDimensions } from 'react-native';
const { width: winW, height: winH } = useWindowDimensions();
const isLandscape = winW > winH;

// 横屏: 内容贴顶 (与 bg 图对齐 + 让出状态栏)
// 竖屏: 内容垂直居中, 顶部加 80 dp 留白避开状态栏
const centerPanelDynamicStyle = isLandscape
  ? { justifyContent: 'flex-start', paddingTop: 24 }
  : { justifyContent: 'center', paddingTop: 80 };

<View style={[styles.centerPanel, centerPanelDynamicStyle]}>
  {/* teamNameRow (主队输入框 | VS | 客队输入框) */}
  {/* timerBox (LinearGradient, onLayout 测高度) */}
</View>
```

| 方向 | 内容位置 | 顶部偏移 | 底部位置 |
|---|---|---|---|
| 横屏 | 贴顶 | paddingTop 24 dp (让出状态栏) | y=1072 (跟 bg 图对齐) |
| 竖屏 | 垂直居中 | paddingTop 80 dp (避开状态栏) | 不贴底 (在 score panel 中间) |

## TimePickerModal 横竖屏分逻辑

```javascript
// 1. DrumPicker 接受 wheelHeight prop
function DrumPicker({ value, options, onChange, label, wheelHeight }) {
  const wH = wheelHeight || DRUM_WHEEL_HEIGHT;
  const PADDING = (wH - DRUM_ITEM_HEIGHT) / 2;
  return (
    <View style={[styles.drumWheel, { height: wH }]}>
      <ScrollView contentContainerStyle={{ paddingVertical: PADDING }}>
        ...
      </ScrollView>
    </View>
  );
}

// 2. TimePickerModal 用 useWindowDimensions 分逻辑
function TimePickerModal({ onConfirm, onClose, initialMinutes, initialSeconds }) {
  const [m, setM] = useState(initialMinutes);
  const [s, setS] = useState(initialSeconds);
  const { width: winW, height: winH } = useWindowDimensions();
  const isLandscape = winW > winH;
  const drumH = isLandscape ? 100 : DRUM_WHEEL_HEIGHT;

  return (
    <Pressable style={styles.modalOverlay} onPress={onClose}>
      <Pressable onPress={(e) => e.stopPropagation()}>
        <LinearGradient
          colors={['#0f172a', '#1e293b']}
          style={[styles.modalContent, isLandscape && styles.modalContentLandscape]}
        >
          <Text style={styles.modalTitle}>设置时间</Text>
          <View style={styles.timeRow}>
            <DrumPicker value={m} options={minuteOpts} onChange={setM} label="分钟" wheelHeight={drumH} />
            <Text style={[styles.timeSeparator, isLandscape && styles.timeSeparatorLandscape]}>:</Text>
            <DrumPicker value={s} options={secondOpts} onChange={setS} label="秒" wheelHeight={drumH} />
          </View>
          <Text style={[styles.timePreview, isLandscape && styles.timePreviewLandscape]}>...</Text>
          <View style={styles.modalButtons}>...</View>
        </LinearGradient>
      </Pressable>
    </Pressable>
  );
}

// 3. 横屏紧凑样式
modalContentLandscape:    { padding: 14, gap: 8, borderRadius: 16, minWidth: 220 }
timeSeparatorLandscape:  { fontSize: 28, marginTop: 0 }   // 44 → 28
timePreviewLandscape:    { fontSize: 22 }                // 32 → 22
```

### 弹窗玻璃化 (Glassmorphism 4 维度)

```js
// modalContent: 暗色 + BlurView 模糊主界面 + 玻璃 + 边框 + 阴影
modalContent: { borderRadius: 22, padding: 28, alignItems: 'center', gap: 20, minWidth: 260,
                overflow: 'hidden', backgroundColor: 'rgba(0,0,0,0.42)',
                shadowColor: '#000', shadowOffset: {0,16}, shadowOpacity: 0.4, shadowRadius: 32, elevation: 12 }

// 弹窗 4 层结构 (同 timerBox 模板)
<View style={styles.modalContent}>
  <View style={[StyleSheet.absoluteFill, { backgroundColor: 'transparent' }]} pointerEvents="none" />  // 占位
  <BlurView intensity={40} tint="dark" style={StyleSheet.absoluteFill} />
  <View style={[StyleSheet.absoluteFill, styles.modalGlassFill]} pointerEvents="none" />     // 12% 白
  <View style={[StyleSheet.absoluteFill, styles.modalGlassBorder]} pointerEvents="none" />   // 1px 15% 白边
  ...内容...
</View>

// 弹窗内按钮
modalBtn: { flex: 1, paddingVertical: 10, borderRadius: 12, backgroundColor: GLASS.btnGlass,
             borderWidth: 1, borderColor: GLASS.btnGlassBorder }
modalBtnConfirm: { backgroundColor: GLASS.iOSGreen, borderColor: 'rgba(52,199,89,0.4)' }  // 系统绿高亮
```

**关键点**：
- `drumWheel` 默认 180 dp, 接受 `wheelHeight` prop 横屏可缩到 100 dp
- `modalContent` 基础样式保留, 横屏追加 `modalContentLandscape`（更小 padding 和 gap）
- 弹窗的 BlurView **模糊主界面** (弹窗下方整个 app)，是 iOS 弹窗的标志性效果
- 弹窗的暗色 0.42 比 timerBox 0.32 更深，因为是浮动弹窗需要"压得住"主界面
- 字号也用 `*Landscape` 后缀单独控制

**最终效果**：

| 方向 | drumWheel | 弹窗总高 | 取消/确认 | 可见 |
|---|---|---|---|---|
| 竖屏 (1200×2670) | 180 dp | ~390 dp | y=2498-2550 | ✓ |
| 横屏 (2670×1200) | 100 dp | ~210 dp | y=1070-1122 | ✓ |

## 战绩历史系统 (全屏历史页 + 分享图)

### 中间面板最底部分 (触发历史页入口)

```jsx
{/* 结算 + 重置 一排 */}
<View style={styles.actionRow}>
  <Pressable style={[styles.actionBtnSettle, styles.actionBtnHalf]}>
    <Text>结 算</Text>
  </Pressable>
  <Pressable style={[styles.actionBtnReset, styles.actionBtnHalf]}>
    <Text>重 置</Text>
  </Pressable>
</View>

<View style={styles.bgImageDivider} />

{/* 分享战绩 按钮 */}
<Pressable onPress={() => { h.medium(); setShowHistory(true); }} style={styles.shareHistoryBtn}>
  <Text style={styles.shareHistoryBtnText}>📊  分享战绩</Text>
</Pressable>
```

样式:
```js
actionRow:           { flexDirection: 'row', gap: 6, width: '100%' }
actionBtnHalf:       { flex: 1 }
shareHistoryBtn:     { width: '100%', paddingVertical: 8, borderRadius: 8,
                      backgroundColor: 'rgba(59,130,246,0.12)', borderWidth: 1, borderColor: 'rgba(59,130,246,0.35)', alignItems: 'center' }
shareHistoryBtnText: { color: '#60a5fa', fontSize: 13, fontWeight: 'bold', letterSpacing: 2 }
bgImageBtn:         { flex: 1, paddingVertical: 6, borderRadius: 8, borderWidth: 1, alignItems: 'center' }
bgImageBtnText:     { fontSize: 11, letterSpacing: 1, fontWeight: 'bold' }
bgImageRow:         { flexDirection: 'row', gap: 6, width: '100%' }
```

**BgImageBtn 改造**:
- 旧: 宽度 `width: '100%'`, 纯文字带 🖼/＋ 前缀 (`{hasImage ? '🖼 ' : '＋ '}${label}`)
- 新: `flex: 1` (在 `bgImageRow` 内平分宽度), 纯文字 (无前缀)
- 减少 timerBox 总高, 让横屏时主比分界面不溢出覆盖 -1 按钮

### HistoryPage (全屏页面, **非 Modal 叠层**)

```jsx
function HistoryPage({ history, teamAName, teamBName, onClose, onDelete, onClear, onShare }) {
  const winsA = history.filter(r => r.winner === 'A').length;
  const winsB = history.filter(r => r.winner === 'B').length;
  const ties  = history.filter(r => r.winner === 'tie').length;

  return (
    <View style={styles.historyPageRoot}>
      {/* 顶部 header: 标题居中无图标, × 关闭按钮移到下一行避免被状态栏/电池图标遮挡 */}
      <Text style={styles.historyPageTitle}>对 战 记 录</Text>
      <View style={styles.historyPageHeader}>
        <Pressable onPress={onClose} hitSlop={12} style={styles.historyPageClose}>
          <Text style={styles.historyPageCloseText}>×  关闭</Text>
        </Pressable>
      </View>

      {/* 顶部统计 */}
      <View style={styles.historyPageStats}>
        <Text style={styles.historyPageStatsText}>
          {history.length} 场 · {teamAName} <Text style={{ color: '#3b82f6' }}>{winsA}</Text>胜 · {teamBName} <Text style={{ color: '#f97316' }}>{winsB}</Text>胜{ties ? ` · ${ties}平` : ''}
        </Text>
      </View>

      <View style={styles.historyDivider} />

      {/* 列表 (占满剩余空间) */}
      {history.length === 0 ? (
        <View style={styles.historyEmpty}>
          <Text style={styles.historyEmptyText}>暂无记录</Text>
          <Text style={styles.historyEmptyHint}>结束一局就会自动保存</Text>
        </View>
      ) : (
        <ScrollView style={styles.historyPageList} showsVerticalScrollIndicator={false}>
          {history.map((r) => {
            const aWin = r.winner === 'A';
            const bWin = r.winner === 'B';
            return (
              <View key={r.id} style={styles.historyItem}>
                <View style={styles.historyItemTopRow}>
                  <Text style={[styles.historyTeam, { color: aWin ? '#3b82f6' : '#94a3b8' }]} numberOfLines={1}>
                    {aWin ? '🏆 ' : ''}{r.teamA.name}
                  </Text>
                  <View style={styles.historyScoreBox}>
                    <Text style={[styles.historyScore, { color: aWin ? '#3b82f6' : '#64748b' }]}>{r.teamA.score}</Text>
                    <Text style={styles.historyScoreSep}>:</Text>
                    <Text style={[styles.historyScore, { color: bWin ? '#f97316' : '#64748b' }]}>{r.teamB.score}</Text>
                  </View>
                  <Text style={[styles.historyTeam, { color: bWin ? '#f97316' : '#94a3b8', textAlign: 'right' }]} numberOfLines={1}>
                    {r.teamB.name}{bWin ? ' 🏆' : ''}
                  </Text>
                  <Pressable onPress={() => onDelete(r.id)} hitSlop={8} style={styles.historyDelete}>
                    <Text style={styles.historyDeleteText}>×</Text>
                  </Pressable>
                </View>
                <Text style={styles.historyMeta}>
                  {new Date(r.timestamp).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
                  {r.duration ? ` · ${r.duration}` : ''}
                </Text>
              </View>
            );
          })}
        </ScrollView>
      )}

      <View style={styles.historyDivider} />

      {/* 底部按钮 (主次两个, 固定在底部) */}
      <View style={styles.historyPageFooter}>
        <Pressable
          onPress={() => history.length > 0 ? onShare() : null}
          style={[styles.historyBtnPrimary, history.length === 0 && { opacity: 0.4 }]}
          disabled={history.length === 0}
        >
          <Text style={styles.historyBtnPrimaryText}>🖼  生成分享图</Text>
        </Pressable>
        <Pressable
          onPress={() => history.length > 0 ? onClear() : null}
          style={[styles.historyBtnDanger, history.length === 0 && { opacity: 0.4 }]}
          disabled={history.length === 0}
        >
          <Text style={styles.historyBtnDangerText}>🗑  清空记录</Text>
        </Pressable>
      </View>
    </View>
  );
}
```

样式:
```js
historyPageRoot:      { flex: 1, paddingHorizontal: 16, paddingTop: 24, paddingBottom: 16 }
historyPageHeader:    { flexDirection: 'row', alignItems: 'center', marginTop: 8, marginBottom: 12 }
historyPageTitle:     { color: '#3b82f6', fontSize: 20, fontWeight: 'bold', letterSpacing: 4, textAlign: 'center' }
historyPageClose:     { flexDirection: 'row', alignItems: 'center', paddingVertical: 6, paddingHorizontal: 12,
                       borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: '#334155' }
historyPageCloseText: { color: '#94a3b8', fontSize: 13, fontWeight: 'bold' }
historyPageStats:     { paddingVertical: 8, paddingHorizontal: 4 }
historyPageStatsText: { color: '#cbd5e1', fontSize: 14, textAlign: 'center', letterSpacing: 1 }
historyPageList:      { flex: 1 }
historyPageFooter:    { paddingTop: 12, gap: 8 }
```

**每条记录卡片 (HistoryItem)**:
```jsx
<View style={styles.historyItem}>
  <View style={styles.historyItemTopRow}>
    <Text style={[styles.historyTeam, { color: aWin ? '#3b82f6' : '#94a3b8' }]}>
      {aWin ? '🏆 ' : ''}{r.teamA.name}
    </Text>
    <View style={styles.historyScoreBox}>
      <Text style={[styles.historyScore, { color: aWin ? '#3b82f6' : '#64748b' }]}>{r.teamA.score}</Text>
      <Text style={styles.historyScoreSep}>:</Text>
      <Text style={[styles.historyScore, { color: bWin ? '#f97316' : '#64748b' }]}>{r.teamB.score}</Text>
    </View>
    <Text style={[styles.historyTeam, { color: bWin ? '#f97316' : '#94a3b8' }]}>
      {r.teamB.name}{bWin ? ' 🏆' : ''}
    </Text>
    <Pressable onPress={() => onDelete(r.id)} style={styles.historyDelete}>
      <Text style={styles.historyDeleteText}>×</Text>
    </Pressable>
  </View>
  <Text style={styles.historyMeta}>
    {timeStr}{r.duration ? ` · ${r.duration}` : ''}
  </Text>
</View>
```

### HistoryShareCard (屏幕外渲染, ViewShot 截图)

**⚠️ shareCard 故意不用 `borderRadius`**: `react-native-view-shot` 截的是矩形 bounding box, **不应用 RN 渲染时的 `borderRadius` 圆角裁剪**. 圆角会让 PNG 4 角变成透明像素, 分享到微信白底时被填成"白色倒角". 保持 `borderRadius: 0` 才能让 PNG 在任何白底上都干净. (见第十三轮修复)

```jsx
const HistoryShareCard = React.forwardRef(({ history, teamAName, teamBName }, ref) => {
  const top = history.slice(0, 10);
  const winsA = history.filter(r => r.winner === 'A').length;
  const winsB = history.filter(r => r.winner === 'B').length;
  const ties  = history.filter(r => r.winner === 'tie').length;
  const today = new Date().toISOString().slice(0, 10);

  return (
    <ViewShot
      ref={ref}                                                          // 父组件 shareCardRef
      options={{ format: 'png', quality: 1, result: 'tmpfile' }}
      style={{ position: 'absolute', left: -9999, top: 0, width: 360 }}  // 屏幕外, 固定宽 360
    >
      <View style={styles.shareCard}>
        <Text style={styles.shareCardTitle}>对 战 记 录</Text>
        <Text style={styles.shareCardDate}>{today}</Text>
        <View style={styles.shareCardDivider} />
        {top.map((r) => (
          <View key={r.id} style={styles.shareCardRow}>
            <View style={styles.shareCardTeamCol}>
              <Text style={[styles.shareCardTeam, { color: '#3b82f6' }]} numberOfLines={1}>
                {r.winner === 'A' ? '🏆 ' : ''}{r.teamA.name}
              </Text>
            </View>
            <View style={styles.shareCardScoreCol}>
              <Text style={styles.shareCardScoreA}>{r.teamA.score}</Text>
              <Text style={styles.shareCardSep}>:</Text>
              <Text style={styles.shareCardScoreB}>{r.teamB.score}</Text>
            </View>
            <View style={styles.shareCardTeamCol}>
              <Text style={[styles.shareCardTeam, { color: '#f97316', textAlign: 'right' }]} numberOfLines={1}>
                {r.teamB.name}{r.winner === 'B' ? ' 🏆' : ''}
              </Text>
            </View>
            <Text style={styles.shareCardMeta}>
              {new Date(r.timestamp).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
              {r.duration ? ` · ${r.duration}` : ''}
            </Text>
          </View>
        ))}
        {history.length > 10 ? (
          <Text style={styles.shareCardMore}>... 共 {history.length} 场, 仅显示最新 10 条</Text>
        ) : null}
        <View style={styles.shareCardDivider} />
        <Text style={styles.shareCardFooter}>
          {history.length} 场 · {teamAName} {winsA}胜 · {teamBName} {winsB}胜{ties ? ` · ${ties}平` : ''}
        </Text>
        <Text style={styles.shareCardWatermark}>记分板</Text>
      </View>
    </ViewShot>
  );
});
```

### 主 App 条件渲染 (关键!)

```jsx
return (
  <LinearGradient>
    {showHistory ? (
      <HistoryPage history={history} ... onClose={() => setShowHistory(false)} />
    ) : (
      <>
        <View style={styles.scoreArea}>...</View>
        <View style={styles.bottomRow}>...</View>
        {showPicker && <TimePickerModal />}
      </>
    )}
    {/* HistoryShareCard 始终渲染 (ref 不能 unmount) */}
    <HistoryShareCard ref={shareCardRef} history={history} teamAName={teamNames[0]} teamBName={teamNames[1]} />
  </LinearGradient>
);
```

**关键点**:
- 用 `showHistory` 控制**整块主界面** (scoreArea + bottomRow + TimePickerModal), 不用 modalOverlay
- 主界面 + HistoryPage 互斥显示, 切换时主比分界面 (-1 按钮) 完全消失
- `HistoryShareCard` 始终渲染 (条件渲染外), 保证 ref 始终有效
- 用 `<>...</>` fragment 包多个元素
- 横屏竖屏统一: 都是同一个 HistoryPage 全屏布局, 卡片用屏宽-32dp padding
- 关闭时主比分界面 (-1 按钮 + TimePickerModal) 完全恢复

## 错误记录

- 曾尝试给 centerPanel 加 `flex: 1` 和 `maxWidth`，导致中间太宽、两侧太窄
- 修复：恢复固定 `width: 130`，保持原有布局
- 曾尝试修改 infoColumnLeft/Right 的 alignItems 导致队名偏移，修复为条件组合
- AndroidManifest screenOrientation="auto" 在 Android 14 小米 14 无效
- 修复：改为 "unspecified"
- DrumPicker 用实色背景 + 高度 88 的渐变蒙层把中间 44px 选中项完全压住，只剩 4px 缝隙
- 修复：实色 → `expo-linear-gradient` 透明渐变 + 高度降到 68 + indicator zIndex 1→3
- TimerDisplay 5 字符在 130dp 窄面板下折行
- 修复：fontSize 36→30，letterSpacing 4→2，加 `adjustsFontSizeToFit`
- -1 按钮在 score panel 内部被背景图压住
- 修复：移到 scoreArea 外的 bottomRow
- 误把队名输入框移到底部行 — 用户只要"视觉对齐参考"，不是把它们搬出去
- 修复：恢复 teamNameEditRow 到 centerPanel.timerBox 内，bottomRow 只留 -1（后改：移到 centerPanel 顶部 teamNameRow 独立一行）
- 背景图换图不生效 — 同 URI 被 RN Image 缓存复用
- 修复：文件名带 `Date.now()` 时间戳，强制 URI 变化触发重新加载
- expo-file-system@56 移除旧 API（FileSystem.copyAsync 等）
- 修复：`import { File, Directory, Paths }`，改用 class-based API
- -1 按钮在底部行但不在 score panel 中心 — 3 等分 flex 不等于 2 边 + 中间
- 修复：bottomRow 用 `[flex:1, 130, flex:1]` 镜像 scoreArea 宽度
- "背景图" label 偏左
- 修复：`bgImageSectionLabel.alignSelf: 'center'`
- 横屏背景图填满全屏，与中间面板内容框不齐
- 修复：`useWindowDimensions` + `LinearGradient(timerBox).onLayout` 测内容高度，bg 图高度跟齐
- 横屏 bg 图底部和 timerBox 底部对不齐（差 70 device px）
- 修复：传 `bgImageTop: 30 dp` prop, 用 `marginTop` 把 bg 图压到 timerBox 起始 Y
- 横屏边线（左蓝/右橙）长度比 bg 图长
- 修复：边线 `height: bgImageHeight || '100%'`, 跟 bg 图同步
- 竖屏中间 UI 顶部贴齐状态栏
- 修复：`useWindowDimensions` 分逻辑, 竖屏用 `justifyContent: 'center'` + `paddingTop: 80 dp` 留白
- **横屏 TimePickerModal 底部按钮被遮**（弹窗 1170 device px > 屏可用 1116 device px）
- 修复：`DrumPicker` 接受 `wheelHeight` prop, 横屏缩到 100 dp + 紧凑布局 (字号 22, padding 14)
- **战绩功能 (新增)**:
  - 装 `react-native-view-shot@5.1.0` + `expo-sharing@56.0.15`
  - 战绩页面 + × 删单条 + 🖼 分享 + 🗑 清空, 空态自动 disabled 按钮
  - 分享卡屏幕外渲染 (`left: -9999`), `React.forwardRef` 透传 ViewShot ref
  - **HistoryModal → HistoryPage 全屏页面**: 条件渲染 `showHistory ? <HistoryPage/> : <主界面>`, 避免主比分界面"缩小"感
  - 通用化: 无球类 emoji, 用 🏆 标记胜方
- **背景图按钮占用 -1 按钮位置 (横屏)**: `BgImageBtn` 去掉 🖼/＋ emoji 纯文字, timerBox 内主队/客队用 `bgImageRow` (flexDirection: row) 排成一排, 各 `flex: 1`. timerBox 高度大幅减少, 横屏时主比分界面不再溢出覆盖 -1 按钮
- **HistoryPage 头部修复**: 标题去掉 📊 emoji, 加 `textAlign: 'center'` 居中; × 关闭按钮从右上移到下一行, 加大点击区域 (paddingHorizontal: 12, paddingVertical: 6), 加 "× 关闭" 文字
- **应用图标太满**: 旧版塞了 12+ 元素 (篮筐×2 / 罚球区×2 / 中线×4 / 圆点×2 / 数字×2) + `scale(1.9)` 撑满画布, 笔画 4.5, 没有焦点
- 修复：重设计为记分牌 2:2 风格 (2 个圆角矩形 + 中间圆点 + 2 个数字), 笔画 5, 字号 42 (fontWeight 800), 留出 21% 边距避开 18% 自适应图标安全区, sharp 生成 5 尺寸 PNG 后删除旧 .webp
- **启动瞬间白屏闪过 (expo 默认 splash "白色篮球场")**: 默认 `Theme.App.SplashScreen.windowBackground = @drawable/splashscreen_logo` (白底+灰色同心圆), 启动到主界面之间有视觉跳变
- 修复：改 2 个文件, 让启动瞬间是纯深色而不是白色"篮球场":
  - `drawable/ic_launcher_background.xml`: 删除 `<bitmap android:src="@drawable/splashscreen_logo"/>` 那层, 只留 `<item android:drawable="@color/iconBackground"/>`
  - `values/styles.xml`: `Theme.App.SplashScreen.windowBackground` → `@color/iconBackground` (`#0f172a`)
- **分享图片到微信白底有"白色倒角"**: `react-native-view-shot` 截的是矩形 bounding box, **不应用 RN 渲染时的 `borderRadius` 圆角裁剪**. 圆角让 PNG 4 角变透明像素, 微信白底填出来形成"白色倒角". 修复: `shareCard.borderRadius: 16 → 0` + `borderWidth: 0` (单行). **不要"好意"加回圆角** — 任何白底都会再现
- **玻璃面板改造 (Glassmorphism 4 维度)**:
  - 维度1: 背景渐变 `['#0a1428','#1a0d2e','#241038']` (暗藏蓝→墨紫→暗紫红, 低饱和)
  - 维度2: 中间 timerBox 暗色 0.32 + BlurView 25 + 12% 玻璃 + 1px 15% 白边
  - 维度3: 文字纯白 0.95 / 半透白 0.6, 队名/胜场 0.85
  - 维度4: 全部按钮玻璃叠玻璃, 开始用 iOS 系统绿 `#34C759` 0.85
  - 装 `expo-blur@56.0.3`, 4 层结构 (暗色 / BlurView / 玻璃填充 / 1px 白边)
  - 两侧 ScorePanel 不放 BlurView (怕盖住用户背景图), 用暗色 0.28 + 玻璃边
  - 弹窗 TimePickerModal 暗色 0.42 + BlurView 40 模糊主界面 (iOS 弹窗标志性效果)
  - 滚轮 drumWheel 暗色 0.35 + 白色高亮条 (不再是蓝色)
  - "分享战绩" 改为纯文字链接 (无玻璃块), 像 iOS 链接
  - 验证: 阶段 1-4 真机截图全部 OK, 整体观感 iOS 控制中心
- **⚠️ 蓝/橙中线穿过 (未做)**: 蓝/橙线是 `position: absolute, top: 0, height: 100%` 贯穿整个屏幕高度, 穿过中间控制区下方空白. 苹果方案: 线应被推到屏幕最外侧, 或完全移除 (玻璃面板已有 1px 边框). 用户决定暂不动.

## 更新日志

- **2026-06-02（第二十一轮：全面玻璃化）**：装 `expo-blur@56.0.3`，新增 `GLASS` 主题常量。4 维度全应用：背景渐变 / timerBox 玻璃 / 文字克制 / 按钮叠玻璃。两侧 ScorePanel / 弹窗 / 滚轮 / HistoryPage 全部玻璃化。"开始" 按钮改 iOS 系统绿。验证阶段 1-4 真机截图全部 OK
- **2026-06-02（第十三轮）**：分享图片去白边 - `shareCard.borderRadius: 16 → 0` + `borderWidth: 0`. 根因: `react-native-view-shot` 不应用 RN 的 borderRadius 圆角裁剪, 4 角透明像素被白底填成"倒角". 验证: 真机分享面板截图, 4 角干净
- **2026-06-02（第十二轮）**：启动屏去白 - 去掉 expo 默认 splash 白色"篮球场" logo。改 2 个文件：`drawable/ic_launcher_background.xml` (删 bitmap 层) + `values/styles.xml` (`Theme.App.SplashScreen.windowBackground` → `@color/iconBackground`)
- **2026-06-02（第十一轮）**：应用图标重设计 - 篮球场 (12+ 元素) → 记分牌 2:2 (3 元素)。用 sharp 生成 5 尺寸 PNG，删除 mipmap-*/*.webp
- **2026-06-01（第十轮）**：无变更
- **2026-06-01（第九轮）**：时间设置功能修复（注：后续回滚 DrumPicker 至 picker 方案，此条目仅作历史记录）
- **2026-06-01（第八轮）**：背景图按钮一排 + 无图标 (主队/客队排成一行, 去除 🖼/＋ 前缀); HistoryPage 标题居中 + × 关闭下移 (去掉 📊, textAlign center, × 移到下一行加大 paddingHorizontal 12)
- **2026-06-01（第七轮）**：HistoryModal → HistoryPage 全屏页面, 去掉 modalOverlay 黑色背景, 条件渲染 `showHistory ? <HistoryPage/> : <主界面>` 完全替换, 关闭时主比分界面 (-1 按钮 + TimePickerModal) 完全恢复, 横屏竖屏统一布局
- **2026-06-01（第六轮）**：战绩历史系统 - `HistoryPage` 列表 + `HistoryShareCard` ViewShot 截图分享; 中间面板 结算/重置 一排 + 📊 分享战绩 按钮; AsyncStorage `match_history` 存战绩; 通用化设计无球类 emoji
- **2026-06-01（第五轮）**：TimePickerModal 横竖屏分逻辑（`DrumPicker.wheelHeight` prop + `useWindowDimensions`）；横屏用紧凑布局 (drumWheel 100dp + 字号 22 + padding 14)
- **2026-06-01（第四轮）**：横屏 bg 图/边线/timerBox 底部 y=1072 对齐（新增 `bgImageTop` prop + 边线 `height: bgImageHeight`）；中间面板横竖屏分逻辑（`useWindowDimensions` 切换 `centerPanelDynamicStyle`）
- **2026-06-01（第三轮）**：-1 按钮 bottomRow 镜像 scoreArea (`[flex:1, 130, flex:1]`)；"背景图" label 居中；bg 图尺寸用 useWindowDimensions + timerBox.onLayout 自适应
- **2026-06-01（第二轮）**：-1 按钮移到底部行（左右居中），队名移到 centerPanel 顶部 teamNameRow；背景图换图改时间戳文件名；file-system 迁 v56 class API
- **2026-06-01（第一轮）**：DrumPicker 完整接入；滚轮蒙层实色改渐变；TimerDisplay 加自适应字号；震动反馈全交互点接入
- **2026-05-31**：确认布局配置稳定，更新文档；更新图标为篮球场风格
