/**
 * RobeoBP — ajánlott személyes átvételi helyek kerületenként (statikus, ingyenes).
 * Nincs geokódolás / külső API — csak ismert, nyilvános, jól megvilágított pontok.
 */

export type MeetingPointPreset = {
  id: string;
  label: string;
  hint?: string;
};

/** Általános tippek minden kerületre. */
export const MEETING_POINT_SAFETY_TIPS = [
  'bp.meeting.tip.public',
  'bp.meeting.tip.daylight',
  'bp.meeting.tip.cash',
] as const;

/** Kerület-specifikus presetek (metró / nagy közterek). */
export const MEETING_POINTS_BY_DISTRICT: Record<string, MeetingPointPreset[]> = {
  I: [
    { id: 'i-deak', label: 'Deák tér (5 perc BKK-val)', hint: 'bp.meeting.hint.metro' },
    { id: 'i-margit', label: 'Margit híd budai hídfő', hint: 'bp.meeting.hint.landmark' },
  ],
  II: [
    { id: 'ii-moszkva', label: 'Széll Kálmán tér', hint: 'bp.meeting.hint.metro' },
    { id: 'ii-margit', label: 'Margit körút — Ostrom utca környéke', hint: 'bp.meeting.hint.busy' },
  ],
  III: [
    { id: 'iii-lehel', label: 'Lehel tér metró', hint: 'bp.meeting.hint.metro' },
    { id: 'iii-kolosy', label: 'Kolosy tér', hint: 'bp.meeting.hint.busy' },
  ],
  IV: [
    { id: 'iv-ujpest', label: 'Újpest-központ metró', hint: 'bp.meeting.hint.metro' },
  ],
  V: [
    { id: 'v-deak', label: 'Deák tér', hint: 'bp.meeting.hint.metro' },
    { id: 'v-ferenciek', label: 'Ferenciek tere', hint: 'bp.meeting.hint.metro' },
    { id: 'v-nyugati', label: 'Nyugati tér', hint: 'bp.meeting.hint.metro' },
  ],
  VI: [
    { id: 'vi-oktogon', label: 'Oktogon / Király utca', hint: 'bp.meeting.hint.busy' },
    { id: 'vi-nyugati', label: 'Nyugati tér', hint: 'bp.meeting.hint.metro' },
  ],
  VII: [
    { id: 'vii-blaha', label: 'Blaha Lujza tér', hint: 'bp.meeting.hint.metro' },
    { id: 'vii-oktogon', label: 'Oktogon', hint: 'bp.meeting.hint.busy' },
  ],
  VIII: [
    { id: 'viii-kalvin', label: 'Kálvin tér', hint: 'bp.meeting.hint.metro' },
    { id: 'viii-corvin', label: 'Corvin-negyed', hint: 'bp.meeting.hint.busy' },
  ],
  IX: [
    { id: 'ix-nagyvarad', label: 'Népliget / Nagyvárad tér metró', hint: 'bp.meeting.hint.metro' },
  ],
  X: [
    { id: 'x-keleti', label: 'Keleti pályaudvar', hint: 'bp.meeting.hint.metro' },
    { id: 'x-arena', label: 'Puskás Aréna környéke', hint: 'bp.meeting.hint.landmark' },
  ],
  XI: [
    { id: 'xi-moricz', label: 'Móricz Zsigmond körtér', hint: 'bp.meeting.hint.metro' },
    { id: 'xi-kelenfold', label: 'Kelenföld vasútállomás', hint: 'bp.meeting.hint.metro' },
  ],
  XII: [
    { id: 'xii-moszkva', label: 'Széll Kálmán tér', hint: 'bp.meeting.hint.metro' },
  ],
  XIII: [
    { id: 'xiii-lehel', label: 'Lehel tér / Duna Plaza környéke', hint: 'bp.meeting.hint.busy' },
    { id: 'xiii-ugynok', label: 'Váci út — Göncz Árpád városközpont', hint: 'bp.meeting.hint.metro' },
  ],
  XIV: [
    { id: 'xiv-ors', label: 'Örs vezér tere', hint: 'bp.meeting.hint.metro' },
    { id: 'xiv-heros', label: 'Hősök tere', hint: 'bp.meeting.hint.metro' },
  ],
  XV: [
    { id: 'xv-ujpest', label: 'Újpest-központ', hint: 'bp.meeting.hint.metro' },
  ],
  XVI: [
    { id: 'xvi-mexikoi', label: 'Mexikói út metró', hint: 'bp.meeting.hint.metro' },
  ],
  XVII: [
    { id: 'xvii-akademia', label: 'Puskás Ferenc Stadion / Örs környéke', hint: 'bp.meeting.hint.metro' },
  ],
  XVIII: [
    { id: 'xviii-kobanya', label: 'Kőbánya-Kispest metró végállomás', hint: 'bp.meeting.hint.metro' },
  ],
  XIX: [
    { id: 'xix-puskas', label: 'Puskás Ferenc Stadion', hint: 'bp.meeting.hint.landmark' },
  ],
  XX: [
    { id: 'xx-papp', label: 'Papp László Budapest Sportaréna környéke', hint: 'bp.meeting.hint.landmark' },
  ],
  XXI: [
    { id: 'xxi-csepel', label: 'Csepel-Központ', hint: 'bp.meeting.hint.busy' },
  ],
  XXII: [
    { id: 'xxii-mcam', label: 'Móricz Zsigmond körtér (BKK)', hint: 'bp.meeting.hint.metro' },
  ],
  XXIII: [
    { id: 'xxiii-soroksar', label: 'Soroksár főút / Kossuth L. tér környéke', hint: 'bp.meeting.hint.busy' },
  ],
};

export const GENERIC_MEETING_POINTS: MeetingPointPreset[] = [
  { id: 'generic-metro', label: 'Kerület legforgalmasabb metróállomása', hint: 'bp.meeting.hint.metro' },
  { id: 'generic-mall', label: 'Bevásárlóközpont bejárata', hint: 'bp.meeting.hint.busy' },
  { id: 'generic-cafe', label: 'Nyilvános kávézó / üzlet előtt', hint: 'bp.meeting.hint.public' },
];

export function getMeetingPointsForDistrict(districtId: string | null | undefined): MeetingPointPreset[] {
  const key = districtId?.trim().toUpperCase();
  if (!key) return GENERIC_MEETING_POINTS;
  return MEETING_POINTS_BY_DISTRICT[key] ?? GENERIC_MEETING_POINTS;
}
