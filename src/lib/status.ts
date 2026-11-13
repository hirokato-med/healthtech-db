/** 画面に出す提供状態（障害などによる一時停止と、終了・譲渡の予定を区別する）。クライアントからも使うので fs を読まない */
export const statusLabel = (s: { status: string; suspension?: { temporary?: boolean }; plannedEnd?: { kind: string } }) =>
  s.suspension?.temporary ? '一時停止中' : s.status === '提供中' && s.plannedEnd ? `提供中（${s.plannedEnd.kind}予定）` : s.status === '不明' ? '提供状況未確認' : s.status;
