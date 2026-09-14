import type { IntentPrediction } from "./VoiceIntentPredictor";
import { getCommand } from "./VoiceCommandRegistry";
import type { VoiceEntities } from "./VoiceEntityExtractor";
import { similarity } from "./VoiceIntentPredictor";
import { stem, tokens } from "./VoiceNormalizer";

/**
 * VoiceSuggestionEngine — ishonch past yoki buyruq to'liqsiz bo'lganda
 * professional takliflar ro'yxatini quradi: buyruq taxminlari + ma'lumotga
 * asoslangan (texnikum/shaxs nomlari) takliflar. Har taklif bosilsa bevosita
 * bajariladi (ichida tayyor IntentPrediction bor).
 */
export interface VoiceSuggestion {
  key: string;
  label: string;
  hint: string;
  prediction: IntentPrediction;
}

export interface SuggestionContext {
  teknikums: { id: string; name: string; region: string }[];
  persons?: { full_name: string; person_type: string }[];
}

const MAX_SUGGESTIONS = 6;

function predToSuggestion(p: IntentPrediction): VoiceSuggestion {
  return { key: `cmd-${p.id}`, label: p.command.title, hint: p.command.sample, prediction: p };
}

export function buildSuggestions(
  normalized: string,
  entities: VoiceEntities,
  predictions: IntentPrediction[],
  ctx: SuggestionContext
): VoiceSuggestion[] {
  const out: VoiceSuggestion[] = [];
  const words = tokens(normalized).map(stem);

  // 1) Buyruq taxminlari (eng ishonchli 4 ta)
  for (const p of predictions.slice(0, 4)) out.push(predToSuggestion(p));

  // 2) Texnikum nomlari — placeQuery yoki so'zlar mos kelsa
  const placeQ = entities.placeQuery ?? normalized;
  const tkMatches = ctx.teknikums
    .map((tk) => ({ tk, score: Math.max(similarity(stem(placeQ), stem(tk.name.toLowerCase())), ...words.map((w) => similarity(w, stem(tk.name.toLowerCase().split(" ")[0])))) }))
    .filter((m) => m.score > 0.45)
    .sort((a, b) => b.score - a.score)
    .slice(0, 2);
  for (const { tk } of tkMatches) {
    const command = getCommand("map.place")!;
    out.push({
      key: `tk-${tk.id}`,
      label: tk.name,
      hint: `${tk.region} — xaritada ko'rsatish`,
      prediction: { id: "map.place", command, confidence: 0.9, entities: { ...entities, placeQuery: tk.name }, incomplete: false },
    });
  }

  // 3) Shaxs nomlari — kontekstda bo'lsa
  if (ctx.persons && ctx.persons.length > 0) {
    const command = getCommand("search.person")!;
    for (const person of ctx.persons.slice(0, 3)) {
      out.push({
        key: `person-${person.full_name}`,
        label: person.full_name,
        hint: person.person_type === "teacher" ? "O'qituvchi — ochish" : "Talaba — ochish",
        prediction: {
          id: "search.person",
          command,
          confidence: 0.9,
          entities: { ...entities, personName: person.full_name, personType: person.person_type === "teacher" ? "teacher" : "student" },
          incomplete: false,
        },
      });
    }
  }

  // Dedup (key bo'yicha) va cheklash
  const seen = new Set<string>();
  return out.filter((s) => (seen.has(s.key) ? false : (seen.add(s.key), true))).slice(0, MAX_SUGGESTIONS);
}
