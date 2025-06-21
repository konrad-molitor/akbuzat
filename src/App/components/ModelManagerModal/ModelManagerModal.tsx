import React, {useState, useMemo, useCallback, Key} from "react";
import {
    Modal,
    ModalContent,
    ModalHeader,
    ModalBody,
    ModalFooter,
    Table,
    TableHeader,
    TableBody,
    TableColumn,
    TableRow,
    TableCell,
    Button,
    Checkbox,
    Tooltip,
    SortDescriptor,
    Selection
} from "@heroui/react";
import {ArrowDownIcon, EyeIcon, TrashIcon} from "@heroicons/react/24/outline";
import {LocalModel} from "../../../../electron/state/llmState.js";

interface ModelManagerModalProps {
    isOpen: boolean;
    onClose: () => void;
    localModels: LocalModel[];
    currentModelPath?: string;
    onLoadModel: (filename: string) => void;
    onDeleteModel: (filename: string) => void;
    onDeleteMultipleModels: (filenames: string[]) => void;
}

const columns = [
    {name: "SELECT", uid: "select", sortable: false},
    {name: "File Name", uid: "filename", sortable: true},
    {name: "Model Name", uid: "modelName", sortable: true},
    {name: "Size", uid: "size", sortable: true},
    {name: "Modified", uid: "lastModified", sortable: true},
    {name: "Actions", uid: "actions", sortable: false},
];

