# ScoreboardApp

React Native Expo 双队记分牌应用（应用名：记分板）。通用对战计分工具, 支持计时、胜负记录、历史战绩、截图分享。横竖屏自适应 + 全交互点震动反馈。

## 技术栈

- **Expo SDK 56** + React Native 0.85.3 + React 19.2.3
- **expo-linear-gradient** - 全局背景 + 时间弹窗上下淡出蒙层
- **expo-blur** - `<BlurView>` 实现 Glassmorphism 毛玻璃效果（中间面板、弹窗）
- **expo-haptics** - 5 档震动反馈 (`h.*` 工具)
- **expo-image-picker** - 队伍背景图选择 + 系统裁切
- **expo-file-system@56** (class-based API: `File` / `Directory` / `Paths`) - 背景图持久化
- **expo-sharing** - 调起 Android 系统分享面板
- **react-native-view-shot@5.1.0** - 把 React 组件截成 PNG
- **@react-native-async-storage/async-storage** - 背景图路径 + 战绩历史
- **Animated API** - 涟漪动画、分数缩放
- ~~**expo-av**~~ - 音频播放（**已禁用**，与 SDK 56 存在 LazyKType 崩溃 bug）
- ~~**@react-native-picker/picker**~~ - 从未引入

## 主题系统: Glassmorphism (苹果 4 维度)

UI 整体风格采用 Apple HIG "Materials" / Glassmorphism。`App.js:24-58` 集中定义了 `GLASS` 主题常量:

```js
const GLASS = {
  // 维度1: Muted Ambient Gradient - 暗夜微光
  bgGradient:    ['#0a1428', '#1a0d2e', '#241038'],   // 深藏蓝 → 墨紫 → 暗紫红 (低饱和)

  // 维度2: Pure Glassmorphism - 纯白借色发色
  glassFill:        'rgba(255,255,255,0.12)',          // 玻璃面板填充
  glassFillDeep:    'rgba(255,255,255,0.20)',          // 弹窗用 (更浓)
  glassBorder:      'rgba(255,255,255,0.15)',          // 1px 极弱白边
  glassBorderSoft:  'rgba(255,255,255,0.08)',
  shadowColor: '#000', shadowOffset: {0,8},
  shadowOpacity: 0.18, shadowRadius: 32,                // 扩散柔阴影

  // 维度3: Vibrancy & High-Contrast Typography - 文字色彩活力
  textOnGlass:   'rgba(255,255,255,0.95)',             // 主信息 (分数/队名)
  textMuted:     'rgba(255,255,255,0.6)',              // 次要标签
  textFaint:     'rgba(255,255,255,0.4)',

  // 维度4: Layered Materials - 玻璃叠玻璃
  btnGlass:        'rgba(255,255,255,0.18)',           // 按钮底色
  btnGlassBorder:  'rgba(255,255,255,0.25)',           // 按钮边框
  iOSGreen:        'rgba(52,199,89,0.85)',              // #34C759 系统绿, 唯一高亮
  iOSRed:          'rgba(255,69,58,0.85)',              // #FF453A 系统红
  teamBlue:        'rgba(59,130,246,0.9)',              // 仅队伍识别
  teamOrange:      'rgba(249,115,22,0.9)',
};
```

**4 维度核心原则**:
1. **背景永远低饱和** - 不抢戏, 照片才是主体
2. **玻璃自己不发色** - 借色发色, 颜色 100% 取决于背后透出了什么
3. **文字只用纯白** - 不用队色, 靠位置区分主客
4. **按钮是玻璃** - 唯一彩色留给 iOS 系统绿 (开始) / 系统红 (暂停)

## 项目结构

```
ScoreboardApp/
├── App.js           # 主应用（全部组件: DrumPicker / TimePickerModal / HistoryPage / HistoryShareCard / ScorePanel / TimerDisplay / BgImageBtn / ClickRipple / App）
├── app.json         # Expo 配置（应用名：记分板）
├── package.json     # 依赖
├── android/         # 原生 Android 项目（prebuild 生成）
├── assets/
│   ├── icon.png     # 应用图标（记分牌 2:2 风格）
│   ├── gemini-svg.svg # 图标设计源文件
│   └── sounds/      # 音频文件（目前未使用）
├── eas.json         # EAS 云构建配置
├── 记分板-debug.apk     # 最新 debug APK (含 Metro)
├── 记分板-release.apk   # 最新 release APK (含 JS bundle)
└── ScoreboardApp-debug.apk   # 历史 debug APK
```

## 运行

```bash
cd /Users/xiaoxijin/ScoreboardApp
npx expo start
npx expo start --android
```

## 构建 APK

### 本地构建

需要 JDK 17 和 Android SDK：

