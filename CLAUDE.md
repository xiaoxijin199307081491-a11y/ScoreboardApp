# ScoreboardApp 项目指南

## 项目概述

双队记分牌 App（应用名：记分板），支持双队计分、计时、胜负记录、历史战绩、截图分享、比分语音播报、自定义加分音效（录制/选文件）。横竖屏自适应 + 全交互点震动反馈。通用对战计分工具（篮球/乒乓球/羽毛球等都用）。

## 快速开始

```bash
cd /Users/xiaoxijin/项目/ScoreboardApp
npx expo start
```

## APK 构建

### 环境要求
- JDK 17：`brew install openjdk@17`
- Android SDK：位于 `~/Library/Android/sdk`

### 本地构建
```bash
export JAVA_HOME="/opt/homebrew/opt/openjdk@17/libexec/openjdk.jdk/Contents/Home"
export ANDROID_HOME=~/Library/Android/sdk

cd /Users/xiaoxijin/项目/ScoreboardApp
# 仅当 android/ 缺失或需要重新生成时执行
# npx expo prebuild --platform android --clean

cd android && ./gradlew assembleDebug    # debug APK
cd android && ./gradlew assembleRelease  # release APK
```

APK 位置：
- Debug: `android/app/build/outputs/apk/debug/app-debug.apk`
- Release: `android/app/build/outputs/apk/release/app-release.apk`

### 注意事项
- prebuild 会写 `screenOrientation="auto"`, 在 Android 14 无效, 改为 `"unspecified"`
- mipmap 目录下的 `.webp` 会优先于 `.png`, 重新生成图标后必须删除
- 图标用 sharp 从 `assets/gemini-svg.svg` 生成各尺寸 PNG

## 关键依赖

| 依赖 | 版本 | 用途 |
|---|---|---|
| `expo` | ~56.0.8 | SDK |
| `react-native` | 0.85.3 | RN 核心 |
| `react` | 19.2.3 | React |
| `expo-linear-gradient` | ~56.0.4 | 渐变背景 + 滚轮上下蒙层 |
| **`expo-blur`** | **~56.0.3** | **Glassmorphism 毛玻璃 (4 维度第 2 层)** |
| `expo-haptics` | ~56.0.3 | 震动反馈 |
| `expo-speech` | ~56.0.x | 比分语音播报 (设备自带离线 TTS) |
| **`expo-audio`** | **~56.0.12** | **自定义加分音效 录制 + 播放 (替代已禁用的 expo-av)** |
| **`expo-document-picker`** | **~56.0.4** | **从手机里选已有音频文件作加分音效** |
| `expo-image-picker` | ~56.0.15 | 队伍背景图选择 |
| `expo-file-system` | ~56.0.7 | 背景图持久化 (class API) |
| `expo-sharing` | ~56.0.15 | 系统分享面板 |
| `react-native-view-shot` | 5.1.0 | React 组件截图 |
| `@react-native-async-storage/async-storage` | 2.2.0 | 背景图路径 + 战绩存储 |
| ~~`expo-av`~~ | - | 已禁用 (SDK 56 闪退); 音频录制/播放改用 `expo-audio` |
| ~~`@react-native-picker/picker`~~ | - | 从未引入 |

## 背景图持久化 (expo-file-system@56)

旧 API `FileSystem.copyAsync` 等在 v56 全部移除。改用新 class-based API：

```js
import { File, Directory, Paths } from 'expo-file-system';

const IMG_DIR = Paths.document.uri + 'team_logos/';

// 创建目录
new Directory(IMG_DIR).create({ intermediates: true });

// 复制图片
const sourceFile = new File(result.assets[0].uri);
const destFile   = new File(IMG_DIR + `team_${side}_${Date.now()}.${ext}`);
await sourceFile.copy(destFile);

// 检查存在 / 删除
new File(uri).exists      // boolean (sync)
new File(uri).delete()    // void    (sync)
new File(uri).info        // FileInfo (sync)
```

**文件名必须带 `Date.now()` 时间戳** —— 不然 React Native `<Image>` 缓存按 URI 复用旧 bitmap，UI 不会刷新。

