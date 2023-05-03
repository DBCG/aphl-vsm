import { Condition } from '@/helpers/conditionHelpers';
import { ToString } from '@/hooks/useGetProgramDetails';
import { approvalFormParams } from '@/pages/programs/[id]/approve';
import { ManifestDataMap } from './manifestTypes';

interface GrouperMetadata {
  id: fhir4.ValueSet['id'];
  version: fhir4.ValueSet['version'];
  title: fhir4.ValueSet['title'];
  name: fhir4.ValueSet['name'];
  publisher: fhir4.ValueSet['publisher'];
  description: fhir4.ValueSet['description'];
  purpose: fhir4.ValueSet['purpose'];
  author: string;
}

interface SelectedValueSet {
  id: fhir4.ValueSet['id'];
  lastUpdated: fhir4.Meta['lastUpdated'];
  name: fhir4.ValueSet['name'];
  oid: fhir4.ValueSet['id'];
  status: fhir4.ValueSet['status'];
  steward: fhir4.ValueSet['publisher'];
  url: fhir4.ValueSet['url'];
  version: fhir4.ValueSet['version'];
  valueSet: fhir4.ValueSet;
}

interface SelectedGrouper {
  id: fhir4.ValueSet['id'];
  label: fhir4.ValueSet['title'];
  url: fhir4.ValueSet['url'];
  value: fhir4.ValueSet['url'];
  version: fhir4.ValueSet['version'];
}

interface FlatGrouperVSet {
  selectedValueSet: SelectedValueSet;
  selectedConditions: Condition[];
  selectedGroupers?: SelectedGrouper[];
  selectedTerminologyServer: string;
}

interface CombinedGrouperVSets {
  selectedValueSets: SelectedValueSet[];
  selectedConditions: Condition[];
  selectedGroupers?: SelectedGrouper[];
  selectedTerminologyServer: string;
}

interface ConditionValue {
  system: string;
  version: string;
  code: string;
}

interface SelectedCondition {
  label: string;
  value: ConditionValue;
}

interface GrouperItem {
  id: string;
  name: string;
  title: string;
  url: string;
  version: string;
}

interface DeleteGrouper {
  grouperLibId: string | undefined;
  grouperVsCanonicalToRemove: string | undefined;
  grouperVsIdToRemove: string | undefined;
}

interface ManifestDataMap {
  [key: string]: string[];
}

interface ProgramDetails {
  program: fhir4.Library | null;
  grouperData: GrouperItem[];
  grouperLibrary: fhir4.Library | null;
  manifestData: ManifestDataMap;
  artifactAssessments: ToString<Partial<approvalFormParams>>[];
}

interface ProgramDetailsEffect {
  programAndGrouperDataLoading: boolean;
  programAndGrouperDataError: string | null;
  programAndGrouperData: ProgramDetails;
}

export type {
  GrouperMetadata,
  FlatGrouperVSet,
  CombinedGrouperVSets,
  SelectedGrouper,
  SelectedValueSet,
  SelectedCondition,
  GrouperItem,
  DeleteGrouper,
  ManifestDataMap,
  ProgramDetails,
  ProgramDetailsEffect
};
