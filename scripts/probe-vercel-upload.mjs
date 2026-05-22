const BASE = process.env.TEST_BASE_URL || 'https://robeo.vercel.app';

async function main() {
  const routes = [
    ['GET', '/upload'],
    ['POST', '/api/upload/product-image'],
    ['GET', '/api/upload/product-image'],
  ];

  for (const [method, path] of routes) {
    const res = await fetch(BASE + path, { method });
    const ct = res.headers.get('content-type') || '';
    const text = await res.text();
    console.log(`${method} ${path} → ${res.status} ${ct.split(';')[0]}`);
    console.log('  body:', text.slice(0, 100).replace(/\s+/g, ' '));
  }

  const html = await (await fetch(BASE + '/upload')).text();
  const scripts = [...html.matchAll(/src="(\/_next\/static\/chunks\/[^"]+)"/g)].map((m) => m[1]);
  console.log('\nScript chunks on /upload:', scripts.length);

  let foundOld = false;
  let foundNew = false;
  let foundApiRef = false;
  let foundDraft = false;
  for (const src of scripts) {
    const js = await (await fetch(BASE + src)).text();
    if (js.includes('readAsDataURL')) foundOld = true;
    if (js.includes('createObjectURL')) foundNew = true;
    if (js.includes('product-image')) foundApiRef = true;
    if (js.includes('robeo_upload_draft')) foundDraft = true;
  }
  console.log('Deployed bundle has readAsDataURL (OLD):', foundOld);
  console.log('Deployed bundle has createObjectURL (NEW preview):', foundNew);
  console.log('Deployed bundle references product-image API:', foundApiRef);
  console.log('Deployed bundle has upload draft key:', foundDraft);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
