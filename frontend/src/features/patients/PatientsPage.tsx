import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Filter, Pencil, Plus, SortDesc, Trash2, X } from 'lucide-react';
import { PatientCard } from '@/components/patient/PatientCard';
import { Button, GlassPanel, TierBadge } from '@/components/ui';
import { useCommandCenter } from '@/context/CommandCenterContext';
import { createPatientRecord, deletePatientRecord, fetchPatientsSnapshot, updatePatientRecord } from '@/runtime/sync/api-client';
import type { AlertTier, PatientDemographics } from '@/types';

type PatientForm = {
  patientId: string;
  fullName: string;
  age: number;
  gender: 'Male' | 'Female' | 'Other';
  height: number;
  weight: number;
  bloodGroup: string;
  ward: string;
  room: string;
  bedNumber: string;
  primaryPhysician: string;
  contactPerson: string;
  contactNumber: string;
  emergencyContact: string;
  diagnosis: string;
  existingConditions: string;
  allergies: string;
  medications: string;
  smokingStatus: string;
  alcoholStatus: string;
  admissionDate: string;
  roomNumber: string;
  deviceAssignments: string;
  photoUrl: string;
};

const emptyForm: PatientForm = {
  patientId: '',
  fullName: '',
  age: 45,
  gender: 'Male',
  height: 170,
  weight: 75,
  bloodGroup: '',
  ward: 'ICU',
  room: '',
  bedNumber: '',
  primaryPhysician: '',
  contactPerson: '',
  contactNumber: '',
  emergencyContact: '',
  diagnosis: '',
  existingConditions: '',
  allergies: '',
  medications: '',
  smokingStatus: 'Never',
  alcoholStatus: 'No',
  admissionDate: new Date().toISOString().slice(0, 10),
  roomNumber: '',
  deviceAssignments: '',
  photoUrl: '',
};

