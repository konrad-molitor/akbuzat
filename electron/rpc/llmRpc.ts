import path from "node:path";
import fs from "node:fs/promises";
import {BrowserWindow, dialog} from "electron";
import {createElectronSideBirpc} from "../utils/createElectronSideBirpc.ts";
import {llmFunctions, llmState, type RemoteModel} from "../state/llmState.ts";
import type {RenderedFunctions} from "../../src/rpc/llmRpc.ts";

const modelDirectoryPath = path.join(process.cwd(), "models");

export class ElectronLlmRpc {
    public readonly rendererLlmRpc: ReturnType<typeof createElectronSideBirpc<RenderedFunctions, typeof this.functions>>;

    public readonly functions = {
        async selectModelFileAndLoad() {
            const res = await dialog.showOpenDialog({
                message: "Select a model file",
                title: "Select a model file",
                filters: [
                    {name: "Model file", extensions: ["gguf"]}
                ],
                buttonLabel: "Open",
                defaultPath: await pathExists(modelDirectoryPath)
                    ? modelDirectoryPath
                    : undefined,
                properties: ["openFile"]
            });

            if (!res.canceled && res.filePaths.length > 0) {
                llmState.state = {
                    ...llmState.state,
                    selectedModelFilePath: path.resolve(res.filePaths[0]!),
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

                await llmFunctions.loadModel(llmState.state.selectedModelFilePath!);
                await llmFunctions.createContext();
                await llmFunctions.createContextSequence();
                await llmFunctions.chatSession.createChatSession();
            }
        },
        getState() {
            return llmState.state;
        },
        setDraftPrompt: llmFunctions.chatSession.setDraftPrompt,
        prompt: llmFunctions.chatSession.prompt,
        stopActivePrompt: llmFunctions.chatSession.stopActivePrompt,
        resetChatHistory: llmFunctions.chatSession.resetChatHistory,
        
        // New model management functions
        async initializeModels() {
            await llmFunctions.scanLocalModels();
            await llmFunctions.loadDefaultModels(); 
        },
        getRecommendedModel: llmFunctions.getRecommendedModel,
        async downloadSmolLM() {
            const smolLMModel: RemoteModel = {
                id: 'HuggingFaceTB/SmolLM2-1.7B-Instruct-GGUF',
                name: 'SmolLM2 1.7B Instruct',
                author: 'HuggingFaceTB',
                downloads: 9243,
                likes: 42,
                tags: ['chat', 'instruct', 'small'],
                description: 'State-of-the-art compact LLM for on-device applications',
                url: 'https://huggingface.co/HuggingFaceTB/SmolLM2-1.7B-Instruct-GGUF',
                files: [{
                    filename: 'smollm2-1.7b-instruct-q4_k_m.gguf',
                    size: 1060000000, // approximately 1.06 GB
                    downloadUrl: 'https://huggingface.co/HuggingFaceTB/SmolLM2-1.7B-Instruct-GGUF/resolve/main/smollm2-1.7b-instruct-q4_k_m.gguf'
                }]
            };
            await llmFunctions.downloadAndLoadModel(smolLMModel, 0);
        },
        scanLocalModels: llmFunctions.scanLocalModels,
        searchHuggingFaceModels: llmFunctions.searchHuggingFaceModels,
        downloadAndLoadModel: llmFunctions.downloadAndLoadModel,
        loadModelFromLocal: llmFunctions.loadModelFromLocal,
        unloadModel: llmFunctions.unloadModel,
        deleteModel: llmFunctions.deleteModel,
        deleteMultipleModels: llmFunctions.deleteMultipleModels
    } as const;

    public constructor(window: BrowserWindow) {
        this.rendererLlmRpc = createElectronSideBirpc<RenderedFunctions, typeof this.functions>("llmRpc", "llmRpc", window, this.functions);

        this.sendCurrentLlmState = this.sendCurrentLlmState.bind(this);

        llmState.createChangeListener(this.sendCurrentLlmState);
        this.sendCurrentLlmState();
    }

    public sendCurrentLlmState() {
        this.rendererLlmRpc.updateState(llmState.state);
    }
}

export type ElectronFunctions = typeof ElectronLlmRpc.prototype.functions;

export function registerLlmRpc(window: BrowserWindow) {
    new ElectronLlmRpc(window);
}

async function pathExists(path: string) {
    try {
        await fs.access(path);
        return true;
    } catch {
        return false;
    }
}
