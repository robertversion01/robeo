import {
  DEMO_COMPANY,
  LEGAL_CONTACT,
  PAY_FEES_URL,
  PAY_TERMS_VERSION,
} from '@/lib/legalConstants';
import type { PrivacySection } from '@/content/legal/privacyPolicyTypes';

export const PAY_TERMS_META = {
  title: 'ROBEO Pay — Általános szerződési feltételek',
  version: PAY_TERMS_VERSION,
  demoNotice:
    'DEMO / TESZT: A ROBEO belső pénztárcája és fizetési folyamatai nem minősülnek éles, engedélyköteles pénzügyi szolgáltatásnak. Éles indulás előtt jogi és PSD2/EMI megfelelőségi tanácsadás szükséges.',
};

export const PAY_TERMS_SECTIONS: PrivacySection[] = [
  {
    id: 'about',
    title: '1. Rólad és rólunk',
    paragraphs: [
      `Bemutatkozás. A ROBEO Pay a ${DEMO_COMPANY.name} által üzemeltetett fizetési és pénztárca szolgáltatás neve a ROBEO piactéren (webalkalmazás). Székhely: ${DEMO_COMPANY.address}.`,
      'A ROBEO piactér ÁSZF-je szabályozza a hirdetéseket, vásárlást és eladást; a jelen dokumentum kizárólag a pénztárcára, a checkout fizetésre és az eladói kifizetésre vonatkozik.',
      'Fontos: a demó környezetben a ROBEO Pay nem minősül elektronikuspénz-kibocsátónak (EMI) vagy banknak. Belső egyenleg-nyilvántartást, Stripe fizetésfeldolgozást és Stripe Connect kifizetést használunk.',
    ],
    subsections: [
      {
        title: 'Ki használhatja?',
        bullets: [
          'Természetes személy, legalább 18 éves.',
          'ROBEO regisztrált felhasználó, személyes (nem üzleti) célra — kivéve, ha külön Pro/eladói flow-ban másként jelezzük.',
          'A piactér ÁSZF-jének elfogadása.',
        ],
      },
      {
        title: 'Felügyelet (demó)',
        paragraphs: [
          'Éles, szabályozott fizetési szolgáltatás esetén a vonatkozó magyar/EU pénzügyi felügyeleti előírások érvényesek. A jelen demó tesztrendszert Stripe teszt módban futtat.',
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
          'A jelen ROBEO Pay ÁSZF a te és a ROBEO közötti megállapodás a pénztárca és fizetési szolgáltatások használatára. A piactér ÁSZF-je és adatvédelmi tájékoztatója külön dokumentum.',
        ],
      },
      {
        title: 'Elfogadás',
        bullets: [
          'Első eladás, első pénztárca-használat, checkout wallet fizetés vagy Stripe Connect onboarding előtt el kell olvasnod és el kell fogadnod a feltételeket.',
          'Az elfogadást a felületen pipált checkbox vagy a fizetés/pénztárca funkció használata jelenti (ahol azt külön jelezzük).',
        ],
      },
      {
        title: 'Módosítás',
        paragraphs: [
          'A feltételeket módosíthatjuk jogszabályi vagy szolgáltatásváltozás miatt. Jelentős módosításról e-mailben vagy a platformon értesítünk. Ha nem értesz egyet, a módosítás hatálya előtt lemondhatod a pénztárca használatát.',
        ],
      },
      {
        title: 'Díjak',
        paragraphs: [
          `A szolgáltatási díjak a piactér checkoutján és az eladói oldalon jelennek meg (vevővédelmi díj, szállítás, kiemelés). Stripe díjakat a Stripe szabályzata szerint a teszt/éles mód határozza meg. Részletek: ${PAY_FEES_URL}.`,
        ],
      },
    ],
  },
  {
    id: 'communication',
    title: '3. Hogyan kommunikálunk?',
    bullets: [
      'Elsősorban a platformon (értesítések, üzenetek, profil).',
      'E-mail a regisztrált címedre fontos fizetési és biztonsági ügyekben.',
      'Kapcsolat: ' + LEGAL_CONTACT.supportEmail + ' · adatvédelem: ' + LEGAL_CONTACT.privacyEmail,
    ],
  },
  {
    id: 'services',
    title: '4. Szolgáltatásaink áttekintése',
    subsections: [
      {
        title: 'ROBEO pénztárca',
        paragraphs: [
          'Belső egyenleg (HUF): eladásból származó összegek pending (függőben) majd available (felhasználható) státuszban. Vásárláskor wallet-ből terhelhető, ha van fedezet.',
        ],
      },
      {
        title: 'Fizetések',
        bullets: [
          'Vásárlás más felhasználótól a piactéren (wallet + Stripe kártya kombináció).',
          'Piactér díjak levonása tranzakciókor.',
          'Eladói kifizetés bankszámlára Stripe Connect cashout-tal (onboarding után).',
        ],
      },
      {
        title: 'Információk',
        bullets: [
          'Egyenleg a profil → Pénztárca menüpontban.',
          'Tranzakció- és wallet-előzmények a profilban.',
          'Demó számlák — nem adóügyi bizonylatok.',
        ],
      },
      {
        title: 'Nem bank, nem kamat',
        paragraphs: [
          'A pénztárca egyenlege nem bankbetét, nem kamatozik, és demó módban nincs állami betétbiztosítás alatt. Az összegek a platform szabályai szerint pending/available státuszban kezelődnek.',
        ],
      },
    ],
  },
  {
    id: 'getting-started',
    title: '5. Hogyan kezdjük?',
    subsections: [
      {
        title: 'Előfeltételek',
        bullets: [
          'Érvényes ROBEO fiók, e-mail megerősítés (ha be van kapcsolva).',
          'Piactér ÁSZF + adatvédelem elfogadva.',
          'ROBEO Pay ÁSZF elfogadva pénztárca/fizetés használata előtt.',
        ],
      },
      {
        title: 'Azonosítás (KYC)',
        paragraphs: [
          'Bankszámlára kifizetéshez Stripe Connect onboarding szükséges — a Stripe az EU szabályok szerint kérhet személyazonosító adatokat. Ezeket a Stripe kezeli adatkezelőként; mi csak a státuszt látjuk (onboarded / pending).',
        ],
      },
      {
        title: 'Pontos adatok',
        paragraphs: [
          'Te felelsz az általad megadott adatok helyességéért. Helytelen adat a fiók vagy kifizetés korlátozását vonhatja maga után.',
        ],
      },
    ],
  },
  {
    id: 'wallet',
    title: '6. A pénztárca megnyitása és használata',
    subsections: [
      {
        title: 'Egy pénztárca / felhasználó',
        paragraphs: ['Felhasználónként egy ROBEO pénztárca engedélyezett.'],
      },
      {
        title: 'Elutasítás / korlátozás',
        bullets: [
          '18 év alatt, csalás gyanú, ÁSZF megsértés, hiányzó KYC Connect esetén kifizetés blokkolható.',
          'Indokot adunk, ha törvény nem tiltja.',
        ],
      },
      {
        title: 'Egyenleg keletkezése',
        paragraphs: [
          'Eladásból: a vevő fizetése után az összeg pending egyenlegre kerül; teljesítés (szállítás, dispute ablak) után available-re mozog.',
          'Külső bankból közvetlen feltöltés demóban nincs — csak eladás vagy visszatérítés.',
        ],
      },
      {
        title: 'Letét / vevővédelem',
        paragraphs: [
          'A vevő fizetése a tranzakció lezárásáig védett folyamatban van; vitás esetben a piactér szabályai szerint visszatérítés kezdeményezhető.',
        ],
      },
      {
        title: 'Kifizetés bankszámlára',
        paragraphs: [
          'Stripe Connect cashout: elérhető egyenleg kifizetése a onboardingolt bankszámlára. Minimum összeg és Stripe díjak alkalmazhatók.',
        ],
      },
    ],
  },
  {
    id: 'payments',
    title: '7. Fizetések a nevedben',
    subsections: [
      {
        title: 'Fizetési megbízás',
        paragraphs: [
          'Checkout „Fizetés” gomb / wallet-pay API hívás = megbízás a terhelésre. Visszavonás a gomb megnyomása előtt lehetséges.',
        ],
      },
      {
        title: 'Teljesítési idő',
        bullets: [
          'Wallet terhelés: azonnali, ha van fedezet.',
          'Stripe kártya: a Stripe feldolgozási ideje szerint (teszt: azonnali).',
          'Eladói pending jóváírás: tranzakció létrejöttekor.',
          'Cashout: Stripe Connect ütemezés szerint (demó: teszt payout).',
        ],
      },
      {
        title: 'Elutasítás oka lehet',
        bullets: [
          'Nincs elegendő fedezet.',
          'Hiányzó szállítási adat vagy ÁSZF elfogadás checkouton.',
          'Gyanús/csalság szűrés, rate limit.',
          'Stripe vagy jogszabályi akadály.',
        ],
      },
    ],
  },
  {
    id: 'errors',
    title: '8. Hibák a pénztárcával vagy fizetéssel',
    subsections: [
      {
        title: 'Téves jóváírás',
        paragraphs: [
          'Ha tévesen kaptál összeget, értesíts minket — jogosultak vagyunk javító terhelést alkalmazni.',
        ],
      },
      {
        title: 'Jogosulatlan tranzakció',
        paragraphs: [
          'Gyanús tétel esetén haladéktalanul jelezd (13 hónapon belül, ahogy a PSD2 fogyasztóvédelem előírja éles kártyás fizetésnél). Demóban: profil → támogatás / e-mail.',
        ],
      },
      {
        title: 'Biztonság',
        paragraphs: [
          'Védd a jelszavad és eszközöd. Ha illetéktelen hozzáférést gyanítasz, változtass jelszót és írj nekünk.',
        ],
      },
    ],
  },
  {
    id: 'other-services',
    title: '9. Egyéb szolgáltatások',
    paragraphs: [
      'Jövőbeli promóciók, wallet-topup vagy új fizetési mód külön szabályzattal jelenhet meg. Értesítünk, mielőtt igénybe veszed.',
    ],
  },
  {
    id: 'liability',
    title: '10. Felelősség',
    subsections: [
      {
        title: 'A te kötelezettségeid',
        bullets: [
          'Biztonságos jelszó, eszközvédelem.',
          'Ne oszd meg a fiókodat.',
          'Gyanús e-mailekre ne adj meg adatot — csak a hivatalos ROBEO domain.',
        ],
      },
      {
        title: 'Korlátozás',
        paragraphs: [
          'Demó környezetben a szolgáltatás „ahogy van” alapon fut. Nem vállalunk felelősséget éles üzleti használatból eredő kárért. A Stripe és Foxpost saját feltételei vonatkoznak rájuk eső részekre.',
        ],
      },
    ],
  },
  {
    id: 'complaints',
    title: '11. Panaszkezelés',
    paragraphs: [
      'Panasz: ' + LEGAL_CONTACT.supportEmail + ' — 15 munkanapon belül válaszolunk, összetett ügyben 35 munkanap.',
      'Fogyasztóként panaszt tehetsz a NAIH-nál (adatvédelem) vagy a Pénzügyi Békélő Testületnél / MNB-nél éles, szabályozott pénzügyi szolgáltatás esetén.',
      'Demó fizetés: elsősorban műszaki support csatornán.',
    ],
  },
  {
    id: 'closing',
    title: '12. A pénztárca bezárása',
    bullets: [
      'Kérheted a fiók anonimizálását a profil adatvédelmi beállításaiban — elérhető egyenleg kifizetése vagy felhasználása előtt.',
      'Függő tranzakció vagy vita esetén a bezárás elhalasztható.',
      'Inaktív, nulla egyenlegű demó pénztárca törölhető maintenance során.',
    ],
  },
  {
    id: 'misc',
    title: '13. Egyéb',
    bullets: [
      'Szolgáltatási szünet karbantartás miatt — előre értesítés, ha lehetséges.',
      'Tiltott: pénzmosás, csalás, több pénztárca, wallet visszaélés checkout megkerülésére.',
      'Irányadó jog: magyar jog (demó); illetékes bíróság: Budapest (demó megjelölés).',
      'Részleges érvénytelenség: a többi rendelkezés érvényben marad.',
    ],
  },
];
