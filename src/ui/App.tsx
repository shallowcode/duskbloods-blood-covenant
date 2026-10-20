import { BookOpen, Moon, Pause, Volume2, VolumeX } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { chooseAI } from '../game/ai.ts';
import {
  createGame,
  humanToAct,
  reduceGame,
  startSpectating,
} from '../game/engine.ts';
import { parseSave, serialize } from '../game/save.ts';
import type { Action, HeroId, State } from '../game/types.ts';
import {
  ArchiveDialog,
  HeroDialog,
  PauseDialog,
  ResponseDialog,
  ResultDialog,
  TutorialDialog,
} from './dialogs.tsx';
import { useEffects } from './effects.ts';
import { Match, SidePanel } from './Match.tsx';
import { Modal } from './Modal.tsx';
import { Selection } from './Selection.tsx';
import { setSoundEnabled } from './sound.ts';
import {
  loadSave,
  loadSettings,
  loadStats,
  recordResult,
  storeSave,
  storeSettings,
  type Settings,
  type Speed,
} from './storage.ts';

type DialogId = 'archive' | 'pause' | 'tutorial' | 'board' | null;

const AI_DELAY: Record<Speed, number> = { slow: 1250, normal: 760, fast: 260 };

function aiDelay(s: State, speed: Speed): number {
  if (s.spectate) return Math.min(AI_DELAY[speed], 320);
  const base = AI_DELAY[speed];
  return s.pending ? base * 0.7 : base;
}