启动时恢复：`const check = async (p) => p && new File(p).exists ? p : null;`

## 触觉反馈 (h.*)

`App.js:14-22` 顶部统一封装了 5 档震动等级，所有交互点已接入。调用方式 fire-and-forget，`.catch(() => {})` 静默吞错：

```js
import * as Haptics from 'expo-haptics';
const h = {
  light:   () => Haptics.impactAsync (Haptics.ImpactFeedbackStyle.Light  ).catch(() => {}),
  medium:  () => Haptics.impactAsync (Haptics.ImpactFeedbackStyle.Medium ).catch(() => {}),
  heavy:   () => Haptics.impactAsync (Haptics.ImpactFeedbackStyle.Heavy  ).catch(() => {}),
  select:  () => Haptics.selectionAsync().catch(() => {}),
  success: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {}),
};
```

| API | 用法 |
|---|---|
| `h.light()`   | 减分、换图、设置时间、取消、点击遮罩关闭、关历史页、删历史单条 |
| `h.medium()`  | **加分为最常用**、开始/暂停计时、打开历史页 |
| `h.heavy()`   | 结算分数、全部重置、清空历史 |
| `h.select()`  | 滚轮 tap 选中 / 滚动停止吸附 |
| `h.success()` | 时间设置确认、生成分享图 |

`VIBRATE` 权限已在 `android/app/src/main/AndroidManifest.xml` 中声明。

## 比分语音播报 (expo-speech)

每次加/减分后用设备自带 TTS 播报当前比分 "X 比 Y"（如 2:1 读「二比一」），可一键开关。

- `App.js` 顶部 `numToZh(n)` 把整数转中文读法 (0-999, 比分够用)，`speakScore(a,b)` 先 `Speech.stop()` 清掉上一条避免连点排队，再 `Speech.speak('${numToZh(a)}比${numToZh(b)}', { language: 'zh-CN' })`
- `voiceOn` state，持久化到 AsyncStorage key `voice_on` ('1'/'0')，默认**关**
- 播报在 `addScore`/`subScore` 的 `setScores` updater 里用算出的 next 值触发（state 异步，不能用旧 `scores`）
- 中间面板「设置时间」下方有 `voiceBtn` 开关：关=玻璃灰 🔇，开=iOS 系统绿 🔊；打开时读一次当前比分作确认，关闭时 `Speech.stop()`
- 离线、无需联网，不增加 APK 体积里联网相关；用 `h.select()` 切换震动反馈

## 自定义加分音效 (expo-audio + expo-document-picker)

主队/客队各录/选一段声音，**加分 (+1) 时播放**（减分不播）。入口与背景图一致：中间面板「加分音效」区，主队/客队各一个按钮。

**持久化**：完全复用背景图那套 (expo-file-system@56 class API)。

- 目录 `SOUND_DIR = Paths.document.uri + 'team_sounds/'`，文件名 `sound_${side}_${Date.now()}.${ext}` 必带时间戳，路径存 AsyncStorage key `team_sound_left` / `team_sound_right`
- 总开关持久化到 key `sound_on` ('1'/'0')，默认**关**
- `saveSoundFromUri(side, uri, name)` 统一处理两种来源（录音临时文件 / DocumentPicker 结果）：`ensureSoundDir()` → `clearSavedSound()` 删旧 → `new File(src).copy(new File(dest))`
- `pickSoundFile(side)` 用 `DocumentPicker.getDocumentAsync({ type: 'audio/*' })` 选已有音频

**播放 (expo-audio imperative API)**：

- `playersRef = useRef([null, null])` 每队预加载一个 `createAudioPlayer(uri)`，路径变化时 `loadPlayer(idx, uri)` 重建（旧的 `.remove()`）
- `playTeamSound(idx, onDone?)`：`p.seekTo(0); p.play()` 支持连点重播；可选 `onDone` 通过一次性 `p.addListener('playbackStatusUpdate', s => s.didJustFinish)` 在音效自然播完时回调（监听挂在 `p._announceSub`，连点先 remove 旧的避免叠加）
- 启动时恢复路径并 `loadPlayer`；组件卸载 `useEffect` 清理释放所有 player

