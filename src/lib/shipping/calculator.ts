// CBH Shipping Calculator
// Sources: Master_Shipping_Rates.csv + JFK_Premium_Star_Logistics_Rate_Sheet.xlsx
// Verified against Shipment_rates.xlsx real job data

import { getJFKZone } from './jfk-zones';

// ─── DHL USA rates (PKR per kg, 1–150kg) ───────────────────────────────────
const DHL_USA_RATES: Record<number, number> = {
  1:17808,2:21840,3:28560,4:35280,5:42000,6:43120,7:48160,8:52640,
  9:57680,10:62720,11:67200,12:72240,13:78400,14:83440,15:88480,
  16:94080,17:100530,18:104720,19:110320,20:115920,21:110712,22:115984,
  23:121256,24:126528,25:131800,26:137072,27:142344,28:147616,29:152888,
  30:158160,31:163432,32:168704,33:173976,34:179248,35:184520,36:189792,
  37:195064,38:200336,39:205608,40:210880,41:216152,42:221424,43:226696,
  44:231968,45:237240,46:242512,47:247784,48:253056,49:258328,50:263600,
  51:268872,52:274144,53:279416,54:284688,55:289960,56:295232,57:300504,
  58:305776,59:311048,60:316320,61:321592,62:326864,63:332136,64:337408,
  65:342680,66:347952,67:353224,68:358496,69:363768,70:369040,71:374312,
  72:379584,73:384856,74:390128,75:395400,76:400672,77:405944,78:411216,
  79:416488,80:421760,81:427032,82:432304,83:437576,84:442848,85:448120,
  86:453392,87:458664,88:463936,89:469208,90:474480,91:479752,92:485024,
  93:490296,94:495568,95:500840,96:506112,97:511384,98:516656,99:521928,
  100:527200,101:532472,102:537744,103:543016,104:548288,105:553560,
  106:558832,107:564104,108:569376,109:574648,110:579920,111:585192,
  112:590464,113:595736,114:601008,115:606280,116:611552,117:616824,
  118:622096,119:627368,120:632640,121:637912,122:643184,123:648456,
  124:653728,125:659000,126:664272,127:669544,128:674816,129:680088,
  130:685360,131:690632,132:695904,133:701176,134:706448,135:711720,
  136:716992,137:722264,138:727536,139:732808,140:738080,141:743352,
  142:748624,143:753896,144:759168,145:764440,146:769712,147:774984,
  148:780256,149:785528,150:790800,
};

// ─── JFK Premium rates per kg, by zone (1–24 individual, then banded) ──────
// Source: Star Logistics JFK Premium Rate Sheet
const JFK_RATES_1_24: Record<number, [number, number, number]> = {
  // [zone1, zone2, zone3]
  1: [12117.6, 12499.6, 12499.6],
  2: [14461.2, 14847.2, 15311.5],
  3: [17280,   17249.9, 17866.8],
  4: [19656,   19930.4, 21090.9],
  5: [21978,   22607.8, 24119.5],
  6: [24408,   25425.7, 27377.1],
  7: [26838,   28084.7, 30109.5],
  8: [29160,   30432.3, 32457.1],
  9: [31514.4, 32791.5, 34897.5],
  10:[33912,   35676.6, 37929.2],
  11:[36018,   36612,   38772],
  12:[38772,   39420,   40068],
  13:[41526,   42228,   42930],
  14:[44280,   45036,   45792],
  15:[47034,   47844,   48654],
  16:[49788,   50652,   51516],
  17:[52542,   53460,   54378],
  18:[55296,   56268,   57240],
  19:[58050,   59076,   60102],
  20:[60804,   61884,   62964],
  21:[63558,   64692,   65826],
  22:[66312,   67500,   68688],
  23:[69066,   70308,   71550],
  24:[71820,   73116,   74412],
};

// Per-kg rates for bands above 24kg
const JFK_BAND_RATES = {
  '25_49': [2862, 2970, 3024],   // per kg × weight
  '50_69': [2646, 2700, 2754],
  '70plus': [2592, 2646, 2700],
};

// ─── Skynet UK rates (PKR per kg, 1–150kg) ─────────────────────────────────
const SKYNET_UK_RATES: Record<number, number> = {
  1:5529,2:7794,3:10059,4:12324,5:14589,6:16854,7:19119,8:21384,
  9:23649,10:25914,11:28179,12:30444,13:32709,14:34974,15:37239,
  16:39504,17:41769,18:44034,19:46299,20:48564,21:50829,22:53094,
  23:55359,24:57624,25:59889,26:62154,27:64419,28:66684,29:68949,
  30:71214,31:73479,32:75744,33:78009,34:80274,35:82539,36:84804,
  37:87069,38:89334,39:91599,40:93864,41:96129,42:98394,43:100659,
  44:102924,45:105189,46:107454,47:109719,48:111984,49:114249,50:116514,
  51:118779,52:121044,53:123309,54:125574,55:127839,56:130104,57:132369,
  58:134634,59:136899,60:139164,61:141429,62:143694,63:145959,64:148224,
  65:150489,66:152754,67:155019,68:157284,69:159549,70:161814,71:164079,
  72:166344,73:168609,74:170874,75:173139,76:175404,77:177669,78:179934,
  79:182199,80:184464,81:186729,82:188994,83:191259,84:193524,85:195789,
  86:198054,87:200319,88:202584,89:204849,90:207114,91:209379,92:211644,
  93:213909,94:216174,95:218439,96:220704,97:222969,98:225234,99:227499,
  100:229764,101:232029,102:234294,103:236559,104:238824,105:241089,
  106:243354,107:245619,108:247884,109:250149,110:252414,111:254679,
  112:256944,113:259209,114:261474,115:263739,116:266004,117:268269,
  118:270534,119:272799,120:275064,121:277329,122:279594,123:281859,
  124:284124,125:286389,126:288654,127:290919,128:293184,129:295449,
  130:297714,131:299979,132:302244,133:304509,134:306774,135:309039,
  136:311304,137:313569,138:315834,139:318099,140:320364,141:322629,
  142:324894,143:327159,144:329424,145:331689,146:333954,147:336219,
  148:338484,149:340749,150:343014,
};

