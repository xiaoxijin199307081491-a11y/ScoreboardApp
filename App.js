import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Pressable, Animated, TextInput, Easing } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

function playSound(type) {
  // Sound disabled - expo-av incompatible with this build
}

function DrumPicker({ value, options, onChange, width, label }) {
  const ITEM_H = 44;
  const VISIBLE = 5;
  const listRef = useRef(null);

  const handleScroll = (event) => {
    const idx = Math.round(event.nativeEvent.contentOffset.y / ITEM_H);
    const clamped = Math.max(0, Math.min(idx, options.length - 1));
    if (options[clamped] !== value) {
      playSound('btn');
      onChange(options[clamped]);
    }
  };

  useEffect(() => {
    const idx = options.indexOf(value);
    if (idx >= 0 && listRef.current) {
      listRef.current.scrollTo({ y: idx * ITEM_H, animated: false });
    }
  }, [value]);

  return (
    <View style={styles.drumContainer}>
      <Text style={styles.drumLabel}>{label}</Text>
      <View style={[styles.drumWheel, { width, height: ITEM_H * VISIBLE }]}>
        <View style={styles.drumGradientTop} />
        <View style={styles.drumGradientBottom} />
        <View style={styles.drumSelectionIndicator} />
        <Animated.ScrollView
          ref={listRef}
          showsVerticalScrollIndicator={false}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          contentContainerStyle={{ paddingVertical: ITEM_H * 2 }}
        >
          {options.map((opt) => (
            <Pressable
              key={opt}
              onPress={() => {
                playSound('btn');
                onChange(opt);
                listRef.current?.scrollTo({ y: options.indexOf(opt) * ITEM_H, animated: true });
              }}
            >
              <View style={styles.drumItem}>
                <Text style={[styles.drumItemText, opt === value && styles.drumItemSelected]}>
                  {String(opt).padStart(2, '0')}
                </Text>
              </View>
            </Pressable>
          ))}
        </Animated.ScrollView>
      </View>
    </View>
  );
}

function TimePickerModal({ onConfirm, onClose, initialMinutes, initialSeconds }) {
  const [m, setM] = useState(initialMinutes);
  const [s, setS] = useState(initialSeconds);
  const minuteOpts = Array.from({ length: 61 }, (_, i) => i);
  const secondOpts = Array.from({ length: 60 }, (_, i) => i);

  return (
    <Pressable style={styles.modalOverlay} onPress={onClose}>
      <Pressable onPress={(e) => e.stopPropagation()}>
        <LinearGradient colors={['#0f172a', '#1e293b']} style={styles.modalContent}>
          <Text style={styles.modalTitle}>设置时间</Text>
          <View style={styles.timeRow}>
            <DrumPicker value={m} options={minuteOpts} onChange={setM} width={72} label="分钟" />
            <Text style={styles.timeSeparator}>:</Text>
            <DrumPicker value={s} options={secondOpts} onChange={setS} width={72} label="秒" />
          </View>
          <Text style={styles.timePreview}>{String(m).padStart(2, '0')}:{String(s).padStart(2, '0')}</Text>
          <View style={styles.modalButtons}>
            <Pressable style={styles.modalBtn} onPress={onClose}>
              <Text style={styles.modalBtnTextCancel}>取消</Text>
            </Pressable>
            <Pressable style={[styles.modalBtn, styles.modalBtnConfirm]} onPress={() => onConfirm(m * 60 + s)}>
              <Text style={styles.modalBtnTextConfirm}>确认</Text>
            </Pressable>
          </View>
        </LinearGradient>
      </Pressable>
    </Pressable>
  );
}

function ClickRipple({ x, y, colorRgb }) {
  const scale = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(scale, { toValue: 1, duration: 400, useNativeDriver: false }),
      Animated.timing(opacity, { toValue: 0, duration: 400, useNativeDriver: false }),
    ]).start();
  }, []);

  return (
    <Animated.View
      style={{
        position: 'absolute',
        left: x - 60,
        top: y - 60,
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: `rgba(${colorRgb}, 0.5)`,
        transform: [{ scale }],
        opacity,
      }}
    />
  );
}