```bash
# JDK 17
brew install openjdk@17
export JAVA_HOME="/opt/homebrew/opt/openjdk@17/libexec/openjdk.jdk/Contents/Home"

# Android SDK
export ANDROID_HOME=~/Library/Android/sdk

cd /Users/xiaoxijin/ScoreboardApp
# 可选: 全新生成原生工程 (已有 android/ 时跳过)
# npx expo prebuild --platform android --clean

cd android && ./gradlew assembleDebug      # debug APK
cd android && ./gradlew assembleRelease    # release APK
```

APK 位置：
- Debug: `android/app/build/outputs/apk/debug/app-debug.apk`
- Release: `android/app/build/outputs/apk/release/app-release.apk`

### 注意事项

- **AndroidManifest.xml** 需确保 `screenOrientation="unspecified"`, prebuild 默认会写 `"auto"`, 在 Android 14 (小米 14 等) 无效
- **图标** 走 `android/app/src/main/res/mipmap-*/`, 用 sharp 从 `assets/gemini-svg.svg` 生成各尺寸 PNG (48/72/96/144/192 px), 并**删除同名 .webp** 否则 Android 优先用 webp
- **依赖装上后必须 `npx expo prebuild --platform android`** (只在 `android/` 缺失或重新生成时需要)

### EAS 云构建

```bash
eas login
cd /Users/xiaoxijin/ScoreboardApp
eas project:init --force
eas build --platform android --profile preview
```

注意：expo-av 会导致云构建失败，需要先移除 expo-av。

## 关键实现

### 玻璃面板统一实现 (Glassmorphism 模板)

所有"半透明玻璃"面板（中间 timerBox / 弹窗）都用同一模板, 4 层结构:

```jsx
<View style={styles.glassPanel}>
  {/* 第1层: 暗色遮罩 (压在玻璃之下, 负责"地基"压暗 + 降噪) */}
  <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.32)' }]} pointerEvents="none" />

  {/* 第2层: BlurView 模糊背景 (Android RealtimeBlurView, 性能OK) */}
  <BlurView intensity={25} tint="dark" style={StyleSheet.absoluteFill} />

  {/* 第3层: 12% 白色填充 (叠加颜色, 模拟玻璃表面反光) */}
  <View style={[StyleSheet.absoluteFill, { backgroundColor: GLASS.glassFill, borderRadius: 22 }]} pointerEvents="none" />

  {/* 第4层: 1px 15% 白边 (边缘高光折射) */}
  <View style={[StyleSheet.absoluteFill, { borderRadius: 22, borderWidth: 1, borderColor: GLASS.glassBorder }]} pointerEvents="none" />

  {/* 内容 */}
  <View style={styles.glassContent}>...</View>
</View>
```

`styles.glassPanel` 必备属性: `overflow: 'hidden'` (裁剪 BlurView) + 圆角 22 + 阴影.

**各面板的强度差异** (用同一模板但调参):

| 面板 | 暗色遮罩 | BlurView | 白色填充 | 圆角 | 用途 |
|------|---------|----------|---------|------|------|
| timerBox (中间) | 0.32 | 25 | 12% | 22 | 主控制区, 中等 |
| scorePanel (两侧) | 0.28 | 无 (怕盖住用户背景图) | 0 (暗色自带) | 16 | 大面积, 弱化 |
| TimePickerModal | 0.42 | 40 | 20% | 22 | 浮动弹窗, 最浓 |
| 弹窗内滚轮 drumWheel | 0.35 | 无 | 0 (暗色自带) | 12 | 子组件, 中等 |
| historyItem (卡片) | 0.06 (浅白) | 无 | 0 | 12 | 小玻璃块, 浅 |

**重要原则**:
- BlurView 会模糊"它**下方**的内容", 所以放在背景渐变 / 弹窗后面才有意义
- 滚轮不放 BlurView (性能 + 模糊过度影响数字清晰度)
- 两侧 ScorePanel 也不放 BlurView (有背景图时 `ImageBackground` 已经在底层, 叠加会盖住用户图片)
- 弹窗的 BlurView 模糊**主界面** (弹窗下方的整个 app), 制造"浮在主界面上"的感觉

### 滚轮时间选择器 (DrumPicker)

自研竖向滚轮组件, **不依赖第三方**。

