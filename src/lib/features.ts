/**
 * Robeo feature flags — build-time, env-vezérelt.
 *
 * RobeoBP (Budapest Beta) mód:
 *   - NEXT_PUBLIC_ROBEO_MODE=bp    → bekapcsol
 *   - Bármi más / hiányzik         → V1 marketplace teljes funkcionalitással
 *
 * Az érték a build idejében inline-olódik (NEXT_PUBLIC_*), tehát biztonságosan
 * használható szerver- és kliens-oldali komponensekben egyaránt. SOHA ne
 * használj olyan flaget, ami a runtime-on változik — az SSR mismatch-et okozna.
 *
 * Cél: a V1 kód (Stripe, wallet, Foxpost, Packeta) teljes egészében
 * érintetlenül marad. A BP mód csak _bypass_-okat aktivál:
 *   - lokális átvétel (Személyes átvétel) kizárólagos szállítási mód,
 *   - készpénzes / direct P2P fizetés a chatben (nincs Stripe/wallet hívás),
 *   - kötelező Budapest kerület mező termékfeltöltésnél és szűrésnél.
 */

const RAW_MODE = (process.env.NEXT_PUBLIC_ROBEO_MODE || '').trim().toLowerCase();

export const ROBEO_BP_MODE = RAW_MODE === 'bp';

/** True, ha a build a RobeoBP (Budapest Beta) változat. */
export function isBudapestBeta(): boolean {
  return ROBEO_BP_MODE;
}

/** Marketing címke a UI banner / footer / debug overlay számára. */
export const ROBEO_BP_LABEL = 'Budapest Béta';

/** Egységes státusz a lokális átvételes tranzakciókhoz. */
export const LOCAL_PICKUP_STATUS = 'local_pickup_pending';

/** Egységes fizetési csatorna címke (transactions.payment_provider). */
export const LOCAL_PICKUP_PAYMENT_PROVIDER = 'local_cash';

/** Egységes shipping_method érték a lokális átvételhez. */
export const LOCAL_PICKUP_SHIPPING_METHOD = 'local_pickup';
