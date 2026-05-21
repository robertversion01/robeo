/**
 * VAPID kulcspár generálása Web Push-hoz.
 * Futtatás: node scripts/generate-vapid-keys.mjs
 */
import webpush from 'web-push';

const keys = webpush.generateVAPIDKeys();
console.log('Add to .env.local and Vercel:\n');
console.log(`NEXT_PUBLIC_VAPID_PUBLIC_KEY=${keys.publicKey}`);
console.log(`VAPID_PUBLIC_KEY=${keys.publicKey}`);
console.log(`VAPID_PRIVATE_KEY=${keys.privateKey}`);
console.log('VAPID_SUBJECT=mailto:notify@robeo.vercel.app');
