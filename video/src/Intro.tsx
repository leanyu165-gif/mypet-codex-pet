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
const Scene1Opening: React.FC = () => {
  const frame = useCurrentFrame();
  const fade = useSceneFade(390);
  const titleIn = interpolate(frame, [20, 50], [0, 1], clamp);
  const subIn = interpolate(frame, [55, 85], [0, 1], clamp);
  const scale = interpolate(frame, [20, 55], [0.9, 1], clamp);
  return (
    <AbsoluteFill style={{ opacity: fade, alignItems: 'center', justifyContent: 'center', fontFamily: FONT, flexDirection: 'column' }}>
      <Character src="anims/01-待机.gif" width={620} bob={8} />
      <div style={{ transform: `scale(${scale})`, opacity: titleIn, marginTop: 4, fontSize: 92, fontWeight: 800, letterSpacing: 6, color: C.white, textShadow: '0 10px 46px rgba(0,0,0,0.5)' }}>
        予愿安洁莉娜q版桌宠
      </div>
      <div style={{ opacity: subIn, marginTop: 22, fontSize: 38, color: C.pinkSoft, letterSpacing: 5 }}>
        Codex 桌面桌宠 · 让洁哥陪你工作
      </div>
      <div style={{ opacity: subIn, marginTop: 14, fontSize: 24, color: C.muted, letterSpacing: 2 }}>
        基于 Codex 桌宠 V2 规范 · 8 列 × 11 行动作图集
      </div>
    </AbsoluteFill>
  );
};

// ---------- 场景 2：九宫格动作巡礼 ----------
const states = [
  { file: 'grid/01-待机-idle.gif', name: '待机', code: 'idle' },
  { file: 'grid/02-向右移动-running-right.gif', name: '向右移动', code: 'running-right' },
  { file: 'grid/03-向左移动-running-left.gif', name: '向左移动', code: 'running-left' },
  { file: 'grid/04-互动-waving.gif', name: '互动', code: 'waving' },
  { file: 'grid/05-任务完成-jumping.gif', name: '任务完成', code: 'jumping' },
  { file: 'grid/06-任务失败-failed.gif', name: '任务失败', code: 'failed' },
  { file: 'grid/07-等待确认-waiting.gif', name: '等待确认', code: 'waiting' },
  { file: 'grid/08-工作中-running.gif', name: '工作中', code: 'running' },
  { file: 'grid/09-检查中-review.gif', name: '检查中', code: 'review' },
];

