async function resolveLocation(query) {
  if (/^\d+$/.test(query)) return { type: 'stop', name: query };
  try {
    const url = `https://openservice-test.vrr.de/standard/XML_STOPFINDER_REQUEST?outputFormat=JSON&type_sf=any&name_sf=${encodeURIComponent(query)}&anyObjFilter_sf=0`;
    const sfRes = await fetch(url, { headers: { 'User-Agent': 'yRelay/1.0' }});
    const data = await sfRes.json();
    const pts = Array.isArray(data.stopFinder?.points?.point) ? data.stopFinder.points.point : [data.stopFinder?.points?.point].filter(Boolean);
    if (pts.length > 0) {
      const best = pts[0];
      if (best.type === 'stop' && best.stateless) return { type: 'stop', name: best.stateless };
      if (best.stateless) return { type: 'any', name: best.stateless };
      if (best.name) return { type: 'any', name: best.name + (best.city ? ', ' + best.city : '') };
    }
  } catch(e) { console.error(e) }
  return { type: 'any', name: query };
}

(async () => {
  console.log(await resolveLocation("Bochum Hauptstraße"));
})();