**录音弹窗 `SoundRecordModal`** (条件渲染, `recordSide` 控制显隐, 同 TimePickerModal)：

- `useAudioRecorder(RecordingPresets.HIGH_QUALITY)` 在 App 顶层创建, 传进 modal
- 状态机 `idle → recording → recorded`，录制中计时，**最长 10 秒自动停**（`SOUND_MAX_SEC`）
- `startRec`: `AudioModule.requestRecordingPermissionsAsync()` → `setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true })` → `recorder.prepareToRecordAsync()` → `recorder.record()`
- `doStop`: `recorder.stop()` 后 `recorder.uri` 即录音文件；**录完立刻 `setAudioModeAsync({ allowsRecording: false })`**，否则 iOS 试听/后续播放会从听筒走（很小声）
- 试听用临时 `createAudioPlayer(tempUri)`；保存调 `saveSoundFromUri` 持久化
- 卸载 `useEffect` 收尾：停录、清计时、释放试听 player、`allowsRecording:false`

**音效 + 比分 TTS 编排（两者可同时开，但不重叠）**：

`announceAdd(side, a, b)` 统一处理。**先放音效, 自然播完再报比分**（娱乐向：先听搞笑音效再报分）：

```js
const announceAdd = (side, a, b) => {
  const hasSound = soundOn && playersRef.current[side];
  const sayScore = () => { if (voiceOn) speakScore(a, b); };
  if (hasSound) playTeamSound(side, voiceOn ? sayScore : undefined);
  else sayScore();
};
```

- 只开音效 → 只放音效；只开播报 → 直接报分；都开 → 串行（音效 `didJustFinish` 后才 TTS）
- 减分 `subScore` 不放音效，只 TTS（保持原行为）

**权限**：`RECORD_AUDIO` 已在 AndroidManifest 声明；`app.json` 的 `expo-audio` plugin 配了 `microphonePermission`（iOS NSMicrophoneUsageDescription）。

## 滚轮时间选择器 (DrumPicker)

位于 `App.js:106-191` 的自研组件，不依赖第三方。

- 容器 180 × 72，每个 item 高 44
- 用 `Animated.ScrollView` + `snapToInterval` + `decelerationRate="fast"` 自动吸附
- 上下 `expo-linear-gradient` 淡出蒙层 (`#0d1b2aff → #0d1b2a00`) 实现非选中项自然模糊，**中间 44px 选中区不被任何不透明色遮挡**
- `drumSelectionIndicator` 蓝色高亮条 zIndex=3，盖在渐变之上
- 外部 value 变化时通过 `isProgrammaticScroll` ref + `useEffect([value])` 同步滚动位置，避免 onScroll 回环
- `onMomentumScrollEnd` 滚动停止 → 精确吸附 + `h.select()` 反馈
- 单个 item `Pressable onPress` → `h.select()` + `onChange(opt)`

## 布局要点

见 LAYOUT.md

## Glassmorphism 主题 (苹果 4 维度)

整体 UI 风格采用 Apple HIG "Materials" / Glassmorphism。`App.js:24-58` 集中定义 `GLASS` 主题常量, 整套 UI 都从这里取值。**改一个值改全 UI**。

| 维度 | 含义 | 关键值 |
|------|------|--------|
| **1. Muted Ambient Gradient** | 背景渐变, 永远低饱和 | `['#0a1428','#1a0d2e','#241038']` 深藏蓝→墨紫→暗紫红 |
| **2. Pure Glassmorphism** | 玻璃自己不发色, 借色发色 | `glassFill: 'rgba(255,255,255,0.12)'`, 1px 白边 0.15 |
| **3. Vibrancy Typography** | 文字纯白, 不透出背后颜色 | `textOnGlass: 'rgba(255,255,255,0.95)'` |
| **4. Layered Materials** | 玻璃叠玻璃, 唯一彩色留给系统绿 | `iOSGreen: 'rgba(52,199,89,0.85)'` |

**各面板的强度** (同模板不同参数):

