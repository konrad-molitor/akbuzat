import {useCallback, useLayoutEffect, useRef, useEffect} from "react";
import {llmState} from "../state/llmState.ts";
import {electronLlmRpc} from "../rpc/llmRpc.ts";
import {useExternalState} from "../hooks/useExternalState.ts";
import {LocalModel, RemoteModel} from "../../electron/state/llmState.js";
import {Header} from "./components/Header/Header.tsx";
import {ChatHistory} from "./components/ChatHistory/ChatHistory.tsx";
import {InputRow} from "./components/InputRow/InputRow.tsx";
import {StartScreen} from "./components/StartScreen/StartScreen.tsx";
import {Sidebar} from "./components/Sidebar/Sidebar.tsx";

export function App() {
    const state = useExternalState(llmState);
    const {generatingResult} = state.chatSession;
    const isScrollAnchoredRef = useRef(false);
    const lastAnchorScrollTopRef = useRef<number>(0);

    const isScrolledToTheBottom = useCallback(() => {
        return (
            document.documentElement.scrollHeight - document.documentElement.scrollTop - 1
        ) <= document.documentElement.clientHeight;
    }, []);

    const scrollToBottom = useCallback(() => {
        const newScrollTop = document.documentElement.scrollHeight - document.documentElement.clientHeight;

        if (newScrollTop > document.documentElement.scrollTop && newScrollTop > lastAnchorScrollTopRef.current) {
            document.documentElement.scrollTo({
                top: newScrollTop,
                behavior: "smooth"
            });
            lastAnchorScrollTopRef.current = document.documentElement.scrollTop;
        }

        isScrollAnchoredRef.current = true;
    }, []);

    useLayoutEffect(() => {
        function onScroll() {
            const currentScrollTop = document.documentElement.scrollTop;

            isScrollAnchoredRef.current = isScrolledToTheBottom() ||
                currentScrollTop >= lastAnchorScrollTopRef.current;

            if (isScrollAnchoredRef.current)
                lastAnchorScrollTopRef.current = currentScrollTop;
        }

        const observer = new ResizeObserver(() => {
            if (isScrollAnchoredRef.current && !isScrolledToTheBottom())
                scrollToBottom();
        });

        window.addEventListener("scroll", onScroll, {passive: false});
        observer.observe(document.body, {
            box: "border-box"
        });
        scrollToBottom();

        return () => {
            observer.disconnect();
            window.removeEventListener("scroll", onScroll);
        };
    }, []);

    const openSelectModelFileDialog = useCallback(async () => {
        await electronLlmRpc.selectModelFileAndLoad();
    }, []);

    const stopActivePrompt = useCallback(() => {
        void electronLlmRpc.stopActivePrompt();
    }, []);

    const resetChatHistory = useCallback(() => {
        void electronLlmRpc.stopActivePrompt();
        void electronLlmRpc.resetChatHistory();
    }, []);

    const sendPrompt = useCallback((prompt: string) => {
        if (generatingResult)
            return;

        scrollToBottom();
        void electronLlmRpc.prompt(prompt);
    }, [generatingResult, scrollToBottom]);

    const onPromptInput = useCallback((currentText: string) => {
        void electronLlmRpc.setDraftPrompt(currentText);
    }, []);

    // Initialize models when app starts
    useEffect(() => {
        void electronLlmRpc.initializeModels();
    }, []);

    // Model selector handlers
    const handleModelSelect = useCallback(async (model: LocalModel | RemoteModel, type: 'local' | 'remote') => {
        if (type === 'local') {
            const localModel = model as LocalModel;
            await electronLlmRpc.loadModelFromLocal(localModel.id);
        } else {
            const remoteModel = model as RemoteModel;
            await electronLlmRpc.downloadAndLoadModel(remoteModel);
        }
    }, []);

    const handleModelSearch = useCallback((query: string) => {
        void electronLlmRpc.searchHuggingFaceModels(query);
    }, []);

    const handleModelUnload = useCallback(async () => {
        await electronLlmRpc.unloadModel();
    }, []);

    const handleModelDelete = useCallback(async (filename: string) => {
        await electronLlmRpc.deleteModel(filename);
    }, []);

    const handleModelDeleteMultiple = useCallback(async (filenames: string[]) => {
        await electronLlmRpc.deleteMultipleModels(filenames);
    }, []);

    const error = state.llama.error ?? state.model.error ?? state.context.error ?? state.contextSequence.error;
    const loading = state.selectedModelFilePath != null && error == null && (
        !state.model.loaded || !state.llama.loaded || !state.context.loaded || !state.contextSequence.loaded || !state.chatSession.loaded
    );
    const showMessage = state.selectedModelFilePath == null || error != null || state.chatSession.simplifiedChat.length === 0;

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 w-full flex flex-col">
            <Header
                appVersion={state.appVersion}
                canShowCurrentVersion={state.selectedModelFilePath == null}
                modelName={state.model.name}
                loadPercentage={state.model.loadProgress}
                onLoadClick={openSelectModelFileDialog}
                onResetChatClick={
                    !showMessage
                        ? resetChatHistory
                        : undefined
                }
                llmState={state}
                onModelSelect={handleModelSelect}
                onModelSearch={handleModelSearch}
                onModelUnload={handleModelUnload}
                onModelDelete={handleModelDelete}
                onModelDeleteMultiple={handleModelDeleteMultiple}
                showModelSelector={true}
                className="fixed top-0 left-0 right-0 z-50 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm"
            />
            {showMessage && (
                <main className="flex-1 w-full px-4 pr-84 bg-gray-50 dark:bg-gray-900 pt-24 pb-24 flex items-center justify-center">
                    <StartScreen
                        state={state}
                        loading={loading}
                        error={error || null}
                        onModelSelect={handleModelSelect}
                    />
                </main>
            )}
            {!showMessage && (
                <main className="flex-1 w-full px-4 pr-84 bg-gray-50 dark:bg-gray-900 pt-24 pb-24">
                    <ChatHistory
                        className="w-full max-w-2xl mx-auto"
                        simplifiedChat={state.chatSession.simplifiedChat}
                        generatingResult={generatingResult}
                    />
                </main>
            )}
            
            {/* Fixed Sidebar */}
            <Sidebar />
            <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 z-40">
                <div className="w-full px-4 py-4">
                    <InputRow
                        disabled={!state.model.loaded || !state.contextSequence.loaded}
                        stopGeneration={
                            generatingResult
                                ? stopActivePrompt
                                : undefined
                        }
                        onPromptInput={onPromptInput}
                        sendPrompt={sendPrompt}
                        generatingResult={generatingResult}
                        autocompleteInputDraft={state.chatSession.draftPrompt.prompt}
                        autocompleteCompletion={state.chatSession.draftPrompt.completion}
                    />
                </div>
            </div>
        </div>
    );
}
