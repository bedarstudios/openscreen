// Real LLM call via fetch — no LangChain dependency. Supports the
// OpenAI-compatible `/chat/completions` endpoint (OpenAI, Mistral,
// OpenRouter, openai-compatible, Gemini via OpenAI-compat), Anthropic's
// `/v1/messages`, the Codex (ChatGPT OAuth) Responses path, and GitHub
// Copilot's runtime-token chat path.
//
// Reasoning-effort transport is per-provider (see
// ./agent-provider-capabilities). Streaming is not implemented in this pass —
// the chat panel does request/response. Add via the streaming extension point
// at the bottom of this file.

import { getReasoningCallOptions } from "./agent-provider-capabilities";
import { exchangeGithubCopilotRuntimeToken, OPENAI_ACCOUNT_BASE_URL } from "./llm-provider-auth";
import {
	getProviderDefinition,
	normalizeProviderId,
	PROVIDER_DEFINITIONS,
	type ProviderDefinition,
} from "./provider-registry";

export interface LlmToolSpec {
	name: string;
	description: string;
	parameters: Record<string, unknown>;
}

export interface LlmToolCall {
	id: string;
	name: string;
	/** Raw JSON string of the arguments, exactly as the provider returned it. */
	arguments: string;
}

export type ChatMessage =
	| { role: "system" | "user"; content: string }
	| { role: "assistant"; content: string; toolCalls?: LlmToolCall[] }
	| { role: "tool"; content: string; toolCallId: string };

export interface CallLlmOptions {
	provider: string;
	/** Provider model id (e.g. `gpt-4o`). Empty string falls back to the
	 * provider's `defaultModel`. */
	model: string;
	/** Bearer credential string (env var, API key, OAuth access token, or
	 * GitHub PAT for Copilot). */
	apiKey: string;
	baseUrl?: string;
	reasoningEffort?: string;
	messages: ChatMessage[];
	tools?: LlmToolSpec[];
	/** OAuth account id (Codex only). When present the call sets the
	 * `chatgpt-account-id` header required by chatgpt.com/backend-api. */
	accountId?: string;
}

export interface CallLlmResult {
	success: boolean;
	content?: string;
	toolCalls?: LlmToolCall[];
	error?: string;
}

interface OpenAiToolCall {
	id?: string;
	type?: string;
	function?: { name?: string; arguments?: string };
}

function resolveProvider(rawId: string): ProviderDefinition | undefined {
	const id = normalizeProviderId(rawId) ?? rawId;
	return getProviderDefinition(id);
}

function toOpenAiMessage(message: ChatMessage): Record<string, unknown> {
	if (message.role === "tool") {
		return { role: "tool", tool_call_id: message.toolCallId, content: message.content };
	}
	if (message.role === "assistant" && message.toolCalls?.length) {
		return {
			role: "assistant",
			content: message.content || null,
			tool_calls: message.toolCalls.map((call) => ({
				id: call.id,
				type: "function",
				function: { name: call.name, arguments: call.arguments },
			})),
		};
	}
	return { role: message.role, content: message.content };
}

function defaultBaseUrl(providerId: string): string | undefined {
	return PROVIDER_DEFINITIONS.find((p) => p.id === providerId)?.baseUrl;
}

export async function callLlm(opts: CallLlmOptions): Promise<CallLlmResult> {
	const def = resolveProvider(opts.provider);
	if (!def) {
		return { success: false, error: `Unknown provider: ${opts.provider}` };
	}
	if (!opts.apiKey && def.authKind === "api-key") {
		return { success: false, error: `Missing API key for ${def.label}` };
	}
	// Special-case the OAuth-backed Codex path and the PAT-backed Copilot
	// path; everything else flows through the OpenAI-compatible or Anthropic
	// branches below.
	if (def.authKind === "oauth-device") {
		if (def.id !== "openai-oauth") {
			return {
				success: false,
				error: `Provider "${def.label}" uses OAuth — not implemented.`,
			};
		}
		return callCodex(opts);
	}
	if (def.authKind === "pat") {
		if (def.id !== "copilot-proxy") {
			return {
				success: false,
				error: `Provider "${def.label}" uses a personal access token — not implemented.`,
			};
		}
		return callCopilot(opts);
	}

	if (def.id === "anthropic") {
		return callAnthropic(opts);
	}

	return callOpenAiCompatible(opts);
}