| 面板 | 暗色 | BlurView | 玻璃填充 | 圆角 | 备注 |
|------|------|----------|---------|------|------|
| timerBox (中间) | 0.32 | 25 | 12% | 22 | 主控制区 |
| scorePanel (两侧) | 0.28 | 无 | 0 | 16 | 无 BlurView 是怕盖住用户背景图 |
| TimePickerModal | 0.42 | 40 | 20% | 22 | 弹窗模糊主界面 |
| drumWheel | 0.35 | 无 | 0 | 12 | 滚轮不放 BlurView (性能 + 数字清晰) |
| historyItem | 0.06 (白) | 无 | 0 | 12 | 小玻璃卡片 |

**玻璃面板统一模板** (4 层结构):
```jsx
<View style={styles.glassPanel}>
  <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.32)' }]} pointerEvents="none" />
  <BlurView intensity={25} tint="dark" style={StyleSheet.absoluteFill} />
  <View style={[StyleSheet.absoluteFill, { backgroundColor: GLASS.glassFill, borderRadius: 22 }]} pointerEvents="none" />
  <View style={[StyleSheet.absoluteFill, { borderRadius: 22, borderWidth: 1, borderColor: GLASS.glassBorder }]} pointerEvents="none" />
  <View style={styles.content}>...</View>
</View>
```

**重要原则**:
- BlurView 模糊它**下方**的内容, 所以放在背景渐变 / 弹窗后面才有意义
- 文字只用纯白, **不**用队色 (主队蓝/客队橙 只用于队伍识别场景)
- 唯一彩色留给 iOS 系统绿 (开始) / 系统红 (暂停) / 队色 (识别), 其他都是白
- "分享战绩" 是纯文字链接 (无玻璃块), 不要给它玻璃底色

## 战绩历史系统 (通用对战记录)

每次 `结算` 自动记录，打开 `📊 分享战绩` 看历史，一键生成分享图。

**单条记录**:
```js
{ id, timestamp, teamA: {name, score}, teamB: {name, score}, winner, duration: 'mm:ss' }
```

**存储**: AsyncStorage `match_history`, 数组按时间倒序。

**两个组件**:
- `HistoryPage` - 全屏页面, 条件渲染 (`showHistory ? <HistoryPage/> : <主界面>`), 关闭时主比分界面完全恢复
  - 顶部统计 + 卡片列表 (ScrollView) + 底部 🖼 生成分享图 / 🗑 清空记录
  - 标题居中无 emoji, × 关闭按钮移到下一行 (避免被状态栏遮挡)
- `HistoryShareCard` - `React.forwardRef` + ViewShot 包裹, 屏幕外渲染 (`left: -9999`, 宽 360), 父组件持有 `shareCardRef`
  - **始终渲染, 条件渲染外** (ref 不能 unmount)

**集成**:
```js
// 结算时自动记录
const handleNextRound = async () => {
  const record = { id: `${Date.now()}-${...}`, timestamp, teamA, teamB, winner, duration };
  const next = await appendHistory(record);
  setHistory(next);
  // ...原有逻辑
};

// 分享
const handleShareImage = async () => {
  const uri = await shareCardRef.current.capture();
  await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: '分享对战记录' });
};
```

**通用化设计**: 无球类 emoji, 用 🏆 标记胜方, 标题/水印用通用文案 ("对战记录", "记分板")。

## 中间面板横竖屏分逻辑

```js
const { width: winW, height: winH } = useWindowDimensions();
const isLandscape = winW > winH;
const centerPanelDynamicStyle = isLandscape
  ? { justifyContent: 'flex-start', paddingTop: 24 }   // 横屏: 贴顶, 让出状态栏
  : { justifyContent: 'center', paddingTop: 80 };      // 竖屏: 居中, 顶部留 80 dp

<View style={[styles.centerPanel, centerPanelDynamicStyle]}>
  ...teamNameRow + timerBox...
</View>
```

- 横屏：内容贴顶 (与 bg 图顶部对齐), timerBox 底部 y=1072
- 竖屏：内容垂直居中, team names 距顶约 80 dp
- 配合 `ScorePanel.bgImageTop={isLandscape ? 30 : 0}` 偏移, 三者 (bg 图 / timerBox / 边线) 底部完美对齐 y=1072

## TimePickerModal 横竖屏分逻辑

