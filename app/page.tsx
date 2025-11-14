// "use client";

// // --- [Imports: All your ai-elements components] ---
// import {
//   MessageBranch,
//   MessageBranchContent,
//   MessageBranchNext,
//   MessageBranchPrevious,
//   MessageBranchSelector,
// } from "./components/ai-elements/message"; // Corrected path
// import {
//   Conversation,
//   ConversationContent,
//   ConversationScrollButton,
// } from "./components/ai-elements/conversation"; // Corrected path
// import { Message, MessageContent } from "./components/ai-elements/message"; // Corrected path
// import {
//   PromptInput,
//   PromptInputActionAddAttachments,
//   PromptInputActionMenu,
//   PromptInputActionMenuContent,
//   PromptInputActionMenuTrigger,
//   PromptInputAttachment,
//   PromptInputAttachments,
//   PromptInputBody,
//   PromptInputButton,
//   PromptInputFooter,
//   PromptInputHeader,
//   type PromptInputMessage,
//   PromptInputSubmit,
//   PromptInputTextarea,
//   PromptInputTools,
// } from "./components/ai-elements/prompt-input"; // Corrected path
// import {
//   Reasoning,
//   ReasoningContent,
//   ReasoningTrigger,
// } from "./components/ai-elements/reasoning"; // Corrected path
// import { MessageResponse } from "./components/ai-elements/message"; // Corrected path
// import {
//   Source,
//   Sources,
//   SourcesContent,
//   SourcesTrigger,
// } from "./components/ai-elements/sources"; // Corrected path
// import { Suggestion, Suggestions } from "./components/ai-elements/suggestion"; // Corrected path

"use client";

// --- [Imports: All your ai-elements components] ---
import {
  MessageBranch,
  MessageBranchContent,
  MessageBranchNext,
  MessageBranchPage,
  MessageBranchPrevious,
  MessageBranchSelector,
} from "@/components/ai-elements/message";
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import { Message, MessageContent } from "@/components/ai-elements/message";
import {
  PromptInput,
  PromptInputActionAddAttachments,
  PromptInputActionMenu,
  PromptInputActionMenuContent,
  PromptInputActionMenuTrigger,
  PromptInputAttachment,
  PromptInputAttachments,
  PromptInputBody,
  PromptInputButton,
  PromptInputFooter,
  PromptInputHeader,
  type PromptInputMessage,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputTools,
} from "@/components/ai-elements/prompt-input";
import {
  Reasoning,
  ReasoningContent,
  ReasoningTrigger,
} from "@/components/ai-elements/reasoning";
import { MessageResponse } from "@/components/ai-elements/message";
import {
  Source,
  Sources,
  SourcesContent,
  SourcesTrigger,
} from "@/components/ai-elements/sources";
import { Suggestion, Suggestions } from "@/components/ai-elements/suggestion";

// --- [Imports: Real libraries] ---
import type { ToolUIPart, FileUIPart } from "ai"; // Added FileUIPart
import { nanoid } from "nanoid";
import { useState, FormEvent, useCallback } from "react";
import { toast } from "sonner";

// --- [DATA TYPES] ---

// This is the *simple* format your n8n workflow sends/receives
type N8nMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

// This is the *complex* format your ai-elements UI components expect
type UIMessageType = {
  key: string;
  from: "user" | "assistant";
  sources?: { href: string; title: string }[];
  versions: {
    id: string;
    content: any;
  }[];
  reasoning?: {
    content: string;
    duration: number;
  };
  tools?: {
    name: string;
    description: string;
    status: ToolUIPart["state"];
    parameters: Record<string, unknown>;
    result: string | undefined;
    error: string | undefined;
  }[];
};

const N8N_CHAT_API = process.env.NEXT_PUBLIC_N8N_CHAT_API ? process.env.NEXT_PUBLIC_N8N_CHAT_API : 'st' ;

// --- [MOCK DATA FOR SUGGESTIONS] ---
const suggestions = [
  "What are the latest trends in AI?",
  "How does machine learning work?",
  "Explain quantum computing",
  "Best practices for React development",
];

