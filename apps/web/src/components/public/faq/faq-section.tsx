import { cn } from "@/lib/utils";
import { SectionHeader } from "@/components/public/content";
import { FAQItem, type FAQItemProps } from "./faq-item";

interface FAQSectionProps {
  title?: string;
  description?: string;
  items: Omit<FAQItemProps, "className">[];
  className?: string;
}

export function FAQSection({ title = "Frequently asked questions", description, items, className }: FAQSectionProps) {
  return (
    <div className={cn("flex flex-col gap-10", className)}>
      <SectionHeader title={title} description={description} />
      <div className="mx-auto w-full max-w-3xl">
        {items.map((item) => (
          <FAQItem key={item.question} {...item} />
        ))}
      </div>
    </div>
  );
}
