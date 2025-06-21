import path from "node:path";
import fs from "node:fs/promises";
import {
    getLlama, Llama, LlamaChatSession, LlamaChatSessionPromptCompletionEngine, LlamaContext, LlamaContextSequence, LlamaModel,
    isChatModelResponseSegment, type ChatModelSegmentType, createModelDownloader, readGgufFileInfo
} from "node-llama-cpp";
import {withLock, State} from "lifecycle-utils";
import packageJson from "../../package.json";
import {modelFunctions} from "../llm/modelFunctions.js";

export const llmState = new State<LlmState>({
    appVersion: packageJson.version,
    llama: {
        loaded: false
    },
    availableModels: {
        local: [],
        remote: [],
        loading: false,
        searchQuery: "",
        searchResults: []
    },
    modelDownload: {
        downloading: false
    },
    model: {
        loaded: false
    },
    context: {
        loaded: false
    },
    contextSequence: {
        loaded: false
    },
    chatSession: {
        loaded: false,
        generatingResult: false,
        simplifiedChat: [],
        draftPrompt: {
            prompt: "",
            completion: ""
        }
    }
});

export type LlmState = {
    appVersion?: string,
    llama: {
        loaded: boolean,
        error?: string
    },
    selectedModelFilePath?: string,
    availableModels: {
        local: LocalModel[],
        remote: RemoteModel[],
        loading: boolean,
        searchQuery: string,
        searchResults: RemoteModel[]
    },
    modelDownload: {
        downloading: boolean,
        downloadProgress?: number,
        downloadSpeed?: string,
        modelName?: string,
        error?: string
    },
    model: {
        loaded: boolean,
        loadProgress?: number,
        name?: string,
        error?: string
    },
    context: {
        loaded: boolean,
        error?: string
    },
    contextSequence: {
        loaded: boolean,
        error?: string
    },
    chatSession: {
        loaded: boolean,
        generatingResult: boolean,
        simplifiedChat: SimplifiedChatItem[],
        draftPrompt: {
            prompt: string,
            completion: string
        }
    }
};

export type SimplifiedChatItem = SimplifiedUserChatItem | SimplifiedModelChatItem;
export type SimplifiedUserChatItem = {
    type: "user",
    message: string
};
export type SimplifiedModelChatItem = {
    type: "model",
    message: Array<{
        type: "text",
        text: string
    } | {
        type: "segment",
        segmentType: ChatModelSegmentType,
        text: string,
        startTime?: string,
        endTime?: string
    }>
};

export type LocalModel = {
    id: string,
    name: string,
    path: string,
    size: number,
    lastModified: Date
};

export type RemoteModel = {
    id: string,
    name: string,
    author: string,
    downloads: number,
    likes: number,
    size?: number,
    tags: string[],
    description?: string,
    url: string,
    files: Array<{
        filename: string,
        size: number,
        downloadUrl: string
    }>
};

let llama: Llama | null = null;
let model: LlamaModel | null = null;
let context: LlamaContext | null = null;
let contextSequence: LlamaContextSequence | null = null;

let chatSession: LlamaChatSession | null = null;
let chatSessionCompletionEngine: LlamaChatSessionPromptCompletionEngine | null = null;
let promptAbortController: AbortController | null = null;
let inProgressResponse: SimplifiedModelChatItem["message"] = [];

const modelDirectoryPath = path.join(process.cwd(), "models");



