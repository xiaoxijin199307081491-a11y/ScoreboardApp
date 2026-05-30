# ScoreboardApp

React Native Expo 篮球记分牌应用（应用名：记分板）。

## 技术栈

- **Expo SDK 56** + React Native 0.85.3
- **expo-linear-gradient** - 渐变背景
- ~~**expo-av**~~ - 音频播放（**已禁用**，与 SDK 56 存在 LazyKType 崩溃 bug）
- **Animated API** - 涟漪动画、分数缩放

## 项目结构

```
ScoreboardApp/
├── App.js           # 主应用（全部组件）
├── app.json         # Expo 配置（应用名：记分板）
├── package.json     # 依赖
├── android/         # 原生 Android 项目（prebuild 生成）
├── assets/
│   ├── icon.png     # 应用图标（玻璃态风格：10 | 08）
│   └── sounds/      # 音频文件（目前未使用）
├── eas.json         # EAS 云构建配置
└── 记分板.apk       # 最新构建的 APK
```

## 运行

```bash
cd /Users/xiaoxijin/ScoreboardApp
npx expo start
npx expo start --android
npx expo start --ios
```

## 构建 APK

### 本地构建

需要 JDK 17 和 Android SDK：

```bash
# JDK 17
brew install openjdk@17
export JAVA_HOME="$(brew --prefix openjdk@17)"

# Android SDK
# 位于 ~/Library/Android/sdk
export ANDROID_HOME=~/Library/Android/sdk

cd /Users/xiaoxijin/ScoreboardApp
npx expo prebuild --platform android --clean
# 修复 AndroidManifest.xml 中 screenOrientation="auto" → "unspecified"
cd android && ./gradlew assembleRelease
```

APK 位置：`android/app/build/outputs/apk/release/app-release.apk`

### EAS 云构建

```bash
eas login
cd /Users/xiaoxijin/ScoreboardApp
eas project:init --force
eas build --platform android --profile preview
```

注意：expo-av 会导致云构建失败，需要先移除 expo-av。

## 关键实现

### 声音播放（已禁用）
expo-av 与 Expo SDK 56 存在兼容性问题（NoClassDefFoundError: LazyKType），暂时禁用。
音频文件仍保留在 assets/sounds/，等待修复后可重新启用。

### 涟漪动画
- 点击位置追踪（locationX/locationY）
- Animated.timing + useNativeDriver: false
- 400ms 动画时长

### 滚轮时间选择器
- DrumPicker 组件 + Animated.ScrollView
- handleScroll 计算选中项

### 应用图标
玻璃态风格，使用 Python PIL 生成：
- 深色背景 + 圆角玻璃面板
- 蓝色 "10" 和橙色 "08"
- 中央渐变分割线（蓝→白→橙）
- 顶部红色小圆点

## 已知问题

1. **expo-av 崩溃** - 与 expo-modules-core@56.0.14 不兼容，需等待官方修复
2. **AndroidManifest screenOrientation** - "auto" 在 Android 14 小米 14 上无效，需改为 "unspecified"

## 更新日志

- 2026-05-31：移除 expo-av 解决崩溃问题，应用名改为"记分板"，更新图标为玻璃态风格