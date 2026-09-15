import type { ShowCopy } from "./types";

/**
 * PRESENTATION COPY — ENGLISH.
 *
 * The voice is the PRESENTER'S: we introduce the product, the system is
 * referred to in the third person. The AI never speaks about itself.
 *
 * ⚠️ THERE IS NO OPERATOR ROLE in the product — everything is automatic.
 * Where a human is needed, say "responsible officer"; for repeat cases,
 * the prevention inspector, the National Guard and Internal Affairs.
 *
 * Mirrors `uz.ts` field for field. The `at` values in `narration` are the
 * PLANNED cue times; once narration audio is generated
 * (`tools/build-narration.py`) they are replaced by measured offsets in
 * `narrationAudio.ts`, so these numbers only matter in silent mode.
 *
 * ⚠️ The narration text is also what gets sent to the English TTS service.
 * Keep sentences short and spell out large numbers the way they should be
 * read aloud.
 */
export const EN: ShowCopy = {
  lang: "en",
  langLabel: "English",

  gate: {
    sub: "An AI video-surveillance and monitoring ecosystem for educational institutions",
    start: "Start the presentation",
    note: "With narration · best viewed full screen",
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
      "The problem",
      "How it works",
      "AI detectors",
      "Rapid response",
      "Threat escalation",
      "Attendance",
      "Student wellbeing",
      "Teachers & lessons",
      "Parent app",
      "Control panel",
      "Coverage & 3D campus",
      "Security",
      "Advantages",
      "Market & pricing",
      "Closing",
    ],
  },

  roadmap: "Next stage",
  derived: "Derived indicator",

  narration: [
    /* 0 — OPENING */
    [
      { at: 0.0, text: "Good day." },
      { at: 2.0, text: "Let us introduce Campus AI, an artificial intelligence ecosystem for safety and monitoring in educational institutions." },
      { at: 9.5, text: "Today we will walk you through a single day of its work, from start to finish." },
    ],

    /* 1 — PROBLEM */
    [
      { at: 0.0, text: "Your institution already has cameras." },
      { at: 3.4, text: "But they only record. And you watch the recording after the incident is over." },
      { at: 9.0, text: "Even the most experienced guard cannot watch dozens of screens at once." },
      { at: 13.6, text: "Campus AI sees every frame, every second." },
    ],

    /* 2 — MECHANISM */
    [
      { at: 0.0, text: "Now the most important question. How exactly does the system work?" },
      { at: 4.0, text: "Step one. The stream from a camera you already own arrives at the surveillance post. No new hardware is added." },
      { at: 10.5, text: "Step two. The stream is split into frames. The model does not watch video, it looks at frames." },
      { at: 16.5, text: "Step three. A computer vision model gives every object in the frame a box and a confidence score." },
      { at: 23.5, text: "Step four. One person is tracked from frame to frame under a single identifier. The face vector is compared against the vectors in the institution's own database." },
      { at: 32.0, text: "Step five. Filtering by confidence threshold, zone and time. Dozens of frames from one passage collapse into a single event." },
      { at: 40.0, text: "Step six. The event is logged automatically: on the panel, as an audible alert, and in the parent app. Depending on its severity it is routed to the responsible officer or to external services." },
      { at: 47.5, text: "And all of this runs on the institution's own server." },
    ],

    /* 3 — DETECTORS */
    [
      { at: 0.0, text: "So what can the ecosystem detect?" },
      { at: 3.4, text: "Face recognition. Known people and strangers." },
      { at: 8.5, text: "Weapons. The moment one appears in frame, the alarm is raised." },
      { at: 14.0, text: "Fights and violence. A scuffle is caught before it escalates." },
      { at: 20.0, text: "Smoking. Rule violations on the grounds are logged." },
      { at: 25.0, text: "Phone use. Discipline during lessons." },
      { at: 30.0, text: "Unknown person. If someone who is not in the database enters the grounds, the system reports it immediately." },
      { at: 35.0, text: "And people counting. Who crossed the line in, and who crossed it out." },
    ],

    /* 4 — RAPID RESPONSE */
    [
      { at: 0.0, text: "An incident has happened. Now count the seconds." },
      { at: 3.4, text: "In less than one second the model detects it and calculates the confidence level." },
      { at: 8.6, text: "By the second second it is on the control screen, with the frame, the camera and the location." },
      { at: 13.4, text: "By the twelfth second the responsible staff member knows." },
      { at: 17.0, text: "The case file is assembled automatically: frame, video, time and place. It goes to the responsible officer and into the archive." },
    ],

    /* 5 — THREAT ESCALATION */
    [
      { at: 0.0, text: "Now let us look closely at the two most important scenarios. A fight, and a weapon." },
      { at: 6.0, text: "A fight. The model detects sharp movement between two or more people, from their posture and the speed of motion." },
      { at: 14.0, text: "The frame and the incident video are stored automatically. A high level alert appears on the panel and an audible signal on the control screen." },
      { at: 22.0, text: "The security officer gets a notification and the camera point on the map. If the student is recognised, the parent is notified too." },
      { at: 31.0, text: "The incident enters the log automatically and is attached to that person's history. Statistics then show where and when fights repeat. If the pattern continues, a referral to the prevention inspector is generated." },
      { at: 44.0, text: "The weapon scenario is different. Here the system does not wait for confirmation." },
      { at: 49.0, text: "As soon as the model finds a weapon-like object, the level becomes critical at once. A siren, a full screen alarm on every control screen, and the camera stream opens automatically." },
      { at: 61.0, text: "Management and the responsible officer are notified at the same moment. A ready case file — frame, video, time and place — is sent automatically to the National Guard and the Ministry of Internal Affairs." },
      { at: 72.0, text: "If the signal was wrong, the responsible officer flags it and the model threshold is tuned automatically for that specific camera." },
    ],

    /* 6 — ATTENDANCE */
    [
      { at: 0.0, text: "Safety is only half of the work." },
      { at: 3.2, text: "The moment a student walks through the door, the system recognises the face and records attendance itself." },
      { at: 9.0, text: "On time, late, absent. The daily register builds itself." },
      { at: 14.2, text: "No paper journal, no person on duty. The institution sets the lateness threshold." },
    ],

    /* 7 — STUDENT WELLBEING */
    [
      { at: 0.0, text: "Attendance is not only about present or absent." },
      { at: 4.5, text: "At every recognition the camera also records the facial expression. Positive, neutral or negative. From that, a mood curve for the whole day is built." },
      { at: 14.5, text: "An attention indicator is calculated per lesson. We say this openly: it is not a measurement, it is derived from the mood records. There is no sensor measuring attention." },
      { at: 26.0, text: "If anger appears in the label, or several negative records follow one another in a short window, the system raises an aggression flag and writes down the reason." },
      { at: 36.0, text: "Is the child under pressure? The system does not diagnose. It only gathers signals: repeated negative mood, involvement in incidents, a sharp break in attendance, more time spent alone." },
      { at: 50.0, text: "Those signals go to the class teacher and the school psychologist. The decision always stays with a human." },
    ],

    /* 8 — TEACHERS AND LESSON QUALITY */
    [
      { at: 0.0, text: "A separate section for the head of the institution. Oversight of teachers and staff." },
      { at: 5.5, text: "Staff arrivals and departures are recorded through face recognition, exactly like students. Who entered the lesson on time, and who did not, is visible in the schedule." },
      { at: 14.5, text: "During the lesson the overall mood of the class and the attention indicator are recorded. Lessons where students were focused can be compared with lessons where they were not." },
      { at: 25.0, text: "In the next stage a speech analysis module is added. The teacher's speech is transcribed and the lesson is scored: talking share, question frequency, silence gaps, drifting off topic." },
      { at: 39.0, text: "The result is not a bare score but a concrete recommendation. For example: attention dropped during the third lesson, increase the share of questions and answers." },
      { at: 50.0, text: "The goal is not to police the teacher, but to let the teacher see their own lesson from the outside." },
    ],

    /* 9 — PARENT APP */
    [
      { at: 0.0, text: "The school works with the ecosystem through the panel. The parent works through a phone." },
      { at: 5.5, text: "The moment a child passes the door, the arrival and departure times appear in the app. With the camera and the hours spent inside." },
      { at: 13.5, text: "Monthly attendance, today's lessons, the teacher and the room number, all on one screen." },
      { at: 20.0, text: "The mood curve and the per lesson attention are here too. Parents can see which subject their child is active in, and which one they fade in." },
      { at: 29.0, text: "If smoking, a fight or a late arrival is detected, the notification arrives at once. With the camera frame, the confidence level, the time and the place." },
      { at: 38.0, text: "And if there is more than one child, they all live in the same account." },
    ],

    /* 10 — CONTROL PANEL */
    [
      { at: 0.0, text: "All control in one panel." },
      { at: 2.8, text: "The dashboard: today's attendance, the live map, the latest entries." },
      { at: 7.6, text: "Alerts. A queue of incidents waiting to be confirmed." },
      { at: 11.8, text: "Detections. The full archive: frame, video and person history." },
      { at: 16.4, text: "Cameras, statistics, reports and settings. Everything is here." },
      { at: 21.0, text: "In three languages: Uzbek, Russian and English." },
    ],

    /* 11 — COVERAGE */
    [
      { at: 0.0, text: "The ecosystem is built to work not in one building, but across the whole republic." },
      { at: 5.0, text: "And it covers every level of education: preschool, school, college and technical school, and higher education." },
      { at: 14.0, text: "Fourteen regions and thousands of camera points on one live map. Every camera sits at its exact location, with its field of view." },
      { at: 24.0, text: "An alarm lights up on the very camera that raised it. And the campus is shown in three dimensions, floor by floor." },
    ],

    /* 12 — SECURITY */
    [
      { at: 0.0, text: "And now the most important part — your data." },
      { at: 3.4, text: "The system runs on the institution's own server and never reaches out to the internet." },
      { at: 8.4, text: "The map, the fonts, the face database. All of it stays inside." },
      { at: 12.4, text: "Images and video are visible only to a signed in user. Access keys stay on the server and never reach the browser." },
      { at: 19.0, text: "Only accounts created by the administrator can sign in." },
    ],

    /* 13 — ADVANTAGES */
    [
      { at: 0.0, text: "Ordinary video surveillance records the past. Campus AI sees the present." },
      { at: 5.0, text: "Without hiring extra staff, the level of safety goes up." },
      { at: 9.6, text: "Without buying new cameras, the ones you own become intelligent." },
      { at: 14.0, text: "Paperless attendance, ready made statistics, exportable reports." },
      { at: 18.0, text: "And the most valuable thing of all — time. Those seconds before an incident escalates." },
    ],

    /* 14 — MARKET AND REVENUE */
    [
      { at: 0.0, text: "Now to the numbers." },
      { at: 2.5, text: "According to the State Statistics Committee, the republic has eleven thousand one hundred and eighteen schools and six point eight seven million students." },
      { at: 13.0, text: "Colleges and technical schools: more than five hundred institutions. Higher education: two hundred and fifteen institutions and one and a half million students." },
      { at: 24.0, text: "The model is simple. A monthly subscription charged per student. Five thousand soum for a school, ten thousand for a college, fifteen thousand for higher education." },
      { at: 37.0, text: "Together, at full coverage, the three segments are a market of over sixty billion soum a month, and seven hundred and twenty five billion soum a year." },
      { at: 49.0, text: "By coverage: one percent is seven billion soum a year. Five percent, thirty six billion. Ten percent, seventy two billion. Twenty five percent, one hundred and eighty one billion soum." },
      { at: 66.0, text: "Right now a live pilot is running in one school. The next step is coverage at regional scale." },
    ],

    /* 15 — CLOSING */
    [
      { at: 0.0, text: "Campus AI." },
      { at: 2.0, text: "You always had cameras. Now they have eyes." },
      { at: 6.5, text: "We are happy to take your questions. Thank you." },
    ],
  ],

  intro: {
    sub: "Safety in education — under the watch of artificial intelligence",
    stats: ["colleges covered", "regions on one map", "continuous monitoring", "AI detectors"],
  },

  problem: {
    kicker: "The problem",
    title: "Cameras everywhere. No perception.",
    points: [
      { lead: "Archive only.", text: "The footage exists, but you open it after the fact, when someone goes looking." },
      { lead: "The human limit.", text: "One guard cannot follow dozens of streams at once — attention fades, focus drifts." },
      { lead: "Late by design.", text: "An alert that arrives once the fight is over is worth nothing." },
    ],
    quote: "“Even the most experienced guard cannot watch dozens of screens at once.”",
    hudAi: "AI analysing",
    hudRec: "Recording only",
    channels: "12 / 12 CHANNELS",
    footer: "Every frame · every second · without a pause",
  },

  pipeline: {
    kicker: "What happens inside",
    title: "How a frame becomes an event",
    steps: [
      {
        title: "Stream",
        text: "The stream from an IP camera you already own arrives at the surveillance post. No camera is replaced, no hardware is added.",
        meta: "RTSP · existing cameras",
      },
      {
        title: "Frames",
        text: "The stream is split into several frames per second. The model does not watch video — it looks at a frame.",
        meta: "≈ 5 frames / second",
      },
      {
        title: "Model",
        text: "A computer vision model finds every object in the frame and gives it a bounding box and a confidence score.",
        meta: "box + 0.00 … 1.00",
      },
      {
        title: "Tracking",
        text: "One person is followed from frame to frame under a single identifier. The face vector is matched against the institution's own database.",
        meta: "one person — one ID",
      },
      {
        title: "Filter",
        text: "Filtering by confidence threshold, zone and time. Dozens of frames from a single passage collapse into ONE event.",
        meta: "deduplication",
      },
      {
        title: "Event",
        text: "An alert on the panel, an audible signal, and a message in the parent app. Routed automatically by severity.",
        meta: "automatic routing",
      },
    ],
    note: "Neither the frame nor the face vector ever leaves the institution's server.",
  },

  detectors: {
    kicker: "AI detectors",
    title: "What Campus AI detects",
    dets: [
      { name: "Face recognition", note: "Known people and strangers", label: "Person identified", cam: "CAM-01 · Main entrance" },
      { name: "Weapon", note: "Alarm the moment a weapon enters the frame", label: "Weapon detected", cam: "CAM-04 · Central corridor" },
      { name: "Fight and violence", note: "Caught before it escalates", label: "Fight detected", cam: "CAM-07 · Courtyard" },
      { name: "Smoking", note: "Rule violations are logged", label: "Smoking detected", cam: "CAM-01 · Courtyard" },
      { name: "Phone use", note: "Discipline during lessons", label: "Phone detected", cam: "CAM-09 · Room 204" },
      { name: "Unknown person", note: "Someone not in the database on site", label: "Unknown person", cam: "CAM-02 · Gate" },
      { name: "People counting", note: "Line crossings in and out", label: "In 128 · Out 94", cam: "CAM-01 · Main entrance" },
    ],
    live: "Live",
    idle: "Loading models…",
    real: "Real footage",
    own: "Box drawn by the model",
    footer: "Every event is logged with its frame, timestamp and camera — the system routes it to the responsible officer itself.",
    stamp: "14.09.2026 · 09:12:04",
  },

  response: {
    kicker: "Rapid response",
    title: "From incident to response — 12 seconds",
    since: "Since the incident",
    seconds: "SECONDS",
    active: "Active alarm",
    confirmed: "Incident logged",
    dossier: "The case file holds the full frame, the detection box, the incident video and where else that person has been seen.",
    clip: "Incident video · CAM-01",
    steps: [
      { title: "The incident happens", text: "The camera keeps streaming as usual" },
      { title: "AI detects it", text: "The model locates the target and scores its confidence — 0.88" },
      { title: "On the control screen", text: "An alert with the frame, camera name and map location" },
      { title: "Responsible staff notified", text: "Notification bell, audible alert and the parent app" },
      { title: "Case file", text: "Frame, video, time and place are attached automatically and filed in the archive" },
    ],
  },

  threats: {
    kicker: "Escalation chain",
    title: "What happens after a threat is detected",
    fight: {
      name: "Fight and violence",
      level: "High level",
      conf: "confidence 0.88",
      steps: [
        { title: "Detection", text: "The model finds sharp movement between two or more people from posture and motion speed" },
        { title: "Evidence stored", text: "The frame and the incident video are written automatically, tied to the camera and the timestamp" },
        { title: "Alarm", text: "A high level alert on the panel and an audible signal on the control screen" },
        { title: "Notification", text: "The security officer gets a notification and the camera point on the map; the parent of a recognised student is notified too" },
        { title: "Log and history", text: "The incident enters the log automatically and is attached to that person's history" },
        { title: "Prevention", text: "Statistics show where and when fights repeat; a referral to the prevention inspector is generated" },
      ],
    },
    weapon: {
      name: "Weapon",
      level: "Critical level",
      conf: "confidence 0.86",
      steps: [
        { title: "Detection", text: "The model finds a weapon-like object — confirmation is NOT awaited" },
        { title: "Siren", text: "An audible signal and a full screen alarm on every control screen" },
        { title: "Stream opens", text: "The live camera stream opens automatically and the recording is locked against deletion" },
        { title: "Simultaneous alert", text: "The responsible officer and the management are notified at the same moment" },
        { title: "External services", text: "Frame, video, time and place — sent automatically to the National Guard and Internal Affairs" },
        { title: "Wrong signal", text: "If the responsible officer flags it, the model threshold is tuned automatically for that camera" },
      ],
    },
    note: "The level depends on the event type: a fight is handled inside the institution, a weapon goes straight to external services.",
  },

  attendance: {
    kicker: "Everyday work",
    title: "Attendance records itself — no paper",
    searching: "Searching for a face…",
    person: "A. Rahimov · 0.96",
    cam: "CAM-01 · Main entrance",
    recorded: "Attendance recorded",
    recordedMeta: " · 08:42 · on time",
    recordedNote: "Not a single mark entered by hand.",
    tiles: ["On time", "Late", "Absent", "Excused"],
    weekTitle: "Weekly attendance trend",
    weekDays: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
    chips: ["Lateness threshold — set from the panel", "Students · teachers · staff tracked separately", "CSV export"],
  },

  wellbeing: {
    kicker: "Student wellbeing",
    title: "More than present or absent",
    dayTitle: "Mood through the day",
    lessonsTitle: "Attention per lesson",
    moods: ["Positive", "Neutral", "Negative"],
    attention: "Attention",
    flagTitle: "Aggression flag · 11:20",
    flagText: "Several negative mood records followed one another in a short window.",
    flagReason: "The reason is always written down — the flag is never a black box.",
    signalsTitle: "Pressure signals — not a diagnosis",
    signals: [
      { title: "Repeated negative mood", text: "When negative records dominate for several days in a row, the class teacher is shown it." },
      { title: "Involvement in incidents", text: "The same person appearing again and again in fight or smoking events." },
      { title: "Attendance breaking down", text: "A sharp rise in lateness and absence, at the same time as mood drops." },
      { title: "Time spent alone", text: "More time seen away from the group, in the same corner, during breaks." },
    ],
    note: "The system does not diagnose and does not judge. It gathers signals and routes them to the class teacher and the psychologist — the decision stays with a human.",
  },

  teachers: {
    kicker: "For management",
    title: "Teacher and lesson quality oversight",
    items: [
      { title: "Staff attendance", text: "Teacher and staff arrivals are recorded through face recognition — who entered which lesson on time is visible in the schedule." },
      { title: "State of the lesson", text: "The overall mood of the class and the attention indicator are recorded through the lesson." },
      { title: "Lessons compared", text: "Which lesson held the students' focus and which did not, side by side in one table." },
      { title: "Speech analysis", text: "The teacher's speech is transcribed and the lesson is scored: talking share, question frequency, silence, drifting off topic." },
    ],
    metricsTitle: "Lesson card · lesson 3 · Chemistry",
    metrics: [
      { label: "Teacher talking share", value: "78%" },
      { label: "Question frequency", value: "4 / 40 min" },
      { label: "Class attention", value: "61%" },
      { label: "Negative mood share", value: "18%" },
    ],
    adviceTitle: "System recommendation",
    advice: [
      "Attention fell to 61% after minute 20 of the third lesson.",
      "Increasing the share of questions is recommended — the class only listened for 12 minutes straight.",
      "Attention was 84% in lessons one and two — that format can be used as a reference.",
    ],
    note: "The goal is not to police the teacher, but to let them see their own lesson from the outside.",
  },

  coverage: {
    kicker: "Coverage",
    title: "Not one building — the whole republic",
    segments: [
      { num: "38,058", label: "Preschool" },
      { num: "11,118", label: "Schools" },
      { num: "500+", label: "Colleges" },
      { num: "215", label: "Higher education" },
    ],
    segmentsNote: "Source: State Statistics Committee (2025/2026). Colleges — approximate, from ministry registers.",
    meta: "14 regions · 1,280+ camera points",
    alert: "Alarm · Tashkent city · CAM-07",
    campusTitle: "3D campus — floor by floor",
    campusNote: "Every camera sits at its exact location with its field of view. An alarm lights up on the camera that raised it.",
    regions: {
      "Toshkent shahri": "Tashkent",
      "Samarqand viloyati": "Samarkand",
      "Farg‘ona viloyati": "Fergana",
      "Qoraqalpog‘iston Respublikasi": "Karakalpakstan",
      "Buxoro viloyati": "Bukhara",
    },
  },

  control: {
    kicker: "Control",
    title: "Every control in a single panel",
    items: [
      { title: "Dashboard", text: "Overall status, live map and 3D campus" },
      { title: "Alerts", text: "The queue of new events — not yet reviewed" },
      { title: "Detections", text: "The full archive: frame, video and person history" },
      { title: "Incidents", text: "Dangerous events and their videos" },
      { title: "Cameras", text: "Live streams and camera health" },
      { title: "People", text: "Students, teachers and staff" },
      { title: "Statistics", text: "Attendance and incident breakdowns" },
      { title: "AI analysis", text: "Measured conclusions — no invented numbers" },
      { title: "Geo analytics", text: "Analysis by region" },
      { title: "Institutions", text: "Regions and institutions breakdown" },
      { title: "Reports", text: "Attendance reports and CSV export" },
      { title: "Settings", text: "Lateness threshold, cameras, accounts" },
    ],
    chips: [
      "O'zbek · Русский · English",
      "Dark and light themes",
      "Voice commands — “go back to the dashboard”",
      "Global search · notification bell · audible alerts",
    ],
  },

  parents: {
    kicker: "For parents",
    title: "Parents see their child from their phone",
    shots: ["Home screen", "Alert", "Event detail"],
    items: [
      { title: "Arrival and departure", text: "The moment the child passes the door, both times are in the app — with the camera and the hours spent inside." },
      { title: "Attendance rate", text: "A monthly percentage: days present, days late and days missed, each counted separately." },
      { title: "Mood and attention", text: "The mood curve through the day and attention per lesson — which subject the child is active in, and which one they fade in." },
      { title: "Today's lessons", text: "The timetable, subject, teacher and room number, right on the home screen." },
      { title: "Instant alerts", text: "If smoking, a fight or a late arrival is detected, the notification arrives at once — with the frame, time, place and confidence." },
      { title: "More than one child", text: "All in a single account, each on its own card, one tap to switch." },
    ],
    chips: ["With the camera frame", "Confidence level shown", "Notification history kept", "Android · iOS"],
  },

  security: {
    kicker: "Privacy",
    title: "Your data never leaves the building",
    left: [
      { title: "On-premise server", text: "The system runs on the institution's own server — no cloud." },
      { title: "No internet access", text: "Map, fonts and models are all local. No outbound calls to external services." },
      { title: "Face database stays in", text: "Biometric data never leaves the institution's network." },
    ],
    right: [
      { title: "Protected media", text: "Images and video are visible only to a signed in user." },
      { title: "Keys stay on the server", text: "Access keys are never exposed to the browser." },
      { title: "Accounts under control", text: "Only administrator-created accounts can sign in; each user sees only their scope." },
    ],
    chips: ["Fully offline capable", "Data stored on the institution's server", "No requests to external services"],
  },

  advantages: {
    kicker: "Advantages",
    title: "Ordinary surveillance records the past. Campus AI sees the present.",
    colWas: "Where you are today",
    colNow: "With Campus AI",
    rows: [
      { was: "Cameras record, but nobody is watching", now: "Every frame is analysed in real time" },
      { was: "Safety scales with the number of guards", now: "No extra staff — continuous 24/7 coverage" },
      { was: "A new system means new hardware costs", now: "Your existing IP cameras connect as they are" },
      { was: "Attendance kept on paper, by hand", now: "Automatic through face recognition, with CSV reports" },
      { was: "Parents only find out in the evening", now: "Arrivals, mood and alerts on the parent's phone" },
      { was: "Lesson quality judged only at open lessons", now: "Attention and recommendations for every lesson" },
    ],
    gains: [
      { num: "12 s", label: "from incident to responsible staff" },
      { num: "6", label: "AI detectors running in parallel" },
      { num: "0", label: "attendance marks written by hand" },
      { num: "0", label: "bytes leaving for an external server" },
    ],
  },

  pricing: {
    kicker: "Market & revenue",
    title: "A monthly subscription, priced by institution level",
    tiersTitle: "Three segments · one model",
    tiers: [
      {
        name: "Schools",
        who: "General education",
        price: "5,000",
        unit: "soum / student / month",
        inst: "11,118 institutions",
        students: "6.87 M students",
        monthly: "34.4 bn soum / month",
      },
      {
        name: "Colleges & technical schools",
        who: "Vocational education",
        price: "10,000",
        unit: "soum / student / month",
        inst: "500+ institutions",
        students: "~300 K students*",
        monthly: "3.0 bn soum / month",
      },
      {
        name: "Higher education",
        who: "Universities and institutes",
        price: "15,000",
        unit: "soum / student / month",
        inst: "215 institutions",
        students: "1.54 M students",
        monthly: "23.0 bn soum / month",
      },
    ],
    note: "* The college student total is estimated from admission quotas; all other figures come from the State Statistics Committee.",
    totalTitle: "At full coverage",
    totalMonthly: "60.4 bn",
    totalYearly: "725 bn",
    totalUnit: { month: "soum / month", year: "soum / year" },
    chartTitle: "Annual revenue by coverage",
    chart: [
      { pct: 1, label: "1% coverage", yearly: "7.2 bn", monthly: "0.6 bn / month" },
      { pct: 5, label: "5% coverage", yearly: "36.2 bn", monthly: "3.0 bn / month" },
      { pct: 10, label: "10% coverage", yearly: "72.5 bn", monthly: "6.0 bn / month" },
      { pct: 25, label: "25% coverage", yearly: "181 bn", monthly: "15.1 bn / month" },
    ],
    chartNote: "A model calculation: student count × tariff. Not measured revenue.",
    source: "Source: State Statistics Committee of Uzbekistan, 2025/2026 academic year",
  },

  finale: {
    titleA: "You always had cameras.",
    titleB: "Now they understand.",
    sub: "Campus AI — a video surveillance and monitoring ecosystem for educational institutions",
    ctaPanel: "Open the panel",
    ctaOrder: "Request a demo",
    ctaProduct: "Product page",
    foot: "Runs on the internal network, without internet",
  },
};
