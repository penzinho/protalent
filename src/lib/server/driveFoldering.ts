import 'server-only';

import { ensureDriveFolder } from '@/lib/server/drive';
import { createSupabaseServerClient } from '@/lib/server/supabase';

interface KlijentRow {
  id: string;
  naziv_tvrtke: string;
}

interface PozicijaDatumRow {
  id: string;
  naziv_pozicije: string;
  datum_upisa: string | null;
}

export type PotrebaDokumentFolderTip = 'zivotopis' | 'ostalo';

export interface PotrebaFolderTarget {
  klijentId: string;
  klijentNaziv: string;
  klijentFolderName: string;
  pozicijaId: string;
  datumUpisa: string | null;
  folderName: string;
  sortDatumKey: string;
}

export interface PotrebaFolderResolvedTarget extends PotrebaFolderTarget {
  folderId: string;
}

export interface PotrebaDokumentFolderResolved {
  tip: PotrebaDokumentFolderTip;
  klijentId: string;
  pozicijaId: string;
  datumUpisa: string | null;
  klijentFolderName: string;
  potrebaFolderId: string;
  potrebaFolderName: string;
  folderId: string;
  folderName: string;
}

const sanitizeFolderName = (value: string): string =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9 _-]/g, '')
    .trim()
    .slice(0, 80) || 'Klijent';

const parseDatumUpisa = (value: string | null): { datumUpisa: string | null; sortDatumKey: string } => {
  if (!value) {
    return { datumUpisa: null, sortDatumKey: '9999-12-31' };
  }

  const normalized = String(value).slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    return { datumUpisa: null, sortDatumKey: '9999-12-31' };
  }

  const parsedDate = new Date(`${normalized}T00:00:00.000Z`);
  if (Number.isNaN(parsedDate.getTime())) {
    return { datumUpisa: null, sortDatumKey: '9999-12-31' };
  }

  return { datumUpisa: normalized, sortDatumKey: normalized };
};

const formatDatumZaFolder = (datumUpisa: string | null): string => {
  if (!datumUpisa) return 'bez-datuma';
  const [godina, mjesec, dan] = datumUpisa.split('-');
  if (!godina || !mjesec || !dan) return 'bez-datuma';
  return `${dan}-${mjesec}-${godina}`;
};

const formatPotrebaFolderName = (nazivPozicije: string, datumUpisa: string | null): string => {
  const safeNazivPozicije = sanitizeFolderName(nazivPozicije || 'Potreba');
  return `${safeNazivPozicije} - ${formatDatumZaFolder(datumUpisa)}`;
};

const dokumentFolderName = (tip: PotrebaDokumentFolderTip): string =>
  tip === 'zivotopis' ? 'Zivotopisi' : 'Ostalo';

const compareTargets = (a: PotrebaFolderTarget, b: PotrebaFolderTarget): number => {
  if (a.sortDatumKey < b.sortDatumKey) return -1;
  if (a.sortDatumKey > b.sortDatumKey) return 1;
  return a.pozicijaId.localeCompare(b.pozicijaId, 'en');
};

export const resolvePotrebaFolderTargets = async (params: {
  klijentId: string;
  pozicijaIds: string[];
}): Promise<PotrebaFolderTarget[]> => {
  const uniquePozicijaIds = Array.from(
    new Set(
      params.pozicijaIds
        .map((id) => id.trim())
        .filter((id) => id.length > 0)
    )
  );

  if (uniquePozicijaIds.length === 0) {
    throw new Error('Potreban je barem jedan pozicijaId za određivanje foldera.');
  }

  const supabase = await createSupabaseServerClient();
  const { data: klijentData, error: klijentError } = await supabase
    .from('klijenti')
    .select('id, naziv_tvrtke')
    .eq('id', params.klijentId)
    .single();

  if (klijentError || !klijentData) {
    throw new Error('Klijent nije pronađen.');
  }

  const klijent = klijentData as KlijentRow;

  const { data: pozicijeData, error: pozicijeError } = await supabase
    .from('pozicije')
    .select('id, naziv_pozicije, datum_upisa')
    .eq('klijent_id', params.klijentId)
    .in('id', uniquePozicijaIds);

  if (pozicijeError) {
    throw new Error('Ne mogu dohvatiti datume upisa potreba.');
  }

  const pozicijeRows = (pozicijeData || []) as PozicijaDatumRow[];
  const byId = new Map(pozicijeRows.map((row) => [row.id, row]));
  const missingPozicije = uniquePozicijaIds.filter((id) => !byId.has(id));
  if (missingPozicije.length > 0) {
    throw new Error(`Pozicije nisu pronađene za klijenta: ${missingPozicije.join(', ')}`);
  }

  const klijentFolderName = `${sanitizeFolderName(klijent.naziv_tvrtke)}_${klijent.id.slice(0, 8)}`;
  const targets = uniquePozicijaIds.map<PotrebaFolderTarget>((pozicijaId) => {
    const row = byId.get(pozicijaId)!;
    const { datumUpisa, sortDatumKey } = parseDatumUpisa(row.datum_upisa);

    return {
      klijentId: klijent.id,
      klijentNaziv: klijent.naziv_tvrtke,
      klijentFolderName,
      pozicijaId,
      datumUpisa,
      folderName: formatPotrebaFolderName(row.naziv_pozicije, datumUpisa),
      sortDatumKey,
    };
  });

  return targets.sort(compareTargets);
};

