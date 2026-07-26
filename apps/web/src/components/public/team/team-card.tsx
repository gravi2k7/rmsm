import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar } from "@/components/public/shared";

export interface TeamSocialLink {
  label: string;
  href: string;
  icon: LucideIcon;
}

export interface TeamCardProps {
  name: string;
  role: string;
  photoSrc?: string;
  bio?: string;
  socialLinks?: TeamSocialLink[];
  className?: string;
}

/**
 * Team member card (Section 7). `socialLinks` is an open array of
 * `{label, href, icon}` rather than named `twitter`/`linkedin`/`github`
 * props, so adding a new platform later ("future expansion") is a data
 * change, not a component change.
 */
export function TeamCard({ name, role, photoSrc, bio, socialLinks, className }: TeamCardProps) {
  return (
    <div className={cn("flex flex-col items-center gap-3 rounded-xl border border-border p-6 text-center", className)}>
      <Avatar src={photoSrc} name={name} size="lg" />
      <div>
        <p className="font-medium">{name}</p>
        <p className="text-sm text-muted-foreground">{role}</p>
      </div>
      {bio ? <p className="text-sm text-muted-foreground">{bio}</p> : null}
      {socialLinks && socialLinks.length > 0 ? (
        <div className="flex items-center gap-3 pt-1">
          {socialLinks.map((link) => {
            const Icon = link.icon;
            return (
              <a key={link.href} href={link.href} target="_blank" rel="noreferrer noopener" aria-label={`${name} on ${link.label}`} className="text-muted-foreground hover:text-foreground">
                <Icon className="h-4 w-4" aria-hidden="true" />
              </a>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
