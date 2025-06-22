import { ReactElement, useState, useEffect } from "react";
import classNames from "classnames";
import { PromptLibraryModal } from "../PromptLibraryModal/PromptLibraryModal.tsx";
import { electronLlmRpc } from "../../../../../rpc/llmRpc";

export interface SystemPromptWidgetProps {
    className?: string;
}

export function SystemPromptWidget({ className }: SystemPromptWidgetProps): ReactElement {
    const [isExpanded, setIsExpanded] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentPrompt, setCurrentPrompt] = useState("Default System Prompt");

    // Load current system prompt on mount
    useEffect(() => {
        const loadCurrentPrompt = async () => {
            try {
                const systemPrompt = await electronLlmRpc.getSystemPrompt();
                setCurrentPrompt(systemPrompt.name);
            } catch (error) {
                console.error('Failed to load current system prompt:', error);
            }
        };
        loadCurrentPrompt();
    }, []);

    const toggleExpanded = () => {
        setIsExpanded(!isExpanded);
    };

    const handleEditPrompt = () => {
        setIsModalOpen(true);
    };

    const handlePromptLibrary = () => {
        setIsModalOpen(true);
    };

    const handleModalClose = () => {
        setIsModalOpen(false);
    };

    const handlePromptSelect = async (promptName: string, promptContent: string) => {
        console.log('SystemPromptWidget handlePromptSelect called with:', { promptName, promptContent });
        try {
            // Set the system prompt via RPC
            console.log('Calling electronLlmRpc.setSystemPrompt...');
            await electronLlmRpc.setSystemPrompt(promptName, promptContent);
            setCurrentPrompt(promptName);
            setIsModalOpen(false);
            console.log('System prompt updated successfully:', { name: promptName, content: promptContent });
            
            // Show a brief success indicator (optional)
            // You could add a toast notification here if desired
        } catch (error) {
            console.error('Failed to set system prompt:', error);
            // You could add error notification here
        }
    };

    return (
        <>
            <div className={classNames(
                "border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700/50",
                className
            )}>
                {/* Widget Header */}
                <button
                    onClick={toggleExpanded}
                    className="w-full p-3 text-left flex items-center justify-between hover:bg-gray-100 dark:hover:bg-gray-600/50 rounded-lg transition-colors"
                >
                    <span className="font-medium text-gray-900 dark:text-gray-100">
                        System Prompt
                    </span>
                    <span className="text-gray-500 dark:text-gray-400 font-mono">
                        {isExpanded ? "−" : "+"}
                    </span>
                </button>

                {/* Widget Content */}
                {isExpanded && (
                    <div className="px-3 pb-3 space-y-3 border-t border-gray-200 dark:border-gray-600 pt-3">
                        {/* Current Prompt Name */}
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                                <div className="w-2 h-2 bg-green-500 rounded-full flex-shrink-0" title="System prompt active"></div>
                                <span className="text-sm text-gray-700 dark:text-gray-300 truncate">
                                    {currentPrompt}
                                </span>
                            </div>
                            <button
                                onClick={handleEditPrompt}
                                className="ml-2 px-2 py-1 text-xs bg-blue-500 hover:bg-blue-600 text-white rounded transition-colors"
                            >
                                edit
                            </button>
                        </div>

                        {/* Prompt Library Button */}
                        <button
                            onClick={handlePromptLibrary}
                            className="w-full px-3 py-2 text-sm bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 text-gray-700 dark:text-gray-200 rounded transition-colors"
                        >
                            Prompt Library
                        </button>
                    </div>
                )}
            </div>

            {/* Prompt Library Modal */}
            {isModalOpen && (
                <PromptLibraryModal
                    isOpen={isModalOpen}
                    onClose={handleModalClose}
                    onPromptSelect={handlePromptSelect}
                    currentPrompt={currentPrompt}
                />
            )}
        </>
    );
} 