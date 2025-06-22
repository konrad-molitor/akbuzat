import { ReactElement, useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import classNames from "classnames";
import { electronLlmRpc } from "../../../../../rpc/llmRpc.ts";

export interface PromptLibraryModalProps {
    isOpen: boolean;
    onClose: () => void;
    onPromptSelect: (promptName: string) => void;
    currentPrompt: string;
}

interface PromptItem {
    id: string;
    name: string;
    content: string;
}



const TEMPLATE_HINTS = [
    { template: "{{DATE}}", description: "Current date" },
    { template: "{{TIME}}", description: "Current time" },
    { template: "{{DATETIME}}", description: "Date and time" },
    { template: "{{USERNAME}}", description: "Username" },
    { template: "{{FILENAME}}", description: "Filename" }
];

export function PromptLibraryModal({ 
    isOpen, 
    onClose, 
    onPromptSelect, 
    currentPrompt 
}: PromptLibraryModalProps): ReactElement | null {
    const [prompts, setPrompts] = useState<PromptItem[]>([]);
    const [selectedPromptId, setSelectedPromptId] = useState<string>("");
    const [promptName, setPromptName] = useState<string>("");
    const [promptContent, setPromptContent] = useState<string>("");
    const [isNewPrompt, setIsNewPrompt] = useState<boolean>(false);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // Load prompts on mount
    useEffect(() => {
        loadPrompts();
    }, []);

    useEffect(() => {
        if (isOpen) {
            // Initialize with current prompt if it exists
            const existing = prompts.find(p => p.name === currentPrompt);
            if (existing) {
                setSelectedPromptId(existing.id);
                setPromptName(existing.name);
                setPromptContent(existing.content);
                setIsNewPrompt(false);
            } else {
                // Start with empty new prompt
                handleNewPrompt();
            }
        }
    }, [isOpen, currentPrompt, prompts]);

    const loadPrompts = async () => {
        try {
            const savedPrompts = await electronLlmRpc.loadPrompts();
            setPrompts(savedPrompts);
        } catch (error) {
            console.error('Failed to load prompts:', error);
            setPrompts([]);
        }
    };

    const savePrompts = async (newPrompts: PromptItem[]) => {
        setPrompts(newPrompts);
        try {
            await electronLlmRpc.savePrompts(newPrompts);
        } catch (error) {
            console.error('Failed to save prompts:', error);
        }
    };

    const handleNewPrompt = () => {
        setSelectedPromptId("");
        setPromptName("");
        setPromptContent("");
        setIsNewPrompt(true);
    };

    const handlePromptSelect = (prompt: PromptItem) => {
        setSelectedPromptId(prompt.id);
        setPromptName(prompt.name);
        setPromptContent(prompt.content);
        setIsNewPrompt(false);
    };

    const handleSave = async () => {
        if (!promptName.trim() || !promptContent.trim()) return;

        let newPrompts: PromptItem[];
        if (isNewPrompt || !selectedPromptId) {
            // Create new prompt
            const newPrompt: PromptItem = {
                id: Date.now().toString(),
                name: promptName.trim(),
                content: promptContent.trim()
            };
            newPrompts = [...prompts, newPrompt];
        } else {
            // Update existing prompt
            newPrompts = prompts.map(p => {
                if (p.id === selectedPromptId) {
                    return { ...p, name: promptName.trim(), content: promptContent.trim() };
                }
                return p;
            });
        }
        await savePrompts(newPrompts);
    };

    const handleDelete = async () => {
        if (!selectedPromptId || isNewPrompt) return;
        
        const newPrompts = prompts.filter(p => p.id !== selectedPromptId);
        await savePrompts(newPrompts);
        handleNewPrompt();
    };

    const handleUse = () => {
        if (promptName.trim()) {
            onPromptSelect(promptName.trim());
        }
    };

    const handleTemplateClick = (template: string) => {
        const textarea = textareaRef.current;
        if (textarea) {
            const start = textarea.selectionStart;
            const end = textarea.selectionEnd;
            const value = textarea.value;
            
            const newValue = value.substring(0, start) + template + value.substring(end);
            setPromptContent(newValue);
            
            // Set cursor position after the inserted template
            setTimeout(() => {
                textarea.focus();
                textarea.setSelectionRange(start + template.length, start + template.length);
            }, 0);
        } else {
            // Fallback to appending at the end
            setPromptContent(prev => prev + template);
        }
    };

    if (!isOpen) return null;

    const modalContent = (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60]">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-6xl h-5/6 flex flex-col m-4">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-600">
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                        Prompt Library
                    </h2>
                    <button
                        onClick={onClose}
                        className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 flex overflow-hidden">
                    {/* Left Panel - Prompt List */}
                    <div className="w-1/4 border-r border-gray-200 dark:border-gray-600 overflow-y-auto">
                        <div className="p-4">
                            <button
                                onClick={handleNewPrompt}
                                className={classNames(
                                    "w-full p-3 text-left rounded-lg mb-2 transition-colors",
                                    isNewPrompt
                                        ? "bg-blue-100 dark:bg-blue-900/30 text-blue-900 dark:text-blue-100"
                                        : "hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
                                )}
                            >
                                + New Prompt
                            </button>
                            {prompts.map((prompt) => (
                                <button
                                    key={prompt.id}
                                    onClick={() => handlePromptSelect(prompt)}
                                    className={classNames(
                                        "w-full p-3 text-left rounded-lg mb-2 transition-colors",
                                        selectedPromptId === prompt.id
                                            ? "bg-blue-100 dark:bg-blue-900/30 text-blue-900 dark:text-blue-100"
                                            : "hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
                                    )}
                                >
                                    {prompt.name}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Center Panel - Editor */}
                    <div className="w-2/4 flex flex-col p-4">
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Prompt Name
                            </label>
                            <input
                                type="text"
                                value={promptName}
                                onChange={(e) => setPromptName(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                placeholder="Enter prompt name..."
                            />
                        </div>
                        <div className="flex-1 flex flex-col">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Prompt Content
                            </label>
                            <textarea
                                ref={textareaRef}
                                value={promptContent}
                                onChange={(e) => setPromptContent(e.target.value)}
                                className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                                placeholder="Enter your prompt content..."
                            />
                        </div>
                    </div>

                    {/* Right Panel - Template Hints */}
                    <div className="w-1/4 border-l border-gray-200 dark:border-gray-600 p-4 bg-gray-50 dark:bg-gray-700/50 flex flex-col">
                        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
                            Template Variables
                        </h3>
                        <div className="flex-1 overflow-y-auto space-y-3">
                            {TEMPLATE_HINTS.map((hint) => (
                                <button
                                    key={hint.template}
                                    onClick={() => handleTemplateClick(hint.template)}
                                    className="w-full p-3 bg-white dark:bg-gray-800 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-left flex items-center gap-2"
                                >
                                    <code className="text-sm font-mono text-blue-600 dark:text-blue-400 flex-shrink-0">
                                        {hint.template}
                                    </code>
                                    <span className="text-sm text-gray-600 dark:text-gray-400 truncate">
                                        {hint.description}
                                    </span>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between p-6 border-t border-gray-200 dark:border-gray-600">
                    <div className="flex space-x-3">
                        <button
                            onClick={handleSave}
                            disabled={!promptName.trim() || !promptContent.trim()}
                            className="px-4 py-2 bg-green-500 hover:bg-green-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
                        >
                            Save
                        </button>
                        {!isNewPrompt && selectedPromptId && (
                            <button
                                onClick={handleDelete}
                                className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors"
                            >
                                Delete
                            </button>
                        )}
                    </div>
                    <button
                        onClick={handleUse}
                        disabled={!promptName.trim()}
                        className="px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
                    >
                        Use
                    </button>
                </div>
            </div>
        </div>
    );

    return createPortal(modalContent, document.body);
} 