const Scene2Gallery: React.FC = () => {
  const frame = useCurrentFrame();
  const fade = useSceneFade(660);
  const headIn = interpolate(frame, [0, 20], [0, 1], clamp);
  return (
    <AbsoluteFill style={{ opacity: fade, alignItems: 'center', justifyContent: 'center', fontFamily: FONT, flexDirection: 'column' }}>
      <div style={{ opacity: headIn, fontSize: 60, fontWeight: 800, color: C.white, letterSpacing: 4, marginBottom: 48 }}>
        九个状态 · 一只有反应的洁哥
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 300px)', gap: '36px 44px' }}>
        {states.map((s, i) => {
          const appear = interpolate(frame, [i * 14, i * 14 + 16], [0, 1], clamp);
          const rise = interpolate(frame, [i * 14, i * 14 + 22], [34, 0], clamp);
          return (
            <div key={s.code} style={{ opacity: appear, transform: `translateY(${rise}px)`, background: C.card, border: `1px solid ${C.cardBorder}`, borderRadius: 20, padding: '16px 16px 12px', textAlign: 'center' }}>
              <Gif src={staticFile(s.file)} width={250} fit="contain" />
              <div style={{ marginTop: 8, fontSize: 26, color: C.white, fontWeight: 600 }}>{s.name}</div>
              <div style={{ fontSize: 18, color: C.muted, fontFamily: 'Consolas, monospace' }}>{s.code}</div>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

// ---------- 场景 3：技术规格 ----------
const bullets = [
  'Codex 桌宠 V2 规范 · 8 列 × 11 行',
  '整图 1536 × 2288 · 单格 192 × 208',
  '9 种动作状态，引擎按事件自动切换',
  '互动 / 任务完成 / 失败 / 工作各有专属动画',
  '源素材来自《明日方舟》官方公开素材',
];

const Scene3Specs: React.FC = () => {
  const frame = useCurrentFrame();
  const fade = useSceneFade(600);
  const headIn = interpolate(frame, [0, 20], [0, 1], clamp);
  const zoom = interpolate(frame, [0, 600], [1, 1.08], clamp);
  return (
    <AbsoluteFill style={{ opacity: fade, alignItems: 'center', justifyContent: 'center', fontFamily: FONT, flexDirection: 'column' }}>
      <div style={{ opacity: headIn, fontSize: 60, fontWeight: 800, color: C.white, letterSpacing: 4, marginBottom: 52 }}>
        技术规格
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 90 }}>
        <div style={{ width: 700, borderRadius: 24, overflow: 'hidden', border: `1px solid ${C.cardBorder}`, background: '#000', boxShadow: '0 24px 80px rgba(0,0,0,0.5)' }}>
          <img src={staticFile('atlas.webp')} style={{ width: '100%', transform: `scale(${zoom})`, display: 'block' }} alt="精灵图集" />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 26 }}>
          {bullets.map((b, i) => {
            const appear = interpolate(frame, [24 + i * 18, 40 + i * 18], [0, 1], clamp);
            const x = interpolate(frame, [24 + i * 18, 40 + i * 18], [30, 0], clamp);
            return (
              <div key={b} style={{ opacity: appear, transform: `translateX(${x}px)`, display: 'flex', alignItems: 'center', gap: 16 }}>
                <div style={{ width: 14, height: 14, borderRadius: '50%', background: C.pink, boxShadow: `0 0 18px ${C.pink}` }} />
                <div style={{ fontSize: 30, color: C.white, letterSpacing: 1 }}>{b}</div>
              </div>
            );
          })}
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ---------- 场景 4：安装步骤 ----------
const steps = [
  { n: '01', title: '下载仓库', desc: 'github.com/leanyu165-gif/mypet-codex-pet', files: null as string[] | null },
  { n: '02', title: '复制两个文件', desc: '到 %USERPROFILE%\\.codex\\pets\\mypet\\', files: ['pet.json', 'spritesheet.webp'] },
  { n: '03', title: '刷新列表', desc: '设置 → Pets → 刷新列表', files: null },
  { n: '04', title: '选中洁哥', desc: '予愿安洁莉娜q版桌宠', files: null },
];

const Scene4Install: React.FC = () => {
  const frame = useCurrentFrame();
  const fade = useSceneFade(750);
  const headIn = interpolate(frame, [0, 20], [0, 1], clamp);
  return (
    <AbsoluteFill style={{ opacity: fade, alignItems: 'center', justifyContent: 'center', fontFamily: FONT, flexDirection: 'column' }}>
      <div style={{ opacity: headIn, fontSize: 60, fontWeight: 800, color: C.white, letterSpacing: 4, marginBottom: 60 }}>
        四步，装好你的洁哥
      </div>
      <div style={{ display: 'flex', gap: 40 }}>
        {steps.map((s, i) => {
          const appear = interpolate(frame, [18 + i * 22, 36 + i * 22], [0, 1], clamp);
          const rise = interpolate(frame, [18 + i * 22, 40 + i * 22], [40, 0], clamp);
          return (
            <div key={s.n} style={{ opacity: appear, transform: `translateY(${rise}px)`, width: 330, background: C.card, border: `1px solid ${C.cardBorder}`, borderRadius: 22, padding: '28px 26px 26px' }}>
              <div style={{ fontSize: 40, fontWeight: 800, color: C.pink, letterSpacing: 2 }}>{s.n}</div>
              <div style={{ marginTop: 10, fontSize: 34, fontWeight: 700, color: C.white }}>{s.title}</div>
              <div style={{ marginTop: 12, fontSize: 21, color: C.muted, lineHeight: 1.6, wordBreak: 'break-all' }}>{s.desc}</div>
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

// ---------- 场景 5：结尾 ----------
const Scene5Ending: React.FC = () => {
  const frame = useCurrentFrame();
  const fade = useSceneFade(540, 22);
  const mainIn = interpolate(frame, [20, 48], [0, 1], clamp);
  const linkIn = interpolate(frame, [60, 88], [0, 1], clamp);
  const noteIn = interpolate(frame, [110, 140], [0, 1], clamp);
  return (
    <AbsoluteFill style={{ opacity: fade, alignItems: 'center', justifyContent: 'center', fontFamily: FONT, flexDirection: 'column' }}>
      <Character src="anims/01-待机.gif" width={520} bob={8} />
      <div style={{ opacity: mainIn, marginTop: 4, fontSize: 74, fontWeight: 800, letterSpacing: 6, color: C.white, textShadow: '0 10px 46px rgba(0,0,0,0.5)' }}>
        让洁哥陪你工作
      </div>
      <div style={{ opacity: mainIn, marginTop: 20, fontSize: 32, color: C.pinkSoft, letterSpacing: 3 }}>
        予愿安洁莉娜q版桌宠 · Codex 桌面桌宠
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
export const Intro: React.FC = () => {
  return (
    <AbsoluteFill>
      <Background />
      <Sequence from={0} durationInFrames={390}><Scene1Opening /></Sequence>
      <Sequence from={390} durationInFrames={660}><Scene2Gallery /></Sequence>
      <Sequence from={1050} durationInFrames={600}><Scene3Specs /></Sequence>
      <Sequence from={1650} durationInFrames={750}><Scene4Install /></Sequence>
      <Sequence from={2400} durationInFrames={540}><Scene5Ending /></Sequence>
    </AbsoluteFill>
  );
};
