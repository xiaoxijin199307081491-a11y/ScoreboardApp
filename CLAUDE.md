# ScoreboardApp 项目指南

## 项目概述
篮球计分牌 App（应用名：记分板），支持双队计分、计时、胜负记录和横竖屏自适应布局。声音功能暂时禁用。

## 快速开始

```bash
cd /Users/xiaoxijin/ScoreboardApp
npx expo start
```

## APK 构建

### 环境要求
- JDK 17：`brew install openjdk@17`
- Android SDK：位于 ~/Library/Android/sdk

### 本地构建
```bash
export JAVA_HOME="$(brew --prefix openjdk@17)"
export ANDROID_HOME=~/Library/Android/sdk
cd /Users/xiaoxijin/ScoreboardApp
npx expo prebuild --platform android --clean
# 修复 AndroidManifest.xml 中 screenOrientation="auto" → "unspecified"
cd android && ./gradlew assembleRelease
```

### EAS 云构建
```bash
eas login
cd /Users/xiaoxijin/ScoreboardApp
eas project:init --force
eas build --platform android --profile preview --no-wait
```

## 布局要点

见 LAYOUT.md

## 常见问题

- `Animated.Easing.out undefined`：从 react-native 直接导入 Easing
- `Transform with key of "scale"`：使用 `useNativeDriver: false`
- 颜色模板字符串（`${color}44`）：StyleSheet 不支持，改用内联样式
- APK 闪退（NoClassDefFoundError: LazyKType）：移除 expo-av
- AndroidManifest screenOrientation "auto" 无效：改为 "unspecified"

## 版本信息

- 当前 APK：记分板.apk
- 应用包名：com.anonymous.ScoreboardApp
- 应用图标：玻璃态风格（深色背景、蓝10 橙08）