function ScorePanel({ teamName, onNameChange, score, wins, color, colorRgb, side, onAdd, onSub }) {
  const [flash, setFlash] = useState(false);
  const [ripples, setRipples] = useState([]);
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const triggerScore = (clickX, clickY) => {
    playSound('score');
    setFlash(true);
    onAdd();

    const id = Date.now();
    setRipples(prev => [...prev, { id, x: clickX, y: clickY }]);
    setTimeout(() => {
      setRipples(prev => prev.filter(r => r.id !== id));
    }, 400);

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

  return (
    <Pressable onPressIn={handlePressIn} style={styles.scorePanel}>
      <Animated.View
        style={[
          styles.scorePanelInner,
          { transform: [{ scale: scaleAnim }], backgroundColor: flash ? `rgba(${colorRgb}, 0.2)` : 'transparent' },
        ]}
      >
        <View style={[styles.sideBorder, side === 'left' ? styles.sideBorderLeft : styles.sideBorderRight, { backgroundColor: color }]} />
        <View style={[styles.infoColumn, side === 'left' ? styles.infoColumnRight : styles.infoColumnLeft]}>
          <View style={styles.teamNameSection}>
            <Text style={[styles.teamNameVertical, { color }]}>{teamName}</Text>
          </View>
          <View style={[styles.winsRow, side === 'left' ? styles.winsRowRight : styles.winsRowLeft]}>
            <Text style={[styles.winsLabel, { color }]}>胜</Text>
            <Text style={[styles.winsCount, { color }]}>{wins}</Text>
          </View>
        </View>
        <View style={styles.scoreSection}>
          <Text style={[styles.scoreText, { color: '#fff' }]}>{String(score).padStart(2, '0')}</Text>
        </View>
        <View style={styles.buttonRow}>
          <Pressable onPress={(e) => { e.stopPropagation(); playSound('sub'); onSub(); }} style={[styles.miniBtn, { borderColor: `${color}33`, color: `${color}aa` }]}>
            <Text style={styles.miniBtnText}>-1</Text>
          </Pressable>
        </View>

        {ripples.map(ripple => (
          <ClickRipple key={ripple.id} x={ripple.x} y={ripple.y} colorRgb={colorRgb} />
        ))}
      </Animated.View>
    </Pressable>
  );
}

function TimerDisplay({ seconds, running }) {
  const m = String(Math.floor(seconds / 60)).padStart(2, '0');
  const s = String(seconds % 60).padStart(2, '0');
  const warn = seconds <= 30 && running;
  const textColor = warn ? '#f87171' : '#e2e8f0';
  return <Text style={[styles.timerText, { color: textColor }]}>{m}:{s}</Text>;
}

export default function App() {
  const [teamNames, setTeamNames] = useState(['主队', '客队']);
  const [scores, setScores] = useState([0, 0]);
  const [wins, setWins] = useState([0, 0]);
  const [seconds, setSeconds] = useState(12 * 60);
  const [running, setRunning] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const intervalRef = useRef(null);

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

  const subScore = (side) => setScores((s) => { const n = [...s]; n[side] = Math.max(0, n[side] - 1); return n; });

  const handleNextRound = () => {
    playSound('win');
    setWins((w) => { const newWins = [...w]; if (scores[0] > scores[1]) newWins[0]++; else if (scores[1] > scores[0]) newWins[1]++; return newWins; });
    setScores([0, 0]);
    setSeconds(12 * 60);
    setRunning(false);
  };

  const resetAll = () => {
    playSound('reset');
    setScores([0, 0]);
    setWins([0, 0]);
    setSeconds(12 * 60);
    setRunning(false);
  };

  return (
    <LinearGradient colors={['#050a12', '#0a1628']} style={styles.container}>
      <View style={styles.scoreArea}>
        <ScorePanel teamName={teamNames[0]} onNameChange={(val) => setTeamNames((n) => [val, n[1]])} score={scores[0]} wins={wins[0]} color="#3b82f6" colorRgb="59, 130, 246" side="left" onAdd={() => setScores((s) => { const n = [...s]; n[0]++; return n; })} onSub={() => subScore(0)} />
        <View style={styles.centerPanel}>
          <View style={styles.vsBadge}><Text style={styles.vsText}>VS</Text></View>
          <LinearGradient colors={['#0a1628', '#0f1f35']} style={styles.timerBox}>
            <TimerDisplay seconds={seconds} running={running} />
            <Pressable onPress={() => { playSound('btn'); setRunning((r) => !r); }} style={[styles.timerBtn, running ? styles.timerBtnPause : styles.timerBtnStart]}>
              <Text style={styles.timerBtnText}>{running ? '暂停' : '开始'}</Text>
            </Pressable>
            <Pressable onPress={() => { playSound('btn'); setRunning(false); setShowPicker(true); }} style={styles.setTimeBtn}>
              <Text style={styles.setTimeBtnText}>设置</Text>
            </Pressable>
            <Pressable onPress={handleNextRound} style={styles.actionBtnSettle}><Text style={styles.actionBtnTextSettle}>结算分数</Text></Pressable>
            <Pressable onPress={resetAll} style={styles.actionBtnReset}><Text style={styles.actionBtnTextReset}>全部重置</Text></Pressable>
            <View style={styles.teamNameEditRow}>
              <TextInput
                value={teamNames[0]}
                onChangeText={(val) => setTeamNames((n) => [val, n[1]])}
                style={styles.teamNameEdit}
                maxLength={10}
              />
              <TextInput
                value={teamNames[1]}
                onChangeText={(val) => setTeamNames((n) => [n[0], val])}
                style={styles.teamNameEdit}
                maxLength={10}
              />
            </View>
          </LinearGradient>
        </View>
        <ScorePanel teamName={teamNames[1]} onNameChange={(val) => setTeamNames((n) => [n[0], val])} score={scores[1]} wins={wins[1]} color="#f97316" colorRgb="249, 115, 22" side="right" onAdd={() => setScores((s) => { const n = [...s]; n[1]++; return n; })} onSub={() => subScore(1)} />
      </View>
      {showPicker && <TimePickerModal initialMinutes={Math.floor(seconds / 60)} initialSeconds={seconds % 60} onConfirm={(s) => { setSeconds(s); setRunning(false); setShowPicker(false); }} onClose={() => setShowPicker(false)} />}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },  scoreArea: { flex: 1, flexDirection: 'row' },
  scorePanel: { flex: 1 },
  scorePanelInner: { flex: 1, alignItems: 'center', justifyContent: 'space-around', borderRadius: 12, paddingVertical: 20, width: '100%', height: '100%', position: 'relative' },
  sideBorder: { position: 'absolute', top: 0, height: '100%', width: 3, borderRadius: 2, opacity: 0.5 },
  sideBorderLeft: { right: 0 },
  sideBorderRight: { left: 0 },
  winsContainer: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  scoreLayout: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', width: '100%' },
  infoColumn: { position: 'absolute', top: '15%', alignItems: 'center' },
  infoColumnLeft: { left: 0, paddingLeft: 8 },
  infoColumnRight: { right: 0, paddingRight: 8, alignItems: 'flex-end' },
  teamNameSection: { alignItems: 'center', marginBottom: 8 },
  teamNameVertical: { fontSize: 16, fontWeight: 'bold', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 4 },
  winsRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  winsRowRight: { flexDirection: 'row', alignItems: 'center', gap: 4, justifyContent: 'flex-end' },
  winsRowLeft: { flexDirection: 'row', alignItems: 'center', gap: 4, justifyContent: 'flex-start' },
  scoreSection: { flex: 1, alignItems: 'center', justifyContent: 'center', width: '100%' },
  scoreText: { fontSize: 180, fontWeight: 'bold', letterSpacing: -2 },
  tapHint: { fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', marginTop: 10 },
  winsLabel: { fontSize: 11, letterSpacing: 2, textTransform: 'uppercase', opacity: 0.5, color: '#fff' },
  winsCount: { fontSize: 32, fontWeight: 'bold' },
  buttonRow: { flexDirection: 'row', gap: 8, marginTop: 12, zIndex: 5 },
  miniBtn: { paddingHorizontal: 14, paddingVertical: 5, borderRadius: 8, borderWidth: 1, backgroundColor: 'rgba(255,255,255,0.07)' },
  miniBtnText: { fontSize: 14, fontWeight: 'bold' },
  centerPanel: { width: 130, alignItems: 'center', justifyContent: 'center', gap: 8, zIndex: 2 },
  vsBadge: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#1e293b', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#1e3a5f' },
  vsText: { fontSize: 16, fontWeight: 'bold', color: '#334155' },
  timerBox: { width: '100%', borderRadius: 12, padding: 8, alignItems: 'center', gap: 8, borderWidth: 1, borderColor: '#1e3a5f' },
  timerText: { fontSize: 36, letterSpacing: 4 },
  timerBtn: { width: '100%', paddingVertical: 7, borderRadius: 8, alignItems: 'center' },
  timerBtnStart: { backgroundColor: '#166534' },
  timerBtnPause: { backgroundColor: '#991b1b' },
  timerBtnText: { color: '#fff', fontSize: 12, letterSpacing: 1 },
  setTimeBtn: { width: '100%', paddingVertical: 5, borderRadius: 8, backgroundColor: 'rgba(59,130,246,0.1)', borderWidth: 1, borderColor: 'rgba(59,130,246,0.25)', alignItems: 'center' },
  setTimeBtnText: { color: '#3b82f6', fontSize: 11, letterSpacing: 1 },
  actionBtnSettle: { width: '100%', paddingVertical: 6, borderRadius: 8, backgroundColor: 'rgba(251,191,36,0.1)', borderWidth: 1, borderColor: 'rgba(251,191,36,0.25)', alignItems: 'center' },
  actionBtnTextSettle: { color: '#fbbf24', fontSize: 12, letterSpacing: 1 },
  actionBtnReset: { width: '100%', paddingVertical: 6, borderRadius: 8, backgroundColor: 'rgba(239,68,68,0.1)', borderWidth: 1, borderColor: 'rgba(239,68,68,0.25)', alignItems: 'center' },
  actionBtnTextReset: { color: '#f87171', fontSize: 12, letterSpacing: 1 },
  teamNameEditRow: { flexDirection: 'row', gap: 8 },
  teamNameEdit: { flex: 1, fontSize: 12, fontWeight: 'bold', letterSpacing: 2, textTransform: 'uppercase', textAlign: 'center', backgroundColor: 'transparent', borderBottomWidth: 1, borderBottomColor: '#334155', padding: 4 },
  modalOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'center', alignItems: 'center', zIndex: 100 },
  modalContent: { borderRadius: 20, padding: 28, alignItems: 'center', gap: 20, borderWidth: 1, borderColor: '#1e3a5f', minWidth: 260 },
  modalTitle: { fontSize: 14, letterSpacing: 4, color: '#3b82f6', textTransform: 'uppercase' },
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  timeSeparator: { fontSize: 44, color: '#334155', marginTop: 16 },
  timePreview: { fontSize: 32, color: '#94a3b8', letterSpacing: 4 },
  modalButtons: { flexDirection: 'row', gap: 10, width: '100%' },
  modalBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: '#334155' },
  modalBtnConfirm: { backgroundColor: '#1d4ed8', borderColor: '#2563eb' },
  modalBtnTextCancel: { color: '#64748b', fontSize: 13, letterSpacing: 1 },
  modalBtnTextConfirm: { color: '#fff', fontSize: 13, letterSpacing: 1 },
  drumContainer: { alignItems: 'center', gap: 4 },
  drumLabel: { fontSize: 11, letterSpacing: 2, color: '#475569', textTransform: 'uppercase' },
  drumWheel: { borderRadius: 12, backgroundColor: '#0d1b2a', borderWidth: 1, borderColor: '#1e3a5f', overflow: 'hidden' },
  drumGradientTop: { position: 'absolute', top: 0, left: 0, right: 0, height: 88, backgroundColor: '#0d1b2aee', zIndex: 2 },
  drumGradientBottom: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 88, backgroundColor: '#0d1b2aee', zIndex: 2 },
  drumSelectionIndicator: { position: 'absolute', top: '50%', left: 0, right: 0, height: 44, transform: [{ translateY: -22 }], backgroundColor: 'rgba(59,130,246,0.15)', borderTopWidth: 1, borderBottomWidth: 1, borderColor: 'rgba(59,130,246,0.4)', zIndex: 1 },
  drumItem: { height: 44, alignItems: 'center', justifyContent: 'center' },
  drumItemText: { fontSize: 24, fontWeight: 'bold', color: '#334155' },
  drumItemSelected: { color: '#e2e8f0' },
});