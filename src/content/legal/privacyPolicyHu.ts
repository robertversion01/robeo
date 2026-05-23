import { DEMO_COMPANY, LEGAL_CONTACT, PRIVACY_LAST_UPDATED } from '@/lib/legalConstants';
import type { PrivacySection } from '@/content/legal/privacyPolicyTypes';

export const PRIVACY_META = {
  title: 'Adatvédelmi tájékoztató',
  lastUpdated: PRIVACY_LAST_UPDATED,
  demoNotice:
    'Ez a tájékoztató a ROBEO demó / teszt piactérhez készült. Éles üzemeltetés előtt jogi szakértővel érdemes véglegesíteni. A szöveg a GDPR átláthatósági elveit követi; nem minősül jogi tanácsadásnak.',
};

const STANDARD_RETENTION =
  'Aktív használat alatt, majd legfeljebb 5 évig az utolsó tevékenységtől — kivételek alább.';

export const PRIVACY_SECTIONS: PrivacySection[] = [
  {
    id: 'role',
    title: 'Az adataid védelmében játszott szerepünk',
    paragraphs: [
      `„Mi”, a ${DEMO_COMPANY.name} vagyunk a ROBEO piactér (webalkalmazás) mögött álló adatkezelő. Székhely: ${DEMO_COMPANY.address}.`,
      'Amikor a ROBEO szolgáltatásait használod — regisztráció, böngészés, eladás, vásárlás, üzenetküldés — mi járunk el adatkezelőként. Ez azt jelenti, hogy mi felelünk az adataid védelméért, és azért, hogy kezelésük megfeleljen az adatvédelmi törvényeknek (különösen az EU GDPR-nek).',
      'Az átláthatóság érdekében összefoglaljuk, milyen adatokat gyűjtünk, miért és hogyan használjuk, kivel osztjuk meg, meddig tároljuk, hogyan védjük, milyen választásaid vannak, és milyen jogaid illetnek meg.',
    ],
  },
  {
    id: 'data-collected',
    title: 'Milyen adatokat gyűjtünk?',
    paragraphs: [
      'Attól a pillanattól kezdve, hogy a ROBEO-val interakcióba lépsz — akár csak böngészel, akár regisztrálsz — bizonyos adatokat kezelünk.',
      '„Személyes adat” minden olyan információ, amely alapján azonosítható vagy, vagy hozzád mint természetes személyhez kapcsolható.',
      'Az általunk gyűjtött adatok mennyisége attól függ, hogyan használod a szolgáltatást.',
    ],
    subsections: [
      {
        id: 'data-provided',
        title: 'Az általad megadott adatok',
        paragraphs: [
          'Regisztrációkor, profilkitöltéskor, vásárláskor, eladáskor vagy ügyfélszolgálati megkereséskor megosztasz velünk adatokat. Csak azokat gyűjtjük, amelyek a tevékenységedhez szükségesek — ha nem vásárolsz/eladsz, nincs tranzakciós vagy szállítási adatunk.',
        ],
        bullets: [
          'Azonosító adatok: teljes név, felhasználónév (ha megadod).',
          'Kapcsolattartási adatok: e-mail cím, telefonszám, szállítási/számlázási cím (ha megadod).',
          'Fiókadatok: jelszó (titkosítva, hash-elve — mi nem látjuk), bejelentkezési munkamenet, fiókbeállítások, jogi elfogadások időpontja és verziója.',
          'Demográfiai adatok: nyelv, ország (ha megadod).',
          'Tevékenységi adatok: profil leírás (bio), profilkép, követések, értékelések, szabadság mód, feltöltött képek.',
          'Hirdetési adatok: termék neve, kategória, márka, méret, állapot, ár, fotók, leírás.',
          'Kommunikációs adatok: üzenetek más tagokkal, ajánlatok, dispute (vita) leírások, ügyfélszolgálati megkeresések.',
          'Pénzügyi adatok: ROBEO pénztárca egyenleg, tranzakciók — bankkártyaadatokat nem mi tároljuk (Stripe).',
          'Tranzakciós adatok: rendelések, fizetési státusz, számlák (demó bizonylatok), visszatérítések.',
          'Szállítási adatok: Foxpost csomagpont, címke adatok, nyomon követési azonosítók.',
          'Jogi adatok: ÁSZF/adatvédelem elfogadása, marketing hozzájárulás (opcionális), 18+ nyilatkozat.',
        ],
      },
      {
        id: 'data-automatic',
        title: 'Az általunk automatikusan gyűjtött adatok',
        bullets: [
          'Tevékenységi adatok: munkamenet időpontja, meglátogatott oldalak, keresési előzmények (localStorage / mentett keresések), használt funkciók.',
          'Helyadatok: IP-cím alapján hozzávetőleges régió (ország/város szint — pontos GPS-t nem gyűjtünk).',
          'Készülék- és műszaki adatok: böngésző típusa, operációs rendszer, képernyő felbontás, eszközazonosítók, naplóbejegyzések.',
          'Biztonsági adatok: gyanús bejelentkezések, rate limit események, moderációs jelentések.',
          'Sütik és localStorage: szükséges munkamenet, cookie hozzájárulás, mentett keresések, értesítési beállítások — lásd cookie banner.',
        ],
      },
      {
        id: 'data-third-party',
        title: 'Más forrásokból származó adatok',
        bullets: [
          'Fizetési partner (Stripe): tranzakció státusz, Connect onboarding állapot, csalásriasztások — a kártyaadatokat a Stripe kezeli.',
          'Szállítópartner (Foxpost): csomag státusz, nyomon követés.',
          'Más ROBEO-tagok: rólad írt értékelések, jelentések.',
          'Demó környezetben: teszt scriptek által létrehozott mintaadatok — éles adatot ne adj meg.',
        ],
        paragraphs: [
          'A ROBEO jelenleg e-mail/jelszó alapú regisztrációt használ; nincs Google/Facebook/Apple bejelentkezés a demóban.',
        ],
      },
    ],
  },
  {
    id: 'data-use',
    title: 'Hogyan használjuk az adatokat?',
    paragraphs: [
      'Az adataidat kizárólag meghatározott, jogszerű célokra használjuk. Az alábbiakban a fő célcsoportokat és részleteket találod.',
    ],
    subsections: [
      {
        id: 'use-operate-intro',
        title: 'Működtetjük a ROBEO-t és elérhetővé tesszük a számodra',
        paragraphs: [
          'Segítünk regisztrálni, bejelentkezni, termékeket böngészni, eladni, vásárolni, fizetni, szállítani és ügyfélszolgálathoz fordulni.',
        ],
      },
      {
        id: 'use-browse',
        title: 'Így böngészhetsz a ROBEO-n',
        why: 'Alapvető működés: nyelv, ország, munkamenet, cookie-k.',
        dataCategories: ['Helyadatok', 'tevékenységi adatok', 'készülékadatok'],
        legalBasis: 'Jogos érdek — a platform használhatósága.',
        retention: 'Cookie/sütik élettartama szerint, vagy munkamenet végéig.',
      },
      {
        id: 'use-account',
        title: 'Így hozod létre és használod a fiókodat',
        why: 'Regisztráció, bejelentkezés, profil, jogi elfogadások, e-mail megerősítés (ha be van kapcsolva).',
        dataCategories: ['Azonosító', 'kapcsolattartási', 'fiók', 'jogi adatok'],
        legalBasis: 'Szerződés teljesítése (ÁSZF); opcionális profiladatoknál hozzájárulás.',
        retention: STANDARD_RETENTION,
      },
      {
        id: 'use-trade',
        title: 'Így vásárolhatsz és adhatsz el',
        why: 'Hirdetés, ajánlat, chat, checkout, értékelés, kiemelés (promote), dispute.',
        dataCategories: ['Hirdetési', 'kommunikációs', 'tranzakciós', 'tevékenységi adatok'],
        legalBasis: 'Szerződés teljesítése.',
        retention:
          'Hirdetés metaadat: aktív státusz alatt; törölt hirdetés fotói demóban rövidebb ideig. Üzenetek: aktív tranzakció alatt és utána korlátozott ideig.',
      },
      {
        id: 'use-pay',
        title: 'Így fizethetsz és kaphatsz fizetést',
        why: 'Stripe checkout, pénztárca, eladói kifizetés (Connect), visszatérítés.',
        dataCategories: ['Pénzügyi', 'tranzakciós', 'azonosító adatok'],
        legalBasis: 'Szerződés teljesítése; mentett kártya esetén hozzájárulás.',
        retention:
          'Tranzakciós naplók: számviteli kötelezettség szerint (demó: rövidebb). Kártyaadat: kizárólag Stripe-nál.',
        paragraphs: [
          'A fizetéseket a Stripe bonyolítja (teszt mód: sk_test_…). A ROBEO nem tárol teljes bankkártyaszámot.',
        ],
      },
      {
        id: 'use-ship',
        title: 'Így küldhetsz és fogadhatsz csomagokat',
        why: 'Foxpost címke generálás, átvételi pont, nyomon követés.',
        dataCategories: ['Szállítási', 'kapcsolattartási', 'azonosító adatok'],
        legalBasis: 'Szerződés teljesítése.',
        retention: 'Szállítási adatok: a szállítás lezárásától számított korlátozott ideig (demó: max. 6 hónap).',
        paragraphs: [
          'Vásárláskor/eladáskor a másik fél a tranzakció teljesítéséhez szükséges adatokat lát (pl. név, csomagpont).',
        ],
      },
      {
        id: 'use-personalize',
        title: 'Így kapcsolhatsz be személyesebb élményt',
        why: 'Mentett keresések, kategória feed, követések, méret/márka preferenciák, push értesítések.',
        dataCategories: ['Fiók', 'tevékenységi', 'keresési adatok'],
        legalBasis: 'Szerződés vagy hozzájárulás (értesítések, push).',
        retention: STANDARD_RETENTION,
      },
      {
        id: 'use-support',
        title: 'Így kérhetsz segítséget',
        why: 'Ügyfélszolgálat, dispute, jelentés (report), GDPR kérelem.',
        dataCategories: ['Kommunikációs', 'fiók', 'tranzakciós adatok — a kérelem típusától függően'],
        legalBasis: 'Szerződés vagy jogos érdek (nem regisztrált megkeresés).',
        retention: 'Általános ügyfélszolgálat: 2 év; adatvédelmi kérelem: 3 év.',
      },
      {
        id: 'use-security-intro',
        title: 'A te biztonságod és a ROBEO biztonsága',
        paragraphs: ['Csalásmegelőzés, fiókvédelem, fizetésbiztonság, szabályok betartatása.'],
      },
      {
        id: 'use-platform-safety',
        title: 'Így marad biztonságos a platform',
        why: 'Spam, visszaélés, DDoS védelem, moderáció.',
        dataCategories: ['Tevékenységi', 'biztonsági', 'készülékadatok'],
        legalBasis: 'Jogos érdek és szerződés (ÁSZF).',
        retention: 'Biztonsági naplók: korlátozott ideig (demó: max. 6 hónap).',
      },
      {
        id: 'use-account-safety',
        title: 'Így védve van a fiókod',
        why: 'Bejelentkezés ellenőrzés, gyanús aktivitás, ideiglenes korlátozás, fiók helyreállítás.',
        dataCategories: ['Fiók', 'kapcsolattartási', 'biztonsági adatok'],
        legalBasis: 'Jogos érdek.',
        retention: STANDARD_RETENTION,
      },
      {
        id: 'use-payment-safety',
        title: 'Így biztonságosak a fizetések',
        why: 'Stripe csalásfilter, chargeback védelem, tranzakció ellenőrzés.',
        dataCategories: ['Pénzügyi', 'tranzakciós', 'biztonsági adatok'],
        legalBasis: 'Szerződés és jogos érdek.',
        retention: 'Fizetési viták esetén: a vitaidőszak + 13 hónap (ahol alkalmazható).',
      },
      {
        id: 'use-terms-enforce',
        title: 'Így tartjuk be az ÁSZF-et és a törvényt',
        why: 'Tiltott termék, jelentés, fiók felfüggesztés, viták.',
        dataCategories: ['Fiók', 'hirdetési', 'kommunikációs', 'biztonsági adatok'],
        legalBasis: 'Szerződés és jogos érdek.',
        retention: 'Moderációs ügy: az ügy lezárásáig + archiválás (demó: rövidebb).',
        paragraphs: [
          'Automatizált ellenőrzések (pl. rate limit, ismert minták) emberi felülvizsgálattal kombinálva. Vitás döntés esetén kapcsolatfelvétel lehetséges.',
        ],
      },
      {
        id: 'use-improve-intro',
        title: 'A ROBEO-élmény javítása',
        paragraphs: ['Elemzés, hibajavítás, teljesítmény, visszajelzés — anonim/aggregált formában, ahol lehetséges.'],
      },
      {
        id: 'use-analytics',
        title: 'Így elemezzük és javítjuk a platformot',
        why: 'Oldalhasználat, hibák, teljesítmény — csak analitikai cookie hozzájárulás esetén (nem szükséges sütik).',
        dataCategories: ['Tevékenységi', 'készülékadatok'],
        legalBasis: 'Hozzájárulás (analitika cookie) vagy jogos érdek (technikai napló).',
        retention: STANDARD_RETENTION,
      },
      {
        id: 'use-ai-local',
        title: 'Így működik a helyi AI javaslat feltöltéskor',
        why: 'Opcionális kategória/cím javaslat a feltöltött fotó alapján — fejlesztői gépen futó Ollama (localhost:11434, llama3).',
        dataCategories: ['Feltöltött termékfotó', 'generált javaslat szöveg'],
        legalBasis: 'Jogos érdek / szerződés (feltöltés funkció).',
        retention: 'A fotó a Storage-ban marad; az AI kérés nem kerül külső fizetős API-hoz.',
        paragraphs: [
          'Az MI feldolgozás helyi — nem OpenAI/Anthropic. Ha az Ollama nem fut, a javaslat funkció nem érhető el.',
        ],
      },
      {
        id: 'use-marketing-intro',
        title: 'Marketing célokra',
        paragraphs: ['Csak külön hozzájárulással — regisztrációkor vagy cookie bannerben.'],
      },
      {
        id: 'use-marketing-email',
        title: 'Így kaphatsz híreket és ajánlatokat',
        why: 'Hírlevél, promóció, új funkció — ha bepipáltad a marketing hozzájárulást.',
        dataCategories: ['Kapcsolattartási', 'fiók', 'tevékenységi adatok'],
        legalBasis: 'Hozzájárulás — bármikor visszavonható.',
        retention: 'Amíg vissza nem vonod, vagy töröljük a fiókot.',
      },
      {
        id: 'use-legal-intro',
        title: 'Törvényes célokra',
        paragraphs: ['Adó, számvitel, fogyasztóvédelem, hatósági megkeresés, jogi igények.'],
      },
      {
        id: 'use-legal-compliance',
        title: 'Így felelünk meg a törvénynek',
        why: 'Számlázás, archiválás, DAC7-szerű jelentés élesben, hatósági megkeresés.',
        dataCategories: ['Az adatgyűjtés szakaszában felsorolt releváns kategóriák'],
        legalBasis: 'Jogi kötelezettség.',
        retention: 'Törvény által előírt ideig (pl. számvitel: akár 8–10 év élesben).',
      },
      {
        id: 'use-legal-rights',
        title: 'Így védhetjük jogainkat',
        why: 'Vita, panasz, chargeback, peres eljárás.',
        dataCategories: ['Tranzakciós', 'kommunikációs', 'pénzügyi adatok'],
        legalBasis: 'Jogos érdek.',
        retention: 'A jogi ügy rendezéséig + legfeljebb 5 év.',
      },
    ],
  },
  {
    id: 'sharing',
    title: 'Kivel osztjuk meg az adataidat?',
    paragraphs: [
      'Az adataidat nem adjuk el. Csak a szolgáltatás működéséhez szükséges címzettekkel osztjuk meg:',
    ],
    subsections: [
      {
        id: 'share-users',
        title: 'Más ROBEO-tagok',
        bullets: [
          'Nyilvános profil, hirdetések, értékelések — amit közzétesz.',
          'Tranzakció során: név, csomagpont/cím a teljesítéshez.',
          'Üzenetek és ajánlatok a másik fél számára.',
        ],
        paragraphs: [
          'Ellenőrizd a termékfotókat — ne jelenjen meg rajtuk olyan részlet, amit nem szeretnél megosztani.',
        ],
      },
      {
        id: 'share-providers',
        title: 'Szolgáltatók és partnerek',
        bullets: [
          'Supabase: adatbázis, auth, fájltárolás (EU-kompatibilis régió).',
          'Stripe: fizetés, Connect kifizetés.',
          'Foxpost: szállítás, címke.',
          'Web push (VAPID): ha engedélyezed az értesítéseket.',
        ],
        paragraphs: [
          'EGT-n kívüli továbbítás esetén megfelelő garanciák (pl. SCC) szükségesek — éles üzemben dokumentáljuk.',
        ],
      },
      {
        id: 'share-authorities',
        title: 'Hatóságok',
        paragraphs: [
          'Csak ha törvény kötelez, vagy jogi igény érvényesítéséhez szükséges. Kérés előtt ellenőrizzük a jogalapot.',
        ],
      },
      {
        id: 'share-other',
        title: 'Egyéb címzettek',
        paragraphs: [
          'Ha ehhez hozzájárulsz, vagy adathordozhatóságot kérsz más platform felé.',
        ],
      },
    ],
  },
  {
    id: 'retention',
    title: 'Mennyi ideig tároljuk az adataidat?',
    paragraphs: [
      'Az adataidat csak a fenti célokhoz szükséges ideig tároljuk. Ha már nincs rájuk szükség, töröljük vagy anonimizáljuk.',
      'Aktív használat alatt, majd legfeljebb 5 évig az utolsó tevékenységtől — kivételek alább.',
      'Fiók anonimizálás/törlés után a profil adatok eltávolításra kerülnek; tranzakciós bizonylatok anonimizált formában megmaradhatnak.',
    ],
    subsections: [
      {
        id: 'retention-exceptions',
        title: 'Kivételek a szokásos megőrzési idő alól',
        bullets: [
          'Ügyfélszolgálat: 2 év (általános), 3 év (adatvédelmi kérelem).',
          'Tranzakciók: fizetési viták miatt 13 hónap; számviteli kötelezettség szerint hosszabb élesben.',
          'Demó reset: `npm run reset:test-env` törölhet felhasználói tartalmat — ne tárolj éles adatot.',
          'Mentett keresés / localStorage: eszközön, amíg te nem törlöd.',
        ],
      },
    ],
  },
  {
    id: 'security',
    title: 'Hogyan védjük az adataidat?',
    paragraphs: [
      'Adatvédelmi törvények betartása és biztonsági intézkedések a személyes adatok védelmére.',
    ],
    subsections: [
      {
        id: 'security-technical',
        title: 'Technikai védelmek',
        bullets: [
          'HTTPS titkosítás, Supabase RLS (sor-szintű hozzáférés), jelszó hash, Storage hozzáférés-szabályok.',
          'Rendszeres függőség-frissítés, naplózás.',
        ],
      },
      {
        id: 'security-organizational',
        title: 'Szervezeti eszközök',
        bullets: [
          'Demó környezet: korlátozott hozzáférés, teszt adatok.',
          'Élesben: adatvédelmi felelős kijelölése ajánlott.',
        ],
      },
      {
        id: 'security-user',
        title: 'A te szereped',
        bullets: [
          'Erős, egyedi jelszó; ne oszd meg a bejelentkezési adataidat.',
          'Gyanús üzenet/tranzakció esetén jelezd: ' + LEGAL_CONTACT.privacyEmail,
        ],
      },
    ],
  },
  {
    id: 'choices',
    title: 'A te választásaid',
    subsections: [
      {
        id: 'choices-share',
        title: 'Kiválaszthatod, mit osztasz meg',
        bullets: [
          'Profil, hirdetés, üzenet — rajtad múlik.',
          'Bizonyos adatok kötelezőek a tranzakcióhoz (pl. csomagpont).',
          'Törvény vagy szerződés miatt egyes adatok megadása elvárt (pl. számlázás élesben).',
        ],
      },
      {
        id: 'choices-consent',
        title: 'Hozzájárulás',
        paragraphs: [
          'Marketing e-mail és analitikai cookie csak hozzájárulással. Visszavonás: profil beállítások vagy e-mail.',
        ],
      },
      {
        id: 'choices-cookies',
        title: 'Cookie-k',
        paragraphs: [
          'A cookie bannerben választhatsz: szükséges (mindig), analitika, marketing. Beállítás: oldal alján / banner újranyitása.',
        ],
      },
    ],
  },
  {
    id: 'rights',
    title: 'A jogaid',
    paragraphs: [
      'A GDPR számos jogot biztosít. Kivételek és korlátozások alkalmazhatók. Kérés előtt azonosítást kérhetünk.',
      'Demóban: Profil → Beállítások → Adatvédelem — JSON export és fiók anonimizálás.',
    ],
    subsections: [
      {
        id: 'right-access',
        title: 'Hozzáférés',
        paragraphs: ['Kérdezheted, milyen adatot tárolunk, és másolatot kérhetsz.'],
      },
      {
        id: 'right-rectify',
        title: 'Helyesbítés',
        paragraphs: ['Helytelen adat javítása a profilban vagy kapcsolatfelvétellel.'],
      },
      {
        id: 'right-delete',
        title: 'Törlés',
        paragraphs: [
          'Fiók anonimizálás a beállításokban. Nem minden adat törölhető azonnal (jogi megőrzés).',
        ],
      },
      {
        id: 'right-restrict',
        title: 'Korlátozás',
        paragraphs: ['Kérheted az adatkezelés felfüggesztését bizonyos esetekben.'],
      },
      {
        id: 'right-portability',
        title: 'Adathordozhatóság',
        paragraphs: ['JSON export a profilban — géppel olvasható formátum.'],
      },
      {
        id: 'right-object',
        title: 'Tiltakozás',
        paragraphs: ['Jogos érdeken alapuló kezelés ellen; marketing ellen kivétel nélkül.'],
      },
      {
        id: 'right-withdraw',
        title: 'Hozzájárulás visszavonása',
        paragraphs: ['Bármikor, a visszavonás előtti kezelés jogszerűségét nem érinti.'],
      },
      {
        id: 'right-automated',
        title: 'Automatizált döntések',
        paragraphs: [
          'Jogod van emberi felülvizsgálatot kérni, ha automatizált döntés jelentős hatással járna rád (pl. fiók korlátozás).',
        ],
      },
      {
        id: 'right-complaint',
        title: 'Panasz a hatóságnál',
        paragraphs: [
          'NAIH — Nemzeti Adatvédelmi és Információszabadság Hatóság: naih.hu, 1055 Budapest, Falk Miksa utca 9-11.',
        ],
      },
    ],
  },
  {
    id: 'contact',
    title: 'Kapcsolatfelvétel',
    paragraphs: [
      `Adatvédelmi kérdések, joggyakorlás: ${LEGAL_CONTACT.privacyEmail}`,
      `Általános ügyfélszolgálat (demó): ${LEGAL_CONTACT.supportEmail}`,
      `Postai cím: ${DEMO_COMPANY.name}, ${DEMO_COMPANY.address}`,
      'Jelezd, ha üzeneted adatvédelmi tisztviselőnek szól — demóban ugyanaz az elérhetőség.',
      'Ezt az oldalt időnként frissítjük. Jelentős változás esetén értesítünk (e-mail vagy a platformon).',
    ],
  },
];