**核心结构** (`App.js:106-191`):
```js
const DRUM_ITEM_HEIGHT = 44;
const DRUM_WHEEL_HEIGHT = 180;  // 默认 (竖屏) 高度, 横屏被 modal 调小

function DrumPicker({ value, options, onChange, label, wheelHeight }) {
  const wH = wheelHeight || DRUM_WHEEL_HEIGHT;
  const PADDING = (wH - DRUM_ITEM_HEIGHT) / 2;  // 动态 padding 让选中项居中
  // ...
  <ScrollView
    ref={scrollRef}
    snapToInterval={DRUM_ITEM_HEIGHT}
    decelerationRate="fast"
    onScroll={handleScroll}
    onMomentumScrollEnd={handleMomentumEnd}
    contentContainerStyle={{ paddingVertical: PADDING }}
  >
```

**防回环机制**:
- `useEffect([value])` 同步外部 value → 滚动位置
- `isProgrammaticScroll` ref 标记**程序触发的滚动**, `handleScroll` 看到标记就 return
- `requestAnimationFrame` 在下一帧放开标记

**视觉设计** (zIndex 关键):
- `drumWheel` 容器 (zIndex 0): 暗色 35% 玻璃 `rgba(0,0,0,0.35)`, 边框 `rgba(255,255,255,0.10)` 1px
- `drumSelectionIndicator` (zIndex 3): **白色高亮条** `rgba(255,255,255,0.10)` + 边框 `rgba(255,255,255,0.20)`, 盖在最上 (不再是蓝色)
- 上下 `drumGradient` 蒙层 (zIndex 2): `expo-linear-gradient` 透明渐变 (`rgba(0,0,0,0.6) → rgba(0,0,0,0)`), 中间 44px 干净
- 中间 44px 区域完全不被任何不透明色遮挡, 选中项清晰可见

**样式 (玻璃化)**:
```js
drumWheel:     { width: 72, height: 180, borderRadius: 12, backgroundColor: 'rgba(0,0,0,0.35)',
                 borderWidth: 1, borderColor: 'rgba(255,255,255,0.10)', overflow: 'hidden' }
drumGradient:  { position: 'absolute', left: 0, right: 0, height: 68, zIndex: 2 }
drumSelectionIndicator: { position: 'absolute', top: '50%', left: 0, right: 0,
                 height: 44, transform: [{ translateY: -22 }],
                 backgroundColor: 'rgba(255,255,255,0.10)',
                 borderTopWidth: 1, borderBottomWidth: 1,
                 borderColor: 'rgba(255,255,255,0.20)', zIndex: 3 }
drumItem:         { height: 44, alignItems: 'center', justifyContent: 'center' }
drumItemText:     { fontSize: 24, fontWeight: '500', color: 'rgba(255,255,255,0.4)' }
drumItemSelected: { color: GLASS.textOnGlass, fontWeight: '700' }
```

**交互反馈**:
- 单个 item `Pressable onPress` → `h.select()` + `onChange(opt)`
- `onMomentumScrollEnd` 滚动停止 → 精确吸附 + `h.select()`

### TimePickerModal 横竖屏分逻辑

`TimePickerModal` 总高 (drumWheel 180 + 标题 + 预览 + 按钮 + padding) ≈ 390 dp = 1170 device px。**横屏可用高只有 ~1116 device px**, 弹窗比屏高, 按钮被遮。

修复: `DrumPicker` 接受 `wheelHeight` prop, 横屏缩到 100dp, 配合紧凑布局:

```js
function TimePickerModal({ onConfirm, onClose, initialMinutes, initialSeconds }) {
  const [m, setM] = useState(initialMinutes);
  const [s, setS] = useState(initialSeconds);
  const { width: winW, height: winH } = useWindowDimensions();
  const isLandscape = winW > winH;
  const drumH = isLandscape ? 100 : DRUM_WHEEL_HEIGHT;
  // ...
  <DrumPicker wheelHeight={drumH} ... />
  <Text style={[styles.timeSeparator, isLandscape && styles.timeSeparatorLandscape]}>:</Text>
  <Text style={[styles.timePreview, isLandscape && styles.timePreviewLandscape]}>...</Text>
}

// 横屏紧凑样式
modalContentLandscape:    { padding: 14, gap: 8, borderRadius: 14, minWidth: 220 }
timeSeparatorLandscape:   { fontSize: 28, marginTop: 0 }     // 44 → 28
timePreviewLandscape:     { fontSize: 22 }                  // 32 → 22
```

| 方向 | drumWheel | 弹窗总高 | 取消/确认位置 | 屏内可见 |
|---|---|---|---|---|
| 竖屏 (1200×2670) | 180 dp | ~390 dp | y=2498-2550 | ✓ |
| 横屏 (2670×1200) | 100 dp | ~210 dp | y=1070-1122 | ✓ |

打开 modal 时**同步 `clearInterval(intervalRef.current)`**, 避免 `setRunning(false)` 异步导致 timer 多走 1-2 帧。

主面板 `TimerDisplay` 用 `numberOfLines={1}` + `adjustsFontSizeToFit` + `minimumFontScale={0.7}`, 保证在 130dp 窄面板下不折行。

