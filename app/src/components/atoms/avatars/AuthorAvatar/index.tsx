import GeneralAvatar from "@/components/atoms/avatars/GeneralAvatar";
import { hashCode } from "@/lib/utils/hash.utils";

const AUTHOR_GRADIENTS: ReadonlyArray<readonly [string, string]> = [
  ["#4f8cff", "#7b2ff7"],
  ["#10b981", "#0ea5a3"],
  ["#ff7a59", "#d6336c"],
  ["#f59e0b", "#ef4444"],
  ["#06b6d4", "#3b82f6"],
  ["#ec4899", "#8b5cf6"],
  ["#22c55e", "#14b8a6"],
  ["#a855f7", "#ec4899"],
  ["#0ea5e9", "#14b8a6"],
  ["#7c3aed", "#2563eb"],
  ["#f97316", "#eab308"],
  ["#6366f1", "#06b6d4"],
];

function gradientForAuthor(id: string): readonly [string, string] {
  const idx = hashCode(id.toLowerCase()) % AUTHOR_GRADIENTS.length;
  return AUTHOR_GRADIENTS[idx] ?? AUTHOR_GRADIENTS[0]!;
}

interface Props {
  name: string;
  email?: string;
  size?: number;
}

function AuthorAvatar({ name, email, size = 24 }: Props) {
  const id = (email || name).trim();
  const [c1, c2] = gradientForAuthor(id);
  const gradient = `linear-gradient(135deg, ${c1} 0%, ${c2} 100%)`;
  const letter = (name.trim().charAt(0) || "?").toUpperCase();
  return (
    <GeneralAvatar size={size} radius={size / 2} gradient={gradient} letter={letter} label={name} />
  );
}

export default AuthorAvatar;
