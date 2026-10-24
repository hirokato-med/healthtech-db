#!/usr/bin/env node
/**
 * データの更新履歴に1件足す（手で取り込んだときに使う）。
 *
 *   node scripts/add-update.mjs '{"kind":"資金調達","title":"…","href":"/funding/","links":[{"label":"…","href":"/companies/…/"}]}'
 *
 * date を省くと日本時間の今日。
 */
import { addUpdate, todayJst } from '../pipeline/lib/updates.mjs';

const e = JSON.parse(process.argv[2] ?? '{}');
if (!e.kind || !e.title) throw new Error('kind と title は必須');
addUpdate({ date: todayJst(), ...e });
console.error(`更新履歴に追加: ${e.kind}「${e.title}」`);
