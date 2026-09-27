// An operator pastes these snippets where BombVault cannot see them, so a
// wrong header name or a missing --allow-http surfaces as a client that fails
// to connect for no visible reason.
import { describe, expect, it } from "vitest";
import {
  CERT_PATH_PLACEHOLDER,
  KEY_FILE_PLACEHOLDER,
  KEY_PLACEHOLDER,
  claudeCodeSnippet,
  claudeDesktopSnippet,
  genericSnippet,
  mcpUrl,
} from "./mcpSnippets";
import type { McpSnippetInput } from "./mcpSnippets";

const KEY = "bvmcp_7Qa-Zb0_cD";

const trusted: McpSnippetInput = {
  origin: "https://backup.example.com",
  endpointPath: "/mcp",
  key: KEY,
  selfSigned: false,
};

const own: McpSnippetInput = { ...trusted, origin: "https://192.168.1.10:3443", selfSigned: true };

const plain: McpSnippetInput = { ...trusted, origin: "http://tower:3443" };

interface DesktopEntry {
  bombvault: { command: string; args: string[]; env: Record<string, string> };
}

function desktopEntry(input: McpSnippetInput): DesktopEntry["bombvault"] {
  return (JSON.parse(`{${claudeDesktopSnippet(input)}}`) as DesktopEntry).bombvault;
}

// Splits a command the way a shell does over the pieces these snippets use:
// whitespace separates arguments unless it sits inside quotes.
function shellWords(command: string): string[] {
  const words = command.match(/(?:[^\s"']+|"[^"]*"|'[^']*')+/g) ?? [];
  return words.map((w) => w.replace(/"([^"]*)"/g, "$1"));
}

describe("the client snippets", () => {
  it("builds the Claude Code command", () => {
    expect(claudeCodeSnippet(trusted)).toBe(
      "claude mcp add bombvault --scope user -- npx -y mcp-remote@latest " +
        `https://backup.example.com/mcp --header-file "${KEY_FILE_PLACEHOLDER}"`
    );
    expect(mcpUrl({ ...trusted, origin: "https://backup.example.com/" })).toBe(
      "https://backup.example.com/mcp"
    );

    expect(claudeCodeSnippet(own)).toBe(
      `claude mcp add bombvault --scope user -e "NODE_EXTRA_CA_CERTS=${CERT_PATH_PLACEHOLDER}" ` +
        "-- npx -y mcp-remote@latest https://192.168.1.10:3443/mcp " +
        `--header-file "${KEY_FILE_PLACEHOLDER}"`
    );
    expect(shellWords(claudeCodeSnippet(plain))).toContain("--allow-http");
    expect(shellWords(claudeCodeSnippet(trusted))).not.toContain("--allow-http");
  });

  // Claude Code fills a ${VAR} in a server's arguments from its own
  // environment before it starts the server, which would put the key on the
  // process's command line and into `claude mcp list`.
  it("keeps the key out of the Claude Code command", () => {
    for (const input of [trusted, own, plain]) {
      const command = claudeCodeSnippet(input);
      expect(command).not.toContain(KEY);
      expect(command).not.toContain("${");
    }
  });

  it("keeps a certificate or key file path with a space in one argument", () => {
    const cert = "/Users/sam/My Downloads/bombvault-cert.pem";
    const keyFile = "C:\\Users\\Sam Doe\\bombvault-key.txt";
    const words = shellWords(
      claudeCodeSnippet(own).replace(CERT_PATH_PLACEHOLDER, cert).replace(KEY_FILE_PLACEHOLDER, keyFile)
    );
    expect(words).toContain(`NODE_EXTRA_CA_CERTS=${cert}`);
    expect(words[words.indexOf("--header-file") + 1]).toBe(keyFile);
  });

  it("builds a valid Claude Desktop entry", () => {
    const entry = desktopEntry(trusted);
    expect(entry.command).toBe("npx");
    expect(entry.args).toEqual([
      "-y",
      "mcp-remote",
      "https://backup.example.com/mcp",
      "--header",
      "X-API-Key:${BOMBVAULT_MCP_KEY}",
    ]);
    expect(entry.env).toEqual({ BOMBVAULT_MCP_KEY: KEY });

    expect(desktopEntry(own).env).toEqual({
      BOMBVAULT_MCP_KEY: KEY,
      NODE_EXTRA_CA_CERTS: CERT_PATH_PLACEHOLDER,
    });
    expect(desktopEntry(plain).args).toContain("--allow-http");
    expect(desktopEntry(trusted).args).not.toContain("--allow-http");
  });

  it("builds the generic block from literal fields only", () => {
    const block = genericSnippet(trusted);
    expect(block.split("\n")).toEqual([
      "URL: https://backup.example.com/mcp",
      "Transport: Streamable HTTP",
      `Authorization: Bearer ${KEY}`,
      `X-API-Key: ${KEY}`,
    ]);
    expect(genericSnippet(own).split("\n").slice(1)).toEqual(block.split("\n").slice(1));
  });

  it("uses the placeholder verbatim", () => {
    const anonymous = { ...own, key: KEY_PLACEHOLDER };
    for (const snippet of [claudeDesktopSnippet(anonymous), genericSnippet(anonymous)]) {
      expect(snippet).toContain(KEY_PLACEHOLDER);
      expect(snippet).not.toContain("bvmcp_");
    }
    expect(desktopEntry(anonymous).env.BOMBVAULT_MCP_KEY).toBe(KEY_PLACEHOLDER);
  });
});
