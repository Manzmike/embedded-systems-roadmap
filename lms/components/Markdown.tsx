import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";

import { cn } from "@/lib/utils";

interface MarkdownProps {
  source: string | null | undefined;
  className?: string;
}

export function Markdown({ source, className }: MarkdownProps) {
  if (!source) return <p className="text-[color:var(--color-text-dim)] italic">Not generated yet.</p>;
  return (
    <div className={cn("prose-lms", className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeHighlight]}
      >
        {source}
      </ReactMarkdown>
    </div>
  );
}
