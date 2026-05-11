export function getAnthropicKey(): string | undefined {
  const key = process.env.ANTHROPIC_API_KEY?.trim();
  if (!key || !key.startsWith("sk-ant-")) return undefined;
  return key;
}
