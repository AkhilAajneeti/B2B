

import React, { useEffect, useRef, useState } from "react";
import Papa from "papaparse";
import toast from "react-hot-toast";
import Button from "components/ui/Button";
import Select from "components/ui/Select";
import Icon from "components/AppIcon";
import {
  API_BASE,
  ACTION_MAP,
  DRAWER_INITIAL,
  ENTITY_TYPE_OPTIONS,
  FIELD_OPTIONS,
  WHAT_TO_DO_OPTIONS,
} from "./constants";
import {
  formatShortDateTime,
  getStatusBadge,
  guessFieldForHeader,
} from "./utils";
import ImportResultTable from "./ImportResultTable";

const ImportDrawer = ({ isOpen, onClose, onSuccess, viewImportId }) => {
  // The whole drawer flow is described by a single object so resetting on
  // close is one assignment (`setState(DRAWER_INITIAL)`) and so any future
  // Step 2.5 / 3.1 field slots in without proliferating useState calls.
  const [state, setState] = useState(DRAWER_INITIAL);
  const fileInputRef = useRef(null);

  // When the parent flips isOpen back to true after a previous close, we
  // want a fresh form (Step 1) — UNLESS the parent also passed a
  // viewImportId, in which case we fetch that import and jump straight
  // to Step 3 (overview).
  useEffect(() => {
    if (!isOpen) return;
    setState({ ...DRAWER_INITIAL });

    if (viewImportId) {
      let cancelled = false;
      (async () => {
        try {
          const token = localStorage.getItem("auth_token");
          const selectFields = [
            "name",
            "phoneNumber",
            "cProject",
            "status",
            "createdAt",
            "cNextContactAt",
          ].join(",");

          // Four parallel fetches: the import detail + its imported,
          // duplicates, and errors related lists. The detail call gives
          // us status, counts, createdBy, and the source file name.
          const [detailRes, impRes, dupRes, errRes] = await Promise.all([
            fetch(`${API_BASE}/Import/${viewImportId}`, {
              headers: { "Content-Type": "application/json", token },
            }),
            fetch(
              `${API_BASE}/Import/${viewImportId}/imported?maxSize=20&orderBy=createdAt&order=desc&select=${selectFields}`,
              { headers: { "Content-Type": "application/json", token } },
            ),
            fetch(
              `${API_BASE}/Import/${viewImportId}/duplicates?maxSize=20&orderBy=createdAt&order=desc&select=${selectFields}`,
              { headers: { "Content-Type": "application/json", token } },
            ),
            fetch(
              `${API_BASE}/Import/${viewImportId}/errors?maxSize=50&orderBy=rowIndex&order=asc`,
              { headers: { "Content-Type": "application/json", token } },
            ),
          ]);

          if (cancelled) return;
          if (!detailRes.ok) {
            throw new Error(`Could not load import (${detailRes.status})`);
          }
          const importResult = await detailRes.json();
          const imported = impRes.ok ? (await impRes.json())?.list || [] : [];
          const duplicates = dupRes.ok
            ? (await dupRes.json())?.list || []
            : [];
          const errors = errRes.ok ? (await errRes.json())?.list || [] : [];

          setState((prev) => ({
            ...prev,
            step: 3,
            importResult,
            imported,
            duplicates,
            errors,
            // Best-effort: surface the original filename if EspoCRM
            // returns it on the import record. Different deploys expose
            // it under different keys.
            fileName:
              importResult?.fileName ||
              importResult?.fileFileName ||
              "import-file.csv",
          }));
        } catch (err) {
          if (cancelled) return;
          console.error("Failed to load import overview:", err);
          toast.error(err?.message || "Failed to load import");
          onClose?.();
        }
      })();
      return () => {
        cancelled = true;
      };
    }
  }, [isOpen, viewImportId, onClose]);

  if (!isOpen) return null;

  // -------------------------------------------------------------------------
  // Step 1 — file handling
  // -------------------------------------------------------------------------

  // CSV upload — parsed entirely client-side via PapaParse so the rep gets
  // an instant preview before any bytes hit the backend. `header: true` so
  // the first row becomes column names; `skipEmptyLines` drops trailing
  // blank rows the spreadsheet often leaves at the end of an export.
  const handleFilePick = (e) => {
    const file = e?.target?.files?.[0];
    if (!file) return;
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (result) => {
        setState((prev) => ({
          ...prev,
          fileName: file.name,
          // Keep the raw File so submit can stream the original bytes to
          // /Import/file without re-prompting — and so any minor PapaParse
          // trim/transform doesn't drift from what EspoCRM sees on the
          // server side.
          file,
          headers: result?.meta?.fields || [],
          rows: result?.data || [],
        }));
      },
      error: (err) => {
        console.error("CSV parse failed:", err);
        toast.error("Could not parse the CSV — check the file format");
      },
    });
    // Reset the input so picking the same file again still fires onChange.
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // -------------------------------------------------------------------------
  // Step navigation
  // -------------------------------------------------------------------------

  const goToNextStep = () => {
    if (state.step === 1) {
      if (!state.entityType) {
        toast.error("Pick an entity type before continuing");
        return;
      }
      if (!state.fileName) {
        toast.error("Upload a CSV file before continuing");
        return;
      }
      // Auto-match each CSV header to the closest EspoCRM field. Defaults
      // the matcher can't resolve land on "" (-Skip-) so the rep can
      // assign manually.
      const autoMapping = {};
      for (const header of state.headers) {
        autoMapping[header] = guessFieldForHeader(header);
      }
      setState((prev) => ({ ...prev, step: 2, mapping: autoMapping }));
      return;
    }
    setState((prev) => ({ ...prev, step: prev.step + 1 }));
  };

  const goToPrevStep = () =>
    setState((prev) => ({ ...prev, step: Math.max(1, prev.step - 1) }));

  const updateMapping = (header, value) =>
    setState((prev) => ({
      ...prev,
      mapping: { ...prev.mapping, [header]: value },
    }));

  // -------------------------------------------------------------------------
  // Step 2 → submit (two-call import flow)
  //
  //   1. POST /Import/file  — uploads CSV text, returns { attachmentId }
  //   2. POST /Import       — kicks off the import using the attachmentId
  //                           + column-to-attribute map the rep just built
  //
  // On success we transition to Step 3 (overview) and call onSuccess so
  // the parent can refetch the imports list. On failure we toast and keep
  // the drawer open with state intact for the rep to retry.
  // -------------------------------------------------------------------------

  const handleSubmitImport = async () => {
    if (!state.file) {
      toast.error("Pick a CSV file before submitting");
      return;
    }
    if (!state.entityType) {
      toast.error("Pick an entity type before submitting");
      return;
    }
    setState((prev) => ({ ...prev, submitting: true }));

    try {
      const token = localStorage.getItem("auth_token");

      // 1. Upload the raw file.
      const csvText = await state.file.text();
      const fileRes = await fetch(`${API_BASE}/Import/file`, {
        method: "POST",
        headers: { "Content-Type": "text/csv", token },
        body: csvText,
      });
      if (!fileRes.ok) {
        throw new Error(
          `File upload failed (${fileRes.status} ${fileRes.statusText})`,
        );
      }
      const { attachmentId } = await fileRes.json();
      if (!attachmentId) {
        throw new Error("Server returned no attachmentId — upload rejected");
      }

      // 2. Build the import-job payload.
      const attributeList = state.headers.map(
        (h) => state.mapping[h] || "",
      );
      const previewArray = [
        state.headers,
        ...state.rows.slice(0, 20).map((r) =>
          state.headers.map((h) => r?.[h] ?? ""),
        ),
      ];
      const action = ACTION_MAP[state.whatToDo] || "create";

      const importRes = await fetch(`${API_BASE}/Import`, {
        method: "POST",
        headers: { "Content-Type": "application/json", token },
        body: JSON.stringify({
          action,
          attachmentId,
          attributeList,
          create: action,
          currency: "INR",
          dateFormat: "YYYY-MM-DD",
          decimalMark: ".",
          defaultFieldList: [],
          defaultValues: {},
          delimiter: ",",
          entityType: state.entityType,
          headerRow: true,
          idleMode: false,
          manualMode: false,
          personNameFormat: "f l",
          phoneNumberCountry: null,
          previewArray,
          previewString: csvText,
          silentMode: true,
          skipDuplicateChecking: false,
          textQualifier: '"',
          timeFormat: "HH:mm:ss",
          timezone: "UTC",
        }),
      });
      if (!importRes.ok) {
        throw new Error(
          `Import failed (${importRes.status} ${importRes.statusText})`,
        );
      }

      const importResult = await importRes.json();
      const importId = importResult?.id;

      // 3. Fetch Imported + Duplicates + Errors related lists in parallel.
      //    If they fail we still show the overview — the import itself
      //    already succeeded so degrading the overview is preferable to
      //    rolling everything back.
      let imported = [];
      let duplicates = [];
      let errors = [];
      if (importId) {
        const selectFields = [
          "name",
          "phoneNumber",
          "cProject",
          "status",
          "createdAt",
          "cNextContactAt",
        ].join(",");
        try {
          const [impRes, dupRes, errRes] = await Promise.all([
            fetch(
              `${API_BASE}/Import/${importId}/imported?maxSize=20&orderBy=createdAt&order=desc&select=${selectFields}`,
              { headers: { "Content-Type": "application/json", token } },
            ),
            fetch(
              `${API_BASE}/Import/${importId}/duplicates?maxSize=20&orderBy=createdAt&order=desc&select=${selectFields}`,
              { headers: { "Content-Type": "application/json", token } },
            ),
            fetch(
              `${API_BASE}/Import/${importId}/errors?maxSize=50&orderBy=rowIndex&order=asc`,
              { headers: { "Content-Type": "application/json", token } },
            ),
          ]);
          if (impRes.ok) imported = (await impRes.json())?.list || [];
          if (dupRes.ok) duplicates = (await dupRes.json())?.list || [];
          if (errRes.ok) errors = (await errRes.json())?.list || [];
        } catch (relErr) {
          console.warn("Failed to fetch import related lists:", relErr);
        }
      }

      toast.success("Import complete");
      setState((prev) => ({
        ...prev,
        step: 3,
        submitting: false,
        importResult,
        imported,
        duplicates,
        errors,
      }));
      onSuccess?.();
    } catch (err) {
      console.error("Import error:", err);
      toast.error(err?.message || "Import failed");
      setState((prev) => ({ ...prev, submitting: false }));
    }
  };

  // -------------------------------------------------------------------------
  // Step 3 — Remove Duplicates / Revert Import / Remove Import Log
  // -------------------------------------------------------------------------

  const runImportAction = async (actionKey, url, method = "POST") => {
    if (!state.importResult?.id) return;
    setState((prev) => ({ ...prev, pendingAction: actionKey }));
    try {
      const token = localStorage.getItem("auth_token");
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json", token },
      });
      if (!res.ok) {
        throw new Error(`${actionKey} failed (${res.status})`);
      }
      toast.success(`${actionKey} done`);
      onSuccess?.();
      if (actionKey === "Remove Import Log") {
        // The record is gone — close the drawer too.
        onClose?.();
      } else {
        setState((prev) => ({ ...prev, pendingAction: "" }));
      }
    } catch (err) {
      console.error(`${actionKey} error:`, err);
      toast.error(err?.message || `${actionKey} failed`);
      setState((prev) => ({ ...prev, pendingAction: "" }));
    }
  };

  // ----- Per-error-row actions (View / Remove) ------------------------------
  //
  // Open dropdown is tracked by a single `openErrorRowId` so two dropdowns
  // never appear together. `viewError` flips the `selectedError` modal on;
  // `removeError` DELETEs the error row and locally drops it from the list
  // (no need for a full overview refetch).
  const toggleErrorDropdown = (errorId) =>
    setState((prev) => ({
      ...prev,
      openErrorRowId: prev.openErrorRowId === errorId ? "" : errorId,
    }));

  const viewError = (error) =>
    setState((prev) => ({
      ...prev,
      selectedError: error,
      openErrorRowId: "",
    }));

  const closeErrorDetail = () =>
    setState((prev) => ({ ...prev, selectedError: null }));

  const removeError = async (error) => {
    try {
      const token = localStorage.getItem("auth_token");
      const res = await fetch(`${API_BASE}/Import/error/${error.id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json", token },
      });
      if (!res.ok) {
        throw new Error(`Could not remove error (${res.status})`);
      }
      // Drop the deleted row from local state — saves a full overview
      // refetch and keeps the UX snappy.
      setState((prev) => ({
        ...prev,
        errors: prev.errors.filter((e) => e.id !== error.id),
        openErrorRowId: "",
      }));
      toast.success("Error removed");
    } catch (err) {
      console.error("Remove error failed:", err);
      toast.error(err?.message || "Could not remove error");
    }
  };

  const handleRemoveDuplicates = () =>
    runImportAction(
      "Remove Duplicates",
      // EspoCRM exposes this as POST /Import/{id}/removeDuplicates
      // (no /action/ segment — that's the older convention).
      `${API_BASE}/Import/${state.importResult?.id}/removeDuplicates`,
    );
  const handleRevertImport = () =>
    runImportAction(
      "Revert Import",
      `${API_BASE}/Import/${state.importResult?.id}/action/revert`,
    );
  const handleRemoveImportLog = () =>
    runImportAction(
      "Remove Import Log",
      `${API_BASE}/Import/${state.importResult?.id}`,
      "DELETE",
    );

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-40"
        onClick={onClose}
        aria-hidden
      />

      <aside
        className="fixed top-0 right-0 h-full w-full max-w-3xl bg-background border-l border-border shadow-2xl z-50 flex flex-col"
        role="dialog"
        aria-labelledby="import-drawer-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <h2
            id="import-drawer-title"
            className="text-xl font-semibold text-foreground"
          >
            Import
          </h2>
          <div className="flex items-center gap-2">

            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              aria-label="Close drawer"
            >
              <Icon name="X" size={20} />
            </Button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div>
            <h3 className="text-base font-semibold text-foreground mb-3">
              Step {state.step}
            </h3>

            {/* ============ STEP 1 ============ */}
            {state.step === 1 && (
              <div className="border border-border rounded-lg p-4">
                <p className="text-sm text-muted-foreground mb-4">
                  What to Import?
                </p>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Select
                    label="Entity Type"
                    placeholder="Select an option"
                    options={ENTITY_TYPE_OPTIONS}
                    value={state.entityType}
                    onChange={(v) =>
                      setState((p) => ({ ...p, entityType: v }))
                    }
                  />

                  {/* File picker — visible button triggers a hidden
                      <input type="file"> so we get full styling control. */}
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">
                      File (CSV)
                    </label>
                    <div className="flex items-center gap-3">
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => fileInputRef.current?.click()}
                        aria-label="Choose CSV file"
                        title="Choose CSV file"
                      >
                        <Icon name="Paperclip" size={18} />
                      </Button>
                      <span className="text-xs text-muted-foreground truncate">
                        {state.fileName || "No file selected"}
                      </span>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".csv,text/csv"
                        className="hidden"
                        onChange={handleFilePick}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      Should be UTF-8 encoded
                    </p>
                  </div>

                  <Select
                    label="What to do?"
                    options={WHAT_TO_DO_OPTIONS}
                    value={state.whatToDo}
                    onChange={(v) =>
                      setState((p) => ({ ...p, whatToDo: v }))
                    }
                  />
                </div>
              </div>
            )}
          </div>

          {/* Step 1 preview */}
          {state.step === 1 && (
            <div className="border border-border rounded-lg p-4">
              <p className="text-sm text-muted-foreground mb-3">Preview</p>

              {!state.rows.length ? (
                <p className="text-sm text-foreground">No Data</p>
              ) : (
                <div className="overflow-x-auto -mx-2">
                  <table className="w-full text-sm border-collapse">
                    <thead>
                      <tr className="border-b border-border">
                        {state.headers.map((h) => (
                          <th
                            key={h}
                            className="text-left px-3 py-2 font-medium text-foreground whitespace-nowrap"
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {state.rows.slice(0, 10).map((row, i) => (
                        <tr key={i} className="border-b border-border">
                          {state.headers.map((h) => (
                            <td
                              key={h}
                              className="px-3 py-2 text-foreground whitespace-nowrap"
                            >
                              {row?.[h] ?? ""}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {state.rows.length > 10 && (
                    <p className="text-xs text-muted-foreground mt-2 px-3">
                      Showing first 10 of{" "}
                      {state.rows.length.toLocaleString()} rows
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ============ STEP 2 ============ */}
          {state.step === 2 && (
            <div className="border border-border rounded-lg p-4">
              <p className="text-sm text-muted-foreground mb-3">
                Field Mapping
              </p>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left px-4 py-3 font-medium text-foreground w-1/3">
                        Header Row Value
                      </th>
                      <th className="text-left px-4 py-3 font-medium text-foreground w-1/3">
                        Field
                      </th>
                      <th className="text-left px-4 py-3 font-medium text-foreground w-1/3">
                        First Row Value
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {state.headers.map((header) => (
                      <tr
                        key={header}
                        className="border-b border-border align-top"
                      >
                        <td className="px-4 py-3 text-foreground">
                          {header}
                        </td>
                        <td className="px-4 py-3">
                          <Select
                            searchable
                            options={FIELD_OPTIONS}
                            value={state.mapping[header] ?? ""}
                            onChange={(v) => updateMapping(header, v)}
                          />
                        </td>
                        <td className="px-4 py-3 text-foreground break-words">
                          {state.rows[0]?.[header] ?? ""}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ============ STEP 3 ============ */}
          {state.step === 3 && state.importResult && (
            <div className="space-y-6">
              {/* Title strip + action buttons */}
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="flex items-baseline gap-2">
                  <span className="text-primary font-semibold">Import</span>
                  <Icon
                    name="ChevronRight"
                    size={16}
                    className="text-muted-foreground"
                  />
                  <span className="text-lg font-semibold text-foreground">
                    {formatShortDateTime(state.importResult.createdAt)}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleRemoveDuplicates}
                    disabled={
                      !!state.pendingAction || state.duplicates.length === 0
                    }
                  >
                    {state.pendingAction === "Remove Duplicates" && (
                      <Icon
                        name="Loader2"
                        size={14}
                        className="mr-1 animate-spin"
                      />
                    )}
                    Remove Duplicates
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleRevertImport}
                    disabled={!!state.pendingAction}
                    className="bg-rose-50 border-rose-200 text-rose-700 hover:bg-rose-100"
                  >
                    {state.pendingAction === "Revert Import" && (
                      <Icon
                        name="Loader2"
                        size={14}
                        className="mr-1 animate-spin"
                      />
                    )}
                    Revert Import
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleRemoveImportLog}
                    disabled={!!state.pendingAction}
                  >
                    {state.pendingAction === "Remove Import Log" && (
                      <Icon
                        name="Loader2"
                        size={14}
                        className="mr-1 animate-spin"
                      />
                    )}
                    Remove Import Log
                  </Button>
                </div>
              </div>

              {/* Metadata cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="border border-border rounded-lg p-4 space-y-4">
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">
                      Entity Type
                    </p>
                    <p className="text-foreground font-medium mt-1">
                      {state.importResult.entityType ||
                        state.entityType ||
                        "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">
                      File
                    </p>
                    <p className="text-primary font-medium mt-1 flex items-center gap-1">
                      <Icon name="Paperclip" size={14} />
                      {state.fileName || "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">
                      Status
                    </p>
                    <span
                      className={`inline-block mt-1 px-3 py-1 text-xs font-medium rounded-full ${getStatusBadge(state.importResult.status)}`}
                    >
                      {state.importResult.status || "—"}
                    </span>
                  </div>
                </div>

                <div className="border border-border rounded-lg p-4">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">
                    Created
                  </p>
                  <p className="text-foreground font-medium mt-1">
                    {formatShortDateTime(state.importResult.createdAt)}
                    {state.importResult.createdByName && (
                      <>
                        <span className="text-muted-foreground mx-2">·</span>
                        <span className="text-primary">
                          {state.importResult.createdByName}
                        </span>
                      </>
                    )}
                  </p>
                </div>
              </div>

              <ImportResultTable
                title="Imported"
                rows={state.imported}
                totalFromResult={
                  state.importResult.importedCount ??
                  state.imported.length
                }
              />

              <ImportResultTable
                title="Duplicates"
                rows={state.duplicates}
                totalFromResult={
                  state.importResult.duplicateCount ??
                  state.duplicates.length
                }
              />

              {/* Errors table — only renders when there's at least one
                  error row (mirrors EspoCRM's behavior of hiding the
                  section on clean imports). Each row's arrow opens a
                  per-row dropdown with View / Remove.
                  NOTE: NO `overflow-hidden` on the card — the dropdown
                  needs to escape the card boundary on the last row. */}
              {state.errors.length > 0 && (
                <div className="border border-border rounded-lg">
                  <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-muted/30 rounded-t-lg">
                    <span className="w-2.5 h-2.5 rounded-sm bg-rose-500" />
                    <h3 className="font-semibold text-foreground">
                      Errors
                      <span className="text-muted-foreground font-normal ml-2">
                        ({state.errors.length.toLocaleString()})
                      </span>
                    </h3>
                  </div>
                  <div className="overflow-visible">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border text-muted-foreground">
                          <th className="text-left px-4 py-2 font-normal w-1/3">
                            Line Number
                          </th>
                          <th className="text-left px-4 py-2 font-normal">
                            Type
                          </th>
                          <th className="w-10 px-4 py-2" />
                        </tr>
                      </thead>
                      <tbody>
                        {state.errors.map((err, idx) => {
                          // The dropdown is absolutely-positioned, so it
                          // doesn't extend the drawer body's scroll height.
                          // For the last row, opening DOWN puts the menu
                          // below the scrollable area — unreachable. Open
                          // UP instead so the menu sits above the button,
                          // inside the visible viewport. Middle rows still
                          // open down (the row below absorbs the overlap).
                          const isLastRow = idx === state.errors.length - 1;
                          return (
                            <tr
                              key={err.id}
                              className="border-b border-border last:border-0"
                            >
                              <td className="px-4 py-2 text-foreground">
                                {err.rowIndex ?? err.lineNumber ?? "—"}
                              </td>
                              <td className="px-4 py-2 text-foreground">
                                {err.type || "—"}
                              </td>
                              <td className="px-4 py-2 relative">
                                {/* Arrow button toggles the dropdown for
                                  this specific row. `relative` on the cell
                                  + `absolute` on the menu keeps the
                                  positioning local. */}
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => toggleErrorDropdown(err.id)}
                                  aria-label="Error actions"
                                >
                                  <Icon name="ChevronDown" size={16} />
                                </Button>

                                {state.openErrorRowId === err.id && (
                                  <>
                                    {/* Click-outside backdrop */}
                                    <div
                                      className="fixed inset-0 z-10"
                                      onClick={() => toggleErrorDropdown(err.id)}
                                      aria-hidden
                                    />
                                    <div
                                      className={`absolute right-2 w-32 bg-popover border border-border rounded-md shadow-lg z-20 py-1 ${isLastRow
                                          ? "bottom-full mb-1"
                                          : "top-full mt-1"
                                        }`}
                                    >
                                      <button
                                        type="button"
                                        onClick={() => viewError(err)}
                                        className="block w-full text-left px-3 py-2 text-sm text-popover-foreground hover:bg-muted"
                                      >
                                        View
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => removeError(err)}
                                        className="block w-full text-left px-3 py-2 text-sm text-rose-600 hover:bg-rose-50"
                                      >
                                        Remove
                                      </button>
                                    </div>
                                  </>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-border p-4 flex items-center justify-between">
          {state.step === 2 ? (
            <Button
              variant="outline"
              onClick={goToPrevStep}
              disabled={state.submitting}
            >
              <Icon name="ChevronLeft" size={16} className="mr-1" />
              Back
            </Button>
          ) : (
            <span />
          )}

          {state.step === 1 && (
            <Button
              onClick={goToNextStep}
              disabled={!state.entityType || !state.fileName}
              className="linearbg-1 text-white hover:text-white"
            >
              Next
            </Button>
          )}
          {state.step === 2 && (
            <Button
              onClick={handleSubmitImport}
              disabled={state.submitting}
              className="linearbg-1 text-white hover:text-white"
            >
              {state.submitting ? (
                <>
                  <Icon
                    name="Loader2"
                    size={16}
                    className="mr-2 animate-spin"
                  />
                  Importing…
                </>
              ) : (
                "Submit"
              )}
            </Button>
          )}
          {state.step === 3 && (
            <Button
              onClick={onClose}
              className="linearbg-1 text-white hover:text-white"
            >
              Close
            </Button>
          )}
        </div>
      </aside>

      {/* ============ Error detail modal (overlay on top of drawer) ============
          Renders when the rep clicks "View" on an error row's dropdown.
          New layout (incident-card style):
            - rose accent header strip with AlertOctagon icon + subtitle
              that summarises "Row N · <type>" so the rep gets the context
              without reading the body
            - quick-stats pill row (Line, Export Line, Type) — replaces
              the old two-column metadata grid
            - "What went wrong" — each validation failure rendered as a
              rose-bordered card showing the friendly field label
              (looked up from FIELD_OPTIONS) plus the raw attribute code,
              with the failure reason as a chip
            - "Row data" — array shape rendered as a numbered list of
              cell values so it's actually readable; string shape falls
              back to the original mono block
          Higher z-index than the drawer (z-[70] modal / z-[60] backdrop)
          so it sits cleanly on top. */}
      {state.selectedError && (() => {
        const err = state.selectedError;
        const lineNumber = err.rowIndex ?? err.lineNumber ?? "—";
        const exportLine = err.exportRowIndex ?? err.rowIndex ?? "—";
        const errType = err.type || "Validation";
        const failures = Array.isArray(err.validationFailures)
          ? err.validationFailures
          : [];
        // Map raw EspoCRM attribute code (e.g. "cNextContactAt") to the
        // user-facing label ("Next Contact At") using the same options
        // list the Step-2 mapping table uses. Falls back to the raw code
        // if the field isn't in the list (custom attribute, typo, etc.).
        const fieldLabel = (code) => {
          if (!code) return "—";
          const found = FIELD_OPTIONS.find((f) => f.value === code);
          return found?.label || code;
        };
        return (
          <>
            <div
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60]"
              onClick={closeErrorDetail}
              aria-hidden
            />
            <div
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[70] w-full max-w-xl max-h-[85vh] overflow-hidden bg-background border border-border rounded-xl shadow-2xl flex flex-col"
              role="dialog"
              aria-labelledby="import-error-title"
            >
              {/* Header — rose accent strip + icon + contextual subtitle.
                Subtitle saves the rep a glance down: "Row 1 · Validation"
                tells them what they're looking at before they read on. */}
              <div className="relative">
                <div className="absolute inset-x-0 top-0 h-1 bg-rose-500" />
                <div className="flex items-start justify-between gap-3 p-5 pt-6 border-b border-border">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-rose-50 flex items-center justify-center shrink-0">
                      <Icon
                        name="AlertOctagon"
                        size={20}
                        className="text-rose-600"
                      />
                    </div>
                    <div className="min-w-0">
                      <h3
                        id="import-error-title"
                        className="text-base font-semibold text-foreground"
                      >
                        Import Error
                      </h3>
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">
                        Row {lineNumber} could not be imported · {errType}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={closeErrorDetail}
                    aria-label="Close error detail"
                    className="shrink-0"
                  >
                    <Icon name="X" size={18} />
                  </Button>
                </div>
              </div>

              <div className="overflow-y-auto p-5 space-y-5 text-sm">
                {/* Quick-stats pill row. Compact, scannable — replaces the
                  old two-column "Line Number / Export Line Number / Type"
                  block. Type pill is rose-tinted so the error category
                  stands out from neutral metadata. */}
                <div className="flex flex-wrap gap-2">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-muted/50 border border-border">
                    <Icon
                      name="Hash"
                      size={12}
                      className="text-muted-foreground"
                    />
                    <span className="text-xs text-muted-foreground">Line</span>
                    <span className="text-xs font-semibold text-foreground">
                      {lineNumber}
                    </span>
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-muted/50 border border-border">
                    <Icon
                      name="FileText"
                      size={12}
                      className="text-muted-foreground"
                    />
                    <span className="text-xs text-muted-foreground">
                      Export Line
                    </span>
                    <span className="text-xs font-semibold text-foreground">
                      {exportLine}
                    </span>
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-rose-50 border border-rose-200">
                    <Icon
                      name="AlertCircle"
                      size={12}
                      className="text-rose-600"
                    />
                    <span className="text-xs font-semibold text-rose-700">
                      {errType}
                    </span>
                  </span>
                </div>

                {/* What went wrong — each validation failure gets its own
                  card with the friendly field label, raw code, and a
                  reason chip. Card has a rose left border so a wall of
                  multiple failures still feels grouped under the error
                  identity without being overwhelming. */}
                {failures.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-2.5">
                      <Icon
                        name="ShieldAlert"
                        size={14}
                        className="text-rose-600"
                      />
                      <h4 className="text-sm font-semibold text-foreground">
                        What went wrong
                      </h4>
                      <span className="text-xs text-muted-foreground">
                        ({failures.length})
                      </span>
                    </div>
                    <div className="space-y-2">
                      {failures.map((vf, i) => {
                        const code = vf.field || vf.attribute || "";
                        const label = fieldLabel(code);
                        const reason =
                          vf.type || vf.validation || vf.message || "invalid";
                        return (
                          <div
                            key={i}
                            className="border-l-2 border-rose-400 bg-rose-50/40 rounded-r-md px-3 py-2.5"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <p className="text-sm font-medium text-foreground truncate">
                                  {label}
                                </p>
                                {code && code !== label && (
                                  <p className="text-[11px] font-mono text-muted-foreground mt-0.5 truncate">
                                    {code}
                                  </p>
                                )}
                              </div>
                              <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 text-[10px] font-semibold uppercase tracking-wide shrink-0">
                                {reason}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Row data — when EspoCRM gives us an array, render as a
                  numbered list of cell values so the rep can match column
                  index to the failing field. String shape (whole CSV
                  line) falls back to a mono block. */}
                {err.row && (
                  <div>
                    <div className="flex items-center gap-2 mb-2.5">
                      <Icon
                        name="Table"
                        size={14}
                        className="text-muted-foreground"
                      />
                      <h4 className="text-sm font-semibold text-foreground">
                        Row data
                      </h4>
                    </div>
                    <div className="border border-border rounded-md overflow-hidden">
                      {Array.isArray(err.row) ? (
                        err.row.map((v, i) => (
                          <div
                            key={i}
                            className="grid grid-cols-[44px_1fr] border-b border-border last:border-0 text-xs"
                          >
                            <div className="bg-muted/40 px-2 py-2 text-muted-foreground text-right tabular-nums border-r border-border">
                              {i + 1}
                            </div>
                            <div className="px-3 py-2 text-foreground font-mono break-all">
                              {v ? (
                                v
                              ) : (
                                <span className="text-muted-foreground italic">
                                  empty
                                </span>
                              )}
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="bg-muted/30 p-3 text-foreground whitespace-pre-wrap font-mono text-xs">
                          {err.row}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Footer — Close button kept for keyboard / mouse users
                who'd rather not aim for the small X. Right-aligned to
                follow the convention used elsewhere in the drawer. */}
              <div className="border-t border-border px-5 py-3 flex justify-end">
                <Button variant="outline" onClick={closeErrorDetail}>
                  Close
                </Button>
              </div>
            </div>
          </>
        );
      })()}
    </>
  );
};

export default ImportDrawer;