### 触觉反馈 (h.* 工具)

`App.js:14-22` 顶部定义简化的 `h` 工具, 按交互重要性分级:

| 等级 | API | 用法 |
|---|---|---|
| `h.light()`   | `impactAsync(Light)`     | 减分、换图、设置时间、取消、点击遮罩关闭、删历史单条、关历史页 |
| `h.medium()`  | `impactAsync(Medium)`    | **加分为最常用**、开始/暂停计时、打开历史页、删历史单条 |
| `h.heavy()`   | `impactAsync(Heavy)`     | 结算分数、全部重置、清空历史 |
| `h.select()`  | `selectionAsync()`       | 滚轮 tap 选中 / 滚动停止吸附 |
| `h.success()` | `notificationAsync(Success)` | 时间设置确认、生成分享图 |

所有调用 `.catch(() => {})` 静默吞错——无震动硬件或失败不影响业务。fire-and-forget 不阻塞 UI。

`VIBRATE` 权限在 `android/app/src/main/AndroidManifest.xml` 中声明。

### 战绩历史系统 (通用对战记录)

每次点 `结算` 自动记录当前比分到 AsyncStorage, 用户可打开**全屏历史页面**查看所有记录, 一键生成图片分享。

**数据模型** (单条记录):
```js
{
  id: '1728123456789-abc123',           // Date.now() + 随机后缀, 保证唯一
  timestamp: '2026-06-01T14:23:00.000Z', // ISO 时间
  teamA: { name: '主队', score: 20 },
  teamB: { name: '客队', score: 12 },
  winner: 'A',                          // 'A' | 'B' | 'tie'
  duration: '12:00',                    // 局时长 (mm:ss), 来自 timer 设置值
}
```

**存储** (`AsyncStorage` key=`match_history`):
- `loadHistory()` → array
- `appendHistory(record)` → 自动 unshift 到头部 (最新在前)
- `removeHistoryAt(id)` → 删单条
- `clearAllHistory()` → 清空

**两个组件**:

1. **`HistoryPage`** (全屏页面, **非 Modal 叠层**):
   - 用全屏 `flex: 1` 布局, 没有 `modalOverlay` 半透明黑色背景
   - 主 App 用**条件渲染**切换: `showHistory ? <HistoryPage/> : <主界面>`
   - 主界面 (scoreArea + bottomRow + TimePickerModal) 完全消失, 只剩历史页
   - 顶部 header: 标题 "**对 战 记 录**" (居中, **无 📊 图标**) + 下一行的 "**× 关闭**" 按钮
     - 标题居中避免与状态栏/电池图标撞位
     - × 关闭按钮**移到下一行**避免被状态栏/电池图标遮挡, 加大点击区域 (padding 12 dp)
   - 中间: 顶部统计 `X 场 · 主队 N胜 · 客队 N胜` + 卡片列表 (ScrollView, 占满剩余空间)
   - 底部: 🖼 生成分享图 (主蓝) + 🗑 清空记录 (次红), 永远在底部
   - 卡片宽度 = 屏幕宽 - 32 dp padding, 横屏更宽
   - 横屏竖屏统一布局

2. **`HistoryShareCard`** (屏幕外渲染, ViewShot 截):
   - `position: 'absolute', left: -9999, top: 0, width: 360`
   - 用 `React.forwardRef` 把 ref 透传给 `<ViewShot ref>`
   - 父组件持有 `shareCardRef = useRef(null)`, 分享时 `shareCardRef.current.capture()` 拿 PNG URI
   - **始终渲染, 条件渲染外**: 即使 HistoryPage 显示, 分享卡也要在 DOM 里保持 ref 有效
   - 内容: 标题"对 战 记 录" + 日期 + 最多 10 条记录 (队名 + 比分 + 🏆 + 时间 · 局时长) + 统计 + 记分板水印
   - **⚠️ 重要：shareCard 故意不用 `borderRadius`**: `react-native-view-shot` 截的是矩形 bounding box, 不应用 RN 渲染时的 `borderRadius` 圆角裁剪. 圆角会让 PNG 4 角变成透明像素, 分享到微信白底时被填成"白色倒角". 保持 `borderRadius: 0` 才能让 PNG 在任何白底上都干净. (见第十三轮修复)

**集成流程**:
```js
return (
  <LinearGradient>
    {showHistory ? (
      <HistoryPage history={history} ... />
    ) : (
      <>
        <View style={styles.scoreArea}>...</View>
        <View style={styles.bottomRow}>...</View>
        {showPicker && <TimePickerModal />}
      </>
    )}
    {/* 始终渲染 (ref 必须保持, 不能 unmount) */}
    <HistoryShareCard ref={shareCardRef} history={history} ... />
  </LinearGradient>
);
```

