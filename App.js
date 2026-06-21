import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, Pressable, Animated,
  TextInput, ImageBackground, Alert, ScrollView, useWindowDimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { File, Directory, Paths } from 'expo-file-system';
import * as Haptics from 'expo-haptics';
import * as Speech from 'expo-speech';
import {
  createAudioPlayer, useAudioRecorder, RecordingPresets,
  AudioModule, setAudioModeAsync,
} from 'expo-audio';
import * as Sharing from 'expo-sharing';
import ViewShot from 'react-native-view-shot';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ─── 震动反馈 (expo-haptics) ──────────────────────────────────
// Android 已配 VIBRATE 权限; 部分低端机 / 模拟器调用可能无设备响应, .catch 静默吞错
const h = {
  light:   () => Haptics.impactAsync (Haptics.ImpactFeedbackStyle.Light  ).catch(() => {}),
  medium:  () => Haptics.impactAsync (Haptics.ImpactFeedbackStyle.Medium ).catch(() => {}),
  heavy:   () => Haptics.impactAsync (Haptics.ImpactFeedbackStyle.Heavy  ).catch(() => {}),
  select:  () => Haptics.selectionAsync()                                       .catch(() => {}),
  success: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {}),
};

// ─── 语音播报 (expo-speech, 设备自带离线 TTS) ─────────────────
// 整数转中文读法 (0-999, 比分场景足够), 让 TTS 读 "二比一" 而不是含糊数字
function numToZh(n) {
  const d = ['零', '一', '二', '三', '四', '五', '六', '七', '八', '九'];
  if (n < 0) return '零';
  if (n < 10) return d[n];
  if (n < 20) return n === 10 ? '十' : '十' + d[n - 10];
  if (n < 100) {
    const t = Math.floor(n / 10), o = n % 10;
    return d[t] + '十' + (o ? d[o] : '');
  }
  const hu = Math.floor(n / 100), rem = n % 100;
  let s = d[hu] + '百';
  if (rem === 0) return s;
  if (rem < 10) return s + '零' + d[rem];
  const t = Math.floor(rem / 10), o = rem % 10;
  return s + d[t] + '十' + (o ? d[o] : '');
}

// 播报比分 "X 比 Y", fire-and-forget; 先 stop 清掉上一条避免连点排队
const STORAGE_KEY_VOICE = 'voice_on';
function speakScore(a, b) {
  try {
    Speech.stop();
    Speech.speak(`${numToZh(a)}比${numToZh(b)}`, { language: 'zh-CN', rate: 1.0 });
  } catch {}
}

// ─── Glassmorphism 主题 (iOS 控制中心风格, 苹果 4 维度) ─────
// 维度1: 暗夜微光渐变 (Muted Ambient Gradient)
// 维度2: 纯白 12% 玻璃 + 1px 15% 白边 + 扩散柔阴影
// 维度3: 纯白 95% / 半透白 60% 文字 (Vibrancy)
// 维度4: 玻璃叠玻璃按钮 + iOS 系统绿高亮
const GLASS = {
  // 维度1: 背景 - 深藏蓝 → 墨紫 → 暗紫红, 低饱和
  bgGradient: ['#0a1428', '#1a0d2e', '#241038'],
  // 维度2: 中间面板玻璃
  glassFill:        'rgba(255,255,255,0.12)',
  glassFillDeep:    'rgba(255,255,255,0.20)',  // 弹窗用, 比大面板浓
  glassBorder:      'rgba(255,255,255,0.15)',  // 极弱 1px 白边
  glassBorderSoft:  'rgba(255,255,255,0.08)',  // 边角几乎不可见
  // 维度2: 阴影 (大扩散半径, 极低透明度)
  shadowColor:   '#000000',
  shadowOffset:  { width: 0, height: 8 },
  shadowOpacity: 0.18,
  shadowRadius:  32,
  // 维度3: 文字 Vibrancy
  textOnGlass:   'rgba(255,255,255,0.95)',  // 主信息 (分数/队名)
  textMuted:     'rgba(255,255,255,0.6)',   // 次要标签
  textFaint:     'rgba(255,255,255,0.4)',
  // 维度4: 按钮
  btnGlass:        'rgba(255,255,255,0.18)',  // 按钮底色
  btnGlassBorder:  'rgba(255,255,255,0.25)',
  // iOS 系统绿 (#34C759) 带 0.85 透明度, 作为唯一高亮色
  iOSGreen:        'rgba(52,199,89,0.85)',
  iOSRed:          'rgba(255,69,58,0.85)',    // 暂停时也用系统色
  // 保留主队蓝/客队橙 (仅用于队伍识别, 不用于按钮)
  teamBlue:        'rgba(59,130,246,0.9)',    // 队名/比分数字
  teamOrange:      'rgba(249,115,22,0.9)',
};

// ─── 图片持久化 (expo-file-system@56 class API) ───────────────
const IMG_DIR          = Paths.document.uri + 'team_logos/';
const STORAGE_KEY_LEFT  = 'team_bg_left';
const STORAGE_KEY_RIGHT = 'team_bg_right';

// ─── 战绩历史存储 (通用对战记录) ─────────────────────────────
const HISTORY_KEY = 'match_history';

async function loadHistory() {
  try {
    const raw = await AsyncStorage.getItem(HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

async function saveHistory(history) {
  await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(history));
}

async function appendHistory(record) {
  const list = await loadHistory();
  list.unshift(record);   // 最新的在前
  await saveHistory(list);
  return list;
}

async function removeHistoryAt(id) {
  const list = await loadHistory();
  const filtered = list.filter(r => r.id !== id);
  await saveHistory(filtered);
  return filtered;
}

async function clearAllHistory() {
  await AsyncStorage.removeItem(HISTORY_KEY);
}

async function ensureDir() {
  const dir = new Directory(IMG_DIR);
  if (!dir.exists) dir.create({ intermediates: true });
}

async function pickAndSaveImage(side) {
  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (status !== 'granted') {
    Alert.alert('需要相册权限', '请在系统设置中允许访问相册');
    return null;
  }
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    quality: 0.85,
  });
  if (result.canceled) return null;

  await ensureDir();
  // 先删旧文件,避免同 URI 被 Image 缓存复用导致 UI 不刷新
  await clearSavedImage(side);
  // 用时间戳生成新文件名,保证每次保存 URI 都不相同
  const sourceFile = new File(result.assets[0].uri);
  const ext        = sourceFile.extension || 'jpg';
  const destPath   = IMG_DIR + `team_${side}_${Date.now()}.${ext}`;
  await sourceFile.copy(new File(destPath));
  await AsyncStorage.setItem(side === 'left' ? STORAGE_KEY_LEFT : STORAGE_KEY_RIGHT, destPath);
  return destPath;
}

async function clearSavedImage(side) {
  const key  = side === 'left' ? STORAGE_KEY_LEFT : STORAGE_KEY_RIGHT;
  const path = await AsyncStorage.getItem(key);
  if (path) {
    const file = new File(path);
    if (file.exists) file.delete();
  }
  await AsyncStorage.removeItem(key);
}

// ─── 队伍加分音效 (expo-audio 录制/播放 + expo-document-picker 选文件) ──
// 持久化方式与背景图一致: 复制到 document 目录, 文件名带 Date.now() 时间戳, 路径存 AsyncStorage
const SOUND_DIR              = Paths.document.uri + 'team_sounds/';
const STORAGE_KEY_SOUND_LEFT  = 'team_sound_left';
const STORAGE_KEY_SOUND_RIGHT = 'team_sound_right';
const STORAGE_KEY_SOUND_ON    = 'sound_on';
const SOUND_KEYS = [STORAGE_KEY_SOUND_LEFT, STORAGE_KEY_SOUND_RIGHT];

async function ensureSoundDir() {
  const dir = new Directory(SOUND_DIR);
  if (!dir.exists) dir.create({ intermediates: true });
}

async function clearSavedSound(side) {
  const idx  = side === 'left' ? 0 : 1;
  const path = await AsyncStorage.getItem(SOUND_KEYS[idx]);
  if (path) {
    const file = new File(path);
    if (file.exists) file.delete();
  }
  await AsyncStorage.removeItem(SOUND_KEYS[idx]);
}

