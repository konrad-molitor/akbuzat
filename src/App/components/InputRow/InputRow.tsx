import {useCallback, useMemo, useRef, useState} from "react";
import {PaperAirplaneIcon, XMarkIcon} from "@heroicons/react/24/outline";
import classNames from "classnames";

export function InputRow({
    disabled = false, stopGeneration, sendPrompt, onPromptInput, autocompleteInputDraft, autocompleteCompletion, generatingResult
}: InputRowProps) {
    const [inputText, setInputText] = useState<string>("");
    const inputRef = useRef<HTMLTextAreaElement>(null);
    const autocompleteRef = useRef<HTMLDivElement>(null);
    const autocompleteCurrentTextRef = useRef<HTMLDivElement>(null);

    const autocompleteText = useMemo(() => {
        const fullText = (autocompleteInputDraft ?? "") + (autocompleteCompletion ?? "");
        if (fullText.startsWith(inputText))
            return fullText.slice(inputText.length);

        return "";
    }, [inputText, autocompleteInputDraft, autocompleteCompletion]);

    const setInputValue = useCallback((value: string) => {
        if (inputRef.current != null)
            inputRef.current.value = value;

        if (autocompleteCurrentTextRef.current != null)
            autocompleteCurrentTextRef.current.innerText = value;

        setInputText(value);
    }, []);

    const resizeInput = useCallback(() => {
        if (inputRef.current == null)
            return;

        inputRef.current.style.height = "";
        inputRef.current.style.height = inputRef.current.scrollHeight + "px";

        if (autocompleteRef.current != null) {
            autocompleteRef.current.scrollTop = inputRef.current.scrollTop;
        }
    }, []);

    const submitPrompt = useCallback(() => {
        if (generatingResult || inputRef.current == null)
            return;

        const message = inputRef.current.value;
        if (message.length === 0)
            return;

        setInputValue("");
        resizeInput();
        onPromptInput?.("");
        sendPrompt(message);
    }, [setInputValue, generatingResult, resizeInput, sendPrompt, onPromptInput]);

    const onInput = useCallback(() => {
        setInputText(inputRef.current?.value ?? "");
        resizeInput();

        if (autocompleteCurrentTextRef.current != null && inputRef.current != null)
            autocompleteCurrentTextRef.current.innerText = inputRef.current?.value;

        if (inputRef.current != null && onPromptInput != null)
            onPromptInput(inputRef.current?.value);
    }, [resizeInput, onPromptInput]);

    const onInputKeyDown = useCallback((event: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault();
            submitPrompt();
        } else if (event.key === "Tab" && !event.shiftKey && !event.ctrlKey && !event.metaKey && !event.altKey) {
            event.preventDefault();
            if (inputRef.current != null && autocompleteText !== "") {
                const newlineIndex = autocompleteText.indexOf("\n");
                const textToAccept = newlineIndex <= 0
                    ? autocompleteText
                    : autocompleteText.slice(0, newlineIndex);

                setInputValue(inputRef.current.value + textToAccept);
                inputRef.current.scrollTop = inputRef.current.scrollHeight;
                onPromptInput?.(inputRef.current.value);
            }

            resizeInput();
        }
    }, [submitPrompt, setInputValue, onPromptInput, resizeInput, autocompleteText]);

    const { previewAutocompleteText, hasMoreContent } = useMemo(() => {
        const lines = autocompleteText.split("\n");
        const firstLine = lines[0] || "";
        
        // Calculate available space (considering padding and tab hint)
        const maxLength = 60; // Reduced to account for "Tab to accept" hint
        
        let preview = firstLine;
        let hasMore = false;
        
        // Check if we need to truncate the first line
        if (firstLine.length > maxLength) {
            preview = firstLine.slice(0, maxLength) + "...";
            hasMore = true;
        }
        
        // Check if there are multiple lines
        if (lines.length > 1 && lines[1]!.trim() !== "") {
            hasMore = true;
            if (preview === firstLine) {
                preview = firstLine + "...";
            }
        }
        
        return { previewAutocompleteText: preview, hasMoreContent: hasMore };
    }, [autocompleteText]);

    return (
        <div className={classNames(
            "flex items-center gap-2",
            disabled && "opacity-50 pointer-events-none"
        )}>
            <div className="relative flex-1">
                <textarea
                    ref={inputRef}
                    onInput={onInput}
                    onKeyDownCapture={onInputKeyDown}
                    className="w-full min-h-[44px] max-h-[200px] px-4 py-2 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 disabled:opacity-50 disabled:cursor-not-allowed"
                    autoComplete="off"
                    spellCheck
                    disabled={disabled}
                    onScroll={resizeInput}
                    placeholder={
                        autocompleteText === ""
                            ? "Type a message... (Enter to send, Shift+Enter for new line)"
                            : ""
                    }
                />
                <div className="absolute inset-0 pointer-events-none" ref={autocompleteRef}>
                    <div className={classNames(
                        "h-full px-4 py-2 text-gray-500 dark:text-gray-400",
                        autocompleteText === "" && "hidden"
                    )}>
                        <div className="invisible" ref={autocompleteCurrentTextRef} />
                        <div className="text-gray-400 dark:text-gray-500 pr-20 max-w-full overflow-hidden">{previewAutocompleteText}</div>
                    </div>
                </div>
                
                {/* Tab hint - positioned outside of text area */}
                {autocompleteText !== "" && (
                    <div className="absolute right-2 top-2 px-2 py-1 text-xs text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800 rounded-md shadow-sm border border-gray-200 dark:border-gray-600 flex items-center gap-1">
                        <kbd className="px-1 py-0.5 text-xs font-mono bg-gray-100 dark:bg-gray-700 rounded">Tab</kbd>
                        {hasMoreContent && <span className="text-blue-500 dark:text-blue-400">+</span>}
                    </div>
                )}
            </div>
            <button
                className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                disabled={disabled || stopGeneration == null || !generatingResult}
                onClick={stopGeneration}
            >
                <XMarkIcon className="w-5 h-5" />
            </button>
            <button
                className="p-2 text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                disabled={disabled || inputText === "" || generatingResult}
                onClick={submitPrompt}
            >
                <PaperAirplaneIcon className="w-5 h-5" />
            </button>
        </div>
    );
}

type InputRowProps = {
    disabled?: boolean,
    stopGeneration?(): void,
    sendPrompt(prompt: string): void,
    onPromptInput?(currentText: string): void,
    autocompleteInputDraft?: string,
    autocompleteCompletion?: string,
    generatingResult: boolean
};