**为什么改成 HistoryPage 而非 HistoryModal**:
- Modal 模式 (旧): 弹窗叠在主界面上, 半透明黑色背景, 用户看到主比分界面"缩小"
- Page 模式 (新): 条件渲染完全替换主界面, 用户看到干净的独立页面
- 横屏/竖屏统一, 没有"叠层感"或"缩小感"

**为什么不绑定运动**: 项目定位是通用比分记录 (篮球/乒乓球/羽毛球等都用), UI 中:
- 无 🏀 / 🏓 / ⚽ 等球类 emoji
- 标题/水印用通用文案 ("对战记录", "记分板")
- 胜方标记用 🏆 (奖杯, 通用)
- 队名由用户自定义, 不预设任何运动术语

### 背景图持久化 (expo-file-system@56 class API)

`expo-file-system@56` 完全重写, 旧的 `FileSystem.copyAsync / getInfoAsync / makeDirectoryAsync / documentDirectory` 全部移除。本项目用新 class-based API:

```js
import { File, Directory, Paths } from 'expo-file-system';

const IMG_DIR = Paths.document.uri + 'team_logos/';

async function ensureDir() {
  const dir = new Directory(IMG_DIR);
  if (!dir.exists) dir.create({ intermediates: true });
}

async function pickAndSaveImage(side) {
  // ...picker...
  await ensureDir();
  await clearSavedImage(side);                              // 删旧文件
  const sourceFile = new File(result.assets[0].uri);
  const ext        = sourceFile.extension || 'jpg';
  const destPath   = IMG_DIR + `team_${side}_${Date.now()}.${ext}`;  // 关键:时间戳
  await sourceFile.copy(new File(destPath));
  await AsyncStorage.setItem(...);
  return destPath;
}

// 启动时恢复
const check = async (p) => p && new File(p).exists ? p : null;
```

**关键点**:
- 文件名必须带 `Date.now()` 时间戳, **否则 React Native Image 缓存按 URI 复用旧 bitmap**, 新图无法刷新
- `exists` / `create` / `delete` 多数是**同步**方法; 只有 `copy` / `move` 是 async
- `Paths.document.uri` 替代旧的 `FileSystem.documentDirectory`

### 减分按钮位置 (底部行重构)

- 旧版: -1 在 score panel 内部, 被背景图压住
- 新版: -1 在 `scoreArea` 外的 `bottomRow` (屏幕最底部), **3 槽 flex 布局镜像上方 scoreArea** (`[flex:1, 130dp, flex:1]`), -1 按钮自然落在各自 score panel 中心
- 队名输入框**已在 centerPanel 顶部** (`teamNameRow`), 不再在 timerBox 内部
- `ScorePanel` 不接受 `onSub` prop, 减分逻辑完全在父组件通过底部行触发
- 关键样式:
```js
bottomRow:    { flexDirection: 'row', alignItems: 'center' }
bottomSide:   { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 6 }
bottomCenter: { width: 130 }   // 匹配 centerPanel 宽度, 镜像上方布局
```

### 背景图尺寸自适应

用 `useWindowDimensions` 监测方向 + `LinearGradient(timerBox).onLayout` 测中间面板**内容高度**, 传给 `ScorePanel.bgImageHeight` 约束 bg 图:

- **竖屏**: `bgImageHeight = undefined`, bg 图 `flex: 1` 填满 score panel (= 全屏)
- **横屏**: `bgImageHeight = centerH` (timerBox 实测高度 dp), bg 图高度匹配 timerBox

```js
const { width: winW, height: winH } = useWindowDimensions();
const isLandscape = winW > winH;
const [centerH, setCenterH] = useState(0);

<LinearGradient ... onLayout={(e) => setCenterH(e.nativeEvent.layout.height)}>

<ScorePanel bgImageHeight={isLandscape ? centerH : undefined} ... />

// ScorePanel 内根据 bgImageHeight 决定 bg 图高度
style={bgImageHeight
  ? { ..., height: bgImageHeight }
  : styles.bgImageFill}   // 默认 flex: 1
```

### 横屏 bg 图 + 边线底部对齐 timerBox

横屏时 timerBox 顶部有 teamNameRow + paddingTop, bg 图自然渲染位置比 timerBox 顶部高约 94 device px, 导致两者底部不对齐。通过给 `ScorePanel` 增加 `bgImageTop` prop 传入横屏偏移量, 用 `marginTop: bgImageTop` 把 bg 图压到 timerBox 起始位置:

