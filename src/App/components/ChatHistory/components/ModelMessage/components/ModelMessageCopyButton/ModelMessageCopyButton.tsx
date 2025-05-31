import classNames from "classnames";
import {useCallback, useState} from "react";
import {CopyIconSVG} from "../../../../../../../icons/CopyIconSVG.js";
import {CheckIconSVG} from "../../../../../../../icons/CheckIconSVG.js";
import {SimplifiedModelChatItem} from "../../../../../../../../electron/state/llmState.js";

const showCopiedTime = 1000 * 2;

export function ModelMessageCopyButton({modelMessage}: ModelMessageCopyButtonProps) {
    const [copies, setCopies] = useState(0);

    const onClick = useCallback(() => {
        const text = modelMessage
            .filter((item) => item.type === "text")
            .map((item) => item.text)
            .join("\n")
            .trim();

        navigator.clipboard.writeText(text)
            .then(() => {
                setCopies(copies + 1);

                setTimeout(() => {
                    setCopies(copies - 1);
                }, showCopiedTime);
            })
            .catch((error) => {
                console.error("Failed to copy text to clipboard", error);
            });
    }, [modelMessage]);

    return (
        <button
            onClick={onClick}
            className={classNames(
                "p-2 rounded-lg text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors",
                copies > 0 && "text-green-500 dark:text-green-400"
            )}
        >
            <div className="relative w-5 h-5">
                <CopyIconSVG className={classNames(
                    "absolute inset-0 w-5 h-5 transition-opacity",
                    copies > 0 ? "opacity-0" : "opacity-100"
                )} />
                <CheckIconSVG className={classNames(
                    "absolute inset-0 w-5 h-5 transition-opacity",
                    copies > 0 ? "opacity-100" : "opacity-0"
                )} />
            </div>
        </button>
    );
}

type ModelMessageCopyButtonProps = {
    modelMessage: SimplifiedModelChatItem["message"]
};
