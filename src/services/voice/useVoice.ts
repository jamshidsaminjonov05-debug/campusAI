import { useContext } from "react";
import { VoiceContext, type VoiceContextValue } from "./VoiceProvider";

/** VoiceProvider ichidagi istalgan komponent uchun ovozli boshqaruv holati. */
export function useVoice(): VoiceContextValue {
  return useContext(VoiceContext);
}