```js
<ScorePanel
  bgImageHeight={isLandscape ? centerH : undefined}
  bgImageTop={isLandscape ? 30 : 0}   // 30 dp = 90 device px 偏移
  ...
/>

// ScorePanel 内
style={bgImageHeight
  ? { width: '100%', height: bgImageHeight, marginTop: bgImageTop || 0, ... }
  : styles.bgImageFill}
```

边线 (左蓝/右橙) 同步 bg 图高度:

```js
<View style={[
  styles.sideBorder,
  side === 'left' ? styles.sideBorderLeft : styles.sideBorderRight,
  { backgroundColor: color, height: bgImageHeight || '100%' },
]} />
```

### 中间面板横竖屏分逻辑

`centerPanel` 基础样式 `alignItems: 'center'`, `justifyContent` 和 `paddingTop` 按方向动态切换:

```js
const { width: winW, height: winH } = useWindowDimensions();
const isLandscape = winW > winH;

const centerPanelDynamicStyle = isLandscape
  ? { justifyContent: 'flex-start', paddingTop: 24 }   // 横屏: 贴顶让出状态栏
  : { justifyContent: 'center', paddingTop: 80 };      // 竖屏: 居中避开状态栏

<View style={[styles.centerPanel, centerPanelDynamicStyle]}>
  ...
</View>
```

### 中间面板布局 (核心结构)

```
teamNameRow     [主队输入框] [VS] [客队输入框]   ← 顶部一行
timerBox (LinearGradient) {
  TimerDisplay (时间)
  开始/暂停按钮
  设置时间按钮
  ──divider──
  "背景图" label
  bgImageRow [主队] [客队]   ← 一排
  ──divider──
  actionRow [结算] [重置]    ← 一排
  ──divider──
  📊 分享战绩 按钮
}
```

### 涟漪动画

- `ClickRipple` 组件, 点击位置追踪 (`locationX/locationY`)
- `Animated.timing` + `useNativeDriver: false`
- 400ms 动画时长
- 同时触发 `scale: 0→1` + `opacity: 0.8→0`
- 分数数字同步缩放: `scale: 1→1.18→1` (80ms 放大 + spring 弹回)

### 声音播放 (已禁用)

`expo-av` 与 Expo SDK 56 存在兼容性问题 (NoClassDefFoundError: LazyKType), 暂时禁用。音频文件仍保留在 `assets/sounds/`, 等待修复后可重新启用。

`App.js:103-104` 保留 `playSound()` stub, 暂无调用方。

### 应用图标

**记分牌 2:2 风格** (`assets/gemini-svg.svg`):

- 深色圆角方形背景 (rx=44), 渐变 `#1e3a5f → #0f172a`
- 两个圆角矩形 (记分牌轮廓), 居中排开, `stroke-width=5`
- 两个 "2" 数字分别填在左右矩形内 (fontSize 42, fontWeight 800)
- 中间一个圆点 (r=3) 作为分隔/焦点
- 笔画白色渐变 (`#FFFFFF → #CBD5E1`)

**为什么这样设计** (对比 Comet / Grok / 剪映 / Perplexity):
- 系统级图标都是 "**单一焦点 + 大量留白**" 风格
- 旧版塞了 12+ 元素 (篮筐×2 / 罚球区×2 / 中线×4 / 圆点×2 / 数字×2), 没有焦点
- 笔画粗 (4.5) 在小尺寸下显臃肿
- 18% 自适应图标安全区把边缘篮筐切掉, 看起来更满更挤

**生成流程**:
```bash
# 用 sharp (Node.js) 从 gemini-svg.svg 生成各尺寸 PNG
cd /Users/xiaoxijin/ScoreboardApp
node -e "
const sharp = require('sharp');
const svg = require('fs').readFileSync('assets/gemini-svg.svg');
const sizes = { mdpi: 48, hdpi: 72, xhdpi: 96, xxhdpi: 144, xxxhdpi: 192 };
for (const [dir, size] of Object.entries(sizes)) {
  sharp(svg).resize(size, size).png()
    .toFile(\`android/app/src/main/res/mipmap-\${dir}/ic_launcher.png\`);
  sharp(svg).resize(size, size).png()
    .toFile(\`android/app/src/main/res/mipmap-\${dir}/ic_launcher_round.png\`);
  sharp(svg).resize(size, size).png()
    .toFile(\`android/app/src/main/res/mipmap-\${dir}/ic_launcher_foreground.png\`);
}
"
# 删除旧的 .webp (否则 Android 优先用 webp)
find android/app/src/main/res/mipmap-* -name "*.webp" -delete
```

### 启动屏（去掉 expo 默认白屏）

exo 默认 splash 是个**白色背景 + 灰色"篮球场"同心圆 logo** (`@drawable/splashscreen_logo`), 启动时闪一下消失, 视觉上突兀。

