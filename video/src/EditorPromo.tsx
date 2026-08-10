import React from 'react';
import { AbsoluteFill, Sequence, staticFile, useCurrentFrame, interpolate } from 'remotion';
import { Gif } from '@remotion/gif';

const FONT = `'Microsoft YaHei', 'PingFang SC', 'Noto Sans SC', sans-serif`;
const C = {
  pink: '#ff9ecb',
  pinkSoft: '#ffc4de',
  white: '#ffffff',
  muted: '#c6c0d6',
  card: 'rgba(255,255,255,0.06)',
  cardBorder: 'rgba(255,255,255,0.16)',
};

// 每个场景的本地帧（Sequence 内）做淡入淡出
const useSceneFade = (duration: number, edge = 16) => {
  const frame = useCurrentFrame();
  return Math.min(1, frame / edge, (duration - frame) / edge);
};

const clamp = { extrapolateLeft: 'clamp' as const, extrapolateRight: 'clamp' as const };

// ---------- 背景：深蓝紫渐变 + 柔和粉色光晕 ----------
const Background: React.FC = () => {
  const frame = useCurrentFrame();
  const drift = Math.sin(frame / 130) * 50;
  const drift2 = Math.cos(frame / 170) * 60;
  return (
    <AbsoluteFill style={{ overflow: 'hidden', background: 'radial-gradient(1500px 950px at 50% 24%, #372a63 0%, #1d1538 48%, #0d0a1c 100%)' }}>
      <div
        style={{
          position: 'absolute', width: 980, height: 980, borderRadius: '50%', top: '8%', left: '50%',
          transform: `translateX(calc(-50% + ${drift}px))`,
          background: 'radial-gradient(circle, rgba(255,158,203,0.22), transparent 62%)',
          filter: 'blur(24px)',
        }}
      />
      <div
        style={{
          position: 'absolute', width: 720, height: 720, borderRadius: '50%', bottom: '-10%', right: '-4%',
          transform: `translateY(${drift2}px)`,
          background: 'radial-gradient(circle, rgba(120,150,255,0.16), transparent 60%)',
          filter: 'blur(26px)',
        }}
      />
    </AbsoluteFill>
  );
};

// ---------- 角色：播放 GIF 并轻微上下浮动 ----------
const Character: React.FC<{ src: string; width?: number; bob?: number }> = ({ src, width = 660, bob = 10 }) => {
  const frame = useCurrentFrame();
  const y = Math.sin(frame / 22) * bob;
  return (
    <Gif src={staticFile(src)} width={width} fit="contain" style={{ transform: `translateY(${y}px)` }} />
  );
};

// ---------- 场景 1：开场标题 ----------
const Scene1Title: React.FC = () => {
  const frame = useCurrentFrame();
  const fade = useSceneFade(270);
  const titleIn = interpolate(frame, [18, 46], [0, 1], clamp);
  const subIn = interpolate(frame, [54, 82], [0, 1], clamp);
  const scale = interpolate(frame, [18, 50], [0.9, 1], clamp);
  return (
    <AbsoluteFill style={{ opacity: fade, alignItems: 'center', justifyContent: 'center', fontFamily: FONT, flexDirection: 'column' }}>
      <Character src="anims/01-待机.gif" width={500} bob={8} />
      <div style={{ transform: `scale(${scale})`, opacity: titleIn, marginTop: 6, fontSize: 96, fontWeight: 800, letterSpacing: 6, color: C.white, textShadow: '0 10px 46px rgba(0,0,0,0.5)' }}>
        桌宠换图编辑器
      </div>
      <div style={{ opacity: subIn, marginTop: 22, fontSize: 38, color: C.pinkSoft, letterSpacing: 5 }}>
        给 Codex 桌宠一键换图 · 无需命令行
      </div>
      <div style={{ opacity: subIn, marginTop: 14, fontSize: 24, color: C.muted, letterSpacing: 2 }}>
        9 个状态可视化选图 · 自动拼合 · 写入桌宠目录
      </div>
    </AbsoluteFill>
  );
};

// ---------- 场景 2：界面 + 功能点 ----------
const features = [
  '9 个状态 · 分别选图（GIF / PNG / WebP / JPG）',
  '一键拼合 · 生成 spritesheet.webp + pet.json',
  '自动写入 ~/.codex/pets/<桌宠id>',
  '可视化界面 · 全程不碰命令行',
];