export function PatientsPage() {
  const { patients } = useCommandCenter();
  const [tierFilter, setTierFilter] = useState<AlertTier | 'all'>('all');
  const [sortDesc, setSortDesc] = useState(true);
  const [records, setRecords] = useState<PatientDemographics[]>([]);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<PatientDemographics | null>(null);
  const [form, setForm] = useState<PatientForm>(emptyForm);
  const [deleteTarget, setDeleteTarget] = useState<PatientDemographics | null>(null);
  const [status, setStatus] = useState('');

  const filtered = useMemo(() => {
    let list = [...patients];
    if (tierFilter !== 'all') list = list.filter((p) => p.tier === tierFilter);
    list.sort((a, b) => (sortDesc ? b.riskScore - a.riskScore : a.riskScore - b.riskScore));
    return list;
  }, [patients, tierFilter, sortDesc]);

  const loadRecords = async () => {
    try {
      setRecords(await fetchPatientsSnapshot() as PatientDemographics[]);
    } catch {
      setStatus('Persistent patient API unavailable. Live dashboard patients remain visible.');
    }
  };

  useEffect(() => {
    void loadRecords();
  }, []);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setFormOpen(true);
  };

  const openEdit = (record: PatientDemographics) => {
    setEditing(record);
    setForm({
      patientId: record.patientId ?? record.hospitalId,
      fullName: record.name ?? `${record.firstName ?? ''} ${record.lastName ?? ''}`.trim(),
      age: record.age,
      gender: record.gender,
      height: Number(record.height ?? 170),
      weight: Number(record.weight ?? 75),
      bloodGroup: record.bloodGroup ?? '',
      ward: record.ward ?? 'ICU',
      room: record.room ?? record.roomNumber ?? '',
      bedNumber: record.bedNumber ?? '',
      primaryPhysician: record.primaryPhysician ?? '',
      contactPerson: record.contactPerson ?? '',
      contactNumber: record.contactNumber ?? '',
      emergencyContact: record.emergencyContact ?? '',
      diagnosis: record.diagnosis ?? record.diagnoses[0] ?? '',
      existingConditions: record.existingConditions?.join(', ') ?? '',
      allergies: record.allergies.join(', '),
      medications: record.medications.join(', '),
      smokingStatus: record.smokingStatus ?? 'Never',
      alcoholStatus: record.alcoholStatus ?? 'No',
      admissionDate: record.admissionDate?.slice(0, 10) ?? new Date().toISOString().slice(0, 10),
      roomNumber: record.roomNumber ?? '',
      deviceAssignments: record.deviceAssignments?.join(', ') ?? '',
      photoUrl: record.photoUrl ?? '',
    });
    setFormOpen(true);
  };

  const submitForm = async () => {
    const [firstName, ...rest] = form.fullName.trim().split(/\s+/);
    const payload = {
      ...form,
      firstName: firstName || form.fullName.trim(),
      lastName: rest.join(' '),
      roomNumber: form.roomNumber || form.room || form.bedNumber,
      allergies: splitList(form.allergies),
      medications: splitList(form.medications),
      existingConditions: splitList(form.existingConditions),
      deviceAssignments: splitList(form.deviceAssignments),
    };
    try {
      if (editing) {
        await updatePatientRecord(editing.id, payload);
        setStatus('Patient updated.');
      } else {
        await createPatientRecord(payload);
        setStatus('Patient created.');
      }
      setFormOpen(false);
      await loadRecords();
    } catch {
      setStatus(editing ? 'Unable to update patient.' : 'Unable to create patient. Check duplicate patient ID and required fields.');
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deletePatientRecord(deleteTarget.id);
      setStatus('Patient soft deleted and audited.');
      setDeleteTarget(null);
      await loadRecords();
    } catch {
      setStatus('Unable to delete patient.');
    }
  };

  return (
    <div className="h-full overflow-y-auto p-4 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold">Patients</h2>
          <p className="text-sm text-command-muted">{filtered.length} of {patients.length} patients</p>
        </div>

        <div className="flex items-center gap-2">
          <GlassPanel className="flex items-center gap-2 px-3 py-2">
            <Filter className="w-3.5 h-3.5 text-command-muted" />
            <select
              value={tierFilter}
              onChange={(e) => setTierFilter(e.target.value === 'all' ? 'all' : Number(e.target.value) as AlertTier)}
              className="bg-transparent text-xs outline-none cursor-pointer"
            >
              <option value="all">All Tiers</option>
              {[1, 2, 3, 4, 5].map((t) => (
                <option key={t} value={t}>Tier {t}</option>
              ))}
            </select>
          </GlassPanel>

          <button
            onClick={() => setSortDesc((v) => !v)}
            className="glass-panel flex items-center gap-2 px-3 py-2 text-xs hover:border-command-glow/30 transition-colors"
          >
            <SortDesc className="w-3.5 h-3.5" />
            Risk {sortDesc ? 'High → Low' : 'Low → High'}
          </button>

          <Button variant="glow" size="sm" onClick={openCreate}>
            <Plus className="w-3.5 h-3.5" />
            Add Patient
          </Button>
        </div>
      </div>

      {status && <div className="text-xs text-command-muted">{status}</div>}

      <GlassPanel className="p-3">
        <div className="flex items-center justify-between gap-3 mb-3">
          <div>
            <h3 className="text-sm font-semibold">Patient Management</h3>
            <p className="text-xs text-command-muted">{records.length} active persistent records</p>
          </div>
          <Button size="sm" variant="outline" onClick={() => void loadRecords()}>Refresh</Button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="text-command-muted">
              <tr className="border-b border-white/10">
                <th className="text-left py-2">Patient ID</th>
                <th className="text-left py-2">Name</th>
                <th className="text-left py-2">Location</th>
                <th className="text-left py-2">Diagnosis</th>
                <th className="text-left py-2">Meds</th>
                <th className="text-right py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {records.map((record) => (
                <tr key={record.id} className="border-b border-white/[0.05]">
                  <td className="py-2 font-mono">{record.patientId ?? record.hospitalId}</td>
                  <td className="py-2">{record.name ?? `${record.firstName} ${record.lastName}`}</td>
                  <td className="py-2">{record.ward ?? 'ICU'} · {record.room ?? record.roomNumber} · {record.bedNumber ?? 'Bed --'}</td>
                  <td className="py-2">{record.diagnosis ?? record.diagnoses[0]}</td>
                  <td className="py-2">{record.medications.slice(0, 2).join(', ') || 'None listed'}</td>
                  <td className="py-2">
                    <div className="flex justify-end gap-1">
                      <button className="p-1.5 rounded border border-white/10 hover:border-command-glow/40" onClick={() => openEdit(record)} title="Edit patient">
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button className="p-1.5 rounded border border-tier-5/30 text-tier-5 hover:bg-tier-5/10" onClick={() => setDeleteTarget(record)} title="Delete patient">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {records.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-4 text-command-muted">No persistent patient records loaded.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </GlassPanel>

      <div className="flex flex-wrap gap-2">
        {([1, 2, 3, 4, 5] as AlertTier[]).map((t) => {
          const count = patients.filter((p) => p.tier === t).length;
          return (
            <button
              key={t}
              onClick={() => setTierFilter(tierFilter === t ? 'all' : t)}
              className="transition-transform hover:scale-105"
            >
              <TierBadge tier={t} label={`T${t} (${count})`} />
            </button>
          );
        })}
      </div>

      <motion.div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-3" layout>
        {filtered.map((patient, i) => (
          <motion.div key={patient.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }}>
            <PatientCard patient={patient} />
          </motion.div>
        ))}
      </motion.div>

      {formOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 flex justify-end">
          <div className="w-full max-w-xl h-full bg-command-panel border-l border-white/10 p-4 overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold">{editing ? 'Edit Patient' : 'Add Patient'}</h3>
              <button onClick={() => setFormOpen(false)} className="p-1 rounded hover:bg-white/10">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Field label="Patient ID" value={form.patientId} onChange={(v) => setForm({ ...form, patientId: v })} />
              <Field label="Full Name" value={form.fullName} onChange={(v) => setForm({ ...form, fullName: v })} />
              <Field label="Age" type="number" value={String(form.age)} onChange={(v) => setForm({ ...form, age: Number(v) })} />
              <label className="text-xs text-command-muted">Gender
                <select value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value as PatientForm['gender'] })} className="mt-1 w-full bg-command-elevated border border-white/10 rounded px-3 py-2 text-white">
                  <option>Male</option>
                  <option>Female</option>
                  <option>Other</option>
                </select>
              </label>
              <Field label="Height cm" type="number" value={String(form.height)} onChange={(v) => setForm({ ...form, height: Number(v) })} />
              <Field label="Weight kg" type="number" value={String(form.weight)} onChange={(v) => setForm({ ...form, weight: Number(v) })} />
              <Field label="Blood Group" value={form.bloodGroup} onChange={(v) => setForm({ ...form, bloodGroup: v })} />
              <Field label="Ward" value={form.ward} onChange={(v) => setForm({ ...form, ward: v })} />
              <Field label="Room" value={form.room} onChange={(v) => setForm({ ...form, room: v, roomNumber: v })} />
              <Field label="Bed Number" value={form.bedNumber} onChange={(v) => setForm({ ...form, bedNumber: v })} />
              <Field label="Primary Physician" value={form.primaryPhysician} onChange={(v) => setForm({ ...form, primaryPhysician: v })} />
              <Field label="Contact Person" value={form.contactPerson} onChange={(v) => setForm({ ...form, contactPerson: v })} />
              <Field label="Contact Number" value={form.contactNumber} onChange={(v) => setForm({ ...form, contactNumber: v })} />
              <Field label="Admission Date" type="date" value={form.admissionDate} onChange={(v) => setForm({ ...form, admissionDate: v })} />
              <Field label="Diagnosis" value={form.diagnosis} onChange={(v) => setForm({ ...form, diagnosis: v })} wide />
              <Field label="Existing Conditions" value={form.existingConditions} onChange={(v) => setForm({ ...form, existingConditions: v })} wide />
              <Field label="Medications" value={form.medications} onChange={(v) => setForm({ ...form, medications: v })} wide />
              <Field label="Allergies" value={form.allergies} onChange={(v) => setForm({ ...form, allergies: v })} wide />
              <Field label="Smoking Status" value={form.smokingStatus} onChange={(v) => setForm({ ...form, smokingStatus: v })} />
              <Field label="Alcohol Status" value={form.alcoholStatus} onChange={(v) => setForm({ ...form, alcoholStatus: v })} />
              <Field label="Emergency Contact" value={form.emergencyContact} onChange={(v) => setForm({ ...form, emergencyContact: v })} wide />
              <Field label="Device Assignments" value={form.deviceAssignments} onChange={(v) => setForm({ ...form, deviceAssignments: v })} wide />
              <Field label="Patient Photo URL" value={form.photoUrl} onChange={(v) => setForm({ ...form, photoUrl: v })} wide />
            </div>
            <div className="flex justify-end gap-2 mt-5">
              <Button variant="ghost" onClick={() => setFormOpen(false)}>Cancel</Button>
              <Button variant="glow" onClick={() => void submitForm()}>{editing ? 'Save Changes' : 'Create Patient'}</Button>
            </div>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <GlassPanel className="w-full max-w-sm p-4">
            <h3 className="text-sm font-semibold mb-2">Confirm Soft Delete</h3>
            <p className="text-xs text-command-muted mb-4">
              {deleteTarget.name ?? deleteTarget.patientId} will be marked inactive. The record is retained and the deletion is audited.
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setDeleteTarget(null)}>Cancel</Button>
              <Button variant="danger" onClick={() => void confirmDelete()}>Delete</Button>
            </div>
          </GlassPanel>
        </div>
      )}
    </div>
  );
}

function splitList(value: string): string[] {
  return value.split(',').map((item) => item.trim()).filter(Boolean);
}

function Field({
  label,
  value,
  onChange,
  type = 'text',
  wide = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  wide?: boolean;
}) {
  return (
    <label className={`text-xs text-command-muted ${wide ? 'md:col-span-2' : ''}`}>
      {label}
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1 w-full bg-command-elevated border border-white/10 rounded px-3 py-2 text-white"
      />
    </label>
  );
}
