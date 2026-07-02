/**
 * Import / export — JSON backup of the local store.
 *
 * Export writes `exportData()` to a temp file and hands it to the OS share
 * sheet. Import picks a `.json` file, parses + shape-checks it, shows real
 * counts from the parsed data, then calls `replaceAll()` — which replaces
 * every habit/log/profile on this device (and pushes the result as canonical
 * if signed in).
 */
import * as DocumentPicker from 'expo-document-picker';
import { File, Paths } from 'expo-file-system';
import { useRouter } from 'expo-router';
import * as Sharing from 'expo-sharing';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ChevronLeft, UploadIcon } from '@/components/icons';
import { Body, Display } from '@/components/text';
import { useStore, type HabitDef, type Persisted } from '@/design/store';
import { useTheme } from '@/design/theme';
import { Palette, tint } from '@/design/tokens';

function isHabitDef(v: unknown): v is HabitDef {
  if (!v || typeof v !== 'object') return false;
  const h = v as Record<string, unknown>;
  return typeof h.id === 'string' && typeof h.name === 'string' && Array.isArray(h.days) && h.days.length === 7;
}

function parseBackup(text: string): Persisted | null {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return null;
  }
  if (!data || typeof data !== 'object') return null;
  const d = data as Record<string, unknown>;
  if (!Array.isArray(d.habits) || !d.habits.every(isHabitDef)) return null;
  if (!d.logs || typeof d.logs !== 'object') return null;
  return data as Persisted;
}

export default function ImportScreen() {
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const dark = theme.scheme === 'dark';
  const { exportData, replaceAll } = useStore();

  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  const [picked, setPicked] = useState<Persisted | null>(null);
  const [pickedName, setPickedName] = useState('');
  const [importError, setImportError] = useState<string | null>(null);

  const sheetBg = dark ? '#0e0e12' : '#f6f1ec';

  const onExport = async () => {
    setExportError(null);
    setExporting(true);
    try {
      const file = new File(Paths.cache, `streakr-backup-${Date.now()}.json`);
      if (file.exists) file.delete();
      file.create();
      file.write(JSON.stringify(exportData(), null, 2));
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(file.uri, { mimeType: 'application/json', dialogTitle: 'Export Streakr data' });
      } else {
        setExportError('Sharing isn’t available on this device.');
      }
    } catch {
      setExportError('Could not export your data — try again.');
    } finally {
      setExporting(false);
    }
  };

  const onPickFile = async () => {
    setImportError(null);
    setPicked(null);
    const res = await DocumentPicker.getDocumentAsync({ type: 'application/json', copyToCacheDirectory: true });
    if (res.canceled || !res.assets[0]) return;
    try {
      const text = await new File(res.assets[0].uri).text();
      const parsed = parseBackup(text);
      if (!parsed) throw new Error('bad shape');
      setPicked(parsed);
      setPickedName(res.assets[0].name);
    } catch {
      setImportError('That doesn’t look like a Streakr backup file.');
    }
  };

  const onConfirmImport = () => {
    if (!picked) return;
    replaceAll(picked);
    router.back();
  };

  const habitCount = picked?.habits.length ?? 0;
  const logEntries = picked ? Object.values(picked.logs).reduce((sum, h) => sum + Object.keys(h ?? {}).length, 0) : 0;

  const sectionLabel = (t: string) => (
    <Display size={15} weight="600" style={{ marginBottom: 10 }}>
      {t}
    </Display>
  );

  return (
    <View style={{ flex: 1, backgroundColor: sheetBg }}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingTop: insets.top + 12, paddingBottom: insets.bottom + 26 }} showsVerticalScrollIndicator={false}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 6 }}>
          <Pressable onPress={() => router.back()} style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: theme.glassBg, borderWidth: 1, borderColor: theme.glassBorder, alignItems: 'center', justifyContent: 'center' }}>
            <ChevronLeft color={theme.scheme === 'dark' ? '#c8c8d0' : '#56565f'} />
          </Pressable>
          <Display size={20} weight="600">
            Import & export
          </Display>
        </View>
        <Body size={13} secondary style={{ marginTop: 6, marginBottom: 24, paddingLeft: 2 }}>
          Back up your habits to a JSON file, or restore from one.
        </Body>

        {/* Export */}
        {sectionLabel('Export')}
        <Pressable
          onPress={onExport}
          disabled={exporting}
          style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9, height: 54, borderRadius: 18, backgroundColor: theme.glassBg, borderWidth: 1, borderColor: theme.glassBorder, opacity: exporting ? 0.7 : 1 }}>
          {exporting ? (
            <ActivityIndicator color={theme.accent} />
          ) : (
            <>
              <UploadIcon size={18} color={theme.accent} />
              <Display size={15} weight="600">
                Share JSON backup
              </Display>
            </>
          )}
        </Pressable>
        {exportError && (
          <Body size={12.5} color={Palette.coral} style={{ marginTop: 8 }}>
            {exportError}
          </Body>
        )}

        {/* Import */}
        <View style={{ marginTop: 26 }}>{sectionLabel('Import')}</View>
        <Pressable
          onPress={onPickFile}
          style={{ alignItems: 'center', gap: 10, paddingVertical: 28, paddingHorizontal: 20, borderRadius: 24, borderWidth: 2, borderStyle: 'dashed', borderColor: tint(Palette.coral, '66'), backgroundColor: tint(Palette.coral, '0d') }}>
          <View style={{ width: 52, height: 52, borderRadius: 16, backgroundColor: tint(Palette.coral, '24'), alignItems: 'center', justifyContent: 'center' }}>
            <UploadIcon color={Palette.coral} />
          </View>
          <Display size={15} weight="600">
            {picked ? pickedName : 'Choose a .json file'}
          </Display>
          <Body size={12} secondary>
            {picked ? 'Tap to pick a different file' : 'Tap to browse'}
          </Body>
        </Pressable>
        {importError && (
          <Body size={12.5} color={Palette.coral} style={{ marginTop: 8 }}>
            {importError}
          </Body>
        )}

        {picked && (
          <>
            <View style={{ flexDirection: 'row', gap: 9, marginTop: 16 }}>
              {[
                { n: habitCount, l: habitCount === 1 ? 'Habit' : 'Habits' },
                { n: logEntries, l: 'Log entries' },
              ].map((s) => (
                <View key={s.l} style={{ flex: 1, padding: 13, borderRadius: 14, alignItems: 'center', backgroundColor: tint(Palette.emerald, '1f') }}>
                  <Display size={20} weight="600" color={Palette.emerald}>
                    {s.n}
                  </Display>
                  <Body size={11} secondary style={{ marginTop: 3 }}>
                    {s.l}
                  </Body>
                </View>
              ))}
            </View>

            <Body size={12} color={Palette.coral} style={{ marginTop: 14, lineHeight: 17 }}>
              Importing replaces every habit and log currently on this device — this can’t be undone.
            </Body>

            <Pressable
              onPress={onConfirmImport}
              style={{ marginTop: 14, height: 54, borderRadius: 18, backgroundColor: Palette.emerald, alignItems: 'center', justifyContent: 'center', shadowColor: Palette.emerald, shadowOpacity: 0.5, shadowRadius: 14, shadowOffset: { width: 0, height: 10 } }}>
              <Display size={16} weight="600" color="#fff">
                Replace with this backup
              </Display>
            </Pressable>
          </>
        )}
      </ScrollView>
    </View>
  );
}
