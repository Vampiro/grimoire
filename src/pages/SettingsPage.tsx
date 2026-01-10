import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { userAtom, uiScaleAtom, store } from "@/globalState";
import { setUserUiScale } from "@/firebase/userSettings";
import { useAtomValue } from "jotai";
import { useMemo, useState } from "react";

/**
 * Supported UI scale values exposed to the user.
 */
const UI_SCALE_OPTIONS: Array<{ label: string; value: number }> = [
  { label: "75%", value: 0.75 },
  { label: "90%", value: 0.9 },
  { label: "100% (Default)", value: 1 },
  { label: "110%", value: 1.1 },
  { label: "125%", value: 1.25 },
  { label: "150%", value: 1.5 },
];

/**
 * User settings page.
 *
 * @remarks
 * Currently supports adjusting a global UI scale value that is persisted in
 * Firestore and applied globally via the root font-size.
 */
export function SettingsPage() {
  const user = useAtomValue(userAtom);
  const uiScale = useAtomValue(uiScaleAtom);
  const [error, setError] = useState<string | null>(null);

  const selectValue = useMemo(() => {
    const match = UI_SCALE_OPTIONS.find((o) => o.value === uiScale);
    return match ? String(match.value) : String(1);
  }, [uiScale]);

  if (!user) return null;

  return (
    <div>
      <Card>
        <CardHeader>
          <CardTitle>Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="text-sm font-medium">UI scale</div>
            <div className="text-sm text-muted-foreground">
              Controls the size of UI elements across devices.
            </div>
            <Select
              value={selectValue}
              onValueChange={(value) => {
                const next = Number(value);
                if (!Number.isFinite(next)) return;

                setError(null);
                store.set(uiScaleAtom, next);

                void setUserUiScale(user.uid, next).catch((err) => {
                  setError(
                    err instanceof Error
                      ? err.message
                      : "Failed to save settings",
                  );
                });
              }}
            >
              <SelectTrigger className="w-full max-w-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {UI_SCALE_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={String(o.value)}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {error && <p className="text-xs text-destructive">{error}</p>}
        </CardContent>
      </Card>
    </div>
  );
}
