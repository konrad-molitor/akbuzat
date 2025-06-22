import React, {useState, useCallback, useMemo} from "react";
import {Autocomplete, AutocompleteItem, Chip, Avatar, Spinner, Progress} from "@heroui/react";
import {MagnifyingGlassIcon, ArrowDownTrayIcon, CheckIcon, BackspaceIcon} from "@heroicons/react/24/outline";
import {LlmState, LocalModel, RemoteModel} from "../../../../electron/state/llmState.js";

function parseModelName(filename: string): string {
    // Remove file extension
    let name = filename.replace(/\.(gguf|bin|pt|safetensors)$/i, '');
    
    // Remove common prefixes
    name = name.replace(/^(hf_|ggml-|llama-|qwen-|mistral-)/i, '');
    
    // Handle different formats
    name = name
        .replace(/_/g, ' ')  // Replace underscores with spaces
        .replace(/\b(Q\d+)_(\d+)\b/g, '($1_$2)')  // Format quantization (Q8_0) -> (Q8_0)
        .replace(/\b(\d+)B\b/g, '$1B')  // Keep model size format
        .replace(/\s+/g, ' ')  // Replace multiple spaces with single
        .trim();
    
    // Capitalize words properly
    name = name.replace(/\b\w/g, l => l.toUpperCase());
    
    return name;
}

function isModelFileRelated(modelName: string, filename: string): boolean {
    // Extract base model name from model path (e.g., "microsoft/Phi-3.5-mini-instruct" -> "Phi-3.5-mini-instruct")
    const baseModelName = modelName.split('/').pop()
        ?.toLowerCase() || '';
    
    // Remove extension and quantization suffixes from filename
    let cleanFilename = filename.replace(/\.(gguf|bin|pt|safetensors)$/i, '');
    cleanFilename = cleanFilename.replace(/\.(q\d+_k_[ms]|iq\d+_[ms]|f16|f32)$/i, '');
    cleanFilename = cleanFilename.toLowerCase();
    
    // Check if the base model name is contained in the filename
    // This handles cases where "Phi-3.5-mini-instruct" matches "Phi-3.5-mini-instruct.IQ1_M.gguf"
    return cleanFilename.includes(baseModelName) || baseModelName.includes(cleanFilename);
}

