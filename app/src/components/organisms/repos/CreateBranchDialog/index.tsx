import { type FormEvent, useEffect, useState } from "react";

import { useTranslation } from "react-i18next";

import { Button } from "@/components/atoms/Button";
import { Checkbox } from "@/components/atoms/Checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/molecules/compounds/Dialog";
import { toast } from "@/lib/toast";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { gitBranchCreate } from "@/store/slices/reposSlice";

interface Props {
  open: boolean;
  repoId: string | null;
  onClose: () => void;
}

/** Modal asking for a new branch name and whether to check it out after
 *  creation. The source branch defaults to the repo's current HEAD so
 *  behaviour matches a plain `git checkout -b`. */
export function CreateBranchDialog({ open, repoId, onClose }: Props) {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const repo = useAppSelector((s) => (repoId ? s.repos.items[repoId] : null));
  const currentBranch = repo?.status.branch ?? null;

  const [name, setName] = useState("");
  const [checkout, setCheckout] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setName("");
      setCheckout(true);
    }
  }, [open]);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!repoId || !name.trim()) return;
    setSubmitting(true);
    try {
      await dispatch(gitBranchCreate({ repoId, name: name.trim(), from: null, checkout })).unwrap();
      toast.success(t("branch.created", { name: name.trim(), defaultValue: "Created '{{name}}'" }));
      onClose();
    } catch (err) {
      toast.error(String((err as Error)?.message ?? err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("branch.create_title", { defaultValue: "Create branch" })}</DialogTitle>
          <DialogDescription>
            {currentBranch
              ? t("branch.create_desc_from", {
                  from: currentBranch,
                  defaultValue: "Branches from '{{from}}'.",
                })
              : t("branch.create_desc", { defaultValue: "Branches from HEAD." })}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={(e) => void onSubmit(e)} className="flex flex-col gap-3">
          <input
            autoFocus
            required
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t("branch.name_placeholder", {
              defaultValue: "feat/my-new-feature",
            })}
            pattern="[A-Za-z0-9._/\-]+"
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <Checkbox checked={checkout} onCheckedChange={(v) => setCheckout(v === true)} />
            <span>{t("branch.checkout_after", { defaultValue: "Check out after creation" })}</span>
          </label>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              {t("actions.cancel", { ns: "common", defaultValue: "Cancel" })}
            </Button>
            <Button type="submit" loading={submitting} disabled={!name.trim()}>
              {t("branch.create_submit", { defaultValue: "Create" })}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
