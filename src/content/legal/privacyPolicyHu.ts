import { DEMO_COMPANY, LEGAL_CONTACT, PRIVACY_LAST_UPDATED } from '@/lib/legalConstants';

export type PrivacySection = {
  id: string;
  title: string;
  paragraphs?: string[];
  bullets?: string[];
};

export const PRIVACY_META = {
  title: 'Adatvédelmi tájékoztató',
  lastUpdated: PRIVACY_LAST_UPDATED,
  demoNotice:
    'Ez a tájékoztató a ROBEO demó / teszt piactérhez készült. Éles üzemeltetés előtt jogi szakértővel érdemes véglegesíteni.',
};

export const PRIVACY_SECTIONS: PrivacySection[] = [
  {
    id: 'role',
    title: 'Az adataid védelmében játszott szerepünk',
    paragraphs: [
      `A ROBEO piactér üzemeltetője: ${DEMO_COMPANY.name}, székhely: ${DEMO_COMPANY.address}.`,
      'Amikor a ROBEO szolgáltatásait használod (regisztráció, böngészés, eladás, vásárlás, ügyfélszolgálat), mi vagyunk az adatkezelő — vagyis mi felelünk azért, hogy személyes adataid kezelése megfeleljen az EU adatvédelmi előírásainak (GDPR).',
      'Az alábbiakban összefoglaljuk, milyen adatokat gyűjtünk, miért, kivel osztjuk meg, meddig őrizzük meg, és milyen jogaid vannak.',
    ],
  },
  {
    id: 'data-collected',
    title: 'Milyen adatokat gyűjtünk?',
    paragraphs: [
      '„Személyes adat” minden olyan információ, amely alapján azonosítható vagy, vagy hozzád mint természetes személyhez kapcsolható.',
      'Az általunk kezelt adatok mennyisége attól függ, hogyan használod a platformot.',
    ],
    bullets: [
      'Általad megadott adatok: e-mail cím, jelszó (titkosítva), profiladatok (név, felhasználónév, bio, profilkép), szállítási és számlázási adatok, üzenetek, hirdetések tartalma, ajánlatok, értékelések.',
      'Automatikusan gyűjtött adatok: bejelentkezési munkamenet, eszköz- és böngészőadatok, IP-cím, naplóbejegyzések, sütik és hasonló technológiák (lásd cookie banner), mentett keresések és értesítési beállítások (localStorage / fiók meta).',
      'Tranzakciós adatok: rendelések, pénztárca-egyenleg és tranzakciók, számlák (demó bizonylatok), viták (disputes).',
      'Fizetési adatok: a bankkártyaadatokat nem mi tároljuk — a Stripe kezeli (teszt / éles mód szerint).',
      'Képfeltöltés és AI javaslat: a feltöltött termékfotók a Supabase Storage-ban tárolódnak; opcionális AI kategória/javaslat a fejlesztői gépen futó helyi Ollama szolgáltatással (localhost) készül — a képet nem küldjük külső, fizetős felhős MI-szolgáltatónak.',
      'Harmadik forrásból: pl. Stripe Connect onboarding státusz, szállítópartner (Foxpost) visszaigazolások — csak a szolgáltatás teljesítéséhez szükséges mértékben.',
    ],
  },
  {
    id: 'data-use',
    title: 'Hogyan használjuk az adatokat?',
    bullets: [
      'Fiók létrehozása, bejelentkezés, profilkezelés, jogi elfogadások rögzítése.',
      'Termékek listázása, böngészése, keresése, ajánlatok és üzenetek kezelése.',
      'Vásárlás, eladás, pénztárca, checkout, számlázás (demó), szállítási címke generálás.',
      'Biztonság: csalásmegelőzés, viták kezelése, moderáció, naplózás.',
      'Szolgáltatás fejlesztése: hibakeresés, teljesítmény, anonim vagy aggregált statisztika (ha engedélyezed az analitikai sütiket).',
      'Marketing: csak ha külön hozzájárulsz regisztrációkor vagy a cookie bannerben — hírlevél, ajánlatok (demó környezetben korlátozott).',
      'Jogi kötelezettségek: adó-, számviteli és fogyasztóvédelmi előírások (éles üzemben), hatósági megkeresések.',
    ],
  },
  {
    id: 'sharing',
    title: 'Kivel osztjuk meg az adataidat?',
    paragraphs: [
      'Az adataidat nem adjuk el. Csak az alábbi címzettekkel osztjuk meg, ha a szolgáltatás működéséhez szükséges:',
    ],
    bullets: [
      'Más ROBEO-felhasználók: nyilvános profil, hirdetések, értékelések — amit szándékosan közzétesz.',
      'Supabase (EU-kompatibilis hosting): adatbázis, auth, fájltárolás.',
      'Stripe: fizetés és eladói kifizetés (Connect).',
      'Foxpost / szállítópartner: csomagfeladás és nyomon követés.',
      'Web push szolgáltatás (VAPID): ha engedélyezed az értesítéseket.',
      'Hatóságok: ha törvény kötelez, vagy jogaink érvényesítéséhez szükséges.',
    ],
  },
  {
    id: 'retention',
    title: 'Mennyi ideig tároljuk az adataidat?',
    bullets: [
      'Aktív fiók esetén: amíg használod a szolgáltatást, és a tranzakciókhoz / vitákhoz szükséges utólagos időszakban.',
      'Demó környezet: a tesztadatok időnként törlődhetnek (reset script); ne tárolj éles üzleti titkot a demóban.',
      'Fiók törlés / anonimizálás: a profil beállításokban kérhető — a személyes azonosítók eltávolításra kerülnek; a tranzakciós bizonylatok jogi megőrzési kötelezettség miatt anonimizált formában megmaradhatnak.',
      'Sütik: a szükséges sütik a munkamenethez kellenek; analitika/marketing csak hozzájárulás esetén, a bannerben megadott beállítások szerint.',
    ],
  },
  {
    id: 'security',
    title: 'Hogyan védjük az adataidat?',
    bullets: [
      'Titkosított HTTPS kapcsolat, hozzáférés-szabályozás (RLS) az adatbázisban, jelszavak hash-elve (Supabase Auth).',
      'Minimális adatgyűjtés elve: csak ami a funkcióhoz kell.',
      'Rendszeres biztonsági frissítések a fejlesztői stackben.',
      'A te felelősséged: erős jelszó, ne oszd meg a bejelentkezési adataidat, gyanús üzenet esetén jelezd nekünk.',
    ],
  },
  {
    id: 'choices',
    title: 'A te választásaid',
    bullets: [
      'Dönthetsz úgy, hogy bizonyos adatokat nem adsz meg — de egyes funkciók (pl. szállítás, kifizetés) ekkor nem érhetők el.',
      'Cookie banner: analitika és marketing sütik kikapcsolhatók; a szükséges sütik a működéshez kellenek.',
      'Marketing hozzájárulás: regisztrációkor opcionális; később visszavonható (demó: írj a kapcsolati e-mailre).',
      'Értesítések: mentett keresés riasztás, web push — külön kapcsolhatók a felületen.',
    ],
  },
  {
    id: 'rights',
    title: 'A jogaid',
    paragraphs: [
      'A GDPR alapján jogod van hozzáférni az adataidhoz, helyesbítést kérni, törlést (elfeledtetés), korlátozást, adathordozhatóságot, tiltakozást, valamint panaszt tenni a Nemzeti Adatvédelmi és Információszabadság Hatóságnál (NAIH).',
      'A ROBEO demóban a profil → Beállítások → Adatvédelem menüpontban letöltheted az adataid JSON exportját, és kérheted a fiók anonimizálását.',
    ],
    bullets: [
      'Hozzáférés és másolat kérése',
      'Helytelen adat javítása',
      'Fiók törlése / anonimizálás',
      'Adathordozhatóság (JSON export)',
      'Hozzájárulás visszavonása (ahol hozzájárulás az alap)',
      'Panasz a NAIH-nál: naih.hu',
    ],
  },
  {
    id: 'contact',
    title: 'Kapcsolatfelvétel',
    paragraphs: [
      `Adatvédelmi kérdések, joggyakorlás: ${LEGAL_CONTACT.privacyEmail}`,
      `Általános ügyfélszolgálat (demó): ${LEGAL_CONTACT.supportEmail}`,
      `Postai cím: ${DEMO_COMPANY.name}, ${DEMO_COMPANY.address}`,
      'Kérésre azonosítást kérhetünk — ez védi az adataidat illetéktelen hozzáféréstől.',
      'Ezt a tájékoztatót időnként frissítjük. Jelentős változás esetén értesítünk (e-mail vagy a platformon). Utolsó frissítés dátuma az oldal tetején.',
    ],
  },
];