export function ModelSelector({
    state,
    onModelSelect,
    onSearchChange,
    onModelUnload,
    disabled = false
}: ModelSelectorProps) {
    const [searchValue, setSearchValue] = useState("");
    const [selectedKey, setSelectedKey] = useState<string | null>(null);

    const handleSelectionChange = useCallback((key: string | number | null) => {
        if (!key) {
            setSelectedKey(null);
            return;
        }
        
        const stringKey = String(key);
        setSelectedKey(stringKey);
        
        // Check if it's a local model
        const localModel = (state.availableModels?.local || []).find(m => m.id === stringKey);
        if (localModel) {
            onModelSelect?.(localModel, 'local');
            // Clear search after selection
            setSearchValue("");
            return;
        }
        
        // Check if it's a remote model
        const remoteModel = [
            ...(state.availableModels?.remote || []), 
            ...(state.availableModels?.searchResults || [])
        ].find(m => m.id === stringKey);
        if (remoteModel) {
            onModelSelect?.(remoteModel, 'remote');
            // Clear search after selection but don't close dropdown if downloading
            setSearchValue("");
        }
    }, [state.availableModels, onModelSelect]);

    const handleInputChange = useCallback((value: string) => {
        setSearchValue(value);
        // Clear selection when typing
        if (value && selectedKey) {
            setSelectedKey(null);
        }
        onSearchChange?.(value);
    }, [onSearchChange, selectedKey]);

    const allModels = useMemo(() => {
        const models: Array<{
            id: string;
            name: string;
            description: string;
            type: 'local' | 'remote';
            data: LocalModel | RemoteModel;
            size?: number;
            isDownloaded?: boolean;
            isDownloading?: boolean;
            downloadProgress?: number;
            downloadSpeed?: string;
        }> = [];

        // Check if availableModels is initialized
        if (!state.availableModels) {
            return models;
        }

        // Add local models first (they appear at the top of the list)
        (state.availableModels.local || []).forEach(model => {
            models.push({
                id: model.id,
                name: model.name,
                description: `Local model • ${formatFileSize(model.size)}`,
                type: 'local',
                data: model,
                size: model.size,
                isDownloaded: true
            });
        });

        // Add remote models (popular top-10 by downloads and search results)
        const remoteModels = searchValue.trim() 
            ? (state.availableModels.searchResults || [])
            : (state.availableModels.remote || []);

        remoteModels.forEach(model => {
            // Check if already exists locally
            const existsLocally = (state.availableModels.local || []).some(
                local => local.name.includes(model.name.split('/').pop() || '')
            );

            // Check if currently downloading - compare by model name pattern, not exact filename
            const downloadingModelName = state.modelDownload?.modelName;
            const isDownloading = Boolean(
                state.modelDownload?.downloading && 
                downloadingModelName && (
                    // Exact filename match
                    model.files.some(file => file.filename === downloadingModelName) ||
                    // Or check if downloading filename belongs to this model by comparing base names
                    isModelFileRelated(model.name, downloadingModelName)
                )
            );



            models.push({
                id: model.id,
                name: model.name,
                description: model.description || `${model.author} • ${model.downloads.toLocaleString()} downloads`,
                type: 'remote',
                data: model,
                size: model.files[0]?.size,
                isDownloaded: existsLocally,
                isDownloading,
                downloadProgress: isDownloading ? (state.modelDownload?.downloadProgress || 0) * 100 : undefined,
                downloadSpeed: isDownloading ? state.modelDownload?.downloadSpeed : undefined
            });
        });

        return models;
    }, [state.availableModels, state.modelDownload, searchValue]);

    const currentModelName = state.model.name || "";
    const isLoading = state.availableModels?.loading || false;
    const isDownloading = state.modelDownload?.downloading || false;
    const downloadProgress = state.modelDownload?.downloadProgress || 0;
    const downloadSpeed = state.modelDownload?.downloadSpeed || "";

    // Parse and display current model name
    const displayModelName = useMemo(() => {
        if (!currentModelName) return "";
        return parseModelName(currentModelName);
    }, [currentModelName]);

    // Display value for the input
    const displayValue = useMemo(() => {
        if (searchValue) return searchValue;
        if (currentModelName && !searchValue) return "";
        return "";
    }, [currentModelName, searchValue]);

    // Placeholder that includes current model info
    const placeholderText = useMemo(() => {
        if (currentModelName) {
            return `${displayModelName}`;
        }
        return "Search and select models...";
    }, [currentModelName, displayModelName]);

    return (
        <div className="w-full min-w-[700px] flex items-center gap-3" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
            <Autocomplete
                placeholder={placeholderText}
                inputValue={displayValue}
                onInputChange={handleInputChange}
                onSelectionChange={handleSelectionChange}
                selectedKey={selectedKey}
                isDisabled={disabled}
                isLoading={isLoading}
                allowsCustomValue={true}
                // Keep dropdown open while downloading
                menuTrigger="focus"
                aria-label="Search and select AI models"
                startContent={
                    <MagnifyingGlassIcon className="w-5 h-5 text-gray-500 flex-shrink-0" />
                }
                endContent={
                    <div className="flex items-center gap-2 flex-shrink-0">
                        {currentModelName && (
                            <>
                                <Chip
                                    size="sm"
                                    color="success"
                                    variant="dot"
                                    classNames={{
                                        base: "h-6 px-2 min-w-max bg-green-100 dark:bg-green-900/30",
                                        content: "text-xs font-medium text-green-700 dark:text-green-300"
                                    }}
                                >
                                    ready
                                </Chip>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        console.log('Unload button clicked');
                                        onModelUnload?.();
                                    }}
                                    disabled={disabled || isDownloading}
                                    className="p-2 text-gray-400 hover:text-red-500 dark:text-gray-500 dark:hover:text-red-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors rounded-md hover:bg-red-50 dark:hover:bg-red-900/20"
                                    title="Unload current model"
                                    style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
                                >
                                    <BackspaceIcon className="w-5 h-5" />
                                </button>
                            </>
                        )}
                    </div>
                }
                variant="bordered"
                size="lg"
                radius="lg"
                className="flex-1"
                classNames={{
                    base: "flex-1",
                    listboxWrapper: "max-h-[400px]",
                    selectorButton: "text-gray-500"
                }}
                listboxProps={{
                    emptyContent: isLoading ? (
                        <div className="flex items-center justify-center py-6 text-gray-500">
                            <Spinner size="sm" className="mr-3" />
                            <span className="text-base">Searching models...</span>
                        </div>
                    ) : allModels.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                            <MagnifyingGlassIcon className="w-12 h-12 mx-auto mb-3 opacity-50" />
                            <p className="text-base font-medium">No models found</p>
                            <p className="text-sm text-gray-400 mt-1">Try a different search term</p>
                        </div>
                    ) : null
                }}
                inputProps={{
                    classNames: {
                        input: "text-base font-medium placeholder:text-gray-500 dark:placeholder:text-gray-400",
                        inputWrapper: "h-16 min-h-[64px] bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 group-data-[focus=true]:border-blue-500 group-data-[focus=true]:dark:border-blue-400 px-4 py-3"
                    }
                }}
            >
                {allModels.map((model) => (
                    <AutocompleteItem
                        key={model.id}
                        textValue={model.name}
                        className="text-left"
                        classNames={{
                            base: "py-4 px-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 rounded-lg transition-colors cursor-pointer min-h-[80px]",
                            title: "text-base font-semibold text-gray-900 dark:text-gray-100",
                            description: "text-sm text-gray-500 dark:text-gray-400 mt-1"
                        }}
                    >
                        <div className="flex items-center gap-4 w-full">
                            <Avatar
                                size="lg"
                                name={model.name.split('/').pop() || model.name}
                                classNames={{
                                    base: "bg-gradient-to-br from-blue-500 to-purple-600 text-white text-sm flex-shrink-0 ring-2 ring-white dark:ring-gray-800 shadow-lg"
                                }}
                            />
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between mb-2">
                                    <div className="font-semibold text-base text-gray-900 dark:text-gray-100 truncate pr-4">
                                        {model.name}
                                    </div>
                                    <div className="flex items-center gap-2 flex-shrink-0">
                                        {model.type === 'local' && (
                                            <Chip
                                                size="sm"
                                                color="success"
                                                variant="dot"
                                                classNames={{
                                                    base: "h-6 px-3 min-w-max",
                                                    content: "text-sm font-semibold"
                                                }}
                                            >
                                                Local
                                            </Chip>
                                        )}
                                        {model.type === 'remote' && model.isDownloaded && !model.isDownloading && (
                                            <Chip
                                                size="sm"
                                                color="primary"
                                                variant="flat"
                                                startContent={<CheckIcon className="w-3 h-3" />}
                                                classNames={{
                                                    base: "h-6 px-3 min-w-max bg-blue-100 dark:bg-blue-900/30",
                                                    content: "text-sm font-semibold text-blue-700 dark:text-blue-300"
                                                }}
                                            >
                                                Ready
                                            </Chip>
                                        )}
                                        {model.type === 'remote' && model.isDownloading && (
                                            <>
                                                <Chip
                                                    size="sm"
                                                    color="warning"
                                                    variant="flat"
                                                    startContent={<Spinner size="sm" className="w-3 h-3" />}
                                                    classNames={{
                                                        base: "h-6 px-3 min-w-max bg-orange-100 dark:bg-orange-900/30",
                                                        content: "text-sm font-semibold text-orange-700 dark:text-orange-300"
                                                    }}
                                                >
                                                    {Math.round(model.downloadProgress || 0)}%
                                                </Chip>
                                                {model.downloadSpeed && (
                                                    <Chip
                                                        size="sm"
                                                        color="secondary"
                                                        variant="flat"
                                                        classNames={{
                                                            base: "h-6 px-3 min-w-max bg-purple-100 dark:bg-purple-900/30",
                                                            content: "text-sm font-semibold text-purple-700 dark:text-purple-300"
                                                        }}
                                                    >
                                                        {model.downloadSpeed}
                                                    </Chip>
                                                )}
                                            </>
                                        )}
                                        {model.type === 'remote' && !model.isDownloaded && !model.isDownloading && (
                                            <Chip
                                                size="sm"
                                                color="default"
                                                variant="bordered"
                                                startContent={<ArrowDownTrayIcon className="w-3 h-3" />}
                                                classNames={{
                                                    base: "h-6 px-3 min-w-max border-gray-300 dark:border-gray-600",
                                                    content: "text-sm font-medium text-gray-600 dark:text-gray-400"
                                                }}
                                            >
                                                Download
                                            </Chip>
                                        )}
                                        {model.size && (
                                            <div className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded-md font-medium">
                                                {formatFileSize(model.size)}
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div className="text-sm text-gray-500 dark:text-gray-400">
                                    {model.description}
                                </div>
                                {/* Progress bar for downloading models */}
                                {model.isDownloading && model.downloadProgress !== undefined && (
                                    <div className="mt-2">
                                        <Progress 
                                            value={model.downloadProgress} 
                                            className="w-full"
                                            classNames={{
                                                track: "bg-gray-200 dark:bg-gray-700 h-1",
                                                indicator: "bg-gradient-to-r from-orange-500 to-red-600"
                                            }}
                                            size="sm"
                                        />
                                    </div>
                                )}
                            </div>
                        </div>
                    </AutocompleteItem>
                ))}
            </Autocomplete>

        </div>
    );
}

function formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

type ModelSelectorProps = {
    state: LlmState;
    onModelSelect?: (model: LocalModel | RemoteModel, type: 'local' | 'remote') => void;
    onSearchChange?: (query: string) => void;
    onModelUnload?: () => void;
    disabled?: boolean;
}; 