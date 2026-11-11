// ==============================================================================
// CONTENEDOR DE MODALES: SECCIÓN PERSONAS, GRUPOS Y JORNADAS
// Atelier Digital · By Katherine Carroll
// ==============================================================================

import React from 'react';
import { Client } from '../../../types/client';
import { MeasurementSession } from '../../../types/pattern/measurement';
import {
    MEASUREMENT_TEMPLATES,
    getMeasurementTemplateById,
} from '../../../engine/pattern/catalog/measurementTemplates';
import { PersonFormModal } from './PersonFormModal';
import { GroupFormModal } from './GroupFormModal';
import { GroupMembersModal } from './GroupMembersModal';
import { MeasurementCampaignModal } from './MeasurementCampaignModal';
import { MeasurementExportModal } from './MeasurementExportModal';
import { MeasurementSessionModal } from '../../pattern/MeasurementSessionModal';
import { MeasurementCampaignFastCaptureModal } from '../MeasurementCampaignFastCaptureModal';
import { PrintableMeasurementSheetModal } from '../../pattern/PrintableMeasurementSheetModal';
import { PersonCreationCadWizardModal } from '../../pattern/PersonCreationCadWizardModal';
import { MeasurementImportReviewModal } from '../MeasurementImportReviewModal';
import { usePersonGroupSection } from './usePersonGroupSection';

interface PersonGroupModalsProps {
    client: Client;
    s: ReturnType<typeof usePersonGroupSection>;
    onSessionCreated?: (session: MeasurementSession) => void;
}

export const PersonGroupModals: React.FC<PersonGroupModalsProps> = ({
    client,
    s,
    onSessionCreated,
}) => {
    return (
        <>
            {/* Subcomponentes Modales Modularizados */}
            <PersonFormModal
                visible={s.showPersonModal}
                editingPerson={s.editingPerson}
                personFullName={s.personFullName}
                setPersonFullName={s.setPersonFullName}
                personCategory={s.personCategory}
                setPersonCategory={s.setPersonCategory}
                personRefId={s.personRefId}
                setPersonRefId={s.setPersonRefId}
                personNotes={s.personNotes}
                setPersonNotes={s.setPersonNotes}
                savingPerson={s.savingPerson}
                onSave={s.handleSavePerson}
                onClose={() => s.setShowPersonModal(false)}
            />

            <GroupFormModal
                visible={s.showGroupModal}
                groupName={s.groupName}
                setGroupName={s.setGroupName}
                groupType={s.groupType}
                setGroupType={s.setGroupType}
                groupNotes={s.groupNotes}
                setGroupNotes={s.setGroupNotes}
                savingGroup={s.savingGroup}
                onSave={s.handleSaveGroup}
                onClose={() => s.setShowGroupModal(false)}
            />

            <GroupMembersModal
                group={s.selectedGroupForManage}
                persons={s.persons}
                groupMembers={s.groupMembers}
                loadingMembers={s.loadingMembers}
                onToggleMember={s.handleToggleMember}
                onClose={() => {
                    s.setSelectedGroupForManage(null);
                    s.setGroupMembers([]);
                }}
            />

            <MeasurementCampaignModal
                visible={s.showCampaignModal}
                campaignTitle={s.campaignTitle}
                setCampaignTitle={s.setCampaignTitle}
                campaignGroupId={s.campaignGroupId}
                setCampaignGroupId={s.setCampaignGroupId}
                groups={s.groups}
                campaignTemplateId={s.campaignTemplateId}
                setCampaignTemplateId={s.setCampaignTemplateId}
                campaignMode={s.campaignMode}
                setCampaignMode={s.setCampaignMode}
                campaignUnit={s.campaignUnit}
                setCampaignUnit={s.setCampaignUnit}
                campaignNotes={s.campaignNotes}
                setCampaignNotes={s.setCampaignNotes}
                savingCampaign={s.savingCampaign}
                onSave={s.handleSaveCampaign}
                onClose={() => s.setShowCampaignModal(false)}
            />

            <MeasurementExportModal
                visible={s.showExportModal}
                count={s.filteredPersons.length}
                onExportExcel={s.handleExportExcel}
                onExportCSV={s.handleExportCSV}
                onDownloadTemplate={s.handleDownloadTemplate}
                onClose={() => s.setShowExportModal(false)}
            />

            {/* Modales Especializados del Atelier */}
            {s.measuringPerson && (
                <MeasurementSessionModal
                    visible={Boolean(s.measuringPerson)}
                    client={client}
                    person={s.measuringPerson}
                    onClose={() => s.setMeasuringPerson(null)}
                    onSessionCreated={(session) => {
                        s.setMeasuringPerson(null);
                        s.loadData();
                        if (onSessionCreated) {
                            onSessionCreated(session);
                        }
                    }}
                />
            )}

            {s.activeFastCaptureCampaign && (
                <MeasurementCampaignFastCaptureModal
                    visible={Boolean(s.activeFastCaptureCampaign)}
                    campaign={s.activeFastCaptureCampaign}
                    client={client}
                    onClose={() => {
                        s.setActiveFastCaptureCampaign(null);
                        s.loadData();
                    }}
                />
            )}

            {s.activePrintCampaign && (
                <PrintableMeasurementSheetModal
                    visible={Boolean(s.activePrintCampaign)}
                    campaign={s.activePrintCampaign}
                    template={getMeasurementTemplateById(s.activePrintCampaign.template_id) || MEASUREMENT_TEMPLATES[0]}
                    clientName={client.full_name}
                    participants={s.printCampaignParticipants}
                    onClose={() => s.setActivePrintCampaign(null)}
                />
            )}

            {s.cadPerson && (
                <PersonCreationCadWizardModal
                    visible={Boolean(s.cadPerson)}
                    client={client}
                    person={s.cadPerson}
                    onClose={() => s.setCadPerson(null)}
                    onCadExecutionGenerated={() => {
                        s.setCadPerson(null);
                        s.loadData();
                    }}
                />
            )}

            <MeasurementImportReviewModal
                visible={s.showImportModal}
                client={client}
                existingGroups={s.groups}
                existingPersons={s.persons}
                onClose={() => s.setShowImportModal(false)}
                onSuccess={() => {
                    s.setShowImportModal(false);
                    s.loadData();
                }}
            />
        </>
    );
};
