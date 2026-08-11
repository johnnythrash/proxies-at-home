import { useSettingsStore } from "@/store/settings";
import { Label, Button } from "flowbite-react";
import { PageSizeControl } from "../../LayoutSettings/PageSizeControl";
import { NumberInput } from "@/components/common";
import { useNormalizedInput } from "@/hooks/useInputHooks";
import { AutoTooltip } from "@/components/common";

export function LayoutSection() {
    const columns = useSettingsStore((state) => state.columns);
    const rows = useSettingsStore((state) => state.rows);
    const pageOrientation = useSettingsStore((state) => state.pageOrientation);
    const pageWidth = useSettingsStore((state) => state.pageWidth);
    const pageHeight = useSettingsStore((state) => state.pageHeight);
    const registrationMarks = useSettingsStore((state) => state.registrationMarks);
    const setColumns = useSettingsStore((state) => state.setColumns);
    const setRows = useSettingsStore((state) => state.setRows);
    const applyScmPreset = useSettingsStore((state) => state.applyScmPreset);
    const applyScmTabloidPreset = useSettingsStore((state) => state.applyScmTabloidPreset);
    const registrationMarkLengthMm = useSettingsStore((state) => state.registrationMarkLengthMm);
    const isSilhouetteLetterActive =
        pageOrientation === "landscape" && pageWidth === 11 && pageHeight === 8.5 &&
        columns === 4 && rows === 2 && registrationMarks === "3";
    const isSilhouetteTabloidActive =
        pageOrientation === "portrait" && pageWidth === 11 && pageHeight === 17 &&
        columns === 4 && rows === 4 && registrationMarks === "3" &&
        Math.abs(registrationMarkLengthMm - 19.9898) < 0.001;

    const columnsInput = useNormalizedInput(
        columns,
        (value) => setColumns(value),
        { min: 1, max: 10, isInteger: true }
    );

    const rowsInput = useNormalizedInput(
        rows,
        (value) => setRows(value),
        { min: 1, max: 10, isInteger: true }
    );

    return (
        <div className="space-y-4">
            <div className="space-y-2">
                <Label>Silhouette Card Maker preset</Label>
                <div className="grid grid-cols-2 gap-2">
                    <Button color="gray" size="sm" onClick={applyScmPreset}>
                        Letter 4×2
                        {isSilhouetteLetterActive && <span className="ml-2 text-xs text-green-700 dark:text-green-300">Active</span>}
                    </Button>
                    <Button color="gray" size="sm" onClick={applyScmTabloidPreset}>
                        Tabloid MTG 4×4
                        {isSilhouetteTabloidActive && <span className="ml-2 text-xs text-green-700 dark:text-green-300">Active</span>}
                    </Button>
                </div>
                <AutoTooltip content="Alan Cha SCM presets. Tabloid MTG uses 11×17 portrait, a 4×4 grid, 0.625mm bleed, 2.5mm card corners, and 20mm registration arms." />
            </div>

            <PageSizeControl />

            <div className="grid grid-cols-2 gap-3">
                <div>
                    <Label htmlFor="columns-input">Columns</Label>
                    <NumberInput
                        id="columns-input"
                        ref={columnsInput.inputRef}
                        className="w-full"
                        min={1}
                        max={10}
                        defaultValue={columnsInput.defaultValue}
                        onChange={columnsInput.handleChange}
                        onBlur={columnsInput.handleBlur}
                        placeholder={columns.toString()}
                    />
                </div>
                <div>
                    <Label htmlFor="rows-input">Rows</Label>
                    <NumberInput
                        id="rows-input"
                        ref={rowsInput.inputRef}
                        className="w-full"
                        min={1}
                        max={10}
                        defaultValue={rowsInput.defaultValue}
                        onChange={rowsInput.handleChange}
                        onBlur={rowsInput.handleBlur}
                        placeholder={rows.toString()}
                    />
                </div>
            </div>
        </div>
    );
}
