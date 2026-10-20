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
      "Weapon",
      "Abandoned object",
      "Attendance",
      "Lesson analysis",
      "Parent app",
      "School 179",
      "Results",
      "What we deliver",
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
      { at: 2.5, text: "A fight in the yard, an armed person on the grounds, a student smoking, a suspicious bag left in a classroom." },
      { at: 11.0, text: "All of it reaches the camera, but there is no system that detects it in real time and sends it to the person responsible." },
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
      { at: 2.0, text: "An armed person detected. Smoking detected. A fight detected in the school yard." },
      { at: 12.0, text: "These are not mockups. These are records from a system that is running." },
    ],

    /* 8 — WEAPON */
    [
      { at: 0.0, text: "Now the highest-priority alert: a weapon." },
      { at: 3.0, text: "The model recognises a person entering the grounds with a gun, from shape and context, the moment they appear on camera." },
      { at: 10.0, text: "The alert goes at once to the duty officer, the principal and, if needed, the police inspector." },
    ],

    /* 9 — ABANDONED OBJECT */
    [
      { at: 0.0, text: "Next, an abandoned object." },
      { at: 2.5, text: "If a bag is separated from its owner and stays still for more than sixty seconds in a classroom, an alert is raised." },
      { at: 9.0, text: "The system then searches for the owner: the frame of the last person seen with the bag is matched across the other cameras." },
      { at: 15.5, text: "That person is found in the classroom, the corridor, at the exit and in the school yard, and their path is shown frame by frame." },
      { at: 22.0, text: "An evacuation decision is made quickly." },
    ],

    /* 10 — ATTENDANCE */
    [
      { at: 0.0, text: "Attendance is one of the strongest parts of the system." },
      { at: 3.0, text: "First, the entrance camera recognises each student by face: of twenty-eight students, twenty-five passed the face check and three did not — they did not come to school." },
      { at: 9.0, text: "Then the classroom camera counts the room: in the first lesson, twenty-five students are seated." },
      { at: 15.5, text: "By the end of the last lesson, only seventeen of twenty-eight remain." },
      { at: 20.5, text: "Eleven students are missing from class in total, and the system counts it automatically." },
    ],

    /* 11 — LESSON ANALYSIS */
    [
      { at: 0.0, text: "The system also analyses the lesson itself." },
      { at: 2.8, text: "The camera sees the teacher's activity, the students' attention, and phone distraction." },
      { at: 9.5, text: "Voice analysis listens to what the teacher says and decides whether each statement is relevant to the lesson." },
      { at: 17.0, text: "Camera and voice together rate how the teacher runs the lesson." },
      { at: 22.5, text: "As a result, each teacher's ability to run a lesson is rated and a teacher ranking is formed." },
    ],

    /* 12 — PARENT APP */
    [
      { at: 0.0, text: "And the parent sees all of it on a phone." },
      { at: 3.0, text: "Arrival and departure times, the attendance rate, today's lessons, and if something happens, an alert with the frame." },
      { at: 13.5, text: "This is the first reliable channel between the school and the family." },
    ],

    /* 13 — SCHOOL 179 */
    [
      { at: 0.0, text: "Now the most important part. This system is running right now." },
      { at: 5.0, text: "At school number one seventy nine in Tashkent, the fight, smoking and attendance detectors are live." },
      { at: 14.5, text: "Every frame you have just seen came from that school." },
    ],

    /* 14 — RESULTS */
    [
      { at: 0.0, text: "So what does it deliver?" },
      { at: 1.8, text: "Incidents are detected in seconds, manual reporting disappears, and every case is documented with a frame." },
      { at: 11.5, text: "And most importantly, the school principal and responsible staff are informed in real time." },
    ],

    /* 15 — WHAT WE DELIVER */
    [
      { at: 0.0, text: "So what do we deliver to the school?" },
      { at: 2.5, text: "First, attendance. The roll call runs on face ID, at the start of the lesson and at the end. The system counts the students in the room and automatically lists those who came to school but did not attend the lesson, or left it." },
      { at: 8.5, text: "Second, the teacher ranking: teachers are rated one after another by how they deliver lessons." },
      { at: 15.0, text: "Third, safety: weapons, fights, smoking and abandoned objects are detected in real time and sent to the person responsible." },
    ],

    /* 16 — CLOSE */
    [
      { at: 0.0, text: "Two things to close on." },
      { at: 2.0, text: "The state created the demand with a twenty twenty seven deadline. The product is built and running in a school." },
      { at: 11.5, text: "We are ready for your questions." },
    ],
  ],

  /* ───────────────────────────── slide copy ─────────────────────────── */

  intro: {
    titleA: "The cameras are there.",
    titleB: "The perception is not.",
    sub: "Campus AI — an artificial intelligence ecosystem for educational institutions",
    stats: ["institutions in market", "students and pupils", "school running live"],
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
    title: "Incidents happen — and no system detects them in real time and alerts the responsible person",
    items: [
      { name: "Fights and violence", text: "In the yard, the corridor, at break. Noticed only after it escalates.", cost: "Injury · litigation · reputation" },
      { name: "An armed person", text: "Someone entering the grounds with a weapon. Seconds decide the outcome.", cost: "Risk to life" },
      { name: "Smoking", text: "The far corners of the grounds. Repeats, never documented.", cost: "Health · discipline" },
      { name: "Abandoned object", text: "A bag left unattended in a classroom or corridor. Nobody notices it.", cost: "Risk to life · evacuation" },
    ],
    unwatched: "not sent to anyone",
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
      { name: "Armed person", cam: "2-FAYE KUCHA", when: "10-10-2026 · 12:37", conf: "" },
      { name: "Smoking detected", cam: "Camera 01", when: "14-09-2026 · 12:15", conf: "0.52" },
      { name: "Fight detected", cam: "IP PTZ Camera", when: "09-09-2026 · 18:58", conf: "high" },
      { name: "Phone call detected", cam: "Camera 01", when: "20-10-2026 · 13:05", conf: "" },
    ],
    allTitle: "The system detects",
    all: [
      "Fights",
      "Armed persons",
      "Knives and cold weapons",
      "Aggressive behaviour",
      "Smoking",
      "Phone use",
      "Abandoned objects",
      "Student count in the room",
      "Attendance (face + room)",
      "Lesson quality and voice analysis",
    ],
    moreTitle: "Other detectors",
    more: ["Face recognition", "Unknown person", "Fire and smoke", "People counting", "Lateness"],
    note: "A confidence score is computed on every frame and stored with the incident record.",
  },

  knife: {
    kicker: "Technology",
    title: "Weapon detection",
    sub: "The highest-priority alert — not a second of delay",
    live: "Live",
    cam: "2-FAYE KUCHA",
    when: "10.10.2026 · 12:37",
    alertTitle: "Armed person detected — 2-FAYE KUCHA",
    alertText: "School grounds · priority: HIGH · sent to the duty officer and the principal",
    sections: [
      {
        title: "How it works",
        text: "An object-detection model (YOLO family) recognises dangerous items held in a hand — a gun, a long metal object — from shape and context. The model is tuned for school settings: corridor, yard, canteen, gym.",
      },
      {
        title: "Result",
        text: "Action is taken the moment it appears on camera — not after it is used.",
      },
      {
        title: "Priority and accountability",
        text: "The alert goes at once to the duty officer, the principal and security staff, and to the police inspector if needed. Every alert arrives with a video frame.",
      },
    ],
    footer: "Campus AI safety core",
  },

  abandoned: {
    kicker: "Technology",
    title: "Abandoned object detection",
    sub: "An international counter-terrorism standard measure",
    live: "Live",
    cam: "CAM 08 — Classroom 204",
    when: "20.10.2026 · 14:15:33",
    alertTitle: "Abandoned object — CAM 08",
    alertText: "Classroom 204 · still for over 60 seconds · sent to security staff",
    search: {
      title: "Finding the owner",
      queryLabel: "Search frame",
      scanning: "Searching the archive cameras…",
      found: "Found",
      archiveLabel: "Archive frame · Classroom 204",
      ownerFound: "Bag owner found",
      steps: [
        { place: "Classroom", text: "At the desk with the bag" },
        { place: "Corridor", text: "Walking through the corridor" },
        { place: "Exit", text: "Leaving the building" },
        { place: "School yard", text: "Entering from the yard" },
      ],
      result: "The system finds the same person on other cameras and shows their path frame by frame.",
    },
    sections: [
      {
        title: "How it works",
        text: "The AI keeps a constant background model and logs any new static object in frame — a bag, a package, a box. If it separates from its owner and stays still for a set time (for example 60 seconds), an alert is raised.",
      },
      {
        title: "Result",
        text: "The system shows in the archive footage who left the item — so an evacuation decision is made quickly.",
      },
      {
        title: "Where it matters",
        text: "Main entrance, corridors, assembly hall, canteen, gym, classrooms — anywhere crowds gather. A suspicious item does not stay unnoticed for long.",
      },
    ],
    footer: "Campus AI safety core",
  },

  attendance: {
    kicker: "Solution · attendance",
    title: "Attendance — fully real, two sources cross-checked",
    sub: "A student in the building but not in the lesson — the system finds them",
    flow: [
      { title: "At the entrance, by face", text: "The entrance camera recognises each student by face: 25 of 28 passed the face check, 3 did not — they did not come.", tag: "Camera 01 · entrance" },
      { title: "First lesson", text: "The classroom camera counts the students in the room: 25 of 28 are seated.", tag: "Classroom camera" },
      { title: "End of the last lesson", text: "In the same class only 17 of 28 are left.", tag: "Classroom camera" },
    ],
    resultLabel: "students missing from class",
    alertTitle: "Class attendance alert",
    alertText: "In the first lesson 25 of 28 were seated; by the end of the last lesson 17 remained. In total 11 students are not in the lesson: 3 did not come, 8 left. Counted automatically.",
    points: [
      "The number of students in the room is counted in real time",
      "Face-check entries and lesson headcount are compared automatically",
      "How many students are not in the lesson is calculated automatically",
      "No paper register and no manual marking",
    ],
    note: "Frames are from a real classroom camera, 20.10.2026. 11 = 28 − 17: 3 did not pass the entrance face check (did not come), 8 left during the day.",
  },

  lesson: {
    kicker: "Solution · lesson analysis",
    title: "Beyond safety — teaching quality",
    teacherTitle: "For the teacher",
    teacher: [
      "Engagement and movement dynamics through the lesson",
      "Time spent working with the class, and lesson structure",
      "Punctuality and how consistently lessons start on time",
      "Voice-based analysis of the lesson",
    ],
    studentTitle: "For the student",
    student: [
      "Attention level during the lesson",
      "Phone distraction events",
      "Aggressive behaviour and conversations unrelated to the class",
      "Mood and wellbeing dynamics",
    ],
    faceTitle: "Face-based recognition",
    faceText: "Attendance is logged automatically: entry, exit, lateness. No paper register.",
    frameNote: "Phone use detected during class · Camera 01",
    note: "The attention indicator and lesson rating are derived values, not sensor measurements. The voice analysis and ranking examples are illustrative. We state that openly.",
    rank: {
      title: "Teacher ranking",
      rows: [
        { name: "Rahimova N.", value: 91 },
        { name: "Yusupov A.", value: 84 },
        { name: "Karimova D.", value: 79 },
      ],
    },
    card: { role: "Teacher", name: "Dilnoza Karimova", subject: "English · Class 5-B", scoreLabel: "Overall score" },
    camTitle: "Camera analysis",
    camChips: ["Teacher active", "Class attention", "Phone detected"],
    voice: {
      title: "Voice analysis",
      status: "Lesson audio is being analysed",
      lines: [
        { who: "Teacher", text: "Today we will review present-tense adjectives.", onTopic: true },
        { who: "From the class", text: "Did you watch the football yesterday?", onTopic: false },
        { who: "Teacher", text: "Let's work through the example together.", onTopic: true },
      ],
      onLabel: "On topic",
      offLabel: "Off topic",
      scoreTitle: "Lesson delivery rating",
      scores: [
        { label: "Relevance to the topic", value: 86 },
        { label: "Explanation and Q&A", value: 78 },
        { label: "Class attention", value: 72 },
      ],
      verdict: "Lesson delivery rated",
    },
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
    kicker: "Result",
    title: "What it delivers",
    gains: [
      { num: "seconds", label: "Time to detect", note: "Previously — reviewing footage afterwards" },
      { num: "automatic", label: "Incident record", note: "Frame, video, time, location" },
      { num: "real time", label: "Principal and staff awareness", note: "Previously — late, verbally" },
      { num: "0", label: "New cameras", note: "The existing hardware is used" },
    ],
    verdict: "Equipment the institution had already paid for finally started producing a result.",
    note: "",
  },

  offer: {
    kicker: "What we deliver",
    title: "Three core values",
    items: [
      {
        title: "Attendance",
        points: [
          "Face ID roll call: at the start and at the end of the lesson",
          "Students in the room are counted every lesson",
          "Students who came to school but skipped or left the lesson appear automatically",
          "No paper register",
        ],
      },
      { title: "Ranking", points: [] },
      {
        title: "Safety",
        points: [
          "Weapons, fights, smoking, abandoned objects",
          "Real-time detection",
          "Instant alert to the principal and responsible staff",
        ],
      },
    ],
    stats: { start: "In room at lesson start", end: "In room at lesson end", gone: "At school, not in lesson" },
    rank: {
      caption: "Teacher ranking",
      rows: [
        { name: "N. Rahimova", subject: "Mathematics", value: 91 },
        { name: "A. Yusupov", subject: "Physics", value: 84 },
        { name: "D. Karimova", subject: "English", value: 79 },
        { name: "B. Saidov", subject: "History", value: 73 },
      ],
    },
    note: "The ranking is an illustrative example. Everything runs on the institution's own server, on top of existing cameras.",
  },

  finale: {
    titleA: "The state created the demand.",
    titleB: "The product is already running.",
    sub: "Campus AI — a video surveillance and monitoring ecosystem for educational institutions",
    points: [
      "A legal requirement with a 2027 deadline",
      "The product is built and live at School 179",
    ],
    ctaTalk: "Get in touch",
    ctaDeck: "Product deck",
    ctaSite: "Website",
    foot: "Campus AI · artificial intelligence for educational institutions",
  },
};
