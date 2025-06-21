import {State} from "lifecycle-utils";

import {LlmState} from "../../electron/state/llmState.ts";

export const llmState = new State<LlmState>({
    appVersion: undefined,
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