弹窗总高 (drumWheel 180dp + 标题 + 预览 + 按钮 + padding) ≈ 390 dp = 1170 device px。横屏可用高 ≈ 1116 device px (1200 - 状态栏 - 导航栏)，弹窗比屏高 54+ device px，按钮被遮。

修复：`DrumPicker` 接受 `wheelHeight` prop, `TimePickerModal` 用 `useWindowDimensions` 分逻辑：

```js
function DrumPicker({ value, options, onChange, label, wheelHeight }) {
  const wH = wheelHeight || DRUM_WHEEL_HEIGHT;
  const PADDING = (wH - DRUM_ITEM_HEIGHT) / 2;
  return <View style={[styles.drumWheel, { height: wH }]}>
    <ScrollView contentContainerStyle={{ paddingVertical: PADDING }}>...
}

function TimePickerModal({ ... }) {
  const { width: winW, height: winH } = useWindowDimensions();
  const isLandscape = winW > winH;
  const drumH = isLandscape ? 100 : DRUM_WHEEL_HEIGHT;
  return <DrumPicker wheelHeight={drumH} ... />;
}
```

| 方向 | drumWheel | 弹窗总高 | 取消/确认 |
|---|---|---|---|
| 竖屏 | 180 dp | ~390 dp | y=2498-2550 ✓ |
| 横屏 | 100 dp | ~210 dp | y=1070-1122 ✓ |

打开 modal 时**同步 `clearInterval(intervalRef.current)`**, 避免 setRunning(false) 异步导致 timer 多走 1-2 帧。

## 背景图尺寸自适应方向

```js
import { useWindowDimensions } from 'react-native';
const { width: winW, height: winH } = useWindowDimensions();
const isLandscape = winW > winH;
const [centerH, setCenterH] = useState(0);

<LinearGradient ... onLayout={(e) => setCenterH(e.nativeEvent.layout.height)}>
<ScorePanel bgImageHeight={isLandscape ? centerH : undefined} ... />

// ScorePanel 内
style={bgImageHeight
  ? { width: '100%', height: bgImageHeight, ... }
  : styles.bgImageFill}   // 默认 flex: 1, 填满
```

- 竖屏：bg 图 `flex: 1` 填满 score panel（≈ 全屏）
- 横屏：bg 图高度 = timerBox 实测高度（中间面板的内容框），与 UI 框视觉齐平

## 应用图标

**记分牌 2:2 风格** (`assets/gemini-svg.svg`):

- 深色圆角方形背景 (rx=44), 渐变 `#1e3a5f → #0f172a`
- 两个圆角矩形 (记分牌轮廓), 居中排开, `stroke-width=5`
- 两个 "2" 数字分别填在左右矩形内 (fontSize 42, fontWeight 800)
- 中间一个圆点 (r=3) 作为分隔/焦点
- 笔画白色渐变 (`#FFFFFF → #CBD5E1`)

**设计原则** (对比 Comet / Grok / 剪映 / Perplexity): 单一焦点 + 大量留白, 笔画适中。

**生成**: 用 sharp 从 `assets/gemini-svg.svg` 生成 48/72/96/144/192 px PNG, 删除同名 .webp。

## 启动屏（去 expo 默认白屏）

expo 默认 splash 是**白色背景 + 灰色"篮球场"同心圆 logo** (`@drawable/splashscreen_logo`), 启动瞬间闪一下消失, 视觉上突兀。

**修复**: 改为纯色背景 `@color/iconBackground` (`#0f172a` 深蓝黑), 跟主背景一致, 启动瞬间无过渡感。

```xml
<!-- android/app/src/main/res/drawable/ic_launcher_background.xml -->
<layer-list xmlns:android="http://schemas.android.com/apk/res/android">
  <item android:drawable="@color/iconBackground"/>
  <!-- 删除了 <bitmap android:src="@drawable/splashscreen_logo"/> 白色篮球场 -->
</layer-list>
```

```xml
<!-- android/app/src/main/res/values/styles.xml -->
<style name="Theme.App.SplashScreen" parent="AppTheme">
  <!-- 原: <item name="android:windowBackground">@drawable/splashscreen_logo</item> -->
  <item name="android:windowBackground">@color/iconBackground</item>
</style>
```

