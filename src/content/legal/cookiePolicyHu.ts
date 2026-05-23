import { COOKIE_POLICY_LAST_UPDATED } from '@/lib/legalConstants';
import type { PrivacySection } from '@/content/legal/privacyPolicyTypes';

export const COOKIE_POLICY_META = {
  title: 'Cookie-król szóló szabályzat',
  lastUpdated: COOKIE_POLICY_LAST_UPDATED,
};

export const COOKIE_POLICY_SECTIONS: PrivacySection[] = [
  {
    id: 'what',
    title: 'Mi az a cookie?',
    paragraphs: [
      'A cookie (süti) kis szöveges fájl, amelyet a böngésződ tárol. Hasonló technológiák: localStorage (pl. mentett keresések, cookie hozzájárulás).',
    ],
  },
  {
    id: 'types',
    title: 'Milyen cookie-kat használunk?',
    subsections: [
      {
        title: 'Szükséges (mindig aktív)',
        bullets: [
          'Bejelentkezési munkamenet (Supabase Auth).',
          'Biztonság, CSRF, alap működés.',
          'Cookie hozzájárulás preferencia tárolása.',
        ],
      },
      {
        title: 'Analitika (opcionális)',
        bullets: [
          'Demó: korlátozott, anonim használati statisztika — csak ha a bannerben engedélyezed.',
        ],
      },
      {
        title: 'Marketing (opcionális)',
        bullets: [
          'Személyre szabott ajánlatok, remarketing — csak hozzájárulással. Demóban minimális.',
        ],
      },
    ],
  },
  {
    id: 'control',
    title: 'Hogyan irányíthatod?',
    bullets: [
      'Oldal alján megjelenő cookie banner: „Összes elfogadása”, „Csak szükséges”, részletes beállítások.',
      'Böngésző beállítás: cookie-k törlése vagy blokkolása — egyes funkciók (bejelentkezés) ekkor nem működnek.',
    ],
  },
  {
    id: 'third',
    title: 'Harmadik fél',
    paragraphs: [
      'Stripe checkout iframe/szkriptjei saját cookie-kat használhatnak a fizetés biztonságához — a Stripe adatvédelmi szabályzata vonatkozik rájuk.',
    ],
  },
  {
    id: 'contact',
    title: 'Kapcsolat',
    paragraphs: [
      'Cookie-kkal kapcsolatos kérdés: lásd az Adatvédelmi tájékoztató Kapcsolatfelvétel fejezetét.',
    ],
  },
];