// --- [HELPER FUNCTIONS to translate data] ---

const convertUiMessagesToN8nMessages = (
  uiMessages: UIMessageType[],
): N8nMessage[] => {
  return uiMessages.map((msg) => ({
    id: msg.key,
    role: msg.from,
    content: msg.versions[0].content,
  }));
};

const convertN8nMessagesToUiMessages = (
  n8nMessages: N8nMessage[],
): UIMessageType[] => {
  return n8nMessages.map((msg) => ({
    key: msg.id,
    from: msg.role,
    versions: [{ id: msg.id, content: msg.content }],
  }));
};

// --- [NEW] --- Create a stable key for our loader
const LOADING_INDICATOR_KEY = "assistant-loading-indicator";

// --- [NEW] --- Create the typing indicator component
const TypingIndicator = () => (
  <div className="typing-indicator">
    <span />
    <span />
    <span />
  </div>
);

// --- [MAIN COMPONENT] ---
const Example = () => {
  const [text, setText] = useState<string>("");
  const [status, setStatus] = useState<
    "submitted" | "streaming" | "ready" | "error"
  >("ready");

  const [messages, setMessages] = useState<UIMessageType[]>([]);

  const handleSubmit = useCallback(
    async (message: PromptInputMessage) => {
      // --- Type-safe checks for message properties ---
      if (!message) {
        return;
      }
      const hasText =
        "text" in message &&
        typeof message.text === "string" &&
        message.text.length > 0;
      const hasAttachments =
        "files" in message &&
        Array.isArray(message.files) &&
        message.files.length > 0;

      if (!(hasText || hasAttachments) || status !== "ready") {
        return;
      }

      // Type-safe toast description
      if (hasAttachments && "files" in message && Array.isArray(message.files)) {
        toast.success("Files attached", {
          description: `${message.files.length} file(s) attached to message`,
        });
      }
      // --- End type-safe checks ---

      const messageContent =
        hasText && "text" in message ? message.text : "Sent with attachments";

      // 1. Create the new user message
      const newUserMessage: UIMessageType = {
        key: nanoid(),
        from: "user",
        versions: [
          {
            id: nanoid(),
            content: messageContent,
          },
        ],
      };

      // 2. Create the message list to send to n8n
      const n8nMessageList = [
        ...convertUiMessagesToN8nMessages(messages),
        {
          id: newUserMessage.key,
          role: "user",
          content: newUserMessage.versions[0].content,
        },
      ];

      // 3. Create a fake "loading" message
      const loadingMessage: UIMessageType = {
        key: LOADING_INDICATOR_KEY,
        from: "assistant",
        versions: [{ id: "loading", content: "..." }], // Content doesn't matter
      };

      // 4. Optimistically update the UI with *both* messages
      setMessages((prev) => [...prev, newUserMessage, loadingMessage]);
      setText("");
      setStatus("submitted"); // Use 'submitted' to disable button

      // --- [THIS IS THE FIX] ---
      // Check if the environment variable is missing *before* the try block.
      if (!N8N_CHAT_API) {
        console.error(
          "FATAL ERROR: NEXT_PUBLIC_N8N_CHAT_API environment variable is not set.",
        );
        // Show an error message to the user
        setMessages((prev) => [
          ...prev.filter((m) => m.key !== LOADING_INDICATOR_KEY), // Remove loader
          {
            key: nanoid(),
            from: "assistant",
            versions: [
              {
                id: nanoid(),
                // This is a user-friendly error
                content:
                  "Chat service is not configured. Please contact the site administrator.",
              },
            ],
          },
        ]);
        setStatus("ready"); // Reset status
        return; // Stop the function
      }
      // --- [END FIX] ---

      try {
        // 5. Call the n8n Webhook
        // TypeScript is now happy because N8N_CHAT_API is guaranteed to be a string here.
        const response = await fetch(N8N_CHAT_API , {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: n8nMessageList,
          }),
        });

        if (!response.ok) {
          throw new Error(`Network response was not ok: ${response.statusText}`);
        }

        // 6. Get the *simple* JSON response from n8n's 'Set' node
        const result: { messages: N8nMessage[] } = await response.json();

        if (!result.messages) {
          throw new Error("Invalid response structure from n8n");
        }

        // 7. Convert the simple n8n response back to the complex UI format
        const newUiMessages = convertN8nMessagesToUiMessages(result.messages);

        // 8. Set the *entire* chat history.
        setMessages(newUiMessages);
      } catch (error) {
        console.error("Error fetching from n8n:", error);
        // 9. If we fail, remove the loader and add an error message
        setMessages((prev) => [
          ...prev.filter((m) => m.key !== LOADING_INDICATOR_KEY),
          {
            key: nanoid(),
            from: "assistant",
            versions: [
              {
                id: nanoid(),
                content: "Sorry, I had trouble connecting to the server.",
              },
            ],
          },
        ]);
      } finally {
        // 10. Reset the status
        setStatus("ready");
      }
    },
    [messages, status], // Added status to dependency array
  );

  const handleSuggestionClick = useCallback(
    (suggestion: string) => {
      handleSubmit({ text: suggestion, files: [] });
    },
    [handleSubmit],
  );

  return (
    <div className="relative flex size-full items-center divide-y overflow-hidden justify-center">
      <div className="w-4/6">
        <Conversation>
          <ConversationContent>
            {/* --- [NEW] --- This render logic is updated */}
            {messages.map(({ versions, ...message }) => {
              // Check if this is our special loading message
              if (message.key === LOADING_INDICATOR_KEY) {
                return (
                  <Message from="assistant" key={message.key}>
                    <MessageContent>
                      <TypingIndicator />
                    </MessageContent>
                  </Message>
                );
              }

              // Otherwise, render the normal message
              return (
                <MessageBranch defaultBranch={0} key={message.key}>
                  <MessageBranchContent>
                    {versions.map((version) => (
                      <Message
                        from={message.from}
                        key={`${message.key}-${version.id}`}
                      >
                        <div>
                          {message.sources?.length && (
                            <Sources>
                              <SourcesTrigger count={message.sources.length} />
                              <SourcesContent>
                                {message.sources.map((source) => (
                                  <Source
                                    href={source.href}
                                    key={source.href}
                                    title={source.title}
                                  />
                                ))}
                              </SourcesContent>
                            </Sources>
                          )}
                          {message.reasoning && (
                            <Reasoning duration={message.reasoning.duration}>
                              <ReasoningTrigger />
                              <ReasoningContent>
                                {message.reasoning.content}
                              </ReasoningContent>
                            </Reasoning>
                          )}
                          <MessageContent>
                            <MessageResponse>
                              {version.content}
                            </MessageResponse>
                          </MessageContent>
                        </div>
                      </Message>
                    ))}
                  </MessageBranchContent>
                  {versions.length > 1 && (
                    <MessageBranchSelector from={message.from}>
                      <MessageBranchPrevious />
                      <MessageBranchPage />
                      <MessageBranchNext />
                    </MessageBranchSelector>
                  )}
                </MessageBranch>
              );
            })}
          </ConversationContent>
          <ConversationScrollButton />
        </Conversation>
        <div className="grid shrink-0 gap-4 pt-4">
          <Suggestions className="px-4">
            {suggestions.map((suggestion) => (
              <Suggestion
                key={suggestion}
                onClick={() => handleSuggestionClick(suggestion)}
                suggestion={suggestion}
              />
            ))}
          </Suggestions>
          <div className="w-full px-4 pb-4">
            <PromptInput globalDrop multiple onSubmit={handleSubmit}>
              <PromptInputHeader>
                <PromptInputAttachments>
                  {(attachment) => <PromptInputAttachment data={attachment} />}
                </PromptInputAttachments>
              </PromptInputHeader>
              <PromptInputBody>
                <PromptInputTextarea
                  onChange={(event) => setText(event.target.value)}
                  value={text}
                />
              </PromptInputBody>
              <PromptInputFooter>
                <PromptInputSubmit
                  disabled={status !== "ready"}
                  status={status}
                />
              </PromptInputFooter>
            </PromptInput>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Example;