改动文件: 2 个 (只动 Android 原生资源, `App.js` / `app.json` 完全不动)。`values-night/` 无覆写, 不需要改夜间主题。

## 常见问题

- `Animated.Easing.out undefined`：从 react-native 直接导入 Easing
- `Transform with key of "scale"`：使用 `useNativeDriver: false`
- 颜色模板字符串（`${color}44`）：StyleSheet 不支持，改用内联样式
- APK 闪退（NoClassDefFoundError: LazyKType）：移除 expo-av
- AndroidManifest screenOrientation "auto" 无效：改为 "unspecified"
- 窄面板 TimerDisplay 折行：使用 `numberOfLines={1}` + `adjustsFontSizeToFit` + `minimumFontScale={0.7}`
- 滚轮中间被渐变压成一条线：实色蒙层改用 `LinearGradient` 透明渐变 + zIndex 调整
- expo-file-system@56 旧 API 全移除：`import { File, Directory, Paths } from 'expo-file-system'`，用 `new File(uri).copy()` / `new Directory(p).create()` 替代
- 背景图换图不生效：文件名必须带 `Date.now()` 时间戳，避开 RN Image 按 URI 缓存
- -1 按钮被背景图覆盖：移到 `scoreArea` 外的 `bottomRow`（屏幕最底部，3 槽 flex 镜像 scoreArea，左右居中）
- -1 按钮在 score panel 内仍不居中：bottomRow 用 `[flex:1, 130, flex:1]` 镜像 scoreArea 宽度，-1 自然落在 score panel 中心（不要用 3 等分）
- "背景图" label 偏左：`bgImageSectionLabel.alignSelf: 'center'`
- 横屏背景图过高：`useWindowDimensions` + `LinearGradient(timerBox).onLayout` 测内容高度，约束 `ScorePanel.bgImageHeight`
- 横屏 bg 图底部没和 timerBox 对齐：传 `bgImageTop` prop, `marginTop: 30 dp` 偏移
- 横屏边线比 bg 图长：边线 `height: bgImageHeight || '100%'`
- 竖屏 UI 顶部贴齐：横竖屏分逻辑，竖屏用 `justifyContent: 'center'` + `paddingTop: 80`
- 横屏 TimePickerModal 底部按钮被遮：弹窗总高 1170 device px > 横屏可用 1116 device px。`DrumPicker` 接受 `wheelHeight` prop, 横屏缩到 100dp + 紧凑布局 (字号 22 + padding 14)
- 战绩功能 (历史/分享图片): 装 `react-native-view-shot` + `expo-sharing`, 结算时 `appendHistory(record)` 到 AsyncStorage `match_history`, `HistoryShareCard` 屏幕外渲染 (left: -9999) 用 `React.forwardRef` 透传 ref, 分享时 `shareCardRef.current.capture()` 拿 URI 后 `Sharing.shareAsync(uri)`
- **战绩历史页 Modal 叠层 → 全屏 Page**: 用户看到主比分界面"缩小"是因为 `modalOverlay` 叠层半透明背景。改成 `HistoryPage` + 条件渲染 (`showHistory ? <HistoryPage/> : <主界面>`) 完全替换, 关闭时主界面 (scoreArea + bottomRow + TimePickerModal) 完全恢复. 用 `<>...</>` fragment 包多个元素
- **背景图按钮占用 -1 按钮位置**: 横屏时 timerBox 太长, 主比分界面溢出覆盖底部 -1 按钮. 把 `BgImageBtn` 去掉 🖼/＋ 图标纯文字, timerBox 内 主队/客队 用 `bgImageRow` (flexDirection: row) 排成一排, 各 `flex: 1`, timerBox 高度大幅减少
- **HistoryPage 标题偏左 + × 关闭被状态栏遮挡**: 标题本来左对齐 (不居中), × 关闭在右上被状态栏/电池图标遮挡. 改为: 标题去掉 📊 emoji + `textAlign: 'center'` 居中, × 关闭按钮**移到标题下一行**独立显示, 加大点击区域 (paddingHorizontal: 12, paddingVertical: 6), 文字 "× 关闭" 更明显
- **应用图标太满**: 旧版塞了 12+ 元素 (篮筐×2 / 罚球区×2 / 中线×4 / 圆点×2 / 数字×2), 没有焦点. 改为记分牌 2:2 风格: 2 个圆角矩形 + 中间圆点 + 2 个数字, 笔画 5, 字号 42, 留出 21% 边距
- **启动瞬间白屏闪过 (expo 默认 splash 篮球场)**: 改 2 个文件 - `drawable/ic_launcher_background.xml` (删除 bitmap 层) + `values/styles.xml` (`Theme.App.SplashScreen.windowBackground` → `@color/iconBackground`), 让启动瞬间是纯深色而不是白色"篮球场"
- **自定义加分音效 (录制/选文件)**: 装 `expo-audio` + `expo-document-picker`。持久化同背景图 (`SOUND_DIR` + `Date.now()` 时间戳 + AsyncStorage)。`playersRef` 每队预加载 `createAudioPlayer`，加分时 `playTeamSound(idx, onDone)` `seekTo(0)+play()`。录音用 `useAudioRecorder(RecordingPresets.HIGH_QUALITY)` + `SoundRecordModal`，最长 10s 自动停，录完 `setAudioModeAsync({allowsRecording:false})` 防 iOS 听筒小声。详见「自定义加分音效」章节
- **音效和比分 TTS 同时开会糊在一起**: 用 `announceAdd` 编排成串行 —— 先 `playTeamSound(side, sayScore)`，音效 `playbackStatusUpdate.didJustFinish` 后才 `speakScore`。监听一次性挂 `p._announceSub`，连点先 remove 旧的。只开一个则直接播那个
- **加了原生模块 (expo-audio 等) 后改 JS 没生效**: 原生模块需重新 gradle 构建 (`./gradlew assembleRelease`)，光重载 JS / 旧 APK 不带新模块。Expo autolinking 会自动识别 node_modules 里的新模块，**通常不用 prebuild**（prebuild 会覆盖 `screenOrientation` 等手改的原生配置）。`RECORD_AUDIO` 权限已在 manifest，无需重生成
- **想换玻璃面板颜色 / 透明度**: 改 `App.js:24-58` 的 `GLASS` 常量 (4 维度集中定义), 不要零散改各组件。`glassFill` / `glassBorder` / 阴影参数是改全 UI 的最快方式
- **玻璃面板没看到效果**: 检查 4 层结构是否完整 (暗色 / BlurView / 玻璃填充 / 1px 白边), 且 `overflow: 'hidden'` 必须设
- **两侧面板用了 BlurView 后用户背景图看不见**: 故意不放 BlurView (怕盖住图片)。`ImageBackground` 已在底层, 加 `bgOverlay: 'rgba(0,0,0,0.48)'` 压暗足够
- **想加新颜色按钮**: 用 `GLASS.btnGlass` / `GLASS.btnGlassBorder` 而不是硬编码, 保持统一
- **分享图片到微信白底有"白色倒角"**: 根因是 `react-native-view-shot` 截的是矩形 bounding box, **不应用 RN 渲染时的 `borderRadius` 圆角裁剪**. 圆角让 PNG 4 角变成透明像素, 微信分享面板会把它填成白底. 修复: `shareCard.borderRadius: 16 → 0` + `borderWidth: 0` (单行). **绝对不要"好意"加回圆角** — PNG 分享到任何白底都会再现白倒角

## 版本信息

- 当前 APK：`记分板-release.apk` (release, 含 JS bundle) / `记分板-debug.apk` (debug, 含 Metro)
- 应用包名：`com.anonymous.ScoreboardApp`
- 应用图标：记分牌 2:2 风格（深色背景 + 白色渐变 + 2 个圆角矩形 + 中间圆点 + 比分 2:2），源文件为 `assets/gemini-svg.svg`
- UI 主题：Glassmorphism (苹果 4 维度)，集中定义在 `App.js:24-58` 的 `GLASS` 常量
- 音频功能：比分语音播报 (`expo-speech` TTS) + 自定义加分音效 (`expo-audio` 录制/播放 + `expo-document-picker` 选文件)，两者可同时开且串行不重叠
