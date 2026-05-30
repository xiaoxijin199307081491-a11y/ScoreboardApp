# ScoreboardApp 布局配置

## 核心布局结构

```javascript
// 外层容器
scoreArea: { flex: 1, flexDirection: 'row', alignItems: 'stretch' }

// 两侧分数面板
scorePanel: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 8 }
scorePanelInner: { flex: 1, alignItems: 'center', justifyContent: 'space-around', borderRadius: 12, paddingVertical: 20, width: '100%', height: '100%', position: 'relative' }

// 中间计时器面板
centerPanel: { width: 130, alignItems: 'center', justifyContent: 'center', gap: 8, zIndex: 2 }
```

## 横竖屏适配要点

- `scoreArea` 使用 `flexDirection: 'row'` 实现横向排列
- 两侧 `scorePanel` 使用 `flex: 1` 平分空间
- 中间 `centerPanel` 固定 `width: 130`，不会被压缩
- **禁止在 centerPanel 使用 `flex: 1`**，否则会挤压两侧面板，导致中间太宽、两侧太窄
- `scorePanelInner` 必须是 `width: '100%'` 才能正确填充
- 使用 `height: '100%'` 确保侧边框延伸到底部

## 侧边框

```javascript
sideBorder: { position: 'absolute', top: 0, height: '100%', width: 3, borderRadius: 2, opacity: 0.5 }
sideBorderLeft: { right: 0 }   // 左侧面板的边框在右侧
sideBorderRight: { left: 0 }  // 右侧面板的边框在左侧
```

## 信息列位置

```javascript
// 主队（左侧面板）：infoColumn 在右侧
infoColumn: { position: 'absolute', top: '15%', alignItems: 'center' }
infoColumnLeft: { left: 0, paddingLeft: 8 }   // 左侧面板用
infoColumnRight: { right: 0, paddingRight: 8, alignItems: 'flex-end' }  // 右侧面板用
```

队名和胜负信息通过条件判断：
```javascript
// 左侧面板
<View style={[styles.infoColumn, side === 'left' ? styles.infoColumnRight : styles.infoColumnLeft]}>
```

## 错误记录

- 曾尝试给 centerPanel 加 `flex: 1` 和 `maxWidth`，导致中间太宽、两侧太窄
- 修复：恢复固定 `width: 130`，保持原有布局
- 曾尝试修改 infoColumnLeft/Right 的 alignItems 导致队名偏移，修复为条件组合
- AndroidManifest screenOrientation="auto" 在 Android 14 小米 14 无效
- 修复：改为 "unspecified"

## 更新日志

- 2026-05-31：确认布局配置稳定，更新文档