function buildOpenAiHeaders(opts: CallLlmOptions): Record<string, string> {
	return {
		"Content-Type": "application/json",
		Authorization: `Bearer ${opts.apiKey}`,
	};
}

async function callOpenAiCompatible(opts: CallLlmOptions): Promise<CallLlmResult> {
	const def = getProviderDefinition(opts.provider);
	const baseUrl = (opts.baseUrl || def?.baseUrl || defaultBaseUrl(opts.provider) || "").replace(
		/\/+$/,
		"",
	);
	const url = `${baseUrl}/chat/completions`;

	const body: Record<string, unknown> = {
		model: opts.model || def?.defaultModel,
		messages: opts.messages.map(toOpenAiMessage),
	};
	if (opts.tools?.length) {
		body.tools = opts.tools.map((tool) => ({
			type: "function",
			function: {
				name: tool.name,
				description: tool.description,
				parameters: tool.parameters,
			},
		}));
	}

	const reasoning = getReasoningCallOptions(
		opts.provider,
		opts.model,
		opts.reasoningEffort as never,
	);
	if (reasoning.extraBody) Object.assign(body, reasoning.extraBody);

	return postChatCompletions(url, buildOpenAiHeaders(opts), body);
}

// --- Codex (ChatGPT OAuth) -------------------------------------------------

async function callCodex(opts: CallLlmOptions): Promise<CallLlmResult> {
	const def = getProviderDefinition("openai-oauth");
	const model = opts.model || def?.defaultModel || "gpt-5";
	const baseUrl = (opts.baseUrl || OPENAI_ACCOUNT_BASE_URL).replace(/\/+$/, "");
	const url = `${baseUrl}/codex/responses`;

	const headers: Record<string, string> = {
		"Content-Type": "application/json",
		Authorization: `Bearer ${opts.apiKey}`,
		Accept: "application/json",
	};
	if (opts.accountId) headers["chatgpt-account-id"] = opts.accountId;

	const reasoning = getReasoningCallOptions("openai-oauth", model, opts.reasoningEffort as never);
	const messages = opts.messages.filter((m) => m.role !== "system");
	const system = opts.messages.find((m) => m.role === "system")?.content;

	const body: Record<string, unknown> = {
		model,
		stream: false,
		input: messages.map(toCodexInputItem),
	};
	if (system) body.instructions = system;
	if (opts.tools?.length) {
		body.tools = opts.tools.map((tool) => ({
			type: "function",
			name: tool.name,
			description: tool.description,
			parameters: tool.parameters,
		}));
	}
	if (reasoning.effort && reasoning.effort !== "none") {
		body.reasoning = { effort: reasoning.effort };
	}

	return postCodexResponses(url, headers, body);
}

function toCodexInputItem(message: ChatMessage): Record<string, unknown> {
	if (message.role === "assistant" && message.toolCalls?.length) {
		return {
			role: "assistant",
			content: message.toolCalls.map((call) => ({
				type: "tool_call",
				name: call.name,
				arguments: call.arguments,
				call_id: call.id,
			})),
		};
	}
	if (message.role === "tool") {
		return {
			type: "tool_result",
			role: "tool",
			tool_call_id: message.toolCallId,
			content: message.content,
		};
	}
	return { role: message.role === "user" ? "user" : "assistant", content: message.content };
}

async function postCodexResponses(
	url: string,
	headers: Record<string, string>,
	body: Record<string, unknown>,
): Promise<CallLlmResult> {
	try {
		const res = await fetch(url, { method: "POST", headers, body: JSON.stringify(body) });
		if (!res.ok) {
			const text = await res.text();
			return { success: false, error: `${res.status} ${res.statusText}: ${text.slice(0, 200)}` };
		}
		const json = (await res.json()) as {
			output?: Array<{
				type?: string;
				content?: Array<{ type?: string; text?: string }>;
				name?: string;
				arguments?: string;
				call_id?: string;
			}>;
		};
		const text = (json.output ?? [])
			.flatMap((item) => item.content ?? [])
			.filter((block) => block.type === "output_text" || typeof block.text === "string")
			.map((block) => block.text ?? "")
			.join("");
		const toolCalls = (json.output ?? [])
			.filter((item) => item.type === "tool_call" || item.type === "function_call")
			.map((item, index) => ({
				id: item.call_id ?? `call_${index}`,
				name: item.name ?? "",
				arguments: item.arguments ?? "{}",
			}));
		if (!text && toolCalls.length === 0) {
			return { success: false, error: "Empty response from Codex." };
		}
		return {
			success: true,
			content: text,
			toolCalls: toolCalls.length ? toolCalls : undefined,
		};
	} catch (err) {
		return { success: false, error: err instanceof Error ? err.message : String(err) };
	}
}

