/* BUSHEMI v3 · data/config.js
   Everything a business owner would want to tune lives here, in plain words.
   ALL PRICES, FEES AND POLICIES BELOW ARE PLACEHOLDERS FOR THE PROTOTYPE. Confirm them before launch. */
window.BV = window.BV || {};
(function (BV) {
  'use strict';

  BV.config = {
    schema: 3,

    /* Set this to the real BUSHEMI care line when you have one, e.g. '+260 9XX XXX XXX'.
       While it is empty the call buttons say "not set" instead of dialling a made-up number. */
    careLine: '',
    emergencyNumber: '112',

    /* Marketplace economics (placeholder) */
    fees: {
      independentServicePct: 10,   // shown to the patient as a separate "BUSHEMI service fee"
      proCommissionPct: 0          // taken from the professional's rate; 0 = patient-side fee only
    },
    voucher: { code: 'WELCOME10', pct: 10 },

    /* Independent requests expire if the professional does not answer in this many hours */
    requestResponseHours: 2,
    /* Soonest a visit can start from "now" */
    leadHours: 2,

    cancellation: {
      independent: { freeHoursBefore: 12, lateFeePct: 50 },
      managed: { freeHoursBefore: 6, lateFeePct: 25 }
    },
    minPayout: 100,
    travelBufferMin: 30
  };

  /* Lusaka neighbourhoods used for service areas. Landmarks matter more than street names in
     everyday Zambian addressing, so the booking flow always asks for one. */
  BV.data = BV.data || {};
  BV.data.areas = ['Chalala', 'Kabulonga', 'Woodlands', 'Roma', 'Rhodes Park', 'Northmead', 'Olympia Park', 'Longacres', 'Makeni', 'Chilanga', 'Kalundu', 'Libala', 'Chelston', 'Avondale', 'Ibex Hill', 'Emmasdale', 'Kabwata', 'Matero'];
  /* Where the BUSHEMI-managed team operates today (managed visits are only offered inside this list) */
  BV.data.managedCoverage = ['Chalala', 'Kabulonga', 'Woodlands', 'Roma', 'Rhodes Park', 'Northmead', 'Olympia Park', 'Longacres', 'Ibex Hill', 'Libala', 'Chelston', 'Avondale'];

  /* Professional categories. Add a new category here and it appears in onboarding, search and matching. */
  BV.data.proTypes = {
    nurse: { label: 'Nurse', plural: 'Nurses', regulator: 'NMCZ', regulatorName: 'Nursing and Midwifery Council of Zambia', licenceLabel: 'Registration number' },
    midwife: { label: 'Midwife', plural: 'Midwives', regulator: 'NMCZ', regulatorName: 'Nursing and Midwifery Council of Zambia', licenceLabel: 'Registration number' },
    physio: { label: 'Physiotherapist', plural: 'Physiotherapists', regulator: 'HPCZ', regulatorName: 'Health Professions Council of Zambia', licenceLabel: 'Registration number' },
    dietician: { label: 'Dietician', plural: 'Dieticians', regulator: 'HPCZ', regulatorName: 'Health Professions Council of Zambia', licenceLabel: 'Registration number' },
    psychologist: { label: 'Psychologist', plural: 'Psychologists', regulator: 'HPCZ', regulatorName: 'Health Professions Council of Zambia', licenceLabel: 'Registration number' },
    caregiver: { label: 'Caregiver', plural: 'Caregivers', regulator: null, regulatorName: 'Training certificate and reference checks', licenceLabel: 'Certificate number' }
  };

  /* The service catalogue. `managedPrice` = all-inclusive BUSHEMI-managed price (null = not offered as managed).
     `rateRange` = guideline range independent professionals can set their own rate within.
     `staffPay` = what a BUSHEMI-managed team member earns per visit (placeholder). */
  BV.data.services = [
    { id: 'nurse-visit', name: 'Nurse home visit', short: 'Nurse', mode: 'home', duration: 60, icon: 'nurse', tone: 'blue', proType: 'nurse', managedPrice: 400, staffPay: 170, rateRange: [250, 450],
      desc: 'A qualified nurse comes to you for checks, injections and everyday nursing care.',
      includes: ['Blood pressure, pulse, temperature and sugar checks', 'Injections and medication support', 'Drip monitoring (with a prescription)', 'A written visit summary for the family'],
      bring: 'Any prescriptions, recent test results and the medicines being taken.' },
    { id: 'wound-care', name: 'Wound care and dressing', short: 'Wound care', mode: 'home', duration: 45, icon: 'nurse', tone: 'blue', proType: 'nurse', managedPrice: 380, staffPay: 160, rateRange: [250, 420],
      desc: 'Safe dressing changes and wound checks at home, including after surgery.',
      includes: ['Wound assessment and cleaning', 'Dressing change', 'Signs of infection explained', 'Follow-up advice'],
      bring: 'Discharge papers or the hospital\'s instructions, and any dressings you already have.' },
    { id: 'elder-care', name: 'Caregiver day visit', short: 'Caregiver', mode: 'home', duration: 240, icon: 'heart', tone: 'green', proType: 'caregiver', managedPrice: 340, staffPay: 150, rateRange: [220, 380],
      desc: 'A trained caregiver for four hours: personal care, meals, mobility and company.',
      includes: ['Bathing and personal care', 'Meals and drinking enough water', 'Help moving safely', 'Medication reminders and companionship'],
      bring: 'Nothing special. Tell us about routines and what the person enjoys.' },
    { id: 'physio', name: 'Physiotherapy session', short: 'Physio', mode: 'home', duration: 60, icon: 'body', tone: 'indigo', proType: 'physio', managedPrice: null, staffPay: 0, rateRange: [350, 550],
      desc: 'Move better after surgery, injury or stroke, with a plan that fits your home.',
      includes: ['Movement assessment', 'Guided treatment', 'Home exercise plan', 'Progress notes'],
      bring: 'Referral letters or scan results if you have them. Wear loose clothes.' },
    { id: 'mum-baby', name: 'Mother and baby care', short: 'Mum & baby', mode: 'home', duration: 60, icon: 'baby', tone: 'amber', proType: 'midwife', managedPrice: 450, staffPay: 190, rateRange: [350, 500],
      desc: 'A midwife supports new mums and babies at home after birth.',
      includes: ['Newborn health check', 'Breastfeeding help', 'Mother\'s recovery check', 'Advice for the first weeks'],
      bring: 'The baby\'s clinic card and any discharge notes.' },
    { id: 'dietician', name: 'Dietician consultation', short: 'Dietician', mode: 'video', duration: 40, icon: 'leaf', tone: 'green', proType: 'dietician', managedPrice: null, staffPay: 0, rateRange: [150, 250],
      desc: 'Eating plans for diabetes, blood pressure and healthy weight using food from local markets.',
      includes: ['Review of current eating', 'A simple plan using food you can find', 'Follow-up check-in message'],
      bring: 'Recent test results if you have them.' },
    { id: 'therapy', name: 'Psychologist session', short: 'Therapy', mode: 'video', duration: 50, icon: 'mind', tone: 'indigo', proType: 'psychologist', managedPrice: null, staffPay: 0, rateRange: [200, 350],
      desc: 'Private, caring talk therapy for stress, grief, anxiety and family worries.',
      includes: ['A private conversation by video or voice call', 'Practical coping steps', 'Follow-up if you want it'],
      bring: 'A private, quiet place and headphones if you have them.' },
    { id: 'placement', name: 'Live-in and long-term care', short: 'Live-in care', mode: 'plan', duration: 0, icon: 'users', tone: 'green', proType: 'caregiver', managedPrice: 250, staffPay: 0, managedOnly: true, rateRange: [0, 0],
      desc: 'For ongoing needs. BUSHEMI assesses first, then matches and manages a caregiver for you.',
      includes: ['A free-to-cancel assessment call', 'A care plan written with the family', 'A matched, checked caregiver managed by BUSHEMI', 'Monthly reviews'],
      bring: 'Nothing for the first call.' }
  ];
  BV.svc = id => BV.data.services.find(s => s.id === id);

  BV.data.visitChips = {
    nurse: ['Vitals checked', 'Medication given', 'Injection given', 'Wound dressed', 'Drip monitored', 'Health education'],
    caregiver: ['Bathing and hygiene', 'Meals and fluids', 'Moving safely', 'Medication reminder', 'Companionship', 'Light tidying'],
    physio: ['Assessment', 'Exercises taught', 'Hands-on treatment', 'Walking practice', 'Home plan given'],
    midwife: ['Baby checked', 'Feeding support', 'Mother checked', 'Advice given'],
    dietician: ['Plan agreed', 'Food swaps explained', 'Follow-up set'],
    psychologist: ['Session held', 'Coping steps shared', 'Follow-up set']
  };
  BV.data.reviewTags = ['On time', 'Gentle', 'Clear explanations', 'Professional', 'Kind to the family', 'Went the extra mile'];
  BV.data.reviewPool = [
    ['Mutinta M.', 'Arrived on time and was so gentle with my mother. Highly recommend.', 5],
    ['Peter K.', 'Clear explanations, very professional. We felt safe.', 5],
    ['Agnes S.', 'Good care and kind to the whole family. We will book again.', 4],
    ['Lweendo C.', 'Explained everything to my father in simple words. Very patient.', 5],
    ['Mwila B.', 'Punctual and well prepared. The summary after the visit helped a lot.', 5],
    ['Natalia Z.', 'Friendly and thorough. Would have liked a little more notice when running late.', 4]
  ];
})(window.BV);
