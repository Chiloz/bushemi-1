/* BUSHEMI v3 · data/seed.js
   Realistic, entirely fictional demonstration data. Dates are relative to "now" so the demo always feels current.
   Nothing here is a real person, licence number, or transaction.                                              */
window.BV = window.BV || {};
(function (BV) {
  'use strict';
  const U = BV.u, DAY = 86400000;

  BV.seed = {
    create() {
      const now = Date.now();
      const dk = n => U.dkey(U.addDays(U.today(), n));
      const ago = (d, h) => now - d * DAY - (h || 0) * 3600000;

      /* ---------- verification helper ---------- */
      function ver(ids, daysAgo, over) {
        const checks = {};
        ids.forEach(i => { checks[i] = { status: 'passed', date: ago(daysAgo) }; });
        Object.keys(over || {}).forEach(k => { checks[k] = Object.assign({}, checks[k] || {}, over[k]); });
        return { status: 'verified', submittedAt: ago(daysAgo + 6), verifiedAt: ago(daysAgo), checks };
      }
      const REG = (body, n, expDays) => ({ status: 'passed', date: ago(40), number: 'DEMO-' + body + '-' + n, expires: now + expDays * DAY });
      const IND5 = ['identity', 'qualification', 'registration', 'police', 'references'];
      const CG4 = ['identity', 'qualification', 'police', 'references'];
      const MAN7 = IND5.concat(['interview', 'assessment']);
      const allDays = [1, 1, 1, 1, 1, 1, 0];
      const weekdays = [1, 1, 1, 1, 1, 0, 0];

      const pros = [
        /* ===== Independent marketplace professionals ===== */
        { id: 'p_grace', model: 'independent', type: 'nurse', title: 'Registered Nurse', name: 'Grace Mulenga', phone: '+260 96 000 0101', joined: 2023,
          bio: 'Eight years of hospital and home nursing. Wound care, injections, drips and recovery after surgery. Calm, gentle and always on time.',
          years: 8, languages: ['English', 'Nyanja'], areas: ['Chalala', 'Kabulonga', 'Woodlands', 'Roma', 'Rhodes Park'], specialties: ['Wound care', 'Elderly care', 'Post-surgery recovery'],
          services: [{ id: 'nurse-visit', rate: 350 }, { id: 'wound-care', rate: 330 }],
          stats: { rating: 4.9, reviews: 41, visits: 312, responseMin: 18, acceptRate: 94 },
          availability: { days: weekdays, shifts: ['morning', 'afternoon'], blocked: [], online: true },
          verification: ver(IND5, 62, { registration: REG('NMCZ', '0417', 220) }) },
        { id: 'p_thandiwe', model: 'independent', type: 'nurse', title: 'Registered Nurse', name: 'Thandiwe Sakala', phone: '+260 96 000 0102', joined: 2024,
          bio: 'Community nurse who loves caring for older people at home. Blood pressure, diabetes checks and medication support, explained in plain language.',
          years: 5, languages: ['English', 'Bemba'], areas: ['Kabulonga', 'Woodlands', 'Olympia Park', 'Northmead', 'Roma'], specialties: ['Diabetes care', 'Blood pressure', 'Medication support'],
          services: [{ id: 'nurse-visit', rate: 300 }],
          stats: { rating: 4.7, reviews: 19, visits: 140, responseMin: 35, acceptRate: 88 },
          availability: { days: [1, 1, 1, 1, 1, 1, 0], shifts: ['afternoon', 'evening'], blocked: [], online: true },
          verification: ver(IND5, 44, { registration: REG('NMCZ', '0933', 300) }) },
        { id: 'p_chileshe', model: 'independent', type: 'physio', title: 'Physiotherapist', name: 'Chileshe Mutale', phone: '+260 96 000 0104', joined: 2023,
          bio: 'Helps you move better after surgery, injury or stroke. Simple home exercise plans that fit your day.',
          years: 7, languages: ['English', 'Bemba'], areas: ['Roma', 'Rhodes Park', 'Longacres', 'Chelston', 'Kabulonga'], specialties: ['Stroke recovery', 'Knee and back pain', 'After surgery'],
          services: [{ id: 'physio', rate: 450 }],
          stats: { rating: 4.7, reviews: 34, visits: 260, responseMin: 40, acceptRate: 85 },
          availability: { days: weekdays, shifts: ['morning', 'afternoon'], blocked: [], online: true },
          verification: ver(IND5, 90, { registration: REG('HPCZ', '1874', 200) }) },
        { id: 'p_mwansa', model: 'independent', type: 'dietician', title: 'Dietician', name: 'Mwansa Kapata', phone: '+260 96 000 0105', joined: 2024,
          bio: 'Eating plans for diabetes, blood pressure and healthy weight, built around food you can find in Lusaka markets.',
          years: 6, languages: ['English', 'Bemba'], areas: [], specialties: ['Diabetes', 'Blood pressure', 'Healthy weight'],
          services: [{ id: 'dietician', rate: 180 }],
          stats: { rating: 4.8, reviews: 19, visits: 140, responseMin: 50, acceptRate: 90 },
          availability: { days: [1, 1, 1, 1, 1, 0, 0], shifts: ['morning', 'afternoon', 'evening'], blocked: [], online: true },
          verification: ver(IND5, 70, { registration: REG('HPCZ', '3310', 260) }) },
        { id: 'p_bwalya', model: 'independent', type: 'psychologist', title: 'Clinical Psychologist', name: 'Bwalya Chola', phone: '+260 96 000 0106', joined: 2022,
          bio: 'Private, caring talk therapy for stress, grief, anxiety and family concerns. A calm space with no judgement.',
          years: 10, languages: ['English', 'Bemba', 'Nyanja'], areas: [], specialties: ['Grief', 'Anxiety', 'Family support'],
          services: [{ id: 'therapy', rate: 250 }],
          stats: { rating: 4.9, reviews: 63, visits: 520, responseMin: 60, acceptRate: 82 },
          availability: { days: [1, 1, 1, 1, 1, 0, 0], shifts: ['afternoon', 'evening'], blocked: [], online: true },
          verification: ver(IND5, 150, { registration: REG('HPCZ', '1459', 110) }) },
        { id: 'p_joyce', model: 'independent', type: 'caregiver', title: 'Certified Caregiver', name: 'Joyce Mwale', phone: '+260 96 000 0107', joined: 2024,
          bio: 'Six years caring for older people and people recovering at home. Patient, tidy and good company.',
          years: 6, languages: ['English', 'Nyanja', 'Bemba'], areas: ['Kabulonga', 'Northmead', 'Woodlands', 'Libala', 'Avondale'], specialties: ['Dementia care', 'Mobility support'],
          services: [{ id: 'elder-care', rate: 280 }],
          stats: { rating: 4.6, reviews: 22, visits: 175, responseMin: 45, acceptRate: 86 },
          availability: { days: allDays, shifts: ['morning', 'afternoon'], blocked: [], online: true },
          verification: ver(CG4, 50, { qualification: { expires: now + 40 * DAY } }) },

        /* ===== BUSHEMI Care Team (managed) ===== */
        { id: 'p_natasha', model: 'managed', type: 'nurse', title: 'Registered Nurse · BUSHEMI Care Team', name: 'Natasha Banda', phone: '+260 96 000 0201', joined: 2023,
          bio: 'Member of the BUSHEMI Care Team. Patient and friendly nurse for home visits, wound care and long-term conditions.',
          years: 6, languages: ['English', 'Bemba', 'Nyanja'], areas: BV.data.managedCoverage.slice(), specialties: ['Home nursing', 'Wound care', 'Chronic conditions'],
          services: [{ id: 'nurse-visit', rate: 0 }, { id: 'wound-care', rate: 0 }],
          stats: { rating: 4.8, reviews: 23, visits: 188, responseMin: 10, acceptRate: 100 },
          availability: { days: allDays, shifts: ['morning', 'afternoon', 'evening'], blocked: [], online: true },
          verification: ver(MAN7, 200, { registration: REG('NMCZ', '0552', 180) }) },
        { id: 'p_ruth', model: 'managed', type: 'midwife', title: 'Midwife · BUSHEMI Care Team', name: 'Ruth Tembo', phone: '+260 96 000 0202', joined: 2023,
          bio: 'Newborn checks, breastfeeding help and recovery support for new mums, in the comfort of home.',
          years: 9, languages: ['English', 'Nyanja'], areas: BV.data.managedCoverage.slice(), specialties: ['Newborn care', 'Breastfeeding'],
          services: [{ id: 'mum-baby', rate: 0 }],
          stats: { rating: 4.9, reviews: 46, visits: 355, responseMin: 12, acceptRate: 100 },
          availability: { days: allDays, shifts: ['morning', 'afternoon'], blocked: [], online: true },
          verification: ver(MAN7, 260, { registration: REG('NMCZ', '0211', 240) }) },
        { id: 'p_mercy', model: 'managed', type: 'caregiver', title: 'Certified Caregiver · BUSHEMI Care Team', name: 'Mercy Zulu', phone: '+260 96 000 0203', joined: 2022,
          bio: 'Eleven years of elderly and long-term care. Bathing, meals, mobility and warm company. Day, night and live-in.',
          years: 11, languages: ['English', 'Nyanja', 'Bemba'], areas: BV.data.managedCoverage.slice(), specialties: ['Elderly care', 'Live-in care'],
          services: [{ id: 'elder-care', rate: 0 }, { id: 'placement', rate: 0 }],
          stats: { rating: 4.9, reviews: 57, visits: 430, responseMin: 15, acceptRate: 100 },
          availability: { days: allDays, shifts: ['morning', 'afternoon', 'evening'], blocked: [], online: true },
          verification: ver(MAN7.filter(i => i !== 'registration'), 300) }
      ];

      /* ---------- households and people ---------- */
      const households = [
        { id: 'h1', name: 'Mwila family', language: 'English', voucherUsed: false, members: [
          { id: 'u1', name: 'Mutinta Mwila', phone: '096 123 4567', role: 'owner', status: 'active' },
          { id: 'u2', name: 'Bwalya Mwila', phone: '097 765 4321', role: 'viewer', status: 'active' },
          { id: 'u3', name: 'Aunt Mary', phone: '095 222 3344', role: 'viewer', status: 'invited' }] },
        { id: 'h2', name: 'Phiri family', language: 'Bemba', voucherUsed: true, members: [{ id: 'u4', name: 'Mary Phiri', phone: '096 000 0301', role: 'owner', status: 'active' }] },
        { id: 'h3', name: 'Banda family', language: 'English', voucherUsed: true, members: [{ id: 'u5', name: 'Joseph Banda', phone: '096 000 0302', role: 'owner', status: 'active' }] },
        { id: 'h4', name: 'Tembo family', language: 'Nyanja', voucherUsed: true, members: [{ id: 'u6', name: 'Lilian Tembo', phone: '096 000 0303', role: 'owner', status: 'active' }] },
        { id: 'h5', name: 'Zimba family', language: 'English', voucherUsed: true, members: [{ id: 'u7', name: 'Felix Zimba', phone: '096 000 0304', role: 'owner', status: 'active' }] }
      ];
      const addresses = [
        { id: 'a1', household: 'h1', label: 'Home', area: 'Chalala', line: 'Plot 14, Hillview Road', landmark: 'Blue gate next to the pharmacy' },
        { id: 'a2', household: 'h1', label: 'Mother\'s house', area: 'Woodlands', line: 'Plot 220, Woodlands Extension', landmark: 'Opposite the Catholic church, green gate' }
      ];
      const day = n => ago(n);
      const series = (vals, key2) => vals.map((v, i) => { const o = { ts: day(vals.length - 1 - i), a: Array.isArray(v) ? v[0] : v }; if (Array.isArray(v)) o.b = v[1]; return o; });
      const recipients = [
        { id: 'r1', household: 'h1', name: 'Mutinta Mwila', relation: 'Myself', age: 34, conditions: [], allergies: [], address: 'a1', emergency: { name: 'Bwalya Mwila', phone: '097 765 4321' },
          meds: [{ id: 'm1', name: 'Vitamin D', dose: '1 tablet', times: ['20:00'], log: {} }],
          vitals: { bp: [], sugar: [], weight: series([71.2, 71.0, 70.8, 70.9, 70.5, 70.4, 70.2]) } },
        { id: 'r2', household: 'h1', name: 'Chanda Mwila', relation: 'Mother', age: 71, conditions: ['High blood pressure', 'Type 2 diabetes'], allergies: ['Penicillin'], address: 'a2', emergency: { name: 'Mutinta Mwila', phone: '096 123 4567' },
          meds: [{ id: 'm2', name: 'Amlodipine', dose: '5 mg', times: ['08:00'], log: {} }, { id: 'm3', name: 'Metformin', dose: '500 mg', times: ['08:00', '20:00'], log: {} }, { id: 'm4', name: 'Vitamin D', dose: '1 tablet', times: ['13:00'], log: {} }],
          vitals: { bp: series([[128, 82], [132, 85], [126, 80], [130, 84], [124, 79], [127, 81], [125, 80]]), sugar: series([6.1, 6.4, 5.9, 6.8, 6.2, 6.0, 5.8]), weight: [] } },
        { id: 'r3', household: 'h2', name: 'Esther Phiri', relation: 'Mother', age: 68, conditions: ['High blood pressure'], allergies: [], address: null, emergency: { name: 'Mary Phiri', phone: '096 000 0301' }, meds: [{ id: 'm5', name: 'Enalapril', dose: '10 mg', times: ['08:00'], log: {} }], vitals: { bp: [], sugar: [], weight: [] } },
        { id: 'r4', household: 'h3', name: 'Moses Banda', relation: 'Father', age: 54, conditions: ['Recovering from abdominal surgery'], allergies: ['Latex'], address: null, emergency: { name: 'Joseph Banda', phone: '096 000 0302' }, meds: [], vitals: { bp: [], sugar: [], weight: [] } },
        { id: 'r5', household: 'h4', name: 'Ruth Tembo Sr.', relation: 'Aunt', age: 63, conditions: ['Type 2 diabetes'], allergies: [], address: null, emergency: { name: 'Lilian Tembo', phone: '096 000 0303' }, meds: [{ id: 'm6', name: 'Metformin', dose: '850 mg', times: ['08:00', '19:00'], log: {} }], vitals: { bp: [], sugar: [], weight: [] } },
        { id: 'r6', household: 'h5', name: 'Anna Zimba', relation: 'Mother', age: 79, conditions: ['Arthritis', 'High blood pressure'], allergies: ['Sulfa drugs'], address: null, emergency: { name: 'Felix Zimba', phone: '096 000 0304' }, meds: [{ id: 'm7', name: 'Amlodipine', dose: '5 mg', times: ['08:00'], log: {} }], vitals: { bp: [], sugar: [], weight: [] } }
      ];

      const s = { schema: BV.config.schema, epoch: now, rev: 0, households, addresses, recipients, pros, bookings: [], messages: [], notifications: [], reviews: [], feedback: [], ledger: [], payouts: [] };
      const P = id => pros.find(p => p.id === id);

      /* ---------- bookings ---------- */
      function bk(o) {
        const svc = BV.svc(o.service), p = o.pro ? P(o.pro) : null;
        const price = BV.pricing.quote({ service: svc, model: o.model, pro: p, voucher: false });
        const b = Object.assign({
          id: o.id, ref: 'BSH-' + o.id.slice(-4).toUpperCase().replace(/[^A-Z0-9]/g, 'X'), createdAt: ago(1), model: o.model, service: o.service, pro: o.pro || null,
          date: o.date, time: o.time || null, window: o.window || null, durationMin: svc.duration, mode: svc.mode, address: o.address, notes: o.notes || '',
          status: o.status, price, payment: { method: o.pay || 'mtn', number: o.num || '096 123 4567', state: o.payState || 'held', simulated: true },
          expiresAt: o.expiresAt || null, travel: o.travel || null, startedAt: null, endedAt: null, report: o.report || null, review: o.review || null,
          change: null, cancel: null, match: o.match || null, consent: { shareHealth: true }, timeline: o.timeline || []
        }, { household: o.household, recipient: o.recipient });
        s.bookings.push(b);
        return b;
      }
      const AD = { a1: addresses[0], a2: addresses[1] };
      const h = Math.min(19, Math.max(8, new Date().getHours()));
      const nowSlot = U.pad(h) + ':00';

      bk({ id: 'b_active', model: 'independent', service: 'nurse-visit', pro: 'p_grace', household: 'h1', recipient: 'r2', date: dk(0), time: nowSlot, address: { label: AD.a2.label, area: AD.a2.area, line: AD.a2.line, landmark: AD.a2.landmark },
        notes: 'Please check blood pressure and sugar. Mum gets a little anxious with new people.', status: 'en_route', travel: { startedAt: now - 4 * 60000, etaMin: 15 },
        timeline: [{ ts: ago(1), label: 'Request sent', by: 'patient' }, { ts: ago(1) + 600000, label: 'Grace Mulenga accepted', by: 'pro' }, { ts: now - 4 * 60000, label: 'Grace Mulenga is on the way', by: 'pro' }] });
      bk({ id: 'b_managed', model: 'managed', service: 'elder-care', pro: 'p_mercy', household: 'h1', recipient: 'r2', date: dk(4), time: '09:00', window: 'morning', address: { label: AD.a2.label, area: AD.a2.area, line: AD.a2.line, landmark: AD.a2.landmark },
        notes: 'Help with bathing and lunch. Likes the radio on.', status: 'confirmed', match: { score: 94, reasons: ['Works in Woodlands', 'Speaks English', 'Verified caregiver'] }, payState: 'held',
        timeline: [{ ts: ago(1, 3), label: 'Request sent', by: 'patient' }, { ts: ago(1, 3) + 60000, label: 'BUSHEMI care team is reviewing and choosing the best professional', by: 'care_team' }, { ts: ago(1, 2), label: 'Mercy Zulu assigned', by: 'care_team' }] });
      bk({ id: 'b_past_physio', model: 'independent', service: 'physio', pro: 'p_chileshe', household: 'h1', recipient: 'r1', date: dk(-12), time: '09:00', address: { label: 'Home', area: 'Chalala', line: AD.a1.line, landmark: AD.a1.landmark },
        status: 'completed', payState: 'paid',
        report: { vitals: { bp: '', pulse: '', temp: '', sugar: '', spo2: '' }, care: ['Assessment', 'Exercises taught', 'Home plan given'], observations: 'Good progress on the knee. Swelling reduced since the last review.', advice: 'Do the three exercises twice a day. Avoid deep squats for two weeks.', followUpNeeded: true, followUpNote: 'Review in two weeks.', escalate: false, submittedAt: ago(12) + 5400000, review: 'n/a' },
        timeline: [{ ts: ago(14), label: 'Request sent', by: 'patient' }, { ts: ago(13), label: 'Chileshe Mutale accepted', by: 'pro' }, { ts: ago(12), label: 'Visit report submitted', by: 'pro' }] });
      bk({ id: 'b_past_nurse', model: 'managed', service: 'nurse-visit', pro: 'p_natasha', household: 'h1', recipient: 'r2', date: dk(-20), time: '10:00', window: 'morning', address: { label: AD.a2.label, area: 'Woodlands', line: AD.a2.line, landmark: AD.a2.landmark },
        status: 'completed', payState: 'paid', review: { rating: 5, ts: ago(19) }, match: { score: 91, reasons: ['Works in Woodlands', 'Verified nurse'] },
        report: { vitals: { bp: '128/82', pulse: '76', temp: '36.6', sugar: '6.1', spo2: '97' }, care: ['Vitals checked', 'Medication given', 'Health education'], observations: 'Blood pressure normal. Dressing on left heel changed, healing well.', advice: 'Drink more water. Keep the heel dry and clean.', followUpNeeded: false, followUpNote: '', escalate: false, submittedAt: ago(20) + 3600000, review: 'approved' },
        timeline: [{ ts: ago(22), label: 'Request sent', by: 'patient' }, { ts: ago(21), label: 'Natasha Banda assigned', by: 'care_team' }, { ts: ago(20), label: 'Visit report submitted', by: 'pro' }, { ts: ago(20) + 7200000, label: 'Clinical lead reviewed the report', by: 'care_team' }] });
      s.reviews.push({ id: 'rv_seed1', booking: 'b_past_nurse', pro: 'p_natasha', model: 'managed', name: 'Mutinta M.', rating: 5, tags: ['On time', 'Gentle'], text: 'Natasha was kind and thorough with my mother.', ts: ago(19) });

      /* Requests waiting for Grace (independent inbox). Patient details are deliberately limited until she accepts. */
      const W = (lbl, area, line, landmark) => ({ label: lbl, area, line, landmark });
      bk({ id: 'b_req1', model: 'independent', service: 'nurse-visit', pro: 'p_grace', household: 'h2', recipient: 'r3', date: dk(1), time: '15:00', address: W('Home', 'Kabulonga', 'Plot 88, Kabulonga Road', 'Yellow house behind the school'),
        notes: 'Blood pressure check and help with a new tablet.', status: 'requested', expiresAt: now + 90 * 60000, pay: 'airtel', num: '097 000 0301',
        timeline: [{ ts: now - 30 * 60000, label: 'Request sent', by: 'patient' }, { ts: now - 30 * 60000, label: 'Waiting for Grace Mulenga to accept', by: 'system' }] });
      bk({ id: 'b_req2', model: 'independent', service: 'wound-care', pro: 'p_grace', household: 'h3', recipient: 'r4', date: dk(1), time: '09:00', address: W('Home', 'Chalala', 'Plot 301, Chalala Main', 'Next to the grocery, white gate'),
        notes: 'Dressing change after abdominal surgery. Latex allergy.', status: 'requested', expiresAt: now + 45 * 60000, pay: 'mtn', num: '096 000 0302',
        timeline: [{ ts: now - 75 * 60000, label: 'Request sent', by: 'patient' }, { ts: now - 75 * 60000, label: 'Waiting for Grace Mulenga to accept', by: 'system' }] });
      bk({ id: 'b_req3', model: 'independent', service: 'nurse-visit', pro: 'p_grace', household: 'h4', recipient: 'r5', date: dk(3), time: '11:00', address: W('Home', 'Roma', 'Plot 12, Roma Park', 'Red roof, opposite the clinic'),
        notes: 'Weekly sugar check.', status: 'requested', expiresAt: now + 115 * 60000, pay: 'zamtel', num: '095 000 0303',
        timeline: [{ ts: now - 5 * 60000, label: 'Request sent', by: 'patient' }, { ts: now - 5 * 60000, label: 'Waiting for Grace Mulenga to accept', by: 'system' }] });
      /* Managed assignment for Natasha */
      bk({ id: 'b_assign1', model: 'managed', service: 'nurse-visit', pro: 'p_natasha', household: 'h5', recipient: 'r6', date: dk(1), time: '10:00', window: 'morning', address: W('Home', 'Woodlands', 'Plot 9, Woodlands Ext', 'Near the water tower, brown gate'),
        notes: 'Joint pain and blood pressure check.', status: 'confirmed', pay: 'mtn', num: '096 000 0304', match: { score: 90, reasons: ['Works in Woodlands', 'Speaks Nyanja', 'Verified nurse'] },
        timeline: [{ ts: ago(1), label: 'Request sent', by: 'patient' }, { ts: ago(1) + 600000, label: 'Natasha Banda assigned', by: 'care_team' }] });

      /* ---------- messages ---------- */
      const M = (b, role, id, name, text, ts) => s.messages.push({ id: U.uid('m'), b, from: { role, id, name }, text, ts, readBy: role === 'patient' ? ['patient'] : [] });
      M('b_active', 'patient', 'u1', 'Mutinta Mwila', 'Hello Grace, my mother is expecting you at 14:00. The gate is green.', now - 90 * 60000);
      M('b_active', 'pro', 'p_grace', 'Grace Mulenga', 'Hello Mutinta, I am on my way. About 15 minutes.', now - 4 * 60000);
      M('b_req1', 'patient', 'u4', 'Mary Phiri', 'Good afternoon, my mother prefers the visit after lunch if that is possible.', now - 25 * 60000);

      /* ---------- notifications ---------- */
      const N = (to, text, link, ts, read) => s.notifications.push({ id: U.uid('n'), to, text, ts, read: !!read, link });
      N({ role: 'patient', id: 'h1' }, 'Grace is on the way to your mother\'s house. About 15 minutes.', '/booking/b_active/track', now - 4 * 60000);
      N({ role: 'patient', id: 'h1' }, 'Reminder: Metformin at 08:00 and 20:00 for Chanda.', '/care', now - 3 * 3600000);
      N({ role: 'patient', id: 'h1' }, 'Mercy Zulu will see you ' + U.when(dk(4), '09:00') + '. Tap to view their profile.', '/booking/b_managed', ago(1, 2), true);
      N({ role: 'pro', id: 'p_grace' }, 'New request: Nurse home visit in Chalala, tomorrow 09:00', '/request/b_req2', now - 75 * 60000);
      N({ role: 'pro', id: 'p_grace' }, 'New request: Nurse home visit in Kabulonga, tomorrow 15:00', '/request/b_req1', now - 30 * 60000);
      N({ role: 'pro', id: 'p_grace' }, 'New request: Nurse home visit in Roma, ' + U.relDay(dk(3)), '/request/b_req3', now - 5 * 60000);
      N({ role: 'pro', id: 'p_natasha' }, 'New assignment: Nurse home visit for Anna, tomorrow 10:00', '/request/b_assign1', ago(1) + 600000);

      /* ---------- earnings (illustrative history) ---------- */
      const L = (pro, desc, amt, d, status) => s.ledger.push({ id: U.uid('l'), pro, booking: null, desc, amount: amt, ts: ago(d, 2), status });
      [['Nurse home visit · Mrs Mumba', 350, 0.3], ['Wound care · Mr Chanda', 330, 1], ['Nurse home visit · Mr Lungu', 350, 2], ['Nurse home visit · Mrs Soko', 350, 3], ['Wound care · Mrs Kasonde', 330, 4], ['Nurse home visit · Mr Daka', 350, 5]].forEach(r => L('p_grace', r[0], r[1], r[2], 'available'));
      [['Nurse home visit · Mrs Mwape', 350, 9], ['Nurse home visit · Mr Sinkala', 350, 10]].forEach(r => L('p_grace', r[0], r[1], r[2], 'paid_out'));
      s.payouts.push({ id: U.uid('po'), pro: 'p_grace', amount: 700, method: 'MTN Mobile Money', number: '096 000 0101', ts: ago(8), simulated: true });
      [['Nurse home visit · Mrs Kabwe', 0.4], ['Wound care · Mr Tembo', 1.2], ['Nurse home visit · Mr Zulu', 2.1], ['Nurse home visit · Mrs Banda', 3.3]].forEach(r => L('p_natasha', r[0], r[0].indexOf('Wound') === 0 ? 160 : 170, r[1], 'accrued'));
      s.ledger.sort((a, b) => b.ts - a.ts);

      return s;
    }
  };
})(window.BV);