export const llmFunctions = {
    async loadLlama() {
        await withLock(llmFunctions, "llama", async () => {
            if (llama != null) {
                try {
                    await llama.dispose();
                    llama = null;
                } catch (err) {
                    console.error("Failed to dispose llama", err);
                }
            }

            try {
                llmState.state = {
                    ...llmState.state,
                    llama: {loaded: false}
                };

                llama = await getLlama();
                llmState.state = {
                    ...llmState.state,
                    llama: {loaded: true}
                };

                llama.onDispose.createListener(() => {
                    llmState.state = {
                        ...llmState.state,
                        llama: {loaded: false}
                    };
                });
            } catch (err) {
                console.error("Failed to load llama", err);
                llmState.state = {
                    ...llmState.state,
                    llama: {
                        loaded: false,
                        error: String(err)
                    }
                };
            }
        });
    },
    async loadModel(modelPath: string) {
        await withLock(llmFunctions, "model", async () => {
            if (llama == null)
                throw new Error("Llama not loaded");

            if (model != null) {
                try {
                    await model.dispose();
                    model = null;
                } catch (err) {
                    console.error("Failed to dispose model", err);
                }
            }

            try {
                llmState.state = {
                    ...llmState.state,
                    model: {
                        loaded: false,
                        loadProgress: 0
                    }
                };

                model = await llama.loadModel({
                    modelPath,
                    onLoadProgress(loadProgress: number) {
                        llmState.state = {
                            ...llmState.state,
                            model: {
                                ...llmState.state.model,
                                loadProgress
                            }
                        };
                    }
                });
                // Make filename more readable as model display name
                const getModelDisplayName = (modelPath: string) => {
                    const filename = path.basename(modelPath);
                    
                    // Clean up filename and extract meaningful parts
                    let name = filename
                        .replace(/\.(gguf|bin)$/i, '') // Remove extension
                        .replace(/^hf[_-]?/i, '') // Remove "hf_" prefix
                        .replace(/[_-]/g, ' ') // Replace underscores and dashes with spaces
                        .replace(/\s+/g, ' ') // Replace multiple spaces with single space
                        .trim();
                    
                    // Extract and format model size (e.g., "7B", "13B", "70B")
                    const sizeMatch = name.match(/\b(\d+\.?\d*)\s*B\b/i);
                    let size = '';
                    if (sizeMatch) {
                        size = sizeMatch[1] + 'B';
                        name = name.replace(/\b\d+\.?\d*\s*B\b/i, '').trim();
                    }
                    
                    // Extract quantization (e.g., "Q8_0", "Q4_K_M")
                    const quantMatch = name.match(/\bQ\d+[_K_M]*\b/i);
                    let quant = '';
                    if (quantMatch) {
                        quant = quantMatch[0];
                        name = name.replace(/\bQ\d+[_K_M]*\b/i, '').trim();
                    }
                    
                    // Clean up and capitalize model name
                    name = name
                        .replace(/\s+/g, ' ')
                        .trim()
                        .replace(/\b\w/g, char => char.toUpperCase()); // Capitalize words
                    
                    // Combine parts: "Model Name Size (Quantization)"
                    let displayName = name;
                    if (size) {
                        displayName += ` ${size}`;
                    }
                    if (quant) {
                        displayName += ` (${quant})`;
                    }
                    
                    return displayName || filename; // Fallback to original filename if parsing fails
                };

                llmState.state = {
                    ...llmState.state,
                    model: {
                        loaded: true,
                        loadProgress: 1,
                        name: getModelDisplayName(modelPath)
                    }
                };

                model.onDispose.createListener(() => {
                    llmState.state = {
                        ...llmState.state,
                        model: {loaded: false}
                    };
                });
            } catch (err) {
                console.error("Failed to load model", err);
                llmState.state = {
                    ...llmState.state,
                    model: {
                        loaded: false,
                        error: String(err)
                    }
                };
            }
        });
    },
    async createContext() {
        await withLock(llmFunctions, "context", async () => {
            if (model == null)
                throw new Error("Model not loaded");

            if (context != null) {
                try {
                    await context.dispose();
                    context = null;
                } catch (err) {
                    console.error("Failed to dispose context", err);
                }
            }

            try {
                llmState.state = {
                    ...llmState.state,
                    context: {loaded: false}
                };

                context = await model.createContext();
                llmState.state = {
                    ...llmState.state,
                    context: {loaded: true}
                };

                context.onDispose.createListener(() => {
                    llmState.state = {
                        ...llmState.state,
                        context: {loaded: false}
                    };
                });
            } catch (err) {
                console.error("Failed to create context", err);
                llmState.state = {
                    ...llmState.state,
                    context: {
                        loaded: false,
                        error: String(err)
                    }
                };
            }
        });
    },
    async createContextSequence() {
        await withLock(llmFunctions, "contextSequence", async () => {
            if (context == null)
                throw new Error("Context not loaded");

            try {
                llmState.state = {
                    ...llmState.state,
                    contextSequence: {loaded: false}
                };

                contextSequence = context.getSequence();
                llmState.state = {
                    ...llmState.state,
                    contextSequence: {loaded: true}
                };

                contextSequence.onDispose.createListener(() => {
                    llmState.state = {
                        ...llmState.state,
                        contextSequence: {loaded: false}
                    };
                });
            } catch (err) {
                console.error("Failed to get context sequence", err);
                llmState.state = {
                    ...llmState.state,
                    contextSequence: {
                        loaded: false,
                        error: String(err)
                    }
                };
            }
        });
    },
    chatSession: {
        async createChatSession() {
            await withLock(llmFunctions, "chatSession", async () => {
                if (contextSequence == null)
                    throw new Error("Context sequence not loaded");

                if (chatSession != null) {
                    try {
                        chatSession.dispose();
                        chatSession = null;
                        chatSessionCompletionEngine = null;
                    } catch (err) {
                        console.error("Failed to dispose chat session", err);
                    }
                }

                try {
                    llmState.state = {
                        ...llmState.state,
                        chatSession: {
                            loaded: false,
                            generatingResult: false,
                            simplifiedChat: [],
                            draftPrompt: llmState.state.chatSession.draftPrompt
                        }
                    };

                    llmFunctions.chatSession.resetChatHistory(false);

                    try {
                        await chatSession?.preloadPrompt("", {
                            signal: promptAbortController?.signal
                        });
                    } catch (err) {
                        // do nothing
                    }
                    chatSessionCompletionEngine?.complete(llmState.state.chatSession.draftPrompt.prompt);

                    llmState.state = {
                        ...llmState.state,
                        chatSession: {
                            ...llmState.state.chatSession,
                            loaded: true
                        }
                    };
                } catch (err) {
                    console.error("Failed to create chat session", err);
                    llmState.state = {
                        ...llmState.state,
                        chatSession: {
                            loaded: false,
                            generatingResult: false,
                            simplifiedChat: [],
                            draftPrompt: llmState.state.chatSession.draftPrompt
                        }
                    };
                }
            });
        },
        async prompt(message: string) {
            await withLock(llmFunctions, "chatSession", async () => {
                if (chatSession == null)
                    throw new Error("Chat session not loaded");

                llmState.state = {
                    ...llmState.state,
                    chatSession: {
                        ...llmState.state.chatSession,
                        generatingResult: true,
                        draftPrompt: {
                            prompt: "",
                            completion: ""
                        }
                    }
                };
                promptAbortController = new AbortController();

                llmState.state = {
                    ...llmState.state,
                    chatSession: {
                        ...llmState.state.chatSession,
                        simplifiedChat: getSimplifiedChatHistory(true, message)
                    }
                };

                const abortSignal = promptAbortController.signal;
                try {
                    await chatSession.prompt(message, {
                        signal: abortSignal,
                        stopOnAbortSignal: true,
                        functions: modelFunctions,
                        onResponseChunk(chunk) {
                            inProgressResponse = squashMessageIntoModelChatMessages(
                                inProgressResponse,
                                (chunk.type == null || chunk.segmentType == null)
                                    ? {
                                        type: "text",
                                        text: chunk.text
                                    }
                                    : {
                                        type: "segment",
                                        segmentType: chunk.segmentType,
                                        text: chunk.text,
                                        startTime: chunk.segmentStartTime?.toISOString(),
                                        endTime: chunk.segmentEndTime?.toISOString()
                                    }
                            );

                            llmState.state = {
                                ...llmState.state,
                                chatSession: {
                                    ...llmState.state.chatSession,
                                    simplifiedChat: getSimplifiedChatHistory(true, message)
                                }
                            };
                        }
                    });
                } catch (err) {
                    if (err !== abortSignal.reason)
                        throw err;

                    // if the prompt was aborted before the generation even started, we ignore the error
                }

                llmState.state = {
                    ...llmState.state,
                    chatSession: {
                        ...llmState.state.chatSession,
                        generatingResult: false,
                        simplifiedChat: getSimplifiedChatHistory(false),
                        draftPrompt: {
                            ...llmState.state.chatSession.draftPrompt,
                            completion: chatSessionCompletionEngine?.complete(llmState.state.chatSession.draftPrompt.prompt) ?? ""
                        }
                    }
                };
                inProgressResponse = [];
            });
        },
        stopActivePrompt() {
            promptAbortController?.abort();
        },
        resetChatHistory(markAsLoaded: boolean = true) {
            if (contextSequence == null)
                return;

            chatSession?.dispose();
            chatSession = new LlamaChatSession({
                contextSequence,
                autoDisposeSequence: false
            });
            chatSessionCompletionEngine = chatSession.createPromptCompletionEngine({
                onGeneration(prompt, completion) {
                    if (llmState.state.chatSession.draftPrompt.prompt === prompt) {
                        llmState.state = {
                            ...llmState.state,
                            chatSession: {
                                ...llmState.state.chatSession,
                                draftPrompt: {
                                    prompt,
                                    completion
                                }
                            }
                        };
                    }
                }
            });

            llmState.state = {
                ...llmState.state,
                chatSession: {
                    loaded: markAsLoaded
                        ? true
                        : llmState.state.chatSession.loaded,
                    generatingResult: false,
                    simplifiedChat: [],
                    draftPrompt: {
                        prompt: llmState.state.chatSession.draftPrompt.prompt,
                        completion: chatSessionCompletionEngine.complete(llmState.state.chatSession.draftPrompt.prompt) ?? ""
                    }
                }
            };

            chatSession.onDispose.createListener(() => {
                chatSessionCompletionEngine = null;
                promptAbortController = null;
                llmState.state = {
                    ...llmState.state,
                    chatSession: {
                        loaded: false,
                        generatingResult: false,
                        simplifiedChat: [],
                        draftPrompt: llmState.state.chatSession.draftPrompt
                    }
                };
            });
        },
        setDraftPrompt(prompt: string) {
            if (chatSessionCompletionEngine == null)
                return;

            llmState.state = {
                ...llmState.state,
                chatSession: {
                    ...llmState.state.chatSession,
                    draftPrompt: {
                        prompt: prompt,
                        completion: chatSessionCompletionEngine.complete(prompt) ?? ""
                    }
                }
            };
        }
    },
    
    // New model management functions
    async scanLocalModels() {
        try {
            await fs.mkdir(modelDirectoryPath, {recursive: true});
            const files = await fs.readdir(modelDirectoryPath);
            const ggufFiles = files.filter(file => file.endsWith('.gguf'));
            
            const localModels: LocalModel[] = [];
            
            // Helper function to make filename more readable
            const getReadableModelName = (filename: string) => {
                // Clean up filename and extract meaningful parts
                let name = filename
                    .replace(/\.(gguf|bin)$/i, '') // Remove extension
                    .replace(/^hf[_-]?/i, '') // Remove "hf_" prefix
                    .replace(/[_-]/g, ' ') // Replace underscores and dashes with spaces
                    .replace(/\s+/g, ' ') // Replace multiple spaces with single space
                    .trim();
                
                // Extract and format model size (e.g., "7B", "13B", "70B")
                const sizeMatch = name.match(/\b(\d+\.?\d*)\s*B\b/i);
                let size = '';
                if (sizeMatch) {
                    size = sizeMatch[1] + 'B';
                    name = name.replace(/\b\d+\.?\d*\s*B\b/i, '').trim();
                }
                
                // Extract quantization (e.g., "Q8_0", "Q4_K_M")
                const quantMatch = name.match(/\bQ\d+[_K_M]*\b/i);
                let quant = '';
                if (quantMatch) {
                    quant = quantMatch[0];
                    name = name.replace(/\bQ\d+[_K_M]*\b/i, '').trim();
                }
                
                // Clean up and capitalize model name
                name = name
                    .replace(/\s+/g, ' ')
                    .trim()
                    .replace(/\b\w/g, char => char.toUpperCase()); // Capitalize words
                
                // Combine parts: "Model Name Size (Quantization)"
                let displayName = name;
                if (size) {
                    displayName += ` ${size}`;
                }
                if (quant) {
                    displayName += ` (${quant})`;
                }
                
                return displayName || filename; // Fallback to original filename if parsing fails
            };
            
            for (const filename of ggufFiles) {
                const filePath = path.join(modelDirectoryPath, filename);
                const stats = await fs.stat(filePath);
                
                localModels.push({
                    id: filename,
                    name: getReadableModelName(filename),
                    path: filePath,
                    size: stats.size,
                    lastModified: stats.mtime
                });
            }
            
            llmState.state = {
                ...llmState.state,
                availableModels: {
                    ...llmState.state.availableModels,
                    local: localModels
                }
            };
        } catch (err) {
            console.error("Failed to scan local models", err);
        }
    },

    async loadDefaultModels() {
        llmState.state = {
            ...llmState.state,
            availableModels: {
                ...llmState.state.availableModels,
                loading: true
            }
        };

        try {
            // First, scan local models
            await llmFunctions.scanLocalModels();
            
            // Get top 10 most downloaded models with GGUF files
            const searchUrl = `https://huggingface.co/api/models?filter=gguf&sort=downloads&limit=10`;
            const response = await fetch(searchUrl);
            const data = await response.json();

            const topModels: RemoteModel[] = await Promise.all(
                data.map(async (model: any) => {
                    // Try to get model files info
                    let files: Array<{filename: string, size: number, downloadUrl: string}> = [];
                    try {
                        const filesResponse = await fetch(`https://huggingface.co/api/models/${model.id}/tree/main`);
                        const filesData = await filesResponse.json();
                        
                        const ggufFiles = filesData.filter((file: any) => 
                            file.type === 'file' && file.path.endsWith('.gguf')
                        );
                        
                        // Prioritize smaller quantizations for better compatibility
                        const prioritizedFiles = ggufFiles.sort((a: any, b: any) => {
                            const getQuantPriority = (filename: string) => {
                                if (filename.includes('Q4_K_M') || filename.includes('q4_k_m')) return 1;
                                if (filename.includes('Q4_0') || filename.includes('q4_0')) return 2;
                                if (filename.includes('Q5_K_M') || filename.includes('q5_k_m')) return 3;
                                if (filename.includes('Q8_0') || filename.includes('q8_0')) return 4;
                                return 5;
                            };
                            return getQuantPriority(a.path) - getQuantPriority(b.path);
                        });
                        
                        files = prioritizedFiles.slice(0, 3).map((file: any) => ({
                            filename: file.path,
                            size: file.size || 0,
                            downloadUrl: `https://huggingface.co/${model.id}/resolve/main/${file.path}`
                        }));
                    } catch (err) {
                        console.error(`Failed to get files for model ${model.id}`, err);
                    }

                    return {
                        id: model.id,
                        name: model.id,
                        author: model.id.split('/')[0] || 'unknown',
                        downloads: model.downloads || 0,
                        likes: model.likes || 0,
                        tags: model.tags || [],
                        description: model.description || `Popular model with ${(model.downloads || 0).toLocaleString()} downloads`,
                        url: `https://huggingface.co/${model.id}`,
                        files
                    };
                })
            );

            // Filter out models without files
            const validModels = topModels.filter(model => model.files.length > 0);

            llmState.state = {
                ...llmState.state,
                availableModels: {
                    ...llmState.state.availableModels,
                    remote: validModels,
                    loading: false
                }
            };
        } catch (err) {
            console.error("Failed to load default models", err);
            // Fallback to empty list if API fails, but keep local models
            llmState.state = {
                ...llmState.state,
                availableModels: {
                    ...llmState.state.availableModels,
                    remote: [],
                    loading: false
                }
            };
        }
    },

    async searchHuggingFaceModels(query: string) {
        if (!query.trim()) {
            llmState.state = {
                ...llmState.state,
                availableModels: {
                    ...llmState.state.availableModels,
                    searchQuery: query,
                    searchResults: []
                }
            };
            return;
        }

        llmState.state = {
            ...llmState.state,
            availableModels: {
                ...llmState.state.availableModels,
                loading: true,
                searchQuery: query
            }
        };

        try {
            const searchUrl = `https://huggingface.co/api/models?search=${encodeURIComponent(query)}&filter=gguf&sort=downloads&limit=10`;
            const response = await fetch(searchUrl);
            const data = await response.json();

            const searchResults: RemoteModel[] = await Promise.all(
                data.map(async (model: any) => {
                    // Try to get model files info
                    let files: Array<{filename: string, size: number, downloadUrl: string}> = [];
                    try {
                        const filesResponse = await fetch(`https://huggingface.co/api/models/${model.id}/tree/main`);
                        const filesData = await filesResponse.json();
                        
                        const ggufFiles = filesData.filter((file: any) => 
                            file.type === 'file' && file.path.endsWith('.gguf')
                        );
                        
                        files = ggufFiles.slice(0, 3).map((file: any) => ({
                            filename: file.path,
                            size: file.size || 0,
                            downloadUrl: `https://huggingface.co/${model.id}/resolve/main/${file.path}`
                        }));
                    } catch (err) {
                        console.error(`Failed to get files for model ${model.id}`, err);
                    }

                    return {
                        id: model.id,
                        name: model.id,
                        author: model.id.split('/')[0] || 'unknown',
                        downloads: model.downloads || 0,
                        likes: model.likes || 0,
                        tags: model.tags || [],
                        description: model.description || '',
                        url: `https://huggingface.co/${model.id}`,
                        files
                    };
                })
            );

            llmState.state = {
                ...llmState.state,
                availableModels: {
                    ...llmState.state.availableModels,
                    loading: false,
                    searchResults
                }
            };
        } catch (err) {
            console.error("Failed to search HuggingFace models", err);
            llmState.state = {
                ...llmState.state,
                availableModels: {
                    ...llmState.state.availableModels,
                    loading: false,
                    searchResults: []
                }
            };
        }
    },

    async downloadAndLoadModel(model: RemoteModel, fileIndex: number = 0) {
        if (model.files.length === 0) {
            console.error("No files available for model", model.id);
            return;
        }

        const file = model.files[fileIndex];
        if (!file) {
            console.error("File not found at index", fileIndex);
            return;
        }

        const localPath = path.join(modelDirectoryPath, file.filename);

        // Check if model already exists locally
        try {
            await fs.access(localPath);
            console.log("Model already exists locally, loading...");
            await llmFunctions.loadModelFromLocal(file.filename);
            return;
        } catch {
            // Model doesn't exist, need to download
        }

        llmState.state = {
            ...llmState.state,
            modelDownload: {
                downloading: true,
                downloadProgress: 0,
                modelName: file.filename,
                error: undefined
            }
        };

        try {
            await fs.mkdir(modelDirectoryPath, {recursive: true});

            const downloader = await createModelDownloader({
                modelUri: file.downloadUrl,
                dirPath: modelDirectoryPath,
                showCliProgress: false,
                onProgress: (progress) => {
                    const downloadProgress = progress.downloadedSize / progress.totalSize;
                    const speed = 0; // Speed calculation would need more complex implementation
                    
                    llmState.state = {
                        ...llmState.state,
                        modelDownload: {
                            ...llmState.state.modelDownload,
                            downloadProgress,
                            downloadSpeed: `${speed.toFixed(2)} MB/s`
                        }
                    };
                }
            });

            await downloader.download();

            llmState.state = {
                ...llmState.state,
                modelDownload: {
                    downloading: false
                }
            };

            // Load the downloaded model
            await llmFunctions.loadModelFromLocal(file.filename);
            await llmFunctions.scanLocalModels();

        } catch (err) {
            console.error("Failed to download model", err);
            llmState.state = {
                ...llmState.state,
                modelDownload: {
                    downloading: false,
                    error: String(err)
                }
            };
        }
    },

    async loadModelFromLocal(filename: string) {
        const modelPath = path.join(modelDirectoryPath, filename);
        
        llmState.state = {
            ...llmState.state,
            selectedModelFilePath: modelPath,
            chatSession: {
                loaded: false,
                generatingResult: false,
                simplifiedChat: [],
                draftPrompt: {
                    prompt: llmState.state.chatSession.draftPrompt.prompt,
                    completion: ""
                }
            }
        };

        if (!llmState.state.llama.loaded)
            await llmFunctions.loadLlama();

        await llmFunctions.loadModel(modelPath);
        await llmFunctions.createContext();
        await llmFunctions.createContextSequence();
        await llmFunctions.chatSession.createChatSession();
    },

    async unloadModel() {
        await withLock(llmFunctions, "model", async () => {
            // Stop any active prompt
            llmFunctions.chatSession.stopActivePrompt();

            // Dispose chat session
            if (chatSession != null) {
                try {
                    chatSession.dispose();
                    chatSession = null;
                    chatSessionCompletionEngine = null;
                } catch (err) {
                    console.error("Failed to dispose chat session", err);
                }
            }

            // Dispose context sequence  
            if (contextSequence != null) {
                try {
                    contextSequence.dispose();
                    contextSequence = null;
                } catch (err) {
                    console.error("Failed to dispose context sequence", err);
                }
            }

            // Dispose context
            if (context != null) {
                try {
                    await context.dispose();
                    context = null;
                } catch (err) {
                    console.error("Failed to dispose context", err);
                }
            }

            // Dispose model
            if (model != null) {
                try {
                    await model.dispose();
                    model = null;
                } catch (err) {
                    console.error("Failed to dispose model", err);
                }
            }

            // Reset state
            llmState.state = {
                ...llmState.state,
                selectedModelFilePath: undefined,
                model: {
                    loaded: false,
                    loadProgress: 0
                },
                context: {
                    loaded: false
                },
                contextSequence: {
                    loaded: false
                },
                chatSession: {
                    loaded: false,
                    generatingResult: false,
                    simplifiedChat: [],
                    draftPrompt: {
                        prompt: "",
                        completion: ""
                    }
                }
            };
        });
    }
} as const;

