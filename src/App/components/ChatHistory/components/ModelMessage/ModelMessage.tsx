import {MessageMarkdown} from "../../../MessageMarkdown/MessageMarkdown.js";
import {SimplifiedModelChatItem} from "../../../../../../electron/state/llmState.js";
import {ModelResponseThought} from "../ModelResponseThought/ModelResponseThought.js";
import {ModelMessageCopyButton} from "./components/ModelMessageCopyButton/ModelMessageCopyButton.js";

export function ModelMessage({modelMessage, active}: ModelMessageProps) {
    return (
        <div className="relative p-4 rounded-lg bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700">
            {modelMessage.message.map((message, responseIndex) => {
                const isLastMessage = responseIndex === modelMessage.message.length - 1;

                if (message.type === "segment" && message.segmentType === "thought") {
                    return (
                        <ModelResponseThought
                            key={responseIndex}
                            text={message.text}
                            active={isLastMessage && active}
                            duration={
                                (message.startTime != null && message.endTime != null)
                                    ? (new Date(message.endTime).getTime() - new Date(message.startTime).getTime())
                                    : undefined
                            }
                        />
                    );
                }

                return (
                    <MessageMarkdown
                        key={responseIndex}
                        activeDot={isLastMessage && active}
                        className="text-gray-900 dark:text-gray-100"
                    >
                        {message.text}
                    </MessageMarkdown>
                );
            })}
            {(modelMessage.message.length === 0 && active) && (
                <MessageMarkdown className="text-gray-900 dark:text-gray-100" activeDot />
            )}
            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity" inert={active}>
                <ModelMessageCopyButton 
                    getCopyText={() => 
                        modelMessage.message
                            .filter((item) => item.type === "text")
                            .map((item) => item.text)
                            .join("\n")
                            .trim()}
                    className="p-2 rounded-lg text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
                />
            </div>
        </div>
    );
}

type ModelMessageProps = {
    modelMessage: SimplifiedModelChatItem,
    active: boolean
};
