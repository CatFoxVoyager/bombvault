// The configuration an MCP client needs, as text to copy. Pure functions with
// no i18n: every line is a command, a header or a JSON key that a client parses
// literally, so translating any of it would break the connection.

export interface McpSnippetInput {
  /** Scheme, host and port of the address the operator opened BombVault at. */
  origin: string;
  endpointPath: string;
  /** The fresh key, or KEY_PLACEHOLDER outside the panel that shows it once. */
  key: string;
  /** An HTTPS origin served with BombVault's own certificate, which a client
   *  only trusts once it is pointed at the certificate file. */
  selfSigned: boolean;
}

export const KEY_PLACEHOLDER = "<your key>";
export const CERT_PATH_PLACEHOLDER = "<path of the downloaded bombvault-cert.pem>";
export const KEY_FILE_PLACEHOLDER = "<path of the file with your key>";

/** mcpUrl joins the origin and the endpoint path without doubling the slash
 *  between them. */
export function mcpUrl(i: McpSnippetInput): string {
  return i.origin.replace(/\/+$/, "") + "/" + i.endpointPath.replace(/^\/+/, "");
}

/**
 * claudeCodeSnippet returns the `claude mcp add` command for one terminal run.
 * mcp-remote reads the key from a file, so neither the command, the process
 * list nor `claude mcp list` shows it. A `${VAR}` in the arguments would not
 * keep it out: Claude Code fills it from its own environment before it starts
 * the server. Claude Code's own HTTP transport is no way round that either,
 * since it refuses BombVault's self-issued certificate even with
 * NODE_EXTRA_CA_CERTS set. `@latest` keeps an older global mcp-remote without
 * `--header-file` from being picked, and the paths are quoted because the
 * operator fills them in by hand and a space would split them in two.
 */
export function claudeCodeSnippet(i: McpSnippetInput): string {
  const cert = i.selfSigned ? `-e "NODE_EXTRA_CA_CERTS=${CERT_PATH_PLACEHOLDER}" ` : "";
  const http = i.origin.toLowerCase().startsWith("http:") ? " --allow-http" : "";
  return (
    `claude mcp add bombvault --scope user ${cert}-- npx -y mcp-remote@latest ${mcpUrl(i)} ` +
    `--header-file "${KEY_FILE_PLACEHOLDER}"${http}`
  );
}

/**
 * claudeDesktopSnippet returns the one entry that goes inside "mcpServers" in
 * claude_desktop_config.json. The key travels in `env` and the header argument
 * only references it, because mcp-remote splits a `--header` value on the first
 * space and would drop a key written after one.
 */
export function claudeDesktopSnippet(i: McpSnippetInput): string {
  const args = ["-y", "mcp-remote", mcpUrl(i), "--header", "X-API-Key:${BOMBVAULT_MCP_KEY}"];
  if (i.origin.toLowerCase().startsWith("http:")) args.push("--allow-http");

  const env: Record<string, string> = { BOMBVAULT_MCP_KEY: i.key };
  if (i.selfSigned) env.NODE_EXTRA_CA_CERTS = CERT_PATH_PLACEHOLDER;

  // Serialized inside a wrapper object and then stripped of it, so what comes
  // out is what JSON.parse takes back once it sits between braces again.
  return JSON.stringify({ bombvault: { command: "npx", args, env } }, null, 2)
    .split("\n")
    .slice(1, -1)
    .map((line) => line.slice(2))
    .join("\n");
}

/** genericSnippet lists the fields any Streamable HTTP client asks for, with
 *  both header forms; the card says in the reader's language that either one
 *  works and what to do about the certificate. */
export function genericSnippet(i: McpSnippetInput): string {
  return [
    `URL: ${mcpUrl(i)}`,
    "Transport: Streamable HTTP",
    `Authorization: Bearer ${i.key}`,
    `X-API-Key: ${i.key}`,
  ].join("\n");
}