export type ShippingDestination = 'USA' | 'UK';

export interface ShippingResult {
  selectedCourier: string;
  selectedZone: number | null;
  selectedRatePKR: number;
  chargeableWeightKg: number;
  actualWeightKg: number;
  volumetricWeightKg: number;
  alternativeCourier?: string;
  alternativeRatePKR?: number;
  savingsPKR?: number;
  deliveryDays: string;
  flag?: string;
}

function roundUpKg(weight: number): number {
  return Math.ceil(weight);
}

function getJFKRate(weightKg: number, zone: 1 | 2 | 3): number {
  const zoneIdx = zone - 1;
  if (weightKg <= 24) {
    const w = Math.ceil(weightKg);
    const rates = JFK_RATES_1_24[w];
    if (!rates) return 0;
    return rates[zoneIdx];
  } else if (weightKg <= 49) {
    return weightKg * JFK_BAND_RATES['25_49'][zoneIdx];
  } else if (weightKg <= 69) {
    return weightKg * JFK_BAND_RATES['50_69'][zoneIdx];
  } else {
    return weightKg * JFK_BAND_RATES['70plus'][zoneIdx];
  }
}

function getDHLRate(weightKg: number): number {
  const w = roundUpKg(weightKg);
  if (w > 150) return -1; // flag as custom
  return DHL_USA_RATES[w] ?? 0;
}

function getSkynetRate(weightKg: number): number {
  const w = roundUpKg(weightKg);
  if (w > 150) return -1;
  return SKYNET_UK_RATES[w] ?? 0;
}

export function calculateShipping(params: {
  destination: ShippingDestination;
  zipCode?: string;           // US only, first 3 digits used
  actualWeightKg: number;
  cartonLcm: number;          // carton length in cm
  cartonWcm: number;
  cartonHcm: number;
}): ShippingResult {
  const { destination, zipCode, actualWeightKg, cartonLcm, cartonWcm, cartonHcm } = params;

  const volumetricWeightKg = (cartonLcm * cartonWcm * cartonHcm) / 5000;
  const chargeableWeightKg = Math.max(actualWeightKg, volumetricWeightKg);
  const chargeableRounded = roundUpKg(chargeableWeightKg);

  if (destination === 'UK') {
    const rate = getSkynetRate(chargeableRounded);
    return {
      selectedCourier: 'Skynet UK',
      selectedZone: null,
      selectedRatePKR: rate === -1 ? 0 : rate,
      chargeableWeightKg: chargeableRounded,
      actualWeightKg,
      volumetricWeightKg,
      deliveryDays: '5–7 working days',
      flag: rate === -1 ? 'Over 150kg — custom freight quote required' : undefined,
    };
  }

  // USA — compare JFK vs DHL
  const zone = zipCode ? getJFKZone(zipCode) : null;
  const jfkRate = zone ? getJFKRate(chargeableRounded, zone) : null;
  const dhlRate = getDHLRate(chargeableRounded);

  // Auto-select cheaper
  if (jfkRate !== null && zone !== null) {
    const jfkCheaper = jfkRate <= dhlRate || dhlRate === -1;
    if (jfkCheaper) {
      return {
        selectedCourier: `JFK Premium Zone ${zone}`,
        selectedZone: zone,
        selectedRatePKR: jfkRate,
        chargeableWeightKg: chargeableRounded,
        actualWeightKg,
        volumetricWeightKg,
        alternativeCourier: 'DHL USA',
        alternativeRatePKR: dhlRate === -1 ? undefined : dhlRate,
        savingsPKR: dhlRate === -1 ? undefined : dhlRate - jfkRate,
        deliveryDays: zone === 1 ? '8–10 working days' : '10–12 working days',
      };
    } else {
      return {
        selectedCourier: 'DHL USA',
        selectedZone: null,
        selectedRatePKR: dhlRate,
        chargeableWeightKg: chargeableRounded,
        actualWeightKg,
        volumetricWeightKg,
        alternativeCourier: `JFK Premium Zone ${zone}`,
        alternativeRatePKR: jfkRate,
        savingsPKR: jfkRate - dhlRate,
        deliveryDays: '3–5 working days',
      };
    }
  }

  // No zip or zone not found — use DHL as fallback
  return {
    selectedCourier: 'DHL USA',
    selectedZone: null,
    selectedRatePKR: dhlRate === -1 ? 0 : dhlRate,
    chargeableWeightKg: chargeableRounded,
    actualWeightKg,
    volumetricWeightKg,
    deliveryDays: '3–5 working days',
    flag: dhlRate === -1 ? 'Over 150kg — custom freight quote required'
      : !zipCode ? 'No zip code provided — JFK comparison unavailable' : undefined,
  };
}
