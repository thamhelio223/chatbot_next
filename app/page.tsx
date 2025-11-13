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
import type { ToolUIPart } from "ai";
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
    content: string;
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

const N8N_CHAT_API = process.env.NEXT_PUBLIC_N8N_CHAT_API

// --- [MOCK DATA FOR SUGGESTIONS] ---
const suggestions = [
  "What are the latest trends in AI?",
  "How does machine learning work?",
  "Explain quantum computing",
  "Best practices for React development",
];

// --- [HELPER FUNCTIONS to translate data] ---

const convertUiMessagesToN8nMessages = (uiMessages: UIMessageType[]): N8nMessage[] => {
  return uiMessages.map((msg) => ({
    id: msg.key,
    role: msg.from,
    content: msg.versions[0].content,
  }));
};

const convertN8nMessagesToUiMessages = (n8nMessages: N8nMessage[]): UIMessageType[] => {
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
  
  const handleSubmit = useCallback(async (message: PromptInputMessage) => {
    const hasText = Boolean(message.text);
    const hasAttachments = Boolean(message.files?.length);

    if (!(hasText || hasAttachments) || status !== 'ready') {
      return;
    }

    if (message.files?.length) {
      toast.success("Files attached", {
        description: `${message.files.length} file(s) attached to message`,
      });
    }

    // 1. Create the new user message
    const newUserMessage: UIMessageType = {
      key: nanoid(),
      from: "user",
      versions: [
        {
          id: nanoid(),
          content: message.text || "Sent with attachments",
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

    // --- [NEW] --- 3. Create a fake "loading" message
    const loadingMessage: UIMessageType = {
      key: LOADING_INDICATOR_KEY,
      from: "assistant",
      versions: [{ id: "loading", content: "..." }], // Content doesn't matter
    };

    // 4. Optimistically update the UI with *both* messages
    setMessages((prev) => [...prev, newUserMessage, loadingMessage]);
    setText("");
    setStatus("submitted"); // Use 'submitted' to disable button

    try {
      // 5. Call the n8n Webhook
      const response = await fetch(N8N_CHAT_API, {
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

      // 8. Set the *entire* chat history. This will automatically
      //    replace the 'loadingMessage' with the real one.
      setMessages(newUiMessages);

    } catch (error) {
      console.error("Error fetching from n8n:", error);
      
      // --- [NEW] --- 9. If we fail, remove the loader and add an error message
      setMessages((prev) => [
        // Filter out the loader
        ...prev.filter(m => m.key !== LOADING_INDICATOR_KEY),
        // Add an error message
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
  }, [messages]); // We depend on the 'messages' state

  const handleSuggestionClick = useCallback((suggestion: string) => {
    handleSubmit({ text: suggestion, files: [] });
  }, [handleSubmit]);

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
                  disabled={status !== 'ready'}
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