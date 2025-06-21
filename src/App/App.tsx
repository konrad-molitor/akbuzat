import {useCallback, useLayoutEffect, useRef, useEffect} from "react";
import {Card, CardBody, CardHeader} from "@heroui/react";
import {ExclamationTriangleIcon, ArrowPathIcon, ChatBubbleLeftIcon} from "@heroicons/react/24/outline";
import {llmState} from "../state/llmState.ts";
import {electronLlmRpc} from "../rpc/llmRpc.ts";
import {useExternalState} from "../hooks/useExternalState.ts";
import {LocalModel, RemoteModel} from "../../electron/state/llmState.js";
import {SearchIconSVG} from "../icons/SearchIconSVG.tsx";
import {StarIconSVG} from "../icons/StarIconSVG.tsx";
import {DownloadIconSVG} from "../icons/DownloadIconSVG.tsx";
import {Header} from "./components/Header/Header.tsx";
import {ChatHistory} from "./components/ChatHistory/ChatHistory.tsx";
import {InputRow} from "./components/InputRow/InputRow.tsx";

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
                showModelSelector={true}
                className="fixed top-0 left-0 right-0 z-50 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm"
            />
            <main className="flex-1 w-full px-4 bg-gray-50 dark:bg-gray-900 pt-24 pb-24">
                {showMessage && (
                    <Card className="max-w-2xl mx-auto w-full">
                        <CardBody className="p-6 w-full">
                            {error != null && (
                                <div className="flex items-center gap-2 text-red-500 mb-4">
                                    <ExclamationTriangleIcon className="w-5 h-5" />
                                    <span>{String(error)}</span>
                                </div>
                            )}
                            {loading && (
                                <div className="flex items-center gap-2 text-blue-500 mb-4">
                                    <ArrowPathIcon className="w-5 h-5 animate-spin" />
                                    <span>Loading...</span>
                                </div>
                            )}
                            {(state.selectedModelFilePath == null || state.llama.error != null) && (
                                <div className="text-center text-gray-500">
                                    <p>Click the button above to load a model</p>
                                </div>
                            )}
                            {(
                                !loading && 
                                state.selectedModelFilePath != null && 
                                error == null && 
                                state.chatSession.simplifiedChat.length === 0
                            ) && (
                                <div className="text-center text-gray-500">
                                    <ChatBubbleLeftIcon className="w-8 h-8 mx-auto mb-2" />
                                    <p>Type a message to start the conversation</p>
                                </div>
                            )}
                        </CardBody>
                    </Card>
                )}
                {!showMessage && (
                    <ChatHistory
                        className="w-full max-w-2xl mx-auto"
                        simplifiedChat={state.chatSession.simplifiedChat}
                        generatingResult={generatingResult}
                    />
                )}
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
            </main>
        </div>
    );
}
