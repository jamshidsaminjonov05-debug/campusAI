import type { InvestorCopy } from "./types";

/**
 * INVESTOR DECK COPY — ENGLISH.
 *
 * Mirrors `uz.ts` field for field.
 *
 * ⚠️ THE NARRATION IS BUDGETED AT FIVE MINUTES: 16 slides × ~18 seconds,
 * three short cues each. If you add a sentence, cut another one.
 *
 * ⚠️ NO NUMBERS IN SLIDE COPY — every figure comes from `model.ts`.
 * Exceptions: the decree date and REAL detection records (camera, time,
 * confidence), which are measured data rather than model output.
 *
 * ⚠️ Numbers in the narration are spelled out because the text is sent to
 * the English TTS service. Keep them in sync with `model.ts` by hand.
 */
export const EN: InvestorCopy = {
  lang: "en",
  langLabel: "English",

  gate: {
    sub: "AI in education: the problem, the solution, and a system already running in a school",
    start: "Start the presentation",
    note: "5 minutes · with narration · best viewed full screen",
  },

  shell: {
    prev: "Previous slide",
    next: "Next slide",
    auto: "Auto",
    captions: "Captions",
    exit: "Exit",
    pause: "Pause",
    resume: "Resume",
    sound: "Sound",
    hint: "→ next · Space pause · M sound · A auto · S captions",
    paused: "PAUSED",
    slideTitles: [
      "Opening",
      "Purpose",
      "The landscape",
      "Safety",
      "Teaching quality",
      "Parents",
      "How it works",
      "Detectors",
      "Lesson analysis",
      "Parent app",
      "School 179",
      "Results",
      "Market size",
      "Competition",
      "Revenue & profit",
      "Close",
    ],
  },

  assumed: "modelled",
  measured: "measured",
  currencyHint: "Currency",
  fxNote: "Rate: 1 $ = {rate} UZS",

  /* ──────────────────────────── narration ──────────────────────────── */

  narration: [
    /* 0 — OPENING */
    [
      { at: 0.0, text: "Good afternoon." },
      { at: 1.8, text: "Campus AI is an artificial intelligence ecosystem for educational institutions." },
      { at: 8.5, text: "In five minutes we will look at the problem, the solution, a system already running, and the market." },
    ],

    /* 1 — PURPOSE */
    [
      { at: 0.0, text: "This project is directly tied to the law." },
      { at: 4.0, text: "On the thirty first of July, twenty twenty six, the Cabinet of Ministers made security requirements mandatory for every educational institution." },
      { at: 14.5, text: "The decree requires detecting an armed attack and a suspicious person. That is exactly what Campus AI is." },
    ],

    /* 2 — THE LANDSCAPE */
    [
      { at: 0.0, text: "Uzbekistan has over eleven thousand schools, five hundred colleges and two hundred and fifteen universities." },
      { at: 9.5, text: "Most of them already have cameras. But a camera only records." },
      { at: 15.0, text: "You watch the footage after the incident. The cameras are there, but they have no perception." },
    ],

    /* 3 — SAFETY */
    [
      { at: 0.0, text: "The first problem is safety." },
      { at: 2.5, text: "A fight in the yard, an armed person on the grounds, a student smoking, a fire starting." },
      { at: 11.0, text: "All of it reaches the camera, and nobody sees it in real time." },
    ],

    /* 4 — TEACHING QUALITY */
    [
      { at: 0.0, text: "The second problem is teaching quality." },
      { at: 3.2, text: "How the lesson is delivered, where the students' attention is, who is on their phone, who is in an unrelated conversation." },
      { at: 13.0, text: "A principal has no objective answer to any of that. Only guesswork." },
    ],

    /* 5 — PARENTS */
    [
      { at: 0.0, text: "The third problem is parents." },
      { at: 2.8, text: "Did the child arrive, when did they leave, were they in class, were they involved in an incident." },
      { at: 11.0, text: "A parent learns this in the evening, from the child alone. There is no reliable channel." },
    ],

    /* 6 — HOW IT WORKS */
    [
      { at: 0.0, text: "Our solution sits on top of the cameras you already own." },
      { at: 4.0, text: "The stream is split into frames, vision models resolve the objects, and dozens of frames collapse into one incident." },
      { at: 13.5, text: "It all runs on the institution's own server. An outage does not stop it, and video never leaves the building." },
    ],

    /* 7 — DETECTORS */
    [
      { at: 0.0, text: "Here are real frames." },
      { at: 2.0, text: "A weapon detected, confidence ninety one percent. Smoking detected. A fight detected in the school yard." },
      { at: 12.0, text: "These are not mockups. These are records from a system that is running." },
    ],

    /* 8 — LESSON ANALYSIS */
    [
      { at: 0.0, text: "The system also analyses the lesson itself." },
      { at: 3.2, text: "The teacher's activity, the students' attention, and distractions: phones and conversations unrelated to the class." },
      { at: 13.0, text: "Attendance is logged automatically by face. No paper register is needed." },
    ],

    /* 9 — PARENT APP */
    [
      { at: 0.0, text: "And the parent sees all of it on a phone." },
      { at: 3.0, text: "Arrival and departure times, the attendance rate, today's lessons, and if something happens, an alert with the frame." },
      { at: 13.5, text: "This is the first reliable channel between the school and the family." },
    ],

    /* 10 — SCHOOL 179 */
    [
      { at: 0.0, text: "Now the most important part. This system is running right now." },
      { at: 5.0, text: "At school number one seventy nine in Tashkent, the fight, weapon, smoking and attendance detectors are live." },
      { at: 14.5, text: "Every frame you have just seen came from that school." },
    ],

    /* 11 — RESULTS */
    [
      { at: 0.0, text: "So what changed?" },
      { at: 1.8, text: "Incidents are detected in seconds, manual reporting disappears, and every case is documented with a frame." },
      { at: 11.5, text: "And most importantly, parents are informed in real time for the first time." },
    ],

    /* 12 — MARKET SIZE */
    [
      { at: 0.0, text: "Now the market." },
      { at: 1.6, text: "At full coverage, education in Uzbekistan is a market of seven hundred and twenty five billion soum a year." },
      { at: 10.5, text: "That is sixty one million dollars, built up from institution and student counts." },
    ],

    /* 13 — COMPETITION */
    [
      { at: 0.0, text: "Competitors exist, but they play on a different field." },
      { at: 4.0, text: "Global platforms cost ten times more and run in the cloud. Hardware vendors have no education scenarios at all." },
      { at: 13.5, text: "On premise, in Uzbek, built for education — that combination is only ours." },
    ],

    /* 14 — REVENUE AND PROFIT */
    [
      { at: 0.0, text: "And the question that matters: how much profit?" },
      { at: 3.2, text: "Our break even point is below one percent of the market. That is about ninety institutions." },
      { at: 11.0, text: "At five percent coverage, annual revenue is forty five billion soum and net profit is over seventeen billion." },
    ],

    /* 15 — CLOSE */
    [
      { at: 0.0, text: "Three things to close on." },
      { at: 2.0, text: "The state created the demand with a twenty twenty seven deadline. The product is built and running in a school." },
      { at: 11.5, text: "And the market is empty. We are ready for your questions." },
    ],
  ],

  /* ───────────────────────────── slide copy ─────────────────────────── */

  intro: {
    titleA: "The cameras are there.",
    titleB: "The perception is not.",
    sub: "Campus AI — an artificial intelligence ecosystem for educational institutions",
    stats: ["institutions in market", "students and pupils", "annual market size", "school running live"],
  },

  purpose: {
    kicker: "Purpose",
    title: "Directly tied to the law",
    goals: [
      "Make the institution genuinely safer, in real time",
      "Give the principal an objective measure of teaching quality",
      "Open a reliable channel between the family and the school",
    ],
    decreeLabel: "Cabinet of Ministers resolution",
    decreeDate: "31 July 2026",
    decreeTitle: "On improving the security systems of educational institutions",
    requires: [
      "Access control — identification and an electronic log",
      "Video surveillance — perimeter, entrances, corridors, canteen, grounds",
      "A security room and an emergency notification system",
      "Footage retained for at least one month",
    ],
    signalTitle: "The resolution mandates two alert signals",
    signalOne: "Armed attack · suspicious person · suspicious object",
    signalTwo: "Fire · accident · natural emergency",
    signalNote: "The first signal is a computer vision problem. A model solves it, a human cannot.",
    timelineTitle: "Rollout timeline",
    timeline: [
      { year: "2026", text: "Security posts established" },
      { year: "2027", text: "Posts equipped, video cameras integrated" },
    ],
    punch: "The law created the demand. The software layer that satisfies it does not yet exist here.",
    source: "Source: Cabinet of Ministers resolution, 31 July 2026 · gazeta.uz, 3 August 2026",
  },

  problem: {
    kicker: "Problem · the landscape",
    title: "The infrastructure exists — but it is only an archive",
    segNames: ["General secondary schools", "Colleges and technicums", "Higher education institutions"],
    segNotes: [
      "The largest segment, the youngest audience",
      "Teenagers — the hardest years for discipline",
      "Large grounds, many entry points",
    ],
    pains: [
      {
        title: "A camera records, it does not watch",
        text: "No guard, however experienced, can watch dozens of screens at once.",
      },
      {
        title: "Incidents are never logged",
        text: "Verbal reports, handwritten notes, late reactions. No statistics accumulate.",
      },
      {
        title: "Decisions rest on no data",
        text: "Principals and ministries alike work on assumption — nothing is measured.",
      },
    ],
    verdict: "These institutions paid for equipment, not for an outcome.",
  },

  threats: {
    kicker: "Problem · safety",
    title: "Incidents happen — and nobody sees them in real time",
    items: [
      { name: "Fights and violence", text: "In the yard, the corridor, at break. Noticed only after it escalates.", cost: "Injury · litigation · reputation" },
      { name: "An armed person", text: "Someone entering the grounds with a weapon. Seconds decide the outcome.", cost: "Risk to life" },
      { name: "Smoking", text: "The far corners of the grounds. Repeats, never documented.", cost: "Health · discipline" },
      { name: "Fire", text: "Smoke and the first flames. Sensors take time to trigger.", cost: "Property · evacuation" },
    ],
    unwatched: "nobody watching",
    verdict: "The resolution requires detecting exactly these events — and no software here does it.",
  },

  quality: {
    kicker: "Problem · teaching quality",
    title: "The principal has no objective measure",
    items: [
      {
        title: "How the lesson is delivered",
        text: "The teacher's engagement, work with the class, the structure of the lesson — none of it is recorded anywhere.",
      },
      {
        title: "Student attention",
        text: "Who is following the lesson and who is not. There is no way to see this before the grades arrive.",
      },
      {
        title: "Phone distraction",
        text: "Phone use during lessons — the most common problem and the least often logged.",
      },
      {
        title: "Off-topic conversation",
        text: "Side conversations lower the quality of a lesson, but nothing measures them.",
      },
    ],
    verdict: "To manage teaching quality you must first measure it.",
  },

  parentsPain: {
    kicker: "Problem · parents",
    title: "Families know nothing about their child in real time",
    gaps: [
      { title: "Did they arrive, did they leave", text: "No reliable confirmation that the child reached school, or when they left." },
      { title: "Were they in class", text: "Attendance lives on paper, arrives in the evening, and sometimes never arrives at all." },
      { title: "Was there an incident", text: "A fight or a smoking case is often never mentioned to the family." },
    ],
    quote: "A parent's only source of information about their child is the child.",
    verdict: "There is no trusted channel between the school and the family.",
  },

  howItWorks: {
    kicker: "Solution",
    title: "The software layer that makes existing cameras perceive",
    steps: [
      { title: "Frame capture", text: "The existing camera stream. No new hardware." },
      { title: "Vision models", text: "Objects, motion and face vectors are resolved." },
      { title: "Incident analysis", text: "Dozens of frames collapse into one incident." },
      { title: "Severity", text: "A level is assigned, and who must be told is decided." },
      { title: "Panel and app", text: "Principal, staff and parent each see what concerns them." },
    ],
    keysTitle: "Three decisions",
    keys: [
      "Runs on the institution's OWN server — video never leaves",
      "Works offline — an outage does not stop the system",
      "We do not sell hardware — we sell a subscription",
    ],
    note: "The product itself is demonstrated in a separate deck: /taqdimot",
  },

  detectors: {
    kicker: "Solution · detectors",
    title: "Not mockups — records from a running system",
    cases: [
      { name: "Weapon detected", cam: "Moon gate", when: "15-09-2026 · 11:30", conf: "0.91" },
      { name: "Smoking detected", cam: "Camera 01", when: "14-09-2026 · 12:15", conf: "0.52" },
      { name: "Fight detected", cam: "IP PTZ Camera", when: "09-09-2026 · 18:58", conf: "high" },
    ],
    moreTitle: "Other detectors",
    more: ["Face recognition", "Unknown person", "Fire and smoke", "Phone distraction", "People counting", "Lateness"],
    note: "A confidence score is computed on every frame and stored with the incident record.",
  },

  lesson: {
    kicker: "Solution · lesson analysis",
    title: "Beyond safety — teaching quality",
    teacherTitle: "For the teacher",
    teacher: [
      "Engagement and movement dynamics through the lesson",
      "Time spent working with the class, and lesson structure",
      "Punctuality and how consistently lessons start on time",
    ],
    studentTitle: "For the student",
    student: [
      "Attention level during the lesson",
      "Phone distraction events",
      "Conversations unrelated to the class",
      "Mood and wellbeing dynamics",
    ],
    faceTitle: "Face-based recognition",
    faceText: "Attendance is logged automatically: entry, exit, lateness. No paper register.",
    frameNote: "Phone use detected during class · Camera 01",
    note: "The attention indicator is a derived value, not a sensor measurement. We state that openly.",
  },

  parentsApp: {
    kicker: "Solution · parents",
    title: "Families informed in real time, for the first time",
    shots: ["Home screen and attendance", "Incident alert", "Incident record — with the frame"],
    items: [
      { title: "Entry and exit times", text: "When the child arrived and left — confirmed by camera." },
      { title: "Attendance rate", text: "A monthly figure: days present, late and absent." },
      { title: "Incident alerts", text: "A fight, smoking or lateness — with the frame and the time, immediately." },
      { title: "Today's lessons", text: "Schedule, teacher and room on one screen." },
    ],
    note: "Several children can be linked to a single account.",
  },

  live: {
    kicker: "Real result",
    title: "The system is running right now",
    badge: "Live",
    sameDay: "All three — the same day",
    frames: [
      { label: "Smoking", cam: "Camera 01", when: "14-09 · 12:19" },
      { label: "Fight", cam: "Camera 01", when: "14-09 · 14:22" },
      { label: "Access control", cam: "Camera 01", when: "14-09 · 14:52" },
    ],
    events: [
      { type: "Weapon", when: "15 September, 11:30", cam: "Moon gate", conf: "0.91" },
      { type: "Smoking", when: "14 September, 12:15", cam: "Camera 01", conf: "52%" },
      { type: "Fight", when: "9 September, 18:58", cam: "IP PTZ Camera", conf: "high" },
      { type: "Lateness", when: "11 September, 10:44", cam: "Camera 01", conf: "100%" },
    ],
    factsTitle: "Active detectors",
    facts: [
      { label: "Institution", value: "School 179, Tashkent" },
      { label: "Mode", value: "Daytime, continuous" },
      { label: "Parent app", value: "Live" },
      { label: "Server", value: "Inside the building" },
    ],
    note: "The frames and alerts above were all captured at this school.",
  },

  results: {
    kicker: "Real result",
    title: "What changed",
    gains: [
      { num: "seconds", label: "Time to detect", note: "Previously — reviewing footage afterwards" },
      { num: "automatic", label: "Incident record", note: "Frame, video, time, location" },
      { num: "real time", label: "Parent awareness", note: "Previously — in the evening, verbally" },
      { num: "0", label: "New cameras", note: "The existing hardware is used" },
    ],
    verdict: "Equipment the institution had already paid for finally started producing a result.",
    note: "⚠️ This slide needs expanding: pilot duration, number of detections and accuracy should be filled in from real panel data.",
  },

  market: {
    kicker: "Market size",
    title: "Built bottom-up, from institution and student counts",
    tamLabel: "The whole education system, at full coverage",
    tamNote: "Annual recurring revenue",
    segNames: ["General secondary schools", "Colleges and technicums", "Higher education institutions"],
    segCols: { inst: "institutions", students: "students", price: "tariff / month", monthly: "at full coverage / mo" },
    source: "Institution and student counts — Statistics Committee, 2025/2026 academic year. Tariffs and revenue — our model.",
  },

  rivals: {
    kicker: "Competition",
    title: "They play on a different field",
    us: "Campus AI",
    list: [
      { name: "Global platforms", note: "Verkada, Avigilon" },
      { name: "Hardware vendors", note: "Hikvision, Dahua" },
      { name: "Local integrators", note: "Access control, CCTV" },
    ],
    rows: [
      "Runs on the institution's server",
      "Works without internet",
      "Uzbek interface and narration",
      "Detectors specific to education",
      "Lesson and attention analysis",
      "Parent application",
      "Aligned to the 2026 resolution",
      "Connects to existing cameras",
      "Priced per student",
    ],
    legend: { yes: "yes", partial: "partial", no: "no" },
    edgeTitle: "Three decisive advantages",
    edges: [
      "A price category 10× lower — global platforms license at $199–1,799 per camera per year",
      "Models trained on local data, and the Uzbek language",
      "Delivers the report the resolution asks for, ready-made",
    ],
    note: "Competitor capabilities assessed from public sources.",
  },

  profit: {
    kicker: "Revenue and profit",
    title: "Even one percent of this market is profitable",
    cols: { share: "Coverage", inst: "Institutions", revenue: "Annual revenue", profit: "Net profit", margin: "Margin" },
    highlight: "One percent of the market is roughly a hundred institutions.",
    breakevenLabel: "Break-even point",
    unitTitle: "One customer",
    unitLabels: {
      arpu: "Average monthly payment",
      margin: "Gross margin",
      payback: "Payback",
      ltv: "LTV / CAC",
    },
    note: "Costs have three parts: a fixed team, a per-institution service cost, and sales scaling with revenue. Modelled, not measured.",
  },

  finale: {
    titleA: "The state created the demand.",
    titleB: "The product is already running.",
    sub: "Campus AI — a video surveillance and monitoring ecosystem for educational institutions",
    points: [
      "A legal requirement with a 2027 deadline",
      "The product is built and live at School 179",
      "No local competitor built for education",
    ],
    ctaTalk: "Get in touch",
    ctaDeck: "Product deck",
    ctaSite: "Website",
    foot: "Market figures — Statistics Committee · revenue figures — modelled",
  },
};
