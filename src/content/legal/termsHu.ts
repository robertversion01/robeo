import { DEMO_COMPANY, LEGAL_CONTACT, PAY_FEES_URL, PRIVACY_LAST_UPDATED } from '@/lib/legalConstants';
import type { PrivacySection } from '@/content/legal/privacyPolicyTypes';

export const TERMS_META = {
  title: 'Általános Szerződési Feltételek',
  lastUpdated: PRIVACY_LAST_UPDATED,
  demoNotice:
    'A ROBEO demó piactér tesztkörnyezetben fut. Éles üzemeltetés előtt jogi szakértővel érdemes véglegesíteni az ÁSZF-et. A szöveg a tényleges demó funkciókat írja le — nem minősül jogi tanácsadásnak.',
  payNotice:
    'A belső pénztárca, checkout fizetés és eladói kifizetés a külön ROBEO Pay ÁSZF-ben (/legal/pay) van szabályozva. Pénztárca használata előtt azt is el kell olvasnod és elfogadnod.',
};

export const TERMS_SECTIONS: PrivacySection[] = [
  {
    id: 'about',
    title: '1. Rólad és rólunk',
    paragraphs: [
      `Üdvözöl a ROBEO! Üzemeltető: ${DEMO_COMPANY.name}, ${DEMO_COMPANY.address}.`,
      'A ROBEO egy használt ruházat és tárgyak piactere (webalkalmazás). Mi közvetítőként járunk el vevők és eladók között — nem mi vásároljuk meg és adjuk el a termékeket.',
    ],
    subsections: [
      {
        title: 'Mivel foglalkozunk?',
        bullets: [
          'Tárhelyszolgáltatás: hirdetések, böngészés, keresés, profil.',
          'Vevővédelem (demó): fizetés letétben tartása, dispute flow, visszatérítés szabályok szerint.',
          'Opcionális szolgáltatások: termék kiemelés (promote), értesítések.',
        ],
      },
      {
        title: 'Ki lehet felhasználó?',
        bullets: [
          'Legalább 18 éves természetes személy.',
          'Regisztrált fiók, személyes (nem üzleti) célra a demóban.',
          'Elfogadod ezt az ÁSZF-et és az Adatvédelmi tájékoztatót.',
          'A Honlap 18+ célcsoportnak készült.',
        ],
      },
      {
        title: 'Eladó és vevő',
        paragraphs: [
          'Ugyanaz a fiók lehet eladó és vevő is. Eladó: terméket listáz. Vevő: megveszi a „Fizetés” gombbal a checkouton.',
        ],
      },
    ],
  },
  {
    id: 'terms-about',
    title: '2. Az Általános Szerződési Feltételekről',
    subsections: [
      {
        title: 'Hatály',
        paragraphs: [
          'Ez az ÁSZF közted és a ROBEO között jött létre. Szabályozza a platform és szolgáltatások használatát.',
        ],
      },
      {
        title: 'Elfogadás',
        bullets: [
          'Regisztrációkor kombinált checkbox: ÁSZF + adatvédelem + 18+.',
          'ÁSZF módosításakor újra elfogadás kérhető.',
        ],
      },
      {
        title: 'Kapcsolódó dokumentumok',
        bullets: [
          'Adatvédelmi tájékoztató (/legal/privacy)',
          'ROBEO Pay ÁSZF (/legal/pay) — pénztárca és fizetés',
          'Cookie szabályzat (/legal/cookies)',
          'Feltöltési/katalógus szabályok — a feltöltés wizard és moderáció alapján',
        ],
      },
      {
        title: 'Módosítás',
        paragraphs: [
          'Jelentős módosításról 30 nappal előre értesítünk (e-mail vagy platform). Ha nem értesz egyet, törölheted a fiókodat. A módosítások nem érintik visszamenőleg a már lezárt tranzakciókat.',
        ],
      },
    ],
  },
  {
    id: 'contact',
    title: '3. Kapcsolatfelvétel',
    bullets: [
          'Jelentés: admin / moderáció flow, vagy ' + LEGAL_CONTACT.supportEmail,
          'Panasz: ' + LEGAL_CONTACT.supportEmail,
          'Adatvédelem: ' + LEGAL_CONTACT.privacyEmail,
          'Súgó: /help',
        ],
  },
  {
    id: 'account',
    title: '4. Hogyan lehetsz felhasználónk',
    subsections: [
      {
        title: 'Fiók létrehozása',
        bullets: [
          'E-mail + jelszó regisztráció (demó).',
          'E-mail megerősítés, ha Supabase Auth beállítás szerint kötelező.',
          'Egy fiók / felhasználó — kivéve ha jogosulatlan átvétel után új fiók engedélyezett.',
        ],
      },
      {
        title: 'Ellenőrzés',
        paragraphs: [
          'Biztonsági okból kérhetünk e-mail megerősítést, telefonszámot vagy Stripe Connect KYC-t kifizetéshez.',
        ],
      },
      {
        title: 'Promóciók',
        paragraphs: ['Időnként demó promóciók, versenyek — külön szabályokkal.'],
      },
    ],
  },
  {
    id: 'data-use',
    title: '5. Az általad megosztott információk',
    subsections: [
      {
        title: 'Személyes adatok',
        paragraphs: [
          'Az adatkezelés az Adatvédelmi tájékoztatóban van leírva. Profilban, tranzakcióban, üzenetben megadott adatokat a szolgáltatás működtetésére használjuk.',
        ],
      },
      {
        title: 'Tartalom (hirdetés, fotó, leírás)',
        bullets: [
          'Feltöltéssel engedélyt adsz a tartalom platformon való megjelenítésére, kereshetőségére.',
          'Nem adsz át kizárólagos tulajdonjogot — a tartalom a tiéd marad.',
          'Marketing célú megjelenítéshez külön hozzájárulás szükséges (demó: korlátozott).',
          'AI javaslat feltöltéskor: helyi Ollama (localhost) — nem külső felhős API.',
        ],
      },
    ],
  },
  {
    id: 'conduct',
    title: '6. Mit kell és mit nem szabad tenned',
    subsections: [
      {
        title: 'Kötelező',
        bullets: [
          'ÁSZF és jogszabályok betartása.',
          'Pontos, naprakész profiladatok.',
          'Jelszó bizalmas kezelése; gyanús hozzáférés jelzése.',
          'Saját felelősség a feltöltött tartalomért.',
        ],
      },
      {
        title: 'Tiltott',
        bullets: [
          'Törvényellenes, sértő, hamis hirdetés; hamisított áru.',
          'Botok, scraping, platform terhelése.',
          'Több fiók visszaélés céljából.',
          'Fizetés/checkout megkerülése a platformon kívül.',
          'Zaklatás, spam üzenet, átverés.',
          'Tiltott termékek (fegyver, gyógyszer, élő állat stb.) — moderáció alapján.',
        ],
      },
    ],
  },
  {
    id: 'enforcement',
    title: '7. Szabálysértés kezelése',
    subsections: [
      {
        title: 'Korrekciós intézkedések',
        bullets: [
          'Figyelmeztetés, hirdetés elrejtése/törlése, üzenet elrejtése.',
          'Funkció korlátozás (pl. upload, üzenet).',
          'Jelentés hatóságnak súlyos esetben.',
        ],
      },
      {
        title: 'Fiók letiltás',
        paragraphs: [
          'Ideiglenes vagy végleges letiltás súlyos vagy ismételt szabálysértés, csalás gyanú, fizetési visszaélés esetén. Indokot közölünk, ha törvény nem tiltja. Függő tranzakciók a dispute szabályok szerint zárulhatnak.',
        ],
      },
      {
        title: 'Automatizált ellenőrzés',
        paragraphs: [
          'Rate limit, spam szűrés, csalás minták — emberi felülvizsgálattal kombinálva. Vitás döntés esetén kapcsolatfelvétel lehetséges.',
        ],
      },
    ],
  },
  {
    id: 'wallet',
    title: '8. ROBEO pénztárca',
    paragraphs: [
      'Belső egyenleg (HUF): eladásból pending → available. Vásárlás wallet-ből, kifizetés Stripe Connect-tel.',
      'Első eladás után pénztárca / ROBEO Pay ÁSZF elfogadása szükséges a kifizetéshez.',
      'Részletes szabályok: /legal/pay',
    ],
  },
  {
    id: 'payment',
    title: '9. Fizetés',
    subsections: [
      {
        title: 'Fizetési módok (demó)',
        bullets: [
          'ROBEO pénztárca (ha van fedezet).',
          'Stripe bankkártya (teszt/éles mód).',
          'Vegyes: wallet + kártya.',
        ],
      },
      {
        title: 'Letét',
        paragraphs: [
          'Vásárláskor az összeg letétben van a tranzakció lezárásáig. Ezután az eladó részére jóváírás (levonva piactér díjait).',
        ],
      },
      {
        title: 'Díjak',
        paragraphs: [
          `Checkout: termék ár, szállítás, vevővédelmi díj. Részletek: ${PAY_FEES_URL}. Demó számlák nem adóügyi bizonylatok.`,
        ],
      },
    ],
  },
  {
    id: 'messages',
    title: '10. Üzenetek és értékelések',
    bullets: [
      'Privát üzenet és ajánlat (offer) a tranzakcióhoz kapcsolódóan.',
      'Tiltott: spam, reklám, zaklatás, törvényellenes tartalom.',
      'Értékelés tranzakció után — őszinte, tisztességes vélemény. Moderáció sértő tartalomra.',
    ],
  },
  {
    id: 'termination',
    title: '11. Kapcsolat megszüntetése',
    bullets: [
      'Te bármikor törölheted/anonimizálhatod a fiókodat (profil → adatvédelem).',
      'Mi 30 napos felmondással megszüntethetjük a szolgáltatást súlyos ok esetén.',
      'Függő tranzakciók a lezárásig az ÁSZF szerint érvényben maradnak.',
    ],
  },
  {
    id: 'selling',
    title: '12. Termék eladása',
    subsections: [
      {
        title: 'Mit adhatsz el?',
        bullets: [
          'Csak olyan termék, aminek tulajdonosa vagy.',
          'Használt ruházat, cipő, kiegészítő — kategória szerint.',
          'Valós fotók és leírás, hibák jelölése.',
        ],
      },
      {
        title: 'Hirdetés',
        paragraphs: [
          'Feltöltés wizard: fotó, kategória, márka, méret, ár. Hirdetés közzététele ajánlat a vevőknek.',
        ],
      },
      {
        title: 'Ajánlat',
        paragraphs: [
          'Vevő counter-offer-t küldhet. Elfogadás után checkout / fizetés.',
        ],
      },
    ],
  },
  {
    id: 'buying',
    title: '13. Termék vásárlása',
    subsections: [
      {
        title: 'Vásárlás lépései',
        bullets: [
          'Termék oldal → Vásárlás / Ajánlat elfogadása.',
          'Szállítási mód (Foxpost csomagpont stb.), fizetés.',
          'Checkout ÁSZF + adatvédelem + Pay elfogadás.',
        ],
      },
      {
        title: 'Díjak',
        bullets: ['Termék ár', 'Szállítási díj', 'Vevővédelmi díj', 'Opcionális szolgáltatások'],
      },
      {
        title: 'Platformon kívüli vásárlás',
        paragraphs: [
          'Ha a platformon kívül vásárolsz, a ROBEO vevővédelme nem vonatkozik rád.',
        ],
      },
    ],
  },
  {
    id: 'buyer-protection',
    title: '14. Vevővédelem',
    subsections: [
      {
        title: 'Cél',
        paragraphs: [
          'Visszatérítés, ha a csomag elvész, sérül, vagy a termék jelentősen eltér a leírástól. Dispute flow az üzenetekben / tranzakcióban.',
        ],
      },
      {
        title: 'Igénylés',
        bullets: [
          'Probléma jelzése a kézbesítés után korlátozott időn belül (demó: dispute nyitás).',
          'Először egyeztetés eladóval ajánlott.',
          'Admin moderáció vitás esetben.',
        ],
      },
      {
        title: 'Korlátok',
        paragraphs: [
          'Nem jár visszatérítés, ha a termék megfelel a leírásnak, visszaélés gyanúja van, vagy lejárt az igénylési határidő.',
        ],
      },
    ],
  },
  {
    id: 'seller-services',
    title: '15. Eladói szolgáltatások',
    paragraphs: [
      'Termék kiemelés (promote) — díjas, Stripe checkouton. Egyszeri vagy időszakos, a felületen jelzett módon.',
    ],
  },
  {
    id: 'shipping',
    title: '16. Szállítás',
    subsections: [
      {
        title: 'Foxpost (demó)',
        bullets: [
          'Előre fizetett szállítás checkouton; címke generálás API-n.',
          'Eladó 5 munkanapon belül feladja — különben tranzakció megszűnhet (demó szabály).',
          'Nyomon követés a tranzakció státuszában.',
        ],
      },
      {
        title: 'Csomagolás',
        paragraphs: ['Az eladó felel a megfelelő csomagolásért. Sérült/elveszett csomag dispute alapján.'],
      },
    ],
  },
  {
    id: 'platform',
    title: '17. A platform tartalma',
    bullets: [
      'A ROBEO szellemi tulajdon (design, kód, védjegy) védett — engedély nélkül nem másolható.',
      'A platform „ahogy van” demó módban — karbantartás szünetek lehetségesek.',
    ],
  },
  {
    id: 'liability',
    title: '18. Felelősség',
    subsections: [
      {
        title: 'Te felelsz',
        bullets: [
          'Tartalmadért, hirdetéseidért, tranzakcióidból eredő vitákért.',
          'Adó- és bejelentési kötelezettségért (eladás jövedelme) — demóban is a te felelősséged tanácsadóval.',
        ],
      },
      {
        title: 'Mi',
        paragraphs: [
          'Közvetítői szolgáltatás — nem vagyunk eladó vagy vevő a tranzakcióban. Demó környezetben korlátozott felelősség. Stripe és Foxpost saját feltételei.',
        ],
      },
    ],
  },
  {
    id: 'disputes',
    title: '19. Viták',
    bullets: [
      'Először: ' + LEGAL_CONTACT.supportEmail,
      'Fogyasztó: panasz a NAIH-nál vagy békéltető testületnél.',
      'Irányadó jog: magyar jog (demó); illetékes bíróság: Budapest (demó megjelölés).',
      'EU ODR platform: ec.europa.eu/consumers/odr',
    ],
  },
  {
    id: 'misc',
    title: '20. Egyéb',
    bullets: [
      'Nincs partnerség vagy megbízási viszony.',
      'Részleges érvénytelenség: a többi rendelkezés érvényben marad.',
      'Átruházás: mi átruházhatjuk jogainkat 30 napos értesítéssel; te nem.',
      'Verzió: ' + TERMS_META.lastUpdated.replace(/-/g, '/'),
    ],
  },
];
