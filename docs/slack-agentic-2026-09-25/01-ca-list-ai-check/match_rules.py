"""WaterLine matching rules v1.1, as code. Same rules as matching_rulebook_v1.txt.

Use: python match_rules.py our_shops.csv candidates.csv out.csv
- our_shops.csv columns: shop_id, business_name, other_name, phone_1, phone_2, address, city, state, zip, website
- candidates.csv columns: shop_id (the shop this candidate was searched for), source, candidate_id,
  name, phone, address, city, state, zip, website, category
Output: one row per candidate with verdict (MATCH / NEEDS CHECK / NO MATCH / CONFLICT), confidence, proofs, reason.
Only NEEDS CHECK rows go to the AI second pass (see the rulebook, step 3b).
"""
import csv, re, sys
from difflib import SequenceMatcher

STOP = {'INC', 'LLC', 'CO', 'CORP', 'COMPANY', 'THE', 'AND', 'OF', 'SERVICE', 'SERVICES', 'PLUMBING', 'PLUMBER',
        'PLUMBERS', 'HEATING', 'AIR', 'ROOTER', 'DRAIN', 'DRAINS', 'SEWER', 'MECHANICAL', 'CONTRACTOR',
        'CONTRACTORS', 'LTD', 'PC'}
STATES = {'AL': 'alabama', 'AK': 'alaska', 'AZ': 'arizona', 'AR': 'arkansas', 'CA': 'california', 'CO': 'colorado',
          'CT': 'connecticut', 'DE': 'delaware', 'DC': 'district of columbia', 'FL': 'florida', 'GA': 'georgia',
          'HI': 'hawaii', 'ID': 'idaho', 'IL': 'illinois', 'IN': 'indiana', 'IA': 'iowa', 'KS': 'kansas',
          'KY': 'kentucky', 'LA': 'louisiana', 'ME': 'maine', 'MD': 'maryland', 'MA': 'massachusetts',
          'MI': 'michigan', 'MN': 'minnesota', 'MS': 'mississippi', 'MO': 'missouri', 'MT': 'montana',
          'NE': 'nebraska', 'NV': 'nevada', 'NH': 'new hampshire', 'NJ': 'new jersey', 'NM': 'new mexico',
          'NY': 'new york', 'NC': 'north carolina', 'ND': 'north dakota', 'OH': 'ohio', 'OK': 'oklahoma',
          'OR': 'oregon', 'PA': 'pennsylvania', 'RI': 'rhode island', 'SC': 'south carolina', 'SD': 'south dakota',
          'TN': 'tennessee', 'TX': 'texas', 'UT': 'utah', 'VT': 'vermont', 'VA': 'virginia', 'WA': 'washington',
          'WV': 'west virginia', 'WI': 'wisconsin', 'WY': 'wyoming'}
NOT_PLUMBING = re.compile(r'\b(electrician|roofer|roofing|landscap|garage door|carpet|pest|locksmith|painter)', re.I)
PLUMBING = re.compile(r'(plumb|rooter|drain|sewer|water heater|septic|hvac|heating|air condition)', re.I)


def digits(x):
    s = re.sub(r'\D', '', str(x or ''))
    return s[-10:] if len(s) >= 10 else ''


def domain(u):
    u = str(u or '').lower().strip()
    if not u or u == 'nan':
        return ''
    u = re.sub(r'^https?://', '', u)
    u = re.sub(r'^www\.', '', u)
    return u.split('/')[0]


def street(a):
    a = str(a or '').upper().split(',')[0]
    a = re.sub(r'\b(SUITE|STE|UNIT|APT|#)\s*\S+', '', a)
    for long, short in [('STREET', 'ST'), ('AVENUE', 'AVE'), ('ROAD', 'RD'), ('BOULEVARD', 'BLVD'), ('DRIVE', 'DR'),
                        ('LANE', 'LN'), ('COURT', 'CT'), ('PLACE', 'PL'), ('HIGHWAY', 'HWY'), ('PARKWAY', 'PKWY')]:
        a = re.sub(r'\b' + long + r'\b', short, a)
    a = re.sub(r'[^A-Z0-9 ]', '', a)
    return re.sub(r'\s+', ' ', a).strip()


def zip5(z):
    s = re.findall(r'\b\d{5}\b', str(z or ''))
    return s[-1] if s else ''


def toks(n):
    return set(t for t in re.sub(r'[^A-Z0-9 ]', ' ', str(n or '').upper().replace('&', ' ')).split()
               if t not in STOP and len(t) > 1)