// 把任意来源音频 (录音临时文件 / 文件选择器结果) 持久化到 SOUND_DIR, 返回新路径
async function saveSoundFromUri(side, sourceUri, name) {
  await ensureSoundDir();
  await clearSavedSound(side);              // 先删旧文件, 避免残留
  const src = new File(sourceUri);
  let ext = src.extension || (name && name.includes('.') ? name.split('.').pop() : '') || 'm4a';
  ext = ext.replace(/^\./, '');
  const idx      = side === 'left' ? 0 : 1;
  const destPath = SOUND_DIR + `sound_${side}_${Date.now()}.${ext}`;
  await src.copy(new File(destPath));
  await AsyncStorage.setItem(SOUND_KEYS[idx], destPath);
  return destPath;
}

// 从手机里选已有音频文件
async function pickSoundFile(side) {
  const res = await DocumentPicker.getDocumentAsync({
    type: 'audio/*',
    copyToCacheDirectory: true,
  });
  if (res.canceled || !res.assets || !res.assets[0]) return null;
  return saveSoundFromUri(side, res.assets[0].uri, res.assets[0].name);
}

// ─── DrumPicker (滚轮选择器) ──────────────────────────────────
const DRUM_ITEM_HEIGHT = 44;
const DRUM_WHEEL_HEIGHT = 180;  // 默认 (竖屏) 高度, 横屏会被 modalDynamic 调小

function DrumPicker({ value, options, onChange, label, wheelHeight }) {
  const wH = wheelHeight || DRUM_WHEEL_HEIGHT;
  const PADDING = (wH - DRUM_ITEM_HEIGHT) / 2;
  const scrollRef = useRef(null);
  // 用 ref 标记是否正在程序触发的滚动，避免 onScroll 回调里把 value 反向写回造成抖动
  const isProgrammaticScroll = useRef(false);

  const selectedIndex = Math.max(0, options.indexOf(value));

  // 初次挂载与外部 value 变化时,把滚轮同步到对应位置
  useEffect(() => {
    if (!scrollRef.current) return;
    isProgrammaticScroll.current = true;
    scrollRef.current.scrollTo({ y: selectedIndex * DRUM_ITEM_HEIGHT, animated: false });
    // 下一帧再放开标记
    requestAnimationFrame(() => { isProgrammaticScroll.current = false; });
  }, [value]);

  const handleScroll = (e) => {
    if (isProgrammaticScroll.current) return;
    const y = e.nativeEvent.contentOffset.y;
    const idx = Math.round(y / DRUM_ITEM_HEIGHT);
    const clamped = Math.max(0, Math.min(options.length - 1, idx));
    if (options[clamped] !== value) onChange(options[clamped]);
  };

  const handleMomentumEnd = (e) => {
    const y = e.nativeEvent.contentOffset.y;
    const idx = Math.max(0, Math.min(options.length - 1, Math.round(y / DRUM_ITEM_HEIGHT)));
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ y: idx * DRUM_ITEM_HEIGHT, animated: true });
    }
    // 滚轮停稳后给一下选区反馈
    h.select();
  };

  return (
    <View style={styles.drumContainer}>
      <Text style={styles.drumLabel}>{label}</Text>
      <View style={[styles.drumWheel, { height: wH }]}>
        <ScrollView
          ref={scrollRef}
          showsVerticalScrollIndicator={false}
          snapToInterval={DRUM_ITEM_HEIGHT}
          decelerationRate="fast"
          onScroll={handleScroll}
          onMomentumScrollEnd={handleMomentumEnd}
          scrollEventThrottle={16}
          contentContainerStyle={{ paddingVertical: PADDING }}
        >
          {options.map((opt) => {
            const isSelected = opt === value;
            return (
              <Pressable
                key={opt}
                style={styles.drumItem}
                onPress={() => { h.select(); onChange(opt); }}
              >
                <Text style={[styles.drumItemText, isSelected && styles.drumItemSelected]}>
                  {String(opt).padStart(2, '0')}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
        <LinearGradient
          pointerEvents="none"
          colors={['rgba(0,0,0,0.6)', 'rgba(0,0,0,0.6)', 'rgba(0,0,0,0)']}
          locations={[0, 0.55, 1]}
          style={[styles.drumGradient, { top: 0 }]}
        />
        <LinearGradient
          pointerEvents="none"
          colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.6)', 'rgba(0,0,0,0.6)']}
          locations={[0, 0.45, 1]}
          style={[styles.drumGradient, { bottom: 0 }]}
        />
        <View style={styles.drumSelectionIndicator} pointerEvents="none" />
      </View>
    </View>
  );
}

// ─── TimePickerModal ──────────────────────────────────────────
function TimePickerModal({ onConfirm, onClose, initialMinutes, initialSeconds }) {
  const [m, setM] = useState(initialMinutes);
  const [s, setS] = useState(initialSeconds);
  const minuteOpts = Array.from({ length: 61 }, (_, i) => i);
  const secondOpts = Array.from({ length: 60 }, (_, i) => i);
  // 横屏: drumWheel 缩到 100dp, padding/gap 收紧, 让弹窗能放进 ~390dp 高的横屏
  // 竖屏: 维持原 180dp, 弹窗本来就够高
  const { width: winW, height: winH } = useWindowDimensions();
  const isLandscape = winW > winH;
  const drumH = isLandscape ? 100 : DRUM_WHEEL_HEIGHT;

  return (
    <Pressable style={styles.modalOverlay} onPress={() => { h.light(); onClose(); }}>
      <Pressable onPress={(e) => e.stopPropagation()}>
        <View style={[styles.modalContent, isLandscape && styles.modalContentLandscape]}>
          {/* 玻璃底层: 暗色 + BlurView 模糊弹窗后面的主界面 */}
          <View style={[StyleSheet.absoluteFill, styles.modalBackdrop]} pointerEvents="none" />
          <BlurView intensity={40} tint="dark" style={StyleSheet.absoluteFill} />
          <View style={[StyleSheet.absoluteFill, styles.modalGlassFill]} pointerEvents="none" />
          <View style={[StyleSheet.absoluteFill, styles.modalGlassBorder]} pointerEvents="none" />

          <Text style={styles.modalTitle}>设置时间</Text>
          <View style={styles.timeRow}>
            <DrumPicker value={m} options={minuteOpts} onChange={setM} label="分钟" wheelHeight={drumH} />
            <Text style={[styles.timeSeparator, isLandscape && styles.timeSeparatorLandscape]}>:</Text>
            <DrumPicker value={s} options={secondOpts} onChange={setS} label="秒" wheelHeight={drumH} />
          </View>
          <Text style={[styles.timePreview, isLandscape && styles.timePreviewLandscape]}>{String(m).padStart(2, '0')}:{String(s).padStart(2, '0')}</Text>
          <View style={styles.modalButtons}>
            <Pressable style={[styles.modalBtn, styles.modalBtnCancel]} onPress={() => { h.light(); onClose(); }}>
              <Text style={styles.modalBtnTextCancel}>取消</Text>
            </Pressable>
            <Pressable style={[styles.modalBtn, styles.modalBtnConfirm]} onPress={() => { h.success(); onConfirm(m * 60 + s); }}>
              <Text style={styles.modalBtnTextConfirm}>确认</Text>
            </Pressable>
          </View>
        </View>
      </Pressable>
    </Pressable>
  );
}

// ─── HistoryShareCard (屏幕外渲染, ViewShot 截图分享) ──────────
const HistoryShareCard = React.forwardRef(({ history, teamAName, teamBName }, ref) => {
  const top = history.slice(0, 10);
  const winsA = history.filter(r => r.winner === 'A').length;
  const winsB = history.filter(r => r.winner === 'B').length;
  const ties  = history.filter(r => r.winner === 'tie').length;
  const today = new Date().toISOString().slice(0, 10);

  return (
    <ViewShot
      ref={ref}
      options={{ format: 'png', quality: 1, result: 'tmpfile' }}
      style={{ position: 'absolute', left: -9999, top: 0, width: 360 }}
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

// ─── HistoryModal (战绩列表) ─────────────────────────────────
// ─── HistoryPage (全屏页面, 非 Modal 叠层) ──────────────────────
function HistoryPage({ history, teamAName, teamBName, onClose, onDelete, onClear, onShare }) {
  const winsA = history.filter(r => r.winner === 'A').length;
  const winsB = history.filter(r => r.winner === 'B').length;
  const ties  = history.filter(r => r.winner === 'tie').length;

  return (
    <View style={styles.historyPageRoot}>
      {/* 顶部 header: 标题居中无图标, × 关闭按钮移到下一行避免被状态栏/电池图标遮挡 */}
      <Text style={styles.historyPageTitle}>对 战 记 录</Text>
      <View style={styles.historyPageHeader}>
        <Pressable onPress={() => { h.light(); onClose(); }} hitSlop={12} style={styles.historyPageClose}>
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
                  <Pressable onPress={() => { h.light(); onDelete(r.id); }} hitSlop={8} style={styles.historyDelete}>
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

// ─── ClickRipple ──────────────────────────────────────────────
function ClickRipple({ x, y, colorRgb }) {
  const scale   = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(scale,   { toValue: 1, duration: 400, useNativeDriver: false }),
      Animated.timing(opacity, { toValue: 0, duration: 400, useNativeDriver: false }),
    ]).start();
  }, []);

  return (
    <Animated.View
      style={{
        position: 'absolute',
        left: x - 60, top: y - 60,
        width: 120, height: 120, borderRadius: 60,
        backgroundColor: `rgba(${colorRgb}, 0.5)`,
        transform: [{ scale }],
        opacity,
      }}
    />
  );
}

// ─── ScorePanel ───────────────────────────────────────────────
// onPickImage prop 保留，但入口已移到中间面板，这里不再渲染任何换图触发器
function ScorePanel({ teamName, score, wins, color, colorRgb, side, onAdd, bgImage, bgImageHeight, bgImageTop }) {
  const [flash,   setFlash]   = useState(false);
  const [ripples, setRipples] = useState([]);
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const triggerScore = (clickX, clickY) => {
    setFlash(true);
    h.medium();               // 加分:中等等级反馈
    onAdd();
    const id = Date.now();
    setRipples(prev => [...prev, { id, x: clickX, y: clickY }]);
    setTimeout(() => setRipples(prev => prev.filter(r => r.id !== id)), 400);
    Animated.sequence([
      Animated.timing(scaleAnim, { toValue: 1.18, duration: 80, useNativeDriver: false }),
      Animated.spring(scaleAnim, { toValue: 1, friction: 5, tension: 100, useNativeDriver: false }),
    ]).start();
    setTimeout(() => setFlash(false), 100);
  };

  const handlePressIn = (e) => {
    const { locationX, locationY } = e.nativeEvent;
    triggerScore(locationX, locationY);
  };

  const innerContent = (
    <>
      {bgImage ? <View style={styles.bgOverlay} /> : null}

      <View style={[
        styles.sideBorder,
        side === 'left' ? styles.sideBorderLeft : styles.sideBorderRight,
        { backgroundColor: color, height: bgImageHeight || '100%' },
      ]} />

      <View style={[styles.infoColumn, side === 'left' ? styles.infoColumnRight : styles.infoColumnLeft]}>
        <View style={styles.teamNameSection}>
          <Text style={styles.teamNameVertical}>{teamName}</Text>
        </View>
        <View style={[styles.winsRow, side === 'left' ? styles.winsRowRight : styles.winsRowLeft]}>
          <Text style={styles.winsLabel}>胜</Text>
          <Text style={styles.winsCount}>{wins}</Text>
        </View>
      </View>

      <View style={styles.scoreSection}>
        <Text style={[styles.scoreText, { color: '#fff' }]}>{String(score).padStart(2, '0')}</Text>
      </View>

      {ripples.map(ripple => (
        <ClickRipple key={ripple.id} x={ripple.x} y={ripple.y} colorRgb={colorRgb} />
      ))}
    </>
  );

  return (
    <Pressable onPressIn={handlePressIn} style={styles.scorePanel}>
      <Animated.View
        style={[
          styles.scorePanelInner,
          {
            transform: [{ scale: scaleAnim }],
            backgroundColor: flash ? `rgba(${colorRgb}, 0.2)` : 'transparent',
          },
        ]}
      >
        {bgImage ? (
          <ImageBackground
            source={{ uri: bgImage }}
            style={bgImageHeight
              ? { width: '100%', height: bgImageHeight, marginTop: bgImageTop || 0, alignItems: 'center', justifyContent: 'space-around', borderRadius: 12, paddingVertical: 20, position: 'relative' }
              : styles.bgImageFill}
            imageStyle={{ borderRadius: 12 }}
            resizeMode="cover"
          >
            {innerContent}
          </ImageBackground>
        ) : (
          innerContent
        )}
      </Animated.View>
    </Pressable>
  );
}

// ─── TimerDisplay ─────────────────────────────────────────────
function TimerDisplay({ seconds, running }) {
  const m         = String(Math.floor(seconds / 60)).padStart(2, '0');
  const s         = String(seconds % 60).padStart(2, '0');
  const warn      = seconds <= 30 && running;
  const textColor = warn ? '#ff6b6b' : GLASS.textOnGlass;
  return (
    <Text
      style={[styles.timerText, { color: textColor }]}
      numberOfLines={1}
      adjustsFontSizeToFit
      minimumFontScale={0.7}
    >
      {m}:{s}
    </Text>
  );
}

// ─── BgImageBtn — 中间面板里的换图按钮 (玻璃叠玻璃) ────────
function BgImageBtn({ label, color, hasImage, onPress }) {
  // 维度4: 按钮是玻璃, "已有图"时用对应队色微染, "无图"时纯白半透明
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.bgImageBtn,
        hasImage && {
          backgroundColor: `${color}33`,         // 队色 20% 染色
          borderColor: `${color}66`,             // 队色 40% 边框
        },
      ]}
    >
      <Text style={[styles.bgImageBtnText, hasImage && { color }]}>
        {label}
      </Text>
    </Pressable>
  );
}