**修复**: 改为纯色背景, 颜色 = `@color/iconBackground` (`#0f172a` 深蓝黑), 跟主背景一致, 启动瞬间无过渡感。

```xml
<!-- android/app/src/main/res/drawable/ic_launcher_background.xml -->
<layer-list xmlns:android="http://schemas.android.com/apk/res/android">
  <item android:drawable="@color/iconBackground"/>
  <!-- 删除了 <bitmap android:src="@drawable/splashscreen_logo"/> 那个白色篮球场图 -->
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

## 已知问题

1. **expo-av 崩溃** - 与 expo-modules-core@56.0.14 不兼容, 需等待官方修复 (本项目未使用)
2. **AndroidManifest screenOrientation** - prebuild 默认写 `"auto"`, 在 Android 14 小米 14 上无效, 需改为 `"unspecified"`
3. **expo-haptics 在无振动器设备上静默失败** - 已在 `h.*` 内统一 `.catch(() => {})`
4. **mipmap 旧 webp 优先** - 重新生成 PNG 后必须 `find ... -name "*.webp" -delete`, 否则 Android 优先用 webp 不会用新 PNG

## 更新日志

- **2026-06-02 (第二十一轮: 全面玻璃化 Glassmorphism 4 维度)**:
  - 装依赖 `expo-blur@56.0.3`，新增 `GLASS` 主题常量（4 维度集中定义）
  - **维度1 背景**: `bgGradient: ['#0a1428','#1a0d2e','#241038']` 替代高饱和蓝紫粉
  - **维度2 玻璃**: timerBox 暗色 0.32 + BlurView 25 + 12% 玻璃填充 + 1px 15% 白边 + 阴影
  - **维度3 文字**: 全部纯白 0.95 / 半透白 0.6，队名/胜场 0.85
  - **维度4 按钮**: 全部玻璃叠玻璃，开始用 iOS 系统绿 `#34C759` 0.85，暂停用系统红 `#FF453A` 0.85
  - 两侧 ScorePanel: 暗色 0.28 + 玻璃边 (无 BlurView，怕盖住用户背景图)
  - 弹窗 TimePickerModal: 暗色 0.42 + BlurView 40 模糊主界面
  - 滚轮 drumWheel: 暗色 0.35 + 白色高亮条 (不再是蓝色)
  - HistoryPage 卡片: 小玻璃块 (白 6% + 1px 10% 白边)
  - 分享卡: 保持 `borderRadius: 0`，深紫背景 + 纯白文字
  - "分享战绩" 按钮从"独占玻璃块"改为"纯文字链接"风格
  - 验证: 阶段 1-4 真机截图全部 OK，整体观感 iOS 控制中心
  - **未做**: 阶段 2.5 "蓝/橙中线穿过修复" (用户暂不要大改布局)
- **2026-06-02 (第十三轮: 分享图片去白边)**: 
  - 问题：分享到微信/朋友圈时 PNG 4 角是透明像素，被白底填成"白色倒角"
  - 根因：`react-native-view-shot` 截的是矩形 bounding box，不应用 RN 的 `borderRadius` 圆角裁剪
  - 修复：`shareCard.borderRadius: 16 → 0` + `borderWidth: 0` (单行改动)
  - 验证：真机分享面板截图，4 角干净无白边，深色矩形在白底上协调
- **2026-06-02 (第十二轮: 启动屏去白)**:
  - 去掉 expo 默认 splash 白色"篮球场" logo (`@drawable/splashscreen_logo`)
  - 改 2 个文件: `drawable/ic_launcher_background.xml` (删除 bitmap 层) + `values/styles.xml` (`Theme.App.SplashScreen.windowBackground` → `@color/iconBackground`)
  - 启动瞬间从白色篮球场 → 主界面, 改为纯色 `#0f172a` → 主界面, 无视觉跳变
- **2026-06-02 (第十一轮: 图标重设计)**:
  - 重新设计应用图标: 篮球场 (12+ 元素) → 记分牌 2:2 (3 元素: 2 个圆角矩形 + 中间圆点)
  - 笔画 4.5 → 5, 字号 30 → 42 (数字 + 焦点)
  - 留出 21% 边距, 避开自适应图标 18% 安全区裁剪
  - 5 个 mipmap 目录用 sharp 重新生成, 删除旧 webp
