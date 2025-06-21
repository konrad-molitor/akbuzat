import {useState, useCallback, useMemo} from "react";
import {ChevronRightIcon, ChatBubbleLeftEllipsisIcon} from "@heroicons/react/24/outline";
import {Spinner, Tooltip} from "@heroui/react";
import classNames from "classnames";
import prettyMs from "pretty-ms";
import {MessageMarkdown} from "../../../MessageMarkdown/MessageMarkdown.js";
import {MarkdownContent} from "../../../MarkdownContent/MarkdownContent.js";

const excerptLength = 1024;

export function ModelResponseThought({text, active, duration}: ModelResponseThoughtProps) {
    const [isOpen, setIsOpen] = useState(false);

    const toggleIsOpen = useCallback(() => {
        setIsOpen((isOpen) => !isOpen);
    }, []);

    const formattedDuration = useMemo(() => {
        if (duration != null) {
            return prettyMs(duration, {
                secondsDecimalDigits: duration < 1000 * 10 ? 2 : 0,
                verbose: true
            });
        }
        return null;
    }, [duration]);

    return (
        <div className={classNames(
            "rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden",
            active && "border-blue-500 dark:border-blue-500",
            isOpen && "bg-gray-50 dark:bg-gray-800"
        )}>
            <button 
                className="w-full px-4 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                onClick={toggleIsOpen}
            >
                <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                        {active ? (
                            <Spinner size="sm" color="default" />
                        ) : (
                            <Tooltip content={formattedDuration ? `Thought for ${formattedDuration}` : "Finished thinking"}>
                                <ChatBubbleLeftEllipsisIcon className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                            </Tooltip>
                        )}
                        <ChevronRightIcon className={classNames(
                            "w-4 h-4 text-gray-500 dark:text-gray-400 transition-transform",
                            isOpen && "rotate-90"
                        )} />
                    </div>
                    {!isOpen && (
                        <MarkdownContent
                            className="text-sm text-gray-500 dark:text-gray-400 truncate"
                            dir="auto"
                            inline
                        >
                            {text.slice(-excerptLength)}
                        </MarkdownContent>
                    )}
                </div>
            </button>
            {isOpen && (
                <div className="px-4 py-2 border-t border-gray-200 dark:border-gray-700">
                    <MessageMarkdown className="text-gray-900 dark:text-gray-100" activeDot={active}>
                        {text}
                    </MessageMarkdown>
                </div>
            )}
        </div>
    );
}

type ModelResponseThoughtProps = {
    text: string,
    active: boolean,
    duration?: number
};