export function ModelManagerModal({
    isOpen,
    onClose,
    localModels,
    currentModelPath,
    onLoadModel,
    onDeleteModel,
    onDeleteMultipleModels
}: ModelManagerModalProps) {
    const [selectedKeys, setSelectedKeys] = useState<Selection>(new Set<string>());
    const [sortDescriptor, setSortDescriptor] = useState<SortDescriptor>({
        column: "filename",
        direction: "ascending",
    });

    const sortedItems = useMemo(() => {
        return [...localModels].sort((a, b) => {
            let first: any = a[sortDescriptor.column as keyof LocalModel];
            let second: any = b[sortDescriptor.column as keyof LocalModel];
            
            // Handle special cases for sorting
            if (sortDescriptor.column === "size") {
                first = a.size;
                second = b.size;
            } else if (sortDescriptor.column === "filename") {
                first = a.id.toLowerCase();
                second = b.id.toLowerCase();
            } else if (sortDescriptor.column === "modelName") {
                first = a.name.toLowerCase();
                second = b.name.toLowerCase();
            } else if (sortDescriptor.column === "lastModified") {
                first = new Date(a.lastModified).getTime();
                second = new Date(b.lastModified).getTime();
            }
            
            const cmp = first < second ? -1 : first > second ? 1 : 0;
            return sortDescriptor.direction === "descending" ? -cmp : cmp;
        });
    }, [localModels, sortDescriptor]);

    const formatFileSize = (bytes: number) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    const handleSelectionChange = useCallback((keys: Selection) => {
        setSelectedKeys(keys);
    }, []);

    const selectedKeysArray = useMemo(() => {
        if (selectedKeys === "all") {
            return localModels.map(model => model.id);
        }
        return Array.from(selectedKeys) as string[];
    }, [selectedKeys, localModels]);

    const handleDeleteSelected = useCallback(() => {
        onDeleteMultipleModels(selectedKeysArray);
        setSelectedKeys(new Set<string>());
    }, [selectedKeysArray, onDeleteMultipleModels]);

    const handleClose = useCallback(() => {
        // Reset state when closing modal
        setSelectedKeys(new Set<string>());
        setSortDescriptor({
            column: "filename",
            direction: "ascending",
        });
        onClose();
    }, [onClose]);

    const isModelCurrent = useCallback((modelPath: string) => {
        return currentModelPath === modelPath;
    }, [currentModelPath]);

    const renderCell = useCallback((model: LocalModel, columnKey: Key) => {
        const cellValue = model[columnKey as keyof LocalModel];

        switch (columnKey) {
            case "select":
                return (
                    <Checkbox
                        isSelected={selectedKeys === "all" || (selectedKeys as Set<string>).has(model.id)}
                        onValueChange={(isSelected) => {
                            if (selectedKeys === "all") {
                                if (!isSelected) {
                                    const newKeys = new Set(localModels.map(m => m.id));
                                    newKeys.delete(model.id);
                                    setSelectedKeys(newKeys);
                                }
                            } else {
                                const newSelectedKeys = new Set(selectedKeys as Set<string>);
                                if (isSelected) {
                                    newSelectedKeys.add(model.id);
                                } else {
                                    newSelectedKeys.delete(model.id);
                                }
                                setSelectedKeys(newSelectedKeys);
                            }
                        }}
                    />
                );
            case "filename":
                return (
                    <div className="flex flex-col">
                        <p className="text-bold text-sm">{model.id}</p>
                    </div>
                );
            case "modelName":
                return (
                    <div className="flex flex-col">
                        <p className="text-bold text-sm">{model.name}</p>
                        {isModelCurrent(model.path) && (
                            <p className="text-tiny text-success">Active Model</p>
                        )}
                    </div>
                );
            case "size":
                return (
                    <div className="text-sm">
                        {formatFileSize(model.size)}
                    </div>
                );
            case "lastModified":
                return (
                    <div className="flex flex-col text-sm">
                        <span>{new Date(model.lastModified).toLocaleDateString('en-US')}</span>
                        <span className="text-xs text-default-400">
                            {new Date(model.lastModified).toLocaleTimeString('en-US', {
                                hour: '2-digit',
                                minute: '2-digit'
                            })}
                        </span>
                    </div>
                );
            case "actions":
                return (
                    <div className="flex items-center gap-2">
                        <Tooltip content="Load Model">
                            <Button
                                isIconOnly
                                size="sm"
                                variant="light"
                                color="primary"
                                onPress={() => onLoadModel(model.id)}
                                isDisabled={isModelCurrent(model.path)}
                            >
                                <ArrowDownIcon className="w-4 h-4" />
                            </Button>
                        </Tooltip>
                        <Tooltip content="Delete Model" color="danger">
                            <Button
                                isIconOnly
                                size="sm"
                                variant="light"
                                color="danger"
                                onPress={() => onDeleteModel(model.id)}
                            >
                                <TrashIcon className="w-4 h-4" />
                            </Button>
                        </Tooltip>
                    </div>
                );
            default:
                return String(cellValue);
        }
    }, [selectedKeys, currentModelPath, onLoadModel, onDeleteModel, isModelCurrent]);

    return (
        <Modal 
            isOpen={isOpen} 
            onClose={handleClose}
            size="4xl"
            scrollBehavior="inside"
        >
            <ModalContent>
                <ModalHeader className="flex flex-col gap-1">
                    <h2 className="text-xl font-semibold">Local Model Management</h2>
                    <p className="text-sm text-default-500">
                        Total models: {localModels.length}
                        {selectedKeysArray.length > 0 && ` • Selected: ${selectedKeysArray.length}`}
                    </p>
                </ModalHeader>
                <ModalBody className="px-0">
                    <Table
                        aria-label="Local models table"
                        isStriped
                        isHeaderSticky
                        removeWrapper
                        selectionMode="multiple"
                        selectedKeys={selectedKeys}
                        onSelectionChange={handleSelectionChange}
                        sortDescriptor={sortDescriptor}
                        onSortChange={setSortDescriptor}
                        classNames={{
                            base: "max-h-[500px] overflow-auto",
                            table: "min-h-[400px]",
                            tr: "h-10"
                        }}
                    >
                        <TableHeader columns={columns}>
                            {(column) => (
                                <TableColumn
                                    key={column.uid}
                                    allowsSorting={column.sortable}
                                    align={column.uid === "actions" ? "center" : "start"}
                                >
                                    {column.uid === "select" ? (
                                        <Checkbox
                                            isIndeterminate={selectedKeysArray.length > 0 && selectedKeysArray.length < localModels.length}
                                            isSelected={selectedKeysArray.length === localModels.length}
                                            onValueChange={(isSelected) => {
                                                if (isSelected) {
                                                    setSelectedKeys(new Set(localModels.map(model => model.id)));
                                                } else {
                                                    setSelectedKeys(new Set<string>());
                                                }
                                            }}
                                        />
                                    ) : (
                                        column.name
                                    )}
                                </TableColumn>
                            )}
                        </TableHeader>
                        <TableBody 
                            items={sortedItems}
                            emptyContent="No local models found"
                        >
                            {(item) => (
                                <TableRow key={item.id}>
                                    {(columnKey) => (
                                        <TableCell>{renderCell(item, columnKey)}</TableCell>
                                    )}
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </ModalBody>
                <ModalFooter className="justify-between">
                    <div>
                        {selectedKeysArray.length > 0 && (
                            <Button
                                color="danger"
                                variant="flat"
                                onPress={handleDeleteSelected}
                            >
                                Delete Selected ({selectedKeysArray.length})
                            </Button>
                        )}
                    </div>
                    <Button color="primary" onPress={handleClose}>
                        Close
                    </Button>
                </ModalFooter>
            </ModalContent>
        </Modal>
    );
} 