export function App() {
  const [settings, setSettings] = useState<Settings>(loadSettings);
  const [stats, setStats] = useState(loadStats);
  const [game, setGame] = useState<State | null>(null);
  const [saved, setSaved] = useState<State | null>(loadSave);
  const [dialog, setDialog] = useState<DialogId>(null);
  const [inspect, setInspect] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [storageOk, setStorageOk] = useState(true);
  const upload = useRef<HTMLInputElement>(null);
  const effects = useEffects(game, settings.sound);

  const updateSettings = useCallback((patch: Partial<Settings>) => {
    setSettings((cur) => {
      const next = { ...cur, ...patch };
      storeSettings(next);
      return next;
    });
  }, []);

  useEffect(() => setSoundEnabled(settings.sound), [settings.sound]);

  // Every state change goes through commit: it autosaves and records finished
  // matches, outside of render and effects.
  const gameRef = useRef<State | null>(null);
  const commit = useCallback((next: State | null) => {
    gameRef.current = next;
    setGame(next);
    if (!next) return;
    setStorageOk(storeSave(next));
    setSaved(next);
    if (next.result) setStats(recordResult(next.matchId, next));
  }, []);

  const act = useCallback(
    (a: Action) => {
      const cur = gameRef.current;
      if (!cur) return;
      const next = reduceGame(cur, a);
      if (next !== cur) commit(next);
    },
    [commit],
  );

  // The AI driver: whenever an AI seat must act, act after a short beat.
  const paused = dialog !== null || inspect !== null || effects.holding;
  useEffect(() => {
    if (!game || game.result || paused || humanToAct(game)) return;
    const timer = setTimeout(
      () => {
        const cur = gameRef.current;
        if (!cur || cur.result || humanToAct(cur)) return;
        commit(reduceGame(cur, chooseAI(cur)));
      },
      aiDelay(game, settings.speed),
    );
    return () => clearTimeout(timer);
  }, [game, paused, settings.speed, commit]);

  const start = (heroId: HeroId = settings.hero) => {
    effects.clear();
    commit(createGame(heroId, settings.difficulty));
    setDialog(settings.tutorialSeen ? null : 'tutorial');
    if (!settings.tutorialSeen) updateSettings({ tutorialSeen: true });
  };

  const home = () => {
    commit(null);
    setDialog(null);
    effects.clear();
  };

  const exportSave = () => {
    if (!game) return;
    const blob = new Blob([serialize(game)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `黄昏血族-第${game.round}轮.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setMessage('存档已导出。');
  };

  const importSave = async (file: File | undefined) => {
    if (!file) return;
    try {
      const loaded = parseSave(await file.text());
      if (!loaded) {
        setMessage('存档格式不正确，当前对局未改变。');
        return;
      }
      effects.clear();
      commit(loaded);
      setDialog(null);
      setMessage('');
    } catch {
      setMessage('无法读取这个存档。');
    }
  };

  return (
    <div className={`app ${game ? 'in-match' : ''}`}>
      <header className="topbar">
        <div className="brand">
          <Moon />
          <span>
            THE DUSKBLOODS
            <small>黄昏血族 · 血誓牌局</small>
          </span>
        </div>
        <span className="eyebrow topbar-mid">
          {game
            ? game.spectate
              ? 'SPECTATING'
              : 'THE DUSK BATTLE'
            : 'HOUSE OF NIGHT'}
        </span>
        <div className="header-actions">
          <button
            type="button"
            className="icon-button"
            onClick={() => updateSettings({ sound: !settings.sound })}
            aria-label={settings.sound ? '关闭音效' : '开启音效'}
            title={settings.sound ? '关闭音效' : '开启音效'}
          >
            {settings.sound ? <Volume2 size={18} /> : <VolumeX size={18} />}
          </button>
          <button
            type="button"
            className="quiet"
            onClick={() => setDialog('archive')}
          >
            <BookOpen size={16} /> <span className="label">血誓档案</span>
          </button>
          {game && (
            <button
              type="button"
              className="icon-button"
              onClick={() => setDialog('pause')}
              title="暂停与设置"
              aria-label="暂停与设置"
            >
              <Pause size={18} />
            </button>
          )}
        </div>
      </header>

      {game ? (
        <Match
          s={game}
          effects={effects}
          interactive={dialog === null && inspect === null}
          onAct={act}
          onInspect={setInspect}
          onBoard={() => setDialog('board')}
        />
      ) : (
        <Selection
          settings={settings}
          stats={stats}
          saved={saved}
          onSettings={updateSettings}
          onStart={() => start()}
          onContinue={() => {
            if (!saved) return;
            effects.clear();
            commit(saved);
          }}
        />
      )}

      {effects.overlay && (
        <div
          className={`overlay ${effects.overlay.kind}`}
          key={effects.overlay.id}
          aria-live="assertive"
        >
          <strong>{effects.overlay.title}</strong>
          {effects.overlay.sub && <span>{effects.overlay.sub}</span>}
        </div>
      )}

      {!storageOk && (
        <div className="storage-notice">
          浏览器未允许自动保存；请在暂停菜单导出存档。
        </div>
      )}

      {game && <ResponseDialog s={game} onAct={act} />}
      {game && (
        <ResultDialog
          s={game}
          ready={!effects.overlay}
          onReplay={() => start(game.players[0].hero)}
          onSpectate={() => game && commit(startSpectating(game))}
          onHome={home}
        />
      )}
      <ArchiveDialog
        open={dialog === 'archive'}
        onClose={() => setDialog(null)}
      />
      <TutorialDialog
        open={dialog === 'tutorial'}
        onClose={() => setDialog(null)}
      />
      <PauseDialog
        open={dialog === 'pause'}
        settings={settings}
        message={message}
        onSettings={updateSettings}
        onClose={() => {
          setDialog(null);
          setMessage('');
        }}
        onExport={exportSave}
        onImport={() => upload.current?.click()}
        onTutorial={() => setDialog('tutorial')}
        onHome={home}
      />
      {game && (
        <Modal
          open={dialog === 'board'}
          onClose={() => setDialog(null)}
          title="战况"
          description="美德排名与血战纪事"
        >
          <SidePanel s={game} onInspect={(id) => setInspect(id)} />
        </Modal>
      )}
      <HeroDialog id={inspect} onClose={() => setInspect(null)} />
      <input
        type="file"
        accept="application/json,.json"
        ref={upload}
        hidden
        onChange={(e) => {
          void importSave(e.target.files?.[0]);
          e.target.value = '';
        }}
      />
    </div>
  );
}