// ─── 录音弹窗 (expo-audio useAudioRecorder) ───────────────────
// 状态机: idle(未录) → recording(录制中, 最长 10s 自动停) → recorded(可试听/保存/重录)
const SOUND_MAX_SEC = 10;
function SoundRecordModal({ side, teamName, color, recorder, onSave, onClose }) {
  const [phase,   setPhase]   = useState('idle');
  const [elapsed, setElapsed] = useState(0);
  const [tempUri, setTempUri] = useState(null);
  const [saving,  setSaving]  = useState(false);
  const tickRef    = useRef(null);
  const previewRef = useRef(null);

  const doStop = async () => {
    clearInterval(tickRef.current);
    tickRef.current = null;
    try { await recorder.stop(); } catch {}
    // 退出录音模式, 否则 iOS 试听/后续播放会从听筒走 (声音很小)
    setAudioModeAsync({ allowsRecording: false }).catch(() => {});
    setTempUri(recorder.uri);
    setPhase('recorded');
    h.success();
  };

  // 录制中到达上限自动停止
  useEffect(() => {
    if (phase === 'recording' && elapsed >= SOUND_MAX_SEC) doStop();
  }, [elapsed, phase]);

  // 卸载时收尾: 停录、清计时、释放试听 player、关闭录音模式
  useEffect(() => () => {
    clearInterval(tickRef.current);
    try { recorder.stop(); } catch {}
    try { previewRef.current?.remove(); } catch {}
    setAudioModeAsync({ allowsRecording: false }).catch(() => {});
  }, []);

  const startRec = async () => {
    const perm = await AudioModule.requestRecordingPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('需要麦克风权限', '请在系统设置中允许记分板访问麦克风');
      return;
    }
    try {
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      await recorder.prepareToRecordAsync();
      recorder.record();
      setTempUri(null);
      setElapsed(0);
      setPhase('recording');
      tickRef.current = setInterval(() => setElapsed((e) => e + 1), 1000);
      h.medium();
    } catch (e) {
      Alert.alert('录音失败', '无法开始录音，请重试');
    }
  };

  const preview = () => {
    if (!tempUri) return;
    try { previewRef.current?.remove(); } catch {}
    const p = createAudioPlayer(tempUri);
    previewRef.current = p;
    p.play();
    h.select();
  };

  const save = async () => {
    if (!tempUri || saving) return;
    setSaving(true);
    await onSave(tempUri);
  };

  return (
    <Pressable style={styles.modalOverlay} onPress={onClose}>
      <Pressable style={styles.recordCard} onPress={() => {}}>
        <BlurView intensity={40} tint="dark" style={StyleSheet.absoluteFill} />
        <View style={[StyleSheet.absoluteFill, { backgroundColor: GLASS.glassFillDeep, borderRadius: 22 }]} pointerEvents="none" />
        <View style={[StyleSheet.absoluteFill, { borderRadius: 22, borderWidth: 1, borderColor: GLASS.glassBorder }]} pointerEvents="none" />

        <View style={styles.recordContent}>
          <Text style={[styles.recordTitle, { color }]}>{teamName} · 加分音效</Text>

          <Text style={styles.recordTimer}>
            {phase === 'recording'
              ? `● 录制中 ${elapsed}s / ${SOUND_MAX_SEC}s`
              : phase === 'recorded'
                ? '✓ 录制完成，可试听'
                : '点下方按钮开始录制（最长 10 秒）'}
          </Text>

          {phase !== 'recording' && (
            <Pressable onPress={startRec} style={[styles.recordBtn, styles.recordBtnStart]}>
              <Text style={styles.recordBtnText}>{phase === 'recorded' ? '🎙 重新录制' : '🎙 开始录制'}</Text>
            </Pressable>
          )}
          {phase === 'recording' && (
            <Pressable onPress={doStop} style={[styles.recordBtn, styles.recordBtnStop]}>
              <Text style={styles.recordBtnText}>⏹ 停止</Text>
            </Pressable>
          )}

          {phase === 'recorded' && (
            <View style={styles.recordRow}>
              <Pressable onPress={preview} style={[styles.recordBtn, styles.recordBtnHalf, styles.recordBtnGlass]}>
                <Text style={styles.recordBtnText}>▶ 试听</Text>
              </Pressable>
              <Pressable onPress={save} style={[styles.recordBtn, styles.recordBtnHalf, styles.recordBtnSave]}>
                <Text style={styles.recordBtnText}>{saving ? '保存中…' : '保存'}</Text>
              </Pressable>
            </View>
          )}

          <Pressable onPress={onClose} style={styles.recordCancel} hitSlop={8}>
            <Text style={styles.recordCancelText}>取消</Text>
          </Pressable>
        </View>
      </Pressable>
    </Pressable>
  );
}