async function postChatCompletions(
	url: string,
	headers: Record<string, string>,
	body: Record<string, unknown>,
): Promise<CallLlmResult> {
	try {
		const res = await fetch(url, { method: "POST", headers, body: JSON.stringify(body) });
		if (!res.ok) {
			const text = await res.text();
			return { success: false, error: `${res.status} ${res.statusText}: ${text.slice(0, 200)}` };
		}
		const json = (await res.json()) as {
			choices?: Array<{
				message?: { content?: string | null; tool_calls?: OpenAiToolCall[] };
			}>;
		};
		const message = json.choices?.[0]?.message;
		const toolCalls = (message?.tool_calls ?? [])
			.filter((call) => call.function?.name)
			.map((call, index) => ({
				id: call.id ?? `call_${index}`,
				name: call.function?.name ?? "",
				arguments: call.function?.arguments ?? "{}",
			}));
		const content = message?.content ?? "";
		if (!content && toolCalls.length === 0) {
			return { success: false, error: "Empty response from model." };
		}
		return { success: true, content, toolCalls: toolCalls.length ? toolCalls : undefined };
	} catch (err) {
		return { success: false, error: err instanceof Error ? err.message : String(err) };
	}
}

// --- GitHub Copilot -------------------------------------------------------
//
// Stored credential is the user's GitHub PAT (or the PAT from the OAuth
// device flow). At call time we exchange it for a short-lived Copilot
// runtime bearer and hit the Copilot chat-completions endpoint with the
// right user-agent headers.

async function callCopilot(opts: CallLlmOptions): Promise<CallLlmResult> {
	const def = getProviderDefinition("copilot-proxy");
	let runtime: { token: string; baseUrl: string };
	try {
		runtime = await exchangeGithubCopilotRuntimeToken(opts.apiKey);
	} catch (err) {
		return { success: false, error: err instanceof Error ? err.message : String(err) };
	}

	const baseUrl = (opts.baseUrl || runtime.baseUrl || def?.baseUrl || "").replace(/\/+$/, "");
	const url = `${baseUrl}/chat/completions`;

	const body: Record<string, unknown> = {
		model: opts.model || def?.defaultModel,
		messages: opts.messages.map(toOpenAiMessage),
		stream: false,
	};
	if (opts.tools?.length) {
		body.tools = opts.tools.map((tool) => ({
			type: "function",
			function: {
				name: tool.name,
				description: tool.description,
				parameters: tool.parameters,
			},
		}));
	}
	const reasoning = getReasoningCallOptions(
		"copilot-proxy",
		opts.model,
		opts.reasoningEffort as never,
	);
	if (reasoning.extraBody) Object.assign(body, reasoning.extraBody);

	const headers: Record<string, string> = {
		"Content-Type": "application/json",
		Authorization: `Bearer ${runtime.token}`,
		Accept: "application/json",
		"User-Agent": "GitHubCopilotChat/0.26.7",
		"Editor-Version": "vscode/1.96.2",
		"Editor-Plugin-Version": "copilot-chat/0.26.7",
		"Openai-Intent": "copilot-gpt-chat-completions",
	};
	if (opts.reasoningEffort && opts.reasoningEffort !== "none") {
		headers["X-Initiator"] = "user";
	}

	return postChatCompletions(url, headers, body);
}

// --- Anthropic wire mapping ----------------------------------------------

type AnthropicContentBlock =
	| { type: "text"; text: string }
	| { type: "tool_use"; id: string; name: string; input: unknown }
	| { type: "tool_result"; tool_use_id: string; content: string };