export const resolvePotrebaFolderTarget = async (params: {
  klijentId: string;
  pozicijaId: string;
}): Promise<PotrebaFolderTarget> => {
  const targets = await resolvePotrebaFolderTargets({
    klijentId: params.klijentId,
    pozicijaIds: [params.pozicijaId],
  });

  const target = targets[0];
  if (!target) {
    throw new Error('Nije moguće odrediti folder za potrebu.');
  }

  return target;
};

export const ensureClientAndPotrebaFolders = async (params: {
  oauthClientId: string;
  oauthClientSecret: string;
  oauthRefreshToken: string;
  rootFolderId: string;
  targets: PotrebaFolderTarget[];
}): Promise<PotrebaFolderResolvedTarget[]> => {
  const { oauthClientId, oauthClientSecret, oauthRefreshToken, rootFolderId, targets } = params;
  if (targets.length === 0) return [];

  const klijentFolderName = targets[0].klijentFolderName;
  const klijentFolderId = await ensureDriveFolder({
    oauthClientId,
    oauthClientSecret,
    oauthRefreshToken,
    parentId: rootFolderId,
    folderName: klijentFolderName,
  });

  const folderIdByName = new Map<string, string>();
  const resolvedTargets: PotrebaFolderResolvedTarget[] = [];

  for (const target of targets) {
    let folderId = folderIdByName.get(target.folderName);
    if (!folderId) {
      folderId = await ensureDriveFolder({
        oauthClientId,
        oauthClientSecret,
        oauthRefreshToken,
        parentId: klijentFolderId,
        folderName: target.folderName,
      });
      folderIdByName.set(target.folderName, folderId);
    }

    resolvedTargets.push({
      ...target,
      folderId,
    });
  }

  return resolvedTargets;
};

export const ensurePotrebaDocumentFolder = async (params: {
  oauthClientId: string;
  oauthClientSecret: string;
  oauthRefreshToken: string;
  rootFolderId: string;
  klijentId: string;
  pozicijaId: string;
  tip: PotrebaDokumentFolderTip;
}): Promise<PotrebaDokumentFolderResolved> => {
  const {
    oauthClientId,
    oauthClientSecret,
    oauthRefreshToken,
    rootFolderId,
    klijentId,
    pozicijaId,
    tip,
  } = params;

  const target = await resolvePotrebaFolderTarget({ klijentId, pozicijaId });
  const resolved = await ensureClientAndPotrebaFolders({
    oauthClientId,
    oauthClientSecret,
    oauthRefreshToken,
    rootFolderId,
    targets: [target],
  });

  const potrebaFolder = resolved[0];
  if (!potrebaFolder) {
    throw new Error('Ne mogu osigurati folder za potrebu.');
  }

  const folderName = dokumentFolderName(tip);
  const folderId = await ensureDriveFolder({
    oauthClientId,
    oauthClientSecret,
    oauthRefreshToken,
    parentId: potrebaFolder.folderId,
    folderName,
  });

  return {
    tip,
    klijentId: potrebaFolder.klijentId,
    pozicijaId: potrebaFolder.pozicijaId,
    datumUpisa: potrebaFolder.datumUpisa,
    klijentFolderName: potrebaFolder.klijentFolderName,
    potrebaFolderId: potrebaFolder.folderId,
    potrebaFolderName: potrebaFolder.folderName,
    folderId,
    folderName,
  };
};
