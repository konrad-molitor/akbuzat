import {MessageMarkdown} from "../../../MessageMarkdown/MessageMarkdown.js";
import {SimplifiedUserChatItem} from "../../../../../../electron/state/llmState.js";

export function UserMessage({message}: UserMessageProps) {
    return (
        <MessageMarkdown className="p-4 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100">
            {message.message}
        </MessageMarkdown>
    );
}

type UserMessageProps = {
    message: SimplifiedUserChatItem
};