def namesim(a, b):
    A, B = toks(a), toks(b)
    s1 = SequenceMatcher(None, re.sub(r'[^A-Z]', '', str(a).upper()), re.sub(r'[^A-Z]', '', str(b).upper())).ratio()
    j = len(A & B) / max(1, min(len(A), len(B))) if A and B else 0
    return max(s1, j)


def same_state(ours, theirs):
    t = str(theirs or '').strip().lower()
    if not t or t == 'nan':
        return True           # unknown state: can't reject on it
    o = str(ours).strip().upper()
    return t in (o.lower(), STATES.get(o, '?'))


def judge(shop, cand):
    """Returns (verdict, confidence, proofs, reason). Rulebook steps 1-3."""
    # Step 1: automatic rejects
    if not same_state(shop['state'], cand.get('state')):
        return 'NO MATCH', '', [], 'different state'
    # A non-plumbing Google category is NOT a reject (multi-trade shops are real; the test proved it).
    # It is only a flag, used later when scoring "is it a plumber".
    cat = str(cand.get('category') or '')
    cat_flag = 'category not plumbing' if cat and NOT_PLUMBING.search(cat) and not PLUMBING.search(cat) else ''
    # Step 2: proofs
    proofs = []
    ph = digits(cand.get('phone'))
    if ph and ph in (digits(shop.get('phone_1')), digits(shop.get('phone_2'))):
        proofs.append('PHONE')
    st = street(cand.get('address'))
    same_city = str(cand.get('city') or '').strip().lower() == str(shop.get('city') or '').strip().lower()
    z = zip5(cand.get('zip')) or zip5(cand.get('address'))
    if (st and st == street(shop.get('address'))) or (same_city and z and z == zip5(shop.get('zip'))):
        proofs.append('ADDRESS')
    if domain(cand.get('website')) and domain(cand.get('website')) == domain(shop.get('website')):
        proofs.append('WEBSITE')
    ns = max(namesim(shop.get('business_name'), cand.get('name')),
             namesim(shop.get('other_name'), cand.get('name')) if shop.get('other_name') else 0)
    if ns >= 0.85:
        proofs.append('NAME')
    # Step 3: decide
    if 'PHONE' in proofs and ns < 0.5 and len(proofs) == 1:
        return 'NEEDS CHECK', '', proofs, 'phone matches but the name is very different'
    if len(proofs) >= 2 and ('PHONE' in proofs or 'ADDRESS' in proofs):
        return 'MATCH', 'HIGH', proofs, '2+ proofs incl. phone/address' + (f'; {cat_flag}' if cat_flag else '')
    if len(proofs) >= 2:
        return 'MATCH', 'MEDIUM', proofs, '2+ proofs, no phone/address' + (f'; {cat_flag}' if cat_flag else '')
    if len(proofs) == 1:
        return 'NEEDS CHECK', '', proofs, 'only 1 proof'
    return 'NO MATCH', '', proofs, 'no proofs'


def run(shops_csv, cands_csv, out_csv):
    shops = {r['shop_id']: r for r in csv.DictReader(open(shops_csv, newline='', encoding='utf-8'))}
    out, best = [], {}
    for c in csv.DictReader(open(cands_csv, newline='', encoding='utf-8')):
        s = shops.get(c['shop_id'])
        if not s:
            continue
        v, conf, pr, why = judge(s, c)
        row = dict(shop_id=c['shop_id'], source=c.get('source', ''), candidate_id=c.get('candidate_id', ''),
                   verdict=v, confidence=conf, proofs='+'.join(pr), reason=why)
        out.append(row)
        if v == 'MATCH' and row['candidate_id']:
            key = (row['source'], row['candidate_id'])
            best.setdefault(key, []).append((len(pr), len(out) - 1))
    # CONFLICT: the same listing matched to 2+ shops -> keep the one with more proofs, flag the rest
    for key, lst in best.items():
        if len(lst) > 1:
            lst.sort(reverse=True)
            for _, i in lst[1:]:
                out[i]['verdict'] = 'CONFLICT'
                out[i]['reason'] = 'same listing matched to another shop with more proofs'
    with open(out_csv, 'w', newline='', encoding='utf-8') as f:
        w = csv.DictWriter(f, fieldnames=list(out[0].keys()) if out else ['shop_id'])
        w.writeheader(); w.writerows(out)
    counts = {}
    for r in out:
        counts[r['verdict']] = counts.get(r['verdict'], 0) + 1
    print('done:', counts)


if __name__ == '__main__':
    run(*sys.argv[1:4])
