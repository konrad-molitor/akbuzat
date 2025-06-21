import {useCallback, useState} from "react";
import {ClipboardIcon, CheckIcon} from "@heroicons/react/24/outline";
import {SimplifiedModelChatItem} from "../../../../../../../../electron/state/llmState.js";

const showCopiedTime = 1000 * 2;

export function ModelMessageCopyButton({
    getCopyText,
    className
}: ModelMessageCopyButtonProps) {
    const [hasCopied, setHasCopied] = useState(false);

    const copyToClipboard = useCallback(async () => {
        try {
            await navigator.clipboard.writeText(getCopyText());
            setHasCopied(true);
            setTimeout(() => setHasCopied(false), 2000);
        } catch (err) {
            console.error("Failed to copy text: ", err);
        }
    }, [getCopyText]);

    return (
        <button
            onClick={copyToClipboard}
            className={className}
            title={hasCopied ? "Copied!" : "Copy to clipboard"}
        >
            {hasCopied ? (
                <CheckIcon className="w-4 h-4" />
            ) : (
                <ClipboardIcon className="w-4 h-4" />
            )}
        </button>
    );
}

type ModelMessageCopyButtonProps = {
    getCopyText: () => string;
    className: string;
};