// ─── App ──────────────────────────────────────────────────────
export default function App() {
  const [teamNames,  setTeamNames]  = useState(['主队', '客队']);
  const [scores,     setScores]     = useState([0, 0]);
  const [wins,       setWins]       = useState([0, 0]);
  const [seconds,    setSeconds]    = useState(12 * 60);
  const [running,    setRunning]    = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState([]);
  const [bgImages,   setBgImages]   = useState([null, null]);
  const [voiceOn,    setVoiceOn]    = useState(false);
  // 自定义加分音效: 路径 [主队, 客队] + 总开关 + 当前录制的一侧 (null 时不显示录音弹窗)
  const [teamSounds, setTeamSounds] = useState([null, null]);
  const [soundOn,    setSoundOn]    = useState(false);
  const [recordSide, setRecordSide] = useState(null);
  // 每队预加载一个 AudioPlayer, 加分时 seek 到 0 立即重播 (支持连点)
  const playersRef = useRef([null, null]);
  const recorder   = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  // 中间面板 timerBox 实测高度, 供横屏时约束背景图高度使用
  const [centerH,    setCenterH]    = useState(0);

  const { width: winW, height: winH } = useWindowDimensions();
  const isLandscape = winW > winH;
  // 中间面板样式: 横屏内容贴顶 (与 bg 图对齐 + 让出状态栏), 竖屏垂直居中且下移一点, 让 team names 不贴在状态栏
  const centerPanelDynamicStyle = isLandscape
    ? { justifyContent: 'flex-start', paddingTop: 24 }
    : { justifyContent: 'center', paddingTop: 80 };

  const intervalRef = useRef(null);
  const shareCardRef = useRef(null);

  // 启动时恢复持久化的背景图 + 战绩历史
  useEffect(() => {
    (async () => {
      const [lp, rp] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEY_LEFT),
        AsyncStorage.getItem(STORAGE_KEY_RIGHT),
      ]);
      const check = async (p) => {
        if (!p) return null;
        return new File(p).exists ? p : null;
      };
      const [l, r] = await Promise.all([check(lp), check(rp)]);
      setBgImages([l, r]);
    })();
    // 恢复自定义加分音效路径并预加载播放器
    (async () => {
      const [ls, rs] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEY_SOUND_LEFT),
        AsyncStorage.getItem(STORAGE_KEY_SOUND_RIGHT),
      ]);
      const check = (p) => (p && new File(p).exists ? p : null);
      const sounds = [check(ls), check(rs)];
      sounds.forEach((uri, idx) => loadPlayer(idx, uri));
      setTeamSounds(sounds);
    })();
    loadHistory().then(setHistory);
    AsyncStorage.getItem(STORAGE_KEY_VOICE).then((v) => { if (v === '1') setVoiceOn(true); });
    AsyncStorage.getItem(STORAGE_KEY_SOUND_ON).then((v) => { if (v === '1') setSoundOn(true); });
  }, []);

  // 卸载时释放所有播放器
  useEffect(() => () => {
    playersRef.current.forEach((p) => { try { p?.remove(); } catch {} });
  }, []);

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => {
        setSeconds((s) => { if (s <= 0) { setRunning(false); return 0; } return s - 1; });
      }, 1000);
    } else {
      clearInterval(intervalRef.current);
    }
    return () => clearInterval(intervalRef.current);
  }, [running]);

  // 预加载/释放某一侧的播放器 (路径变化时调用)
  const loadPlayer = (idx, uri) => {
    if (playersRef.current[idx]) { try { playersRef.current[idx].remove(); } catch {} }
    playersRef.current[idx] = uri ? createAudioPlayer(uri) : null;
  };

  // 播放该队自定义音效 (seek 0 支持连点重播); onDone 在音效自然播完时回调一次
  const playTeamSound = (idx, onDone) => {
    const p = playersRef.current[idx];
    if (!p) { onDone && onDone(); return; }
    // 清掉上一次残留的一次性监听 (连点时避免叠加)
    if (p._announceSub) { try { p._announceSub.remove(); } catch {} p._announceSub = null; }
    if (onDone) {
      p._announceSub = p.addListener('playbackStatusUpdate', (status) => {
        if (status.didJustFinish) {
          try { p._announceSub.remove(); } catch {}
          p._announceSub = null;
          onDone();
        }
      });
    }
    try { p.seekTo(0); p.play(); } catch { onDone && onDone(); }
  };

  // 加分时音效 + 比分播报: 两者都开则"先音效, 放完再报比分"(串行, 不重叠)
  const announceAdd = (side, a, b) => {
    const hasSound = soundOn && playersRef.current[side];
    const sayScore = () => { if (voiceOn) speakScore(a, b); };
    if (hasSound) playTeamSound(side, voiceOn ? sayScore : undefined);
    else sayScore();
  };

  // 计分 + 播报: 用新分数算出 "X比Y" 再读 (state 异步, 在 updater 里拿 next 值)
  const addScore = (side) =>
    setScores((s) => {
      const n = [...s];
      n[side]++;
      announceAdd(side, n[0], n[1]);
      return n;
    });

  const subScore = (side) =>
    setScores((s) => {
      const n = [...s];
      n[side] = Math.max(0, n[side] - 1);
      if (voiceOn) speakScore(n[0], n[1]);
      return n;
    });

  const toggleVoice = () => {
    h.select();
    setVoiceOn((v) => {
      const next = !v;
      AsyncStorage.setItem(STORAGE_KEY_VOICE, next ? '1' : '0');
      if (next) speakScore(scores[0], scores[1]);  // 打开时读一次当前比分作确认
      else Speech.stop();
      return next;
    });
  };

  const toggleSound = () => {
    h.select();
    setSoundOn((v) => {
      const next = !v;
      AsyncStorage.setItem(STORAGE_KEY_SOUND_ON, next ? '1' : '0');
      return next;
    });
  };

  // 点队伍音效按钮: 已有音效给 试听/重录/重选/移除, 没有则给 录制/选文件
  const handleSoundBtn = (side) => {
    const idx = side === 'left' ? 0 : 1;
    const name = teamNames[idx];
    const pickFile = async () => {
      const uri = await pickSoundFile(side);
      if (uri) {
        setTeamSounds((prev) => { const n = [...prev]; n[idx] = uri; return n; });
        loadPlayer(idx, uri);
        h.success();
      }
    };
    if (teamSounds[idx]) {
      Alert.alert('加分音效', `${name}的加分音效`, [
        { text: '试听',     onPress: () => playTeamSound(idx) },
        { text: '重新录制', onPress: () => setRecordSide(side) },
        { text: '从文件选择', onPress: pickFile },
        { text: '移除', style: 'destructive', onPress: async () => {
            await clearSavedSound(side);
            setTeamSounds((prev) => { const n = [...prev]; n[idx] = null; return n; });
            loadPlayer(idx, null);
            h.light();
          } },
        { text: '取消', style: 'cancel' },
      ]);
    } else {
      Alert.alert('加分音效', `为${name}添加加分音效`, [
        { text: '录制', onPress: () => setRecordSide(side) },
        { text: '从文件选择', onPress: pickFile },
        { text: '取消', style: 'cancel' },
      ]);
    }
  };

  // 录音弹窗保存回调
  const handleSaveRecording = async (tempUri) => {
    const idx  = recordSide === 'left' ? 0 : 1;
    const dest = await saveSoundFromUri(recordSide, tempUri);
    setTeamSounds((prev) => { const n = [...prev]; n[idx] = dest; return n; });
    loadPlayer(idx, dest);
    setRecordSide(null);
  };

  const handleNextRound = async () => {
    // 记录战绩
    const winner = scores[0] > scores[1] ? 'A' : scores[1] > scores[0] ? 'B' : 'tie';
    const record = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      timestamp: new Date().toISOString(),
      teamA: { name: teamNames[0], score: scores[0] },
      teamB: { name: teamNames[1], score: scores[1] },
      winner,
      duration: `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`,
    };
    const next = await appendHistory(record);
    setHistory(next);

    setWins((w) => {
      const nw = [...w];
      if      (scores[0] > scores[1]) nw[0]++;
      else if (scores[1] > scores[0]) nw[1]++;
      return nw;
    });
    setScores([0, 0]);
    setSeconds(12 * 60);
    setRunning(false);
  };

  const handleDeleteRecord = async (id) => {
    h.medium();
    const next = await removeHistoryAt(id);
    setHistory(next);
  };

  const handleClearAll = async () => {
    h.heavy();
    await clearAllHistory();
    setHistory([]);
  };

  const handleShareImage = async () => {
    if (history.length === 0) return;
    h.success();
    try {
      // 截图
      const uri = await shareCardRef.current.capture();
      // 调起系统分享
      await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: '分享对战记录' });
    } catch (err) {
      Alert.alert('分享失败', String(err?.message || err));
    }
  };

  const resetAll = () => {
    setScores([0, 0]);
    setWins([0, 0]);
    setSeconds(12 * 60);
    setRunning(false);
  };

  // 换图入口（从中间面板调用）
  const handlePickImage = async (side) => {
    const idx = side === 'left' ? 0 : 1;
    if (bgImages[idx]) {
      Alert.alert('背景图片', '请选择操作', [
        {
          text: '更换图片',
          onPress: async () => {
            const uri = await pickAndSaveImage(side);
            if (uri) setBgImages((prev) => { const n = [...prev]; n[idx] = uri; return n; });
          },
        },
        {
          text: '移除图片',
          style: 'destructive',
          onPress: async () => {
            await clearSavedImage(side);
            setBgImages((prev) => { const n = [...prev]; n[idx] = null; return n; });
          },
        },
        { text: '取消', style: 'cancel' },
      ]);
    } else {
      const uri = await pickAndSaveImage(side);
      if (uri) setBgImages((prev) => { const n = [...prev]; n[idx] = uri; return n; });
    }
  };

  return (
    <LinearGradient colors={GLASS.bgGradient} style={styles.container}>
      {showHistory ? (
        <HistoryPage
          history={history}
          teamAName={teamNames[0]}
          teamBName={teamNames[1]}
          onClose={() => setShowHistory(false)}
          onDelete={handleDeleteRecord}
          onClear={handleClearAll}
          onShare={handleShareImage}
        />
      ) : (
        <>
        <View style={styles.scoreArea}>

        <ScorePanel
          teamName={teamNames[0]} score={scores[0]} wins={wins[0]}
          color="#3b82f6" colorRgb="59, 130, 246" side="left"
          bgImage={bgImages[0]}
          bgImageHeight={isLandscape ? centerH : undefined}
          bgImageTop={isLandscape ? 30 : 0}
          onAdd={() => addScore(0)}
        />

        {/* ── 中间控制面板 ── */}
        <View style={[styles.centerPanel, centerPanelDynamicStyle]}>
          {/* 顶部: 主队 + VS + 客队 一行 */}
          <View style={styles.teamNameRow}>
            <TextInput
              value={teamNames[0]}
              onChangeText={(val) => setTeamNames((n) => [val, n[1]])}
              style={[styles.teamNameEdit, { color: GLASS.textOnGlass }]}
              maxLength={10}
            />
            <View style={styles.vsBadgeInRow}><Text style={styles.vsText}>VS</Text></View>
            <TextInput
              value={teamNames[1]}
              onChangeText={(val) => setTeamNames((n) => [n[0], val])}
              style={[styles.teamNameEdit, { color: GLASS.textOnGlass }]}
              maxLength={10}
            />
          </View>

          <View
            style={styles.timerBox}
            onLayout={(e) => setCenterH(e.nativeEvent.layout.height)}
          >
            {/* 维度2: 中间面板玻璃长方框 (底层 timerBox 已是暗色 rgba(0,0,0,0.32), BlurView 叠在上面) */}
            <BlurView intensity={25} tint="dark" style={StyleSheet.absoluteFill} />
            <View style={[StyleSheet.absoluteFill, styles.glassFill]} pointerEvents="none" />
            <View style={[StyleSheet.absoluteFill, styles.glassBorder]} pointerEvents="none" />

            <View style={styles.timerBoxContent}>
              <TimerDisplay seconds={seconds} running={running} />

              <Pressable
                onPress={() => { h.medium(); setRunning((r) => !r); }}
                style={[styles.timerBtn, running ? styles.timerBtnPause : styles.timerBtnStart]}
              >
                <Text style={styles.timerBtnText}>{running ? '暂停' : '开始'}</Text>
              </Pressable>

              <Pressable
                onPress={() => {
                  h.light();
                  // 同步清掉 interval,避免 setRunning(false) 异步生效导致 modal 打开瞬间还走 1-2 帧
                  clearInterval(intervalRef.current);
                  intervalRef.current = null;
                  setRunning(false);
                  setShowPicker(true);
                }}
                style={styles.setTimeBtn}
              >
                <Text style={styles.setTimeBtnText}>设置时间</Text>
              </Pressable>

              {/* ── 语音播报开关 ── */}
              <Pressable
                onPress={toggleVoice}
                style={[styles.voiceBtn, voiceOn && styles.voiceBtnOn]}
              >
                <Text style={[styles.voiceBtnText, voiceOn && styles.voiceBtnTextOn]}>
                  {voiceOn ? '🔊 语音播报：开' : '🔇 语音播报：关'}
                </Text>
              </Pressable>

              {/* ── 加分音效开关 ── */}
              <Pressable
                onPress={toggleSound}
                style={[styles.voiceBtn, soundOn && styles.voiceBtnOn]}
              >
                <Text style={[styles.voiceBtnText, soundOn && styles.voiceBtnTextOn]}>
                  {soundOn ? '🔊 加分音效：开' : '🔈 加分音效：关'}
                </Text>
              </Pressable>

              {/* ── 加分音效设置区 (一排, 主队/客队各一段) ── */}
              <View style={styles.bgImageDivider} />
              <Text style={styles.bgImageSectionLabel}>加分音效</Text>
              <View style={styles.bgImageRow}>
                <BgImageBtn
                  label="主队"
                  color="#3b82f6"
                  hasImage={!!teamSounds[0]}
                  onPress={() => { h.light(); handleSoundBtn('left'); }}
                />
                <BgImageBtn
                  label="客队"
                  color="#f97316"
                  hasImage={!!teamSounds[1]}
                  onPress={() => { h.light(); handleSoundBtn('right'); }}
                />
              </View>

              {/* ── 背景图设置区 (一排) ── */}
              <View style={styles.bgImageDivider} />
              <Text style={styles.bgImageSectionLabel}>背景图</Text>
              <View style={styles.bgImageRow}>
                <BgImageBtn
                  label="主队"
                  color="#3b82f6"
                  hasImage={!!bgImages[0]}
                  onPress={() => { h.light(); handlePickImage('left'); }}
                />
                <BgImageBtn
                  label="客队"
                  color="#f97316"
                  hasImage={!!bgImages[1]}
                  onPress={() => { h.light(); handlePickImage('right'); }}
                />
              </View>
              <View style={styles.bgImageDivider} />

              {/* 结算 + 重置 一排 */}
              <View style={styles.actionRow}>
                <Pressable onPress={() => { h.heavy(); handleNextRound(); }} style={[styles.actionBtnSettle, styles.actionBtnHalf]}>
                  <Text style={styles.actionBtnTextSettle}>结 算</Text>
                </Pressable>
                <Pressable onPress={() => { h.heavy(); resetAll(); }} style={[styles.actionBtnReset, styles.actionBtnHalf]}>
                  <Text style={styles.actionBtnTextReset}>重 置</Text>
                </Pressable>
              </View>

              <View style={styles.bgImageDivider} />

              {/* 分享战绩: 不要玻璃块底色, 纯文字链接风格 */}
              <Pressable onPress={() => { h.medium(); setShowHistory(true); }} style={styles.shareHistoryBtn} hitSlop={10}>
                <Text style={styles.shareHistoryBtnText}>📊  分享战绩</Text>
              </Pressable>
            </View>
          </View>
        </View>

        <ScorePanel
          teamName={teamNames[1]} score={scores[1]} wins={wins[1]}
          color="#f97316" colorRgb="249, 115, 22" side="right"
          bgImage={bgImages[1]}
          bgImageHeight={isLandscape ? centerH : undefined}
          bgImageTop={isLandscape ? 30 : 0}
          onAdd={() => addScore(1)}
        />

      </View>

      {/* ── 底部行: 3 槽布局 [flex:1, 130, flex:1] 镜像上方 scoreArea, -1 居中在各自 score panel 中心 ── */}
      <View style={styles.bottomRow} pointerEvents="box-none">
        <View style={styles.bottomSide} pointerEvents="box-none">
          <Pressable
            onPress={() => { h.light(); subScore(0); }}
            style={[styles.miniBtn, { borderColor: '#3b82f633' }]}
          >
            <Text style={styles.miniBtnText}>-1</Text>
          </Pressable>
        </View>
        <View style={styles.bottomCenter} pointerEvents="box-none" />
        <View style={styles.bottomSide} pointerEvents="box-none">
          <Pressable
            onPress={() => { h.light(); subScore(1); }}
            style={[styles.miniBtn, { borderColor: '#f9731633' }]}
          >
            <Text style={styles.miniBtnText}>-1</Text>
          </Pressable>
        </View>
      </View>

      {showPicker && (
        <TimePickerModal
          initialMinutes={Math.floor(seconds / 60)}
          initialSeconds={seconds % 60}
          onConfirm={(s) => { setSeconds(s); setRunning(false); setShowPicker(false); }}
          onClose={() => setShowPicker(false)}
        />
      )}
        </>
      )}

      {/* 录音弹窗: 录制/重录队伍加分音效 */}
      {recordSide && (
        <SoundRecordModal
          side={recordSide}
          teamName={teamNames[recordSide === 'left' ? 0 : 1]}
          color={recordSide === 'left' ? '#3b82f6' : '#f97316'}
          recorder={recorder}
          onSave={handleSaveRecording}
          onClose={() => setRecordSide(null)}
        />
      )}

      {/* 分享卡: 屏幕外渲染, 截图时由 shareCardRef 捕获 (始终渲染, 不受 showHistory 影响) */}
      <HistoryShareCard
        ref={shareCardRef}
        history={history}
        teamAName={teamNames[0]}
        teamBName={teamNames[1]}
      />
    </LinearGradient>
  );
}