- **2026-06-01 (第十轮: 无变更)** - 保持现状
- **2026-06-01 (第九轮: 设置时间功能修复)**: 见代码历史 (因后续回滚 DrumPicker, 此条目仅作记录)
- **2026-06-01 (第八轮: UI 调整)**:
  - 背景图按钮一排: `BgImageBtn` 去掉 🖼/＋ 图标纯文字, timerBox 内 主队/客队 用 `<View style={bgImageRow}>` 排成一排, 减少 timerBox 高度修复横屏 -1 按钮遮挡
  - HistoryPage 头部修复: 去掉标题前 📊 emoji, 标题居中 (`textAlign: 'center'`), × 关闭按钮从右上移到下一行独立 (避免被状态栏/电池图标遮挡, 加大点击区域 padding 12dp)
- **2026-06-01 (第七轮: HistoryPage 全屏页面)**:
  - 把 `HistoryModal` (modalOverlay 叠层) 改成 `HistoryPage` (全屏页面)
  - 去掉半透明黑色背景, 主 App 用条件渲染: `showHistory ? <HistoryPage/> : <主界面>`
  - 关闭历史页时, 主比分界面 (-1 按钮 + TimePickerModal) 完全恢复
  - 横屏/竖屏统一: 都是同一个全屏布局, 卡片用屏宽-32dp padding
  - 新增样式 `historyPageRoot / Header / Stats / List / Footer` 替代 `historyCard / historyHeader / historyButtons`
- **2026-06-01 (第六轮: 战绩系统)**:
  - 新增 `HistoryShareCard` + `HistoryPage` 组件, 实现通用对战记录系统
  - 装依赖 `react-native-view-shot@5.1.0` + `expo-sharing@56.0.15`
  - 中间面板: 结算/重置 一排, 底部加 `📊 分享战绩` 按钮
  - 结算时自动 `appendHistory(record)` 到 AsyncStorage `match_history`
  - × 删单条, 🗑 清空全部 (带震动反馈)
  - 分享卡截图用 `view-shot` 截 React 组件, `expo-sharing` 调起系统分享面板
  - 通用化设计: 无任何运动 emoji (无 🏀/🏓), 用 🏆 标记胜方
  - 真机验证: 4:3 结算 → modal 显示记录 → 分享卡预览 → 删单条 → 空态, 全部 OK
- **2026-06-01 (第五轮)**:
  - `TimePickerModal` 横屏被遮修复: `DrumPicker` 接受 `wheelHeight` prop; `TimePickerModal` 用 `useWindowDimensions` 分逻辑, 横屏用紧凑布局 (drumWheel 100dp + 字号 22 + padding 14), 竖屏维持原 180dp
  - UI dump 实测: 横屏 取消/确认 y=1070-1122 都在屏内; 竖屏 y=2498-2550 也在屏内
- **2026-06-01 (第四轮)**:
  - 横屏 bg 图底部对齐 timerBox: 增加 `bgImageTop` prop 传入 `marginTop: 30 dp` 偏移, UI dump 实测 bg 图 bottom=timerBox bottom=1072
  - 横屏边线 (左蓝/右橙) 高度跟 bg 图同步: `height: bgImageHeight || '100%'`
  - 中间面板横竖屏分逻辑: `useWindowDimensions` + `centerPanelDynamicStyle`, 横屏贴顶+让出状态栏、竖屏垂直居中+顶部留 80 dp
- **2026-06-01 (第三轮)**:
  - -1 按钮 bottomRow 改为 3 槽 flex (`[flex:1, 130dp, flex:1]`) 镜像 scoreArea 布局, -1 自然落在各自 score panel 中心 (横屏 x=570/2100, 竖屏 x=202)
  - 中间面板"背景图" label `alignSelf: flex-start → center`, 与 ＋主队/＋客队 按钮视觉居中
  - 背景图尺寸自适应: 用 `useWindowDimensions` + `timerBox.onLayout`, 竖屏填满 score panel, 横屏约束到 timerBox 实测高度
- **2026-06-01 (第二轮)**:
  - 背景图持久化迁移到 `expo-file-system@56` class API (`File` / `Directory` / `Paths`), 修复原 API 移除导致的"图片保存失败"
  - 背景图换图: 文件名加 `Date.now()` 时间戳 + 删旧文件, 绕过 RN Image 缓存复用旧 URI 的问题
  - -1 按钮从 score panel 内部移到屏幕最底部 `bottomRow` (3 槽 flex, 左右各一), 不再被背景图遮挡
  - 队名输入框从 `centerPanel.timerBox` 移到 `centerPanel.teamNameRow` 顶部独立一行
- **2026-06-01 (第一轮)**: 滚轮选择器 (DrumPicker) 完整实现; 接入 `expo-haptics` 全交互点; TimerDisplay 加 `adjustsFontSizeToFit` 防窄面板折行; 图标更新为篮球场风格 (`gemini-svg.svg`), 删除 `mipmap-anydpi-v26` 使用 PNG 图标, 应用名改为"记分板"
