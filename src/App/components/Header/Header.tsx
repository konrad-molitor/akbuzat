import {CSSProperties, useState} from "react";
import classNames from "classnames";
import {ArrowDownIcon, BackspaceIcon, CogIcon} from "@heroicons/react/24/outline";
import {LlmState, LocalModel, RemoteModel} from "../../../../electron/state/llmState.js";
import {ModelSelector} from "../ModelSelector/ModelSelector.tsx";
import {ModelManagerModal} from "../ModelManagerModal/ModelManagerModal.tsx";
import {UpdateBadge} from "./components/UpdateBadge.js";

export function Header({
    appVersion, 
    canShowCurrentVersion, 
    modelName, 
    onLoadClick, 
    loadPercentage, 
    onResetChatClick,
    llmState,
    onModelSelect,
    onModelSearch,
    onModelUnload,
    onModelDelete,
    onModelDeleteMultiple,
    showModelSelector = false,
    className
}: HeaderProps) {
    const [isModelManagerOpen, setIsModelManagerOpen] = useState(false);

    return (
        <div className={classNames("grid grid-cols-3 items-center w-full px-6 py-4 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 shadow-sm", className)}>
            {/* Left section - placeholder for future app icon */}
            <div className="flex items-center justify-start">
                {/* Reserved for app icon */}
            </div>
            
            {/* Center section - Model selector */}
            <div className="flex items-center justify-center">
                {showModelSelector && llmState ? (
                    <ModelSelector
                        state={llmState}
                        onModelSelect={onModelSelect}
                        onSearchChange={onModelSearch}
                        onModelUnload={onModelUnload}
                    />
                ) : (
                    <div className="relative flex items-center gap-3 px-6 py-3 rounded-xl bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 border border-gray-200 dark:border-gray-700 shadow-sm">
                        <div
                            className={classNames(
                                "absolute inset-0 rounded-xl bg-gradient-to-r from-blue-500/10 to-purple-500/10 dark:from-blue-500/5 dark:to-purple-500/5 transition-all duration-300",
                                loadPercentage === 1 && "opacity-0"
                            )}
                            style={{
                                width: loadPercentage != null ? `${loadPercentage * 100}%` : undefined
                            } as CSSProperties}
                        />

                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg shadow-sm">
                                <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                                    <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z" />
                                </svg>
                            </div>
                            <div>
                                <div className="text-xs text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wide">
                                    Model Status
                                </div>
                                {modelName != null ? (
                                    <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">{modelName}</div>
                                ) : (
                                    <div className="text-sm font-medium text-gray-500 dark:text-gray-400">No model loaded</div>
                                )}
                            </div>
                        </div>

                        <div className="flex items-center gap-2 ml-auto">
                            <button
                                className="p-2 text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors relative z-10 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20"
                                disabled={onResetChatClick == null}
                                onClick={onResetChatClick}
                                title="Reset Chat"
                            >
                                <BackspaceIcon className="w-4 h-4" />
                            </button>
                            <button 
                                className="p-2 text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 transition-colors relative z-10 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20"
                                onClick={onLoadClick}
                                title="Load Model File"
                            >
                                <ArrowDownIcon className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                )}
            </div>
            
            {/* Right section - Settings and version */}
            <div className="flex items-center justify-end gap-4">
                {/* Model management button - always visible when llmState exists */}
                {llmState && (
                    <button
                        className="flex-shrink-0 p-4 h-16 bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/20 dark:hover:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-lg transition-colors"
                        onClick={() => setIsModelManagerOpen(true)}
                        title="Manage Models"
                    >
                        <CogIcon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                    </button>
                )}
                
                <UpdateBadge
                    appVersion={appVersion}
                    canShowCurrentVersion={canShowCurrentVersion}
                />
            </div>
            
            {/* Modal - always available when llmState exists */}
            {llmState && (
                <ModelManagerModal
                    isOpen={isModelManagerOpen}
                    onClose={() => setIsModelManagerOpen(false)}
                    localModels={llmState.availableModels.local}
                    currentModelPath={llmState.selectedModelFilePath}
                    onLoadModel={async (filename) => {
                        await onModelSelect?.({
                            id: filename,
                            name: llmState.availableModels.local.find(m => m.id === filename)?.name || filename,
                            path: llmState.availableModels.local.find(m => m.id === filename)?.path || filename,
                            size: llmState.availableModels.local.find(m => m.id === filename)?.size || 0,
                            lastModified: llmState.availableModels.local.find(m => m.id === filename)?.lastModified || new Date()
                        }, 'local');
                        setIsModelManagerOpen(false);
                    }}
                    onDeleteModel={async (filename) => {
                        try {
                            await onModelDelete?.(filename);
                        } catch (err) {
                            console.error('Failed to delete model:', err);
                            alert(`Failed to delete model: ${err}`);
                        }
                    }}
                    onDeleteMultipleModels={async (filenames) => {
                        try {
                            await onModelDeleteMultiple?.(filenames);
                        } catch (err) {
                            console.error('Failed to delete models:', err);
                            alert(`Failed to delete models: ${err}`);
                        }
                    }}
                />
            )}
        </div>
    );
}

type HeaderProps = {
    appVersion?: string,
    canShowCurrentVersion?: boolean,
    modelName?: string,
    onLoadClick?(): void,
    loadPercentage?: number,
    onResetChatClick?(): void,
    llmState?: LlmState,
    onModelSelect?: (model: LocalModel | RemoteModel, type: 'local' | 'remote') => void,
    onModelSearch?: (query: string) => void,
    onModelUnload?: () => void,
    onModelDelete?: (filename: string) => void,
    onModelDeleteMultiple?: (filenames: string[]) => void,
    showModelSelector?: boolean,
    className?: string
};
