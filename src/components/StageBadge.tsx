import { isStalledStage } from '@/lib/status';

/** 準備中の事業の段階。研究開発から発売予定までの6段階を、色の濃さと6つの目盛りで示す（色だけに頼らない） */
export const STAGES = ['研究開発中', '開発中', '実証・臨床試験中', '承認申請中', '承認取得・発売前', '発売予定'] as const;

/**
 * 段階の名前から目盛りの位置を決める（定義第2.5版の名前も、旧い名前も）。
 * 治験中止・治験終了（次の段階は未確認）・発表のみは、開発が続いているか分からないので -1（目盛りを付けず、並べると一番下）
 */
export function stageIndex(stage?: string) {
  if (isStalledStage(stage)) return -1;
  const i = STAGES.indexOf(stage as (typeof STAGES)[number]);
  if (i >= 0) return i;
  const t = stage ?? '';
  if (/発売予定/.test(t)) return 5;
  if (/承認取得|発売準備/.test(t)) return 4;
  if (/申請/.test(t)) return 3;
  if (/治験|臨床試験|実証|参加募集|限定提供/.test(t)) return 2;
  if (/研究/.test(t)) return 0;
  return 1;
}

/** 段階の名前を、凡例（STAGES）の名前にそろえる。凡例と違う書き方のときは、記録の書き方をかっこで添える */
export const stageName = (stage?: string) => {
  const i = stageIndex(stage);
  if (i < 0 || !stage) return stage ?? STAGES[Math.max(i, 0)];
  return STAGES[i] === stage ? stage : `${STAGES[i]}（${stage}）`;
};

export function StageBadge({ stage }: { stage?: string }) {
  const i = stageIndex(stage);
  if (i < 0) {
    return (
      <span className="stage stage-stalled" title="開発が続いているかを資料で確かめられていません。止まっている可能性があります">
        {stage}
      </span>
    );
  }
  return (
    <span className={`stage stage-${i + 1}`} title={`発売までの${STAGES.length}段階のうち${i + 1}段階目`}>
      <i aria-hidden="true">{STAGES.map((s, k) => <b key={s} className={k <= i ? 'on' : ''} />)}</i>
      {stageName(stage)}
    </span>
  );
}
