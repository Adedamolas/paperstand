import { rng } from './compose/kit';

// Period page furniture (spec 3.1): notices and ads generated from templates with clearly
// fictional names and brands. No obituaries, missing persons, or health claims.

const FIRST = ['Adebisi', 'Chiamaka', 'Tunde', 'Ngozi', 'Emeka', 'Funmilayo', 'Ibrahim', 'Aisha', 'Ifeoma', 'Segun', 'Halima', 'Obinna', 'Yetunde', 'Musa', 'Kelechi', 'Bukola'];
// Surnames are invented on purpose so a notice never names a real family.
const LAST = ['Okonfiction', 'Adeplacebo', 'Nwasample', 'Babatesting', 'Eziekemock', 'Oladummy', 'Ugwuspecimen', 'Abubakarlab'];
const TOWNS = ['Oshodi', 'Ikeja', 'Yaba', 'Surulere', 'Aba', 'Onitsha', 'Kaduna', 'Ibadan', 'Enugu', 'Wuse', 'Ilorin', 'Benin'];
const DOCS = ['WAEC certificate', 'NYSC discharge certificate', 'international passport', 'C of O file', 'staff ID card', 'land receipt'];
const CHURCHES = ['Glory Tabernacle', 'Victory Assembly', 'Grace Chapel', 'Hope Cathedral'];

export type Notice = { kind: string; title: string; body: string };
export type Ad = { brand: string; line: string; small: string; colors: [string, string] };

export function notices(seed: string, n: number): Notice[] {
  const r = rng(seed);
  const pick = <T,>(a: T[]) => a[Math.floor(r() * a.length)];
  const all: (() => Notice)[] = [
    () => {
      const f = pick(FIRST);
      return {
        kind: 'name',
        title: 'Change of Name',
        body: `I, formerly known and addressed as Miss ${f} ${pick(LAST)}, now wish to be known and addressed as Mrs ${f} ${pick(LAST)}. All former documents remain valid. General public please take note.`,
      };
    },
    () => ({
      kind: 'loss',
      title: 'Loss of Document',
      body: `This is to notify the general public of the loss of the ${pick(DOCS)} of Mr ${pick(FIRST)} ${pick(LAST)} at ${pick(TOWNS)}. If found, please contact the nearest police station.`,
    }),
    () => ({
      kind: 'thanks',
      title: 'Thanksgiving',
      body: `The family of Chief ${pick(FIRST)} ${pick(LAST)} invites friends and well-wishers to a thanksgiving service at ${pick(CHURCHES)}, ${pick(TOWNS)}, this Sunday by 10am. Reception follows.`,
    }),
    () => ({
      kind: 'vacancy',
      title: 'Vacancy',
      body: `A reputable firm in ${pick(TOWNS)} urgently requires sales representatives, drivers and a receptionist. OND/HND holders may apply with CV to the address in this notice.`,
    }),
    () => ({
      kind: 'name',
      title: 'Confirmation of Name',
      body: `I, ${pick(FIRST)} ${pick(FIRST)} ${pick(LAST)}, wish to confirm that ${pick(FIRST)} ${pick(LAST)} and the above name refer to one and the same person.`,
    }),
  ];
  const out: Notice[] = [];
  const order = all.map((f, i) => ({ f, k: r() + (i === 0 ? -1 : 0) })).sort((a, b) => a.k - b.k);
  for (let i = 0; i < n; i++) out.push(order[i % order.length].f());
  return out;
}

const ADS: Ad[] = [
  { brand: 'OYIN NOODLES', line: 'Ready in 3 minutes. Sweet like honey.', small: 'Available at your nearest provision store', colors: ['#c8211b', '#f2c230'] },
  { brand: 'BREEZE TABLE WATER', line: 'Pure. Cool. Everywhere you are.', small: 'NAFDAC-style certification on every sachet', colors: ['#1f4fa3', '#e9f1fb'] },
  { brand: 'STEADY POWER', line: 'Generators that no dey disappoint.', small: 'Showroom: Alaba International Market', colors: ['#1b1712', '#f2c230'] },
  { brand: 'MAMA AJOKE RICE', line: 'Stone-free. Party-ready.', small: '50kg, 25kg and 10kg bags', colors: ['#1f8a4c', '#f6efe0'] },
];

export function adFor(seed: string): Ad {
  const r = rng(`${seed}-ad`);
  return ADS[Math.floor(r() * ADS.length)];
}