// ─── Styles ───────────────────────────────────────────────────
const styles = StyleSheet.create({
  container:       { flex: 1 },
  scoreArea:       { flex: 1, flexDirection: 'row' },
  scorePanel:      { flex: 1 },
  scorePanelInner: {
    flex: 1, alignItems: 'center', justifyContent: 'space-around',
    borderRadius: 16, paddingVertical: 20,
    width: '100%', height: '100%', position: 'relative',
    backgroundColor: 'rgba(0,0,0,0.28)',     // 借色: 暗色遮罩 (和 timerBox 一致)
    borderWidth: 1,
    borderColor: GLASS.glassBorder,           // 1px 15% 白边
    shadowColor: GLASS.shadowColor,
    shadowOffset: GLASS.shadowOffset,
    shadowOpacity: 0.12,                       // 阴影比 timerBox 弱 (大面板太多阴影会显碎)
    shadowRadius: 16,
    elevation: 4,
    overflow: 'hidden',
  },
  bgImageFill: {
    flex: 1, width: '100%', height: '100%',
    alignItems: 'center', justifyContent: 'space-around',
    borderRadius: 12, paddingVertical: 20, position: 'relative',
  },
  bgOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.48)',
    borderRadius: 12,
    zIndex: 0,
  },
  sideBorder:      { position: 'absolute', top: 0, height: '100%', width: 3, borderRadius: 1.5, opacity: 0.85 },
  sideBorderLeft:  { right: 0 },
  sideBorderRight: { left: 0 },
  infoColumn:      { position: 'absolute', top: '15%', alignItems: 'center', zIndex: 2 },
  infoColumnLeft:  { left: 0, paddingLeft: 8 },
  infoColumnRight: { right: 0, paddingRight: 8, alignItems: 'flex-end' },
  teamNameSection: { alignItems: 'center', marginBottom: 8 },
  teamNameVertical: { fontSize: 16, fontWeight: '700', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 2, color: GLASS.textOnGlass },
  winsRow:      { flexDirection: 'row', alignItems: 'center', gap: 4 },
  winsRowRight: { flexDirection: 'row', alignItems: 'center', gap: 4, justifyContent: 'flex-end' },
  winsRowLeft:  { flexDirection: 'row', alignItems: 'center', gap: 4, justifyContent: 'flex-start' },
  scoreSection: { flex: 1, alignItems: 'center', justifyContent: 'center', width: '100%', zIndex: 2 },
  scoreText:    { fontSize: 180, fontWeight: 'bold', letterSpacing: -2, color: '#FFFFFF' },
  winsLabel:    { fontSize: 11, letterSpacing: 2, textTransform: 'uppercase', color: GLASS.textMuted, fontWeight: '500' },
  winsCount:    { fontSize: 32, fontWeight: '700', color: GLASS.textOnGlass },
  buttonRow:    { flexDirection: 'row', gap: 8, marginTop: 12, zIndex: 5 },
  miniBtn:      { paddingHorizontal: 14, paddingVertical: 5, borderRadius: 8, borderWidth: 1, backgroundColor: 'rgba(255,255,255,0.07)' },
  miniBtnText:  { fontSize: 14, fontWeight: 'bold', color: '#fff' },

  // 中间面板
  centerPanel: { width: 130, alignItems: 'center', justifyContent: 'flex-start', gap: 4, paddingTop: 24, zIndex: 2 },
  teamNameRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%' },
  vsBadgeInRow: { width: 28, height: 28, borderRadius: 14,
                  backgroundColor: GLASS.btnGlass, alignItems: 'center', justifyContent: 'center',
                  borderWidth: 1, borderColor: GLASS.btnGlassBorder },
  vsBadge:     { width: 36, height: 36, borderRadius: 18,
                 backgroundColor: GLASS.btnGlass, alignItems: 'center', justifyContent: 'center',
                 borderWidth: 1, borderColor: GLASS.btnGlassBorder },
  vsText:      { fontSize: 11, fontWeight: '700', color: GLASS.textMuted, letterSpacing: 1 },
  timerBox:    {
    width: '100%', borderRadius: 22, padding: 0,
    alignItems: 'stretch', gap: 0, overflow: 'hidden',
    backgroundColor: 'rgba(0,0,0,0.32)',   // 底层暗色遮罩 (压暗+降噪)
    shadowColor: GLASS.shadowColor,
    shadowOffset: GLASS.shadowOffset,
    shadowOpacity: GLASS.shadowOpacity,
    shadowRadius: GLASS.shadowRadius,
    elevation: 8,
  },
  timerBoxContent: { padding: 10, alignItems: 'center', gap: 6 },
  glassFill:   { backgroundColor: GLASS.glassFill, borderRadius: 22 },
  glassBorder: {
    borderRadius: 22,
    borderWidth: 1,
    borderColor: GLASS.glassBorder,
  },
  timerText:   { fontSize: 30, letterSpacing: 2, textAlign: 'center', color: GLASS.textOnGlass, fontWeight: '600' },
  // 维度4: 玻璃叠玻璃按钮
  timerBtn:    { width: '100%', paddingVertical: 8, borderRadius: 10, alignItems: 'center',
                 backgroundColor: GLASS.btnGlass, borderWidth: 1, borderColor: GLASS.btnGlassBorder },
  // 激活态: iOS 系统绿
  timerBtnStart: { backgroundColor: GLASS.iOSGreen, borderColor: 'rgba(52,199,89,0.4)' },
  timerBtnPause: { backgroundColor: GLASS.iOSRed,   borderColor: 'rgba(255,69,58,0.4)' },
  timerBtnText:  { color: '#FFFFFF', fontSize: 12, letterSpacing: 1, fontWeight: '600' },
  setTimeBtn:    { width: '100%', paddingVertical: 6, borderRadius: 10,
                   backgroundColor: GLASS.btnGlass, borderWidth: 1, borderColor: GLASS.btnGlassBorder, alignItems: 'center' },
  setTimeBtnText: { color: GLASS.textOnGlass, fontSize: 11, letterSpacing: 1, fontWeight: '500' },

  // 语音播报开关 (关=玻璃灰, 开=iOS 系统绿)
  voiceBtn:      { width: '100%', paddingVertical: 6, borderRadius: 10, marginTop: 6,
                   backgroundColor: GLASS.btnGlass, borderWidth: 1, borderColor: GLASS.btnGlassBorder, alignItems: 'center' },
  voiceBtnOn:    { backgroundColor: GLASS.iOSGreen, borderColor: 'rgba(52,199,89,0.4)' },
  voiceBtnText:  { color: GLASS.textMuted, fontSize: 11, letterSpacing: 1, fontWeight: '500' },
  voiceBtnTextOn:{ color: GLASS.textOnGlass, fontWeight: '700' },

  // 背景图区域
  bgImageDivider:      { width: '100%', height: 1, backgroundColor: 'rgba(255,255,255,0.12)', marginVertical: 2 },
  bgImageSectionLabel: { fontSize: 9, letterSpacing: 2, color: GLASS.textFaint, textTransform: 'uppercase', alignSelf: 'center' },
  bgImageBtn: {
    flex: 1, paddingVertical: 6, borderRadius: 10,
    backgroundColor: GLASS.btnGlass, borderWidth: 1, borderColor: GLASS.btnGlassBorder, alignItems: 'center',
  },
  bgImageBtnText: { fontSize: 11, letterSpacing: 1, fontWeight: '600', color: GLASS.textOnGlass },
  bgImageRow: { flexDirection: 'row', gap: 6, width: '100%' },

  actionBtnSettle:     { width: '100%', paddingVertical: 6, borderRadius: 10,
                         backgroundColor: GLASS.btnGlass, borderWidth: 1, borderColor: GLASS.btnGlassBorder, alignItems: 'center' },
  actionBtnTextSettle: { color: GLASS.textOnGlass, fontSize: 12, letterSpacing: 1, fontWeight: '500' },
  actionBtnReset:      { width: '100%', paddingVertical: 6, borderRadius: 10,
                         backgroundColor: GLASS.btnGlass, borderWidth: 1, borderColor: GLASS.btnGlassBorder, alignItems: 'center' },
  actionBtnTextReset:  { color: GLASS.textOnGlass, fontSize: 12, letterSpacing: 1, fontWeight: '500' },
  actionRow:           { flexDirection: 'row', gap: 6, width: '100%' },
  actionBtnHalf:       { flex: 1 },
  // 分享战绩: 纯文字 (无玻璃块), 像一个链接
  shareHistoryBtn:     { alignSelf: 'center', paddingVertical: 6, paddingHorizontal: 4 },
  shareHistoryBtnText: { color: GLASS.textOnGlass, fontSize: 12, fontWeight: '500', letterSpacing: 1 },
  teamNameEditRow: { flexDirection: 'row', gap: 8 },
  teamNameEdit:    { flex: 1, fontSize: 11, fontWeight: '600', letterSpacing: 1, textAlign: 'center', backgroundColor: 'transparent', borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.15)', paddingVertical: 2, paddingHorizontal: 0, color: GLASS.textOnGlass },
  bottomRow:       { flexDirection: 'row', alignItems: 'center' },
  bottomSide:      { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 6 },
  bottomCenter:    { width: 130 },

  // 时间选择弹窗
  modalOverlay:  { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', alignItems: 'center', zIndex: 100 },
  modalContent:  { borderRadius: 22, padding: 28, alignItems: 'center', gap: 20, minWidth: 260,
                   overflow: 'hidden', backgroundColor: 'rgba(0,0,0,0.42)',
                   shadowColor: '#000', shadowOffset: { width: 0, height: 16 }, shadowOpacity: 0.4, shadowRadius: 32, elevation: 12 },
  modalContentLandscape: { padding: 14, gap: 8, borderRadius: 16, minWidth: 220 },
  // 录音弹窗
  recordCard:    { borderRadius: 22, overflow: 'hidden', minWidth: 280, maxWidth: 340,
                   shadowColor: '#000', shadowOffset: { width: 0, height: 16 }, shadowOpacity: 0.4, shadowRadius: 32, elevation: 12 },
  recordContent: { padding: 24, alignItems: 'center', gap: 14 },
  recordTitle:   { fontSize: 16, fontWeight: '700', letterSpacing: 1 },
  recordTimer:   { fontSize: 13, color: GLASS.textMuted, textAlign: 'center' },
  recordRow:     { flexDirection: 'row', gap: 10, width: '100%' },
  recordBtn:     { width: '100%', paddingVertical: 12, borderRadius: 12, alignItems: 'center', borderWidth: 1 },
  recordBtnHalf: { flex: 1, width: undefined },
  recordBtnStart:{ backgroundColor: GLASS.iOSGreen, borderColor: 'rgba(52,199,89,0.4)' },
  recordBtnStop: { backgroundColor: GLASS.iOSRed, borderColor: 'rgba(255,69,58,0.4)' },
  recordBtnSave: { backgroundColor: GLASS.iOSGreen, borderColor: 'rgba(52,199,89,0.4)' },
  recordBtnGlass:{ backgroundColor: GLASS.btnGlass, borderColor: GLASS.btnGlassBorder },
  recordBtnText: { color: GLASS.textOnGlass, fontSize: 14, fontWeight: '700', letterSpacing: 1 },
  recordCancel:  { paddingVertical: 6, paddingHorizontal: 16, marginTop: 2 },
  recordCancelText: { color: GLASS.textMuted, fontSize: 13 },
  // 弹窗玻璃分层
  modalBackdrop:     { backgroundColor: 'transparent' },
  modalGlassFill:    { backgroundColor: GLASS.glassFillDeep, borderRadius: 22 },
  modalGlassBorder:  { borderRadius: 22, borderWidth: 1, borderColor: GLASS.glassBorder },
  modalTitle:    { fontSize: 14, letterSpacing: 4, color: GLASS.textOnGlass, textTransform: 'uppercase', fontWeight: '600' },
  timeRow:       { flexDirection: 'row', alignItems: 'center', gap: 12 },
  timeSeparator: { fontSize: 44, color: GLASS.textMuted, marginTop: 16, fontWeight: '300' },
  timeSeparatorLandscape: { fontSize: 28, marginTop: 0 },
  timePreview:   { fontSize: 32, color: GLASS.textOnGlass, letterSpacing: 4, fontWeight: '600' },
  timePreviewLandscape:   { fontSize: 22 },
  modalButtons:  { flexDirection: 'row', gap: 10, width: '100%' },
  modalBtn:      { flex: 1, paddingVertical: 10, borderRadius: 12, alignItems: 'center',
                   backgroundColor: GLASS.btnGlass, borderWidth: 1, borderColor: GLASS.btnGlassBorder },
  modalBtnCancel:  {},
  modalBtnConfirm: { backgroundColor: GLASS.iOSGreen, borderColor: 'rgba(52,199,89,0.4)' },
  modalBtnTextCancel:  { color: GLASS.textOnGlass, fontSize: 13, letterSpacing: 1, fontWeight: '500' },
  modalBtnTextConfirm: { color: '#FFFFFF', fontSize: 13, letterSpacing: 1, fontWeight: '600' },

  // 战绩历史 (玻璃化)
  historyCard:       { borderRadius: 20, padding: 18, borderWidth: 1, borderColor: GLASS.glassBorderSoft },
  historyHeader:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  historyClose:      { color: GLASS.textMuted, fontSize: 28, fontWeight: 'bold', paddingHorizontal: 8, paddingVertical: -4 },
  historyStats:      { paddingVertical: 6 },
  historyStatsText:  { color: GLASS.textMuted, fontSize: 12, textAlign: 'center', letterSpacing: 1 },
  historyDivider:    { height: 1, backgroundColor: 'rgba(255,255,255,0.10)', marginVertical: 4 },
  historyList:       { maxHeight: 380 },
  historyEmpty:      { paddingVertical: 40, alignItems: 'center' },
  historyEmptyText:  { color: GLASS.textMuted, fontSize: 16, marginBottom: 6, fontWeight: '500' },
  historyEmptyHint:  { color: GLASS.textFaint, fontSize: 12 },
  historyItem:       { paddingVertical: 12, paddingHorizontal: 14, marginBottom: 8, borderRadius: 12,
                       backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.10)' },
  historyItemTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  historyTeam:       { flex: 1, fontSize: 13, fontWeight: '600' },
  historyScoreBox:   { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 6 },
  historyScore:      { fontSize: 20, fontWeight: '700', minWidth: 24, textAlign: 'center' },
  historyScoreSep:   { color: GLASS.textFaint, fontSize: 16, marginHorizontal: 2 },
  historyDelete:     { width: 26, height: 26, borderRadius: 13, backgroundColor: 'rgba(255,255,255,0.08)', alignItems: 'center', justifyContent: 'center', marginLeft: 6, borderWidth: 1, borderColor: 'rgba(255,255,255,0.10)' },
  historyDeleteText: { color: GLASS.textMuted, fontSize: 18, fontWeight: 'bold', lineHeight: 18 },
  historyMeta:       { color: GLASS.textMuted, fontSize: 10, marginTop: 4, textAlign: 'center', letterSpacing: 0.5 },
  historyButtons:    { paddingTop: 6, gap: 6 },
  historyBtnPrimary: { paddingVertical: 10, borderRadius: 12, backgroundColor: GLASS.btnGlass, borderWidth: 1, borderColor: GLASS.btnGlassBorder, alignItems: 'center' },
  historyBtnPrimaryText: { color: GLASS.textOnGlass, fontSize: 13, fontWeight: '600', letterSpacing: 2 },
  historyBtnDanger:  { paddingVertical: 8, borderRadius: 12, backgroundColor: GLASS.btnGlass, borderWidth: 1, borderColor: GLASS.btnGlassBorder, alignItems: 'center' },
  historyBtnDangerText: { color: GLASS.textOnGlass, fontSize: 12, letterSpacing: 1, fontWeight: '500' },

  // 战绩历史 全屏页面 (HistoryPage) - 玻璃化
  historyPageRoot:      { flex: 1, paddingHorizontal: 16, paddingTop: 24, paddingBottom: 16 },
  historyPageHeader:    { flexDirection: 'row', alignItems: 'center', marginTop: 8, marginBottom: 12 },
  historyPageTitle:     { color: GLASS.textOnGlass, fontSize: 22, fontWeight: '700', letterSpacing: 6, textAlign: 'center' },
  historyPageClose:     { flexDirection: 'row', alignItems: 'center', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 18, backgroundColor: GLASS.btnGlass, borderWidth: 1, borderColor: GLASS.btnGlassBorder },
  historyPageCloseText: { color: GLASS.textOnGlass, fontSize: 13, fontWeight: '600' },
  historyPageStats:     { paddingVertical: 8, paddingHorizontal: 4 },
  historyPageStatsText: { color: GLASS.textOnGlass, fontSize: 14, textAlign: 'center', letterSpacing: 1, fontWeight: '500' },
  historyPageList:      { flex: 1 },
  historyPageFooter:    { paddingTop: 12, gap: 8 },

  // 分享卡 (截图用)
  // 分享卡保持 borderRadius: 0 (无白边原则, 详见历史修复)
  // 背景用深紫黑, 跟主渐变协调
  shareCard:               { width: 360, backgroundColor: '#1a0d2e', padding: 20, borderRadius: 0, borderWidth: 0, borderColor: 'transparent' },
  shareCardTitle:          { color: '#FFFFFF', fontSize: 20, fontWeight: '700', textAlign: 'center', letterSpacing: 8 },
  shareCardDate:           { color: 'rgba(255,255,255,0.5)', fontSize: 11, textAlign: 'center', marginTop: 4, letterSpacing: 1 },
  shareCardDivider:        { height: 1, backgroundColor: 'rgba(255,255,255,0.15)', marginVertical: 10 },
  shareCardRow:            { marginBottom: 10 },
  shareCardTeamCol:        { flex: 1 },
  shareCardTeam:           { fontSize: 12, color: 'rgba(255,255,255,0.85)', fontWeight: '600' },
  shareCardScoreCol:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginVertical: 2 },
  shareCardScoreA:         { color: '#FFFFFF', fontSize: 22, fontWeight: '700' },
  shareCardScoreB:         { color: '#FFFFFF', fontSize: 22, fontWeight: '700' },
  shareCardSep:            { color: 'rgba(255,255,255,0.4)', fontSize: 18, marginHorizontal: 6 },
  shareCardMeta:           { color: 'rgba(255,255,255,0.5)', fontSize: 10, textAlign: 'center', marginTop: 2 },
  shareCardMore:           { color: 'rgba(255,255,255,0.4)', fontSize: 10, textAlign: 'center', marginTop: 4, fontStyle: 'italic' },
  shareCardFooter:         { color: 'rgba(255,255,255,0.7)', fontSize: 12, textAlign: 'center', marginTop: 6, letterSpacing: 1 },
  shareCardWatermark:      { color: 'rgba(255,255,255,0.4)', fontSize: 10, textAlign: 'center', marginTop: 6, letterSpacing: 4 },

  // 滚轮
  drumContainer: { alignItems: 'center', gap: 4 },
  drumLabel:     { fontSize: 11, letterSpacing: 2, color: GLASS.textFaint, textTransform: 'uppercase' },
  drumWheel:     { width: 72, height: 180, borderRadius: 12, backgroundColor: 'rgba(0,0,0,0.35)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.10)', overflow: 'hidden' },
  drumGradient:         { position: 'absolute', left: 0, right: 0, height: 68, zIndex: 2 },
  drumSelectionIndicator: { position: 'absolute', top: '50%', left: 0, right: 0, height: 44, transform: [{ translateY: -22 }], backgroundColor: 'rgba(255,255,255,0.10)', borderTopWidth: 1, borderBottomWidth: 1, borderColor: 'rgba(255,255,255,0.20)', zIndex: 3 },
  drumItem:         { height: 44, alignItems: 'center', justifyContent: 'center' },
  drumItemText:     { fontSize: 24, fontWeight: '500', color: 'rgba(255,255,255,0.4)' },
  drumItemSelected: { color: GLASS.textOnGlass, fontWeight: '700' },
});
