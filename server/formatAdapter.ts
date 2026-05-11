/**
 * Anthropic ↔ OpenAI format adapters.
 * Converts between the two API formats so all providers can be called uniformly.
 */

type OAIMessage = { role: string; content: unknown };

export function openAIToAnthropic(
  body: Record<string, unknown>,
): Record<string, unknown> {
  const msgs = (body.messages as OAIMessage[] | undefined) ?? [];
  let system: string | undefined;
  const filtered: OAIMessage[] = [];

  for (const m of msgs) {
    if (m.role === "system") {
      system =
        typeof m.content === "string"
          ? m.content
          : Array.isArray(m.content)
            ? (m.content as Array<{ type: string; text?: string }>)
                .filter((p) => p.type === "text")
                .map((p) => p.text ?? "")
                .join("")
            : "";
    } else {
      filtered.push(m);
    }
  }

  const anthropicMsgs = filtered.map((m) => {
    if (!Array.isArray(m.content)) return m;
    const content = (
      m.content as Array<{
        type: string;
        text?: string;
        image_url?: { url: string };
      }>
    ).map((part) => {
      if (part.type === "text") return { type: "text", text: part.text };
      if (part.type === "image_url" && part.image_url) {
        const url = part.image_url.url;
        if (url.startsWith("data:")) {
          const [hdr, data] = url.split(",");
          const mediaType = hdr.match(/data:(.*?);base64/)?.[1] ?? "image/jpeg";
          return {
            type: "image",
            source: { type: "base64", media_type: mediaType, data },
          };
        }
        return { type: "image", source: { type: "url", url } };
      }
      return part;
    });
    return { ...m, content };
  });

  return {
    model: body.model,
    max_tokens: body.max_completion_tokens ?? body.max_tokens ?? 8192,
    ...(system ? { system } : {}),
    messages: anthropicMsgs,
    ...(body.temperature !== undefined
      ? { temperature: body.temperature }
      : {}),
    ...(body.stream ? { stream: true } : {}),
  };
}

export function anthropicToOpenAI(anthropicBody: string): string {
  try {
    const a = JSON.parse(anthropicBody) as Record<string, unknown>;
    if (!a.content) return anthropicBody;
    const content =
      (a.content as Array<{ type: string; text?: string }> | undefined) ?? [];
    const text = content
      .filter((c) => c.type === "text")
      .map((c) => c.text ?? "")
      .join("");
    const oai = {
      id: a.id ?? "",
      object: "chat.completion",
      created: Math.floor(Date.now() / 1000),
      model: a.model ?? "",
      choices: [
        {
          index: 0,
          message: { role: "assistant", content: text },
          finish_reason: a.stop_reason ?? "stop",
        },
      ],
    };
    return JSON.stringify(oai);
  } catch {
    return anthropicBody;
  }
}
