import { motion } from "framer-motion";

const BAR_COUNT = 5;

/** Tinglash paytidagi animatsion ovoz to'lqini — bars faqat active bo'lsa harakatlanadi. */
export function VoiceWave({ active, color = "#8FB8FF" }: { active: boolean; color?: string }) {
  return (
    <div className="flex h-4 items-center gap-[3px]">
      {Array.from({ length: BAR_COUNT }).map((_, i) => (
        <motion.span
          key={i}
          className="w-[3px] rounded-full"
          style={{ background: color }}
          animate={active ? { height: [4, 16, 6, 14, 4] } : { height: 4 }}
          transition={
            active
              ? { duration: 0.9 + i * 0.08, repeat: Infinity, ease: "easeInOut", delay: i * 0.06 }
              : { duration: 0.2 }
          }
        />
      ))}
    </div>
  );
}