const Scene2Features: React.FC = () => {
  const frame = useCurrentFrame();
  const fade = useSceneFade(420);
  const headIn = interpolate(frame, [0, 20], [0, 1], clamp);
  const zoom = interpolate(frame, [0, 420], [1, 1.04], clamp);
  return (
    <AbsoluteFill style={{ opacity: fade, alignItems: 'center', justifyContent: 'center', fontFamily: FONT, flexDirection: 'column' }}>
      <div style={{ opacity: headIn, fontSize: 56, fontWeight: 800, color: C.white, letterSpacing: 4, marginBottom: 44 }}>
        选图 → 拼合 → 写入，全自动
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 72 }}>
        <div style={{ width: 780, borderRadius: 24, overflow: 'hidden', border: `1px solid ${C.cardBorder}`, background: '#0b0716', boxShadow: '0 24px 80px rgba(0,0,0,0.5)' }}>
          <img src={staticFile('editor.png')} style={{ width: '100%', transform: `scale(${zoom})`, display: 'block' }} alt="编辑器界面" />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 26 }}>
          {features.map((b, i) => {
            const appear = interpolate(frame, [16 + i * 20, 32 + i * 20], [0, 1], clamp);
            const x = interpolate(frame, [16 + i * 20, 32 + i * 20], [30, 0], clamp);
            return (
              <div key={b} style={{ opacity: appear, transform: `translateX(${x}px)`, display: 'flex', alignItems: 'center', gap: 16 }}>
                <div style={{ width: 14, height: 14, borderRadius: '50%', background: C.pink, boxShadow: `0 0 18px ${C.pink}` }} />
                <div style={{ fontSize: 28, color: C.white, letterSpacing: 1, lineHeight: 1.5 }}>{b}</div>
              </div>
            );
          })}
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ---------- 场景 3：三步使用 ----------
const steps = [
  { n: '01', title: '选图', desc: '给 9 个状态各挑一张图\n动图 GIF 效果最自然', files: ['待机', '互动', '任务完成', '…'] },
  { n: '02', title: '填写', desc: '桌宠名称 · id · 描述\n不填也能直接生成', files: null as string[] | null },
  { n: '03', title: '生成', desc: '自动拼合图集\n写入 ~/.codex/pets/<桌宠id>', files: ['spritesheet.webp', 'pet.json'] },
];

const Scene3Steps: React.FC = () => {
  const frame = useCurrentFrame();
  const fade = useSceneFade(390);
  const headIn = interpolate(frame, [0, 20], [0, 1], clamp);
  return (
    <AbsoluteFill style={{ opacity: fade, alignItems: 'center', justifyContent: 'center', fontFamily: FONT, flexDirection: 'column' }}>
      <div style={{ opacity: headIn, fontSize: 60, fontWeight: 800, color: C.white, letterSpacing: 4, marginBottom: 56 }}>
        三步，换一张新桌宠
      </div>
      <div style={{ display: 'flex', gap: 40 }}>
        {steps.map((s, i) => {
          const appear = interpolate(frame, [18 + i * 22, 36 + i * 22], [0, 1], clamp);
          const rise = interpolate(frame, [18 + i * 22, 40 + i * 22], [40, 0], clamp);
          return (
            <div key={s.n} style={{ opacity: appear, transform: `translateY(${rise}px)`, width: 360, background: C.card, border: `1px solid ${C.cardBorder}`, borderRadius: 22, padding: '28px 26px 26px' }}>
              <div style={{ fontSize: 40, fontWeight: 800, color: C.pink, letterSpacing: 2 }}>{s.n}</div>
              <div style={{ marginTop: 10, fontSize: 34, fontWeight: 700, color: C.white }}>{s.title}</div>
              <div style={{ marginTop: 12, fontSize: 22, color: C.muted, lineHeight: 1.6, whiteSpace: 'pre-line' }}>{s.desc}</div>
              {s.files && (
                <div style={{ marginTop: 16, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  {s.files.map((f) => (
                    <span key={f} style={{ fontFamily: 'Consolas, monospace', fontSize: 19, color: C.pinkSoft, background: 'rgba(255,158,203,0.12)', border: `1px solid rgba(255,158,203,0.35)`, borderRadius: 8, padding: '6px 12px' }}>{f}</span>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

// ---------- 场景 4：结尾 ----------
const Scene4Ending: React.FC = () => {
  const frame = useCurrentFrame();
  const fade = useSceneFade(300, 22);
  const mainIn = interpolate(frame, [18, 46], [0, 1], clamp);
  const linkIn = interpolate(frame, [56, 84], [0, 1], clamp);
  const noteIn = interpolate(frame, [100, 128], [0, 1], clamp);
  return (
    <AbsoluteFill style={{ opacity: fade, alignItems: 'center', justifyContent: 'center', fontFamily: FONT, flexDirection: 'column' }}>
      <Character src="anims/01-待机.gif" width={460} bob={8} />
      <div style={{ opacity: mainIn, marginTop: 6, fontSize: 72, fontWeight: 800, letterSpacing: 6, color: C.white, textShadow: '0 10px 46px rgba(0,0,0,0.5)' }}>
        桌宠换图编辑器
      </div>
      <div style={{ opacity: mainIn, marginTop: 18, fontSize: 30, color: C.pinkSoft, letterSpacing: 3 }}>
        和「予愿安洁莉娜q版桌宠」一起使用
      </div>
      <div style={{ opacity: linkIn, marginTop: 26, fontSize: 30, color: C.white, fontFamily: 'Consolas, monospace', background: 'rgba(255,255,255,0.07)', border: `1px solid ${C.cardBorder}`, borderRadius: 14, padding: '14px 28px' }}>
        github.com/leanyu165-gif/mypet-codex-pet
      </div>
      <div style={{ opacity: noteIn, position: 'absolute', bottom: 46, fontSize: 22, color: C.muted, textAlign: 'center', lineHeight: 1.7, letterSpacing: 1 }}>
        非官方 · 非商业 · 个人同人作品
        <br />
        素材源自鹰角网络《明日方舟》官方公开素材
      </div>
    </AbsoluteFill>
  );
};

// ---------- 主合成 ----------
export const EditorPromo: React.FC = () => {
  return (
    <AbsoluteFill>
      <Background />
      <Sequence from={0} durationInFrames={270}><Scene1Title /></Sequence>
      <Sequence from={270} durationInFrames={420}><Scene2Features /></Sequence>
      <Sequence from={690} durationInFrames={390}><Scene3Steps /></Sequence>
      <Sequence from={1080} durationInFrames={300}><Scene4Ending /></Sequence>
    </AbsoluteFill>
  );
};
