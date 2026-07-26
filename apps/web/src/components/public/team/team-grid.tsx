import { cn } from "@/lib/utils";
import { TeamCard, type TeamCardProps } from "./team-card";

interface TeamGridProps {
  members: TeamCardProps[];
  columns?: 3 | 4;
  className?: string;
}

/** Not separately named in the spec, but every other category in this
 * milestone pairs its card with a grid — added for consistency, at
 * essentially no cost beyond `TeamCard` itself. */
export function TeamGrid({ members, columns = 4, className }: TeamGridProps) {
  return (
    <div className={cn("grid grid-cols-1 gap-6 sm:grid-cols-2", columns === 4 ? "lg:grid-cols-4" : "lg:grid-cols-3", className)}>
      {members.map((member) => (
        <TeamCard key={member.name} {...member} />
      ))}
    </div>
  );
}
