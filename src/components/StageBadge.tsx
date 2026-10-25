/** 準備中の事業の段階。研究開発から発売予定までの6段階を、色の濃さと6つの目盛りで示す（色だけに頼らない） */
export const STAGES = ['研究開発中', '開発中', '実証・臨床試験中', '承認申請中', '承認取得・発売前', '発売予定'] as const;

export function stageIndex(stage?: string) {
  const i = STAGES.indexOf(stage as (typeof STAGES)[number]);
  return i < 0 ? 1 : i;
}

export function StageBadge({ stage }: { stage?: string }) {
  const i = stageIndex(stage);
  return (
    <span className={`stage stage-${i + 1}`} title={`発売までの${STAGES.length}段階のうち${i + 1}段階目`}>
      <i aria-hidden="true">{STAGES.map((s, k) => <b key={s} className={k <= i ? 'on' : ''} />)}</i>
      {stage ?? STAGES[i]}
    </span>
  );
}
