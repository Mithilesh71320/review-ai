import { Badge } from "@/components/ui/badge";

export function SentimentBadge({ sentiment }: { sentiment: string }) {
  const variant =
    sentiment === "positive"
      ? "default"
      : sentiment === "negative"
        ? "destructive"
        : "secondary";
  return <Badge variant={variant}>{sentiment}</Badge>;
}
