import {useCallback, useEffect, useState} from "react";
import {Card, CardBody, Button, Spinner} from "@heroui/react";
import {ArrowDownTrayIcon, ChatBubbleLeftIcon, ExclamationTriangleIcon, ArrowPathIcon} from "@heroicons/react/24/outline";
import {LlmState, LocalModel, RemoteModel} from "../../../../electron/state/llmState.js";
import {electronLlmRpc} from "../../../rpc/llmRpc.js";

export function StartScreen({
    state,
    loading,
    error,
    onModelSelect
}: StartScreenProps) {
    const [recommendation, setRecommendation] = useState<{
        type: 'local' | 'remote' | 'download',
        model?: LocalModel | RemoteModel,
        downloadUrl?: string
    } | null>(null);
    
    const [isDownloading, setIsDownloading] = useState(false);

    useEffect(() => {
        const getRecommendation = async () => {
            try {
                const rec = await electronLlmRpc.getRecommendedModel();
                setRecommendation(rec);
            } catch (err) {
                console.error('Failed to get model recommendation:', err);
            }
        };
        getRecommendation();
    }, [state.availableModels]);

    const handleModelAction = useCallback(async () => {
        if (!recommendation) return;

        if (recommendation.type === 'local' && recommendation.model) {
            onModelSelect?.(recommendation.model, 'local');
        } else if (recommendation.type === 'download') {
            setIsDownloading(true);
            try {
                await electronLlmRpc.downloadSmolLM();
            } catch (err) {
                console.error('Failed to download SmolLM:', err);
            } finally {
                setIsDownloading(false);
            }
        }
    }, [recommendation, onModelSelect]);

    const getButtonText = () => {
        if (!recommendation) return "Loading...";
        
        if (recommendation.type === 'local' && recommendation.model) {
            return `Use ${recommendation.model.name}`;
        } else if (recommendation.type === 'download') {
            return "Download SmolLM2 1.7B";
        }
        return "Load Model";
    };

    const getDescription = () => {
        if (!recommendation) return "Preparing recommendations...";
        
        if (recommendation.type === 'local' && recommendation.model) {
            const localModel = recommendation.model as LocalModel;
            if (state.lastUsedModelPath === localModel.path) {
                return "Continue with your last used model";
            }
            return state.availableModels.local.length === 1 
                ? "You have one model available"
                : "Your most recently added model";
        } else if (recommendation.type === 'download') {
            return "No models found. SmolLM2 is a great starter model - compact, fast, and capable.";
        }
        return "";
    };

    return (
        <Card className="max-w-2xl w-full">
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
                
                {!loading && !error && (
                    <>
                        {state.selectedModelFilePath == null ? (
                            <div className="text-center">
                                <div className="mb-4">
                                    {recommendation?.type === 'download' ? (
                                        <ArrowDownTrayIcon className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                                    ) : (
                                        <ChatBubbleLeftIcon className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                                    )}
                                </div>
                                
                                <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
                                    {recommendation?.type === 'download' ? 'No Model Loaded' : 'Ready to Chat'}
                                </h2>
                                
                                <p className="text-gray-500 dark:text-gray-400 mb-6">
                                    {getDescription()}
                                </p>
                                
                                <Button
                                    color="primary"
                                    size="lg"
                                    onPress={handleModelAction}
                                    isLoading={isDownloading || state.modelDownload?.downloading}
                                    isDisabled={!recommendation}
                                    startContent={
                                        !isDownloading && !state.modelDownload?.downloading && recommendation?.type === 'download' ? (
                                            <ArrowDownTrayIcon className="w-5 h-5" />
                                        ) : null
                                    }
                                >
                                    {isDownloading || state.modelDownload?.downloading 
                                        ? "Downloading..." 
                                        : getButtonText()
                                    }
                                </Button>
                                
                                {state.modelDownload?.downloading && (
                                    <div className="mt-4">
                                        <div className="text-sm text-gray-500 mb-2">
                                            {Math.round((state.modelDownload.downloadProgress || 0) * 100)}% complete
                                        </div>
                                        <div className="w-full bg-gray-200 rounded-full h-2">
                                            <div 
                                                className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                                                style={{width: `${(state.modelDownload.downloadProgress || 0) * 100}%`}}
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="text-center text-gray-500">
                                <ChatBubbleLeftIcon className="w-8 h-8 mx-auto mb-2" />
                                <p>Type a message to start the conversation</p>
                            </div>
                        )}
                    </>
                )}
            </CardBody>
        </Card>
    );
}

type StartScreenProps = {
    state: LlmState;
    loading: boolean;
    error: string | null;
    onModelSelect?: (model: LocalModel | RemoteModel, type: 'local' | 'remote') => void;
}; 