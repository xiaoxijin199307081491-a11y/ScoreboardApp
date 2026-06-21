# 记分板 (ScoreboardApp)

一个简洁的双队记分牌 App，适用于篮球、乒乓球、羽毛球等各类对战计分场景。基于 [Expo](https://expo.dev) / React Native，**一套代码同时支持 Android 与 iOS**。

## 功能

- ⚖️ **双队计分** — 加分 / 减分，主队 / 客队独立计分
- ⏱️ **比赛计时** — 自研滚轮时间选择器，开始 / 暂停 / 自定义时长
- 🔊 **比分语音播报** — 每次计分用设备自带离线 TTS 播报「X 比 Y」，可一键开关
- 🏆 **胜负记录与战绩历史** — 自动记录每场结果，一键生成分享图
- 🖼️ **队伍背景图** — 为每队设置自定义背景图
- 📳 **全交互震动反馈** — 5 档触觉等级
- 📱 **横竖屏自适应** — 自动调整布局
- 🪟 **Glassmorphism 玻璃拟态 UI** — 苹果风格毛玻璃材质

## 技术栈

- Expo SDK 56 · React Native 0.85 · React 19
- `expo-speech`（语音播报）· `expo-haptics`（震动）· `expo-blur`（毛玻璃）
- `expo-linear-gradient` · `expo-image-picker` · `expo-file-system`
- `react-native-view-shot` + `expo-sharing`（截图分享）· AsyncStorage（持久化）

## 快速开始

```bash
npm install
npx expo start
```

然后用 Expo 开发构建运行，或按下方说明构建原生包。

## 构建

### Android (APK)

需要 JDK 17 + Android SDK：

```bash
export JAVA_HOME="$(/usr/libexec/java_home -v 17)"
export ANDROID_HOME=~/Library/Android/sdk

npx expo prebuild --platform android   # 首次或原生配置变更时
cd android && ./gradlew assembleRelease
# 产物: android/app/build/outputs/apk/release/app-release.apk
```

### iOS

需要 macOS + Xcode + CocoaPods：

```bash
npx expo prebuild --platform ios       # 首次或原生配置变更时
npx expo run:ios                       # 编译并在模拟器运行
```

> 安装到真机 iPhone 需要 Apple 开发者账号签名。

## 许可证

[MIT](./LICENSE)
