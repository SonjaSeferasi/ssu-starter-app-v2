const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
const countries = require('../../public/world-explorer/data/countries.json');
const release = 'v7.3.2';
const base = `https://raw.githubusercontent.com/lipis/flag-icons/${release}`;
const destination = path.resolve(__dirname, '../../public/world-explorer/flags');

function validateSvg(source) {
  if (!/<svg\b/.test(source) || !/<\/svg>\s*$/.test(source)) throw new Error('Expected a complete SVG');
  if (/<(?:script|foreignObject|image|iframe|object|embed)\b|<!DOCTYPE|<!ENTITY|\bon\w+\s*=/i.test(source)) throw new Error('Active SVG content is prohibited');
  for (const reference of source.matchAll(/(?:\b(?:xlink:)?href\s*=\s*['"]([^'"]*)['"]|\burl\(\s*['"]?([^)'"\s]+))/gi)) {
    if (!(reference[1] || reference[2]).startsWith('#')) throw new Error('SVG references must stay inside the document');
  }
}
async function text(url) {
  const result = await fetch(url,{signal:AbortSignal.timeout(20000)});
  if (!result.ok) throw new Error(`${result.status} at ${url}`);
  return result.text();
}
async function main() {
  await fs.mkdir(destination,{recursive:true});
  const queue=[...countries], manifest=[];
  await Promise.all(Array.from({length:8},async()=>{
    while (queue.length) {
      const country=queue.shift();
      if (!/^[A-Z]{2}$/.test(country.iso2)) throw new Error('Invalid catalog ISO code');
      // Switzerland's national flag is square; other entries use the library's
      // standardized 4:3 presentation. Nepal keeps the transparent twin pennant.
      const folder=country.iso2==='CH'?'1x1':'4x3';
      const url=`${base}/flags/${folder}/${country.iso2.toLowerCase()}.svg`;
      const svg=await text(url);validateSvg(svg);
      await fs.writeFile(path.join(destination,country.iso2.toLowerCase()+'.svg'),svg);
      manifest.push({code:country.code,iso2:country.iso2,source:url,sha256:crypto.createHash('sha256').update(svg).digest('hex')});
    }
  }));
  const license=await text(`${base}/LICENSE`);
  if (!license.includes('MIT License') || !license.includes('Panayiotis Lipiridis')) throw new Error('Expected the flag-icons MIT notice');
  await fs.writeFile(path.join(destination,'LICENSE.txt'),license);
  await fs.writeFile(path.join(destination,'manifest.json'),JSON.stringify({release,downloaded:'2026-10-27',flags:manifest.sort((a,b)=>a.code.localeCompare(b.code))},null,2)+'\n');
  console.log(`Imported ${manifest.length} local flags from flag-icons ${release}.`);
}
main().catch(error=>{console.error(error);process.exitCode=1;});