function getSimplifiedChatHistory(generatingResult: boolean, currentPrompt?: string) {
    if (chatSession == null)
        return [];

    const chatHistory: SimplifiedChatItem[] = chatSession.getChatHistory()
        .flatMap((item): SimplifiedChatItem[] => {
            if (item.type === "system")
                return [];
            else if (item.type === "user")
                return [{type: "user", message: item.text}];
            else if (item.type === "model")
                return [{
                    type: "model",
                    message: item.response
                        .filter((item) => (typeof item === "string" || isChatModelResponseSegment(item)))
                        .map((item): SimplifiedModelChatItem["message"][number] | null => {
                            if (typeof item === "string")
                                return {
                                    type: "text",
                                    text: item
                                };
                            else if (isChatModelResponseSegment(item))
                                return {
                                    type: "segment",
                                    segmentType: item.segmentType,
                                    text: item.text,
                                    startTime: item.startTime,
                                    endTime: item.endTime
                                };

                            void (item satisfies never); // ensure all item types are handled
                            return null;
                        })
                        .filter((item) => item != null)

                        // squash adjacent response items of the same type
                        .reduce((res, item) => {
                            return squashMessageIntoModelChatMessages(res, item);
                        }, [] as SimplifiedModelChatItem["message"])
                }];

            void (item satisfies never); // ensure all item types are handled
            return [];
        });

    if (generatingResult && currentPrompt != null) {
        chatHistory.push({
            type: "user",
            message: currentPrompt
        });

        if (inProgressResponse.length > 0)
            chatHistory.push({
                type: "model",
                message: inProgressResponse
            });
    }

    return chatHistory;
}

/** Squash a new model response message into the existing model response messages array */
function squashMessageIntoModelChatMessages(
    modelChatMessages: SimplifiedModelChatItem["message"],
    message: SimplifiedModelChatItem["message"][number]
): SimplifiedModelChatItem["message"] {
    const newModelChatMessages = structuredClone(modelChatMessages);
    const lastExistingModelMessage = newModelChatMessages.at(-1);

    if (lastExistingModelMessage == null || lastExistingModelMessage.type !== message.type) {
        // avoid pushing empty text messages
        if (message.type !== "text" || message.text !== "")
            newModelChatMessages.push(message);

        return newModelChatMessages;
    }

    if (lastExistingModelMessage.type === "text" && message.type === "text") {
        lastExistingModelMessage.text += message.text;
        return newModelChatMessages;
    } else if (
        lastExistingModelMessage.type === "segment" && message.type === "segment" &&
        lastExistingModelMessage.segmentType === message.segmentType &&
        lastExistingModelMessage.endTime == null
    ) {
        lastExistingModelMessage.text += message.text;
        lastExistingModelMessage.endTime = message.endTime;
        return newModelChatMessages;
    }

    newModelChatMessages.push(message);
    return newModelChatMessages;
}