function toAnthropicMessages(
	messages: ChatMessage[],
): Array<{ role: "user" | "assistant"; content: string | AnthropicContentBlock[] }> {
	const out: Array<{ role: "user" | "assistant"; content: string | AnthropicContentBlock[] }> = [];
	for (const message of messages) {
		if (message.role === "system") continue;
		if (message.role === "tool") {
			out.push({
				role: "user",
				content: [
					{ type: "tool_result", tool_use_id: message.toolCallId, content: message.content },
				],
			});
			continue;
		}
		if (message.role === "assistant" && message.toolCalls?.length) {
			const blocks: AnthropicContentBlock[] = [];
			if (message.content) blocks.push({ type: "text", text: message.content });
			for (const call of message.toolCalls) {
				let input: unknown = {};
				try {
					input = call.arguments ? JSON.parse(call.arguments) : {};
				} catch {
					input = {};
				}
				blocks.push({ type: "tool_use", id: call.id, name: call.name, input });
			}
			out.push({ role: "assistant", content: blocks });
			continue;
		}
		out.push({ role: message.role, content: message.content });
	}
	return out;
}

async function callAnthropic(opts: CallLlmOptions): Promise<CallLlmResult> {
	const def = getProviderDefinition("anthropic");
	const baseUrl = (opts.baseUrl || def?.baseUrl || "https://api.anthropic.com/v1").replace(
		/\/+$/,
		"",
	);
	const url = `${baseUrl}/messages`;
	const systemMessage = opts.messages.find((m) => m.role === "system")?.content;

	const body: Record<string, unknown> = {
		model: opts.model || def?.defaultModel || "claude-haiku-4-5",
		max_tokens: 8192,
		messages: toAnthropicMessages(opts.messages),
	};
	if (systemMessage) body.system = systemMessage;
	if (opts.tools?.length) {
		body.tools = opts.tools.map((tool) => ({
			name: tool.name,
			description: tool.description,
			input_schema: tool.parameters,
		}));
	}

	// MiniMax rides this transport too — both `minimax` and the token-plan
	// variant point at the Anthropic-compatible `api.minimax.io/anthropic`.
	// The capability module returns the OpenAI-responses strategy for those,
	// which would send the wrong shape; force the Anthropic-style thinking
	// patch off and let MiniMax's proxy translate raw effort via the
	// `reasoning_effort` extra_body if it wants to.
	const isMinimax = opts.provider === "minimax" || opts.provider === "minimax-token-plan";
	const reasoning = getReasoningCallOptions(
		opts.provider,
		opts.model,
		opts.reasoningEffort as never,
	);
	if (reasoning.requestBodyPatch && !isMinimax) {
		if (reasoning.requestBodyPatch.thinking) {
			body.thinking = reasoning.requestBodyPatch.thinking;
		}
		if (reasoning.requestBodyPatch.outputConfig) {
			body.output_config = reasoning.requestBodyPatch.outputConfig;
		}
	} else if (reasoning.extraBody && isMinimax) {
		Object.assign(body, reasoning.extraBody);
	}
	if (isMinimax) body.max_tokens = 8192;

	try {
		const res = await fetch(url, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				"x-api-key": opts.apiKey,
				"anthropic-version": "2023-06-01",
			},
			body: JSON.stringify(body),
		});
		if (!res.ok) {
			const text = await res.text();
			return { success: false, error: `${res.status} ${res.statusText}: ${text.slice(0, 200)}` };
		}
		const json = (await res.json()) as {
			content?: Array<{ type: string; text?: string; id?: string; name?: string; input?: unknown }>;
		};
		const blocks = json.content ?? [];
		const text = blocks
			.filter((b) => b.type === "text" && b.text)
			.map((b) => b.text)
			.join("\n");
		const toolCalls = blocks
			.filter((b) => b.type === "tool_use" && b.name)
			.map((b, index) => ({
				id: b.id ?? `toolu_${index}`,
				name: b.name ?? "",
				arguments: JSON.stringify(b.input ?? {}),
			}));
		if (!text && toolCalls.length === 0) {
			return { success: false, error: "Empty response from Anthropic." };
		}
		return { success: true, content: text, toolCalls: toolCalls.length ? toolCalls : undefined };
	} catch (err) {
		return { success: false, error: err instanceof Error ? err.message : String(err) };
	}
}
